/**
 * SecureShareProjeto - arquivos, acessos e permissoes de uma pasta compartilhada.
 *
 * Equivale a ProjectFilesView do Portal Apsis. As secoes e a ordem sao as mesmas
 * (cabecalho editavel, envio, usuarios, equipe, arvore de arquivos), com as
 * diferencas de arquitetura que o CLAUDE.md deste repositorio exige. Ver os
 * cabecalhos de src/lib/api/secureshare.js e da migration
 * 20260817120000_secure_share.sql.
 *
 * NAO EXISTE SENHA NESTA TELA, e isso e a diferenca central em relacao ao Portal
 * Apsis (que guarda a senha do cliente em texto puro no banco para poder
 * reenvia-la). Quem trabalha aqui nao define, nao ve e nao reenvia senha nenhuma:
 * o cliente digita o e-mail no portal dele e recebe um codigo de uso unico, a
 * cada entrada.
 *
 * O que esta tela controla e o CONVITE, e ele nao e um aviso de cortesia: e o
 * PORTAO. Enquanto o convite de um vinculo cliente/projeto nao sair, aquele
 * projeto nao entra na sessao de ninguem, mesmo com o cadastro gravado. Por isso
 * o formulario de cadastro ja vem com "Avisar por e-mail agora" marcado: se o
 * envio dependesse de um segundo clique, esquece-lo nao daria erro nenhum e o
 * cliente ficaria cadastrado, sem acesso, ate ligar reclamando.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, X, Pencil, Check, UploadCloud, Folder, FolderOpen, File as IconeArquivo,
  FileText, FileSpreadsheet, Image as IconeImagem, ChevronRight, ChevronDown, Lock,
  RefreshCw, Users, ShieldCheck, Mail, Calendar, Trash2, Loader2, ShieldAlert,
} from 'lucide-react';

import {
  obterProjeto, atualizarProjeto, listarArquivos, enviarArquivos,
  criarCliente, atualizarCliente, removerCliente, enviarConvite,
  atualizarEquipe, definirPermissao, formatarApOs, formatarTamanho, nivelDoItem,
} from '@/lib/api/secureshare';
import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import { rotaDaPagina } from '@/lib/pageRoutes';

import Cartao from '@/components/ui/Cartao';
import Badge from '@/components/ui/Badge';
import Campo from '@/components/ui/Campo';
import Carregando from '@/components/ui/Carregando';
import EstadoVazio from '@/components/ui/EstadoVazio';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import SeletorStatus from '@/components/ui/SeletorStatus';

/* ===== Dominio ============================================================ */

/**
 * Situação efetiva do cliente, calculada pela view carbon_secure_share_clientes_listagem.
 *
 * `sem_convite` substituiu `sem_credencial` quando a senha saiu de cena, e ele é o
 * ÚLTIMO caso da cadeia no banco, não o primeiro: revogação, prazo vencido e prazo
 * futuro decidem antes. Assim um cliente com prazo expirado aparece como
 * "Prazo expirado" e não como "Convite não enviado", que esconderia o motivo real
 * e mandaria a pessoa clicar em reenviar sem resolver nada.
 */
const SITUACAO = {
  liberado: { rotulo: 'Acesso liberado', tom: 'verde' },
  sem_convite: { rotulo: 'Convite não enviado', tom: 'ambar' },
  agendado: { rotulo: 'Agendado', tom: 'azul' },
  expirado: { rotulo: 'Prazo expirado', tom: 'vermelho' },
  revogado: { rotulo: 'Revogado', tom: 'neutro' },
};

const NIVEIS = [
  { valor: 'total', rotulo: 'Acesso total', tom: 'verde' },
  { valor: 'visualizar', rotulo: 'Só visualizar', tom: 'azul' },
  { valor: 'nenhum', rotulo: 'Sem acesso', tom: 'vermelho' },
];

function IconeDoArquivo({ nome }) {
  const ext = String(nome ?? '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return <FileText size={15} className="text-[#B4453C] shrink-0" />;
  if (['xls', 'xlsx', 'xlsb', 'csv'].includes(ext)) {
    return <FileSpreadsheet size={15} className="text-[#2F8F5B] shrink-0" />;
  }
  if (['doc', 'docx'].includes(ext)) return <FileText size={15} className="text-[#1F4A6B] shrink-0" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return <IconeImagem size={15} className="text-[#7A4FA3] shrink-0" />;
  }
  return <IconeArquivo size={15} className="text-[#8A9990] shrink-0" />;
}

function fmtDataHora(valor) {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
}

function fmtData(valor) {
  if (!valor) return null;
  const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : null;
}

const hojeIso = () => new Date().toISOString().slice(0, 10);

/* ===== Leitura de pasta arrastada ========================================= */
// A FileSystem API do drag-and-drop e a unica forma de ler uma PASTA solta na
// tela. `webkitGetAsEntry` precisa ser chamado de forma SINCRONA no handler do
// drop: os DataTransferItem sao invalidados assim que o handler cede o controle,
// e um `await` antes disso faz a leitura devolver vazio sem erro nenhum.

async function lerTodasAsEntradas(leitor) {
  const todas = [];
  const lote = () => new Promise((ok, falha) => leitor.readEntries(ok, falha));
  let atual;
  do {
    atual = await lote();
    todas.push(...atual);
  } while (atual.length > 0);
  return todas;
}

async function percorrer(entradas, prefixo = '') {
  const saida = [];
  for (const entrada of entradas) {
    if (entrada.isFile) {
      const arquivo = await new Promise((ok, falha) => entrada.file(ok, falha));
      saida.push({ arquivo, subPath: prefixo });
    } else if (entrada.isDirectory) {
      const filhos = await lerTodasAsEntradas(entrada.createReader());
      saida.push(
        ...(await percorrer(filhos, prefixo ? `${prefixo}/${entrada.name}` : entrada.name)),
      );
    }
  }
  return saida;
}

/* ===== Tela =============================================================== */

export default function SecureShareProjeto() {
  const { id } = useParams();
  const msal = useMsal();
  const navegar = useNavigate();
  const cache = useQueryClient();

  const autenticado = (msal.accounts?.length ?? 0) > 0;
  const chave = ['carbon', 'secure-share', 'projeto', id];

  const query = useQuery({
    queryKey: chave,
    queryFn: () => obterProjeto(msal, id),
    enabled: (MODO_DEMO && MODO_DEMO_ATIVO()) || autenticado,
  });

  const projeto = query.data?.projeto ?? null;
  const clientes = query.data?.clientes ?? [];
  const equipe = query.data?.equipe ?? [];
  const permissoes = query.data?.permissoes ?? [];

  const recarregar = () => cache.invalidateQueries({ queryKey: chave });

  if (query.isLoading) return <Carregando rotulo="Carregando o projeto" />;

  if (query.isError) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <BotaoSecundario
          variante="fantasma"
          icone={ArrowLeft}
          onClick={() => navegar(rotaDaPagina('SecureShare') ?? '/SecureShare')}
        >
          Voltar
        </BotaoSecundario>
        <AvisoDiscreto tom="vermelho" titulo="Não foi possível abrir este projeto.">
          {query.error?.message}
        </AvisoDiscreto>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Cabecalho
        projeto={projeto}
        msal={msal}
        onVoltar={() => navegar(rotaDaPagina('SecureShare') ?? '/SecureShare')}
        onMudou={recarregar}
      />

      {projeto?.status === 'encerrado' && (
        <AvisoDiscreto tom="ambar" titulo="Projeto encerrado." icone={ShieldAlert}>
          Nenhum cliente consegue entrar enquanto ele estiver assim, e não é possível enviar
          novos convites. Os arquivos continuam no SharePoint.
        </AvisoDiscreto>
      )}

      <Envio projeto={projeto} msal={msal} />

      <Arquivos projeto={projeto} msal={msal} clientes={clientes} permissoes={permissoes} onMudou={recarregar} />

      <Clientes projeto={projeto} msal={msal} clientes={clientes} onMudou={recarregar} />

      <Equipe projeto={projeto} msal={msal} equipe={equipe} onMudou={recarregar} />
    </div>
  );
}

/* ===== Cabecalho ========================================================== */

function Cabecalho({ projeto, msal, onVoltar, onMudou }) {
  const [editando, setEditando] = useState(false);
  const [apOs, setApOs] = useState(projeto?.ap_os ?? '');
  const [empresa, setEmpresa] = useState(projeto?.empresa ?? '');

  const salvar = useMutation({
    mutationFn: (dados) => atualizarProjeto(msal, projeto.id, dados),
    onSuccess: () => {
      setEditando(false);
      onMudou();
      toast.success('Projeto atualizado.');
    },
    onError: (e) => toast.error(e.message),
  });

  const mudarStatus = useMutation({
    mutationFn: (status) => atualizarProjeto(msal, projeto.id, { status }),
    onSuccess: (_r, status) => {
      onMudou();
      toast.success(status === 'encerrado' ? 'Projeto encerrado.' : 'Projeto reaberto.');
    },
    onError: (e) => toast.error(e.message),
  });

  if (!projeto) return null;

  return (
    <div className="flex items-start gap-3">
      <BotaoSecundario
        variante="fantasma"
        icone={ArrowLeft}
        rotuloAcessivel="Voltar para a lista de projetos"
        onClick={onVoltar}
      />

      <div className="flex-1 min-w-0">
        {editando ? (
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
            <Campo
              rotulo="AP/OS"
              valor={apOs}
              placeholder="AP-XXXXX/XX-XXX"
              onChange={(v) => setApOs(formatarApOs(v))}
            />
            <Campo
              rotulo="Nome da empresa"
              obrigatorio
              valor={empresa}
              onChange={setEmpresa}
              extras={{ maxLength: 200 }}
            />
            <div className="sm:col-span-2 flex items-center gap-2">
              <BotaoPrimario
                icone={Check}
                tamanho="sm"
                carregando={salvar.isPending}
                onClick={() => {
                  if (!empresa.trim()) {
                    toast.error('Informe o nome da empresa.');
                    return;
                  }
                  salvar.mutate({ ap_os: apOs.trim() || null, empresa: empresa.trim() });
                }}
              >
                Salvar
              </BotaoPrimario>
              <BotaoSecundario
                variante="fantasma"
                tamanho="sm"
                onClick={() => {
                  setEditando(false);
                  setApOs(projeto.ap_os ?? '');
                  setEmpresa(projeto.empresa ?? '');
                }}
              >
                Cancelar
              </BotaoSecundario>
              {/* A renomeacao mexe no SharePoint, nao so no banco. Dizer isso
                  antes evita a surpresa de um link antigo parar de funcionar. */}
              <span className="text-[11px] text-[#8A9990]">
                Renomear move também a pasta no SharePoint.
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {projeto.ap_os ? (
                <span className="font-semibold text-[#1A2B1F] text-lg">{projeto.ap_os}</span>
              ) : (
                <Badge tom="neutro" tamanho="sm">Sem AP/OS</Badge>
              )}
              <span className="text-[#5C7060] font-medium">{projeto.empresa}</span>
              <BotaoSecundario
                variante="fantasma"
                icone={Pencil}
                tamanho="sm"
                titulo="Editar AP/OS e empresa"
                rotuloAcessivel="Editar AP/OS e empresa"
                onClick={() => setEditando(true)}
              />
            </div>
            <p className="text-xs text-[#8A9990] mt-0.5 flex items-center gap-1">
              <FolderOpen size={12} /> {projeto.pasta}
              <span className="text-[#DDE3DE]">·</span> SharePoint
            </p>
          </>
        )}
      </div>

      <SeletorStatus
        valor={projeto.status}
        opcoes={[
          { valor: 'ativo', rotulo: 'Ativo', tom: 'verde' },
          { valor: 'encerrado', rotulo: 'Encerrado', tom: 'neutro' },
        ]}
        onChange={(v) => mudarStatus.mutate(v)}
        carregando={mudarStatus.isPending}
        rotuloAcessivel="Status do projeto compartilhado"
        tamanho="sm"
      />
    </div>
  );
}

/* ===== Envio de arquivos ================================================== */

/**
 * Envio de arquivos para a pasta.
 *
 * EXPORTADA junto com Arquivos para a tela da pasta Geral reaproveitar o
 * upload. O destino sai de `projeto.id`, e a funcao
 * carbon-secure-share-upload ja reconhece o id reservado 'geral' - inclusive
 * a checagem de papel (admin ou gestor) para escrever nela.
 */
export function Envio({ projeto, msal }) {
  const cache = useQueryClient();
  const [fila, setFila] = useState([]);
  const [arrastando, setArrastando] = useState(false);
  const refArquivos = useRef(null);
  const refPasta = useRef(null);

  // webkitdirectory nao e atributo reconhecido pelo React: precisa ir no DOM.
  useEffect(() => {
    refPasta.current?.setAttribute('webkitdirectory', '');
  }, []);

  const acrescentar = useCallback((itens) => {
    setFila((atual) => {
      const proxima = [...atual];
      for (const item of itens) {
        const repetido = proxima.some(
          (x) =>
            x.arquivo.name === item.arquivo.name &&
            x.arquivo.size === item.arquivo.size &&
            x.subPath === item.subPath,
        );
        if (!repetido) proxima.push(item);
      }
      return proxima;
    });
  }, []);

  const enviar = useMutation({
    mutationFn: () => enviarArquivos(msal, projeto.id, fila),
    onSuccess: (r) => {
      setFila([]);
      cache.invalidateQueries({ queryKey: ['carbon', 'secure-share'] });

      if (r.falhas?.length) {
        toast.warning(`${r.enviados.length} enviado(s), ${r.falhas.length} com falha.`, {
          description: r.falhas.map((f) => `${f.arquivo}: ${f.motivo}`).join(' | '),
          duration: 12000,
        });
      } else if (MODO_DEMO && MODO_DEMO_ATIVO()) {
        toast.info('Modo demonstração: nada foi enviado ao SharePoint.', {
          description: 'A árvore de arquivos abaixo é fictícia e não muda.',
        });
      } else {
        toast.success(`${r.enviados.length} arquivo(s) enviado(s).`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  async function aoSoltar(evento) {
    evento.preventDefault();
    setArrastando(false);

    // Coletado de forma SINCRONA: ver a nota em "Leitura de pasta arrastada".
    const entradas = [];
    for (const item of evento.dataTransfer.items ?? []) {
      const entrada = item.webkitGetAsEntry?.();
      if (entrada) entradas.push(entrada);
    }

    if (entradas.length) {
      try {
        const itens = await percorrer(entradas);
        if (itens.length) {
          acrescentar(itens);
          return;
        }
      } catch {
        // cai no fallback abaixo
      }
    }

    const simples = Array.from(evento.dataTransfer.files ?? []);
    if (simples.length) {
      acrescentar(simples.map((arquivo) => ({ arquivo, subPath: '' })));
      return;
    }

    toast.error('Não foi possível ler o que você arrastou. Use o botão "Selecionar pasta".');
  }

  const desabilitado = projeto?.status !== 'ativo';

  return (
    <Cartao
      icone={UploadCloud}
      titulo="Enviar arquivos"
      subtitulo="Vão para a pasta do projeto no SharePoint, preservando as subpastas."
      tomIcone="laranja"
    >
      {desabilitado ? (
        <EstadoVazio
          compacto
          icone={ShieldAlert}
          titulo="Projeto encerrado"
          texto="Reabra o projeto no seletor acima para voltar a enviar arquivos."
        />
      ) : (
        <div className="space-y-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={aoSoltar}
            onClick={() => !enviar.isPending && refArquivos.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 cursor-pointer select-none transition ${
              arrastando
                ? 'border-[#1A4731] bg-[#1A4731]/5'
                : 'border-[#DDE3DE] bg-white hover:border-[#1A4731]/40 hover:bg-[#F4F6F4]'
            }`}
          >
            <div className={`p-3 rounded-full ${arrastando ? 'bg-[#1A4731]/10' : 'bg-[#F4F6F4]'}`}>
              <UploadCloud size={30} className={arrastando ? 'text-[#1A4731]' : 'text-[#8A9990]'} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#1A2B1F]">
                {arrastando ? 'Solte aqui: arquivos ou pastas' : 'Arraste arquivos ou pastas'}
              </p>
              <p className="text-xs text-[#8A9990] mt-1">
                ou <span className="text-[#1A4731] font-medium">clique para selecionar arquivos</span>
              </p>
              <p className="text-[11px] text-[#8A9990] mt-1">
                Destino: <strong>{projeto?.pasta}</strong>
              </p>
            </div>
            <input
              ref={refArquivos}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                acrescentar(Array.from(e.target.files).map((arquivo) => ({ arquivo, subPath: '' })));
                e.target.value = '';
              }}
            />
          </div>

          {/* Fora da zona de soltar de proposito: um <label> dentro de um
              onClick de div dispara os dois seletores de arquivo. */}
          <div className="flex flex-col items-center gap-1">
            <label
              htmlFor="ss-seletor-pasta"
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-[#DDE3DE] bg-white text-[#5C7060] hover:text-[#1A4731] hover:border-[#1A4731]/40 transition cursor-pointer font-medium"
            >
              <Folder size={15} /> Selecionar pasta
            </label>
            <input
              id="ss-seletor-pasta"
              ref={refPasta}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                acrescentar(
                  Array.from(e.target.files).map((arquivo) => ({
                    arquivo,
                    // webkitRelativePath = 'Pasta/sub/arquivo.pdf'; o subPath e
                    // tudo menos o nome do arquivo.
                    subPath: arquivo.webkitRelativePath
                      ? arquivo.webkitRelativePath.split('/').slice(0, -1).join('/')
                      : '',
                  })),
                );
                e.target.value = '';
              }}
            />
          </div>

          {fila.length > 0 && (
            <div className="rounded-2xl border border-[#DDE3DE] bg-white p-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A9990]">
                Prontos para enviar ({fila.length})
              </p>
              <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                {fila.map(({ arquivo, subPath }, i) => (
                  <li
                    key={`${subPath}/${arquivo.name}-${i}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#F4F6F4]"
                  >
                    <IconeDoArquivo nome={arquivo.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1A2B1F] truncate">{arquivo.name}</p>
                      <p className="text-[11px] text-[#8A9990] truncate">
                        {formatarTamanho(arquivo.size)}
                        {subPath && <> · <Folder size={9} className="inline" /> {subPath}</>}
                      </p>
                    </div>
                    <BotaoSecundario
                      variante="fantasma"
                      icone={X}
                      tamanho="sm"
                      rotuloAcessivel={`Tirar ${arquivo.name} da fila`}
                      onClick={() => setFila((a) => a.filter((_, j) => j !== i))}
                    />
                  </li>
                ))}
              </ul>
              <BotaoPrimario
                larguraTotal
                icone={UploadCloud}
                carregando={enviar.isPending}
                onClick={() => enviar.mutate()}
              >
                Enviar {fila.length} arquivo{fila.length > 1 ? 's' : ''}
              </BotaoPrimario>
            </div>
          )}
        </div>
      )}
    </Cartao>
  );
}

/* ===== Arvore de arquivos ================================================= */

/**
 * Arvore de arquivos da pasta, com envio e controle de acesso por item.
 *
 * EXPORTADA para a tela da pasta Geral (src/pages/SecureShareGeral.jsx)
 * reaproveitar a arvore inteira em vez de ganhar uma copia que divergiria na
 * primeira correcao. O `projeto` que ela recebe la e sintetico:
 * `{ id: 'geral', empresa: 'Geral', pasta: <nome vindo do servidor> }`.
 *
 * `semRegras` desliga o controle de acesso por item. Na Geral ele nao existe por
 * DEFINICAO, e nao por simplificacao: a pasta e compartilhada com todos os
 * clientes, entao nao ha a quem restringir. O proprio banco registra isso no
 * comentario de carbon_secure_share_contexto ("p_projeto_id nulo e a pasta
 * Geral, que por definicao nao tem permissao por item"). Sem esta prop, a tela
 * mostraria um painel de permissao com lista de clientes vazia, convidando a
 * pessoa a procurar um cadastro que nao existe.
 */
export function Arquivos({ projeto, msal, clientes, permissoes, onMudou, semRegras = false }) {
  const [raiz, setRaiz] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [conteudo, setConteudo] = useState({});
  const [abertas, setAbertas] = useState(new Set());
  const [carregandoPasta, setCarregandoPasta] = useState(new Set());
  const [painelItem, setPainelItem] = useState(null);

  const carregarRaiz = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const r = await listarArquivos(msal, projeto.id, '');
      setRaiz(r.itens ?? []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [msal, projeto.id]);

  useEffect(() => { carregarRaiz(); }, [carregarRaiz]);

  async function abrirPasta(caminho) {
    if (abertas.has(caminho)) {
      setAbertas((a) => { const n = new Set(a); n.delete(caminho); return n; });
      return;
    }
    setAbertas((a) => new Set([...a, caminho]));
    if (conteudo[caminho] !== undefined) return;

    setCarregandoPasta((a) => new Set([...a, caminho]));
    try {
      const r = await listarArquivos(msal, projeto.id, caminho);
      setConteudo((a) => ({ ...a, [caminho]: r.itens ?? [] }));
    } catch (e) {
      toast.error(`Erro ao abrir "${caminho.split('/').pop()}": ${e.message}`);
      setAbertas((a) => { const n = new Set(a); n.delete(caminho); return n; });
    } finally {
      setCarregandoPasta((a) => { const n = new Set(a); n.delete(caminho); return n; });
    }
  }

  function atualizarTudo() {
    setAbertas(new Set());
    setConteudo({});
    setPainelItem(null);
    carregarRaiz();
    onMudou();
  }

  const definir = useMutation({
    mutationFn: (dados) => definirPermissao(msal, projeto.id, dados),
    onSuccess: () => onMudou(),
    onError: (e) => toast.error(e.message),
  });

  /** Restricoes que alcancam o item, incluindo as herdadas de pasta. */
  function contarRestricoes(itemPath) {
    return clientes.filter((c) => nivelDoItem(permissoes, itemPath, c.email) !== 'total').length;
  }

  function linhas(itens, profundidade, pai) {
    return (itens ?? []).flatMap((item) => {
      const caminho = pai ? `${pai}/${item.nome}` : item.nome;
      const recuo = profundidade * 16;
      const restricoes = contarRestricoes(caminho);
      const painelAberto = painelItem === caminho;
      const ehPasta = item.tipo === 'pasta';

      const painel = painelAberto && !semRegras ? (
        <li
          key={`${caminho}::painel`}
          style={{ paddingLeft: `${recuo + 28}px` }}
          className="py-2 pr-3 border-b border-[#F4F6F4]"
        >
          <div className="bg-white border border-[#DDE3DE] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[#5C7060] flex items-center gap-1.5">
                <Lock size={11} /> Controle de acesso
              </p>
              {restricoes > 0 ? (
                <Badge tom="ambar" tamanho="sm">{restricoes} restrição(ões)</Badge>
              ) : (
                <Badge tom="verde" tamanho="sm">Acesso total</Badge>
              )}
            </div>

            {ehPasta && (
              <p className="text-[11px] text-[#5C7060] bg-[#F4F6F4] border border-[#DDE3DE] rounded-lg px-2.5 py-1.5 mb-2.5 leading-snug">
                A regra escolhida aqui vale para <strong>todo o conteúdo da pasta</strong>,
                incluindo subpastas. Em &quot;Só visualizar&quot;, os arquivos de dentro ficam
                fora do download da pasta em ZIP.
              </p>
            )}

            {clientes.length === 0 ? (
              <p className="text-xs text-[#8A9990]">
                Nenhum cliente cadastrado ainda. Cadastre abaixo para definir permissões.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {clientes.map((c) => {
                  const nivel = nivelDoItem(permissoes, caminho, c.email);

                  // Regra que veio de uma PASTA acima nao pode ser desfeita no
                  // item: no servidor vence sempre a mais restritiva, entao um
                  // seletor liberado aqui ofereceria uma escolha que nao teria
                  // efeito nenhum. Herdada = restringe, mas nao ha linha de
                  // permissao para ESTE caminho exato.
                  const alvo = c.email.toLowerCase();
                  const temRegraPropria = permissoes.some(
                    (p) =>
                      p.item_path === caminho &&
                      ((p.emails_negados ?? []).includes(alvo) ||
                        (p.emails_sem_download ?? []).includes(alvo)),
                  );
                  const herdado = nivel !== 'total' && !temRegraPropria;

                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[#F4F6F4]"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-[#1A2B1F]">{c.nome}</span>
                        <span className="text-[10px] text-[#8A9990] ml-1 hidden sm:inline">
                          {c.email}
                        </span>
                        {herdado && (
                          <span className="text-[10px] text-[#8A5A12] ml-1">· herdado da pasta</span>
                        )}
                      </div>
                      <SeletorStatus
                        valor={nivel}
                        opcoes={NIVEIS}
                        tamanho="sm"
                        desabilitado={herdado || definir.isPending}
                        rotuloAcessivel={`Acesso de ${c.nome} a ${item.nome}`}
                        onChange={(v) =>
                          definir.mutate({ item_path: caminho, email: c.email, nivel: v })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <BotaoSecundario
              variante="fantasma"
              tamanho="sm"
              className="mt-2"
              onClick={() => setPainelItem(null)}
            >
              Fechar
            </BotaoSecundario>
          </div>
        </li>
      ) : null;

      // Na Geral nao ha a quem restringir: sem botao, em vez de um botao que
      // abre um painel vazio.
      const botaoPermissao = semRegras ? null : (
        <BotaoSecundario
          variante="fantasma"
          icone={Lock}
          tamanho="sm"
          titulo="Controlar acesso"
          rotuloAcessivel={`Controlar acesso a ${item.nome}`}
          className={restricoes > 0 ? 'text-[#8A5A12]' : ''}
          onClick={(e) => {
            e.stopPropagation();
            setPainelItem(painelAberto ? null : caminho);
          }}
        />
      );

      if (ehPasta) {
        const expandida = abertas.has(caminho);
        const ocupada = carregandoPasta.has(caminho);
        const filhos = conteudo[caminho];

        const linhaPasta = (
          <li
            key={caminho}
            onClick={() => abrirPasta(caminho)}
            style={{ paddingLeft: `${recuo}px` }}
            className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-[#F4F6F4] border-b border-[#F4F6F4] transition select-none"
          >
            <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#8A9990]">
              {ocupada ? <Loader2 size={13} className="animate-spin" />
                : expandida ? <ChevronDown size={14} />
                : <ChevronRight size={14} />}
            </span>
            <Folder size={15} className="text-[#C98A2B] shrink-0" />
            <span className="text-sm font-medium text-[#1A2B1F] truncate flex-1">{item.nome}</span>
            {restricoes > 0 && <Badge tom="ambar" tamanho="sm">{restricoes}</Badge>}
            {botaoPermissao}
          </li>
        );

        const filhosRender =
          expandida && filhos !== undefined
            ? filhos.length === 0
              ? [
                  <li
                    key={`${caminho}::vazia`}
                    style={{ paddingLeft: `${recuo + 36}px` }}
                    className="py-2 px-3 text-xs text-[#8A9990] italic border-b border-[#F4F6F4]"
                  >
                    Pasta vazia
                  </li>,
                ]
              : linhas(filhos, profundidade + 1, caminho)
            : [];

        return [linhaPasta, ...(painel ? [painel] : []), ...filhosRender];
      }

      const linhaArquivo = (
        <li
          key={caminho}
          style={{ paddingLeft: `${recuo}px` }}
          className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#F4F6F4] border-b border-[#F4F6F4] transition"
        >
          <span className="w-4 shrink-0" />
          <IconeDoArquivo nome={item.nome} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#1A2B1F] truncate">{item.nome}</p>
            <p className="text-[11px] text-[#8A9990]">
              {formatarTamanho(item.tamanho)}
              {item.criadoEm && ` · ${fmtData(item.criadoEm) ?? ''}`}
            </p>
          </div>
          {restricoes > 0 && <Badge tom="ambar" tamanho="sm">{restricoes}</Badge>}
          {botaoPermissao}
        </li>
      );

      return [linhaArquivo, ...(painel ? [painel] : [])];
    });
  }

  return (
    <Cartao
      icone={Folder}
      titulo="Arquivos na pasta"
      subtitulo={
        raiz?.length
          ? `${raiz.length} ${raiz.length === 1 ? 'item' : 'itens'} na raiz`
          : 'Conteúdo da pasta no SharePoint'
      }
      semPaddingCorpo
      acao={
        <BotaoSecundario
          variante="fantasma"
          icone={RefreshCw}
          tamanho="sm"
          carregando={carregando}
          onClick={atualizarTudo}
        >
          Atualizar
        </BotaoSecundario>
      }
    >
      {/* Sem botao de baixar de proposito: baixar aqui exigiria entregar ao
          navegador a downloadUrl pre-autenticada do SharePoint, que contorna
          qualquer restricao de "só visualizar". O portal do cliente resolve isso
          fazendo todo byte passar por uma Edge Function que confere a permissao;
          para a equipe interna, o caminho e o proprio SharePoint. */}
      {carregando ? (
        <div className="p-8"><Carregando rotulo="Carregando os arquivos" /></div>
      ) : erro ? (
        <div className="p-5">
          <AvisoDiscreto tom="vermelho" titulo="Não foi possível listar a pasta.">
            {erro}
          </AvisoDiscreto>
        </div>
      ) : (raiz ?? []).length === 0 ? (
        <div className="p-5">
          <EstadoVazio
            compacto
            icone={Folder}
            titulo="Nenhum arquivo na pasta ainda"
            texto="Envie os documentos acima. Só depois disso vale a pena liberar o acesso dos clientes, para eles não abrirem uma pasta vazia."
          />
        </div>
      ) : (
        <ul>{linhas(raiz, 0, '')}</ul>
      )}
    </Cartao>
  );
}

/* ===== Clientes =========================================================== */

/** Parte depois do arroba, em minúsculas. '' quando não há arroba. */
function dominioDoEmail(valor) {
  const partes = String(valor ?? '').trim().toLowerCase().split('@');
  return partes.length === 2 ? partes[1] : '';
}

function Clientes({ projeto, msal, clientes, onMudou }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  // Marcado por padrão: ver o cabeçalho do arquivo. O convite é o portão, e um
  // portão que depende de alguém lembrar de abrir não é um portão.
  const [avisar, setAvisar] = useState(true);
  const [prazoDe, setPrazoDe] = useState(null);
  const [prazo, setPrazo] = useState({ inicio: '', fim: '' });

  const criar = useMutation({
    mutationFn: () =>
      criarCliente(msal, projeto.id, { nome: nome.trim(), email: email.trim(), avisar }),
    onSuccess: (r) => {
      setNome('');
      setEmail('');
      setAvisar(true);
      onMudou();

      // `aviso_convite` NÃO pode ser engolido: cadastro gravado com convite que
      // não saiu é cliente sem acesso, e a linha fica em âmbar sem ninguém
      // entender por quê. Este é o único aviso da tela que muda o que a pessoa
      // precisa fazer a seguir, então ele fica na tela por bastante tempo.
      if (r?.aviso_convite) {
        toast.warning('Cliente cadastrado, mas o convite não saiu.', {
          description: `${r.aviso_convite} Enquanto o convite não sair, esta pessoa não consegue entrar.`,
          duration: 15000,
        });
        return;
      }

      toast.success(
        avisar ? 'Cliente cadastrado e convite enviado.' : 'Cliente cadastrado.',
        avisar
          ? undefined
          : {
              description:
                'O convite ainda NÃO saiu, então esta pessoa ainda não tem acesso. Use "Enviar convite" na linha dela.',
              duration: 12000,
            },
      );
    },
    onError: (e) => toast.error(e.message),
  });

  /**
   * Cadastrar conferindo o domínio antes.
   *
   * Sem senha, o e-mail É a credencial: um endereço digitado errado que por acaso
   * exista entrega os documentos deste projeto a um estranho, e o convite sai
   * automaticamente para ele. A comparação com os domínios já cadastrados no
   * projeto custa zero requisição (a lista já está na tela) e pega o erro que
   * realmente acontece, que é o domínio trocado, não o nome mal escrito.
   *
   * É só um aviso, nunca um bloqueio: um projeto legítimo tem consultor externo,
   * auditor de VVB e comprador, cada um no seu domínio.
   */
  function cadastrar() {
    const alvo = dominioDoEmail(email);
    const conhecidos = new Set(clientes.map((c) => dominioDoEmail(c.email)).filter(Boolean));

    if (alvo && conhecidos.size > 0 && !conhecidos.has(alvo)) {
      const aviso =
        `O domínio "${alvo}" ainda não aparece neste projeto ` +
        `(já cadastrados: ${[...conhecidos].join(', ')}).\n\n` +
        'Confira o endereço: quem receber o convite passa a abrir os documentos deste projeto.\n\n' +
        'Cadastrar mesmo assim?';
      if (!window.confirm(aviso)) return;
    }

    criar.mutate();
  }

  const atualizar = useMutation({
    mutationFn: ({ id, dados }) => atualizarCliente(msal, id, dados),
    onSuccess: () => { setPrazoDe(null); onMudou(); toast.success('Acesso atualizado.'); },
    onError: (e) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: (id) => removerCliente(msal, id),
    onSuccess: () => { onMudou(); toast.success('Cliente removido.'); },
    onError: (e) => toast.error(e.message),
  });

  const convidar = useMutation({
    mutationFn: (id) => enviarConvite(msal, id),
    onSuccess: () => {
      onMudou();
      toast.success('Convite enviado.', {
        description:
          'A pessoa recebeu o endereço do portal e a instrução de entrar. Nenhuma senha foi criada: no login ela recebe um código de uso único por e-mail.',
      });
    },
    onError: (e) => toast.error(e.message, { duration: 12000 }),
  });

  return (
    <Cartao
      icone={Users}
      titulo="Clientes com acesso"
      subtitulo={`${clientes.length} pessoa(s) de fora da APSIS`}
      semPaddingCorpo
    >
      {clientes.length === 0 ? (
        <div className="p-5">
          <EstadoVazio
            compacto
            icone={Users}
            titulo="Nenhum cliente cadastrado"
            texto="Cadastre abaixo quem, do lado do cliente, precisa abrir estes documentos. Não há senha: cada pessoa entra com o próprio e-mail e um código de uso único que chega na caixa dela."
          />
        </div>
      ) : (
        <ul>
          {clientes.map((c) => {
            const situacao = SITUACAO[c.situacao] ?? { rotulo: c.situacao, tom: 'neutro' };
            const visto = fmtDataHora(c.ultimo_acesso);
            const editando = prazoDe === c.id;

            return (
              <li key={c.id} className="px-5 py-3 border-b border-[#F4F6F4] last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1A4731]/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#1A4731]">
                      {(c.nome || c.email).charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A2B1F] truncate">{c.nome}</p>
                    <p className="text-xs text-[#8A9990] truncate">{c.email}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge tom={situacao.tom} tamanho="sm">{situacao.rotulo}</Badge>
                      <Badge tom={visto ? 'verde' : 'neutro'} tamanho="sm">
                        {visto ? `Viu em ${visto}` : 'Nunca abriu'}
                      </Badge>
                      {c.acesso_fim && (
                        <Badge tom="azul" tamanho="sm" icone={Calendar}>
                          Até {fmtData(c.acesso_fim)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <BotaoSecundario
                      icone={Calendar}
                      tamanho="sm"
                      titulo="Definir prazo de acesso"
                      onClick={() => {
                        if (editando) { setPrazoDe(null); return; }
                        setPrazoDe(c.id);
                        setPrazo({ inicio: c.acesso_inicio || hojeIso(), fim: c.acesso_fim || '' });
                      }}
                    >
                      Prazo
                    </BotaoSecundario>

                    {/* Secundário, e não primário como no envio de senha: o botão
                        deixou de ser a ação que CRIA a credencial e virou rotina
                        inofensiva (o convite não carrega senha nem código, então
                        reenviar não invalida nada do lado do cliente). Quem chama
                        atenção para o que falta é o badge âmbar "Convite não
                        enviado", que é a informação, não o botão.

                        Ícone Mail nas duas versões, de propósito: a chave do
                        KeyRound anunciava senha e não existe mais senha nenhuma
                        para anunciar. */}
                    <BotaoSecundario
                      icone={Mail}
                      tamanho="sm"
                      carregando={convidar.isPending && convidar.variables === c.id}
                      titulo={
                        c.acesso_enviado
                          ? 'Envia o convite de novo. Nada do que a pessoa já tem deixa de valer.'
                          : 'Envia o convite e libera o acesso desta pessoa a este projeto.'
                      }
                      onClick={() => convidar.mutate(c.id)}
                    >
                      {c.acesso_enviado ? 'Reenviar convite' : 'Enviar convite'}
                    </BotaoSecundario>

                    <BotaoSecundario
                      variante="perigo"
                      icone={Trash2}
                      tamanho="sm"
                      rotuloAcessivel={`Remover ${c.nome}`}
                      carregando={remover.isPending && remover.variables === c.id}
                      onClick={() => remover.mutate(c.id)}
                    />
                  </div>
                </div>

                {editando && (
                  <div className="mt-2.5 ml-11 flex items-end gap-3 flex-wrap p-3 bg-[#F4F6F4] rounded-xl border border-[#DDE3DE]">
                    <Campo
                      rotulo="De"
                      tipo="data"
                      valor={prazo.inicio}
                      onChange={(v) => setPrazo((p) => ({ ...p, inicio: v }))}
                    />
                    <Campo
                      rotulo="Até"
                      tipo="data"
                      valor={prazo.fim}
                      dica="Em branco = sem prazo."
                      extras={{ min: prazo.inicio || undefined }}
                      onChange={(v) => setPrazo((p) => ({ ...p, fim: v }))}
                    />
                    <div className="flex items-center gap-2 ml-auto">
                      <BotaoPrimario
                        icone={Check}
                        tamanho="sm"
                        carregando={atualizar.isPending}
                        onClick={() =>
                          atualizar.mutate({
                            id: c.id,
                            dados: { acesso_inicio: prazo.inicio || null, acesso_fim: prazo.fim || null },
                          })
                        }
                      >
                        Salvar
                      </BotaoPrimario>
                      <BotaoSecundario variante="fantasma" tamanho="sm" onClick={() => setPrazoDe(null)}>
                        Cancelar
                      </BotaoSecundario>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-5 py-4 border-t border-[#F4F6F4] bg-[#F4F6F4]/40 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A9990]">
          Cadastrar cliente
        </p>
        <div className="flex gap-2 items-end flex-wrap">
          <Campo rotulo="Nome" valor={nome} onChange={setNome} className="flex-1 min-w-40"
            placeholder="Nome da pessoa" extras={{ maxLength: 200 }} />
          <Campo rotulo="E-mail" tipo="email" valor={email} onChange={setEmail}
            className="flex-1 min-w-48" placeholder="email@empresa.com" extras={{ maxLength: 320 }} />
          <BotaoPrimario
            icone={Plus}
            carregando={criar.isPending}
            desabilitado={!email.trim()}
            onClick={cadastrar}
          >
            Cadastrar
          </BotaoPrimario>
        </div>

        <Campo
          tipo="checkbox"
          rotulo="Avisar por e-mail agora"
          valor={avisar}
          onChange={setAvisar}
          dica="Desmarque só se você mesmo for avisar a pessoa por outro caminho. Sem o convite ela fica cadastrada e sem acesso."
        />

        <p className="text-[11px] text-[#8A9990]">
          Cadastrar não dá acesso: quem libera é o convite. Ele não leva senha nem código,
          só o endereço do portal. No login a pessoa recebe um código de uso único na caixa
          dela, e um novo a cada entrada.
        </p>
      </div>
    </Cartao>
  );
}

/* ===== Equipe APSIS ======================================================= */

function Equipe({ projeto, msal, equipe, onMudou }) {
  const [novo, setNovo] = useState('');

  const mudar = useMutation({
    mutationFn: (dados) => atualizarEquipe(msal, projeto.id, dados),
    onSuccess: (r) => {
      setNovo('');
      onMudou();
      if (r?.nao_encontrados?.length) {
        // Nao e falha: a linha em carbon_usuarios nasce no primeiro login. Dizer
        // isso evita a pessoa achar que digitou errado.
        toast.warning('Alguns e-mails ainda não têm cadastro no Apsis Carbon.', {
          description: `${r.nao_encontrados.join(', ')}. Peça para entrarem uma vez no sistema e tente de novo.`,
          duration: 12000,
        });
      }
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Cartao
      icone={ShieldCheck}
      titulo="Equipe APSIS"
      subtitulo="Quem, além de você e dos administradores, enxerga este projeto na lista."
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {projeto?.criado_por_email && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#1A4731]/10 text-[#1A4731] border border-[#1A4731]/20 rounded-full px-3 py-1">
              {projeto.criado_por_email}
              <span className="text-[10px] opacity-70">· criou</span>
            </span>
          )}
          {equipe.map((pessoa) => (
            <span
              key={pessoa.id}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#F4F6F4] text-[#5C7060] border border-[#DDE3DE] rounded-full pl-3 pr-1 py-1"
            >
              {pessoa.email}
              <BotaoSecundario
                variante="fantasma"
                icone={X}
                tamanho="sm"
                rotuloAcessivel={`Tirar ${pessoa.email} da equipe`}
                onClick={() => mudar.mutate({ remover: [pessoa.email] })}
              />
            </span>
          ))}
          {equipe.length === 0 && !projeto?.criado_por_email && (
            <p className="text-xs text-[#8A9990]">Ninguém além dos administradores.</p>
          )}
        </div>

        <div className="flex gap-2 items-end">
          <Campo
            rotulo="Acrescentar colaborador"
            tipo="email"
            valor={novo}
            placeholder="colega@apsis.com.br"
            className="flex-1"
            dica="Só e-mails @apsis.com.br. Para alguém de fora, cadastre como cliente."
            onChange={setNovo}
            extras={{ maxLength: 320 }}
          />
          <BotaoPrimario
            icone={Plus}
            carregando={mudar.isPending}
            desabilitado={!novo.trim()}
            onClick={() => mudar.mutate({ adicionar: [novo.trim()] })}
          >
            Adicionar
          </BotaoPrimario>
        </div>
      </div>
    </Cartao>
  );
}

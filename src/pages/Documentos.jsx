/**
 * Documentos - acervo único de documentos por projeto (issue #6).
 *
 * POR QUE ESTA TELA EXISTE: hoje o mesmo documento do mesmo projeto vive em três lugares
 * do Notion (entregáveis anexados na base "Projetos", a página "Documentos Parakanã" e o
 * checklist de evidências do Monitoring Report, onde o status "Anexado Pasta" quer dizer
 * literalmente "está numa pasta em algum lugar"). Aqui é um lugar só.
 *
 * AS TRÊS COISAS QUE A ISSUE PEDE DA TELA:
 *   1. lista por projeto com filtro por tipo;
 *   2. histórico de versões de uma família;
 *   3. formulário de cadastro por URL externa.
 *
 * VERSÃO VIGENTE. A listagem mostra por padrão SOMENTE a versão vigente de cada família
 * (o documento que nenhum outro substitui). Quem decide isso é o servidor, na função SQL
 * carbon_documentos_listar; a tela apenas oferece o interruptor "incluir versões
 * substituídas". Mostrar tudo por padrão reproduziria na tela o problema da pasta
 * compartilhada: três cópias do mesmo PDD e ninguém sabendo qual vale.
 *
 * ARMAZENAMENTO: decisão pendente da issue (Supabase Storage ou repositório externo). O
 * banco tem as duas colunas e exige ao menos uma; esta tela cadastra por URL externa e
 * diz isso com clareza. NÃO existe upload nesta entrega.
 *
 * AUTORIZAÇÃO: quem pode escrever é decidido no SERVIDOR (papel admin ou gestor, 403
 * 'sem_permissao'). A tela não esconde o formulário por perfil de propósito: seria uma
 * segunda fonte de verdade para a mesma regra, e ficaria dessincronizada na primeira
 * mudança. Um 403 vira toast com texto claro.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FileText, Plus, ExternalLink, HardDrive, History, Link2, Pencil, FilePlus2,
  ChevronLeft, ChevronRight, Building2, FolderTree,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Tabela from '@/components/ui/Tabela';
import Campo from '@/components/ui/Campo';
import Cartao from '@/components/ui/Cartao';
import Carregando from '@/components/ui/Carregando';
import CabecalhoSecao from '@/components/ui/CabecalhoSecao';
import PainelLateral from '@/components/ui/PainelLateral';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import {
  atualizarDocumento,
  criarDocumento,
  criarVersaoDocumento,
  listarDocumentos,
  obterDocumento,
} from '@/lib/api/documentos';
import { listarProjetos, normalizarListaProjetos } from '@/lib/api/projetos';
import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import { urlExternaSegura } from '@/utils/urlSegura';

/* ===== Domínio ============================================================
   Espelha os CHECK de carbon_documentos. Valor fora destes mapas ainda aparece na tela
   (com o rótulo cru), em vez de sumir: assim um tipo novo criado no banco antes do
   deploy do frontend não deixa a linha sem etiqueta.                          */

const TIPOS = {
  pdd: { label: 'PDD', tom: 'verde' },
  relatorio_monitoramento: { label: 'Relatório de monitoramento', tom: 'verde' },
  inventario: { label: 'Inventário', tom: 'azul' },
  geoespacial: { label: 'Geoespacial', tom: 'azul' },
  planilha: { label: 'Planilha', tom: 'ambar' },
  contrato: { label: 'Contrato', tom: 'laranja' },
  ata: { label: 'Ata', tom: 'neutro' },
  foto: { label: 'Foto', tom: 'neutro' },
  declaracao: { label: 'Declaração', tom: 'laranja' },
  laudo: { label: 'Laudo', tom: 'azul' },
  outro: { label: 'Outro', tom: 'neutro' },
};

const ORIGENS = {
  interna: { label: 'Interna', tom: 'verde' },
  parceiro: { label: 'Parceiro', tom: 'azul' },
  orgao: { label: 'Órgão', tom: 'ambar' },
  validadora: { label: 'Validadora', tom: 'laranja' },
};

/** Rótulos dos tipos de item que um vínculo pode apontar. Ver o comentário de
 *  carbon_documento_vinculos.tipo_alvo: é texto livre com formato validado, porque os
 *  domínios de destino ainda vão nascer. Chave desconhecida mostra o valor cru. */
const TIPOS_ALVO = {
  evidencia: 'Item de evidência da auditoria',
  finding: 'Finding de auditoria',
  pdd_capitulo: 'Capítulo do PDD',
  monitoramento_capitulo: 'Capítulo do monitoramento',
  reuniao: 'Reunião',
  contrato: 'Contrato',
  atividade: 'Atividade',
  meta: 'Meta',
  projeto: 'Projeto',
};

const opcoesDe = (mapa) =>
  Object.entries(mapa).map(([valor, { label }]) => ({ valor, rotulo: label }));

const rotuloTipo = (tipo) => TIPOS[tipo]?.label || tipo || 'Sem tipo';
const tomTipo = (tipo) => TIPOS[tipo]?.tom || 'neutro';
const rotuloOrigem = (origem) => ORIGENS[origem]?.label || origem || 'Sem origem';
const tomOrigem = (origem) => ORIGENS[origem]?.tom || 'neutro';

/**
 * Mensagens de interface para os códigos de erro DESTE domínio.
 *
 * O tradutor central (mensagemDeErro em src/lib/api/base.js) conhece os códigos
 * genéricos do contrato e os das rotas de projeto e PDD. Os códigos próprios daqui
 * cairiam no texto genérico "O servidor recusou a requisição (local_obrigatorio)", que
 * não diz o que a pessoa faz a seguir. Traduzir na tela mantém o texto junto de quem o
 * exibe e não exige tocar num arquivo compartilhado da fundação.
 */
const MENSAGENS_ERRO = {
  local_obrigatorio:
    'Informe a URL do documento: sem ela o registro não diz onde o arquivo está.',
  url_invalida: 'A URL do documento precisa começar com http:// ou https://.',
  caminho_invalido:
    'O caminho no armazenamento precisa ser relativo, sem barra inicial e sem "..".',
  tipo_invalido: 'O tipo de documento informado não é válido.',
  origem_invalida: 'A origem informada não é válida.',
  versao_invalida: 'A versão precisa ser um número inteiro entre 1 e 999.',
  documento_ja_substituido:
    'Este documento já tem uma versão mais nova. Registre a próxima versão a partir dela.',
  familia_de_outro_projeto:
    'Documento que faz parte de um histórico de versões não pode mudar de projeto.',
  tipo_alvo_invalido: 'O tipo de item vinculado não é válido.',
  registro_duplicado: 'Este vínculo já existe para o documento.',
};

const textoDoErro = (erro, padrao) =>
  MENSAGENS_ERRO[erro?.codigo] || erro?.message || padrao;

const LIMITE_PAGINA = 20;

/* ===== Formatação ========================================================= */

/**
 * Formata uma coluna `date` do Postgres, que chega como 'AAAA-MM-DD'.
 *
 * Na mão de propósito: new Date('2024-01-01') é meia-noite UTC e, no fuso do Brasil,
 * toLocaleDateString mostraria o dia ANTERIOR. Aqui isso apareceria justamente na data
 * do documento, que é o que a validadora confere.
 */
function fmtData(valor) {
  if (!valor) return '-';
  const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (partes) return `${partes[3]}/${partes[2]}/${partes[1]}`;
  const d = new Date(String(valor));
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
}

/** Data e hora de registro (timestamptz). */
function fmtDataHora(valor) {
  if (!valor) return '-';
  const d = new Date(String(valor));
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('pt-BR');
}

/** Tamanho legível. Devolve null quando não há tamanho conhecido. */
function fmtTamanho(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unidades = ['B', 'KB', 'MB', 'GB'];
  let valor = n;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i += 1;
  }
  const casas = i > 0 && valor < 100 ? 1 : 0;
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: casas })} ${unidades[i]}`;
}

/**
 * Extensão deduzida da URL, para o campo "formato" não precisar ser digitado no caso
 * comum. Só é usada quando a pessoa deixou o campo vazio.
 */
function formatoDaUrl(url) {
  try {
    const caminho = new URL(url).pathname;
    const achado = caminho.match(/\.([a-z0-9]{1,10})$/i);
    return achado ? achado[1].toLowerCase() : '';
  } catch {
    return '';
  }
}

/* ===== Formulário ========================================================= */

const FORM_VAZIO = {
  projetoId: '',
  titulo: '',
  tipo: 'outro',
  origem: 'interna',
  versao: '',
  data_documento: '',
  formato: '',
  url_externa: '',
  descricao: '',
};

function formDoDocumento(documento) {
  return {
    ...FORM_VAZIO,
    projetoId: documento?.projeto_id ?? '',
    titulo: documento?.titulo ?? '',
    tipo: documento?.tipo || 'outro',
    origem: documento?.origem || 'interna',
    versao: documento?.versao === null || documento?.versao === undefined ? '' : String(documento.versao),
    data_documento: documento?.data_documento ?? '',
    formato: documento?.formato ?? '',
    url_externa: documento?.url_externa ?? '',
    descricao: documento?.descricao ?? '',
  };
}

/** Formulário de nova versão: herda o que identifica a família e limpa o resto. */
function formDaProximaVersao(documento) {
  return {
    ...FORM_VAZIO,
    projetoId: documento?.projeto_id ?? '',
    titulo: documento?.titulo ?? '',
    tipo: documento?.tipo || 'outro',
    origem: documento?.origem || 'interna',
    versao: String((Number(documento?.versao) || 1) + 1),
    // Data, formato, URL e descrição são da rodada NOVA: herdar faria a versão nova
    // apontar para o arquivo antigo, que é o oposto de versionar.
    data_documento: '',
    formato: '',
    url_externa: '',
    descricao: '',
  };
}

/**
 * Monta o corpo da requisição. Lança Error com a mensagem de interface na primeira
 * inconsistência; quem chama mostra em toast.
 *
 * @param modo 'criar' | 'editar' | 'versao'
 *
 * Na EDIÇÃO, campo esvaziado vai como `null`, e não omitido: o backend usa "a chave veio
 * no corpo?" para decidir o que tocar, então omitir significaria "mantenha o valor
 * atual" e limpar um campo preenchido seria impossível, com a tela ainda dizendo
 * "Documento atualizado".
 */
function montarPayload(form, modo) {
  const titulo = String(form.titulo ?? '').trim();
  if (!titulo) throw new Error('Informe o título do documento.');

  const url = String(form.url_externa ?? '').trim();
  if (!url) {
    throw new Error(
      'Informe a URL do documento. Enquanto não houver upload, é ela que diz onde o arquivo está.',
    );
  }
  /* Mesma checagem do backend e do CHECK da tabela. Três barreiras porque este valor
     vira o href de um link: o React não bloqueia href="javascript:...". */
  if (!urlExternaSegura(url)) {
    throw new Error('A URL do documento precisa começar com http:// ou https://.');
  }

  const payload = { titulo, url_externa: url };

  // Tipo e projeto identificam a família e são herdados pelo servidor na nova versão:
  // enviá-los aqui seria pedir uma troca que o backend recusa (e deve recusar).
  if (modo !== 'versao') {
    payload.tipo = form.tipo || 'outro';
    // Vazio significa documento institucional, e null é o valor que a coluna guarda.
    payload.projeto_id = form.projetoId ? form.projetoId : null;
  }

  payload.origem = form.origem || 'interna';

  if (modo === 'criar') {
    const versao = String(form.versao ?? '').trim();
    if (versao) {
      const n = Number(versao);
      if (!Number.isInteger(n) || n < 1 || n > 999) {
        throw new Error('A versão precisa ser um número inteiro entre 1 e 999.');
      }
      payload.versao = n;
    }
  }

  const data = String(form.data_documento ?? '').trim();
  if (data) payload.data_documento = data;
  else if (modo === 'editar') payload.data_documento = null;

  const descricao = String(form.descricao ?? '').trim();
  if (descricao) payload.descricao = descricao;
  else if (modo === 'editar') payload.descricao = null;

  // Formato deduzido da URL quando não foi digitado: no caso comum ninguém precisa
  // preencher, e o valor continua editável quando a URL não tem extensão.
  const formato = String(form.formato ?? '').trim() || formatoDaUrl(url);
  if (formato) payload.formato = formato;
  else if (modo === 'editar') payload.formato = null;

  return payload;
}

/* ===== Blocos de interface ================================================ */

function EtiquetaTipo({ tipo }) {
  return <Badge tom={tomTipo(tipo)}>{rotuloTipo(tipo)}</Badge>;
}

/**
 * Onde está o arquivo.
 *
 * O clique (e o Enter) param aqui: a linha da tabela abre o painel de detalhes, e sem o
 * stopPropagation abrir o arquivo abriria o painel junto.
 */
function CelulaArquivo({ documento }) {
  const url = urlExternaSegura(documento?.url_externa);
  const tamanho = fmtTamanho(documento?.tamanho_bytes);
  const detalhe = [documento?.formato?.toUpperCase(), tamanho].filter(Boolean).join(' · ');

  if (!url) {
    // Sem URL, só pode existir caminho_storage (a tabela exige um dos dois). Não há
    // download: o upload é a decisão pendente da issue.
    return (
      <div className="flex flex-col gap-1">
        <Badge tom="neutro" icone={HardDrive} tamanho="sm">
          No armazenamento
        </Badge>
        {detalhe && <span className="text-[11px] text-[#8A9990]">{detalhe}</span>}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-1 items-start"
      onClick={(evento) => evento.stopPropagation()}
      onKeyDown={(evento) => evento.stopPropagation()}
    >
      <BotaoSecundario
        como="externo"
        href={url}
        tamanho="sm"
        icone={ExternalLink}
        titulo={url}
        rotuloAcessivel={`Abrir ${documento?.titulo || 'documento'} em outra aba`}
      >
        Abrir
      </BotaoSecundario>
      {detalhe && <span className="text-[11px] text-[#8A9990]">{detalhe}</span>}
    </div>
  );
}

/** Uma versão na lista do histórico da família. */
function LinhaVersao({ versao, atualId }) {
  const url = urlExternaSegura(versao?.url_externa);
  const ehAtual = versao?.id === atualId;
  const tamanho = fmtTamanho(versao?.tamanho_bytes);

  return (
    <li
      className={`flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-3 ${versao?.substituido ? 'opacity-70' : ''}`}
    >
      <span className="font-mono text-[11px] font-bold text-[#8A9990] tabular-nums mt-0.5 w-8 flex-shrink-0">
        v{versao?.versao}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#1A2B1F] break-words">
            {versao?.titulo || 'Sem título'}
          </span>
          {versao?.substituido ? (
            <Badge tom="neutro" tamanho="sm">
              Substituída
            </Badge>
          ) : (
            <Badge tom="verde" tamanho="sm">
              Vigente
            </Badge>
          )}
          {ehAtual && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#F47920]">
              Aberta
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#8A9990] mt-0.5">
          Documento de {fmtData(versao?.data_documento)} · registrada em{' '}
          {fmtDataHora(versao?.criado_em)}
          {tamanho ? ` · ${tamanho}` : ''}
        </p>
        {versao?.descricao && (
          <p className="text-[11px] text-[#5C7060] mt-1 leading-relaxed">{versao.descricao}</p>
        )}
      </div>

      {url && (
        <BotaoSecundario
          como="externo"
          href={url}
          tamanho="sm"
          icone={ExternalLink}
          rotuloAcessivel={`Abrir a versão ${versao?.versao} em outra aba`}
        >
          Abrir
        </BotaoSecundario>
      )}
    </li>
  );
}

/**
 * Vínculos do documento, somente leitura.
 *
 * CRIAR VÍNCULO NÃO É POSSÍVEL AQUI, de propósito: o alvo é o par (tipo do item, id do
 * item), e as telas que possuem esses itens (checklist de evidências da auditoria, issue
 * #4, e findings, #5) ainda não existem. Um campo de UUID solto seria pior do que não ter
 * campo - o mesmo critério já adotado no responsável do capítulo de PDD. As rotas POST e
 * DELETE de vínculo existem no backend justamente para aquelas telas.
 */
function Vinculos({ vinculos }) {
  if (!vinculos?.length) {
    return (
      <p className="text-[11px] text-[#8A9990] leading-relaxed">
        Nenhum vínculo. O vínculo é criado a partir do item que precisa da evidência (o
        checklist da auditoria e os findings), e é ele que permite um documento satisfazer
        vários itens e um item exigir vários documentos.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[#F4F6F4]">
      {vinculos.map((vinculo) => (
        <li key={vinculo.id} className="py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tom="azul" tamanho="sm" icone={Link2}>
              {TIPOS_ALVO[vinculo.tipo_alvo] || vinculo.tipo_alvo}
            </Badge>
            {/* O id aparece truncado porque o item da outra ponta ainda não tem tela que
                saiba mostrar o nome dele. Truncar evita uma linha de UUID cru dominando
                o painel, e o title completo continua disponível. */}
            <span
              className="font-mono text-[10px] text-[#A8B4AC] tabular-nums"
              title={vinculo.alvo_id}
            >
              {String(vinculo.alvo_id).slice(0, 8)}
            </span>
          </div>
          {vinculo.observacao && (
            <p className="text-[11px] text-[#5C7060] mt-1 leading-relaxed">{vinculo.observacao}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function FormularioDocumento({ form, setForm, modo, projetos, documentoBase }) {
  const alterar = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const opcoesProjeto = [
    { valor: '', rotulo: 'Sem projeto (institucional)' },
    ...projetos.map((projeto) => ({ valor: projeto.id, rotulo: projeto.nome })),
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {modo === 'versao' ? (
        <div className="sm:col-span-2">
          <AvisoDiscreto tom="azul" titulo={`Nova versão de "${documentoBase?.titulo || 'documento'}".`}>
            Projeto e tipo são herdados da versão {documentoBase?.versao} e não mudam: é a
            mesma família. A versão nova precisa do próprio arquivo.
          </AvisoDiscreto>
        </div>
      ) : (
        <Campo
          rotulo="Projeto"
          tipo="select"
          opcoes={opcoesProjeto}
          valor={form.projetoId}
          onChange={alterar('projetoId')}
          dica="Sem projeto = documento institucional da APSIS (modelo, procedimento, SOP), reaproveitado por vários projetos."
          className="sm:col-span-2"
        />
      )}

      <Campo
        rotulo="Título"
        obrigatorio
        valor={form.titulo}
        onChange={alterar('titulo')}
        placeholder="Como a equipe chama este documento"
        extras={{ maxLength: 200 }}
        className="sm:col-span-2"
      />

      <Campo
        rotulo="Tipo"
        tipo="select"
        opcoes={opcoesDe(TIPOS)}
        valor={form.tipo}
        onChange={alterar('tipo')}
        desabilitado={modo === 'versao'}
        dica={modo === 'versao' ? 'Herdado da versão anterior.' : undefined}
      />

      <Campo
        rotulo="Origem"
        tipo="select"
        opcoes={opcoesDe(ORIGENS)}
        valor={form.origem}
        onChange={alterar('origem')}
        dica="Quem produziu o documento."
      />

      <Campo
        rotulo="Data do documento"
        tipo="data"
        valor={form.data_documento}
        onChange={alterar('data_documento')}
        dica="Data de emissão ou assinatura, não a do cadastro."
      />

      {modo === 'criar' ? (
        <Campo
          rotulo="Versão"
          tipo="numero"
          valor={form.versao}
          onChange={alterar('versao')}
          placeholder="1"
          extras={{ min: 1, max: 999, step: 1 }}
          dica="Deixe vazio para começar em 1. Preencha só quando o documento já chega com histórico de fora do sistema."
        />
      ) : (
        <Campo
          rotulo="Versão"
          valor={form.versao}
          desabilitado
          dica={
            modo === 'versao'
              ? 'Calculada pelo servidor a partir da versão anterior.'
              : 'A versão muda registrando uma nova versão, não editando esta.'
          }
        />
      )}

      <Campo
        rotulo="URL do documento"
        obrigatorio
        valor={form.url_externa}
        onChange={alterar('url_externa')}
        placeholder="https://..."
        extras={{ maxLength: 500, spellCheck: false }}
        dica="Endereço no repositório onde o arquivo está hoje. Aceita apenas http e https."
        className="sm:col-span-2"
      />

      <Campo
        rotulo="Formato"
        valor={form.formato}
        onChange={alterar('formato')}
        placeholder="pdf"
        extras={{ maxLength: 20 }}
        dica="Deixe vazio para deduzir da URL (pdf, xlsx, kml)."
      />

      <Campo
        rotulo="Descrição"
        tipo="textarea"
        linhas={3}
        valor={form.descricao}
        onChange={alterar('descricao')}
        placeholder="O que este documento é, e o que ele comprova"
        extras={{ maxLength: 5000 }}
        dica="Não registre dado pessoal aqui (nome, e-mail, telefone, documento de identificação)."
        className="sm:col-span-2"
      />

      <div className="sm:col-span-2">
        <AvisoDiscreto>
          O upload de arquivo ainda não existe: a decisão entre guardar no armazenamento do
          sistema ou referenciar o repositório atual está pendente na issue #6. Até lá o
          registro é por URL, e o histórico de versões já funciona.
        </AvisoDiscreto>
      </div>
    </div>
  );
}

/* ===== Página ============================================================= */

export default function Documentos() {
  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const autenticado = (accounts?.length ?? 0) > 0;
  /* Em modo demonstração não existe conta no MSAL (o login fica desabilitado) e as
     funções de api/documentos não usam token: exigir `autenticado` deixaria a tela
     permanentemente vazia justamente no modo que existe para revisá-la. */
  const habilitado = (MODO_DEMO && MODO_DEMO_ATIVO()) || autenticado;
  const queryClient = useQueryClient();

  const [filtroProjeto, setFiltroProjeto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('');
  const [incluirSubstituidos, setIncluirSubstituidos] = useState(false);
  const [buscaCampo, setBuscaCampo] = useState('');
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);

  const [detalheId, setDetalheId] = useState(null);
  const [modoForm, setModoForm] = useState(null); // 'criar' | 'editar' | 'versao'
  const [form, setForm] = useState(FORM_VAZIO);
  const [documentoBase, setDocumentoBase] = useState(null);

  /* Busca com espera curta: sem isso cada tecla dispararia uma requisição, e com o
     filtro na queryKey o cache encheria de entradas de uma letra. */
  useEffect(() => {
    const temporizador = setTimeout(() => setBusca(buscaCampo.trim()), 350);
    return () => clearTimeout(temporizador);
  }, [buscaCampo]);

  // Filtro novo sempre volta para a primeira página: manter a página 3 de um filtro
  // antigo mostra uma lista vazia que parece "nenhum resultado".
  useEffect(() => {
    setPagina(1);
  }, [filtroProjeto, filtroTipo, filtroOrigem, incluirSubstituidos, busca]);

  const projetosQuery = useQuery({
    queryKey: ['carbon', 'projetos'],
    queryFn: async () => {
      /* normalizarListaProjetos: a chave ['carbon', 'projetos'] é compartilhada; ler o
         envelope aqui é o que impede outra tela de encontrar um formato diferente. */
      return normalizarListaProjetos(await listarProjetos(msal));
    },
    enabled: habilitado,
  });

  const projetos = projetosQuery.data?.projetos ?? [];
  const nomePorProjeto = useMemo(() => {
    const mapa = new Map();
    for (const projeto of projetos) mapa.set(projeto?.id, projeto?.nome);
    return mapa;
  }, [projetos]);

  const filtros = useMemo(
    () => ({
      projetoId: filtroProjeto && filtroProjeto !== 'institucional' ? filtroProjeto : undefined,
      escopo: filtroProjeto === 'institucional' ? 'institucional' : undefined,
      tipo: filtroTipo || undefined,
      origem: filtroOrigem || undefined,
      incluirSubstituidos: incluirSubstituidos || undefined,
      busca: busca || undefined,
      limite: LIMITE_PAGINA,
      pagina,
    }),
    [filtroProjeto, filtroTipo, filtroOrigem, incluirSubstituidos, busca, pagina],
  );

  const listaQuery = useQuery({
    queryKey: ['carbon', 'documentos', filtros],
    queryFn: async () => {
      const resposta = await listarDocumentos(msal, filtros);
      return {
        documentos: Array.isArray(resposta?.documentos) ? resposta.documentos : [],
        total: Number(resposta?.total) || 0,
      };
    },
    enabled: habilitado,
  });

  const documentos = listaQuery.data?.documentos ?? [];
  const total = listaQuery.data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE_PAGINA));

  const detalheQuery = useQuery({
    queryKey: ['carbon', 'documento', detalheId],
    queryFn: async () => obterDocumento(msal, detalheId),
    enabled: habilitado && Boolean(detalheId),
  });

  const detalhe = detalheQuery.data?.documento ?? null;
  const familia = detalheQuery.data?.familia ?? [];
  const vinculos = detalheQuery.data?.vinculos ?? [];

  const fecharForm = () => {
    setModoForm(null);
    setForm(FORM_VAZIO);
    setDocumentoBase(null);
  };

  const abrirCriacao = () => {
    setDocumentoBase(null);
    // O projeto do filtro entra como sugestão: quem está olhando um projeto quase sempre
    // cadastra documento dele.
    const projetoSugerido =
      filtroProjeto && filtroProjeto !== 'institucional' ? filtroProjeto : '';
    setForm({ ...FORM_VAZIO, projetoId: projetoSugerido });
    setModoForm('criar');
  };

  /**
   * Editar e nova versão saem do painel de detalhes, e por isso FECHAM esse painel
   * antes de abrir o formulário.
   *
   * Não é preciosismo visual: PainelLateral prende o foco, escuta o Escape e trava a
   * rolagem do fundo. Dois painéis montados ao mesmo tempo disputariam as três coisas
   * (um Escape fecharia os dois, e o foco ficaria preso no de baixo). Depois de salvar, o
   * painel de detalhes reabre no documento certo.
   */
  const abrirEdicao = (documento) => {
    setDocumentoBase(documento);
    setForm(formDoDocumento(documento));
    setDetalheId(null);
    setModoForm('editar');
  };

  const abrirNovaVersao = (documento) => {
    setDocumentoBase(documento);
    setForm(formDaProximaVersao(documento));
    setDetalheId(null);
    setModoForm('versao');
  };

  const invalidarLista = () => {
    // Prefixo, e não a chave exata: existe uma entrada de cache por combinação de
    // filtros, e todas elas ficaram desatualizadas.
    queryClient.invalidateQueries({ queryKey: ['carbon', 'documentos'] });
  };

  const salvar = useMutation({
    mutationFn: async ({ modo, id, payload }) => {
      if (modo === 'criar') return criarDocumento(msal, payload);
      if (modo === 'versao') return criarVersaoDocumento(msal, id, payload);
      return atualizarDocumento(msal, id, payload);
    },
    onSuccess: (resposta, variaveis) => {
      invalidarLista();
      if (variaveis?.id) {
        queryClient.invalidateQueries({ queryKey: ['carbon', 'documento', variaveis.id] });
      }

      if (variaveis?.modo === 'versao') {
        const numero = Number(resposta?.documento?.versao);
        toast.success(
          Number.isFinite(numero) ? `Versão ${numero} registrada.` : 'Nova versão registrada.',
        );
        /* O painel volta na versão NOVA, e não na antiga: ela é a vigente a partir de
           agora, e reabrir a anterior convidaria a um segundo "nova versão" que o
           servidor recusa com 409 documento_ja_substituido. */
        if (resposta?.documento?.id) setDetalheId(resposta.documento.id);
      } else if (variaveis?.modo === 'criar') {
        toast.success('Documento cadastrado.');
      } else {
        toast.success('Documento atualizado.');
        if (variaveis?.id) setDetalheId(variaveis.id);
      }

      fecharForm();
    },
    onError: (erro) =>
      toast.error(textoDoErro(erro, 'Não foi possível salvar o documento agora.')),
  });

  const enviar = () => {
    let payload;
    try {
      // Validação no cliente antes de gastar requisição. O servidor valida de novo: esta
      // camada é conveniência, não é a barreira.
      payload = montarPayload(form, modoForm);
    } catch (erro) {
      toast.error(erro?.message || 'Revise os campos do formulário.');
      return;
    }
    salvar.mutate({ modo: modoForm, id: documentoBase?.id ?? null, payload });
  };

  const colunas = [
    {
      chave: 'titulo',
      titulo: 'Documento',
      larguraMinima: 260,
      render: (documento) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[#1A2B1F] break-words">
              {documento?.titulo || 'Sem título'}
            </span>
            {documento?.substituido && (
              <Badge tom="neutro" tamanho="sm">
                Substituída
              </Badge>
            )}
          </div>
          {documento?.descricao && (
            <p className="text-[11px] text-[#8A9990] mt-0.5 leading-relaxed line-clamp-2">
              {documento.descricao}
            </p>
          )}
        </div>
      ),
    },
    {
      chave: 'tipo',
      titulo: 'Tipo',
      larguraMinima: 150,
      render: (documento) => <EtiquetaTipo tipo={documento?.tipo} />,
    },
    {
      chave: 'versao',
      titulo: 'Versão',
      numerica: true,
      larguraMinima: 80,
      render: (documento) => <span className="font-mono">v{documento?.versao ?? 1}</span>,
    },
    {
      chave: 'projeto_id',
      titulo: 'Projeto',
      larguraMinima: 170,
      render: (documento) => {
        if (!documento?.projeto_id) {
          return (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[#5C7060]">
              <Building2 size={12} className="flex-shrink-0" />
              Institucional
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-[#1A2B1F]">
            <FolderTree size={12} className="text-[#8A9990] flex-shrink-0" />
            {/* Projeto que não está na lista carregada (arquivado, ou lista ainda em voo)
                mostra o id abreviado em vez de uma célula vazia. */}
            {nomePorProjeto.get(documento.projeto_id) ||
              `Projeto ${String(documento.projeto_id).slice(0, 8)}`}
          </span>
        );
      },
    },
    {
      chave: 'origem',
      titulo: 'Origem',
      larguraMinima: 120,
      render: (documento) => (
        <Badge tom={tomOrigem(documento?.origem)} tamanho="sm">
          {rotuloOrigem(documento?.origem)}
        </Badge>
      ),
    },
    {
      chave: 'data_documento',
      titulo: 'Data',
      larguraMinima: 110,
      render: (documento) => (
        <span className="tabular-nums">{fmtData(documento?.data_documento)}</span>
      ),
    },
    {
      chave: 'arquivo',
      titulo: 'Arquivo',
      larguraMinima: 140,
      render: (documento) => <CelulaArquivo documento={documento} />,
    },
  ];

  const resumo = listaQuery.isLoading
    ? 'Carregando documentos...'
    : listaQuery.isError
      ? 'Não foi possível carregar o acervo agora'
      : total === 0
        ? 'Nenhum documento no recorte atual'
        : `${total} ${total === 1 ? 'documento' : 'documentos'}${
            incluirSubstituidos ? ' (com as versões substituídas)' : ' na versão vigente'
          }`;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <CabecalhoSecao
        titulo="Acervo de documentos"
        descricao={resumo}
        acao={
          <BotaoPrimario icone={Plus} onClick={abrirCriacao}>
            Novo documento
          </BotaoPrimario>
        }
      />

      {/* ===== Filtros ===== */}
      <Cartao classeCorpo="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Campo
          rotulo="Projeto"
          tipo="select"
          opcoes={[
            { valor: '', rotulo: 'Todos os projetos' },
            { valor: 'institucional', rotulo: 'Sem projeto (institucional)' },
            ...projetos.map((projeto) => ({ valor: projeto.id, rotulo: projeto.nome })),
          ]}
          valor={filtroProjeto}
          onChange={setFiltroProjeto}
        />

        <Campo
          rotulo="Tipo"
          tipo="select"
          opcoes={[{ valor: '', rotulo: 'Todos os tipos' }, ...opcoesDe(TIPOS)]}
          valor={filtroTipo}
          onChange={setFiltroTipo}
        />

        <Campo
          rotulo="Origem"
          tipo="select"
          opcoes={[{ valor: '', rotulo: 'Todas as origens' }, ...opcoesDe(ORIGENS)]}
          valor={filtroOrigem}
          onChange={setFiltroOrigem}
        />

        <Campo
          rotulo="Buscar"
          valor={buscaCampo}
          onChange={setBuscaCampo}
          placeholder="Título ou descrição"
          extras={{ maxLength: 120 }}
        />

        <Campo
          rotulo="Incluir versões substituídas no histórico"
          tipo="checkbox"
          valor={incluirSubstituidos}
          onChange={setIncluirSubstituidos}
          dica="Por padrão a lista mostra só a versão vigente de cada família."
          className="sm:col-span-2 lg:col-span-4"
        />
      </Cartao>

      {/* ===== Lista ===== */}
      <Tabela
        legenda="Documentos cadastrados, com tipo, versão, projeto e origem"
        colunas={colunas}
        dados={documentos}
        carregando={listaQuery.isLoading}
        rotuloCarregando="Carregando documentos"
        erro={listaQuery.isError}
        iconeVazio={FileText}
        tituloVazio="Nenhum documento neste recorte"
        textoVazio="Registre aqui PDD, relatório de monitoramento, inventário, arquivo geoespacial, planilha, contrato e ata: um lugar só, com versão explícita e vínculo com o que cada documento comprova."
        acaoVazio={
          <BotaoPrimario icone={Plus} onClick={abrirCriacao}>
            Cadastrar documento
          </BotaoPrimario>
        }
        onLinhaClick={(documento) => setDetalheId(documento?.id ?? null)}
        rotuloLinha={(documento) => `Abrir ${documento?.titulo || 'documento'}`}
        classeLinha={(documento) => (documento?.substituido ? 'opacity-70' : '')}
        rodape={
          totalPaginas > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-[#8A9990]">
                Página {pagina} de {totalPaginas}
              </span>
              <div className="flex items-center gap-2">
                <BotaoSecundario
                  tamanho="sm"
                  icone={ChevronLeft}
                  desabilitado={pagina <= 1}
                  onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
                >
                  Anterior
                </BotaoSecundario>
                <BotaoSecundario
                  tamanho="sm"
                  iconeDireita={ChevronRight}
                  desabilitado={pagina >= totalPaginas}
                  onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
                >
                  Próxima
                </BotaoSecundario>
              </div>
            </div>
          ) : null
        }
      />

      {documentos.length > 0 && (
        <p className="flex items-start gap-2 text-[11px] text-[#8A9990] px-1 leading-relaxed">
          <History size={12} className="flex-shrink-0 mt-0.5" />
          Clique em uma linha para ver o histórico de versões e os vínculos. A lista mostra a
          versão vigente de cada família: a substituída continua guardada e aparece no
          histórico.
        </p>
      )}

      {/* ===== Painel de detalhes ===== */}
      <PainelLateral
        aberto={Boolean(detalheId)}
        onFechar={() => setDetalheId(null)}
        icone={FileText}
        titulo={detalhe?.titulo || 'Documento'}
        subtitulo={
          detalhe
            ? `${rotuloTipo(detalhe.tipo)} · versão ${detalhe.versao} · origem ${rotuloOrigem(detalhe.origem)}`
            : 'Carregando'
        }
        largura="lg"
        rodape={
          detalhe ? (
            <div className="flex items-center justify-end gap-2">
              <BotaoSecundario icone={Pencil} onClick={() => abrirEdicao(detalhe)}>
                Editar
              </BotaoSecundario>
              <BotaoPrimario
                icone={FilePlus2}
                onClick={() => abrirNovaVersao(detalhe)}
                desabilitado={Boolean(detalhe.substituido)}
                titulo={
                  detalhe.substituido
                    ? 'Esta versão já foi substituída: registre a próxima a partir da versão vigente.'
                    : undefined
                }
              >
                Registrar nova versão
              </BotaoPrimario>
            </div>
          ) : null
        }
      >
        {detalheQuery.isLoading ? (
          <Carregando rotulo="Carregando o documento" />
        ) : detalheQuery.isError ? (
          <AvisoDiscreto
            tom="vermelho"
            titulo="Não foi possível abrir o documento."
            texto={textoDoErro(
              detalheQuery.error,
              'Tente novamente. Se o aviso continuar, avise a equipe responsável pelo sistema.',
            )}
          />
        ) : (
          detalhe && (
            <div className="space-y-5">
              {detalhe.substituido && (
                <AvisoDiscreto tom="ambar" titulo="Esta versão foi substituída.">
                  Existe uma versão mais nova nesta família. Use a versão vigente como
                  referência: esta fica guardada para a trilha de auditoria.
                </AvisoDiscreto>
              )}

              <dl className="grid grid-cols-2 gap-3">
                <Info rotulo="Projeto">
                  {detalhe.projeto_id
                    ? nomePorProjeto.get(detalhe.projeto_id) ||
                      `Projeto ${String(detalhe.projeto_id).slice(0, 8)}`
                    : 'Institucional (sem projeto)'}
                </Info>
                <Info rotulo="Data do documento">{fmtData(detalhe.data_documento)}</Info>
                <Info rotulo="Registrado em">{fmtDataHora(detalhe.criado_em)}</Info>
                <Info rotulo="Formato e tamanho">
                  {[detalhe.formato?.toUpperCase(), fmtTamanho(detalhe.tamanho_bytes)]
                    .filter(Boolean)
                    .join(' · ') || 'Não informado'}
                </Info>
                <Info rotulo="Onde está" className="col-span-2">
                  {urlExternaSegura(detalhe.url_externa) ? (
                    <a
                      href={urlExternaSegura(detalhe.url_externa)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A4731] hover:text-[#245E40] break-all"
                    >
                      <ExternalLink size={12} className="flex-shrink-0" />
                      {detalhe.url_externa}
                    </a>
                  ) : detalhe.caminho_storage ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#5C7060] break-all">
                      <HardDrive size={12} className="flex-shrink-0" />
                      {detalhe.caminho_storage}
                    </span>
                  ) : (
                    'Não informado'
                  )}
                </Info>
              </dl>

              {detalhe.descricao && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
                    Descrição
                  </p>
                  <p className="text-xs text-[#1A2B1F] mt-1 leading-relaxed whitespace-pre-line">
                    {detalhe.descricao}
                  </p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
                  Histórico de versões ({familia.length})
                </p>
                {familia.length <= 1 ? (
                  <p className="text-[11px] text-[#8A9990] mt-1 leading-relaxed">
                    Versão única até agora. Ao registrar a próxima, esta continua guardada e a
                    nova passa a ser a vigente.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#F4F6F4] mt-1">
                    {familia.map((versao) => (
                      <LinhaVersao key={versao.id} versao={versao} atualId={detalhe.id} />
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
                  Vínculos ({vinculos.length})
                </p>
                <div className="mt-1">
                  <Vinculos vinculos={vinculos} />
                </div>
              </div>
            </div>
          )
        )}
      </PainelLateral>

      {/* ===== Painel do formulário ===== */}
      <PainelLateral
        aberto={Boolean(modoForm)}
        onFechar={fecharForm}
        icone={modoForm === 'versao' ? FilePlus2 : FileText}
        titulo={
          modoForm === 'criar'
            ? 'Novo documento'
            : modoForm === 'versao'
              ? 'Registrar nova versão'
              : 'Editar documento'
        }
        subtitulo="Título e URL são obrigatórios. O resto pode ser completado depois."
        largura="lg"
        // Formulário com conteúdo digitado não pode ser descartado por um clique
        // distraído fora do painel.
        fecharAoClicarFora={false}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario variante="fantasma" onClick={fecharForm}>
              Cancelar
            </BotaoSecundario>
            {/* onClick e não type="submit": o rodapé do PainelLateral fica FORA do
                formulário (é o contrato da primitiva). */}
            <BotaoPrimario onClick={enviar} carregando={salvar.isPending}>
              {modoForm === 'criar'
                ? 'Cadastrar documento'
                : modoForm === 'versao'
                  ? 'Registrar versão'
                  : 'Salvar alterações'}
            </BotaoPrimario>
          </div>
        }
      >
        <FormularioDocumento
          form={form}
          setForm={setForm}
          modo={modoForm}
          projetos={projetos}
          documentoBase={documentoBase}
        />
      </PainelLateral>
    </div>
  );
}

/** Par rótulo/valor do painel de detalhes. */
function Info({ rotulo, children, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
        {rotulo}
      </dt>
      <dd className="text-xs text-[#1A2B1F] mt-0.5 leading-relaxed break-words">{children}</dd>
    </div>
  );
}

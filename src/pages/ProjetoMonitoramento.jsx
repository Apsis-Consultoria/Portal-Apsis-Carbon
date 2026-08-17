/**
 * ProjetoMonitoramento - capítulos do relatório de monitoramento de um projeto (issue #3).
 *
 * O relatório de monitoramento (Monitoring Report) comprova IMPACTO REALIZADO, e por isso
 * tem estrutura de capítulos própria, diferente do PDD: capítulos raiz 1 a 5, subcapítulos
 * direto em terceiro nível (4.1.1, 5.4.1) e nenhum subcapítulo em 1 Summary, 2 Project
 * Details e 3 Climate. A numeração é a do documento submetido e aparece igual na tela.
 *
 * O QUE ESTA TELA TEM DE PRÓPRIO, e é o ponto central da issue: o status de um capítulo é
 * um PAR (estado, rodada). O fluxo observado no Notion não é "rascunho -> pronto", é um
 * ciclo com número de volta - o status registrado lá era literalmente "Revisão 2", na
 * maioria dos subcapítulos. Então aqui o selo lê "Em revisão (rodada 2)", o cabeçalho
 * mostra em que volta o relatório está e existe uma ação explícita para devolver um
 * capítulo à revisão, que incrementa a volta no banco.
 *
 * Duas regras que a tela exibe mas NÃO calcula:
 *   - capítulo 'não aplicável' sai do DENOMINADOR do progresso (senão o relatório nunca
 *     fecha 100%, porque há capítulo que simplesmente não se aplica ao projeto);
 *   - a rodada do relatório é a maior rodada entre os capítulos que contam.
 * Quem calcula é o servidor (função SQL carbon_mr_progresso). A tela só exibe e deixa as
 * regras ditas em texto para quem revisa.
 *
 * O desenho segue src/pages/ProjetoPdd.jsx de propósito: é a mesma natureza de tela, e a
 * consistência entre as duas vale mais do que originalidade. A diferença de implementação
 * é que aqui as primitivas de src/components/ui/ fazem o trabalho visual.
 */

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, ChevronDown, ChevronRight, ClipboardList, FolderTree, Info, ListTree,
  MessageSquare, Pencil, RotateCcw, Sparkles, User, WifiOff,
} from 'lucide-react';

import {
  obterMonitoramento,
  criarMonitoramentoDoTemplate,
  atualizarCapituloMonitoramento,
  avancarRodadaCapitulo,
} from '@/lib/api/monitoramento';
import { obterProjeto } from '@/lib/api/projetos';
import { MODO_DEMO } from '@/lib/runtimeConfig';
import { createPageUrl } from '@/utils';
import { urlPdd } from '@/lib/pageRoutes';

import Cartao from '@/components/ui/Cartao';
import Badge from '@/components/ui/Badge';
import BarraProgresso, { pctSeguro } from '@/components/ui/BarraProgresso';
import SeletorStatus from '@/components/ui/SeletorStatus';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import EstadoVazio from '@/components/ui/EstadoVazio';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import Campo from '@/components/ui/Campo';
import Carregando from '@/components/ui/Carregando';

/* ===== Domínio ============================================================
   Espelha o CHECK de carbon_mr_capitulos.estado. A ordem é a ordem das opções no
   seletor, do mais cru ao mais fechado, com 'não aplicável' no fim porque é decisão de
   escopo, não etapa de trabalho.                                             */
const ESTADOS = [
  { valor: 'nao_iniciado', rotulo: 'Não iniciado', tom: 'neutro' },
  { valor: 'em_andamento', rotulo: 'Em andamento', tom: 'azul' },
  { valor: 'em_revisao', rotulo: 'Em revisão', tom: 'ambar' },
  { valor: 'concluido', rotulo: 'Concluído', tom: 'verde' },
  { valor: 'nao_aplicavel', rotulo: 'Não aplicável', tom: 'neutro' },
];

const MAPA_ESTADO = Object.fromEntries(ESTADOS.map((e) => [e.valor, e]));

/** Mesmo limite do check carbon_mr_capitulos_rodada_chk e da validação na Edge Function. */
const RODADA_MAXIMA = 99;

/** Mesmo objeto que a API devolve para projeto sem relatório. Nunca undefined na tela. */
const PROGRESSO_VAZIO = {
  total: 0,
  concluidos: 0,
  nao_aplicaveis: 0,
  pct: 0,
  rodada_maxima: 1,
  por_estado: {
    nao_iniciado: 0,
    em_andamento: 0,
    em_revisao: 0,
    concluido: 0,
    nao_aplicavel: 0,
  },
  por_rodada: [],
  por_capitulo: [],
};

/** Rodada como inteiro >= 1. Dado torto nunca vira NaN na tela. */
function rodadaDe(capitulo) {
  const n = Number(capitulo?.rodada);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/**
 * Percentual em pt-BR: separador decimal é vírgula.
 *
 * A função SQL devolve o percentual com UMA casa (26.7), e interpolar esse número cru
 * imprimiria "26.7%" numa interface em português - o mesmo cuidado que Projetos.jsx já
 * toma com área e divergência. maximumFractionDigits sem minimum evita "100,0%".
 *
 * Por isso a barra de progresso desta tela não usa `mostrarValor` da primitiva (que
 * imprime o número cru): o texto ao lado da barra passa pelo `detalhe`, que é nosso.
 */
function fmtPct(valor) {
  return pctSeguro(valor).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/** Concordância de número, para não sair "1 capítulos" em lugar nenhum. */
function capitulosTexto(quantidade) {
  return `${quantidade} ${quantidade === 1 ? 'capítulo' : 'capítulos'}`;
}

/**
 * Rótulo do status, que é o par (estado, rodada).
 *
 * A volta só aparece a partir da segunda: escrever "(rodada 1)" em todo capítulo de um
 * relatório que nunca voltou seria ruído, e é justamente a segunda volta que o
 * levantamento aponta como o dado que o sistema precisa mostrar.
 *
 * Capítulo não aplicável nunca mostra rodada: ele está fora do ciclo de revisão.
 */
function rotuloEstado(estado, rodada) {
  const base = MAPA_ESTADO[estado]?.rotulo || estado || 'Sem estado';
  if (estado === 'nao_aplicavel' || rodada <= 1) return base;
  return `${base} (rodada ${rodada})`;
}

/* ===== Blocos de interface ================================================ */

function SeloEstado({ capitulo, className = '' }) {
  const estado = capitulo?.estado;
  const rodada = rodadaDe(capitulo);
  return (
    <Badge tom={MAPA_ESTADO[estado]?.tom || 'neutro'} tamanho="sm" className={className}>
      {rotuloEstado(estado, rodada)}
    </Badge>
  );
}

/**
 * Responsável do capítulo, somente leitura.
 *
 * ATRIBUIR ainda não é possível: responsavel_id é FK para carbon_usuarios e não existe
 * endpoint que liste os colaboradores. Um campo de UUID solto seria pior do que não ter
 * campo. Mesma limitação da tela de PDD; fica para a issue de equipe por projeto.
 */
function Responsavel({ capitulo }) {
  const nome =
    capitulo?.responsavel_nome ||
    capitulo?.responsavel_email ||
    (capitulo?.responsavel_id ? 'Atribuído' : null);
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#8A9990] whitespace-nowrap">
      <User size={12} className="flex-shrink-0" aria-hidden="true" />
      {nome || 'Sem responsável'}
    </span>
  );
}

/**
 * Editor do capítulo: rodada, orientação e observações.
 *
 * POR QUE UM BOTÃO SALVAR, e não salvamento no blur como faz o campo de observações do
 * PDD: aqui são três campos, e um deles é numérico com faixa válida. Salvar no blur
 * mandaria até três PATCH por edição e, no campo de rodada, gravaria o valor intermediário
 * de quem apaga o número antes de digitar o novo. Envia só os campos que mudaram; se nada
 * mudou, apenas fecha (sem gastar uma requisição que voltaria 'nada_para_atualizar').
 *
 * A rodada aqui é para CORRIGIR uma volta errada. Para AVANCAR existe o botão de nova
 * rodada, que incrementa no banco.
 */
function EditorCapitulo({ capitulo, salvando, onSalvar, onFechar }) {
  const [rodada, setRodada] = useState(String(rodadaDe(capitulo)));
  const [orientacao, setOrientacao] = useState(capitulo?.orientacao ?? '');
  const [observacoes, setObservacoes] = useState(capitulo?.observacoes ?? '');
  const [erroRodada, setErroRodada] = useState('');

  const salvar = () => {
    const dados = {};

    const n = Number(rodada);
    if (!Number.isInteger(n) || n < 1 || n > RODADA_MAXIMA) {
      setErroRodada(`Informe um número inteiro entre 1 e ${RODADA_MAXIMA}.`);
      return;
    }
    setErroRodada('');
    if (n !== rodadaDe(capitulo)) dados.rodada = n;

    const orientacaoLimpa = orientacao.trim();
    if (orientacaoLimpa !== String(capitulo?.orientacao ?? '').trim()) {
      dados.orientacao = orientacaoLimpa;
    }

    const observacoesLimpas = observacoes.trim();
    if (observacoesLimpas !== String(capitulo?.observacoes ?? '').trim()) {
      dados.observacoes = observacoesLimpas;
    }

    if (Object.keys(dados).length === 0) {
      onFechar();
      return;
    }

    onSalvar(dados);
    onFechar();
  };

  return (
    <div className="mt-3 p-3 rounded-xl bg-[#F4F6F4] border border-[#DDE3DE] space-y-3">
      <Campo
        rotulo="Rodada de revisão"
        tipo="numero"
        valor={rodada}
        onChange={(v) => setRodada(v)}
        erro={erroRodada}
        dica="Use para corrigir a volta. Para devolver o capítulo à revisão, use o botão de nova rodada."
        desabilitado={salvando}
        extras={{ min: 1, max: RODADA_MAXIMA, step: 1 }}
        className="sm:max-w-[220px]"
      />

      <Campo
        rotulo="Orientação ao redator"
        tipo="textarea"
        linhas={3}
        valor={orientacao}
        onChange={(v) => setOrientacao(v)}
        placeholder="O que quem escreve este capítulo precisa saber antes de começar"
        dica="Instrução de quem coordena o relatório. Não é o conteúdo do capítulo."
        desabilitado={salvando}
      />

      <Campo
        rotulo="Observações internas"
        tipo="textarea"
        linhas={2}
        valor={observacoes}
        onChange={(v) => setObservacoes(v)}
        placeholder="Anotação de andamento"
        desabilitado={salvando}
      />

      <div className="flex items-center justify-end gap-2">
        <BotaoSecundario variante="fantasma" tamanho="sm" onClick={onFechar}>
          Cancelar
        </BotaoSecundario>
        <BotaoPrimario tamanho="sm" onClick={salvar} carregando={salvando}>
          Salvar capítulo
        </BotaoPrimario>
      </div>
    </div>
  );
}

/** Orientação sempre visível: é o que a pessoa precisa ler ANTES de escrever. */
function BlocoOrientacao({ texto }) {
  if (!texto) return null;
  return (
    <AvisoDiscreto
      tom="azul"
      icone={Info}
      titulo="Orientação ao redator"
      texto={texto}
      className="mt-2"
    />
  );
}

/** Controles de status do capítulo: estado, nova rodada e edição. Reusado na raiz. */
function ControlesCapitulo({ capitulo, salvando, onAlterar, onNovaRodada, onEditar, editando }) {
  const naoAplicavel = capitulo?.estado === 'nao_aplicavel';

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <SeletorStatus
        valor={capitulo?.estado}
        opcoes={ESTADOS}
        onChange={(estado) => onAlterar(capitulo?.id, { estado })}
        carregando={salvando}
        rotuloAcessivel={`Estado do capítulo ${capitulo?.capitulo}`}
        tamanho="sm"
      />
      <BotaoSecundario
        icone={RotateCcw}
        tamanho="sm"
        onClick={() => onNovaRodada(capitulo)}
        desabilitado={salvando || naoAplicavel}
        rotuloAcessivel={`Abrir nova rodada de revisão do capítulo ${capitulo?.capitulo}`}
        titulo={
          naoAplicavel
            ? 'Capítulo não aplicável está fora do ciclo de revisão'
            : `Devolver à revisão: passa para a rodada ${rodadaDe(capitulo) + 1}`
        }
      />
      <BotaoSecundario
        icone={Pencil}
        tamanho="sm"
        variante="fantasma"
        onClick={onEditar}
        desabilitado={salvando}
        rotuloAcessivel={`${editando ? 'Fechar edição do' : 'Editar'} capítulo ${capitulo?.capitulo}`}
      />
    </div>
  );
}

/** Linha de subcapítulo. O recuo é por nível, para a hierarquia ser legível. */
function LinhaCapitulo({ capitulo, salvando, onAlterar, onNovaRodada }) {
  const [editando, setEditando] = useState(false);
  const naoAplicavel = capitulo?.estado === 'nao_aplicavel';
  const recuo = Number(capitulo?.nivel) >= 3 ? 'pl-10 sm:pl-14' : 'pl-3 sm:pl-5';

  return (
    <div
      className={`flex flex-col lg:flex-row lg:items-start gap-2 lg:gap-3 py-3 pr-3 ${recuo} ${naoAplicavel ? 'opacity-60' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="font-mono text-[11px] font-bold text-[#8A9990] mt-0.5 tabular-nums">
            {capitulo?.capitulo}
          </span>
          <span className="text-xs text-[#1A2B1F] leading-snug break-words">{capitulo?.nome}</span>
          <SeloEstado capitulo={capitulo} />
        </div>

        {naoAplicavel && (
          <p className="text-[11px] text-[#8A9990] mt-1">
            Marcado como não aplicável: não entra no cálculo de progresso nem no ciclo de revisão.
          </p>
        )}

        <BlocoOrientacao texto={capitulo?.orientacao} />

        {capitulo?.observacoes ? (
          <p className="text-[11px] text-[#5C7060] leading-relaxed italic mt-1.5">
            {capitulo.observacoes}
          </p>
        ) : (
          !editando && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-[#8A9990] hover:text-[#1A4731] transition-colors"
            >
              <MessageSquare size={11} aria-hidden="true" />
              Anotar ou orientar
            </button>
          )
        )}

        {editando && (
          <EditorCapitulo
            capitulo={capitulo}
            salvando={salvando}
            onSalvar={(dados) => onAlterar(capitulo?.id, dados)}
            onFechar={() => setEditando(false)}
          />
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <Responsavel capitulo={capitulo} />
        <ControlesCapitulo
          capitulo={capitulo}
          salvando={salvando}
          onAlterar={onAlterar}
          onNovaRodada={onNovaRodada}
          onEditar={() => setEditando((v) => !v)}
          editando={editando}
        />
      </div>
    </div>
  );
}

/**
 * Um capítulo raiz e seus subcapítulos, com progresso e rodada próprios.
 *
 * O cabeçalho do grupo é montado aqui, dentro do Cartao com o corpo sem padding, porque a
 * linha precisa de coisas que o cabeçalho da primitiva não prevê: botão de recolher,
 * numeração monoespaçada, barra de progresso e os controles do próprio capítulo raiz (ele
 * também tem estado, rodada e orientação, e conta no progresso).
 */
function GrupoCapitulo({ grupo, progresso, salvandoId, onAlterar, onNovaRodada }) {
  const [aberto, setAberto] = useState(true);
  const [editandoRaiz, setEditandoRaiz] = useState(false);
  const raiz = grupo.raiz;
  const naoAplicavel = raiz?.estado === 'nao_aplicavel';
  const rodadaGrupo = Number(progresso?.rodada_maxima) || 1;

  return (
    <Cartao semPaddingCorpo>
      <div className="px-4 py-4 border-b border-[#F4F6F4]">
        <div className="flex flex-col lg:flex-row lg:items-start gap-3">
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="w-7 h-7 rounded-lg hover:bg-[#F4F6F4] flex items-center justify-center flex-shrink-0 mt-0.5"
            aria-label={aberto ? `Recolher capítulo ${grupo.cap}` : `Expandir capítulo ${grupo.cap}`}
            aria-expanded={aberto}
          >
            {aberto ? (
              <ChevronDown size={15} className="text-[#5C7060]" aria-hidden="true" />
            ) : (
              <ChevronRight size={15} className="text-[#5C7060]" aria-hidden="true" />
            )}
          </button>

          <div className={`flex-1 min-w-0 ${naoAplicavel ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-[#F47920] mt-0.5 tabular-nums">
                {raiz?.capitulo ?? grupo.cap}
              </span>
              <h2 className="text-sm font-bold text-[#1A2B1F] leading-snug break-words">
                {raiz?.nome || `Capítulo ${grupo.cap}`}
              </h2>
              {raiz && <SeloEstado capitulo={raiz} />}
              {rodadaGrupo > 1 && (
                <Badge tom="laranja" tamanho="sm" icone={RotateCcw}>
                  Rodada {rodadaGrupo}
                </Badge>
              )}
            </div>

            <BarraProgresso
              valor={progresso?.pct}
              detalhe={
                progresso
                  ? `${progresso.concluidos}/${progresso.total} concluídos · ${fmtPct(progresso.pct)}%`
                  : 'Sem itens na conta'
              }
              rotuloAcessivel={`Progresso do capítulo ${grupo.cap}`}
              className="mt-2 max-w-md"
            />

            {raiz && <BlocoOrientacao texto={raiz.orientacao} />}

            {raiz?.observacoes && (
              <p className="text-[11px] text-[#5C7060] leading-relaxed italic mt-1.5">
                {raiz.observacoes}
              </p>
            )}

            {raiz && editandoRaiz && (
              <EditorCapitulo
                capitulo={raiz}
                salvando={salvandoId === raiz.id}
                onSalvar={(dados) => onAlterar(raiz.id, dados)}
                onFechar={() => setEditandoRaiz(false)}
              />
            )}
          </div>

          {raiz && (
            <ControlesCapitulo
              capitulo={raiz}
              salvando={salvandoId === raiz.id}
              onAlterar={onAlterar}
              onNovaRodada={onNovaRodada}
              onEditar={() => setEditandoRaiz((v) => !v)}
              editando={editandoRaiz}
            />
          )}
        </div>
      </div>

      {aberto && (
        <div className="divide-y divide-[#F4F6F4]">
          {grupo.itens.map((capitulo) => (
            <LinhaCapitulo
              key={capitulo.id}
              capitulo={capitulo}
              salvando={salvandoId === capitulo.id}
              onAlterar={onAlterar}
              onNovaRodada={onNovaRodada}
            />
          ))}
          {grupo.itens.length === 0 && (
            <p className="px-5 py-4 text-[11px] text-[#8A9990]">
              Este capítulo não tem subcapítulos na estrutura do padrão: é redigido como um bloco
              único.
            </p>
          )}
        </div>
      )}
    </Cartao>
  );
}

function RelatorioVazio({ standard, criando, onCriar }) {
  return (
    <Cartao>
      <EstadoVazio
        icone={ClipboardList}
        titulo="Este projeto ainda não tem relatório de monitoramento"
        texto="A estrutura de capítulos é padrão da metodologia, então não precisa ser digitada: crie o relatório a partir do template e o projeto já nasce com todos os capítulos, na numeração da submissão, cada um na rodada 1."
        acao={
          <BotaoPrimario icone={Sparkles} onClick={onCriar} carregando={criando}>
            Criar relatório a partir do template {standard || 'VCS+CCB'}
          </BotaoPrimario>
        }
      />
    </Cartao>
  );
}

function TelaAviso({ titulo, texto }) {
  return (
    <Cartao>
      <EstadoVazio
        icone={WifiOff}
        titulo={titulo}
        texto={texto}
        acao={
          <BotaoSecundario como="link" para={createPageUrl('Projetos')} icone={ArrowLeft}>
            Voltar para Projetos
          </BotaoSecundario>
        }
      />
    </Cartao>
  );
}

/* ===== Página ============================================================= */

export default function ProjetoMonitoramento() {
  const { id: projetoId } = useParams();
  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const autenticado = (accounts?.length ?? 0) > 0;
  const queryClient = useQueryClient();

  // Guarda qual capítulo está sendo salvo, para o spinner ficar na linha certa em vez de
  // bloquear a tela inteira a cada mudança de estado.
  const [salvandoId, setSalvandoId] = useState(null);

  /* Em modo demonstração não existe conta no MSAL (o login fica desabilitado) e as funções
     da API não usam token, então `autenticado` não pode ser exigido: a tela ficaria vazia
     no único modo em que ela é revisável sem Supabase. */
  const habilitado = (MODO_DEMO || autenticado) && Boolean(projetoId);

  const projetoQuery = useQuery({
    queryKey: ['carbon', 'projeto', projetoId],
    queryFn: async () => {
      const resposta = await obterProjeto(msal, projetoId);
      return resposta?.projeto ?? null;
    },
    enabled: habilitado,
  });

  const relatorioQuery = useQuery({
    queryKey: ['carbon', 'monitoramento', projetoId],
    queryFn: async () => {
      const resposta = await obterMonitoramento(msal, projetoId);
      return {
        capitulos: Array.isArray(resposta?.capitulos) ? resposta.capitulos : [],
        progresso: resposta?.progresso ?? PROGRESSO_VAZIO,
      };
    },
    enabled: habilitado,
  });

  const projeto = projetoQuery.data ?? null;
  const capitulos = relatorioQuery.data?.capitulos ?? [];
  const progresso = relatorioQuery.data?.progresso ?? PROGRESSO_VAZIO;
  const porEstado = progresso?.por_estado ?? PROGRESSO_VAZIO.por_estado;
  const porRodada = Array.isArray(progresso?.por_rodada) ? progresso.por_rodada : [];
  const rodadaRelatorio = Number(progresso?.rodada_maxima) || 1;

  /**
   * Agrupa por capítulo raiz (coluna `cap`). A raiz é o capítulo de nível 1 e vira o
   * cabeçalho do grupo, com controles próprios - ela também conta no progresso. A ordem
   * dentro do grupo é a coluna `ordem`, que reflete a ordem de leitura do relatório; não
   * reordenamos no cliente para não divergir do documento submetido.
   */
  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const capitulo of capitulos) {
      const cap = Number(capitulo?.cap) || 0;
      if (!mapa.has(cap)) mapa.set(cap, { cap, raiz: null, itens: [] });
      const grupo = mapa.get(cap);
      if (Number(capitulo?.nivel) === 1 && !grupo.raiz) grupo.raiz = capitulo;
      else grupo.itens.push(capitulo);
    }
    return [...mapa.values()].sort((a, b) => a.cap - b.cap);
  }, [capitulos]);

  const progressoPorCap = useMemo(() => {
    const mapa = new Map();
    for (const item of progresso?.por_capitulo ?? []) mapa.set(Number(item?.cap), item);
    return mapa;
  }, [progresso]);

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ['carbon', 'monitoramento', projetoId] });

  const criar = useMutation({
    mutationFn: async () => criarMonitoramentoDoTemplate(msal, projetoId),
    /**
     * `criados = 0` tem DOIS significados, e confundi-los mostraria um toast verde para
     * uma operação que não fez nada: a função SQL filtra o template pelo standard do
     * projeto, então standard sem template semeado insere zero linhas exatamente como o
     * relatório que já estava completo. A lista que volta na resposta separa os dois casos
     * - vazia significa que não havia template. Mesmo tratamento da tela de PDD.
     */
    onSuccess: (resposta) => {
      invalidar();
      const criados = Number(resposta?.criados) || 0;
      const total = Array.isArray(resposta?.capitulos) ? resposta.capitulos.length : 0;

      if (criados > 0) {
        toast.success(
          `Relatório criado com ${criados} ${criados === 1 ? 'capítulo' : 'capítulos'}.`,
        );
        return;
      }
      if (total === 0) {
        toast.error(
          `Não há template de relatório de monitoramento cadastrado para o padrão ${projeto?.standard || 'deste projeto'}. Avise a equipe responsável pelo sistema para carregar a estrutura de capítulos.`,
        );
        return;
      }
      toast.success('O relatório já estava criado: nenhum capítulo novo foi necessário.');
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível criar o relatório agora.'),
  });

  const alterar = useMutation({
    mutationFn: async ({ id, dados }) => atualizarCapituloMonitoramento(msal, id, dados),
    onMutate: ({ id }) => setSalvandoId(id),
    onSuccess: () => invalidar(),
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar o capítulo.'),
    onSettled: () => setSalvandoId(null),
  });

  const novaRodada = useMutation({
    mutationFn: async ({ id }) => avancarRodadaCapitulo(msal, id),
    onMutate: ({ id }) => setSalvandoId(id),
    /* A rodada nova vem do servidor, e não de uma soma feita aqui: é o número que ficou
       gravado, mesmo que outra pessoa tenha devolvido o capítulo ao mesmo tempo. */
    onSuccess: (resposta, variaveis) => {
      invalidar();
      const rodada = Number(resposta?.rodada) || Number(resposta?.capitulo?.rodada) || null;
      const alvo = variaveis?.numero ? `Capítulo ${variaveis.numero}` : 'Capítulo';
      toast.success(
        rodada
          ? `${alvo} devolvido à revisão: agora está na rodada ${rodada}.`
          : `${alvo} devolvido à revisão.`,
      );
    },
    onError: (erro) =>
      toast.error(erro?.message || 'Não foi possível abrir uma nova rodada de revisão.'),
    onSettled: () => setSalvandoId(null),
  });

  const aoAlterarCapitulo = (id, dados) => {
    if (!id) return;
    alterar.mutate({ id, dados });
  };

  const aoAbrirNovaRodada = (capitulo) => {
    if (!capitulo?.id) return;
    novaRodada.mutate({ id: capitulo.id, numero: capitulo.capitulo });
  };

  /* ===== Estados de exceção, antes do conteúdo ===== */

  if (!projetoId) {
    return (
      <TelaAviso
        titulo="Projeto não informado"
        texto="A URL do relatório de monitoramento precisa incluir o identificador do projeto."
      />
    );
  }

  const codigoErro = projetoQuery.error?.codigo || relatorioQuery.error?.codigo || null;
  if (codigoErro === 'nao_encontrado' || codigoErro === 'id_invalido') {
    return (
      <TelaAviso
        titulo="Projeto não encontrado"
        texto="O projeto pode ter sido removido, ou o endereço está incorreto."
      />
    );
  }

  const carregando = projetoQuery.isLoading || relatorioQuery.isLoading;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Volta explícita e atalho para a tela irmã: o item do menu fica aceso em
          "Projetos", mas o caminho de volta precisa existir aqui, e quem acompanha o
          relatório costuma precisar do PDD do mesmo projeto ao lado. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          to={createPageUrl('Projetos')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C7060] hover:text-[#1A4731] transition-colors"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          Projetos
        </Link>
        <BotaoSecundario como="link" para={urlPdd(projetoId)} icone={ListTree} tamanho="sm">
          Ver o PDD deste projeto
        </BotaoSecundario>
      </div>

      {/* ===== Cabeçalho com progresso total e a rodada do relatório ===== */}
      <Cartao>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FolderTree size={15} className="text-[#1A4731] flex-shrink-0" aria-hidden="true" />
              <h2 className="text-sm font-bold text-[#1A2B1F] break-words">
                {projeto?.nome || (carregando ? 'Carregando projeto...' : 'Projeto sem nome')}
              </h2>
            </div>
            <p className="text-xs text-[#5C7060] mt-1">
              Relatório de monitoramento no padrão {projeto?.standard || 'VCS+CCB'}
              {projeto?.proponente ? ` · ${projeto.proponente}` : ''}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-[#1A2B1F] tabular-nums">{fmtPct(progresso.pct)}%</p>
            <p className="text-[11px] text-[#5C7060]">
              {progresso.concluidos} de {capitulosTexto(progresso.total)}
            </p>
          </div>
        </div>

        <BarraProgresso
          valor={progresso.pct}
          alta
          rotuloAcessivel="Progresso do relatório de monitoramento"
          className="mt-4"
        />

        {/* A rodada é a informação que esta tela existe para mostrar: o relatório não vai
            de rascunho a pronto, ele dá voltas. */}
        {progresso.total > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-4">
            <Badge tom="laranja" icone={RotateCcw}>
              Rodada {rodadaRelatorio}
            </Badge>
            {porEstado.em_revisao > 0 && (
              <Badge tom="ambar">
                {porEstado.em_revisao} em revisão
              </Badge>
            )}
            {porEstado.em_andamento > 0 && (
              <Badge tom="azul">{porEstado.em_andamento} em andamento</Badge>
            )}
            {porEstado.concluido > 0 && <Badge tom="verde">{porEstado.concluido} concluídos</Badge>}
            {porEstado.nao_iniciado > 0 && (
              <Badge tom="neutro">{porEstado.nao_iniciado} não iniciados</Badge>
            )}
          </div>
        )}

        {/* Distribuição das voltas. É o dado que o levantamento do Notion descreve: a
            maioria dos subcapítulos estava na segunda rodada. Sem isso a tela mostraria a
            rodada máxima sem dizer quantos capítulos já chegaram nela. */}
        {porRodada.length > 1 && (
          <p className="text-[11px] text-[#8A9990] mt-2">
            Voltas de revisão:{' '}
            {porRodada
              .map((item) => `rodada ${item.rodada} com ${capitulosTexto(item.total)}`)
              .join(' · ')}
            .
          </p>
        )}

        {/* A regra do denominador precisa estar dita na tela: quem revisa tem de saber por
            que o total é menor que a quantidade de linhas. */}
        {progresso.nao_aplicaveis > 0 && (
          <p className="text-[11px] text-[#8A9990] mt-2">
            {progresso.nao_aplicaveis}{' '}
            {progresso.nao_aplicaveis === 1
              ? 'capítulo marcado como não aplicável está fora'
              : 'capítulos marcados como não aplicáveis estão fora'}{' '}
            do cálculo, por isso o total considerado é {progresso.total} e não{' '}
            {progresso.total + progresso.nao_aplicaveis}.
          </p>
        )}
      </Cartao>

      {/* ===== Corpo ===== */}
      {carregando ? (
        <Cartao>
          <Carregando rotulo="Carregando capítulos do relatório de monitoramento" />
        </Cartao>
      ) : relatorioQuery.isError ? (
        <TelaAviso
          titulo="Não foi possível carregar o relatório"
          texto="Houve uma falha ao buscar os capítulos. Se o aviso continuar, avise a equipe responsável pelo sistema."
        />
      ) : capitulos.length === 0 ? (
        <RelatorioVazio
          standard={projeto?.standard}
          criando={criar.isPending}
          onCriar={() => criar.mutate()}
        />
      ) : (
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <GrupoCapitulo
              key={grupo.cap}
              grupo={grupo}
              progresso={progressoPorCap.get(grupo.cap)}
              salvandoId={salvandoId}
              onAlterar={aoAlterarCapitulo}
              onNovaRodada={aoAbrirNovaRodada}
            />
          ))}
        </div>
      )}
    </div>
  );
}

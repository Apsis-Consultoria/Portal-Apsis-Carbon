/**
 * ProjetoPdd - árvore de capítulos do PDD de um projeto (issue #2).
 *
 * O PDD (Project Design Document) do padrão VCS + CCB tem hierarquia de até três níveis
 * e numeração significativa ('1', '1.1', '2.2.1'), que precisa aparecer igual ao
 * documento submetido ao registro. A tela rastreia status, responsável e observações por
 * capítulo, e mostra progresso por capítulo raiz e total.
 *
 * REGRA CENTRAL: capítulo com status 'não aplicável' sai do DENOMINADOR do progresso.
 * Os três "Optional Criterion" do padrão (3.4, 4.5 e 5.5) podem simplesmente não se
 * aplicar ao projeto; sem tirá-los da conta, o PDD nunca fecharia 100%. Quem calcula é o
 * servidor (função SQL carbon_pdd_progresso) - a tela apenas exibe e deixa a regra
 * explícita para quem lê.
 */

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, WifiOff, ListTree, ChevronDown, ChevronRight,
  User, MessageSquare, Sparkles, FolderTree,
} from 'lucide-react';
import { obterProjeto, obterPdd, criarPddDoTemplate, atualizarCapituloPdd } from '@/lib/carbonApi';
import { MODO_DEMO } from '@/lib/runtimeConfig';
import { createPageUrl } from '@/utils';

/* ===== Domínio ============================================================
   Espelha o CHECK de carbon_pdd_capitulos.status. A ordem das chaves é a ordem das
   opções no seletor, do mais cru ao mais fechado, com 'não aplicável' no fim porque
   é decisão de escopo, não etapa de trabalho.                                 */
const STATUS_CAPITULO = {
  nao_iniciado: { label: 'Não iniciado', classe: 'bg-slate-50 text-slate-600 border-slate-200' },
  em_andamento: { label: 'Em andamento', classe: 'bg-sky-50 text-sky-700 border-sky-200' },
  em_revisao: { label: 'Em revisão', classe: 'bg-amber-50 text-amber-700 border-amber-200' },
  concluido: { label: 'Concluído', classe: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  nao_aplicavel: { label: 'Não aplicável', classe: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const PROGRESSO_VAZIO = { total: 0, concluidos: 0, nao_aplicaveis: 0, pct: 0, por_capitulo: [] };

/** Percentual sempre entre 0 e 100, mesmo com dado nulo ou fora de faixa. */
function pctSeguro(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/* ===== Blocos de interface ================================================ */

function Barra({ pct, alta = false }) {
  const valor = pctSeguro(pct);
  const completo = valor >= 100;
  return (
    <div className={`w-full rounded-full bg-[#E8EDE9] overflow-hidden ${alta ? 'h-2.5' : 'h-1.5'}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${completo ? 'bg-emerald-500' : 'bg-[#F47920]'}`}
        style={{ width: `${valor}%` }}
      />
    </div>
  );
}

function SeloOpcional() {
  return (
    <span className="px-2 py-0.5 rounded-full border border-[#DDE3DE] bg-[#F4F6F4] text-[10px] font-semibold uppercase tracking-wider text-[#5C7060] whitespace-nowrap">
      Opcional
    </span>
  );
}

function SeletorStatus({ valor, desabilitado, onChange }) {
  const visual = STATUS_CAPITULO[valor] || STATUS_CAPITULO.nao_iniciado;
  return (
    <select
      value={STATUS_CAPITULO[valor] ? valor : 'nao_iniciado'}
      disabled={desabilitado}
      onChange={(evento) => onChange(evento.target.value)}
      aria-label="Status do capítulo"
      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-wait focus:outline-none focus:ring-2 focus:ring-[#1A4731]/10 ${visual.classe}`}
    >
      {Object.entries(STATUS_CAPITULO).map(([chave, v]) => (
        <option key={chave} value={chave} className="bg-white text-[#1A2B1F]">
          {v.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Responsável do capítulo, somente leitura.
 *
 * ATRIBUIR ainda não é possível aqui: responsavel_id é FK para carbon_usuarios e não
 * existe endpoint que liste os usuários do sistema. Um campo de UUID solto seria pior
 * do que não ter campo. Fica para a issue de permissão/equipe por projeto; até lá a
 * tela mostra o que o backend enviar.
 */
function Responsavel({ capitulo }) {
  const nome =
    capitulo?.responsavel_nome ||
    capitulo?.responsavel_email ||
    (capitulo?.responsavel_id ? 'Atribuído' : null);
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#8A9990] whitespace-nowrap">
      <User size={12} className="flex-shrink-0" />
      {nome || 'Sem responsável'}
    </span>
  );
}

/**
 * Bloco de observações do capítulo.
 *
 * O texto vive em estado local e é salvo no blur, só quando mudou de fato - sem isso,
 * cada tecla dispararia um PATCH. Não há efeito de ressincronização com o servidor de
 * propósito: reescrever o campo durante a digitação apagaria o que a pessoa está
 * escrevendo se outra sessão salvasse ao mesmo tempo.
 */
function Observacoes({ capitulo, desabilitado, onSalvar }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(capitulo?.observacoes ?? '');
  /* O que já foi enviado ao servidor. Comparar com `capitulo.observacoes` não serviria:
     o clique em "Fechar" dispara primeiro o blur (que salva) e só depois o onClick, e
     nesse instante a query ainda não voltou - o mesmo texto seria salvo duas vezes. */
  const [salvo, setSalvo] = useState(capitulo?.observacoes ?? '');

  const salvar = () => {
    const novo = texto.trim();
    if (novo === String(salvo ?? '').trim()) return;
    setSalvo(novo);
    onSalvar({ observacoes: novo });
  };

  if (!aberto) {
    return (
      <div className="mt-1.5">
        {capitulo?.observacoes ? (
          <p className="text-[11px] text-[#5C7060] leading-relaxed italic">
            {capitulo.observacoes}{' '}
            <button
              type="button"
              onClick={() => setAberto(true)}
              className="not-italic font-semibold text-[#F47920] hover:text-[#e06810]"
            >
              editar
            </button>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8A9990] hover:text-[#1A4731] transition-colors"
          >
            <MessageSquare size={11} />
            Anotar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={salvar}
        rows={2}
        disabled={desabilitado}
        placeholder="Observações internas sobre este capítulo"
        className="w-full px-3 py-2 text-xs bg-white border border-[#DDE3DE] rounded-xl text-[#1A2B1F] placeholder:text-[#A8B4AC] focus:outline-none focus:border-[#1A4731] focus:ring-2 focus:ring-[#1A4731]/10 resize-y"
      />
      <button
        type="button"
        onClick={() => {
          salvar();
          setAberto(false);
        }}
        className="mt-1 text-[11px] font-semibold text-[#5C7060] hover:text-[#1A4731] transition-colors"
      >
        Fechar
      </button>
    </div>
  );
}

/**
 * Linha de capítulo de nível 2 ou 3. O recuo é por nível, para a numeração hierárquica
 * ser legível sem depender só do número.
 */
function CapituloLinha({ capitulo, salvando, onAlterar }) {
  const naoAplicavel = capitulo?.status === 'nao_aplicavel';
  const recuo = Number(capitulo?.nivel) >= 3 ? 'pl-10 sm:pl-14' : 'pl-3 sm:pl-5';

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-3 pr-3 ${recuo} ${naoAplicavel ? 'opacity-60' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="font-mono text-[11px] font-bold text-[#8A9990] mt-0.5 tabular-nums">
            {capitulo?.capitulo}
          </span>
          <span className="text-xs text-[#1A2B1F] leading-snug break-words">{capitulo?.nome}</span>
          {capitulo?.opcional && <SeloOpcional />}
        </div>

        {naoAplicavel && (
          <p className="text-[11px] text-[#8A9990] mt-1">
            Marcado como não aplicável: não entra no cálculo de progresso.
          </p>
        )}

        <Observacoes
          capitulo={capitulo}
          desabilitado={salvando}
          onSalvar={(dados) => onAlterar(capitulo?.id, dados)}
        />
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <Responsavel capitulo={capitulo} />
        <div className="flex items-center gap-1.5">
          {salvando && <Loader2 size={12} className="animate-spin text-[#8A9990]" />}
          <SeletorStatus
            valor={capitulo?.status}
            desabilitado={salvando}
            onChange={(status) => onAlterar(capitulo?.id, { status })}
          />
        </div>
      </div>
    </div>
  );
}

/** Um capítulo raiz e seus filhos, com progresso próprio e recolhimento. */
function GrupoCapitulo({ grupo, progresso, salvandoId, onAlterar }) {
  const [aberto, setAberto] = useState(true);
  const raiz = grupo.raiz;
  const naoAplicavel = raiz?.status === 'nao_aplicavel';

  return (
    <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-4 border-b border-[#F4F6F4]">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="w-7 h-7 rounded-lg hover:bg-[#F4F6F4] flex items-center justify-center flex-shrink-0 mt-0.5"
            aria-label={aberto ? 'Recolher capítulo' : 'Expandir capítulo'}
          >
            {aberto ? (
              <ChevronDown size={15} className="text-[#5C7060]" />
            ) : (
              <ChevronRight size={15} className="text-[#5C7060]" />
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
              {raiz?.opcional && <SeloOpcional />}
            </div>

            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 max-w-xs">
                <Barra pct={progresso?.pct} />
              </div>
              <span className="text-[11px] font-semibold text-[#5C7060] whitespace-nowrap">
                {progresso ? `${progresso.concluidos}/${progresso.total} concluídos` : 'Sem itens na conta'}
                {progresso ? ` · ${pctSeguro(progresso.pct)}%` : ''}
              </span>
            </div>

            {raiz && (
              <Observacoes
                capitulo={raiz}
                desabilitado={salvandoId === raiz.id}
                onSalvar={(dados) => onAlterar(raiz.id, dados)}
              />
            )}
          </div>

          {raiz && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {salvandoId === raiz.id && <Loader2 size={12} className="animate-spin text-[#8A9990]" />}
              <SeletorStatus
                valor={raiz.status}
                desabilitado={salvandoId === raiz.id}
                onChange={(status) => onAlterar(raiz.id, { status })}
              />
            </div>
          )}
        </div>
      </div>

      {aberto && (
        <div className="divide-y divide-[#F4F6F4]">
          {grupo.itens.map((capitulo) => (
            <CapituloLinha
              key={capitulo.id}
              capitulo={capitulo}
              salvando={salvandoId === capitulo.id}
              onAlterar={onAlterar}
            />
          ))}
          {grupo.itens.length === 0 && (
            <p className="px-5 py-4 text-[11px] text-[#8A9990]">Este capítulo não tem subcapítulos.</p>
          )}
        </div>
      )}
    </div>
  );
}

function PddVazio({ standard, criando, onCriar }) {
  return (
    <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm px-5 py-14 text-center">
      <div className="w-14 h-14 bg-[#F4F6F4] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <ListTree size={22} className="text-[#8A9990]" />
      </div>
      <p className="text-sm font-semibold text-[#1A2B1F]">Este projeto ainda não tem PDD</p>
      <p className="text-xs text-[#5C7060] mt-1 max-w-md mx-auto leading-relaxed">
        A estrutura de capítulos é padrão da metodologia, então não precisa ser digitada: crie o PDD a
        partir do template e o projeto já nasce com todos os capítulos, na numeração da submissão.
      </p>
      <button
        type="button"
        onClick={onCriar}
        disabled={criando}
        className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl bg-[#F47920] text-xs font-bold text-white hover:bg-[#e06810] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {criando ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        Criar PDD a partir do template {standard || 'VCS+CCB'}
      </button>
    </div>
  );
}

function TelaAviso({ titulo, texto }) {
  return (
    <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm px-5 py-14 text-center">
      <div className="w-14 h-14 bg-[#F4F6F4] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <WifiOff size={22} className="text-[#8A9990]" />
      </div>
      <p className="text-sm font-semibold text-[#1A2B1F]">{titulo}</p>
      <p className="text-xs text-[#5C7060] mt-1 max-w-md mx-auto leading-relaxed">{texto}</p>
      <Link
        to={createPageUrl('Projetos')}
        className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-xl border border-[#DDE3DE] text-xs font-semibold text-[#5C7060] hover:text-[#1A4731] hover:border-[#1A4731]/40 transition-colors"
      >
        <ArrowLeft size={13} />
        Voltar para Projetos
      </Link>
    </div>
  );
}

/* ===== Página ============================================================= */

export default function ProjetoPdd() {
  const { id: projetoId } = useParams();
  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const autenticado = (accounts?.length ?? 0) > 0;
  const queryClient = useQueryClient();

  // Guarda qual capítulo está sendo salvo, para o spinner ficar na linha certa em vez
  // de bloquear a tela inteira a cada mudança de status.
  const [salvandoId, setSalvandoId] = useState(null);

  /* Em modo demonstração não existe conta no MSAL (o login fica desabilitado) e as
     funções do carbonApi não usam token, então `autenticado` não pode ser exigido: a
     tela ficaria vazia no único modo em que ela é revisável sem Supabase. */
  const habilitado = (MODO_DEMO || autenticado) && Boolean(projetoId);

  const projetoQuery = useQuery({
    queryKey: ['carbon', 'projeto', projetoId],
    queryFn: async () => {
      const resposta = await obterProjeto(msal, projetoId);
      return resposta?.projeto ?? null;
    },
    enabled: habilitado,
  });

  const pddQuery = useQuery({
    queryKey: ['carbon', 'pdd', projetoId],
    queryFn: async () => {
      const resposta = await obterPdd(msal, projetoId);
      return {
        capitulos: Array.isArray(resposta?.capitulos) ? resposta.capitulos : [],
        progresso: resposta?.progresso ?? PROGRESSO_VAZIO,
      };
    },
    enabled: habilitado,
  });

  const projeto = projetoQuery.data ?? null;
  const capitulos = pddQuery.data?.capitulos ?? [];
  const progresso = pddQuery.data?.progresso ?? PROGRESSO_VAZIO;

  /**
   * Agrupa por capítulo raiz (coluna `cap`). A raiz é o capítulo de nível 1 e vira o
   * cabeçalho do grupo, com o seletor de status próprio - ela também conta no progresso.
   * A ordem dentro do grupo é a coluna `ordem`, que reflete a ordem de leitura do
   * documento; não reordenamos no cliente para não divergir do PDF submetido.
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

  const criar = useMutation({
    mutationFn: async () => criarPddDoTemplate(msal, projetoId),
    /**
     * `criados = 0` tem DOIS significados, e confundi-los mostrava um toast verde para
     * uma operação que não fez nada: a função SQL filtra o template pelo standard do
     * projeto, então standard sem template semeado insere zero linhas exatamente como o
     * PDD que já estava completo. A lista de capítulos que volta na resposta é o que
     * separa os dois casos - vazia significa que não havia template.
     */
    onSuccess: (resposta) => {
      queryClient.invalidateQueries({ queryKey: ['carbon', 'pdd', projetoId] });
      const criados = Number(resposta?.criados) || 0;
      const total = Array.isArray(resposta?.capitulos) ? resposta.capitulos.length : 0;

      if (criados > 0) {
        toast.success(`PDD criado com ${criados} ${criados === 1 ? 'capítulo' : 'capítulos'}.`);
        return;
      }
      if (total === 0) {
        toast.error(
          `Não há template de PDD cadastrado para o padrão ${projeto?.standard || 'deste projeto'}. Avise a equipe responsável pelo sistema para carregar a estrutura de capítulos.`,
        );
        return;
      }
      toast.success('O PDD já estava criado: nenhum capítulo novo foi necessário.');
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível criar o PDD agora.'),
  });

  const alterar = useMutation({
    mutationFn: async ({ id, dados }) => atualizarCapituloPdd(msal, id, dados),
    onMutate: ({ id }) => setSalvandoId(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['carbon', 'pdd', projetoId] }),
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar o capítulo.'),
    onSettled: () => setSalvandoId(null),
  });

  const aoAlterarCapitulo = (id, dados) => {
    if (!id) return;
    alterar.mutate({ id, dados });
  };

  /* ===== Estados de exceção, antes do conteúdo ===== */

  if (!projetoId) {
    return (
      <TelaAviso
        titulo="Projeto não informado"
        texto="A URL do PDD precisa incluir o identificador do projeto."
      />
    );
  }

  const codigoErro = projetoQuery.error?.codigo || pddQuery.error?.codigo || null;
  if (codigoErro === 'nao_encontrado' || codigoErro === 'id_invalido') {
    return (
      <TelaAviso
        titulo="Projeto não encontrado"
        texto="O projeto pode ter sido removido, ou o endereço está incorreto."
      />
    );
  }

  const carregando = projetoQuery.isLoading || pddQuery.isLoading;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Volta explícita: o item do menu fica aceso em "Projetos", mas o caminho de
          volta precisa existir na própria tela. */}
      <Link
        to={createPageUrl('Projetos')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C7060] hover:text-[#1A4731] transition-colors"
      >
        <ArrowLeft size={13} />
        Projetos
      </Link>

      {/* ===== Cabeçalho com progresso total ===== */}
      <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FolderTree size={15} className="text-[#1A4731] flex-shrink-0" />
              <h2 className="text-sm font-bold text-[#1A2B1F] break-words">
                {projeto?.nome || (carregando ? 'Carregando projeto...' : 'Projeto sem nome')}
              </h2>
            </div>
            <p className="text-xs text-[#5C7060] mt-1">
              PDD no padrão {projeto?.standard || 'VCS+CCB'}
              {projeto?.proponente ? ` · ${projeto.proponente}` : ''}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-[#1A2B1F] tabular-nums">{pctSeguro(progresso.pct)}%</p>
            <p className="text-[11px] text-[#5C7060]">
              {progresso.concluidos} de {progresso.total} capítulos
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Barra pct={progresso.pct} alta />
        </div>

        {/* A regra do denominador precisa estar dita na tela: quem revisa o PDD tem de
            saber por que o total é menor que a quantidade de linhas. */}
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
      </div>

      {/* ===== Corpo ===== */}
      {carregando ? (
        <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm flex items-center justify-center gap-2 px-5 py-14 text-[#8A9990]">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs">Carregando capítulos do PDD</span>
        </div>
      ) : pddQuery.isError ? (
        <TelaAviso
          titulo="Não foi possível carregar o PDD"
          texto="Houve uma falha ao buscar os capítulos. Se o aviso continuar, avise a equipe responsável pelo sistema."
        />
      ) : capitulos.length === 0 ? (
        <PddVazio
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

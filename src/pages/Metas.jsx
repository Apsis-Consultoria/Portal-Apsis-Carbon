/**
 * Metas - metas da equipe por frente de trabalho, com progresso e prazo.
 *
 * DE ONDE VEM O CONTEÚDO. A árvore de objetivos do projeto, hoje descrita em texto:
 * metas organizadas por frente e por organização parceira responsável, com os números
 * LITERALMENTE em placeholder ("instalar XX câmeras", "aumentar a venda em XX%",
 * "rondas de xxx/25 a xxx/25"). A tabela carbon_metas está VAZIA. Esta tela é o lugar
 * onde essas metas passam a existir com número, unidade e prazo.
 *
 * POR QUE A TELA ABRE VAZIA E PRECISA CRIAR. Sem o botão de cadastrar, uma tela sobre
 * uma tabela vazia nasce inútil: mostraria o estado vazio para sempre. O caminho de
 * criar a primeira meta é o caminho principal daqui, não um extra.
 *
 * QUATRO DECISÕES QUE O DOMÍNIO IMPÔS:
 *
 * 1. O NÚMERO NÃO MORA NA FRASE. Descrição, valor alvo e unidade são três campos. Com o
 *    número dentro do texto ninguém soma, ninguém compara com o realizado e ninguém
 *    consulta, que é exatamente o estado de onde as metas vieram.
 *
 * 2. META SEM VALOR ALVO É PENDÊNCIA VISÍVEL, NÃO ERRO. Exigir um número forçaria a
 *    equipe a inventar um. A meta entra sem alvo, é contada no topo (sem_valor_alvo) e
 *    ganha um aviso na linha. Para meta recorrente a tela SUGERE o previsto calculado
 *    ("quinzenal, de maio a setembro" = 10 rondas) e nunca o grava sozinha: o alvo é
 *    decisão de quem toca o projeto.
 *
 * 3. AS SEIS FRENTES APARECEM SEMPRE, inclusive as sem meta nenhuma. Frente vazia
 *    escondida é metade do problema: a lacuna precisa ser vista para ser preenchida.
 *
 * 4. INDICADOR DE META NÃO É INDICADOR DO PLANO DE MONITORAMENTO. As duas coisas moram
 *    na mesma tabela e a coluna `plano` as separa. Esta tela só enxerga os de plano
 *    nulo, porque a rota só devolve esses; misturar faria a tela listar 161 indicadores
 *    de certificação que não têm meta nenhuma. Quem cuida dos outros é
 *    src/pages/ProjetoIndicadores.jsx.
 *
 * SEM ROTA POR PROJETO, com seletor de projeto na própria tela: a leitura corrente é
 * "como está o plano de impacto", e ela começa escolhendo o projeto. O padrão é o mesmo
 * de Documentos e Atividades, e mantém o item fixo no menu.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Goal, Plus, Pencil, Trash2, Gauge, TriangleAlert, Ruler,
  Link2, Unlink, WifiOff, FolderTree, CalendarClock, Handshake,
} from 'lucide-react';
import {
  atualizarIndicadorDeMeta,
  atualizarMeta,
  criarIndicadorDeMeta,
  criarMeta,
  listarMetas,
  registrarMedicaoDeMeta,
  removerIndicadorDeMeta,
  removerMeta,
} from '@/lib/api/metas';
import { listarProjetos, normalizarListaProjetos } from '@/lib/api/projetos';
import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import Cartao from '@/components/ui/Cartao';
import CabecalhoSecao from '@/components/ui/CabecalhoSecao';
import Campo from '@/components/ui/Campo';
import Badge from '@/components/ui/Badge';
import BarraProgresso from '@/components/ui/BarraProgresso';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import SeletorStatus from '@/components/ui/SeletorStatus';
import EstadoVazio from '@/components/ui/EstadoVazio';
import Carregando from '@/components/ui/Carregando';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import PainelLateral from '@/components/ui/PainelLateral';

/* ===== Vocabulário ========================================================
   Espelha os CHECK de carbon_metas. Os rótulos ficam aqui e não no banco porque são
   texto de interface; o valor cru continua sendo a fonte de verdade, e um valor novo no
   banco aparece cru em vez de sumir da tela.                                  */
const ROTULO_FRENTE = {
  fortalecimento_institucional: 'Fortalecimento institucional',
  monitoramento: 'Monitoramento',
  educacao: 'Educação',
  sensibilizacao: 'Sensibilização',
  bioeconomia: 'Bioeconomia',
  prestacao_contas: 'Prestação de contas',
};

const OPCOES_STATUS = [
  { valor: 'planejada', rotulo: 'Planejada', tom: 'neutro' },
  { valor: 'em_andamento', rotulo: 'Em andamento', tom: 'azul' },
  { valor: 'concluida', rotulo: 'Concluída', tom: 'verde' },
  { valor: 'cancelada', rotulo: 'Cancelada', tom: 'vermelho' },
];

const ROTULO_PERIODICIDADE = {
  unica: 'Ação única',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  trimestral: 'Trimestral',
};

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const OPCOES_MES = MESES.map((nome, i) => ({ valor: String(i + 1), rotulo: nome }));

const OPCOES_TIPO = [
  { valor: 'contagem', rotulo: 'Contagem' },
  { valor: 'percentual', rotulo: 'Percentual' },
  { valor: 'volume', rotulo: 'Volume' },
  { valor: 'area', rotulo: 'Área' },
];

const OPCOES_GRANULARIDADE = [
  { valor: 'pontual', rotulo: 'Pontual (um dia de campo)' },
  { valor: 'mensal', rotulo: 'Mensal' },
  { valor: 'trimestral', rotulo: 'Trimestral' },
  { valor: 'semestral', rotulo: 'Semestral' },
  { valor: 'anual', rotulo: 'Anual' },
];

/* ===== Formatação =========================================================
   Até duas casas: as contagens do plano são inteiras e só percentual e área têm
   decimal. Fixar duas casas em tudo transformaria "3 câmeras" em "3,00 câmeras", que lê
   como precisão que a contagem não tem.                                       */
const NUMERO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function formatarNumero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? NUMERO.format(n) : null;
}

/** ISO para dd/mm/aaaa sem passar por Date: `new Date('2026-03-31')` é UTC e vira 30/03
 *  em qualquer fuso a oeste de Greenwich, que é o nosso. */
function formatarData(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const [ano, mes, dia] = iso.split('-');
  return dia ? `${dia}/${mes}/${ano}` : null;
}

/** "de 01/01/2026 até 31/12/2026", ou a metade que existir. */
function textoPrazo(inicio, fim) {
  const de = formatarData(inicio);
  const ate = formatarData(fim);
  if (de && ate) return `${de} a ${ate}`;
  if (ate) return `até ${ate}`;
  if (de) return `a partir de ${de}`;
  return 'Sem prazo definido';
}

function textoRecorrencia(meta) {
  const base = ROTULO_PERIODICIDADE[meta.periodicidade] ?? meta.periodicidade;
  if (!meta.mes_inicio || !meta.mes_fim) return base;
  // A janela pode atravessar o ano (outubro a abril é a estação chuvosa): o texto
  // simplesmente diz os dois meses, sem tentar interpretar a virada.
  return `${base}, de ${MESES[meta.mes_inicio - 1]} a ${MESES[meta.mes_fim - 1]}`;
}

const FORM_META_VAZIO = {
  frente: '',
  descricao: '',
  valor_alvo: '',
  unidade: '',
  periodicidade: 'unica',
  mes_inicio: '',
  mes_fim: '',
  periodo_inicio: '',
  periodo_fim: '',
  status: 'planejada',
  observacoes: '',
};

function formDaMeta(meta) {
  return {
    frente: meta.frente ?? '',
    descricao: meta.descricao ?? '',
    valor_alvo: meta.valor_alvo === null || meta.valor_alvo === undefined
      ? ''
      : String(meta.valor_alvo).replace('.', ','),
    unidade: meta.unidade ?? '',
    periodicidade: meta.periodicidade ?? 'unica',
    mes_inicio: meta.mes_inicio ? String(meta.mes_inicio) : '',
    mes_fim: meta.mes_fim ? String(meta.mes_fim) : '',
    periodo_inicio: meta.periodo_inicio ?? '',
    periodo_fim: meta.periodo_fim ?? '',
    status: meta.status ?? 'planejada',
    observacoes: meta.observacoes ?? '',
  };
}

/** Campo vazio vira null: o banco guarda ausência como null, e '' viraria zero ou texto
 *  vazio dependendo da coluna. */
const ouNulo = (valor) => (valor === '' || valor === undefined ? null : valor);

/* ===== Linha de um indicador vinculado ==================================== */

function LinhaIndicador({ indicador, unidadeDaMeta, podeEscrever, aoMedir, aoDesvincular, aoRemover }) {
  const realizado = indicador.realizado;
  const semMedicao = realizado === null || realizado === undefined;
  // medicoes_total conta a série inteira e medicoes_janela só o que cai no período da
  // meta. A diferença é lançamento fora do período, erro comum e invisível de outra forma.
  const foraDoPeriodo = (indicador.medicoes_total ?? 0) - (indicador.medicoes_janela ?? 0);
  // Unidade divergente da meta não é barrada pelo banco (ver o comentário de
  // carbon_meta_realizado): a tela mostra as duas para a incoerência ficar à vista de
  // quem revisa, que é quem sabe decidir.
  const unidadeDivergente =
    Boolean(indicador.unidade) && Boolean(unidadeDaMeta) && indicador.unidade !== unidadeDaMeta;

  return (
    <li className="flex flex-wrap items-start justify-between gap-2 py-2">
      <div className="min-w-0">
        <p className="text-sm text-[#1A2B1F]">{indicador.nome}</p>
        <p className="text-xs text-[#8A9990]">
          {indicador.acumulativo ? 'Soma as medições do período' : 'Vale a última medição'}
          {indicador.unidade ? ` · ${indicador.unidade}` : ''}
          {` · ${indicador.medicoes_janela ?? 0} ${
            (indicador.medicoes_janela ?? 0) === 1 ? 'medição' : 'medições'
          }`}
        </p>
        {foraDoPeriodo > 0 ? (
          <p className="text-xs text-[#8A5A12]">
            {foraDoPeriodo} {foraDoPeriodo === 1 ? 'medição está' : 'medições estão'} fora do
            período da meta e não entram no realizado.
          </p>
        ) : null}
        {unidadeDivergente ? (
          <p className="text-xs text-[#8A5A12]">
            A unidade deste indicador ({indicador.unidade}) é diferente da unidade da meta
            ({unidadeDaMeta}).
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm tabular-nums text-[#1A2B1F]">
          {semMedicao ? (
            // Traço apagado e não 0: ausência de medição é lacuna, zero é resultado apurado.
            <span className="text-[#A8B4AC]" title="Nenhuma medição no período da meta">-</span>
          ) : (
            `${formatarNumero(realizado)}${indicador.unidade ? ` ${indicador.unidade}` : ''}`
          )}
        </span>
        {podeEscrever ? (
          <>
            <BotaoSecundario
              icone={Ruler}
              tamanho="sm"
              rotuloAcessivel={`Lançar medição de ${indicador.nome}`}
              titulo="Lançar medição"
              onClick={() => aoMedir(indicador)}
            />
            <BotaoSecundario
              icone={Unlink}
              tamanho="sm"
              rotuloAcessivel={`Desvincular ${indicador.nome} da meta`}
              titulo="Desvincular sem apagar a série"
              onClick={() => aoDesvincular(indicador)}
            />
            <BotaoSecundario
              variante="perigo"
              icone={Trash2}
              tamanho="sm"
              rotuloAcessivel={`Apagar o indicador ${indicador.nome}`}
              titulo="Apagar o indicador e a série"
              onClick={() => aoRemover(indicador)}
            />
          </>
        ) : null}
      </div>
    </li>
  );
}

/* ===== Cartão de uma meta ================================================= */

function CartaoMeta({
  meta,
  podeEscrever,
  statusSalvando,
  aoMudarStatus,
  aoEditar,
  aoRemover,
  aoAdotarPrevisto,
  aoNovoIndicador,
  aoMedir,
  aoDesvincular,
  aoRemoverIndicador,
}) {
  const temAlvo = meta.valor_alvo !== null && meta.valor_alvo !== undefined;
  const semMedicao = meta.realizado === null || meta.realizado === undefined;
  const indicadores = meta.indicadores ?? [];

  return (
    <div className="px-4 sm:px-5 py-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#1A2B1F] leading-snug">{meta.descricao}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5C7060]">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5 text-[#8A9990]" />
              {textoPrazo(meta.periodo_inicio, meta.periodo_fim)}
            </span>
            <span>{textoRecorrencia(meta)}</span>
            {meta.parceiro_nome ? (
              <span className="inline-flex items-center gap-1">
                <Handshake className="w-3.5 h-3.5 text-[#8A9990]" />
                {meta.parceiro_nome}
              </span>
            ) : null}
            {meta.atrasada ? (
              <Badge tom="vermelho" tamanho="sm" icone={TriangleAlert}>
                Prazo vencido
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {podeEscrever ? (
            <SeletorStatus
              valor={meta.status}
              opcoes={OPCOES_STATUS}
              tamanho="sm"
              carregando={statusSalvando}
              onChange={(status) => aoMudarStatus(meta, status)}
              rotuloAcessivel={`Status da meta ${meta.descricao}`}
            />
          ) : (
            <Badge tom={OPCOES_STATUS.find((o) => o.valor === meta.status)?.tom ?? 'neutro'} tamanho="sm">
              {OPCOES_STATUS.find((o) => o.valor === meta.status)?.rotulo ?? meta.status}
            </Badge>
          )}
          {podeEscrever ? (
            <>
              <BotaoSecundario
                icone={Pencil}
                tamanho="sm"
                rotuloAcessivel={`Editar a meta ${meta.descricao}`}
                titulo="Editar"
                onClick={() => aoEditar(meta)}
              />
              <BotaoSecundario
                variante="perigo"
                icone={Trash2}
                tamanho="sm"
                rotuloAcessivel={`Apagar a meta ${meta.descricao}`}
                titulo="Apagar"
                onClick={() => aoRemover(meta)}
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Progresso. Três estados diferentes, e nenhum deles pode ser desenhado como
          "0%": sem alvo não há denominador, sem medição não há numerador, e só o
          terceiro caso é progresso de verdade. */}
      {!temAlvo ? (
        <AvisoDiscreto tom="ambar" icone={Gauge}>
          Meta sem valor alvo: enquanto o número não existir, não há progresso para
          calcular.
          {meta.ocorrencias_previstas !== null && meta.ocorrencias_previstas !== undefined ? (
            <>
              {' '}
              Pela periodicidade e pela janela, o previsto no período é{' '}
              <strong>{meta.ocorrencias_previstas}</strong>.
              {podeEscrever ? (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => aoAdotarPrevisto(meta)}
                    className="underline underline-offset-2 hover:text-[#1A4731]"
                  >
                    Usar como alvo
                  </button>
                  {' '}(abre o formulário; nada é gravado sozinho).
                </>
              ) : null}
            </>
          ) : null}
        </AvisoDiscreto>
      ) : semMedicao ? (
        <p className="text-xs text-[#8A9990]">
          Alvo de {formatarNumero(meta.valor_alvo)} {meta.unidade}. Nenhuma medição no
          período: sem medição não é o mesmo que zero medido.
        </p>
      ) : (
        <BarraProgresso
          valor={meta.pct}
          rotulo={
            <span className="tabular-nums">
              {formatarNumero(meta.realizado)} de {formatarNumero(meta.valor_alvo)} {meta.unidade}
            </span>
          }
          detalhe={
            meta.pct === null || meta.pct === undefined
              ? 'Sem percentual'
              : `${formatarNumero(meta.pct)}%`
          }
          rotuloAcessivel={`Progresso da meta ${meta.descricao}`}
          tom={meta.atrasada ? 'vermelho' : 'laranja'}
        />
      )}

      {/* Indicadores vinculados. É deles que sai o realizado: meta sem indicador nunca
          sai do zero, e por isso a ausência é dita e não escondida. */}
      <div className="pt-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wider text-[#8A9990]">
            Indicadores da meta
          </p>
          {podeEscrever ? (
            <BotaoSecundario
              variante="fantasma"
              icone={Plus}
              tamanho="sm"
              onClick={() => aoNovoIndicador(meta)}
            >
              Indicador
            </BotaoSecundario>
          ) : null}
        </div>

        {indicadores.length === 0 ? (
          <p className="text-xs text-[#8A9990]">
            Nenhum indicador vinculado. O realizado vem das medições dos indicadores, então
            sem nenhum esta meta não tem como progredir.
          </p>
        ) : (
          <ul className="divide-y divide-[#F4F6F4]">
            {indicadores.map((indicador) => (
              <LinhaIndicador
                key={indicador.id}
                indicador={indicador}
                unidadeDaMeta={meta.unidade}
                podeEscrever={podeEscrever}
                aoMedir={(i) => aoMedir(meta, i)}
                aoDesvincular={aoDesvincular}
                aoRemover={aoRemoverIndicador}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ===== Tela =============================================================== */

export default function Metas() {
  const msal = useMsal();
  const { accounts } = msal;
  const queryClient = useQueryClient();

  /* Em modo demonstração não existe conta no MSAL (o login fica desabilitado) e as
     funções de api/metas não usam token: exigir `autenticado` deixaria a tela
     permanentemente vazia justamente no modo que existe para revisá-la. */
  const habilitado = (MODO_DEMO && MODO_DEMO_ATIVO()) || (accounts?.length ?? 0) > 0;

  const [projetoId, setProjetoId] = useState('');
  const [filtroFrente, setFiltroFrente] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  /* UM estado para os três painéis, e não um booleano para cada. PainelLateral prende o
     foco, escuta o Escape e trava a rolagem do fundo; dois montados ao mesmo tempo
     disputariam as três coisas. Com um estado só, abrir um fecha o outro por construção. */
  const [painel, setPainel] = useState(null);
  const [formMeta, setFormMeta] = useState(FORM_META_VAZIO);
  const [formIndicador, setFormIndicador] = useState({
    nome: '', unidade: '', tipo: 'contagem', acumulativo: true, descricao: '',
  });
  const [formMedicao, setFormMedicao] = useState({
    data: '', valor: '', periodo_tipo: 'pontual', origem: 'interna', observacao: '',
  });
  const [erros, setErros] = useState({});
  const [statusSalvandoId, setStatusSalvandoId] = useState(null);

  const projetosQuery = useQuery({
    queryKey: ['carbon', 'projetos'],
    /* normalizarListaProjetos: a chave ['carbon', 'projetos'] é compartilhada com outras
       telas; ler o envelope aqui é o que impede cada uma guardar um formato diferente. */
    queryFn: async () => normalizarListaProjetos(await listarProjetos(msal)),
    enabled: habilitado,
  });

  const projetos = projetosQuery.data?.projetos ?? [];

  // Um projeto só: escolhe sozinho. Obrigar o clique num seletor de uma opção é
  // cerimônia, e hoje o sistema tem exatamente um projeto cadastrado.
  useEffect(() => {
    if (!projetoId && projetos.length === 1) setProjetoId(projetos[0].id);
  }, [projetoId, projetos]);

  const metasQuery = useQuery({
    queryKey: ['carbon', 'metas', projetoId, filtroFrente, filtroStatus],
    queryFn: () =>
      listarMetas(msal, projetoId, {
        frente: filtroFrente || null,
        status: filtroStatus || null,
      }),
    enabled: habilitado && Boolean(projetoId),
    // Mantém a lista anterior visível enquanto a nova chega: sem isto, mudar um filtro
    // pisca a tela inteira para o estado de carregamento e a leitura se perde.
    placeholderData: (anterior) => anterior,
  });

  const dados = metasQuery.data;
  const metas = dados?.metas ?? [];
  const progresso = dados?.progresso ?? {};
  const frentes = dados?.frentes ?? [];
  const avulsos = dados?.avulsos ?? [];
  const podeEscrever = dados?.pode_escrever === true;

  const porFrente = useMemo(() => {
    const mapa = new Map();
    for (const meta of metas) {
      const lista = mapa.get(meta.frente) ?? [];
      lista.push(meta);
      mapa.set(meta.frente, lista);
    }
    return mapa;
  }, [metas]);

  const invalidar = () => {
    // Prefixo, e não a chave exata: existe uma entrada de cache por combinação de
    // filtros, e todas ficaram desatualizadas.
    queryClient.invalidateQueries({ queryKey: ['carbon', 'metas'] });
  };

  const fecharPainel = () => {
    setPainel(null);
    setErros({});
  };

  /* ===== Mutações ======================================================== */

  const salvarMeta = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? atualizarMeta(msal, id, payload) : criarMeta(msal, projetoId, payload),
    onSuccess: (_resposta, variaveis) => {
      invalidar();
      toast.success(variaveis?.id ? 'Meta atualizada.' : 'Meta cadastrada.');
      fecharPainel();
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível salvar a meta.'),
  });

  const mudarStatus = useMutation({
    mutationFn: ({ id, status }) => atualizarMeta(msal, id, { status }),
    onSuccess: () => invalidar(),
    onError: (e) => toast.error(e?.message ?? 'Não foi possível mudar o status.'),
    onSettled: () => setStatusSalvandoId(null),
  });

  const apagarMeta = useMutation({
    mutationFn: (id) => removerMeta(msal, id),
    onSuccess: () => {
      invalidar();
      toast.success('Meta removida. Os indicadores dela continuam, agora sem meta.');
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível remover a meta.'),
  });

  const salvarIndicador = useMutation({
    mutationFn: ({ metaId, payload }) => criarIndicadorDeMeta(msal, metaId, payload),
    onSuccess: () => {
      invalidar();
      toast.success('Indicador vinculado à meta.');
      fecharPainel();
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível criar o indicador.'),
  });

  const mudarVinculo = useMutation({
    mutationFn: ({ id, metaId }) => atualizarIndicadorDeMeta(msal, id, { meta_id: metaId }),
    onSuccess: (_resposta, variaveis) => {
      invalidar();
      toast.success(variaveis?.metaId ? 'Indicador vinculado.' : 'Indicador desvinculado.');
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível mudar o vínculo.'),
  });

  const apagarIndicador = useMutation({
    mutationFn: (id) => removerIndicadorDeMeta(msal, id),
    onSuccess: () => {
      invalidar();
      toast.success('Indicador removido.');
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível remover o indicador.'),
  });

  const lancarMedicao = useMutation({
    mutationFn: ({ id, payload }) => registrarMedicaoDeMeta(msal, id, payload),
    onSuccess: () => {
      invalidar();
      toast.success('Medição registrada.');
      fecharPainel();
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível registrar a medição.'),
  });

  /* ===== Abertura dos painéis ============================================ */

  const abrirNovaMeta = (frenteSugerida = '') => {
    setErros({});
    setFormMeta({ ...FORM_META_VAZIO, frente: frenteSugerida || filtroFrente || '' });
    setPainel({ tipo: 'meta', meta: null });
  };

  const abrirEdicaoMeta = (meta, ajuste = {}) => {
    setErros({});
    setFormMeta({ ...formDaMeta(meta), ...ajuste });
    setPainel({ tipo: 'meta', meta });
  };

  const abrirNovoIndicador = (meta) => {
    setErros({});
    setFormIndicador({
      nome: '',
      // A unidade da meta entra como sugestão: o realizado soma os indicadores sem
      // conferir unidade, então começar coerente evita um total sem sentido.
      unidade: meta.unidade ?? '',
      tipo: 'contagem',
      acumulativo: true,
      descricao: '',
    });
    setPainel({ tipo: 'indicador', meta });
  };

  const abrirMedicao = (meta, indicador) => {
    setErros({});
    setFormMedicao({
      data: '',
      valor: '',
      /* A granularidade padrão segue a periodicidade da meta quando elas se
         correspondem. Não é adivinhação: quem mede uma meta mensal digita valor de mês,
         e deixar 'pontual' faria cada lançamento virar um período novo na série. */
      periodo_tipo:
        meta?.periodicidade === 'mensal' || meta?.periodicidade === 'trimestral'
          ? meta.periodicidade
          : 'pontual',
      origem: 'interna',
      observacao: '',
    });
    setPainel({ tipo: 'medicao', meta, indicador });
  };

  /* ===== Submissões ====================================================== */

  function submeterMeta() {
    const problemas = {};
    if (!formMeta.frente) problemas.frente = 'Escolha a frente de atuação.';
    if (!formMeta.descricao.trim()) problemas.descricao = 'Descreva a ação.';
    // A mesma regra do CHECK carbon_metas_unidade_com_valor_chk, conferida aqui só para
    // a pessoa não perder o formulário preenchido numa ida ao servidor.
    if (formMeta.valor_alvo !== '' && !formMeta.unidade.trim()) {
      problemas.unidade = 'Número sem unidade não é medida. Informe a unidade.';
    }
    if (Boolean(formMeta.mes_inicio) !== Boolean(formMeta.mes_fim)) {
      problemas.mes_fim = 'A janela sazonal é um par: informe os dois meses ou nenhum.';
    }
    if (
      formMeta.periodo_inicio && formMeta.periodo_fim &&
      formMeta.periodo_fim < formMeta.periodo_inicio
    ) {
      problemas.periodo_fim = 'O fim não pode ser anterior ao início.';
    }

    setErros(problemas);
    if (Object.keys(problemas).length > 0) return;

    const payload = {
      frente: formMeta.frente,
      descricao: formMeta.descricao.trim(),
      valor_alvo: ouNulo(formMeta.valor_alvo),
      unidade: ouNulo(formMeta.unidade.trim()),
      periodicidade: formMeta.periodicidade,
      mes_inicio: ouNulo(formMeta.mes_inicio),
      mes_fim: ouNulo(formMeta.mes_fim),
      periodo_inicio: ouNulo(formMeta.periodo_inicio),
      periodo_fim: ouNulo(formMeta.periodo_fim),
      status: formMeta.status,
      observacoes: ouNulo(formMeta.observacoes.trim()),
    };

    salvarMeta.mutate({ id: painel?.meta?.id ?? null, payload });
  }

  function submeterIndicador() {
    const problemas = {};
    if (!formIndicador.nome.trim()) problemas.nome = 'Informe o que se mede.';
    if (formIndicador.tipo === 'percentual' && formIndicador.acumulativo) {
      problemas.acumulativo =
        'Percentual não acumula: somar 30% com 40% não dá 70% de nada. Desmarque para valer a última medição.';
    }
    setErros(problemas);
    if (Object.keys(problemas).length > 0) return;

    salvarIndicador.mutate({
      metaId: painel.meta.id,
      payload: {
        nome: formIndicador.nome.trim(),
        unidade: ouNulo(formIndicador.unidade.trim()),
        tipo: formIndicador.tipo,
        acumulativo: formIndicador.acumulativo,
        descricao: ouNulo(formIndicador.descricao.trim()),
      },
    });
  }

  function submeterMedicao() {
    const problemas = {};
    if (!formMedicao.data) problemas.data = 'Informe a competência da medição.';
    if (formMedicao.valor.trim() === '') problemas.valor = 'Informe o valor medido.';
    setErros(problemas);
    if (Object.keys(problemas).length > 0) return;

    lancarMedicao.mutate({
      id: painel.indicador.id,
      payload: {
        data: formMedicao.data,
        valor: formMedicao.valor.trim(),
        periodo_tipo: formMedicao.periodo_tipo,
        origem: formMedicao.origem,
        observacao: ouNulo(formMedicao.observacao.trim()),
      },
    });
  }

  /* ===== Confirmações destrutivas ======================================== */

  const confirmarRemocaoMeta = (meta) => {
    if (window.confirm(`Apagar a meta "${meta.descricao}"? Os indicadores dela continuam, sem meta.`)) {
      apagarMeta.mutate(meta.id);
    }
  };

  const confirmarRemocaoIndicador = (indicador) => {
    if (
      window.confirm(
        `Apagar o indicador "${indicador.nome}"? A série de medições vai junto e não tem volta.`,
      )
    ) {
      apagarIndicador.mutate(indicador.id);
    }
  };

  /* ===== Render ========================================================== */

  const opcoesProjeto = projetos.map((p) => ({ valor: p.id, rotulo: p.nome }));
  const opcoesFrente = frentes.length
    ? frentes.map((f) => ({ valor: f.frente, rotulo: ROTULO_FRENTE[f.frente] ?? f.frente }))
    : Object.entries(ROTULO_FRENTE).map(([valor, rotulo]) => ({ valor, rotulo }));

  const filtrando = Boolean(filtroFrente || filtroStatus);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <CabecalhoSecao
        titulo="Metas por frente"
        descricao="O número e a unidade ficam fora da frase, e o realizado vem das medições dos indicadores."
        acao={
          <BotaoPrimario
            icone={Plus}
            onClick={() => abrirNovaMeta()}
            desabilitado={!projetoId || !podeEscrever}
            titulo={
              !projetoId
                ? 'Escolha um projeto primeiro'
                : !podeEscrever
                  ? 'Cadastrar meta exige papel de gestor ou administrador'
                  : undefined
            }
          >
            Nova meta
          </BotaoPrimario>
        }
      />

      {MODO_DEMO && MODO_DEMO_ATIVO() ? (
        <AvisoDiscreto tom="ambar">
          Modo demonstração: as metas abaixo são um recorte de exemplo e as alterações não são
          gravadas.
        </AvisoDiscreto>
      ) : null}

      <Cartao>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Campo
            rotulo="Projeto"
            tipo="select"
            valor={projetoId}
            onChange={setProjetoId}
            opcoes={opcoesProjeto}
            rotuloVazio={projetosQuery.isLoading ? 'Carregando...' : 'Escolha um projeto'}
            dica={projetosQuery.isError ? 'Não foi possível carregar os projetos.' : undefined}
          />
          <Campo
            rotulo="Frente"
            tipo="select"
            valor={filtroFrente}
            onChange={setFiltroFrente}
            opcoes={opcoesFrente}
            rotuloVazio="Todas as frentes"
          />
          <Campo
            rotulo="Status"
            tipo="select"
            valor={filtroStatus}
            onChange={setFiltroStatus}
            opcoes={OPCOES_STATUS.map(({ valor, rotulo }) => ({ valor, rotulo }))}
            rotuloVazio="Todos os status"
          />
        </div>
      </Cartao>

      {!projetoId ? (
        <EstadoVazio
          icone={FolderTree}
          titulo="Escolha um projeto"
          texto="As metas pertencem a um projeto: elas saem do plano de impacto acordado com a comunidade daquele território, e não se comparam entre projetos."
          comSuperficie
        />
      ) : metasQuery.isLoading ? (
        <Carregando rotulo="Carregando as metas" />
      ) : metasQuery.isError ? (
        <EstadoVazio
          icone={WifiOff}
          titulo="Não foi possível carregar as metas"
          texto={metasQuery.error?.message ?? 'Verifique a conexão e tente novamente.'}
          comSuperficie
        />
      ) : (
        <>
          {/* Números do topo. Vêm do projeto INTEIRO e não da lista filtrada: eles
              respondem "como está o plano de impacto", e um total que mudasse ao
              filtrar por frente não responderia nada.

              Escondidos quando o projeto não tem meta nenhuma: quatro zeros acima do
              convite para cadastrar a primeira não informam nada e roubam o convite. */}
          {(progresso.total ?? 0) > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Cartao classeCorpo="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-[#8A9990]">Metas</p>
              <p className="text-2xl font-semibold text-[#1A2B1F] tabular-nums">
                {progresso.total ?? 0}
              </p>
              <p className="text-xs text-[#8A9990]">
                {progresso.quantificadas ?? 0} com valor alvo
              </p>
            </Cartao>

            <Cartao classeCorpo="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-[#8A9990]">Sem valor alvo</p>
              <p className="text-2xl font-semibold text-[#8A5A12] tabular-nums">
                {progresso.sem_valor_alvo ?? 0}
              </p>
              <p className="text-xs text-[#8A9990]">Metas que ainda não podem ser medidas</p>
            </Cartao>

            <Cartao classeCorpo="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-[#8A9990]">Prazo vencido</p>
              <p className="text-2xl font-semibold text-[#C0392B] tabular-nums">
                {progresso.atrasadas ?? 0}
              </p>
              <p className="text-xs text-[#8A9990]">
                {progresso.sem_medicao ?? 0} sem nenhuma medição
              </p>
            </Cartao>

            <Cartao classeCorpo="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-[#8A9990]">Progresso médio</p>
              <BarraProgresso
                valor={progresso.pct_medio}
                mostrarValor
                rotuloAcessivel="Progresso médio das metas mensuráveis"
              />
              <p className="text-xs text-[#8A9990]">
                {/* A média corta cada meta em 100 e ignora as canceladas: sem o corte,
                    uma meta superada em 400% mascararia três metas paradas. */}
                Média de {progresso.com_pct ?? 0} metas mensuráveis, cada uma limitada a 100%.
              </p>
            </Cartao>
          </div>
          ) : null}

          {(progresso.sem_indicador ?? 0) > 0 ? (
            <AvisoDiscreto tom="ambar" titulo="Há meta sem indicador nenhum.">
              {progresso.sem_indicador} {progresso.sem_indicador === 1 ? 'meta' : 'metas'} não têm
              indicador vinculado. O realizado vem das medições dos indicadores, então essas metas
              nunca sairão do zero enquanto continuarem assim.
            </AvisoDiscreto>
          ) : null}

          {(dados?.total ?? 0) >= 500 ? (
            <AvisoDiscreto tom="ambar">
              A listagem tem um corte de segurança em 500 metas e ele foi atingido. Use os filtros
              de frente e status para ver o restante.
            </AvisoDiscreto>
          ) : null}

          {/* As SEIS frentes, sempre que o projeto já tenha alguma meta. Frente vazia
              aparece com a linha explicando e o atalho de cadastrar: é a lacuna do plano
              ficando visível, que é metade do problema que este módulo ataca.

              Com ZERO meta no projeto inteiro, porém, seis cartões vazios repetiriam seis
              vezes o que o estado vazio abaixo diz uma vez, e enterrariam o botão de
              cadastrar a primeira - que é o único caminho útil nesse momento. */}
          {(progresso.total ?? 0) > 0 ? opcoesFrente
            .filter((f) => !filtroFrente || f.valor === filtroFrente)
            .map((f) => {
              const daFrente = porFrente.get(f.valor) ?? [];
              return (
                <Cartao
                  key={f.valor}
                  icone={Goal}
                  titulo={f.rotulo}
                  subtitulo={
                    daFrente.length === 0
                      ? 'Nenhuma meta cadastrada nesta frente'
                      : `${daFrente.length} ${daFrente.length === 1 ? 'meta' : 'metas'}`
                  }
                  semPaddingCorpo
                  acao={
                    podeEscrever ? (
                      <BotaoSecundario
                        icone={Plus}
                        tamanho="sm"
                        onClick={() => abrirNovaMeta(f.valor)}
                      >
                        Meta
                      </BotaoSecundario>
                    ) : null
                  }
                >
                  {daFrente.length === 0 ? (
                    <p className="px-4 sm:px-5 py-4 text-xs text-[#8A9990]">
                      {filtrando
                        ? 'Nenhuma meta desta frente atende aos filtros.'
                        : 'Esta frente do plano de impacto ainda não tem meta registrada. A frente aparece vazia de propósito: sem isso, a ausência de meta ficaria invisível.'}
                    </p>
                  ) : (
                    <div className="divide-y divide-[#F4F6F4]">
                      {daFrente.map((meta) => (
                        <CartaoMeta
                          key={meta.id}
                          meta={meta}
                          podeEscrever={podeEscrever}
                          statusSalvando={statusSalvandoId === meta.id}
                          aoMudarStatus={(m, status) => {
                            setStatusSalvandoId(m.id);
                            mudarStatus.mutate({ id: m.id, status });
                          }}
                          aoEditar={abrirEdicaoMeta}
                          aoRemover={confirmarRemocaoMeta}
                          aoAdotarPrevisto={(m) =>
                            abrirEdicaoMeta(m, { valor_alvo: String(m.ocorrencias_previstas) })
                          }
                          aoNovoIndicador={abrirNovoIndicador}
                          aoMedir={abrirMedicao}
                          aoDesvincular={(i) => mudarVinculo.mutate({ id: i.id, metaId: null })}
                          aoRemoverIndicador={confirmarRemocaoIndicador}
                        />
                      ))}
                    </div>
                  )}
                </Cartao>
              );
            }) : null}

          {/* Indicadores internos sem meta. Existem de forma legítima (o projeto
              acompanha coisas que não têm meta) e reaparecem aqui quando uma meta é
              apagada, já que o vínculo é SET NULL e não cascade. */}
          {avulsos.length > 0 ? (
            <Cartao
              icone={Link2}
              tomIcone="neutro"
              titulo="Indicadores sem meta"
              subtitulo="Acompanhados pela equipe, mas sem meta que os use no cálculo do realizado."
              semPaddingCorpo
            >
              <ul className="divide-y divide-[#F4F6F4]">
                {avulsos.map((indicador) => (
                  <li
                    key={indicador.id}
                    className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-[#1A2B1F]">{indicador.nome}</p>
                      <p className="text-xs text-[#8A9990]">
                        {indicador.acumulativo ? 'Soma as medições' : 'Vale a última medição'}
                        {indicador.unidade ? ` · ${indicador.unidade}` : ''}
                      </p>
                    </div>
                    {podeEscrever && metas.length > 0 ? (
                      <select
                        className="text-sm px-3 py-1.5 bg-white border border-[#DDE3DE] rounded-lg text-[#1A2B1F] focus:outline-none focus:ring-2 focus:ring-[#1A4731]/10"
                        value=""
                        onChange={(e) =>
                          e.target.value &&
                          mudarVinculo.mutate({ id: indicador.id, metaId: e.target.value })
                        }
                        aria-label={`Vincular ${indicador.nome} a uma meta`}
                      >
                        <option value="">Vincular a uma meta...</option>
                        {metas.map((meta) => (
                          <option key={meta.id} value={meta.id}>
                            {meta.descricao}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}

          {/* Estado vazio mesmo quando há indicador avulso: indicador sem meta não é
              meta, e a tela não pode dar a impressão de que o plano já está registrado. */}
          {metas.length === 0 ? (
            <EstadoVazio
              icone={Goal}
              titulo={filtrando ? 'Nenhuma meta para estes filtros' : 'Nenhuma meta cadastrada'}
              texto={
                filtrando
                  ? 'Limpe os filtros para ver o plano inteiro.'
                  : 'As metas do plano de impacto ainda estão em texto, com os números em placeholder. Cadastrar a primeira aqui é o que transforma "instalar XX câmeras" em algo que se compara com o realizado.'
              }
              acao={
                podeEscrever && !filtrando ? (
                  <BotaoPrimario icone={Plus} onClick={() => abrirNovaMeta()}>
                    Cadastrar a primeira meta
                  </BotaoPrimario>
                ) : null
              }
              comSuperficie
            />
          ) : null}

          {!podeEscrever ? (
            <p className="text-xs text-[#8A9990]">
              Você tem acesso de leitura a este projeto. Cadastrar meta, indicador ou medição exige
              papel de gestor ou administrador.
            </p>
          ) : null}
        </>
      )}

      {/* ===== Painel da meta ============================================= */}
      <PainelLateral
        aberto={painel?.tipo === 'meta'}
        onFechar={fecharPainel}
        icone={Goal}
        titulo={painel?.meta ? 'Editar meta' : 'Nova meta'}
        subtitulo="A descrição fica sem o número: ele mora no valor alvo, com a unidade ao lado."
        largura="lg"
        fecharAoClicarFora={false}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario variante="fantasma" onClick={fecharPainel}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={submeterMeta} carregando={salvarMeta.isPending}>
              Salvar
            </BotaoPrimario>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo
            rotulo="Frente"
            tipo="select"
            obrigatorio
            valor={formMeta.frente}
            onChange={(v) => setFormMeta((a) => ({ ...a, frente: v }))}
            opcoes={opcoesFrente}
            rotuloVazio="Escolha a frente"
            erro={erros.frente}
          />
          <Campo
            rotulo="Status"
            tipo="select"
            valor={formMeta.status}
            onChange={(v) => setFormMeta((a) => ({ ...a, status: v }))}
            opcoes={OPCOES_STATUS.map(({ valor, rotulo }) => ({ valor, rotulo }))}
            dica="Atraso não é status: ele é derivado do prazo com a data de hoje."
          />
          <Campo
            rotulo="A ação"
            tipo="textarea"
            obrigatorio
            linhas={3}
            valor={formMeta.descricao}
            onChange={(v) => setFormMeta((a) => ({ ...a, descricao: v }))}
            placeholder="Instalar câmeras trap para monitoramento de fauna"
            dica="Sem o número na frase. LGPD: sem nome de pessoa."
            erro={erros.descricao}
            className="sm:col-span-2"
          />
          <Campo
            rotulo="Valor alvo"
            tipo="decimal"
            valor={formMeta.valor_alvo}
            onChange={(v) => setFormMeta((a) => ({ ...a, valor_alvo: v }))}
            placeholder="20"
            dica="Pode ficar em branco: meta sem número entra como pendência, e é melhor do que um número inventado."
          />
          <Campo
            rotulo="Unidade"
            valor={formMeta.unidade}
            onChange={(v) => setFormMeta((a) => ({ ...a, unidade: v }))}
            placeholder="câmeras"
            dica="Obrigatória quando há valor alvo."
            erro={erros.unidade}
          />
          <Campo
            rotulo="Periodicidade"
            tipo="select"
            valor={formMeta.periodicidade}
            onChange={(v) => setFormMeta((a) => ({ ...a, periodicidade: v }))}
            opcoes={Object.entries(ROTULO_PERIODICIDADE).map(([valor, rotulo]) => ({
              valor,
              rotulo,
            }))}
            dica="Ação recorrente combinada com a janela sazonal permite calcular o previsto."
            className="sm:col-span-2"
          />
          <Campo
            rotulo="Janela sazonal: mês inicial"
            tipo="select"
            valor={formMeta.mes_inicio}
            onChange={(v) => setFormMeta((a) => ({ ...a, mes_inicio: v }))}
            opcoes={OPCOES_MES}
            rotuloVazio="Sem sazonalidade"
          />
          <Campo
            rotulo="Janela sazonal: mês final"
            tipo="select"
            valor={formMeta.mes_fim}
            onChange={(v) => setFormMeta((a) => ({ ...a, mes_fim: v }))}
            opcoes={OPCOES_MES}
            rotuloVazio="Sem sazonalidade"
            dica="A janela pode atravessar o ano: outubro a abril é a estação chuvosa."
            erro={erros.mes_fim}
          />
          <Campo
            rotulo="Início do período"
            tipo="data"
            valor={formMeta.periodo_inicio}
            onChange={(v) => setFormMeta((a) => ({ ...a, periodo_inicio: v }))}
          />
          <Campo
            rotulo="Fim do período"
            tipo="data"
            valor={formMeta.periodo_fim}
            onChange={(v) => setFormMeta((a) => ({ ...a, periodo_fim: v }))}
            dica="Também delimita quais medições contam no realizado."
            erro={erros.periodo_fim}
          />
          <Campo
            rotulo="Observações"
            tipo="textarea"
            linhas={3}
            valor={formMeta.observacoes}
            onChange={(v) => setFormMeta((a) => ({ ...a, observacoes: v }))}
            dica="LGPD: sem nome, telefone ou e-mail de pessoa física."
            className="sm:col-span-2"
          />
        </div>
      </PainelLateral>

      {/* ===== Painel do indicador ======================================== */}
      <PainelLateral
        aberto={painel?.tipo === 'indicador'}
        onFechar={fecharPainel}
        icone={Gauge}
        titulo="Novo indicador da meta"
        subtitulo={painel?.meta?.descricao}
        fecharAoClicarFora={false}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario variante="fantasma" onClick={fecharPainel}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={submeterIndicador} carregando={salvarIndicador.isPending}>
              Criar indicador
            </BotaoPrimario>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <Campo
            rotulo="O que se mede"
            obrigatorio
            valor={formIndicador.nome}
            onChange={(v) => setFormIndicador((a) => ({ ...a, nome: v }))}
            placeholder="Câmeras trap instaladas"
            dica="Único por projeto, ignorando maiúsculas e espaços nas pontas."
            erro={erros.nome}
          />
          <Campo
            rotulo="Unidade"
            valor={formIndicador.unidade}
            onChange={(v) => setFormIndicador((a) => ({ ...a, unidade: v }))}
            placeholder="câmeras"
            dica="Idealmente a mesma da meta: o realizado soma os indicadores sem conferir unidade."
          />
          <Campo
            rotulo="Tipo"
            tipo="select"
            valor={formIndicador.tipo}
            onChange={(v) =>
              setFormIndicador((a) => ({
                ...a,
                tipo: v,
                // Percentual não acumula, e o formulário já reflete isso em vez de
                // esperar o servidor recusar depois de a pessoa clicar em salvar.
                acumulativo: v === 'percentual' ? false : a.acumulativo,
              }))
            }
            opcoes={OPCOES_TIPO}
          />
          <Campo
            rotulo="Acumulativo (soma as medições do período)"
            tipo="checkbox"
            valor={formIndicador.acumulativo}
            onChange={(v) => setFormIndicador((a) => ({ ...a, acumulativo: v }))}
            desabilitado={formIndicador.tipo === 'percentual'}
            dica={
              formIndicador.tipo === 'percentual'
                ? 'Percentual é um nível, não um acúmulo: o valor que vale é o último medido.'
                : 'Desmarque quando o valor for um nível (área sob monitoramento, percentual de aumento).'
            }
            erro={erros.acumulativo}
          />
          <Campo
            rotulo="Como a medição é feita"
            tipo="textarea"
            linhas={3}
            valor={formIndicador.descricao}
            onChange={(v) => setFormIndicador((a) => ({ ...a, descricao: v }))}
            dica="Para outra pessoa repetir do mesmo jeito no próximo ciclo. LGPD: descreva o papel, não a pessoa."
          />
        </div>
      </PainelLateral>

      {/* ===== Painel da medição ========================================== */}
      <PainelLateral
        aberto={painel?.tipo === 'medicao'}
        onFechar={fecharPainel}
        icone={Ruler}
        titulo="Lançar medição"
        subtitulo={painel?.indicador?.nome}
        fecharAoClicarFora={false}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario variante="fantasma" onClick={fecharPainel}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={submeterMedicao} carregando={lancarMedicao.isPending}>
              Registrar
            </BotaoPrimario>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo
            rotulo="Competência"
            tipo="data"
            obrigatorio
            valor={formMedicao.data}
            onChange={(v) => setFormMedicao((a) => ({ ...a, data: v }))}
            dica="A que período o valor se refere, não a data de digitação. A convenção é a data final do período."
            erro={erros.data}
          />
          <Campo
            rotulo="Valor"
            tipo="decimal"
            obrigatorio
            valor={formMedicao.valor}
            onChange={(v) => setFormMedicao((a) => ({ ...a, valor: v }))}
            dica="Aceita negativo: indicador de variação também mede queda."
            erro={erros.valor}
          />
          <Campo
            rotulo="Granularidade"
            tipo="select"
            valor={formMedicao.periodo_tipo}
            onChange={(v) => setFormMedicao((a) => ({ ...a, periodo_tipo: v }))}
            opcoes={OPCOES_GRANULARIDADE}
            dica="Lançar o mesmo período de novo corrige o valor em vez de criar uma segunda linha."
          />
          <Campo
            rotulo="Origem"
            tipo="select"
            valor={formMedicao.origem}
            onChange={(v) => setFormMedicao((a) => ({ ...a, origem: v }))}
            opcoes={[
              { valor: 'interna', rotulo: 'Equipe do projeto' },
              { valor: 'parceiro', rotulo: 'Organização parceira' },
            ]}
            dica="Dado reportado por terceiro tem outro peso na verificação."
          />
          <Campo
            rotulo="Observação"
            tipo="textarea"
            linhas={3}
            valor={formMedicao.observacao}
            onChange={(v) => setFormMedicao((a) => ({ ...a, observacao: v }))}
            dica="O que explica um valor fora da curva. LGPD: sem nome de pessoa."
            className="sm:col-span-2"
          />
        </div>
      </PainelLateral>
    </div>
  );
}

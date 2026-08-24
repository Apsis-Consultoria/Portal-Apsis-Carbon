/**
 * ProjetoFindings - findings de auditoria de um projeto (issue #5).
 *
 * UMA entidade para TRÊS processos externos. O projeto responde ao mesmo tempo à VVB
 * (auditoria independente credenciada, que aponta CAR e CL por seção de documento), à
 * Verra (o próprio programa, com findings temáticos de governança e salvaguardas) e à
 * BeZero (agência de rating, cujo checklist influencia o preço de venda do crédito). No
 * Notion são três bases separadas com as MESMAS seis views: são a mesma entidade com
 * origem diferente, e é assim que esta tela trata.
 *
 * AS SEIS VISÕES são as que a equipe já usa, e todas operam sobre o MESMO conjunto:
 * lista, board por estado, por rodada, por estado de evidência, por tipo (CAR/CL) e por
 * origem. Trocar de visão não busca dados de novo.
 *
 * DOIS EIXOS DE PROGRESSO, e isso não é detalhe: `estado` mede a resposta e
 * `estado_evidencia` mede a evidência. Um finding pode estar fechado com evidência
 * pendente, combinação comum na base real, e mostrar um número só esconderia exatamente
 * isso. Quem calcula é o servidor (função SQL carbon_findings_progresso), inclusive a
 * regra de que finding 'não aplicável' sai do DENOMINADOR - sem ela o checklist da
 * BeZero nunca fecharia 100%, o mesmo problema dos critérios opcionais do PDD.
 *
 * BILINGUISMO É REQUISITO. O apontamento e a exigência chegam em inglês, o plano de
 * resposta é escrito em português e a resposta oficial volta em inglês. O painel mostra
 * o idioma de cada campo, e o rascunho de trabalho fica separado do texto que vai para
 * a validadora: vários findings reais existem justamente porque havia conteúdo em
 * português onde a norma exige inglês.
 *
 * SUBITENS VERIFICÁVEIS são a lacuna mais evidente da ferramenta atual. Hoje a equipe
 * usa o campo de comentários como checklist manual, com dezenas de linhas do tipo
 * '2.3.12 - Sem itálico OK'. Aqui cada linha é um item com estado próprio, o campo de
 * inclusão aceita a lista colada de uma vez (uma linha por item), e o progresso do
 * finding é derivado deles.
 *
 * CONTROLE DE ACESSO - PENDÊNCIA QUE VALE ESPECIALMENTE AQUI. Esta tela mostra material
 * de auditoria que envolve comunidade indígena: território, acordos com associações,
 * repartição de benefícios e processos de consentimento livre, prévio e informado. A
 * regra vigente da API libera LEITURA para qualquer colaborador ativo do domínio (ver o
 * comentário de PAPEIS_ESCRITA em supabase/functions/carbon-api/index.ts), o que é
 * frouxo demais para este conteúdo: a tela é candidata declarada a restrição por projeto
 * e por papel, com trilha de acesso. A decisão é do dono e NÃO foi tomada aqui; o aviso
 * de confidencialidade no cabeçalho é paliativo, não controle.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  ClipboardList,
  FolderTree,
  History,
  Languages,
  LayoutGrid,
  List,
  Paperclip,
  Plus,
  ShieldAlert,
  Tags,
  Trash2,
} from 'lucide-react';

import { listarProjetos, normalizarListaProjetos, obterProjeto } from '@/lib/api/projetos';
import {
  atualizarFinding,
  atualizarSubitemFinding,
  criarFinding,
  criarRodadaAuditoria,
  criarSubitensFinding,
  obterFindings,
  removerSubitemFinding,
} from '@/lib/api/findings';
import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import { createPageUrl } from '@/utils';
import { montarUrl } from '@/lib/pageRoutes';

import Cartao from '@/components/ui/Cartao';
import Tabela from '@/components/ui/Tabela';
import Badge from '@/components/ui/Badge';
import EstadoVazio from '@/components/ui/EstadoVazio';
import Carregando from '@/components/ui/Carregando';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import Campo from '@/components/ui/Campo';
import PainelLateral from '@/components/ui/PainelLateral';
import BarraProgresso, { pctSeguro } from '@/components/ui/BarraProgresso';
import SeletorStatus from '@/components/ui/SeletorStatus';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import CabecalhoSecao from '@/components/ui/CabecalhoSecao';

/* ===== Domínio =============================================================
   Estas listas espelham os CHECKs da migration 20260814093000_findings.sql. São
   escritas aqui, e não importadas do dataset de demonstração, porque importar de
   src/lib/demo/* arrastaria o dataset fictício para o bundle de produção.       */

const ORIGENS_META = {
  vvb: {
    rotulo: 'VVB',
    tom: 'azul',
    nome: 'Validation and Verification Body',
    descricao: 'Auditoria independente credenciada. Aponta conformidade por seção do documento.',
  },
  verra: {
    rotulo: 'Verra',
    tom: 'verde',
    nome: 'Programa Verra',
    descricao: 'Revisão do próprio programa para registro. Findings temáticos.',
  },
  bezero: {
    rotulo: 'BeZero',
    tom: 'laranja',
    nome: 'BeZero Carbon',
    descricao: 'Agência de rating. Avalia risco e influencia o preço de venda do crédito.',
  },
};

/* A ordem das chaves é a ordem das colunas do board e das opções do seletor. */
const ESTADOS_META = {
  aberto: { rotulo: 'Aberto', tom: 'vermelho' },
  em_andamento: { rotulo: 'Em andamento', tom: 'azul' },
  aguardando_terceiro: { rotulo: 'Aguardando terceiro', tom: 'ambar' },
  respondido: { rotulo: 'Respondido', tom: 'laranja' },
  fechado: { rotulo: 'Fechado', tom: 'verde' },
  nao_aplicavel: { rotulo: 'Não aplicável', tom: 'neutro' },
};

const EVIDENCIA_META = {
  pendente: { rotulo: 'Pendente', tom: 'ambar' },
  ok: { rotulo: 'OK', tom: 'verde' },
  nao_aplicavel: { rotulo: 'N/A', tom: 'neutro' },
};

/* `sem_tipo` é o grupo dos itens da BeZero: a base dela não tem a coluna de tipo,
   porque são pedidos de informação de due diligence, e não CAR nem CL. */
const SEM_TIPO = 'sem_tipo';

const TIPOS_META = {
  car: {
    rotulo: 'CAR',
    tom: 'vermelho',
    nome: 'Corrective Action Request',
    descricao: 'Não conformidade: exige correção obrigatória.',
  },
  cl: {
    rotulo: 'CL',
    tom: 'azul',
    nome: 'Clarification Request',
    descricao: 'Pedido de esclarecimento: exige resposta, não necessariamente mudança.',
  },
  [SEM_TIPO]: {
    rotulo: 'Sem tipo',
    tom: 'neutro',
    nome: 'Pedido de informação',
    descricao: 'A BeZero não classifica seus itens em CAR ou CL.',
  },
};

const DOCUMENTOS_META = {
  pdd: { rotulo: 'PDD', nome: 'Project Design Document' },
  monitoramento: { rotulo: 'Monitoramento', nome: 'Monitoring Report' },
  outro: { rotulo: 'Outro', nome: 'Sem documento específico' },
};

const ESTADO_AGUARDANDO = 'aguardando_terceiro';

const PROGRESSO_VAZIO = {
  total: 0,
  nao_aplicaveis: 0,
  considerados: 0,
  fechados: 0,
  em_aberto: 0,
  aguardando_terceiro: 0,
  pct: 0,
  considerados_evidencia: 0,
  evidencia_ok: 0,
  pct_evidencia: 0,
  subitens_total: 0,
  subitens_concluidos: 0,
  subitens_pct: null,
  por_estado: [],
  por_evidencia: [],
  por_tipo: [],
  por_origem: [],
  por_rodada: [],
};

const VISOES = [
  { chave: 'lista', rotulo: 'Lista', icone: List },
  { chave: 'board', rotulo: 'Board', icone: LayoutGrid },
  { chave: 'rodada', rotulo: 'Rodadas', icone: History },
  { chave: 'evidencia', rotulo: 'Evidências', icone: Paperclip },
  { chave: 'tipo', rotulo: 'Tipo', icone: Tags },
  { chave: 'origem', rotulo: 'Origem', icone: Building2 },
];

const OPCOES_ESTADO = Object.entries(ESTADOS_META).map(([valor, meta]) => ({
  valor,
  rotulo: meta.rotulo,
  tom: meta.tom,
}));

const OPCOES_EVIDENCIA = Object.entries(EVIDENCIA_META).map(([valor, meta]) => ({
  valor,
  rotulo: meta.rotulo,
  tom: meta.tom,
}));

/** Rótulo de rodada como a equipe fala: "VVB · rodada 2". */
function rotuloRodada(rodada) {
  if (!rodada) return 'Sem rodada';
  const origem = ORIGENS_META[rodada.origem]?.rotulo || rodada.origem;
  return `${origem} · rodada ${rodada.numero}`;
}

function dataCurta(iso) {
  if (!iso) return null;
  // Data pura (YYYY-MM-DD) precisa de horário fixo: sem ele o navegador interpreta
  // como UTC e o dia aparece um a menos nos fusos negativos, que é o caso do Brasil.
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR');
}

/* ===== Selos ============================================================== */

function BadgeOrigem({ origem, numero }) {
  const meta = ORIGENS_META[origem];
  return (
    <Badge tom={meta?.tom || 'neutro'} tamanho="sm" className="whitespace-nowrap">
      {meta?.rotulo || origem || '-'}
      {numero ? ` · R${numero}` : ''}
    </Badge>
  );
}

function BadgeTipo({ tipo }) {
  const chave = tipo || SEM_TIPO;
  const meta = TIPOS_META[chave] || TIPOS_META[SEM_TIPO];
  return (
    <span title={`${meta.nome}. ${meta.descricao}`}>
      <Badge tom={meta.tom} tamanho="sm">
        {meta.rotulo}
      </Badge>
    </span>
  );
}

function BadgeEstado({ estado }) {
  const meta = ESTADOS_META[estado];
  // Estado desconhecido aparece cru em vez de sumir: valor novo no banco não pode
  // desaparecer da tela sem ninguém notar.
  return (
    <Badge tom={meta?.tom || 'neutro'} tamanho="sm">
      {meta?.rotulo || estado || '-'}
    </Badge>
  );
}

function BadgeEvidencia({ estado }) {
  const meta = EVIDENCIA_META[estado];
  return (
    <Badge tom={meta?.tom || 'neutro'} tamanho="sm">
      {meta?.rotulo || estado || '-'}
    </Badge>
  );
}

/**
 * Resumo do checklist do finding.
 *
 * Finding SEM subitem mostra um traço, não uma barra em zero: `subitens_pct` chega nulo
 * justamente para separar "nada feito" de "este finding não usa checklist".
 */
function ChecklistResumo({ finding }) {
  const total = Number(finding?.subitens_total) || 0;
  if (total === 0) return <span className="text-[#A8B4AC]">-</span>;

  const concluidos = Number(finding?.subitens_concluidos) || 0;
  return (
    <div className="min-w-[90px]">
      <BarraProgresso
        valor={finding?.subitens_pct}
        rotuloAcessivel={`Checklist do finding ${finding?.identificador || ''}`}
      />
      <span className="text-[10px] text-[#5C7060] tabular-nums">
        {concluidos}/{total} itens
      </span>
    </div>
  );
}

/* ===== Lista de findings ================================================== */

/**
 * Colunas da tabela de findings.
 *
 * `comOrigem` some nas visões que já agrupam por origem ou por rodada, para não repetir
 * em cada linha a informação que está no cabeçalho do grupo.
 */
function colunasFindings({ comOrigem = true } = {}) {
  const colunas = [
    {
      chave: 'identificador',
      titulo: 'Item',
      larguraMinima: 110,
      render: (f) => (
        <span className="font-mono text-[11px] font-bold text-[#5C7060] tabular-nums">
          {f.identificador || (f.ordem !== null && f.ordem !== undefined ? `#${f.ordem}` : '-')}
        </span>
      ),
    },
  ];

  if (comOrigem) {
    colunas.push({
      chave: 'origem',
      titulo: 'Origem',
      larguraMinima: 120,
      render: (f) => <BadgeOrigem origem={f.origem} numero={f.rodada_numero} />,
    });
  }

  colunas.push(
    {
      chave: 'tipo',
      titulo: 'Tipo',
      larguraMinima: 80,
      render: (f) => <BadgeTipo tipo={f.tipo} />,
    },
    {
      chave: 'capitulo_ref',
      titulo: 'Onde pega',
      larguraMinima: 190,
      render: (f) => (
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
            {DOCUMENTOS_META[f.documento_alvo]?.rotulo || f.documento_alvo || '-'}
          </span>
          <p className="text-xs text-[#1A2B1F] break-words">
            {f.capitulo_pdd?.capitulo
              ? `${f.capitulo_pdd.capitulo} ${f.capitulo_pdd.nome}`
              : f.capitulo_ref || '-'}
          </p>
        </div>
      ),
    },
    {
      chave: 'descricao_en',
      titulo: 'Apontamento (inglês)',
      larguraMinima: 300,
      render: (f) => (
        <p className="text-xs text-[#5C7060] leading-relaxed line-clamp-2">
          {f.descricao_en || '-'}
        </p>
      ),
    },
    {
      chave: 'estado',
      titulo: 'Resposta',
      larguraMinima: 150,
      render: (f) => (
        <div className="space-y-1">
          <BadgeEstado estado={f.estado} />
          {f.estado === ESTADO_AGUARDANDO && f.aguardando_quem && (
            <p className="text-[10px] text-[#8A5A12]">com {f.aguardando_quem}</p>
          )}
        </div>
      ),
    },
    {
      chave: 'estado_evidencia',
      titulo: 'Evidência',
      larguraMinima: 100,
      render: (f) => <BadgeEvidencia estado={f.estado_evidencia} />,
    },
    {
      chave: 'subitens_total',
      titulo: 'Checklist',
      larguraMinima: 120,
      render: (f) => <ChecklistResumo finding={f} />,
    },
  );

  return colunas;
}

function TabelaFindings({
  findings,
  legenda,
  comOrigem = true,
  comSuperficie = true,
  carregando = false,
  erro = false,
  tituloVazio = 'Nenhum finding nesta visão',
  textoVazio,
  acaoVazio,
  onAbrir,
}) {
  const colunas = useMemo(() => colunasFindings({ comOrigem }), [comOrigem]);

  return (
    <Tabela
      legenda={legenda}
      colunas={colunas}
      dados={findings}
      carregando={carregando}
      erro={erro}
      comSuperficie={comSuperficie}
      iconeVazio={ClipboardList}
      tituloVazio={tituloVazio}
      textoVazio={textoVazio}
      acaoVazio={acaoVazio}
      onLinhaClick={onAbrir}
      rotuloLinha={(f) => `Abrir finding ${f.identificador || f.id}`}
      classeLinha={(f) => (f.estado === 'nao_aplicavel' ? 'opacity-60' : '')}
    />
  );
}

/* ===== Visão agrupada ===================================================== */

/**
 * Um grupo de findings com cabeçalho próprio. É o bloco que as visões por rodada, por
 * evidência, por tipo e por origem reaproveitam: quatro visões, um só componente.
 */
function GrupoFindings({ titulo, descricao, contadores, findings, comOrigem, onAbrir }) {
  return (
    <section className="space-y-3">
      <CabecalhoSecao
        titulo={titulo}
        descricao={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {descricao && <span>{descricao}</span>}
            {contadores}
          </span>
        }
        nivel={3}
      />
      {findings.length === 0 ? (
        <EstadoVazio
          compacto
          comSuperficie
          icone={ClipboardList}
          titulo="Nenhum finding neste grupo"
          texto="Grupo vazio aparece de propósito: some da tela um agrupamento que existe e a contagem deixa de fechar."
        />
      ) : (
        <TabelaFindings
          findings={findings}
          legenda={`Findings do grupo ${titulo}`}
          comOrigem={comOrigem}
          onAbrir={onAbrir}
        />
      )}
    </section>
  );
}

/** Contador em texto miúdo, usado nos cabeçalhos de grupo. */
function Contador({ rotulo, valor }) {
  return (
    <span className="text-[11px] text-[#5C7060]">
      <strong className="font-bold text-[#1A2B1F] tabular-nums">{valor}</strong> {rotulo}
    </span>
  );
}

/* ===== Board ============================================================== */

function CartaoFinding({ finding, salvando, onAbrir, onMudarEstado }) {
  return (
    <div
      className={`bg-white border border-[#DDE3DE] rounded-xl p-3 space-y-2 ${
        finding.estado === 'nao_aplicavel' ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onAbrir(finding)}
          className="text-left min-w-0 group"
          aria-label={`Abrir finding ${finding.identificador || finding.id}`}
        >
          <span className="font-mono text-[11px] font-bold text-[#5C7060] tabular-nums group-hover:text-[#1A4731]">
            {finding.identificador || `#${finding.ordem ?? '-'}`}
          </span>
          <p className="text-xs text-[#1A2B1F] leading-snug line-clamp-3 mt-0.5">
            {finding.descricao_en || 'Sem apontamento registrado'}
          </p>
        </button>
        <BadgeTipo tipo={finding.tipo} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <BadgeOrigem origem={finding.origem} numero={finding.rodada_numero} />
        <BadgeEvidencia estado={finding.estado_evidencia} />
      </div>

      {finding.capitulo_ref && (
        <p className="text-[10px] text-[#8A9990] break-words">{finding.capitulo_ref}</p>
      )}

      {finding.estado === ESTADO_AGUARDANDO && finding.aguardando_quem && (
        <p className="text-[10px] text-[#8A5A12]">Aguardando {finding.aguardando_quem}</p>
      )}

      <ChecklistResumo finding={finding} />

      <SeletorStatus
        valor={finding.estado}
        opcoes={OPCOES_ESTADO}
        onChange={(estado) => onMudarEstado(finding, estado)}
        carregando={salvando}
        tamanho="sm"
        rotuloAcessivel={`Estado do finding ${finding.identificador || finding.id}`}
        className="w-full"
      />
    </div>
  );
}

/**
 * Board por estado. As colunas vêm de `progresso.por_estado`, que o servidor devolve
 * SEMPRE completo, com zero onde não há finding: coluna vazia precisa aparecer, senão o
 * board parece quebrado e ninguém percebe que o estado existe.
 */
function BoardFindings({ progresso, findings, salvandoId, onAbrir, onMudarEstado }) {
  const porEstado = progresso?.por_estado?.length
    ? progresso.por_estado
    : Object.keys(ESTADOS_META).map((estado) => ({ estado, total: 0 }));

  return (
    <div
      className="overflow-x-auto pb-2"
      tabIndex={0}
      role="group"
      aria-label="Board de findings por estado"
    >
      <div className="flex gap-3 min-w-max">
        {porEstado.map(({ estado, total }) => {
          const meta = ESTADOS_META[estado] || { rotulo: estado, tom: 'neutro' };
          const doEstado = findings.filter((f) => f.estado === estado);
          return (
            <div key={estado} className="w-[280px] flex-shrink-0">
              <div className="flex items-center justify-between gap-2 px-1 pb-2">
                <Badge tom={meta.tom} tamanho="sm">
                  {meta.rotulo}
                </Badge>
                <span className="text-[11px] font-bold text-[#5C7060] tabular-nums">{total}</span>
              </div>
              <div className="bg-[#F4F6F4] rounded-2xl p-2 space-y-2 min-h-[120px]">
                {doEstado.length === 0 ? (
                  <p className="text-[11px] text-[#A8B4AC] text-center py-6">Nenhum finding</p>
                ) : (
                  doEstado.map((finding) => (
                    <CartaoFinding
                      key={finding.id}
                      finding={finding}
                      salvando={salvandoId === finding.id}
                      onAbrir={onAbrir}
                      onMudarEstado={onMudarEstado}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== Checklist do finding =============================================== */

/**
 * Subitens verificáveis.
 *
 * A caixa de inclusão aceita VÁRIAS LINHAS de uma vez porque é assim que o material
 * existe hoje: uma lista digitada dentro do campo de comentários do Notion. Colar a
 * lista inteira e ver cada linha virar item verificável é o caminho de migração sem
 * retrabalho.
 */
function Checklist({ finding, escrevendo, onCriar, onAlternar, onRemover }) {
  const [rascunho, setRascunho] = useState('');
  const subitens = Array.isArray(finding?.subitens) ? finding.subitens : [];

  // Uma linha não vazia = um item. O contador aparece no botão para a pessoa conferir
  // quantos itens vai criar ANTES de colar uma lista de trinta linhas.
  const linhas = rascunho
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean);

  const adicionar = () => {
    if (linhas.length === 0) return;
    onCriar(linhas, () => setRascunho(''));
  };

  return (
    <div className="space-y-3">
      {subitens.length > 0 && (
        <>
          <BarraProgresso
            valor={finding.subitens_pct}
            rotulo="Checklist"
            detalhe={`${finding.subitens_concluidos}/${finding.subitens_total} concluídos`}
            mostrarValor
            rotuloAcessivel="Progresso do checklist do finding"
          />
          <ul className="divide-y divide-[#F4F6F4] border border-[#DDE3DE] rounded-xl overflow-hidden">
            {subitens.map((subitem) => (
              <li key={subitem.id} className="flex items-start gap-2 px-3 py-2 bg-white">
                <input
                  type="checkbox"
                  checked={Boolean(subitem.concluido)}
                  disabled={escrevendo}
                  onChange={(evento) => onAlternar(subitem, evento.target.checked)}
                  id={`subitem-${subitem.id}`}
                  className="mt-0.5 w-4 h-4 rounded border-[#DDE3DE] text-[#1A4731] focus:ring-2 focus:ring-[#1A4731]/20 cursor-pointer disabled:cursor-wait"
                />
                <label
                  htmlFor={`subitem-${subitem.id}`}
                  className={`flex-1 text-xs leading-relaxed cursor-pointer ${
                    subitem.concluido ? 'text-[#8A9990] line-through' : 'text-[#1A2B1F]'
                  }`}
                >
                  {subitem.descricao}
                </label>
                <BotaoSecundario
                  variante="fantasma"
                  tamanho="sm"
                  icone={Trash2}
                  desabilitado={escrevendo}
                  rotuloAcessivel={`Remover o item ${subitem.descricao}`}
                  onClick={() => onRemover(subitem)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <Campo
        rotulo="Adicionar itens ao checklist"
        tipo="textarea"
        linhas={3}
        valor={rascunho}
        onChange={setRascunho}
        placeholder={
          'Uma linha por item, por exemplo:\nSection 2.3.12 - itálico\nFigure 1 - traduzir'
        }
        dica="Cole a lista inteira: cada linha vira um item verificável, com estado próprio."
        acao={
          <BotaoPrimario
            tamanho="sm"
            icone={Plus}
            onClick={adicionar}
            carregando={escrevendo}
            desabilitado={linhas.length === 0}
          >
            {linhas.length > 1 ? `Adicionar ${linhas.length} itens` : 'Adicionar item'}
          </BotaoPrimario>
        }
      />
    </div>
  );
}

/* ===== Painel de edição do finding ======================================== */

/**
 * Campo de texto longo com o IDIOMA dito no rótulo.
 *
 * O idioma no rótulo não é enfeite: é o controle que a operação não tem hoje. Vários
 * findings reais existem porque saiu conteúdo em português onde a norma exige inglês.
 */
function CampoBilingue({ rotulo, idioma, valor, onChange, dica, erro, linhas = 4, desabilitado }) {
  return (
    <Campo
      rotulo={`${rotulo} (${idioma})`}
      tipo="textarea"
      linhas={linhas}
      valor={valor ?? ''}
      onChange={onChange}
      dica={dica}
      erro={erro}
      desabilitado={desabilitado}
      className="sm:col-span-2"
      extras={{ maxLength: 5000, spellCheck: false }}
    />
  );
}

/**
 * Formulário do finding, montado com `key={finding.id}`.
 *
 * A key importa: o estado local nasce do finding e NÃO é ressincronizado a cada
 * atualização da query. Sem isso, marcar um subitem (que invalida a query) apagaria o
 * texto que a pessoa está escrevendo no plano de resposta. Trocar de finding remonta o
 * componente e recarrega os valores.
 */
function FormularioFinding({ finding, rodadas, salvando, escrevendo, onSalvar, subitensProps }) {
  const [form, setForm] = useState({
    tipo: finding.tipo ?? '',
    identificador: finding.identificador ?? '',
    documento_alvo: finding.documento_alvo ?? 'outro',
    capitulo_ref: finding.capitulo_ref ?? '',
    descricao_en: finding.descricao_en ?? '',
    acao_exigida_en: finding.acao_exigida_en ?? '',
    plano_resposta_pt: finding.plano_resposta_pt ?? '',
    resposta_oficial_en: finding.resposta_oficial_en ?? '',
    estado: finding.estado ?? 'aberto',
    estado_evidencia: finding.estado_evidencia ?? 'pendente',
    aguardando_quem: finding.aguardando_quem ?? '',
  });
  const [erros, setErros] = useState({});

  const mudar = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const rodada = rodadas.find((r) => r.id === finding.rodada_id) || null;

  const salvar = () => {
    const novos = {};
    if (!form.descricao_en.trim()) {
      novos.descricao_en = 'O apontamento do auditor é obrigatório.';
    }
    // Mesma regra do banco e da API: esperar por terceiro sem dizer por quem é o
    // problema que este estado existe para resolver.
    if (form.estado === ESTADO_AGUARDANDO && !form.aguardando_quem.trim()) {
      novos.aguardando_quem = 'Informe a área de quem se espera.';
    }
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    onSalvar({
      tipo: form.tipo || null,
      identificador: form.identificador.trim() || null,
      documento_alvo: form.documento_alvo,
      capitulo_ref: form.capitulo_ref.trim() || null,
      descricao_en: form.descricao_en.trim(),
      acao_exigida_en: form.acao_exigida_en.trim() || null,
      plano_resposta_pt: form.plano_resposta_pt.trim() || null,
      resposta_oficial_en: form.resposta_oficial_en.trim() || null,
      estado: form.estado,
      estado_evidencia: form.estado_evidencia,
      aguardando_quem: form.aguardando_quem.trim() || null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Identificação, só leitura: rodada e origem definem a que processo o finding
          responde e não se editam por aqui (mover finding de processo invalidaria a
          referência externa "resposta à rodada 2 da VVB"). */}
      <div className="flex flex-wrap items-center gap-2">
        <BadgeOrigem origem={finding.origem} numero={finding.rodada_numero} />
        <span className="text-[11px] text-[#5C7060]">{rotuloRodada(rodada)}</span>
        {rodada?.data_recebimento && (
          <span className="text-[11px] text-[#8A9990]">
            recebida em {dataCurta(rodada.data_recebimento)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo
          rotulo="Estado da resposta"
          tipo="select"
          valor={form.estado}
          onChange={mudar('estado')}
          opcoes={OPCOES_ESTADO.map(({ valor, rotulo }) => ({ valor, rotulo }))}
          dica="Não aplicável sai do denominador do progresso."
        />
        <Campo
          rotulo="Estado da evidência"
          tipo="select"
          valor={form.estado_evidencia}
          onChange={mudar('estado_evidencia')}
          opcoes={OPCOES_EVIDENCIA.map(({ valor, rotulo }) => ({ valor, rotulo }))}
          dica="Eixo independente: resposta pronta com evidência pendente é caso comum."
        />

        {form.estado === ESTADO_AGUARDANDO && (
          <Campo
            rotulo="Aguardando qual área"
            obrigatorio
            valor={form.aguardando_quem}
            onChange={mudar('aguardando_quem')}
            erro={erros.aguardando_quem}
            placeholder="jurídico, geoprocessamento, parceiro externo"
            dica="Escreva a ÁREA, nunca o nome da pessoa."
            className="sm:col-span-2"
            extras={{ maxLength: 200 }}
          />
        )}

        <Campo
          rotulo="Tipo"
          tipo="select"
          valor={form.tipo}
          onChange={mudar('tipo')}
          rotuloVazio="Sem tipo (pedido de informação)"
          opcoes={[
            { valor: 'car', rotulo: 'CAR - Corrective Action Request' },
            { valor: 'cl', rotulo: 'CL - Clarification Request' },
          ]}
        />
        <Campo
          rotulo="Identificador do auditor"
          valor={form.identificador}
          onChange={mudar('identificador')}
          placeholder="ID - 01"
          extras={{ maxLength: 100 }}
        />
        <Campo
          rotulo="Documento"
          tipo="select"
          valor={form.documento_alvo}
          onChange={mudar('documento_alvo')}
          opcoes={Object.entries(DOCUMENTOS_META).map(([valor, meta]) => ({
            valor,
            rotulo: meta.rotulo,
          }))}
        />
        <Campo
          rotulo="Onde pega"
          valor={form.capitulo_ref}
          onChange={mudar('capitulo_ref')}
          placeholder="Section 2.1.16, Entire MR, tema"
          dica={
            finding.capitulo_pdd
              ? `Vinculado ao capítulo ${finding.capitulo_pdd.capitulo} do PDD.`
              : 'Citação literal do auditor.'
          }
          extras={{ maxLength: 200 }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CampoBilingue
          rotulo="Apontamento"
          idioma="inglês"
          valor={form.descricao_en}
          onChange={mudar('descricao_en')}
          erro={erros.descricao_en}
          dica="Como o auditor redigiu. Não traduzir: é a citação que sustenta a resposta."
        />
        <CampoBilingue
          rotulo="Ação exigida"
          idioma="inglês"
          valor={form.acao_exigida_en}
          onChange={mudar('acao_exigida_en')}
          dica="Define o critério de fechamento do finding."
        />
        <CampoBilingue
          rotulo="Plano de resposta"
          idioma="português"
          valor={form.plano_resposta_pt}
          onChange={mudar('plano_resposta_pt')}
          dica="Rascunho de trabalho: decisão pendente, encaminhamento, discussão interna. NÃO vai para o auditor."
        />
        <CampoBilingue
          rotulo="Resposta oficial"
          idioma="inglês"
          valor={form.resposta_oficial_en}
          onChange={mudar('resposta_oficial_en')}
          dica="O texto que sai para a validadora. Vários findings existem por conteúdo em português onde a norma exige inglês."
        />
      </div>

      <div>
        <CabecalhoSecao
          titulo="Checklist de conferência"
          nivel={3}
          descricao="Cada item tem estado próprio, e o progresso do finding vem daqui."
        />
        <div className="mt-3">
          <Checklist finding={finding} escrevendo={escrevendo} {...subitensProps} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F4F6F4]">
        <BotaoPrimario onClick={salvar} carregando={salvando}>
          Salvar finding
        </BotaoPrimario>
      </div>
    </div>
  );
}

/* ===== Painéis de criação ================================================= */

function PainelNovaRodada({ aberto, onFechar, salvando, onSalvar }) {
  const [form, setForm] = useState({
    origem: '',
    data_recebimento: '',
    data_resposta: '',
    observacoes: '',
  });
  const [erro, setErro] = useState('');

  const mudar = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const salvar = () => {
    if (!form.origem) {
      setErro('Escolha o processo que emitiu os findings.');
      return;
    }
    setErro('');
    onSalvar({
      origem: form.origem,
      data_recebimento: form.data_recebimento || null,
      data_resposta: form.data_resposta || null,
      observacoes: form.observacoes.trim() || null,
    });
  };

  return (
    <PainelLateral
      aberto={aberto}
      onFechar={onFechar}
      icone={History}
      titulo="Nova rodada de auditoria"
      subtitulo="O número é atribuído pelo sistema, em sequência, por processo."
      largura="md"
      fecharAoClicarFora={false}
      rodape={
        <div className="flex items-center justify-end gap-2">
          <BotaoSecundario variante="fantasma" onClick={onFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario onClick={salvar} carregando={salvando}>
            Registrar rodada
          </BotaoPrimario>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo
          rotulo="Processo (origem)"
          tipo="select"
          obrigatorio
          valor={form.origem}
          onChange={mudar('origem')}
          erro={erro}
          rotuloVazio="Selecione..."
          opcoes={Object.entries(ORIGENS_META).map(([valor, meta]) => ({
            valor,
            rotulo: `${meta.rotulo} - ${meta.nome}`,
          }))}
          dica={ORIGENS_META[form.origem]?.descricao}
          className="sm:col-span-2"
        />
        <Campo
          rotulo="Recebida em"
          tipo="data"
          valor={form.data_recebimento}
          onChange={mudar('data_recebimento')}
        />
        <Campo
          rotulo="Respondida em"
          tipo="data"
          valor={form.data_resposta}
          onChange={mudar('data_resposta')}
          dica="Em branco enquanto a rodada está aberta."
        />
        <Campo
          rotulo="Observações"
          tipo="textarea"
          linhas={3}
          valor={form.observacoes}
          onChange={mudar('observacoes')}
          className="sm:col-span-2"
          extras={{ maxLength: 2000 }}
        />
      </div>
    </PainelLateral>
  );
}

function PainelNovoFinding({ aberto, onFechar, rodadas, salvando, onSalvar }) {
  const [form, setForm] = useState({
    rodada_id: rodadas[0]?.id ?? '',
    tipo: '',
    identificador: '',
    documento_alvo: 'outro',
    capitulo_ref: '',
    descricao_en: '',
    acao_exigida_en: '',
  });
  const [erros, setErros] = useState({});

  const mudar = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const salvar = () => {
    const novos = {};
    if (!form.rodada_id) novos.rodada_id = 'Escolha a rodada em que o finding foi emitido.';
    if (!form.descricao_en.trim()) novos.descricao_en = 'O apontamento do auditor é obrigatório.';
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    onSalvar(form.rodada_id, {
      tipo: form.tipo || null,
      identificador: form.identificador.trim() || null,
      documento_alvo: form.documento_alvo,
      capitulo_ref: form.capitulo_ref.trim() || null,
      descricao_en: form.descricao_en.trim(),
      acao_exigida_en: form.acao_exigida_en.trim() || null,
    });
  };

  return (
    <PainelLateral
      aberto={aberto}
      onFechar={onFechar}
      icone={ClipboardList}
      titulo="Novo finding"
      subtitulo="O apontamento chega em inglês. O plano de resposta é escrito depois, no próprio finding."
      largura="lg"
      fecharAoClicarFora={false}
      rodape={
        <div className="flex items-center justify-end gap-2">
          <BotaoSecundario variante="fantasma" onClick={onFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario onClick={salvar} carregando={salvando}>
            Cadastrar finding
          </BotaoPrimario>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo
          rotulo="Rodada"
          tipo="select"
          obrigatorio
          valor={form.rodada_id}
          onChange={mudar('rodada_id')}
          erro={erros.rodada_id}
          rotuloVazio="Selecione..."
          opcoes={rodadas.map((rodada) => ({ valor: rodada.id, rotulo: rotuloRodada(rodada) }))}
          className="sm:col-span-2"
        />
        <Campo
          rotulo="Tipo"
          tipo="select"
          valor={form.tipo}
          onChange={mudar('tipo')}
          rotuloVazio="Sem tipo (pedido de informação)"
          opcoes={[
            { valor: 'car', rotulo: 'CAR - Corrective Action Request' },
            { valor: 'cl', rotulo: 'CL - Clarification Request' },
          ]}
          dica="A BeZero não classifica seus itens."
        />
        <Campo
          rotulo="Identificador do auditor"
          valor={form.identificador}
          onChange={mudar('identificador')}
          placeholder="ID - 01"
          extras={{ maxLength: 100 }}
        />
        <Campo
          rotulo="Documento"
          tipo="select"
          valor={form.documento_alvo}
          onChange={mudar('documento_alvo')}
          opcoes={Object.entries(DOCUMENTOS_META).map(([valor, meta]) => ({
            valor,
            rotulo: meta.rotulo,
          }))}
        />
        <Campo
          rotulo="Onde pega"
          valor={form.capitulo_ref}
          onChange={mudar('capitulo_ref')}
          placeholder="Section 2.1.16, Entire MR, tema"
          extras={{ maxLength: 200 }}
        />
        <Campo
          rotulo="Apontamento (inglês)"
          tipo="textarea"
          linhas={4}
          obrigatorio
          valor={form.descricao_en}
          onChange={mudar('descricao_en')}
          erro={erros.descricao_en}
          dica="Como o auditor redigiu, sem tradução."
          className="sm:col-span-2"
          extras={{ maxLength: 5000, spellCheck: false }}
        />
        <Campo
          rotulo="Ação exigida (inglês)"
          tipo="textarea"
          linhas={3}
          valor={form.acao_exigida_en}
          onChange={mudar('acao_exigida_en')}
          className="sm:col-span-2"
          extras={{ maxLength: 5000, spellCheck: false }}
        />
      </div>
    </PainelLateral>
  );
}

/* ===== Cabeçalho ========================================================== */

function CabecalhoFindings({ projeto, progresso, carregando, rodadas }) {
  const rodadasPorOrigem = useMemo(() => {
    const mapa = new Map();
    for (const rodada of rodadas) {
      mapa.set(rodada.origem, Math.max(mapa.get(rodada.origem) ?? 0, rodada.numero));
    }
    return mapa;
  }, [rodadas]);

  const urlPddDoProjeto = projeto?.id ? montarUrl('ProjetoPdd', { id: projeto.id }) : null;

  return (
    <Cartao classeCorpo="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FolderTree size={15} className="text-[#1A4731] flex-shrink-0" />
            <h2 className="text-sm font-bold text-[#1A2B1F] break-words">
              {projeto?.nome || (carregando ? 'Carregando projeto...' : 'Projeto sem nome')}
            </h2>
          </div>
          <p className="text-xs text-[#5C7060] mt-1">
            {progresso.total} {progresso.total === 1 ? 'finding' : 'findings'} em {rodadas.length}{' '}
            {rodadas.length === 1 ? 'rodada' : 'rodadas'} de auditoria
            {rodadasPorOrigem.size > 0
              ? ` · ${[...rodadasPorOrigem.entries()]
                  .map(
                    ([chave, numero]) => `${ORIGENS_META[chave]?.rotulo || chave} na ${numero}ª`,
                  )
                  .join(', ')}`
              : ''}
          </p>
        </div>

        {urlPddDoProjeto && (
          <Link
            to={urlPddDoProjeto}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C7060] hover:text-[#1A4731] transition-colors flex-shrink-0"
          >
            Ver PDD do projeto
            <ChevronRight size={13} />
          </Link>
        )}
      </div>

      {/* Os DOIS eixos, lado a lado. Um número só esconderia o caso que a operação mais
          precisa ver: resposta fechada com evidência pendente. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BarraProgresso
          valor={progresso.pct}
          alta
          mostrarValor
          rotulo="Respostas fechadas"
          detalhe={`${progresso.fechados}/${progresso.considerados}`}
          rotuloAcessivel="Progresso das respostas"
        />
        <BarraProgresso
          valor={progresso.pct_evidencia}
          alta
          mostrarValor
          tom="azul"
          rotulo="Evidências aceitas"
          detalhe={`${progresso.evidencia_ok}/${progresso.considerados_evidencia}`}
          rotuloAcessivel="Progresso das evidências"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Contador rotulo="em aberto" valor={progresso.em_aberto} />
        <Contador rotulo="aguardando terceiro" valor={progresso.aguardando_terceiro} />
        <Contador rotulo="não aplicáveis" valor={progresso.nao_aplicaveis} />
        {progresso.subitens_total > 0 && (
          <Contador
            rotulo={`itens de checklist concluídos de ${progresso.subitens_total}`}
            valor={progresso.subitens_concluidos}
          />
        )}
      </div>

      {progresso.nao_aplicaveis > 0 && (
        <p className="text-[11px] text-[#8A9990]">
          {progresso.nao_aplicaveis}{' '}
          {progresso.nao_aplicaveis === 1
            ? 'finding marcado como não aplicável está fora'
            : 'findings marcados como não aplicáveis estão fora'}{' '}
          do cálculo, por isso o total considerado é {progresso.considerados} e não{' '}
          {progresso.total}.
        </p>
      )}

      {/* Paliativo, não controle: enquanto a leitura da API é aberta a todo colaborador
          do domínio, o mínimo é dizer na tela do que se trata. */}
      <AvisoDiscreto tom="ambar" icone={ShieldAlert} titulo="Material de auditoria confidencial.">
        Trata de território, acordos com associações e processos de consentimento de
        comunidade. Não compartilhe fora do escopo do trabalho contratado.
      </AvisoDiscreto>
    </Cartao>
  );
}

/* ===== Barra de visões e filtro ========================================== */

function BarraVisoes({ valor, onChange }) {
  return (
    <div
      className="flex flex-wrap gap-1 bg-[#F4F6F4] p-1 rounded-xl"
      role="tablist"
      aria-label="Visões dos findings"
    >
      {VISOES.map(({ chave, rotulo, icone: Icone }) => {
        const ativa = chave === valor;
        return (
          <button
            key={chave}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => onChange(chave)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
              ativa
                ? 'bg-white text-[#1A4731] shadow-sm'
                : 'text-[#5C7060] hover:text-[#1A4731] hover:bg-white/60'
            }`}
          >
            <Icone size={13} />
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Filtro por origem.
 *
 * Vai para o SERVIDOR (?origem=) e não é filtro de tela: com o recorte no servidor os
 * contadores e o progresso descem já coerentes com o que está à vista. Filtrar só no
 * cliente mostraria uma lista de 6 findings com um percentual calculado sobre 132.
 */
function FiltroOrigem({ valor, onChange, progresso }) {
  const totalPorOrigem = new Map(
    (progresso?.por_origem ?? []).map((item) => [item.origem, item.total]),
  );

  const opcoes = [
    { chave: null, rotulo: 'Todas as origens', total: progresso?.total ?? 0 },
    ...Object.entries(ORIGENS_META).map(([chave, meta]) => ({
      chave,
      rotulo: meta.rotulo,
      total: totalPorOrigem.get(chave) ?? 0,
    })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {opcoes.map((opcao) => {
        const ativa = opcao.chave === valor;
        return (
          <button
            key={opcao.chave ?? 'todas'}
            type="button"
            onClick={() => onChange(opcao.chave)}
            aria-pressed={ativa}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
              ativa
                ? 'border-[#1A4731] bg-[#1A4731] text-white'
                : 'border-[#DDE3DE] text-[#5C7060] hover:border-[#1A4731]/40 hover:text-[#1A4731]'
            }`}
          >
            {opcao.rotulo}
            {valor === null && opcao.chave !== null ? ` (${opcao.total})` : ''}
          </button>
        );
      })}
    </div>
  );
}

/* ===== Escolha do projeto ================================================= */

/**
 * Tela de /Findings, sem projeto na URL.
 *
 * Finding é sempre de UM projeto, mas uma tela cuja única URL tem `:id` não pode ter
 * item de menu. Com um projeto só cadastrado (o caso de hoje), redireciona direto e a
 * pessoa nem vê este passo.
 */
function EscolherProjeto() {
  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const navigate = useNavigate();
  const habilitado = (MODO_DEMO && MODO_DEMO_ATIVO()) || (accounts?.length ?? 0) > 0;

  const projetosQuery = useQuery({
    queryKey: ['carbon', 'projetos'],
    queryFn: async () => {
      /* normalizarListaProjetos: a chave ['carbon', 'projetos'] é compartilhada; ler o
         envelope aqui é o que impede outra tela de encontrar um formato diferente. */
      return normalizarListaProjetos(await listarProjetos(msal));
    },
    enabled: habilitado,
  });

  const projetos = useMemo(
    () => (projetosQuery.data?.projetos ?? []).filter((p) => p?.ativo !== false),
    [projetosQuery.data],
  );

  useEffect(() => {
    if (projetos.length !== 1) return;
    const destino = montarUrl('ProjetoFindings', { id: projetos[0].id });
    // replace para o botão voltar não cair de novo nesta tela intermediária.
    if (destino) navigate(destino, { replace: true });
  }, [projetos, navigate]);

  if (projetosQuery.isLoading) {
    return <Carregando rotulo="Carregando projetos" />;
  }

  if (projetosQuery.isError) {
    return (
      <AvisoDiscreto
        tom="vermelho"
        titulo="Não foi possível carregar os projetos."
        texto="Se o aviso continuar, avise a equipe responsável pelo sistema."
      />
    );
  }

  if (projetos.length === 0) {
    return (
      <EstadoVazio
        comSuperficie
        icone={ClipboardList}
        titulo="Nenhum projeto cadastrado"
        texto="Findings pertencem a um projeto: cadastre o projeto primeiro e os apontamentos de VVB, Verra e BeZero passam a ter onde morar."
        acao={
          <BotaoPrimario como="link" para={createPageUrl('Projetos')} icone={FolderTree}>
            Ir para Projetos
          </BotaoPrimario>
        }
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <CabecalhoSecao
        titulo="Escolha o projeto"
        descricao="Os findings de VVB, Verra e BeZero são sempre de um projeto."
      />
      <div className="space-y-2">
        {projetos.map((projeto) => (
          <Link
            key={projeto.id}
            to={montarUrl('ProjetoFindings', { id: projeto.id }) || '#'}
            className="flex items-center justify-between gap-3 bg-white border border-[#DDE3DE] rounded-2xl shadow-sm px-4 py-3 hover:border-[#1A4731]/40 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1A2B1F] break-words">{projeto.nome}</p>
              <p className="text-xs text-[#5C7060]">
                {projeto.proponente || 'Proponente não informado'}
              </p>
            </div>
            <ChevronRight size={16} className="text-[#8A9990] flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ===== Tela do projeto ==================================================== */

function FindingsDoProjeto({ projetoId }) {
  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const queryClient = useQueryClient();

  const [visao, setVisao] = useState('lista');
  const [origem, setOrigem] = useState(null);
  const [findingAbertoId, setFindingAbertoId] = useState(null);
  const [novoFindingAberto, setNovoFindingAberto] = useState(false);
  const [novaRodadaAberta, setNovaRodadaAberta] = useState(false);
  const [salvandoId, setSalvandoId] = useState(null);

  /* Em modo demonstração não existe conta no MSAL (o login fica desabilitado) e as
     funções da API não usam token, então `autenticado` não pode ser exigido: a tela
     ficaria vazia no único modo em que ela é revisável sem Supabase. */
  const habilitado = ((MODO_DEMO && MODO_DEMO_ATIVO()) || (accounts?.length ?? 0) > 0) && Boolean(projetoId);

  const projetoQuery = useQuery({
    queryKey: ['carbon', 'projeto', projetoId],
    queryFn: async () => {
      const resposta = await obterProjeto(msal, projetoId);
      return resposta?.projeto ?? null;
    },
    enabled: habilitado,
  });

  const chaveFindings = ['carbon', 'findings', projetoId, origem ?? 'todas'];

  const findingsQuery = useQuery({
    queryKey: chaveFindings,
    queryFn: async () => {
      const resposta = await obterFindings(msal, projetoId, { origem });
      return {
        rodadas: Array.isArray(resposta?.rodadas) ? resposta.rodadas : [],
        findings: Array.isArray(resposta?.findings) ? resposta.findings : [],
        progresso: resposta?.progresso ?? PROGRESSO_VAZIO,
      };
    },
    enabled: habilitado,
  });

  const projeto = projetoQuery.data ?? null;
  const rodadas = findingsQuery.data?.rodadas ?? [];
  const findings = findingsQuery.data?.findings ?? [];
  const progresso = findingsQuery.data?.progresso ?? PROGRESSO_VAZIO;

  const findingAberto = useMemo(
    () => findings.find((f) => f.id === findingAbertoId) ?? null,
    [findings, findingAbertoId],
  );

  const invalidar = () => {
    // Todas as variações de origem, porque uma escrita muda os contadores de qualquer
    // recorte, não só do que está à vista.
    queryClient.invalidateQueries({ queryKey: ['carbon', 'findings', projetoId] });
  };

  const aoFalhar = (padrao) => (erro) => toast.error(erro?.message || padrao);

  const salvarFinding = useMutation({
    mutationFn: ({ id, dados }) => atualizarFinding(msal, id, dados),
    onMutate: ({ id }) => setSalvandoId(id),
    onSuccess: () => {
      invalidar();
      toast.success('Finding salvo.');
    },
    onError: aoFalhar('Não foi possível salvar o finding agora.'),
    onSettled: () => setSalvandoId(null),
  });

  const criarFindingMut = useMutation({
    mutationFn: ({ rodadaId, dados }) => criarFinding(msal, rodadaId, dados),
    onSuccess: (resposta) => {
      invalidar();
      setNovoFindingAberto(false);
      // Abre o finding recém-criado: quem cadastra o apontamento normalmente já quer
      // escrever o plano de resposta e montar o checklist.
      if (resposta?.finding?.id) setFindingAbertoId(resposta.finding.id);
      toast.success('Finding cadastrado.');
    },
    onError: aoFalhar('Não foi possível cadastrar o finding agora.'),
  });

  const criarRodadaMut = useMutation({
    mutationFn: (dados) => criarRodadaAuditoria(msal, projetoId, dados),
    onSuccess: (resposta) => {
      invalidar();
      setNovaRodadaAberta(false);
      const rodada = resposta?.rodada;
      toast.success(
        rodada ? `${rotuloRodada(rodada)} registrada.` : 'Rodada de auditoria registrada.',
      );
    },
    onError: aoFalhar('Não foi possível registrar a rodada agora.'),
  });

  const criarSubitens = useMutation({
    mutationFn: ({ findingId, descricoes }) =>
      criarSubitensFinding(msal, findingId, { descricoes }),
    onSuccess: (resposta, variaveis) => {
      invalidar();
      variaveis?.aoConcluir?.();
      const criados = Number(resposta?.criados) || 0;
      toast.success(`${criados} ${criados === 1 ? 'item adicionado' : 'itens adicionados'}.`);
    },
    onError: aoFalhar('Não foi possível adicionar os itens agora.'),
  });

  const alternarSubitem = useMutation({
    mutationFn: ({ id, concluido }) => atualizarSubitemFinding(msal, id, { concluido }),
    onSuccess: invalidar,
    onError: aoFalhar('Não foi possível salvar o item agora.'),
  });

  const removerSubitem = useMutation({
    mutationFn: ({ id }) => removerSubitemFinding(msal, id),
    onSuccess: () => {
      invalidar();
      toast.success('Item removido.');
    },
    onError: aoFalhar('Não foi possível remover o item agora.'),
  });

  /**
   * Mudança de estado direto no board.
   *
   * 'aguardando_terceiro' exige a área de quem se espera (regra do banco e da API), e
   * essa informação não cabe num select: abrimos o painel em vez de mandar um PATCH que
   * voltaria como erro de campo obrigatório.
   */
  const mudarEstadoNoBoard = (finding, estado) => {
    if (estado === finding.estado) return;
    if (estado === ESTADO_AGUARDANDO && !finding.aguardando_quem) {
      setFindingAbertoId(finding.id);
      toast.info('Informe no painel a área de quem se espera antes de marcar esta espera.');
      return;
    }
    salvarFinding.mutate({ id: finding.id, dados: { estado } });
  };

  const escrevendoSubitens =
    criarSubitens.isPending || alternarSubitem.isPending || removerSubitem.isPending;

  const subitensProps = {
    onCriar: (descricoes, aoConcluir) =>
      criarSubitens.mutate({ findingId: findingAbertoId, descricoes, aoConcluir }),
    onAlternar: (subitem, concluido) => alternarSubitem.mutate({ id: subitem.id, concluido }),
    onRemover: (subitem) => removerSubitem.mutate({ id: subitem.id }),
  };

  /* ===== Estados de exceção, antes do conteúdo ===== */

  const codigoErro = projetoQuery.error?.codigo || findingsQuery.error?.codigo || null;
  if (codigoErro === 'nao_encontrado' || codigoErro === 'id_invalido') {
    return (
      <EstadoVazio
        comSuperficie
        icone={ClipboardList}
        titulo="Projeto não encontrado"
        texto="O projeto pode ter sido removido, ou o endereço está incorreto."
        acao={
          <BotaoSecundario como="link" para={createPageUrl('Projetos')} icone={ArrowLeft}>
            Voltar para Projetos
          </BotaoSecundario>
        }
      />
    );
  }

  const carregando = projetoQuery.isLoading || findingsQuery.isLoading;

  /* ===== Visões ===== */

  const grupos = (() => {
    if (visao === 'rodada') {
      return rodadas.map((rodada) => {
        const doGrupo = findings.filter((f) => f.rodada_id === rodada.id);
        const contagem = (progresso.por_rodada ?? []).find((r) => r.rodada_id === rodada.id);
        return {
          chave: rodada.id,
          titulo: rotuloRodada(rodada),
          descricao: [
            rodada.data_recebimento ? `recebida em ${dataCurta(rodada.data_recebimento)}` : null,
            rodada.data_resposta
              ? `respondida em ${dataCurta(rodada.data_resposta)}`
              : 'sem resposta enviada',
          ]
            .filter(Boolean)
            .join(' · '),
          contadores: (
            <>
              <Contador rotulo="findings" valor={contagem?.total ?? doGrupo.length} />
              <Contador rotulo="fechados" valor={contagem?.fechados ?? 0} />
              <span className="text-[11px] font-bold text-[#1A2B1F] tabular-nums">
                {pctSeguro(contagem?.pct)}%
              </span>
            </>
          ),
          findings: doGrupo,
          comOrigem: false,
        };
      });
    }

    if (visao === 'evidencia') {
      return (progresso.por_evidencia ?? []).map((item) => {
        const meta = EVIDENCIA_META[item.estado_evidencia] || { rotulo: item.estado_evidencia };
        return {
          chave: item.estado_evidencia,
          titulo: `Evidência: ${meta.rotulo}`,
          descricao:
            item.estado_evidencia === 'nao_aplicavel'
              ? 'Fora do denominador do progresso de evidência.'
              : null,
          contadores: <Contador rotulo="findings" valor={item.total} />,
          findings: findings.filter((f) => f.estado_evidencia === item.estado_evidencia),
          comOrigem: true,
        };
      });
    }

    if (visao === 'tipo') {
      return (progresso.por_tipo ?? []).map((item) => {
        const meta = TIPOS_META[item.tipo] || TIPOS_META[SEM_TIPO];
        return {
          chave: item.tipo,
          titulo: `${meta.rotulo} - ${meta.nome}`,
          descricao: meta.descricao,
          contadores: <Contador rotulo="findings" valor={item.total} />,
          findings: findings.filter((f) => (f.tipo ?? SEM_TIPO) === item.tipo),
          comOrigem: true,
        };
      });
    }

    if (visao === 'origem') {
      return (progresso.por_origem ?? []).map((item) => {
        const meta = ORIGENS_META[item.origem] || { rotulo: item.origem, nome: '', descricao: '' };
        return {
          chave: item.origem,
          titulo: `${meta.rotulo} - ${meta.nome}`,
          descricao: meta.descricao,
          contadores: (
            <>
              <Contador rotulo="findings" valor={item.total} />
              <Contador rotulo="fechados" valor={item.fechados} />
              <span className="text-[11px] font-bold text-[#1A2B1F] tabular-nums">
                {pctSeguro(item.pct)}%
              </span>
            </>
          ),
          findings: findings.filter((f) => f.origem === item.origem),
          comOrigem: false,
        };
      });
    }

    return [];
  })();

  const semRodadas = !carregando && rodadas.length === 0;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <Link
        to={createPageUrl('Projetos')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C7060] hover:text-[#1A4731] transition-colors"
      >
        <ArrowLeft size={13} />
        Projetos
      </Link>

      <CabecalhoFindings
        projeto={projeto}
        progresso={progresso}
        carregando={carregando}
        rodadas={rodadas}
      />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <BarraVisoes valor={visao} onChange={setVisao} />
        <div className="flex flex-wrap items-center gap-2">
          <BotaoSecundario
            icone={History}
            tamanho="sm"
            onClick={() => setNovaRodadaAberta(true)}
          >
            Nova rodada
          </BotaoSecundario>
          <BotaoPrimario
            icone={Plus}
            tamanho="sm"
            onClick={() => setNovoFindingAberto(true)}
            desabilitado={rodadas.length === 0}
            titulo={
              rodadas.length === 0
                ? 'Registre uma rodada de auditoria antes de cadastrar findings.'
                : undefined
            }
          >
            Novo finding
          </BotaoPrimario>
        </div>
      </div>

      <FiltroOrigem valor={origem} onChange={setOrigem} progresso={progresso} />

      {/* Na visão de lista o próprio bloco de erro da Tabela dá o aviso, e dois avisos
          para a mesma falha só fazem a pessoa procurar dois problemas. */}
      {findingsQuery.isError && visao !== 'lista' && (
        <AvisoDiscreto texto="Não foi possível carregar os findings agora. Se o aviso continuar, avise a equipe responsável pelo sistema." />
      )}

      {semRodadas ? (
        <EstadoVazio
          comSuperficie
          icone={History}
          titulo="Nenhuma rodada de auditoria registrada"
          texto="Findings chegam em rodadas, e a rodada é o que guarda quando o pacote chegou e quando a resposta saiu. Registre a primeira rodada do processo (VVB, Verra ou BeZero) e os apontamentos passam a ter onde morar."
          acao={
            <BotaoPrimario icone={History} onClick={() => setNovaRodadaAberta(true)}>
              Registrar rodada
            </BotaoPrimario>
          }
        />
      ) : visao === 'lista' ? (
        <TabelaFindings
          findings={findings}
          legenda="Findings de auditoria do projeto"
          carregando={carregando}
          erro={findingsQuery.isError}
          tituloVazio="Nenhum finding cadastrado"
          textoVazio="Cadastre o primeiro apontamento da rodada para começar a controlar resposta, evidência e checklist."
          acaoVazio={
            <BotaoPrimario icone={Plus} onClick={() => setNovoFindingAberto(true)}>
              Novo finding
            </BotaoPrimario>
          }
          onAbrir={(finding) => setFindingAbertoId(finding.id)}
        />
      ) : carregando ? (
        <Carregando rotulo="Carregando findings" />
      ) : visao === 'board' ? (
        <BoardFindings
          progresso={progresso}
          findings={findings}
          salvandoId={salvandoId}
          onAbrir={(finding) => setFindingAbertoId(finding.id)}
          onMudarEstado={mudarEstadoNoBoard}
        />
      ) : (
        <div className="space-y-8">
          {grupos.map((grupo) => (
            <GrupoFindings
              key={grupo.chave}
              titulo={grupo.titulo}
              descricao={grupo.descricao}
              contadores={grupo.contadores}
              findings={grupo.findings}
              comOrigem={grupo.comOrigem}
              onAbrir={(finding) => setFindingAbertoId(finding.id)}
            />
          ))}
        </div>
      )}

      {/* ===== Painéis ===== */}

      <PainelLateral
        aberto={Boolean(findingAberto)}
        onFechar={() => setFindingAbertoId(null)}
        icone={Languages}
        titulo={
          findingAberto
            ? `Finding ${findingAberto.identificador || ''}`.trim()
            : 'Finding'
        }
        subtitulo={
          findingAberto
            ? `${ORIGENS_META[findingAberto.origem]?.rotulo || findingAberto.origem} · rodada ${
                findingAberto.rodada_numero
              } · apontamento em inglês, plano de resposta em português`
            : null
        }
        largura="xl"
        fecharAoClicarFora={false}
      >
        {findingAberto && (
          <FormularioFinding
            key={findingAberto.id}
            finding={findingAberto}
            rodadas={rodadas}
            salvando={salvarFinding.isPending}
            escrevendo={escrevendoSubitens}
            onSalvar={(dados) => salvarFinding.mutate({ id: findingAberto.id, dados })}
            subitensProps={subitensProps}
          />
        )}
      </PainelLateral>

      {novoFindingAberto && (
        <PainelNovoFinding
          aberto={novoFindingAberto}
          onFechar={() => setNovoFindingAberto(false)}
          rodadas={rodadas}
          salvando={criarFindingMut.isPending}
          onSalvar={(rodadaId, dados) => criarFindingMut.mutate({ rodadaId, dados })}
        />
      )}

      {novaRodadaAberta && (
        <PainelNovaRodada
          aberto={novaRodadaAberta}
          onFechar={() => setNovaRodadaAberta(false)}
          salvando={criarRodadaMut.isPending}
          onSalvar={(dados) => criarRodadaMut.mutate(dados)}
        />
      )}
    </div>
  );
}

/* ===== Página ============================================================= */

/**
 * A mesma tela responde a duas rotas registradas (ver src/paginas/findings.paginas.js):
 * '/Findings', que é o item de menu e pede o projeto, e '/Projetos/:id/Findings', que é
 * a URL compartilhável. O desvio acontece aqui, e não com hook condicional: cada caminho
 * é um componente próprio, com os seus hooks.
 */
export default function ProjetoFindings() {
  const { id: projetoId } = useParams();
  if (!projetoId) return <EscolherProjeto />;
  return <FindingsDoProjeto projetoId={projetoId} />;
}

/**
 * Atividades - base única de atividades, com projeto como dimensão (issues #7 e #8).
 *
 * O levantamento encontrou DUAS bases quase idênticas no Notion, uma do backoffice e uma
 * do projeto, divergindo em detalhes acidentais. Aqui é uma só: `projeto_id` é uma
 * dimensão opcional, e atividade de backoffice simplesmente não tem projeto.
 *
 * AS QUATRO VIEWS são as mesmas que a equipe já usa (em andamento, por status, timeline
 * e concluídas), e são calculadas no CLIENTE a partir de uma única listagem. Isso não é
 * economia de rota: é o que garante que a contagem e a soma de horas do rodapé fechem
 * exatamente com as linhas que estão na tela, em qualquer view.
 *
 * A TIMELINE NÃO É ENFEITE. É como a equipe enxerga sobreposição de prazos, e por isso
 * está aqui em CSS grid puro, sem biblioteca nova: cada coluna é uma semana, cada barra
 * ocupa as semanas que a atividade atravessa.
 *
 * AUTORIZAÇÃO: quem pode escrever é decidido no SERVIDOR (papel admin ou gestor, 403
 * 'sem_permissao'), e o consolidado de horas é restrito pelo mesmo critério. A tela não
 * esconde ação por perfil de propósito - seria uma segunda fonte de verdade para a mesma
 * regra. A única exceção é o consolidado, que trata o 403 como estado normal e explica a
 * restrição em vez de mostrar erro, porque não ver o consolidado é a situação esperada
 * para a maior parte da equipe.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus, ClipboardList, Clock, Pencil, Flag, Lock, TrendingUp, Search,
  Trash2, ChevronDown, ChevronRight, FolderTree, User, CalendarDays, ArrowRight,
} from 'lucide-react';

import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import { createPageUrl } from '@/utils';
import {
  listarAtividades,
  criarAtividade,
  atualizarAtividade,
  repriorizarAtividades,
  listarApontamentos,
  removerApontamento,
  obterResumoHoras,
} from '@/lib/api/atividades';
import { listarProjetos, normalizarListaProjetos } from '@/lib/api/projetos';

import Cartao from '@/components/ui/Cartao';
import CabecalhoSecao from '@/components/ui/CabecalhoSecao';
import Tabela from '@/components/ui/Tabela';
import Badge, { corSolidaDoTom } from '@/components/ui/Badge';
import EstadoVazio from '@/components/ui/EstadoVazio';
import Carregando from '@/components/ui/Carregando';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import Campo from '@/components/ui/Campo';
import PainelLateral from '@/components/ui/PainelLateral';
import BarraProgresso from '@/components/ui/BarraProgresso';
import SeletorStatus from '@/components/ui/SeletorStatus';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';

/* ===== Domínio ============================================================
   Espelham os CHECK de carbon_atividades. Valor fora destes mapas continua aparecendo
   na tela com o rótulo cru (o SeletorStatus preserva valor desconhecido), em vez de
   sumir: assim um status novo criado no banco antes do deploy do frontend não faz a
   linha mentir sobre o próprio estado.                                            */

const STATUS = {
  nao_iniciada: { label: 'Não iniciada', tom: 'neutro' },
  em_andamento: { label: 'Em andamento', tom: 'azul' },
  concluida: { label: 'Concluída', tom: 'verde' },
  cancelada: { label: 'Cancelada', tom: 'vermelho' },
};

const OPCOES_STATUS = Object.entries(STATUS).map(([valor, v]) => ({
  valor,
  rotulo: v.label,
  tom: v.tom,
}));

/* A ordem das chaves (alta, média, baixa) é a mesma do order by da função SQL
   carbon_atividades_listar, para o seletor apresentar a escala na direção em que a
   reunião semanal pensa: o que sobe primeiro. */
const PRIORIDADES = {
  alta: { label: 'Alta', tom: 'vermelho' },
  media: { label: 'Média', tom: 'ambar' },
  baixa: { label: 'Baixa', tom: 'neutro' },
};

const OPCOES_PRIORIDADE = Object.entries(PRIORIDADES).map(([valor, v]) => ({
  valor,
  rotulo: v.label,
  tom: v.tom,
}));

/** Rótulos das frentes de negócio, na grafia que a equipe usa. */
const TIPOS = {
  consultoria: 'Consultoria',
  novos_negocios: 'Novos Negócios',
  projeto: 'Projeto',
  backoffice: 'Backoffice',
  jpf: 'JPF',
};

const VIEWS = [
  { chave: 'andamento', label: 'Em andamento' },
  { chave: 'status', label: 'Por status' },
  { chave: 'timeline', label: 'Timeline' },
  { chave: 'concluidas', label: 'Concluídas' },
];

/** Ordem dos grupos na view "Por status": do mais cru ao encerrado. */
const ORDEM_STATUS = ['em_andamento', 'nao_iniciada', 'concluida', 'cancelada'];

/* ===== Formatação ========================================================= */

function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** Horas em pt-BR, sem casas decimais inúteis: 4 e não 4,00; 3,5 e não 3,50. */
function fmtHoras(valor) {
  const n = numero(valor);
  if (n === null) return '-';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtPct(valor) {
  const n = numero(valor);
  if (n === null) return '-';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

/* ===== Datas ==============================================================
   Feito na mão, e sempre no fuso LOCAL. new Date('2026-08-10') é interpretado como
   meia-noite UTC e, no fuso do Brasil, volta um dia - numa tela de prazo isso mostraria
   sempre o dia anterior ao combinado. Os mesmos auxiliares existem em MinhasHoras.jsx:
   são quinze linhas e as duas telas do domínio precisam delas, e não há arquivo
   compartilhado de utilidades de data no projeto para receber isso.               */

const doisDigitos = (n) => String(n).padStart(2, '0');

function paraData(iso) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  if (!partes) return null;
  const data = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return Number.isNaN(data.getTime()) ? null : data;
}

function paraIso(data) {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

function somarDias(iso, dias) {
  const data = paraData(iso);
  if (!data) return null;
  data.setDate(data.getDate() + dias);
  return paraIso(data);
}

/**
 * Segunda-feira da semana. MESMA regra do date_trunc('week') do PostgreSQL (ISO),
 * usada pela função carbon_horas_resumo e pela grade de Minhas Horas: a semana vai de
 * segunda a domingo. Divergir aqui colocaria a mesma atividade em colunas diferentes na
 * timeline e no consolidado.
 */
function inicioDaSemana(iso) {
  const data = paraData(iso);
  if (!data) return null;
  const diaSemana = data.getDay(); // 0 domingo ... 6 sábado
  data.setDate(data.getDate() + (diaSemana === 0 ? -6 : 1 - diaSemana));
  return paraIso(data);
}

function diferencaEmDias(isoA, isoB) {
  const a = paraData(isoA);
  const b = paraData(isoB);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function fmtData(iso) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : '-';
}

function fmtDiaMes(iso) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return partes ? `${partes[3]}/${partes[2]}` : '-';
}

const HOJE = paraIso(new Date());

/* ===== Formulário ========================================================= */

const FORM_VAZIO = {
  nome: '',
  descricao: '',
  projeto_id: '',
  tipo: 'backoffice',
  status: 'nao_iniciada',
  prioridade: 'media',
  data_inicio: '',
  data_fim: '',
  horas_planejadas: '',
};

function formDaAtividade(atividade) {
  return {
    ...FORM_VAZIO,
    nome: atividade?.nome ?? '',
    descricao: atividade?.descricao ?? '',
    projeto_id: atividade?.projeto_id ?? '',
    tipo: atividade?.tipo || 'backoffice',
    status: atividade?.status || 'nao_iniciada',
    prioridade: atividade?.prioridade || 'media',
    data_inicio: atividade?.data_inicio ?? '',
    data_fim: atividade?.data_fim ?? '',
    horas_planejadas:
      atividade?.horas_planejadas === null || atividade?.horas_planejadas === undefined
        ? ''
        : String(atividade.horas_planejadas),
  };
}

/* Ponto seguido de exatamente três dígitos: assinatura do separador de milhar em pt-BR.
   Mesma regra de lerNumero na Edge Function - "1.250" seria lido como 1,25 hora. */
const SEPARADOR_MILHAR = /\.\d{3}(?!\d)/;

/** Teto igual ao LIMITE_HORAS_PLANEJADAS da Edge Function. */
const LIMITE_HORAS_PLANEJADAS = 100000;

const CAMPOS_DATA = ['data_inicio', 'data_fim'];
/** NOT NULL com default no banco: em branco são OMITIDOS, nunca enviados como null. */
const CAMPOS_COM_DEFAULT = ['status', 'prioridade', 'tipo'];

/**
 * Monta o corpo da requisição. Lança Error com a mensagem de interface na primeira
 * inconsistência; quem chama mostra em toast.
 *
 * @param editando true quando é PATCH: campo em branco passa a significar "limpar", e
 *        por isso vai como null explícito. Omitir significaria "mantenha o valor atual"
 *        para a Edge Function, e apagar um prazo já preenchido seria impossível com a
 *        tela ainda dizendo "Atividade atualizada".
 */
function montarPayload(form, editando = false) {
  const nome = String(form.nome ?? '').trim();
  if (!nome) throw new Error('Informe o nome da atividade.');

  const payload = { nome };

  const descricao = String(form.descricao ?? '').trim();
  if (descricao) payload.descricao = descricao;
  else if (editando) payload.descricao = null;

  const projetoId = String(form.projeto_id ?? '').trim();
  if (projetoId) payload.projeto_id = projetoId;
  else if (editando) payload.projeto_id = null;

  for (const campo of CAMPOS_DATA) {
    const valor = String(form[campo] ?? '').trim();
    if (valor) payload[campo] = valor;
    else if (editando) payload[campo] = null;
  }

  for (const campo of CAMPOS_COM_DEFAULT) {
    const valor = String(form[campo] ?? '').trim();
    if (valor) payload[campo] = valor;
  }

  // Comparação de string funciona porque 'AAAA-MM-DD' é ordenável lexicograficamente.
  if (payload.data_inicio && payload.data_fim && payload.data_fim < payload.data_inicio) {
    throw new Error('O fim da atividade não pode ser anterior ao início.');
  }

  const horasBruta = String(form.horas_planejadas ?? '').trim();
  if (horasBruta) {
    if (SEPARADOR_MILHAR.test(horasBruta)) {
      throw new Error(
        'Digite as horas sem ponto de milhar, usando vírgula apenas como separador decimal. Exemplo: 1250,5.',
      );
    }
    const n = Number(horasBruta.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('As horas planejadas devem ser um número maior ou igual a zero.');
    }
    if (n > LIMITE_HORAS_PLANEJADAS) {
      throw new Error('As horas planejadas passaram do limite aceito. Confira o valor digitado.');
    }
    payload.horas_planejadas = n;
  } else if (editando) {
    payload.horas_planejadas = null;
  }

  return payload;
}

/* ===== Blocos de interface ================================================ */

/** Soma de horas e contagem do conjunto que está na tela. */
function totalizar(lista) {
  const planejadas = lista.reduce((soma, a) => soma + (numero(a?.horas_planejadas) ?? 0), 0);
  const executadas = lista.reduce((soma, a) => soma + (numero(a?.horas_executadas) ?? 0), 0);
  return {
    itens: lista.length,
    // Arredondado porque a soma de float acumula resíduo e este número vai para a tela.
    planejadas: Math.round(planejadas * 100) / 100,
    executadas: Math.round(executadas * 100) / 100,
  };
}

/**
 * Planejado x realizado de uma atividade.
 *
 * A aderência vem PRONTA do servidor (coluna aderencia_pct, calculada por
 * public.carbon_aderencia_pct na mesma consulta da lista). Recalcular aqui criaria uma
 * terceira cópia da fórmula, e a tela poderia mostrar um percentual diferente do que o
 * consolidado mostra para a mesma atividade.
 *
 * Passar de 100% NÃO é conclusão, é estouro de horas: fica em vermelho, e o percentual
 * sai por escrito porque a barra satura em 100 e esconderia justamente o excesso.
 */
function Horas({ atividade, compacto = false }) {
  const planejadas = numero(atividade?.horas_planejadas);
  const executadas = numero(atividade?.horas_executadas) ?? 0;
  const pct = numero(atividade?.aderencia_pct);
  const estourou = pct !== null && pct > 100;

  return (
    <div className="min-w-0">
      <p className="text-xs text-[#1A2B1F] tabular-nums whitespace-nowrap">
        <span className="font-semibold">{fmtHoras(executadas)} h</span>
        <span className="text-[#8A9990]">
          {' '}
          de {planejadas === null ? 'sem plano' : `${fmtHoras(planejadas)} h`}
        </span>
      </p>

      {pct === null ? (
        <p className="text-[10px] text-[#8A9990] mt-1 leading-snug">
          Sem horas planejadas: não há aderência a calcular.
        </p>
      ) : (
        <>
          <BarraProgresso
            valor={pct}
            tom={estourou ? 'vermelho' : 'laranja'}
            tomCompleto={estourou ? null : 'verde'}
            rotuloAcessivel={`Aderência de horas de ${atividade?.nome ?? 'atividade'}`}
            className="mt-1.5"
          />
          {!compacto && (
            <p
              className={`text-[10px] mt-1 tabular-nums ${estourou ? 'font-semibold text-[#8F2A1E]' : 'text-[#8A9990]'}`}
            >
              {fmtPct(pct)}% do planejado
              {estourou ? ' (acima do previsto)' : ''}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** Nome da atividade com as dimensões que a identificam: projeto, tipo e responsável. */
function Identificacao({ atividade }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-[#1A2B1F] leading-snug break-words">
        {atividade?.nome || 'Atividade sem nome'}
      </p>

      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        <Badge tom="neutro" tamanho="sm">
          {TIPOS[atividade?.tipo] || atividade?.tipo || 'Sem tipo'}
        </Badge>
        {atividade?.projeto_id ? (
          <Badge tom="verde" tamanho="sm" icone={FolderTree}>
            {atividade?.projeto_nome || 'Projeto'}
          </Badge>
        ) : (
          <span className="text-[10px] text-[#A8B4AC]">Sem projeto</span>
        )}
      </div>

      <p className="flex items-center gap-1 text-[10px] text-[#8A9990] mt-1.5">
        <User size={10} className="flex-shrink-0" aria-hidden="true" />
        {atividade?.responsavel_nome || 'Sem responsável'}
      </p>

      {atividade?.descricao && (
        <p className="text-[11px] text-[#5C7060] mt-1.5 leading-relaxed break-words">
          {atividade.descricao}
        </p>
      )}
    </div>
  );
}

/** Prazo. Atividade com só uma das pontas é o caso normal, não um erro de cadastro. */
function Prazo({ atividade }) {
  const inicio = atividade?.data_inicio;
  const fim = atividade?.data_fim;
  const aberta = atividade?.status !== 'concluida' && atividade?.status !== 'cancelada';
  const atrasada = aberta && fim && fim < HOJE;

  if (!inicio && !fim) {
    return <span className="text-[11px] text-[#A8B4AC]">Sem prazo definido</span>;
  }

  return (
    <div className="whitespace-nowrap">
      <p className="text-xs text-[#1A2B1F] tabular-nums">
        {inicio ? fmtData(inicio) : 'sem início'} a {fim ? fmtData(fim) : 'sem fim'}
      </p>
      {atrasada && (
        <Badge tom="vermelho" tamanho="sm" className="mt-1">
          Prazo vencido
        </Badge>
      )}
    </div>
  );
}

/**
 * Timeline em CSS grid puro, sem biblioteca nova.
 *
 * Uma coluna por SEMANA (e não por dia): a operação raciocina em semanas na reunião
 * semanal, e um eixo em dias tornaria a grade larga demais para caber sem perder a
 * leitura de sobreposição, que é o único motivo de a timeline existir.
 *
 * As faixas vazias são renderizadas como elementos de verdade (e não desenhadas como
 * fundo) porque é isso que dá a linha divisória entre semanas; a barra vai por cima, na
 * mesma linha da grade, com posicionamento explícito de coluna.
 */
function Timeline({ atividades }) {
  const dados = useMemo(() => {
    const comData = atividades.filter((a) => a?.data_inicio || a?.data_fim);
    const semData = atividades.filter((a) => !a?.data_inicio && !a?.data_fim);

    if (!comData.length) return { semanas: [], linhas: [], semData };

    let menor = null;
    let maior = null;
    for (const a of comData) {
      // Atividade com só uma ponta vira uma barra de uma semana naquela ponta.
      const inicio = a.data_inicio || a.data_fim;
      const fim = a.data_fim || a.data_inicio;
      if (!menor || inicio < menor) menor = inicio;
      if (!maior || fim > maior) maior = fim;
    }

    const primeiraSemana = inicioDaSemana(menor);
    const ultimaSemana = inicioDaSemana(maior);
    const quantidade = Math.floor(diferencaEmDias(primeiraSemana, ultimaSemana) / 7) + 1;
    const semanas = Array.from({ length: quantidade }, (_, i) => somarDias(primeiraSemana, i * 7));

    const colunaDe = (iso) =>
      Math.floor(diferencaEmDias(primeiraSemana, inicioDaSemana(iso)) / 7);

    const linhas = comData.map((a) => {
      const inicio = a.data_inicio || a.data_fim;
      const fim = a.data_fim || a.data_inicio;
      const coluna = Math.max(0, colunaDe(inicio));
      const colunaFim = Math.min(quantidade - 1, colunaDe(fim));
      return { atividade: a, coluna, span: Math.max(1, colunaFim - coluna + 1) };
    });

    const semanaDeHoje = inicioDaSemana(HOJE);
    const colunaHoje =
      semanaDeHoje >= primeiraSemana && semanaDeHoje <= ultimaSemana ? colunaDe(HOJE) : null;

    return { semanas, linhas, semData, colunaHoje };
  }, [atividades]);

  if (!dados.semanas.length) {
    return (
      <EstadoVazio
        comSuperficie
        icone={CalendarDays}
        titulo="Nenhuma atividade com prazo definido"
        texto="A timeline mostra sobreposição de prazos, então precisa de pelo menos uma atividade com data de início ou de fim. Edite uma atividade e preencha o prazo."
      />
    );
  }

  // 1 coluna fixa para o nome + uma por semana. Sem `1fr` na coluna do nome, o texto
  // longo empurraria as semanas e a grade deixaria de ser comparável entre linhas.
  const colunas = `220px repeat(${dados.semanas.length}, minmax(52px, 1fr))`;

  return (
    <Cartao semPaddingCorpo>
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="group"
        aria-label="Timeline de atividades, rolável na horizontal"
      >
        <div style={{ minWidth: `${220 + dados.semanas.length * 52}px` }}>
          {/* Cabeçalho: a segunda-feira de cada semana */}
          <div
            className="grid border-b border-[#DDE3DE] bg-[#F4F6F4]/40"
            style={{ gridTemplateColumns: colunas }}
          >
            <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
              Atividade
            </div>
            {dados.semanas.map((semana, i) => (
              <div
                key={semana}
                className={`px-1 py-2 text-center text-[10px] font-semibold tabular-nums border-l border-[#E8EDE9] ${
                  i === dados.colunaHoje ? 'text-[#F47920]' : 'text-[#8A9990]'
                }`}
              >
                {fmtDiaMes(semana)}
                {i === dados.colunaHoje && (
                  <span className="block text-[9px] font-bold uppercase">hoje</span>
                )}
              </div>
            ))}
          </div>

          {dados.linhas.map(({ atividade, coluna, span }) => {
            const tom = STATUS[atividade.status]?.tom || 'neutro';
            const resumoBarra = `${atividade.nome}: ${
              atividade.data_inicio ? fmtData(atividade.data_inicio) : 'sem início'
            } a ${atividade.data_fim ? fmtData(atividade.data_fim) : 'sem fim'}`;

            return (
              <div
                key={atividade.id}
                className="grid items-center border-b border-[#F4F6F4] hover:bg-[#F4F6F4]/40 transition-colors"
                style={{ gridTemplateColumns: colunas }}
              >
                <div className="px-4 py-2.5 min-w-0" style={{ gridColumn: 1, gridRow: 1 }}>
                  <p className="text-[11px] font-semibold text-[#1A2B1F] leading-snug truncate">
                    {atividade.nome}
                  </p>
                  <p className="text-[10px] text-[#8A9990] truncate">
                    {TIPOS[atividade.tipo] || atividade.tipo}
                    {atividade.projeto_nome ? ` · ${atividade.projeto_nome}` : ''}
                  </p>
                </div>

                {/* Faixas vazias: dão a divisória entre semanas. */}
                {dados.semanas.map((semana, i) => (
                  <div
                    key={semana}
                    aria-hidden="true"
                    className="h-full border-l border-[#F4F6F4]"
                    style={{ gridColumn: i + 2, gridRow: 1 }}
                  />
                ))}

                {/* Barra por cima das faixas, na mesma linha da grade. */}
                <div
                  className="px-0.5 flex items-center"
                  style={{ gridColumnStart: coluna + 2, gridColumnEnd: `span ${span}`, gridRow: 1 }}
                >
                  <div
                    className="h-2.5 w-full rounded-full"
                    style={{ background: corSolidaDoTom(tom) }}
                    title={resumoBarra}
                  />
                  <span className="sr-only">{resumoBarra}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {dados.semData.length > 0 && (
        <div className="px-5 py-3 border-t border-[#F4F6F4] bg-[#F4F6F4]/40">
          <p className="text-[11px] text-[#8A9990] leading-relaxed">
            <span className="font-semibold text-[#5C7060]">
              {dados.semData.length}{' '}
              {dados.semData.length === 1 ? 'atividade fica' : 'atividades ficam'} fora da timeline
            </span>{' '}
            por não ter prazo: {dados.semData.map((a) => a.nome).join(', ')}.
          </p>
        </div>
      )}
    </Cartao>
  );
}

/** Um grupo da view "Por status", com contagem e soma de horas próprias. */
function GrupoStatus({ chave, lista, colunas }) {
  const [aberto, setAberto] = useState(chave === 'em_andamento' || chave === 'nao_iniciada');
  const visual = STATUS[chave] || { label: chave, tom: 'neutro' };
  const total = totalizar(lista);

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="w-full flex items-center gap-2 px-1 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30 rounded-lg"
      >
        {aberto ? (
          <ChevronDown size={14} className="text-[#5C7060] flex-shrink-0" aria-hidden="true" />
        ) : (
          <ChevronRight size={14} className="text-[#5C7060] flex-shrink-0" aria-hidden="true" />
        )}
        <Badge tom={visual.tom}>{visual.label}</Badge>
        <span className="text-[11px] text-[#8A9990] tabular-nums">
          {total.itens} {total.itens === 1 ? 'atividade' : 'atividades'} · {fmtHoras(total.planejadas)} h
          planejadas · {fmtHoras(total.executadas)} h executadas
        </span>
      </button>

      {aberto && (
        <Tabela
          legenda={`Atividades com status ${visual.label}`}
          colunas={colunas}
          dados={lista}
          tituloVazio="Nenhuma atividade neste status"
          textoVazio="Nada a fazer aqui: o grupo aparece para a reunião saber que ele está vazio."
        />
      )}
    </div>
  );
}

/** Barra de ação da repriorização em massa. Aparece só com linhas selecionadas. */
function BarraSelecao({ quantidade, salvando, onPrioridade, onLimpar }) {
  if (!quantidade) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-xl border border-[#F7D3B4] bg-[#FDEEE1]">
      <p className="text-xs font-semibold text-[#A34F0C]">
        <Flag size={12} className="inline mr-1.5 -mt-0.5" aria-hidden="true" />
        {quantidade} {quantidade === 1 ? 'atividade selecionada' : 'atividades selecionadas'}.
        Definir a prioridade de todas, numa chamada:
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {OPCOES_PRIORIDADE.map((opcao) => (
          <BotaoSecundario
            key={opcao.valor}
            tamanho="sm"
            carregando={salvando}
            onClick={() => onPrioridade(opcao.valor)}
          >
            {opcao.rotulo}
          </BotaoSecundario>
        ))}
        <BotaoSecundario variante="fantasma" tamanho="sm" onClick={onLimpar}>
          Limpar seleção
        </BotaoSecundario>
      </div>
    </div>
  );
}

/**
 * Consolidado planejado x realizado.
 *
 * RESTRITO no servidor a papel admin ou gestor, porque horas por pessoa são dado ligado
 * a desempenho. O 403 'sem_permissao' é tratado como ESTADO NORMAL e não como falha: para
 * a maior parte da equipe não ver este bloco é o comportamento correto, e um erro
 * vermelho sugeriria que algo quebrou.
 */
function Consolidado({ query, comJanela }) {
  const codigo = query.error?.codigo;

  if (codigo === 'sem_permissao') {
    return (
      <Cartao icone={Lock} tomIcone="neutro" titulo="Consolidado de horas restrito">
        <p className="text-xs text-[#5C7060] leading-relaxed">
          O consolidado cruza horas planejadas e realizadas por pessoa, e por isso é
          liberado apenas para os perfis de gestão. Suas próprias horas continuam
          disponíveis em{' '}
          <Link
            to={createPageUrl('MinhasHoras')}
            className="font-semibold text-[#F47920] hover:text-[#e06810]"
          >
            Minhas horas
          </Link>
          .
        </p>
      </Cartao>
    );
  }

  if (query.isLoading) {
    return (
      <Cartao semPaddingCorpo>
        <Carregando rotulo="Carregando o consolidado de horas" />
      </Cartao>
    );
  }

  if (query.isError) {
    return (
      <Cartao semPaddingCorpo>
        <AvisoDiscreto texto="Não foi possível carregar o consolidado agora. Se o aviso continuar, avise a equipe responsável pelo sistema." />
      </Cartao>
    );
  }

  const resumo = query.data;
  const total = resumo?.total ?? { atividades: 0, planejadas: 0, executadas: 0, aderencia_pct: null };
  const porTipo = Array.isArray(resumo?.por_tipo) ? resumo.por_tipo : [];
  const porSemana = Array.isArray(resumo?.por_semana) ? resumo.por_semana : [];
  const maiorSemana = porSemana.reduce((maior, s) => Math.max(maior, numero(s?.executadas) ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* A armadilha do consolidado precisa estar dita na tela, não só no comentário do
          SQL: horas planejadas são o plano da atividade inteira e não são rateadas pela
          janela, então um período curto puxa a aderência para baixo. */}
      {(comJanela || resumo?.com_janela) && (
        <AvisoDiscreto tom="ambar" titulo="Aderência subestimada no período filtrado.">
          As horas realizadas contam apenas os lançamentos dentro do período, mas as horas
          planejadas são o plano da atividade inteira e não são rateadas. Ratear exigiria
          supor que o trabalho se distribui igualmente pelo prazo, o que seria um número
          inventado. Para comparar plano e realizado no mesmo escopo, limpe o período.
        </AvisoDiscreto>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Cartao>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
            Horas planejadas
          </p>
          <p className="text-2xl font-bold text-[#1A2B1F] tabular-nums mt-1">
            {fmtHoras(total.planejadas)}
          </p>
          <p className="text-[11px] text-[#5C7060] mt-1">
            em {total.atividades} {total.atividades === 1 ? 'atividade' : 'atividades'}, sem as
            canceladas
          </p>
        </Cartao>

        <Cartao>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
            Horas executadas
          </p>
          <p className="text-2xl font-bold text-[#1A2B1F] tabular-nums mt-1">
            {fmtHoras(total.executadas)}
          </p>
          <p className="text-[11px] text-[#5C7060] mt-1">soma dos apontamentos da equipe</p>
        </Cartao>

        <Cartao>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
            Aderência
          </p>
          <p className="text-2xl font-bold text-[#1A2B1F] tabular-nums mt-1">
            {total.aderencia_pct === null ? '-' : `${fmtPct(total.aderencia_pct)}%`}
          </p>
          <p className="text-[11px] text-[#5C7060] mt-1">
            {total.aderencia_pct === null
              ? 'nenhuma atividade do conjunto tem horas planejadas'
              : 'executadas sobre planejadas'}
          </p>
        </Cartao>
      </div>

      <Cartao icone={TrendingUp} titulo="Por frente de negócio" semPaddingCorpo>
        <Tabela
          comSuperficie={false}
          legenda="Horas planejadas e executadas por frente de negócio"
          dados={porTipo}
          chaveLinha={(linha) => linha.tipo}
          iconeVazio={Clock}
          tituloVazio="Nenhuma atividade no conjunto filtrado"
          textoVazio="Ajuste os filtros para ver a comparação entre o que foi planejado e o que foi executado."
          colunas={[
            {
              chave: 'tipo',
              titulo: 'Frente',
              larguraMinima: 160,
              render: (linha) => (
                <span className="font-semibold">{TIPOS[linha.tipo] || linha.tipo}</span>
              ),
            },
            { chave: 'atividades', titulo: 'Atividades', numerica: true, larguraMinima: 90 },
            {
              chave: 'planejadas',
              titulo: 'Planejadas',
              numerica: true,
              larguraMinima: 100,
              render: (linha) => fmtHoras(linha.planejadas),
            },
            {
              chave: 'executadas',
              titulo: 'Executadas',
              numerica: true,
              larguraMinima: 100,
              render: (linha) => fmtHoras(linha.executadas),
            },
            {
              chave: 'aderencia_pct',
              titulo: 'Aderência',
              larguraMinima: 150,
              render: (linha) =>
                linha.aderencia_pct === null ? (
                  <span className="text-[11px] text-[#8A9990]">Sem plano</span>
                ) : (
                  <BarraProgresso
                    valor={linha.aderencia_pct}
                    tom={linha.aderencia_pct > 100 ? 'vermelho' : 'laranja'}
                    tomCompleto={linha.aderencia_pct > 100 ? null : 'verde'}
                    detalhe={`${fmtPct(linha.aderencia_pct)}%`}
                    rotuloAcessivel={`Aderência de ${TIPOS[linha.tipo] || linha.tipo}`}
                  />
                ),
            },
          ]}
        />
      </Cartao>

      {porSemana.length > 0 && (
        <Cartao icone={CalendarDays} titulo="Horas executadas por semana">
          {/* Semana começa na segunda, igual ao date_trunc('week') do PostgreSQL. */}
          <div className="space-y-2">
            {porSemana.map((semana) => (
              <div key={semana.semana} className="flex items-center gap-3">
                <span className="text-[11px] text-[#5C7060] tabular-nums w-28 flex-shrink-0">
                  {fmtData(semana.semana)}
                </span>
                <div className="flex-1 min-w-0">
                  <BarraProgresso
                    valor={maiorSemana > 0 ? ((numero(semana.executadas) ?? 0) / maiorSemana) * 100 : 0}
                    tom="laranja"
                    tomCompleto={null}
                    rotuloAcessivel={`Horas executadas na semana de ${fmtData(semana.semana)}`}
                  />
                </div>
                <span className="text-[11px] font-semibold text-[#1A2B1F] tabular-nums w-16 text-right flex-shrink-0">
                  {fmtHoras(semana.executadas)} h
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#8A9990] mt-3 leading-relaxed">
            Cada linha é uma semana começando na segunda-feira. As barras são proporcionais à
            semana de maior carga, e não a uma meta: não existe meta de horas cadastrada.
          </p>
        </Cartao>
      )}
    </div>
  );
}

/**
 * Painel com os apontamentos de UMA atividade.
 *
 * O `escopo` que vem do servidor diz o que está sendo mostrado: 'consolidado' (o
 * lançamento de todos) ou 'proprio' (só o de quem está olhando). A tela precisa dizer
 * isso em voz alta, senão um total pequeno parece erro de lançamento quando é apenas o
 * recorte do próprio usuário.
 */
function PainelApontamentos({ atividade, aberto, onFechar, onRemover, removendoId, query }) {
  const escopo = query.data?.escopo;
  const apontamentos = Array.isArray(query.data?.apontamentos) ? query.data.apontamentos : [];
  const consolidado = escopo === 'consolidado';

  /**
   * A coluna de remover só existe no escopo 'proprio', em que TODA linha é do próprio
   * usuário e a ação é sempre permitida.
   *
   * No escopo consolidado a tela não tem como saber quais linhas são do próprio
   * chamador: a rota /me devolve e-mail, nome e papel, mas não o id de carbon_usuarios,
   * e os apontamentos vêm identificados por id. Oferecer o botão em todas as linhas
   * significaria pedir uma remoção que o servidor recusa com 403 para as alheias -
   * botão que falha por desenho. Quem é gestão remove os próprios lançamentos em Minhas
   * horas, onde tudo é do próprio usuário por definição.
   */
  const podeRemover = escopo === 'proprio';

  return (
    <PainelLateral
      aberto={aberto}
      onFechar={onFechar}
      icone={Clock}
      titulo="Horas apontadas"
      subtitulo={atividade?.nome}
      largura="lg"
      rodape={
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <BotaoSecundario
            como="link"
            para={createPageUrl('MinhasHoras')}
            tamanho="sm"
            iconeDireita={ArrowRight}
          >
            Lançar minhas horas
          </BotaoSecundario>
          <BotaoSecundario variante="fantasma" onClick={onFechar}>
            Fechar
          </BotaoSecundario>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
              Planejadas
            </p>
            <p className="text-sm font-bold text-[#1A2B1F] tabular-nums">
              {atividade?.horas_planejadas === null || atividade?.horas_planejadas === undefined
                ? 'Sem plano'
                : `${fmtHoras(atividade.horas_planejadas)} h`}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
              {consolidado ? 'Executadas (equipe)' : 'Executadas (suas)'}
            </p>
            <p className="text-sm font-bold text-[#1A2B1F] tabular-nums">
              {fmtHoras(query.data?.horas ?? 0)} h
            </p>
          </div>
        </div>

        {!query.isLoading && !query.isError && !consolidado && (
          <AvisoDiscreto tom="azul" titulo="Você está vendo apenas os seus lançamentos.">
            A quebra por pessoa é liberada só para os perfis de gestão, porque horas por
            colaborador são dado ligado a desempenho.
          </AvisoDiscreto>
        )}

        <Tabela
          legenda={`Apontamentos de horas de ${atividade?.nome ?? 'atividade'}`}
          dados={apontamentos}
          carregando={query.isLoading}
          rotuloCarregando="Carregando apontamentos"
          erro={query.isError}
          iconeVazio={Clock}
          tituloVazio="Nenhuma hora apontada ainda"
          textoVazio="Esta é exatamente a lacuna que o sistema fecha: no Notion a coluna de horas executadas existia e ficava vazia porque não havia onde lançar."
          colunas={[
            {
              chave: 'data',
              titulo: 'Dia',
              larguraMinima: 92,
              render: (linha) => <span className="tabular-nums">{fmtData(linha.data)}</span>,
            },
            ...(consolidado
              ? [
                  {
                    chave: 'usuario_nome',
                    titulo: 'Colaborador',
                    larguraMinima: 150,
                    render: (linha) => linha.usuario_nome || 'Não identificado',
                  },
                ]
              : []),
            {
              chave: 'horas',
              titulo: 'Horas',
              numerica: true,
              larguraMinima: 70,
              render: (linha) => fmtHoras(linha.horas),
            },
            {
              chave: 'observacao',
              titulo: 'Observação',
              larguraMinima: 180,
              render: (linha) =>
                linha.observacao ? (
                  <span className="text-[11px] text-[#5C7060] leading-relaxed">
                    {linha.observacao}
                  </span>
                ) : (
                  <span className="text-[11px] text-[#A8B4AC]">-</span>
                ),
            },
            ...(podeRemover
              ? [
                  {
                    chave: 'acoes',
                    titulo: <span className="sr-only">Ações</span>,
                    alinhamento: 'direita',
                    larguraMinima: 70,
                    render: (linha) => (
                      <BotaoSecundario
                        variante="perigo"
                        tamanho="sm"
                        icone={Trash2}
                        rotuloAcessivel={`Remover as ${fmtHoras(linha.horas)} horas de ${fmtData(linha.data)}`}
                        carregando={removendoId === linha.id}
                        onClick={() => onRemover(linha)}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
    </PainelLateral>
  );
}

/* ===== Página ============================================================= */

export default function Atividades() {
  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const autenticado = (accounts?.length ?? 0) > 0;
  const habilitado = (MODO_DEMO && MODO_DEMO_ATIVO()) || autenticado;
  const queryClient = useQueryClient();

  const [view, setView] = useState('andamento');
  const [filtros, setFiltros] = useState({ projeto_id: '', tipo: '', busca: '' });
  const [periodo, setPeriodo] = useState({ de: '', ate: '' });
  const [selecionados, setSelecionados] = useState([]);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [atividadeHoras, setAtividadeHoras] = useState(null);
  const [salvandoId, setSalvandoId] = useState(null);
  const [removendoId, setRemovendoId] = useState(null);
  const [consolidadoAberto, setConsolidadoAberto] = useState(false);

  /* A listagem NÃO recebe o período: as quatro views precisam do mesmo conjunto para as
     somas fecharem, e o período é filtro do consolidado. Filtrar a lista por período
     esconderia atividade sem data justamente de quem está caçando atividade parada. */
  const atividadesQuery = useQuery({
    queryKey: ['carbon', 'atividades', filtros],
    queryFn: async () => {
      const resposta = await listarAtividades(msal, { ...filtros, limite: 200 });
      return Array.isArray(resposta) ? resposta : (resposta?.atividades ?? []);
    },
    enabled: habilitado,
  });

  /* Mesma chave de src/pages/Projetos.jsx: o cache é compartilhado e abrir Atividades
     depois de Projetos não refaz a requisição. */
  const projetosQuery = useQuery({
    queryKey: ['carbon', 'projetos'],
    queryFn: async () => {
      /* normalizarListaProjetos: a chave ['carbon', 'projetos'] é compartilhada; ler o
         envelope aqui é o que impede outra tela de encontrar um formato diferente. */
      return normalizarListaProjetos(await listarProjetos(msal));
    },
    enabled: habilitado,
  });

  const resumoQuery = useQuery({
    queryKey: ['carbon', 'horas-resumo', { ...periodo, ...filtros }],
    queryFn: async () =>
      obterResumoHoras(msal, {
        de: periodo.de,
        ate: periodo.ate,
        projeto_id: filtros.projeto_id,
        tipo: filtros.tipo,
      }),
    enabled: habilitado && consolidadoAberto,
    // 403 'sem_permissao' é resposta legítima do servidor para quem não é gestão: repetir
    // a chamada três vezes não mudaria o papel de ninguém.
    retry: false,
  });

  const apontamentosQuery = useQuery({
    queryKey: ['carbon', 'apontamentos', atividadeHoras?.id],
    queryFn: async () => listarApontamentos(msal, atividadeHoras?.id),
    enabled: habilitado && Boolean(atividadeHoras?.id),
  });

  const atividades = atividadesQuery.data ?? [];
  const projetos = projetosQuery.data?.projetos ?? [];

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['carbon', 'atividades'] });
    queryClient.invalidateQueries({ queryKey: ['carbon', 'horas-resumo'] });
  };

  /* ===== Mutações ===== */

  const salvar = useMutation({
    mutationFn: async ({ id, payload }) =>
      id ? atualizarAtividade(msal, id, payload) : criarAtividade(msal, payload),
    onSuccess: (_resposta, variaveis) => {
      invalidar();
      toast.success(variaveis?.id ? 'Atividade atualizada.' : 'Atividade criada.');
      fecharForm();
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar a atividade.'),
  });

  const alterar = useMutation({
    mutationFn: async ({ id, dados }) => atualizarAtividade(msal, id, dados),
    onMutate: ({ id }) => setSalvandoId(id),
    onSuccess: () => invalidar(),
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar a alteração.'),
    onSettled: () => setSalvandoId(null),
  });

  const repriorizar = useMutation({
    mutationFn: async (prioridade) =>
      repriorizarAtividades(
        msal,
        selecionados.map((id) => ({ id, prioridade })),
      ),
    onSuccess: (resposta) => {
      invalidar();
      const total = Number(resposta?.atualizados) || 0;
      toast.success(
        total === 1 ? 'Prioridade de 1 atividade atualizada.' : `Prioridade de ${total} atividades atualizada.`,
      );
      setSelecionados([]);
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível repriorizar agora.'),
  });

  const remover = useMutation({
    mutationFn: async (apontamento) => removerApontamento(msal, apontamento.id),
    onMutate: (apontamento) => setRemovendoId(apontamento.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carbon', 'apontamentos'] });
      queryClient.invalidateQueries({ queryKey: ['carbon', 'minhas-horas'] });
      invalidar();
      toast.success('Apontamento removido.');
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível remover o apontamento.'),
    onSettled: () => setRemovendoId(null),
  });

  /* ===== Formulário ===== */

  const fecharForm = () => {
    setFormAberto(false);
    setEditando(null);
    setForm(FORM_VAZIO);
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setFormAberto(true);
  };

  const abrirEdicao = (atividade) => {
    setEditando(atividade?.id ?? null);
    setForm(formDaAtividade(atividade));
    setFormAberto(true);
  };

  const enviar = () => {
    let payload;
    try {
      // Validação no cliente antes de gastar requisição. O servidor valida de novo:
      // esta camada é conveniência, não é a barreira.
      payload = montarPayload(form, Boolean(editando));
    } catch (erro) {
      toast.error(erro?.message || 'Revise os campos do formulário.');
      return;
    }
    salvar.mutate({ id: editando, payload });
  };

  const alterarForm = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  /* ===== Seleção ===== */

  const alternarSelecao = (id) =>
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id],
    );

  /* ===== Views ===== */

  const porView = useMemo(() => {
    const abertas = atividades.filter(
      (a) => a?.status === 'nao_iniciada' || a?.status === 'em_andamento',
    );
    return {
      andamento: abertas,
      concluidas: atividades.filter((a) => a?.status === 'concluida'),
      // A timeline mostra tudo que tem prazo, inclusive concluída: o valor dela é
      // justamente ver o que se sobrepõe, e esconder o passado recente tiraria a
      // referência de comparação.
      timeline: atividades,
      status: atividades,
    };
  }, [atividades]);

  const listaAtual = porView[view] ?? [];
  const total = totalizar(view === 'status' || view === 'timeline' ? atividades : listaAtual);

  const gruposPorStatus = useMemo(() => {
    const mapa = new Map(ORDEM_STATUS.map((chave) => [chave, []]));
    for (const atividade of atividades) {
      const chave = atividade?.status;
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(atividade);
    }
    return [...mapa.entries()].filter(([, lista]) => lista.length > 0);
  }, [atividades]);

  /* ===== Colunas da tabela ===== */

  const colunas = useMemo(
    () => [
      {
        chave: 'selecao',
        titulo: 'Sel.',
        larguraMinima: 44,
        alinhamento: 'centro',
        render: (linha) => (
          /* Checkbox cru, e não o Campo tipo="checkbox": o Campo sempre renderiza um
             rótulo visível ao lado do controle, e numa coluna de seleção o rótulo é o
             cabeçalho. O aria-label mantém o controle anunciável. */
          <input
            type="checkbox"
            checked={selecionados.includes(linha.id)}
            onChange={() => alternarSelecao(linha.id)}
            aria-label={`Selecionar ${linha.nome} para repriorizar`}
            className="w-4 h-4 rounded border-[#DDE3DE] accent-[#1A4731] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30"
          />
        ),
      },
      {
        chave: 'nome',
        titulo: 'Atividade',
        larguraMinima: 260,
        render: (linha) => <Identificacao atividade={linha} />,
      },
      {
        chave: 'status',
        titulo: 'Status',
        larguraMinima: 130,
        render: (linha) => (
          <SeletorStatus
            valor={linha.status}
            opcoes={OPCOES_STATUS}
            carregando={salvandoId === linha.id}
            onChange={(status) => alterar.mutate({ id: linha.id, dados: { status } })}
            rotuloAcessivel={`Status de ${linha.nome}`}
          />
        ),
      },
      {
        chave: 'prioridade',
        titulo: 'Prioridade',
        larguraMinima: 120,
        render: (linha) => (
          <SeletorStatus
            valor={linha.prioridade}
            opcoes={OPCOES_PRIORIDADE}
            carregando={salvandoId === linha.id}
            onChange={(prioridade) => alterar.mutate({ id: linha.id, dados: { prioridade } })}
            rotuloAcessivel={`Prioridade de ${linha.nome}`}
          />
        ),
      },
      {
        chave: 'prazo',
        titulo: 'Prazo',
        larguraMinima: 170,
        render: (linha) => <Prazo atividade={linha} />,
      },
      {
        chave: 'horas',
        titulo: 'Horas: executadas de planejadas',
        larguraMinima: 190,
        render: (linha) => <Horas atividade={linha} />,
      },
      {
        chave: 'acoes',
        titulo: <span className="sr-only">Ações</span>,
        alinhamento: 'direita',
        larguraMinima: 150,
        render: (linha) => (
          <div className="flex items-center justify-end gap-1.5">
            <BotaoSecundario
              tamanho="sm"
              icone={Clock}
              rotuloAcessivel={`Ver horas apontadas em ${linha.nome}`}
              titulo="Horas apontadas"
              onClick={() => setAtividadeHoras(linha)}
            >
              {linha.apontamentos > 0 ? String(linha.apontamentos) : ''}
            </BotaoSecundario>
            <BotaoSecundario
              tamanho="sm"
              icone={Pencil}
              rotuloAcessivel={`Editar ${linha.nome}`}
              titulo="Editar"
              onClick={() => abrirEdicao(linha)}
            />
          </div>
        ),
      },
    ],
    /* Só `selecionados` e `salvandoId` mudam o que as células desenham. As funções
       capturadas (o mutate do TanStack Query, os setState do React e os abrir*, que só
       chamam setState) são estáveis ou inócuas quando vêm de um render anterior. */
    [selecionados, salvandoId],
  );

  /* Aderência do CONJUNTO QUE ESTÁ NA TELA: a mesma fórmula de public.carbon_aderencia_pct
     (executadas sobre planejadas, uma casa decimal), aplicada ao subtotal da view. O
     servidor não calcula isto porque as views são recorte da tela, e não da API. */
  const aderenciaDaView =
    total.planejadas > 0 ? Math.round((total.executadas * 1000) / total.planejadas) / 10 : null;

  const rodapeTabela = (
    <p className="text-[11px] text-[#5C7060] tabular-nums">
      <span className="font-semibold">
        {total.itens} {total.itens === 1 ? 'atividade' : 'atividades'}
      </span>{' '}
      · {fmtHoras(total.planejadas)} h planejadas · {fmtHoras(total.executadas)} h executadas
      {aderenciaDaView !== null && <> · aderência {fmtPct(aderenciaDaView)}%</>}
    </p>
  );

  /* ===== Render ===== */

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Filtros ------------------------------------------------------------ */}
      <Cartao>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Campo
            rotulo="Buscar"
            valor={filtros.busca}
            onChange={(valor) => setFiltros((a) => ({ ...a, busca: valor }))}
            placeholder="Nome ou descrição"
            acao={
              filtros.busca ? (
                <button
                  type="button"
                  onClick={() => setFiltros((a) => ({ ...a, busca: '' }))}
                  className="text-[11px] font-semibold text-[#8A9990] hover:text-[#1A4731] text-left"
                >
                  Limpar busca
                </button>
              ) : null
            }
          />
          <Campo
            rotulo="Projeto"
            tipo="select"
            rotuloVazio="Todos, com e sem projeto"
            valor={filtros.projeto_id}
            onChange={(valor) => setFiltros((a) => ({ ...a, projeto_id: valor }))}
            opcoes={projetos.map((p) => ({ valor: p.id, rotulo: p.nome }))}
            dica={
              projetosQuery.isError
                ? 'Não foi possível carregar os projetos agora: o filtro fica limitado.'
                : undefined
            }
          />
          <Campo
            rotulo="Frente de negócio"
            tipo="select"
            rotuloVazio="Todas as frentes"
            valor={filtros.tipo}
            onChange={(valor) => setFiltros((a) => ({ ...a, tipo: valor }))}
            opcoes={Object.entries(TIPOS).map(([valor, rotulo]) => ({ valor, rotulo }))}
          />
          <div className="flex items-end">
            <BotaoPrimario icone={Plus} onClick={abrirNovo} larguraTotal>
              Nova atividade
            </BotaoPrimario>
          </div>
        </div>
      </Cartao>

      {/* Views ------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Visões das atividades">
        {VIEWS.map((item) => {
          const ativo = view === item.chave;
          return (
            <button
              key={item.chave}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setView(item.chave)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30 ${
                ativo
                  ? 'bg-[#1A4731] text-white'
                  : 'bg-white border border-[#DDE3DE] text-[#5C7060] hover:text-[#1A4731] hover:border-[#1A4731]/40'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <BarraSelecao
        quantidade={selecionados.length}
        salvando={repriorizar.isPending}
        onPrioridade={(prioridade) => repriorizar.mutate(prioridade)}
        onLimpar={() => setSelecionados([])}
      />

      {/* Corpo ------------------------------------------------------------- */}
      {view === 'timeline' ? (
        atividadesQuery.isLoading ? (
          <Cartao semPaddingCorpo>
            <Carregando rotulo="Carregando atividades" />
          </Cartao>
        ) : atividadesQuery.isError ? (
          <Cartao semPaddingCorpo>
            <AvisoDiscreto texto="Não foi possível carregar as atividades agora. Se o aviso continuar, avise a equipe responsável pelo sistema." />
          </Cartao>
        ) : (
          <Timeline atividades={porView.timeline} />
        )
      ) : view === 'status' ? (
        atividadesQuery.isLoading ? (
          <Cartao semPaddingCorpo>
            <Carregando rotulo="Carregando atividades" />
          </Cartao>
        ) : atividadesQuery.isError ? (
          <Cartao semPaddingCorpo>
            <AvisoDiscreto texto="Não foi possível carregar as atividades agora. Se o aviso continuar, avise a equipe responsável pelo sistema." />
          </Cartao>
        ) : gruposPorStatus.length === 0 ? (
          <EstadoVazio
            comSuperficie
            icone={ClipboardList}
            titulo="Nenhuma atividade cadastrada"
            texto="A base de atividades é o que alimenta a reunião semanal e é onde as horas ficam penduradas. Cadastre a primeira para começar."
            acao={
              <BotaoPrimario icone={Plus} onClick={abrirNovo}>
                Cadastrar atividade
              </BotaoPrimario>
            }
          />
        ) : (
          <div className="space-y-5">
            {gruposPorStatus.map(([chave, lista]) => (
              <GrupoStatus key={chave} chave={chave} lista={lista} colunas={colunas} />
            ))}
          </div>
        )
      ) : (
        <Tabela
          legenda={
            view === 'andamento'
              ? 'Atividades não iniciadas e em andamento'
              : 'Atividades concluídas'
          }
          colunas={colunas}
          dados={listaAtual}
          carregando={atividadesQuery.isLoading}
          rotuloCarregando="Carregando atividades"
          erro={atividadesQuery.isError}
          iconeVazio={ClipboardList}
          tituloVazio={
            view === 'andamento' ? 'Nenhuma atividade aberta' : 'Nenhuma atividade concluída'
          }
          textoVazio={
            view === 'andamento'
              ? 'A base de atividades é o que alimenta a reunião semanal e é onde as horas ficam penduradas. Cadastre a primeira, ou ajuste os filtros acima.'
              : 'Assim que uma atividade for marcada como concluída, ela aparece aqui com as horas que consumiu.'
          }
          acaoVazio={
            view === 'andamento' ? (
              <BotaoPrimario icone={Plus} onClick={abrirNovo}>
                Cadastrar atividade
              </BotaoPrimario>
            ) : null
          }
          classeLinha={(linha) => (linha?.status === 'cancelada' ? 'opacity-60' : '')}
          rodape={listaAtual.length > 0 ? rodapeTabela : null}
        />
      )}

      {/* Consolidado ------------------------------------------------------- */}
      <div className="pt-2 space-y-4">
        <CabecalhoSecao
          titulo="Planejado x realizado"
          descricao="O cruzamento que a equipe não tinha: a coluna de horas executadas existia no Notion e ficava vazia porque não havia onde apontar."
          acao={
            <BotaoSecundario
              tamanho="sm"
              icone={consolidadoAberto ? ChevronDown : ChevronRight}
              onClick={() => setConsolidadoAberto((v) => !v)}
            >
              {consolidadoAberto ? 'Recolher' : 'Ver consolidado'}
            </BotaoSecundario>
          }
        />

        {consolidadoAberto && (
          <>
            <Cartao>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Campo
                  rotulo="Período: de"
                  tipo="data"
                  valor={periodo.de}
                  onChange={(valor) => setPeriodo((a) => ({ ...a, de: valor }))}
                />
                <Campo
                  rotulo="Período: até"
                  tipo="data"
                  valor={periodo.ate}
                  onChange={(valor) => setPeriodo((a) => ({ ...a, ate: valor }))}
                />
                <div className="flex items-end gap-2">
                  <BotaoSecundario
                    variante="fantasma"
                    onClick={() => setPeriodo({ de: '', ate: '' })}
                    desabilitado={!periodo.de && !periodo.ate}
                  >
                    Limpar período
                  </BotaoSecundario>
                </div>
              </div>
              <p className="text-[10px] text-[#8A9990] mt-3 leading-relaxed">
                O período e os filtros de projeto e de frente valem para o consolidado. Sem
                período, o cruzamento considera todo o histórico, que é o único recorte em que
                planejado e realizado falam do mesmo escopo.
              </p>
            </Cartao>

            <Consolidado query={resumoQuery} comJanela={Boolean(periodo.de || periodo.ate)} />
          </>
        )}
      </div>

      <p className="flex items-start gap-2 text-[11px] text-[#8A9990] px-1 leading-relaxed">
        <Search size={12} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
        As horas executadas não são um campo preenchido a mão: são sempre a soma dos
        apontamentos por dia. Para lançar as suas, use{' '}
        <Link
          to={createPageUrl('MinhasHoras')}
          className="font-semibold text-[#F47920] hover:text-[#e06810]"
        >
          Minhas horas
        </Link>
        .
      </p>

      {/* Formulário -------------------------------------------------------- */}
      <PainelLateral
        aberto={formAberto}
        onFechar={fecharForm}
        icone={ClipboardList}
        titulo={editando ? 'Editar atividade' : 'Nova atividade'}
        subtitulo="Somente o nome é obrigatório. O resto pode ser preenchido ao longo da semana."
        largura="lg"
        // Formulário preenchido não pode ser descartado por um clique distraído fora.
        fecharAoClicarFora={false}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario variante="fantasma" onClick={fecharForm}>
              Cancelar
            </BotaoSecundario>
            {/* onClick e não type="submit": o rodapé do PainelLateral fica FORA do form. */}
            <BotaoPrimario onClick={enviar} carregando={salvar.isPending}>
              {editando ? 'Salvar alterações' : 'Criar atividade'}
            </BotaoPrimario>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo
            rotulo="Nome da atividade"
            obrigatorio
            valor={form.nome}
            onChange={alterarForm('nome')}
            placeholder="Como a atividade aparece na pauta da semana"
            extras={{ maxLength: 200 }}
            className="sm:col-span-2"
          />

          <Campo
            rotulo="Frente de negócio"
            tipo="select"
            valor={form.tipo}
            onChange={alterarForm('tipo')}
            opcoes={Object.entries(TIPOS).map(([valor, rotulo]) => ({ valor, rotulo }))}
            dica="É a dimensão de comparação planejado x realizado por frente."
          />

          <Campo
            rotulo="Projeto"
            tipo="select"
            rotuloVazio="Sem projeto (backoffice, consultoria, novos negócios)"
            valor={form.projeto_id}
            onChange={alterarForm('projeto_id')}
            opcoes={projetos.map((p) => ({ valor: p.id, rotulo: p.nome }))}
            dica="Opcional de propósito: o projeto é dimensão, não obrigação."
          />

          <Campo
            rotulo="Status"
            tipo="select"
            valor={form.status}
            onChange={alterarForm('status')}
            opcoes={OPCOES_STATUS.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))}
          />

          <Campo
            rotulo="Prioridade"
            tipo="select"
            valor={form.prioridade}
            onChange={alterarForm('prioridade')}
            opcoes={OPCOES_PRIORIDADE.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))}
          />

          <Campo
            rotulo="Início"
            tipo="data"
            valor={form.data_inicio}
            onChange={alterarForm('data_inicio')}
            dica="Pode ficar vazio quando só existe prazo."
          />

          <Campo
            rotulo="Prazo ou fim"
            tipo="data"
            valor={form.data_fim}
            onChange={alterarForm('data_fim')}
            dica="É o que a timeline usa para mostrar sobreposição."
          />

          <Campo
            rotulo="Horas planejadas"
            tipo="decimal"
            valor={form.horas_planejadas}
            onChange={alterarForm('horas_planejadas')}
            placeholder="40"
            dica="Horas-homem previstas. Sem ponto de milhar; use vírgula para o decimal."
          />

          <Campo
            rotulo="Descrição"
            tipo="textarea"
            linhas={4}
            valor={form.descricao}
            onChange={alterarForm('descricao')}
            placeholder="Detalhe o que precisa ser feito, dependências, o que travou"
            extras={{ maxLength: 5000 }}
            className="sm:col-span-2"
          />

          {/* Responsável não é editável aqui, e a tela diz isso em vez de oferecer um
              campo de UUID solto: responsavel_id é FK para carbon_usuarios e ainda não
              existe rota que liste os colaboradores do sistema. Fica para a issue de
              equipe por projeto. */}
          <div className="sm:col-span-2 px-4 py-3 rounded-xl bg-[#F4F6F4] border border-[#DDE3DE]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C7060]">
              Responsável
            </p>
            <p className="text-xs text-[#1A2B1F] mt-1">
              {editando
                ? atividades.find((a) => a.id === editando)?.responsavel_nome ||
                  'Nenhum responsável definido'
                : 'Será definido depois'}
            </p>
            <p className="text-[10px] text-[#8A9990] mt-1.5 leading-relaxed">
              Atribuir responsável depende de uma listagem de colaboradores que o sistema
              ainda não expõe. Um campo de identificador solto seria pior do que não ter
              campo.
            </p>
          </div>
        </div>
      </PainelLateral>

      {/* Apontamentos de uma atividade -------------------------------------- */}
      {atividadeHoras && (
        <PainelApontamentos
          atividade={atividadeHoras}
          aberto={Boolean(atividadeHoras)}
          onFechar={() => setAtividadeHoras(null)}
          onRemover={(apontamento) => remover.mutate(apontamento)}
          removendoId={removendoId}
          query={apontamentosQuery}
        />
      )}
    </div>
  );
}

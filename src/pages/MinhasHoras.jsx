/**
 * MinhasHoras - lançamento das horas da semana, dia por atividade (issue #8).
 *
 * ESTA TELA EXISTE PARA FECHAR A LACUNA MAIS BEM DOCUMENTADA DO LEVANTAMENTO. A base de
 * atividades do Notion tem a coluna "HH Executada" e ela está vazia em TODOS os
 * registros, e a pauta da reunião semanal anota literalmente "lembrar de contar as horas
 * (quando tiver a funcionalidade)". A equipe planeja horas, quer comparar com o
 * realizado, e não tinha onde apontar.
 *
 * O CRITÉRIO É VELOCIDADE, e é o que define o desenho: a atualização é feita ao longo da
 * semana, em tempo contínuo, e não em lote no fim do mês. Por isso:
 *
 * - a grade é uma matriz de sete dias por atividade, e cada célula é um campo digitável.
 *   Nada de abrir formulário por lançamento;
 * - salvar acontece ao sair da célula (ou no Enter), numa única chamada que serve para
 *   criar, corrigir e apagar. A chave no banco é (atividade, colaborador, dia), então
 *   digitar de novo no mesmo dia CORRIGE em vez de somar em dobro, que é o erro clássico
 *   do lançamento contínuo;
 * - esvaziar a célula apaga o lançamento, porque é isso que a pessoa quer dizer;
 * - a semana anterior fica a um clique, para o esquecimento de sexta ser corrigido na
 *   segunda.
 *
 * SÓ AS PRÓPRIAS HORAS. O servidor grava sempre o colaborador do token e nunca aceita
 * usuario_id no corpo, e esta tela não mostra o realizado da equipe: horas por pessoa são
 * dado ligado a desempenho, e num time pequeno um total ao lado do próprio número
 * revelaria o de quem mais apontou. O consolidado vive em Atividades e é restrito aos
 * perfis de gestão.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Clock, CalendarDays, Plus, FolderTree, ClipboardList,
  ArrowRight, Hourglass,
} from 'lucide-react';

import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import { createPageUrl } from '@/utils';
import {
  obterMinhasHoras,
  registrarApontamento,
  listarAtividades,
} from '@/lib/api/atividades';

import Cartao from '@/components/ui/Cartao';
import Tabela from '@/components/ui/Tabela';
import Badge from '@/components/ui/Badge';
import EstadoVazio from '@/components/ui/EstadoVazio';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import Campo from '@/components/ui/Campo';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';

/* ===== Domínio ============================================================ */

const TIPOS = {
  consultoria: 'Consultoria',
  novos_negocios: 'Novos Negócios',
  projeto: 'Projeto',
  backoffice: 'Backoffice',
  jpf: 'JPF',
};

const TOM_PRIORIDADE = { alta: 'vermelho', media: 'ambar', baixa: 'neutro' };
const ROTULO_PRIORIDADE = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

/** Teto de horas de um dia. Igual ao CHECK carbon_apontamentos_horas_faixa_chk. */
const LIMITE_HORAS_DIA = 24;

/* ===== Datas ==============================================================
   Sempre no fuso LOCAL. new Date('2026-08-10') é meia-noite UTC e, no Brasil, volta um
   dia: numa grade em que a coluna É o dia, isso lançaria a hora no dia errado. Os mesmos
   auxiliares existem em Atividades.jsx; são quinze linhas e o projeto não tem arquivo
   compartilhado de utilidades de data para recebê-las.                             */

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
 * Segunda-feira da semana. MESMA regra do date_trunc('week') do PostgreSQL (ISO), que é
 * a que a função carbon_minhas_horas_semana usa para montar a grade. Divergir faria a
 * navegação da tela pedir uma semana e receber outra.
 */
function inicioDaSemana(iso) {
  const data = paraData(iso);
  if (!data) return null;
  const diaSemana = data.getDay(); // 0 domingo ... 6 sábado
  data.setDate(data.getDate() + (diaSemana === 0 ? -6 : 1 - diaSemana));
  return paraIso(data);
}

function fmtData(iso) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : '-';
}

function fmtDiaMes(iso) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return partes ? `${partes[3]}/${partes[2]}` : '-';
}

const ABREVIACAO_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function abreviacaoDoDia(iso) {
  const data = paraData(iso);
  return data ? ABREVIACAO_DIA[data.getDay()] : '';
}

function ehFimDeSemana(iso) {
  const data = paraData(iso);
  if (!data) return false;
  const dia = data.getDay();
  return dia === 0 || dia === 6;
}

const HOJE = paraIso(new Date());
const SEMANA_DE_HOJE = inicioDaSemana(HOJE);

/* ===== Horas ============================================================== */

function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** Horas em pt-BR, sem casas inúteis: 4 e não 4,00; 3,5 e não 3,50. */
function fmtHoras(valor) {
  const n = numero(valor);
  if (n === null || n === 0) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Horas para exibição de total: zero aparece como 0, não como vazio. */
function fmtTotal(valor) {
  const n = numero(valor) ?? 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Lê o que a pessoa digitou numa célula.
 *
 * Aceita vírgula como separador decimal (é o teclado brasileiro) e também "1h30" e
 * "1:30", porque quem aponta hora pensa em hora e minuto, não em fração. Vazio significa
 * "apagar este lançamento" e devolve 0, que é o valor que a API interpreta como remoção.
 *
 * @returns {number|null} null quando o texto não é interpretável.
 */
function lerHoras(texto) {
  const limpo = String(texto ?? '').trim().toLowerCase();
  if (limpo === '') return 0;

  // 1h30, 1 h 30, 1:30 -> 1,5
  const comMinutos = /^(\d{1,2})\s*(?:h|:)\s*(\d{1,2})$/.exec(limpo);
  if (comMinutos) {
    const horas = Number(comMinutos[1]);
    const minutos = Number(comMinutos[2]);
    if (minutos > 59) return null;
    return Math.round((horas + minutos / 60) * 100) / 100;
  }

  // 3h -> 3
  const soHoras = /^(\d{1,2})\s*h$/.exec(limpo);
  if (soHoras) return Number(soHoras[1]);

  const n = Number(limpo.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

/* ===== Célula de lançamento ================================================ */

/**
 * Uma célula da grade.
 *
 * O valor exibido é o do servidor, a menos que exista uma edição pendente para a mesma
 * chave. O estado de digitação vive no COMPONENTE PAI, num único mapa, e não em estado
 * local por célula: com estado local, cada resposta do servidor remontaria a célula e
 * roubaria o foco de quem já estava digitando a próxima.
 *
 * Salva no blur e no Enter. Não salva a cada tecla, de propósito: seriam sete chamadas
 * para digitar "3,25".
 */
function CelulaHora({
  valor,
  editando,
  desabilitado,
  salvando,
  rotulo,
  fimDeSemana,
  hoje,
  onEditar,
  onSalvar,
  onCancelar,
}) {
  const texto = editando !== undefined ? editando : fmtHoras(valor);
  const alterado = editando !== undefined && editando !== fmtHoras(valor);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={texto}
      disabled={desabilitado}
      aria-label={rotulo}
      aria-busy={salvando || undefined}
      placeholder={fimDeSemana ? '' : '0'}
      onChange={(evento) => onEditar(evento.target.value)}
      onBlur={onSalvar}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter') {
          evento.preventDefault();
          // O blur dispara o salvamento; tirar o foco também confirma visualmente.
          evento.currentTarget.blur();
        }
        if (evento.key === 'Escape') {
          evento.preventDefault();
          onCancelar();
        }
      }}
      className={`w-full px-2 py-1.5 text-xs text-center tabular-nums rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[#1A4731]/10 focus:border-[#1A4731] disabled:cursor-not-allowed disabled:opacity-60 ${
        alterado
          ? 'border-[#F47920] bg-[#FDEEE1] text-[#A34F0C] font-semibold'
          : fimDeSemana
            ? 'border-[#E8EDE9] bg-[#F4F6F4]/60 text-[#5C7060]'
            : 'border-[#DDE3DE] bg-white text-[#1A2B1F]'
      } ${hoje ? 'ring-1 ring-[#F47920]/40' : ''}`}
    />
  );
}

/* ===== Página ============================================================= */

export default function MinhasHoras() {
  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const autenticado = (accounts?.length ?? 0) > 0;
  const habilitado = (MODO_DEMO && MODO_DEMO_ATIVO()) || autenticado;
  const queryClient = useQueryClient();

  const [semana, setSemana] = useState(SEMANA_DE_HOJE);
  /** Edições em voo, na chave `${atividadeId}|${dia}`. Ver o comentário de CelulaHora. */
  const [edicoes, setEdicoes] = useState({});
  const [salvandoChave, setSalvandoChave] = useState(null);
  /** Atividades acrescentadas à grade pela pessoa, além das que o servidor sugere. */
  const [extras, setExtras] = useState([]);
  const [escolhaExtra, setEscolhaExtra] = useState('');

  const horasQuery = useQuery({
    queryKey: ['carbon', 'minhas-horas', semana],
    queryFn: async () => obterMinhasHoras(msal, semana),
    enabled: habilitado,
  });

  /* Lista para o seletor "acrescentar atividade à grade". Só as abertas: apontar hora em
     atividade concluída ou cancelada é quase sempre engano, e quem precisar de verdade
     ainda pode reabrir o status em Atividades.
     O filtro de status é aplicado NO CLIENTE porque a rota aceita um status por vez e
     aqui interessam dois. A chave começa com ['carbon','atividades'] de propósito: assim
     um lançamento de hora invalida esta lista junto com a da tela de Atividades. */
  const abertasQuery = useQuery({
    queryKey: ['carbon', 'atividades', { escopo: 'grade-de-horas', limite: 200 }],
    queryFn: async () => {
      const resposta = await listarAtividades(msal, { limite: 200 });
      const lista = Array.isArray(resposta) ? resposta : (resposta?.atividades ?? []);
      return lista.filter((a) => a?.status === 'nao_iniciada' || a?.status === 'em_andamento');
    },
    enabled: habilitado,
  });

  const dados = horasQuery.data ?? null;
  const dias = useMemo(() => {
    const doServidor = dados?.semana?.dias;
    if (Array.isArray(doServidor) && doServidor.length === 7) return doServidor;
    // Enquanto a resposta não chega, a grade já mostra os sete dias da semana pedida.
    return Array.from({ length: 7 }, (_, i) => somarDias(semana, i));
  }, [dados, semana]);

  const inicio = dados?.semana?.inicio || semana;
  const fim = dados?.semana?.fim || somarDias(semana, 6);

  /* Linhas da grade: as que o servidor sugere (sou responsável e está aberta, ou já
     apontei hora nesta semana) mais as que a pessoa acrescentou, sem repetir. */
  const linhas = useMemo(() => {
    const doServidor = Array.isArray(dados?.atividades) ? dados.atividades : [];
    const vistos = new Set(doServidor.map((a) => a.id));
    const acrescentadas = extras.filter((a) => !vistos.has(a.id));
    return [...doServidor, ...acrescentadas];
  }, [dados, extras]);

  /** Horas lançadas por (atividade, dia), a partir dos apontamentos da semana. */
  const porCelula = useMemo(() => {
    const mapa = new Map();
    for (const apontamento of Array.isArray(dados?.apontamentos) ? dados.apontamentos : []) {
      mapa.set(`${apontamento.atividade_id}|${apontamento.data}`, numero(apontamento.horas) ?? 0);
    }
    return mapa;
  }, [dados]);

  const totalPorDia = useMemo(() => {
    const mapa = new Map();
    for (const dia of dias) mapa.set(dia, 0);
    for (const [chave, horas] of porCelula) {
      const dia = chave.split('|')[1];
      if (mapa.has(dia)) mapa.set(dia, Math.round((mapa.get(dia) + horas) * 100) / 100);
    }
    return mapa;
  }, [dias, porCelula]);

  const totalSemana = numero(dados?.totais?.semana) ?? 0;

  /**
   * Poda as edições que o servidor já confirmou.
   *
   * Contrapartida de manter o texto confirmado no mapa depois de salvar (ver o onSuccess
   * de `registrar`): quando o refetch chega e o valor do servidor bate com o texto que
   * está na célula, a entrada não tem mais razão de existir e sair dela devolve a célula
   * ao dado do servidor. Sem esta poda, uma alteração feita em outra sessão (ou em outra
   * aba) ficaria escondida atrás de um texto local igual ao antigo.
   *
   * Não interfere em quem está digitando: só remove entrada cujo texto JÁ é igual ao do
   * servidor, caso em que remover não muda nada na tela.
   */
  useEffect(() => {
    setEdicoes((atual) => {
      const chaves = Object.keys(atual);
      if (!chaves.length) return atual;

      const sincronizadas = chaves.filter(
        (chave) => atual[chave] === fmtHoras(porCelula.get(chave) ?? 0),
      );
      if (!sincronizadas.length) return atual;

      const copia = { ...atual };
      for (const chave of sincronizadas) delete copia[chave];
      return copia;
    });
  }, [porCelula]);

  const registrar = useMutation({
    mutationFn: async ({ atividadeId, dia, horas }) =>
      registrarApontamento(msal, { atividade_id: atividadeId, data: dia, horas }),
    onMutate: ({ chave }) => setSalvandoChave(chave),
    onSuccess: (resposta, variaveis) => {
      /**
       * A edição pendente NÃO é apagada aqui: ela é trocada pelo valor que o servidor
       * CONFIRMOU.
       *
       * Apagar no sucesso parecia natural e estava errado: entre o sucesso da gravação e
       * a chegada do refetch existe uma janela em que a célula voltaria a mostrar o valor
       * ANTERIOR, e "digitei 7, o campo voltou para 2" é exatamente como se parece uma
       * edição recusada. Mantendo o texto confirmado, a célula nunca exibe número velho.
       * Quem remove a entrada depois é o efeito de poda abaixo, quando o servidor já
       * concorda com ela.
       *
       * O texto vem do apontamento devolvido pela API, e não do que foi digitado: é o
       * servidor que decide o valor final ('3h30' volta como 3,5), e a célula tem de
       * mostrar o que foi gravado.
       */
      const confirmado = resposta?.removido ? '' : fmtHoras(resposta?.apontamento?.horas);
      setEdicoes((atual) => ({ ...atual, [variaveis.chave]: confirmado }));

      queryClient.invalidateQueries({ queryKey: ['carbon', 'minhas-horas'] });
      // A atividade mudou de horas executadas: a lista e o consolidado precisam saber.
      queryClient.invalidateQueries({ queryKey: ['carbon', 'atividades'] });
      queryClient.invalidateQueries({ queryKey: ['carbon', 'horas-resumo'] });
      queryClient.invalidateQueries({ queryKey: ['carbon', 'apontamentos'] });

      if (resposta?.removido) toast.success('Lançamento removido.');
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar as horas.'),
    onSettled: () => setSalvandoChave(null),
  });

  const chaveDe = (atividadeId, dia) => `${atividadeId}|${dia}`;

  const editar = (chave, texto) => setEdicoes((atual) => ({ ...atual, [chave]: texto }));

  const cancelar = (chave) =>
    setEdicoes((atual) => {
      const copia = { ...atual };
      delete copia[chave];
      return copia;
    });

  const salvarCelula = (atividadeId, dia) => {
    const chave = chaveDe(atividadeId, dia);
    const texto = edicoes[chave];
    if (texto === undefined) return;

    const atual = porCelula.get(chave) ?? 0;
    const horas = lerHoras(texto);

    if (horas === null) {
      toast.error('Digite as horas como número (3, 3,5) ou como hora e minuto (3h30).');
      return;
    }
    if (horas > LIMITE_HORAS_DIA) {
      toast.error(`Um dia não pode ter mais de ${LIMITE_HORAS_DIA} horas apontadas.`);
      return;
    }
    // Nada mudou: não gasta requisição nem faz a grade piscar.
    if (horas === atual) {
      cancelar(chave);
      return;
    }

    registrar.mutate({ atividadeId, dia, horas, chave });
  };

  const acrescentar = () => {
    const atividade = (abertasQuery.data ?? []).find((a) => a.id === escolhaExtra);
    if (!atividade) return;
    setExtras((atual) =>
      atual.some((a) => a.id === atividade.id) ? atual : [...atual, atividade],
    );
    setEscolhaExtra('');
  };

  /* ===== Colunas da grade =====
     A grade é uma Tabela de verdade (e não um grid solto) para reaproveitar rolagem
     horizontal, cabeçalho e acessibilidade da primitiva. A linha de totais é uma LINHA
     sintética no fim dos dados, e não o rodapé do componente: só assim os totais ficam
     alinhados embaixo da coluna do dia a que pertencem. */

  const LINHA_TOTAL = '__total__';

  const colunas = useMemo(() => {
    const colunaAtividade = {
      chave: 'atividade',
      titulo: 'Atividade',
      larguraMinima: 260,
      render: (linha) => {
        if (linha.id === LINHA_TOTAL) {
          return <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C7060]">Total do dia</span>;
        }
        return (
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#1A2B1F] leading-snug break-words">
              {linha.nome}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <Badge tom="neutro" tamanho="sm">
                {TIPOS[linha.tipo] || linha.tipo}
              </Badge>
              {linha.prioridade && (
                <Badge tom={TOM_PRIORIDADE[linha.prioridade] || 'neutro'} tamanho="sm">
                  {ROTULO_PRIORIDADE[linha.prioridade] || linha.prioridade}
                </Badge>
              )}
              {linha.projeto_id && (
                <Badge tom="verde" tamanho="sm" icone={FolderTree}>
                  {linha.projeto_nome || 'Projeto'}
                </Badge>
              )}
              {linha.sou_responsavel === false && (
                <span className="text-[10px] text-[#A8B4AC]">de outra pessoa</span>
              )}
            </div>
            <p className="text-[10px] text-[#8A9990] mt-1 tabular-nums">
              {linha.horas_planejadas === null || linha.horas_planejadas === undefined
                ? 'Sem horas planejadas'
                : `${fmtTotal(linha.horas_planejadas)} h planejadas na atividade`}
              {' · '}
              {fmtTotal(linha.minhas_horas_total)} h já lançadas por você
            </p>
          </div>
        );
      },
    };

    const colunasDias = dias.map((dia) => ({
      chave: dia,
      titulo: (
        <span className={`block leading-tight ${dia === HOJE ? 'text-[#F47920]' : ''}`}>
          {abreviacaoDoDia(dia)}
          <span className="block font-normal tabular-nums">{fmtDiaMes(dia)}</span>
        </span>
      ),
      alinhamento: 'centro',
      larguraMinima: 74,
      render: (linha) => {
        if (linha.id === LINHA_TOTAL) {
          const total = totalPorDia.get(dia) ?? 0;
          return (
            <span
              className={`text-xs font-bold tabular-nums ${total > 0 ? 'text-[#1A2B1F]' : 'text-[#A8B4AC]'}`}
            >
              {fmtTotal(total)}
            </span>
          );
        }
        const chave = chaveDe(linha.id, dia);
        return (
          <CelulaHora
            valor={porCelula.get(chave) ?? 0}
            editando={edicoes[chave]}
            salvando={salvandoChave === chave}
            desabilitado={salvandoChave === chave}
            fimDeSemana={ehFimDeSemana(dia)}
            hoje={dia === HOJE}
            rotulo={`Horas de ${linha.nome} em ${fmtData(dia)}`}
            onEditar={(texto) => editar(chave, texto)}
            onSalvar={() => salvarCelula(linha.id, dia)}
            onCancelar={() => cancelar(chave)}
          />
        );
      },
    }));

    const colunaTotal = {
      chave: 'total_linha',
      titulo: 'Semana',
      alinhamento: 'direita',
      larguraMinima: 84,
      render: (linha) => {
        if (linha.id === LINHA_TOTAL) {
          return (
            <span className="text-sm font-bold text-[#1A4731] tabular-nums">
              {fmtTotal(totalSemana)} h
            </span>
          );
        }
        return (
          <span className="text-xs font-semibold text-[#1A2B1F] tabular-nums">
            {fmtTotal(linha.minhas_horas_semana)} h
          </span>
        );
      },
    };

    return [colunaAtividade, ...colunasDias, colunaTotal];
    /* As funções capturadas (editar, cancelar, salvarCelula) só chamam setState e o
       mutate do TanStack Query, que é estável: refazer as colunas por causa delas
       remontaria a grade a cada render e tiraria o foco de quem está digitando. */
  }, [dias, porCelula, edicoes, salvandoChave, totalPorDia, totalSemana]);

  /* A linha de totais só entra quando existe pelo menos uma atividade: uma tabela com
     apenas a linha de total seria uma tela vazia disfarçada de dado. */
  const dadosDaGrade = linhas.length > 0 ? [...linhas, { id: LINHA_TOTAL }] : [];

  const disponiveisParaAcrescentar = (abertasQuery.data ?? []).filter(
    (a) => !linhas.some((linha) => linha.id === a.id),
  );

  const semanaAtual = inicio === SEMANA_DE_HOJE;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Navegação da semana ---------------------------------------------- */}
      <Cartao>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <BotaoSecundario
              tamanho="sm"
              icone={ChevronLeft}
              rotuloAcessivel="Semana anterior"
              titulo="Semana anterior"
              onClick={() => setSemana(somarDias(semana, -7))}
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#1A2B1F] tabular-nums">
                {fmtData(inicio)} a {fmtData(fim)}
              </p>
              <p className="text-[11px] text-[#5C7060]">
                {semanaAtual ? 'Semana corrente' : 'Outra semana'} · segunda a domingo
              </p>
            </div>
            <BotaoSecundario
              tamanho="sm"
              icone={ChevronRight}
              rotuloAcessivel="Semana seguinte"
              titulo="Semana seguinte"
              onClick={() => setSemana(somarDias(semana, 7))}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
                Total lançado por você
              </p>
              <p className="text-xl font-bold text-[#1A4731] tabular-nums">
                {fmtTotal(totalSemana)} h
              </p>
            </div>
            {!semanaAtual && (
              <BotaoSecundario tamanho="sm" icone={CalendarDays} onClick={() => setSemana(SEMANA_DE_HOJE)}>
                Voltar para esta semana
              </BotaoSecundario>
            )}
          </div>
        </div>
      </Cartao>

      {/* Instrução curta: a tela precisa ensinar o atalho, senão ninguém descobre que
          "3h30" funciona e que apagar a célula remove o lançamento. */}
      <AvisoDiscreto tom="azul" papel="nenhum" icone={Hourglass} titulo="Como lançar:">
        digite as horas na célula do dia e saia do campo (ou pressione Enter). Aceita
        número (3 ou 3,5) e hora com minuto (3h30, 3:30). Célula vazia apaga o lançamento
        daquele dia. Lançar de novo no mesmo dia corrige o valor, nunca soma em dobro.
      </AvisoDiscreto>

      {/* Grade ------------------------------------------------------------ */}
      <Tabela
        legenda={`Grade de lançamento de horas da semana de ${fmtData(inicio)} a ${fmtData(fim)}`}
        colunas={colunas}
        dados={dadosDaGrade}
        chaveLinha={(linha) => linha.id}
        carregando={horasQuery.isLoading}
        rotuloCarregando="Carregando a sua semana"
        erro={horasQuery.isError}
        classeLinha={(linha) => (linha.id === LINHA_TOTAL ? 'bg-[#F4F6F4]/70' : '')}
        vazio={
          <EstadoVazio
            icone={Clock}
            titulo="Nenhuma atividade na sua grade desta semana"
            texto="A grade traz as atividades abertas em que você é responsável e aquelas em que você já lançou horas na semana. Acrescente uma atividade abaixo para começar a apontar."
            acao={
              <BotaoPrimario como="link" para={createPageUrl('Atividades')} icone={ClipboardList} iconeDireita={ArrowRight}>
                Ver todas as atividades
              </BotaoPrimario>
            }
          />
        }
      />

      {/* Acrescentar atividade à grade ------------------------------------ */}
      <Cartao
        icone={Plus}
        tomIcone="laranja"
        titulo="Acrescentar atividade à grade"
        subtitulo="Para apontar hora em algo de que você não é responsável, ou que ainda não tem lançamento seu nesta semana."
      >
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <Campo
            rotulo="Atividade"
            tipo="select"
            rotuloVazio={
              disponiveisParaAcrescentar.length
                ? 'Escolha uma atividade aberta'
                : 'Nenhuma atividade aberta fora da grade'
            }
            valor={escolhaExtra}
            onChange={setEscolhaExtra}
            desabilitado={!disponiveisParaAcrescentar.length}
            opcoes={disponiveisParaAcrescentar.map((a) => ({
              valor: a.id,
              rotulo: `${a.nome}${a.projeto_nome ? ` (${a.projeto_nome})` : ''}`,
            }))}
            className="flex-1"
            dica={
              abertasQuery.isError
                ? 'Não foi possível carregar a lista de atividades agora.'
                : 'Só atividades não iniciadas ou em andamento aparecem aqui.'
            }
          />
          <BotaoSecundario icone={Plus} onClick={acrescentar} desabilitado={!escolhaExtra}>
            Acrescentar
          </BotaoSecundario>
        </div>
        {extras.length > 0 && (
          <p className="text-[10px] text-[#8A9990] mt-3 leading-relaxed">
            As atividades acrescentadas ficam na grade enquanto esta tela estiver aberta. Depois
            do primeiro lançamento, elas voltam sozinhas na semana em que houver hora apontada.
          </p>
        )}
      </Cartao>

      <p className="flex items-start gap-2 text-[11px] text-[#8A9990] px-1 leading-relaxed">
        <Clock size={12} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
        Esta tela mostra apenas as suas horas. A comparação entre planejado e realizado da
        equipe fica em{' '}
        <Link
          to={createPageUrl('Atividades')}
          className="font-semibold text-[#F47920] hover:text-[#e06810]"
        >
          Atividades
        </Link>
        , e é liberada aos perfis de gestão: horas por pessoa são dado ligado a desempenho.
      </p>
    </div>
  );
}

/**
 * Contratos e parcelas - obrigações financeiras dos fornecedores (issue #11).
 *
 * Esta tela é a metade financeira do domínio de fornecedores. A outra metade, o
 * cadastro de quem presta o serviço, é `src/pages/Fornecedores.jsx`. A separação está
 * justificada em `src/paginas/fornecedores.paginas.js`: são públicos diferentes, e as
 * parcelas (que são o volume) ficariam escondidas atrás de um fornecedor selecionado.
 *
 * As decisões que a tela obedece, todas nascidas do levantamento do Notion:
 *
 * 1. NÃO EXISTE STATUS MANUAL DE PARCELA. Pago / vencida / a vencer / em aberto são
 *    derivados da data de vencimento e da data de pagamento, sempre no servidor
 *    (public.carbon_parcelas_status). Baixar uma parcela é informar a data de
 *    pagamento; desfazer é limpá-la. É o requisito central da issue: no Notion o
 *    status é uma coluna à mão ao lado da data, e as duas divergem.
 * 2. DUAS VISÕES, MESMO DADO. A aba de contratos responde "quanto foi contratado e o
 *    que falta pagar"; a aba de parcelas responde "o que vence, quando e quanto".
 * 3. DIVERGÊNCIA É INFORMAÇÃO, NÃO ERRO. Contrato cujo valor não fecha com a soma das
 *    parcelas aparece marcado, e não escondido: pode ser aditivo, glosa ou série ainda
 *    não gerada. Quem decide o que fazer é a pessoa.
 * 4. GERAR SÉRIE É OPERAÇÃO ÚNICA. Contrato que já tem parcelas recusa a geração
 *    (409 'parcelas_ja_existem'): clique duplo não duplica obrigação financeira. Para
 *    refazer existe a opção explícita de substituir as parcelas em aberto, e ela é
 *    recusada quando já há parcela paga.
 *
 * AUTORIZAÇÃO: quem pode escrever é decidido no SERVIDOR (403 'sem_permissao', que
 * vira toast com texto claro). A tela não esconde ação por perfil, pelo mesmo motivo
 * documentado em Fornecedores.jsx: seria uma segunda fonte de verdade para a mesma
 * regra e ficaria dessincronizada na primeira mudança.
 *
 * O CÁLCULO DA SÉRIE NÃO É REPETIDO AQUI de propósito. Resto de centavos na última
 * parcela e vencimento contado sempre a partir do primeiro estão na função SQL (e no
 * espelho de demonstração). Uma prévia calculada na tela seria uma quarta cópia da
 * regra, e o número que ela mostrasse poderia não ser o que o servidor grava.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FileCheck2, Plus, Pencil, Building2, Search, CalendarClock, TriangleAlert,
  CircleDollarSign, ListPlus, CheckCircle2, Undo2, Trash2, Layers, Coins,
  ArrowRight, Scale, Wallet,
} from 'lucide-react';
import {
  listarContratos,
  criarContrato,
  obterContrato,
  atualizarContrato,
  gerarParcelas,
  criarParcela,
  listarParcelas,
  atualizarParcela,
  removerParcela,
  listarFornecedores,
  PERIODICIDADES,
  JANELA_A_VENCER_DIAS,
} from '@/lib/api/fornecedores';
import { listarProjetos } from '@/lib/api/projetos';
import { MODO_DEMO } from '@/lib/runtimeConfig';
import { rotaDaPagina } from '@/lib/pageRoutes';
import Cartao from '@/components/ui/Cartao';
import CabecalhoSecao from '@/components/ui/CabecalhoSecao';
import Tabela from '@/components/ui/Tabela';
import Badge from '@/components/ui/Badge';
import Campo from '@/components/ui/Campo';
import PainelLateral from '@/components/ui/PainelLateral';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import Carregando from '@/components/ui/Carregando';
import EstadoVazio from '@/components/ui/EstadoVazio';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';

/* ===== Domínio ============================================================
   Espelham os CHECK da migration 20260814097000_fornecedores. Valor fora do mapa
   ainda aparece na tela, com o rótulo cru, em vez de sumir: status novo criado no
   banco antes do deploy do frontend não pode deixar a linha sem identificação.   */

const STATUS_CONTRATO = {
  ativo: { rotulo: 'Ativo', tom: 'verde' },
  encerrado: { rotulo: 'Encerrado', tom: 'neutro' },
  cancelado: { rotulo: 'Cancelado', tom: 'vermelho' },
};

const OPCOES_STATUS_CONTRATO = Object.keys(STATUS_CONTRATO).map((valor) => ({
  valor,
  rotulo: STATUS_CONTRATO[valor].rotulo,
}));

/**
 * Status de pagamento da parcela. NÃO é um campo: é derivado pelo servidor.
 * Por isso não existe nenhum seletor deste vocabulário em formulário nenhum.
 */
const STATUS_PARCELA = {
  paga: { rotulo: 'Paga', tom: 'verde' },
  vencida: { rotulo: 'Vencida', tom: 'vermelho' },
  a_vencer: { rotulo: 'A vencer', tom: 'ambar' },
  em_aberto: { rotulo: 'Em aberto', tom: 'azul' },
};

const VISOES_PARCELA = [
  { valor: 'em_aberto', rotulo: 'Em aberto' },
  { valor: 'pagas', rotulo: 'Pagas' },
  { valor: 'calendario', rotulo: 'Calendário' },
  { valor: 'todas', rotulo: 'Todas' },
];

const OPCOES_PERIODICIDADE = PERIODICIDADES.map(({ valor, rotulo }) => ({ valor, rotulo }));

/**
 * De onde sai o valor da série gerada.
 *
 * Existe como escolha explícita porque o backend recusa valor_total e valor_parcela
 * juntos (409 'valor_ambiguo'). Um formulário com os dois campos abertos convidaria
 * justamente ao erro que o servidor recusa.
 */
const BASES_VALOR = [
  { valor: 'contrato', rotulo: 'Usar o valor total do contrato' },
  { valor: 'total', rotulo: 'Informar o valor total da série' },
  { valor: 'parcela', rotulo: 'Informar o valor de cada parcela' },
];

/** Valor especial do filtro de projeto: contratos que não pertencem a projeto nenhum. */
const BACKOFFICE = 'backoffice';
/** Valor especial do filtro de centro de custo: parcelas sem centro preenchido. */
const SEM_CENTRO = 'sem_centro';

/* ===== Formatação ========================================================= */

function fmtMoeda(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Formata uma coluna `date` do Postgres, que chega como 'AAAA-MM-DD'.
 *
 * Feito na mão de propósito: new Date('2026-01-01') é meia-noite UTC e, no fuso do
 * Brasil, toLocaleDateString mostraria o dia ANTERIOR - e aqui a data é vencimento de
 * parcela, exatamente onde um dia de diferença importa.
 */
function fmtData(valor) {
  if (!valor) return '-';
  const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!partes) return String(valor);
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** 'AAAA-MM' -> 'agosto de 2026'. Mesma aritmética manual, mesmo motivo. */
function fmtMes(valor) {
  const partes = String(valor ?? '').match(/^(\d{4})-(\d{2})/);
  if (!partes) return String(valor ?? '-');
  const indice = Number(partes[2]) - 1;
  return `${MESES[indice] ?? partes[2]} de ${partes[1]}`;
}

/** Hoje em 'AAAA-MM-DD', no fuso local: a baixa é lançada no dia de quem clica. */
function hojeIso() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/** Primeiro dia do mês atual, usado como início padrão do período de parcelas. */
function inicioDoMes() {
  return `${hojeIso().slice(0, 7)}-01`;
}

/** Último dia de um mês N meses à frente do atual. */
function fimDeMesesAFrente(meses) {
  const agora = new Date();
  const alvo = new Date(agora.getFullYear(), agora.getMonth() + meses + 1, 0);
  const mes = String(alvo.getMonth() + 1).padStart(2, '0');
  const dia = String(alvo.getDate()).padStart(2, '0');
  return `${alvo.getFullYear()}-${mes}-${dia}`;
}

/**
 * Diferença em centavos entre o valor contratado e a soma das parcelas.
 *
 * Em centavos inteiros porque somar float acumula erro e faria a tela apontar
 * divergência de um centavo que não existe. Contrato sem valor total informado não
 * diverge de nada: devolve 0.
 */
function divergenciaCentavos(contrato) {
  const total = Math.round((Number(contrato?.valor_total) || 0) * 100);
  if (total === 0) return 0;
  const parcelado = Math.round((Number(contrato?.valor_parcelado) || 0) * 100);
  return parcelado - total;
}

/* ===== Formulários ========================================================
   Campos de dinheiro viajam como STRING, não como Number: a pessoa digita
   "13.250,50" e a conversão para número mora no servidor (e no espelho do demo), que
   já recusa o milhar ambíguo. Converter aqui criaria uma segunda regra de leitura de
   número, com arredondamento próprio.                                            */

const FORM_CONTRATO_VAZIO = {
  fornecedor_id: '',
  projeto_id: '',
  objeto: '',
  data_contratacao: '',
  valor_total: '',
  centro_custo: '',
  tipo_servico: '',
  status: 'ativo',
  observacoes: '',
};

function formDoContrato(contrato) {
  return {
    ...FORM_CONTRATO_VAZIO,
    fornecedor_id: contrato?.fornecedor_id ?? '',
    projeto_id: contrato?.projeto_id ?? '',
    objeto: contrato?.objeto ?? '',
    data_contratacao: contrato?.data_contratacao ?? '',
    valor_total: contrato?.valor_total === null || contrato?.valor_total === undefined
      ? ''
      : String(contrato.valor_total).replace('.', ','),
    centro_custo: contrato?.centro_custo ?? '',
    tipo_servico: contrato?.tipo_servico ?? '',
    status: contrato?.status || 'ativo',
    observacoes: contrato?.observacoes ?? '',
  };
}

/**
 * Monta o corpo do contrato.
 *
 * `editando` muda o significado de campo vazio: na edição vai como null (limpar), na
 * criação é omitido (deixa o default do banco). Sem isso, apagar um campo já
 * preenchido seria impossível, com a tela ainda dizendo "atualizado".
 */
function payloadDoContrato(form, editando) {
  const objeto = String(form.objeto ?? '').trim();
  if (!objeto) throw new Error('Descreva o objeto do contrato.');
  const fornecedorId = String(form.fornecedor_id ?? '').trim();
  if (!fornecedorId) throw new Error('Escolha o fornecedor deste contrato.');

  const payload = { fornecedor_id: fornecedorId, objeto, status: form.status };

  for (const campo of [
    'projeto_id', 'data_contratacao', 'valor_total', 'centro_custo', 'tipo_servico',
    'observacoes',
  ]) {
    const valor = String(form[campo] ?? '').trim();
    if (valor) payload[campo] = valor;
    else if (editando) payload[campo] = null;
  }

  return payload;
}

const FORM_SERIE_VAZIO = {
  quantidade: '12',
  periodicidade: 'mensal',
  primeiro_vencimento: '',
  base_valor: 'contrato',
  valor: '',
  descricao: '',
  tipo_servico: '',
  centro_custo: '',
  substituir: false,
};

function payloadDaSerie(form) {
  const quantidade = Number(String(form.quantidade ?? '').trim());
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    throw new Error('Informe a quantidade de parcelas (número inteiro a partir de 1).');
  }
  if (form.periodicidade === 'unica' && quantidade !== 1) {
    throw new Error('Pagamento único gera exatamente uma parcela.');
  }
  if (!form.primeiro_vencimento) {
    throw new Error('Informe a data do primeiro vencimento.');
  }

  const payload = {
    quantidade,
    periodicidade: form.periodicidade,
    primeiro_vencimento: form.primeiro_vencimento,
    substituir: form.substituir === true,
  };

  // Um valor OU o outro, nunca os dois: o servidor responde 'valor_ambiguo'.
  if (form.base_valor !== 'contrato') {
    const valor = String(form.valor ?? '').trim();
    if (!valor) throw new Error('Informe o valor escolhido para a série.');
    if (form.base_valor === 'total') payload.valor_total = valor;
    else payload.valor_parcela = valor;
  }

  for (const campo of ['descricao', 'tipo_servico', 'centro_custo']) {
    const valor = String(form[campo] ?? '').trim();
    if (valor) payload[campo] = valor;
  }

  return payload;
}

const FORM_PARCELA_VAZIO = {
  valor: '',
  vencimento: '',
  descricao: '',
  tipo_servico: '',
  centro_custo: '',
  data_pagamento: '',
  observacoes: '',
};

function formDaParcela(parcela) {
  return {
    ...FORM_PARCELA_VAZIO,
    valor: parcela?.valor === null || parcela?.valor === undefined
      ? ''
      : String(parcela.valor).replace('.', ','),
    vencimento: parcela?.vencimento ?? '',
    descricao: parcela?.descricao ?? '',
    tipo_servico: parcela?.tipo_servico ?? '',
    centro_custo: parcela?.centro_custo ?? '',
    data_pagamento: parcela?.data_pagamento ?? '',
    observacoes: parcela?.observacoes ?? '',
  };
}

function payloadDaParcela(form, editando) {
  const valor = String(form.valor ?? '').trim();
  if (!valor) throw new Error('Informe o valor da parcela.');
  if (!form.vencimento) throw new Error('Informe a data de vencimento.');

  const payload = { valor, vencimento: form.vencimento };

  for (const campo of ['descricao', 'tipo_servico', 'centro_custo', 'observacoes']) {
    const bruto = String(form[campo] ?? '').trim();
    if (bruto) payload[campo] = bruto;
    else if (editando) payload[campo] = null;
  }

  // Data de pagamento vazia é uma informação, não a ausência de uma: significa
  // parcela em aberto. Por isso vai como null também na criação.
  const pagamento = String(form.data_pagamento ?? '').trim();
  payload.data_pagamento = pagamento || null;

  return payload;
}

/* ===== Blocos de interface ================================================ */

function BadgeContrato({ status }) {
  const visual = STATUS_CONTRATO[status];
  return <Badge tom={visual?.tom ?? 'neutro'}>{visual?.rotulo || status || 'Sem status'}</Badge>;
}

function BadgeParcela({ status }) {
  const visual = STATUS_PARCELA[status];
  return (
    <Badge tom={visual?.tom ?? 'neutro'} tamanho="sm">
      {visual?.rotulo || status || 'Sem status'}
    </Badge>
  );
}

/** Rótulo curto + valor, para o painel de detalhe. */
function Dado({ icone: Icone, rotulo, children, className = '' }) {
  return (
    <div className={`flex items-start gap-2 min-w-0 ${className}`}>
      {Icone && <Icone size={14} className="text-[#8A9990] mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
          {rotulo}
        </p>
        <div className="text-xs text-[#1A2B1F] leading-relaxed break-words">{children}</div>
      </div>
    </div>
  );
}

/** Faixa de números. Sempre do conjunto FILTRADO inteiro, nunca da página visível. */
function FaixaResumo({ itens }) {
  if (!itens?.length) return null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {itens.map((item) => (
        <div
          key={item.rotulo}
          className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm px-4 py-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
            {item.rotulo}
          </p>
          <p
            className={`text-base font-bold tabular-nums mt-0.5 ${item.alerta ? 'text-[#A3231C]' : 'text-[#1A2B1F]'}`}
          >
            {item.valor}
          </p>
          <p className="text-[11px] text-[#5C7060]">{item.detalhe}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Aviso de divergência entre o valor contratado e a soma das parcelas.
 *
 * Texto diferente para cada caso porque a ação seguinte é diferente: sem parcela
 * nenhuma o caminho é gerar a série; com parcela a menos ou a mais é conferir aditivo
 * e glosa. Um texto genérico obrigaria a pessoa a descobrir isso sozinha.
 */
function AvisoDivergencia({ contrato }) {
  const diferenca = divergenciaCentavos(contrato);
  if (diferenca === 0) return null;

  const parcelas = Number(contrato?.parcelas) || 0;
  const valor = fmtMoeda(Math.abs(diferenca) / 100);

  if (parcelas === 0) {
    return (
      <AvisoDiscreto tom="ambar" icone={Layers} titulo="Contrato sem parcelas geradas.">
        O valor contratado é {fmtMoeda(contrato?.valor_total)} e não há nenhuma parcela
        registrada, então não existe vencimento a acompanhar nem valor a pagar no
        calendário.
      </AvisoDiscreto>
    );
  }

  return (
    <AvisoDiscreto tom="ambar" icone={Scale} titulo="Valor parcelado diferente do contratado.">
      A soma das parcelas está {diferenca > 0 ? 'acima' : 'abaixo'} do valor do contrato
      em {valor}. Não é necessariamente um erro: aditivo, glosa e série parcial produzem
      a mesma diferença. Confira antes de pagar.
    </AvisoDiscreto>
  );
}

/** Tabela de parcelas do contrato aberto, com as ações de baixa. */
function ParcelasDoContrato({
  parcelas,
  carregando,
  onBaixar,
  onDesfazer,
  onEditar,
  onRemover,
  idEmOperacao,
}) {
  if (carregando) return <Carregando rotulo="Carregando parcelas do contrato" tamanho="sm" />;

  if (!parcelas.length) {
    return (
      <EstadoVazio
        compacto
        icone={Layers}
        titulo="Nenhuma parcela registrada"
        texto="Sem parcela não há vencimento a acompanhar. Gere a série de uma vez ou lance uma parcela avulsa."
      />
    );
  }

  return (
    <div className="border border-[#DDE3DE] rounded-xl divide-y divide-[#F4F6F4]">
      {parcelas.map((parcela) => {
        const paga = parcela.status_pagamento === 'paga';
        const ocupada = idEmOperacao === parcela.id;
        return (
          <div key={parcela.id} className="px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#1A2B1F]">
                  Parcela {parcela.numero}
                  {parcela.descricao && (
                    <span className="font-normal text-[#5C7060]"> - {parcela.descricao}</span>
                  )}
                </p>
                <p className="text-[11px] text-[#5C7060] tabular-nums mt-0.5">
                  Vence {fmtData(parcela.vencimento)}
                  {paga
                    ? ` - paga em ${fmtData(parcela.data_pagamento)}${parcela.atraso_dias > 0 ? ` (${parcela.atraso_dias} ${parcela.atraso_dias === 1 ? 'dia' : 'dias'} de atraso)` : ''}`
                    : parcela.status_pagamento === 'vencida'
                      ? ` - ${parcela.atraso_dias} ${parcela.atraso_dias === 1 ? 'dia' : 'dias'} de atraso`
                      : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-bold tabular-nums text-[#1A2B1F]">
                  {fmtMoeda(parcela.valor)}
                </span>
                <BadgeParcela status={parcela.status_pagamento} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {paga ? (
                <BotaoSecundario
                  variante="fantasma"
                  tamanho="sm"
                  icone={Undo2}
                  onClick={() => onDesfazer(parcela)}
                  carregando={ocupada}
                >
                  Desfazer baixa
                </BotaoSecundario>
              ) : (
                <BotaoSecundario
                  tamanho="sm"
                  icone={CheckCircle2}
                  onClick={() => onBaixar(parcela)}
                  carregando={ocupada}
                >
                  Registrar pagamento
                </BotaoSecundario>
              )}
              <BotaoSecundario
                variante="fantasma"
                tamanho="sm"
                icone={Pencil}
                onClick={() => onEditar(parcela)}
              >
                Editar
              </BotaoSecundario>
              {/* Parcela paga é registro de pagamento efetuado: o backend recusa a
                  remoção com 409 'parcela_paga'. O botão some para a recusa não virar
                  a descoberta do limite. */}
              {!paga && (
                <BotaoSecundario
                  variante="perigo"
                  tamanho="sm"
                  icone={Trash2}
                  onClick={() => onRemover(parcela)}
                >
                  Remover
                </BotaoSecundario>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Quebra dos totais por mês e por centro de custo, na aba de parcelas. */
function QuebraDeTotais({ totais }) {
  const porMes = totais?.por_mes ?? [];
  const porCentro = totais?.por_centro_custo ?? [];
  if (!porMes.length && !porCentro.length) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {porMes.length > 0 && (
        <Cartao icone={CalendarClock} titulo="Por mês de vencimento" nivelTitulo={3}>
          <div className="divide-y divide-[#F4F6F4]">
            {porMes.map((linha) => (
              <div key={linha.mes} className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="text-xs text-[#1A2B1F] capitalize">{fmtMes(linha.mes)}</span>
                <span className="text-xs tabular-nums text-[#5C7060]">
                  <span className="font-semibold text-[#1A2B1F]">{fmtMoeda(linha.valor)}</span>
                  {' '}em {linha.quantidade} {linha.quantidade === 1 ? 'parcela' : 'parcelas'}
                  {(linha.valor_vencido ?? 0) > 0 && (
                    <span className="font-semibold text-[#A3231C]">
                      {' '}- {fmtMoeda(linha.valor_vencido)} vencidos
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </Cartao>
      )}

      {porCentro.length > 0 && (
        <Cartao icone={Coins} titulo="Por centro de custo" nivelTitulo={3}>
          <div className="divide-y divide-[#F4F6F4]">
            {porCentro.map((linha) => (
              <div
                key={linha.centro_custo ?? 'sem-centro'}
                className="flex items-baseline justify-between gap-3 py-1.5"
              >
                <span className="text-xs text-[#1A2B1F]">
                  {linha.centro_custo || (
                    <span className="text-[#8A9990]">Sem centro de custo</span>
                  )}
                </span>
                <span className="text-xs tabular-nums text-[#5C7060]">
                  <span className="font-semibold text-[#1A2B1F]">{fmtMoeda(linha.valor)}</span>
                  {' '}- {fmtMoeda(linha.valor_aberto)} em aberto
                </span>
              </div>
            ))}
          </div>
        </Cartao>
      )}
    </div>
  );
}

/** Parcelas agrupadas por mês, para a visão de calendário. */
function CalendarioDeParcelas({ parcelas, onAbrirContrato }) {
  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const parcela of parcelas) {
      const mes = String(parcela.vencimento ?? '').slice(0, 7);
      if (!mapa.has(mes)) mapa.set(mes, []);
      mapa.get(mes).push(parcela);
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [parcelas]);

  if (!grupos.length) {
    return (
      <EstadoVazio
        comSuperficie
        icone={CalendarClock}
        titulo="Nenhum vencimento no período"
        texto="Amplie o período ou tire um filtro. O calendário mostra as parcelas pela data de vencimento, pagas e em aberto."
      />
    );
  }

  return (
    <div className="space-y-4">
      {grupos.map(([mes, itens]) => {
        const total = itens.reduce((soma, p) => soma + (Number(p.valor) || 0), 0);
        return (
          <Cartao
            key={mes}
            titulo={fmtMes(mes)}
            nivelTitulo={3}
            icone={CalendarClock}
            subtitulo={`${itens.length} ${itens.length === 1 ? 'parcela' : 'parcelas'} - ${fmtMoeda(total)}`}
            semPaddingCorpo
          >
            <div className="divide-y divide-[#F4F6F4]">
              {itens.map((parcela) => (
                <button
                  key={parcela.id}
                  type="button"
                  onClick={() => onAbrirContrato(parcela.contrato_id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#F4F6F4]/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1A2B1F] break-words">
                        {parcela.fornecedor_nome || 'Fornecedor não identificado'}
                      </p>
                      <p className="text-[11px] text-[#5C7060] break-words">
                        {parcela.contrato_objeto}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-[#8A9990] tabular-nums">
                        {fmtData(parcela.vencimento)}
                      </span>
                      <span className="text-xs font-bold tabular-nums text-[#1A2B1F]">
                        {fmtMoeda(parcela.valor)}
                      </span>
                      <BadgeParcela status={parcela.status_pagamento} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Cartao>
        );
      })}
    </div>
  );
}

/* ===== Página ============================================================= */

export default function Contratos() {
  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const autenticado = (accounts?.length ?? 0) > 0;
  const habilitado = MODO_DEMO || autenticado;
  const queryClient = useQueryClient();

  /* A tela de Fornecedores linka para cá com ?fornecedor_id=..., e é assim que o
     "abrir na tela de contratos" chega filtrado. Lido uma vez, na montagem: depois
     disso quem manda é o estado do filtro, senão mexer no seletor seria desfeito pela
     URL a cada render. */
  const [searchParams] = useSearchParams();
  const [aba, setAba] = useState('contratos');
  const [filtros, setFiltros] = useState(() => ({
    busca: '',
    fornecedor_id: searchParams.get('fornecedor_id') ?? '',
    projeto_id: searchParams.get('projeto_id') ?? '',
    status: '',
    centro_custo: '',
  }));
  const [periodo, setPeriodo] = useState(() => ({
    inicio: inicioDoMes(),
    fim: fimDeMesesAFrente(2),
  }));
  const [visao, setVisao] = useState('em_aberto');

  /** null | { modo: 'detalhe' | 'novo' | 'editar' | 'serie' | 'parcela', id?, parcelaId? } */
  const [painel, setPainel] = useState(() => {
    const contratoId = searchParams.get('contrato_id');
    return contratoId ? { modo: 'detalhe', id: contratoId } : null;
  });
  const [formContrato, setFormContrato] = useState(FORM_CONTRATO_VAZIO);
  const [formSerie, setFormSerie] = useState(FORM_SERIE_VAZIO);
  const [formParcela, setFormParcela] = useState(FORM_PARCELA_VAZIO);
  const [parcelaEmOperacao, setParcelaEmOperacao] = useState(null);

  const rotaFornecedores = rotaDaPagina('Fornecedores') ?? '/Fornecedores';

  /* ===== Consultas ======================================================== */

  const contratosQuery = useQuery({
    queryKey: ['carbon', 'contratos', filtros],
    queryFn: async () =>
      listarContratos(msal, {
        busca: filtros.busca || undefined,
        fornecedor_id: filtros.fornecedor_id || undefined,
        projeto_id: filtros.projeto_id || undefined,
        status: filtros.status || undefined,
        centro_custo: filtros.centro_custo || undefined,
        limite: 200,
      }),
    /* Em modo demonstração não existe conta no MSAL (o login fica desabilitado) e as
       funções da API não usam token: exigir `autenticado` deixaria a tela
       permanentemente vazia justamente no modo que existe para revisá-la. */
    enabled: habilitado,
  });

  const parcelasQuery = useQuery({
    queryKey: ['carbon', 'parcelas', { ...filtros, ...periodo, visao }],
    queryFn: async () =>
      listarParcelas(msal, {
        visao,
        inicio: periodo.inicio || undefined,
        fim: periodo.fim || undefined,
        fornecedor_id: filtros.fornecedor_id || undefined,
        projeto_id: filtros.projeto_id || undefined,
        centro_custo: filtros.centro_custo || undefined,
        limite: 500,
      }),
    // Só busca quando a aba está aberta: são duas listagens do mesmo domínio e não faz
    // sentido pagar pela segunda enquanto ninguém a está vendo.
    enabled: habilitado && aba === 'parcelas',
  });

  const fornecedoresQuery = useQuery({
    queryKey: ['carbon', 'fornecedores', 'para-contrato'],
    queryFn: async () => listarFornecedores(msal, { limite: 200 }),
    enabled: habilitado,
  });

  const projetosQuery = useQuery({
    queryKey: ['carbon', 'projetos'],
    queryFn: async () => {
      const resposta = await listarProjetos(msal);
      return Array.isArray(resposta) ? resposta : (resposta?.projetos ?? []);
    },
    enabled: habilitado,
  });

  const idAberto = painel?.id ?? null;
  const detalheQuery = useQuery({
    queryKey: ['carbon', 'contrato', idAberto],
    queryFn: async () => obterContrato(msal, idAberto),
    enabled: Boolean(idAberto) && habilitado,
  });

  const contratos = contratosQuery.data?.contratos ?? [];
  const resumo = contratosQuery.data?.resumo ?? null;
  const parcelas = parcelasQuery.data?.parcelas ?? [];
  const totais = parcelasQuery.data?.totais ?? null;
  const fornecedores = fornecedoresQuery.data?.fornecedores ?? [];
  const projetos = projetosQuery.data ?? [];
  const detalhe = detalheQuery.data?.contrato ?? null;
  const parcelasDoDetalhe = detalheQuery.data?.parcelas ?? [];

  /* Centros de custo conhecidos, ACUMULADOS.
     Se as opções saíssem apenas da resposta atual, escolher um centro filtraria a
     lista e faria todos os outros sumirem do seletor: seria impossível trocar de
     centro sem antes limpar o filtro. */
  const [centrosConhecidos, setCentrosConhecidos] = useState([]);
  useEffect(() => {
    const vindos = [
      ...contratos.map((c) => c.centro_custo),
      ...(totais?.por_centro_custo ?? []).map((c) => c.centro_custo),
    ].filter((valor) => typeof valor === 'string' && valor.trim() !== '');

    setCentrosConhecidos((atual) => {
      const novos = vindos.filter((valor) => !atual.includes(valor));
      if (novos.length === 0) return atual;
      return [...new Set([...atual, ...novos])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    });
  }, [contratos, totais]);

  const opcoesFornecedor = useMemo(
    () => fornecedores.map((f) => ({ valor: f.id, rotulo: f.nome })),
    [fornecedores],
  );

  const opcoesProjeto = useMemo(
    () => projetos.map((p) => ({ valor: p.id, rotulo: p.nome ?? p.titulo ?? p.id })),
    [projetos],
  );

  const opcoesCentro = useMemo(
    () => [
      ...centrosConhecidos.map((valor) => ({ valor, rotulo: valor })),
      { valor: SEM_CENTRO, rotulo: 'Sem centro de custo' },
    ],
    [centrosConhecidos],
  );

  /* ===== Painéis ========================================================== */

  const fecharPainel = () => setPainel(null);

  const abrirDetalhe = (contratoOuId) => {
    const id = typeof contratoOuId === 'string' ? contratoOuId : contratoOuId?.id;
    if (id) setPainel({ modo: 'detalhe', id });
  };

  const abrirNovoContrato = () => {
    setFormContrato({
      ...FORM_CONTRATO_VAZIO,
      // Já dentro de um filtro por fornecedor ou projeto, o contrato novo quase sempre
      // é daquele fornecedor ou projeto: o filtro vira o valor inicial do formulário.
      fornecedor_id: filtros.fornecedor_id || '',
      projeto_id: filtros.projeto_id === BACKOFFICE ? '' : filtros.projeto_id || '',
    });
    setPainel({ modo: 'novo' });
  };

  const abrirEdicaoContrato = () => {
    if (!detalhe) return;
    setFormContrato(formDoContrato(detalhe));
    setPainel({ modo: 'editar', id: detalhe.id });
  };

  const abrirSerie = () => {
    if (!detalhe) return;
    setFormSerie({
      ...FORM_SERIE_VAZIO,
      primeiro_vencimento: detalhe.data_contratacao || hojeIso(),
      tipo_servico: detalhe.tipo_servico ?? '',
      centro_custo: detalhe.centro_custo ?? '',
      // Contrato que já tem parcelas só pode ser regerado com substituição explícita.
      substituir: (Number(detalhe.parcelas) || 0) > 0,
    });
    setPainel({ modo: 'serie', id: detalhe.id });
  };

  const abrirParcelaNova = () => {
    if (!detalhe) return;
    setFormParcela({
      ...FORM_PARCELA_VAZIO,
      vencimento: hojeIso(),
      tipo_servico: detalhe.tipo_servico ?? '',
      centro_custo: detalhe.centro_custo ?? '',
    });
    setPainel({ modo: 'parcela', id: detalhe.id });
  };

  const abrirParcelaEdicao = (parcela) => {
    setFormParcela(formDaParcela(parcela));
    setPainel({ modo: 'parcela', id: parcela.contrato_id, parcelaId: parcela.id });
  };

  /* ===== Mutações ========================================================= */

  /** Depois de qualquer escrita, os agregados de contrato e fornecedor mudaram. */
  const revalidar = (contratoId) => {
    queryClient.invalidateQueries({ queryKey: ['carbon', 'contratos'] });
    queryClient.invalidateQueries({ queryKey: ['carbon', 'parcelas'] });
    queryClient.invalidateQueries({ queryKey: ['carbon', 'fornecedores'] });
    if (contratoId) {
      queryClient.invalidateQueries({ queryKey: ['carbon', 'contrato', contratoId] });
    }
  };

  const salvarContrato = useMutation({
    mutationFn: async ({ id, payload }) =>
      id ? atualizarContrato(msal, id, payload) : criarContrato(msal, payload),
    onSuccess: (resposta, variaveis) => {
      revalidar(variaveis?.id ?? resposta?.contrato?.id);
      toast.success(variaveis?.id ? 'Contrato atualizado.' : 'Contrato cadastrado.');
      // Depois de criar, abre o detalhe: o passo seguinte é quase sempre gerar as
      // parcelas, e voltar para a lista obrigaria a procurar o contrato de novo.
      const id = variaveis?.id ?? resposta?.contrato?.id;
      if (id) setPainel({ modo: 'detalhe', id });
      else fecharPainel();
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar o contrato.'),
  });

  const salvarSerie = useMutation({
    mutationFn: async ({ id, payload }) => gerarParcelas(msal, id, payload),
    onSuccess: (resposta, variaveis) => {
      revalidar(variaveis?.id);
      const criadas = resposta?.geracao?.criadas ?? 0;
      toast.success(`${criadas} ${criadas === 1 ? 'parcela gerada' : 'parcelas geradas'}.`);
      setPainel({ modo: 'detalhe', id: variaveis?.id });
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível gerar as parcelas.'),
  });

  const salvarParcela = useMutation({
    mutationFn: async ({ contratoId, parcelaId, payload }) =>
      parcelaId
        ? atualizarParcela(msal, parcelaId, payload)
        : criarParcela(msal, contratoId, payload),
    onSuccess: (_resposta, variaveis) => {
      revalidar(variaveis?.contratoId);
      toast.success(variaveis?.parcelaId ? 'Parcela atualizada.' : 'Parcela lançada.');
      setPainel({ modo: 'detalhe', id: variaveis?.contratoId });
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar a parcela.'),
  });

  /**
   * Baixa e estorno da baixa.
   *
   * Um único caminho, com data_pagamento indo preenchida ou null: é o que garante que
   * o status derivado e o registro do pagamento nunca contem histórias diferentes.
   */
  const baixarParcela = useMutation({
    mutationFn: async ({ parcela, data }) =>
      atualizarParcela(msal, parcela.id, { data_pagamento: data }),
    onMutate: ({ parcela }) => setParcelaEmOperacao(parcela.id),
    onSuccess: (_resposta, variaveis) => {
      revalidar(variaveis?.parcela?.contrato_id);
      toast.success(variaveis?.data ? 'Pagamento registrado.' : 'Baixa desfeita.');
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível atualizar a parcela.'),
    onSettled: () => setParcelaEmOperacao(null),
  });

  const excluirParcela = useMutation({
    mutationFn: async (parcela) => removerParcela(msal, parcela.id),
    onSuccess: (_resposta, parcela) => {
      revalidar(parcela?.contrato_id);
      toast.success('Parcela removida.');
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível remover a parcela.'),
  });

  const enviarContrato = () => {
    let payload;
    try {
      payload = payloadDoContrato(formContrato, painel?.modo === 'editar');
    } catch (erro) {
      toast.error(erro?.message || 'Revise os campos do formulário.');
      return;
    }
    salvarContrato.mutate({ id: painel?.modo === 'editar' ? painel.id : null, payload });
  };

  const enviarSerie = () => {
    let payload;
    try {
      payload = payloadDaSerie(formSerie);
    } catch (erro) {
      toast.error(erro?.message || 'Revise os campos da série.');
      return;
    }
    salvarSerie.mutate({ id: painel?.id, payload });
  };

  const enviarParcela = () => {
    let payload;
    try {
      payload = payloadDaParcela(formParcela, Boolean(painel?.parcelaId));
    } catch (erro) {
      toast.error(erro?.message || 'Revise os campos da parcela.');
      return;
    }
    salvarParcela.mutate({
      contratoId: painel?.id,
      parcelaId: painel?.parcelaId ?? null,
      payload,
    });
  };

  const removerComConfirmacao = (parcela) => {
    /* Confirmação nativa de propósito: apagar obrigação financeira é irreversível e um
       diálogo próprio só para isto seria mais código para a mesma pergunta. */
    const texto = `Remover a parcela ${parcela.numero}, de ${fmtMoeda(parcela.valor)}, com vencimento em ${fmtData(parcela.vencimento)}?`;
    if (!window.confirm(texto)) return;
    excluirParcela.mutate(parcela);
  };

  /* ===== Colunas ========================================================== */

  const colunasContratos = [
    {
      chave: 'objeto',
      titulo: 'Contrato',
      larguraMinima: 280,
      render: (linha) => (
        <div className="min-w-0">
          <span className="font-semibold text-[#1A2B1F] break-words">
            {linha.objeto || 'Sem objeto'}
          </span>
          <span className="block text-[11px] text-[#5C7060] break-words">
            {linha.fornecedor_nome || 'Fornecedor não identificado'}
          </span>
        </div>
      ),
    },
    {
      chave: 'projeto_nome',
      titulo: 'Projeto',
      larguraMinima: 170,
      render: (linha) =>
        linha.projeto_nome || (
          <Badge tom="neutro" tamanho="sm">
            Backoffice
          </Badge>
        ),
    },
    {
      chave: 'status',
      titulo: 'Situação',
      larguraMinima: 120,
      render: (linha) => <BadgeContrato status={linha.status} />,
    },
    {
      chave: 'valor_total',
      titulo: 'Contratado',
      numerica: true,
      larguraMinima: 140,
      render: (linha) => {
        const diferenca = divergenciaCentavos(linha);
        return (
          <span>
            {fmtMoeda(linha.valor_total)}
            {diferenca !== 0 && (
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8A5A12]">
                parcelado {fmtMoeda(linha.valor_parcelado)}
              </span>
            )}
          </span>
        );
      },
    },
    {
      chave: 'parcelas',
      titulo: 'Parcelas',
      numerica: true,
      larguraMinima: 110,
      render: (linha) => {
        const total = Number(linha.parcelas) || 0;
        if (total === 0) return <span className="text-[#8A9990]">nenhuma</span>;
        return (
          <span>
            {linha.parcelas_pagas ?? 0}/{total}
            <span className="block text-[10px] uppercase tracking-wider text-[#8A9990]">
              pagas
            </span>
          </span>
        );
      },
    },
    {
      chave: 'valor_aberto',
      titulo: 'Em aberto',
      numerica: true,
      larguraMinima: 130,
      render: (linha) =>
        (Number(linha.valor_aberto) || 0) === 0 ? (
          <span className="text-[#8A9990]">-</span>
        ) : (
          fmtMoeda(linha.valor_aberto)
        ),
    },
    {
      chave: 'valor_vencido',
      titulo: 'Vencido',
      numerica: true,
      larguraMinima: 130,
      render: (linha) => {
        const vencido = Number(linha.valor_vencido) || 0;
        if (vencido === 0) return <span className="text-[#8A9990]">-</span>;
        return (
          <span className="font-semibold text-[#A3231C]">
            {fmtMoeda(vencido)}
            <span className="block text-[10px] font-semibold uppercase tracking-wider">
              {linha.parcelas_vencidas}{' '}
              {Number(linha.parcelas_vencidas) === 1 ? 'parcela' : 'parcelas'}
            </span>
          </span>
        );
      },
    },
    {
      chave: 'proximo_vencimento',
      titulo: 'Próximo vencimento',
      larguraMinima: 150,
      render: (linha) =>
        linha.proximo_vencimento ? (
          <span className="tabular-nums">{fmtData(linha.proximo_vencimento)}</span>
        ) : (
          <span className="text-[#8A9990]">-</span>
        ),
    },
  ];

  const colunasParcelas = [
    {
      chave: 'vencimento',
      titulo: 'Vencimento',
      larguraMinima: 120,
      render: (linha) => <span className="tabular-nums">{fmtData(linha.vencimento)}</span>,
    },
    {
      chave: 'fornecedor_nome',
      titulo: 'Fornecedor e contrato',
      larguraMinima: 280,
      render: (linha) => (
        <div className="min-w-0">
          <span className="font-semibold text-[#1A2B1F] break-words">
            {linha.fornecedor_nome || 'Fornecedor não identificado'}
          </span>
          <span className="block text-[11px] text-[#5C7060] break-words">
            {linha.contrato_objeto}
            {linha.descricao ? ` - ${linha.descricao}` : ''}
          </span>
        </div>
      ),
    },
    {
      chave: 'numero',
      titulo: 'Parcela',
      numerica: true,
      larguraMinima: 90,
    },
    {
      chave: 'centro_custo',
      titulo: 'Centro de custo',
      larguraMinima: 150,
      render: (linha) => linha.centro_custo || <span className="text-[#8A9990]">-</span>,
    },
    {
      chave: 'valor',
      titulo: 'Valor',
      numerica: true,
      larguraMinima: 130,
      render: (linha) => fmtMoeda(linha.valor),
    },
    {
      chave: 'status_pagamento',
      titulo: 'Situação',
      larguraMinima: 130,
      render: (linha) => (
        <div className="flex flex-col items-start gap-0.5">
          <BadgeParcela status={linha.status_pagamento} />
          {linha.status_pagamento === 'paga' ? (
            <span className="text-[10px] text-[#8A9990] tabular-nums">
              paga em {fmtData(linha.data_pagamento)}
            </span>
          ) : linha.status_pagamento === 'vencida' ? (
            <span className="text-[10px] text-[#A3231C] tabular-nums">
              {linha.atraso_dias} {linha.atraso_dias === 1 ? 'dia' : 'dias'} de atraso
            </span>
          ) : null}
        </div>
      ),
    },
  ];

  /* ===== Números das faixas de resumo ===================================== */

  const itensResumoContratos = resumo
    ? [
        {
          rotulo: 'Contratos',
          valor: String(resumo.total ?? 0),
          detalhe: `${resumo.ativos ?? 0} ativos, ${resumo.encerrados ?? 0} encerrados`,
        },
        {
          rotulo: 'Contratado',
          valor: fmtMoeda(resumo.valor_contratado),
          detalhe: `${fmtMoeda(resumo.valor_parcelado)} em parcelas`,
        },
        {
          rotulo: 'Em aberto',
          valor: fmtMoeda(resumo.valor_aberto),
          detalhe: 'parcelas ainda não pagas',
        },
        {
          rotulo: 'Vencido',
          valor: fmtMoeda(resumo.valor_vencido),
          detalhe:
            (resumo.com_divergencia ?? 0) > 0
              ? `${resumo.com_divergencia} com divergência de valor`
              : 'sem divergência de valor',
          alerta: (resumo.valor_vencido ?? 0) > 0,
        },
      ]
    : [];

  const itensResumoParcelas = totais
    ? [
        {
          rotulo: 'No período',
          valor: fmtMoeda(totais.valor),
          detalhe: `${totais.quantidade ?? 0} ${totais.quantidade === 1 ? 'parcela' : 'parcelas'}`,
        },
        {
          rotulo: 'Pago',
          valor: fmtMoeda(totais.valor_pago),
          detalhe: `${totais.quantidade_paga ?? 0} ${totais.quantidade_paga === 1 ? 'parcela' : 'parcelas'}`,
        },
        {
          rotulo: 'A vencer',
          valor: fmtMoeda(totais.valor_a_vencer),
          detalhe:
            `nos próximos ${JANELA_A_VENCER_DIAS} dias` +
            (totais.proximo_vencimento ? `, a partir de ${fmtData(totais.proximo_vencimento)}` : ''),
        },
        {
          rotulo: 'Vencido',
          valor: fmtMoeda(totais.valor_vencido),
          detalhe: `${totais.quantidade_vencida ?? 0} ${totais.quantidade_vencida === 1 ? 'parcela' : 'parcelas'} em atraso`,
          alerta: (totais.valor_vencido ?? 0) > 0,
        },
      ]
    : [];

  const alterarFiltro = (campo) => (valor) =>
    setFiltros((atual) => ({ ...atual, [campo]: valor }));

  const alterarContrato = (campo) => (valor) =>
    setFormContrato((atual) => ({ ...atual, [campo]: valor }));

  const alterarSerie = (campo) => (valor) =>
    setFormSerie((atual) => ({ ...atual, [campo]: valor }));

  const alterarParcela = (campo) => (valor) =>
    setFormParcela((atual) => ({ ...atual, [campo]: valor }));

  const modoFormularioContrato = painel?.modo === 'novo' || painel?.modo === 'editar';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* O título da página fica na topbar do Layout: nenhuma tela renderiza h1. */}
      <CabecalhoSecao
        titulo="Contratos e parcelas"
        descricao={
          contratosQuery.isLoading
            ? 'Carregando contratos...'
            : `${contratos.length} ${contratos.length === 1 ? 'contrato' : 'contratos'} na visão atual`
        }
        acao={
          <BotaoPrimario icone={Plus} onClick={abrirNovoContrato}>
            Novo contrato
          </BotaoPrimario>
        }
      />

      {/* Abas. Duas leituras do mesmo dado: por contrato e por vencimento. */}
      <div
        className="flex items-center gap-1 bg-white border border-[#DDE3DE] rounded-xl p-1 w-fit"
        role="tablist"
        aria-label="Visão dos dados financeiros"
      >
        {[
          { valor: 'contratos', rotulo: 'Contratos', icone: FileCheck2 },
          { valor: 'parcelas', rotulo: 'Parcelas a pagar', icone: Wallet },
        ].map((item) => {
          const ativa = aba === item.valor;
          const Icone = item.icone;
          return (
            <button
              key={item.valor}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setAba(item.valor)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                ativa
                  ? 'bg-[#1A4731] text-white'
                  : 'text-[#5C7060] hover:bg-[#F4F6F4]'
              }`}
            >
              <Icone size={14} />
              {item.rotulo}
            </button>
          );
        })}
      </div>

      <FaixaResumo itens={aba === 'contratos' ? itensResumoContratos : itensResumoParcelas} />

      <Cartao icone={Search} titulo="Filtros" nivelTitulo={3}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {aba === 'contratos' && (
            <Campo
              rotulo="Buscar"
              valor={filtros.busca}
              onChange={alterarFiltro('busca')}
              placeholder="Objeto do contrato"
            />
          )}

          <Campo
            rotulo="Fornecedor"
            tipo="select"
            opcoes={opcoesFornecedor}
            rotuloVazio="Todos"
            valor={filtros.fornecedor_id}
            onChange={alterarFiltro('fornecedor_id')}
          />

          <Campo
            rotulo="Projeto"
            tipo="select"
            opcoes={[
              ...opcoesProjeto,
              { valor: BACKOFFICE, rotulo: 'Somente backoffice (sem projeto)' },
            ]}
            rotuloVazio="Todos"
            valor={filtros.projeto_id}
            onChange={alterarFiltro('projeto_id')}
            dica="Backoffice são as contratações que não pertencem a projeto nenhum."
          />

          <Campo
            rotulo="Centro de custo"
            tipo="select"
            opcoes={opcoesCentro}
            rotuloVazio="Todos"
            valor={filtros.centro_custo}
            onChange={alterarFiltro('centro_custo')}
          />

          {aba === 'contratos' ? (
            <Campo
              rotulo="Situação do contrato"
              tipo="select"
              opcoes={OPCOES_STATUS_CONTRATO}
              rotuloVazio="Todas"
              valor={filtros.status}
              onChange={alterarFiltro('status')}
            />
          ) : (
            <>
              <Campo
                rotulo="Visão"
                tipo="select"
                opcoes={VISOES_PARCELA}
                valor={visao}
                onChange={setVisao}
                dica="Os totais somam o período inteiro, independentemente da visão."
              />
              <Campo
                rotulo="Vencimento de"
                tipo="data"
                valor={periodo.inicio}
                onChange={(valor) => setPeriodo((atual) => ({ ...atual, inicio: valor }))}
              />
              <Campo
                rotulo="Vencimento até"
                tipo="data"
                valor={periodo.fim}
                onChange={(valor) => setPeriodo((atual) => ({ ...atual, fim: valor }))}
              />
            </>
          )}
        </div>
      </Cartao>

      {aba === 'contratos' ? (
        <Tabela
          legenda="Contratos com fornecedores, com valores contratados e a pagar"
          colunas={colunasContratos}
          dados={contratos}
          carregando={contratosQuery.isLoading}
          rotuloCarregando="Carregando contratos"
          erro={contratosQuery.isError}
          iconeVazio={FileCheck2}
          tituloVazio="Nenhum contrato cadastrado"
          textoVazio="O contrato amarra o objeto contratado, o valor e as parcelas a pagar. Sem ele não há vencimento a acompanhar."
          acaoVazio={
            <BotaoPrimario icone={Plus} onClick={abrirNovoContrato}>
              Cadastrar contrato
            </BotaoPrimario>
          }
          onLinhaClick={abrirDetalhe}
          rotuloLinha={(linha) => `Abrir ${linha.objeto}`}
          classeLinha={(linha) => (linha.status === 'cancelado' ? 'opacity-60' : '')}
        />
      ) : visao === 'calendario' ? (
        <div className="space-y-4">
          {parcelasQuery.isLoading ? (
            <Carregando rotulo="Carregando calendário de vencimentos" />
          ) : parcelasQuery.isError ? (
            <AvisoDiscreto texto="Não foi possível carregar as parcelas agora. Se o aviso continuar, avise a equipe responsável pelo sistema." />
          ) : (
            <CalendarioDeParcelas parcelas={parcelas} onAbrirContrato={abrirDetalhe} />
          )}
        </div>
      ) : (
        <Tabela
          legenda="Parcelas a pagar, por data de vencimento"
          colunas={colunasParcelas}
          dados={parcelas}
          carregando={parcelasQuery.isLoading}
          rotuloCarregando="Carregando parcelas"
          erro={parcelasQuery.isError}
          iconeVazio={Wallet}
          tituloVazio="Nenhuma parcela no período"
          textoVazio="Amplie o período, troque a visão ou tire um filtro. As parcelas nascem da geração da série no contrato."
          onLinhaClick={(linha) => abrirDetalhe(linha.contrato_id)}
          rotuloLinha={(linha) => `Abrir o contrato da parcela ${linha.numero}`}
        />
      )}

      {aba === 'parcelas' && !parcelasQuery.isLoading && <QuebraDeTotais totais={totais} />}

      {/* Sugestões de centro de custo já usados, sem travar a digitação de um novo.
          Fica AQUI, e não dentro de um painel: os três formulários apontam para este
          id, e cada PainelLateral só existe no DOM enquanto está aberto. */}
      <datalist id="centros-de-custo">
        {centrosConhecidos.map((centro) => (
          <option key={centro} value={centro} />
        ))}
      </datalist>

      <p className="flex items-start gap-2 text-[11px] text-[#8A9990] px-1">
        <CalendarClock size={12} className="flex-shrink-0 mt-0.5" />
        O status de cada parcela é calculado a partir da data de vencimento e da data de
        pagamento, nunca marcado à mão. A vencer são as parcelas dos próximos{' '}
        {JANELA_A_VENCER_DIAS} dias.
      </p>

      {/* ===== Painel de detalhe do contrato ============================== */}
      <PainelLateral
        aberto={painel?.modo === 'detalhe'}
        onFechar={fecharPainel}
        icone={FileCheck2}
        titulo={detalhe?.objeto || 'Contrato'}
        subtitulo={detalhe?.fornecedor_nome || 'Carregando contrato'}
        largura="xl"
        rodape={
          <div className="flex items-center justify-between gap-2">
            <BotaoSecundario variante="fantasma" onClick={fecharPainel}>
              Fechar
            </BotaoSecundario>
            <div className="flex items-center gap-2">
              <BotaoSecundario icone={Pencil} onClick={abrirEdicaoContrato} desabilitado={!detalhe}>
                Editar
              </BotaoSecundario>
              <BotaoPrimario icone={Layers} onClick={abrirSerie} desabilitado={!detalhe}>
                Gerar parcelas
              </BotaoPrimario>
            </div>
          </div>
        }
      >
        {detalheQuery.isLoading ? (
          <Carregando rotulo="Carregando contrato" />
        ) : detalheQuery.isError ? (
          <AvisoDiscreto texto="Não foi possível carregar o contrato agora. Se o aviso continuar, avise a equipe responsável pelo sistema." />
        ) : detalhe ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Dado rotulo="Situação">
                <BadgeContrato status={detalhe.status} />
              </Dado>
              <Dado icone={CalendarClock} rotulo="Contratação">
                {fmtData(detalhe.data_contratacao)}
              </Dado>
              <Dado icone={Building2} rotulo="Fornecedor" className="col-span-2">
                {detalhe.fornecedor_nome || 'Não identificado'}
              </Dado>
              <Dado rotulo="Projeto" className="col-span-2">
                {detalhe.projeto_nome || 'Backoffice (contratação sem projeto)'}
              </Dado>
              <Dado icone={CircleDollarSign} rotulo="Valor contratado">
                {fmtMoeda(detalhe.valor_total)}
              </Dado>
              <Dado icone={Coins} rotulo="Centro de custo">
                {detalhe.centro_custo || 'Não informado'}
              </Dado>
              {detalhe.tipo_servico && (
                <Dado rotulo="Tipo de serviço" className="col-span-2">
                  {detalhe.tipo_servico}
                </Dado>
              )}
              {detalhe.observacoes && (
                <Dado rotulo="Observações" className="col-span-2">
                  <span className="whitespace-pre-wrap">{detalhe.observacoes}</span>
                </Dado>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { rotulo: 'Parcelado', valor: fmtMoeda(detalhe.valor_parcelado) },
                { rotulo: 'Pago', valor: fmtMoeda(detalhe.valor_pago) },
                {
                  rotulo: 'Em aberto',
                  valor: fmtMoeda(detalhe.valor_aberto),
                  alerta: (detalhe.valor_vencido ?? 0) > 0,
                },
              ].map((item) => (
                <div
                  key={item.rotulo}
                  className="border border-[#DDE3DE] rounded-xl px-3 py-2 text-center"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
                    {item.rotulo}
                  </p>
                  <p
                    className={`text-sm font-bold tabular-nums ${item.alerta ? 'text-[#A3231C]' : 'text-[#1A2B1F]'}`}
                  >
                    {item.valor}
                  </p>
                </div>
              ))}
            </div>

            <AvisoDivergencia contrato={detalhe} />

            <div>
              <CabecalhoSecao
                titulo="Parcelas"
                nivel={3}
                descricao={
                  parcelasDoDetalhe.length
                    ? `${detalhe.parcelas_pagas ?? 0} de ${parcelasDoDetalhe.length} pagas`
                    : 'Nenhuma parcela registrada'
                }
                acao={
                  <BotaoSecundario icone={ListPlus} tamanho="sm" onClick={abrirParcelaNova}>
                    Parcela avulsa
                  </BotaoSecundario>
                }
              />
              <div className="mt-3">
                <ParcelasDoContrato
                  parcelas={parcelasDoDetalhe}
                  carregando={detalheQuery.isFetching && !detalheQuery.data}
                  idEmOperacao={parcelaEmOperacao}
                  onBaixar={(parcela) => baixarParcela.mutate({ parcela, data: hojeIso() })}
                  onDesfazer={(parcela) => baixarParcela.mutate({ parcela, data: null })}
                  onEditar={abrirParcelaEdicao}
                  onRemover={removerComConfirmacao}
                />
              </div>
            </div>

            <BotaoSecundario
              como="link"
              para={rotaFornecedores}
              icone={Building2}
              iconeDireita={ArrowRight}
              tamanho="sm"
              larguraTotal
            >
              Abrir o cadastro de fornecedores
            </BotaoSecundario>
          </div>
        ) : (
          <AvisoDiscreto
            tom="ambar"
            icone={TriangleAlert}
            texto="Contrato não encontrado. Ele pode ter sido removido."
          />
        )}
      </PainelLateral>

      {/* ===== Painel do formulário de contrato =========================== */}
      <PainelLateral
        aberto={modoFormularioContrato}
        onFechar={fecharPainel}
        icone={FileCheck2}
        titulo={painel?.modo === 'editar' ? 'Editar contrato' : 'Novo contrato'}
        subtitulo="Fornecedor e objeto são obrigatórios."
        largura="lg"
        fecharAoClicarFora={false}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario variante="fantasma" onClick={fecharPainel}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={enviarContrato} carregando={salvarContrato.isPending}>
              {painel?.modo === 'editar' ? 'Salvar alterações' : 'Cadastrar contrato'}
            </BotaoPrimario>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo
            rotulo="Fornecedor"
            obrigatorio
            tipo="select"
            opcoes={opcoesFornecedor}
            rotuloVazio="Escolha o fornecedor"
            valor={formContrato.fornecedor_id}
            onChange={alterarContrato('fornecedor_id')}
            dica={
              opcoesFornecedor.length === 0
                ? 'Nenhum fornecedor cadastrado ainda. Cadastre-o na tela de Fornecedores.'
                : undefined
            }
            className="sm:col-span-2"
          />

          <Campo
            rotulo="Objeto do contrato"
            obrigatorio
            valor={formContrato.objeto}
            onChange={alterarContrato('objeto')}
            placeholder="O que foi contratado"
            extras={{ maxLength: 500 }}
            className="sm:col-span-2"
          />

          <Campo
            rotulo="Projeto"
            tipo="select"
            opcoes={opcoesProjeto}
            rotuloVazio="Backoffice (sem projeto)"
            valor={formContrato.projeto_id}
            onChange={alterarContrato('projeto_id')}
            dica="Assessoria, ferramenta e serviço administrativo não pertencem a projeto."
          />

          <Campo
            rotulo="Situação"
            tipo="select"
            opcoes={OPCOES_STATUS_CONTRATO}
            valor={formContrato.status}
            onChange={alterarContrato('status')}
          />

          <Campo
            rotulo="Data da contratação"
            tipo="data"
            valor={formContrato.data_contratacao}
            onChange={alterarContrato('data_contratacao')}
          />

          <Campo
            rotulo="Valor total"
            tipo="decimal"
            valor={formContrato.valor_total}
            onChange={alterarContrato('valor_total')}
            placeholder="96000,00"
            dica="Sem ponto de milhar. É a base da geração das parcelas."
          />

          <Campo
            rotulo="Centro de custo"
            valor={formContrato.centro_custo}
            onChange={alterarContrato('centro_custo')}
            placeholder="Projeto - Campo"
            extras={{ maxLength: 120, list: 'centros-de-custo' }}
          />

          <Campo
            rotulo="Tipo de serviço"
            valor={formContrato.tipo_servico}
            onChange={alterarContrato('tipo_servico')}
            placeholder="Serviço técnico"
            extras={{ maxLength: 120 }}
          />

          <Campo
            rotulo="Observações"
            tipo="textarea"
            linhas={3}
            valor={formContrato.observacoes}
            onChange={alterarContrato('observacoes')}
            dica="Anotação operacional. Sem dado de pessoa física (LGPD)."
            className="sm:col-span-2"
          />
        </div>
      </PainelLateral>

      {/* ===== Painel da geração de série ================================= */}
      <PainelLateral
        aberto={painel?.modo === 'serie'}
        onFechar={() => setPainel({ modo: 'detalhe', id: painel?.id })}
        icone={Layers}
        titulo="Gerar parcelas"
        subtitulo={detalhe?.objeto}
        largura="lg"
        fecharAoClicarFora={false}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario
              variante="fantasma"
              onClick={() => setPainel({ modo: 'detalhe', id: painel?.id })}
            >
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={enviarSerie} carregando={salvarSerie.isPending}>
              Gerar série
            </BotaoPrimario>
          </div>
        }
      >
        <div className="space-y-4">
          <AvisoDiscreto tom="azul" icone={Layers} titulo="Como a série é calculada.">
            Cada vencimento é contado a partir do primeiro (e não do anterior), e a
            última parcela absorve o resto de centavos, para a soma fechar com o valor
            informado. O cálculo é feito no servidor.
          </AvisoDiscreto>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="Periodicidade"
              tipo="select"
              opcoes={OPCOES_PERIODICIDADE}
              valor={formSerie.periodicidade}
              onChange={(valor) =>
                setFormSerie((atual) => ({
                  ...atual,
                  periodicidade: valor,
                  // Pagamento único é sempre uma parcela: o servidor recusa o resto.
                  quantidade: valor === 'unica' ? '1' : atual.quantidade,
                }))
              }
            />

            <Campo
              rotulo="Quantidade de parcelas"
              tipo="numero"
              valor={formSerie.quantidade}
              onChange={alterarSerie('quantidade')}
              desabilitado={formSerie.periodicidade === 'unica'}
              extras={{ min: 1, max: 240, step: 1 }}
            />

            <Campo
              rotulo="Primeiro vencimento"
              obrigatorio
              tipo="data"
              valor={formSerie.primeiro_vencimento}
              onChange={alterarSerie('primeiro_vencimento')}
              className="sm:col-span-2"
            />

            <Campo
              rotulo="Base do valor"
              tipo="select"
              opcoes={BASES_VALOR}
              valor={formSerie.base_valor}
              onChange={alterarSerie('base_valor')}
              dica={
                formSerie.base_valor === 'contrato'
                  ? `Valor do contrato: ${fmtMoeda(detalhe?.valor_total)}.`
                  : 'Informe apenas este valor: o servidor recusa os dois juntos.'
              }
            />

            {formSerie.base_valor !== 'contrato' && (
              <Campo
                rotulo={
                  formSerie.base_valor === 'total' ? 'Valor total da série' : 'Valor de cada parcela'
                }
                obrigatorio
                tipo="decimal"
                valor={formSerie.valor}
                onChange={alterarSerie('valor')}
                placeholder="8000,00"
                dica="Sem ponto de milhar."
              />
            )}

            <Campo
              rotulo="Descrição das parcelas"
              valor={formSerie.descricao}
              onChange={alterarSerie('descricao')}
              placeholder="Etapa de processamento"
              extras={{ maxLength: 500 }}
              className="sm:col-span-2"
            />

            <Campo
              rotulo="Tipo de serviço"
              valor={formSerie.tipo_servico}
              onChange={alterarSerie('tipo_servico')}
              extras={{ maxLength: 120 }}
            />

            <Campo
              rotulo="Centro de custo"
              valor={formSerie.centro_custo}
              onChange={alterarSerie('centro_custo')}
              extras={{ maxLength: 120, list: 'centros-de-custo' }}
            />
          </div>

          {(Number(detalhe?.parcelas) || 0) > 0 && (
            <Campo
              rotulo="Substituir as parcelas em aberto"
              tipo="checkbox"
              valor={formSerie.substituir}
              onChange={alterarSerie('substituir')}
              dica="Este contrato já tem parcelas. Sem esta opção o servidor recusa a geração, para clique duplo não duplicar obrigação financeira. Com ela, as parcelas em aberto são apagadas e refeitas - e a operação é recusada se alguma já estiver paga."
            />
          )}
        </div>
      </PainelLateral>

      {/* ===== Painel da parcela avulsa =================================== */}
      <PainelLateral
        aberto={painel?.modo === 'parcela'}
        onFechar={() => setPainel({ modo: 'detalhe', id: painel?.id })}
        icone={ListPlus}
        titulo={painel?.parcelaId ? 'Editar parcela' : 'Nova parcela avulsa'}
        subtitulo={detalhe?.objeto}
        largura="md"
        fecharAoClicarFora={false}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario
              variante="fantasma"
              onClick={() => setPainel({ modo: 'detalhe', id: painel?.id })}
            >
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={enviarParcela} carregando={salvarParcela.isPending}>
              {painel?.parcelaId ? 'Salvar alterações' : 'Lançar parcela'}
            </BotaoPrimario>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo
            rotulo="Valor"
            obrigatorio
            tipo="decimal"
            valor={formParcela.valor}
            onChange={alterarParcela('valor')}
            placeholder="8000,00"
            dica="Sem ponto de milhar."
          />

          <Campo
            rotulo="Vencimento"
            obrigatorio
            tipo="data"
            valor={formParcela.vencimento}
            onChange={alterarParcela('vencimento')}
          />

          <Campo
            rotulo="Descrição"
            valor={formParcela.descricao}
            onChange={alterarParcela('descricao')}
            placeholder="Aditivo de mobilização"
            extras={{ maxLength: 500 }}
            className="sm:col-span-2"
          />

          <Campo
            rotulo="Tipo de serviço"
            valor={formParcela.tipo_servico}
            onChange={alterarParcela('tipo_servico')}
            extras={{ maxLength: 120 }}
          />

          <Campo
            rotulo="Centro de custo"
            valor={formParcela.centro_custo}
            onChange={alterarParcela('centro_custo')}
            extras={{ maxLength: 120, list: 'centros-de-custo' }}
          />

          <Campo
            rotulo="Data de pagamento"
            tipo="data"
            valor={formParcela.data_pagamento}
            onChange={alterarParcela('data_pagamento')}
            dica="Em branco significa parcela em aberto. Não existe status manual: é esta data que define pago, vencido ou a vencer."
            className="sm:col-span-2"
          />

          <Campo
            rotulo="Observações"
            tipo="textarea"
            linhas={3}
            valor={formParcela.observacoes}
            onChange={alterarParcela('observacoes')}
            dica="Anotação operacional. Sem dado de pessoa física (LGPD)."
            className="sm:col-span-2"
          />
        </div>
      </PainelLateral>
    </div>
  );
}

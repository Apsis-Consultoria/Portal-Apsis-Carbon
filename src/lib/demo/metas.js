/**
 * demo/metas.js - dataset de demonstração da tela de Metas.
 *
 * POR QUE EXISTE: permite revisar a tela sem banco. Em MODO_DEMO (ver
 * src/lib/runtimeConfig.js: exige dev E o clique no botão de demonstração) as funções de
 * src/lib/api/metas.js não fazem rede e operam sobre o estado em memória daqui. As
 * mutações ALTERAM esse estado, para os dois gestos centrais da tela - cadastrar a
 * primeira meta e lançar uma medição vendo a barra andar - serem de fato exercitáveis.
 *
 * ESCOPO: não é cache nem persistência. Recarregar a página volta ao estado inicial. Em
 * build de produção MODO_DEMO é false por força (import.meta.env.DEV é estático) e o
 * bundler elimina os ramos que chamam este módulo.
 *
 * SÓ INDICADOR INTERNO MORA AQUI. A tabela carbon_indicadores tem dois usos e a coluna
 * `plano` os separa; os indicadores do Plano de Monitoramento (plano preenchido) estão em
 * src/lib/demo/indicadores.js e são de outra tela. Os daqui têm plano nulo por definição,
 * e por isso a coluna nem aparece no dataset: se ela aparecesse, alguém acabaria
 * preenchendo e os dois conjuntos voltariam a se misturar.
 *
 * AS CONTAS SÃO TRADUÇÃO LITERAL DAS FUNÇÕES SQL de 20260814100000_metas.sql
 * (carbon_meta_realizado, carbon_meta_pct, carbon_meta_atrasada,
 * carbon_meta_ocorrencias_previstas, carbon_indicador_realizado). Se divergirem, a revisão
 * mostra um número que a produção nunca produz, e a divergência só aparece depois do
 * provisionamento. Cada uma está marcada com o nome da função de origem.
 *
 * POR QUE O DATASET NÃO NASCE VAZIO, se a tabela em produção está: uma demonstração sem
 * nenhuma meta mostraria apenas o estado vazio, que é uma tela só. As cinco metas abaixo
 * cobrem os casos que valem revisão - meta sem valor alvo, meta atrasada, meta superada,
 * indicador percentual que não acumula, e duas frentes sem meta nenhuma. O estado vazio
 * continua alcançável: basta apagar as cinco, e é assim que o botão de criar a primeira
 * meta se testa.
 *
 * LGPD: nenhum dado pessoal e nenhum nome de pessoa. Os parceiros são organizações
 * fictícias, e as descrições falam de papel, nunca de quem executa.
 */

/* ===== Erro tipado ========================================================
   Mesmos códigos do backend, para a tela não tratar validação de um jeito no demo e de
   outro em produção. Classe própria e não a de outro domínio: quem converte em ErroApi
   (chamarDemo, em src/lib/api/base.js) só olha `codigo`, e acoplar dois datasets faria um
   mudar quando o outro mudasse.                                              */
export class ErroDemoMetas extends Error {
  constructor(codigo) {
    super(`Recusado pelo modo demonstracao: ${codigo}`);
    this.name = 'ErroDemoMetas';
    this.codigo = codigo;
  }
}

/* ===== Vocabulário ========================================================
   Espelha os CHECK de carbon_metas e a ordem de public.carbon_meta_frentes(), que é a do
   plano de impacto e NÃO a alfabética. A tela lê a ordem daqui, igual à produção lê da
   função SQL.                                                                */
const FRENTES = [
  { frente: 'fortalecimento_institucional', ordem: 1 },
  { frente: 'monitoramento', ordem: 2 },
  { frente: 'educacao', ordem: 3 },
  { frente: 'sensibilizacao', ordem: 4 },
  { frente: 'bioeconomia', ordem: 5 },
  { frente: 'prestacao_contas', ordem: 6 },
];

const PROJETO_DEMO_ID = '00000000-0000-4000-8000-000000000001';
const CRIADO_EM_DEMO = '2026-01-15T12:00:00.000Z';

/* ===== Estado =============================================================
   Montado na PRIMEIRA LEITURA e não no topo do módulo. Uma expressão de topo é efeito
   colateral que o Rollup não consegue provar puro, e o módulo inteiro (com o dataset)
   ficaria vivo no bundle de produção mesmo com todos os ramos que o chamam eliminados.
   O acessador bd() é o mesmo padrão de src/lib/demo/indicadores.js.           */
let estado = null;

function medicao(id, indicadorId, data, periodoTipo, valor, origem = 'interna') {
  return {
    id,
    indicador_id: indicadorId,
    data,
    periodo_tipo: periodoTipo,
    valor,
    origem,
    observacao: null,
    criado_em: CRIADO_EM_DEMO,
    atualizado_em: CRIADO_EM_DEMO,
  };
}

function inicial() {
  return {
    metas: [
      {
        id: 'demo-meta-1',
        projeto_id: PROJETO_DEMO_ID,
        frente: 'monitoramento',
        // A descrição NÃO carrega o número: ele mora em valor_alvo e a unidade em
        // unidade. É a correção central da issue #14, e o dataset a demonstra.
        descricao: 'Instalar câmeras trap para monitoramento de fauna',
        parceiro_id: 'demo-parceiro-1',
        parceiro_nome: 'Instituto Parceiro Exemplo',
        valor_alvo: 20,
        unidade: 'câmeras',
        periodicidade: 'unica',
        mes_inicio: null,
        mes_fim: null,
        periodo_inicio: '2026-01-01',
        periodo_fim: '2026-12-31',
        status: 'em_andamento',
        observacoes: null,
        criado_em: CRIADO_EM_DEMO,
        atualizado_em: CRIADO_EM_DEMO,
      },
      {
        // SEM VALOR ALVO, de propósito: é a lacuna que originou a issue #14, e a tela
        // precisa mostrá-la como pendência contável em vez de escondida numa frase.
        // Recorrente com janela sazonal, então ocorrências previstas dá 10 (5 meses de
        // maio a setembro x 2 quinzenas), que é a sugestão de alvo que a tela oferece.
        id: 'demo-meta-2',
        projeto_id: PROJETO_DEMO_ID,
        frente: 'monitoramento',
        descricao: 'Realizar rondas de vigilância territorial na estação seca',
        parceiro_id: 'demo-parceiro-1',
        parceiro_nome: 'Instituto Parceiro Exemplo',
        valor_alvo: null,
        unidade: null,
        periodicidade: 'quinzenal',
        mes_inicio: 5,
        mes_fim: 9,
        periodo_inicio: '2026-01-01',
        periodo_fim: '2026-12-31',
        status: 'planejada',
        observacoes: null,
        criado_em: CRIADO_EM_DEMO,
        atualizado_em: CRIADO_EM_DEMO,
      },
      {
        // Prazo vencido e status não concluído: entra como ATRASADA sem ninguém tocar
        // na linha. Atraso é derivado da data, nunca um valor de status.
        id: 'demo-meta-3',
        projeto_id: PROJETO_DEMO_ID,
        frente: 'fortalecimento_institucional',
        descricao: 'Apoiar a regularização estatutária das associações locais',
        parceiro_id: 'demo-parceiro-2',
        parceiro_nome: 'Associação Comunitária Exemplo',
        valor_alvo: 3,
        unidade: 'associações',
        periodicidade: 'unica',
        mes_inicio: null,
        mes_fim: null,
        periodo_inicio: '2025-01-01',
        periodo_fim: '2025-12-31',
        status: 'em_andamento',
        observacoes: null,
        criado_em: CRIADO_EM_DEMO,
        atualizado_em: CRIADO_EM_DEMO,
      },
      {
        // O caso do indicador PERCENTUAL: o realizado é a última medição, não a soma.
        // 12% no primeiro trimestre e 18% no segundo dão 18%, e não 30%.
        id: 'demo-meta-4',
        projeto_id: PROJETO_DEMO_ID,
        frente: 'bioeconomia',
        descricao: 'Aumentar a venda de castanha em relação à safra anterior',
        parceiro_id: null,
        parceiro_nome: null,
        valor_alvo: 30,
        unidade: 'por cento',
        periodicidade: 'unica',
        mes_inicio: null,
        mes_fim: null,
        periodo_inicio: '2026-01-01',
        periodo_fim: '2026-12-31',
        status: 'em_andamento',
        observacoes: null,
        criado_em: CRIADO_EM_DEMO,
        atualizado_em: CRIADO_EM_DEMO,
      },
      {
        // Meta SUPERADA: 16 de 15. O percentual passa de 100 de propósito (meta superada
        // é informação), e quem corta em 100 é a barra e a média do progresso.
        id: 'demo-meta-5',
        projeto_id: PROJETO_DEMO_ID,
        frente: 'educacao',
        descricao: 'Formar brigadistas comunitários para prevenção de incêndio',
        parceiro_id: 'demo-parceiro-2',
        parceiro_nome: 'Associação Comunitária Exemplo',
        valor_alvo: 15,
        unidade: 'brigadistas',
        periodicidade: 'unica',
        mes_inicio: null,
        mes_fim: null,
        periodo_inicio: '2025-06-01',
        periodo_fim: '2025-11-30',
        status: 'concluida',
        observacoes: null,
        criado_em: CRIADO_EM_DEMO,
        atualizado_em: CRIADO_EM_DEMO,
      },
    ],

    indicadores: [
      {
        id: 'demo-mind-1',
        projeto_id: PROJETO_DEMO_ID,
        meta_id: 'demo-meta-1',
        nome: 'Câmeras trap instaladas',
        unidade: 'câmeras',
        tipo: 'contagem',
        acumulativo: true,
        descricao: 'Contagem de equipamentos instalados e georreferenciados em campo.',
        criado_em: CRIADO_EM_DEMO,
        atualizado_em: CRIADO_EM_DEMO,
        medicoes: [
          medicao('demo-mmed-1', 'demo-mind-1', '2026-03-31', 'trimestral', 6),
          medicao('demo-mmed-2', 'demo-mind-1', '2026-06-30', 'trimestral', 5, 'parceiro'),
        ],
      },
      {
        id: 'demo-mind-2',
        projeto_id: PROJETO_DEMO_ID,
        meta_id: 'demo-meta-3',
        nome: 'Associações com estatuto regularizado',
        unidade: 'associações',
        tipo: 'contagem',
        acumulativo: true,
        descricao: null,
        criado_em: CRIADO_EM_DEMO,
        atualizado_em: CRIADO_EM_DEMO,
        medicoes: [medicao('demo-mmed-3', 'demo-mind-2', '2025-12-31', 'anual', 2)],
      },
      {
        id: 'demo-mind-3',
        projeto_id: PROJETO_DEMO_ID,
        meta_id: 'demo-meta-4',
        nome: 'Aumento da venda de castanha',
        unidade: 'por cento',
        tipo: 'percentual',
        // false OBRIGATORIAMENTE: há CHECK no banco e recusa na rota. Percentual é um
        // nível, e o valor que vale é o último medido.
        acumulativo: false,
        descricao: 'Variação da receita da safra em relação à safra anterior.',
        criado_em: CRIADO_EM_DEMO,
        atualizado_em: CRIADO_EM_DEMO,
        medicoes: [
          medicao('demo-mmed-4', 'demo-mind-3', '2026-03-31', 'trimestral', 12),
          medicao('demo-mmed-5', 'demo-mind-3', '2026-06-30', 'trimestral', 18),
        ],
      },
      {
        id: 'demo-mind-4',
        projeto_id: PROJETO_DEMO_ID,
        meta_id: 'demo-meta-5',
        nome: 'Brigadistas formados',
        unidade: 'brigadistas',
        tipo: 'contagem',
        acumulativo: true,
        descricao: null,
        criado_em: CRIADO_EM_DEMO,
        atualizado_em: CRIADO_EM_DEMO,
        medicoes: [medicao('demo-mmed-6', 'demo-mind-4', '2025-11-30', 'semestral', 16)],
      },
      {
        // SEM META, de propósito: indicador que o projeto acompanha sem que exista meta
        // para ele. É o bloco de avulsos da tela, e a razão de meta_id ser anulável.
        id: 'demo-mind-5',
        projeto_id: PROJETO_DEMO_ID,
        meta_id: null,
        nome: 'Focos de calor detectados',
        unidade: 'focos',
        tipo: 'contagem',
        acumulativo: true,
        descricao: 'Alertas do satélite conferidos pela equipe de monitoramento.',
        criado_em: CRIADO_EM_DEMO,
        atualizado_em: CRIADO_EM_DEMO,
        medicoes: [
          medicao('demo-mmed-7', 'demo-mind-5', '2026-03-31', 'trimestral', 4),
          medicao('demo-mmed-8', 'demo-mind-5', '2026-06-30', 'trimestral', 9),
        ],
      },
    ],

    proximoId: 100,
  };
}

function bd() {
  if (!estado) estado = inicial();
  return estado;
}

/* ===== Cálculo: tradução das funções SQL ================================== */

/** carbon_meta_mes_na_janela. A janela PODE atravessar o ano (chuva = 10 a 4), e é por
 *  isso que não é um simples "between": comparar os dois números direto devolveria
 *  janela vazia justamente no caso que motivou a coluna. */
function mesNaJanela(mes, mesInicio, mesFim) {
  if (mes === null || mes === undefined) return false;
  if (mesInicio === null || mesInicio === undefined) return true;
  if (mesFim === null || mesFim === undefined) return true;
  if (mesInicio <= mesFim) return mes >= mesInicio && mes <= mesFim;
  return mes >= mesInicio || mes <= mesFim;
}

/** carbon_meta_ocorrencias_previstas. Aproximação assumida lá e mantida aqui: mês
 *  iniciado conta como mês inteiro. É o número que a tela oferece como SUGESTÃO de valor
 *  alvo para a meta recorrente que ficou com placeholder. */
export function ocorrenciasPrevistasDemo(periodicidade, inicio, fim, mesInicio, mesFim) {
  if (periodicidade === 'unica') return 1;
  if (!inicio || !fim) return null;

  const [anoI, mesI] = inicio.split('-').map(Number);
  const [anoF, mesF] = fim.split('-').map(Number);
  const mesesCorridos = anoF * 12 + mesF - (anoI * 12 + mesI) + 1;

  if (mesesCorridos < 1) return 0;
  // Rede de segurança de 100 anos, igual à do banco: período de creditação de 30 anos
  // digitado por engano como período de meta recorrente daria centenas de ocorrências.
  if (mesesCorridos > 1200) return null;

  let mesesJanela = 0;
  for (let i = 0; i < mesesCorridos; i += 1) {
    if (mesNaJanela(1 + ((mesI - 1 + i) % 12), mesInicio, mesFim)) mesesJanela += 1;
  }

  if (periodicidade === 'mensal') return mesesJanela;
  if (periodicidade === 'quinzenal') return mesesJanela * 2;
  if (periodicidade === 'trimestral') return Math.ceil(mesesJanela / 3);
  return null;
}

/** carbon_meta_pct. NULL quando falta realizado, falta alvo ou o alvo é zero (meta de
 *  "nenhuma ocorrência", que não se expressa em percentual). Pode passar de 100. */
function pctDemo(realizado, valorAlvo) {
  if (realizado === null || realizado === undefined) return null;
  if (valorAlvo === null || valorAlvo === undefined || Number(valorAlvo) === 0) return null;
  return Math.round((Number(realizado) * 100.0) / Number(valorAlvo) * 10) / 10;
}

/** carbon_meta_atrasada. Derivada de current_date, e é por isso que atraso não é coluna
 *  nem valor de status: a meta vira atrasada à meia-noite, sem ninguém tocar na linha. */
function atrasadaDemo(status, periodoFim) {
  if (!periodoFim) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return periodoFim < hoje && status !== 'concluida' && status !== 'cancelada';
}

function naJanela(m, de, ate) {
  if (de && m.data < de) return false;
  if (ate && m.data > ate) return false;
  return true;
}

/** carbon_indicador_realizado. Acumulativo soma; não acumulativo vale a ÚLTIMA medição
 *  da janela. Conjunto vazio devolve null e não zero: "sem medição" é diferente de
 *  "medido zero", e trocar por 0 faria a tela mostrar 0% onde a verdade é que ninguém
 *  mediu. */
function realizadoDoIndicador(indicador, de = null, ate = null) {
  const janela = (indicador.medicoes ?? []).filter((m) => naJanela(m, de, ate));
  if (janela.length === 0) return null;

  if (indicador.acumulativo) {
    return janela.reduce((soma, m) => soma + Number(m.valor), 0);
  }

  // Desempate determinístico igual ao do índice: data desc, criado_em desc, id desc.
  // Sem ele, duas medições no mesmo dia fariam "a última" mudar entre dois renders.
  const ordenada = [...janela].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? 1 : -1;
    if (a.criado_em !== b.criado_em) return a.criado_em < b.criado_em ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
  return Number(ordenada[0].valor);
}

/** carbon_meta_realizado. Soma o realizado de cada indicador vinculado, dentro do
 *  PERÍODO DA META: sem esse recorte a ronda do ciclo anterior apareceria como progresso
 *  deste. Indicador sem medição não zera os outros; se NENHUM tem medição, o resultado é
 *  null. Não confere coerência de unidade entre indicadores, igual ao banco - por isso a
 *  tela mostra a contribuição de cada um com a sua unidade ao lado. */
function realizadoDaMeta(meta) {
  const vinculados = bd().indicadores.filter((i) => i.meta_id === meta.id);
  let soma = null;
  for (const indicador of vinculados) {
    const valor = realizadoDoIndicador(indicador, meta.periodo_inicio, meta.periodo_fim);
    if (valor === null) continue;
    soma = (soma ?? 0) + valor;
  }
  return soma;
}

/** carbon_indicador_json. */
function indicadorJson(indicador, de = null, ate = null) {
  const todas = indicador.medicoes ?? [];
  const janela = todas.filter((m) => naJanela(m, de, ate));
  const cronologica = [...janela].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));

  return {
    id: indicador.id,
    projeto_id: indicador.projeto_id,
    meta_id: indicador.meta_id,
    nome: indicador.nome,
    unidade: indicador.unidade,
    tipo: indicador.tipo,
    acumulativo: indicador.acumulativo,
    descricao: indicador.descricao,
    criado_em: indicador.criado_em,
    atualizado_em: indicador.atualizado_em,
    realizado: realizadoDoIndicador(indicador, de, ate),
    // A diferença entre os dois é o que permite a tela avisar "há medição fora do
    // período da meta", erro de lançamento comum e invisível de outra forma.
    medicoes_total: todas.length,
    medicoes_janela: janela.length,
    ultima_data: cronologica.length ? cronologica[cronologica.length - 1].data : null,
    serie: cronologica.slice(-24).map((m) => ({
      data: m.data,
      valor: m.valor,
      origem: m.origem,
    })),
  };
}

/** carbon_meta_json. */
function metaJson(meta) {
  const realizado = realizadoDaMeta(meta);
  const vinculados = bd()
    .indicadores.filter((i) => i.meta_id === meta.id)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return {
    ...meta,
    realizado,
    pct: pctDemo(realizado, meta.valor_alvo),
    atrasada: atrasadaDemo(meta.status, meta.periodo_fim),
    ocorrencias_previstas: ocorrenciasPrevistasDemo(
      meta.periodicidade,
      meta.periodo_inicio,
      meta.periodo_fim,
      meta.mes_inicio,
      meta.mes_fim
    ),
    indicadores: vinculados.map((i) => indicadorJson(i, meta.periodo_inicio, meta.periodo_fim)),
    // Vínculo com documento existe pela tabela genérica carbon_documento_vinculos, que
    // este dataset não simula: zero é honesto, e a rota real devolve a contagem.
    documentos_total: 0,
  };
}

/** carbon_metas_progresso. */
function progressoDemo(projetoId) {
  const b = bd();
  const metas = b.metas.filter((m) => m.projeto_id === projetoId);
  const internos = b.indicadores.filter((i) => i.projeto_id === projetoId);

  const calc = metas.map((m) => {
    const realizado = realizadoDaMeta(m);
    return {
      meta: m,
      realizado,
      pct: pctDemo(realizado, m.valor_alvo),
      atrasada: atrasadaDemo(m.status, m.periodo_fim),
      indicadores: internos.filter((i) => i.meta_id === m.id).length,
    };
  });

  const contar = (predicado) => calc.filter(predicado).length;
  // Média cortada em 100 e sem as canceladas: sem o corte, uma meta superada em 400%
  // mascararia três metas paradas; cancelada fica fora porque não vai acontecer.
  const comPct = calc.filter((c) => c.pct !== null && c.meta.status !== 'cancelada');
  const pctMedio = comPct.length
    ? Math.round(
        (comPct.reduce((s, c) => s + Math.min(c.pct, 100), 0) / comPct.length) * 10
      ) / 10
    : 0;

  const porFrente = FRENTES.map(({ frente, ordem }) => {
    const daFrente = calc.filter((c) => c.meta.frente === frente);
    const comPctFrente = daFrente.filter((c) => c.pct !== null && c.meta.status !== 'cancelada');
    return {
      frente,
      ordem,
      total: daFrente.length,
      quantificadas: daFrente.filter((c) => c.meta.valor_alvo !== null).length,
      sem_valor_alvo: daFrente.filter((c) => c.meta.valor_alvo === null).length,
      concluidas: daFrente.filter((c) => c.meta.status === 'concluida').length,
      atrasadas: daFrente.filter((c) => c.atrasada).length,
      pct_medio: comPctFrente.length
        ? Math.round(
            (comPctFrente.reduce((s, c) => s + Math.min(c.pct, 100), 0) / comPctFrente.length) * 10
          ) / 10
        : 0,
    };
  });

  return {
    total: calc.length,
    quantificadas: contar((c) => c.meta.valor_alvo !== null),
    sem_valor_alvo: contar((c) => c.meta.valor_alvo === null),
    sem_indicador: contar((c) => c.indicadores === 0),
    sem_medicao: contar((c) => c.realizado === null),
    concluidas: contar((c) => c.meta.status === 'concluida'),
    atrasadas: contar((c) => c.atrasada),
    pct_medio: pctMedio,
    com_pct: comPct.length,
    por_status: {
      planejada: contar((c) => c.meta.status === 'planejada'),
      em_andamento: contar((c) => c.meta.status === 'em_andamento'),
      concluida: contar((c) => c.meta.status === 'concluida'),
      cancelada: contar((c) => c.meta.status === 'cancelada'),
    },
    // Só indicador interno entra nestas três contagens, igual à rota real: no banco a
    // função SQL conta o projeto inteiro e a rota sobrescreve. Aqui não há indicador de
    // Plano de Monitoramento no dataset, mas o cálculo é escrito do mesmo jeito para as
    // duas implementações não divergirem quando alguém acrescentar um.
    indicadores_total: internos.length,
    indicadores_sem_meta: internos.filter((i) => i.meta_id === null).length,
    medicoes_total: internos.reduce((s, i) => s + (i.medicoes?.length ?? 0), 0),
    por_frente: porFrente,
  };
}

/* ===== Leitura ============================================================ */

export function demoListarMetas(projetoId, { frente = null, status = null } = {}) {
  const b = bd();
  const ordemDaFrente = (f) => FRENTES.find((x) => x.frente === f)?.ordem ?? 99;

  const metas = b.metas
    .filter((m) => m.projeto_id === projetoId)
    .filter((m) => !frente || m.frente === frente)
    .filter((m) => !status || m.status === status)
    .sort((a, c) => {
      const oa = ordemDaFrente(a.frente);
      const oc = ordemDaFrente(c.frente);
      if (oa !== oc) return oa - oc;
      // nulls last no início do período, igual ao ORDER BY da função SQL.
      const pa = a.periodo_inicio ?? '9999-12-31';
      const pc = c.periodo_inicio ?? '9999-12-31';
      if (pa !== pc) return pa < pc ? -1 : 1;
      return a.criado_em < c.criado_em ? -1 : 1;
    })
    .map(metaJson);

  // A série fica de fora dos avulsos, igual à rota real: ela só é útil dentro da meta,
  // recortada pelo período dela, e trafegá-la aqui sugeriria que a tela deveria
  // desenhar uma evolução que não tem janela nenhuma para comparar.
  const avulsos = b.indicadores
    .filter((i) => i.projeto_id === projetoId && i.meta_id === null)
    .map(({ medicoes: _serie, ...resto }) => resto);

  return {
    metas,
    total: metas.length,
    // Progresso do projeto INTEIRO, sem os filtros: os números do topo respondem "como
    // está o plano de impacto", e um total que mudasse ao filtrar não responderia nada.
    progresso: progressoDemo(projetoId),
    frentes: FRENTES.map((f) => ({ ...f })),
    avulsos,
    pode_escrever: true,
  };
}

/* ===== Escrita ============================================================ */

function acharMeta(id) {
  const achada = bd().metas.find((m) => m.id === id);
  if (!achada) throw new ErroDemoMetas('nao_encontrado');
  return achada;
}

function acharIndicador(id) {
  const achado = bd().indicadores.find((i) => i.id === id);
  if (!achado) throw new ErroDemoMetas('nao_encontrado');
  return achado;
}

/** Mesmas regras de conferirCoerenciaMeta() na rota, sobre o estado EFETIVO da linha. */
function conferirCoerencia(efetivo) {
  const temAlvo = efetivo.valor_alvo !== null && efetivo.valor_alvo !== undefined;
  const temUnidade = Boolean(efetivo.unidade && String(efetivo.unidade).trim());
  if (temAlvo && !temUnidade) throw new ErroDemoMetas('unidade_obrigatoria');

  const temInicio = efetivo.mes_inicio !== null && efetivo.mes_inicio !== undefined;
  const temFim = efetivo.mes_fim !== null && efetivo.mes_fim !== undefined;
  if (temInicio !== temFim) throw new ErroDemoMetas('janela_incompleta');

  if (
    efetivo.periodo_inicio &&
    efetivo.periodo_fim &&
    efetivo.periodo_fim < efetivo.periodo_inicio
  ) {
    throw new ErroDemoMetas('periodo_invalido');
  }
}

const numeroOuNulo = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(n)) throw new ErroDemoMetas('campo_invalido');
  return n;
};

export function demoCriarMeta(projetoId, dados) {
  if (!dados?.frente) throw new ErroDemoMetas('campo_obrigatorio');
  if (!FRENTES.some((f) => f.frente === dados.frente)) throw new ErroDemoMetas('frente_invalida');
  if (!dados?.descricao || !String(dados.descricao).trim()) {
    throw new ErroDemoMetas('campo_obrigatorio');
  }

  const b = bd();
  const nova = {
    id: `demo-meta-${b.proximoId++}`,
    projeto_id: projetoId,
    frente: dados.frente,
    descricao: String(dados.descricao).trim(),
    parceiro_id: dados.parceiro_id ?? null,
    parceiro_nome: null,
    valor_alvo: numeroOuNulo(dados.valor_alvo),
    unidade: dados.unidade ?? null,
    periodicidade: dados.periodicidade ?? 'unica',
    mes_inicio: numeroOuNulo(dados.mes_inicio),
    mes_fim: numeroOuNulo(dados.mes_fim),
    periodo_inicio: dados.periodo_inicio || null,
    periodo_fim: dados.periodo_fim || null,
    status: dados.status ?? 'planejada',
    observacoes: dados.observacoes ?? null,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };

  conferirCoerencia(nova);
  b.metas.push(nova);
  return { meta: metaJson(nova) };
}

export function demoAtualizarMeta(metaId, dados) {
  const alvo = acharMeta(metaId);
  if (dados?.frente && !FRENTES.some((f) => f.frente === dados.frente)) {
    throw new ErroDemoMetas('frente_invalida');
  }

  const alteracao = { ...dados };
  for (const campo of ['valor_alvo', 'mes_inicio', 'mes_fim']) {
    if (campo in alteracao) alteracao[campo] = numeroOuNulo(alteracao[campo]);
  }
  for (const campo of ['periodo_inicio', 'periodo_fim']) {
    if (campo in alteracao) alteracao[campo] = alteracao[campo] || null;
  }

  // Coerência sobre o estado efetivo, igual à rota: num PATCH que manda só valor_alvo, a
  // unidade que vale é a que já está gravada.
  conferirCoerencia({ ...alvo, ...alteracao });
  Object.assign(alvo, alteracao, { atualizado_em: new Date().toISOString() });
  return { meta: metaJson(alvo) };
}

export function demoRemoverMeta(metaId) {
  const b = bd();
  const i = b.metas.findIndex((m) => m.id === metaId);
  if (i < 0) throw new ErroDemoMetas('nao_encontrado');

  b.metas.splice(i, 1);
  // SET NULL e não cascade, igual ao banco: apagar a meta não pode destruir a série
  // histórica. Os indicadores reaparecem no bloco de avulsos.
  for (const indicador of b.indicadores) {
    if (indicador.meta_id === metaId) indicador.meta_id = null;
  }
  return { removido: true };
}

export function demoCriarIndicadorDeMeta(metaId, dados) {
  const meta = acharMeta(metaId);
  if (!dados?.nome || !String(dados.nome).trim()) throw new ErroDemoMetas('campo_obrigatorio');

  const tipo = dados.tipo ?? 'contagem';
  const acumulativo = dados.acumulativo ?? true;
  if (tipo === 'percentual' && acumulativo === true) {
    throw new ErroDemoMetas('percentual_nao_acumula');
  }

  const b = bd();
  const nome = String(dados.nome).trim();
  // Índice único carbon_indicadores_projeto_nome_uniq: por projeto, ignorando caixa e
  // espaço nas pontas. "Rondas" e "rondas " seriam duas séries do mesmo indicador.
  const jaExiste = b.indicadores.some(
    (i) => i.projeto_id === meta.projeto_id && i.nome.trim().toLowerCase() === nome.toLowerCase()
  );
  if (jaExiste) throw new ErroDemoMetas('registro_duplicado');

  const novo = {
    id: `demo-mind-${b.proximoId++}`,
    projeto_id: meta.projeto_id,
    meta_id: meta.id,
    nome,
    unidade: dados.unidade ?? null,
    tipo,
    acumulativo,
    descricao: dados.descricao ?? null,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    medicoes: [],
  };
  b.indicadores.push(novo);

  const { medicoes: _semSerie, ...semSerie } = novo;
  return { indicador: semSerie, meta: metaJson(meta) };
}

export function demoAtualizarIndicadorDeMeta(indicadorId, dados) {
  const alvo = acharIndicador(indicadorId);

  const tipo = dados.tipo ?? alvo.tipo;
  const acumulativo = dados.acumulativo ?? alvo.acumulativo;
  if (tipo === 'percentual' && acumulativo === true) {
    throw new ErroDemoMetas('percentual_nao_acumula');
  }

  if ('meta_id' in dados && dados.meta_id) {
    const destino = acharMeta(dados.meta_id);
    if (destino.projeto_id !== alvo.projeto_id) throw new ErroDemoMetas('referencia_invalida');
  }

  Object.assign(alvo, dados, { atualizado_em: new Date().toISOString() });

  const { medicoes: _semSerie, ...semSerie } = alvo;
  return {
    indicador: semSerie,
    meta: alvo.meta_id ? metaJson(acharMeta(alvo.meta_id)) : null,
  };
}

export function demoRemoverIndicadorDeMeta(indicadorId) {
  const b = bd();
  const i = b.indicadores.findIndex((x) => x.id === indicadorId);
  if (i < 0) throw new ErroDemoMetas('nao_encontrado');

  const [removido] = b.indicadores.splice(i, 1);
  return {
    removido: true,
    meta: removido.meta_id ? metaJson(acharMeta(removido.meta_id)) : null,
  };
}

export function demoRegistrarMedicaoDeMeta(indicadorId, dados) {
  const alvo = acharIndicador(indicadorId);
  if (!dados?.data) throw new ErroDemoMetas('campo_obrigatorio');

  const valor = Number(String(dados.valor ?? '').replace(',', '.'));
  // Negativo é aceito de propósito: indicador de variação percentual mede queda também.
  if (!Number.isFinite(valor)) throw new ErroDemoMetas('campo_invalido');

  const tipo = dados.periodo_tipo ?? 'pontual';

  // UPSERT pela chave natural, igual ao servidor: relançar o mesmo período corrige o
  // número em vez de criar uma segunda linha (índice carbon_indicador_medicoes_periodo_uidx).
  const existente = alvo.medicoes.find((m) => m.data === dados.data && m.periodo_tipo === tipo);
  if (existente) {
    existente.valor = valor;
    existente.origem = dados.origem ?? existente.origem;
    existente.observacao = dados.observacao ?? null;
    existente.atualizado_em = new Date().toISOString();
    return {
      medicao: existente,
      meta: alvo.meta_id ? metaJson(acharMeta(alvo.meta_id)) : null,
    };
  }

  const nova = medicao(
    `demo-mmed-${bd().proximoId++}`,
    indicadorId,
    dados.data,
    tipo,
    valor,
    dados.origem ?? 'interna'
  );
  nova.observacao = dados.observacao ?? null;
  alvo.medicoes.push(nova);
  alvo.medicoes.sort((a, b2) => (a.data < b2.data ? -1 : a.data > b2.data ? 1 : 0));

  return {
    medicao: nova,
    meta: alvo.meta_id ? metaJson(acharMeta(alvo.meta_id)) : null,
  };
}

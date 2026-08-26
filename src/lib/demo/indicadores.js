/**
 * demo/indicadores.js - dataset de demonstração da tela de Indicadores.
 *
 * POR QUE EXISTE: permite revisar a tela sem banco. Em MODO_DEMO (ver
 * src/lib/runtimeConfig.js: exige dev E o clique no botão de demonstração) as funções de
 * src/lib/api/indicadores.js não fazem rede e operam sobre o estado em memória daqui. As
 * mutações ALTERAM esse estado, para o gesto central da tela - lançar o valor de um
 * período e vê-lo aparecer na matriz - ser de fato exercitável.
 *
 * ESCOPO: não é cache nem persistência. Recarregar a página volta ao estado inicial. Em
 * build de produção MODO_DEMO é false por força (import.meta.env.DEV é estático) e o
 * bundler elimina os ramos que chamam este módulo.
 *
 * A SUTILEZA QUE O DATASET PRECISA REPRODUZIR: ausência de medição é diferente de zero
 * medido. A planilha de origem escreve 'N/A' quando não mediu e 0 quando mediu zero, e a
 * tela tem que mostrar as duas coisas de formas diferentes - senão um indicador que
 * ninguém acompanhou aparece como desempenho zero, que é uma afirmação que ninguém fez.
 * Por isso o indicador 3 abaixo tem período sem linha nenhuma, e não valor 0.
 *
 * LGPD: nenhum dado pessoal, nenhum nome de pessoa. Os indicadores são transcrição da
 * estrutura do Plano de Monitoramento (docs/indicadores/monitoring-plan.json), que é
 * metodologia de certificação e não dado de cliente.
 */

/* ===== Erro tipado ========================================================
   Mesmos códigos do backend, para a tela não tratar validação de um jeito no demo e de
   outro em produção. Classe própria e não a de outro domínio: quem converte em ErroApi
   (chamarDemo, em src/lib/api/base.js) só olha `codigo`, e acoplar dois datasets faria um
   mudar quando o outro mudasse.                                              */
export class ErroDemoIndicadores extends Error {
  constructor(codigo) {
    super(`Recusado pelo modo demonstracao: ${codigo}`);
    this.name = 'ErroDemoIndicadores';
    this.codigo = codigo;
  }
}

/* ===== Estado =============================================================
   Montado na PRIMEIRA LEITURA e não no topo do módulo. Uma expressão de topo é efeito
   colateral que o Rollup não consegue provar puro, e o módulo inteiro (com o dataset)
   ficaria vivo no bundle de produção mesmo com todos os ramos que o chamam eliminados.
   O acessador bd() é o mesmo padrão de src/lib/demoProjetos.js.              */
let estado = null;

function inicial() {
  return {
    indicadores: [
      {
        id: 'demo-ind-1',
        plano: 'comunidade',
        ordem: 1,
        codigo: null,
        nome: 'Number of illegal activities reported to public agencies',
        descricao: null,
        unidade: null,
        tipo: 'contagem',
        frequencia: 'Semi-annual',
        atividade: 'Monitoring of forest',
        atividade_descricao: 'Participatory and community monitoring of illegal activities',
        output: 'Improve surveillance and monitoring actions to combat illegal practices',
        outcome: 'Greenhouse gas emissions reduction',
        impacto: 'Reducing external pressures increases forest resilience.',
        recurso: 'Supporting documents (i.e. field activities reports; photos)',
        medicoes: [
          medicao('demo-med-1', 'demo-ind-1', '2022-12-31', 'anual', 0),
          medicao('demo-med-2', 'demo-ind-1', '2023-12-31', 'anual', 0),
          medicao('demo-med-3', 'demo-ind-1', '2024-12-31', 'anual', 3),
        ],
      },
      {
        id: 'demo-ind-2',
        plano: 'comunidade',
        ordem: 2,
        codigo: null,
        nome: 'Response Time of Authorities After Reporting',
        descricao: null,
        unidade: 'Days',
        tipo: 'contagem',
        frequencia: null,
        atividade: 'Monitoring of forest',
        atividade_descricao: 'Participatory and community monitoring of illegal activities',
        output: 'Improve surveillance and monitoring actions to combat illegal practices',
        outcome: 'Greenhouse gas emissions reduction',
        impacto: 'Reducing external pressures increases forest resilience.',
        recurso: 'Supporting documents (i.e. field activities reports; photos)',
        medicoes: [
          medicao('demo-med-4', 'demo-ind-2', '2023-12-31', 'anual', 0),
          medicao('demo-med-5', 'demo-ind-2', '2024-12-31', 'anual', 21),
        ],
      },
      {
        // SEM MEDIÇÃO NENHUMA, de propósito: é o caso que a tela precisa saber
        // desenhar sem inventar zero.
        id: 'demo-ind-3',
        plano: 'comunidade',
        ordem: 3,
        codigo: null,
        nome: 'Percentage of Female and Youth Participation',
        descricao: null,
        unidade: '%',
        tipo: 'percentual',
        frequencia: 'Every two years',
        atividade: 'Monitoring of forest',
        atividade_descricao: 'Support the training of ethno-environmental agents.',
        output: 'Trained ethno-environmental agents',
        outcome: 'Strengthened territorial surveillance',
        impacto: 'Reducing external pressures increases forest resilience.',
        recurso: 'Supporting documents (i.e. training lists; photos)',
        medicoes: [],
      },
      {
        id: 'demo-ind-4',
        plano: 'clima',
        ordem: 1,
        codigo: 'AJ',
        nome: 'Area of the jurisdiction',
        descricao: null,
        unidade: 'ha',
        tipo: 'area',
        frequencia: 'Every six years at baseline renewal.',
        atividade: 'Monitoring of forest',
        atividade_descricao: 'Implement satellite monitoring of deforestation and forest fires',
        output: 'Systematic monitoring of VM0048 parameters',
        outcome: 'Greenhouse gas emissions reduction',
        impacto: 'Reducing external pressures increases forest resilience.',
        recurso: 'Section 3.3.2 - Data and Parameters Monitored',
        medicoes: [],
      },
      {
        id: 'demo-ind-5',
        plano: 'biodiversidade',
        ordem: 1,
        codigo: null,
        nome: 'Species richness.',
        descricao: null,
        unidade: 'sp/ha',
        tipo: 'contagem',
        frequencia: 'Continuous Camera traps.',
        atividade: 'Monitoring of fauna',
        atividade_descricao: 'Facilitate fauna inventory and monitor wildlife.',
        output: 'Identification and monitoring of endemic and threatened species.',
        outcome: 'Conservation of threatened species.',
        impacto: 'Reducing external pressures increases forest resilience.',
        recurso: 'Supporting documents (i.e. field activities reports; photos)',
        medicoes: [medicao('demo-med-6', 'demo-ind-5', '2026-03-31', 'trimestral', 42)],
      },
    ],
    proximoId: 100,
  };
}

function bd() {
  if (!estado) estado = inicial();
  return estado;
}

function medicao(id, indicadorId, data, periodoTipo, valor) {
  return {
    id,
    indicador_id: indicadorId,
    data,
    periodo_tipo: periodoTipo,
    valor,
    origem: 'interna',
    observacao: null,
  };
}

/* ===== Rótulo do período ==================================================
   Tradução linha a linha de rotularPeriodo() em
   supabase/functions/carbon-api/rotas/indicadores.ts. Se as duas divergirem, a revisão do
   dono mostra um cabeçalho de coluna que a produção nunca produz, e a divergência só
   aparece depois do provisionamento.                                         */
export function rotularPeriodoDemo(data, tipo) {
  const [ano, mes] = data.split('-');
  if (tipo === 'anual') return ano;
  if (tipo === 'trimestral') return `${Math.ceil(Number(mes) / 3)}o tri ${ano}`;
  if (tipo === 'semestral') return `${Number(mes) <= 6 ? 1 : 2}o sem ${ano}`;
  if (tipo === 'mensal') return `${mes}/${ano}`;
  const [a, m, d] = data.split('-');
  return `${d}/${m}/${a}`;
}

const chave = (data, tipo) => `${data}|${tipo}`;

function comRotulos(m) {
  return {
    ...m,
    periodo_chave: chave(m.data, m.periodo_tipo),
    periodo_rotulo: rotularPeriodoDemo(m.data, m.periodo_tipo),
  };
}

/* ===== Leitura ============================================================ */

export function demoListarIndicadores(projetoId, { plano = null, busca = null } = {}) {
  const todos = bd().indicadores;

  let lista = todos;
  if (plano === 'internos') lista = lista.filter((i) => !i.plano);
  else if (plano) lista = lista.filter((i) => i.plano === plano);

  if (busca && busca.trim()) {
    const termo = busca.trim().toLowerCase();
    lista = lista.filter((i) =>
      [i.nome, i.codigo, i.atividade].some((c) => (c ?? '').toLowerCase().includes(termo))
    );
  }

  // Os períodos saem do dado, igual ao servidor, para a coluna nova aparecer sozinha.
  const periodos = new Map();
  for (const i of lista) {
    for (const m of i.medicoes) {
      const k = chave(m.data, m.periodo_tipo);
      if (!periodos.has(k)) {
        periodos.set(k, {
          chave: k,
          rotulo: rotularPeriodoDemo(m.data, m.periodo_tipo),
          data: m.data,
          tipo: m.periodo_tipo,
        });
      }
    }
  }

  const resumo = { clima: 0, comunidade: 0, biodiversidade: 0, internos: 0 };
  for (const i of todos) resumo[i.plano ?? 'internos'] += 1;

  return {
    indicadores: lista.map((i) => ({ ...i, medicoes: i.medicoes.map(comRotulos) })),
    periodos: [...periodos.values()].sort((a, b) => a.data.localeCompare(b.data)),
    resumo,
    total: lista.length,
    pagina: 1,
    limite: 200,
    projeto_id: projetoId,
  };
}

/* ===== Escrita ============================================================ */

function acharIndicador(id) {
  const achado = bd().indicadores.find((i) => i.id === id);
  if (!achado) throw new ErroDemoIndicadores('nao_encontrado');
  return achado;
}

export function demoCriarIndicador(projetoId, dados) {
  if (!dados?.nome || !String(dados.nome).trim()) {
    throw new ErroDemoIndicadores('campo_obrigatorio');
  }
  const b = bd();
  const novo = {
    id: `demo-ind-${b.proximoId++}`,
    plano: dados.plano ?? null,
    ordem: dados.ordem ?? null,
    codigo: dados.codigo ?? null,
    nome: String(dados.nome).trim(),
    descricao: dados.descricao ?? null,
    unidade: dados.unidade ?? null,
    tipo: dados.tipo ?? 'contagem',
    frequencia: dados.frequencia ?? null,
    atividade: dados.atividade ?? null,
    atividade_descricao: dados.atividade_descricao ?? null,
    output: dados.output ?? null,
    outcome: dados.outcome ?? null,
    impacto: dados.impacto ?? null,
    recurso: dados.recurso ?? null,
    medicoes: [],
  };
  b.indicadores.push(novo);
  return { indicador: novo };
}

export function demoAtualizarIndicador(indicadorId, dados) {
  const alvo = acharIndicador(indicadorId);
  // Percentual que acumula é recusado pelo CHECK do banco; recusar aqui também
  // mantém a mensagem igual nos dois caminhos.
  if ((dados.tipo ?? alvo.tipo) === 'percentual' && dados.acumulativo === true) {
    throw new ErroDemoIndicadores('percentual_nao_acumula');
  }
  Object.assign(alvo, dados);
  return { indicador: { ...alvo, medicoes: alvo.medicoes.map(comRotulos) } };
}

export function demoRemoverIndicador(indicadorId) {
  const b = bd();
  const i = b.indicadores.findIndex((x) => x.id === indicadorId);
  if (i < 0) throw new ErroDemoIndicadores('nao_encontrado');
  b.indicadores.splice(i, 1);
  return { removido: true };
}

export function demoRegistrarMedicao(indicadorId, dados) {
  const alvo = acharIndicador(indicadorId);
  if (!dados?.data) throw new ErroDemoIndicadores('campo_obrigatorio');
  const valor = Number(dados.valor);
  if (!Number.isFinite(valor)) throw new ErroDemoIndicadores('campo_invalido');

  const tipo = dados.periodo_tipo ?? 'pontual';

  // UPSERT pela chave natural, igual ao servidor: relançar o mesmo período
  // corrige o número em vez de criar uma segunda linha.
  const existente = alvo.medicoes.find((m) => m.data === dados.data && m.periodo_tipo === tipo);
  if (existente) {
    existente.valor = valor;
    existente.observacao = dados.observacao ?? null;
    return { medicao: comRotulos(existente) };
  }

  const nova = medicao(`demo-med-${bd().proximoId++}`, indicadorId, dados.data, tipo, valor);
  nova.observacao = dados.observacao ?? null;
  alvo.medicoes.push(nova);
  alvo.medicoes.sort((a, b2) => a.data.localeCompare(b2.data));
  return { medicao: comRotulos(nova) };
}

export function demoRemoverMedicao(medicaoId) {
  for (const i of bd().indicadores) {
    const k = i.medicoes.findIndex((m) => m.id === medicaoId);
    if (k >= 0) {
      i.medicoes.splice(k, 1);
      return { removido: true };
    }
  }
  throw new ErroDemoIndicadores('nao_encontrado');
}

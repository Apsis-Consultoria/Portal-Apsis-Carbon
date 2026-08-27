/**
 * demo/questionarios.js - dataset de demonstração dos questionários de campo.
 *
 * POR QUE EXISTE: a tela é dirigida por definição vinda do servidor. Sem este
 * módulo, ela não desenharia nada em modo demonstração - ficaria uma página em
 * branco, e o formulário, que é a parte que mais precisa de revisão visual,
 * seria invisível para quem não tem o backend ligado.
 *
 * O QUE ELE NÃO É: a definição completa dos quatro formulários. Copiar as 163
 * perguntas para cá criaria uma segunda verdade que envelheceria em silêncio.
 * Aqui vive uma versão REDUZIDA de cada um, suficiente para exercitar todos os
 * tipos de campo (texto, texto longo, número, inteiro, data, sim/não, escolha,
 * múltipla e arquivo) e as duas situações que importam: lista vazia e lista com
 * preenchimentos. A verdade continua em scripts/questionarios/definicoes.mjs.
 *
 * ESCOPO: não é cache nem persistência. Recarregar volta ao estado inicial. Em
 * produção MODO_DEMO é false por força e o bundler elimina este módulo.
 *
 * LGPD: nenhum nome de pessoa, aqui como no resto. As aldeias de exemplo são
 * inventadas e os autores são rótulos de função, não gente.
 */

export class ErroDemoQuestionario extends Error {
  constructor(codigo) {
    super(`Recusado pelo modo demonstracao: ${codigo}`);
    this.name = 'ErroDemoQuestionario';
    this.codigo = codigo;
  }
}

const SIM_NAO = [
  { valor: 'sim', rotulo: 'Sim' },
  { valor: 'nao', rotulo: 'Não' },
];

/* ===== Estado =============================================================
   Montado na PRIMEIRA LEITURA, e não numa expressão de topo de módulo:
   expressão de topo é efeito colateral que o Rollup não consegue provar puro, e
   manteria o dataset vivo no bundle de produção. */
let estado = null;

function bd() {
  if (estado) return estado;

  const modelos = [
    {
      id: 'demo-modelo-socioambiental',
      chave: 'socioambiental',
      nome: 'Diagnóstico Socioambiental',
      descricao: 'Diagnóstico da aldeia: educação, saúde, água e percepção sobre o projeto.',
      origem: 'KoboToolbox',
      versao: 1,
      definicao: {
        secoes: [
          {
            chave: 'educacao',
            titulo: 'Educação',
            perguntas: [
              { chave: 'ha_escola', rotulo: 'Há escola na aldeia?', tipo: 'escolha', opcoes: [
                { valor: 'na_aldeia', rotulo: 'Sim, escola dentro da aldeia' },
                { valor: 'fora', rotulo: 'Não, alunos estudam fora da aldeia' },
                { valor: 'nao_estudam', rotulo: 'Não, alunos não estudam' },
              ] },
              { chave: 'foto_escola', rotulo: 'Fotografe a escola', tipo: 'arquivo' },
            ],
          },
          {
            chave: 'agua',
            titulo: 'Água e saneamento',
            perguntas: [
              { chave: 'numero_pocos', rotulo: 'Número de poços na aldeia', tipo: 'escolha', opcoes: [
                { valor: 'nenhum', rotulo: 'Nenhum' },
                { valor: '1', rotulo: '1' },
                { valor: 'mais_de_2', rotulo: 'Mais de 2' },
              ] },
              { chave: 'qualidade_agua', rotulo: 'Qualidade da água', tipo: 'multipla', opcoes: [
                { valor: 'com_tratamento', rotulo: 'Há tratamento da água' },
                { valor: 'sem_tratamento', rotulo: 'Não há nenhum tratamento' },
              ] },
              { chave: 'q3_como_comunidade_e_informada', rotulo: 'De que forma a comunidade é informada sobre o projeto?', tipo: 'texto_longo' },
            ],
          },
        ],
      },
    },
    {
      id: 'demo-modelo-koxoas',
      chave: 'koxoas',
      nome: 'Diagnóstico Socioambiental - Koxoas',
      descricao: 'O mesmo diagnóstico, aplicado às Koxoas.',
      origem: 'KoboToolbox',
      versao: 1,
      definicao: {
        secoes: [
          {
            chave: 'projeto_carbono',
            titulo: 'Projeto de carbono',
            perguntas: [
              { chave: 'q4_pode_se_manifestar', rotulo: 'A Koxoa sente que pode se manifestar em reuniões sobre o projeto?', tipo: 'escolha', opcoes: [
                { valor: 'sim', rotulo: 'Sim' },
                { valor: 'as_vezes', rotulo: 'Às vezes' },
                { valor: 'nao', rotulo: 'Não' },
              ] },
              { chave: 'expectativas_projeto', rotulo: 'Quais as expectativas das Koxoas para o projeto?', tipo: 'texto_longo' },
            ],
          },
        ],
      },
    },
    {
      id: 'demo-modelo-rocas',
      chave: 'rocas',
      nome: 'Produção Agrícola e Extrativismo',
      descricao: 'Levantamento das roças: área, safra, manejo e comercialização.',
      origem: 'Formulário em papel',
      versao: 1,
      definicao: {
        secoes: [
          {
            chave: 'area_plantio',
            titulo: 'Área de plantio',
            perguntas: [
              { chave: 'familias_residentes', rotulo: 'Número de famílias residentes na aldeia', tipo: 'inteiro' },
              { chave: 'area_util_ha', rotulo: 'Área útil para cultivo (hectares)', tipo: 'numero' },
              { chave: 'epoca_plantio', rotulo: 'Época de plantio', tipo: 'texto' },
              { chave: 'tem_casa_farinha', rotulo: 'Existe casa de farinha?', tipo: 'sim_nao', opcoes: SIM_NAO },
            ],
          },
        ],
      },
    },
    {
      id: 'demo-modelo-ronda',
      chave: 'ronda',
      nome: 'Formulário da Ronda',
      descricao: 'Registro de alerta observado na ronda de vigilância territorial.',
      origem: 'KoboToolbox',
      versao: 1,
      definicao: {
        secoes: [
          {
            chave: 'alerta',
            titulo: 'Alerta observado',
            perguntas: [
              { chave: 'numero_alerta', rotulo: 'Número do alerta observado', tipo: 'texto', obrigatoria: true },
              { chave: 'classificacao', rotulo: 'Classifique o alerta', tipo: 'escolha', obrigatoria: true, opcoes: [
                { valor: 'desmatamento_ilegal', rotulo: 'Desmatamento ilegal dentro da TI' },
                { valor: 'garimpo', rotulo: 'Garimpo' },
                { valor: 'incendio', rotulo: 'Incêndio' },
                { valor: 'falso_positivo', rotulo: 'Falso positivo' },
              ] },
              { chave: 'observacoes_ponto', rotulo: 'Observações adicionais sobre o ponto', tipo: 'texto_longo' },
              { chave: 'ronda_referencia', rotulo: 'Qual a ronda?', tipo: 'texto', dica: 'No formato MM-AAAA.' },
            ],
          },
        ],
      },
    },
  ];

  const preenchidos = [
    {
      id: 'demo-q-1',
      modelo_id: 'demo-modelo-ronda',
      modelo_versao: 1,
      projeto_id: null,
      aldeia: null,
      data_referencia: '2026-07-18',
      autor_id: 'demo-usuario',
      entrevistado_funcao: 'equipe_apsis',
      latitude: -4.7312, longitude: -49.9418, altitude_m: 142, precisao_m: 4,
      respostas: {
        numero_alerta: 'ALT-2026-0142',
        classificacao: 'desmatamento_ilegal',
        observacoes_ponto: 'Área aberta recentemente, com vestígios de trator. Sem presença no momento da visita.',
        ronda_referencia: '07-2026',
      },
      status: 'concluido',
      observacoes: null,
      criado_em: '2026-07-18T14:20:00Z',
      atualizado_em: '2026-07-18T14:20:00Z',
    },
    {
      id: 'demo-q-2',
      modelo_id: 'demo-modelo-socioambiental',
      modelo_versao: 1,
      projeto_id: null,
      aldeia: 'Aldeia de exemplo',
      data_referencia: '2026-06-02',
      autor_id: 'demo-usuario',
      entrevistado_funcao: 'cacique',
      latitude: null, longitude: null, altitude_m: null, precisao_m: null,
      respostas: { ha_escola: 'na_aldeia', numero_pocos: '1', qualidade_agua: ['sem_tratamento'] },
      status: 'rascunho',
      observacoes: null,
      criado_em: '2026-06-02T10:00:00Z',
      atualizado_em: '2026-06-02T10:00:00Z',
    },
  ];

  estado = { modelos, preenchidos, proximo: 3 };
  return estado;
}

const porChave = (chave) => bd().modelos.find((m) => m.chave === chave) ?? null;
const porId = (id) => bd().preenchidos.find((q) => q.id === id) ?? null;

export function demoListarModelos() {
  return { modelos: bd().modelos };
}

export function demoListarQuestionarios(filtros = {}) {
  let lista = [...bd().preenchidos];

  if (filtros.modelo) {
    const modelo = porChave(filtros.modelo);
    lista = modelo ? lista.filter((q) => q.modelo_id === modelo.id) : [];
  }
  if (filtros.status) lista = lista.filter((q) => q.status === filtros.status);
  if (filtros.aldeia) {
    const alvo = String(filtros.aldeia).toLowerCase();
    lista = lista.filter((q) => (q.aldeia ?? '').toLowerCase().includes(alvo));
  }

  lista.sort((a, b) => String(b.data_referencia ?? '').localeCompare(String(a.data_referencia ?? '')));
  return { questionarios: lista, total: lista.length, pagina: 1, pode_escrever: true };
}

export function demoDetalharQuestionario(id) {
  const questionario = porId(id);
  if (!questionario) throw new ErroDemoQuestionario('nao_encontrado');
  const modelo = bd().modelos.find((m) => m.id === questionario.modelo_id) ?? null;
  return { questionario, modelo, pode_escrever: true };
}

export function demoCriarQuestionario(dados = {}) {
  const b = bd();
  const questionario = {
    id: `demo-q-${b.proximo++}`,
    modelo_id: dados.modelo_id ?? b.modelos[0].id,
    modelo_versao: 1,
    projeto_id: dados.projeto_id ?? null,
    aldeia: dados.aldeia ?? null,
    data_referencia: dados.data_referencia ?? null,
    autor_id: 'demo-usuario',
    entrevistado_funcao: dados.entrevistado_funcao ?? null,
    latitude: dados.latitude ?? null,
    longitude: dados.longitude ?? null,
    altitude_m: dados.altitude_m ?? null,
    precisao_m: dados.precisao_m ?? null,
    respostas: dados.respostas ?? {},
    status: dados.status ?? 'rascunho',
    observacoes: dados.observacoes ?? null,
    criado_em: '2026-08-27T12:00:00Z',
    atualizado_em: '2026-08-27T12:00:00Z',
  };
  b.preenchidos.unshift(questionario);
  return { questionario };
}

export function demoAtualizarQuestionario(id, dados = {}) {
  const questionario = porId(id);
  if (!questionario) throw new ErroDemoQuestionario('nao_encontrado');
  Object.assign(questionario, dados, { atualizado_em: '2026-08-27T12:00:00Z' });
  return { questionario };
}

export function demoRemoverQuestionario(id) {
  const b = bd();
  const questionario = porId(id);
  if (!questionario) throw new ErroDemoQuestionario('nao_encontrado');
  // Mesma regra do servidor: concluído é evidência de campo e não some por clique.
  if (questionario.status === 'concluido') throw new ErroDemoQuestionario('questionario_concluido');
  b.preenchidos = b.preenchidos.filter((q) => q.id !== id);
  return { removido: true };
}

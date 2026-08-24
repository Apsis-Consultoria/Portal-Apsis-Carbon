/**
 * demoProjetos.js - dataset de demonstracao das telas de Projetos e de PDD.
 *
 * POR QUE EXISTE: o projeto Supabase do Apsis Carbon ainda NAO foi provisionado, e as
 * telas precisam ser revisaveis localmente antes disso. Em MODO_DEMO (ver
 * src/lib/runtimeConfig.js: exige dev E o clique no botao de demonstracao) as sete funcoes de
 * projeto/PDD do carbonApi nao fazem rede: operam sobre o estado em memoria deste
 * arquivo, e as mutacoes ALTERAM esse estado, para a tela ser de fato interativa.
 *
 * ESCOPO: isto nao e cache nem persistencia. Recarregar a pagina volta ao estado
 * inicial. Vale SOMENTE em desenvolvimento: em build de producao MODO_DEMO e false por
 * forca (import.meta.env.DEV e estatico), e o bundler elimina os ramos que chamam este
 * modulo.
 *
 * LGPD: o projeto abaixo e ficticio e obviamente ficticio. Nenhum dado de cliente real,
 * nenhum nome de pessoa, nenhum identificador de registro verdadeiro. Ja a estrutura de
 * capitulos do PDD nao e dado de cliente: e a estrutura publica do padrao VCS + CCB,
 * transcrita de docs/notion/05-pdd-parakana.md.
 */

/* ===== Erro tipado ========================================================
   O demo precisa recusar entrada invalida com os MESMOS codigos do backend
   (nome_obrigatorio, nao_encontrado, status_invalido, geometria_invalida), senao a
   tela trataria erro de validacao de um jeito no demo e de outro em producao.
   Nao lancamos ErroApi aqui de proposito: carbonApi.js importa este arquivo, e
   importar ErroApi de volta criaria ciclo entre os dois modulos. Quem converte
   ErroDemo em ErroApi e o carbonApi.                                        */
export class ErroDemo extends Error {
  constructor(codigo) {
    super(`Recusado pelo modo demonstracao: ${codigo}`);
    this.name = 'ErroDemo';
    this.codigo = codigo;
  }
}

/* ===== Template VCS + CCB =================================================
   Transcricao literal de docs/notion/05-pdd-parakana.md. Os nomes ficam em INGLES
   porque e assim que a submissao ao registro exige.

   `cap`, `nivel` e `ordem` sao DERIVADOS da numeracao, e nao digitados: derivar
   elimina a classe de erro mais provavel numa lista deste tamanho (um nivel ou um
   capitulo raiz errado numa linha do meio, que ninguem percebe na revisao).

   Opcional = true somente nos tres que o padrao chama de "Optional Criterion"
   (3.4, 4.5 e 5.5). Sao eles que justificam o estado 'nao_aplicavel': sem sair do
   denominador, o PDD nunca fecha 100%.                                       */
const TEMPLATE_BRUTO = [
  ['1', 'Summary of Project Benefits', false],
  ['1.1', 'Unique Project Benefits', false],
  ['1.2', 'Standardized Benefit Metrics', false],
  ['2', 'Project Details', false],
  ['2.1', 'Project Goals, Design and Long-Term Viability', false],
  ['2.2', 'Without-project Land Use Scenario and Additionality', false],
  ['2.2.1', 'Conditions Prior to Project Initiation and Land Use Scenarios without the Project', false],
  ['2.2.2', 'Most-Likely Scenario Justification', false],
  ['2.3', 'Safeguards and Stakeholder Engagement', false],
  ['2.4', 'Management Capacity', false],
  ['2.5', 'Legal Status and Property Rights', false],
  ['2.6', 'Additional Information Relevant to the Project', false],
  ['3', 'Climate', false],
  ['3.1', 'Application of Methodology', false],
  ['3.1.1', 'Title and Reference of Methodology', false],
  ['3.1.2', 'Applicability of Methodology', false],
  ['3.2', 'Quantification of Estimated GHG Emission Reductions and Removals', false],
  ['3.3', 'Monitoring', false],
  ['3.3.1', 'Monitoring Plan', false],
  ['3.3.2', 'Data and Parameters Monitored', false],
  ['3.4', 'Optional Criterion: Climate Change Adaptation Benefits', true],
  ['4', 'Community', false],
  ['4.1', 'Without-Project Community Scenario', false],
  ['4.2', 'Net Positive Community Impacts', false],
  ['4.2.1', 'Expected Community Impacts', false],
  ['4.2.2', 'Negative Community Impact Mitigation', false],
  ['4.2.3', 'Net Positive Community Well-Being', false],
  ['4.3', 'Other Stakeholder Impacts', false],
  ['4.4', 'Community Impact Monitoring', false],
  ['4.4.1', 'Community Monitoring Plan', false],
  ['4.4.2', 'Monitoring Plan Dissemination', false],
  ['4.5', 'Optional Criterion: Exceptional Community Benefits', true],
  ['5', 'Biodiversity', false],
  ['5.1', 'Without-Project Biodiversity Scenario', false],
  ['5.2', 'Net Positive Biodiversity Impacts', false],
  ['5.2.1', 'Expected Biodiversity Changes', false],
  ['5.2.2', 'Mitigation Measures', false],
  ['5.2.3', 'Net Positive Biodiversity Impacts', false],
  ['5.3', 'Offsite Biodiversity Impacts', false],
  ['5.4', 'Biodiversity Impact Monitoring', false],
  ['5.4.1', 'Biodiversity Monitoring Plan', false],
  ['5.4.2', 'Biodiversity Monitoring Plan Dissemination', false],
  ['5.5', 'Optional Criterion: Exceptional Biodiversity Benefits', true],
];

/* NOTA DE BUNDLE (verificada, nao suposta): com MODO_DEMO dobrado para false, o Rollup
   elimina do build de producao as funcoes demo* e o projeto ficticio deste arquivo, mas
   NAO estas duas listas - ele nao consegue provar que um .map() de topo de modulo e
   livre de efeito colateral. Sobram ~3 KB com a numeracao e os titulos dos 43 capitulos.
   Isso e aceitavel de proposito: e metodologia PUBLICA do padrao VCS+CCB, nao dado de
   cliente e nao dado pessoal. Se algum dia incomodar, a saida e tornar a lista lazy
   (funcao em vez de const de topo), nao anotar pureza - a anotacao foi testada aqui e
   nao surtiu efeito. */
// Anotacao de pureza: sem ela o Rollup nao dobra o .map do topo do modulo,
// mantem a chamada no bundle de producao e, com ela, o TEMPLATE_BRUTO inteiro
// e tudo o mais que o modulo define. Ver a nota longa em src/lib/demoProjetos.js.
export const TEMPLATE_PDD_VCS_CCB = /* @__PURE__ */ TEMPLATE_BRUTO.map(([capitulo, nome, opcional], i) => ({
  capitulo,
  nome,
  cap: Number(capitulo.split('.')[0]),
  nivel: capitulo.split('.').length,
  opcional,
  ordem: i + 1,
}));

/* Espelha o CHECK da coluna carbon_pdd_capitulos.status. */
const STATUS_CAPITULO_VALIDOS = [
  'nao_iniciado',
  'em_andamento',
  'em_revisao',
  'concluido',
  'nao_aplicavel',
];

/* ===== Utilitarios ======================================================== */

/** Espera curta para que os estados de carregamento das telas apareçam no demo. */
const esperar = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

function arredondar(valor, casas) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

/** Converte para numero finito ou null. String vazia e texto invalido viram null. */
function numeroOuNulo(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function novoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback so para ambiente sem crypto.randomUUID (nao ocorre nos navegadores alvo).
  return `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
}

const agora = () => new Date().toISOString();

/* ===== Geometria =========================================================
   O aviso de divergencia de area (criterio de aceite da issue #1) depende de uma
   area CALCULADA a partir da geometria. Em producao ela vem do banco, por trigger,
   com ST_Area(geometria::geography)/10000 - PostGIS, geodesico, correto.

   No navegador nao existe PostGIS. Para o demo continuar demonstrando o aviso
   quando alguem cola um GeoJSON no formulario, usamos a area por excesso esferico
   abaixo. E APROXIMACAO de demonstracao: esfera de raio equatorial e buracos
   (aneis internos) ignorados. Nunca use este numero em laudo nem em calculo real.  */

const RAIO_TERRA_M = 6378137;
const paraRad = (graus) => (graus * Math.PI) / 180;

/** Extrai os aneis EXTERNOS de um GeoJSON Polygon ou MultiPolygon. */
function aneisExternos(geojson) {
  const tipo = geojson?.type;
  const coords = geojson?.coordinates;
  if (!Array.isArray(coords)) return [];
  if (tipo === 'Polygon') return Array.isArray(coords[0]) ? [coords[0]] : [];
  if (tipo === 'MultiPolygon') {
    return coords.map((poligono) => (Array.isArray(poligono) ? poligono[0] : null)).filter(Boolean);
  }
  return [];
}

function areaAnelM2(anel) {
  if (!Array.isArray(anel) || anel.length < 4) return 0;
  let soma = 0;
  for (let i = 0; i < anel.length - 1; i += 1) {
    const p1 = anel[i];
    const p2 = anel[i + 1];
    if (!Array.isArray(p1) || !Array.isArray(p2)) return 0;
    const [lon1, lat1] = p1;
    const [lon2, lat2] = p2;
    if (![lon1, lat1, lon2, lat2].every((v) => typeof v === 'number' && Number.isFinite(v))) {
      return 0;
    }
    soma += (paraRad(lon2) - paraRad(lon1)) * (2 + Math.sin(paraRad(lat1)) + Math.sin(paraRad(lat2)));
  }
  return (soma * RAIO_TERRA_M * RAIO_TERRA_M) / 2;
}

/** Area aproximada em hectares, ou null quando o GeoJSON nao tem poligono utilizavel. */
function areaAproximadaHa(geojson) {
  const total = aneisExternos(geojson).reduce((acc, anel) => acc + Math.abs(areaAnelM2(anel)), 0);
  return total > 0 ? arredondar(total / 10000, 4) : null;
}

/**
 * Valida o GeoJSON no mesmo espirito do backend (que usa ST_GeomFromGeoJSON):
 * aceita Polygon e MultiPolygon, recusa o resto com o codigo 'geometria_invalida'.
 */
function validarGeometria(geojson) {
  if (geojson === null || geojson === undefined) return null;
  const tipo = geojson?.type;
  if (tipo !== 'Polygon' && tipo !== 'MultiPolygon') throw new ErroDemo('geometria_invalida');
  if (!aneisExternos(geojson).length) throw new ErroDemo('geometria_invalida');
  return geojson;
}

/* ===== Progresso ==========================================================
   MESMA regra da funcao SQL public.carbon_pdd_progresso: capitulo com status
   'nao_aplicavel' sai do DENOMINADOR. Se as duas contas divergirem, o demo passa a
   mentir sobre o comportamento real - por isso a regra esta escrita uma unica vez
   aqui e o resto do arquivo so a chama.                                       */
export function calcularProgressoPdd(capitulos) {
  const lista = Array.isArray(capitulos) ? capitulos : [];
  const naoAplicaveis = lista.filter((c) => c?.status === 'nao_aplicavel');
  const contam = lista.filter((c) => c?.status !== 'nao_aplicavel');
  const concluidos = contam.filter((c) => c?.status === 'concluido');

  const porCap = new Map();
  for (const capitulo of contam) {
    const cap = Number(capitulo?.cap) || 0;
    const atual = porCap.get(cap) || { cap, total: 0, concluidos: 0 };
    atual.total += 1;
    if (capitulo?.status === 'concluido') atual.concluidos += 1;
    porCap.set(cap, atual);
  }

  return {
    total: contam.length,
    concluidos: concluidos.length,
    nao_aplicaveis: naoAplicaveis.length,
    // Uma casa decimal, igual ao round(..., 1) da funcao SQL carbon_pdd_progresso.
    // Arredondar diferente aqui faria o demo mostrar um percentual que a producao
    // nunca produz, e a divergencia so apareceria depois do provisionamento.
    pct: contam.length === 0 ? 0 : arredondar((concluidos.length * 100) / contam.length, 1),
    por_capitulo: [...porCap.values()]
      .sort((a, b) => a.cap - b.cap)
      .map((g) => ({
        ...g,
        pct: g.total === 0 ? 0 : arredondar((g.concluidos * 100) / g.total, 1),
      })),
  };
}

/* ===== Projeto de demonstracao ============================================ */

/**
 * Retangulo ficticio de aproximadamente 0,1 x 0,1 grau. Nao corresponde a nenhuma
 * area real de cliente: sao coordenadas redondas escolhidas so para o calculo de
 * area ter um valor plausivel na tela.
 */
const GEOMETRIA_DEMO = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [-52.0, -6.1],
        [-51.9, -6.1],
        [-51.9, -6.0],
        [-52.0, -6.0],
        [-52.0, -6.1],
      ],
    ],
  ],
};

const PROJETO_DEMO_ID = '00000000-0000-4000-8000-000000000001';
const CRIADO_EM_DEMO = '2026-03-02T13:00:00.000Z';

/**
 * Status iniciais variados, para as telas mostrarem progresso de verdade.
 * Os tres "Optional Criterion" comecam como 'nao_aplicavel' justamente para provar,
 * na tela, que eles saem do denominador (o total fica 40 em vez de 43).
 * Capitulo ausente deste mapa nasce 'nao_iniciado'.
 */
const STATUS_INICIAL_DEMO = {
  // Chaves sempre entre aspas: '2.10' e '2.1' sao capitulos diferentes, e uma chave
  // numerica sem aspas viraria a mesma string para os dois (2.10 -> '2.1').
  '1': 'concluido',
  '1.1': 'concluido',
  '1.2': 'concluido',
  '2': 'em_revisao',
  '2.1': 'concluido',
  '2.2': 'em_revisao',
  '2.2.1': 'concluido',
  '2.2.2': 'em_andamento',
  '2.3': 'em_andamento',
  '2.4': 'concluido',
  '2.5': 'concluido',
  '2.6': 'nao_iniciado',
  '3': 'em_andamento',
  '3.1': 'concluido',
  '3.1.1': 'concluido',
  '3.1.2': 'concluido',
  '3.2': 'em_revisao',
  '3.3': 'em_andamento',
  '3.3.1': 'em_andamento',
  '3.3.2': 'nao_iniciado',
  '3.4': 'nao_aplicavel',
  '4': 'em_andamento',
  '4.1': 'concluido',
  '4.2': 'em_andamento',
  '4.2.1': 'concluido',
  '4.2.2': 'em_andamento',
  '4.4': 'nao_iniciado',
  '4.5': 'nao_aplicavel',
  '5': 'nao_iniciado',
  '5.1': 'em_andamento',
  '5.5': 'nao_aplicavel',
};

/** Observacoes de exemplo, para o campo aparecer preenchido em pelo menos um lugar. */
const OBSERVACOES_INICIAIS_DEMO = {
  '2.2': 'Aguardando a segunda rodada de revisão interna antes de fechar o capítulo.',
  '3.4': 'Critério opcional: a equipe decidiu não pleitear este benefício nesta submissão.',
  '3.3.2': 'Depende da planilha de parâmetros monitorados.',
};

function instanciarTemplate(projetoId, { comStatusInicial = false } = {}) {
  return TEMPLATE_PDD_VCS_CCB.map((linha) => ({
    id: novoId(),
    projeto_id: projetoId,
    capitulo: linha.capitulo,
    nome: linha.nome,
    cap: linha.cap,
    nivel: linha.nivel,
    opcional: linha.opcional,
    ordem: linha.ordem,
    status: comStatusInicial ? STATUS_INICIAL_DEMO[linha.capitulo] || 'nao_iniciado' : 'nao_iniciado',
    responsavel_id: null,
    responsavel_nome: null,
    observacoes: comStatusInicial ? OBSERVACOES_INICIAIS_DEMO[linha.capitulo] || null : null,
    criado_em: CRIADO_EM_DEMO,
    atualizado_em: CRIADO_EM_DEMO,
  }));
}

/* ===== Estado em memoria ==================================================
   Guardamos a geometria junto do projeto, como no banco, e a escondemos na
   listagem (o backend devolve so tem_geometria). Assim o demo tem o mesmo formato
   de payload da Edge Function.                                               */

// A anotacao de pureza na chamada abaixo nao e enfeite: sem ela o Rollup nao
// consegue provar que a chamada nao tem efeito colateral, mantem a chamada no
// bundle de producao e, junto com ela, TUDO que ela referencia. Foi assim que a
// geometria ficticia (GEOMETRIA_DEMO) vazou para o dist mesmo com todos os
// ramos de demonstracao ja eliminados: esta chamada era o unico fio que a
// segurava. Conferir com:  grep -c -- "-51.9" dist/assets/*.js  (tem que dar 0)
const areaCalculadaDemo = /* @__PURE__ */ areaAproximadaHa(GEOMETRIA_DEMO);

let projetos = [
  {
    id: PROJETO_DEMO_ID,
    nome: 'Projeto Demonstração - Vale do Exemplo',
    proponente: 'Proponente Exemplo Ltda.',
    standard: 'VCS+CCB',
    metodologia: 'Metodologia Exemplo VM0000',
    pais: 'Brasil',
    estado: 'UF Exemplo',
    municipio: 'Município Exemplo',
    // Declarada de proposito acima da calculada: dispara o aviso de divergencia
    // (>5%), que e o criterio de aceite literal da issue #1.
    area_declarada_ha: 13250,
    area_calculada_ha: areaCalculadaDemo,
    geometria: GEOMETRIA_DEMO,
    data_inicio: '2024-01-01',
    periodo_creditacao_inicio: '2024-01-01',
    periodo_creditacao_fim: '2053-12-31',
    status_registro: 'em_validacao',
    registro_id: 'REG-DEMO-0000',
    registros_anteriores: ['REG-DEMO-ANTIGO-0000'],
    ativo: true,
    criado_por: null,
    criado_em: CRIADO_EM_DEMO,
    atualizado_em: CRIADO_EM_DEMO,
  },
];

/** projeto_id -> lista de capitulos. Projeto novo nasce SEM PDD, de proposito: e
 *  assim que se testa o estado vazio e o botao "Criar PDD a partir do template". */
/* ===== Estado ficticio, criado na PRIMEIRA leitura ========================
   Nada de dado no topo do modulo, e nao e estilo: com um `let` de topo cuja
   chave e computada ([PROJETO_DEMO_ID]) o Rollup nao consegue provar que a
   inicializacao e inofensiva, mantem o binding no bundle de PRODUCAO e, com
   ele, tudo o que a inicializacao referencia (o template inteiro, os mapas de
   estado, as datas). Foi assim que este modulo continuou no dist mesmo com
   todos os ramos `if (MODO_DEMO && MODO_DEMO_ATIVO())` ja eliminados.
   Dentro de uma funcao, nada disso e avaliado ate alguem chamar - e em
   producao ninguem chama, porque as chamadas estao nos ramos eliminados.
   Mesmo padrao de src/lib/demo/secureshare.js.                             */
let capitulosPorProjeto = null;

/** projeto_id -> lista de capitulos. Projeto novo nasce SEM PDD, de proposito:
 *  e assim que se testa o estado vazio e o botao "Criar PDD a partir do
 *  template". */
function bd() {
  if (!capitulosPorProjeto) {
    capitulosPorProjeto = {
      [PROJETO_DEMO_ID]: instanciarTemplate(PROJETO_DEMO_ID, { comStatusInicial: true }),
    };
  }
  return capitulosPorProjeto;
}

/* ===== Equipe do projeto ==================================================
   Espelha a tabela carbon_projeto_equipe: quem participa é quem enxerga o projeto.
   Criada na PRIMEIRA leitura pelo mesmo motivo dos capítulos (ver a nota acima): dado
   no topo do módulo com chave computada sobrevive ao tree-shaking do build de produção.

   LGPD: o endereço abaixo é um alias institucional de área e fictício, nunca o e-mail
   de uma pessoa. Vale para todo dado de demonstração deste arquivo.               */
let equipePorProjeto = null;

function equipesBd() {
  if (!equipePorProjeto) {
    equipePorProjeto = {
      [PROJETO_DEMO_ID]: [
        { id: 'demo-equipe-0001', email: 'equipe.carbon@apsis.com.br', nome: 'Equipe Carbon' },
      ],
    };
  }
  return equipePorProjeto;
}

/** Cópia da equipe do projeto, no formato [{ id, email, nome }] da Edge Function. */
function equipeDoProjeto(projetoId) {
  return (equipesBd()[projetoId] || []).map(({ id, email, nome }) => ({ id, email, nome }));
}

/* ===== Serializacao (mesmo formato da Edge Function) ====================== */

/**
 * Acrescenta os campos que o backend calcula no servidor:
 *   area_divergencia_pct = |declarada - calculada| / calculada * 100
 *   area_alerta          = divergencia acima de 5%
 * Faltando qualquer uma das duas areas, vem null e false (nao ha o que comparar).
 * Calculada igual a zero tambem cai nesse caso, para nunca dividir por zero.
 */
function serializarProjeto(projeto, { comGeometria = false } = {}) {
  const { geometria, ...resto } = projeto;
  const declarada = numeroOuNulo(projeto.area_declarada_ha);
  const calculada = numeroOuNulo(projeto.area_calculada_ha);

  let divergencia = null;
  let alerta = false;
  if (declarada !== null && calculada !== null && calculada !== 0) {
    divergencia = arredondar((Math.abs(declarada - calculada) / calculada) * 100, 2);
    alerta = divergencia > 5;
  }

  return {
    ...resto,
    tem_geometria: Boolean(geometria),
    ...(comGeometria ? { geometria: geometria ?? null } : {}),
    area_divergencia_pct: divergencia,
    area_alerta: alerta,
  };
}

function acharProjeto(id) {
  const projeto = projetos.find((p) => p.id === id);
  if (!projeto) throw new ErroDemo('nao_encontrado');
  return projeto;
}

/* ===== Lista branca de campos =============================================
   Mesma disciplina do backend: campo desconhecido no corpo e IGNORADO, nunca
   gravado. `geometria` fica fora desta lista porque nao e coluna simples: passa
   pela validacao e alimenta tambem a area calculada.                          */
const CAMPOS_PROJETO = [
  'nome',
  'proponente',
  'standard',
  'metodologia',
  'pais',
  'estado',
  'municipio',
  'area_declarada_ha',
  'data_inicio',
  'periodo_creditacao_inicio',
  'periodo_creditacao_fim',
  'status_registro',
  'registro_id',
  'registros_anteriores',
];

function filtrarCampos(dados) {
  const entrada = dados && typeof dados === 'object' ? dados : {};
  const saida = {};
  for (const campo of CAMPOS_PROJETO) {
    if (entrada[campo] === undefined) continue;
    saida[campo] = entrada[campo];
  }
  if (saida.area_declarada_ha !== undefined) {
    saida.area_declarada_ha = numeroOuNulo(saida.area_declarada_ha);
  }
  if (saida.registros_anteriores !== undefined && !Array.isArray(saida.registros_anteriores)) {
    saida.registros_anteriores = [];
  }
  return saida;
}

/* ===== Funcoes que imitam o backend ====================================== */

/**
 * Imita o envelope novo de GET /projetos: { projetos, pode_criar }.
 *
 * `pode_criar` é true porque o modo demonstração existe para revisar a tela inteira,
 * inclusive o formulário de criação. A decisão continua sendo do servidor - aqui o
 * servidor é este arquivo, e ele responde true. A tela apenas renderiza o booleano
 * que recebeu, sem recalcular a regra por perfil.
 */
export async function demoListarProjetos() {
  await esperar();
  const lista = [...projetos]
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
    .map((p) => serializarProjeto(p));
  return { projetos: lista, pode_criar: true };
}

/**
 * Imita o envelope novo de GET /projetos/:id: { projeto, equipe, pode_escrever }.
 *
 * `pode_escrever` é true pelo mesmo motivo de `pode_criar` na listagem: sem ele o painel
 * de equipe apareceria em modo somente leitura no único modo em que a tela é revisável.
 */
export async function demoObterProjeto(id) {
  await esperar();
  return {
    projeto: serializarProjeto(acharProjeto(id), { comGeometria: true }),
    equipe: equipeDoProjeto(id),
    pode_escrever: true,
  };
}

export async function demoCriarProjeto(dados) {
  await esperar();
  const campos = filtrarCampos(dados);
  if (!String(campos.nome || '').trim()) throw new ErroDemo('nome_obrigatorio');

  const geometria = validarGeometria(dados?.geometria ?? null);
  const criadoEm = agora();

  const projeto = {
    id: novoId(),
    nome: String(campos.nome).trim(),
    proponente: campos.proponente ?? null,
    standard: campos.standard || 'VCS+CCB',
    metodologia: campos.metodologia ?? null,
    pais: campos.pais || 'Brasil',
    estado: campos.estado ?? null,
    municipio: campos.municipio ?? null,
    area_declarada_ha: campos.area_declarada_ha ?? null,
    // Em producao quem preenche isto e o trigger do banco, com PostGIS.
    area_calculada_ha: geometria ? areaAproximadaHa(geometria) : null,
    geometria,
    data_inicio: campos.data_inicio ?? null,
    periodo_creditacao_inicio: campos.periodo_creditacao_inicio ?? null,
    periodo_creditacao_fim: campos.periodo_creditacao_fim ?? null,
    status_registro: campos.status_registro || 'rascunho',
    registro_id: campos.registro_id ?? null,
    registros_anteriores: campos.registros_anteriores ?? [],
    ativo: true,
    criado_por: null,
    criado_em: criadoEm,
    atualizado_em: criadoEm,
  };

  projetos = [...projetos, projeto];
  /* Projeto novo NASCE com quem criou na equipe, como no backend. Sem isto o projeto
     recém-criado sumiria da lista assim que a leitura passasse a ser por participação -
     e é exatamente essa promessa que o estado vazio da tela faz. Em demonstração não há
     conta autenticada, então quem entra é o mesmo alias fictício da equipe inicial. */
  equipesBd()[projeto.id] = [
    { id: novoId(), email: 'equipe.carbon@apsis.com.br', nome: 'Equipe Carbon' },
  ];
  return { projeto: serializarProjeto(projeto, { comGeometria: true }) };
}

export async function demoAtualizarProjeto(id, dados) {
  await esperar();
  const projeto = acharProjeto(id);
  const campos = filtrarCampos(dados);

  if (campos.nome !== undefined && !String(campos.nome || '').trim()) {
    throw new ErroDemo('nome_obrigatorio');
  }

  Object.assign(projeto, campos);

  if (dados?.geometria !== undefined) {
    const geometria = validarGeometria(dados.geometria);
    projeto.geometria = geometria;
    projeto.area_calculada_ha = geometria ? areaAproximadaHa(geometria) : null;
  }

  projeto.atualizado_em = agora();
  return { projeto: serializarProjeto(projeto, { comGeometria: true }) };
}

function estadoPdd(projetoId) {
  const capitulos = [...(bd()[projetoId] || [])].sort((a, b) => a.ordem - b.ordem);
  return { capitulos, progresso: calcularProgressoPdd(capitulos) };
}

export async function demoObterPdd(projetoId) {
  await esperar();
  acharProjeto(projetoId);
  return estadoPdd(projetoId);
}

/**
 * Imita public.carbon_pdd_criar_do_template: copia do template so o que ainda nao
 * existe no projeto e devolve quantos foram criados. Idempotente de proposito -
 * clicar duas vezes no botao nao duplica capitulo.
 *
 * FILTRA PELO STANDARD como a funcao SQL faz (where t.standard = v_standard). O unico
 * standard com capitulos semeados e VCS+CCB, entao projeto criado no formulario com
 * outro standard recebe zero capitulos - igual a producao. Instanciar o template de
 * qualquer jeito faria o demo demonstrar um comportamento que a producao nunca produz,
 * e esconderia justamente o caso que a tela de PDD precisa avisar.
 */
const STANDARDS_COM_TEMPLATE = ['VCS+CCB'];

export async function demoCriarPddDoTemplate(projetoId) {
  await esperar();
  const projeto = acharProjeto(projetoId);

  const existentes = bd()[projetoId] || [];
  const numeros = new Set(existentes.map((c) => c.capitulo));
  const doTemplate = STANDARDS_COM_TEMPLATE.includes(projeto.standard)
    ? instanciarTemplate(projetoId)
    : [];
  const novos = doTemplate.filter((c) => !numeros.has(c.capitulo));

  capitulosPorProjeto = {
    ...bd(),
    [projetoId]: [...existentes, ...novos],
  };

  return { criados: novos.length, ...estadoPdd(projetoId) };
}

export async function demoAtualizarCapituloPdd(capituloId, dados) {
  await esperar();

  let alvo = null;
  for (const lista of Object.values(bd())) {
    const achado = lista.find((c) => c.id === capituloId);
    if (achado) {
      alvo = achado;
      break;
    }
  }
  if (!alvo) throw new ErroDemo('nao_encontrado');

  // Lista branca igual a do PATCH /pdd-capitulos/:id: so estes tres campos.
  if (dados?.status !== undefined) {
    if (!STATUS_CAPITULO_VALIDOS.includes(dados.status)) throw new ErroDemo('status_invalido');
    alvo.status = dados.status;
  }
  if (dados?.responsavel_id !== undefined) alvo.responsavel_id = dados.responsavel_id || null;
  if (dados?.observacoes !== undefined) {
    const texto = String(dados.observacoes ?? '').trim();
    alvo.observacoes = texto || null;
  }

  alvo.atualizado_em = agora();
  return { capitulo: { ...alvo } };
}

/**
 * Imita o PATCH /projetos/:id/equipe.
 *
 * Recusa com os MESMOS códigos do backend, e é por isso que as três regras estão aqui:
 *
 * - 'colaborador_externo': só entra e-mail @apsis.com.br. Quem é de fora não tem conta
 *   no Apsis Carbon, então a linha em carbon_projeto_equipe apontaria para ninguém;
 * - 'equipe_vazia': esvaziar a equipe tiraria o projeto da lista de todo mundo que não
 *   é administrador, sem nenhuma tela capaz de desfazer isso;
 * - 'nada_para_atualizar': corpo sem adicionar nem remover.
 *
 * `nao_encontrados` volta sempre vazio: em demonstração toda conta @apsis.com.br é
 * tratada como já cadastrada. Em produção ele traz quem ainda não fez o primeiro login.
 */
export async function demoAtualizarEquipe(projetoId, dados = {}) {
  await esperar();
  acharProjeto(projetoId);

  const normalizar = (lista) =>
    (Array.isArray(lista) ? lista : []).map((e) => String(e).trim().toLowerCase()).filter(Boolean);

  const adicionar = normalizar(dados.adicionar);
  const remover = normalizar(dados.remover);
  if (!adicionar.length && !remover.length) throw new ErroDemo('nada_para_atualizar');

  if (adicionar.some((email) => !email.endsWith('@apsis.com.br'))) {
    throw new ErroDemo('colaborador_externo');
  }

  const atual = equipesBd()[projetoId] || [];
  const restantes = atual.filter((pessoa) => !remover.includes(pessoa.email));
  const jaTem = new Set(restantes.map((pessoa) => pessoa.email));
  const novos = adicionar
    .filter((email) => !jaTem.has(email))
    .map((email) => ({
      id: novoId(),
      email,
      // Em produção o nome vem de carbon_usuarios. Aqui é derivado do próprio e-mail,
      // para nenhum nome de pessoa ficar escrito no código (regra 7 do CLAUDE.md).
      nome: email.split('@')[0].replace(/\./g, ' '),
    }));

  const nova = [...restantes, ...novos];
  if (!nova.length) throw new ErroDemo('equipe_vazia');

  equipesBd()[projetoId] = nova;
  return { equipe: equipeDoProjeto(projetoId), nao_encontrados: [] };
}

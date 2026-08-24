/**
 * demo/documentos.js - dataset de demonstração da tela de Documentos (issue #6).
 *
 * POR QUE EXISTE: o projeto Supabase do Apsis Carbon ainda NÃO foi provisionado, e a
 * tela precisa ser revisável localmente antes disso. Em MODO_DEMO (ver
 * src/lib/runtimeConfig.js: exige dev E o clique no botao de demonstracao) as funções de
 * src/lib/api/documentos.js não fazem rede: operam sobre o estado em memória deste
 * arquivo, e as mutações ALTERAM esse estado, para a tela ser de fato interativa.
 *
 * ESCOPO: isto não é cache nem persistência. Recarregar a página volta ao estado
 * inicial. Vale SOMENTE em desenvolvimento: em build de produção MODO_DEMO é false por
 * força (import.meta.env.DEV é estático) e o bundler elimina os ramos que chamam este
 * módulo.
 *
 * AS REGRAS SÃO AS MESMAS DO SQL, DE PROPÓSITO. Três delas não podem divergir da
 * migration 20260814090000_documentos.sql, senão a revisão mostra um comportamento que
 * a produção nunca produz:
 *   1. versão vigente = documento que nenhum outro substitui (a listagem esconde as
 *      substituídas por padrão);
 *   2. família = corrente de substitui_id percorrida para os dois lados, ordenada por
 *      versão;
 *   3. versão nova = versão do antecessor + 1, herdando projeto e tipo, exigindo
 *      arquivo próprio.
 *
 * LGPD: todo o conteúdo abaixo é fictício e obviamente fictício. Nenhum dado de cliente
 * real, nenhum nome de pessoa, nenhum endereço verdadeiro (o domínio `exemplo.invalid`
 * é reservado justamente para isso e nunca resolve).
 */

/* ===== Erro tipado ========================================================
   O demo precisa recusar entrada inválida com os MESMOS códigos do backend, senão a
   tela trataria erro de validação de um jeito no demo e de outro em produção. Não
   lançamos ErroApi aqui de propósito: quem converte é o chamarDemo de
   src/lib/api/base.js (importar ErroApi no dataset criaria ciclo entre o módulo de
   dados e o de transporte).                                                  */
export class ErroDemoDocumentos extends Error {
  constructor(codigo) {
    super(`Recusado pelo modo demonstração: ${codigo}`);
    this.name = 'ErroDemoDocumentos';
    this.codigo = codigo;
  }
}

/* ===== Domínio (espelha os CHECK da migration) ============================ */

export const TIPOS_DOCUMENTO = [
  'pdd',
  'relatorio_monitoramento',
  'inventario',
  'geoespacial',
  'planilha',
  'contrato',
  'ata',
  'foto',
  'declaracao',
  'laudo',
  'outro',
];

export const ORIGENS_DOCUMENTO = ['interna', 'parceiro', 'orgao', 'validadora'];

/* Espelha carbon_documento_vinculos_tipo_alvo_chk. */
const TIPO_ALVO_RE = /^[a-z][a-z0-9_]{2,49}$/;

const LIMITE_VERSAO = 999;
const LIMITE_PAGINA_PADRAO = 50;
const LIMITE_PAGINA_MAXIMO = 200;

/* ===== Utilitários ======================================================== */

/** Espera curta para que os estados de carregamento da tela apareçam no demo. */
const esperar = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

const agora = () => new Date().toISOString();

function novoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback só para ambiente sem crypto.randomUUID (não ocorre nos navegadores alvo).
  return `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
}

function texto(valor) {
  if (valor === null || valor === undefined) return null;
  const limpo = String(valor).trim();
  return limpo === '' ? null : limpo;
}

/** Mesma regra de lerUrlExterna na Edge Function: só http e https. */
function validarUrl(valor) {
  const bruto = texto(valor);
  if (bruto === null) return null;
  let url;
  try {
    url = new URL(bruto);
  } catch {
    throw new ErroDemoDocumentos('url_invalida');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ErroDemoDocumentos('url_invalida');
  }
  return bruto;
}

/** Mesma regra de lerCaminhoStorage: relativo, sem '..'. */
function validarCaminho(valor) {
  const bruto = texto(valor);
  if (bruto === null) return null;
  if (bruto.startsWith('/') || bruto.includes('..')) {
    throw new ErroDemoDocumentos('caminho_invalido');
  }
  return bruto;
}

/** Normalização idêntica à da trigger carbon_documentos_before_write. */
function normalizarFormato(valor) {
  const bruto = texto(valor);
  if (bruto === null) return null;
  const limpo = bruto.toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '').trim();
  return limpo === '' ? null : limpo;
}

function validarTipo(valor) {
  const bruto = texto(valor);
  if (bruto === null) return null;
  if (!TIPOS_DOCUMENTO.includes(bruto)) throw new ErroDemoDocumentos('tipo_invalido');
  return bruto;
}

function validarOrigem(valor) {
  const bruto = texto(valor);
  if (bruto === null) return null;
  if (!ORIGENS_DOCUMENTO.includes(bruto)) throw new ErroDemoDocumentos('origem_invalida');
  return bruto;
}

function validarVersao(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(String(valor).replace(',', '.'));
  if (!Number.isInteger(n) || n < 1 || n > LIMITE_VERSAO) {
    throw new ErroDemoDocumentos('versao_invalida');
  }
  return n;
}

function validarTamanho(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) throw new ErroDemoDocumentos('campo_invalido');
  return Math.round(n);
}

function validarTipoAlvo(valor) {
  const bruto = texto(valor);
  if (bruto === null) throw new ErroDemoDocumentos('campo_obrigatorio');
  const limpo = bruto.toLowerCase();
  if (!TIPO_ALVO_RE.test(limpo)) throw new ErroDemoDocumentos('tipo_alvo_invalido');
  return limpo;
}

/* ===== Estado em memória ==================================================
   O projeto é o MESMO id do projeto de demonstração de src/lib/demoProjetos.js. Isso é
   deliberado: a tela resolve o nome do projeto pela lista que vem de
   src/lib/api/projetos.js, então um id diferente faria a coluna "Projeto" aparecer
   vazia justamente no modo que existe para revisar a tela. O valor é repetido aqui em
   vez de importado para os dois datasets não ficarem acoplados.                */

const PROJETO_DEMO_ID = '00000000-0000-4000-8000-000000000001';

/** Alvos fictícios de vínculo. Os domínios de destino (checklist de evidências, issue
 *  #4, e findings, #5) ainda não existem, então estes ids não resolvem em lugar nenhum
 *  e a tela mostra o vínculo como técnico, sem inventar um nome de item. */
const ALVO_EVIDENCIA_AREA = '00000000-0000-4000-8000-0000000000e1';
const ALVO_EVIDENCIA_INICIO = '00000000-0000-4000-8000-0000000000e2';
const ALVO_EVIDENCIA_ERR = '00000000-0000-4000-8000-0000000000e3';
const ALVO_FINDING_GOVERNANCA = '00000000-0000-4000-8000-0000000000f1';

const D = {
  pdd1: '00000000-0000-4000-8000-000000000101',
  pdd2: '00000000-0000-4000-8000-000000000102',
  pdd3: '00000000-0000-4000-8000-000000000103',
  monitoramento: '00000000-0000-4000-8000-000000000104',
  inventario: '00000000-0000-4000-8000-000000000105',
  kml: '00000000-0000-4000-8000-000000000106',
  err: '00000000-0000-4000-8000-000000000107',
  ata: '00000000-0000-4000-8000-000000000108',
  declaracao: '00000000-0000-4000-8000-000000000109',
  modeloContrato: '00000000-0000-4000-8000-000000000110',
  sop: '00000000-0000-4000-8000-000000000111',
};

/**
 * Modelo de uma linha de carbon_documentos. Escrito por função para nenhum registro
 * esquecer uma coluna e a tela receber `undefined` onde a produção manda `null`.
 */
function doc(campos) {
  return {
    id: campos.id,
    projeto_id: campos.projeto_id ?? null,
    titulo: campos.titulo,
    tipo: campos.tipo ?? 'outro',
    versao: campos.versao ?? 1,
    descricao: campos.descricao ?? null,
    origem: campos.origem ?? 'interna',
    url_externa: campos.url_externa ?? null,
    caminho_storage: campos.caminho_storage ?? null,
    tamanho_bytes: campos.tamanho_bytes ?? null,
    formato: campos.formato ?? null,
    data_documento: campos.data_documento ?? null,
    substitui_id: campos.substitui_id ?? null,
    enviado_por: campos.enviado_por ?? null,
    criado_em: campos.criado_em,
    atualizado_em: campos.atualizado_em ?? campos.criado_em,
  };
}

/* O estado nasce VAZIO e é semeado na PRIMEIRA chamada. Isso não é estilo: é o que
   mantém o dataset fictício FORA do bundle de produção.

   Medido neste projeto: com as listas escritas como `const` de topo de módulo, o Rollup
   elimina as funções demo* (o `if (MODO_DEMO)` dobra para false) mas NÃO as listas - ele
   não consegue provar que uma sequência de chamadas de `doc(...)` no topo do módulo é
   livre de efeito colateral, e os onze registros iam inteiros para o bundle. É a mesma
   armadilha anotada em src/lib/demoProjetos.js, e a saída registrada lá é exatamente
   esta: tornar a lista lazy, e não anotar pureza (anotação foi testada lá e não surtiu
   efeito). Dentro de uma função, o corpo só sobrevive se a função for alcançável, e a
   única coisa que alcança semear() são as funções demo*.                        */

let documentos = [];
let vinculos = [];
let semeado = false;

function documentosIniciais() {
  return [
    /* Família de PDD com três rodadas: é o caso que a issue descreve (o Notion só tem
       data de upload, e o PDD passa por várias rodadas com a validadora). Só a versão 3
       aparece na listagem padrão. */
    doc({
      id: D.pdd1,
      projeto_id: PROJETO_DEMO_ID,
      titulo: 'PDD - Projeto Demonstração',
      tipo: 'pdd',
      versao: 1,
      descricao: 'Primeira versão submetida à validadora.',
      origem: 'interna',
      url_externa: 'https://exemplo.invalid/documentos/pdd-v1.pdf',
      tamanho_bytes: 4_812_000,
      formato: 'pdf',
      data_documento: '2025-05-12',
      criado_em: '2025-05-12T13:00:00.000Z',
    }),
    doc({
      id: D.pdd2,
      projeto_id: PROJETO_DEMO_ID,
      titulo: 'PDD - Projeto Demonstração',
      tipo: 'pdd',
      versao: 2,
      descricao: 'Segunda rodada, com os apontamentos da validadora respondidos.',
      origem: 'interna',
      url_externa: 'https://exemplo.invalid/documentos/pdd-v2.pdf',
      tamanho_bytes: 5_104_000,
      formato: 'pdf',
      data_documento: '2025-09-30',
      substitui_id: D.pdd1,
      criado_em: '2025-09-30T17:20:00.000Z',
    }),
    doc({
      id: D.pdd3,
      projeto_id: PROJETO_DEMO_ID,
      titulo: 'PDD - Projeto Demonstração',
      tipo: 'pdd',
      versao: 3,
      descricao: 'Versão vigente, em análise pela validadora.',
      origem: 'interna',
      url_externa: 'https://exemplo.invalid/documentos/pdd-v3.pdf',
      tamanho_bytes: 5_298_000,
      formato: 'pdf',
      data_documento: '2026-02-18',
      substitui_id: D.pdd2,
      criado_em: '2026-02-18T11:05:00.000Z',
    }),

    doc({
      id: D.monitoramento,
      projeto_id: PROJETO_DEMO_ID,
      titulo: 'Relatório de monitoramento - período de exemplo',
      tipo: 'relatorio_monitoramento',
      versao: 1,
      descricao: 'Em redação por capítulo. Ainda não enviado à verificadora.',
      origem: 'interna',
      url_externa: 'https://exemplo.invalid/documentos/monitoramento.docx',
      tamanho_bytes: 2_140_000,
      formato: 'docx',
      data_documento: '2026-04-02',
      criado_em: '2026-04-02T14:30:00.000Z',
    }),
    doc({
      id: D.inventario,
      projeto_id: PROJETO_DEMO_ID,
      titulo: 'Inventário de flora - parcelas de exemplo',
      tipo: 'inventario',
      versao: 1,
      descricao: 'Planilha de campo consolidada, com centroides das parcelas.',
      origem: 'parceiro',
      url_externa: 'https://exemplo.invalid/documentos/inventario-flora.xlsx',
      tamanho_bytes: 1_320_000,
      formato: 'xlsx',
      data_documento: '2026-01-20',
      criado_em: '2026-01-22T09:10:00.000Z',
    }),
    doc({
      id: D.kml,
      projeto_id: PROJETO_DEMO_ID,
      titulo: 'KML da área do projeto e da zona do padrão',
      tipo: 'geoespacial',
      versao: 1,
      descricao: 'Limite usado no cálculo de área. Satisfaz mais de um item de evidência.',
      origem: 'parceiro',
      url_externa: 'https://exemplo.invalid/documentos/area-projeto.kml',
      tamanho_bytes: 86_000,
      formato: 'kml',
      data_documento: '2025-11-08',
      criado_em: '2025-11-08T16:45:00.000Z',
    }),
    doc({
      id: D.err,
      projeto_id: PROJETO_DEMO_ID,
      titulo: 'Planilha de cálculo de reduções e remoções (exemplo)',
      tipo: 'planilha',
      versao: 1,
      origem: 'interna',
      url_externa: 'https://exemplo.invalid/documentos/calculo-err.xlsx',
      tamanho_bytes: 3_680_000,
      formato: 'xlsx',
      data_documento: '2026-02-10',
      criado_em: '2026-02-10T10:00:00.000Z',
    }),
    doc({
      id: D.ata,
      projeto_id: PROJETO_DEMO_ID,
      titulo: 'Ata de reunião de consulta (exemplo)',
      tipo: 'ata',
      versao: 1,
      descricao: 'Registro de reunião de consulta usado como evidência de consulta prévia.',
      origem: 'parceiro',
      url_externa: 'https://exemplo.invalid/documentos/ata-consulta.pdf',
      tamanho_bytes: 540_000,
      formato: 'pdf',
      data_documento: '2025-08-14',
      criado_em: '2025-08-15T12:00:00.000Z',
    }),
    doc({
      id: D.declaracao,
      projeto_id: PROJETO_DEMO_ID,
      titulo: 'Declaração de não dupla contagem (exemplo)',
      tipo: 'declaracao',
      versao: 1,
      origem: 'interna',
      url_externa: 'https://exemplo.invalid/documentos/declaracao-dupla-contagem.pdf',
      tamanho_bytes: 190_000,
      formato: 'pdf',
      data_documento: '2025-12-01',
      criado_em: '2025-12-01T08:30:00.000Z',
    }),

    /* Documentos INSTITUCIONAIS: projeto_id nulo. Existem no dataset para o recorte
       "sem projeto" da tela não nascer vazio, e para deixar visível que a coluna é
       anulável de propósito. */
    doc({
      id: D.modeloContrato,
      projeto_id: null,
      titulo: 'Modelo de contrato de prestação de serviços (fictício)',
      tipo: 'contrato',
      versao: 2,
      descricao: 'Modelo institucional. Não pertence a projeto nenhum.',
      origem: 'interna',
      url_externa: 'https://exemplo.invalid/institucional/modelo-contrato.docx',
      tamanho_bytes: 210_000,
      formato: 'docx',
      data_documento: '2026-03-05',
      criado_em: '2026-03-05T15:00:00.000Z',
    }),
    doc({
      id: D.sop,
      projeto_id: null,
      titulo: 'SOP de medições de biomassa (exemplo)',
      tipo: 'outro',
      versao: 1,
      descricao: 'Procedimento operacional padrão, reaproveitado por todos os projetos.',
      origem: 'interna',
      url_externa: 'https://exemplo.invalid/institucional/sop-biomassa.pdf',
      tamanho_bytes: 760_000,
      formato: 'pdf',
      data_documento: '2025-07-01',
      criado_em: '2025-07-01T13:45:00.000Z',
    }),
  ];
}

function vinculosIniciais() {
  return [
    {
      id: '00000000-0000-4000-8000-000000000201',
      documento_id: D.kml,
      tipo_alvo: 'evidencia',
      alvo_id: ALVO_EVIDENCIA_AREA,
      observacao: 'Arquivo geoespacial exigido pelo item de área do projeto.',
      criado_por: null,
      criado_em: '2025-11-08T16:50:00.000Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000202',
      documento_id: D.kml,
      tipo_alvo: 'finding',
      alvo_id: ALVO_FINDING_GOVERNANCA,
      observacao: 'Mesmo arquivo responde a um apontamento de auditoria.',
      criado_por: null,
      criado_em: '2026-01-15T10:20:00.000Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000203',
      documento_id: D.err,
      tipo_alvo: 'evidencia',
      alvo_id: ALVO_EVIDENCIA_ERR,
      observacao: 'Planilha de cálculo pedida no item de período de creditação.',
      criado_por: null,
      criado_em: '2026-02-10T10:05:00.000Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000204',
      documento_id: D.ata,
      tipo_alvo: 'evidencia',
      alvo_id: ALVO_EVIDENCIA_INICIO,
      observacao: 'Ata usada como evidência da data de início.',
      criado_por: null,
      criado_em: '2025-08-15T12:10:00.000Z',
    },
  ];
}

/** Semeia na primeira chamada. Toda função exportada começa por aqui. */
function semear() {
  if (semeado) return;
  semeado = true;
  documentos = documentosIniciais();
  vinculos = vinculosIniciais();
}

/* ===== Regras derivadas (as MESMAS do SQL) ================================ */

/**
 * Sucessor de um documento, ou null quando ele é a versão vigente.
 * Equivale a public.carbon_documento_substituido_por.
 */
function substituidoPor(id) {
  const sucessor = documentos.find((d) => d.substitui_id === id);
  return sucessor ? sucessor.id : null;
}

/** Documento no formato que a Edge Function devolve (colunas + derivados). */
function serializar(documento) {
  const sucessor = substituidoPor(documento.id);
  return { ...documento, substituido_por_id: sucessor, substituido: sucessor !== null };
}

/**
 * Família de versões, subindo pelos antecessores e descendo pelos sucessores a partir
 * de QUALQUER membro. Equivale a public.carbon_documento_familia, inclusive na
 * proteção contra corrente em ciclo (o Set faz o papel do UNION do SQL).
 */
function familiaDe(id) {
  const porId = new Map(documentos.map((d) => [d.id, d]));
  const vistos = new Set();
  const inicial = porId.get(id);
  if (!inicial) return [];

  // Antecessores.
  let atual = inicial;
  while (atual && !vistos.has(atual.id)) {
    vistos.add(atual.id);
    atual = atual.substitui_id ? porId.get(atual.substitui_id) : null;
  }

  // Sucessores.
  atual = inicial;
  while (atual) {
    const proximoId = substituidoPor(atual.id);
    if (!proximoId || vistos.has(proximoId)) break;
    vistos.add(proximoId);
    atual = porId.get(proximoId);
  }

  return [...vistos]
    .map((membroId) => porId.get(membroId))
    .filter(Boolean)
    .map(serializar)
    .sort((a, b) => a.versao - b.versao || String(a.criado_em).localeCompare(String(b.criado_em)));
}

function acharDocumento(id) {
  const documento = documentos.find((d) => d.id === id);
  if (!documento) throw new ErroDemoDocumentos('nao_encontrado');
  return documento;
}

/** Mesma checagem de exigirLocalDoArquivo na Edge Function. */
function exigirLocal(url, caminho) {
  if (url === null && caminho === null) throw new ErroDemoDocumentos('local_obrigatorio');
}

/* ===== Funções que imitam o backend ======================================= */

/**
 * Lista documentos com os mesmos filtros, a mesma ordem e a mesma paginação da função
 * SQL carbon_documentos_listar: versões substituídas fora por padrão, `total` contado
 * ANTES da paginação e ordem por criado_em decrescente com o id no desempate.
 *
 * A busca compara substring simples, o que é exatamente o comportamento do SQL: lá o
 * `%` e o `_` digitados no campo são escapados justamente para serem literais.
 */
export async function demoListarDocumentos(filtros = {}) {
  semear();
  await esperar();

  const tipo = validarTipo(filtros.tipo);
  const origem = validarOrigem(filtros.origem);
  const projetoId = texto(filtros.projetoId);
  const soInstitucional = filtros.escopo === 'institucional';
  const incluirSubstituidos = filtros.incluirSubstituidos === true;
  const busca = texto(filtros.busca)?.toLowerCase() ?? null;
  const alvoTipo = filtros.alvoTipo ? validarTipoAlvo(filtros.alvoTipo) : null;
  const alvoId = texto(filtros.alvoId);

  const limiteBruto = Number(filtros.limite);
  const limite = Number.isFinite(limiteBruto) && limiteBruto >= 1
    ? Math.min(Math.floor(limiteBruto), LIMITE_PAGINA_MAXIMO)
    : LIMITE_PAGINA_PADRAO;
  const paginaBruta = Number(filtros.pagina);
  const pagina = Number.isFinite(paginaBruta) && paginaBruta >= 1 ? Math.floor(paginaBruta) : 1;
  const deslocamento = (pagina - 1) * limite;

  const filtrados = documentos
    .filter((d) => (projetoId === null || d.projeto_id === projetoId))
    .filter((d) => (!soInstitucional || d.projeto_id === null))
    .filter((d) => (tipo === null || d.tipo === tipo))
    .filter((d) => (origem === null || d.origem === origem))
    .filter((d) => {
      if (busca === null) return true;
      const alvo = `${d.titulo} ${d.descricao ?? ''}`.toLowerCase();
      return alvo.includes(busca);
    })
    .filter((d) => {
      if (alvoId === null) return true;
      return vinculos.some(
        (v) =>
          v.documento_id === d.id &&
          v.alvo_id === alvoId &&
          (alvoTipo === null || v.tipo_alvo === alvoTipo),
      );
    })
    .filter((d) => incluirSubstituidos || substituidoPor(d.id) === null)
    .sort(
      (a, b) =>
        String(b.criado_em).localeCompare(String(a.criado_em)) || a.id.localeCompare(b.id),
    );

  return {
    documentos: filtrados.slice(deslocamento, deslocamento + limite).map(serializar),
    total: filtrados.length,
    pagina,
    limite,
  };
}

export async function demoObterDocumento(id) {
  semear();
  await esperar();
  const documento = acharDocumento(id);
  return {
    documento: serializar(documento),
    familia: familiaDe(id),
    vinculos: vinculos
      .filter((v) => v.documento_id === id)
      .map((v) => ({ ...v }))
      .sort(
        (a, b) =>
          a.tipo_alvo.localeCompare(b.tipo_alvo) ||
          String(a.criado_em).localeCompare(String(b.criado_em)),
      ),
  };
}

export async function demoCriarDocumento(dados = {}) {
  semear();
  await esperar();

  const titulo = texto(dados.titulo);
  if (!titulo) throw new ErroDemoDocumentos('campo_obrigatorio');

  const url = validarUrl(dados.url_externa);
  const caminho = validarCaminho(dados.caminho_storage);
  exigirLocal(url, caminho);

  const criadoEm = agora();
  const documento = doc({
    id: novoId(),
    projeto_id: texto(dados.projeto_id),
    titulo,
    tipo: validarTipo(dados.tipo) ?? 'outro',
    versao: validarVersao(dados.versao) ?? 1,
    descricao: texto(dados.descricao),
    origem: validarOrigem(dados.origem) ?? 'interna',
    url_externa: url,
    caminho_storage: caminho,
    tamanho_bytes: validarTamanho(dados.tamanho_bytes),
    formato: normalizarFormato(dados.formato),
    data_documento: texto(dados.data_documento),
    criado_em: criadoEm,
  });

  documentos = [...documentos, documento];
  return { documento: serializar(documento) };
}

export async function demoAtualizarDocumento(id, dados = {}) {
  semear();
  await esperar();
  const documento = acharDocumento(id);

  const alterado = { ...documento };

  if (dados.titulo !== undefined) {
    const titulo = texto(dados.titulo);
    if (!titulo) throw new ErroDemoDocumentos('campo_obrigatorio');
    alterado.titulo = titulo;
  }
  if (dados.projeto_id !== undefined) alterado.projeto_id = texto(dados.projeto_id);
  if (dados.tipo !== undefined) alterado.tipo = validarTipo(dados.tipo) ?? documento.tipo;
  if (dados.origem !== undefined) alterado.origem = validarOrigem(dados.origem) ?? documento.origem;
  if (dados.descricao !== undefined) alterado.descricao = texto(dados.descricao);
  if (dados.url_externa !== undefined) alterado.url_externa = validarUrl(dados.url_externa);
  if (dados.caminho_storage !== undefined) {
    alterado.caminho_storage = validarCaminho(dados.caminho_storage);
  }
  if (dados.tamanho_bytes !== undefined) alterado.tamanho_bytes = validarTamanho(dados.tamanho_bytes);
  if (dados.formato !== undefined) alterado.formato = normalizarFormato(dados.formato);
  if (dados.data_documento !== undefined) alterado.data_documento = texto(dados.data_documento);

  exigirLocal(alterado.url_externa, alterado.caminho_storage);

  /* Mesma regra da trigger: a família inteira vive no mesmo projeto. Mover para outro
     projeto um documento que faz parte de uma corrente levaria o histórico embora. */
  const emFamilia = documento.substitui_id !== null || substituidoPor(documento.id) !== null;
  if (emFamilia && alterado.projeto_id !== documento.projeto_id) {
    throw new ErroDemoDocumentos('familia_de_outro_projeto');
  }

  alterado.atualizado_em = agora();
  Object.assign(documento, alterado);
  return { documento: serializar(documento) };
}

/**
 * Nova versão da família. Mesmas heranças da rota POST /documentos/:id/versoes:
 * projeto e tipo herdados e não sobrescrevíveis; título, origem e formato herdados mas
 * sobrescrevíveis; descrição, data e tamanho pertencem à rodada nova; arquivo próprio
 * obrigatório.
 */
export async function demoCriarVersaoDocumento(id, dados = {}) {
  semear();
  await esperar();
  const anterior = acharDocumento(id);

  if (substituidoPor(id) !== null) throw new ErroDemoDocumentos('documento_ja_substituido');

  const url = validarUrl(dados.url_externa);
  const caminho = validarCaminho(dados.caminho_storage);
  exigirLocal(url, caminho);

  const titulo = dados.titulo === undefined ? anterior.titulo : texto(dados.titulo);
  if (!titulo) throw new ErroDemoDocumentos('campo_obrigatorio');

  const documento = doc({
    id: novoId(),
    projeto_id: anterior.projeto_id,
    titulo,
    tipo: anterior.tipo,
    versao: Number(anterior.versao) + 1,
    descricao: texto(dados.descricao),
    origem: validarOrigem(dados.origem) ?? anterior.origem,
    url_externa: url,
    caminho_storage: caminho,
    tamanho_bytes: validarTamanho(dados.tamanho_bytes),
    formato: dados.formato === undefined ? anterior.formato : normalizarFormato(dados.formato),
    data_documento: texto(dados.data_documento),
    substitui_id: anterior.id,
    criado_em: agora(),
  });

  documentos = [...documentos, documento];
  return { documento: serializar(documento), familia: familiaDe(documento.id) };
}

export async function demoCriarVinculoDocumento(documentoId, dados = {}) {
  semear();
  await esperar();
  acharDocumento(documentoId);

  const tipoAlvo = validarTipoAlvo(dados.tipo_alvo);
  const alvoId = texto(dados.alvo_id);
  if (!alvoId) throw new ErroDemoDocumentos('campo_obrigatorio');

  const jaExiste = vinculos.some(
    (v) => v.documento_id === documentoId && v.tipo_alvo === tipoAlvo && v.alvo_id === alvoId,
  );
  if (jaExiste) throw new ErroDemoDocumentos('registro_duplicado');

  const vinculo = {
    id: novoId(),
    documento_id: documentoId,
    tipo_alvo: tipoAlvo,
    alvo_id: alvoId,
    observacao: texto(dados.observacao),
    criado_por: null,
    criado_em: agora(),
  };

  vinculos = [...vinculos, vinculo];
  return { vinculo };
}

export async function demoRemoverVinculoDocumento(vinculoId) {
  semear();
  await esperar();
  const vinculo = vinculos.find((v) => v.id === vinculoId);
  if (!vinculo) throw new ErroDemoDocumentos('nao_encontrado');
  vinculos = vinculos.filter((v) => v.id !== vinculoId);
  return { removido: true, vinculo: { id: vinculo.id, documento_id: vinculo.documento_id } };
}

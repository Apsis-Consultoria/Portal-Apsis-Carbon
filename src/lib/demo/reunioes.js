/**
 * demo/reunioes.js - dataset de demonstracao das telas de Reunioes e de Ata (issue #9).
 *
 * POR QUE EXISTE: o projeto Supabase do Apsis Carbon ainda NAO foi provisionado, e as
 * telas precisam ser revisaveis antes disso. Em MODO_DEMO (ver src/lib/runtimeConfig.js:
 * exige dev E o clique no botao de demonstracao) as funcoes de src/lib/api/reunioes.js nao fazem
 * rede: operam sobre o estado em memoria deste arquivo, e as mutacoes ALTERAM esse
 * estado, para a tela ser de fato interativa.
 *
 * ESCOPO: nao e cache nem persistencia. Recarregar a pagina volta ao estado inicial.
 * Vale SOMENTE em desenvolvimento: em build de producao MODO_DEMO e false por forca
 * (import.meta.env.DEV e estatico) e o bundler elimina os ramos que chamam este modulo.
 *
 * FIDELIDADE AO BANCO - por que este arquivo e chato de proposito:
 * cada regra de calculo abaixo tem uma contraparte na migration
 * supabase/migrations/20260814096000_reunioes.sql, e as duas TEM de concordar, senao a
 * revisao do dono mostra numero que a producao nunca produz. As regras espelhadas sao:
 *
 *   1. pendencia ABERTA e a que tem concluida = false            (carbon_reunioes_listar)
 *   2. resumo do painel calculado sobre o conjunto FILTRADO, nao sobre a pagina  (idem)
 *   3. ordem da listagem: data desc, criado_em desc                              (idem)
 *   4. proxima_data = menor data >= hoje; ultima_data = maior data < hoje         (idem)
 *   5. ordem das pendencias: abertas primeiro, prazo mais curto, criado_em
 *                                                            (carbon_reuniao_detalhe)
 *   6. serie semanal: intervalo de 7 dias, no maximo 26 de uma vez, data que ja tem
 *      reuniao equivalente (mesmo projeto, tipo e parceiro) e PULADA e contada em
 *      ignoradas, e a serie inteira compartilha recorrencia_id
 *                                                        (carbon_reunioes_gerar_serie)
 *   7. aprovada_em e concluida_em sao DERIVADAS: preenchem na transicao, limpam na
 *      volta e sao PRESERVADAS quando o estado nao muda    (triggers before_write)
 *   8. parceiro e obrigatorio quando tipo = semanal_parceiro
 *                                              (carbon_reunioes_parceiro_exigido_chk)
 *
 * LGPD: tudo abaixo e ficticio e obviamente ficticio. Nenhum nome de pessoa, nenhuma
 * organizacao real, nenhum projeto de cliente. Onde a producao mostraria o nome de
 * exibicao de um colaborador (carbon_usuarios.nome, vindo do Azure AD), o demo usa
 * ROTULO DE PAPEL ("Equipe de Consultoria"), que e exatamente a recomendacao do
 * levantamento: usar papeis, nunca nomes.
 */

/* ===== Erro tipado ========================================================
   O demo precisa recusar entrada invalida com os MESMOS codigos do backend, senao a
   tela trataria erro de validacao de um jeito no demo e de outro em producao. Nao
   lancamos ErroApi aqui de proposito: quem converte e o chamarDemo de
   src/lib/api/base.js, e importar ErroApi no dataset criaria ciclo entre o modulo de
   dados e o de transporte. Classe propria (e nao a de demoProjetos.js) para este
   dominio nao arrastar o dataset de projetos para o mesmo pedaco do bundle.       */
export class ErroDemo extends Error {
  constructor(codigo) {
    super(`Recusado pelo modo demonstracao: ${codigo}`);
    this.name = 'ErroDemo';
    this.codigo = codigo;
  }
}

/* ===== Vocabulario (espelha os CHECK do banco) ============================ */

const TIPOS_VALIDOS = [
  'semanal',
  'semanal_parceiro',
  'tematica',
  'governanca',
  'consulta_comunidade',
];

const TIPOS_RECORRENTES = ['semanal', 'semanal_parceiro'];

const INTERVALO_DIAS = 7;
const QUANTIDADE_MAXIMA_SERIE = 26;
const LIMITE_PAGINA_PADRAO = 50;
const LIMITE_PAGINA_MAXIMO = 200;

/* ===== Utilitarios ======================================================== */

/** Espera curta para os estados de carregamento das telas aparecerem no demo. */
const esperar = (ms = 240) => new Promise((resolve) => setTimeout(resolve, ms));

const agora = () => new Date().toISOString();

function novoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback so para ambiente sem crypto.randomUUID (nao ocorre nos navegadores alvo).
  return `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Soma dias a uma data 'AAAA-MM-DD' em UTC, e devolve no mesmo formato.
 *
 * Aritmetica em UTC de proposito: somar 7 dias com new Date local atravessa horario de
 * verao em alguns fusos e devolve o dia anterior. A coluna do banco e `date`, sem hora,
 * e a serie semanal precisa cair exatamente no mesmo dia da semana.
 */
function somarDias(iso, dias) {
  const partes = String(iso).split('-').map(Number);
  const base = Date.UTC(partes[0], partes[1] - 1, partes[2]);
  return new Date(base + dias * 86400000).toISOString().slice(0, 10);
}

/**
 * Hoje em 'AAAA-MM-DD'.
 *
 * DIVERGENCIA CONHECIDA E ACEITA: no banco o recorte usa current_date, que e a data do
 * SERVIDOR (UTC no Supabase); aqui e a data do navegador. Na virada do dia os dois
 * podem discordar por algumas horas em "proxima reuniao". E resumo de painel, nao
 * calculo de laudo.
 */
function hojeIso() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Segunda-feira da semana corrente, base da cadencia semanal ficticia. */
function segundaDestaSemana() {
  const hoje = hojeIso();
  const partes = hoje.split('-').map(Number);
  // getUTCDay: 0 = domingo. Recuar para a segunda anterior (domingo recua 6).
  const diaSemana = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2])).getUTCDay();
  const recuo = diaSemana === 0 ? 6 : diaSemana - 1;
  return somarDias(hoje, -recuo);
}

function texto(valor) {
  if (valor === null || valor === undefined) return null;
  const limpo = String(valor).trim();
  return limpo === '' ? null : limpo;
}

/* ===== Referencias ficticias ==============================================
   O id do projeto e o MESMO usado por src/lib/demoProjetos.js, para o filtro por
   projeto da tela de Reunioes mostrar um projeto que existe na tela de Projetos. Se
   aquele arquivo mudar o id, aqui o filtro simplesmente deixa de casar - nada quebra.
   Em producao o nome do projeto vem de carbon_projetos.nome, resolvido pela funcao SQL
   carbon_reuniao_detalhe.                                                        */
const PROJETO_DEMO_ID = '00000000-0000-4000-8000-000000000001';
const PROJETOS_DEMO = {
  [PROJETO_DEMO_ID]: 'Projeto Demonstração - Vale do Exemplo',
};

/* Onde a producao traria carbon_usuarios.nome (nome de exibicao do Azure AD), o demo
   usa rotulo de PAPEL: o levantamento pede explicitamente papeis em vez de nomes. */
const USUARIO_CONSULTORIA = '00000000-0000-4000-8000-0000000000c1';
const USUARIO_PROJETOS = '00000000-0000-4000-8000-0000000000c2';
const USUARIOS_DEMO = {
  [USUARIO_CONSULTORIA]: 'Equipe de Consultoria (fictício)',
  [USUARIO_PROJETOS]: 'Equipe de Projetos (fictício)',
};

const PARCEIRO_ALFA = 'Organização Parceira Alfa (fictícia)';
const PARCEIRO_BETA = 'Organização Parceira Beta (fictícia)';

/* ===== Estado em memoria ==================================================
   Tres colecoes, como as tres tabelas. Nao guardamos criado_por: no demo nao existe
   colaborador autenticado.

   NOTA DE BUNDLE (medida, nao suposta): o dataset nasce DENTRO de funcoes e e criado
   na primeira operacao, e nao em literal no topo do modulo. Com MODO_DEMO dobrado
   para false o Rollup elimina tudo que so e alcancavel pelas funcoes demo*, MAS nao
   elimina valor montado no topo do modulo por CHAMADA de funcao - ele nao consegue
   provar que a chamada e livre de efeito colateral. Foi o que aconteceu em
   src/lib/demoProjetos.js, onde a lista de capitulos sobrevive ao build. Escrito
   desta forma, verifiquei que nenhum texto ficticio deste dominio (os nomes das
   organizacoes parceiras, o conteudo das atas) chega ao bundle de producao.       */

let reunioes = null;
let atas = null;
let pendencias = null;

let segundaCache = null;

/** Segunda-feira base da cadencia ficticia, calculada uma vez por sessao. */
function segunda() {
  if (!segundaCache) segundaCache = segundaDestaSemana();
  return segundaCache;
}

const CRIADO_EM_DEMO = '2025-09-01T12:00:00.000Z';

/** Serie da weekly de backoffice, para a tela mostrar cadencia agrupada. */
const SERIE_WEEKLY = '00000000-0000-4000-8000-0000000000a1';
/** Serie da semanal por parceiro do projeto. */
const SERIE_PROJETO = '00000000-0000-4000-8000-0000000000a2';

function reuniaoDemo(id, campos) {
  return {
    id,
    projeto_id: null,
    tipo: 'semanal',
    titulo: 'Weekly',
    data: segunda(),
    parceiro: null,
    recorrencia_id: null,
    criado_em: CRIADO_EM_DEMO,
    atualizado_em: CRIADO_EM_DEMO,
    ...campos,
  };
}

const ID_WEEKLY_ATUAL = '00000000-0000-4000-8000-0000000000b3';
const ID_WEEKLY_ANTERIOR = '00000000-0000-4000-8000-0000000000b2';
const ID_PARCEIRO_ALFA = '00000000-0000-4000-8000-0000000000b5';
const ID_PARCEIRO_BETA = '00000000-0000-4000-8000-0000000000b6';
const ID_GOVERNANCA = '00000000-0000-4000-8000-0000000000b7';
const ID_CONSULTA = '00000000-0000-4000-8000-0000000000b8';
const ID_TEMATICA = '00000000-0000-4000-8000-0000000000b9';

function reunioesIniciais() {
  return [
    /* Cadencia semanal do backoffice: tres passadas, a desta semana e a proxima. E a
       weekly descrita no levantamento, cujo titulo no Notion e sempre "Weekly". */
    reuniaoDemo('00000000-0000-4000-8000-0000000000b1', {
      data: somarDias(segunda(), -14),
      recorrencia_id: SERIE_WEEKLY,
    }),
    reuniaoDemo(ID_WEEKLY_ANTERIOR, {
      data: somarDias(segunda(), -7),
      recorrencia_id: SERIE_WEEKLY,
    }),
    reuniaoDemo(ID_WEEKLY_ATUAL, { data: segunda(), recorrencia_id: SERIE_WEEKLY }),
    reuniaoDemo('00000000-0000-4000-8000-0000000000b4', {
      data: somarDias(segunda(), 7),
      recorrencia_id: SERIE_WEEKLY,
    }),

    /* O ACHADO DO LEVANTAMENTO, visivel na tela: a semanal do projeto se DESDOBRA POR
       PARCEIRO, e duas reunioes caem na MESMA data. Com tipo e parceiro em coluna, elas
       deixam de ser indistinguiveis (no Notion isso vivia dentro do titulo). */
    reuniaoDemo(ID_PARCEIRO_ALFA, {
      projeto_id: PROJETO_DEMO_ID,
      tipo: 'semanal_parceiro',
      titulo: 'Reunião semanal do projeto',
      data: somarDias(segunda(), -2),
      parceiro: PARCEIRO_ALFA,
      recorrencia_id: SERIE_PROJETO,
    }),
    reuniaoDemo(ID_PARCEIRO_BETA, {
      projeto_id: PROJETO_DEMO_ID,
      tipo: 'semanal_parceiro',
      titulo: 'Reunião semanal do projeto',
      data: somarDias(segunda(), -2),
      parceiro: PARCEIRO_BETA,
      recorrencia_id: SERIE_PROJETO,
    }),

    /* As duas que sao EVIDENCIA DE AUDITORIA: governanca e consulta a comunidade. */
    reuniaoDemo(ID_GOVERNANCA, {
      projeto_id: PROJETO_DEMO_ID,
      tipo: 'governanca',
      titulo: 'Reunião - modelo de governança',
      data: somarDias(segunda(), -21),
    }),
    reuniaoDemo(ID_CONSULTA, {
      projeto_id: PROJETO_DEMO_ID,
      tipo: 'consulta_comunidade',
      titulo: 'Consulta à comunidade - rodada de esclarecimentos',
      data: somarDias(segunda(), -35),
    }),

    /* Tematica sem ata, para o contador "sem ata" ter o que contar. */
    reuniaoDemo(ID_TEMATICA, {
      projeto_id: PROJETO_DEMO_ID,
      tipo: 'tematica',
      titulo: 'Reunião - perguntas frequentes do projeto',
      data: somarDias(segunda(), -9),
    }),
  ];
}

const ID_ATA_WEEKLY = '00000000-0000-4000-8000-0000000000d1';
const ID_ATA_GOVERNANCA = '00000000-0000-4000-8000-0000000000d2';
const ID_ATA_CONSULTA = '00000000-0000-4000-8000-0000000000d3';
const ID_ATA_PARCEIRO = '00000000-0000-4000-8000-0000000000d4';

function atasIniciais() {
  return [
    {
      id: ID_ATA_WEEKLY,
      reuniao_id: ID_WEEKLY_ANTERIOR,
      redigida_por: USUARIO_CONSULTORIA,
      conteudo:
        'Consultoria abriu as atividades em curso e repriorizou o backlog. Projetos apresentou o andamento dos capítulos do PDD. Ata lida em voz alta antes do encerramento.',
      pontos_atencao:
        'Duas frentes dependem do mesmo revisor na mesma semana. Apontamento de horas continua sem ferramenta, então o realizado da semana não pôde ser comparado ao planejado.',
      barreiras:
        'Retorno de documento pendente com organização parceira, sem data de resposta.',
      aprovada: true,
      aprovada_em: '2025-09-08T20:00:00.000Z',
      criado_em: CRIADO_EM_DEMO,
      atualizado_em: CRIADO_EM_DEMO,
    },
    {
      id: ID_ATA_GOVERNANCA,
      reuniao_id: ID_GOVERNANCA,
      redigida_por: USUARIO_PROJETOS,
      conteudo:
        'Revisão do modelo de governança do projeto: instâncias de decisão, periodicidade das reuniões e forma de registro das deliberações. Esta ata é a evidência do desenho de governança acordado.',
      pontos_atencao:
        'O desenho precisa ficar coerente com o que a documentação submetida descreve, porque é exatamente o ponto que a validadora pediu para esclarecer.',
      barreiras: null,
      aprovada: true,
      aprovada_em: '2025-09-15T20:00:00.000Z',
      criado_em: CRIADO_EM_DEMO,
      atualizado_em: CRIADO_EM_DEMO,
    },
    {
      id: ID_ATA_CONSULTA,
      reuniao_id: ID_CONSULTA,
      redigida_por: USUARIO_PROJETOS,
      conteudo:
        'Rodada de esclarecimentos com a comunidade sobre o escopo do projeto e a repartição de benefícios. Registro dos temas levantados e das respostas dadas.',
      pontos_atencao: 'Dois temas ficaram para a próxima rodada por falta de material de apoio.',
      barreiras: 'Deslocamento até a área depende de janela logística.',
      aprovada: true,
      aprovada_em: '2025-09-20T20:00:00.000Z',
      criado_em: CRIADO_EM_DEMO,
      atualizado_em: CRIADO_EM_DEMO,
    },
    {
      /* Ata em rascunho (nao aprovada): e o estado em que a ata nasce, e a tela precisa
         mostrar a diferenca entre rascunho e evidencia aprovada. */
      id: ID_ATA_PARCEIRO,
      reuniao_id: ID_PARCEIRO_ALFA,
      redigida_por: USUARIO_PROJETOS,
      conteudo: 'Andamento das frentes com a organização parceira.',
      pontos_atencao: null,
      barreiras: null,
      aprovada: false,
      aprovada_em: null,
      criado_em: CRIADO_EM_DEMO,
      atualizado_em: CRIADO_EM_DEMO,
    },
  ];
}

function pendenciasIniciais() {
  return [
    {
      id: '00000000-0000-4000-8000-0000000000e1',
      ata_id: ID_ATA_WEEKLY,
      descricao: 'Consolidar o planejado contra o realizado das horas da semana.',
      responsavel_id: USUARIO_CONSULTORIA,
      prazo: somarDias(segunda(), -3),
      atividade_id: null,
      concluida: false,
      concluida_em: null,
      criado_em: CRIADO_EM_DEMO,
      atualizado_em: CRIADO_EM_DEMO,
    },
    {
      /* Pendencia que VIROU ATIVIDADE: o vinculo e o que fecha o ciclo
         ata -> pendencia -> backlog de atividades. O id abaixo e ficticio e nao
         corresponde a nenhuma atividade cadastrada. */
      id: '00000000-0000-4000-8000-0000000000e2',
      ata_id: ID_ATA_WEEKLY,
      descricao: 'Redistribuir prioridades do backlog acordadas na reunião.',
      responsavel_id: USUARIO_PROJETOS,
      prazo: somarDias(segunda(), 4),
      atividade_id: '00000000-0000-4000-8000-0000000000f1',
      concluida: false,
      concluida_em: null,
      criado_em: CRIADO_EM_DEMO,
      atualizado_em: CRIADO_EM_DEMO,
    },
    {
      id: '00000000-0000-4000-8000-0000000000e3',
      ata_id: ID_ATA_WEEKLY,
      descricao: 'Enviar resumo da semana às frentes envolvidas.',
      responsavel_id: null,
      prazo: null,
      atividade_id: null,
      concluida: true,
      concluida_em: '2025-09-09T18:00:00.000Z',
      criado_em: CRIADO_EM_DEMO,
      atualizado_em: CRIADO_EM_DEMO,
    },
    {
      id: '00000000-0000-4000-8000-0000000000e4',
      ata_id: ID_ATA_GOVERNANCA,
      descricao: 'Anexar esta ata ao item de evidência do checklist de auditoria.',
      responsavel_id: USUARIO_PROJETOS,
      prazo: somarDias(segunda(), 10),
      atividade_id: null,
      concluida: false,
      concluida_em: null,
      criado_em: CRIADO_EM_DEMO,
      atualizado_em: CRIADO_EM_DEMO,
    },
  ];
}

/**
 * Cria o estado inicial na PRIMEIRA operacao (ver a nota de bundle acima).
 *
 * Idempotente: chamada de novo, nao recria nada e nao desfaz as mutacoes feitas pela
 * revisao. Toda funcao exportada chama isto antes de tocar nas colecoes.
 */
function semear() {
  if (reunioes) return;
  reunioes = reunioesIniciais();
  atas = atasIniciais();
  pendencias = pendenciasIniciais();
}

/* ===== Busca interna ====================================================== */

function acharReuniao(id) {
  const reuniao = reunioes.find((r) => r.id === id);
  if (!reuniao) throw new ErroDemo('nao_encontrado');
  return reuniao;
}

function ataDaReuniao(reuniaoId) {
  return atas.find((a) => a.reuniao_id === reuniaoId) ?? null;
}

function acharAta(id) {
  const ata = atas.find((a) => a.id === id);
  if (!ata) throw new ErroDemo('nao_encontrado');
  return ata;
}

function pendenciasDaAta(ataId) {
  return pendencias.filter((p) => p.ata_id === ataId);
}

/* ===== Agregados (regra 1 do cabecalho) ===================================
   Definicao unica de "pendencia aberta", igual a da funcao SQL: concluida = false. */

function agregados(reuniao) {
  const ata = ataDaReuniao(reuniao.id);
  const lista = ata ? pendenciasDaAta(ata.id) : [];
  return {
    ata_id: ata ? ata.id : null,
    tem_ata: Boolean(ata),
    ata_aprovada: Boolean(ata && ata.aprovada),
    pendencias_total: lista.length,
    pendencias_abertas: lista.filter((p) => !p.concluida).length,
  };
}

/**
 * Reuniao no formato da listagem. projeto_nome vem resolvido, como na funcao SQL
 * (left join em carbon_projetos): nulo significa reuniao de backoffice.
 */
function serializarReuniao(reuniao) {
  return {
    ...reuniao,
    projeto_nome: reuniao.projeto_id ? PROJETOS_DEMO[reuniao.projeto_id] ?? null : null,
    ...agregados(reuniao),
  };
}

/** Ordem da listagem: data desc, criado_em desc (regra 3). */
function ordemListagem(a, b) {
  if (a.data !== b.data) return a.data < b.data ? 1 : -1;
  if (a.criado_em !== b.criado_em) return a.criado_em < b.criado_em ? 1 : -1;
  return 0;
}

/** Ordem das pendencias: abertas primeiro, prazo mais curto, criado_em (regra 5). */
function ordemPendencias(a, b) {
  const fechadaA = a.concluida ? 1 : 0;
  const fechadaB = b.concluida ? 1 : 0;
  if (fechadaA !== fechadaB) return fechadaA - fechadaB;

  // Prazo nulo vai para o fim (nulls last), como no ORDER BY da funcao SQL.
  if (a.prazo !== b.prazo) {
    if (!a.prazo) return 1;
    if (!b.prazo) return -1;
    return a.prazo < b.prazo ? -1 : 1;
  }
  return String(a.criado_em).localeCompare(String(b.criado_em));
}

/** Resumo do painel sobre o conjunto FILTRADO (regras 2 e 4). */
function calcularResumo(lista) {
  const hoje = hojeIso();
  const comAgregados = lista.map((r) => ({ ...r, ...agregados(r) }));

  const futuras = comAgregados.filter((r) => r.data >= hoje).map((r) => r.data).sort();
  const passadas = comAgregados.filter((r) => r.data < hoje).map((r) => r.data).sort();

  return {
    total: comAgregados.length,
    sem_ata: comAgregados.filter((r) => !r.tem_ata).length,
    atas_aprovadas: comAgregados.filter((r) => r.ata_aprovada).length,
    pendencias_abertas: comAgregados.reduce((acc, r) => acc + r.pendencias_abertas, 0),
    proxima_data: futuras.length ? futuras[0] : null,
    ultima_data: passadas.length ? passadas[passadas.length - 1] : null,
  };
}

/* ===== Serializacao do detalhe ============================================ */

function serializarAta(ata) {
  if (!ata) return null;
  return {
    ...ata,
    redigida_por_nome: ata.redigida_por ? USUARIOS_DEMO[ata.redigida_por] ?? null : null,
  };
}

function serializarPendencia(pendencia) {
  return {
    ...pendencia,
    responsavel_nome: pendencia.responsavel_id
      ? USUARIOS_DEMO[pendencia.responsavel_id] ?? null
      : null,
  };
}

/**
 * Vinculos de evidencia (carbon_documento_vinculos, dominio de Documentos).
 *
 * Em producao a rota conta os vinculos da ata e devolve null quando aquele dominio
 * ainda nao esta aplicado. Aqui nao existe dataset de documentos, entao devolvemos um
 * numero FIXO e ficticio: 1 na ata de consulta a comunidade e 0 nas demais. E de
 * proposito - assim a revisao ve os DOIS estados da tela, "ata ja anexada a evidencia"
 * e "ata ainda nao anexada", que e a diferenca que a issue existe para tornar visivel.
 */
function vinculosEvidenciaDemo(ata) {
  if (!ata) return 0;
  return ata.id === ID_ATA_CONSULTA ? 1 : 0;
}

function detalhe(reuniaoId) {
  const reuniao = acharReuniao(reuniaoId);
  const ata = ataDaReuniao(reuniaoId);
  const lista = ata ? [...pendenciasDaAta(ata.id)].sort(ordemPendencias) : [];

  return {
    reuniao: serializarReuniao(reuniao),
    ata: serializarAta(ata),
    pendencias: lista.map(serializarPendencia),
    vinculos_evidencia: vinculosEvidenciaDemo(ata),
  };
}

/* ===== Validacao (mesmos codigos de erro do backend) ====================== */

function validarTipo(valor) {
  const tipo = texto(valor);
  if (!tipo) throw new ErroDemo('campo_obrigatorio');
  if (!TIPOS_VALIDOS.includes(tipo)) throw new ErroDemo('campo_invalido');
  return tipo;
}

function validarData(valor) {
  const data = texto(valor);
  if (!data) throw new ErroDemo('campo_obrigatorio');
  if (!DATA_ISO.test(data)) throw new ErroDemo('campo_invalido');
  return data;
}

function validarDataOpcional(valor) {
  const data = texto(valor);
  if (!data) return null;
  if (!DATA_ISO.test(data)) throw new ErroDemo('campo_invalido');
  return data;
}

/**
 * Campos de reuniao vindos do formulario, na mesma lista branca do backend.
 * Campo desconhecido e IGNORADO, nunca gravado.
 */
function camposReuniao(dados, modo) {
  const entrada = dados && typeof dados === 'object' ? dados : {};
  const saida = {};
  const veio = (campo) => Object.prototype.hasOwnProperty.call(entrada, campo);

  if (modo === 'criar' || veio('tipo')) saida.tipo = validarTipo(entrada.tipo);

  if (modo === 'criar' || veio('titulo')) {
    const titulo = texto(entrada.titulo);
    if (!titulo) throw new ErroDemo('campo_obrigatorio');
    saida.titulo = titulo;
  }

  if (modo === 'criar' || veio('data')) saida.data = validarData(entrada.data);

  if (veio('projeto_id')) saida.projeto_id = texto(entrada.projeto_id);
  if (veio('parceiro')) saida.parceiro = texto(entrada.parceiro);

  return saida;
}

/** Regra 8: semanal por parceiro exige parceiro. */
function conferirParceiro(tipo, parceiro) {
  if (tipo === 'semanal_parceiro' && !texto(parceiro)) {
    throw new ErroDemo('parceiro_obrigatorio');
  }
}

/* ===== Funcoes que imitam o backend ======================================= */

/**
 * GET /reunioes. `filtros` aceita { projeto_id, tipo, parceiro, pagina, limite }, com
 * projeto_id = 'backoffice' significando "somente as reunioes sem projeto".
 */
export async function demoListarReunioes(filtros = {}) {
  await esperar();
  semear();

  const projetoId = texto(filtros.projeto_id);
  const tipo = texto(filtros.tipo);
  const parceiro = texto(filtros.parceiro);

  if (tipo && !TIPOS_VALIDOS.includes(tipo)) throw new ErroDemo('campo_invalido');

  const filtradas = reunioes.filter((r) => {
    if (projetoId === 'backoffice') {
      if (r.projeto_id) return false;
    } else if (projetoId && projetoId !== 'todos' && r.projeto_id !== projetoId) {
      return false;
    }
    if (tipo && r.tipo !== tipo) return false;
    if (parceiro) {
      // strpos(lower(...)) da funcao SQL: busca por trecho, sem curinga, e reuniao
      // sem parceiro nao casa.
      if (!r.parceiro) return false;
      if (!r.parceiro.toLowerCase().includes(parceiro.toLowerCase())) return false;
    }
    return true;
  });

  const limiteBruto = Number(filtros.limite);
  const limite = Number.isFinite(limiteBruto) && limiteBruto >= 1
    ? Math.min(Math.floor(limiteBruto), LIMITE_PAGINA_MAXIMO)
    : LIMITE_PAGINA_PADRAO;
  const paginaBruta = Number(filtros.pagina);
  const pagina = Number.isFinite(paginaBruta) && paginaBruta >= 1 ? Math.floor(paginaBruta) : 1;
  const deslocamento = (pagina - 1) * limite;

  const ordenadas = [...filtradas].sort(ordemListagem);

  return {
    reunioes: ordenadas.slice(deslocamento, deslocamento + limite).map(serializarReuniao),
    total: filtradas.length,
    resumo: calcularResumo(filtradas),
    pagina,
    limite,
  };
}

/** GET /reunioes/:id */
export async function demoObterReuniao(id) {
  await esperar();
  semear();
  return detalhe(id);
}

/** POST /reunioes */
export async function demoCriarReuniao(dados) {
  await esperar();
  semear();
  const campos = camposReuniao(dados, 'criar');
  conferirParceiro(campos.tipo, campos.parceiro);

  const criadoEm = agora();
  const reuniao = {
    id: novoId(),
    projeto_id: campos.projeto_id ?? null,
    tipo: campos.tipo,
    titulo: campos.titulo,
    data: campos.data,
    parceiro: campos.parceiro ?? null,
    recorrencia_id: null,
    criado_em: criadoEm,
    atualizado_em: criadoEm,
  };

  reunioes = [...reunioes, reuniao];
  return { reuniao: serializarReuniao(reuniao) };
}

/** PATCH /reunioes/:id - devolve o DETALHE, como a rota. */
export async function demoAtualizarReuniao(id, dados) {
  await esperar();
  semear();
  const reuniao = acharReuniao(id);
  const campos = camposReuniao(dados, 'atualizar');

  if (Object.keys(campos).length === 0) throw new ErroDemo('nada_para_atualizar');

  const tipoFinal = campos.tipo ?? reuniao.tipo;
  const parceiroFinal = Object.prototype.hasOwnProperty.call(campos, 'parceiro')
    ? campos.parceiro
    : reuniao.parceiro;
  conferirParceiro(tipoFinal, parceiroFinal);

  Object.assign(reuniao, campos);
  reuniao.atualizado_em = agora();

  return detalhe(id);
}

/**
 * POST /reunioes/:id/serie - regra 6.
 *
 * Mesma logica de public.carbon_reunioes_gerar_serie: 7 dias de intervalo, apenas tipo
 * semanal e semanal_parceiro, data com reuniao equivalente e pulada e contada em
 * ignoradas, e a serie inteira (incluindo a origem) compartilha recorrencia_id.
 */
export async function demoGerarSerieReunioes(id, quantidade) {
  await esperar();
  semear();
  const base = acharReuniao(id);

  const qtd = Number(quantidade);
  if (!Number.isInteger(qtd) || qtd < 1 || qtd > QUANTIDADE_MAXIMA_SERIE) {
    throw new ErroDemo('campo_invalido');
  }
  if (!TIPOS_RECORRENTES.includes(base.tipo)) throw new ErroDemo('tipo_nao_recorrente');

  const recorrencia = base.recorrencia_id ?? novoId();
  if (!base.recorrencia_id) base.recorrencia_id = recorrencia;

  let criadas = 0;
  let ignoradas = 0;
  const novas = [];

  for (let i = 1; i <= qtd; i += 1) {
    const data = somarDias(base.data, INTERVALO_DIAS * i);

    // "is not distinct from" do SQL: nulo casa com nulo (weekly de backoffice nao tem
    // projeto nem parceiro).
    const jaExiste = [...reunioes, ...novas].some(
      (r) =>
        (r.projeto_id ?? null) === (base.projeto_id ?? null) &&
        r.tipo === base.tipo &&
        (r.parceiro ?? null) === (base.parceiro ?? null) &&
        r.data === data,
    );
    if (jaExiste) {
      ignoradas += 1;
      continue;
    }

    const criadoEm = agora();
    novas.push({
      id: novoId(),
      projeto_id: base.projeto_id ?? null,
      tipo: base.tipo,
      titulo: base.titulo,
      data,
      parceiro: base.parceiro ?? null,
      recorrencia_id: recorrencia,
      criado_em: criadoEm,
      atualizado_em: criadoEm,
    });
    criadas += 1;
  }

  reunioes = [...reunioes, ...novas];
  return {
    criadas,
    ignoradas,
    recorrencia_id: recorrencia,
    intervalo_dias: INTERVALO_DIAS,
  };
}

/* ===== Ata ================================================================ */

/** Campos de ata na mesma lista branca do backend. aprovada_em nunca vem do cliente. */
function camposAta(dados) {
  const entrada = dados && typeof dados === 'object' ? dados : {};
  const saida = {};
  const veio = (campo) => Object.prototype.hasOwnProperty.call(entrada, campo);

  if (veio('redigida_por')) saida.redigida_por = texto(entrada.redigida_por);
  if (veio('conteudo')) saida.conteudo = texto(entrada.conteudo);
  if (veio('pontos_atencao')) saida.pontos_atencao = texto(entrada.pontos_atencao);
  if (veio('barreiras')) saida.barreiras = texto(entrada.barreiras);
  if (veio('aprovada')) {
    if (typeof entrada.aprovada !== 'boolean') throw new ErroDemo('campo_invalido');
    saida.aprovada = entrada.aprovada;
  }

  return saida;
}

/** POST /reunioes/:id/ata */
export async function demoCriarAta(reuniaoId, dados) {
  await esperar();
  semear();
  acharReuniao(reuniaoId);

  // unique (reuniao_id): a segunda tentativa e 409, nao sobrescrita silenciosa.
  if (ataDaReuniao(reuniaoId)) throw new ErroDemo('registro_duplicado');

  const campos = camposAta(dados);
  const criadoEm = agora();
  const aprovada = campos.aprovada === true;

  const ata = {
    id: novoId(),
    reuniao_id: reuniaoId,
    redigida_por: campos.redigida_por ?? null,
    conteudo: campos.conteudo ?? null,
    pontos_atencao: campos.pontos_atencao ?? null,
    barreiras: campos.barreiras ?? null,
    aprovada,
    // Regra 7 (trigger de INSERT): ata que nasce aprovada recebe o carimbo agora.
    aprovada_em: aprovada ? criadoEm : null,
    criado_em: criadoEm,
    atualizado_em: criadoEm,
  };

  atas = [...atas, ata];
  return { ata: serializarAta(ata) };
}

/** PATCH /atas/:id */
export async function demoAtualizarAta(ataId, dados) {
  await esperar();
  semear();
  const ata = acharAta(ataId);
  const campos = camposAta(dados);

  if (Object.keys(campos).length === 0) throw new ErroDemo('nada_para_atualizar');

  const antes = ata.aprovada;
  Object.assign(ata, campos);

  /* Regra 7 (trigger de UPDATE): aprovada_em preenche na transicao para aprovada,
     limpa na reprovacao e e PRESERVADA quando a ata segue aprovada - e assim que uma
     edicao posterior nao reescreve o carimbo da evidencia. */
  if (ata.aprovada && !antes) ata.aprovada_em = agora();
  else if (!ata.aprovada) ata.aprovada_em = null;

  ata.atualizado_em = agora();
  return { ata: serializarAta(ata) };
}

/* ===== Pendencias ========================================================= */

function camposPendencia(dados, modo) {
  const entrada = dados && typeof dados === 'object' ? dados : {};
  const saida = {};
  const veio = (campo) => Object.prototype.hasOwnProperty.call(entrada, campo);

  if (modo === 'criar' || veio('descricao')) {
    const descricao = texto(entrada.descricao);
    if (!descricao) throw new ErroDemo('campo_obrigatorio');
    saida.descricao = descricao;
  }
  if (veio('responsavel_id')) saida.responsavel_id = texto(entrada.responsavel_id);
  if (veio('prazo')) saida.prazo = validarDataOpcional(entrada.prazo);
  if (veio('atividade_id')) saida.atividade_id = texto(entrada.atividade_id);
  if (veio('concluida')) {
    if (typeof entrada.concluida !== 'boolean') throw new ErroDemo('campo_invalido');
    saida.concluida = entrada.concluida;
  }

  return saida;
}

/** POST /atas/:id/pendencias */
export async function demoCriarPendencia(ataId, dados) {
  await esperar();
  semear();
  // Em producao quem recusa ata inexistente e a chave estrangeira (23503 ->
  // referencia_invalida). Aqui o efeito e o mesmo codigo de erro.
  if (!atas.some((a) => a.id === ataId)) throw new ErroDemo('referencia_invalida');

  const campos = camposPendencia(dados, 'criar');
  const criadoEm = agora();
  const concluida = campos.concluida === true;

  const pendencia = {
    id: novoId(),
    ata_id: ataId,
    descricao: campos.descricao,
    responsavel_id: campos.responsavel_id ?? null,
    prazo: campos.prazo ?? null,
    atividade_id: campos.atividade_id ?? null,
    concluida,
    concluida_em: concluida ? criadoEm : null,
    criado_em: criadoEm,
    atualizado_em: criadoEm,
  };

  pendencias = [...pendencias, pendencia];
  return { pendencia: serializarPendencia(pendencia) };
}

/** PATCH /ata-pendencias/:id */
export async function demoAtualizarPendencia(id, dados) {
  await esperar();
  semear();
  const pendencia = pendencias.find((p) => p.id === id);
  if (!pendencia) throw new ErroDemo('nao_encontrado');

  const campos = camposPendencia(dados, 'atualizar');
  if (Object.keys(campos).length === 0) throw new ErroDemo('nada_para_atualizar');

  const antes = pendencia.concluida;
  Object.assign(pendencia, campos);

  // Regra 7, mesma mecanica de aprovada_em.
  if (pendencia.concluida && !antes) pendencia.concluida_em = agora();
  else if (!pendencia.concluida) pendencia.concluida_em = null;

  pendencia.atualizado_em = agora();
  return { pendencia: serializarPendencia(pendencia) };
}

/** DELETE /ata-pendencias/:id */
export async function demoRemoverPendencia(id) {
  await esperar();
  semear();
  if (!pendencias.some((p) => p.id === id)) throw new ErroDemo('nao_encontrado');
  pendencias = pendencias.filter((p) => p.id !== id);
  return { removido: true, id };
}

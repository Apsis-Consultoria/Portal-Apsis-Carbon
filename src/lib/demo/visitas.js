/**
 * demo/visitas.js - dataset de demonstracao da tela de Visitas (issue #12).
 *
 * POR QUE EXISTE: o projeto Supabase do Apsis Carbon ainda NAO foi provisionado, e a
 * tela precisa ser revisavel antes disso. Em MODO_DEMO (ver src/lib/runtimeConfig.js:
 * exige dev E o clique no botao de demonstracao) as funcoes de src/lib/api/visitas.js nao fazem
 * rede: operam sobre o estado em memoria deste arquivo, e as mutacoes ALTERAM esse
 * estado, para a tela ser de fato interativa.
 *
 * ESCOPO: nao e cache nem persistencia. Recarregar a pagina volta ao estado inicial.
 * Vale SOMENTE em desenvolvimento: em build de producao MODO_DEMO e false por forca
 * (import.meta.env.DEV e estatico) e o bundler elimina os ramos que chamam este modulo.
 *
 * FIDELIDADE AO BANCO - por que este arquivo e chato de proposito:
 * cada regra abaixo tem contraparte na migration
 * supabase/migrations/20260814098000_visitas.sql, e as duas TEM de concordar, senao a
 * revisao do dono mostra numero que a producao nunca produz. As regras espelhadas sao:
 *
 *   1. follow-up ABERTO = status nao_iniciado ou em_andamento     (carbon_visitas_base)
 *   2. ATRASADO = aberto E com prazo E prazo < hoje. Concluido com prazo vencido NAO e
 *      atraso, e aberto sem prazo tambem nao                                    (idem)
 *   3. SEM COBRANCA = aberto E (sem responsavel de follow-up OU sem prazo)      (idem)
 *   4. dias_atraso = hoje - prazo, e null quando nao ha atraso                  (idem)
 *   5. contato_registrado = existe nome, telefone OU e-mail                     (idem)
 *   6. retencao_vencida = nao anonimizada E retencao_ate < hoje                 (idem)
 *   7. fora_do_periodo = tem viagem E data fora de [inicio, coalesce(fim,inicio)] (idem)
 *   8. ordem da listagem: data desc, criado_em desc     (carbon_visitas_listar)
 *   9. resumo calculado sobre o conjunto FILTRADO, nao sobre a pagina           (idem)
 *  10. agregado por viagem usa as MESMAS definicoes de 1 a 3    (carbon_viagens_listar)
 *  11. filtro de periodo da viagem e INTERSECCAO com a janela pedida            (idem)
 *  12. retencao_ate = data da visita + 24 meses quando nao informada
 *                                                    (carbon_visitas_before_write)
 *  13. anonimizacao e IRREVERSIVEL, exige motivo, e idempotente
 *                                                       (carbon_visita_anonimizar)
 *  14. rotina de retencao so toca visita que ainda tem contato, e execucao sem efeito
 *      nao gera log                            (carbon_visitas_anonimizar_vencidas)
 *  15. exportacao SEMPRE grava auditoria; com contato exige motivo
 *                                                        (carbon_visitas_exportar)
 *
 * LGPD - ESTE E O PONTO MAIS DELICADO DESTE DATASET:
 *
 *   a. TODO dado abaixo e FICTICIO e obviamente ficticio. Nenhum nome de pessoa real,
 *      nenhuma organizacao real, nenhuma cidade real, nenhum telefone discavel (DDD 00
 *      nao existe no Brasil) e nenhum dominio de e-mail roteavel (example.com e
 *      reservado pela RFC 2606 exatamente para isso).
 *   b. A LISTAGEM daqui NAO devolve contato, igual a producao. Nao e filtro na tela: as
 *      funcoes de lista deste arquivo nao copiam as chaves de contato para a saida.
 *   c. O DETALHE devolve contato conforme PAPEL_DEMO (ver a constante abaixo), que
 *      imita a decisao que em producao e do servidor pelo papel do colaborador.
 */

/* ===== Erro tipado ========================================================
   O demo precisa recusar entrada invalida com os MESMOS codigos do backend, senao a
   tela trataria erro de validacao de um jeito no demo e de outro em producao. Nao
   lancamos ErroApi aqui de proposito: quem converte e o chamarDemo de
   src/lib/api/base.js, e importar ErroApi no dataset criaria ciclo entre o modulo de
   dados e o de transporte. Classe propria por dominio para este dataset nao arrastar o
   de outro dominio para o mesmo pedaco do bundle.

   DIVERGENCIA CONHECIDA E ACEITA: chamarDemo mapeia todo codigo que nao seja
   'nao_encontrado' para status 400, portanto 'sem_permissao' aparece como 400 no demo e
   como 403 em producao. As telas decidem pelo CODIGO, nunca pelo status.             */
export class ErroDemo extends Error {
  constructor(codigo) {
    super(`Recusado pelo modo demonstracao: ${codigo}`);
    this.name = 'ErroDemo';
    this.codigo = codigo;
  }
}

/* ===== Vocabulario (espelha os CHECK do banco) ============================ */

const STATUS_VALIDOS = ['nao_iniciado', 'em_andamento', 'concluido', 'descartado'];

const SITUACOES_VALIDAS = [
  'atrasada',
  'sem_cobranca',
  'aberta',
  'anonimizada',
  'retencao_vencida',
];

const UFS_VALIDAS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const RETENCAO_MESES = 24;
const LIMITE_PAGINA_PADRAO = 50;
const LIMITE_PAGINA_MAXIMO = 200;
const LIMITE_EXPORTACAO_PADRAO = 2000;
const LIMITE_EXPORTACAO_MAXIMO = 5000;
const LIMITE_RETENCAO_MAXIMO = 5000;
const TELEFONE_RE = /^[0-9+()\-.\s]{6,40}$/;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * PAPEL do colaborador imaginario que esta usando a demonstracao.
 *
 * Em producao quem decide e o SERVIDOR: a Edge Function libera escrita e leitura de
 * contato para papel admin ou gestor. Aqui a decisao precisa existir em algum lugar,
 * senao a revisao veria apenas um dos dois caminhos da tela.
 *
 * COM 'gestor' (valor atual) a revisao ve o contato no detalhe e consegue exportar.
 * TROQUE PARA 'colaborador' para revisar o outro caminho: contato oculto com explicacao,
 * botoes que respondem sem_permissao. Os dois caminhos existem em producao, e o segundo
 * e o que protege dado pessoal.
 */
const PAPEL_DEMO = 'gestor';
const PAPEIS_CONTATO = ['admin', 'gestor'];

const podeVerContato = () => PAPEIS_CONTATO.includes(PAPEL_DEMO);

/** Imita o portao de escrita do index.ts (papel admin ou gestor). */
function exigirEscrita() {
  if (!PAPEIS_CONTATO.includes(PAPEL_DEMO)) throw new ErroDemo('sem_permissao');
}

/* ===== Utilitarios ======================================================== */

/** Espera curta para os estados de carregamento da tela aparecerem no demo. */
const esperar = (ms = 240) => new Promise((resolve) => setTimeout(resolve, ms));

const agora = () => new Date().toISOString();

function novoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback so para ambiente sem crypto.randomUUID (nao ocorre nos navegadores alvo).
  return `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
}

/**
 * Soma dias a uma data 'AAAA-MM-DD' em UTC, e devolve no mesmo formato.
 *
 * Aritmetica em UTC de proposito: somar dias com new Date local atravessa horario de
 * verao em alguns fusos e devolve o dia anterior. A coluna do banco e `date`, sem hora.
 */
function somarDias(iso, dias) {
  const partes = String(iso).split('-').map(Number);
  const base = Date.UTC(partes[0], partes[1] - 1, partes[2]);
  return new Date(base + dias * 86400000).toISOString().slice(0, 10);
}

/**
 * Soma meses a uma data 'AAAA-MM-DD', para o prazo de retencao (regra 12).
 *
 * DIVERGENCIA MINIMA E CONHECIDA: `date + interval '24 months'` do Postgres GRUDA no
 * ultimo dia do mes quando o dia nao existe no mes destino (31 de janeiro + 1 mes = 28
 * de fevereiro), enquanto Date.UTC transborda para o mes seguinte. Com 24 meses o unico
 * caso afetado e 29 de fevereiro, e o efeito e um dia de diferenca num prazo de dois
 * anos. Nao vale reimplementar o calendario do Postgres por isso.
 */
function somarMeses(iso, meses) {
  const partes = String(iso).split('-').map(Number);
  return new Date(Date.UTC(partes[0], partes[1] - 1 + meses, partes[2]))
    .toISOString()
    .slice(0, 10);
}

/**
 * Hoje em 'AAAA-MM-DD'.
 *
 * DIVERGENCIA CONHECIDA E ACEITA: no banco os recortes usam current_date, que e a data
 * do SERVIDOR (UTC no Supabase); aqui e a data do navegador. Na virada do dia os dois
 * podem discordar por algumas horas em "atrasado por 1 dia". E painel, nao laudo.
 */
function hojeIso() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Diferenca em dias entre duas datas 'AAAA-MM-DD' (a - b). */
function diferencaDias(a, b) {
  const pa = String(a).split('-').map(Number);
  const pb = String(b).split('-').map(Number);
  const ms = Date.UTC(pa[0], pa[1] - 1, pa[2]) - Date.UTC(pb[0], pb[1] - 1, pb[2]);
  return Math.round(ms / 86400000);
}

function texto(valor) {
  if (valor === null || valor === undefined) return null;
  const limpo = String(valor).trim();
  return limpo === '' ? null : limpo;
}

const veio = (objeto, campo) => Object.prototype.hasOwnProperty.call(objeto, campo);

/* ===== Referencias ficticias ==============================================
   Onde a producao traria carbon_usuarios.nome (nome de exibicao do Azure AD), o demo usa
   ROTULO DE PAPEL: o levantamento pede explicitamente papeis em vez de nomes de pessoa.
   USUARIO_ATUAL e quem "assume o follow-up" na demonstracao; em producao esse id vem do
   registro autenticado, resolvido no servidor.                                       */
const USUARIO_ATUAL = '00000000-0000-4000-8000-0000000000d1';
const USUARIO_COMERCIAL = '00000000-0000-4000-8000-0000000000d2';
const USUARIOS_DEMO = {
  [USUARIO_ATUAL]: 'Consultor de Novos Negócios (fictício)',
  [USUARIO_COMERCIAL]: 'Equipe Comercial (fictícia)',
};

const nomeUsuario = (id) => (id ? USUARIOS_DEMO[id] ?? null : null);

/* ===== Estado em memoria ==================================================
   Tres colecoes, como as tres tabelas.

   NOTA DE BUNDLE (medida, nao suposta): o dataset nasce DENTRO de funcoes e e criado na
   primeira operacao, e nao em literal no topo do modulo. Com MODO_DEMO dobrado para
   false o Rollup elimina tudo que so e alcancavel pelas funcoes demo*, MAS nao elimina
   valor montado no topo do modulo por CHAMADA de funcao - ele nao consegue provar que a
   chamada e livre de efeito colateral. Foi o que aconteceu em src/lib/demoProjetos.js,
   onde a lista de capitulos sobrevive ao build. Escrito desta forma, nenhum contato
   ficticio deste dominio chega ao bundle de producao.                                */

let viagens = null;
let visitas = null;
let auditoria = null;

let hojeCache = null;

/** Hoje fixado uma vez por sessao, para a revisao nao ver numeros mudando na tela. */
function hoje() {
  if (!hojeCache) hojeCache = hojeIso();
  return hojeCache;
}

const CRIADO_EM_DEMO = '2026-03-02T12:00:00.000Z';

const VIAGEM_NORTE = '00000000-0000-4000-8000-0000000000f1';
const VIAGEM_SUL = '00000000-0000-4000-8000-0000000000f2';

/**
 * Duas rodadas, que e exatamente o padrao observado no levantamento: duas ondas de
 * visita, cada uma concentrada em uma cidade e em poucos dias. Cidades ficticias de
 * proposito: cidade real, ainda que nao seja dado pessoal, aponta para cliente real.
 */
function viagensIniciais() {
  const inicioNorte = somarDias(hoje(), -150);
  const inicioSul = somarDias(hoje(), -60);

  return [
    {
      id: VIAGEM_NORTE,
      titulo: 'Rodada de prospecção Norte (fictícia)',
      cidade: 'Cidade Fictícia do Norte',
      uf: 'AM',
      data_inicio: inicioNorte,
      data_fim: somarDias(inicioNorte, 2),
      responsavel_id: USUARIO_COMERCIAL,
      criado_em: CRIADO_EM_DEMO,
      atualizado_em: CRIADO_EM_DEMO,
    },
    {
      id: VIAGEM_SUL,
      titulo: 'Rodada de prospecção Sul (fictícia)',
      cidade: 'Cidade Fictícia do Sul',
      uf: 'RS',
      data_inicio: inicioSul,
      data_fim: somarDias(inicioSul, 1),
      responsavel_id: USUARIO_ATUAL,
      criado_em: CRIADO_EM_DEMO,
      atualizado_em: CRIADO_EM_DEMO,
    },
  ];
}

const V_NORTE_SEM_COBRANCA = '00000000-0000-4000-8000-00000000a001';
const V_NORTE_ATRASADA = '00000000-0000-4000-8000-00000000a002';
const V_NORTE_CONCLUIDA = '00000000-0000-4000-8000-00000000a003';
const V_NORTE_FORA_PERIODO = '00000000-0000-4000-8000-00000000a004';
const V_SUL_EM_DIA = '00000000-0000-4000-8000-00000000a005';
const V_SUL_SEM_PRAZO = '00000000-0000-4000-8000-00000000a006';
const V_SUL_ANONIMIZADA = '00000000-0000-4000-8000-00000000a007';
const V_AVULSA_RETENCAO = '00000000-0000-4000-8000-00000000a008';

/**
 * Molde de visita ficticia. `retencao_ate` calculada pela MESMA regra da trigger
 * (data + 24 meses), para o painel de retencao do demo bater com o de producao.
 */
function visitaDemo(id, campos) {
  const base = {
    id,
    viagem_id: null,
    organizacao: 'Organização Fictícia',
    contato_nome: null,
    contato_telefone: null,
    contato_email: null,
    data: hoje(),
    assunto: null,
    resultado: null,
    follow_up_status: 'nao_iniciado',
    follow_up_responsavel_id: null,
    follow_up_prazo: null,
    responsavel_id: USUARIO_COMERCIAL,
    retencao_ate: null,
    anonimizado_em: null,
    anonimizado_motivo: null,
    criado_em: CRIADO_EM_DEMO,
    atualizado_em: CRIADO_EM_DEMO,
    ...campos,
  };
  if (!base.retencao_ate) base.retencao_ate = somarMeses(base.data, RETENCAO_MESES);
  return base;
}

/**
 * Oito visitas, escolhidas para a revisao ver TODOS os estados que a tela precisa
 * distinguir: follow-up parado sem dono e sem prazo (o diagnostico do levantamento),
 * follow-up vencido, follow-up em dia, follow-up aberto sem prazo, visita concluida,
 * visita ja anonimizada a pedido do titular, visita com retencao vencida (para a rotina
 * de retencao ter o que fazer na demonstracao) e visita pendurada na rodada errada.
 */
function visitasIniciais() {
  const norte = somarDias(hoje(), -150);
  const sul = somarDias(hoje(), -60);

  return [
    visitaDemo(V_NORTE_SEM_COBRANCA, {
      viagem_id: VIAGEM_NORTE,
      organizacao: 'Cooperativa Fictícia Alfa',
      contato_nome: 'Contato Fictício Alfa',
      contato_telefone: '(00) 90000-0001',
      contato_email: 'contato.alfa@example.com',
      data: norte,
      assunto: 'Apresentação da APSIS e do mercado regulado de carbono.',
      resultado: 'Interesse em entender inventário de GEE. Pediu material.',
      follow_up_status: 'nao_iniciado',
      follow_up_responsavel_id: null,
      follow_up_prazo: null,
    }),
    visitaDemo(V_NORTE_ATRASADA, {
      viagem_id: VIAGEM_NORTE,
      organizacao: 'Indústria Fictícia Beta',
      contato_nome: 'Contato Fictício Beta',
      contato_telefone: '(00) 90000-0002',
      contato_email: 'contato.beta@example.com',
      data: somarDias(norte, 1),
      assunto: 'Viabilidade de projeto de REDD em área própria.',
      resultado: 'Pediu proposta de análise ultra preliminar.',
      follow_up_status: 'em_andamento',
      follow_up_responsavel_id: USUARIO_ATUAL,
      follow_up_prazo: somarDias(hoje(), -23),
    }),
    visitaDemo(V_NORTE_CONCLUIDA, {
      viagem_id: VIAGEM_NORTE,
      organizacao: 'Associação Fictícia Gama',
      contato_nome: 'Contato Fictício Gama',
      contato_email: 'contato.gama@example.com',
      data: somarDias(norte, 2),
      assunto: 'Consulta sobre certificação e verificação.',
      resultado: 'Proposta enviada e reunião de retorno realizada.',
      follow_up_status: 'concluido',
      follow_up_responsavel_id: USUARIO_COMERCIAL,
      // Prazo vencido COM status concluido: nao e atraso (regra 2). Existe no dataset
      // exatamente para provar isso na tela.
      follow_up_prazo: somarDias(norte, 20),
    }),
    visitaDemo(V_NORTE_FORA_PERIODO, {
      viagem_id: VIAGEM_NORTE,
      organizacao: 'Transportadora Fictícia Delta',
      contato_nome: 'Contato Fictício Delta',
      contato_telefone: '(00) 90000-0004',
      // Data DEPOIS do fim da rodada: quase sempre indica visita pendurada na viagem
      // errada. A tela sinaliza, o banco nao bloqueia (regra 7).
      data: somarDias(norte, 12),
      assunto: 'Emissões de frota e compensação.',
      follow_up_status: 'nao_iniciado',
      follow_up_responsavel_id: USUARIO_COMERCIAL,
      follow_up_prazo: somarDias(hoje(), -5),
    }),
    visitaDemo(V_SUL_EM_DIA, {
      viagem_id: VIAGEM_SUL,
      organizacao: 'Agropecuária Fictícia Épsilon',
      contato_nome: 'Contato Fictício Épsilon',
      contato_telefone: '(00) 90000-0005',
      contato_email: 'contato.epsilon@example.com',
      data: sul,
      assunto: 'Projeto agro com metodologia de solo.',
      resultado: 'Aguardando dados de área para triagem.',
      follow_up_status: 'em_andamento',
      follow_up_responsavel_id: USUARIO_ATUAL,
      follow_up_prazo: somarDias(hoje(), 9),
    }),
    visitaDemo(V_SUL_SEM_PRAZO, {
      viagem_id: VIAGEM_SUL,
      organizacao: 'Cerealista Fictícia Zeta',
      contato_nome: 'Contato Fictício Zeta',
      contato_email: 'contato.zeta@example.com',
      data: sul,
      assunto: 'Inventário de GEE para exigência de comprador.',
      // Aberto COM dono e SEM prazo: sem cobranca por falta de data (regra 3).
      follow_up_status: 'em_andamento',
      follow_up_responsavel_id: USUARIO_COMERCIAL,
      follow_up_prazo: null,
    }),
    visitaDemo(V_SUL_ANONIMIZADA, {
      viagem_id: VIAGEM_SUL,
      organizacao: 'Distribuidora Fictícia Eta',
      // Visita ja anonimizada: o FATO COMERCIAL continua (organizacao, data, assunto,
      // resultado, follow-up), o DADO PESSOAL nao existe mais.
      data: somarDias(sul, 1),
      assunto: 'Primeira conversa sobre crédito de carbono.',
      resultado: 'Sem interesse no momento.',
      follow_up_status: 'descartado',
      follow_up_responsavel_id: USUARIO_COMERCIAL,
      anonimizado_em: '2026-07-10T14:00:00.000Z',
      anonimizado_motivo:
        'Pedido de exclusão do titular recebido pelo canal de privacidade (demonstração).',
    }),
    visitaDemo(V_AVULSA_RETENCAO, {
      // Sem viagem: visita isolada, caso legitimo e presente no historico a importar.
      viagem_id: null,
      organizacao: 'Consultoria Fictícia Teta',
      contato_nome: 'Contato Fictício Teta',
      contato_telefone: '(00) 90000-0008',
      contato_email: 'contato.teta@example.com',
      // Visita antiga: retencao_ate = data + 24 meses ja passou, portanto a rotina de
      // retencao tem o que fazer na demonstracao.
      data: somarDias(hoje(), -800),
      assunto: 'Conversa isolada, fora de rodada.',
      follow_up_status: 'nao_iniciado',
      follow_up_responsavel_id: null,
      follow_up_prazo: null,
    }),
  ];
}

/** Uma linha de auditoria inicial, para a tela de detalhe ter historico a mostrar. */
function auditoriaInicial() {
  return [
    {
      id: '00000000-0000-4000-8000-00000000b001',
      tipo: 'anonimizacao',
      usuario_id: USUARIO_ATUAL,
      visita_id: V_SUL_ANONIMIZADA,
      quantidade_registros: 1,
      incluiu_contatos: true,
      filtros: null,
      motivo:
        'Pedido de exclusão do titular recebido pelo canal de privacidade (demonstração).',
      criado_em: '2026-07-10T14:00:00.000Z',
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
  if (visitas) return;
  viagens = viagensIniciais();
  visitas = visitasIniciais();
  auditoria = auditoriaInicial();
}

/* ===== Busca interna ====================================================== */

function acharVisita(id) {
  const visita = visitas.find((v) => v.id === id);
  if (!visita) throw new ErroDemo('nao_encontrado');
  return visita;
}

function acharViagem(id) {
  const viagem = viagens.find((v) => v.id === id);
  if (!viagem) throw new ErroDemo('nao_encontrado');
  return viagem;
}

const viagemDe = (visita) =>
  visita.viagem_id ? viagens.find((v) => v.id === visita.viagem_id) ?? null : null;

/* ===== Campos derivados (regras 1 a 7) ====================================
   Definicao unica, igual a de carbon_visitas_base. A saida NAO inclui nenhuma coluna de
   contato: so `contato_registrado`, que diz se existe contato sem revelar qual. Toda
   listagem deste arquivo passa por aqui, e e isso que garante que o contato nao vaze
   pela lista nem por acidente.                                                       */
function derivar(visita) {
  const viagem = viagemDe(visita);
  const referencia = hoje();

  const aberto = visita.follow_up_status === 'nao_iniciado'
    || visita.follow_up_status === 'em_andamento';

  const atrasado = aberto
    && Boolean(visita.follow_up_prazo)
    && visita.follow_up_prazo < referencia;

  return {
    id: visita.id,
    viagem_id: visita.viagem_id,
    viagem_titulo: viagem ? viagem.titulo : null,
    viagem_cidade: viagem ? viagem.cidade : null,
    viagem_uf: viagem ? viagem.uf : null,
    viagem_data_inicio: viagem ? viagem.data_inicio : null,
    viagem_data_fim: viagem ? viagem.data_fim : null,
    organizacao: visita.organizacao,
    data: visita.data,
    assunto: visita.assunto,
    resultado: visita.resultado,
    follow_up_status: visita.follow_up_status,
    follow_up_prazo: visita.follow_up_prazo,
    follow_up_responsavel_id: visita.follow_up_responsavel_id,
    follow_up_responsavel_nome: nomeUsuario(visita.follow_up_responsavel_id),
    responsavel_id: visita.responsavel_id,
    responsavel_nome: nomeUsuario(visita.responsavel_id),
    follow_up_aberto: aberto,
    follow_up_atrasado: atrasado,
    dias_atraso: atrasado ? diferencaDias(referencia, visita.follow_up_prazo) : null,
    follow_up_sem_cobranca: aberto
      && (!visita.follow_up_responsavel_id || !visita.follow_up_prazo),
    contato_registrado: Boolean(
      visita.contato_nome || visita.contato_telefone || visita.contato_email,
    ),
    anonimizada: Boolean(visita.anonimizado_em),
    retencao_ate: visita.retencao_ate,
    retencao_vencida: !visita.anonimizado_em && visita.retencao_ate < referencia,
    fora_do_periodo: Boolean(
      viagem
        && (visita.data < viagem.data_inicio
          || visita.data > (viagem.data_fim || viagem.data_inicio)),
    ),
    criado_em: visita.criado_em,
    atualizado_em: visita.atualizado_em,
  };
}

/* ===== Filtro e ordem ===================================================== */

function filtrarVisitas(filtros = {}) {
  const viagemBruta = texto(filtros.viagem_id);
  const semViagem = viagemBruta === 'sem_viagem' || filtros.sem_viagem === true;
  const viagemId = viagemBruta && !['sem_viagem', 'todas', 'todos'].includes(viagemBruta)
    ? viagemBruta
    : null;

  const status = texto(filtros.follow_up_status);
  if (status && !STATUS_VALIDOS.includes(status)) throw new ErroDemo('campo_invalido');

  const situacao = texto(filtros.situacao);
  if (situacao && !SITUACOES_VALIDAS.includes(situacao)) throw new ErroDemo('campo_invalido');

  const organizacao = texto(filtros.organizacao);
  const de = validarDataOpcional(filtros.de);
  const ate = validarDataOpcional(filtros.ate);
  if (de && ate && ate < de) throw new ErroDemo('periodo_invalido');

  return visitas.map(derivar).filter((v) => {
    if (viagemId && v.viagem_id !== viagemId) return false;
    if (semViagem && v.viagem_id) return false;
    if (status && v.follow_up_status !== status) return false;
    if (organizacao) {
      // strpos(lower(...)) da funcao SQL: busca por trecho, sem curinga.
      if (!v.organizacao) return false;
      if (!v.organizacao.toLowerCase().includes(organizacao.toLowerCase())) return false;
    }
    if (de && v.data < de) return false;
    if (ate && v.data > ate) return false;
    if (situacao === 'atrasada' && !v.follow_up_atrasado) return false;
    if (situacao === 'sem_cobranca' && !v.follow_up_sem_cobranca) return false;
    if (situacao === 'aberta' && !v.follow_up_aberto) return false;
    if (situacao === 'anonimizada' && !v.anonimizada) return false;
    if (situacao === 'retencao_vencida' && !v.retencao_vencida) return false;
    return true;
  });
}

/** Ordem da listagem: data desc, criado_em desc (regra 8). */
function ordemListagem(a, b) {
  if (a.data !== b.data) return a.data < b.data ? 1 : -1;
  if (a.criado_em !== b.criado_em) return a.criado_em < b.criado_em ? 1 : -1;
  return 0;
}

function paginacao(filtros = {}, padrao = LIMITE_PAGINA_PADRAO, maximo = LIMITE_PAGINA_MAXIMO) {
  const limiteBruto = Number(filtros.limite);
  const limite = Number.isFinite(limiteBruto) && limiteBruto >= 1
    ? Math.min(Math.floor(limiteBruto), maximo)
    : padrao;
  const paginaBruta = Number(filtros.pagina);
  const pagina = Number.isFinite(paginaBruta) && paginaBruta >= 1 ? Math.floor(paginaBruta) : 1;
  return { limite, pagina, deslocamento: (pagina - 1) * limite };
}

/** Resumo sobre o conjunto FILTRADO, nao sobre a pagina (regra 9). */
function calcularResumoVisitas(lista) {
  const referencia = hoje();
  const prazosFuturos = lista
    .filter((v) => v.follow_up_aberto && v.follow_up_prazo && v.follow_up_prazo >= referencia)
    .map((v) => v.follow_up_prazo)
    .sort();

  const contar = (predicado) => lista.filter(predicado).length;

  return {
    total: lista.length,
    nao_iniciado: contar((v) => v.follow_up_status === 'nao_iniciado'),
    em_andamento: contar((v) => v.follow_up_status === 'em_andamento'),
    concluido: contar((v) => v.follow_up_status === 'concluido'),
    descartado: contar((v) => v.follow_up_status === 'descartado'),
    abertos: contar((v) => v.follow_up_aberto),
    atrasados: contar((v) => v.follow_up_atrasado),
    sem_cobranca: contar((v) => v.follow_up_sem_cobranca),
    contatos_registrados: contar((v) => v.contato_registrado),
    anonimizadas: contar((v) => v.anonimizada),
    retencao_vencida: contar((v) => v.retencao_vencida),
    fora_do_periodo: contar((v) => v.fora_do_periodo),
    proximo_prazo: prazosFuturos.length ? prazosFuturos[0] : null,
  };
}

/* ===== Validacao (mesmos codigos de erro do backend) ====================== */

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

function validarObrigatorio(valor) {
  const limpo = texto(valor);
  if (!limpo) throw new ErroDemo('campo_obrigatorio');
  return limpo;
}

/** Campos de viagem na mesma lista branca do backend. Desconhecido e IGNORADO. */
function camposViagem(dados, modo) {
  const entrada = dados && typeof dados === 'object' ? dados : {};
  const saida = {};

  if (modo === 'criar' || veio(entrada, 'titulo')) {
    saida.titulo = validarObrigatorio(entrada.titulo);
  }
  if (modo === 'criar' || veio(entrada, 'cidade')) {
    saida.cidade = validarObrigatorio(entrada.cidade);
  }
  if (modo === 'criar' || veio(entrada, 'data_inicio')) {
    saida.data_inicio = validarData(entrada.data_inicio);
  }
  if (veio(entrada, 'uf')) {
    const bruto = texto(entrada.uf);
    const uf = bruto ? bruto.toUpperCase() : null;
    if (uf && !UFS_VALIDAS.includes(uf)) throw new ErroDemo('campo_invalido');
    saida.uf = uf;
  }
  if (veio(entrada, 'data_fim')) saida.data_fim = validarDataOpcional(entrada.data_fim);
  if (veio(entrada, 'responsavel_id')) saida.responsavel_id = texto(entrada.responsavel_id);

  return saida;
}

/** Campos de visita na mesma lista branca do backend. Desconhecido e IGNORADO. */
function camposVisita(dados, modo) {
  const entrada = dados && typeof dados === 'object' ? dados : {};
  const saida = {};

  if (modo === 'criar' || veio(entrada, 'organizacao')) {
    saida.organizacao = validarObrigatorio(entrada.organizacao);
  }
  if (modo === 'criar' || veio(entrada, 'data')) saida.data = validarData(entrada.data);

  if (veio(entrada, 'viagem_id')) saida.viagem_id = texto(entrada.viagem_id);
  if (veio(entrada, 'assunto')) saida.assunto = texto(entrada.assunto);
  if (veio(entrada, 'resultado')) saida.resultado = texto(entrada.resultado);

  if (veio(entrada, 'contato_nome')) saida.contato_nome = texto(entrada.contato_nome);
  if (veio(entrada, 'contato_telefone')) {
    const telefone = texto(entrada.contato_telefone);
    if (telefone && !TELEFONE_RE.test(telefone)) throw new ErroDemo('campo_invalido');
    saida.contato_telefone = telefone;
  }
  if (veio(entrada, 'contato_email')) {
    const email = texto(entrada.contato_email);
    if (email && (email.indexOf('@') < 1 || email.includes(' '))) {
      throw new ErroDemo('campo_invalido');
    }
    saida.contato_email = email;
  }

  if (veio(entrada, 'follow_up_status')) {
    const status = texto(entrada.follow_up_status);
    if (!status) throw new ErroDemo('campo_obrigatorio');
    if (!STATUS_VALIDOS.includes(status)) throw new ErroDemo('campo_invalido');
    saida.follow_up_status = status;
  }
  if (veio(entrada, 'follow_up_prazo')) {
    saida.follow_up_prazo = validarDataOpcional(entrada.follow_up_prazo);
  }
  if (veio(entrada, 'follow_up_responsavel_id')) {
    saida.follow_up_responsavel_id = texto(entrada.follow_up_responsavel_id);
  }
  if (veio(entrada, 'responsavel_id')) saida.responsavel_id = texto(entrada.responsavel_id);

  // Atalhos de atribuicao, resolvidos no servidor em producao. Enviar o atalho e o id
  // junto e contradicao, nao conveniencia.
  if (entrada.assumir_follow_up === true) {
    if (veio(entrada, 'follow_up_responsavel_id')) throw new ErroDemo('campo_invalido');
    saida.follow_up_responsavel_id = USUARIO_ATUAL;
  }
  if (entrada.assumir_visita === true) {
    if (veio(entrada, 'responsavel_id')) throw new ErroDemo('campo_invalido');
    saida.responsavel_id = USUARIO_ATUAL;
  }

  return saida;
}

const tentaGravarContato = (campos) =>
  ['contato_nome', 'contato_telefone', 'contato_email'].some(
    (campo) => campos[campo] !== undefined && campos[campo] !== null,
  );

/* ===== Serializacao do detalhe ============================================ */

/**
 * Detalhe de UMA visita.
 *
 * `contato` sai SOMENTE quando o papel permite (regra c do cabecalho), e
 * `contato_registrado` continua dizendo se existe contato cadastrado - e assim que a
 * tela explica a ausencia em vez de sugerir que nao ha nada.
 */
function detalhe(visitaId) {
  const visita = acharVisita(visitaId);
  const derivada = derivar(visita);
  const viagem = viagemDe(visita);
  const visivel = podeVerContato();

  return {
    visita: {
      ...derivada,
      contato_visivel: visivel,
      contato: visivel && derivada.contato_registrado
        ? {
            nome: visita.contato_nome,
            telefone: visita.contato_telefone,
            email: visita.contato_email,
          }
        : null,
      anonimizado_em: visita.anonimizado_em,
      anonimizado_motivo: visita.anonimizado_motivo,
    },
    viagem: viagem
      ? {
          id: viagem.id,
          titulo: viagem.titulo,
          cidade: viagem.cidade,
          uf: viagem.uf,
          data_inicio: viagem.data_inicio,
          data_fim: viagem.data_fim,
          responsavel_id: viagem.responsavel_id,
          responsavel_nome: nomeUsuario(viagem.responsavel_id),
        }
      : null,
    auditoria: auditoria
      .filter((a) => a.visita_id === visitaId)
      .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1))
      .map((a) => ({
        id: a.id,
        tipo: a.tipo,
        motivo: a.motivo,
        usuario_nome: nomeUsuario(a.usuario_id),
        criado_em: a.criado_em,
      })),
  };
}

/* ===== Funcoes que imitam o backend: viagens ============================== */

/** GET /viagens. Agregados pelas MESMAS definicoes da lista de visitas (regra 10). */
export async function demoListarViagens(filtros = {}) {
  await esperar();
  semear();

  const ufBruta = texto(filtros.uf);
  const uf = ufBruta ? ufBruta.toUpperCase() : null;
  if (uf && !UFS_VALIDAS.includes(uf)) throw new ErroDemo('campo_invalido');

  const cidade = texto(filtros.cidade);
  const de = validarDataOpcional(filtros.de);
  const ate = validarDataOpcional(filtros.ate);
  if (de && ate && ate < de) throw new ErroDemo('periodo_invalido');

  const derivadas = visitas.map(derivar);

  const filtradas = viagens.filter((vg) => {
    if (uf && vg.uf !== uf) return false;
    if (cidade && !vg.cidade.toLowerCase().includes(cidade.toLowerCase())) return false;
    // Interseccao com a janela pedida, e nao "inicio dentro da janela" (regra 11).
    if (ate && vg.data_inicio > ate) return false;
    if (de && (vg.data_fim || vg.data_inicio) < de) return false;
    return true;
  });

  const comAgregados = filtradas.map((vg) => {
    const daViagem = derivadas.filter((v) => v.viagem_id === vg.id);
    return {
      ...vg,
      responsavel_nome: nomeUsuario(vg.responsavel_id),
      visitas_total: daViagem.length,
      follow_up_abertos: daViagem.filter((v) => v.follow_up_aberto).length,
      follow_up_atrasados: daViagem.filter((v) => v.follow_up_atrasado).length,
      follow_up_sem_cobranca: daViagem.filter((v) => v.follow_up_sem_cobranca).length,
      follow_up_concluidos: daViagem.filter((v) => v.follow_up_status === 'concluido').length,
      contatos_registrados: daViagem.filter((v) => v.contato_registrado).length,
      fora_do_periodo: daViagem.filter((v) => v.fora_do_periodo).length,
    };
  });

  const ordenadas = [...comAgregados].sort((a, b) => {
    if (a.data_inicio !== b.data_inicio) return a.data_inicio < b.data_inicio ? 1 : -1;
    if (a.criado_em !== b.criado_em) return a.criado_em < b.criado_em ? 1 : -1;
    return 0;
  });

  const { limite, pagina, deslocamento } = paginacao(filtros);
  const soma = (campo) => comAgregados.reduce((acc, v) => acc + v[campo], 0);

  return {
    viagens: ordenadas.slice(deslocamento, deslocamento + limite),
    total: comAgregados.length,
    resumo: {
      total: comAgregados.length,
      visitas_total: soma('visitas_total'),
      follow_up_atrasados: soma('follow_up_atrasados'),
      follow_up_sem_cobranca: soma('follow_up_sem_cobranca'),
    },
    pagina,
    limite,
  };
}

/** POST /viagens */
export async function demoCriarViagem(dados) {
  await esperar();
  semear();
  exigirEscrita();

  const campos = camposViagem(dados, 'criar');
  if (campos.data_fim && campos.data_fim < campos.data_inicio) {
    throw new ErroDemo('periodo_invalido');
  }

  const criadoEm = agora();
  const viagem = {
    id: novoId(),
    titulo: campos.titulo,
    cidade: campos.cidade,
    uf: campos.uf ?? null,
    data_inicio: campos.data_inicio,
    data_fim: campos.data_fim ?? null,
    responsavel_id: campos.responsavel_id ?? null,
    criado_em: criadoEm,
    atualizado_em: criadoEm,
  };

  viagens = [...viagens, viagem];
  return { viagem: { ...viagem, responsavel_nome: nomeUsuario(viagem.responsavel_id) } };
}

/** PATCH /viagens/:id */
export async function demoAtualizarViagem(id, dados) {
  await esperar();
  semear();
  exigirEscrita();

  const viagem = acharViagem(id);
  const campos = camposViagem(dados, 'atualizar');
  if (Object.keys(campos).length === 0) throw new ErroDemo('nada_para_atualizar');

  const inicio = campos.data_inicio ?? viagem.data_inicio;
  const fim = veio(campos, 'data_fim') ? campos.data_fim : viagem.data_fim;
  if (fim && fim < inicio) throw new ErroDemo('periodo_invalido');

  Object.assign(viagem, campos);
  viagem.atualizado_em = agora();

  return { viagem: { ...viagem, responsavel_nome: nomeUsuario(viagem.responsavel_id) } };
}

/* ===== Funcoes que imitam o backend: visitas ============================== */

/** GET /visitas. NUNCA devolve contato (ver derivar). */
export async function demoListarVisitas(filtros = {}) {
  await esperar();
  semear();

  const filtradas = filtrarVisitas(filtros);
  const { limite, pagina, deslocamento } = paginacao(filtros);
  const ordenadas = [...filtradas].sort(ordemListagem);

  return {
    visitas: ordenadas.slice(deslocamento, deslocamento + limite),
    total: filtradas.length,
    resumo: calcularResumoVisitas(filtradas),
    pagina,
    limite,
  };
}

/** GET /visitas/:id */
export async function demoObterVisita(id) {
  await esperar();
  semear();
  return detalhe(id);
}

/** POST /visitas - devolve o DETALHE, como a rota. */
export async function demoCriarVisita(dados) {
  await esperar();
  semear();
  exigirEscrita();

  const campos = camposVisita(dados, 'criar');
  if (campos.viagem_id) acharViagem(campos.viagem_id); // imita a chave estrangeira

  const criadoEm = agora();
  const visita = {
    id: novoId(),
    viagem_id: campos.viagem_id ?? null,
    organizacao: campos.organizacao,
    contato_nome: campos.contato_nome ?? null,
    contato_telefone: campos.contato_telefone ?? null,
    contato_email: campos.contato_email ?? null,
    data: campos.data,
    assunto: campos.assunto ?? null,
    resultado: campos.resultado ?? null,
    follow_up_status: campos.follow_up_status ?? 'nao_iniciado',
    follow_up_responsavel_id: campos.follow_up_responsavel_id ?? null,
    follow_up_prazo: campos.follow_up_prazo ?? null,
    responsavel_id: campos.responsavel_id ?? null,
    // Regra 12: a trigger do banco preenche o prazo de retencao a partir da data da
    // visita. Sem isso a tela mostraria retencao vazia num registro com dado pessoal.
    retencao_ate: somarMeses(campos.data, RETENCAO_MESES),
    anonimizado_em: null,
    anonimizado_motivo: null,
    criado_em: criadoEm,
    atualizado_em: criadoEm,
  };

  visitas = [...visitas, visita];
  return detalhe(visita.id);
}

/** PATCH /visitas/:id - devolve o DETALHE, como a rota. */
export async function demoAtualizarVisita(id, dados) {
  await esperar();
  semear();
  exigirEscrita();

  const visita = acharVisita(id);
  const campos = camposVisita(dados, 'atualizar');
  if (Object.keys(campos).length === 0) throw new ErroDemo('nada_para_atualizar');
  if (campos.viagem_id) acharViagem(campos.viagem_id);

  // Regra 13: anonimizacao e irreversivel. A tela nao pode dizer "salvo" e a pessoa
  // acreditar que o contato voltou.
  if (visita.anonimizado_em && tentaGravarContato(campos)) {
    throw new ErroDemo('visita_anonimizada');
  }

  Object.assign(visita, campos);

  // Imita a trigger: em visita anonimizada o contato permanece nulo, aconteca o que
  // acontecer no UPDATE.
  if (visita.anonimizado_em) {
    visita.contato_nome = null;
    visita.contato_telefone = null;
    visita.contato_email = null;
  }

  visita.atualizado_em = agora();
  return detalhe(id);
}

/* ===== Funcoes que imitam o backend: LGPD ================================= */

/** POST /visitas/:id/anonimizar (regra 13). */
export async function demoAnonimizarVisita(id, motivo) {
  await esperar();
  semear();
  exigirEscrita();

  const limpo = texto(motivo);
  if (!limpo) throw new ErroDemo('motivo_obrigatorio');

  const visita = acharVisita(id);

  if (visita.anonimizado_em) {
    // Idempotente: nao gera log novo nem reescreve o carimbo original, que e a data em
    // que o titular foi atendido.
    return {
      anonimizada: true,
      ja_estava: true,
      visita_id: id,
      anonimizado_em: visita.anonimizado_em,
    };
  }

  visita.contato_nome = null;
  visita.contato_telefone = null;
  visita.contato_email = null;
  visita.anonimizado_em = agora();
  visita.anonimizado_motivo = limpo;
  visita.atualizado_em = visita.anonimizado_em;

  auditoria = [
    ...auditoria,
    {
      id: novoId(),
      tipo: 'anonimizacao',
      usuario_id: USUARIO_ATUAL,
      visita_id: id,
      quantidade_registros: 1,
      incluiu_contatos: true,
      filtros: null,
      motivo: limpo,
      criado_em: visita.anonimizado_em,
    },
  ];

  return { anonimizada: true, ja_estava: false, visita_id: id };
}

/** POST /visitas/anonimizar-vencidas (regra 14). */
export async function demoAnonimizarVencidas(limite) {
  await esperar();
  semear();
  exigirEscrita();

  const bruto = Number(limite);
  const teto = Number.isFinite(bruto) && bruto >= 1
    ? Math.min(Math.floor(bruto), LIMITE_RETENCAO_MAXIMO)
    : 500;

  const referencia = hoje();
  const alvos = visitas
    .filter(
      (v) =>
        !v.anonimizado_em
        && v.retencao_ate < referencia
        && (v.contato_nome || v.contato_telefone || v.contato_email),
    )
    .sort((a, b) => (a.retencao_ate < b.retencao_ate ? -1 : 1))
    .slice(0, teto);

  if (alvos.length === 0) {
    // Execucao sem efeito NAO gera log, como no banco.
    return { anonimizadas: 0, referencia, limite: teto };
  }

  const quando = agora();
  const motivo = 'Prazo de retenção vencido (retencao_ate anterior à data de execução).';

  for (const visita of alvos) {
    visita.contato_nome = null;
    visita.contato_telefone = null;
    visita.contato_email = null;
    visita.anonimizado_em = quando;
    visita.anonimizado_motivo = motivo;
    visita.atualizado_em = quando;
  }

  auditoria = [
    ...auditoria,
    {
      id: novoId(),
      tipo: 'anonimizacao_retencao',
      usuario_id: USUARIO_ATUAL,
      visita_id: null,
      quantidade_registros: alvos.length,
      incluiu_contatos: true,
      filtros: { retencao_ate_antes_de: referencia, limite: teto },
      motivo: 'Rotina de retenção: contato apagado por prazo vencido.',
      criado_em: quando,
    },
  ];

  return { anonimizadas: alvos.length, referencia, limite: teto };
}

/**
 * POST /visitas/exportacao (regra 15).
 *
 * A auditoria e gravada AQUI, junto do resultado, imitando a funcao SQL que faz as duas
 * coisas na mesma transacao. Se a revisao exportar duas vezes, aparecem duas linhas no
 * historico: e esse o comportamento de producao.
 */
export async function demoExportarVisitas(opcoes = {}) {
  await esperar();
  semear();
  exigirEscrita();

  const incluirContatos = opcoes.incluir_contatos === true;
  const motivo = texto(opcoes.motivo);
  if (incluirContatos && !motivo) throw new ErroDemo('motivo_obrigatorio');
  if (incluirContatos && !podeVerContato()) throw new ErroDemo('sem_permissao');

  const bruto = Number(opcoes.limite);
  const teto = Number.isFinite(bruto) && bruto >= 1
    ? Math.min(Math.floor(bruto), LIMITE_EXPORTACAO_MAXIMO)
    : LIMITE_EXPORTACAO_PADRAO;

  const filtradas = filtrarVisitas(opcoes);
  const ordenadas = [...filtradas].sort(ordemListagem).slice(0, teto);

  const registros = ordenadas.map((linha) => {
    if (!incluirContatos) return linha;
    const original = visitas.find((v) => v.id === linha.id);
    return {
      ...linha,
      contato_nome: original?.contato_nome ?? null,
      contato_telefone: original?.contato_telefone ?? null,
      contato_email: original?.contato_email ?? null,
    };
  });

  const filtros = {
    viagem_id: texto(opcoes.viagem_id),
    sem_viagem: opcoes.sem_viagem === true || texto(opcoes.viagem_id) === 'sem_viagem',
    follow_up_status: texto(opcoes.follow_up_status),
    organizacao: texto(opcoes.organizacao),
    situacao: texto(opcoes.situacao),
    de: texto(opcoes.de),
    ate: texto(opcoes.ate),
    limite: teto,
  };

  const registro = {
    id: novoId(),
    tipo: 'exportacao',
    usuario_id: USUARIO_ATUAL,
    visita_id: null,
    quantidade_registros: registros.length,
    incluiu_contatos: incluirContatos,
    filtros,
    motivo,
    criado_em: agora(),
  };
  auditoria = [...auditoria, registro];

  return {
    registros,
    total: registros.length,
    incluiu_contatos: incluirContatos,
    exportacao_id: registro.id,
    filtros,
  };
}

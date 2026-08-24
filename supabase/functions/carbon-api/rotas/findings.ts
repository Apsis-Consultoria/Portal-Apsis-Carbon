// -----------------------------------------------------------------------------
// Rotas de findings de auditoria - VVB, Verra e BeZero (issue #5).
// -----------------------------------------------------------------------------
// GET    carbon-api/projetos/:id/findings            -> { rodadas, findings, progresso }
//        query: ?origem=vvb|verra|bezero (opcional)
// POST   carbon-api/projetos/:id/auditoria-rodadas   -> { rodada } (201)
// PATCH  carbon-api/auditoria-rodadas/:id            -> { rodada }
// POST   carbon-api/auditoria-rodadas/:id/findings   -> { finding } (201)
// PATCH  carbon-api/findings/:id                     -> { finding }
// POST   carbon-api/findings/:id/subitens            -> { criados, finding }
// PATCH  carbon-api/finding-subitens/:id             -> { finding }
// DELETE carbon-api/finding-subitens/:id             -> { finding }
//
// Objetos SQL de que este modulo depende (migration 20260814093000_findings):
//   public.carbon_auditoria_rodada_criar(uuid, text, date, date, text, uuid) -> jsonb
//   public.carbon_finding_json(uuid)                                        -> jsonb
//   public.carbon_findings_do_projeto(uuid, text)                           -> jsonb
//   (carbon_findings_progresso e chamada por carbon_findings_do_projeto)
//
// POR QUE TODA ESCRITA DEVOLVE O FINDING INTEIRO (e nao a linha alterada). O
// progresso do finding e derivado dos subitens, portanto marcar um subitem muda o
// finding. Devolver so o subitem obrigaria a tela a recalcular o progresso em
// JavaScript - a mesma regra em dois lugares, que e exatamente o que a funcao SQL
// carbon_finding_json existe para evitar. A forma canonica do finding e definida no
// banco, uma vez, e todas as respostas passam por ela.
//
// DELETE existe SOMENTE para subitem. Rodada e finding sao material de auditoria e
// nao se apagam: finding cadastrado por engano recebe estado 'nao_aplicavel', que ja
// e estado de primeira classe (a base da BeZero usa 'Nao se aplica'), sai do
// denominador do progresso e preserva a trilha.
//
// CONTROLE DE ACESSO - PENDENCIA QUE VALE ESPECIALMENTE AQUI. Findings tratam de
// material de auditoria com comunidade indigena: territorio, acordos com
// associacoes, reparticao de beneficios e processos de consentimento livre, previo e
// informado. A regra vigente no index.ts libera LEITURA para qualquer colaborador
// ativo do dominio (ver o comentario de PAPEIS_ESCRITA), o que e frouxo demais para
// este conteudo: estas rotas sao candidatas declaradas a restricao por projeto e por
// papel, com trilha de acesso. A decisao e do dono e NAO foi tomada aqui.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { respostaErro, respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';
import {
  ErroRota,
  type ErroBanco,
  lancarErroEscrita,
  lerData,
  lerEnum,
  lerListaDeTexto,
  lerNumero,
  lerTexto,
  lerUuid,
  LIMITE_ITENS_LISTA,
  LIMITE_TEXTO_CURTO,
  LIMITE_TEXTO_LONGO,
  paraNumero,
  veioNoCorpo,
} from './helpers.ts';
import { lerProjetoVisivel } from './projetos.ts';

// -----------------------------------------------------------------------------
// Vocabulario, espelhando os CHECKs da migration
// -----------------------------------------------------------------------------

const ORIGENS = new Set(['vvb', 'verra', 'bezero']);

// car = Corrective Action Request, cl = Clarification Request. Vocabulario da VVB.
// A BeZero nao classifica seus itens (a base dela nao tem a coluna), por isso tipo
// aceita null: inventar um terceiro valor criaria vocabulario que ninguem usa.
const TIPOS = new Set(['car', 'cl']);

const DOCUMENTOS = new Set(['pdd', 'monitoramento', 'outro']);

const ESTADOS = new Set([
  'aberto',
  'em_andamento',
  'aguardando_terceiro',
  'respondido',
  'fechado',
  'nao_aplicavel',
]);

const ESTADOS_EVIDENCIA = new Set(['pendente', 'ok', 'nao_aplicavel']);

const ESTADO_AGUARDANDO = 'aguardando_terceiro';

const COLUNAS_RODADA =
  'id, projeto_id, origem, numero, data_recebimento, data_resposta, observacoes, ' +
  'criado_por, criado_em, atualizado_em';

type LinhaRodada = { id: string; projeto_id: string; origem: string } & Record<string, unknown>;
type LinhaFinding = { id: string; rodada_id: string; estado: string } & Record<string, unknown>;
type LinhaSubitem = { id: string; finding_id: string } & Record<string, unknown>;

// -----------------------------------------------------------------------------
// Leitores auxiliares
// -----------------------------------------------------------------------------

/**
 * Inteiro nao negativo (ordem do finding, ordem do subitem).
 *
 * lerNumero aceita decimal porque foi escrito para area em hectares. Aqui 3,5 nao e
 * "quase 4": e erro de digitacao, e truncar em silencio esconderia isso.
 */
function lerInteiro(valor: unknown, campo: string): number | null {
  const n = lerNumero(valor, campo);
  if (n === null) return null;
  if (!Number.isInteger(n)) throw new ErroRota('campo_invalido', 400, campo);
  return n;
}

/** Rodada pelo id, ou null. Serve de checagem de existencia antes de escrever. */
async function lerRodada(admin: SupabaseClient, id: string): Promise<LinhaRodada | null> {
  const { data, error } = await admin
    .from('carbon_auditoria_rodadas')
    .select(COLUNAS_RODADA)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_auditoria_rodadas:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return (data as LinhaRodada | null) ?? null;
}

/** Finding pelo id, com as colunas de que a validacao de escrita precisa. */
async function lerFindingCru(admin: SupabaseClient, id: string): Promise<LinhaFinding | null> {
  const { data, error } = await admin
    .from('carbon_findings')
    .select('id, rodada_id, estado, aguardando_quem')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_findings:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return (data as LinhaFinding | null) ?? null;
}

async function lerSubitem(admin: SupabaseClient, id: string): Promise<LinhaSubitem | null> {
  const { data, error } = await admin
    .from('carbon_finding_subitens')
    .select('id, finding_id, descricao, concluido, ordem')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_finding_subitens:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return (data as LinhaSubitem | null) ?? null;
}

/**
 * Finding na forma canonica do banco (campos, capitulo vinculado, subitens e o
 * progresso agregado). Usada por TODAS as respostas de escrita.
 */
async function lerFindingJson(admin: SupabaseClient, id: string): Promise<unknown> {
  const { data, error } = await admin.rpc('carbon_finding_json', { p_finding_id: id });
  if (error) {
    console.error('Falha em carbon_finding_json:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return data ?? null;
}

/** Resposta padrao de escrita de finding e de subitem. */
async function respostaFinding(
  admin: SupabaseClient,
  findingId: string,
  extra: Record<string, unknown> = {},
  status = 200,
): Promise<Response> {
  const finding = await lerFindingJson(admin, findingId);
  if (!finding) return respostaErro('nao_encontrado', 404);
  return respostaJson({ ...extra, finding }, status);
}

/**
 * Regra do estado de espera: 'aguardando_terceiro' exige saber por QUEM se espera.
 *
 * Existe porque no Notion o finding parava sem dono aparente, com o encaminhamento
 * escondido no meio do campo de comentarios. O banco tambem tem o check
 * (carbon_findings_aguardando_quem_chk), mas ele devolveria 23514 sem dizer qual
 * campo faltou; validar aqui produz 'campo_obrigatorio' com o detalhe certo.
 *
 * `atual` cobre o PATCH que muda so um dos dois campos: mudar o estado para
 * aguardando_terceiro sem tocar em aguardando_quem tem de olhar o valor que ja
 * esta gravado.
 */
function conferirAguardando(
  dados: Record<string, unknown>,
  atual: { estado?: unknown; aguardando_quem?: unknown } | null,
): void {
  const estado = veioNoCorpo(dados, 'estado') ? dados.estado : atual?.estado;
  if (estado !== ESTADO_AGUARDANDO) return;

  const quem = veioNoCorpo(dados, 'aguardando_quem')
    ? dados.aguardando_quem
    : atual?.aguardando_quem;

  if (typeof quem !== 'string' || quem.trim() === '') {
    throw new ErroRota('campo_obrigatorio', 400, 'aguardando_quem');
  }
}

/**
 * Monta o objeto de gravacao de carbon_findings por LISTA BRANCA explicita.
 *
 * Campo a campo, e nao com o helper listaBranca(), porque cada um tem validador
 * proprio (enum, uuid, inteiro, texto curto, texto longo). Campo desconhecido no
 * corpo e ignorado, e nenhuma coluna nova da tabela passa a ser gravavel sem que
 * alguem escreva a linha aqui: sem isso um corpo com { criado_por, criado_em,
 * rodada_id } reescreveria autoria e mudaria o finding de rodada.
 *
 * @param modo 'criar' exige descricao_en; 'atualizar' toca so o que veio no corpo.
 */
function montarDadosFinding(
  corpo: Record<string, unknown>,
  modo: 'criar' | 'atualizar',
): Record<string, unknown> {
  const dados: Record<string, unknown> = {};

  // Conteudo. Textos longos: apontamento e exigencia chegam em ingles, o plano de
  // resposta e escrito em portugues e a resposta oficial volta em ingles. O idioma
  // esta no NOME da coluna de proposito, e nao ha coluna bilingue.
  if (modo === 'criar' || veioNoCorpo(corpo, 'descricao_en')) {
    const descricao = lerTexto(corpo.descricao_en, 'descricao_en', LIMITE_TEXTO_LONGO);
    // NOT NULL no banco: finding sem apontamento nao e finding. Vale tambem no
    // PATCH, para ninguem esvaziar o campo depois.
    if (!descricao) throw new ErroRota('campo_obrigatorio', 400, 'descricao_en');
    dados.descricao_en = descricao;
  }

  for (const campo of ['acao_exigida_en', 'plano_resposta_pt', 'resposta_oficial_en']) {
    if (veioNoCorpo(corpo, campo)) {
      dados[campo] = lerTexto(corpo[campo], campo, LIMITE_TEXTO_LONGO);
    }
  }

  // Classificacao.
  if (veioNoCorpo(corpo, 'tipo')) {
    // null limpa: e o caso normal dos itens da BeZero, que nao sao CAR nem CL.
    dados.tipo = lerEnum(corpo.tipo, TIPOS, 'campo_invalido', 'tipo');
  }
  if (veioNoCorpo(corpo, 'documento_alvo')) {
    const documento = lerEnum(corpo.documento_alvo, DOCUMENTOS, 'campo_invalido', 'documento_alvo');
    // NOT NULL com default no banco: null aqui significa "volta para o default".
    dados.documento_alvo = documento ?? 'outro';
  }
  if (veioNoCorpo(corpo, 'identificador')) {
    dados.identificador = lerTexto(corpo.identificador, 'identificador', LIMITE_TEXTO_CURTO);
  }
  if (veioNoCorpo(corpo, 'ordem')) {
    dados.ordem = lerInteiro(corpo.ordem, 'ordem');
  }

  // Onde o finding pega.
  if (veioNoCorpo(corpo, 'capitulo_ref')) {
    dados.capitulo_ref = lerTexto(corpo.capitulo_ref, 'capitulo_ref', LIMITE_TEXTO_CURTO);
  }
  if (veioNoCorpo(corpo, 'capitulo_pdd_id')) {
    dados.capitulo_pdd_id = lerUuid(corpo.capitulo_pdd_id, 'capitulo_pdd_id');
  }
  if (veioNoCorpo(corpo, 'capitulo_mr_id')) {
    // Sem FK no banco enquanto a tabela de capitulos do monitoramento (issue #3)
    // nao existe, portanto aqui so conferimos o formato.
    dados.capitulo_mr_id = lerUuid(corpo.capitulo_mr_id, 'capitulo_mr_id');
  }

  // Estado. Os dois eixos sao independentes de proposito: resposta redigida e
  // evidencia aceita nao andam juntas na base real.
  if (veioNoCorpo(corpo, 'estado')) {
    const estado = lerEnum(corpo.estado, ESTADOS, 'campo_invalido', 'estado');
    if (!estado) throw new ErroRota('campo_invalido', 400, 'estado');
    dados.estado = estado;
  }
  if (veioNoCorpo(corpo, 'estado_evidencia')) {
    const evidencia = lerEnum(
      corpo.estado_evidencia,
      ESTADOS_EVIDENCIA,
      'campo_invalido',
      'estado_evidencia',
    );
    if (!evidencia) throw new ErroRota('campo_invalido', 400, 'estado_evidencia');
    dados.estado_evidencia = evidencia;
  }
  if (veioNoCorpo(corpo, 'responsavel_id')) {
    dados.responsavel_id = lerUuid(corpo.responsavel_id, 'responsavel_id');
  }
  if (veioNoCorpo(corpo, 'aguardando_quem')) {
    // LGPD: aqui vai AREA (juridico, geoprocessamento, parceiro), nunca o nome de
    // uma pessoa. O limite curto reforca que nao e campo de texto corrido.
    dados.aguardando_quem = lerTexto(corpo.aguardando_quem, 'aguardando_quem', LIMITE_TEXTO_CURTO);
  }

  return dados;
}

// -----------------------------------------------------------------------------
// Handlers - leitura
// -----------------------------------------------------------------------------

/**
 * Carga da tela: rodadas, findings e os contadores das seis visoes.
 *
 * Uma chamada so, sem paginacao: as seis visoes que a equipe usa (lista, board por
 * estado, por rodada, por estado de evidencia, por tipo e por origem) sao recortes
 * do MESMO conjunto, e agrupar exige o conjunto inteiro. O volume e pequeno por
 * natureza: 95 + 6 + 31 registros no projeto mais movimentado da base real.
 */
async function obterFindings(ctx: Contexto): Promise<Response> {
  const projetoId = ctx.params.id;
  const projeto = await lerProjetoVisivel(ctx, projetoId);
  if (!projeto) return respostaErro('nao_encontrado', 404);

  // ?origem= e filtro, nao obrigacao. Valor torto e recusado em vez de ignorado:
  // devolver o conjunto inteiro para quem pediu um recorte especifico seria mostrar
  // material de outra origem sem a pessoa perceber.
  const origemBruta = ctx.url.searchParams.get('origem');
  let origem: string | null = null;
  if (origemBruta !== null && origemBruta !== '') {
    if (!ORIGENS.has(origemBruta)) throw new ErroRota('campo_invalido', 400, 'origem');
    origem = origemBruta;
  }

  const { data, error } = await ctx.admin.rpc('carbon_findings_do_projeto', {
    p_projeto_id: projetoId,
    p_origem: origem,
  });

  if (error) {
    console.error('Falha em carbon_findings_do_projeto:', error.message);
    return respostaErro('erro_interno', 500);
  }

  // A funcao SQL nunca devolve NULL para projeto sem finding (listas vazias e
  // progresso zerado), mas o fallback existe para a tela nunca receber undefined.
  return respostaJson(
    data ?? { rodadas: [], findings: [], progresso: null },
  );
}

// -----------------------------------------------------------------------------
// Handlers - rodadas de auditoria
// -----------------------------------------------------------------------------

/**
 * Cria a proxima rodada do par projeto + origem.
 *
 * `numero` NAO vem do corpo: e sequencia, nao escolha. Quem calcula e a funcao SQL
 * carbon_auditoria_rodada_criar, num insert unico com max + 1, para duas pessoas
 * criando a rodada ao mesmo tempo nao gerarem numero repetido nem buraco na
 * sequencia.
 */
async function criarRodada(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const projetoId = ctx.params.id;

  const projeto = await lerProjetoVisivel(ctx, projetoId);
  if (!projeto) return respostaErro('nao_encontrado', 404);

  const origem = lerEnum(corpo.origem, ORIGENS, 'campo_invalido', 'origem');
  if (!origem) throw new ErroRota('campo_obrigatorio', 400, 'origem');

  const { data, error } = await ctx.admin.rpc('carbon_auditoria_rodada_criar', {
    p_projeto_id: projetoId,
    p_origem: origem,
    p_data_recebimento: lerData(corpo.data_recebimento, 'data_recebimento'),
    p_data_resposta: lerData(corpo.data_resposta, 'data_resposta'),
    p_observacoes: lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO),
    p_criado_por: ctx.registro.id,
  });

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_auditoria_rodada_criar');
  if (!data) return respostaErro('erro_interno', 500);

  return respostaJson({ rodada: data }, 201);
}

/**
 * Atualiza a rodada. Lista branca curta: projeto, origem e numero definem a
 * IDENTIDADE da rodada e nao se editam - mover findings de processo ou renumerar
 * rodada quebraria toda a referencia externa ("resposta a rodada 2 da VVB").
 */
async function atualizarRodada(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const dados: Record<string, unknown> = {};

  if (veioNoCorpo(corpo, 'data_recebimento')) {
    dados.data_recebimento = lerData(corpo.data_recebimento, 'data_recebimento');
  }
  if (veioNoCorpo(corpo, 'data_resposta')) {
    dados.data_resposta = lerData(corpo.data_resposta, 'data_resposta');
  }
  if (veioNoCorpo(corpo, 'observacoes')) {
    dados.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO);
  }

  if (Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }

  const { data, error } = await ctx.admin
    .from('carbon_auditoria_rodadas')
    .update(dados)
    .eq('id', ctx.params.id)
    .select(COLUNAS_RODADA)
    .maybeSingle();

  // O check de datas (resposta nunca antes do recebimento) chega como 23514.
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_auditoria_rodadas', 'periodo_invalido');
  if (!data) return respostaErro('nao_encontrado', 404);

  return respostaJson({ rodada: data });
}

// -----------------------------------------------------------------------------
// Handlers - findings
// -----------------------------------------------------------------------------

async function criarFinding(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const rodadaId = ctx.params.id;

  // A rodada e o vinculo com o projeto e com a origem: sem ela o finding nao tem
  // onde pertencer, e um rodada_id inexistente daria 23503 sem 404.
  const rodada = await lerRodada(ctx.admin, rodadaId);
  if (!rodada) return respostaErro('nao_encontrado', 404);

  const dados = montarDadosFinding(corpo, 'criar');
  conferirAguardando(dados, null);

  const { data, error } = await ctx.admin
    .from('carbon_findings')
    .insert({ ...dados, rodada_id: rodadaId, criado_por: ctx.registro.id })
    .select('id')
    .single();

  if (error || !data) {
    lancarErroEscrita(
      (error ?? { message: 'insert sem retorno' }) as ErroBanco,
      'carbon_findings',
    );
  }

  return respostaFinding(ctx.admin, (data as { id: string }).id, {}, 201);
}

async function atualizarFinding(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const findingId = ctx.params.id;

  // Lido ANTES de validar: a regra do 'aguardando_terceiro' depende do valor que
  // ja esta gravado quando o PATCH manda so um dos dois campos.
  const atual = await lerFindingCru(ctx.admin, findingId);
  if (!atual) return respostaErro('nao_encontrado', 404);

  const dados = montarDadosFinding(corpo, 'atualizar');
  if (Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }
  conferirAguardando(dados, atual);

  const { data, error } = await ctx.admin
    .from('carbon_findings')
    .update(dados)
    .eq('id', findingId)
    .select('id')
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_findings');
  if (!data) return respostaErro('nao_encontrado', 404);

  return respostaFinding(ctx.admin, findingId);
}

// -----------------------------------------------------------------------------
// Handlers - subitens verificaveis
// -----------------------------------------------------------------------------

/**
 * Cria subitens de um finding, um ou muitos.
 *
 * O LOTE E O PONTO. Na base real a resposta de um finding e uma lista de dezenas de
 * linhas digitadas dentro do campo de comentarios ('2.3.12 - Sem italico OK',
 * 'Figure 1 - Ingles OK'). Aceitar `descricoes` como lista permite colar essa lista
 * de uma vez e transformar cada linha num item verificavel, que e a migracao do
 * jeito antigo para o novo sem retrabalho.
 *
 * Aceita `{ descricao }` (um item) ou `{ descricoes: [...] }` (lote, ate
 * LIMITE_ITENS_LISTA itens). A `ordem` continua a numeracao que o finding ja tem, e
 * preserva a ordem da lista colada - que normalmente e a ordem do documento.
 */
async function criarSubitens(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const findingId = ctx.params.id;

  const finding = await lerFindingCru(ctx.admin, findingId);
  if (!finding) return respostaErro('nao_encontrado', 404);

  const descricoes = veioNoCorpo(corpo, 'descricoes')
    ? lerListaDeTexto(corpo.descricoes, 'descricoes')
    : [];

  const unica = lerTexto(corpo.descricao, 'descricao', LIMITE_TEXTO_CURTO);
  if (unica) descricoes.push(unica);

  if (descricoes.length === 0) throw new ErroRota('campo_obrigatorio', 400, 'descricao');
  if (descricoes.length > LIMITE_ITENS_LISTA) {
    throw new ErroRota('campo_invalido', 400, 'descricoes');
  }

  // Proxima ordem = maior existente + 1. Uma consulta a mais por lote inteiro,
  // nao por item. Sem unique em (finding_id, ordem) de proposito: duas inclusoes
  // simultaneas empatarem na ordem nao e erro, e o desempate e criado_em.
  const { data: ultimo, error: erroOrdem } = await ctx.admin
    .from('carbon_finding_subitens')
    .select('ordem')
    .eq('finding_id', findingId)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erroOrdem) {
    console.error('Falha ao ler a ordem dos subitens:', erroOrdem.message);
    throw new ErroRota('erro_interno', 500);
  }

  const base = (paraNumero((ultimo as { ordem?: unknown } | null)?.ordem) ?? -1) + 1;

  const linhas = descricoes.map((descricao, i) => ({
    finding_id: findingId,
    descricao,
    ordem: base + i,
  }));

  const { data, error } = await ctx.admin
    .from('carbon_finding_subitens')
    .insert(linhas)
    .select('id');

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_finding_subitens');

  const criados = Array.isArray(data) ? data.length : 0;
  return respostaFinding(ctx.admin, findingId, { criados }, 201);
}

/**
 * Marca, desmarca ou renomeia um subitem.
 *
 * Devolve o FINDING, nao o subitem: marcar um item muda o progresso agregado, e a
 * tela precisa do numero novo sem uma segunda chamada.
 */
async function atualizarSubitem(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const subitem = await lerSubitem(ctx.admin, ctx.params.id);
  if (!subitem) return respostaErro('nao_encontrado', 404);

  const dados: Record<string, unknown> = {};

  if (veioNoCorpo(corpo, 'concluido')) {
    // Booleano de verdade: 'true' como string ou 1 seriam gravados como true pelo
    // Postgres e esconderiam um bug no cliente.
    if (typeof corpo.concluido !== 'boolean') {
      throw new ErroRota('campo_invalido', 400, 'concluido');
    }
    dados.concluido = corpo.concluido;
  }
  if (veioNoCorpo(corpo, 'descricao')) {
    const descricao = lerTexto(corpo.descricao, 'descricao', LIMITE_TEXTO_CURTO);
    if (!descricao) throw new ErroRota('campo_obrigatorio', 400, 'descricao');
    dados.descricao = descricao;
  }
  if (veioNoCorpo(corpo, 'ordem')) {
    const ordem = lerInteiro(corpo.ordem, 'ordem');
    if (ordem === null) throw new ErroRota('campo_invalido', 400, 'ordem');
    dados.ordem = ordem;
  }

  if (Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }

  const { error } = await ctx.admin
    .from('carbon_finding_subitens')
    .update(dados)
    .eq('id', ctx.params.id);

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_finding_subitens');

  return respostaFinding(ctx.admin, String(subitem.finding_id));
}

/**
 * Remove um subitem.
 *
 * E o unico DELETE do dominio. Subitem e checklist de trabalho: item digitado
 * errado, ou colado duas vezes, tem de sair. Finding e rodada, ao contrario, sao
 * material de auditoria e se aposentam com estado 'nao_aplicavel'.
 */
async function removerSubitem(ctx: Contexto): Promise<Response> {
  const subitem = await lerSubitem(ctx.admin, ctx.params.id);
  if (!subitem) return respostaErro('nao_encontrado', 404);

  const { error } = await ctx.admin
    .from('carbon_finding_subitens')
    .delete()
    .eq('id', ctx.params.id);

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_finding_subitens');

  // O finding volta com o progresso ja recalculado sem o item removido.
  return respostaFinding(ctx.admin, String(subitem.finding_id));
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'projetos/:id/findings', escrita: false, handler: obterFindings },
  {
    metodo: 'POST',
    padrao: 'projetos/:id/auditoria-rodadas',
    escrita: true,
    handler: criarRodada,
  },
  { metodo: 'PATCH', padrao: 'auditoria-rodadas/:id', escrita: true, handler: atualizarRodada },
  {
    metodo: 'POST',
    padrao: 'auditoria-rodadas/:id/findings',
    escrita: true,
    handler: criarFinding,
  },
  { metodo: 'PATCH', padrao: 'findings/:id', escrita: true, handler: atualizarFinding },
  { metodo: 'POST', padrao: 'findings/:id/subitens', escrita: true, handler: criarSubitens },
  { metodo: 'PATCH', padrao: 'finding-subitens/:id', escrita: true, handler: atualizarSubitem },
  { metodo: 'DELETE', padrao: 'finding-subitens/:id', escrita: true, handler: removerSubitem },
];

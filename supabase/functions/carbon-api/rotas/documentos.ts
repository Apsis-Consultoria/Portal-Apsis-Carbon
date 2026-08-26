// -----------------------------------------------------------------------------
// Rotas de documento (issue #6) - entidade unica por projeto.
// -----------------------------------------------------------------------------
// GET    carbon-api/documentos                    -> { documentos, total, pagina, limite }
// POST   carbon-api/documentos                    -> { documento } (201)
// GET    carbon-api/documentos/:id                -> { documento, familia, vinculos }
// PATCH  carbon-api/documentos/:id                -> { documento }
// POST   carbon-api/documentos/:id/versoes        -> { documento, familia } (201)
// POST   carbon-api/documentos/:id/vinculos       -> { vinculo } (201)
// DELETE carbon-api/documento-vinculos/:id        -> { removido: true }
//
// PARA PUBLICAR ESTE MODULO (unico passo fora deste arquivo, e o unico arquivo
// compartilhado do backend): acrescentar em supabase/functions/carbon-api/rotas/indice.ts
//   import { rotas as rotasDocumentos } from './documentos.ts';
// e o spread `...rotasDocumentos` em TODAS_AS_ROTAS. Enquanto isso nao acontecer, as
// rotas daqui respondem 404 rota_desconhecida - e o DELETE nem entra em
// Access-Control-Allow-Methods, porque o index.ts DERIVA os metodos aceitos das rotas
// registradas. Nao editei o indice de proposito: e arquivo da fundacao, com outros
// agentes trabalhando nele em paralelo.
//
// Objetos SQL de que este modulo depende (migration 20260814090000_documentos):
//   public.carbon_documentos, public.carbon_documento_vinculos
//   public.carbon_documentos_listar(...)            -> { total, documentos }
//   public.carbon_documento_familia(uuid)           -> [ ...versoes ]
//   public.carbon_documento_substituido_por(uuid)   -> uuid | null
//
// POR QUE A LISTAGEM E RPC E NAO CONSULTA DO PostgREST: "versao vigente" e uma
// DERIVACAO (o documento que nenhum outro substitui), nao uma coluna, e o filtro por
// vinculo e um EXISTS em outra tabela. Ver o cabecalho da funcao na migration.
//
// POR QUE substitui_id NAO ESTA EM NENHUMA LISTA BRANCA: a corrente de versoes so
// pode ser montada por POST /documentos/:id/versoes, que le o antecessor e calcula a
// versao. Se o campo fosse gravavel pelo POST e pelo PATCH comuns, existiriam tres
// caminhos para produzir corrente incoerente (versao repetida, familia de dois
// projetos, dois sucessores do mesmo antecessor) e a regra teria de ser reimplementada
// em cada um deles.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { respostaErro, respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';
import { exigirProjetoDoRegistro, lerProjetoVisivel } from './projetos.ts';
import {
  ErroRota,
  type ErroBanco,
  exigir,
  lancarErroEscrita,
  lerData,
  lerEnum,
  lerNumero,
  lerTexto,
  lerUuid,
  LIMITE_TEXTO_CURTO,
  LIMITE_TEXTO_LONGO,
  paginar,
  paraNumero,
  veioNoCorpo,
} from './helpers.ts';

// Vocabulario da issue #6. Os valores vem dos artefatos que o levantamento observou
// (docs/notion/07-projetos-parakana.md e 08-monitoring-report.md), nao de invencao:
// KML e GeoPDF sao geoespacial; ERR, AGB e NPR sao planilha; ata de CLPI e ata.
const TIPOS = new Set([
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
]);

const ORIGENS = new Set(['interna', 'parceiro', 'orgao', 'validadora']);

// Espelha carbon_documento_vinculos_tipo_alvo_chk. Formato e nao lista fechada: os
// dominios de destino (checklist de evidencias, findings, reunioes, contratos) ainda
// vao nascer, e cada um deles teria de vir aqui acrescentar o proprio nome.
const TIPO_ALVO_RE = /^[a-z][a-z0-9_]{2,49}$/;

// Extensao/formato: 'pdf', 'xlsx', 'geojson'. Ponto e caixa alta sao normalizados
// antes de chegar aqui (a trigger do banco normaliza de novo, para o que entra pelo
// SQL Editor tambem ficar coerente).
const FORMATO_RE = /^[a-z0-9+.-]{1,20}$/;

const LIMITE_VERSAO = 999;

// Colunas devolvidas de carbon_documentos. Enumeradas de proposito, como em
// carbon_projetos: 'select *' passaria a trafegar qualquer coluna nova sem ninguem
// decidir isso.
const COLUNAS_DOCUMENTO =
  'id, projeto_id, titulo, tipo, versao, descricao, origem, url_externa, ' +
  'caminho_storage, tamanho_bytes, formato, data_documento, substitui_id, ' +
  'enviado_por, criado_em, atualizado_em';

const COLUNAS_VINCULO =
  'id, documento_id, tipo_alvo, alvo_id, observacao, criado_por, criado_em';

// POR QUE OS CASTS DESTE ARQUIVO SAO `as unknown as`, e nao `as` direto:
// varias consultas aqui montam a lista de colunas em RUNTIME (o conjunto
// depende do papel de quem pergunta). O supabase-js so consegue inferir o
// tipo do retorno quando a string do .select() e literal; com string
// calculada ele devolve GenericStringError, que e `{ error: true } & String`
// e nao tem index signature - o cast direto vira erro TS2352.
//
// NAO simplifique para `as` de novo: compila hoje porque o arquivo estava
// fora do indice.ts e nunca era checado. Desde 25/08/2026 ele e checado.

type LinhaDocumento = { id: string } & Record<string, unknown>;

// -----------------------------------------------------------------------------
// Leitores especificos deste dominio
// -----------------------------------------------------------------------------

/**
 * URL de repositorio externo. Aceita SOMENTE http e https.
 *
 * Mesma regra de src/utils/urlSegura.js e do CHECK da tabela, e pelo mesmo motivo:
 * este valor vira o href de um link na tela, e o React nao bloqueia
 * href="javascript:...". Tres barreiras (entrada da API, CHECK do banco, saida do
 * frontend) porque um XSS armazenado aqui rodaria na origem do Apsis Carbon, com
 * acesso ao cache do MSAL.
 */
function lerUrlExterna(valor: unknown): string | null {
  const texto = lerTexto(valor, 'url_externa', LIMITE_TEXTO_CURTO);
  if (texto === null) return null;

  let url: URL;
  try {
    // Sem segundo argumento de proposito: caminho relativo nao e URL externa.
    url = new URL(texto);
  } catch {
    throw new ErroRota('url_invalida', 400, 'url_externa');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ErroRota('url_invalida', 400, 'url_externa');
  }
  return texto;
}

/**
 * Caminho relativo dentro do bucket do Storage.
 *
 * Recusa caminho absoluto e '..' pelo mesmo motivo do CHECK da tabela: no dia em que
 * o upload existir, um caminho assim escaparia do prefixo do projeto. Barrar na
 * entrada evita ter dado sujo para migrar depois.
 */
function lerCaminhoStorage(valor: unknown): string | null {
  const texto = lerTexto(valor, 'caminho_storage', LIMITE_TEXTO_CURTO);
  if (texto === null) return null;
  if (texto.startsWith('/') || texto.includes('..')) {
    throw new ErroRota('caminho_invalido', 400, 'caminho_storage');
  }
  return texto;
}

/** Extensao normalizada (minusculas, sem ponto). */
function lerFormato(valor: unknown): string | null {
  const texto = lerTexto(valor, 'formato', LIMITE_TEXTO_CURTO);
  if (texto === null) return null;
  const limpo = texto.toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '').trim();
  if (!limpo) return null;
  if (!FORMATO_RE.test(limpo)) throw new ErroRota('campo_invalido', 400, 'formato');
  return limpo;
}

/**
 * Tamanho em bytes: inteiro nao negativo.
 *
 * Reaproveita lerNumero (que ja recusa negativo, texto com separador de milhar e
 * valor >= 1e10, ou seja, arquivo acima de ~10 GB) e arredonda: byte fracionario nao
 * existe, e a coluna e bigint - mandar 1024.5 daria erro do Postgres em vez de 400.
 */
function lerTamanhoBytes(valor: unknown): number | null {
  const n = lerNumero(valor, 'tamanho_bytes');
  return n === null ? null : Math.round(n);
}

/** Numero de versao informado no cadastro. */
function lerVersao(valor: unknown): number | null {
  const n = lerNumero(valor, 'versao');
  if (n === null) return null;
  if (!Number.isInteger(n) || n < 1 || n > LIMITE_VERSAO) {
    throw new ErroRota('versao_invalida', 400, 'versao');
  }
  return n;
}

function lerTipoAlvo(valor: unknown): string {
  const texto = lerTexto(valor, 'tipo_alvo', LIMITE_TEXTO_CURTO);
  if (!texto) throw new ErroRota('campo_obrigatorio', 400, 'tipo_alvo');
  const limpo = texto.toLowerCase();
  if (!TIPO_ALVO_RE.test(limpo)) throw new ErroRota('tipo_alvo_invalido', 400, 'tipo_alvo');
  return limpo;
}

/**
 * Bandeira booleana vinda da query string.
 *
 * 'true' e '1' ligam; QUALQUER outra coisa (inclusive ausencia e valor torto) desliga.
 * Nao devolve 400 de proposito: filtro escrito errado na URL nao e motivo para recusar
 * uma leitura - o mesmo criterio que o helper paginar() usa.
 */
function bandeira(url: URL, nome: string): boolean {
  const bruto = url.searchParams.get(nome);
  return bruto === 'true' || bruto === '1';
}

/** Valor de query string, ou null quando ausente ou vazio. */
function query(url: URL, nome: string): string | null {
  const bruto = url.searchParams.get(nome);
  if (bruto === null) return null;
  const limpo = bruto.trim();
  return limpo === '' ? null : limpo;
}

/** UUID vindo da query string. Valor torto e 400: nao da para adivinhar filtro de id. */
function queryUuid(url: URL, nome: string): string | null {
  return lerUuid(query(url, nome), nome);
}

// -----------------------------------------------------------------------------
// Leitura
// -----------------------------------------------------------------------------

async function lerDocumento(
  admin: SupabaseClient,
  id: string,
): Promise<LinhaDocumento | null> {
  const { data, error } = await admin
    .from('carbon_documentos')
    .select(COLUNAS_DOCUMENTO)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_documentos:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return (data as LinhaDocumento | null) ?? null;
}

/**
 * Familia de versoes de um documento, pela funcao SQL.
 *
 * A regra ("sobe pelos antecessores, desce pelos sucessores") vive no banco porque e
 * recursiva e porque a tela de historico e a listagem precisam da MESMA nocao de
 * versao vigente. Reimplementar em TypeScript seria N consultas e uma segunda
 * definicao da mesma regra.
 */
async function lerFamilia(admin: SupabaseClient, id: string): Promise<unknown[]> {
  const { data, error } = await admin.rpc('carbon_documento_familia', {
    p_documento_id: id,
  });

  if (error) {
    console.error('Falha em carbon_documento_familia:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return Array.isArray(data) ? data : [];
}

async function lerVinculos(admin: SupabaseClient, id: string): Promise<unknown[]> {
  const { data, error } = await admin
    .from('carbon_documento_vinculos')
    .select(COLUNAS_VINCULO)
    .eq('documento_id', id)
    .order('tipo_alvo', { ascending: true })
    .order('criado_em', { ascending: true });

  if (error) {
    console.error('Falha ao ler carbon_documento_vinculos:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return (data ?? []) as unknown[];
}

/**
 * Acrescenta ao documento os dois campos derivados que a listagem tambem devolve, para
 * o cliente nunca ter que descobrir sozinho se aquela versao ainda vale.
 *
 * Os valores saem da FAMILIA que ja foi lida (o sucessor e o membro cujo substitui_id
 * aponta para este documento), e nao de uma chamada extra a
 * carbon_documento_substituido_por: seria uma ida a mais ao banco para uma informacao
 * que ja esta na resposta.
 */
function comDerivados(
  documento: LinhaDocumento,
  familia: unknown[],
): Record<string, unknown> {
  const sucessor = familia.find(
    (item) =>
      item !== null &&
      typeof item === 'object' &&
      (item as Record<string, unknown>).substitui_id === documento.id,
  ) as Record<string, unknown> | undefined;

  const substituidoPor = (sucessor?.id as string | undefined) ?? null;
  return { ...documento, substituido_por_id: substituidoPor, substituido: substituidoPor !== null };
}

// -----------------------------------------------------------------------------
// Lista branca de campos de documento
// -----------------------------------------------------------------------------

/**
 * Monta o objeto de gravacao de carbon_documentos por LISTA BRANCA explicita.
 *
 * Escrita campo a campo (e nao com o helper listaBranca) porque cada campo tem
 * validador proprio: URL com esquema conferido, caminho sem '..', enum de tipo e de
 * origem, inteiro de bytes, extensao normalizada.
 *
 * FICAM DE FORA, e isso e o ponto: substitui_id (so a rota de versoes monta corrente),
 * enviado_por (autoria e do token, nao do corpo), criado_em e atualizado_em (trilha),
 * e no PATCH tambem versao - mudar o numero de uma versao ja gravada quebraria a
 * ordem da familia sem que ninguem pedisse isso.
 *
 * @param modo 'criar' exige titulo; 'atualizar' toca somente o que veio no corpo.
 */
function montarDadosDocumento(
  corpo: Record<string, unknown>,
  modo: 'criar' | 'atualizar',
): Record<string, unknown> {
  const dados: Record<string, unknown> = {};

  if (modo === 'criar' || veioNoCorpo(corpo, 'titulo')) {
    exigir(corpo, ['titulo']);
    dados.titulo = lerTexto(corpo.titulo, 'titulo', LIMITE_TEXTO_CURTO);
  }

  // projeto_id null e estado VALIDO: e o documento institucional (modelo de contrato,
  // SOP, procedimento interno) que nao pertence a projeto nenhum.
  //
  // SO NA CRIACAO, e isto foi apertado em 26/08/2026. No modo 'atualizar' a
  // coluna era gravavel, e com ela um gestor MOVIA documento de um projeto para
  // outro: o arquivo de B passava a constar em A e sumia da listagem de B. A
  // unica defesa era parcial - a trigger de coerencia de familia so barra quando
  // o documento faz parte de uma corrente de versoes, e documento de versao
  // unica, que e o caso comum, passava.
  //
  // Mesma doutrina ja escrita aqui para `versao` e `substitui_id`: campo que
  // define a que o registro PERTENCE nao se edita depois; para mudar de projeto,
  // o caminho e criar no projeto certo.
  if (modo === 'criar' && veioNoCorpo(corpo, 'projeto_id')) {
    dados.projeto_id = lerUuid(corpo.projeto_id, 'projeto_id');
  }

  // tipo e origem sao NOT NULL com default no banco: valor vazio nao vira null (o que
  // quebraria a constraint), apenas nao entra no objeto - o default vale na criacao e o
  // valor atual permanece na edicao.
  if (veioNoCorpo(corpo, 'tipo')) {
    const tipo = lerEnum(corpo.tipo, TIPOS, 'tipo_invalido', 'tipo');
    if (tipo) dados.tipo = tipo;
  }

  if (veioNoCorpo(corpo, 'origem')) {
    const origem = lerEnum(corpo.origem, ORIGENS, 'origem_invalida', 'origem');
    if (origem) dados.origem = origem;
  }

  if (veioNoCorpo(corpo, 'descricao')) {
    dados.descricao = lerTexto(corpo.descricao, 'descricao', LIMITE_TEXTO_LONGO);
  }

  if (veioNoCorpo(corpo, 'url_externa')) dados.url_externa = lerUrlExterna(corpo.url_externa);
  if (veioNoCorpo(corpo, 'caminho_storage')) {
    dados.caminho_storage = lerCaminhoStorage(corpo.caminho_storage);
  }
  if (veioNoCorpo(corpo, 'tamanho_bytes')) {
    dados.tamanho_bytes = lerTamanhoBytes(corpo.tamanho_bytes);
  }
  if (veioNoCorpo(corpo, 'formato')) dados.formato = lerFormato(corpo.formato);
  if (veioNoCorpo(corpo, 'data_documento')) {
    dados.data_documento = lerData(corpo.data_documento, 'data_documento');
  }

  // versao somente na CRIACAO, e de proposito: serve para registrar documento que ja
  // chega com historico fora do sistema ("PDD v3", vindo da pasta compartilhada) sem
  // ter que cadastrar as duas versoes anteriores. Depois de criado, quem muda a versao
  // e a rota de nova versao.
  if (modo === 'criar' && veioNoCorpo(corpo, 'versao')) {
    const versao = lerVersao(corpo.versao);
    if (versao !== null) dados.versao = versao;
  }

  return dados;
}

/**
 * Confere a regra "ao menos um caminho para o arquivo" ANTES de escrever.
 *
 * Existe em TypeScript, e nao apenas como CHECK do banco, por dois motivos:
 *   1. o CHECK devolve 23514, o mesmo SQLSTATE da coerencia de versao e de familia, e
 *      a traducao unica de 23514 por rota nao conseguiria distinguir os tres casos;
 *   2. no PATCH a regra depende do estado ATUAL: limpar url_externa e legitimo quando
 *      existe caminho_storage, e proibido quando nao existe. So dando merge com a linha
 *      de hoje e possivel dizer qual dos dois e o caso.
 */
function exigirLocalDoArquivo(
  dados: Record<string, unknown>,
  atual: LinhaDocumento | null,
): void {
  const efetivo = (campo: string): unknown =>
    veioNoCorpo(dados, campo) ? dados[campo] : (atual?.[campo] ?? null);

  if (efetivo('url_externa') === null && efetivo('caminho_storage') === null) {
    throw new ErroRota('local_obrigatorio', 400);
  }
}

// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------

/**
 * Lista documentos.
 *
 * Filtros (query string):
 *   projeto_id=<uuid>        so os documentos daquele projeto
 *   escopo=institucional     so os documentos SEM projeto
 *   tipo=<enum>  origem=<enum>
 *   incluir_substituidos=true    tambem as versoes ja substituidas
 *   busca=<texto>            titulo ou descricao
 *   alvo_tipo=<snake_case>&alvo_id=<uuid>   documentos vinculados a um item
 *   limite=<n>&pagina=<n>
 *
 * O par alvo_tipo/alvo_id existe para os dominios que ainda vao nascer: e assim que o
 * checklist de evidencias (issue #4) e os findings (#5) perguntam "quais documentos
 * satisfazem este item" sem precisar de rota propria neste modulo.
 */
async function listar(ctx: Contexto): Promise<Response> {
  const { url } = ctx;
  const { limite, deslocamento, pagina } = paginar(url);

  const tipo = lerEnum(query(url, 'tipo'), TIPOS, 'tipo_invalido', 'tipo');
  const origem = lerEnum(query(url, 'origem'), ORIGENS, 'origem_invalida', 'origem');

  const alvoTipoBruto = query(url, 'alvo_tipo');
  const alvoTipo = alvoTipoBruto === null ? null : lerTipoAlvo(alvoTipoBruto);

  // PORTAO NA LEITURA. Sem isto, qualquer colaborador ativo do dominio pedia
  // ?projeto_id=<uuid de outro projeto> e recebia a lista de documentos dele,
  // com url_externa, caminho_storage e os vinculos - que sao justamente os uuids
  // de finding, item de evidencia e ata usados para escrever nas outras rotas.
  // Era a segunda porta para o dado que /projetos protege, e ainda servia de
  // oraculo de ids.
  const projetoFiltro = queryUuid(url, 'projeto_id');
  if (projetoFiltro && !(await lerProjetoVisivel(ctx, projetoFiltro))) {
    return respostaErro('nao_encontrado', 404);
  }

  const { data, error } = await ctx.admin.rpc('carbon_documentos_listar', {
    p_projeto_id: projetoFiltro,
    p_somente_institucional: query(url, 'escopo') === 'institucional',
    p_tipo: tipo,
    p_origem: origem,
    p_incluir_substituidos: bandeira(url, 'incluir_substituidos'),
    p_busca: query(url, 'busca'),
    p_alvo_tipo: alvoTipo,
    p_alvo_id: queryUuid(url, 'alvo_id'),
    p_limite: limite,
    p_deslocamento: deslocamento,
  });

  if (error) {
    console.error('Falha em carbon_documentos_listar:', error.message);
    return respostaErro('erro_interno', 500);
  }

  const resultado = (data ?? {}) as { total?: unknown; documentos?: unknown };
  return respostaJson({
    documentos: Array.isArray(resultado.documentos) ? resultado.documentos : [],
    total: paraNumero(resultado.total) ?? 0,
    pagina,
    limite,
  });
}

async function obter(ctx: Contexto): Promise<Response> {
  const documento = await lerDocumento(ctx.admin, ctx.params.id);
  if (!documento) return respostaErro('nao_encontrado', 404);

  const [familia, vinculos] = await Promise.all([
    lerFamilia(ctx.admin, documento.id),
    lerVinculos(ctx.admin, documento.id),
  ]);

  return respostaJson({
    documento: comDerivados(documento, familia),
    familia,
    vinculos,
  });
}

async function criar(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const dados = montarDadosDocumento(corpo, 'criar');
  exigirLocalDoArquivo(dados, null);

  const { data, error } = await ctx.admin
    .from('carbon_documentos')
    // enviado_por vem do TOKEN, nunca do corpo: e trilha de autoria.
    .insert({ ...dados, enviado_por: ctx.registro.id })
    .select(COLUNAS_DOCUMENTO)
    .single();

  if (error || !data) {
    // 23503 (FK) aqui significa projeto_id inexistente -> referencia_invalida.
    lancarErroEscrita(
      (error ?? { message: 'insert sem retorno' }) as ErroBanco,
      'carbon_documentos',
      'campo_invalido',
    );
  }

  // Documento novo nunca tem sucessor: os derivados sao constantes, sem consulta extra.
  return respostaJson(
    { documento: { ...(data as unknown as LinhaDocumento), substituido_por_id: null, substituido: false } },
    201,
  );
}

/**
 * Atualiza os metadados de um documento.
 *
 * A linha atual e lida ANTES da escrita porque a regra do local do arquivo depende
 * dela (ver exigirLocalDoArquivo) e porque 404 honesto exige saber que o id existe.
 */
async function atualizar(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const id = ctx.params.id;

  const atual = await lerDocumento(ctx.admin, id);
  if (!atual) return respostaErro('nao_encontrado', 404);

  // PORTAO. Documento institucional (projeto_id nulo) e de todo o dominio e o
  // helper devolve string vazia para ele; documento DE PROJETO exige que quem
  // escreve enxergue o projeto.
  await exigirProjetoDoRegistro(ctx, 'carbon_documentos', id);

  const dados = montarDadosDocumento(corpo, 'atualizar');
  if (Object.keys(dados).length === 0) return respostaErro('nada_para_atualizar', 400);
  exigirLocalDoArquivo(dados, atual);

  const { data, error } = await ctx.admin
    .from('carbon_documentos')
    .update(dados)
    .eq('id', id)
    .select(COLUNAS_DOCUMENTO)
    .maybeSingle();

  // Com o local do arquivo e os enums ja validados aqui, o 23514 que sobra vem da
  // trigger de coerencia da corrente, e o unico caminho para ele neste handler e
  // mover para outro projeto um documento que faz parte de uma familia.
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_documentos', 'familia_de_outro_projeto');
  if (!data) return respostaErro('nao_encontrado', 404);

  const familia = await lerFamilia(ctx.admin, id);
  return respostaJson({ documento: comDerivados(data as unknown as LinhaDocumento, familia) });
}

/**
 * Registra a versao seguinte de um documento.
 *
 * O QUE E HERDADO E POR QUE:
 *   projeto_id e tipo    identidade da familia. Nao sao sobrescriviveis: um "PDD v2"
 *                        que vira planilha de outro projeto nao e versao, e outro
 *                        documento. A trigger do banco tambem barra a troca de projeto.
 *   titulo, origem,      herdados por conveniencia e sobrescriviveis: a rodada nova
 *   formato              costuma manter o titulo, mas pode chegar da validadora
 *                        (origem diferente) ou em outro formato.
 *   descricao,           NAO sao herdados: sao proprios da rodada. Herdar a observacao
 *   data_documento,      da versao anterior faria o historico repetir texto que nao
 *   tamanho_bytes        descreve mais o arquivo em questao.
 *
 * versao = versao do antecessor + 1. Corrente LINEAR: um antecessor tem no maximo um
 * sucessor, garantido pelo indice unico parcial carbon_documentos_substitui_uniq. A
 * checagem explicita abaixo existe para a resposta ser 409 documento_ja_substituido em
 * vez de um registro_duplicado que nao diz o que aconteceu; o indice continua sendo a
 * garantia real, inclusive contra duas requisicoes simultaneas.
 */
async function criarVersao(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const anteriorId = ctx.params.id;

  const anterior = await lerDocumento(ctx.admin, anteriorId);
  if (!anterior) return respostaErro('nao_encontrado', 404);

  const { data: sucessorId, error: erroSucessor } = await ctx.admin.rpc(
    'carbon_documento_substituido_por',
    { p_documento_id: anteriorId },
  );
  if (erroSucessor) {
    console.error('Falha em carbon_documento_substituido_por:', erroSucessor.message);
    return respostaErro('erro_interno', 500);
  }
  if (sucessorId) return respostaErro('documento_ja_substituido', 409);

  const dados = montarDadosDocumento(corpo, 'atualizar');

  const linha: Record<string, unknown> = {
    projeto_id: anterior.projeto_id ?? null,
    tipo: anterior.tipo,
    titulo: dados.titulo ?? anterior.titulo,
    origem: dados.origem ?? anterior.origem,
    formato: veioNoCorpo(dados, 'formato') ? dados.formato : (anterior.formato ?? null),
    descricao: (dados.descricao as string | null) ?? null,
    data_documento: (dados.data_documento as string | null) ?? null,
    tamanho_bytes: (dados.tamanho_bytes as number | null) ?? null,
    url_externa: (dados.url_externa as string | null) ?? null,
    caminho_storage: (dados.caminho_storage as string | null) ?? null,
    versao: (paraNumero(anterior.versao) ?? 1) + 1,
    substitui_id: anteriorId,
    enviado_por: ctx.registro.id,
  };

  // A versao nova precisa do PROPRIO arquivo: herdar a URL da anterior criaria duas
  // versoes apontando para o mesmo arquivo, que e o oposto de versionar.
  exigirLocalDoArquivo(linha, null);

  const { data, error } = await ctx.admin
    .from('carbon_documentos')
    .insert(linha)
    .select(COLUNAS_DOCUMENTO)
    .single();

  if (error || !data) {
    const erro = (error ?? { message: 'insert sem retorno' }) as ErroBanco;
    // Corrida perdida para outra requisicao que criou a versao primeiro: o unico
    // indice unico alcancavel por este insert e o de substitui_id.
    if (erro.code === '23505') return respostaErro('documento_ja_substituido', 409);
    lancarErroEscrita(erro, 'carbon_documentos (versao)', 'versao_invalida');
  }

  const novo = data as unknown as LinhaDocumento;
  const familia = await lerFamilia(ctx.admin, novo.id);
  return respostaJson({ documento: comDerivados(novo, familia), familia }, 201);
}

/**
 * Vincula o documento a um item de outra entidade.
 *
 * O par (tipo_alvo, alvo_id) e generico e NAO tem integridade referencial: ver o
 * comentario da tabela na migration. Por isso nao ha 404 de alvo aqui - este modulo
 * nao sabe (e nao deve saber) quais tabelas existem do outro lado.
 */
async function criarVinculo(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const documentoId = ctx.params.id;

  const documento = await lerDocumento(ctx.admin, documentoId);
  if (!documento) return respostaErro('nao_encontrado', 404);

  exigir(corpo, ['tipo_alvo', 'alvo_id']);
  const tipoAlvo = lerTipoAlvo(corpo.tipo_alvo);
  const alvoId = lerUuid(corpo.alvo_id, 'alvo_id');
  if (!alvoId) throw new ErroRota('campo_obrigatorio', 400, 'alvo_id');

  const { data, error } = await ctx.admin
    .from('carbon_documento_vinculos')
    .insert({
      documento_id: documentoId,
      tipo_alvo: tipoAlvo,
      alvo_id: alvoId,
      observacao: lerTexto(corpo.observacao, 'observacao', LIMITE_TEXTO_LONGO),
      criado_por: ctx.registro.id,
    })
    .select(COLUNAS_VINCULO)
    .single();

  // 23505 aqui e o unique (documento_id, tipo_alvo, alvo_id): o vinculo ja existia.
  if (error || !data) {
    lancarErroEscrita(
      (error ?? { message: 'insert sem retorno' }) as ErroBanco,
      'carbon_documento_vinculos',
      'tipo_alvo_invalido',
    );
  }

  return respostaJson({ vinculo: data }, 201);
}

/**
 * Remove um vinculo.
 *
 * Rota de primeiro nivel (documento-vinculos/:id) e nao aninhada em
 * documentos/:id/vinculos/:vinculoId porque o roteador valida TODO parametro de rota
 * como uuid, e o vinculo tem id proprio: exigir os dois ids seria pedir ao cliente um
 * dado que ele nao precisa ter em maos, sem ganhar validacao nenhuma.
 *
 * Apaga so a linha de ligacao. O documento e o item da outra ponta continuam intactos.
 */
async function removerVinculo(ctx: Contexto): Promise<Response> {
  const { data, error } = await ctx.admin
    .from('carbon_documento_vinculos')
    .delete()
    .eq('id', ctx.params.id)
    .select('id, documento_id')
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_documento_vinculos (delete)');
  if (!data) return respostaErro('nao_encontrado', 404);

  return respostaJson({ removido: true, vinculo: data });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'documentos', escrita: false, handler: listar },
  { metodo: 'POST', padrao: 'documentos', escrita: true, handler: criar },
  { metodo: 'GET', padrao: 'documentos/:id', escrita: false, handler: obter },
  { metodo: 'PATCH', padrao: 'documentos/:id', escrita: true, handler: atualizar },
  { metodo: 'POST', padrao: 'documentos/:id/versoes', escrita: true, handler: criarVersao },
  { metodo: 'POST', padrao: 'documentos/:id/vinculos', escrita: true, handler: criarVinculo },
  { metodo: 'DELETE', padrao: 'documento-vinculos/:id', escrita: true, handler: removerVinculo },
];

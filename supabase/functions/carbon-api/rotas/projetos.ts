// -----------------------------------------------------------------------------
// Rotas de projeto de carbono (issue #1).
// -----------------------------------------------------------------------------
// GET   carbon-api/projetos       -> { projetos: [...] }
// POST  carbon-api/projetos       -> { projeto } (201)
// GET   carbon-api/projetos/:id   -> { projeto }  (com geometria em GeoJSON)
// PATCH carbon-api/projetos/:id   -> { projeto }
//
// Objetos SQL de que este modulo depende (migration 20260812150000_projetos_e_pdd):
//   public.carbon_projeto_definir_geometria(p_projeto_id uuid, p_geojson jsonb)
//   public.carbon_projeto_geojson(p_projeto_id uuid) returns jsonb
//   public.carbon_projeto_atualizar(p_projeto_id uuid, p_dados jsonb,
//                                   p_mexe_geometria boolean, p_geojson jsonb)
// A conversao de geometria vive no banco porque o PostgREST serializa coluna
// geometry como EWKB hexadecimal e nao aceita ST_AsGeoJSON dentro de select. O
// PATCH de projeto passa por carbon_projeto_atualizar porque campos e geometria
// precisam ser gravados na MESMA transacao: duas chamadas da Edge Function sao
// dois commits, e a recusa da segunda deixaria a primeira aplicada.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { respostaErro, respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';
import {
  ehObjeto,
  ErroRota,
  type ErroBanco,
  lancarErroEscrita,
  lerBooleano,
  lerData,
  lerListaDeTexto,
  lerNumero,
  lerTexto,
  LIMITE_GEOJSON_CHARS,
  LIMITE_TEXTO_CURTO,
  paraNumero,
  veioNoCorpo,
} from './helpers.ts';

// Divergencia tolerada entre a area declarada na documentacao do projeto e a area
// calculada a partir da geometria. Exigencia literal do item 4 do checklist de
// due diligence usado como referencia: acima disso o sistema tem que avisar.
const LIMITE_DIVERGENCIA_PCT = 5;

const STATUS_REGISTRO = new Set([
  'rascunho',
  'em_desenvolvimento',
  'em_validacao',
  'registrado',
  'em_verificacao',
  'suspenso',
  'encerrado',
]);

// Colunas devolvidas de carbon_projetos. Enumeradas de proposito: 'select *'
// traria a coluna geometry serializada como EWKB hexadecimal, que e pesada e
// inutil para o navegador. A geometria sai por funcao SQL, so no detalhe.
export const COLUNAS_PROJETO =
  'id, nome, proponente, standard, metodologia, pais, estado, municipio, ' +
  'area_declarada_ha, area_calculada_ha, data_inicio, periodo_creditacao_inicio, ' +
  'periodo_creditacao_fim, status_registro, registro_id, registros_anteriores, ' +
  'ativo, criado_por, criado_em, atualizado_em';

/** Linha de carbon_projetos como volta do PostgREST (colunas de COLUNAS_PROJETO). */
export type LinhaProjeto = { id: string } & Record<string, unknown>;

// -----------------------------------------------------------------------------
// Geometria
// -----------------------------------------------------------------------------

const TIPOS_GEOMETRIA = new Set(['Polygon', 'MultiPolygon']);

/**
 * Confere a FORMA do GeoJSON antes de tocar no banco.
 *
 * Valor absurdo (string, numero, tipo Point) e recusado aqui, sem round trip.
 * Validade geometrica de verdade (anel fechado, auto-intersecao) e do PostGIS.
 *
 * Aceitamos tambem um Feature envolvendo a geometria, porque exportador de
 * QGIS e conversor de shapefile costumam entregar Feature em vez da geometria
 * pura, e recusar isso seria atrito sem ganho.
 */
function normalizarGeoJson(valor: unknown): Record<string, unknown> {
  if (!ehObjeto(valor)) throw new ErroRota('geometria_invalida', 400);

  let geo = valor;
  if (geo.type === 'Feature' && ehObjeto(geo.geometry)) {
    geo = geo.geometry as Record<string, unknown>;
  }

  if (typeof geo.type !== 'string' || !TIPOS_GEOMETRIA.has(geo.type)) {
    throw new ErroRota('geometria_invalida', 400);
  }
  if (!Array.isArray(geo.coordinates) || geo.coordinates.length === 0) {
    throw new ErroRota('geometria_invalida', 400);
  }
  if (JSON.stringify(geo).length > LIMITE_GEOJSON_CHARS) {
    throw new ErroRota('geometria_invalida', 413, 'tamanho');
  }

  return geo;
}

/**
 * Grava a geometria pela funcao SQL, que faz ST_Multi(ST_GeomFromGeoJSON(...))
 * com SRID 4326.
 *
 * Por que RPC e nao update direto: o supabase-js manda JSON, e coluna geometry
 * nao aceita GeoJSON em insert/update pelo PostgREST. A conversao (e a validacao
 * geometrica) fica no banco, onde o PostGIS esta.
 *
 * Devolve false quando o banco recusa, para o chamador responder 400
 * geometria_invalida sem derrubar a requisicao inteira.
 */
async function definirGeometria(
  admin: SupabaseClient,
  projetoId: string,
  geojson: unknown,
): Promise<boolean> {
  const { error } = await admin.rpc('carbon_projeto_definir_geometria', {
    p_projeto_id: projetoId,
    p_geojson: geojson,
  });

  if (error) {
    console.warn('Geometria recusada pelo banco:', error.message);
    return false;
  }
  return true;
}

/**
 * GeoJSON da geometria de um projeto.
 *
 * Degradacao proposital: se a funcao SQL ainda nao existir (migration nao
 * aplicada no projeto), devolvemos null com aviso no log em vez de 500. A tela
 * de projeto continua abrindo sem o mapa, que e melhor do que nao abrir.
 */
async function lerGeometria(admin: SupabaseClient, projetoId: string): Promise<unknown> {
  const { data, error } = await admin.rpc('carbon_projeto_geojson', {
    p_projeto_id: projetoId,
  });

  if (error) {
    console.warn('GeoJSON indisponivel (carbon_projeto_geojson):', error.message);
    return null;
  }
  return data ?? null;
}

// -----------------------------------------------------------------------------
// Montagem da resposta de projeto
// -----------------------------------------------------------------------------

/**
 * Ha geometria gravada?
 *
 * Inferido de area_calculada_ha, que a trigger de carbon_projetos preenche a
 * partir da geometria (e deixa nula quando nao ha geometria). Assim as listagens
 * informam a existencia da geometria sem trafegar a coluna geometry.
 */
function temGeometria(linha: LinhaProjeto): boolean {
  return paraNumero(linha.area_calculada_ha) !== null;
}

/**
 * Projeto no formato do contrato, com os campos derivados calculados NO SERVIDOR.
 *
 * area_divergencia_pct e area_alerta nao podem ficar no frontend: sao criterio de
 * aceite (a area declarada tem que ser consistente com a geometria, com aviso
 * acima de 5%) e precisam valer igual para qualquer cliente que consuma a API.
 *
 * Faltando qualquer das duas areas, os dois campos vem null e false: sem base de
 * comparacao nao existe divergencia, e area calculada zero (geometria degenerada)
 * entra no mesmo caso para nao dividir por zero.
 *
 * @param geometria GeoJSON a incluir. undefined omite o campo (listagem).
 */
function montarProjeto(linha: LinhaProjeto, geometria?: unknown): Record<string, unknown> {
  const declarada = paraNumero(linha.area_declarada_ha);
  const calculada = paraNumero(linha.area_calculada_ha);

  let divergencia: number | null = null;
  let alerta = false;

  if (declarada !== null && calculada !== null && calculada > 0) {
    // Arredondamos para 2 casas e comparamos o valor ARREDONDADO, para o aviso
    // nunca contradizer o percentual mostrado na tela.
    divergencia = Math.round((Math.abs(declarada - calculada) / calculada) * 10000) / 100;
    alerta = divergencia > LIMITE_DIVERGENCIA_PCT;
  }

  const projeto: Record<string, unknown> = {
    ...linha,
    area_divergencia_pct: divergencia,
    area_alerta: alerta,
    tem_geometria: temGeometria(linha),
  };

  if (geometria !== undefined) projeto.geometria = geometria;
  return projeto;
}

/**
 * Le um projeto pelo id. Devolve null quando nao existe.
 *
 * Exportado porque as rotas de PDD (rotas/pdd.ts) precisam confirmar que o projeto
 * existe antes de responder, e duplicar a consulta la garantiria divergencia de
 * colunas com o tempo.
 */
export async function lerProjeto(
  admin: SupabaseClient,
  id: string,
): Promise<LinhaProjeto | null> {
  const { data, error } = await admin
    .from('carbon_projetos')
    .select(COLUNAS_PROJETO)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_projetos:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return (data as LinhaProjeto | null) ?? null;
}

/** Projeto do detalhe: inclui GeoJSON, e so paga a RPC quando ha geometria. */
async function montarProjetoComGeometria(
  admin: SupabaseClient,
  linha: LinhaProjeto,
): Promise<Record<string, unknown>> {
  const geometria = temGeometria(linha) ? await lerGeometria(admin, linha.id) : null;
  return montarProjeto(linha, geometria);
}

// -----------------------------------------------------------------------------
// Lista branca de campos de projeto
// -----------------------------------------------------------------------------

// Campos de texto que aceitam null (ausencia e estado valido).
const TEXTO_OPCIONAL = ['proponente', 'metodologia', 'estado', 'municipio', 'registro_id'];

// Campos de texto NOT NULL com default no banco. Recebem valor apenas quando o
// cliente manda algo util: enviar null quebraria a constraint em vez de deixar o
// default (criacao) ou o valor atual (edicao) valerem.
const TEXTO_COM_DEFAULT = ['standard', 'pais'];

const CAMPOS_DATA = ['data_inicio', 'periodo_creditacao_inicio', 'periodo_creditacao_fim'];

/**
 * Monta o objeto de gravacao de carbon_projetos por LISTA BRANCA explicita.
 *
 * Escrito campo a campo, e nao com o helper listaBranca(), porque cada campo tem
 * um validador diferente (texto curto, data, numero em pt-BR, lista de texto) e a
 * checagem de coerencia do periodo depende de dois campos juntos. O helper
 * generico serve para dominios cujos campos sao homogeneos.
 *
 * Campo desconhecido no corpo e simplesmente ignorado, e nenhum campo novo da
 * tabela passa a ser gravavel pela API sem alguem escrever isso aqui. Sem esse
 * cuidado, um corpo com { criado_por, area_calculada_ha, ativo } reescreveria
 * autoria, area calculada pela geometria e o estado do registro.
 *
 * @param modo 'criar' exige nome; 'atualizar' toca somente o que veio no corpo.
 */
function montarDadosProjeto(
  corpo: Record<string, unknown>,
  modo: 'criar' | 'atualizar',
): Record<string, unknown> {
  const dados: Record<string, unknown> = {};

  // Codigo proprio 'nome_obrigatorio' (e nao o 'campo_obrigatorio' do helper
  // exigir()) porque este codigo ja esta no contrato da API e traduzido na
  // interface: trocar por um generico apagaria a mensagem "Informe o nome do
  // projeto para continuar".
  if (modo === 'criar' || veioNoCorpo(corpo, 'nome')) {
    const nome = lerTexto(corpo.nome, 'nome', LIMITE_TEXTO_CURTO);
    if (!nome) throw new ErroRota('nome_obrigatorio', 400);
    dados.nome = nome;
  }

  for (const campo of TEXTO_OPCIONAL) {
    if (veioNoCorpo(corpo, campo)) {
      dados[campo] = lerTexto(corpo[campo], campo, LIMITE_TEXTO_CURTO);
    }
  }

  for (const campo of TEXTO_COM_DEFAULT) {
    if (!veioNoCorpo(corpo, campo)) continue;
    const valor = lerTexto(corpo[campo], campo, LIMITE_TEXTO_CURTO);
    if (valor) dados[campo] = valor;
  }

  if (veioNoCorpo(corpo, 'status_registro')) {
    const status = lerTexto(corpo.status_registro, 'status_registro', LIMITE_TEXTO_CURTO);
    if (status) {
      if (!STATUS_REGISTRO.has(status)) {
        throw new ErroRota('status_invalido', 400, 'status_registro');
      }
      dados.status_registro = status;
    }
  }

  if (veioNoCorpo(corpo, 'area_declarada_ha')) {
    dados.area_declarada_ha = lerNumero(corpo.area_declarada_ha, 'area_declarada_ha');
  }

  for (const campo of CAMPOS_DATA) {
    if (veioNoCorpo(corpo, campo)) dados[campo] = lerData(corpo[campo], campo);
  }

  if (veioNoCorpo(corpo, 'registros_anteriores')) {
    dados.registros_anteriores = lerListaDeTexto(corpo.registros_anteriores, 'registros_anteriores');
  }

  // Arquivar projeto e edicao, nunca criacao: projeto nasce ativo.
  if (modo === 'atualizar' && veioNoCorpo(corpo, 'ativo')) {
    dados.ativo = lerBooleano(corpo.ativo, 'ativo');
  }

  // Coerencia do periodo conferida aqui quando as duas pontas vem na mesma
  // requisicao, para devolver um codigo especifico. Quando vem so uma ponta, a
  // constraint da tabela e que barra, e lancarErroEscrita traduz o 23514.
  const inicio = dados.periodo_creditacao_inicio;
  const fim = dados.periodo_creditacao_fim;
  if (typeof inicio === 'string' && typeof fim === 'string' && fim < inicio) {
    throw new ErroRota('periodo_invalido', 400);
  }

  return dados;
}

// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------

/**
 * Lista os projetos.
 *
 * Sem paginacao de proposito: a operacao tem poucos projetos e paginar agora
 * seria complexidade sem demanda. Inativos vem no fim, com a flag ativo, para a
 * tela poder mostrar ou esconder sem uma segunda rota.
 */
async function listar(ctx: Contexto): Promise<Response> {
  const { data, error } = await ctx.admin
    .from('carbon_projetos')
    .select(COLUNAS_PROJETO)
    .order('ativo', { ascending: false })
    .order('nome', { ascending: true });

  if (error) {
    console.error('Falha ao ler carbon_projetos:', error.message);
    return respostaErro('erro_interno', 500);
  }

  const projetos = ((data ?? []) as LinhaProjeto[]).map((linha) => montarProjeto(linha));
  return respostaJson({ projetos });
}

async function obter(ctx: Contexto): Promise<Response> {
  const linha = await lerProjeto(ctx.admin, ctx.params.id);
  if (!linha) return respostaErro('nao_encontrado', 404);
  return respostaJson({ projeto: await montarProjetoComGeometria(ctx.admin, linha) });
}

/**
 * Cria projeto. A geometria, quando vem, e gravada em uma segunda chamada.
 *
 * Nao existe transacao entre duas chamadas ao banco a partir da Edge Function,
 * entao quando o PostGIS recusa a geometria apagamos o projeto recem-criado
 * (compensacao) e respondemos 400. Assim o cliente que recebeu erro nao fica com
 * um projeto meio-criado que ele nao pediu.
 */
async function criar(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const dados = montarDadosProjeto(corpo, 'criar');

  // geometria: null significa "sem geometria", que na criacao e o mesmo que
  // omitir. Validamos a forma ANTES do insert para nao criar e depois desfazer.
  const enviouGeometria = veioNoCorpo(corpo, 'geometria') && corpo.geometria !== null;
  const geometria = enviouGeometria ? normalizarGeoJson(corpo.geometria) : null;

  const { data, error } = await ctx.admin
    .from('carbon_projetos')
    .insert({ ...dados, criado_por: ctx.registro.id })
    .select(COLUNAS_PROJETO)
    .single();

  if (error || !data) {
    lancarErroEscrita(
      (error ?? { message: 'insert sem retorno' }) as ErroBanco,
      'carbon_projetos',
      'periodo_invalido',
    );
  }

  let linha = data as LinhaProjeto;

  if (geometria) {
    const gravou = await definirGeometria(ctx.admin, linha.id, geometria);
    if (!gravou) {
      const { error: erroDesfazer } = await ctx.admin
        .from('carbon_projetos')
        .delete()
        .eq('id', linha.id);
      if (erroDesfazer) {
        console.error(
          'Projeto criado ficou sem geometria e nao pode ser desfeito:',
          erroDesfazer.message,
        );
      }
      return respostaErro('geometria_invalida', 400);
    }

    // Releitura obrigatoria: area_calculada_ha e preenchida pela trigger na
    // gravacao da geometria, depois do retorno do insert.
    const atualizada = await lerProjeto(ctx.admin, linha.id);
    if (atualizada) linha = atualizada;
  }

  return respostaJson({ projeto: await montarProjetoComGeometria(ctx.admin, linha) }, 201);
}

/**
 * Atualiza projeto.
 *
 * TUDO em UMA chamada, pela RPC carbon_projeto_atualizar, e nao em duas (uma para
 * a geometria e outra para os campos). Duas chamadas sao dois commits, e nao ha
 * transacao entre elas: gravando a geometria primeiro, uma recusa do update dos
 * campos (registro_id duplicado, check de periodo) devolvia erro ao cliente com a
 * geometria JA substituida e a area calculada JA regravada - perda silenciosa, sem
 * historico da geometria anterior. Invertendo a ordem o problema so trocava de
 * lado. A funcao SQL resolve no unico lugar em que existe transacao: o banco.
 */
async function atualizar(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const id = ctx.params.id;
  const dados = montarDadosProjeto(corpo, 'atualizar');
  const mexeGeometria = veioNoCorpo(corpo, 'geometria');

  if (!mexeGeometria && Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }

  // Forma do GeoJSON conferida aqui para o caso absurdo nao virar round trip.
  // null limpa a geometria, e p_mexe_geometria distingue isso de "nao mandou".
  const geometria = mexeGeometria && corpo.geometria !== null
    ? normalizarGeoJson(corpo.geometria)
    : null;

  const { data, error } = await ctx.admin.rpc('carbon_projeto_atualizar', {
    p_projeto_id: id,
    p_dados: dados,
    p_mexe_geometria: mexeGeometria,
    p_geojson: geometria,
  });

  if (error) {
    // RAISE de plpgsql sem errcode chega sempre como P0001 (raise_exception),
    // entao a geometria e reconhecida pela mensagem que a funcao SQL padroniza
    // ('geometria_invalida: ...') e nao pelo SQLSTATE. O resto (unique,
    // check, FK, data invalida) tem SQLSTATE proprio e vai para lancarErroEscrita.
    if (String(error.message ?? '').includes('geometria_invalida')) {
      console.warn('Geometria recusada pelo banco no PATCH de projeto.');
      throw new ErroRota('geometria_invalida', 400);
    }
    lancarErroEscrita(error as ErroBanco, 'carbon_projeto_atualizar', 'periodo_invalido');
  }

  // A funcao devolve false quando o id nao existe: 404 honesto sem consulta extra
  // antes de escrever.
  if (data !== true) return respostaErro('nao_encontrado', 404);

  // Releitura em vez de returning: area_calculada_ha e atualizado_em vem de
  // trigger, e a geometria precisa voltar como GeoJSON.
  const linha = await lerProjeto(ctx.admin, id);
  if (!linha) return respostaErro('nao_encontrado', 404);
  return respostaJson({ projeto: await montarProjetoComGeometria(ctx.admin, linha) });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'projetos', escrita: false, handler: listar },
  { metodo: 'POST', padrao: 'projetos', escrita: true, handler: criar },
  { metodo: 'GET', padrao: 'projetos/:id', escrita: false, handler: obter },
  { metodo: 'PATCH', padrao: 'projetos/:id', escrita: true, handler: atualizar },
];

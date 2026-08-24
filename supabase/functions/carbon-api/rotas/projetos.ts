// -----------------------------------------------------------------------------
// Rotas de projeto de carbono (issue #1).
// -----------------------------------------------------------------------------
// GET   carbon-api/projetos              -> { projetos: [...], pode_criar }
// POST  carbon-api/projetos              -> { projeto } (201)
// GET   carbon-api/projetos/:id          -> { projeto, equipe, pode_escrever }
// PATCH carbon-api/projetos/:id          -> { projeto }
// PATCH carbon-api/projetos/:id/equipe   -> { equipe, nao_encontrados }
//
// PORTAO DE LEITURA. Quem enxerga um projeto e quem PARTICIPA dele, pela tabela
// carbon_projeto_equipe (migration 20260822090000_projeto_equipe). Admin ignora a
// tabela e ve tudo; gestor NAO ve tudo, apenas escreve no que ja enxerga.
//
// O portao e aplicado DENTRO da consulta que traz o dado, por inner join (ver
// comVisibilidade). Nao existe um "conferir" separado do "ler": sem o join que
// casa o usuario, a consulta simplesmente nao devolve linha. Duas consultas
// abririam uma janela entre uma e outra, e a segunda leria sem o filtro.
//
// "Nao existe" e "voce nao participa" respondem o MESMO 404, pelo mesmo caminho
// de codigo. Distinguir os dois transformaria a rota num oraculo: bastaria pedir
// ids ate parar de receber 404 para descobrir quantos projetos a APSIS tem.
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
import { ehAdmin, podeEscrever } from './acesso.ts';
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
  LIMITE_ITENS_LISTA,
  LIMITE_TEXTO_CURTO,
  listaBranca,
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
/**
 * Consulta de carbon_projetos JA com o portao de leitura aplicado.
 *
 * Para admin, a consulta e a de sempre. Para todo o resto, um inner join com
 * carbon_projeto_equipe filtrado pelo usuario da requisicao: a linha so existe
 * no resultado se a pessoa participar.
 *
 * O embed NAO e ambiguo aqui: carbon_projetos recebe uma unica chave estrangeira
 * vinda de carbon_projeto_equipe (projeto_id). O caminho inverso e que seria
 * ambiguo, porque carbon_projeto_equipe tem DUAS FKs para carbon_usuarios
 * (usuario_id e criado_por) - e por isso que lerEquipe nao usa embed.
 *
 * Mesmo idioma de rotas/modulos.ts, que ja resolve visibilidade por join.
 */
function comVisibilidade(ctx: Contexto) {
  const base = ctx.admin.from('carbon_projetos');
  return ehAdmin(ctx.registro)
    ? base.select(COLUNAS_PROJETO)
    : base
        .select(`${COLUNAS_PROJETO}, carbon_projeto_equipe!inner(usuario_id)`)
        .eq('carbon_projeto_equipe.usuario_id', ctx.registro.id);
}

/**
 * Remove a coluna que so existe para o join filtrar. Sem isto, o objeto do
 * projeto sairia para a tela com um array carbon_projeto_equipe pendurado.
 */
function semJuncao(linha: Record<string, unknown>): LinhaProjeto {
  const { carbon_projeto_equipe: _ignorado, ...resto } = linha;
  return resto as LinhaProjeto;
}

/**
 * Le um projeto CONFERINDO a visibilidade. E esta a funcao que os outros modulos
 * de rota devem usar para resolver um projeto a partir do id da URL.
 *
 * Devolve null tanto para "nao existe" quanto para "voce nao participa", de
 * proposito: o chamador responde 404 nos dois casos, pelo mesmo caminho, sem
 * diferenca de tempo entre eles.
 */
export async function lerProjetoVisivel(
  ctx: Contexto,
  id: string,
): Promise<LinhaProjeto | null> {
  const { data, error } = await comVisibilidade(ctx).eq('id', id).maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_projetos:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return data ? semJuncao(data as Record<string, unknown>) : null;
}

/**
 * Releitura SEM portao, para uso interno deste modulo apenas.
 *
 * Existe por um motivo estreito: em criar() e em atualizar(), a linha acabou de
 * ser escrita pelo proprio chamador, que ja passou pelo portao. Reaplicar o
 * filtro na releitura faria um admin que nao pertence a equipe receber 404
 * DEPOIS de a escrita ter sido aplicada - a tela mostraria erro e o dado estaria
 * gravado, que e exatamente o modo de falha que a RPC carbon_projeto_atualizar
 * existe para evitar.
 *
 * NAO e exportada, e nao deve ser. Quem precisa resolver um projeto a partir de
 * um id que veio da URL usa lerProjetoVisivel.
 */
async function relerProjeto(
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
  const { data, error } = await comVisibilidade(ctx)
    .order('ativo', { ascending: false })
    .order('nome', { ascending: true });

  // Erro de banco responde 500, e nao lista vazia. Uma consulta que falhou e uma
  // pessoa sem projeto nenhum sao coisas diferentes, e devolver [] nas duas faria
  // a tela dizer "voce nao participa de nenhum projeto" quando o banco caiu.
  if (error) {
    console.error('Falha ao ler carbon_projetos:', error.message);
    return respostaErro('erro_interno', 500);
  }

  const projetos = ((data ?? []) as Record<string, unknown>[]).map((linha) =>
    montarProjeto(semJuncao(linha))
  );

  // pode_criar vai no envelope para a tela poder explicar a lista vazia de forma
  // diferente para quem pode criar projeto e para quem depende de ser incluido.
  // Nao e a tela recalculando a regra: e o servidor dizendo o que ele decidiu.
  return respostaJson({ projetos, pode_criar: podeEscrever(ctx.registro) });
}

async function obter(ctx: Contexto): Promise<Response> {
  const linha = await lerProjetoVisivel(ctx, ctx.params.id);
  if (!linha) return respostaErro('nao_encontrado', 404);

  return respostaJson({
    projeto: await montarProjetoComGeometria(ctx.admin, linha),
    equipe: await lerEquipe(ctx, linha.id),
    pode_escrever: podeEscrever(ctx.registro),
  });
}

/**
 * Quem participa deste projeto.
 *
 * DUAS consultas, sem embed do PostgREST, e isso e obrigatorio:
 * carbon_projeto_equipe tem DUAS chaves estrangeiras para carbon_usuarios
 * (usuario_id e criado_por), entao `.select('carbon_usuarios!inner(...)')` e
 * ambiguo e responde PGRST201, derrubando GET /projetos/:id para todo mundo.
 *
 * O precedente de rotas/secureshare.ts usa embed e funciona, mas so porque
 * carbon_secure_share_equipe nao tem coluna criado_por. Copiar aquele idioma
 * para ca quebraria.
 */
async function lerEquipe(ctx: Contexto, projetoId: string): Promise<unknown[]> {
  const { data: vinculos, error } = await ctx.admin
    .from('carbon_projeto_equipe')
    .select('usuario_id')
    .eq('projeto_id', projetoId);

  if (error) {
    console.error('Falha ao ler carbon_projeto_equipe:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const ids = (vinculos ?? []).map((l) => String(l.usuario_id));
  if (!ids.length) return [];

  const { data: pessoas, error: erroPessoas } = await ctx.admin
    .from('carbon_usuarios')
    .select('id, email, nome')
    .in('id', ids);

  if (erroPessoas) {
    console.error('Falha ao ler carbon_usuarios:', erroPessoas.message);
    throw new ErroRota('erro_interno', 500);
  }
  return pessoas ?? [];
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

  // `as unknown as` e nao `as` direto: o tipo que o supabase-js infere para o
  // retorno de insert().select() e uma uniao que inclui GenericStringError, e o
  // TypeScript recusa a conversao direta por nao haver sobreposicao suficiente.
  // O `error` ja foi tratado acima, entao aqui data e a linha.
  let linha = data as unknown as LinhaProjeto;

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
    const atualizada = await relerProjeto(ctx.admin, linha.id);
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

  // Portao ANTES da RPC. O papel ja foi conferido pelo index (escrita: true), mas
  // papel e uma pergunta sobre a pessoa, nao sobre a linha: sem isto, um gestor
  // editaria e arquivaria projeto de que nem participa.
  if (!(await lerProjetoVisivel(ctx, id))) return respostaErro('nao_encontrado', 404);

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
  const linha = await relerProjeto(ctx.admin, id);
  if (!linha) return respostaErro('nao_encontrado', 404);
  return respostaJson({ projeto: await montarProjetoComGeometria(ctx.admin, linha) });
}

// -----------------------------------------------------------------------------
// PATCH carbon-api/projetos/:id/equipe
// -----------------------------------------------------------------------------
// Corpo: { adicionar: ['<EMAIL>'], remover: ['<EMAIL>'] }. Mesmo contrato do
// PATCH de equipe do Secure Share, para as duas telas se parecerem.
//
// Por e-mail e nao por uuid porque e o que a tela tem em maos ao digitar.
//
// QUEM PODE CHAMAR sai da composicao de dois portoes que ja existem, sem regra
// nova: `escrita: true` exige admin ou gestor (conferido no index.ts), e
// lerProjetoVisivel exige participar. O bootstrap - o primeiro membro de um
// projeto novo - e resolvido pela trigger do banco, que poe o criador na equipe.

async function atualizarEquipe(ctx: Contexto): Promise<Response> {
  const projeto = await lerProjetoVisivel(ctx, ctx.params.id);
  if (!projeto) return respostaErro('nao_encontrado', 404);

  const corpo = listaBranca(ctx.corpo, ['adicionar', 'remover']);

  const lista = (valor: unknown, campo: string): string[] => {
    if (valor === undefined || valor === null) return [];
    if (!Array.isArray(valor) || valor.length > LIMITE_ITENS_LISTA) {
      throw new ErroRota('campo_invalido', 400, campo);
    }
    return valor
      .map((e) => lerTexto(e, campo, 320))
      .filter((e): e is string => !!e)
      .map((e) => e.toLowerCase());
  };

  const adicionar = lista(corpo.adicionar, 'adicionar');
  const remover = lista(corpo.remover, 'remover');
  if (!adicionar.length && !remover.length) throw new ErroRota('nada_para_atualizar', 400);

  const naoEncontrados: string[] = [];

  if (adicionar.length) {
    // Dominio conferido contra a config, e nao contra um literal: o valor vem de
    // carbon_app_config e ja chega normalizado no contexto.
    const sufixo = `@${ctx.dominio}`;
    const externos = adicionar.filter((e) => !e.endsWith(sufixo));
    if (externos.length) throw new ErroRota('colaborador_externo', 400, externos[0]);

    const { data: usuarios, error } = await ctx.admin
      .from('carbon_usuarios')
      .select('id, email')
      .in('email', adicionar);
    if (error) {
      console.error('Falha ao resolver colaboradores:', error.message);
      throw new ErroRota('erro_interno', 500);
    }

    const achados = new Map((usuarios ?? []).map((u) => [String(u.email).toLowerCase(), u.id]));
    for (const email of adicionar) if (!achados.has(email)) naoEncontrados.push(email);

    if (achados.size) {
      const { error: erroInsere } = await ctx.admin
        .from('carbon_projeto_equipe')
        .upsert(
          [...achados.values()].map((usuario_id) => ({
            projeto_id: projeto.id,
            usuario_id,
            criado_por: ctx.registro.id,
          })),
          { onConflict: 'projeto_id,usuario_id', ignoreDuplicates: true },
        );
      if (erroInsere) lancarErroEscrita(erroInsere as ErroBanco, 'carbon_projeto_equipe');
    }
  }

  if (remover.length) {
    const { data: usuarios, error } = await ctx.admin
      .from('carbon_usuarios')
      .select('id')
      .in('email', remover);
    // O erro e tratado, e nao descartado: engolir aqui faria a revogacao NAO
    // acontecer e a rota responder 200 com a equipe intacta. Quem clicou em
    // remover iria embora achando que tirou o acesso de alguem.
    if (error) {
      console.error('Falha ao resolver colaboradores para remocao:', error.message);
      throw new ErroRota('erro_interno', 500);
    }

    const ids = (usuarios ?? []).map((u) => String(u.id));
    if (ids.length) {
      // Guarda contra esvaziar a equipe, conferida DEPOIS das adicoes desta mesma
      // requisicao (trocar duas pessoas de uma vez e legitimo). Projeto sem
      // ninguem so apareceria para admin, e nao existiria via de reentrada: quem
      // inclui precisa participar.
      const restantes = await lerEquipe(ctx, projeto.id);
      const sobra = (restantes as { id: string }[]).filter((p) => !ids.includes(p.id));
      if (!sobra.length) throw new ErroRota('equipe_vazia', 400);

      const { error: erroRemove } = await ctx.admin
        .from('carbon_projeto_equipe')
        .delete()
        .eq('projeto_id', projeto.id)
        .in('usuario_id', ids);
      if (erroRemove) lancarErroEscrita(erroRemove as ErroBanco, 'carbon_projeto_equipe');
    }
  }

  return respostaJson({
    equipe: await lerEquipe(ctx, projeto.id),
    // Nao e erro: quem nunca entrou no Apsis Carbon ainda nao tem linha em
    // carbon_usuarios (ela nasce no primeiro login). A tela avisa e mantem os
    // demais que foram incluidos.
    nao_encontrados: naoEncontrados,
  });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'projetos', escrita: false, handler: listar },
  { metodo: 'POST', padrao: 'projetos', escrita: true, handler: criar },
  { metodo: 'GET', padrao: 'projetos/:id', escrita: false, handler: obter },
  { metodo: 'PATCH', padrao: 'projetos/:id', escrita: true, handler: atualizar },
  { metodo: 'PATCH', padrao: 'projetos/:id/equipe', escrita: true, handler: atualizarEquipe },
];

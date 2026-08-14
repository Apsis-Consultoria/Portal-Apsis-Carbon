// -----------------------------------------------------------------------------
// Edge Function: carbon-api
// -----------------------------------------------------------------------------
// GET   {SUPABASE_URL}/functions/v1/carbon-api/me
// GET   {SUPABASE_URL}/functions/v1/carbon-api/modulos
// GET   {SUPABASE_URL}/functions/v1/carbon-api/notificacoes
// GET   {SUPABASE_URL}/functions/v1/carbon-api/projetos            -> { projetos: [...] }
// POST  {SUPABASE_URL}/functions/v1/carbon-api/projetos            -> { projeto }  (201)
// GET   {SUPABASE_URL}/functions/v1/carbon-api/projetos/:id        -> { projeto }  (com geometria em GeoJSON)
// PATCH {SUPABASE_URL}/functions/v1/carbon-api/projetos/:id        -> { projeto }
// GET   {SUPABASE_URL}/functions/v1/carbon-api/projetos/:id/pdd    -> { capitulos: [...], progresso: {...} }
// POST  {SUPABASE_URL}/functions/v1/carbon-api/projetos/:id/pdd    -> { criados, capitulos, progresso }
// PATCH {SUPABASE_URL}/functions/v1/carbon-api/pdd-capitulos/:id   -> { capitulo }
//
// Exige:
//   Authorization: Bearer <ID token do Azure AD>
//   apikey: <anon key do projeto>
//
// verify_jwt = false em supabase/config.toml porque o token do Authorization e da
// MICROSOFT, nao do Supabase Auth. A autenticacao real acontece aqui, em
// _shared/azureAuth.ts, contra o JWKS oficial do tenant. Somente DEPOIS de o
// token passar por assinatura, issuer, audience, tid e dominio corporativo o
// codigo toca o banco com o client de servidor.
//
// Metodos aceitos: GET, POST, PATCH (e OPTIONS para o preflight). Qualquer outro
// leva 405 antes de qualquer trabalho.
//
// Objetos SQL de que esta funcao depende (criados na migration de projetos e PDD):
//   public.carbon_projeto_definir_geometria(p_projeto_id uuid, p_geojson jsonb)
//   public.carbon_projeto_geojson(p_projeto_id uuid) returns jsonb
//   public.carbon_pdd_criar_do_template(p_projeto_id uuid, p_standard text default null)
//   public.carbon_pdd_progresso(p_projeto_id uuid) returns jsonb
//   public.carbon_projeto_atualizar(p_projeto_id uuid, p_dados jsonb,
//                                   p_mexe_geometria boolean, p_geojson jsonb)
// A conversao de geometria vive no banco porque o PostgREST serializa coluna
// geometry como EWKB hexadecimal e nao aceita ST_AsGeoJSON dentro de select. O
// PATCH de projeto passa por carbon_projeto_atualizar porque campos e geometria
// precisam ser gravados na MESMA transacao: duas chamadas da Edge Function sao
// dois commits, e a recusa da segunda deixaria a primeira aplicada.
//
// Erros padronizados:
//   400 { erro: 'id_invalido' }              :id fora do formato uuid
//   400 { erro: 'corpo_invalido' }           corpo da requisicao nao e objeto JSON
//   400 { erro: 'nome_obrigatorio' }         POST /projetos sem nome
//   400 { erro: 'status_invalido' }          status_registro ou status de capitulo fora do enum
//   400 { erro: 'campo_invalido', detalhe }  detalhe = nome do campo recusado
//   400 { erro: 'periodo_invalido' }         fim do periodo de creditacao antes do inicio
//   400 { erro: 'referencia_invalida' }      responsavel_id (ou outra FK) inexistente
//   400 { erro: 'nada_para_atualizar' }      PATCH sem nenhum campo da lista branca
//   400 { erro: 'geometria_invalida' }       GeoJSON malformado ou recusado pelo PostGIS
//   401 { erro: 'nao_autenticado' }
//   403 { erro: 'dominio_nao_permitido' }
//   403 { erro: 'usuario_inativo' }          colaborador com carbon_usuarios.ativo = false
//   403 { erro: 'sem_permissao' }            escrita sem papel admin ou gestor
//   404 { erro: 'nao_encontrado' }           id valido que nao existe
//   404 { erro: 'rota_desconhecida' }
//   405 { erro: 'metodo_nao_permitido' }
//   409 { erro: 'registro_duplicado' }       registro_id ja usado por outro projeto
//   413 { erro: 'geometria_invalida' }       GeoJSON acima do limite aceito
//   500 { erro: 'config_indisponivel' | 'config_incompleta' | 'erro_interno' }

import { respostaErro, respostaJson, tratarOptions } from '../_shared/cors.ts';
import { obterAdmin } from '../_shared/supabaseAdmin.ts';
import { validarTokenAzure } from '../_shared/azureAuth.ts';
import type { ConfigApp, ConfigAzure } from '../_shared/azureAuth.ts';

const NOME_FUNCAO = 'carbon-api';
const LIMITE_NOTIFICACOES = 20;

// Metodos que esta funcao atende. OPTIONS e tratado antes, no preflight.
const METODOS_ACEITOS = new Set(['GET', 'POST', 'PATCH']);
const CABECALHO_METODOS = 'GET, POST, PATCH, OPTIONS';

// Divergencia tolerada entre a area declarada na documentacao do projeto e a area
// calculada a partir da geometria. Exigencia literal do item 4 do checklist de
// due diligence usado como referencia: acima disso o sistema tem que avisar.
const LIMITE_DIVERGENCIA_PCT = 5;

// Guardas de tamanho. Sem eles um corpo malicioso ou um shapefile inteiro entra
// como texto em coluna sem limite de tamanho.
const LIMITE_TEXTO_CURTO = 500;
const LIMITE_TEXTO_LONGO = 5000;
const LIMITE_ITENS_LISTA = 100;
const LIMITE_GEOJSON_CHARS = 4_000_000;

const STATUS_REGISTRO = new Set([
  'rascunho',
  'em_desenvolvimento',
  'em_validacao',
  'registrado',
  'em_verificacao',
  'suspenso',
  'encerrado',
]);

const STATUS_CAPITULO = new Set([
  'nao_iniciado',
  'em_andamento',
  'em_revisao',
  'concluido',
  'nao_aplicavel',
]);

// Papeis que podem escrever. Regra INICIAL e deliberadamente grossa: qualquer
// colaborador ativo do dominio le, so admin e gestor escrevem. O refinamento por
// projeto (quem participa de qual projeto) entra quando existir a issue de
// permissao por projeto; antes disso nao vale inventar um modelo intermediario.
//
// PENDENCIA CONHECIDA, VALE PARA A LEITURA (nao e "definitivo por decisao"):
// garantirUsuario faz upsert a cada requisicao e carbon_usuarios nasce com papel
// 'colaborador' e ativo = true, portanto QUALQUER conta do tenant que fizer o
// primeiro login passa a ler /projetos e /projetos/:id/pdd - nome, proponente,
// registro_id, areas, periodo de creditacao e a geometria em GeoJSON de todos os
// projetos. Isso e mais frouxo do que /modulos, que exige linha em
// carbon_usuario_modulos justamente para material sensivel nao vazar para o
// dominio inteiro. Foi aceito para a entrega inicial (a base ainda esta vazia e
// sem projeto real), mas precisa de portao antes de entrar dado de cliente:
// liberacao explicita por modulo ou equipe por projeto. Registrado como pendencia
// no contexto do projeto.
const PAPEIS_ESCRITA = new Set(['admin', 'gestor']);

// Colunas devolvidas de carbon_projetos. Enumeradas de proposito: 'select *'
// traria a coluna geometry serializada como EWKB hexadecimal, que e pesada e
// inutil para o navegador. A geometria sai por funcao SQL, so no detalhe.
const COLUNAS_PROJETO =
  'id, nome, proponente, standard, metodologia, pais, estado, municipio, ' +
  'area_declarada_ha, area_calculada_ha, data_inicio, periodo_creditacao_inicio, ' +
  'periodo_creditacao_fim, status_registro, registro_id, registros_anteriores, ' +
  'ativo, criado_por, criado_em, atualizado_em';

const COLUNAS_CAPITULO =
  'id, projeto_id, capitulo, nome, cap, nivel, opcional, ordem, status, ' +
  'responsavel_id, observacoes, criado_em, atualizado_em';

// Progresso neutro para quando o projeto ainda nao tem capitulos. Existe para o
// frontend nunca receber undefined e nunca dividir por zero.
const PROGRESSO_VAZIO = {
  total: 0,
  concluidos: 0,
  nao_aplicaveis: 0,
  pct: 0,
  por_capitulo: [] as unknown[],
};

type Usuario = { email: string; nome: string };

/** Linha de carbon_usuarios resolvida a cada requisicao autenticada. */
type RegistroUsuario = {
  id: string;
  email: string;
  nome: string | null;
  papel: string;
  ativo: boolean;
};

/** Linha de carbon_projetos como volta do PostgREST (colunas de COLUNAS_PROJETO). */
type LinhaProjeto = { id: string } & Record<string, unknown>;

/** Erro do PostgREST/Postgres na forma minima que nos interessa. */
type ErroBanco = { code?: string; message: string };

// -----------------------------------------------------------------------------
// Erro de requisicao
// -----------------------------------------------------------------------------

/**
 * Erro que sabe virar resposta HTTP. Existe para a validacao de corpo poder
 * abortar de qualquer profundidade sem que cada helper devolva um union
 * "valor ou falha", que polui a leitura de todo o caminho feliz.
 *
 * O handler converte em respostaErro(codigo, status, detalhe).
 */
class ErroRequisicao extends Error {
  codigo: string;
  status: number;
  detalhe?: string;

  constructor(codigo: string, status = 400, detalhe?: string) {
    super(codigo);
    this.name = 'ErroRequisicao';
    this.codigo = codigo;
    this.status = status;
    this.detalhe = detalhe;
  }
}

// -----------------------------------------------------------------------------
// Helpers genericos
// -----------------------------------------------------------------------------

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Chave presente no corpo, mesmo que com valor null (que significa "limpar"). */
function veioNoCorpo(corpo: Record<string, unknown>, campo: string): boolean {
  return Object.prototype.hasOwnProperty.call(corpo, campo);
}

/** numeric do Postgres pode chegar como number ou string; normalizamos. */
function paraNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

/**
 * Traduz erro de escrita do Postgres em resposta de cliente.
 *
 * Sem isso, violacao de unique ou de check vira 500 erro_interno e o usuario nao
 * descobre que o problema esta no dado que ele mesmo enviou.
 */
function lancarErroEscrita(
  erro: ErroBanco,
  contexto: string,
  codigoCheck = 'campo_invalido',
): never {
  const codigo = erro.code ?? '';
  if (codigo === '23505') throw new ErroRequisicao('registro_duplicado', 409);
  if (codigo === '23514') throw new ErroRequisicao(codigoCheck, 400);
  if (codigo === '23503') throw new ErroRequisicao('referencia_invalida', 400);
  // 23502 not null: acontece quando o cliente manda null numa coluna NOT NULL
  // (standard, pais, registros_anteriores). Dado enviado, nao falha de servidor.
  if (codigo === '23502') throw new ErroRequisicao('campo_invalido', 400);
  // 22P02 sintaxe de entrada invalida, 22003 fora da faixa numerica,
  // 22007/22008 data invalida: sempre culpa do dado enviado.
  if (['22P02', '22003', '22007', '22008'].includes(codigo)) {
    throw new ErroRequisicao('campo_invalido', 400);
  }
  console.error(`Falha de escrita em ${contexto}:`, erro.message);
  throw new ErroRequisicao('erro_interno', 500);
}

// -----------------------------------------------------------------------------
// Roteamento
// -----------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Extrai a rota depois do nome da funcao. O pathname chega como
 * /functions/v1/carbon-api/modulos em producao e pode variar em ambiente local,
 * por isso ancoramos no nome da funcao em vez de contar segmentos.
 */
function extrairRota(url: string): string {
  const segmentos = new URL(url).pathname.split('/').filter(Boolean);
  const indice = segmentos.lastIndexOf(NOME_FUNCAO);
  if (indice === -1) return '';
  return segmentos.slice(indice + 1).join('/');
}

type Acao =
  | 'me'
  | 'modulos'
  | 'notificacoes'
  | 'projetos_listar'
  | 'projetos_criar'
  | 'projeto_obter'
  | 'projeto_atualizar'
  | 'pdd_obter'
  | 'pdd_criar'
  | 'pdd_capitulo_atualizar';

type Casamento =
  | { ok: true; acao: Acao; id: string | null; escrita: boolean }
  | { ok: false; codigo: string; status: number };

/**
 * Casa metodo + caminho com uma acao conhecida.
 *
 * Roda ANTES da autenticacao de proposito, mantendo a propriedade que a versao
 * de tres rotas fixas ja tinha: caminho que nao existe, metodo que nao existe e
 * :id fora do formato uuid sao recusados sem gastar uma validacao de JWKS
 * (busca de chaves na Microsoft) nem uma consulta ao banco. Nada disso depende
 * de quem esta chamando, entao nao ha informacao vazada ao recusar antes.
 */
function casarRota(metodo: string, rota: string): Casamento {
  const partes = rota.split('/').filter(Boolean);

  const resolver = (mapa: Partial<Record<string, Acao>>, id: string | null): Casamento => {
    const acao = mapa[metodo];
    if (!acao) return { ok: false, codigo: 'metodo_nao_permitido', status: 405 };
    if (id !== null && !UUID_RE.test(id)) {
      return { ok: false, codigo: 'id_invalido', status: 400 };
    }
    return { ok: true, acao, id, escrita: metodo !== 'GET' };
  };

  if (partes.length === 1) {
    if (partes[0] === 'me') return resolver({ GET: 'me' }, null);
    if (partes[0] === 'modulos') return resolver({ GET: 'modulos' }, null);
    if (partes[0] === 'notificacoes') return resolver({ GET: 'notificacoes' }, null);
    if (partes[0] === 'projetos') {
      return resolver({ GET: 'projetos_listar', POST: 'projetos_criar' }, null);
    }
  }

  if (partes.length === 2 && partes[0] === 'projetos') {
    return resolver({ GET: 'projeto_obter', PATCH: 'projeto_atualizar' }, partes[1]);
  }

  if (partes.length === 2 && partes[0] === 'pdd-capitulos') {
    return resolver({ PATCH: 'pdd_capitulo_atualizar' }, partes[1]);
  }

  if (partes.length === 3 && partes[0] === 'projetos' && partes[2] === 'pdd') {
    return resolver({ GET: 'pdd_obter', POST: 'pdd_criar' }, partes[1]);
  }

  return { ok: false, codigo: 'rota_desconhecida', status: 404 };
}

/**
 * Preflight com os metodos desta funcao.
 *
 * O CORS_HEADERS de _shared/cors.ts anuncia apenas GET, POST e OPTIONS, porque e
 * compartilhado com a app-config, que so le. Aqui existe PATCH, e sem anunciar o
 * metodo o navegador barra a requisicao no proprio preflight, antes de sair da
 * maquina. Sobrescrevemos so o cabecalho de metodos, reaproveitando o resto.
 */
function tratarPreflight(req: Request): Response | null {
  const base = tratarOptions(req);
  if (!base) return null;

  const cabecalhos = new Headers(base.headers);
  cabecalhos.set('Access-Control-Allow-Methods', CABECALHO_METODOS);
  return new Response(null, { status: 204, headers: cabecalhos });
}

// -----------------------------------------------------------------------------
// Configuracao (lida do banco a cada invocacao fria)
// -----------------------------------------------------------------------------

type ConfigNecessaria = { azure: ConfigAzure; app: ConfigApp };

/**
 * Le os blocos azure e app de carbon_app_config.
 *
 * Sem filtro por publico aqui de proposito: esta funcao usa a config para
 * VALIDAR o token e nada do que le e devolvido ao cliente. Quem expoe config ao
 * navegador e a app-config, que filtra publico = true.
 */
async function carregarConfig(): Promise<ConfigNecessaria | null> {
  const admin = obterAdmin();

  const { data, error } = await admin
    .from('carbon_app_config')
    .select('chave, valor')
    .in('chave', ['azure', 'app']);

  if (error) {
    console.error('Falha ao ler carbon_app_config:', error.message);
    return null;
  }

  const mapa: Record<string, Record<string, unknown>> = {};
  for (const linha of (data ?? []) as { chave: string; valor: Record<string, unknown> }[]) {
    mapa[linha.chave] = linha.valor ?? {};
  }

  if (!mapa.azure || !mapa.app) {
    console.error('Blocos azure e/ou app ausentes em carbon_app_config. Rode a migration.');
    return null;
  }

  return {
    azure: {
      clientId: String(mapa.azure.clientId ?? ''),
      tenantId: String(mapa.azure.tenantId ?? ''),
    },
    app: {
      dominioPermitido: String(mapa.app.dominioPermitido ?? ''),
    },
  };
}

// -----------------------------------------------------------------------------
// Resolucao do colaborador (usada por TODAS as rotas)
// -----------------------------------------------------------------------------

/**
 * Garante o registro do colaborador e devolve a linha completa.
 *
 * O upsert usa o e-mail como chave natural. Enviamos apenas email e nome, para
 * que papel, cargo e ativo (curados pela administracao) nao sejam sobrescritos
 * a cada login. O e-mail ja chega normalizado em minusculas pelo azureAuth,
 * casando com o indice unico carbon_usuarios_email_lower_idx.
 *
 * Chamado no handler, ANTES do switch de rotas, por dois motivos:
 *   1. `ativo = false` precisa bloquear TODAS as rotas (era letra morta antes:
 *      a coluna era apenas devolvida por /me e ninguem a conferia);
 *   2. o `id` resultante e o que permite filtrar os modulos liberados para este
 *      colaborador em carbon_usuario_modulos.
 */
async function garantirUsuario(usuario: Usuario): Promise<RegistroUsuario | null> {
  const admin = obterAdmin();

  const { data, error } = await admin
    .from('carbon_usuarios')
    .upsert({ email: usuario.email, nome: usuario.nome }, { onConflict: 'email' })
    .select('id, email, nome, papel, ativo')
    .single();

  if (error || !data) {
    console.error('Falha no upsert de carbon_usuarios:', error?.message ?? 'sem retorno');
    return null;
  }

  return data as RegistroUsuario;
}

/** Autorizacao de escrita. Ver comentario de PAPEIS_ESCRITA. */
function podeEscrever(registro: RegistroUsuario): boolean {
  return PAPEIS_ESCRITA.has(String(registro.papel ?? '').toLowerCase());
}

// -----------------------------------------------------------------------------
// Rota /me
// -----------------------------------------------------------------------------

/** Perfil do colaborador. O registro ja foi resolvido pelo handler. */
function rotaMe(registro: RegistroUsuario): Response {
  return respostaJson({
    email: registro.email,
    nome: registro.nome,
    papel: registro.papel,
    ativo: registro.ativo,
  });
}

// -----------------------------------------------------------------------------
// Rota /modulos
// -----------------------------------------------------------------------------

/**
 * Modulos ATIVOS e LIBERADOS para este colaborador, na ordem de exibicao.
 *
 * O inner join com carbon_usuario_modulos e obrigatorio: sem ele qualquer
 * colaborador do dominio veria todos os modulos cadastrados, inclusive material
 * sensivel (pericia, litigio sob segredo de justica), e a tabela de autorizacao
 * seria decoracao. Liberar um modulo passa a ser sempre um INSERT em
 * carbon_usuario_modulos - inclusive para admins.
 *
 * Sem liberacao nenhuma a lista volta vazia, e o frontend mostra o estado vazio
 * elegante: nao e erro.
 */
async function rotaModulos(registro: RegistroUsuario): Promise<Response> {
  const admin = obterAdmin();

  const { data, error } = await admin
    .from('carbon_modulos')
    .select(
      'chave, label, descricao, icone, rota, url_externa, accent, ordem, carbon_usuario_modulos!inner(usuario_id)',
    )
    .eq('ativo', true)
    .eq('carbon_usuario_modulos.usuario_id', registro.id)
    .order('ordem', { ascending: true })
    .order('label', { ascending: true });

  if (error) {
    console.error('Falha ao ler carbon_modulos:', error.message);
    return respostaErro('erro_interno', 500);
  }

  // A coluna do join existe apenas para filtrar: nao faz parte do contrato da
  // resposta, entao sai do payload antes de ir para o navegador.
  const modulos = ((data ?? []) as Record<string, unknown>[]).map((linha) => {
    const copia = { ...linha };
    delete copia.carbon_usuario_modulos;
    return copia;
  });

  return respostaJson({ modulos });
}

// -----------------------------------------------------------------------------
// Rota /notificacoes
// -----------------------------------------------------------------------------

/**
 * Notificacoes visiveis para o colaborador: nao expiradas e destinadas a todos
 * (email_destino null) ou a ele.
 *
 * Os dois .or() sao combinados com AND pelo PostgREST (cada parametro or= e uma
 * condicao independente). O e-mail e interpolado no filtro com seguranca porque
 * o azureAuth ja o validou contra uma regex que proibe virgula e parenteses,
 * que sao os metacaracteres da sintaxe de filtro do PostgREST.
 */
async function rotaNotificacoes(usuario: Usuario): Promise<Response> {
  const admin = obterAdmin();
  const agora = new Date().toISOString();

  const { data, error } = await admin
    .from('carbon_notificacoes')
    .select('id, tipo, titulo, descricao, acao, criado_em')
    .or(`expira_em.is.null,expira_em.gt.${agora}`)
    .or(`email_destino.is.null,email_destino.eq.${usuario.email}`)
    .order('criado_em', { ascending: false })
    .limit(LIMITE_NOTIFICACOES);

  if (error) {
    console.error('Falha ao ler carbon_notificacoes:', error.message);
    return respostaErro('erro_interno', 500);
  }

  return respostaJson({ notificacoes: data ?? [] });
}

// -----------------------------------------------------------------------------
// Leitura e validacao do corpo
// -----------------------------------------------------------------------------

/**
 * Corpo JSON da requisicao. Corpo vazio vira {} para que POST sem corpo caia na
 * validacao de campo obrigatorio, com mensagem util, em vez de erro de parse.
 */
async function lerCorpo(req: Request): Promise<Record<string, unknown>> {
  let bruto = '';
  try {
    bruto = await req.text();
  } catch {
    throw new ErroRequisicao('corpo_invalido', 400);
  }

  if (!bruto.trim()) return {};

  let valor: unknown;
  try {
    valor = JSON.parse(bruto);
  } catch {
    throw new ErroRequisicao('corpo_invalido', 400);
  }

  if (!ehObjeto(valor)) throw new ErroRequisicao('corpo_invalido', 400);
  return valor;
}

/** Texto aparado. String vazia vira null (o banco guarda ausencia como null). */
function lerTexto(valor: unknown, campo: string, limite: number): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== 'string') throw new ErroRequisicao('campo_invalido', 400, campo);

  const limpo = valor.trim();
  if (limpo === '') return null;
  if (limpo.length > limite) throw new ErroRequisicao('campo_invalido', 400, campo);
  return limpo;
}

// Ponto seguido de EXATAMENTE tres digitos, sem quarto digito: "13.250",
// "1.234,50", "2.500 ha". E a assinatura do separador de milhar em pt-BR.
const SEPARADOR_MILHAR = /\.\d{3}(?!\d)/;

/**
 * Numero nao negativo para as colunas numeric(14,4).
 *
 * Aceita virgula como separador decimal quando nao ha ponto no valor, porque
 * campo de area digitado em pt-BR chega como "1234,5".
 *
 * RECUSA texto com cara de separador de milhar ("13.250"), em vez de adivinhar.
 * Number("13.250") e 13,25: mil vezes menor do que os treze mil duzentos e
 * cinquenta hectares que a pessoa digitou, e nada barraria o valor depois. Como e
 * exatamente esta coluna que entra no aviso de divergencia de 5% (criterio de
 * aceite da issue #1), errar a escala aqui contamina a checagem inteira em
 * silencio. Quem manda numero JSON de verdade nao passa por esta regra.
 */
function lerNumero(valor: unknown, campo: string): number | null {
  if (valor === null || valor === undefined || valor === '') return null;

  let bruto: unknown = valor;
  if (typeof bruto === 'string') {
    if (SEPARADOR_MILHAR.test(bruto)) {
      throw new ErroRequisicao('campo_invalido', 400, campo);
    }
    if (!bruto.includes('.') && bruto.includes(',')) {
      bruto = bruto.replace(',', '.');
    }
  }

  const n = typeof bruto === 'number' ? bruto : Number(bruto);
  // Limite de 1e10 vem da precisao da coluna: numeric(14,4) guarda 10 digitos
  // inteiros. Recusar aqui evita overflow do Postgres virando 500.
  if (!Number.isFinite(n) || n < 0 || n >= 1e10) {
    throw new ErroRequisicao('campo_invalido', 400, campo);
  }
  return n;
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Data no formato YYYY-MM-DD, com conferencia de existencia (barra 2026-02-31). */
function lerData(valor: unknown, campo: string): string | null {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor !== 'string' || !DATA_ISO.test(valor)) {
    throw new ErroRequisicao('campo_invalido', 400, campo);
  }

  const d = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== valor) {
    throw new ErroRequisicao('campo_invalido', 400, campo);
  }
  return valor;
}

/** Lista de texto para colunas text[]. Itens vazios sao descartados. */
function lerListaDeTexto(valor: unknown, campo: string): string[] {
  if (valor === null || valor === undefined) return [];
  if (!Array.isArray(valor)) throw new ErroRequisicao('campo_invalido', 400, campo);
  if (valor.length > LIMITE_ITENS_LISTA) throw new ErroRequisicao('campo_invalido', 400, campo);

  const itens: string[] = [];
  for (const item of valor) {
    if (typeof item !== 'string') throw new ErroRequisicao('campo_invalido', 400, campo);
    const limpo = item.trim();
    if (limpo.length > LIMITE_TEXTO_CURTO) throw new ErroRequisicao('campo_invalido', 400, campo);
    if (limpo) itens.push(limpo);
  }
  return itens;
}

function lerBooleano(valor: unknown, campo: string): boolean {
  if (typeof valor === 'boolean') return valor;
  throw new ErroRequisicao('campo_invalido', 400, campo);
}

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
  if (!ehObjeto(valor)) throw new ErroRequisicao('geometria_invalida', 400);

  let geo = valor;
  if (geo.type === 'Feature' && ehObjeto(geo.geometry)) {
    geo = geo.geometry as Record<string, unknown>;
  }

  if (typeof geo.type !== 'string' || !TIPOS_GEOMETRIA.has(geo.type)) {
    throw new ErroRequisicao('geometria_invalida', 400);
  }
  if (!Array.isArray(geo.coordinates) || geo.coordinates.length === 0) {
    throw new ErroRequisicao('geometria_invalida', 400);
  }
  if (JSON.stringify(geo).length > LIMITE_GEOJSON_CHARS) {
    throw new ErroRequisicao('geometria_invalida', 413, 'tamanho');
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
async function definirGeometria(projetoId: string, geojson: unknown): Promise<boolean> {
  const { error } = await obterAdmin().rpc('carbon_projeto_definir_geometria', {
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
async function lerGeometria(projetoId: string): Promise<unknown> {
  const { data, error } = await obterAdmin().rpc('carbon_projeto_geojson', {
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

/** Le um projeto pelo id. Devolve null quando nao existe. */
async function lerProjeto(id: string): Promise<LinhaProjeto | null> {
  const { data, error } = await obterAdmin()
    .from('carbon_projetos')
    .select(COLUNAS_PROJETO)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_projetos:', error.message);
    throw new ErroRequisicao('erro_interno', 500);
  }
  return (data as LinhaProjeto | null) ?? null;
}

/** Projeto do detalhe: inclui GeoJSON, e so paga a RPC quando ha geometria. */
async function montarProjetoComGeometria(linha: LinhaProjeto): Promise<Record<string, unknown>> {
  const geometria = temGeometria(linha) ? await lerGeometria(linha.id) : null;
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
 * Lista branca e nao "delete dos campos proibidos": campo desconhecido no corpo
 * e simplesmente ignorado, e nenhum campo novo da tabela passa a ser gravavel
 * pela API sem alguem escrever isso aqui. Sem esse cuidado, um corpo com
 * { criado_por, area_calculada_ha, ativo } reescreveria autoria, area calculada
 * pela geometria e o estado do registro.
 *
 * @param modo 'criar' exige nome; 'atualizar' toca somente o que veio no corpo.
 */
function montarDadosProjeto(
  corpo: Record<string, unknown>,
  modo: 'criar' | 'atualizar',
): Record<string, unknown> {
  const dados: Record<string, unknown> = {};

  if (modo === 'criar' || veioNoCorpo(corpo, 'nome')) {
    const nome = lerTexto(corpo.nome, 'nome', LIMITE_TEXTO_CURTO);
    if (!nome) throw new ErroRequisicao('nome_obrigatorio', 400);
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
        throw new ErroRequisicao('status_invalido', 400, 'status_registro');
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
    throw new ErroRequisicao('periodo_invalido', 400);
  }

  return dados;
}

// -----------------------------------------------------------------------------
// Rotas de projeto
// -----------------------------------------------------------------------------

/**
 * Lista os projetos.
 *
 * Sem paginacao de proposito: a operacao tem poucos projetos e paginar agora
 * seria complexidade sem demanda. Inativos vem no fim, com a flag ativo, para a
 * tela poder mostrar ou esconder sem uma segunda rota.
 */
async function rotaProjetosListar(): Promise<Response> {
  const { data, error } = await obterAdmin()
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

async function rotaProjetoObter(id: string): Promise<Response> {
  const linha = await lerProjeto(id);
  if (!linha) return respostaErro('nao_encontrado', 404);
  return respostaJson({ projeto: await montarProjetoComGeometria(linha) });
}

/**
 * Cria projeto. A geometria, quando vem, e gravada em uma segunda chamada.
 *
 * Nao existe transacao entre duas chamadas ao banco a partir da Edge Function,
 * entao quando o PostGIS recusa a geometria apagamos o projeto recem-criado
 * (compensacao) e respondemos 400. Assim o cliente que recebeu erro nao fica com
 * um projeto meio-criado que ele nao pediu.
 */
async function rotaProjetoCriar(
  registro: RegistroUsuario,
  corpo: Record<string, unknown>,
): Promise<Response> {
  const admin = obterAdmin();
  const dados = montarDadosProjeto(corpo, 'criar');

  // geometria: null significa "sem geometria", que na criacao e o mesmo que
  // omitir. Validamos a forma ANTES do insert para nao criar e depois desfazer.
  const enviouGeometria = veioNoCorpo(corpo, 'geometria') && corpo.geometria !== null;
  const geometria = enviouGeometria ? normalizarGeoJson(corpo.geometria) : null;

  const { data, error } = await admin
    .from('carbon_projetos')
    .insert({ ...dados, criado_por: registro.id })
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
    const gravou = await definirGeometria(linha.id, geometria);
    if (!gravou) {
      const { error: erroDesfazer } = await admin
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
    const atualizada = await lerProjeto(linha.id);
    if (atualizada) linha = atualizada;
  }

  return respostaJson({ projeto: await montarProjetoComGeometria(linha) }, 201);
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
async function rotaProjetoAtualizar(id: string, corpo: Record<string, unknown>): Promise<Response> {
  const dados = montarDadosProjeto(corpo, 'atualizar');
  const mexeGeometria = veioNoCorpo(corpo, 'geometria');

  if (!mexeGeometria && Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }

  // Forma do GeoJSON conferida aqui para o caso absurdo nao virar round trip.
  // null limpa a geometria, e p_mexe_geometria distingue isso de "nao mandou".
  const geometria =
    mexeGeometria && corpo.geometria !== null ? normalizarGeoJson(corpo.geometria) : null;

  const { data, error } = await obterAdmin().rpc('carbon_projeto_atualizar', {
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
      throw new ErroRequisicao('geometria_invalida', 400);
    }
    lancarErroEscrita(error as ErroBanco, 'carbon_projeto_atualizar', 'periodo_invalido');
  }

  // A funcao devolve false quando o id nao existe: 404 honesto sem consulta extra
  // antes de escrever.
  if (data !== true) return respostaErro('nao_encontrado', 404);

  // Releitura em vez de returning: area_calculada_ha e atualizado_em vem de
  // trigger, e a geometria precisa voltar como GeoJSON.
  const linha = await lerProjeto(id);
  if (!linha) return respostaErro('nao_encontrado', 404);
  return respostaJson({ projeto: await montarProjetoComGeometria(linha) });
}

// -----------------------------------------------------------------------------
// Rotas do PDD
// -----------------------------------------------------------------------------

/**
 * Capitulos do PDD do projeto e o progresso agregado.
 *
 * O progresso vem da funcao SQL carbon_pdd_progresso, nao de contagem aqui: a
 * regra de que capitulo 'nao_aplicavel' sai do denominador (senao o PDD nunca
 * fecha 100%, porque os criterios opcionais podem nao se aplicar) tem que ter
 * uma implementacao unica. Duplicar em TypeScript seria garantir divergencia.
 */
async function lerPdd(projetoId: string): Promise<{ capitulos: unknown[]; progresso: unknown }> {
  const admin = obterAdmin();

  const [capitulos, progresso] = await Promise.all([
    admin
      .from('carbon_pdd_capitulos')
      .select(COLUNAS_CAPITULO)
      .eq('projeto_id', projetoId)
      .order('ordem', { ascending: true }),
    admin.rpc('carbon_pdd_progresso', { p_projeto_id: projetoId }),
  ]);

  if (capitulos.error) {
    console.error('Falha ao ler carbon_pdd_capitulos:', capitulos.error.message);
    throw new ErroRequisicao('erro_interno', 500);
  }
  if (progresso.error) {
    console.error('Falha em carbon_pdd_progresso:', progresso.error.message);
    throw new ErroRequisicao('erro_interno', 500);
  }

  return {
    capitulos: (capitulos.data ?? []) as unknown[],
    progresso: progresso.data ?? PROGRESSO_VAZIO,
  };
}

async function rotaPddObter(projetoId: string): Promise<Response> {
  const projeto = await lerProjeto(projetoId);
  if (!projeto) return respostaErro('nao_encontrado', 404);

  const { capitulos, progresso } = await lerPdd(projetoId);
  return respostaJson({ capitulos, progresso });
}

/**
 * Cria os capitulos do PDD a partir do template do standard do projeto.
 *
 * Responde 200, nao 201: a funcao SQL e idempotente e pode criar zero capitulos
 * (o botao "criar PDD" clicado duas vezes nao duplica nada). O cliente sabe o que
 * aconteceu pelo campo criados.
 */
async function rotaPddCriar(projetoId: string): Promise<Response> {
  const projeto = await lerProjeto(projetoId);
  if (!projeto) return respostaErro('nao_encontrado', 404);

  const { data, error } = await obterAdmin().rpc('carbon_pdd_criar_do_template', {
    p_projeto_id: projetoId,
  });
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_pdd_criar_do_template');

  const criados = paraNumero(data) ?? 0;
  const { capitulos, progresso } = await lerPdd(projetoId);
  return respostaJson({ criados, capitulos, progresso });
}

/**
 * Atualiza um capitulo do PDD.
 *
 * Lista branca curta e proposital: numeracao, nome, nivel e ordem vem do
 * template e nao sao editaveis por esta rota. O que o time mexe no dia a dia e
 * status, responsavel e observacoes.
 */
async function rotaCapituloAtualizar(id: string, corpo: Record<string, unknown>): Promise<Response> {
  const dados: Record<string, unknown> = {};

  if (veioNoCorpo(corpo, 'status')) {
    const status = lerTexto(corpo.status, 'status', LIMITE_TEXTO_CURTO);
    if (!status || !STATUS_CAPITULO.has(status)) {
      throw new ErroRequisicao('status_invalido', 400);
    }
    dados.status = status;
  }

  if (veioNoCorpo(corpo, 'responsavel_id')) {
    const valor = corpo.responsavel_id;
    if (valor === null || valor === '') {
      dados.responsavel_id = null;
    } else if (typeof valor === 'string' && UUID_RE.test(valor)) {
      dados.responsavel_id = valor;
    } else {
      throw new ErroRequisicao('campo_invalido', 400, 'responsavel_id');
    }
  }

  if (veioNoCorpo(corpo, 'observacoes')) {
    dados.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO);
  }

  if (Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }

  const { data, error } = await obterAdmin()
    .from('carbon_pdd_capitulos')
    .update(dados)
    .eq('id', id)
    .select(COLUNAS_CAPITULO)
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_pdd_capitulos', 'status_invalido');
  if (!data) return respostaErro('nao_encontrado', 404);

  return respostaJson({ capitulo: data });
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = tratarPreflight(req);
  if (preflight) return preflight;

  if (!METODOS_ACEITOS.has(req.method)) {
    return respostaErro('metodo_nao_permitido', 405);
  }

  // Roteamento antes da autenticacao: ver comentario de casarRota.
  const casamento = casarRota(req.method, extrairRota(req.url));
  if (!casamento.ok) {
    return respostaErro(casamento.codigo, casamento.status);
  }

  try {
    const cfg = await carregarConfig();
    if (!cfg) {
      return respostaErro('config_indisponivel', 500);
    }

    const validacao = await validarTokenAzure(req, cfg);
    if (!validacao.ok) {
      return respostaErro(validacao.erro, validacao.status);
    }

    const usuario: Usuario = { email: validacao.email, nome: validacao.nome };

    // Registro do colaborador resolvido para TODAS as rotas. O bloqueio por
    // ativo = false acontece aqui, antes do switch: desativar alguem em
    // carbon_usuarios corta o acesso a todas as rotas de uma vez.
    const registro = await garantirUsuario(usuario);
    if (!registro) {
      return respostaErro('erro_interno', 500);
    }
    if (registro.ativo !== true) {
      // Log so com o dominio, nunca o e-mail completo (LGPD).
      console.warn(
        `Acesso bloqueado: colaborador inativo no dominio ${usuario.email.split('@')[1] ?? ''}`,
      );
      return respostaErro('usuario_inativo', 403);
    }

    // Escrita so para admin e gestor. A leitura hoje passa com qualquer
    // colaborador ativo do dominio, o que e uma PENDENCIA e nao uma decisao final:
    // ver o comentario de PAPEIS_ESCRITA antes de considerar isso resolvido.
    if (casamento.escrita && !podeEscrever(registro)) {
      return respostaErro('sem_permissao', 403);
    }

    const corpo = casamento.escrita ? await lerCorpo(req) : {};
    const id = casamento.id ?? '';

    switch (casamento.acao) {
      case 'me':
        return rotaMe(registro);
      case 'modulos':
        return await rotaModulos(registro);
      case 'notificacoes':
        return await rotaNotificacoes(usuario);
      case 'projetos_listar':
        return await rotaProjetosListar();
      case 'projetos_criar':
        return await rotaProjetoCriar(registro, corpo);
      case 'projeto_obter':
        return await rotaProjetoObter(id);
      case 'projeto_atualizar':
        return await rotaProjetoAtualizar(id, corpo);
      case 'pdd_obter':
        return await rotaPddObter(id);
      case 'pdd_criar':
        return await rotaPddCriar(id);
      case 'pdd_capitulo_atualizar':
        return await rotaCapituloAtualizar(id, corpo);
      default:
        return respostaErro('rota_desconhecida', 404);
    }
  } catch (e) {
    // Erro de validacao de corpo e de estado do recurso vira resposta de cliente;
    // o resto e 500 com log tecnico e sem detalhe para o navegador.
    if (e instanceof ErroRequisicao) {
      return respostaErro(e.codigo, e.status, e.detalhe);
    }
    console.error('Erro inesperado em carbon-api:', e instanceof Error ? e.message : e);
    return respostaErro('erro_interno', 500);
  }
});

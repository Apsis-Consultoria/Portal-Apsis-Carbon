// -----------------------------------------------------------------------------
// Helpers compartilhados pelos modulos de rota do carbon-api.
// -----------------------------------------------------------------------------
// Tudo aqui e generico: validacao de tipo primitivo, lista branca, traducao de
// erro do Postgres e paginacao. Regra de negocio de dominio NAO entra neste
// arquivo, senao ele volta a ser o index.ts monolitico com outro nome.
//
// Os limites de tamanho e os validadores foram extraidos do index.ts original sem
// mudanca de comportamento: os mesmos codigos de erro, com o mesmo `detalhe`.

/** Formato uuid v4-ish (qualquer versao). Usado pelo roteador e por FKs no corpo. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Guardas de tamanho. Sem eles um corpo malicioso ou um shapefile inteiro entra
// como texto em coluna sem limite de tamanho.
export const LIMITE_TEXTO_CURTO = 500;
export const LIMITE_TEXTO_LONGO = 5000;
export const LIMITE_ITENS_LISTA = 100;
export const LIMITE_GEOJSON_CHARS = 4_000_000;

// Paginacao. O limite maximo existe para ?limite=100000 nao virar um scan da
// tabela inteira a pedido do cliente.
export const LIMITE_PAGINA_PADRAO = 50;
export const LIMITE_PAGINA_MAXIMO = 200;

/** Erro do PostgREST/Postgres na forma minima que nos interessa. */
export type ErroBanco = { code?: string; message: string };

// -----------------------------------------------------------------------------
// Erro de rota
// -----------------------------------------------------------------------------

/**
 * Erro que sabe virar resposta HTTP. Existe para a validacao de corpo poder
 * abortar de qualquer profundidade sem que cada helper devolva um union
 * "valor ou falha", que polui a leitura de todo o caminho feliz.
 *
 * O index.ts converte em respostaErro(codigo, status, detalhe).
 *
 * Nome antigo: ErroRequisicao (dentro do index monolitico). Mesmo comportamento.
 */
export class ErroRota extends Error {
  codigo: string;
  status: number;
  detalhe?: string;

  constructor(codigo: string, status = 400, detalhe?: string) {
    super(codigo);
    this.name = 'ErroRota';
    this.codigo = codigo;
    this.status = status;
    this.detalhe = detalhe;
  }
}

// -----------------------------------------------------------------------------
// Corpo da requisicao
// -----------------------------------------------------------------------------

export function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Chave presente no corpo, mesmo que com valor null (que significa "limpar"). */
export function veioNoCorpo(corpo: Record<string, unknown>, campo: string): boolean {
  return Object.prototype.hasOwnProperty.call(corpo, campo);
}

/**
 * Corpo JSON da requisicao. Corpo vazio vira {} para que POST sem corpo caia na
 * validacao de campo obrigatorio, com mensagem util, em vez de erro de parse.
 */
export async function lerCorpo(req: Request): Promise<Record<string, unknown>> {
  let bruto = '';
  try {
    bruto = await req.text();
  } catch {
    throw new ErroRota('corpo_invalido', 400);
  }

  if (!bruto.trim()) return {};

  let valor: unknown;
  try {
    valor = JSON.parse(bruto);
  } catch {
    throw new ErroRota('corpo_invalido', 400);
  }

  if (!ehObjeto(valor)) throw new ErroRota('corpo_invalido', 400);
  return valor;
}

/**
 * Objeto so com as chaves PERMITIDAS e PRESENTES no corpo, com o valor cru.
 *
 * Lista branca e nao "delete dos campos proibidos": campo desconhecido e
 * simplesmente ignorado, e nenhuma coluna nova da tabela passa a ser gravavel
 * pela API sem alguem acrescentar o nome na lista. Sem esse cuidado um corpo com
 * { criado_por, area_calculada_ha, ativo } reescreveria autoria, valor derivado de
 * trigger e estado do registro.
 *
 * ATENCAO: isto filtra CHAVES, nao valida VALORES. Cada valor ainda precisa passar
 * por lerTexto / lerNumero / lerData / lerBooleano antes de ir para o banco.
 */
export function listaBranca(
  corpo: Record<string, unknown> | null,
  campos: readonly string[],
): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  if (!corpo) return saida;
  for (const campo of campos) {
    if (veioNoCorpo(corpo, campo)) saida[campo] = corpo[campo];
  }
  return saida;
}

/**
 * Exige que os campos venham no corpo com valor util.
 *
 * "Util" = presente, nao null e, para string, nao vazia depois do trim. Enviar
 * `{ nome: '   ' }` e o mesmo que nao enviar nada.
 *
 * @throws ErroRota('campo_obrigatorio', 400, <primeiro campo faltando>)
 */
export function exigir(
  corpo: Record<string, unknown> | null,
  campos: readonly string[],
): void {
  for (const campo of campos) {
    const valor = corpo ? corpo[campo] : undefined;
    const vazio = valor === undefined || valor === null ||
      (typeof valor === 'string' && valor.trim() === '');
    if (vazio) throw new ErroRota('campo_obrigatorio', 400, campo);
  }
}

// -----------------------------------------------------------------------------
// Leitura de valores
// -----------------------------------------------------------------------------

/**
 * Texto aparado. String vazia vira null (o banco guarda ausencia como null).
 *
 * @param campo vai no `detalhe` do erro, para o cliente saber qual campo recusou.
 */
export function lerTexto(
  valor: unknown,
  campo?: string,
  limite = LIMITE_TEXTO_CURTO,
): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== 'string') throw new ErroRota('campo_invalido', 400, campo);

  const limpo = valor.trim();
  if (limpo === '') return null;
  if (limpo.length > limite) throw new ErroRota('campo_invalido', 400, campo);
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
export function lerNumero(valor: unknown, campo?: string): number | null {
  if (valor === null || valor === undefined || valor === '') return null;

  let bruto: unknown = valor;
  if (typeof bruto === 'string') {
    if (SEPARADOR_MILHAR.test(bruto)) {
      throw new ErroRota('campo_invalido', 400, campo);
    }
    if (!bruto.includes('.') && bruto.includes(',')) {
      bruto = bruto.replace(',', '.');
    }
  }

  const n = typeof bruto === 'number' ? bruto : Number(bruto);
  // Limite de 1e10 vem da precisao da coluna: numeric(14,4) guarda 10 digitos
  // inteiros. Recusar aqui evita overflow do Postgres virando 500.
  if (!Number.isFinite(n) || n < 0 || n >= 1e10) {
    throw new ErroRota('campo_invalido', 400, campo);
  }
  return n;
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Data no formato YYYY-MM-DD, com conferencia de existencia (barra 2026-02-31). */
export function lerData(valor: unknown, campo?: string): string | null {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor !== 'string' || !DATA_ISO.test(valor)) {
    throw new ErroRota('campo_invalido', 400, campo);
  }

  const d = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== valor) {
    throw new ErroRota('campo_invalido', 400, campo);
  }
  return valor;
}

export function lerBooleano(valor: unknown, campo?: string): boolean {
  if (typeof valor === 'boolean') return valor;
  throw new ErroRota('campo_invalido', 400, campo);
}

/** Lista de texto para colunas text[]. Itens vazios sao descartados. */
export function lerListaDeTexto(valor: unknown, campo?: string): string[] {
  if (valor === null || valor === undefined) return [];
  if (!Array.isArray(valor)) throw new ErroRota('campo_invalido', 400, campo);
  if (valor.length > LIMITE_ITENS_LISTA) throw new ErroRota('campo_invalido', 400, campo);

  const itens: string[] = [];
  for (const item of valor) {
    if (typeof item !== 'string') throw new ErroRota('campo_invalido', 400, campo);
    const limpo = item.trim();
    if (limpo.length > LIMITE_TEXTO_CURTO) throw new ErroRota('campo_invalido', 400, campo);
    if (limpo) itens.push(limpo);
  }
  return itens;
}

/** UUID de chave estrangeira vinda do corpo. null e '' significam "limpar o vinculo". */
export function lerUuid(valor: unknown, campo?: string): string | null {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'string' && UUID_RE.test(valor)) return valor;
  throw new ErroRota('campo_invalido', 400, campo);
}

/** numeric do Postgres pode chegar como number ou string; normalizamos. */
export function paraNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** Valor de enum do banco conferido contra o conjunto aceito. */
export function lerEnum(
  valor: unknown,
  aceitos: ReadonlySet<string>,
  codigoErro: string,
  campo?: string,
): string | null {
  const texto = lerTexto(valor, campo);
  if (texto === null) return null;
  if (!aceitos.has(texto)) throw new ErroRota(codigoErro, 400, campo);
  return texto;
}

// -----------------------------------------------------------------------------
// Paginacao
// -----------------------------------------------------------------------------

/**
 * Le ?limite= e ?pagina= da query string.
 *
 * `pagina` e 1-based porque e o que a interface mostra. Valor invalido, negativo
 * ou ausente cai no default em vez de virar 400: paginacao torta na URL nao e
 * motivo para recusar uma leitura. `limite` e limitado por LIMITE_PAGINA_MAXIMO.
 *
 * Use com o `.range(deslocamento, deslocamento + limite - 1)` do PostgREST.
 */
export function paginar(url: URL): { limite: number; deslocamento: number; pagina: number } {
  const bruto = Number(url.searchParams.get('limite'));
  const limite = Number.isFinite(bruto) && bruto >= 1
    ? Math.min(Math.floor(bruto), LIMITE_PAGINA_MAXIMO)
    : LIMITE_PAGINA_PADRAO;

  const brutoPagina = Number(url.searchParams.get('pagina'));
  const pagina = Number.isFinite(brutoPagina) && brutoPagina >= 1 ? Math.floor(brutoPagina) : 1;

  return { limite, deslocamento: (pagina - 1) * limite, pagina };
}

// -----------------------------------------------------------------------------
// Traducao de erro do banco
// -----------------------------------------------------------------------------

/**
 * Traduz erro de escrita do Postgres em resposta de cliente.
 *
 * Sem isso, violacao de unique ou de check vira 500 erro_interno e o usuario nao
 * descobre que o problema esta no dado que ele mesmo enviou.
 */
export function lancarErroEscrita(
  erro: ErroBanco,
  contexto: string,
  codigoCheck = 'campo_invalido',
): never {
  const codigo = erro.code ?? '';
  if (codigo === '23505') throw new ErroRota('registro_duplicado', 409);
  if (codigo === '23514') throw new ErroRota(codigoCheck, 400);
  if (codigo === '23503') throw new ErroRota('referencia_invalida', 400);
  // 23502 not null: acontece quando o cliente manda null numa coluna NOT NULL
  // (standard, pais, registros_anteriores). Dado enviado, nao falha de servidor.
  if (codigo === '23502') throw new ErroRota('campo_invalido', 400);
  // 22P02 sintaxe de entrada invalida, 22003 fora da faixa numerica,
  // 22007/22008 data invalida: sempre culpa do dado enviado.
  if (['22P02', '22003', '22007', '22008'].includes(codigo)) {
    throw new ErroRota('campo_invalido', 400);
  }
  console.error(`Falha de escrita em ${contexto}:`, erro.message);
  throw new ErroRota('erro_interno', 500);
}

import { PAGINAS } from '@/paginas.config';

/**
 * pageRoutes.js - URLs das telas proprias do Apsis Carbon, DERIVADAS do registro.
 *
 * Antes este arquivo tinha o mapa nome -> caminho escrito a mao, e o padrao da rota era
 * declarado outra vez no App.jsx. Eram duas fontes de verdade para a mesma informacao, e
 * a segunda so quebrava em producao (link para uma rota que ninguem registrou). Agora a
 * unica fonte e src/paginas.config.js, alimentado por src/paginas/*.paginas.js.
 *
 * IMPORTANTE: os modulos carregados do Supabase (carbon_modulos) NAO entram aqui. Eles
 * trazem a propria rota (coluna `rota`) ou uma url_externa, e o Layout usa esse valor
 * direto - justamente para nao exigir deploy do frontend a cada modulo novo.
 */

/**
 * O mapa e montado na PRIMEIRA LEITURA, e nao no topo do modulo, por causa de um ciclo
 * de import real e inevitavel:
 *
 *   pageRoutes -> paginas.config -> paginas/indice -> nucleo.paginas -> pages/Projetos
 *              -> @/utils (createPageUrl) -> pageRoutes
 *
 * Em ESM, o modulo que entra no ciclo por segundo enxerga o primeiro AINDA NAO
 * inicializado. Uma expressao no topo (`const PAGE_ROUTES = derivar(PAGINAS)`) leria
 * PAGINAS na TDZ e lancaria ReferenceError no boot - tela branca, antes de qualquer
 * ErrorBoundary. Adiado para a primeira CHAMADA (que acontece durante o render, com
 * todos os modulos ja avaliados), o ciclo deixa de importar.
 */
let cacheMapa = null;

function mapa() {
  if (cacheMapa) return cacheMapa;

  const saida = {};
  for (const pagina of PAGINAS) {
    // Rota com parametro nao tem caminho fixo: '/Projetos/:id/PDD' no mapa faria o
    // createPageUrl devolver a URL com o ':id' literal, que e um link quebrado
    // silencioso. Para essas telas existe o montarUrl(), mais abaixo.
    if (!pagina.rota || pagina.temParametro) continue;
    saida[pagina.nome] = pagina.rota;
  }

  cacheMapa = saida;
  return cacheMapa;
}

/**
 * PAGE_ROUTES - compatibilidade com src/utils/index.js, que faz PAGE_ROUTES[nome].
 *
 * E um Proxy porque o consumidor espera um OBJETO, e o objeto nao pode ser construido no
 * topo do modulo (ver a nota do ciclo acima). O Proxy resolve na hora do acesso, o que
 * acontece sempre depois do boot. Em codigo novo prefira rotaDaPagina(nome).
 */
export const PAGE_ROUTES = new Proxy(
  {},
  {
    get: (_alvo, chave) => mapa()[chave],
    has: (_alvo, chave) => Object.prototype.hasOwnProperty.call(mapa(), chave),
    ownKeys: () => Reflect.ownKeys(mapa()),
    getOwnPropertyDescriptor: (_alvo, chave) => ({
      value: mapa()[chave],
      enumerable: true,
      configurable: true,
      writable: false,
    }),
  },
);

/** Caminho canonico de uma tela sem parametro. null quando nao existe. */
export function rotaDaPagina(nome) {
  return mapa()[nome] ?? null;
}

/** Padrao da rota como registrado, com os `:parametros` (ex.: '/Projetos/:id/PDD'). */
export function padraoDaPagina(nome) {
  return PAGINAS.find((pagina) => pagina.nome === nome)?.rota ?? null;
}

/**
 * URL concreta de uma tela COM parametro, a partir do padrao registrado.
 *
 * Cada valor passa por encodeURIComponent para nunca montar caminho torto a partir de um
 * valor inesperado (undefined, uma barra, um '..'). Parametro que nao veio vira string
 * vazia, exatamente como antes.
 *
 * @param {string} nome  nome da pagina no registro
 * @param {Record<string, string>} params  valores dos `:parametros`
 * @returns {string|null} null quando a pagina nao esta registrada
 */
export function montarUrl(nome, params = {}) {
  const padrao = padraoDaPagina(nome);
  if (!padrao) return null;

  const partes = padrao
    .split('/')
    .filter(Boolean)
    .map((parte) =>
      parte.startsWith(':')
        ? encodeURIComponent(String(params[parte.slice(1)] ?? ''))
        : parte,
    );

  return `/${partes.join('/')}`;
}

/**
 * URL do PDD de um projeto: '/Projetos/<id>/PDD'.
 *
 * Atalho com nome proprio porque e chamada em varias telas e porque o fallback importa:
 * se por qualquer motivo a pagina ProjetoPdd nao estiver registrada, devolver um caminho
 * plausivel e melhor do que devolver null e renderizar `<Link to={null}>`.
 */
export function urlPdd(projetoId) {
  return (
    montarUrl('ProjetoPdd', { id: projetoId }) ??
    `/Projetos/${encodeURIComponent(String(projetoId ?? ''))}/PDD`
  );
}

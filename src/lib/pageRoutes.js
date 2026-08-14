/**
 * pageRoutes.js - Fonte unica de verdade das URLs das telas proprias do Apsis Carbon.
 *
 * Cada chave e o NOME da pagina (o mesmo valor usado em currentPageName no Layout e nas
 * rotas do App.jsx); o valor e o caminho canonico da URL.
 *
 * Nesta entrega existem apenas as telas de estrutura (boas-vindas, nao autorizado e 404),
 * por isso o mapa e flat. Quando um modulo de negocio ganhar telas proprias no Carbon,
 * acrescente a chave aqui com o caminho hierarquico (ex.: ProjetosCarbono:
 * '/ProjetosCarbono/Painel') e o createPageUrl passa a devolver a URL nova sem tocar
 * em nenhum outro arquivo.
 *
 * IMPORTANTE: os modulos carregados do Supabase (carbon_modulos) NAO entram aqui.
 * Eles trazem a propria rota (coluna `rota`) ou uma url_externa, e o Layout usa esse
 * valor direto - justamente para nao exigir deploy do frontend a cada modulo novo.
 */
export const PAGE_ROUTES = {
  BoasVindas: '/BoasVindas',
  Projetos: '/Projetos',
  NaoAutorizado: '/NaoAutorizado',
  PaginaNaoEncontrada: '/PaginaNaoEncontrada',
};

/**
 * URL do PDD de um projeto.
 *
 * POR QUE NAO ESTA EM PAGE_ROUTES: o mapa acima e nome-da-pagina -> caminho FIXO, e o
 * createPageUrl devolve esse caminho sem receber parametro. A tela de PDD depende do id
 * do projeto ('/Projetos/<id>/PDD'), entao nao existe caminho fixo para ela. Colocar
 * '/Projetos/:id/PDD' no mapa faria o createPageUrl devolver a URL com o ':id' literal,
 * que e um link quebrado silencioso.
 *
 * O padrao da rota ('/Projetos/:id/PDD') e declarado no src/App.jsx; aqui fica o
 * gerador, para que a montagem da URL tambem tenha uma fonte unica.
 *
 * @param {string} projetoId
 * @returns {string}
 */
export function urlPdd(projetoId) {
  return `${PAGE_ROUTES.Projetos}/${encodeURIComponent(String(projetoId ?? ''))}/PDD`;
}

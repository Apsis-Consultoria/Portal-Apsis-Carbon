/**
 * urlSegura - saneamento de destinos que vem do BANCO antes de virarem href.
 *
 * POR QUE ISSO EXISTE: carbon_modulos.url_externa, carbon_modulos.rota e
 * carbon_notificacoes.acao sao conteudo administravel. O React NAO bloqueia
 * href="javascript:...", entao um valor colado por engano (ou por ma-fe) em uma
 * tabela de configuracao viraria execucao de codigo na origem do Apsis Carbon no
 * clique de qualquer colaborador - com acesso ao cache do MSAL no localStorage,
 * ou seja, ao ID token da sessao.
 *
 * A migration tambem tem CHECK de esquema em carbon_modulos (barreira na
 * entrada). Estas funcoes sao a barreira na SAIDA, e cobrem tambem o jsonb de
 * carbon_notificacoes.acao, onde nao da para declarar CHECK por coluna.
 *
 * Contrato: recebem qualquer coisa e devolvem string segura ou null. Quem chama
 * decide o que fazer com o null (aqui, renderizar o cartao/item inerte).
 */

/**
 * URL absoluta de destino externo. Aceita SOMENTE http: e https:.
 * @param {unknown} valor
 * @returns {string|null} a URL original (sem alteracao) ou null se recusada
 */
export function urlExternaSegura(valor) {
  if (typeof valor !== 'string') return null;
  const bruto = valor.trim();
  if (!bruto) return null;

  let url;
  try {
    // Sem segundo argumento de proposito: um caminho relativo nao e URL externa
    // valida e deve ser recusado aqui, nao resolvido contra a origem atual.
    url = new URL(bruto);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  // Devolvemos o valor original, e nao url.href, para nao normalizar silenciosamente
  // o que a administracao cadastrou (o href do navegador normaliza igual de todo jeito).
  return bruto;
}

/**
 * Caminho interno do SPA. Aceita SOMENTE uma barra inicial seguida de outro
 * caractere: '//host' e '/\host' sao interpretados pelo navegador como outra
 * origem e por isso sao recusados.
 * @param {unknown} valor
 * @returns {string|null}
 */
export function rotaInternaSegura(valor) {
  if (typeof valor !== 'string') return null;
  const bruto = valor.trim();
  if (!bruto.startsWith('/')) return null;
  if (bruto.startsWith('//') || bruto.startsWith('/\\')) return null;
  return bruto;
}

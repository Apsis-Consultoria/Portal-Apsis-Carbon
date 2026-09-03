/**
 * Endereco das funcoes de backend.
 *
 * ------------------------------------------------------------------------
 * O FRONTEND NAO TEM VARIAVEL DE AMBIENTE. NENHUMA.
 * ------------------------------------------------------------------------
 * Nao existe `.env`, nao existe URL de projeto Supabase e nao existe anon key
 * neste bundle. Todas as chamadas vao para `/api/<funcao>`, um caminho RELATIVO
 * na mesma origem, e quem traduz isso para as Edge Functions e a camada de
 * HOSPEDAGEM, por um rewrite de proxy:
 *
 *   producao (AWS Amplify)  regra no console:
 *       origem  /api/<*>
 *       destino https://<ref>.supabase.co/functions/v1/<*>
 *       tipo    200 (rewrite / proxy)
 *
 *   desenvolvimento         server.proxy do vite.config.js, alimentado por
 *                           SUPABASE_API_URL. Ela e lida pelo processo do
 *                           Vite, NAO pelo navegador: sem o prefixo VITE_, o
 *                           Vite se recusa a expor a variavel ao cliente, entao
 *                           e impossivel ela entrar no bundle.
 *
 * POR QUE, e nao e preciosismo: com a URL no bundle, qualquer pessoa que abra a
 * tela de login descobre o endereco do projeto e passa a poder bater direto nas
 * Edge Functions, fora do nosso dominio, sem passar por log, WAF ou limite de
 * taxa da hospedagem. Com o proxy, a unica porta publica e o nosso dominio.
 *
 * SEM ANON KEY. As funcoes sao publicadas com --no-verify-jwt: quem autoriza o
 * carbon-api e o ID token do Azure AD, validado contra o JWKS da Microsoft
 * dentro da propria funcao. A anon key nao participava de autorizacao nenhuma.
 *
 * Este arquivo substituiu src/lib/supabaseClient.js, que exportava um cliente
 * supabase-js que ninguem usava - so as duas constantes de ambiente.
 */

/**
 * Prefixo das chamadas. `/api` (relativo) sempre que houver rewrite na
 * hospedagem, e o endereco absoluto do Supabase quando NAO houver.
 *
 * -----------------------------------------------------------------------------
 * QUEM DECIDE E O BUILD, e o default continua sendo o relativo
 * -----------------------------------------------------------------------------
 * `__BASE_API__` e uma constante injetada pelo vite.config.js (ver `define`
 * la). Ela vale:
 *
 *   '/api'                              em desenvolvimento, SEMPRE, e tambem em
 *                                       producao quando SUPABASE_API_URL nao
 *                                       esta no ambiente do build;
 *   'https://<ref>.supabase.co/functions/v1'
 *                                       em producao, quando esta.
 *
 * POR QUE ISSO EXISTE. Em 02/09/2026 os dois dominios de producao subiram sem a
 * regra de rewrite de /api, que so se configura no console do Amplify. A
 * Amplify servia /api/<funcao> como arquivo estatico: 301 para /api/<funcao>/ e
 * depois 404, em toda chamada. Login impossivel nos dois sistemas, e nenhuma
 * mudanca de codigo alcancava o problema enquanto o caminho fosse relativo.
 *
 * O CUSTO, dito por inteiro: com o endereco absoluto no bundle, quem abrir o
 * codigo-fonte da pagina descobre qual e o projeto Supabase e pode chamar as
 * Edge Functions fora do nosso dominio, sem passar por log, WAF ou limite de
 * taxa da hospedagem. Era exatamente isso que o desenho relativo evitava (ver
 * regra 4 do CLAUDE.md). O que NAO muda: quem autoriza e o ID token do Azure AD,
 * validado dentro da funcao contra o JWKS da Microsoft, entao conhecer o
 * endereco nao da acesso a nada.
 *
 * COMO DESFAZER, quando a regra de rewrite existir: apague a variavel
 * SUPABASE_API_URL do ambiente de BUILD da Amplify (App settings > Environment
 * variables). O proximo build volta para '/api' e o endereco sai do bundle. Nao
 * ha codigo para mexer, e e por isso que o valor nao esta escrito aqui.
 *
 * O `typeof` protege o caso de alguem importar este modulo fora do build do
 * Vite (um teste em Node, por exemplo), onde a constante nao existe.
 */
const PREFIXO = typeof __BASE_API__ === 'string' && __BASE_API__ ? __BASE_API__ : '/api';

/** Caminho de uma funcao: caminhoFuncao('carbon-api') -> '<prefixo>/carbon-api'. */
export function caminhoFuncao(nome) {
  return `${PREFIXO}/${nome}`;
}

/**
 * Verdadeiro quando as chamadas saem pelo caminho relativo, ou seja quando a
 * hospedagem tem o rewrite. Usado pela tela de erro de configuracao para nao
 * mandar conferir um rewrite que nem participa mais da chamada.
 */
export const USA_CAMINHO_RELATIVO = PREFIXO === '/api';

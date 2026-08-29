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

/** Prefixo servido pelo rewrite. Relativo de proposito: nunca absoluto. */
const PREFIXO = '/api';

/** Caminho de uma funcao: caminhoFuncao('carbon-api') -> '/api/carbon-api'. */
export function caminhoFuncao(nome) {
  return `${PREFIXO}/${nome}`;
}

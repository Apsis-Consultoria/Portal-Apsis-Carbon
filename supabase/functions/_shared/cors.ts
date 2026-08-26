// -----------------------------------------------------------------------------
// CORS e helpers de resposta compartilhados pelas Edge Functions do Apsis Carbon.
// -----------------------------------------------------------------------------
// Origin liberado ('*') porque as duas funcoes sao endpoints de leitura chamados
// pelo navegador de origens diferentes ao longo do ciclo de vida do projeto
// (localhost:5175 em dev, dominio de producao, previews). Isso NAO afrouxa a
// seguranca: app-config so devolve dados marcados como publicos, e carbon-api
// exige um ID token do Azure AD valido, que o navegador de terceiro nao possui.
// Nao usamos cookies nem Access-Control-Allow-Credentials, portanto '*' e valido.

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  // apikey e x-client-info sao enviados pelo supabase-js; authorization carrega
  // o ID token do Azure AD no carbon-api.
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  //
  // PATCH E DELETE ESTAVAM FALTANDO, e a lista contradizia o proprio motivo do
  // '*' logo acima. Medido em 26/08/2026: das 136 rotas do carbon-api, 32 sao
  // PATCH e 14 sao DELETE. Com a lista antiga (GET, POST, OPTIONS), o navegador
  // BARRARIA as 46 no preflight.
  //
  // Nao quebrava hoje porque o caminho real e sempre MESMA ORIGEM: o
  // server.proxy do Vite em desenvolvimento e a regra de rewrite /api/<*> em
  // producao, e requisicao de mesma origem nao faz preflight. Ou seja, o defeito
  // ficava invisivel exatamente ate o dia em que alguem chamasse a funcao de um
  // dominio de preview ou direto pela URL do Supabase - que e o cenario que o
  // comentario acima diz existir. O sintoma seria "editar nao funciona no
  // preview" com um erro de CORS no console, que manda procurar no lugar errado.
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

/**
 * Responde ao preflight do navegador. Retorna null quando o metodo nao e OPTIONS,
 * para o handler poder seguir o fluxo normal.
 *
 *   const preflight = tratarOptions(req);
 *   if (preflight) return preflight;
 */
export function tratarOptions(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Resposta JSON com CORS sempre aplicado. */
export function respostaJson(
  corpo: unknown,
  status = 200,
  cabecalhosExtra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      ...cabecalhosExtra,
    },
  });
}

/** Resposta de erro padronizada: sempre { erro: 'codigo_em_snake_case' }. */
export function respostaErro(
  codigo: string,
  status: number,
  detalhe?: string,
): Response {
  // detalhe e opcional e sempre generico: nunca colocamos aqui mensagem de erro
  // do banco nem dado de usuario, para nao vazar estrutura interna.
  const corpo = detalhe ? { erro: codigo, detalhe } : { erro: codigo };
  return respostaJson(corpo, status);
}

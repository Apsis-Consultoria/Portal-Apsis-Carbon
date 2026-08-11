/**
 * msalCache - limpeza do ESTADO TRANSITORIO do MSAL.
 *
 * POR QUE ISSO E UM MODULO SEPARADO: dois lugares precisam da mesma limpeza (o
 * boot em src/main.jsx, quando handleRedirectPromise falha, e o AuthGuard, quando
 * o loginRedirect e recusado com interaction_in_progress) e a limpeza precisa
 * acertar o armazenamento CERTO.
 *
 * ONDE O MSAL v3 GUARDA O QUE:
 *   - credenciais (contas, id/access/refresh token): no cacheLocation configurado,
 *     aqui localStorage, em chaves como msal.account.keys,
 *     msal.token.keys.<clientId> e <homeAccountId>-login.windows.net-...
 *   - estado transitorio do redirect (interaction.status, request.state, nonce,
 *     verifier): no temporaryCacheLocation, que e sessionStorage por DEFAULT, e
 *     TAMBEM em cookie porque storeAuthStateInCookie = true (ver msalConfig.js).
 *     O getTemporaryCache le o cookie primeiro.
 *
 * Consequencia pratica: varrer o localStorage procurando 'interaction.status'
 * (como se fazia antes) e um no-op, e apagar tudo que contem 'login.windows.net'
 * derruba os tokens VALIDOS - inclusive os de outra aba, porque o localStorage e
 * compartilhado. Este modulo cuida apenas do transitorio; credenciais so devem
 * ser descartadas com instance.clearCache(), e somente quando nao houver conta.
 */

/** Chaves transitorias do MSAL (sessionStorage). */
function chaveTransitoria(chave) {
  return chave.startsWith('msal.') || chave.includes('interaction.status');
}

/** Expira todo cookie cujo nome mencione o MSAL (estado de redirect em cookie). */
function apagarCookiesMsal() {
  try {
    document.cookie.split(';').forEach((par) => {
      const nome = par.split('=')[0].trim();
      if (!nome || !nome.toLowerCase().includes('msal')) return;
      // path=/ e o mesmo path usado pelo MSAL ao gravar; max-age=0 expira agora.
      document.cookie = `${nome}=;path=/;max-age=0;SameSite=None;Secure`;
      // Repeticao sem SameSite/Secure para cobrir o cookie gravado em http://localhost.
      document.cookie = `${nome}=;path=/;max-age=0`;
    });
  } catch {
    // Cookies bloqueados pelo navegador: nada a fazer, e apenas melhor esforco.
  }
}

/**
 * Limpa o estado transitorio de interacao (sessionStorage + cookies).
 * NAO toca em credenciais: nenhuma sessao valida e perdida por chamar isto.
 */
export function limparEstadoTransitorioMsal() {
  try {
    Object.keys(sessionStorage)
      .filter(chaveTransitoria)
      .forEach((chave) => sessionStorage.removeItem(chave));
  } catch {
    // sessionStorage bloqueado (modo restrito): segue apenas com os cookies.
  }
  apagarCookiesMsal();
}

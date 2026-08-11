import { CONFIG_DEFAULT } from "@/lib/runtimeConfig";

/**
 * msalConfig - UNICA fonte de verdade da configuracao do MSAL no Apsis Carbon.
 *
 * POR QUE ISSO IMPORTA: no portal-apsis existem DOIS lugares com config do MSAL (um objeto
 * em src/lib/msalConfig.js e outro montado inline em src/main.jsx). Apenas o do main.jsx
 * valia, e isso ja causou bug real: um commit trocou o cacheLocation no arquivo errado, sem
 * efeito, e novas abas continuaram caindo na tela de login. Aqui a regra e: o main.jsx chama
 * montarMsalConfig(config) e nao redefine nada por fora. Qualquer ajuste de cache, authority
 * ou redirect acontece NESTE arquivo.
 *
 * clientId, tenantId e redirectUri nao vem de env: vem da config carregada do Supabase
 * (carbon_app_config) pela Edge Function app-config.
 */

/** Escopos default. Consentimento minimo: apenas o necessario para login e perfil. */
export const loginRequest = {
  scopes: [...CONFIG_DEFAULT.azure.scopes],
};

/** Escopos vindos da config (com fallback nos defaults). Usado pelo carbonApi e pelo AuthContext. */
export function montarLoginRequest(config) {
  const scopes = config?.azure?.scopes;
  return {
    scopes: Array.isArray(scopes) && scopes.length ? [...scopes] : [...CONFIG_DEFAULT.azure.scopes],
  };
}

/**
 * Recebe a config do runtimeConfig e devolve o objeto de configuracao do MSAL.
 * Chamado uma unica vez no boot, antes de new PublicClientApplication(...).
 */
export function montarMsalConfig(config) {
  const clientId = config?.azure?.clientId || "";
  const tenantId = config?.azure?.tenantId || "";
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const redirectUri = config?.azure?.redirectUri || origem;

  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri,
      postLogoutRedirectUri: redirectUri,
      /**
       * false porque o retorno do login e tratado a mao no main.jsx:
       * o deep link fica em sessionStorage('postLoginRedirect') e e restaurado com
       * history.replaceState. Se ficasse true, o MSAL navegaria por conta propria para a
       * URL original, disparando um GET de servidor que retorna 404 em host de SPA.
       */
      navigateToLoginRequestUrl: false,
    },
    cache: {
      /**
       * localStorage (e nao sessionStorage) porque sessionStorage e por aba: toda aba nova
       * aberta com target="_blank" cairia na tela de login mesmo com sessao valida.
       */
      cacheLocation: "localStorage",
      /** Cookie auxiliar de estado: protege o fluxo de redirect em navegadores que
       *  bloqueiam storage de terceiros e no Safari/iOS. */
      storeAuthStateInCookie: true,
    },
    system: {
      // Sem log verboso em producao; erros do MSAL continuam aparecendo pelo proprio throw.
      loggerOptions: {
        loggerCallback: () => {},
        piiLoggingEnabled: false,
      },
    },
  };
}

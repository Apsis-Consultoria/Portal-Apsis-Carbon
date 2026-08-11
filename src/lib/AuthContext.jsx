import { createContext, useContext, useMemo, useCallback } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { getConfig } from "@/lib/runtimeConfig";
import { montarLoginRequest } from "@/lib/msalConfig";

/**
 * AuthContext - camada fina sobre o MSAL.
 *
 * Existe para que as telas nao precisem conhecer a API do MSAL (accounts[0], idTokenClaims,
 * loginRedirect...). Nao guarda estado proprio de sessao: a fonte de verdade continua sendo
 * o cache do MSAL no localStorage. Duplicar a sessao em estado do React so criaria
 * divergencia entre abas.
 */

const AuthContext = createContext(null);

/** Extrai nome, e-mail e id da conta do MSAL, tolerando variacoes de claims do Azure AD. */
function montarUsuario(conta) {
  if (!conta) return null;
  const claims = conta.idTokenClaims || {};
  const email = conta.username || claims.preferred_username || claims.email || "";
  return {
    nome: conta.name || claims.name || email || "Usuario",
    email,
    id: conta.localAccountId || conta.homeAccountId || claims.oid || "",
  };
}

export function AuthProvider({ children }) {
  const { instance, accounts } = useMsal();
  const autenticado = useIsAuthenticated();

  const conta = accounts && accounts.length ? accounts[0] : null;
  const usuario = useMemo(() => montarUsuario(conta), [conta]);

  const entrar = useCallback(async () => {
    try {
      await instance.loginRedirect(montarLoginRequest(getConfig()));
    } catch (e) {
      // Erro tipico aqui: outra interacao ja em andamento. Nao mascaramos em silencio.
      console.warn("[AuthContext] loginRedirect falhou:", e?.message || e);
      throw e;
    }
  }, [instance]);

  const sair = useCallback(async () => {
    try {
      // O deep link guardado no boot (sessionStorage) sobrevive ao logout, porque
      // sessionStorage e por ABA e o logoutRedirect volta para a mesma aba. Sem
      // apagar aqui, o proximo login nesta aba - possivelmente de outra pessoa -
      // herdaria o destino da sessao anterior.
      sessionStorage.removeItem("postLoginRedirect");
    } catch {
      // sessionStorage bloqueado: nada a limpar.
    }
    try {
      await instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
    } catch (e) {
      console.warn("[AuthContext] logoutRedirect falhou:", e?.message || e);
      throw e;
    }
  }, [instance]);

  const valor = useMemo(
    () => ({ usuario, autenticado, entrar, sair }),
    [usuario, autenticado, entrar, sair]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error(
      "useAuth precisa ser usado dentro de <AuthProvider>. Verifique se o componente esta abaixo do AuthProvider na arvore."
    );
  }
  return contexto;
}

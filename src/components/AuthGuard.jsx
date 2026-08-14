import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { getConfig, MODO_DEMO } from "@/lib/runtimeConfig";
import { montarLoginRequest } from "@/lib/msalConfig";
import { limparEstadoTransitorioMsal } from "@/lib/msalCache";
import CarbonLoginLayout, { MicrosoftIcon } from "@/components/CarbonLoginLayout";
import NaoAutorizado from "@/pages/NaoAutorizado";

/**
 * AuthGuard - porta de entrada do Apsis Carbon.
 *
 * Montado FORA do Router (em src/main.jsx), envolvendo o <App />. Por isso nao usa nenhum
 * hook de rota aqui: qualquer leitura de window.location seria avaliada uma unica vez no
 * load e nao reagiria a navegacao. Com apenas login + boas-vindas, o Carbon nao precisa
 * de logica de rota publica.
 *
 * MODO DEMONSTRACAO - por que existe um caminho que nao passa pelo Azure AD:
 *
 * Enquanto o projeto Supabase nao existe, o login com a Microsoft nao pode funcionar (falta
 * clientId/tenantId, que vem do banco). Sem uma porta alternativa, as telas de negocio ficam
 * inalcancaveis e nao ha como revisar o produto. Este bloco e essa porta.
 *
 * Por que e seguro: em MODO_DEMO as funcoes de src/lib/carbonApi.js NAO fazem rede - operam
 * sobre o dataset ficticio de src/lib/demoProjetos.js. Entrar em modo demonstracao nao da
 * acesso a dado nenhum, porque nao existe backend do outro lado.
 *
 * Barreiras, nesta ordem:
 *   1. MODO_DEMO exige import.meta.env.DEV, que e estatico: em build de producao a expressao
 *      dobra para false e o Rollup elimina este ramo (ver a nota em runtimeConfig.js);
 *   2. exige tambem a env explicita VITE_CARBON_DEMO=true;
 *   3. NUNCA por deteccao de hostname - foi o erro que o portal-apsis registra como decisao
 *      de seguranca, porque qualquer subdominio com "preview" no nome burlaria a autenticacao;
 *   4. a entrada e um clique deliberado, nao automatica, para a tela de login continuar
 *      revisavel;
 *   5. enquanto ativo, uma tarja fixa avisa que os dados sao ficticios.
 */

/** Chave de sessao do modo demonstracao. sessionStorage, e nao localStorage, de proposito:
 *  o estado morre ao fechar a aba e nunca sobrevive a um restart do navegador. */
const CHAVE_DEMO = "carbonModoDemoAtivo";

function lerDemoAtivo() {
  if (!MODO_DEMO) return false;
  try {
    return sessionStorage.getItem(CHAVE_DEMO) === "true";
  } catch {
    // Navegacao privada pode negar sessionStorage. Sem persistencia, sem demo.
    return false;
  }
}

/** Tarja fixa, sempre visivel, para ninguem confundir dado ficticio com dado real. */
function TarjaDemo({ aoSair }) {
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 shadow-lg">
      <span className="text-[11px] font-semibold text-amber-800">
        Modo demonstração - dados fictícios, sem backend
      </span>
      <button
        type="button"
        onClick={aoSair}
        className="text-[11px] font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
      >
        Sair
      </button>
    </div>
  );
}

/** Extrai o dominio (depois do @) do e-mail da conta, em minusculas. */
function dominioDaConta(conta) {
  if (!conta) return "";
  const claims = conta.idTokenClaims || {};
  const email = conta.username || claims.preferred_username || claims.email || "";
  const partes = String(email).toLowerCase().split("@");
  // Precisa ter exatamente uma arroba e algo depois dela.
  return partes.length === 2 ? partes[1].trim() : "";
}

/** Tela cheia de espera, no verde APSIS. */
function Aguardando({ rotulo }) {
  return (
    <div className="min-h-screen bg-[#1A4731] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-white/30 border-t-[#F47920] rounded-full animate-spin" />
        <p className="text-white font-medium">{rotulo}</p>
      </div>
    </div>
  );
}

export default function AuthGuard({ children }) {
  const { instance, accounts, inProgress } = useMsal();
  const [loading, setLoading] = useState(false);
  // Mensagem de falha de login exibida NA TELA. Nao usamos o toast do sonner aqui de
  // proposito: o <Toaster /> vive dentro do App, que nao esta montado nesta ramificacao.
  const [erroLogin, setErroLogin] = useState("");
  // Modo demonstracao ativo nesta aba. Inicializado do sessionStorage para sobreviver a
  // navegacao entre telas e a F5, sem sobreviver ao fechamento da aba.
  const [demoAtivo, setDemoAtivo] = useState(lerDemoAtivo);

  const entrarNoDemo = () => {
    try {
      sessionStorage.setItem(CHAVE_DEMO, "true");
    } catch {
      // Sem sessionStorage o estado nao persiste entre telas, mas a sessao atual funciona.
    }
    setDemoAtivo(true);
  };

  const sairDoDemo = () => {
    try {
      sessionStorage.removeItem(CHAVE_DEMO);
    } catch {
      // nada a fazer
    }
    setDemoAtivo(false);
  };

  /**
   * A autenticacao e decidida por `accounts`, e NAO por useIsAuthenticated().
   * Motivo: o MsalProvider comeca com inProgress = Startup e, enquanto esta nesse
   * estado, useIsAuthenticated devolve false por forca, mesmo com conta em cache.
   * A saida do Startup so acontece em um useEffect do provider, isto e, DEPOIS do
   * primeiro paint - o que fazia a tela de login inteira piscar (e disparar o
   * download das fotos de fundo) a cada F5 de usuario ja autenticado.
   */
  const temConta = (accounts?.length ?? 0) > 0;
  const carregandoMsal =
    inProgress === InteractionStatus.Startup || inProgress === InteractionStatus.HandleRedirect;

  /**
   * Limpa estado travado de interacao ("interaction_in_progress") quando chegamos
   * na tela de login sem sessao e sem nada em andamento.
   *
   * O estado transitorio do MSAL v3 NAO fica no localStorage: fica no
   * sessionStorage e num cookie (ver src/lib/msalCache.js). A limpeza anterior
   * varria o localStorage e por isso nunca removia nada.
   *
   * A guarda inProgress === None e essencial: limpar durante um Login/HandleRedirect
   * em andamento apagaria o state/nonce da requisicao em voo e quebraria o retorno.
   */
  useEffect(() => {
    if (inProgress !== InteractionStatus.None) return;
    if (temConta) return;
    limparEstadoTransitorioMsal();
  }, [inProgress, temConta]);

  const config = getConfig();
  const login = config?.login || {};

  const aoEntrar = async () => {
    if (MODO_DEMO) return;
    if (loading || inProgress !== InteractionStatus.None) return;
    setErroLogin("");
    setLoading(true);
    try {
      await instance.loginRedirect(montarLoginRequest(config));
    } catch (e) {
      // interaction_in_progress: o MSAL acredita que ja existe um login em andamento
      // (aba fechada no meio do redirect, volta pelo botao Voltar com a pagina
      // restaurada do bfcache, ou login iniciado em outra aba). Limpa o estado
      // transitorio e tenta UMA vez mais - antes disso o botao simplesmente parava
      // de funcionar, sem nenhuma mensagem na tela.
      if (e?.errorCode === "interaction_in_progress") {
        limparEstadoTransitorioMsal();
        try {
          await instance.loginRedirect(montarLoginRequest(config));
          return;
        } catch (erroNaRetentativa) {
          console.warn(
            "[AuthGuard] loginRedirect falhou apos limpar o estado de interacao:",
            erroNaRetentativa?.message || erroNaRetentativa
          );
          setErroLogin("Nao foi possivel iniciar o login. Recarregue a pagina e tente de novo.");
          setLoading(false);
          return;
        }
      }
      // Se o redirect nao saiu, o botao precisa voltar a funcionar - e o usuario
      // precisa saber que falhou.
      console.warn("[AuthGuard] loginRedirect falhou:", e?.message || e);
      setErroLogin("Nao foi possivel iniciar o login. Verifique a conexao e tente de novo.");
      setLoading(false);
    }
  };

  // Processando o retorno do redirect da Microsoft.
  if (inProgress === InteractionStatus.HandleRedirect) {
    return <Aguardando rotulo="Autenticando..." />;
  }

  // Startup COM conta em cache: espera o provider terminar em vez de piscar o login.
  if (carregandoMsal && temConta) {
    return <Aguardando rotulo="Carregando..." />;
  }

  // Modo demonstracao ativado por clique: libera a aplicacao com o dataset ficticio.
  // Sem conta do Azure, entao a saudacao da Boas-Vindas fica sem nome e as telas que dependem
  // de backend real mostram os estados vazios - o que e honesto, porque backend nao existe.
  if (MODO_DEMO && demoAtivo && !temConta) {
    return (
      <>
        {children}
        <TarjaDemo aoSair={sairDoDemo} />
      </>
    );
  }

  if (!temConta) {
    const rotuloBotao = loading ? "Redirecionando..." : "Entre com a sua conta Microsoft";
    const dominio = config?.app?.dominioPermitido || "apsis.com.br";

    return (
      <CarbonLoginLayout
        logoSrc={login.logo || undefined}
        backgrounds={login.imagens || undefined}
        headline={login.headline || undefined}
        subheadline={login.subheadline || undefined}
        categories={login.categorias || undefined}
        copyright={login.copyright || undefined}
      >
        {/* O titulo "APSIS CARBON" em texto saiu daqui: a arte do logo acima ja traz as duas
            palavras, e sobre o painel verde ela e lida por inteiro (no painel branco antigo a
            palavra CARBON, que e branca, desaparecia - era por isso que o texto existia).
            Para voltar atras, basta reinserir o <h1> com APSIS em #1A4731 e CARBON em #F48126. */}
        <p className="text-white/70 text-sm mb-2">Faça login com sua conta corporativa</p>

        <button
          onClick={aoEntrar}
          disabled={loading || MODO_DEMO}
          className={`w-full mt-10 flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-semibold py-3.5 px-6 rounded-xl shadow-sm transition-colors ${MODO_DEMO ? "cursor-not-allowed" : "disabled:cursor-not-allowed"}`}
        >
          <MicrosoftIcon size={20} />
          {rotuloBotao}
        </button>

        {MODO_DEMO && (
          <div className="w-full flex flex-col items-center gap-3">
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
              Modo demonstração - configure o Supabase para entrar
            </p>
            {/* Porta de entrada do modo demonstracao. Existe para as telas de negocio serem
                revisaveis antes de o Supabase existir; nao da acesso a dado nenhum, porque em
                MODO_DEMO o carbonApi nao faz rede. Ver o cabecalho deste arquivo. */}
            <button
              type="button"
              onClick={entrarNoDemo}
              className="w-full flex items-center justify-center gap-2 border border-white/30 text-white/90 hover:bg-white/10 hover:border-white/50 font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Entrar em modo demonstração
            </button>
            <p className="text-[11px] text-white/45 text-center">
              Abre as telas com dados fictícios, sem backend. Só existe em desenvolvimento.
            </p>
          </div>
        )}

        {erroLogin && (
          <p
            role="alert"
            className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center"
          >
            {erroLogin}
          </p>
        )}

        <p className="text-xs text-white/55 text-center">
          Acesso restrito a colaboradores APSIS.<br />
          Use sua conta <span className="font-medium text-white/75">@{dominio}</span>
        </p>
      </CarbonLoginLayout>
    );
  }

  // Autenticado: confere o dominio do e-mail antes de liberar a aplicacao.
  // A Edge Function carbon-api repete essa checagem no servidor - esta aqui e apenas para
  // mostrar uma tela decente em vez de uma sequencia de erros 403.
  const dominioPermitido = String(config?.app?.dominioPermitido || "").toLowerCase().trim();
  if (dominioPermitido) {
    const dominioUsuario = dominioDaConta(accounts?.[0]);
    // Comparacao exata do sufixo. Nao usar endsWith: "naoapsis.com.br" terminaria em
    // "apsis.com.br" e passaria.
    if (dominioUsuario !== dominioPermitido) {
      return <NaoAutorizado />;
    }
  }

  return children;
}

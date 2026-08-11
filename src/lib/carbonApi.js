import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { SUPABASE_ANON_KEY, urlFuncao } from "@/lib/supabaseClient";
import { MODO_DEMO, getConfig } from "@/lib/runtimeConfig";
import { montarLoginRequest } from "@/lib/msalConfig";

/**
 * carbonApi - unico ponto de acesso ao backend do Apsis Carbon (Edge Function carbon-api).
 *
 * Autenticacao: enviamos o ID token do Azure AD no Authorization e a anon key no header
 * apikey (exigido pelo gateway do Supabase). A Edge Function valida o token contra o JWKS
 * da Microsoft (aud, iss, tid) e o dominio do e-mail antes de tocar no banco com service_role.
 *
 * Nao usamos o access token porque quem consome nao e o Microsoft Graph: e a nossa funcao,
 * e o aud do access token do Graph nao seria o nosso clientId.
 */

const TIMEOUT_MS = 10000;

/** Erro tipado de API. `codigo` carrega o campo `erro` do corpo quando existir. */
export class ErroApi extends Error {
  constructor(mensagem, { codigo = null, status = null } = {}) {
    super(mensagem);
    this.name = "ErroApi";
    this.codigo = codigo;
    this.status = status;
  }
}

/**
 * Erro tipado para "precisa de interacao do usuario".
 * Propositalmente NAO disparamos loginRedirect daqui: um redirect saindo de uma chamada de
 * dados joga o usuario fora da tela no meio de um carregamento e pode entrar em loop se
 * duas queries falharem juntas.
 *
 * QUEM E O DONO DESTE ERRO: o GuardaDeSessao em src/App.jsx observa o cache do TanStack
 * Query e, ao ver codigo === 'interacao_necessaria', renderiza a tela
 * src/pages/AcessoBloqueado.jsx com o botao "Entrar novamente". Se este erro voltar a ficar
 * sem consumidor, a sessao expirada volta a deixar o app permanentemente vazio.
 */
export class ErroInteracaoNecessaria extends Error {
  constructor(mensagem = "Sessao expirada. Entre novamente para continuar.") {
    super(mensagem);
    this.name = "ErroInteracaoNecessaria";
    this.codigo = "interacao_necessaria";
  }
}

/** Obtem o ID token silenciosamente a partir da conta ativa do MSAL. */
async function obterIdToken(msal) {
  const instance = msal?.instance;
  const contas = msal?.accounts || [];

  if (!instance) {
    throw new ErroApi("Instancia do MSAL nao disponivel para autenticar a chamada.", {
      codigo: "msal_indisponivel",
    });
  }
  if (!contas.length) {
    throw new ErroInteracaoNecessaria("Nenhuma conta autenticada. Entre para continuar.");
  }

  const pedido = { ...montarLoginRequest(getConfig()), account: contas[0] };

  try {
    const resposta = await instance.acquireTokenSilent(pedido);
    if (!resposta?.idToken) {
      throw new ErroInteracaoNecessaria("Nao foi possivel obter o token de identidade.");
    }
    return resposta.idToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError || e?.name === "InteractionRequiredAuthError") {
      throw new ErroInteracaoNecessaria();
    }
    if (e instanceof ErroInteracaoNecessaria) throw e;
    throw new ErroApi(`Falha ao renovar a sessao: ${e?.message || "erro desconhecido"}`, {
      codigo: "falha_token",
    });
  }
}

/**
 * chamarApi - GET/POST em {SUPABASE_URL}/functions/v1/carbon-api<caminho>.
 *
 * @param {string} caminho  Ex.: '/me', '/modulos'
 * @param {{ instance: object, accounts: array }} msal  Vindo do useMsal()
 * @param {{ metodo?: string, corpo?: any, signal?: AbortSignal }} opcoes
 */
export async function chamarApi(caminho, msal, opcoes = {}) {
  const { metodo = "GET", corpo = null, signal = null } = opcoes;
  const idToken = await obterIdToken(msal);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  // Permite que o chamador (TanStack Query) cancele junto com o proprio timeout.
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });

  const rota = caminho.startsWith("/") ? caminho : `/${caminho}`;

  let resposta;
  try {
    resposta = await fetch(`${urlFuncao("carbon-api")}${rota}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${idToken}`,
        apikey: SUPABASE_ANON_KEY,
        Accept: "application/json",
        ...(corpo ? { "Content-Type": "application/json" } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new ErroApi(`A requisicao para ${rota} excedeu ${TIMEOUT_MS / 1000} segundos.`, {
        codigo: "timeout",
      });
    }
    throw new ErroApi(`Falha de rede ao chamar ${rota}.`, { codigo: "falha_rede" });
  } finally {
    clearTimeout(timer);
  }

  // Le o corpo uma unica vez; erros do backend vem como { erro: 'codigo' }.
  let dados = null;
  try {
    const texto = await resposta.text();
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }

  if (!resposta.ok) {
    const codigo = dados?.erro || null;
    throw new ErroApi(mensagemDeErro(codigo, resposta.status, rota), {
      codigo,
      status: resposta.status,
    });
  }

  return dados;
}

/**
 * Traduz os codigos do contrato para texto de interface em pt-BR.
 *
 * Os codigos 'nao_autenticado', 'usuario_inativo' e o 'interacao_necessaria' do
 * ErroInteracaoNecessaria tem DONO na UI: o GuardaDeSessao em src/App.jsx observa
 * o cache das queries e troca a arvore por src/pages/AcessoBloqueado.jsx. Estas
 * mensagens sao o fallback (log, console, futuros toasts).
 */
function mensagemDeErro(codigo, status, rota) {
  if (codigo === "nao_autenticado") return "Sessao invalida ou expirada. Entre novamente.";
  if (codigo === "dominio_nao_permitido")
    return "Sua conta nao pertence ao dominio autorizado para o Apsis Carbon.";
  if (codigo === "usuario_inativo")
    return "Seu acesso ao Apsis Carbon esta suspenso. Fale com a equipe responsavel pelo sistema.";
  if (codigo) return `O servidor recusou a requisicao (${codigo}).`;
  return `O servidor retornou HTTP ${status} em ${rota}.`;
}

export async function obterPerfil(msal) {
  if (MODO_DEMO) {
    // Perfil minimo para a tela ser revisavel sem backend. Nenhum dado real.
    return { email: "", nome: "", papel: "visitante", ativo: false };
  }
  return chamarApi("/me", msal);
}

export async function obterModulos(msal) {
  if (MODO_DEMO) return { modulos: [] };
  return chamarApi("/modulos", msal);
}

export async function obterNotificacoes(msal) {
  if (MODO_DEMO) return { notificacoes: [] };
  return chamarApi("/notificacoes", msal);
}

import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { SUPABASE_ANON_KEY, urlFuncao } from "@/lib/supabaseClient";
import { getConfig } from "@/lib/runtimeConfig";
import { montarLoginRequest } from "@/lib/msalConfig";

/**
 * api/base - transporte e tratamento de erro das chamadas a Edge Function carbon-api.
 *
 * Este arquivo nao conhece NENHUMA rota de negocio. Cada dominio tem o seu proprio
 * modulo (src/lib/api/<dominio>.js) que importa `chamarApi` daqui. Assim uma frente
 * nova de trabalho nao precisa editar um arquivo que todas as outras tambem editam.
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
 * chamarApi - GET/POST/PATCH em {SUPABASE_URL}/functions/v1/carbon-api<caminho>.
 *
 * A Edge Function aceita hoje apenas estes tres metodos; qualquer outro volta como
 * 405 'metodo_nao_permitido'.
 *
 * @param {string} caminho  Ex.: '/me', '/modulos', '/projetos/<uuid>/pdd'
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
 *
 * Exportada porque os modulos de dominio precisam dela para converter o erro do
 * modo demonstracao no mesmo formato do erro de producao (ver chamarDemo).
 */
export function mensagemDeErro(codigo, status, rota) {
  if (codigo === "nao_autenticado") return "Sessao invalida ou expirada. Entre novamente.";
  if (codigo === "dominio_nao_permitido")
    return "Sua conta nao pertence ao dominio autorizado para o Apsis Carbon.";
  if (codigo === "usuario_inativo")
    return "Seu acesso ao Apsis Carbon esta suspenso. Fale com a equipe responsavel pelo sistema.";

  /* Codigos das rotas de projeto e de PDD. Sao mensagens de INTERFACE: as telas de
     Projetos e de PDD mostram `erro.message` em toast, entao o texto precisa dizer
     o que a pessoa faz a seguir, e nao repetir o codigo tecnico. */
  if (codigo === "sem_permissao")
    return "Seu perfil nao permite criar nem editar projetos. Fale com a equipe responsavel pelo sistema.";
  if (codigo === "nome_obrigatorio") return "Informe o nome do projeto para continuar.";
  if (codigo === "id_invalido") return "O identificador informado nao e valido.";
  if (codigo === "geometria_invalida")
    return "A geometria enviada nao e um GeoJSON valido de Polygon ou MultiPolygon.";
  if (codigo === "status_invalido") return "O status informado para o capitulo nao e valido.";
  if (codigo === "nao_encontrado") return "O registro nao foi encontrado. Ele pode ter sido removido.";

  /* Codigos que a Edge Function tambem produz nas rotas de escrita. Sem traducao
     explicita eles cairiam no fallback generico com o codigo tecnico cru, e o
     'registro_duplicado' em particular e MUITO alcancavel: basta reaproveitar um ID
     de registro que outro projeto ja usa (indice unico parcial em registro_id). */
  if (codigo === "registro_duplicado")
    return "Este ID no registro ja pertence a outro projeto. Confira o numero informado.";
  if (codigo === "periodo_invalido")
    return "O fim do periodo de creditacao nao pode ser anterior ao inicio.";
  if (codigo === "campo_invalido") return "Um dos campos enviados esta fora do formato aceito.";
  /* 'campo_obrigatorio' vem do helper exigir() do roteador. Nenhuma rota atual o
     produz, mas ele existe no contrato para os dominios novos: sem esta linha, a
     primeira tela que usar o helper mostraria o codigo tecnico cru na tela. */
  if (codigo === "campo_obrigatorio") return "Preencha os campos obrigatorios para continuar.";
  if (codigo === "referencia_invalida")
    return "Um dos vinculos informados nao existe mais no sistema.";
  if (codigo === "nada_para_atualizar") return "Nenhuma alteracao foi enviada.";
  if (codigo === "corpo_invalido") return "A requisicao chegou ao servidor em formato invalido.";

  if (codigo) return `O servidor recusou a requisicao (${codigo}).`;
  return `O servidor retornou HTTP ${status} em ${rota}.`;
}

/**
 * Executa a versao demonstracao de uma rota e converte ErroDemo em ErroApi.
 *
 * Sem isso, o modo demo recusaria entrada invalida com um erro de formato diferente
 * do de producao, e a tela teria dois caminhos de tratamento de erro - o do demo
 * (que sempre funciona na revisao) e o real (que ninguem exercita).
 *
 * Todo dataset de demonstracao (src/lib/demo/<dominio>.js) deve lancar um erro com a
 * propriedade `codigo` igual ao codigo do backend, e nunca ErroApi direto: importar
 * ErroApi no dataset criaria ciclo entre o modulo de dados e o modulo de transporte.
 */
export async function chamarDemo(rota, executar) {
  try {
    return await executar();
  } catch (e) {
    const codigo = e?.codigo || null;
    if (!codigo) throw e;
    const status = codigo === "nao_encontrado" ? 404 : 400;
    throw new ErroApi(mensagemDeErro(codigo, status, rota), { codigo, status });
  }
}

/**
 * Segmento de caminho seguro para interpolar em URL de rota.
 *
 * Nunca montar `/projetos/${id}` cru: um valor inesperado (undefined, uma barra, um
 * '..') viraria um caminho torto e uma chamada para uma rota que ninguem escreveu.
 * A Edge Function valida o UUID de novo e responde 400 'id_invalido' quando nao for.
 */
export const cam = (valor) => encodeURIComponent(String(valor ?? ""));

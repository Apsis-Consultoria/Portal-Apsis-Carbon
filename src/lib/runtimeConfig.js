import { SUPABASE_URL, SUPABASE_ANON_KEY, urlFuncao } from "@/lib/supabaseClient";

/**
 * runtimeConfig - configuracao de runtime do Apsis Carbon.
 *
 * DECISAO ARQUITETURAL: o frontend conhece apenas VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
 * (publicas por design). Todo o resto (clientId/tenantId do Azure AD, dominio permitido,
 * textos e imagens do login, feature flags) vem da tabela carbon_app_config via Edge Function
 * publica "app-config". Assim, trocar o tenant do Azure ou o texto do login e um UPDATE no
 * banco, sem rebuild nem redeploy do frontend.
 *
 * Segredos de verdade (service_role key, chaves de integracao) existem SOMENTE como secrets
 * das Edge Functions e nunca chegam ao navegador.
 */

// Textos e valores default. Servem de fallback quando o banco nao trouxer a linha
// correspondente, e sao a config completa no modo demonstracao.
export const CONFIG_DEFAULT = {
  azure: {
    clientId: "",
    tenantId: "",
    // Vazio de proposito: montarMsalConfig cai para window.location.origin.
    redirectUri: "",
    // Consentimento minimo. NAO pedir Files/Sites aqui (o Carbon nao usa e exigem admin consent).
    scopes: ["User.Read", "openid", "profile", "email"],
  },
  app: {
    nome: "Apsis Carbon",
    dominioPermitido: "apsis.com.br",
    // Alias institucional de area. Nunca e-mail pessoal hardcoded (LGPD).
    suporteEmail: "ti@apsis.com.br",
    ambiente: import.meta.env.PROD ? "producao" : "desenvolvimento",
  },
  login: {
    imagens: [
      "/login/amazonia-1.jpg",
      "/login/amazonia-2.jpg",
      "/login/amazonia-3.jpg",
      "/login/amazonia-4.jpg",
      "/login/amazonia-5.jpg",
    ],
    headline:
      "A APSIS leva para o mercado de carbono o mesmo rigor técnico de mais de três décadas em avaliações.",
    subheadline: "Estruturação, mensuração e validação de projetos de carbono.",
    categorias: [
      "Projetos de Carbono",
      "Contratos de Emissão",
      "Inventário de GEE",
      "Certificação e Verificação",
      "Relatórios ESG",
    ],
    copyright: "© 2026 APSIS Consultoria. Todos os direitos reservados.",
    logo: "/login/logo-apsis-carbon.png",
  },
  /**
   * Feature flags. As duas abaixo sao as mesmas do seed da migration e SAO LIDAS
   * de verdade: `notificacoes` liga o card de avisos e o sino da topbar;
   * `modulosDinamicos` liga a navegacao e os cards alimentados por carbon_modulos.
   * Quem consome testa `!== false`, para que uma chave ausente no banco nunca
   * apague um pedaco da tela.
   */
  flags: {
    notificacoes: true,
    modulosDinamicos: true,
  },
  demo: false,
};

/**
 * MODO_DEMO - permite revisar o visual (login + boas-vindas) antes do Supabase existir.
 * So liga em dev E com a env explicita. Em build de producao e sempre false por forca:
 * import.meta.env.DEV e estatico, entao o bundler ate elimina o ramo do demo no build.
 */
export const MODO_DEMO = Boolean(
  import.meta.env.DEV && import.meta.env.VITE_CARBON_DEMO === "true"
);

const TIMEOUT_MS = 8000;

// Placeholders do .env.example. Se chegarem aqui, ninguem preencheu o arquivo.
const PLACEHOLDERS_URL = ["SEU-PROJETO", "SEU_PROJETO", "SEUPROJETO"];
const PLACEHOLDERS_KEY = ["COLE_A_ANON_KEY_AQUI", "COLE-A-ANON-KEY-AQUI"];

const DOC_SETUP = "docs/setup-supabase.md";

let configCache = null;
// Promise em voo: chamadas concorrentes (React StrictMode monta duas vezes em dev)
// reaproveitam a MESMA requisicao em vez de disparar duas.
let promessaEmVoo = null;

function contemPlaceholder(valor, lista) {
  const alvo = String(valor || "").toUpperCase();
  return lista.some((p) => alvo.includes(p.toUpperCase()));
}

/** Valida as duas unicas envs do frontend. Lanca Error legivel para a ConfigErrorScreen. */
function validarEnv() {
  if (!SUPABASE_URL) {
    throw new Error(
      `A variavel VITE_SUPABASE_URL nao esta definida. Crie o arquivo .env na raiz do projeto com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Instrucoes em ${DOC_SETUP}.`
    );
  }
  if (contemPlaceholder(SUPABASE_URL, PLACEHOLDERS_URL)) {
    throw new Error(
      `VITE_SUPABASE_URL ainda esta com o valor de exemplo ("${SUPABASE_URL}"). Substitua pela URL real do projeto Supabase. Instrucoes em ${DOC_SETUP}.`
    );
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      `A variavel VITE_SUPABASE_ANON_KEY nao esta definida. Preencha o arquivo .env com a anon key do projeto Supabase. Instrucoes em ${DOC_SETUP}.`
    );
  }
  if (contemPlaceholder(SUPABASE_ANON_KEY, PLACEHOLDERS_KEY)) {
    throw new Error(
      `VITE_SUPABASE_ANON_KEY ainda esta com o valor de exemplo. Cole a anon key real do projeto Supabase (Settings > API). Instrucoes em ${DOC_SETUP}.`
    );
  }
}

/**
 * Merge por secao (raso dentro de cada secao). Nao e merge recursivo profundo de proposito:
 * arrays vindos do banco (imagens, categorias, scopes) devem SUBSTITUIR o default, nunca
 * concatenar - senao remover uma imagem no banco nao teria efeito na tela.
 */
function mesclarSecao(padrao, recebido) {
  if (!recebido || typeof recebido !== "object" || Array.isArray(recebido)) return { ...padrao };
  const saida = { ...padrao };
  for (const [chave, valor] of Object.entries(recebido)) {
    // null/undefined do banco caem para o default; string vazia tambem (linha nao preenchida).
    if (valor === null || valor === undefined) continue;
    if (typeof valor === "string" && valor.trim() === "") continue;
    if (Array.isArray(valor) && valor.length === 0) continue;
    saida[chave] = valor;
  }
  return saida;
}

/**
 * Normaliza os campos que o resto do codigo trata como LISTA DE STRINGS.
 *
 * O valor vem de jsonb livre no banco: se a linha login for salva com
 * "imagens": "/login/a.jpg,/login/b.jpg" (string em vez de array), ou com um JSON
 * como string nao parseada, o `imgs.map(...)` do CarbonLoginLayout lanca TypeError
 * DENTRO do render do AuthGuard. Preferimos degradar para o default (ou aceitar a
 * lista separada por virgula) a derrubar a tela por um cadastro torto.
 */
function normalizarLista(valor, padrao) {
  if (Array.isArray(valor)) {
    const limpos = valor.filter((item) => typeof item === "string" && item.trim() !== "");
    return limpos.length ? limpos : [...padrao];
  }
  if (typeof valor === "string") {
    const partes = valor.split(",").map((p) => p.trim()).filter(Boolean);
    return partes.length ? partes : [...padrao];
  }
  return [...padrao];
}

function mesclarConfig(recebido) {
  const bruto = recebido && typeof recebido === "object" ? recebido : {};

  const azure = mesclarSecao(CONFIG_DEFAULT.azure, bruto.azure);
  const login = mesclarSecao(CONFIG_DEFAULT.login, bruto.login);

  azure.scopes = normalizarLista(azure.scopes, CONFIG_DEFAULT.azure.scopes);
  login.imagens = normalizarLista(login.imagens, CONFIG_DEFAULT.login.imagens);
  login.categorias = normalizarLista(login.categorias, CONFIG_DEFAULT.login.categorias);

  return {
    azure,
    app: mesclarSecao(CONFIG_DEFAULT.app, bruto.app),
    login,
    // flags e um dicionario livre: o banco manda o conjunto completo.
    // Quem consome deve testar `!== false`, para que a ausencia da chave nao
    // desligue a funcionalidade (ver Layout.jsx e pages/BoasVindas.jsx).
    flags: { ...CONFIG_DEFAULT.flags, ...(bruto.flags || {}) },
    demo: false,
  };
}

async function buscarConfigRemota() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let resposta;
  try {
    resposta = await fetch(urlFuncao("app-config"), {
      method: "GET",
      // A funcao app-config e publica (verify_jwt = false): sem Authorization.
      // O header apikey identifica o projeto no gateway do Supabase.
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error(
        `A configuracao do aplicativo nao respondeu em ${TIMEOUT_MS / 1000} segundos. Verifique a conexao e se a Edge Function "app-config" esta publicada.`
      );
    }
    throw new Error(
      `Nao foi possivel contatar a configuracao do aplicativo (${urlFuncao("app-config")}). Verifique a URL do Supabase e se a Edge Function "app-config" esta publicada.`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!resposta.ok) {
    throw new Error(
      `A configuracao do aplicativo retornou HTTP ${resposta.status}. Confira se a Edge Function "app-config" esta publicada e se a tabela carbon_app_config tem linhas com publico = true.`
    );
  }

  let corpo;
  try {
    corpo = await resposta.json();
  } catch {
    throw new Error(
      'A configuracao do aplicativo retornou um corpo que nao e JSON valido. Confira o codigo da Edge Function "app-config".'
    );
  }

  const config = mesclarConfig(corpo);

  // Sem clientId/tenantId nao existe login possivel: falhar aqui e melhor do que
  // deixar o MSAL estourar um erro cru depois.
  if (!config.azure.clientId || !config.azure.tenantId) {
    const faltando = [
      !config.azure.clientId && "azure.clientId",
      !config.azure.tenantId && "azure.tenantId",
    ]
      .filter(Boolean)
      .join(" e ");
    throw new Error(
      `A configuracao do Azure AD esta incompleta: falta ${faltando}. Preencha a tabela carbon_app_config (chaves azure_client_id e azure_tenant_id) com publico = true. Instrucoes em ${DOC_SETUP}.`
    );
  }

  return config;
}

/**
 * carregarConfig - chamada uma vez no boot (src/main.jsx), antes de montar o MSAL.
 * Lanca Error com mensagem em pt-BR quando algo essencial falta; o main.jsx transforma
 * isso na ConfigErrorScreen (nunca tela branca).
 */
export async function carregarConfig() {
  if (configCache) return configCache;
  if (promessaEmVoo) return promessaEmVoo;

  promessaEmVoo = (async () => {
    if (MODO_DEMO) {
      // Modo demonstracao: zero rede, config default. So existe em dev.
      configCache = { ...CONFIG_DEFAULT, demo: true };
      return configCache;
    }
    validarEnv();
    configCache = await buscarConfigRemota();
    return configCache;
  })();

  try {
    return await promessaEmVoo;
  } catch (e) {
    // Libera a promise para permitir nova tentativa (ex.: botao "Tentar novamente").
    promessaEmVoo = null;
    throw e;
  }
}

/** Config ja carregada, ou null se carregarConfig ainda nao terminou. */
export function getConfig() {
  return configCache;
}

import { caminhoFuncao } from "@/lib/endpoint";

/**
 * runtimeConfig - configuracao de runtime do Apsis Carbon.
 *
 * DECISAO ARQUITETURAL: o frontend NAO TEM VARIAVEL DE AMBIENTE NENHUMA. Nem URL de
 * Supabase, nem anon key. TUDO (clientId/tenantId do Azure AD, dominio permitido, textos
 * e imagens do login, feature flags) vem da tabela carbon_app_config pela Edge Function
 * publica "app-config", alcancada pelo caminho relativo /api/app-config. Assim, trocar o
 * tenant do Azure ou o texto do login e um UPDATE no banco, sem rebuild nem redeploy.
 *
 * Quem traduz /api para o Supabase e a HOSPEDAGEM, por rewrite. Ver src/lib/endpoint.js
 * para o porque: com a URL do projeto no bundle, qualquer pessoa bate direto nas Edge
 * Functions, fora do nosso dominio, sem log, WAF nem limite de taxa.
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
 * MODO_DEMO - permite revisar as telas sem backend.
 *
 * SEM VARIAVEL DE AMBIENTE. O gatilho de BUILD e `import.meta.env.DEV`, que o
 * proprio Vite substitui (true em `vite dev`, false em `vite build`). Antes isto
 * dependia de VITE_CARBON_DEMO, e o dono pediu zero variavel no frontend.
 *
 * SEM Boolean() DE PROPOSITO. Com o wrapper o Rollup nao dobra a expressao para
 * a constante false, os ramos `if (MODO_DEMO)` sobrevivem ao tree-shaking e os
 * datasets ficticios inteiros vao para o bundle de producao. Medido: 6 KB so em
 * demoProjetos.js.
 */
export const MODO_DEMO = import.meta.env.DEV;

/**
 * Chave que o AuthGuard grava ao clicar em "Entrar em modo demonstracao".
 * sessionStorage e nao localStorage: o estado morre ao fechar a aba.
 */
const CHAVE_DEMO = "carbonModoDemoAtivo";

/**
 * O modo demonstracao esta ATIVO nesta aba?
 *
 * DUAS condicoes, e as duas importam:
 *
 *   MODO_DEMO   constante de build. Em producao e false, o `&&` curto-circuita
 *               e o Rollup remove a chamada junto com o modulo de dados;
 *   a flag      ligada apenas pelo botao. Sem ela, `npm run dev` apontado para
 *               um Supabase de verdade continua falando com a rede - que e
 *               exatamente o que se quer ao testar de fato.
 *
 * E FUNCAO, e nao constante, porque a segunda condicao muda em tempo de
 * execucao: a pessoa entra em demonstracao, sai, e entra com a conta real.
 */
export function MODO_DEMO_ATIVO() {
  if (!MODO_DEMO) return false;
  try {
    return sessionStorage.getItem(CHAVE_DEMO) === "true";
  } catch {
    // Navegacao privada pode negar sessionStorage. Sem persistencia, sem demo.
    return false;
  }
}

const TIMEOUT_MS = 8000;

const DOC_SETUP = "docs/setup-supabase.md";

/**
 * Cache do boot. `configCache` guarda o resultado; `promessaEmVoo` garante que
 * duas chamadas simultaneas a carregarConfig() nao facam duas requisicoes.
 * Modulo, e nao contexto do React, porque o main.jsx precisa disso ANTES de
 * montar a arvore (o MSAL e construido com o clientId que vem daqui).
 */
let configCache = null;
let promessaEmVoo = null;

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
 * O valor foi mesmo preenchido?
 *
 * Alem de vazio, recusa os placeholders do seed. A migration inicial grava a
 * linha `azure` com "PREENCHER_CLIENT_ID_AZURE" e "PREENCHER_TENANT_ID_AZURE"
 * justamente para a configuracao existir antes de alguem ter os valores. Sem
 * este teste eles passavam como se fossem GUIDs de verdade: o MSAL montava
 * authority https://login.microsoftonline.com/PREENCHER_TENANT_ID_AZURE e o
 * login morria numa pagina de erro da Microsoft (AADSTS90002), longe daqui.
 *
 * Mesma regra de supabase/functions/_shared/azureAuth.ts, de proposito: se os
 * dois lados discordarem sobre o que e "preenchido", um aceita o que o outro
 * recusa e o erro aparece na camada errada.
 */
function preenchido(valor) {
  if (typeof valor !== "string") return false;
  const limpo = valor.trim();
  if (limpo === "") return false;
  if (limpo.startsWith("PREENCHER")) return false;
  // Placeholder copiado de documentacao, no formato <NOME_DO_CAMPO>. Aconteceu de
  // verdade, com o UPDATE da secao 8 do docs/setup-supabase.md rodado sem trocar
  // os valores. Nao comeca com PREENCHER, entao o teste acima o deixava passar.
  if (limpo.startsWith("<") || limpo.endsWith(">")) return false;
  return true;
}

/**
 * O valor tem cara de GUID do Azure (8-4-4-4-12 hexadecimal)?
 *
 * Usado SO em clientId e tenantId, e por dois motivos distintos:
 *
 *   placeholder  pega qualquer texto de exemplo que tenha escapado do teste
 *                acima, em vez de deixar o MSAL montar uma authority invalida e
 *                a pessoa receber AADSTS90002 numa pagina da Microsoft, longe
 *                daqui e sem pista do que corrigir;
 *
 *   dominio      pega o erro mais caro dos dois. Gravar tenantId como
 *                "apsis.com.br" em vez do GUID PARECE funcionar: a authority
 *                resolve, o login no navegador completa e a tela abre. Mas o
 *                backend monta o issuer esperado a partir do GUID e recebe um
 *                iss diferente, entao TODA chamada ao carbon-api volta 401. O
 *                sintoma (entro, vejo a tela, nenhum dado carrega) nao aponta
 *                para a configuracao do tenant em lugar nenhum.
 *
 * Exigir GUID nao restringe nada que o sistema suporte: o backend e single
 * tenant por decisao (`supabase/functions/_shared/azureAuth.ts` fixa o issuer no
 * GUID e ainda confere o claim `tid`), entao "common" e "organizations" nunca
 * foram valores validos aqui.
 */
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pareceGuid(valor) {
  return preenchido(valor) && GUID.test(valor.trim());
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
    resposta = await fetch(caminhoFuncao("app-config"), {
      method: "GET",
      // Publica (verify_jwt = false): sem Authorization e sem apikey. O caminho
      // e relativo; quem sabe onde fica o Supabase e o rewrite da hospedagem.
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error(
        `A configuracao do aplicativo nao respondeu em ${TIMEOUT_MS / 1000} segundos. Verifique a conexao e se a Edge Function "app-config" esta publicada.`
      );
    }
    throw new Error(
      `Nao foi possivel contatar a configuracao do aplicativo (${caminhoFuncao("app-config")}). Falta o rewrite de /api/* na hospedagem, ou a Edge Function "app-config" nao esta publicada.`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!resposta.ok) {
    throw new Error(
      `A configuracao do aplicativo retornou HTTP ${resposta.status}. Confira se a Edge Function "app-config" esta publicada e se a tabela carbon_app_config tem linhas com publico = true.`
    );
  }

  // Rewrite ausente na hospedagem: /api/app-config nao chega ao Supabase, cai no
  // fallback da SPA e volta o index.html com 200. Sem este teste o `.json()`
  // falharia e a mensagem culparia o codigo da Edge Function, que esta intacto.
  //
  // A mensagem NAO cita o endereco do projeto Supabase de proposito: ela vai
  // para o bundle, e a regra 4 do CLAUDE.md existe para esse endereco nunca
  // chegar ao navegador. O destino do rewrite vive na documentacao e no console
  // da hospedagem.
  const tipo = resposta.headers.get("content-type") || "";
  if (!tipo.includes("application/json")) {
    throw new Error(
      'A chamada de configuracao voltou como pagina, e nao como JSON. Falta o rewrite de /api/* na hospedagem: ele precisa encaminhar /api/<funcao> para as Edge Functions do Supabase. Em desenvolvimento, suba o servidor com SUPABASE_API_URL definida (ver src/lib/endpoint.js).'
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
  if (!pareceGuid(config.azure.clientId) || !pareceGuid(config.azure.tenantId)) {
    const problema = (rotulo, valor) => {
      if (!preenchido(valor)) return `${rotulo} nao foi preenchido`;
      return `${rotulo} nao tem formato de GUID`;
    };
    const faltando = [
      !pareceGuid(config.azure.clientId) && problema("clientId", config.azure.clientId),
      !pareceGuid(config.azure.tenantId) && problema("tenantId", config.azure.tenantId),
    ]
      .filter(Boolean)
      .join("; ");
    // A tabela tem UMA linha `chave = 'azure'` cujo `valor` e um jsonb com
    // clientId, tenantId, redirectUri e scopes dentro. Nao existem linhas
    // azure_client_id nem azure_tenant_id: a mensagem antiga mandava preencher
    // chaves inexistentes, e quem seguisse a instrucao criaria linhas que o
    // mesclarConfig ignora, sem nunca entender por que nao adiantou.
    throw new Error(
      `A configuracao do Azure AD esta incompleta: ${faltando}. Os dois sao GUIDs no formato 8-4-4-4-12, copiados da aba Overview do registro de aplicativo no Azure. Na tabela carbon_app_config, a linha chave = 'azure' guarda os dois dentro do jsonb valor. Instrucoes em ${DOC_SETUP}.`
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
    // A pessoa JA escolheu a demonstracao nesta aba (botao do AuthGuard). Nem
    // tenta a rede: e o unico caminho que funciona sem backend nenhum.
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      configCache = { ...CONFIG_DEFAULT, demo: true };
      return configCache;
    }

    // Caminho normal, INCLUSIVE em desenvolvimento. Antes havia aqui um
    // `if (MODO_DEMO) return default` puro, e ele era um beco sem saida: em
    // `npm run dev` a config nunca vinha do banco, o clientId chegava vazio e o
    // main.jsx caia no clientId placeholder. Ou seja, era IMPOSSIVEL fazer login
    // real em localhost - exatamente o que se quer ao testar de verdade.
    try {
      configCache = await buscarConfigRemota();
      return configCache;
    } catch (erro) {
      // Em producao, falha de config e tela de erro: nao ha demonstracao para
      // onde degradar e esconder o problema seria pior.
      if (!MODO_DEMO) throw erro;

      // Em desenvolvimento, sem proxy ou sem backend no ar, degradamos para a
      // config default marcada como demo. Assim o AuthGuard ainda desenha a tela
      // de login com o botao "Entrar em modo demonstracao" em vez de o boot
      // morrer no ConfigErrorScreen. O motivo real vai para o console.
      console.warn(
        '[config] a configuracao remota falhou; caindo na demonstracao. ' +
          'Para login real em dev, suba com SUPABASE_API_URL definida.',
        erro,
      );
      configCache = { ...CONFIG_DEFAULT, demo: true };
      return configCache;
    }
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

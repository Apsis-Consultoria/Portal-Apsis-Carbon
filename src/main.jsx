import React from 'react'
import ReactDOM from 'react-dom/client'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'

import '@/index.css'
import App from '@/App.jsx'
import AuthGuard from '@/components/AuthGuard'
import ConfigErrorScreen from '@/components/ConfigErrorScreen'
import ErrorBoundary from '@/components/ErrorBoundary'
import { carregarConfig, MODO_DEMO } from '@/lib/runtimeConfig'
import { montarMsalConfig } from '@/lib/msalConfig'
import { limparEstadoTransitorioMsal } from '@/lib/msalCache'

/* =====================================================================
   1. Titulo da aba
   O <title> do index.html cobre o periodo antes do JS rodar. A partir daqui
   o titulo passa a ser responsabilidade da aplicacao e, depois que a config
   chega do Supabase, vira config.app.nome (fonte de verdade em producao).
   ===================================================================== */
const TITULO_PADRAO = 'Apsis Carbon'
document.title = TITULO_PADRAO

/* =====================================================================
   2. Blindagem contra extensoes que mutam o DOM (dom-guard)
   O Google Tradutor (e dark readers) envolvem os textos em <font> POR FORA do
   React. Na proxima reconciliacao o React chama removeChild/insertBefore em
   nos que ja nao sao filhos de quem ele acha que sao, e o app cai com
   NotFoundError ("insertBefore em Node..."). Workaround consagrado
   (facebook/react#11538): se o filho nao pertence ao pai esperado, degrada com
   elegancia em vez de derrubar a tela.
   O contador window.__domGuardHits e o console.warn sao OBRIGATORIOS: sem eles
   o guard mascararia em silencio um bug real de reconciliacao nosso.
   ===================================================================== */
if (typeof Node === 'function' && Node.prototype) {
  window.__domGuardHits = 0
  const guardHit = (metodo, no) => {
    window.__domGuardHits++
    console.warn(
      `[dom-guard] ${metodo} em no que ja foi movido por extensao (Google Tradutor?) - degradando sem crash`,
      no,
    )
  }
  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      guardHit('removeChild', child)
      return child
    }
    return originalRemoveChild.apply(this, arguments)
  }
  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      guardHit('insertBefore', referenceNode)
      // Mantem o no no DOM (no fim do pai); se ate o append falhar, devolve sem inserir.
      try {
        return this.appendChild(newNode)
      } catch {
        return newNode
      }
    }
    return originalInsertBefore.apply(this, arguments)
  }
}

// Raiz unica do React. Criada aqui fora para que qualquer caminho de erro do
// bootstrap consiga renderizar uma tela: nunca deixar tela branca.
const raiz = ReactDOM.createRoot(document.getElementById('root'))

/* ---------------------------------------------------------------------------
   Deep link pos-login
   A chave e gravada com carimbo de tempo e consumida UMA vez. Sem o carimbo ela
   sobrevive ao logout (sessionStorage e por aba, nao por sessao de usuario) e o
   proximo login feito na mesma aba - possivelmente de outra pessoa - herdaria o
   destino da sessao anterior.
   --------------------------------------------------------------------------- */
const CHAVE_DEEP_LINK = 'postLoginRedirect'
const VALIDADE_DEEP_LINK_MS = 5 * 60 * 1000
const DESTINO_PADRAO = '/BoasVindas'

/**
 * Caminho interno com UMA barra inicial. '//host' e '/\host' sao resolvidos pelo
 * navegador como OUTRA ORIGEM: nesse caso o history.replaceState lanca
 * SecurityError, o que derrubaria o boot logo depois de um login bem-sucedido.
 */
function caminhoInternoValido(caminho) {
  return (
    typeof caminho === 'string' &&
    caminho.startsWith('/') &&
    !caminho.startsWith('//') &&
    !caminho.startsWith('/\\')
  )
}

/**
 * Guarda o destino pretendido (deep link, ex.: link recebido por e-mail) ANTES
 * de qualquer redirect de login. Sem isso todo login cai na home e o link
 * original se perde.
 */
function guardarDeepLink() {
  const entrada = window.location.pathname + window.location.search
  if (!caminhoInternoValido(entrada)) return
  if (entrada === '/' || entrada.startsWith(DESTINO_PADRAO)) return
  try {
    sessionStorage.setItem(CHAVE_DEEP_LINK, JSON.stringify({ destino: entrada, ts: Date.now() }))
  } catch {
    // sessionStorage bloqueado: segue sem deep link, o login cai na home.
  }
}

/** Le, apaga e valida o deep link. Devolve null quando nao ha destino confiavel. */
function consumirDeepLink() {
  let bruto = null
  try {
    bruto = sessionStorage.getItem(CHAVE_DEEP_LINK)
    sessionStorage.removeItem(CHAVE_DEEP_LINK)
  } catch {
    return null
  }
  if (!bruto) return null
  try {
    const { destino, ts } = JSON.parse(bruto)
    if (!caminhoInternoValido(destino)) return null
    if (!Number.isFinite(ts) || Date.now() - ts > VALIDADE_DEEP_LINK_MS) return null
    return destino
  } catch {
    // Formato antigo (string crua) ou valor corrompido: descarta em silencio.
    return null
  }
}

/**
 * Recuperacao de um retorno de redirect que falhou (state/nonce invalido, login
 * concorrente em duas abas, consentimento negado).
 *
 * Limpa o ESTADO TRANSITORIO (sessionStorage + cookies do MSAL), que e o que
 * realmente travava o fluxo, e so descarta CREDENCIAIS quando nao sobrou conta
 * nenhuma - via API oficial. A limpeza antiga varria o localStorage por
 * 'login.windows.net', o que apagava tokens validos e derrubava a sessao boa de
 * outra aba (o localStorage e compartilhado entre abas da mesma origem).
 */
async function recuperarDeRedirectFalho(instance) {
  limparEstadoTransitorioMsal()
  try {
    if (instance.getAllAccounts().length === 0) {
      await instance.clearCache()
    }
  } catch (erro) {
    console.warn('[boot] clearCache do MSAL falhou', erro)
  }
}

/**
 * Em modo demonstracao o Supabase pode nem existir, entao a config vem com os
 * campos do Azure vazios. O PublicClientApplication exige um clientId em
 * formato de GUID e uma authority valida so para ser instanciado, entao usamos
 * placeholders. Nao ha risco de login acidental: o AuthGuard desabilita o botao
 * da Microsoft quando config.demo e true.
 */
const CLIENT_ID_DEMO = '00000000-0000-0000-0000-000000000000'

function configParaMsal(config) {
  if (!MODO_DEMO) return config
  return {
    ...config,
    azure: {
      ...config?.azure,
      clientId: config?.azure?.clientId || CLIENT_ID_DEMO,
      tenantId: config?.azure?.tenantId || 'common',
    },
  }
}

async function bootstrap() {
  // 3. Deep link salvo antes de tudo.
  guardarDeepLink()

  // 4. Configuracao vinda do backend (Edge Function app-config).
  //    Se falhar, mostra a tela de erro explicando o que verificar e ENCERRA.
  let config
  try {
    config = await carregarConfig()
  } catch (erro) {
    console.error('[boot] falha ao carregar a configuracao', erro)
    raiz.render(<ConfigErrorScreen erro={erro} />)
    return
  }

  if (config?.app?.nome) document.title = config.app.nome

  // 5. MSAL. Toda a config do MSAL vive em @/lib/msalConfig (UMA fonte de
  //    verdade): nao repetir opcoes de auth/cache aqui, senao um dos dois
  //    lugares vira letra morta e a proxima mudanca nao surte efeito.
  let msalInstance
  try {
    if (!config?.azure?.clientId && !MODO_DEMO) {
      throw new Error(
        'A configuracao chegou sem azure.clientId. Confira as linhas azure_client_id e azure_tenant_id em carbon_app_config (com publico = true).',
      )
    }
    msalInstance = new PublicClientApplication(montarMsalConfig(configParaMsal(config)))
    await msalInstance.initialize()
  } catch (erro) {
    console.error('[boot] falha ao inicializar o MSAL', erro)
    raiz.render(<ConfigErrorScreen erro={erro} />)
    return
  }

  // Processa o retorno do redirect de login. Protegido para nao derrubar o app:
  // um cache do MSAL corrompido (aba antiga, troca de tenant) faria o
  // handleRedirectPromise lancar e a tela ficaria branca.
  let resultadoRedirect = null
  try {
    resultadoRedirect = await msalInstance.handleRedirectPromise()
  } catch (erro) {
    console.warn('[boot] handleRedirectPromise falhou, limpando estado do MSAL', erro)
    await recuperarDeRedirectFalho(msalInstance)
  }

  // 6. Restaura o deep link depois do login.
  //    history.replaceState e NAO window.location.replace: o replace dispara um
  //    GET de servidor na rota (/BoasVindas), que volta 404 em hospedagem de SPA
  //    quando o rewrite nao cobre a rota. O replaceState navega client-side e o
  //    React Router renderiza normalmente.
  if (resultadoRedirect && resultadoRedirect.account) {
    const destino = consumirDeepLink() || DESTINO_PADRAO
    try {
      window.history.replaceState(null, '', destino)
    } catch (erro) {
      // Ultima rede de protecao: um destino que resolva para outra origem faz o
      // replaceState lancar SecurityError. Isso NAO pode virar tela de erro de
      // configuracao logo depois de um login bem-sucedido.
      console.warn('[boot] destino recusado pelo navegador, seguindo para a home', erro)
      try {
        window.history.replaceState(null, '', DESTINO_PADRAO)
      } catch {
        // Sem historico manipulavel: o React Router assume a rota atual.
      }
    }
  }

  // 7. Render. AuthGuard fica FORA do Router (dentro do MsalProvider): ele
  //    decide entre tela de login e aplicacao antes de existir roteamento.
  //    O ErrorBoundary envolve TUDO: o ErrorBoundary de dentro do App esta abaixo
  //    do Router, entao um erro de render no AuthGuard ou no CarbonLoginLayout
  //    (ex.: login.imagens cadastrado como string no banco) desmontaria a raiz e
  //    deixaria a tela branca que o projeto se proibe.
  raiz.render(
    <ErrorBoundary>
      <MsalProvider instance={msalInstance}>
        <AuthGuard>
          <App />
        </AuthGuard>
      </MsalProvider>
    </ErrorBoundary>,
  )
}

// Rede de seguranca final: qualquer erro nao previsto no boot ainda resulta em
// uma tela explicativa, nunca em tela branca.
bootstrap().catch((erro) => {
  console.error('[boot] erro inesperado', erro)
  raiz.render(<ConfigErrorScreen erro={erro} />)
})

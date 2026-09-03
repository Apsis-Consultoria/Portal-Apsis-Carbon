import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

/**
 * Caminho das Edge Functions no Supabase. Convencao do produto, igual em todo
 * projeto Supabase, entao vive no CODIGO e nao na variavel de ambiente.
 *
 * A divisao, decidida em 28/08/2026: a variavel carrega SO o endereco do projeto
 * (`https://<ref>.supabase.co`), que e a unica parte que muda de ambiente para
 * ambiente. Quem digita a variavel nao precisa saber a convencao de caminho, e
 * nao pode erra-la.
 */
const CAMINHO_FUNCOES = '/functions/v1'

/**
 * Endereco do projeto Supabase, para o proxy de /api em desenvolvimento.
 *
 * O nome atual e SUPABASE_API_URL. SUPABASE_FUNCTIONS_URL era o nome ate
 * 28/08/2026 e continua aceito por enquanto, com aviso: derrubar o ambiente de
 * quem ja tinha a variavel exportada seria trocar um problema de nome por um
 * problema de login que nao se explica sozinho.
 *
 * O aviso importa tanto quanto o fallback. Compatibilidade que nao reclama nunca
 * termina: daqui a um ano ninguem lembraria que sao dois nomes, e o dia em que a
 * variavel velha sumisse do ambiente de alguem, a falha apareceria como 404 em
 * /api sem ninguem ligar uma coisa a outra.
 */
function lerEnderecoDoProjeto() {
  const bruto = (process.env.SUPABASE_API_URL || process.env.SUPABASE_FUNCTIONS_URL || '').trim()
  if (!bruto) return ''

  if (!process.env.SUPABASE_API_URL && process.env.SUPABASE_FUNCTIONS_URL) {
    console.warn(
      '[vite] SUPABASE_FUNCTIONS_URL e o nome antigo e vai deixar de funcionar. ' +
      'Renomeie para SUPABASE_API_URL.',
    )
  }

  /*
   * O VALOR ANTIGO TERMINAVA EM /functions/v1, e o novo nao. Sem esta limpeza,
   * quem ainda tiver o valor completo exportado - ou quem copiar de uma anotacao
   * velha - produziria alvo com o caminho DUPLICADO
   * (.../functions/v1/functions/v1/carbon-api), e o sintoma seria 404 em toda
   * chamada de /api, sem nada dizer que a causa e a variavel.
   *
   * Corrigir em silencio seria pior: a anotacao errada continuaria circulando.
   * Por isso avisa.
   */
  const semBarra = bruto.replace(/\/+$/, '')
  if (semBarra.toLowerCase().endsWith(CAMINHO_FUNCOES)) {
    const origem = semBarra.slice(0, -CAMINHO_FUNCOES.length)
    console.warn(
      `[vite] SUPABASE_API_URL agora leva SO o endereco do projeto. Remova o ` +
      `"${CAMINHO_FUNCOES}" do fim: use ${origem}`,
    )
    return origem
  }
  return semBarra
}

const enderecoDoProjeto = lerEnderecoDoProjeto()

/**
 * Base das chamadas de API, injetada no bundle em tempo de BUILD.
 *
 * -----------------------------------------------------------------------------
 * ISTO AFROUXA UMA DECISAO DE SEGURANCA, e o afrouxamento e CONDICIONAL
 * -----------------------------------------------------------------------------
 * O desenho original (regra 4 do CLAUDE.md) e: o frontend so conhece o caminho
 * relativo /api/<funcao>, e quem sabe o endereco do Supabase e a hospedagem, por
 * rewrite. Assim o endereco do projeto nunca entra no bundle, e a unica porta
 * publica e o nosso dominio - com log, WAF e limite de taxa na frente.
 *
 * Em 02/09/2026 os dois dominios de producao subiram SEM as regras de rewrite, e
 * a Amplify servia /api/<funcao> como se fosse arquivo estatico: 301 para
 * /api/<funcao>/ e depois 404. Resultado: login impossivel nos dois sistemas.
 * A regra e de console e nao existe arquivo de repositorio que a substitua.
 *
 * A SAIDA, e o custo dela: se SUPABASE_API_URL estiver no ambiente do BUILD, o
 * endereco absoluto entra no bundle e o navegador chama o Supabase direto, sem
 * depender de rewrite. O custo e exatamente o que o desenho evitava: quem abrir
 * o codigo-fonte da pagina ve o endereco e pode bater nas Edge Functions fora do
 * nosso dominio. O que NAO muda: ninguem entra sem ID token do Azure AD, que e
 * validado dentro da propria funcao contra o JWKS da Microsoft.
 *
 * ELA SE DESFAZ SOZINHA, e e por isso que e assim e nao um endereco escrito no
 * codigo: no dia em que as duas regras de rewrite existirem, basta APAGAR a
 * variavel SUPABASE_API_URL do ambiente de build da Amplify. O proximo build
 * volta a `/api` e o endereco sai do bundle, sem tocar em uma linha de codigo.
 *
 * EM DESENVOLVIMENTO CONTINUA `/api`, sempre: ali o proxy do `server` abaixo
 * resolve, e o dev nao deve exercitar um caminho diferente do de producao mais
 * do que o necessario.
 */
function baseDaApi(comando) {
  if (comando !== 'build') return '/api'
  if (!enderecoDoProjeto) return '/api'
  return enderecoDoProjeto + CAMINHO_FUNCOES
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  /*
   * O valor vai para src/lib/endpoint.js. Precisa de JSON.stringify: `define`
   * faz substituicao TEXTUAL no codigo, entao sem as aspas o bundle sairia com
   * um identificador solto e quebraria no parse.
   */
  define: {
    __BASE_API__: JSON.stringify(baseDaApi(command)),
  },
  // Mesma escolha do portal: o log de warnings do Vite polui o terminal em dev.
  logLevel: 'error',
  server: {
    // 5175 e obrigatorio: o Portal Apsis roda em 5174 e os dois precisam
    // poder subir ao mesmo tempo na maquina do time.
    port: 5175,
    /**
     * strictPort: com a 5175 ocupada (processo antigo do Vite preso, por exemplo),
     * o default do Vite e subir na 5176 avisando em log de nivel info - que
     * logLevel: 'error' acima suprime. O app abriria normalmente, mas
     * redirectUri = window.location.origin viraria http://localhost:5176, que nao
     * esta registrado no Azure: o login morre com AADSTS50011 e nada no terminal
     * explica. Melhor falhar na hora, com mensagem clara.
     */
    strictPort: true,
    /**
     * Por default escuta SOMENTE em 127.0.0.1. `host: true` (0.0.0.0) deixa
     * qualquer maquina da rede - escritorio, coworking, Wi-Fi de hotel - ler o
     * codigo-fonte servido sem minificacao pelo dev server, o que para uma
     * consultoria sob acordo de confidencialidade e vazamento de codigo.
     * Para testar no celular, suba com: EXPOR_REDE=true npm run dev
     */
    host: process.env.EXPOR_REDE === 'true',
    /**
     * Lista explicita de hosts aceitos no cabecalho Host. NAO usar `true`: isso
     * desliga a protecao do Vite contra DNS rebinding, e um site malicioso
     * visitado com o dev server de pe consegue apontar um dominio proprio para
     * 127.0.0.1 e ler /src/... contornando a same-origin policy.
     * Para tunel (ngrok/cloudflared), acrescente o dominio do tunel aqui.
     */
    allowedHosts: ['localhost', '127.0.0.1', '.apsis.com.br'],
    /**
     * Proxy de /api -> Edge Functions do Supabase.
     *
     * O FRONTEND NAO TEM VARIAVEL DE AMBIENTE. Todas as chamadas usam o caminho
     * relativo /api/<funcao> (ver src/lib/endpoint.js) e quem sabe o endereco
     * real e a camada de hospedagem: aqui este proxy, em producao um rewrite do
     * Amplify. O endereco do projeto Supabase nunca entra no bundle.
     *
     * SUPABASE_API_URL, e nao VITE_SUPABASE_API_URL, de proposito: sem o prefixo
     * VITE_ o Vite se RECUSA a expor a variavel ao navegador. Ela e lida por
     * este arquivo, que roda no Node, entao e impossivel ela vazar para o
     * cliente mesmo por engano.
     *
     * A VARIAVEL LEVA SO O ENDERECO DO PROJETO, `https://<ref>.supabase.co`. O
     * `/functions/v1` e convencao do Supabase, igual em todo projeto, e por isso
     * mora aqui em CAMINHO_FUNCOES: quem preenche a variavel nao precisa saber a
     * convencao, e assim nao pode erra-la. Ela guarda so o que muda de ambiente
     * para ambiente.
     *
     * O NOME ANTIGO ERA SUPABASE_FUNCTIONS_URL, renomeado em 28/08/2026 a pedido
     * do dono. O fallback existe para nao derrubar quem ainda tem a variavel
     * velha exportada no terminal ou no ambiente do Windows, e avisa em vez de
     * aceitar em silencio - fallback silencioso vira permanente.
     *
     * Sem nenhuma das duas, o proxy nao e registrado e /api devolve 404. Isso e
     * intencional: um 404 claro na primeira chamada e melhor do que um destino
     * default errado que so falha na hora do login.
     */
    ...(enderecoDoProjeto
      ? {
          proxy: {
            '/api': {
              target: enderecoDoProjeto,
              changeOrigin: true,
              // /api/carbon-api/me -> <endereco>/functions/v1/carbon-api/me
              rewrite: (caminho) => caminho.replace(/^\/api/, CAMINHO_FUNCOES),
            },
          },
        }
      : {}),
  },
  resolve: {
    alias: {
      // Alias "@" -> ./src (o mesmo do jsconfig.json, para o editor concordar
      // com o bundler). fileURLToPath e necessario porque este arquivo e ESM.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
  ],
}))

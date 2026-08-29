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

// https://vite.dev/config/
export default defineConfig({
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
})

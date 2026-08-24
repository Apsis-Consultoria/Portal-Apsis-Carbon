import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

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
     * SUPABASE_FUNCTIONS_URL, e nao VITE_SUPABASE_FUNCTIONS_URL, de proposito:
     * sem o prefixo VITE_ o Vite se RECUSA a expor a variavel ao navegador.
     * Ela e lida por este arquivo, que roda no Node, entao e impossivel ela
     * vazar para o cliente mesmo por engano.
     *
     * Sem a variavel, o proxy nao e registrado e /api devolve 404. Isso e
     * intencional: um 404 claro na primeira chamada e melhor do que um destino
     * default errado que so falha na hora do login.
     */
    ...(process.env.SUPABASE_FUNCTIONS_URL
      ? {
          proxy: {
            '/api': {
              target: process.env.SUPABASE_FUNCTIONS_URL,
              changeOrigin: true,
              // /api/carbon-api/me -> <target>/carbon-api/me
              rewrite: (caminho) => caminho.replace(/^\/api/, ''),
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

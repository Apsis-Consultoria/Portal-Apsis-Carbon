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
     * Para testar no celular, suba com: VITE_EXPOR_REDE=true npm run dev
     */
    host: process.env.VITE_EXPOR_REDE === 'true',
    /**
     * Lista explicita de hosts aceitos no cabecalho Host. NAO usar `true`: isso
     * desliga a protecao do Vite contra DNS rebinding, e um site malicioso
     * visitado com o dev server de pe consegue apontar um dominio proprio para
     * 127.0.0.1 e ler /src/... contornando a same-origin policy.
     * Para tunel (ngrok/cloudflared), acrescente o dominio do tunel aqui.
     */
    allowedHosts: ['localhost', '127.0.0.1', '.apsis.com.br'],
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

# URL para inspecao visual - Apsis Carbon (ambiente local)

Registro da verificacao de frontend: a interface sobe e renderiza no navegador.
Nenhum arquivo de aplicacao foi alterado para esta verificacao.

## URL para abrir

    http://localhost:5175

Use exatamente `localhost`. O dev server escuta em `::1` (IPv6 loopback), entao
`http://127.0.0.1:5175` recusa a conexao. Isso e comportamento esperado da config
atual do Vite (`server.host` desligado por padrao, ver `vite.config.js`).

## Como subir

    cd "C:/Users/FilipeOliveiraAPSISC/dev/Apsis/Apsis Carbon"
    npm run dev

A porta 5175 e fixa (`strictPort: true`): se ja houver um processo antigo do Vite
preso nela, o comando falha em vez de subir em outra porta.

## O que aparece

| Rota | O que renderiza | Print |
| --- | --- | --- |
| `/` | Tela de login (Apsis Carbon, fundo Amazonia, botao Microsoft) | `home-localhost-5175.png` |
| `/preview-boasvindas.html` | Tela de Boas-Vindas com o shell (sidebar + topbar) | `preview-boasvindas-5175.png` |

A raiz redireciona para `/BoasVindas`, mas o `AuthGuard` intercepta antes: sem
sessao, a primeira tela e sempre o login. Com `VITE_CARBON_DEMO=true` no `.env`,
o botao "Entre com a sua conta Microsoft" fica desabilitado e aparece o aviso
"Modo demonstracao - configure o Supabase para entrar". Para ver a tela interna
sem login, use a rota de preview da tabela acima.

## Verificacao executada

    GET http://localhost:5175/                        -> HTTP 200 (2041 bytes)
    GET http://localhost:5175/src/main.jsx            -> HTTP 200
    GET http://localhost:5175/src/App.jsx             -> HTTP 200
    GET http://localhost:5175/src/index.css           -> HTTP 200
    GET http://localhost:5175/login/logo-apsis-transp.png -> HTTP 200
    GET http://localhost:5175/login/amazonia-1.jpg    -> HTTP 200
    GET http://localhost:5175/preview-boasvindas.html -> HTTP 200

Prints capturados com Edge headless em 1440x900. Sem tela branca nas duas rotas.

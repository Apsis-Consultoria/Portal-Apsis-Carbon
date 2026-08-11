# APSIS CARBON - Contexto do Projeto

## O que é

Sistema da APSIS Consultoria para o mercado de carbono: projetos de crédito de
carbono, contratos de emissão, inventário de GEE, certificação e verificação, e
relatórios de sustentabilidade.

Sistema **novo e separado do Portal Apsis**. Não compartilha código, banco,
projeto Supabase nem deploy. O Portal Apsis (`C:\Dev\portal-apsis`) serve apenas
como referência visual e de padrões: é **somente leitura**, nunca edite nada lá.

Entrega atual: duas telas, **Login** e **Boas-Vindas**. Os módulos de negócio
serão definidos depois, por isso a navegação e os cards de módulo vêm do Supabase
(tabela `carbon_modulos`) e mostram estado vazio elegante quando não há registros.

## Stack

- Frontend: React 18 + Vite 6 + TailwindCSS 3.4 + React Router DOM 6 + TanStack
  Query 5 + lucide-react + sonner
- JavaScript/JSX (não TypeScript no frontend). Alias `@` -> `./src`
- Auth: Azure AD SSO via `@azure/msal-browser` + `@azure/msal-react`, restrito a
  contas `@apsis.com.br`
- Backend: Supabase (PostgreSQL + Edge Functions em Deno/TypeScript)
- Dev server na porta **5175** (o portal usa 5174, não pode conflitar)
- Tailwind puro, sem shadcn/ui e sem Radix

## Regras críticas

1. **Banco de dados e armazenamento: SEMPRE Supabase.** Nada de outro banco,
   nada de estado persistido só no frontend.
2. **NUNCA a service_role key no frontend.** O portal tem essa chave hardcoded em
   `src/lib/supabaseClient.js` e exporta um cliente admin para o bundle: é uma
   vulnerabilidade conhecida que **não deve ser replicada**. No Carbon existe
   apenas o cliente anon, lendo `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`,
   sem fallback hardcoded. Tudo que precisa de privilégio roda em Edge Function.
3. **Proibido o caractere travessão (em dash).** Em código, comentários, textos,
   markdown, SQL, commits, dados no banco. Use hífen. Se encontrar um travessão
   em arquivo existente, substitua.
4. **Configuração no backend.** O frontend só conhece as duas variáveis
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Azure clientId/tenantId,
   domínio permitido, e-mail de suporte, textos e imagens do login e feature
   flags vivem na tabela `carbon_app_config` e chegam pela Edge Function pública
   `app-config`. Não crie novas variáveis `VITE_` para configuração.
5. **Interface e documentação em português do Brasil**, com acentuação correta.
6. **Estilo do código igual ao portal:** JSX com Tailwind direto, comentários
   explicativos em português onde a decisão não é óbvia.
7. **LGPD:** nunca hardcode dado pessoal (e-mail, telefone, CPF, nome de pessoa)
   no código. Para contato use alias institucional de área. Não invente dados de
   clientes reais nem nomes de pessoas em exemplos.
8. **Nunca tela branca.** Falha de configuração renderiza `ConfigErrorScreen`;
   erro de render é capturado pelo `ErrorBoundary`; erro de rede na Boas-Vindas
   degrada para estado vazio ou aviso discreto.
9. **Uma fonte de verdade para a config do MSAL** (`src/lib/msalConfig.js`). No
   portal existe um `msalConfig.js` que não é usado e uma config inline no
   `main.jsx`; isso já causou bug real (mudança sem efeito). Não repetir.
10. **Escopos mínimos no login:** `User.Read`, `openid`, `profile`, `email`. Nada
    de `Files.ReadWrite.All` ou `Sites.ReadWrite.All` (exigem admin consent e
    ampliam o risco sem necessidade).

## Armadilhas herdadas do portal que NÃO devem ser replicadas

- `index.html` precisa de `lang="pt-BR" translate="no"` e
  `<meta name="google" content="notranslate">`. Sem isso o Google Tradutor
  envolve os textos em `<font>` por fora do React e a tela quebra
  (`insertBefore`/`NotFoundError`). O dom-guard do `src/main.jsx` é a segunda
  camada de defesa e deve ser mantido integral, incluindo o contador
  `window.__domGuardHits` e o `console.warn`.
- Pós-login usar `window.history.replaceState`, nunca `window.location.replace`
  (dispara GET de servidor e dá 404 em hospedagem de SPA).
- Deep link: gravar em `sessionStorage('postLoginRedirect')` **antes** do
  `loginRedirect` e consumir depois do `handleRedirectPromise`.
- Cache do MSAL: `cacheLocation: 'localStorage'`, `storeAuthStateInCookie: true`,
  `navigateToLoginRequestUrl: false`. Em `sessionStorage`, cada aba nova cai na
  tela de login.
- No `catch` do `handleRedirectPromise`, limpar **só** as chaves `msal.*` e as
  que contêm `login.windows.net`. Nunca o localStorage inteiro.
- Bypass de autenticação, se existir, só por variável de ambiente explícita.
  Nunca detectar por hostname.
- Assets self-hostados em `public/`. Nada de apontar favicon ou manifest para o
  Storage do Supabase de outro projeto.
- Fontes carregadas **uma vez** em `src/index.css`. `@import` dentro de `<style>`
  injetado no corpo do documento é inválido e ignorado.
- Manter os tokens shadcn (`:root` e `.dark`) no `index.css` mesmo sem shadcn: o
  `tailwind.config.js` mapeia as cores para `hsl(var(--x))` e o seletor universal
  aplica `border-border outline-ring/50`. Remover quebra o build ou apaga todas
  as bordas.
- Dois laranjas convivem de propósito: `#F48126` na tela de login (curva e a
  palavra CARBON) e `#F47920` no shell e no padrão visual. Não unificar sem
  decisão explícita.

## Instruções para o Claude

Mantenha o contexto vivo do projeto atualizado em:

```
C:\Users\FilipeOliveiraAPSISC\Conciencia_Obisidian\projetos\Apsis Carbon\contexto.md
```

Leia esse arquivo no início de cada sessão. Se não existir, crie com a estrutura
padrão (Objetivo, Stack, Arquitetura, Decisões importantes, Estado atual,
Pendências, Observações) e avise.

Atualize sem precisar ser solicitado:

- ao concluir uma feature, corrigir um bug relevante ou tomar uma decisão
  arquitetural, registre em `contexto.md`
- decisões técnicas novas entram em
  `...\projetos\Apsis Carbon\decisoes.md` no formato `CARB-XXX`
- mudanças de arquitetura (novo componente, nova tabela, nova Edge Function)
  atualizam a seção Arquitetura do `contexto.md`

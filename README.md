# Apsis Carbon

Sistema da APSIS Consultoria para o mercado de carbono: projetos de crédito de
carbono, contratos de emissão, inventário de GEE (gases de efeito estufa),
certificação e verificação, e relatórios de sustentabilidade.

É um sistema **novo e independente** do Portal Apsis. Não compartilha código,
banco, projeto Supabase nem deploy com ele.

Nesta entrega existem apenas duas telas:

1. **Login** (SSO Azure AD, restrito a contas corporativas da APSIS)
2. **Boas-Vindas** (saudação, notificações e a lista de módulos)

Os módulos de negócio ainda não estão definidos. Por isso a navegação da sidebar
e os cards de módulo são carregados do Supabase (tabela `carbon_modulos`) e
mostram um estado vazio elegante enquanto não houver registros: nada de menu
hardcoded que precise de novo deploy para mudar.

## Stack

- **Frontend:** React 18 + Vite 6 + TailwindCSS 3.4 + React Router DOM 6 +
  TanStack Query 5 + lucide-react + sonner
- **Autenticação:** Azure AD / Entra ID via `@azure/msal-browser` e
  `@azure/msal-react` (login por redirect)
- **Backend:** Supabase (PostgreSQL + Edge Functions em Deno/TypeScript)
- **Linguagem:** JavaScript/JSX no frontend (não TypeScript). Alias `@` aponta
  para `./src`
- **Estilo:** Tailwind puro, sem shadcn/ui e sem Radix

## Como rodar

```bash
npm install
npm run dev
```

O dev server sobe em **http://localhost:5175**. A porta 5175 é obrigatória: o
Portal Apsis usa a 5174 e os dois precisam poder rodar ao mesmo tempo. O
`strictPort` está ligado, então com a porta ocupada o comando falha na hora, em vez
de subir em outra porta (o `redirectUri` do Azure AD é registrado por porta: subir
na 5176 quebraria o login com `AADSTS50011`).

Por padrão o servidor escuta **somente em 127.0.0.1**, para que o código-fonte
servido em dev não fique legível por outras máquinas da rede. Para testar no
celular, exponha na rede local de forma explícita:

```bash
VITE_EXPOR_REDE=true npm run dev
```

Antes do primeiro `npm run dev`, copie o template de ambiente e preencha:

```bash
cp .env.example .env
```

### Modo demonstração (sem Supabase)

Com `VITE_CARBON_DEMO=true` no `.env`, o app sobe sem nenhuma chamada de rede:
a configuração default é usada, a tela de login aparece normalmente e o botão da
Microsoft fica desabilitado com o aviso "Modo demonstração". Serve para revisar o
visual antes de o projeto Supabase existir.

O modo demonstração exige `import.meta.env.DEV`; em build de produção ele é
ignorado por força, então não existe risco de publicar produção sem autenticação
por esquecer a flag ligada.

### Scripts

| Script             | O que faz                                  |
| ------------------ | ------------------------------------------ |
| `npm run dev`      | Dev server na porta 5175                   |
| `npm run build`    | Build de produção em `dist/`               |
| `npm run preview`  | Serve o `dist/` gerado                     |
| `npm run lint`     | ESLint (flat config), só erros             |
| `npm run lint:fix` | ESLint com correção automática             |

## Decisão arquitetural: toda a configuração vive no backend

O frontend conhece **apenas duas** variáveis de ambiente, ambas públicas por
design:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Todo o resto vive na tabela `carbon_app_config` do Supabase e chega ao navegador
no boot, pela Edge Function pública `app-config`:

- `clientId` e `tenantId` do Azure AD
- domínio de e-mail permitido e e-mail de suporte
- imagens e textos da tela de login
- feature flags

**Por que:** mudar qualquer um desses valores passa a ser uma edição de linha no
banco, não um novo build e deploy do frontend. E a lista de módulos, os textos do
login e as flags podem ser ajustados por quem opera o sistema.

**Segredos de verdade** (service_role key, chaves de integração) existem somente
como secrets das Edge Functions e **nunca** chegam ao navegador. Regra
inegociável: nada que comece com `VITE_` é secreto, porque entra no bundle e é
visível para qualquer usuário. O frontend usa exclusivamente a anon key, com RLS
ativa no banco.

## Fluxo de boot (`src/index.html` -> `src/main.jsx`)

1. Define o título da aba
2. Aplica o **dom-guard** (blindagem contra extensões que mutam o DOM, como o
   Google Tradutor, que quebravam a reconciliação do React)
3. Guarda o deep link em `sessionStorage('postLoginRedirect')` antes de qualquer
   redirect
4. `await carregarConfig()`. Se falhar, renderiza `ConfigErrorScreen` e encerra:
   nunca tela branca
5. Monta o MSAL com a config recebida, `initialize()` e `handleRedirectPromise()`
6. Restaura o deep link com `history.replaceState` (não `location.replace`, que
   dispararia um GET de servidor e 404 em hospedagem de SPA)
7. Renderiza `MsalProvider > AuthGuard > App`

## Configuração do Supabase

O passo a passo do banco, das políticas de RLS e do deploy das Edge Functions
está em [docs/setup-supabase.md](docs/setup-supabase.md).

## Convenções

- Interface e documentação em **português do Brasil**
- **Proibido** o caractere travessão (em dash). Use hífen
- Cards `rounded-2xl`, inputs `rounded-xl`, botões `rounded-lg`
- Paleta: verde APSIS `#1A4731` (hover `#245E40`), laranja `#F47920` (hover
  `#e06810`). A tela de login usa o laranja `#F48126`, diferente de propósito
- Fontes: Sora (títulos) e Inter (corpo), carregadas uma única vez em
  `src/index.css`

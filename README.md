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

Os comandos abaixo estão em **PowerShell 5.1**, que é o terminal padrão das
máquinas do time:

```powershell
npm.cmd install
npm.cmd run dev
```

É `npm.cmd`, e não `npm`: a execution policy dessas máquinas barra o `npm.ps1`, e
a extensão `.cmd` é a que sempre roda. Pelo mesmo motivo cada comando vai em uma
linha própria: o PowerShell 5.1 não conhece o operador `&&`.

Só isso sobe a interface, mas **sem backend**: para o login real funcionar em
localhost falta a variável do proxy, descrita em
[Para falar com o backend em desenvolvimento](#para-falar-com-o-backend-em-desenvolvimento).

O dev server sobe em **http://localhost:5175**. A porta 5175 é obrigatória: o
Portal Apsis usa a 5174 e os dois precisam poder rodar ao mesmo tempo. O
`strictPort` está ligado, então com a porta ocupada o comando falha na hora, em vez
de subir em outra porta (o `redirectUri` do Azure AD é registrado por porta: subir
na 5176 quebraria o login com `AADSTS50011`).

Por padrão o servidor escuta **somente em 127.0.0.1**, para que o código-fonte
servido em dev não fique legível por outras máquinas da rede. Para testar no
celular, exponha na rede local de forma explícita:

```powershell
$env:EXPOR_REDE = "true"
npm.cmd run dev
```

São duas linhas no mesmo terminal porque o PowerShell 5.1 não aceita a forma
`EXPOR_REDE=true npm run dev` do shell Unix: ali `EXPOR_REDE=true` seria lido como
o nome do comando. `EXPOR_REDE` é lida pelo `vite.config.js`, que roda no Node, e
não tem prefixo `VITE_` pelo mesmo motivo da variável do proxy logo abaixo: o
prefixo ensinaria o padrão errado, o de mandar configuração para o navegador.

### Para falar com o backend em desenvolvimento

Não existe `.env` neste projeto. O frontend chama caminhos relativos `/api/<função>`
e quem traduz isso para as Edge Functions é a hospedagem, por rewrite. Em
desenvolvimento esse papel é do `server.proxy` do `vite.config.js`, alimentado por
uma variável **do processo do Vite**, não do navegador. São duas linhas, no
**mesmo terminal** (PowerShell 5.1, sem `&&`):

```powershell
$env:SUPABASE_API_URL = "https://SEU-PROJETO.supabase.co"
npm.cmd run dev
```

Troque `SEU-PROJETO` pelo project ref do Supabase. O ref não é escrito em lugar
nenhum do repositório, e é esse o ponto inteiro da arquitetura `/api`: ele vive na
configuração da hospedagem e no terminal de quem desenvolve, nunca no código.

O sufixo `/functions/v1` é obrigatório: o rewrite só remove o prefixo `/api`. A
variável vale só naquela janela do terminal, então precisa ser definida de novo a
cada janela nova. Sem ela o proxy nem é registrado, `/api/app-config` devolve 404 e
a tela cai no modo demonstração com um aviso âmbar explicando.

Com ela definida, `npm.cmd run dev` faz **login real** em localhost, contra o
Azure AD e o Supabase de verdade. Não existe mais um "modo de desenvolvimento" em
que a pessoa fica presa em dados fictícios: a demonstração virou escolha por
clique, descrita na seção seguinte.

O nome não tem prefixo `VITE_` de propósito: sem ele o Vite se recusa a expor a
variável ao cliente, então é impossível ela entrar no bundle.

### Modo demonstração (sem Supabase)

Não é variável, é escolha de tempo de execução. Em `npm.cmd run dev` a tela de
login mostra o botão "Entrar em modo demonstração", que grava `carbonModoDemoAtivo`
no `sessionStorage`; a partir daí os módulos de `src/lib/api/` operam sobre os
datasets fictícios de `src/lib/demo/` e de `src/lib/demoProjetos.js` (este último
está fora da pasta `demo/` por ser o mais antigo, e é justamente onde vive a
coordenada usada na verificação de build abaixo) e não fazem rede. Serve para revisar telas
sem sujar dado real. Uma tarja fixa avisa enquanto está ativo.

Ele **não bloqueia o login real**: com o backend no ar, o botão da Microsoft
funciona normalmente na mesma sessão de desenvolvimento. Até 21/08/2026 esse botão
vinha `disabled` em toda sessão de desenvolvimento, e era um beco sem saída: com o
Supabase já no ar, não havia como testar a autenticação de verdade em localhost.
Hoje quem o desabilita é `config.demo === true` ou a ausência de
`config.azure.clientId`, ou seja, só quando a configuração não veio do banco - não
mais uma constante de build.

São duas peças, as duas em `src/lib/runtimeConfig.js`:

| Peça               | O que é                                                     |
| ------------------ | ----------------------------------------------------------- |
| `MODO_DEMO`        | Constante de build, `import.meta.env.DEV`. Permite o recurso existir |
| `MODO_DEMO_ATIVO()`| Função, lê `carbonModoDemoAtivo` do `sessionStorage`         |

O padrão no código é sempre `if (MODO_DEMO && MODO_DEMO_ATIVO())`, **com a
constante na frente**. A ordem não é estilo: só com o literal `false` em primeiro
lugar o Rollup consegue dobrar a condição inteira e descartar o ramo. Invertendo a
ordem, ou envolvendo `MODO_DEMO` em `Boolean()`, a chamada de função sobrevive à
análise, o `import` do dataset fictício é preservado e os dados falsos vão para o
bundle de produção. Isso já aconteceu de verdade neste projeto, e foi medido.

Em build de produção `import.meta.env.DEV` dobra para `false`, o Rollup elimina
os ramos e os datasets fictícios não vão para o bundle. Conferir depois de um
build, no PowerShell 5.1 (a coordenada `-51.9` só existe nos polígonos fictícios):

```powershell
Select-String -Path dist\assets\*.js -Pattern "-51.9" -SimpleMatch
```

Tem que não imprimir nada. Qualquer linha de saída significa que dado fictício
vazou para o `dist/`.

### Scripts

| Script                 | O que faz                              |
| ---------------------- | -------------------------------------- |
| `npm.cmd run dev`      | Dev server na porta 5175               |
| `npm.cmd run build`    | Build de produção em `dist/`           |
| `npm.cmd run preview`  | Serve o `dist/` gerado                 |
| `npm.cmd run lint`     | ESLint (flat config), só erros         |
| `npm.cmd run lint:fix` | ESLint com correção automática         |

## Decisão arquitetural: toda a configuração vive no backend

**O frontend não tem variável de ambiente. Nenhuma.** Não existe `.env`, não
existe URL de Supabase nem anon key no bundle. Todas as chamadas vão para o
caminho relativo `/api/<função>` (ver `src/lib/endpoint.js`), e o endereço real
é conhecido apenas pela camada de hospedagem, por um rewrite de proxy.

**Por quê:** com a URL do projeto no bundle, qualquer pessoa que abrisse a tela
de login descobriria o endereço e passaria a bater direto nas Edge Functions,
fora do nosso domínio, sem log, WAF nem limite de taxa. Com o proxy, a única
porta pública é o nosso domínio.

Quem faz a tradução, dos dois lados:

| Ambiente          | Onde mora a regra                                          |
| ----------------- | ---------------------------------------------------------- |
| Produção          | Regra no console do AWS Amplify: origem `/api/<*>`, destino `https://SEU-PROJETO.supabase.co/functions/v1/<*>`, tipo `200 (rewrite)` |
| Desenvolvimento   | `server.proxy` do `vite.config.js`, alimentado por `SUPABASE_API_URL` |

Também não existe cliente `supabase-js` neste bundle, de propósito: ele só
criaria a tentação de consultar uma tabela direto e pular a checagem de permissão.
O antigo `src/lib/supabaseClient.js` foi apagado e a dependência
`@supabase/supabase-js` saiu do `package.json`; quem procura por ele hoje encontra
`src/lib/endpoint.js`, que só monta caminhos relativos.

A configuração vive na tabela `carbon_app_config` do Supabase e chega ao navegador
no boot, pela Edge Function pública `app-config`:

- `clientId` e `tenantId` do Azure AD
- domínio de e-mail permitido e e-mail de suporte
- imagens e textos da tela de login
- feature flags

O bloco do Azure é **uma única linha** da tabela, com `chave = 'azure'`, cujo campo
`valor` é um `jsonb` no formato `{clientId, tenantId, redirectUri, scopes}`. Não
existem linhas `azure_client_id` nem `azure_tenant_id`: criar chaves com esses
nomes não quebra nada visivelmente, o que é justamente o problema, porque o
frontend simplesmente as ignora e a tela continua reclamando de configuração
ausente.

**Por que:** mudar qualquer um desses valores passa a ser uma edição de linha no
banco, não um novo build e deploy do frontend. E a lista de módulos, os textos do
login e as flags podem ser ajustados por quem opera o sistema.

**Segredos de verdade** (service_role key, chaves de integração) existem somente
como secrets das Edge Functions e **nunca** chegam ao navegador. Regra
inegociável: nada que comece com `VITE_` é secreto, porque entra no bundle e é
visível para qualquer usuário. É por isso que não há nenhuma.

As Edge Functions são publicadas com `--no-verify-jwt`: quem autentica a
`carbon-api` é o ID token do Azure AD, validado contra o JWKS da Microsoft dentro
da própria função. Nenhuma chamada do frontend envia cabeçalho de chave anônima, e
nenhuma chave desse tipo jamais participou de autorização aqui: a plataforma do
Supabase não sabe validar um token do Azure, então quem valida é o nosso código.

## Autenticar não é autorizar

O ID token diz **quem** é a pessoa. O que ela pode fazer é decidido depois, dentro
da função:

- **o papel decide a escrita** (`admin` e `gestor` escrevem, `colaborador` não);
- **a participação decide a leitura**: só enxerga um projeto quem está na equipe
  dele, registrada na tabela `carbon_projeto_equipe`;
- **`admin` ignora a participação** e enxerga tudo. `gestor` **não** - ele escreve
  no que já enxerga.

O `gestor` ficar de fora é deliberado: se ele enxergasse tudo, o portão valeria para
menos da metade do time e não seria portão nenhum. Visão de carteira é papel `admin`,
concedido nominalmente, e não efeito colateral de poder editar.

Até 2026-08-22 não era assim: qualquer conta `@apsis.com.br` que fizesse o primeiro
login passava a ler todos os projetos, porque a linha em `carbon_usuarios` nasce
sozinha no primeiro acesso, com papel `colaborador`, e a leitura só exigia usuário
ativo. O portão está escrito no repositório, mas ainda não está no ar: depende da
migration `20260822090000_projeto_equipe` e da publicação da `carbon-api`, as duas
pendentes do provisionamento do Supabase (ver
[docs/ESTADO-ATUAL.md](docs/ESTADO-ATUAL.md)).

Consequência para quem escreve tela: as rotas de projeto devolvem `pode_criar` e
`pode_escrever` prontos, e a tela **renderiza o booleano que o servidor mandou** em
vez de ler o papel e decidir sozinha. Reimplementar a regra no frontend criaria duas
verdades, e a do cliente é sempre a que fica desatualizada. Contrato completo em
[docs/contrato-api.md](docs/contrato-api.md).

## Fluxo de boot (`index.html` -> `src/main.jsx`)

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

O `supabase/config.toml` declara **três** funções com `verify_jwt = false`:
`app-config`, `carbon-api` e `carbon-secure-share-upload`. A `app-config` porque é
chamada no boot, antes de existir qualquer sessão; as outras duas porque recebem
um ID token do Azure AD, que a plataforma não sabe validar. O deploy é um comando
por função:

```powershell
npx.cmd supabase functions deploy app-config --project-ref SEU-PROJETO --no-verify-jwt
npx.cmd supabase functions deploy carbon-api --project-ref SEU-PROJETO --no-verify-jwt
npx.cmd supabase functions deploy carbon-secure-share-upload --project-ref SEU-PROJETO --no-verify-jwt
```

Repetir a flag `--no-verify-jwt` no comando é redundante com o `config.toml`, mas
barato: esquecê-la em uma função nova faz o gateway responder 401 antes do nosso
código rodar, e como esse 401 não traz corpo `{ erro: ... }`, a tela mostra um erro
genérico de HTTP que parece problema de sessão, não de deploy.

## Convenções

- Interface e documentação em **português do Brasil**
- **Proibido** o caractere travessão (em dash). Use hífen
- Cards `rounded-2xl`, inputs `rounded-xl`, botões `rounded-lg`
- Paleta: verde APSIS `#1A4731` (hover `#245E40`), laranja `#F47920` (hover
  `#e06810`). A tela de login usa o laranja `#F48126`, diferente de propósito
- Fontes: Sora (títulos) e Inter (corpo), carregadas uma única vez em
  `src/index.css`

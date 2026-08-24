# Arquitetura de configuracao do Apsis Carbon

Este documento registra a decisao arquitetural central do projeto e explica o
modelo de seguranca por tras dela.

---

## CARBON-001: toda a configuracao de runtime vive no backend

**Status:** aceita
**Data:** 2026-08-07
**Revisao:** 2026-08-21 - o frontend passou de duas variaveis de ambiente para
zero, e as chamadas passaram a sair pelo caminho relativo `/api`. Ver a secao
"Por que a URL e a anon key sairam do frontend".
**Contexto:** entrega inicial do Apsis Carbon (telas de login e boas-vindas)

### Decisao

O frontend do Apsis Carbon nao conhece **nenhuma** variavel de ambiente. Zero.
Nao existe `.env` neste projeto, nao existe `.env.example` e nao existe cliente
`supabase-js` no bundle: a dependencia `@supabase/supabase-js` foi removida do
`package.json` e o antigo `src/lib/supabaseClient.js` foi apagado.

Todas as chamadas de rede saem por um caminho **relativo**, na mesma origem, e o
unico lugar que monta esse caminho e `src/lib/endpoint.js`:

```js
import { caminhoFuncao } from '@/lib/endpoint';

caminhoFuncao('app-config'); // -> '/api/app-config'
caminhoFuncao('carbon-api'); // -> '/api/carbon-api'
```

Quem traduz `/api` para as Edge Functions e a **hospedagem**, por rewrite. O
porque disso esta na secao "Por que a URL e a anon key sairam do frontend", mais
abaixo, e a mecanica esta em "O rewrite /api".

Toda a configuracao vive na tabela `carbon_app_config` do Supabase e e lida no
boot pela Edge Function publica `app-config`, alcancada por `/api/app-config`:

- `azure`: clientId, tenantId, redirectUri e escopos do MSAL
- `app`: nome, dominio corporativo permitido, e-mail de suporte, ambiente
- `login`: imagens do slideshow, logo, headline, subheadline, categorias, copyright
- `flags`: feature flags booleanas

Cada item acima e **uma linha** da tabela, cuja `chave` e exatamente o nome do
bloco e cujo `valor` e um `jsonb` com os campos internos. O bloco do Azure, por
exemplo, e a linha `chave = 'azure'` com
`{clientId, tenantId, redirectUri, scopes}` dentro do `valor`. **Nao existem, e
nao devem ser criadas, linhas `azure_client_id` ou `azure_tenant_id`**: o
frontend le `getConfig().azure.clientId`, entao linhas soltas com esses nomes
ficam no banco sem ninguem ler, e o login continua falhando por clientId vazio
enquanto a pessoa jura que ja configurou.

Segredos de verdade (service_role key, chaves de integracao) existem **somente**
como secrets das Edge Functions e nunca chegam ao navegador.

### Motivacao

1. **Mudanca de configuracao nao exige build nem deploy.** Trocar o texto da
   headline do login, adicionar uma imagem de fundo ou desligar uma feature flag e
   um `UPDATE` no SQL Editor. Com `.env` do Vite, cada ajuste desses viraria um
   commit, um build e um deploy, porque o Vite congela `import.meta.env` no bundle.
2. **Um unico ponto de verdade para dados sensiveis a ambiente.** O clientId do
   Azure e o dominio permitido sao lidos pelo frontend (para montar o MSAL) **e**
   pelo backend (para validar o token). Guardar isso em dois lugares diferentes
   levaria a divergencia silenciosa, com login funcionando e API recusando.
3. **Superficie de configuracao auditavel.** Existe uma coluna `publico` que decide
   o que pode chegar ao navegador, e uma coluna `descricao` que documenta cada
   bloco para quem for editar. Um `.env` nao tem nem uma nem outra.
4. **Elimina o risco de vazamento por copiar e colar.** Enquanto existisse um
   `.env` no frontend, existiria o convite: alguem acrescenta mais uma linha por
   analogia com as que ja estao la, e a linha seguinte pode ser uma chave
   sensivel que o Vite embute no bundle sem pedir confirmacao nenhuma. Sem
   `.env` e sem `.env.example`, nao ha onde colar. O arquivo de exemplo foi
   apagado exatamente por isso: ele ensinava o padrao errado a quem clonasse o
   repositorio.

### Consequencias

- **Positiva:** o boot fica autoexplicativo e a configuracao e versionada como
  dado (com `atualizado_em` mantido por trigger).
- **Positiva:** adicionar configuracao nova nao mexe em codigo de backend: a
  `app-config` monta a resposta a partir de todas as linhas publicas.
- **Negativa:** o boot passa a depender de uma chamada de rede. Mitigacoes:
  `Cache-Control: public, max-age=60` no endpoint; merge com defaults locais no
  `runtimeConfig.js`; e uma `ConfigErrorScreen` dedicada, para que falha de config
  nunca vire tela branca.
- **Negativa:** tres Edge Functions a manter (`app-config`, `carbon-api` e
  `carbon-secure-share-upload`). Aceitavel: sao pequenas e compartilham os
  modulos de `_shared`.
- **Negativa:** o `/api` so funciona onde existir o rewrite. Ele nao vem do
  codigo: e configuracao de infraestrutura, e precisa ser criado uma vez por
  ambiente (regra no console do Amplify em producao, `server.proxy` no
  `vite.config.js` em desenvolvimento). Em compensacao, essa e a unica coisa que
  precisa ser configurada fora do banco, e ela nao guarda segredo nenhum.

---

## Por que a URL e a anon key sairam do frontend

**Isto mudou em 21/08/2026, e a versao anterior deste documento defendia o
contrario.** O registro da decisao antiga fica aqui de proposito: o argumento
antigo nao era falso, ele apenas respondia a uma pergunta menor do que a que
importa.

### O que se defendia antes

Que a URL do projeto e a anon key podiam ficar no bundle, porque **a anon key e
um identificador publico, nao um segredo**:

- a URL e o endereco da API do projeto e aparecia em toda requisicao que o
  navegador fazia; enquanto o navegador falasse direto com o Supabase, esconder
  era impossivel;
- a anon key (ou publishable key, no modelo novo) apenas diz "esta requisicao vem
  do papel `anon`". Ela nao concede permissao: quem concede e a RLS;
- por isso o proprio Supabase chama a chave nova de *publishable*: o nome deixa
  explicito que ela nasceu para ser publicada.

Nada disso deixou de ser verdade. A conclusao e que mudou.

### Por que mudou assim mesmo

Porque a pergunta certa nao e "essa chave da acesso a alguma coisa?", e sim
"eu quero que o endereco do meu backend seja de conhecimento publico?".

Com a URL do projeto no bundle, qualquer visitante da tela de login (que e
publica, sem autenticacao nenhuma) abre o DevTools, le `https://<REF>.supabase.co`
e passa a poder bater **direto** nas Edge Functions, fora do nosso dominio. Fora
do nosso dominio quer dizer: sem o log de acesso da hospedagem, sem WAF, sem
limite de taxa e sem a possibilidade de bloquear um endereco abusivo. A
`app-config` responde sem autenticacao por necessidade (o boot acontece antes de
existir qualquer sessao) e a `carbon-api` recusa toda chamada sem ID token
valido, mas **recusar custa execucao, e execucao aparece na fatura**. Defesa
contra volume nao mora dentro da funcao: mora na borda, e a borda so existe se o
trafego for obrigado a passar por ela.

O resultado e a arquitetura `/api`: o navegador so conhece o proprio dominio, e a
unica porta publica do sistema e a nossa.

### E a anon key, onde foi parar?

Em lugar nenhum. **Nao existe mais header `apikey` em chamada nenhuma do
frontend.** As tres Edge Functions sao publicadas com `--no-verify-jwt`
(`verify_jwt = false` no `supabase/config.toml`), entao a plataforma nao exige a
chave, e a anon key nunca participou de autorizacao neste projeto: quem autoriza
a `carbon-api` e a `carbon-secure-share-upload` e o **ID token do Azure AD**,
validado contra o JWKS da Microsoft dentro da propria funcao. Manter a chave
seria carregar uma credencial que nao decide nada: custo sem beneficio.

### A RLS continua de pe, como segunda camada

Nada do que esta acima substitui a RLS declarada na migration, e ela segue
restritiva por padrao. A diferenca e que hoje ela protege contra um cenario
diferente: nao contra o navegador (que nao alcanca mais o PostgREST), e sim
contra um erro futuro nosso, como reintroduzir um cliente direto ou expor a API
REST do projeto por outro caminho.

| Tabela | RLS | Acesso pelo papel `anon` |
| --- | --- | --- |
| `carbon_app_config` | ativa | `SELECT` somente onde `publico = true` |
| `carbon_modulos` | ativa, **zero policies** | nenhum |
| `carbon_notificacoes` | ativa, **zero policies** | nenhum |
| `carbon_usuarios` | ativa, **zero policies** | nenhum |
| `carbon_usuario_modulos` | ativa, **zero policies** | nenhum |

A tabela acima e um recorte das cinco do schema inicial. O banco tem hoje 42
tabelas em 14 migrations, e o padrao vale para todas: RLS ativa, e a unica policy
de leitura do repositorio inteiro e a de `carbon_app_config`.

Com RLS ativa e nenhuma policy, toda leitura e escrita pelo papel `anon` e negada.
Nas quatro tabelas de zero policies a migration ainda faz
`revoke all ... from anon, authenticated`, entao a RLS deixa de ser a unica linha
de defesa: se alguem desabilitar a RLS por engano, o `revoke` continua bloqueando.

**`carbon_app_config` e a excecao, e precisa ser dita por inteiro.** Ali o
`revoke all` da linha 86 da migration inicial e seguido, na linha 87, de um
`grant select ... to anon, authenticated` - sem ele a policy de leitura publica
nao teria efeito, porque no PostgreSQL o privilegio e a policy sao verificados em
conjunto. A consequencia e que, NESTA tabela, a RLS **e** a unica linha de defesa.
Desabilita-la exporia ao papel `anon` todas as linhas, inclusive as de
`publico = false`, e a linha `secure_share` descreve o site, a biblioteca e a
pasta base no SharePoint, mais o remetente dos e-mails de acesso. Nao ha
credencial ali (segredo nunca entra nesta tabela), mas ha topologia interna que
nao deve ser publica. Se um dia for preciso mexer na RLS desta tabela, mexa
sabendo disso.

Ou seja: mesmo que o endereco do projeto vaze por outro caminho, quem tentar usar
o papel `anon` nao le modulos, notificacoes nem a lista de colaboradores. O
maximo que obtem e a mesma configuracao publica de login que a tela de login ja
mostra a qualquer visitante.

---

## O rewrite /api

O frontend pede `/api/<funcao>` e a hospedagem entrega em
`<endereco do projeto>/functions/v1/<funcao>`. O prefixo `/api` e a **unica**
coisa removida no caminho; o resto passa intacto.

### Producao (AWS Amplify)

Regra criada uma vez no console do Amplify, em Hosting > Rewrites and redirects:

| Campo | Valor |
| --- | --- |
| Origem | `/api/<*>` |
| Destino | `https://<REF>.supabase.co/functions/v1/<*>` |
| Tipo | `200 (Rewrite)` |

Tem que ser **200 (rewrite)**, nao 301 nem 302: em redirect quem refaz a chamada
no endereco novo e o proprio navegador, que assim aprende o endereco do Supabase
e reintroduz exatamente o problema descrito na secao anterior. No rewrite quem
refaz a chamada e o servidor, e o navegador nunca ve o destino.

Ordem tambem importa: a regra do `/api` precisa vir **antes** da regra
catch-all de SPA (`/<*>` para `/index.html`), senao a chamada de API volta como
HTML e o erro aparece como um `JSON.parse` misterioso.

### Desenvolvimento (server.proxy do Vite)

O `vite.config.js` registra o proxy a partir de `SUPABASE_FUNCTIONS_URL`. Note a
ausencia do prefixo `VITE_`: e de proposito. **Sem o prefixo, o Vite se recusa a
expor a variavel ao navegador** - ela e lida pelo processo do Node que roda o
`vite.config.js`, entao e impossivel ela cair no bundle, nem por engano de quem
mexer no codigo depois. Pelo mesmo motivo, `VITE_EXPOR_REDE` foi renomeada para
`EXPOR_REDE`: o prefixo ensinava o padrao errado.

Subir o dev server, em PowerShell 5.1, **duas linhas no mesmo terminal** (o
PowerShell 5.1 nao aceita `&&`, e e `npm.cmd` porque `npm.ps1` esbarra na
execution policy):

```powershell
$env:SUPABASE_FUNCTIONS_URL = "https://<REF>.supabase.co/functions/v1"
npm.cmd run dev
```

O sufixo `/functions/v1` e **obrigatorio**: o rewrite so tira o `/api`, ele nao
acrescenta nada. Sem o sufixo, `/api/app-config` chega em
`https://<REF>.supabase.co/app-config` e devolve 404.

Sem a variavel definida, o proxy simplesmente nao e registrado. Isso tambem e
intencional: um 404 claro em `/api/app-config` na primeira chamada e melhor do que
um destino default errado que so falha na hora do login. Nesse caso a aplicacao
nao quebra - ela degrada para o modo demonstracao e mostra um aviso ambar na tela
de login.

### Deploy das funcoes

Uma por vez, com `npx.cmd`:

```powershell
npx.cmd supabase functions deploy app-config --project-ref <REF> --no-verify-jwt
npx.cmd supabase functions deploy carbon-api --project-ref <REF> --no-verify-jwt
npx.cmd supabase functions deploy carbon-secure-share-upload --project-ref <REF> --no-verify-jwt
```

O `--no-verify-jwt` espelha o `verify_jwt = false` do `supabase/config.toml`. O
arquivo vale para o ambiente local; a flag e o que vale no deploy hospedado.

---

## O modo demonstracao tambem nao e variavel de ambiente

Existia uma `VITE_CARBON_DEMO`. Ela **foi removida** e nao deve voltar. No lugar,
`src/lib/runtimeConfig.js` expoe duas coisas com papeis diferentes:

| Nome | O que e | De onde vem |
| --- | --- | --- |
| `MODO_DEMO` | constante de **build** | `import.meta.env.DEV` |
| `MODO_DEMO_ATIVO()` | funcao de **runtime** | chave `carbonModoDemoAtivo` no `sessionStorage` |

A chave do `sessionStorage` e gravada pelo botao "Entrar em modo demonstracao" do
`AuthGuard`, na tela de login.

O padrao no codigo e sempre, e nesta ordem:

```js
if (MODO_DEMO && MODO_DEMO_ATIVO()) {
  // dataset ficticio
}
```

**A constante tem que vir na frente.** Em `vite build`, `import.meta.env.DEV` e
substituido literalmente por `false`, o Rollup dobra a condicao inteira e elimina
o bloco, junto com os datasets ficticios que so ele importava. Se a chamada de
funcao vier primeiro, o Rollup nao consegue provar que o bloco e inalcancavel e
os dados de demonstracao vao para o bundle de producao. Isso ja aconteceu de
verdade e foi medido no tamanho do bundle - nao e teoria. Pelo mesmo motivo,
nunca envolva `MODO_DEMO` em `Boolean()`.

Consequencia pratica no dia a dia: rodar `npm.cmd run dev` com
`SUPABASE_FUNCTIONS_URL` definida da **login real em localhost**. A demonstracao
deixou de ser um modo em que o desenvolvedor fica preso e virou uma escolha por
clique, que se desfaz fechando a aba (a chave vive no `sessionStorage`, nao no
`localStorage`, exatamente para isso).

---

## O que muda em relacao ao Portal Apsis

No Portal Apsis (`C:\Dev\portal-apsis`), o arquivo `src/lib/supabaseClient.js`
tem a **service_role key hardcoded como fallback** e exporta um client
`supabaseAdmin` para o codigo do frontend. Consequencias:

- a chave vai para o **bundle JavaScript** entregue ao navegador, ou seja, e
  publica na pratica;
- ela esta em **codigo versionado**, portanto tambem no historico do Git;
- a service_role key tem o atributo `BYPASSRLS`: **toda a RLS do projeto deixa de
  valer** para quem a possui. Ler, alterar e apagar qualquer tabela passa a ser
  possivel a partir do navegador de qualquer pessoa.

No Apsis Carbon isso **nao se repete**:

| Aspecto | Portal Apsis | Apsis Carbon |
| --- | --- | --- |
| Client no frontend | anon **e** `supabaseAdmin` (service key) | nenhum: `@supabase/supabase-js` nao esta no `package.json` |
| Variaveis de ambiente no frontend | varias, com `.env` | nenhuma, e nao existe `.env` |
| Endereco do backend | no bundle | so na hospedagem, atras do rewrite `/api` |
| service_role key | hardcoded no codigo | so no runtime da Edge Function, injetada pela plataforma |
| Fallback de chave em codigo | sim | nao ha chave nenhuma no codigo para ter fallback |
| Bypass de RLS pelo navegador | possivel | impossivel |
| Config de Azure | espalhada entre `.env` e codigo | uma linha em `carbon_app_config` |
| Escopos do MSAL | `User.Read`, `openid`, `profile`, `email`, `Files.ReadWrite.All`, `Sites.ReadWrite.All` | apenas `User.Read`, `openid`, `profile`, `email` |

> **Acao recomendada, separada desta entrega:** abrir um pedido para **rotacionar a
> service_role key do projeto Supabase do Portal Apsis**. Como ela esta em codigo
> versionado, deve ser tratada como comprometida, independentemente de quem teve
> acesso ao repositorio. Rotacionar sem corrigir o codigo do Portal apenas troca a
> chave exposta por outra, portanto as duas coisas precisam andar juntas.

---

## Fluxo de boot

```
NAVEGADOR                          EDGE FUNCTIONS                 POSTGRES
    |                                     |                          |
    | 1. carrega index.html + bundle      |                          |
    |    (nenhuma variavel de ambiente)   |                          |
    |                                     |                          |
    | 2. GET /api/app-config              |                          |
    |    (sem Authorization, sem apikey)  |                          |
    |    a hospedagem reescreve /api/<*>  |                          |
    |    para /functions/v1/<*>           |                          |
    |------------------------------------>|                          |
    |                                     | 3. SELECT chave, valor   |
    |                                     |    FROM carbon_app_config|
    |                                     |    WHERE publico = true  |
    |                                     |------------------------->|
    |                                     |<-------------------------|
    | 4. { azure, app, login, flags }     |                          |
    |    Cache-Control: max-age=60        |                          |
    |<------------------------------------|                          |
    |                                     |                          |
    | 5. montarMsalConfig(config)         |                          |
    |    new PublicClientApplication      |                          |
    |    initialize() + handleRedirect()  |                          |
    |                                     |                          |
    | 6. usuario clica "Entre com a       |                          |
    |    sua conta Microsoft"             |                          |
    |                                     |                          |
    |    ==> loginRedirect  --------------------------------> AZURE AD (Entra ID)
    |    <== volta com ID token  <-------------------------------------|
    |                                     |                          |
    | 7. GET /api/carbon-api/me           |                          |
    |    Authorization: Bearer <ID token> |                          |
    |------------------------------------>|                          |
    |                                     | 8. jwtVerify contra o    |
    |                                     |    JWKS da Microsoft:    |
    |                                     |    assinatura, iss, aud, |
    |                                     |    tid, dominio          |
    |                                     |    (JWKS em cache)       |
    |                                     |                          |
    |                                     | 9. so agora toca o banco |
    |                                     |    com service_role:     |
    |                                     |    upsert carbon_usuarios|
    |                                     |------------------------->|
    |                                     |<-------------------------|
    | 10. { email, nome, papel, ativo }   |                          |
    |<------------------------------------|                          |
    |                                     |                          |
    | 11. mesmo fluxo para /modulos e     |                          |
    |     /notificacoes                   |                          |
```

Pontos importantes do fluxo:

- **Todas as setas que saem do navegador passam pelo rewrite.** O navegador so
  emite `/api/<funcao>`, no proprio dominio; o salto para
  `.../functions/v1/<funcao>` acontece do lado do servidor. Por isso o diagrama
  nao tem coluna para a hospedagem: do ponto de vista do codigo do frontend, ela
  e invisivel, e essa invisibilidade e o objetivo.
- **Passo 2 e sem `Authorization` e sem `apikey`.** Por isso `app-config` tem
  `verify_jwt = false`: com o default, a plataforma responderia 401 antes do nosso
  codigo rodar, e o aplicativo nunca conseguiria arrancar. Nao ha `apikey` porque
  nao ha anon key no frontend, e ela nao autorizaria nada de qualquer forma.
- **Passo 7/8: o token e da Microsoft, nao do Supabase Auth.** O `verify_jwt` da
  plataforma nao sabe validar ID token do Azure AD, entao `carbon-api` tambem usa
  `verify_jwt = false` e a autenticacao acontece no nosso codigo, em
  `_shared/azureAuth.ts`. A ordem importa: **nada toca o banco antes de o token
  passar por todas as checagens.** O mesmo vale para
  `carbon-secure-share-upload`, que recebe o mesmo ID token e chama o mesmo
  `validarTokenAzure`.
- **Passo 8: o claim `tid` e conferido separadamente do `iss`.** Defesa em
  profundidade contra token de outro tenant assinado pela mesma Microsoft.
- **Passo 9: e o unico lugar em que a service_role key toca o banco com o usuario
  JA IDENTIFICADO**, dentro do runtime Deno. Nao e o unico lugar em que ela e
  usada: as tres Edge Functions importam `_shared/supabaseAdmin.ts`, e a
  `app-config` a usa sem usuario nenhum, para ler as linhas publicas antes de
  existir sessao (e o passo 3 deste mesmo diagrama). O que a chave nunca faz e
  chegar ao navegador: ela existe apenas como secret das Edge Functions.

### Deep link e cache do MSAL

Ainda no boot, antes de qualquer redirect, o destino original e guardado em
`sessionStorage('postLoginRedirect')` e restaurado depois do
`handleRedirectPromise()` com `history.replaceState` (nunca
`window.location.replace`, que dispara um GET de servidor e cai em 404 no
Amplify). O cache do MSAL usa `localStorage` com `storeAuthStateInCookie: true` e
`navigateToLoginRequestUrl: false`.

---

## Como adicionar uma configuracao nova

Nao precisa mexer em codigo de backend. A `app-config` devolve **todas** as linhas
com `publico = true`, mapeando `chave -> valor`.

### 1. Inserir a linha

```sql
insert into public.carbon_app_config (chave, valor, publico, descricao)
values (
  'relatorios',
  jsonb_build_object(
    'formatoPadrao', 'pdf',
    'periodicidade', 'mensal'
  ),
  true,
  'Preferencias padrao dos relatorios de sustentabilidade.'
)
on conflict (chave) do nothing;
```

### 2. Ler no frontend

O bloco aparece automaticamente na resposta de `app-config` e fica disponivel em
`getConfig()`:

```jsx
import { getConfig } from '@/lib/runtimeConfig';

const { relatorios } = getConfig();
// relatorios.formatoPadrao === 'pdf'
```

Se o bloco puder faltar (projeto ainda nao atualizado), acrescente o default
correspondente em `runtimeConfig.js`: o `carregarConfig()` faz merge da resposta
com os defaults locais, e o frontend nunca deve quebrar por config ausente.

### 3. Alterar um valor depois

```sql
update public.carbon_app_config
set valor = jsonb_set(valor, '{formatoPadrao}', to_jsonb('xlsx'::text), true)
where chave = 'relatorios';
```

A trigger `carbon_app_config_atualizado_em` atualiza `atualizado_em` sozinha. O
valor novo chega ao navegador em no maximo 60 segundos (`max-age=60`).

---

## Onde cada tipo de informacao deve ficar

| Tipo | Onde | Visivel ao navegador |
| --- | --- | --- |
| Endereco das Edge Functions | rewrite do Amplify em producao; `SUPABASE_FUNCTIONS_URL` no terminal em desenvolvimento | Nao: o navegador so ve `/api` |
| Config que o frontend precisa (Azure, textos, flags) | `carbon_app_config`, `publico = true` | Sim, via `app-config` |
| Config que so o backend precisa | `carbon_app_config`, `publico = false` | Nao |
| Segredo (chave de integracao, token de terceiro) | `npx.cmd supabase secrets set NOME=valor` | Nunca |
| service_role key | injetada pela plataforma na Edge Function | Nunca |
| Senha do banco | gerenciador de senhas da APSIS | Nunca |
| Qualquer coisa em `.env` do frontend | nao existe `.env` neste projeto | - |

Regra pratica para decidir: **se vazar essa informacao permite fazer algo que a
RLS deveria impedir, ela e segredo e nao entra em `carbon_app_config`.**

---

## Notas de LGPD

- `carbon_usuarios` guarda apenas **e-mail corporativo e dados funcionais** (nome
  de exibicao vindo do Azure AD, cargo, papel, status). E proibido adicionar CPF,
  RG, endereco residencial, telefone pessoal, dados bancarios, dados de saude ou
  biometria. O comentario da tabela na migration registra essa restricao.
- As Edge Functions **nao registram em log** o token nem o e-mail completo. Quando
  ha recusa por dominio, apenas o **dominio** e logado.
- O registro do colaborador e criado por upsert no primeiro login, sem coleta
  adicional de dados alem do que o Azure AD ja fornece.
- O campo `app.suporteEmail` aponta **obrigatoriamente** para um alias
  institucional de area (o seed usa `carbon@apsis.com.br`), nunca para o e-mail de
  uma pessoa identificada: a linha tem `publico = true` e sai no endpoint publico
  `app-config`, sem autenticacao, com CORS liberado e cache publico.
- `carbon_usuario_modulos` controla acesso a modulos (inner join obrigatorio na
  rota `carbon-api/modulos`). Se algum dia esse controle
  passar a produzir decisao automatizada que afete direitos de titular, sera
  necessario prever revisao humana (Art. 20 da LGPD).

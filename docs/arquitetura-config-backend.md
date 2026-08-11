# Arquitetura de configuracao do Apsis Carbon

Este documento registra a decisao arquitetural central do projeto e explica o
modelo de seguranca por tras dela.

---

## CARBON-001: toda a configuracao de runtime vive no backend

**Status:** aceita
**Data:** 2026-08-07
**Contexto:** entrega inicial do Apsis Carbon (telas de login e boas-vindas)

### Decisao

O frontend do Apsis Carbon conhece **exatamente duas** variaveis de ambiente:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Todo o resto da configuracao vive na tabela `carbon_app_config` do Supabase e e
lido no boot pela Edge Function publica `app-config`:

- `azure`: clientId, tenantId, redirectUri e escopos do MSAL
- `app`: nome, dominio corporativo permitido, e-mail de suporte, ambiente
- `login`: imagens do slideshow, logo, headline, subheadline, categorias, copyright
- `flags`: feature flags booleanas

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
4. **Reduz o risco de vazamento por copiar e colar.** Quanto menos variaveis no
   `.env`, menor a chance de alguem colar uma chave sensivel ali por analogia. O
   `.env` do Carbon tem duas linhas, e as duas sao publicas por definicao.

### Consequencias

- **Positiva:** o boot fica autoexplicativo e a configuracao e versionada como
  dado (com `atualizado_em` mantido por trigger).
- **Positiva:** adicionar configuracao nova nao mexe em codigo de backend: a
  `app-config` monta a resposta a partir de todas as linhas publicas.
- **Negativa:** o boot passa a depender de uma chamada de rede. Mitigacoes:
  `Cache-Control: public, max-age=60` no endpoint; merge com defaults locais no
  `runtimeConfig.js`; e uma `ConfigErrorScreen` dedicada, para que falha de config
  nunca vire tela branca.
- **Negativa:** duas Edge Functions a manter. Aceitavel: sao pequenas e compartilham
  os modulos de `_shared`.

---

## Por que a anon key e a URL podem ficar no frontend

Esta e a duvida que sempre aparece, e a resposta e direta: **a anon key e um
identificador publico, nao um segredo.**

- A `VITE_SUPABASE_URL` e o endereco da API do projeto. Ela aparece em toda
  requisicao que o navegador faz. Esconder nao e possivel.
- A `VITE_SUPABASE_ANON_KEY` (ou publishable key, no modelo novo) apenas diz "esta
  requisicao vem do papel `anon`". Ela nao concede permissao: **quem concede e a
  RLS.** Sem uma policy que permita, a anon key nao le nem escreve nada.
- Por isso o proprio Supabase chama a chave nova de *publishable*: o nome deixa
  explicito que ela e feita para ser publicada.

**A protecao real e a RLS declarada na migration**, e ela e restritiva por padrao:

| Tabela | RLS | Acesso via anon key |
| --- | --- | --- |
| `carbon_app_config` | ativa | `SELECT` somente onde `publico = true` |
| `carbon_modulos` | ativa, **zero policies** | nenhum |
| `carbon_notificacoes` | ativa, **zero policies** | nenhum |
| `carbon_usuarios` | ativa, **zero policies** | nenhum |
| `carbon_usuario_modulos` | ativa, **zero policies** | nenhum |

Com RLS ativa e nenhuma policy, toda leitura e escrita pelo papel `anon` e negada.
Alem disso, a migration faz `revoke all ... from anon, authenticated` nessas
tabelas: a RLS deixa de ser a unica linha de defesa. Se alguem, no futuro,
desabilitar a RLS por engano, o `revoke` continua bloqueando.

Ou seja: um atacante que copie a URL e a anon key do bundle nao consegue ler
modulos, notificacoes nem a lista de colaboradores. O maximo que ele obtem e a
mesma configuracao publica de login que a tela de login ja mostra a qualquer
visitante.

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
| Client no frontend | anon **e** `supabaseAdmin` (service key) | somente anon |
| service_role key | hardcoded no codigo | somente em variavel de ambiente da Edge Function |
| Fallback de chave em codigo | sim | nenhum: sem `VITE_SUPABASE_*` a aplicacao falha explicitamente |
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
    |    (conhece so URL + anon key)      |                          |
    |                                     |                          |
    | 2. GET /functions/v1/app-config     |                          |
    |    (sem Authorization)              |                          |
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
    | 7. GET /functions/v1/carbon-api/me  |                          |
    |    Authorization: Bearer <ID token> |                          |
    |    apikey: <anon key>               |                          |
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

- **Passo 2 e sem `Authorization`.** Por isso `app-config` tem
  `verify_jwt = false`: com o default, a plataforma responderia 401 antes do nosso
  codigo rodar, e o aplicativo nunca conseguiria arrancar.
- **Passo 7/8: o token e da Microsoft, nao do Supabase Auth.** O `verify_jwt` da
  plataforma nao sabe validar ID token do Azure AD, entao `carbon-api` tambem usa
  `verify_jwt = false` e a autenticacao acontece no nosso codigo, em
  `_shared/azureAuth.ts`. A ordem importa: **nada toca o banco antes de o token
  passar por todas as checagens.**
- **Passo 8: o claim `tid` e conferido separadamente do `iss`.** Defesa em
  profundidade contra token de outro tenant assinado pela mesma Microsoft.
- **Passo 9: e o unico lugar do sistema onde a service_role key e usada**, dentro do
  runtime Deno, com o usuario ja identificado.

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
| Endereco da API e anon key | `.env` do frontend | Sim, por design |
| Config que o frontend precisa (Azure, textos, flags) | `carbon_app_config`, `publico = true` | Sim, via `app-config` |
| Config que so o backend precisa | `carbon_app_config`, `publico = false` | Nao |
| Segredo (chave de integracao, token de terceiro) | `npx supabase secrets set NOME=valor` | Nunca |
| service_role key | injetada pela plataforma na Edge Function | Nunca |
| Senha do banco | gerenciador de senhas da APSIS | Nunca |

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

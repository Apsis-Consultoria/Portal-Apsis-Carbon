# Setup do backend Supabase - Apsis Carbon

Passo a passo literal para colocar o backend do Apsis Carbon no ar. Siga na ordem:
o passo 7 (Azure AD) depende do passo 1, e o passo 8 fecha o circuito.

Tempo estimado: 30 a 40 minutos, sendo a maior parte espera de provisionamento.

Pre-requisitos: Node.js instalado (para usar `npx supabase`), acesso de
administrador ao Azure AD da APSIS e uma conta no supabase.com.

---

## 1. Criar o projeto no Supabase

1. Acesse https://supabase.com e faca login.
2. Clique em **New project**.
3. Preencha:
   - **Name**: `apsis-carbon`
   - **Database Password**: gere uma senha forte e **guarde no gerenciador de
     senhas da APSIS**. Ela e pedida no `db push` do passo 4.
   - **Region**: `South America (São Paulo)` - menor latencia para o Brasil.
   - **Pricing Plan**: o que estiver contratado.
4. Clique em **Create new project** e aguarde o provisionamento (2 a 5 minutos).

> Nao coloque a senha do banco em arquivo do repositorio, nem em `.env`.
> Ela e usada apenas pela CLI, interativamente.

---

## 2. Copiar as credenciais publicas para o `.env`

1. No painel do projeto, va em **Settings > API**.
2. Copie os dois valores:
   - **Project URL** (algo como `https://abcdefghijklmno.supabase.co`)
   - **anon public** (ou **publishable key**, em projetos novos)
3. Na raiz do projeto (`Apsis Carbon`), crie o arquivo `.env`:

```bash
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=cole_aqui_a_anon_key
```

4. Confirme que `.env` esta no `.gitignore`.

**Estas sao as unicas duas variaveis de ambiente do frontend.** Elas sao publicas
por design: a anon key nao da acesso a nada que a RLS nao permita. Todo o resto da
configuracao (clientId e tenantId do Azure, dominio permitido, textos do login,
feature flags) fica na tabela `carbon_app_config` e chega ao navegador pela Edge
Function `app-config`.

> **NUNCA** copie a **service_role key** (ou **secret key**) para o `.env` do
> frontend. Ela ignora toda a RLS. No Apsis Carbon ela e usada somente dentro das
> Edge Functions, onde a plataforma a injeta automaticamente.

---

## 3. Anotar o Project Ref

Na URL do painel, `https://supabase.com/dashboard/project/<PROJECT_REF>`, o
`<PROJECT_REF>` e o identificador do projeto. Anote: e usado no passo 4 e nos
comandos de deploy.

---

## 4. Rodar a migration (criar as tabelas)

Escolha **uma** das duas opcoes.

### Opcao A - SQL Editor (mais simples, sem instalar nada)

1. No painel, va em **SQL Editor > New query**.
2. Abra o arquivo `supabase/migrations/20260807120000_init_apsis_carbon.sql`,
   selecione tudo e cole no editor.
3. Clique em **Run**.
4. Confira em **Table Editor** que as cinco tabelas existem:
   `carbon_app_config`, `carbon_modulos`, `carbon_notificacoes`,
   `carbon_usuarios`, `carbon_usuario_modulos`.
5. Em `carbon_app_config` devem existir exatamente 4 linhas:
   `azure`, `app`, `login`, `flags`.

### Opcao B - CLI (recomendada, mantem o historico de migrations)

Na raiz do projeto:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

O `link` pede a senha do banco do passo 1. O `db push` aplica a migration e
registra no historico (`supabase_migrations.schema_migrations`), o que evita
reaplicacao acidental.

> A migration e idempotente. Rodar duas vezes nao da erro e nao sobrescreve
> valores que voce ja tenha ajustado em `carbon_app_config`.

---

## 5. Publicar as Edge Functions

As duas funcoes precisam de `--no-verify-jwt`:

- **app-config**: e chamada no boot, antes de existir sessao, sem `Authorization`.
- **carbon-api**: recebe um ID token do **Azure AD**, que a plataforma do Supabase
  nao sabe validar. A validacao e feita no nosso codigo, contra o JWKS da
  Microsoft (`supabase/functions/_shared/azureAuth.ts`).

```bash
npx supabase functions deploy app-config --no-verify-jwt
npx supabase functions deploy carbon-api --no-verify-jwt
```

O arquivo `supabase/config.toml` ja declara `verify_jwt = false` para as duas, o
que mantem a configuracao versionada. A flag na linha de comando e redundancia
proposital: se alguem publicar de outra pasta, o comportamento continua correto.

Confira em **Edge Functions** no painel que as duas aparecem com status
**Active**.

Voce **nao** precisa criar secrets: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
sao injetadas automaticamente pela plataforma.

---

## 6. Verificar o endpoint `app-config`

```bash
curl -i "https://SEU_PROJETO.supabase.co/functions/v1/app-config"
```

**O que a resposta deve conter:**

- Status `HTTP/2 200`
- Cabecalho `cache-control: public, max-age=60`
- Cabecalho `access-control-allow-origin: *`
- Corpo JSON com exatamente as quatro chaves de topo:

```json
{
  "azure": {
    "clientId": "PREENCHER_CLIENT_ID_AZURE",
    "tenantId": "PREENCHER_TENANT_ID_AZURE",
    "redirectUri": null,
    "scopes": ["User.Read", "openid", "profile", "email"]
  },
  "app": {
    "nome": "Apsis Carbon",
    "dominioPermitido": "apsis.com.br",
    "suporteEmail": "carbon@apsis.com.br",
    "ambiente": "producao"
  },
  "login": {
    "imagens": ["/login/amazonia-1.jpg", "..."],
    "logo": "/login/logo-apsis-transp.png",
    "headline": "...",
    "subheadline": "...",
    "categorias": ["..."],
    "copyright": "© 2026 APSIS Consultoria. Todos os direitos reservados."
  },
  "flags": { "notificacoes": true, "modulosDinamicos": true }
}
```

Neste momento `clientId` e `tenantId` ainda estao com `PREENCHER_...`: isso e
esperado e sera corrigido no passo 8.

Para ler formatado:

```bash
curl -s "https://SEU_PROJETO.supabase.co/functions/v1/app-config" | npx --yes json
```

**Nao deve aparecer** nenhuma chave alem das que voce marcou com `publico = true`.
Se voce criar linhas internas no futuro (`publico = false`), confirme aqui que
elas nao vazam.

---

## 7. Registrar o aplicativo no Azure AD

1. Acesse https://portal.azure.com com uma conta com permissao no diretorio.
2. Va em **Microsoft Entra ID > App registrations > New registration**.
3. Preencha:
   - **Name**: `Apsis Carbon`
   - **Supported account types**: *Accounts in this organizational directory only
     (Single tenant)*
   - **Redirect URI**: escolha a plataforma **Single-page application (SPA)** e
     informe `http://localhost:5175`
4. Clique em **Register**.
5. Na tela **Overview**, copie e guarde:
   - **Application (client) ID** -> vira o `clientId`
   - **Directory (tenant) ID** -> vira o `tenantId`
6. Va em **Authentication** e adicione as demais **Redirect URIs** da plataforma
   SPA:
   - `http://localhost:5175` (dev; a porta 5175 e do Carbon, o Portal usa 5174)
   - a URL de producao do Apsis Carbon, por exemplo
     `https://carbon.apsis.com.br`
   - se houver ambiente de preview, a URL dele tambem
   Nao habilite **Implicit grant** (nem access token nem ID token): o fluxo usado
   e Authorization Code com PKCE, que o MSAL faz sozinho.
7. Va em **API permissions** e confirme que existe apenas
   **Microsoft Graph > User.Read** (delegated). Nao adicione
   `Files.ReadWrite.All` nem `Sites.ReadWrite.All`: o Apsis Carbon so faz login e
   leitura de perfil, e esses escopos exigem consentimento de administrador e
   ampliam o risco.
8. Clique em **Grant admin consent for APSIS** se o botao estiver disponivel.

> Cada URL nova de frontend (producao, preview, dominio proprio) precisa ser
> adicionada aqui, senao o login falha com `AADSTS50011: redirect URI mismatch`.

---

## 8. Preencher `clientId` e `tenantId` em `carbon_app_config`

No painel do Supabase, **SQL Editor > New query**. Cole o comando abaixo,
substituindo os dois valores pelos que voce copiou no passo 7.5, e clique em
**Run**:

```sql
update public.carbon_app_config
set valor = jsonb_set(
              jsonb_set(
                valor,
                '{clientId}',
                to_jsonb('COLE_AQUI_O_APPLICATION_CLIENT_ID'::text),
                true
              ),
              '{tenantId}',
              to_jsonb('COLE_AQUI_O_DIRECTORY_TENANT_ID'::text),
              true
            )
where chave = 'azure';
```

Confira o resultado:

```sql
select chave, valor, publico, atualizado_em
from public.carbon_app_config
where chave = 'azure';
```

O campo `atualizado_em` deve ter mudado para agora (a trigger
`carbon_app_config_atualizado_em` faz isso automaticamente) e `valor` deve mostrar
os GUIDs reais, sem nenhum `PREENCHER_`.

Repita o `curl` do passo 6: o `app-config` responde em no maximo 60 segundos com
os valores novos (o cache e `max-age=60`).

---

## 9. Ajustes opcionais

**Trocar o e-mail de suporte.** O seed ja usa o alias institucional
`carbon@apsis.com.br`. Se precisar apontar para outra caixa, use outro **alias de
area**: esta linha tem `publico = true` e sai no endpoint publico `app-config`,
portanto nunca deve conter e-mail de pessoa identificada (LGPD).

```sql
update public.carbon_app_config
set valor = jsonb_set(valor, '{suporteEmail}', to_jsonb('outro-alias@apsis.com.br'::text), true)
where chave = 'app';
```

**Editar os textos da tela de login** sem tocar em codigo:

```sql
update public.carbon_app_config
set valor = jsonb_set(valor, '{headline}', to_jsonb('Novo texto da headline'::text), true)
where chave = 'login';
```

**Desligar uma feature flag:**

```sql
update public.carbon_app_config
set valor = jsonb_set(valor, '{notificacoes}', 'false'::jsonb, true)
where chave = 'flags';
```

**Criar a primeira notificacao de teste** (aparece na tela de boas-vindas para
todos, porque `email_destino` fica nulo):

```sql
insert into public.carbon_notificacoes (tipo, titulo, descricao)
values ('info', 'Bem-vindo ao Apsis Carbon', 'O ambiente foi configurado com sucesso.');
```

**Promover um colaborador a admin** (depois do primeiro login dele, que cria a
linha automaticamente):

```sql
update public.carbon_usuarios
set papel = 'admin'
where lower(email) = 'endereco.corporativo@apsis.com.br';
```

**Desativar um colaborador** (offboarding, sem apagar historico). Corta o acesso
imediatamente: a Edge Function passa a responder `403 usuario_inativo` em todas as
rotas e o frontend mostra a tela "Acesso suspenso".

```sql
update public.carbon_usuarios
set ativo = false
where lower(email) = 'endereco.corporativo@apsis.com.br';
```

`carbon_modulos` fica **vazia de proposito** nesta entrega. Enquanto nao houver
linhas, a sidebar mostra apenas "Boas-Vindas" e a tela de boas-vindas mostra o
estado vazio dizendo que os modulos serao liberados em breve.

**Liberar um modulo para um colaborador.** Cadastrar o modulo em `carbon_modulos`
**nao basta**: a rota `carbon-api/modulos` faz inner join com
`carbon_usuario_modulos`, portanto o modulo so aparece para quem tiver a linha de
liberacao - inclusive para quem tem `papel = 'admin'`.

```sql
insert into public.carbon_usuario_modulos (usuario_id, modulo_id)
select u.id, m.id
from public.carbon_usuarios u, public.carbon_modulos m
where lower(u.email) = 'endereco.corporativo@apsis.com.br'
  and m.chave = 'chave-do-modulo'
on conflict do nothing;
```

Observacao sobre `url_externa`: a coluna tem `CHECK` de esquema `http`/`https`, e
`rota` precisa comecar com uma unica barra. Isso barra na entrada valores como
`javascript:...`, que o navegador executaria no clique.

---

## 10. Verificar o `carbon-api`

Este endpoint exige um ID token real do Azure AD, portanto o teste util e pelo
navegador, depois do login. O que se pode verificar por `curl` e o comportamento
de recusa:

```bash
# Sem token: deve responder 401 {"erro":"nao_autenticado"}
curl -i "https://SEU_PROJETO.supabase.co/functions/v1/carbon-api/me" \
  -H "apikey: SUA_ANON_KEY"

# Rota inexistente: deve responder 404 {"erro":"rota_desconhecida"}
curl -i "https://SEU_PROJETO.supabase.co/functions/v1/carbon-api/nada" \
  -H "apikey: SUA_ANON_KEY"
```

Com o frontend rodando (`npm run dev`, porta 5175) e o login feito, o
`carbon-api/me` deve responder:

```json
{ "email": "seu.email@apsis.com.br", "nome": "Seu Nome", "papel": "colaborador", "ativo": true }
```

e a linha correspondente deve aparecer em `carbon_usuarios` (criada pelo upsert do
primeiro login).

---

## Troubleshooting

### 1. `401 {"code":401,"message":"Invalid JWT"}` no `app-config`

A funcao foi publicada **sem** `--no-verify-jwt`, entao a plataforma barra a
requisicao antes do nosso codigo rodar. Note que a mensagem vem da plataforma, nao
da nossa funcao (a nossa sempre responde `{"erro": "..."}`).

Solucao: republicar.

```bash
npx supabase functions deploy app-config --no-verify-jwt
```

Confirme tambem que `supabase/config.toml` tem o bloco `[functions.app-config]`
com `verify_jwt = false`.

### 2. `500 {"erro":"config_indisponivel"}` no `app-config`

A funcao rodou mas nao conseguiu ler a tabela. Causas, em ordem de probabilidade:

- a migration do passo 4 nao foi aplicada (a tabela `carbon_app_config` nao
  existe). Confira em **Table Editor**;
- a migration foi aplicada em outro projeto que nao o que voce esta chamando
  (confira o `SEU_PROJETO` da URL contra o Project Ref do passo 3);
- a funcao foi publicada em outro projeto, e por isso recebeu a
  `SUPABASE_SERVICE_ROLE_KEY` de outro banco.

Para ver a causa exata: painel > **Edge Functions > app-config > Logs**. A funcao
loga `Falha ao ler carbon_app_config: <motivo>`.

### 3. `401 {"erro":"nao_autenticado"}` no `carbon-api` mesmo estando logado

O token chegou mas foi recusado na validacao. Verifique, nesta ordem:

- **`clientId` ou `tenantId` ainda com `PREENCHER_`**: neste caso a resposta e
  `500 {"erro":"config_incompleta"}`, e nao 401. Volte ao passo 8;
- **`clientId` diferente** do Application ID do app que gerou o token: o `aud` do
  token nao casa. Comum quando existem dois registros no Azure (um antigo de
  teste). Compare o valor em `carbon_app_config` com o do **Overview** do app
  correto;
- **`tenantId` diferente**: o `iss` e o claim `tid` nao casam;
- **token expirado**: o ID token do Azure vale cerca de 1 hora. Recarregue a
  pagina para o MSAL renovar;
- **o frontend esta mandando o access token em vez do ID token**: o `carbon-api`
  valida o **ID token** (`aud` = clientId). Access token do Graph tem
  `aud` = `https://graph.microsoft.com` e sera recusado.

Os logs da funcao mostram o motivo tecnico da recusa sem expor o token nem o
e-mail (por LGPD, apenas o dominio e registrado).

### 4. `403 {"erro":"dominio_nao_permitido"}`

O token e valido, mas o dominio do e-mail nao e o permitido. Causas:

- login feito com conta pessoal Microsoft ou de outro tenant convidado;
- `app.dominioPermitido` gravado com valor errado (com `@`, com espaco, ou em
  maiusculas). O valor correto e apenas o dominio, minusculo:

```sql
update public.carbon_app_config
set valor = jsonb_set(valor, '{dominioPermitido}', to_jsonb('apsis.com.br'::text), true)
where chave = 'app';
```

- o usuario e legitimo mas seu `preferred_username` no diretorio usa outro dominio
  (por exemplo `apsis.onmicrosoft.com`). Nesse caso ajuste
  `dominioPermitido` para o dominio realmente presente no token.

### 4b. `403 {"erro":"usuario_inativo"}`

O token e valido e o dominio esta certo, mas `carbon_usuarios.ativo` esta `false`
para essa conta. Todas as rotas do `carbon-api` sao bloqueadas e o frontend mostra
a tela "Acesso suspenso". Para reativar:

```sql
update public.carbon_usuarios
set ativo = true
where lower(email) = 'endereco.corporativo@apsis.com.br';
```

### 4c. Modulo cadastrado mas nao aparece na sidebar nem nos cards

Quase sempre falta a **liberacao**: `carbon-api/modulos` faz inner join com
`carbon_usuario_modulos`, entao um modulo com `ativo = true` so aparece para quem
tem a linha de liberacao (inclusive `papel = 'admin'`). Confira tambem se
`ativo` esta `true`. O `INSERT` de liberacao esta no passo 9.

### 5. Erro de CORS no console do navegador

Se o navegador reclama de CORS ao chamar `app-config`, o problema real quase nunca
e o CORS: e a funcao ter quebrado antes de responder (a resposta de erro da
plataforma nao carrega os nossos cabecalhos). Va direto aos **Logs** da funcao.
Se a funcao esta respondendo `200` no `curl` mas falha no navegador, confirme que
a URL no `.env` nao tem barra no final e nao aponta para outro projeto.

### 6. `AADSTS50011: The redirect URI specified in the request does not match`

A URL de onde voce esta acessando nao esta cadastrada no Azure AD. Volte ao passo
7.6 e adicione a URL exata (protocolo, host e porta), na plataforma
**Single-page application**. Em dev tem de ser `http://localhost:5175`.

---

## Resumo do que fica onde

| Informacao | Onde vive | Chega ao navegador? |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | `.env` do frontend | Sim, por design |
| clientId e tenantId do Azure, dominio, textos do login, flags | `carbon_app_config` com `publico = true` | Sim, via `app-config` |
| Configuracao interna de backend | `carbon_app_config` com `publico = false` | Nao |
| service_role key, chaves de integracao | Secrets das Edge Functions | Nunca |
| Senha do banco | Gerenciador de senhas da APSIS | Nunca |

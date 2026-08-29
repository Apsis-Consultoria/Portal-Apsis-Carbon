# Setup do backend Supabase - Apsis Carbon

Passo a passo literal para colocar o backend do Apsis Carbon no ar. Siga na ordem:
o passo 7 (Azure AD) depende do passo 1, e o passo 8 fecha o circuito.

Tempo estimado: 30 a 40 minutos, sendo a maior parte espera de provisionamento.

Pre-requisitos: Node.js instalado (para usar `npx.cmd supabase`), acesso de
administrador ao Azure AD da APSIS e uma conta no supabase.com.

Todos os comandos deste documento estao escritos para o **PowerShell 5.1**, que e
o que vem no Windows da APSIS. Por isso: nada de `&&` (o 5.1 nao aceita), sempre
`npm.cmd` / `npx.cmd` (os `.ps1` estao bloqueados pela execution policy) e sempre
`curl.exe` com extensao (`curl` seco e alias de `Invoke-WebRequest` e nao imprime
o corpo da resposta).

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

> Nao coloque a senha do banco em arquivo do repositorio. E nao adianta procurar
> um `.env` para guarda-la: este projeto nao tem nenhum (ver passo 2). A senha e
> usada apenas pela CLI, interativamente.

---

## 2. Anotar o project ref (nao existe `.env`)

**O frontend nao tem variavel de ambiente nenhuma.** Nao crie `.env`. Nao ha URL
de Supabase nem anon key no bundle: todas as chamadas vao para o caminho relativo
`/api/<funcao>` e quem traduz isso para as Edge Functions e a hospedagem, por
rewrite (ver `src/lib/endpoint.js`).

1. No painel do projeto, va em **Settings > General** e copie o **Reference ID**.
   E o `<REF>` de `https://<REF>.supabase.co`, e voce vai precisar dele nos
   comandos da CLI mais abaixo.
2. Guarde-o fora do repositorio. Ele nao entra em nenhum arquivo versionado, pelo
   mesmo motivo da regra 4 do CLAUDE.md.

Nao existe mais `src/lib/supabaseClient.js` (era ele que exportava a URL e a anon
key para o bundle), nao existe `.env.example`, e o pacote `@supabase/supabase-js`
saiu do `package.json`. No lugar entrou `src/lib/endpoint.js`, que so sabe montar
`caminhoFuncao('carbon-api')` -> `/api/carbon-api`.

A **anon key nao e usada em lugar nenhum** deste projeto, e **nenhuma chamada leva
o cabecalho `apikey`**. As Edge Functions sao publicadas com `--no-verify-jwt`:
quem autoriza a `carbon-api` e o ID token do Azure AD, validado contra o JWKS da
Microsoft dentro da propria funcao. A anon key nunca participou de autorizacao
nenhuma aqui, entao remove-la nao afrouxou nada.

**Por que tanto empenho em esconder um endereco que nao e secreto.** Com a URL do
projeto dentro do bundle, qualquer visitante da tela de login abre o DevTools,
descobre `https://<REF>.supabase.co` e passa a bater direto nas Edge Functions,
fora do nosso dominio: sem log da hospedagem, sem WAF e sem limite de taxa. Com o
rewrite, a unica porta publica e o nosso dominio.

Em **producao** (AWS Amplify), a traducao e uma regra no console:
origem `/api/<*>`, destino `https://<REF>.supabase.co/functions/v1/<*>`,
tipo **200 (rewrite)**.

Em **desenvolvimento**, o proxy do Vite (`server.proxy` no `vite.config.js`) faz o
mesmo papel. No PowerShell 5.1, as duas linhas no MESMO terminal, uma de cada vez:

```
$env:SUPABASE_API_URL = "https://<REF>.supabase.co"
```

```
npm.cmd run dev
```

O sufixo `/functions/v1` e **obrigatorio**: o rewrite so remove o prefixo `/api`,
ele nao acrescenta nada. A variavel morre junto com a janela do terminal, o que e
proposital.

Ela nao tem prefixo `VITE_` de proposito: sem o prefixo o Vite se **recusa** a
expo-la ao navegador. Ela e lida pelo `vite.config.js`, que roda no processo do
Node, entao e impossivel ela entrar no bundle mesmo por engano. Pelo mesmo motivo
a antiga `VITE_EXPOR_REDE` virou `EXPOR_REDE` (usada so para expor o dev server na
rede local, quando se precisa testar no celular): o prefixo `VITE_` ensinava o
padrao errado a quem lesse o arquivo.

**Sem a variavel, o proxy nem e registrado.** A primeira chamada, `/api/app-config`,
responde 404, e em desenvolvimento a aplicacao degrada para a demonstracao com um
aviso ambar na tela de login. Isso e um 404 claro de proposito, e melhor do que um
destino default errado que so falharia na hora do login.

**Consequencia pratica, que mudou:** rodar `npm.cmd run dev` com
`SUPABASE_API_URL` definida da **login real em localhost**. Antes o modo
demonstracao era um beco sem saida em desenvolvimento; hoje ele e escolha por
clique (ver passo 9), nao um modo em que o dev fica preso.

> **NUNCA** leve a **service_role key** (ou **secret key**) para o frontend. Nem
> ha onde: nao existe arquivo de ambiente neste projeto. Ela ignora toda a RLS. No
> Apsis Carbon ela e usada somente dentro das Edge Functions, onde a plataforma a
> injeta automaticamente.

---

## 3. Como o project ref aparece neste documento

O mesmo identificador do passo 2 tambem aparece na URL do painel,
`https://supabase.com/dashboard/project/<REF>`. Use essa URL para conferir que
voce esta no projeto certo antes de rodar qualquer comando: aplicar a migration em
um projeto e publicar as funcoes em outro e o erro mais chato de diagnosticar
(ver Troubleshooting 2).

Em todos os comandos e URLs daqui para baixo o identificador aparece como `<REF>`.
Troque pelo valor real **na hora de executar** e nao salve o valor real em arquivo
versionado. Nao e paranoia de conformidade: e o mesmo motivo do passo 2. Se o
endereco do projeto nao existe em lugar nenhum que o navegador ou o repositorio
alcancem, nao ha por onde bater nas Edge Functions sem passar pelo nosso dominio.

---

## 4. Rodar a migration (criar as tabelas)

Escolha **uma** das duas opcoes.

### Opcao A - SQL Editor (mais simples, sem instalar nada)

1. No painel, va em **SQL Editor > New query**.
2. Abra o arquivo `supabase/migrations/20260807120000_init_apsis_carbon.sql`,
   selecione tudo e cole no editor.
3. Clique em **Run**.
4. Confira em **Table Editor** que as cinco tabelas do nucleo existem:
   `carbon_app_config`, `carbon_modulos`, `carbon_notificacoes`,
   `carbon_usuarios`, `carbon_usuario_modulos`.
5. Em `carbon_app_config` devem existir exatamente 4 linhas:
   `azure`, `app`, `login`, `flags`.

> Atencao: a pasta `supabase/migrations/` tem mais arquivos alem do `init`
> (projetos, documentos, monitoramento, secure share e outros). A Opcao A aplica
> **so** o que voce colar. Para o banco completo, prefira a Opcao B.

### Opcao B - CLI (recomendada, mantem o historico de migrations)

Na raiz do projeto, no PowerShell, um comando por vez:

```
npx.cmd supabase login
```

```
npx.cmd supabase link --project-ref <REF>
```

```
npx.cmd supabase db push
```

O `link` pede a senha do banco do passo 1. O `db push` aplica **todas** as
migrations pendentes, na ordem, e registra cada uma no historico
(`supabase_migrations.schema_migrations`), o que evita reaplicacao acidental.

> A migration e idempotente. Rodar duas vezes nao da erro e nao sobrescreve
> valores que voce ja tenha ajustado em `carbon_app_config`.

---

## 5. Publicar as Edge Functions

As **tres** funcoes precisam de `--no-verify-jwt`:

- **app-config**: e chamada no boot, antes de existir sessao, sem `Authorization`.
- **carbon-api**: recebe um ID token do **Azure AD**, que a plataforma do Supabase
  nao sabe validar. A validacao e feita no nosso codigo, contra o JWKS da
  Microsoft (`supabase/functions/_shared/azureAuth.ts`).
- **carbon-secure-share-upload**: mesmo ID token do Azure AD, mesma validacao.
  Existe em funcao separada porque o roteador da carbon-api le todo corpo nao-GET
  como JSON, e arquivo e binario.

No PowerShell, uma linha por vez (o `&&` nao funciona no 5.1, e `npx` seco resolve
para `npx.ps1`, bloqueado pela execution policy):

```
npx.cmd supabase functions deploy app-config --project-ref <REF> --no-verify-jwt
```

```
npx.cmd supabase functions deploy carbon-api --project-ref <REF> --no-verify-jwt
```

```
npx.cmd supabase functions deploy carbon-secure-share-upload --project-ref <REF> --no-verify-jwt
```

Nunca rode `functions deploy` **sem o slug**: sem ele a CLI publica tudo o que
estiver na pasta.

O arquivo `supabase/config.toml` ja declara `verify_jwt = false` nos tres blocos
(`[functions.app-config]`, `[functions.carbon-api]` e
`[functions.carbon-secure-share-upload]`), o que mantem a configuracao versionada.
A flag na linha de comando e redundancia proposital: se alguem publicar de outra
pasta, sem o `config.toml` por perto, o comportamento continua correto.

Confira em **Edge Functions** no painel que as **tres** aparecem com status
**Active**.

Voce **nao** precisa criar secrets: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
sao injetadas automaticamente pela plataforma.

---

## 6. Verificar o endpoint `app-config`

No PowerShell use `curl.exe`, com extensao: `curl` seco e alias de
`Invoke-WebRequest` e nao imprime o corpo.

Aqui a URL e a do Supabase, direta, e nao `/api/app-config`: o `/api` so existe
depois que a hospedagem (ou o proxy do Vite) esta no ar. Neste passo o que se quer
testar e a funcao em si, antes de qualquer frontend.

```
curl.exe -i -H "Accept: application/json" "https://<REF>.supabase.co/functions/v1/app-config"
```

Sem cabecalho `apikey` e sem `Authorization`, de proposito: a funcao e publica
(`verify_jwt = false`). Se ela so responder com uma chave, algo esta errado no
deploy, nao na sua chamada.

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
    "logo": "/login/logo-apsis-carbon.png",
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

Para ler formatado, sem instalar nada, usando o proprio PowerShell (o `-Depth` e
necessario: o default de `ConvertTo-Json` e 2 e ele trunca o objeto `azure`):

```
curl.exe -s "https://<REF>.supabase.co/functions/v1/app-config" | ConvertFrom-Json | ConvertTo-Json -Depth 10
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

> **Leia isto antes de digitar qualquer coisa.** A tabela `carbon_app_config` tem
> **uma unica linha** `chave = 'azure'`, e o `clientId` e o `tenantId` sao campos
> **dentro do jsonb da coluna `valor`** dessa linha. **Nao existem** linhas
> `azure_client_id` nem `azure_tenant_id`. Se algum texto antigo, mensagem de erro
> ou colega mandar voce criar essas chaves, esta errado: o `mesclarConfig` do
> `src/lib/runtimeConfig.js` so olha a linha `azure`, e as linhas novas ficariam
> ali sem nunca ter efeito nenhum, com o login continuando quebrado.

No painel do Supabase, **SQL Editor > New query**. Cole o comando abaixo,
substituindo os dois valores pelos que voce copiou no passo 7.5, e clique em
**Run**. O `jsonb_set` aninhado edita os dois campos dentro do `valor` sem
reescrever o resto do objeto (`redirectUri` e `scopes` ficam como estao):

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

O prefixo `PREENCHER` nao e decorativo: `src/lib/runtimeConfig.js` e
`supabase/functions/_shared/azureAuth.ts` recusam explicitamente qualquer valor que
comece com ele. Sem esse teste, o MSAL montaria a authority
`https://login.microsoftonline.com/PREENCHER_TENANT_ID_AZURE` e o login morreria
numa pagina de erro da Microsoft (`AADSTS90002`), longe daqui e sem pista nenhuma.

Repita o `curl.exe` do passo 6: o `app-config` responde em no maximo 60 segundos
com os valores novos (o cache e `max-age=60`).

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

**Revisar as telas sem backend nenhum (modo demonstracao).** Nao e ajuste de
banco, e nao e mais variavel de ambiente: a antiga `VITE_CARBON_DEMO` foi removida.
Hoje sao duas coisas em `src/lib/runtimeConfig.js`:

| O que | O que e | Como liga |
| --- | --- | --- |
| `MODO_DEMO` | Constante de **build**, igual a `import.meta.env.DEV` | Automatico: `true` em `vite dev`, `false` em `vite build` |
| `MODO_DEMO_ATIVO()` | Funcao, le a chave `carbonModoDemoAtivo` do `sessionStorage` | Botao "Entrar em modo demonstracao" na tela de login |

Na pratica: suba o dev server, abra `http://localhost:5175` e clique no botao. As
telas de negocio se abrem com dados ficticios, sem tocar em rede nem em dado real,
e o estado morre ao fechar a aba (`sessionStorage`, nao `localStorage`).

O padrao no codigo e **sempre** `if (MODO_DEMO && MODO_DEMO_ATIVO())`, com a
constante na frente. Sem ela na frente, o Rollup nao consegue dobrar a condicao
para `false` no build de producao, os ramos sobrevivem ao tree-shaking e os
datasets ficticios inteiros viajam no bundle publico. Isso ja aconteceu de verdade
e foi medido. Pelo mesmo motivo, nunca envolva `MODO_DEMO` em `Boolean()`.

---

## 10. Verificar o `carbon-api`

Este endpoint exige um ID token real do Azure AD, portanto o teste util e pelo
navegador, depois do login. O que se pode verificar por linha de comando e o
comportamento de recusa. Um comando por vez, no PowerShell:

```
curl.exe -i "https://<REF>.supabase.co/functions/v1/carbon-api/me"
```

Deve responder `401 {"erro":"nao_autenticado"}`.

```
curl.exe -i "https://<REF>.supabase.co/functions/v1/carbon-api/nada"
```

Deve responder `404 {"erro":"rota_desconhecida"}`.

Nenhum dos dois leva cabecalho `apikey`, e isso importa: se a resposta vier como
`401 {"code":401,"message":"Invalid JWT"}`, quem recusou foi a **plataforma**, nao
o nosso codigo, e a funcao foi publicada sem `--no-verify-jwt` (Troubleshooting 1).
Mandar uma anon key aqui so mascararia esse erro de deploy, que e exatamente o que
voce quer enxergar.

Com o frontend rodando (dev server na porta 5175, ver passo 2) e o login feito, o
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

```
npx.cmd supabase functions deploy app-config --project-ref <REF> --no-verify-jwt
```

Confirme tambem que `supabase/config.toml` tem o bloco `[functions.app-config]`
com `verify_jwt = false`. O mesmo vale, com o slug trocado, para a `carbon-api` e
a `carbon-secure-share-upload`.

### 2. `500 {"erro":"config_indisponivel"}` no `app-config`

A funcao rodou mas nao conseguiu ler a tabela. Causas, em ordem de probabilidade:

- a migration do passo 4 nao foi aplicada (a tabela `carbon_app_config` nao
  existe). Confira em **Table Editor**;
- a migration foi aplicada em outro projeto que nao o que voce esta chamando
  (confira o `<REF>` da URL que voce chamou contra o Reference ID do passo 2);
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

Vale lembrar que, com a arquitetura `/api`, o navegador enxerga tudo como
**mesma origem**: ele chama `/api/app-config` no proprio dominio do frontend e
quem sai para o Supabase e o servidor (rewrite do Amplify ou proxy do Vite). Ou
seja, se apareceu erro de CORS de verdade, e sinal de que alguma chamada voltou a
usar URL absoluta em vez de `caminhoFuncao()` de `src/lib/endpoint.js`. Procure a
URL absoluta e remova.

Se a funcao responde `200` no `curl.exe` mas falha no navegador, confira o destino
do rewrite. Os dois lados usam formatos DIFERENTES de proposito:

| Onde | Valor | Por que |
|---|---|---|
| Regra do Amplify (producao) | `https://<REF>.supabase.co/functions/v1/<*>` | e uma regra de console: nao ha codigo para acrescentar o caminho |
| `SUPABASE_API_URL` (dev) | `https://<REF>.supabase.co` | o `/functions/v1` esta em `CAMINHO_FUNCOES`, no `vite.config.js` |

A variavel carrega **so o endereco do projeto** desde 28/08/2026. Se voce tiver
uma anotacao antiga terminando em `/functions/v1`, o `vite.config.js` corta o
sufixo e AVISA no terminal - sem isso o caminho ficaria duplicado
(`.../functions/v1/functions/v1/carbon-api`) e toda chamada de `/api` daria 404
sem nada apontar para a variavel. Barra sobrando no fim tambem e removida.

### 6. `AADSTS50011: The redirect URI specified in the request does not match`

A URL de onde voce esta acessando nao esta cadastrada no Azure AD. Volte ao passo
7.6 e adicione a URL exata (protocolo, host e porta), na plataforma
**Single-page application**. Em dev tem de ser `http://localhost:5175`.

### 7. Em dev, aviso ambar no login e `404` em `/api/app-config`

Mensagem na tela: "A configuração não veio do backend. Suba o dev server com
SUPABASE_API_URL definida para habilitar o login real." No console aparece
`[config] a configuracao remota falhou; caindo na demonstracao`.

O dev server subiu **sem** `SUPABASE_API_URL`, entao o `vite.config.js` nem
registrou o proxy de `/api` e a chamada bateu no proprio Vite, que devolveu 404.
Nao ha o que consertar no banco nem no Azure. Causas, em ordem:

- a variavel nao foi definida. Ela vale so para a janela de terminal em que voce a
  definiu: abrir um terminal novo exige defini-la de novo;
- ela foi definida em **outro** terminal, e nao no que rodou `npm.cmd run dev`;
- **falta o sufixo `/functions/v1`**. Este e o erro mais comum. O rewrite so remove
  o prefixo `/api`, ele nao acrescenta caminho nenhum, entao
  `https://<REF>.supabase.co` sozinho manda a chamada para a raiz do projeto;
- o dev server ja estava de pe desde antes. Mudanca em `vite.config.js` ou em
  variavel de ambiente exige derrubar (`Ctrl+C`) e subir de novo.

Para conferir o que o processo esta vendo, no mesmo terminal:

```
echo $env:SUPABASE_API_URL
```

Enquanto isso nao estiver resolvido, o botao de login da Microsoft fica
desabilitado e so o modo demonstracao funciona. Isso e proposital: sem config real
nao existe login real, e fingir que existe seria pior.

### 8. `ConfigErrorScreen`: "A configuracao do Azure AD esta incompleta"

A mensagem completa diz qual campo falta (`clientId`, `tenantId` ou os dois) e
aponta para este documento. Significa que o `app-config` respondeu, mas a linha
`azure` ainda esta com os placeholders `PREENCHER_` do seed, ou com valor vazio.

Va ao **passo 8** e leia a caixa de atencao antes de executar: o que se edita e o
jsonb da coluna `valor` na linha `chave = 'azure'`, e nao linhas separadas
`azure_client_id` / `azure_tenant_id`, que nao existem nesta tabela.

Em producao esta tela e o comportamento correto: falha de configuracao vira tela de
erro explicita, nunca tela branca e nunca degradacao silenciosa para dados
ficticios.

---

## Resumo do que fica onde

| Informacao | Onde vive | Chega ao navegador? |
| --- | --- | --- |
| Endereco das Edge Functions | Rewrite de `/api` na hospedagem (e `SUPABASE_API_URL` no `vite.config.js`, em dev) | Nao. O bundle so conhece `/api` |
| clientId e tenantId do Azure, dominio, textos do login, flags | `carbon_app_config` com `publico = true` | Sim, via `app-config` |
| Configuracao interna de backend | `carbon_app_config` com `publico = false` | Nao |
| service_role key, chaves de integracao | Secrets das Edge Functions | Nunca |
| Senha do banco | Gerenciador de senhas da APSIS | Nunca |
| Anon key | Em lugar nenhum. Nao e usada neste projeto | Nunca |
| Modo demonstracao | `MODO_DEMO` (constante de build) + `carbonModoDemoAtivo` no `sessionStorage` | Existe so em build de dev |
| Exposicao do dev server na rede | `EXPOR_REDE`, lida pelo `vite.config.js` no Node | Nao |

E o que **nao** existe mais, para ninguem procurar: `.env`, `.env.example`,
`src/lib/supabaseClient.js`, `@supabase/supabase-js`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_CARBON_DEMO` e `VITE_EXPOR_REDE`. Nenhuma variavel
de ambiente do frontend sobreviveu, e essa e a ideia.

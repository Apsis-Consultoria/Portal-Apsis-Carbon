# Contrato de execucao local e de API - Apsis Carbon

Documento de coordenacao entre backend e frontend para a subida local do sistema.
Nao substitui `docs/arquitetura-config-backend.md` (decisao CARBON-001), que
continua sendo a fonte de verdade da arquitetura de configuracao.

---

## 1. Topologia real do projeto

O Apsis Carbon **nao tem servidor de aplicacao proprio**. A stack e:

| Camada | Tecnologia | Onde roda |
| --- | --- | --- |
| Frontend | React 18 + Vite 6 (SPA) | dev server local |
| Hospedagem | rewrite de `/api` (regra do Amplify em producao, `server.proxy` do Vite em local) | nuvem e maquina local |
| Backend | Supabase (Postgres + Edge Functions Deno) | nuvem, projeto Supabase |
| Autenticacao | Azure AD (Entra ID) via MSAL browser | nuvem |

Portanto "subir o backend em local" significa **subir o dev server do Vite**, que
serve a SPA. As APIs consumidas sao remotas (Edge Functions do Supabase).

A hospedagem aparece na tabela de proposito, e nao e detalhe de infraestrutura: e
ela, e so ela, que conhece o endereco do projeto Supabase. O frontend conhece
apenas o caminho relativo `/api/<funcao>`. Ver secoes 3 e 4.

---

## 2. Contrato de subida local (o que o frontend pode assumir)

| Item | Valor |
| --- | --- |
| Comando | `npm.cmd run dev`, com `SUPABASE_FUNCTIONS_URL` no mesmo terminal (ver abaixo) |
| URL base | `http://localhost:5175` |
| Porta | **5175, fixa** (`strictPort: true` no `vite.config.js`) |
| Bind | loopback apenas. Verificado nesta maquina: escuta em `::1` (IPv6). Use `http://localhost:5175`; `http://127.0.0.1:5175` **nao** conecta |
| Rota raiz | `/` devolve `index.html` (HTTP 200) |
| Alias de import | `@` -> `./src` |

A porta 5175 e contratual: o Portal Apsis ocupa a 5174 e o `redirectUri` do MSAL
e derivado de `window.location.origin`. Subir em outra porta quebra o login com
`AADSTS50011`. Com `strictPort: true`, se a 5175 estiver ocupada o Vite falha na
hora em vez de migrar de porta silenciosamente.

### Como subir, em PowerShell 5.1

Duas linhas, no MESMO terminal. `npm.cmd` e nao `npm` porque o `npm.ps1` esta
bloqueado pela execution policy da maquina; e duas linhas em vez de uma porque o
PowerShell 5.1 nao aceita `&&`:

```powershell
$env:SUPABASE_FUNCTIONS_URL = "https://SEU-PROJETO.supabase.co/functions/v1"
npm.cmd run dev
```

O sufixo `/functions/v1` e **obrigatorio**. O proxy so REMOVE o prefixo `/api` do
caminho, nao acrescenta nada: `/api/carbon-api/me` vira `<destino>/carbon-api/me`.
Com a variavel apontando so para `https://SEU-PROJETO.supabase.co`, toda chamada
erra o alvo.

Sem a variavel o proxy nem chega a ser registrado (ver o `...(process.env...)` no
`vite.config.js`), `/api/app-config` devolve 404 e a aplicacao **degrada para a
demonstracao**, com um aviso ambar na tela de login dizendo que a configuracao nao
veio do backend. O motivo real vai para o console. Isso e intencional: um 404 claro
na primeira chamada e melhor do que um destino default errado que so falharia na
hora do login.

Para expor na rede (teste em celular), e somente nesse caso, acrescente mais uma
linha antes do `npm.cmd run dev`:

```powershell
$env:EXPOR_REDE = "true"
```

---

## 3. Variaveis de ambiente

**O frontend nao tem nenhuma.** Nao existe `.env`, nao existe URL de Supabase nem
anon key no bundle. Todas as chamadas vao para `/api/<funcao>`, caminho RELATIVO
na mesma origem, e quem traduz isso para as Edge Functions e a hospedagem, por
rewrite. Ver `src/lib/endpoint.js` e a regra 4 do CLAUDE.md.

O porque, que nao e preciosismo: com a URL do projeto no bundle, qualquer visitante
da tela de login descobre o endereco e passa a bater direto nas Edge Functions,
fora do nosso dominio, sem log, sem WAF e sem limite de taxa. Com o caminho
relativo, a unica porta publica e o nosso dominio.

As duas unicas variaveis do projeto sao lidas pelo **processo do Node**, nunca pelo
navegador:

| Variavel | Lida por | Para que |
| --- | --- | --- |
| `SUPABASE_FUNCTIONS_URL` | `vite.config.js` | destino do `server.proxy` de `/api` em desenvolvimento |
| `EXPOR_REDE` | `vite.config.js` | `host: true`, so para testar em celular |

```
SUPABASE_FUNCTIONS_URL=https://SEU-PROJETO.supabase.co/functions/v1
```

Nenhuma das duas tem o prefixo `VITE_`, e isso e de proposito: sem o prefixo o Vite
se **recusa** a expor a variavel ao cliente, entao e impossivel ela entrar no bundle
mesmo por engano. `VITE_EXPOR_REDE` foi renomeada para `EXPOR_REDE` pelo mesmo
motivo: o prefixo ensinava o padrao errado a quem lesse o arquivo.

`SUPABASE_FUNCTIONS_URL` precisa estar no MESMO terminal que sobe o servidor
(secao 2). Em producao ela nao existe: quem faz a traducao la e uma regra no
console do AWS Amplify, fora do repositorio.

| Campo da regra do Amplify | Valor |
| --- | --- |
| Origem | `/api/<*>` |
| Destino | `https://SEU-PROJETO.supabase.co/functions/v1/<*>` |
| Tipo | 200 (rewrite/proxy) |

### Modo demonstracao (revisao visual sem backend)

Nao e variavel de ambiente. A antiga `VITE_CARBON_DEMO` foi removida e nao existe
mais; hoje sao duas coisas diferentes, ambas em `src/lib/runtimeConfig.js`:

| Nome | O que e | O que decide |
| --- | --- | --- |
| `MODO_DEMO` | constante de BUILD, `= import.meta.env.DEV` | se o recurso existe no bundle |
| `MODO_DEMO_ATIVO()` | funcao, le `carbonModoDemoAtivo` do `sessionStorage` | se esta ligado nesta aba |

Em desenvolvimento (`npm.cmd run dev`) a tela de login mostra o botao "Entrar em
modo demonstracao", que grava a chave. A partir dai `MODO_DEMO_ATIVO()` devolve
true e os modulos de `src/lib/api/` operam sobre os datasets de `src/lib/demo/`,
sem rede. `sessionStorage` e nao `localStorage` de proposito: o estado morre ao
fechar a aba.

A guarda no codigo e sempre `if (MODO_DEMO && MODO_DEMO_ATIVO())`, e a constante
**tem que vir na frente**. Ela dobra para `false` em build de producao, o `&&`
curto-circuita e o Rollup elimina o ramo junto com os dados. So a chamada de funcao
nao bastaria, e nao e teoria: com a condicao escrita ao contrario (ou com
`MODO_DEMO` envolvido em `Boolean()`) os datasets ficticios foram parar no bundle de
producao, medidos em 6 KB so no `demoProjetos.js`.

O modo demonstracao **nao bloqueia o login real**. Subir o dev server com
`SUPABASE_FUNCTIONS_URL` definida habilita o login de verdade em `localhost`: a
config vem do banco, o botao da Microsoft fica habilitado e a demonstracao continua
ali, a um clique, para quem quiser revisar tela sem sujar dado. Ate 21/08/2026 nao
era assim: o desenvolvimento ficava preso na demonstracao, o `clientId` chegava
vazio e era impossivel testar o login real em local.

---

## 4. Contrato das APIs remotas (referencia para o frontend)

Base: `/api/`, caminho relativo. Montada por `caminhoFuncao(nome)` em
`src/lib/endpoint.js`. O navegador nunca conhece o endereco do projeto Supabase.

**Nao existe cabecalho `apikey` em chamada nenhuma.** As tres funcoes sao publicadas
com `--no-verify-jwt`, entao a anon key nunca participou de autorizacao: ela era so
identificacao de projeto no gateway, e quem identifica o projeto agora e o rewrite
da hospedagem. Quem autoriza a `carbon-api` e a `carbon-secure-share-upload` e o ID
token do Azure AD, validado contra o JWKS da Microsoft dentro da propria funcao.

### GET `app-config` - publica

- Cabecalhos enviados: **apenas** `Accept: application/json`. Sem `Authorization` e
  sem `apikey`: a funcao e publica (`verify_jwt = false`) e o caminho e relativo.
- Timeout do cliente: 8000 ms.
- Resposta 200: `{ azure, app, login, flags }`. So devolve linhas de
  `carbon_app_config` com `publico = true`.
- `runtimeConfig.js` faz merge por secao com `CONFIG_DEFAULT`. Chave ausente,
  `null` ou string vazia cai para o default; arrays do banco substituem o default
  (nunca concatenam).
- Falha (rede, timeout, status != 200, JSON invalido, `azure.clientId` ou
  `azure.tenantId` vazios ou ainda com o placeholder `PREENCHER...` do seed) lanca
  `Error` com mensagem em pt-BR, que o `main.jsx` transforma em `ConfigErrorScreen`.
  **Nunca tela branca.**
- Resposta com `content-type` que nao seja JSON tambem e tratada como falha, com
  mensagem propria. E o sintoma exato de rewrite ausente: `/api/app-config` nao
  chega ao Supabase, cai no fallback da SPA e volta o `index.html` com 200. Sem esse
  teste o `.json()` estouraria e a mensagem culparia o codigo da Edge Function, que
  esta intacto.

Onde ficam esses valores: a tabela `carbon_app_config` tem **uma** linha
`chave = 'azure'`, cujo campo `valor` e um jsonb com `clientId`, `tenantId`,
`redirectUri` e `scopes` dentro.
**Nao existem** linhas `azure_client_id` nem `azure_tenant_id`: criar
essas chaves produz linhas que o `mesclarConfig` ignora, e a pessoa fica sem
entender por que preencher nao adiantou. Instrucoes em `docs/setup-supabase.md`.

### `carbon-api/*` - autenticada

- Cabecalhos: `Authorization: Bearer <ID token do Azure AD>` e
  `Accept: application/json`; so quando ha corpo, mais `Content-Type: application/json`.
- Metodos aceitos: GET, POST e PATCH. Qualquer outro volta 405
  `metodo_nao_permitido`.
- Rotas do shell: `/me`, `/modulos`, `/notificacoes`. As rotas de dominio (projetos,
  PDD e as demais) vivem nos modulos de `src/lib/api/`. As de projeto tem contrato
  proprio logo abaixo, porque mudaram em 22/08/2026.
- Timeout do cliente: 10000 ms.
- O token e validado no codigo da Edge Function (`_shared/azureAuth.ts`) contra o
  JWKS da Microsoft: assinatura, `iss`, `aud`, `tid` e dominio. Nada toca o banco
  antes disso.
- E o **ID token**, nao o access token: quem consome nao e o Microsoft Graph, e a
  nossa funcao, e o `aud` do access token do Graph nao seria o nosso `clientId`.

### `carbon-api/projetos` - leitura por participacao (mudou em 22/08/2026)

Ate 22/08/2026 a leitura de projeto exigia apenas usuario ativo. Como
`garantirUsuario` cria a linha de `carbon_usuarios` sozinha no primeiro login, com
papel `colaborador`, qualquer conta `@apsis.com.br` que entrasse uma vez passava a
ler `/projetos` e `/projetos/:id/pdd` de TODOS os projetos. A regra que passa a
valer:

| Papel | O que enxerga | O que escreve |
| --- | --- | --- |
| `admin` | todos os projetos, sem participar de nenhum | tudo |
| `gestor` | so os projetos em que participa | os projetos que enxerga |
| `colaborador` | so os projetos em que participa | nada |

A participacao mora na tabela `carbon_projeto_equipe` (migration
`20260822090000_projeto_equipe.sql`). O `gestor` **nao** enxerga tudo, e isso e
deliberado: se enxergasse, o portao valeria para menos da metade do time e nao seria
portao nenhum. Quem precisa de visao de carteira recebe papel `admin` nominalmente,
por decisao explicita de alguem, e nao como efeito colateral de poder editar.

Quem cria um projeto entra na equipe dele por trigger no banco, e nao por um segundo
insert da Edge Function: entre dois inserts da funcao nao existe transacao, e se o
segundo falhasse o autor nao enxergaria o que acabou de criar - nem teria como se
incluir depois, porque incluir exige participar. E um bloqueio que se cria sozinho.

#### GET `projetos`

Resposta 200, **envelope novo**:

```json
{ "projetos": [ ... ], "pode_criar": true }
```

| Campo | Tipo | O que e |
| --- | --- | --- |
| `projetos` | array | os projetos visiveis a quem chamou; para `admin`, todos |
| `pode_criar` | boolean | se o papel de quem chamou permite criar projeto |

Ate 22/08/2026 a rota devolvia um **array puro**. Quem consome precisa aceitar as
duas formas durante a janela de deploy em que o frontend novo ja subiu e a Edge
Function ainda e a antiga, senao as telas ficam vazias ate o backend subir. E o que
faz `normalizarListaProjetos` em `src/lib/api/projetos.js`, por onde passam as seis
telas que compartilham a chave de cache `['carbon', 'projetos']`. Nesse ramo de
compatibilidade `pode_criar` e assumido **false**: esconder uma capacidade que talvez
exista e melhor do que oferecer um botao que o servidor vai recusar com 403.

Lista vazia **nao e erro**: e a resposta certa para quem ainda nao foi colocado em
nenhuma equipe. A tela mostra estado vazio.

`pode_criar` vem do servidor para a tela nao ter que recalcular a regra. Renderizar um
booleano que o servidor mandou nao e decidir permissao no cliente; ler o papel do
`/me` e esconder o botao seria - e sairia de sincronia no dia em que a regra do
servidor mudasse. A distincao esta escrita no cabecalho de `src/pages/Projetos.jsx` e
precisa continuar valendo.

#### GET `projetos/:id`

Resposta 200:

```json
{
  "projeto": { ... },
  "equipe": [{ "id": "<uuid>", "email": "<EMAIL>", "nome": "<NOME>" }],
  "pode_escrever": false
}
```

A `equipe` vem junto do detalhe porque a tela mostra quem participa no mesmo lugar em
que se adiciona alguem: uma rota separada so para isso seria uma segunda requisicao
para desenhar um cartao. `pode_escrever` segue a mesma logica de `pode_criar`.

#### PATCH `projetos/:id/equipe`

Corpo. Os dois campos sao opcionais, mas ao menos um precisa vir preenchido:

```json
{ "adicionar": ["<EMAIL_DO_COLABORADOR>"], "remover": ["<EMAIL>"] }
```

Resposta 200:

```json
{ "equipe": [ ... ], "nao_encontrados": ["<EMAIL>"] }
```

Mesmo contrato do PATCH `secure-share/projetos/:id/equipe`, em
`supabase/functions/carbon-api/rotas/secureshare.ts`, e isso e de proposito: as duas
telas de equipe se parecem, e formato divergente entre elas seria uma armadilha na
proxima manutencao.

- E-mail e nao uuid porque o e-mail e o que a pessoa tem em maos ao digitar. A
  resolucao para `carbon_usuarios` acontece no servidor.
- `nao_encontrados` **nao e erro**: quem nunca entrou no Apsis Carbon ainda nao tem
  linha em `carbon_usuarios`, que nasce no primeiro login. Os demais entram na equipe
  e a resposta continua 200. Cabe a tela avisar quem ficou de fora.
- `equipe` volta **completa** depois da operacao, entao a tela substitui a lista
  inteira em vez de aplicar o delta.

#### Codigos de erro das rotas de projeto

| Codigo | HTTP | Quando |
| --- | --- | --- |
| `nao_encontrado` | 404 | o projeto nao existe **ou** quem chamou nao participa dele |
| `sem_permissao` | 403 | o papel nao permite escrever |
| `colaborador_externo` | 400 | e-mail de `adicionar` fora do dominio da APSIS; o e-mail recusado vai no `detalhe` |
| `equipe_vazia` | 400 | a remocao deixaria o projeto sem nenhum participante |
| `nada_para_atualizar` | 400 | `adicionar` e `remover` chegaram os dois vazios |

`colaborador_externo` e `equipe_vazia` sao os codigos novos de 22/08/2026.

**O 404 e ambiguo de proposito.** "O projeto nao existe" e "o projeto existe, mas
voce nao participa dele" respondem a mesma coisa, byte a byte. Quem depurar sem saber
disso vai achar que e bug ao ver um id valido devolver 404: nao e. Separar os dois
casos transformaria a rota em oraculo de existencia, e qualquer conta do dominio
poderia varrer ids para descobrir quais projetos a APSIS tem, e quantos. Pelo mesmo
motivo nao existe 403 na leitura: o proprio 403 ja seria a confirmacao.

`equipe_vazia` existe pela mesma razao da trigger de autor. Projeto sem ninguem na
equipe desaparece da lista de todo mundo que nao e `admin`, e so um `admin` consegue
resgata-lo. Recusar a remocao do ultimo participante e mais barato do que descobrir
depois por que o projeto sumiu.

### `carbon-secure-share-upload` - autenticada, multipart

- Mesmo portao de autenticacao da `carbon-api`: `Authorization: Bearer <ID token>` e
  `Accept: application/json`. Enviada por `enviarFormData` em `src/lib/api/base.js`.
- **Sem `Content-Type`**: o navegador precisa montar o boundary do multipart
  sozinho. Definir `multipart/form-data` na mao produz um corpo que o servidor nao
  consegue separar.
- Sem timeout de cliente: um envio de 200 MB em rede de escritorio passa de 10 s com
  folga. Quem cancela e o `signal` de quem chamou.
- Aceita **207** como sucesso parcial ("parte subiu, parte nao"). A tela precisa
  mostrar o que subiu E o que falhou; transformar 207 em erro perderia a lista dos
  que deram certo.
- Existe em funcao separada porque o roteador da `carbon-api` le todo corpo nao-GET
  como JSON, e arquivo e binario.

### Publicacao das funcoes

`supabase/config.toml` declara as tres com `verify_jwt = false`: `app-config`,
`carbon-api` e `carbon-secure-share-upload`. Sem o bloco, a plataforma responde 401
ANTES do nosso codigo rodar, e como esse 401 do gateway nao traz `{ erro: ... }` a
tela mostra a mensagem generica `O servidor retornou HTTP 401 em <funcao>` - que
parece problema de sessao, e nao de configuracao de deploy.

Deploy uma funcao por vez, em PowerShell 5.1:

```powershell
npx.cmd supabase functions deploy app-config --project-ref SEU-PROJETO --no-verify-jwt
npx.cmd supabase functions deploy carbon-api --project-ref SEU-PROJETO --no-verify-jwt
npx.cmd supabase functions deploy carbon-secure-share-upload --project-ref SEU-PROJETO --no-verify-jwt
```

Para conferir uma funcao pelo terminal use `curl.exe`, e nao `curl`: no PowerShell
5.1 `curl` e alias de `Invoke-WebRequest` e nao imprime o corpo da resposta.

Contrato de feature flags para quem consome: testar sempre `flag !== false`, para
que uma chave ausente no banco nao apague um pedaco da tela.

---

## 5. Limites desta entrega

- Este contrato descreve o repositorio **depois** da remocao das variaveis de
  ambiente do frontend, em 21/08/2026. Naquele dia: `src/lib/supabaseClient.js` e
  `.env.example` foram APAGADOS, `src/lib/endpoint.js` foi criado,
  `@supabase/supabase-js` saiu do `package.json` (ninguem usava o cliente, so as
  duas constantes de ambiente que ele exportava) e o `server.proxy` entrou no
  `vite.config.js`. Se algum texto ainda mandar editar `.env` ou importar de
  `supabaseClient.js`, esta desatualizado: esses arquivos nao existem.
- O portao de leitura por participacao descrito na secao 4 e o contrato, e nao o
  estado do banco: a migration `20260822090000_projeto_equipe.sql` e a publicacao da
  `carbon-api` ainda nao aconteceram (ver `docs/ESTADO-ATUAL.md`). Enquanto nao
  acontecerem, o ambiente que estiver no ar continua com a leitura antiga, aberta a
  qualquer conta do dominio. Aplicar a migration **antes** de publicar a funcao: na
  ordem inversa a funcao consulta uma tabela que nao existe e toda leitura de projeto
  quebra.
- O rewrite de producao **nao esta no repositorio**: e uma regra no console do AWS
  Amplify (secao 3). Clonar o repositorio nao reproduz a producao, e quem montar um
  ambiente novo precisa criar a regra a mao, senao `/api/*` cai no fallback da SPA
  e o boot morre com a mensagem de "voltou como pagina, e nao como JSON".
- Nenhum commit e nenhum push: subida para o GitHub depende de aprovacao manual
  do dono.

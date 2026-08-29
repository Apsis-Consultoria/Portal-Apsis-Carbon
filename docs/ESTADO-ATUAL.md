# Estado atual do Apsis Carbon

**Atualizado em:** 2026-08-22
**Por que este arquivo existe:** ele viaja com o repositório. O handoff de sessão fica em
`.remember/`, que é ignorado pelo git, e as notas de contexto ficam no Obsidian local
(`Conciencia_Obisidian\projetos\Apsis Carbon\`), que também não viaja. Ao trocar de máquina,
**este arquivo é a fonte de verdade.**

---

## Como rodar

Não existe `.env` neste projeto e o frontend não tem variável de ambiente nenhuma. As duas
variáveis citadas abaixo são lidas pelo processo do Node (`vite.config.js`), nunca pelo
navegador. Comandos em PowerShell 5.1: ele não aceita `&&`, e é `npm.cmd` / `npx.cmd` porque
os `.ps1` esbarram na execution policy.

```powershell
npm.cmd install
```

**Sem backend, só para revisar telas:**

```powershell
npm.cmd run dev
```

`http://localhost:5175`. A tela de login mostra um aviso âmbar dizendo que a configuração não
veio do backend, o botão da Microsoft fica desabilitado e o botão **"Entrar em modo
demonstração"** abre as telas com dados fictícios.

**Com backend, para login real em localhost:** duas linhas, no **mesmo** terminal (a variável
vale só naquela janela):

```powershell
$env:SUPABASE_API_URL = "https://<REF>.supabase.co"
```

```powershell
npm.cmd run dev
```

O sufixo `/functions/v1` é **obrigatório**: o rewrite só remove o prefixo `/api`, e o resto do
caminho vai como está. Sem a variável o proxy nem chega a ser registrado, `/api/app-config`
devolve 404 e a aplicação degrada para a demonstração com o aviso âmbar. O nome não tem prefixo
`VITE_` de propósito: sem ele o Vite se **recusa** a expor a variável ao cliente, então é
impossível ela entrar no bundle.

Para testar no celular, expor na rede local é explícito (`EXPOR_REDE`, também sem `VITE_`):

```powershell
$env:EXPOR_REDE = "true"
```

`npx.cmd eslint . --quiet` passa limpo nesta árvore de trabalho, e `npm.cmd run build` também.

---

## O que existe

### Telas prontas e navegáveis

| Tela | Arquivo | Issue |
|---|---|---|
| Login | `src/components/CarbonLoginLayout.jsx` + `AuthGuard.jsx` | - |
| Boas-Vindas | `src/pages/BoasVindas.jsx` | - |
| Projetos | `src/pages/Projetos.jsx` | #1 |
| PDD | `src/pages/ProjetoPdd.jsx` | #2 |
| Relatório de monitoramento | `src/pages/ProjetoMonitoramento.jsx` | #3 |
| Checklist de evidências | `src/pages/ProjetoEvidencias.jsx` | #4 |
| Findings de auditoria | `src/pages/ProjetoFindings.jsx` | #5 |
| Documentos | `src/pages/Documentos.jsx` | #6 |
| Atividades | `src/pages/Atividades.jsx` | #7 |
| Minhas horas | `src/pages/MinhasHoras.jsx` | #8 |
| Reuniões | `src/pages/Reunioes.jsx` | #9 |
| Ata de reunião | `src/pages/ReuniaoAta.jsx` | #9 |
| Fornecedores | `src/pages/Fornecedores.jsx` | #10 |
| Contratos e parcelas | `src/pages/Contratos.jsx` | #11 |
| Secure Share (lado APSIS) | `src/pages/SecureShare.jsx` + `SecureShareProjeto.jsx` | - |

### Chamadas ao backend: `/api`, sem variável de ambiente (mudou em 2026-08-21)

- `src/lib/supabaseClient.js` foi **apagado**, junto com o `.env.example` e a dependência
  `@supabase/supabase-js`. Não existe cliente supabase-js neste bundle.
- `src/lib/endpoint.js` exporta `caminhoFuncao(nome)`, que devolve `/api/<nome>`. Todas as
  chamadas do frontend usam esse caminho **relativo**, na mesma origem.
- Quem traduz `/api` para as Edge Functions é a **hospedagem**, por rewrite:
  - produção: regra no console do AWS Amplify, origem `/api/<*>`, destino
    `https://<REF>.supabase.co/functions/v1/<*>`, tipo 200 (rewrite / proxy);
  - desenvolvimento: `server.proxy` do `vite.config.js`, alimentado por `SUPABASE_API_URL`.
- **Por quê:** com a URL do projeto no bundle, qualquer visitante da tela de login descobre o
  endereço e passa a bater direto nas Edge Functions, fora do nosso domínio, sem log, WAF nem
  limite de taxa. Com o proxy, a única porta pública é o nosso domínio.
- **Não há header `apikey` em chamada nenhuma.** As funções sobem com `--no-verify-jwt`, e a
  anon key nunca participou de autorização: quem autoriza a `carbon-api` é o ID token do Azure
  AD, validado contra o JWKS da Microsoft dentro da própria função.
- Verificável no build: no `dist/` gerado, a única ocorrência de `supabase.co` é o texto de
  ajuda da `ConfigErrorScreen`, que usa o placeholder `SEU-PROJETO`. O endereço real não entra.

### Modo demonstração (mudou em 2026-08-21)

Não é mais variável de ambiente. A antiga `VITE_CARBON_DEMO` foi removida e não existe mais.
Hoje são duas coisas, em `src/lib/runtimeConfig.js`:

| O quê | Natureza | Como liga |
|---|---|---|
| `MODO_DEMO` | constante de **build**, `import.meta.env.DEV` | true em `vite dev`, false em `vite build` |
| `MODO_DEMO_ATIVO()` | função, lida em **tempo de execução** | chave `carbonModoDemoAtivo` no `sessionStorage`, gravada pelo botão "Entrar em modo demonstração" do `AuthGuard` |

O padrão no código é sempre `if (MODO_DEMO && MODO_DEMO_ATIVO())`, **com a constante na
frente**: sem ela o Rollup não dobra a condição e os datasets fictícios vão para o bundle de
produção. Isso aconteceu de verdade e foi medido (6 KB só em `demoProjetos.js`).

Consequência prática: subir o dev server com `SUPABASE_API_URL` definida dá **login real
em localhost**. A demonstração virou escolha por clique, não mais um modo em que o dev fica
preso. Conferência depois de um build, em PowerShell:
`Select-String -Path dist\assets\*.js -SimpleMatch "-51.9"` tem que não achar nada (é uma
coordenada dos dados fictícios de projeto).

### Banco

43 tabelas em 15 migrations. Ordem das chaves estrangeiras verificada: nenhuma FK referencia
tabela criada depois. A migration de projetos habilita PostGIS (área do projeto e a regra dos
5%); como ela ainda não rodou contra o Postgres, a extensão ainda não está no banco.

4 dessas tabelas são do Secure Share (`20260817120000_secure_share.sql`) e são lidas também
pelo repositório irmão `secure-share-carbon`. A mais recente é `carbon_projeto_equipe`
(`20260822090000_projeto_equipe.sql`), o portão de leitura dos projetos descrito logo abaixo.

RLS ativa em todas, **sem policy nenhuma** exceto `carbon_app_config` (linhas públicas). Todo
acesso passa pelas Edge Functions `carbon-api` e `carbon-secure-share-upload`, que validam o ID
token do Azure AD contra o JWKS da Microsoft antes de tocar no banco com a chave de serviço.

### Autorização de leitura dos projetos: participação, não domínio (mudou em 2026-08-22)

Até 2026-08-22 a leitura de projeto exigia apenas usuário ativo, e como `garantirUsuario`
autoprovisiona a linha de `carbon_usuarios` no primeiro login (papel `colaborador`, ativo),
**qualquer conta do tenant que entrasse uma vez lia todos os projetos** e todos os PDDs. Isso
era mais frouxo que `/modulos`, que exige linha em `carbon_usuario_modulos` justamente para
material sensível não vazar para o domínio inteiro. Foi aceito enquanto a base estava vazia e
foi fechado antes de entrar dado de cliente real - o Parakanã envolve material de auditoria com
comunidade indígena, e isso não pode ficar legível para o tenant inteiro. A regra que passa a
valer:

| Papel | O que enxerga | O que escreve |
|---|---|---|
| `admin` | todos os projetos, sem participar de nenhum | tudo |
| `gestor` | só os projetos em que participa | os projetos que enxerga |
| `colaborador` | só os projetos em que participa | nada |

- A participação mora em `carbon_projeto_equipe` (`projeto_id`, `usuario_id`, `criado_por`,
  `criado_em`). Nenhum dado pessoal: dois uuid, quem concedeu e quando.
- A checagem é um **inner join dentro da consulta que traz o dado** (`comVisibilidade` em
  `rotas/projetos.ts`), e não um "confere e depois lê": separar as duas coisas abriria uma
  janela entre elas.
- `gestor` **não** enxerga tudo, de propósito. Se enxergasse, o portão valeria para menos da
  metade do time e não seria portão nenhum. Visão de carteira é papel `admin`, dado
  nominalmente, não efeito colateral de poder editar.
- Quem cria um projeto entra na equipe por **trigger** (`carbon_projetos_equipe_autor_trg`), e
  não por um segundo insert da Edge Function: entre dois inserts da função não há transação, e
  se o segundo falhasse o autor não veria o que acabou de criar nem teria como se incluir,
  porque incluir exige participar. É um bloqueio que se cria sozinho.
- Projeto com `criado_por` nulo fica sem equipe e só aparece para `admin`. É o resultado
  correto, não um caso a contornar: não há a quem atribuir o acesso. A consulta de auditoria
  que lista esses projetos está no rodapé da migration.
- **Antes de publicar a `carbon-api` nova, confira que existe pelo menos um `admin` ativo**
  (a segunda consulta de auditoria da migration). Com zero, ninguém enxerga projeto nenhum nem
  consegue se incluir em equipe.
- Efeito no contrato HTTP: `GET /projetos` passa a devolver `{ projetos, pode_criar }` em vez
  de um array puro, `GET /projetos/:id` devolve `{ projeto, equipe, pode_escrever }` e existe
  `PATCH /projetos/:id/equipe`. O 404 `nao_encontrado` cobre também "você não participa", para
  a rota não virar oráculo de existência de projeto. Detalhes em
  [docs/contrato-api.md](contrato-api.md).

### Edge Functions

Três funções, todas declaradas com `verify_jwt = false` em `supabase/config.toml`:

| Função | Papel |
|---|---|
| `app-config` | boot público: o navegador a chama antes de existir qualquer sessão |
| `carbon-api` | todo o resto, roteado por `rotas/indice.ts` |
| `carbon-secure-share-upload` | upload de arquivo, separada porque o roteador da `carbon-api` lê todo corpo não-GET como JSON |

**Por que `verify_jwt = false`:** o `Authorization` traz um ID token do **Azure AD**, não um JWT
do Supabase Auth. A plataforma não sabe validar esse token e responderia 401 antes do nosso
código rodar, com um corpo sem `{ erro: ... }`, o que na tela parece problema de sessão e não de
deploy. Deploy um por vez, sempre com o slug:

```powershell
npx.cmd supabase functions deploy <nome> --project-ref <REF> --no-verify-jwt
```

### O que já está no Supabase (2026-08-21)

O projeto Supabase **existe** desde 2026-08-21 e é **compartilhado** com o `secure-share-carbon`
(portal do cliente), de propósito: as duas aplicações leem `carbon_usuarios` e
`carbon_app_config`. O project ref não aparece escrito em documento nenhum daqui, por coerência
com a arquitetura `/api`: use `<REF>` e pegue o valor real no console.

Aplicado até agora, e só isto:

- `20260807120000_init_apsis_carbon.sql` (`carbon_usuarios`, `carbon_app_config`,
  `carbon_modulos`, `carbon_notificacoes`, `carbon_usuario_modulos`);
- `20260817120000_secure_share.sql` (as 4 tabelas do Secure Share e as 2 views).

As outras 13 migrations deste repositório (projetos e PDD, documentos, monitoramento,
evidências, findings, atividades, reuniões, fornecedores, visitas, pipeline, metas, crédito e
equipe de projeto) **ainda não rodaram**. Por quê: nenhuma delas é necessária para o Secure
Share funcionar, e uma delas exige PostGIS, que assim fica fora do caminho crítico. Rodar
quando for mexer nas telas de projeto do Portal Carbon.

Duas ressalvas de ordem, para não aplicar em sequência errada: `20260822090000_projeto_equipe`
depende de `20260812150000_projetos_e_pdd`, que cria `carbon_projetos` (sem ela a migration
falha inteira dentro da transação, que é o comportamento desejado); e ela precisa estar
aplicada **antes** de publicar a `carbon-api` nova, senão a função consulta uma tabela que não
existe e toda leitura de projeto quebra.

As Edge Functions **ainda não foram publicadas** e os secrets do Azure ainda não foram gravados.
A CLI do Supabase não é dependência deste repositório (ela está no `secure-share-carbon`): use
`npx.cmd supabase`, nunca instalação global, que a Supabase não suporta por npm.

### Arquitetura modular (fundação criada em 2026-08-14)

Foi refatorado para que tela nova não exija tocar em arquivo compartilhado:

| Camada | Como acrescentar |
|---|---|
| Rotas da Edge Function | novo `supabase/functions/carbon-api/rotas/<dominio>.ts` exportando `rotas: Rota[]` |
| API do frontend | novo `src/lib/api/<dominio>.js` |
| Dados de demonstração | novo `src/lib/demo/<dominio>.js` |
| Registro da tela | novo `src/paginas/<dominio>.paginas.js` |
| Primitivas de UI | usar `src/components/ui/` (ver `LEIA-ME.md` de lá) |

O índice de páginas descobre os módulos sozinho, por `import.meta.glob`. `App.jsx` e `Layout.jsx`
não mudam mais a cada tela. O **backend não tem esse automatismo**: o Deno Deploy não tem
equivalente do `import.meta.glob`, então `rotas/indice.ts` continua sendo edição manual, um
import e um spread por domínio.

---

## O que está incompleto

O trabalho das issues #12 a #16 foi **interrompido no meio**. O que está no repositório compila e
não quebra nada, mas está pela metade:

| Domínio | Issue | Migration | Rotas | API | Demo | Tela |
|---|---|---|---|---|---|---|
| visitas | #12 | pronta | pronta | pronta | pronta | **falta** |
| pipeline | #13 | pronta | **falta** | **falta** | **falta** | **falta** |
| metas | #14 | pronta | **falta** | **falta** | **falta** | **falta** |
| credito | #15 | pronta | **falta** | **falta** | **falta** | **falta** |
| comunidade | #16 | **falta** | **falta** | **falta** | **falta** | **falta** |

As migrations órfãs (pipeline, metas, credito) criam tabelas que ainda não têm rota nem tela.
Isso é inofensivo: são apenas tabelas vazias. Mas se preferir um repositório sem estrutura sem
uso, elas podem sair e voltar junto com o resto do domínio.

**Retomar por:** `src/pages/Visitas.jsx` mais `src/paginas/visitas.paginas.js`. É o mais barato:
backend, API e dados de demonstração já existem, falta só a tela.

### Rotas escritas mas não publicadas

Defeito encontrado em 2026-08-17 e ainda **não corrigido**: 8 módulos de rota existem em
`supabase/functions/carbon-api/rotas/` mas não estão importados no `indice.ts` (`atividades`,
`documentos`, `evidencias`, `findings`, `fornecedores`, `monitoramento`, `reunioes`, `visitas`).
As telas aparecem no menu, mas a API responde 404. O conserto é de duas linhas por módulo. Ao
investigar "minha tela não carrega dados", olhe o `indice.ts` primeiro: é o único ponto não
automático do backend modular, e por isso exatamente onde um domínio novo é esquecido.

### Verificação que NÃO aconteceu

Importante saber, para não confiar demais no que está aqui:

- A fase de **integração** (coerência entre camadas) não rodou nos domínios de #3 a #11. Pode
  haver nome de função SQL divergindo do que a Edge Function chama, enum diferente entre migration
  e frontend, ou coluna referenciada que não existe. Nas issues #1 e #2 essa fase encontrou quatro
  divergências desse tipo, então a chance de haver aqui é real. O `indice.ts` acima é justamente
  um caso desses, já confirmado.
- A fase de **revisão adversarial** não rodou nesses domínios.
- **Só duas migrations rodaram contra o Postgres** (a de init e a do Secure Share). As outras 13
  nunca foram executadas: erro de SQL nelas só vai aparecer quando forem aplicadas. Vale também
  para `20260822090000_projeto_equipe`: o portão de leitura dos projetos está escrito e revisado,
  mas ainda não existe em banco nenhum.

---

## Pendências que dependem de decisão

1. **Terminar o provisionamento do Supabase** (issue #19). O projeto já existe e é compartilhado
   com o `secure-share-carbon`; falta aplicar as 13 migrations restantes, publicar as três Edge
   Functions e gravar os secrets. Passo a passo em `docs/setup-supabase.md`. Uma dessas
   migrations, `20260822090000_projeto_equipe`, deixou de ser opcional: é o portão de leitura dos
   projetos, e enquanto ela não rodar **não pode entrar dado de cliente real** (ver a seção
   "Autorização de leitura dos projetos"). Aplicar antes de publicar a `carbon-api`.
2. **Registrar o app no Azure AD.** Os dois registros que existem (`[Carbon] Portal` e
   `[Carbon] Secure Share`) são de **aplicativo** (client credentials, sem usuário) e não servem
   ao MSAL, que exige uma plataforma **Single-page application** com `redirect`
   `http://localhost:5175`, sem barra final. Depois disso, `clientId` e `tenantId` vão para a
   linha `chave = 'azure'` de `carbon_app_config`, cujo campo `valor` é **um jsonb**
   `{clientId, tenantId, redirectUri, scopes}`. Dois cuidados:
   - **não existem** linhas `azure_client_id` nem `azure_tenant_id`. Criar essas chaves produz
     linhas que o frontend ignora;
   - tem que ser `update`: o seed usa `on conflict (chave) do nothing`, então reaplicar a
     migration não substitui os placeholders `PREENCHER_`. E o `tenantId` precisa ser o **GUID**,
     nunca o domínio: com o domínio o login completa no navegador e toda chamada da `carbon-api`
     volta 401, porque o backend monta o issuer esperado com o que está no banco.
3. **Quem entra na equipe de cada projeto.** A regra técnica está fechada (participação em
   `carbon_projeto_equipe`), mas a operacional não: hoje só o autor de um projeto entra sozinho,
   por trigger, e todo o resto é inclusão manual por alguém que já participa. Falta decidir quem
   faz essa curadoria no dia a dia e se algum papel além de `admin` deve receber visão de
   carteira. Enquanto não houver decisão, a saída é nomear `admin` caso a caso, que é o
   comportamento conservador.
4. **Escopo de estoque e comercialização de crédito** (issue #15) é proposta minha, inferida do
   padrão Verra, não observada no Notion. Precisa de validação antes de continuar.
5. **Censo nominal da comunidade** (issue #16): decidido **não** replicar. Só aldeias e agregados
   por grupo, sexo e faixa etária. Mudar isso exige relatório de impacto, base legal e conversa com
   o jurídico e com as associações. Ver `docs/notion/11-comunidade-parakana.md`.
6. **Gradiente do painel de login** (issue #20): valores a definir, hoje na variável CSS
   `--carbon-painel-fundo`.
7. **Alias de suporte:** o seed usa `ti@apsis.com.br` e ele aparece na tela de boas-vindas.
   Confirmar se existe.
8. **Issue #2 no GitHub diz 45 capítulos do PDD.** São 43. Corrigido nos documentos, falta
   corrigir no GitHub.
9. **Portal Apsis** (o outro repositório, `portal-apsis`, somente leitura daqui): remover a
   `service_role key` do frontend (`portal-apsis/src/lib/supabaseClient.js`). A chave deve ser
   considerada comprometida. No Carbon esse arquivo não existe mais desde 2026-08-21.

---

## Regras do projeto que não estão óbvias no código

- Proibido o caractere travessão (em dash) em qualquer arquivo. Use hífen.
- Toda configuração vive no banco (`carbon_app_config`), não em variável de ambiente. **O
  frontend não tem variável de ambiente nenhuma:** tudo vai por `/api/<funcao>`, caminho
  relativo, e a hospedagem faz o rewrite (ver `src/lib/endpoint.js`). Não reintroduza nada com
  prefixo `VITE_`: o que começa com `VITE_` entra no bundle e é público por construção.
- O project ref do Supabase não é escrito na documentação: use `<REF>` ou `SEU-PROJETO`. Esse é o
  ponto inteiro da arquitetura `/api`.
- `MODO_DEMO` não pode ser envolvido em `Boolean()`, e tem que vir **antes** de
  `MODO_DEMO_ATIVO()` na condição: o wrapper e a ordem invertida impedem o tree-shaking, e os
  datasets fictícios vão para o bundle de produção.
- Comandos de terminal são escritos para **PowerShell 5.1**: sem `&&`, com `npm.cmd`, `npx.cmd` e
  `curl.exe` (o `curl` seco é alias de `Invoke-WebRequest` e não imprime o corpo da resposta).
- Autorização, em uma frase: **o papel decide a escrita, a participação decide a leitura, e
  `admin` ignora a participação** (`rotas/acesso.ts`). A escrita é conferida uma vez no
  `index.ts`, antes do handler, porque é pergunta sobre a pessoa; a leitura é conferida dentro da
  consulta que traz o dado, porque é pergunta sobre a pessoa **e** a linha.
- **Permissão não se recalcula no frontend.** A tela renderiza os booleanos que o servidor mandou
  (`pode_criar`, `pode_escrever`); ler o papel do `/me` e esconder botão por perfil seria
  reimplementar a regra em dois lugares, e o lugar errado é sempre o que fica desatualizado. A
  distinção está escrita no cabeçalho de `src/pages/Projetos.jsx`.
- Dado pessoal não entra em listagem: contatos de visitas, dados bancários de fornecedor e nome de
  comprador sob NDA só no detalhe e sob papel.
- Levantamento do Notion que originou tudo: `docs/notion-levantamento.md` e `docs/notion/`.
- Backlog completo: `docs/issues/BACKLOG-INICIAL.md`, e as 20 issues estão criadas em
  `Apsis-Consultoria/Portal-Apsis-Carbon`.

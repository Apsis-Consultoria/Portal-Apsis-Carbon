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
| Backend | Supabase (Postgres + Edge Functions Deno) | nuvem, projeto Supabase |
| Autenticacao | Azure AD (Entra ID) via MSAL browser | nuvem |

Portanto "subir o backend em local" significa **subir o dev server do Vite**, que
serve a SPA. As APIs consumidas sao remotas (Edge Functions do Supabase).

---

## 2. Contrato de subida local (o que o frontend pode assumir)

| Item | Valor |
| --- | --- |
| Comando | `npm run dev` |
| URL base | `http://localhost:5175` |
| Porta | **5175, fixa** (`strictPort: true` no `vite.config.js`) |
| Bind | loopback apenas. Verificado nesta maquina: escuta em `::1` (IPv6). Use `http://localhost:5175`; `http://127.0.0.1:5175` **nao** conecta |
| Rota raiz | `/` devolve `index.html` (HTTP 200) |
| Alias de import | `@` -> `./src` |

A porta 5175 e contratual: o Portal Apsis ocupa a 5174 e o `redirectUri` do MSAL
e derivado de `window.location.origin`. Subir em outra porta quebra o login com
`AADSTS50011`. Com `strictPort: true`, se a 5175 estiver ocupada o Vite falha na
hora em vez de migrar de porta silenciosamente.

Para expor na rede (teste em celular), e somente nesse caso:
`$env:VITE_EXPOR_REDE = "true"; npm run dev`.

---

## 3. Variaveis de ambiente

O frontend conhece **apenas duas** variaveis, ambas publicas por design:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Elas ficam no arquivo `.env` da raiz (nao versionado, modelo em `.env.example`).
Nenhum segredo entra aqui: a service_role key existe somente como secret das Edge
Functions. Instrucoes de preenchimento em `docs/setup-supabase.md`.

### Modo demonstracao (revisao visual sem backend)

Existe uma terceira variavel, **opcional e exclusiva de desenvolvimento**:

```
VITE_CARBON_DEMO=true
```

Com ela, `carregarConfig()` devolve `CONFIG_DEFAULT` sem nenhuma chamada de rede:
as telas de login e boas-vindas renderizam mesmo sem Supabase publicado. O ramo e
eliminado do bundle em build de producao (`import.meta.env.DEV` e estatico).

Subida em modo demo:

```powershell
$env:VITE_CARBON_DEMO = "true"; npm run dev
```

---

## 4. Contrato das APIs remotas (referencia para o frontend)

Base: `${VITE_SUPABASE_URL}/functions/v1/`. Montada por `urlFuncao(nome)` em
`src/lib/supabaseClient.js`.

### GET `app-config` - publica

- Sem `Authorization`. Header `apikey: <anon key>`.
- Timeout do cliente: 8000 ms.
- Resposta 200: `{ azure, app, login, flags }`.
- `runtimeConfig.js` faz merge por secao com `CONFIG_DEFAULT`. Chave ausente,
  `null` ou string vazia cai para o default; arrays do banco substituem o default
  (nunca concatenam).
- Falha (rede, timeout, status != 200, JSON invalido, `azure.clientId` ou
  `azure.tenantId` vazios) lanca `Error` com mensagem em pt-BR, que o `main.jsx`
  transforma em `ConfigErrorScreen`. **Nunca tela branca.**

### `carbon-api/*` - autenticada

- Headers: `Authorization: Bearer <ID token do Azure AD>` e `apikey: <anon key>`.
- Rotas: `/me`, `/modulos`, `/notificacoes`.
- O token e validado no codigo da Edge Function (`_shared/azureAuth.ts`) contra o
  JWKS da Microsoft: assinatura, `iss`, `aud`, `tid` e dominio. Nada toca o banco
  antes disso.

Contrato de feature flags para quem consome: testar sempre `flag !== false`, para
que uma chave ausente no banco nao apague um pedaco da tela.

---

## 5. Limites desta entrega

- Nenhum arquivo de interface (`src/**`) foi tocado.
- Nenhuma dependencia foi adicionada, removida ou atualizada.
- Nenhum commit e nenhum push: subida para o GitHub depende de aprovacao manual
  do dono.

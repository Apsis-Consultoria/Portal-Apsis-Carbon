# Producao: o que falta para os dois sistemas subirem

> **ATUALIZACAO 03/09/2026, e ela vem ANTES de tudo o que esta escrito abaixo.**
>
> A Amplify **nao publica desde 29/08/2026**. Enquanto isso valer, nada no
> repositorio muda producao, e as duas pendencias das secoes seguintes nao sao o
> problema atual.
>
> **A prova, e ela nao depende de acesso a AWS.** O hash do bundle do Vite e
> deterministico pelo conteudo, entao da para perguntar a producao se o build de
> hoje esta la:
>
> ```
> cd "C:\Users\<voce>\Sistemas\portal-apsis-carbon"; npx.cmd vite build; ls dist\assets\*.js
> curl.exe -s -o NUL -w "%{http_code}`n" https://portal.apsiscarbon.com/assets/<o-hash-que-saiu>.js
> ```
>
> Medido em 03/09/2026: os dois bundles que o codigo atual produz devolvem
> **404**, e o de 29/08 (`index-DfuvEQGW.js`) devolve **200**. Um 404 em caminho
> de asset com hash NAO pode ser cache do CloudFront: nao existe o que guardar
> para um caminho que nunca foi pedido, entao a requisicao foi a origem e o
> arquivo nao esta lá. Confirma tambem o `Last-Modified` do `index.html`:
> portal `Sat, 29 Aug 2026 01:02:49 GMT`, secureshare `Sat, 29 Aug 2026 00:59:17
> GMT`.
>
> **NAO E O REPOSITORIO, e isso foi conferido item por item:** `npm ci` passa com
> o lock coerente (lockfileVersion 3, 388 pacotes); nao existe `.npmrc`
> versionado e `ignore-scripts` e false; `amplify.yml` e buildspec valido
> (`preBuild: npm ci`, `build: npm run build`, `baseDirectory: dist`, sem
> `customRules` nem `customHeaders` sobrando); `npm run build` e `eslint` passam.
>
> **OS DOIS APPS PARARAM COM 3 MINUTOS DE DIFERENCA**, e e o dado mais util aqui.
> Dois builds falhando por conta propria nao param no mesmo minuto. Isso aponta
> para algo comum aos dois, no nivel da conexao ou da conta - o candidato mais
> provavel e a autorizacao do GitHub App da AWS Amplify ter sido revogada ou
> expirada, o que faz o webhook parar de chegar e nenhum build ser DISPARADO
> (diferente de build disparado e falhando).
>
> **O QUE OLHAR NO CONSOLE, nesta ordem:**
>
> 1. **Deployments** do app: qual foi o ultimo e em que data. Se o ultimo for de
>    29/08, nenhum build foi disparado desde entao e o problema e o gatilho, nao
>    o build.
> 2. Se aparecerem builds depois de 29/08 com falha, abrir o log: ai a causa esta
>    no build e o paragrafo acima esta errado.
> 3. **App settings > Repository**: se o branch conectado e `main` e se o aviso
>    de reconectar a conexao do GitHub aparece.
> 4. Em **GitHub > Settings > Applications > AWS Amplify**: se a autorizacao
>    ainda existe e se cobre os dois repositorios.
> 5. Se o build automatico por push esta ligado para o branch.
>
> Um `Redeploy this version` (ou um build manual) responde a duvida em dois
> minutos: se o build roda e publica, o gatilho e o problema.

Documento de entrega para quem tem acesso ao AWS Amplify e ao DNS na Cloudflare.
Nao ha nada a fazer no codigo dos repositorios: as duas pendencias abaixo sao de
hospedagem. Medido em 02/09/2026.

Sistemas envolvidos, os dois no mesmo projeto Supabase:

| Sistema | Dominio pretendido | Repositorio |
|---|---|---|
| Portal Apsis Carbon | `portal.apsiscarbon.com` | `portal-apsis-carbon` |
| Secure Share Carbon | `secureshare.apsiscarbon.com` | `secure-share-carbon` |

---

## Pendencia 1: os dois dominios nao resolvem

**Sintoma.** Nao e erro de pagina. O navegador nao consegue nem descobrir o
endereco IP do servidor, entao nao existe requisicao HTTP, nao existe 404 e nao
existe log em lugar nenhum.

**Causa.** Os dois nomes estao como CNAME para distribuicoes CloudFront que a AWS
nao tem:

| Nome | CNAME aponta para | Tem endereco? |
|---|---|---|
| `portal.apsiscarbon.com` | `dtumeqcgxduz5.cloudfront.net` | nao |
| `secureshare.apsiscarbon.com` | `dg7ca8xjepqbw.cloudfront.net` | nao |

O apex `apsiscarbon.com` (site institucional em WordPress) esta normal e responde
200 pela Cloudflare. O problema e so dos dois subdominios.

**Como isso foi confirmado.** A resposta de DNS para esses dois nomes de
CloudFront e NOERROR com zero registros e o SOA de `cloudfront.net` na secao
Authority. Isso NAO e "nao existe" (NXDOMAIN), e por isso engana: o `nslookup` do
Windows imprime `Nome: portal.apsiscarbon.com` sem nenhuma linha `Address` e
parece sucesso. A prova de que os nomes nao existem foi consultar
`d111111abcdef8.cloudfront.net`, um nome ficticio tirado da documentacao da AWS:
a resposta e byte a byte do mesmo formato.

**Causa provavel.** A associacao de dominio no Amplify nunca foi concluida, ou foi
refeita e gerou um alvo novo sem o CNAME na Cloudflare ser atualizado. Cada vez
que a associacao e recriada, o Amplify entrega um alvo diferente.

### O que fazer

1. No console do Amplify, em cada um dos dois apps: **Hosting** -> **Custom
   domains**. Ver o estado da associacao do dominio.
2. Se estiver pendente ou com erro, refazer a associacao. O Amplify entao mostra
   os registros que ele espera no DNS: um CNAME de validacao do certificado (nome
   comecando com `_`) e o CNAME do dominio em si.
3. Na Cloudflare, em **DNS** -> **Records**, corrigir o CNAME do subdominio para
   o alvo que o Amplify mostrou, e criar o registro de validacao.
4. O registro de validacao do certificado tem que ficar **DNS only** (nuvem
   cinza). Proxied (nuvem laranja) faz a AWS nao conseguir ler o registro e a
   emissao do certificado fica presa para sempre.

### Como conferir que a pendencia 1 acabou

Roda no PowerShell. Tem que sair um numero de HTTP, qualquer um. Enquanto sair
`000`, o nome ainda nao resolve e nao ha o que investigar na aplicacao:

```
curl.exe -s -o NUL -w "%{http_code}`n" https://portal.apsiscarbon.com/
curl.exe -s -o NUL -w "%{http_code}`n" https://secureshare.apsiscarbon.com/
```

---

## Pendencia 2: as duas regras de rewrite, em cada app

So faz sentido depois da pendencia 1 resolvida.

**Por que existe.** O frontend nao tem variavel de ambiente nenhuma e nao conhece
o endereco do Supabase: ele chama o caminho relativo `/api/<funcao>`, e quem
traduz isso para as Edge Functions e a hospedagem. Sem a regra, `/api` devolve
404. A decisao esta documentada em `src/lib/endpoint.js` e na regra 4 do
`CLAUDE.md` do repositorio.

**Onde.** Console do Amplify, no app: **App settings** -> **Rewrites and
redirects** -> **Manage redirects**. Nao existe arquivo de repositorio para isso;
a propria AWS documenta que redirect e rewrite se configuram somente no console.

**As duas regras, nesta ordem:**

| Ordem | Source address | Target address | Type |
|---|---|---|---|
| 1 | `/api/<*>` | `https://<REF>.supabase.co/functions/v1/<*>` | 200 (Rewrite) |
| 2 | `/<*>` | `/index.html` | 200 (Rewrite) |

`<REF>` e o identificador do projeto Supabase. Ele nao esta escrito neste arquivo
de proposito: versionar isso no repositorio gravaria qual e o projeto de producao,
que e exatamente o que a arquitetura de `/api` existe para evitar. O valor e o
mesmo que ja foi cadastrado na variavel de ambiente `SUPABASE_API_URL` do app,
acrescido de `/functions/v1/<*>`.

**Tres detalhes que quebram calado se passarem batido:**

- **A ordem importa.** O Amplify avalia de cima para baixo e para na primeira
  regra que casa. Com a regra 2 em cima, ela engole `/api/*` e devolve o
  `index.html` no lugar da resposta da funcao. O sintoma nao parece de
  hospedagem: a tela acusa que a configuracao voltou um corpo que nao e JSON, e a
  culpa cai na Edge Function.
- **O curinga e `<*>`**, com sinal de maior e de menor. Escrever `/api/*` nao casa
  com nada, e o efeito e identico a nao ter regra: 404.
- **Sem a regra 2, todo link direto da SPA da 404.** A raiz funciona porque
  `index.html` e o documento padrao; qualquer outro caminho nao existe como
  arquivo.

Nao precisa de novo deploy depois de salvar. A regra vale na hora.

### Como conferir que a pendencia 2 acabou

Tem que sair um JSON, e nao HTML:

```
curl.exe -s https://portal.apsiscarbon.com/api/app-config
```

---

## Recomendacoes na Cloudflare, depois que os dois dominios estiverem no ar

Nenhuma e obrigatoria para funcionar, e todas ja mordem em producao.

- **`/api/*` nao pode ser cacheado.** As respostas sao por sessao e por usuario, e
  uma regra de cache padrao pode servir a resposta de uma pessoa para outra. Em
  **Cache Rules**, criar bypass de cache para o caminho `/api/*`.
- **O cabecalho `Authorization` tem que passar intacto**, senao toda chamada volta
  como nao autenticada.
- **SSL/TLS em Full (strict).** Em "Flexible", com uma origem que forca HTTPS, o
  resultado e laco de redirecionamento.
- **Web Analytics (Browser Insights) desligado**, ou a CSP ajustada. Ele injeta um
  script inline mais o `static.cloudflareinsights.com/beacon.min.js` na resposta,
  e a CSP do `index.html` usa `script-src 'self'` e bloqueia os dois. O console do
  navegador enche de erro sem que nada da aplicacao esteja errado. Desligar
  resolve sem afrouxar a CSP.

---

## Enquanto isso: a URL gratuita do Amplify

Cada app tem uma URL propria do tipo `https://main.<id>.amplifyapp.com`, que
funciona sem nenhuma configuracao de dominio e aparece na tela inicial do app no
console. Ela serve para demonstracao imediata. A pendencia 2 (as duas regras de
rewrite) vale igual para ela: sem as regras, o `/api` tambem devolve 404 ali.

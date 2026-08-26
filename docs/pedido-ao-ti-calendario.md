# Pedido ao TI: permissao para o portal criar reunioes do Teams

**Data do pedido:** aguardando envio.
**App registration:** `[Carbon] Portal` (client id `42cdc3e8-c748-4237-acca-7f2513596895`).

## O que pedir, exatamente

1. Adicionar ao app **`[Carbon] Portal`** a permissao de **APLICATIVO** (nao
   delegada) do Microsoft Graph:

   - `Calendars.ReadWrite`

2. Clicar em **Grant admin consent** depois de adicionar. Sem esse clique a
   permissao aparece na tela mas nao entra no token, e o sintoma e um 403 que
   parece defeito do sistema.

3. **(Recomendado pelo proprio time, nao exigencia)** Restringir o alcance com
   uma Application Access Policy do Exchange, para o app so poder mexer no
   calendario da caixa organizadora, e nao no de todo mundo:

   ```powershell
   New-ApplicationAccessPolicy -AppId 42cdc3e8-c748-4237-acca-7f2513596895 `
     -PolicyScopeGroupId <grupo-com-a-caixa-portal@apsis.com.br> `
     -AccessRight RestrictAccess `
     -Description "Portal Apsis Carbon: eventos apenas na caixa organizadora"
   ```

   Sem a policy, `Calendars.ReadWrite` de aplicativo alcanca o calendario de
   qualquer caixa do tenant. Com ela, so o da caixa do grupo. E a mesma
   mitigacao ja discutida para o Mail.Send.

## Para que serve

A tela de Reunioes do portal Apsis Carbon vai criar as reunioes do Teams
diretamente: a weekly da equipe e as reunioes com parceiros, com os convidados
escolhidos na tela e a recorrencia gerenciada pelo proprio evento (alterar ou
cancelar a serie inteira, ou uma ocorrencia so).

Tecnicamente: `POST /users/{organizador}/events` com `attendees`,
`isOnlineMeeting: true` e `recurrence`. O convite chega por e-mail aos
participantes pelo proprio Exchange; o portal nao envia nada por conta propria.

## Por que nao a alternativa

`OnlineMeetings.ReadWrite.All` cria a sala do Teams **sem evento de calendario**:
ninguem recebe convite, a reuniao nao aparece na agenda de ninguem, e ainda
exige uma ApplicationAccessPolicy propria do Teams. O evento de calendario
resolve convite, agenda e serie com uma permissao unica.

## Como conferir que funcionou

Depois do consentimento, quem tem as credenciais roda:

```powershell
node scripts/diagnostico-calendario.mjs
```

O passo 2 do script le a claim `roles` de dentro do token e diz se
`Calendars.ReadWrite` foi de fato concedida - a tela do Azure nao distingue
adicionada de consentida, o token sim.

// Diagnostico da criacao de reunioes do Teams pelo Microsoft Graph.
//
// POR QUE ELE EXISTE, e por que roda ANTES de qualquer codigo de integracao:
// criar reuniao do Teams pelo portal (com convidados e serie recorrente) exige a
// permissao de APLICATIVO Calendars.ReadWrite, e ela NAO esta no token de hoje -
// conferido em 25/08/2026, a claim `roles` do [Carbon] Portal traz apenas
// Sites.*, Files.* e Mail.Send. Permissao adicionada no portal do Azure e
// indistinguivel de permissao consentida, do lado de fora; quem sabe a diferenca
// e o token, que e o que este script le. A licao e a mesma do Mail.Send do
// Secure Share: exigido nao e concedido.
//
// O DESENHO DA INTEGRACAO, para quando a permissao vier:
//
//   POST /v1.0/users/{organizador}/events
//     com attendees (convidados recebem o convite por e-mail sozinhos),
//     isOnlineMeeting: true e onlineMeetingProvider: 'teamsForBusiness'
//     (o link do Teams vem na resposta, em onlineMeeting.joinUrl),
//     e recurrence para a serie (weekly etc.).
//
//   A SERIE e gerenciada pelo evento-mestre: PATCH nele muda a serie inteira,
//   /events/{id}/instances lista as ocorrencias, e uma ocorrencia especifica
//   pode ser alterada ou cancelada sozinha. E exatamente o "gerenciar toda a
//   serie" pedido - o Graph ja faz, o portal so orquestra.
//
//   NAO usamos OnlineMeetings.ReadWrite.All: cria a sala do Teams sem evento de
//   calendario, ou seja SEM convite para ninguem, e ainda exige uma
//   ApplicationAccessPolicy configurada por PowerShell. O evento de calendario
//   faz as duas coisas com uma permissao so.
//
// COMO RODAR (PowerShell 5.1 - o separador e ';', o '&&' nao funciona):
//
//   $env:AZURE_PORTAL_TENANT_ID     = Read-Host "Tenant ID"
//   $env:AZURE_PORTAL_CLIENT_ID     = Read-Host "Client ID"
//   $env:AZURE_PORTAL_CLIENT_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR((Read-Host "Client Secret" -AsSecureString)))
//   node scripts/diagnostico-calendario.mjs
//
// Por padrao NAO cria nada. Para incluir um evento de teste (na caixa do
// organizador, comecando em 10 minutos, com voce como convidado):
//
//   node scripts/diagnostico-calendario.mjs --criar voce@apsis.com.br
//
// O evento de teste e apagado em seguida pelo proprio script.

const GRAPH = 'https://graph.microsoft.com/v1.0';

// Mesma caixa do envio de e-mail (carbon_app_config, chave secure_share).
const ORGANIZADOR = process.env.SP_REMETENTE || 'portal@apsis.com.br';

const cor = (c, s) => `\x1b[${c}m${s}\x1b[0m`;
const ok = (s) => console.log(`${cor(32, '  OK  ')} ${s}`);
const aviso = (s) => console.log(`${cor(33, ' AVISO')} ${s}`);
const erro = (s) => console.log(`${cor(31, ' ERRO ')} ${s}`);
const dica = (s) => console.log(`        ${cor(90, s)}`);

function titulo(t) {
  console.log(`\n${cor(36, '='.repeat(66))}\n${cor(36, t)}\n${cor(36, '='.repeat(66))}`);
}

async function main() {
  const alvo = (() => {
    const i = process.argv.indexOf('--criar');
    return i >= 0 ? process.argv[i + 1] : null;
  })();

  titulo('1. Credencial');

  const { AZURE_PORTAL_TENANT_ID: TENANT, AZURE_PORTAL_CLIENT_ID: CLIENT, AZURE_PORTAL_CLIENT_SECRET: SEGREDO } =
    process.env;

  if (!TENANT || !CLIENT || !SEGREDO) {
    erro('Faltam as credenciais no ambiente. Veja o cabecalho deste arquivo.');
    process.exitCode = 1;
    return;
  }
  ok(`Client  ${CLIENT}`);

  const respToken = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(TENANT)}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT,
        client_secret: SEGREDO,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    },
  );
  const dadosToken = await respToken.json();
  if (!respToken.ok || !dadosToken.access_token) {
    erro(`O Azure recusou a credencial: ${dadosToken.error || respToken.status}`);
    process.exitCode = 1;
    return;
  }
  const token = dadosToken.access_token;
  ok('Token de aplicativo obtido.');

  titulo('2. Calendars.ReadWrite esta na claim roles do token?');

  let papeis = [];
  try {
    const corpo = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    papeis = JSON.parse(Buffer.from(corpo, 'base64').toString('utf8')).roles ?? [];
  } catch {
    aviso('Nao foi possivel ler as permissoes de dentro do token.');
  }
  for (const p of papeis) console.log(`        ${p}`);
  if (!papeis.length) console.log('        (nenhuma)');

  const temCalendario = papeis.includes('Calendars.ReadWrite');
  if (temCalendario) {
    ok('Calendars.ReadWrite CONCEDIDA. Da para criar reuniao do Teams com convite e serie.');
  } else {
    erro('Calendars.ReadWrite NAO esta concedida neste registro.');
    dica('Sem ela o portal nao cria evento em calendario nenhum, e a reuniao do');
    dica('Teams com convidados nao existe. O pedido pronto ao TI esta em');
    dica('docs/pedido-ao-ti-calendario.md.');
  }

  titulo('3. Evento de teste');

  if (!alvo) {
    dica('Nao executado. Para incluir: node scripts/diagnostico-calendario.mjs --criar voce@apsis.com.br');
    dica('Use a SUA caixa como convidado. Nunca e-mail de cliente real (LGPD).');
  } else if (!temCalendario) {
    dica('Pulado: sem a permissao a criacao falharia de qualquer forma.');
  } else {
    const inicio = new Date(Date.now() + 10 * 60_000);
    const fim = new Date(inicio.getTime() + 30 * 60_000);
    const resp = await fetch(`${GRAPH}/users/${encodeURIComponent(ORGANIZADOR)}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'Apsis Carbon - teste de integracao (pode apagar)',
        start: { dateTime: inicio.toISOString(), timeZone: 'UTC' },
        end: { dateTime: fim.toISOString(), timeZone: 'UTC' },
        attendees: [{ emailAddress: { address: alvo }, type: 'required' }],
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness',
      }),
    });

    if (resp.status === 201) {
      const evento = await resp.json();
      ok('Evento criado com sala do Teams.');
      dica(`joinUrl presente: ${evento.onlineMeeting?.joinUrl ? 'sim' : 'NAO (ver licenca do organizador)'}`);
      const del = await fetch(`${GRAPH}/users/${encodeURIComponent(ORGANIZADOR)}/events/${evento.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      dica(del.status === 204 ? 'Evento de teste apagado.' : `Falha ao apagar o teste (${del.status}) - apague a mao.`);
    } else {
      erro(`A criacao falhou (${resp.status}).`);
      if (resp.status === 403) {
        dica('403 com a permissao presente = ApplicationAccessPolicy do Exchange');
        dica('restringindo este appId, ou a caixa do organizador sem licenca.');
      }
      dica((await resp.text()).slice(0, 300));
    }
  }

  titulo(temCalendario ? 'Resultado: o caminho existe' : 'Resultado: BLOQUEADO no TI');
  if (!temCalendario) process.exitCode = 1;
}

await main();

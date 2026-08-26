// -----------------------------------------------------------------------------
// Reunioes do Teams pelo Microsoft Graph.
// -----------------------------------------------------------------------------
// POR QUE EVENTO DE CALENDARIO, e nao a API de onlineMeetings:
//
//   POST /users/{caixa}/onlineMeetings cria a SALA do Teams e mais nada. Ninguem
//   recebe convite, a reuniao nao entra na agenda de ninguem, e ainda e preciso
//   uma ApplicationAccessPolicy propria do Teams. Serve para sala efemera de
//   atendimento, nao para a weekly da equipe.
//
//   POST /users/{caixa}/events com isOnlineMeeting resolve as tres coisas de uma
//   vez: cria o evento na agenda, gera a sala do Teams (o joinUrl vem na
//   resposta) e o proprio Exchange dispara o convite para os participantes. O
//   portal nao envia e-mail nenhum aqui.
//
// A SERIE VIVE NO EVENTO-MESTRE. Quando `recurrence` e informado, o Graph cria
// UM evento que representa a serie inteira. A partir dai:
//   PATCH  /events/{id}              muda a serie toda
//   GET    /events/{id}/instances    lista as ocorrencias geradas
//   PATCH  /events/{idDaOcorrencia}  muda so aquela (vira excecao da serie)
//   DELETE /events/{id}              cancela a serie inteira
// E exatamente o "gerenciar toda a serie" que a tela precisa, e nao precisamos
// guardar ocorrencia por ocorrencia: o Graph e a fonte.
//
// FUSO HORARIO. Mandamos sempre com timeZone explicito e pedimos a resposta em
// 'America/Sao_Paulo' pelo cabecalho Prefer. Sem isso o Graph responde em UTC e
// a tela mostraria a weekly das 10h como 13h - erro que passa despercebido em
// desenvolvimento, onde ninguem confere o horario exibido contra o Outlook.
//
// PERMISSAO: Calendars.ReadWrite de APLICATIVO, no registro [Carbon] Portal.
// Conferir com scripts/diagnostico-calendario.mjs ou pela rota
// GET carbon-api/reunioes/diagnostico.

import { ErroGraph, obterTokenApp } from './graph.ts';

const GRAPH = 'https://graph.microsoft.com/v1.0';

/** Fuso das reunioes da equipe. O Graph aceita nome IANA. */
export const FUSO = 'America/Sao_Paulo';

export type Participante = {
  email: string;
  nome?: string | null;
  /** Opcional nao bloqueia a agenda de quem recebe. */
  opcional?: boolean;
};

export type Recorrencia = {
  /** Padrao de repeticao. 'nenhuma' cria evento avulso. */
  frequencia: 'nenhuma' | 'diaria' | 'semanal' | 'mensal';
  /** Para semanal: dias da semana em ingles, como o Graph espera. */
  dias?: string[];
  /** A cada quantas semanas/meses. Padrao 1. */
  intervalo?: number;
  /** Data do ultimo dia da serie (AAAA-MM-DD). Sem ela, a serie nao termina. */
  ate?: string | null;
};

export type ReuniaoTeams = {
  id: string;
  joinUrl: string | null;
  webLink: string | null;
  serie: boolean;
};

/**
 * Traduz a recorrencia da nossa tela para o formato do Graph.
 *
 * Devolve null para 'nenhuma', e o chamador simplesmente nao envia o campo -
 * mandar `recurrence: null` e diferente de omitir, e o Graph recusa o primeiro.
 */
function padraoDeRecorrencia(r: Recorrencia | null | undefined, inicio: string) {
  if (!r || r.frequencia === 'nenhuma') return null;

  const tipo = { diaria: 'daily', semanal: 'weekly', mensal: 'absoluteMonthly' }[r.frequencia];
  const diaInicio = inicio.slice(0, 10);

  const pattern: Record<string, unknown> = {
    type: tipo,
    interval: r.intervalo && r.intervalo > 0 ? r.intervalo : 1,
  };

  if (r.frequencia === 'semanal') {
    // Sem daysOfWeek o Graph recusa o padrao semanal. Na falta de escolha
    // explicita, repete no mesmo dia da semana em que a reuniao comeca - que e
    // o que qualquer pessoa espera ao marcar "toda semana".
    const nomes = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    pattern.daysOfWeek = r.dias?.length ? r.dias : [nomes[new Date(`${diaInicio}T12:00:00Z`).getUTCDay()]];
  }
  if (r.frequencia === 'mensal') {
    pattern.dayOfMonth = Number(diaInicio.slice(8, 10));
  }

  // `numbered` com data final e o unico range que nao cria serie infinita. Serie
  // sem fim entope a agenda de todo mundo e nao ha tela que a limpe depois.
  const range = r.ate
    ? { type: 'endDate', startDate: diaInicio, endDate: r.ate, recurrenceTimeZone: FUSO }
    : { type: 'noEnd', startDate: diaInicio, recurrenceTimeZone: FUSO };

  return { pattern, range };
}

async function chamar(
  caminho: string,
  opcoes: { metodo?: string; corpo?: unknown } = {},
): Promise<Response> {
  const token = await obterTokenApp();
  return fetch(`${GRAPH}${caminho}`, {
    method: opcoes.metodo ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Faz o Graph devolver start/end no fuso de Sao Paulo em vez de UTC.
      Prefer: `outlook.timezone="${FUSO}"`,
    },
    body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
  });
}

async function erroDoGraph(resp: Response, contexto: string): Promise<never> {
  const texto = await resp.text();
  let detalhe = texto.slice(0, 400);
  try {
    detalhe = JSON.parse(texto)?.error?.message ?? detalhe;
  } catch { /* corpo nao era JSON */ }

  // 403 aqui quase sempre e uma de DUAS coisas, e a distincao muda quem resolve:
  // permissao Calendars.ReadWrite nao consentida (TI do Azure), ou
  // ApplicationAccessPolicy do Exchange barrando a caixa (TI do Exchange).
  // Sem essa dica, o chamado vai para a equipe errada.
  if (resp.status === 403) {
    console.error(
      `Graph 403 em ${contexto}: falta Calendars.ReadWrite consentida, ou uma ` +
        `Application Access Policy do Exchange esta barrando este appId nesta caixa. ` +
        `Detalhe: ${detalhe}`,
    );
    // Codigo proprio: a tela traduz este caso para "a integracao com o Teams
    // ainda nao foi liberada", que e acionavel, em vez de "erro ao criar
    // reuniao", que manda a pessoa tentar de novo para sempre.
    throw new ErroGraph('calendario_sem_permissao', `Falha ao ${contexto}`, 403);
  }
  console.error(`Graph ${resp.status} em ${contexto}: ${detalhe}`);
  throw new ErroGraph('calendario_indisponivel', `Falha ao ${contexto}`, 502);
}

/**
 * Cria a reuniao do Teams e devolve o que a tela precisa guardar.
 *
 * `organizador` e a caixa DONA do evento. Nao e quem clicou no botao: com
 * permissao de aplicativo nao existe "usuario atual" para o Graph, e o evento
 * precisa morar em alguma caixa. Usamos a institucional, a mesma do envio de
 * e-mail, para a reuniao nao sumir quando alguem sair da empresa.
 */
export async function criarReuniao(opcoes: {
  organizador: string;
  titulo: string;
  /** ISO local, sem Z: '2026-09-01T10:00:00'. O fuso vai separado. */
  inicio: string;
  fim: string;
  participantes?: Participante[];
  descricao?: string | null;
  recorrencia?: Recorrencia | null;
}): Promise<ReuniaoTeams> {
  const recurrence = padraoDeRecorrencia(opcoes.recorrencia, opcoes.inicio);

  const corpo: Record<string, unknown> = {
    subject: opcoes.titulo,
    start: { dateTime: opcoes.inicio, timeZone: FUSO },
    end: { dateTime: opcoes.fim, timeZone: FUSO },
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness',
    attendees: (opcoes.participantes ?? []).map((p) => ({
      emailAddress: { address: p.email, name: p.nome ?? undefined },
      type: p.opcional ? 'optional' : 'required',
    })),
  };
  if (opcoes.descricao) {
    corpo.body = { contentType: 'HTML', content: opcoes.descricao };
  }
  if (recurrence) corpo.recurrence = recurrence;

  const resp = await chamar(`/users/${encodeURIComponent(opcoes.organizador)}/events`, {
    metodo: 'POST',
    corpo,
  });
  if (!resp.ok) await erroDoGraph(resp, 'criar a reuniao no Teams');

  const evento = await resp.json();
  return {
    id: evento.id,
    joinUrl: evento.onlineMeeting?.joinUrl ?? null,
    webLink: evento.webLink ?? null,
    serie: Boolean(recurrence),
  };
}

/**
 * Altera o evento. Com o id do MESTRE muda a serie inteira; com o id de uma
 * OCORRENCIA muda so aquela, e o Graph a transforma em excecao da serie.
 */
export async function atualizarReuniao(
  organizador: string,
  eventoId: string,
  campos: {
    titulo?: string;
    inicio?: string;
    fim?: string;
    participantes?: Participante[];
    descricao?: string | null;
  },
): Promise<ReuniaoTeams> {
  const corpo: Record<string, unknown> = {};
  if (campos.titulo !== undefined) corpo.subject = campos.titulo;
  if (campos.inicio) corpo.start = { dateTime: campos.inicio, timeZone: FUSO };
  if (campos.fim) corpo.end = { dateTime: campos.fim, timeZone: FUSO };
  if (campos.descricao !== undefined) {
    corpo.body = { contentType: 'HTML', content: campos.descricao ?? '' };
  }
  if (campos.participantes) {
    // A lista SUBSTITUI a anterior: o Graph nao tem "acrescentar participante".
    // Quem chama precisa mandar a lista completa, senao remove os ausentes sem
    // querer - e o convite de cancelamento sai para eles.
    corpo.attendees = campos.participantes.map((p) => ({
      emailAddress: { address: p.email, name: p.nome ?? undefined },
      type: p.opcional ? 'optional' : 'required',
    }));
  }

  const resp = await chamar(
    `/users/${encodeURIComponent(organizador)}/events/${encodeURIComponent(eventoId)}`,
    { metodo: 'PATCH', corpo },
  );
  if (!resp.ok) await erroDoGraph(resp, 'atualizar a reuniao');

  const evento = await resp.json();
  return {
    id: evento.id,
    joinUrl: evento.onlineMeeting?.joinUrl ?? null,
    webLink: evento.webLink ?? null,
    serie: Boolean(evento.recurrence),
  };
}

/** Cancela o evento. No mestre, cancela a serie inteira e avisa os convidados. */
export async function cancelarReuniao(organizador: string, eventoId: string): Promise<void> {
  const resp = await chamar(
    `/users/${encodeURIComponent(organizador)}/events/${encodeURIComponent(eventoId)}`,
    { metodo: 'DELETE' },
  );
  // 404 e sucesso do ponto de vista de quem pediu para cancelar: o evento nao
  // existe mais. Tratar como erro faria a tela recusar limpar um vinculo morto.
  if (!resp.ok && resp.status !== 404) await erroDoGraph(resp, 'cancelar a reuniao');
}

export type Ocorrencia = {
  id: string;
  inicio: string | null;
  fim: string | null;
  cancelada: boolean;
};

/**
 * Ocorrencias da serie dentro de uma janela.
 *
 * A janela e OBRIGATORIA no Graph (startDateTime e endDateTime), e faz sentido:
 * uma serie sem data final tem infinitas ocorrencias.
 */
export async function listarOcorrencias(
  organizador: string,
  eventoId: string,
  de: string,
  ate: string,
): Promise<Ocorrencia[]> {
  const busca = new URLSearchParams({
    startDateTime: de,
    endDateTime: ate,
    $select: 'id,start,end,isCancelled',
    $top: '100',
  });
  const resp = await chamar(
    `/users/${encodeURIComponent(organizador)}/events/${encodeURIComponent(eventoId)}/instances?${busca}`,
  );
  if (!resp.ok) await erroDoGraph(resp, 'listar as ocorrencias da serie');

  const dados = await resp.json();
  return ((dados.value ?? []) as Record<string, never>[]).map((o) => ({
    id: String(o.id),
    inicio: (o.start as { dateTime?: string } | undefined)?.dateTime ?? null,
    fim: (o.end as { dateTime?: string } | undefined)?.dateTime ?? null,
    cancelada: Boolean(o.isCancelled),
  }));
}

/**
 * Diz se a permissao de calendario esta CONCEDIDA, lendo a claim `roles` de
 * dentro do token.
 *
 * Existe porque permissao adicionada no portal do Azure e indistinguivel de
 * permissao consentida, vista de fora - e a diferenca so aparece como 403 na
 * primeira tentativa real. A tela usa isto para explicar o bloqueio em vez de
 * mostrar "erro ao criar reuniao".
 */
export async function calendarioDisponivel(): Promise<{ ok: boolean; papeis: string[] }> {
  try {
    const token = await obterTokenApp();
    const corpo = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(corpo));
    const papeis: string[] = json.roles ?? [];
    return { ok: papeis.includes('Calendars.ReadWrite'), papeis };
  } catch (e) {
    console.error('Falha ao inspecionar o token do Graph:', (e as Error).message);
    return { ok: false, papeis: [] };
  }
}

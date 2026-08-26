// -----------------------------------------------------------------------------
// Rotas da integracao das reunioes com o Microsoft Teams.
// -----------------------------------------------------------------------------
// GET    carbon-api/reunioes-teams/diagnostico   -> { disponivel, papeis, organizador }
// POST   carbon-api/reunioes/:id/teams           -> { reuniao }   cria o evento
// PATCH  carbon-api/reunioes/:id/teams           -> { reuniao }   altera a serie
// DELETE carbon-api/reunioes/:id/teams           -> { removido }  cancela
// GET    carbon-api/reunioes/:id/teams/ocorrencias -> { ocorrencias }
//
// ARQUIVO SEPARADO de reunioes.ts, de proposito: aquele modulo ja tem 640 linhas
// e cuida de reuniao, ata e pendencia. A integracao com o Graph tem falha
// externa, permissao propria e um modo degradado inteiro (funcionar sem o
// Teams), e misturar as duas coisas faria um arquivo que ninguem le por inteiro.
//
// O QUE NAO GUARDAMOS. Horario, participantes e recorrencia vivem no Graph, nao
// no banco. Guardar aqui criaria uma segunda verdade: alguem move a reuniao pelo
// Outlook e o portal passa a mostrar horario que nao existe. Guardamos o
// ponteiro (teams_evento_id) e o link de entrada, que e caro de buscar.
//
// PERMISSAO: Calendars.ReadWrite de aplicativo no registro [Carbon] Portal. A
// rota de diagnostico existe porque permissao adicionada no Azure e
// indistinguivel de permissao consentida vista de fora, e a diferenca so
// apareceria como 403 na primeira tentativa real.

import { respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';
import {
  ErroRota,
  type ErroBanco,
  exigir,
  lancarErroEscrita,
  lerData,
  lerTexto,
  LIMITE_TEXTO_LONGO,
} from './helpers.ts';
import {
  calendarioDisponivel,
  cancelarReuniao,
  criarReuniao,
  listarOcorrencias,
  type Participante,
  type Recorrencia,
} from '../../_shared/calendario.ts';
import { atualizarReuniao as atualizarNoGraph } from '../../_shared/calendario.ts';

const COLUNAS_REUNIAO =
  'id, projeto_id, tipo, titulo, data, parceiro, teams_evento_id, teams_join_url, ' +
  'teams_web_link, teams_serie, teams_organizador, teams_criado_em';

type Linha = Record<string, unknown>;

/**
 * Caixa que sera dona dos eventos.
 *
 * Vem de carbon_app_config, e nao de variavel de ambiente, pelo mesmo motivo do
 * resto do sistema: trocar a caixa organizadora vira um UPDATE, sem redeploy.
 * O default e a mesma caixa que ja envia os e-mails do Secure Share.
 */
async function organizadorPadrao(ctx: Contexto): Promise<string> {
  const { data } = await ctx.admin
    .from('carbon_app_config')
    .select('valor')
    .eq('chave', 'secure_share')
    .maybeSingle();

  const valor = (data as { valor?: Record<string, unknown> } | null)?.valor ?? {};
  const remetente = typeof valor.remetente === 'string' ? valor.remetente.trim() : '';
  return remetente || 'portal@apsis.com.br';
}

async function lerReuniao(ctx: Contexto, id: string): Promise<Linha> {
  const { data, error } = await ctx.admin
    .from('carbon_reunioes')
    .select(COLUNAS_REUNIAO)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_reunioes:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) throw new ErroRota('nao_encontrado', 404);
  return data as unknown as Linha;
}

/**
 * Le a lista de participantes do corpo.
 *
 * Aceita string simples ou objeto, porque a tela manda e-mail escolhido de uma
 * lista e o mesmo endpoint serve para chamada programatica.
 */
function lerParticipantes(bruto: unknown): Participante[] {
  if (!Array.isArray(bruto)) return [];
  const saida: Participante[] = [];

  for (const item of bruto) {
    const email = typeof item === 'string'
      ? item
      : typeof (item as { email?: unknown })?.email === 'string'
        ? (item as { email: string }).email
        : null;

    if (!email) continue;
    const limpo = email.trim().toLowerCase();

    // Validacao deliberadamente simples: quem decide se o endereco existe e o
    // Exchange, ao entregar o convite. Uma regex severa aqui recusaria endereco
    // valido e estranho, o que e pior do que um convite que volta.
    if (!limpo.includes('@') || limpo.length > 320) {
      throw new ErroRota('participante_invalido', 400, 'participantes');
    }

    const nome = typeof (item as { nome?: unknown })?.nome === 'string'
      ? (item as { nome: string }).nome
      : null;

    saida.push({ email: limpo, nome, opcional: (item as { opcional?: boolean })?.opcional === true });
  }

  // Duplicata gera convite repetido para a mesma pessoa. O Graph aceita e o
  // Outlook mostra o nome duas vezes na lista de participantes.
  const vistos = new Set<string>();
  return saida.filter((p) => (vistos.has(p.email) ? false : (vistos.add(p.email), true)));
}

const FREQUENCIAS = new Set(['nenhuma', 'diaria', 'semanal', 'mensal']);

function lerRecorrencia(bruto: unknown): Recorrencia | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const r = bruto as Record<string, unknown>;

  const frequencia = typeof r.frequencia === 'string' ? r.frequencia : 'nenhuma';
  if (!FREQUENCIAS.has(frequencia)) {
    throw new ErroRota('frequencia_invalida', 400, 'recorrencia.frequencia');
  }
  if (frequencia === 'nenhuma') return null;

  const intervalo = Number(r.intervalo);
  return {
    frequencia: frequencia as Recorrencia['frequencia'],
    dias: Array.isArray(r.dias) ? r.dias.filter((d): d is string => typeof d === 'string') : undefined,
    intervalo: Number.isFinite(intervalo) && intervalo > 0 ? Math.floor(intervalo) : 1,
    ate: lerData(r.ate, 'recorrencia.ate'),
  };
}

/**
 * Junta data (coluna `date`) e hora (texto 'HH:MM') no formato que o Graph quer.
 *
 * Sem `Z` e sem deslocamento, de proposito: o fuso viaja no campo timeZone, ao
 * lado. Mandar '2026-09-01T10:00:00Z' com timeZone America/Sao_Paulo faria o
 * Graph interpretar 10h UTC e agendar para as 7h da manha.
 */
function momento(data: string, hora: string): string {
  return `${data}T${hora}:00`;
}

function horaValida(v: unknown, campo: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) throw new ErroRota('hora_invalida', 400, campo);
  return s;
}

// -----------------------------------------------------------------------------
// GET reunioes-teams/diagnostico
// -----------------------------------------------------------------------------

async function diagnostico(ctx: Contexto): Promise<Response> {
  const { ok, papeis } = await calendarioDisponivel();
  return respostaJson({
    disponivel: ok,
    // A lista de papeis ajuda o suporte a ver o que FOI concedido quando o
    // esperado nao esta la. Nao e segredo: sao nomes de permissao, nao dado.
    papeis,
    organizador: await organizadorPadrao(ctx),
    permissao_exigida: 'Calendars.ReadWrite',
  });
}

// -----------------------------------------------------------------------------
// POST reunioes/:id/teams
// -----------------------------------------------------------------------------

async function criar(ctx: Contexto): Promise<Response> {
  const reuniao = await lerReuniao(ctx, ctx.params.id);

  if (reuniao.teams_evento_id) {
    // Sem isto, o segundo clique criaria um segundo evento e todos os
    // convidados receberiam o convite de novo. O indice unico no banco tambem
    // barra, mas aqui a mensagem explica.
    throw new ErroRota('reuniao_ja_tem_teams', 409);
  }

  const corpo = ctx.corpo ?? {};
  exigir(corpo, ['hora_inicio', 'hora_fim']);

  const inicio = horaValida(corpo.hora_inicio, 'hora_inicio');
  const fim = horaValida(corpo.hora_fim, 'hora_fim');
  if (fim <= inicio) throw new ErroRota('fim_antes_do_inicio', 400, 'hora_fim');

  const dia = String(reuniao.data);
  const organizador = await organizadorPadrao(ctx);

  const evento = await criarReuniao({
    organizador,
    titulo: String(reuniao.titulo),
    inicio: momento(dia, inicio),
    fim: momento(dia, fim),
    participantes: lerParticipantes(corpo.participantes),
    descricao: lerTexto(corpo.descricao, 'descricao', LIMITE_TEXTO_LONGO),
    recorrencia: lerRecorrencia(corpo.recorrencia),
  });

  const { data, error } = await ctx.admin
    .from('carbon_reunioes')
    .update({
      teams_evento_id: evento.id,
      teams_join_url: evento.joinUrl,
      teams_web_link: evento.webLink,
      teams_serie: evento.serie,
      teams_organizador: organizador,
      teams_criado_em: new Date().toISOString(),
    })
    .eq('id', ctx.params.id)
    .select(COLUNAS_REUNIAO)
    .single();

  if (error) {
    // O evento JA existe no Graph a esta altura. Deixar so o erro do banco
    // subir criaria um evento orfao na agenda de todo mundo, sem nada no
    // sistema que o alcance. Cancelamos antes de reportar.
    console.error('Falha ao gravar o vinculo do Teams; cancelando o evento criado:', error.message);
    try {
      await cancelarReuniao(organizador, evento.id);
    } catch (e) {
      console.error('O evento orfao NAO pode ser cancelado. Id no Graph:', evento.id, (e as Error).message);
    }
    lancarErroEscrita(error as ErroBanco, 'carbon_reunioes');
  }

  return respostaJson({ reuniao: data }, 201);
}

// -----------------------------------------------------------------------------
// PATCH reunioes/:id/teams
// -----------------------------------------------------------------------------

async function atualizar(ctx: Contexto): Promise<Response> {
  const reuniao = await lerReuniao(ctx, ctx.params.id);
  if (!reuniao.teams_evento_id) throw new ErroRota('reuniao_sem_teams', 409);

  const corpo = ctx.corpo ?? {};
  const dia = String(reuniao.data);

  const campos: Parameters<typeof atualizarNoGraph>[2] = {};
  if (corpo.titulo !== undefined) campos.titulo = lerTexto(corpo.titulo, 'titulo') ?? undefined;
  if (corpo.hora_inicio !== undefined) campos.inicio = momento(dia, horaValida(corpo.hora_inicio, 'hora_inicio'));
  if (corpo.hora_fim !== undefined) campos.fim = momento(dia, horaValida(corpo.hora_fim, 'hora_fim'));
  if (corpo.descricao !== undefined) campos.descricao = lerTexto(corpo.descricao, 'descricao', LIMITE_TEXTO_LONGO);
  if (corpo.participantes !== undefined) campos.participantes = lerParticipantes(corpo.participantes);

  if (Object.keys(campos).length === 0) throw new ErroRota('nada_para_atualizar', 400);

  const evento = await atualizarNoGraph(
    String(reuniao.teams_organizador ?? (await organizadorPadrao(ctx))),
    String(reuniao.teams_evento_id),
    campos,
  );

  const { data, error } = await ctx.admin
    .from('carbon_reunioes')
    .update({ teams_join_url: evento.joinUrl, teams_web_link: evento.webLink })
    .eq('id', ctx.params.id)
    .select(COLUNAS_REUNIAO)
    .single();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_reunioes');
  return respostaJson({ reuniao: data });
}

// -----------------------------------------------------------------------------
// DELETE reunioes/:id/teams
// -----------------------------------------------------------------------------

async function remover(ctx: Contexto): Promise<Response> {
  const reuniao = await lerReuniao(ctx, ctx.params.id);
  if (!reuniao.teams_evento_id) throw new ErroRota('reuniao_sem_teams', 409);

  await cancelarReuniao(
    String(reuniao.teams_organizador ?? (await organizadorPadrao(ctx))),
    String(reuniao.teams_evento_id),
  );

  // A reuniao do PORTAL continua existindo: cancelar o evento do Teams nao
  // apaga o registro nem a ata. Sao coisas diferentes, e confundi-las faria o
  // historico sumir junto com o convite.
  const { data, error } = await ctx.admin
    .from('carbon_reunioes')
    .update({
      teams_evento_id: null,
      teams_join_url: null,
      teams_web_link: null,
      teams_serie: false,
      teams_organizador: null,
      teams_criado_em: null,
    })
    .eq('id', ctx.params.id)
    .select(COLUNAS_REUNIAO)
    .single();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_reunioes');
  return respostaJson({ removido: true, reuniao: data });
}

// -----------------------------------------------------------------------------
// GET reunioes/:id/teams/ocorrencias
// -----------------------------------------------------------------------------

async function ocorrencias(ctx: Contexto): Promise<Response> {
  const reuniao = await lerReuniao(ctx, ctx.params.id);
  if (!reuniao.teams_evento_id) throw new ErroRota('reuniao_sem_teams', 409);

  // Janela padrao de 180 dias a partir da data da reuniao. O Graph EXIGE janela
  // (serie sem fim tem infinitas ocorrencias), e seis meses cobre a leitura
  // normal sem trazer duzentas linhas para a tela.
  const base = String(reuniao.data);
  const de = ctx.url.searchParams.get('de') || `${base}T00:00:00`;
  const ate = ctx.url.searchParams.get('ate') ||
    `${new Date(new Date(`${base}T12:00:00Z`).getTime() + 180 * 86_400_000).toISOString().slice(0, 10)}T23:59:59`;

  const lista = await listarOcorrencias(
    String(reuniao.teams_organizador ?? (await organizadorPadrao(ctx))),
    String(reuniao.teams_evento_id),
    de,
    ate,
  );

  return respostaJson({ ocorrencias: lista, de, ate });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'reunioes-teams/diagnostico', escrita: false, handler: diagnostico },
  { metodo: 'POST', padrao: 'reunioes/:id/teams', escrita: true, handler: criar },
  { metodo: 'PATCH', padrao: 'reunioes/:id/teams', escrita: true, handler: atualizar },
  { metodo: 'DELETE', padrao: 'reunioes/:id/teams', escrita: true, handler: remover },
  { metodo: 'GET', padrao: 'reunioes/:id/teams/ocorrencias', escrita: false, handler: ocorrencias },
];

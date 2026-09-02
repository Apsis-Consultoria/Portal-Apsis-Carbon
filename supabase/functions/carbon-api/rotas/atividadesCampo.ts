// -----------------------------------------------------------------------------
// Atividades de campo do programa Parakana, por Monitoring Report.
// -----------------------------------------------------------------------------
//   GET    carbon-api/atividades-campo          lista paginada, filtros relatorio/grupo/status/busca
//   POST   carbon-api/atividades-campo          registra atividade
//   PATCH  carbon-api/atividades-campo/:id
//   DELETE carbon-api/atividades-campo/:id
//
// E o diario que alimenta o Monitoring Report - a antiga "Atividade
// Parakana.xlsx". A partir de 01/09/2026 a equipe registra AQUI, nao no Excel.
//
// SEM DADO PESSOAL: a tabela nao tem coluna de responsavel nominal e o gatilho
// recusa e-mail e CPF em texto livre.

import { respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';
import {
  ErroRota,
  type ErroBanco,
  exigir,
  lancarErroEscrita,
  lerData,
  lerNumero,
  lerTexto,
  lerUuid,
} from './helpers.ts';
import { podeEscrever } from './acesso.ts';
// Portao de projeto: as funcoes rodam com service_role e ignoram RLS, entao quem
// autoriza e a participacao em carbon_projeto_equipe, conferida aqui dentro.
// Isto faltava nas quatro rotas deste arquivo ate 02/09/2026.
import { grupoVisivel, lerProjetoVisivel, projetosVisiveis } from './projetos.ts';

const COLUNAS =
  'id, projeto_id, grupo_id, relatorio, inicio, termino, atividade, instituicao,' +
  ' tipo, linha_estrategica, evidencia, valor, status, observacoes, origem_aba, origem_linha';

async function listar(ctx: Contexto): Promise<Response> {
  const pagina = Math.max(1, Number(ctx.url.searchParams.get('pagina') ?? '1') || 1);
  const limite = Math.min(200, Math.max(1, Number(ctx.url.searchParams.get('limite') ?? '50') || 50));
  const de = (pagina - 1) * limite;

  const visiveis = await projetosVisiveis(ctx);
  if (visiveis && visiveis.length === 0) {
    return respostaJson({
      atividades: [], total: 0, pagina, limite, pode_escrever: podeEscrever(ctx.registro),
    });
  }

  let consulta = ctx.admin
    .from('carbon_atividades_campo')
    .select(COLUNAS + ', carbon_grupos_comunitarios ( nome )', { count: 'exact' });
  if (visiveis) consulta = consulta.in('projeto_id', visiveis);

  const relatorio = ctx.url.searchParams.get('relatorio');
  if (relatorio) consulta = consulta.eq('relatorio', relatorio);
  /* O filtro de grupo passa por grupoVisivel em vez de ir cru para o .eq: alem de
     nao ser UUID validado (um valor torto virava erro 500 do Postgres em vez de
     400), pedir o grupo de outro projeto tem que dar 404, e nao lista vazia. */
  const grupo = ctx.url.searchParams.get('grupo');
  if (grupo) {
    const g = await grupoVisivel(ctx, lerUuid(grupo, 'grupo'));
    consulta = consulta.eq('grupo_id', g.id);
  }
  const status = ctx.url.searchParams.get('status');
  if (status) consulta = consulta.eq('status', status);
  /* Busca por trecho da atividade. ilike com % escapado: o termo vem do usuario
     e um % cru viraria curinga surpresa. */
  const busca = ctx.url.searchParams.get('busca');
  if (busca) consulta = consulta.ilike('atividade', '%' + busca.replaceAll('%', '\\%') + '%');

  const { data, error, count } = await consulta
    .order('inicio', { ascending: false, nullsFirst: false })
    .order('origem_linha')
    .range(de, de + limite - 1);
  if (error) {
    console.error('atividades-campo: falha ao listar', error);
    throw new ErroRota('erro_interno', 500);
  }

  const linhas = ((data ?? []) as unknown as Record<string, unknown>[]).map((a) => {
    const { carbon_grupos_comunitarios: bruto, ...resto } = a;
    const g = bruto as { nome?: string } | null;
    return { ...resto, grupo: g?.nome ?? null };
  });

  return respostaJson({
    atividades: linhas,
    total: count ?? linhas.length,
    pagina,
    limite,
    pode_escrever: podeEscrever(ctx.registro),
  });
}

const STATUS_VALIDOS = ['Concluído', 'Em andamento', 'Pendente', 'Dúvida'];

function lerCampos(corpo: Record<string, unknown>, exigirTudo: boolean) {
  const saida: Record<string, unknown> = {};
  if (exigirTudo || corpo.relatorio !== undefined) {
    exigir(corpo, ['relatorio']);
    const r = String(corpo.relatorio ?? '');
    if (!/^MR-\d+$/.test(r)) throw new ErroRota('relatorio_invalido', 400, 'relatorio');
    saida.relatorio = r;
  }
  if (exigirTudo || corpo.atividade !== undefined) {
    exigir(corpo, ['atividade']);
    saida.atividade = lerTexto(corpo.atividade, 'atividade', 600);
  }
  if (corpo.inicio !== undefined) {
    saida.inicio = corpo.inicio === null || corpo.inicio === '' ? null : lerData(corpo.inicio, 'inicio');
  }
  if (corpo.termino !== undefined) {
    saida.termino = corpo.termino === null || corpo.termino === '' ? null : lerData(corpo.termino, 'termino');
  }
  if (corpo.grupo_id !== undefined) saida.grupo_id = lerUuid(corpo.grupo_id, 'grupo_id');
  if (corpo.instituicao !== undefined) saida.instituicao = lerTexto(corpo.instituicao, 'instituicao', 200);
  if (corpo.tipo !== undefined) saida.tipo = lerTexto(corpo.tipo, 'tipo', 120);
  if (corpo.linha_estrategica !== undefined) {
    saida.linha_estrategica = lerTexto(corpo.linha_estrategica, 'linha_estrategica', 200);
  }
  if (corpo.evidencia !== undefined) saida.evidencia = lerTexto(corpo.evidencia, 'evidencia', 400);
  if (corpo.valor !== undefined) {
    saida.valor = corpo.valor === null || corpo.valor === '' ? null : lerNumero(corpo.valor, 'valor');
  }
  if (corpo.status !== undefined) {
    const s = lerTexto(corpo.status, 'status', 60);
    if (s && !STATUS_VALIDOS.includes(s)) throw new ErroRota('status_invalido', 400, 'status');
    saida.status = s;
  }
  if (corpo.observacoes !== undefined) saida.observacoes = lerTexto(corpo.observacoes, 'observacoes', 600);
  return saida;
}

function traduzir(erro: ErroBanco): never {
  if (erro?.code === 'P0001') {
    const msg = String(erro?.message ?? '');
    if (/e-mail|email/i.test(msg)) throw new ErroRota('texto_com_email', 400, 'atividade');
    if (/CPF/i.test(msg)) throw new ErroRota('texto_com_cpf', 400, 'atividade');
    throw new ErroRota('texto_com_dado_pessoal', 400, 'atividade');
  }
  lancarErroEscrita(erro, 'atividade');
}

function exigirEscrita(ctx: Contexto): void {
  if (!podeEscrever(ctx.registro)) throw new ErroRota('sem_permissao', 403);
}

/**
 * Resolve a atividade e confere o projeto dela. 404 tanto para "nao existe"
 * quanto para "nao participa", pelo mesmo caminho.
 *
 * Sem isto, o id na URL bastava: `podeEscrever` diz que o papel escreve, e nao
 * diz ONDE. Um gestor de outro projeto alterava e apagava atividade do Parakana.
 */
async function atividadeVisivel(ctx: Contexto, id: string): Promise<void> {
  const { data, error } = await ctx.admin
    .from('carbon_atividades_campo')
    .select('id, projeto_id')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('atividades-campo: falha ao resolver a atividade', error);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) throw new ErroRota('atividade_nao_encontrada', 404, 'id');
  if (!(await lerProjetoVisivel(ctx, String((data as { projeto_id: string }).projeto_id)))) {
    throw new ErroRota('atividade_nao_encontrada', 404, 'id');
  }
}

async function criar(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  const corpo = (ctx.corpo ?? {}) as Record<string, unknown>;
  exigir(corpo, ['grupo_id']);

  /* ANTES ERA `.limit(1).maybeSingle()` SEM ORDEM E SEM FILTRO: pegava um grupo
     qualquer da tabela e herdava o projeto_id dele. Enquanto so existia o
     Parakana funcionava por acidente; com o segundo projeto, a atividade cairia
     num projeto sorteado pelo planejador do Postgres. E nao havia portao. */
  const grupo = await grupoVisivel(ctx, lerUuid(corpo.grupo_id, 'grupo_id'));

  const { data, error } = await ctx.admin
    .from('carbon_atividades_campo')
    .insert({
      ...lerCampos(corpo, true),
      // Depois do spread, de proposito: projeto e grupo saem do grupo RESOLVIDO,
      // e nao do corpo, entao nao ha como reapontar o registro pelo payload.
      projeto_id: grupo.projeto_id,
      grupo_id: grupo.id,
    })
    .select(COLUNAS).single();
  if (error) traduzir(error as ErroBanco);
  return respostaJson({ atividade: data }, 201);
}

async function atualizar(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  await atividadeVisivel(ctx, ctx.params.id);

  const corpo = (ctx.corpo ?? {}) as Record<string, unknown>;
  const campos = lerCampos(corpo, false);

  /* Se o corpo pede para trocar de grupo, o grupo NOVO tambem passa pelo portao,
     e o projeto_id vai junto. Sem isto, um PATCH com o grupo_id de outro projeto
     movia a atividade para la, deixando projeto_id e grupo_id incoerentes -
     registro visivel pela equipe antiga e pendurado no grupo da nova. */
  if (campos.grupo_id !== undefined) {
    const destino = await grupoVisivel(ctx, String(campos.grupo_id));
    campos.grupo_id = destino.id;
    campos.projeto_id = destino.projeto_id;
  }

  if (!Object.keys(campos).length) throw new ErroRota('nada_para_alterar', 400);
  const { data, error } = await ctx.admin
    .from('carbon_atividades_campo').update(campos).eq('id', ctx.params.id)
    .select(COLUNAS).maybeSingle();
  if (error) traduzir(error as ErroBanco);
  if (!data) throw new ErroRota('atividade_nao_encontrada', 404, 'id');
  return respostaJson({ atividade: data });
}

async function remover(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  await atividadeVisivel(ctx, ctx.params.id);
  const { error } = await ctx.admin
    .from('carbon_atividades_campo').delete().eq('id', ctx.params.id);
  if (error) lancarErroEscrita(error as ErroBanco, 'atividade');
  return respostaJson({ removido: true });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'atividades-campo', escrita: false, handler: listar },
  { metodo: 'POST', padrao: 'atividades-campo', escrita: true, handler: criar },
  { metodo: 'PATCH', padrao: 'atividades-campo/:id', escrita: true, handler: atualizar },
  { metodo: 'DELETE', padrao: 'atividades-campo/:id', escrita: true, handler: remover },
];

export default rotas;

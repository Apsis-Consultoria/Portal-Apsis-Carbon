// -----------------------------------------------------------------------------
// Rotas do PDD - Project Design Document (issue #2).
// -----------------------------------------------------------------------------
// GET   carbon-api/projetos/:id/pdd    -> { capitulos: [...], progresso: {...} }
// POST  carbon-api/projetos/:id/pdd    -> { criados, capitulos, progresso }
// PATCH carbon-api/pdd-capitulos/:id   -> { capitulo }
//
// Objetos SQL de que este modulo depende (migration 20260812150000_projetos_e_pdd):
//   public.carbon_pdd_criar_do_template(p_projeto_id uuid, p_standard text default null)
//   public.carbon_pdd_progresso(p_projeto_id uuid) returns jsonb

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { respostaErro, respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';
import {
  ErroRota,
  type ErroBanco,
  lancarErroEscrita,
  lerTexto,
  lerUuid,
  LIMITE_TEXTO_CURTO,
  LIMITE_TEXTO_LONGO,
  paraNumero,
  veioNoCorpo,
} from './helpers.ts';
import { lerProjetoVisivel } from './projetos.ts';

const COLUNAS_CAPITULO =
  'id, projeto_id, capitulo, nome, cap, nivel, opcional, ordem, status, ' +
  'responsavel_id, observacoes, criado_em, atualizado_em';

const STATUS_CAPITULO = new Set([
  'nao_iniciado',
  'em_andamento',
  'em_revisao',
  'concluido',
  'nao_aplicavel',
]);

// Progresso neutro para quando o projeto ainda nao tem capitulos. Existe para o
// frontend nunca receber undefined e nunca dividir por zero.
const PROGRESSO_VAZIO = {
  total: 0,
  concluidos: 0,
  nao_aplicaveis: 0,
  pct: 0,
  por_capitulo: [] as unknown[],
};

/**
 * Capitulos do PDD do projeto e o progresso agregado.
 *
 * O progresso vem da funcao SQL carbon_pdd_progresso, nao de contagem aqui: a
 * regra de que capitulo 'nao_aplicavel' sai do denominador (senao o PDD nunca
 * fecha 100%, porque os criterios opcionais podem nao se aplicar) tem que ter
 * uma implementacao unica. Duplicar em TypeScript seria garantir divergencia.
 */
async function lerPdd(
  admin: SupabaseClient,
  projetoId: string,
): Promise<{ capitulos: unknown[]; progresso: unknown }> {
  const [capitulos, progresso] = await Promise.all([
    admin
      .from('carbon_pdd_capitulos')
      .select(COLUNAS_CAPITULO)
      .eq('projeto_id', projetoId)
      .order('ordem', { ascending: true }),
    admin.rpc('carbon_pdd_progresso', { p_projeto_id: projetoId }),
  ]);

  if (capitulos.error) {
    console.error('Falha ao ler carbon_pdd_capitulos:', capitulos.error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (progresso.error) {
    console.error('Falha em carbon_pdd_progresso:', progresso.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  return {
    capitulos: (capitulos.data ?? []) as unknown[],
    progresso: progresso.data ?? PROGRESSO_VAZIO,
  };
}

async function obter(ctx: Contexto): Promise<Response> {
  const projetoId = ctx.params.id;
  const projeto = await lerProjetoVisivel(ctx, projetoId);
  if (!projeto) return respostaErro('nao_encontrado', 404);

  const { capitulos, progresso } = await lerPdd(ctx.admin, projetoId);
  return respostaJson({ capitulos, progresso });
}

/**
 * Cria os capitulos do PDD a partir do template do standard do projeto.
 *
 * Responde 200, nao 201: a funcao SQL e idempotente e pode criar zero capitulos
 * (o botao "criar PDD" clicado duas vezes nao duplica nada). O cliente sabe o que
 * aconteceu pelo campo criados.
 */
async function criar(ctx: Contexto): Promise<Response> {
  const projetoId = ctx.params.id;
  const projeto = await lerProjetoVisivel(ctx, projetoId);
  if (!projeto) return respostaErro('nao_encontrado', 404);

  const { data, error } = await ctx.admin.rpc('carbon_pdd_criar_do_template', {
    p_projeto_id: projetoId,
  });
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_pdd_criar_do_template');

  const criados = paraNumero(data) ?? 0;
  const { capitulos, progresso } = await lerPdd(ctx.admin, projetoId);
  return respostaJson({ criados, capitulos, progresso });
}

/**
 * Atualiza um capitulo do PDD.
 *
 * Lista branca curta e proposital: numeracao, nome, nivel e ordem vem do
 * template e nao sao editaveis por esta rota. O que o time mexe no dia a dia e
 * status, responsavel e observacoes.
 */
async function atualizarCapitulo(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const dados: Record<string, unknown> = {};

  if (veioNoCorpo(corpo, 'status')) {
    const status = lerTexto(corpo.status, 'status', LIMITE_TEXTO_CURTO);
    if (!status || !STATUS_CAPITULO.has(status)) {
      throw new ErroRota('status_invalido', 400);
    }
    dados.status = status;
  }

  if (veioNoCorpo(corpo, 'responsavel_id')) {
    dados.responsavel_id = lerUuid(corpo.responsavel_id, 'responsavel_id');
  }

  if (veioNoCorpo(corpo, 'observacoes')) {
    dados.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO);
  }

  if (Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }

  // PORTAO. O update abaixo filtra so por id do CAPITULO, entao sem isto qualquer
  // colaborador com papel de escrita editaria capitulo de PDD de projeto que nem
  // pode enxergar - so precisaria do uuid. Resolvemos o dono antes de escrever.
  //
  // Os dois fracassos possiveis (capitulo inexistente, projeto invisivel) respondem
  // o MESMO 404, para a rota nao virar oraculo de existencia de capitulo.
  const { data: dono, error: erroDono } = await ctx.admin
    .from('carbon_pdd_capitulos')
    .select('projeto_id')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (erroDono) {
    console.error('Falha ao resolver o projeto do capitulo:', erroDono.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!dono) return respostaErro('nao_encontrado', 404);
  if (!(await lerProjetoVisivel(ctx, String(dono.projeto_id)))) {
    return respostaErro('nao_encontrado', 404);
  }

  const { data, error } = await ctx.admin
    .from('carbon_pdd_capitulos')
    .update(dados)
    .eq('id', ctx.params.id)
    .select(COLUNAS_CAPITULO)
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_pdd_capitulos', 'status_invalido');
  if (!data) return respostaErro('nao_encontrado', 404);

  return respostaJson({ capitulo: data });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'projetos/:id/pdd', escrita: false, handler: obter },
  { metodo: 'POST', padrao: 'projetos/:id/pdd', escrita: true, handler: criar },
  { metodo: 'PATCH', padrao: 'pdd-capitulos/:id', escrita: true, handler: atualizarCapitulo },
];

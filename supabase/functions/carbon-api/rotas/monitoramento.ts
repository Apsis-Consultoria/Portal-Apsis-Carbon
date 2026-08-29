// -----------------------------------------------------------------------------
// Rotas do relatorio de monitoramento - Monitoring Report (issue #3).
// -----------------------------------------------------------------------------
// GET   carbon-api/projetos/:id/monitoramento   -> { capitulos, progresso }
// POST  carbon-api/projetos/:id/monitoramento   -> { criados, capitulos, progresso }
// PATCH carbon-api/mr-capitulos/:id             -> { capitulo }
// POST  carbon-api/mr-capitulos/:id/rodada      -> { capitulo, rodada }
//
// O QUE ESTE DOMINIO TEM DE PROPRIO em relacao ao PDD: o status de um capitulo do
// relatorio de monitoramento e um PAR (estado, rodada), porque o fluxo observado
// no Notion nao e "rascunho -> pronto" e sim um ciclo com numero de volta
// ('Revisao 2'). Ver o cabecalho da migration 20260814091000_monitoramento.sql.
// A rodada nunca e incrementada aqui: quem soma e o banco, na rota /rodada, para
// duas devolucoes simultaneas nao perderem uma volta.
//
// Objetos SQL de que este modulo depende (migration 20260814091000_monitoramento):
//   public.carbon_mr_criar_do_template(p_projeto_id uuid, p_standard text default null)
//   public.carbon_mr_capitulo_nova_rodada(p_capitulo_id uuid) returns integer
//   public.carbon_mr_progresso(p_projeto_id uuid) returns jsonb
//
// PARA PUBLICAR: acrescentar em rotas/indice.ts um import e um spread destas
// rotas. E o unico ponto compartilhado do backend (ver o cabecalho do indice).

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
  EMBED_RESPONSAVEL,
  achatarResponsavel,
} from './helpers.ts';
import { exigirProjetoDoRegistro, lerProjetoVisivel } from './projetos.ts';

const COLUNAS_CAPITULO =
  'id, projeto_id, capitulo, nome, cap, nivel, ordem, estado, rodada, ' +
  'responsavel_id, orientacao, observacoes, criado_em, atualizado_em' + ', ' + EMBED_RESPONSAVEL;

/** Espelha o CHECK de carbon_mr_capitulos.estado. */
const ESTADOS_CAPITULO = new Set([
  'nao_iniciado',
  'em_andamento',
  'em_revisao',
  'concluido',
  'nao_aplicavel',
]);

// Mesmo limite do check carbon_mr_capitulos_rodada_chk. Duplicado de proposito:
// recusar aqui devolve 'campo_invalido' com o nome do campo, enquanto deixar o
// banco recusar devolveria uma violacao de check sem dizer qual coluna.
const RODADA_MAXIMA = 99;

/**
 * Progresso neutro para quando o projeto ainda nao tem relatorio.
 *
 * Existe para o frontend nunca receber undefined e nunca dividir por zero. As
 * chaves e os valores sao os MESMOS que public.carbon_mr_progresso devolve com a
 * base vazia, inclusive rodada_maxima = 1 (rodada zero nao existe).
 */
const PROGRESSO_VAZIO = {
  total: 0,
  concluidos: 0,
  nao_aplicaveis: 0,
  pct: 0,
  rodada_maxima: 1,
  por_estado: {
    nao_iniciado: 0,
    em_andamento: 0,
    em_revisao: 0,
    concluido: 0,
    nao_aplicavel: 0,
  },
  por_rodada: [] as unknown[],
  por_capitulo: [] as unknown[],
};

/**
 * Rodada vinda do corpo de um PATCH.
 *
 * A rota /rodada e o caminho normal para AVANCAR. Este campo existe para
 * CORRIGIR: alguem clicou duas vezes, ou o relatorio foi importado com a volta
 * errada. Por isso aceita qualquer valor da faixa, inclusive menor que o atual.
 *
 * Exige inteiro: rodada 2.5 nao significa nada, e o Postgres arredondaria em
 * silencio ao gravar em integer.
 */
function lerRodada(valor: unknown): number {
  const n = paraNumero(valor);
  if (n === null || !Number.isInteger(n) || n < 1 || n > RODADA_MAXIMA) {
    throw new ErroRota('campo_invalido', 400, 'rodada');
  }
  return n;
}

/**
 * Capitulos do relatorio do projeto e o progresso agregado.
 *
 * O progresso vem da funcao SQL carbon_mr_progresso, nao de contagem aqui: a
 * regra de que capitulo 'nao_aplicavel' sai do denominador, e a apuracao da
 * rodada maxima, precisam de UMA implementacao. Duplicar em TypeScript seria
 * garantir divergencia entre a tela e o banco.
 */
async function lerRelatorio(
  admin: SupabaseClient,
  projetoId: string,
): Promise<{ capitulos: unknown[]; progresso: unknown }> {
  const [capitulos, progresso] = await Promise.all([
    admin
      .from('carbon_mr_capitulos')
      .select(COLUNAS_CAPITULO)
      .eq('projeto_id', projetoId)
      .order('ordem', { ascending: true }),
    admin.rpc('carbon_mr_progresso', { p_projeto_id: projetoId }),
  ]);

  if (capitulos.error) {
    console.error('Falha ao ler carbon_mr_capitulos:', capitulos.error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (progresso.error) {
    console.error('Falha em carbon_mr_progresso:', progresso.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  return {
    capitulos: ((capitulos.data ?? []) as unknown as Record<string, unknown>[])
      .map(achatarResponsavel),
    progresso: progresso.data ?? PROGRESSO_VAZIO,
  };
}

/** Le um capitulo pelo id. null quando nao existe. */
async function lerCapitulo(
  admin: SupabaseClient,
  id: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await admin
    .from('carbon_mr_capitulos')
    .select(COLUNAS_CAPITULO)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_mr_capitulos:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return data ? achatarResponsavel(data as unknown as Record<string, unknown>) : null;
}

async function obter(ctx: Contexto): Promise<Response> {
  const projetoId = ctx.params.id;
  const projeto = await lerProjetoVisivel(ctx, projetoId);
  if (!projeto) return respostaErro('nao_encontrado', 404);

  const { capitulos, progresso } = await lerRelatorio(ctx.admin, projetoId);
  return respostaJson({ capitulos, progresso });
}

/**
 * Cria os capitulos do relatorio a partir do template do standard do projeto.
 *
 * Responde 200, nao 201: a funcao SQL e idempotente e pode criar zero capitulos
 * (o botao clicado duas vezes nao duplica nada). O cliente sabe o que aconteceu
 * pelo campo criados combinado com o tamanho da lista de capitulos.
 */
async function criar(ctx: Contexto): Promise<Response> {
  const projetoId = ctx.params.id;
  const projeto = await lerProjetoVisivel(ctx, projetoId);
  if (!projeto) return respostaErro('nao_encontrado', 404);

  const { data, error } = await ctx.admin.rpc('carbon_mr_criar_do_template', {
    p_projeto_id: projetoId,
  });
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_mr_criar_do_template');

  const criados = paraNumero(data) ?? 0;
  const { capitulos, progresso } = await lerRelatorio(ctx.admin, projetoId);
  return respostaJson({ criados, capitulos, progresso });
}

/**
 * Atualiza um capitulo do relatorio.
 *
 * Lista branca curta e proposital: numeracao, nome, cap, nivel e ordem vem do
 * template e nao sao editaveis por esta rota. O que o time mexe no dia a dia e
 * estado, rodada, responsavel, orientacao e observacoes.
 */
async function atualizarCapitulo(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const dados: Record<string, unknown> = {};

  if (veioNoCorpo(corpo, 'estado')) {
    const estado = lerTexto(corpo.estado, 'estado', LIMITE_TEXTO_CURTO);
    if (!estado || !ESTADOS_CAPITULO.has(estado)) {
      throw new ErroRota('estado_invalido', 400);
    }
    dados.estado = estado;
  }

  if (veioNoCorpo(corpo, 'rodada')) {
    dados.rodada = lerRodada(corpo.rodada);
  }

  if (veioNoCorpo(corpo, 'responsavel_id')) {
    dados.responsavel_id = lerUuid(corpo.responsavel_id, 'responsavel_id');
  }

  // Orientacao ao redator e observacao de andamento usam o limite LONGO: as duas
  // sao texto corrido escrito por pessoa, e um limite curto cortaria instrucao no
  // meio da frase.
  if (veioNoCorpo(corpo, 'orientacao')) {
    dados.orientacao = lerTexto(corpo.orientacao, 'orientacao', LIMITE_TEXTO_LONGO);
  }

  if (veioNoCorpo(corpo, 'observacoes')) {
    dados.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO);
  }

  if (Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }

  // PORTAO, igual ao de pdd.ts. O modulo gemeo fechava isto desde o inicio e
  // este nao: assimetria entre irmaos e o cheiro que a auditoria seguiu.
  await exigirProjetoDoRegistro(ctx, 'carbon_mr_capitulos', ctx.params.id);

  const { data, error } = await ctx.admin
    .from('carbon_mr_capitulos')
    .update(dados)
    .eq('id', ctx.params.id)
    .select(COLUNAS_CAPITULO)
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_mr_capitulos', 'estado_invalido');
  if (!data) return respostaErro('nao_encontrado', 404);

  return respostaJson({ capitulo: achatarResponsavel(data as unknown as Record<string, unknown>) });
}

/**
 * Abre a proxima rodada de revisao do capitulo.
 *
 * E o gesto central desta tela: devolver um capitulo para revisao incrementa a
 * volta e leva o estado para em_revisao. O incremento acontece DENTRO do banco
 * (public.carbon_mr_capitulo_nova_rodada, com FOR UPDATE), e nao aqui, porque
 * rodada e contador: ler, somar 1 e gravar perderia uma volta sempre que duas
 * pessoas devolvessem o mesmo capitulo ao mesmo tempo.
 *
 * Sem corpo de proposito: nao ha nada para o cliente informar.
 */
async function novaRodada(ctx: Contexto): Promise<Response> {
  const capituloId = ctx.params.id;

  // PORTAO ANTES DA RPC. A funcao SQL e SECURITY DEFINER e recebe o id cru da
  // URL: ela nao tem como saber quem chamou nem se o capitulo e de um projeto
  // que a pessoa enxerga. Sem esta linha, abrir rodada de revisao no Monitoring
  // Report de outro projeto custava so o uuid.
  await exigirProjetoDoRegistro(ctx, 'carbon_mr_capitulos', capituloId);

  const { data, error } = await ctx.admin.rpc('carbon_mr_capitulo_nova_rodada', {
    p_capitulo_id: capituloId,
  });

  if (error) {
    // RAISE de plpgsql sem errcode chega sempre como P0001 (raise_exception),
    // entao a recusa de negocio e reconhecida pela mensagem que a funcao SQL
    // padroniza ('rodada_invalida: ...') e nao pelo SQLSTATE. Mesmo padrao usado
    // em rotas/projetos.ts para 'geometria_invalida'.
    if (String(error.message ?? '').includes('rodada_invalida')) {
      // 409 e nao 400: o pedido esta bem formado, o ESTADO do capitulo e que nao
      // permite abrir rodada (nao_aplicavel esta fora do ciclo de revisao).
      throw new ErroRota('rodada_invalida', 409);
    }
    lancarErroEscrita(error as ErroBanco, 'carbon_mr_capitulo_nova_rodada');
  }

  // A funcao devolve NULL quando o capitulo nao existe: 404 honesto sem consulta
  // extra antes de escrever.
  const rodada = paraNumero(data);
  if (rodada === null) return respostaErro('nao_encontrado', 404);

  // Releitura em vez de returning: a trigger de atualizado_em roda depois do
  // UPDATE da funcao, e a tela mostra o capitulo inteiro.
  const capitulo = await lerCapitulo(ctx.admin, capituloId);
  if (!capitulo) return respostaErro('nao_encontrado', 404);

  return respostaJson({ capitulo, rodada });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'projetos/:id/monitoramento', escrita: false, handler: obter },
  { metodo: 'POST', padrao: 'projetos/:id/monitoramento', escrita: true, handler: criar },
  { metodo: 'PATCH', padrao: 'mr-capitulos/:id', escrita: true, handler: atualizarCapitulo },
  { metodo: 'POST', padrao: 'mr-capitulos/:id/rodada', escrita: true, handler: novaRodada },
];

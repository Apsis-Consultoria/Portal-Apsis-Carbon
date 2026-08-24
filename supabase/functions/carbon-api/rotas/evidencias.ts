// -----------------------------------------------------------------------------
// Rotas do checklist de evidencias da auditoria (issue #4).
// -----------------------------------------------------------------------------
// GET   carbon-api/projetos/:id/evidencias  -> { itens, progresso, vinculos_disponiveis }
// POST  carbon-api/projetos/:id/evidencias  -> { criados, itens, progresso, vinculos_disponiveis }
// PATCH carbon-api/evidencia-itens/:id      -> { item }
//
// Objetos SQL de que este modulo depende (migration 20260814092000_evidencias):
//   public.carbon_evidencia_itens
//   public.carbon_evidencias_criar_do_template(p_projeto_id uuid, p_standard text default null)
//   public.carbon_evidencias_progresso(p_projeto_id uuid) returns jsonb
//
// DOIS EIXOS, e por isso duas colunas de estado. status_resposta diz se o texto de
// resposta ao item foi redigido; estado_evidencia diz se o arquivo que comprova
// existe e foi aceito pela VVB. Sao independentes: um item pode estar com resposta
// concluida e evidencia pendente. Nenhuma rota daqui deriva um do outro.
//
// PUBLICACAO: para estas rotas entrarem no ar falta UMA linha de import e UMA de
// spread em rotas/indice.ts, que e arquivo compartilhado da fundacao e nao foi
// tocado por este modulo (o Deno Deploy nao tem equivalente do import.meta.glob,
// ver o cabecalho do indice).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { respostaErro, respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';
import {
  ErroRota,
  type ErroBanco,
  lancarErroEscrita,
  lerEnum,
  lerTexto,
  lerUuid,
  LIMITE_TEXTO_LONGO,
  paraNumero,
  veioNoCorpo,
} from './helpers.ts';
import { lerProjetoVisivel } from './projetos.ts';

const COLUNAS_ITEM =
  'id, projeto_id, codigo, secao, exigencia, ordem, status_resposta, ' +
  'estado_evidencia, responsavel_id, encaminhado_para, observacoes, ' +
  'criado_em, atualizado_em';

/** Espelha o CHECK de carbon_evidencia_itens.status_resposta (eixo 1). */
const STATUS_RESPOSTA = new Set([
  'nao_iniciado',
  'em_andamento',
  'concluido',
  'nao_aplicavel',
]);

/** Espelha o CHECK de carbon_evidencia_itens.estado_evidencia (eixo 2). */
const ESTADO_EVIDENCIA = new Set([
  'pendente',
  'anexada',
  'aceita',
  'nao_aplicavel',
]);

/** Espelha o CHECK de carbon_evidencia_itens.encaminhado_para. */
const ENCAMINHAMENTOS = new Set(['juridico', 'tecnico', 'externo']);

// Tabela de ligacao muitos-para-muitos entre documento e item de checklist. Ela
// pertence ao dominio de Documentos (issue #6), NAO a este modulo: aqui ela e
// apenas lida, e a leitura degrada sozinha quando a tabela ainda nao existe.
const TABELA_VINCULOS = 'carbon_documento_vinculos';

/**
 * DIVERGENCIA DE VOCABULARIO CONHECIDA, e o motivo de haver DOIS valores aqui.
 *
 * O contrato deste modulo pede tipo_alvo = 'evidencia_item'; o dominio de Documentos
 * documenta e grava 'evidencia' (ver o comentario da coluna tipo_alvo na migration
 * 20260814090000_documentos e o dataset de demonstracao daquele dominio). Como
 * carbon_documento_vinculos aceita qualquer texto em snake_case, escolher um so lado
 * faria a contagem devolver zero em silencio - o pior resultado possivel numa tela
 * cujo proposito e justamente nao mentir sobre onde esta a evidencia.
 *
 * Aceitamos os dois na LEITURA, o que e barato (o indice e (tipo_alvo, alvo_id)) e
 * funciona qualquer que seja o valor escolhido. Padronizar em um unico valor e
 * decisao para quem consolida as frentes; enquanto nao acontecer, nada quebra.
 */
const TIPOS_ALVO_VINCULO = ['evidencia_item', 'evidencia'];

// Progresso neutro para projeto sem checklist. Existe para o frontend nunca
// receber undefined e nunca dividir por zero. Mesma forma que a funcao SQL
// carbon_evidencias_progresso devolve.
const PROGRESSO_VAZIO = {
  itens: 0,
  resposta: { total: 0, concluidos: 0, em_andamento: 0, nao_aplicaveis: 0, pct: 0 },
  evidencia: {
    total: 0,
    aceitas: 0,
    anexadas: 0,
    pendentes: 0,
    nao_aplicaveis: 0,
    pct: 0,
  },
  encaminhados: 0,
  na_com_evidencia_pendente: 0,
  por_secao: [] as unknown[],
};

type LinhaItem = { id: string } & Record<string, unknown>;

/**
 * Quantos documentos estao vinculados a cada item, ou null quando a contagem nao
 * pode ser feita.
 *
 * POR QUE null E NAO ZERO. Enquanto o dominio de Documentos nao estiver aplicado, a
 * tabela de vinculos nao existe e a consulta falha. Devolver zero nessa situacao
 * seria afirmar na tela que o item nao tem documento nenhum, que e exatamente a
 * informacao que o checklist existe para dar: "esta numa pasta em algum lugar" ja e
 * o problema, e "nenhum documento" mentindo seria pior. Com null, a tela mostra que
 * o vinculo ainda nao esta disponivel em vez de inventar um numero.
 *
 * As colunas lidas (tipo_alvo, alvo_id) sao o contrato acordado com o dominio de
 * Documentos. Se por la elas tiverem outro nome, o erro cai nesta mesma checagem, a
 * contagem vira null e nada mais na tela quebra.
 */
async function contarVinculos(
  admin: SupabaseClient,
  ids: string[],
): Promise<Record<string, number> | null> {
  // Sem item nao ha o que contar, e nao vale pagar uma consulta (nem descobrir se a
  // tabela existe) para um checklist vazio.
  if (ids.length === 0) return {};

  const { data, error } = await admin
    .from(TABELA_VINCULOS)
    .select('alvo_id')
    .in('tipo_alvo', TIPOS_ALVO_VINCULO)
    .in('alvo_id', ids);

  if (error) {
    // 42P01 relation does not exist, 42703 column does not exist, PGRST205 tabela
    // desconhecida pelo PostgREST: todos significam "o dominio de Documentos ainda
    // nao esta no ar". Nao e erro de servidor e nao pode virar 500.
    console.warn(
      `Contagem de vinculos indisponivel (${TABELA_VINCULOS}): ${error.message}`,
    );
    return null;
  }

  const contagem: Record<string, number> = {};
  for (const linha of (data ?? []) as { alvo_id?: unknown }[]) {
    const alvo = typeof linha.alvo_id === 'string' ? linha.alvo_id : null;
    if (!alvo) continue;
    contagem[alvo] = (contagem[alvo] ?? 0) + 1;
  }
  return contagem;
}

/**
 * Itens do checklist do projeto, o progresso agregado e a contagem de documentos.
 *
 * O progresso vem da funcao SQL carbon_evidencias_progresso, nao de contagem aqui:
 * a regra de que 'nao_aplicavel' sai do denominador DE CADA EIXO (senao o checklist
 * nunca fecha) precisa ter implementacao unica. Duplicar em TypeScript seria
 * garantir divergencia entre a tela e o banco.
 */
async function lerChecklist(
  admin: SupabaseClient,
  projetoId: string,
): Promise<{ itens: unknown[]; progresso: unknown; vinculos_disponiveis: boolean }> {
  const [itens, progresso] = await Promise.all([
    admin
      .from('carbon_evidencia_itens')
      .select(COLUNAS_ITEM)
      .eq('projeto_id', projetoId)
      .order('ordem', { ascending: true }),
    admin.rpc('carbon_evidencias_progresso', { p_projeto_id: projetoId }),
  ]);

  if (itens.error) {
    console.error('Falha ao ler carbon_evidencia_itens:', itens.error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (progresso.error) {
    console.error('Falha em carbon_evidencias_progresso:', progresso.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const linhas = (itens.data ?? []) as LinhaItem[];
  const contagem = await contarVinculos(admin, linhas.map((l) => l.id));
  const disponivel = contagem !== null;
  // Mapa desempacotado em variavel propria em vez de confiar na narrowing do
  // `disponivel` dentro do callback: menos dependencia de versao do TypeScript.
  const porItem = contagem ?? {};

  return {
    itens: linhas.map((linha) => ({
      ...linha,
      documentos_vinculados: disponivel ? (porItem[linha.id] ?? 0) : null,
    })),
    progresso: progresso.data ?? PROGRESSO_VAZIO,
    vinculos_disponiveis: disponivel,
  };
}

async function obter(ctx: Contexto): Promise<Response> {
  const projetoId = ctx.params.id;
  const projeto = await lerProjetoVisivel(ctx, projetoId);
  if (!projeto) return respostaErro('nao_encontrado', 404);

  return respostaJson(await lerChecklist(ctx.admin, projetoId));
}

/**
 * Cria o checklist do projeto a partir do template do standard dele.
 *
 * Responde 200, nao 201: a funcao SQL e idempotente e pode criar zero itens (o
 * botao clicado duas vezes nao duplica nada). O cliente sabe o que aconteceu pelo
 * campo criados, e distingue "ja estava completo" de "nao existe template para este
 * standard" pela lista de itens que volta junto.
 */
async function criar(ctx: Contexto): Promise<Response> {
  const projetoId = ctx.params.id;
  const projeto = await lerProjetoVisivel(ctx, projetoId);
  if (!projeto) return respostaErro('nao_encontrado', 404);

  const { data, error } = await ctx.admin.rpc('carbon_evidencias_criar_do_template', {
    p_projeto_id: projetoId,
  });
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_evidencias_criar_do_template');

  const criados = paraNumero(data) ?? 0;
  return respostaJson({ criados, ...(await lerChecklist(ctx.admin, projetoId)) });
}

/**
 * Atualiza um item do checklist.
 *
 * Lista branca curta e proposital: codigo, secao, exigencia e ordem vem do template
 * e nao sao editaveis por esta rota. O que o time mexe no dia a dia sao os dois
 * eixos, o responsavel, o encaminhamento e a anotacao.
 *
 * OS DOIS EIXOS SAO GRAVADOS DE FORMA INDEPENDENTE, de proposito: marcar a resposta
 * como nao aplicavel NAO marca a evidencia junto. A VVB por vezes exige uma
 * declaracao justamente para o item que nao se aplica, e derivar um eixo do outro
 * apagaria essa pendencia sem ninguem decidir. Quando os dois ficam desencontrados,
 * quem avisa e a tela, pelo campo na_com_evidencia_pendente do progresso.
 */
async function atualizarItem(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const dados: Record<string, unknown> = {};

  if (veioNoCorpo(corpo, 'status_resposta')) {
    const status = lerTexto(corpo.status_resposta, 'status_resposta');
    if (!status || !STATUS_RESPOSTA.has(status)) {
      throw new ErroRota('status_invalido', 400, 'status_resposta');
    }
    dados.status_resposta = status;
  }

  if (veioNoCorpo(corpo, 'estado_evidencia')) {
    const estado = lerTexto(corpo.estado_evidencia, 'estado_evidencia');
    if (!estado || !ESTADO_EVIDENCIA.has(estado)) {
      throw new ErroRota('status_invalido', 400, 'estado_evidencia');
    }
    dados.estado_evidencia = estado;
  }

  if (veioNoCorpo(corpo, 'responsavel_id')) {
    dados.responsavel_id = lerUuid(corpo.responsavel_id, 'responsavel_id');
  }

  if (veioNoCorpo(corpo, 'encaminhado_para')) {
    // null e '' limpam o encaminhamento: o item deixou de esperar terceiro.
    dados.encaminhado_para = lerEnum(
      corpo.encaminhado_para,
      ENCAMINHAMENTOS,
      'campo_invalido',
      'encaminhado_para',
    );
  }

  if (veioNoCorpo(corpo, 'observacoes')) {
    dados.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO);
  }

  if (Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }

  const { data, error } = await ctx.admin
    .from('carbon_evidencia_itens')
    .update(dados)
    .eq('id', ctx.params.id)
    .select(COLUNAS_ITEM)
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_evidencia_itens', 'status_invalido');
  if (!data) return respostaErro('nao_encontrado', 404);

  return respostaJson({ item: data });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'projetos/:id/evidencias', escrita: false, handler: obter },
  { metodo: 'POST', padrao: 'projetos/:id/evidencias', escrita: true, handler: criar },
  { metodo: 'PATCH', padrao: 'evidencia-itens/:id', escrita: true, handler: atualizarItem },
];

// -----------------------------------------------------------------------------
// Rotas de reuniao, ata e pendencia de ata (issue #9).
// -----------------------------------------------------------------------------
// GET    carbon-api/reunioes                  -> { reunioes, total, resumo, pagina, limite }
// POST   carbon-api/reunioes                  -> { reuniao } (201)
// GET    carbon-api/reunioes/:id              -> { reuniao, ata, pendencias }
// PATCH  carbon-api/reunioes/:id              -> { reuniao, ata, pendencias }
// POST   carbon-api/reunioes/:id/serie        -> { criadas, ignoradas, recorrencia_id }
// POST   carbon-api/reunioes/:id/ata          -> { ata } (201)
// PATCH  carbon-api/atas/:id                  -> { ata }
// POST   carbon-api/atas/:id/pendencias       -> { pendencia } (201)
// PATCH  carbon-api/ata-pendencias/:id        -> { pendencia }
// DELETE carbon-api/ata-pendencias/:id        -> { removido: true }
//
// Objetos SQL de que este modulo depende (migration 20260814096000_reunioes.sql):
//   public.carbon_reunioes_listar(p_projeto_id, p_somente_backoffice, p_tipo,
//                                 p_parceiro, p_limite, p_deslocamento) returns jsonb
//   public.carbon_reuniao_detalhe(p_reuniao_id) returns jsonb
//   public.carbon_reunioes_gerar_serie(p_reuniao_id, p_quantidade, p_criado_por) returns jsonb
//
// POR QUE LISTAGEM E DETALHE SAO RPC E NAO SELECT AQUI: os agregados "tem ata",
// "ata aprovada" e "pendencias abertas" aparecem na listagem, no resumo do painel e
// no detalhe. Definidos em tres lugares, divergem na primeira mudanca - e o dataset
// de demonstracao do frontend nao teria uma definicao unica para copiar. A regra
// mora no banco: pendencia aberta e a que tem concluida = false.
//
// SEM ROTA DELETE DE REUNIAO NEM DE ATA, DE PROPOSITO. Ata de reuniao de consulta e
// de governanca e evidencia de auditoria. Apagar reuniao apagaria a ata em cascata,
// e nenhuma tela precisa disso: reuniao cadastrada errado se corrige por PATCH. A
// unica remocao exposta e de pendencia de ata, que e linha de trabalho e nao
// evidencia.
//
// EDICAO DE ATA APROVADA E PERMITIDA, com uma protecao: a trigger do banco preserva
// aprovada_em, portanto o carimbo de aprovacao nunca e reescrito por uma edicao
// posterior. Bloquear a edicao seria pior na pratica (erro de digitacao percebido
// depois da leitura em voz alta ficaria eternizado), mas a tela avisa que alterar
// ata aprovada descaracteriza a evidencia.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { respostaErro, respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';
import {
  ErroRota,
  type ErroBanco,
  lancarErroEscrita,
  lerBooleano,
  lerData,
  lerEnum,
  lerNumero,
  lerTexto,
  lerUuid,
  LIMITE_TEXTO_CURTO,
  LIMITE_TEXTO_LONGO,
  paginar,
  paraNumero,
  UUID_RE,
  veioNoCorpo,
} from './helpers.ts';

/**
 * Tipos de reuniao. Espelha o CHECK de carbon_reunioes.tipo, e os valores sao os
 * observados no dado real (estavam embutidos no titulo no Notion).
 */
const TIPOS = new Set([
  'semanal',
  'semanal_parceiro',
  'tematica',
  'governanca',
  'consulta_comunidade',
]);

// Quais tipos aceitam geracao de serie e conferido no BANCO (semanal e
// semanal_parceiro, ver carbon_reunioes_gerar_serie): a checagem depende do tipo da
// linha, que aqui exigiria uma consulta a mais antes da RPC. O erro
// tipo_nao_recorrente volta traduzido no handler gerarSerie.

/** Meio ano de agenda por clique. Mesmo limite da funcao SQL. */
const QUANTIDADE_MAXIMA_SERIE = 26;

/**
 * A ata e um DOCUMENTO, nao um campo de anotacao: o limite de texto curto (500) e
 * o de texto longo (5000) do roteador seriam pequenos para o corpo de uma ata de
 * reuniao de governanca. A coluna e `text` e nao tem limite proprio; este numero e
 * apenas guarda contra corpo abusivo.
 */
const LIMITE_CONTEUDO_ATA = 20000;

const COLUNAS_REUNIAO =
  'id, projeto_id, tipo, titulo, data, parceiro, recorrencia_id, criado_por, ' +
  'criado_em, atualizado_em';

const COLUNAS_ATA =
  'id, reuniao_id, redigida_por, conteudo, pontos_atencao, barreiras, aprovada, ' +
  'aprovada_em, criado_em, atualizado_em';

const COLUNAS_PENDENCIA =
  'id, ata_id, descricao, responsavel_id, prazo, atividade_id, concluida, ' +
  'concluida_em, criado_em, atualizado_em';

// -----------------------------------------------------------------------------
// Leitura auxiliar
// -----------------------------------------------------------------------------

/** Detalhe completo (reuniao + ata + pendencias). null quando a reuniao nao existe. */
async function lerDetalhe(
  admin: SupabaseClient,
  reuniaoId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await admin.rpc('carbon_reuniao_detalhe', {
    p_reuniao_id: reuniaoId,
  });

  if (error) {
    console.error('Falha em carbon_reuniao_detalhe:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return (data as Record<string, unknown> | null) ?? null;
}

// Tabela de ligacao muitos-para-muitos entre documento e qualquer outra entidade.
// Pertence ao dominio de Documentos (issue #6), NAO a este modulo: aqui ela e apenas
// LIDA, e a leitura degrada sozinha quando aquele dominio ainda nao esta aplicado.
const TABELA_VINCULOS = 'carbon_documento_vinculos';

/**
 * DIVERGENCIA DE VOCABULARIO CONHECIDA, e o motivo de haver DOIS valores aqui.
 *
 * O contrato desta issue pede tipo_alvo = 'ata' (o que vira evidencia e a ATA, nao a
 * reuniao); o dominio de Documentos documenta 'reuniao' na lista de exemplos da coluna.
 * Como carbon_documento_vinculos aceita qualquer texto em snake_case, escolher um lado
 * so faria a contagem devolver zero em silencio - o pior resultado possivel numa tela
 * cujo proposito e justamente nao mentir sobre onde esta a evidencia. Aceitamos os dois
 * na LEITURA (o indice e (tipo_alvo, alvo_id), portanto e barato) e passamos os dois
 * ids possiveis. Padronizar em um valor unico e decisao de quem consolida as frentes.
 * O mesmo problema, com os mesmos dois lados, ja aparece em rotas/evidencias.ts.
 */
const TIPOS_ALVO_ATA = ['ata', 'reuniao'];

/**
 * Quantos documentos estao vinculados a esta ata (ou a esta reuniao), ou null quando a
 * contagem nao pode ser feita.
 *
 * POR QUE null E NAO ZERO: enquanto o dominio de Documentos nao estiver aplicado, a
 * tabela nao existe e a consulta falha. Zero afirmaria na tela que a ata nao esta
 * anexada a evidencia nenhuma, que e exatamente a informacao que esta issue existe para
 * dar. Com null, a tela omite o indicador em vez de inventar um numero.
 *
 * A contagem cruza os dois tipos com os dois ids, portanto e uma APROXIMACAO por cima:
 * um vinculo ('ata', <id da reuniao>) tambem entraria. Nenhum caminho de escrita produz
 * esse par, e o custo de errar por cima aqui e menor do que o de errar por baixo.
 */
async function contarVinculosEvidencia(
  admin: SupabaseClient,
  reuniaoId: string,
  ataId: string | null,
): Promise<number | null> {
  const ids = ataId ? [ataId, reuniaoId] : [reuniaoId];

  const { count, error } = await admin
    .from(TABELA_VINCULOS)
    .select('id', { count: 'exact', head: true })
    .in('tipo_alvo', TIPOS_ALVO_ATA)
    .in('alvo_id', ids);

  if (error) {
    // 42P01 relation does not exist, 42703 column does not exist, PGRST205 tabela
    // desconhecida pelo PostgREST: todos significam "o dominio de Documentos ainda nao
    // esta no ar". Nao e erro de servidor e nao pode virar 500.
    console.warn(`Contagem de vinculos indisponivel (${TABELA_VINCULOS}): ${error.message}`);
    return null;
  }
  return count ?? 0;
}

/**
 * Detalhe + a contagem de vinculos de evidencia, que e o que fecha o ciclo da issue:
 * a ata estruturada aqui pode ser anexada ao item de evidencia da auditoria.
 */
async function detalheComEvidencia(
  admin: SupabaseClient,
  reuniaoId: string,
): Promise<Record<string, unknown> | null> {
  const detalhe = await lerDetalhe(admin, reuniaoId);
  if (!detalhe) return null;

  const ata = detalhe.ata as { id?: string } | null;
  const vinculos = await contarVinculosEvidencia(admin, reuniaoId, ata?.id ?? null);
  return { ...detalhe, vinculos_evidencia: vinculos };
}

/** Confere existencia da reuniao sem trazer a ata nem as pendencias. */
async function reuniaoExiste(admin: SupabaseClient, reuniaoId: string): Promise<boolean> {
  const { data, error } = await admin
    .from('carbon_reunioes')
    .select('id')
    .eq('id', reuniaoId)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_reunioes:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return Boolean(data);
}

// -----------------------------------------------------------------------------
// Listas brancas de campos
// -----------------------------------------------------------------------------

/**
 * Objeto de gravacao de carbon_reunioes, por lista branca explicita.
 *
 * Escrito campo a campo (e nao com o helper listaBranca) porque cada campo tem
 * validador proprio e porque a exigencia de parceiro depende do tipo. Campo
 * desconhecido no corpo e ignorado, e nenhuma coluna nova da tabela passa a ser
 * gravavel pela API sem alguem escrever isso aqui: sem esse cuidado um corpo com
 * { criado_por, recorrencia_id } reescreveria autoria e o agrupamento da serie.
 *
 * @param modo 'criar' exige tipo, titulo e data; 'atualizar' toca so o que veio.
 */
function montarDadosReuniao(
  corpo: Record<string, unknown>,
  modo: 'criar' | 'atualizar',
): Record<string, unknown> {
  const dados: Record<string, unknown> = {};

  if (modo === 'criar' || veioNoCorpo(corpo, 'tipo')) {
    const tipo = lerEnum(corpo.tipo, TIPOS, 'campo_invalido', 'tipo');
    if (!tipo) throw new ErroRota('campo_obrigatorio', 400, 'tipo');
    dados.tipo = tipo;
  }

  if (modo === 'criar' || veioNoCorpo(corpo, 'titulo')) {
    const titulo = lerTexto(corpo.titulo, 'titulo', LIMITE_TEXTO_CURTO);
    if (!titulo) throw new ErroRota('campo_obrigatorio', 400, 'titulo');
    dados.titulo = titulo;
  }

  if (modo === 'criar' || veioNoCorpo(corpo, 'data')) {
    const data = lerData(corpo.data, 'data');
    if (!data) throw new ErroRota('campo_obrigatorio', 400, 'data');
    dados.data = data;
  }

  // projeto_id null = reuniao de backoffice, que e estado valido e nao ausencia de
  // dado. Por isso o campo aceita null explicitamente.
  if (veioNoCorpo(corpo, 'projeto_id')) {
    dados.projeto_id = lerUuid(corpo.projeto_id, 'projeto_id');
  }

  if (veioNoCorpo(corpo, 'parceiro')) {
    dados.parceiro = lerTexto(corpo.parceiro, 'parceiro', LIMITE_TEXTO_CURTO);
  }

  /**
   * Semanal por parceiro SEM parceiro e recusada aqui com codigo proprio, e nao
   * deixada para o CHECK do banco: a mensagem generica de campo invalido nao diz a
   * ninguem o que preencher. O CHECK continua sendo a rede de seguranca para
   * escrita que nao passe por esta rota - inclusive no caso que esta validacao NAO
   * cobre de proposito (limpar o parceiro sem reenviar o tipo: aqui nao se sabe o
   * tipo atual da linha, e o 23514 do banco vira parceiro_obrigatorio em
   * lancarErroEscrita).
   */
  if (dados.tipo === 'semanal_parceiro') {
    const parceiroInformado = veioNoCorpo(corpo, 'parceiro') ? dados.parceiro : undefined;
    if (modo === 'criar' && !parceiroInformado) {
      throw new ErroRota('parceiro_obrigatorio', 400, 'parceiro');
    }
    if (modo === 'atualizar' && parceiroInformado === null) {
      throw new ErroRota('parceiro_obrigatorio', 400, 'parceiro');
    }
  }

  return dados;
}

/**
 * Objeto de gravacao de carbon_atas. aprovada_em NAO entra: e mantido por trigger.
 *
 * Nenhum campo e obrigatorio, nem na criacao: abrir a ata em branco no comeco da
 * reuniao e escrever durante ela e o fluxo real da pauta.
 */
function montarDadosAta(corpo: Record<string, unknown>): Record<string, unknown> {
  const dados: Record<string, unknown> = {};

  if (veioNoCorpo(corpo, 'redigida_por')) {
    dados.redigida_por = lerUuid(corpo.redigida_por, 'redigida_por');
  }
  if (veioNoCorpo(corpo, 'conteudo')) {
    dados.conteudo = lerTexto(corpo.conteudo, 'conteudo', LIMITE_CONTEUDO_ATA);
  }
  if (veioNoCorpo(corpo, 'pontos_atencao')) {
    dados.pontos_atencao = lerTexto(corpo.pontos_atencao, 'pontos_atencao', LIMITE_TEXTO_LONGO);
  }
  if (veioNoCorpo(corpo, 'barreiras')) {
    dados.barreiras = lerTexto(corpo.barreiras, 'barreiras', LIMITE_TEXTO_LONGO);
  }
  if (veioNoCorpo(corpo, 'aprovada')) {
    dados.aprovada = lerBooleano(corpo.aprovada, 'aprovada');
  }

  return dados;
}

/** Objeto de gravacao de carbon_ata_pendencias. concluida_em e mantido por trigger. */
function montarDadosPendencia(
  corpo: Record<string, unknown>,
  modo: 'criar' | 'atualizar',
): Record<string, unknown> {
  const dados: Record<string, unknown> = {};

  if (modo === 'criar' || veioNoCorpo(corpo, 'descricao')) {
    const descricao = lerTexto(corpo.descricao, 'descricao', LIMITE_TEXTO_LONGO);
    if (!descricao) throw new ErroRota('campo_obrigatorio', 400, 'descricao');
    dados.descricao = descricao;
  }

  if (veioNoCorpo(corpo, 'responsavel_id')) {
    dados.responsavel_id = lerUuid(corpo.responsavel_id, 'responsavel_id');
  }
  if (veioNoCorpo(corpo, 'prazo')) {
    dados.prazo = lerData(corpo.prazo, 'prazo');
  }
  if (veioNoCorpo(corpo, 'atividade_id')) {
    dados.atividade_id = lerUuid(corpo.atividade_id, 'atividade_id');
  }
  if (veioNoCorpo(corpo, 'concluida')) {
    dados.concluida = lerBooleano(corpo.concluida, 'concluida');
  }

  return dados;
}

// -----------------------------------------------------------------------------
// Handlers de reuniao
// -----------------------------------------------------------------------------

/**
 * Lista reunioes com resumo e paginacao.
 *
 * Filtros na query string:
 *   ?projeto_id=<uuid>      somente as reunioes daquele projeto
 *   ?projeto_id=backoffice  somente as reunioes SEM projeto (a weekly da operacao)
 *   ?tipo=<tipo>            um dos valores de carbon_reunioes.tipo
 *   ?parceiro=<texto>       busca por trecho do nome do parceiro
 *   ?limite= &pagina=       paginacao (helper paginar)
 *
 * Filtro torto na URL e 400 e nao "ignora e devolve tudo": listagem filtrada por um
 * valor que o servidor descartou em silencio faz a pessoa tomar decisao sobre um
 * recorte que nao e o que ela pediu.
 */
async function listar(ctx: Contexto): Promise<Response> {
  const q = ctx.url.searchParams;
  const { limite, deslocamento, pagina } = paginar(ctx.url);

  let projetoId: string | null = null;
  let somenteBackoffice = false;

  const projetoBruto = (q.get('projeto_id') ?? '').trim();
  if (projetoBruto && projetoBruto !== 'todos') {
    if (projetoBruto === 'backoffice') somenteBackoffice = true;
    else if (UUID_RE.test(projetoBruto)) projetoId = projetoBruto;
    else throw new ErroRota('id_invalido', 400, 'projeto_id');
  }

  const tipoBruto = (q.get('tipo') ?? '').trim();
  if (tipoBruto && !TIPOS.has(tipoBruto)) {
    throw new ErroRota('campo_invalido', 400, 'tipo');
  }

  const parceiroBruto = (q.get('parceiro') ?? '').trim();
  if (parceiroBruto.length > LIMITE_TEXTO_CURTO) {
    throw new ErroRota('campo_invalido', 400, 'parceiro');
  }

  const { data, error } = await ctx.admin.rpc('carbon_reunioes_listar', {
    p_projeto_id: projetoId,
    p_somente_backoffice: somenteBackoffice,
    p_tipo: tipoBruto || null,
    p_parceiro: parceiroBruto || null,
    p_limite: limite,
    p_deslocamento: deslocamento,
  });

  if (error) {
    console.error('Falha em carbon_reunioes_listar:', error.message);
    return respostaErro('erro_interno', 500);
  }

  const bruto = (data ?? {}) as Record<string, unknown>;
  return respostaJson({
    reunioes: Array.isArray(bruto.reunioes) ? bruto.reunioes : [],
    total: paraNumero(bruto.total) ?? 0,
    resumo: bruto.resumo ?? null,
    pagina,
    limite,
  });
}

async function obter(ctx: Contexto): Promise<Response> {
  const detalhe = await detalheComEvidencia(ctx.admin, ctx.params.id);
  if (!detalhe) return respostaErro('nao_encontrado', 404);
  return respostaJson(detalhe);
}

async function criar(ctx: Contexto): Promise<Response> {
  const dados = montarDadosReuniao(ctx.corpo ?? {}, 'criar');

  const { data, error } = await ctx.admin
    .from('carbon_reunioes')
    .insert({ ...dados, criado_por: ctx.registro.id })
    .select(COLUNAS_REUNIAO)
    .single();

  if (error || !data) {
    // codigoCheck = parceiro_obrigatorio porque o unico CHECK da tabela e o do
    // parceiro na semanal por parceiro.
    lancarErroEscrita(
      (error ?? { message: 'insert sem retorno' }) as ErroBanco,
      'carbon_reunioes',
      'parceiro_obrigatorio',
    );
  }

  return respostaJson({ reuniao: data }, 201);
}

/**
 * Atualiza a reuniao e devolve o DETALHE completo.
 *
 * Devolver o detalhe (e nao apenas a linha) mantem a tela com uma unica forma de
 * resposta para "estado atual desta reuniao", que e o que ela renderiza.
 */
async function atualizar(ctx: Contexto): Promise<Response> {
  const id = ctx.params.id;
  const dados = montarDadosReuniao(ctx.corpo ?? {}, 'atualizar');

  if (Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }

  const { data, error } = await ctx.admin
    .from('carbon_reunioes')
    .update(dados)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_reunioes', 'parceiro_obrigatorio');
  if (!data) return respostaErro('nao_encontrado', 404);

  const detalhe = await detalheComEvidencia(ctx.admin, id);
  if (!detalhe) return respostaErro('nao_encontrado', 404);
  return respostaJson(detalhe);
}

/**
 * Gera as proximas N reunioes semanais a partir desta.
 *
 * A quantidade e validada aqui ANTES da RPC para o erro sair com o codigo e o campo
 * certos; a funcao SQL valida de novo, porque ela tambem pode ser chamada de fora
 * da API.
 */
async function gerarSerie(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const quantidade = lerNumero(corpo.quantidade, 'quantidade');

  if (
    quantidade === null ||
    !Number.isInteger(quantidade) ||
    quantidade < 1 ||
    quantidade > QUANTIDADE_MAXIMA_SERIE
  ) {
    throw new ErroRota('campo_invalido', 400, 'quantidade');
  }

  const { data, error } = await ctx.admin.rpc('carbon_reunioes_gerar_serie', {
    p_reuniao_id: ctx.params.id,
    p_quantidade: quantidade,
    p_criado_por: ctx.registro.id,
  });

  if (error) {
    // RAISE de plpgsql sem errcode chega como P0001, portanto os tres casos de
    // negocio da funcao sao reconhecidos pela mensagem que ela padroniza. O resto
    // (FK, check) tem SQLSTATE proprio e vai para lancarErroEscrita.
    const mensagem = String(error.message ?? '');
    if (mensagem.includes('reuniao_nao_encontrada')) {
      return respostaErro('nao_encontrado', 404);
    }
    if (mensagem.includes('tipo_nao_recorrente')) {
      throw new ErroRota('tipo_nao_recorrente', 400, 'tipo');
    }
    if (mensagem.includes('quantidade_invalida')) {
      throw new ErroRota('campo_invalido', 400, 'quantidade');
    }
    lancarErroEscrita(error as ErroBanco, 'carbon_reunioes_gerar_serie');
  }

  const bruto = (data ?? {}) as Record<string, unknown>;
  return respostaJson({
    criadas: paraNumero(bruto.criadas) ?? 0,
    ignoradas: paraNumero(bruto.ignoradas) ?? 0,
    recorrencia_id: bruto.recorrencia_id ?? null,
    intervalo_dias: paraNumero(bruto.intervalo_dias) ?? 7,
  });
}

// -----------------------------------------------------------------------------
// Handlers de ata
// -----------------------------------------------------------------------------

/**
 * Abre a ata de uma reuniao.
 *
 * A ata e um para um com a reuniao (unique em reuniao_id), portanto a segunda
 * tentativa volta 409 registro_duplicado em vez de sobrescrever silenciosamente o
 * que outra pessoa comecou a redigir na mesma reuniao.
 */
async function criarAta(ctx: Contexto): Promise<Response> {
  const reuniaoId = ctx.params.id;
  if (!(await reuniaoExiste(ctx.admin, reuniaoId))) {
    return respostaErro('nao_encontrado', 404);
  }

  const dados = montarDadosAta(ctx.corpo ?? {});

  const { data, error } = await ctx.admin
    .from('carbon_atas')
    .insert({ ...dados, reuniao_id: reuniaoId })
    .select(COLUNAS_ATA)
    .single();

  if (error || !data) {
    lancarErroEscrita(
      (error ?? { message: 'insert sem retorno' }) as ErroBanco,
      'carbon_atas',
    );
  }

  return respostaJson({ ata: data }, 201);
}

async function atualizarAta(ctx: Contexto): Promise<Response> {
  const dados = montarDadosAta(ctx.corpo ?? {});

  if (Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }

  const { data, error } = await ctx.admin
    .from('carbon_atas')
    .update(dados)
    .eq('id', ctx.params.id)
    .select(COLUNAS_ATA)
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_atas');
  if (!data) return respostaErro('nao_encontrado', 404);

  return respostaJson({ ata: data });
}

// -----------------------------------------------------------------------------
// Handlers de pendencia
// -----------------------------------------------------------------------------

async function criarPendencia(ctx: Contexto): Promise<Response> {
  const ataId = ctx.params.id;
  const dados = montarDadosPendencia(ctx.corpo ?? {}, 'criar');

  // Sem checagem previa de existencia da ata: a FK ja recusa ata inexistente, e
  // lancarErroEscrita traduz o 23503 em referencia_invalida. Uma consulta a mais
  // por pendencia criada nao compraria nada.
  const { data, error } = await ctx.admin
    .from('carbon_ata_pendencias')
    .insert({ ...dados, ata_id: ataId })
    .select(COLUNAS_PENDENCIA)
    .single();

  if (error || !data) {
    lancarErroEscrita(
      (error ?? { message: 'insert sem retorno' }) as ErroBanco,
      'carbon_ata_pendencias',
    );
  }

  return respostaJson({ pendencia: data }, 201);
}

async function atualizarPendencia(ctx: Contexto): Promise<Response> {
  const dados = montarDadosPendencia(ctx.corpo ?? {}, 'atualizar');

  if (Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }

  const { data, error } = await ctx.admin
    .from('carbon_ata_pendencias')
    .update(dados)
    .eq('id', ctx.params.id)
    .select(COLUNAS_PENDENCIA)
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_ata_pendencias');
  if (!data) return respostaErro('nao_encontrado', 404);

  return respostaJson({ pendencia: data });
}

/**
 * Remove uma pendencia.
 *
 * E a UNICA remocao exposta neste dominio: pendencia e linha de trabalho, anotada
 * as pressas durante a reuniao, e apagar a que foi digitada em duplicidade e
 * operacao normal. Reuniao e ata nao tem DELETE (ver o cabecalho do arquivo).
 */
async function removerPendencia(ctx: Contexto): Promise<Response> {
  const { data, error } = await ctx.admin
    .from('carbon_ata_pendencias')
    .delete()
    .eq('id', ctx.params.id)
    .select('id')
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_ata_pendencias');
  if (!data) return respostaErro('nao_encontrado', 404);

  return respostaJson({ removido: true, id: ctx.params.id });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'reunioes', escrita: false, handler: listar },
  { metodo: 'POST', padrao: 'reunioes', escrita: true, handler: criar },
  { metodo: 'GET', padrao: 'reunioes/:id', escrita: false, handler: obter },
  { metodo: 'PATCH', padrao: 'reunioes/:id', escrita: true, handler: atualizar },
  { metodo: 'POST', padrao: 'reunioes/:id/serie', escrita: true, handler: gerarSerie },
  { metodo: 'POST', padrao: 'reunioes/:id/ata', escrita: true, handler: criarAta },
  { metodo: 'PATCH', padrao: 'atas/:id', escrita: true, handler: atualizarAta },
  { metodo: 'POST', padrao: 'atas/:id/pendencias', escrita: true, handler: criarPendencia },
  { metodo: 'PATCH', padrao: 'ata-pendencias/:id', escrita: true, handler: atualizarPendencia },
  { metodo: 'DELETE', padrao: 'ata-pendencias/:id', escrita: true, handler: removerPendencia },
];

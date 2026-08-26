// -----------------------------------------------------------------------------
// Rotas das metas da equipe por frente de trabalho, com o realizado calculado.
// -----------------------------------------------------------------------------
// GET    carbon-api/projetos/:id/metas          -> { metas, total, progresso, frentes, avulsos, pode_escrever }
// POST   carbon-api/projetos/:id/metas          -> { meta }
// PATCH  carbon-api/metas/:id                   -> { meta }
// DELETE carbon-api/metas/:id                   -> { removido }
// POST   carbon-api/metas/:id/indicadores       -> { meta, indicador }
// PATCH  carbon-api/meta-indicadores/:id        -> { indicador, meta }
// DELETE carbon-api/meta-indicadores/:id        -> { removido }
// POST   carbon-api/meta-indicadores/:id/medicoes -> { medicao, meta }
//
// Objetos SQL de que este modulo depende (20260814100000_metas.sql):
//   public.carbon_metas
//   public.carbon_indicadores          (compartilhada, ver abaixo)
//   public.carbon_indicador_medicoes   (compartilhada)
//   public.carbon_metas_listar, carbon_metas_progresso, carbon_meta_json,
//   public.carbon_meta_frentes
//
// -----------------------------------------------------------------------------
// A DISTINCAO QUE ESTE ARQUIVO EXISTE PARA NAO ERRAR
// -----------------------------------------------------------------------------
// carbon_indicadores tem DOIS usos e a coluna `plano` e o que os separa:
//   plano preenchido ('clima','comunidade','biodiversidade') -> indicador do Plano
//     de Monitoramento, que a VVB confere e que ja tem rota e tela proprias
//     (rotas/indicadores.ts, src/pages/ProjetoIndicadores.jsx). NAO e deste modulo;
//   plano nulo -> indicador INTERNO, ligado a meta da equipe. E deste modulo.
//
// Hoje sao 161 linhas com plano preenchido e nenhuma sem. Uma rota daqui que
// esquecesse o `is('plano', null)` faria a tela de Metas listar 161 indicadores de
// certificacao que nao tem meta nenhuma, e o numero "indicadores do projeto" do topo
// diria 161 onde a verdade e zero. Por isso:
//   - toda leitura de indicador aqui filtra plano nulo;
//   - toda escrita grava plano nulo explicitamente;
//   - lerIndicadorDeMetaVisivel responde 404 para indicador com plano preenchido.
// Esse ultimo ponto e o que sustenta a confianca no agregado `indicadores` de
// carbon_meta_json: como nenhuma rota vincula indicador de plano a uma meta, o que a
// funcao SQL agrega e sempre indicador interno.
//
// POR QUE carbon_metas_progresso TEM TRES CAMPOS SOBRESCRITOS AQUI. A funcao conta
// indicadores e medicoes do PROJETO INTEIRO, sem olhar `plano` - ela e de 14/08 e a
// coluna `plano` so nasceu em 25/08. Devolver os numeros dela crus faria a tela de
// Metas exibir a contagem do Plano de Monitoramento. Recontamos os tres com o filtro
// certo em contarInternos(). O lugar definitivo do conserto e a funcao SQL ganhar um
// parametro; enquanto isso nao acontece, a correcao mora aqui e esta documentada,
// em vez de a tela mostrar um numero errado em silencio.
//
// POR QUE carbon_indicadores_listar NAO E USADA. Mesma razao: ela nao filtra plano.
// A leitura de indicador interno e feita direto na tabela, com o filtro explicito.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';
import {
  ErroRota,
  type ErroBanco,
  exigir,
  lancarErroEscrita,
  lerData,
  lerEnum,
  lerNumero,
  lerTexto,
  lerUuid,
  LIMITE_TEXTO_LONGO,
  paraNumero,
  veioNoCorpo,
} from './helpers.ts';
import { lerProjetoVisivel } from './projetos.ts';
import { podeEscrever } from './acesso.ts';

const COLUNAS_META =
  'id, projeto_id, frente, descricao, parceiro_id, valor_alvo, unidade, periodicidade, ' +
  'mes_inicio, mes_fim, periodo_inicio, periodo_fim, status, observacoes, criado_em, atualizado_em';

// So as colunas que o indicador INTERNO usa. As do Plano de Monitoramento (codigo,
// output, outcome, impacto, recurso, frequencia, ordem) ficam de fora de proposito:
// nao sao preenchidas por este dominio e trafega-las sugeriria que a tela de Metas
// deveria edita-las.
const COLUNAS_INDICADOR =
  'id, projeto_id, meta_id, nome, unidade, tipo, acumulativo, descricao, criado_em, atualizado_em';

const COLUNAS_MEDICAO =
  'id, indicador_id, data, periodo_tipo, valor, origem, observacao, criado_em, atualizado_em';

// Espelham os CHECK de 20260814100000_metas.sql. Mantidos como Set para a validacao
// acontecer ANTES do banco, com codigo de erro proprio: o 23514 devolvido pelo
// Postgres nao diz qual check falhou, e a tela so conseguiria dizer "campo invalido".
const FRENTES = new Set([
  'fortalecimento_institucional',
  'monitoramento',
  'educacao',
  'sensibilizacao',
  'bioeconomia',
  'prestacao_contas',
]);
const PERIODICIDADES = new Set(['unica', 'quinzenal', 'mensal', 'trimestral']);
const STATUS = new Set(['planejada', 'em_andamento', 'concluida', 'cancelada']);
const TIPOS = new Set(['contagem', 'percentual', 'volume', 'area']);
const GRANULARIDADES = new Set(['pontual', 'mensal', 'trimestral', 'semestral', 'anual']);
const ORIGENS = new Set(['interna', 'parceiro']);

// Corte de leitura dos indicadores internos, igual ao limite de carbon_metas_listar.
// Nao e paginacao: um plano de impacto real tem dezenas de indicadores, nao centenas.
const LIMITE_INDICADORES = 500;

type Linha = Record<string, unknown>;

// -----------------------------------------------------------------------------
// Leitura de valor medido
// -----------------------------------------------------------------------------

// Ponto seguido de exatamente tres digitos: assinatura do separador de milhar em
// pt-BR. Copiado de lerNumero() em helpers.ts pelo mesmo motivo de la - Number("13.250")
// e 13,25, mil vezes menor do que o que a pessoa digitou, e nada barraria depois.
const SEPARADOR_MILHAR = /\.\d{3}(?!\d)/;

/**
 * Valor de uma medicao, que ACEITA NEGATIVO.
 *
 * Nao usa lerNumero() de helpers.ts de proposito: aquele recusa n < 0, porque nasceu
 * para area e volume. Aqui negativo e legitimo e esta escrito no comentario da coluna
 * carbon_indicador_medicoes.valor: indicador de variacao percentual mede QUEDA
 * tambem, e forcar nao negativo obrigaria a registrar -3% como 3% em outro campo,
 * que e como uma planilha esconde um resultado ruim.
 *
 * O teto de 1e10 continua, agora nos dois sentidos: numeric(14,4) guarda 10 digitos
 * inteiros, e estourar isso viraria 500 em vez de 400.
 */
function lerValorMedido(valor: unknown, campo: string): number {
  if (valor === null || valor === undefined || valor === '') {
    throw new ErroRota('campo_obrigatorio', 400, campo);
  }

  let bruto: unknown = valor;
  if (typeof bruto === 'string') {
    if (SEPARADOR_MILHAR.test(bruto)) throw new ErroRota('campo_invalido', 400, campo);
    if (!bruto.includes('.') && bruto.includes(',')) bruto = bruto.replace(',', '.');
  }

  const n = typeof bruto === 'number' ? bruto : Number(bruto);
  if (!Number.isFinite(n) || Math.abs(n) >= 1e10) {
    throw new ErroRota('campo_invalido', 400, campo);
  }
  return n;
}

/** Numero de mes da janela sazonal: inteiro de 1 a 12, ou null. */
function lerMes(valor: unknown, campo: string): number | null {
  const n = lerNumero(valor, campo);
  if (n === null) return null;
  if (!Number.isInteger(n) || n < 1 || n > 12) throw new ErroRota('mes_invalido', 400, campo);
  return n;
}

// -----------------------------------------------------------------------------
// Leitores com portao
// -----------------------------------------------------------------------------

/**
 * Le a meta e CONFIRMA que quem pergunta enxerga o projeto dela.
 *
 * O portao e o projeto, nunca a meta: lerProjetoVisivel e a mesma funcao que a tela
 * de Projetos usa. Checar so a existencia da meta seria um IDOR - bastaria adivinhar
 * um uuid para ler o plano de impacto de um projeto de outro cliente. E 404, e nao
 * 403, porque 403 confirmaria que a meta existe.
 */
async function lerMetaVisivel(ctx: Contexto, id: string): Promise<Linha> {
  const { data, error } = await ctx.admin
    .from('carbon_metas')
    .select(COLUNAS_META)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_metas:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) throw new ErroRota('nao_encontrado', 404);

  const linha = data as unknown as Linha;
  const projeto = await lerProjetoVisivel(ctx, String(linha.projeto_id));
  if (!projeto) throw new ErroRota('nao_encontrado', 404);

  return linha;
}

/**
 * Le um indicador INTERNO e confere o portao do projeto dele.
 *
 * Indicador com `plano` preenchido responde 404 aqui, e nao 400: ele existe, mas nao
 * pertence a este dominio. Sem essa recusa, um PATCH desta rota poderia mudar o tipo
 * ou vincular a uma meta um parametro da VM0048 que a VVB confere - alteracao que
 * ninguem procuraria na tela de Metas quando o relatorio de verificacao saisse
 * errado. Quem edita indicador de plano e rotas/indicadores.ts.
 */
async function lerIndicadorDeMetaVisivel(ctx: Contexto, id: string): Promise<Linha> {
  const { data, error } = await ctx.admin
    .from('carbon_indicadores')
    .select(`${COLUNAS_INDICADOR}, plano`)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_indicadores:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) throw new ErroRota('nao_encontrado', 404);

  const { plano, ...linha } = data as unknown as Linha;
  if (plano !== null && plano !== undefined) throw new ErroRota('nao_encontrado', 404);

  const projeto = await lerProjetoVisivel(ctx, String(linha.projeto_id));
  if (!projeto) throw new ErroRota('nao_encontrado', 404);

  return linha;
}

/**
 * Meta no formato ENRIQUECIDO da listagem (realizado, pct, atrasada, previsto,
 * indicadores, documentos_total).
 *
 * Toda rota de escrita devolve por aqui. Sem isso, a tela receberia depois de salvar
 * um objeto pobre, sem realizado nem percentual, e a linha mudaria de forma ate o
 * proximo carregamento - defeito que aparece como "a barra some quando eu salvo".
 */
async function lerMetaJson(admin: SupabaseClient, metaId: string): Promise<Linha | null> {
  const { data, error } = await admin.rpc('carbon_meta_json', { p_meta_id: metaId });
  if (error) {
    console.error('Falha em carbon_meta_json:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return (data ?? null) as Linha | null;
}

/**
 * Indicadores INTERNOS do projeto (plano nulo) e quantas medicoes eles tem.
 *
 * Duas consultas e nao um count com embed: o filtro por coluna de tabela embutida do
 * PostgREST depende de `!inner` e do nome exato do relacionamento, e quebra em
 * silencio quando alguem acrescenta uma segunda chave estrangeira. Como indicador
 * interno e coisa de dezenas, ler as linhas e contar aqui e barato e obviamente
 * correto.
 */
async function contarInternos(
  admin: SupabaseClient,
  projetoId: string,
): Promise<{ indicadores: Linha[]; medicoes_total: number }> {
  const { data, error } = await admin
    .from('carbon_indicadores')
    .select(COLUNAS_INDICADOR)
    .eq('projeto_id', projetoId)
    .is('plano', null)
    .order('nome', { ascending: true })
    .limit(LIMITE_INDICADORES);

  if (error) {
    console.error('Falha ao listar indicadores internos:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const indicadores = (data ?? []) as unknown as Linha[];
  if (indicadores.length === 0) return { indicadores, medicoes_total: 0 };

  const { count, error: erroMedicoes } = await admin
    .from('carbon_indicador_medicoes')
    .select('id', { count: 'exact', head: true })
    .in('indicador_id', indicadores.map((i) => String(i.id)));

  if (erroMedicoes) {
    console.error('Falha ao contar medicoes internas:', erroMedicoes.message);
    throw new ErroRota('erro_interno', 500);
  }

  return { indicadores, medicoes_total: count ?? 0 };
}

// -----------------------------------------------------------------------------
// GET projetos/:id/metas
// -----------------------------------------------------------------------------

async function listar(ctx: Contexto): Promise<Response> {
  const projetoId = ctx.params.id;
  const projeto = await lerProjetoVisivel(ctx, projetoId);
  if (!projeto) throw new ErroRota('nao_encontrado', 404);

  const frente = ctx.url.searchParams.get('frente');
  if (frente && !FRENTES.has(frente)) throw new ErroRota('frente_invalida', 400, 'frente');
  const status = ctx.url.searchParams.get('status');
  if (status && !STATUS.has(status)) throw new ErroRota('status_invalido', 400, 'status');

  const [lista, progresso, frentes, internos] = await Promise.all([
    ctx.admin.rpc('carbon_metas_listar', {
      p_projeto_id: projetoId,
      p_frente: frente,
      p_status: status,
    }),
    // O progresso vem do PROJETO INTEIRO, sem os filtros acima, de proposito: os
    // numeros do topo respondem "como esta o plano de impacto", e um total que
    // mudasse ao filtrar por frente nao responde nada.
    ctx.admin.rpc('carbon_metas_progresso', { p_projeto_id: projetoId }),
    ctx.admin.rpc('carbon_meta_frentes'),
    contarInternos(ctx.admin, projetoId),
  ]);

  if (lista.error) {
    console.error('Falha em carbon_metas_listar:', lista.error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (progresso.error) {
    console.error('Falha em carbon_metas_progresso:', progresso.error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (frentes.error) {
    console.error('Falha em carbon_meta_frentes:', frentes.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const envelope = (lista.data ?? {}) as { metas?: unknown; total?: unknown };
  const avulsos = internos.indicadores.filter((i) => i.meta_id === null);

  return respostaJson({
    metas: Array.isArray(envelope.metas) ? envelope.metas : [],
    total: paraNumero(envelope.total) ?? 0,
    // Ver o cabecalho: os tres campos abaixo sobrescrevem os da funcao SQL, que
    // conta indicador de Plano de Monitoramento junto.
    progresso: {
      ...((progresso.data ?? {}) as Record<string, unknown>),
      indicadores_total: internos.indicadores.length,
      indicadores_sem_meta: avulsos.length,
      medicoes_total: internos.medicoes_total,
    },
    // As SEIS frentes sempre, inclusive as sem meta nenhuma: frente vazia precisa
    // aparecer na tela, senao a ausencia de meta numa frente do plano fica invisivel.
    frentes: (frentes.data ?? []) as unknown[],
    // Indicadores internos ainda nao vinculados a meta. Eles existem de forma
    // legitima (indicador acompanhado sem meta), e sem esta lista a tela nao teria
    // como oferecer o vinculo.
    avulsos,
    pode_escrever: podeEscrever(ctx.registro),
  });
}

// -----------------------------------------------------------------------------
// Escrita da meta
// -----------------------------------------------------------------------------

/** Campos que POST e PATCH aceitam, com a mesma validacao nos dois. */
function lerCamposMeta(corpo: Record<string, unknown>, parcial: boolean): Linha {
  const dados: Linha = {};
  const presente = (campo: string) => !parcial || veioNoCorpo(corpo, campo);

  if (presente('frente')) {
    dados.frente = lerEnum(corpo.frente, FRENTES, 'frente_invalida', 'frente');
  }
  if (presente('descricao')) {
    // A DESCRICAO NAO CARREGA O NUMERO. "Instalar cameras trap", nunca "Instalar 20
    // cameras": o numero mora em valor_alvo e a unidade em unidade, e e essa
    // separacao que permite comparar com o realizado. Nao ha como o servidor impor
    // isso; a tela avisa, e o comentario existe para o proximo campo novo nao
    // recriar o problema.
    dados.descricao = lerTexto(corpo.descricao, 'descricao', LIMITE_TEXTO_LONGO);
  }
  if (presente('parceiro_id')) dados.parceiro_id = lerUuid(corpo.parceiro_id, 'parceiro_id');
  if (presente('valor_alvo')) dados.valor_alvo = lerNumero(corpo.valor_alvo, 'valor_alvo');
  if (presente('unidade')) dados.unidade = lerTexto(corpo.unidade, 'unidade');
  if (presente('periodicidade')) {
    dados.periodicidade =
      lerEnum(corpo.periodicidade, PERIODICIDADES, 'periodicidade_invalida', 'periodicidade') ??
        'unica';
  }
  if (presente('mes_inicio')) dados.mes_inicio = lerMes(corpo.mes_inicio, 'mes_inicio');
  if (presente('mes_fim')) dados.mes_fim = lerMes(corpo.mes_fim, 'mes_fim');
  if (presente('periodo_inicio')) {
    dados.periodo_inicio = lerData(corpo.periodo_inicio, 'periodo_inicio');
  }
  if (presente('periodo_fim')) dados.periodo_fim = lerData(corpo.periodo_fim, 'periodo_fim');
  if (presente('status')) {
    dados.status = lerEnum(corpo.status, STATUS, 'status_invalido', 'status') ?? 'planejada';
  }
  if (presente('observacoes')) {
    dados.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO);
  }

  return dados;
}

/**
 * Confere as regras que envolvem MAIS DE UM campo, sobre o estado EFETIVO da linha.
 *
 * Estado efetivo, e nao o corpo da requisicao: num PATCH que manda so `valor_alvo`, a
 * unidade que vale e a que ja esta gravada. Validar so o payload deixaria passar um
 * PATCH que acrescenta numero a uma meta sem unidade, e a recusa viria do CHECK do
 * banco como 23514 - a tela diria "campo invalido" sem dizer qual, e a pessoa mexeria
 * no numero, que estava certo.
 */
function conferirCoerenciaMeta(efetivo: Linha): void {
  const valorAlvo = efetivo.valor_alvo;
  const unidade = efetivo.unidade;
  if (
    valorAlvo !== null && valorAlvo !== undefined &&
    (unidade === null || unidade === undefined || String(unidade).trim() === '')
  ) {
    // Numero sem unidade e o problema da issue #14 de volta: "20" nao diz se sao
    // cameras, toneladas ou por cento.
    throw new ErroRota('unidade_obrigatoria', 400, 'unidade');
  }

  const temInicio = efetivo.mes_inicio !== null && efetivo.mes_inicio !== undefined;
  const temFim = efetivo.mes_fim !== null && efetivo.mes_fim !== undefined;
  // Janela sazonal e um par. Meio par nao define janela nenhuma, e o check do banco
  // recusaria com uma mensagem que nao aponta o campo.
  if (temInicio !== temFim) throw new ErroRota('janela_incompleta', 400, 'mes_fim');

  const inicio = efetivo.periodo_inicio;
  const fim = efetivo.periodo_fim;
  if (inicio && fim && String(fim) < String(inicio)) {
    // Datas em ISO comparam como texto: 2026-03-31 < 2026-04-01 tambem em string.
    throw new ErroRota('periodo_invalido', 400, 'periodo_fim');
  }
}

async function criar(ctx: Contexto): Promise<Response> {
  const projetoId = ctx.params.id;
  const projeto = await lerProjetoVisivel(ctx, projetoId);
  if (!projeto) throw new ErroRota('nao_encontrado', 404);

  const corpo = ctx.corpo ?? {};
  exigir(corpo, ['frente', 'descricao']);

  const dados = lerCamposMeta(corpo, false);
  conferirCoerenciaMeta(dados);

  const { data, error } = await ctx.admin
    .from('carbon_metas')
    .insert({ ...dados, projeto_id: projetoId, criado_por: ctx.registro.id })
    .select('id')
    .single();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_metas', 'meta_invalida');

  const id = String((data as unknown as Linha).id);
  return respostaJson({ meta: await lerMetaJson(ctx.admin, id) }, 201);
}

async function atualizar(ctx: Contexto): Promise<Response> {
  const atual = await lerMetaVisivel(ctx, ctx.params.id);

  const corpo = ctx.corpo ?? {};
  const dados = lerCamposMeta(corpo, true);
  if (Object.keys(dados).length === 0) throw new ErroRota('nada_para_atualizar', 400);

  conferirCoerenciaMeta({ ...atual, ...dados });

  const { error } = await ctx.admin
    .from('carbon_metas')
    .update(dados)
    .eq('id', ctx.params.id);

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_metas', 'meta_invalida');

  return respostaJson({ meta: await lerMetaJson(ctx.admin, ctx.params.id) });
}

async function remover(ctx: Contexto): Promise<Response> {
  await lerMetaVisivel(ctx, ctx.params.id);

  // Os indicadores NAO vao junto: a FK e ON DELETE SET NULL, de proposito. Apagar a
  // meta nao pode destruir serie historica de medicao, que e dado de campo e custou
  // coleta - o indicador fica orfao de meta e continua sendo acompanhado. A tela
  // mostra os orfaos no bloco de indicadores sem meta, para eles nao sumirem de vista.
  const { error } = await ctx.admin.from('carbon_metas').delete().eq('id', ctx.params.id);
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_metas');

  return respostaJson({ removido: true });
}

// -----------------------------------------------------------------------------
// Indicadores internos da meta
// -----------------------------------------------------------------------------

/**
 * PERCENTUAL NAO ACUMULA, recusado ANTES do banco.
 *
 * Somar 30% de um mes com 40% de outro nao da 70% de nada: percentual e um NIVEL, e o
 * valor que vale e o ultimo medido. Ha CHECK no banco
 * (carbon_indicadores_percentual_nao_acumula_chk), mas ele devolve 23514, que vira
 * "campo invalido" e nao ensina a regra a ninguem. Aqui o codigo e proprio e a
 * mensagem da tela explica o porque - ver MENSAGENS em src/lib/api/metas.js.
 */
function conferirPercentual(tipo: unknown, acumulativo: unknown): void {
  if (tipo === 'percentual' && acumulativo === true) {
    throw new ErroRota('percentual_nao_acumula', 400, 'acumulativo');
  }
}

/** Campos do indicador interno aceitos por POST e PATCH. */
function lerCamposIndicador(corpo: Record<string, unknown>, parcial: boolean): Linha {
  const dados: Linha = {};
  const presente = (campo: string) => !parcial || veioNoCorpo(corpo, campo);

  if (presente('nome')) dados.nome = lerTexto(corpo.nome, 'nome');
  if (presente('unidade')) dados.unidade = lerTexto(corpo.unidade, 'unidade');
  if (presente('descricao')) {
    dados.descricao = lerTexto(corpo.descricao, 'descricao', LIMITE_TEXTO_LONGO);
  }
  if (presente('tipo')) {
    dados.tipo = lerEnum(corpo.tipo, TIPOS, 'tipo_invalido', 'tipo') ?? 'contagem';
  }
  if (presente('acumulativo')) {
    // Default true, igual ao da coluna: a maioria das acoes do plano e contagem.
    dados.acumulativo = veioNoCorpo(corpo, 'acumulativo') ? corpo.acumulativo === true : true;
  }

  return dados;
}

async function criarIndicador(ctx: Contexto): Promise<Response> {
  const meta = await lerMetaVisivel(ctx, ctx.params.id);

  const corpo = ctx.corpo ?? {};
  exigir(corpo, ['nome']);

  const dados = lerCamposIndicador(corpo, false);
  conferirPercentual(dados.tipo, dados.acumulativo);

  const { data, error } = await ctx.admin
    .from('carbon_indicadores')
    .insert({
      ...dados,
      projeto_id: meta.projeto_id,
      meta_id: meta.id,
      // Explicito, e nao por omissao: e o campo que mantem este indicador fora do
      // Plano de Monitoramento e fora do relatorio de verificacao.
      plano: null,
      criado_por: ctx.registro.id,
    })
    .select(COLUNAS_INDICADOR)
    .single();

  if (error) {
    lancarErroEscrita(error as ErroBanco, 'carbon_indicadores', 'percentual_nao_acumula');
  }

  return respostaJson({
    indicador: data as unknown as Linha,
    meta: await lerMetaJson(ctx.admin, String(meta.id)),
  }, 201);
}

async function atualizarIndicador(ctx: Contexto): Promise<Response> {
  const atual = await lerIndicadorDeMetaVisivel(ctx, ctx.params.id);

  const corpo = ctx.corpo ?? {};
  const dados = lerCamposIndicador(corpo, true);

  // meta_id fora de lerCamposIndicador porque exige uma consulta: e o campo que
  // vincula e desvincula, e vincular a meta de OUTRO projeto produziria um realizado
  // somando medicao de projeto alheio.
  if (veioNoCorpo(corpo, 'meta_id')) {
    const novaMeta = lerUuid(corpo.meta_id, 'meta_id');
    if (novaMeta) {
      const alvo = await lerMetaVisivel(ctx, novaMeta);
      if (String(alvo.projeto_id) !== String(atual.projeto_id)) {
        throw new ErroRota('referencia_invalida', 400, 'meta_id');
      }
    }
    dados.meta_id = novaMeta;
  }

  if (Object.keys(dados).length === 0) throw new ErroRota('nada_para_atualizar', 400);

  conferirPercentual(dados.tipo ?? atual.tipo, dados.acumulativo ?? atual.acumulativo);

  const { data, error } = await ctx.admin
    .from('carbon_indicadores')
    .update(dados)
    .eq('id', ctx.params.id)
    .select(COLUNAS_INDICADOR)
    .single();

  if (error) {
    lancarErroEscrita(error as ErroBanco, 'carbon_indicadores', 'percentual_nao_acumula');
  }

  const linha = data as unknown as Linha;
  return respostaJson({
    indicador: linha,
    // A meta EFETIVA depois da alteracao. Devolver a antiga faria a tela redesenhar o
    // progresso do lugar de onde o indicador saiu, e nao de onde ele entrou.
    meta: linha.meta_id ? await lerMetaJson(ctx.admin, String(linha.meta_id)) : null,
  });
}

async function removerIndicador(ctx: Contexto): Promise<Response> {
  const atual = await lerIndicadorDeMetaVisivel(ctx, ctx.params.id);

  // As medicoes vao junto por ON DELETE CASCADE: serie sem a definicao do que ela
  // mede nao significa nada. Quem quiser preservar o historico desvincula da meta
  // (PATCH meta_id: null), nao apaga.
  const { error } = await ctx.admin.from('carbon_indicadores').delete().eq('id', ctx.params.id);
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_indicadores');

  return respostaJson({
    removido: true,
    meta: atual.meta_id ? await lerMetaJson(ctx.admin, String(atual.meta_id)) : null,
  });
}

// -----------------------------------------------------------------------------
// Medicoes
// -----------------------------------------------------------------------------

async function registrarMedicao(ctx: Contexto): Promise<Response> {
  const indicador = await lerIndicadorDeMetaVisivel(ctx, ctx.params.id);

  const corpo = ctx.corpo ?? {};
  exigir(corpo, ['data']);

  const data_ = lerData(corpo.data, 'data');
  if (data_ === null) throw new ErroRota('campo_invalido', 400, 'data');
  const valor = lerValorMedido(corpo.valor, 'valor');

  const periodoTipo =
    lerEnum(corpo.periodo_tipo, GRANULARIDADES, 'granularidade_invalida', 'periodo_tipo') ??
      'pontual';
  const origem = lerEnum(corpo.origem, ORIGENS, 'origem_invalida', 'origem') ?? 'interna';

  // UPSERT pela chave natural (indicador, data, granularidade).
  //
  // A migration 20260814100000 dizia, com razao para a epoca, que NAO havia unique
  // em (indicador_id, data) porque um indicador acumulativo poderia receber dois
  // lancamentos no mesmo dia. Isso mudou: 20260825120000 criou o indice unico
  // carbon_indicador_medicoes_periodo_uidx sobre (indicador_id, data, periodo_tipo),
  // para reimportar a planilha do Plano de Monitoramento nao duplicar a serie. A
  // tabela e a mesma, entao a regra nova vale aqui tambem.
  //
  // Com o indice, um INSERT repetido devolveria 409 e a pessoa teria que apagar
  // antes de corrigir - duas requisicoes, com uma janela em que a medicao nao
  // existe. O upsert torna "lancar de novo o mesmo periodo" uma CORRECAO, que e o
  // que a equipe quer dizer quando faz isso. Quem precisa somar dois lancamentos do
  // mesmo dia soma antes de enviar, ou usa granularidade diferente.
  const { data, error } = await ctx.admin
    .from('carbon_indicador_medicoes')
    .upsert(
      {
        indicador_id: ctx.params.id,
        data: data_,
        periodo_tipo: periodoTipo,
        valor,
        origem,
        observacao: lerTexto(corpo.observacao, 'observacao', LIMITE_TEXTO_LONGO),
        criado_por: ctx.registro.id,
      },
      { onConflict: 'indicador_id,data,periodo_tipo' },
    )
    .select(COLUNAS_MEDICAO)
    .single();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_indicador_medicoes');

  return respostaJson({
    medicao: data as unknown as Linha,
    // A meta volta junto porque o realizado dela acabou de mudar. Sem isto a tela
    // precisaria de uma segunda requisicao so para a barra andar.
    meta: indicador.meta_id ? await lerMetaJson(ctx.admin, String(indicador.meta_id)) : null,
  });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'projetos/:id/metas', escrita: false, handler: listar },
  { metodo: 'POST', padrao: 'projetos/:id/metas', escrita: true, handler: criar },
  { metodo: 'PATCH', padrao: 'metas/:id', escrita: true, handler: atualizar },
  { metodo: 'DELETE', padrao: 'metas/:id', escrita: true, handler: remover },
  { metodo: 'POST', padrao: 'metas/:id/indicadores', escrita: true, handler: criarIndicador },
  {
    metodo: 'PATCH',
    padrao: 'meta-indicadores/:id',
    escrita: true,
    handler: atualizarIndicador,
  },
  {
    metodo: 'DELETE',
    padrao: 'meta-indicadores/:id',
    escrita: true,
    handler: removerIndicador,
  },
  {
    metodo: 'POST',
    padrao: 'meta-indicadores/:id/medicoes',
    escrita: true,
    handler: registrarMedicao,
  },
];

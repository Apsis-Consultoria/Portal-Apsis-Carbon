// -----------------------------------------------------------------------------
// Rotas de emissao e venda de credito de carbono (issue #15).
// -----------------------------------------------------------------------------
// GET    carbon-api/compradores           -> { compradores, total, pagina, limite, resumo }
// POST   carbon-api/compradores           -> { comprador }                            201
// GET    carbon-api/compradores/:id       -> { comprador, vendas }
// PATCH  carbon-api/compradores/:id       -> { comprador }
// GET    carbon-api/emissoes-credito      -> { emissoes, total, pagina, limite }
// POST   carbon-api/emissoes-credito      -> { emissao }                              201
// PATCH  carbon-api/emissoes-credito/:id  -> { emissao }
// DELETE carbon-api/emissoes-credito/:id  -> { removida: true }
// GET    carbon-api/vendas                -> { vendas, total, pagina, limite, resumo }
// POST   carbon-api/vendas                -> { venda }                                201
// PATCH  carbon-api/vendas/:id            -> { venda }
// DELETE carbon-api/vendas/:id            -> { removida: true }
// GET    carbon-api/estoque-credito       -> { estoque, conciliacao, total, pagina, limite }
//
// Objetos SQL de que este modulo depende (migration 20260814101000_credito):
//   public.carbon_compradores / carbon_emissoes_credito / carbon_vendas
//   public.carbon_compradores_listagem   (view SEM a coluna email, com tem_email)
//   public.carbon_emissoes_detalhe       (emissao com o projeto resolvido)
//   public.carbon_vendas_detalhe         (venda com comprador, projeto e contrato)
//   public.carbon_estoque_credito        (estoque por projeto e vintage)
//   public.carbon_estoque_conciliacao(uuid, integer) -> jsonb
//   public.carbon_venda_ajuste_pendente(text, text, boolean)
//
// PARA PUBLICAR ESTE MODULO falta UMA linha de import e UMA de spread em
// rotas/indice.ts, que e arquivo compartilhado da fundacao e nao foi tocado aqui
// (outras frentes trabalham nele em paralelo). Enquanto isso nao acontecer, tudo
// daqui responde 404 rota_desconhecida - foi o que ja deixou 66 rotas escritas e
// inalcancaveis ate 25/08/2026.
//
// -----------------------------------------------------------------------------
// AS TRES REGRAS DE NEGOCIO QUE ESTE MODULO NAO PODE VIOLAR
// -----------------------------------------------------------------------------
//   1. NAO EXISTE CONVERSAO PARA MOEDA UNICA. Em lugar nenhum. Receita e sempre
//      somada POR MOEDA (receita.BRL, receita.USD, receita.EUR), porque converter
//      exigiria taxa e data de referencia, que sao decisao contabil e nao existem
//      no sistema. Um unico `total` somando as tres seria um numero mentiroso, e
//      e por isso que nenhuma resposta daqui tem esse campo.
//   2. O BUFFER ESTA DENTRO DO VOLUME EMITIDO, nao e valor a parte. Portanto
//      disponivel = emitido - buffer - vendido, e o aposentado NAO entra na conta
//      (ele e subconjunto do vendido). Quem faz essa conta e a view
//      carbon_estoque_credito; aqui nao se recalcula nada disso.
//   3. carbon_compradores.sigiloso = true SIGNIFICA QUE A RAZAO SOCIAL NAO SAI
//      para quem nao e admin. Quem decide isso e esta rota, nao a tela: ver
//      mascararComprador. A view carbon_vendas_detalhe entrega comprador_nome
//      CRU, e esta Edge Function e o unico caminho entre ela e o navegador.
//
// SOBRE O PORTAO DE PROJETO. As LEITURAS daqui sao cross-projeto de proposito:
// estoque e receita so respondem a pergunta da issue #15 ("quanto do estoque ja
// foi vendido") quando somam a operacao inteira, e os agregados por comprador
// vem prontos de uma view que nao sabe quem esta perguntando. Filtrar metade
// disso por participacao produziria um painel que soma um conjunto e lista
// outro. A protecao por linha que este dominio tem, e que a migration exige, e o
// sigilo do comprador. As ESCRITAS, ao contrario, passam por lerProjetoVisivel:
// registrar emissao ou venda num projeto de que a pessoa nem participa nao tem
// caso de uso legitimo.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { respostaJson } from '../../_shared/cors.ts';
import type { Contexto, RegistroUsuario, Rota } from './tipos.ts';
import { ehAdmin } from './acesso.ts';
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
  paginar,
  paraNumero,
  veioNoCorpo,
} from './helpers.ts';
import { lerProjetoVisivel } from './projetos.ts';

// -----------------------------------------------------------------------------
// Vocabulario do dominio (espelha os CHECK da migration)
// -----------------------------------------------------------------------------

const STATUS_COMPRADOR = new Set(['prospeccao', 'negociacao', 'recorrente', 'encerrado']);

/** carbon_vendas.moeda. Tres moedas, ZERO conversao entre elas. Ver a regra 1. */
const MOEDAS = new Set(['BRL', 'USD', 'EUR']);

const VINTAGE_MINIMO = 1990;
const VINTAGE_MAXIMO = 2100;

/**
 * Rotulo que substitui a razao social do comprador sob NDA.
 *
 * Texto fixo e igual para todos os sigilosos de proposito: um rotulo que
 * carregasse iniciais, apelido ou numero sequencial voltaria a distinguir um
 * comprador do outro, que e exatamente o que o sigilo existe para impedir.
 */
const ROTULO_SIGILOSO = 'Comprador sob NDA';

/** Mesmo formato minimo do CHECK carbon_compradores_email_formato_chk. */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Linha = Record<string, unknown>;

/**
 * Construtor de consulta do PostgREST, sem tipo. Mesmo motivo de fornecedores.ts:
 * as listagens aplicam os mesmos filtros em DUAS consultas (a pagina e o conjunto
 * inteiro do resumo), e tipar o encadeamento exigiria repetir a genealogia de
 * PostgrestFilterBuilder para nao cobrir o risco real, que e nome de coluna
 * errado - e quem reclama disso e o banco, em runtime.
 */
// deno-lint-ignore no-explicit-any
type Consulta = any;

// -----------------------------------------------------------------------------
// Colunas
// -----------------------------------------------------------------------------

/**
 * Colunas de carbon_compradores no DETALHE e no retorno das escritas.
 *
 * `email` esta na lista, e sai mascarado depois (ver mascararComprador). Na
 * LISTAGEM a coluna nem existe: a view carbon_compradores_listagem foi escrita
 * sem ela justamente para nao haver select capaz de vaza-la.
 */
const COLUNAS_COMPRADOR =
  'id, nome, pais, status, email, recorrente, sigiloso, observacoes, ativo, ' +
  'criado_por, criado_em, atualizado_em';

const COLUNAS_LISTAGEM_COMPRADOR =
  'id, nome, pais, status, recorrente, sigiloso, observacoes, ativo, criado_em, ' +
  'atualizado_em, tem_email, vendas, projetos, volume_tco2e, aposentado_tco2e, ' +
  'receita_brl, receita_usd, receita_eur, vendas_sem_preco, vendas_ajuste_pendente, ' +
  'primeira_venda, ultima_venda';

const COLUNAS_EMISSAO =
  'id, projeto_id, vintage, quantidade_tco2e, buffer_tco2e, vendavel_tco2e, ' +
  'serial_inicio, serial_fim, data_emissao, observacoes, criado_por, criado_em, ' +
  'atualizado_em, projeto_nome, projeto_registro_id, projeto_pais, projeto_standard';

const COLUNAS_VENDA =
  'id, comprador_id, projeto_id, vintage, quantidade_tco2e, preco_unitario, moeda, ' +
  'valor_total, data, contrato_documento_id, ajuste_correspondente, aposentado, ' +
  'data_aposentadoria, observacoes, criado_por, criado_em, atualizado_em, ' +
  'comprador_nome, comprador_pais, comprador_status, comprador_recorrente, ' +
  'comprador_sigiloso, comprador_ativo, projeto_nome, projeto_registro_id, ' +
  'projeto_pais, contrato_titulo, contrato_url, ajuste_pendente, venda_internacional';

const COLUNAS_ESTOQUE =
  'projeto_id, vintage, projeto_nome, projeto_registro_id, projeto_pais, ' +
  'projeto_standard, projeto_ativo, emissoes, emitido_tco2e, buffer_tco2e, vendas, ' +
  'compradores, vendido_tco2e, aposentado_tco2e, vendavel_tco2e, disponivel_tco2e, ' +
  'vendido_pct, receita_brl, receita_usd, receita_eur, vendas_ajuste_pendente, ' +
  'emissoes_sem_serial, primeira_emissao, ultima_emissao, primeira_venda, ' +
  'ultima_venda, sobrevendido, sem_emissao, sem_venda';

/**
 * Colunas numeric que o PostgREST pode entregar como TEXTO.
 *
 * Sem normalizar, a tela concatenaria onde deveria somar ("1000" + "2000" =
 * "10002000") e, pior neste dominio, compararia string com numero ao decidir se o
 * disponivel ficou negativo. Volume tem 4 casas (numeric(16,4)) e dinheiro tem 2.
 */
const NUMERICOS_COMPRADOR = [
  'vendas',
  'projetos',
  'volume_tco2e',
  'aposentado_tco2e',
  'receita_brl',
  'receita_usd',
  'receita_eur',
  'vendas_sem_preco',
  'vendas_ajuste_pendente',
];

const NUMERICOS_EMISSAO = ['quantidade_tco2e', 'buffer_tco2e', 'vendavel_tco2e'];

const NUMERICOS_VENDA = ['quantidade_tco2e', 'preco_unitario', 'valor_total'];

const NUMERICOS_ESTOQUE = [
  'emissoes',
  'emitido_tco2e',
  'buffer_tco2e',
  'vendas',
  'compradores',
  'vendido_tco2e',
  'aposentado_tco2e',
  'vendavel_tco2e',
  'disponivel_tco2e',
  'vendido_pct',
  'receita_brl',
  'receita_usd',
  'receita_eur',
  'vendas_ajuste_pendente',
  'emissoes_sem_serial',
];

// -----------------------------------------------------------------------------
// Utilitarios
// -----------------------------------------------------------------------------

function normalizar(linha: Linha, campos: readonly string[]): Linha {
  const saida: Linha = { ...linha };
  for (const campo of campos) {
    if (campo in saida) saida[campo] = paraNumero(saida[campo]);
  }
  return saida;
}

function normalizarLista(linhas: Linha[], campos: readonly string[]): Linha[] {
  return linhas.map((linha) => normalizar(linha, campos));
}

/**
 * Soma uma coluna em unidades INTEIRAS da ultima casa decimal.
 *
 * Somar float acumula erro (0,1 + 0,2 = 0,30000000000000004) e o rodape passa a
 * mostrar centavo (ou grama de CO2) que ninguem lancou. `casas` e 2 para dinheiro
 * e 4 para tCO2e, que sao as precisoes declaradas nas colunas.
 */
function somar(linhas: Linha[], campo: string, casas = 2): number {
  const fator = 10 ** casas;
  const total = linhas.reduce(
    (soma, linha) => soma + Math.round((paraNumero(linha[campo]) ?? 0) * fator),
    0,
  );
  return total / fator;
}

function textoDaQuery(url: URL, chave: string, limite = 120): string | null {
  const bruto = url.searchParams.get(chave);
  if (bruto === null) return null;
  const limpo = bruto.trim().slice(0, limite);
  return limpo === '' ? null : limpo;
}

/** UUID vindo da query string. Filtro torto e erro do cliente, nao "sem filtro". */
function uuidDaQuery(url: URL, chave: string): string | null {
  const bruto = url.searchParams.get(chave);
  if (bruto === null || bruto.trim() === '') return null;
  return lerUuid(bruto, chave);
}

/** Ano de safra vindo da query string, conferido contra a faixa do CHECK. */
function vintageDaQuery(url: URL, chave = 'vintage'): number | null {
  const bruto = url.searchParams.get(chave);
  if (bruto === null || bruto.trim() === '') return null;
  return lerVintage(bruto, chave);
}

/**
 * Ano de safra do credito. Inteiro dentro da faixa do CHECK da coluna.
 *
 * Conferido aqui, e nao so no banco, porque o erro precisa dizer QUAL campo
 * recusou: 'vintage_invalido' com o campo no detalhe permite a tela apontar para
 * o controle certo, enquanto o 23514 traduzido viraria um 'campo_invalido'
 * anonimo numa tela com dois anos diferentes (vintage e data de emissao).
 */
function lerVintage(valor: unknown, campo = 'vintage'): number | null {
  const n = lerNumero(valor, campo);
  if (n === null) return null;
  if (!Number.isInteger(n) || n < VINTAGE_MINIMO || n > VINTAGE_MAXIMO) {
    throw new ErroRota('vintage_invalido', 400, campo);
  }
  return n;
}

/** Volume em tCO2e, arredondado nas 4 casas de numeric(16,4). */
function lerVolume(valor: unknown, campo: string): number | null {
  const n = lerNumero(valor, campo);
  if (n === null) return null;
  return Math.round(n * 10000) / 10000;
}

/** Preco por tCO2e, nas 4 casas de numeric(14,4). */
function lerPreco(valor: unknown, campo: string): number | null {
  const n = lerNumero(valor, campo);
  if (n === null) return null;
  return Math.round(n * 10000) / 10000;
}

// -----------------------------------------------------------------------------
// Sigilo do comprador - a regra 3, escrita uma vez
// -----------------------------------------------------------------------------

/**
 * Aplica o sigilo por LINHA sobre um registro de comprador.
 *
 * `sigiloso = true` significa que a IDENTIDADE e restrita (NDA). Isto NAO e
 * permissao de tela: e a Edge Function que troca a razao social pelo rotulo
 * generico e retira o e-mail antes de o dado sair para o navegador. O requisito
 * veio do dado real (existe comprador cadastrado no Notion com o nome 'NDA').
 *
 * O QUE CONTINUA VISIVEL, de proposito:
 *   - o PAIS, porque e dele que depende a regra do ajuste correspondente do
 *     Artigo 6; escondendo o pais, a tela nao conseguiria cobrar a pendencia;
 *   - as OBSERVACOES, que a migration declara visiveis para todo leitor (e por
 *     isso o comentario da coluna proibe escrever ali o nome de quem esta sob
 *     NDA);
 *   - os VOLUMES e a RECEITA, que sao o motivo de a listagem existir.
 *
 * `nome_mascarado` vai junto para a tela poder explicar por que o nome esta
 * assim, em vez de parecer cadastro incompleto.
 */
function mascararComprador(linha: Linha, admin: boolean): Linha {
  const oculto = linha.sigiloso === true && !admin;
  if (!oculto) return { ...linha, nome_mascarado: false };

  const saida: Linha = { ...linha, nome: ROTULO_SIGILOSO, nome_mascarado: true };
  // delete e nao spread condicional: a chave nao pode SOBRAR na resposta com
  // valor null, porque um null aqui e indistinguivel de "nao ha e-mail
  // cadastrado" e a tela deixaria de cobrar o contato de quem realmente nao tem.
  delete saida.email;
  return saida;
}

/** Mesmo sigilo, aplicado ao nome do comprador embutido numa linha de venda. */
function mascararVenda(linha: Linha, admin: boolean): Linha {
  const oculto = linha.comprador_sigiloso === true && !admin;
  if (!oculto) return { ...linha, comprador_nome_mascarado: false };
  return { ...linha, comprador_nome: ROTULO_SIGILOSO, comprador_nome_mascarado: true };
}

// -----------------------------------------------------------------------------
// Compradores
// -----------------------------------------------------------------------------

/**
 * Lista compradores com os agregados de venda.
 *
 * Le a VIEW carbon_compradores_listagem, e nao a tabela: a view nao tem a coluna
 * email, entao o contato nao escapa nem por select mal escrito, e traz a receita
 * ja separada POR MOEDA (a regra 1 comeca no banco).
 *
 * DUAS DECISOES QUE EXISTEM SO POR CAUSA DO SIGILO, e que nao sao paranoia:
 *
 *   BUSCA POR NOME NAO ALCANCA COMPRADOR SIGILOSO quando quem pergunta nao e
 *   admin. Sem isso a mascara seria decorativa: bastaria digitar termos cada vez
 *   mais especificos e observar quando a linha mascarada aparece ou some para
 *   soletrar a razao social sob NDA, letra a letra.
 *
 *   OS SIGILOSOS VAO PARA O FIM DA LISTA, tambem so para quem nao e admin. A
 *   lista e alfabetica; deixar a linha mascarada na posicao dela entregaria de
 *   graca a primeira letra do nome que a mascara acabou de esconder.
 */
async function listarCompradores(ctx: Contexto): Promise<Response> {
  const { limite, deslocamento, pagina } = paginar(ctx.url);
  const admin = ehAdmin(ctx.registro);

  const status = textoDaQuery(ctx.url, 'status');
  const busca = textoDaQuery(ctx.url, 'busca');
  const ativoBruto = ctx.url.searchParams.get('ativo');
  const recorrenteBruto = ctx.url.searchParams.get('recorrente');

  const aplicarFiltros = (consulta: Consulta): Consulta => {
    let q = consulta;
    if (status) {
      if (!STATUS_COMPRADOR.has(status)) throw new ErroRota('status_invalido', 400, 'status');
      q = q.eq('status', status);
    }
    if (ativoBruto === 'true') q = q.eq('ativo', true);
    if (ativoBruto === 'false') q = q.eq('ativo', false);
    if (recorrenteBruto === 'true') q = q.eq('recorrente', true);
    if (busca) {
      // ilike simples e nao .or(): montar a string do or com texto de usuario e
      // onde nasce injecao de filtro no PostgREST (uma virgula no termo muda a
      // arvore de condicoes da consulta inteira).
      q = q.ilike('nome', `%${busca}%`);
      if (!admin) q = q.eq('sigiloso', false);
    }
    return q;
  };

  let paginaQuery = aplicarFiltros(
    ctx.admin
      .from('carbon_compradores_listagem')
      .select(COLUNAS_LISTAGEM_COMPRADOR, { count: 'exact' }),
  );
  if (!admin) paginaQuery = paginaQuery.order('sigiloso', { ascending: true });
  paginaQuery = paginaQuery
    .order('nome', { ascending: true })
    .range(deslocamento, deslocamento + limite - 1);

  const resumoQuery = aplicarFiltros(
    ctx.admin
      .from('carbon_compradores_listagem')
      .select(
        'status, ativo, recorrente, sigiloso, vendas, volume_tco2e, aposentado_tco2e, ' +
          'receita_brl, receita_usd, receita_eur, vendas_sem_preco, vendas_ajuste_pendente',
      ),
  );

  const [lista, paraResumo] = await Promise.all([paginaQuery, resumoQuery]);

  if (lista.error) {
    console.error('Falha ao ler carbon_compradores_listagem:', lista.error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (paraResumo.error) {
    console.error('Falha ao resumir carbon_compradores_listagem:', paraResumo.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const linhas = (paraResumo.data ?? []) as Linha[];

  return respostaJson({
    compradores: normalizarLista((lista.data ?? []) as Linha[], NUMERICOS_COMPRADOR).map((c) =>
      mascararComprador(c, admin)
    ),
    total: lista.count ?? (lista.data ?? []).length,
    pagina,
    limite,
    // Resumo do conjunto FILTRADO inteiro, com uma segunda consulta enxuta, e nao
    // da pagina: um rodape que contasse so as 50 primeiras linhas seria pior do
    // que nao ter rodape.
    resumo: {
      total: linhas.length,
      ativos: linhas.filter((l) => l.ativo !== false).length,
      recorrentes: linhas.filter((l) => l.recorrente === true).length,
      sigilosos: linhas.filter((l) => l.sigiloso === true).length,
      com_venda: linhas.filter((l) => (paraNumero(l.vendas) ?? 0) > 0).length,
      por_status: {
        prospeccao: linhas.filter((l) => l.status === 'prospeccao').length,
        negociacao: linhas.filter((l) => l.status === 'negociacao').length,
        recorrente: linhas.filter((l) => l.status === 'recorrente').length,
        encerrado: linhas.filter((l) => l.status === 'encerrado').length,
      },
      volume_tco2e: somar(linhas, 'volume_tco2e', 4),
      aposentado_tco2e: somar(linhas, 'aposentado_tco2e', 4),
      // Tres numeros, nunca um. Ver a regra 1 do cabecalho.
      receita: {
        BRL: somar(linhas, 'receita_brl'),
        USD: somar(linhas, 'receita_usd'),
        EUR: somar(linhas, 'receita_eur'),
      },
      vendas_sem_preco: linhas.reduce((t, l) => t + (paraNumero(l.vendas_sem_preco) ?? 0), 0),
      vendas_ajuste_pendente: linhas.reduce(
        (t, l) => t + (paraNumero(l.vendas_ajuste_pendente) ?? 0),
        0,
      ),
    },
  });
}

/** Le a linha crua do comprador. Devolve null quando o id nao existe. */
async function lerComprador(admin: SupabaseClient, id: string): Promise<Linha | null> {
  const { data, error } = await admin
    .from('carbon_compradores')
    .select(COLUNAS_COMPRADOR)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_compradores:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return (data as Linha | null) ?? null;
}

/**
 * Campos gravaveis do comprador, por lista branca explicita.
 *
 * A COERENCIA ENTRE status E recorrente E NORMALIZADA AQUI: o CHECK
 * carbon_compradores_recorrencia_coerente_chk proibe status 'recorrente' com a
 * flag falsa, e a migration diz que a Edge Function normaliza antes de gravar
 * justamente para esse check nunca ser alcancado por uso normal da tela. O
 * inverso continua livre: comprador que encerrou continua tendo sido recorrente,
 * e isso importa para previsao de receita.
 */
function montarDadosComprador(corpo: Linha, criando: boolean): Linha {
  const dados: Linha = {};

  if (criando || veioNoCorpo(corpo, 'nome')) {
    const nome = lerTexto(corpo.nome, 'nome', 200);
    if (!nome) throw new ErroRota('campo_obrigatorio', 400, 'nome');
    dados.nome = nome;
  }

  if (veioNoCorpo(corpo, 'pais')) dados.pais = lerTexto(corpo.pais, 'pais', 120);
  if (veioNoCorpo(corpo, 'observacoes')) {
    dados.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO);
  }

  if (veioNoCorpo(corpo, 'email')) {
    const email = lerTexto(corpo.email, 'email', 200);
    // Formato conferido aqui para o erro sair com codigo proprio; o CHECK da
    // coluna recusaria de qualquer forma, mas como 'campo_invalido' anonimo.
    if (email !== null && !EMAIL_RE.test(email)) {
      throw new ErroRota('email_invalido', 400, 'email');
    }
    dados.email = email;
  }

  if (veioNoCorpo(corpo, 'status')) {
    const status = lerEnum(corpo.status, STATUS_COMPRADOR, 'status_invalido', 'status');
    // Coluna NOT NULL com default: null significa "nao mexer", nunca "apagar".
    if (status !== null) dados.status = status;
  }

  if (veioNoCorpo(corpo, 'recorrente')) dados.recorrente = corpo.recorrente === true;
  if (veioNoCorpo(corpo, 'ativo')) dados.ativo = corpo.ativo !== false;

  if (dados.status === 'recorrente') dados.recorrente = true;

  return dados;
}

async function criarComprador(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  exigir(corpo, ['nome']);

  const dados = montarDadosComprador(corpo, true);
  // Marcar o sigilo na criacao e livre para admin e gestor: fechar so aperta.
  // Quem afrouxa e outra conversa, ver atualizarComprador.
  if (veioNoCorpo(corpo, 'sigiloso')) dados.sigiloso = corpo.sigiloso === true;

  const { data, error } = await ctx.admin
    .from('carbon_compradores')
    .insert({ ...dados, criado_por: ctx.registro.id })
    .select(COLUNAS_COMPRADOR)
    .single();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_compradores', 'email_invalido');

  return respostaJson(
    { comprador: mascararComprador(data as unknown as Linha, ehAdmin(ctx.registro)) },
    201,
  );
}

/**
 * Detalhe do comprador, com as vendas dele.
 *
 * As vendas vem da view carbon_vendas_detalhe e passam pela mesma mascara, ainda
 * que aqui o nome ja tenha sido escondido no proprio comprador: o dia em que
 * alguem reaproveitar este trecho para outra resposta, a mascara vai junto.
 */
async function obterComprador(ctx: Contexto): Promise<Response> {
  const admin = ehAdmin(ctx.registro);
  const linha = await lerComprador(ctx.admin, ctx.params.id);
  if (!linha) throw new ErroRota('nao_encontrado', 404);

  const { data, error } = await ctx.admin
    .from('carbon_vendas_detalhe')
    .select(COLUNAS_VENDA)
    .eq('comprador_id', ctx.params.id)
    .order('data', { ascending: false, nullsFirst: false })
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Falha ao ler carbon_vendas_detalhe:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  return respostaJson({
    comprador: mascararComprador(linha, admin),
    vendas: normalizarLista((data ?? []) as unknown as Linha[], NUMERICOS_VENDA).map((v) =>
      mascararVenda(v, admin)
    ),
  });
}

/**
 * Atualiza o comprador.
 *
 * DUAS RECUSAS QUE SO EXISTEM AQUI, as duas sobre o mesmo buraco: quem nao pode
 * LER a identidade sob NDA tambem nao pode reescreve-la nem revela-la.
 *
 *   1. Gestor nao altera nome nem e-mail de comprador sigiloso. Sobrescrever as
 *      cegas um valor que a propria API se recusou a mostrar nao e edicao, e
 *      perda de dado. (Em fornecedores.ts o risco equivalente foi aceito e
 *      registrado; aqui ele nao precisa ser, porque o resto do cadastro - pais,
 *      status, observacoes - continua editavel e resolve o trabalho do dia.)
 *   2. So admin DESMARCA o sigilo. Marcar aperta e qualquer um que escreve pode;
 *      desmarcar publica para todo o time um nome que quem desmarcou nao podia
 *      ler, e seria o caminho mais curto para contornar a mascara.
 */
async function atualizarComprador(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const admin = ehAdmin(ctx.registro);

  const atual = await lerComprador(ctx.admin, ctx.params.id);
  if (!atual) throw new ErroRota('nao_encontrado', 404);

  const sigilosoAgora = atual.sigiloso === true;

  if (sigilosoAgora && !admin && (veioNoCorpo(corpo, 'nome') || veioNoCorpo(corpo, 'email'))) {
    throw new ErroRota('comprador_sigiloso', 403, 'nome');
  }

  const dados = montarDadosComprador(corpo, false);

  if (veioNoCorpo(corpo, 'sigiloso')) {
    const desejado = corpo.sigiloso === true;
    if (sigilosoAgora && !desejado && !admin) {
      throw new ErroRota('comprador_sigiloso', 403, 'sigiloso');
    }
    dados.sigiloso = desejado;
  }

  if (Object.keys(dados).length === 0) throw new ErroRota('nada_para_atualizar', 400);

  const { data, error } = await ctx.admin
    .from('carbon_compradores')
    .update(dados)
    .eq('id', ctx.params.id)
    .select(COLUNAS_COMPRADOR)
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_compradores', 'email_invalido');
  if (!data) throw new ErroRota('nao_encontrado', 404);

  return respostaJson({ comprador: mascararComprador(data as unknown as Linha, admin) });
}

// -----------------------------------------------------------------------------
// Emissoes
// -----------------------------------------------------------------------------
// NAO EXISTE rota para apagar comprador, de proposito: a FK de carbon_vendas e
// ON DELETE RESTRICT porque venda e registro financeiro e nao pode virar orfa.
// Para tirar um comprador das listagens use ativo = false.

async function listarEmissoes(ctx: Contexto): Promise<Response> {
  const { limite, deslocamento, pagina } = paginar(ctx.url);
  const projetoId = uuidDaQuery(ctx.url, 'projeto_id');
  const vintage = vintageDaQuery(ctx.url);
  const busca = textoDaQuery(ctx.url, 'busca');

  let consulta = ctx.admin
    .from('carbon_emissoes_detalhe')
    .select(COLUNAS_EMISSAO, { count: 'exact' })
    .order('vintage', { ascending: false })
    .order('data_emissao', { ascending: false, nullsFirst: false })
    .range(deslocamento, deslocamento + limite - 1);

  if (projetoId) consulta = consulta.eq('projeto_id', projetoId);
  if (vintage !== null) consulta = consulta.eq('vintage', vintage);
  // Busca pela faixa de serial: e por ela que se concilia o volume com o
  // registro, e e o unico texto desta tabela que alguem procura de cabeca.
  if (busca) consulta = consulta.ilike('serial_inicio', `%${busca}%`);

  const { data, error, count } = await consulta;

  if (error) {
    console.error('Falha ao ler carbon_emissoes_detalhe:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  return respostaJson({
    emissoes: normalizarLista((data ?? []) as unknown as Linha[], NUMERICOS_EMISSAO),
    total: count ?? (data ?? []).length,
    pagina,
    limite,
  });
}

async function lerEmissaoDetalhe(admin: SupabaseClient, id: string): Promise<Linha | null> {
  const { data, error } = await admin
    .from('carbon_emissoes_detalhe')
    .select(COLUNAS_EMISSAO)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_emissoes_detalhe:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) return null;
  return normalizar(data as unknown as Linha, NUMERICOS_EMISSAO);
}

/**
 * Campos gravaveis da emissao.
 *
 * `vendavel_tco2e` NAO esta aqui e nunca estara: ela e derivada na view
 * (quantidade menos buffer). E `projeto_id` so e aceito na CRIACAO - mudar o dono
 * de uma emissao ja lancada moveria estoque de um projeto para o outro em
 * silencio, com a faixa de serial do registro apontando para o projeto errado.
 */
function montarDadosEmissao(corpo: Linha, criando: boolean): Linha {
  const dados: Linha = {};

  if (criando || veioNoCorpo(corpo, 'vintage')) {
    const vintage = lerVintage(corpo.vintage);
    if (vintage === null) throw new ErroRota('campo_obrigatorio', 400, 'vintage');
    dados.vintage = vintage;
  }

  if (criando || veioNoCorpo(corpo, 'quantidade_tco2e')) {
    const quantidade = lerVolume(corpo.quantidade_tco2e, 'quantidade_tco2e');
    if (quantidade === null) throw new ErroRota('campo_obrigatorio', 400, 'quantidade_tco2e');
    dados.quantidade_tco2e = quantidade;
  }

  if (veioNoCorpo(corpo, 'buffer_tco2e')) {
    // null significa "sem buffer": a coluna e NOT NULL com default 0.
    dados.buffer_tco2e = lerVolume(corpo.buffer_tco2e, 'buffer_tco2e') ?? 0;
  }

  if (veioNoCorpo(corpo, 'serial_inicio')) {
    dados.serial_inicio = lerTexto(corpo.serial_inicio, 'serial_inicio', 120);
  }
  if (veioNoCorpo(corpo, 'serial_fim')) {
    dados.serial_fim = lerTexto(corpo.serial_fim, 'serial_fim', 120);
  }
  if (veioNoCorpo(corpo, 'data_emissao')) {
    dados.data_emissao = lerData(corpo.data_emissao, 'data_emissao');
  }
  if (veioNoCorpo(corpo, 'observacoes')) {
    dados.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO);
  }

  return dados;
}

/**
 * Confere as duas regras que ligam campos entre si.
 *
 * Feito sobre o registro COMPLETO (o que ja esta gravado somado ao que veio no
 * corpo), e nao sobre o corpo: num PATCH que so aumenta o buffer, olhar apenas o
 * corpo nao teria a quantidade para comparar, e a recusa viria do banco como um
 * 23514 sem nome de campo.
 */
function conferirEmissao(final: Linha): void {
  const quantidade = paraNumero(final.quantidade_tco2e) ?? 0;
  const buffer = paraNumero(final.buffer_tco2e) ?? 0;
  if (buffer > quantidade) throw new ErroRota('buffer_maior_que_emitido', 400, 'buffer_tco2e');

  // Faixa de serial completa ou ausente, nunca meia: com uma ponta so nao se
  // concilia volume com o registro, que e a unica razao de guardar serial.
  const inicio = final.serial_inicio ?? null;
  const fim = final.serial_fim ?? null;
  if ((inicio === null) !== (fim === null)) {
    throw new ErroRota('serial_incompleto', 400, inicio === null ? 'serial_inicio' : 'serial_fim');
  }
}

async function criarEmissao(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  exigir(corpo, ['projeto_id', 'vintage', 'quantidade_tco2e']);

  const projetoId = lerUuid(corpo.projeto_id, 'projeto_id');
  if (!projetoId) throw new ErroRota('campo_obrigatorio', 400, 'projeto_id');
  // Portao pelo projeto, igual ao resto do sistema: 404 tanto para "nao existe"
  // quanto para "voce nao participa", pelo mesmo caminho de codigo.
  if (!(await lerProjetoVisivel(ctx, projetoId))) throw new ErroRota('nao_encontrado', 404);

  const dados = montarDadosEmissao(corpo, true);
  conferirEmissao({ buffer_tco2e: 0, ...dados });

  const { data, error } = await ctx.admin
    .from('carbon_emissoes_credito')
    .insert({ ...dados, projeto_id: projetoId, criado_por: ctx.registro.id })
    .select('id')
    .single();

  // 23505 aqui e a faixa de serial repetida (indice unico parcial): lancamento em
  // duplicidade, que inflaria o estoque em silencio.
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_emissoes_credito', 'campo_invalido');

  return respostaJson(
    { emissao: await lerEmissaoDetalhe(ctx.admin, String((data as Linha).id)) },
    201,
  );
}

async function atualizarEmissao(ctx: Contexto): Promise<Response> {
  const atual = await lerEmissaoDetalhe(ctx.admin, ctx.params.id);
  if (!atual) throw new ErroRota('nao_encontrado', 404);
  if (!(await lerProjetoVisivel(ctx, String(atual.projeto_id)))) {
    throw new ErroRota('nao_encontrado', 404);
  }

  const dados = montarDadosEmissao(ctx.corpo ?? {}, false);
  if (Object.keys(dados).length === 0) throw new ErroRota('nada_para_atualizar', 400);
  conferirEmissao({ ...atual, ...dados });

  const { error } = await ctx.admin
    .from('carbon_emissoes_credito')
    .update(dados)
    .eq('id', ctx.params.id);

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_emissoes_credito', 'campo_invalido');

  return respostaJson({ emissao: await lerEmissaoDetalhe(ctx.admin, ctx.params.id) });
}

/**
 * Remove a emissao.
 *
 * A venda NAO vai junto e nao ha cascade entre as duas: elas se encontram por
 * (projeto, vintage), nunca por chave estrangeira. Apagar a emissao de um vintage
 * que ja tem venda deixa a linha do estoque com a bandeira `sem_emissao` ligada,
 * que e exatamente o que se quer ver - a alternativa (recusar) impediria corrigir
 * um lancamento duplicado, que e o caso real de uso desta rota.
 */
async function removerEmissao(ctx: Contexto): Promise<Response> {
  const atual = await lerEmissaoDetalhe(ctx.admin, ctx.params.id);
  if (!atual) throw new ErroRota('nao_encontrado', 404);
  if (!(await lerProjetoVisivel(ctx, String(atual.projeto_id)))) {
    throw new ErroRota('nao_encontrado', 404);
  }

  const { error } = await ctx.admin
    .from('carbon_emissoes_credito')
    .delete()
    .eq('id', ctx.params.id);

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_emissoes_credito');

  return respostaJson({ removida: true, emissao: atual });
}

// -----------------------------------------------------------------------------
// Vendas
// -----------------------------------------------------------------------------

async function listarVendas(ctx: Contexto): Promise<Response> {
  const { limite, deslocamento, pagina } = paginar(ctx.url);
  const admin = ehAdmin(ctx.registro);

  const compradorId = uuidDaQuery(ctx.url, 'comprador_id');
  const projetoId = uuidDaQuery(ctx.url, 'projeto_id');
  const vintage = vintageDaQuery(ctx.url);
  const moeda = textoDaQuery(ctx.url, 'moeda', 3);
  const aposentadoBruto = ctx.url.searchParams.get('aposentado');
  const situacao = textoDaQuery(ctx.url, 'situacao');

  const aplicarFiltros = (consulta: Consulta): Consulta => {
    let q = consulta;
    if (compradorId) q = q.eq('comprador_id', compradorId);
    if (projetoId) q = q.eq('projeto_id', projetoId);
    if (vintage !== null) q = q.eq('vintage', vintage);
    if (moeda) {
      const normalizada = moeda.toUpperCase();
      if (!MOEDAS.has(normalizada)) throw new ErroRota('moeda_invalida', 400, 'moeda');
      q = q.eq('moeda', normalizada);
    }
    if (aposentadoBruto === 'true') q = q.eq('aposentado', true);
    if (aposentadoBruto === 'false') q = q.eq('aposentado', false);
    // As duas colunas abaixo sao CALCULADAS pela view a partir de
    // public.carbon_venda_ajuste_pendente. Filtrar por elas em vez de remontar a
    // regra aqui e o que mantem uma implementacao unica do Artigo 6.
    if (situacao === 'ajuste_pendente') q = q.eq('ajuste_pendente', true);
    if (situacao === 'internacional') q = q.eq('venda_internacional', true);
    if (situacao === 'sem_preco') q = q.is('preco_unitario', null);
    return q;
  };

  const [lista, paraResumo] = await Promise.all([
    aplicarFiltros(
      ctx.admin
        .from('carbon_vendas_detalhe')
        .select(COLUNAS_VENDA, { count: 'exact' })
        .order('data', { ascending: false, nullsFirst: false })
        .order('criado_em', { ascending: false })
        .range(deslocamento, deslocamento + limite - 1),
    ),
    aplicarFiltros(
      ctx.admin
        .from('carbon_vendas_detalhe')
        .select(
          'moeda, valor_total, preco_unitario, quantidade_tco2e, aposentado, ' +
            'ajuste_pendente, venda_internacional',
        ),
    ),
  ]);

  if (lista.error) {
    console.error('Falha ao ler carbon_vendas_detalhe:', lista.error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (paraResumo.error) {
    console.error('Falha ao resumir carbon_vendas_detalhe:', paraResumo.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const linhas = (paraResumo.data ?? []) as Linha[];
  const porMoeda = (sigla: string) =>
    somar(linhas.filter((l) => l.moeda === sigla), 'valor_total');

  return respostaJson({
    vendas: normalizarLista((lista.data ?? []) as Linha[], NUMERICOS_VENDA).map((v) =>
      mascararVenda(v, admin)
    ),
    total: lista.count ?? (lista.data ?? []).length,
    pagina,
    limite,
    resumo: {
      total: linhas.length,
      volume_tco2e: somar(linhas, 'quantidade_tco2e', 4),
      aposentado_tco2e: somar(
        linhas.filter((l) => l.aposentado === true),
        'quantidade_tco2e',
        4,
      ),
      // Receita SEPARADA por moeda. Nao existe campo de total somado, e a ausencia
      // dele e a regra 1 do cabecalho materializada: somar BRL com USD daria um
      // numero que nenhuma contabilidade reconhece.
      receita: { BRL: porMoeda('BRL'), USD: porMoeda('USD'), EUR: porMoeda('EUR') },
      vendas_por_moeda: {
        BRL: linhas.filter((l) => l.moeda === 'BRL').length,
        USD: linhas.filter((l) => l.moeda === 'USD').length,
        EUR: linhas.filter((l) => l.moeda === 'EUR').length,
      },
      sem_preco: linhas.filter((l) => l.preco_unitario === null).length,
      aposentadas: linhas.filter((l) => l.aposentado === true).length,
      internacionais: linhas.filter((l) => l.venda_internacional === true).length,
      ajuste_pendente: linhas.filter((l) => l.ajuste_pendente === true).length,
    },
  });
}

async function lerVendaDetalhe(admin: SupabaseClient, id: string): Promise<Linha | null> {
  const { data, error } = await admin
    .from('carbon_vendas_detalhe')
    .select(COLUNAS_VENDA)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_vendas_detalhe:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) return null;
  return normalizar(data as unknown as Linha, NUMERICOS_VENDA);
}

/**
 * Campos gravaveis da venda.
 *
 * `valor_total` NAO entra: e coluna GERADA pelo Postgres (quantidade vezes preco,
 * arredondado em 2 casas) e nao aceita escrita. Enviar o campo derrubaria o
 * insert inteiro com um 42501 dificil de ler, entao ele nem chega ao banco.
 *
 * DATA DE APOSENTADORIA LIGA A APOSENTADORIA. A migration pede isso
 * explicitamente: os dois campos nao podem se contradizer, e quem informa a data
 * do extrato do registro esta afirmando que o retirement aconteceu. O caminho
 * inverso continua manual (a equipe pode saber da aposentadoria antes de ter a
 * data em maos), e por isso `aposentado` tambem e aceito sozinho.
 */
function montarDadosVenda(corpo: Linha, criando: boolean): Linha {
  const dados: Linha = {};

  if (criando || veioNoCorpo(corpo, 'comprador_id')) {
    const compradorId = lerUuid(corpo.comprador_id, 'comprador_id');
    if (!compradorId) throw new ErroRota('campo_obrigatorio', 400, 'comprador_id');
    dados.comprador_id = compradorId;
  }

  if (criando || veioNoCorpo(corpo, 'vintage')) {
    const vintage = lerVintage(corpo.vintage);
    if (vintage === null) throw new ErroRota('campo_obrigatorio', 400, 'vintage');
    dados.vintage = vintage;
  }

  if (criando || veioNoCorpo(corpo, 'quantidade_tco2e')) {
    const quantidade = lerVolume(corpo.quantidade_tco2e, 'quantidade_tco2e');
    // Maior que zero: venda de zero tonelada nao existe, e devolucao nao se
    // registra com quantidade negativa (isso furaria a conciliacao inteira).
    if (quantidade === null || quantidade <= 0) {
      throw new ErroRota('quantidade_invalida', 400, 'quantidade_tco2e');
    }
    dados.quantidade_tco2e = quantidade;
  }

  // Anulavel de proposito: parte das transacoes tem preco sob confidencialidade
  // ou ainda em negociacao, e exigir o valor levaria alguem a inventar numero.
  if (veioNoCorpo(corpo, 'preco_unitario')) {
    dados.preco_unitario = lerPreco(corpo.preco_unitario, 'preco_unitario');
  }

  if (veioNoCorpo(corpo, 'moeda')) {
    const moeda = lerTexto(corpo.moeda, 'moeda', 3);
    if (moeda !== null) {
      const normalizada = moeda.toUpperCase();
      if (!MOEDAS.has(normalizada)) throw new ErroRota('moeda_invalida', 400, 'moeda');
      dados.moeda = normalizada;
    }
  }

  if (veioNoCorpo(corpo, 'data')) dados.data = lerData(corpo.data, 'data');
  if (veioNoCorpo(corpo, 'contrato_documento_id')) {
    dados.contrato_documento_id = lerUuid(corpo.contrato_documento_id, 'contrato_documento_id');
  }
  if (veioNoCorpo(corpo, 'ajuste_correspondente')) {
    dados.ajuste_correspondente = corpo.ajuste_correspondente === true;
  }
  if (veioNoCorpo(corpo, 'observacoes')) {
    dados.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO);
  }

  if (veioNoCorpo(corpo, 'aposentado')) dados.aposentado = corpo.aposentado === true;
  if (veioNoCorpo(corpo, 'data_aposentadoria')) {
    dados.data_aposentadoria = lerData(corpo.data_aposentadoria, 'data_aposentadoria');
  }
  if (dados.data_aposentadoria) dados.aposentado = true;
  // Desmarcar a aposentadoria limpa a data junto, senao o CHECK
  // carbon_vendas_aposentadoria_coerente_chk recusaria a linha inteira.
  if (dados.aposentado === false) dados.data_aposentadoria = null;

  return dados;
}

async function criarVenda(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  exigir(corpo, ['comprador_id', 'projeto_id', 'vintage', 'quantidade_tco2e']);

  const projetoId = lerUuid(corpo.projeto_id, 'projeto_id');
  if (!projetoId) throw new ErroRota('campo_obrigatorio', 400, 'projeto_id');
  if (!(await lerProjetoVisivel(ctx, projetoId))) throw new ErroRota('nao_encontrado', 404);

  const dados = montarDadosVenda(corpo, true);

  // VENDA SEM EMISSAO NAO E BLOQUEADA, e isso e decisao de negocio da migration:
  // venda a termo de vintage futuro e pratica normal do mercado, e barrar aqui
  // impediria de registrar um contrato que ja existe. O caso aparece como
  // conciliacao pendente (sem_emissao, sobrevendido) na view de estoque.
  const { data, error } = await ctx.admin
    .from('carbon_vendas')
    .insert({ ...dados, projeto_id: projetoId, criado_por: ctx.registro.id })
    .select('id')
    .single();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_vendas', 'campo_invalido');

  const venda = await lerVendaDetalhe(ctx.admin, String((data as Linha).id));
  return respostaJson(
    { venda: venda ? mascararVenda(venda, ehAdmin(ctx.registro)) : null },
    201,
  );
}

async function atualizarVenda(ctx: Contexto): Promise<Response> {
  const admin = ehAdmin(ctx.registro);
  const atual = await lerVendaDetalhe(ctx.admin, ctx.params.id);
  if (!atual) throw new ErroRota('nao_encontrado', 404);
  if (!(await lerProjetoVisivel(ctx, String(atual.projeto_id)))) {
    throw new ErroRota('nao_encontrado', 404);
  }

  const dados = montarDadosVenda(ctx.corpo ?? {}, false);
  if (Object.keys(dados).length === 0) throw new ErroRota('nada_para_atualizar', 400);

  const { error } = await ctx.admin.from('carbon_vendas').update(dados).eq('id', ctx.params.id);
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_vendas', 'campo_invalido');

  const venda = await lerVendaDetalhe(ctx.admin, ctx.params.id);
  return respostaJson({ venda: venda ? mascararVenda(venda, admin) : null });
}

async function removerVenda(ctx: Contexto): Promise<Response> {
  const admin = ehAdmin(ctx.registro);
  const atual = await lerVendaDetalhe(ctx.admin, ctx.params.id);
  if (!atual) throw new ErroRota('nao_encontrado', 404);
  if (!(await lerProjetoVisivel(ctx, String(atual.projeto_id)))) {
    throw new ErroRota('nao_encontrado', 404);
  }

  const { error } = await ctx.admin.from('carbon_vendas').delete().eq('id', ctx.params.id);
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_vendas');

  // A venda volta na resposta para a tela poder dizer o que foi desfeito. Reverter
  // uma venda e corrigir ou remover a linha: quantidade negativa nao existe neste
  // dominio (o CHECK da coluna exige maior que zero).
  return respostaJson({ removida: true, venda: mascararVenda(atual, admin) });
}

// -----------------------------------------------------------------------------
// Estoque
// -----------------------------------------------------------------------------

/**
 * Estoque por projeto e vintage, mais a conciliacao do conjunto.
 *
 * A LISTA vem da view carbon_estoque_credito e a CONCILIACAO da funcao
 * carbon_estoque_conciliacao: a view responde por linha, a funcao responde pelo
 * conjunto. Nenhuma das duas contas e refeita aqui, e isso e deliberado - somar
 * emitido, buffer e vendido em TypeScript daria, no primeiro caso de borda, um
 * numero que o banco nao produz, e o rodape passaria a contradizer a tabela logo
 * acima dele.
 *
 * O FILTRO POR ALERTA NAO ENTRA NA CONCILIACAO. Ela segue projeto e vintage e
 * ignora `alerta`, pelo mesmo motivo dos totais de parcelas em fornecedores.ts:
 * se seguisse, "disponivel no periodo" significaria uma coisa ao olhar os
 * sobrevendidos e outra ao olhar o estoque parado.
 */
async function listarEstoque(ctx: Contexto): Promise<Response> {
  const { limite, deslocamento, pagina } = paginar(ctx.url);
  const projetoId = uuidDaQuery(ctx.url, 'projeto_id');
  const vintage = vintageDaQuery(ctx.url);
  const alerta = textoDaQuery(ctx.url, 'alerta');

  let consulta = ctx.admin
    .from('carbon_estoque_credito')
    .select(COLUNAS_ESTOQUE, { count: 'exact' })
    .order('projeto_nome', { ascending: true })
    .order('vintage', { ascending: false })
    .range(deslocamento, deslocamento + limite - 1);

  if (projetoId) consulta = consulta.eq('projeto_id', projetoId);
  if (vintage !== null) consulta = consulta.eq('vintage', vintage);
  if (alerta === 'sobrevendido') consulta = consulta.eq('sobrevendido', true);
  if (alerta === 'sem_emissao') consulta = consulta.eq('sem_emissao', true);
  if (alerta === 'sem_venda') consulta = consulta.eq('sem_venda', true);
  if (alerta === 'ajuste_pendente') consulta = consulta.gt('vendas_ajuste_pendente', 0);

  const [lista, conciliacao] = await Promise.all([
    consulta,
    ctx.admin.rpc('carbon_estoque_conciliacao', {
      p_projeto_id: projetoId,
      p_vintage: vintage,
    }),
  ]);

  if (lista.error) {
    console.error('Falha ao ler carbon_estoque_credito:', lista.error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (conciliacao.error) {
    console.error('Falha em carbon_estoque_conciliacao:', conciliacao.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  return respostaJson({
    // `as unknown as`, como no resto do arquivo: a lista de colunas e montada por
    // concatenacao, e com string nao literal o supabase-js devolve
    // GenericStringError, que nao tem index signature e recusa o cast direto.
    estoque: normalizarLista((lista.data ?? []) as unknown as Linha[], NUMERICOS_ESTOQUE),
    total: lista.count ?? (lista.data ?? []).length,
    pagina,
    limite,
    // Nunca null: a funcao SQL devolve zeros e listas vazias para conjunto vazio,
    // que e o estado de hoje (as duas tabelas estao vazias). Um null aqui viraria
    // traco em toda a faixa de resumo no primeiro acesso.
    conciliacao: conciliacao.data ?? null,
  });
}

// -----------------------------------------------------------------------------
// Registro das rotas
// -----------------------------------------------------------------------------
// 'emissoes-credito' e nao 'emissoes': o inventario de GEE (emissoes da operacao,
// outro dominio inteiro) vai querer o nome curto, e duas rotas com o mesmo padrao
// fariam a segunda ficar inalcancavel em silencio - o indice avisa no log, mas o
// nome distinto evita a conversa.

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'compradores', escrita: false, handler: listarCompradores },
  { metodo: 'POST', padrao: 'compradores', escrita: true, handler: criarComprador },
  { metodo: 'GET', padrao: 'compradores/:id', escrita: false, handler: obterComprador },
  { metodo: 'PATCH', padrao: 'compradores/:id', escrita: true, handler: atualizarComprador },

  { metodo: 'GET', padrao: 'emissoes-credito', escrita: false, handler: listarEmissoes },
  { metodo: 'POST', padrao: 'emissoes-credito', escrita: true, handler: criarEmissao },
  { metodo: 'PATCH', padrao: 'emissoes-credito/:id', escrita: true, handler: atualizarEmissao },
  { metodo: 'DELETE', padrao: 'emissoes-credito/:id', escrita: true, handler: removerEmissao },

  { metodo: 'GET', padrao: 'vendas', escrita: false, handler: listarVendas },
  { metodo: 'POST', padrao: 'vendas', escrita: true, handler: criarVenda },
  { metodo: 'PATCH', padrao: 'vendas/:id', escrita: true, handler: atualizarVenda },
  { metodo: 'DELETE', padrao: 'vendas/:id', escrita: true, handler: removerVenda },

  { metodo: 'GET', padrao: 'estoque-credito', escrita: false, handler: listarEstoque },
];

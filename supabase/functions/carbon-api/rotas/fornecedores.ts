// -----------------------------------------------------------------------------
// Rotas de fornecedores, contratos e parcelas (issues #10 e #11).
// -----------------------------------------------------------------------------
// GET    carbon-api/fornecedores                  -> { fornecedores, total, pagina, limite, resumo }
// POST   carbon-api/fornecedores                  -> { fornecedor }                        201
// GET    carbon-api/fornecedores/:id              -> { fornecedor, contratos }
// PATCH  carbon-api/fornecedores/:id              -> { fornecedor }
// GET    carbon-api/contratos                     -> { contratos, total, pagina, limite, resumo }
// POST   carbon-api/contratos                     -> { contrato }                          201
// GET    carbon-api/contratos/:id                 -> { contrato, parcelas, totais }
// PATCH  carbon-api/contratos/:id                 -> { contrato }
// POST   carbon-api/contratos/:id/parcelas        -> { parcela }                           201
// POST   carbon-api/contratos/:id/parcelas-gerar  -> { geracao, contrato, parcelas, totais }
// GET    carbon-api/parcelas                      -> { parcelas, total, pagina, limite, totais }
// PATCH  carbon-api/parcelas/:id                  -> { parcela }
// DELETE carbon-api/parcelas/:id                  -> { removida: true, parcela }
//
// Objetos SQL de que este modulo depende (migration 20260814097000_fornecedores):
//   public.carbon_fornecedores / carbon_contratos / carbon_parcelas
//   public.carbon_fornecedores_listagem     (view SEM a coluna dados_bancarios)
//   public.carbon_contratos_detalhe         (view com fornecedor, projeto e resumo)
//   public.carbon_parcelas_detalhe          (view base, com o status derivado)
//   public.carbon_parcelas_em_aberto / carbon_parcelas_pagas
//   public.carbon_parcelas_gerar(...)       (geracao da serie)
//   public.carbon_parcelas_totais(...)      (totalizacao por periodo e centro de custo)
//
// DADOS BANCARIOS - REQUISITO DE PRIVACIDADE DA ISSUE #10, implementado aqui:
//   - a LISTAGEM le a view carbon_fornecedores_listagem, que nao tem a coluna. A
//     garantia e estrutural: nao existe select nesta rota capaz de vazar o campo.
//   - o DETALHE inclui a coluna na lista de colunas do select SOMENTE quando o
//     papel do chamador e admin. Para os demais o valor nao sai do banco, e vai
//     apenas o booleano tem_dados_bancarios.
//   - a ESCRITA segue o portao geral (admin ou gestor), e nao so admin. Ver a nota
//     em podeVerDadosBancarios: restringir a escrita ao admin empurraria a equipe
//     a colar dado de pagamento no campo de observacoes, que e pior.
//
// STATUS DA PARCELA: nenhuma rota daqui aceita status de pagamento no corpo. O
// status e derivado (funcao SQL carbon_parcelas_status, exposta nas views) e o
// unico jeito de baixar uma parcela e informar data_pagamento. E o requisito
// central da issue #11.
//
// PUBLICACAO: para estas rotas entrarem no ar falta UMA linha de import e UMA de
// spread em rotas/indice.ts, que e arquivo compartilhado da fundacao e nao foi
// tocado por este modulo (o Deno Deploy nao tem equivalente do import.meta.glob,
// ver o cabecalho do indice).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { respostaErro, respostaJson } from '../../_shared/cors.ts';
import type { Contexto, RegistroUsuario, Rota } from './tipos.ts';
import {
  ErroRota,
  type ErroBanco,
  ehObjeto,
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

// -----------------------------------------------------------------------------
// Vocabulario do dominio (espelha os CHECK da migration)
// -----------------------------------------------------------------------------

/** carbon_fornecedores.status_contratacao. Os tres estados observados no Notion. */
const STATUS_CONTRATACAO = new Set(['nao_iniciada', 'em_andamento', 'concluida']);

/** carbon_contratos.status. */
const STATUS_CONTRATO = new Set(['ativo', 'encerrado', 'cancelado']);

/**
 * Periodicidades aceitas pela geracao. MESMA lista do CASE de
 * public.carbon_parcelas_gerar: validamos aqui para o erro sair com codigo e
 * campo certos, e a funcao SQL valida de novo porque tambem pode ser chamada de
 * fora da API.
 */
const PERIODICIDADES = new Set([
  'unica',
  'mensal',
  'bimestral',
  'trimestral',
  'quadrimestral',
  'semestral',
  'anual',
]);

/** Mesmo limite da funcao SQL: 240 = 20 anos de parcela mensal. */
const QUANTIDADE_MAXIMA_PARCELAS = 240;

/**
 * Visoes da listagem de parcelas. Espelham as views da base do Notion ("Em
 * aberto", "Pagas", "Calendar"). 'calendario' e 'todas' leem a mesma view base: a
 * diferenca entre as duas esta na tela, que agrupa por dia.
 */
const VISOES_PARCELA: Record<string, string> = {
  em_aberto: 'carbon_parcelas_em_aberto',
  pagas: 'carbon_parcelas_pagas',
  calendario: 'carbon_parcelas_detalhe',
  todas: 'carbon_parcelas_detalhe',
};

// -----------------------------------------------------------------------------
// Colunas
// -----------------------------------------------------------------------------

/**
 * Colunas do fornecedor no DETALHE, sem dados_bancarios.
 *
 * dados_bancarios NAO esta nesta constante de proposito: ela e usada tambem por
 * PATCH e POST, e a coluna so entra no select do detalhe quando o papel e admin
 * (ver colunasDetalheFornecedor). Deixar o campo fora do default e o que garante
 * que uma rota nova escrita depois nao passe a devolver o dado sem querer.
 */
const COLUNAS_FORNECEDOR =
  'id, nome, cnpj, status_contratacao, contratante, observacoes, ativo, ' +
  'criado_por, criado_em, atualizado_em';

const COLUNAS_LISTAGEM_FORNECEDOR =
  'id, nome, cnpj, status_contratacao, contratante, observacoes, ativo, ' +
  'criado_em, atualizado_em, tem_dados_bancarios, contratos, contratos_ativos, ' +
  'valor_contratado, parcelas, valor_parcelado, valor_pago, valor_aberto, ' +
  'valor_vencido, parcelas_vencidas, proximo_vencimento';

const COLUNAS_CONTRATO =
  'id, fornecedor_id, projeto_id, objeto, data_contratacao, valor_total, ' +
  'centro_custo, tipo_servico, status, observacoes, criado_por, criado_em, ' +
  'atualizado_em, fornecedor_nome, fornecedor_cnpj, fornecedor_status_contratacao, ' +
  'fornecedor_ativo, projeto_nome, parcelas, parcelas_pagas, parcelas_vencidas, ' +
  'valor_parcelado, valor_pago, valor_aberto, valor_vencido, primeiro_vencimento, ' +
  'ultimo_vencimento, proximo_vencimento';

const COLUNAS_PARCELA =
  'id, contrato_id, numero, descricao, valor, vencimento, data_pagamento, ' +
  'tipo_servico, centro_custo, observacoes, criado_em, atualizado_em, ' +
  'status_pagamento, dias_para_vencimento, atraso_dias, fornecedor_id, ' +
  'projeto_id, contrato_objeto, contrato_status, contrato_data_contratacao, ' +
  'fornecedor_nome, projeto_nome';

/** Campos numeric que o PostgREST pode devolver como texto. Ver normalizar(). */
const NUMERICOS_FORNECEDOR = [
  'valor_contratado',
  'valor_parcelado',
  'valor_pago',
  'valor_aberto',
  'valor_vencido',
];

const NUMERICOS_CONTRATO = [
  'valor_total',
  'valor_parcelado',
  'valor_pago',
  'valor_aberto',
  'valor_vencido',
];

const NUMERICOS_PARCELA = ['valor'];

// -----------------------------------------------------------------------------
// Utilitarios
// -----------------------------------------------------------------------------

type Linha = Record<string, unknown>;

/**
 * Construtor de consulta do PostgREST, sem tipo.
 *
 * As duas listagens aplicam os mesmos filtros em DUAS consultas (a pagina e o
 * conjunto inteiro para o resumo), e por isso a montagem dos filtros vive numa
 * funcao. Tipar o encadeamento do supabase-js aqui exigiria repetir a genealogia
 * de PostgrestFilterBuilder com os generics da tabela, o que trocaria uma
 * seguranca de tipo que nao usamos por dez linhas de ruido. O risco real (nome de
 * coluna errado) nao e coberto por esse tipo de qualquer forma: quem reclama e o
 * banco, em runtime.
 */
// deno-lint-ignore no-explicit-any
type Consulta = any;

/**
 * Converte para number as colunas numeric listadas.
 *
 * numeric do Postgres pode chegar como string dependendo do caminho (RPC, view,
 * versao do PostgREST). Sem normalizar, a tela faria concatenacao de texto onde
 * deveria somar - e "1000" + "2000" = "10002000" e o tipo de bug que passa pela
 * revisao porque o numero ate parece grande.
 */
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
 * Papel que pode LER dados bancarios: somente admin.
 *
 * POR QUE A ESCRITA NAO E RESTRITA AO ADMIN. O portao de escrita geral da API ja
 * exige admin ou gestor. Fechar a escrita deste campo so para admin pareceria
 * mais seguro e seria pior na pratica: quem cadastra o fornecedor no dia a dia e
 * o gestor, e sem lugar legitimo para o dado de pagamento ele acabaria colado no
 * campo de observacoes - que aparece na LISTAGEM, para todo mundo. O gestor
 * portanto escreve sem poder ler de volta (o formulario dele nao mostra o campo,
 * e o PATCH so toca a coluna quando a chave vem no corpo).
 *
 * RISCO RESIDUAL ACEITO E REGISTRADO: um gestor pode sobrescrever o dado sem
 * ve-lo. Log de alteracao por campo nao existe neste dominio; se isso passar a
 * importar, e issue propria.
 */
function podeVerDadosBancarios(registro: RegistroUsuario): boolean {
  return String(registro.papel ?? '').toLowerCase() === 'admin';
}

function colunasDetalheFornecedor(registro: RegistroUsuario): string {
  return podeVerDadosBancarios(registro)
    ? `${COLUNAS_FORNECEDOR}, dados_bancarios`
    : COLUNAS_FORNECEDOR;
}

/**
 * Monta o fornecedor do detalhe.
 *
 * tem_dados_bancarios sai SEMPRE; dados_bancarios so quando o papel permite. Quem
 * nao pode ver recebe a informacao de que existe cadastro de pagamento (ou que
 * falta) sem receber o conteudo - e essa distincao que faz a tela poder cobrar o
 * cadastro sem expor o dado.
 */
function montarFornecedor(linha: Linha, registro: RegistroUsuario): Linha {
  const visivel = podeVerDadosBancarios(registro);
  const bruto = linha.dados_bancarios;
  const dados = typeof bruto === 'string' && bruto.trim() !== '' ? bruto : null;

  const resto: Linha = { ...linha };
  // delete e nao desestruturacao com descarte: sobra de variavel nao usada num
  // arquivo que ninguem linta e o tipo de coisa que fica.
  delete resto.dados_bancarios;

  return {
    ...resto,
    tem_dados_bancarios: visivel ? dados !== null : Boolean(linha.tem_dados_bancarios),
    dados_bancarios_visivel: visivel,
    ...(visivel ? { dados_bancarios: dados } : {}),
  };
}

/**
 * Fornecedor pronto para a resposta, com tem_dados_bancarios sempre correto.
 *
 * Para quem pode ler, o booleano sai do proprio valor. Para quem NAO pode, o valor
 * nem foi selecionado, entao o booleano vem da view de listagem numa consulta
 * extra minuscula. Sem isso, o gestor que acabou de cadastrar os dados de
 * pagamento veria a tela afirmar que nao existe cadastro - uma mentira que o
 * levaria a cadastrar de novo, ou a desconfiar do sistema.
 */
async function responderFornecedor(
  admin: SupabaseClient,
  linha: Linha,
  registro: RegistroUsuario,
): Promise<Linha> {
  if (podeVerDadosBancarios(registro)) return montarFornecedor(linha, registro);

  const { data, error } = await admin
    .from('carbon_fornecedores_listagem')
    .select('tem_dados_bancarios')
    .eq('id', linha.id)
    .maybeSingle();

  if (error) {
    // Falha aqui nao pode derrubar a resposta inteira: o fornecedor existe e foi
    // lido. Degradamos para "nao sei se tem" (false) e registramos no log.
    console.warn('Falha ao ler tem_dados_bancarios:', error.message);
  }

  return montarFornecedor(
    { ...linha, tem_dados_bancarios: Boolean((data as Linha | null)?.tem_dados_bancarios) },
    registro,
  );
}

/** CNPJ so em digitos, como a coluna exige. '' significa limpar o campo. */
function lerCnpj(valor: unknown): string | null {
  const texto = lerTexto(valor, 'cnpj', 40);
  if (texto === null) return null;

  const digitos = texto.replace(/\D/g, '');
  if (digitos === '') return null;
  // 14 digitos exatos: o CHECK da coluna recusaria de qualquer forma, mas aqui o
  // erro sai com o campo no detalhe em vez de virar um 'campo_invalido' anonimo.
  if (digitos.length !== 14) throw new ErroRota('cnpj_invalido', 400, 'cnpj');
  return digitos;
}

/** Valor em BRL. Reaproveita lerNumero (recusa "13.250", aceita "1234,50"). */
function lerValor(valor: unknown, campo: string): number | null {
  const n = lerNumero(valor, campo);
  if (n === null) return null;
  // numeric(14,2) guarda 12 digitos inteiros; lerNumero ja corta em 1e10.
  return Math.round(n * 100) / 100;
}

/** UUID vindo da query string. Filtro torto e erro do cliente, nao "sem filtro". */
function uuidDaQuery(url: URL, chave: string): string | null {
  const bruto = url.searchParams.get(chave);
  if (bruto === null || bruto.trim() === '') return null;
  return lerUuid(bruto, chave);
}

function dataDaQuery(url: URL, chave: string): string | null {
  const bruto = url.searchParams.get(chave);
  if (bruto === null || bruto.trim() === '') return null;
  return lerData(bruto, chave);
}

function textoDaQuery(url: URL, chave: string, limite = 120): string | null {
  const bruto = url.searchParams.get(chave);
  if (bruto === null) return null;
  const limpo = bruto.trim().slice(0, limite);
  return limpo === '' ? null : limpo;
}

/**
 * Totais do periodo pela funcao SQL.
 *
 * Sempre pela RPC, nunca somando aqui: a regra de status derivado e a de
 * "centro de custo da parcela, nao do contrato" precisam ter implementacao unica.
 * Somar em TypeScript daria numero que o banco nao produz na primeira vez que
 * alguem mexer na janela de dias.
 */
async function lerTotais(
  admin: SupabaseClient,
  filtros: {
    inicio?: string | null;
    fim?: string | null;
    centroCusto?: string | null;
    fornecedorId?: string | null;
    projetoId?: string | null;
    contratoId?: string | null;
  },
): Promise<unknown> {
  const { data, error } = await admin.rpc('carbon_parcelas_totais', {
    p_inicio: filtros.inicio ?? null,
    p_fim: filtros.fim ?? null,
    p_centro_custo: filtros.centroCusto ?? null,
    p_fornecedor_id: filtros.fornecedorId ?? null,
    p_projeto_id: filtros.projetoId ?? null,
    p_contrato_id: filtros.contratoId ?? null,
  });

  if (error) {
    console.error('Falha em carbon_parcelas_totais:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return data ?? null;
}

// -----------------------------------------------------------------------------
// Fornecedores
// -----------------------------------------------------------------------------

/**
 * Lista fornecedores com os agregados de contrato e parcela.
 *
 * Le a VIEW carbon_fornecedores_listagem, que nao tem a coluna dados_bancarios:
 * e assim que o requisito de privacidade da issue #10 deixa de depender de
 * alguem lembrar de escrever a lista de colunas certa.
 *
 * O `resumo` e calculado sobre TODO o conjunto filtrado, com uma segunda consulta
 * enxuta, e nao sobre a pagina: um rodape que dissesse "R$ X em aberto" contando
 * apenas as 50 primeiras linhas seria pior do que nao ter rodape.
 */
async function listarFornecedores(ctx: Contexto): Promise<Response> {
  const { limite, deslocamento, pagina } = paginar(ctx.url);
  const status = textoDaQuery(ctx.url, 'status');
  const busca = textoDaQuery(ctx.url, 'busca');
  const ativoBruto = ctx.url.searchParams.get('ativo');

  const aplicarFiltros = (consulta: Consulta): Consulta => {
    let q = consulta;
    if (status && STATUS_CONTRATACAO.has(status)) q = q.eq('status_contratacao', status);
    if (ativoBruto === 'true') q = q.eq('ativo', true);
    if (ativoBruto === 'false') q = q.eq('ativo', false);
    if (busca) {
      // Termo com cara de documento (so digito e a pontuacao de CNPJ) busca no
      // cnpj, que esta guardado sem mascara; o resto busca no nome.
      //
      // NAO usamos .or() de proposito: montar a string do or com texto do usuario
      // e onde nasce injecao de filtro no PostgREST - uma virgula no termo muda a
      // arvore de condicoes da consulta.
      const digitos = busca.replace(/\D/g, '');
      if (digitos.length >= 3 && /^[\d./\s-]+$/.test(busca)) {
        q = q.ilike('cnpj', `%${digitos}%`);
      } else {
        q = q.ilike('nome', `%${busca}%`);
      }
    }
    return q;
  };

  const pagQuery = aplicarFiltros(
    ctx.admin
      .from('carbon_fornecedores_listagem')
      .select(COLUNAS_LISTAGEM_FORNECEDOR, { count: 'exact' })
      .order('nome', { ascending: true })
      .range(deslocamento, deslocamento + limite - 1),
  );

  const resumoQuery = aplicarFiltros(
    ctx.admin
      .from('carbon_fornecedores_listagem')
      .select(
        'status_contratacao, ativo, tem_dados_bancarios, valor_contratado, ' +
          'valor_aberto, valor_vencido, parcelas_vencidas',
      ),
  );

  const [lista, paraResumo] = await Promise.all([pagQuery, resumoQuery]);

  if (lista.error) {
    console.error('Falha ao ler carbon_fornecedores_listagem:', lista.error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (paraResumo.error) {
    console.error('Falha ao resumir carbon_fornecedores_listagem:', paraResumo.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const linhas = (paraResumo.data ?? []) as Linha[];
  const resumo = {
    total: linhas.length,
    ativos: linhas.filter((l) => l.ativo !== false).length,
    por_status: {
      nao_iniciada: linhas.filter((l) => l.status_contratacao === 'nao_iniciada').length,
      em_andamento: linhas.filter((l) => l.status_contratacao === 'em_andamento').length,
      concluida: linhas.filter((l) => l.status_contratacao === 'concluida').length,
    },
    com_dados_bancarios: linhas.filter((l) => l.tem_dados_bancarios === true).length,
    valor_contratado: somar(linhas, 'valor_contratado'),
    valor_aberto: somar(linhas, 'valor_aberto'),
    valor_vencido: somar(linhas, 'valor_vencido'),
    fornecedores_com_vencido: linhas.filter((l) => (paraNumero(l.parcelas_vencidas) ?? 0) > 0)
      .length,
  };

  return respostaJson({
    fornecedores: normalizarLista((lista.data ?? []) as Linha[], NUMERICOS_FORNECEDOR),
    total: lista.count ?? (lista.data ?? []).length,
    pagina,
    limite,
    resumo,
  });
}

/**
 * Soma uma coluna de dinheiro em centavos e volta para reais.
 *
 * Somar float direto acumula erro de ponto flutuante (0,1 + 0,2 = 0,30000000000000004)
 * e o rodape passa a mostrar centavo que nao existe. O banco soma em numeric; aqui,
 * onde a soma e so de conferencia da listagem, centavos inteiros resolvem.
 */
function somar(linhas: Linha[], campo: string): number {
  const centavos = linhas.reduce(
    (total, linha) => total + Math.round((paraNumero(linha[campo]) ?? 0) * 100),
    0,
  );
  return centavos / 100;
}

/** Corpo do fornecedor. `criando` decide se campo ausente e default ou "manter". */
function montarDadosFornecedor(corpo: Linha, criando: boolean): Linha {
  const dados: Linha = {};

  if (criando || veioNoCorpo(corpo, 'nome')) {
    const nome = lerTexto(corpo.nome, 'nome', 200);
    if (!nome) throw new ErroRota('campo_obrigatorio', 400, 'nome');
    dados.nome = nome;
  }

  if (veioNoCorpo(corpo, 'cnpj')) dados.cnpj = lerCnpj(corpo.cnpj);
  if (veioNoCorpo(corpo, 'contratante')) {
    dados.contratante = lerTexto(corpo.contratante, 'contratante', 200);
  }
  if (veioNoCorpo(corpo, 'observacoes')) {
    dados.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO);
  }

  if (veioNoCorpo(corpo, 'status_contratacao')) {
    const status = lerEnum(
      corpo.status_contratacao,
      STATUS_CONTRATACAO,
      'status_invalido',
      'status_contratacao',
    );
    // Enviar null limparia uma coluna NOT NULL: tratamos como "nao mexer".
    if (status !== null) dados.status_contratacao = status;
  }

  if (veioNoCorpo(corpo, 'ativo')) {
    dados.ativo = corpo.ativo === null ? true : Boolean(corpo.ativo);
  }

  // dados_bancarios: escrita pelo portao geral (admin ou gestor). A coluna so e
  // tocada quando a chave vem no corpo, portanto um formulario que nao mostra o
  // campo (o do gestor) nunca apaga o que o admin cadastrou. Ver
  // podeVerDadosBancarios para o motivo de a escrita nao ser restrita ao admin.
  if (veioNoCorpo(corpo, 'dados_bancarios')) {
    dados.dados_bancarios = lerTexto(
      corpo.dados_bancarios,
      'dados_bancarios',
      LIMITE_TEXTO_LONGO,
    );
  }

  return dados;
}

async function criarFornecedor(ctx: Contexto): Promise<Response> {
  const dados = montarDadosFornecedor(ctx.corpo ?? {}, true);

  const { data, error } = await ctx.admin
    .from('carbon_fornecedores')
    .insert({ ...dados, criado_por: ctx.registro.id })
    .select(colunasDetalheFornecedor(ctx.registro))
    .single();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_fornecedores', 'cnpj_invalido');

  return respostaJson(
    { fornecedor: await responderFornecedor(ctx.admin, data as Linha, ctx.registro) },
    201,
  );
}

async function obterFornecedor(ctx: Contexto): Promise<Response> {
  const id = ctx.params.id;

  const [fornecedor, contratos] = await Promise.all([
    ctx.admin
      .from('carbon_fornecedores')
      .select(colunasDetalheFornecedor(ctx.registro))
      .eq('id', id)
      .maybeSingle(),
    ctx.admin
      .from('carbon_contratos_detalhe')
      .select(COLUNAS_CONTRATO)
      .eq('fornecedor_id', id)
      .order('data_contratacao', { ascending: false, nullsFirst: false })
      .order('criado_em', { ascending: false }),
  ]);

  if (fornecedor.error) {
    console.error('Falha ao ler carbon_fornecedores:', fornecedor.error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!fornecedor.data) return respostaErro('nao_encontrado', 404);
  if (contratos.error) {
    console.error('Falha ao ler carbon_contratos_detalhe:', contratos.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  return respostaJson({
    fornecedor: await responderFornecedor(ctx.admin, fornecedor.data as Linha, ctx.registro),
    contratos: normalizarLista((contratos.data ?? []) as Linha[], NUMERICOS_CONTRATO),
  });
}

async function atualizarFornecedor(ctx: Contexto): Promise<Response> {
  const dados = montarDadosFornecedor(ctx.corpo ?? {}, false);
  if (Object.keys(dados).length === 0) return respostaErro('nada_para_atualizar', 400);

  const { data, error } = await ctx.admin
    .from('carbon_fornecedores')
    .update(dados)
    .eq('id', ctx.params.id)
    .select(colunasDetalheFornecedor(ctx.registro))
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_fornecedores', 'cnpj_invalido');
  if (!data) return respostaErro('nao_encontrado', 404);

  return respostaJson({
    fornecedor: await responderFornecedor(ctx.admin, data as Linha, ctx.registro),
  });
}

// -----------------------------------------------------------------------------
// Contratos
// -----------------------------------------------------------------------------

async function listarContratos(ctx: Contexto): Promise<Response> {
  const { limite, deslocamento, pagina } = paginar(ctx.url);
  const fornecedorId = uuidDaQuery(ctx.url, 'fornecedor_id');
  const status = textoDaQuery(ctx.url, 'status');
  const centroCusto = textoDaQuery(ctx.url, 'centro_custo');
  const busca = textoDaQuery(ctx.url, 'busca');
  // 'backoffice' = so contratos SEM projeto. Diferente de nao filtrar, e a mesma
  // convencao que a listagem de reunioes usa para a operacao sem projeto. Lido
  // ANTES de uuidDaQuery porque 'backoffice' nao e UUID e seria recusado por ela.
  const semProjeto = ctx.url.searchParams.get('projeto_id') === 'backoffice';
  const projetoId = semProjeto ? null : uuidDaQuery(ctx.url, 'projeto_id');

  const aplicarFiltros = (consulta: Consulta): Consulta => {
    let q = consulta;
    if (fornecedorId) q = q.eq('fornecedor_id', fornecedorId);
    if (semProjeto) q = q.is('projeto_id', null);
    else if (projetoId) q = q.eq('projeto_id', projetoId);
    if (status && STATUS_CONTRATO.has(status)) q = q.eq('status', status);
    if (centroCusto === 'sem_centro') q = q.is('centro_custo', null);
    else if (centroCusto) q = q.eq('centro_custo', centroCusto);
    if (busca) q = q.ilike('objeto', `%${busca}%`);
    return q;
  };

  const [lista, paraResumo] = await Promise.all([
    aplicarFiltros(
      ctx.admin
        .from('carbon_contratos_detalhe')
        .select(COLUNAS_CONTRATO, { count: 'exact' })
        .order('data_contratacao', { ascending: false, nullsFirst: false })
        .order('criado_em', { ascending: false })
        .range(deslocamento, deslocamento + limite - 1),
    ),
    aplicarFiltros(
      ctx.admin
        .from('carbon_contratos_detalhe')
        .select('status, valor_total, valor_parcelado, valor_aberto, valor_vencido'),
    ),
  ]);

  if (lista.error) {
    console.error('Falha ao ler carbon_contratos_detalhe:', lista.error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (paraResumo.error) {
    console.error('Falha ao resumir carbon_contratos_detalhe:', paraResumo.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const linhas = (paraResumo.data ?? []) as Linha[];
  const resumo = {
    total: linhas.length,
    ativos: linhas.filter((l) => l.status === 'ativo').length,
    encerrados: linhas.filter((l) => l.status === 'encerrado').length,
    cancelados: linhas.filter((l) => l.status === 'cancelado').length,
    valor_contratado: somar(linhas, 'valor_total'),
    valor_parcelado: somar(linhas, 'valor_parcelado'),
    valor_aberto: somar(linhas, 'valor_aberto'),
    valor_vencido: somar(linhas, 'valor_vencido'),
    // Contratos em que a soma das parcelas nao fecha com o valor contratado.
    // Nao e erro: pode ser aditivo, glosa ou serie ainda nao gerada. E informacao
    // que a tela mostra, porque o silencio aqui e que esconde parcela faltando.
    com_divergencia: linhas.filter((l) => {
      const total = paraNumero(l.valor_total);
      const parcelado = paraNumero(l.valor_parcelado) ?? 0;
      if (total === null || total === 0) return false;
      return Math.round(total * 100) !== Math.round(parcelado * 100);
    }).length,
  };

  return respostaJson({
    contratos: normalizarLista((lista.data ?? []) as Linha[], NUMERICOS_CONTRATO),
    total: lista.count ?? (lista.data ?? []).length,
    pagina,
    limite,
    resumo,
  });
}

function montarDadosContrato(corpo: Linha, criando: boolean): Linha {
  const dados: Linha = {};

  if (criando || veioNoCorpo(corpo, 'fornecedor_id')) {
    const fornecedorId = lerUuid(corpo.fornecedor_id, 'fornecedor_id');
    if (!fornecedorId) throw new ErroRota('campo_obrigatorio', 400, 'fornecedor_id');
    dados.fornecedor_id = fornecedorId;
  }

  if (criando || veioNoCorpo(corpo, 'objeto')) {
    const objeto = lerTexto(corpo.objeto, 'objeto', 500);
    if (!objeto) throw new ErroRota('campo_obrigatorio', 400, 'objeto');
    dados.objeto = objeto;
  }

  // projeto_id anulavel: contratacao de backoffice nao pertence a projeto nenhum.
  if (veioNoCorpo(corpo, 'projeto_id')) {
    dados.projeto_id = lerUuid(corpo.projeto_id, 'projeto_id');
  }
  if (veioNoCorpo(corpo, 'data_contratacao')) {
    dados.data_contratacao = lerData(corpo.data_contratacao, 'data_contratacao');
  }
  if (veioNoCorpo(corpo, 'valor_total')) {
    dados.valor_total = lerValor(corpo.valor_total, 'valor_total');
  }
  if (veioNoCorpo(corpo, 'centro_custo')) {
    dados.centro_custo = lerTexto(corpo.centro_custo, 'centro_custo', 120);
  }
  if (veioNoCorpo(corpo, 'tipo_servico')) {
    dados.tipo_servico = lerTexto(corpo.tipo_servico, 'tipo_servico', 120);
  }
  if (veioNoCorpo(corpo, 'observacoes')) {
    dados.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO);
  }
  if (veioNoCorpo(corpo, 'status')) {
    const status = lerEnum(corpo.status, STATUS_CONTRATO, 'status_invalido', 'status');
    if (status !== null) dados.status = status;
  }

  return dados;
}

/** Contrato pela view de detalhe, para a resposta ter sempre a mesma forma. */
async function lerContratoDetalhe(
  admin: SupabaseClient,
  id: string,
): Promise<Linha | null> {
  const { data, error } = await admin
    .from('carbon_contratos_detalhe')
    .select(COLUNAS_CONTRATO)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_contratos_detalhe:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) return null;
  return normalizar(data as Linha, NUMERICOS_CONTRATO);
}

async function criarContrato(ctx: Contexto): Promise<Response> {
  const dados = montarDadosContrato(ctx.corpo ?? {}, true);

  const { data, error } = await ctx.admin
    .from('carbon_contratos')
    .insert({ ...dados, criado_por: ctx.registro.id })
    .select('id')
    .single();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_contratos', 'status_invalido');

  const contrato = await lerContratoDetalhe(ctx.admin, String((data as Linha).id));
  return respostaJson({ contrato }, 201);
}

async function obterContrato(ctx: Contexto): Promise<Response> {
  const id = ctx.params.id;
  const contrato = await lerContratoDetalhe(ctx.admin, id);
  if (!contrato) return respostaErro('nao_encontrado', 404);

  const [parcelas, totais] = await Promise.all([
    ctx.admin
      .from('carbon_parcelas_detalhe')
      .select(COLUNAS_PARCELA)
      .eq('contrato_id', id)
      .order('numero', { ascending: true }),
    // Sem periodo: os totais do contrato sao a serie inteira dele.
    lerTotais(ctx.admin, { contratoId: id }),
  ]);

  if (parcelas.error) {
    console.error('Falha ao ler carbon_parcelas_detalhe:', parcelas.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  return respostaJson({
    contrato,
    parcelas: normalizarLista((parcelas.data ?? []) as Linha[], NUMERICOS_PARCELA),
    totais,
  });
}

async function atualizarContrato(ctx: Contexto): Promise<Response> {
  const dados = montarDadosContrato(ctx.corpo ?? {}, false);
  if (Object.keys(dados).length === 0) return respostaErro('nada_para_atualizar', 400);

  const { data, error } = await ctx.admin
    .from('carbon_contratos')
    .update(dados)
    .eq('id', ctx.params.id)
    .select('id')
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_contratos', 'status_invalido');
  if (!data) return respostaErro('nao_encontrado', 404);

  return respostaJson({ contrato: await lerContratoDetalhe(ctx.admin, ctx.params.id) });
}

// -----------------------------------------------------------------------------
// Parcelas
// -----------------------------------------------------------------------------

async function listarParcelas(ctx: Contexto): Promise<Response> {
  const { limite, deslocamento, pagina } = paginar(ctx.url);
  const visaoBruta = textoDaQuery(ctx.url, 'visao') ?? 'todas';
  const tabela = VISOES_PARCELA[visaoBruta];
  if (!tabela) throw new ErroRota('campo_invalido', 400, 'visao');

  const inicio = dataDaQuery(ctx.url, 'inicio');
  const fim = dataDaQuery(ctx.url, 'fim');
  const fornecedorId = uuidDaQuery(ctx.url, 'fornecedor_id');
  const projetoId = uuidDaQuery(ctx.url, 'projeto_id');
  const contratoId = uuidDaQuery(ctx.url, 'contrato_id');
  // 'sem_centro' filtra as parcelas sem centro de custo. A funcao SQL usa '' para
  // isso, e a query string precisa de um valor que nao seja "vazio = sem filtro".
  const centroBruto = textoDaQuery(ctx.url, 'centro_custo');
  const centroCusto = centroBruto === 'sem_centro' ? '' : centroBruto;

  if (inicio && fim && fim < inicio) {
    // 'AAAA-MM-DD' e ordenavel lexicograficamente.
    throw new ErroRota('periodo_invalido', 400, 'fim');
  }

  let consulta = ctx.admin
    .from(tabela)
    .select(COLUNAS_PARCELA, { count: 'exact' })
    .order('vencimento', { ascending: true })
    .order('numero', { ascending: true })
    .range(deslocamento, deslocamento + limite - 1);

  if (inicio) consulta = consulta.gte('vencimento', inicio);
  if (fim) consulta = consulta.lte('vencimento', fim);
  if (fornecedorId) consulta = consulta.eq('fornecedor_id', fornecedorId);
  if (projetoId) consulta = consulta.eq('projeto_id', projetoId);
  if (contratoId) consulta = consulta.eq('contrato_id', contratoId);
  if (centroCusto === '') consulta = consulta.is('centro_custo', null);
  else if (centroCusto) consulta = consulta.eq('centro_custo', centroCusto);

  const [lista, totais] = await Promise.all([
    consulta,
    // Os totais NAO seguem a visao de proposito: somam o periodo inteiro e
    // devolvem a quebra por status. Ver o comentario da funcao SQL.
    lerTotais(ctx.admin, { inicio, fim, centroCusto, fornecedorId, projetoId, contratoId }),
  ]);

  if (lista.error) {
    console.error(`Falha ao ler ${tabela}:`, lista.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  return respostaJson({
    parcelas: normalizarLista((lista.data ?? []) as Linha[], NUMERICOS_PARCELA),
    total: lista.count ?? (lista.data ?? []).length,
    pagina,
    limite,
    visao: visaoBruta,
    totais,
  });
}

/** Parcela pela view de detalhe (traz status derivado e nomes resolvidos). */
async function lerParcelaDetalhe(admin: SupabaseClient, id: string): Promise<Linha | null> {
  const { data, error } = await admin
    .from('carbon_parcelas_detalhe')
    .select(COLUNAS_PARCELA)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_parcelas_detalhe:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) return null;
  return normalizar(data as Linha, NUMERICOS_PARCELA);
}

/**
 * Cria UMA parcela avulsa no contrato.
 *
 * Existe ao lado da geracao automatica porque parcela extra acontece (aditivo,
 * reembolso, medicao fora do cronograma) e sem esta rota o caminho seria regerar
 * a serie inteira. O `numero` NAO vem do corpo: e max(numero) + 1 do contrato, o
 * que evita pedir a quem preenche uma informacao que o sistema ja sabe.
 */
async function criarParcela(ctx: Contexto): Promise<Response> {
  const contratoId = ctx.params.id;
  const contrato = await lerContratoDetalhe(ctx.admin, contratoId);
  if (!contrato) return respostaErro('nao_encontrado', 404);

  const corpo = ctx.corpo ?? {};
  exigir(corpo, ['valor', 'vencimento']);

  const valor = lerValor(corpo.valor, 'valor');
  if (valor === null) throw new ErroRota('campo_obrigatorio', 400, 'valor');
  const vencimento = lerData(corpo.vencimento, 'vencimento');
  if (!vencimento) throw new ErroRota('campo_obrigatorio', 400, 'vencimento');

  const { data: ultima, error: erroUltima } = await ctx.admin
    .from('carbon_parcelas')
    .select('numero')
    .eq('contrato_id', contratoId)
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erroUltima) {
    console.error('Falha ao ler o ultimo numero de parcela:', erroUltima.message);
    throw new ErroRota('erro_interno', 500);
  }

  const numero = (paraNumero((ultima as Linha | null)?.numero) ?? 0) + 1;

  const { data, error } = await ctx.admin
    .from('carbon_parcelas')
    .insert({
      contrato_id: contratoId,
      numero,
      valor,
      vencimento,
      descricao: lerTexto(corpo.descricao, 'descricao', 500),
      data_pagamento: lerData(corpo.data_pagamento, 'data_pagamento'),
      // Sem valor no corpo, herda do contrato: e o comportamento da geracao, e
      // duas rotas do mesmo dominio nao podem discordar sobre isso.
      tipo_servico: lerTexto(corpo.tipo_servico, 'tipo_servico', 120) ??
        (contrato.tipo_servico as string | null) ?? null,
      centro_custo: lerTexto(corpo.centro_custo, 'centro_custo', 120) ??
        (contrato.centro_custo as string | null) ?? null,
      observacoes: lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO),
      criado_por: ctx.registro.id,
    })
    .select('id')
    .single();

  // 23505 aqui significa corrida entre duas criacoes com o mesmo numero. Vira
  // 409 registro_duplicado, e a tela pede para tentar de novo.
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_parcelas');

  return respostaJson({
    parcela: await lerParcelaDetalhe(ctx.admin, String((data as Linha).id)),
    contrato: await lerContratoDetalhe(ctx.admin, contratoId),
  }, 201);
}

/**
 * Gera a serie de parcelas do contrato.
 *
 * Criterio de aceite da issue #11. A conta (resto de centavos na ultima parcela e
 * soma de meses com mes curto) esta na funcao SQL carbon_parcelas_gerar, nao
 * aqui: replicar em TypeScript seria garantir divergencia entre a tela e o banco.
 * Esta funcao valida a entrada para o erro sair com codigo e campo uteis.
 */
async function gerarParcelas(ctx: Contexto): Promise<Response> {
  const contratoId = ctx.params.id;
  const corpo = ctx.corpo ?? {};

  const periodicidade = lerTexto(corpo.periodicidade, 'periodicidade', 40);
  if (!periodicidade || !PERIODICIDADES.has(periodicidade.toLowerCase())) {
    throw new ErroRota('periodicidade_invalida', 400, 'periodicidade');
  }

  const quantidade = lerNumero(corpo.quantidade, 'quantidade');
  if (
    quantidade === null ||
    !Number.isInteger(quantidade) ||
    quantidade < 1 ||
    quantidade > QUANTIDADE_MAXIMA_PARCELAS
  ) {
    throw new ErroRota('campo_invalido', 400, 'quantidade');
  }

  const primeiroVencimento = lerData(corpo.primeiro_vencimento, 'primeiro_vencimento');
  if (!primeiroVencimento) {
    throw new ErroRota('campo_obrigatorio', 400, 'primeiro_vencimento');
  }

  const valorParcela = lerValor(corpo.valor_parcela, 'valor_parcela');
  const valorTotal = lerValor(corpo.valor_total, 'valor_total');
  if (valorParcela !== null && valorTotal !== null) {
    throw new ErroRota('valor_ambiguo', 400, 'valor_parcela');
  }

  const { data, error } = await ctx.admin.rpc('carbon_parcelas_gerar', {
    p_contrato_id: contratoId,
    p_quantidade: quantidade,
    p_periodicidade: periodicidade.toLowerCase(),
    p_primeiro_vencimento: primeiroVencimento,
    p_valor_parcela: valorParcela,
    p_valor_total: valorTotal,
    p_tipo_servico: lerTexto(corpo.tipo_servico, 'tipo_servico', 120),
    p_centro_custo: lerTexto(corpo.centro_custo, 'centro_custo', 120),
    p_descricao: lerTexto(corpo.descricao, 'descricao', 500),
    p_substituir: corpo.substituir === true,
    p_criado_por: ctx.registro.id,
  });

  if (error) {
    // RAISE de plpgsql sem errcode chega como P0001, portanto os casos de negocio
    // da funcao SQL sao reconhecidos pelo inicio da mensagem, que ela padroniza.
    // O resto (FK, check, unique) tem SQLSTATE proprio e vai para lancarErroEscrita.
    const mensagem = String(error.message ?? '');
    if (mensagem.includes('contrato_nao_encontrado')) return respostaErro('nao_encontrado', 404);
    if (mensagem.includes('periodicidade_invalida')) {
      throw new ErroRota('periodicidade_invalida', 400, 'periodicidade');
    }
    if (mensagem.includes('quantidade_invalida')) {
      throw new ErroRota('campo_invalido', 400, 'quantidade');
    }
    if (mensagem.includes('vencimento_obrigatorio')) {
      throw new ErroRota('campo_obrigatorio', 400, 'primeiro_vencimento');
    }
    if (mensagem.includes('valor_ambiguo')) throw new ErroRota('valor_ambiguo', 400, 'valor_total');
    if (mensagem.includes('valor_obrigatorio')) {
      throw new ErroRota('valor_obrigatorio', 400, 'valor_total');
    }
    if (mensagem.includes('valor_invalido')) throw new ErroRota('campo_invalido', 400, 'valor_total');
    if (mensagem.includes('parcelas_ja_existem')) {
      throw new ErroRota('parcelas_ja_existem', 409, 'contrato_id');
    }
    if (mensagem.includes('parcela_paga_impede_regeracao')) {
      throw new ErroRota('parcela_paga_impede_regeracao', 409, 'contrato_id');
    }
    lancarErroEscrita(error as ErroBanco, 'carbon_parcelas_gerar');
  }

  const geracaoBruta = ehObjeto(data) ? data : {};
  const geracao = {
    ...geracaoBruta,
    criadas: paraNumero(geracaoBruta.criadas) ?? 0,
    removidas: paraNumero(geracaoBruta.removidas) ?? 0,
    valor_total: paraNumero(geracaoBruta.valor_total),
    valor_parcela: paraNumero(geracaoBruta.valor_parcela),
    valor_ultima_parcela: paraNumero(geracaoBruta.valor_ultima_parcela),
  };

  const [contrato, parcelas, totais] = await Promise.all([
    lerContratoDetalhe(ctx.admin, contratoId),
    ctx.admin
      .from('carbon_parcelas_detalhe')
      .select(COLUNAS_PARCELA)
      .eq('contrato_id', contratoId)
      .order('numero', { ascending: true }),
    lerTotais(ctx.admin, { contratoId }),
  ]);

  if (parcelas.error) {
    console.error('Falha ao ler carbon_parcelas_detalhe:', parcelas.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  return respostaJson({
    geracao,
    contrato,
    parcelas: normalizarLista((parcelas.data ?? []) as Linha[], NUMERICOS_PARCELA),
    totais,
  }, 201);
}

/**
 * Atualiza uma parcela.
 *
 * NAO EXISTE campo de status nesta lista branca, e essa ausencia e o requisito da
 * issue #11: baixar a parcela e informar data_pagamento, e desfazer e envia-la
 * como null. Nao ha como a tela dizer "paga" sem dizer QUANDO.
 *
 * `numero` tambem esta fora: ele e a posicao na serie e e unico por contrato;
 * deixar editar produziria colisao e renumeracao manual de serie gerada.
 */
async function atualizarParcela(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const dados: Linha = {};

  if (veioNoCorpo(corpo, 'valor')) {
    const valor = lerValor(corpo.valor, 'valor');
    // Coluna NOT NULL: null viria de um campo esvaziado por engano, e apagar o
    // valor de uma obrigacao financeira nao e uma edicao valida.
    if (valor === null) throw new ErroRota('campo_obrigatorio', 400, 'valor');
    dados.valor = valor;
  }

  if (veioNoCorpo(corpo, 'vencimento')) {
    const vencimento = lerData(corpo.vencimento, 'vencimento');
    if (!vencimento) throw new ErroRota('campo_obrigatorio', 400, 'vencimento');
    dados.vencimento = vencimento;
  }

  // null e '' limpam a data e portanto DESFAZEM a baixa da parcela.
  if (veioNoCorpo(corpo, 'data_pagamento')) {
    dados.data_pagamento = lerData(corpo.data_pagamento, 'data_pagamento');
  }
  if (veioNoCorpo(corpo, 'descricao')) {
    dados.descricao = lerTexto(corpo.descricao, 'descricao', 500);
  }
  if (veioNoCorpo(corpo, 'tipo_servico')) {
    dados.tipo_servico = lerTexto(corpo.tipo_servico, 'tipo_servico', 120);
  }
  if (veioNoCorpo(corpo, 'centro_custo')) {
    dados.centro_custo = lerTexto(corpo.centro_custo, 'centro_custo', 120);
  }
  if (veioNoCorpo(corpo, 'observacoes')) {
    dados.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO);
  }

  if (Object.keys(dados).length === 0) return respostaErro('nada_para_atualizar', 400);

  const { data, error } = await ctx.admin
    .from('carbon_parcelas')
    .update(dados)
    .eq('id', ctx.params.id)
    .select('id, contrato_id')
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_parcelas');
  if (!data) return respostaErro('nao_encontrado', 404);

  const linha = data as Linha;
  return respostaJson({
    parcela: await lerParcelaDetalhe(ctx.admin, String(linha.id)),
    // O contrato volta junto porque os agregados dele (pago, em aberto, vencido)
    // mudaram: sem isso a tela mostraria o resumo antigo ao lado da linha nova.
    contrato: await lerContratoDetalhe(ctx.admin, String(linha.contrato_id)),
  });
}

/**
 * Remove uma parcela NAO PAGA.
 *
 * Serve para corrigir serie gerada errada ou parcela avulsa duplicada. Parcela
 * PAGA nao e removida: ela e registro de pagamento efetuado, e apagar isso
 * quebraria a conciliacao. O `.is('data_pagamento', null)` no DELETE fecha a
 * corrida entre a checagem e a remocao (alguem baixa a parcela no meio).
 */
async function removerParcela(ctx: Contexto): Promise<Response> {
  const id = ctx.params.id;
  const parcela = await lerParcelaDetalhe(ctx.admin, id);
  if (!parcela) return respostaErro('nao_encontrado', 404);
  if (parcela.data_pagamento) return respostaErro('parcela_paga', 409);

  const { data, error } = await ctx.admin
    .from('carbon_parcelas')
    .delete()
    .eq('id', id)
    .is('data_pagamento', null)
    .select('id')
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_parcelas');
  // Nada apagado com a linha existindo = ela foi paga entre a leitura e o delete.
  if (!data) return respostaErro('parcela_paga', 409);

  return respostaJson({
    removida: true,
    parcela,
    contrato: await lerContratoDetalhe(ctx.admin, String(parcela.contrato_id)),
  });
}

// -----------------------------------------------------------------------------
// Registro das rotas
// -----------------------------------------------------------------------------

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'fornecedores', escrita: false, handler: listarFornecedores },
  { metodo: 'POST', padrao: 'fornecedores', escrita: true, handler: criarFornecedor },
  { metodo: 'GET', padrao: 'fornecedores/:id', escrita: false, handler: obterFornecedor },
  { metodo: 'PATCH', padrao: 'fornecedores/:id', escrita: true, handler: atualizarFornecedor },

  { metodo: 'GET', padrao: 'contratos', escrita: false, handler: listarContratos },
  { metodo: 'POST', padrao: 'contratos', escrita: true, handler: criarContrato },
  { metodo: 'GET', padrao: 'contratos/:id', escrita: false, handler: obterContrato },
  { metodo: 'PATCH', padrao: 'contratos/:id', escrita: true, handler: atualizarContrato },

  { metodo: 'POST', padrao: 'contratos/:id/parcelas', escrita: true, handler: criarParcela },
  {
    metodo: 'POST',
    padrao: 'contratos/:id/parcelas-gerar',
    escrita: true,
    handler: gerarParcelas,
  },

  { metodo: 'GET', padrao: 'parcelas', escrita: false, handler: listarParcelas },
  { metodo: 'PATCH', padrao: 'parcelas/:id', escrita: true, handler: atualizarParcela },
  { metodo: 'DELETE', padrao: 'parcelas/:id', escrita: true, handler: removerParcela },
];

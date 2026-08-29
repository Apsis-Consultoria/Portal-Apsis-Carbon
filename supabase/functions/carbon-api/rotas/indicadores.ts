// -----------------------------------------------------------------------------
// Rotas dos indicadores do Plano de Monitoramento.
// -----------------------------------------------------------------------------
// GET    carbon-api/projetos/:id/indicadores  -> { indicadores, periodos, resumo, total }
// POST   carbon-api/projetos/:id/indicadores  -> { indicador }
// PATCH  carbon-api/indicadores/:id           -> { indicador }
// DELETE carbon-api/indicadores/:id           -> { removido }
// POST   carbon-api/indicadores/:id/medicoes  -> { medicao }
// DELETE carbon-api/indicador-medicoes/:id    -> { removido }
//
// Objetos SQL de que este modulo depende:
//   public.carbon_indicadores          (20260814100000_metas + 20260825120000)
//   public.carbon_indicador_medicoes   (20260814100000_metas + 20260825120000)
//
// DE ONDE VEM O CONTEUDO. A planilha "Monitoring Plan - EN.xlsx". A base
// `Indicadores` do Notion foi aberta ao vivo em 25/08/2026 e esta vazia: uma
// tabela com a coluna `Name` e zero registro. Nao ha precedente para copiar, e
// a planilha e a unica fonte de estrutura que existe.
//
// A TABELA TEM DOIS USOS, e a coluna `plano` e o que os separa:
//   plano preenchido  -> indicador do Plano de Monitoramento (clima, comunidade
//                        ou biodiversidade), que entra no relatorio de
//                        verificacao e a VVB confere;
//   plano nulo        -> indicador interno, ligado a uma meta da equipe.
// As rotas daqui NAO filtram por plano por conta propria: quem decide e o
// parametro `plano` da query. Sem ele a tela veria os dois tipos misturados, e
// e por isso que o padrao e devolver tudo e deixar a escolha explicita.

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
  LIMITE_TEXTO_LONGO,
  paginar,
  veioNoCorpo,
} from './helpers.ts';
import { lerProjetoVisivel } from './projetos.ts';

const COLUNAS_INDICADOR =
  'id, projeto_id, meta_id, plano, ordem, codigo, nome, descricao, unidade, ' +
  'tipo, acumulativo, frequencia, atividade, atividade_descricao, output, ' +
  'outcome, impacto, recurso, criado_em, atualizado_em';

const COLUNAS_MEDICAO =
  'id, indicador_id, data, periodo_tipo, valor, origem, observacao, criado_em, atualizado_em';

const PLANOS = new Set(['clima', 'comunidade', 'biodiversidade']);
const TIPOS = new Set(['contagem', 'percentual', 'volume', 'area']);
const PERIODOS = new Set(['pontual', 'mensal', 'trimestral', 'semestral', 'anual']);
const ORIGENS = new Set(['interna', 'parceiro']);

type Linha = Record<string, unknown>;

// -----------------------------------------------------------------------------
// Rotulo do periodo
// -----------------------------------------------------------------------------
// A tela mostra uma matriz: indicador nas linhas, periodo nas colunas. As
// colunas nao podem ser fixas no codigo, porque a planilha ganha uma a cada
// trimestre - foi anual ate 2025 e virou trimestral em 2026. Derivar do dado
// significa que o proximo trimestre aparece sozinho, sem deploy.
//
// O rotulo e montado AQUI, no servidor, e nao no navegador, para o CSV
// exportado, o PDF do relatorio e a tela dizerem a mesma coisa. Duas
// implementacoes do mesmo rotulo divergem no primeiro caso de borda.
function rotularPeriodo(data: string, tipo: string): string {
  const [ano, mes] = data.split('-');
  if (tipo === 'anual') return ano;
  if (tipo === 'trimestral') {
    const trimestre = Math.ceil(Number(mes) / 3);
    return `${trimestre}o tri ${ano}`;
  }
  if (tipo === 'semestral') return `${Number(mes) <= 6 ? 1 : 2}o sem ${ano}`;
  if (tipo === 'mensal') return `${mes}/${ano}`;
  // pontual: a data e o rotulo, invertida para o formato brasileiro.
  const [a, m, d] = data.split('-');
  return `${d}/${m}/${a}`;
}

/** Chave estavel de uma coluna da matriz. */
const chavePeriodo = (data: string, tipo: string) => `${data}|${tipo}`;

// -----------------------------------------------------------------------------
// Leitores
// -----------------------------------------------------------------------------

async function lerMedicoes(admin: SupabaseClient, ids: string[]): Promise<Linha[]> {
  if (ids.length === 0) return [];

  // Duas consultas em vez de um embed do PostgREST, pelo mesmo motivo de
  // lerEquipe() em projetos.ts: embed com duas chaves estrangeiras para a mesma
  // tabela devolve PGRST201, e a consulta passa a depender de um alias que
  // ninguem lembra de manter quando uma coluna nova aparece.
  const { data, error } = await admin
    .from('carbon_indicador_medicoes')
    .select(COLUNAS_MEDICAO)
    .in('indicador_id', ids)
    .order('data', { ascending: true });

  if (error) {
    console.error('Falha ao ler carbon_indicador_medicoes:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return (data ?? []) as unknown as Linha[];
}

/**
 * Le o indicador e CONFIRMA que quem pergunta enxerga o projeto dele.
 *
 * O portao e o projeto, nunca o indicador: `lerProjetoVisivel` e a mesma funcao
 * que a tela de Projetos usa, entao quem nao esta na equipe recebe 404 aqui do
 * mesmo jeito que receberia la. Checar so a existencia do indicador seria um
 * IDOR - bastaria adivinhar um uuid para ler o plano de monitoramento de um
 * projeto de outro cliente.
 */
async function lerIndicadorVisivel(ctx: Contexto, id: string): Promise<Linha> {
  const { data, error } = await ctx.admin
    .from('carbon_indicadores')
    .select(COLUNAS_INDICADOR)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_indicadores:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) throw new ErroRota('nao_encontrado', 404);

  const linha = data as unknown as Linha;
  const projeto = await lerProjetoVisivel(ctx, String(linha.projeto_id));
  // 404 e nao 403, de proposito: 403 confirmaria que o indicador existe, e num
  // sistema com projetos de clientes diferentes isso ja e informacao.
  if (!projeto) throw new ErroRota('nao_encontrado', 404);

  return linha;
}

// -----------------------------------------------------------------------------
// GET projetos/:id/indicadores
// -----------------------------------------------------------------------------

async function listar(ctx: Contexto): Promise<Response> {
  const projeto = await lerProjetoVisivel(ctx, ctx.params.id);
  if (!projeto) throw new ErroRota('nao_encontrado', 404);

  const { limite, deslocamento, pagina } = paginar(ctx.url);

  let consulta = ctx.admin
    .from('carbon_indicadores')
    .select(COLUNAS_INDICADOR, { count: 'exact' })
    .eq('projeto_id', ctx.params.id);

  const plano = ctx.url.searchParams.get('plano');
  if (plano) {
    if (plano === 'internos') {
      // Os que nao vieram do Plano de Monitoramento.
      consulta = consulta.is('plano', null);
    } else {
      if (!PLANOS.has(plano)) throw new ErroRota('campo_invalido', 400, 'plano');
      consulta = consulta.eq('plano', plano);
    }
  }

  const busca = ctx.url.searchParams.get('busca');
  if (busca && busca.trim()) {
    // Escapa a virgula: ela separa os termos do `or` do PostgREST, e um texto
    // com virgula quebraria a consulta em pedacos sem sentido.
    const termo = busca.trim().replace(/[,()]/g, ' ');
    consulta = consulta.or(
      `nome.ilike.%${termo}%,codigo.ilike.%${termo}%,atividade.ilike.%${termo}%`,
    );
  }

  const { data, error, count } = await consulta
    // `ordem` e a posicao na planilha e preserva a sequencia da Teoria da
    // Mudanca. nullsFirst: false joga os indicadores internos (sem ordem) para
    // o fim, em vez de abrir a lista com eles.
    .order('plano', { ascending: true, nullsFirst: false })
    .order('ordem', { ascending: true, nullsFirst: false })
    .order('nome', { ascending: true })
    .range(deslocamento, deslocamento + limite - 1);

  if (error) {
    console.error('Falha ao listar carbon_indicadores:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const indicadores = (data ?? []) as unknown as Linha[];
  const medicoes = await lerMedicoes(ctx.admin, indicadores.map((i) => String(i.id)));

  const porIndicador = new Map<string, Linha[]>();
  for (const m of medicoes) {
    const chave = String(m.indicador_id);
    const lista = porIndicador.get(chave) ?? [];
    lista.push(m);
    porIndicador.set(chave, lista);
  }

  // Colunas da matriz, deduplicadas e em ordem cronologica. Saem do dado
  // justamente para o trimestre novo aparecer sem mexer no codigo.
  const periodos = new Map<string, { chave: string; rotulo: string; data: string; tipo: string }>();
  for (const m of medicoes) {
    const data_ = String(m.data);
    const tipo = String(m.periodo_tipo);
    const chave = chavePeriodo(data_, tipo);
    if (!periodos.has(chave)) {
      periodos.set(chave, { chave, rotulo: rotularPeriodo(data_, tipo), data: data_, tipo });
    }
  }

  // Contagem por plano do PROJETO INTEIRO, nao da pagina: e o que alimenta as
  // abas da tela, e uma aba que mudasse de numero ao paginar seria mentira.
  const resumo = await contarPorPlano(ctx.admin, ctx.params.id);

  return respostaJson({
    indicadores: indicadores.map((i) => ({
      ...i,
      medicoes: (porIndicador.get(String(i.id)) ?? []).map((m) => ({
        ...m,
        periodo_chave: chavePeriodo(String(m.data), String(m.periodo_tipo)),
        periodo_rotulo: rotularPeriodo(String(m.data), String(m.periodo_tipo)),
      })),
    })),
    periodos: [...periodos.values()].sort((a, b) =>
      a.data === b.data ? a.tipo.localeCompare(b.tipo) : a.data.localeCompare(b.data)
    ),
    resumo,
    total: count ?? indicadores.length,
    pagina,
    limite,
  });
}

async function contarPorPlano(admin: SupabaseClient, projetoId: string) {
  const { data, error } = await admin
    .from('carbon_indicadores')
    .select('plano')
    .eq('projeto_id', projetoId);

  if (error) {
    console.error('Falha ao contar indicadores por plano:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const resumo: Record<string, number> = {
    clima: 0,
    comunidade: 0,
    biodiversidade: 0,
    internos: 0,
  };
  for (const linha of (data ?? []) as unknown as Linha[]) {
    const chave = linha.plano ? String(linha.plano) : 'internos';
    resumo[chave] = (resumo[chave] ?? 0) + 1;
  }
  return resumo;
}

// -----------------------------------------------------------------------------
// Escrita da definicao
// -----------------------------------------------------------------------------

/** Campos que POST e PATCH aceitam, com a mesma validacao nos dois. */
function lerCamposIndicador(corpo: Record<string, unknown>, parcial: boolean): Linha {
  const dados: Linha = {};

  const texto = (campo: string, limite = LIMITE_TEXTO_LONGO) => {
    if (parcial && !veioNoCorpo(corpo, campo)) return;
    dados[campo] = lerTexto(corpo[campo], campo, limite);
  };

  texto('nome');
  texto('descricao');
  texto('unidade');
  texto('codigo');
  texto('frequencia');
  texto('atividade');
  texto('atividade_descricao');
  texto('output');
  texto('outcome');
  texto('impacto');
  texto('recurso');

  if (!parcial || veioNoCorpo(corpo, 'plano')) {
    dados.plano = lerEnum(corpo.plano, PLANOS, 'plano_invalido', 'plano');
  }
  if (!parcial || veioNoCorpo(corpo, 'tipo')) {
    dados.tipo = lerEnum(corpo.tipo, TIPOS, 'tipo_invalido', 'tipo') ?? 'contagem';
  }
  if (!parcial || veioNoCorpo(corpo, 'ordem')) {
    dados.ordem = lerNumero(corpo.ordem, 'ordem');
  }
  if (veioNoCorpo(corpo, 'acumulativo')) {
    dados.acumulativo = corpo.acumulativo === true;
  }

  return dados;
}

async function criar(ctx: Contexto): Promise<Response> {
  const projeto = await lerProjetoVisivel(ctx, ctx.params.id);
  if (!projeto) throw new ErroRota('nao_encontrado', 404);

  const corpo = ctx.corpo ?? {};
  exigir(corpo, ['nome']);

  const dados = lerCamposIndicador(corpo, false);

  const { data, error } = await ctx.admin
    .from('carbon_indicadores')
    .insert({ ...dados, projeto_id: ctx.params.id, criado_por: ctx.registro.id })
    .select(COLUNAS_INDICADOR)
    .single();

  // 'percentual_nao_acumula' nomeia o check que impede somar percentuais: sem
  // isso a mensagem seria "campo_invalido" e ninguem descobriria qual.
  if (error) {
    lancarErroEscrita(error as ErroBanco, 'carbon_indicadores', 'percentual_nao_acumula');
  }

  return respostaJson({ indicador: { ...(data as unknown as Linha), medicoes: [] } }, 201);
}

async function atualizar(ctx: Contexto): Promise<Response> {
  await lerIndicadorVisivel(ctx, ctx.params.id);

  const corpo = ctx.corpo ?? {};
  const dados = lerCamposIndicador(corpo, true);
  if (Object.keys(dados).length === 0) throw new ErroRota('nada_para_atualizar', 400);

  const { data, error } = await ctx.admin
    .from('carbon_indicadores')
    .update(dados)
    .eq('id', ctx.params.id)
    .select(COLUNAS_INDICADOR)
    .single();

  if (error) {
    lancarErroEscrita(error as ErroBanco, 'carbon_indicadores', 'percentual_nao_acumula');
  }

  const medicoes = await lerMedicoes(ctx.admin, [ctx.params.id]);
  return respostaJson({ indicador: { ...(data as unknown as Linha), medicoes } });
}

async function remover(ctx: Contexto): Promise<Response> {
  await lerIndicadorVisivel(ctx, ctx.params.id);

  // As medicoes vao junto por ON DELETE CASCADE, que e o desenho certo: serie
  // sem a definicao do que ela mede nao significa nada. Quem quiser preservar o
  // historico deve parar de medir, nao apagar o indicador.
  const { error } = await ctx.admin.from('carbon_indicadores').delete().eq('id', ctx.params.id);
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_indicadores');

  return respostaJson({ removido: true });
}

// -----------------------------------------------------------------------------
// Medicoes
// -----------------------------------------------------------------------------

async function registrarMedicao(ctx: Contexto): Promise<Response> {
  await lerIndicadorVisivel(ctx, ctx.params.id);

  const corpo = ctx.corpo ?? {};
  exigir(corpo, ['data', 'valor']);

  const data_ = lerData(corpo.data, 'data');
  const valor = lerNumero(corpo.valor, 'valor');
  if (data_ === null) throw new ErroRota('campo_invalido', 400, 'data');
  if (valor === null) throw new ErroRota('campo_invalido', 400, 'valor');

  const periodoTipo = lerEnum(corpo.periodo_tipo, PERIODOS, 'periodo_invalido', 'periodo_tipo') ??
    'pontual';
  const origem = lerEnum(corpo.origem, ORIGENS, 'origem_invalida', 'origem') ?? 'interna';

  // UPSERT pela chave natural (indicador, data, granularidade). Corrigir um
  // numero digitado errado e rotina, e sem isto a tela teria que apagar antes
  // de gravar - duas requisicoes, com uma janela em que a medicao nao existe.
  // O indice unico carbon_indicador_medicoes_periodo_uidx e o que sustenta isto.
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

  const linha = data as unknown as Linha;
  return respostaJson({
    medicao: {
      ...linha,
      periodo_chave: chavePeriodo(String(linha.data), String(linha.periodo_tipo)),
      periodo_rotulo: rotularPeriodo(String(linha.data), String(linha.periodo_tipo)),
    },
  });
}

async function removerMedicao(ctx: Contexto): Promise<Response> {
  // Confere o portao pelo indicador dono da medicao, nao pela medicao em si.
  const { data, error } = await ctx.admin
    .from('carbon_indicador_medicoes')
    .select('id, indicador_id')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_indicador_medicoes:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) throw new ErroRota('nao_encontrado', 404);

  await lerIndicadorVisivel(ctx, String((data as unknown as Linha).indicador_id));

  const { error: erroDelete } = await ctx.admin
    .from('carbon_indicador_medicoes')
    .delete()
    .eq('id', ctx.params.id);

  if (erroDelete) lancarErroEscrita(erroDelete as ErroBanco, 'carbon_indicador_medicoes');

  // Apagar a medicao devolve o periodo ao estado "nao medido", que e diferente
  // de zero. E por isso que a tela nao grava zero para limpar uma celula.
  return respostaJson({ removido: true });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'projetos/:id/indicadores', escrita: false, handler: listar },
  { metodo: 'POST', padrao: 'projetos/:id/indicadores', escrita: true, handler: criar },
  { metodo: 'PATCH', padrao: 'indicadores/:id', escrita: true, handler: atualizar },
  { metodo: 'DELETE', padrao: 'indicadores/:id', escrita: true, handler: remover },
  { metodo: 'POST', padrao: 'indicadores/:id/medicoes', escrita: true, handler: registrarMedicao },
  {
    metodo: 'DELETE',
    padrao: 'indicador-medicoes/:id',
    escrita: true,
    handler: removerMedicao,
  },
];

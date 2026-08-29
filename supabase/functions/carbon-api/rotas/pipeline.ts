// -----------------------------------------------------------------------------
// Rotas do pipeline de prospeccao de novos negocios.
// -----------------------------------------------------------------------------
// GET    carbon-api/pipeline                        -> { candidatos, resumo, por_segmento, criterios_ativos }
// GET    carbon-api/pipeline/parceiros              -> { parceiros }
// GET    carbon-api/pipeline/comparar?ids=a,b,c     -> { criterios, candidatos }
// GET    carbon-api/pipeline/candidatos/:id         -> { candidato, notas, criterios }
// POST   carbon-api/pipeline/candidatos             -> { candidato }
// PATCH  carbon-api/pipeline/candidatos/:id         -> { candidato }
// POST   carbon-api/pipeline/candidatos/:id/notas   -> { nota, avaliacao }
// DELETE carbon-api/pipeline/candidato-notas/:id    -> { removido, avaliacao }
// POST   carbon-api/pipeline/candidatos/:id/projeto -> { criado, candidato_id, projeto_id }
//
// Objetos SQL de que este modulo depende (todos de 20260814099000_pipeline.sql):
//   public.carbon_candidatos, carbon_criterios, carbon_candidato_notas,
//   carbon_parceiros
//   views    carbon_candidatos_listagem, carbon_parceiros_listagem
//   funcoes  carbon_pipeline_listar, carbon_candidato_detalhe,
//            carbon_candidato_avaliacao, carbon_candidatos_comparar,
//            carbon_candidato_criar_projeto
//
// ESTE MODULO NAO REMONTA NENHUMA CONSULTA DE AGREGADO. A nota ponderada, a
// cobertura, o resumo do funil e o panorama por segmento existem em UM lugar, a
// view carbon_candidatos_listagem, e chegam aqui pelas funcoes acima. Reescrever
// a media ponderada em TypeScript daria dois numeros para a mesma pergunta, e o
// que aparece na tela dependeria de qual rota respondeu por ultimo.
//
// NAO EXISTE DELETE DE CANDIDATO, de proposito. Prospeccao encerrada nao se
// apaga: a proxima rodada comeca perguntando o que aconteceu na anterior, e
// premissas, falhas e virtudes de um candidato descartado sao justamente o que
// responde isso. Descartar e `PATCH { etapa: 'descartado' }`, que preserva o
// registro. O mesmo raciocinio do `ativo` de carbon_parceiros na migration.
//
// LGPD: nenhuma coluna deste dominio guarda dado de pessoa fisica. Parceiro e
// pessoa JURIDICA e o contato aceito e alias institucional de area. As rotas de
// escrita daqui nao gravam contato de parceiro por nao existir cadastro de
// parceiro nesta entrega (ver a pendencia no rodape deste cabecalho).
//
// PENDENCIA CONHECIDA: nao ha POST nem PATCH de parceiro. A tela de pipeline lista
// os parceiros para filtrar e para vincular ao candidato, mas quem cria o cadastro
// e o seed. O "mapa de parceiros" completo pedido pela issue #13 e uma tela
// propria, e ela nao cabe no escopo desta.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';
import {
  ErroRota,
  type ErroBanco,
  exigir,
  lancarErroEscrita,
  lerBooleano,
  lerData,
  lerEnum,
  lerNumero,
  lerTexto,
  lerUuid,
  LIMITE_TEXTO_CURTO,
  LIMITE_TEXTO_LONGO,
  UUID_RE,
  veioNoCorpo,
} from './helpers.ts';

type Linha = Record<string, unknown>;

// Espelham os CHECK de carbon_candidatos. Repetidos aqui de proposito: recusar no
// servidor devolve 400 com um codigo que a tela sabe traduzir, enquanto deixar
// passar devolveria 23514 traduzido para um 'campo_invalido' generico, sem dizer
// qual coluna recusou.
const SEGMENTOS = new Set(['terra_indigena', 'redd_privado', 'agro']);
const ETAPAS = new Set([
  'triagem',
  'analise_preliminar',
  'proposta_viabilidade',
  'aprovado',
  'descartado',
]);
const MOEDAS = new Set(['USD', 'BRL', 'EUR']);

// Faixa de carbon_candidato_notas_faixa_chk.
const NOTA_MINIMA = 0;
const NOTA_MAXIMA = 10;

/**
 * Quantos candidatos cabem numa comparacao.
 *
 * A migration diz explicitamente que o limite e daqui e nao do banco. Seis porque
 * a comparacao e uma GRADE (criterio nas linhas, candidato nas colunas): a partir
 * dai a coluna fica estreita demais para caber nome e nota, e ler a grade passa a
 * exigir rolagem horizontal, que e o oposto de comparar lado a lado. O minimo e
 * dois pelo motivo obvio: um candidato sozinho nao se compara com nada, e para
 * ver um so ja existe o detalhe.
 */
const COMPARACAO_MINIMA = 2;
const COMPARACAO_MAXIMA = 6;

// -----------------------------------------------------------------------------
// Leitura de query string
// -----------------------------------------------------------------------------

/** Parametro de query como texto util, ou null. String vazia conta como ausente. */
function qs(url: URL, nome: string): string | null {
  const bruto = url.searchParams.get(nome);
  if (bruto === null) return null;
  const limpo = bruto.trim();
  return limpo === '' ? null : limpo;
}

/** Parametro de query no formato uuid, ou null. Valor torto e 400, nao ignorado. */
function qsUuid(url: URL, nome: string): string | null {
  const valor = qs(url, nome);
  if (valor === null) return null;
  if (!UUID_RE.test(valor)) throw new ErroRota('campo_invalido', 400, nome);
  return valor;
}

// -----------------------------------------------------------------------------
// Leitores
// -----------------------------------------------------------------------------

/**
 * Le a linha do candidato NA VIEW, que e a forma que a tela conhece.
 *
 * Sempre a view e nunca a tabela crua: a listagem, o POST e o PATCH devolvem o
 * mesmo objeto, com parceiro_nome, nota_ponderada e cobertura_pct inclusos. Se o
 * POST devolvesse a linha da tabela, a candidata recem-criada apareceria na lista
 * sem as colunas de avaliacao ate o primeiro recarregamento - e como ela nasce sem
 * nota, ninguem perceberia que o formato estava diferente, so o desalinhamento.
 */
async function lerCandidato(admin: SupabaseClient, id: string): Promise<Linha | null> {
  const { data, error } = await admin
    .from('carbon_candidatos_listagem')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_candidatos_listagem:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return (data ?? null) as Linha | null;
}

/**
 * Agregado de avaliacao recalculado, para a tela atualizar a nota ponderada sem
 * recarregar a lista inteira.
 *
 * Vem da funcao SQL e nao de uma conta aqui: nota ponderada tem UMA definicao, e
 * ela mora na view. Falha nesta leitura NAO derruba a escrita que acabou de dar
 * certo - a nota ja esta gravada, e devolver null faz a tela recarregar em vez de
 * mostrar erro sobre algo que funcionou.
 */
async function lerAvaliacao(admin: SupabaseClient, candidatoId: string): Promise<Linha | null> {
  const { data, error } = await admin.rpc('carbon_candidato_avaliacao', {
    p_candidato_id: candidatoId,
  });

  if (error) {
    console.warn('Falha em carbon_candidato_avaliacao:', error.message);
    return null;
  }
  return (data ?? null) as Linha | null;
}

// -----------------------------------------------------------------------------
// GET pipeline
// -----------------------------------------------------------------------------

/**
 * Panorama do funil.
 *
 * Os filtros valem SOMENTE para a lista de candidatos; `resumo` e `por_segmento`
 * sao sempre o funil inteiro. Isso e decisao da funcao SQL e esta rota nao a
 * contorna: filtrar por segmento e ver o resumo daquele segmento apenas esconderia
 * que os outros dois existem, e a comparacao entre segmentos e o que a analise
 * pede.
 *
 * SEM PAGINACAO, e nao por esquecimento: carbon_pipeline_listar devolve o funil
 * inteiro num jsonb, porque o pipeline de prospeccao e uma lista curta por
 * natureza (dezenas, nao milhares) e porque o resumo tem que bater com a lista.
 * Se um dia passar de algumas centenas, o lugar de paginar e a funcao SQL, para o
 * resumo continuar sendo do conjunto e nao da pagina.
 */
async function listar(ctx: Contexto): Promise<Response> {
  const { data, error } = await ctx.admin.rpc('carbon_pipeline_listar', {
    p_segmento: lerEnum(qs(ctx.url, 'segmento'), SEGMENTOS, 'segmento_invalido', 'segmento'),
    p_etapa: lerEnum(qs(ctx.url, 'etapa'), ETAPAS, 'etapa_invalida', 'etapa'),
    p_parceiro_id: qsUuid(ctx.url, 'parceiro_id'),
  });

  if (error) {
    console.error('Falha em carbon_pipeline_listar:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const bruto = (data ?? {}) as Linha;
  return respostaJson({
    candidatos: bruto.candidatos ?? [],
    resumo: bruto.resumo ?? null,
    por_segmento: bruto.por_segmento ?? [],
    criterios_ativos: bruto.criterios_ativos ?? 0,
  });
}

/**
 * Mapa de parceiros, com o pipeline que passa por cada um.
 *
 * A tela usa para duas coisas: preencher o filtro por parceiro e o seletor do
 * formulario de candidato. Os agregados vem junto porque a view ja os calcula -
 * pedi-los depois seria uma segunda chamada para dado que ja veio.
 */
async function listarParceiros(ctx: Contexto): Promise<Response> {
  const { data, error } = await ctx.admin
    .from('carbon_parceiros_listagem')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Falha ao ler carbon_parceiros_listagem:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  return respostaJson({ parceiros: (data ?? []) as unknown as Linha[] });
}

/**
 * Comparacao lado a lado.
 *
 * GET com ?ids=a,b,c e nao POST, mesmo tendo uma lista no pedido: isto e leitura
 * pura, e um POST daria a esta rota a aparencia de escrita para quem le o log e
 * para o portao (que decide por `escrita`, e nao pelo metodo). Seis uuids cabem
 * folgadamente numa URL.
 *
 * Ids repetidos sao descartados ANTES da contagem. Sem isso, ?ids=a,a,a passaria
 * pelo limite como tres candidatos, o banco devolveria um so (a funcao usa
 * `= any`), e a tela mostraria uma comparacao de uma coluna que ela pediu com
 * tres.
 */
async function comparar(ctx: Contexto): Promise<Response> {
  const bruto = qs(ctx.url, 'ids');
  if (!bruto) throw new ErroRota('campo_obrigatorio', 400, 'ids');

  const ids: string[] = [];
  for (const parte of bruto.split(',')) {
    const id = parte.trim();
    if (id === '') continue;
    if (!UUID_RE.test(id)) throw new ErroRota('campo_invalido', 400, 'ids');
    if (!ids.includes(id)) ids.push(id);
  }

  if (ids.length < COMPARACAO_MINIMA) throw new ErroRota('comparacao_curta', 400, 'ids');
  if (ids.length > COMPARACAO_MAXIMA) throw new ErroRota('comparacao_longa', 400, 'ids');

  const { data, error } = await ctx.admin.rpc('carbon_candidatos_comparar', { p_ids: ids });

  if (error) {
    console.error('Falha em carbon_candidatos_comparar:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const payload = (data ?? {}) as Linha;
  return respostaJson({
    criterios: payload.criterios ?? [],
    candidatos: payload.candidatos ?? [],
  });
}

/**
 * Detalhe de um candidato, com a matriz de criterios.
 *
 * `criterios` traz os ATIVOS e nao apenas os que ja tem nota: e o que faz a linha
 * vazia do criterio ainda nao avaliado aparecer na tela. Sem ela, o criterio
 * esquecido some da matriz e ninguem lembra de avalia-lo, que e exatamente o
 * buraco que a matriz existe para fechar.
 */
async function obterCandidato(ctx: Contexto): Promise<Response> {
  const { data, error } = await ctx.admin.rpc('carbon_candidato_detalhe', {
    p_candidato_id: ctx.params.id,
  });

  if (error) {
    console.error('Falha em carbon_candidato_detalhe:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  // A funcao devolve NULL quando o id nao existe, justamente para o 404 nao custar
  // uma consulta extra de existencia.
  if (!data) throw new ErroRota('nao_encontrado', 404);

  const payload = data as Linha;
  return respostaJson({
    candidato: payload.candidato ?? null,
    notas: payload.notas ?? [],
    criterios: payload.criterios ?? [],
  });
}

// -----------------------------------------------------------------------------
// Escrita do candidato
// -----------------------------------------------------------------------------

/**
 * Campos que POST e PATCH aceitam, com a mesma validacao nos dois.
 *
 * E a LISTA BRANCA do dominio: coluna que nao aparece aqui nao e gravavel pela
 * API. `criado_por`, `projeto_id` e `atualizado_em` estao de fora de proposito -
 * autoria vem do token, o vinculo com o projeto so a funcao SQL de conversao
 * escreve (e o que torna a conversao idempotente), e a data e da trigger.
 *
 * @param parcial true no PATCH: campo ausente e "nao mexa", e nao "apague".
 */
function lerCamposCandidato(corpo: Record<string, unknown>, parcial: boolean): Linha {
  const dados: Linha = {};

  const texto = (campo: string, limite = LIMITE_TEXTO_CURTO) => {
    if (parcial && !veioNoCorpo(corpo, campo)) return;
    dados[campo] = lerTexto(corpo[campo], campo, limite);
  };

  const numero = (campo: string) => {
    if (parcial && !veioNoCorpo(corpo, campo)) return;
    dados[campo] = lerNumero(corpo[campo], campo);
  };

  /**
   * Enum de coluna NOT NULL.
   *
   * Ausente na CRIACAO deixa o default da coluna valer; ausente no PATCH nao
   * mexe. Presente e nulo e recusado: mandar null para uma coluna NOT NULL viraria
   * 23502 traduzido em 'campo_invalido' seco, sem dizer que a etapa em branco e
   * que foi recusada.
   */
  const enumNaoNulo = (campo: string, aceitos: ReadonlySet<string>, codigo: string) => {
    if (parcial && !veioNoCorpo(corpo, campo)) return;
    const valor = lerEnum(corpo[campo], aceitos, codigo, campo);
    if (valor === null) {
      if (!parcial) return;
      throw new ErroRota(codigo, 400, campo);
    }
    dados[campo] = valor;
  };

  if (!parcial || veioNoCorpo(corpo, 'nome')) {
    const nome = lerTexto(corpo.nome, 'nome', LIMITE_TEXTO_CURTO);
    // Recusa aqui, e nao no CHECK do banco: carbon_candidatos_nome_nao_vazio_chk
    // veria a string vazia, mas `lerTexto` ja transformou em null antes de chegar
    // la, e o erro seria um 23502 sem nome de campo.
    if (nome === null) throw new ErroRota('campo_obrigatorio', 400, 'nome');
    dados.nome = nome;
  }

  texto('metodologia');
  texto('municipio');
  texto('preco_mercado_fonte');
  texto('premissas', LIMITE_TEXTO_LONGO);
  texto('falhas', LIMITE_TEXTO_LONGO);
  texto('virtudes', LIMITE_TEXTO_LONGO);
  texto('observacoes', LIMITE_TEXTO_LONGO);

  numero('area_estimada_ha');
  numero('preco_mercado_ref');

  enumNaoNulo('segmento', SEGMENTOS, 'segmento_invalido');
  enumNaoNulo('etapa', ETAPAS, 'etapa_invalida');
  enumNaoNulo('preco_mercado_moeda', MOEDAS, 'moeda_invalida');

  if (!parcial || veioNoCorpo(corpo, 'uf')) {
    // NORMALIZA PARA MAIUSCULAS AQUI, como a migration manda. O CHECK aceita
    // apenas ^[A-Z]{2}$, entao sem esta linha "pa" seria recusado e a pessoa nao
    // saberia por que. Ja "para" continua recusado depois de maiusculizado, e
    // deve mesmo: uf e sigla, e "PARA" quebraria o filtro por estado em silencio.
    const bruto = lerTexto(corpo.uf, 'uf', LIMITE_TEXTO_CURTO);
    const uf = bruto === null ? null : bruto.toUpperCase();
    if (uf !== null && !/^[A-Z]{2}$/.test(uf)) throw new ErroRota('uf_invalida', 400, 'uf');
    dados.uf = uf;
  }

  if (!parcial || veioNoCorpo(corpo, 'parceiro_id')) {
    dados.parceiro_id = lerUuid(corpo.parceiro_id, 'parceiro_id');
  }

  if (veioNoCorpo(corpo, 'preco_mercado_data')) {
    dados.preco_mercado_data = lerData(corpo.preco_mercado_data, 'preco_mercado_data');
  }

  if (veioNoCorpo(corpo, 'elegivel_corsia')) {
    // TRES estados, e null e um deles: true (indicios), false (avaliado e nao
    // elegivel) e null (ninguem olhou). Um `=== true` como em campos booleanos
    // comuns transformaria "ainda nao avaliado" em "nao elegivel", que e uma
    // afirmacao que ninguem fez e que muda o preco esperado do credito.
    dados.elegivel_corsia = corpo.elegivel_corsia === null
      ? null
      : lerBooleano(corpo.elegivel_corsia, 'elegivel_corsia');
  }

  return dados;
}

async function criarCandidato(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  exigir(corpo, ['nome']);

  const dados = lerCamposCandidato(corpo, false);

  const { data, error } = await ctx.admin
    .from('carbon_candidatos')
    .insert({ ...dados, criado_por: ctx.registro.id })
    .select('id')
    .single();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_candidatos');

  const candidato = await lerCandidato(ctx.admin, String((data as unknown as Linha).id));
  return respostaJson({ candidato }, 201);
}

async function atualizarCandidato(ctx: Contexto): Promise<Response> {
  const dados = lerCamposCandidato(ctx.corpo ?? {}, true);
  if (Object.keys(dados).length === 0) throw new ErroRota('nada_para_atualizar', 400);

  const { data, error } = await ctx.admin
    .from('carbon_candidatos')
    .update(dados)
    .eq('id', ctx.params.id)
    .select('id')
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_candidatos');
  if (!data) throw new ErroRota('nao_encontrado', 404);

  const candidato = await lerCandidato(ctx.admin, ctx.params.id);
  return respostaJson({ candidato });
}

// -----------------------------------------------------------------------------
// Matriz de criterios
// -----------------------------------------------------------------------------

/**
 * Grava ou corrige a nota de um candidato em um criterio.
 *
 * UPSERT pela chave natural (candidato, criterio), sustentado pela constraint
 * carbon_candidato_notas_unica. Reavaliar e rotina - a nota muda quando chega o
 * documento que faltava - e sem o upsert a tela teria que apagar antes de gravar,
 * abrindo uma janela em que o criterio volta a "nao avaliado" e a nota ponderada
 * do candidato oscila.
 *
 * AS DUAS CONFERENCIAS ANTES DA ESCRITA existem por motivos diferentes:
 *   - o candidato, para um id inexistente virar 404 e nao o 400
 *     'referencia_invalida' que a violacao de chave estrangeira produziria;
 *   - o criterio, para recusar nota em criterio INATIVO. O banco aceitaria a
 *     linha, mas criterio inativo esta fora dos dois lados do calculo: a tela
 *     diria "salvo" e a nota ponderada nao se mexeria, que e o pior desfecho
 *     possivel para quem acabou de avaliar.
 * Sao duas leituras em tabelas minusculas, disparadas juntas.
 */
async function avaliarCriterio(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  exigir(corpo, ['criterio_id', 'nota']);

  const criterioId = lerUuid(corpo.criterio_id, 'criterio_id');
  if (criterioId === null) throw new ErroRota('campo_obrigatorio', 400, 'criterio_id');

  const nota = lerNumero(corpo.nota, 'nota');
  if (nota === null) throw new ErroRota('campo_obrigatorio', 400, 'nota');
  if (nota < NOTA_MINIMA || nota > NOTA_MAXIMA) throw new ErroRota('nota_fora_da_faixa', 400, 'nota');

  const [candidato, criterio] = await Promise.all([
    ctx.admin.from('carbon_candidatos').select('id').eq('id', ctx.params.id).maybeSingle(),
    ctx.admin.from('carbon_criterios').select('id, ativo').eq('id', criterioId).maybeSingle(),
  ]);

  if (candidato.error || criterio.error) {
    console.error(
      'Falha ao conferir candidato/criterio:',
      candidato.error?.message ?? criterio.error?.message,
    );
    throw new ErroRota('erro_interno', 500);
  }
  if (!candidato.data) throw new ErroRota('nao_encontrado', 404);
  if (!criterio.data) throw new ErroRota('referencia_invalida', 400, 'criterio_id');
  if ((criterio.data as unknown as Linha).ativo !== true) {
    throw new ErroRota('criterio_inativo', 409, 'criterio_id');
  }

  const { data, error } = await ctx.admin
    .from('carbon_candidato_notas')
    .upsert(
      {
        candidato_id: ctx.params.id,
        criterio_id: criterioId,
        nota,
        justificativa: lerTexto(corpo.justificativa, 'justificativa', LIMITE_TEXTO_LONGO),
        criado_por: ctx.registro.id,
      },
      { onConflict: 'candidato_id,criterio_id' },
    )
    .select('id, candidato_id, criterio_id, nota, justificativa, criado_em, atualizado_em')
    .single();

  if (error) {
    lancarErroEscrita(error as ErroBanco, 'carbon_candidato_notas', 'nota_fora_da_faixa');
  }

  return respostaJson({
    nota: data as unknown as Linha,
    avaliacao: await lerAvaliacao(ctx.admin, ctx.params.id),
  });
}

/**
 * Apaga a nota de um criterio.
 *
 * Devolve o cruzamento ao estado "nao avaliado", que e DIFERENTE de nota zero:
 * nota zero entra na media ponderada e derruba o candidato, ausencia sai do
 * denominador e derruba a cobertura. E por isso que limpar uma celula na tela
 * chama esta rota em vez de gravar zero.
 */
async function removerNota(ctx: Contexto): Promise<Response> {
  // O candidato dono vem antes do delete: e o unico jeito de devolver a avaliacao
  // recalculada, e depois de apagar a linha nao ha mais de onde tirar o id.
  const { data, error } = await ctx.admin
    .from('carbon_candidato_notas')
    .select('id, candidato_id')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_candidato_notas:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) throw new ErroRota('nao_encontrado', 404);

  const candidatoId = String((data as unknown as Linha).candidato_id);

  const { error: erroDelete } = await ctx.admin
    .from('carbon_candidato_notas')
    .delete()
    .eq('id', ctx.params.id);

  if (erroDelete) lancarErroEscrita(erroDelete as ErroBanco, 'carbon_candidato_notas');

  return respostaJson({
    removido: true,
    candidato_id: candidatoId,
    avaliacao: await lerAvaliacao(ctx.admin, candidatoId),
  });
}

// -----------------------------------------------------------------------------
// Candidato aprovado vira projeto
// -----------------------------------------------------------------------------

/**
 * Promove um candidato APROVADO a projeto de carbono.
 *
 * A criacao vive no banco (carbon_candidato_criar_projeto) porque sao duas
 * escritas que precisam ser atomicas: inserir em carbon_projetos e marcar
 * projeto_id no candidato. Em duas chamadas, uma falha no meio deixaria projeto
 * criado sem vinculo, e o proximo clique criaria um segundo projeto igual.
 *
 * `p_criado_por` NAO E OPCIONAL NA PRATICA, apesar do default null na assinatura.
 * A trigger carbon_projetos_equipe_autor_trg so insere o autor em
 * carbon_projeto_equipe quando `new.criado_por is not null`, e a leitura de
 * projeto para quem nao e admin e um inner join com essa tabela. Sem este
 * parametro, portanto, o gestor que promoveu o candidato criaria um projeto que
 * ele proprio nao enxerga - um lockout que se cria sozinho, com o dado gravado e
 * a tela dizendo que deu certo.
 *
 * IDEMPOTENTE por desenho da funcao SQL: o segundo clique devolve
 * { criado: false, projeto_id } em vez de um erro, porque quem clica de novo quer
 * chegar ao projeto e nao ser repreendido. A tela usa `criado` para decidir entre
 * "projeto criado" e "este candidato ja tinha virado projeto".
 */
async function promoverAProjeto(ctx: Contexto): Promise<Response> {
  const { data, error } = await ctx.admin.rpc('carbon_candidato_criar_projeto', {
    p_candidato_id: ctx.params.id,
    p_criado_por: ctx.registro.id,
  });

  if (error) {
    // RAISE de plpgsql sem errcode chega como P0001, entao os dois casos de
    // negocio da funcao sao reconhecidos pela mensagem que ela padroniza. O resto
    // (FK, check, not null) tem SQLSTATE proprio e vai para lancarErroEscrita.
    const mensagem = String(error.message ?? '');
    if (mensagem.includes('candidato_nao_aprovado')) {
      throw new ErroRota('candidato_nao_aprovado', 409);
    }
    if (mensagem.includes('nao_encontrado')) throw new ErroRota('nao_encontrado', 404);
    lancarErroEscrita(error as ErroBanco, 'carbon_candidato_criar_projeto');
  }

  const bruto = (data ?? {}) as Linha;
  return respostaJson({
    criado: bruto.criado === true,
    candidato_id: bruto.candidato_id ?? ctx.params.id,
    projeto_id: bruto.projeto_id ?? null,
    // O candidato volta junto para a lista atualizar `convertido` sem recarregar.
    candidato: await lerCandidato(ctx.admin, ctx.params.id),
  });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'pipeline', escrita: false, handler: listar },
  { metodo: 'GET', padrao: 'pipeline/parceiros', escrita: false, handler: listarParceiros },
  { metodo: 'GET', padrao: 'pipeline/comparar', escrita: false, handler: comparar },
  { metodo: 'GET', padrao: 'pipeline/candidatos/:id', escrita: false, handler: obterCandidato },
  { metodo: 'POST', padrao: 'pipeline/candidatos', escrita: true, handler: criarCandidato },
  {
    metodo: 'PATCH',
    padrao: 'pipeline/candidatos/:id',
    escrita: true,
    handler: atualizarCandidato,
  },
  {
    metodo: 'POST',
    padrao: 'pipeline/candidatos/:id/notas',
    escrita: true,
    handler: avaliarCriterio,
  },
  {
    metodo: 'DELETE',
    padrao: 'pipeline/candidato-notas/:id',
    escrita: true,
    handler: removerNota,
  },
  {
    metodo: 'POST',
    padrao: 'pipeline/candidatos/:id/projeto',
    escrita: true,
    handler: promoverAProjeto,
  },
];

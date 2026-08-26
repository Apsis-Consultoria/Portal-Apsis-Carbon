// -----------------------------------------------------------------------------
// Rotas de atividades e de apontamento de horas (issues #7 e #8).
// -----------------------------------------------------------------------------
// GET    carbon-api/atividades                    -> { atividades, pagina, limite }
// POST   carbon-api/atividades                    -> { atividade } (201)
// POST   carbon-api/atividades/repriorizar        -> { atualizados }
// GET    carbon-api/atividades/:id                -> { atividade }
// PATCH  carbon-api/atividades/:id                -> { atividade }
// GET    carbon-api/atividades/:id/apontamentos   -> { apontamentos, escopo, horas }
// POST   carbon-api/apontamentos                  -> { apontamento, removido, horas_executadas }
// PATCH  carbon-api/apontamentos/:id              -> { apontamento, horas_executadas }
// DELETE carbon-api/apontamentos/:id              -> { removido, horas_executadas }
// GET    carbon-api/minhas-horas                  -> grade da semana do proprio usuario
// GET    carbon-api/horas-resumo                  -> consolidado planejado x realizado
//
// Objetos SQL de que este modulo depende (migration 20260814094000_atividades):
//   public.carbon_atividades_listar(p_id, p_projeto_id, p_tipo, p_status,
//                                   p_prioridade, p_responsavel_id, p_de, p_ate,
//                                   p_busca, p_limite, p_deslocamento)
//   public.carbon_atividade_apontamentos(p_atividade_id, p_usuario_id)
//   public.carbon_atividade_horas(p_atividade_id, p_de, p_ate)
//   public.carbon_minhas_horas_semana(p_usuario_id, p_data)
//   public.carbon_horas_resumo(p_de, p_ate, p_projeto_id, p_tipo)
//
// =============================================================================
// DUAS DECISOES DE AUTORIZACAO QUE FOGEM DO PADRAO. LEIA ANTES DE MEXER.
// =============================================================================
//
// 1. AS ROTAS DE APONTAMENTO DECLARAM `escrita: false` MESMO ESCREVENDO.
//    O portao do index.ts converte `escrita: true` em "somente admin ou gestor".
//    Aplicado ao apontamento de horas, isso mataria a funcionalidade inteira: quem
//    aponta hora e o colaborador, e a issue #8 exige literalmente que "colaborador
//    ve e edita o proprio apontamento". Com `escrita: true` nenhum colaborador
//    conseguiria lancar as proprias horas e a coluna HH Executada continuaria
//    vazia, que e exatamente o problema que estas rotas existem para resolver.
//    A autorizacao real acontece DENTRO do handler e e mais estreita do que o
//    portao generico:
//      - usuario_id vem SEMPRE de ctx.registro.id, NUNCA do corpo. Ninguem aponta
//        hora no nome de outra pessoa, nem admin;
//      - PATCH e DELETE conferem que o apontamento e do proprio chamador e
//        respondem 403 sem_permissao quando nao e - inclusive para admin, porque
//        corrigir hora alheia sem rastro nao e correcao, e reescrita de registro
//        de esforco de outra pessoa.
//    O campo `escrita` e explicito no contrato da fundacao justamente para o
//    portao poder ser dispensado com criterio; aqui o criterio esta acima.
//
// 2. O QUE E ABERTO E O QUE E RESTRITO EM HORAS.
//    - Total realizado POR ATIVIDADE: aberto a qualquer colaborador ativo. E
//      literalmente a coluna HH Executada que a equipe sempre quis ver ao lado de
//      HH planejadas, e sem ela a comparacao planejado x realizado (criterio da
//      issue #8) nao existe em tela nenhuma.
//    - Quebra POR PESSOA (quem lancou quanto) e o consolidado: restritos a papel
//      admin ou gestor. Horas por pessoa sao dado pessoal ligado a desempenho, e
//      o proprio levantamento anotou isso (docs/notion/03-atividades-apsis-carbon.md,
//      secao de LGPD: "a tela precisa de controle de quem ve horas de quem").
//    Esta fronteira e uma DECISAO DESTE MODULO, alinhada com a pendencia geral de
//    que a leitura aberta precisa de definicao do dono. Nao a considere resolvida.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { respostaErro, respostaJson } from '../../_shared/cors.ts';
import type { Contexto, RegistroUsuario, Rota } from './tipos.ts';
import { lerProjetoVisivel } from './projetos.ts';
import {
  ehObjeto,
  ErroRota,
  type ErroBanco,
  exigir,
  lancarErroEscrita,
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

// -----------------------------------------------------------------------------
// Dominio
// -----------------------------------------------------------------------------

/** Espelha o CHECK de carbon_atividades.status. */
const STATUS = new Set(['nao_iniciada', 'em_andamento', 'concluida', 'cancelada']);

/** Espelha o CHECK de carbon_atividades.prioridade. */
const PRIORIDADES = new Set(['baixa', 'media', 'alta']);

/**
 * Espelha o CHECK de carbon_atividades.tipo. Os quatro primeiros sao os valores
 * que a equipe ja usa no Notion (Consultoria, Novos Negocios, JPF, Backoffice);
 * 'projeto' cobre o trabalho tecnico que a base do projeto registrava.
 */
const TIPOS = new Set(['consultoria', 'novos_negocios', 'projeto', 'backoffice', 'jpf']);

/** Papeis que veem horas por pessoa e o consolidado. Ver a decisao 2 no topo. */
const PAPEIS_CONSOLIDADO = new Set(['admin', 'gestor']);

/**
 * Teto de horas planejadas por atividade: 100 mil horas sao cerca de cinquenta
 * anos de uma pessoa. Existe para o erro de digitacao (uma tecla presa) virar 400
 * com o nome do campo, em vez de 22003 numeric field overflow traduzido como
 * 'campo_invalido' sem detalhe.
 */
const LIMITE_HORAS_PLANEJADAS = 100_000;

/** Teto de horas de UM dia. Igual ao CHECK carbon_apontamentos_horas_faixa_chk. */
const LIMITE_HORAS_DIA = 24;

/** Teto de itens numa repriorizacao em massa. A reuniao semanal nao passa disso. */
const LIMITE_REPRIORIZACAO = 200;

const COLUNAS_APONTAMENTO =
  'id, atividade_id, usuario_id, data, horas, observacao, criado_em, atualizado_em';

function podeVerConsolidado(registro: RegistroUsuario): boolean {
  return PAPEIS_CONSOLIDADO.has(String(registro.papel ?? '').toLowerCase());
}

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
// Leitura de atividade
// -----------------------------------------------------------------------------

type LinhaAtividade = { id: string } & Record<string, unknown>;

/**
 * Atividade CRUA da tabela, sem horas somadas. Serve para confirmar existencia
 * antes de escrever um apontamento.
 *
 * Exportada porque outros dominios (reunioes, visitas) tendem a precisar da mesma
 * confirmacao, e duplicar a consulta la garantiria divergencia de colunas.
 */
export async function lerAtividade(
  admin: SupabaseClient,
  id: string,
): Promise<LinhaAtividade | null> {
  const { data, error } = await admin
    .from('carbon_atividades')
    .select('id, nome, status, projeto_id, tipo, responsavel_id, horas_planejadas')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_atividades:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return (data as LinhaAtividade | null) ?? null;
}

/**
 * Atividade no formato do contrato: com projeto_nome, responsavel_nome e as horas
 * EXECUTADAS somadas.
 *
 * Passa pela mesma funcao SQL da listagem (com p_id) de proposito: a projecao e a
 * soma das horas ficam num unico lugar, e o objeto devolvido pelo POST e pelo
 * PATCH e byte a byte o mesmo que a lista mostra. Montar a mao aqui faria a tela
 * receber um formato depois de salvar e outro depois de recarregar.
 */
async function lerAtividadeCompleta(
  admin: SupabaseClient,
  id: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await admin.rpc('carbon_atividades_listar', { p_id: id, p_limite: 1 });

  if (error) {
    console.error('Falha em carbon_atividades_listar:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  const linhas = (data ?? []) as Record<string, unknown>[];
  return linhas[0] ?? null;
}

/** Soma das horas apontadas na atividade. Usada para a tela nao precisar recarregar. */
async function horasDaAtividade(admin: SupabaseClient, atividadeId: string): Promise<number> {
  const { data, error } = await admin.rpc('carbon_atividade_horas', {
    p_atividade_id: atividadeId,
  });
  if (error) {
    console.warn('Falha em carbon_atividade_horas:', error.message);
    return 0;
  }
  return paraNumero(data) ?? 0;
}

// -----------------------------------------------------------------------------
// Lista branca de campos de atividade
// -----------------------------------------------------------------------------

const CAMPOS_DATA = ['data_inicio', 'data_fim'] as const;

/**
 * Monta o objeto de gravacao de carbon_atividades por LISTA BRANCA explicita.
 *
 * Campo a campo, e nao com o helper listaBranca(), porque cada campo tem um
 * validador diferente (texto, enum, data, numero) e a coerencia do intervalo
 * depende de dois campos juntos. Campo desconhecido no corpo e simplesmente
 * ignorado: sem isso um corpo com { criado_por, criado_em } reescreveria autoria.
 *
 * Os tres enums tem DEFAULT no banco (nao_iniciada, media, backoffice). Valor
 * vazio e OMITIDO em vez de virar null: null quebraria o NOT NULL, e "manter o
 * default na criacao, ou o valor atual na edicao" e o comportamento desejado.
 *
 * @param modo 'criar' exige nome; 'atualizar' toca somente o que veio no corpo.
 */
function montarDadosAtividade(
  corpo: Record<string, unknown>,
  modo: 'criar' | 'atualizar',
): Record<string, unknown> {
  const dados: Record<string, unknown> = {};

  if (modo === 'criar' || veioNoCorpo(corpo, 'nome')) {
    const nome = lerTexto(corpo.nome, 'nome', LIMITE_TEXTO_CURTO);
    if (!nome) throw new ErroRota('campo_obrigatorio', 400, 'nome');
    dados.nome = nome;
  }

  if (veioNoCorpo(corpo, 'descricao')) {
    dados.descricao = lerTexto(corpo.descricao, 'descricao', LIMITE_TEXTO_LONGO);
  }

  // As duas FKs aceitam null: projeto_id nulo e o caso normal do backoffice, e
  // responsavel_id nulo e atividade ainda sem dono.
  if (veioNoCorpo(corpo, 'projeto_id')) {
    dados.projeto_id = lerUuid(corpo.projeto_id, 'projeto_id');
  }
  if (veioNoCorpo(corpo, 'responsavel_id')) {
    dados.responsavel_id = lerUuid(corpo.responsavel_id, 'responsavel_id');
  }

  if (veioNoCorpo(corpo, 'status')) {
    // 'status_invalido' e nao 'campo_invalido' porque este codigo ja esta no
    // contrato da API e traduzido na interface.
    const status = lerEnum(corpo.status, STATUS, 'status_invalido', 'status');
    if (status) dados.status = status;
  }
  if (veioNoCorpo(corpo, 'prioridade')) {
    const prioridade = lerEnum(corpo.prioridade, PRIORIDADES, 'campo_invalido', 'prioridade');
    if (prioridade) dados.prioridade = prioridade;
  }
  if (veioNoCorpo(corpo, 'tipo')) {
    const tipo = lerEnum(corpo.tipo, TIPOS, 'campo_invalido', 'tipo');
    if (tipo) dados.tipo = tipo;
  }

  for (const campo of CAMPOS_DATA) {
    if (veioNoCorpo(corpo, campo)) dados[campo] = lerData(corpo[campo], campo);
  }

  if (veioNoCorpo(corpo, 'horas_planejadas')) {
    const horas = lerNumero(corpo.horas_planejadas, 'horas_planejadas');
    if (horas !== null && horas > LIMITE_HORAS_PLANEJADAS) {
      throw new ErroRota('campo_invalido', 400, 'horas_planejadas');
    }
    dados.horas_planejadas = horas;
  }

  // Coerencia do intervalo conferida aqui quando as duas pontas vem na mesma
  // requisicao. Quando vem so uma ponta, quem barra e o
  // carbon_atividades_periodo_chk, e lancarErroEscrita traduz o 23514.
  // Comparacao de string funciona porque 'AAAA-MM-DD' e ordenavel.
  const inicio = dados.data_inicio;
  const fim = dados.data_fim;
  if (typeof inicio === 'string' && typeof fim === 'string' && fim < inicio) {
    throw new ErroRota('campo_invalido', 400, 'data_fim');
  }

  return dados;
}

// -----------------------------------------------------------------------------
// Handlers de atividade
// -----------------------------------------------------------------------------

/**
 * Lista atividades. Todos os filtros sao opcionais e vem da query string.
 *
 * A soma de horas e a contagem por view (criterio de aceite da issue #7) NAO tem
 * rota propria: cada linha ja carrega horas_planejadas e horas_executadas, e a
 * tela soma o conjunto que ela mesma esta mostrando. Uma rota de agregacao por
 * view obrigaria o servidor a conhecer as quatro views da tela, e elas mudam.
 */
async function listar(ctx: Contexto): Promise<Response> {
  const { limite, deslocamento, pagina } = paginar(ctx.url);

  // PORTAO NA LEITURA. Sem isto, qualquer colaborador ativo do dominio pedia
  // ?projeto_id=<uuid de outro projeto> e recebia o conteudo dele - segunda
  // porta para o dado que /projetos protege, e oraculo de ids para as rotas
  // de escrita. Achado na auditoria de 26/08/2026.
  const projetoFiltro = qsUuid(ctx.url, 'projeto_id');
  if (projetoFiltro && !(await lerProjetoVisivel(ctx, projetoFiltro))) {
    return respostaErro('nao_encontrado', 404);
  }

  const { data, error } = await ctx.admin.rpc('carbon_atividades_listar', {
    p_projeto_id: projetoFiltro,
    p_tipo: lerEnum(qs(ctx.url, 'tipo'), TIPOS, 'campo_invalido', 'tipo'),
    p_status: lerEnum(qs(ctx.url, 'status'), STATUS, 'status_invalido', 'status'),
    p_prioridade: lerEnum(qs(ctx.url, 'prioridade'), PRIORIDADES, 'campo_invalido', 'prioridade'),
    p_responsavel_id: qsUuid(ctx.url, 'responsavel_id'),
    p_de: lerData(qs(ctx.url, 'de'), 'de'),
    p_ate: lerData(qs(ctx.url, 'ate'), 'ate'),
    p_busca: lerTexto(qs(ctx.url, 'busca'), 'busca', LIMITE_TEXTO_CURTO),
    p_limite: limite,
    p_deslocamento: deslocamento,
  });

  if (error) {
    console.error('Falha em carbon_atividades_listar:', error.message);
    return respostaErro('erro_interno', 500);
  }

  return respostaJson({ atividades: data ?? [], pagina, limite });
}

async function obter(ctx: Contexto): Promise<Response> {
  const atividade = await lerAtividadeCompleta(ctx.admin, ctx.params.id);
  if (!atividade) return respostaErro('nao_encontrado', 404);
  return respostaJson({ atividade });
}

async function criar(ctx: Contexto): Promise<Response> {
  const dados = montarDadosAtividade(ctx.corpo ?? {}, 'criar');

  const { data, error } = await ctx.admin
    .from('carbon_atividades')
    .insert({ ...dados, criado_por: ctx.registro.id })
    .select('id')
    .single();

  if (error || !data) {
    lancarErroEscrita(
      (error ?? { message: 'insert sem retorno' }) as ErroBanco,
      'carbon_atividades',
      'status_invalido',
    );
  }

  const atividade = await lerAtividadeCompleta(ctx.admin, (data as { id: string }).id);
  return respostaJson({ atividade }, 201);
}

/**
 * Atualiza atividade.
 *
 * Nao existe DELETE de atividade na API, de proposito: apagar a atividade levaria
 * os apontamentos de horas junto (ON DELETE CASCADE), e horas apontadas sao
 * registro de esforco de colaborador, nao rascunho. Para tirar a atividade das
 * contas use status = 'cancelada', que carbon_horas_resumo ja exclui.
 */
async function atualizar(ctx: Contexto): Promise<Response> {
  const dados = montarDadosAtividade(ctx.corpo ?? {}, 'atualizar');

  if (Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }

  const { data, error } = await ctx.admin
    .from('carbon_atividades')
    .update(dados)
    .eq('id', ctx.params.id)
    .select('id')
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_atividades', 'status_invalido');
  if (!data) return respostaErro('nao_encontrado', 404);

  const atividade = await lerAtividadeCompleta(ctx.admin, ctx.params.id);
  return respostaJson({ atividade });
}

/**
 * Repriorizacao EM MASSA.
 *
 * Existe porque a prioridade e repriorizada na reuniao semanal, olhando a lista
 * inteira (criterio de aceite da issue #7). Sem esta rota, mudar a prioridade de
 * doze atividades seriam doze PATCH em sequencia, e a tela ficaria piscando.
 *
 * Aceita prioridades DIFERENTES no mesmo pedido, porque a repriorizacao real
 * promove umas e rebaixa outras na mesma passada. Os itens sao agrupados por
 * prioridade, o que da no maximo TRES UPDATEs (a coluna tem tres valores).
 *
 * NAO E ATOMICO entre os tres UPDATEs: a Edge Function nao tem transacao. Cada
 * UPDATE e atomico em si, e os valores foram validados antes, de modo que a
 * unica falha plausivel e indisponibilidade do banco. O cliente recarrega a lista
 * depois e ve o estado real; para prioridade isso e aceitavel. Se algum dia a
 * repriorizacao passar a envolver outra coluna, vire funcao SQL.
 */
async function repriorizar(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const itens = corpo.itens;

  if (!Array.isArray(itens) || itens.length === 0) {
    throw new ErroRota('campo_obrigatorio', 400, 'itens');
  }
  if (itens.length > LIMITE_REPRIORIZACAO) {
    throw new ErroRota('campo_invalido', 400, 'itens');
  }

  const porPrioridade = new Map<string, string[]>();

  for (const item of itens) {
    if (!ehObjeto(item)) throw new ErroRota('campo_invalido', 400, 'itens');

    const id = lerUuid(item.id, 'id');
    if (!id) throw new ErroRota('campo_obrigatorio', 400, 'id');

    const prioridade = lerEnum(item.prioridade, PRIORIDADES, 'campo_invalido', 'prioridade');
    if (!prioridade) throw new ErroRota('campo_obrigatorio', 400, 'prioridade');

    const lista = porPrioridade.get(prioridade) ?? [];
    lista.push(id);
    porPrioridade.set(prioridade, lista);
  }

  let atualizados = 0;
  for (const [prioridade, ids] of porPrioridade) {
    const { data, error } = await ctx.admin
      .from('carbon_atividades')
      .update({ prioridade })
      .in('id', ids)
      .select('id');

    if (error) lancarErroEscrita(error as ErroBanco, 'carbon_atividades');
    atualizados += ((data ?? []) as unknown[]).length;
  }

  // Nenhuma linha atingida com ids validos significa que nenhuma existe.
  if (atualizados === 0) return respostaErro('nao_encontrado', 404);

  return respostaJson({ atualizados });
}

// -----------------------------------------------------------------------------
// Handlers de apontamento de horas
// -----------------------------------------------------------------------------

/**
 * Apontamentos de UMA atividade.
 *
 * Quem tem papel admin ou gestor recebe os de todo mundo (escopo 'consolidado');
 * qualquer outro colaborador recebe apenas os proprios (escopo 'proprio'), e o
 * total devolvido tambem e so o dele. Devolver o total da equipe junto de uma
 * lista de um so nome revelaria por subtracao o que a restricao existe para
 * proteger - com equipe pequena, isso e imediato.
 *
 * O total POR ATIVIDADE continua visivel a todos na listagem de atividades: ver a
 * decisao 2 no topo do arquivo.
 */
async function listarApontamentos(ctx: Contexto): Promise<Response> {
  const atividadeId = ctx.params.id;

  const atividade = await lerAtividade(ctx.admin, atividadeId);
  if (!atividade) return respostaErro('nao_encontrado', 404);

  const consolidado = podeVerConsolidado(ctx.registro);

  const { data, error } = await ctx.admin.rpc('carbon_atividade_apontamentos', {
    p_atividade_id: atividadeId,
    p_usuario_id: consolidado ? null : ctx.registro.id,
  });

  if (error) {
    console.error('Falha em carbon_atividade_apontamentos:', error.message);
    return respostaErro('erro_interno', 500);
  }

  const apontamentos = (data ?? []) as Record<string, unknown>[];
  const horas = apontamentos.reduce((soma, linha) => soma + (paraNumero(linha.horas) ?? 0), 0);

  return respostaJson({
    apontamentos,
    escopo: consolidado ? 'consolidado' : 'proprio',
    // Arredondado porque a soma de numeric em ponto flutuante do JS acumula
    // residuo (0,25 + 0,25 + 0,1 nao fecha redondo) e este numero vai para a tela.
    horas: Math.round(horas * 100) / 100,
  });
}

/**
 * Registra (ou corrige, ou apaga) o apontamento do proprio colaborador em um dia.
 *
 * E O CAMINHO DO LANCAMENTO RAPIDO da issue #8. Uma unica rota resolve os tres
 * casos porque a grade de Minhas Horas tem uma celula por dia e por atividade, e
 * quem digita nela nao sabe (nem deveria saber) se aquele dia ja tem id:
 *
 *   horas > 0  -> UPSERT na chave (atividade_id, usuario_id, data)
 *   horas 0, '' ou ausente -> APAGA o lancamento daquele dia
 *
 * O upsert e o que faz o segundo lancamento do mesmo dia CORRIGIR o primeiro em
 * vez de somar em dobro, que e o erro classico do lancamento continuo.
 *
 * usuario_id vem de ctx.registro.id e nunca do corpo. Um campo usuario_id no
 * corpo e simplesmente ignorado.
 */
async function registrarApontamento(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  exigir(corpo, ['atividade_id', 'data']);

  const atividadeId = lerUuid(corpo.atividade_id, 'atividade_id');
  if (!atividadeId) throw new ErroRota('campo_obrigatorio', 400, 'atividade_id');

  const data = lerData(corpo.data, 'data');
  if (!data) throw new ErroRota('campo_obrigatorio', 400, 'data');

  const horas = lerNumero(corpo.horas, 'horas');

  // Existencia conferida antes: a FK devolveria 23503 'referencia_invalida', e
  // 404 'nao_encontrado' e o que a tela sabe tratar (atividade apagada por outra
  // sessao enquanto a grade estava aberta).
  const atividade = await lerAtividade(ctx.admin, atividadeId);
  if (!atividade) return respostaErro('nao_encontrado', 404);

  // Zero, vazio e ausente significam "esta celula nao tem hora": apagar. E o que
  // a pessoa quer dizer ao limpar a celula, e guardar zero seria guardar um
  // apontamento de nada (o CHECK do banco tambem recusa horas <= 0).
  if (horas === null || horas === 0) {
    const { error } = await ctx.admin
      .from('carbon_apontamentos_horas')
      .delete()
      .eq('atividade_id', atividadeId)
      .eq('usuario_id', ctx.registro.id)
      .eq('data', data);

    if (error) lancarErroEscrita(error as ErroBanco, 'carbon_apontamentos_horas');

    return respostaJson({
      removido: true,
      apontamento: null,
      horas_executadas: await horasDaAtividade(ctx.admin, atividadeId),
    });
  }

  if (horas > LIMITE_HORAS_DIA) throw new ErroRota('campo_invalido', 400, 'horas');

  /**
   * A observacao SO entra no objeto quando veio no corpo.
   *
   * Nao e detalhe de estilo: o PostgREST monta o ON CONFLICT DO UPDATE apenas com as
   * colunas presentes no objeto enviado. Mandando observacao sempre, um relancamento
   * feito pela grade (que envia apenas as horas da celula) gravaria null e APAGARIA em
   * silencio a anotacao do dia. Omitindo, o conflito nao toca a coluna e a anotacao
   * sobrevive; no INSERT ela nasce nula, que e o valor correto para um dia novo.
   *
   * Para LIMPAR a anotacao mantendo as horas, mande observacao: null explicitamente.
   */
  const registro: Record<string, unknown> = {
    atividade_id: atividadeId,
    usuario_id: ctx.registro.id,
    data,
    horas,
  };
  if (veioNoCorpo(corpo, 'observacao')) {
    registro.observacao = lerTexto(corpo.observacao, 'observacao', LIMITE_TEXTO_CURTO);
  }

  const { data: linha, error } = await ctx.admin
    .from('carbon_apontamentos_horas')
    .upsert(registro, { onConflict: 'atividade_id,usuario_id,data' })
    .select(COLUNAS_APONTAMENTO)
    .single();

  if (error || !linha) {
    lancarErroEscrita(
      (error ?? { message: 'upsert sem retorno' }) as ErroBanco,
      'carbon_apontamentos_horas',
    );
  }

  return respostaJson({
    removido: false,
    apontamento: linha,
    horas_executadas: await horasDaAtividade(ctx.admin, atividadeId),
  });
}

/**
 * Le o apontamento e confirma que e do proprio chamador.
 *
 * A checagem de dono acontece ANTES da escrita e vale para todo mundo, inclusive
 * admin: corrigir hora alheia sem deixar rastro nao e correcao, e reescrita do
 * registro de esforco de outra pessoa. Quem precisa ajustar hora de terceiro faz
 * isso com a pessoa, ou o assunto vira uma rota propria com trilha.
 */
async function apontamentoProprio(
  ctx: Contexto,
): Promise<{ id: string; atividade_id: string } | Response> {
  const { data, error } = await ctx.admin
    .from('carbon_apontamentos_horas')
    .select('id, atividade_id, usuario_id')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_apontamentos_horas:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) return respostaErro('nao_encontrado', 404);

  const linha = data as { id: string; atividade_id: string; usuario_id: string };
  if (linha.usuario_id !== ctx.registro.id) return respostaErro('sem_permissao', 403);

  return { id: linha.id, atividade_id: linha.atividade_id };
}

async function atualizarApontamento(ctx: Contexto): Promise<Response> {
  const alvo = await apontamentoProprio(ctx);
  if (alvo instanceof Response) return alvo;

  const corpo = ctx.corpo ?? {};
  const dados: Record<string, unknown> = {};

  if (veioNoCorpo(corpo, 'horas')) {
    const horas = lerNumero(corpo.horas, 'horas');
    if (horas === null || horas <= 0 || horas > LIMITE_HORAS_DIA) {
      // Zerar pelo PATCH nao apaga: apagar tem rota propria (DELETE) e o POST de
      // lancamento rapido. Deixar um PATCH virar remocao esconderia a exclusao
      // dentro de uma edicao.
      throw new ErroRota('campo_invalido', 400, 'horas');
    }
    dados.horas = horas;
  }

  if (veioNoCorpo(corpo, 'observacao')) {
    dados.observacao = lerTexto(corpo.observacao, 'observacao', LIMITE_TEXTO_CURTO);
  }

  // data e atividade_id nao entram na lista branca: mover um apontamento de dia ou
  // de atividade e apagar e lancar de novo, e o POST de lancamento rapido faz os
  // dois. Permitir aqui abriria o caminho de driblar o unique por (atividade,
  // usuario, dia) com um UPDATE que colide.
  if (Object.keys(dados).length === 0) return respostaErro('nada_para_atualizar', 400);

  const { data: linha, error } = await ctx.admin
    .from('carbon_apontamentos_horas')
    .update(dados)
    .eq('id', alvo.id)
    .select(COLUNAS_APONTAMENTO)
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_apontamentos_horas');
  if (!linha) return respostaErro('nao_encontrado', 404);

  return respostaJson({
    apontamento: linha,
    horas_executadas: await horasDaAtividade(ctx.admin, alvo.atividade_id),
  });
}

async function removerApontamento(ctx: Contexto): Promise<Response> {
  const alvo = await apontamentoProprio(ctx);
  if (alvo instanceof Response) return alvo;

  const { error } = await ctx.admin
    .from('carbon_apontamentos_horas')
    .delete()
    .eq('id', alvo.id);

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_apontamentos_horas');

  return respostaJson({
    removido: true,
    horas_executadas: await horasDaAtividade(ctx.admin, alvo.atividade_id),
  });
}

/**
 * Grade da semana do PROPRIO colaborador.
 *
 * ?semana=AAAA-MM-DD aceita qualquer dia da semana desejada; a funcao SQL
 * normaliza para a segunda-feira (date_trunc, padrao ISO). Sem o parametro, a
 * semana corrente.
 *
 * Nao ha parametro de usuario, nem para admin: esta rota e sempre sobre quem
 * chama. Ver horas de outra pessoa e assunto do consolidado.
 */
async function minhasHoras(ctx: Contexto): Promise<Response> {
  const semana = lerData(qs(ctx.url, 'semana'), 'semana');

  const { data, error } = await ctx.admin.rpc('carbon_minhas_horas_semana', {
    p_usuario_id: ctx.registro.id,
    p_data: semana,
  });

  if (error) {
    console.error('Falha em carbon_minhas_horas_semana:', error.message);
    return respostaErro('erro_interno', 500);
  }

  return respostaJson(data ?? null);
}

/**
 * Consolidado planejado x realizado. RESTRITO a papel admin ou gestor.
 *
 * A restricao esta no handler e nao no portao de escrita porque isto e um GET: o
 * portao do index.ts so olha rotas de escrita. Ver a decisao 2 no topo.
 */
async function resumoHoras(ctx: Contexto): Promise<Response> {
  if (!podeVerConsolidado(ctx.registro)) return respostaErro('sem_permissao', 403);

  const { data, error } = await ctx.admin.rpc('carbon_horas_resumo', {
    p_de: lerData(qs(ctx.url, 'de'), 'de'),
    p_ate: lerData(qs(ctx.url, 'ate'), 'ate'),
    p_projeto_id: qsUuid(ctx.url, 'projeto_id'),
    p_tipo: lerEnum(qs(ctx.url, 'tipo'), TIPOS, 'campo_invalido', 'tipo'),
  });

  if (error) {
    console.error('Falha em carbon_horas_resumo:', error.message);
    return respostaErro('erro_interno', 500);
  }

  return respostaJson(data ?? null);
}

// -----------------------------------------------------------------------------
// Registro das rotas
// -----------------------------------------------------------------------------
// 'atividades/repriorizar' vem antes de 'atividades/:id' na ordem de casamento do
// roteador porque tem menos parametros (o index.ts ordena por quantidade de
// parametros). Nao ha POST 'atividades/:id', portanto nao existe ambiguidade real.

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'atividades', escrita: false, handler: listar },
  { metodo: 'POST', padrao: 'atividades', escrita: true, handler: criar },
  { metodo: 'POST', padrao: 'atividades/repriorizar', escrita: true, handler: repriorizar },
  { metodo: 'GET', padrao: 'atividades/:id', escrita: false, handler: obter },
  { metodo: 'PATCH', padrao: 'atividades/:id', escrita: true, handler: atualizar },
  {
    metodo: 'GET',
    padrao: 'atividades/:id/apontamentos',
    escrita: false,
    handler: listarApontamentos,
  },
  // As quatro rotas abaixo escrevem (ou leem dado pessoal) com escrita: false de
  // PROPOSITO. Ver a decisao 1 no topo do arquivo antes de "corrigir".
  { metodo: 'POST', padrao: 'apontamentos', escrita: false, handler: registrarApontamento },
  { metodo: 'PATCH', padrao: 'apontamentos/:id', escrita: false, handler: atualizarApontamento },
  { metodo: 'DELETE', padrao: 'apontamentos/:id', escrita: false, handler: removerApontamento },
  { metodo: 'GET', padrao: 'minhas-horas', escrita: false, handler: minhasHoras },
  { metodo: 'GET', padrao: 'horas-resumo', escrita: false, handler: resumoHoras },
];

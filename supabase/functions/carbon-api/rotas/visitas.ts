// -----------------------------------------------------------------------------
// Rotas de viagem (rodada de visitas), visita comercial e LGPD (issue #12).
// -----------------------------------------------------------------------------
// GET    carbon-api/viagens                     -> { viagens, total, resumo, pagina, limite }
// POST   carbon-api/viagens                     -> { viagem } (201)
// PATCH  carbon-api/viagens/:id                 -> { viagem }
// GET    carbon-api/visitas                     -> { visitas, total, resumo, pagina, limite }
// POST   carbon-api/visitas                     -> { visita, viagem, auditoria } (201)
// POST   carbon-api/visitas/exportacao          -> { registros, total, incluiu_contatos, ... }
// POST   carbon-api/visitas/anonimizar-vencidas -> { anonimizadas, referencia }
// GET    carbon-api/visitas/:id                 -> { visita, viagem, auditoria }
// PATCH  carbon-api/visitas/:id                 -> { visita, viagem, auditoria }
// POST   carbon-api/visitas/:id/anonimizar      -> { anonimizada, ja_estava, ... }
//
// Objetos SQL de que este modulo depende (migration 20260814098000_visitas.sql):
//   public.carbon_viagens_listar(p_uf, p_cidade, p_de, p_ate, p_limite, p_deslocamento)
//   public.carbon_visitas_listar(p_viagem_id, p_sem_viagem, p_follow_up_status,
//                                p_organizacao, p_situacao, p_de, p_ate,
//                                p_limite, p_deslocamento)
//   public.carbon_visita_detalhe(p_visita_id, p_incluir_contato)
//   public.carbon_visita_anonimizar(p_visita_id, p_motivo, p_usuario_id)
//   public.carbon_visitas_anonimizar_vencidas(p_usuario_id, p_limite)
//   public.carbon_visitas_exportar(p_usuario_id, p_incluir_contatos, p_motivo, ...filtros)
//
// =============================================================================
// LGPD - LEIA ANTES DE MEXER EM QUALQUER COISA AQUI
// =============================================================================
// carbon_visitas guarda NOME, TELEFONE e E-MAIL de pessoas de organizacoes externas
// (dado pessoal de terceiro). O tratamento tem base legal em interesse legitimo do
// controlador para prospeccao comercial B2B (Lei 13.709/2018, art. 7, IX) e finalidade
// unica de retomar o contato comercial da propria visita. O bloco completo esta no
// cabecalho da migration; o que este arquivo garante:
//
//   1. LISTAGEM NAO DEVOLVE CONTATO. Nao por filtro escrito aqui, e sim porque a
//      funcao SQL de listagem nao seleciona essas colunas. Mesmo um erro futuro neste
//      arquivo nao consegue vazar o contato pela rota de lista.
//   2. DETALHE devolve contato somente para papel admin ou gestor (PAPEIS_CONTATO). O
//      booleano vai para a funcao SQL, que decide o que ler; com false o contato nem
//      sai do banco. A resposta traz contato_registrado e contato_visivel, para a tela
//      dizer "existe contato, oculto para o seu perfil" em vez de sugerir que nao ha.
//   3. EXPORTACAO grava auditoria na mesma transacao (dentro da funcao SQL) e, com
//      contato, exige finalidade declarada. Nao existe caminho de exportar sem log.
//   4. NAO EXISTE DELETE de visita. O direito de exclusao do titular e atendido por
//      POST /visitas/:id/anonimizar, que apaga o contato e preserva o fato comercial.
//      A anonimizacao e irreversivel por trigger no banco.
//   5. NENHUM LOG desta funcao imprime nome, telefone ou e-mail de contato. Ao
//      depurar, logue o id da visita, nunca o conteudo do contato.
// =============================================================================
//
// SEM ROTA DE DETALHE DE VIAGEM, de proposito: a tela mostra o cabecalho da rodada com
// os dados que ja vieram na listagem de viagens e busca as visitas dela por
// GET /visitas?viagem_id=<uuid>. Uma rota a mais devolveria o mesmo conteudo em outra
// forma, e seria uma segunda definicao dos mesmos agregados.
//
// SEM ROTA DE DELETE DE VIAGEM: apagar a rodada nao apagaria as visitas (a FK e ON
// DELETE SET NULL), mas as deixaria orfas sem que ninguem tenha pedido isso. Rodada
// cadastrada errado se corrige por PATCH.

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
 * Papeis que podem VER dado de contato e exportar a base.
 *
 * DUPLICACAO CONSCIENTE de PAPEIS_ESCRITA do index.ts, que nao e exportado. Os dois
 * conjuntos sao iguais hoje por decisao de negocio (quem registra a visita e quem pode
 * ver o contato dela), mas sao regras DIFERENTES: se algum dia um papel de leitura
 * ampliada aparecer, e este conjunto que muda, e nao o portao de escrita. Manter os
 * dois nomes separados evita que uma mudanca de permissao de escrita libere dado
 * pessoal sem ninguem perceber.
 */
const PAPEIS_CONTATO = new Set(['admin', 'gestor']);

/** Espelha o CHECK de carbon_visitas.follow_up_status. */
const STATUS_FOLLOW_UP = new Set([
  'nao_iniciado',
  'em_andamento',
  'concluido',
  'descartado',
]);

/** Valores aceitos por p_situacao em carbon_visitas_base. */
const SITUACOES = new Set([
  'atrasada',
  'sem_cobranca',
  'aberta',
  'anonimizada',
  'retencao_vencida',
]);

/** Espelha o CHECK de carbon_viagens.uf. */
const UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

const COLUNAS_VIAGEM =
  'id, titulo, cidade, uf, data_inicio, data_fim, responsavel_id, criado_por, ' +
  'criado_em, atualizado_em';

/** Telefone: digitos, espaco e os separadores que as pessoas de fato digitam. */
const TELEFONE_RE = /^[0-9+()\-.\s]{6,40}$/;

/** Guarda de tamanho do e-mail de contato. RFC permite mais; coluna nao precisa. */
const LIMITE_EMAIL = 320;

/** Teto de linhas por exportacao. O mesmo limite existe na funcao SQL. */
const LIMITE_EXPORTACAO_PADRAO = 2000;
const LIMITE_EXPORTACAO_MAXIMO = 5000;

/** Teto do lote da rotina de retencao. Mesmo limite da funcao SQL. */
const LIMITE_RETENCAO_MAXIMO = 5000;

// -----------------------------------------------------------------------------
// Permissao de contato
// -----------------------------------------------------------------------------

/**
 * Este colaborador pode ver dado de contato?
 *
 * NAO responde 403 quando falso: o detalhe continua acessivel, sem o contato. Recusar
 * a tela inteira esconderia a visita (fato comercial que todo colaborador pode ler) e
 * ainda revelaria, pelo proprio erro, que ha contato ali.
 */
function podeVerContato(ctx: Contexto): boolean {
  return PAPEIS_CONTATO.has(String(ctx.registro.papel ?? '').toLowerCase());
}

// -----------------------------------------------------------------------------
// Leitura auxiliar
// -----------------------------------------------------------------------------

/**
 * Detalhe completo (visita + viagem + auditoria LGPD).
 *
 * `incluirContato` chega ate a funcao SQL: com false o contato nao e nem lido do
 * banco. null quando a visita nao existe.
 */
async function lerDetalhe(
  admin: SupabaseClient,
  visitaId: string,
  incluirContato: boolean,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await admin.rpc('carbon_visita_detalhe', {
    p_visita_id: visitaId,
    p_incluir_contato: incluirContato,
  });

  if (error) {
    console.error('Falha em carbon_visita_detalhe:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return (data as Record<string, unknown> | null) ?? null;
}

/** Estado LGPD da visita, para recusar regravacao de contato em registro anonimizado. */
async function lerEstadoVisita(
  admin: SupabaseClient,
  visitaId: string,
): Promise<{ id: string; anonimizado_em: string | null } | null> {
  const { data, error } = await admin
    .from('carbon_visitas')
    .select('id, anonimizado_em')
    .eq('id', visitaId)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_visitas:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return (data as { id: string; anonimizado_em: string | null } | null) ?? null;
}

// -----------------------------------------------------------------------------
// Leitura de filtros da query string
// -----------------------------------------------------------------------------

/**
 * Filtros comuns as rotas de listagem e a exportacao.
 *
 * Filtro torto e 400 e nao "ignora e devolve tudo": listagem filtrada por um valor que
 * o servidor descartou em silencio faz a pessoa decidir sobre um recorte que nao e o
 * que ela pediu. Vale ainda mais na exportacao, onde o recorte vai para o log.
 */
type FiltrosVisita = {
  viagemId: string | null;
  semViagem: boolean;
  status: string | null;
  organizacao: string | null;
  situacao: string | null;
  de: string | null;
  ate: string | null;
};

/** Confere que o intervalo faz sentido. Reusa o codigo periodo_invalido do contrato. */
function conferirPeriodo(de: string | null, ate: string | null): void {
  if (de && ate && ate < de) throw new ErroRota('periodo_invalido', 400);
}

function filtrosDaUrl(url: URL): FiltrosVisita {
  const q = url.searchParams;

  let viagemId: string | null = null;
  let semViagem = false;

  const viagemBruta = (q.get('viagem_id') ?? '').trim();
  if (viagemBruta && viagemBruta !== 'todas' && viagemBruta !== 'todos') {
    // 'sem_viagem' e valor especial: "somente as visitas que nao pertencem a rodada
    // nenhuma", que e pergunta diferente de "todas as visitas".
    if (viagemBruta === 'sem_viagem') semViagem = true;
    else if (UUID_RE.test(viagemBruta)) viagemId = viagemBruta;
    else throw new ErroRota('id_invalido', 400, 'viagem_id');
  }

  const statusBruto = (q.get('follow_up_status') ?? '').trim();
  if (statusBruto && !STATUS_FOLLOW_UP.has(statusBruto)) {
    throw new ErroRota('campo_invalido', 400, 'follow_up_status');
  }

  const situacaoBruta = (q.get('situacao') ?? '').trim();
  if (situacaoBruta && !SITUACOES.has(situacaoBruta)) {
    throw new ErroRota('campo_invalido', 400, 'situacao');
  }

  const organizacao = lerTexto(q.get('organizacao'), 'organizacao', LIMITE_TEXTO_CURTO);
  const de = lerData(q.get('de'), 'de');
  const ate = lerData(q.get('ate'), 'ate');
  conferirPeriodo(de, ate);

  return {
    viagemId,
    semViagem,
    status: statusBruto || null,
    organizacao,
    situacao: situacaoBruta || null,
    de,
    ate,
  };
}

/** Os mesmos filtros vindos do CORPO (exportacao usa POST por causa do log). */
function filtrosDoCorpo(corpo: Record<string, unknown>): FiltrosVisita {
  let viagemId: string | null = null;
  let semViagem = false;

  const viagemBruta = lerTexto(corpo.viagem_id, 'viagem_id');
  if (viagemBruta && viagemBruta !== 'todas' && viagemBruta !== 'todos') {
    if (viagemBruta === 'sem_viagem') semViagem = true;
    else if (UUID_RE.test(viagemBruta)) viagemId = viagemBruta;
    else throw new ErroRota('id_invalido', 400, 'viagem_id');
  }
  if (veioNoCorpo(corpo, 'sem_viagem') && corpo.sem_viagem !== null) {
    semViagem = semViagem || lerBooleano(corpo.sem_viagem, 'sem_viagem');
  }

  const status = lerEnum(
    corpo.follow_up_status,
    STATUS_FOLLOW_UP,
    'campo_invalido',
    'follow_up_status',
  );
  const situacao = lerEnum(corpo.situacao, SITUACOES, 'campo_invalido', 'situacao');
  const organizacao = lerTexto(corpo.organizacao, 'organizacao', LIMITE_TEXTO_CURTO);
  const de = lerData(corpo.de, 'de');
  const ate = lerData(corpo.ate, 'ate');
  conferirPeriodo(de, ate);

  return { viagemId, semViagem, status, organizacao, situacao, de, ate };
}

// -----------------------------------------------------------------------------
// Listas brancas de campos
// -----------------------------------------------------------------------------

/**
 * Objeto de gravacao de carbon_viagens, por lista branca explicita.
 *
 * Escrito campo a campo (e nao com o helper listaBranca) porque cada campo tem
 * validador proprio. Campo desconhecido no corpo e ignorado, e nenhuma coluna nova da
 * tabela passa a ser gravavel pela API sem alguem escrever isso aqui: sem esse cuidado
 * um corpo com { criado_por, criado_em } reescreveria autoria e data de cadastro.
 *
 * @param modo 'criar' exige titulo, cidade e data_inicio; 'atualizar' toca so o que veio.
 */
function montarDadosViagem(
  corpo: Record<string, unknown>,
  modo: 'criar' | 'atualizar',
): Record<string, unknown> {
  const dados: Record<string, unknown> = {};

  if (modo === 'criar' || veioNoCorpo(corpo, 'titulo')) {
    const titulo = lerTexto(corpo.titulo, 'titulo', LIMITE_TEXTO_CURTO);
    if (!titulo) throw new ErroRota('campo_obrigatorio', 400, 'titulo');
    dados.titulo = titulo;
  }

  if (modo === 'criar' || veioNoCorpo(corpo, 'cidade')) {
    const cidade = lerTexto(corpo.cidade, 'cidade', LIMITE_TEXTO_CURTO);
    if (!cidade) throw new ErroRota('campo_obrigatorio', 400, 'cidade');
    dados.cidade = cidade;
  }

  if (modo === 'criar' || veioNoCorpo(corpo, 'data_inicio')) {
    const inicio = lerData(corpo.data_inicio, 'data_inicio');
    if (!inicio) throw new ErroRota('campo_obrigatorio', 400, 'data_inicio');
    dados.data_inicio = inicio;
  }

  if (veioNoCorpo(corpo, 'uf')) {
    // UF em maiusculas antes de conferir: quem digita "am" quer AM, e recusar isso
    // seria implicancia com o teclado, nao validacao.
    const bruto = lerTexto(corpo.uf, 'uf', 2);
    const uf = bruto ? bruto.toUpperCase() : null;
    if (uf && !UFS.has(uf)) throw new ErroRota('campo_invalido', 400, 'uf');
    dados.uf = uf;
  }

  // data_fim nula significa viagem de um dia, e nao "sem fim": e estado valido, por
  // isso o campo aceita null explicitamente.
  if (veioNoCorpo(corpo, 'data_fim')) {
    dados.data_fim = lerData(corpo.data_fim, 'data_fim');
  }

  if (veioNoCorpo(corpo, 'responsavel_id')) {
    dados.responsavel_id = lerUuid(corpo.responsavel_id, 'responsavel_id');
  }

  /**
   * Periodo invertido recusado AQUI, com codigo proprio, e nao deixado apenas para o
   * CHECK do banco: a mensagem generica de campo invalido nao diz a ninguem o que
   * corrigir. O CHECK continua sendo a rede de seguranca, inclusive para o caso que
   * esta validacao nao cobre de proposito (mudar so a data_inicio de uma viagem
   * existente, sem reenviar data_fim: aqui nao se conhece a data_fim atual da linha, e
   * o 23514 do banco vira periodo_invalido em lancarErroEscrita).
   */
  const inicio = typeof dados.data_inicio === 'string' ? dados.data_inicio : null;
  const fim = typeof dados.data_fim === 'string' ? dados.data_fim : null;
  if (inicio && fim && fim < inicio) throw new ErroRota('periodo_invalido', 400, 'data_fim');

  return dados;
}

/**
 * Objeto de gravacao de carbon_visitas.
 *
 * NAO ACEITA de proposito: retencao_ate (a trigger calcula), anonimizado_em e
 * anonimizado_motivo (so a funcao de anonimizacao os define; ver a trigger
 * carbon_visitas_before_write, que reverte qualquer tentativa) e criado_por.
 *
 * `assumir_follow_up` e `assumir_visita` sao acucar de interface: nao existe rota que
 * liste colaboradores, portanto a tela nao tem um seletor de pessoas. Sem eles, a
 * coluna follow_up_responsavel_id nasceria sempre vazia e o sistema repetiria o
 * problema que a issue existe para resolver (follow-up sem dono). Com eles, um clique
 * atribui o follow-up a quem esta chamando, resolvido no SERVIDOR pelo registro
 * autenticado - o frontend nao conhece o proprio carbon_usuarios.id, e nem deve.
 */
function montarDadosVisita(
  corpo: Record<string, unknown>,
  modo: 'criar' | 'atualizar',
  usuarioId: string,
): Record<string, unknown> {
  const dados: Record<string, unknown> = {};

  if (modo === 'criar' || veioNoCorpo(corpo, 'organizacao')) {
    const organizacao = lerTexto(corpo.organizacao, 'organizacao', LIMITE_TEXTO_CURTO);
    if (!organizacao) throw new ErroRota('campo_obrigatorio', 400, 'organizacao');
    dados.organizacao = organizacao;
  }

  if (modo === 'criar' || veioNoCorpo(corpo, 'data')) {
    const data = lerData(corpo.data, 'data');
    if (!data) throw new ErroRota('campo_obrigatorio', 400, 'data');
    dados.data = data;
  }

  if (veioNoCorpo(corpo, 'viagem_id')) {
    dados.viagem_id = lerUuid(corpo.viagem_id, 'viagem_id');
  }
  if (veioNoCorpo(corpo, 'assunto')) {
    dados.assunto = lerTexto(corpo.assunto, 'assunto', LIMITE_TEXTO_LONGO);
  }
  if (veioNoCorpo(corpo, 'resultado')) {
    dados.resultado = lerTexto(corpo.resultado, 'resultado', LIMITE_TEXTO_LONGO);
  }

  /* ----- dado pessoal de terceiro (ver bloco LGPD no cabecalho) ----- */
  if (veioNoCorpo(corpo, 'contato_nome')) {
    dados.contato_nome = lerTexto(corpo.contato_nome, 'contato_nome', LIMITE_TEXTO_CURTO);
  }
  if (veioNoCorpo(corpo, 'contato_telefone')) {
    const telefone = lerTexto(corpo.contato_telefone, 'contato_telefone', 40);
    if (telefone && !TELEFONE_RE.test(telefone)) {
      throw new ErroRota('campo_invalido', 400, 'contato_telefone');
    }
    dados.contato_telefone = telefone;
  }
  if (veioNoCorpo(corpo, 'contato_email')) {
    const email = lerTexto(corpo.contato_email, 'contato_email', LIMITE_EMAIL);
    // Guarda minima, igual a do CHECK do banco: lixo nesta coluna e dado pessoal
    // errado atribuido a alguem.
    if (email && (email.indexOf('@') < 1 || email.includes(' '))) {
      throw new ErroRota('campo_invalido', 400, 'contato_email');
    }
    dados.contato_email = email;
  }
  /* ----------------------------------------------------------------- */

  if (veioNoCorpo(corpo, 'follow_up_status')) {
    const status = lerEnum(
      corpo.follow_up_status,
      STATUS_FOLLOW_UP,
      'campo_invalido',
      'follow_up_status',
    );
    if (!status) throw new ErroRota('campo_obrigatorio', 400, 'follow_up_status');
    dados.follow_up_status = status;
  }

  if (veioNoCorpo(corpo, 'follow_up_prazo')) {
    dados.follow_up_prazo = lerData(corpo.follow_up_prazo, 'follow_up_prazo');
  }

  if (veioNoCorpo(corpo, 'follow_up_responsavel_id')) {
    dados.follow_up_responsavel_id = lerUuid(
      corpo.follow_up_responsavel_id,
      'follow_up_responsavel_id',
    );
  }
  if (veioNoCorpo(corpo, 'responsavel_id')) {
    dados.responsavel_id = lerUuid(corpo.responsavel_id, 'responsavel_id');
  }

  // Atalhos de atribuicao. Enviar o atalho e o id junto e contradicao, nao conveniencia:
  // recusamos em vez de escolher um dos dois em silencio.
  if (corpo.assumir_follow_up === true) {
    if (veioNoCorpo(corpo, 'follow_up_responsavel_id')) {
      throw new ErroRota('campo_invalido', 400, 'assumir_follow_up');
    }
    dados.follow_up_responsavel_id = usuarioId;
  }
  if (corpo.assumir_visita === true) {
    if (veioNoCorpo(corpo, 'responsavel_id')) {
      throw new ErroRota('campo_invalido', 400, 'assumir_visita');
    }
    dados.responsavel_id = usuarioId;
  }

  return dados;
}

/** O corpo tenta gravar algum campo de contato com valor? */
function tentaGravarContato(dados: Record<string, unknown>): boolean {
  return ['contato_nome', 'contato_telefone', 'contato_email'].some(
    (campo) => dados[campo] !== undefined && dados[campo] !== null,
  );
}

// -----------------------------------------------------------------------------
// Handlers de viagem
// -----------------------------------------------------------------------------

/**
 * Lista rodadas de visita com resumo e paginacao.
 *
 * Filtros: ?uf= ?cidade= ?de= ?ate= ?limite= ?pagina=
 * O recorte por periodo e INTERSECCAO com a janela: rodada que atravessa a virada do
 * mes aparece nos dois meses.
 */
async function listarViagens(ctx: Contexto): Promise<Response> {
  const q = ctx.url.searchParams;
  const { limite, deslocamento, pagina } = paginar(ctx.url);

  const ufBruta = lerTexto(q.get('uf'), 'uf', 2);
  const uf = ufBruta ? ufBruta.toUpperCase() : null;
  if (uf && !UFS.has(uf)) throw new ErroRota('campo_invalido', 400, 'uf');

  const cidade = lerTexto(q.get('cidade'), 'cidade', LIMITE_TEXTO_CURTO);
  const de = lerData(q.get('de'), 'de');
  const ate = lerData(q.get('ate'), 'ate');
  conferirPeriodo(de, ate);

  const { data, error } = await ctx.admin.rpc('carbon_viagens_listar', {
    p_uf: uf,
    p_cidade: cidade,
    p_de: de,
    p_ate: ate,
    p_limite: limite,
    p_deslocamento: deslocamento,
  });

  if (error) {
    console.error('Falha em carbon_viagens_listar:', error.message);
    return respostaErro('erro_interno', 500);
  }

  const bruto = (data ?? {}) as Record<string, unknown>;
  return respostaJson({
    viagens: Array.isArray(bruto.viagens) ? bruto.viagens : [],
    total: paraNumero(bruto.total) ?? 0,
    resumo: bruto.resumo ?? null,
    pagina,
    limite,
  });
}

async function criarViagem(ctx: Contexto): Promise<Response> {
  const dados = montarDadosViagem(ctx.corpo ?? {}, 'criar');

  const { data, error } = await ctx.admin
    .from('carbon_viagens')
    .insert({ ...dados, criado_por: ctx.registro.id })
    .select(COLUNAS_VIAGEM)
    .single();

  if (error || !data) {
    // codigoCheck = periodo_invalido porque e o CHECK alcancavel por dado enviado
    // (a UF ja foi conferida antes de chegar ao banco).
    lancarErroEscrita(
      (error ?? { message: 'insert sem retorno' }) as ErroBanco,
      'carbon_viagens',
      'periodo_invalido',
    );
  }

  return respostaJson({ viagem: data }, 201);
}

async function atualizarViagem(ctx: Contexto): Promise<Response> {
  const dados = montarDadosViagem(ctx.corpo ?? {}, 'atualizar');

  if (Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }

  const { data, error } = await ctx.admin
    .from('carbon_viagens')
    .update(dados)
    .eq('id', ctx.params.id)
    .select(COLUNAS_VIAGEM)
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_viagens', 'periodo_invalido');
  if (!data) return respostaErro('nao_encontrado', 404);

  return respostaJson({ viagem: data });
}

// -----------------------------------------------------------------------------
// Handlers de visita
// -----------------------------------------------------------------------------

/**
 * Lista visitas com resumo e paginacao. NUNCA devolve contato.
 *
 * Filtros: ?viagem_id=<uuid|sem_viagem> ?follow_up_status= ?situacao= ?organizacao=
 *          ?de= ?ate= ?limite= ?pagina=
 *
 * A garantia de nao vazar contato nao esta neste handler: a funcao SQL de listagem nao
 * seleciona as colunas de contato (ver carbon_visitas_base na migration). Este handler
 * so repassa o resultado.
 */
async function listarVisitas(ctx: Contexto): Promise<Response> {
  const filtros = filtrosDaUrl(ctx.url);
  const { limite, deslocamento, pagina } = paginar(ctx.url);

  const { data, error } = await ctx.admin.rpc('carbon_visitas_listar', {
    p_viagem_id: filtros.viagemId,
    p_sem_viagem: filtros.semViagem,
    p_follow_up_status: filtros.status,
    p_organizacao: filtros.organizacao,
    p_situacao: filtros.situacao,
    p_de: filtros.de,
    p_ate: filtros.ate,
    p_limite: limite,
    p_deslocamento: deslocamento,
  });

  if (error) {
    console.error('Falha em carbon_visitas_listar:', error.message);
    return respostaErro('erro_interno', 500);
  }

  const bruto = (data ?? {}) as Record<string, unknown>;
  return respostaJson({
    visitas: Array.isArray(bruto.visitas) ? bruto.visitas : [],
    total: paraNumero(bruto.total) ?? 0,
    resumo: bruto.resumo ?? null,
    pagina,
    limite,
  });
}

async function obterVisita(ctx: Contexto): Promise<Response> {
  const detalhe = await lerDetalhe(ctx.admin, ctx.params.id, podeVerContato(ctx));
  if (!detalhe) return respostaErro('nao_encontrado', 404);
  return respostaJson(detalhe);
}

async function criarVisita(ctx: Contexto): Promise<Response> {
  const dados = montarDadosVisita(ctx.corpo ?? {}, 'criar', ctx.registro.id);

  const { data, error } = await ctx.admin
    .from('carbon_visitas')
    .insert({ ...dados, criado_por: ctx.registro.id })
    .select('id')
    .single();

  if (error || !data) {
    lancarErroEscrita(
      (error ?? { message: 'insert sem retorno' }) as ErroBanco,
      'carbon_visitas',
    );
  }

  const id = (data as { id: string }).id;
  const detalhe = await lerDetalhe(ctx.admin, id, podeVerContato(ctx));
  if (!detalhe) return respostaErro('erro_interno', 500);
  return respostaJson(detalhe, 201);
}

/**
 * Atualiza a visita e devolve o DETALHE completo.
 *
 * Devolver o detalhe (e nao apenas a linha) mantem a tela com uma unica forma de
 * resposta para "estado atual desta visita", que e o que ela renderiza, e evita que o
 * PATCH devolva contato num formato diferente do GET.
 */
async function atualizarVisita(ctx: Contexto): Promise<Response> {
  const id = ctx.params.id;
  const dados = montarDadosVisita(ctx.corpo ?? {}, 'atualizar', ctx.registro.id);

  if (Object.keys(dados).length === 0) {
    return respostaErro('nada_para_atualizar', 400);
  }

  /**
   * Regravar contato em visita anonimizada e recusado com codigo proprio.
   *
   * A trigger do banco ja impede o efeito (o contato volta a null em silencio), mas
   * silencio aqui seria pior do que o erro: a tela diria "salvo" e a pessoa acharia
   * que o contato foi restaurado. Um pedido de exclusao atendido nao se desfaz por
   * formulario.
   */
  if (tentaGravarContato(dados)) {
    const estado = await lerEstadoVisita(ctx.admin, id);
    if (!estado) return respostaErro('nao_encontrado', 404);
    if (estado.anonimizado_em) throw new ErroRota('visita_anonimizada', 409);
  }

  const { data, error } = await ctx.admin
    .from('carbon_visitas')
    .update(dados)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_visitas');
  if (!data) return respostaErro('nao_encontrado', 404);

  const detalhe = await lerDetalhe(ctx.admin, id, podeVerContato(ctx));
  if (!detalhe) return respostaErro('nao_encontrado', 404);
  return respostaJson(detalhe);
}

/**
 * Anonimiza o contato de uma visita (direito de exclusao do titular).
 *
 * Substitui o DELETE que este dominio NAO tem: apaga nome, telefone e e-mail e
 * preserva a visita, que e fato comercial da APSIS. Irreversivel, registrada em
 * auditoria e idempotente (repetir devolve ja_estava = true).
 */
async function anonimizarVisita(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const motivo = lerTexto(corpo.motivo, 'motivo', LIMITE_TEXTO_LONGO);
  if (!motivo) throw new ErroRota('motivo_obrigatorio', 400, 'motivo');

  const { data, error } = await ctx.admin.rpc('carbon_visita_anonimizar', {
    p_visita_id: ctx.params.id,
    p_motivo: motivo,
    p_usuario_id: ctx.registro.id,
  });

  if (error) {
    // RAISE de plpgsql sem errcode chega como P0001, portanto os casos de negocio da
    // funcao sao reconhecidos pela mensagem que ela padroniza. O resto (FK, check) tem
    // SQLSTATE proprio e vai para lancarErroEscrita.
    const mensagem = String(error.message ?? '');
    if (mensagem.includes('visita_nao_encontrada')) return respostaErro('nao_encontrado', 404);
    if (mensagem.includes('motivo_obrigatorio')) {
      throw new ErroRota('motivo_obrigatorio', 400, 'motivo');
    }
    lancarErroEscrita(error as ErroBanco, 'carbon_visita_anonimizar');
  }

  const bruto = (data ?? {}) as Record<string, unknown>;
  return respostaJson({
    anonimizada: bruto.anonimizada === true,
    ja_estava: bruto.ja_estava === true,
    visita_id: bruto.visita_id ?? ctx.params.id,
    anonimizado_em: bruto.anonimizado_em ?? null,
  });
}

/**
 * Executa o prazo de retencao: apaga o contato de toda visita com prazo vencido.
 *
 * E o que impede o prazo de retencao de ser so uma frase na politica. Rota de acao, por
 * isso POST. Uma linha de auditoria por execucao com efeito.
 */
async function anonimizarVencidas(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const limiteBruto = lerNumero(corpo.limite, 'limite');
  const limite = limiteBruto === null ? 500 : Math.floor(limiteBruto);

  if (limite < 1 || limite > LIMITE_RETENCAO_MAXIMO) {
    throw new ErroRota('campo_invalido', 400, 'limite');
  }

  const { data, error } = await ctx.admin.rpc('carbon_visitas_anonimizar_vencidas', {
    p_usuario_id: ctx.registro.id,
    p_limite: limite,
  });

  if (error) {
    console.error('Falha em carbon_visitas_anonimizar_vencidas:', error.message);
    lancarErroEscrita(error as ErroBanco, 'carbon_visitas_anonimizar_vencidas');
  }

  const bruto = (data ?? {}) as Record<string, unknown>;
  return respostaJson({
    anonimizadas: paraNumero(bruto.anonimizadas) ?? 0,
    referencia: bruto.referencia ?? null,
    limite,
  });
}

/**
 * Exportacao da base de visitas, com registro de auditoria obrigatorio.
 *
 * POST, e nao GET, porque a chamada TEM efeito colateral: grava a linha de auditoria.
 * Declarada escrita: true, portanto so admin e gestor chegam aqui - o mesmo conjunto
 * que pode ver contato. O log e gravado DENTRO da funcao SQL, na mesma transacao dos
 * dados: nao existe caminho de exportar sem deixar rastro.
 *
 * Com incluir_contatos = true, a funcao SQL exige motivo (finalidade declarada) e
 * recusa com motivo_obrigatorio. O CSV e montado no navegador, a partir de registros.
 */
async function exportar(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  const filtros = filtrosDoCorpo(corpo);

  const incluirContatos = veioNoCorpo(corpo, 'incluir_contatos')
    ? lerBooleano(corpo.incluir_contatos, 'incluir_contatos')
    : false;

  const motivo = lerTexto(corpo.motivo, 'motivo', LIMITE_TEXTO_LONGO);

  // Barreira dupla, de proposito: a funcao SQL tambem recusa. Aqui o erro sai antes de
  // qualquer leitura de dado pessoal, e com o campo no detalhe.
  if (incluirContatos && !motivo) throw new ErroRota('motivo_obrigatorio', 400, 'motivo');

  // Redundante com o portao de escrita do index.ts (escrita: true ja exige admin ou
  // gestor), mantida porque esta e a regra de LGPD e nao a de escrita: se um dia a
  // rota deixar de ser de escrita, a protecao do dado pessoal continua aqui.
  if (incluirContatos && !podeVerContato(ctx)) {
    return respostaErro('sem_permissao', 403);
  }

  const limiteBruto = lerNumero(corpo.limite, 'limite');
  const limite = limiteBruto === null ? LIMITE_EXPORTACAO_PADRAO : Math.floor(limiteBruto);
  if (limite < 1 || limite > LIMITE_EXPORTACAO_MAXIMO) {
    throw new ErroRota('campo_invalido', 400, 'limite');
  }

  const { data, error } = await ctx.admin.rpc('carbon_visitas_exportar', {
    p_usuario_id: ctx.registro.id,
    p_incluir_contatos: incluirContatos,
    p_motivo: motivo,
    p_viagem_id: filtros.viagemId,
    p_sem_viagem: filtros.semViagem,
    p_follow_up_status: filtros.status,
    p_organizacao: filtros.organizacao,
    p_situacao: filtros.situacao,
    p_de: filtros.de,
    p_ate: filtros.ate,
    p_limite: limite,
  });

  if (error) {
    const mensagem = String(error.message ?? '');
    if (mensagem.includes('motivo_obrigatorio')) {
      throw new ErroRota('motivo_obrigatorio', 400, 'motivo');
    }
    if (mensagem.includes('usuario_obrigatorio')) {
      // So acontece com p_usuario_id nulo, que esta rota nunca envia. Se aparecer, e
      // erro de servidor e nao do cliente.
      console.error('carbon_visitas_exportar recebeu usuario nulo');
      return respostaErro('erro_interno', 500);
    }
    console.error('Falha em carbon_visitas_exportar:', error.message);
    lancarErroEscrita(error as ErroBanco, 'carbon_visitas_exportar');
  }

  const bruto = (data ?? {}) as Record<string, unknown>;
  return respostaJson({
    registros: Array.isArray(bruto.registros) ? bruto.registros : [],
    total: paraNumero(bruto.total) ?? 0,
    incluiu_contatos: bruto.incluiu_contatos === true,
    exportacao_id: bruto.exportacao_id ?? null,
    filtros: bruto.filtros ?? null,
  });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'viagens', escrita: false, handler: listarViagens },
  { metodo: 'POST', padrao: 'viagens', escrita: true, handler: criarViagem },
  { metodo: 'PATCH', padrao: 'viagens/:id', escrita: true, handler: atualizarViagem },

  { metodo: 'GET', padrao: 'visitas', escrita: false, handler: listarVisitas },
  { metodo: 'POST', padrao: 'visitas', escrita: true, handler: criarVisita },

  /**
   * Rotas literais de acao. O roteador do index.ts ordena por quantidade de
   * parametros, portanto 'visitas/exportacao' (zero parametros) e casada ANTES de
   * 'visitas/:id' e nunca e tratada como um id invalido.
   *
   * As duas sao escrita: true. Exportacao porque grava auditoria e leva dado pessoal;
   * a rotina de retencao porque apaga dado. Nas duas, o portao de escrita do index.ts
   * ja restringe a admin e gestor.
   */
  { metodo: 'POST', padrao: 'visitas/exportacao', escrita: true, handler: exportar },
  {
    metodo: 'POST',
    padrao: 'visitas/anonimizar-vencidas',
    escrita: true,
    handler: anonimizarVencidas,
  },

  { metodo: 'GET', padrao: 'visitas/:id', escrita: false, handler: obterVisita },
  { metodo: 'PATCH', padrao: 'visitas/:id', escrita: true, handler: atualizarVisita },
  {
    metodo: 'POST',
    padrao: 'visitas/:id/anonimizar',
    escrita: true,
    handler: anonimizarVisita,
  },
];

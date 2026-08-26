// -----------------------------------------------------------------------------
// Rotas do funil comercial da Consultoria.
// -----------------------------------------------------------------------------
// GET   carbon-api/propostas         -> { propostas, total, pagina, limite, resumo, grupos }
// POST  carbon-api/propostas         -> { proposta }                              201
// PATCH carbon-api/propostas/:id     -> { proposta }
// GET   carbon-api/consultorias      -> { consultorias, total, pagina, limite, resumo }
// POST  carbon-api/consultorias      -> { consultoria }                           201
// PATCH carbon-api/consultorias/:id  -> { consultoria }
//
// Objetos SQL de que este modulo depende (migration 20260825150000_funil_consultoria):
//   public.carbon_propostas      7 registros reais
//   public.carbon_consultorias   9 registros reais
//
// NAO HA VIEW NEM FUNCAO SQL neste dominio, ao contrario de fornecedores. As
// consultas sao diretas nas tabelas e o formato da resposta e definido aqui. Isso
// tem uma consequencia pratica: toda regra derivada (taxa de conversao, prazo
// vencido, data de desfecho) esta escrita UMA vez neste arquivo, e o dataset de
// demonstracao do frontend a repete de proposito, comentada como copia.
//
// DUAS TABELAS, DOIS ESTAGIOS. Uma proposta ganha VIRA uma consultoria e as duas
// coexistem: a proposta guarda como o trabalho foi vendido, a consultoria guarda
// como ele anda. O vinculo e carbon_consultorias.proposta_id, ANULAVEL porque o
// Notion nao liga as duas bases - a ligacao existe na cabeca de quem trabalha. Por
// isso a listagem de propostas devolve `consultorias` (quantas ja saíram dela) e a
// de consultorias devolve `proposta_codigo`: e o que permite a tela cobrar o
// vinculo que falta, em vez de fingir que ele existe.
//
// CODIGO NAO E IDENTIFICADOR. carbon_propostas.codigo e anulavel E repetido: tres
// das sete propostas nao tem codigo e duas carregam o literal `AP-000XX/25`, com o
// XX por preencher. O indice unico da migration ignora os placeholders de
// proposito. Nenhuma rota daqui procura, ordena ou casa registro por codigo: o
// identificador e o `id`, sempre.
//
// NAO EXISTE DELETE, de proposito. As duas tabelas tem a coluna `ativo` e e ela que
// arquiva. Proposta perdida e consultoria cancelada sao justamente o dado que
// sustenta a taxa de conversao; um DELETE apagaria o denominador e a metrica
// melhoraria sozinha a cada limpeza de tela.
//
// PUBLICACAO: falta UMA linha de import e UMA de spread em rotas/indice.ts, que e
// arquivo compartilhado da fundacao e nao foi tocado por este modulo. Sem esse
// passo o carbon-api responde 404 para tudo que esta aqui.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { respostaErro, respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';
import {
  ErroRota,
  type ErroBanco,
  lancarErroEscrita,
  lerData,
  lerEnum,
  lerTexto,
  lerUuid,
  LIMITE_TEXTO_LONGO,
  paginar,
  veioNoCorpo,
} from './helpers.ts';

// -----------------------------------------------------------------------------
// Vocabulario (espelha os CHECK da migration)
// -----------------------------------------------------------------------------

const STATUS_PROPOSTA = new Set(['elaboracao', 'ganha', 'perdida', 'cancelada']);
const STATUS_CONSULTORIA = new Set([
  'nao_iniciada',
  'em_andamento',
  'concluida',
  'cancelada',
]);

/**
 * Status em que o prazo da consultoria ainda significa alguma coisa.
 *
 * Concluida nao atrasa (o trabalho acabou) e cancelada tambem nao (nao vai
 * acontecer). Sem esta lista, toda consultoria antiga apareceria como vencida para
 * sempre, e o contador de atraso viraria ruido que ninguem olha.
 */
const CONSULTORIA_EM_CURSO = new Set(['nao_iniciada', 'em_andamento']);

const COLUNAS_PROPOSTA = 'id, codigo, titulo, cliente, status, grupo_servico, ' +
  'servico, metodologia, data_criacao, data_ganha, data_perdida, observacoes, ' +
  'ativo, criado_em, atualizado_em';

const COLUNAS_CONSULTORIA = 'id, proposta_id, nome, cliente, status, prazo, ' +
  'observacoes, ativo, criado_em, atualizado_em';

/**
 * Embed da proposta que originou a consultoria.
 *
 * SEM DICA DE CHAVE porque carbon_consultorias tem UMA unica chave estrangeira para
 * carbon_propostas (a outra, criado_por, aponta para carbon_usuarios). Nao ha a
 * ambiguidade PGRST201 que obrigaria a dica `!nome_da_constraint`. Se um dia alguem
 * acrescentar uma segunda FK para carbon_propostas, este embed falha alto no
 * primeiro GET, e nao em silencio.
 */
const EMBED_PROPOSTA = 'proposta:carbon_propostas(codigo, titulo, cliente, status)';

type Linha = Record<string, unknown>;

/**
 * Construtor de consulta do PostgREST, sem tipo.
 *
 * Mesma decisao de fornecedores.ts: as listagens aplicam os mesmos filtros em duas
 * consultas (a pagina e o conjunto inteiro para o resumo), entao a montagem dos
 * filtros vive numa funcao. Tipar o encadeamento exigiria repetir a genealogia de
 * PostgrestFilterBuilder com os generics da tabela, e o risco real (nome de coluna
 * errado) nao e coberto por esse tipo de qualquer forma: quem reclama e o banco.
 */
// deno-lint-ignore no-explicit-any
type Consulta = any;

// -----------------------------------------------------------------------------
// Hoje, no fuso de quem usa o sistema
// -----------------------------------------------------------------------------
// O isolate da Edge Function roda em UTC. `new Date().toISOString().slice(0, 10)`
// devolve o dia seguinte a partir das 21h de Brasilia, e neste dominio isso nao e
// detalhe: uma proposta marcada como ganha as 22h ganharia a data de amanha, e a
// consultoria com prazo para hoje apareceria vencida antes de vencer.
//
// Intl com timeZone explicito resolve sem dependencia nova (o Deno traz ICU
// completo). formatToParts em vez de format porque o formato do locale nao e
// contrato: montamos a string AAAA-MM-DD na mao, que e o que as colunas `date`
// esperam.

const FUSO_APSIS = 'America/Sao_Paulo';

const FORMATO_DATA = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_APSIS,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function hojeNoBrasil(): string {
  const partes: Record<string, string> = {};
  for (const parte of FORMATO_DATA.formatToParts(new Date())) {
    partes[parte.type] = parte.value;
  }
  return `${partes.year}-${partes.month}-${partes.day}`;
}

// -----------------------------------------------------------------------------
// Leitura de parametros
// -----------------------------------------------------------------------------

function textoDaQuery(url: URL, chave: string, limite = 120): string | null {
  const bruto = url.searchParams.get(chave);
  if (bruto === null) return null;
  const limpo = bruto.trim().slice(0, limite);
  return limpo === '' ? null : limpo;
}

/**
 * Termo de busca ja sanitizado para o `.or()` do PostgREST.
 *
 * A busca precisa alcancar tres colunas (codigo, titulo, cliente), e o `.or()` e a
 * unica forma de fazer isso numa consulta so. O perigo do `.or()` e conhecido e
 * esta registrado em fornecedores.ts: a condicao e uma STRING, e virgula, parentese
 * ou ponto vindos do usuario reescrevem a arvore de filtros da consulta.
 *
 * Aqui a defesa e LISTA BRANCA de caracteres em vez de lista negra: sobrevivem
 * letras, digitos, espaco, hifen e barra - exatamente o que um codigo de AP
 * ("AP-00052/25") e um nome de cliente precisam. Tudo o mais vira espaco, incluindo
 * os curingas `%` e `_` do LIKE, que de outro modo permitiriam varrer a tabela
 * inteira com um termo de um caractere.
 */
function termoDeBusca(url: URL): string | null {
  const bruto = url.searchParams.get('busca');
  if (bruto === null) return null;
  const limpo = bruto.trim().slice(0, 120).replace(/[^\p{L}\p{N}\s\-/]+/gu, ' ').trim();
  return limpo === '' ? null : limpo;
}

/** Filtro `ativo` da query string. Ausente = traz ativos e inativos. */
function aplicarAtivo(consulta: Consulta, url: URL): Consulta {
  const bruto = url.searchParams.get('ativo');
  if (bruto === 'true') return consulta.eq('ativo', true);
  if (bruto === 'false') return consulta.eq('ativo', false);
  return consulta;
}

// -----------------------------------------------------------------------------
// Propostas
// -----------------------------------------------------------------------------

/**
 * Resumo do estagio de propostas.
 *
 * A TAXA DE CONVERSAO TEM DENOMINADOR EXPLICITO, e essa e a decisao que mais
 * importa aqui: ela e ganhas / (ganhas + perdidas), NAO ganhas / total.
 *
 * Com o dado real de hoje - 1 ganha, 0 perdidas e 6 em elaboracao - as duas contas
 * dizem coisas diferentes e as duas seriam defensaveis por escrito, mas so uma e
 * honesta: dividir pelo total trata proposta ainda em elaboracao como derrota, e a
 * taxa "melhora" sozinha toda vez que alguem decide uma proposta antiga. O
 * denominador sao as propostas DECIDIDAS.
 *
 * `taxa_conversao` volta NULL quando nao ha nenhuma decidida, em vez de 0. Zero
 * seria uma afirmacao ("nenhuma das que decidimos foi ganha") sobre um conjunto
 * vazio. A tela precisa saber a diferenca entre "0%" e "ainda nao da para dizer", e
 * por isso `decididas` viaja junto: sem o denominador, um numero como 100% nao
 * significa nada.
 *
 * Fracao de 0 a 1, nao percentual. Quem formata e a tela, uma vez.
 */
function resumirPropostas(linhas: Linha[]) {
  const contar = (status: string) => linhas.filter((l) => l.status === status).length;

  const ganhas = contar('ganha');
  const perdidas = contar('perdida');
  const decididas = ganhas + perdidas;

  return {
    total: linhas.length,
    ativas: linhas.filter((l) => l.ativo !== false).length,
    por_status: {
      elaboracao: contar('elaboracao'),
      ganha: ganhas,
      perdida: perdidas,
      cancelada: contar('cancelada'),
    },
    decididas,
    taxa_conversao: decididas === 0 ? null : ganhas / decididas,
  };
}

/**
 * Linhas de servico existentes, para alimentar o filtro da tela.
 *
 * grupo_servico e TEXTO LIVRE na migration (so 'Carbono' e 'Descarbonizacao'
 * aparecem hoje, e a APSIS tem mais linhas de servico do que isso). Coluna livre
 * significa que a lista de opcoes do filtro precisa sair do dado, senao a terceira
 * linha de servico que alguem cadastrar fica invisivel no filtro.
 *
 * SEM NENHUM FILTRO APLICADO, de proposito, e nao sobre o conjunto filtrado: se as
 * opcoes saissem do resultado filtrado, escolher "Carbono" apagaria "Descarbonizacao"
 * da lista e a pessoa ficaria presa no proprio filtro, sem caminho de volta a nao
 * ser limpar tudo.
 */
async function lerGruposDeServico(admin: SupabaseClient) {
  const { data, error } = await admin.from('carbon_propostas').select('grupo_servico');

  if (error) {
    console.error('Falha ao ler grupos de servico:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const contagem = new Map<string, number>();
  let semGrupo = 0;
  for (const linha of (data ?? []) as unknown as Linha[]) {
    const grupo = typeof linha.grupo_servico === 'string' ? linha.grupo_servico.trim() : '';
    if (grupo === '') {
      semGrupo += 1;
      continue;
    }
    contagem.set(grupo, (contagem.get(grupo) ?? 0) + 1);
  }

  return {
    grupos: [...contagem.entries()]
      .map(([grupo, total]) => ({ grupo, total }))
      .sort((a, b) => a.grupo.localeCompare(b.grupo, 'pt-BR')),
    sem_grupo: semGrupo,
  };
}

/**
 * Quantas consultorias ja nasceram de cada proposta.
 *
 * Consulta propria em vez de embed reverso: o embed traria as linhas inteiras de
 * carbon_consultorias so para contar, e a contagem e o unico dado que a listagem de
 * propostas precisa. E a informacao que faz a tela distinguir "proposta ganha e
 * executando" de "proposta ganha e esquecida", que sao situacoes bem diferentes.
 */
async function contarConsultoriasPorProposta(
  admin: SupabaseClient,
  ids: string[],
): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  if (ids.length === 0) return mapa;

  const { data, error } = await admin
    .from('carbon_consultorias')
    .select('proposta_id')
    .in('proposta_id', ids);

  if (error) {
    console.error('Falha ao contar carbon_consultorias por proposta:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  for (const linha of (data ?? []) as unknown as Linha[]) {
    const chave = String(linha.proposta_id);
    mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  }
  return mapa;
}

async function listarPropostas(ctx: Contexto): Promise<Response> {
  const { limite, deslocamento, pagina } = paginar(ctx.url);

  const status = textoDaQuery(ctx.url, 'status', 40);
  // Status torto na URL e erro do cliente, e nao "sem filtro": devolver a lista
  // inteira faria a tela mostrar propostas ganhas numa aba escrita "perdidas".
  if (status && !STATUS_PROPOSTA.has(status)) {
    throw new ErroRota('status_invalido', 400, 'status');
  }

  const grupo = textoDaQuery(ctx.url, 'grupo_servico');
  const busca = termoDeBusca(ctx.url);

  const aplicarFiltros = (consulta: Consulta): Consulta => {
    let q = aplicarAtivo(consulta, ctx.url);
    if (status) q = q.eq('status', status);
    // 'sem_grupo' alcanca as propostas sem linha de servico declarada, que sao
    // duas das sete. Diferente de nao filtrar, que traz todas.
    if (grupo === 'sem_grupo') q = q.is('grupo_servico', null);
    else if (grupo) q = q.eq('grupo_servico', grupo);
    if (busca) {
      q = q.or(`codigo.ilike.%${busca}%,titulo.ilike.%${busca}%,cliente.ilike.%${busca}%`);
    }
    return q;
  };

  const [lista, paraResumo, grupos] = await Promise.all([
    aplicarFiltros(
      ctx.admin
        .from('carbon_propostas')
        .select(COLUNAS_PROPOSTA, { count: 'exact' })
        // data_criacao primeiro, criado_em como desempate: a data de criacao veio
        // do Notion e esta vazia em parte das linhas, e sem o segundo criterio a
        // ordem dessas linhas mudaria de uma requisicao para outra.
        .order('data_criacao', { ascending: false, nullsFirst: false })
        .order('criado_em', { ascending: false })
        .range(deslocamento, deslocamento + limite - 1),
    ),
    // O resumo conta o conjunto FILTRADO inteiro, nao a pagina: um rodape que
    // dissesse "1 ganha" olhando so as 50 primeiras linhas seria pior que nenhum.
    aplicarFiltros(ctx.admin.from('carbon_propostas').select('status, ativo')),
    lerGruposDeServico(ctx.admin),
  ]);

  if (lista.error) {
    console.error('Falha ao listar carbon_propostas:', lista.error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (paraResumo.error) {
    console.error('Falha ao resumir carbon_propostas:', paraResumo.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const propostas = (lista.data ?? []) as unknown as Linha[];
  const contagem = await contarConsultoriasPorProposta(
    ctx.admin,
    propostas.map((p) => String(p.id)),
  );

  return respostaJson({
    propostas: propostas.map((p) => ({
      ...p,
      consultorias: contagem.get(String(p.id)) ?? 0,
    })),
    total: lista.count ?? propostas.length,
    pagina,
    limite,
    resumo: resumirPropostas((paraResumo.data ?? []) as unknown as Linha[]),
    ...grupos,
  });
}

/**
 * Campos que POST e PATCH aceitam, com a mesma validacao nos dois.
 *
 * LISTA BRANCA por chave PRESENTE no corpo: campo ausente nao vira null. E o que
 * permite a tela mandar so o que mudou sem apagar o resto, e o que impede um corpo
 * com { criado_por, criado_em } de reescrever autoria.
 *
 * As DATAS DE DESFECHO SAO DERIVADAS DO STATUS quando o status vem no corpo. Sem
 * isso, mudar o status por um select deixaria data_ganha em branco para sempre e a
 * taxa de conversao nao teria quando. Mais grave: ir de 'ganha' para 'perdida' sem
 * limpar data_ganha viola carbon_propostas_desfecho_chk, e a pessoa receberia um
 * erro de banco ao corrigir um clique errado. Quem manda a data explicitamente no
 * mesmo corpo continua mandando: a derivacao e o default, nao uma trava.
 */
function montarDadosProposta(corpo: Linha): Linha {
  const dados: Linha = {};

  const texto = (campo: string, limite: number) => {
    if (!veioNoCorpo(corpo, campo)) return;
    dados[campo] = lerTexto(corpo[campo], campo, limite);
  };

  // codigo entra como texto comum, sem normalizacao e sem exigencia de formato: o
  // dado real tem `AP-000XX/25`, `AP-000xx/25 - Mapeamento Oportunidades` e
  // `S1 e S2 [Pampa Sul Energia]`. Uma mascara aqui recusaria a carga do que existe.
  texto('codigo', 120);
  texto('titulo', 300);
  texto('cliente', 200);
  texto('grupo_servico', 120);
  texto('servico', 200);
  texto('metodologia', 200);
  texto('observacoes', LIMITE_TEXTO_LONGO);

  if (veioNoCorpo(corpo, 'data_criacao')) {
    dados.data_criacao = lerMomento(corpo.data_criacao, 'data_criacao');
  }
  if (veioNoCorpo(corpo, 'ativo')) {
    // null vira true: coluna NOT NULL, e um campo esvaziado por engano nao pode
    // arquivar a proposta.
    dados.ativo = corpo.ativo === null ? true : corpo.ativo === true;
  }

  const status = veioNoCorpo(corpo, 'status')
    ? lerEnum(corpo.status, STATUS_PROPOSTA, 'status_invalido', 'status')
    : null;

  if (status !== null) {
    dados.status = status;
    if (status === 'ganha') {
      dados.data_ganha = lerData(corpo.data_ganha, 'data_ganha') ?? hojeNoBrasil();
      dados.data_perdida = null;
    } else if (status === 'perdida') {
      dados.data_perdida = lerData(corpo.data_perdida, 'data_perdida') ?? hojeNoBrasil();
      dados.data_ganha = null;
    } else {
      // Voltar para elaboracao ou cancelar LIMPA o desfecho. Cancelada nao e
      // perdida: a proposta nao foi recusada pelo cliente, ela deixou de existir,
      // e mante-la no denominador da conversao contaria uma derrota que nao houve.
      dados.data_ganha = null;
      dados.data_perdida = null;
    }
  } else {
    // Sem mudanca de status, as datas continuam editaveis a mao (corrigir a data
    // de uma proposta ja ganha). Quem impede as duas preenchidas e o CHECK
    // carbon_propostas_desfecho_chk, traduzido em 'desfecho_ambiguo'.
    if (veioNoCorpo(corpo, 'data_ganha')) {
      dados.data_ganha = lerData(corpo.data_ganha, 'data_ganha');
    }
    if (veioNoCorpo(corpo, 'data_perdida')) {
      dados.data_perdida = lerData(corpo.data_perdida, 'data_perdida');
    }
  }

  return dados;
}

/**
 * data_criacao e timestamptz e a tela manda uma DATA.
 *
 * 'AAAA-MM-DD' cru viraria meia-noite UTC, que no Brasil e 21h do dia ANTERIOR:
 * a proposta criada em 19/02 apareceria como 18/02 na propria tela que a gravou.
 * Ancorar ao meio-dia de Brasilia deixa a leitura correta em qualquer fuso das
 * Americas e da Europa, que e onde este sistema e aberto.
 *
 * Timestamp completo (com hora e fuso) passa direto: e o que a carga do Notion
 * manda, e ali a hora e informacao de verdade.
 */
function lerMomento(valor: unknown, campo: string): string | null {
  const texto = lerTexto(valor, campo, 40);
  if (texto === null) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const data = lerData(texto, campo);
    return data === null ? null : `${data}T12:00:00-03:00`;
  }

  const momento = new Date(texto);
  if (Number.isNaN(momento.getTime())) throw new ErroRota('campo_invalido', 400, campo);
  return momento.toISOString();
}

async function criarProposta(ctx: Contexto): Promise<Response> {
  const dados = montarDadosProposta(ctx.corpo ?? {});

  // A migration deixou TODAS as colunas descritivas anulaveis, com razao: exigir
  // codigo faria alguem inventar um. O efeito colateral e que nada impede uma linha
  // completamente em branco, que na tela e uma proposta sem nome que ninguem
  // consegue identificar nem para apagar. Um dos tres basta.
  if (!dados.codigo && !dados.titulo && !dados.cliente) {
    throw new ErroRota('proposta_sem_identificacao', 400, 'titulo');
  }

  const { data, error } = await ctx.admin
    .from('carbon_propostas')
    .insert({ ...dados, criado_por: ctx.registro.id })
    .select(COLUNAS_PROPOSTA)
    .single();

  // 'desfecho_ambiguo' nomeia carbon_propostas_desfecho_chk (ganha e perdida ao
  // mesmo tempo): sem isso a mensagem seria 'campo_invalido' e ninguem descobriria
  // qual campo. O 23505 do indice unico parcial de codigo vira registro_duplicado.
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_propostas', 'desfecho_ambiguo');

  return respostaJson({ proposta: { ...(data as unknown as Linha), consultorias: 0 } }, 201);
}

async function atualizarProposta(ctx: Contexto): Promise<Response> {
  const dados = montarDadosProposta(ctx.corpo ?? {});
  if (Object.keys(dados).length === 0) return respostaErro('nada_para_atualizar', 400);

  const { data, error } = await ctx.admin
    .from('carbon_propostas')
    .update(dados)
    .eq('id', ctx.params.id)
    .select(COLUNAS_PROPOSTA)
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_propostas', 'desfecho_ambiguo');
  if (!data) return respostaErro('nao_encontrado', 404);

  const contagem = await contarConsultoriasPorProposta(ctx.admin, [ctx.params.id]);

  return respostaJson({
    proposta: {
      ...(data as unknown as Linha),
      consultorias: contagem.get(ctx.params.id) ?? 0,
    },
  });
}

// -----------------------------------------------------------------------------
// Consultorias
// -----------------------------------------------------------------------------

/**
 * Achata o embed da proposta em campos planos.
 *
 * Mesma decisao de achatarResponsavel() em helpers.ts: a tela recebe
 * `proposta_codigo` em vez de `proposta.codigo`. Objeto aninhado que pode ser nulo
 * obriga cada uso na tela a testar dois niveis, e e onde nasce o
 * "Cannot read properties of null".
 */
function achatarProposta(linha: Linha): Linha {
  const { proposta, ...resto } = linha;
  const origem = (proposta ?? null) as {
    codigo?: string | null;
    titulo?: string | null;
    cliente?: string | null;
    status?: string | null;
  } | null;

  return {
    ...resto,
    proposta_codigo: origem?.codigo ?? null,
    proposta_titulo: origem?.titulo ?? null,
    proposta_cliente: origem?.cliente ?? null,
    proposta_status: origem?.status ?? null,
  };
}

/**
 * Marca a consultoria cujo prazo ja passou.
 *
 * Derivado no SERVIDOR e nao no navegador pelo mesmo motivo de rotularPeriodo() em
 * indicadores.ts: o relogio do navegador e do usuario, e uma maquina com a data
 * errada pintaria de vermelho meia lista. Comparacao de string funciona porque
 * 'AAAA-MM-DD' e ordenavel lexicograficamente.
 */
function comPrazoVencido(linha: Linha, hoje: string): Linha {
  const prazo = typeof linha.prazo === 'string' ? linha.prazo : null;
  const emCurso = CONSULTORIA_EM_CURSO.has(String(linha.status ?? ''));
  return { ...linha, prazo_vencido: Boolean(prazo && emCurso && prazo < hoje) };
}

function resumirConsultorias(linhas: Linha[], hoje: string) {
  const contar = (status: string) => linhas.filter((l) => l.status === status).length;
  const emCurso = linhas.filter((l) => CONSULTORIA_EM_CURSO.has(String(l.status ?? '')));

  return {
    total: linhas.length,
    ativas: linhas.filter((l) => l.ativo !== false).length,
    por_status: {
      nao_iniciada: contar('nao_iniciada'),
      em_andamento: contar('em_andamento'),
      concluida: contar('concluida'),
      cancelada: contar('cancelada'),
    },
    em_curso: emCurso.length,
    prazo_vencido: emCurso.filter((l) => typeof l.prazo === 'string' && l.prazo < hoje).length,
    // Consultoria em curso SEM prazo nao e um erro, e uma lacuna que so aparece se
    // alguem contar: quatro das nove nao tem prazo no Notion.
    sem_prazo: emCurso.filter((l) => !l.prazo).length,
    // Consultorias sem proposta de origem. O Notion nao liga as duas bases, entao
    // hoje isto e quase todo o conjunto - e e exatamente o trabalho de revisao que
    // a tela precisa tornar visivel.
    sem_proposta: linhas.filter((l) => !l.proposta_id).length,
  };
}

async function listarConsultorias(ctx: Contexto): Promise<Response> {
  const { limite, deslocamento, pagina } = paginar(ctx.url);
  const hoje = hojeNoBrasil();

  const status = textoDaQuery(ctx.url, 'status', 40);
  if (status && !STATUS_CONSULTORIA.has(status)) {
    throw new ErroRota('status_invalido', 400, 'status');
  }

  // 'sem_proposta' e 'com_proposta': e o filtro que permite atacar a lacuna de
  // vinculo em vez de so contempla-la no resumo.
  const vinculo = textoDaQuery(ctx.url, 'vinculo', 20);
  const busca = termoDeBusca(ctx.url);

  const aplicarFiltros = (consulta: Consulta): Consulta => {
    let q = aplicarAtivo(consulta, ctx.url);
    if (status) q = q.eq('status', status);
    if (vinculo === 'sem_proposta') q = q.is('proposta_id', null);
    else if (vinculo === 'com_proposta') q = q.not('proposta_id', 'is', null);
    if (busca) q = q.or(`nome.ilike.%${busca}%,cliente.ilike.%${busca}%`);
    return q;
  };

  const [lista, paraResumo] = await Promise.all([
    aplicarFiltros(
      ctx.admin
        .from('carbon_consultorias')
        .select(`${COLUNAS_CONSULTORIA}, ${EMBED_PROPOSTA}`, { count: 'exact' })
        // Prazo primeiro e ascendente: quem tem data mais proxima aparece antes, e
        // as sem prazo caem para o fim em vez de abrirem a lista sem informacao.
        .order('prazo', { ascending: true, nullsFirst: false })
        .order('criado_em', { ascending: false })
        .range(deslocamento, deslocamento + limite - 1),
    ),
    aplicarFiltros(
      ctx.admin.from('carbon_consultorias').select('status, ativo, prazo, proposta_id'),
    ),
  ]);

  if (lista.error) {
    console.error('Falha ao listar carbon_consultorias:', lista.error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (paraResumo.error) {
    console.error('Falha ao resumir carbon_consultorias:', paraResumo.error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const consultorias = (lista.data ?? []) as unknown as Linha[];

  return respostaJson({
    consultorias: consultorias.map((c) => comPrazoVencido(achatarProposta(c), hoje)),
    total: lista.count ?? consultorias.length,
    pagina,
    limite,
    resumo: resumirConsultorias((paraResumo.data ?? []) as unknown as Linha[], hoje),
    // A tela precisa da mesma referencia de "hoje" que o servidor usou para marcar
    // o atraso, senao o texto ("venceu ha 3 dias") contradiz a cor da linha.
    hoje,
  });
}

/** Campos que POST e PATCH de consultoria aceitam. `criando` exige o nome. */
function montarDadosConsultoria(corpo: Linha, criando: boolean): Linha {
  const dados: Linha = {};

  if (criando || veioNoCorpo(corpo, 'nome')) {
    // Sem mascara nem validacao de formato, de proposito. A convencao e
    // `AP - <numero>-<ano> [CLIENTE]` e o dado real a desrespeita de varias
    // maneiras (`AP x -25 [IPEL]` quando o numero nao existe, hifen fora de lugar).
    // Uma tela que exigisse formato rigido brigaria com o habito, e o resultado
    // seria a equipe parar de lancar - nao passar a escrever certo.
    const nome = lerTexto(corpo.nome, 'nome', 300);
    if (!nome) throw new ErroRota('campo_obrigatorio', 400, 'nome');
    dados.nome = nome;
  }

  if (veioNoCorpo(corpo, 'proposta_id')) {
    // null e '' desfazem o vinculo, que precisa ser possivel: a ligacao entre as
    // duas bases e reconstruida a mao e vai ser ligada no registro errado alguma vez.
    dados.proposta_id = lerUuid(corpo.proposta_id, 'proposta_id');
  }
  if (veioNoCorpo(corpo, 'cliente')) dados.cliente = lerTexto(corpo.cliente, 'cliente', 200);
  if (veioNoCorpo(corpo, 'observacoes')) {
    dados.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO);
  }
  if (veioNoCorpo(corpo, 'prazo')) dados.prazo = lerData(corpo.prazo, 'prazo');
  if (veioNoCorpo(corpo, 'status')) {
    const status = lerEnum(corpo.status, STATUS_CONSULTORIA, 'status_invalido', 'status');
    // Coluna NOT NULL com default: null significa "nao mexer", nunca "limpar".
    if (status !== null) dados.status = status;
  }
  if (veioNoCorpo(corpo, 'ativo')) {
    dados.ativo = corpo.ativo === null ? true : corpo.ativo === true;
  }

  return dados;
}

/** Le a consultoria ja com a proposta embutida, para POST e PATCH responderem igual ao GET. */
async function lerConsultoria(admin: SupabaseClient, id: string, hoje: string) {
  const { data, error } = await admin
    .from('carbon_consultorias')
    .select(`${COLUNAS_CONSULTORIA}, ${EMBED_PROPOSTA}`)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler carbon_consultorias:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) return null;
  return comPrazoVencido(achatarProposta(data as unknown as Linha), hoje);
}

async function criarConsultoria(ctx: Contexto): Promise<Response> {
  const dados = montarDadosConsultoria(ctx.corpo ?? {}, true);

  const { data, error } = await ctx.admin
    .from('carbon_consultorias')
    .insert({ ...dados, criado_por: ctx.registro.id })
    .select('id')
    .single();

  // O unico CHECK da tabela e nome nao vazio, e ele e inalcancavel por aqui:
  // lerTexto ja apara e recusa branco. Fica o default 'campo_invalido' para o dia
  // em que a migration ganhar outro check. 23503 (proposta_id inexistente) vira
  // referencia_invalida no proprio lancarErroEscrita.
  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_consultorias');

  const consultoria = await lerConsultoria(
    ctx.admin,
    String((data as unknown as Linha).id),
    hojeNoBrasil(),
  );
  return respostaJson({ consultoria }, 201);
}

async function atualizarConsultoria(ctx: Contexto): Promise<Response> {
  const dados = montarDadosConsultoria(ctx.corpo ?? {}, false);
  if (Object.keys(dados).length === 0) return respostaErro('nada_para_atualizar', 400);

  const { data, error } = await ctx.admin
    .from('carbon_consultorias')
    .update(dados)
    .eq('id', ctx.params.id)
    .select('id')
    .maybeSingle();

  if (error) lancarErroEscrita(error as ErroBanco, 'carbon_consultorias');
  if (!data) return respostaErro('nao_encontrado', 404);

  return respostaJson({
    consultoria: await lerConsultoria(ctx.admin, ctx.params.id, hojeNoBrasil()),
  });
}

// -----------------------------------------------------------------------------
// Registro das rotas
// -----------------------------------------------------------------------------

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'propostas', escrita: false, handler: listarPropostas },
  { metodo: 'POST', padrao: 'propostas', escrita: true, handler: criarProposta },
  { metodo: 'PATCH', padrao: 'propostas/:id', escrita: true, handler: atualizarProposta },

  { metodo: 'GET', padrao: 'consultorias', escrita: false, handler: listarConsultorias },
  { metodo: 'POST', padrao: 'consultorias', escrita: true, handler: criarConsultoria },
  {
    metodo: 'PATCH',
    padrao: 'consultorias/:id',
    escrita: true,
    handler: atualizarConsultoria,
  },
];

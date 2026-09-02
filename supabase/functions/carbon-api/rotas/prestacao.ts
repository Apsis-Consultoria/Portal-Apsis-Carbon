// -----------------------------------------------------------------------------
// Prestacao de contas da antecipacao de recursos ao Parakana.
// -----------------------------------------------------------------------------
//   GET    carbon-api/prestacao/grupos              grupos, ciclos e saldo de cada
//   GET    carbon-api/prestacao/catalogos           aldeias e eixos, para os formularios
//   GET    carbon-api/prestacao/ciclos/:id          saldo, antecipacoes e lancamentos
//   GET    carbon-api/prestacao/ciclos/:id/painel   agregados da visao gerencial
//   POST   carbon-api/prestacao/antecipacoes        cria repasse
//   PATCH  carbon-api/prestacao/antecipacoes/:id    altera repasse
//   DELETE carbon-api/prestacao/antecipacoes/:id    apaga repasse
//   POST   carbon-api/prestacao/lancamentos         cria despesa declarada
//   PATCH  carbon-api/prestacao/lancamentos/:id     altera despesa declarada
//   DELETE carbon-api/prestacao/lancamentos/:id     apaga despesa declarada
//   GET    carbon-api/prestacao/ciclos/:id/comprovantes  lista paginada
//   POST/PATCH/DELETE carbon-api/prestacao/comprovantes[/:id]
//   POST/PATCH        carbon-api/prestacao/ciclos[/:id]
//   POST/PATCH        carbon-api/prestacao/aldeias[/:id]
//   POST/PATCH        carbon-api/prestacao/eixos[/:id]
//
// A EQUIPE DEIXOU O EXCEL: estas rotas sao o unico caminho de entrada do dado
// novo, entao ciclo, aldeia e eixo tambem se administram por aqui - eram as
// abas de dominio (TA) da planilha.
//
// A REGRA QUE ESTA ROTA PROTEGE: os dois grupos Parakana nao se somam, porque tem
// CLPI e associacao separadas. Nenhuma resposta daqui traz total de projeto, e o
// painel agrega SEMPRE dentro de um ciclo, que pertence a um grupo so. O banco
// protege o mesmo por chave estrangeira composta (ver a migration).
//
// SEM DADO PESSOAL. As tabelas nao tem nome, CPF nem conta, e o gatilho
// carbon_prestacao_sem_dado_pessoal recusa e-mail, CPF e dado bancario em
// qualquer texto livre. Aqui isso vira mensagem legivel em vez de 500.
//
// O AGREGADO DO PAINEL E FEITO NO BANCO, e nao no navegador: um dos ciclos tem
// 1352 lancamentos, e mandar tudo para somar no cliente gastaria a rede de quem
// esta em campo para calcular o que o Postgres calcula de graca.

import { respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';
import {
  ErroRota,
  type ErroBanco,
  exigir,
  lancarErroEscrita,
  lerData,
  lerDecimalComSinal,
  lerNumero,
  lerTexto,
  lerUuid,
} from './helpers.ts';
import { podeEscrever } from './acesso.ts';
// O portao de projeto e de projetos.ts, que e o dono da visibilidade. Nao
// reimplemente aqui: duas copias divergem na primeira mudanca de regra.
import { grupoVisivel, lerProjetoVisivel, projetosVisiveis } from './projetos.ts';

const SALDO = [
  'ciclo_id', 'grupo_id', 'projeto_id', 'ciclo', 'status', 'saldo_abertura',
  'antecipado', 'declarado', 'declarado_com_comprovante',
  'declarado_sem_comprovante', 'saldo', 'lancamentos',
].join(', ');

const LIMITE_DESCRICAO = 500;

/**
 * Traduz a recusa do gatilho de dado pessoal para um codigo que a tela entende.
 *
 * Sem isto, digitar um CPF num campo de observacao devolveria 500 e a pessoa
 * veria "erro interno" - sem saber que o texto e que foi recusado, nem qual
 * campo. O gatilho levanta P0001 com a mensagem dizendo o campo.
 */
function lancarErroDePrestacao(erro: ErroBanco): never {
  const msg = String(erro?.message ?? '');
  if (erro?.code === 'P0001') {
    if (/e-mail|email/i.test(msg)) throw new ErroRota('texto_com_email', 400, 'descricao');
    if (/CPF/i.test(msg)) throw new ErroRota('texto_com_cpf', 400, 'descricao');
    if (/bancario/i.test(msg)) throw new ErroRota('texto_com_dado_bancario', 400, 'descricao');
    throw new ErroRota('texto_com_dado_pessoal', 400, 'descricao');
  }
  // 23503 e violacao de FK: no nosso caso, quase sempre aldeia de OUTRO grupo.
  if (erro?.code === '23503' && /aldeia/i.test(msg)) {
    throw new ErroRota('aldeia_de_outro_grupo', 400, 'aldeia_id');
  }
  lancarErroEscrita(erro, 'lancamento');
}

// ===== Portao de projeto =====================================================
//
// AS FUNCOES DAQUI RODAM COM service_role E IGNORAM RLS. Quem autoriza a leitura
// e a PARTICIPACAO em carbon_projeto_equipe, conferida aqui, dentro da funcao.
//
// ISTO FALTOU INTEIRO ATE 02/09/2026, e o furo era grave: nenhuma das cinco rotas
// de leitura (listarGrupos, catalogos, detalharCiclo, painelDoCiclo,
// listarComprovantes) conferia participacao. Como garantirUsuario cria o primeiro
// login do dominio como papel 'colaborador' com ativo = true, e o index.ts so
// barra `ativo !== true` e o papel nas rotas de escrita, bastava qualquer conta
// @apsis.com.br entrar uma vez: /prestacao/grupos devolvia os grupos com
// projeto_id e os ciclo_id, e com eles /ciclos/<id> devolvia os 1352 lancamentos
// com descricao, valor, documento e aldeia de um projeto de que a pessoa nao
// participa. E o MESMO furo que o cabecalho do index.ts registra como fechado em
// 22/08/2026, reaberto num dominio novo.
//
// O dado nao e so financeiro: os lancamentos carregam aldeia e eixo de uma
// comunidade indigena, e origem etnica e dado sensivel (LGPD Art. 5).
//
// lerProjetoVisivel devolve null tanto para "nao existe" quanto para "voce nao
// participa", e aqui os dois viram o MESMO 404 pelo mesmo caminho. Separar os
// dois casos transformaria a rota num oraculo de existencia de projeto.

/**
 * Confere que o ciclo existe, que a pessoa participa do projeto dele, e devolve o
 * grupo. O grupo NUNCA vem do corpo: aceita-lo seria deixar o cliente pendurar
 * despesa no grupo errado.
 *
 * `exigirAberto` existe porque leitura de ciclo fechado e legitima - a tela
 * gerencial mostra ciclo encerrado - e so a ESCRITA precisa recusar.
 */
async function grupoDoCiclo(
  ctx: Contexto,
  cicloId: string,
  { exigirAberto = true }: { exigirAberto?: boolean } = {},
): Promise<string> {
  const { data, error } = await ctx.admin
    .from('carbon_ciclos_prestacao')
    .select('id, grupo_id, status')
    .eq('id', cicloId)
    .maybeSingle();

  if (error) {
    console.error('prestacao: falha ao ler o ciclo', error);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) throw new ErroRota('ciclo_nao_encontrado', 404, 'ciclo_id');
  const c = data as { grupo_id: string; status: string };

  // O portao vem ANTES da regra de negocio: quem nao participa recebe 404 e nao
  // fica sabendo que o ciclo existe e esta fechado.
  await grupoVisivel(ctx, c.grupo_id);

  if (exigirAberto && c.status === 'fechado') {
    throw new ErroRota('ciclo_fechado', 409, 'ciclo_id');
  }
  return c.grupo_id;
}

/**
 * Portao para escrita que chega por id do REGISTRO, e nao do ciclo.
 *
 * PATCH e DELETE de lancamento, antecipacao e comprovante recebem o id da linha.
 * Sem resolver o dono, `podeEscrever` sozinho autorizava um gestor de qualquer
 * projeto a alterar e apagar lancamento do Parakana: o papel dizia "pode
 * escrever" e nada dizia "pode escrever AQUI".
 */
async function cicloDoRegistro(
  ctx: Contexto,
  tabela: 'carbon_prestacao_lancamentos' | 'carbon_antecipacoes' | 'carbon_comprovantes',
  id: string,
): Promise<string> {
  const { data, error } = await ctx.admin
    .from(tabela)
    .select('id, ciclo_id')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('prestacao: falha ao resolver o dono do registro', error);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) throw new ErroRota('nao_encontrado', 404, 'id');

  const cicloId = String((data as { ciclo_id: string }).ciclo_id);
  await grupoDoCiclo(ctx, cicloId);
  return cicloId;
}

function exigirEscrita(ctx: Contexto): void {
  if (!podeEscrever(ctx.registro)) throw new ErroRota('sem_permissao', 403);
}

// ===== Leitura ===============================================================

async function listarGrupos(ctx: Contexto): Promise<Response> {
  /* Esta e a porta de entrada da cadeia: e daqui que saem os ciclo_id que as
     outras rotas recebem. Filtrar aqui e o que impede a pessoa de descobrir o
     identificador de um ciclo que ela nao pode abrir. */
  const visiveis = await projetosVisiveis(ctx);
  if (visiveis && visiveis.length === 0) {
    return respostaJson({ grupos: [], pode_escrever: podeEscrever(ctx.registro) });
  }

  let consultaGrupos = ctx.admin
    .from('carbon_grupos_comunitarios')
    .select('id, projeto_id, chave, nome')
    .order('nome');
  if (visiveis) consultaGrupos = consultaGrupos.in('projeto_id', visiveis);

  const { data: grupos, error: erroG } = await consultaGrupos;
  if (erroG) {
    console.error('prestacao: falha ao ler grupos', erroG);
    throw new ErroRota('erro_interno', 500);
  }

  /* O saldo e filtrado pelos grupos que sobraram, e nao pelo projeto: a view nao
     tem projeto_id, e refazer o join aqui duplicaria a regra de visibilidade. */
  const idsGrupo = ((grupos ?? []) as { id: string }[]).map((g) => g.id);
  if (idsGrupo.length === 0) {
    return respostaJson({ grupos: [], pode_escrever: podeEscrever(ctx.registro) });
  }

  const { data: saldos, error: erroS } = await ctx.admin
    .from('carbon_prestacao_saldo')
    .select(SALDO)
    .in('grupo_id', idsGrupo);
  if (erroS) {
    console.error('prestacao: falha ao ler saldos', erroS);
    throw new ErroRota('erro_interno', 500);
  }

  /* O tipo do cliente do Supabase nao conhece a VIEW (o gerador so cobre
     tabelas), entao a conversao explicita fica isolada nestas duas linhas. */
  const linhasSaldo = (saldos ?? []) as unknown as Record<string, unknown>[];
  const listaGrupos = (grupos ?? []) as unknown as Record<string, unknown>[];

  const porGrupo = new Map<string, Record<string, unknown>[]>();
  for (const s of linhasSaldo) {
    const k = String(s.grupo_id ?? '');
    if (!porGrupo.has(k)) porGrupo.set(k, []);
    porGrupo.get(k)!.push(s);
  }

  return respostaJson({
    grupos: listaGrupos.map((g) => ({ ...g, ciclos: porGrupo.get(String(g.id ?? '')) ?? [] })),
    pode_escrever: podeEscrever(ctx.registro),
  });
}

/** Aldeias e eixos, para os selects dos formularios. */
async function catalogos(ctx: Contexto): Promise<Response> {
  /* Catalogo tambem vaza: o nome das aldeias de uma comunidade indigena e o
     recorte por eixo do projeto sao dado do projeto, e nao lista publica. */
  const visiveis = await projetosVisiveis(ctx);
  if (visiveis && visiveis.length === 0) {
    return respostaJson({ aldeias: [], eixos: [] });
  }

  let consultaAldeias = ctx.admin
    .from('carbon_aldeias')
    .select('id, grupo_id, nome, e_associacao, carbon_grupos_comunitarios!inner(projeto_id)')
    .eq('ativa', true)
    .order('nome');
  if (visiveis) {
    consultaAldeias = consultaAldeias.in('carbon_grupos_comunitarios.projeto_id', visiveis);
  }

  const { data: aldeias, error: erroA } = await consultaAldeias;
  if (erroA) {
    console.error('prestacao: falha ao ler aldeias', erroA);
    throw new ErroRota('erro_interno', 500);
  }

  let consultaEixos = ctx.admin
    .from('carbon_eixos')
    .select('id, projeto_id, nome, linha_estrategica, ordem')
    .order('ordem')
    .order('nome');
  if (visiveis) consultaEixos = consultaEixos.in('projeto_id', visiveis);

  const { data: eixos, error: erroE } = await consultaEixos;
  if (erroE) {
    console.error('prestacao: falha ao ler eixos', erroE);
    throw new ErroRota('erro_interno', 500);
  }

  /* Tira a coluna que so existe para o join filtrar, como semJuncao faz em
     projetos.ts: sem isto a tela recebe um carbon_grupos_comunitarios pendurado
     em cada aldeia e passa a poder depender dele sem querer. */
  const listaAldeias = ((aldeias ?? []) as unknown as Record<string, unknown>[]).map((a) => {
    const { carbon_grupos_comunitarios: _juncao, ...resto } = a;
    return resto;
  });

  return respostaJson({ aldeias: listaAldeias, eixos: eixos ?? [] });
}

async function detalharCiclo(ctx: Contexto): Promise<Response> {
  const id = ctx.params.id;
  // exigirAberto: false - ler ciclo fechado e legitimo, a tela gerencial mostra.
  await grupoDoCiclo(ctx, id, { exigirAberto: false });

  const { data: saldo, error: erroSaldo } = await ctx.admin
    .from('carbon_prestacao_saldo').select(SALDO).eq('ciclo_id', id).maybeSingle();
  if (erroSaldo) {
    console.error('prestacao: falha ao ler o saldo', erroSaldo);
    throw new ErroRota('erro_interno', 500);
  }
  if (!saldo) throw new ErroRota('ciclo_nao_encontrado', 404, 'id');

  const { data: antecipacoes, error: erroA } = await ctx.admin
    .from('carbon_antecipacoes')
    .select('id, competencia, valor, observacoes, origem_aba, origem_linha')
    .eq('ciclo_id', id).order('competencia');
  if (erroA) {
    console.error('prestacao: falha ao ler antecipacoes', erroA);
    throw new ErroRota('erro_interno', 500);
  }

  const { data: lancamentos, error: erroL } = await ctx.admin
    .from('carbon_prestacao_lancamentos')
    .select(
      'id, ciclo_id, aldeia_id, eixo_id, competencia, descricao, valor, quantidade,' +
      ' documento, tem_comprovante, observacoes, origem_aba, origem_linha,' +
      ' carbon_aldeias ( nome, e_associacao ), carbon_eixos ( nome, linha_estrategica )',
    )
    .eq('ciclo_id', id).order('competencia').order('origem_linha');
  if (erroL) {
    console.error('prestacao: falha ao ler lancamentos', erroL);
    throw new ErroRota('erro_interno', 500);
  }

  /* Achata o embed do PostgREST: a tela nao deveria precisar saber que aldeia
     veio por join. Foi assim que o envelope de projeto ja enganou alguem antes. */
  const linhas = ((lancamentos ?? []) as unknown as Record<string, unknown>[]).map((l) => {
    const { carbon_aldeias: bruta, carbon_eixos: bruto, ...resto } = l;
    const aldeia = bruta as { nome?: string; e_associacao?: boolean } | null;
    const eixo = bruto as { nome?: string; linha_estrategica?: string } | null;
    return {
      ...resto,
      aldeia: aldeia?.nome ?? null,
      aldeia_e_associacao: aldeia?.e_associacao ?? false,
      eixo: eixo?.nome ?? null,
      linha_estrategica: eixo?.linha_estrategica ?? null,
    };
  });

  return respostaJson({
    saldo,
    antecipacoes: antecipacoes ?? [],
    lancamentos: linhas,
    pode_escrever: podeEscrever(ctx.registro),
  });
}

/**
 * Agregados da visao gerencial, calculados no banco.
 *
 * Tres cortes, e cada um responde uma pergunta diferente que a operacao faz:
 *   por eixo        em que o recurso foi aplicado
 *   por aldeia      quem recebeu benefício, e quanto ficou na associacao
 *   por competencia como o gasto se distribuiu no tempo contra o repasse
 *
 * Cada um traz tambem a parcela SEM comprovante, que e onde a conversa comeca.
 */
async function painelDoCiclo(ctx: Contexto): Promise<Response> {
  const id = ctx.params.id;
  await grupoDoCiclo(ctx, id, { exigirAberto: false });

  const { data: saldo, error: erroSaldo } = await ctx.admin
    .from('carbon_prestacao_saldo').select(SALDO).eq('ciclo_id', id).maybeSingle();
  if (erroSaldo) {
    console.error('prestacao: falha ao ler o saldo do painel', erroSaldo);
    throw new ErroRota('erro_interno', 500);
  }
  if (!saldo) throw new ErroRota('ciclo_nao_encontrado', 404, 'id');

  /* Uma leitura so, agregada em memoria da funcao. Chamar o Postgres tres vezes
     custaria tres viagens; agrupar aqui custa uma passada por 1352 linhas, que
     e barato e roda perto do banco, e nao no celular de quem esta em campo. */
  const { data: cru, error } = await ctx.admin
    .from('carbon_prestacao_lancamentos')
    .select('competencia, valor, tem_comprovante, carbon_aldeias ( nome, e_associacao ), carbon_eixos ( nome )')
    .eq('ciclo_id', id);
  if (error) {
    console.error('prestacao: falha ao ler lancamentos do painel', error);
    throw new ErroRota('erro_interno', 500);
  }

  type Bucket = { chave: string; total: number; sem_comprovante: number; linhas: number };
  const soma = (mapa: Map<string, Bucket>, chave: string, valor: number, comprovado: boolean) => {
    if (!mapa.has(chave)) mapa.set(chave, { chave, total: 0, sem_comprovante: 0, linhas: 0 });
    const b = mapa.get(chave)!;
    b.total += Math.abs(valor);
    if (!comprovado) b.sem_comprovante += Math.abs(valor);
    b.linhas += 1;
  };

  const porEixo = new Map<string, Bucket>();
  const porAldeia = new Map<string, Bucket>();
  const porMes = new Map<string, Bucket>();

  for (const linha of (cru ?? []) as unknown as Record<string, unknown>[]) {
    const valor = Number(linha.valor ?? 0);
    const comprovado = linha.tem_comprovante === true;
    const aldeia = linha.carbon_aldeias as { nome?: string } | null;
    const eixo = linha.carbon_eixos as { nome?: string } | null;
    soma(porEixo, eixo?.nome ?? 'Sem eixo', valor, comprovado);
    soma(porAldeia, aldeia?.nome ?? 'Sem aldeia', valor, comprovado);
    soma(porMes, String(linha.competencia ?? '').slice(0, 7), valor, comprovado);
  }

  const ordenar = (m: Map<string, Bucket>) => [...m.values()].sort((a, b) => b.total - a.total);

  /* O outro lado da conciliacao: o que o extrato PROVA, mes a mes. A visao
     gerencial poe declarado e comprovado lado a lado - a distancia entre os
     dois e a conversa que a operacao precisa ter. */
  const { data: cps, error: erroC } = await ctx.admin
    .from('carbon_comprovantes')
    .select('data, valor')
    .eq('ciclo_id', id);
  if (erroC) {
    console.error('prestacao: falha ao ler comprovantes do painel', erroC);
    throw new ErroRota('erro_interno', 500);
  }
  const compPorMes = new Map<string, number>();
  let compSoma = 0;
  for (const c of (cps ?? []) as unknown as { data: string; valor: number }[]) {
    const mes = String(c.data ?? '').slice(0, 7);
    compPorMes.set(mes, (compPorMes.get(mes) ?? 0) + Number(c.valor ?? 0));
    compSoma += Number(c.valor ?? 0);
  }

  type Mes = Bucket & { comprovado: number };
  const meses: Mes[] = [...porMes.values()]
    .sort((a, b) => a.chave.localeCompare(b.chave))
    .map((b) => ({ ...b, comprovado: compPorMes.get(b.chave) ?? 0 }));
  // Mes que so tem comprovante (declaracao atrasada) tambem aparece.
  for (const [mes, valor] of compPorMes) {
    if (!porMes.has(mes)) {
      meses.push({ chave: mes, total: 0, sem_comprovante: 0, linhas: 0, comprovado: valor });
    }
  }
  meses.sort((a, b) => a.chave.localeCompare(b.chave));

  return respostaJson({
    saldo,
    por_eixo: ordenar(porEixo),
    por_aldeia: ordenar(porAldeia),
    // Tempo se le em ordem de tempo, e nao por tamanho.
    por_competencia: meses,
    comprovantes: { quantidade: (cps ?? []).length, soma: compSoma },
    pode_escrever: podeEscrever(ctx.registro),
  });
}

// ===== Escrita ===============================================================

/** Campos comuns de antecipacao, lidos do corpo. */
function lerAntecipacao(corpo: Record<string, unknown>, exigirTudo: boolean) {
  const saida: Record<string, unknown> = {};
  if (exigirTudo || corpo.competencia !== undefined) {
    exigir(corpo, ['competencia']);
    saida.competencia = lerData(corpo.competencia, 'competencia');
  }
  if (exigirTudo || corpo.valor !== undefined) {
    exigir(corpo, ['valor']);
    const v = lerNumero(corpo.valor, 'valor');
    if (v === null || v <= 0) throw new ErroRota('valor_invalido', 400, 'valor');
    saida.valor = v;
  }
  if (corpo.observacoes !== undefined) {
    saida.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_DESCRICAO);
  }
  return saida;
}

async function criarAntecipacao(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  const corpo = (ctx.corpo ?? {}) as Record<string, unknown>;
  exigir(corpo, ['ciclo_id']);
  const cicloId = lerUuid(corpo.ciclo_id, 'ciclo_id');
  await grupoDoCiclo(ctx, String(cicloId));

  const { data, error } = await ctx.admin
    .from('carbon_antecipacoes')
    .insert({ ciclo_id: cicloId, ...lerAntecipacao(corpo, true) })
    .select('id, competencia, valor, observacoes')
    .single();

  if (error) {
    const e = error as ErroBanco;
    // 23505: ja existe repasse naquela competencia. A tabela tem unique de
    // proposito - dois repasses no mesmo mes quase sempre e lancamento duplicado.
    if (e.code === '23505') throw new ErroRota('antecipacao_duplicada', 409, 'competencia');
    lancarErroEscrita(e, 'antecipacao');
  }
  return respostaJson({ antecipacao: data }, 201);
}

async function atualizarAntecipacao(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  await cicloDoRegistro(ctx, 'carbon_antecipacoes', ctx.params.id);
  const corpo = (ctx.corpo ?? {}) as Record<string, unknown>;
  const campos = lerAntecipacao(corpo, false);
  if (!Object.keys(campos).length) throw new ErroRota('nada_para_alterar', 400);

  const { data, error } = await ctx.admin
    .from('carbon_antecipacoes').update(campos).eq('id', ctx.params.id)
    .select('id, competencia, valor, observacoes').maybeSingle();

  if (error) {
    const e = error as ErroBanco;
    if (e.code === '23505') throw new ErroRota('antecipacao_duplicada', 409, 'competencia');
    lancarErroEscrita(e, 'antecipacao');
  }
  if (!data) throw new ErroRota('antecipacao_nao_encontrada', 404, 'id');
  return respostaJson({ antecipacao: data });
}

async function removerAntecipacao(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  await cicloDoRegistro(ctx, 'carbon_antecipacoes', ctx.params.id);
  const { error } = await ctx.admin
    .from('carbon_antecipacoes').delete().eq('id', ctx.params.id);
  if (error) lancarErroEscrita(error as ErroBanco, 'antecipacao');
  return respostaJson({ removido: true });
}

/** Campos comuns de lancamento. `grupo_id` NAO vem do corpo: sai do ciclo. */
function lerLancamento(corpo: Record<string, unknown>, exigirTudo: boolean) {
  const saida: Record<string, unknown> = {};
  if (exigirTudo || corpo.competencia !== undefined) {
    exigir(corpo, ['competencia']);
    saida.competencia = lerData(corpo.competencia, 'competencia');
  }
  if (exigirTudo || corpo.descricao !== undefined) {
    exigir(corpo, ['descricao']);
    saida.descricao = lerTexto(corpo.descricao, 'descricao', LIMITE_DESCRICAO);
  }
  if (exigirTudo || corpo.valor !== undefined) {
    /* Com sinal: negativo e despesa, positivo e estorno. A planilha ja usa esse
       sinal, e inverte-lo aqui obrigaria a lembrar disso em toda consulta.
       Zero e recusado pelo CHECK da tabela e aqui, para a mensagem ser melhor. */
    exigir(corpo, ['valor']);
    const v = lerDecimalComSinal(corpo.valor, { min: -1e11, max: 1e11 }, 'valor');
    if (v === null || v === 0) throw new ErroRota('valor_invalido', 400, 'valor');
    saida.valor = v;
  }
  if (corpo.aldeia_id !== undefined) saida.aldeia_id = lerUuid(corpo.aldeia_id, 'aldeia_id');
  if (corpo.eixo_id !== undefined) saida.eixo_id = lerUuid(corpo.eixo_id, 'eixo_id');
  if (corpo.quantidade !== undefined) saida.quantidade = lerNumero(corpo.quantidade, 'quantidade');
  if (corpo.documento !== undefined) saida.documento = lerTexto(corpo.documento, 'documento', 120);
  if (corpo.observacoes !== undefined) {
    saida.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_DESCRICAO);
  }
  if (corpo.tem_comprovante !== undefined) {
    const t = corpo.tem_comprovante;
    /* Tres estados, e a diferenca importa: true tem, false falta, null nao foi
       informado. Coagir null para false afirmaria que falta comprovante onde
       ninguem conferiu, e e justamente esse numero que a tela destaca. */
    saida.tem_comprovante = t === null || t === '' ? null : Boolean(t);
  }
  return saida;
}

const COLUNAS_LANC =
  'id, ciclo_id, aldeia_id, eixo_id, competencia, descricao, valor, quantidade,' +
  ' documento, tem_comprovante, observacoes';

async function criarLancamento(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  const corpo = (ctx.corpo ?? {}) as Record<string, unknown>;
  exigir(corpo, ['ciclo_id']);
  const cicloId = lerUuid(corpo.ciclo_id, 'ciclo_id');
  const grupoId = await grupoDoCiclo(ctx, String(cicloId));

  const { data, error } = await ctx.admin
    .from('carbon_prestacao_lancamentos')
    .insert({ ciclo_id: cicloId, grupo_id: grupoId, ...lerLancamento(corpo, true) })
    .select(COLUNAS_LANC).single();

  if (error) lancarErroDePrestacao(error as ErroBanco);
  return respostaJson({ lancamento: data }, 201);
}

async function atualizarLancamento(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  await cicloDoRegistro(ctx, 'carbon_prestacao_lancamentos', ctx.params.id);
  const corpo = (ctx.corpo ?? {}) as Record<string, unknown>;
  const campos = lerLancamento(corpo, false);
  if (!Object.keys(campos).length) throw new ErroRota('nada_para_alterar', 400);

  const { data, error } = await ctx.admin
    .from('carbon_prestacao_lancamentos').update(campos).eq('id', ctx.params.id)
    .select(COLUNAS_LANC).maybeSingle();

  if (error) lancarErroDePrestacao(error as ErroBanco);
  if (!data) throw new ErroRota('lancamento_nao_encontrado', 404, 'id');
  return respostaJson({ lancamento: data });
}

async function removerLancamento(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  await cicloDoRegistro(ctx, 'carbon_prestacao_lancamentos', ctx.params.id);
  const { error } = await ctx.admin
    .from('carbon_prestacao_lancamentos').delete().eq('id', ctx.params.id);
  if (error) lancarErroEscrita(error as ErroBanco, 'lancamento');
  return respostaJson({ removido: true });
}

// ===== Comprovantes ==========================================================

const COLUNAS_COMP =
  'id, ciclo_id, aldeia_id, ordem_no_mes, data, valor, instituicao_recebedor,' +
  ' instituicao_pagador, observacoes, origem_aba, origem_linha';

/** Lista paginada: um dos ciclos tem 1075 comprovantes e a tela nao precisa de
    todos de uma vez. `limite` maximo de 200 para ninguem pedir a base inteira. */
async function listarComprovantes(ctx: Contexto): Promise<Response> {
  await grupoDoCiclo(ctx, ctx.params.id, { exigirAberto: false });
  const pagina = Math.max(1, Number(ctx.url.searchParams.get('pagina') ?? '1') || 1);
  const limite = Math.min(200, Math.max(1, Number(ctx.url.searchParams.get('limite') ?? '50') || 50));
  const de = (pagina - 1) * limite;

  const { data, error, count } = await ctx.admin
    .from('carbon_comprovantes')
    .select(COLUNAS_COMP + ', carbon_aldeias ( nome, e_associacao )', { count: 'exact' })
    .eq('ciclo_id', ctx.params.id)
    .order('data')
    .order('ordem_no_mes')
    .range(de, de + limite - 1);
  if (error) {
    console.error('prestacao: falha ao listar comprovantes', error);
    throw new ErroRota('erro_interno', 500);
  }

  const linhas = ((data ?? []) as unknown as Record<string, unknown>[]).map((c) => {
    const { carbon_aldeias: bruta, ...resto } = c;
    const aldeia = bruta as { nome?: string; e_associacao?: boolean } | null;
    return { ...resto, aldeia: aldeia?.nome ?? null, aldeia_e_associacao: aldeia?.e_associacao ?? false };
  });

  return respostaJson({
    comprovantes: linhas,
    total: count ?? linhas.length,
    pagina,
    limite,
    pode_escrever: podeEscrever(ctx.registro),
  });
}

function lerComprovante(corpo: Record<string, unknown>, exigirTudo: boolean) {
  const saida: Record<string, unknown> = {};
  if (exigirTudo || corpo.data !== undefined) {
    exigir(corpo, ['data']);
    saida.data = lerData(corpo.data, 'data');
  }
  if (exigirTudo || corpo.valor !== undefined) {
    exigir(corpo, ['valor']);
    const v = lerNumero(corpo.valor, 'valor');
    if (v === null || v <= 0) throw new ErroRota('valor_invalido', 400, 'valor');
    saida.valor = v;
  }
  if (corpo.ordem_no_mes !== undefined) {
    const n = corpo.ordem_no_mes === null || corpo.ordem_no_mes === ''
      ? null
      : lerNumero(corpo.ordem_no_mes, 'ordem_no_mes');
    if (n !== null && !Number.isInteger(n)) throw new ErroRota('campo_invalido', 400, 'ordem_no_mes');
    saida.ordem_no_mes = n;
  }
  if (corpo.aldeia_id !== undefined) saida.aldeia_id = lerUuid(corpo.aldeia_id, 'aldeia_id');
  if (corpo.instituicao_recebedor !== undefined) {
    saida.instituicao_recebedor = lerTexto(corpo.instituicao_recebedor, 'instituicao_recebedor', 120);
  }
  if (corpo.instituicao_pagador !== undefined) {
    saida.instituicao_pagador = lerTexto(corpo.instituicao_pagador, 'instituicao_pagador', 120);
  }
  if (corpo.observacoes !== undefined) {
    saida.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_DESCRICAO);
  }
  return saida;
}

async function criarComprovante(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  const corpo = (ctx.corpo ?? {}) as Record<string, unknown>;
  exigir(corpo, ['ciclo_id']);
  const cicloId = lerUuid(corpo.ciclo_id, 'ciclo_id');
  const grupoId = await grupoDoCiclo(ctx, String(cicloId));

  const { data, error } = await ctx.admin
    .from('carbon_comprovantes')
    .insert({ ciclo_id: cicloId, grupo_id: grupoId, ...lerComprovante(corpo, true) })
    .select(COLUNAS_COMP).single();
  if (error) lancarErroDePrestacao(error as ErroBanco);
  return respostaJson({ comprovante: data }, 201);
}

async function atualizarComprovante(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  await cicloDoRegistro(ctx, 'carbon_comprovantes', ctx.params.id);
  const campos = lerComprovante((ctx.corpo ?? {}) as Record<string, unknown>, false);
  if (!Object.keys(campos).length) throw new ErroRota('nada_para_alterar', 400);
  const { data, error } = await ctx.admin
    .from('carbon_comprovantes').update(campos).eq('id', ctx.params.id)
    .select(COLUNAS_COMP).maybeSingle();
  if (error) lancarErroDePrestacao(error as ErroBanco);
  if (!data) throw new ErroRota('comprovante_nao_encontrado', 404, 'id');
  return respostaJson({ comprovante: data });
}

async function removerComprovante(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  await cicloDoRegistro(ctx, 'carbon_comprovantes', ctx.params.id);
  const { error } = await ctx.admin
    .from('carbon_comprovantes').delete().eq('id', ctx.params.id);
  if (error) lancarErroEscrita(error as ErroBanco, 'comprovante');
  return respostaJson({ removido: true });
}

// ===== Ciclos, aldeias e eixos (as antigas abas de dominio do Excel) =========

function lerCiclo(corpo: Record<string, unknown>, exigirTudo: boolean) {
  const saida: Record<string, unknown> = {};
  if (exigirTudo || corpo.nome !== undefined) {
    exigir(corpo, ['nome']);
    saida.nome = lerTexto(corpo.nome, 'nome', 120);
  }
  if (exigirTudo || corpo.inicio !== undefined) {
    exigir(corpo, ['inicio']);
    saida.inicio = lerData(corpo.inicio, 'inicio');
  }
  if (corpo.fim !== undefined) {
    saida.fim = corpo.fim === null || corpo.fim === '' ? null : lerData(corpo.fim, 'fim');
  }
  if (corpo.saldo_abertura !== undefined) {
    saida.saldo_abertura = corpo.saldo_abertura === null || corpo.saldo_abertura === ''
      ? null
      : lerDecimalComSinal(corpo.saldo_abertura, { min: -1e11, max: 1e11 }, 'saldo_abertura');
  }
  if (corpo.status !== undefined) {
    const s = String(corpo.status ?? '');
    if (!['aberto', 'em_conciliacao', 'fechado'].includes(s)) {
      throw new ErroRota('status_invalido', 400, 'status');
    }
    saida.status = s;
  }
  if (corpo.observacoes !== undefined) {
    saida.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_DESCRICAO);
  }
  return saida;
}

async function criarCiclo(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  const corpo = (ctx.corpo ?? {}) as Record<string, unknown>;
  exigir(corpo, ['grupo_id']);
  const grupoId = lerUuid(corpo.grupo_id, 'grupo_id');

  /* grupoVisivel no lugar da leitura crua que estava aqui: `grupo_id` vem do
     CORPO, e sem o portao bastava mandar o id do grupo do Parakana para abrir
     ciclo no projeto de outra equipe. O papel dizia "pode escrever" e nada
     dizia "pode escrever AQUI". */
  const grupo = await grupoVisivel(ctx, grupoId);

  const { data, error } = await ctx.admin
    .from('carbon_ciclos_prestacao')
    .insert({
      grupo_id: grupoId,
      projeto_id: grupo.projeto_id,
      ...lerCiclo(corpo, true),
    })
    .select('id, nome, inicio, fim, saldo_abertura, status').single();
  if (error) {
    const e = error as ErroBanco;
    if (e.code === '23505') throw new ErroRota('ciclo_duplicado', 409, 'nome');
    lancarErroEscrita(e, 'ciclo');
  }
  return respostaJson({ ciclo: data }, 201);
}

async function atualizarCiclo(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  /* exigirAberto: false de proposito. Mudar o status e como se FECHA o ciclo, e
     tambem como se reabre para corrigir; recusar ciclo fechado aqui deixaria o
     ciclo sem volta. Quem barra a alteracao dos LANCAMENTOS de um ciclo fechado
     e grupoDoCiclo nas rotas de lancamento, que usa o padrao exigirAberto. */
  await grupoDoCiclo(ctx, ctx.params.id, { exigirAberto: false });
  const campos = lerCiclo((ctx.corpo ?? {}) as Record<string, unknown>, false);
  if (!Object.keys(campos).length) throw new ErroRota('nada_para_alterar', 400);
  const { data, error } = await ctx.admin
    .from('carbon_ciclos_prestacao').update(campos).eq('id', ctx.params.id)
    .select('id, nome, inicio, fim, saldo_abertura, status').maybeSingle();
  if (error) {
    const e = error as ErroBanco;
    if (e.code === '23505') throw new ErroRota('ciclo_duplicado', 409, 'nome');
    lancarErroEscrita(e, 'ciclo');
  }
  if (!data) throw new ErroRota('ciclo_nao_encontrado', 404, 'id');
  return respostaJson({ ciclo: data });
}

async function criarAldeia(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  const corpo = (ctx.corpo ?? {}) as Record<string, unknown>;
  exigir(corpo, ['grupo_id', 'nome']);
  const grupoAldeia = await grupoVisivel(ctx, lerUuid(corpo.grupo_id, 'grupo_id'));
  const { data, error } = await ctx.admin
    .from('carbon_aldeias')
    .insert({
      grupo_id: grupoAldeia.id,
      nome: lerTexto(corpo.nome, 'nome', 120),
      e_associacao: corpo.e_associacao === true,
    })
    .select('id, grupo_id, nome, e_associacao, ativa').single();
  if (error) {
    const e = error as ErroBanco;
    if (e.code === '23505') throw new ErroRota('aldeia_duplicada', 409, 'nome');
    lancarErroEscrita(e, 'aldeia');
  }
  return respostaJson({ aldeia: data }, 201);
}

async function atualizarAldeia(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);

  /* Resolve a aldeia para conferir o grupo dela. Sem isto, o id na URL bastava
     para renomear ou desativar aldeia de comunidade de outro projeto. */
  const { data: atual, error: erroAtual } = await ctx.admin
    .from('carbon_aldeias').select('id, grupo_id').eq('id', ctx.params.id).maybeSingle();
  if (erroAtual) {
    console.error('prestacao: falha ao ler a aldeia', erroAtual);
    throw new ErroRota('erro_interno', 500);
  }
  if (!atual) throw new ErroRota('aldeia_nao_encontrada', 404, 'id');
  await grupoVisivel(ctx, String((atual as { grupo_id: string }).grupo_id));

  const corpo = (ctx.corpo ?? {}) as Record<string, unknown>;
  const campos: Record<string, unknown> = {};
  if (corpo.nome !== undefined) campos.nome = lerTexto(corpo.nome, 'nome', 120);
  if (corpo.e_associacao !== undefined) campos.e_associacao = corpo.e_associacao === true;
  /* Desativar em vez de apagar: aldeia com lancamento historico nao pode sumir,
     so sair dos formularios novos. */
  if (corpo.ativa !== undefined) campos.ativa = corpo.ativa !== false;
  if (!Object.keys(campos).length) throw new ErroRota('nada_para_alterar', 400);
  const { data, error } = await ctx.admin
    .from('carbon_aldeias').update(campos).eq('id', ctx.params.id)
    .select('id, grupo_id, nome, e_associacao, ativa').maybeSingle();
  if (error) {
    const e = error as ErroBanco;
    if (e.code === '23505') throw new ErroRota('aldeia_duplicada', 409, 'nome');
    lancarErroEscrita(e, 'aldeia');
  }
  if (!data) throw new ErroRota('aldeia_nao_encontrada', 404, 'id');
  return respostaJson({ aldeia: data });
}

async function criarEixo(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);
  const corpo = (ctx.corpo ?? {}) as Record<string, unknown>;
  exigir(corpo, ['nome', 'grupo_id']);

  /* O eixo e do PROJETO (dicionario unico para os dois grupos, decisao da issue
     de eixos), e o projeto sai do grupo informado.

     ANTES ESTAVA `.limit(1).maybeSingle()` SEM ORDEM E SEM FILTRO: pegava um
     grupo qualquer da tabela e usava o projeto_id dele. Funcionava por acidente
     enquanto so existia o Parakana; com o segundo projeto cadastrado, o eixo
     novo cairia num projeto sorteado pelo planejador do Postgres. Alem disso nao
     havia portao nenhum. Agora `grupo_id` e obrigatorio e passa por grupoVisivel. */
  const grupoEixo = await grupoVisivel(ctx, lerUuid(corpo.grupo_id, 'grupo_id'));

  const { data, error } = await ctx.admin
    .from('carbon_eixos')
    .insert({
      projeto_id: grupoEixo.projeto_id,
      nome: lerTexto(corpo.nome, 'nome', 120),
      linha_estrategica: corpo.linha_estrategica === undefined || corpo.linha_estrategica === null
        ? null
        : lerTexto(corpo.linha_estrategica, 'linha_estrategica', 120),
    })
    .select('id, nome, linha_estrategica, ordem').single();
  if (error) {
    const e = error as ErroBanco;
    if (e.code === '23505') throw new ErroRota('eixo_duplicado', 409, 'nome');
    lancarErroEscrita(e, 'eixo');
  }
  return respostaJson({ eixo: data }, 201);
}

async function atualizarEixo(ctx: Contexto): Promise<Response> {
  exigirEscrita(ctx);

  /* O eixo guarda projeto_id direto, entao aqui o portao e lerProjetoVisivel
     sem passar por grupo. */
  const { data: eixoAtual, error: erroEixo } = await ctx.admin
    .from('carbon_eixos').select('id, projeto_id').eq('id', ctx.params.id).maybeSingle();
  if (erroEixo) {
    console.error('prestacao: falha ao ler o eixo', erroEixo);
    throw new ErroRota('erro_interno', 500);
  }
  if (!eixoAtual) throw new ErroRota('eixo_nao_encontrado', 404, 'id');
  if (!(await lerProjetoVisivel(ctx, String((eixoAtual as { projeto_id: string }).projeto_id)))) {
    throw new ErroRota('eixo_nao_encontrado', 404, 'id');
  }

  const corpo = (ctx.corpo ?? {}) as Record<string, unknown>;
  const campos: Record<string, unknown> = {};
  if (corpo.nome !== undefined) campos.nome = lerTexto(corpo.nome, 'nome', 120);
  if (corpo.linha_estrategica !== undefined) {
    campos.linha_estrategica = corpo.linha_estrategica === null || corpo.linha_estrategica === ''
      ? null
      : lerTexto(corpo.linha_estrategica, 'linha_estrategica', 120);
  }
  if (!Object.keys(campos).length) throw new ErroRota('nada_para_alterar', 400);
  const { data, error } = await ctx.admin
    .from('carbon_eixos').update(campos).eq('id', ctx.params.id)
    .select('id, nome, linha_estrategica, ordem').maybeSingle();
  if (error) {
    const e = error as ErroBanco;
    if (e.code === '23505') throw new ErroRota('eixo_duplicado', 409, 'nome');
    lancarErroEscrita(e, 'eixo');
  }
  if (!data) throw new ErroRota('eixo_nao_encontrado', 404, 'id');
  return respostaJson({ eixo: data });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'prestacao/grupos', escrita: false, handler: listarGrupos },
  { metodo: 'GET', padrao: 'prestacao/catalogos', escrita: false, handler: catalogos },
  { metodo: 'GET', padrao: 'prestacao/ciclos/:id', escrita: false, handler: detalharCiclo },
  { metodo: 'GET', padrao: 'prestacao/ciclos/:id/painel', escrita: false, handler: painelDoCiclo },
  { metodo: 'POST', padrao: 'prestacao/antecipacoes', escrita: true, handler: criarAntecipacao },
  { metodo: 'PATCH', padrao: 'prestacao/antecipacoes/:id', escrita: true, handler: atualizarAntecipacao },
  { metodo: 'DELETE', padrao: 'prestacao/antecipacoes/:id', escrita: true, handler: removerAntecipacao },
  { metodo: 'POST', padrao: 'prestacao/lancamentos', escrita: true, handler: criarLancamento },
  { metodo: 'PATCH', padrao: 'prestacao/lancamentos/:id', escrita: true, handler: atualizarLancamento },
  { metodo: 'DELETE', padrao: 'prestacao/lancamentos/:id', escrita: true, handler: removerLancamento },
  { metodo: 'GET', padrao: 'prestacao/ciclos/:id/comprovantes', escrita: false, handler: listarComprovantes },
  { metodo: 'POST', padrao: 'prestacao/comprovantes', escrita: true, handler: criarComprovante },
  { metodo: 'PATCH', padrao: 'prestacao/comprovantes/:id', escrita: true, handler: atualizarComprovante },
  { metodo: 'DELETE', padrao: 'prestacao/comprovantes/:id', escrita: true, handler: removerComprovante },
  { metodo: 'POST', padrao: 'prestacao/ciclos', escrita: true, handler: criarCiclo },
  { metodo: 'PATCH', padrao: 'prestacao/ciclos/:id', escrita: true, handler: atualizarCiclo },
  { metodo: 'POST', padrao: 'prestacao/aldeias', escrita: true, handler: criarAldeia },
  { metodo: 'PATCH', padrao: 'prestacao/aldeias/:id', escrita: true, handler: atualizarAldeia },
  { metodo: 'POST', padrao: 'prestacao/eixos', escrita: true, handler: criarEixo },
  { metodo: 'PATCH', padrao: 'prestacao/eixos/:id', escrita: true, handler: atualizarEixo },
];

export default rotas;

// -----------------------------------------------------------------------------
// Rotas acessos - cargos e quem tem cada um.
// -----------------------------------------------------------------------------
//   GET    acessos/areas              catalogo de areas do sistema
//   GET    acessos/cargos             cargos, com areas e quantas pessoas
//   POST   acessos/cargos             cria cargo
//   PATCH  acessos/cargos/:id         nome, descricao, ativo e o conjunto de areas
//   DELETE acessos/cargos/:id         apaga cargo (quem tinha fica sem cargo)
//   GET    acessos/pessoas            colaboradores, com o cargo de cada um
//   PATCH  acessos/pessoas/:id        troca o cargo e liga/desliga a pessoa
//
// QUEM CHEGA AQUI ja passou pelo portao de area do index.ts com area `acessos`.
// Nao ha checagem de papel dentro dos handlers, de proposito: o portao e um so,
// e uma segunda regra aqui seria a segunda fonte de verdade que este repositorio
// evita em todo lugar.
//
// -----------------------------------------------------------------------------
// VER E EDITAR SAO A MESMA PERMISSAO
// -----------------------------------------------------------------------------
// Decisao do dono. Se a area esta no cargo, a pessoa le e escreve nela. Nao
// existe nivel intermediario, e por isso nao existe coluna de nivel: um booleano
// implicito (a linha em carbon_cargo_areas existe ou nao) e o modelo inteiro.
// Recorte diferente = CARGO diferente.
//
// -----------------------------------------------------------------------------
// A TRAVA DE NAO SE TRANCAR FORA vive em DOIS lugares, e os dois sao necessarios
// -----------------------------------------------------------------------------
// No BANCO, um constraint trigger recusa deixar o sistema sem ninguem ativo com
// a area `acessos` por caminho de cargo (tirar a area, desativar, apagar).
// AQUI, a mesma pergunta e feita antes de trocar o cargo de uma PESSOA - caminho
// que o trigger nao cobre de proposito, porque no dia do deploy ninguem tem
// cargo e a contagem seria zero, o que faria todo UPDATE em usuario falhar,
// inclusive o upsert do login.
//
// A mensagem de recusa e a mesma nos dois: quem opera a tela nao precisa saber
// qual camada barrou.

import { respostaJson } from '../../_shared/cors.ts';
import { ErroRota, exigir, lerTexto, listaBranca } from './helpers.ts';
import type { Contexto, Rota } from './tipos.ts';

/** Area que administra acessos. Perder a ultima pessoa com ela tranca o sistema. */
const AREA_ACESSOS = 'acessos';

/* ===== Leitura ============================================================= */

async function listarAreas(ctx: Contexto): Promise<Response> {
  const { data, error } = await ctx.admin
    .from('carbon_areas')
    .select('chave, label, descricao, sempre_liberada, ordem')
    .order('ordem');

  if (error) {
    console.error('Falha ao listar areas:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return respostaJson({ areas: data ?? [] });
}

async function listarCargos(ctx: Contexto): Promise<Response> {
  const { data, error } = await ctx.admin
    .from('carbon_cargos')
    .select('id, nome, descricao, ativo, criado_em, carbon_cargo_areas(area)')
    .order('nome');

  if (error) {
    console.error('Falha ao listar cargos:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  /*
   * A contagem de pessoas vem em UMA consulta separada, e nao num count
   * embutido: o embed do PostgREST devolveria a contagem por cargo apenas com
   * uma relacao declarada de volta, e a coluna carbon_usuarios.cargo_id nao tem
   * a foreign key nomeada que o embed espera em todos os ambientes. Uma consulta
   * a mais e barata numa tela de administracao.
   */
  const { data: pessoas, error: erroPessoas } = await ctx.admin
    .from('carbon_usuarios')
    .select('cargo_id')
    .not('cargo_id', 'is', null)
    .eq('ativo', true);

  if (erroPessoas) {
    console.error('Falha ao contar pessoas por cargo:', erroPessoas.message);
    throw new ErroRota('erro_interno', 500);
  }

  const porCargo = new Map<string, number>();
  for (const p of pessoas ?? []) {
    const id = String((p as Record<string, unknown>).cargo_id);
    porCargo.set(id, (porCargo.get(id) ?? 0) + 1);
  }

  const cargos = (data ?? []).map((c) => {
    const linha = c as Record<string, unknown>;
    const areas = ((linha.carbon_cargo_areas ?? []) as { area: string }[]).map((a) => a.area);
    delete linha.carbon_cargo_areas;
    return { ...linha, areas, pessoas: porCargo.get(String(linha.id)) ?? 0 };
  });

  return respostaJson({ cargos });
}

async function listarPessoas(ctx: Contexto): Promise<Response> {
  /*
   * Traz TODO colaborador, inclusive inativo. Uma tela de gestao de acesso que
   * esconde quem foi desativado nao deixa reativar ninguem, e obriga alguem a ir
   * ao banco - que e exatamente o que esta tela existe para evitar.
   *
   * O e-mail vai inteiro porque e ele que identifica a pessoa aqui, e e dado
   * funcional corporativo (ver o comentario de carbon_usuarios: LGPD permite
   * e-mail corporativo e dado funcional, nunca CPF nem dado sensivel).
   */
  const { data, error } = await ctx.admin
    .from('carbon_usuarios')
    .select('id, email, nome, papel, ativo, cargo_id')
    .order('nome', { nullsFirst: false })
    .order('email');

  if (error) {
    console.error('Falha ao listar pessoas:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  return respostaJson({ pessoas: data ?? [] });
}

/* ===== Escrita ============================================================= */

/** Areas validas, do catalogo. Recusa area inventada antes de tocar no banco. */
async function areasValidas(ctx: Contexto, pedidas: unknown): Promise<string[]> {
  if (!Array.isArray(pedidas)) throw new ErroRota('campo_invalido', 400, 'areas');

  const limpas = [...new Set(pedidas.map((a) => String(a ?? '').trim()).filter(Boolean))];

  const { data, error } = await ctx.admin.from('carbon_areas').select('chave');
  if (error) {
    console.error('Falha ao conferir areas:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  const catalogo = new Set((data ?? []).map((a) => String((a as { chave: string }).chave)));

  const desconhecida = limpas.find((a) => !catalogo.has(a));
  if (desconhecida) throw new ErroRota('area_desconhecida', 400, 'areas');

  return limpas;
}

async function criarCargo(ctx: Contexto): Promise<Response> {
  const corpo = listaBranca(ctx.corpo, ['nome', 'descricao', 'areas']);
  exigir(corpo, ['nome']);

  const nome = lerTexto(corpo.nome, 'nome', 120)!;
  const descricao = lerTexto(corpo.descricao, 'descricao', 400);
  const areas = await areasValidas(ctx, corpo.areas ?? []);

  const { data, error } = await ctx.admin
    .from('carbon_cargos')
    .insert({ nome, descricao, criado_por: ctx.registro.id })
    .select('id')
    .single();

  if (error) {
    // 23505 = unique_violation, do indice que normaliza caixa e acento.
    if (error.code === '23505') throw new ErroRota('cargo_duplicado', 409, 'nome');
    console.error('Falha ao criar cargo:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const id = (data as { id: string }).id;

  if (areas.length) {
    const { error: erroAreas } = await ctx.admin
      .from('carbon_cargo_areas')
      .insert(areas.map((area) => ({ cargo_id: id, area })));

    if (erroAreas) {
      /*
       * Desfaz o cargo. Nao ha transacao entre duas chamadas do PostgREST, e um
       * cargo gravado sem area nenhuma apareceria na tela como um cargo que
       * "nao da acesso a nada" - um estado que ninguem pediu e que a pessoa
       * tentaria consertar editando, sem entender o que houve.
       */
      await ctx.admin.from('carbon_cargos').delete().eq('id', id);
      console.error('Falha ao gravar areas do cargo:', erroAreas.message);
      throw new ErroRota('erro_interno', 500);
    }
  }

  return respostaJson({ cargo: { id, nome, descricao, ativo: true, areas, pessoas: 0 } }, 201);
}

async function atualizarCargo(ctx: Contexto): Promise<Response> {
  const corpo = listaBranca(ctx.corpo, ['nome', 'descricao', 'ativo', 'areas']);
  const id = ctx.params.id;

  const mudancas: Record<string, unknown> = {};
  if (corpo.nome !== undefined) mudancas.nome = lerTexto(corpo.nome, 'nome', 120);
  if (corpo.descricao !== undefined) {
    mudancas.descricao = lerTexto(corpo.descricao, 'descricao', 400);
  }
  if (corpo.ativo !== undefined) {
    if (typeof corpo.ativo !== 'boolean') throw new ErroRota('campo_invalido', 400, 'ativo');
    mudancas.ativo = corpo.ativo;
  }

  const trocaAreas = corpo.areas !== undefined;
  const areas = trocaAreas ? await areasValidas(ctx, corpo.areas) : [];

  if (!Object.keys(mudancas).length && !trocaAreas) {
    throw new ErroRota('nada_para_atualizar', 400);
  }

  if (Object.keys(mudancas).length) {
    const { error } = await ctx.admin.from('carbon_cargos').update(mudancas).eq('id', id);
    if (error) {
      if (error.code === '23505') throw new ErroRota('cargo_duplicado', 409, 'nome');
      if (error.code === 'P0001') throw new ErroRota('sem_administrador_de_acesso', 409);
      console.error('Falha ao atualizar cargo:', error.message);
      throw new ErroRota('erro_interno', 500);
    }
  }

  if (trocaAreas) {
    /*
     * TROCA O CONJUNTO INTEIRO: apaga e insere. A tela manda o estado final, e
     * nao um diff, porque diff calculado no cliente e a origem classica de
     * permissao fantasma - a tela acha que tirou, o servidor nao recebeu, e
     * ninguem percebe ate alguem abrir uma tela que nao deveria.
     *
     * O constraint trigger do banco e DEFERRABLE justamente para isto: ele
     * confere no fim da transacao, e nao no meio, entao o estado transitorio
     * "sem nenhuma area" nao dispara a trava.
     */
    const { error: erroDel } = await ctx.admin
      .from('carbon_cargo_areas')
      .delete()
      .eq('cargo_id', id);

    if (erroDel) {
      if (erroDel.code === 'P0001') throw new ErroRota('sem_administrador_de_acesso', 409);
      console.error('Falha ao limpar areas do cargo:', erroDel.message);
      throw new ErroRota('erro_interno', 500);
    }

    if (areas.length) {
      const { error: erroIns } = await ctx.admin
        .from('carbon_cargo_areas')
        .insert(areas.map((area) => ({ cargo_id: id, area })));

      if (erroIns) {
        if (erroIns.code === 'P0001') throw new ErroRota('sem_administrador_de_acesso', 409);
        console.error('Falha ao gravar areas do cargo:', erroIns.message);
        throw new ErroRota('erro_interno', 500);
      }
    }
  }

  return respostaJson({ ok: true });
}

async function apagarCargo(ctx: Contexto): Promise<Response> {
  const { error } = await ctx.admin.from('carbon_cargos').delete().eq('id', ctx.params.id);

  if (error) {
    if (error.code === 'P0001') throw new ErroRota('sem_administrador_de_acesso', 409);
    console.error('Falha ao apagar cargo:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  // Quem tinha o cargo fica com cargo_id nulo (ON DELETE SET NULL) e volta a
  // regra antiga do papel. Nao e silencioso: a tela mostra "sem cargo".
  return respostaJson({ ok: true });
}

/**
 * Confere se a mudanca deixaria o sistema sem ninguem que administre acessos.
 *
 * Roda ANTES do update, e nao depois: desfazer um update de permissao exige uma
 * segunda escrita que pode falhar, e o intervalo entre as duas e exatamente a
 * janela em que ninguem administra nada.
 *
 * O caminho de PESSOA nao e coberto pelo trigger do banco de proposito (ver o
 * cabecalho deste arquivo), entao a checagem tem de existir aqui.
 */
async function garantirQueSobraAdministrador(
  ctx: Contexto,
  pessoaId: string,
  cargoNovo: string | null | undefined,
  ativoNovo: boolean | undefined,
): Promise<void> {
  const { data: cargosComAcesso, error } = await ctx.admin
    .from('carbon_cargo_areas')
    .select('cargo_id, carbon_cargos!inner(ativo)')
    .eq('area', AREA_ACESSOS)
    .eq('carbon_cargos.ativo', true);

  if (error) {
    console.error('Falha ao conferir administradores de acesso:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const idsComAcesso = new Set(
    (cargosComAcesso ?? []).map((c) => String((c as Record<string, unknown>).cargo_id)),
  );
  if (idsComAcesso.size === 0) return; // ninguem administra por cargo ainda: a ponte do papel vale

  const { data: pessoas, error: erroPessoas } = await ctx.admin
    .from('carbon_usuarios')
    .select('id, cargo_id, ativo');

  if (erroPessoas) {
    console.error('Falha ao listar pessoas para a trava:', erroPessoas.message);
    throw new ErroRota('erro_interno', 500);
  }

  const sobra = (pessoas ?? []).some((p) => {
    const linha = p as { id: string; cargo_id: string | null; ativo: boolean };
    const ehAlvo = linha.id === pessoaId;
    const cargo = ehAlvo && cargoNovo !== undefined ? cargoNovo : linha.cargo_id;
    const ativo = ehAlvo && ativoNovo !== undefined ? ativoNovo : linha.ativo;
    return ativo && cargo && idsComAcesso.has(String(cargo));
  });

  if (!sobra) throw new ErroRota('sem_administrador_de_acesso', 409);
}

async function atualizarPessoa(ctx: Contexto): Promise<Response> {
  const corpo = listaBranca(ctx.corpo, ['cargo_id', 'ativo']);
  const id = ctx.params.id;

  const mudancas: Record<string, unknown> = {};

  if (corpo.cargo_id !== undefined) {
    // null e valor legitimo: significa "tirar o cargo".
    if (corpo.cargo_id === null || corpo.cargo_id === '') {
      mudancas.cargo_id = null;
    } else {
      const cargoId = String(corpo.cargo_id);
      const { data, error } = await ctx.admin
        .from('carbon_cargos')
        .select('id')
        .eq('id', cargoId)
        .maybeSingle();

      if (error) {
        console.error('Falha ao conferir cargo:', error.message);
        throw new ErroRota('erro_interno', 500);
      }
      if (!data) throw new ErroRota('referencia_invalida', 400, 'cargo_id');
      mudancas.cargo_id = cargoId;
    }
  }

  if (corpo.ativo !== undefined) {
    if (typeof corpo.ativo !== 'boolean') throw new ErroRota('campo_invalido', 400, 'ativo');
    mudancas.ativo = corpo.ativo;
  }

  if (!Object.keys(mudancas).length) throw new ErroRota('nada_para_atualizar', 400);

  await garantirQueSobraAdministrador(
    ctx,
    id,
    mudancas.cargo_id as string | null | undefined,
    mudancas.ativo as boolean | undefined,
  );

  const { error } = await ctx.admin.from('carbon_usuarios').update(mudancas).eq('id', id);
  if (error) {
    console.error('Falha ao atualizar pessoa:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  return respostaJson({ ok: true });
}

/* ===== Registro ============================================================ */

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'acessos/areas', escrita: false, handler: listarAreas },
  { metodo: 'GET', padrao: 'acessos/cargos', escrita: false, handler: listarCargos },
  { metodo: 'POST', padrao: 'acessos/cargos', escrita: true, handler: criarCargo },
  { metodo: 'PATCH', padrao: 'acessos/cargos/:id', escrita: true, handler: atualizarCargo },
  { metodo: 'DELETE', padrao: 'acessos/cargos/:id', escrita: true, handler: apagarCargo },
  { metodo: 'GET', padrao: 'acessos/pessoas', escrita: false, handler: listarPessoas },
  { metodo: 'PATCH', padrao: 'acessos/pessoas/:id', escrita: true, handler: atualizarPessoa },
];

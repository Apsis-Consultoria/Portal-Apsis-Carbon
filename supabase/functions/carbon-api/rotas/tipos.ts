// -----------------------------------------------------------------------------
// Contrato do roteador modular da Edge Function carbon-api.
// -----------------------------------------------------------------------------
// Este arquivo NAO tem dependencia de nenhum modulo de dominio, de proposito: ele
// e importado por todos eles e por helpers.ts, e um import de volta criaria ciclo.
//
// A ideia do roteador: index.ts nao conhece nenhuma regra de negocio. Ele monta o
// Contexto (autenticacao, registro do colaborador, client de servidor, parametros
// da rota e corpo validado) e chama o handler da Rota que casou. Assim, uma tela
// nova do sistema significa UM arquivo novo em rotas/, e nao mais um `case` num
// switch gigante que todo mundo edita junto (fonte garantida de conflito quando
// varias frentes trabalham em paralelo).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** Identidade que veio do ID token do Azure AD, ja validada por _shared/azureAuth.ts. */
export type Usuario = {
  /** Sempre em minusculas (normalizado no azureAuth). */
  email: string;
  nome: string;
};

/**
 * Linha de carbon_usuarios resolvida a cada requisicao autenticada.
 *
 * `papel` decide escrita (ver PAPEIS_ESCRITA no index.ts) e `ativo` decide acesso.
 * `id` e o que permite filtrar carbon_usuario_modulos e gravar autoria.
 */
export type RegistroUsuario = {
  id: string;
  email: string;
  nome: string | null;
  papel: string;
  ativo: boolean;
  /** Cargo da pessoa. Nulo significa "ainda sem cargo": vale a regra antiga do papel. */
  cargo_id?: string | null;
  /**
   * Areas efetivas, vindas de public.carbon_areas_do_usuario.
   *
   * VER E EDITAR sao a MESMA permissao: se a area esta aqui, a pessoa le e
   * escreve nela. Foi decisao do dono, e e o que torna o portao uma pergunta so.
   *
   * Resolvidas UMA VEZ por requisicao, antes do handler, junto com o upsert do
   * usuario. Nao e cache entre requisicoes de proposito: mudanca de cargo tem de
   * valer na requisicao seguinte, e nao quando um isolate morrer.
   */
  areas: string[];
};

/**
 * Tudo que um handler de rota recebe. Nenhum handler chama obterAdmin(),
 * validarTokenAzure() nem req.json() por conta propria: se precisou de algo que
 * nao esta aqui, o lugar de acrescentar e o Contexto, uma vez, para todos.
 */
export type Contexto = {
  /** Linha de carbon_usuarios do chamador. Ja garantida ativa pelo index. */
  registro: RegistroUsuario;
  /** Identidade do token. Util para filtro por e-mail (ex.: notificacoes). */
  usuario: Usuario;
  /** Client de servidor (service_role) pronto, unico por isolate. */
  admin: SupabaseClient;
  /**
   * Parametros `:nome` do padrao da rota, ja validados como UUID pelo index.
   * Para 'projetos/:id/pdd', params.id.
   */
  params: Record<string, string>;
  /**
   * Corpo JSON. Objeto (possivelmente vazio) nas rotas que nao sao GET e null nos
   * GET, onde o corpo nem e lido. Handler de escrita pode usar `ctx.corpo ?? {}`.
   */
  corpo: Record<string, unknown> | null;
  /** URL completa da requisicao, para ler query string (ver paginar()). */
  url: URL;
  /**
   * Dominio corporativo aceito, ja normalizado (trim + minusculas), vindo de
   * carbon_app_config.app.dominioPermitido.
   *
   * Normalizado AQUI, e nao em cada uso: o index.ts copia o valor cru da config e
   * quem normaliza hoje e o _shared/azureAuth.ts, dentro dele. Um espaco a mais
   * ou uma maiuscula na linha `app` do banco faria o LOGIN continuar passando
   * (porque azureAuth normaliza) e qualquer comparacao nova aqui reprovar todos
   * os e-mails - uma divergencia que so apareceria em producao.
   */
  dominio: string;
};

/** Metodos que o roteador sabe casar. OPTIONS e tratado antes, no preflight. */
export type MetodoRota = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/**
 * Uma rota do carbon-api.
 *
 * @property padrao   Caminho DEPOIS do nome da funcao, sem barra inicial.
 *                    Segmento comecando com ':' e parametro. Ex.: 'projetos/:id/pdd'.
 * @property escrita  true exige papel admin ou gestor. E um campo explicito, e nao
 *                    `metodo !== 'GET'`, para que uma futura rota de acao que use
 *                    POST somente para ler (relatorio com filtro grande no corpo)
 *                    possa declarar escrita: false sem precisar mexer no portao.
 */
export type Rota = {
  metodo: MetodoRota;
  padrao: string;
  escrita: boolean;
  handler: (ctx: Contexto) => Promise<Response>;
  /**
   * AREA de acesso da rota, conferida contra o cargo da pessoa antes do handler.
   *
   * NAO E PREENCHIDA ROTA A ROTA, de proposito: quem carimba e `comArea()` no
   * indice.ts, um arquivo de dominio por vez. Rota nova nasce coberta pela area
   * do arquivo em que foi escrita, e nao existe o caminho "esqueci de marcar" -
   * que numa lista de mais de cem rotas e uma questao de tempo.
   *
   * Opcional no tipo porque as rotas sao DECLARADAS sem ela; depois de passar
   * pelo indice, toda rota tem area. O index.ts recusa a rota sem area em vez de
   * liberar (ver o portao la).
   */
  area?: string;
};

import { chamarApi, chamarDemo, cam } from "@/lib/api/base";
import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import {
  demoListarAreas, demoListarCargos, demoListarPessoas,
  demoCriarCargo, demoAtualizarCargo, demoApagarCargo, demoAtualizarPessoa,
} from "@/lib/demo/acessos";

/**
 * api/acessos - cargos e quem tem cada um.
 *
 * VER E EDITAR SAO A MESMA PERMISSAO, por decisao do dono: se a area esta no
 * cargo, a pessoa le e escreve nela. Nao ha nivel intermediario, e por isso nao
 * ha campo de nivel em lugar nenhum deste modulo - a area esta ou nao esta.
 *
 * MODO DEMONSTRACAO: sem isto, as consultas desta tela tentavam rede de verdade
 * em revisao, nao havia conta MSAL, e o `interacao_necessaria` resultante fazia o
 * GuardaDeSessao trocar o app INTEIRO pela tela de sessao expirada. A tela nova
 * derrubava o portal todo. O `if (MODO_DEMO && MODO_DEMO_ATIVO())` vai sem
 * Boolean() em volta de proposito: e o que deixa o Rollup dobrar a constante e
 * tirar o dataset ficticio do bundle de producao.
 *
 * QUEM AUTORIZA E O SERVIDOR. Estas chamadas so respondem para quem tem a area
 * `acessos`; o portao esta no index.ts do carbon-api, conferido antes de cada
 * handler. A tela nao esconde nada por perfil, pelo mesmo motivo das outras:
 * seria uma segunda fonte de verdade para a mesma regra.
 */

/** Catalogo de areas do sistema (tabela carbon_areas). */
export async function listarAreas(msal) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo("/acessos/areas", demoListarAreas);
  return chamarApi("/acessos/areas", msal);
}

/** Cargos, com as areas de cada um e quantas pessoas ativas o tem. */
export async function listarCargos(msal) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo("/acessos/cargos", demoListarCargos);
  return chamarApi("/acessos/cargos", msal);
}

export async function criarCargo(msal, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo("/acessos/cargos", () => demoCriarCargo(dados));
  return chamarApi("/acessos/cargos", msal, { metodo: "POST", corpo: dados });
}

/**
 * Atualiza cargo. `areas` e o CONJUNTO FINAL, e nao um diff.
 *
 * Mandar o estado final e deliberado: diff calculado no cliente e a origem
 * classica de permissao fantasma - a tela acha que tirou, o servidor nao
 * recebeu, e ninguem percebe ate alguem abrir uma tela que nao deveria.
 */
export async function atualizarCargo(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo("/acessos/cargos", () => demoAtualizarCargo(id, dados));
  return chamarApi(`/acessos/cargos/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

export async function apagarCargo(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo("/acessos/cargos", () => demoApagarCargo(id));
  return chamarApi(`/acessos/cargos/${cam(id)}`, msal, { metodo: "DELETE" });
}

/** Colaboradores, INCLUSIVE inativos: sem eles nao ha como reativar ninguem. */
export async function listarPessoas(msal) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo("/acessos/pessoas", demoListarPessoas);
  return chamarApi("/acessos/pessoas", msal);
}

/** Troca o cargo (`cargo_id: null` tira o cargo) e liga/desliga a pessoa. */
export async function atualizarPessoa(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo("/acessos/pessoas", () => demoAtualizarPessoa(id, dados));
  return chamarApi(`/acessos/pessoas/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/**
 * Textos dos erros proprios deste dominio.
 *
 * `sem_administrador_de_acesso` e o mais importante da tela: ele impede o
 * sistema de ficar sem ninguem que administre acessos, e a mensagem precisa
 * dizer o que fazer, nao so que foi recusado. O servidor devolve o mesmo codigo
 * vindo da trava do banco ou da checagem da Edge Function - quem opera nao
 * precisa saber qual camada barrou.
 */
export const ERROS_ACESSOS = {
  cargo_duplicado: "Já existe um cargo com esse nome.",
  area_desconhecida: "Uma das áreas enviadas não existe mais no sistema.",
  sem_administrador_de_acesso:
    "Essa mudança deixaria o sistema sem ninguém que administre acessos. " +
    "Dê a área Gestão de acessos a outra pessoa antes de tirar desta.",
};

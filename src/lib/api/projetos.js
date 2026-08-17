import { MODO_DEMO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo } from "@/lib/api/base";
import {
  demoListarProjetos,
  demoObterProjeto,
  demoCriarProjeto,
  demoAtualizarProjeto,
} from "@/lib/demoProjetos";

/**
 * api/projetos - rotas de projeto de carbono (issue #1).
 *
 * MODO DEMONSTRACAO: o projeto Supabase ainda nao foi provisionado, entao com
 * MODO_DEMO ligado estas funcoes NAO fazem rede - operam sobre o dataset em memoria
 * de src/lib/demoProjetos.js, e as mutacoes alteram esse dataset para a tela ser
 * realmente interativa na revisao.
 *
 * Isso vale SOMENTE em desenvolvimento: MODO_DEMO exige import.meta.env.DEV E a
 * variavel VITE_CARBON_DEMO=true (ver src/lib/runtimeConfig.js). Em build de producao
 * MODO_DEMO e false por forca, e como import.meta.env.DEV e estatico o bundler
 * elimina o ramo do demo do bundle.
 *
 * O `if (MODO_DEMO)` fica SEM Boolean() em volta de proposito: com o wrapper o Rollup
 * nao dobra a expressao para a constante false, os ramos sobrevivem ao tree-shaking e
 * o dataset ficticio inteiro ia para o bundle de producao.
 *
 * NOTA DE CONVENCAO: dominios novos colocam o dataset em src/lib/demo/<dominio>.js.
 * Projetos e PDD continuam em src/lib/demoProjetos.js porque o arquivo ja existia
 * antes da convencao; mover agora seria diff sem ganho.
 */

export async function listarProjetos(msal) {
  if (MODO_DEMO) return chamarDemo("/projetos", () => demoListarProjetos());
  return chamarApi("/projetos", msal);
}

export async function obterProjeto(msal, id) {
  if (MODO_DEMO) return chamarDemo(`/projetos/${id}`, () => demoObterProjeto(id));
  return chamarApi(`/projetos/${cam(id)}`, msal);
}

export async function criarProjeto(msal, dados) {
  if (MODO_DEMO) return chamarDemo("/projetos", () => demoCriarProjeto(dados));
  return chamarApi("/projetos", msal, { metodo: "POST", corpo: dados });
}

export async function atualizarProjeto(msal, id, dados) {
  if (MODO_DEMO) return chamarDemo(`/projetos/${id}`, () => demoAtualizarProjeto(id, dados));
  return chamarApi(`/projetos/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

import { MODO_DEMO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo } from "@/lib/api/base";
import {
  demoObterPdd,
  demoCriarPddDoTemplate,
  demoAtualizarCapituloPdd,
} from "@/lib/demoProjetos";

/**
 * api/pdd - rotas do Project Design Document (issue #2).
 *
 * Sobre o modo demonstracao e o motivo de o `if (MODO_DEMO)` nao ter Boolean() em
 * volta, ver o cabecalho de src/lib/api/projetos.js.
 */

export async function obterPdd(msal, projetoId) {
  if (MODO_DEMO) return chamarDemo(`/projetos/${projetoId}/pdd`, () => demoObterPdd(projetoId));
  return chamarApi(`/projetos/${cam(projetoId)}/pdd`, msal);
}

/**
 * Cria os capitulos do PDD a partir do template do standard do projeto.
 * Idempotente no backend (funcao SQL carbon_pdd_criar_do_template): clicar duas
 * vezes nao duplica capitulo, so devolve criados = 0.
 */
export async function criarPddDoTemplate(msal, projetoId) {
  if (MODO_DEMO) {
    return chamarDemo(`/projetos/${projetoId}/pdd`, () => demoCriarPddDoTemplate(projetoId));
  }
  // Sem corpo de proposito: o standard vem do proprio projeto, no servidor.
  return chamarApi(`/projetos/${cam(projetoId)}/pdd`, msal, { metodo: "POST" });
}

export async function atualizarCapituloPdd(msal, capituloId, dados) {
  if (MODO_DEMO) {
    return chamarDemo(`/pdd-capitulos/${capituloId}`, () =>
      demoAtualizarCapituloPdd(capituloId, dados)
    );
  }
  return chamarApi(`/pdd-capitulos/${cam(capituloId)}`, msal, { metodo: "PATCH", corpo: dados });
}

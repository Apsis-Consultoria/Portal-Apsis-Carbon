import { MODO_DEMO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo } from "@/lib/api/base";
import {
  demoListarAtividades,
  demoObterAtividade,
  demoCriarAtividade,
  demoAtualizarAtividade,
  demoRepriorizarAtividades,
  demoListarApontamentos,
  demoRegistrarApontamento,
  demoAtualizarApontamento,
  demoRemoverApontamento,
  demoMinhasHoras,
  demoResumoHoras,
} from "@/lib/demo/atividades";

/**
 * api/atividades - atividades e apontamento de horas (issues #7 e #8).
 *
 * MODO DEMONSTRACAO: o projeto Supabase ainda nao foi provisionado, entao com MODO_DEMO
 * ligado estas funcoes NAO fazem rede - operam sobre o dataset em memoria de
 * src/lib/demo/atividades.js, que reproduz as mesmas regras de calculo do SQL (soma dos
 * apontamentos, aderencia com uma casa, semana comecando na segunda, exclusao da
 * atividade cancelada do consolidado).
 *
 * O `if (MODO_DEMO)` fica SEM Boolean() em volta de proposito: com o wrapper o Rollup
 * nao dobra a expressao para a constante false, os ramos sobrevivem ao tree-shaking e o
 * dataset ficticio inteiro vai para o bundle de producao. Ver o cabecalho de
 * src/lib/api/projetos.js.
 *
 * Este modulo NAO entra em src/lib/api/indice.js (arquivo compartilhado, e o `export *`
 * de la arrastaria este dataset de demonstracao para o mesmo pedaco do bundle dos
 * outros dominios). Importe daqui direto: `@/lib/api/atividades`.
 */

/**
 * Monta a query string ignorando valor vazio.
 *
 * Chave com valor vazio precisa ser OMITIDA, e nao enviada em branco: a Edge Function
 * trata `?tipo=` como ausente, mas mandar a chave vazia de qualquer jeito deixaria a
 * URL diferente a cada render e quebraria o cache do TanStack Query sem motivo.
 */
function query(filtros) {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros || {})) {
    if (valor === null || valor === undefined || valor === "") continue;
    params.set(chave, String(valor));
  }
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

/* ===== Atividades ========================================================= */

/**
 * Lista atividades.
 *
 * @param {object} filtros projeto_id, tipo, status, prioridade, responsavel_id,
 *        de, ate, busca, limite, pagina. Todos opcionais.
 */
export async function listarAtividades(msal, filtros = {}) {
  if (MODO_DEMO) return chamarDemo("/atividades", () => demoListarAtividades(filtros));
  return chamarApi(`/atividades${query(filtros)}`, msal);
}

export async function obterAtividade(msal, id) {
  if (MODO_DEMO) return chamarDemo(`/atividades/${id}`, () => demoObterAtividade(id));
  return chamarApi(`/atividades/${cam(id)}`, msal);
}

export async function criarAtividade(msal, dados) {
  if (MODO_DEMO) return chamarDemo("/atividades", () => demoCriarAtividade(dados));
  return chamarApi("/atividades", msal, { metodo: "POST", corpo: dados });
}

export async function atualizarAtividade(msal, id, dados) {
  if (MODO_DEMO) return chamarDemo(`/atividades/${id}`, () => demoAtualizarAtividade(id, dados));
  return chamarApi(`/atividades/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/**
 * Repriorizacao EM MASSA, numa chamada.
 *
 * Existe porque a prioridade e repriorizada na reuniao semanal olhando a lista inteira
 * (criterio de aceite da issue #7): sem isto, mudar doze atividades seriam doze PATCH
 * em sequencia, com a tela piscando a cada resposta.
 *
 * @param {{id: string, prioridade: 'baixa'|'media'|'alta'}[]} itens prioridades
 *        diferentes no mesmo pedido sao aceitas, porque repriorizar promove umas e
 *        rebaixa outras na mesma passada.
 */
export async function repriorizarAtividades(msal, itens) {
  if (MODO_DEMO) {
    return chamarDemo("/atividades/repriorizar", () => demoRepriorizarAtividades(itens));
  }
  return chamarApi("/atividades/repriorizar", msal, { metodo: "POST", corpo: { itens } });
}

/* ===== Apontamento de horas =============================================== */

/**
 * Apontamentos de uma atividade.
 *
 * A resposta traz `escopo`: 'consolidado' quando o papel do chamador (admin ou gestor)
 * permite ver o lancamento de todos, e 'proprio' quando so vem o dele. Quem decide e o
 * SERVIDOR; a tela apenas explica o que esta mostrando.
 */
export async function listarApontamentos(msal, atividadeId) {
  if (MODO_DEMO) {
    return chamarDemo(`/atividades/${atividadeId}/apontamentos`, () =>
      demoListarApontamentos(atividadeId)
    );
  }
  return chamarApi(`/atividades/${cam(atividadeId)}/apontamentos`, msal);
}

/**
 * Lancamento rapido: registra, corrige ou apaga o apontamento do PROPRIO usuario em um
 * dia. E o caminho exigido pela issue #8 (atualizacao contínua ao longo da semana).
 *
 * Uma unica funcao resolve os tres casos porque quem digita numa celula da grade nao
 * sabe se aquele dia ja tem lancamento:
 *   horas > 0                -> cria ou CORRIGE o do dia (chave atividade + usuario + dia)
 *   horas 0, '' ou ausente   -> apaga o lancamento do dia
 *
 * O usuario nunca vai no corpo: o servidor grava sempre o do token.
 *
 * @param {{atividade_id: string, data: string, horas?: number|string, observacao?: string}} dados
 */
export async function registrarApontamento(msal, dados) {
  if (MODO_DEMO) return chamarDemo("/apontamentos", () => demoRegistrarApontamento(dados));
  return chamarApi("/apontamentos", msal, { metodo: "POST", corpo: dados });
}

export async function atualizarApontamento(msal, id, dados) {
  if (MODO_DEMO) {
    return chamarDemo(`/apontamentos/${id}`, () => demoAtualizarApontamento(id, dados));
  }
  return chamarApi(`/apontamentos/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

export async function removerApontamento(msal, id) {
  if (MODO_DEMO) return chamarDemo(`/apontamentos/${id}`, () => demoRemoverApontamento(id));
  return chamarApi(`/apontamentos/${cam(id)}`, msal, { metodo: "DELETE" });
}

/**
 * Grade da semana do proprio usuario.
 *
 * @param {string} [semana] qualquer dia 'AAAA-MM-DD' da semana desejada; o servidor
 *        normaliza para a segunda-feira (padrao ISO). Ausente = semana corrente.
 */
export async function obterMinhasHoras(msal, semana) {
  if (MODO_DEMO) return chamarDemo("/minhas-horas", () => demoMinhasHoras(semana));
  return chamarApi(`/minhas-horas${query({ semana })}`, msal);
}

/**
 * Consolidado planejado x realizado, por tipo, por atividade e por semana.
 *
 * RESTRITO a papel admin ou gestor: horas por pessoa sao dado ligado a desempenho.
 * Quem nao tem papel recebe 403 com codigo 'sem_permissao', e a tela trata isso como
 * estado normal (bloco explicando a restricao), nunca como falha.
 *
 * @param {object} filtros de, ate, projeto_id, tipo.
 */
export async function obterResumoHoras(msal, filtros = {}) {
  if (MODO_DEMO) return chamarDemo("/horas-resumo", () => demoResumoHoras(filtros));
  return chamarApi(`/horas-resumo${query(filtros)}`, msal);
}

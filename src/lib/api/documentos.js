import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo } from "@/lib/api/base";
import {
  demoAtualizarDocumento,
  demoCriarDocumento,
  demoCriarVersaoDocumento,
  demoCriarVinculoDocumento,
  demoListarDocumentos,
  demoObterDocumento,
  demoRemoverVinculoDocumento,
} from "@/lib/demo/documentos";

/**
 * api/documentos - rotas da entidade Documento (issue #6).
 *
 * Contrato do backend (supabase/functions/carbon-api/rotas/documentos.ts):
 *   GET    /documentos                 -> { documentos, total, pagina, limite }
 *   POST   /documentos                 -> { documento }
 *   GET    /documentos/:id             -> { documento, familia, vinculos }
 *   PATCH  /documentos/:id             -> { documento }
 *   POST   /documentos/:id/versoes     -> { documento, familia }
 *   POST   /documentos/:id/vinculos    -> { vinculo }
 *   DELETE /documento-vinculos/:id     -> { removido: true }
 *
 * MODO DEMONSTRACAO: o projeto Supabase ainda nao foi provisionado, entao com MODO_DEMO
 * ligado estas funcoes NAO fazem rede - operam sobre o dataset em memoria de
 * src/lib/demo/documentos.js, e as mutacoes alteram esse dataset para a tela ser
 * realmente interativa na revisao.
 *
 * O `if (MODO_DEMO && MODO_DEMO_ATIVO())` fica SEM Boolean() em volta de proposito: com o wrapper o Rollup
 * nao dobra a expressao para a constante false, os ramos sobrevivem ao tree-shaking e o
 * dataset ficticio inteiro iria para o bundle de producao. Ver o cabecalho de
 * src/lib/api/projetos.js.
 */

/**
 * Traduz os filtros da tela (camelCase) para a query string do backend (snake_case).
 *
 * A conversao vive AQUI, e nao na tela, para o nome do parametro HTTP existir em um
 * lugar so: a tela pensa em `{ projetoId, incluirSubstituidos }` e o backend le
 * `projeto_id` e `incluir_substituidos`. Valor vazio e simplesmente omitido, para uma
 * URL de listagem sem filtro nenhum ficar limpa (e cacheavel).
 */
function montarConsulta(filtros = {}) {
  const params = new URLSearchParams();

  if (filtros.projetoId) params.set("projeto_id", String(filtros.projetoId));
  if (filtros.escopo) params.set("escopo", String(filtros.escopo));
  if (filtros.tipo) params.set("tipo", String(filtros.tipo));
  if (filtros.origem) params.set("origem", String(filtros.origem));
  if (filtros.incluirSubstituidos) params.set("incluir_substituidos", "true");
  if (filtros.busca) params.set("busca", String(filtros.busca));
  if (filtros.alvoTipo) params.set("alvo_tipo", String(filtros.alvoTipo));
  if (filtros.alvoId) params.set("alvo_id", String(filtros.alvoId));
  if (filtros.limite) params.set("limite", String(filtros.limite));
  if (filtros.pagina && Number(filtros.pagina) > 1) params.set("pagina", String(filtros.pagina));

  const consulta = params.toString();
  return consulta ? `?${consulta}` : "";
}

/**
 * Lista documentos.
 *
 * @param {object} msal
 * @param {{projetoId?: string, escopo?: 'institucional', tipo?: string, origem?: string,
 *          incluirSubstituidos?: boolean, busca?: string, alvoTipo?: string,
 *          alvoId?: string, limite?: number, pagina?: number}} [filtros]
 *
 * Por padrao o backend devolve SOMENTE as versoes vigentes (documento que nenhum outro
 * substitui). `incluirSubstituidos: true` traz o historico junto.
 */
export async function listarDocumentos(msal, filtros = {}) {
  const caminho = `/documentos${montarConsulta(filtros)}`;
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo(caminho, () => demoListarDocumentos(filtros));
  return chamarApi(caminho, msal);
}

/** Documento com a familia de versoes e os vinculos, em uma resposta. */
export async function obterDocumento(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo(`/documentos/${id}`, () => demoObterDocumento(id));
  return chamarApi(`/documentos/${cam(id)}`, msal);
}

/**
 * Cria documento. `projeto_id` nulo ou ausente = documento institucional.
 *
 * Exige ao menos um caminho para o arquivo (`url_externa` ou `caminho_storage`). Nesta
 * entrega a tela envia sempre `url_externa`: nao existe upload, e essa e a decisao
 * pendente registrada na issue #6.
 */
export async function criarDocumento(msal, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo("/documentos", () => demoCriarDocumento(dados));
  return chamarApi("/documentos", msal, { metodo: "POST", corpo: dados });
}

export async function atualizarDocumento(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo(`/documentos/${id}`, () => demoAtualizarDocumento(id, dados));
  return chamarApi(`/documentos/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/**
 * Registra a versao seguinte de um documento.
 *
 * Projeto e tipo sao herdados do antecessor pelo servidor (identidade da familia).
 * Titulo, origem e formato sao herdados quando nao vem no corpo. A versao nova precisa
 * do proprio arquivo: herdar a URL criaria duas versoes apontando para o mesmo arquivo.
 */
export async function criarVersaoDocumento(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarDemo(`/documentos/${id}/versoes`, () => demoCriarVersaoDocumento(id, dados));
  }
  return chamarApi(`/documentos/${cam(id)}/versoes`, msal, { metodo: "POST", corpo: dados });
}

/**
 * Vincula o documento a um item de outra entidade, pelo par (tipo_alvo, alvo_id).
 *
 * Quem vai consumir isto de verdade sao as telas que possuem os itens: o checklist de
 * evidencias da auditoria (issue #4) e os findings (#5). A tela de Documentos mostra os
 * vinculos, mas nao os cria: criar exigiria digitar o id de um item que ainda nao tem
 * tela, e um campo de UUID solto e pior do que nao ter campo.
 */
export async function criarVinculoDocumento(msal, documentoId, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarDemo(`/documentos/${documentoId}/vinculos`, () =>
      demoCriarVinculoDocumento(documentoId, dados)
    );
  }
  return chamarApi(`/documentos/${cam(documentoId)}/vinculos`, msal, {
    metodo: "POST",
    corpo: dados,
  });
}

/** Remove um vinculo. Apaga so a ligacao: documento e item continuam intactos. */
export async function removerVinculoDocumento(msal, vinculoId) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarDemo(`/documento-vinculos/${vinculoId}`, () =>
      demoRemoverVinculoDocumento(vinculoId)
    );
  }
  return chamarApi(`/documento-vinculos/${cam(vinculoId)}`, msal, { metodo: "DELETE" });
}

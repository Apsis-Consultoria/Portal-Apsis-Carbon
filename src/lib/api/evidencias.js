import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo } from "@/lib/api/base";
import {
  demoObterEvidencias,
  demoCriarEvidenciasDoTemplate,
  demoAtualizarItemEvidencia,
} from "@/lib/demo/evidencias";

/**
 * api/evidencias - checklist de evidencias da auditoria (issue #4).
 *
 * Rotas da Edge Function carbon-api atendidas aqui:
 *   GET   /projetos/:id/evidencias
 *   POST  /projetos/:id/evidencias
 *   PATCH /evidencia-itens/:id
 *
 * Sobre o modo demonstracao e o motivo de o `if (MODO_DEMO && MODO_DEMO_ATIVO())` NAO ter Boolean() em
 * volta (com o wrapper o Rollup nao dobra a expressao para false, os ramos sobrevivem
 * ao tree-shaking e o dataset ficticio inteiro vai para o bundle de producao), ver o
 * cabecalho de src/lib/api/projetos.js.
 */

/**
 * Itens do checklist, progresso nos dois eixos e disponibilidade do vinculo com
 * documentos.
 *
 * Formato da resposta: { itens, progresso, vinculos_disponiveis }. Em `itens`, o
 * campo documentos_vinculados vem null (e nao zero) quando a tabela de vinculos do
 * dominio de Documentos ainda nao existe - zero afirmaria que o item nao tem
 * documento nenhum, que e informacao diferente de "ainda nao sei".
 */
export async function obterEvidencias(msal, projetoId) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarDemo(`/projetos/${projetoId}/evidencias`, () => demoObterEvidencias(projetoId));
  }
  return chamarApi(`/projetos/${cam(projetoId)}/evidencias`, msal);
}

/**
 * Cria o checklist a partir do template do standard do projeto.
 * Idempotente no backend (funcao SQL carbon_evidencias_criar_do_template): clicar
 * duas vezes nao duplica item, so devolve criados = 0.
 */
export async function criarEvidenciasDoTemplate(msal, projetoId) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarDemo(`/projetos/${projetoId}/evidencias`, () =>
      demoCriarEvidenciasDoTemplate(projetoId)
    );
  }
  // Sem corpo de proposito: o standard vem do proprio projeto, no servidor.
  return chamarApi(`/projetos/${cam(projetoId)}/evidencias`, msal, { metodo: "POST" });
}

/**
 * Atualiza um item. Campos aceitos: status_resposta, estado_evidencia,
 * responsavel_id, encaminhado_para e observacoes.
 *
 * Os DOIS eixos sao campos separados e independentes: enviar status_resposta nao
 * mexe em estado_evidencia. Enviar apenas o que mudou mantem o PATCH pequeno e evita
 * sobrescrever o que outra pessoa acabou de salvar no outro eixo.
 */
export async function atualizarItemEvidencia(msal, itemId, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarDemo(`/evidencia-itens/${itemId}`, () =>
      demoAtualizarItemEvidencia(itemId, dados)
    );
  }
  return chamarApi(`/evidencia-itens/${cam(itemId)}`, msal, { metodo: "PATCH", corpo: dados });
}

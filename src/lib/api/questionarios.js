import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo, ErroApi } from "@/lib/api/base";
import {
  demoAtualizarQuestionario,
  demoCriarQuestionario,
  demoDetalharQuestionario,
  demoListarModelos,
  demoListarQuestionarios,
  demoRemoverQuestionario,
} from "@/lib/demo/questionarios";

/**
 * api/questionarios - os questionários de campo.
 *
 *   GET    /questionarios/modelos   as definições dos formulários
 *   GET    /questionarios           lista, com filtro por modelo, projeto, aldeia e status
 *   GET    /questionarios/:id       um preenchimento, com a definição junto
 *   POST   /questionarios           cria
 *   PATCH  /questionarios/:id       altera
 *   DELETE /questionarios/:id       apaga (só rascunho)
 *
 * O FORMULÁRIO NÃO ESTÁ NO CÓDIGO desta camada nem da tela: ele vem do servidor,
 * em `/questionarios/modelos`. Acrescentar um quinto questionário é um seed, não
 * um deploy do frontend. O custo é que a tela precisa buscar a definição antes de
 * desenhar, e por isso `listarModelosQuestionario` tem cache longo na tela.
 *
 * Sobre o `if (MODO_DEMO && MODO_DEMO_ATIVO())` sem Boolean() em volta, ver o
 * cabeçalho de src/lib/api/projetos.js: a constante precisa aparecer crua para o
 * Rollup dobrar a condição e não levar o dataset de demonstração para o bundle.
 *
 * Este módulo NÃO entra em src/lib/api/indice.js (ver o cabeçalho de lá).
 */

/* ===== Mensagens dos códigos deste domínio ================================
   Sem isto, o fallback genérico diria "O servidor recusou a requisição
   (resposta_com_dado_pessoal)", que não diz a quem preencheu o que fazer.    */
const MENSAGENS = {
  resposta_com_dado_pessoal:
    "Uma das respostas guarda dado pessoal (nome, contato, telefone, e-mail ou CPF). Registre a função da pessoa, não o nome.",
  pergunta_desconhecida:
    "O formulário mudou desde que esta tela foi aberta. Recarregue a página antes de salvar, para não perder o que digitou em campo errado.",
  opcao_invalida: "A opção escolhida não existe mais neste formulário.",
  modelo_nao_encontrado: "Este questionário não existe.",
  modelo_inativo:
    "Este formulário foi descontinuado e não aceita preenchimento novo. Os já respondidos continuam legíveis.",
  funcao_invalida: "Escolha uma função válida para quem foi entrevistado.",
  status_invalido: "O questionário só pode estar como rascunho ou concluído.",
  questionario_concluido:
    "Questionário concluído não é apagado pela tela: ele é evidência de campo. Fale com a equipe responsável pelo sistema.",
  campo_obrigatorio:
    "Falta responder um campo obrigatório para concluir. Salve como rascunho se quiser terminar depois.",
};

async function comMensagensDoDominio(executar) {
  try {
    return await executar();
  } catch (e) {
    const mensagem = MENSAGENS[e?.codigo];
    if (!mensagem || !(e instanceof ErroApi)) throw e;
    // Preserva o `detalhe`, que carrega a chave da pergunta: é ele que deixa a
    // tela rolar até o campo recusado em vez de só mostrar um toast.
    throw new ErroApi(mensagem, { codigo: e.codigo, status: e.status, detalhe: e.detalhe });
  }
}

/** As definições dos formulários ativos. Muda raramente: cacheie na tela. */
export async function listarModelosQuestionario(msal) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo("/questionarios/modelos", () => demoListarModelos());
    }
    return chamarApi("/questionarios/modelos", msal);
  });
}

/**
 * Lista os preenchimentos.
 *
 * `filtros`: { modelo, projeto, aldeia, status, pagina, limite }. `modelo` é a
 * CHAVE do formulário ('ronda'), não o uuid: é o que está na URL da tela.
 */
export async function listarQuestionarios(msal, filtros = {}) {
  const busca = new URLSearchParams();
  for (const campo of ["modelo", "projeto", "aldeia", "status", "pagina", "limite"]) {
    const valor = filtros[campo];
    if (valor !== undefined && valor !== null && valor !== "") busca.set(campo, String(valor));
  }
  const consulta = busca.toString();
  const caminho = consulta ? `/questionarios?${consulta}` : "/questionarios";

  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(caminho, () => demoListarQuestionarios(filtros));
    }
    return chamarApi(caminho, msal);
  });
}

/** Um preenchimento com a definição do formulário junto, para a tela desenhar. */
export async function detalharQuestionario(msal, id) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/questionarios/${id}`, () => demoDetalharQuestionario(id));
    }
    return chamarApi(`/questionarios/${cam(id)}`, msal);
  });
}

/**
 * Cria um preenchimento.
 *
 * `dados`: { modelo_id, projeto_id, aldeia, data_referencia, entrevistado_funcao,
 *            latitude, longitude, altitude_m, precisao_m, respostas, status,
 *            observacoes }
 *
 * NÃO mande autor: quem preencheu é quem está logado, e o servidor resolve isso
 * sozinho. Aceitar autor no corpo seria poder assinar em nome de outra pessoa.
 */
export async function criarQuestionario(msal, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo("/questionarios", () => demoCriarQuestionario(dados));
    }
    return chamarApi("/questionarios", msal, { metodo: "POST", corpo: dados });
  });
}

export async function atualizarQuestionario(msal, id, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/questionarios/${id}`, () => demoAtualizarQuestionario(id, dados));
    }
    return chamarApi(`/questionarios/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
  });
}

export async function removerQuestionario(msal, id) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/questionarios/${id}`, () => demoRemoverQuestionario(id));
    }
    return chamarApi(`/questionarios/${cam(id)}`, msal, { metodo: "DELETE" });
  });
}

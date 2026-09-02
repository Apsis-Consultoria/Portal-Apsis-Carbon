import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo, ErroApi } from "@/lib/api/base";
import {
  demoAtualizarAldeia, demoAtualizarAntecipacao, demoAtualizarAtividade,
  demoAtualizarCiclo, demoAtualizarComprovante, demoAtualizarEixo,
  demoAtualizarLancamento, demoCatalogos, demoCriarAldeia, demoCriarAntecipacao,
  demoCriarAtividade, demoCriarCiclo, demoCriarComprovante, demoCriarEixo,
  demoCriarLancamento, demoDetalharCiclo, demoListarAtividades,
  demoListarComprovantes, demoListarGrupos, demoPainel, demoRemoverAntecipacao,
  demoRemoverAtividade, demoRemoverComprovante, demoRemoverLancamento,
} from "@/lib/demo/prestacao";

/**
 * api/prestacao - prestacao de contas e atividades de campo.
 *
 * A partir de 01/09/2026 a equipe alimenta o SISTEMA, nao o Excel: este modulo
 * cobre leitura, escrita e os cadastros (ciclos, aldeias, eixos) que eram as
 * abas de dominio da planilha.
 *
 * Sobre o `if (MODO_DEMO && MODO_DEMO_ATIVO())` sem Boolean() em volta, ver o
 * cabecalho de src/lib/api/projetos.js: a constante precisa aparecer crua para o
 * Rollup dobrar a condicao e nao levar o dataset ficticio para o bundle. Os
 * dados de demonstracao deste dominio sao GENERICOS de proposito ("Comunidade
 * A", "Aldeia Rio Claro"): nada que uma captura de tela possa afirmar sobre o
 * projeto real.
 *
 * Este modulo NAO entra em src/lib/api/indice.js (ver o cabecalho de la).
 */

const MENSAGENS = {
  texto_com_cpf:
    "O texto contém um CPF. O portal não guarda dado pessoal: descreva o item ou o serviço, sem identificar a pessoa.",
  texto_com_email:
    "O texto contém um endereço de e-mail. O portal não guarda dado pessoal: descreva o item ou o serviço.",
  texto_com_dado_bancario:
    "O texto parece conter agência ou conta bancária. Esse dado fica no comprovante original, fora do portal.",
  texto_com_dado_pessoal:
    "O texto carrega dado pessoal. Descreva o item ou o serviço, sem identificar a pessoa.",
  aldeia_de_outro_grupo:
    "Essa aldeia é de outro grupo. As prestações dos dois grupos não se misturam.",
  antecipacao_duplicada:
    "Já existe um repasse nessa competência. Edite o que existe, ou use outro mês.",
  ciclo_fechado: "Este ciclo está fechado e não aceita mais lançamento.",
  ciclo_nao_encontrado: "Este ciclo não existe.",
  ciclo_duplicado: "Já existe um ciclo com esse nome neste grupo.",
  lancamento_nao_encontrado: "Este lançamento não existe mais. Recarregue a página.",
  antecipacao_nao_encontrada: "Este repasse não existe mais. Recarregue a página.",
  comprovante_nao_encontrado: "Este comprovante não existe mais. Recarregue a página.",
  atividade_nao_encontrada: "Esta atividade não existe mais. Recarregue a página.",
  aldeia_duplicada: "Já existe uma aldeia com esse nome neste grupo.",
  eixo_duplicado: "Já existe um eixo com esse nome.",
  grupo_nao_encontrado: "Este grupo não existe.",
  relatorio_invalido: "O relatório precisa ser MR-1, MR-2, MR-3 e assim por diante.",
  status_invalido: "Situação inválida para este registro.",
  valor_invalido: "O valor precisa ser um número diferente de zero.",
  nada_para_alterar: "Nada foi alterado.",
  sem_permissao: "Seu perfil não permite lançar aqui.",
};

async function traduzir(executar) {
  try {
    return await executar();
  } catch (e) {
    const mensagem = MENSAGENS[e?.codigo];
    if (!mensagem || !(e instanceof ErroApi)) throw e;
    throw new ErroApi(mensagem, { codigo: e.codigo, status: e.status, detalhe: e.detalhe });
  }
}

/* Encolhe o padrao repetido: em demonstracao roda o duble, fora dela a API. */
function rota(caminho, opcoes, ficticio) {
  return traduzir(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo(caminho, ficticio);
    return chamarApi(caminho, opcoes.msal, opcoes);
  });
}

// ===== Leitura ===============================================================

export function listarGruposPrestacao(msal) {
  return rota("/prestacao/grupos", { msal }, () => demoListarGrupos());
}

export function listarCatalogos(msal) {
  return rota("/prestacao/catalogos", { msal }, () => demoCatalogos());
}

export function detalharCiclo(msal, id) {
  return rota(`/prestacao/ciclos/${cam(id)}`, { msal }, () => demoDetalharCiclo(id));
}

export function painelDoCiclo(msal, id) {
  return rota(`/prestacao/ciclos/${cam(id)}/painel`, { msal }, () => demoPainel(id));
}

export function listarComprovantes(msal, cicloId, { pagina = 1, limite = 50 } = {}) {
  return rota(
    `/prestacao/ciclos/${cam(cicloId)}/comprovantes?pagina=${pagina}&limite=${limite}`,
    { msal },
    () => demoListarComprovantes(cicloId),
  );
}

export function listarAtividadesCampo(msal, filtros = {}) {
  const busca = new URLSearchParams();
  for (const campo of ["relatorio", "grupo", "status", "busca", "pagina", "limite"]) {
    const v = filtros[campo];
    if (v !== undefined && v !== null && v !== "") busca.set(campo, String(v));
  }
  const consulta = busca.toString();
  const caminho = consulta ? `/atividades-campo?${consulta}` : "/atividades-campo";
  return rota(caminho, { msal }, () => demoListarAtividades(filtros));
}

// ===== Escrita ===============================================================

export function criarAntecipacao(msal, dados) {
  return rota("/prestacao/antecipacoes", { msal, metodo: "POST", corpo: dados },
    () => demoCriarAntecipacao(dados));
}

export function atualizarAntecipacao(msal, id, dados) {
  return rota(`/prestacao/antecipacoes/${cam(id)}`, { msal, metodo: "PATCH", corpo: dados },
    () => demoAtualizarAntecipacao(id, dados));
}

export function removerAntecipacao(msal, id) {
  return rota(`/prestacao/antecipacoes/${cam(id)}`, { msal, metodo: "DELETE" },
    () => demoRemoverAntecipacao(id));
}

export function criarLancamento(msal, dados) {
  return rota("/prestacao/lancamentos", { msal, metodo: "POST", corpo: dados },
    () => demoCriarLancamento(dados));
}

export function atualizarLancamento(msal, id, dados) {
  return rota(`/prestacao/lancamentos/${cam(id)}`, { msal, metodo: "PATCH", corpo: dados },
    () => demoAtualizarLancamento(id, dados));
}

export function removerLancamento(msal, id) {
  return rota(`/prestacao/lancamentos/${cam(id)}`, { msal, metodo: "DELETE" },
    () => demoRemoverLancamento(id));
}

export function criarComprovante(msal, dados) {
  return rota("/prestacao/comprovantes", { msal, metodo: "POST", corpo: dados },
    () => demoCriarComprovante(dados));
}

export function atualizarComprovante(msal, id, dados) {
  return rota(`/prestacao/comprovantes/${cam(id)}`, { msal, metodo: "PATCH", corpo: dados },
    () => demoAtualizarComprovante(id, dados));
}

export function removerComprovante(msal, id) {
  return rota(`/prestacao/comprovantes/${cam(id)}`, { msal, metodo: "DELETE" },
    () => demoRemoverComprovante(id));
}

export function criarCiclo(msal, dados) {
  return rota("/prestacao/ciclos", { msal, metodo: "POST", corpo: dados },
    () => demoCriarCiclo(dados));
}

export function atualizarCiclo(msal, id, dados) {
  return rota(`/prestacao/ciclos/${cam(id)}`, { msal, metodo: "PATCH", corpo: dados },
    () => demoAtualizarCiclo(id, dados));
}

export function criarAldeia(msal, dados) {
  return rota("/prestacao/aldeias", { msal, metodo: "POST", corpo: dados },
    () => demoCriarAldeia(dados));
}

export function atualizarAldeia(msal, id, dados) {
  return rota(`/prestacao/aldeias/${cam(id)}`, { msal, metodo: "PATCH", corpo: dados },
    () => demoAtualizarAldeia(id, dados));
}

export function criarEixo(msal, dados) {
  return rota("/prestacao/eixos", { msal, metodo: "POST", corpo: dados },
    () => demoCriarEixo(dados));
}

export function atualizarEixo(msal, id, dados) {
  return rota(`/prestacao/eixos/${cam(id)}`, { msal, metodo: "PATCH", corpo: dados },
    () => demoAtualizarEixo(id, dados));
}

export function criarAtividadeCampo(msal, dados) {
  return rota("/atividades-campo", { msal, metodo: "POST", corpo: dados },
    () => demoCriarAtividade(dados));
}

export function atualizarAtividadeCampo(msal, id, dados) {
  return rota(`/atividades-campo/${cam(id)}`, { msal, metodo: "PATCH", corpo: dados },
    () => demoAtualizarAtividade(id, dados));
}

export function removerAtividadeCampo(msal, id) {
  return rota(`/atividades-campo/${cam(id)}`, { msal, metodo: "DELETE" },
    () => demoRemoverAtividade(id));
}

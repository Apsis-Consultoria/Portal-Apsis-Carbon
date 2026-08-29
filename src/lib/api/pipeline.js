import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo, ErroApi } from "@/lib/api/base";
import {
  demoAtualizarCandidato,
  demoAvaliarCriterio,
  demoCompararCandidatos,
  demoCriarCandidato,
  demoListarParceiros,
  demoListarPipeline,
  demoObterCandidato,
  demoPromoverAProjeto,
  demoRemoverNota,
} from "@/lib/demo/pipeline";

/**
 * api/pipeline - prospecção de novos negócios (issue #13).
 *
 *   GET    /pipeline                          panorama do funil, com resumo e por segmento
 *   GET    /pipeline/parceiros                mapa de parceiros
 *   GET    /pipeline/comparar?ids=a,b,c       comparação lado a lado
 *   GET    /pipeline/candidatos/:id           detalhe com a matriz de critérios
 *   POST   /pipeline/candidatos               cria um candidato
 *   PATCH  /pipeline/candidatos/:id           altera o candidato (descartar é etapa, não delete)
 *   POST   /pipeline/candidatos/:id/notas     grava ou corrige a nota de um critério
 *   DELETE /pipeline/candidato-notas/:id      apaga a nota, devolvendo o critério a "não avaliado"
 *   POST   /pipeline/candidatos/:id/projeto   promove o candidato aprovado a projeto
 *
 * NÃO EXISTE remoção de candidato, e a ausência é deliberada: prospecção encerrada não
 * se apaga, porque a rodada seguinte começa perguntando o que aconteceu na anterior.
 * Descartar é `atualizarCandidato(msal, id, { etapa: 'descartado' })`.
 *
 * Sobre o modo demonstração e o motivo de o `if (MODO_DEMO && MODO_DEMO_ATIVO())` não ter
 * Boolean() em volta, ver o cabeçalho de src/lib/api/projetos.js: a constante precisa
 * aparecer crua para o Rollup dobrar a condição e não levar o dataset de demonstração
 * para o bundle de produção.
 *
 * Este módulo NÃO entra em src/lib/api/indice.js, de propósito (ver o cabeçalho de lá).
 * Importe '@/lib/api/pipeline' direto.
 */

/* ===== Mensagens dos códigos deste domínio ================================
   src/lib/api/base.js traduz os códigos da fundação. Os abaixo são deste domínio e
   cairiam no texto técnico cru, que não diz a quem lê o que fazer a seguir.

   'candidato_nao_aprovado' é o mais importante da lista: é a recusa que a pessoa
   encontra ao tentar o gesto mais consequente da tela, e a mensagem precisa explicar
   que a etapa é o portão, e não que o sistema quebrou.                          */
const MENSAGENS = {
  segmento_invalido: "O segmento precisa ser terra indígena, REDD privado ou agro.",
  etapa_invalida:
    "A etapa precisa ser triagem, análise preliminar, proposta de viabilidade, aprovado ou descartado.",
  moeda_invalida: "A moeda do preço de referência precisa ser USD, BRL ou EUR.",
  uf_invalida: "A UF precisa ser a sigla de duas letras do estado, como PA ou MT.",
  nota_fora_da_faixa: "A nota precisa estar entre 0 e 10.",
  criterio_inativo:
    "Este critério foi desativado e não entra mais no cálculo da nota. Reative-o antes de avaliar.",
  candidato_nao_aprovado:
    "Só candidato na etapa Aprovado vira projeto. Conclua a análise e mova para Aprovado antes de converter.",
  comparacao_curta: "Selecione pelo menos dois candidatos para comparar.",
  comparacao_longa: "Compare no máximo seis candidatos por vez.",
  nada_para_atualizar: "Nenhum campo foi alterado.",
};

async function comMensagensDoDominio(executar) {
  try {
    return await executar();
  } catch (e) {
    const mensagem = MENSAGENS[e?.codigo];
    if (!mensagem || !(e instanceof ErroApi)) throw e;
    throw new ErroApi(mensagem, { codigo: e.codigo, status: e.status });
  }
}

/**
 * Panorama do funil.
 *
 * Os filtros valem SOMENTE para a lista: `resumo` e `por_segmento` são sempre o funil
 * inteiro, por decisão da função SQL. Filtrar por segmento e ver só aquele segmento no
 * resumo esconderia que os outros dois existem, e é a comparação entre segmentos que a
 * análise pede.
 *
 * Não há paginação nem busca no servidor. O pipeline de prospecção é curto por natureza
 * (dezenas de áreas, não milhares) e o resumo tem que bater com a lista; a busca por
 * texto acontece na tela, sobre o conjunto que já chegou.
 */
export async function listarPipeline(msal, opcoes = {}) {
  const { segmento = null, etapa = null, parceiroId = null } = opcoes;

  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo("/pipeline", () => demoListarPipeline({ segmento, etapa, parceiroId }));
    }

    const busca = new URLSearchParams();
    if (segmento) busca.set("segmento", segmento);
    if (etapa) busca.set("etapa", etapa);
    if (parceiroId) busca.set("parceiro_id", parceiroId);

    const query = busca.toString();
    return chamarApi(query ? `/pipeline?${query}` : "/pipeline", msal);
  });
}

/** Mapa de parceiros, com o pipeline que passa por cada um. */
export async function listarParceiros(msal) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo("/pipeline/parceiros", () => demoListarParceiros());
    }
    return chamarApi("/pipeline/parceiros", msal);
  });
}

/** Detalhe de um candidato, com as notas e os critérios ATIVOS (inclusive os sem nota). */
export async function obterCandidato(msal, candidatoId) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/pipeline/candidatos/${candidatoId}`, () =>
        demoObterCandidato(candidatoId)
      );
    }
    return chamarApi(`/pipeline/candidatos/${cam(candidatoId)}`, msal);
  });
}

/**
 * Comparação lado a lado.
 *
 * De 2 a 6 candidatos: um sozinho não se compara com nada e, acima de seis, a grade
 * critério x candidato deixa de caber na tela e vira rolagem horizontal, que é o oposto
 * de comparar lado a lado. O servidor recusa fora dessa faixa; a checagem aqui é para a
 * tela não gastar uma requisição em algo que já se sabe que volta 400.
 */
export async function compararCandidatos(msal, ids = []) {
  // Deduplica ANTES de contar. Sem isso, uma lista com o mesmo id repetido passaria no
  // limite como três candidatos e voltaria com uma coluna só.
  const limpos = [...new Set(ids.filter(Boolean).map(String))];

  if (limpos.length < 2) {
    throw new ErroApi(MENSAGENS.comparacao_curta, { codigo: "comparacao_curta" });
  }
  if (limpos.length > 6) {
    throw new ErroApi(MENSAGENS.comparacao_longa, { codigo: "comparacao_longa" });
  }

  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo("/pipeline/comparar", () => demoCompararCandidatos(limpos));
    }
    // Vírgula literal de propósito: é o separador que o servidor espera e
    // encodeURIComponent a transformaria em %2C, que ele não desmonta.
    return chamarApi(`/pipeline/comparar?ids=${limpos.map(cam).join(",")}`, msal);
  });
}

export async function criarCandidato(msal, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo("/pipeline/candidatos", () => demoCriarCandidato(dados));
    }
    return chamarApi("/pipeline/candidatos", msal, { metodo: "POST", corpo: dados });
  });
}

/**
 * Altera o candidato.
 *
 * Campo ausente do corpo é "não mexa"; campo presente com null é "apague". É assim que
 * mover de etapa (`{ etapa: 'aprovado' }`) não apaga premissas, falhas e virtudes.
 */
export async function atualizarCandidato(msal, candidatoId, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/pipeline/candidatos/${candidatoId}`, () =>
        demoAtualizarCandidato(candidatoId, dados)
      );
    }
    return chamarApi(`/pipeline/candidatos/${cam(candidatoId)}`, msal, {
      metodo: "PATCH",
      corpo: dados,
    });
  });
}

/**
 * Grava ou corrige a nota de um critério.
 *
 * É UPSERT pela chave natural (candidato, critério): reavaliar corrige a nota em vez de
 * criar uma segunda linha, e sem isso o mesmo critério contaria duas vezes na média,
 * dobrando o peso dele em silêncio.
 *
 * Devolve `{ nota, avaliacao }`. `avaliacao` é a nota ponderada e a cobertura já
 * recalculadas pelo servidor - a tela atualiza o cabeçalho do candidato sem recarregar a
 * lista, e sem repetir a fórmula da média ponderada no navegador.
 */
export async function avaliarCriterio(msal, candidatoId, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/pipeline/candidatos/${candidatoId}/notas`, () =>
        demoAvaliarCriterio(candidatoId, dados)
      );
    }
    return chamarApi(`/pipeline/candidatos/${cam(candidatoId)}/notas`, msal, {
      metodo: "POST",
      corpo: dados,
    });
  });
}

/**
 * Apaga a nota de um critério.
 *
 * Devolve o cruzamento a "não avaliado", que é DIFERENTE de nota zero: zero entra na
 * média e derruba o candidato; ausência sai do denominador e derruba a cobertura. É por
 * isso que limpar uma célula chama esta função em vez de gravar zero.
 */
export async function removerNota(msal, notaId) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/pipeline/candidato-notas/${notaId}`, () => demoRemoverNota(notaId));
    }
    return chamarApi(`/pipeline/candidato-notas/${cam(notaId)}`, msal, { metodo: "DELETE" });
  });
}

/**
 * Promove um candidato APROVADO a projeto de carbono.
 *
 * AÇÃO DE EFEITO GRANDE: cria uma linha em carbon_projetos, copia nome, metodologia,
 * UF, município e área, e passa a existir no cadastro de projetos para todo mundo. A
 * tela precisa confirmar antes de chamar esta função.
 *
 * IDEMPOTENTE: o segundo clique não cria um projeto duplicado, devolve
 * `{ criado: false, projeto_id }` do projeto que já existe. A tela usa `criado` para
 * escolher entre "projeto criado" e "este candidato já tinha virado projeto".
 */
export async function promoverAProjeto(msal, candidatoId) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/pipeline/candidatos/${candidatoId}/projeto`, () =>
        demoPromoverAProjeto(candidatoId)
      );
    }
    return chamarApi(`/pipeline/candidatos/${cam(candidatoId)}/projeto`, msal, {
      metodo: "POST",
    });
  });
}

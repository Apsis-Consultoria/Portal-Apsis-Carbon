import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo, ErroApi } from "@/lib/api/base";
import {
  demoAtualizarIndicador,
  demoCriarIndicador,
  demoListarIndicadores,
  demoRegistrarMedicao,
  demoRemoverIndicador,
  demoRemoverMedicao,
} from "@/lib/demo/indicadores";

/**
 * api/indicadores - rotas dos indicadores do Plano de Monitoramento.
 *
 *   GET    /projetos/:id/indicadores    lista, com as medições e as colunas de período
 *   POST   /projetos/:id/indicadores    cria um indicador
 *   PATCH  /indicadores/:id             altera a definição
 *   DELETE /indicadores/:id             remove (as medições vão junto, por cascade)
 *   POST   /indicadores/:id/medicoes    lança ou corrige o valor de um período
 *   DELETE /indicador-medicoes/:id      apaga a medição, devolvendo o período a "não medido"
 *
 * Sobre o modo demonstração e o motivo de o `if (MODO_DEMO && MODO_DEMO_ATIVO())` não ter
 * Boolean() em volta, ver o cabeçalho de src/lib/api/projetos.js: a constante precisa
 * aparecer crua para o Rollup dobrar a condição e não levar o dataset de demonstração
 * para o bundle de produção.
 *
 * Este módulo NÃO entra em src/lib/api/indice.js, de propósito (ver o cabeçalho de lá).
 * Importe '@/lib/api/indicadores' direto.
 */

/* ===== Mensagens dos códigos deste domínio ================================
   src/lib/api/base.js traduz os códigos da fundação. Os três abaixo são deste domínio e
   cairiam no fallback genérico, que não diz a quem lê o que fazer a seguir.  */
const MENSAGENS = {
  plano_invalido:
    "O plano precisa ser clima, comunidade ou biodiversidade.",
  tipo_invalido: "O tipo do indicador precisa ser contagem, percentual, volume ou área.",
  periodo_invalido:
    "A periodicidade precisa ser pontual, mensal, trimestral, semestral ou anual.",
  origem_invalida: "A origem da medição precisa ser interna ou parceiro.",
  percentual_nao_acumula:
    "Indicador percentual não pode ser acumulativo: somar 30% de um período com 40% de outro não dá 70% de nada. O valor que vale é o último medido.",
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
 * Lista os indicadores de um projeto.
 *
 * `plano` aceita 'clima', 'comunidade', 'biodiversidade' e 'internos' (os que não vieram
 * do Plano de Monitoramento). Sem ele, vêm todos misturados - o que raramente é o que a
 * tela quer, porque as três metodologias não se comparam entre si.
 *
 * O `limite` padrão é alto de propósito: a tela é uma MATRIZ (indicador nas linhas,
 * período nas colunas) e meia matriz não é meia informação, é um gráfico errado. O maior
 * plano tem 109 indicadores e o teto do servidor é 200, então uma página cobre. O campo
 * `total` da resposta existe justamente para a tela avisar se um dia não cobrir mais.
 */
export async function listarIndicadores(msal, projetoId, opcoes = {}) {
  const { plano = null, busca = null, limite = 200, pagina = 1 } = opcoes;

  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/projetos/${projetoId}/indicadores`, () =>
        demoListarIndicadores(projetoId, { plano, busca })
      );
    }

    const busca_ = new URLSearchParams();
    if (plano) busca_.set("plano", plano);
    if (busca && busca.trim()) busca_.set("busca", busca.trim());
    busca_.set("limite", String(limite));
    busca_.set("pagina", String(pagina));

    return chamarApi(`/projetos/${cam(projetoId)}/indicadores?${busca_}`, msal);
  });
}

export async function criarIndicador(msal, projetoId, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/projetos/${projetoId}/indicadores`, () =>
        demoCriarIndicador(projetoId, dados)
      );
    }
    return chamarApi(`/projetos/${cam(projetoId)}/indicadores`, msal, {
      metodo: "POST",
      corpo: dados,
    });
  });
}

export async function atualizarIndicador(msal, indicadorId, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/indicadores/${indicadorId}`, () =>
        demoAtualizarIndicador(indicadorId, dados)
      );
    }
    return chamarApi(`/indicadores/${cam(indicadorId)}`, msal, {
      metodo: "PATCH",
      corpo: dados,
    });
  });
}

export async function removerIndicador(msal, indicadorId) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/indicadores/${indicadorId}`, () => demoRemoverIndicador(indicadorId));
    }
    return chamarApi(`/indicadores/${cam(indicadorId)}`, msal, { metodo: "DELETE" });
  });
}

/**
 * Lança ou corrige o valor de um período.
 *
 * É UPSERT pela chave natural (indicador, data, periodicidade): mandar o mesmo período de
 * novo corrige o número, não cria uma segunda linha. Corrigir valor digitado errado é
 * rotina de campo, e obrigar a apagar antes deixaria uma janela em que a medição não
 * existe.
 *
 * `data` é a COMPETÊNCIA (a que período o valor se refere), nunca a data de digitação. A
 * convenção é a data FINAL do período: 2024-12-31 para o ano de 2024, 2026-03-31 para o
 * primeiro trimestre de 2026.
 */
export async function registrarMedicao(msal, indicadorId, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/indicadores/${indicadorId}/medicoes`, () =>
        demoRegistrarMedicao(indicadorId, dados)
      );
    }
    return chamarApi(`/indicadores/${cam(indicadorId)}/medicoes`, msal, {
      metodo: "POST",
      corpo: dados,
    });
  });
}

/**
 * Apaga a medição de um período.
 *
 * Devolve o período ao estado "não medido", que é DIFERENTE de zero medido. É por isso
 * que limpar uma célula na tela chama esta função em vez de gravar zero: zero é um
 * resultado que alguém apurou, ausência é uma lacuna.
 */
export async function removerMedicao(msal, medicaoId) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/indicador-medicoes/${medicaoId}`, () => demoRemoverMedicao(medicaoId));
    }
    return chamarApi(`/indicador-medicoes/${cam(medicaoId)}`, msal, { metodo: "DELETE" });
  });
}

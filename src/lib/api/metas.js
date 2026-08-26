import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo, ErroApi } from "@/lib/api/base";
import {
  demoAtualizarIndicadorDeMeta,
  demoAtualizarMeta,
  demoCriarIndicadorDeMeta,
  demoCriarMeta,
  demoListarMetas,
  demoRegistrarMedicaoDeMeta,
  demoRemoverIndicadorDeMeta,
  demoRemoverMeta,
} from "@/lib/demo/metas";

/**
 * api/metas - metas da equipe por frente de trabalho, com o realizado calculado.
 *
 *   GET    /projetos/:id/metas             lista por frente, progresso, frentes e avulsos
 *   POST   /projetos/:id/metas             cria uma meta
 *   PATCH  /metas/:id                      altera a meta
 *   DELETE /metas/:id                      remove (os indicadores ficam, por SET NULL)
 *   POST   /metas/:id/indicadores          cria um indicador interno já vinculado
 *   PATCH  /meta-indicadores/:id           altera a definição ou o vínculo com a meta
 *   DELETE /meta-indicadores/:id           remove o indicador (as medições vão por cascade)
 *   POST   /meta-indicadores/:id/medicoes  lança ou corrige o valor de um período
 *
 * INDICADOR DE META NÃO É INDICADOR DO PLANO DE MONITORAMENTO. As duas coisas moram na
 * mesma tabela e a coluna `plano` as separa: preenchida é indicador de certificação, que
 * a VVB confere e que tem tela própria (src/lib/api/indicadores.js); nula é indicador
 * interno, ligado a meta da equipe, que é o deste módulo. As rotas daqui filtram `plano
 * is null` e recusam com 404 um indicador de plano - misturar os dois faria a tela de
 * Metas listar 161 indicadores de certificação que não têm meta nenhuma.
 *
 * Sobre o modo demonstração e o motivo de o `if (MODO_DEMO && MODO_DEMO_ATIVO())` não ter
 * Boolean() em volta, ver o cabeçalho de src/lib/api/projetos.js: a constante precisa
 * aparecer crua para o Rollup dobrar a condição e não levar o dataset de demonstração
 * para o bundle de produção.
 *
 * Este módulo NÃO entra em src/lib/api/indice.js, de propósito (ver o cabeçalho de lá).
 * Importe '@/lib/api/metas' direto.
 */

/* ===== Mensagens dos códigos deste domínio ================================
   src/lib/api/base.js traduz os códigos da fundação. Os de baixo são deste domínio e
   cairiam no fallback genérico, que não diz a quem lê o que fazer a seguir.

   DOIS DELES SOBRESCREVEM UM TEXTO EXISTENTE, e isso é deliberado:
   - 'status_invalido' em base.js fala de capítulo do PDD ("O status informado para o
     capítulo não é válido"), que não faz sentido numa meta;
   - 'registro_duplicado' em base.js fala de ID de registro de projeto; aqui o único
     duplicado possível é o nome do indicador dentro do projeto (índice único
     carbon_indicadores_projeto_nome_uniq, que ignora caixa e espaço nas pontas).
   O mecanismo é o `comMensagensDoDominio` abaixo, que roda depois do base.js.  */
const MENSAGENS = {
  frente_invalida:
    "A frente precisa ser uma das seis do plano de impacto. Recarregue a página e escolha de novo.",
  periodicidade_invalida: "A periodicidade precisa ser única, quinzenal, mensal ou trimestral.",
  status_invalido: "O status da meta precisa ser planejada, em andamento, concluída ou cancelada.",
  tipo_invalido: "O tipo do indicador precisa ser contagem, percentual, volume ou área.",
  granularidade_invalida:
    "A granularidade da medição precisa ser pontual, mensal, trimestral, semestral ou anual.",
  origem_invalida: "A origem da medição precisa ser interna ou parceiro.",
  unidade_obrigatoria:
    "Meta com valor alvo precisa de unidade: \"20\" sozinho não diz se são câmeras, toneladas ou por cento.",
  janela_incompleta:
    "A janela sazonal é um par: informe o mês inicial e o final, ou deixe os dois em branco.",
  mes_invalido: "O mês da janela sazonal precisa ser um número de 1 a 12.",
  periodo_invalido: "O fim do período da meta não pode ser anterior ao início.",
  percentual_nao_acumula:
    "Indicador percentual não pode ser acumulativo: somar 30% de um período com 40% de outro não dá 70% de nada. O valor que vale é o último medido.",
  meta_invalida: "Um dos campos da meta foi recusado pelo banco. Confira o valor alvo e as datas.",
  registro_duplicado: "Já existe um indicador com esse nome neste projeto.",
  referencia_invalida:
    "A meta escolhida não existe ou pertence a outro projeto. Recarregue a página e tente de novo.",
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
 * Lista as metas de um projeto.
 *
 * A resposta é um envelope com cinco partes, e nenhuma delas é redundante:
 *   metas     as metas já enriquecidas (realizado, pct, atrasada, ocorrências previstas,
 *             indicadores com a série recortada pelo período da meta);
 *   total     quantas vieram, para a tela avisar se o corte de 500 for atingido;
 *   progresso os números do topo, do PROJETO INTEIRO e não da página filtrada;
 *   frentes   as SEIS frentes com a ordem do plano de impacto, inclusive as que não têm
 *             meta nenhuma - frente vazia precisa aparecer, senão a lacuna fica invisível;
 *   avulsos   indicadores internos ainda sem meta, para a tela poder oferecer o vínculo.
 *
 * `frente` e `status` filtram a LISTA, nunca o progresso: um total que mudasse ao filtrar
 * por frente não responderia "como está o plano de impacto", que é o que o topo diz.
 */
export async function listarMetas(msal, projetoId, opcoes = {}) {
  const { frente = null, status = null } = opcoes;

  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/projetos/${projetoId}/metas`, () =>
        demoListarMetas(projetoId, { frente, status })
      );
    }

    const busca = new URLSearchParams();
    if (frente) busca.set("frente", frente);
    if (status) busca.set("status", status);
    const query = busca.toString();

    return chamarApi(`/projetos/${cam(projetoId)}/metas${query ? `?${query}` : ""}`, msal);
  });
}

/**
 * Cria uma meta.
 *
 * `valor_alvo` pode vir nulo de propósito: as metas herdadas do plano ainda estão com o
 * número em placeholder, e exigir um valor forçaria a equipe a inventar - o que é pior do
 * que não ter número. Meta sem alvo é contada em `progresso.sem_valor_alvo` e aparece na
 * tela como pendência explícita, que é o oposto de ficar escondida dentro de uma frase.
 *
 * Quando há `valor_alvo`, a `unidade` é obrigatória (o servidor recusa com
 * 'unidade_obrigatoria').
 */
export async function criarMeta(msal, projetoId, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/projetos/${projetoId}/metas`, () => demoCriarMeta(projetoId, dados));
    }
    return chamarApi(`/projetos/${cam(projetoId)}/metas`, msal, {
      metodo: "POST",
      corpo: dados,
    });
  });
}

export async function atualizarMeta(msal, metaId, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/metas/${metaId}`, () => demoAtualizarMeta(metaId, dados));
    }
    return chamarApi(`/metas/${cam(metaId)}`, msal, { metodo: "PATCH", corpo: dados });
  });
}

/**
 * Remove a meta.
 *
 * Os indicadores dela NÃO são apagados: a chave estrangeira é ON DELETE SET NULL, porque
 * apagar a meta não pode destruir série histórica de medição, que é dado de campo e
 * custou coleta. Eles reaparecem no bloco de indicadores sem meta.
 */
export async function removerMeta(msal, metaId) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/metas/${metaId}`, () => demoRemoverMeta(metaId));
    }
    return chamarApi(`/metas/${cam(metaId)}`, msal, { metodo: "DELETE" });
  });
}

/**
 * Cria um indicador interno já vinculado à meta.
 *
 * `acumulativo` decide como o realizado é apurado: true soma as medições do período
 * (câmeras instaladas, rondas feitas), false vale a última medição do período (percentual
 * de aumento de venda, área sob monitoramento). Indicador `percentual` com `acumulativo`
 * true é recusado antes de chegar ao banco.
 */
export async function criarIndicadorDeMeta(msal, metaId, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/metas/${metaId}/indicadores`, () =>
        demoCriarIndicadorDeMeta(metaId, dados)
      );
    }
    return chamarApi(`/metas/${cam(metaId)}/indicadores`, msal, {
      metodo: "POST",
      corpo: dados,
    });
  });
}

/**
 * Altera a definição do indicador interno, ou o vínculo dele com uma meta.
 *
 * `meta_id: null` desvincula sem apagar a série. É o caminho para quem quer parar de
 * contar aquele indicador numa meta e ainda assim preservar o histórico.
 */
export async function atualizarIndicadorDeMeta(msal, indicadorId, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/meta-indicadores/${indicadorId}`, () =>
        demoAtualizarIndicadorDeMeta(indicadorId, dados)
      );
    }
    return chamarApi(`/meta-indicadores/${cam(indicadorId)}`, msal, {
      metodo: "PATCH",
      corpo: dados,
    });
  });
}

export async function removerIndicadorDeMeta(msal, indicadorId) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/meta-indicadores/${indicadorId}`, () =>
        demoRemoverIndicadorDeMeta(indicadorId)
      );
    }
    return chamarApi(`/meta-indicadores/${cam(indicadorId)}`, msal, { metodo: "DELETE" });
  });
}

/**
 * Lança ou corrige o valor de um período.
 *
 * É UPSERT pela chave natural (indicador, data, granularidade): relançar o mesmo período
 * CORRIGE o número em vez de criar uma segunda linha. O índice único
 * carbon_indicador_medicoes_periodo_uidx é o que sustenta isso.
 *
 * `data` é a COMPETÊNCIA (a que período o valor se refere), nunca a data de digitação -
 * lançamento em atraso é rotina no campo, e usar a data de digitação jogaria a ronda de
 * agosto para dentro de setembro. É essa data que decide se a medição entra no período da
 * meta e, portanto, no realizado.
 *
 * `valor` aceita NEGATIVO: indicador de variação percentual mede queda também.
 */
export async function registrarMedicaoDeMeta(msal, indicadorId, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/meta-indicadores/${indicadorId}/medicoes`, () =>
        demoRegistrarMedicaoDeMeta(indicadorId, dados)
      );
    }
    return chamarApi(`/meta-indicadores/${cam(indicadorId)}/medicoes`, msal, {
      metodo: "POST",
      corpo: dados,
    });
  });
}

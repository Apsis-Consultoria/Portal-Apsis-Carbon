import { MODO_DEMO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo } from "@/lib/api/base";
import {
  demoObterFindings,
  demoCriarRodadaAuditoria,
  demoAtualizarRodadaAuditoria,
  demoCriarFinding,
  demoAtualizarFinding,
  demoCriarSubitensFinding,
  demoAtualizarSubitemFinding,
  demoRemoverSubitemFinding,
} from "@/lib/demo/findings";

/**
 * api/findings - findings de auditoria de VVB, Verra e BeZero (issue #5).
 *
 * Uma entidade para os TRES processos externos, com a origem vindo da rodada de
 * auditoria. Ver o cabecalho de supabase/functions/carbon-api/rotas/findings.ts para
 * o contrato completo das rotas.
 *
 * MODO DEMONSTRACAO: o projeto Supabase ainda nao foi provisionado, entao com
 * MODO_DEMO ligado estas funcoes NAO fazem rede - operam sobre o dataset em memoria
 * de src/lib/demo/findings.js, que reproduz as MESMAS regras de calculo das funcoes
 * SQL (denominador sem 'nao_aplicavel', dois eixos de progresso independentes,
 * subitens_pct nulo quando nao ha subitem).
 *
 * O `if (MODO_DEMO)` fica SEM Boolean() em volta de proposito: com o wrapper o Rollup
 * nao dobra a expressao para a constante false, os ramos sobrevivem ao tree-shaking e
 * o dataset ficticio inteiro iria para o bundle de producao.
 *
 * NOMES COM SUFIXO DE DOMINIO (criarRodadaAuditoria, criarSubitensFinding) porque o
 * vocabulario "rodada" e "subitem" tambem existe no monitoramento e no checklist de
 * evidencias. Em codigo novo importe deste modulo direto, nunca de carbonApi.
 */

/**
 * Carga completa da tela: { rodadas, findings, progresso }.
 *
 * @param {string} projetoId
 * @param {{ origem?: 'vvb'|'verra'|'bezero'|null }} filtros  origem vazia = todas
 */
export async function obterFindings(msal, projetoId, { origem = null } = {}) {
  if (MODO_DEMO) {
    return chamarDemo(`/projetos/${projetoId}/findings`, () =>
      demoObterFindings(projetoId, origem)
    );
  }
  const consulta = origem ? `?origem=${cam(origem)}` : "";
  return chamarApi(`/projetos/${cam(projetoId)}/findings${consulta}`, msal);
}

/**
 * Cria a proxima rodada de auditoria do par projeto + origem.
 * O `numero` NAO e enviado: quem calcula e o servidor (max + 1), porque numeracao de
 * rodada e sequencia, nao escolha de quem cadastra.
 */
export async function criarRodadaAuditoria(msal, projetoId, dados) {
  if (MODO_DEMO) {
    return chamarDemo(`/projetos/${projetoId}/auditoria-rodadas`, () =>
      demoCriarRodadaAuditoria(projetoId, dados)
    );
  }
  return chamarApi(`/projetos/${cam(projetoId)}/auditoria-rodadas`, msal, {
    metodo: "POST",
    corpo: dados,
  });
}

export async function atualizarRodadaAuditoria(msal, rodadaId, dados) {
  if (MODO_DEMO) {
    return chamarDemo(`/auditoria-rodadas/${rodadaId}`, () =>
      demoAtualizarRodadaAuditoria(rodadaId, dados)
    );
  }
  return chamarApi(`/auditoria-rodadas/${cam(rodadaId)}`, msal, {
    metodo: "PATCH",
    corpo: dados,
  });
}

export async function criarFinding(msal, rodadaId, dados) {
  if (MODO_DEMO) {
    return chamarDemo(`/auditoria-rodadas/${rodadaId}/findings`, () =>
      demoCriarFinding(rodadaId, dados)
    );
  }
  return chamarApi(`/auditoria-rodadas/${cam(rodadaId)}/findings`, msal, {
    metodo: "POST",
    corpo: dados,
  });
}

export async function atualizarFinding(msal, findingId, dados) {
  if (MODO_DEMO) {
    return chamarDemo(`/findings/${findingId}`, () => demoAtualizarFinding(findingId, dados));
  }
  return chamarApi(`/findings/${cam(findingId)}`, msal, { metodo: "PATCH", corpo: dados });
}

/**
 * Cria subitens verificaveis de um finding.
 *
 * Aceita `{ descricao }` para um item e `{ descricoes: [...] }` para o lote. O lote e
 * o que permite colar de uma vez a lista que hoje mora dentro do campo de
 * comentarios do Notion, com dezenas de linhas por finding.
 *
 * Devolve o FINDING inteiro, porque criar subitem muda o progresso agregado.
 */
export async function criarSubitensFinding(msal, findingId, dados) {
  if (MODO_DEMO) {
    return chamarDemo(`/findings/${findingId}/subitens`, () =>
      demoCriarSubitensFinding(findingId, dados)
    );
  }
  return chamarApi(`/findings/${cam(findingId)}/subitens`, msal, {
    metodo: "POST",
    corpo: dados,
  });
}

/** Marca, desmarca ou renomeia um subitem. Devolve o finding com o progresso novo. */
export async function atualizarSubitemFinding(msal, subitemId, dados) {
  if (MODO_DEMO) {
    return chamarDemo(`/finding-subitens/${subitemId}`, () =>
      demoAtualizarSubitemFinding(subitemId, dados)
    );
  }
  return chamarApi(`/finding-subitens/${cam(subitemId)}`, msal, {
    metodo: "PATCH",
    corpo: dados,
  });
}

/** Remove um subitem. E a unica exclusao do dominio: ver o cabecalho de findings.ts. */
export async function removerSubitemFinding(msal, subitemId) {
  if (MODO_DEMO) {
    return chamarDemo(`/finding-subitens/${subitemId}`, () =>
      demoRemoverSubitemFinding(subitemId)
    );
  }
  return chamarApi(`/finding-subitens/${cam(subitemId)}`, msal, { metodo: "DELETE" });
}

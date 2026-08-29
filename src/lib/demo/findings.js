/**
 * demo/findings.js - dataset de demonstracao da tela de Findings de auditoria (issue #5).
 *
 * POR QUE EXISTE: o projeto Supabase do Apsis Carbon ainda NAO foi provisionado, e a
 * tela precisa ser revisavel localmente antes disso. Em MODO_DEMO (ver
 * src/lib/runtimeConfig.js: exige dev E o clique no botao de demonstracao) as funcoes de
 * src/lib/api/findings.js nao fazem rede: operam sobre o estado em memoria deste
 * arquivo, e as mutacoes ALTERAM esse estado, para a tela ser de fato interativa.
 *
 * ESCOPO: isto nao e cache nem persistencia. Recarregar a pagina volta ao estado
 * inicial. Vale SOMENTE em desenvolvimento: em build de producao MODO_DEMO e false por
 * forca (import.meta.env.DEV e estatico) e o bundler elimina os ramos que chamam este
 * modulo.
 *
 * REGRAS DE CALCULO: as duas contas do dominio estao reproduzidas aqui EXATAMENTE como
 * na migration 20260814093000_findings.sql (funcoes carbon_finding_json e
 * carbon_findings_progresso):
 *   1. finding com estado 'nao_aplicavel' sai do DENOMINADOR do progresso;
 *   2. os dois eixos (resposta e evidencia) sao independentes, e no eixo de evidencia
 *      'nao_aplicavel' tambem sai do denominador;
 *   3. subitens_pct e NULL, nao 0, quando o finding nao tem subitem;
 *   4. arredondamento de uma casa decimal, igual ao round(..., 1) do SQL.
 * Divergir em qualquer um dos quatro pontos faria o demo mostrar um numero que a
 * producao nunca produz, e a diferenca so apareceria depois do provisionamento.
 *
 * LGPD E CONFIDENCIALIDADE: todo o conteudo abaixo e FICTICIO e obviamente ficticio.
 * Nada foi transcrito do material real de auditoria (o levantamento do Notion
 * deliberadamente nao transcreveu o texto dos findings, justamente porque trata de
 * territorio, acordos com associacoes, repartição de beneficios e processos de
 * consentimento de comunidade indigena). Os textos em ingles foram escritos aqui a
 * partir do vocabulario PUBLICO da metodologia (CAR, CL, PD, MR, Project Proponent) e
 * nao correspondem a apontamento nenhum de projeto real. Nao ha nome de pessoa, nome
 * de cliente, nem identificador verdadeiro de registro. Responsavel fica sempre nulo:
 * e FK para colaborador e nao ha por que inventar gente.
 */

/* ===== Erro tipado ========================================================
   O demo precisa recusar entrada invalida com os MESMOS codigos do backend
   (campo_obrigatorio, campo_invalido, nao_encontrado, periodo_invalido), senao a
   tela trataria erro de validacao de um jeito no demo e de outro em producao.
   Nao lancamos ErroApi aqui de proposito: quem converte e o chamarDemo de
   src/lib/api/base.js, e importar ErroApi criaria ciclo entre o modulo de dados e
   o de transporte. A classe e local (e nao importada de demoProjetos.js) para este
   dataset nao arrastar o dataset de projetos junto no mesmo pedaco do bundle.   */
class ErroDemo extends Error {
  constructor(codigo, detalhe) {
    super(`Recusado pelo modo demonstracao: ${codigo}${detalhe ? ` (${detalhe})` : ""}`);
    this.name = "ErroDemo";
    this.codigo = codigo;
    this.detalhe = detalhe;
  }
}

/* ===== Vocabulario, espelhando os CHECKs da migration =====================
   NADA daqui e exportado de proposito. A tela tem a propria copia destas listas (com
   rotulo e tom para a interface): importar constante deste modulo arrastaria o dataset
   ficticio inteiro para o bundle de producao, que e exatamente o que a guarda de
   MODO_DEMO existe para evitar.                                               */

const ORIGENS = ["vvb", "verra", "bezero"];
const TIPOS = ["car", "cl"];
const DOCUMENTOS = ["pdd", "monitoramento", "outro"];
const ESTADOS = [
  "aberto",
  "em_andamento",
  "aguardando_terceiro",
  "respondido",
  "fechado",
  "nao_aplicavel",
];
const ESTADOS_EVIDENCIA = ["pendente", "ok", "nao_aplicavel"];

/* Grupo dos findings sem tipo (a BeZero nao classifica em CAR/CL). Mesmo rotulo do
   coalesce(tipo, 'sem_tipo') da funcao SQL carbon_findings_progresso. */
const SEM_TIPO = "sem_tipo";

/**
 * MESMO id do projeto ficticio de src/lib/demoProjetos.js, que nao o exporta.
 * Mantido em sincronia a mao de proposito: importar o outro modulo so por uma
 * constante acoplaria dois datasets de demonstracao independentes. Se o valor
 * divergir, a tela mostra o estado vazio (nenhuma rodada), nunca quebra.
 */
const PROJETO_DEMO_ID = "00000000-0000-4000-8000-000000000001";

/* ===== Utilitarios ======================================================== */

/** Espera curta para que os estados de carregamento da tela aparecam no demo. */
const esperar = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

function arredondar(valor, casas) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

/** Percentual com uma casa, igual ao round(x, 1) do SQL. Denominador zero = 0. */
function pct(parte, total) {
  return total === 0 ? 0 : arredondar((parte * 100) / total, 1);
}

function novoId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, "0")}`;
}

const agora = () => new Date().toISOString();

/** Texto aparado; vazio vira null, como lerTexto do backend. */
function texto(valor) {
  if (valor === null || valor === undefined) return null;
  const limpo = String(valor).trim();
  return limpo === "" ? null : limpo;
}

function conferirEnum(valor, aceitos, campo) {
  const limpo = texto(valor);
  if (limpo === null) return null;
  if (!aceitos.includes(limpo)) throw new ErroDemo("campo_invalido", campo);
  return limpo;
}

/** Data ISO YYYY-MM-DD, como lerData do backend. */
function conferirData(valor, campo) {
  const limpo = texto(valor);
  if (limpo === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limpo)) throw new ErroDemo("campo_invalido", campo);
  return limpo;
}

function conferirInteiro(valor, campo) {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 0) throw new ErroDemo("campo_invalido", campo);
  return n;
}

/* ===== Regras de calculo (espelho das funcoes SQL) ======================== */

/**
 * Progresso dos subitens de UM finding.
 * pct nulo quando nao ha subitem: 0% diria "nada feito", quando o correto e "este
 * finding nao usa checklist". A tela depende dessa diferenca.
 */
function progressoDeSubitens(lista) {
  const total = lista.length;
  const concluidos = lista.filter((s) => s.concluido).length;
  return {
    total,
    concluidos,
    pct: total === 0 ? null : arredondar((concluidos * 100) / total, 1),
  };
}

/**
 * Contadores das seis visoes. Espelho de public.carbon_findings_progresso.
 *
 * As listas por_estado, por_evidencia, por_tipo e por_origem saem SEMPRE completas,
 * com zero onde nao ha finding: o board precisa das colunas vazias desenhadas.
 */
function calcularProgressoFindings(findings, subitens) {
  const idsFindings = new Set(findings.map((f) => f.id));
  const subitensNoRecorte = subitens.filter((s) => idsFindings.has(s.finding_id));

  const contar = (predicado) => findings.filter(predicado).length;

  const total = findings.length;
  const naoAplicaveis = contar((f) => f.estado === "nao_aplicavel");
  const considerados = contar((f) => f.estado !== "nao_aplicavel");
  const fechados = contar((f) => f.estado === "fechado");
  const consideradosEvidencia = contar(
    (f) => f.estado !== "nao_aplicavel" && f.estado_evidencia !== "nao_aplicavel"
  );
  const evidenciaOk = contar((f) => f.estado !== "nao_aplicavel" && f.estado_evidencia === "ok");

  const subTotal = subitensNoRecorte.length;
  const subConcluidos = subitensNoRecorte.filter((s) => s.concluido).length;

  const porRodada = new Map();
  for (const finding of findings) {
    const rodada = acharRodada(finding.rodada_id, { obrigatorio: false });
    if (!rodada) continue;
    const atual = porRodada.get(rodada.id) || {
      rodada_id: rodada.id,
      origem: rodada.origem,
      numero: rodada.numero,
      total: 0,
      considerados: 0,
      fechados: 0,
    };
    atual.total += 1;
    if (finding.estado !== "nao_aplicavel") atual.considerados += 1;
    if (finding.estado === "fechado") atual.fechados += 1;
    porRodada.set(rodada.id, atual);
  }

  const origemDoFinding = (finding) =>
    acharRodada(finding.rodada_id, { obrigatorio: false })?.origem ?? null;

  return {
    total,
    nao_aplicaveis: naoAplicaveis,
    considerados,
    fechados,
    em_aberto: contar((f) => f.estado !== "nao_aplicavel" && f.estado !== "fechado"),
    aguardando_terceiro: contar((f) => f.estado === "aguardando_terceiro"),
    pct: pct(fechados, considerados),
    considerados_evidencia: consideradosEvidencia,
    evidencia_ok: evidenciaOk,
    pct_evidencia: pct(evidenciaOk, consideradosEvidencia),
    subitens_total: subTotal,
    subitens_concluidos: subConcluidos,
    subitens_pct: subTotal === 0 ? null : arredondar((subConcluidos * 100) / subTotal, 1),
    por_estado: ESTADOS.map((estado) => ({
      estado,
      total: contar((f) => f.estado === estado),
    })),
    por_evidencia: ESTADOS_EVIDENCIA.map((estadoEvidencia) => ({
      estado_evidencia: estadoEvidencia,
      total: contar((f) => f.estado_evidencia === estadoEvidencia),
    })),
    por_tipo: [...TIPOS, SEM_TIPO].map((tipo) => ({
      tipo,
      total: contar((f) => (f.tipo ?? SEM_TIPO) === tipo),
    })),
    por_origem: ORIGENS.map((origem) => {
      const daOrigem = findings.filter((f) => origemDoFinding(f) === origem);
      const consideradosOrigem = daOrigem.filter((f) => f.estado !== "nao_aplicavel").length;
      const fechadosOrigem = daOrigem.filter((f) => f.estado === "fechado").length;
      return {
        origem,
        total: daOrigem.length,
        considerados: consideradosOrigem,
        fechados: fechadosOrigem,
        pct: pct(fechadosOrigem, consideradosOrigem),
      };
    }),
    // Mesma ordenacao do SQL: order by origem, numero (alfabetica, portanto
    // bezero, verra, vvb).
    por_rodada: [...porRodada.values()]
      .sort((a, b) => a.origem.localeCompare(b.origem, "pt-BR") || a.numero - b.numero)
      .map((r) => ({ ...r, pct: pct(r.fechados, r.considerados) })),
  };
}

/* ===== Dataset ficticio ===================================================
   Quatro rodadas, porque o ponto da issue e justamente rodada como ENTIDADE: a VVB
   ja esta na segunda rodada, e Verra e BeZero correm em paralelo, sobre o mesmo
   projeto. Os identificadores repetem entre as rodadas da VVB de proposito (ID - 01
   existe na primeira e na segunda), que e o motivo de nao haver unique no
   identificador.

   NOTA DE BUNDLE (medida, nao suposta). As listas abaixo sao LITERAIS puros e nenhuma
   transformacao roda no topo do modulo: quem monta o estado e garantirEstado(), chamada
   de dentro das funcoes demo*. Isso importa porque o Rollup elimina literal que ninguem
   usa, mas NAO elimina .map() de topo de modulo - ele nao consegue provar que a chamada
   e livre de efeito colateral. A primeira versao deste arquivo montava o estado com
   .map() no topo e ~4 KB de texto ficticio de auditoria sobrava no bundle de producao
   (o mesmo efeito documentado em src/lib/demoProjetos.js, que ainda paga esse preco pelo
   template do PDD). Conferido depois da mudanca: nenhuma string deste dataset aparece em
   dist/. Se acrescentar dado aqui, mantenha o padrao: literal no topo, transformacao
   dentro de garantirEstado.                                                     */

const CRIADO_EM_DEMO = "2026-03-02T13:00:00.000Z";

const R_VVB_1 = "00000000-0000-4000-8000-000000000501";
const R_VVB_2 = "00000000-0000-4000-8000-000000000502";
const R_VERRA_1 = "00000000-0000-4000-8000-000000000503";
const R_BEZERO_1 = "00000000-0000-4000-8000-000000000504";

const RODADAS_INICIAIS = [
  {
    id: R_VVB_1,
    projeto_id: PROJETO_DEMO_ID,
    origem: "vvb",
    numero: 1,
    data_recebimento: "2025-09-15",
    data_resposta: "2025-10-24",
    observacoes: "Primeira rodada de validação. Respondida dentro do prazo combinado.",
    criado_por: null,
    criado_em: CRIADO_EM_DEMO,
    atualizado_em: CRIADO_EM_DEMO,
  },
  {
    id: R_VVB_2,
    projeto_id: PROJETO_DEMO_ID,
    origem: "vvb",
    numero: 2,
    data_recebimento: "2026-02-10",
    data_resposta: null,
    observacoes: "Segunda rodada em andamento: reavaliação dos itens reabertos.",
    criado_por: null,
    criado_em: CRIADO_EM_DEMO,
    atualizado_em: CRIADO_EM_DEMO,
  },
  {
    id: R_VERRA_1,
    projeto_id: PROJETO_DEMO_ID,
    origem: "verra",
    numero: 1,
    data_recebimento: "2026-04-06",
    data_resposta: null,
    observacoes: "Revisão de registro pelo próprio programa. Itens temáticos.",
    criado_por: null,
    criado_em: CRIADO_EM_DEMO,
    atualizado_em: CRIADO_EM_DEMO,
  },
  {
    id: R_BEZERO_1,
    projeto_id: PROJETO_DEMO_ID,
    origem: "bezero",
    numero: 1,
    data_recebimento: "2026-05-20",
    data_resposta: null,
    observacoes: "Due diligence de rating. Checklist do avaliador.",
    criado_por: null,
    criado_em: CRIADO_EM_DEMO,
    atualizado_em: CRIADO_EM_DEMO,
  },
];

/**
 * Findings ficticios. Cobrem de proposito, para a revisao ver os casos reais:
 *   - CAR e CL na VVB, e finding sem tipo na BeZero;
 *   - identificador repetido entre rodadas;
 *   - finding com checklist (subitens) e finding sem nenhum;
 *   - estado 'aguardando_terceiro' com a AREA de quem se espera;
 *   - estado 'nao_aplicavel', que sai do denominador do progresso;
 *   - resposta fechada com evidencia pendente (os dois eixos independentes).
 */
const F = (n) => `00000000-0000-4000-8000-0000000006${String(n).padStart(2, "0")}`;

/** Campos que toda linha tem e que nao vale repetir dezoito vezes na lista abaixo. */
const PADROES_FINDING = {
  // capitulo_pdd_id fica NULO no demo de proposito: os ids dos capitulos do PDD sao
  // gerados em tempo de execucao por src/lib/demoProjetos.js e nao ha como referencia-los
  // daqui. O vinculo estruturado e exercitado em producao; no demo vale capitulo_ref.
  capitulo_pdd_id: null,
  capitulo_mr_id: null,
  responsavel_id: null,
  criado_por: null,
  criado_em: CRIADO_EM_DEMO,
  atualizado_em: CRIADO_EM_DEMO,
};

const FINDINGS_INICIAIS = [
  /* --- VVB, rodada 1 ---------------------------------------------------- */
  {
    id: F(1),
    rodada_id: R_VVB_1,
    tipo: "car",
    identificador: "ID - 01",
    ordem: null,
    documento_alvo: "pdd",
    capitulo_ref: "Section 2.1",
    descricao_en:
      "The PD does not state the project start date in the same format used in the registry template.",
    acao_exigida_en: "PP shall align the start date across the PD and the supporting evidence.",
    plano_resposta_pt: "Data corrigida no capítulo 2.1 e conferida contra o contrato.",
    resposta_oficial_en: "The start date has been corrected in Section 2.1 of the PD.",
    estado: "fechado",
    estado_evidencia: "ok",
    aguardando_quem: null,
  },
  {
    id: F(2),
    rodada_id: R_VVB_1,
    tipo: "cl",
    identificador: "ID - 02",
    ordem: null,
    documento_alvo: "pdd",
    capitulo_ref: "Section 2.3",
    descricao_en:
      "Please clarify how the stakeholder consultation records were made available to the participants.",
    acao_exigida_en: "PP shall describe the dissemination channel and attach the records.",
    plano_resposta_pt:
      "Resposta redigida. Falta anexar a ata assinada, que é a evidência do canal usado.",
    resposta_oficial_en:
      "The consultation records were shared with participants as described in Section 2.3.",
    // Caso que a tela precisa mostrar: resposta pronta e evidencia ainda pendente.
    estado: "respondido",
    estado_evidencia: "pendente",
    aguardando_quem: null,
  },
  {
    id: F(3),
    rodada_id: R_VVB_1,
    tipo: "car",
    identificador: "ID - 03",
    ordem: null,
    documento_alvo: "pdd",
    capitulo_ref: "Section 3.2",
    descricao_en:
      "The quantification section presents parameters without the unit of measurement in three tables.",
    acao_exigida_en: "PP shall include units in all quantification tables.",
    plano_resposta_pt: "Revisão tabela por tabela, com conferência final antes de reenviar.",
    resposta_oficial_en: "Units were included in all tables of Section 3.2.",
    estado: "fechado",
    estado_evidencia: "ok",
    aguardando_quem: null,
  },
  {
    id: F(4),
    rodada_id: R_VVB_1,
    tipo: "car",
    identificador: "ID - 04",
    ordem: null,
    documento_alvo: "monitoramento",
    capitulo_ref: "Entire MR",
    descricao_en:
      "The MR uses a version of the monitoring template that is not the current one published by the programme.",
    acao_exigida_en: "PP shall migrate the MR to the current template version.",
    plano_resposta_pt: "Relatório migrado para a versão vigente do template.",
    resposta_oficial_en: "The MR has been migrated to the current template version.",
    estado: "fechado",
    estado_evidencia: "ok",
    aguardando_quem: null,
  },
  {
    id: F(5),
    rodada_id: R_VVB_1,
    tipo: "cl",
    identificador: "ID - 05",
    ordem: null,
    documento_alvo: "pdd",
    capitulo_ref: "Section 5.4",
    descricao_en: "Please clarify the sampling interval adopted for the biodiversity indicators.",
    acao_exigida_en: "PP shall state the interval and the justification in the monitoring plan.",
    plano_resposta_pt: "Intervalo descrito no plano de monitoramento, com a justificativa técnica.",
    resposta_oficial_en:
      "The sampling interval and its justification are stated in the monitoring plan.",
    estado: "fechado",
    estado_evidencia: "ok",
    aguardando_quem: null,
  },

  /* --- VVB, rodada 2 ---------------------------------------------------- */
  {
    id: F(6),
    rodada_id: R_VVB_2,
    tipo: "car",
    identificador: "ID - 01",
    ordem: null,
    documento_alvo: "pdd",
    capitulo_ref: "Section 2.3.12",
    // Este e o finding que justifica a existencia de subitens: a resposta e uma
    // lista de conferencia item por item, que hoje mora dentro de um campo de texto.
    descricao_en:
      "Scientific names across the PD are not consistently presented in italics, as required by the template.",
    acao_exigida_en: "PP shall review every occurrence and present scientific names in italics.",
    plano_resposta_pt:
      "Conferência linha por linha. Cada item da lista abaixo é uma ocorrência revisada.",
    resposta_oficial_en: null,
    estado: "em_andamento",
    estado_evidencia: "pendente",
    aguardando_quem: null,
  },
  {
    id: F(7),
    rodada_id: R_VVB_2,
    tipo: "car",
    identificador: "ID - 02",
    ordem: null,
    documento_alvo: "monitoramento",
    capitulo_ref: "Figures and tables",
    descricao_en:
      "Figures and tables of the MR are presented in Portuguese, while the programme requires English.",
    acao_exigida_en: "PP shall translate all figures and tables into English.",
    plano_resposta_pt:
      "Tradução figura por figura. É exatamente o tipo de finding que o campo bilíngue evita: o conteúdo saiu em português onde a norma exige inglês.",
    resposta_oficial_en: null,
    estado: "em_andamento",
    estado_evidencia: "pendente",
    aguardando_quem: null,
  },
  {
    id: F(8),
    rodada_id: R_VVB_2,
    tipo: "cl",
    identificador: "ID - 03",
    ordem: null,
    documento_alvo: "pdd",
    capitulo_ref: "Section 2.5",
    descricao_en:
      "Please clarify which instrument demonstrates the right of use over the project area.",
    acao_exigida_en: "PP shall provide the instrument and the corresponding legal opinion.",
    plano_resposta_pt: "Parecer solicitado. O finding não avança sem a área jurídica.",
    resposta_oficial_en: null,
    estado: "aguardando_terceiro",
    estado_evidencia: "pendente",
    // AREA, nunca pessoa: e o que o campo existe para registrar.
    aguardando_quem: "jurídico",
  },
  {
    id: F(9),
    rodada_id: R_VVB_2,
    tipo: "car",
    identificador: "ID - 04",
    ordem: null,
    documento_alvo: "monitoramento",
    capitulo_ref: "Section 4.1",
    descricao_en:
      "The MR does not present the deviation between the monitored and the ex ante estimated values.",
    acao_exigida_en: "PP shall include the deviation table and comment on the differences.",
    plano_resposta_pt: null,
    resposta_oficial_en: null,
    estado: "aberto",
    estado_evidencia: "pendente",
    aguardando_quem: null,
  },
  {
    id: F(10),
    rodada_id: R_VVB_2,
    tipo: "cl",
    identificador: "ID - 05",
    ordem: null,
    documento_alvo: "outro",
    capitulo_ref: "Geospatial buffer",
    descricao_en:
      "The buffer geometry provided does not close on itself and cannot be reprojected without error.",
    acao_exigida_en: "PP shall provide a valid vector file for the buffer area.",
    plano_resposta_pt: "Arquivo devolvido para a equipe de geoprocessamento refazer o buffer.",
    resposta_oficial_en: null,
    estado: "aguardando_terceiro",
    estado_evidencia: "pendente",
    aguardando_quem: "geoprocessamento (equipe externa)",
  },

  /* --- Verra, rodada 1 (tematicos, so CL) ------------------------------- */
  {
    id: F(11),
    rodada_id: R_VERRA_1,
    tipo: "cl",
    identificador: "Item 1",
    ordem: 1,
    documento_alvo: "outro",
    capitulo_ref: "Governance and representativeness",
    descricao_en:
      "Please describe how the representative body was chosen and how decisions are recorded.",
    acao_exigida_en: "PP shall describe the governance arrangement and the decision records.",
    plano_resposta_pt:
      "Rascunho em português. Decisão pendente: informar ou não o histórico completo de assembleias nesta resposta. Precisa de dono antes de virar texto oficial.",
    resposta_oficial_en: null,
    estado: "em_andamento",
    estado_evidencia: "pendente",
    aguardando_quem: null,
  },
  {
    id: F(12),
    rodada_id: R_VERRA_1,
    tipo: "cl",
    identificador: "Item 2",
    ordem: 2,
    documento_alvo: "outro",
    capitulo_ref: "Free, prior and informed consent",
    descricao_en:
      "Please demonstrate that the consent process followed the sequence required by the standard.",
    acao_exigida_en: "PP shall provide the consent records and the timeline of the process.",
    plano_resposta_pt: null,
    resposta_oficial_en: null,
    estado: "aberto",
    estado_evidencia: "pendente",
    aguardando_quem: null,
  },
  {
    id: F(13),
    rodada_id: R_VERRA_1,
    tipo: "cl",
    identificador: "Item 3",
    ordem: 3,
    documento_alvo: "outro",
    capitulo_ref: "Benefit sharing mechanism",
    descricao_en: "Please describe the benefit sharing mechanism and how it was agreed.",
    acao_exigida_en: "PP shall describe the mechanism and provide one example of agreement.",
    plano_resposta_pt: "Resposta consolidada e revisada em inglês antes do envio.",
    resposta_oficial_en:
      "The benefit sharing mechanism and the agreement model are described in the attached note.",
    estado: "respondido",
    estado_evidencia: "ok",
    aguardando_quem: null,
  },

  /* --- BeZero, rodada 1 (checklist de rating, sem tipo CAR/CL) ---------- */
  {
    id: F(14),
    rodada_id: R_BEZERO_1,
    tipo: null,
    identificador: "BZ - 04",
    ordem: 4,
    documento_alvo: "outro",
    capitulo_ref: "Project location/boundary",
    descricao_en:
      "Provide the project boundary as a vector file in an open format, consistent with the documentation, with area error below five percent.",
    acao_exigida_en: "Provide the vector file and the area reconciliation.",
    plano_resposta_pt: "Arquivo vetorial exportado. Falta fechar a conciliação de área.",
    resposta_oficial_en: null,
    estado: "em_andamento",
    estado_evidencia: "pendente",
    aguardando_quem: null,
  },
  {
    id: F(15),
    rodada_id: R_BEZERO_1,
    tipo: null,
    identificador: "BZ - 15",
    ordem: 15,
    documento_alvo: "outro",
    capitulo_ref: "Financial analysis",
    descricao_en:
      "Provide the financial model with and without carbon revenue, including capex, opex, cash flow, IRR and payback.",
    acao_exigida_en: "Provide the financial model and the assumptions behind it.",
    plano_resposta_pt: "Modelo depende da área financeira consolidar as premissas.",
    resposta_oficial_en: null,
    estado: "aguardando_terceiro",
    estado_evidencia: "pendente",
    aguardando_quem: "financeiro",
  },
  {
    id: F(16),
    rodada_id: R_BEZERO_1,
    tipo: null,
    identificador: "BZ - 20",
    ordem: 20,
    documento_alvo: "outro",
    capitulo_ref: "Resettlement and/or FPIC",
    descricao_en:
      "State whether the project area is inhabited and describe the status of the consent process.",
    acao_exigida_en: "Describe the status and provide the supporting records.",
    plano_resposta_pt: "Resposta enviada com os registros do processo.",
    resposta_oficial_en: "The area is inhabited and the consent process is described in the note.",
    estado: "respondido",
    estado_evidencia: "ok",
    aguardando_quem: null,
  },
  {
    id: F(17),
    rodada_id: R_BEZERO_1,
    tipo: null,
    identificador: "BZ - 09",
    ordem: 9,
    documento_alvo: "outro",
    capitulo_ref: "Harvest / Forest management plan",
    descricao_en: "Provide the harvest schedule and the forest management plan, where applicable.",
    acao_exigida_en: "Provide the plan or justify why it does not apply.",
    plano_resposta_pt:
      "Não se aplica: o projeto não prevê manejo madeireiro. Marcado como não aplicável para sair do denominador do checklist.",
    resposta_oficial_en: "Not applicable: the project does not include harvesting activities.",
    // Estado que faz o checklist poder fechar 100%. Sai do denominador dos DOIS eixos.
    estado: "nao_aplicavel",
    estado_evidencia: "nao_aplicavel",
    aguardando_quem: null,
  },
  {
    id: F(18),
    rodada_id: R_BEZERO_1,
    tipo: null,
    identificador: "BZ - 24",
    ordem: 24,
    documento_alvo: "outro",
    capitulo_ref: "Carbon accounting template",
    descricao_en:
      "Fill in the ex ante carbon accounting template for the whole crediting period, including leakage and buffer.",
    acao_exigida_en: "Provide the completed template.",
    plano_resposta_pt: null,
    resposta_oficial_en: null,
    estado: "aberto",
    estado_evidencia: "pendente",
    aguardando_quem: null,
  },
];

/**
 * Subitens. So dois findings usam checklist, e e o suficiente para a tela mostrar a
 * diferenca entre finding com progresso derivado e finding sem subitem (barra
 * ausente, nao barra em zero).
 */
const S = (n) => `00000000-0000-4000-8000-0000000007${String(n).padStart(2, "0")}`;

const SUBITENS_BRUTOS = [
  // F(6): a conferencia de italico, o caso literal do levantamento.
  [F(6), "Section 2.1.4 - nome científico em itálico", true],
  [F(6), "Section 2.3.12 - nome científico em itálico", true],
  [F(6), "Section 3.1.2 - nome científico em itálico", true],
  [F(6), "Section 4.2.1 - nome científico em itálico", true],
  [F(6), "Section 5.1 - nome científico em itálico", true],
  [F(6), "Section 5.2.2 - nome científico em itálico", false],
  [F(6), "Anexo I - lista de espécies", false],
  [F(6), "Anexo II - lista de espécies", false],
  // F(7): a traducao de figuras e tabelas.
  [F(7), "Figure 1 - traduzir legenda", true],
  [F(7), "Figure 2 - traduzir legenda", true],
  [F(7), "Table 3 - traduzir cabeçalho", false],
  [F(7), "Table 12 - traduzir cabeçalho", false],
  [F(7), "Table 22 - traduzir cabeçalho", false],
  [F(7), "Figure 8 - refazer com rótulos em inglês", false],
  // F(14): conciliacao de area da BeZero.
  [F(14), "Exportar limite em GeoJSON", true],
  [F(14), "Conferir área calculada contra a área declarada", false],
  [F(14), "Registrar a divergência encontrada", false],
];

/* ===== Estado em memoria ==================================================
   Comeca vazio e e montado na PRIMEIRA chamada de qualquer funcao demo*, nao no topo
   do modulo: ver a nota de bundle acima. Recarregar a pagina volta ao estado inicial,
   porque o modulo e reavaliado.                                                */

let rodadas = null;
let findings = null;
let subitens = null;

function garantirEstado() {
  if (rodadas) return;

  rodadas = RODADAS_INICIAIS.map((rodada) => ({ ...rodada }));
  findings = FINDINGS_INICIAIS.map((finding) => ({ ...PADROES_FINDING, ...finding }));
  subitens = SUBITENS_BRUTOS.map(([findingId, descricao, concluido], i) => ({
    id: S(i + 1),
    finding_id: findingId,
    descricao,
    concluido,
    // Ordem reiniciada por finding, como faz a criacao em lote no backend.
    ordem: SUBITENS_BRUTOS.slice(0, i).filter(([alvo]) => alvo === findingId).length,
    criado_em: CRIADO_EM_DEMO,
    atualizado_em: CRIADO_EM_DEMO,
  }));
}

/* ===== Acesso ao estado =================================================== */

function acharRodada(id, { obrigatorio = true } = {}) {
  const rodada = rodadas.find((r) => r.id === id) ?? null;
  if (!rodada && obrigatorio) throw new ErroDemo("nao_encontrado");
  return rodada;
}

function acharFinding(id) {
  const finding = findings.find((f) => f.id === id);
  if (!finding) throw new ErroDemo("nao_encontrado");
  return finding;
}

function acharSubitem(id) {
  const subitem = subitens.find((s) => s.id === id);
  if (!subitem) throw new ErroDemo("nao_encontrado");
  return subitem;
}

/* ===== Serializacao (mesmo formato de public.carbon_finding_json) ========= */

function serializarSubitem(subitem) {
  return { ...subitem };
}

function serializarFinding(finding) {
  const rodada = acharRodada(finding.rodada_id, { obrigatorio: false });
  const meus = subitens
    .filter((s) => s.finding_id === finding.id)
    .sort((a, b) => a.ordem - b.ordem || String(a.criado_em).localeCompare(String(b.criado_em)));
  const progresso = progressoDeSubitens(meus);

  return {
    id: finding.id,
    rodada_id: finding.rodada_id,
    projeto_id: rodada?.projeto_id ?? null,
    origem: rodada?.origem ?? null,
    rodada_numero: rodada?.numero ?? null,
    tipo: finding.tipo,
    identificador: finding.identificador,
    ordem: finding.ordem,
    documento_alvo: finding.documento_alvo,
    capitulo_ref: finding.capitulo_ref,
    capitulo_pdd_id: finding.capitulo_pdd_id,
    capitulo_pdd: null,
    capitulo_mr_id: finding.capitulo_mr_id,
    descricao_en: finding.descricao_en,
    acao_exigida_en: finding.acao_exigida_en,
    plano_resposta_pt: finding.plano_resposta_pt,
    resposta_oficial_en: finding.resposta_oficial_en,
    estado: finding.estado,
    estado_evidencia: finding.estado_evidencia,
    responsavel_id: finding.responsavel_id,
    // Nulo sempre: nao inventamos nome de pessoa em dataset de demonstracao (LGPD).
    responsavel_nome: null,
    aguardando_quem: finding.aguardando_quem,
    criado_em: finding.criado_em,
    atualizado_em: finding.atualizado_em,
    subitens: meus.map(serializarSubitem),
    subitens_total: progresso.total,
    subitens_concluidos: progresso.concluidos,
    subitens_pct: progresso.pct,
  };
}

/**
 * Mesma ordenacao do SQL: rodada (origem alfabetica, depois numero), posicao
 * declarada com nulos no fim, identificador com nulos no fim e, por ultimo, a data
 * de criacao, so para o resultado ser deterministico.
 */
function ordenarFindings(lista) {
  const chaveRodada = (finding) => {
    const rodada = acharRodada(finding.rodada_id, { obrigatorio: false });
    return { origem: rodada?.origem ?? "", numero: rodada?.numero ?? 0 };
  };

  const compararNulosNoFim = (a, b, comparar) => {
    if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1;
    if (b === null || b === undefined) return -1;
    return comparar(a, b);
  };

  return [...lista].sort((f1, f2) => {
    const r1 = chaveRodada(f1);
    const r2 = chaveRodada(f2);
    return (
      r1.origem.localeCompare(r2.origem, "pt-BR") ||
      r1.numero - r2.numero ||
      compararNulosNoFim(f1.ordem, f2.ordem, (a, b) => a - b) ||
      compararNulosNoFim(f1.identificador, f2.identificador, (a, b) =>
        String(a).localeCompare(String(b), "pt-BR")
      ) ||
      String(f1.criado_em).localeCompare(String(f2.criado_em))
    );
  });
}

/* ===== Validacao de escrita (espelho de montarDadosFinding) =============== */

const CAMPOS_TEXTO_LONGO = [
  "descricao_en",
  "acao_exigida_en",
  "plano_resposta_pt",
  "resposta_oficial_en",
];

/**
 * Aplica ao finding somente os campos permitidos, com a mesma validacao do backend.
 * Campo desconhecido e IGNORADO, nunca gravado.
 */
function aplicarCamposFinding(finding, dados, modo) {
  const entrada = dados && typeof dados === "object" ? dados : {};
  const veio = (campo) => Object.prototype.hasOwnProperty.call(entrada, campo);
  const alvo = {};

  if (modo === "criar" || veio("descricao_en")) {
    const descricao = texto(entrada.descricao_en);
    if (!descricao) throw new ErroDemo("campo_obrigatorio", "descricao_en");
    alvo.descricao_en = descricao;
  }
  for (const campo of CAMPOS_TEXTO_LONGO) {
    if (campo === "descricao_en") continue;
    if (veio(campo)) alvo[campo] = texto(entrada[campo]);
  }

  if (veio("tipo")) alvo.tipo = conferirEnum(entrada.tipo, TIPOS, "tipo");
  if (veio("documento_alvo")) {
    alvo.documento_alvo = conferirEnum(entrada.documento_alvo, DOCUMENTOS, "documento_alvo") ?? "outro";
  }
  if (veio("identificador")) alvo.identificador = texto(entrada.identificador);
  if (veio("ordem")) alvo.ordem = conferirInteiro(entrada.ordem, "ordem");
  if (veio("capitulo_ref")) alvo.capitulo_ref = texto(entrada.capitulo_ref);
  if (veio("capitulo_pdd_id")) alvo.capitulo_pdd_id = texto(entrada.capitulo_pdd_id);
  if (veio("capitulo_mr_id")) alvo.capitulo_mr_id = texto(entrada.capitulo_mr_id);
  if (veio("responsavel_id")) alvo.responsavel_id = texto(entrada.responsavel_id);
  if (veio("aguardando_quem")) alvo.aguardando_quem = texto(entrada.aguardando_quem);

  if (veio("estado")) {
    const estado = conferirEnum(entrada.estado, ESTADOS, "estado");
    if (!estado) throw new ErroDemo("campo_invalido", "estado");
    alvo.estado = estado;
  }
  if (veio("estado_evidencia")) {
    const evidencia = conferirEnum(entrada.estado_evidencia, ESTADOS_EVIDENCIA, "estado_evidencia");
    if (!evidencia) throw new ErroDemo("campo_invalido", "estado_evidencia");
    alvo.estado_evidencia = evidencia;
  }

  const resultado = { ...finding, ...alvo };

  // Mesma regra do check carbon_findings_aguardando_quem_chk e da conferencia da
  // Edge Function: esperar por terceiro sem dizer por quem e o problema que este
  // estado existe para resolver.
  if (resultado.estado === "aguardando_terceiro" && !texto(resultado.aguardando_quem)) {
    throw new ErroDemo("campo_obrigatorio", "aguardando_quem");
  }

  return { alvo, resultado };
}

/* ===== Funcoes que imitam o backend ====================================== */

/**
 * Carga da tela. Projeto sem rodada devolve listas vazias e progresso zerado, nunca
 * nulo - inclusive para um projeto criado no formulario de Projetos durante a
 * revisao, que nao tem finding nenhum.
 */
export async function demoObterFindings(projetoId, origem = null) {
  garantirEstado();
  await esperar();

  const origemFiltro = origem ? conferirEnum(origem, ORIGENS, "origem") : null;

  const rodadasDoProjeto = rodadas
    .filter((r) => r.projeto_id === projetoId)
    .filter((r) => !origemFiltro || r.origem === origemFiltro)
    .sort((a, b) => a.origem.localeCompare(b.origem, "pt-BR") || a.numero - b.numero);

  const idsRodadas = new Set(rodadasDoProjeto.map((r) => r.id));
  const doProjeto = findings.filter((f) => idsRodadas.has(f.rodada_id));

  return {
    rodadas: rodadasDoProjeto.map((r) => ({ ...r })),
    findings: ordenarFindings(doProjeto).map(serializarFinding),
    progresso: calcularProgressoFindings(doProjeto, subitens),
  };
}

/** Numero derivado (max + 1 no par projeto + origem), como a funcao SQL faz. */
export async function demoCriarRodadaAuditoria(projetoId, dados) {
  garantirEstado();
  await esperar();
  const entrada = dados && typeof dados === "object" ? dados : {};

  const origem = conferirEnum(entrada.origem, ORIGENS, "origem");
  if (!origem) throw new ErroDemo("campo_obrigatorio", "origem");

  const recebimento = conferirData(entrada.data_recebimento, "data_recebimento");
  const resposta = conferirData(entrada.data_resposta, "data_resposta");
  if (recebimento && resposta && resposta < recebimento) {
    throw new ErroDemo("periodo_invalido");
  }

  const maior = rodadas
    .filter((r) => r.projeto_id === projetoId && r.origem === origem)
    .reduce((max, r) => Math.max(max, r.numero), 0);

  const criadoEm = agora();
  const rodada = {
    id: novoId(),
    projeto_id: projetoId,
    origem,
    numero: maior + 1,
    data_recebimento: recebimento,
    data_resposta: resposta,
    observacoes: texto(entrada.observacoes),
    criado_por: null,
    criado_em: criadoEm,
    atualizado_em: criadoEm,
  };

  rodadas = [...rodadas, rodada];
  return { rodada: { ...rodada } };
}

export async function demoAtualizarRodadaAuditoria(rodadaId, dados) {
  garantirEstado();
  await esperar();
  const rodada = acharRodada(rodadaId);
  const entrada = dados && typeof dados === "object" ? dados : {};
  const veio = (campo) => Object.prototype.hasOwnProperty.call(entrada, campo);

  const alvo = {};
  if (veio("data_recebimento")) {
    alvo.data_recebimento = conferirData(entrada.data_recebimento, "data_recebimento");
  }
  if (veio("data_resposta")) {
    alvo.data_resposta = conferirData(entrada.data_resposta, "data_resposta");
  }
  if (veio("observacoes")) alvo.observacoes = texto(entrada.observacoes);

  if (Object.keys(alvo).length === 0) throw new ErroDemo("nada_para_atualizar");

  const futuro = { ...rodada, ...alvo };
  if (
    futuro.data_recebimento &&
    futuro.data_resposta &&
    futuro.data_resposta < futuro.data_recebimento
  ) {
    throw new ErroDemo("periodo_invalido");
  }

  Object.assign(rodada, alvo, { atualizado_em: agora() });
  return { rodada: { ...rodada } };
}

export async function demoCriarFinding(rodadaId, dados) {
  garantirEstado();
  await esperar();
  acharRodada(rodadaId);

  const base = {
    id: novoId(),
    rodada_id: rodadaId,
    tipo: null,
    identificador: null,
    ordem: null,
    documento_alvo: "outro",
    capitulo_ref: null,
    capitulo_pdd_id: null,
    capitulo_mr_id: null,
    descricao_en: null,
    acao_exigida_en: null,
    plano_resposta_pt: null,
    resposta_oficial_en: null,
    estado: "aberto",
    estado_evidencia: "pendente",
    responsavel_id: null,
    aguardando_quem: null,
    criado_por: null,
    criado_em: agora(),
    atualizado_em: agora(),
  };

  const { resultado } = aplicarCamposFinding(base, dados, "criar");
  findings = [...findings, resultado];
  return { finding: serializarFinding(resultado) };
}

export async function demoAtualizarFinding(findingId, dados) {
  garantirEstado();
  await esperar();
  const finding = acharFinding(findingId);

  const { alvo } = aplicarCamposFinding(finding, dados, "atualizar");
  if (Object.keys(alvo).length === 0) throw new ErroDemo("nada_para_atualizar");

  Object.assign(finding, alvo, { atualizado_em: agora() });
  return { finding: serializarFinding(finding) };
}

/**
 * Cria subitens, um ou muitos. Aceita `{ descricao }` e `{ descricoes: [...] }`, e a
 * ordem continua a numeracao que o finding ja tem - o mesmo comportamento da rota.
 */
export async function demoCriarSubitensFinding(findingId, dados) {
  garantirEstado();
  await esperar();
  const finding = acharFinding(findingId);
  const entrada = dados && typeof dados === "object" ? dados : {};

  const lista = [];
  if (Array.isArray(entrada.descricoes)) {
    if (entrada.descricoes.length > 100) throw new ErroDemo("campo_invalido", "descricoes");
    for (const item of entrada.descricoes) {
      const limpo = texto(item);
      if (limpo) lista.push(limpo);
    }
  }
  const unica = texto(entrada.descricao);
  if (unica) lista.push(unica);

  if (lista.length === 0) throw new ErroDemo("campo_obrigatorio", "descricao");

  const maior = subitens
    .filter((s) => s.finding_id === findingId)
    .reduce((max, s) => Math.max(max, s.ordem), -1);

  const criadoEm = agora();
  const novos = lista.map((descricao, i) => ({
    id: novoId(),
    finding_id: findingId,
    descricao,
    concluido: false,
    ordem: maior + 1 + i,
    criado_em: criadoEm,
    atualizado_em: criadoEm,
  }));

  subitens = [...subitens, ...novos];
  return { criados: novos.length, finding: serializarFinding(finding) };
}

export async function demoAtualizarSubitemFinding(subitemId, dados) {
  garantirEstado();
  await esperar();
  const subitem = acharSubitem(subitemId);
  const entrada = dados && typeof dados === "object" ? dados : {};
  const veio = (campo) => Object.prototype.hasOwnProperty.call(entrada, campo);

  const alvo = {};
  if (veio("concluido")) {
    if (typeof entrada.concluido !== "boolean") throw new ErroDemo("campo_invalido", "concluido");
    alvo.concluido = entrada.concluido;
  }
  if (veio("descricao")) {
    const descricao = texto(entrada.descricao);
    if (!descricao) throw new ErroDemo("campo_obrigatorio", "descricao");
    alvo.descricao = descricao;
  }
  if (veio("ordem")) {
    const ordem = conferirInteiro(entrada.ordem, "ordem");
    if (ordem === null) throw new ErroDemo("campo_invalido", "ordem");
    alvo.ordem = ordem;
  }

  if (Object.keys(alvo).length === 0) throw new ErroDemo("nada_para_atualizar");

  Object.assign(subitem, alvo, { atualizado_em: agora() });
  // Devolve o FINDING, como a rota: marcar item muda o progresso agregado.
  return { finding: serializarFinding(acharFinding(subitem.finding_id)) };
}

export async function demoRemoverSubitemFinding(subitemId) {
  garantirEstado();
  await esperar();
  const subitem = acharSubitem(subitemId);
  const findingId = subitem.finding_id;

  subitens = subitens.filter((s) => s.id !== subitemId);
  return { finding: serializarFinding(acharFinding(findingId)) };
}

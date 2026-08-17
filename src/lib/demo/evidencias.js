/**
 * demo/evidencias.js - dataset de demonstracao do checklist de evidencias (issue #4).
 *
 * POR QUE EXISTE: o projeto Supabase do Apsis Carbon ainda NAO foi provisionado, e a
 * tela precisa ser revisavel localmente antes disso. Em MODO_DEMO (ver
 * src/lib/runtimeConfig.js: exige dev E VITE_CARBON_DEMO=true) as funcoes de
 * src/lib/api/evidencias.js nao fazem rede: operam sobre o estado em memoria deste
 * arquivo, e as mutacoes ALTERAM esse estado, para a tela ser de fato interativa.
 *
 * ESCOPO: isto nao e cache nem persistencia. Recarregar a pagina volta ao estado
 * inicial. Vale SOMENTE em desenvolvimento: em build de producao MODO_DEMO e false
 * por forca (import.meta.env.DEV e estatico) e o bundler elimina os ramos que chamam
 * este modulo.
 *
 * FIDELIDADE E O PONTO. As regras de calculo aqui sao as MESMAS da funcao SQL
 * public.carbon_evidencias_progresso (migration 20260814092000_evidencias):
 *   - dois eixos INDEPENDENTES, resposta e evidencia;
 *   - em cada eixo, 'nao_aplicavel' sai do DENOMINADOR daquele eixo;
 *   - 'anexada' nao conta como concluido no eixo da evidencia (aceita e o que fecha);
 *   - percentual com UMA casa decimal, igual ao round(..., 1) do SQL.
 * Se as duas contas divergirem, a revisao passa a ver numero que a producao nunca
 * produz. Por isso a regra esta escrita uma vez em calcularProgressoEvidencias e o
 * resto do arquivo so a chama.
 *
 * LGPD: nenhum dado pessoal e nenhum dado de cliente. As anotacoes de exemplo sao
 * ficticias e nao citam pessoa nem empresa. A lista de exigencias nao e dado de
 * cliente: e o que o padrao VCS+CCB pede de qualquer projeto, transcrito de
 * docs/notion/08-monitoring-report.md.
 */

import { demoObterProjeto } from '@/lib/demoProjetos';

/* ===== Erro tipado ========================================================
   O demo precisa recusar entrada invalida com os MESMOS codigos do backend
   (nao_encontrado, status_invalido, campo_invalido), senao a tela trataria erro de
   validacao de um jeito no demo e de outro em producao. Nao lancamos ErroApi aqui
   de proposito: quem converte e o chamarDemo de src/lib/api/base.js, e importar
   ErroApi no dataset criaria ciclo entre dados e transporte.

   Classe propria em vez de reaproveitar a de src/lib/demoProjetos.js: um dominio
   nao deve depender do dataset de outro para ter erro. O contrato exigido pelo
   chamarDemo e so a propriedade `codigo`.                                     */
export class ErroDemo extends Error {
  constructor(codigo) {
    super(`Recusado pelo modo demonstracao: ${codigo}`);
    this.name = 'ErroDemo';
    this.codigo = codigo;
  }
}

/* ===== Template VCS+CCB ===================================================
   Os 26 itens capturados em docs/notion/08-monitoring-report.md (base "Auditing
   Documents"). MESMO texto, MESMOS codigos e MESMA ordem do seed SQL da migration
   20260814092000_evidencias: se divergirem, o checklist do demo nao e o checklist
   que a producao cria.

   O nome da SECAO fica em ingles porque e por ele que a validadora cobra o item; o
   texto da exigencia fica em portugues porque e assim que a equipe o registra.   */
const TEMPLATE_BRUTO = [
  ['GERAL-01', 'Geral', 'Versão em Word do PD CCB VCS'],
  ['GERAL-02', 'Geral', 'Planilha de cálculo do NPR (com acesso ao project hub do VERRA)'],
  ['CCB-01', 'CCB unique benefits', 'Evidência dos benefícios estimados: matriz de extrapolação dos benefícios CCB'],
  ['PA-01', 'Project Area', 'Arquivo KML da área do projeto e da zona CCB'],
  ['PA-02', 'Project Area', 'Mapas de uso e cobertura do solo (LULC), cobertura florestal e imagens de satélite em formato verificável'],
  ['PA-03', 'Project Area', 'GeoPDF da área do projeto'],
  ['OWN-01', 'Ownership', 'Acordo assinado entre o proponente e os proprietários da área'],
  ['OWN-02', 'Ownership', 'Acordos e memorandos de entendimento (MoU) entre o proponente e outras entidades'],
  ['PSD-01', 'Project start date', 'Evidência da data de início do projeto (uma ou várias)'],
  ['PCP-01', 'Project crediting period', 'Planilha de cálculo das reduções e remoções de GEE (ERR sheet)'],
  ['PCP-02', 'Project crediting period', 'Planilhas de cálculo de suporte à ERR sheet'],
  ['IMP-01', 'Implementation schedule', 'Evidência dos marcos de desenvolvimento e implementação previstos no PD'],
  ['IMP-02', 'Implementation schedule', 'Licenças ambientais exigidas para o estabelecimento do projeto'],
  ['DC-01', 'Double Counting and Participation under Other GHG Programs', 'Declaração de que o projeto não está registrado, não foi rejeitado e não recebe crédito em outro programa de GEE'],
  ['DCL-01', 'Double claiming', 'Declaração de que o projeto não recebe crédito de outro sistema ambiental'],
  ['SD-01', 'Sustainable Development Contributions', 'Evidência dos benefícios estimados: matriz de contribuições de desenvolvimento sustentável'],
  ['STK-01', 'Stakeholder identification and consultation', 'Documentos de consentimento livre, prévio e informado (CLPI/FPIC)'],
  ['STK-02', 'Stakeholder identification and consultation', 'Registros das reuniões de consulta: atas e fotos'],
  ['STK-03', 'Stakeholder identification and consultation', 'Demais documentos que comprovam a condução do CLPI/FPIC'],
  ['MGT-01', 'Management Capacity', 'Evidência da estrutura de governança: modelo de governança e currículos da equipe técnica'],
  ['SOP-01', 'SOP', 'Procedimento operacional padrão (SOP) das medições de biomassa'],
  ['SOP-02', 'SOP', 'Plano de garantia e controle de qualidade (QA/QC)'],
  ['MON-01', 'Monitoring plan', 'Community Monitoring Plan'],
  ['MON-02', 'Monitoring plan', 'Biodiversity Monitoring Plan'],
  ['MON-03', 'Monitoring plan', 'Adaptive Management Plan (relevante para o NPR)'],
  ['OTH-01', 'Others', 'Coordenadas de amostragem: centroides das parcelas do inventário'],
];

/**
 * Template pronto para uso, montado na PRIMEIRA CHAMADA e nao no topo do modulo.
 *
 * `ordem` e DERIVADA da posicao, de 10 em 10 como no seed SQL, em vez de digitada:
 * derivar elimina a classe de erro mais provavel numa lista deste tamanho, que e uma
 * ordem repetida no meio e ninguem percebe na revisao.
 *
 * POR QUE FUNCAO E NAO `const` DE TOPO (verificado no bundle, nao suposto): com
 * MODO_DEMO dobrado para false, o Rollup elimina as funcoes demo* deste arquivo, mas
 * NAO um `.map()` executado no topo do modulo - ele nao consegue provar que a
 * chamada e livre de efeito colateral, e as 26 exigencias iam para o bundle de
 * producao (e o mesmo acontece hoje em src/lib/demoProjetos.js, que registra a
 * observacao e aponta esta saida). Adiando para a primeira chamada, o modulo passa a
 * nao ter efeito nenhum no topo e o Rollup remove o arquivo inteiro do build.
 */
let templatePronto = null;

function templateEvidencias() {
  if (templatePronto === null) {
    templatePronto = TEMPLATE_BRUTO.map(([codigo, secao, exigencia], i) => ({
      codigo,
      secao,
      exigencia,
      ordem: (i + 1) * 10,
    }));
  }
  return templatePronto;
}

/* Espelham os CHECK de carbon_evidencia_itens. */
const STATUS_RESPOSTA_VALIDOS = ['nao_iniciado', 'em_andamento', 'concluido', 'nao_aplicavel'];
const ESTADO_EVIDENCIA_VALIDOS = ['pendente', 'anexada', 'aceita', 'nao_aplicavel'];
const ENCAMINHAMENTOS_VALIDOS = ['juridico', 'tecnico', 'externo'];

/* Mesmo filtro da funcao SQL (where t.standard = v_standard): projeto criado no
   formulario com outro standard recebe zero itens, igual a producao. Instanciar o
   template de qualquer jeito faria o demo demonstrar comportamento que a producao
   nunca produz, e esconderia justamente o caso que a tela precisa avisar. */
const STANDARDS_COM_TEMPLATE = ['VCS+CCB'];

/* ===== Utilitarios ======================================================== */

/** Espera curta para os estados de carregamento da tela aparecerem no demo. */
const esperar = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

function arredondar(valor, casas) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function novoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback so para ambiente sem crypto.randomUUID (nao ocorre nos navegadores alvo).
  return `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
}

const agora = () => new Date().toISOString();

/* ===== Progresso ==========================================================
   MESMA regra da funcao SQL public.carbon_evidencias_progresso. Ver o cabecalho do
   arquivo: os dois eixos sao independentes e, em cada um, 'nao_aplicavel' sai do
   denominador DAQUELE eixo.                                                    */
export function calcularProgressoEvidencias(itens) {
  const lista = Array.isArray(itens) ? itens : [];

  const contarResposta = (status) => lista.filter((i) => i?.status_resposta === status).length;
  const contarEvidencia = (estado) => lista.filter((i) => i?.estado_evidencia === estado).length;

  const respostaTotal = lista.filter((i) => i?.status_resposta !== 'nao_aplicavel').length;
  const respostaConcluidos = contarResposta('concluido');

  const evidenciaTotal = lista.filter((i) => i?.estado_evidencia !== 'nao_aplicavel').length;
  const evidenciaAceitas = contarEvidencia('aceita');

  // por_secao: a secao herda a MENOR ordem dos seus itens, e e por ela que as secoes
  // sao ordenadas - identico ao min(ordem) e ao "order by ps.ordem, ps.secao" do SQL.
  const porSecao = new Map();
  for (const item of lista) {
    const secao = String(item?.secao ?? '');
    const atual = porSecao.get(secao) || {
      secao,
      ordem: Number(item?.ordem) || 0,
      itens: 0,
      resposta_total: 0,
      resposta_concluidos: 0,
      evidencia_total: 0,
      evidencia_aceitas: 0,
    };
    atual.ordem = Math.min(atual.ordem, Number(item?.ordem) || 0);
    atual.itens += 1;
    if (item?.status_resposta !== 'nao_aplicavel') atual.resposta_total += 1;
    if (item?.status_resposta === 'concluido') atual.resposta_concluidos += 1;
    if (item?.estado_evidencia !== 'nao_aplicavel') atual.evidencia_total += 1;
    if (item?.estado_evidencia === 'aceita') atual.evidencia_aceitas += 1;
    porSecao.set(secao, atual);
  }

  // Uma casa decimal e guarda contra divisao por zero, igual ao SQL.
  const pct = (parte, total) => (total === 0 ? 0 : arredondar((parte * 100) / total, 1));

  return {
    itens: lista.length,
    resposta: {
      total: respostaTotal,
      concluidos: respostaConcluidos,
      em_andamento: contarResposta('em_andamento'),
      nao_aplicaveis: contarResposta('nao_aplicavel'),
      pct: pct(respostaConcluidos, respostaTotal),
    },
    evidencia: {
      total: evidenciaTotal,
      aceitas: evidenciaAceitas,
      anexadas: contarEvidencia('anexada'),
      pendentes: contarEvidencia('pendente'),
      nao_aplicaveis: contarEvidencia('nao_aplicavel'),
      pct: pct(evidenciaAceitas, evidenciaTotal),
    },
    encaminhados: lista.filter((i) => Boolean(i?.encaminhado_para)).length,
    // Item com resposta nao aplicavel e evidencia ainda pendente: na maioria dos
    // casos e um eixo marcado e o outro esquecido, e cada um desses deixa o eixo da
    // evidencia sem fechar. A tela avisa; nem o banco nem o demo bloqueiam.
    na_com_evidencia_pendente: lista.filter(
      (i) => i?.status_resposta === 'nao_aplicavel' && i?.estado_evidencia === 'pendente',
    ).length,
    por_secao: [...porSecao.values()]
      .sort((a, b) => a.ordem - b.ordem || a.secao.localeCompare(b.secao, 'pt-BR'))
      .map((s) => ({
        ...s,
        resposta_pct: pct(s.resposta_concluidos, s.resposta_total),
        evidencia_pct: pct(s.evidencia_aceitas, s.evidencia_total),
      })),
  };
}

/* ===== Estado inicial de demonstracao =====================================
   Mesmo id do projeto de demonstracao de src/lib/demoProjetos.js. Se aquele id
   mudar, este projeto simplesmente cai no ESTADO VAZIO da tela, com o botao "criar
   checklist a partir do template" - que continua funcionando. Falha benigna de
   proposito, para o acoplamento entre os dois datasets nao ser silencioso e grave.  */
const PROJETO_DEMO_ID = '00000000-0000-4000-8000-000000000001';
const CRIADO_EM_DEMO = '2026-03-02T13:00:00.000Z';

/**
 * Estado inicial por codigo:
 *   [status_resposta, estado_evidencia, encaminhado_para, documentos, observacoes]
 *
 * A combinacao foi escolhida para a tela PROVAR, com numero na tela, o criterio de
 * aceite da issue #4:
 *   - MON-02 esta com a resposta CONCLUIDA e a evidencia PENDENTE (os dois eixos
 *     andam separados; nenhuma tela pode mostrar so um deles);
 *   - MON-03 e nao aplicavel nos DOIS eixos, e sai dos dois denominadores;
 *   - OTH-01 e nao aplicavel na resposta mas com evidencia PENDENTE, que e o caso
 *     que a tela precisa avisar (senao o eixo da evidencia nunca fecha);
 *   - STK-01 e STK-02 compartilham documento, que e o muitos-para-muitos;
 *   - tres itens estao encaminhados a outra area, o que no Notion era o "status"
 *     Juridico.
 * Com isso os dois percentuais dao numeros DIFERENTES (58,3% de resposta e 36% de
 * evidencia), o que e o objetivo: um checklist com um percentual so escondia
 * exatamente essa diferenca.
 */
const ESTADO_INICIAL_DEMO = {
  'GERAL-01': ['concluido', 'aceita', null, 1, null],
  'GERAL-02': ['concluido', 'anexada', null, 1, 'Planilha entregue; aguardando o aceite da validadora.'],
  'CCB-01': ['em_andamento', 'pendente', null, 0, null],
  'PA-01': ['concluido', 'aceita', null, 2, null],
  'PA-02': ['concluido', 'anexada', null, 3, 'Mapas exportados do QGIS. Conferir se o formato atende ao pedido da validadora.'],
  'PA-03': ['em_andamento', 'pendente', null, 0, null],
  'OWN-01': ['concluido', 'anexada', 'juridico', 1, 'No jurídico para conferência das assinaturas antes do envio.'],
  'OWN-02': ['em_andamento', 'pendente', 'juridico', 0, null],
  'PSD-01': ['concluido', 'aceita', null, 2, null],
  'PCP-01': ['concluido', 'aceita', null, 1, null],
  'PCP-02': ['em_andamento', 'anexada', null, 2, null],
  'IMP-01': ['em_andamento', 'pendente', null, 0, null],
  'IMP-02': ['nao_iniciado', 'pendente', 'externo', 0, 'Depende da renovação da licença junto ao órgão ambiental.'],
  'DC-01': ['concluido', 'aceita', null, 1, null],
  'DCL-01': ['concluido', 'anexada', null, 1, null],
  'SD-01': ['em_andamento', 'pendente', null, 0, null],
  'STK-01': ['concluido', 'aceita', null, 2, 'A mesma ata de consulta satisfaz também os itens STK-02 e STK-03.'],
  'STK-02': ['concluido', 'aceita', null, 2, null],
  'STK-03': ['em_andamento', 'anexada', null, 1, null],
  'MGT-01': ['nao_iniciado', 'pendente', null, 0, null],
  'SOP-01': ['concluido', 'aceita', null, 1, null],
  'SOP-02': ['em_andamento', 'pendente', null, 0, null],
  'MON-01': ['concluido', 'aceita', null, 1, null],
  'MON-02': ['concluido', 'pendente', null, 0, 'Resposta redigida, mas o plano de monitoramento de biodiversidade em si ainda não foi anexado.'],
  'MON-03': ['nao_aplicavel', 'nao_aplicavel', null, 0, 'A equipe decidiu não pleitear este item nesta verificação.'],
  'OTH-01': ['nao_aplicavel', 'pendente', null, 0, 'Resposta não se aplica, mas a validadora ainda pode pedir a declaração: a evidência segue pendente.'],
};

function instanciarTemplate(projetoId, { comEstadoInicial = false } = {}) {
  return templateEvidencias().map((linha) => {
    const inicial = comEstadoInicial ? ESTADO_INICIAL_DEMO[linha.codigo] : null;
    const [status, estado, encaminhado, documentos, observacoes] = inicial || [];
    return {
      id: novoId(),
      projeto_id: projetoId,
      codigo: linha.codigo,
      secao: linha.secao,
      exigencia: linha.exigencia,
      ordem: linha.ordem,
      status_resposta: status || 'nao_iniciado',
      estado_evidencia: estado || 'pendente',
      responsavel_id: null,
      responsavel_nome: null,
      encaminhado_para: encaminhado || null,
      observacoes: observacoes || null,
      /* NAO e coluna do banco: em producao a Edge Function conta os vinculos em
         carbon_documento_vinculos e acrescenta este campo ao payload. Fica junto do
         item aqui porque o formato do payload precisa ser o mesmo. */
      documentos_vinculados: Number(documentos) || 0,
      criado_em: CRIADO_EM_DEMO,
      atualizado_em: CRIADO_EM_DEMO,
    };
  });
}

/**
 * projeto_id -> lista de itens. Projeto novo nasce SEM checklist, de proposito: e
 * assim que se revisa o estado vazio e o botao "criar do template".
 *
 * Criado na primeira leitura, pelo mesmo motivo do template: chamada no topo do
 * modulo sobrevive ao tree-shaking e levaria o dataset ficticio para o bundle de
 * producao.
 */
let itensPorProjeto = null;

function estado() {
  if (itensPorProjeto === null) {
    itensPorProjeto = {
      [PROJETO_DEMO_ID]: instanciarTemplate(PROJETO_DEMO_ID, { comEstadoInicial: true }),
    };
  }
  return itensPorProjeto;
}

/* ===== Serializacao (mesmo formato da Edge Function) ====================== */

/**
 * vinculos_disponiveis = true no demo porque o dominio de Documentos faz parte da
 * mesma entrega. Em producao a Edge Function devolve false enquanto a tabela
 * carbon_documento_vinculos nao existir, e a tela avisa em vez de mostrar zero
 * documento em todos os itens - ver o comentario de contarVinculos em
 * supabase/functions/carbon-api/rotas/evidencias.ts.
 */
function estadoChecklist(projetoId) {
  const itens = [...(estado()[projetoId] || [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((item) => ({ ...item }));

  return {
    itens,
    progresso: calcularProgressoEvidencias(itens),
    vinculos_disponiveis: true,
  };
}

/* ===== Funcoes que imitam o backend ====================================== */

/**
 * A existencia do projeto e o standard dele vem do dataset de Projetos, e nao de uma
 * copia local: o filtro por standard e regra da funcao SQL
 * carbon_evidencias_criar_do_template, e reproduzi-la exige saber o standard do
 * projeto de verdade. demoObterProjeto ja lanca 'nao_encontrado' quando o id nao
 * existe, exatamente como a rota faz com o 404.
 */
async function projetoDoDemo(projetoId) {
  const resposta = await demoObterProjeto(projetoId);
  return resposta?.projeto ?? null;
}

export async function demoObterEvidencias(projetoId) {
  await projetoDoDemo(projetoId);
  return estadoChecklist(projetoId);
}

/**
 * Imita public.carbon_evidencias_criar_do_template: copia do template so o que ainda
 * nao existe no projeto e devolve quantos foram criados. Idempotente de proposito -
 * clicar duas vezes no botao nao duplica item e nao sobrescreve estado nenhum.
 */
export async function demoCriarEvidenciasDoTemplate(projetoId) {
  const projeto = await projetoDoDemo(projetoId);

  const mapa = estado();
  const existentes = mapa[projetoId] || [];
  const codigos = new Set(existentes.map((i) => i.codigo));
  const doTemplate = STANDARDS_COM_TEMPLATE.includes(projeto?.standard)
    ? instanciarTemplate(projetoId)
    : [];
  const novos = doTemplate.filter((i) => !codigos.has(i.codigo));

  itensPorProjeto = {
    ...mapa,
    [projetoId]: [...existentes, ...novos],
  };

  return { criados: novos.length, ...estadoChecklist(projetoId) };
}

export async function demoAtualizarItemEvidencia(itemId, dados) {
  await esperar();

  let alvo = null;
  for (const lista of Object.values(estado())) {
    const achado = lista.find((i) => i.id === itemId);
    if (achado) {
      alvo = achado;
      break;
    }
  }
  if (!alvo) throw new ErroDemo('nao_encontrado');

  // Lista branca igual a do PATCH /evidencia-itens/:id. Os dois eixos sao gravados
  // de forma INDEPENDENTE: marcar a resposta como nao aplicavel nao mexe na
  // evidencia, e o inverso tambem nao.
  if (dados?.status_resposta !== undefined) {
    if (!STATUS_RESPOSTA_VALIDOS.includes(dados.status_resposta)) {
      throw new ErroDemo('status_invalido');
    }
    alvo.status_resposta = dados.status_resposta;
  }

  if (dados?.estado_evidencia !== undefined) {
    if (!ESTADO_EVIDENCIA_VALIDOS.includes(dados.estado_evidencia)) {
      throw new ErroDemo('status_invalido');
    }
    alvo.estado_evidencia = dados.estado_evidencia;
  }

  if (dados?.responsavel_id !== undefined) {
    alvo.responsavel_id = dados.responsavel_id || null;
  }

  if (dados?.encaminhado_para !== undefined) {
    // null e '' limpam o encaminhamento, igual ao lerEnum do backend.
    const valor = dados.encaminhado_para || null;
    if (valor !== null && !ENCAMINHAMENTOS_VALIDOS.includes(valor)) {
      throw new ErroDemo('campo_invalido');
    }
    alvo.encaminhado_para = valor;
  }

  if (dados?.observacoes !== undefined) {
    const texto = String(dados.observacoes ?? '').trim();
    alvo.observacoes = texto || null;
  }

  alvo.atualizado_em = agora();
  return { item: { ...alvo } };
}

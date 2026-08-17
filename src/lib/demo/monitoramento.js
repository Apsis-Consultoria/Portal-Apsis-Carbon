/**
 * demo/monitoramento.js - dataset de demonstração da tela de relatório de monitoramento.
 *
 * POR QUE EXISTE: o projeto Supabase do Apsis Carbon ainda NÃO foi provisionado, e a tela
 * precisa ser revisável localmente antes disso. Em MODO_DEMO (ver src/lib/runtimeConfig.js:
 * exige dev E VITE_CARBON_DEMO=true) as funções de src/lib/api/monitoramento.js não fazem
 * rede: operam sobre o estado em memória deste arquivo, e as mutações ALTERAM esse estado,
 * para a tela ser de fato interativa - inclusive o gesto central da issue, que é abrir uma
 * nova rodada de revisão e ver o número da volta subir.
 *
 * ESCOPO: isto não é cache nem persistência. Recarregar a página volta ao estado inicial.
 * Vale SOMENTE em desenvolvimento: em build de produção MODO_DEMO é false por força
 * (import.meta.env.DEV é estático) e o bundler elimina os ramos que chamam este módulo.
 *
 * AS REGRAS DE CÁLCULO SÃO AS MESMAS DO SQL, de propósito. calcularProgressoMonitoramento
 * abaixo é a tradução linha a linha de public.carbon_mr_progresso: mesmo denominador
 * (nao_aplicavel fora), mesmo arredondamento de uma casa, mesma apuração de rodada máxima.
 * Se as duas divergirem, a revisão do dono mostra um número que a produção nunca produz e
 * a divergência só aparece depois do provisionamento.
 *
 * LGPD: nenhum dado pessoal, nenhum nome de pessoa, nenhum cliente real. Os textos de
 * orientação e de observação são fictícios e genéricos. A estrutura de capítulos não é dado
 * de cliente: é a estrutura do padrão VCS + CCB transcrita de
 * docs/notion/08-monitoring-report.md.
 */

import { demoObterProjeto } from '@/lib/demoProjetos';

/* ===== Erro tipado ========================================================
   O demo precisa recusar entrada inválida com os MESMOS códigos do backend
   (estado_invalido, rodada_invalida, campo_invalido, nao_encontrado), senão a tela
   trataria erro de validação de um jeito no demo e de outro em produção.

   Classe própria, e não a ErroDemo de src/lib/demoProjetos.js, por dois motivos: quem
   converte o erro em ErroApi (chamarDemo, em src/lib/api/base.js) só olha a propriedade
   `codigo`, e acoplar este dataset ao dataset de outro domínio faria um mudar quando o
   outro mudasse. Nunca lançamos ErroApi aqui: importar o módulo de transporte no módulo
   de dados criaria ciclo.                                                   */
export class ErroDemoMonitoramento extends Error {
  constructor(codigo) {
    super(`Recusado pelo modo demonstracao: ${codigo}`);
    this.name = 'ErroDemoMonitoramento';
    this.codigo = codigo;
  }
}

/* ===== Template do Monitoring Report (VCS + CCB) ==========================
   Transcrição literal de docs/notion/08-monitoring-report.md. Os nomes ficam em INGLÊS
   porque é assim que a submissão ao registro exige.

   ATENÇÃO À NUMERAÇÃO: a estrutura observada PULA o segundo nível - os capítulos raiz
   são 1 a 5 e os subcapítulos aparecem direto em terceiro nível (4.1.1, 5.4.1). Os
   capítulos 1 Summary, 2 Project Details e 3 Climate não têm subcapítulo nenhum. Isso é
   o dado real; não inventamos os níveis 2 que "fechariam" a árvore.

   `cap`, `nivel` e `ordem` são DERIVADOS da numeração, e não digitados: derivar elimina a
   classe de erro mais provável numa lista deste tamanho (um nível ou um capítulo raiz
   errado numa linha do meio, que ninguém percebe na revisão). É a mesma escolha do
   template de PDD em src/lib/demoProjetos.js.                                */
const TEMPLATE_BRUTO = [
  ['1', 'Summary'],
  ['2', 'Project Details'],
  ['3', 'Climate'],
  ['4', 'Community'],
  ['4.1.1', 'Community Impacts'],
  ['4.1.2', 'Negative Community Impact Mitigation'],
  ['4.1.3', 'Net Positive Community Well-Being'],
  ['4.1.4', 'Protection of High Conservation Values'],
  ['4.2.1', 'Mitigation of Negative Impacts on Other Stakeholders'],
  ['4.2.2', 'Net Impacts on Other Stakeholders'],
  ['4.3.1', 'Community Monitoring Plan'],
  ['4.3.2', 'Monitoring Plan Dissemination'],
  ['4.4.1', 'Short-term and Long-term Community Benefits'],
  ['4.4.2', 'Marginalized and/or Vulnerable Community Groups'],
  ['4.4.3', 'Net Impacts on Women'],
  ['4.4.4', 'Benefit Sharing Mechanisms'],
  ['4.4.5', 'Governance and Implementation Structures'],
  ['4.4.6', 'Smallholders/Community Members Capacity Development'],
  ['5', 'Biodiversity'],
  ['5.1.1', 'Biodiversity Changes'],
  ['5.1.2', 'Mitigation Actions'],
  ['5.1.3', 'Net Positive Biodiversity Impacts'],
  ['5.1.4', 'High Conservation Values Protected'],
  ['5.1.5', 'Species Used'],
  ['5.1.6', 'Invasive Species'],
  ['5.1.7', 'GMO Exclusion'],
  ['5.1.8', 'Inputs Justification'],
  ['5.2.1', 'Negative Offsite Biodiversity Impacts and Mitigation Actions'],
  ['5.2.2', 'Net Offsite Biodiversity Benefits'],
  ['5.3.1', 'Biodiversity Monitoring Plan'],
  ['5.3.2', 'Biodiversity Monitoring Plan Dissemination'],
  ['5.4.1', 'Trigger Species Population Trends'],
];

/* NOTA DE BUNDLE (o mesmo comportamento já verificado em src/lib/demoProjetos.js): com
   MODO_DEMO dobrado para false, o Rollup elimina do build de produção as funções demo* e o
   estado deste arquivo, mas NÃO esta lista - ele não consegue provar que um .map() de topo
   de módulo é livre de efeito colateral. Sobram poucos KB com a numeração e os títulos dos
   32 capítulos. É aceitável de propósito: é metodologia PÚBLICA do padrão VCS+CCB, não é
   dado de cliente e não é dado pessoal. */
export const TEMPLATE_MR_VCS_CCB = TEMPLATE_BRUTO.map(([capitulo, nome], i) => ({
  capitulo,
  nome,
  cap: Number(capitulo.split('.')[0]),
  nivel: capitulo.split('.').length,
  ordem: (i + 1) * 10,
}));

/** Espelha o CHECK da coluna carbon_mr_capitulos.estado. */
const ESTADOS_VALIDOS = [
  'nao_iniciado',
  'em_andamento',
  'em_revisao',
  'concluido',
  'nao_aplicavel',
];

/** Mesmo limite do check carbon_mr_capitulos_rodada_chk e de RODADA_MAXIMA na rota. */
const RODADA_MAXIMA = 99;

/** Único standard com estrutura semeada, igual ao seed da migration. */
const STANDARDS_COM_TEMPLATE = ['VCS+CCB'];

/* ===== Utilitários ======================================================== */

/** Espera curta para que os estados de carregamento da tela apareçam no demo. */
const esperar = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

function arredondar(valor, casas) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function novoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback só para ambiente sem crypto.randomUUID (não ocorre nos navegadores alvo).
  return `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
}

const agora = () => new Date().toISOString();

/** Texto aparado, vazio virando null: mesma normalização de lerTexto no backend. */
function textoOuNulo(valor) {
  const texto = String(valor ?? '').trim();
  return texto || null;
}

/* ===== Progresso ==========================================================
   MESMA regra de public.carbon_mr_progresso:
     - capítulo com estado 'nao_aplicavel' sai do DENOMINADOR;
     - pct com UMA casa decimal, igual ao round(..., 1) do SQL;
     - rodada_maxima é o maior número de volta entre os capítulos que contam (a rodada
       de um capítulo não aplicável não significa nada), e vale 1 quando não há nenhum;
     - por_estado sempre com as cinco chaves, inclusive zeradas;
     - por_rodada exclui os não aplicáveis, ordenado pela rodada.
   A regra está escrita UMA vez aqui e o resto do arquivo só a chama.        */
export function calcularProgressoMonitoramento(capitulos) {
  const lista = Array.isArray(capitulos) ? capitulos : [];
  const naoAplicaveis = lista.filter((c) => c?.estado === 'nao_aplicavel');
  const contam = lista.filter((c) => c?.estado !== 'nao_aplicavel');
  const concluidos = contam.filter((c) => c?.estado === 'concluido');

  const rodadaDe = (capitulo) => {
    const n = Number(capitulo?.rodada);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  };

  /* Percorre a lista INTEIRA e não só os que contam, porque o SQL faz
     "group by cap" sobre todas as linhas e conta com filter: um capítulo raiz cujos
     subcapítulos estejam TODOS não aplicáveis aparece com total 0, e não desaparece do
     resultado. Agrupar só pelos que contam faria o grupo sumir e a tela mostrar
     "Sem itens na conta" onde a produção mostra "0/0 concluídos". */
  const porCap = new Map();
  for (const capitulo of lista) {
    const cap = Number(capitulo?.cap) || 0;
    const atual = porCap.get(cap) || { cap, total: 0, concluidos: 0, rodada_maxima: 1 };
    if (capitulo?.estado !== 'nao_aplicavel') {
      atual.total += 1;
      if (capitulo?.estado === 'concluido') atual.concluidos += 1;
      atual.rodada_maxima = Math.max(atual.rodada_maxima, rodadaDe(capitulo));
    }
    porCap.set(cap, atual);
  }

  const porRodada = new Map();
  for (const capitulo of contam) {
    const rodada = rodadaDe(capitulo);
    porRodada.set(rodada, (porRodada.get(rodada) || 0) + 1);
  }

  const contarEstado = (estado) => lista.filter((c) => c?.estado === estado).length;

  return {
    total: contam.length,
    concluidos: concluidos.length,
    nao_aplicaveis: naoAplicaveis.length,
    pct: contam.length === 0 ? 0 : arredondar((concluidos.length * 100) / contam.length, 1),
    rodada_maxima: contam.reduce((maior, c) => Math.max(maior, rodadaDe(c)), 1),
    por_estado: {
      nao_iniciado: contarEstado('nao_iniciado'),
      em_andamento: contarEstado('em_andamento'),
      em_revisao: contarEstado('em_revisao'),
      concluido: concluidos.length,
      nao_aplicavel: naoAplicaveis.length,
    },
    por_rodada: [...porRodada.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rodada, total]) => ({ rodada, total })),
    por_capitulo: [...porCap.values()]
      .sort((a, b) => a.cap - b.cap)
      .map((g) => ({
        ...g,
        pct: g.total === 0 ? 0 : arredondar((g.concluidos * 100) / g.total, 1),
      })),
  };
}

/* ===== Estado inicial de demonstração =====================================
   Precisa ser o MESMO id do projeto de src/lib/demoProjetos.js, senão o relatório
   semeado ficaria pendurado num projeto que a tela de Projetos não lista. A constante
   não é exportada por aquele módulo, então está repetida aqui: se ela mudar lá, muda
   aqui. É a única duplicação entre os dois datasets.                           */
const PROJETO_DEMO_ID = '00000000-0000-4000-8000-000000000001';
const CRIADO_EM_DEMO = '2026-03-02T13:00:00.000Z';

/**
 * (estado, rodada) inicial por capítulo. Capítulo ausente deste mapa nasce
 * ('nao_iniciado', 1).
 *
 * A distribuição não é aleatória, ela DEMONSTRA os três pontos da issue:
 *   1. a maioria dos capítulos está na rodada 2, exatamente como o levantamento do
 *      Notion descreve ('Revisão 2' na maior parte dos subcapítulos);
 *   2. as rodadas convivem: há capítulo na 1, muitos na 2 e um na 3, porque a volta é
 *      por capítulo e não do relatório inteiro;
 *   3. dois capítulos estão 'nao_aplicavel' para provar, na tela, que eles saem do
 *      denominador (o total considerado fica 30 em vez de 32, e o percentual fecha
 *      26,7% com 8 concluídos).
 */
const ESTADO_INICIAL_DEMO = {
  // Chaves sempre entre aspas: '5.1.10' e '5.1.1' são capítulos diferentes, e uma chave
  // numérica sem aspas viraria a mesma string para os dois.
  '1': ['concluido', 2],
  '2': ['concluido', 2],
  '3': ['concluido', 2],
  '4': ['em_revisao', 2],
  '4.1.1': ['concluido', 2],
  '4.1.2': ['em_revisao', 2],
  '4.1.3': ['em_revisao', 2],
  '4.1.4': ['concluido', 2],
  '4.2.1': ['em_andamento', 2],
  '4.2.2': ['em_andamento', 1],
  '4.3.1': ['concluido', 2],
  '4.3.2': ['em_revisao', 2],
  '4.4.1': ['em_revisao', 2],
  '4.4.2': ['nao_iniciado', 1],
  '4.4.3': ['em_andamento', 1],
  '4.4.4': ['em_revisao', 2],
  '4.4.5': ['concluido', 2],
  '4.4.6': ['nao_iniciado', 1],
  '5': ['em_andamento', 1],
  '5.1.1': ['em_revisao', 2],
  '5.1.2': ['em_andamento', 1],
  '5.1.3': ['em_andamento', 1],
  '5.1.4': ['nao_iniciado', 1],
  '5.1.5': ['concluido', 1],
  '5.1.6': ['nao_aplicavel', 1],
  '5.1.7': ['nao_aplicavel', 1],
  '5.1.8': ['nao_iniciado', 1],
  '5.2.1': ['em_andamento', 1],
  '5.2.2': ['nao_iniciado', 1],
  '5.3.1': ['em_revisao', 2],
  '5.3.2': ['nao_iniciado', 1],
  '5.4.1': ['em_revisao', 3],
};

/**
 * Orientação ao redator, para o campo aparecer preenchido e a diferença entre
 * orientação (instrução de quem coordena) e observação (recado de andamento) ficar
 * visível na revisão. Textos fictícios e genéricos.
 */
const ORIENTACAO_INICIAL_DEMO = {
  '4.1.1':
    'Descreva o impacto OBSERVADO no período monitorado, com a evidência de campo que o sustenta. A expectativa registrada no PDD não serve aqui: este capítulo comprova impacto realizado.',
  '4.4.3':
    'Exige série desagregada por gênero. Sem o dado do período não é possível fechar a redação; sinalize no lugar de estimar.',
  '5.1.6':
    'Marcado como não aplicável: o projeto não utiliza espécie exótica invasora. Registre aqui a justificativa que a verificadora vai pedir.',
  '5.4.1':
    'Terceira rodada: a verificadora pediu a série completa das espécies-gatilho, e não apenas o último ano medido.',
};

/** Observações internas de andamento, deliberadamente separadas da orientação. */
const OBSERVACOES_INICIAIS_DEMO = {
  '4.1.2': 'Devolvido na primeira revisão: faltou amarrar cada ação de mitigação ao impacto correspondente.',
  '5.1.1': 'Dado de campo ainda em análise.',
  '5.4.1': 'Aguardando a planilha consolidada do inventário para reescrever o capítulo.',
};

function instanciarTemplate(projetoId, { comEstadoInicial = false } = {}) {
  return TEMPLATE_MR_VCS_CCB.map((linha) => {
    const [estado, rodada] = comEstadoInicial
      ? ESTADO_INICIAL_DEMO[linha.capitulo] || ['nao_iniciado', 1]
      : ['nao_iniciado', 1];

    return {
      id: novoId(),
      projeto_id: projetoId,
      capitulo: linha.capitulo,
      nome: linha.nome,
      cap: linha.cap,
      nivel: linha.nivel,
      ordem: linha.ordem,
      estado,
      rodada,
      responsavel_id: null,
      responsavel_nome: null,
      // Relatório criado do template nasce com a orientação do template, que hoje é
      // NULL no seed da migration (ver o comentário da coluna). Os textos de exemplo
      // só entram no estado inicial da demonstração.
      orientacao: comEstadoInicial ? ORIENTACAO_INICIAL_DEMO[linha.capitulo] || null : null,
      observacoes: comEstadoInicial ? OBSERVACOES_INICIAIS_DEMO[linha.capitulo] || null : null,
      criado_em: CRIADO_EM_DEMO,
      atualizado_em: CRIADO_EM_DEMO,
    };
  });
}

/* ===== Estado em memória ================================================== */

/** projeto_id -> lista de capítulos. Projeto sem chave aqui está sem relatório, que é
 *  como se testa o estado vazio e o botão "Criar relatório a partir do template". */
let capitulosPorProjeto = {
  [PROJETO_DEMO_ID]: instanciarTemplate(PROJETO_DEMO_ID, { comEstadoInicial: true }),
};

/**
 * Confere que o projeto existe e devolve a linha, no mesmo formato da API.
 *
 * Reaproveita o dataset de Projetos em vez de manter uma segunda lista de projetos:
 * duas listas divergiriam no primeiro projeto criado pelo formulário, e a tela de
 * monitoramento passaria a aceitar um id que a tela de Projetos não conhece. Projeto
 * inexistente propaga ErroDemo com codigo 'nao_encontrado', que é o mesmo 404 que a
 * Edge Function devolve.
 */
async function projetoDemo(projetoId) {
  const resposta = await demoObterProjeto(projetoId);
  return resposta?.projeto ?? null;
}

function estadoRelatorio(projetoId) {
  const capitulos = [...(capitulosPorProjeto[projetoId] || [])].sort((a, b) => a.ordem - b.ordem);
  return { capitulos, progresso: calcularProgressoMonitoramento(capitulos) };
}

function acharCapitulo(capituloId) {
  for (const lista of Object.values(capitulosPorProjeto)) {
    const achado = lista.find((c) => c.id === capituloId);
    if (achado) return achado;
  }
  throw new ErroDemoMonitoramento('nao_encontrado');
}

/* ===== Funções que imitam o backend ====================================== */

export async function demoObterMonitoramento(projetoId) {
  await esperar();
  await projetoDemo(projetoId);
  return estadoRelatorio(projetoId);
}

/**
 * Imita public.carbon_mr_criar_do_template: copia do template só o que ainda não existe
 * no projeto e devolve quantos foram criados. Idempotente de propósito - clicar duas
 * vezes no botão não duplica capítulo.
 *
 * FILTRA PELO STANDARD como a função SQL faz (where t.standard = v_standard). O único
 * standard com estrutura semeada é VCS+CCB, então projeto criado no formulário com outro
 * standard recebe zero capítulos, igual à produção. Instanciar o template de qualquer
 * jeito faria o demo demonstrar um comportamento que a produção nunca produz, e
 * esconderia justamente o caso que a tela precisa avisar.
 */
export async function demoCriarMonitoramentoDoTemplate(projetoId) {
  await esperar();
  const projeto = await projetoDemo(projetoId);

  const existentes = capitulosPorProjeto[projetoId] || [];
  const numeros = new Set(existentes.map((c) => c.capitulo));
  const doTemplate = STANDARDS_COM_TEMPLATE.includes(projeto?.standard)
    ? instanciarTemplate(projetoId)
    : [];
  const novos = doTemplate.filter((c) => !numeros.has(c.capitulo));

  capitulosPorProjeto = {
    ...capitulosPorProjeto,
    [projetoId]: [...existentes, ...novos],
  };

  return { criados: novos.length, ...estadoRelatorio(projetoId) };
}

/**
 * Lista branca igual à do PATCH /mr-capitulos/:id: estado, rodada, responsavel_id,
 * orientacao e observacoes. Campo desconhecido é IGNORADO, nunca gravado.
 */
export async function demoAtualizarCapituloMonitoramento(capituloId, dados) {
  await esperar();
  const alvo = acharCapitulo(capituloId);
  const entrada = dados && typeof dados === 'object' ? dados : {};

  if (entrada.estado !== undefined) {
    if (!ESTADOS_VALIDOS.includes(entrada.estado)) {
      throw new ErroDemoMonitoramento('estado_invalido');
    }
    alvo.estado = entrada.estado;
  }

  if (entrada.rodada !== undefined) {
    const n = Number(entrada.rodada);
    // Mesma validação de lerRodada na rota: inteiro dentro da faixa da coluna.
    if (!Number.isInteger(n) || n < 1 || n > RODADA_MAXIMA) {
      throw new ErroDemoMonitoramento('campo_invalido');
    }
    alvo.rodada = n;
  }

  if (entrada.responsavel_id !== undefined) alvo.responsavel_id = entrada.responsavel_id || null;
  if (entrada.orientacao !== undefined) alvo.orientacao = textoOuNulo(entrada.orientacao);
  if (entrada.observacoes !== undefined) alvo.observacoes = textoOuNulo(entrada.observacoes);

  alvo.atualizado_em = agora();
  return { capitulo: { ...alvo } };
}

/**
 * Imita public.carbon_mr_capitulo_nova_rodada: incrementa a volta e leva o estado para
 * em_revisao. As duas recusas da função SQL estão reproduzidas, com os mesmos códigos:
 * capítulo não aplicável está fora do ciclo, e a rodada tem limite.
 */
export async function demoNovaRodadaCapitulo(capituloId) {
  await esperar();
  const alvo = acharCapitulo(capituloId);

  if (alvo.estado === 'nao_aplicavel') throw new ErroDemoMonitoramento('rodada_invalida');
  if (Number(alvo.rodada) >= RODADA_MAXIMA) throw new ErroDemoMonitoramento('rodada_invalida');

  alvo.rodada = Number(alvo.rodada) + 1;
  alvo.estado = 'em_revisao';
  alvo.atualizado_em = agora();

  return { capitulo: { ...alvo }, rodada: alvo.rodada };
}

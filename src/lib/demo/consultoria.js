/**
 * demo/consultoria.js - dataset de demonstração do funil comercial da Consultoria.
 *
 * POR QUE EXISTE: permite revisar a tela sem banco. Em MODO_DEMO (ver
 * src/lib/runtimeConfig.js: exige dev E o clique no botão de demonstração) as funções de
 * src/lib/api/consultoria.js não fazem rede e operam sobre o estado em memória daqui. As
 * mutações ALTERAM esse estado, para os dois gestos centrais da tela - mudar o status de
 * uma proposta e ver a taxa de conversão se mexer, e ligar uma consultoria à proposta que
 * a originou - serem de fato exercitáveis.
 *
 * ESCOPO: não é cache nem persistência. Recarregar a página volta ao estado inicial. Em
 * build de produção MODO_DEMO é false por força (import.meta.env.DEV é estático) e o
 * bundler elimina os ramos que chamam este módulo.
 *
 * AS TRÊS REGRAS DERIVADAS ESTÃO NO SERVIDOR E SÃO COPIADAS AQUI, linha a linha, de
 * supabase/functions/carbon-api/rotas/consultoria.ts. Não há view nem função SQL neste
 * domínio, então a única forma de o demo mostrar o mesmo número que a produção é
 * repetir a conta:
 *
 *   1. TAXA DE CONVERSÃO = ganhas / (ganhas + perdidas), nunca sobre o total, e `null`
 *      quando nenhuma proposta foi decidida.
 *   2. PRAZO VENCIDO só existe em consultoria em curso (não iniciada ou em andamento).
 *   3. A DATA DE DESFECHO é derivada do status, e mudar de ganha para perdida limpa a
 *      data anterior (senão o CHECK do banco recusaria).
 *
 * Se as duas implementações divergirem, a revisão mostra um número que a produção nunca
 * produz, e a divergência só aparece depois do provisionamento.
 *
 * O QUE O DATASET PRECISA REPRODUZIR, porque é o que quebra tela: o código da proposta é
 * ANULÁVEL e REPETIDO. Duas propostas abaixo carregam o mesmo literal `AP-000XX/25`, com
 * o XX por preencher, e duas não têm código nenhum - exatamente como no Notion. Uma tela
 * que usasse código como chave de lista duplicaria a key do React e trocaria as linhas de
 * lugar. O identificador é o id.
 *
 * LGPD E CONFIDENCIALIDADE: nenhum nome de pessoa, nenhum e-mail, nenhum telefone, e
 * nenhum cliente real. Os clientes abaixo são fictícios e se anunciam como tal; o que foi
 * copiado do dado real é só a FORMA (status, linha de serviço, e a pontuação
 * inconsistente do nome da consultoria), nunca o conteúdo.
 */

/* ===== Erro tipado ========================================================
   Mesmos códigos do backend, para a tela não tratar validação de um jeito no demo e de
   outro em produção. Classe própria e não a de outro domínio: quem converte em ErroApi
   (chamarDemo, em src/lib/api/base.js) só olha `codigo`, e acoplar dois datasets faria um
   mudar quando o outro mudasse.                                              */
export class ErroDemoConsultoria extends Error {
  constructor(codigo, campo) {
    super(`Recusado pelo modo demonstracao: ${codigo}${campo ? ` (${campo})` : ''}`);
    this.name = 'ErroDemoConsultoria';
    this.codigo = codigo;
    this.campo = campo ?? null;
  }
}

/* ===== Vocabulário (espelha os CHECK da migration) ======================== */

const STATUS_PROPOSTA = ['elaboracao', 'ganha', 'perdida', 'cancelada'];
const STATUS_CONSULTORIA = ['nao_iniciada', 'em_andamento', 'concluida', 'cancelada'];
const CONSULTORIA_EM_CURSO = ['nao_iniciada', 'em_andamento'];

/* ===== Hoje, no fuso de quem usa =========================================
   Mesma decisão de hojeNoBrasil() no servidor, pelo mesmo motivo: `toISOString()` é UTC e
   viraria o dia às 21h de Brasília. Aqui o relógio até costuma ser o de Brasília, mas
   uma máquina configurada em outro fuso pintaria de vermelho consultorias no prazo - e o
   demo existe justamente para a revisão confiar no que vê.                    */
const FORMATO_DATA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function hojeNoBrasil() {
  const partes = {};
  for (const parte of FORMATO_DATA.formatToParts(new Date())) partes[parte.type] = parte.value;
  return `${partes.year}-${partes.month}-${partes.day}`;
}

/** Soma dias a uma data 'AAAA-MM-DD', em UTC para não escorregar de dia. */
function somarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/* ===== Estado =============================================================
   Montado na PRIMEIRA LEITURA e não no topo do módulo. Uma expressão de topo é efeito
   colateral que o Rollup não consegue provar puro, e o módulo inteiro (com o dataset)
   ficaria vivo no bundle de produção mesmo com todos os ramos que o chamam eliminados.
   O acessador bd() é o mesmo padrão de src/lib/demo/indicadores.js.

   PRAZOS ANCORADOS EM HOJE, nunca fixos: a tela precisa mostrar consultoria vencida, no
   prazo e sem prazo em qualquer dia em que o dono abrir. Com datas fixas o demo
   envelheceria e em um mês tudo estaria vencido.                              */
let estado = null;

function inicial() {
  const hoje = hojeNoBrasil();

  return {
    propostas: [
      {
        // A única ganha do conjunto. É ela sozinha que sustenta a taxa de conversão,
        // e é por isso que a tela mostra o denominador junto do percentual.
        id: 'demo-prop-1',
        codigo: 'AP-000XX/25',
        titulo: 'Inventário de GEE e plano de descarbonização',
        cliente: 'Indústria Exemplo S.A. (cliente fictício)',
        status: 'ganha',
        grupo_servico: 'Descarbonizacao',
        servico: null,
        metodologia: null,
        data_criacao: '2025-02-19T12:24:00-03:00',
        data_ganha: '2025-04-02',
        data_perdida: null,
        observacoes: null,
        ativo: true,
      },
      {
        // MESMO CÓDIGO da anterior, e não é engano: `AP-000XX/25` aparece duas vezes
        // no Notion porque o número da AP só é atribuído depois. O índice único da
        // migration ignora os códigos com XX exatamente para aceitar este caso.
        id: 'demo-prop-2',
        codigo: 'AP-000XX/25',
        titulo: 'Estudo de viabilidade de crédito de carbono',
        cliente: 'Indústria Exemplo S.A. (cliente fictício)',
        status: 'elaboracao',
        grupo_servico: 'Descarbonizacao',
        servico: null,
        metodologia: null,
        data_criacao: '2025-02-19T12:24:00-03:00',
        data_ganha: null,
        data_perdida: null,
        observacoes: null,
        ativo: true,
      },
      {
        // SEM CÓDIGO E SEM CLIENTE: só o título identifica. É o caso que obriga a tela
        // a ter um rótulo de fallback em vez de uma linha em branco.
        id: 'demo-prop-3',
        codigo: null,
        titulo: 'Diagnóstico de elegibilidade de projeto florestal',
        cliente: null,
        status: 'elaboracao',
        grupo_servico: 'Carbono',
        servico: null,
        metodologia: null,
        data_criacao: '2025-02-19T12:24:00-03:00',
        data_ganha: null,
        data_perdida: null,
        observacoes: null,
        ativo: true,
      },
      {
        // Código com sufixo descritivo, do jeito que a equipe escreve.
        id: 'demo-prop-4',
        codigo: 'AP-000XX/25 - Monitoramento contínuo',
        titulo: null,
        cliente: 'Cooperativa Modelo (cliente fictício)',
        status: 'elaboracao',
        grupo_servico: null,
        servico: null,
        metodologia: null,
        data_criacao: '2025-02-19T16:35:00-03:00',
        data_ganha: null,
        data_perdida: null,
        observacoes: null,
        ativo: true,
      },
      {
        id: 'demo-prop-5',
        codigo: 'AP-000xx/25 - Mapeamento de oportunidades',
        titulo: null,
        cliente: 'Cooperativa Modelo (cliente fictício)',
        status: 'elaboracao',
        grupo_servico: 'Carbono',
        servico: null,
        metodologia: null,
        data_criacao: '2025-02-19T17:05:00-03:00',
        data_ganha: null,
        data_perdida: null,
        observacoes: null,
        ativo: true,
      },
      {
        // Nem código, nem título, nem cliente no Notion. Aqui recebe um título porque
        // a rota de criação passou a exigir um dos três: uma linha sem nada é uma
        // proposta que ninguém consegue identificar nem para arquivar.
        id: 'demo-prop-6',
        codigo: null,
        titulo: 'Proposta sem identificação registrada',
        cliente: null,
        status: 'elaboracao',
        grupo_servico: null,
        servico: null,
        metodologia: null,
        data_criacao: '2025-02-19T17:29:00-03:00',
        data_ganha: null,
        data_perdida: null,
        observacoes: 'Registro herdado da carga do Notion, sem código nem cliente.',
        ativo: true,
      },
      {
        // Código que não segue o padrão AP nenhum. Existe no dado real, e é o motivo
        // de não haver máscara no campo.
        id: 'demo-prop-7',
        codigo: 'S1 e S2 [Usina Fictícia do Vale]',
        titulo: 'Escopos 1 e 2 do inventário corporativo',
        cliente: 'Usina Fictícia do Vale (cliente fictício)',
        status: 'elaboracao',
        grupo_servico: null,
        servico: null,
        metodologia: null,
        data_criacao: '2025-07-08T11:41:00-03:00',
        data_ganha: null,
        data_perdida: null,
        observacoes: null,
        ativo: true,
      },
    ],

    consultorias: [
      {
        // A ÚNICA com vínculo preenchido. As outras oito refletem a realidade: o Notion
        // não liga as duas bases, e a tela existe também para tornar essa lacuna
        // visível em vez de fingir que o funil está costurado.
        id: 'demo-cons-1',
        proposta_id: 'demo-prop-1',
        nome: 'AP - 00052-24 [Indústria Exemplo]',
        cliente: 'Indústria Exemplo S.A. (cliente fictício)',
        status: 'em_andamento',
        prazo: somarDias(hoje, 24),
        observacoes: null,
        ativo: true,
      },
      {
        // Prazo já passado e ainda em andamento: é a linha que a tela precisa saber
        // destacar. Ancorada em hoje para continuar vencida amanhã também.
        id: 'demo-cons-2',
        proposta_id: null,
        nome: 'AP x -25 [Cooperativa Modelo]',
        cliente: 'Cooperativa Modelo (cliente fictício)',
        status: 'em_andamento',
        prazo: somarDias(hoje, -18),
        observacoes: null,
        ativo: true,
      },
      {
        // Hífen em outra posição e espaço a mais: a pontuação da convenção varia na
        // prática e a coluna aceita o texto como a equipe escreve.
        id: 'demo-cons-3',
        proposta_id: null,
        nome: 'AP 00051 - 24 [Transportadora Amostra]',
        cliente: 'Transportadora Amostra (cliente fictício)',
        status: 'em_andamento',
        prazo: null,
        observacoes: null,
        ativo: true,
      },
      {
        id: 'demo-cons-4',
        proposta_id: null,
        nome: 'AP x -25 [Assessoria Usina Fictícia]',
        cliente: 'Usina Fictícia do Vale (cliente fictício)',
        status: 'em_andamento',
        prazo: somarDias(hoje, -3),
        observacoes: null,
        ativo: true,
      },
      {
        id: 'demo-cons-5',
        proposta_id: null,
        nome: 'AP - 00003-26 [Cooperativa Modelo]',
        cliente: 'Cooperativa Modelo (cliente fictício)',
        status: 'em_andamento',
        prazo: null,
        observacoes: null,
        ativo: true,
      },
      {
        // Nome truncado, do jeito que ficou no Notion. Não inventamos o resto.
        id: 'demo-cons-6',
        proposta_id: null,
        nome: 'AP -',
        cliente: null,
        status: 'nao_iniciada',
        prazo: null,
        observacoes: 'Nome incompleto na carga do Notion. Falta revisar.',
        ativo: true,
      },
      {
        id: 'demo-cons-7',
        proposta_id: null,
        nome: 'AP - 00048-24 [Indústria Exemplo]',
        cliente: 'Indústria Exemplo S.A. (cliente fictício)',
        status: 'nao_iniciada',
        prazo: somarDias(hoje, 60),
        observacoes: null,
        ativo: true,
      },
      {
        // Concluída COM prazo vencido, e mesmo assim sem alerta: trabalho terminado
        // não atrasa. É a regra 2 do cabeçalho, e a linha que a exercita.
        id: 'demo-cons-8',
        proposta_id: null,
        nome: 'AP - 00040-24 [Transportadora Amostra]',
        cliente: 'Transportadora Amostra (cliente fictício)',
        status: 'concluida',
        prazo: somarDias(hoje, -120),
        observacoes: null,
        ativo: true,
      },
      {
        id: 'demo-cons-9',
        proposta_id: null,
        nome: 'AP x -25 [Usina Fictícia do Vale]',
        cliente: 'Usina Fictícia do Vale (cliente fictício)',
        status: 'cancelada',
        prazo: null,
        observacoes: 'Cliente adiou o escopo.',
        ativo: false,
      },
    ],

    proximoId: 100,
  };
}

function bd() {
  if (!estado) estado = inicial();
  return estado;
}

/* ===== Filtros ============================================================
   O servidor sanitiza o termo de busca por causa do `.or()` do PostgREST; aqui a busca é
   um filter em memória e não há injeção possível. O que precisa ser igual é o CONJUNTO
   DE COLUNAS pesquisado, senão o mesmo termo acha coisas diferentes nos dois modos.   */

function combina(termo, ...campos) {
  if (!termo || !termo.trim()) return true;
  const alvo = termo.trim().toLowerCase();
  return campos.some((campo) => String(campo ?? '').toLowerCase().includes(alvo));
}

function filtrarAtivo(lista, ativo) {
  if (ativo === 'true' || ativo === true) return lista.filter((l) => l.ativo !== false);
  if (ativo === 'false' || ativo === false) return lista.filter((l) => l.ativo === false);
  return lista;
}

/* ===== Propostas ========================================================== */

/**
 * Cópia de resumirPropostas() do servidor. Ver a regra 1 do cabeçalho: o denominador
 * são as propostas DECIDIDAS, e `taxa_conversao` é null quando não há nenhuma.
 */
function resumirPropostas(linhas) {
  const contar = (status) => linhas.filter((l) => l.status === status).length;
  const ganhas = contar('ganha');
  const perdidas = contar('perdida');
  const decididas = ganhas + perdidas;

  return {
    total: linhas.length,
    ativas: linhas.filter((l) => l.ativo !== false).length,
    por_status: {
      elaboracao: contar('elaboracao'),
      ganha: ganhas,
      perdida: perdidas,
      cancelada: contar('cancelada'),
    },
    decididas,
    taxa_conversao: decididas === 0 ? null : ganhas / decididas,
  };
}

/** Cópia de lerGruposDeServico(): as opções saem do dado INTEIRO, nunca do filtrado. */
function listarGrupos(todas) {
  const contagem = new Map();
  let semGrupo = 0;
  for (const p of todas) {
    const grupo = String(p.grupo_servico ?? '').trim();
    if (grupo === '') {
      semGrupo += 1;
      continue;
    }
    contagem.set(grupo, (contagem.get(grupo) ?? 0) + 1);
  }
  return {
    grupos: [...contagem.entries()]
      .map(([grupo, total]) => ({ grupo, total }))
      .sort((a, b) => a.grupo.localeCompare(b.grupo, 'pt-BR')),
    sem_grupo: semGrupo,
  };
}

function comContagemDeConsultorias(proposta) {
  return {
    ...proposta,
    consultorias: bd().consultorias.filter((c) => c.proposta_id === proposta.id).length,
  };
}

export function demoListarPropostas(filtros = {}) {
  const { status = null, grupo_servico: grupo = null, busca = null, ativo = null } = filtros;
  const todas = bd().propostas;

  let lista = filtrarAtivo(todas, ativo);
  if (status) {
    if (!STATUS_PROPOSTA.includes(status)) throw new ErroDemoConsultoria('status_invalido', 'status');
    lista = lista.filter((p) => p.status === status);
  }
  if (grupo === 'sem_grupo') lista = lista.filter((p) => !p.grupo_servico);
  else if (grupo) lista = lista.filter((p) => p.grupo_servico === grupo);
  if (busca) lista = lista.filter((p) => combina(busca, p.codigo, p.titulo, p.cliente));

  // Mesma ordenação do servidor: mais recentes primeiro, sem data no fim.
  const ordenada = [...lista].sort((a, b) =>
    String(b.data_criacao ?? '').localeCompare(String(a.data_criacao ?? ''))
  );

  return {
    propostas: ordenada.map(comContagemDeConsultorias),
    total: ordenada.length,
    pagina: 1,
    limite: 200,
    resumo: resumirPropostas(lista),
    ...listarGrupos(todas),
  };
}

/**
 * Cópia da derivação de desfecho do servidor (regra 3 do cabeçalho).
 *
 * Aplica sobre `alvo` os campos de `dados`, resolvendo as datas de ganha e perdida a
 * partir do status. Sem isso, mudar o status no demo deixaria a data em branco e a
 * revisão não veria a coluna de desfecho funcionar.
 */
function aplicarCamposDaProposta(alvo, dados) {
  const CAMPOS = [
    'codigo',
    'titulo',
    'cliente',
    'grupo_servico',
    'servico',
    'metodologia',
    'observacoes',
  ];
  for (const campo of CAMPOS) {
    if (Object.prototype.hasOwnProperty.call(dados, campo)) alvo[campo] = dados[campo] || null;
  }
  if (Object.prototype.hasOwnProperty.call(dados, 'ativo')) alvo.ativo = dados.ativo !== false;

  // Cópia de lerMomento(): data_criacao é timestamptz e a tela manda uma DATA. Sem a
  // âncora do meio-dia de Brasília, 'AAAA-MM-DD' vira meia-noite UTC e a tela mostra o
  // dia anterior ao que a pessoa acabou de digitar.
  if (Object.prototype.hasOwnProperty.call(dados, 'data_criacao')) {
    const bruto = String(dados.data_criacao ?? '').trim();
    if (!bruto) alvo.data_criacao = null;
    else alvo.data_criacao = /^\d{4}-\d{2}-\d{2}$/.test(bruto) ? `${bruto}T12:00:00-03:00` : bruto;
  }

  if (!Object.prototype.hasOwnProperty.call(dados, 'status') || !dados.status) {
    if (Object.prototype.hasOwnProperty.call(dados, 'data_ganha')) {
      alvo.data_ganha = dados.data_ganha || null;
    }
    if (Object.prototype.hasOwnProperty.call(dados, 'data_perdida')) {
      alvo.data_perdida = dados.data_perdida || null;
    }
    // O CHECK carbon_propostas_desfecho_chk recusa as duas juntas; recusar aqui
    // também mantém a mensagem igual nos dois caminhos.
    if (alvo.data_ganha && alvo.data_perdida) {
      throw new ErroDemoConsultoria('desfecho_ambiguo', 'data_ganha');
    }
    return alvo;
  }

  if (!STATUS_PROPOSTA.includes(dados.status)) {
    throw new ErroDemoConsultoria('status_invalido', 'status');
  }
  alvo.status = dados.status;

  if (dados.status === 'ganha') {
    alvo.data_ganha = dados.data_ganha || hojeNoBrasil();
    alvo.data_perdida = null;
  } else if (dados.status === 'perdida') {
    alvo.data_perdida = dados.data_perdida || hojeNoBrasil();
    alvo.data_ganha = null;
  } else {
    alvo.data_ganha = null;
    alvo.data_perdida = null;
  }
  return alvo;
}

export function demoCriarProposta(dados = {}) {
  const nova = {
    id: `demo-prop-${bd().proximoId++}`,
    codigo: null,
    titulo: null,
    cliente: null,
    status: 'elaboracao',
    grupo_servico: null,
    servico: null,
    metodologia: null,
    data_criacao: `${hojeNoBrasil()}T12:00:00-03:00`,
    data_ganha: null,
    data_perdida: null,
    observacoes: null,
    ativo: true,
  };
  aplicarCamposDaProposta(nova, dados);

  // Mesma recusa do servidor: código, título e cliente são todos anuláveis na
  // migration, e sem esta regra nasceria uma linha sem nada que a identifique.
  if (!nova.codigo && !nova.titulo && !nova.cliente) {
    throw new ErroDemoConsultoria('proposta_sem_identificacao', 'titulo');
  }

  bd().propostas.push(nova);
  return { proposta: comContagemDeConsultorias(nova) };
}

export function demoAtualizarProposta(id, dados = {}) {
  const alvo = bd().propostas.find((p) => p.id === id);
  if (!alvo) throw new ErroDemoConsultoria('nao_encontrado');
  if (Object.keys(dados).length === 0) throw new ErroDemoConsultoria('nada_para_atualizar');

  aplicarCamposDaProposta(alvo, dados);
  return { proposta: comContagemDeConsultorias(alvo) };
}

/* ===== Consultorias ======================================================= */

/** Cópia de comPrazoVencido(): só consultoria EM CURSO atrasa (regra 2 do cabeçalho). */
function comPrazoVencido(consultoria, hoje) {
  const proposta = consultoria.proposta_id
    ? bd().propostas.find((p) => p.id === consultoria.proposta_id)
    : null;

  return {
    ...consultoria,
    proposta_codigo: proposta?.codigo ?? null,
    proposta_titulo: proposta?.titulo ?? null,
    proposta_cliente: proposta?.cliente ?? null,
    proposta_status: proposta?.status ?? null,
    prazo_vencido: Boolean(
      consultoria.prazo && CONSULTORIA_EM_CURSO.includes(consultoria.status) &&
        consultoria.prazo < hoje
    ),
  };
}

function resumirConsultorias(linhas, hoje) {
  const contar = (status) => linhas.filter((l) => l.status === status).length;
  const emCurso = linhas.filter((l) => CONSULTORIA_EM_CURSO.includes(l.status));

  return {
    total: linhas.length,
    ativas: linhas.filter((l) => l.ativo !== false).length,
    por_status: {
      nao_iniciada: contar('nao_iniciada'),
      em_andamento: contar('em_andamento'),
      concluida: contar('concluida'),
      cancelada: contar('cancelada'),
    },
    em_curso: emCurso.length,
    prazo_vencido: emCurso.filter((l) => l.prazo && l.prazo < hoje).length,
    sem_prazo: emCurso.filter((l) => !l.prazo).length,
    sem_proposta: linhas.filter((l) => !l.proposta_id).length,
  };
}

export function demoListarConsultorias(filtros = {}) {
  const { status = null, vinculo = null, busca = null, ativo = null } = filtros;
  const hoje = hojeNoBrasil();

  let lista = filtrarAtivo(bd().consultorias, ativo);
  if (status) {
    if (!STATUS_CONSULTORIA.includes(status)) {
      throw new ErroDemoConsultoria('status_invalido', 'status');
    }
    lista = lista.filter((c) => c.status === status);
  }
  if (vinculo === 'sem_proposta') lista = lista.filter((c) => !c.proposta_id);
  else if (vinculo === 'com_proposta') lista = lista.filter((c) => Boolean(c.proposta_id));
  if (busca) lista = lista.filter((c) => combina(busca, c.nome, c.cliente));

  // Mesma ordenação do servidor: prazo mais próximo primeiro, sem prazo no fim.
  const ordenada = [...lista].sort((a, b) => {
    if (!a.prazo && !b.prazo) return 0;
    if (!a.prazo) return 1;
    if (!b.prazo) return -1;
    return a.prazo.localeCompare(b.prazo);
  });

  return {
    consultorias: ordenada.map((c) => comPrazoVencido(c, hoje)),
    total: ordenada.length,
    pagina: 1,
    limite: 200,
    resumo: resumirConsultorias(lista, hoje),
    hoje,
  };
}

function aplicarCamposDaConsultoria(alvo, dados) {
  if (Object.prototype.hasOwnProperty.call(dados, 'nome')) {
    const nome = String(dados.nome ?? '').trim();
    if (!nome) throw new ErroDemoConsultoria('campo_obrigatorio', 'nome');
    alvo.nome = nome;
  }
  for (const campo of ['cliente', 'observacoes', 'prazo', 'proposta_id']) {
    if (Object.prototype.hasOwnProperty.call(dados, campo)) alvo[campo] = dados[campo] || null;
  }
  if (Object.prototype.hasOwnProperty.call(dados, 'status') && dados.status) {
    if (!STATUS_CONSULTORIA.includes(dados.status)) {
      throw new ErroDemoConsultoria('status_invalido', 'status');
    }
    alvo.status = dados.status;
  }
  if (Object.prototype.hasOwnProperty.call(dados, 'ativo')) alvo.ativo = dados.ativo !== false;

  // A FK carbon_consultorias_proposta_id_fkey recusaria um id inexistente com 23503,
  // que vira 'referencia_invalida'. Recusar aqui mantém a mensagem igual.
  if (alvo.proposta_id && !bd().propostas.some((p) => p.id === alvo.proposta_id)) {
    throw new ErroDemoConsultoria('referencia_invalida', 'proposta_id');
  }
  return alvo;
}

export function demoCriarConsultoria(dados = {}) {
  if (!String(dados.nome ?? '').trim()) throw new ErroDemoConsultoria('campo_obrigatorio', 'nome');

  const nova = {
    id: `demo-cons-${bd().proximoId++}`,
    proposta_id: null,
    nome: '',
    cliente: null,
    status: 'nao_iniciada',
    prazo: null,
    observacoes: null,
    ativo: true,
  };
  aplicarCamposDaConsultoria(nova, dados);

  bd().consultorias.push(nova);
  return { consultoria: comPrazoVencido(nova, hojeNoBrasil()) };
}

export function demoAtualizarConsultoria(id, dados = {}) {
  const alvo = bd().consultorias.find((c) => c.id === id);
  if (!alvo) throw new ErroDemoConsultoria('nao_encontrado');
  if (Object.keys(dados).length === 0) throw new ErroDemoConsultoria('nada_para_atualizar');

  aplicarCamposDaConsultoria(alvo, dados);
  return { consultoria: comPrazoVencido(alvo, hojeNoBrasil()) };
}

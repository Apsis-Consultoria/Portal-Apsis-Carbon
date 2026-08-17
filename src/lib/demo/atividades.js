/**
 * demo/atividades.js - dataset de demonstracao das telas de Atividades e Minhas Horas
 * (issues #7 e #8).
 *
 * POR QUE EXISTE: o projeto Supabase do Apsis Carbon ainda NAO foi provisionado, e as
 * telas precisam ser revisaveis localmente antes disso. Em MODO_DEMO (ver
 * src/lib/runtimeConfig.js: exige dev E VITE_CARBON_DEMO=true) as funcoes de
 * src/lib/api/atividades.js nao fazem rede: operam sobre o estado em memoria deste
 * arquivo, e as mutacoes ALTERAM esse estado, para a grade de horas ser de fato
 * preenchivel na revisao.
 *
 * ESCOPO: nao e cache nem persistencia. Recarregar a pagina volta ao estado inicial.
 * Vale SOMENTE em desenvolvimento: em build de producao MODO_DEMO e false por forca
 * (import.meta.env.DEV e estatico) e o bundler elimina os ramos que chamam este modulo.
 *
 * =============================================================================
 * REGRAS DE CALCULO: ESTE ARQUIVO IMITA O SQL, NAO INVENTA CONTA PROPRIA.
 * =============================================================================
 * Cada regra abaixo tem par exato na migration 20260814094000_atividades.sql. Se uma
 * delas divergir, a revisao do dono mostra numero que a producao nunca produz, e a
 * divergencia so aparece depois do provisionamento:
 *
 *   1. horas executadas NAO SAO CAMPO GUARDADO: e sempre a soma dos lancamentos
 *      (public.carbon_atividade_horas);
 *   2. aderencia = executadas * 100 / planejadas, UMA casa decimal, e NULL quando nao
 *      ha horas planejadas (public.carbon_aderencia_pct);
 *   3. a semana comeca na SEGUNDA (date_trunc('week'), padrao ISO);
 *   4. filtro de periodo e intersecao TOLERANTE A NULO: atividade sem data nunca e
 *      excluida por janela (carbon_atividades_listar e carbon_horas_resumo);
 *   5. horas executadas na LISTAGEM sao sempre o total da atividade, sem janela: a
 *      janela filtra quais atividades aparecem, nunca quais horas somam;
 *   6. no consolidado, atividade 'cancelada' fica fora, com as horas dela;
 *   7. horas planejadas NAO sao rateadas pela janela (por isso o campo com_janela);
 *   8. um lancamento por (atividade, usuario, dia): o segundo CORRIGE o primeiro;
 *   9. ordem da reuniao semanal: prioridade alta > media > baixa, depois prazo mais
 *      proximo com nulo no fim, depois nome.
 *
 * LGPD: nenhum dado real. Os colaboradores sao rotulos obviamente ficticios, sem
 * e-mail, sem cargo e sem qualquer identificador de pessoa. As atividades sao genericas
 * e nao citam cliente. O projeto de demonstracao e o mesmo de src/lib/demoProjetos.js,
 * repetido aqui pelo id para as duas telas conversarem (importar de la traria o dataset
 * de projetos inteiro para este pedaco do bundle).
 */

/* ===== Erro tipado ========================================================
   O demo precisa recusar entrada invalida com os MESMOS codigos do backend, senao a
   tela trataria erro de validacao de um jeito no demo e de outro em producao. Quem
   converte ErroDemo em ErroApi e o chamarDemo de src/lib/api/base.js, que so olha a
   propriedade `codigo`.

   Classe PROPRIA, e nao a de src/lib/demoProjetos.js, de proposito: importar de la
   arrastaria o dataset de projetos para o mesmo pedaco do bundle, que e exatamente o
   efeito que a fundacao documentou ao proibir o export * no agregador de api.       */
export class ErroDemo extends Error {
  constructor(codigo, detalhe) {
    super(`Recusado pelo modo demonstracao: ${codigo}${detalhe ? ` (${detalhe})` : ''}`);
    this.name = 'ErroDemo';
    this.codigo = codigo;
    this.detalhe = detalhe;
  }
}

/* ===== Dominio (espelha os CHECK da migration) ============================ */

const STATUS_VALIDOS = ['nao_iniciada', 'em_andamento', 'concluida', 'cancelada'];
const PRIORIDADES_VALIDAS = ['baixa', 'media', 'alta'];
const TIPOS_VALIDOS = ['consultoria', 'novos_negocios', 'projeto', 'backoffice', 'jpf'];

const LIMITE_HORAS_PLANEJADAS = 100000;
const LIMITE_HORAS_DIA = 24;
const LIMITE_REPRIORIZACAO = 200;

/** Peso da prioridade na ordenacao. Igual ao CASE do order by da funcao SQL. */
const PESO_PRIORIDADE = { alta: 1, media: 2, baixa: 3 };

/* ===== Utilitarios ======================================================== */

/** Espera curta para que os estados de carregamento das telas aparecam no demo. */
const esperar = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

function arredondar(valor, casas) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

/**
 * Soma de horas com duas casas.
 *
 * Arredondar NAO e enfeite: numeric do PostgreSQL soma exato, o float do JavaScript
 * nao (0,25 + 0,25 + 0,1 nao fecha redondo), e sem isto a tela do demo mostraria
 * 7,000000000000001 onde a producao mostra 7.
 */
function somarHoras(lista) {
  return arredondar(
    lista.reduce((total, item) => total + (Number(item?.horas) || 0), 0),
    2,
  );
}

function numeroOuNulo(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function novoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
}

const agora = () => new Date().toISOString();

/* ===== Datas ==============================================================
   Tudo em 'AAAA-MM-DD' e sempre no fuso LOCAL. Nada de new Date('2026-08-10'), que o
   JavaScript interpreta como meia-noite UTC e, no fuso do Brasil, volta um dia - erro
   que numa grade de lancamento por dia jogaria a hora na coluna errada.            */

const doisDigitos = (n) => String(n).padStart(2, '0');

/** Date local -> 'AAAA-MM-DD'. */
function paraIso(data) {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

/** 'AAAA-MM-DD' -> Date local a meia-noite. Valor invalido devolve null. */
function paraData(iso) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!partes) return null;
  const data = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return Number.isNaN(data.getTime()) ? null : data;
}

function somarDias(iso, dias) {
  const data = paraData(iso);
  if (!data) return null;
  data.setDate(data.getDate() + dias);
  return paraIso(data);
}

/**
 * Segunda-feira da semana de uma data. MESMA regra do date_trunc('week') do
 * PostgreSQL, que e ISO: a semana vai de segunda a domingo.
 */
function inicioDaSemana(iso) {
  const data = paraData(iso) ?? new Date();
  const diaSemana = data.getDay(); // 0 domingo ... 6 sabado
  const recuo = diaSemana === 0 ? -6 : 1 - diaSemana;
  data.setDate(data.getDate() + recuo);
  return paraIso(data);
}

/** Os sete dias de uma semana, a partir da segunda. */
function diasDaSemana(inicio) {
  return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
}

/** Data valida no formato aceito, ou erro com o codigo do backend. */
function validarData(valor, campo) {
  if (valor === null || valor === undefined || valor === '') return null;
  const iso = String(valor);
  if (!paraData(iso)) throw new ErroDemo('campo_invalido', campo);
  return iso;
}

/** Hoje, em 'AAAA-MM-DD'. Funcao, e nao const de topo: ver a nota de bundle abaixo. */
const hoje = () => paraIso(new Date());

/* ===== Colaboradores ficticios ============================================
   Rotulos obviamente ficticios, sem e-mail e sem cargo. O usuario "atual" do demo tem
   papel de gestor para o dono conseguir revisar o consolidado; um colaborador comum
   receberia 403 sem_permissao em horas-resumo e escopo 'proprio' nos apontamentos.   */

const USUARIO_DEMO = {
  id: '00000000-0000-4000-8000-0000000000a1',
  nome: 'Você (modo demonstração)',
  papel: 'gestor',
};

const OUTROS_USUARIOS = [
  { id: '00000000-0000-4000-8000-0000000000a2', nome: 'Colaborador Exemplo A' },
  { id: '00000000-0000-4000-8000-0000000000a3', nome: 'Colaborador Exemplo B' },
];

function podeVerConsolidado() {
  return USUARIO_DEMO.papel === 'admin' || USUARIO_DEMO.papel === 'gestor';
}

/* Mesmo id de src/lib/demoProjetos.js, para o filtro por projeto da tela de Atividades
   casar com o que a tela de Projetos lista. */
const PROJETO_DEMO_ID = '00000000-0000-4000-8000-000000000001';

/* ===== Estado em memoria, SEMEADO SOB DEMANDA =============================
   NOTA DE BUNDLE, MEDIDA E NAO SUPOSTA. Este dataset comecou como const de topo de
   modulo e VAZOU INTEIRO para o build de producao (conferido com grep no bundle), apesar
   de MODO_DEMO dobrar para false e de nenhuma funcao daqui ser alcancavel. O motivo: o
   Rollup so descarta um modulo quando consegue provar que o topo dele nao tem efeito
   colateral, e uma CHAMADA DE FUNCAO no inicializador (atividade(...), somarDias(...),
   new Map(...)) e justamente o que ele nao consegue provar - ao contrario de um literal
   de objeto ou de array, que sao puros e por isso somem.

   Por isso o dataset e construido DENTRO de semear(), chamada pela primeira funcao demo*
   que precisar dele. Assim o topo do modulo tem apenas literais e declaracoes de funcao,
   o modulo inteiro fica descartavel, e os nomes ficticios nao vao para producao. E a
   saida que a nota de bundle de src/lib/demoProjetos.js ja indicava ("a saida e tornar a
   lista lazy, funcao em vez de const de topo").

   Se voce mover qualquer coisa daqui de volta para o topo, confira o bundle antes:
     npm run build && grep -c "Colaborador Exemplo A" dist/assets/index-*.js
   O resultado tem de ser 0.                                                          */

const CRIADO_EM_DEMO = '2026-05-04T12:00:00.000Z';

/** Ids estaveis das atividades semeadas, para os lancamentos apontarem para elas. */
const ID = (n) => '00000000-0000-4000-8000-0000000001' + doisDigitos(n);

function novaAtividade(dados) {
  return {
    id: dados.id,
    projeto_id: dados.projeto_id ?? null,
    nome: dados.nome,
    descricao: dados.descricao ?? null,
    status: dados.status,
    prioridade: dados.prioridade,
    tipo: dados.tipo,
    responsavel_id: dados.responsavel_id ?? null,
    data_inicio: dados.data_inicio ?? null,
    data_fim: dados.data_fim ?? null,
    horas_planejadas: dados.horas_planejadas ?? null,
    criado_por: USUARIO_DEMO.id,
    criado_em: CRIADO_EM_DEMO,
    atualizado_em: CRIADO_EM_DEMO,
  };
}

/**
 * Um lancamento de horas.
 *
 * Chamados de "lancamentos" aqui para nao confundir com o CAMPO apontamentos devolvido
 * pela API, que e a CONTAGEM de lancamentos da atividade.
 */
function novoLancamento(atividadeId, usuarioId, dataIso, horas, observacao = null) {
  return {
    id: novoId(),
    atividade_id: atividadeId,
    usuario_id: usuarioId,
    data: dataIso,
    horas,
    observacao,
    criado_em: CRIADO_EM_DEMO,
    atualizado_em: CRIADO_EM_DEMO,
  };
}

let atividades = null;
let lancamentos = null;
/** id do projeto -> nome. Espelha o join com carbon_projetos da funcao SQL. */
let projetosDemo = null;
/** id do colaborador -> nome. Espelha o join com carbon_usuarios. */
let nomesPorUsuario = null;

/**
 * Semeia o dataset na primeira chamada. Idempotente.
 *
 * As datas sao ancoradas na semana CORRENTE, e nao em datas fixas: a grade de Minhas
 * Horas e a timeline precisam ter conteudo em qualquer dia em que o dono abrir a tela.
 * Com datas fixas, o demo envelheceria e nasceria vazio.
 */
function semear() {
  if (atividades) return;

  const segunda = inicioDaSemana(hoje());
  /** Dia relativo a segunda-feira desta semana. */
  const S = (n) => somarDias(segunda, n);

  projetosDemo = new Map([[PROJETO_DEMO_ID, 'Projeto Demonstração - Vale do Exemplo']]);
  nomesPorUsuario = new Map([USUARIO_DEMO, ...OUTROS_USUARIOS].map((u) => [u.id, u.nome]));

  atividades = [
    novaAtividade({
      id: ID(1),
      projeto_id: PROJETO_DEMO_ID,
      nome: 'Revisão do capítulo de adicionalidade do PDD',
      descricao:
        'Fechar o capítulo antes da próxima rodada de revisão interna. Depende da planilha de cenários.',
      status: 'em_andamento',
      prioridade: 'alta',
      tipo: 'projeto',
      responsavel_id: USUARIO_DEMO.id,
      data_inicio: S(-7),
      data_fim: S(11),
      horas_planejadas: 40,
    }),
    novaAtividade({
      id: ID(2),
      nome: 'Consolidação do inventário de GEE de exemplo',
      descricao: 'Escopos 1 e 2 conferidos, escopo 3 pendente de dado do fornecedor.',
      status: 'em_andamento',
      prioridade: 'media',
      tipo: 'consultoria',
      responsavel_id: USUARIO_DEMO.id,
      data_inicio: S(-14),
      data_fim: S(4),
      horas_planejadas: 24,
    }),
    novaAtividade({
      id: ID(3),
      nome: 'Proposta comercial - prospect fictício A',
      descricao: null,
      status: 'nao_iniciada',
      prioridade: 'alta',
      tipo: 'novos_negocios',
      responsavel_id: OUTROS_USUARIOS[0].id,
      // So prazo, sem inicio: e o caso que a base do projeto no Notion registrava com o
      // campo "Prazo" em vez de "Duracao", e que a coluna nullable existe para cobrir.
      data_inicio: null,
      data_fim: S(5),
      horas_planejadas: 8,
    }),
    novaAtividade({
      id: ID(4),
      nome: 'Fechamento de horas e faturamento do mês',
      descricao: 'Depende de todo mundo ter apontado as horas da semana.',
      status: 'em_andamento',
      prioridade: 'media',
      tipo: 'backoffice',
      responsavel_id: USUARIO_DEMO.id,
      data_inicio: S(-3),
      data_fim: S(9),
      horas_planejadas: 12,
    }),
    novaAtividade({
      id: ID(5),
      nome: 'Preparação da pauta da reunião semanal',
      descricao: 'Repriorizar o backlog e conferir as horas apontadas na semana.',
      status: 'em_andamento',
      prioridade: 'baixa',
      tipo: 'backoffice',
      responsavel_id: USUARIO_DEMO.id,
      data_inicio: S(0),
      data_fim: S(4),
      horas_planejadas: 4,
    }),
    novaAtividade({
      id: ID(6),
      projeto_id: PROJETO_DEMO_ID,
      nome: 'Levantamento de campo - área de demonstração',
      // Executadas acima das planejadas de proposito: e o caso em que a aderencia passa
      // de 100% e a tela tem de mostrar ESTOURO, nao "concluido com folga".
      descricao: 'Concluído acima do planejado, por causa do deslocamento.',
      status: 'concluida',
      prioridade: 'alta',
      tipo: 'projeto',
      responsavel_id: OUTROS_USUARIOS[0].id,
      data_inicio: S(-21),
      data_fim: S(-8),
      horas_planejadas: 32,
    }),
    novaAtividade({
      id: ID(7),
      projeto_id: PROJETO_DEMO_ID,
      nome: 'Estruturação do relatório de monitoramento',
      descricao: null,
      status: 'nao_iniciada',
      prioridade: 'media',
      tipo: 'projeto',
      responsavel_id: OUTROS_USUARIOS[1].id,
      data_inicio: S(7),
      data_fim: S(25),
      horas_planejadas: 60,
    }),
    novaAtividade({
      id: ID(8),
      nome: 'Frente JPF - atividade de demonstração',
      descricao: null,
      status: 'em_andamento',
      prioridade: 'media',
      tipo: 'jpf',
      responsavel_id: OUTROS_USUARIOS[1].id,
      data_inicio: S(-10),
      data_fim: S(18),
      horas_planejadas: 20,
    }),
    novaAtividade({
      id: ID(9),
      projeto_id: PROJETO_DEMO_ID,
      nome: 'Atualização da planilha de parâmetros monitorados',
      // Sem horas planejadas de proposito: e o caso em que a aderencia vem NULL em vez de
      // 0%, e a tela precisa mostrar isso sem inventar percentual.
      descricao: 'Sem estimativa de horas: entrou depois do planejamento do trimestre.',
      status: 'em_andamento',
      prioridade: 'baixa',
      tipo: 'projeto',
      responsavel_id: USUARIO_DEMO.id,
      data_inicio: S(-2),
      data_fim: null,
      horas_planejadas: null,
    }),
    novaAtividade({
      id: ID(10),
      nome: 'Piloto descontinuado - exemplo cancelado',
      descricao: 'Fica no histórico, mas sai do consolidado de planejado x realizado.',
      status: 'cancelada',
      prioridade: 'baixa',
      tipo: 'consultoria',
      responsavel_id: OUTROS_USUARIOS[0].id,
      data_inicio: S(-28),
      data_fim: S(-14),
      horas_planejadas: 16,
    }),
  ];

  // Espalhados pela semana corrente e pela anterior, com o usuario do demo e os dois
  // colaboradores ficticios, para o consolidado por pessoa ter o que mostrar e para a
  // navegacao de semana da grade nao cair em duas telas vazias.
  lancamentos = [
    // Semana anterior
    novoLancamento(ID(1), USUARIO_DEMO.id, S(-7), 6, 'Leitura da metodologia e do cenário sem projeto.'),
    novoLancamento(ID(1), USUARIO_DEMO.id, S(-6), 4),
    novoLancamento(ID(1), OUTROS_USUARIOS[0].id, S(-6), 3),
    novoLancamento(ID(2), USUARIO_DEMO.id, S(-5), 5),
    novoLancamento(ID(6), OUTROS_USUARIOS[0].id, S(-9), 8, 'Deslocamento e coleta.'),
    novoLancamento(ID(6), OUTROS_USUARIOS[0].id, S(-8), 8),
    novoLancamento(ID(6), OUTROS_USUARIOS[1].id, S(-9), 8),
    novoLancamento(ID(6), OUTROS_USUARIOS[1].id, S(-8), 8),
    novoLancamento(ID(6), OUTROS_USUARIOS[1].id, S(-7), 6),
    novoLancamento(ID(8), OUTROS_USUARIOS[1].id, S(-4), 4),

    // Semana corrente
    novoLancamento(ID(1), USUARIO_DEMO.id, S(0), 3.5, 'Revisão dos comentários da rodada anterior.'),
    novoLancamento(ID(1), USUARIO_DEMO.id, S(1), 2),
    novoLancamento(ID(2), USUARIO_DEMO.id, S(0), 2),
    novoLancamento(ID(2), USUARIO_DEMO.id, S(2), 3.25),
    novoLancamento(ID(4), USUARIO_DEMO.id, S(1), 1.5),
    novoLancamento(ID(5), USUARIO_DEMO.id, S(0), 1),
    novoLancamento(ID(9), USUARIO_DEMO.id, S(2), 2),
    novoLancamento(ID(8), OUTROS_USUARIOS[1].id, S(1), 3),
    novoLancamento(ID(10), OUTROS_USUARIOS[0].id, S(-1), 2),
  ];
}

/* ===== Regras de calculo (o par exato do SQL) ============================= */

/**
 * public.carbon_aderencia_pct: executadas * 100 / planejadas, uma casa decimal.
 * NULL quando nao ha horas planejadas - sem plano nao existe aderencia, e devolver 0%
 * diria que a equipe nao entregou nada.
 */
function aderenciaPct(planejadas, executadas) {
  const plano = Number(planejadas) || 0;
  if (plano <= 0) return null;
  return arredondar(((Number(executadas) || 0) * 100) / plano, 1);
}

/** public.carbon_atividade_horas: soma dos lancamentos, opcionalmente por janela. */
function horasDaAtividade(atividadeId, de = null, ate = null) {
  return somarHoras(
    lancamentos.filter(
      (l) =>
        l.atividade_id === atividadeId &&
        (!de || l.data >= de) &&
        (!ate || l.data <= ate),
    ),
  );
}

function contarLancamentos(atividadeId) {
  return lancamentos.filter((l) => l.atividade_id === atividadeId).length;
}

/**
 * Intersecao de prazo com a janela, TOLERANTE A NULO, igual ao WHERE da funcao SQL:
 *   (de is null or data_fim is null or data_fim >= de)
 *   and (ate is null or data_inicio is null or data_inicio <= ate)
 * Atividade sem data nunca e excluida por um filtro de periodo: ficaria invisivel
 * exatamente na tela usada para caca-la.
 */
function intersectaJanela(item, de, ate) {
  if (de && item.data_fim && item.data_fim < de) return false;
  if (ate && item.data_inicio && item.data_inicio > ate) return false;
  return true;
}

/** Ordem do order by da funcao SQL: prioridade, prazo (nulo no fim), nome. */
function ordenarComoSql(lista) {
  return [...lista].sort((a, b) => {
    const pa = PESO_PRIORIDADE[a.prioridade] ?? 4;
    const pb = PESO_PRIORIDADE[b.prioridade] ?? 4;
    if (pa !== pb) return pa - pb;

    const fa = a.data_fim;
    const fb = b.data_fim;
    if (fa !== fb) {
      if (!fa) return 1;
      if (!fb) return -1;
      return fa < fb ? -1 : 1;
    }
    return String(a.nome).localeCompare(String(b.nome), 'pt-BR');
  });
}

/** Linha no formato exato de public.carbon_atividades_listar. */
function serializar(item) {
  // Regra 5: SEMPRE o total da atividade, sem janela.
  const executadas = horasDaAtividade(item.id);
  return {
    id: item.id,
    projeto_id: item.projeto_id,
    projeto_nome: item.projeto_id ? projetosDemo.get(item.projeto_id) ?? null : null,
    nome: item.nome,
    descricao: item.descricao,
    status: item.status,
    prioridade: item.prioridade,
    tipo: item.tipo,
    responsavel_id: item.responsavel_id,
    responsavel_nome: item.responsavel_id
      ? nomesPorUsuario.get(item.responsavel_id) ?? null
      : null,
    data_inicio: item.data_inicio,
    data_fim: item.data_fim,
    horas_planejadas: item.horas_planejadas,
    horas_executadas: executadas,
    // Regra 2, calculada no mesmo lugar que a funcao SQL calcula: dentro da
    // projecao da listagem, para lista e consolidado nunca divergirem.
    aderencia_pct: aderenciaPct(item.horas_planejadas, executadas),
    apontamentos: contarLancamentos(item.id),
    criado_em: item.criado_em,
    atualizado_em: item.atualizado_em,
  };
}

function acharAtividade(id) {
  const item = atividades.find((a) => a.id === id);
  if (!item) throw new ErroDemo('nao_encontrado');
  return item;
}

/* ===== Lista branca de campos ============================================= */

function validarEnum(valor, aceitos, campo, codigo = 'campo_invalido') {
  if (valor === null || valor === undefined || valor === '') return null;
  const texto = String(valor).trim();
  if (!aceitos.includes(texto)) throw new ErroDemo(codigo, campo);
  return texto;
}

/**
 * Mesma disciplina da Edge Function: campo desconhecido e IGNORADO, os tres enums com
 * default no banco sao OMITIDOS quando vem vazios (nunca null, que quebraria o NOT
 * NULL), e a coerencia do intervalo e conferida quando as duas pontas vem juntas.
 */
function montarDados(dados, modo) {
  const entrada = dados && typeof dados === 'object' ? dados : {};
  const veio = (campo) => Object.prototype.hasOwnProperty.call(entrada, campo);
  const saida = {};

  if (modo === 'criar' || veio('nome')) {
    const nome = String(entrada.nome ?? '').trim();
    if (!nome) throw new ErroDemo('campo_obrigatorio', 'nome');
    saida.nome = nome;
  }

  if (veio('descricao')) {
    const texto = String(entrada.descricao ?? '').trim();
    saida.descricao = texto || null;
  }
  if (veio('projeto_id')) saida.projeto_id = entrada.projeto_id || null;
  if (veio('responsavel_id')) saida.responsavel_id = entrada.responsavel_id || null;

  if (veio('status')) {
    const valor = validarEnum(entrada.status, STATUS_VALIDOS, 'status', 'status_invalido');
    if (valor) saida.status = valor;
  }
  if (veio('prioridade')) {
    const valor = validarEnum(entrada.prioridade, PRIORIDADES_VALIDAS, 'prioridade');
    if (valor) saida.prioridade = valor;
  }
  if (veio('tipo')) {
    const valor = validarEnum(entrada.tipo, TIPOS_VALIDOS, 'tipo');
    if (valor) saida.tipo = valor;
  }

  if (veio('data_inicio')) saida.data_inicio = validarData(entrada.data_inicio, 'data_inicio');
  if (veio('data_fim')) saida.data_fim = validarData(entrada.data_fim, 'data_fim');

  if (veio('horas_planejadas')) {
    const horas = numeroOuNulo(entrada.horas_planejadas);
    if (horas !== null && (horas < 0 || horas > LIMITE_HORAS_PLANEJADAS)) {
      throw new ErroDemo('campo_invalido', 'horas_planejadas');
    }
    saida.horas_planejadas = horas;
  }

  if (saida.data_inicio && saida.data_fim && saida.data_fim < saida.data_inicio) {
    throw new ErroDemo('campo_invalido', 'data_fim');
  }

  return saida;
}

/* ===== Funcoes que imitam o backend ====================================== */

export async function demoListarAtividades(filtros = {}) {
  semear();
  await esperar();

  const de = validarData(filtros.de, 'de');
  const ate = validarData(filtros.ate, 'ate');
  const tipo = validarEnum(filtros.tipo, TIPOS_VALIDOS, 'tipo');
  const status = validarEnum(filtros.status, STATUS_VALIDOS, 'status', 'status_invalido');
  const prioridade = validarEnum(filtros.prioridade, PRIORIDADES_VALIDAS, 'prioridade');
  const busca = String(filtros.busca ?? '').trim().toLowerCase();

  const filtradas = atividades.filter((item) => {
    if (filtros.projeto_id && item.projeto_id !== filtros.projeto_id) return false;
    if (tipo && item.tipo !== tipo) return false;
    if (status && item.status !== status) return false;
    if (prioridade && item.prioridade !== prioridade) return false;
    if (filtros.responsavel_id && item.responsavel_id !== filtros.responsavel_id) return false;
    if (!intersectaJanela(item, de, ate)) return false;
    if (busca) {
      const alvo = `${item.nome} ${item.descricao ?? ''}`.toLowerCase();
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });

  const limite = Number(filtros.limite) > 0 ? Number(filtros.limite) : 200;
  const pagina = Number(filtros.pagina) > 0 ? Number(filtros.pagina) : 1;
  const inicio = (pagina - 1) * limite;

  return {
    atividades: ordenarComoSql(filtradas).slice(inicio, inicio + limite).map(serializar),
    pagina,
    limite,
  };
}

export async function demoObterAtividade(id) {
  semear();
  await esperar();
  return { atividade: serializar(acharAtividade(id)) };
}

export async function demoCriarAtividade(dados) {
  semear();
  await esperar();
  const campos = montarDados(dados, 'criar');
  const criadoEm = agora();

  const nova = novaAtividade({
    id: novoId(),
    nome: campos.nome,
    descricao: campos.descricao ?? null,
    projeto_id: campos.projeto_id ?? null,
    responsavel_id: campos.responsavel_id ?? null,
    // Defaults do banco.
    status: campos.status || 'nao_iniciada',
    prioridade: campos.prioridade || 'media',
    tipo: campos.tipo || 'backoffice',
    data_inicio: campos.data_inicio ?? null,
    data_fim: campos.data_fim ?? null,
    horas_planejadas: campos.horas_planejadas ?? null,
  });
  nova.criado_em = criadoEm;
  nova.atualizado_em = criadoEm;

  atividades = [...atividades, nova];
  return { atividade: serializar(nova) };
}

export async function demoAtualizarAtividade(id, dados) {
  semear();
  await esperar();
  const item = acharAtividade(id);
  const campos = montarDados(dados, 'atualizar');

  if (Object.keys(campos).length === 0) throw new ErroDemo('nada_para_atualizar');

  // Coerencia do intervalo conferida contra o valor JA GRAVADO quando so uma ponta
  // vem no pedido. Em producao quem barra isso e o carbon_atividades_periodo_chk.
  const inicio = campos.data_inicio !== undefined ? campos.data_inicio : item.data_inicio;
  const fim = campos.data_fim !== undefined ? campos.data_fim : item.data_fim;
  if (inicio && fim && fim < inicio) throw new ErroDemo('campo_invalido', 'data_fim');

  Object.assign(item, campos);
  item.atualizado_em = agora();
  return { atividade: serializar(item) };
}

export async function demoRepriorizarAtividades(itens) {
  semear();
  await esperar();

  if (!Array.isArray(itens) || itens.length === 0) {
    throw new ErroDemo('campo_obrigatorio', 'itens');
  }
  if (itens.length > LIMITE_REPRIORIZACAO) throw new ErroDemo('campo_invalido', 'itens');

  // Valida TUDO antes de gravar qualquer coisa: um item torto no meio da lista nao
  // pode deixar metade da repriorizacao aplicada.
  const pedidos = itens.map((item) => {
    if (!item || typeof item !== 'object') throw new ErroDemo('campo_invalido', 'itens');
    if (!item.id) throw new ErroDemo('campo_obrigatorio', 'id');
    const prioridade = validarEnum(item.prioridade, PRIORIDADES_VALIDAS, 'prioridade');
    if (!prioridade) throw new ErroDemo('campo_obrigatorio', 'prioridade');
    return { id: item.id, prioridade };
  });

  let atualizados = 0;
  for (const pedido of pedidos) {
    const alvo = atividades.find((a) => a.id === pedido.id);
    if (!alvo) continue;
    alvo.prioridade = pedido.prioridade;
    alvo.atualizado_em = agora();
    atualizados += 1;
  }

  if (atualizados === 0) throw new ErroDemo('nao_encontrado');
  return { atualizados };
}

/**
 * Apontamentos de uma atividade.
 *
 * O escopo depende do papel, igual ao backend: admin e gestor veem os de todo mundo,
 * qualquer outro colaborador ve apenas os proprios - e o total devolvido tambem e so
 * o dele, para o total da equipe nao vazar por subtracao.
 */
export async function demoListarApontamentos(atividadeId) {
  semear();
  await esperar();
  acharAtividade(atividadeId);

  const consolidado = podeVerConsolidado();
  const lista = lancamentos
    .filter((l) => l.atividade_id === atividadeId)
    .filter((l) => consolidado || l.usuario_id === USUARIO_DEMO.id)
    .map((l) => ({
      id: l.id,
      atividade_id: l.atividade_id,
      usuario_id: l.usuario_id,
      usuario_nome: nomesPorUsuario.get(l.usuario_id) ?? null,
      data: l.data,
      horas: l.horas,
      observacao: l.observacao,
      criado_em: l.criado_em,
      atualizado_em: l.atualizado_em,
    }))
    .sort((a, b) => {
      if (a.data !== b.data) return a.data < b.data ? 1 : -1;
      return String(a.usuario_nome ?? '').localeCompare(String(b.usuario_nome ?? ''), 'pt-BR');
    });

  return {
    apontamentos: lista,
    escopo: consolidado ? 'consolidado' : 'proprio',
    horas: somarHoras(lista),
  };
}

/**
 * Lancamento rapido: cria, corrige ou apaga o apontamento do PROPRIO usuario num dia.
 *
 * Regra 8: a chave e (atividade, usuario, dia), portanto o segundo lancamento do mesmo
 * dia CORRIGE o primeiro em vez de somar em dobro. horas nula, vazia ou zero APAGA.
 * usuario_id nunca vem do pedido.
 */
export async function demoRegistrarApontamento(dados = {}) {
  semear();
  await esperar(140);

  const atividadeId = dados.atividade_id;
  if (!atividadeId) throw new ErroDemo('campo_obrigatorio', 'atividade_id');
  const data = validarData(dados.data, 'data');
  if (!data) throw new ErroDemo('campo_obrigatorio', 'data');

  acharAtividade(atividadeId);

  const horas = numeroOuNulo(dados.horas);
  /**
   * A observacao so e TOCADA quando veio no pedido.
   *
   * Espelha o upsert da Edge Function, que monta o ON CONFLICT DO UPDATE apenas com as
   * colunas presentes no corpo: um relancamento feito pela grade (que envia so as horas)
   * NAO pode apagar a anotacao do dia. Para limpar, mande observacao: null.
   */
  const veioObservacao = Object.prototype.hasOwnProperty.call(dados, 'observacao');
  const observacao = String(dados.observacao ?? '').trim() || null;

  const indice = lancamentos.findIndex(
    (l) =>
      l.atividade_id === atividadeId && l.usuario_id === USUARIO_DEMO.id && l.data === data,
  );

  if (horas === null || horas === 0) {
    if (indice >= 0) lancamentos = lancamentos.filter((_, i) => i !== indice);
    return {
      removido: true,
      apontamento: null,
      horas_executadas: horasDaAtividade(atividadeId),
    };
  }

  if (horas < 0 || horas > LIMITE_HORAS_DIA) throw new ErroDemo('campo_invalido', 'horas');

  let alvo;
  if (indice >= 0) {
    alvo = lancamentos[indice];
    alvo.horas = horas;
    if (veioObservacao) alvo.observacao = observacao;
    alvo.atualizado_em = agora();
  } else {
    alvo = novoLancamento(atividadeId, USUARIO_DEMO.id, data, horas, observacao);
    alvo.criado_em = agora();
    alvo.atualizado_em = alvo.criado_em;
    lancamentos = [...lancamentos, alvo];
  }

  return {
    removido: false,
    apontamento: { ...alvo },
    horas_executadas: horasDaAtividade(atividadeId),
  };
}

/** Apontamento do proprio usuario, ou os mesmos erros do backend. */
function meuLancamento(id) {
  const alvo = lancamentos.find((l) => l.id === id);
  if (!alvo) throw new ErroDemo('nao_encontrado');
  if (alvo.usuario_id !== USUARIO_DEMO.id) throw new ErroDemo('sem_permissao');
  return alvo;
}

export async function demoAtualizarApontamento(id, dados = {}) {
  semear();
  await esperar(140);
  const alvo = meuLancamento(id);
  const veio = (campo) => Object.prototype.hasOwnProperty.call(dados, campo);

  let mexeu = false;

  if (veio('horas')) {
    const horas = numeroOuNulo(dados.horas);
    // Zerar pelo PATCH nao apaga, igual ao backend: apagar tem caminho proprio.
    if (horas === null || horas <= 0 || horas > LIMITE_HORAS_DIA) {
      throw new ErroDemo('campo_invalido', 'horas');
    }
    alvo.horas = horas;
    mexeu = true;
  }

  if (veio('observacao')) {
    alvo.observacao = String(dados.observacao ?? '').trim() || null;
    mexeu = true;
  }

  if (!mexeu) throw new ErroDemo('nada_para_atualizar');

  alvo.atualizado_em = agora();
  return {
    apontamento: { ...alvo },
    horas_executadas: horasDaAtividade(alvo.atividade_id),
  };
}

export async function demoRemoverApontamento(id) {
  semear();
  await esperar(140);
  const alvo = meuLancamento(id);
  const atividadeId = alvo.atividade_id;
  lancamentos = lancamentos.filter((l) => l.id !== id);
  return { removido: true, horas_executadas: horasDaAtividade(atividadeId) };
}

/**
 * Grade da semana do proprio usuario. Mesmo formato de
 * public.carbon_minhas_horas_semana, e as mesmas duas regras:
 *   - a semana comeca na SEGUNDA (regra 3);
 *   - entram as atividades em que sou responsavel e que estao abertas, MAIS qualquer
 *     atividade em que eu apontei hora na semana;
 *   - somente as MINHAS horas: o total da equipe nao aparece aqui (LGPD).
 */
export async function demoMinhasHoras(semana) {
  semear();
  await esperar();

  const referencia = validarData(semana, 'semana') || hoje();
  const inicio = inicioDaSemana(referencia);
  const fim = somarDias(inicio, 6);

  const meusDaSemana = lancamentos.filter(
    (l) => l.usuario_id === USUARIO_DEMO.id && l.data >= inicio && l.data <= fim,
  );
  const idsComLancamento = new Set(meusDaSemana.map((l) => l.atividade_id));

  const relevantes = atividades.filter(
    (a) =>
      (a.responsavel_id === USUARIO_DEMO.id &&
        (a.status === 'nao_iniciada' || a.status === 'em_andamento')) ||
      idsComLancamento.has(a.id),
  );

  const porDia = diasDaSemana(inicio)
    .map((dia) => ({
      data: dia,
      horas: somarHoras(meusDaSemana.filter((l) => l.data === dia)),
    }))
    .filter((item) => item.horas > 0);

  return {
    semana: { inicio, fim, dias: diasDaSemana(inicio) },
    atividades: ordenarComoSql(relevantes).map((a) => ({
      id: a.id,
      nome: a.nome,
      tipo: a.tipo,
      status: a.status,
      prioridade: a.prioridade,
      projeto_id: a.projeto_id,
      projeto_nome: a.projeto_id ? projetosDemo.get(a.projeto_id) ?? null : null,
      data_inicio: a.data_inicio,
      data_fim: a.data_fim,
      horas_planejadas: a.horas_planejadas,
      sou_responsavel: a.responsavel_id === USUARIO_DEMO.id,
      minhas_horas_semana: somarHoras(meusDaSemana.filter((l) => l.atividade_id === a.id)),
      minhas_horas_total: somarHoras(
        lancamentos.filter((l) => l.usuario_id === USUARIO_DEMO.id && l.atividade_id === a.id),
      ),
    })),
    apontamentos: [...meusDaSemana]
      .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
      .map((l) => ({
        id: l.id,
        atividade_id: l.atividade_id,
        data: l.data,
        horas: l.horas,
        observacao: l.observacao,
      })),
    totais: { semana: somarHoras(meusDaSemana), por_dia: porDia },
  };
}

/**
 * Consolidado planejado x realizado. Mesmo formato de public.carbon_horas_resumo, com
 * as regras 4, 6 e 7: intersecao tolerante a nulo, atividade cancelada fora (com as
 * horas dela), e horas planejadas NAO rateadas pela janela.
 *
 * Restrito a admin e gestor, igual ao backend: papel de colaborador recebe
 * sem_permissao, e nao uma versao reduzida.
 */
export async function demoResumoHoras(filtros = {}) {
  semear();
  await esperar();

  if (!podeVerConsolidado()) throw new ErroDemo('sem_permissao');

  const de = validarData(filtros.de, 'de');
  const ate = validarData(filtros.ate, 'ate');
  const tipo = validarEnum(filtros.tipo, TIPOS_VALIDOS, 'tipo');

  const selecionadas = atividades.filter((item) => {
    if (item.status === 'cancelada') return false;
    if (filtros.projeto_id && item.projeto_id !== filtros.projeto_id) return false;
    if (tipo && item.tipo !== tipo) return false;
    return intersectaJanela(item, de, ate);
  });

  const idsSelecionados = new Set(selecionadas.map((a) => a.id));
  const naJanela = lancamentos.filter(
    (l) => idsSelecionados.has(l.atividade_id) && (!de || l.data >= de) && (!ate || l.data <= ate),
  );

  const base = selecionadas.map((item) => ({
    id: item.id,
    nome: item.nome,
    tipo: item.tipo,
    status: item.status,
    projeto_id: item.projeto_id,
    planejadas: Number(item.horas_planejadas) || 0,
    executadas: somarHoras(naJanela.filter((l) => l.atividade_id === item.id)),
  }));

  const planejadasTotal = arredondar(
    base.reduce((soma, item) => soma + item.planejadas, 0),
    2,
  );
  const executadasTotal = arredondar(
    base.reduce((soma, item) => soma + item.executadas, 0),
    2,
  );

  const porTipo = TIPOS_VALIDOS.map((valor) => {
    const grupo = base.filter((item) => item.tipo === valor);
    if (!grupo.length) return null;
    const planejadas = arredondar(grupo.reduce((s, i) => s + i.planejadas, 0), 2);
    const executadas = arredondar(grupo.reduce((s, i) => s + i.executadas, 0), 2);
    return {
      tipo: valor,
      atividades: grupo.length,
      planejadas,
      executadas,
      aderencia_pct: aderenciaPct(planejadas, executadas),
    };
  })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.executadas - a.executadas ||
        b.planejadas - a.planejadas ||
        a.tipo.localeCompare(b.tipo, 'pt-BR'),
    );

  const porSemana = [
    ...naJanela.reduce((mapa, l) => {
      const chave = inicioDaSemana(l.data);
      mapa.set(chave, (mapa.get(chave) || 0) + (Number(l.horas) || 0));
      return mapa;
    }, new Map()),
  ]
    .map(([chave, horas]) => ({ semana: chave, executadas: arredondar(horas, 2) }))
    .sort((a, b) => (a.semana < b.semana ? -1 : a.semana > b.semana ? 1 : 0));

  return {
    de,
    ate,
    com_janela: Boolean(de || ate),
    total: {
      atividades: base.length,
      planejadas: planejadasTotal,
      executadas: executadasTotal,
      aderencia_pct: aderenciaPct(planejadasTotal, executadasTotal),
    },
    por_tipo: porTipo,
    por_atividade: [...base]
      .sort(
        (a, b) =>
          b.executadas - a.executadas ||
          b.planejadas - a.planejadas ||
          String(a.nome).localeCompare(String(b.nome), 'pt-BR'),
      )
      .slice(0, 200)
      .map((item) => ({
        id: item.id,
        nome: item.nome,
        tipo: item.tipo,
        status: item.status,
        projeto_id: item.projeto_id,
        planejadas: item.planejadas,
        executadas: item.executadas,
        aderencia_pct: aderenciaPct(item.planejadas, item.executadas),
      })),
    por_semana: porSemana,
  };
}

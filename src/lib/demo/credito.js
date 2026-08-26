/**
 * demo/credito.js - dataset de demonstração de emissão e venda de crédito (issue #15).
 *
 * POR QUE EXISTE: permite revisar a tela de Crédito sem banco. Em MODO_DEMO (ver
 * src/lib/runtimeConfig.js: exige dev E o clique no botão de demonstração) as funções de
 * src/lib/api/credito.js não fazem rede e operam sobre o estado em memória daqui. As
 * mutações ALTERAM esse estado, para o gesto central da tela - lançar uma emissão ou uma
 * venda e ver o estoque se mexer - ser de fato exercitável.
 *
 * ESCOPO: não é cache nem persistência. Recarregar a página volta ao estado inicial. Em
 * build de produção MODO_DEMO é false por força (import.meta.env.DEV é estático) e o
 * bundler elimina os ramos que chamam este módulo.
 *
 * EM PRODUÇÃO A TELA ABRE VAZIA, e isso é o correto: carbon_emissoes_credito e
 * carbon_vendas nasceram vazias na migration 20260814101000_credito e o escopo delas
 * ainda aguarda validação do dono. O estado vazio da tela é a primeira coisa que alguém
 * vai ver de verdade; o dataset abaixo existe para revisar as OUTRAS quatro telas que a
 * mesma página vira quando o dado aparecer.
 *
 * FIDELIDADE É O PONTO. Três contas moram no banco e precisam sair IGUAIS aqui, senão a
 * revisão mostra número que a produção nunca produz:
 *
 *   1. ESTOQUE (view carbon_estoque_credito): disponível = emitido - buffer - vendido. O
 *      buffer está DENTRO do emitido e o aposentado NÃO é subtraído de novo, porque ele é
 *      subconjunto do vendido. A chave (projeto, vintage) vem da UNIÃO de emissões e
 *      vendas, nunca de um join a partir das emissões: venda a termo de vintage ainda não
 *      emitido precisa aparecer em vez de sumir.
 *   2. AJUSTE CORRESPONDENTE (função carbon_venda_ajuste_pendente): país do comprador
 *      diferente do país do projeto e sem ajuste registrado. País ausente em qualquer das
 *      pontas NÃO gera pendência.
 *   3. CONCILIAÇÃO (função carbon_estoque_conciliacao): percentual vendido sobre o
 *      VENDÁVEL, nunca sobre o emitido cheio, e nulo quando o denominador é zero.
 *
 * RECEITA NUNCA É CONVERTIDA. Em lugar nenhum deste arquivo existe soma de BRL com USD ou
 * EUR: converter exigiria taxa e data de referência, que são decisão contábil e não
 * existem no sistema. As três moedas andam lado a lado, e é de propósito que o dataset
 * tenha venda nas três - é o caso que a tela precisa saber desenhar.
 *
 * O USUÁRIO DA DEMONSTRAÇÃO NÃO É ADMIN (ver DEMO_EH_ADMIN). O comportamento que precisa
 * ser revisto é a MÁSCARA do comprador sob NDA; o caminho do admin não mostra nada de
 * novo além do nome que a máscara esconde.
 *
 * LGPD E CONFIDENCIALIDADE: nenhum dado real e nenhum dado pessoal. Nome de comprador,
 * volume, preço e faixa de serial reais são dado comercial confidencial e não entram em
 * código - a seção 9 da migration registra isso. Os compradores daqui são pessoas
 * jurídicas obviamente fictícias e NENHUM tem e-mail cadastrado, justamente para não
 * inventar endereço de contato.
 */

/* ===== Erro tipado ========================================================
   Mesmos códigos do backend, para a tela não tratar validação de um jeito no demo e de
   outro em produção. Classe própria e não a de outro domínio: quem converte em ErroApi
   (chamarDemo, em src/lib/api/base.js) só olha `codigo`, e acoplar dois datasets faria um
   mudar quando o outro mudasse.                                              */
export class ErroDemoCredito extends Error {
  constructor(codigo, campo) {
    super(`Recusado pelo modo demonstracao: ${codigo}${campo ? ` (${campo})` : ''}`);
    this.name = 'ErroDemoCredito';
    this.codigo = codigo;
    this.campo = campo ?? null;
  }
}

/* ===== Vocabulário (espelha os CHECK da migration) ======================== */

const STATUS_COMPRADOR = ['prospeccao', 'negociacao', 'recorrente', 'encerrado'];
const MOEDAS = ['BRL', 'USD', 'EUR'];
const VINTAGE_MINIMO = 1990;
const VINTAGE_MAXIMO = 2100;

/** Mesmo rótulo de ROTULO_SIGILOSO em supabase/functions/carbon-api/rotas/credito.ts. */
const ROTULO_SIGILOSO = 'Comprador sob NDA';

/**
 * O papel do usuário de demonstração.
 *
 * false de propósito: sem login não existe papel, e escolher "gestor" faz a revisão ver
 * a máscara do NDA funcionando, que é a regra 3 do domínio. Trocar para true só
 * substituiria o rótulo genérico pela razão social fictícia.
 */
const DEMO_EH_ADMIN = false;

/* ===== Números ============================================================
   Contas em unidades INTEIRAS da última casa: 4 para tCO2e (numeric(16,4)) e 2 para
   dinheiro (o valor_total gerado é round(..., 2)). Somar float acumula erro
   (0,1 + 0,2 = 0,30000000000000004) e o rodapé passa a mostrar centavo que ninguém
   lançou; o banco soma em numeric e não tem esse problema, então o demo também não
   pode ter.                                                                  */

const arredondar = (valor, casas) => {
  const fator = 10 ** casas;
  return Math.round((Number(valor) || 0) * fator) / fator;
};

const somar = (itens, campo, casas) => {
  const fator = 10 ** casas;
  const total = itens.reduce(
    (acumulado, item) => acumulado + Math.round((Number(item[campo]) || 0) * fator),
    0
  );
  return total / fator;
};

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function validarData(valor, campo) {
  if (valor === null || valor === undefined || valor === '') return null;
  const iso = String(valor);
  if (!DATA_ISO.test(iso)) throw new ErroDemoCredito('campo_invalido', campo);
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) {
    throw new ErroDemoCredito('campo_invalido', campo);
  }
  return iso;
}

/** Mesma regra de lerNumero na Edge Function: "13.250" é ambíguo e é RECUSADO. */
function validarNumero(valor, campo) {
  if (valor === null || valor === undefined || valor === '') return null;
  let bruto = valor;
  if (typeof bruto === 'string') {
    if (/\.\d{3}(?!\d)/.test(bruto)) throw new ErroDemoCredito('campo_invalido', campo);
    if (!bruto.includes('.') && bruto.includes(',')) bruto = bruto.replace(',', '.');
  }
  const n = Number(bruto);
  if (!Number.isFinite(n) || n < 0 || n >= 1e10) {
    throw new ErroDemoCredito('campo_invalido', campo);
  }
  return n;
}

function validarVintage(valor, campo = 'vintage') {
  const n = validarNumero(valor, campo);
  if (n === null) return null;
  if (!Number.isInteger(n) || n < VINTAGE_MINIMO || n > VINTAGE_MAXIMO) {
    throw new ErroDemoCredito('vintage_invalido', campo);
  }
  return n;
}

function validarTexto(valor, campo, limite = 500) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== 'string') throw new ErroDemoCredito('campo_invalido', campo);
  const limpo = valor.trim();
  if (limpo === '') return null;
  if (limpo.length > limite) throw new ErroDemoCredito('campo_invalido', campo);
  return limpo;
}

/* ===== Ajuste correspondente ==============================================
   REGRA 2. Tradução linha a linha de public.carbon_venda_ajuste_pendente, e gêmea de
   ajustePendente() em src/lib/api/credito.js. São duas cópias porque este arquivo NÃO
   pode importar daquele (é o contrário: a API importa o dataset, e o import de volta
   seria um ciclo). NÃO é exportada de propósito: exportar daqui convidaria a tela a
   importar do módulo de demonstração, e esse import arrastaria o dataset fictício
   inteiro para o bundle de produção.                                         */
function ajustePendente(paisComprador, paisProjeto, ajuste) {
  if (ajuste === true) return false;
  const a = String(paisComprador ?? '').trim();
  const b = String(paisProjeto ?? '').trim();
  if (a === '' || b === '') return false;
  return a.toLowerCase() !== b.toLowerCase();
}

/* ===== Estado =============================================================
   Montado na PRIMEIRA LEITURA e não no topo do módulo. Uma expressão de topo é efeito
   colateral que o Rollup não consegue provar puro, e o módulo inteiro (com o dataset)
   ficaria vivo no bundle de produção mesmo com todos os ramos que o chamam eliminados.
   O acessador bd() é o mesmo padrão de src/lib/demo/indicadores.js.          */
let estado = null;

const USUARIO_DEMO_ID = '00000000-0000-4000-8000-0000000000a1';

/** Mesmo PROJETO_DEMO_ID de src/lib/demoProjetos.js. Ver a nota em inicial(). */
const PROJETO_DEMO_ID = '00000000-0000-4000-8000-000000000001';

/**
 * DATAS FIXAS, e aqui isso é correto.
 *
 * Em src/lib/demo/fornecedores.js as datas são ancoradas em hoje porque lá o status da
 * parcela (vencida, a vencer) é derivado da data corrente. Neste domínio nenhuma conta
 * olha o relógio: vintage é o ano da safra, e emissão e venda são fatos datados. Ancorar
 * em hoje só faria o vintage 2022 andar sozinho a cada ano.
 */
function inicial() {
  // MESMO projeto de src/lib/demoProjetos.js, com o MESMO id e o MESMO nome. A tela
  // monta o seletor de projeto com listarProjetos(), que no modo demonstração devolve
  // aquele dataset: com um projeto próprio aqui, o estoque falaria de um projeto que o
  // formulário não oferece, e ninguém entenderia por quê.
  const projetos = [
    {
      id: PROJETO_DEMO_ID,
      nome: 'Projeto Demonstração - Vale do Exemplo',
      registro_id: 'REG-DEMO-0000',
      pais: 'Brasil',
      standard: 'VCS+CCB',
      ativo: true,
    },
  ];

  const compradores = [
    comprador({
      id: 'b0000000-0000-4000-8000-000000000001',
      nome: 'Comprador Exemplo A - energia',
      pais: 'Alemanha',
      status: 'recorrente',
      recorrente: true,
      observacoes: 'Cadastro de demonstração. Compra recorrente desde o primeiro vintage.',
    }),
    comprador({
      id: 'b0000000-0000-4000-8000-000000000002',
      nome: 'Comprador Exemplo B - varejo',
      pais: 'Brasil',
      status: 'negociacao',
      observacoes: 'Cadastro de demonstração. Venda doméstica, sem questão de Artigo 6.',
    }),
    comprador({
      // SIGILOSO: é este registro que exercita a regra 3. A tela não deve conseguir
      // mostrar a razão social dele, e o país precisa continuar visível (é dele que
      // depende a cobrança do ajuste correspondente).
      id: 'b0000000-0000-4000-8000-000000000003',
      nome: 'Comprador Exemplo C - aviação',
      pais: 'Países Baixos',
      status: 'recorrente',
      recorrente: true,
      sigiloso: true,
      observacoes:
        'Cadastro de demonstração sob acordo de confidencialidade. Esta anotação aparece para todo mundo, por isso não traz o nome.',
    }),
    comprador({
      // Sem país e sem venda nenhuma, de propósito: é o cadastro incompleto que a tela
      // precisa cobrar SEM chamar de pendência de ajuste correspondente.
      id: 'b0000000-0000-4000-8000-000000000004',
      nome: 'Comprador Exemplo D - indústria',
      pais: null,
      status: 'prospeccao',
      observacoes: 'Cadastro de demonstração sem país informado.',
    }),
  ];

  // UM projeto e CINCO vintages: é a quebra por safra que faz o estoque, e ela cobre os
  // quatro estados de linha que a tela precisa saber desenhar (vendida em parte,
  // parada, sem serial e sobrevendida) sem inventar um segundo projeto.
  const projetoId = projetos[0].id;

  const emissoes = [
    emissao({
      id: 'e0000000-0000-4000-8000-000000000001',
      projeto_id: projetoId,
      vintage: 2022,
      quantidade_tco2e: 120000,
      buffer_tco2e: 18000,
      serial_inicio: 'VCU-DEMO-0000000001',
      serial_fim: 'VCU-DEMO-0000120000',
      data_emissao: '2023-06-30',
    }),
    emissao({
      // Sem faixa de serial: alimenta a bandeira emissoes_sem_serial do estoque.
      id: 'e0000000-0000-4000-8000-000000000002',
      projeto_id: projetoId,
      vintage: 2023,
      quantidade_tco2e: 95000,
      buffer_tco2e: 14250,
      data_emissao: '2024-07-15',
      observacoes: 'Emissão de demonstração ainda sem faixa de serial cadastrada.',
    }),
    emissao({
      id: 'e0000000-0000-4000-8000-000000000003',
      projeto_id: projetoId,
      vintage: 2024,
      quantidade_tco2e: 30000,
      buffer_tco2e: 4500,
      serial_inicio: 'VCU-DEMO-0000200001',
      serial_fim: 'VCU-DEMO-0000230000',
      data_emissao: '2025-05-20',
    }),
    emissao({
      // Sem venda nenhuma: é o estoque parado, que é informação comercial e não erro.
      id: 'e0000000-0000-4000-8000-000000000004',
      projeto_id: projetoId,
      vintage: 2025,
      quantidade_tco2e: 8000,
      buffer_tco2e: 1200,
      serial_inicio: 'VCU-DEMO-0000300001',
      serial_fim: 'VCU-DEMO-0000308000',
      data_emissao: '2026-02-10',
    }),
  ];

  const vendas = [
    venda({
      // Internacional SEM ajuste registrado: ajuste_pendente = true.
      id: 'd0000000-0000-4000-8000-000000000001',
      comprador_id: compradores[0].id,
      projeto_id: projetoId,
      vintage: 2022,
      quantidade_tco2e: 40000,
      preco_unitario: 8.5,
      moeda: 'EUR',
      data: '2023-09-12',
    }),
    venda({
      // Doméstica e já aposentada: o aposentado é subconjunto do vendido, e é por isso
      // que ele NÃO sai do estoque uma segunda vez.
      id: 'd0000000-0000-4000-8000-000000000002',
      comprador_id: compradores[1].id,
      projeto_id: projetoId,
      vintage: 2022,
      quantidade_tco2e: 25000,
      preco_unitario: 45,
      moeda: 'BRL',
      data: '2024-02-08',
      aposentado: true,
      data_aposentadoria: '2024-03-01',
    }),
    venda({
      // Internacional COM ajuste registrado: internacional sim, pendente não. É deste
      // comprador que a máscara do NDA esconde a razão social.
      id: 'd0000000-0000-4000-8000-000000000003',
      comprador_id: compradores[2].id,
      projeto_id: projetoId,
      vintage: 2023,
      quantidade_tco2e: 30000,
      preco_unitario: 9.2,
      moeda: 'USD',
      data: '2025-01-20',
      ajuste_correspondente: true,
    }),
    venda({
      // Sem preço: acontece quando o valor está sob confidencialidade ou em negociação.
      // A tela precisa mostrar o volume sem inventar receita.
      id: 'd0000000-0000-4000-8000-000000000004',
      comprador_id: compradores[0].id,
      projeto_id: projetoId,
      vintage: 2024,
      quantidade_tco2e: 12000,
      preco_unitario: null,
      moeda: 'EUR',
      data: '2025-08-05',
      observacoes: 'Venda de demonstração com preço sob confidencialidade.',
    }),
    venda({
      // VENDA A TERMO: vintage 2026 ainda não emitido. Liga sem_emissao e sobrevendido
      // na linha de estoque, que é o alerta central da aba - e é legítima, não é erro.
      id: 'd0000000-0000-4000-8000-000000000005',
      comprador_id: compradores[1].id,
      projeto_id: projetoId,
      vintage: 2026,
      quantidade_tco2e: 5000,
      preco_unitario: 52,
      moeda: 'BRL',
      data: '2026-01-15',
      observacoes: 'Venda a termo de demonstração: o vintage ainda não foi emitido.',
    }),
  ];

  return { projetos, compradores, emissoes, vendas, proximoId: 100 };
}

function bd() {
  if (!estado) estado = inicial();
  return estado;
}

function comprador(dados) {
  return {
    id: dados.id,
    nome: dados.nome,
    pais: dados.pais ?? null,
    status: dados.status ?? 'prospeccao',
    // NENHUM e-mail no dataset, e a ausência é a regra de LGPD do topo: inventar
    // endereço de contato é inventar dado pessoal, mesmo em demonstração.
    email: null,
    recorrente: dados.recorrente ?? false,
    sigiloso: dados.sigiloso ?? false,
    observacoes: dados.observacoes ?? null,
    ativo: dados.ativo ?? true,
    criado_por: USUARIO_DEMO_ID,
    criado_em: '2026-01-05T12:00:00.000Z',
    atualizado_em: '2026-01-05T12:00:00.000Z',
  };
}

function emissao(dados) {
  return {
    id: dados.id,
    projeto_id: dados.projeto_id,
    vintage: dados.vintage,
    quantidade_tco2e: dados.quantidade_tco2e,
    buffer_tco2e: dados.buffer_tco2e ?? 0,
    serial_inicio: dados.serial_inicio ?? null,
    serial_fim: dados.serial_fim ?? null,
    data_emissao: dados.data_emissao ?? null,
    observacoes: dados.observacoes ?? null,
    criado_por: USUARIO_DEMO_ID,
    criado_em: '2026-01-05T12:00:00.000Z',
    atualizado_em: '2026-01-05T12:00:00.000Z',
  };
}

function venda(dados) {
  return {
    id: dados.id,
    comprador_id: dados.comprador_id,
    projeto_id: dados.projeto_id,
    vintage: dados.vintage,
    quantidade_tco2e: dados.quantidade_tco2e,
    preco_unitario: dados.preco_unitario ?? null,
    moeda: dados.moeda ?? 'BRL',
    data: dados.data ?? null,
    contrato_documento_id: dados.contrato_documento_id ?? null,
    ajuste_correspondente: dados.ajuste_correspondente ?? false,
    aposentado: dados.aposentado ?? false,
    data_aposentadoria: dados.data_aposentadoria ?? null,
    observacoes: dados.observacoes ?? null,
    criado_por: USUARIO_DEMO_ID,
    criado_em: '2026-01-05T12:00:00.000Z',
    atualizado_em: '2026-01-05T12:00:00.000Z',
  };
}

/* ===== Buscas internas ==================================================== */

/**
 * O dataset conhece UM projeto, o mesmo de src/lib/demoProjetos.js.
 *
 * Projeto criado durante a sessão de demonstração (a tela de Projetos permite) não
 * existe aqui, e lançar emissão para ele é recusado com nao_encontrado. É limite do
 * dataset, não do produto: em produção quem resolve o projeto é lerProjetoVisivel.
 */
const acharProjeto = (id) => bd().projetos.find((p) => p.id === id) ?? null;

function acharComprador(id) {
  const achado = bd().compradores.find((c) => c.id === id);
  if (!achado) throw new ErroDemoCredito('nao_encontrado');
  return achado;
}

function acharEmissao(id) {
  const achada = bd().emissoes.find((e) => e.id === id);
  if (!achada) throw new ErroDemoCredito('nao_encontrado');
  return achada;
}

function acharVenda(id) {
  const achada = bd().vendas.find((v) => v.id === id);
  if (!achada) throw new ErroDemoCredito('nao_encontrado');
  return achada;
}

/* ===== Máscara do sigilo ==================================================
   REGRA 3, espelho de mascararComprador/mascararVenda na Edge Function. Em produção
   quem decide é o servidor, e a tela apenas obedece ao par (nome, nome_mascarado); aqui
   a decisão é tomada com DEMO_EH_ADMIN para o mesmo par chegar à tela.        */

function mascararComprador(linha) {
  const oculto = linha.sigiloso === true && !DEMO_EH_ADMIN;
  if (!oculto) return { ...linha, nome_mascarado: false };
  const saida = { ...linha, nome: ROTULO_SIGILOSO, nome_mascarado: true };
  delete saida.email;
  return saida;
}

function mascararVenda(linha) {
  const oculto = linha.comprador_sigiloso === true && !DEMO_EH_ADMIN;
  if (!oculto) return { ...linha, comprador_nome_mascarado: false };
  return { ...linha, comprador_nome: ROTULO_SIGILOSO, comprador_nome_mascarado: true };
}

/* ===== Views ==============================================================
   Cada função abaixo é o espelho de uma view da migration. O resto do arquivo só chama:
   duas implementações da mesma soma divergem no primeiro caso de borda.       */

/** Espelho de public.carbon_vendas_detalhe. */
function vendaDetalhe(v) {
  const c = bd().compradores.find((x) => x.id === v.comprador_id) ?? null;
  const p = acharProjeto(v.projeto_id);
  const precoUnitario = v.preco_unitario === null ? null : Number(v.preco_unitario);

  return {
    ...v,
    // Coluna GERADA no banco: quantidade vezes preço, arredondado em 2 casas, e NULL
    // quando não há preço. Calculada aqui pelo mesmo motivo, nunca digitada.
    valor_total:
      precoUnitario === null ? null : arredondar(Number(v.quantidade_tco2e) * precoUnitario, 2),
    comprador_nome: c?.nome ?? null,
    comprador_pais: c?.pais ?? null,
    comprador_status: c?.status ?? null,
    comprador_recorrente: c?.recorrente ?? false,
    comprador_sigiloso: c?.sigiloso ?? false,
    comprador_ativo: c?.ativo ?? true,
    projeto_nome: p?.nome ?? null,
    projeto_registro_id: p?.registro_id ?? null,
    projeto_pais: p?.pais ?? null,
    // Sem documentos no dataset: o vínculo com o contrato existe no esquema e a tela
    // precisa saber desenhar a ausência dele.
    contrato_titulo: null,
    contrato_url: null,
    ajuste_pendente: ajustePendente(c?.pais, p?.pais, v.ajuste_correspondente),
    venda_internacional: ajustePendente(c?.pais, p?.pais, false),
  };
}

/** Espelho de public.carbon_emissoes_detalhe. */
function emissaoDetalhe(e) {
  const p = acharProjeto(e.projeto_id);
  return {
    ...e,
    // Vendável do EVENTO de emissão. NÃO desconta venda: venda é por (projeto, vintage)
    // e não por evento, e quem responde disponibilidade é o estoque.
    vendavel_tco2e: arredondar(Number(e.quantidade_tco2e) - Number(e.buffer_tco2e), 4),
    projeto_nome: p?.nome ?? null,
    projeto_registro_id: p?.registro_id ?? null,
    projeto_pais: p?.pais ?? null,
    projeto_standard: p?.standard ?? null,
  };
}

/** Espelho de public.carbon_compradores_listagem (a view que não tem a coluna email). */
function compradorListagem(c) {
  const vendas = bd().vendas.filter((v) => v.comprador_id === c.id).map(vendaDetalhe);
  const datas = vendas.map((v) => v.data).filter(Boolean).sort();
  const porMoeda = (sigla) => somar(vendas.filter((v) => v.moeda === sigla), 'valor_total', 2);

  return {
    id: c.id,
    nome: c.nome,
    pais: c.pais,
    status: c.status,
    recorrente: c.recorrente,
    sigiloso: c.sigiloso,
    observacoes: c.observacoes,
    ativo: c.ativo,
    criado_em: c.criado_em,
    atualizado_em: c.atualizado_em,
    // Booleano no lugar do e-mail: é assim que a view entrega, para a tela poder cobrar
    // o cadastro do contato sem que o endereço trafegue.
    tem_email: c.email !== null,
    vendas: vendas.length,
    projetos: new Set(vendas.map((v) => v.projeto_id)).size,
    volume_tco2e: somar(vendas, 'quantidade_tco2e', 4),
    aposentado_tco2e: somar(vendas.filter((v) => v.aposentado), 'quantidade_tco2e', 4),
    receita_brl: porMoeda('BRL'),
    receita_usd: porMoeda('USD'),
    receita_eur: porMoeda('EUR'),
    vendas_sem_preco: vendas.filter((v) => v.preco_unitario === null).length,
    vendas_ajuste_pendente: vendas.filter((v) => v.ajuste_pendente).length,
    primeira_venda: datas[0] ?? null,
    ultima_venda: datas[datas.length - 1] ?? null,
  };
}

/**
 * Espelho de public.carbon_estoque_credito.
 *
 * REGRA 1. A chave (projeto, vintage) sai da UNIÃO de emissões e vendas: montar a partir
 * das emissões faria a venda a termo desaparecer, e o estoque mentiria por omissão -
 * exatamente o silêncio que este domínio existe para acabar.
 */
function linhasDeEstoque() {
  const b = bd();
  const chaves = new Map();
  const chave = (projetoId, vintage) => `${projetoId}|${vintage}`;

  for (const e of b.emissoes) chaves.set(chave(e.projeto_id, e.vintage), [e.projeto_id, e.vintage]);
  for (const v of b.vendas) chaves.set(chave(v.projeto_id, v.vintage), [v.projeto_id, v.vintage]);

  const linhas = [];
  for (const [projetoId, vintage] of chaves.values()) {
    const p = acharProjeto(projetoId);
    if (!p) continue;

    const emissoes = b.emissoes.filter((e) => e.projeto_id === projetoId && e.vintage === vintage);
    const vendas = b.vendas
      .filter((v) => v.projeto_id === projetoId && v.vintage === vintage)
      .map(vendaDetalhe);

    const emitido = somar(emissoes, 'quantidade_tco2e', 4);
    const buffer = somar(emissoes, 'buffer_tco2e', 4);
    const vendido = somar(vendas, 'quantidade_tco2e', 4);
    const aposentado = somar(vendas.filter((v) => v.aposentado), 'quantidade_tco2e', 4);
    // O buffer está DENTRO do emitido e o aposentado é subconjunto do vendido: subtrair
    // os dois contaria a mesma tonelada duas vezes, e é o erro mais provável nesta conta.
    const vendavel = arredondar(emitido - buffer, 4);
    const disponivel = arredondar(vendavel - vendido, 4);

    const datasEmissao = emissoes.map((e) => e.data_emissao).filter(Boolean).sort();
    const datasVenda = vendas.map((v) => v.data).filter(Boolean).sort();
    const porMoeda = (sigla) => somar(vendas.filter((v) => v.moeda === sigla), 'valor_total', 2);

    linhas.push({
      projeto_id: projetoId,
      vintage,
      projeto_nome: p.nome,
      projeto_registro_id: p.registro_id,
      projeto_pais: p.pais,
      projeto_standard: p.standard,
      projeto_ativo: p.ativo,
      emissoes: emissoes.length,
      emitido_tco2e: emitido,
      buffer_tco2e: buffer,
      vendas: vendas.length,
      compradores: new Set(vendas.map((v) => v.comprador_id)).size,
      vendido_tco2e: vendido,
      aposentado_tco2e: aposentado,
      vendavel_tco2e: vendavel,
      disponivel_tco2e: disponivel,
      // Percentual sobre o VENDÁVEL, nunca sobre o emitido cheio: o buffer nunca esteve
      // à venda. Nulo (e não zero) quando não há denominador - zero afirmaria que nada
      // foi vendido de um estoque que existe.
      vendido_pct: vendavel <= 0 ? null : arredondar((vendido * 100) / vendavel, 1),
      receita_brl: porMoeda('BRL'),
      receita_usd: porMoeda('USD'),
      receita_eur: porMoeda('EUR'),
      vendas_ajuste_pendente: vendas.filter((v) => v.ajuste_pendente).length,
      emissoes_sem_serial: emissoes.filter((e) => e.serial_inicio === null).length,
      primeira_emissao: datasEmissao[0] ?? null,
      ultima_emissao: datasEmissao[datasEmissao.length - 1] ?? null,
      primeira_venda: datasVenda[0] ?? null,
      ultima_venda: datasVenda[datasVenda.length - 1] ?? null,
      sobrevendido: disponivel < 0,
      sem_emissao: emissoes.length === 0 && vendas.length > 0,
      sem_venda: vendas.length === 0 && emissoes.length > 0,
    });
  }

  return linhas.sort((a, b2) =>
    a.projeto_nome === b2.projeto_nome
      ? b2.vintage - a.vintage
      : String(a.projeto_nome).localeCompare(String(b2.projeto_nome), 'pt-BR')
  );
}

/**
 * Espelho de public.carbon_estoque_conciliacao.
 *
 * REGRA 3. Nunca devolve null: conjunto vazio devolve zeros e listas vazias, que é o
 * estado de produção hoje. Um null aqui viraria traço em toda a faixa de resumo.
 */
function conciliar(base) {
  const emitido = somar(base, 'emitido_tco2e', 4);
  const buffer = somar(base, 'buffer_tco2e', 4);
  const vendavel = somar(base, 'vendavel_tco2e', 4);
  const vendido = somar(base, 'vendido_tco2e', 4);
  const aposentado = somar(base, 'aposentado_tco2e', 4);
  const disponivel = somar(base, 'disponivel_tco2e', 4);

  const porVintage = new Map();
  for (const linha of base) {
    const atual = porVintage.get(linha.vintage) ?? {
      vintage: linha.vintage,
      emitido_tco2e: 0,
      buffer_tco2e: 0,
      vendavel_tco2e: 0,
      vendido_tco2e: 0,
      aposentado_tco2e: 0,
      disponivel_tco2e: 0,
    };
    for (const campo of [
      'emitido_tco2e',
      'buffer_tco2e',
      'vendavel_tco2e',
      'vendido_tco2e',
      'aposentado_tco2e',
      'disponivel_tco2e',
    ]) {
      atual[campo] = arredondar(atual[campo] + Number(linha[campo] || 0), 4);
    }
    porVintage.set(linha.vintage, atual);
  }

  return {
    linhas: base.length,
    projetos: new Set(base.map((l) => l.projeto_id)).size,
    vintages: new Set(base.map((l) => l.vintage)).size,
    emissoes: base.reduce((t, l) => t + l.emissoes, 0),
    vendas: base.reduce((t, l) => t + l.vendas, 0),
    emitido_tco2e: emitido,
    buffer_tco2e: buffer,
    vendavel_tco2e: vendavel,
    vendido_tco2e: vendido,
    aposentado_tco2e: aposentado,
    disponivel_tco2e: disponivel,
    vendido_pct: vendavel <= 0 ? null : arredondar((vendido * 100) / vendavel, 1),
    aposentado_pct: vendido <= 0 ? null : arredondar((aposentado * 100) / vendido, 1),
    // Três moedas lado a lado. Não existe chave de total somado, e a ausência dela é a
    // regra do domínio, não esquecimento.
    receita: {
      BRL: somar(base, 'receita_brl', 2),
      USD: somar(base, 'receita_usd', 2),
      EUR: somar(base, 'receita_eur', 2),
    },
    alertas: {
      sobrevendido: base.filter((l) => l.sobrevendido).length,
      sem_emissao: base.filter((l) => l.sem_emissao).length,
      sem_venda: base.filter((l) => l.sem_venda).length,
      vendas_ajuste_pendente: base.reduce((t, l) => t + l.vendas_ajuste_pendente, 0),
    },
    por_vintage: [...porVintage.values()].sort((a, b2) => a.vintage - b2.vintage),
  };
}

/* ===== Compradores ======================================================== */

export function demoListarCompradores({
  busca = null,
  status = null,
  ativo = null,
  recorrente = null,
} = {}) {
  let lista = bd().compradores.map(compradorListagem);

  if (status) {
    if (!STATUS_COMPRADOR.includes(status)) throw new ErroDemoCredito('status_invalido', 'status');
    lista = lista.filter((c) => c.status === status);
  }
  if (ativo === 'true' || ativo === true) lista = lista.filter((c) => c.ativo);
  if (ativo === 'false' || ativo === false) lista = lista.filter((c) => !c.ativo);
  if (recorrente === 'true' || recorrente === true) lista = lista.filter((c) => c.recorrente);

  if (busca && String(busca).trim()) {
    const termo = String(busca).trim().toLowerCase();
    // A busca por nome NÃO alcança comprador sigiloso, igual à Edge Function: sem isso
    // bastaria refinar o termo e observar quando a linha mascarada aparece para soletrar
    // a razão social sob NDA.
    lista = lista.filter(
      (c) => (DEMO_EH_ADMIN || !c.sigiloso) && String(c.nome).toLowerCase().includes(termo)
    );
  }

  // Sigilosos por último para quem não é admin: numa lista alfabética, a posição da
  // linha mascarada entregaria a primeira letra do nome que a máscara escondeu.
  lista.sort((a, b2) => {
    if (!DEMO_EH_ADMIN && a.sigiloso !== b2.sigiloso) return a.sigiloso ? 1 : -1;
    return String(a.nome).localeCompare(String(b2.nome), 'pt-BR');
  });

  return {
    compradores: lista.map(mascararComprador),
    total: lista.length,
    pagina: 1,
    limite: 200,
    resumo: {
      total: lista.length,
      ativos: lista.filter((c) => c.ativo).length,
      recorrentes: lista.filter((c) => c.recorrente).length,
      sigilosos: lista.filter((c) => c.sigiloso).length,
      com_venda: lista.filter((c) => c.vendas > 0).length,
      por_status: {
        prospeccao: lista.filter((c) => c.status === 'prospeccao').length,
        negociacao: lista.filter((c) => c.status === 'negociacao').length,
        recorrente: lista.filter((c) => c.status === 'recorrente').length,
        encerrado: lista.filter((c) => c.status === 'encerrado').length,
      },
      volume_tco2e: somar(lista, 'volume_tco2e', 4),
      aposentado_tco2e: somar(lista, 'aposentado_tco2e', 4),
      receita: {
        BRL: somar(lista, 'receita_brl', 2),
        USD: somar(lista, 'receita_usd', 2),
        EUR: somar(lista, 'receita_eur', 2),
      },
      vendas_sem_preco: lista.reduce((t, c) => t + c.vendas_sem_preco, 0),
      vendas_ajuste_pendente: lista.reduce((t, c) => t + c.vendas_ajuste_pendente, 0),
    },
  };
}

export function demoObterComprador(id) {
  const alvo = acharComprador(id);
  const vendas = bd()
    .vendas.filter((v) => v.comprador_id === id)
    .map(vendaDetalhe)
    .map(mascararVenda);

  return { comprador: mascararComprador(alvo), vendas };
}

/** Campos graváveis, com a mesma normalização de status/recorrente da Edge Function. */
function camposDoComprador(dados, criando) {
  const saida = {};

  if (criando || 'nome' in dados) {
    const nome = validarTexto(dados.nome, 'nome', 200);
    if (!nome) throw new ErroDemoCredito('campo_obrigatorio', 'nome');
    saida.nome = nome;
  }
  if ('pais' in dados) saida.pais = validarTexto(dados.pais, 'pais', 120);
  if ('observacoes' in dados) saida.observacoes = validarTexto(dados.observacoes, 'observacoes', 5000);
  if ('status' in dados) {
    const status = validarTexto(dados.status, 'status', 40);
    if (status !== null) {
      if (!STATUS_COMPRADOR.includes(status)) {
        throw new ErroDemoCredito('status_invalido', 'status');
      }
      saida.status = status;
    }
  }
  if ('recorrente' in dados) saida.recorrente = dados.recorrente === true;
  if ('sigiloso' in dados) saida.sigiloso = dados.sigiloso === true;
  if ('ativo' in dados) saida.ativo = dados.ativo !== false;

  // O CHECK carbon_compradores_recorrencia_coerente_chk proíbe status 'recorrente' com a
  // flag falsa. Normalizar aqui é o que faz esse check nunca ser alcançado pela tela.
  if (saida.status === 'recorrente') saida.recorrente = true;

  return saida;
}

export function demoCriarComprador(dados = {}) {
  const b = bd();
  const novo = comprador({
    id: `demo-comprador-${b.proximoId++}`,
    ...camposDoComprador(dados, true),
  });
  b.compradores.push(novo);
  // A linha CRUA, e não a da listagem: é o que a Edge Function devolve no POST e no
  // PATCH (a listagem tem os agregados e não tem email). Duas formas para a mesma
  // resposta fariam a tela funcionar no demo e quebrar em produção.
  return { comprador: mascararComprador({ ...novo }) };
}

export function demoAtualizarComprador(id, dados = {}) {
  const alvo = acharComprador(id);

  // Espelho das duas recusas da Edge Function: quem não pode LER a identidade sob NDA
  // também não a reescreve nem a revela.
  if (alvo.sigiloso && !DEMO_EH_ADMIN && ('nome' in dados || 'email' in dados)) {
    throw new ErroDemoCredito('comprador_sigiloso', 'nome');
  }
  if (alvo.sigiloso && !DEMO_EH_ADMIN && dados.sigiloso === false) {
    throw new ErroDemoCredito('comprador_sigiloso', 'sigiloso');
  }

  const campos = camposDoComprador(dados, false);
  if (Object.keys(campos).length === 0) throw new ErroDemoCredito('nada_para_atualizar');

  Object.assign(alvo, campos, { atualizado_em: new Date().toISOString() });
  return { comprador: mascararComprador({ ...alvo }) };
}

/* ===== Emissões =========================================================== */

/* Os filtros chegam com as MESMAS chaves da query string da Edge Function
   (snake_case), e não numa forma própria: uma tradução no meio do caminho seria mais
   um lugar para o nome do filtro divergir entre o demo e a produção. */
export function demoListarEmissoes({ projeto_id = null, vintage = null, busca = null } = {}) {
  let lista = bd().emissoes.map(emissaoDetalhe);

  if (projeto_id) lista = lista.filter((e) => e.projeto_id === projeto_id);
  if (vintage) {
    const ano = validarVintage(vintage);
    lista = lista.filter((e) => e.vintage === ano);
  }
  if (busca && String(busca).trim()) {
    const termo = String(busca).trim().toLowerCase();
    lista = lista.filter((e) => String(e.serial_inicio ?? '').toLowerCase().includes(termo));
  }

  lista.sort((a, b2) =>
    a.vintage === b2.vintage
      ? String(b2.data_emissao ?? '').localeCompare(String(a.data_emissao ?? ''))
      : b2.vintage - a.vintage
  );

  return { emissoes: lista, total: lista.length, pagina: 1, limite: 200 };
}

function camposDaEmissao(dados, criando) {
  const saida = {};

  if (criando || 'vintage' in dados) {
    const vintage = validarVintage(dados.vintage);
    if (vintage === null) throw new ErroDemoCredito('campo_obrigatorio', 'vintage');
    saida.vintage = vintage;
  }
  if (criando || 'quantidade_tco2e' in dados) {
    const quantidade = validarNumero(dados.quantidade_tco2e, 'quantidade_tco2e');
    if (quantidade === null) throw new ErroDemoCredito('campo_obrigatorio', 'quantidade_tco2e');
    saida.quantidade_tco2e = arredondar(quantidade, 4);
  }
  if ('buffer_tco2e' in dados) {
    saida.buffer_tco2e = arredondar(validarNumero(dados.buffer_tco2e, 'buffer_tco2e') ?? 0, 4);
  }
  if ('serial_inicio' in dados) {
    saida.serial_inicio = validarTexto(dados.serial_inicio, 'serial_inicio', 120);
  }
  if ('serial_fim' in dados) saida.serial_fim = validarTexto(dados.serial_fim, 'serial_fim', 120);
  if ('data_emissao' in dados) saida.data_emissao = validarData(dados.data_emissao, 'data_emissao');
  if ('observacoes' in dados) {
    saida.observacoes = validarTexto(dados.observacoes, 'observacoes', 5000);
  }

  return saida;
}

/** As duas regras que ligam campos entre si, conferidas sobre o registro COMPLETO. */
function conferirEmissao(final) {
  if (Number(final.buffer_tco2e || 0) > Number(final.quantidade_tco2e || 0)) {
    throw new ErroDemoCredito('buffer_maior_que_emitido', 'buffer_tco2e');
  }
  const inicio = final.serial_inicio ?? null;
  const fim = final.serial_fim ?? null;
  if ((inicio === null) !== (fim === null)) {
    throw new ErroDemoCredito('serial_incompleto', inicio === null ? 'serial_inicio' : 'serial_fim');
  }
}

export function demoCriarEmissao(dados = {}) {
  const b = bd();
  const projetoId = validarTexto(dados.projeto_id, 'projeto_id', 60);
  if (!projetoId) throw new ErroDemoCredito('campo_obrigatorio', 'projeto_id');
  if (!acharProjeto(projetoId)) throw new ErroDemoCredito('nao_encontrado', 'projeto_id');

  const campos = camposDaEmissao(dados, true);
  const nova = emissao({
    id: `demo-emissao-${b.proximoId++}`,
    projeto_id: projetoId,
    ...campos,
  });
  conferirEmissao(nova);

  b.emissoes.push(nova);
  return { emissao: emissaoDetalhe(nova) };
}

export function demoAtualizarEmissao(id, dados = {}) {
  const alvo = acharEmissao(id);
  const campos = camposDaEmissao(dados, false);
  if (Object.keys(campos).length === 0) throw new ErroDemoCredito('nada_para_atualizar');

  conferirEmissao({ ...alvo, ...campos });
  Object.assign(alvo, campos, { atualizado_em: new Date().toISOString() });
  return { emissao: emissaoDetalhe(alvo) };
}

export function demoRemoverEmissao(id) {
  const b = bd();
  const indice = b.emissoes.findIndex((e) => e.id === id);
  if (indice < 0) throw new ErroDemoCredito('nao_encontrado');

  const removida = emissaoDetalhe(b.emissoes[indice]);
  // As vendas do mesmo vintage NÃO vão junto: elas se encontram por (projeto, vintage) e
  // não por chave estrangeira. A linha do estoque passa a acusar sem_emissao, que é
  // justamente o que se quer ver.
  b.emissoes.splice(indice, 1);
  return { removida: true, emissao: removida };
}

/* ===== Vendas ============================================================= */

export function demoListarVendas({
  comprador_id = null,
  projeto_id = null,
  vintage = null,
  moeda = null,
  situacao = null,
  aposentado = null,
} = {}) {
  let lista = bd().vendas.map(vendaDetalhe);

  if (comprador_id) lista = lista.filter((v) => v.comprador_id === comprador_id);
  if (projeto_id) lista = lista.filter((v) => v.projeto_id === projeto_id);
  if (vintage) {
    const ano = validarVintage(vintage);
    lista = lista.filter((v) => v.vintage === ano);
  }
  if (moeda) {
    const sigla = String(moeda).toUpperCase();
    if (!MOEDAS.includes(sigla)) throw new ErroDemoCredito('moeda_invalida', 'moeda');
    lista = lista.filter((v) => v.moeda === sigla);
  }
  if (aposentado === 'true' || aposentado === true) lista = lista.filter((v) => v.aposentado);
  if (aposentado === 'false' || aposentado === false) lista = lista.filter((v) => !v.aposentado);
  if (situacao === 'ajuste_pendente') lista = lista.filter((v) => v.ajuste_pendente);
  if (situacao === 'internacional') lista = lista.filter((v) => v.venda_internacional);
  if (situacao === 'sem_preco') lista = lista.filter((v) => v.preco_unitario === null);

  lista.sort((a, b2) => String(b2.data ?? '').localeCompare(String(a.data ?? '')));

  const porMoeda = (sigla) => somar(lista.filter((v) => v.moeda === sigla), 'valor_total', 2);

  return {
    vendas: lista.map(mascararVenda),
    total: lista.length,
    pagina: 1,
    limite: 200,
    resumo: {
      total: lista.length,
      volume_tco2e: somar(lista, 'quantidade_tco2e', 4),
      aposentado_tco2e: somar(lista.filter((v) => v.aposentado), 'quantidade_tco2e', 4),
      receita: { BRL: porMoeda('BRL'), USD: porMoeda('USD'), EUR: porMoeda('EUR') },
      vendas_por_moeda: {
        BRL: lista.filter((v) => v.moeda === 'BRL').length,
        USD: lista.filter((v) => v.moeda === 'USD').length,
        EUR: lista.filter((v) => v.moeda === 'EUR').length,
      },
      sem_preco: lista.filter((v) => v.preco_unitario === null).length,
      aposentadas: lista.filter((v) => v.aposentado).length,
      internacionais: lista.filter((v) => v.venda_internacional).length,
      ajuste_pendente: lista.filter((v) => v.ajuste_pendente).length,
    },
  };
}

function camposDaVenda(dados, criando) {
  const saida = {};

  if (criando || 'comprador_id' in dados) {
    const compradorId = validarTexto(dados.comprador_id, 'comprador_id', 60);
    if (!compradorId) throw new ErroDemoCredito('campo_obrigatorio', 'comprador_id');
    acharComprador(compradorId);
    saida.comprador_id = compradorId;
  }
  if (criando || 'vintage' in dados) {
    const vintage = validarVintage(dados.vintage);
    if (vintage === null) throw new ErroDemoCredito('campo_obrigatorio', 'vintage');
    saida.vintage = vintage;
  }
  if (criando || 'quantidade_tco2e' in dados) {
    const quantidade = validarNumero(dados.quantidade_tco2e, 'quantidade_tco2e');
    // Maior que zero: venda de zero tonelada não existe, e devolução não se registra com
    // quantidade negativa (isso furaria a conciliação inteira).
    if (quantidade === null || quantidade <= 0) {
      throw new ErroDemoCredito('quantidade_invalida', 'quantidade_tco2e');
    }
    saida.quantidade_tco2e = arredondar(quantidade, 4);
  }
  if ('preco_unitario' in dados) {
    const preco = validarNumero(dados.preco_unitario, 'preco_unitario');
    saida.preco_unitario = preco === null ? null : arredondar(preco, 4);
  }
  if ('moeda' in dados) {
    const moeda = validarTexto(dados.moeda, 'moeda', 3);
    if (moeda !== null) {
      const sigla = moeda.toUpperCase();
      if (!MOEDAS.includes(sigla)) throw new ErroDemoCredito('moeda_invalida', 'moeda');
      saida.moeda = sigla;
    }
  }
  if ('data' in dados) saida.data = validarData(dados.data, 'data');
  if ('ajuste_correspondente' in dados) {
    saida.ajuste_correspondente = dados.ajuste_correspondente === true;
  }
  if ('observacoes' in dados) saida.observacoes = validarTexto(dados.observacoes, 'observacoes', 5000);
  if ('aposentado' in dados) saida.aposentado = dados.aposentado === true;
  if ('data_aposentadoria' in dados) {
    saida.data_aposentadoria = validarData(dados.data_aposentadoria, 'data_aposentadoria');
  }
  // Informar a data do extrato do registro é afirmar que o retirement aconteceu; e
  // desmarcar a aposentadoria limpa a data junto, senão o CHECK do banco recusaria a
  // linha inteira.
  if (saida.data_aposentadoria) saida.aposentado = true;
  if (saida.aposentado === false) saida.data_aposentadoria = null;

  return saida;
}

export function demoCriarVenda(dados = {}) {
  const b = bd();
  const projetoId = validarTexto(dados.projeto_id, 'projeto_id', 60);
  if (!projetoId) throw new ErroDemoCredito('campo_obrigatorio', 'projeto_id');
  if (!acharProjeto(projetoId)) throw new ErroDemoCredito('nao_encontrado', 'projeto_id');

  // Venda sem emissão NÃO é bloqueada: venda a termo de vintage futuro é prática normal
  // do mercado. O caso aparece como conciliação pendente na aba de estoque.
  const nova = venda({
    id: `demo-venda-${b.proximoId++}`,
    projeto_id: projetoId,
    ...camposDaVenda(dados, true),
  });

  b.vendas.push(nova);
  return { venda: mascararVenda(vendaDetalhe(nova)) };
}

export function demoAtualizarVenda(id, dados = {}) {
  const alvo = acharVenda(id);
  const campos = camposDaVenda(dados, false);
  if (Object.keys(campos).length === 0) throw new ErroDemoCredito('nada_para_atualizar');

  Object.assign(alvo, campos, { atualizado_em: new Date().toISOString() });
  return { venda: mascararVenda(vendaDetalhe(alvo)) };
}

export function demoRemoverVenda(id) {
  const b = bd();
  const indice = b.vendas.findIndex((v) => v.id === id);
  if (indice < 0) throw new ErroDemoCredito('nao_encontrado');

  const removida = mascararVenda(vendaDetalhe(b.vendas[indice]));
  b.vendas.splice(indice, 1);
  return { removida: true, venda: removida };
}

/* ===== Estoque ============================================================ */

export function demoListarEstoque({ projeto_id = null, vintage = null, alerta = null } = {}) {
  const ano = vintage ? validarVintage(vintage) : null;

  let base = linhasDeEstoque();
  if (projeto_id) base = base.filter((l) => l.projeto_id === projeto_id);
  if (ano !== null) base = base.filter((l) => l.vintage === ano);

  // A CONCILIAÇÃO sai da base ANTES do filtro por alerta, igual à Edge Function: se
  // seguisse o alerta, "disponível" significaria uma coisa ao olhar os sobrevendidos e
  // outra ao olhar o estoque parado.
  const conciliacao = conciliar(base);

  let lista = base;
  if (alerta === 'sobrevendido') lista = lista.filter((l) => l.sobrevendido);
  if (alerta === 'sem_emissao') lista = lista.filter((l) => l.sem_emissao);
  if (alerta === 'sem_venda') lista = lista.filter((l) => l.sem_venda);
  if (alerta === 'ajuste_pendente') lista = lista.filter((l) => l.vendas_ajuste_pendente > 0);

  return { estoque: lista, total: lista.length, pagina: 1, limite: 200, conciliacao };
}

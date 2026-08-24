/**
 * demo/fornecedores.js - dataset de demonstracao de fornecedores, contratos e
 * parcelas (issues #10 e #11).
 *
 * POR QUE EXISTE: o projeto Supabase do Apsis Carbon ainda NAO foi provisionado, e
 * as telas precisam ser revisaveis localmente antes disso. Em MODO_DEMO (ver
 * src/lib/runtimeConfig.js: exige dev E o clique no botao de demonstracao) as funcoes de
 * src/lib/api/fornecedores.js nao fazem rede: operam sobre o estado em memoria
 * deste arquivo, e as mutacoes ALTERAM esse estado, para a tela ser de fato
 * interativa. Recarregar a pagina volta ao estado inicial.
 *
 * FIDELIDADE E O PONTO. Tres regras de calculo estao no banco e precisam sair
 * IGUAIS aqui, senao a revisao mostra numero que a producao nunca produz:
 *
 *   1. STATUS DERIVADO (public.carbon_parcelas_status): paga / vencida / a_vencer
 *      / em_aberto, com a janela de 7 dias separando a_vencer de em_aberto.
 *   2. GERACAO DA SERIE (public.carbon_parcelas_gerar): a ULTIMA parcela absorve o
 *      resto de centavos, e cada vencimento sai do PRIMEIRO vencimento mais N
 *      meses (com o dia limitado ao ultimo do mes de destino), nunca do
 *      vencimento anterior.
 *   3. TOTALIZACAO (public.carbon_parcelas_totais): quebra por status, por centro
 *      de custo (o da PARCELA, nao o do contrato) e por mes de vencimento.
 *
 * Cada uma esta escrita UMA vez aqui (statusParcela, gerarSerie, calcularTotais) e
 * o resto do arquivo so chama. O proprio dataset inicial e produzido por
 * gerarSerie, e nao por parcelas digitadas: assim a serie que o dono ve na revisao
 * e exatamente a que a funcao SQL produziria.
 *
 * DATAS ANCORADAS EM HOJE, nunca fixas: as telas precisam mostrar parcela vencida,
 * a vencer, em aberto e paga em qualquer dia em que o dono abrir. Com datas fixas o
 * demo envelheceria e todas as parcelas ficariam vencidas.
 *
 * LGPD E CONFIDENCIALIDADE: nenhum dado real. Nomes de fornecedor obviamente
 * ficticios, CNPJ de zeros, valores redondos, e dados bancarios que se anunciam
 * como exemplo. docs/notion/02-fornecedores.md registra explicitamente que nome de
 * fornecedor e valor de contrato reais nao entram em codigo nem em commit.
 */

/* ===== Erro tipado ========================================================
   O demo precisa recusar entrada invalida com os MESMOS codigos do backend, senao
   a tela trataria erro de validacao de um jeito no demo e de outro em producao.
   Nao lancamos ErroApi aqui de proposito: quem converte e o chamarDemo de
   src/lib/api/base.js, e importar ErroApi no dataset criaria ciclo entre o modulo
   de dados e o de transporte. O contrato exigido e so a propriedade `codigo`.   */
export class ErroDemoFornecedores extends Error {
  constructor(codigo, campo) {
    super(`Recusado pelo modo demonstracao: ${codigo}${campo ? ` (${campo})` : ''}`);
    this.name = 'ErroDemoFornecedores';
    this.codigo = codigo;
    this.campo = campo ?? null;
  }
}

/* ===== Vocabulario (espelha os CHECK da migration) ======================== */

const STATUS_CONTRATACAO = ['nao_iniciada', 'em_andamento', 'concluida'];
const STATUS_CONTRATO = ['ativo', 'encerrado', 'cancelado'];

/** periodicidade -> meses de intervalo. Mesmo CASE de carbon_parcelas_gerar. */
const MESES_POR_PERIODICIDADE = {
  unica: 0,
  mensal: 1,
  bimestral: 2,
  trimestral: 3,
  quadrimestral: 4,
  semestral: 6,
  anual: 12,
};

const QUANTIDADE_MAXIMA_PARCELAS = 240;

/**
 * Janela que separa 'a_vencer' de 'em_aberto'.
 *
 * MESMO numero do `current_date + 7` da funcao public.carbon_parcelas_status.
 * Mudar num lugar sem mudar no outro faz a cor da linha no demo divergir da cor em
 * producao - o tipo de diferenca que ninguem percebe na revisao e que depois
 * aparece como "o sistema mudou de comportamento".
 */
export const JANELA_A_VENCER_DIAS = 7;

/* ===== Datas ==============================================================
   Tudo em 'AAAA-MM-DD', como as colunas date do Postgres chegam. Aritmetica na
   mao, em UTC: new Date('2026-01-01') e meia-noite UTC e, no fuso do Brasil,
   toLocaleDateString mostraria o dia ANTERIOR. Aqui isso erraria o vencimento.  */

function paraIso(data) {
  return data.toISOString().slice(0, 10);
}

function hoje() {
  return paraIso(new Date());
}

function somarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  return paraIso(new Date(Date.UTC(a, m - 1, d + dias)));
}

/**
 * Soma meses limitando o dia ao ultimo do mes de destino.
 *
 * MESMA regra do `data + make_interval(months => n)` do Postgres: 31/01 mais um
 * mes e 28/02. Chamada SEMPRE a partir do primeiro vencimento (nunca do anterior),
 * o que faz a serie voltar para o dia 31 nos meses que o tem: 31/01, 28/02, 31/03.
 *
 * new Date(2026, 0, 31 + mesEmDias) nao serve: o construtor do JS transborda o dia
 * (31/01 mais um mes viraria 03/03), que e justamente o bug que esta funcao evita.
 */
function somarMeses(iso, meses) {
  const [a, m, d] = iso.split('-').map(Number);
  const indice = m - 1 + meses;
  const ano = a + Math.floor(indice / 12);
  const mes = ((indice % 12) + 12) % 12;
  // Dia 0 do mes seguinte = ultimo dia do mes de destino.
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return paraIso(new Date(Date.UTC(ano, mes, Math.min(d, ultimoDia))));
}

/** Diferenca em dias entre duas datas ISO (b - a). */
function diferencaDias(a, b) {
  const [aa, am, ad] = a.split('-').map(Number);
  const [ba, bm, bd] = b.split('-').map(Number);
  const msDia = 86400000;
  return Math.round((Date.UTC(ba, bm - 1, bd) - Date.UTC(aa, am - 1, ad)) / msDia);
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function validarData(valor, campo) {
  if (valor === null || valor === undefined || valor === '') return null;
  const iso = String(valor);
  if (!DATA_ISO.test(iso)) throw new ErroDemoFornecedores('campo_invalido', campo);
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || paraIso(d) !== iso) {
    throw new ErroDemoFornecedores('campo_invalido', campo);
  }
  return iso;
}

/* ===== Dinheiro ===========================================================
   Contas em CENTAVOS inteiros. Somar float acumula erro (0,1 + 0,2 =
   0,30000000000000004) e o rodape passa a mostrar centavo que nao existe; o banco
   soma em numeric e nao tem esse problema, entao o demo tambem nao pode ter.
   Arredondar centavos com Math.round reproduz o round(numeric, 2) do Postgres
   (meio para cima) para os valores positivos que este dominio usa.             */

const paraCentavos = (valor) => Math.round((Number(valor) || 0) * 100);
const paraReais = (centavos) => centavos / 100;

function somarValores(itens, campo) {
  return paraReais(itens.reduce((total, item) => total + paraCentavos(item[campo]), 0));
}

function validarValor(valor, campo) {
  if (valor === null || valor === undefined || valor === '') return null;
  let bruto = valor;
  if (typeof bruto === 'string') {
    // Mesma regra de lerNumero na Edge Function: "13.250" e ambiguo e e RECUSADO
    // (Number daria 13,25), virgula decimal e aceita.
    if (/\.\d{3}(?!\d)/.test(bruto)) throw new ErroDemoFornecedores('campo_invalido', campo);
    if (!bruto.includes('.') && bruto.includes(',')) bruto = bruto.replace(',', '.');
  }
  const n = Number(bruto);
  if (!Number.isFinite(n) || n < 0 || n >= 1e10) {
    throw new ErroDemoFornecedores('campo_invalido', campo);
  }
  return paraReais(paraCentavos(n));
}

/* ===== Status derivado ====================================================
   REGRA 1. Espelho de public.carbon_parcelas_status. Nao existe status manual em
   lugar nenhum deste dominio: e o requisito central da issue #11.              */

function statusParcela(vencimento, dataPagamento) {
  if (dataPagamento) return 'paga';
  if (!vencimento) return 'em_aberto';
  const referencia = hoje();
  if (vencimento < referencia) return 'vencida';
  if (diferencaDias(referencia, vencimento) <= JANELA_A_VENCER_DIAS) return 'a_vencer';
  return 'em_aberto';
}

/* ===== Utilitarios gerais ================================================= */

const esperar = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

function novoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `demo-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function texto(valor, campo, limite = 500) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== 'string') throw new ErroDemoFornecedores('campo_invalido', campo);
  const limpo = valor.trim();
  if (limpo === '') return null;
  if (limpo.length > limite) throw new ErroDemoFornecedores('campo_invalido', campo);
  return limpo;
}

function veio(dados, campo) {
  return dados && typeof dados === 'object' && Object.prototype.hasOwnProperty.call(dados, campo);
}

/* ===== Papel do usuario do demo ===========================================
   O portao de LEITURA de dados bancarios e o papel admin (ver
   podeVerDadosBancarios em supabase/functions/carbon-api/rotas/fornecedores.ts).

   O demo entra como ADMIN para o dono revisar o painel com o campo visivel, que e
   onde esta a interface a ser avaliada (o aviso de restricao, a copy, o botao de
   revelar). Para revisar o OUTRO lado - a tela que um gestor ve, sem o conteudo -
   troque esta constante para 'gestor': e uma linha, e nenhuma outra parte do
   dominio precisa mudar, porque quem decide e sempre o backend e a tela so obedece
   ao campo dados_bancarios_visivel que ele devolve.                            */
const PAPEL_DEMO = 'admin';

const podeVerDadosBancarios = () => PAPEL_DEMO === 'admin';

/* Mesmo id de src/lib/demoProjetos.js, para o vinculo com projeto casar com o que
   a tela de Projetos lista. */
const PROJETO_DEMO_ID = '00000000-0000-4000-8000-000000000001';
const PROJETO_DEMO_NOME = 'Projeto Demonstração - Vale do Exemplo';
const USUARIO_DEMO_ID = '00000000-0000-4000-8000-0000000000a1';

/* ===== Geracao da serie ===================================================
   REGRA 2. Espelho de public.carbon_parcelas_gerar, inclusive nos codigos de erro.
   Devolve as linhas a inserir, sem tocar no estado: assim a mesma funcao serve
   para montar o dataset inicial e para atender a rota de geracao.              */

function calcularSerie({
  quantidade,
  periodicidade,
  primeiroVencimento,
  valorParcela = null,
  valorTotal = null,
  valorContrato = null,
}) {
  const chave = String(periodicidade ?? '').trim().toLowerCase();
  const meses = MESES_POR_PERIODICIDADE[chave];
  if (meses === undefined) {
    throw new ErroDemoFornecedores('periodicidade_invalida', 'periodicidade');
  }

  if (
    !Number.isInteger(quantidade) ||
    quantidade < 1 ||
    quantidade > QUANTIDADE_MAXIMA_PARCELAS
  ) {
    throw new ErroDemoFornecedores('campo_invalido', 'quantidade');
  }
  if (meses === 0 && quantidade !== 1) {
    throw new ErroDemoFornecedores('campo_invalido', 'quantidade');
  }
  if (!primeiroVencimento) {
    throw new ErroDemoFornecedores('campo_obrigatorio', 'primeiro_vencimento');
  }
  if (valorParcela !== null && valorTotal !== null) {
    throw new ErroDemoFornecedores('valor_ambiguo', 'valor_parcela');
  }

  let baseCentavos;
  let ultimaCentavos;
  let totalCentavos;

  if (valorParcela !== null) {
    // Valor da parcela informado: todas iguais, sem resto para distribuir.
    baseCentavos = paraCentavos(valorParcela);
    ultimaCentavos = baseCentavos;
    totalCentavos = baseCentavos * quantidade;
  } else {
    const total = valorTotal !== null ? valorTotal : valorContrato;
    if (total === null || total === undefined) {
      throw new ErroDemoFornecedores('valor_obrigatorio', 'valor_total');
    }
    totalCentavos = paraCentavos(total);
    baseCentavos = Math.round(totalCentavos / quantidade);
    // A ULTIMA parcela absorve o resto: sem isso a soma nao fecha com o contrato
    // (1000,00 em 3 vezes daria 999,99).
    ultimaCentavos = totalCentavos - baseCentavos * (quantidade - 1);
    if (ultimaCentavos < 0) throw new ErroDemoFornecedores('campo_invalido', 'valor_total');
  }

  const itens = [];
  for (let i = 1; i <= quantidade; i += 1) {
    itens.push({
      numero: i,
      // Sempre a partir do PRIMEIRO vencimento. Ver somarMeses.
      vencimento: somarMeses(primeiroVencimento, meses * (i - 1)),
      valor: paraReais(i < quantidade ? baseCentavos : ultimaCentavos),
    });
  }

  return {
    itens,
    periodicidade: chave,
    intervalo_meses: meses,
    valor_total: paraReais(totalCentavos),
    valor_parcela: paraReais(baseCentavos),
    valor_ultima_parcela: paraReais(ultimaCentavos),
    primeiro_vencimento: primeiroVencimento,
    ultimo_vencimento: itens[itens.length - 1].vencimento,
  };
}

/* ===== Estado em memoria ==================================================
   Montado na PRIMEIRA CHAMADA, e nao no topo do modulo. Com MODO_DEMO dobrado para
   false, o Rollup elimina as funcoes demo* deste arquivo, mas NAO uma construcao
   executada no topo (ele nao consegue provar que e livre de efeito colateral), e o
   dataset inteiro iria para o bundle de producao. Adiando para a primeira chamada,
   o modulo passa a nao ter efeito nenhum no topo e sai inteiro do build.        */

let estado = null;

function fornecedor(dados) {
  return {
    id: dados.id,
    nome: dados.nome,
    cnpj: dados.cnpj ?? null,
    status_contratacao: dados.status_contratacao,
    contratante: dados.contratante ?? null,
    observacoes: dados.observacoes ?? null,
    dados_bancarios: dados.dados_bancarios ?? null,
    ativo: dados.ativo ?? true,
    criado_por: USUARIO_DEMO_ID,
    criado_em: dados.criado_em,
    atualizado_em: dados.criado_em,
  };
}

function contrato(dados) {
  return {
    id: dados.id,
    fornecedor_id: dados.fornecedor_id,
    projeto_id: dados.projeto_id ?? null,
    objeto: dados.objeto,
    data_contratacao: dados.data_contratacao ?? null,
    valor_total: dados.valor_total ?? null,
    centro_custo: dados.centro_custo ?? null,
    tipo_servico: dados.tipo_servico ?? null,
    status: dados.status ?? 'ativo',
    observacoes: dados.observacoes ?? null,
    criado_por: USUARIO_DEMO_ID,
    criado_em: dados.criado_em,
    atualizado_em: dados.criado_em,
  };
}

/**
 * Dataset inicial.
 *
 * Cobre de proposito os quatro estados de parcela em qualquer dia do ano, o
 * fornecedor sem dados bancarios (para a tela ter o que cobrar), o contrato de
 * backoffice sem projeto, o contrato encerrado com parcela ainda em aberto e a
 * divergencia legitima entre valor contratado e valor parcelado.
 */
function montarEstado() {
  const referencia = hoje();
  const criadoEm = `${somarDias(referencia, -120)}T12:00:00.000Z`;

  const fornecedores = [
    fornecedor({
      id: 'f0000000-0000-4000-8000-000000000001',
      nome: 'Fornecedor Exemplo A - Inventário Florestal',
      cnpj: '00000000000001',
      status_contratacao: 'concluida',
      contratante: 'Contratante Exemplo Ltda.',
      observacoes: 'Cadastro de demonstração. Contratação assinada e serviço em execução.',
      // Obviamente ficticio, e o proprio texto avisa. Ver a nota de LGPD do topo.
      dados_bancarios:
        'Dados fictícios de demonstração: Banco Exemplo (000), agência 0001, conta corrente 00000-0.',
      criado_em: criadoEm,
    }),
    fornecedor({
      id: 'f0000000-0000-4000-8000-000000000002',
      nome: 'Fornecedor Exemplo B - Geoprocessamento',
      cnpj: '00000000000002',
      status_contratacao: 'em_andamento',
      contratante: 'Contratante Exemplo Ltda.',
      observacoes: 'Cadastro de demonstração. Minuta em revisão.',
      dados_bancarios: null,
      criado_em: criadoEm,
    }),
    fornecedor({
      id: 'f0000000-0000-4000-8000-000000000003',
      nome: 'Fornecedor Exemplo C - Assessoria Regulatória',
      cnpj: '00000000000003',
      status_contratacao: 'concluida',
      contratante: 'Contratante Exemplo Ltda.',
      observacoes: null,
      dados_bancarios:
        'Dados fictícios de demonstração: Banco Exemplo (000), agência 0002, conta corrente 00000-1.',
      criado_em: criadoEm,
    }),
    fornecedor({
      id: 'f0000000-0000-4000-8000-000000000004',
      nome: 'Fornecedor Exemplo D - Logística de Campo',
      cnpj: null,
      status_contratacao: 'nao_iniciada',
      contratante: null,
      observacoes: 'Cadastro de demonstração sem CNPJ, para exercitar o estado incompleto.',
      dados_bancarios: null,
      ativo: false,
      criado_em: criadoEm,
    }),
  ];

  // Primeiro vencimento no dia 10 de quatro meses atras: garante parcela paga,
  // parcela vencida e parcelas futuras em qualquer dia em que o demo abra.
  const inicioA = somarMeses(`${referencia.slice(0, 7)}-10`, -4);
  const contratos = [
    contrato({
      id: 'c0000000-0000-4000-8000-000000000001',
      fornecedor_id: fornecedores[0].id,
      projeto_id: PROJETO_DEMO_ID,
      objeto: 'Inventário florestal e medição de parcelas permanentes (exemplo)',
      data_contratacao: somarDias(inicioA, -20),
      valor_total: 96000,
      centro_custo: 'Projeto - Campo',
      tipo_servico: 'Serviço técnico',
      status: 'ativo',
      criado_em: criadoEm,
    }),
    contrato({
      id: 'c0000000-0000-4000-8000-000000000002',
      fornecedor_id: fornecedores[1].id,
      projeto_id: PROJETO_DEMO_ID,
      objeto: 'Processamento de imagens e mapa de uso e cobertura do solo (exemplo)',
      data_contratacao: somarDias(referencia, -25),
      valor_total: 30000,
      centro_custo: 'Projeto - Geo',
      tipo_servico: 'Serviço técnico',
      status: 'ativo',
      criado_em: criadoEm,
    }),
    contrato({
      id: 'c0000000-0000-4000-8000-000000000003',
      fornecedor_id: fornecedores[2].id,
      // Contratacao de BACKOFFICE: nao pertence a projeto nenhum, e e por isso que
      // projeto_id e anulavel no banco.
      projeto_id: null,
      objeto: 'Assessoria regulatória e acompanhamento de registro (exemplo)',
      data_contratacao: somarDias(referencia, -200),
      valor_total: 48000,
      centro_custo: 'Backoffice',
      tipo_servico: 'Assessoria',
      status: 'encerrado',
      observacoes:
        'Contrato encerrado com parcela ainda em aberto: o serviço terminou e o pagamento não saiu.',
      criado_em: criadoEm,
    }),
    contrato({
      id: 'c0000000-0000-4000-8000-000000000004',
      fornecedor_id: fornecedores[0].id,
      projeto_id: PROJETO_DEMO_ID,
      objeto: 'Aditivo de mobilização extra de equipe de campo (exemplo)',
      data_contratacao: somarDias(referencia, -10),
      // Sem serie gerada de proposito: a tela precisa ter um contrato no estado
      // "valor contratado sem parcela nenhuma", que e a divergencia mais comum.
      valor_total: 12000,
      centro_custo: 'Projeto - Campo',
      tipo_servico: 'Serviço técnico',
      status: 'ativo',
      criado_em: criadoEm,
    }),
  ];

  const parcelas = [];

  /** Cria a serie de um contrato pela MESMA funcao que a rota de geracao usa. */
  const semear = (contratoAlvo, entrada, aoCriar) => {
    const serie = calcularSerie({ ...entrada, valorContrato: contratoAlvo.valor_total });
    serie.itens.forEach((item) => {
      const linha = {
        id: novoId(),
        contrato_id: contratoAlvo.id,
        numero: item.numero,
        descricao: entrada.descricao ?? null,
        valor: item.valor,
        vencimento: item.vencimento,
        data_pagamento: null,
        tipo_servico: entrada.tipo_servico ?? contratoAlvo.tipo_servico,
        centro_custo: entrada.centro_custo ?? contratoAlvo.centro_custo,
        observacoes: null,
        criado_por: USUARIO_DEMO_ID,
        criado_em: criadoEm,
        atualizado_em: criadoEm,
      };
      if (aoCriar) aoCriar(linha);
      parcelas.push(linha);
    });
  };

  // Contrato 1: 12 mensais. As vencidas mais antigas ficam pagas e a ultima
  // vencida fica ABERTA, que e o caso que a tela precisa destacar.
  semear(contratos[0], { quantidade: 12, periodicidade: 'mensal', primeiroVencimento: inicioA }, (linha) => {
    if (linha.vencimento < referencia && linha.numero <= 3) {
      // Paga com dois dias de atraso: exercita a coluna de atraso da tela de pagas.
      linha.data_pagamento = somarDias(linha.vencimento, 2);
    }
  });

  // Contrato 2: entrada mais 2 parcelas, com a primeira vencendo dentro da janela
  // de 7 dias. E o unico jeito de garantir uma parcela 'a_vencer' todo dia.
  semear(contratos[1], {
    quantidade: 3,
    periodicidade: 'mensal',
    primeiroVencimento: somarDias(referencia, 3),
    descricao: 'Etapa de processamento (exemplo)',
  });

  // Contrato 3: 4 trimestrais de um contrato antigo, tres pagas e uma vencida.
  semear(contratos[2], {
    quantidade: 4,
    periodicidade: 'trimestral',
    primeiroVencimento: somarMeses(somarDias(referencia, -190), 0),
  }, (linha) => {
    if (linha.numero <= 3) linha.data_pagamento = linha.vencimento;
  });

  return { fornecedores, contratos, parcelas };
}

function garantirEstado() {
  if (estado === null) estado = montarEstado();
  return estado;
}

/* ===== Serializacao (mesma forma que a Edge Function devolve) ============== */

function parcelasDoContrato(contratoId) {
  return garantirEstado().parcelas.filter((p) => p.contrato_id === contratoId);
}

/** Espelha a view carbon_parcelas_detalhe. */
function detalheParcela(parcela) {
  const dados = garantirEstado();
  const contratoAlvo = dados.contratos.find((c) => c.id === parcela.contrato_id) ?? null;
  const fornecedorAlvo = contratoAlvo
    ? dados.fornecedores.find((f) => f.id === contratoAlvo.fornecedor_id) ?? null
    : null;
  const referencia = hoje();

  return {
    id: parcela.id,
    contrato_id: parcela.contrato_id,
    numero: parcela.numero,
    descricao: parcela.descricao,
    valor: parcela.valor,
    vencimento: parcela.vencimento,
    data_pagamento: parcela.data_pagamento,
    tipo_servico: parcela.tipo_servico,
    centro_custo: parcela.centro_custo,
    observacoes: parcela.observacoes,
    criado_em: parcela.criado_em,
    atualizado_em: parcela.atualizado_em,
    status_pagamento: statusParcela(parcela.vencimento, parcela.data_pagamento),
    // Negativo = ja venceu, igual a view.
    dias_para_vencimento: diferencaDias(referencia, parcela.vencimento),
    atraso_dias: parcela.data_pagamento
      ? Math.max(0, diferencaDias(parcela.vencimento, parcela.data_pagamento))
      : Math.max(0, diferencaDias(parcela.vencimento, referencia)),
    fornecedor_id: contratoAlvo?.fornecedor_id ?? null,
    projeto_id: contratoAlvo?.projeto_id ?? null,
    contrato_objeto: contratoAlvo?.objeto ?? null,
    contrato_status: contratoAlvo?.status ?? null,
    contrato_data_contratacao: contratoAlvo?.data_contratacao ?? null,
    fornecedor_nome: fornecedorAlvo?.nome ?? null,
    projeto_nome: contratoAlvo?.projeto_id ? PROJETO_DEMO_NOME : null,
  };
}

/** Agregados de parcela de um conjunto, na forma que as views devolvem. */
function agregarParcelas(itens) {
  const detalhes = itens.map((p) => detalheParcela(p));
  const pagas = detalhes.filter((p) => p.status_pagamento === 'paga');
  const abertas = detalhes.filter((p) => p.status_pagamento !== 'paga');
  const vencidas = detalhes.filter((p) => p.status_pagamento === 'vencida');
  const referencia = hoje();
  const futuras = abertas
    .filter((p) => p.vencimento >= referencia)
    .map((p) => p.vencimento)
    .sort();
  const todos = detalhes.map((p) => p.vencimento).sort();

  return {
    parcelas: detalhes.length,
    parcelas_pagas: pagas.length,
    parcelas_vencidas: vencidas.length,
    valor_parcelado: somarValores(detalhes, 'valor'),
    valor_pago: somarValores(pagas, 'valor'),
    valor_aberto: somarValores(abertas, 'valor'),
    valor_vencido: somarValores(vencidas, 'valor'),
    primeiro_vencimento: todos[0] ?? null,
    ultimo_vencimento: todos[todos.length - 1] ?? null,
    proximo_vencimento: futuras[0] ?? null,
  };
}

/** Espelha a view carbon_fornecedores_listagem: SEM a coluna dados_bancarios. */
function listagemFornecedor(alvo) {
  const dados = garantirEstado();
  const contratosDoFornecedor = dados.contratos.filter((c) => c.fornecedor_id === alvo.id);
  const ids = new Set(contratosDoFornecedor.map((c) => c.id));
  const agregado = agregarParcelas(dados.parcelas.filter((p) => ids.has(p.contrato_id)));

  return {
    id: alvo.id,
    nome: alvo.nome,
    cnpj: alvo.cnpj,
    status_contratacao: alvo.status_contratacao,
    contratante: alvo.contratante,
    observacoes: alvo.observacoes,
    ativo: alvo.ativo,
    criado_em: alvo.criado_em,
    atualizado_em: alvo.atualizado_em,
    // Booleano, nunca o conteudo. E o requisito de privacidade da issue #10.
    tem_dados_bancarios: alvo.dados_bancarios !== null,
    contratos: contratosDoFornecedor.length,
    contratos_ativos: contratosDoFornecedor.filter((c) => c.status === 'ativo').length,
    valor_contratado: somarValores(contratosDoFornecedor, 'valor_total'),
    parcelas: agregado.parcelas,
    valor_parcelado: agregado.valor_parcelado,
    valor_pago: agregado.valor_pago,
    valor_aberto: agregado.valor_aberto,
    valor_vencido: agregado.valor_vencido,
    parcelas_vencidas: agregado.parcelas_vencidas,
    proximo_vencimento: agregado.proximo_vencimento,
  };
}

/**
 * Fornecedor do DETALHE.
 *
 * dados_bancarios so entra quando o papel permite; tem_dados_bancarios entra
 * sempre. Mesma decisao do backend, e por isso a tela nao precisa saber o papel de
 * ninguem: ela obedece a dados_bancarios_visivel.
 */
function detalheFornecedor(alvo) {
  const visivel = podeVerDadosBancarios();
  return {
    id: alvo.id,
    nome: alvo.nome,
    cnpj: alvo.cnpj,
    status_contratacao: alvo.status_contratacao,
    contratante: alvo.contratante,
    observacoes: alvo.observacoes,
    ativo: alvo.ativo,
    criado_por: alvo.criado_por,
    criado_em: alvo.criado_em,
    atualizado_em: alvo.atualizado_em,
    tem_dados_bancarios: alvo.dados_bancarios !== null,
    dados_bancarios_visivel: visivel,
    ...(visivel ? { dados_bancarios: alvo.dados_bancarios } : {}),
  };
}

/** Espelha a view carbon_contratos_detalhe. */
function detalheContrato(alvo) {
  const dados = garantirEstado();
  const fornecedorAlvo = dados.fornecedores.find((f) => f.id === alvo.fornecedor_id) ?? null;
  const agregado = agregarParcelas(parcelasDoContrato(alvo.id));

  return {
    id: alvo.id,
    fornecedor_id: alvo.fornecedor_id,
    projeto_id: alvo.projeto_id,
    objeto: alvo.objeto,
    data_contratacao: alvo.data_contratacao,
    valor_total: alvo.valor_total,
    centro_custo: alvo.centro_custo,
    tipo_servico: alvo.tipo_servico,
    status: alvo.status,
    observacoes: alvo.observacoes,
    criado_por: alvo.criado_por,
    criado_em: alvo.criado_em,
    atualizado_em: alvo.atualizado_em,
    fornecedor_nome: fornecedorAlvo?.nome ?? null,
    fornecedor_cnpj: fornecedorAlvo?.cnpj ?? null,
    fornecedor_status_contratacao: fornecedorAlvo?.status_contratacao ?? null,
    fornecedor_ativo: fornecedorAlvo?.ativo ?? null,
    projeto_nome: alvo.projeto_id ? PROJETO_DEMO_NOME : null,
    ...agregado,
  };
}

/* ===== Totalizacao ========================================================
   REGRA 3. Espelho de public.carbon_parcelas_totais, incluindo as decisoes que
   parecem detalhe e nao sao: o centro de custo e o da PARCELA (nao o do contrato),
   o filtro de centro vazio significa "sem centro de custo", e os totais NAO
   seguem a aba escolhida na tela - somam o periodo inteiro e devolvem a quebra por
   status.                                                                      */

const ORDEM_STATUS_TOTAIS = ['vencida', 'a_vencer', 'em_aberto', 'paga'];

function filtrarParcelas(filtros = {}) {
  const dados = garantirEstado();
  const inicio = filtros.inicio ?? null;
  const fim = filtros.fim ?? null;

  return dados.parcelas
    .map((p) => detalheParcela(p))
    .filter((p) => {
      if (inicio && p.vencimento < inicio) return false;
      if (fim && p.vencimento > fim) return false;
      if (filtros.fornecedor_id && p.fornecedor_id !== filtros.fornecedor_id) return false;
      if (filtros.projeto_id && p.projeto_id !== filtros.projeto_id) return false;
      if (filtros.contrato_id && p.contrato_id !== filtros.contrato_id) return false;
      if (filtros.centro_custo !== null && filtros.centro_custo !== undefined) {
        if ((p.centro_custo ?? '') !== filtros.centro_custo) return false;
      }
      return true;
    });
}

function calcularTotais(filtros = {}) {
  const itens = filtrarParcelas(filtros);
  const referencia = hoje();
  const porStatus = new Map();
  const porCentro = new Map();
  const porMes = new Map();

  const acumular = (mapa, chave, item) => {
    const atual = mapa.get(chave) ?? {
      quantidade: 0,
      centavos: 0,
      centavosPagos: 0,
      centavosAbertos: 0,
      centavosVencidos: 0,
    };
    const centavos = paraCentavos(item.valor);
    atual.quantidade += 1;
    atual.centavos += centavos;
    if (item.status_pagamento === 'paga') atual.centavosPagos += centavos;
    else atual.centavosAbertos += centavos;
    if (item.status_pagamento === 'vencida') atual.centavosVencidos += centavos;
    mapa.set(chave, atual);
  };

  itens.forEach((item) => {
    acumular(porStatus, item.status_pagamento, item);
    acumular(porCentro, item.centro_custo ?? null, item);
    acumular(porMes, item.vencimento.slice(0, 7), item);
  });

  const pagas = itens.filter((p) => p.status_pagamento === 'paga');
  const abertas = itens.filter((p) => p.status_pagamento !== 'paga');
  const vencidas = itens.filter((p) => p.status_pagamento === 'vencida');
  const aVencer = itens.filter((p) => p.status_pagamento === 'a_vencer');
  const futuras = abertas
    .filter((p) => p.vencimento >= referencia)
    .map((p) => p.vencimento)
    .sort();

  return {
    periodo: { inicio: filtros.inicio ?? null, fim: filtros.fim ?? null },
    quantidade: itens.length,
    valor: somarValores(itens, 'valor'),
    valor_pago: somarValores(pagas, 'valor'),
    valor_aberto: somarValores(abertas, 'valor'),
    valor_vencido: somarValores(vencidas, 'valor'),
    valor_a_vencer: somarValores(aVencer, 'valor'),
    quantidade_paga: pagas.length,
    quantidade_vencida: vencidas.length,
    proximo_vencimento: futuras[0] ?? null,
    por_status: [...porStatus.entries()]
      .map(([status_pagamento, v]) => ({
        status_pagamento,
        quantidade: v.quantidade,
        valor: paraReais(v.centavos),
      }))
      .sort(
        (a, b) =>
          ORDEM_STATUS_TOTAIS.indexOf(a.status_pagamento) -
          ORDEM_STATUS_TOTAIS.indexOf(b.status_pagamento),
      ),
    por_centro_custo: [...porCentro.entries()]
      .map(([centro_custo, v]) => ({
        centro_custo,
        quantidade: v.quantidade,
        valor: paraReais(v.centavos),
        valor_pago: paraReais(v.centavosPagos),
        valor_aberto: paraReais(v.centavosAbertos),
        valor_vencido: paraReais(v.centavosVencidos),
      }))
      // Mesma ordem do SQL: maior valor primeiro, sem centro no fim.
      .sort((a, b) => {
        if (b.valor !== a.valor) return b.valor - a.valor;
        if (a.centro_custo === null) return 1;
        if (b.centro_custo === null) return -1;
        return String(a.centro_custo).localeCompare(String(b.centro_custo), 'pt-BR');
      }),
    por_mes: [...porMes.entries()]
      .map(([mes, v]) => ({
        mes,
        quantidade: v.quantidade,
        valor: paraReais(v.centavos),
        valor_pago: paraReais(v.centavosPagos),
        valor_aberto: paraReais(v.centavosAbertos),
        valor_vencido: paraReais(v.centavosVencidos),
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes)),
  };
}

/* ===== Lista branca de campos =============================================
   Mesma disciplina do backend: campo desconhecido no corpo e IGNORADO, nunca
   gravado. Note que NAO existe campo de status de pagamento em parcela: baixar e
   informar data_pagamento.                                                     */

function camposFornecedor(dados, criando) {
  const entrada = dados && typeof dados === 'object' ? dados : {};
  const saida = {};

  if (criando || veio(entrada, 'nome')) {
    const nome = texto(entrada.nome, 'nome', 200);
    if (!nome) throw new ErroDemoFornecedores('campo_obrigatorio', 'nome');
    saida.nome = nome;
  }
  if (veio(entrada, 'cnpj')) {
    const bruto = texto(entrada.cnpj, 'cnpj', 40);
    if (bruto === null) saida.cnpj = null;
    else {
      const digitos = bruto.replace(/\D/g, '');
      if (digitos === '') saida.cnpj = null;
      else if (digitos.length !== 14) throw new ErroDemoFornecedores('cnpj_invalido', 'cnpj');
      else saida.cnpj = digitos;
    }
  }
  if (veio(entrada, 'contratante')) saida.contratante = texto(entrada.contratante, 'contratante', 200);
  if (veio(entrada, 'observacoes')) saida.observacoes = texto(entrada.observacoes, 'observacoes', 5000);
  if (veio(entrada, 'status_contratacao')) {
    const status = texto(entrada.status_contratacao, 'status_contratacao', 40);
    if (status !== null) {
      if (!STATUS_CONTRATACAO.includes(status)) {
        throw new ErroDemoFornecedores('status_invalido', 'status_contratacao');
      }
      saida.status_contratacao = status;
    }
  }
  if (veio(entrada, 'ativo')) saida.ativo = entrada.ativo === null ? true : Boolean(entrada.ativo);
  if (veio(entrada, 'dados_bancarios')) {
    saida.dados_bancarios = texto(entrada.dados_bancarios, 'dados_bancarios', 5000);
  }

  return saida;
}

function camposContrato(dados, criando) {
  const entrada = dados && typeof dados === 'object' ? dados : {};
  const saida = {};

  if (criando || veio(entrada, 'fornecedor_id')) {
    const id = texto(entrada.fornecedor_id, 'fornecedor_id', 80);
    if (!id) throw new ErroDemoFornecedores('campo_obrigatorio', 'fornecedor_id');
    if (!garantirEstado().fornecedores.some((f) => f.id === id)) {
      throw new ErroDemoFornecedores('referencia_invalida', 'fornecedor_id');
    }
    saida.fornecedor_id = id;
  }
  if (criando || veio(entrada, 'objeto')) {
    const objeto = texto(entrada.objeto, 'objeto', 500);
    if (!objeto) throw new ErroDemoFornecedores('campo_obrigatorio', 'objeto');
    saida.objeto = objeto;
  }
  if (veio(entrada, 'projeto_id')) saida.projeto_id = texto(entrada.projeto_id, 'projeto_id', 80);
  if (veio(entrada, 'data_contratacao')) {
    saida.data_contratacao = validarData(entrada.data_contratacao, 'data_contratacao');
  }
  if (veio(entrada, 'valor_total')) saida.valor_total = validarValor(entrada.valor_total, 'valor_total');
  if (veio(entrada, 'centro_custo')) saida.centro_custo = texto(entrada.centro_custo, 'centro_custo', 120);
  if (veio(entrada, 'tipo_servico')) saida.tipo_servico = texto(entrada.tipo_servico, 'tipo_servico', 120);
  if (veio(entrada, 'observacoes')) saida.observacoes = texto(entrada.observacoes, 'observacoes', 5000);
  if (veio(entrada, 'status')) {
    const status = texto(entrada.status, 'status', 40);
    if (status !== null) {
      if (!STATUS_CONTRATO.includes(status)) throw new ErroDemoFornecedores('status_invalido', 'status');
      saida.status = status;
    }
  }

  return saida;
}

/* ===== Funcoes que imitam o backend ======================================= */

function acharFornecedor(id) {
  const alvo = garantirEstado().fornecedores.find((f) => f.id === id);
  if (!alvo) throw new ErroDemoFornecedores('nao_encontrado');
  return alvo;
}

function acharContrato(id) {
  const alvo = garantirEstado().contratos.find((c) => c.id === id);
  if (!alvo) throw new ErroDemoFornecedores('nao_encontrado');
  return alvo;
}

function acharParcela(id) {
  const alvo = garantirEstado().parcelas.find((p) => p.id === id);
  if (!alvo) throw new ErroDemoFornecedores('nao_encontrado');
  return alvo;
}

function agora() {
  return new Date().toISOString();
}

/** GET /fornecedores */
export async function demoListarFornecedores(filtros = {}) {
  await esperar();
  const dados = garantirEstado();
  const busca = String(filtros.busca ?? '').trim().toLowerCase();
  const digitos = busca.replace(/\D/g, '');

  const lista = dados.fornecedores
    .map((f) => listagemFornecedor(f))
    .filter((f) => {
      if (filtros.status && f.status_contratacao !== filtros.status) return false;
      if (filtros.ativo === true && f.ativo !== true) return false;
      if (filtros.ativo === false && f.ativo !== false) return false;
      if (!busca) return true;
      // Mesma heuristica da Edge Function: termo com cara de documento busca no
      // CNPJ (guardado sem mascara), o resto busca no nome.
      if (digitos.length >= 3 && /^[\d./\s-]+$/.test(busca)) {
        return String(f.cnpj ?? '').includes(digitos);
      }
      return f.nome.toLowerCase().includes(busca);
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return {
    fornecedores: lista,
    total: lista.length,
    pagina: 1,
    limite: lista.length,
    resumo: {
      total: lista.length,
      ativos: lista.filter((f) => f.ativo !== false).length,
      por_status: {
        nao_iniciada: lista.filter((f) => f.status_contratacao === 'nao_iniciada').length,
        em_andamento: lista.filter((f) => f.status_contratacao === 'em_andamento').length,
        concluida: lista.filter((f) => f.status_contratacao === 'concluida').length,
      },
      com_dados_bancarios: lista.filter((f) => f.tem_dados_bancarios).length,
      valor_contratado: somarValores(lista, 'valor_contratado'),
      valor_aberto: somarValores(lista, 'valor_aberto'),
      valor_vencido: somarValores(lista, 'valor_vencido'),
      fornecedores_com_vencido: lista.filter((f) => f.parcelas_vencidas > 0).length,
    },
  };
}

/** POST /fornecedores */
export async function demoCriarFornecedor(dados) {
  await esperar();
  const campos = camposFornecedor(dados, true);

  if (campos.cnpj && garantirEstado().fornecedores.some((f) => f.cnpj === campos.cnpj)) {
    // Espelha o indice unico parcial em cnpj.
    throw new ErroDemoFornecedores('registro_duplicado', 'cnpj');
  }

  const novo = fornecedor({
    id: novoId(),
    nome: campos.nome,
    cnpj: campos.cnpj ?? null,
    status_contratacao: campos.status_contratacao ?? 'nao_iniciada',
    contratante: campos.contratante ?? null,
    observacoes: campos.observacoes ?? null,
    dados_bancarios: campos.dados_bancarios ?? null,
    ativo: campos.ativo ?? true,
    criado_em: agora(),
  });
  garantirEstado().fornecedores.push(novo);

  return { fornecedor: detalheFornecedor(novo) };
}

/** GET /fornecedores/:id */
export async function demoObterFornecedor(id) {
  await esperar();
  const alvo = acharFornecedor(id);
  const contratos = garantirEstado()
    .contratos.filter((c) => c.fornecedor_id === id)
    .map((c) => detalheContrato(c))
    .sort((a, b) => String(b.data_contratacao ?? '').localeCompare(String(a.data_contratacao ?? '')));

  return { fornecedor: detalheFornecedor(alvo), contratos };
}

/** PATCH /fornecedores/:id */
export async function demoAtualizarFornecedor(id, dados) {
  await esperar();
  const alvo = acharFornecedor(id);
  const campos = camposFornecedor(dados, false);
  if (Object.keys(campos).length === 0) throw new ErroDemoFornecedores('nada_para_atualizar');

  if (
    campos.cnpj &&
    garantirEstado().fornecedores.some((f) => f.id !== id && f.cnpj === campos.cnpj)
  ) {
    throw new ErroDemoFornecedores('registro_duplicado', 'cnpj');
  }

  Object.assign(alvo, campos, { atualizado_em: agora() });
  return { fornecedor: detalheFornecedor(alvo) };
}

/** GET /contratos */
export async function demoListarContratos(filtros = {}) {
  await esperar();
  const busca = String(filtros.busca ?? '').trim().toLowerCase();

  const lista = garantirEstado()
    .contratos.map((c) => detalheContrato(c))
    .filter((c) => {
      if (filtros.fornecedor_id && c.fornecedor_id !== filtros.fornecedor_id) return false;
      if (filtros.projeto_id === 'backoffice' && c.projeto_id !== null) return false;
      if (
        filtros.projeto_id &&
        filtros.projeto_id !== 'backoffice' &&
        c.projeto_id !== filtros.projeto_id
      ) {
        return false;
      }
      if (filtros.status && c.status !== filtros.status) return false;
      if (filtros.centro_custo === 'sem_centro' && c.centro_custo !== null) return false;
      if (
        filtros.centro_custo &&
        filtros.centro_custo !== 'sem_centro' &&
        c.centro_custo !== filtros.centro_custo
      ) {
        return false;
      }
      if (busca && !c.objeto.toLowerCase().includes(busca)) return false;
      return true;
    })
    .sort((a, b) => String(b.data_contratacao ?? '').localeCompare(String(a.data_contratacao ?? '')));

  return {
    contratos: lista,
    total: lista.length,
    pagina: 1,
    limite: lista.length,
    resumo: {
      total: lista.length,
      ativos: lista.filter((c) => c.status === 'ativo').length,
      encerrados: lista.filter((c) => c.status === 'encerrado').length,
      cancelados: lista.filter((c) => c.status === 'cancelado').length,
      valor_contratado: somarValores(lista, 'valor_total'),
      valor_parcelado: somarValores(lista, 'valor_parcelado'),
      valor_aberto: somarValores(lista, 'valor_aberto'),
      valor_vencido: somarValores(lista, 'valor_vencido'),
      com_divergencia: lista.filter((c) => {
        const total = paraCentavos(c.valor_total);
        if (!c.valor_total || total === 0) return false;
        return total !== paraCentavos(c.valor_parcelado);
      }).length,
    },
  };
}

/** POST /contratos */
export async function demoCriarContrato(dados) {
  await esperar();
  const campos = camposContrato(dados, true);

  const novo = contrato({
    id: novoId(),
    fornecedor_id: campos.fornecedor_id,
    projeto_id: campos.projeto_id ?? null,
    objeto: campos.objeto,
    data_contratacao: campos.data_contratacao ?? null,
    valor_total: campos.valor_total ?? null,
    centro_custo: campos.centro_custo ?? null,
    tipo_servico: campos.tipo_servico ?? null,
    status: campos.status ?? 'ativo',
    observacoes: campos.observacoes ?? null,
    criado_em: agora(),
  });
  garantirEstado().contratos.push(novo);

  return { contrato: detalheContrato(novo) };
}

/** GET /contratos/:id */
export async function demoObterContrato(id) {
  await esperar();
  const alvo = acharContrato(id);
  return {
    contrato: detalheContrato(alvo),
    parcelas: parcelasDoContrato(id)
      .map((p) => detalheParcela(p))
      .sort((a, b) => a.numero - b.numero),
    totais: calcularTotais({ contrato_id: id }),
  };
}

/** PATCH /contratos/:id */
export async function demoAtualizarContrato(id, dados) {
  await esperar();
  const alvo = acharContrato(id);
  const campos = camposContrato(dados, false);
  if (Object.keys(campos).length === 0) throw new ErroDemoFornecedores('nada_para_atualizar');

  Object.assign(alvo, campos, { atualizado_em: agora() });
  return { contrato: detalheContrato(alvo) };
}

/**
 * POST /contratos/:id/parcelas-gerar
 *
 * Espelha public.carbon_parcelas_gerar, inclusive nas duas recusas que existem
 * para nao duplicar obrigacao financeira.
 */
export async function demoGerarParcelas(contratoId, dados = {}) {
  await esperar();
  const alvo = acharContrato(contratoId);
  const estadoAtual = garantirEstado();

  const quantidadeBruta = dados.quantidade;
  const quantidade = Number(quantidadeBruta);
  const serie = calcularSerie({
    quantidade: Number.isFinite(quantidade) ? Math.trunc(quantidade) : NaN,
    periodicidade: dados.periodicidade,
    primeiroVencimento: validarData(dados.primeiro_vencimento, 'primeiro_vencimento'),
    valorParcela: validarValor(dados.valor_parcela, 'valor_parcela'),
    valorTotal: validarValor(dados.valor_total, 'valor_total'),
    valorContrato: alvo.valor_total,
  });

  const existentes = parcelasDoContrato(contratoId);
  const pagas = existentes.filter((p) => p.data_pagamento !== null);
  const substituir = dados.substituir === true;

  if (existentes.length > 0 && !substituir) {
    throw new ErroDemoFornecedores('parcelas_ja_existem', 'contrato_id');
  }
  if (substituir && pagas.length > 0) {
    throw new ErroDemoFornecedores('parcela_paga_impede_regeracao', 'contrato_id');
  }

  let removidas = 0;
  if (substituir && existentes.length > 0) {
    const antes = estadoAtual.parcelas.length;
    estadoAtual.parcelas = estadoAtual.parcelas.filter(
      (p) => !(p.contrato_id === contratoId && p.data_pagamento === null),
    );
    removidas = antes - estadoAtual.parcelas.length;
  }

  const criadoEm = agora();
  const tipoServico = texto(dados.tipo_servico, 'tipo_servico', 120) ?? alvo.tipo_servico;
  const centroCusto = texto(dados.centro_custo, 'centro_custo', 120) ?? alvo.centro_custo;
  const descricao = texto(dados.descricao, 'descricao', 500);

  serie.itens.forEach((item) => {
    estadoAtual.parcelas.push({
      id: novoId(),
      contrato_id: contratoId,
      numero: item.numero,
      descricao,
      valor: item.valor,
      vencimento: item.vencimento,
      data_pagamento: null,
      tipo_servico: tipoServico,
      centro_custo: centroCusto,
      observacoes: null,
      criado_por: USUARIO_DEMO_ID,
      criado_em: criadoEm,
      atualizado_em: criadoEm,
    });
  });

  return {
    geracao: {
      contrato_id: contratoId,
      criadas: serie.itens.length,
      removidas,
      quantidade: serie.itens.length,
      periodicidade: serie.periodicidade,
      intervalo_meses: serie.intervalo_meses,
      valor_total: serie.valor_total,
      valor_parcela: serie.valor_parcela,
      valor_ultima_parcela: serie.valor_ultima_parcela,
      primeiro_vencimento: serie.primeiro_vencimento,
      ultimo_vencimento: serie.ultimo_vencimento,
    },
    contrato: detalheContrato(alvo),
    parcelas: parcelasDoContrato(contratoId)
      .map((p) => detalheParcela(p))
      .sort((a, b) => a.numero - b.numero),
    totais: calcularTotais({ contrato_id: contratoId }),
  };
}

/** POST /contratos/:id/parcelas - parcela avulsa, com numero automatico. */
export async function demoCriarParcela(contratoId, dados = {}) {
  await esperar();
  const alvo = acharContrato(contratoId);

  const valor = validarValor(dados.valor, 'valor');
  if (valor === null) throw new ErroDemoFornecedores('campo_obrigatorio', 'valor');
  const vencimento = validarData(dados.vencimento, 'vencimento');
  if (!vencimento) throw new ErroDemoFornecedores('campo_obrigatorio', 'vencimento');

  const existentes = parcelasDoContrato(contratoId);
  const numero = existentes.reduce((maior, p) => Math.max(maior, p.numero), 0) + 1;
  const criadoEm = agora();

  const nova = {
    id: novoId(),
    contrato_id: contratoId,
    numero,
    descricao: texto(dados.descricao, 'descricao', 500),
    valor,
    vencimento,
    data_pagamento: validarData(dados.data_pagamento, 'data_pagamento'),
    tipo_servico: texto(dados.tipo_servico, 'tipo_servico', 120) ?? alvo.tipo_servico,
    centro_custo: texto(dados.centro_custo, 'centro_custo', 120) ?? alvo.centro_custo,
    observacoes: texto(dados.observacoes, 'observacoes', 5000),
    criado_por: USUARIO_DEMO_ID,
    criado_em: criadoEm,
    atualizado_em: criadoEm,
  };
  garantirEstado().parcelas.push(nova);

  return { parcela: detalheParcela(nova), contrato: detalheContrato(alvo) };
}

/** GET /parcelas */
export async function demoListarParcelas(filtros = {}) {
  await esperar();
  const visao = filtros.visao ?? 'todas';
  if (!['em_aberto', 'pagas', 'calendario', 'todas'].includes(visao)) {
    throw new ErroDemoFornecedores('campo_invalido', 'visao');
  }

  const inicio = validarData(filtros.inicio, 'inicio');
  const fim = validarData(filtros.fim, 'fim');
  if (inicio && fim && fim < inicio) throw new ErroDemoFornecedores('periodo_invalido', 'fim');

  const centroCusto = filtros.centro_custo === 'sem_centro' ? '' : (filtros.centro_custo ?? null);
  const base = {
    inicio,
    fim,
    centro_custo: centroCusto,
    fornecedor_id: filtros.fornecedor_id ?? null,
    projeto_id: filtros.projeto_id ?? null,
    contrato_id: filtros.contrato_id ?? null,
  };

  const itens = filtrarParcelas(base)
    .filter((p) => {
      if (visao === 'em_aberto') return p.data_pagamento === null;
      if (visao === 'pagas') return p.data_pagamento !== null;
      return true;
    })
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.numero - b.numero);

  return {
    parcelas: itens,
    total: itens.length,
    pagina: 1,
    limite: itens.length,
    visao,
    // Os totais NAO seguem a visao: somam o periodo inteiro, igual a funcao SQL.
    totais: calcularTotais(base),
  };
}

/**
 * PATCH /parcelas/:id
 *
 * Nao existe campo de status: baixar a parcela e informar data_pagamento, e
 * desfazer e envia-la como null. Requisito central da issue #11.
 */
export async function demoAtualizarParcela(id, dados = {}) {
  await esperar();
  const alvo = acharParcela(id);
  const campos = {};

  if (veio(dados, 'valor')) {
    const valor = validarValor(dados.valor, 'valor');
    if (valor === null) throw new ErroDemoFornecedores('campo_obrigatorio', 'valor');
    campos.valor = valor;
  }
  if (veio(dados, 'vencimento')) {
    const vencimento = validarData(dados.vencimento, 'vencimento');
    if (!vencimento) throw new ErroDemoFornecedores('campo_obrigatorio', 'vencimento');
    campos.vencimento = vencimento;
  }
  if (veio(dados, 'data_pagamento')) {
    campos.data_pagamento = validarData(dados.data_pagamento, 'data_pagamento');
  }
  if (veio(dados, 'descricao')) campos.descricao = texto(dados.descricao, 'descricao', 500);
  if (veio(dados, 'tipo_servico')) campos.tipo_servico = texto(dados.tipo_servico, 'tipo_servico', 120);
  if (veio(dados, 'centro_custo')) campos.centro_custo = texto(dados.centro_custo, 'centro_custo', 120);
  if (veio(dados, 'observacoes')) campos.observacoes = texto(dados.observacoes, 'observacoes', 5000);

  if (Object.keys(campos).length === 0) throw new ErroDemoFornecedores('nada_para_atualizar');

  Object.assign(alvo, campos, { atualizado_em: agora() });

  return {
    parcela: detalheParcela(alvo),
    contrato: detalheContrato(acharContrato(alvo.contrato_id)),
  };
}

/** DELETE /parcelas/:id - somente parcela NAO paga. */
export async function demoRemoverParcela(id) {
  await esperar();
  const alvo = acharParcela(id);
  if (alvo.data_pagamento) throw new ErroDemoFornecedores('parcela_paga');

  const detalhe = detalheParcela(alvo);
  const contratoAlvo = acharContrato(alvo.contrato_id);
  const estadoAtual = garantirEstado();
  estadoAtual.parcelas = estadoAtual.parcelas.filter((p) => p.id !== id);

  return { removida: true, parcela: detalhe, contrato: detalheContrato(contratoAlvo) };
}

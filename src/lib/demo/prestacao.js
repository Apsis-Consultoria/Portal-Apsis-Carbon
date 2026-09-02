/**
 * Dados FICTICIOS da prestacao de contas, para o modo demonstracao.
 *
 * ATE 01/09/2026 este topico nao tinha dataset de demonstracao, por decisao:
 * numeros inventados de repasse a comunidade indigena poderiam ser confundidos
 * com os reais. A objecao caiu quando os rotulos viraram GENERICOS: nao ha
 * aldeia real, grupo real nem valor real aqui - "Comunidade A", "Aldeia Rio
 * Claro", numeros redondos. Nada que uma captura de tela possa afirmar sobre o
 * projeto de verdade.
 *
 * Mesmo padrao dos outros modulos demo: estado em memoria, some no build de
 * producao via tree-shaking (ver o cabecalho de src/lib/api/projetos.js).
 */

let seq = 100;
const id = (p) => `demo-${p}-${seq++}`;

const GRUPO_A = id('grupo');
const GRUPO_B = id('grupo');
const PROJ = 'demo-projeto-1';

const aldeias = [
  { id: id('ald'), grupo_id: GRUPO_A, nome: 'Aldeia Rio Claro', e_associacao: false, ativa: true },
  { id: id('ald'), grupo_id: GRUPO_A, nome: 'Aldeia Serra Alta', e_associacao: false, ativa: true },
  { id: id('ald'), grupo_id: GRUPO_A, nome: 'Aldeia Duas Pontes', e_associacao: false, ativa: true },
  { id: id('ald'), grupo_id: GRUPO_A, nome: 'Associação', e_associacao: true, ativa: true },
  { id: id('ald'), grupo_id: GRUPO_B, nome: 'Aldeia Beira Rio', e_associacao: false, ativa: true },
  { id: id('ald'), grupo_id: GRUPO_B, nome: 'Aldeia Mata Verde', e_associacao: false, ativa: true },
  { id: id('ald'), grupo_id: GRUPO_B, nome: 'Associação', e_associacao: true, ativa: true },
];

const eixos = [
  { id: id('eixo'), projeto_id: PROJ, nome: 'Energia', linha_estrategica: 'Comunidade', ordem: 0 },
  { id: id('eixo'), projeto_id: PROJ, nome: 'Segurança Alimentar', linha_estrategica: 'Comunidade', ordem: 10 },
  { id: id('eixo'), projeto_id: PROJ, nome: 'Fortalecimento Institucional', linha_estrategica: 'Fortalecimento cultural e de governança', ordem: 20 },
  { id: id('eixo'), projeto_id: PROJ, nome: 'Internet', linha_estrategica: 'Comunidade', ordem: 30 },
  { id: id('eixo'), projeto_id: PROJ, nome: 'Cadeia Produtiva', linha_estrategica: 'Cadeia bioeconomia', ordem: 40 },
];

const CICLO_A1 = id('ciclo');
const CICLO_A2 = id('ciclo');
const CICLO_B1 = id('ciclo');

const ald = (n) => aldeias[n];
const eixo = (n) => eixos[n];

const lancamentos = [];
const antecipacoes = [];
const comprovantes = [];
const atividades = [];

function lanc(ciclo, grupo, mes, desc, valor, a, e, comp) {
  lancamentos.push({
    id: id('lanc'), ciclo_id: ciclo, grupo_id: grupo,
    aldeia_id: a?.id ?? null, eixo_id: e?.id ?? null,
    competencia: `2025-${mes}-28`, descricao: desc, valor: -valor,
    quantidade: null, documento: null, tem_comprovante: comp,
    observacoes: null, origem_aba: null, origem_linha: null,
    aldeia: a?.nome ?? null, aldeia_e_associacao: a?.e_associacao ?? false,
    eixo: e?.nome ?? null, linha_estrategica: e?.linha_estrategica ?? null,
  });
}

// Ciclo 1 do Grupo A: o cenario cheio, com todos os estados de comprovante.
[['01', '2 Placas solares', 3400, 0, 0, true], ['01', 'Cesta básica', 1200, 1, 1, true],
 ['02', 'Internet (mensalidade)', 500, 2, 3, true], ['02', 'Motor gerador', 7800, 0, 0, false],
 ['02', 'Assessoria contábil', 2000, 3, 2, true], ['03', 'Cesta básica', 1250, 1, 1, false],
 ['03', 'Combustível', 900, 2, 4, null], ['04', 'Ferramentas de roça', 1600, 1, 4, true],
 ['04', 'Internet (mensalidade)', 500, 2, 3, true], ['04', 'Salário de diretoria', 3000, 3, 2, false],
].forEach(([m, d, v, a, e, c]) => lanc(CICLO_A1, GRUPO_A, m, d, v, ald(a), eixo(e), c));

// Ciclo 2 do Grupo A e ciclo do B: mais curtos.
[['05', 'Cesta básica', 1300, 1, 1, true], ['06', 'Manutenção do poço', 2200, 0, 1, null],
 ['06', 'Internet (mensalidade)', 500, 2, 3, true],
].forEach(([m, d, v, a, e, c]) => lanc(CICLO_A2, GRUPO_A, m, d, v, ald(a), eixo(e), c));
[['02', 'Barco e motor', 12500, 4, 4, true], ['03', 'Cesta básica', 1100, 5, 1, true],
 ['04', 'Energia solar (kit)', 5200, 5, 0, false],
].forEach(([m, d, v, a, e, c]) => lanc(CICLO_B1, GRUPO_B, m, d, v, ald(a), eixo(e), c));

['01', '02', '03', '04'].forEach((m) => antecipacoes.push({
  id: id('ant'), ciclo_id: CICLO_A1, competencia: `2025-${m}-31`, valor: 10000,
  observacoes: null, origem_aba: null, origem_linha: null,
}));
antecipacoes.push({ id: id('ant'), ciclo_id: CICLO_A2, competencia: '2025-05-31', valor: 8000, observacoes: null, origem_aba: null, origem_linha: null });
antecipacoes.push({ id: id('ant'), ciclo_id: CICLO_B1, competencia: '2025-02-28', valor: 20000, observacoes: null, origem_aba: null, origem_linha: null });

[['01', 3400, 1, 0], ['01', 1200, 2, 1], ['02', 500, 1, 2], ['02', 2000, 2, 3],
 ['04', 1600, 1, 1], ['04', 500, 2, 2],
].forEach(([m, v, o, a]) => comprovantes.push({
  id: id('comp'), ciclo_id: CICLO_A1, grupo_id: GRUPO_A, aldeia_id: ald(a).id,
  ordem_no_mes: o, data: `2025-${m}-15`, valor: v,
  instituicao_recebedor: 'Banco Exemplo', instituicao_pagador: 'Cooperativa Demo',
  observacoes: null, origem_aba: null, origem_linha: null,
  aldeia: ald(a).nome, aldeia_e_associacao: ald(a).e_associacao,
}));

[['MR-1', '2024-08-05', 'Oficina de manejo agroflorestal', 'Instituto Exemplo', 'Capacitação', 'Concluído'],
 ['MR-1', '2024-09-12', 'Reunião de consulta sobre o plano de trabalho', 'Instituto Exemplo', 'Reunião com Stakeholders', 'Concluído'],
 ['MR-2', '2025-02-20', 'Entrega de equipamentos de comunicação', 'Cooperativa Demo', 'Entrega', 'Concluído'],
 ['MR-2', '2025-03-08', 'Monitoramento territorial trimestral', 'Instituto Exemplo', 'Ronda', 'Em andamento'],
 ['MR-3', '2025-09-02', 'Ofício de apresentação do novo ciclo', 'Instituto Exemplo', 'Ofício', 'Dúvida'],
].forEach(([r, d, a, inst, tipo, st]) => atividades.push({
  id: id('ativ'), projeto_id: PROJ, grupo_id: null, grupo: null, relatorio: r,
  inicio: d, termino: d, atividade: a, instituicao: inst, tipo,
  linha_estrategica: null, evidencia: 'Foto e lista de presença', valor: null,
  status: st, observacoes: null, origem_aba: null, origem_linha: null,
}));

const grupos = [
  { id: GRUPO_A, projeto_id: PROJ, chave: 'demo_a', nome: 'Comunidade A (exemplo)' },
  { id: GRUPO_B, projeto_id: PROJ, chave: 'demo_b', nome: 'Comunidade B (exemplo)' },
];

const ciclos = [
  { ciclo_id: CICLO_A1, grupo_id: GRUPO_A, nome: 'Janeiro a Abril 2025', inicio: '2025-01-01', fim: '2025-04-30', saldo_abertura: null, status: 'em_conciliacao' },
  { ciclo_id: CICLO_A2, grupo_id: GRUPO_A, nome: 'Maio a Agosto 2025', inicio: '2025-05-01', fim: '2025-08-31', saldo_abertura: 2500, status: 'aberto' },
  { ciclo_id: CICLO_B1, grupo_id: GRUPO_B, nome: 'Fevereiro a Junho 2025', inicio: '2025-02-01', fim: '2025-06-30', saldo_abertura: null, status: 'em_conciliacao' },
];

function saldoDe(c) {
  const ants = antecipacoes.filter((a) => a.ciclo_id === c.ciclo_id);
  const lans = lancamentos.filter((l) => l.ciclo_id === c.ciclo_id);
  const soma = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
  return {
    ciclo_id: c.ciclo_id, grupo_id: c.grupo_id, projeto_id: PROJ,
    ciclo: c.nome, status: c.status, saldo_abertura: c.saldo_abertura,
    antecipado: soma(ants, (a) => a.valor),
    declarado: soma(lans, (l) => l.valor),
    declarado_com_comprovante: soma(lans.filter((l) => l.tem_comprovante === true), (l) => l.valor),
    declarado_sem_comprovante: soma(lans.filter((l) => l.tem_comprovante !== true), (l) => l.valor),
    saldo: (c.saldo_abertura ?? 0) + soma(ants, (a) => a.valor) + soma(lans, (l) => l.valor),
    lancamentos: lans.length,
  };
}

export function demoListarGrupos() {
  return {
    grupos: grupos.map((g) => ({ ...g, ciclos: ciclos.filter((c) => c.grupo_id === g.id).map(saldoDe) })),
    pode_escrever: true,
  };
}

export function demoCatalogos() {
  return { aldeias, eixos };
}

export function demoDetalharCiclo(idCiclo) {
  const c = ciclos.find((x) => x.ciclo_id === idCiclo) ?? ciclos[0];
  return {
    saldo: saldoDe(c),
    antecipacoes: antecipacoes.filter((a) => a.ciclo_id === c.ciclo_id),
    lancamentos: lancamentos.filter((l) => l.ciclo_id === c.ciclo_id),
    pode_escrever: true,
  };
}

export function demoPainel(idCiclo) {
  const c = ciclos.find((x) => x.ciclo_id === idCiclo) ?? ciclos[0];
  const lans = lancamentos.filter((l) => l.ciclo_id === c.ciclo_id);
  const cps = comprovantes.filter((x) => x.ciclo_id === c.ciclo_id);
  const balde = (chaveDe) => {
    const m = new Map();
    for (const l of lans) {
      const k = chaveDe(l);
      if (!m.has(k)) m.set(k, { chave: k, total: 0, sem_comprovante: 0, linhas: 0 });
      const b = m.get(k);
      b.total += Math.abs(l.valor);
      if (l.tem_comprovante !== true) b.sem_comprovante += Math.abs(l.valor);
      b.linhas += 1;
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  };
  const porMes = balde((l) => l.competencia.slice(0, 7)).sort((a, b) => a.chave.localeCompare(b.chave));
  for (const m of porMes) {
    m.comprovado = cps.filter((x) => x.data.slice(0, 7) === m.chave).reduce((s, x) => s + x.valor, 0);
  }
  return {
    saldo: saldoDe(c),
    por_eixo: balde((l) => l.eixo ?? 'Sem eixo'),
    por_aldeia: balde((l) => l.aldeia ?? 'Sem aldeia'),
    por_competencia: porMes,
    comprovantes: { quantidade: cps.length, soma: cps.reduce((s, x) => s + x.valor, 0) },
    pode_escrever: true,
  };
}

export function demoListarComprovantes(idCiclo) {
  const lista = comprovantes.filter((x) => x.ciclo_id === idCiclo);
  return { comprovantes: lista, total: lista.length, pagina: 1, limite: 50, pode_escrever: true };
}

export function demoListarAtividades({ relatorio } = {}) {
  const lista = relatorio ? atividades.filter((a) => a.relatorio === relatorio) : atividades;
  return { atividades: lista, total: lista.length, pagina: 1, limite: 50, pode_escrever: true };
}

/* Escritas do modo demonstracao: mexem no estado em memoria, somem no reload.
   O suficiente para a pessoa sentir o fluxo sem tocar rede nem banco. */
export function demoCriarLancamento(dados) {
  const c = ciclos.find((x) => x.ciclo_id === dados.ciclo_id) ?? ciclos[0];
  const a = aldeias.find((x) => x.id === dados.aldeia_id) ?? null;
  const e = eixos.find((x) => x.id === dados.eixo_id) ?? null;
  const novo = {
    id: id('lanc'), ciclo_id: c.ciclo_id, grupo_id: c.grupo_id,
    aldeia_id: a?.id ?? null, eixo_id: e?.id ?? null,
    competencia: dados.competencia, descricao: dados.descricao, valor: dados.valor,
    quantidade: dados.quantidade ?? null, documento: dados.documento ?? null,
    tem_comprovante: dados.tem_comprovante ?? null, observacoes: dados.observacoes ?? null,
    origem_aba: null, origem_linha: null,
    aldeia: a?.nome ?? null, aldeia_e_associacao: a?.e_associacao ?? false,
    eixo: e?.nome ?? null, linha_estrategica: e?.linha_estrategica ?? null,
  };
  lancamentos.push(novo);
  return { lancamento: novo };
}

export function demoAtualizarLancamento(idLanc, dados) {
  const l = lancamentos.find((x) => x.id === idLanc);
  if (l) Object.assign(l, dados);
  return { lancamento: l };
}

export function demoRemoverLancamento(idLanc) {
  const i = lancamentos.findIndex((x) => x.id === idLanc);
  if (i >= 0) lancamentos.splice(i, 1);
  return { removido: true };
}

export function demoCriarAntecipacao(dados) {
  const novo = { id: id('ant'), ciclo_id: dados.ciclo_id, competencia: dados.competencia, valor: dados.valor, observacoes: dados.observacoes ?? null, origem_aba: null, origem_linha: null };
  antecipacoes.push(novo);
  return { antecipacao: novo };
}

export function demoAtualizarAntecipacao(idAnt, dados) {
  const a = antecipacoes.find((x) => x.id === idAnt);
  if (a) Object.assign(a, dados);
  return { antecipacao: a };
}

export function demoRemoverAntecipacao(idAnt) {
  const i = antecipacoes.findIndex((x) => x.id === idAnt);
  if (i >= 0) antecipacoes.splice(i, 1);
  return { removido: true };
}

export function demoCriarComprovante(dados) {
  const c = ciclos.find((x) => x.ciclo_id === dados.ciclo_id) ?? ciclos[0];
  const a = aldeias.find((x) => x.id === dados.aldeia_id) ?? null;
  const novo = {
    id: id('comp'), ciclo_id: c.ciclo_id, grupo_id: c.grupo_id, aldeia_id: a?.id ?? null,
    ordem_no_mes: dados.ordem_no_mes ?? null, data: dados.data, valor: dados.valor,
    instituicao_recebedor: dados.instituicao_recebedor ?? null,
    instituicao_pagador: dados.instituicao_pagador ?? null,
    observacoes: dados.observacoes ?? null, origem_aba: null, origem_linha: null,
    aldeia: a?.nome ?? null, aldeia_e_associacao: a?.e_associacao ?? false,
  };
  comprovantes.push(novo);
  return { comprovante: novo };
}

export function demoAtualizarComprovante(idComp, dados) {
  const c = comprovantes.find((x) => x.id === idComp);
  if (c) Object.assign(c, dados);
  return { comprovante: c };
}

export function demoRemoverComprovante(idComp) {
  const i = comprovantes.findIndex((x) => x.id === idComp);
  if (i >= 0) comprovantes.splice(i, 1);
  return { removido: true };
}

export function demoCriarCiclo(dados) {
  const novo = {
    ciclo_id: id('ciclo'), grupo_id: dados.grupo_id, nome: dados.nome,
    inicio: dados.inicio, fim: dados.fim ?? null,
    saldo_abertura: dados.saldo_abertura ?? null, status: dados.status ?? 'aberto',
  };
  ciclos.push(novo);
  return { ciclo: { id: novo.ciclo_id, ...novo } };
}

export function demoAtualizarCiclo(idCiclo, dados) {
  const c = ciclos.find((x) => x.ciclo_id === idCiclo);
  if (c) Object.assign(c, dados, dados.nome ? { nome: dados.nome } : {});
  return { ciclo: c };
}

export function demoCriarAldeia(dados) {
  const nova = { id: id('ald'), grupo_id: dados.grupo_id, nome: dados.nome, e_associacao: dados.e_associacao === true, ativa: true };
  aldeias.push(nova);
  return { aldeia: nova };
}

export function demoAtualizarAldeia(idAld, dados) {
  const a = aldeias.find((x) => x.id === idAld);
  if (a) Object.assign(a, dados);
  return { aldeia: a };
}

export function demoCriarEixo(dados) {
  const novo = { id: id('eixo'), projeto_id: PROJ, nome: dados.nome, linha_estrategica: dados.linha_estrategica ?? null, ordem: 900 };
  eixos.push(novo);
  return { eixo: novo };
}

export function demoAtualizarEixo(idEixo, dados) {
  const e = eixos.find((x) => x.id === idEixo);
  if (e) Object.assign(e, dados);
  return { eixo: e };
}

export function demoCriarAtividade(dados) {
  const nova = { id: id('ativ'), projeto_id: PROJ, grupo_id: dados.grupo_id ?? null, grupo: null, origem_aba: null, origem_linha: null, ...dados };
  atividades.push(nova);
  return { atividade: nova };
}

export function demoAtualizarAtividade(idAtiv, dados) {
  const a = atividades.find((x) => x.id === idAtiv);
  if (a) Object.assign(a, dados);
  return { atividade: a };
}

export function demoRemoverAtividade(idAtiv) {
  const i = atividades.findIndex((x) => x.id === idAtiv);
  if (i >= 0) atividades.splice(i, 1);
  return { removido: true };
}

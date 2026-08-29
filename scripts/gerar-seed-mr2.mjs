// Gera o seed do Monitoring Report 2 (Jul 24 a Dez 25).
//
//   node scripts/gerar-seed-mr2.mjs

import { readFile, writeFile } from 'node:fs/promises';

const ENTRADA = 'docs/notion/dados/monitoring-report-2.json';
const SAIDA = 'supabase/seeds/monitoring_report_2.sql';
const RELATORIO = 'Monitoring Report 2 (Jul 24 a Dez 25)';

const dados = JSON.parse(await readFile(ENTRADA, 'utf8'));

const limpo = (v) => String(v ?? '').trim();

function sql(v) {
  const t = limpo(v);
  if (!t) return 'null';
  return "'" + t.replace(/'/g, "''") + "'";
}

/* A coluna Status do Notion mistura DUAS informacoes: em que ponto o capitulo
   esta e em que volta de revisao ele esta. A tabela ja separa isso em `estado` e
   `rodada`, e a traducao abaixo desfaz a mistura. */
const ESTADO = {
  'Concluído': ['concluido', 1],
  'Em andamento': ['em_andamento', 1],
  'Revisão 1': ['em_revisao', 1],
  'Revisão 2': ['em_revisao', 2],
};

/* Estado do documento na coluna Status da lista de evidencias. */
const EVIDENCIA = {
  'Anexado Pasta': ['concluido', 'anexada'],
  'N/A': ['nao_aplicavel', 'nao_aplicavel'],
  'Revisão': ['em_andamento', 'pendente'],
};

const capitulos = [];
for (const [id, chapter, subchapter, nome, status] of dados.c) {
  const cap = limpo(subchapter).replace(/\.$/, '');   // "2." vem assim da origem
  if (!cap || !limpo(nome)) continue;
  const [estado, rodada] = ESTADO[limpo(status)] ?? ['nao_iniciado', 1];
  capitulos.push({
    id, capitulo: cap, nome: limpo(nome),
    // `cap` e o numero do capitulo raiz; `nivel` e quantos pontos ha no codigo.
    capRaiz: Number(cap.split('.')[0]) || 0,
    nivel: cap.split('.').length,
    grupo: limpo(chapter),
    estado, rodada,
  });
}
capitulos.forEach((c, i) => { c.ordem = i + 1; });

const evidencias = [];
dados.d.forEach(([id, secao, exigencia, status, comentarios], i) => {
  if (!limpo(exigencia)) return;
  const [resposta, estado] = EVIDENCIA[limpo(status)] ?? ['nao_iniciado', 'pendente'];
  evidencias.push({
    id, ordem: i + 1,
    // A origem nao numera os itens; o codigo e posicional e estavel dentro do
    // relatorio, que e o que a chave unica exige.
    codigo: 'MR2-' + String(i + 1).padStart(2, '0'),
    secao: limpo(secao) || 'Outros',
    exigencia: limpo(exigencia),
    resposta, estado,
    observacoes: limpo(comentarios),
  });
});

const porNivel = capitulos.reduce((a, c) => ((a[c.nivel] = (a[c.nivel] ?? 0) + 1), a), {});
const porRodada = capitulos.reduce((a, c) => ((a[c.rodada] = (a[c.rodada] ?? 0) + 1), a), {});

const partes = [];

partes.push(`-- =============================================================================
-- Apsis Carbon - Monitoring Report 2 (Jul 24 a Dez 25)
-- Arquivo: ${SAIDA}
-- Gerado por: scripts/gerar-seed-mr2.mjs (nao edite a mao)
-- Fonte: ${ENTRADA}, lido ao vivo do Notion em 26/08/2026
-- =============================================================================
-- O SEGUNDO RELATORIO. O levantamento tinha registrado esta pagina como "nunca
-- aberta". Ela e o relatorio de monitoramento do periodo seguinte, com ${capitulos.length}
-- capitulos proprios e ${evidencias.length} documentos exigidos - contra 32 e 26 do primeiro.
--
-- Ele so cabe no banco por causa da migration 20260826200000: as duas tabelas
-- tinham chave unica por (projeto, capitulo) e (projeto, codigo), e numero de
-- capitulo se repete entre periodos POR CONSTRUCAO. "2.1.4 Project Proponent"
-- existe nos dois relatorios, e tem de existir.
--
-- A COLUNA Status DO NOTION MISTURA DUAS COISAS: o ponto em que o capitulo esta
-- e a volta de revisao. "Revisao 1" e "Revisao 2" nao sao estados diferentes,
-- sao a MESMA situacao (em revisao) em rodadas diferentes. A tabela ja separa os
-- dois eixos, entao a traducao desfaz a mistura: ${porRodada[1] ?? 0} capitulos na rodada 1 e
-- ${porRodada[2] ?? 0} na rodada 2.
--
-- CODIGO POSICIONAL nas evidencias (MR2-01, MR2-02...): a lista do Notion nao
-- numera os itens, e a chave unica precisa de um codigo. E estavel dentro do
-- relatorio porque deriva da ordem da propria lista.
--
-- LGPD: um comentario da lista de documentos citava uma pessoa pelo nome
-- ("Verificar com <nome> aportes para..."). O nome foi substituido por [P] na
-- extracao, antes de o arquivo existir em disco.
-- =============================================================================

do $$
declare
  v_projeto uuid;
begin
  select id into v_projeto from public.carbon_projetos where nome = 'Awaete REDD+' limit 1;
  if v_projeto is null then
    raise exception 'projeto "Awaete REDD+" nao encontrado';
  end if;

  delete from public.carbon_mr_capitulos where projeto_id = v_projeto and relatorio = ${sql(RELATORIO)};
  delete from public.carbon_evidencia_itens where projeto_id = v_projeto and relatorio = ${sql(RELATORIO)};
`);

for (const c of capitulos) {
  partes.push(`  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:${c.id}')::uuid, v_projeto, ${sql(RELATORIO)}, ${sql(c.capitulo)},
          ${sql(c.nome)}, ${c.capRaiz}, ${c.nivel}, ${c.ordem}, '${c.estado}', ${c.rodada}, ${sql(c.grupo)});`);
}

for (const e of evidencias) {
  partes.push(`  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:${e.id}')::uuid, v_projeto, ${sql(RELATORIO)}, '${e.codigo}', ${sql(e.secao)},
          ${sql(e.exigencia)}, ${e.ordem}, '${e.resposta}', '${e.estado}', ${sql(e.observacoes)});`);
}

partes.push(`
end $$;

do $$
declare
  n_cap integer;
  n_ev integer;
  n_mr1 integer;
begin
  select count(*) into n_cap from public.carbon_mr_capitulos where relatorio = ${sql(RELATORIO)};
  select count(*) into n_ev from public.carbon_evidencia_itens where relatorio = ${sql(RELATORIO)};
  -- O primeiro relatorio tem de continuar inteiro: a migration mexeu na chave
  -- unica dele, e e aqui que se ve se alguma linha foi perdida no caminho.
  select count(*) into n_mr1 from public.carbon_mr_capitulos where relatorio = 'Monitoring Report';

  raise notice 'MR2: % capitulos e % evidencias | MR1 intacto com % capitulos', n_cap, n_ev, n_mr1;

  if n_cap <> ${capitulos.length} then
    raise exception 'esperado ${capitulos.length} capitulos no MR2, encontrado %', n_cap;
  end if;
  if n_ev <> ${evidencias.length} then
    raise exception 'esperado ${evidencias.length} evidencias no MR2, encontrado %', n_ev;
  end if;
  if n_mr1 <> 32 then
    raise exception 'o primeiro relatorio deveria ter 32 capitulos, tem %', n_mr1;
  end if;
end $$;
`);

await writeFile(SAIDA, partes.join('\n'), 'utf8');

console.log(`gerado ${SAIDA}`);
console.log(`  capitulos: ${capitulos.length} por nivel ${JSON.stringify(porNivel)} por rodada ${JSON.stringify(porRodada)}`);
console.log(`  evidencias: ${evidencias.length}`);

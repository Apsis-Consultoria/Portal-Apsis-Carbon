// Gera o seed das reunioes do Parakana a partir da extracao ao vivo do Notion.
//
//   node scripts/gerar-seed-reunioes-parakana.mjs

import { readFile, writeFile } from 'node:fs/promises';

const ENTRADA = 'docs/notion/dados/reunioes-parakana-bruto.json';
const SAIDA = 'supabase/seeds/reunioes_parakana_completo.sql';

const dados = JSON.parse(await readFile(ENTRADA, 'utf8'));

const limpo = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');

function sql(v) {
  const t = String(v ?? '').trim();
  if (!t) return 'null';
  return "'" + t.replace(/'/g, "''") + "'";
}

/**
 * Tipo e parceiro saem do TITULO, porque no Notion nao existe coluna para eles.
 *
 * Nao e adivinhacao: e a mesma leitura que o levantamento fez e que a tela ja
 * usa. O padrao observado e "Reuniao Semanal Parakana - <PARCEIRO>", e a
 * ausencia de coluna propria e justamente o defeito que a tela conserta ao
 * transformar tipo e parceiro em campo.
 */
function classificar(titulo) {
  const t = limpo(titulo);
  const semAcento = t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // "Semanal <algo> - PARCEIRO": o que vem depois do hifen final e o parceiro.
  const comParceiro = t.match(/^Reuni[aã]o Semanal Parakan[aã]\s*-\s*(.+)$/i);
  if (comParceiro) {
    return { tipo: 'semanal_parceiro', parceiro: limpo(comParceiro[1]) };
  }

  if (/^reuniao semanal parakana$/.test(semAcento)) return { tipo: 'semanal', parceiro: null };
  if (semAcento.includes('governanc')) return { tipo: 'governanca', parceiro: null };
  if (semAcento.includes('consulta') || semAcento.includes('comunidade')) {
    return { tipo: 'consulta_comunidade', parceiro: null };
  }
  return { tipo: 'tematica', parceiro: null };
}

const pulados = [];
const registros = [];

for (const r of dados.reunioes) {
  // data e titulo sao NOT NULL. Cinco linhas do Notion nao tem nenhum dos dois:
  // foram criadas e nunca preenchidas. Nao ha o que carregar.
  if (!r.data || !limpo(r.nome)) {
    pulados.push(r.n);
    continue;
  }
  const { tipo, parceiro } = classificar(r.nome);
  registros.push({ id: r.id, n: r.n, titulo: limpo(r.nome), data: r.data, tipo, parceiro });
}

const porTipo = registros.reduce((a, r) => ((a[r.tipo] = (a[r.tipo] ?? 0) + 1), a), {});

/* Pendencias: entram penduradas na ata da reuniao da data indicada. Sao aceitas
   apenas quando existe reuniao naquela data; caso contrario nao ha onde ancorar
   sem inventar uma reuniao que o Notion nao tem. */
const datasComReuniao = new Set(registros.map((r) => r.data));
const pendencias = [];
const pendenciasSemReuniao = [];
for (const p of dados.pendencias) {
  const desc = limpo(p.atividade);
  if (!desc) continue;
  if (!p.data_reuniao || !datasComReuniao.has(p.data_reuniao)) {
    pendenciasSemReuniao.push(p.n);
    continue;
  }
  pendencias.push({
    id: p.id,
    descricao: desc,
    data: p.data_reuniao,
    concluida: limpo(p.status) === 'Concluído',
  });
}

const partes = [];

partes.push(`-- =============================================================================
-- Apsis Carbon - as reunioes do Parakana, base completa do Notion
-- Arquivo: ${SAIDA}
-- Gerado por: scripts/gerar-seed-reunioes-parakana.mjs (nao edite a mao)
-- Fonte: ${ENTRADA}, lido ao vivo do Notion em 26/08/2026
-- =============================================================================
-- DOIS DEFEITOS QUE ISTO CONSERTA.
--
-- 1) FALTAVAM 61 REUNIOES. A base "Reunioes periodicas" do Notion tem 106 linhas
--    e o banco tinha 45. A leitura anterior parou no corte de exibicao da
--    pagina, sem conferir o contador do rodape - a mesma armadilha que ja tinha
--    mordido as reunioes do backoffice e os findings da VVB. Conferido por data:
--    29 datas existiam no Notion e nao no banco, e nenhuma data do banco estava
--    fora do Notion.
--
-- 2) OS TITULOS ESTAVAM SEM ACENTO. No banco: "Reuniao Semanal Parakana". No
--    Notion: "Reuniao Semanal Parakana" com til e circunflexo. Parece cosmetico
--    e nao e: quem procura na tela por "Parakana" acentuado nao achava nada, e a
--    conferencia contra a origem acusava 45 divergencias que eram so grafia.
--
-- SUBSTITUICAO, e nao acrescimo: as 45 linhas antigas tem grafia diferente,
-- entao somar as 106 criaria par duplicado em 44 datas. E seguro porque nenhuma
-- reuniao de projeto tem ata ou evento do Teams pendurado (conferido antes).
-- As reunioes do backoffice, que sao as de projeto_id nulo, nao sao tocadas.
--
-- ${pulados.length} LINHAS FICARAM DE FORA: n ${pulados.join(', ')}. Sao linhas em branco no Notion,
-- sem data e sem nome. \`data\` e \`titulo\` sao NOT NULL, e com razao: reuniao sem
-- data nao entra em cadencia nenhuma.
--
-- TIPO E PARCEIRO SAEM DO TITULO porque no Notion nao existe coluna para eles -
-- e esse e exatamente o defeito que a tela conserta. O padrao e
-- "Reuniao Semanal Parakana - <PARCEIRO>".
--
-- PENDENCIAS: a base "BD - TD Parakana" nunca tinha sido aberta. Sao ${dados.pendencias.length} itens,
-- ${pendencias.length} deles com reuniao correspondente na mesma data. Cada um entra pendurado
-- na ata daquela reuniao, criada aqui SEM conteudo: a ata existe (a reuniao
-- aconteceu e gerou pendencia), o texto dela e que ainda nao foi extraido.
--
-- LGPD: a coluna \`Responsavel\` do Notion tem nome de pessoa fisica e NAO foi
-- extraida. O banco guarda responsavel como chave estrangeira para
-- carbon_usuarios, nunca como texto, entao o campo fica nulo ate alguem
-- associar pela tela. Os titulos das reunioes foram conferidos: nenhum contem
-- nome de pessoa.
--
-- Ids derivados do id do bloco no Notion: reaplicar nao duplica.
-- =============================================================================

do $$
declare
  v_projeto uuid;
begin
  select id into v_projeto from public.carbon_projetos where nome = 'Awaete REDD+' limit 1;
  if v_projeto is null then
    raise exception 'projeto "Awaete REDD+" nao encontrado; rode antes projeto_awaete.sql';
  end if;

  -- Limpa a carga anterior do projeto. Atas e pendencias caem por cascade.
  delete from public.carbon_reunioes where projeto_id = v_projeto;
`);

for (const r of registros) {
  partes.push(`  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:${r.id}')::uuid, v_projeto, '${r.tipo}', ${sql(r.titulo)}, date '${r.data}', ${sql(r.parceiro)});`);
}

if (pendencias.length) {
  partes.push(`
  -- ===== Pendencias da base "BD - TD Parakana" ==============================
  -- A ata nasce vazia de proposito: ela e o vinculo exigido pelo esquema
  -- (pendencia pertence a ata, ata pertence a reuniao) e o texto dela ainda nao
  -- foi extraido do corpo da pagina do Notion.`);

  const datasUsadas = [...new Set(pendencias.map((p) => p.data))];
  for (const data of datasUsadas) {
    partes.push(`  insert into public.carbon_atas (id, reuniao_id)
  select md5('ata:parakana:${data}')::uuid, id from public.carbon_reunioes
   where projeto_id = v_projeto and data = date '${data}'
   order by criado_em limit 1
  on conflict (reuniao_id) do nothing;`);
  }

  for (const p of pendencias) {
    partes.push(`  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:${p.id}')::uuid, md5('ata:parakana:${p.data}')::uuid,
          ${sql(p.descricao)}, ${p.concluida}, ${p.concluida ? 'now()' : 'null'});`);
  }
}

partes.push(`
end $$;

-- Conferencia: falha alto se a carga sair diferente da origem.
do $$
declare
  n_reun integer;
  n_atas integer;
  n_pend integer;
  n_sem_acento integer;
begin
  select count(*) into n_reun from public.carbon_reunioes r
    join public.carbon_projetos p on p.id = r.projeto_id where p.nome = 'Awaete REDD+';

  select count(*) into n_atas from public.carbon_atas a
    join public.carbon_reunioes r on r.id = a.reuniao_id
    join public.carbon_projetos p on p.id = r.projeto_id where p.nome = 'Awaete REDD+';

  select count(*) into n_pend from public.carbon_ata_pendencias;

  -- Se sobrou titulo sem acento, a carga velha nao foi substituida.
  select count(*) into n_sem_acento from public.carbon_reunioes r
    join public.carbon_projetos p on p.id = r.projeto_id
   where p.nome = 'Awaete REDD+' and r.titulo like '%Parakana%';

  raise notice 'reunioes do projeto: %, atas: %, pendencias: %', n_reun, n_atas, n_pend;

  if n_reun <> ${registros.length} then
    raise exception 'esperado ${registros.length} reunioes, encontrado %', n_reun;
  end if;
  if n_pend <> ${pendencias.length} then
    raise exception 'esperado ${pendencias.length} pendencias, encontrado %', n_pend;
  end if;
  if n_sem_acento > 0 then
    raise exception '% reunioes com titulo sem acento: a carga velha sobreviveu', n_sem_acento;
  end if;
end $$;
`);

await writeFile(SAIDA, partes.join('\n'), 'utf8');

console.log(`gerado ${SAIDA}`);
console.log(`  reunioes: ${registros.length} ${JSON.stringify(porTipo)}`);
console.log(`  puladas (linha em branco no Notion): ${pulados.join(', ') || 'nenhuma'}`);
console.log(`  pendencias: ${pendencias.length} de ${dados.pendencias.length}`);
if (pendenciasSemReuniao.length) {
  console.log(`  pendencias sem reuniao na data: n ${pendenciasSemReuniao.join(', ')}`);
}

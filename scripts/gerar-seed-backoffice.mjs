// Gera o seed das reunioes do backoffice e das 391 tarefas da base BD - To Do.
//
//   node scripts/gerar-seed-backoffice.mjs

import { readFile, writeFile } from 'node:fs/promises';

import { novoPseudonimizador } from './pseudonimos.mjs';

const ENTRADA = 'docs/notion/dados/backoffice-reunioes-e-todo.json';
const SAIDA = 'supabase/seeds/backoffice_completo.sql';


const dados = JSON.parse(await readFile(ENTRADA, 'utf8'));

const limpo = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');

/* Pseudonimizacao: nome proprio vira marcador estavel [Pnnn], o mesmo para a
   mesma pessoa em TODOS os seeds. A logica e a lista vivem em
   scripts/pseudonimos.mjs: ela estava copiada em cada gerador e a copia divergiu
   na primeira mudanca de regra (a criacao do codigo PROTEGER).

   ISTO FALTAVA INTEIRO NESTE GERADOR ate 02/09/2026. Existia so
   semNomeDePessoa, que trata UM formato de titulo de reuniao; as DESCRICOES de
   tarefa nunca passavam por nada, e era nelas que 28 pessoas estavam nomeadas.
   Mesma classe de erro do gerador da prestacao de contas. */
const pseudo = await novoPseudonimizador();
const pseudonimizar = (t) => pseudo.aplicar(t);

function sql(v) {
  const t = String(v ?? '').trim();
  if (!t) return 'null';
  return "'" + t.replace(/'/g, "''") + "'";
}

/**
 * Dois titulos do Notion nomeiam a PESSOA com quem a reuniao foi, e nao o
 * assunto: "Reuniao <nome> TI Koatinemo" e "Reuniao <nome> TI Sao Marcos".
 *
 * O nome sai e a Terra Indigena fica, que e a informacao que importa e a unica
 * que a tela usa. Nao e censura de conteudo: e a mesma decisao que a carga
 * anterior ja tinha tomado (ver o cabecalho de reunioes_complemento.sql), e
 * manter as duas coerentes evita que a proxima conferencia contra o Notion
 * acuse divergencia e alguem "conserte" reintroduzindo o nome.
 */
function semNomeDePessoa(titulo) {
  const t = limpo(titulo);
  const m = t.match(/^Reuni[aã]o\s+\S+\s+(TI\s+.+)$/i);
  // A regra ESTRUTURAL primeiro, e ela vale mais que a lista: pega nome que
  // ninguem cadastrou, pela forma da frase. Depois a lista, para o resto do
  // titulo. Nesta ordem de proposito: invertida, o titulo viraria
  // "Reuniao [P341] TI Sao Marcos" em vez de perder o nome inteiro.
  if (m) return pseudonimizar('Reunião ' + m[1]);
  return pseudonimizar(t);
}

function classificarReuniao(titulo) {
  const t = limpo(titulo).toLowerCase();
  if (/^weekly/.test(t)) return 'semanal';
  if (t.includes('comercial')) return 'semanal';
  return 'tematica';
}

/* ===== Reunioes do backoffice ============================================= */

const reunPuladas = [];
const reunioes = [];
for (const r of dados.reunioes) {
  if (!r.data || !limpo(r.nome)) {
    reunPuladas.push(r.n);
    continue;
  }
  reunioes.push({
    id: r.id,
    titulo: semNomeDePessoa(r.nome),
    data: r.data,
    tipo: classificarReuniao(r.nome),
  });
}

/* ===== Tarefas da base BD - To Do ========================================= */

const STATUS = { 'Concluído': 'concluida', 'Em andamento': 'em_andamento' };

/** O tipo sai do nome do projeto, que e o unico eixo que a origem oferece. */
function tipoDaTarefa(projeto) {
  const p = limpo(projeto);
  if (!p) return 'backoffice';
  if (/^interno apsis/i.test(p)) return 'backoffice';
  if (/^novos neg/i.test(p)) return 'novos_negocios';
  if (/^jpf/i.test(p)) return 'jpf';
  return 'consultoria';
}

const tarefaPuladas = [];
const tarefas = [];
for (const t of dados.tarefas) {
  // ESTES DOIS CAMPOS ERAM O VAZAMENTO: `atividade` e `comentarios` sao texto
  // livre escrito na correria, e e onde as pessoas sao nomeadas. Nenhum dos dois
  // passava por pseudonimizacao antes de 02/09/2026.
  const nome = pseudonimizar(limpo(t.atividade));
  if (!nome) {
    tarefaPuladas.push(t.n);
    continue;
  }
  const projeto = limpo(t.projeto);
  tarefas.push({
    id: t.id,
    nome,
    descricao: pseudonimizar(limpo(t.comentarios)),
    status: STATUS[limpo(t.status)] ?? 'nao_iniciada',
    tipo: tipoDaTarefa(projeto),
    projetoExterno: projeto,
    // So a frente do Parakana pertence ao projeto de carbono deste banco.
    doParakana: /parakan/i.test(projeto),
    data: t.data,
  });
}

const porTipo = tarefas.reduce((a, t) => ((a[t.tipo] = (a[t.tipo] ?? 0) + 1), a), {});
const projetos = new Set(tarefas.map((t) => t.projetoExterno).filter(Boolean));

/* ===== SQL ================================================================ */

const partes = [];

partes.push(`-- =============================================================================
-- Apsis Carbon - backoffice: reunioes da operacao e a base BD - To Do
-- Arquivo: ${SAIDA}
-- Gerado por: scripts/gerar-seed-backoffice.mjs (nao edite a mao)
-- Fonte: ${ENTRADA}, lido ao vivo do Notion em 26/08/2026
-- =============================================================================
-- DUAS BASES, e a segunda nunca tinha sido aberta.
--
-- 1) REUNIOES APSIS CARBON: 98 linhas no Notion, ${reunioes.length} carregaveis. O banco tinha
--    89. Alem das que faltavam, os TITULOS estavam diferentes da origem: o banco
--    dizia "Weekly Apsis Carbon" e o Notion diz "Weekly", "Weekly (1)" e
--    "Weekly (2)". Os sufixos numerados sao artefato de duplicacao de pagina no
--    proprio Notion; ficam como estao, porque o pedido e fidelidade a origem e
--    nao a origem arrumada.
--
-- 2) BD - TO DO: ${tarefas.length} tarefas em ${projetos.size} trabalhos distintos. E a carteira real
--    da operacao - inventarios de GEE, RAS, materialidade, diagnostico IFRS
--    S1/S2, EVTE, emissao no MDL - e ate hoje o banco tinha 8 atividades. O nome
--    do trabalho vai para \`projeto_externo\` (ver a migration
--    20260826190000), porque casar com carbon_consultorias exigiria decidir o
--    que e proposta e o que e entrega, e o mesmo cliente aparece em ate tres
--    contratos diferentes.
--
-- PULADAS: ${reunPuladas.length} reunioes (n ${reunPuladas.join(', ')}) e ${tarefaPuladas.length} tarefas (n ${tarefaPuladas.join(', ')}).
-- Sao linhas em branco no Notion. \`data\` e \`titulo\` da reuniao e \`nome\` da
-- atividade sao NOT NULL, e com razao: linha sem nome vira ruido na lista.
--
-- A REUNIAO "teste" NAO E APAGADA. Ela tem evento no Teams, e apagar a linha do
-- banco nao cancela o convite na agenda de quem foi convidado - deixaria um
-- evento orfao que ninguem mais alcanca pela tela. Por isso o delete exclui
-- quem tem teams_evento_id.
--
-- LGPD: dois titulos do Notion nomeiam a pessoa com quem a reuniao foi
-- ("Reuniao <nome> TI Koatinemo" e "Reuniao <nome> TI Sao Marcos"). O nome sai e
-- a Terra Indigena fica, que e a informacao que a tela usa. Mesma decisao da
-- carga anterior, mantida de proposito para as duas nao divergirem. A coluna
-- \`Responsavel\` do To Do nao foi extraida.
-- =============================================================================

do $$
declare
  v_projeto uuid;
begin
  select id into v_projeto from public.carbon_projetos where nome = 'Awaete REDD+' limit 1;
  if v_projeto is null then
    raise exception 'projeto "Awaete REDD+" nao encontrado';
  end if;

  -- Reunioes do backoffice, preservando as que tem evento no Teams.
  delete from public.carbon_reunioes
   where projeto_id is null and teams_evento_id is null;
`);

for (const r of reunioes) {
  partes.push(`  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:${r.id}')::uuid, '${r.tipo}', ${sql(r.titulo)}, date '${r.data}');`);
}

partes.push(`
  -- ===== BD - To Do =========================================================
  -- Substitui a carga anterior de atividades, que tinha 8 linhas vindas de uma
  -- leitura parcial de outra base.
  delete from public.carbon_atividades;
`);

for (const t of tarefas) {
  partes.push(`  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:${t.id}')::uuid, ${t.doParakana ? 'v_projeto' : 'null'},
          ${sql(t.nome)}, ${sql(t.descricao)}, '${t.status}', '${t.tipo}',
          ${sql(t.projetoExterno)}, ${t.data ? `date '${t.data}'` : 'null'});`);
}

partes.push(`
end $$;

-- Conferencia contra o medido na origem.
do $$
declare
  n_reun integer;
  n_ativ integer;
  n_proj integer;
  n_titulo_velho integer;
begin
  select count(*) into n_reun from public.carbon_reunioes
   where projeto_id is null and teams_evento_id is null;

  select count(*) into n_ativ from public.carbon_atividades;
  select count(distinct projeto_externo) into n_proj from public.carbon_atividades
   where projeto_externo is not null;

  -- O titulo antigo nao existe no Notion: se sobrou, a carga velha resistiu.
  select count(*) into n_titulo_velho from public.carbon_reunioes
   where titulo = 'Weekly Apsis Carbon';

  raise notice 'reunioes de backoffice: %, atividades: % em % trabalhos', n_reun, n_ativ, n_proj;

  if n_reun <> ${reunioes.length} then
    raise exception 'esperado ${reunioes.length} reunioes de backoffice, encontrado %', n_reun;
  end if;
  if n_ativ <> ${tarefas.length} then
    raise exception 'esperado ${tarefas.length} atividades, encontrado %', n_ativ;
  end if;
  if n_titulo_velho > 0 then
    raise exception '% reunioes com o titulo antigo "Weekly Apsis Carbon"', n_titulo_velho;
  end if;
end $$;
`);

const sqlGerado = partes.join('\n');
// ANTES de escrever, nao depois: arquivo com nome de pessoa nao deve nem chegar
// ao disco, onde um `git add .` distraido o pega.
pseudo.conferirSaida(sqlGerado, SAIDA);

await writeFile(SAIDA, sqlGerado, 'utf8');

console.log(`gerado ${SAIDA}`);
console.log(`  reunioes de backoffice: ${reunioes.length} (puladas: ${reunPuladas.join(', ') || 'nenhuma'})`);
console.log(`  atividades: ${tarefas.length} ${JSON.stringify(porTipo)} (puladas: ${tarefaPuladas.join(', ') || 'nenhuma'})`);
console.log(`  trabalhos distintos: ${projetos.size}`);
console.log('  ' + pseudo.relatorio());

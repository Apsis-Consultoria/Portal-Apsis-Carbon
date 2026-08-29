// Gera o seed das atas a partir do corpo das paginas de reuniao do Notion.
//
// A ENTRADA JA VEM PSEUDONIMIZADA. A substituicao acontece no navegador, antes
// de qualquer coisa tocar o disco, justamente para que nome de pessoa nunca
// exista em arquivo versionado. Este script nao tem como "desanonimizar" nada:
// ele so le o que chegou.
//
//   node scripts/gerar-seed-atas.mjs

import { readFile, writeFile } from 'node:fs/promises';

const ENTRADA = 'docs/notion/dados/atas-pseudonimizadas.json';
const SAIDA = 'supabase/seeds/atas_reunioes.sql';

const dados = JSON.parse(await readFile(ENTRADA, 'utf8'));

if (!dados.pseudonimizado) {
  throw new Error('a entrada nao esta marcada como pseudonimizada; recusando gerar');
}

// Rede de seguranca: se sobrou e-mail, telefone ou CPF, nao gera nada.
const tudo = dados.atas.map((a) => a.texto).join(' ');
for (const [nome, re] of [
  ['e-mail', /[\w.+-]+@[\w-]+\.[\w.]+/],
  ['telefone', /\(\d{2}\)\s?\d{4,5}-?\d{4}/],
  ['CPF', /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/],
]) {
  if (re.test(tudo)) throw new Error(`a entrada ainda contem ${nome}; recusando gerar`);
}

function sql(v) {
  const t = String(v ?? '').trim();
  if (!t) return 'null';
  return "'" + t.replace(/'/g, "''") + "'";
}

/* O prefixo do id da reuniao tem de ser o MESMO usado nos seeds que carregaram
   as reunioes, senao a ata nao encontra a reuniao e o insert nao grava nada -
   em silencio, porque ele e um insert-select. */
const PREFIXO = { parakana: 'reuniao:parakana:', backoffice: 'reuniao:backoffice:' };

const registros = dados.atas.filter((a) => a.texto && a.texto.trim().length > 20);

const porOrigem = registros.reduce((a, r) => ((a[r.origem] = (a[r.origem] ?? 0) + 1), a), {});
const marcadores = (tudo.match(/\[P\d+\]/g) ?? []).length;

const partes = [];

partes.push(`-- =============================================================================
-- Apsis Carbon - as atas de reuniao, do corpo das paginas do Notion
-- Arquivo: ${SAIDA}
-- Gerado por: scripts/gerar-seed-atas.mjs (nao edite a mao)
-- Fonte: ${ENTRADA}, lido ao vivo do Notion em 26/08/2026
-- =============================================================================
-- ONDE ELAS ESTAVAM. Nao na base de dados: no CORPO de cada pagina de reuniao.
-- Por isso todas as leituras anteriores passaram por elas sem ver - a extracao
-- lia as linhas da tabela (data, titulo) e nunca abria a pagina. Sao ${registros.length} atas,
-- ${porOrigem.parakana ?? 0} do Parakana e ${porOrigem.backoffice ?? 0} do backoffice, e carbon_atas tinha 7 linhas vazias.
--
-- LGPD, E ESTA E A PARTE QUE IMPORTA. As atas nomeiam pessoas, e 26 delas
-- nomeiam caciques em contexto de deliberacao interna da comunidade. Isso e dado
-- pessoal SENSIVEL (Art. 5 da LGPD, origem etnica), e o proprio levantamento ja
-- tinha decidido nao replicar o censo nominal pelo mesmo motivo
-- (docs/notion/11-comunidade-parakana.md). Carregar o texto cru desfaria essa
-- decisao pela porta dos fundos.
--
-- A saida foi PSEUDONIMIZAR ANTES DE GRAVAR. Cada nome proprio virou um marcador
-- estavel do tipo [P123], o mesmo marcador para o mesmo nome em todas as atas -
-- entao "esta pessoa aparece na ata de marco e na de agosto" continua
-- respondivel sem que o nome exista no banco. Foram ${marcadores} substituicoes.
--
-- A SUBSTITUICAO E DELIBERADAMENTE EXAGERADA. Detectar nome em texto livre erra
-- nos dois sentidos, e os dois erros nao custam igual: trocar demais deixa o
-- texto um pouco mais seco, trocar de menos vaza um nome. Por isso todo termo
-- capitalizado no meio da frase que nao esta no vocabulario do projeto foi
-- trocado - inclusive alguns que provavelmente nao sao pessoas. A lista completa
-- dos termos, com contexto, ficou em
-- C:\\Users\\FilipeOliveiraAPSISC\\notion-export\\revisao-termos-atas.csv, FORA
-- do repositorio, para conferencia. O que for devolvido para o vocabulario faz o
-- seed ser regerado.
--
-- pontos_atencao E barreiras FICAM NULAS. O template de pauta descrito no
-- levantamento pede as duas secoes, mas na pratica so 14 atas falam em ponto de
-- atencao e 2 em barreira. Distribuir o texto em colunas que a origem nao
-- preenche produziria campo com conteudo inventado; o texto inteiro vai para
-- \`conteudo\`, que e o que existe de fato. Vale como achado: o processo escrito
-- e o processo praticado divergem aqui.
--
-- \`aprovada\` fica false: o Notion nao registra aprovacao de ata, e marcar como
-- aprovada uma ata que ninguem aprovou a transformaria em evidencia de auditoria
-- falsa - exatamente o oposto do que a tela existe para fazer.
--
-- INSERT-SELECT contra carbon_reunioes: ata de reuniao que nao entrou (as linhas
-- em branco do Notion) simplesmente nao grava. O upsert e por reuniao_id porque
-- 7 atas ja existem, criadas vazias para pendurar as pendencias do BD - TD; elas
-- ganham conteudo aqui e as pendencias continuam presas nelas.
-- =============================================================================
`);

for (const a of registros) {
  const prefixo = PREFIXO[a.origem];
  partes.push(`insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:${a.origem}:${a.id}')::uuid, r.id, ${sql(a.texto)}
  from public.carbon_reunioes r
 where r.id = md5('${prefixo}${a.id}')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();`);
}

partes.push(`
-- Conferencia.
do $$
declare
  n_atas integer;
  n_com_texto integer;
  n_sem_marcador integer;
  n_pend integer;
begin
  select count(*) into n_atas from public.carbon_atas;
  select count(*) into n_com_texto from public.carbon_atas where conteudo is not null;
  select count(*) into n_pend from public.carbon_ata_pendencias;

  -- As 7 atas antigas nasceram vazias; se alguma ficou sem conteudo depois
  -- desta carga, a reuniao dela nao foi encontrada e o insert-select passou
  -- batido em silencio.
  select count(*) into n_sem_marcador from public.carbon_atas where conteudo is null;

  raise notice 'atas: % (com texto: %), pendencias preservadas: %', n_atas, n_com_texto, n_pend;

  if n_com_texto <> ${registros.length} then
    raise exception 'esperado ${registros.length} atas com texto, encontrado %', n_com_texto;
  end if;
  if n_pend <> 14 then
    raise exception 'as 14 pendencias deveriam continuar presas as atas, encontrado %', n_pend;
  end if;
  if n_sem_marcador > 0 then
    raise exception '% atas ficaram sem conteudo: a reuniao delas nao foi encontrada', n_sem_marcador;
  end if;
end $$;
`);

await writeFile(SAIDA, partes.join('\n\n'), 'utf8');

console.log(`gerado ${SAIDA}`);
console.log(`  atas: ${registros.length} ${JSON.stringify(porOrigem)}`);
console.log(`  marcadores de pessoa no texto: ${marcadores}`);

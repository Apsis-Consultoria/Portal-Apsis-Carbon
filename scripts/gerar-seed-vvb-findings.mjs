// Gera o seed dos findings da VVB a partir da extracao ao vivo do Notion.
//
// POR QUE UM GERADOR, e nao SQL escrito a mao: sao 95 linhas com texto longo,
// aspas simples, quebra de linha e acento. Escrever isso a mao garante um erro
// de escape em algum lugar, e o erro apareceria como texto truncado no meio de
// um finding de auditoria - o tipo de defeito que ninguem percebe lendo a tela.
//
//   node scripts/gerar-seed-vvb-findings.mjs

import { readFile, writeFile } from 'node:fs/promises';

const ENTRADA = 'docs/notion/dados/vvb-findings-bruto.json';
const SAIDA = 'supabase/seeds/findings_vvb_completo.sql';

const linhas = JSON.parse(await readFile(ENTRADA, 'utf8'));

/* ===== Traducao dos vocabularios do Notion ================================ */

const TIPO = { CAR: 'car', CL: 'cl', 'PD Comment': 'pd_comment' };

const DOCUMENTO = { PD: 'pdd', MR: 'monitoramento' };

/* O veredito da validadora. `New Finding` entra como aberto porque nasceu na
   segunda rodada e nao foi julgado ainda. */
const VEREDITO = { Closed: 'fechado', Open: 'aberto', 'New Finding': 'aberto' };

/* Quando a coluna da segunda rodada esta vazia, o finding e so da primeira e a
   origem nao registra veredito. Ai o estado sai do andamento interno, que e a
   melhor aproximacao disponivel - e o comentario do seed diz que e derivado. */
const VEREDITO_DERIVADO = {
  'Concluído': 'fechado',
  'Em andamento': 'em_andamento',
  'Revisão': 'respondido',
};

const ANDAMENTO = {
  'Concluído': 'concluido',
  'Em andamento': 'em_andamento',
  'Revisão': 'revisao',
};

/* Rotulos curtos da coluna Evidence que sao ESTADO. Qualquer outra coisa e
   texto e vai inteira para evidencia_nota. */
const EVIDENCIA_ESTADO = {
  'N/A': 'nao_aplicavel',
  OK: 'ok',
  Pendente: 'pendente',
  'Em andamento': 'pendente',
  'Revisão': 'pendente',
};

/* ===== Ajuda ============================================================== */

const limpo = (v) => String(v ?? '').trim();

/** Literal SQL. Vazio vira null, para nao gravar string vazia onde cabe nulo. */
function sql(v) {
  const t = limpo(v);
  if (!t) return 'null';
  return "'" + t.replace(/'/g, "''") + "'";
}

/** Id estavel a partir do id do bloco no Notion: recarregar nao duplica. */
const idDe = (notionId) => `md5('finding:vvb:${notionId}')::uuid`;

/**
 * Comentarios viram subitens quando sao checklist.
 *
 * O padrao observado na origem e uma linha por item, do tipo
 * `2.3.12 - Sem italico OK`. Uma linha que termina em OK, ou em Corrigido, esta
 * concluida. Comentario de uma linha so nao e checklist: fica no finding.
 */
function subitensDe(texto) {
  const linhas = limpo(texto).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length < 2) return [];
  return linhas.map((l, i) => ({
    descricao: l,
    concluido: /\b(ok|corrigido|conclu[ií]do|feito)\b\.?$/i.test(l),
    ordem: i,
  }));
}

/* ===== Montagem =========================================================== */

const usados = new Set();
const pulados = [];
const registros = [];

for (const l of linhas) {
  const descricao = limpo(l.descricao);
  const titulo = limpo(l.titulo);

  // descricao_en e NOT NULL com check de nao-vazio. Linha sem descricao e sem
  // titulo nao tem conteudo nenhum na origem: sao 3 linhas em branco do Notion,
  // criadas e nunca preenchidas. Entram na contagem de puladas, nao no banco.
  const texto = descricao || titulo;
  if (!texto) {
    pulados.push(l.n);
    continue;
  }

  if (usados.has(l.id)) {
    throw new Error(`id repetido na extracao: ${l.id} (linha ${l.n})`);
  }
  usados.add(l.id);

  const evidencia = limpo(l.evidencia);
  const estadoEvidencia = EVIDENCIA_ESTADO[evidencia] ?? 'pendente';
  // O rotulo curto ja virou estado; guardar o mesmo texto de novo seria ruido.
  const notaEvidencia = EVIDENCIA_ESTADO[evidencia] ? '' : evidencia;

  const veredito =
    VEREDITO[limpo(l.rodada2)] ?? VEREDITO_DERIVADO[limpo(l.status)] ?? 'aberto';

  registros.push({
    notionId: l.id,
    n: l.n,
    segundaRodada: limpo(l.rodada2) === 'New Finding',
    tipo: TIPO[limpo(l.tipo)] ?? null,
    documento: DOCUMENTO[limpo(l.documento)] ?? 'outro',
    identificador: limpo(l.item),
    capitulo: titulo,
    descricao: texto,
    acaoExigida: limpo(l.acao_exigida),
    plano: limpo(l.acao_realizar),
    veredito,
    andamento: ANDAMENTO[limpo(l.status)] ?? null,
    estadoEvidencia,
    notaEvidencia,
    subitens: subitensDe(l.comentarios),
    // Comentario de uma linha nao vira subitem: fica como resposta do finding.
    comentarioSolto: subitensDe(l.comentarios).length ? '' : limpo(l.comentarios),
  });
}

const naRodada2 = registros.filter((r) => r.segundaRodada).length;
const naRodada1 = registros.length - naRodada2;
const totalSubitens = registros.reduce((s, r) => s + r.subitens.length, 0);
const porTipo = registros.reduce((a, r) => {
  const k = r.tipo ?? '(sem tipo)';
  a[k] = (a[k] ?? 0) + 1;
  return a;
}, {});

/* ===== Escrita do SQL ===================================================== */

const partes = [];

partes.push(`-- =============================================================================
-- Apsis Carbon - os 95 findings da base VVB Findings do Notion
-- Arquivo: ${SAIDA}
-- Gerado por: scripts/gerar-seed-vvb-findings.mjs (nao edite a mao)
-- Fonte: ${ENTRADA}, lido ao vivo do Notion em 26/08/2026
-- =============================================================================
-- O QUE ISTO CONSERTA. Ate hoje o banco tinha 12 findings da VVB. A base do
-- Notion tem 95, e o rodape dela diz COUNT 95. A primeira leitura pegou so o
-- que a pagina mostra sem rolar, e ninguem conferiu o contador contra o numero
-- de linhas lidas - a mesma armadilha que ja tinha acontecido com as reunioes.
-- Faltavam 83 dos 95, ou seja 87% da base que o levantamento chama de "o fluxo
-- que justifica o sistema", porque e nela que o projeto trava ou avanca para
-- emissao de credito.
--
-- SUBSTITUICAO, e nao acrescimo. Os 12 antigos foram carregados de outra leitura
-- e com id proprio; acrescentar os 95 por cima criaria 12 duplicatas. Por isso o
-- seed apaga os findings das rodadas VVB antes de inserir. E seguro: os 12 nao
-- tem subitem nenhum pendurado (conferido), e o unico filho de carbon_findings e
-- carbon_finding_subitens, com ON DELETE CASCADE. Os findings da Verra e da
-- BeZero nao sao tocados.
--
-- ${pulados.length} LINHAS FICARAM DE FORA: n ${pulados.join(', ')}. Sao linhas em branco no
-- Notion, com o tipo marcado e nenhum outro campo preenchido - nem titulo, nem
-- descricao, nem acao. Nao ha o que carregar, e descricao_en e NOT NULL com
-- check de nao-vazio justamente para impedir finding fantasma na tela.
--
-- DUAS RODADAS. ${naRodada2} linhas marcadas "New Finding" na coluna 2nd Round Findings
-- entram na rodada 2; as outras ${naRodada1} na rodada 1.
--
-- Ids derivados do id do bloco no Notion, entao reaplicar nao duplica.
--
-- LGPD: conteudo conferido antes da carga - zero e-mail, zero CPF, zero
-- telefone, nenhuma pessoa nomeada. O texto trata de secoes de documento e de
-- exigencias tecnicas do padrao VCS/CCB.
-- =============================================================================

do $$
declare
  v_projeto  uuid;
  v_rodada1  uuid;
  v_rodada2  uuid;
begin

  select id into v_projeto from public.carbon_projetos where nome = 'Awaete REDD+' limit 1;
  if v_projeto is null then
    raise exception 'projeto "Awaete REDD+" nao encontrado; rode antes projeto_awaete.sql';
  end if;

  -- As rodadas ja existem. Pegar por (projeto, origem, numero) em vez de fixar o
  -- uuid mantem o seed valido se a base for recriada do zero.
  select id into v_rodada1 from public.carbon_auditoria_rodadas
   where projeto_id = v_projeto and origem = 'vvb' and numero = 1;
  select id into v_rodada2 from public.carbon_auditoria_rodadas
   where projeto_id = v_projeto and origem = 'vvb' and numero = 2;

  if v_rodada1 is null or v_rodada2 is null then
    raise exception 'rodadas 1 e 2 da VVB nao encontradas para o projeto';
  end if;

  -- Limpa a carga anterior das duas rodadas. Os subitens caem por cascade.
  delete from public.carbon_findings where rodada_id in (v_rodada1, v_rodada2);
`);

for (const r of registros) {
  const rodada = r.segundaRodada ? 'v_rodada2' : 'v_rodada1';
  const resposta = r.comentarioSolto ? sql(r.comentarioSolto) : 'null';

  partes.push(`
  -- n${r.n} | ${r.tipo ?? 'sem tipo'} | ${r.documento} | ${r.identificador || 'sem item'}
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (${idDe(r.notionId)}, ${rodada}, ${r.tipo ? `'${r.tipo}'` : 'null'},
     ${sql(r.identificador)}, ${r.n}, '${r.documento}', ${sql(r.capitulo)},
     ${sql(r.descricao)}, ${sql(r.acaoExigida)}, ${sql(r.plano)}, ${resposta},
     '${r.veredito}', ${r.andamento ? `'${r.andamento}'` : 'null'},
     '${r.estadoEvidencia}', ${sql(r.notaEvidencia)});`);

  for (const s of r.subitens) {
    partes.push(`  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (${idDe(r.notionId)}, ${sql(s.descricao)}, ${s.concluido}, ${s.ordem});`);
  }
}

partes.push(`
end $$;

-- Conferencia. Falha alto se a carga sair diferente do medido na origem, em vez
-- de deixar um "ok" que esconde carga parcial.
do $$
declare
  n_total integer;
  n_r1 integer;
  n_r2 integer;
  n_sub integer;
begin
  select count(*) into n_total
    from public.carbon_findings f
    join public.carbon_auditoria_rodadas r on r.id = f.rodada_id
   where r.origem = 'vvb';

  select count(*) into n_r1
    from public.carbon_findings f
    join public.carbon_auditoria_rodadas r on r.id = f.rodada_id
   where r.origem = 'vvb' and r.numero = 1;

  select count(*) into n_r2
    from public.carbon_findings f
    join public.carbon_auditoria_rodadas r on r.id = f.rodada_id
   where r.origem = 'vvb' and r.numero = 2;

  select count(*) into n_sub
    from public.carbon_finding_subitens s
    join public.carbon_findings f on f.id = s.finding_id
    join public.carbon_auditoria_rodadas r on r.id = f.rodada_id
   where r.origem = 'vvb';

  raise notice 'findings VVB: % (rodada 1: %, rodada 2: %), subitens: %',
    n_total, n_r1, n_r2, n_sub;

  if n_total <> ${registros.length} then
    raise exception 'esperado ${registros.length} findings VVB, encontrado %', n_total;
  end if;
  if n_r2 <> ${naRodada2} then
    raise exception 'esperado ${naRodada2} findings na rodada 2, encontrado %', n_r2;
  end if;
  if n_sub <> ${totalSubitens} then
    raise exception 'esperado ${totalSubitens} subitens, encontrado %', n_sub;
  end if;
end $$;
`);

await writeFile(SAIDA, partes.join('\n'), 'utf8');

console.log(`gerado ${SAIDA}`);
console.log(`  findings: ${registros.length} (rodada 1: ${naRodada1}, rodada 2: ${naRodada2})`);
console.log(`  por tipo: ${JSON.stringify(porTipo)}`);
console.log(`  subitens: ${totalSubitens}`);
console.log(`  puladas (linha em branco no Notion): ${pulados.length ? pulados.join(', ') : 'nenhuma'}`);

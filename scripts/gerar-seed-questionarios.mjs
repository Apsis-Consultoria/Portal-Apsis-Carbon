// Gera o seed dos modelos de questionario a partir de scripts/questionarios/definicoes.mjs.
//
//   node scripts/gerar-seed-questionarios.mjs

import { writeFile } from 'node:fs/promises';
import { QUESTIONARIOS } from './questionarios/definicoes.mjs';

const SAIDA = 'supabase/seeds/questionario_modelos.sql';

/* Guarda contra reintroduzir campo de dado pessoal na definicao. O gatilho do
   banco ja recusa na hora de gravar RESPOSTA, mas errar aqui so apareceria em
   campo, com o formulario aberto na frente de alguem. Melhor falhar no gerador. */
const PROIBIDO = /(^|_)(nome|contato|telefone|email|cpf|rg|assinatura)($|_)/;

function sql(v) {
  const t = String(v ?? '').trim();
  if (!t) return 'null';
  return "'" + t.replace(/'/g, "''") + "'";
}

let totalPerguntas = 0;
const resumo = [];

for (const q of QUESTIONARIOS) {
  const chaves = new Set();
  let n = 0;

  for (const secao of q.definicao.secoes) {
    for (const p of secao.perguntas) {
      n += 1;
      if (chaves.has(p.chave)) {
        throw new Error(`${q.chave}: chave de pergunta repetida "${p.chave}"`);
      }
      chaves.add(p.chave);

      if (PROIBIDO.test(p.chave)) {
        throw new Error(
          `${q.chave}: a pergunta "${p.chave}" guarda dado pessoal. Use funcao em vez de nome.`,
        );
      }
      if (['escolha', 'multipla'].includes(p.tipo) && !(p.opcoes ?? []).length) {
        throw new Error(`${q.chave}: pergunta "${p.chave}" e de escolha e nao tem opcoes`);
      }
    }
  }

  totalPerguntas += n;
  resumo.push({ chave: q.chave, secoes: q.definicao.secoes.length, perguntas: n });
}

const partes = [];

partes.push(`-- =============================================================================
-- Apsis Carbon - os quatro questionarios de campo
-- Arquivo: ${SAIDA}
-- Gerado por: scripts/gerar-seed-questionarios.mjs (nao edite a mao)
-- Fonte: scripts/questionarios/definicoes.mjs
-- =============================================================================
-- ${QUESTIONARIOS.length} modelos, ${totalPerguntas} perguntas no total:
${resumo.map((r) => `--   ${r.chave.padEnd(16)} ${String(r.perguntas).padStart(3)} perguntas em ${r.secoes} secoes`).join('\n')}
--
-- POR QUE A DEFINICAO VEM DE UM ARQUIVO .mjs, e nao esta escrita aqui: o SQL
-- gerado tem jsonb de varios milhares de caracteres por linha, e revisar
-- mudanca de formulario num diff desses e impossivel. No .mjs o diff mostra a
-- pergunta que mudou.
--
-- REAPLICAR e seguro: o conflito por (chave) atualiza a definicao e sobe a
-- versao. Respostas ja gravadas guardam com qual versao foram preenchidas, em
-- carbon_questionarios.modelo_versao, entao pergunta removida amanha nao faz a
-- resposta de hoje parecer incompleta.
--
-- LGPD: nenhum dos quatro tem campo de nome, contato ou assinatura, embora os
-- originais peçam. Quem preenche sai do login; o entrevistado entra pela funcao,
-- que e coluna da tabela de resposta. O gerador se recusa a rodar se alguem
-- reintroduzir uma chave proibida.
-- =============================================================================
`);

for (const q of QUESTIONARIOS) {
  const definicao = JSON.stringify(q.definicao).replace(/'/g, "''");
  partes.push(`
-- ${q.nome}
insert into public.carbon_questionario_modelos (chave, nome, descricao, origem, versao, definicao)
values (${sql(q.chave)}, ${sql(q.nome)}, ${sql(q.descricao)}, ${sql(q.origem)}, 1, '${definicao}'::jsonb)
on conflict (chave) do update set
  nome      = excluded.nome,
  descricao = excluded.descricao,
  origem    = excluded.origem,
  definicao = excluded.definicao,
  -- Sobe a versao SO quando a definicao mudou de fato: reaplicar um seed igual
  -- nao pode inflar a versao e fazer parecer que o formulario foi revisado.
  versao    = case
                when public.carbon_questionario_modelos.definicao is distinct from excluded.definicao
                then public.carbon_questionario_modelos.versao + 1
                else public.carbon_questionario_modelos.versao
              end;`);
}

partes.push(`
do $$
declare
  n_modelos integer;
  n_perguntas integer;
begin
  select count(*) into n_modelos from public.carbon_questionario_modelos;

  select sum(jsonb_array_length(s -> 'perguntas')) into n_perguntas
    from public.carbon_questionario_modelos m,
         jsonb_array_elements(m.definicao -> 'secoes') s;

  raise notice 'modelos: %, perguntas: %', n_modelos, n_perguntas;

  if n_modelos <> ${QUESTIONARIOS.length} then
    raise exception 'esperado ${QUESTIONARIOS.length} modelos, encontrado %', n_modelos;
  end if;
  if n_perguntas <> ${totalPerguntas} then
    raise exception 'esperado ${totalPerguntas} perguntas, encontrado %', n_perguntas;
  end if;
end $$;
`);

await writeFile(SAIDA, partes.join('\n'), 'utf8');

console.log(`gerado ${SAIDA}`);
for (const r of resumo) {
  console.log(`  ${r.chave.padEnd(16)} ${String(r.perguntas).padStart(3)} perguntas em ${r.secoes} secoes`);
}
console.log(`  total: ${totalPerguntas} perguntas`);

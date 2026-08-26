-- =============================================================================
-- Apsis Carbon - remove as reunioes semanais duplicadas
-- Arquivo: supabase/seeds/reunioes_deduplicar.sql
-- =============================================================================
-- O DEFEITO. Duas cargas inseriram as mesmas datas com id calculado de formas
-- diferentes, entao o `on conflict (id)` de reunioes_complemento.sql nao viu que
-- a linha ja existia e criou uma segunda. Sobrou:
--
--   2025-06-02  3 linhas
--   2025-07-08  2 linhas
--   2026-04-06  2 linhas
--
-- Total: 4 linhas a mais. Conferido em 26/08/2026 comparando as datas do banco
-- contra docs/notion/dados/coleta-25-08.json: as 80 datas semanais unicas batem
-- EXATAMENTE com o Notion, nenhuma faltando e nenhuma inventada. O unico desvio
-- de fidelidade e a repeticao.
--
-- POR QUE ISSO IMPORTA E NAO E COSMETICO: a tela de Reunioes conta cadencia. Tres
-- linhas em 02/06/2025 viram tres semanais na mesma semana, e qualquer leitura de
-- frequencia (inclusive a que sustenta evidencia de auditoria) fica errada.
--
-- QUAL LINHA FICA. A que tem o id canonico md5('reuniao:apsis:' || data), que e a
-- formula de reunioes_complemento.sql. Ela e reprodutivel a partir da data, entao
-- reaplicar as cargas nao gera duplicata de novo.
--
-- SEGURANCA DO DELETE, verificada antes de escrever este arquivo:
--   - a unica FK que aponta para carbon_reunioes e carbon_atas.reuniao_id, com
--     ON DELETE CASCADE, e carbon_atas esta vazia. Nada pendura nessas linhas.
--   - o `exists` garante que so morre linha que TEM gemea canonica. Data que
--     existe uma vez so, mesmo com id fora da formula, sobrevive.
--   - o filtro de titulo e projeto_id mantem o alcance nas semanais do
--     backoffice, que sao as unicas afetadas.
--
-- NAO MEXE na reuniao de titulo 'teste' de 26/08/2026: ela tem evento no Teams, e
-- apagar a linha do banco NAO cancela o evento no calendario de quem foi
-- convidado. O caminho certo e o botao "Cancelar no Teams" na propria tela, que
-- avisa os convidados, e so depois remover o registro.
-- =============================================================================

begin;

-- Antes: quantas linhas existem nas datas afetadas.
do $$
declare
  antes integer;
begin
  select count(*) into antes
  from public.carbon_reunioes
  where titulo = 'Weekly Apsis Carbon' and projeto_id is null;
  raise notice 'semanais de backoffice antes: %', antes;
end $$;

delete from public.carbon_reunioes r
where r.titulo = 'Weekly Apsis Carbon'
  and r.projeto_id is null
  and r.id <> md5('reuniao:apsis:' || r.data::text)::uuid
  and exists (
    select 1
    from public.carbon_reunioes c
    where c.data = r.data
      and c.titulo = r.titulo
      and c.projeto_id is null
      and c.id = md5('reuniao:apsis:' || c.data::text)::uuid
  );

-- Depois: falha a transacao inteira se ainda sobrar duplicata. Erro e melhor que
-- um "ok" que esconde meia limpeza.
do $$
declare
  restantes integer;
  depois integer;
begin
  select count(*) into restantes
  from (
    select data
    from public.carbon_reunioes
    where titulo = 'Weekly Apsis Carbon' and projeto_id is null
    group by data
    having count(*) > 1
  ) x;

  select count(*) into depois
  from public.carbon_reunioes
  where titulo = 'Weekly Apsis Carbon' and projeto_id is null;

  raise notice 'semanais de backoffice depois: %', depois;

  if restantes > 0 then
    raise exception 'ainda restam % datas duplicadas; nada foi gravado', restantes;
  end if;

  if depois <> 80 then
    raise exception 'esperado 80 semanais unicas (o que o Notion tem), encontrado %', depois;
  end if;
end $$;

commit;

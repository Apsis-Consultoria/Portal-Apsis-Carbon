-- =============================================================================
-- Atividades de campo do programa Parakana, por Monitoring Report.
--
-- DE ONDE VEM: "Atividade Parakana.xlsx", ~490 atividades nas abas MR - 1,
-- MR -2, Set - Dez 25 e MR 3 - 2026. E o diario de campo que alimenta o
-- Monitoring Report: reuniao, oficio, capacitacao, entrega.
--
-- POR QUE UMA TABELA NOVA e nao carbon_atividades: aquela e o quadro de tarefas
-- interno da equipe (afazeres, horas); esta e o REGISTRO HISTORICO de atividade
-- executada em campo, com evidencia e status de aceitacao, que vira anexo do MR.
-- Misturar as duas faria o quadro de tarefas crescer 500 linhas de historico e o
-- MR herdar tarefa interna.
--
-- SEM DADO PESSOAL: a coluna "Responsavel" da planilha (nome de pessoa) NAO e
-- importada, nem os comentarios livres. Alem do gatilho, a importacao aplica o
-- vocabulario de pseudonimizacao ja usado nas atas.
-- =============================================================================

begin;

create table if not exists public.carbon_atividades_campo (
  id            uuid primary key default gen_random_uuid(),
  projeto_id    uuid not null references public.carbon_projetos (id) on delete cascade,
  -- Nulo quando a atividade e do programa inteiro (MR-2 em diante nao separa).
  grupo_id      uuid references public.carbon_grupos_comunitarios (id) on delete set null,
  -- A qual Monitoring Report a atividade pertence: 'MR-1', 'MR-2', 'MR-3'.
  relatorio     text not null check (relatorio ~ '^MR-[0-9]+$'),
  inicio        date,
  termino       date,
  atividade     text not null check (btrim(atividade) <> ''),
  instituicao   text,
  tipo          text,
  linha_estrategica text,
  evidencia     text,
  valor         numeric(14,2),
  status        text,
  observacoes   text,
  origem_aba    text,
  origem_linha  integer,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint carbon_ativ_campo_origem_uq unique (relatorio, origem_aba, origem_linha)
);

comment on table public.carbon_atividades_campo is
  'Diario de atividades de campo por Monitoring Report. NAO guarda o responsavel '
  'nominal: a planilha de origem tem essa coluna e ela nao entra (LGPD).';

create index if not exists carbon_ativ_campo_relatorio_idx
  on public.carbon_atividades_campo (relatorio, inicio);

/* Mesma guarda das outras tabelas do dominio: e-mail, CPF e dado bancario
   recusados em qualquer texto livre. */
create or replace function public.carbon_ativ_campo_sem_dado_pessoal()
returns trigger
language plpgsql
as $$
declare
  campo text;
  valor text;
begin
  for campo, valor in
    select * from (values
      ('atividade', new.atividade),
      ('instituicao', new.instituicao),
      ('evidencia', new.evidencia),
      ('observacoes', new.observacoes)
    ) as t(c, v)
    where v is not null
  loop
    if valor ~ '[[:alnum:]._%%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}' then
      raise exception 'o campo "%" contem endereco de e-mail', campo;
    end if;
    if valor ~ '\m\d{3}\.\d{3}\.\d{3}-\d{2}\M' then
      raise exception 'o campo "%" contem CPF', campo;
    end if;
  end loop;

  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists carbon_ativ_campo_sem_dado_pessoal_trg
  on public.carbon_atividades_campo;

create trigger carbon_ativ_campo_sem_dado_pessoal_trg
  before insert or update on public.carbon_atividades_campo
  for each row execute function public.carbon_ativ_campo_sem_dado_pessoal();

revoke all on function public.carbon_ativ_campo_sem_dado_pessoal() from public;

alter table public.carbon_atividades_campo enable row level security;

/* Ver a nota em 20260901180000: RLS sem revoke deixa o privilegio de tabela
   concedido para a chave publica. Corrigido no banco por
   20260902220000_prestacao_fecha_anon.sql. */
revoke all on table public.carbon_atividades_campo from anon, authenticated;

commit;

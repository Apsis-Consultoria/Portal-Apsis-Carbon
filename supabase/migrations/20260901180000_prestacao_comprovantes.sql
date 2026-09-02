-- =============================================================================
-- Comprovantes bancarios da prestacao de contas.
--
-- DE ONDE VEM: a aba "Base de dados" do Grupo de Cima, 1377 linhas digitadas a
-- mao pela equipe - uma por PIX ou recibo. E o outro lado da conciliacao: o que
-- o extrato PROVA, contra o que a prestacao DECLARA.
--
-- A PARTIR DE AGORA A EQUIPE ALIMENTA O SISTEMA, nao a planilha. Por isso a
-- tabela aceita escrita pela tela, e nao so importacao.
--
-- SEM NOME E SEM CPF, deliberadamente. A aba de origem tem "Nome do Recebedor" e
-- "CPF do Recebedor": nao entram. O que identifica o comprovante aqui e o par
-- (mes, ordem no mes), que e como a propria equipe numera os PDFs no arquivo
-- fisico. Quem precisar do nome abre o comprovante original pelo numero de
-- ordem - o dado pessoal fica onde sempre esteve, fora do portal.
-- Instituicao (banco) e CNPJ do pagador sao pessoa juridica, nao dado pessoal.
-- =============================================================================

begin;

create table if not exists public.carbon_comprovantes (
  id            uuid primary key default gen_random_uuid(),
  ciclo_id      uuid not null,
  grupo_id      uuid not null,
  aldeia_id     uuid,
  -- A ordem do comprovante DENTRO do mes, como a equipe numera o arquivo fisico.
  ordem_no_mes  integer,
  data          date not null,
  valor         numeric(14,2) not null check (valor > 0),
  instituicao_recebedor text,
  instituicao_pagador   text,
  observacoes   text,
  origem_aba    text,
  origem_linha  integer,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  /* Mesma amarra dos lancamentos: o comprovante so entra se o ciclo e a aldeia
     forem do MESMO grupo. E o que impede misturar as prestacoes dos dois
     grupos, que e o unico erro de negocio que este dominio nao pode cometer. */
  foreign key (ciclo_id, grupo_id)
    references public.carbon_ciclos_prestacao (id, grupo_id) on delete cascade,
  foreign key (aldeia_id, grupo_id)
    references public.carbon_aldeias (id, grupo_id) on delete restrict,
  -- Reimportacao idempotente por posicao na planilha de origem.
  constraint carbon_comprovantes_origem_uq unique (ciclo_id, origem_aba, origem_linha)
);

comment on table public.carbon_comprovantes is
  'Um PIX ou recibo do extrato. NAO guarda nome nem CPF do recebedor: quem '
  'precisar identifica o documento fisico pelo par (mes, ordem_no_mes). '
  'Instituicao e banco; pagador e pessoa juridica.';

create index if not exists carbon_comprovantes_ciclo_idx
  on public.carbon_comprovantes (ciclo_id, data);

/* A MESMA guarda de dado pessoal dos lancamentos, na mesma funcao: e-mail, CPF
   e dado bancario de pessoa recusados em texto livre. A funcao ja existe
   (20260901120000); aqui so o gatilho novo. Os campos de instituicao tambem
   passam por ela: "Banco X" e legitimo, "ag 1234 c/c 5678" nao. */
create or replace function public.carbon_comprovantes_sem_dado_pessoal()
returns trigger
language plpgsql
as $$
declare
  campo text;
  valor text;
begin
  for campo, valor in
    select * from (values
      ('instituicao_recebedor', new.instituicao_recebedor),
      ('instituicao_pagador', new.instituicao_pagador),
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
    if valor ~* '\m(ag[eê]ncia|c/c|conta corrente)\M' then
      raise exception 'o campo "%" parece conter dado bancario de pessoa', campo;
    end if;
  end loop;

  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists carbon_comprovantes_sem_dado_pessoal_trg
  on public.carbon_comprovantes;

create trigger carbon_comprovantes_sem_dado_pessoal_trg
  before insert or update on public.carbon_comprovantes
  for each row execute function public.carbon_comprovantes_sem_dado_pessoal();

revoke all on function public.carbon_comprovantes_sem_dado_pessoal() from public;

alter table public.carbon_comprovantes enable row level security;

/* RLS e a segunda camada, nao a primeira: o Supabase concede privilegio a anon e
   authenticated por default privileges do schema public, e e o revoke que fecha.
   Faltava aqui, e a correcao no banco de producao esta em
   20260902220000_prestacao_fecha_anon.sql - esta migration ja tinha rodado. */
revoke all on table public.carbon_comprovantes from anon, authenticated;

commit;

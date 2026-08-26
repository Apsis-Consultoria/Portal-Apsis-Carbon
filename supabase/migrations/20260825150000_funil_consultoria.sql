-- =============================================================================
-- Apsis Carbon - o funil comercial da Consultoria
-- Arquivo: 20260825150000_funil_consultoria.sql
-- =============================================================================
-- O QUE FALTAVA. A pagina `Consultoria` do Notion tem tres blocos, e nenhum
-- deles tinha destino no banco: os registros existiam e nao havia onde
-- carrega-los. Sao 7 propostas e 10 consultorias, lidos ao vivo em 25/08/2026.
--
-- DUAS TABELAS, E NAO UMA COM COLUNA DE ESTAGIO, porque a origem tem duas bases
-- com colunas diferentes e ciclos de vida diferentes:
--
--   Propostas (APs)     Codigo AP, Status, Cliente, Contato, Grupo de Servico,
--                       Servico, Metodologia, Criado em, AP Ganha, AP Perdida
--   Consultorias (APs)  Projeto, Status, Responsavel, Prazo
--
-- Uma proposta que e ganha VIRA uma consultoria, e as duas coexistem: a proposta
-- guarda como o trabalho foi vendido, a consultoria guarda como ele anda. Fundir
-- as duas obrigaria metade das colunas a ficar nula em metade das linhas.
--
-- O PREFIXO `AP` SERVE AOS DOIS ESTAGIOS na pratica da equipe, e isso so nao
-- confunde porque vivem em bases separadas. Manter separado aqui preserva essa
-- leitura.
--
-- OPORTUNIDADES (OPs) NAO GANHOU TABELA. O primeiro estagio do funil esta VAZIO
-- no Notion: zero registros, e a pagina inteira nao e editada ha um ano.
-- Construir a tabela agora seria criar estrutura para um processo que talvez
-- nao exista mais. Quando alguem confirmar que o estagio e usado, a tabela sai
-- de uma migration curta - o custo de esperar e baixo e o de adivinhar nao e.
--
-- Idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. carbon_propostas
-- -----------------------------------------------------------------------------

create table if not exists public.carbon_propostas (
  id             uuid primary key default gen_random_uuid(),

  -- ANULAVEL, e isto vem do dado real: tres das sete propostas nao tem codigo, e
  -- duas usam `AP-000XX/25` com o XX literal, porque o numero ainda nao existia
  -- quando a proposta foi criada. Exigir codigo obrigaria a inventar um.
  codigo         text,

  titulo         text,
  cliente        text,

  status         text not null default 'elaboracao'
                   check (status in ('elaboracao', 'ganha', 'perdida', 'cancelada')),

  -- TEXTO LIVRE, nao enum. So dois valores aparecem hoje (Carbono e
  -- Descarbonizacao) e a APSIS tem mais linhas de servico do que isso. Um enum
  -- montado sobre duas observacoes recusaria a terceira proposta que chegasse.
  grupo_servico  text,
  servico        text,
  metodologia    text,

  data_criacao   timestamptz,
  data_ganha     date,
  data_perdida   date,

  observacoes    text,
  ativo          boolean not null default true,
  criado_por     uuid references public.carbon_usuarios (id),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  -- Ganha e perdida sao exclusivas. Sem isto, uma proposta poderia carregar as
  -- duas datas e nenhum relatorio de taxa de conversao faria sentido.
  constraint carbon_propostas_desfecho_chk check (
    not (data_ganha is not null and data_perdida is not null)
  )
);

comment on table public.carbon_propostas is
  'Propostas comerciais (APs) da Consultoria, base `Propostas (APs)` do Notion. Uma proposta ganha vira uma linha em carbon_consultorias, e as duas convivem: aqui fica como o trabalho foi vendido, la fica como ele anda.';
comment on column public.carbon_propostas.codigo is
  'Codigo da AP, no formato AP-00000/AA. ANULAVEL de proposito: no Notion tres das sete propostas nao tem codigo e duas usam AP-000XX/25 com o XX literal, porque o numero e atribuido depois. Exigir codigo faria alguem inventar um.';
comment on column public.carbon_propostas.grupo_servico is
  'Linha de servico (Carbono, Descarbonizacao). Texto livre e nao enum: so dois valores aparecem no Notion hoje e a APSIS tem mais linhas de servico, entao um enum montado sobre duas observacoes recusaria a proxima.';

create index if not exists carbon_propostas_status_idx
  on public.carbon_propostas (status, data_criacao desc);

create unique index if not exists carbon_propostas_codigo_uidx
  on public.carbon_propostas (lower(btrim(codigo)))
  where codigo is not null and btrim(codigo) <> '' and codigo not ilike '%xx%';

-- O indice acima ignora de proposito os codigos com XX: `AP-000XX/25` aparece
-- DUAS vezes no Notion, e sao propostas diferentes com o mesmo placeholder.
-- Tratar placeholder como codigo unico recusaria a carga do dado que existe.

alter table public.carbon_propostas enable row level security;
revoke all on table public.carbon_propostas from anon, authenticated;
grant all on table public.carbon_propostas to service_role;

-- -----------------------------------------------------------------------------
-- 2. carbon_consultorias
-- -----------------------------------------------------------------------------

create table if not exists public.carbon_consultorias (
  id             uuid primary key default gen_random_uuid(),

  -- ON DELETE SET NULL: apagar a proposta nao pode destruir o registro do
  -- trabalho que esta em execucao por causa dela.
  proposta_id    uuid references public.carbon_propostas (id) on delete set null,

  nome           text not null,
  cliente        text,

  status         text not null default 'nao_iniciada'
                   check (status in ('nao_iniciada', 'em_andamento', 'concluida', 'cancelada')),

  prazo          date,
  observacoes    text,
  ativo          boolean not null default true,
  criado_por     uuid references public.carbon_usuarios (id),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  constraint carbon_consultorias_nome_nao_vazio_chk check (length(btrim(nome)) > 0)
);

comment on table public.carbon_consultorias is
  'Consultorias contratadas, base `Consultorias (APs)` do Notion. A convencao de nome e `AP - <numero>-<ano> [CLIENTE]` e ela e inconsistente na pratica: aparece `AP x -25` quando o numero ainda nao existe e a posicao do hifen varia. A coluna aceita o texto como a equipe escreve, de proposito - uma tela que exigisse formato rigido brigaria com o habito e o dado pararia de ser lancado.';
comment on column public.carbon_consultorias.proposta_id is
  'Proposta que originou a consultoria, quando conhecida. Anulavel porque o Notion nao liga as duas bases: a ligacao existe na cabeca de quem trabalha, e sera preenchida quando alguem revisar.';

create index if not exists carbon_consultorias_status_idx
  on public.carbon_consultorias (status, prazo);

alter table public.carbon_consultorias enable row level security;
revoke all on table public.carbon_consultorias from anon, authenticated;
grant all on table public.carbon_consultorias to service_role;

-- -----------------------------------------------------------------------------
-- 3. Gatilhos de atualizado_em
-- -----------------------------------------------------------------------------

create or replace function public.carbon_funil_set_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- `from public` incluido: o CREATE FUNCTION concede EXECUTE ao pseudo-papel
-- PUBLIC, e revogar so de anon e authenticated nao remove essa concessao. Ver
-- 20260825130000_fechar_execute_publico.sql, escrita depois de doze funcoes
-- terem ficado abertas por meses exatamente por essa omissao.
revoke all on function public.carbon_funil_set_atualizado_em() from public, anon, authenticated;
grant execute on function public.carbon_funil_set_atualizado_em() to service_role;

drop trigger if exists carbon_propostas_atualizado_em on public.carbon_propostas;
create trigger carbon_propostas_atualizado_em
  before update on public.carbon_propostas
  for each row execute function public.carbon_funil_set_atualizado_em();

drop trigger if exists carbon_consultorias_atualizado_em on public.carbon_consultorias;
create trigger carbon_consultorias_atualizado_em
  before update on public.carbon_consultorias
  for each row execute function public.carbon_funil_set_atualizado_em();

notify pgrst, 'reload schema';

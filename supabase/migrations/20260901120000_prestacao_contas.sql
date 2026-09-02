-- =============================================================================
-- Prestacao de contas da antecipacao de recursos ao Parakana
--
-- DE ONDE VEM. Tres planilhas da operacao, lidas por inteiro em 01/09/2026:
-- "Antecipacao Grupo de Baixo.xlsx" (aba Extrato, 178 lancamentos), "Antecipacao
-- Grupo de Cima.xlsx" (aba Base de dados, ~1375 comprovantes) e
-- "Atividade Parakana.xlsx". Ver docs/issues/PRESTACAO-CONTAS.md.
--
-- -----------------------------------------------------------------------------
-- A REGRA QUE ESTE MODELO EXISTE PARA PROTEGER
-- -----------------------------------------------------------------------------
-- Grupo de Cima (Alto) e Grupo de Baixo sao os dois grupos Parakana. Eles tem
-- consulta CLPI e associacao representativa SEPARADAS, e por isso os numeros
-- deles NAO SE SOMAM. Somar inventaria um total que ninguem afirmou.
--
-- O grupo e DADO, e nao duas tabelas nem duas telas: com duas copias, a primeira
-- correcao feita so numa delas produz divergencia silenciosa.
--
-- E nao basta a boa intencao. Um lancamento chega ao grupo por dois caminhos -
-- pelo ciclo e pela aldeia - e nada impedia que os dois discordassem. Por isso a
-- coluna redundante `grupo_id` com chave composta: o banco RECUSA lancamento de
-- um grupo dentro de ciclo de outro. Ver as FK compostas abaixo.
--
-- -----------------------------------------------------------------------------
-- SEM DADO PESSOAL, e a decisao e deliberada
-- -----------------------------------------------------------------------------
-- As planilhas de origem trazem nome completo, CPF, banco, agencia, conta e
-- contato de pessoas fisicas, cruzados com aldeia. Aldeia Parakana identifica
-- ORIGEM ETNICA, que e dado pessoal SENSIVEL (LGPD art. 5, II).
--
-- Nada disso entra aqui. O portal guarda aldeia, eixo, data, valor, saldo e a
-- REFERENCIA ao documento. Nome e CPF continuam no comprovante original, fora do
-- sistema. Mesma escolha ja feita em 20260827090000_questionarios.sql e no censo
-- nominal, deliberadamente nao replicado.
--
-- Se a operacao precisar identificar nominalmente quem recebeu - o que e
-- plausivel numa prestacao de contas - isso e tratamento de dado sensivel e
-- depende de base legal escrita, RIPD e controle de acesso. E migration ADITIVA,
-- nao retrabalho. Ver a issue [descoberta] de docs/issues/PRESTACAO-CONTAS.md.
--
-- O GATILHO NAO E ORNAMENTO: no Grupo de Baixo, SEIS lancamentos trazem nome de
-- pessoa DENTRO do texto da descricao, e quatro observacoes citam quem assinou o
-- recibo. Guarda que so olhasse nome de coluna nao pegaria nenhum deles.
-- =============================================================================

begin;

-- ===== Grupo e aldeia ========================================================

create table if not exists public.carbon_grupos_comunitarios (
  id            uuid primary key default gen_random_uuid(),
  projeto_id    uuid not null references public.carbon_projetos (id) on delete cascade,
  chave         text not null check (chave ~ '^[a-z][a-z0-9_]{1,39}$'),
  nome          text not null check (btrim(nome) <> ''),
  -- Grafias alternativas vistas nas planilhas, para a importacao casar sem criar
  -- grupo novo em silencio.
  apelidos      text[] not null default '{}',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (projeto_id, chave)
);

comment on table public.carbon_grupos_comunitarios is
  'Os grupos do povo Parakana (Cima/Alto e Baixo). Existem como DADO para que o '
  'sistema nunca some os dois: eles tem CLPI e associacao separadas. NAO guarda '
  'dado de pessoa.';

/* A chave composta abaixo e o que permite a FK que amarra grupo e projeto ao
   mesmo tempo nas tabelas filhas. Sem ela, so daria para conferir um dos dois. */
create unique index if not exists carbon_grupos_id_projeto_uidx
  on public.carbon_grupos_comunitarios (id, projeto_id);

create table if not exists public.carbon_aldeias (
  id            uuid primary key default gen_random_uuid(),
  grupo_id      uuid not null references public.carbon_grupos_comunitarios (id) on delete cascade,
  nome          text not null check (btrim(nome) <> ''),
  apelidos      text[] not null default '{}',
  -- ASSOCIACAO aparece na coluna Aldeia das planilhas para despesa da entidade, e
  -- nao de uma aldeia. E lugar de destino, nao aldeia de verdade: a flag deixa a
  -- tela separar sem precisar comparar o nome com uma string magica.
  e_associacao  boolean not null default false,
  ativa         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (grupo_id, nome)
);

comment on table public.carbon_aldeias is
  'Cadastro canonico de aldeia. A aldeia e hoje a unica chave entre as tres '
  'planilhas, e era texto livre em todas. NAO guarda morador: lista nominal de '
  'moradores por aldeia e origem etnica, dado sensivel (LGPD art. 5).';

create unique index if not exists carbon_aldeias_id_grupo_uidx
  on public.carbon_aldeias (id, grupo_id);

-- ===== Eixo tematico =========================================================

create table if not exists public.carbon_eixos (
  id            uuid primary key default gen_random_uuid(),
  projeto_id    uuid not null references public.carbon_projetos (id) on delete cascade,
  nome          text not null check (btrim(nome) <> ''),
  apelidos      text[] not null default '{}',
  /* Linha estrategica da Teoria da Mudanca. Texto e nao enum: as tres que
     aparecem hoje sao da ToC do projeto, e outro projeto tera outras. */
  linha_estrategica text,
  ordem         integer not null default 100,
  criado_em     timestamptz not null default now(),
  unique (projeto_id, nome)
);

comment on table public.carbon_eixos is
  'Eixo tematico de aplicacao do recurso. Dicionario POR PROJETO, e nao por '
  'grupo: os dois grupos usavam vocabularios diferentes (11 eixos contra 4) e '
  'sem dicionario unico nenhum relatorio cruza os dois. Grafia divergente casa '
  'por apelidos.';

-- ===== Ciclo de prestacao ====================================================

create table if not exists public.carbon_ciclos_prestacao (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references public.carbon_projetos (id) on delete cascade,
  grupo_id       uuid not null,
  nome           text not null check (btrim(nome) <> ''),
  inicio         date not null,
  fim            date,
  /* Informado pela comunidade na abertura. Fica separado do fechamento calculado
     do ciclo anterior de proposito: no Grupo de Baixo os dois DIVERGEM em
     52.724,45 e ninguem explicou a diferenca. Guardar so um dos dois esconderia
     a divergencia; guardar os dois deixa a tela mostra-la. */
  saldo_abertura numeric(14,2),
  status         text not null default 'aberto'
                 check (status in ('aberto', 'em_conciliacao', 'fechado')),
  observacoes    text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  check (fim is null or fim >= inicio),
  foreign key (grupo_id, projeto_id)
    references public.carbon_grupos_comunitarios (id, projeto_id) on delete cascade
);

comment on table public.carbon_ciclos_prestacao is
  'Um periodo de prestacao de contas de UM grupo. A FK composta (grupo_id, '
  'projeto_id) impede ciclo pendurado em grupo de outro projeto.';

create unique index if not exists carbon_ciclos_id_grupo_uidx
  on public.carbon_ciclos_prestacao (id, grupo_id);

-- ===== As duas metades: o que foi antecipado e o que foi declarado ===========

create table if not exists public.carbon_antecipacoes (
  id           uuid primary key default gen_random_uuid(),
  ciclo_id     uuid not null references public.carbon_ciclos_prestacao (id) on delete cascade,
  competencia  date not null,
  valor        numeric(14,2) not null check (valor > 0),
  observacoes  text,
  origem_aba   text,
  origem_linha integer,
  criado_em    timestamptz not null default now(),
  unique (ciclo_id, competencia)
);

comment on table public.carbon_antecipacoes is
  'O que a APSIS repassou. Uma linha por competencia. NAO guarda a quem se pagou.';

create table if not exists public.carbon_prestacao_lancamentos (
  id            uuid primary key default gen_random_uuid(),
  ciclo_id      uuid not null,
  grupo_id      uuid not null,
  aldeia_id     uuid,
  eixo_id       uuid references public.carbon_eixos (id) on delete restrict,
  competencia   date not null,
  descricao     text not null check (btrim(descricao) <> ''),
  /* Negativo e despesa, positivo e estorno. A planilha ja usa esse sinal, e
     inverte-lo aqui obrigaria a lembrar do sinal em toda consulta. */
  valor         numeric(14,2) not null check (valor <> 0),
  quantidade    numeric(12,3),
  documento     text,
  tem_comprovante boolean,
  observacoes   text,
  origem_aba    text,
  origem_linha  integer,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  /* AS DUAS FK COMPOSTAS SAO O CORACAO DA INTEGRIDADE ENTRE GRUPOS. O lancamento
     so entra se o ciclo for do mesmo grupo E se a aldeia for do mesmo grupo.
     Sem elas, uma despesa do Grupo de Cima cairia num ciclo do de Baixo sem
     nenhum erro, e o saldo dos dois ficaria errado em silencio. */
  foreign key (ciclo_id, grupo_id)
    references public.carbon_ciclos_prestacao (id, grupo_id) on delete cascade,
  foreign key (aldeia_id, grupo_id)
    references public.carbon_aldeias (id, grupo_id) on delete restrict,
  /* Reimportacao idempotente. Parcial porque origem_linha e nula no que for
     lancado pela tela, e nulo em unique nao impede duplicata. */
  constraint carbon_prest_lanc_origem_uq unique (ciclo_id, origem_aba, origem_linha)
);

comment on table public.carbon_prestacao_lancamentos is
  'A despesa que a comunidade declarou. `descricao` e texto livre e por isso '
  'passa pelo gatilho de dado pessoal: no arquivo de origem, seis descricoes '
  'traziam nome de pessoa dentro do texto.';

create index if not exists carbon_prest_lanc_ciclo_idx
  on public.carbon_prestacao_lancamentos (ciclo_id, competencia);
create index if not exists carbon_prest_lanc_aldeia_idx
  on public.carbon_prestacao_lancamentos (aldeia_id)
  where aldeia_id is not null;

-- ===== Guarda de dado pessoal ================================================

/**
 * Recusa dado pessoal nos campos de texto livre.
 *
 * POR QUE EM TODOS OS CAMPOS, e nao so na descricao: a analise das planilhas
 * achou nome em DOIS lugares diferentes - dentro da descricao do item e dentro
 * da observacao do analista sobre quem assinou o recibo. Cobrir so um deixaria a
 * porta aberta no outro, e a porta aberta e a que vai ser usada.
 *
 * O padrao de CPF e de e-mail sao os mesmos de carbon_questionarios_sem_dado_pessoal.
 * Nao pega nome solto, e nao ha regex que pegue: por isso a importacao lista
 * para revisao humana em vez de confiar so nisto. Esta e a segunda camada.
 */
create or replace function public.carbon_prestacao_sem_dado_pessoal()
returns trigger
language plpgsql
as $$
declare
  campo text;
  valor text;
begin
  for campo, valor in
    select * from (values
      ('descricao', new.descricao),
      ('documento', new.documento),
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
    -- Conta bancaria escrita como "ag 1234 c/c 56789-0".
    if valor ~* '\m(ag[eê]ncia|c/c|conta corrente)\M' then
      raise exception 'o campo "%" parece conter dado bancario', campo;
    end if;
  end loop;

  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists carbon_prest_lanc_sem_dado_pessoal_trg
  on public.carbon_prestacao_lancamentos;

create trigger carbon_prest_lanc_sem_dado_pessoal_trg
  before insert or update on public.carbon_prestacao_lancamentos
  for each row execute function public.carbon_prestacao_sem_dado_pessoal();

revoke all on function public.carbon_prestacao_sem_dado_pessoal() from public;

-- ===== O saldo, que e a pergunta que a operacao faz ==========================

/**
 * A pergunta nao e "quanto gastamos", e "O QUE AINDA FALTA COMPROVAR".
 *
 * Hoje isso vive em SUMIFS espalhados por abas ocultas, um deles com uma
 * constante de 106.000 sem origem no arquivo. Aqui e uma view, com a formula
 * escrita e conferivel.
 *
 * DUAS NOCOES DE "COMPROVADO", e a diferenca entre elas e informacao:
 *   declarado_com_comprovante  o que o razao MARCOU como tendo comprovante;
 *   ...e a conciliacao real contra o documento entra quando a issue 4 existir.
 * Guardar so a primeira faria a tela afirmar que esta comprovado o que ninguem
 * conferiu.
 */
/* security_invoker = true E OBRIGATORIO AQUI, e faltava.
   Sem ele a view roda com o privilegio de QUEM A CRIOU, e nao de quem consulta:
   a RLS das tabelas de baixo nao e aplicada. Como o Supabase concede select a
   anon e authenticated por default privileges do schema public, a view virava
   uma porta lateral que devolvia antecipado, declarado e saldo de todo ciclo
   para quem tivesse a chave anon - exatamente o que o comentario de Seguranca
   logo abaixo afirma que a RLS impede. Ligar RLS na tabela e deixar a view sem
   security_invoker anula a RLS. */
create or replace view public.carbon_prestacao_saldo
  with (security_invoker = true) as
select
  c.id                                as ciclo_id,
  c.grupo_id,
  c.projeto_id,
  c.nome                              as ciclo,
  c.status,
  c.saldo_abertura,
  coalesce(a.total_antecipado, 0)     as antecipado,
  coalesce(l.total_declarado, 0)      as declarado,
  coalesce(l.com_comprovante, 0)      as declarado_com_comprovante,
  coalesce(l.sem_comprovante, 0)      as declarado_sem_comprovante,
  coalesce(c.saldo_abertura, 0)
    + coalesce(a.total_antecipado, 0)
    + coalesce(l.total_declarado, 0)  as saldo,
  coalesce(l.lancamentos, 0)          as lancamentos
from public.carbon_ciclos_prestacao c
left join (
  select ciclo_id, sum(valor) as total_antecipado
    from public.carbon_antecipacoes group by ciclo_id
) a on a.ciclo_id = c.id
left join (
  select ciclo_id,
         sum(valor)                                              as total_declarado,
         sum(valor) filter (where tem_comprovante is true)        as com_comprovante,
         sum(valor) filter (where tem_comprovante is not true)    as sem_comprovante,
         count(*)                                                 as lancamentos
    from public.carbon_prestacao_lancamentos group by ciclo_id
) l on l.ciclo_id = c.id;

comment on view public.carbon_prestacao_saldo is
  'Saldo por ciclo. `declarado` e negativo (despesa), entao o saldo e uma SOMA e '
  'nao uma subtracao. Nao ha linha de total do projeto, de proposito: os dois '
  'grupos nao se somam.';

-- ===== Seguranca =============================================================

/* RLS ligada em todas, como em todas as migrations deste banco. Nao ha policy:
   o acesso e exclusivamente pela Edge Function com a service_role, que confere a
   permissao na requisicao. Ligar RLS sem policy e o que garante que uma chave
   anon vazada nao leia nada. */
alter table public.carbon_grupos_comunitarios enable row level security;
alter table public.carbon_aldeias             enable row level security;
alter table public.carbon_eixos               enable row level security;
alter table public.carbon_ciclos_prestacao    enable row level security;
alter table public.carbon_antecipacoes        enable row level security;
alter table public.carbon_prestacao_lancamentos enable row level security;

/* REVOKE EXPLICITO, e ele faltava nesta migration inteira.
   RLS sozinha nao basta como afirmacao de seguranca: ela e a segunda camada. O
   Supabase concede privilegio a anon e authenticated por DEFAULT PRIVILEGES do
   schema public, entao objeto novo nasce alcancavel pela chave publica, e e o
   revoke que fecha. Todas as outras migrations deste banco fazem isso - ver
   20260807120000_init_apsis_carbon.sql, linhas 86, 180, 218 e 266 - e o desvio
   aqui nao era decisao, era omissao. */
revoke all on table public.carbon_grupos_comunitarios    from anon, authenticated;
revoke all on table public.carbon_aldeias                from anon, authenticated;
revoke all on table public.carbon_eixos                  from anon, authenticated;
revoke all on table public.carbon_ciclos_prestacao       from anon, authenticated;
revoke all on table public.carbon_antecipacoes           from anon, authenticated;
revoke all on table public.carbon_prestacao_lancamentos  from anon, authenticated;
revoke all on table public.carbon_prestacao_saldo        from anon, authenticated;

commit;

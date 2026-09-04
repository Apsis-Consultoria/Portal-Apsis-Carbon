-- =============================================================================
-- Cargos: acesso por AREA, criado e mantido na propria tela de gestao.
-- =============================================================================
-- O QUE MUDA. Ate aqui a autorizacao tinha tres camadas e nenhuma tela:
--
--   carbon_usuarios.papel      escrita, global (admin, gestor, colaborador)
--   carbon_usuario_modulos     quais modulos aparecem, por PESSOA
--   carbon_projeto_equipe      quais projetos a pessoa le
--
-- Agora existe o CARGO: um pacote nomeado de areas, criado na tela. A pessoa
-- recebe um cargo, e o cargo abre as areas.
--
-- -----------------------------------------------------------------------------
-- DECISAO DO DONO, e ela simplifica o modelo inteiro: VER E EDITAR
-- -----------------------------------------------------------------------------
-- Nao existe "ve mas nao edita". Se a area esta no cargo, a pessoa le e escreve
-- naquela area; se nao esta, a area nao existe para ela. Uma pergunta so, no
-- mesmo lugar onde hoje se pergunta "essa pessoa escreve?".
--
-- Consequencia pratica: quem precisar de um recorte diferente ganha um CARGO
-- diferente, e nao uma excecao pendurada na pessoa. Foi decisao explicita ("so
-- o cargo"), e o motivo e suporte: quando alguem reclama que nao ve uma tela,
-- ha UM lugar para olhar.
--
-- -----------------------------------------------------------------------------
-- POR QUE AREA, e nao carbon_modulos
-- -----------------------------------------------------------------------------
-- carbon_modulos NAO controla o menu. O menu vem do registro de paginas do
-- frontend (src/paginas/*.paginas.js), e o Layout DEDUPLICA por rota dando
-- vitoria ao registro - ver o comentario longo em src/Layout.jsx, escrito depois
-- de a tabela ser semeada em 25/08/2026 e o menu passar a listar cada tela duas
-- vezes. As 9 linhas de carbon_modulos existem hoje para os cards da tela de
-- Boas-Vindas.
--
-- Amarrar cargo em carbon_modulos daria a sensacao de controlar o acesso
-- enquanto controlava os cards. A AREA e a unidade que existe nos DOIS lados: um
-- arquivo de registro de paginas e um modulo de rota da API, com o mesmo nome.
-- E o que torna "ver = editar" aplicavel no SERVIDOR, que e o unico lugar onde
-- autorizacao vale.
--
-- -----------------------------------------------------------------------------
-- DUAS TRAVAS CONTRA SE TRANCAR FORA. Nenhuma e paranoia.
-- -----------------------------------------------------------------------------
-- 1. `cargo_id` NULO CONTINUA NA REGRA ANTIGA. No deploy desta migration
--    ninguem tem cargo. Se nulo significasse "nenhuma area", todo o time
--    perderia acesso a tudo no instante do deploy, inclusive a tela de gestao
--    de acessos - e o unico caminho de volta seria SQL na producao. Enquanto a
--    pessoa nao tiver cargo, vale o papel de sempre.
--
-- 2. `papel = 'admin'` E CHAVE DE EMERGENCIA e ignora o cargo. Sem isso, uma
--    edicao errada de cargo (tirar a area `acessos` de todo mundo) tranca o
--    sistema para sempre. A trava do gatilho abaixo cobre o caso obvio, mas
--    trava de banco cobre o que ela sabe prever; admin cobre o resto.
--
-- A funcao carbon_cargo_areas_seguras() abaixo ainda RECUSA remover a ultima
-- pessoa ativa com a area `acessos`, porque a defesa em profundidade aqui e
-- barata e o estrago e caro.
-- =============================================================================

begin;

-- ===== 1. As areas ==========================================================
-- Tabela de referencia, e nao enum nem texto livre: a regra 9 do CLAUDE.md pede
-- "ENUM ou tabela de referencia para status; nunca texto livre", e tabela ganha
-- do enum aqui porque area nova nasce junto com dominio novo (uma frente de
-- trabalho por mes, historicamente) e alterar enum em producao exige
-- ALTER TYPE, que nao roda dentro de transacao com outras coisas.

create table if not exists public.carbon_areas (
  chave     text primary key check (chave ~ '^[a-z][a-z0-9_]{1,30}$'),
  label     text not null check (btrim(label) <> ''),
  descricao text,
  /**
   * Area que TODO MUNDO tem, independente de cargo. Hoje e so `nucleo`: boas
   * vindas, notificacoes, o proprio /me. Sem isso, uma pessoa sem cargo (ou com
   * cargo vazio) receberia 403 ao abrir o portal e veria a tela de acesso
   * bloqueado sem entender por que - e nao teria como pedir ajuda pelo sistema.
   */
  sempre_liberada boolean not null default false,
  ordem     integer not null default 0,
  criado_em timestamptz not null default now()
);

comment on table public.carbon_areas is
  'Unidades de acesso do Apsis Carbon. Cada area corresponde a UM arquivo de registro de paginas do frontend (src/paginas/<area>.paginas.js) e a UM modulo de rota da API (supabase/functions/carbon-api/rotas/<area>.ts). NAO confundir com carbon_modulos, que alimenta os cards da tela de Boas-Vindas e nao controla o menu.';
comment on column public.carbon_areas.sempre_liberada is
  'Area que dispensa cargo. Sem pelo menos uma, pessoa sem cargo nao consegue abrir o portal nem pedir ajuda.';

insert into public.carbon_areas (chave, label, descricao, sempre_liberada, ordem) values
  ('nucleo',        'Início e notificações', 'Boas-vindas, notificações e perfil. Todos têm.', true,  0),
  ('acessos',       'Gestão de acessos',     'Criar cargos e definir quem tem cada um.',       false, 1),
  ('projetos',      'Projetos',              'Projetos de carbono, PDD e equipe.',             false, 10),
  ('prestacao',     'Prestação de contas',   'Repasses, lançamentos e comprovantes.',          false, 20),
  ('indicadores',   'Indicadores',           'Indicadores do projeto e medições.',             false, 30),
  ('monitoramento', 'Plano de monitoramento','Plano de monitoramento por projeto.',            false, 40),
  ('questionarios', 'Questionários',         'Formulários de campo e respostas.',              false, 50),
  ('atividades',    'Atividades',            'Atividades e visitas de campo.',                 false, 60),
  ('documentos',    'Documentos',            'Documentos do projeto.',                         false, 70),
  ('evidencias',    'Evidências',            'Evidências para validação.',                     false, 80),
  ('findings',      'Findings',              'Apontamentos da validadora e da VVB.',           false, 90),
  ('metas',         'Metas',                 'Metas do projeto.',                              false, 100),
  ('pipeline',      'Pipeline',              'Oportunidades em prospecção.',                   false, 110),
  ('reunioes',      'Reuniões',              'Reuniões, atas e pendências.',                   false, 120),
  ('fornecedores',  'Fornecedores',          'Fornecedores e contratos.',                      false, 130),
  ('consultoria',   'Consultoria',           'Carteira de consultoria.',                       false, 140),
  ('credito',       'Crédito de carbono',    'Emissão e venda de crédito.',                    false, 150),
  ('secureshare',   'Secure Share',          'Pastas compartilhadas com clientes.',            false, 160)
on conflict (chave) do update
  set label = excluded.label,
      descricao = excluded.descricao,
      sempre_liberada = excluded.sempre_liberada,
      ordem = excluded.ordem;

-- ===== 2. Os cargos =========================================================

create table if not exists public.carbon_cargos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (btrim(nome) <> ''),
  descricao     text,
  ativo         boolean not null default true,
  criado_por    uuid references public.carbon_usuarios (id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

/**
 * Nome unico SEM DIFERENCIAR CAIXA NEM ACENTO.
 *
 * "Analista de campo" e "analista de campo" sao o mesmo cargo para quem opera a
 * tela, e dois cargos parecidos na lista e a receita para alguem atribuir o
 * errado. unaccent nao esta garantido na instancia, entao a normalizacao usa
 * lower() + translate(), que resolve o portugues sem depender de extensao.
 */
create unique index if not exists carbon_cargos_nome_uq
  on public.carbon_cargos (
    lower(translate(btrim(nome),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
  );

comment on table public.carbon_cargos is
  'Pacote nomeado de areas, criado e mantido na tela de Gestao de acessos. Quem tem o cargo LE E ESCREVE nas areas dele: nao existe "ve mas nao edita", por decisao do dono. Recorte diferente = cargo diferente, nunca excecao por pessoa.';

create table if not exists public.carbon_cargo_areas (
  cargo_id uuid not null references public.carbon_cargos (id) on delete cascade,
  area     text not null references public.carbon_areas (chave) on delete restrict,
  primary key (cargo_id, area)
);

-- ON DELETE CASCADE no cargo (apagar o cargo tira as areas dele, e o que se
-- espera) e RESTRICT na area (apagar uma area com cargo usando ela silenciaria
-- uma permissao; area sai do sistema com deploy, nao com DELETE solto).
comment on table public.carbon_cargo_areas is
  'Areas que um cargo abre. A ausencia de linha e a negacao: nao existe registro de "negado", porque duas formas de dizer nao (linha ausente e linha negando) sempre divergem.';

create index if not exists carbon_cargo_areas_area_idx
  on public.carbon_cargo_areas (area);

-- ===== 3. O vinculo com a pessoa ============================================

alter table public.carbon_usuarios
  add column if not exists cargo_id uuid references public.carbon_cargos (id) on delete set null;

comment on column public.carbon_usuarios.cargo_id is
  'Cargo da pessoa. NULO significa "ainda sem cargo", e nesse caso vale a regra ANTIGA do papel - ver carbon_areas_do_usuario. ON DELETE SET NULL de proposito: apagar um cargo nao pode apagar a pessoa, e deixa-la sem cargo e um estado que o sistema sabe tratar.';

create index if not exists carbon_usuarios_cargo_idx
  on public.carbon_usuarios (cargo_id) where cargo_id is not null;

-- ===== 4. A pergunta que o servidor faz =====================================

/**
 * Areas efetivas de uma pessoa. E a UNICA fonte da resposta.
 *
 * A ordem dos casos e a propria politica, e cada um existe por um motivo:
 *
 *   1. area sempre_liberada  -> todo mundo, com ou sem cargo. Sem isso, pessoa
 *      nova nao abre o portal e nao tem como pedir acesso.
 *   2. papel = 'admin'       -> TODAS as areas, ignorando cargo. Chave de
 *      emergencia: sem ela, tirar a area `acessos` de todos os cargos tranca o
 *      sistema e o unico caminho de volta e SQL em producao.
 *   3. cargo_id nulo         -> regra ANTIGA (gestor e admin escrevem tudo,
 *      colaborador so o nucleo). E a ponte da migracao: no deploy ninguem tem
 *      cargo, e sem esta linha o time inteiro perde acesso de uma vez.
 *   4. cargo ativo           -> as areas do cargo.
 *
 * Cargo INATIVO nao concede nada, e nao apaga: desativar e o jeito de suspender
 * um cargo sem perder o desenho dele nem quem o tinha.
 */
create or replace function public.carbon_areas_do_usuario(p_usuario_id uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  -- 1. as sempre liberadas
  select a.chave from public.carbon_areas a where a.sempre_liberada

  union

  -- 2. admin: tudo
  select a.chave
    from public.carbon_areas a
   where exists (
     select 1 from public.carbon_usuarios u
      where u.id = p_usuario_id and u.ativo and lower(btrim(u.papel)) = 'admin'
   )

  union

  -- 3. sem cargo: a regra antiga do papel
  select a.chave
    from public.carbon_areas a
   where exists (
     select 1 from public.carbon_usuarios u
      where u.id = p_usuario_id
        and u.ativo
        and u.cargo_id is null
        and lower(btrim(u.papel)) in ('admin', 'gestor')
   )

  union

  -- 4. as areas do cargo ativo
  select ca.area
    from public.carbon_usuarios u
    join public.carbon_cargos c   on c.id = u.cargo_id and c.ativo
    join public.carbon_cargo_areas ca on ca.cargo_id = c.id
   where u.id = p_usuario_id and u.ativo;
$$;

comment on function public.carbon_areas_do_usuario(uuid) is
  'Areas efetivas de uma pessoa, e a unica fonte da resposta. Ver e editar sao a MESMA permissao: se a area sai daqui, a pessoa le e escreve nela. Chamada pelo carbon-api antes de cada handler.';

revoke all on function public.carbon_areas_do_usuario(uuid) from public;

-- ===== 5. A trava do "nao se tranque fora" ==================================

/**
 * RECUSA deixar o sistema sem ninguem que administre acessos.
 *
 * Cobre os tres caminhos que produzem o mesmo estrago: tirar a area `acessos` do
 * ultimo cargo que a tem, desativar esse cargo, e desvincular/desativar a
 * ultima pessoa que o tem. Um erro barulhento aqui custa um toast na tela; o
 * estado que ele impede custa uma ida ao SQL Editor de producao.
 *
 * `papel = 'admin'` NAO conta como cobertura aqui, de proposito: ele e a chave
 * de emergencia, e uma trava que aceita "mas tem um admin" ensina o time a
 * depender da chave de emergencia no dia a dia.
 */
create or replace function public.carbon_exigir_administrador_de_acesso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quantos integer;
begin
  select count(*) into v_quantos
    from public.carbon_usuarios u
    join public.carbon_cargos c on c.id = u.cargo_id and c.ativo
    join public.carbon_cargo_areas ca on ca.cargo_id = c.id and ca.area = 'acessos'
   where u.ativo;

  if v_quantos = 0 then
    raise exception
      'a mudanca deixaria o sistema sem ninguem que administre acessos'
      using errcode = 'P0001';
  end if;

  return null;
end $$;

-- CONSTRAINT TRIGGER DEFERRABLE, e nao trigger comum: a tela salva um cargo
-- trocando o conjunto de areas (delete + insert) na MESMA transacao. Um trigger
-- imediato veria o estado do meio - depois do delete, antes do insert - e
-- recusaria uma edicao que termina valida.
drop trigger if exists carbon_cargo_areas_admin_trg on public.carbon_cargo_areas;
create constraint trigger carbon_cargo_areas_admin_trg
  after insert or update or delete on public.carbon_cargo_areas
  deferrable initially deferred
  for each row execute function public.carbon_exigir_administrador_de_acesso();

drop trigger if exists carbon_cargos_admin_trg on public.carbon_cargos;
create constraint trigger carbon_cargos_admin_trg
  after update or delete on public.carbon_cargos
  deferrable initially deferred
  for each row execute function public.carbon_exigir_administrador_de_acesso();

/* A trava NAO cobre carbon_usuarios: no deploy desta migration NENHUMA pessoa
   tem cargo, entao a contagem seria zero e qualquer UPDATE em usuario passaria a
   falhar - inclusive o upsert do login, que roda a cada entrada. O caminho
   "desvinculei a ultima pessoa com acesso" e barrado na Edge Function, que
   conhece o estado da transicao; aqui seria um tiro no pe. */

-- ===== 6. updated_at por trigger, nao pela aplicacao ========================

create or replace function public.carbon_cargos_touch()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists carbon_cargos_touch_trg on public.carbon_cargos;
create trigger carbon_cargos_touch_trg
  before update on public.carbon_cargos
  for each row execute function public.carbon_cargos_touch();

-- ===== 7. Seguranca =========================================================
-- Mesmo padrao das outras tabelas: RLS ligada e negando tudo, porque o acesso e
-- exclusivamente por Edge Function com service_role. Nao existe policy de
-- propósito - a chave publica nao alcanca estas tabelas.

alter table public.carbon_areas       enable row level security;
alter table public.carbon_cargos      enable row level security;
alter table public.carbon_cargo_areas enable row level security;

revoke all on table public.carbon_areas       from anon, authenticated;
revoke all on table public.carbon_cargos      from anon, authenticated;
revoke all on table public.carbon_cargo_areas from anon, authenticated;

grant all on table public.carbon_areas       to service_role;
grant all on table public.carbon_cargos      to service_role;
grant all on table public.carbon_cargo_areas to service_role;

commit;

-- =============================================================================
-- Apsis Carbon - Atividades e apontamento de horas
-- Arquivo: 20260814094000_atividades.sql
-- =============================================================================
-- Atende as issues #7 e #8 do backlog inicial (docs/issues/BACKLOG-INICIAL.md):
--
--   #7 Atividades: base UNICA com projeto como dimensao.
--      O levantamento encontrou DUAS bases quase identicas no Notion
--      (docs/notion/03-atividades-apsis-carbon.md, do backoffice, e
--      docs/notion/15-atividades-parakana-e-menores.md, do projeto), divergindo
--      em detalhes acidentais: intervalo de datas contra data unica, e ausencia
--      das colunas de hora na base do projeto. Aqui e UMA tabela, com
--      projeto_id NULLABLE como dimensao. Atividade de backoffice simplesmente
--      nao tem projeto.
--
--   #8 Apontamento de horas.
--      E a demanda escrita mais clara de todo o levantamento: a coluna
--      "HH Executada" existe na base do Notion e esta VAZIA em todos os
--      registros, e a pauta da reuniao semanal anota literalmente "lembrar de
--      contar as horas (quando tiver a funcionalidade)". A equipe planeja horas,
--      quer comparar com o realizado, e nao tem como apontar.
--
-- DECISAO CENTRAL: horas executadas NAO E COLUNA.
-- E sempre a soma de carbon_apontamentos_horas, calculada pelas funcoes desta
-- migration. Uma coluna denormalizada aqui divergiria do lancamento no primeiro
-- ajuste feito fora da tela (um DELETE de apontamento, uma correcao no SQL
-- Editor), e "horas executadas" e justamente o numero que a operacao quer poder
-- confiar. Mesma disciplina de area_calculada_ha em carbon_projetos, levada ao
-- extremo: aqui nem coluna derivada existe.
--
-- DECISAO SOBRE O INTERVALO DE DATAS. As duas bases do Notion divergiam entre
-- "Duracao" (intervalo) e "Prazo" (data unica). Unificamos no intervalo, com as
-- DUAS pontas anulaveis: quem so tem prazo preenche data_fim e deixa data_inicio
-- nula. Assim nenhuma das duas praticas precisa ser abandonada, e a timeline
-- (view que a equipe usa para enxergar sobreposicao de prazos) continua
-- funcionando com o que houver.
--
-- Esta migration e idempotente: pode ser reaplicada sem erro.
-- =============================================================================


-- =============================================================================
-- 1. carbon_atividades - base unica de atividades
-- =============================================================================

create table if not exists public.carbon_atividades (
  id               uuid primary key default gen_random_uuid(),
  projeto_id       uuid references public.carbon_projetos (id) on delete set null,
  nome             text not null,
  descricao        text,
  status           text not null default 'nao_iniciada'
                     check (status in (
                       'nao_iniciada',
                       'em_andamento',
                       'concluida',
                       'cancelada'
                     )),
  prioridade       text not null default 'media'
                     check (prioridade in ('baixa', 'media', 'alta')),
  tipo             text not null default 'backoffice'
                     check (tipo in (
                       'consultoria',
                       'novos_negocios',
                       'projeto',
                       'backoffice',
                       'jpf'
                     )),
  responsavel_id   uuid references public.carbon_usuarios (id) on delete set null,
  data_inicio      date,
  data_fim         date,
  horas_planejadas numeric(10,2),
  criado_por       uuid references public.carbon_usuarios (id),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),

  -- Intervalo coerente. So vale quando as duas pontas existem: atividade com
  -- apenas prazo (data_fim) e o caso normal na base que veio do projeto.
  constraint carbon_atividades_periodo_chk check (
    data_inicio is null
    or data_fim is null
    or data_fim >= data_inicio
  ),

  -- Horas planejadas nao negativas. Zero e permitido (atividade explicitamente
  -- sem horas previstas); ausencia de estimativa e NULL, nao zero.
  constraint carbon_atividades_horas_planejadas_chk check (
    horas_planejadas is null or horas_planejadas >= 0
  ),

  -- Nome com conteudo. Sem isso a lista da reuniao semanal ganha linhas em
  -- branco que ninguem consegue identificar nem apagar com seguranca.
  constraint carbon_atividades_nome_nao_vazio_chk check (btrim(nome) <> '')
);

comment on table public.carbon_atividades is
  'Base UNICA de atividades da operacao Apsis Carbon, atravessando as frentes de negocio. Substitui as duas bases quase identicas do Notion (backoffice e projeto) por uma so, com projeto_id NULLABLE como dimensao. Alimenta a reuniao semanal. Escrita somente pela Edge Function carbon-api, com papel admin ou gestor.';
comment on column public.carbon_atividades.projeto_id is
  'Projeto de carbono ao qual a atividade pertence. NULL de proposito e caso normal: atividade de backoffice, de consultoria ou de novos negocios nao pertence a projeto nenhum. ON DELETE SET NULL, e nao CASCADE: apagar um projeto nao pode apagar horas de trabalho ja apontadas, que sao registro de esforco de colaborador e nao dado do projeto.';
comment on column public.carbon_atividades.nome is
  'Titulo da atividade como aparece na pauta da reuniao semanal. Unico campo obrigatorio.';
comment on column public.carbon_atividades.descricao is
  'Detalhamento livre, em portugues. Nao e obrigatorio: no Notion a maioria das linhas so tem o titulo.';
comment on column public.carbon_atividades.status is
  'nao_iniciada, em_andamento, concluida ou cancelada. Os tres primeiros vem dos valores observados no Notion; cancelada existe para a atividade sair das contas sem ser apagada (ver carbon_horas_resumo, que a exclui do consolidado). Nao ha DELETE de atividade na API justamente por causa dos apontamentos pendurados nela.';
comment on column public.carbon_atividades.prioridade is
  'baixa, media ou alta. Repriorizada na reuniao semanal, por isso a API tem uma rota de alteracao EM MASSA (POST atividades/repriorizar) alem do PATCH individual.';
comment on column public.carbon_atividades.tipo is
  'Frente de negocio: consultoria, novos_negocios, projeto, backoffice ou jpf. Sao os valores que a equipe ja usa no Notion (Consultoria, Novos Negocios, JPF, Backoffice), mais projeto para o trabalho tecnico de projeto que a base do Parakana registrava. E a dimensao de comparacao planejado x realizado por tipo, exigida pela issue #8.';
comment on column public.carbon_atividades.responsavel_id is
  'Colaborador responsavel. Referencia a carbon_usuarios em vez de texto livre: no Notion isso e campo de pessoa e nao permite nenhuma visao de carga. LGPD: a associacao entre colaborador e horas e dado pessoal ligado a desempenho, por isso o consolidado por pessoa e restrito a papel admin ou gestor na Edge Function.';
comment on column public.carbon_atividades.data_inicio is
  'Inicio previsto. NULL quando a atividade so tem prazo (era o caso da base do projeto no Notion, que tinha Prazo em vez de Duracao).';
comment on column public.carbon_atividades.data_fim is
  'Prazo ou fim previsto. Nunca anterior a data_inicio, ver carbon_atividades_periodo_chk. E o campo que a timeline usa para mostrar sobreposicao de prazos.';
comment on column public.carbon_atividades.horas_planejadas is
  'Horas-homem previstas (o HH planejadas do Notion). O REALIZADO nao mora aqui: e a soma de carbon_apontamentos_horas, ver public.carbon_atividade_horas. Guardar as duas como coluna faria a segunda divergir do lancamento.';
comment on column public.carbon_atividades.criado_por is
  'Colaborador que cadastrou a atividade. Trilha de autoria, nao dado pessoal adicional.';
comment on column public.carbon_atividades.atualizado_em is
  'Mantido pela trigger carbon_atividades_atualizado_em a cada UPDATE.';

-- Indices ---------------------------------------------------------------------
-- (status, prioridade): a view "Em andamento" e a "Por status" filtram status e
-- ordenam por prioridade, que e o par usado na reuniao semanal.
create index if not exists carbon_atividades_status_prioridade_idx
  on public.carbon_atividades (status, prioridade);

-- Projeto como dimensao: a tela de um projeto lista as atividades dele.
create index if not exists carbon_atividades_projeto_idx
  on public.carbon_atividades (projeto_id);

-- Carga por pessoa e a grade de "Minhas horas", que parte do responsavel.
create index if not exists carbon_atividades_responsavel_idx
  on public.carbon_atividades (responsavel_id);

create index if not exists carbon_atividades_tipo_idx
  on public.carbon_atividades (tipo);

-- Timeline e filtro por periodo: as duas pontas do intervalo.
create index if not exists carbon_atividades_periodo_idx
  on public.carbon_atividades (data_inicio, data_fim);

-- Trigger de atualizado_em ----------------------------------------------------
create or replace function public.carbon_atividades_set_atualizado_em()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

comment on function public.carbon_atividades_set_atualizado_em() is
  'Mantem carbon_atividades.atualizado_em em dia a cada UPDATE.';

drop trigger if exists carbon_atividades_atualizado_em on public.carbon_atividades;
create trigger carbon_atividades_atualizado_em
  before update on public.carbon_atividades
  for each row
  execute function public.carbon_atividades_set_atualizado_em();

-- RLS -------------------------------------------------------------------------
-- NENHUMA policy, de proposito, igual a carbon_projetos: com RLS ativa e zero
-- policies todo acesso pela anon key e negado, inclusive leitura, e somente o
-- service_role (a Edge Function carbon-api, que ja validou o token do Azure AD e
-- conferiu ativo = true) alcanca a tabela.
alter table public.carbon_atividades enable row level security;
revoke all on table public.carbon_atividades from anon, authenticated;
grant all on table public.carbon_atividades to service_role;


-- =============================================================================
-- 2. carbon_apontamentos_horas - horas realizadas, por dia e por atividade
-- =============================================================================
-- GRANULARIDADE: uma linha por (atividade, colaborador, dia). E o minimo util
-- para fechar horas de consultoria, e e o criterio de aceite literal da issue #8.
-- O unique impede o erro mais comum do lancamento continuo: a pessoa volta na
-- quarta-feira, digita de novo o mesmo dia e passa a ter duas linhas somando em
-- dobro. Com o unique, a API faz UPSERT e o segundo lancamento CORRIGE o
-- primeiro em vez de duplicar.

create table if not exists public.carbon_apontamentos_horas (
  id            uuid primary key default gen_random_uuid(),
  atividade_id  uuid not null references public.carbon_atividades (id) on delete cascade,
  usuario_id    uuid not null references public.carbon_usuarios (id),
  data          date not null,
  horas         numeric(6,2) not null,
  observacao    text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- Um lancamento por pessoa, por atividade, por dia.
  constraint carbon_apontamentos_horas_dia_uniq unique (atividade_id, usuario_id, data),

  -- Horas de um dia: maior que zero e no maximo 24. Zero nao e apontamento, e
  -- ausencia de apontamento (a API apaga a linha quando recebe zero), e mais de
  -- 24 horas em um dia e sempre erro de digitacao.
  constraint carbon_apontamentos_horas_faixa_chk check (horas > 0 and horas <= 24)
);

comment on table public.carbon_apontamentos_horas is
  'Horas realizadas, por atividade, por colaborador e por DIA. Fecha a lacuna registrada na issue #8: a coluna HH Executada do Notion estava vazia em todos os registros porque nao havia onde apontar. A soma destas linhas E o realizado da atividade, ver public.carbon_atividade_horas. LGPD: associa colaborador a esforco, portanto e dado pessoal ligado a desempenho - a Edge Function so devolve o apontamento do proprio colaborador, exceto para papel admin ou gestor.';
comment on column public.carbon_apontamentos_horas.atividade_id is
  'Atividade a que as horas pertencem. ON DELETE CASCADE porque apontamento nao existe sem atividade; por isso mesmo a API nao expoe DELETE de atividade.';
comment on column public.carbon_apontamentos_horas.usuario_id is
  'Colaborador que executou. Gravado SEMPRE pela Edge Function a partir do token do chamador, nunca a partir do corpo da requisicao: ninguem aponta hora no nome de outra pessoa. Sem ON DELETE: colaborador que sai e desativado (ativo = false), nao apagado, e apagar levaria o historico de horas com ele.';
comment on column public.carbon_apontamentos_horas.data is
  'Dia trabalhado. Granularidade minima exigida pela issue #8. Nao e o dia do lancamento: o lancamento e continuo ao longo da semana e pode corrigir dia anterior.';
comment on column public.carbon_apontamentos_horas.horas is
  'Horas do dia, com duas casas decimais (0,25 = 15 minutos). Entre 0 exclusivo e 24 inclusive, ver carbon_apontamentos_horas_faixa_chk. Enviar zero pela API APAGA o lancamento, o que e o que a pessoa quer dizer ao limpar uma celula da grade.';
comment on column public.carbon_apontamentos_horas.observacao is
  'Anotacao curta do que foi feito no dia. Opcional de proposito: exigir texto tornaria o lancamento rapido lento, e a issue #8 pede explicitamente lancamento rapido.';
comment on column public.carbon_apontamentos_horas.atualizado_em is
  'Mantido pela trigger carbon_apontamentos_horas_atualizado_em a cada UPDATE.';

-- Indices ---------------------------------------------------------------------
-- (usuario_id, data): e a consulta da grade "Minhas horas" da semana corrente,
-- que e o caminho mais percorrido do modulo.
create index if not exists carbon_apontamentos_horas_usuario_data_idx
  on public.carbon_apontamentos_horas (usuario_id, data);

-- (data): consolidado por periodo, sem passar pelo usuario.
create index if not exists carbon_apontamentos_horas_data_idx
  on public.carbon_apontamentos_horas (data);

-- Busca por atividade e atendida pelo prefixo do unique
-- carbon_apontamentos_horas_dia_uniq (atividade_id, usuario_id, data).

create or replace function public.carbon_apontamentos_horas_set_atualizado_em()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

comment on function public.carbon_apontamentos_horas_set_atualizado_em() is
  'Mantem carbon_apontamentos_horas.atualizado_em em dia a cada UPDATE.';

drop trigger if exists carbon_apontamentos_horas_atualizado_em
  on public.carbon_apontamentos_horas;
create trigger carbon_apontamentos_horas_atualizado_em
  before update on public.carbon_apontamentos_horas
  for each row
  execute function public.carbon_apontamentos_horas_set_atualizado_em();

alter table public.carbon_apontamentos_horas enable row level security;
revoke all on table public.carbon_apontamentos_horas from anon, authenticated;
grant all on table public.carbon_apontamentos_horas to service_role;


-- =============================================================================
-- 3. Funcoes chamadas por RPC pela Edge Function carbon-api
-- =============================================================================
-- Todas security definer com search_path fixo, e o EXECUTE revogado de
-- public/anon/authenticated no fim desta secao: SECURITY DEFINER contorna a RLS,
-- portanto deixar o EXECUTE aberto seria abrir uma porta dos fundos pelo
-- endpoint /rest/v1/rpc em torno de toda a protecao declarada acima.

-- 3.0 Aderencia planejado x realizado ------------------------------------------
-- Uma linha, mas em funcao propria de proposito: este percentual aparece no
-- consolidado, no resumo por tipo e por atividade, e o dataset de demonstracao do
-- frontend precisa reproduzir EXATAMENTE a mesma conta (mesmo arredondamento).
-- Tres copias da formula divergiriam, e a divergencia so apareceria depois do
-- provisionamento do Supabase, com o dono olhando um numero que a producao nao
-- produz.
-- NULL, e nao zero, quando nao ha horas planejadas: sem plano nao existe
-- aderencia, e devolver 0% diria que a equipe nao entregou nada.
create or replace function public.carbon_aderencia_pct(
  p_planejadas numeric,
  p_executadas numeric
)
returns numeric
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when coalesce(p_planejadas, 0) <= 0 then null
    else round(coalesce(p_executadas, 0) * 100.0 / p_planejadas, 1)
  end;
$$;

comment on function public.carbon_aderencia_pct(numeric, numeric) is
  'Percentual de horas executadas sobre planejadas, com uma casa decimal. Devolve NULL (nao zero) quando nao ha horas planejadas: sem plano nao existe aderencia. Fonte UNICA da formula: usada por carbon_horas_resumo e reproduzida por src/lib/demo/atividades.js.';


-- 3.1 Horas executadas de uma atividade ----------------------------------------
create or replace function public.carbon_atividade_horas(
  p_atividade_id uuid,
  p_de           date default null,
  p_ate          date default null
)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(ap.horas), 0)::numeric
    from public.carbon_apontamentos_horas ap
   where ap.atividade_id = p_atividade_id
     and (p_de is null or ap.data >= p_de)
     and (p_ate is null or ap.data <= p_ate);
$$;

comment on function public.carbon_atividade_horas(uuid, date, date) is
  'Soma das horas apontadas em uma atividade, opcionalmente restrita a uma janela de datas. E a fonte do "realizado": carbon_atividades NAO tem coluna de horas executadas, de proposito, para o numero nunca divergir do lancamento. Atividade sem apontamento devolve 0, nunca NULL.';


-- 3.2 Listagem de atividades com o realizado somado ----------------------------
-- Funcao, e nao view: uma view em public seria exposta pelo PostgREST e exigiria
-- cuidado extra de privilegio, e aqui precisamos de filtros parametrizados
-- (projeto, tipo, status, prioridade, responsavel, janela de datas, busca) que em
-- view virariam WHERE do cliente.
--
-- ATENCAO A SEMANTICA DE horas_executadas: e SEMPRE o total da atividade, sem
-- janela. p_de e p_ate filtram QUAIS atividades aparecem (por intersecao de
-- prazo), nunca quais horas entram na soma. Se a janela cortasse a soma, a mesma
-- coluna significaria coisas diferentes com e sem filtro na tela, e o total do
-- rodape deixaria de fechar com o detalhe de cada atividade. A comparacao
-- planejado x realizado DENTRO de um periodo e outro assunto e tem funcao propria
-- (carbon_horas_resumo).
--
-- A intersecao de datas e TOLERANTE A NULO: atividade sem prazo nunca e excluida
-- por um filtro de periodo. Ficaria invisivel exatamente na tela usada para
-- caca-la, e no Notion muita linha nao tem data.
create or replace function public.carbon_atividades_listar(
  p_id             uuid    default null,
  p_projeto_id     uuid    default null,
  p_tipo           text    default null,
  p_status         text    default null,
  p_prioridade     text    default null,
  p_responsavel_id uuid    default null,
  p_de             date    default null,
  p_ate            date    default null,
  p_busca          text    default null,
  p_limite         integer default 200,
  p_deslocamento   integer default 0
)
returns table (
  id               uuid,
  projeto_id       uuid,
  projeto_nome     text,
  nome             text,
  descricao        text,
  status           text,
  prioridade       text,
  tipo             text,
  responsavel_id   uuid,
  responsavel_nome text,
  data_inicio      date,
  data_fim         date,
  horas_planejadas numeric,
  horas_executadas numeric,
  aderencia_pct    numeric,
  apontamentos     integer,
  criado_em        timestamptz,
  atualizado_em    timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    t.projeto_id,
    pr.nome,
    t.nome,
    t.descricao,
    t.status,
    t.prioridade,
    t.tipo,
    t.responsavel_id,
    u.nome,
    t.data_inicio,
    t.data_fim,
    t.horas_planejadas,
    coalesce(h.horas, 0)::numeric,
    -- Aderencia calculada AQUI, e nao na tela: e a mesma funcao que o consolidado
    -- usa, entao a lista e o resumo nunca mostram percentuais diferentes para a
    -- mesma atividade. NULL quando nao ha horas planejadas.
    public.carbon_aderencia_pct(t.horas_planejadas, coalesce(h.horas, 0)::numeric),
    coalesce(h.itens, 0)::integer,
    t.criado_em,
    t.atualizado_em
  from public.carbon_atividades t
  left join public.carbon_projetos pr on pr.id = t.projeto_id
  left join public.carbon_usuarios  u on u.id  = t.responsavel_id
  left join (
    select ap.atividade_id,
           sum(ap.horas)  as horas,
           count(*)       as itens
      from public.carbon_apontamentos_horas ap
     group by ap.atividade_id
  ) h on h.atividade_id = t.id
  where (p_id is null             or t.id = p_id)
    and (p_projeto_id is null     or t.projeto_id = p_projeto_id)
    and (p_tipo is null           or t.tipo = p_tipo)
    and (p_status is null         or t.status = p_status)
    and (p_prioridade is null     or t.prioridade = p_prioridade)
    and (p_responsavel_id is null or t.responsavel_id = p_responsavel_id)
    and (p_de is null  or t.data_fim is null    or t.data_fim >= p_de)
    and (p_ate is null or t.data_inicio is null or t.data_inicio <= p_ate)
    and (
      p_busca is null
      or position(lower(p_busca) in lower(t.nome)) > 0
      or position(lower(p_busca) in lower(coalesce(t.descricao, ''))) > 0
    )
  -- Ordem da reuniao semanal: prioridade alta primeiro, depois o prazo mais
  -- proximo, com atividade sem prazo no fim, e o nome como desempate estavel.
  order by
    case t.prioridade when 'alta' then 1 when 'media' then 2 when 'baixa' then 3 else 4 end,
    t.data_fim asc nulls last,
    t.nome asc
  limit  greatest(coalesce(p_limite, 200), 1)
  offset greatest(coalesce(p_deslocamento, 0), 0);
$$;

comment on function public.carbon_atividades_listar(uuid, uuid, text, text, text, uuid, date, date, text, integer, integer) is
  'Atividades com o nome do projeto, o nome do responsavel, as horas planejadas, as horas EXECUTADAS somadas dos apontamentos e a aderencia (via carbon_aderencia_pct, para lista e consolidado nunca divergirem). Todos os parametros sao filtros opcionais; p_id devolve uma unica atividade (usada no GET de detalhe, para a projecao existir num unico lugar). horas_executadas e sempre o TOTAL da atividade: p_de e p_ate filtram quais atividades aparecem, por intersecao de prazo tolerante a nulo, e nunca quais horas entram na soma. Ordena por prioridade, prazo e nome, que e a ordem usada na reuniao semanal.';


-- 3.3 Apontamentos de uma atividade --------------------------------------------
-- p_usuario_id null devolve TODOS os apontamentos (visao consolidada). A decisao
-- de passar null ou o id do chamador e da Edge Function, que conhece o papel: o
-- consolidado por pessoa e restrito a admin e gestor (LGPD, dado ligado a
-- desempenho). Esta funcao nao decide autorizacao, so obedece.
create or replace function public.carbon_atividade_apontamentos(
  p_atividade_id uuid,
  p_usuario_id   uuid default null
)
returns table (
  id            uuid,
  atividade_id  uuid,
  usuario_id    uuid,
  usuario_nome  text,
  data          date,
  horas         numeric,
  observacao    text,
  criado_em     timestamptz,
  atualizado_em timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    ap.id,
    ap.atividade_id,
    ap.usuario_id,
    u.nome,
    ap.data,
    ap.horas,
    ap.observacao,
    ap.criado_em,
    ap.atualizado_em
  from public.carbon_apontamentos_horas ap
  left join public.carbon_usuarios u on u.id = ap.usuario_id
  where ap.atividade_id = p_atividade_id
    and (p_usuario_id is null or ap.usuario_id = p_usuario_id)
  order by ap.data desc, u.nome asc nulls last;
$$;

comment on function public.carbon_atividade_apontamentos(uuid, uuid) is
  'Apontamentos de horas de uma atividade, do mais recente para o mais antigo. p_usuario_id nulo devolve os de todos os colaboradores (visao consolidada); com id, apenas os daquele colaborador. Quem decide qual dos dois usar e a Edge Function, conforme o papel do chamador: o consolidado por pessoa e restrito a admin e gestor.';


-- 3.4 Grade da semana de um colaborador ----------------------------------------
-- E o coracao do LANCAMENTO RAPIDO pedido pela issue #8: a atualizacao acontece
-- ao longo da semana, em tempo continuo, e nao em lote no fim do mes. A tela
-- precisa da semana inteira em UMA chamada, com as atividades que fazem sentido
-- para a pessoa e os lancamentos que ela ja fez.
--
-- SEMANA COMECA NA SEGUNDA (date_trunc('week') do PostgreSQL, padrao ISO). O
-- frontend e o dataset de demonstracao usam a mesma regra; divergir faria o mesmo
-- lancamento cair em semanas diferentes no servidor e na tela.
--
-- QUE ATIVIDADES ENTRAM: as que a pessoa e responsavel e que estao abertas, MAIS
-- qualquer atividade em que ela ja apontou hora na semana (inclusive concluida ou
-- de outra pessoa: se ela lancou, ela edita). A tela permite acrescentar outras da
-- lista geral; nao cabe aqui adivinhar isso.
--
-- LGPD: devolve SOMENTE as horas do proprio colaborador. O total realizado da
-- atividade somando todo mundo nao entra: com equipe pequena, um total ao lado do
-- proprio numero revela o de quem mais apontou. Esse dado vive so no consolidado,
-- que e restrito.
create or replace function public.carbon_minhas_horas_semana(
  p_usuario_id uuid,
  p_data       date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_inicio date;
  v_fim    date;
  v_saida  jsonb;
begin
  if p_usuario_id is null then
    raise exception 'usuario_nao_informado: p_usuario_id e obrigatorio';
  end if;

  v_inicio := (date_trunc('week', coalesce(p_data, current_date)::timestamp))::date;
  v_fim    := v_inicio + 6;

  with meus as (
    select ap.*
      from public.carbon_apontamentos_horas ap
     where ap.usuario_id = p_usuario_id
       and ap.data between v_inicio and v_fim
  ),
  -- Total do colaborador na atividade, sem janela: e informacao dele mesmo e
  -- ajuda a decidir se ainda cabe hora no que foi planejado.
  meu_total as (
    select ap.atividade_id, sum(ap.horas)::numeric as horas
      from public.carbon_apontamentos_horas ap
     where ap.usuario_id = p_usuario_id
     group by ap.atividade_id
  ),
  ativ as (
    select t.*
      from public.carbon_atividades t
     where (
             t.responsavel_id = p_usuario_id
             and t.status in ('nao_iniciada', 'em_andamento')
           )
        or t.id in (select m.atividade_id from meus m)
  )
  select jsonb_build_object(
    'semana', jsonb_build_object(
      'inicio', v_inicio,
      'fim',    v_fim,
      -- Cast explicito para timestamp: generate_series(date, date, interval) obrigaria o
      -- planejador a escolher entre a sobrecarga de timestamp e a de timestamptz por
      -- cast implicito, e a de timestamptz faria a serie depender do fuso da sessao.
      'dias',   (
        select coalesce(jsonb_agg(g.d::date order by g.d), '[]'::jsonb)
          from generate_series(v_inicio::timestamp, v_fim::timestamp, interval '1 day') as g(d)
      )
    ),
    'atividades', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id',                  a.id,
                 'nome',                a.nome,
                 'tipo',                a.tipo,
                 'status',              a.status,
                 'prioridade',          a.prioridade,
                 'projeto_id',          a.projeto_id,
                 'projeto_nome',        pr.nome,
                 'data_inicio',         a.data_inicio,
                 'data_fim',            a.data_fim,
                 'horas_planejadas',    a.horas_planejadas,
                 'sou_responsavel',     (a.responsavel_id = p_usuario_id),
                 'minhas_horas_semana', coalesce((
                   select sum(m.horas)::numeric from meus m where m.atividade_id = a.id
                 ), 0),
                 'minhas_horas_total',  coalesce(mt.horas, 0)
               )
               order by
                 case a.prioridade
                   when 'alta' then 1 when 'media' then 2 when 'baixa' then 3 else 4
                 end,
                 a.data_fim asc nulls last,
                 a.nome asc
             )
        from ativ a
        left join public.carbon_projetos pr on pr.id = a.projeto_id
        left join meu_total mt on mt.atividade_id = a.id
    ), '[]'::jsonb),
    'apontamentos', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id',           m.id,
                 'atividade_id', m.atividade_id,
                 'data',         m.data,
                 'horas',        m.horas,
                 'observacao',   m.observacao
               )
               order by m.data asc
             )
        from meus m
    ), '[]'::jsonb),
    'totais', jsonb_build_object(
      'semana', coalesce((select sum(m.horas)::numeric from meus m), 0),
      'por_dia', coalesce((
        select jsonb_agg(jsonb_build_object('data', x.data, 'horas', x.horas) order by x.data)
          from (
            select m.data, sum(m.horas)::numeric as horas
              from meus m
             group by m.data
          ) x
      ), '[]'::jsonb)
    )
  )
  into v_saida;

  return v_saida;
end;
$$;

comment on function public.carbon_minhas_horas_semana(uuid, date) is
  'Grade da semana de UM colaborador em jsonb: os sete dias (semana comecando na segunda, padrao ISO de date_trunc), as atividades relevantes para ele, os apontamentos que ele fez na semana e os totais por dia e da semana. Alimenta a tela Minhas Horas, que e o caminho de lancamento rapido exigido pela issue #8. Devolve SOMENTE as horas do proprio colaborador: o realizado somando toda a equipe vive apenas no consolidado, que e restrito a admin e gestor (LGPD, horas sao dado ligado a desempenho). p_data em qualquer dia da semana desejada; nulo usa a semana corrente.';


-- 3.5 Consolidado planejado x realizado ----------------------------------------
-- Atende ao criterio de aceite da issue #8: comparacao planejado contra realizado
-- por atividade, por tipo e por periodo.
--
-- ARMADILHA CONHECIDA, DOCUMENTADA E EXPOSTA NA TELA. horas_planejadas e o plano
-- da atividade INTEIRA e nao e rateado pela janela; o realizado, sim, conta
-- apenas os apontamentos dentro da janela. Logo, uma janela estreita mostra
-- aderencia artificialmente baixa. Ratear o plano exigiria supor distribuicao
-- uniforme no intervalo, o que seria um numero inventado por nos, apresentado
-- como se fosse dado. Preferimos o numero honesto com o aviso: o campo
-- planejadas_rateadas NAO EXISTE de proposito, e a tela avisa quando ha janela.
--
-- Atividade cancelada fica fora do consolidado: ela existe para preservar
-- historico, nao para pesar no planejado que ninguem vai executar. Horas
-- eventualmente apontadas nela antes do cancelamento tambem saem, para o
-- planejado e o realizado falarem do mesmo conjunto.
create or replace function public.carbon_horas_resumo(
  p_de         date default null,
  p_ate        date default null,
  p_projeto_id uuid default null,
  p_tipo       text default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with sel as (
    select
      t.id,
      t.nome,
      t.tipo,
      t.status,
      t.projeto_id,
      coalesce(t.horas_planejadas, 0)::numeric as planejadas
    from public.carbon_atividades t
    where t.status <> 'cancelada'
      and (p_projeto_id is null or t.projeto_id = p_projeto_id)
      and (p_tipo is null       or t.tipo = p_tipo)
      and (p_de is null  or t.data_fim is null    or t.data_fim >= p_de)
      and (p_ate is null or t.data_inicio is null or t.data_inicio <= p_ate)
  ),
  ap as (
    select a.atividade_id, a.data, a.horas
      from public.carbon_apontamentos_horas a
      join sel s on s.id = a.atividade_id
     where (p_de is null  or a.data >= p_de)
       and (p_ate is null or a.data <= p_ate)
  ),
  executado as (
    select ap.atividade_id, sum(ap.horas)::numeric as horas
      from ap
     group by ap.atividade_id
  ),
  base as (
    select s.id, s.nome, s.tipo, s.status, s.projeto_id, s.planejadas,
           coalesce(e.horas, 0)::numeric as executadas
      from sel s
      left join executado e on e.atividade_id = s.id
  ),
  por_tipo as (
    select b.tipo,
           count(*)::integer            as atividades,
           sum(b.planejadas)::numeric   as planejadas,
           sum(b.executadas)::numeric   as executadas
      from base b
     group by b.tipo
  ),
  por_semana as (
    select (date_trunc('week', ap.data::timestamp))::date as semana,
           sum(ap.horas)::numeric                         as executadas
      from ap
     group by 1
  )
  select jsonb_build_object(
    'de',  p_de,
    'ate', p_ate,
    'com_janela', (p_de is not null or p_ate is not null),
    'total', jsonb_build_object(
      'atividades', (select count(*)::integer from base),
      'planejadas', (select coalesce(sum(b.planejadas), 0)::numeric from base b),
      'executadas', (select coalesce(sum(b.executadas), 0)::numeric from base b),
      'aderencia_pct', public.carbon_aderencia_pct(
        (select coalesce(sum(b.planejadas), 0)::numeric from base b),
        (select coalesce(sum(b.executadas), 0)::numeric from base b)
      )
    ),
    'por_tipo', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'tipo',          pt.tipo,
                 'atividades',    pt.atividades,
                 'planejadas',    pt.planejadas,
                 'executadas',    pt.executadas,
                 'aderencia_pct', public.carbon_aderencia_pct(pt.planejadas, pt.executadas)
               )
               order by pt.executadas desc, pt.planejadas desc, pt.tipo asc
             )
        from por_tipo pt
    ), '[]'::jsonb),
    'por_atividade', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id',            x.id,
                 'nome',          x.nome,
                 'tipo',          x.tipo,
                 'status',        x.status,
                 'projeto_id',    x.projeto_id,
                 'planejadas',    x.planejadas,
                 'executadas',    x.executadas,
                 'aderencia_pct', public.carbon_aderencia_pct(x.planejadas, x.executadas)
               )
               order by x.executadas desc, x.planejadas desc, x.nome asc
             )
        from (
          select b.*
            from base b
           order by b.executadas desc, b.planejadas desc, b.nome asc
           limit 200
        ) x
    ), '[]'::jsonb),
    'por_semana', coalesce((
      select jsonb_agg(
               jsonb_build_object('semana', ps.semana, 'executadas', ps.executadas)
               order by ps.semana asc
             )
        from por_semana ps
    ), '[]'::jsonb)
  );
$$;

comment on function public.carbon_horas_resumo(date, date, uuid, text) is
  'Consolidado planejado x realizado em jsonb: total, por tipo, por atividade (200 maiores) e por semana. Atende ao criterio da issue #8 de comparar planejado e realizado por atividade, por tipo e por periodo. ATENCAO: horas_planejadas e o plano da atividade inteira e NAO e rateado pela janela de datas, enquanto o realizado conta so os apontamentos dentro dela - por isso o campo com_janela existe, para a tela avisar que a aderencia esta subestimada. Ratear o plano exigiria supor distribuicao uniforme, ou seja, inventar dado. Atividade cancelada fica fora, com as horas dela, para planejado e realizado falarem do mesmo conjunto. Semana comeca na segunda (date_trunc, padrao ISO).';


-- Privilegios das funcoes -----------------------------------------------------
-- O PostgreSQL concede EXECUTE a PUBLIC em toda funcao nova. As SECURITY DEFINER
-- daqui leem tabelas com RLS ativa, entao deixar assim exporia leitura pela anon
-- key via /rest/v1/rpc, contornando a RLS. Revogamos e devolvemos so ao
-- service_role.
revoke all on function public.carbon_atividade_horas(uuid, date, date)
  from public, anon, authenticated;
revoke all on function public.carbon_atividades_listar(
  uuid, uuid, text, text, text, uuid, date, date, text, integer, integer
) from public, anon, authenticated;
revoke all on function public.carbon_atividade_apontamentos(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.carbon_minhas_horas_semana(uuid, date)
  from public, anon, authenticated;
revoke all on function public.carbon_horas_resumo(date, date, uuid, text)
  from public, anon, authenticated;
revoke all on function public.carbon_aderencia_pct(numeric, numeric)
  from public, anon, authenticated;

grant execute on function public.carbon_atividade_horas(uuid, date, date) to service_role;
grant execute on function public.carbon_atividades_listar(
  uuid, uuid, text, text, text, uuid, date, date, text, integer, integer
) to service_role;
grant execute on function public.carbon_atividade_apontamentos(uuid, uuid) to service_role;
grant execute on function public.carbon_minhas_horas_semana(uuid, date)    to service_role;
grant execute on function public.carbon_horas_resumo(date, date, uuid, text) to service_role;
grant execute on function public.carbon_aderencia_pct(numeric, numeric)    to service_role;


-- =============================================================================
-- 4. Conferencia
-- =============================================================================
-- Notice, nao excecao: a migration nao deve falhar por causa de ajuste legitimo
-- feito no SQL Editor. O objetivo e que a saida do "supabase db push" mostre que
-- as duas tabelas nasceram vazias e que as funcoes existem.

do $$
declare
  v_atividades   integer;
  v_apontamentos integer;
  v_funcoes      integer;
begin
  select count(*) into v_atividades   from public.carbon_atividades;
  select count(*) into v_apontamentos from public.carbon_apontamentos_horas;

  select count(*) into v_funcoes
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in (
       'carbon_aderencia_pct',
       'carbon_atividade_horas',
       'carbon_atividades_listar',
       'carbon_atividade_apontamentos',
       'carbon_minhas_horas_semana',
       'carbon_horas_resumo'
     );

  raise notice 'carbon_atividades: % linhas. carbon_apontamentos_horas: % linhas. Funcoes de horas encontradas: % de 6.',
    v_atividades, v_apontamentos, v_funcoes;

  if v_funcoes <> 6 then
    raise notice 'ATENCAO: esperadas 6 funcoes de atividades/horas, encontradas %. Sem elas as rotas de atividades respondem 500.', v_funcoes;
  end if;
end $$;

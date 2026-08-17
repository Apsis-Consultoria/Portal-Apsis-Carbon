-- =============================================================================
-- Apsis Carbon - relatorio de monitoramento por capitulo, com rodadas de revisao
-- Arquivo: 20260814091000_monitoramento.sql
-- =============================================================================
-- Atende a issue #3 do backlog inicial (docs/issues/BACKLOG-INICIAL.md).
-- Levantamento: docs/notion/08-monitoring-report.md, base 1 (capitulos do
-- Monitoring Report). E a pagina mais referenciada do workspace (59 backlinks).
--
-- O PONTO CENTRAL DA ISSUE, e o motivo de esta migration nao ser uma copia da de
-- PDD: o status observado no Notion inclui 'Revisao 2'. O fluxo do relatorio de
-- monitoramento NAO e "rascunho -> pronto": e um ciclo com NUMERO DE VOLTA, e a
-- maioria dos subcapitulos observados estava na segunda volta. Modelar isso como
-- um enum linear (acrescentando 'revisao_1', 'revisao_2', ...) seria errado por
-- dois motivos: o enum cresceria a cada rodada nova, e a informacao "qual estado"
-- ficaria misturada com "qual volta", impossibilitando qualquer consulta do tipo
-- "quantos capitulos estao na rodada 2".
-- Por isso o status aqui e um PAR: (estado, rodada).
--   estado -> nao_iniciado, em_andamento, em_revisao, concluido, nao_aplicavel
--   rodada -> integer >= 1, default 1
-- 'Revisao 2' do Notion = (em_revisao, 2). A tela mostra "Em revisao (rodada 2)".
--
-- POR QUE A COLUNA NAO SE CHAMA `status`, como em carbon_pdd_capitulos: porque
-- aqui status nao e uma coluna, e um par. Chamar uma das metades de `status`
-- convidaria de volta exatamente a leitura booleana que a issue combate ("o
-- status e em_revisao" perde a volta). O resto do desenho e deliberadamente igual
-- ao do PDD (template copiado por projeto, progresso com nao_aplicavel fora do
-- denominador, trigger de atualizado_em, RLS sem policy), porque as duas telas
-- sao da mesma natureza e a consistencia entre elas vale mais que originalidade.
--
-- ESTRUTURA DE CAPITULOS PROPRIA. Nao e a do PDD. O monitoramento comprova
-- IMPACTO REALIZADO, e a numeracao observada no Notion pula o segundo nivel: os
-- capitulos raiz sao 1 a 5 e os subcapitulos aparecem direto em terceiro nivel
-- (4.1.1, 5.1.8). Os capitulos 1 Summary, 2 Project Details e 3 Climate nao tem
-- subcapitulo nenhum na base observada. Isso e o dado real, nao um levantamento
-- incompleto, e nao inventamos os niveis 2 que faltariam para "fechar" a arvore:
-- template de relatorio errado gera documento errado na verificacao.
--
-- ESCOPO DELIBERADAMENTE FORA. Como no PDD, esta migration RASTREIA o capitulo
-- (estado, rodada, responsavel, orientacao, observacoes) e nao guarda o TEXTO do
-- capitulo. O checklist de evidencias da auditoria (base 2 do mesmo levantamento)
-- e a issue #4 e tem tabelas proprias: nada dele entra aqui.
--
-- DEPENDE de 20260812150000_projetos_e_pdd.sql (public.carbon_projetos) e de
-- 20260807120000_init_apsis_carbon.sql (public.carbon_usuarios).
--
-- Esta migration e idempotente: pode ser reaplicada sem erro.
-- =============================================================================


-- SOBRE O LIMITE DE 99 RODADAS, que aparece duas vezes neste arquivo (no check da
-- coluna rodada e dentro de carbon_mr_capitulo_nova_rodada): nao e regra de
-- negocio, e rede de seguranca contra digitacao e contra clique repetido. Um
-- relatorio real passa por poucas voltas, e rodada 300 significa erro, nao
-- processo. A funcao confere ANTES de esbarrar no check para poder devolver um
-- erro explicado em vez de uma violacao de constraint. Mudar um exige mudar o
-- outro; o Postgres nao aceita constante compartilhada em check.


-- =============================================================================
-- 1. carbon_mr_template - estrutura padrao do relatorio por standard
-- =============================================================================
-- Tabela de referencia, nao de projeto: descreve metodologia publica (VCS+CCB),
-- nao dado de cliente. E o molde do qual cada projeto recebe sua copia. Estando
-- no banco, ajustar a estrutura quando o padrao for revisado e um INSERT, nao um
-- deploy.

create table if not exists public.carbon_mr_template (
  id         uuid primary key default gen_random_uuid(),
  standard   text not null,
  capitulo   text not null,
  nome       text not null,
  cap        integer not null,
  nivel      integer not null check (nivel between 1 and 3),
  orientacao text,
  ordem      integer not null,

  unique (standard, capitulo),

  -- Coerencia entre a numeracao e o nivel: '4' tem nivel 1, '4.1' nivel 2,
  -- '4.1.1' nivel 3. Conta os pontos da numeracao. Sem regex exigindo digito, de
  -- proposito: outros standards numeram com letra (CCB isolado usa G1, CM2.1) e
  -- esta checagem continua valendo la. Mesma constraint do template de PDD.
  constraint carbon_mr_template_nivel_coerente_chk check (
    nivel = 1 + length(capitulo) - length(replace(capitulo, '.', ''))
  )
);

comment on table public.carbon_mr_template is
  'Estrutura padrao dos capitulos do relatorio de monitoramento (Monitoring Report) por standard. Molde copiado para cada projeto por public.carbon_mr_criar_do_template. E DIFERENTE de carbon_pdd_template: o monitoramento comprova impacto realizado e tem numeracao propria, capturada em docs/notion/08-monitoring-report.md.';
comment on column public.carbon_mr_template.standard is
  'Padrao a que a estrutura pertence, ex.: VCS+CCB. Casa com carbon_projetos.standard e define qual estrutura o projeto recebe.';
comment on column public.carbon_mr_template.capitulo is
  'Numeracao hierarquica como aparece no relatorio submetido: 4, 4.1.1, 5.4.1. Texto, nao numero: 5.1.10 vem depois de 5.1.9, o que numero decimal quebraria. Na estrutura observada o segundo nivel nao existe (a numeracao vai de 4 direto para 4.1.1); isso e o dado real e nao foi "corrigido" aqui.';
comment on column public.carbon_mr_template.nome is
  'Titulo do capitulo EM INGLES, como exige a submissao ao registro. Nao traduzir: o relatorio final vai em ingles e ha finding de auditoria justamente por conteudo em portugues onde a norma pede ingles.';
comment on column public.carbon_mr_template.cap is
  'Capitulo raiz (1 a 5), para agrupar e para o progresso por grupo. Redundante em relacao a capitulo, mas evita parse de string em toda consulta. Mesma escolha do template de PDD.';
comment on column public.carbon_mr_template.nivel is
  '1 ou 3 na estrutura observada (o nivel 2 nao aparece). A coluna aceita 2 porque um standard futuro pode usar, e o recuo da arvore na tela sai daqui.';
comment on column public.carbon_mr_template.orientacao is
  'Orientacao PADRAO para quem redige o capitulo, copiada para cada projeto. Existe porque no Notion ha uma tabela lateral de comentarios por capitulo usada para instruir o redator, e essa instrucao e do PADRAO, nao do projeto: sem lugar no template, ela seria redigitada projeto a projeto. Semeada NULL de proposito: os textos observados eram de andamento de um projeto especifico ("this chapter is being revised"), nao orientacao publicada pelo padrao, e inventar orientacao tecnica em ingles para 32 capitulos seria pior do que deixar o campo vazio para a equipe preencher.';
comment on column public.carbon_mr_template.ordem is
  'Ordem de leitura do relatorio. Numerada em passos de 10 para permitir inserir capitulo entre dois existentes sem renumerar a tabela toda.';

create index if not exists carbon_mr_template_standard_ordem_idx
  on public.carbon_mr_template (standard, ordem);

-- RLS sem NENHUMA policy, DE PROPOSITO: com RLS ativa e zero policies, todo
-- acesso pela anon key e negado, inclusive leitura. So o service_role (a Edge
-- Function carbon-api, que ja validou o token do Azure AD e conferiu ativo =
-- true) alcanca a tabela. Mesmo padrao das tabelas de projeto e de PDD.
alter table public.carbon_mr_template enable row level security;
revoke all on table public.carbon_mr_template from anon, authenticated;
grant all on table public.carbon_mr_template to service_role;


-- =============================================================================
-- 2. carbon_mr_capitulos - instancia do relatorio por projeto
-- =============================================================================
-- Copia, nao referencia. O template pode ser revisado, e o relatorio de um
-- projeto ja em verificacao nao pode mudar debaixo dos pes de quem escreveu. Por
-- isso capitulo, nome, cap, nivel, ordem e orientacao sao duplicados aqui.

create table if not exists public.carbon_mr_capitulos (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references public.carbon_projetos (id) on delete cascade,
  capitulo       text not null,
  nome           text not null,
  cap            integer not null,
  nivel          integer not null check (nivel between 1 and 3),
  ordem          integer not null,

  -- METADE 1 do status: em que ponto o capitulo esta.
  estado         text not null default 'nao_iniciado'
                   check (estado in (
                     'nao_iniciado',
                     'em_andamento',
                     'em_revisao',
                     'concluido',
                     'nao_aplicavel'
                   )),

  -- METADE 2 do status: qual volta do ciclo. Ver o cabecalho do arquivo.
  rodada         integer not null default 1,

  responsavel_id uuid references public.carbon_usuarios (id),
  orientacao     text,
  observacoes    text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  unique (projeto_id, capitulo),

  constraint carbon_mr_capitulos_nivel_coerente_chk check (
    nivel = 1 + length(capitulo) - length(replace(capitulo, '.', ''))
  ),

  -- Limite superior conferido tambem em carbon_mr_capitulo_nova_rodada, para o
  -- erro chegar ao usuario como recusa explicada e nao como violacao de check.
  constraint carbon_mr_capitulos_rodada_chk check (rodada between 1 and 99)
);

comment on table public.carbon_mr_capitulos is
  'Capitulos do relatorio de monitoramento de UM projeto. Copia do template no momento da criacao, nao referencia. Rastreia (estado, rodada), responsavel, orientacao ao redator e observacoes; NAO guarda o texto do capitulo, mesma decisao tomada no PDD. Escrita somente pela Edge Function carbon-api, com papel admin ou gestor.';
comment on column public.carbon_mr_capitulos.projeto_id is
  'Projeto dono do relatorio. ON DELETE CASCADE: apagar o projeto apaga o relatorio.';
comment on column public.carbon_mr_capitulos.capitulo is
  'Numeracao hierarquica preservada do padrao (4, 4.1.1). Unica por projeto.';
comment on column public.carbon_mr_capitulos.nome is
  'Titulo em ingles, copiado do template. Editavel por projeto se o padrao mudar de nome no meio do caminho.';
comment on column public.carbon_mr_capitulos.estado is
  'Primeira metade do status: nao_iniciado, em_andamento, em_revisao, concluido ou nao_aplicavel. A segunda metade e rodada. REGRA CENTRAL herdada da issue #2 e mantida aqui: capitulo com estado nao_aplicavel sai do DENOMINADOR do progresso (ver public.carbon_mr_progresso). Aqui nao existe "criterio opcional" marcado pelo padrao, como havia no PDD: qualquer capitulo pode ser nao_aplicavel quando o projeto nao tem o que reportar (por exemplo 5.1.6 Invasive Species num projeto que nao usou especie exotica). Sem isso o relatorio nunca fecha 100%.';
comment on column public.carbon_mr_capitulos.rodada is
  'Segunda metade do status: numero da volta de revisao, comecando em 1. O status Revisao 2 observado no Notion e (estado = em_revisao, rodada = 2). Vale para qualquer estado, nao so em_revisao: (em_andamento, 2) e um capitulo devolvido na primeira revisao e sendo reescrito, e (concluido, 3) e um capitulo aprovado na terceira volta. Um capitulo pode estar em rodada 1 enquanto o resto do relatorio esta em rodada 2, e e por isso que a rodada e por capitulo e nao do relatorio: e assim que o Notion e usado hoje. Avance pela funcao public.carbon_mr_capitulo_nova_rodada, que incrementa no banco (o cliente nunca envia rodada + 1 calculada no navegador, o que perderia voltas em acesso simultaneo).';
comment on column public.carbon_mr_capitulos.responsavel_id is
  'Colaborador responsavel pelo capitulo. Referencia a carbon_usuarios em vez de texto livre: no Notion e campo de pessoa e nao ha como enxergar carga por pessoa a partir de texto.';
comment on column public.carbon_mr_capitulos.orientacao is
  'Instrucao para QUEM REDIGE o capitulo, copiada do template e ajustavel por projeto. Deliberadamente SEPARADA de observacoes: orientacao e o que a pessoa precisa ler antes de escrever, observacoes e anotacao de andamento de quem acompanha. No Notion as duas coisas dividiam a mesma coluna Comments e viravam um campo onde ninguem sabia o que era instrucao e o que era recado.';
comment on column public.carbon_mr_capitulos.observacoes is
  'Anotacao interna de andamento, em portugues. Nao e o conteudo do capitulo e nao e orientacao ao redator.';
comment on column public.carbon_mr_capitulos.atualizado_em is
  'Mantido pela trigger carbon_mr_capitulos_atualizado_em a cada UPDATE.';

-- (projeto_id, ordem): a tela sempre lista os capitulos de um projeto na ordem de
-- leitura do relatorio.
create index if not exists carbon_mr_capitulos_projeto_ordem_idx
  on public.carbon_mr_capitulos (projeto_id, ordem);

-- (projeto_id, estado): a consulta "o que esta em revisao" e a pergunta que o
-- coordenador do relatorio faz todo dia.
create index if not exists carbon_mr_capitulos_projeto_estado_idx
  on public.carbon_mr_capitulos (projeto_id, estado);


create or replace function public.carbon_mr_capitulos_set_atualizado_em()
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

comment on function public.carbon_mr_capitulos_set_atualizado_em() is
  'Mantem carbon_mr_capitulos.atualizado_em em dia a cada UPDATE. Funcao propria, e nao reuso da de carbon_pdd_capitulos, para uma tabela nao depender da migration da outra.';

drop trigger if exists carbon_mr_capitulos_atualizado_em on public.carbon_mr_capitulos;
create trigger carbon_mr_capitulos_atualizado_em
  before update on public.carbon_mr_capitulos
  for each row
  execute function public.carbon_mr_capitulos_set_atualizado_em();

alter table public.carbon_mr_capitulos enable row level security;
revoke all on table public.carbon_mr_capitulos from anon, authenticated;
grant all on table public.carbon_mr_capitulos to service_role;


-- =============================================================================
-- 3. Funcoes chamadas por RPC pela Edge Function carbon-api
-- =============================================================================
-- Todas security definer com search_path fixo. SECURITY DEFINER contorna a RLS,
-- portanto o EXECUTE e revogado de public/anon/authenticated e concedido apenas
-- ao service_role no fim desta secao. Sem essa revogacao, a anon key chamaria
-- estas funcoes pelo endpoint /rest/v1/rpc e escreveria no banco: uma porta dos
-- fundos em torno da RLS.


-- 3.1 Criar o relatorio do projeto a partir do template -----------------------
create or replace function public.carbon_mr_criar_do_template(
  p_projeto_id uuid,
  p_standard   text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_standard text;
  v_criados  integer;
begin
  -- p_standard nulo usa o standard do proprio projeto. O select tambem serve de
  -- checagem de existencia do projeto.
  select coalesce(p_standard, pr.standard)
    into v_standard
    from public.carbon_projetos pr
   where pr.id = p_projeto_id;

  if not found then
    raise exception 'projeto_nao_encontrado: nenhum projeto com id %', p_projeto_id;
  end if;

  -- IDEMPOTENTE: o ON CONFLICT usa o unique (projeto_id, capitulo), portanto
  -- rodar duas vezes nao duplica capitulo e, mais importante, NAO sobrescreve
  -- estado, rodada, responsavel, orientacao nem observacoes de capitulo que ja
  -- existe. Rodar de novo depois de o template ganhar capitulo novo acrescenta so
  -- o que falta - e o caminho de atualizacao de estrutura de um relatorio em
  -- andamento.
  insert into public.carbon_mr_capitulos (
    projeto_id, capitulo, nome, cap, nivel, ordem, orientacao
  )
  -- Sem ORDER BY de proposito: a ordem de leitura viaja na coluna ordem, nao na
  -- ordem fisica das linhas. Quem lista ordena por ordem.
  select p_projeto_id, t.capitulo, t.nome, t.cap, t.nivel, t.ordem, t.orientacao
    from public.carbon_mr_template t
   where t.standard = v_standard
  on conflict (projeto_id, capitulo) do nothing;

  get diagnostics v_criados = row_count;

  return coalesce(v_criados, 0);
end;
$$;

comment on function public.carbon_mr_criar_do_template(uuid, text) is
  'Copia do template para carbon_mr_capitulos os capitulos que o projeto ainda nao tem e devolve quantos foram criados. p_standard nulo usa o standard do projeto. Idempotente: nao duplica e nao sobrescreve estado, rodada nem textos ja preenchidos. Projeto inexistente levanta excecao projeto_nao_encontrado. Zero criados pode significar relatorio ja completo OU standard sem template cadastrado: quem chama distingue os dois pela lista de capitulos que le em seguida.';


-- 3.2 Abrir uma nova rodada de revisao de um capitulo -------------------------
-- POR QUE ISTO E UMA FUNCAO, e nao um UPDATE montado na Edge Function: a rodada
-- e um CONTADOR. Ler a rodada, somar 1 no navegador e gravar o resultado perde
-- uma volta sempre que duas pessoas devolvem o mesmo capitulo para revisao ao
-- mesmo tempo (as duas leem 2, as duas gravam 3). Aqui o incremento acontece no
-- banco, sob FOR UPDATE, e o cliente nunca envia o valor novo.
create or replace function public.carbon_mr_capitulo_nova_rodada(p_capitulo_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
  v_rodada integer;
begin
  if p_capitulo_id is null then
    return null;
  end if;

  select estado, rodada
    into v_estado, v_rodada
    from public.carbon_mr_capitulos
   where id = p_capitulo_id
     for update;

  -- NULL = capitulo inexistente. Quem chama responde 404.
  if not found then
    return null;
  end if;

  -- Capitulo fora do escopo do relatorio nao entra no ciclo de revisao: abrir
  -- rodada nele o tiraria silenciosamente do nao_aplicavel e o traria de volta
  -- para o denominador do progresso.
  if v_estado = 'nao_aplicavel' then
    raise exception 'rodada_invalida: capitulo marcado como nao aplicavel esta fora do ciclo de revisao';
  end if;

  -- Recusa ANTES do check da coluna, para o usuario receber uma explicacao em vez
  -- de uma violacao de constraint traduzida como campo_invalido.
  if v_rodada >= 99 then
    raise exception 'rodada_invalida: rodada % e o limite aceito; corrija a rodada antes de abrir outra', v_rodada;
  end if;

  update public.carbon_mr_capitulos
     set estado = 'em_revisao',
         rodada = v_rodada + 1
   where id = p_capitulo_id;

  return v_rodada + 1;
end;
$$;

comment on function public.carbon_mr_capitulo_nova_rodada(uuid) is
  'Abre a proxima rodada de revisao de um capitulo: incrementa rodada no banco e leva estado para em_revisao. Devolve a rodada nova, ou NULL quando o capitulo nao existe (a API responde 404). Levanta excecao com mensagem iniciada em rodada_invalida quando o capitulo esta nao_aplicavel ou ja alcancou o limite de rodadas; a Edge Function reconhece pela mensagem (RAISE de plpgsql sem errcode chega como P0001) e responde 409 rodada_invalida. O incremento e feito aqui, e nao no cliente, para nao perder voltas em devolucao simultanea.';


-- 3.3 Progresso do relatorio --------------------------------------------------
-- Uma unica implementacao da regra, chamada pela API. A regra de negocio e a
-- mesma do PDD (nao_aplicavel fora do denominador) mais os agregados de rodada,
-- que sao o que esta tela tem de proprio.
create or replace function public.carbon_mr_progresso(p_projeto_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select c.cap, c.estado, c.rodada
      from public.carbon_mr_capitulos c
     where c.projeto_id = p_projeto_id
  ),
  totais as (
    -- Agregacao sem GROUP BY devolve SEMPRE uma linha, inclusive com base vazia:
    -- e o que garante que projeto sem relatorio receba zeros em vez de NULL.
    select
      count(*) filter (where estado <> 'nao_aplicavel')  as total,
      count(*) filter (where estado = 'concluido')       as concluidos,
      count(*) filter (where estado = 'nao_aplicavel')   as nao_aplicaveis,
      count(*) filter (where estado = 'nao_iniciado')    as nao_iniciados,
      count(*) filter (where estado = 'em_andamento')    as em_andamento,
      count(*) filter (where estado = 'em_revisao')      as em_revisao,
      -- Rodada do RELATORIO = maior rodada entre os capitulos que contam. A
      -- rodada de um capitulo nao_aplicavel nao significa nada, por isso o filter.
      -- Relatorio vazio devolve 1, nao NULL: rodada zero nao existe.
      coalesce(max(rodada) filter (where estado <> 'nao_aplicavel'), 1) as rodada_maxima
      from base
  ),
  por_cap as (
    select
      cap,
      count(*) filter (where estado <> 'nao_aplicavel') as total,
      count(*) filter (where estado = 'concluido')      as concluidos,
      coalesce(max(rodada) filter (where estado <> 'nao_aplicavel'), 1) as rodada_maxima
      from base
     group by cap
  ),
  por_rodada as (
    -- Distribuicao das voltas. E o numero que o levantamento do Notion descreve
    -- ("a maioria dos subcapitulos esta na segunda"): sem ele a tela mostraria a
    -- rodada maxima sem dizer quantos capitulos ja chegaram nela.
    select rodada, count(*) as total
      from base
     where estado <> 'nao_aplicavel'
     group by rodada
  )
  select jsonb_build_object(
    'total',          t.total,
    'concluidos',     t.concluidos,
    'nao_aplicaveis', t.nao_aplicaveis,
    -- Guarda contra divisao por zero: projeto sem relatorio, ou com TODOS os
    -- capitulos nao_aplicavel, tem total = 0 e pct = 0.
    'pct', case
             when t.total = 0 then 0
             else round(t.concluidos * 100.0 / t.total, 1)
           end,
    'rodada_maxima', t.rodada_maxima,
    -- Objeto com as CINCO chaves sempre presentes, inclusive zeradas, para o
    -- frontend nunca precisar conferir existencia de chave.
    'por_estado', jsonb_build_object(
      'nao_iniciado',  t.nao_iniciados,
      'em_andamento',  t.em_andamento,
      'em_revisao',    t.em_revisao,
      'concluido',     t.concluidos,
      'nao_aplicavel', t.nao_aplicaveis
    ),
    'por_rodada', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object('rodada', pr.rodada, 'total', pr.total)
                 order by pr.rodada
               )
          from por_rodada pr
      ),
      '[]'::jsonb
    ),
    'por_capitulo', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'cap',        pc.cap,
                   'total',      pc.total,
                   'concluidos', pc.concluidos,
                   'pct', case
                            when pc.total = 0 then 0
                            else round(pc.concluidos * 100.0 / pc.total, 1)
                          end,
                   'rodada_maxima', pc.rodada_maxima
                 )
                 order by pc.cap
               )
          from por_cap pc
      ),
      '[]'::jsonb
    )
  )
  from totais t;
$$;

comment on function public.carbon_mr_progresso(uuid) is
  'Progresso do relatorio de monitoramento de um projeto em jsonb: total, concluidos, nao_aplicaveis, pct, rodada_maxima, por_estado (as cinco chaves sempre presentes), por_rodada e por_capitulo (por capitulo raiz, com a rodada maxima do grupo). Capitulo com estado nao_aplicavel sai do DENOMINADOR, senao o relatorio nunca fecha 100%. Nunca divide por zero: total zero devolve pct 0. Projeto sem relatorio devolve zeros, rodada_maxima 1 e listas vazias, nunca NULL.';


-- Privilegios das funcoes -----------------------------------------------------
-- O PostgreSQL concede EXECUTE a PUBLIC em toda funcao nova. Como estas sao
-- SECURITY DEFINER e duas delas escrevem, deixar assim exporia escrita pela anon
-- key via /rest/v1/rpc, contornando a RLS.
revoke all on function public.carbon_mr_criar_do_template(uuid, text)
  from public, anon, authenticated;
revoke all on function public.carbon_mr_capitulo_nova_rodada(uuid)
  from public, anon, authenticated;
revoke all on function public.carbon_mr_progresso(uuid)
  from public, anon, authenticated;

grant execute on function public.carbon_mr_criar_do_template(uuid, text)  to service_role;
grant execute on function public.carbon_mr_capitulo_nova_rodada(uuid)     to service_role;
grant execute on function public.carbon_mr_progresso(uuid)                to service_role;


-- =============================================================================
-- 4. SEED do template VCS+CCB
-- =============================================================================
-- Fonte: docs/notion/08-monitoring-report.md, secao "Estrutura de capitulos
-- capturada". Numeracao e titulos em ingles copiados LITERALMENTE.
--
-- SAO 32 LINHAS: 5 capitulos raiz (1 Summary, 2 Project Details, 3 Climate,
-- 4 Community, 5 Biodiversity), 14 subcapitulos de Community e 13 de
-- Biodiversity. Nao ha linha de segundo nivel, porque nao ha na base observada.
--
-- O levantamento registra que no Notion o agrupador aparece escrito
-- "4 - Communty", com typo, sinal de campo de TEXTO LIVRE onde deveria haver
-- selecao. O seed grava 'Community'. Corrigir e legitimo aqui justamente porque
-- estas linhas param de ser texto digitado a cada projeto: e o ganho de ter a
-- estrutura em tabela.
--
-- orientacao NAO entra no INSERT: fica NULL. Ver o comentario da coluna.
--
-- ON CONFLICT (standard, capitulo) DO NOTHING mantem a migration reaplicavel e
-- preserva ajuste manual que o dono tenha feito pelo SQL Editor.

insert into public.carbon_mr_template (standard, capitulo, nome, cap, nivel, ordem) values
  -- 1 Summary, 2 Project Details, 3 Climate: sem subcapitulo na base observada.
  ('VCS+CCB', '1',     'Summary',                                                    1, 1,  10),
  ('VCS+CCB', '2',     'Project Details',                                            2, 1,  20),
  ('VCS+CCB', '3',     'Climate',                                                    3, 1,  30),

  -- 4 Community
  ('VCS+CCB', '4',     'Community',                                                  4, 1,  40),
  ('VCS+CCB', '4.1.1', 'Community Impacts',                                          4, 3,  50),
  ('VCS+CCB', '4.1.2', 'Negative Community Impact Mitigation',                        4, 3,  60),
  ('VCS+CCB', '4.1.3', 'Net Positive Community Well-Being',                           4, 3,  70),
  ('VCS+CCB', '4.1.4', 'Protection of High Conservation Values',                      4, 3,  80),
  ('VCS+CCB', '4.2.1', 'Mitigation of Negative Impacts on Other Stakeholders',        4, 3,  90),
  ('VCS+CCB', '4.2.2', 'Net Impacts on Other Stakeholders',                           4, 3, 100),
  ('VCS+CCB', '4.3.1', 'Community Monitoring Plan',                                   4, 3, 110),
  ('VCS+CCB', '4.3.2', 'Monitoring Plan Dissemination',                               4, 3, 120),
  ('VCS+CCB', '4.4.1', 'Short-term and Long-term Community Benefits',                 4, 3, 130),
  ('VCS+CCB', '4.4.2', 'Marginalized and/or Vulnerable Community Groups',             4, 3, 140),
  ('VCS+CCB', '4.4.3', 'Net Impacts on Women',                                        4, 3, 150),
  ('VCS+CCB', '4.4.4', 'Benefit Sharing Mechanisms',                                  4, 3, 160),
  ('VCS+CCB', '4.4.5', 'Governance and Implementation Structures',                    4, 3, 170),
  ('VCS+CCB', '4.4.6', 'Smallholders/Community Members Capacity Development',         4, 3, 180),

  -- 5 Biodiversity
  ('VCS+CCB', '5',     'Biodiversity',                                               5, 1, 190),
  ('VCS+CCB', '5.1.1', 'Biodiversity Changes',                                        5, 3, 200),
  ('VCS+CCB', '5.1.2', 'Mitigation Actions',                                          5, 3, 210),
  ('VCS+CCB', '5.1.3', 'Net Positive Biodiversity Impacts',                           5, 3, 220),
  ('VCS+CCB', '5.1.4', 'High Conservation Values Protected',                          5, 3, 230),
  ('VCS+CCB', '5.1.5', 'Species Used',                                                5, 3, 240),
  ('VCS+CCB', '5.1.6', 'Invasive Species',                                            5, 3, 250),
  ('VCS+CCB', '5.1.7', 'GMO Exclusion',                                               5, 3, 260),
  ('VCS+CCB', '5.1.8', 'Inputs Justification',                                        5, 3, 270),
  ('VCS+CCB', '5.2.1', 'Negative Offsite Biodiversity Impacts and Mitigation Actions', 5, 3, 280),
  ('VCS+CCB', '5.2.2', 'Net Offsite Biodiversity Benefits',                           5, 3, 290),
  ('VCS+CCB', '5.3.1', 'Biodiversity Monitoring Plan',                                5, 3, 300),
  ('VCS+CCB', '5.3.2', 'Biodiversity Monitoring Plan Dissemination',                   5, 3, 310),
  ('VCS+CCB', '5.4.1', 'Trigger Species Population Trends',                            5, 3, 320)
on conflict (standard, capitulo) do nothing;


-- =============================================================================
-- 5. Conferencia do seed
-- =============================================================================
-- Notices, nao excecoes: a migration nao deve falhar por causa de ajuste legitimo
-- que o dono faca no template pelo SQL Editor. O objetivo e que a contagem
-- apareca na saida do "supabase db push".

do $$
declare
  v_total   integer;
  v_raizes  integer;
  v_cap4    integer;
  v_cap5    integer;
begin
  select count(*) into v_total
    from public.carbon_mr_template where standard = 'VCS+CCB';

  select count(*) into v_raizes
    from public.carbon_mr_template where standard = 'VCS+CCB' and nivel = 1;

  select count(*) into v_cap4
    from public.carbon_mr_template where standard = 'VCS+CCB' and cap = 4 and nivel > 1;

  select count(*) into v_cap5
    from public.carbon_mr_template where standard = 'VCS+CCB' and cap = 5 and nivel > 1;

  raise notice 'carbon_mr_template VCS+CCB: % capitulos (% raizes, % em Community, % em Biodiversity).',
    v_total, v_raizes, v_cap4, v_cap5;

  if v_total <> 32 then
    raise notice 'ATENCAO: esperados 32 capitulos de monitoramento, encontrados %. Ver a secao 4 e docs/notion/08-monitoring-report.md.', v_total;
  end if;

  if v_raizes <> 5 or v_cap4 <> 14 or v_cap5 <> 13 then
    raise notice 'ATENCAO: esperados 5 capitulos raiz, 14 subcapitulos em Community e 13 em Biodiversity.';
  end if;
end $$;

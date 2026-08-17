-- =============================================================================
-- Apsis Carbon - checklist de evidencias da auditoria (issue #4)
-- Arquivo: 20260814092000_evidencias.sql
-- =============================================================================
-- Atende a issue #4 do backlog inicial (docs/issues/BACKLOG-INICIAL.md), derivada
-- da base "Auditing Documents" descrita em docs/notion/08-monitoring-report.md.
--
-- O QUE E. O controle das evidencias que a validadora/verificadora (VVB) exige,
-- indexado pela secao do padrao VCS/CCB que faz a exigencia. Hoje, no Notion, o
-- status de um item e 'Anexado Pasta', ou seja "esta numa pasta em algum lugar".
-- Esse e exatamente o problema a resolver: o vinculo com o arquivo que satisfaz a
-- exigencia tem de ser um registro, nao um adjetivo.
--
-- DOIS EIXOS DE PROGRESSO INDEPENDENTES. E o criterio de aceite central da issue,
-- e a razao pela qual nao existe uma coluna unica de status nesta tabela:
--
--   status_resposta   nao_iniciado | em_andamento | concluido | nao_aplicavel
--                     -> o texto de resposta ao item foi redigido?
--   estado_evidencia  pendente | anexada | aceita | nao_aplicavel
--                     -> o arquivo que comprova existe, e a VVB aceitou?
--
-- Um item pode estar com a resposta CONCLUIDA e a evidencia PENDENTE (foi escrito
-- que o projeto tem licenca ambiental, mas o PDF da licenca nao chegou), e o
-- inverso tambem acontece (o arquivo esta no sistema e ninguem redigiu a resposta).
-- Fundir os dois eixos em uma coluna faria o checklist mentir em um dos dois lados,
-- que e justamente o que a pasta compartilhada faz hoje.
--
-- 'nao_aplicavel' E ESTADO DE PRIMEIRA CLASSE NOS DOIS EIXOS. O Notion ja usa 'N/A'
-- como status, e a razao e estrutural: parte das exigencias e do padrao CCB ou de
-- programas que o projeto nao usa. Sem tirar esses itens do DENOMINADOR, o
-- checklist nunca fecha 100% e o numero para de ser lido. Mesma regra do PDD
-- (ver public.carbon_pdd_progresso na migration 20260812150000).
--
-- O STATUS 'Juridico' DO NOTION NAO E ESTADO. O levantamento observa que 'Juridico'
-- aparece na mesma coluna de status, mas significa "encaminhado para outra area",
-- e nao um estado do documento. Por isso ele virou a coluna encaminhado_para, que
-- convive com os dois eixos: um item encaminhado ao juridico continua tendo
-- resposta em andamento e evidencia pendente. Modelado como estado, ele apagaria
-- essa informacao.
--
-- VINCULO COM DOCUMENTO E MUITOS-PARA-MUITOS, E NAO MORA AQUI. Um documento
-- satisfaz varios itens (a mesma ata de consulta serve a tres itens de FPIC) e um
-- item exige varios documentos. A tabela de ligacao e
-- public.carbon_documento_vinculos, do dominio de Documentos (issue #6), com o id de
-- carbon_evidencia_itens em alvo_id e o tipo do alvo em tipo_alvo. Esta migration
-- NAO cria nem referencia essa tabela de proposito: as duas frentes sao
-- independentes e a ordem de aplicacao das migrations nao pode importar. A
-- consequencia aceita e que nao existe FK do vinculo para o item; a integridade
-- desse lado e responsabilidade do dominio que cria a tabela de ligacao.
--
-- PENDENCIA de vocabulario, registrada e nao resolvida aqui: o contrato deste
-- dominio pede tipo_alvo = 'evidencia_item' e o dominio de Documentos grava
-- 'evidencia'. A rota de leitura (rotas/evidencias.ts) aceita os dois valores para
-- a contagem nao virar zero em silencio. Padronizar e decisao de quem consolida.
--
-- Esta migration e idempotente: pode ser reaplicada sem erro.
-- =============================================================================


-- =============================================================================
-- 1. carbon_evidencia_template - checklist padrao por standard
-- =============================================================================
-- Tabela de REFERENCIA, nao de projeto: e o molde do qual cada projeto recebe sua
-- copia, igual a carbon_pdd_template. As linhas descrevem exigencia de metodologia
-- publica (VCS+CCB), nao dado de cliente. Estando no banco, acompanhar uma revisao
-- do padrao e um INSERT, nao um deploy.

create table if not exists public.carbon_evidencia_template (
  id        uuid primary key default gen_random_uuid(),
  standard  text not null,
  codigo    text not null,
  secao     text not null,
  exigencia text not null,
  ordem     integer not null check (ordem > 0),

  unique (standard, codigo)
);

comment on table public.carbon_evidencia_template is
  'Checklist padrao de evidencias exigidas pela VVB, por standard. E o molde copiado para cada projeto por public.carbon_evidencias_criar_do_template. Fonte: base Auditing Documents descrita em docs/notion/08-monitoring-report.md. Tabela de referencia: nao guarda dado de cliente.';
comment on column public.carbon_evidencia_template.standard is
  'Padrao a que o checklist pertence, ex.: VCS+CCB. Casa com carbon_projetos.standard, que e o filtro usado na criacao do checklist do projeto.';
comment on column public.carbon_evidencia_template.codigo is
  'Chave estavel do item dentro do standard (PA-01, OWN-02). Existe por motivo tecnico, nao de negocio: e ela que torna a criacao do checklist idempotente pelo unique (projeto_id, codigo), como o numero do capitulo faz no PDD. Sem chave curta, o ON CONFLICT teria de usar o texto inteiro da exigencia, e qualquer ajuste de redacao no template passaria a criar item duplicado no projeto.';
comment on column public.carbon_evidencia_template.secao is
  'Secao do padrao VCS/CCB que exige a evidencia, no nome em INGLES usado pela VVB (Project Area, Ownership, Monitoring plan). Nao traduzir: e por esse nome que a validadora cobra o item, e a correspondencia com o relatorio dela precisa ser literal. Geral = exigencia que no Notion nao tinha secao selecionada (o levantamento a registra como "(geral)").';
comment on column public.carbon_evidencia_template.exigencia is
  'O que precisa ser entregue, na redacao usada pela equipe (coluna List of Documents do Notion). Descreve o artefato, nao o estado dele.';
comment on column public.carbon_evidencia_template.ordem is
  'Ordem de leitura do checklist, e tambem o que ordena as SECOES (a secao herda a menor ordem dos seus itens). Numerada de 10 em 10 para permitir inserir item entre dois existentes sem renumerar a tabela.';

create index if not exists carbon_evidencia_template_standard_ordem_idx
  on public.carbon_evidencia_template (standard, ordem);

alter table public.carbon_evidencia_template enable row level security;
revoke all on table public.carbon_evidencia_template from anon, authenticated;
grant all on table public.carbon_evidencia_template to service_role;


-- =============================================================================
-- 2. carbon_evidencia_itens - checklist de UM projeto
-- =============================================================================
-- Copia, nao referencia. O template pode ser revisado (o Verra revisa os seus
-- documentos), e o checklist de um projeto em auditoria nao pode mudar debaixo dos
-- pes de quem esta respondendo a VVB. Por isso codigo, secao, exigencia e ordem
-- sao duplicados aqui.

create table if not exists public.carbon_evidencia_itens (
  id               uuid primary key default gen_random_uuid(),
  projeto_id       uuid not null references public.carbon_projetos (id) on delete cascade,
  codigo           text not null,
  secao            text not null,
  exigencia        text not null,
  ordem            integer not null check (ordem > 0),

  -- EIXO 1: a resposta ao item foi redigida?
  status_resposta  text not null default 'nao_iniciado'
                     check (status_resposta in (
                       'nao_iniciado',
                       'em_andamento',
                       'concluido',
                       'nao_aplicavel'
                     )),

  -- EIXO 2: a evidencia existe e foi aceita?
  estado_evidencia text not null default 'pendente'
                     check (estado_evidencia in (
                       'pendente',
                       'anexada',
                       'aceita',
                       'nao_aplicavel'
                     )),

  responsavel_id   uuid references public.carbon_usuarios (id),

  -- Encaminhamento para outra area. NULL = ninguem esta esperando terceiro.
  encaminhado_para text check (encaminhado_para in ('juridico', 'tecnico', 'externo')),

  observacoes      text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),

  unique (projeto_id, codigo)
);

comment on table public.carbon_evidencia_itens is
  'Checklist de evidencias de UM projeto, com os DOIS eixos de progresso: status_resposta (o texto foi redigido) e estado_evidencia (o arquivo existe e foi aceito). Copia do template no momento da criacao, nao referencia. O vinculo com os arquivos e muitos-para-muitos e mora em public.carbon_documento_vinculos (dominio de Documentos), com o id do item em alvo_id.';
comment on column public.carbon_evidencia_itens.projeto_id is
  'Projeto dono do checklist. ON DELETE CASCADE: apagar o projeto apaga o checklist.';
comment on column public.carbon_evidencia_itens.codigo is
  'Copiado do template. Unico por projeto, e e o que torna a criacao do checklist idempotente.';
comment on column public.carbon_evidencia_itens.secao is
  'Secao do padrao VCS/CCB que exige o item, em ingles. Copiada do template para o checklist do projeto nao mudar se o template for revisado.';
comment on column public.carbon_evidencia_itens.exigencia is
  'O que a validadora pede. Copiado do template; editavel por projeto quando a VVB detalha a exigencia no meio do processo.';
comment on column public.carbon_evidencia_itens.status_resposta is
  'EIXO 1 de progresso: nao_iniciado, em_andamento, concluido ou nao_aplicavel. Diz respeito ao TEXTO da resposta, nunca ao arquivo. nao_aplicavel sai do denominador em public.carbon_evidencias_progresso: sem isso as exigencias que nao valem para o projeto impedem o checklist de fechar.';
comment on column public.carbon_evidencia_itens.estado_evidencia is
  'EIXO 2 de progresso, INDEPENDENTE do eixo 1: pendente, anexada, aceita ou nao_aplicavel. anexada = existe arquivo vinculado; aceita = a VVB aceitou o arquivo. A distincao e o que a pasta compartilhada nao registra hoje, e e ela que diz se o item de fato fechou. nao_aplicavel tambem sai do denominador deste eixo.';
comment on column public.carbon_evidencia_itens.responsavel_id is
  'Colaborador que responde pelo item. Referencia carbon_usuarios em vez de texto livre: no Notion e campo de pessoa solto, o que impede qualquer visao de carga por pessoa.';
comment on column public.carbon_evidencia_itens.encaminhado_para is
  'Area que precisa agir antes de o item andar, ou NULL. No Notion isso aparecia como o status ''Juridico'', que o levantamento identifica como encaminhamento e nao estado: um item no juridico continua tendo resposta em andamento e evidencia pendente. Somente ''juridico'' foi observado; ''tecnico'' e ''externo'' existem porque as bases de findings citam repasse a equipes internas e a parceiros externos. Se sobrarem sem uso, uma migration futura reduz o check.';
comment on column public.carbon_evidencia_itens.observacoes is
  'Anotacao interna, em portugues (coluna Comments do Notion): quais evidencias satisfazem o item, o que falta, com quem esta. Nao e a resposta oficial nem substitui o vinculo com o documento.';
comment on column public.carbon_evidencia_itens.atualizado_em is
  'Mantido pela trigger carbon_evidencia_itens_atualizado_em a cada UPDATE.';

create index if not exists carbon_evidencia_itens_projeto_ordem_idx
  on public.carbon_evidencia_itens (projeto_id, ordem);

create or replace function public.carbon_evidencia_itens_set_atualizado_em()
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

comment on function public.carbon_evidencia_itens_set_atualizado_em() is
  'Mantem carbon_evidencia_itens.atualizado_em em dia a cada UPDATE.';

drop trigger if exists carbon_evidencia_itens_atualizado_em on public.carbon_evidencia_itens;
create trigger carbon_evidencia_itens_atualizado_em
  before update on public.carbon_evidencia_itens
  for each row
  execute function public.carbon_evidencia_itens_set_atualizado_em();

alter table public.carbon_evidencia_itens enable row level security;
revoke all on table public.carbon_evidencia_itens from anon, authenticated;
grant all on table public.carbon_evidencia_itens to service_role;


-- =============================================================================
-- 3. Funcoes
-- =============================================================================

-- 3.1 Criar o checklist do projeto a partir do template -----------------------
create or replace function public.carbon_evidencias_criar_do_template(
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

  -- IDEMPOTENTE pelo unique (projeto_id, codigo): rodar duas vezes nao duplica
  -- item e, mais importante, NAO sobrescreve status, responsavel, encaminhamento
  -- nem observacoes de item que ja existe. Rodar de novo depois de o template
  -- ganhar exigencia nova acrescenta so o que falta - e o caminho previsto para
  -- quando a VVB pede um documento que nao estava na lista.
  insert into public.carbon_evidencia_itens (
    projeto_id, codigo, secao, exigencia, ordem
  )
  -- Sem ORDER BY de proposito: a ordem de leitura viaja na coluna ordem, nao na
  -- ordem fisica das linhas.
  select p_projeto_id, t.codigo, t.secao, t.exigencia, t.ordem
    from public.carbon_evidencia_template t
   where t.standard = v_standard
  on conflict (projeto_id, codigo) do nothing;

  get diagnostics v_criados = row_count;

  return coalesce(v_criados, 0);
end;
$$;

comment on function public.carbon_evidencias_criar_do_template(uuid, text) is
  'Copia do template para carbon_evidencia_itens os itens que o projeto ainda nao tem e devolve quantos foram criados. p_standard nulo usa o standard do projeto. Idempotente: nao duplica e nao sobrescreve estado ja preenchido. Projeto inexistente levanta excecao projeto_nao_encontrado. Zero criados pode significar checklist ja completo OU standard sem template cadastrado - quem chama distingue os dois casos pela lista de itens que le depois.';


-- 3.2 Progresso do checklist, nos DOIS eixos ----------------------------------
create or replace function public.carbon_evidencias_progresso(p_projeto_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select
        i.secao,
        i.ordem,
        i.status_resposta,
        i.estado_evidencia,
        i.encaminhado_para
      from public.carbon_evidencia_itens i
     where i.projeto_id = p_projeto_id
  ),
  totais as (
    select
      count(*)                                                        as itens,
      -- EIXO 1. Denominador exclui nao_aplicavel; numerador e so concluido.
      count(*) filter (where status_resposta <> 'nao_aplicavel')       as resposta_total,
      count(*) filter (where status_resposta = 'concluido')            as resposta_concluidos,
      count(*) filter (where status_resposta = 'em_andamento')         as resposta_em_andamento,
      count(*) filter (where status_resposta = 'nao_aplicavel')        as resposta_nao_aplicaveis,
      -- EIXO 2. Mesma regra de denominador. 'anexada' NAO conta como concluido:
      -- arquivo entregue e arquivo aceito pela VVB sao coisas diferentes, e e a
      -- segunda que fecha o item. 'anexada' viaja em campo proprio para a tela
      -- poder mostrar o quanto esta esperando aceite.
      count(*) filter (where estado_evidencia <> 'nao_aplicavel')      as evidencia_total,
      count(*) filter (where estado_evidencia = 'aceita')              as evidencia_aceitas,
      count(*) filter (where estado_evidencia = 'anexada')             as evidencia_anexadas,
      count(*) filter (where estado_evidencia = 'pendente')            as evidencia_pendentes,
      count(*) filter (where estado_evidencia = 'nao_aplicavel')       as evidencia_nao_aplicaveis,
      count(*) filter (where encaminhado_para is not null)             as encaminhados,
      -- Incoerencia PROVAVEL, nao proibida: item cuja resposta e nao aplicavel mas
      -- cuja evidencia continua pendente. Na maioria dos casos e alguem que marcou
      -- so um eixo e esqueceu o outro, e cada um desses itens deixa o eixo 2 sem
      -- fechar para sempre. Nao ha constraint bloqueando (a VVB as vezes exige
      -- declaracao justamente para o que nao se aplica), entao o numero e exposto
      -- para a tela avisar em vez de o banco recusar.
      count(*) filter (
        where status_resposta = 'nao_aplicavel' and estado_evidencia = 'pendente'
      )                                                               as na_com_evidencia_pendente
      from base
  ),
  por_secao as (
    select
      secao,
      min(ordem)                                                      as ordem,
      count(*)                                                        as itens,
      count(*) filter (where status_resposta <> 'nao_aplicavel')       as resposta_total,
      count(*) filter (where status_resposta = 'concluido')            as resposta_concluidos,
      count(*) filter (where estado_evidencia <> 'nao_aplicavel')      as evidencia_total,
      count(*) filter (where estado_evidencia = 'aceita')              as evidencia_aceitas
      from base
     group by secao
  )
  select jsonb_build_object(
    'itens', t.itens,
    'resposta', jsonb_build_object(
      'total',          t.resposta_total,
      'concluidos',     t.resposta_concluidos,
      'em_andamento',   t.resposta_em_andamento,
      'nao_aplicaveis', t.resposta_nao_aplicaveis,
      -- Guarda contra divisao por zero: projeto sem checklist, ou com TODOS os
      -- itens marcados nao_aplicavel, tem total = 0 e pct = 0.
      'pct', case
               when t.resposta_total = 0 then 0
               else round(t.resposta_concluidos * 100.0 / t.resposta_total, 1)
             end
    ),
    'evidencia', jsonb_build_object(
      'total',          t.evidencia_total,
      'aceitas',        t.evidencia_aceitas,
      'anexadas',       t.evidencia_anexadas,
      'pendentes',      t.evidencia_pendentes,
      'nao_aplicaveis', t.evidencia_nao_aplicaveis,
      'pct', case
               when t.evidencia_total = 0 then 0
               else round(t.evidencia_aceitas * 100.0 / t.evidencia_total, 1)
             end
    ),
    'encaminhados',              t.encaminhados,
    'na_com_evidencia_pendente', t.na_com_evidencia_pendente,
    'por_secao', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'secao',              ps.secao,
                   'ordem',              ps.ordem,
                   'itens',              ps.itens,
                   'resposta_total',      ps.resposta_total,
                   'resposta_concluidos', ps.resposta_concluidos,
                   'resposta_pct', case
                                     when ps.resposta_total = 0 then 0
                                     else round(ps.resposta_concluidos * 100.0 / ps.resposta_total, 1)
                                   end,
                   'evidencia_total',    ps.evidencia_total,
                   'evidencia_aceitas',  ps.evidencia_aceitas,
                   'evidencia_pct', case
                                      when ps.evidencia_total = 0 then 0
                                      else round(ps.evidencia_aceitas * 100.0 / ps.evidencia_total, 1)
                                    end
                 )
                 order by ps.ordem, ps.secao
               )
          from por_secao ps
      ),
      '[]'::jsonb
    )
  )
  from totais t;
$$;

comment on function public.carbon_evidencias_progresso(uuid) is
  'Progresso do checklist de evidencias de um projeto em jsonb, nos DOIS eixos independentes: resposta (status_resposta) e evidencia (estado_evidencia), no total e por secao do padrao. REGRA CENTRAL da issue #4: em CADA eixo, o valor nao_aplicavel sai do DENOMINADOR daquele eixo, senao o checklist nunca fecha. estado_evidencia ''anexada'' nao conta como concluido (aceito pela VVB e o que fecha), e vem em campo proprio. Nunca divide por zero e nunca devolve NULL: projeto sem checklist devolve zeros e por_secao vazio. Devolve tambem na_com_evidencia_pendente, a contagem de itens com resposta nao aplicavel e evidencia ainda pendente, para a tela avisar sobre o eixo que ficou pela metade.';


-- Privilegios das funcoes -----------------------------------------------------
-- O PostgreSQL concede EXECUTE a PUBLIC em toda funcao nova. Como estas sao
-- SECURITY DEFINER, deixar assim exporia leitura e escrita pela anon key via
-- /rest/v1/rpc, contornando a RLS. Revogamos e devolvemos so ao service_role.
revoke all on function public.carbon_evidencias_criar_do_template(uuid, text)
  from public, anon, authenticated;
revoke all on function public.carbon_evidencias_progresso(uuid)
  from public, anon, authenticated;

grant execute on function public.carbon_evidencias_criar_do_template(uuid, text) to service_role;
grant execute on function public.carbon_evidencias_progresso(uuid)               to service_role;


-- =============================================================================
-- 4. SEED do checklist VCS+CCB
-- =============================================================================
-- Fonte: docs/notion/08-monitoring-report.md, secao "Secoes e evidencias
-- exigidas" da base Auditing Documents. Sao os 26 itens capturados no
-- levantamento, com o texto da exigencia como a equipe escreve.
--
-- O nome da SECAO fica em ingles porque e o nome da secao do padrao pelo qual a
-- validadora cobra o item. O texto da EXIGENCIA fica em portugues porque e assim
-- que a equipe o registra internamente - o que vai para a VVB e o documento, nao
-- esta linha.
--
-- 'Geral' sao as duas exigencias que no Notion nao tinham secao selecionada (o
-- levantamento as marca como "(geral)"). Nao inventamos secao para elas.
--
-- NADA DE DADO DE CLIENTE AQUI: a lista descreve o que o padrao VCS+CCB exige de
-- qualquer projeto. Os comentarios do Notion, que citam os arquivos reais de um
-- projeto especifico, ficaram deliberadamente de fora.
--
-- ON CONFLICT (standard, codigo) DO NOTHING mantem a migration reaplicavel e
-- preserva ajuste manual que o dono tenha feito no SQL Editor.

-- ATENCAO: o texto da coluna exigencia APARECE NA TELA, portanto vai com
-- acentuacao correta (a regra de comentario sem acento vale so para comentario).
insert into public.carbon_evidencia_template (standard, codigo, secao, exigencia, ordem) values
  ('VCS+CCB', 'GERAL-01', 'Geral',
   'Versão em Word do PD CCB VCS', 10),
  ('VCS+CCB', 'GERAL-02', 'Geral',
   'Planilha de cálculo do NPR (com acesso ao project hub do VERRA)', 20),

  ('VCS+CCB', 'CCB-01', 'CCB unique benefits',
   'Evidência dos benefícios estimados: matriz de extrapolação dos benefícios CCB', 30),

  ('VCS+CCB', 'PA-01', 'Project Area',
   'Arquivo KML da área do projeto e da zona CCB', 40),
  ('VCS+CCB', 'PA-02', 'Project Area',
   'Mapas de uso e cobertura do solo (LULC), cobertura florestal e imagens de satélite em formato verificável', 50),
  ('VCS+CCB', 'PA-03', 'Project Area',
   'GeoPDF da área do projeto', 60),

  ('VCS+CCB', 'OWN-01', 'Ownership',
   'Acordo assinado entre o proponente e os proprietários da área', 70),
  ('VCS+CCB', 'OWN-02', 'Ownership',
   'Acordos e memorandos de entendimento (MoU) entre o proponente e outras entidades', 80),

  ('VCS+CCB', 'PSD-01', 'Project start date',
   'Evidência da data de início do projeto (uma ou várias)', 90),

  ('VCS+CCB', 'PCP-01', 'Project crediting period',
   'Planilha de cálculo das reduções e remoções de GEE (ERR sheet)', 100),
  ('VCS+CCB', 'PCP-02', 'Project crediting period',
   'Planilhas de cálculo de suporte à ERR sheet', 110),

  ('VCS+CCB', 'IMP-01', 'Implementation schedule',
   'Evidência dos marcos de desenvolvimento e implementação previstos no PD', 120),
  ('VCS+CCB', 'IMP-02', 'Implementation schedule',
   'Licenças ambientais exigidas para o estabelecimento do projeto', 130),

  ('VCS+CCB', 'DC-01', 'Double Counting and Participation under Other GHG Programs',
   'Declaração de que o projeto não está registrado, não foi rejeitado e não recebe crédito em outro programa de GEE', 140),

  ('VCS+CCB', 'DCL-01', 'Double claiming',
   'Declaração de que o projeto não recebe crédito de outro sistema ambiental', 150),

  ('VCS+CCB', 'SD-01', 'Sustainable Development Contributions',
   'Evidência dos benefícios estimados: matriz de contribuições de desenvolvimento sustentável', 160),

  ('VCS+CCB', 'STK-01', 'Stakeholder identification and consultation',
   'Documentos de consentimento livre, prévio e informado (CLPI/FPIC)', 170),
  ('VCS+CCB', 'STK-02', 'Stakeholder identification and consultation',
   'Registros das reuniões de consulta: atas e fotos', 180),
  ('VCS+CCB', 'STK-03', 'Stakeholder identification and consultation',
   'Demais documentos que comprovam a condução do CLPI/FPIC', 190),

  ('VCS+CCB', 'MGT-01', 'Management Capacity',
   'Evidência da estrutura de governança: modelo de governança e currículos da equipe técnica', 200),

  ('VCS+CCB', 'SOP-01', 'SOP',
   'Procedimento operacional padrão (SOP) das medições de biomassa', 210),
  ('VCS+CCB', 'SOP-02', 'SOP',
   'Plano de garantia e controle de qualidade (QA/QC)', 220),

  ('VCS+CCB', 'MON-01', 'Monitoring plan',
   'Community Monitoring Plan', 230),
  ('VCS+CCB', 'MON-02', 'Monitoring plan',
   'Biodiversity Monitoring Plan', 240),
  ('VCS+CCB', 'MON-03', 'Monitoring plan',
   'Adaptive Management Plan (relevante para o NPR)', 250),

  ('VCS+CCB', 'OTH-01', 'Others',
   'Coordenadas de amostragem: centroides das parcelas do inventário', 260)
on conflict (standard, codigo) do nothing;


-- =============================================================================
-- 5. Conferencia do seed
-- =============================================================================
-- Notices, nao excecoes: a migration nao deve falhar por causa de ajuste legitimo
-- que o dono faca no template pelo SQL Editor. O objetivo e a contagem aparecer na
-- saida do "supabase db push".

do $$
declare
  v_total   integer;
  v_secoes  integer;
begin
  select count(*) into v_total
    from public.carbon_evidencia_template where standard = 'VCS+CCB';

  select count(distinct secao) into v_secoes
    from public.carbon_evidencia_template where standard = 'VCS+CCB';

  raise notice 'carbon_evidencia_template VCS+CCB: % itens em % secoes.', v_total, v_secoes;

  if v_total <> 26 then
    raise notice 'ATENCAO: esperados 26 itens (os capturados em docs/notion/08-monitoring-report.md), encontrados %.', v_total;
  end if;
end $$;

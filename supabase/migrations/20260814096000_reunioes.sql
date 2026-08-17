-- =============================================================================
-- Apsis Carbon - reunioes, atas e pendencias de ata
-- Arquivo: 20260814096000_reunioes.sql
-- =============================================================================
-- Atende a issue #9 do backlog (docs/issues/BACKLOG-INICIAL.md), levantada em
-- docs/notion/01-reunioes-apsis-carbon.md e docs/notion/18-reunioes-parakana.md.
--
-- O QUE O LEVANTAMENTO ENCONTROU, E QUE JUSTIFICA CADA DECISAO AQUI:
--
--   1. DUAS bases de reuniao no Notion, uma do backoffice e uma do projeto,
--      divergindo por acidente (a coluna de data se chama "Data" em uma e
--      "Data da Reuniao" na outra). Aqui existe UMA tabela, com projeto_id
--      NULLABLE: linha sem projeto e reuniao de backoffice, linha com projeto e
--      reuniao de projeto. Repetir a divergencia no banco seria copiar o bug.
--
--   2. O TIPO da reuniao esta embutido no NOME no Notion ("Reuniao Semanal
--      Parakana - <parceiro>", "Reuniao - Modelo de governanca"). Aqui tipo e
--      COLUNA com CHECK, e parceiro e coluna propria: sem isso nao existe filtrar
--      historico por parceiro nem contar cadencia, que e o que a operacao pede.
--
--   3. A semanal SE DESDOBRA POR PARCEIRO: na mesma data existem duas reunioes
--      semanais, uma por organizacao parceira. Por isso NAO existe unique por
--      (projeto, tipo, data) - ver a nota longa na secao 1.
--
--   4. PONTOS DE ATENCAO e BARREIRAS sao colunas proprias da ata, e nao texto
--      solto dentro do conteudo, porque a pauta da reuniao semanal os exige
--      NOMINALMENTE ("identificacao dos pontos de atencao, identificacao das
--      barreiras"). Sendo campo, entram em relatorio e em busca; sendo paragrafo
--      no meio da ata, nao existem para o sistema.
--
--   5. O ACHADO QUE DA VALOR A ISSUE: no Parakana as reunioes tematicas de
--      governanca coincidem com o que os findings da Verra pedem para esclarecer.
--      Ata de reuniao de consulta e de governanca e EVIDENCIA EXIGIDA na
--      auditoria. Nascendo estruturada aqui, a ata pode ser anexada ao item de
--      evidencia em vez de ser garimpada numa pasta depois. Ver a secao 6 sobre o
--      vinculo com carbon_documento_vinculos (tipo_alvo = 'ata').
--
--   6. O ciclo real e: atividade atualizada durante a semana -> reuniao consome o
--      estado -> ata gera pendencias -> pendencias realimentam o backlog. Por isso
--      carbon_ata_pendencias.atividade_id existe: quando a pendencia vira
--      atividade, o vinculo fica guardado em vez de a informacao ser recopiada.
--
-- LGPD: nenhuma linha e semeada por esta migration. Nome de pessoa nao entra em
-- coluna nenhuma: quem redigiu a ata e quem responde por uma pendencia sao
-- REFERENCIAS a carbon_usuarios (dado funcional), nunca texto digitado.
--
-- Esta migration e idempotente: pode ser reaplicada sem erro.
-- =============================================================================


-- =============================================================================
-- 1. carbon_reunioes - base unica de reuniao (backoffice e projeto)
-- =============================================================================

create table if not exists public.carbon_reunioes (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid references public.carbon_projetos (id) on delete restrict,
  tipo           text not null
                   check (tipo in (
                     'semanal',
                     'semanal_parceiro',
                     'tematica',
                     'governanca',
                     'consulta_comunidade'
                   )),
  titulo         text not null,
  data           date not null,
  parceiro       text,
  recorrencia_id uuid,
  criado_por     uuid references public.carbon_usuarios (id),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  -- Semanal por parceiro SEM parceiro nao e um registro incompleto: e o registro
  -- errado. O tipo existe justamente para separar a plenaria da rodada por
  -- organizacao parceira, e sem o nome do parceiro as duas reunioes da mesma data
  -- voltam a ser indistinguiveis - que e exatamente o problema que o Notion tem.
  constraint carbon_reunioes_parceiro_exigido_chk check (
    tipo <> 'semanal_parceiro'
    or (parceiro is not null and btrim(parceiro) <> '')
  )
);

comment on table public.carbon_reunioes is
  'Reunioes do Apsis Carbon, base UNICA para backoffice e projeto (projeto_id nulo = backoffice). Substitui as duas bases divergentes do Notion (docs/notion/01-reunioes-apsis-carbon.md e 18-reunioes-parakana.md). Escrita somente pela Edge Function carbon-api, com papel admin ou gestor.';
comment on column public.carbon_reunioes.projeto_id is
  'Projeto ao qual a reuniao pertence. NULO de proposito significa reuniao de backoffice (a weekly da operacao), que nao pendura em projeto nenhum. ON DELETE RESTRICT: ata de reuniao de consulta e de governanca e evidencia de auditoria, e nao pode desaparecer como efeito colateral de apagar um projeto. Para tirar projeto de circulacao use carbon_projetos.ativo = false.';
comment on column public.carbon_reunioes.tipo is
  'semanal, semanal_parceiro, tematica, governanca ou consulta_comunidade. Os valores sao os observados no dado real, onde estavam embutidos no titulo. E CAMPO e nao convencao de nome porque filtrar historico por tipo, contar cadencia e saber quais atas sao evidencia de auditoria depende disso.';
comment on column public.carbon_reunioes.titulo is
  'Titulo da reuniao como a equipe a chama. Continua livre porque reuniao tematica tem nome proprio ("Modelo de governanca", "FAQ"), mas o tipo e o parceiro NAO precisam mais ser lidos daqui.';
comment on column public.carbon_reunioes.data is
  'Data da reuniao. Coluna unica para as duas bases do Notion, que divergiam entre "Data" e "Data da Reuniao".';
comment on column public.carbon_reunioes.parceiro is
  'Organizacao parceira da reuniao. TEXTO por ora, de proposito: nao existe ainda entidade de parceiro/organizacao no sistema, e criar uma aqui, adivinhando os campos, atrapalharia a issue que vai modelar isso. Obrigatorio quando tipo = semanal_parceiro (ver carbon_reunioes_parceiro_exigido_chk). Pessoa juridica, nunca pessoa fisica (LGPD).';
comment on column public.carbon_reunioes.recorrencia_id is
  'Agrupa as reunioes de uma mesma serie semanal gerada por public.carbon_reunioes_gerar_serie. A reuniao de origem tambem recebe o valor, para a serie inteira ser identificavel. NULO = reuniao cadastrada isoladamente.';
comment on column public.carbon_reunioes.criado_por is
  'Colaborador que cadastrou a reuniao. Referencia funcional para trilha de autoria, nao dado pessoal adicional.';
comment on column public.carbon_reunioes.atualizado_em is
  'Mantido pela trigger carbon_reunioes_atualizado_em a cada UPDATE.';

-- Indices ---------------------------------------------------------------------
-- A listagem padrao ordena por data decrescente (a reuniao mais recente primeiro),
-- com e sem filtro de projeto.
create index if not exists carbon_reunioes_data_idx
  on public.carbon_reunioes (data desc);

create index if not exists carbon_reunioes_projeto_data_idx
  on public.carbon_reunioes (projeto_id, data desc);

create index if not exists carbon_reunioes_tipo_data_idx
  on public.carbon_reunioes (tipo, data desc);

create index if not exists carbon_reunioes_recorrencia_idx
  on public.carbon_reunioes (recorrencia_id)
  where recorrencia_id is not null;

-- NAO EXISTE UNIQUE POR (projeto_id, tipo, data), E ISSO E DELIBERADO.
-- Duas razoes vindas do dado real:
--   1. a semanal se desdobra por parceiro, portanto DUAS reunioes semanais na
--      mesma data sao legitimas (o que as separa e a coluna parceiro);
--   2. a base do backoffice tem "Weekly (1)" e "Weekly (2)" no MESMO dia, ou seja,
--      duas reunioes do mesmo tipo, mesmo projeto (nenhum) e mesma data existem de
--      verdade. Um unique recusaria a importacao do historico.
-- A protecao contra duplicata acidental vive onde ela e de fato necessaria: a
-- geracao de serie (carbon_reunioes_gerar_serie) pula data que ja tem reuniao
-- equivalente, para clicar duas vezes no botao nao duplicar a agenda.

-- Trigger de atualizado_em ------------------------------------------------------
create or replace function public.carbon_reunioes_set_atualizado_em()
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

comment on function public.carbon_reunioes_set_atualizado_em() is
  'Mantem carbon_reunioes.atualizado_em em dia a cada UPDATE.';

drop trigger if exists carbon_reunioes_atualizado_em on public.carbon_reunioes;
create trigger carbon_reunioes_atualizado_em
  before update on public.carbon_reunioes
  for each row
  execute function public.carbon_reunioes_set_atualizado_em();

-- RLS -------------------------------------------------------------------------
-- NENHUMA policy, de proposito: com RLS ativa e zero policies todo acesso pela
-- anon key e negado, inclusive leitura, e somente o service_role (a Edge Function
-- carbon-api, que ja validou o token do Azure AD e conferiu ativo = true) alcanca
-- a tabela. Mesmo padrao de carbon_projetos e carbon_pdd_capitulos.
alter table public.carbon_reunioes enable row level security;
revoke all on table public.carbon_reunioes from anon, authenticated;
grant all on table public.carbon_reunioes to service_role;


-- =============================================================================
-- 2. carbon_atas - a ata de UMA reuniao
-- =============================================================================
-- Um para um com a reuniao (unique em reuniao_id). Nao e "documento anexado":
-- e registro estruturado, porque e ele que vira evidencia de auditoria.

create table if not exists public.carbon_atas (
  id             uuid primary key default gen_random_uuid(),
  reuniao_id     uuid not null unique references public.carbon_reunioes (id) on delete cascade,
  redigida_por   uuid references public.carbon_usuarios (id),
  conteudo       text,
  pontos_atencao text,
  barreiras      text,
  aprovada       boolean not null default false,
  aprovada_em    timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  -- Aprovacao e carimbo andam juntos: ata aprovada sem data de aprovacao nao serve
  -- como evidencia, e data de aprovacao em ata nao aprovada e lixo de edicao. Quem
  -- mantem a coerencia e a trigger; o check e a rede de seguranca para escrita que
  -- nao passe pela API.
  constraint carbon_atas_aprovacao_coerente_chk check (
    (aprovada and aprovada_em is not null)
    or (not aprovada and aprovada_em is null)
  )
);

comment on table public.carbon_atas is
  'Ata estruturada de uma reuniao. E o artefato de maior valor da issue #9: ata de reuniao de consulta e de governanca e EVIDENCIA EXIGIDA na auditoria (VVB e Verra pedem registros de reuniao de consulta e atas de CLPI). Por isso a ata nasce como registro, com campos proprios, e nao como texto colado numa pasta. O vinculo com o checklist de evidencias e feito por carbon_documento_vinculos com tipo_alvo = ''ata'' apontando para carbon_atas.id (ver secao 6 desta migration).';
comment on column public.carbon_atas.reuniao_id is
  'Reuniao da ata. UNIQUE: uma reuniao tem no maximo uma ata. ON DELETE CASCADE porque ata sem reuniao nao significa nada - e a reuniao que nao pode ser apagada de leve (a API nao expoe DELETE de reuniao justamente por isso).';
comment on column public.carbon_atas.redigida_por is
  'Colaborador que assumiu a redacao da ata (a pauta da weekly comeca exatamente com "uma pessoa assume a redacao da ata"). REFERENCIA a carbon_usuarios em vez de texto: no Notion isso e nome digitado, o que impede qualquer visao de quem esta redigindo e, sendo texto livre, convida a gravar nome de pessoa fora de controle (LGPD).';
comment on column public.carbon_atas.conteudo is
  'Corpo da ata em portugues. Deliberadamente NAO recebe os pontos de atencao nem as barreiras: eles tem coluna propria.';
comment on column public.carbon_atas.pontos_atencao is
  'Pontos de atencao levantados na reuniao. CAMPO PROPRIO porque a pauta padronizada os exige nominalmente. Sendo campo, aparecem em painel e em busca; dentro do conteudo, nao existiriam para o sistema.';
comment on column public.carbon_atas.barreiras is
  'Barreiras identificadas na reuniao. Mesmo motivo de pontos_atencao: e artefato exigido pela pauta, nao paragrafo eventual.';
comment on column public.carbon_atas.aprovada is
  'true depois de a ata ser lida e aprovada na propria reuniao (a pauta encerra com a leitura em voz alta). Ata aprovada e o que pode ser anexado como evidencia de auditoria.';
comment on column public.carbon_atas.aprovada_em is
  'Momento da aprovacao. Coluna DERIVADA: mantida pela trigger carbon_atas_before_write a partir de aprovada, e ignorada quando enviada pelo cliente. Sem isso a data de aprovacao de uma evidencia de auditoria seria editavel a mao.';
comment on column public.carbon_atas.atualizado_em is
  'Mantido pela trigger carbon_atas_before_write a cada UPDATE.';

create index if not exists carbon_atas_aprovada_idx
  on public.carbon_atas (aprovada);

-- Trigger de aprovada_em e atualizado_em ---------------------------------------
-- Uma trigger so, porque as duas coisas acontecem no mesmo BEFORE. aprovada_em e
-- DERIVADA de aprovada: preenchida na transicao para aprovada, limpa na
-- reprovacao e PRESERVADA quando a ata segue aprovada - assim nenhuma edicao
-- posterior reescreve o carimbo de aprovacao da evidencia.
create or replace function public.carbon_atas_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Ata pode nascer ja aprovada (registro lancado depois da reuniao). O carimbo
    -- enviado pelo cliente e aceito apenas nesse caso, para permitir lancamento
    -- retroativo com a data real; ausente, vale o momento do lancamento.
    if new.aprovada then
      new.aprovada_em := coalesce(new.aprovada_em, now());
    else
      new.aprovada_em := null;
    end if;
    return new;
  end if;

  new.atualizado_em := now();

  if new.aprovada and not old.aprovada then
    new.aprovada_em := now();
  elsif not new.aprovada then
    new.aprovada_em := null;
  else
    new.aprovada_em := old.aprovada_em;
  end if;

  return new;
end;
$$;

comment on function public.carbon_atas_before_write() is
  'BEFORE INSERT/UPDATE de carbon_atas: mantem aprovada_em derivada de aprovada (preenche na aprovacao, limpa na reprovacao, preserva o carimbo de ata que segue aprovada) e atualiza atualizado_em nos UPDATEs. Ignora aprovada_em enviado pelo cliente em UPDATE, de proposito: e carimbo de evidencia de auditoria.';

drop trigger if exists carbon_atas_before_write_trg on public.carbon_atas;
create trigger carbon_atas_before_write_trg
  before insert or update on public.carbon_atas
  for each row
  execute function public.carbon_atas_before_write();

alter table public.carbon_atas enable row level security;
revoke all on table public.carbon_atas from anon, authenticated;
grant all on table public.carbon_atas to service_role;


-- =============================================================================
-- 3. carbon_ata_pendencias - o que sai da reuniao e volta para o backlog
-- =============================================================================
-- Os blocos "BD - To Do" e "BD - TD Parakana" do Notion sao isto: a lista de
-- pendencias saindo da reuniao. Aqui elas sao registro, com responsavel e prazo,
-- e podem apontar para a atividade que nasceu delas.

create table if not exists public.carbon_ata_pendencias (
  id             uuid primary key default gen_random_uuid(),
  ata_id         uuid not null references public.carbon_atas (id) on delete cascade,
  descricao      text not null,
  responsavel_id uuid references public.carbon_usuarios (id),
  prazo          date,
  atividade_id   uuid,
  concluida      boolean not null default false,
  concluida_em   timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  constraint carbon_ata_pendencias_conclusao_coerente_chk check (
    (concluida and concluida_em is not null)
    or (not concluida and concluida_em is null)
  )
);

comment on table public.carbon_ata_pendencias is
  'Pendencias geradas por uma ata. O ciclo que o levantamento descreve e: atividade atualizada durante a semana -> reuniao consome o estado -> ata gera pendencias -> pendencias realimentam o backlog de atividades. atividade_id fecha esse ciclo sem recopiar informacao.';
comment on column public.carbon_ata_pendencias.ata_id is
  'Ata que gerou a pendencia. ON DELETE CASCADE: apagar a ata apaga suas pendencias.';
comment on column public.carbon_ata_pendencias.descricao is
  'O que ficou pendente, em portugues. Unico campo obrigatorio: pendencia anotada as pressas na reuniao nao pode ser barrada por falta de responsavel ou prazo.';
comment on column public.carbon_ata_pendencias.responsavel_id is
  'Colaborador responsavel. Referencia a carbon_usuarios, nunca nome digitado (LGPD e visao de carga por pessoa). ATENCAO: nao existe ainda rota que liste os colaboradores, portanto a interface exibe o responsavel mas nao consegue atribuir - a mesma limitacao ja documentada no responsavel de capitulo do PDD. A API aceita o vinculo desde ja.';
comment on column public.carbon_ata_pendencias.prazo is
  'Prazo acordado na reuniao. Nulo = sem prazo definido, que e diferente de vencido.';
comment on column public.carbon_ata_pendencias.atividade_id is
  'Atividade criada a partir desta pendencia (carbon_atividades, dominio de Atividades). Guardado para a pendencia e a atividade nao virarem duas verdades sobre o mesmo trabalho. Sem chave estrangeira declarada aqui quando a tabela de atividades ainda nao existe no banco: a secao 5 desta migration acrescenta a FK automaticamente assim que ela existir.';
comment on column public.carbon_ata_pendencias.concluida is
  'Fecha a pendencia que NAO virou atividade (a maioria: combinado curto resolvido na semana). Quando atividade_id esta preenchido, quem manda no andamento e a atividade - esta coluna serve so para tirar a linha da lista de abertas.';
comment on column public.carbon_ata_pendencias.concluida_em is
  'Momento da conclusao. Coluna DERIVADA de concluida, mantida pela trigger carbon_ata_pendencias_before_write.';
comment on column public.carbon_ata_pendencias.atualizado_em is
  'Mantido pela trigger carbon_ata_pendencias_before_write a cada UPDATE.';

create index if not exists carbon_ata_pendencias_ata_idx
  on public.carbon_ata_pendencias (ata_id);

-- Pendencia ABERTA e o que a operacao consulta; indice parcial cobre exatamente
-- esse recorte (e nao cresce com o historico de pendencia fechada).
create index if not exists carbon_ata_pendencias_abertas_idx
  on public.carbon_ata_pendencias (prazo)
  where not concluida;

create index if not exists carbon_ata_pendencias_atividade_idx
  on public.carbon_ata_pendencias (atividade_id)
  where atividade_id is not null;

create or replace function public.carbon_ata_pendencias_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.concluida then
      new.concluida_em := coalesce(new.concluida_em, now());
    else
      new.concluida_em := null;
    end if;
    return new;
  end if;

  new.atualizado_em := now();

  if new.concluida and not old.concluida then
    new.concluida_em := now();
  elsif not new.concluida then
    new.concluida_em := null;
  else
    new.concluida_em := old.concluida_em;
  end if;

  return new;
end;
$$;

comment on function public.carbon_ata_pendencias_before_write() is
  'BEFORE INSERT/UPDATE de carbon_ata_pendencias: mantem concluida_em derivada de concluida e atualizado_em nos UPDATEs. Mesmo padrao da trigger de carbon_atas.';

drop trigger if exists carbon_ata_pendencias_before_write_trg on public.carbon_ata_pendencias;
create trigger carbon_ata_pendencias_before_write_trg
  before insert or update on public.carbon_ata_pendencias
  for each row
  execute function public.carbon_ata_pendencias_before_write();

alter table public.carbon_ata_pendencias enable row level security;
revoke all on table public.carbon_ata_pendencias from anon, authenticated;
grant all on table public.carbon_ata_pendencias to service_role;


-- =============================================================================
-- 4. Funcoes chamadas por RPC pela Edge Function carbon-api
-- =============================================================================
-- Todas security definer com search_path fixo, portanto TODA referencia e
-- qualificada. O EXECUTE e revogado de public/anon/authenticated e concedido
-- apenas ao service_role no fim desta secao: sem isso a anon key chamaria estas
-- funcoes por /rest/v1/rpc e contornaria a RLS.
--
-- POR QUE A AGREGACAO VIVE AQUI, E NAO NA EDGE FUNCTION: "tem ata", "ata
-- aprovada" e "pendencias abertas" aparecem na listagem, no painel de resumo e no
-- detalhe. Escrita tres vezes, a regra divergiria na primeira mudanca (e o dataset
-- de demonstracao teria de adivinhar qual das tres copiar). Escrita uma vez, o
-- demo copia UMA definicao: pendencia aberta e a que tem concluida = false.

-- 4.1 Listagem com resumo -----------------------------------------------------
-- Devolve pagina + total + resumo em UMA chamada. O resumo e calculado sobre o
-- conjunto FILTRADO e nao sobre a pagina: contador que muda ao virar de pagina e
-- contador errado.
create or replace function public.carbon_reunioes_listar(
  p_projeto_id         uuid    default null,
  p_somente_backoffice boolean default false,
  p_tipo               text    default null,
  p_parceiro           text    default null,
  p_limite             integer default 50,
  p_deslocamento       integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with filtradas as (
    select r.*
      from public.carbon_reunioes r
     where (p_projeto_id is null or r.projeto_id = p_projeto_id)
       -- Backoffice = sem projeto. Filtro separado porque "todas as reunioes" e
       -- "as reunioes que nao sao de projeto" sao perguntas diferentes, e
       -- p_projeto_id nulo ja significa "todas".
       and (not coalesce(p_somente_backoffice, false) or r.projeto_id is null)
       and (p_tipo is null or r.tipo = p_tipo)
       -- strpos em vez de ILIKE de proposito: ILIKE trataria % e _ digitados na
       -- busca como curinga, o que confunde quem so quer procurar um nome.
       -- parceiro nulo nao casa com busca por parceiro, o que e o esperado.
       and (p_parceiro is null or strpos(lower(r.parceiro), lower(p_parceiro)) > 0)
  ),
  base as (
    select
      f.id,
      f.projeto_id,
      -- Nome do projeto resolvido aqui para a listagem nao precisar de uma segunda
      -- chamada (nem de um "join" no navegador) so para escrever a que projeto cada
      -- reuniao pertence. Nulo significa reuniao de backoffice.
      pr.nome as projeto_nome,
      f.tipo,
      f.titulo,
      f.data,
      f.parceiro,
      f.recorrencia_id,
      f.criado_em,
      f.atualizado_em,
      a.id as ata_id,
      (a.id is not null) as tem_ata,
      coalesce(a.aprovada, false) as ata_aprovada,
      coalesce(p.total, 0) as pendencias_total,
      coalesce(p.abertas, 0) as pendencias_abertas
      from filtradas f
      left join public.carbon_projetos pr on pr.id = f.projeto_id
      left join public.carbon_atas a on a.reuniao_id = f.id
      -- LATERAL com agregado: reuniao sem ata cai em count sobre conjunto vazio,
      -- que e 0, e a linha continua na listagem por causa do "on true".
      left join lateral (
        select
          count(*)                                   as total,
          count(*) filter (where not pe.concluida)   as abertas
          from public.carbon_ata_pendencias pe
         where pe.ata_id = a.id
      ) p on true
  ),
  pagina as (
    select *
      from base
     order by base.data desc, base.criado_em desc
     -- Limites tambem aqui, e nao so na Edge Function: a funcao pode ser chamada
     -- de outro lugar (SQL Editor, rotina futura) e ?limite=100000 nao pode virar
     -- um scan da tabela inteira a pedido de quem chama.
     limit least(greatest(coalesce(p_limite, 50), 1), 200)
    offset greatest(coalesce(p_deslocamento, 0), 0)
  ),
  resumo as (
    select
      count(*)                                                   as total,
      count(*) filter (where not base.tem_ata)                   as sem_ata,
      count(*) filter (where base.ata_aprovada)                   as atas_aprovadas,
      coalesce(sum(base.pendencias_abertas), 0)                   as pendencias_abertas,
      -- current_date e a data do SERVIDOR (UTC no Supabase). Diferenca de fuso
      -- pode deslocar "proxima" em algumas horas na virada do dia; e resumo de
      -- painel, nao calculo de laudo.
      min(base.data) filter (where base.data >= current_date)     as proxima_data,
      max(base.data) filter (where base.data <  current_date)     as ultima_data
      from base
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'resumo', (select to_jsonb(r) from resumo r),
    'reunioes', coalesce(
      (
        -- ORDER BY dentro do jsonb_agg: a ordem do LIMIT da CTE nao e garantida na
        -- agregacao, e listagem de reuniao fora de ordem cronologica e inutil.
        select jsonb_agg(to_jsonb(pg) order by pg.data desc, pg.criado_em desc)
          from pagina pg
      ),
      '[]'::jsonb
    )
  );
$$;

comment on function public.carbon_reunioes_listar(uuid, boolean, text, text, integer, integer) is
  'Listagem de reunioes com os agregados de ata e pendencia, mais o total e o resumo do painel, em uma unica chamada. p_projeto_id nulo = todos os escopos; p_somente_backoffice = true restringe as reunioes sem projeto. O resumo e calculado sobre o conjunto FILTRADO, nao sobre a pagina. Pendencia ABERTA e a que tem concluida = false: esta e a definicao unica, copiada pelo dataset de demonstracao do frontend.';


-- 4.2 Detalhe de uma reuniao ---------------------------------------------------
-- Reuniao + ata + pendencias em uma chamada. Devolve NENHUMA linha (null no
-- cliente) quando o id nao existe, e a API responde 404 sem consulta extra.
create or replace function public.carbon_reuniao_detalhe(p_reuniao_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'reuniao', jsonb_build_object(
      'id',                 r.id,
      'projeto_id',         r.projeto_id,
      -- Nome do projeto embutido para o cabecalho da tela nao precisar de uma
      -- segunda chamada so para descobrir a que projeto a reuniao pertence.
      'projeto_nome',       pr.nome,
      'tipo',               r.tipo,
      'titulo',             r.titulo,
      'data',               r.data,
      'parceiro',           r.parceiro,
      'recorrencia_id',     r.recorrencia_id,
      'criado_em',          r.criado_em,
      'atualizado_em',      r.atualizado_em,
      'tem_ata',            (a.id is not null),
      'ata_id',             a.id,
      'ata_aprovada',       coalesce(a.aprovada, false),
      'pendencias_total',   coalesce(p.total, 0),
      'pendencias_abertas', coalesce(p.abertas, 0)
    ),
    'ata', case
      when a.id is null then null
      else jsonb_build_object(
        'id',                a.id,
        'reuniao_id',        a.reuniao_id,
        'redigida_por',      a.redigida_por,
        -- Nome de exibicao do colaborador (dado funcional vindo do Azure AD). A
        -- tela mostra quem redigiu; o e-mail NAO sai daqui, porque nao e
        -- necessario para a leitura da ata.
        'redigida_por_nome', u.nome,
        'conteudo',          a.conteudo,
        'pontos_atencao',    a.pontos_atencao,
        'barreiras',         a.barreiras,
        'aprovada',          a.aprovada,
        'aprovada_em',       a.aprovada_em,
        'criado_em',         a.criado_em,
        'atualizado_em',     a.atualizado_em
      )
    end,
    'pendencias', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'id',               pe.id,
                   'ata_id',           pe.ata_id,
                   'descricao',        pe.descricao,
                   'responsavel_id',   pe.responsavel_id,
                   'responsavel_nome', ur.nome,
                   'prazo',            pe.prazo,
                   'atividade_id',     pe.atividade_id,
                   'concluida',        pe.concluida,
                   'concluida_em',     pe.concluida_em,
                   'criado_em',        pe.criado_em,
                   'atualizado_em',    pe.atualizado_em
                 )
                 -- Abertas primeiro, e dentro delas a de prazo mais curto: e a
                 -- ordem em que a reuniao seguinte vai cobrar.
                 order by pe.concluida, pe.prazo asc nulls last, pe.criado_em
               )
          from public.carbon_ata_pendencias pe
          left join public.carbon_usuarios ur on ur.id = pe.responsavel_id
         where pe.ata_id = a.id
      ),
      '[]'::jsonb
    )
  )
  from public.carbon_reunioes r
  left join public.carbon_projetos pr on pr.id = r.projeto_id
  left join public.carbon_atas a on a.reuniao_id = r.id
  left join public.carbon_usuarios u on u.id = a.redigida_por
  left join lateral (
    select
      count(*)                                  as total,
      count(*) filter (where not pe.concluida)  as abertas
      from public.carbon_ata_pendencias pe
     where pe.ata_id = a.id
  ) p on true
  where r.id = p_reuniao_id;
$$;

comment on function public.carbon_reuniao_detalhe(uuid) is
  'Reuniao, sua ata e as pendencias da ata em uma unica chamada, com o nome do projeto, de quem redigiu e de cada responsavel resolvidos. Devolve nenhuma linha quando a reuniao nao existe, para a API responder 404. Usa a MESMA definicao de pendencia aberta da listagem (concluida = false).';


-- 4.3 Geracao da cadencia recorrente ------------------------------------------
-- O criterio de aceite da issue e literal: "cadencia recorrente, nao cadastro
-- manual repetido". A cadencia observada e semanal e continua desde setembro de
-- 2025, portanto o intervalo e de 7 dias e a geracao parte de uma reuniao que ja
-- existe - assim titulo, parceiro, projeto e tipo sao COPIADOS, e nao redigitados
-- (redigitar e como o Notion acabou com o tipo dentro do nome).
create or replace function public.carbon_reunioes_gerar_serie(
  p_reuniao_id uuid,
  p_quantidade integer,
  p_criado_por uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Intervalo da cadencia. Constante porque a unica cadencia observada e semanal;
  -- reuniao tematica e de governanca acontece por evento, nao por calendario, e por
  -- isso nem entra aqui (ver a checagem de tipo abaixo).
  c_intervalo_dias  constant integer := 7;
  -- Meio ano de agenda por clique. Limite existe para um zero a mais no formulario
  -- nao criar mil reunioes que alguem tera de apagar uma a uma.
  c_quantidade_max  constant integer := 26;

  v_base        public.carbon_reunioes;
  v_recorrencia uuid;
  v_qtd         integer;
  v_data        date;
  v_i           integer;
  v_criadas     integer := 0;
  v_ignoradas   integer := 0;
begin
  if p_reuniao_id is null then
    raise exception 'reuniao_nao_encontrada: id nao informado';
  end if;

  v_qtd := coalesce(p_quantidade, 0);
  if v_qtd < 1 or v_qtd > c_quantidade_max then
    raise exception 'quantidade_invalida: esperado entre 1 e %, recebido %',
      c_quantidade_max, v_qtd;
  end if;

  -- FOR UPDATE serializa dois cliques simultaneos no mesmo botao: sem ele as duas
  -- chamadas leriam a mesma agenda e a checagem de duplicata de cada uma nao veria
  -- as linhas da outra.
  select * into v_base
    from public.carbon_reunioes
   where id = p_reuniao_id
     for update;

  if not found then
    raise exception 'reuniao_nao_encontrada: nenhuma reuniao com id %', p_reuniao_id;
  end if;

  if v_base.tipo not in ('semanal', 'semanal_parceiro') then
    raise exception 'tipo_nao_recorrente: %', v_base.tipo;
  end if;

  -- A serie inteira, INCLUINDO a reuniao de origem, compartilha o mesmo
  -- recorrencia_id. Gerar duas vezes a partir da mesma origem continua na mesma
  -- serie em vez de criar uma segunda.
  v_recorrencia := coalesce(v_base.recorrencia_id, gen_random_uuid());
  if v_base.recorrencia_id is null then
    update public.carbon_reunioes
       set recorrencia_id = v_recorrencia
     where id = v_base.id;
  end if;

  for v_i in 1..v_qtd loop
    v_data := v_base.data + (c_intervalo_dias * v_i);

    -- IDEMPOTENCIA: data que ja tem reuniao equivalente (mesmo projeto, mesmo
    -- tipo, mesmo parceiro) e PULADA e contada em ignoradas. "is not distinct
    -- from" e obrigatorio aqui porque projeto_id e parceiro sao nulos na weekly de
    -- backoffice, e null = null seria sempre desconhecido.
    if exists (
      select 1
        from public.carbon_reunioes r
       where r.projeto_id is not distinct from v_base.projeto_id
         and r.tipo = v_base.tipo
         and r.parceiro is not distinct from v_base.parceiro
         and r.data = v_data
    ) then
      v_ignoradas := v_ignoradas + 1;
      continue;
    end if;

    insert into public.carbon_reunioes (
      projeto_id, tipo, titulo, data, parceiro, recorrencia_id, criado_por
    ) values (
      v_base.projeto_id, v_base.tipo, v_base.titulo, v_data, v_base.parceiro,
      v_recorrencia, p_criado_por
    );

    v_criadas := v_criadas + 1;
  end loop;

  return jsonb_build_object(
    'criadas',        v_criadas,
    'ignoradas',      v_ignoradas,
    'recorrencia_id', v_recorrencia,
    'intervalo_dias', c_intervalo_dias
  );
end;
$$;

comment on function public.carbon_reunioes_gerar_serie(uuid, integer, uuid) is
  'Cria as proximas N reunioes semanais a partir de uma reuniao existente, copiando projeto, tipo, titulo e parceiro, com intervalo de 7 dias. Atende ao criterio "cadencia recorrente, nao cadastro manual repetido" da issue #9. Idempotente: data que ja tem reuniao equivalente e pulada e contada em ignoradas. Aceita apenas tipo semanal e semanal_parceiro (tematica, governanca e consulta acontecem por evento) e levanta tipo_nao_recorrente nos demais. Levanta quantidade_invalida fora da faixa 1..26 e reuniao_nao_encontrada quando o id nao existe. Devolve { criadas, ignoradas, recorrencia_id, intervalo_dias }.';


-- Privilegios das funcoes -----------------------------------------------------
revoke all on function
  public.carbon_reunioes_listar(uuid, boolean, text, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.carbon_reuniao_detalhe(uuid)
  from public, anon, authenticated;
revoke all on function public.carbon_reunioes_gerar_serie(uuid, integer, uuid)
  from public, anon, authenticated;

grant execute on function
  public.carbon_reunioes_listar(uuid, boolean, text, text, integer, integer)
  to service_role;
grant execute on function public.carbon_reuniao_detalhe(uuid)         to service_role;
grant execute on function public.carbon_reunioes_gerar_serie(uuid, integer, uuid)
  to service_role;


-- =============================================================================
-- 5. Chave estrangeira condicional de pendencia -> atividade
-- =============================================================================
-- carbon_ata_pendencias.atividade_id aponta para carbon_atividades, que pertence
-- ao dominio de Atividades e vem em OUTRA migration. Nao ha garantia de ordem
-- entre as duas: declarar a FK direto na criacao da tabela faria esta migration
-- FALHAR quando fosse aplicada primeiro, e travaria o "supabase db push" inteiro.
--
-- Por isso a coluna nasce sem FK e o vinculo e acrescentado aqui, se e quando a
-- tabela existir. Reaplicar esta migration depois de a de atividades ter rodado
-- fecha o vinculo, sem migration nova. Idempotente pela checagem em pg_constraint.
do $$
begin
  if to_regclass('public.carbon_atividades') is null then
    raise notice 'carbon_atividades ainda nao existe: carbon_ata_pendencias.atividade_id fica SEM chave estrangeira. Reaplique esta migration depois da migration de atividades para fechar o vinculo.';
    return;
  end if;

  if exists (
    select 1
      from pg_constraint
     where conname = 'carbon_ata_pendencias_atividade_id_fkey'
       and conrelid = 'public.carbon_ata_pendencias'::regclass
  ) then
    return;
  end if;

  -- ON DELETE SET NULL e nao CASCADE: apagar a atividade nao pode apagar a
  -- pendencia que a originou. A pendencia e registro da reuniao (e, via ata, parte
  -- de evidencia de auditoria); ela apenas volta a ficar sem atividade vinculada.
  --
  -- EXCEPTION obrigatoria: a tabela de atividades e de outro dominio e nao ha como
  -- garantir aqui o tipo da chave primaria dela (se nao for uuid, o ALTER falha).
  -- Sem este bloco, uma incompatibilidade quebraria o "supabase db push" INTEIRO por
  -- causa de um vinculo opcional. Com ele, sobra um aviso e o resto da migration vale.
  begin
    alter table public.carbon_ata_pendencias
      add constraint carbon_ata_pendencias_atividade_id_fkey
      foreign key (atividade_id) references public.carbon_atividades (id)
      on delete set null;

    raise notice 'Vinculo carbon_ata_pendencias.atividade_id -> carbon_atividades criado.';
  exception
    when others then
      raise notice 'Nao foi possivel criar o vinculo carbon_ata_pendencias.atividade_id -> carbon_atividades (%). A coluna continua sem chave estrangeira.', sqlerrm;
  end;
end $$;


-- =============================================================================
-- 6. Ata como evidencia de auditoria: como o vinculo e feito
-- =============================================================================
-- ESTA SECAO NAO CRIA NADA. E o registro da interface combinada com o dominio de
-- Documentos, para quem vier depois nao inventar um segundo caminho.
--
-- O vinculo entre uma ata e um item do checklist de evidencias e feito pela tabela
-- polimorfica carbon_documento_vinculos (dominio de Documentos), com
-- tipo_alvo = 'ata' e alvo_id = carbon_atas.id.
--
-- DIVERGENCIA DE VOCABULARIO A RESOLVER (nao resolvida aqui de proposito): a coluna
-- tipo_alvo aceita qualquer texto em snake_case, e a migration de Documentos
-- (20260814090000) documenta 'reuniao' na lista de exemplos, enquanto o contrato desta
-- issue pede 'ata' - o que vira evidencia e a ATA aprovada, nao a reuniao em si. As
-- duas gravacoes sao possiveis, e escolher um lado sozinho faria a contagem de vinculos
-- devolver zero em silencio. Por isso rotas/reunioes.ts LE os dois valores. Padronizar
-- e decisao de quem consolida as frentes. O mesmo caso, com os mesmos dois lados,
-- aparece entre Documentos e o checklist de evidencias ('evidencia' contra
-- 'evidencia_item').
--
-- POR QUE NAO HA FK NEM COLUNA AQUI:
--   - o vinculo e N:N (uma ata pode ser evidencia de varios itens; um item pode
--     ter varias atas), portanto nao cabe em coluna de nenhuma das duas pontas;
--   - a tabela de vinculos e polimorfica de proposito (ata, documento, relatorio),
--     e chave estrangeira polimorfica nao existe em Postgres;
--   - carbon_atas.id e uuid estavel e nunca reaproveitado, que e tudo de que o
--     lado do vinculo precisa.
--
-- O que ESTA migration garante para que o vinculo tenha valor: a ata nasce
-- estruturada, com pontos de atencao e barreiras em campo proprio, com carimbo de
-- aprovacao nao editavel a mao e com o tipo da reuniao registrado - que e como se
-- sabe, sem abrir o texto, que aquela ata e de consulta ou de governanca e
-- portanto serve de evidencia.
do $$
begin
  if to_regclass('public.carbon_documento_vinculos') is null then
    raise notice 'carbon_documento_vinculos ainda nao existe. Quando o dominio de Documentos criar a tabela, a ata deve entrar como tipo_alvo = ''ata'' apontando para carbon_atas.id (ver secao 6).';
  end if;
end $$;

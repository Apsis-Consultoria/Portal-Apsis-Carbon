-- =============================================================================
-- Apsis Carbon - entidade Projeto e template de PDD (VCS + CCB)
-- Arquivo: 20260812150000_projetos_e_pdd.sql
-- =============================================================================
-- Atende as issues #1 e #2 do backlog inicial (docs/issues/BACKLOG-INICIAL.md):
--
--   #1 Entidade Projeto: cadastro base do qual tudo depende.
--      Campos derivados dos itens 1, 3 e 4 do checklist de due diligence da
--      BeZero (docs/notion/12-be-zero.md), nao inventados.
--      Exigencia literal do item 4: a area em hectares tem de ser consistente
--      com a geometria, com aviso quando divergir mais de 5%.
--
--   #2 Template de PDD com a estrutura VCS + CCB.
--      Estrutura capturada em docs/notion/05-pdd-parakana.md, hierarquia de tres
--      niveis, numeracao preservada, progresso agregado por capitulo raiz e
--      total, e os tres criterios opcionais podendo sair do calculo.
--
-- POR QUE PostGIS. A checagem dos 5% exige area geodesica da geometria. Calcular
-- isso na aplicacao seria pior: erro de projecao, codigo proprio para reprojetar
-- e nenhum indice espacial. Com PostGIS a area sai de ST_Area sobre geography,
-- que ja e geodesica sobre o esferoide WGS84. A coluna de geometria e NULLABLE
-- de proposito: projeto sem geometria e valido, apenas nao tem a checagem.
--
-- ESCOPO DELIBERADAMENTE FORA. A issue #2 deixa em aberto se o sistema guarda o
-- TEXTO de cada capitulo do PDD ou apenas rastreia status. Esta migration segue
-- o que o Notion faz hoje: rastreia status, responsavel e observacoes. Nao ha
-- coluna de conteudo. Quando a decisao for tomada, entra em outra migration.
--
-- Esta migration e idempotente: pode ser reaplicada sem erro.
-- =============================================================================


-- =============================================================================
-- 0. PostGIS
-- =============================================================================
-- Instalado no schema extensions, que e a convencao do Supabase (nada de
-- extensao no schema public). Consequencia pratica: os tipos e funcoes ficam
-- qualificados como extensions.geometry, extensions.st_area e assim por diante.
-- Todas as funcoes abaixo usam "set search_path = ''", portanto TODA referencia
-- a PostGIS neste arquivo precisa ser qualificada. Nao remova os prefixos.

create extension if not exists postgis with schema extensions;


-- =============================================================================
-- 1. carbon_projetos - cadastro base do projeto de carbono
-- =============================================================================

create table if not exists public.carbon_projetos (
  id                        uuid primary key default gen_random_uuid(),
  nome                      text not null,
  proponente                text,
  standard                  text not null default 'VCS+CCB',
  metodologia               text,
  pais                      text not null default 'Brasil',
  estado                    text,
  municipio                 text,
  area_declarada_ha         numeric(14,4),
  geometria                 extensions.geometry(MultiPolygon, 4326),
  area_calculada_ha         numeric(14,4),
  data_inicio               date,
  periodo_creditacao_inicio date,
  periodo_creditacao_fim    date,
  status_registro           text not null default 'rascunho'
                              check (status_registro in (
                                'rascunho',
                                'em_desenvolvimento',
                                'em_validacao',
                                'registrado',
                                'em_verificacao',
                                'suspenso',
                                'encerrado'
                              )),
  registro_id               text,
  registros_anteriores      text[] not null default '{}',
  ativo                     boolean not null default true,
  criado_por                uuid references public.carbon_usuarios (id),
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz not null default now(),

  -- Periodo de creditacao coerente. So vale quando as duas pontas existem:
  -- projeto em rascunho normalmente tem uma ponta ou nenhuma.
  constraint carbon_projetos_periodo_creditacao_chk check (
    periodo_creditacao_inicio is null
    or periodo_creditacao_fim is null
    or periodo_creditacao_fim >= periodo_creditacao_inicio
  ),

  -- Areas nao negativas. Zero e permitido (dado ainda nao apurado vira NULL,
  -- nao zero), negativo e sempre erro de digitacao ou de unidade.
  constraint carbon_projetos_area_declarada_positiva_chk check (
    area_declarada_ha is null or area_declarada_ha >= 0
  ),
  constraint carbon_projetos_area_calculada_positiva_chk check (
    area_calculada_ha is null or area_calculada_ha >= 0
  )
);

comment on table public.carbon_projetos is
  'Projeto de carbono. E a entidade base do Apsis Carbon: PDD, monitoramento, findings, metas e documentos penduram nela. Os campos seguem os itens 1, 3 e 4 do checklist de due diligence da BeZero (docs/notion/12-be-zero.md). Escrita somente pela Edge Function carbon-api, com papel admin ou gestor.';
comment on column public.carbon_projetos.nome is
  'Nome do projeto como aparece na documentacao submetida ao registro. Unico campo obrigatorio: um projeto nasce em rascunho e vai sendo completado.';
comment on column public.carbon_projetos.proponente is
  'Entidade proponente do projeto (project proponent). Pessoa juridica, nunca pessoa fisica: dado de pessoa fisica nao entra aqui (LGPD).';
comment on column public.carbon_projetos.standard is
  'Padrao ao qual o projeto responde, ex.: VCS+CCB. Casa com carbon_pdd_template.standard e define qual template de PDD o projeto recebe.';
comment on column public.carbon_projetos.metodologia is
  'Metodologia aplicada, ex.: VM0048. Texto livre porque a lista muda mais rapido que o sistema.';
comment on column public.carbon_projetos.area_declarada_ha is
  'Area em hectares que a DOCUMENTACAO do projeto afirma. Preenchida a mao. E o lado humano da comparacao exigida pela BeZero.';
comment on column public.carbon_projetos.geometria is
  'Limite do projeto em MultiPolygon WGS84 (SRID 4326), vindo de Shapefile, KML, GeoPackage ou GeoJSON. NULLABLE de proposito: projeto sem geometria e valido, apenas nao tem a checagem de divergencia de area. Gravada exclusivamente por public.carbon_projeto_definir_geometria, porque cliente REST nao envia geometria de forma confiavel.';
comment on column public.carbon_projetos.area_calculada_ha is
  'Area em hectares CALCULADA da geometria, mantida pela trigger carbon_projetos_before_write. Coluna derivada: nao edite a mao, qualquer valor enviado e sobrescrito. A Edge Function compara com area_declarada_ha e devolve area_divergencia_pct e area_alerta (limite de 5%, exigencia literal do item 4 da BeZero).';
comment on column public.carbon_projetos.data_inicio is
  'Project start date, no vocabulario do padrao. Diferente do inicio do periodo de creditacao.';
comment on column public.carbon_projetos.periodo_creditacao_inicio is
  'Inicio do periodo de creditacao (crediting period).';
comment on column public.carbon_projetos.periodo_creditacao_fim is
  'Fim do periodo de creditacao. Nunca anterior ao inicio, ver carbon_projetos_periodo_creditacao_chk.';
comment on column public.carbon_projetos.status_registro is
  'Situacao do projeto perante o registro: rascunho, em_desenvolvimento, em_validacao, registrado, em_verificacao, suspenso, encerrado. O ciclo real nao e linear (um projeto registrado volta para verificacao a cada rodada), portanto isto e estado atual, nao etapa de esteira.';
comment on column public.carbon_projetos.registro_id is
  'ID do projeto no registro, ex.: numero Verra. Unico entre projetos quando preenchido, ver carbon_projetos_registro_id_uniq.';
comment on column public.carbon_projetos.registros_anteriores is
  'IDs que o projeto teve antes, quando migrou de standard ou de registro. Exigencia do item 1 da BeZero (previous IDs). Array vazio = nunca migrou.';
comment on column public.carbon_projetos.ativo is
  'false esconde o projeto das listagens sem apagar historico, PDD nem findings.';
comment on column public.carbon_projetos.criado_por is
  'Colaborador que criou o registro. Referencia funcional para trilha de autoria, nao dado pessoal adicional.';
comment on column public.carbon_projetos.atualizado_em is
  'Mantido pela trigger carbon_projetos_before_write a cada UPDATE.';

-- Indices ---------------------------------------------------------------------
-- (ativo, nome): a listagem padrao filtra ativo = true e ordena por nome.
create index if not exists carbon_projetos_ativo_nome_idx
  on public.carbon_projetos (ativo, nome);

create index if not exists carbon_projetos_status_registro_idx
  on public.carbon_projetos (status_registro);

-- Unico PARCIAL: dois projetos nao podem ter o mesmo ID no registro, mas
-- varios projetos podem estar sem ID ao mesmo tempo (rascunho). Um UNIQUE comum
-- resolveria porque NULL nao colide, mas o indice parcial deixa a intencao
-- explicita e e menor.
create unique index if not exists carbon_projetos_registro_id_uniq
  on public.carbon_projetos (registro_id)
  where registro_id is not null;

-- Indice espacial. Ainda nao ha consulta por intersecao, mas o custo de criar
-- junto e zero e uma tabela com geometria sem GIST e pegadinha classica.
create index if not exists carbon_projetos_geometria_gist
  on public.carbon_projetos using gist (geometria);


-- Area geodesica em hectares ---------------------------------------------------
-- ST_Area sobre geography devolve metros quadrados geodesicos no esferoide
-- WGS84; dividir por 10000 da hectares. Nao usamos ST_Area(geometry) porque em
-- 4326 ela devolveria graus quadrados, que nao significam nada como area.
-- Geometria invalida (auto-intersecao) nao e rejeitada de proposito: shapefile
-- de campo quase sempre tem microtopologia ruim, e barrar o cadastro por isso
-- travaria a operacao. A rede de seguranca e o aviso dos 5%.
-- Definida ANTES da trigger que a chama, de proposito.
create or replace function public.carbon_area_ha_da_geometria(p_geom extensions.geometry)
returns numeric
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when p_geom is null then null
    else round((extensions.st_area(p_geom::extensions.geography) / 10000.0)::numeric, 4)
  end;
$$;

comment on function public.carbon_area_ha_da_geometria(extensions.geometry) is
  'Area geodesica em hectares de uma geometria WGS84, via ST_Area sobre geography. Usada pela trigger de carbon_projetos.';


-- Trigger de area calculada e atualizado_em ------------------------------------
-- Uma trigger so, porque as duas coisas acontecem no mesmo BEFORE.
-- area_calculada_ha e coluna DERIVADA: e recalculada quando a geometria muda e
-- restaurada ao valor anterior quando nao muda, para que ninguem consiga
-- gravar uma area "calculada" a mao e furar a checagem dos 5%.
create or replace function public.carbon_projetos_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.area_calculada_ha := public.carbon_area_ha_da_geometria(new.geometria);
    return new;
  end if;

  new.atualizado_em := now();

  -- No PostGIS 3.x o operador = de geometry compara coordenadas, nao bounding
  -- box (isso mudou na 2.4), portanto "is distinct from" aqui e comparacao real.
  if new.geometria is distinct from old.geometria then
    new.area_calculada_ha := public.carbon_area_ha_da_geometria(new.geometria);
  else
    new.area_calculada_ha := old.area_calculada_ha;
  end if;

  return new;
end;
$$;

comment on function public.carbon_projetos_before_write() is
  'BEFORE INSERT/UPDATE de carbon_projetos: mantem area_calculada_ha derivada da geometria e atualiza atualizado_em nos UPDATEs. Ignora qualquer area_calculada_ha enviada pelo cliente, de proposito.';

drop trigger if exists carbon_projetos_before_write_trg on public.carbon_projetos;
create trigger carbon_projetos_before_write_trg
  before insert or update on public.carbon_projetos
  for each row
  execute function public.carbon_projetos_before_write();


-- RLS -------------------------------------------------------------------------
-- NENHUMA policy, DE PROPOSITO. Com RLS ativa e zero policies, todo acesso pela
-- anon key e negado, inclusive leitura. Somente o service_role (Edge Function
-- carbon-api, que ja validou o token do Azure AD e conferiu ativo = true)
-- alcanca a tabela. Mesmo padrao de carbon_modulos. A unica tabela com policy
-- para anon no projeto e carbon_app_config, e so nas linhas publicas.
alter table public.carbon_projetos enable row level security;
revoke all on table public.carbon_projetos from anon, authenticated;
grant all on table public.carbon_projetos to service_role;


-- =============================================================================
-- 2. carbon_pdd_template - estrutura padrao de PDD por standard
-- =============================================================================
-- Tabela de referencia, nao de projeto. E o molde do qual cada projeto recebe
-- sua copia. Estando no banco, ajustar a estrutura do padrao (o proprio Verra
-- revisa os templates) e um INSERT, nao um deploy.

create table if not exists public.carbon_pdd_template (
  id       uuid primary key default gen_random_uuid(),
  standard text not null,
  capitulo text not null,
  nome     text not null,
  cap      integer not null,
  nivel    integer not null check (nivel between 1 and 3),
  opcional boolean not null default false,
  ordem    integer not null,

  unique (standard, capitulo),

  -- Coerencia entre a numeracao e o nivel: '2' tem nivel 1, '2.2' nivel 2,
  -- '2.2.1' nivel 3. Conta os pontos da numeracao. Nao ha regex exigindo
  -- numeros de proposito: outros standards numeram com letra (CCB isolado usa
  -- G1, CM2.1) e esta checagem continua valendo la.
  constraint carbon_pdd_template_nivel_coerente_chk check (
    nivel = 1 + length(capitulo) - length(replace(capitulo, '.', ''))
  )
);

comment on table public.carbon_pdd_template is
  'Estrutura padrao dos capitulos do PDD por standard. E o molde copiado para cada projeto por public.carbon_pdd_criar_do_template. Tabela de referencia: as linhas descrevem metodologia publica (VCS+CCB), nao dado de cliente.';
comment on column public.carbon_pdd_template.standard is
  'Padrao a que a estrutura pertence, ex.: VCS+CCB. Casa com carbon_projetos.standard.';
comment on column public.carbon_pdd_template.capitulo is
  'Numeracao hierarquica do capitulo como aparece no documento submetido: 1, 1.1, 2.2.1. Texto, nao numero: 2.10 vem depois de 2.9, o que numero decimal quebraria.';
comment on column public.carbon_pdd_template.nome is
  'Titulo do capitulo EM INGLES, como exige a submissao ao Verra. Nao traduzir: o documento final vai em ingles e vario finding de auditoria existe justamente por conteudo em portugues onde a norma pede ingles.';
comment on column public.carbon_pdd_template.cap is
  'Capitulo raiz (1 a 5), usado para agrupar e para o progresso por grupo. Redundante em relacao a capitulo, mas evita parse de string em toda consulta.';
comment on column public.carbon_pdd_template.nivel is
  '1, 2 ou 3. Define o recuo na arvore da tela de PDD.';
comment on column public.carbon_pdd_template.opcional is
  'true nos capitulos que o proprio padrao chama de Optional Criterion (3.4, 4.5 e 5.5). Sao os que podem receber status nao_aplicavel e sair do denominador do progresso. Sem isso o PDD nunca fecha 100%.';
comment on column public.carbon_pdd_template.ordem is
  'Ordem de leitura do documento. Numerada em passos de 10 para permitir inserir capitulo entre dois existentes sem renumerar a tabela toda.';

create index if not exists carbon_pdd_template_standard_ordem_idx
  on public.carbon_pdd_template (standard, ordem);

alter table public.carbon_pdd_template enable row level security;
revoke all on table public.carbon_pdd_template from anon, authenticated;
grant all on table public.carbon_pdd_template to service_role;


-- =============================================================================
-- 3. carbon_pdd_capitulos - instancia do PDD por projeto
-- =============================================================================
-- Copia, nao referencia. O template pode mudar (o Verra revisa), e o PDD de um
-- projeto ja submetido nao pode mudar debaixo dos pes de quem escreveu. Por isso
-- capitulo, nome, cap, nivel e opcional sao duplicados aqui.

create table if not exists public.carbon_pdd_capitulos (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references public.carbon_projetos (id) on delete cascade,
  capitulo       text not null,
  nome           text not null,
  cap            integer not null,
  nivel          integer not null check (nivel between 1 and 3),
  opcional       boolean not null default false,
  ordem          integer not null,
  status         text not null default 'nao_iniciado'
                   check (status in (
                     'nao_iniciado',
                     'em_andamento',
                     'em_revisao',
                     'concluido',
                     'nao_aplicavel'
                   )),
  responsavel_id uuid references public.carbon_usuarios (id),
  observacoes    text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  unique (projeto_id, capitulo),

  constraint carbon_pdd_capitulos_nivel_coerente_chk check (
    nivel = 1 + length(capitulo) - length(replace(capitulo, '.', ''))
  )
);

comment on table public.carbon_pdd_capitulos is
  'Capitulos do PDD de UM projeto, com status e responsavel. Copia do template no momento da criacao, nao referencia: o template pode ser revisado pelo Verra e o PDD de um projeto em andamento nao pode mudar sozinho. Rastreia status, nao conteudo: a decisao de guardar o texto dos capitulos ficou pendente na issue #2.';
comment on column public.carbon_pdd_capitulos.projeto_id is
  'Projeto dono do PDD. ON DELETE CASCADE: apagar o projeto apaga o PDD.';
comment on column public.carbon_pdd_capitulos.capitulo is
  'Numeracao hierarquica preservada do padrao (1, 1.1, 2.2.1). Unica por projeto.';
comment on column public.carbon_pdd_capitulos.nome is
  'Titulo em ingles, copiado do template. Editavel por projeto se o padrao mudar de nome no meio do caminho.';
comment on column public.carbon_pdd_capitulos.opcional is
  'Copiado do template. Sinaliza na tela o selo Opcional nos Optional Criterion (3.4, 4.5, 5.5).';
comment on column public.carbon_pdd_capitulos.status is
  'nao_iniciado, em_andamento, em_revisao, concluido ou nao_aplicavel. REGRA CENTRAL da issue #2: nao_aplicavel sai do DENOMINADOR do progresso, ver public.carbon_pdd_progresso. Sem isso os tres criterios opcionais impedem o PDD de fechar 100% para sempre.';
comment on column public.carbon_pdd_capitulos.responsavel_id is
  'Colaborador responsavel pelo capitulo. Referencia a carbon_usuarios em vez de texto livre: no Notion isso e texto com iniciais, o que impede qualquer visao de carga por pessoa.';
comment on column public.carbon_pdd_capitulos.observacoes is
  'Anotacao interna de andamento, em portugues. Nao e o conteudo do capitulo.';
comment on column public.carbon_pdd_capitulos.atualizado_em is
  'Mantido pela trigger carbon_pdd_capitulos_atualizado_em a cada UPDATE.';

create index if not exists carbon_pdd_capitulos_projeto_ordem_idx
  on public.carbon_pdd_capitulos (projeto_id, ordem);

create or replace function public.carbon_pdd_capitulos_set_atualizado_em()
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

comment on function public.carbon_pdd_capitulos_set_atualizado_em() is
  'Mantem carbon_pdd_capitulos.atualizado_em em dia a cada UPDATE.';

drop trigger if exists carbon_pdd_capitulos_atualizado_em on public.carbon_pdd_capitulos;
create trigger carbon_pdd_capitulos_atualizado_em
  before update on public.carbon_pdd_capitulos
  for each row
  execute function public.carbon_pdd_capitulos_set_atualizado_em();

alter table public.carbon_pdd_capitulos enable row level security;
revoke all on table public.carbon_pdd_capitulos from anon, authenticated;
grant all on table public.carbon_pdd_capitulos to service_role;


-- =============================================================================
-- 4. Funcoes chamadas por RPC pela Edge Function carbon-api
-- =============================================================================
-- Todas security definer com search_path fixo. SECURITY DEFINER contorna a RLS,
-- portanto o EXECUTE e revogado de public/anon/authenticated e concedido apenas
-- ao service_role no fim desta secao. Sem essa revogacao, a anon key chamaria
-- estas funcoes pelo endpoint /rest/v1/rpc e escreveria no banco: seria uma
-- porta dos fundos aberta em torno da RLS.

-- 4.0 Converter GeoJSON em MultiPolygon 4326 ----------------------------------
-- Conversao isolada em funcao propria porque DOIS caminhos de escrita precisam
-- dela (definir geometria na criacao e atualizar projeto), e duplicar a validacao
-- garantiria divergencia entre os dois na primeira mudanca.
-- Toda recusa levanta excecao com mensagem iniciada em 'geometria_invalida:',
-- que e como a Edge Function reconhece o caso e responde 400 geometria_invalida.
create or replace function public.carbon_geometria_do_geojson(p_geojson jsonb)
returns extensions.geometry
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_geom extensions.geometry;
  v_tipo text;
begin
  -- NULL (ou o literal JSON null) significa "sem geometria". A trigger zera a
  -- area calculada em seguida, e o projeto volta a ser um projeto sem checagem.
  if p_geojson is null or jsonb_typeof(p_geojson) = 'null' then
    return null;
  end if;

  -- ST_GeomFromGeoJSON levanta excecao propria em GeoJSON malformado. Envolvemos
  -- para devolver sempre a mesma mensagem.
  begin
    v_geom := extensions.st_setsrid(
                extensions.st_geomfromgeojson(p_geojson::text),
                4326
              );
  exception
    when others then
      raise exception 'geometria_invalida: GeoJSON nao interpretavel como geometria (%)', sqlerrm;
  end;

  if v_geom is null then
    raise exception 'geometria_invalida: GeoJSON resultou em geometria nula';
  end if;

  v_tipo := extensions.geometrytype(v_geom);
  if v_tipo is null or v_tipo not in ('POLYGON', 'MULTIPOLYGON') then
    raise exception 'geometria_invalida: esperado Polygon ou MultiPolygon, recebido %',
      coalesce(v_tipo, 'nulo');
  end if;

  if extensions.st_isempty(v_geom) then
    raise exception 'geometria_invalida: geometria vazia, sem area';
  end if;

  -- ST_Multi promove Polygon a MultiPolygon; MultiPolygon passa intacto. A coluna
  -- tem typmod MultiPolygon/4326, entao qualquer outra coisa seria recusada pelo
  -- proprio tipo. A area e recalculada pela trigger, nao aqui.
  return extensions.st_multi(v_geom);
end;
$$;

comment on function public.carbon_geometria_do_geojson(jsonb) is
  'Converte GeoJSON (Polygon ou MultiPolygon) em MultiPolygon SRID 4326, ou NULL quando o argumento e nulo. GeoJSON invalido, tipo errado ou geometria vazia levantam excecao com mensagem iniciada em geometria_invalida, que a Edge Function carbon-api traduz em 400 geometria_invalida. Usada por carbon_projeto_definir_geometria e por carbon_projeto_atualizar.';


-- 4.1 Gravar geometria a partir de GeoJSON ------------------------------------
-- Existe porque o supabase-js nao serializa geometria: enviar WKT ou GeoJSON em
-- um insert comum grava texto invalido ou falha. A conversao acontece aqui, no
-- banco, onde o PostGIS esta. Usada no caminho de CRIACAO; na atualizacao quem
-- grava e carbon_projeto_atualizar, para geometria e campos irem na MESMA
-- transacao.
create or replace function public.carbon_projeto_definir_geometria(
  p_projeto_id uuid,
  p_geojson    jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_projeto_id is null then
    raise exception 'geometria_invalida: projeto_id nao informado';
  end if;

  update public.carbon_projetos
     set geometria = public.carbon_geometria_do_geojson(p_geojson)
   where id = p_projeto_id;

  if not found then
    raise exception 'projeto_nao_encontrado: nenhum projeto com id %', p_projeto_id;
  end if;
end;
$$;

comment on function public.carbon_projeto_definir_geometria(uuid, jsonb) is
  'Grava o limite do projeto a partir de GeoJSON (Polygon ou MultiPolygon), convertendo para MultiPolygon SRID 4326 via carbon_geometria_do_geojson. Deixa a trigger recalcular area_calculada_ha. GeoJSON invalido levanta excecao geometria_invalida. p_geojson nulo limpa a geometria. Usada no POST /projetos; no PATCH quem escreve e carbon_projeto_atualizar.';


-- 4.1b Atualizar projeto (campos e geometria) em UMA transacao ----------------
-- POR QUE ESTA FUNCAO EXISTE. A Edge Function nao tem transacao: duas chamadas
-- ao banco sao dois commits. Enquanto o PATCH gravava a geometria em uma chamada
-- e os demais campos em outra, uma recusa da segunda (registro_id duplicado,
-- check de periodo, data invalida) devolvia erro ao cliente com a geometria JA
-- substituida e a area calculada JA regravada - perda silenciosa, porque a
-- coluna nao tem historico e o cliente foi informado de que nada mudou.
-- Aqui as duas escritas acontecem no mesmo UPDATE, portanto na mesma transacao:
-- qualquer recusa desfaz tudo.
--
-- p_dados e o objeto de gravacao ja validado pela Edge Function (lista branca de
-- campos, tipos conferidos). jsonb_populate_record parte da linha ATUAL, logo:
-- chave ausente mantem o valor de hoje, chave com null limpa a coluna, chave
-- desconhecida e ignorada pelo proprio jsonb_populate_record.
create or replace function public.carbon_projeto_atualizar(
  p_projeto_id     uuid,
  p_dados          jsonb   default '{}'::jsonb,
  p_mexe_geometria boolean default false,
  p_geojson        jsonb   default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atual public.carbon_projetos;
  v_novo  public.carbon_projetos;
begin
  if p_projeto_id is null then
    return false;
  end if;

  -- FOR UPDATE serializa dois PATCH simultaneos no mesmo projeto: sem ele o
  -- segundo leria a linha antiga e poderia reescrever campo que o primeiro
  -- acabou de mudar.
  select * into v_atual
    from public.carbon_projetos
   where id = p_projeto_id
     for update;

  if not found then
    return false;
  end if;

  v_novo := jsonb_populate_record(v_atual, coalesce(p_dados, '{}'::jsonb));

  -- Segunda barreira, alem da lista branca da Edge Function: colunas que esta
  -- funcao nunca deixa o cliente tocar, mesmo que venham em p_dados. Autoria e
  -- criacao sao trilha; a geometria tem caminho proprio logo abaixo.
  -- area_calculada_ha e atualizado_em nao aparecem no UPDATE de proposito: quem
  -- mantem as duas e a trigger carbon_projetos_before_write.
  v_novo.id         := v_atual.id;
  v_novo.criado_por := v_atual.criado_por;
  v_novo.criado_em  := v_atual.criado_em;
  v_novo.geometria  := v_atual.geometria;

  -- p_mexe_geometria distingue "nao mandou geometria" (mantem) de "mandou null"
  -- (limpa). Um p_geojson nulo sozinho nao diria qual dos dois e.
  if p_mexe_geometria then
    v_novo.geometria := public.carbon_geometria_do_geojson(p_geojson);
  end if;

  update public.carbon_projetos set
      nome                      = v_novo.nome,
      proponente                = v_novo.proponente,
      standard                  = v_novo.standard,
      metodologia               = v_novo.metodologia,
      pais                      = v_novo.pais,
      estado                    = v_novo.estado,
      municipio                 = v_novo.municipio,
      area_declarada_ha         = v_novo.area_declarada_ha,
      geometria                 = v_novo.geometria,
      data_inicio               = v_novo.data_inicio,
      periodo_creditacao_inicio = v_novo.periodo_creditacao_inicio,
      periodo_creditacao_fim    = v_novo.periodo_creditacao_fim,
      status_registro           = v_novo.status_registro,
      registro_id               = v_novo.registro_id,
      registros_anteriores      = v_novo.registros_anteriores,
      ativo                     = v_novo.ativo
   where id = p_projeto_id;

  return true;
end;
$$;

comment on function public.carbon_projeto_atualizar(uuid, jsonb, boolean, jsonb) is
  'Atualiza campos e geometria de um projeto em UMA transacao, evitando a escrita parcial que duas chamadas separadas da Edge Function produziriam (geometria trocada com o resto recusado). Devolve false quando o projeto nao existe, para a API responder 404. p_dados: objeto ja validado pela Edge Function; chave ausente mantem, null limpa. p_mexe_geometria = false mantem a geometria atual; true grava p_geojson (null limpa). Ignora id, criado_por, criado_em e area_calculada_ha vindos em p_dados. GeoJSON invalido levanta excecao geometria_invalida e desfaz tudo.';


-- 4.2 Ler a geometria como GeoJSON --------------------------------------------
-- Contrapartida da funcao acima: um SELECT comum na coluna devolve WKB em
-- hexadecimal, que nao serve para o frontend. Usada no GET /projetos/:id.
create or replace function public.carbon_projeto_geojson(p_projeto_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p.geometria is null then null
    else extensions.st_asgeojson(p.geometria)::jsonb
  end
  from public.carbon_projetos p
  where p.id = p_projeto_id;
$$;

comment on function public.carbon_projeto_geojson(uuid) is
  'Devolve a geometria do projeto como GeoJSON (jsonb), ou NULL quando o projeto nao tem geometria ou nao existe. Existe porque SELECT direto na coluna devolve WKB hexadecimal, inutil para o navegador.';


-- 4.3 Criar o PDD do projeto a partir do template ------------------------------
create or replace function public.carbon_pdd_criar_do_template(
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
  -- Quando p_standard vem nulo, usa o standard do proprio projeto. O select
  -- tambem serve de checagem de existencia do projeto.
  select coalesce(p_standard, pr.standard)
    into v_standard
    from public.carbon_projetos pr
   where pr.id = p_projeto_id;

  if not found then
    raise exception 'projeto_nao_encontrado: nenhum projeto com id %', p_projeto_id;
  end if;

  -- IDEMPOTENTE: o ON CONFLICT usa o unique (projeto_id, capitulo), portanto
  -- rodar duas vezes nao duplica capitulo e, mais importante, NAO sobrescreve
  -- status, responsavel nem observacoes de capitulo que ja existe. Rodar de novo
  -- depois de o template ganhar capitulo novo acrescenta so o que falta.
  insert into public.carbon_pdd_capitulos (
    projeto_id, capitulo, nome, cap, nivel, opcional, ordem
  )
  -- Sem ORDER BY de proposito: a ordem de leitura viaja na coluna ordem, nao na
  -- ordem fisica das linhas. Quem lista ordena por ordem.
  select p_projeto_id, t.capitulo, t.nome, t.cap, t.nivel, t.opcional, t.ordem
    from public.carbon_pdd_template t
   where t.standard = v_standard
  on conflict (projeto_id, capitulo) do nothing;

  get diagnostics v_criados = row_count;

  return coalesce(v_criados, 0);
end;
$$;

comment on function public.carbon_pdd_criar_do_template(uuid, text) is
  'Copia do template para carbon_pdd_capitulos os capitulos que o projeto ainda nao tem e devolve quantos foram criados. p_standard nulo usa o standard do projeto. Idempotente: nao duplica e nao sobrescreve status ja preenchido. Projeto inexistente levanta excecao projeto_nao_encontrado. Zero criados pode significar PDD ja completo OU standard sem template cadastrado.';


-- 4.4 Progresso do PDD ---------------------------------------------------------
create or replace function public.carbon_pdd_progresso(p_projeto_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select c.cap, c.status
      from public.carbon_pdd_capitulos c
     where c.projeto_id = p_projeto_id
  ),
  totais as (
    select
      count(*) filter (where status <> 'nao_aplicavel')  as total,
      count(*) filter (where status = 'concluido')       as concluidos,
      count(*) filter (where status = 'nao_aplicavel')   as nao_aplicaveis
      from base
  ),
  por_cap as (
    select
      cap,
      count(*) filter (where status <> 'nao_aplicavel') as total,
      count(*) filter (where status = 'concluido')      as concluidos
      from base
     group by cap
  )
  select jsonb_build_object(
    'total',          t.total,
    'concluidos',     t.concluidos,
    'nao_aplicaveis', t.nao_aplicaveis,
    -- Guarda contra divisao por zero: projeto sem PDD, ou com TODOS os capitulos
    -- marcados nao_aplicavel, tem total = 0 e pct = 0.
    'pct', case
             when t.total = 0 then 0
             else round(t.concluidos * 100.0 / t.total, 1)
           end,
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
                          end
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

comment on function public.carbon_pdd_progresso(uuid) is
  'Progresso do PDD de um projeto em jsonb: total, concluidos, nao_aplicaveis, pct e por_capitulo (por capitulo raiz). REGRA CENTRAL da issue #2: capitulo com status nao_aplicavel sai do DENOMINADOR, senao os tres Optional Criterion (3.4, 4.5, 5.5) impedem o PDD de fechar 100%. Nunca divide por zero: total zero devolve pct 0. Projeto sem PDD devolve zeros e por_capitulo vazio, nao NULL.';


-- Privilegios das funcoes -----------------------------------------------------
-- O PostgreSQL concede EXECUTE a PUBLIC em toda funcao nova. Como estas sao
-- SECURITY DEFINER e escrevem, deixar assim exporia escrita pela anon key via
-- /rest/v1/rpc, contornando a RLS. Revogamos e devolvemos so ao service_role.
revoke all on function public.carbon_projeto_definir_geometria(uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.carbon_projeto_atualizar(uuid, jsonb, boolean, jsonb)
  from public, anon, authenticated;
revoke all on function public.carbon_projeto_geojson(uuid)
  from public, anon, authenticated;
revoke all on function public.carbon_pdd_criar_do_template(uuid, text)
  from public, anon, authenticated;
revoke all on function public.carbon_pdd_progresso(uuid)
  from public, anon, authenticated;

grant execute on function public.carbon_projeto_definir_geometria(uuid, jsonb) to service_role;
grant execute on function public.carbon_projeto_atualizar(uuid, jsonb, boolean, jsonb)
  to service_role;
grant execute on function public.carbon_projeto_geojson(uuid)                 to service_role;
grant execute on function public.carbon_pdd_criar_do_template(uuid, text)     to service_role;
grant execute on function public.carbon_pdd_progresso(uuid)                   to service_role;

-- carbon_area_ha_da_geometria e carbon_geometria_do_geojson sao SECURITY INVOKER
-- e nao leem tabela nenhuma, mas tambem nao ha motivo para a anon key alcancar
-- funcao interna.
revoke all on function public.carbon_area_ha_da_geometria(extensions.geometry)
  from public, anon, authenticated;
grant execute on function public.carbon_area_ha_da_geometria(extensions.geometry) to service_role;

revoke all on function public.carbon_geometria_do_geojson(jsonb)
  from public, anon, authenticated;
grant execute on function public.carbon_geometria_do_geojson(jsonb) to service_role;


-- =============================================================================
-- 5. SEED do template VCS+CCB
-- =============================================================================
-- Fonte: docs/notion/05-pdd-parakana.md, secao "Estrutura completa de capitulos
-- capturada". Numeracao e titulos em ingles copiados literalmente.
--
-- DIVERGENCIA CONHECIDA, LEIA ANTES DE MEXER.
-- O levantamento anota que a base do Notion tem 45 linhas, mas a estrutura
-- transcrita para o arquivo tem 43 capitulos. Faltam 2 linhas que nao foram
-- transcritas, e os titulos delas nao existem em lugar nenhum do levantamento.
-- Optamos por semear os 43 capitulos REAIS em vez de inventar dois titulos:
-- template de PDD errado gera documento errado na submissao ao Verra, o que e
-- muito pior do que template incompleto. Quando o dono identificar as duas
-- linhas que faltam (provavelmente subitens de 2.6 Additional Information),
-- basta um INSERT nesta tabela com o ordem apropriado, sem migration de
-- estrutura: por isso ordem vai de 10 em 10 e nao de 1 em 1.
--
-- opcional = true SOMENTE em 3.4, 4.5 e 5.5, os tres que o padrao chama de
-- Optional Criterion. Sao eles que justificam o status nao_aplicavel.
--
-- ON CONFLICT (standard, capitulo) DO NOTHING mantem a migration reaplicavel e
-- preserva ajuste manual que o dono tenha feito no SQL Editor.

insert into public.carbon_pdd_template (standard, capitulo, nome, cap, nivel, opcional, ordem) values
  -- 1. Summary of Project Benefits
  ('VCS+CCB', '1',     'Summary of Project Benefits',                                          1, 1, false,  10),
  ('VCS+CCB', '1.1',   'Unique Project Benefits',                                              1, 2, false,  20),
  ('VCS+CCB', '1.2',   'Standardized Benefit Metrics',                                         1, 2, false,  30),

  -- 2. Project Details
  ('VCS+CCB', '2',     'Project Details',                                                      2, 1, false,  40),
  ('VCS+CCB', '2.1',   'Project Goals, Design and Long-Term Viability',                        2, 2, false,  50),
  ('VCS+CCB', '2.2',   'Without-project Land Use Scenario and Additionality',                  2, 2, false,  60),
  ('VCS+CCB', '2.2.1', 'Conditions Prior to Project Initiation and Land Use Scenarios without the Project',
                                                                                               2, 3, false,  70),
  ('VCS+CCB', '2.2.2', 'Most-Likely Scenario Justification',                                   2, 3, false,  80),
  ('VCS+CCB', '2.3',   'Safeguards and Stakeholder Engagement',                                2, 2, false,  90),
  ('VCS+CCB', '2.4',   'Management Capacity',                                                  2, 2, false, 100),
  ('VCS+CCB', '2.5',   'Legal Status and Property Rights',                                     2, 2, false, 110),
  ('VCS+CCB', '2.6',   'Additional Information Relevant to the Project',                       2, 2, false, 120),

  -- 3. Climate
  ('VCS+CCB', '3',     'Climate',                                                              3, 1, false, 130),
  ('VCS+CCB', '3.1',   'Application of Methodology',                                           3, 2, false, 140),
  ('VCS+CCB', '3.1.1', 'Title and Reference of Methodology',                                   3, 3, false, 150),
  ('VCS+CCB', '3.1.2', 'Applicability of Methodology',                                         3, 3, false, 160),
  ('VCS+CCB', '3.2',   'Quantification of Estimated GHG Emission Reductions and Removals',     3, 2, false, 170),
  ('VCS+CCB', '3.3',   'Monitoring',                                                           3, 2, false, 180),
  ('VCS+CCB', '3.3.1', 'Monitoring Plan',                                                      3, 3, false, 190),
  ('VCS+CCB', '3.3.2', 'Data and Parameters Monitored',                                        3, 3, false, 200),
  ('VCS+CCB', '3.4',   'Optional Criterion: Climate Change Adaptation Benefits',               3, 2, true,  210),

  -- 4. Community
  ('VCS+CCB', '4',     'Community',                                                            4, 1, false, 220),
  ('VCS+CCB', '4.1',   'Without-Project Community Scenario',                                   4, 2, false, 230),
  ('VCS+CCB', '4.2',   'Net Positive Community Impacts',                                       4, 2, false, 240),
  ('VCS+CCB', '4.2.1', 'Expected Community Impacts',                                           4, 3, false, 250),
  ('VCS+CCB', '4.2.2', 'Negative Community Impact Mitigation',                                 4, 3, false, 260),
  ('VCS+CCB', '4.2.3', 'Net Positive Community Well-Being',                                    4, 3, false, 270),
  ('VCS+CCB', '4.3',   'Other Stakeholder Impacts',                                            4, 2, false, 280),
  ('VCS+CCB', '4.4',   'Community Impact Monitoring',                                          4, 2, false, 290),
  ('VCS+CCB', '4.4.1', 'Community Monitoring Plan',                                            4, 3, false, 300),
  ('VCS+CCB', '4.4.2', 'Monitoring Plan Dissemination',                                        4, 3, false, 310),
  ('VCS+CCB', '4.5',   'Optional Criterion: Exceptional Community Benefits',                   4, 2, true,  320),

  -- 5. Biodiversity
  ('VCS+CCB', '5',     'Biodiversity',                                                         5, 1, false, 330),
  ('VCS+CCB', '5.1',   'Without-Project Biodiversity Scenario',                                5, 2, false, 340),
  ('VCS+CCB', '5.2',   'Net Positive Biodiversity Impacts',                                    5, 2, false, 350),
  ('VCS+CCB', '5.2.1', 'Expected Biodiversity Changes',                                        5, 3, false, 360),
  ('VCS+CCB', '5.2.2', 'Mitigation Measures',                                                  5, 3, false, 370),
  ('VCS+CCB', '5.2.3', 'Net Positive Biodiversity Impacts',                                    5, 3, false, 380),
  ('VCS+CCB', '5.3',   'Offsite Biodiversity Impacts',                                         5, 2, false, 390),
  ('VCS+CCB', '5.4',   'Biodiversity Impact Monitoring',                                       5, 2, false, 400),
  ('VCS+CCB', '5.4.1', 'Biodiversity Monitoring Plan',                                         5, 3, false, 410),
  ('VCS+CCB', '5.4.2', 'Biodiversity Monitoring Plan Dissemination',                           5, 3, false, 420),
  ('VCS+CCB', '5.5',   'Optional Criterion: Exceptional Biodiversity Benefits',                5, 2, true,  430)
on conflict (standard, capitulo) do nothing;


-- =============================================================================
-- 6. Conferencia do seed
-- =============================================================================
-- Notices, nao excecoes: a migration nao deve falhar por causa de ajuste
-- legitimo que o dono faca no template pelo SQL Editor. O objetivo e que a
-- contagem apareca na saida do "supabase db push" e a divergencia 43/45 nao
-- passe em branco.

do $$
declare
  v_total       integer;
  v_opcionais   integer;
  v_opc_certos  integer;
begin
  select count(*) into v_total
    from public.carbon_pdd_template where standard = 'VCS+CCB';

  select count(*) into v_opcionais
    from public.carbon_pdd_template where standard = 'VCS+CCB' and opcional;

  select count(*) into v_opc_certos
    from public.carbon_pdd_template
   where standard = 'VCS+CCB' and opcional and capitulo in ('3.4', '4.5', '5.5');

  raise notice 'carbon_pdd_template VCS+CCB: % capitulos, % opcionais.', v_total, v_opcionais;

  if v_total <> 43 then
    raise notice 'ATENCAO: esperados 43 capitulos (o que o levantamento transcreveu), encontrados %. O rodape do Notion falava em 45 linhas: ver a nota de divergencia na secao 5.', v_total;
  end if;

  if v_opc_certos <> 3 then
    raise notice 'ATENCAO: 3.4, 4.5 e 5.5 deveriam estar marcados como opcionais, encontrados % dos 3. Sem isso o PDD nunca fecha 100%%.', v_opc_certos;
  end if;
end $$;

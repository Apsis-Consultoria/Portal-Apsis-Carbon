-- =============================================================================
-- Apsis Carbon - schema inicial
-- Arquivo: 20260807120000_init_apsis_carbon.sql
-- =============================================================================
-- Decisao arquitetural CARBON-001 (ver docs/arquitetura-config-backend.md):
-- toda a configuracao de runtime do frontend vive no banco, na tabela
-- carbon_app_config, e e servida pela Edge Function publica "app-config".
-- A protecao real e a RLS declarada aqui.
--
-- NOTA DE 21/08/2026, corrigindo o comentario original desta migration: ele dizia
-- "o navegador conhece apenas VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY, que sao
-- publicos por design". Isso deixou de valer. O frontend nao tem MAIS NENHUMA
-- variavel de ambiente: ele chama o caminho relativo /api/<funcao> e quem sabe o
-- endereco do projeto e a hospedagem, por rewrite (ver src/lib/endpoint.js). Com a
-- URL no bundle, qualquer visitante da tela de login descobria o endereco e podia
-- bater direto nas Edge Functions, fora do nosso dominio, sem log nem limite de
-- taxa. Apenas o COMENTARIO foi corrigido: o efeito desta migration nao mudou e
-- ela nao deve ser reaplicada por causa disto.
--
-- SEGREDOS: nada de segredo entra nesta tabela, nem mesmo em linhas com
-- publico = false. Chaves de integracao e a service_role key existem somente
-- como secrets das Edge Functions (supabase secrets set) e nunca chegam ao
-- navegador.
--
-- Esta migration e idempotente: pode ser reaplicada sem erro.
-- gen_random_uuid() e nativo do PostgreSQL 13+, portanto nao exige extensao.
-- =============================================================================


-- =============================================================================
-- 1. carbon_app_config - configuracao de runtime do aplicativo
-- =============================================================================

create table if not exists public.carbon_app_config (
  chave         text primary key,
  valor         jsonb not null,
  publico       boolean not null default false,
  descricao     text,
  atualizado_em timestamptz not null default now()
);

comment on table public.carbon_app_config is
  'Configuracao de runtime do Apsis Carbon. Cada linha e um bloco de config (azure, app, login, flags) lido no boot do frontend pela Edge Function publica app-config. Linhas com publico = true sao expostas ao navegador; linhas com publico = false servem apenas a configuracao interna consumida pelas Edge Functions e NUNCA sao devolvidas ao navegador. Nenhuma linha desta tabela pode conter segredo: segredos ficam em secrets das Edge Functions.';
comment on column public.carbon_app_config.chave is
  'Nome do bloco de configuracao. Vira uma chave do objeto JSON devolvido por app-config (ex.: azure, app, login, flags).';
comment on column public.carbon_app_config.valor is
  'Conteudo do bloco em JSON. Formato livre por bloco; o frontend faz merge com os defaults locais.';
comment on column public.carbon_app_config.publico is
  'true = pode ser lido pelo navegador (anon/authenticated) e sai na resposta de app-config. false = uso interno das Edge Functions.';
comment on column public.carbon_app_config.descricao is
  'Explicacao em portugues do que este bloco controla, para quem editar pelo SQL Editor.';
comment on column public.carbon_app_config.atualizado_em is
  'Atualizado automaticamente pela trigger carbon_app_config_atualizado_em a cada UPDATE.';

-- Trigger de atualizado_em -----------------------------------------------------
-- search_path = '' evita resolucao de nome dependente do search_path do chamador
-- (recomendacao do linter de seguranca do Supabase). now() vem de pg_catalog,
-- que e sempre pesquisado implicitamente.
create or replace function public.carbon_app_config_set_atualizado_em()
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

comment on function public.carbon_app_config_set_atualizado_em() is
  'Mantem carbon_app_config.atualizado_em em dia a cada UPDATE.';

drop trigger if exists carbon_app_config_atualizado_em on public.carbon_app_config;
create trigger carbon_app_config_atualizado_em
  before update on public.carbon_app_config
  for each row
  execute function public.carbon_app_config_set_atualizado_em();

-- RLS -------------------------------------------------------------------------
alter table public.carbon_app_config enable row level security;

-- Privilegios explicitos: o Supabase concede ALL por padrao a anon/authenticated
-- em tabelas novas do schema public. Revogamos e devolvemos somente o SELECT,
-- para que a RLS nao seja a unica linha de defesa.
revoke all on table public.carbon_app_config from anon, authenticated;
grant select on table public.carbon_app_config to anon, authenticated;
grant all on table public.carbon_app_config to service_role;

-- Unica politica de leitura: apenas linhas publicas.
-- Nao existe politica de INSERT/UPDATE/DELETE para anon nem authenticated,
-- portanto essas operacoes sao negadas. service_role tem BYPASSRLS.
drop policy if exists "carbon_app_config_select_publico" on public.carbon_app_config;
create policy "carbon_app_config_select_publico"
  on public.carbon_app_config
  for select
  to anon, authenticated
  using (publico = true);


-- =============================================================================
-- 2. carbon_modulos - modulos de negocio do Apsis Carbon
-- =============================================================================
-- Comeca VAZIA de proposito. Os modulos serao definidos depois; enquanto nao
-- houver linhas, o frontend mostra estado vazio elegante na navegacao e na
-- tela de boas-vindas.

create table if not exists public.carbon_modulos (
  id          uuid primary key default gen_random_uuid(),
  chave       text unique not null,
  label       text not null,
  descricao   text,
  icone       text,
  rota        text,
  url_externa text,
  accent      text default '#1A4731',
  ordem       integer not null default 0,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

comment on table public.carbon_modulos is
  'Modulos de negocio do Apsis Carbon (projetos de carbono, contratos de emissao, inventario de GEE, relatorios ESG etc). Alimenta a navegacao da sidebar e os cards da tela de boas-vindas via carbon-api/modulos. Comeca vazia: os modulos serao definidos depois.';
comment on column public.carbon_modulos.chave is
  'Identificador estavel do modulo, usado como key no frontend (ex.: projetos-carbono).';
comment on column public.carbon_modulos.label is
  'Rotulo exibido na sidebar e no card.';
comment on column public.carbon_modulos.descricao is
  'Frase curta explicando o modulo, exibida no card da tela de boas-vindas.';
comment on column public.carbon_modulos.icone is
  'Nome do icone do lucide-react, ex.: Leaf. O frontend resolve o nome para o componente por um mapa explicito com fallback.';
comment on column public.carbon_modulos.rota is
  'Rota interna do SPA (ex.: /ProjetosCarbono). Use rota OU url_externa, nao os dois.';
comment on column public.carbon_modulos.url_externa is
  'URL absoluta para modulos hospedados fora do Apsis Carbon. Quando preenchida, o card abre em nova aba.';
comment on column public.carbon_modulos.accent is
  'Cor de destaque do card em hexadecimal. Default: verde APSIS #1A4731.';
comment on column public.carbon_modulos.ordem is
  'Ordem de exibicao crescente. Empates sao resolvidos pelo label.';
comment on column public.carbon_modulos.ativo is
  'false esconde o modulo do frontend sem apagar o registro.';

create index if not exists carbon_modulos_ativo_ordem_idx
  on public.carbon_modulos (ativo, ordem);

-- Barreira de esquema contra XSS armazenado -----------------------------------
-- url_externa e rota vao para o atributo href de um link no navegador. O React
-- NAO bloqueia href="javascript:...", entao um valor colado por engano (ou por
-- ma-fe) em uma tabela de configuracao viraria execucao de codigo na origem do
-- Apsis Carbon para todo mundo que clicasse. O frontend valida de novo
-- (src/utils/urlSegura.js), mas a barreira precisa existir tambem na ENTRADA.
-- Feito em bloco DO porque o PostgreSQL nao tem "add constraint if not exists"
-- e esta migration deve continuar reaplicavel sem erro.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'carbon_modulos_url_externa_http_chk'
  ) then
    alter table public.carbon_modulos
      add constraint carbon_modulos_url_externa_http_chk
      check (url_externa is null or url_externa ~* '^https?://');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'carbon_modulos_rota_interna_chk'
  ) then
    -- Rota interna do SPA: uma barra inicial seguida de algo que nao seja outra
    -- barra. '//host' resolveria para outra origem; '/rota' e o formato correto.
    alter table public.carbon_modulos
      add constraint carbon_modulos_rota_interna_chk
      check (rota is null or rota ~ '^/[^/]');
  end if;
end $$;

-- RLS: nenhuma politica para anon nem authenticated.
-- Com RLS ativa e zero politicas, todo acesso via anon key e negado.
-- Somente o service_role (Edge Function carbon-api, ja com o token do Azure AD
-- validado) consegue ler.
alter table public.carbon_modulos enable row level security;
revoke all on table public.carbon_modulos from anon, authenticated;
grant all on table public.carbon_modulos to service_role;


-- =============================================================================
-- 3. carbon_notificacoes - avisos exibidos na tela de boas-vindas
-- =============================================================================

create table if not exists public.carbon_notificacoes (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null default 'info'
                  check (tipo in ('info', 'sucesso', 'alerta')),
  titulo        text not null,
  descricao     text,
  acao          jsonb,
  email_destino text,
  expira_em     timestamptz,
  criado_em     timestamptz not null default now()
);

comment on table public.carbon_notificacoes is
  'Notificacoes exibidas no card da tela de boas-vindas e no sino da topbar. Servidas por carbon-api/notificacoes.';
comment on column public.carbon_notificacoes.tipo is
  'info, sucesso ou alerta. Define a cor do item no frontend.';
comment on column public.carbon_notificacoes.acao is
  'Acao opcional em JSON: { "label": "...", "rota": "/BoasVindas" } para rota interna (a chave alternativa "page" com o NOME da pagina, ex.: { "page": "BoasVindas" }, tambem e aceita pelo frontend) ou { "label": "...", "url": "https://..." } para link externo. A url e aceita somente com esquema http ou https: qualquer outro esquema (javascript:, data:) e descartado pelo frontend.';
comment on column public.carbon_notificacoes.email_destino is
  'E-mail corporativo do destinatario. NULL = notificacao para todos os colaboradores. Somente e-mail corporativo, nunca dado pessoal sensivel (LGPD).';
comment on column public.carbon_notificacoes.expira_em is
  'A partir deste momento a notificacao deixa de ser devolvida pela API. NULL = nunca expira.';

create index if not exists carbon_notificacoes_criado_em_idx
  on public.carbon_notificacoes (criado_em desc);

create index if not exists carbon_notificacoes_email_destino_idx
  on public.carbon_notificacoes (email_destino);

alter table public.carbon_notificacoes enable row level security;
revoke all on table public.carbon_notificacoes from anon, authenticated;
grant all on table public.carbon_notificacoes to service_role;


-- =============================================================================
-- 4. carbon_usuarios - colaboradores APSIS com acesso ao Apsis Carbon
-- =============================================================================
-- ATENCAO LGPD (Lei 13.709/2018):
-- Esta tabela guarda EXCLUSIVAMENTE dados funcionais de colaboradores:
-- e-mail corporativo (@apsis.com.br), nome de exibicao vindo do Azure AD, cargo,
-- papel de acesso e status. E PROIBIDO adicionar aqui CPF, RG, CNH, passaporte,
-- endereco residencial, telefone pessoal, e-mail pessoal, dados bancarios,
-- dados de saude, biometria ou qualquer outro dado pessoal sensivel.
-- O registro e criado automaticamente no primeiro login (upsert por e-mail feito
-- pela Edge Function carbon-api/me), sem coleta adicional de dados.
-- As Edge Functions nao registram o e-mail completo em log: apenas o dominio.

create table if not exists public.carbon_usuarios (
  id        uuid primary key default gen_random_uuid(),
  email     text unique not null,
  nome      text,
  cargo     text,
  papel     text not null default 'colaborador'
              check (papel in ('admin', 'gestor', 'colaborador')),
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

comment on table public.carbon_usuarios is
  'Colaboradores APSIS com acesso ao Apsis Carbon. LGPD: somente e-mail corporativo e dados funcionais (nome de exibicao, cargo, papel, status). Nunca CPF, RG, dados bancarios ou qualquer dado pessoal sensivel. Criada por upsert no primeiro login validado contra o Azure AD.';
comment on column public.carbon_usuarios.email is
  'E-mail corporativo em minusculas, normalizado pela Edge Function. Chave natural do upsert de login.';
comment on column public.carbon_usuarios.nome is
  'Nome de exibicao vindo do claim name do ID token do Azure AD.';
comment on column public.carbon_usuarios.cargo is
  'Cargo funcional, preenchido manualmente pela administracao. Dado funcional, nao pessoal sensivel.';
comment on column public.carbon_usuarios.papel is
  'admin, gestor ou colaborador. Controla o nivel de acesso dentro do Apsis Carbon.';
comment on column public.carbon_usuarios.ativo is
  'false bloqueia o acesso sem apagar o historico. A Edge Function carbon-api confere esta coluna antes de qualquer rota e responde 403 usuario_inativo em /me, /modulos e /notificacoes.';

-- Indice unico em lower(email): impede duplicatas que diferem so por caixa
-- (Filipe.Oliveira@... e filipe.oliveira@...). A Edge Function ja normaliza
-- para minusculas antes de gravar.
create unique index if not exists carbon_usuarios_email_lower_idx
  on public.carbon_usuarios (lower(email));

alter table public.carbon_usuarios enable row level security;
revoke all on table public.carbon_usuarios from anon, authenticated;
grant all on table public.carbon_usuarios to service_role;


-- =============================================================================
-- 5. carbon_usuario_modulos - quais modulos cada colaborador pode acessar
-- =============================================================================

create table if not exists public.carbon_usuario_modulos (
  usuario_id uuid not null references public.carbon_usuarios (id) on delete cascade,
  modulo_id  uuid not null references public.carbon_modulos (id) on delete cascade,
  primary key (usuario_id, modulo_id)
);

comment on table public.carbon_usuario_modulos is
  'Relacao N:N entre colaboradores e modulos liberados. E a autorizacao EFETIVA: a rota carbon-api/modulos faz inner join com esta tabela, portanto um modulo com ativo = true so aparece na sidebar e nos cards de quem tiver a linha aqui - inclusive para papel = admin. Sem linha nenhuma, o colaborador ve o estado vazio. Enquanto carbon_modulos estiver vazia esta tabela tambem fica vazia.';
comment on column public.carbon_usuario_modulos.usuario_id is
  'Colaborador. ON DELETE CASCADE: remover o colaborador remove as liberacoes.';
comment on column public.carbon_usuario_modulos.modulo_id is
  'Modulo liberado. ON DELETE CASCADE: remover o modulo remove as liberacoes.';

alter table public.carbon_usuario_modulos enable row level security;
revoke all on table public.carbon_usuario_modulos from anon, authenticated;
grant all on table public.carbon_usuario_modulos to service_role;


-- =============================================================================
-- 6. SEED de carbon_app_config
-- =============================================================================
-- ON CONFLICT DO NOTHING: reaplicar a migration nao sobrescreve valores que o
-- Filipe ja tenha ajustado no SQL Editor (em especial clientId e tenantId).
--
-- Para adicionar uma nova configuracao no futuro: basta inserir aqui uma nova
-- linha com publico = true; ela aparece automaticamente na resposta de
-- app-config e fica disponivel no frontend via getConfig().
-- Para configuracao interna que NAO deve chegar ao navegador, use publico = false.
-- Para segredo de verdade, nao use esta tabela: use
--   npx supabase secrets set NOME=valor

insert into public.carbon_app_config (chave, valor, publico, descricao) values
  (
    'azure',
    jsonb_build_object(
      'clientId',    'PREENCHER_CLIENT_ID_AZURE',
      'tenantId',    'PREENCHER_TENANT_ID_AZURE',
      'redirectUri', null,
      'scopes',      jsonb_build_array('User.Read', 'openid', 'profile', 'email')
    ),
    true,
    'Registro do aplicativo no Azure AD. PREENCHER clientId e tenantId com os valores reais do portal Azure (ver docs/setup-supabase.md). redirectUri null = o MSAL usa window.location.origin. Escopos minimos de proposito: pedir Files/Sites exigiria consentimento de administrador e ampliaria o risco.'
  ),
  (
    'app',
    jsonb_build_object(
      'nome',             'Apsis Carbon',
      'dominioPermitido', 'apsis.com.br',
      'suporteEmail',     'carbon@apsis.com.br',
      'ambiente',         'producao'
    ),
    true,
    'Identidade e regras gerais do aplicativo. dominioPermitido e conferido pela Edge Function carbon-api contra o dominio do e-mail do ID token: quem nao for do dominio recebe 403 dominio_nao_permitido. suporteEmail e SEMPRE um alias institucional de area: esta linha tem publico = true e sai no endpoint publico app-config, portanto nunca pode conter e-mail de pessoa identificada (LGPD). Se um dia for preciso um contato nominal, crie outra linha com publico = false.'
  ),
  (
    'login',
    jsonb_build_object(
      'imagens', jsonb_build_array(
        '/login/amazonia-1.jpg',
        '/login/amazonia-2.jpg',
        '/login/amazonia-3.jpg',
        '/login/amazonia-4.jpg',
        '/login/amazonia-5.jpg'
      ),
      'logo',         '/login/logo-apsis-carbon.png',
      'headline',     'A APSIS leva para o mercado de carbono o mesmo rigor técnico de mais de três décadas em avaliações.',
      'subheadline',  'Estruturação, mensuração e validação de projetos de carbono.',
      'categorias',   jsonb_build_array(
        'Projetos de Carbono',
        'Contratos de Emissão',
        'Inventário de GEE',
        'Certificação e Verificação',
        'Relatórios ESG'
      ),
      'copyright',    '© 2026 APSIS Consultoria. Todos os direitos reservados.'
    ),
    true,
    'Conteudo editavel da tela de login: slideshow de fundo, logo, textos da coluna esquerda e copyright. Os caminhos das imagens sao servidos pelo proprio frontend em /public, nunca por Storage remoto de outro projeto.'
  ),
  (
    'flags',
    jsonb_build_object(
      'notificacoes',     true,
      'modulosDinamicos', true
    ),
    true,
    'Feature flags booleanas lidas pelo frontend. notificacoes liga o card e o sino de notificacoes; modulosDinamicos liga a navegacao e os cards alimentados por carbon_modulos.'
  )
on conflict (chave) do nothing;

-- =============================================================================
-- Fecha o acesso da chave publica ao dominio da prestacao de contas.
--
-- POR QUE ESTA MIGRATION EXISTE, e nao e refatoracao. As migrations da prestacao
-- (20260901120000, 20260901180000, 20260901210000, 20260902100000) ligaram RLS
-- nas doze tabelas novas e pararam ai. Duas consequencias, achadas na revisao
-- adversarial de 02/09/2026, antes do primeiro push do dominio:
--
--   1. FALTOU O REVOKE. O Supabase concede privilegio a `anon` e `authenticated`
--      por DEFAULT PRIVILEGES do schema public: objeto novo nasce alcancavel pela
--      chave publica. RLS sem policy recusa as linhas, mas o privilegio de
--      tabela continua concedido - e privilegio concedido e superficie de ataque
--      que depende de a RLS estar perfeita em todo caminho. Todas as OUTRAS
--      migrations deste banco fazem o revoke explicito (ver
--      20260807120000_init_apsis_carbon.sql, linhas 86, 180, 218, 266). O desvio
--      nas da prestacao nao foi decisao, foi omissao.
--
--   2. A VIEW `carbon_prestacao_saldo` NAO TINHA security_invoker. Sem ele a view
--      roda com o privilegio de quem a criou, e nao de quem consulta: a RLS das
--      tabelas de baixo simplesmente nao e aplicada. Somado ao item 1, a view
--      devolvia saldo_abertura, antecipado, declarado e saldo de TODO ciclo para
--      quem tivesse a chave anon. Ligar RLS na tabela e deixar a view sem
--      security_invoker anula a RLS.
--
-- Os arquivos de origem tambem foram corrigidos, para ambiente novo nascer certo.
-- Esta migration existe porque aqueles quatro JA RODARAM no banco de producao, e
-- migration aplicada nao roda de novo.
--
-- IDEMPOTENTE: `revoke` de privilegio que nao existe e no-op, e
-- `create or replace view` reaplica a opcao. Pode rodar duas vezes.
-- =============================================================================

begin;

-- ===== 1. revoke nas doze tabelas ===========================================
-- As seis primeiras tambem receberam o revoke no arquivo de origem; repetir aqui
-- e de proposito, para esta migration ser completa por si e para o banco ficar
-- correto independentemente de qual arquivo rodou antes.

revoke all on table public.carbon_grupos_comunitarios     from anon, authenticated;
revoke all on table public.carbon_aldeias                 from anon, authenticated;
revoke all on table public.carbon_eixos                   from anon, authenticated;
revoke all on table public.carbon_ciclos_prestacao        from anon, authenticated;
revoke all on table public.carbon_antecipacoes            from anon, authenticated;
revoke all on table public.carbon_prestacao_lancamentos   from anon, authenticated;
revoke all on table public.carbon_comprovantes            from anon, authenticated;
revoke all on table public.carbon_atividades_campo        from anon, authenticated;
revoke all on table public.carbon_aldeia_rateio           from anon, authenticated;
revoke all on table public.carbon_eixo_resumo             from anon, authenticated;
revoke all on table public.carbon_prestacao_pendencias    from anon, authenticated;
revoke all on table public.carbon_ods_contribuicoes       from anon, authenticated;

-- ===== 2. a view, agora com security_invoker ================================
-- `alter view ... set (security_invoker = true)` resolveria, e e menos texto que
-- redefinir a view. Foi escolhido de proposito: e uma linha so, nao repete a
-- definicao (que duplicada divergiria da original na primeira mudanca) e falha
-- alto se a view nao existir.
alter view public.carbon_prestacao_saldo set (security_invoker = true);

revoke all on table public.carbon_prestacao_saldo from anon, authenticated;

-- ===== 3. RLS, por garantia ==================================================
-- As migrations de origem ligaram, mas ligar de novo e no-op e deixa esta
-- migration com a afirmacao completa: "depois daqui, as doze estao com RLS e sem
-- privilegio para a chave publica".
alter table public.carbon_grupos_comunitarios     enable row level security;
alter table public.carbon_aldeias                 enable row level security;
alter table public.carbon_eixos                   enable row level security;
alter table public.carbon_ciclos_prestacao        enable row level security;
alter table public.carbon_antecipacoes            enable row level security;
alter table public.carbon_prestacao_lancamentos   enable row level security;
alter table public.carbon_comprovantes            enable row level security;
alter table public.carbon_atividades_campo        enable row level security;
alter table public.carbon_aldeia_rateio           enable row level security;
alter table public.carbon_eixo_resumo             enable row level security;
alter table public.carbon_prestacao_pendencias    enable row level security;
alter table public.carbon_ods_contribuicoes       enable row level security;

commit;

-- -----------------------------------------------------------------------------
-- COMO CONFERIR QUE PEGOU, no SQL Editor do Supabase:
--
--   select table_name, grantee, privilege_type
--     from information_schema.role_table_grants
--    where table_schema = 'public'
--      and grantee in ('anon', 'authenticated')
--      and table_name like 'carbon_%';
--
-- Nenhuma linha das doze tabelas nem da view pode aparecer.
--
--   select relname, reloptions from pg_class
--    where relname = 'carbon_prestacao_saldo';
--
-- reloptions tem que conter security_invoker=true.
--
-- O QUE ISTO NAO RESOLVE: a autorizacao de LEITURA por participacao. Nao ha
-- policy nenhuma nessas tabelas, e nao deve haver: o acesso e exclusivamente
-- pela Edge Function com service_role, que IGNORA RLS. Quem confere participacao
-- e o portao de projeto dentro da funcao (grupoVisivel e projetosVisiveis, em
-- rotas/projetos.ts). Ate 02/09/2026 esse portao nao existia no dominio da
-- prestacao, e essa era a falha mais grave das duas.
-- -----------------------------------------------------------------------------

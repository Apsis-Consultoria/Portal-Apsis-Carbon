-- =============================================================================
-- Apsis Carbon - fechar o EXECUTE que o Postgres concede a PUBLIC
-- Arquivo: 20260825130000_fechar_execute_publico.sql
-- =============================================================================
-- O DEFEITO, medido no banco de producao em 25/08/2026: 12 das 31 funcoes
-- `carbon%` respondiam true para has_function_privilege('anon', ..., 'EXECUTE'),
-- e SEIS delas sao SECURITY DEFINER:
--
--   carbon_secure_share_autenticar         autentica o cliente
--   carbon_secure_share_definir_senha      define senha
--   carbon_secure_share_trocar_senha       troca senha
--   carbon_secure_share_limpar_tentativas  zera o contador de tentativas
--   carbon_secure_share_nivel_item         resolve permissao de arquivo
--   carbon_secure_share_gravar_drive_id    escreve em carbon_app_config
--
-- Com a chave anon e o ref do projeto, qualquer pessoa chamaria essas funcoes por
-- POST /rest/v1/rpc/<nome>, pulando as Edge Functions e toda a autenticacao que
-- elas fazem. `limpar_tentativas` sozinha derruba a protecao contra forca bruta
-- do login sem senha: zera o contador, tenta de novo, zera de novo.
--
-- POR QUE ACONTECEU. Todas as migrations do projeto escreveram
--
--   revoke all on function public.X(...) from anon, authenticated;
--
-- e isso NAO e suficiente. O Postgres concede EXECUTE ao pseudo-papel PUBLIC no
-- momento do CREATE FUNCTION. PUBLIC nao e um papel: significa "todos os papeis,
-- inclusive os que ainda nao existem". Revogar de `anon` e `authenticated`
-- nominalmente nao remove a concessao que veio por PUBLIC, e o privilegio efetivo
-- continua valendo. O comando parece correto na revisao de codigo e nao faz nada.
--
-- A FORMA CERTA, para quem escrever migration nova:
--
--   revoke all on function public.X(...) from public, anon, authenticated;
--   grant execute on function public.X(...) to service_role;
--
-- Repare no `public` MINUSCULO na primeira linha: ali ele e o pseudo-papel, nao o
-- schema. E confuso de proposito pelo Postgres, e e exatamente onde o erro mora.
--
-- POR QUE E SEGURO FECHAR TUDO. A arquitetura do Carbon ja diz que nada alem das
-- Edge Functions toca o banco: nao existe cliente supabase-js em nenhum dos dois
-- frontends (ver a regra 2 do CLAUDE.md do portal e a regra 4 do Secure Share).
-- As Edge Functions usam service_role, que recebe grant explicito abaixo. Logo,
-- `anon` e `authenticated` nao precisam executar nada, e fechar nao quebra
-- caminho nenhum que exista hoje.
--
-- VARRE TODAS AS FUNCOES `carbon%`, e nao uma lista escrita a mao, porque a lista
-- envelheceria: a proxima migration que criasse funcao voltaria a deixar PUBLIC
-- com EXECUTE e ninguem perceberia. Rodar este arquivo de novo depois de criar
-- funcoes novas fecha as novas tambem.
--
-- Idempotente.
-- =============================================================================

do $$
declare
  alvo record;
  fechadas integer := 0;
begin
  for alvo in
    select p.oid::regprocedure as assinatura
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname like 'carbon%'
       and p.prokind = 'f'
  loop
    -- `from public` e o que resolve. As outras duas sao redundantes depois dele,
    -- e ficam por clareza: quem ler o log de privilegios ve a intencao.
    execute format('revoke all on function %s from public', alvo.assinatura);
    execute format('revoke all on function %s from anon, authenticated', alvo.assinatura);

    -- Devolve o unico caminho que existe de verdade. Sem esta linha, uma funcao
    -- chamada de dentro de outra por service_role passaria a falhar com
    -- "permission denied for function", e o sintoma apareceria so na primeira
    -- requisicao que usasse aquele caminho.
    execute format('grant execute on function %s to service_role', alvo.assinatura);

    fechadas := fechadas + 1;
  end loop;

  raise notice 'EXECUTE fechado para PUBLIC em % funcao(oes) carbon%%.', fechadas;
end
$$;

-- -----------------------------------------------------------------------------
-- Conferencia que ABORTA, e nao apenas avisa
-- -----------------------------------------------------------------------------
-- Varias migrations deste projeto terminam com um bloco de conferencia que so
-- emite `raise notice`. Notice nao muda codigo de saida: a migration "passa" com
-- o banco em estado errado, e foi assim que estes doze EXECUTE sobreviveram desde
-- 17/08. Aqui a conferencia LEVANTA EXCECAO, porque uma correcao de seguranca que
-- falha em silencio e pior do que nenhuma - deixa a anotacao de que foi resolvida.
do $$
declare
  restantes text;
begin
  select string_agg(p.proname, ', ' order by p.proname)
    into restantes
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname like 'carbon%'
     and p.prokind = 'f'
     and has_function_privilege('anon', p.oid, 'EXECUTE');

  if restantes is not null then
    raise exception
      'Ainda ha funcao carbon executavel por anon apos o fechamento: %', restantes;
  end if;

  raise notice 'Conferido: nenhuma funcao carbon e executavel por anon.';
end
$$;

notify pgrst, 'reload schema';

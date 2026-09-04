-- =============================================================================
-- Refaz a trava de "nao se tranque fora". A versao anterior tinha impasse.
-- =============================================================================
-- O QUE ACONTECEU. A migration 20260903180000 poe um constraint trigger em
-- carbon_cargo_areas que recusa deixar o sistema sem ninguem ativo com a area
-- `acessos`. Rodando de verdade, ele barrou a primeira criacao de cargo - e ao
-- investigar, o problema e mais fundo que o INSERT:
--
--   1. o gatilho disparava tambem em INSERT, e inserir area so AUMENTA
--      cobertura. Conferir ali nao protege nada e impedia criar o primeiro cargo
--      com a area `acessos`, porque criar cargo nao atribui ninguem;
--   2. trocar as areas de um cargo SEMPRE apaga antes de inserir, entao qualquer
--      edicao dispara a trava - inclusive uma que termina valida;
--   3. e o pior: com o sistema JA em zero administradores, a trava recusa
--      exatamente a acao que consertaria isso. Uma trava que impede a
--      recuperacao e pior do que nao ter trava.
--
-- A REGRA CERTA nao e "nunca chegue a zero", e sim "nao REDUZA a zero": se ja
-- estava em zero, deixar mexer e o unico caminho de volta. E essa distincao
-- exige conhecer o estado ANTES e DEPOIS, coisa que um gatilho por linha nao
-- sabe fazer sem guardar estado de transacao.
--
-- POR ISSO A CHECAGEM SAI DO GATILHO e vai para carbon_cargo_definir_areas, que
-- conhece os dois. Os gatilhos sao removidos.
--
-- O QUE SE PERDE, dito sem enfeite: SQL solto no editor passa a nao ser barrado.
-- E aceitavel, e ate desejavel: SQL direto no banco E a ferramenta de
-- recuperacao. Quem opera o sistema passa pela Edge Function, que confere os
-- tres caminhos (trocar area, mexer no cargo, mexer na pessoa), e `papel =
-- 'admin'` continua ignorando cargo como ultima rede.
-- =============================================================================

begin;

-- ===== 1. Fora os gatilhos ==================================================
-- Ver o cabecalho: por linha e adiado, eles nao conseguem distinguir "reduziu a
-- zero" de "ja estava em zero", e a segunda leitura e a que permite recuperar.

drop trigger if exists carbon_cargo_areas_admin_trg on public.carbon_cargo_areas;
drop trigger if exists carbon_cargos_admin_trg      on public.carbon_cargos;

-- ===== 2. Quantos administram acessos hoje ==================================

/**
 * Quantas pessoas ATIVAS tem, por cargo ativo, a area `acessos`.
 *
 * Uma funcao so, usada pela guarda da troca de areas e disponivel para a Edge
 * Function e para conferencia manual. Duas contagens escritas em lugares
 * diferentes divergem na primeira mudanca de regra.
 *
 * `papel = 'admin'` NAO conta aqui de proposito: ele e a chave de emergencia, e
 * uma contagem que o inclui ensina o time a depender dela no dia a dia.
 */
create or replace function public.carbon_administradores_de_acesso()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
    from public.carbon_usuarios u
    join public.carbon_cargos c on c.id = u.cargo_id and c.ativo
    join public.carbon_cargo_areas ca on ca.cargo_id = c.id and ca.area = 'acessos'
   where u.ativo;
$$;

comment on function public.carbon_administradores_de_acesso() is
  'Pessoas ativas que administram acessos por CARGO. Nao conta papel = admin, que e a chave de emergencia: contagem que o inclui ensina a depender dela.';

revoke all on function public.carbon_administradores_de_acesso() from public;

-- ===== 3. Trocar as areas, com a guarda no lugar certo ======================

/**
 * Substitui as areas de um cargo, em UMA transacao, e recusa REDUZIR a zero.
 *
 * A guarda vive aqui, e nao num gatilho, porque so aqui se conhece o antes e o
 * depois. A regra e:
 *
 *     antes > 0  e  depois = 0   ->  RECUSA
 *     antes = 0                  ->  deixa passar
 *
 * O segundo caso e o que faltava: com o sistema ja sem administrador, a trava
 * antiga recusava a propria acao que consertava. Trava que impede a recuperacao
 * e pior do que trava nenhuma.
 *
 * Recebe o CONJUNTO FINAL, e nao um diff: diff calculado fora do banco e a
 * origem classica de permissao fantasma.
 */
create or replace function public.carbon_cargo_definir_areas(
  p_cargo_id uuid,
  p_areas    text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes  integer;
  v_depois integer;
begin
  if not exists (select 1 from public.carbon_cargos where id = p_cargo_id) then
    raise exception 'cargo nao encontrado' using errcode = 'P0002';
  end if;

  v_antes := public.carbon_administradores_de_acesso();

  delete from public.carbon_cargo_areas where cargo_id = p_cargo_id;

  -- Area desconhecida FALHA pela chave estrangeira, e nao e ignorada: gravar
  -- metade das areas pedidas e pior do que recusar a chamada inteira.
  insert into public.carbon_cargo_areas (cargo_id, area)
  select p_cargo_id, a
    from unnest(coalesce(p_areas, array[]::text[])) as a
   where btrim(a) <> ''
  on conflict do nothing;

  v_depois := public.carbon_administradores_de_acesso();

  if v_antes > 0 and v_depois = 0 then
    raise exception
      'a mudanca deixaria o sistema sem ninguem que administre acessos'
      using errcode = 'P0001';
  end if;
end $$;

comment on function public.carbon_cargo_definir_areas(uuid, text[]) is
  'Troca o conjunto de areas de um cargo em UMA transacao e recusa REDUZIR a zero o numero de pessoas que administram acessos. Se ja estava em zero, deixa passar: e o caminho de recuperacao. Recebe o conjunto final, nunca um diff.';

revoke all on function public.carbon_cargo_definir_areas(uuid, text[]) from public;

commit;

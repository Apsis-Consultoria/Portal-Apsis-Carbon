-- =============================================================================
-- Apsis Carbon - a listagem de indicadores de META nao pode trazer os do Plano
-- Arquivo: 20260826100000_indicadores_listar_so_de_meta.sql
-- =============================================================================
-- O DEFEITO. carbon_indicadores_listar filtra apenas por projeto:
--
--     where i.projeto_id = p_projeto_id
--
-- Quando ela foi escrita (14/08/2026) isso estava certo: carbon_indicadores
-- guardava SO indicador de meta interna, e todo indicador do projeto era um
-- indicador de meta.
--
-- Em 25/08 a mesma tabela passou a guardar tambem o Plano de Monitoramento -
-- 161 indicadores de certificacao (clima, comunidade, biodiversidade), com a
-- coluna `plano` preenchida, separados por decisao registrada na migration
-- 20260825120000. A tela de Indicadores cuida deles; a de Metas nao.
--
-- Sem o filtro, a tela de Metas listaria 161 indicadores de certificacao ao lado
-- dos poucos de meta, e o seletor "vincular indicador a esta meta" ofereceria
-- coisas como "Area of the jurisdiction" para uma meta de backoffice. Pior: o
-- contador de "indicadores sem meta" mostraria 161, numero que sugere um
-- trabalho de vinculacao gigante que nao existe.
--
-- Nao e defeito de quem escreveu: e uma premissa que deixou de valer quando a
-- tabela ganhou um segundo uso. Fica registrado porque o mesmo cuidado vale para
-- qualquer consulta nova sobre carbon_indicadores - a pergunta a fazer e sempre
-- "de qual dos dois usos?".
--
-- Idempotente (create or replace, mesma assinatura).
-- =============================================================================

create or replace function public.carbon_indicadores_listar(
  p_projeto_id       uuid,
  p_somente_sem_meta boolean default false
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select i.id, i.nome, i.meta_id
      from public.carbon_indicadores i
     where i.projeto_id = p_projeto_id
       -- SO indicador interno. `plano` preenchido e do Plano de Monitoramento,
       -- que tem tela propria (ProjetoIndicadores) e nunca se liga a uma meta.
       and i.plano is null
       and (not coalesce(p_somente_sem_meta, false) or i.meta_id is null)
     order by i.nome, i.id
     limit 500
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'indicadores', coalesce((
      -- A janela de datas vem da meta vinculada; indicador sem meta usa janela
      -- aberta (NULL, NULL), ou seja toda a serie conta.
      select jsonb_agg(
               public.carbon_indicador_json(b.id, mm.periodo_inicio, mm.periodo_fim)
               order by b.nome, b.id
             )
        from base b
        left join public.carbon_metas mm on mm.id = b.meta_id
    ), '[]'::jsonb)
  );
$$;

comment on function public.carbon_indicadores_listar(uuid, boolean) is
  'Indicadores INTERNOS de um projeto (plano is null), cada um no formato de carbon_indicador_json. Exclui de proposito os indicadores do Plano de Monitoramento, que vivem na mesma tabela com a coluna plano preenchida e tem tela propria: eles nunca se ligam a uma meta, e inclui-los faria o seletor de vinculo oferecer parametro da VM0048 para meta de backoffice. Com p_somente_sem_meta, devolve so os ainda nao vinculados. Corte de seguranca em 500.';

-- O revoke precisa ser repetido: `create or replace` recria a funcao e o
-- Postgres volta a conceder EXECUTE ao pseudo-papel PUBLIC. Sem esta linha, a
-- correcao reabriria o buraco que 20260825130000 fechou.
revoke all on function public.carbon_indicadores_listar(uuid, boolean) from public, anon, authenticated;
grant execute on function public.carbon_indicadores_listar(uuid, boolean) to service_role;

notify pgrst, 'reload schema';

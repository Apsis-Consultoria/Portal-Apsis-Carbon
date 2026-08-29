-- =============================================================================
-- Apsis Carbon - as metas da pagina "Objetivos Parakana" do Notion
-- Arquivo: supabase/seeds/metas_objetivos_parakana.sql
-- Fonte: docs/notion/13-objetivos-parakana.md, linhas 26 a 41
-- =============================================================================
-- POR QUE ESTA TABELA ESTAVA VAZIA ate 26/08/2026: a migration
-- 20260814100000_metas.sql foi escrita A PARTIR deste documento (os 6 valores do
-- CHECK de `frente` sao exatamente as 6 frentes da pagina), mas a carga nunca
-- aconteceu. Estrutura pronta, banco vazio.
--
-- O ACHADO DA PAGINA, e o motivo de valor_alvo ficar NULO em quase tudo: no
-- Notion as metas quantitativas estao com o placeholder por preencher. Aparecem
-- literalmente como `XX` e `xxx`: instalar XX cameras, aumentar a venda em XX%,
-- vender XX toneladas, rondas de xxx/25 a xxx/25. As metas foram estruturadas e
-- nunca quantificadas.
--
-- Carregar NULO e o que mantem a fidelidade. Inventar numero aqui produziria
-- meta que ninguem pactuou, num plano de impacto que sustenta os capitulos de
-- Community e Biodiversity do padrao CCB. O CHECK
-- carbon_metas_unidade_com_valor_chk permite exatamente isto: alvo nulo com ou
-- sem unidade, e unidade obrigatoria so quando ha numero.
--
-- A UNIDADE ENTRA quando a pagina a diz, mesmo sem o numero: e a metade da
-- informacao que existe, e guarda-la evita que a quantificacao futura tenha de
-- redescobrir se "20" sao cameras, toneladas ou por cento. Esse era o problema
-- que a issue #14 nomeou.
--
-- MES_INICIO E MES_FIM FICAM NULOS de proposito. A pagina diz "rondas quinzenais
-- na seca e mensais na chuva" e nao nomeia os meses. O comentario da migration
-- cita "chuva = outubro a abril" como EXEMPLO de janela que atravessa o ano, nao
-- como dado do projeto. Gravar esses meses seria transformar exemplo em fato. A
-- sazonalidade fica dita na descricao, que e onde o Notion a diz.
--
-- PARCEIRO_ID FICA NULO. A pagina nomeia a organizacao responsavel por frente,
-- mas o levantamento nao transcreveu os nomes (secao "Confidencialidade", linha
-- 77). O vinculo entra quando os parceiros forem cadastrados, e a pendencia 2 do
-- documento ainda esta aberta: nao foi decidido se parceiro de execucao de
-- projeto e a mesma entidade que fornecedor contratado.
--
-- STATUS: todas 'planejada'. A pagina nao registra progresso de nenhuma, e sem
-- quantificacao nao ha como afirmar andamento.
--
-- Idempotente: id por md5 da frente mais a acao.
-- =============================================================================

do $$
declare
  v_projeto uuid;
begin
  -- O projeto tem de existir antes: projeto_id e NOT NULL. Se a base for
  -- recriada sem o Awaete, e melhor falhar aqui, alto e claro, do que gravar as
  -- metas penduradas em outro projeto qualquer.
  select id into v_projeto
  from public.carbon_projetos
  where nome = 'Awaete REDD+'
  limit 1;

  if v_projeto is null then
    raise exception 'projeto "Awaete REDD+" nao encontrado; rode antes o seed projeto_awaete.sql';
  end if;

  insert into public.carbon_metas
    (id, projeto_id, frente, descricao, valor_alvo, unidade, periodicidade, observacoes)
  values
    -- ---- Acoes com recurso de antecipacao -----------------------------------
    (md5('meta:prestacao_contas:registro_ativos')::uuid, v_projeto,
     'prestacao_contas',
     'Registro dos ativos adquiridos com o recurso de antecipacao',
     null, null, 'unica', null),

    (md5('meta:prestacao_contas:contabilidade_spe')::uuid, v_projeto,
     'prestacao_contas',
     'Prestacao de contas do recurso de antecipacao na contabilidade da SPE',
     null, null, 'unica', null),

    -- ---- Fortalecimento institucional ---------------------------------------
    (md5('meta:fortalecimento:governanca')::uuid, v_projeto,
     'fortalecimento_institucional',
     'Modelo de governanca para as associacoes dos dois grupos',
     null, null, 'unica', null),

    (md5('meta:fortalecimento:gestao_simplificada')::uuid, v_projeto,
     'fortalecimento_institucional',
     'Sistema de gestao simplificada para as associacoes dos dois grupos',
     null, null, 'unica', null),

    -- ---- Monitoramento -------------------------------------------------------
    (md5('meta:monitoramento:cameras_trap')::uuid, v_projeto,
     'monitoramento',
     'Instalacao de cameras trap para monitoramento de fauna',
     null, 'cameras', 'unica',
     'Alvo no Notion esta como XX: quantidade nunca definida.'),

    (md5('meta:monitoramento:brigadas_incendio')::uuid, v_projeto,
     'monitoramento',
     'Formacao e manutencao de brigadas de incendio',
     null, null, 'unica', null),

    (md5('meta:monitoramento:rondas_seca')::uuid, v_projeto,
     'monitoramento',
     'Rondas de vigilancia territorial no periodo de seca',
     null, null, 'quinzenal',
     'Janela sazonal nao registrada no Notion: a pagina diz "na seca" sem nomear os meses.'),

    (md5('meta:monitoramento:rondas_chuva')::uuid, v_projeto,
     'monitoramento',
     'Rondas de vigilancia territorial no periodo de chuva',
     null, null, 'mensal',
     'Janela sazonal nao registrada no Notion: a pagina diz "na chuva" sem nomear os meses.'),

    (md5('meta:monitoramento:denuncias')::uuid, v_projeto,
     'monitoramento',
     'Encaminhamento de denuncias aos orgaos publicos competentes',
     null, null, 'unica', null),

    -- ---- Educacao ------------------------------------------------------------
    (md5('meta:educacao:ambiental_aldeias')::uuid, v_projeto,
     'educacao',
     'Curso de educacao ambiental nas aldeias',
     null, null, 'unica', null),

    (md5('meta:educacao:gestao_associativismo')::uuid, v_projeto,
     'educacao',
     'Curso de gestao e associativismo',
     null, null, 'unica', null),

    -- ---- Sensibilizacao no entorno -------------------------------------------
    (md5('meta:sensibilizacao:queimadas_agrotoxico')::uuid, v_projeto,
     'sensibilizacao',
     'Educacao ambiental no entorno sobre queimadas e uso de agrotoxico',
     null, null, 'unica', null),

    (md5('meta:sensibilizacao:caca_ilegal')::uuid, v_projeto,
     'sensibilizacao',
     'Acoes de combate a caca ilegal',
     null, null, 'unica', null),

    (md5('meta:sensibilizacao:sindicato_rural')::uuid, v_projeto,
     'sensibilizacao',
     'Acao conjunta com o sindicato rural do entorno',
     null, null, 'unica', null),

    -- ---- Cadeias da bioeconomia ----------------------------------------------
    (md5('meta:bioeconomia:controle_producao')::uuid, v_projeto,
     'bioeconomia',
     'Controle da producao de castanha e de acai',
     null, 'toneladas', 'unica',
     'Alvo no Notion esta como XX toneladas: quantidade nunca definida.'),

    (md5('meta:bioeconomia:aumento_venda')::uuid, v_projeto,
     'bioeconomia',
     'Aumento do volume de venda da producao',
     null, '%', 'unica',
     'Alvo no Notion esta como XX%: percentual nunca definido.'),

    (md5('meta:bioeconomia:certificacao_acai')::uuid, v_projeto,
     'bioeconomia',
     'Certificacao do acai',
     null, null, 'unica', null)

  on conflict (id) do update set
    descricao     = excluded.descricao,
    unidade       = excluded.unidade,
    periodicidade = excluded.periodicidade,
    observacoes   = excluded.observacoes,
    atualizado_em = now();
end $$;

-- Conferencia: 17 metas, distribuidas nas 6 frentes da pagina. Falha alto se a
-- carga sair diferente, em vez de deixar um "ok" que esconde carga parcial.
do $$
declare
  n integer;
  frentes integer;
begin
  select count(*), count(distinct frente) into n, frentes from public.carbon_metas;

  raise notice 'metas carregadas: % em % frentes', n, frentes;

  if n <> 17 then
    raise exception 'esperado 17 metas, encontrado %', n;
  end if;

  if frentes <> 6 then
    raise exception 'esperado 6 frentes, encontrado %', frentes;
  end if;

  if exists (select 1 from public.carbon_metas where valor_alvo is not null) then
    raise exception 'alguma meta veio com valor_alvo: no Notion todos sao XX, nenhum foi pactuado';
  end if;
end $$;

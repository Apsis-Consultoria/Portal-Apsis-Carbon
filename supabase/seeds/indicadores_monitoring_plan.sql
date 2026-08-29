-- =============================================================================
-- Apsis Carbon - carga do Plano de Monitoramento
-- Arquivo: supabase/seeds/indicadores_monitoring_plan.sql
-- =============================================================================
-- GERADO POR scripts/gerar-seed-indicadores.py A PARTIR DE
-- docs/indicadores/monitoring-plan.json. Nao edite a mao: a proxima geracao
-- desfaz. Para mudar o conteudo, mude a planilha e rode os dois scripts.
--
-- Origem: Monitoring Plan - EN.xlsx
-- Conteudo: 161 indicadores, 197 medicoes.
--
-- DEPENDE DA MIGRATION 20260825120000_indicadores_monitoring_plan.sql. Rodar
-- antes dela falha em `column "plano" does not exist`.
--
-- IDEMPOTENTE: o id de cada linha vem do md5 do conteudo, entao rodar de novo
-- ATUALIZA e nao duplica.
--
-- LGPD: nenhuma linha aqui tem nome, e-mail ou telefone de pessoa. A planilha
-- traz colunas de responsavel; elas NAO sao importadas. O conteudo e indicador,
-- unidade, periodicidade e numero medido.
-- =============================================================================

do $$
declare
  v_projeto uuid;
  v_ind     uuid;
begin
  -- O Plano de Monitoramento e do projeto REDD+ Awaete / Parakana. A busca e
  -- por nome porque o id e gerado no banco e difere entre ambientes.
  --
  -- FALHA ALTO SE NAO ACHAR, de proposito: sem projeto, um seed silencioso
  -- inseriria zero linha e a tela apareceria vazia sem ninguem saber por que.
  select id into v_projeto
    from public.carbon_projetos
   where nome ilike '%parakan%' or nome ilike '%awaet%'
   order by criado_em
   limit 1;

  if v_projeto is null then
    raise exception
      'Nenhum projeto com nome contendo "parakan" ou "awaet" existe em carbon_projetos. Crie o projeto antes de rodar este seed, ou ajuste a busca acima.';
  end if;

  -- clima #1: Area of project where activities aimed at avoiding unplanned deforesta
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:1')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 1, 'APA-Udef',
    'Area of project where activities aimed at avoiding unplanned deforestation will take place.', null, 'ha',
    'area',
    false,
    null, 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #2: Area of the jurisdiction
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:2')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 2, 'AJ',
    'Area of the jurisdiction', null, 'ha',
    'area',
    false,
    null, 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #3: Displacement leakage factor
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:3')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 3, 'DLF',
    'Displacement leakage factor', null, '%',
    'percentual',
    false,
    null, 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #4: Ex ante effectiveness of halting baseline emissions in year t
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:4')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 4, 'EAEF,t',
    'Ex ante effectiveness of halting baseline emissions in year t', null, '%',
    'percentual',
    false,
    null, 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #5: Value of the Student’s t distribution for a two-sided 90 percent confi
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:5')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 5, 'talpha=10%',
    'Value of the Student’s t distribution for a two-sided 90 percent confidence interval', null, 'unitless',
    'contagem',
    false,
    null, 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #6: Value of the Student’s t distribution for a one-sided 66.67 percent co
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:6')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 6, 'talpha=66.67%',
    'Value of the Student’s t distribution for a one-sided 66.67 percent confidence interval', null, 'unitless',
    'contagem',
    false,
    null, 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #7: Area of jurisdiction mapped as available for activity shifting outside
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:7')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 7, 'Aavailable',
    'Area of jurisdiction mapped as available for activity shifting outside the UDef LB.', null, 'ha',
    'area',
    false,
    'Every six years at baseline renewal. Note that a project’s initial BVP may be shorter than six years, as provided for in Section 5.3.1; subsequent baselines will be renewed every six years.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #8: Area of stratum i
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:8')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 8, 'Ai',
    'Area of stratum i', null, 'ha',
    'area',
    false,
    'Prior to each verification event.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #9: Area of project sampling frame
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:9')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 9, 'APSF',
    'Area of project sampling frame', null, 'ha',
    'area',
    false,
    'Prior to each verification event.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #10: Unplanned deforestation activity data allocated to the UDef LB  (Verra
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:10')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 10, 'ADLB-Udef,r',
    'Unplanned deforestation activity data allocated to the UDef LB  (Verra''s data)', null, 'ha/year',
    'contagem',
    false,
    'Every six years at baseline renewal.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #11: Area of sampling stratum ss in the project sampling frame (ha).
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:11')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 11, 'Ass',
    'Area of sampling stratum ss in the project sampling frame (ha).', null, 'ha',
    'area',
    false,
    'Prior to each verification event.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #12: Unplanned deforestation activity data allocated to the UDef PA in the 
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:12')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 12, 'ADPA-Udef',
    'Unplanned deforestation activity data allocated to the UDef PA in the jurisdiction (Verra''s data)', null, 'ha/year',
    'contagem',
    false,
    'Every six years at baseline renewal.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #13: Buffer withholding percentage
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:13')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 13, 'Buffer%',
    'Buffer withholding percentage', null, '%',
    'percentual',
    false,
    'Every verification event.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #14: Length of monitoring period
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:14')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 14, 'MPL',
    'Length of monitoring period', null, 'years',
    'contagem',
    false,
    'Prior to each verification event.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #15: Cumulative net GHG emissions due to market-effects leakage in year t
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:15')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 15, '∆CLK-ME,t',
    'Cumulative net GHG emissions due to market-effects leakage in year t', null, 'tCO2e/ha',
    'volume',
    false,
    'Prior to each verification event.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #16: Emissions from carbon stock change due to land cover transition in are
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:16')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 16, '∆COLB, t',
    'Emissions from carbon stock change due to land cover transition in areas available for activity shifting outside the UDef LB, as calculated for year t.(Verra''s data)', null, 'tCO2e/ha',
    'volume',
    false,
    'Every six years at baseline renewal', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #17: Total count of the sample units that fall into sampling stratum ss and
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:17')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 17, 'CountJCHC,ss',
    'Total count of the sample units that fall into sampling stratum ss and change category CHC (UDef/SF/SNF/Reg)', null, 'Sampling units',
    'contagem',
    false,
    'Every six years at baseline renewal', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #18: Total count of sample units in sampling stratum ss
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:18')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 18, 'Countss',
    'Total count of sample units in sampling stratum ss', null, 'Sample units',
    'contagem',
    false,
    'Prior to each verification event.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #19: Count of the sample units within the project sampling frame that fall 
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:19')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 19, 'CountCHC,ss',
    'Count of the sample units within the project sampling frame that fall into sampling stratum ss and are classified as change category CHC (UDef/SF/SNF/Reg)', null, 'Sample units',
    'contagem',
    false,
    'Prior to each verification event.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #20: Non-CO2 emissions due to biomass burning as part of project activities
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:20')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 20, 'EBSL,BiomassBurn,i,t',
    'Non-CO2 emissions due to biomass burning as part of project activities in forest stratum i in year t', null, 'tCO2e',
    'volume',
    false,
    'Prior to each verification event.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #21: Net CO2e emissions from carbon stock changes due to the implementation
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:21')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 21, 'ECstocks,LMZ,t',
    'Net CO2e emissions from carbon stock changes due to the implementation of leakage mitigation measures in the leakage management zone in year t.', null, 'tCO2e',
    'volume',
    false,
    'Prior to each verification event.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #22: Emissions from fossil fuel combustion in forest stratum i in year t of
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:22')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 22, 'EBSL,FC,i,t',
    'Emissions from fossil fuel combustion in forest stratum i in year t of the baseline', null, 'tCO2e',
    'volume',
    false,
    'Prior to each verification event.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #23: Emissions from fossil fuel combustion in forest stratum i in year t.
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:23')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 23, 'EMP,FC,i,t',
    'Emissions from fossil fuel combustion in forest stratum i in year t.', null, 'tCO2e',
    'volume',
    false,
    'Prior to each verification event.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #24: Proportion of households living in the project activities region that 
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:24')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 24, 'PROPMIG',
    'Proportion of households living in the project activities region that are recent migrants and are engaging in land use activities identified as a baseline driver of unplanned deforestation.', null, 'Proportion',
    'percentual',
    false,
    'Every six years at baseline renewal.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #25: Date of image used to interpret the start and end dates of sample s cl
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:25')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 25, 'tstart,ss,s
tend,ss,s',
    'Date of image used to interpret the start and end dates of sample s classified in sampling stratum ss.', null, 'Decimal year',
    'contagem',
    false,
    'Prior to each verification event.', 'Monitoring of forest',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.1 - Data and Parameters available at Validation
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. monitoring reports; online platform for sensing remote)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #26: Estimated carbon stock in pool p of forest stratum i
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:26')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 26, 'Cp,i',
    'Estimated carbon stock in pool p of forest stratum i', null, 'tCO2e/ha',
    'volume',
    false,
    'Every six years at baseline renewal.', 'Biodiversity',
    'Facilitate fauna and flora inventory and monitor wildlife and plant species.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. carbon stock inventory)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #27: Estimated carbon stock in post-deforestation pool (AB_tree and BB_tree
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:27')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 27, 'Cp,post,i',
    'Estimated carbon stock in post-deforestation pool (AB_tree and BB_tree) in forest stratum i', null, 'tCO2e/ha',
    'volume',
    false,
    'Every six years at baseline renewal.', 'Biodiversity',
    'Facilitate fauna and flora inventory and monitor wildlife and plant species.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. carbon stock inventory)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #28: Forest carbon stock in aboveground tree biomass in stratum i
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:28')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 28, 'CAB_tree,i',
    'Forest carbon stock in aboveground tree biomass in stratum i', null, 'tCO2e/ha',
    'volume',
    false,
    'Every six years at baseline renewal.', 'Biodiversity',
    'Facilitate fauna and flora inventory and monitor wildlife and plant species.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. carbon stock inventory)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #29: Post-land uses transition carbon stock in aboveground tree biomass in 
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:29')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 29, 'CAB_tree,post,i',
    'Post-land uses transition carbon stock in aboveground tree biomass in stratum i', null, 'tCO2e/ha',
    'volume',
    false,
    'Every six years at baseline renewal.', 'Biodiversity',
    'Facilitate fauna and flora inventory and monitor wildlife and plant species.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. carbon stock inventory)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #30: Forest carbon stock belowground tree biomass in stratum i
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:30')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 30, 'CBB_tree,i',
    'Forest carbon stock belowground tree biomass in stratum i', null, 'tCO2e/ha',
    'volume',
    false,
    'Every six years at baseline renewal.', 'Biodiversity',
    'Facilitate fauna and flora inventory and monitor wildlife and plant species.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. carbon stock inventory)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- clima #31: Post land use transition carbon stock in belowground tree biomass in s
  v_ind := md5('carbon_ind:' || v_projeto::text || ':clima:31')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'clima', 31, 'CBB_tree,post,i',
    'Post land use transition carbon stock in belowground tree biomass in stratum i.', null, 'tCO2e/ha',
    'volume',
    false,
    'Every six years at baseline renewal.', 'Biodiversity',
    'Facilitate fauna and flora inventory and monitor wildlife and plant species.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'i. Data and parameters derived from the VM0048 and VMD0055 methodologies are systematically monitored. Additional details regarding the calculation and methodological specifications of each parameter can be found in the following sections of the Project Description (PD):
- Section 3.3.2 - Data and Parameters Monitored
ii. Supporting documents (i.e. carbon stock inventory)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #1: Number of illegal activities reported to public agencies
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:1')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 1, null,
    'Number of illegal activities reported to public agencies', null, null,
    'contagem',
    false,
    'Semi-annual', 'Monitoring of forest',
    'Participatory and community monitoring of illegal activities;', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging,',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 3.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #2: Response Time of Authorities After Reporting
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:2')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 2, null,
    'Response Time of Authorities After Reporting', null, 'Days',
    'contagem',
    false,
    null, 'Monitoring of forest',
    'Participatory and community monitoring of illegal activities;', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging,',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 21.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #3: Number of Awaeté people participating in monitoring
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:3')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 3, null,
    'Number of Awaeté people participating in monitoring', null, null,
    'contagem',
    false,
    'Semi-annual', 'Monitoring of forest',
    'Participatory and community monitoring of illegal activities;', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging,',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 26.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #4: Number of monitoring and signaling equipment provided to the community
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:4')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 4, null,
    'Number of monitoring and signaling equipment provided to the community', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of forest',
    'Provide means for monitoring, patrolling, and signaling in the project area by the IT.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging,',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 1.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 1.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 1.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #5: Number of Ethno-environmental Agents Trained
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:5')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 5, null,
    'Number of Ethno-environmental Agents Trained', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of forest',
    'Support the training of ethno-environmental agents.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging,',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #6: Hours of Training Delivered
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:6')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 6, null,
    'Hours of Training Delivered', null, 'Hours',
    'contagem',
    false,
    null, 'Monitoring of forest',
    'Support the training of ethno-environmental agents.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging,',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #7: Percentage of Female and Youth Participation
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:7')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 7, null,
    'Percentage of Female and Youth Participation', null, '%',
    'percentual',
    false,
    null, 'Monitoring of forest',
    'Support the training of ethno-environmental agents.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging,',
    'Greenhouse gas emissions reduction', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #8: Numbers of Awaeté trained for fire brigade
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:8')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 8, null,
    'Numbers of Awaeté trained for fire brigade', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of forest',
    'Facilitate the sharing of project resources (satellite monitoring, firefighting brigades) with relevant authorities', 'Stimulate and incentivize sustainable development practices and programs',
    'Conservation and sustainable use of the forest', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #9: Number of Training Courses Offered
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:9')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 9, null,
    'Number of Training Courses Offered', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of forest',
    'Facilitate training courses and make calls for proposals and public policies on forest preservation, biodiversity, and sustainable agriculture accessible to the IT', 'Stimulate and incentivize sustainable development practices and programs',
    'Conservation and sustainable use of the forest', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 1.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #10: Percetage of Female and Youth Participation
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:10')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 10, null,
    'Percetage of Female and Youth Participation', null, '%',
    'percentual',
    false,
    null, 'Monitoring of forest',
    'Facilitate training courses and make calls for proposals and public policies on forest preservation, biodiversity, and sustainable agriculture accessible to the IT', 'Stimulate and incentivize sustainable development practices and programs',
    'Conservation and sustainable use of the forest', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #11: Number of Proposals Submitted by the Community
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:11')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 11, null,
    'Number of Proposals Submitted by the Community', null, null,
    'contagem',
    false,
    null, 'Monitoring of forest',
    'Facilitate training courses and make calls for proposals and public policies on forest preservation, biodiversity, and sustainable agriculture accessible to the IT', 'Stimulate and incentivize sustainable development practices and programs',
    'Conservation and sustainable use of the forest', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #12: Reports with business plan including economic feasibility analysis
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:12')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 12, null,
    'Reports with business plan including economic feasibility analysis', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of productive chains',
    'Development of a business plan for bioeconomy products.', 'Establishment of the Community Protocol',
    'Well-structured bioeconomy chains generating income;', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 2.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #13: Market analysis reports
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:13')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 13, null,
    'Market analysis reports', null, null,
    'contagem',
    false,
    null, 'Monitoring of productive chains',
    'Development of a business plan for bioeconomy products.', 'Establishment of the Community Protocol',
    'Well-structured bioeconomy chains generating income;', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 2.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #14: Number of Training Courses Offered
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:14')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 14, null,
    'Number of Training Courses Offered', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of productive chains',
    'Provide means to organize the production base of bioeconomy products;', 'Structuring of equipment for the management, production, and transportation of bioeconomy products.',
    'Well-structured bioeconomy chains generating income;', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #15: Percetage of Female and Youth Participation
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:15')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 15, null,
    'Percetage of Female and Youth Participation', null, '%',
    'percentual',
    false,
    null, 'Monitoring of productive chains',
    'Provide means to organize the production base of bioeconomy products;', 'Structuring of equipment for the management, production, and transportation of bioeconomy products.',
    'Well-structured bioeconomy chains generating income;', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #16: Number of tools, equipment, and technologies provided to the productio
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:16')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 16, null,
    'Number of tools, equipment, and technologies provided to the production base', null, null,
    'contagem',
    false,
    null, 'Monitoring of productive chains',
    'Provide means to organize the production base of bioeconomy products;', 'Structuring of equipment for the management, production, and transportation of bioeconomy products.',
    'Well-structured bioeconomy chains generating income;', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #17: Number of villages with production transported in the period
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:17')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 17, null,
    'Number of villages with production transported in the period', null, null,
    'contagem',
    false,
    null, 'Monitoring of productive chains',
    'Provide means to organize the production base of bioeconomy products;', 'Structuring of equipment for the management, production, and transportation of bioeconomy products.',
    'Well-structured bioeconomy chains generating income;', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #18: Value of resources allocated to logistical support
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:18')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 18, null,
    'Value of resources allocated to logistical support', null, 'R$',
    'contagem',
    false,
    null, 'Monitoring of productive chains',
    'Provide means to organize the production base of bioeconomy products;', 'Structuring of equipment for the management, production, and transportation of bioeconomy products.',
    'Well-structured bioeconomy chains generating income;', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #19: Volume of production transported
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:19')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 19, null,
    'Volume of production transported', null, 'kg or tons',
    'contagem',
    false,
    null, 'Monitoring of productive chains',
    'Provide means to organize the production base of bioeconomy products;', 'Structuring of equipment for the management, production, and transportation of bioeconomy products.',
    'Well-structured bioeconomy chains generating income;', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #20: Value of Resources Allocated for Equipment Acquisition
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:20')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 20, null,
    'Value of Resources Allocated for Equipment Acquisition', null, 'R$',
    'contagem',
    false,
    'Every two years', 'Monitoring of productive chains',
    'Provide resources for purchasing equipment for bioeconomy products.', 'Structuring of equipment for the management, production, and transportation of bioeconomy products.',
    'Well-structured bioeconomy chains generating income;', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #21: Number of Equipment Acquired
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:21')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 21, null,
    'Number of Equipment Acquired', null, null,
    'contagem',
    false,
    null, 'Monitoring of productive chains',
    'Provide resources for purchasing equipment for bioeconomy products.', 'Structuring of equipment for the management, production, and transportation of bioeconomy products.',
    'Well-structured bioeconomy chains generating income;', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #22: Number of Schools Benefited
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:22')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 22, null,
    'Number of Schools Benefited', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of productive chains',
    'Development of means to supply açaí pulp for school meals.', 'Cooperative capable of supplying school meals.',
    'Well-structured bioeconomy chains generating income;', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 22.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 22.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #23: Volume of Açaí Pulp Provided
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:23')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 23, null,
    'Volume of Açaí Pulp Provided', null, 'L',
    'contagem',
    false,
    null, 'Monitoring of productive chains',
    'Development of means to supply açaí pulp for school meals.', 'Cooperative capable of supplying school meals.',
    'Well-structured bioeconomy chains generating income;', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #24: Number of Training Courses Offered
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:24')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 24, null,
    'Number of Training Courses Offered', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of productive chains',
    'Facilitate training for management, production, and collective marketing of bioeconomy products.', 'Cooperative capable of supplying school meals.',
    'Improved efficiency and productivity of bioeconomy products.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #25: Percetage of Female and Youth Participation
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:25')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 25, null,
    'Percetage of Female and Youth Participation', null, '%',
    'percentual',
    false,
    null, 'Monitoring of productive chains',
    'Facilitate training for management, production, and collective marketing of bioeconomy products.', 'Cooperative capable of supplying school meals.',
    'Improved efficiency and productivity of bioeconomy products.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #26: Number of Groups or Cooperatives Formed
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:26')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 26, null,
    'Number of Groups or Cooperatives Formed', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of productive chains',
    'Strengthening the establishment of cooperatives.', 'Cooperative capable of commercializing bioeconomy chain products, with value-added commercial strategies without the need for industrialization.',
    'Improved efficiency and productivity of bioeconomy products.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #27: Number of Members in the Cooperatives
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:27')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 27, null,
    'Number of Members in the Cooperatives', null, null,
    'contagem',
    false,
    null, 'Monitoring of productive chains',
    'Strengthening the establishment of cooperatives.', 'Cooperative capable of commercializing bioeconomy chain products, with value-added commercial strategies without the need for industrialization.',
    'Improved efficiency and productivity of bioeconomy products.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #28: Income of Cooperative Members
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:28')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 28, null,
    'Income of Cooperative Members', null, 'R$',
    'contagem',
    false,
    null, 'Monitoring of productive chains',
    'Strengthening the establishment of cooperatives.', 'Cooperative capable of commercializing bioeconomy chain products, with value-added commercial strategies without the need for industrialization.',
    'Improved efficiency and productivity of bioeconomy products.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #29: Number of Bilingual Educational Materials Developed
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:29')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 29, null,
    'Number of Bilingual Educational Materials Developed', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of education services',
    'Implement culturally appropriate educational materials, promoting bilingual education training.', 'Schools with adequate infrastructure and bilingual educational materials available to all community members, along with an increase in indigenous students in higher education.',
    'Increase in the level of education, personal development, and reinforcement of cultural and linguistic identity.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 1.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #30: Number of Teachers Trained in Bilingual Education
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:30')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 30, null,
    'Number of Teachers Trained in Bilingual Education', null, null,
    'contagem',
    false,
    null, 'Monitoring of education services',
    'Implement culturally appropriate educational materials, promoting bilingual education training.', 'Schools with adequate infrastructure and bilingual educational materials available to all community members, along with an increase in indigenous students in higher education.',
    'Increase in the level of education, personal development, and reinforcement of cultural and linguistic identity.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #31: Number of Schools
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:31')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 31, null,
    'Number of Schools', null, null,
    'contagem',
    false,
    null, 'Monitoring of education services',
    'Implement culturally appropriate educational materials, promoting bilingual education training.', 'Schools with adequate infrastructure and bilingual educational materials available to all community members, along with an increase in indigenous students in higher education.',
    'Increase in the level of education, personal development, and reinforcement of cultural and linguistic identity.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 22.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 22.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #32: Number of Schools and Villages Benefited from Bilingual Education
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:32')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 32, null,
    'Number of Schools and Villages Benefited from Bilingual Education', null, '-',
    'contagem',
    false,
    null, 'Monitoring of education services',
    'Implement culturally appropriate educational materials, promoting bilingual education training.', 'Schools with adequate infrastructure and bilingual educational materials available to all community members, along with an increase in indigenous students in higher education.',
    'Increase in the level of education, personal development, and reinforcement of cultural and linguistic identity.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #33: Number of Partnerships Established with Educational Institutions
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:33')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 33, null,
    'Number of Partnerships Established with Educational Institutions', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of education services',
    'Coordinate with educational institutions to increase enrollment opportunities.', 'Schools with adequate infrastructure and bilingual educational materials available to all community members, along with an increase in indigenous students in higher education.',
    'Increase in the level of education, personal development, and reinforcement of cultural and linguistic identity.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #34: Number of Enrollments per Year
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:34')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 34, null,
    'Number of Enrollments per Year', null, null,
    'contagem',
    false,
    null, 'Monitoring of education services',
    'Coordinate with educational institutions to increase enrollment opportunities.', 'Schools with adequate infrastructure and bilingual educational materials available to all community members, along with an increase in indigenous students in higher education.',
    'Increase in the level of education, personal development, and reinforcement of cultural and linguistic identity.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #35: Number of consultations conducted
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:35')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 35, null,
    'Number of consultations conducted', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of healthcare services and conditions',
    'Promote means for the construction, operation, transportation, maintenance, and training of technicians (including traditional medicine) in health centers throughout the IT.', 'Increase in the capacity for prevention, diagnosis, and treatment of diseases.',
    'Improvement in physical well-being, reduction in mortality rates.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #36: Average response time in medical emergencies.
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:36')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 36, null,
    'Average response time in medical emergencies.', null, 'Hours',
    'contagem',
    false,
    null, 'Monitoring of healthcare services and conditions',
    'Promote means for the construction, operation, transportation, maintenance, and training of technicians (including traditional medicine) in health centers throughout the IT.', 'Increase in the capacity for prevention, diagnosis, and treatment of diseases.',
    'Improvement in physical well-being, reduction in mortality rates.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #37: Number of infant mortality
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:37')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 37, null,
    'Number of infant mortality', null, null,
    'contagem',
    false,
    null, 'Monitoring of healthcare services and conditions',
    'Promote means for the construction, operation, transportation, maintenance, and training of technicians (including traditional medicine) in health centers throughout the IT.', 'Increase in the capacity for prevention, diagnosis, and treatment of diseases.',
    'Improvement in physical well-being, reduction in mortality rates.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 15.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #38: Number of villages with diseases such as diarrhea
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:38')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 38, null,
    'Number of villages with diseases such as diarrhea', null, null,
    'contagem',
    false,
    null, 'Monitoring of healthcare services and conditions',
    'Promote means for the construction, operation, transportation, maintenance, and training of technicians (including traditional medicine) in health centers throughout the IT.', 'Increase in the capacity for prevention, diagnosis, and treatment of diseases.',
    'Improvement in physical well-being, reduction in mortality rates.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 14.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #39: Reduction in infant mortality rates and diseases such as diarrhea
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:39')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 39, null,
    'Reduction in infant mortality rates and diseases such as diarrhea', null, null,
    'contagem',
    false,
    null, 'Monitoring of healthcare services and conditions',
    'Promote means for the construction, operation, transportation, maintenance, and training of technicians (including traditional medicine) in health centers throughout the IT.', 'Increase in the capacity for prevention, diagnosis, and treatment of diseases.',
    'Improvement in physical well-being, reduction in mortality rates.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #40: Number of trained health technicians actively working
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:40')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 40, null,
    'Number of trained health technicians actively working', null, null,
    'contagem',
    false,
    null, 'Monitoring of healthcare services and conditions',
    'Promote means for the construction, operation, transportation, maintenance, and training of technicians (including traditional medicine) in health centers throughout the IT.', 'Increase in the capacity for prevention, diagnosis, and treatment of diseases.',
    'Improvement in physical well-being, reduction in mortality rates.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #41: Number of villages with a healthcare facility
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:41')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 41, null,
    'Number of villages with a healthcare facility', null, '-',
    'contagem',
    false,
    null, 'Monitoring of healthcare services and conditions',
    'Promote means for the construction, operation, transportation, maintenance, and training of technicians (including traditional medicine) in health centers throughout the IT.', 'Increase in the capacity for prevention, diagnosis, and treatment of diseases.',
    'Improvement in physical well-being, reduction in mortality rates.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #42: Number of dedicated health vehicles available
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:42')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 42, null,
    'Number of dedicated health vehicles available', null, '-',
    'contagem',
    false,
    null, 'Monitoring of healthcare services and conditions',
    'Promote means for the construction, operation, transportation, maintenance, and training of technicians (including traditional medicine) in health centers throughout the IT.', 'Increase in the capacity for prevention, diagnosis, and treatment of diseases.',
    'Improvement in physical well-being, reduction in mortality rates.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #43: Number of courses conducted and participants trained
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:43')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 43, null,
    'Number of courses conducted and participants trained', null, '-',
    'contagem',
    false,
    null, 'Monitoring of healthcare services and conditions',
    'Promote means for the construction, operation, transportation, maintenance, and training of technicians (including traditional medicine) in health centers throughout the IT.', 'Increase in the capacity for prevention, diagnosis, and treatment of diseases.',
    'Improvement in physical well-being, reduction in mortality rates.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #44: Total Value of Resources Allocated for Sanitation
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:44')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 44, null,
    'Total Value of Resources Allocated for Sanitation', null, 'R$',
    'contagem',
    false,
    'Every two years', 'Monitoring of housing structure',
    'Provide resources and foster partnerships for the creation, operation, and maintenance of sanitation systems.', 'Implementation of a structured and fully functional basic sanitation system (water, sewage, waste) in all villages.',
    'Better housing conditions, food preservation, and communication', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #45: Total Value of Resources Allocated for Safe Drinking Water
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:45')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 45, null,
    'Total Value of Resources Allocated for Safe Drinking Water', null, 'R$',
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Provide resources and foster partnerships for the creation, operation, and maintenance of sanitation systems.', 'Implementation of a structured and fully functional basic sanitation system (water, sewage, waste) in all villages.',
    'Better housing conditions, food preservation, and communication', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #46: Total Value of Resources Allocated for Sewage Treatment
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:46')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 46, null,
    'Total Value of Resources Allocated for Sewage Treatment', null, 'R$',
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Provide resources and foster partnerships for the creation, operation, and maintenance of sanitation systems.', 'Implementation of a structured and fully functional basic sanitation system (water, sewage, waste) in all villages.',
    'Better housing conditions, food preservation, and communication', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #47: Total Value of Resources Allocated for Waste Treatment
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:47')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 47, null,
    'Total Value of Resources Allocated for Waste Treatment', null, 'R$',
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Provide resources and foster partnerships for the creation, operation, and maintenance of sanitation systems.', 'Implementation of a structured and fully functional basic sanitation system (water, sewage, waste) in all villages.',
    'Better housing conditions, food preservation, and communication', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #48: Number of Partnerships Established for Sanitation
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:48')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 48, null,
    'Number of Partnerships Established for Sanitation', null, 'R$',
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Provide resources and foster partnerships for the creation, operation, and maintenance of sanitation systems.', 'Implementation of a structured and fully functional basic sanitation system (water, sewage, waste) in all villages.',
    'Better housing conditions, food preservation, and communication', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #49: Number of Trainings Conducted for the Operation and Maintenance of the
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:49')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 49, null,
    'Number of Trainings Conducted for the Operation and Maintenance of the Sanitation System', null, 'R$',
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Provide resources and foster partnerships for the creation, operation, and maintenance of sanitation systems.', 'Implementation of a structured and fully functional basic sanitation system (water, sewage, waste) in all villages.',
    'Better housing conditions, food preservation, and communication', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #50: Number of villages with Access to Safe Drinking Water
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:50')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 50, null,
    'Number of villages with Access to Safe Drinking Water', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of housing structure',
    'Enhance infrastructure (water, electricity, sanitation, internet) in villages.', 'Renovated houses and community buildings with access to quality internet.',
    'Better housing conditions, food preservation, and communication', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 10.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #51: Number of villages with Access to Sewage Treatment
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:51')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 51, null,
    'Number of villages with Access to Sewage Treatment', null, null,
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Enhance infrastructure (water, electricity, sanitation, internet) in villages.', 'Renovated houses and community buildings with access to quality internet.',
    'Better housing conditions, food preservation, and communication', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #52: Number of villages with Access to Waste Treatment
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:52')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 52, null,
    'Number of villages with Access to Waste Treatment', null, null,
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Enhance infrastructure (water, electricity, sanitation, internet) in villages.', 'Renovated houses and community buildings with access to quality internet.',
    'Better housing conditions, food preservation, and communication', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #53: Number of villages with access to internet
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:53')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 53, null,
    'Number of villages with access to internet', null, null,
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Enhance infrastructure (water, electricity, sanitation, internet) in villages.', 'Renovated houses and community buildings with access to quality internet.',
    'Better housing conditions, food preservation, and communication', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 14.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #54: Total Value of Resources Allocated for access to internet
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:54')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 54, null,
    'Total Value of Resources Allocated for access to internet', null, 'R$',
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Enhance infrastructure (water, electricity, sanitation, internet) in villages.', 'Renovated houses and community buildings with access to quality internet.',
    'Better housing conditions, food preservation, and communication', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #55: Residential satisfication survey to acess the confort  and suitability
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:55')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 55, null,
    'Residential satisfication survey to acess the confort  and suitability of the new housing', null, null,
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Enhance infrastructure (water, electricity, sanitation, internet) in villages.', 'Renovated houses and community buildings with access to quality internet.',
    'Better housing conditions, food preservation, and communication', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #56: Number of Energy Systems Constructed
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:56')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 56, null,
    'Number of Energy Systems Constructed', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of housing structure',
    'Promote means for the construction, operation, maintenance, and training of energy systems.', 'Structured and fully operational energy system in all villages within the IT.',
    'Improvement in community sanitation conditions.', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #57: Number of Villages with partial access to energy
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:57')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 57, null,
    'Number of Villages with partial access to energy', null, null,
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Promote means for the construction, operation, maintenance, and training of energy systems.', 'Structured and fully operational energy system in all villages within the IT.',
    null, 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 19.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #58: Total Value of Resources Allocated for access to energy
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:58')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 58, null,
    'Total Value of Resources Allocated for access to energy', null, 'R$',
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Promote means for the construction, operation, maintenance, and training of energy systems.', 'Structured and fully operational energy system in all villages within the IT.',
    null, 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #59: Number of Technicians Trained for Operation and Maintenance
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:59')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 59, null,
    'Number of Technicians Trained for Operation and Maintenance', null, null,
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Promote means for the construction, operation, maintenance, and training of energy systems.', 'Structured and fully operational energy system in all villages within the IT.',
    null, 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #60: Number of Partnerships for Energy System Implementation
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:60')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 60, null,
    'Number of Partnerships for Energy System Implementation', null, null,
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Promote means for the construction, operation, maintenance, and training of energy systems.', 'Structured and fully operational energy system in all villages within the IT.',
    null, 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #61: Continuous Operation Rate of Energy Systems
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:61')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 61, null,
    'Continuous Operation Rate of Energy Systems', null, 'Hours',
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Promote means for the construction, operation, maintenance, and training of energy systems.', 'Structured and fully operational energy system in all villages within the IT.',
    null, 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #62: Number of Training Courses Offered
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:62')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 62, null,
    'Number of Training Courses Offered', null, null,
    'contagem',
    false,
    null, 'Monitoring of housing structure',
    'Promote means for the construction, operation, maintenance, and training of energy systems.', 'Structured and fully operational energy system in all villages within the IT.',
    null, 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #63: Percetage of Female and Youth Participation
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:63')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 63, null,
    'Percetage of Female and Youth Participation', null, '%',
    'percentual',
    false,
    null, 'Monitoring of housing structure',
    'Promote means for the construction, operation, maintenance, and training of energy systems.', 'Structured and fully operational energy system in all villages within the IT.',
    null, 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #64: Number of villages experiencing food insecurity
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:64')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 64, null,
    'Number of villages experiencing food insecurity', null, 'Villages',
    'contagem',
    false,
    'Every two years', 'Monitoring of food security',
    'Facilitate access to public policies for the marketing and consumption of local foods.', 'Increase in local production and implementation of nutrition training programs for school cooks with school menus adapted to local dietary traditions.',
    null, 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 12.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #65: Food insecurity rate in villages before and after project implementati
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:65')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 65, null,
    'Food insecurity rate in villages before and after project implementation.', null, '%',
    'percentual',
    false,
    null, 'Monitoring of food security',
    'Facilitate access to public policies for the marketing and consumption of local foods.', null,
    null, 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #66: Periodic nutritional assessments of school meals and feedback from stu
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:66')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 66, null,
    'Periodic nutritional assessments of school meals and feedback from students regarding meal acceptance.', null, null,
    'contagem',
    false,
    null, 'Monitoring of food security',
    'Facilitate access to public policies for the marketing and consumption of local foods.', null,
    null, 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #67: Agricultural production and livestock statistics, comparing data befor
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:67')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 67, null,
    'Agricultural production and livestock statistics, comparing data before and after the intervention.', null, null,
    'contagem',
    false,
    null, 'Monitoring of food security',
    'Facilitate access to public policies for the marketing and consumption of local foods.', null,
    null, 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #68: Number of Trainings or Capacity-Building Sessions on Public Policies f
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:68')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 68, null,
    'Number of Trainings or Capacity-Building Sessions on Public Policies for Commercialization.', null, null,
    'contagem',
    false,
    null, 'Monitoring of food security',
    'Facilitate access to public policies for the marketing and consumption of local foods.', null,
    null, 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #69: Percetage of female and youth participation in trainings
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:69')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 69, null,
    'Percetage of female and youth participation in trainings', null, '%',
    'percentual',
    false,
    null, 'Monitoring of food security',
    'Facilitate access to public policies for the marketing and consumption of local foods.', null,
    null, 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #70: Number of Technical Partnerships Established
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:70')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 70, null,
    'Number of Technical Partnerships Established', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of food security',
    'Foster technical partnerships for cultivation, animal husbandry, agroforestry systems, and distribution of equipment and seeds', null,
    'Enhancement of food and nutritional security, and strengthening of local culture and production', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #71: Number of Local Technicians Trained
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:71')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 71, null,
    'Number of Local Technicians Trained', null, null,
    'contagem',
    false,
    null, 'Monitoring of food security',
    'Foster technical partnerships for cultivation, animal husbandry, agroforestry systems, and distribution of equipment and seeds', null,
    'Enhancement of food and nutritional security, and strengthening of local culture and production', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #72: Number of Equipment and Seeds Distributed
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:72')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 72, null,
    'Number of Equipment and Seeds Distributed', null, null,
    'contagem',
    false,
    null, 'Monitoring of food security',
    'Foster technical partnerships for cultivation, animal husbandry, agroforestry systems, and distribution of equipment and seeds', null,
    'Enhancement of food and nutritional security, and strengthening of local culture and production', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #73: Total Land Area Covered by Agroforestry Systems
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:73')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 73, null,
    'Total Land Area Covered by Agroforestry Systems', null, 'ha',
    'area',
    false,
    null, 'Monitoring of food security',
    'Foster technical partnerships for cultivation, animal husbandry, agroforestry systems, and distribution of equipment and seeds', null,
    'Enhancement of food and nutritional security, and strengthening of local culture and production', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #74: Number of Trainings Conducted in Sustainable Agriculture
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:74')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 74, null,
    'Number of Trainings Conducted in Sustainable Agriculture', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of food security',
    'Train the community in developing sustainable agriculture projects.', 'Improved income and indigenous people better equipped to utilize resources for sustainable activities',
    'Enhancement of food and nutritional security, and strengthening of local culture and production', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #75: Percetage of Female and Youth Participation
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:75')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 75, null,
    'Percetage of Female and Youth Participation', null, '%',
    'percentual',
    false,
    null, 'Monitoring of food security',
    'Train the community in developing sustainable agriculture projects.', 'Improved income and indigenous people better equipped to utilize resources for sustainable activities',
    'Enhancement of food and nutritional security, and strengthening of local culture and production', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #76: Adoption Rate of Sustainable Agriculture Practices
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:76')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 76, null,
    'Adoption Rate of Sustainable Agriculture Practices', null, null,
    'contagem',
    false,
    null, 'Monitoring of food security',
    'Train the community in developing sustainable agriculture projects.', 'Improved income and indigenous people better equipped to utilize resources for sustainable activities',
    'Enhancement of food and nutritional security, and strengthening of local culture and production', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #77: Satisfaction Surveys on the Trainings
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:77')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 77, null,
    'Satisfaction Surveys on the Trainings', null, null,
    'contagem',
    false,
    null, 'Monitoring of food security',
    'Train the community in developing sustainable agriculture projects.', 'Improved income and indigenous people better equipped to utilize resources for sustainable activities',
    'Enhancement of food and nutritional security, and strengthening of local culture and production', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #78: Number of Sustainable Agriculture Projects Developed by the Community
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:78')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 78, null,
    'Number of Sustainable Agriculture Projects Developed by the Community', null, null,
    'contagem',
    false,
    null, 'Monitoring of food security',
    'Train the community in developing sustainable agriculture projects.', 'Improved income and indigenous people better equipped to utilize resources for sustainable activities',
    'Enhancement of food and nutritional security, and strengthening of local culture and production', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #79: Number of Partnerships Established to Support Sustainable Agriculture
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:79')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 79, null,
    'Number of Partnerships Established to Support Sustainable Agriculture', null, null,
    'contagem',
    false,
    null, 'Monitoring of food security',
    'Train the community in developing sustainable agriculture projects.', 'Improved income and indigenous people better equipped to utilize resources for sustainable activities',
    'Enhancement of food and nutritional security, and strengthening of local culture and production', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #80: Total allocated (in BRL) for community food support.
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:80')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 80, null,
    'Total allocated (in BRL) for community food support.', null, 'R$',
    'contagem',
    false,
    null, 'Monitoring of food security',
    'Train the community in developing sustainable agriculture projects.', 'Improved income and indigenous people better equipped to utilize resources for sustainable activities',
    'Enhancement of food and nutritional security, and strengthening of local culture and production', 'Socioeconomic transformation and improvement of quality of life within the Indigenous Territory through full access to income, food, education, sanitation, and health.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 2119.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 10674.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #81: Number of Cultural Events Conducted, Documented, and Their Frequency
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:81')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 81, null,
    'Number of Cultural Events Conducted, Documented, and Their Frequency', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of cultural maintenance and rescue',
    'Encourage the development and registration of cultural activities and facilitate exchanges among the Parakanã indigenous people.', 'Documentation of cultural practices, development of bilingual educational materials, and establishment of the Culture Center.',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 3.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #82: Quantity of Cultural Materials Produced and Their Use in Educational a
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:82')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 82, null,
    'Quantity of Cultural Materials Produced and Their Use in Educational and Community Contexts', null, null,
    'contagem',
    false,
    null, 'Monitoring of cultural maintenance and rescue',
    'Encourage the development and registration of cultural activities and facilitate exchanges among the Parakanã indigenous people.', 'Documentation of cultural practices, development of bilingual educational materials, and establishment of the Culture Center.',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #83: Number of Cultural Exchange Activities Conductedi.
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:83')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 83, null,
    'Number of Cultural Exchange Activities Conductedi.', null, null,
    'contagem',
    false,
    null, 'Monitoring of cultural maintenance and rescue',
    'Encourage the development and registration of cultural activities and facilitate exchanges among the Parakanã indigenous people.', 'Documentation of cultural practices, development of bilingual educational materials, and establishment of the Culture Center.',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #84: Number of Cultural Records Created
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:84')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 84, null,
    'Number of Cultural Records Created', null, null,
    'contagem',
    false,
    null, 'Monitoring of cultural maintenance and rescue',
    'Encourage the development and registration of cultural activities and facilitate exchanges among the Parakanã indigenous people.', 'Documentation of cultural practices, development of bilingual educational materials, and establishment of the Culture Center.',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #85: Inclusion Rate of Cultural Activities in Educational Curricula
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:85')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 85, null,
    'Inclusion Rate of Cultural Activities in Educational Curricula', null, null,
    'contagem',
    false,
    null, 'Monitoring of cultural maintenance and rescue',
    'Encourage the development and registration of cultural activities and facilitate exchanges among the Parakanã indigenous people.', 'Documentation of cultural practices, development of bilingual educational materials, and establishment of the Culture Center.',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #86: Number of Youth Involved in Cultural Activities
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:86')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 86, null,
    'Number of Youth Involved in Cultural Activities', null, null,
    'contagem',
    false,
    null, 'Monitoring of cultural maintenance and rescue',
    'Encourage the development and registration of cultural activities and facilitate exchanges among the Parakanã indigenous people.', 'Documentation of cultural practices, development of bilingual educational materials, and establishment of the Culture Center.',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #87: Number of Women Involved in Cultural Activities
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:87')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 87, null,
    'Number of Women Involved in Cultural Activities', null, null,
    'contagem',
    false,
    null, 'Monitoring of cultural maintenance and rescue',
    'Encourage the development and registration of cultural activities and facilitate exchanges among the Parakanã indigenous people.', 'Documentation of cultural practices, development of bilingual educational materials, and establishment of the Culture Center.',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #88: Number of FPICs Conducted (Free, Prior, and Informed Consultations)
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:88')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 88, null,
    'Number of FPICs Conducted (Free, Prior, and Informed Consultations)', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of cultural maintenance and rescue',
    'Conduct FPICs in accordance with ILO 169', 'Strengthening of leadership, rescue, and preservation of socio-cultural heritage;',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 2.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 2.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #89: Community Participation Rate in FPICs
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:89')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 89, null,
    'Community Participation Rate in FPICs', null, null,
    'contagem',
    false,
    null, 'Monitoring of cultural maintenance and rescue',
    'Conduct FPICs in accordance with ILO 169', 'Strengthening of leadership, rescue, and preservation of socio-cultural heritage;',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #90: Women’s Participation Rate in FPICs
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:90')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 90, null,
    'Women’s Participation Rate in FPICs', null, null,
    'contagem',
    false,
    null, 'Monitoring of cultural maintenance and rescue',
    'Conduct FPICs in accordance with ILO 169', 'Strengthening of leadership, rescue, and preservation of socio-cultural heritage;',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #91: Youth Participation Rate in FPICs
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:91')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 91, null,
    'Youth Participation Rate in FPICs', null, null,
    'contagem',
    false,
    null, 'Monitoring of cultural maintenance and rescue',
    'Conduct FPICs in accordance with ILO 169', 'Strengthening of leadership, rescue, and preservation of socio-cultural heritage;',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #92: Number of Parakanã individuals
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:92')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 92, null,
    'Number of Parakanã individuals', null, null,
    'contagem',
    false,
    'Every two years', null,
    null, 'Strengthening of leadership, rescue, and preservation of socio-cultural heritage;',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #93: Number of Parakanã women
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:93')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 93, null,
    'Number of Parakanã women', null, null,
    'contagem',
    false,
    null, 'Monitoring of cultural maintenance and rescue',
    'Carry out Social Census and assess community demands in FPICs.', 'Strengthening of leadership, rescue, and preservation of socio-cultural heritage;',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #94: Number of Census Participants
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:94')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 94, null,
    'Number of Census Participants', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of cultural maintenance and rescue',
    'Carry out Social Census and assess community demands in FPICs.', 'Strengthening of leadership, rescue, and preservation of socio-cultural heritage;',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 27.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #95: Census Coverage Rate
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:95')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 95, null,
    'Census Coverage Rate', null, null,
    'contagem',
    false,
    null, 'Monitoring of cultural maintenance and rescue',
    'Carry out Social Census and assess community demands in FPICs.', 'Strengthening of leadership, rescue, and preservation of socio-cultural heritage;',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #96: Number of Categories Assessed in the Census
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:96')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 96, null,
    'Number of Categories Assessed in the Census', null, null,
    'contagem',
    false,
    null, 'Monitoring of cultural maintenance and rescue',
    'Carry out Social Census and assess community demands in FPICs.', 'Strengthening of leadership, rescue, and preservation of socio-cultural heritage;',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #97: Inclusion Rate of Marginalized Groups
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:97')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 97, null,
    'Inclusion Rate of Marginalized Groups', null, null,
    'contagem',
    false,
    null, 'Monitoring of cultural maintenance and rescue',
    'Carry out Social Census and assess community demands in FPICs.', 'Strengthening of leadership, rescue, and preservation of socio-cultural heritage;',
    'Strengthened organizations for project management, planning, and monitoring activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #98: Number of Associations Structured or Strengthened
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:98')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 98, null,
    'Number of Associations Structured or Strengthened', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of institutional strengthening',
    'Strengthen the management and structure of associations, promote affinity groups, and develop training for young and female leaders.', 'Youth and women leadership training programs;',
    'Women and youth engaged and actively participating in the activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 2.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 2.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #99: Number of Female Leaders Trained
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:99')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 99, null,
    'Number of Female Leaders Trained', null, null,
    'contagem',
    false,
    null, 'Monitoring of institutional strengthening',
    'Strengthen the management and structure of associations, promote affinity groups, and develop training for young and female leaders.', 'Youth and women leadership training programs;',
    'Women and youth engaged and actively participating in the activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #100: Number of Youth Trained for Community Leadership
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:100')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 100, null,
    'Number of Youth Trained for Community Leadership', null, null,
    'contagem',
    false,
    null, 'Monitoring of institutional strengthening',
    'Strengthen the management and structure of associations, promote affinity groups, and develop training for young and female leaders.', 'Youth and women leadership training programs;',
    'Women and youth engaged and actively participating in the activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #101: Participation Rate of Women and Youth in Association/Cooperative Activ
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:101')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 101, null,
    'Participation Rate of Women and Youth in Association/Cooperative Activities', null, null,
    'contagem',
    false,
    null, 'Monitoring of institutional strengthening',
    'Strengthen the management and structure of associations, promote affinity groups, and develop training for young and female leaders.', 'Youth and women leadership training programs;',
    'Women and youth engaged and actively participating in the activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #102: Number of Training Sessions on Management and Leadership Conducted
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:102')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 102, null,
    'Number of Training Sessions on Management and Leadership Conducted', null, null,
    'contagem',
    false,
    null, 'Monitoring of institutional strengthening',
    'Strengthen the management and structure of associations, promote affinity groups, and develop training for young and female leaders.', 'Youth and women leadership training programs;',
    'Women and youth engaged and actively participating in the activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #103: Retention Rate of Youth and Women in Leadership Positions
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:103')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 103, null,
    'Retention Rate of Youth and Women in Leadership Positions', null, null,
    'contagem',
    false,
    null, 'Monitoring of institutional strengthening',
    'Strengthen the management and structure of associations, promote affinity groups, and develop training for young and female leaders.', 'Youth and women leadership training programs;',
    'Women and youth engaged and actively participating in the activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #104: Number of Management Committees Established
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:104')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 104, null,
    'Number of Management Committees Established', null, null,
    'contagem',
    false,
    'Every two years', 'Monitoring of institutional strengthening',
    'Establish a management committee, project management office, and coordinate access to PNGATI policies.', 'Implementation of administrative, financial, and project management tools',
    'Women and youth engaged and actively participating in the activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #105: Number of Management Committees conducted by women
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:105')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 105, null,
    'Number of Management Committees conducted by women', null, null,
    'contagem',
    false,
    null, 'Monitoring of institutional strengthening',
    'Establish a management committee, project management office, and coordinate access to PNGATI policies.', 'Implementation of administrative, financial, and project management tools',
    'Women and youth engaged and actively participating in the activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #106: Number of people Trained for the Management Committee
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:106')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 106, null,
    'Number of people Trained for the Management Committee', null, null,
    'contagem',
    false,
    null, 'Monitoring of institutional strengthening',
    'Establish a management committee, project management office, and coordinate access to PNGATI policies.', 'Implementation of administrative, financial, and project management tools',
    'Women and youth engaged and actively participating in the activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #107: Percetage of female and youth participation in trainings
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:107')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 107, null,
    'Percetage of female and youth participation in trainings', null, '%',
    'percentual',
    false,
    null, 'Monitoring of institutional strengthening',
    'Establish a management committee, project management office, and coordinate access to PNGATI policies.', 'Implementation of administrative, financial, and project management tools',
    'Women and youth engaged and actively participating in the activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- comunidade #108: Number of Project Management Offices Created
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:108')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 108, null,
    'Number of Project Management Offices Created', null, null,
    'contagem',
    false,
    null, 'Monitoring of institutional strengthening',
    'Establish a management committee, project management office, and coordinate access to PNGATI policies.', 'Implementation of administrative, financial, and project management tools',
    'Women and youth engaged and actively participating in the activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- comunidade #109: Number of Projects Managed by the Management Office
  v_ind := md5('carbon_ind:' || v_projeto::text || ':comunidade:109')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'comunidade', 109, null,
    'Number of Projects Managed by the Management Office', null, null,
    'contagem',
    false,
    null, 'Monitoring of institutional strengthening',
    'Establish a management committee, project management office, and coordinate access to PNGATI policies.', 'Implementation of administrative, financial, and project management tools',
    'Women and youth engaged and actively participating in the activities.', 'Strengthening cultural identity and governance within the Indigenous Territory.',
    'Supporting documents (i.e. social activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2022-12-31:anual')::uuid,
    v_ind, date '2022-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
    v_ind, date '2023-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':2024-12-31:anual')::uuid,
    v_ind, date '2024-12-31', 'anual', 0.0, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();

  -- biodiversidade #1: Number of illegal activities reported to the authorities.
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:1')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 1, null,
    'Number of illegal activities reported to the authorities.', null, null,
    'contagem',
    false,
    'Annual', 'Monitoring of fauna (avian fauna, mammalian fauna, and herpetofauna)',
    'Participatory and community monitoring of illegal activities such as hunting and animal trafficking.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #2: Response time of authorities after reporting
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:2')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 2, null,
    'Response time of authorities after reporting', null, 'Hours/Day',
    'contagem',
    false,
    'Annual', 'Monitoring of fauna (avian fauna, mammalian fauna, and herpetofauna)',
    'Participatory and community monitoring of illegal activities such as hunting and animal trafficking.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #3: Reduction of illegal activities in monitored areas
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:3')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 3, null,
    'Reduction of illegal activities in monitored areas', null, null,
    'contagem',
    false,
    'Annual', 'Monitoring of fauna (avian fauna, mammalian fauna, and herpetofauna)',
    'Participatory and community monitoring of illegal activities such as hunting and animal trafficking.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #4: Number of Awaeté people participating in monitoring
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:4')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 4, null,
    'Number of Awaeté people participating in monitoring', null, null,
    'contagem',
    false,
    'Annual', 'Monitoring of fauna (avian fauna, mammalian fauna, and herpetofauna)',
    'Participatory and community monitoring of illegal activities such as hunting and animal trafficking.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #5: Species richness.
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:5')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 5, null,
    'Species richness.', null, 'sp/ha',
    'contagem',
    false,
    'Continuous Camera traps.

Annual campaigns considering seasonality.', 'Monitoring of fauna (avian fauna, mammalian fauna, and herpetofauna)',
    'Facilitate fauna  inventory and monitor wildlife.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Fauna Inventory
Camera traps.
Monitoring campaigns (active search, listening points, occasional encounters, community interviews).
Participatory monitoring with the community'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #6: Number of endemic and threatened species
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:6')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 6, null,
    'Number of endemic and threatened species', null, 'sp/ha',
    'contagem',
    false,
    'Continuous Camera traps.

Annual campaigns considering seasonality.', 'Monitoring of fauna (avian fauna, mammalian fauna, and herpetofauna)',
    'Facilitate fauna  inventory and monitor wildlife.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Fauna Inventory
Camera traps.
Monitoring campaigns (active search, listening points, occasional encounters, community interviews).
Participatory monitoring with the community'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #7: Population trend of target species.
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:7')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 7, null,
    'Population trend of target species.', null, 'ind/ha',
    'contagem',
    false,
    'Continuous Camera traps.

Annual campaigns considering seasonality.', 'Monitoring of fauna (avian fauna, mammalian fauna, and herpetofauna)',
    'Facilitate fauna  inventory and monitor wildlife.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Fauna Inventory
Camera traps.
Monitoring campaigns (active search, listening points, occasional encounters, community interviews).
Participatory monitoring with the community'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #8: Number of Training Courses Offered
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:8')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 8, null,
    'Number of Training Courses Offered', null, null,
    'contagem',
    false,
    'Annual', 'Monitoring of fauna (avian fauna, mammalian fauna, and herpetofauna)',
    'Develop alternatives for the conservation of threatened wildlife  used for subsistence in the community.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Training programs with the community'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #9: Community participation rate in conservation programs
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:9')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 9, null,
    'Community participation rate in conservation programs', null, '%',
    'percentual',
    false,
    'Annual', 'Monitoring of fauna (avian fauna, mammalian fauna, and herpetofauna)',
    'Develop alternatives for the conservation of threatened wildlife  used for subsistence in the community.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Training programs with the community'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #10: Number of cooperation agrreements firmed
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:10')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 10, null,
    'Number of cooperation agrreements firmed', null, null,
    'contagem',
    false,
    'Annual', 'Monitoring of fauna (avian fauna, mammalian fauna, and herpetofauna)',
    'Formalize partnerships with universities and institutions to conduct research and support monitoring efforts.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Cooperation agreements with institutions.'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #11: Monitoring Coverage Area
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:11')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 11, null,
    'Monitoring Coverage Area', null, 'ha',
    'area',
    false,
    'Montly', 'Monitoring of flora',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; monitoring reports, photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #12: Data Collection Frequency
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:12')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 12, null,
    'Data Collection Frequency', null, 'Montly',
    'contagem',
    false,
    'Montly', 'Monitoring of flora',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; monitoring reports, photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #13: Detection and Response Time
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:13')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 13, null,
    'Detection and Response Time', null, 'Hours/days',
    'contagem',
    false,
    'Montly', 'Monitoring of flora',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; monitoring reports, photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #14: Number of Identified Deforestation or Fire Incidents
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:14')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 14, null,
    'Number of Identified Deforestation or Fire Incidents', null, null,
    'contagem',
    false,
    'Montly', 'Monitoring of flora',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; monitoring reports, photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #15: Fire Reduction Rate
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:15')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 15, null,
    'Fire Reduction Rate', null, '%',
    'percentual',
    false,
    'Montly', 'Monitoring of flora',
    'Implement satellite monitoring of deforestation and forest fires', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Supporting documents (i.e. field activities reports; monitoring reports, photos)'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #16: Species richness.
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:16')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 16, null,
    'Species richness.', null, 'sp/ha',
    'contagem',
    false,
    'Every two years campaigns consider seasonality.

Continuous remote satellite monitoring.', 'Monitoring of flora',
    'Facilitate flora inventory and monitor plant species.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Flora Inventory
Remote satellite monitoring (deforestation and fire hotspots)
Participatory monitoring with the community'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #17: Number of endemic and threatened species
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:17')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 17, null,
    'Number of endemic and threatened species', null, 'sp/ha',
    'contagem',
    false,
    'Every two years campaigns consider seasonality.

Continuous remote satellite monitoring.', 'Monitoring of flora',
    'Facilitate flora inventory and monitor plant species.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Flora Inventory
Remote satellite monitoring (deforestation and fire hotspots)
Participatory monitoring with the community'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #18: Population trend of target species.
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:18')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 18, null,
    'Population trend of target species.', null, 'ind/ha',
    'contagem',
    false,
    'Every two years campaigns consider seasonality.

Continuous remote satellite monitoring.', 'Monitoring of flora',
    'Facilitate flora inventory and monitor plant species.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Flora Inventory
Remote satellite monitoring (deforestation and fire hotspots)
Participatory monitoring with the community'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #19: Number of Training Courses Offered
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:19')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 19, null,
    'Number of Training Courses Offered', null, null,
    'contagem',
    false,
    'Annual', 'Monitoring of flora',
    'Develop alternatives for the conservation of threatened plant species used for subsistence in the community.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Training programs with the community'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #20: Community participation rate in conservation programs
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:20')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 20, null,
    'Community participation rate in conservation programs', null, '%',
    'percentual',
    false,
    'Annual', 'Monitoring of flora',
    'Develop alternatives for the conservation of threatened plant species used for subsistence in the community.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Training programs with the community'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();

  -- biodiversidade #21: Number of cooperation agrreements firmed
  v_ind := md5('carbon_ind:' || v_projeto::text || ':biodiversidade:21')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, 'biodiversidade', 21, null,
    'Number of cooperation agrreements firmed', null, null,
    'contagem',
    false,
    'Annual', 'Monitoring of flora',
    'Formalize partnerships with universities and institutions to conduct research and support monitoring efforts.', 'Improve surveillance and monitoring actions to combat illegal practices (hunting, animal trafficking, logging)

Identification and monitoring of endemic, threatened, and vulnerable species.

Protection of economically valuable species.

Promotion of technical knowledge through scientific research and development of technologies aimed at sustainable practices.',
    'Conservation and sustainable use of the forest.

Reduce interest in agricultural activities, logging, hunting, and fishing.

Conservation of threatened species.', 'Reducing external pressures such as agriculture, logging, hunting, and fishing increases forest resilience.',
    'Cooperation agreements with institutions.'
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();
end
$$;

-- Conferencia rapida depois de rodar:
--   select plano, count(*) from public.carbon_indicadores
--    where plano is not null group by plano order by plano;
--   select count(*) from public.carbon_indicador_medicoes m
--     join public.carbon_indicadores i on i.id = m.indicador_id
--    where i.plano is not null;

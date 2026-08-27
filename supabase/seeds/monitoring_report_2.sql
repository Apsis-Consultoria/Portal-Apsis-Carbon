-- =============================================================================
-- Apsis Carbon - Monitoring Report 2 (Jul 24 a Dez 25)
-- Arquivo: supabase/seeds/monitoring_report_2.sql
-- Gerado por: scripts/gerar-seed-mr2.mjs (nao edite a mao)
-- Fonte: docs/notion/dados/monitoring-report-2.json, lido ao vivo do Notion em 26/08/2026
-- =============================================================================
-- O SEGUNDO RELATORIO. O levantamento tinha registrado esta pagina como "nunca
-- aberta". Ela e o relatorio de monitoramento do periodo seguinte, com 102
-- capitulos proprios e 26 documentos exigidos - contra 32 e 26 do primeiro.
--
-- Ele so cabe no banco por causa da migration 20260826200000: as duas tabelas
-- tinham chave unica por (projeto, capitulo) e (projeto, codigo), e numero de
-- capitulo se repete entre periodos POR CONSTRUCAO. "2.1.4 Project Proponent"
-- existe nos dois relatorios, e tem de existir.
--
-- A COLUNA Status DO NOTION MISTURA DUAS COISAS: o ponto em que o capitulo esta
-- e a volta de revisao. "Revisao 1" e "Revisao 2" nao sao estados diferentes,
-- sao a MESMA situacao (em revisao) em rodadas diferentes. A tabela ja separa os
-- dois eixos, entao a traducao desfaz a mistura: 76 capitulos na rodada 1 e
-- 26 na rodada 2.
--
-- CODIGO POSICIONAL nas evidencias (MR2-01, MR2-02...): a lista do Notion nao
-- numera os itens, e a chave unica precisa de um codigo. E estavel dentro do
-- relatorio porque deriva da ordem da propria lista.
--
-- LGPD: um comentario da lista de documentos citava uma pessoa pelo nome
-- ("Verificar com <nome> aportes para..."). O nome foi substituido por [P] na
-- extracao, antes de o arquivo existir em disco.
-- =============================================================================

do $$
declare
  v_projeto uuid;
begin
  select id into v_projeto from public.carbon_projetos where nome = 'Awaete REDD+' limit 1;
  if v_projeto is null then
    raise exception 'projeto "Awaete REDD+" nao encontrado';
  end if;

  delete from public.carbon_mr_capitulos where projeto_id = v_projeto and relatorio = 'Monitoring Report 2 (Jul 24 a Dez 25)';
  delete from public.carbon_evidencia_itens where projeto_id = v_projeto and relatorio = 'Monitoring Report 2 (Jul 24 a Dez 25)';

  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:d17cb37629cc')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '1',
          'Summary', 1, 1, 1, 'em_andamento', 1, '1 - Summary');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:facdb8c263a5')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '1.1',
          'Unique Project Benefits', 1, 2, 2, 'em_andamento', 1, '1 - Summary');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:c1c14e78a8e0')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '1.2',
          'Standardized Benefit Metrics', 1, 2, 3, 'em_andamento', 1, '1 - Summary');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:c71d76ada47d')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2',
          'Project Details', 2, 1, 4, 'em_andamento', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:e7eed5dd5959')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.1',
          'Summary Description of the Project', 2, 3, 5, 'em_andamento', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:e50e285dd460')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.2',
          'Audit History', 2, 3, 6, 'nao_iniciado', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:d92b754da080')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.3',
          'Sectoral Scope and Project Type', 2, 3, 7, 'nao_iniciado', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:c45449d3a623')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.4',
          'Project Proponent', 2, 3, 8, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:df819431090a')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.5',
          'Other Entities Involved in the Project', 2, 3, 9, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:d5cf9ea7be26')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.6',
          'Project Start Date', 2, 3, 10, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:d1ecf0bb6da2')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.7',
          'Benefits Assessment and Project Crediting Period', 2, 3, 11, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f091f227c2f8')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.8',
          'Project Location', 2, 3, 12, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:cdf292b0dae7')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.9',
          'Title and Reference of Methodology', 2, 3, 13, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:fcf1f11679e8')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.10.1',
          'Double Counting and Participation under Other GHG Programs - No Double Issuance', 2, 4, 14, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:ff2dd9f5fb69')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.10.2',
          'Double Counting and Participation under Other GHG Programs - Registration in other GHG Programs', 2, 4, 15, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:dc41544f88c1')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.10.3',
          'Double Counting and Participation under Other GHG Programs - Projects Rejected by Other GHG Programs', 2, 4, 16, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:c50e9a793c93')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.11.1',
          'Double Claiming, Other Forms of Credit, and Scope 3 Emissions - No Double Claming with Emissions Trading Programs or Binding Emission Limits', 2, 4, 17, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:e0138ff1c645')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.11.2',
          'Double Claiming, Other Forms of Credit, and Scope 3 Emissions - No Double Claming with Other Forms of Environmental Credit', 2, 4, 18, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:c605b984d98a')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.11.3',
          'Double Claiming, Other Forms of Credit, and Scope 3 Emissions - Supply Chain (Scope 3) Emissions', 2, 4, 19, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:e34b58062248')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.1.12',
          'Sustainable Development Contributions', 2, 3, 20, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:cec31ed51a9b')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.2.1',
          'Implementation Schedule', 2, 3, 21, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:eb320a321676')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.2.2',
          'Baseline Reassessment', 2, 3, 22, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:debcdb474c8e')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.2.3',
          'Methodology Deviations', 2, 3, 23, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:d8954bf7c7cc')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.2.4',
          'Minor Changes to Project Description', 2, 3, 24, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f51e02d1a0d5')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.2.5',
          'Project Description Deviations', 2, 3, 25, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f8200d053328')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.2.6',
          'Grouped Projects', 2, 3, 26, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:ee9f41c7d599')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.2.6.1',
          'Risk Mitigation for Grouped Projects', 2, 4, 27, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:d787ca8a8b93')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.2.6.2',
          'Project Zone Map', 2, 4, 28, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:ee1569e89388')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.2.6.3',
          'Changes to Management', 2, 4, 29, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:da9e7110e019')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.2.7',
          'Risks to the Project', 2, 3, 30, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:ea4d8cff32c3')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.2.8',
          'Benefit Permanence', 2, 3, 31, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:faa7c0955a1f')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.1',
          'Stakeholder Identification', 2, 3, 32, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f35a60e6044e')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.2',
          'Stakeholder Access to Project Documents', 2, 3, 33, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:fb898d01e41c')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.3',
          'Dissemination of Summary Project Documents', 2, 3, 34, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:e1308a16bc02')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.4',
          'Informational Meetings with Stakeholders', 2, 3, 35, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:df2b00da33d2')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.5',
          'Risks from the Project and No Net Harm', 2, 3, 36, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f96c1e8512b2')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.6',
          'Community Costs, Risks, and Benefits', 2, 3, 37, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:ebbfd4554b4a')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.7',
          'Information to Stakeholder on Verification Process', 2, 3, 38, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:ed138a02b5c4')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.8',
          'Site Visit Information and Opportunities to Communicate with Auditor', 2, 3, 39, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:db3618d437ec')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.9',
          'Stakeholder Consultation', 2, 3, 40, 'em_andamento', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f74ed05079b2')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.10',
          'Continued Consultation and Adaptive Management', 2, 3, 41, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:dcc5dd208eda')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.11',
          'Stakeholder Consultation Channels', 2, 3, 42, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f16350c671a2')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.12',
          'Stakeholder Participation in Decision-Making and Implementation', 2, 3, 43, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:dc4e45fc4fd9')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.13',
          'Anti-Discrimation Assurance', 2, 3, 44, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:fd2be3ad65b2')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.14',
          'Grievances', 2, 3, 45, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:dabc55d3ab3d')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.15',
          'Worker Training', 2, 3, 46, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:e839c335092f')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.16',
          'Community Employment Opportunities', 2, 3, 47, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:d4f1b9864e94')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.3.17',
          'Occupational Safety Assessment', 2, 3, 48, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f818c0bb0ff3')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.4.1',
          'Required Technical Skills', 2, 3, 49, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:dd94d61c6e6e')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.4.2',
          'Management Team Experience', 2, 3, 50, 'concluido', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f0feb2e9e9e5')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.4.3',
          'Project Management Partnerships/Team Development', 2, 3, 51, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:eb9c4848df86')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.4.4',
          'Financial Health of Implementing Organization(s)', 2, 3, 52, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:cd7e1dc73466')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.4.5',
          'Avoidance of Corruption and Other Unethical Behavior', 2, 3, 53, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:e16afbf6cf8f')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.4.6',
          'Commercially Sensitive Information', 2, 3, 54, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:c394f42ed18b')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.5.1',
          'National and Local Laws', 2, 3, 55, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:fda4cebb934f')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.5.2',
          'Relevant Laws and Regulations Related to Worke’s Rights', 2, 3, 56, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f991bbc0f78c')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.5.3',
          'Human Rights', 2, 3, 57, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:cbd6d3e6e057')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.5.4',
          'Indigenous People and Cultural Heritage', 2, 3, 58, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:ec099c91b148')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.5.5',
          'Recognition of Property Rights', 2, 3, 59, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:de77fb4048c8')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.5.6',
          'Benefit Sharing Mechanism', 2, 3, 60, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:de3944a3d0fe')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.5.7',
          'Free, Prior, and Informed Consent', 2, 3, 61, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f6abe4310f64')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.5.8',
          'Property Rigth Protection', 2, 3, 62, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:cb97896f2673')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.5.9',
          'Identification of Illegal Activity', 2, 3, 63, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:ecad9a172b9d')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '2.5.10',
          'Ongoing Disputes', 2, 3, 64, 'em_revisao', 1, '2 - Project Details');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f05a8f231aea')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '3',
          'Climate', 3, 1, 65, 'em_andamento', 1, '3 - Climate');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:fd5c8940378e')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '3.1.1',
          'Data and Parameters Available at Validation', 3, 3, 66, 'em_andamento', 1, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:c39f6ea5f4b3')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '3.1.2',
          'Data and Parameters Monitored', 3, 3, 67, 'em_andamento', 1, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:e4f42b94cc11')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '3.1.3',
          'Monitoring Plan', 3, 3, 68, 'em_revisao', 1, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f3198a8505c2')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '3.1.4',
          'Dissemination of Monitoring Plan and Results', 3, 3, 69, 'em_revisao', 1, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f03d726cc5fe')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '3.2.1',
          'Baseline Emissions', 3, 3, 70, 'em_revisao', 1, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f134b24e9ccc')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '3.2.2',
          'Project Emissions', 3, 3, 71, 'em_andamento', 1, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:fb265667d904')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '3.2.3',
          'Leakage Emissions', 3, 3, 72, 'em_andamento', 1, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:e401b6a5b8cd')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '3.2.4',
          'GHG Emission Reductions and Carbon Dioxide Removals', 3, 3, 73, 'em_andamento', 1, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:fa5a6edb4d04')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4',
          'Community', 4, 1, 74, 'em_andamento', 1, '4 - Communty');
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:d174ff866a13')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4.1.1',
          'Community Impacts', 4, 3, 75, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f230ca71d64a')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4.1.2',
          'Negative Community Impact Mitigation', 4, 3, 76, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:da335d8370bb')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4.1.3',
          'Net Positive Community Well-Being', 4, 3, 77, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:e863da31934c')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4.1.4',
          'Protection of High Conservation Values', 4, 3, 78, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:dc292ab65466')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4.2.1',
          'Mitigation of Negative Impacts on Other Stakeholders', 4, 3, 79, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:ef0a6a431374')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4.2.2',
          'Net Impacts on Other Stakeholders', 4, 3, 80, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:dea48e462c02')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4.3.1',
          'Community Monitoring Plan', 4, 3, 81, 'concluido', 1, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:dabbe3e73dad')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4.3.2',
          'Monitoring Plan Dissemination', 4, 3, 82, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:e22a71c0a018')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4.4.1',
          'Short-term and Long-term Community Benefits', 4, 3, 83, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:d884003cc7a7')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4.4.2',
          'Marginalized and/or Vulnerable Community Groups', 4, 3, 84, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:c523df47c2c3')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4.4.3',
          'Net Impacts on Women', 4, 3, 85, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:c5b847da3bee')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4.4.4',
          'Benefit Sharing Mechanisms', 4, 3, 86, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f07e641be9a2')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4.4.5',
          'Governance and Implementation Structures', 4, 3, 87, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:c6fde721cf59')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '4.4.6',
          'Smallholders/Community Members Capacity Development', 4, 3, 88, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:d8cbaf803425')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '5',
          'Biodiversity', 5, 1, 89, 'concluido', 1, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:ed215fff30f7')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '5.1.1',
          'Biodiversity Changes', 5, 3, 90, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:dae20c741a6c')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '5.1.2',
          'Mitigation Actions', 5, 3, 91, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:e715cb249864')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '5.1.3',
          'Net Positive Biodiversity Impacts', 5, 3, 92, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:e4b7f92db19d')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '5.1.4',
          'High Conservation Values Protected', 5, 3, 93, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:d8e926d5c590')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '5.1.5',
          'Species Used', 5, 3, 94, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:c88b020cd7db')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '5.1.6',
          'Invasive Species', 5, 3, 95, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:e376fac1bf44')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '5.1.7',
          'GMO Exclusion', 5, 3, 96, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f8ac36fb0e15')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '5.1.8',
          'Inputs Justification', 5, 3, 97, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f7461fe50eef')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '5.2.1',
          'Negative Offsite Biodiversity Impacts and Mitigation Actions', 5, 3, 98, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:f95062a33f7b')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '5.2.2',
          'Net Offsite Biodiversity Benefits', 5, 3, 99, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:c84fb4e37693')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '5.3.1',
          'Biodiversity Monitoring Plan', 5, 3, 100, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:c0350ea9a526')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '5.3.2',
          'Biodiversity Monitoring Plan Dissemination', 5, 3, 101, 'em_revisao', 2, null);
  insert into public.carbon_mr_capitulos
    (id, projeto_id, relatorio, capitulo, nome, cap, nivel, ordem, estado, rodada, observacoes)
  values (md5('mr2:cap:d5d163dbf401')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', '5.4.1',
          'Trigger Species Population Trends', 5, 3, 102, 'em_revisao', 2, null);
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:e0e2a83e0224')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-01', 'Outros',
          'Word version of the CCB VCS PD', 1, 'concluido', 'anexada', 'Comments');
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:c7ec8c7dca67')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-02', 'Outros',
          'NPR Calculation excel sheet/spreadsheet (access to VERRA project hub)', 2, 'concluido', 'anexada', null);
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:e6df3ec80f60')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-03', 'CCB unique benefits',
          'Evidence demonstrating the estimated benefits (matrix used to extrapolate CCB claimed benefits)', 3, 'concluido', 'anexada', 'Evidências: ToC, Dashboard Socio');
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:d717eaadb796')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-04', 'Project Area',
          'KML file (for project area and CCB project zone)', 4, 'concluido', 'anexada', null);
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:d317370612a7')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-05', 'Project Area',
          'LULC maps/Forest cover maps/satellite imageries of the project area in verifiable format', 5, 'concluido', 'anexada', null);
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:d04783a54b99')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-06', 'Project Area',
          'PA GeoPDF', 6, 'concluido', 'anexada', null);
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:e29a16e7679b')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-07', 'Ownership',
          'Copy of agreement signed between Project proponent and landowners (key stakeholders)', 7, 'concluido', 'anexada', 'Evidências: 
1. Cópia dos Contratos com Associações
2. Cópia dos Aditivos dos Contratos com Associações
3. VCS Listening Representation');
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:db5619c8ca49')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-08', 'Ownership',
          'Agreements/ MoU between PP and other entities, if any', 8, 'concluido', 'anexada', 'Evidências: 
1.  Contrato LDAs x SPE');
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:c915a9a12551')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-09', 'Project start date',
          'Evidence of project start date (it could be single or multiple evidence leading to identification of start date)', 9, 'concluido', 'anexada', 'Evidências: 
1. Definição da CLPI
2. Contrato com Associações,
3. Relatórios de monitoramento
4. Relatório de atividades IPES/Indeva');
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:d3bf65094a49')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-10', 'Project crediting period',
          'GHG emission reduction or removal calculation sheet (ERR sheet).', 10, 'concluido', 'anexada', 'Evidência: ERR');
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:e5729da786c4')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-11', 'Project crediting period',
          'Supporting calculation sheet.', 11, 'concluido', 'anexada', 'Evidência: Planilha Inventário Florestal');
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:cb832cdaa3e5')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-12', 'Implementation schedule',
          'Evidence representing the key milestones in the project’s development and implementation, as depicted in the PD', 12, 'concluido', 'anexada', 'Evidência: 
1. Planilha com os milestones do projeto e evidencias linkadas
2. Evidencias separadas por tipo de atividades');
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:e65a49ec31cd')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-13', 'Implementation schedule',
          'Environmental clearances required for project establishment', 13, 'nao_aplicavel', 'nao_aplicavel', 'Evidência 1: Planilha com atividades realizadas separadas por mês
Evidência 2: Pastas separadas por mês com o tipo de atividade. Atividades relacionadas ao campo - nome da pasta:');
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:d2293977b828')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-14', 'Double Counting and Participation under Other GHG Programs',
          'Declaration form from PP that the project is not registered, not rejected and not receiving or seeking credit for reductions and removals from a project activity under another GHG program.', 14, 'nao_iniciado', 'pendente', null);
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:d26eb0ab2691')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-15', 'Double claiming',
          'Declaration form from PP that the project is not included nor planning to receive credit from another GHG environmental credit system.', 15, 'nao_iniciado', 'pendente', null);
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:e49e52a1b332')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-16', 'Sustainable Development Contributions',
          'Evidence demonstrating the estimated benefits (matrix used to extrapolate SD contributions)', 16, 'em_andamento', 'pendente', 'Verificar com [P] aportes para alimentação, logisitca, fauna e flroa');
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:c051ee3c6607')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-17', 'Stakeholder identification and Stakeholder consultation and ongoing communication',
          'FPIC documents', 17, 'concluido', 'anexada', 'Evidências:
1. CLPI: Atas dos dois grupos
2. Fotos
3. Doc. Seminários: Ata, fotos, apresentações');
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:c6052668ba06')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-18', 'Stakeholder identification and Stakeholder consultation and ongoing communication',
          'Consultation meeting records (MoM, photographs, etc)', 18, 'concluido', 'anexada', null);
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:c6e7180ca9aa')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-19', 'Stakeholder identification and Stakeholder consultation and ongoing communication',
          'Other documentation prepared to conduct FPIC.', 19, 'concluido', 'anexada', 'Evidência:
1. Banners arvore dos sonhos
2. Apresentações');
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:fe80b5e76cd9')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-20', 'Management Capacity',
          'Detailed evidence on the project governance structure. (project team CV, etc).', 20, 'concluido', 'anexada', 'Evidência: 
1. CV Project Team
2. Governance Model');
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:f02b53377fb4')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-21', 'SOP',
          'SOP of biomass measurements', 21, 'concluido', 'anexada', 'SOP -');
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:cf2adb61aa2a')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-22', 'SOP',
          'A copy of Quality assurance and quality control (QA/QC) plan', 22, 'concluido', 'anexada', null);
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:e03648f873cf')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-23', 'Monitoring plan',
          'Community Monitoring Plan', 23, 'concluido', 'anexada', null);
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:eb8995f3bcb0')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-24', 'Monitoring plan',
          'Biodiversity Monitoring Plan', 24, 'concluido', 'anexada', null);
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:e6a5adb3916c')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-25', 'Monitoring plan',
          'Adaptive Management Plan (important for NPR)', 25, 'concluido', 'anexada', null);
  insert into public.carbon_evidencia_itens
    (id, projeto_id, relatorio, codigo, secao, exigencia, ordem, status_resposta, estado_evidencia, observacoes)
  values (md5('mr2:ev:d37c76073783')::uuid, v_projeto, 'Monitoring Report 2 (Jul 24 a Dez 25)', 'MR2-26', 'Others',
          'Sampling coordinate', 26, 'concluido', 'anexada', 'Centroides das coordenadas de cada parcela do inventário');

end $$;

do $$
declare
  n_cap integer;
  n_ev integer;
  n_mr1 integer;
begin
  select count(*) into n_cap from public.carbon_mr_capitulos where relatorio = 'Monitoring Report 2 (Jul 24 a Dez 25)';
  select count(*) into n_ev from public.carbon_evidencia_itens where relatorio = 'Monitoring Report 2 (Jul 24 a Dez 25)';
  -- O primeiro relatorio tem de continuar inteiro: a migration mexeu na chave
  -- unica dele, e e aqui que se ve se alguma linha foi perdida no caminho.
  select count(*) into n_mr1 from public.carbon_mr_capitulos where relatorio = 'Monitoring Report';

  raise notice 'MR2: % capitulos e % evidencias | MR1 intacto com % capitulos', n_cap, n_ev, n_mr1;

  if n_cap <> 102 then
    raise exception 'esperado 102 capitulos no MR2, encontrado %', n_cap;
  end if;
  if n_ev <> 26 then
    raise exception 'esperado 26 evidencias no MR2, encontrado %', n_ev;
  end if;
  if n_mr1 <> 32 then
    raise exception 'o primeiro relatorio deveria ter 32 capitulos, tem %', n_mr1;
  end if;
end $$;

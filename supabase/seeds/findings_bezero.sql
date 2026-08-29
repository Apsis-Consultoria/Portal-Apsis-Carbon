-- =============================================================================
-- Apsis Carbon - os 31 itens da avaliadora BeZero
-- Arquivo: supabase/seeds/findings_bezero.sql
-- =============================================================================
-- GERADO a partir de docs/notion/dados/coleta-25-08.json (secao findings_bezero).
-- Origem: pagina Be Zero do Notion, lida ao vivo em 25/08/2026.
--
-- BeZero e agencia de RATING, nao auditor: os itens sao pedidos de informacao
-- para a nota do credito, nao CAR/CL. Por isso `tipo` vai NULO (a coluna e
-- anulavel de proposito) e a rodada tem origem 'bezero', valor que o enum de
-- carbon_auditoria_rodadas ja previa desde a migration de findings.
--
-- 'Concluido' da origem vira estado 'respondido', NAO 'fechado': quem fecha um
-- pedido e a avaliadora, e a pagina registra o estado do NOSSO lado.
--
-- LGPD: iniciais de responsavel descartadas; duas mencoes a pessoa trocadas por
-- papel. Idempotente (id por md5 do conteudo).
-- =============================================================================

do $$
declare
  v_projeto uuid;
  v_rodada  uuid;
begin
  select id into v_projeto
    from public.carbon_projetos
   where nome ilike '%parakan%' or nome ilike '%awaet%'
   order by criado_em limit 1;
  if v_projeto is null then
    raise exception 'Projeto do Parakana nao encontrado. Rode projeto_awaete.sql antes.';
  end if;

  v_rodada := md5('rodada:bezero:1')::uuid;
  insert into public.carbon_auditoria_rodadas (id, projeto_id, origem, numero)
  values (v_rodada, v_projeto, 'bezero', 1)
  on conflict (id) do nothing;

  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:1')::uuid, v_rodada, null, '1', 1, 'outro',
          'PD', 'Provide full details of the project, including its description, objectives, location, and the proposed activity or technology being implemented. Also indicate the status of the project in any registry or standard body, and what the registry ID is (if any). Also indicate any former registry IDs if the project transitioned from another standard.', 'Ajustar o MR conforme pedido.',
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:2')::uuid, v_rodada, null, '2', 2, 'outro',
          'PP', 'List all entities and key individuals involved, required, or proposed for the project (e.g. proponent, sponsor, project team, contractors, specialists). Include their backgrounds, roles, interconnections, relevant experience, track record in similar projects, and current onboarding status.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:3')::uuid, v_rodada, null, '3', 3, 'outro',
          'Project timelines', 'Provide the full project timeline, including start date, implementation period, stabilisation period, operational period, credit issuance period, and commitment period. Highlight any key risks that could affect the planned schedule.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:4')::uuid, v_rodada, null, '4', 4, 'outro',
          'Project location/boundary', 'Provide the project boundaries. These should include the project area(s) and any other spatial zones (e.g. leakage areas) as required by the standards body methodology. Boundaries should be supplied as geospatial vector files (Shapefile, KML, GeoPackage, GeoJSON) consistent with project documentation: they should match visually any embedded site maps, and any reference to the project area in hectares should match the area defined by the geospatial data within 5% error.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:5')::uuid, v_rodada, null, '5', 5, 'outro',
          'Activity precedence', 'Describe the uniqueness or commonness of the project activity or technology. Include examples of similar projects that have been successfully implemented and operated at the same scale, where applicable.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:6')::uuid, v_rodada, null, '6', 6, 'outro',
          'Previous projects', 'Identify key challenges faced by similar past projects and explain how they were addressed. Describe how these lessons have been incorporated into the current project design and assess the project likelihood of success based on this learning.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:7')::uuid, v_rodada, null, '7', 7, 'outro',
          'Counterfactual scenario', 'Explain the counterfactual scenario - what would likely occur without the project activity. Provide evidence or justification supporting this assertion.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:8')::uuid, v_rodada, null, '8', 8, 'outro',
          'Feasibility & Setup', 'Submit a detailed project or techno-economic feasibility study, along with any supporting documents (e.g. budget, implementation plan, contracts) that provide insight into project setup, rollout, or construction.', 'Incluir contratos dos fornecedores, SHA e carta de compromisso da SPE com o funding.',
          'respondido', 'pendente')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:9')::uuid, v_rodada, null, '9', 9, 'outro',
          'Harvest / Forest management plan', 'Submit the planned harvesting schedule and/or forest management plan if these activities are part of your project scenario. Include key timelines, activities, and management practices.', null,
          'nao_aplicavel', 'nao_aplicavel')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:10')::uuid, v_rodada, null, '10', 10, 'outro',
          'Regulation', 'Provide an overview of the regulatory and policy landscape relevant to the project. List all required permissions or licences and indicate their current status (e.g. obtained, pending, not yet applied for).', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:11')::uuid, v_rodada, null, '11', 11, 'outro',
          'Government stance', 'Describe the government stance or level of support for the project activities. Include the project proponent perspective on the government willingness and historical track record of support, if applicable.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:12')::uuid, v_rodada, null, '12', 12, 'outro',
          'Letter of Authorisation / Corresponding adjustments', 'Provide details of any corresponding adjustments planned or anticipated for the carbon credits issued by the project. Include information on any letters of authorisation received or being sought in relation to Article 6 of the Paris Agreement.', null,
          'nao_aplicavel', 'nao_aplicavel')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:13')::uuid, v_rodada, null, '13', 13, 'outro',
          'Ownership & land rights', 'Specify who owns the land and/or equipment required for the project. Explain the basis and nature of the rights acquired by the project to ensure its implementation and operation over its full lifetime.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:14')::uuid, v_rodada, null, '14', 14, 'outro',
          'Outstanding legal issues', 'Disclose any outstanding legal or regulatory issues involving the project proponent. If applicable, explain the potential impact of these issues on the project implementation and overall credibility.', 'Aguardando o de acordo do juridico no texto elaborado pelo advogado externo.',
          'em_andamento', 'pendente')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:15')::uuid, v_rodada, null, '15', 15, 'outro',
          'Financial analysis', 'Provide a detailed financial model and feasibility study covering the full project timeline. Include income from carbon and non-carbon sources, capital costs, ongoing operational costs, net cash flows, and financial return metrics such as IRR and payback periods - both with and without carbon finance.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:16')::uuid, v_rodada, null, '16', 16, 'outro',
          'Funding', 'Outline the sources of funding for the project and the current status of securing these funds. Identify any risks to the availability of funding during both implementation and operation phases. Describe the project proponent track record in raising funds from the proposed sources.', 'Inserir o balanco da SPE.',
          'em_andamento', 'pendente')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:17')::uuid, v_rodada, null, '17', 17, 'outro',
          'Insurance', 'Specify the type and amount of insurance coverage the project plans to obtain.', null,
          'nao_aplicavel', 'nao_aplicavel')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:18')::uuid, v_rodada, null, '18', 18, 'outro',
          'Financial track record', 'Provide information on the project proponent financial standing and demonstrate their past track record in supporting projects, particularly during periods of financial or operational difficulty.', 'Falta a apresentacao dos projetos da Green Musk e o balanco da SPE.',
          'em_andamento', 'pendente')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:19')::uuid, v_rodada, null, '19', 19, 'outro',
          'Stakeholder landscape', 'Identify the key local stakeholders relevant to the project activity, noting who may be affected or could raise objections. Describe any engagement to date with these groups and outline your plans for managing relationships, especially with those potentially opposed to or impacted by the project.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:20')::uuid, v_rodada, null, '20', 20, 'outro',
          'Resettlement and/or FPIC', 'State whether the project area is inhabited and describe any plans to manage, relocate, or collaborate with these inhabitants. Indicate if resettlement is required and, if so, detail the resettlement plan. Confirm whether Free, Prior and Informed Consent (FPIC) has been obtained or is planned, if applicable.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:21')::uuid, v_rodada, null, '21', 21, 'outro',
          'Community engagement & Benefit sharing', 'Provide reports on community engagement and benefit sharing mechanisms. Include an example of any benefit sharing agreement or contract, if available.', null,
          'respondido', 'pendente')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:22')::uuid, v_rodada, null, '22', 22, 'outro',
          'Counterparties', 'List the key counterparties and contractors essential to the project success. Provide the status of their onboarding or agreements, and outline contingency plans in case any stakeholder is unwilling or unable to participate.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:23')::uuid, v_rodada, null, '23', 23, 'outro',
          'Additionality', 'Explain how the project establishes Additionality, including any tests or justifications used. If the project is deemed automatically additional, cite the accreditor and the specific criteria that support this classification.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:24')::uuid, v_rodada, null, '24', 24, 'outro',
          'Carbon accounting template', 'Complete and submit BeZero Carbon ex ante carbon accounting template, covering the project full lifetime. Include estimates for project emissions, leakage, risk buffer allocation, and the baseline scenario.', 'Encaminhado ao responsavel do projeto: na aba 1 (Project information), tabela 1.2, o papel das Associacoes ficou como PP, seguindo a mesma atribuicao do PD - havia duvida entre PP e Project owner. Na aba 2 (Carbon Accounting & Fundamentals), a coluna Project owner pede o nome das instituicoes e inclui as Associacoes, com a mesma duvida. Checar a nota da tabela 1.3.',
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:bezero:24:sub:1')::uuid, md5('finding:bezero:24')::uuid, 'Template BeZero preenchido', 1)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:bezero:24:sub:2')::uuid, md5('finding:bezero:24')::uuid, 'Planilha ERR', 2)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:bezero:24:sub:3')::uuid, md5('finding:bezero:24')::uuid, 'PA_LB Boundaries', 3)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:bezero:24:sub:4')::uuid, md5('finding:bezero:24')::uuid, 'PADA Report', 4)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:bezero:24:sub:5')::uuid, md5('finding:bezero:24')::uuid, 'Validation report', 5)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:bezero:24:sub:6')::uuid, md5('finding:bezero:24')::uuid, 'NPRT', 6)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:25')::uuid, v_rodada, null, '25', 25, 'outro',
          'Carbon accounting detail', 'Provide detailed carbon stock calculations, including data on biomass, plot design, allometric equations used, degradation factors, and sampling methodology.', 'Confirmar se a planilha bruta do inventario entra como evidencia.',
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:bezero:25:sub:1')::uuid, md5('finding:bezero:25')::uuid, 'Carbon accounting doc', 1)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:bezero:25:sub:2')::uuid, md5('finding:bezero:25')::uuid, 'Planilha ERR', 2)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:26')::uuid, v_rodada, null, '26', 26, 'outro',
          'Leakage assessment', 'Explain the project leakage assessment and justify its appropriateness for the project context. Include detailed leakage models, underlying assumptions, and historical and expected land use data or other relevant leakage elements (e.g., market trends).', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:27')::uuid, v_rodada, null, '27', 27, 'outro',
          'Non-permanence assessment and mitigation', 'Provide a non-permanence risk assessment, detailing the likelihood of events such as fire, drought, and other natural or anthropogenic risks, and how they will be mitigated. If a risk buffer contribution is proposed, explain how it was determined and justify its appropriateness.', null,
          'em_andamento', 'pendente')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:28')::uuid, v_rodada, null, '28', 28, 'outro',
          'Baseline models', 'Submit baseline models for the project, including information on any protected areas within the project or reference region. If available, include the effectiveness index calculated by the project.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:29')::uuid, v_rodada, null, '29', 29, 'outro',
          'MRV', 'Detail the monitoring and verification plans, including the frequency of activities and the organisations responsible. Include background information and relevant experience of these organisations, particularly in the region and with similar projects.', null,
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:bezero:29:sub:1')::uuid, md5('finding:bezero:29')::uuid, 'MRV Doc: responsabilidades de cada entidade', 1)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:bezero:29:sub:2')::uuid, md5('finding:bezero:29')::uuid, 'Planilha MP: incluidos os indicadores de clima do PD', 2)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:30')::uuid, v_rodada, null, '30', 30, 'outro',
          'Deforestation data', 'Provide information on historical deforestation and activity trends across all relevant areas. Include data for the historical period and specify the reference region used for comparison.', 'Checar se os dados de desmatamento precisam de mais informacoes.',
          'respondido', 'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:bezero:30:sub:1')::uuid, md5('finding:bezero:30')::uuid, 'Deforestation data', 1)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:bezero:30:sub:2')::uuid, md5('finding:bezero:30')::uuid, 'PADA Report', 2)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:bezero:30:sub:3')::uuid, md5('finding:bezero:30')::uuid, 'LULUC', 3)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:bezero:31')::uuid, v_rodada, null, '31', 31, 'outro',
          'Soil Sample', 'Submit soil sampling and analysis procedures, if applicable to your project. Include methods used, frequency, and any relevant standards or protocols followed.', null,
          'nao_aplicavel', 'nao_aplicavel')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();

  raise notice 'BeZero carregado: 31 itens.';
end
$$;

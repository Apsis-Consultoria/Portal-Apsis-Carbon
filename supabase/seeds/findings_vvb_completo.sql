-- =============================================================================
-- Apsis Carbon - os 95 findings da base VVB Findings do Notion
-- Arquivo: supabase/seeds/findings_vvb_completo.sql
-- Gerado por: scripts/gerar-seed-vvb-findings.mjs (nao edite a mao)
-- Fonte: docs/notion/dados/vvb-findings-bruto.json, lido ao vivo do Notion em 26/08/2026
-- =============================================================================
-- O QUE ISTO CONSERTA. Ate hoje o banco tinha 12 findings da VVB. A base do
-- Notion tem 95, e o rodape dela diz COUNT 95. A primeira leitura pegou so o
-- que a pagina mostra sem rolar, e ninguem conferiu o contador contra o numero
-- de linhas lidas - a mesma armadilha que ja tinha acontecido com as reunioes.
-- Faltavam 83 dos 95, ou seja 87% da base que o levantamento chama de "o fluxo
-- que justifica o sistema", porque e nela que o projeto trava ou avanca para
-- emissao de credito.
--
-- SUBSTITUICAO, e nao acrescimo. Os 12 antigos foram carregados de outra leitura
-- e com id proprio; acrescentar os 95 por cima criaria 12 duplicatas. Por isso o
-- seed apaga os findings das rodadas VVB antes de inserir. E seguro: os 12 nao
-- tem subitem nenhum pendurado (conferido), e o unico filho de carbon_findings e
-- carbon_finding_subitens, com ON DELETE CASCADE. Os findings da Verra e da
-- BeZero nao sao tocados.
--
-- 3 LINHAS FICARAM DE FORA: n 11, 37, 49. Sao linhas em branco no
-- Notion, com o tipo marcado e nenhum outro campo preenchido - nem titulo, nem
-- descricao, nem acao. Nao ha o que carregar, e descricao_en e NOT NULL com
-- check de nao-vazio justamente para impedir finding fantasma na tela.
--
-- DUAS RODADAS. 27 linhas marcadas "New Finding" na coluna 2nd Round Findings
-- entram na rodada 2; as outras 65 na rodada 1.
--
-- Ids derivados do id do bloco no Notion, entao reaplicar nao duplica.
--
-- LGPD: conteudo conferido antes da carga - zero e-mail, zero CPF, zero
-- telefone, nenhuma pessoa nomeada. O texto trata de secoes de documento e de
-- exigencias tecnicas do padrao VCS/CCB.
-- =============================================================================

do $$
declare
  v_projeto  uuid;
  v_rodada1  uuid;
  v_rodada2  uuid;
begin

  select id into v_projeto from public.carbon_projetos where nome = 'Awaete REDD+' limit 1;
  if v_projeto is null then
    raise exception 'projeto "Awaete REDD+" nao encontrado; rode antes projeto_awaete.sql';
  end if;

  -- As rodadas ja existem. Pegar por (projeto, origem, numero) em vez de fixar o
  -- uuid mantem o seed valido se a base for recriada do zero.
  select id into v_rodada1 from public.carbon_auditoria_rodadas
   where projeto_id = v_projeto and origem = 'vvb' and numero = 1;
  select id into v_rodada2 from public.carbon_auditoria_rodadas
   where projeto_id = v_projeto and origem = 'vvb' and numero = 2;

  if v_rodada1 is null or v_rodada2 is null then
    raise exception 'rodadas 1 e 2 da VVB nao encontradas para o projeto';
  end if;

  -- Limpa a carga anterior das duas rodadas. Os subitens caem por cascade.
  delete from public.carbon_findings where rodada_id in (v_rodada1, v_rodada2);


  -- n1 | car | pdd | ID - 01
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-80ad-96dc-ce28c550b7fe')::uuid, v_rodada1, 'car',
     'ID - 01', 1, 'pdd', 'Section 2.1.16 - Project Zone Map and Project Location',
     '1.  The project location including a set of geodetic coordinates is not displayed in the PDD.
2.  Section 2.1.16 in PDD describes the Project Zone but does not display a proper map of the Project Zone as required by CCB Standard.', '1.  Provide a set of geodetic coordinates of the project location according to CCB Standard requirements. 2. Provide a Project Zone map according to CCB Standard requirements.', '1. Incluir coordenadas da TI no PD
2. Mapa que contenha: as aldeias, os rios (HCVs Bio), cemiterios (HCV Comunidade - aldeias), limites da TI, limites do buffer. Explicar antes do mapa que todo o territorio de acordo com censo é HCV para Biodiversidade e as vilas onde estão a comunidade são HCVs de cultura e locais sagrados - cemiterios', 'Item 1. Incluido tabela com coordenadas de acordo com decreto que homologa a TI',
     'fechado', 'concluido',
     'nao_aplicavel', null);

  -- n2 | cl | monitoramento | ID - 01
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1e3ee8ba-950e-80e1-9499-e81340577545')::uuid, v_rodada1, 'cl',
     'ID - 01', 2, 'monitoramento', 'Section 1.1',
     'It is unclear how the GHG emission reduction, Conservation and Sustainable Use of the Forest, and Conservation of Threatened Species listed under Unique Project Benefits differ from the GHG emission reductions & removals, Forest Cover, and Biodiversity Conservation benefits described in Section 1.2 (Standardized Benefit Metrics).', 'PP is required to clarify how the benefits listed in Section 1.1 are unique to the project and how they differ from the standardized benefits outlined in Section 1.2.', null, null,
     'fechado', 'concluido',
     'pendente', 'Item 1 
Evidência: Reunião com stakeholders 

Item 2
Evidência: Fotos e atas CLPI 2: Arvore dos Sonhos
Evidência 2: Base socio
Evidência 3: Fotos das reuniões ADLs com comunidade

Item 3
Evidência: plano de negocios açaí, plano de negocios castanha, analise de mercado castanha, analise de mercado açaí');

  -- n3 | car | monitoramento | ID - 01
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, v_rodada1, 'car',
     'ID - 01', 3, 'monitoramento', null,
     'The scientific names throughout the MR are not following the ABNT NBR 10520/2002 (scientific names should contain the genus and species and should be written in italics).', 'PP is asked to review the scientific names throughout the MR and PDD.', 'Verificar os nomes que não estão em itálico', null,
     'aberto', 'em_andamento',
     'nao_aplicavel', null);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '31.1 - Sem italico OK', true, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '1.2 - Sem italico OK', true, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.1.1 - Sem italico OK', true, 2);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.1.2 - Sem italico OK', true, 3);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.1.3 - Sem italico OK', true, 4);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.1.4 - Sem italico OK', true, 5);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.1.5 - Sem italico OK', true, 6);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.1.6 - Sem italico OK', true, 7);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.1.5 - Sem italico OK', true, 8);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.1.7 - Sem italico OK', true, 9);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.1.8 - Sem italico OK', true, 10);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.1.9 - Sem italico OK', true, 11);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.1.10 - Sem italico OK', true, 12);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.1.11 - Sem italico OK', true, 13);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.1.12 - Sem italico OK', true, 14);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.1.13- Sem italico OK', true, 15);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.2.1 - Sem italico OK', true, 16);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.2.2 - Sem italico OK', true, 17);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.2.3 - Sem italico OK', true, 18);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.2.4 - Sem italico OK', true, 19);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.2.5 - Sem italico OK', true, 20);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.2.6 - Sem italico OK', true, 21);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.2.7 - Sem italico OK', true, 22);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.2.8 - Sem italico OK', true, 23);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.1 - Sem italico OK', true, 24);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.2 - Sem italico OK', true, 25);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.3 - Sem italico OK', true, 26);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.4 - Sem italico OK', true, 27);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.5 - Sem italico OK', true, 28);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.6 - Sem italico OK', true, 29);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.7 - Sem italico OK', true, 30);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.8 - Sem italico OK', true, 31);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.9 - Sem italico OK', true, 32);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.10 - Sem italico OK', true, 33);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.11 - Sem italico OK', true, 34);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.12 - Sem italico OK', true, 35);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.12 - Sem italico OK', true, 36);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.13 - Sem italico OK', true, 37);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.14 - Sem italico OK', true, 38);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.15 - Sem italico OK', true, 39);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.16 - Sem italico OK', true, 40);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.17 - Sem italico OK', true, 41);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.3.17 - Sem italico OK', true, 42);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.4.1 - Sem italico OK', true, 43);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.4.2 - Sem italico OK', true, 44);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.4.3 - Sem italico OK', true, 45);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.4.4 - Sem italico OK', true, 46);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.4.5 - Sem italico OK', true, 47);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.4.6 - Sem italico OK', true, 48);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.5.1- Sem italico OK', true, 49);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.5.2- Sem italico OK', true, 50);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.5.3- Sem italico OK', true, 51);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.5.4- Sem italico OK', true, 52);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.5.5- Sem italico OK', true, 53);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.5.6- Sem italico OK', true, 54);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.5.7- Sem italico OK', true, 55);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.5.8- Sem italico OK', true, 56);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.5.9- Sem italico OK', true, 57);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '2.5.10- Sem italico OK', true, 58);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.1.1- Sem italico OK', true, 59);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.1.1- Sem italico OK', true, 60);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.1.2- Sem italico OK', true, 61);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.1.3 - Sem italico OK', true, 62);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.1.4 -  Sem italico OK', true, 63);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.1.1-  Sem italico OK', true, 64);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.1.2-  Sem italico OK', true, 65);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.1.3-  Sem italico OK', true, 66);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.2.2-  Sem italico OK', true, 67);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.2.3-  Sem italico OK', true, 68);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.2.4-  Sem italico OK', true, 69);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.3-  Sem italico OK', true, 70);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.3.1-  Sem italico OK', true, 71);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.3.2-  Sem italico OK', true, 72);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.3.3-  Sem italico OK', true, 73);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.3.4-  Sem italico OK', true, 74);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.3.4-  Sem italico OK', true, 75);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.3.5-  Sem italico OK', true, 76);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.3.6 - Sem italico OK', true, 77);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.2.4 - Sem italico OK', true, 78);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '3.3 - Sem italico OK', true, 79);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '4 - Sem italico OK', true, 80);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '5.1.1 -  Sem italico OK', true, 81);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '5.1.2 - Sem italico OK', true, 82);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '5.1.3 - Sem italico OK', true, 83);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '5.1.4 - Sem italico OK', true, 84);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '5.1.5 - Sem italico OK', true, 85);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '5.1.6 - Sem italico OK', true, 86);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '5.1.7 - Sem italico OK', true, 87);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '5.1.8 - Sem italico OK', true, 88);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '5.2.1 - Sem italico OK', true, 89);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '5.2.2 - Sem italico OK', true, 90);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '5.3.1 - Sem italico OK', true, 91);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '5.3.1.1 - Sem italico OK', true, 92);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '5.4.1 - italico OK', true, 93);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80b1-8f90-e1251f0f36c7')::uuid, '5.3.2.1 - italico OK', true, 94);

  -- n4 | cl | pdd | ID - 01
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1caee8ba-950e-80f0-a7a4-dab41ccbefa0')::uuid, v_rodada1, 'cl',
     'ID - 01', 4, 'pdd', 'Section 2.1.9 - Ownership',
     'In section 2.1.9, which defines project PP has defined the landownership of the Community and their rights to land and the agreement between community and the PP, but it lacks clarity over carbon credit ownership.', 'PP shall clarify the ownership/distribution of the carbon credits in detail .

2nd: The investment agreements for both the Upper and Lower groups were presented by the PP. However, the documents contain signatures only from indigenous representatives, with the signatures of Apsis Carbon representatives still missing. Additionally, the Technical Cooperation Agreements mention a different percentage distribution of credits to IPÊS and INDEVA, which requires further clarification.', '1. Incluir que PP tem contrato de divisão dos creditos de carbono (não precisa incluir %)
2. Informar que contrato foi passado para VVB

2nd: 
Fornecer contrato de investimento assinado pela Apsis, Fabiano já pediu ao jurídico; Contrato OK 

Checar contratos com Ipes e Indeva e fornecer aditivos pois até onde sei nos aditivos corrigem as % da Ipes e Indeva - Aditivos com mesma %, verificar com Fabiano', 'Fiz algum conteúdo para agregar no texto final. Também já temos um termo de compromisso das associações, sobre os 40 anos.',
     'aberto', 'revisao',
     'ok', null);

  -- n5 | cl | monitoramento | ID - 02
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1e3ee8ba-950e-808b-97b4-eac38550f996')::uuid, v_rodada1, 'cl',
     'ID - 02', 5, 'monitoramento', 'Section 2.2.4',
     'It is unclear whether the increase in the number of villages from 28 to 31 is considered a project emission factor..', 'PP ir required to clarify whether the establishment of new villages resulted in any emissions and, if so, whether these emissions were accounted for in the project emissions.', 'Plataforma de monitoramento - Confirmar com Guilherme os valores de desmatamento total.', null,
     'aberto', 'concluido',
     'nao_aplicavel', null);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-808b-97b4-eac38550f996')::uuid, '- Acredito que não tem evidências', false, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-808b-97b4-eac38550f996')::uuid, '- Cobrar dados de população IPES - pedido em 23/05', false, 1);

  -- n6 | car | monitoramento | ID - 02
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1e3ee8ba-950e-80a8-9409-f690d0632778')::uuid, v_rodada1, 'car',
     'ID - 02', 6, 'monitoramento', 'Section 2.2.6.2',
     'The project zone map presented in Section 2.2.6.2 in MR does not fulfill CCB Standard requirements.', 'The PP is required to provide a project zone map that complies with CCB Standard requirements.', null, 'Como não é um Grouped Project, foi retirado esse item, conforme indicado no template do VCS e comentario VVB',
     'fechado', 'concluido',
     'pendente', 'Project Zone Map');

  -- n7 | car | monitoramento | ID - 03
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-80f5-a9a1-fb9c8b345a39')::uuid, v_rodada2, 'car',
     'ID - 03', 7, 'monitoramento', 'Section 2.5.5',
     'In MR - Section 2.5.5, the section’s table was removed by PP. However, the template indicates that when no disputes are observed, the PP must fill in "N/A" and provide a description of the ongoing measures implemented to protect and preserve property rights.', 'The PP is required to restore the table and complete it in accordance with the template''s requirements', 'Incluir tabela', null,
     'aberto', 'concluido',
     'pendente', null);

  -- n8 | car | monitoramento | ID - 04
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, v_rodada2, 'car',
     'ID - 04', 8, 'monitoramento', 'Entire MR',
     'There is information in other languages than English of figures and maps throughout the MR. According to the VCS Standard, all information provided in MR shall be written in English.', 'PP is required to review all information in the MR and adequate them to the language required by the VCS Standard.', 'Revisar', null,
     'aberto', 'concluido',
     'ok', null);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figura 1 - Inglês OK', true, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 2 - Inglês OK', true, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 3 - Inglês OK', true, 2);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 4 - Inglês OK', true, 3);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 5 - Inglês OK', true, 4);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Seção 3.1.3 - Substituição nomes PT - EN', false, 5);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 6 - Inglês OK', true, 6);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 7 - Inglês OK', true, 7);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 8 - Inglês OK', true, 8);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 9 - Inglês OK', true, 9);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 10 - Inglês OK', true, 10);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 11 - Inglês OK', true, 11);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 12 - Inglês OK', true, 12);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 13 - Inglês OK', true, 13);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 14 - Inglês OK', true, 14);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure Tabela 1 - Inglês OK', true, 15);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure Tabela 2 - Inglês OK', true, 16);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 15 - Inglês OK', true, 17);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 16 - Inglês OK', true, 18);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 17 - Inglês OK', true, 19);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 18 - Inglês OK', true, 20);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 19 - Inglês OK', true, 21);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 20 - Inglês OK', true, 22);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 21 - Inglês OK', true, 23);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 22 - Inglês OK', true, 24);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure Tabela 28 -  Inglês OK', true, 25);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure Tabela 28 -  Inglês OK', true, 26);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 23 - Inglês OK', true, 27);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 24 - Inglês OK', true, 28);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 25 - Inglês OK', true, 29);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 26 - Inglês OK', true, 30);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 27 - Inglês OK', true, 31);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 28 - Inglês OK', true, 32);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 29 - Inglês OK', true, 33);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Figure 30 - Inglês OK', true, 34);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 1- Inglês OK', true, 35);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 2 - Inglês OK', true, 36);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 3 - Inglês OK', true, 37);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 4 - Inglês OK', true, 38);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 5 - Inglês OK', true, 39);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 6 - Inglês OK', true, 40);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 7- Inglês OK', true, 41);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 8 - Inglês OK', true, 42);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 9- Inglês OK', true, 43);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 10- Inglês OK', true, 44);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 11- Inglês OK', true, 45);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 12 - Inglês OK', true, 46);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 13 - Inglês OK', true, 47);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 14 - Inglês OK', true, 48);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 15 - Inglês OK', true, 49);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 16 - Inglês OK', true, 50);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 17- Inglês OK', true, 51);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 18 - Inglês OK', true, 52);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 19 - Inglês OK', true, 53);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 20 - Inglês OK', true, 54);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 21 - Inglês OK', true, 55);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 22 - Corrigido', true, 56);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 23 - Corrigido', true, 57);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 24 - Corrigido', true, 58);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 25 - Inglês OK', true, 59);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 26 - Inglês OK', true, 60);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 27 - Corrigido', true, 61);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 28 - Corrigido', true, 62);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 29 - Inglês OK', true, 63);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 30 - Inglês OK', true, 64);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8063-b9dd-e1b2844b849e')::uuid, 'Table 30 - Inglês OK', true, 65);

  -- n9 | car | monitoramento | ID - 05
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8018-983e-df1639aea93c')::uuid, v_rodada2, 'car',
     'ID - 05', 9, 'monitoramento', 'MR 5.3.1.2',
     'PP mentions the collection of soil and litter in the Biodiversity Monitoring Plan; however, the methodology applied is not clearly described in the plan.', 'PP is requested to provide a description of the sampling methods applied to these processes.', 'Melhor estratégia é retirar?', null,
     'aberto', 'concluido',
     'ok', null);

  -- n10 | car | monitoramento | ID - 06 PK
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8005-8b68-c87c3d0a4098')::uuid, v_rodada2, 'car',
     'ID - 06 PK', 10, 'monitoramento', 'Section 3.1.3',
     'The Section 3.1.3 of the MR describes a 10km buffer zone for leakage monitoring (Task 1, integrating satellite imagery with field calibration), visualized in the provided red polygon (project area) and GIS attribute table ("BUFFER_10KM") showing a buffered area of 643,695 ha. However, the buffer appears not to have been generated properly, as evidenced by potential multipart or undissolved features. This is not aligned with the project''s single forest stratum or leakage calculations and no dissolved shapefile. Undissolved buffers can lead to topological errors, such as inflated or fragmented areas, compromising leakage monitoring accuracy.', 'Action required: Regenerate the 10km leakage belt buffer using standard GIS tools (ArcGIS Buffer tool with "Dissolve All" option or QGIS equivalent), ensuring dissolution of any multipart or overlapping features to create a single contiguous polygon. Submit the updated geospatial evidence.', null, null,
     'aberto', 'concluido',
     'ok', null);

  -- n12 | cl | pdd | ID - 02
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1caee8ba-950e-803b-ae61-ef6ad3887859')::uuid, v_rodada1, 'cl',
     'ID - 02', 12, 'pdd', 'Section 2.1.10 - Project Start Date',
     'In section 2.1.10 PP has defined on how the start date is been justified based on “Partnership and investment agreement” but as per VCS & CCB definition of start date it should be an activity that contributes to the reduction/removals of GHG gases which arguments the provided start date justification.', 'PP shall clarify the justification and activity of the start date based on VCS standard v4.7 .', 'Retirar o contrato entre as partes e informar que monitoramento do território começou em janeiro/23.', 'A construção da guarita seria uma evidencia ?',
     'fechado', 'concluido',
     'pendente', null);

  -- n13 | car | pdd | ID - 02
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-80fa-8e6a-d9869304ae90')::uuid, v_rodada1, 'car',
     'ID - 02', 13, 'pdd', null,
     '1. Several maps throughout the PDD do not display the PA boundaries in the legend.
2. Several maps throughout the PDD display information in Portuguese.
3. Several maps throughout the PDD do not display information about the coordinate system.', '1. Correct legend for all maps where the PA boundaries are included.
2. Provide all maps in the PDD with all texts in English.
3. Provide all maps in the PDD with information about the coordinate system.', '1. Identificar mapas que apresentam os problemas mencionados - ACC
2. Verificar quais mapas são da Interelos e pedir os shapefiles para equipe deles - ACC
3. Refazer os mapas levando em consideração o guidance de CCB Standard - Seção 4. Maps - GS', null,
     'fechado', 'concluido',
     'nao_aplicavel', null);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80fa-8e6a-d9869304ae90')::uuid, '1. Climate Koppen Classification of Para State by SEMAS - OK', true, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80fa-8e6a-d9869304ae90')::uuid, '2. Hydrography within and outside IT Parakanã adapted by IBGE. - OK', true, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80fa-8e6a-d9869304ae90')::uuid, '3. Topography of Parakanã IT adapted by IBGE. - OK', true, 2);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80fa-8e6a-d9869304ae90')::uuid, '4. Soil Types in IT Parakanã adapted by EMBRAPA. - OK', true, 3);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80fa-8e6a-d9869304ae90')::uuid, '5. Vegetation types in IT Parakanã by IBGE. - OK', true, 4);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80fa-8e6a-d9869304ae90')::uuid, '6. Municipalities surrounding the project area – (IT Parakanã) by IBGE. - OK', true, 5);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80fa-8e6a-d9869304ae90')::uuid, '7. Spatial representation of settlements registered in Novo Repartimento and Itupiranga by Incra - OK', true, 6);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80fa-8e6a-d9869304ae90')::uuid, '8. Cadastral status of rural properties outside the project area.- OK', true, 7);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80fa-8e6a-d9869304ae90')::uuid, '9. Mineral zones located outside the Parakanã IT, with villages indicated by points by RAISG. - OK', true, 8);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80fa-8e6a-d9869304ae90')::uuid, '10. Units Conversation and Protected areas surrounding Parakanã IT. - OK', true, 9);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80fa-8e6a-d9869304ae90')::uuid, '11. Leakage Management Zone and priority areas identified. - OK', true, 10);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80fa-8e6a-d9869304ae90')::uuid, '12. Spatial Distribution of Authorized and Unauthorized Timber Exploitation in the Amazon in 2021, highlighted in blue is the project area by SIMEX - OK', true, 11);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80fa-8e6a-d9869304ae90')::uuid, '13. Mapas prof [P904] - OK', true, 12);

  -- n14 | cl | monitoramento | ID - 03
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1e3ee8ba-950e-803f-86ce-f925c5f7770c')::uuid, v_rodada1, 'cl',
     'ID - 03', 14, 'monitoramento', 'Section 2.3.2 and 2.3.3',
     'In sections 2.3.2 and 2.3.3 of the Monitoring Report, it is stated that “Project documents translated into Portuguese were electronically transmitted to the two Indigenous Associations. Additionally, printed copies of the studies were given to the lawyers of both Associations,” and that “The summary project was made available in Portuguese,” respectively.
On the other hand, it is also mentioned that many members of the community do not speak Portuguese.', 'PP is requested to clarify how access to the project documents is ensured for community members who do not speak Portuguese.', null, null,
     'fechado', 'concluido',
     'pendente', 'Mesma do item do PD que fala sobre este item');
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-803f-86ce-f925c5f7770c')::uuid, 'Nas reuniões gerais, existem sempre tradutores. As evidências seriam os vídeos ? Atas ? Comprovantes de pgto ? . Os documentos do projeto são muito complexos para tradução na lingua nativa . A assimilação de conhecimento é feita de forma oral / visual na cultura indígena, através de analogias com experiências vividas, e por isso foi criado um vídeo na lingua nativa com os principais benefícios e compromissos do projeto. A tabela abaixo faz uma analogia entre os processos de transferencia de conhecimento indígenas (nao consegui colar a tabela). Referência:', false, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-803f-86ce-f925c5f7770c')::uuid, '• Mazzocchi, F. (2006). "Western science and traditional knowledge: Despite their variations, different forms of knowledge can learn from each other." EMBO Reports, 7(5), 463–466.', false, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-803f-86ce-f925c5f7770c')::uuid, 'Essa tabela destaca, por exemplo, que o conhecimento ocidental tende a ser baseado em fatos objetivos e busca a compreensão por meio da análise e da lógica, enquanto o conhecimento indígena é frequentemente transmitido por meio de histórias e está profundamente enraizado em relações e contextos específicos.', false, 2);

  -- n15 | cl | pdd | ID - 03
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1caee8ba-950e-8067-ba5f-d97607888519')::uuid, v_rodada1, 'cl',
     'ID - 03', 15, 'pdd', 'Section 2.1.1',
     'In section 2.1.1, topic ii) Education, the PDD describes the educational reality of the communities. However, it does not clearly present the literacy scenario of the Parakanã people or ensure their  understanding of the Summary documents of the PDD, Monitoring Plan, and other project information provided in Portuguese and Tupi Guarani.', 'Clarify the literacy scenario in the indigenous people from Parakana TI, and how their understanding of the project’s documents is ensured.', 'Dizer que em todas as reuniões sempre tem tradutores Tupi- portugues, para garantir que: 
i. galera q entende portugues mas n fala entenda as etapas do projeto
ii. galera que não fala portugues entenda.', 'Texto em amarelo na seção 2.1.1 - Revisar',
     'fechado', 'concluido',
     'ok', null);

  -- n16 | car | pdd | ID - 03
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, v_rodada1, 'car',
     'ID - 03', 16, 'pdd', null,
     'Figures and maps throughout the PDD have descriptions and legend mixing Portuguese and English. According to the VCS Standard, all information provided in PDD shall be written in English. The summary PD can contain the', 'Provide all information in every map and figure in the PDD in English language.

2nd: Not all elements in the PD are in English. For example, Figure 18 in Section 2.1.17 and Table 9 in Section 2.2.2 are not in English. 
Verificar o que fazer com as imagens do desenvolvimento nosso - retirar já que iremos usar os dados da Verra? Perguntar ao VVB qual melhor estratégia?', '1. Identificar mapas que apresentam os problemas mencionados - ACC

2. Refazer os mapas levando em consideração somente a lingua em ingles- GS', null,
     'aberto', 'em_andamento',
     'nao_aplicavel', null);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 1 - Inglês Ok', true, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 2 - Passar datas para ingles- OK', true, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 3 - Passar datas para ingles - OK', true, 2);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 4 - Inglês OK', true, 3);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 5 - Inglês OK', true, 4);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 6 - Inglês OK', true, 5);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 7 - Inglês OK', true, 6);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 8 - Inglês OK', true, 7);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 9 - Inglês OK', true, 8);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 10 - Passar número para notação inglês - OK', true, 9);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 11 - Passar número para notação inglês - OK', true, 10);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 12 - Inglês OK', true, 11);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 13 - Inglês OK', true, 12);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 14 - Inglês OK', true, 13);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 15 - Inglês OK', true, 14);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 16 - Inglês OK', true, 15);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 17 - Precisa colocar?', false, 16);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 18-  Uma frase em PT -  OK', true, 17);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 19 -  Inglês OK', true, 18);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 20 -  Inglês OK', true, 19);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 21 - Não tem - corrigir a numeração das proximas', false, 20);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 22 - Trocar Reserva Desenvolvimento Sustentavel (RDS) pela sigla em EN, trocar APA pela sigla em EN', false, 21);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 24 -  Inglês OK', true, 22);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 25 -  Não tem - corrigir a numeração das proximas', false, 23);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 26 -  Inglês OK', true, 24);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 27 -  Inglês OK', true, 25);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 28 -  Inglês OK', true, 26);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 29 -  Inglês OK', true, 27);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 30 -  Inglês OK', true, 28);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 31 -  Inglês OK', true, 29);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 32 -  Inglês OK', true, 30);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 33 -  Inglês OK', true, 31);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 34 -  Inglês OK', true, 32);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 35 -  Inglês OK', true, 33);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 36 -  Inglês OK', true, 34);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 37-  Inglês OK', true, 35);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 38 -  Inglês OK', true, 36);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 39 -  Inglês OK', true, 37);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 40 -  Inglês OK', true, 38);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 41 -  Inglês OK', true, 39);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 42 -  Inglês OK', true, 40);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 43 -  Inglês OK', true, 41);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 44 -  Inglês OK', true, 42);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 45 -  Inglês OK', true, 43);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 46 -  Inglês OK', true, 44);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 47 -  Passar “Floresta” para inglês', false, 45);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 48 -  Inglês OK', true, 46);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 49 -  Inglês OK', true, 47);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 50 -  Inglês OK', true, 48);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 51 -  Inglês OK', true, 49);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 52 -  Inglês OK', true, 50);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 53 -  Inglês OK', true, 51);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 54 -  Inglês OK', true, 52);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 55 -  Inglês OK', true, 53);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 56 -  Inglês OK', true, 54);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 57 -  Inglês OK', true, 55);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 58 -  Inglês OK', true, 56);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 59 -  Inglês OK', true, 57);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 60 -  Inglês OK', true, 58);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 61 -  Inglês OK', true, 59);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 62 -  Inglês OK', true, 60);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 63 -  Inglês OK', true, 61);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 64 -  Inglês OK', true, 62);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 65 -  Inglês OK', true, 63);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 66 -  Passar para inglês - OK', true, 64);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 67 -  Inglês OK', true, 65);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 68 -  Inglês OK', true, 66);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 69 -  Inglês OK. Trocar mapa das aldeias com as 31?', false, 67);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 70 -  Inglês OK', true, 68);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 71 -  Inglês OK', true, 69);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 72 -  Inglês OK', true, 70);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 73 -  Inglês OK', true, 71);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 74 -  Inglês OK', true, 72);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 75 -  Inglês OK', true, 73);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 76 -  Inglês OK', true, 74);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 77 -  Inglês OK', true, 75);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 78 -  Inglês OK', true, 76);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 79 -  Inglês OK', true, 77);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 80 -  Inglês OK', true, 78);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 81 -  Inglês OK', true, 79);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 82 -  Inglês OK', true, 80);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 83 -  Inglês OK', true, 81);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Figure 84 -  Inglês OK', true, 82);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 1 -', false, 83);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 2 - Precisa mudar o nome para ingles?OK', true, 84);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 3- OK', true, 85);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 4 - OK', true, 86);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 5 - OK', true, 87);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 6 - OK', true, 88);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 7 - Número em PT passar para EN - OK', true, 89);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 8 - OK', true, 90);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 9 - Nome em PT e notação em PT - OK', true, 91);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 10 - OK', true, 92);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 11 - OK', true, 93);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 12 - OK', true, 94);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 13 - OK', true, 95);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 14 - OK', true, 96);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 15 - OK', true, 97);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 16 - OK', true, 98);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 17 - OK', true, 99);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 18 - Mantemos? Retiramos?', false, 100);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 19 - OK', true, 101);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 20 - OK', true, 102);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 21 - OK', true, 103);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 22 - OK', true, 104);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 23 - OK', true, 105);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 24 - OK', true, 106);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 25 - OK', true, 107);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 26 - OK', true, 108);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 27 - OK', true, 109);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 28 - OK', true, 110);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 29 - OK', true, 111);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 30 - OK', true, 112);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 31 - OK', true, 113);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 32 - OK', true, 114);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 33 - OK', true, 115);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 34 - OK', true, 116);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 35 - OK', true, 117);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 36 - OK', true, 118);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 37- OK', true, 119);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 38- OK', true, 120);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 39 - OK', true, 121);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 40 - OK', true, 122);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 41 - OK', true, 123);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 42 - OK', true, 124);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 43 - OK', true, 125);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 44 - OK', true, 126);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 45 - OK', true, 127);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 47 - OK', true, 128);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 48 - OK', true, 129);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 49 - OK', true, 130);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-802d-8df0-efea2a3623a6')::uuid, 'Table 50 - OK', true, 131);

  -- n17 | car | pdd | ID - 04
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-807d-87b8-d8a2d585161e')::uuid, v_rodada1, 'car',
     'ID - 04', 17, 'pdd', 'Section 3.1.3 - Project Boundary',
     '1. The PP states in Section 3.1.3 in PDD that Figure 24 illustrates the map of the project boundary where the installations and management activities will take place. However, such information is not available in Figure 24. Additionally, CCB Standard requires in the map the localization where measures are taking place and the leakage belt boundaries.

2. Descriptions of  procedures to design Udef PA and Udef LB are missing (PD Comment', 'PP is asked to display in the map of Figure 24 according to CCB Standard requirements', '1. Escrever que as atividades irão ocorrer nas aldeias - ACC
2. Colocar a localização das aldeias no mapa - ACC', null,
     'fechado', 'concluido',
     'pendente', 'Map with Measures taking place + Leakage Belt (figure 24)');

  -- n18 | cl | monitoramento | ID - 04
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1e3ee8ba-950e-8049-a243-c2db1da48cab')::uuid, v_rodada1, 'cl',
     'ID - 04', 18, 'monitoramento', 'Section 2.3.4 and 4.4.1',
     'Sections 2.3.4 and 4.4.1 in MR describes that informational meetings were held and conducted for the Parakanã community and other stakeholders. However, sufficient documentation to demonstrate each of these meetings was not provided to the date to the audit team.', 'The PP is required to provide sufficient documentation to demonstrate meetings with the Parakanã communities and other stakeholders', null, null,
     'fechado', 'concluido',
     'pendente', '- Verificar o que foi enviado
- Relatorio item 2.3.11 do PD
- Relatorios cadeias - Interelos ou Relatorio Final - Interelos');

  -- n19 | cl | pdd | ID - 04
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1caee8ba-950e-8001-a838-f3befb782366')::uuid, v_rodada1, 'cl',
     'ID - 04', 19, 'pdd', 'Section 2.3.10 - Stakeholder Consultation',
     '1. PP needs to clarify the stakeholder consultation meeting as the date mentioned in section 2.3.10 Stakeholder is December 2023 and based on VCS standard v 4.7 section 3.18.2 the stakeholder consultation should be done before the implementation of project activities (Before the project start date.)
2. PP is requested to provide exact date as in DD-MM-YYYY response.', '1. PP shall clarify the stakeholder consultation date based on VCS standard v4.7 section 3.18.2.
2.', '1. PD: Dizer que essa galera: MPF, FUNAI, IPES e INDEVA são os principais e por isso as reuniões ocorreram com eles antes.

2. Incluir reuniões que ocorreram com :
- MPF (Evidências: e-mails e invites), - FUNAI (e-mails confirmando) 
- Seminário (Parakanã community)
- ProPKN (João) - incluir no texto e procurar as evidências.', null,
     'fechado', 'concluido',
     'pendente', 'Antes do “project start date”
1. Convites enviados aos orgaos - OK
2. Resposta dos convites 
3. Docs Seminario - OK
4. Contrato ADLs - OK

Depois do “project start date”
1. Relatorio com reuniões que ocorreram - OK');
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1caee8ba-950e-8001-a838-f3befb782366')::uuid, '- Convites enviados aos orgãos: Verificar se tem evidencia das respostas', false, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1caee8ba-950e-8001-a838-f3befb782366')::uuid, '- Seminários', false, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1caee8ba-950e-8001-a838-f3befb782366')::uuid, '- Contrato com as ADLs', false, 2);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1caee8ba-950e-8001-a838-f3befb782366')::uuid, '- Relatórios de atividades com as dats corretas - Verificar se deixa separado as reuniões de stakeholders.', false, 3);

  -- n20 | car | pdd | ID - 05
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-8026-aac5-d3279e73967d')::uuid, v_rodada1, 'car',
     'ID - 05', 20, 'pdd', null,
     'The CCB & VCS Project Description Template CCB Version 3.0, VCS Version 4.3 is outdated.', 'PP is requested to update the template to the latest version released by Verra.', 'Atualizar informações no novo template da Verra 
AC começa, GS continua', null,
     'fechado', 'concluido',
     'nao_aplicavel', null);

  -- n21 | cl | monitoramento | ID - 05
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1e3ee8ba-950e-80cf-81ee-f1ba242101c9')::uuid, v_rodada1, 'cl',
     'ID - 05', 21, 'monitoramento', 'Section 3.2.2.1',
     '1.  Section 3.2.2.1 in MR describes procedures to allocate deforestation data for the monitoring period. However, the location of actual identified deforestation in the Udef PA and Udef LB for the MRV period is not available.
 
2.  PP developed risk classes for deforestation but does not present these data in the MR document.', '1.  The PP is requested to provide a map and GIS files to demonstrate actual identified deforestation patches in the Udef PA and Udef LB for the MRV period, as well as the total area of deforestation per month.
 
2.  The PP is required to demonstrate evidence in form of GIS files of deforestation risk maps and of sample distribution.', 'Plataforma Online, verificar se user e id são os mesmo que temos - OK
Verificar se os valores estão batendo com os quantitativos da tabela - OK', '- Guilherme enviou dados, colocar na pasta correta',
     'aberto', 'concluido',
     'pendente', '- Shapefiles usados. Já esta na pasta correta,OK');

  -- n22 | cl | pdd | ID - 05
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1caee8ba-950e-80a2-b400-e2671d480604')::uuid, v_rodada1, 'cl',
     'ID - 05', 22, 'pdd', 'Section 2.3.10',
     'It is unclear whether Associação Paranatinga Parakanã, Instituto Wyrapina Awaete, and REDD PARAKANA SUSTENTABILIDADE SPE LTDA represent all members of the indigenous community and how the participation of all community members is ensured in the project.', 'PP is requested to clarify and provide evidence of the participation of the indigenous people on the Associação Paranatinga Parakanã, Instituto Wyrapina Awaete, and REDD PARAKANA SUSTENTABILIDADE SPE LTDA.', '1. Escrever como é a estrutura das 3 organizações (Verificar o que é função e responsabilidade de cada entidade - Associações e SPE).
2. Explicar como os indigenas realizam as atividades.
3. Explicar que SPE financia as ADLs (não precisa colocar a % e informa que contratos foram entregues ao VVB).', null,
     'fechado', 'concluido',
     'pendente', null);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1caee8ba-950e-80a2-b400-e2671d480604')::uuid, 'Item 1 - Seção 2.4.1', false, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1caee8ba-950e-80a2-b400-e2671d480604')::uuid, 'Item 2 - Seção 2.4.1', false, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1caee8ba-950e-80a2-b400-e2671d480604')::uuid, 'Item 3 - Seção 2.4.4', false, 2);

  -- n23 | cl | pdd | ID - 06
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1caee8ba-950e-8078-a221-d607a7b11226')::uuid, v_rodada1, 'cl',
     'ID - 06', 23, 'pdd', null,
     'In the file Relatório Estoque de Carbono Parakanã 14fev (2), from the SOP evidence folder shared by the PP, section 4.1 mentions a systematic plot distribution. However, section 4.4.1 states that the distribution was based on the access routes used by the indigenous people, and Figure 4 (pasted above) shows that the plots are concentrated along the borders of the project area.', 'PP is requested to clarify and provide evidence of the systematic sampling methodology applied, as well as to explain the absence of plots covering most of the project area

2nd: PP has not yet provided sufficient evidence to illustrate the application of a systematic or random sampling methodology or to explain the concentration of plots along the forest edges. Further clarification and supporting documentation are still required', 'Entender como [P383] como explicar isso, dizer que tem um relatorio de geoprocesamento que tem “confirmação” dos dados.

2nd: E-mail enviado para [P383] para melhores esclarecimentos. Fazer FUP na quarta caso não tenha respondido.', null,
     'aberto', 'revisao',
     'pendente', 'Relatório de metodologia e esclarecimento do [P383],Em andamento');
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1caee8ba-950e-8078-a221-d607a7b11226')::uuid, '[P383] esta preparando parecer e evidencias - Relatorio já em inglês- OK', true, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1caee8ba-950e-8078-a221-d607a7b11226')::uuid, '[P933] fazendo parecer tbm - OK, vai fazer alguns ajustes.', false, 1);

  -- n24 | cl | monitoramento | ID - 06
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1e3ee8ba-950e-806a-a012-da30f9a5f27b')::uuid, v_rodada1, 'cl',
     'ID - 06', 24, 'monitoramento', 'Section 3.2.2.2',
     'The PP describes in Section 3.2.2.2 in MR the equations used to estimate annual emissions caused by unplanned deforestation in the Udef PA and Udef LB. However, the ex-post spreadsheet and GHG calculations are not available to the date to the audit team.', 'The PP is requested to provide the spreadsheet for all calculations in the emission reduction and removal calculations

2nd: PP has provided the requested evidence and it has been checked. However, the ex-ante data must be updated according to the activity data provided by Verra, which will impact the ex-post calculations. Because of that, this finding remains open.', 'Atualizar de acordo com dados da Verra', null,
     'aberto', 'concluido',
     'pendente', null);

  -- n25 | car | pdd | ID - 06
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-800e-adc5-da86570f0010')::uuid, v_rodada1, 'car',
     'ID - 06', 25, 'pdd', null,
     'The date and project''s name information presented in page 2 in PDD does not match the registration in Verra', 'PP is requested to align the project''s name and date with the Verra register, respecting the accounting period.', 'Atualizar informações de acordo com o pedido', null,
     'fechado', 'concluido',
     'nao_aplicavel', null);

  -- n26 | cl | pdd | ID - 07
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-80e4-8e09-f25ff65c7c53')::uuid, v_rodada1, 'cl',
     'ID - 07', 26, 'pdd', 'ER spreadsheet',
     'In the ER spreadsheet, the total post-deforestation carbon stock is reported as 18.96 tCO2e/ha, however, the value used for this parameter (Cppost,i) is 11.51 tCO2e/ha.', 'PP is requested to clarify how the application of this value is conservative.', null, null,
     'fechado', 'concluido',
     'pendente', 'Bibliografia utilizada
Tool Cp post 
Bibliografia alternativa');
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80e4-8e09-f25ff65c7c53')::uuid, 'Incluida informação em 2ª versao da planilha ERR', false, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80e4-8e09-f25ff65c7c53')::uuid, 'Docs na pasta de Evidencia', false, 1);

  -- n27 | car | pdd | ID - 07
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-8024-9341-dc941fb86899')::uuid, v_rodada1, 'car',
     'ID - 07', 27, 'pdd', 'Section 2.6.1',
     'The PP describes in Section 2.6.1. in PDD the leakage management plan and activities to be implemented. However, the definition and localization of areas where activities are planned to be implemented and the definition of the leakage management zone are missing.', 'The PP is required to provide sufficient definition of leakage management plan activities areas and their location. The PP is also required to provide the leakage management zone.', '1. Leakage managment: 5km da TI do lado de Itupiranga
2. Verificar no plano das ADLs  as atividades mais especificas para incluir no plano de gerenciamento', null,
     'fechado', 'concluido',
     'pendente', 'Mapa com Leakage Managament Zone');
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-8024-9341-dc941fb86899')::uuid, '1. Entender quais seriam as areas prioritárias, areas prioritarias são as do Sindicato de produtores rurais - Itupiranga. Recorte: 10km + Itupiranga (onde vai acontecer)', false, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-8024-9341-dc941fb86899')::uuid, '2. Criar aba adicional no “Monitoring Plan”. Colocar algumas atividades no “Leakage” - cursos educação ambiental, usando sindicato como parceiro.', false, 1);

  -- n28 | cl | monitoramento | ID - 07
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, v_rodada1, 'cl',
     'ID - 07', 28, 'monitoramento', 'Section 4.3.1',
     'Section 4.3.1 in MR describes the monitoring of impacts in communities in the project, that are categorized in 8 areas. However, no evidence were provided to the date that demonstrate procedures or that actions were carried out.', 'The PP is requested to provide sufficient evidence for actions carried out to implement activities for each of the 8 categorized areas, in order to comply with CCB Standard – GL Community requirements.

2nd: The PP provided evidence on the most of the 8 categorized areas, however mentioned attendance list, photos, and reports from the forest guard workshop sessions in axis 1 are lacking in the evidence file provided to the audit team. The PP is required to provide missing evidence. This finding remains open.', 'Lista de presença sem data. 
Confirmar datas/período com INDEVA.', null,
     'aberto', 'concluido',
     'pendente', '- Dados de implementação 
- Relatórios IPES/INDEVA,Pendente');
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Eixo 1 - Preservação floresta', false, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência 1: Oficio enviado para autoridades de atividade ilegal', false, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência 2: resposta do oficio enviado', false, 2);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência 3: Lista de presença, fotos, relatorio dos treinamento de guarda florestal', false, 3);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência 4: Fotos da guarita construida', false, 4);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência 5: resposta do oficio enviado', false, 5);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Eixo 2 - Cadeias - Todos os docs Interelos fez', false, 6);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência 1: plano de negocios açaí', false, 7);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência 2: plano de negocios castanha', false, 8);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência 3: estudo de mercado açaí', false, 9);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência 4: estudo de mercado castanha', false, 10);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Eixo 3 - Educação', false, 11);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência: base do socio', false, 12);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Eixo 4 - Saúde', false, 13);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência: base do socio', false, 14);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Eixo 5 - Infraestrutura', false, 15);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência: base socio', false, 16);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Eixo 6 - Alimentação', false, 17);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência: base socio', false, 18);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência 2: total R$ alocado para alimentação', false, 19);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Eixo 7 - Cultura', false, 20);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência: Fotos CLPIs,', false, 21);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência: base do socio', false, 22);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Eixo 8 - Governança', false, 23);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1e3ee8ba-950e-80a4-b1b0-f6327f84a596')::uuid, 'Evidência: comprovante de suporte financeiro para criação das associações.', false, 24);

  -- n29 | cl | monitoramento | ID -08
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8044-983a-e6e8d232de6a')::uuid, v_rodada2, 'cl',
     'ID -08', 29, 'monitoramento', 'Section 2.1.12',
     'The evidence for the current SDG project contributions in section 2.1.12 in MR were not provided by PP.', 'PP is asked to provide evidence of the current SDG project contributions', 'Não mandamos? Separar por SDG', null,
     'aberto', 'concluido',
     'pendente', null);

  -- n30 | cl | monitoramento | ID -09
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-800c-92d2-e0e91060127a')::uuid, v_rodada2, 'cl',
     'ID -09', 30, 'monitoramento', 'Section 2.3.2, 2.3.3, 3.1.4',
     'It is unclear how the understanding of the project''s documents provided by the PP to the communities is ensured, since the documents were delivered in Portuguese and the communities speak an indigenous language.', 'PP is requested to clarify which measures were taken to ensure that the communities have access to and understand the project documents and information.', 'Verificar no texto o que esta escrito, incluir os docs e videos ?', null,
     'aberto', 'em_andamento',
     'pendente', null);

  -- n31 | cl | monitoramento | ID - 10
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8053-a1df-dd2692d50077')::uuid, v_rodada2, 'cl',
     'ID - 10', 31, 'monitoramento', 'Section 2.3.15, 2.3.17',
     'It is unclear whether the community members received any training, or if the improvement of their skills was considered as a result of their participation in the monitoring activities.', 'The Project Proponent is requested to clarify the nature of these trainings and provide evidence of the events, including the training on sustainable practices and resource management mentioned in section 2.3.17.', 'Verificar o que esta escrito, entender se tem informações adicionais que pode ser colocadas como evidência', null,
     'aberto', 'concluido',
     'pendente', null);

  -- n32 | cl | monitoramento | ID - 11
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-807b-8a07-e9e0e06d1d8c')::uuid, v_rodada2, 'cl',
     'ID - 11', 32, 'monitoramento', 'Section 5.3.12',
     'In section 5.3.1.2 in MR and in section 4.1 in the evidence file “Relatório Estoque de Carbono Parakanã”(Parakana Carbon Stock Report), PP mentions a systematic plot distribution. However, the coordinates provided by PP shows that plots are concentrated along the borders of the project area.', 'PP is requested to clarify and provide evidence of the systematic sampling methodology applied, as well as to explain the absence of plots covering most of the project area.', 'Já enviado ao [P383]', null,
     'aberto', 'em_andamento',
     'pendente', null);

  -- n33 | cl | monitoramento | 12 - PK
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8092-9507-d29ad38ee590')::uuid, v_rodada2, 'cl',
     '12 - PK', 33, 'monitoramento', 'Section 2.2.1',
     'Observation: The MR reports patrols in the leakage belt (Section 2.2.1, May 2024) but VVBs not describe GIS/RS methods for quantifying leakage (no maps or area statistics for deforestation in the belt). Avoided deforestation (2,592 ha) is reported for the project area only, with no leakage deductions shown.', 'Action Required: The PP should clarify the GIS methods used for delineating and monitoring the leakage belt (buffer creation in GIS software, RS change detection), including any leakage emissions subtracted from net reductions (1,366,236 tCO2e).', 'Verificar com Guilherme a plataforma', null,
     'aberto', 'concluido',
     'ok', null);

  -- n34 | cl | monitoramento | 13 - PK
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-808b-82ad-ca2bdd1d046a')::uuid, v_rodada2, 'cl',
     '13 - PK', 34, 'monitoramento', 'Section 2.2.2',
     'Observation: The section 2.2.2 of the MR mentions baseline reassessment has occurred, but the MR VVBs not reference or summarize the historical RS dataset used in the original PDD for baseline establishment (deforestation trends leading to the projected without-project scenario).', 'Action Required: The PP should provide evidence (e.g., summary tables or maps) of the historical RS data (LANDSAT/Sentinel time series) used to derive the baseline, including how it aligns with the monitored period (2023–2024).', 'Juntar informações database da [P904] + Guilherme', null,
     'aberto', 'concluido',
     'pendente', null);

  -- n35 | cl | monitoramento | 14 - PK
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-809c-918d-d7b6ebc10441')::uuid, v_rodada2, 'cl',
     '14 - PK', 35, 'monitoramento', 'ERR sheet',
     'Observation: The VVB has assessed “ERR.xlsx” and the sheet “Carbon stocks” are averaged (AB_tree 584.8 tCO2e/ha) and propagated (Average Carbon Stock sheet, 579.63 tCO2e/ha for AB_tree). No GIS maps or RS integration (NDVI for biomass variability) are provided, despite flora/fauna inventories. Without spatial mapping, stock changes (e.g., ∆CBSL,PA-Udef,t in Estimation BLS Emissions sheet) may not reflect heterogeneity in the 351,697 ha area, potentially inflating ERR.', 'Action Required: The PP should provide GIS maps of carbon stocks/forest strata, integrating RS (land cover classification), and recalculate emission factors in ERR (Carbon stock pools sheet).', 'Shapes do relatorio de sensoriamento remoto do [P383] 
Incluir explicação do que esta no relatorio no finding e que portanto não irá mudar os fatores de emissão, porque a floresta é homogenea.
Entender com [P620] se essa explicação esta correta/faz sentido', null,
     'aberto', 'em_andamento',
     'pendente', null);

  -- n36 | cl | monitoramento | 14 - PK
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8016-abbb-dd8971971f37')::uuid, v_rodada2, 'cl',
     '14 - PK', 36, 'monitoramento', 'Section 3.1.2',
     'Observation: The Section 3.1.2 of the MR lists monitored parameters including deforestation area in the project zone (derived from RS change detection), leakage belt emissions (e.g., via ERR Leakage sheet calculations), forest stratum carbon stocks (ERR Carbon stock pools sheet, e.g., AB_tree at 584.8 tCO2e/ha), and baseline projections (ERR BSL UDef sheet, pixel probabilities). However, no comprehensive geospatial evidence is provided, such as maps of monitored deforestation polygons, leakage belt buffers, or stratified carbon stock rasters. The MR references RS monitoring (Section 2.1.1) and provides a project area KML (Section 2.1.8), but lacks parameter-specific files (shapefiles for AD hotspots or GeoJSON for village buffers integrated with deforestation layers).', 'Action Required: The PP should provide a consolidated package of geospatial evidence for all GIS/RS-dependent parameters in MR Section 3.1.2, including: (1) Vector files (shapefiles) delineating monitored deforestation areas and leakage belts; (2) Raster maps (GeoTIFFs) of carbon stock distributions and forest strata; (3) KML/GeoJSON overlays integrating parameters with project boundaries and villages (31 villages in MR Section 2.2.4); and (4) Metadata on CRS and resolution.', '1. já não esta incluso no material do [P620]?
2. [P383]? mapa do Global Forest Watch - Harris et all
3. Entender com [P620], 
4. ?', null,
     'aberto', 'concluido',
     'pendente', null);

  -- n38 | cl | pdd | ID - 08
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-800c-b44e-db76d7b02219')::uuid, v_rodada1, 'cl',
     'ID - 08', 38, 'pdd', 'ER spreadsheet',
     'The project area is surrounded by deforested patches in a “fish-spine” pattern, while representing the largest remaining fragment of preserved forest in the region. This configuration presents significant risks to the project''s implementation and permanence. However, such risks do not appear to be adequately reflected in the ex ante effectiveness index, which begins at 95% and rapidly increases to 99%..', 'PP is requested to clarify the methodology used to determine the ex ante effectiveness index and to explain how this index is considered conservative.

2nd: The PP provided useful qualitative information on current and planned protection efforts, such as patrols, fire response, and community training, which demonstrate the project''s capacity to improve effectiveness over time. However, the response VVBs not clarify how the ex ante effectiveness index was calculated, nor VVBs it justify why a high initial and fast-growing value should be considered conservative, given the surrounding deforestation pressure.

Although the methodology VVBs not specify how to calculate this index, and recognizing that it VVBs not affect the ex post measurement of actual effectiveness, and that building a quantitative model would involve considerable uncertainty, the selected index should still be supported by a more evidence-based rationale grounded in the region’s high-risk context.', '1. Verificar se mudança de uso de terra ao entorno justifica as premissas
2. Verificar com [P904], [P933] se há outra justificativa que confirme as premissas;
3. Perguntar a [P904] na reunião 25/08.
4. Incluido PADA Report Verra', null,
     'aberto', 'revisao',
     'pendente', 'PADA Report');
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-800c-b44e-db76d7b02219')::uuid, '1.  Pressões externas são grandes, contudo, os indigenas ate pela distrubuição das aldeias ao redor do territorio são capazes de reforçar / aumentar a proteção do territorio desde que tenh suporte financeiro, capacitação (suporte educacional e tenham apoio de tecnologias apropriadas (hoje eles não tem). Como é um projeto longo, SPE e Associações terem recursos para implementar um sistema de monitoramento robusto e efetivo que inclue conform ja explicado: monitoramento por satelite, rondas, brigada de incêndio.', false, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-800c-b44e-db76d7b02219')::uuid, 'Isto faz com que as ações dos indigenas tenham maior efetividade ao longo do periodo do porjeto.', false, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-800c-b44e-db76d7b02219')::uuid, 'Incluida informação em 2ª versao da planilha ERR, Docs na pasta de Evidencia', false, 2);

  -- n39 | car | pdd | ID - 08
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-8061-8cd6-de04bce8e9b5')::uuid, v_rodada1, 'car',
     'ID - 08', 39, 'pdd', 'Section 3.1.3 - Project Boundary',
     '1.  A description of which carbon pools are included or excluded for GHG calculations is missing.
2. Procedures to define Udef PA boundaries are not described in the PDD document.
 3. The PP describes in Section 3.2.2.1 in PDD the procedure to create Udef LB boundaries. However, VMD0055 prescribes that the spatial extent of the UDef LB will be defined by Verra.', '1.  The PP is requested to describe the inclusion/exclusion of carbon pools.

2. The PP is requested to describe in detail the procedures to define Udef PA boundaries according to VMD0055 module requirements.
 
3.  The PP is requested to demonstrate communication with Verra and provide evidence of Verra’s spatial boundaries of UDef LB in Section 3.1.3.

2nd
2. Procedures to design the PA were described in Section 3.1.3. However, methods used to define forest cover 10 years prior to the start date and data sources were not sufficiently clarified. Additionally, the audit team identified non-forest areas according to VCS Standard requirements within the PA, such as roads and cleaned areas. Figure 27 displays the same map as Figure 14, which visibility VVBs not fit to represent the PA boundaries clearly. 
The PP is requested to review PA boundaries, explain in detail procedures to define forest cover inside PA boundaries for 10 years prior to the start date, including data sources used for it, and provide a map containing the PA boundaries in suitable visibility, in order to comply with VCS Standard v4.7 and VMD0055 v1.1', 'Mostrar o que fizemos: tiramos os dados de floresta não floresta do mapbiomas do ano.  Mas não retiramos o estradas, rios.  Para comprovar que tem floresta há 10 anos precisamos mostrar anualmente o que tem na area? Confirmar 
Quando pedir o que queremos, informar que também é importante informar de onde foram tirado os dados.
Prof [P904]', 'Evidencia: atualizar figura do PD em andamento.',
     'aberto', 'concluido',
     'pendente', null);

  -- n40 | cl | pdd | ID - 09
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-80d4-9898-d15ecbaa8bcf')::uuid, v_rodada1, 'cl',
     'ID - 09', 40, 'pdd', 'ER spreadsheet',
     'The presented baseline activity data for the leakage belt (ADbsl,lb) is 4,329 ha/year, amounting to over 170,000 hectares over the project''s 40-year lifetime. Given that the project area is the single largest xfragment of preserved forest in the vicinity, it is unclear where such a volume of leakage deforestation could realistically occur.', 'PP is required to clarify the assumptions, data sources, and spatial basis used to define the baseline activity data for the leakage belt, and to justify the plausibility of this deforestation volume given the regional forest cover context.

2nd: The PP has explained the approach used to derive the baseline activity data for the leakage belt, including the use of an internally developed Jurisdictional Deforestation Risk Map, and confirmed adherence to the procedures set out in VT0007 and VMD0055.However, VERRA has since released the official jurisdictional activity data for the project''s region. As per the latest requirements, this official data must be used where available. Therefore, the PP is required to update the baseline deforestation activity data for the leakage belt using the jurisdictional activity data and revise the associated calculations accordingly', 'Atualização database  pós PADA fee (Verra)
Incluindo PADA report - 23/10', null,
     'aberto', 'revisao',
     'pendente', 'PADA Report');
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80d4-9898-d15ecbaa8bcf')::uuid, '1. E-mail enviado para [P904] e [P933]', false, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80d4-9898-d15ecbaa8bcf')::uuid, '2. Pedido acesso ao link com os mapas desenvolvidos.', false, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80d4-9898-d15ecbaa8bcf')::uuid, '1. Segue rigorosamente o passo a passo da VT0007 (listar seções e pgs da VT0007)', false, 2);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80d4-9898-d15ecbaa8bcf')::uuid, '2. desmatamento da regiao alto - validade de 6 anos, qnd refazer a linha de base a tendencia é q esse numero caia ao longo dos anos.  Dizer que o valor final vai vir da Verra.', false, 3);

  -- n41 | car | pdd | ID - 09
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-8087-96da-f07b2ce61370')::uuid, v_rodada1, 'car',
     'ID - 09', 41, 'pdd', 'Section 3.2.2.1',
     '1.  The PP describes the creation of the forest stratification map in Section 3.2.2.1 in PDD, however procedures to create the map are not sufficiently clarified.

2.  Forest stratification map is missing in Section 3.2.2.1.

3. Which satellite images and respective resolution shall be informed.

4. Aerial photographs, satellite images and forest inventory used shall be informed.', '1.  The PP is required to provide a clear and sufficient description of GIS procedures to create the forest stratification map, demonstrating accomplishment with VMD0055 and VMD0016 (X-TR) requirements and informing data sources used in the process.
 
2.  The PP is requested to provide the map in Section 3.2.2.1, complying with VMD0055 requirements.', null, '- Enviado e-mail para Prof. [P904]',
     'fechado', 'concluido',
     'pendente', 'GIS procedures to create the forest Stratification Map
Map for Section 3.2.2.1');

  -- n42 | cl | pdd | ID - 10
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-80c7-b5a0-e4c16b8b70dc')::uuid, v_rodada1, 'cl',
     'ID - 10', 42, 'pdd', 'Section 3.2.2.2',
     'Estimation of annual baseline emissions, risk maps, deforestation allocation, and subsequent project’s carbon stock change calculations shall be calculated using Verra’s official published data for baseline emissions in the correspondent jurisdiction where the Project Area is located.', 'The PP is required to clarify the reasons for not using Verra’s official jurisdictional activity data for baseline emissions quantification and carbon stock change calculations.

2nd: The evidence provided by PP says that once the activity is available, the project may adjust the baseline information in all the project documentation. As the activity data is already available for the state where the project is located, it has to be used, following the rules from VM0048.', 'Atualização database  pós PADA fee (Verra)', '1. Justificativa no Doc de findings é suficiente - Atualizar apos dados da Verra',
     'aberto', 'concluido',
     'pendente', 'PADA Report');

  -- n43 | car | pdd | ID - 10
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-8071-8cde-d9e304b18760')::uuid, v_rodada1, 'car',
     'ID - 10', 43, 'pdd', 'Section 2.6.1',
     'According to VMD0055 instructions, leakage management zones are part of the overall project design.', 'The PP is required to present and describe the leakage management zones and display their location and spatial extension, complying with VMD0055 and VCS Standard requirements.', null, null,
     'fechado', 'concluido',
     'pendente', 'Mapa com leakage Mgmt Zone');

  -- n44 | cl | pdd | ID - 11
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-80ab-8358-e63457b3ebf5')::uuid, v_rodada1, 'cl',
     'ID - 11', 44, 'pdd', 'Section 3.2.1',
     'PP mentions not choosing either option 1 or option 2 for defining the initial baseline validity period but argumentation for this decision is not sufficiently clarified.', 'The PP is required to clarify the reasons for not choosing any of the options given by VMD0055 in Section 3.2.1 in PDD.', null, null,
     'fechado', 'concluido',
     'nao_aplicavel', null);

  -- n45 | car | pdd | ID - 11
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-8043-8b5f-cca1a53de328')::uuid, v_rodada1, 'car',
     'ID - 11', 45, 'pdd', 'Section 3.1.4',
     'Figure 32 in Section 3.1.4 in PDD legend describes historical land use in the PA, but the figure itself does not provide this information.', 'The PP is requested to design the map figure accordingly and conform to CCB Standards on cartographic representation.', null, null,
     'fechado', 'concluido',
     'nao_aplicavel', null);

  -- n46 | car | pdd | ID - 12
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-80ea-a50e-c2acf56b7176')::uuid, v_rodada2, 'car',
     'ID - 12', 46, 'pdd', 'Section 1.1',
     'Section 1.1 of the PD Version 1.1 lists more than five unique project benefits, which VVBs not comply with the requirement to include only two to five benefits that are not already covered by the standardized benefit metrics.', 'The project proponent is requested to revise this section in accordance with the template instructions by selecting between two and five benefits.', null, 'Corrigido de acordo com beneficios do MR',
     'aberto', 'concluido',
     'nao_aplicavel', null);

  -- n47 | car | pdd | ID - 13 - PK
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8081-baa9-ec230b6561da')::uuid, v_rodada2, 'car',
     'ID - 13 - PK', 47, 'pdd', 'Section 3.3.1; Equations in 5.3.2.6.',
     'The VVB reviewed the PA (PARAKUNA_UTM_22) file, and there is ~1,360 ha discrepancy between the PD (351,697.41 ha) and QGIS evidence (~350,337 ha), which represents a potential under-reporting of eligible area, affecting baseline emissions (Section 6), net GHG reductions (Section 8), and VCU calculations (area-dependent emission factors per AUDef). While <5% (insignificant per Appendix 1), VCS requires precise geo-referenced boundaries.', 'Recalculate area using official FUNAI shapefiles in SIRGAS2000, update PD value, and revise affected quantifications. Submit the revised PARAKANA PA file.', null, null,
     'aberto', 'concluido',
     'pendente', null);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8081-baa9-ec230b6561da')::uuid, 'Evidências:', false, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8081-baa9-ec230b6561da')::uuid, 'Mapa Ok', true, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:253ee8ba-950e-8081-baa9-ec230b6561da')::uuid, 'PD com revisões: Em andamento', false, 2);

  -- n48 | cl | pdd | ID - 12
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-80d9-9a26-d7fdadcdf771')::uuid, v_rodada1, 'cl',
     'ID - 12', 48, 'pdd', 'Section 2.4.3',
     'The description provided in Section 2.4.3 of the PDD does not address the role of each team member for this REDD+ Project.', 'The PP is required to explain the role of each team member for the REDD+ Project and demonstrate through documentation (e.g. CV of team members) their qualifications.', '1.  Associação Paranatinga e IWA - responsabilidades, governança e qual papel no projeto.
2. Enviar CV de cada um dos integrantes envolvidos separados para os VVBs
3 Entidades: explicar o que a empresa/organização faz; incluir as principais formações de cada uma das pessoas envolvidas na organização/atividade
4. Cobrar CV de todo mundo: 
- IPES e INDEVA: Já temos, tem que pedir mais detalhes para [P469] e Raquel
- Novaterra: CV [P620], Guilherme e qm mais trabalhou na atividade de monitoramento
- [P383]: Curriculo lattes baixado, pedir curriculo do estatistico (?)
- FUPEF: [P904] e [P383] - CV ok
- Carbon: CV de todos tem q anexar', null,
     'fechado', 'concluido',
     'pendente', '1. Estatuto IWA. [P360] pediu Estatuto Paranatinga para [P467]
2. CVS enviados
3. Informação de contratos, estatutos, sites, confirmar com eles se é isso mesmo.');
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80d9-9a26-d7fdadcdf771')::uuid, '1. Incluída as informações do estatuto do IWA para as 2 Associações, verificar se estatuto da Paranatinga esta igual. Responsabilidades de acordo com o contrato com as as Associações.', false, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80d9-9a26-d7fdadcdf771')::uuid, '2. CVs IPES e INDEVA precisando de revisão.', false, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80d9-9a26-d7fdadcdf771')::uuid, '3. Incluido as experiencias de [P341], [P360] - IPES; [P469]  e [P366] - INDEVA', false, 2);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80d9-9a26-d7fdadcdf771')::uuid, '4. Cobrado CV da galera, apresentações institucionais, estatutos (ONGs)', false, 3);

  -- n50 | cl | pdd | ID - 13
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-800f-b42b-e48a7bb4f515')::uuid, v_rodada1, 'cl',
     'ID - 13', 50, 'pdd', 'Multiple sections PD',
     'Multiple sections in PDD cite various publications, however the documents for each of the publications were not provided to the audit team.', 'The PP is required to provide evidence to all publications cited in the PDD.', '1. Inserir pasta com as referências e organiza-las de acordo com os numeros de referência do documento
2. Seguir a organização que Yanna utlizou para Biodiversidade', null,
     'fechado', 'concluido',
     'pendente', 'Publicações citadas');

  -- n51 | cl | pdd | ID - 14
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-8038-a9f8-eeea7afeb82a')::uuid, v_rodada1, 'cl',
     'ID - 14', 51, 'pdd', 'Section 2.3.1 and 2.3.2',
     'Stakeholders presented in Section 2.3.1 do not match exactly with the ones described in the table of Section 2.3.2.', 'The PP is required to describe concisely which are the stakeholders of the REDD+ Project, according to the VCS+CCB Template requirements.', '1. Corrigir de acordo com o pedido', null,
     'fechado', 'concluido',
     'nao_aplicavel', null);

  -- n52 | cl | pdd | ID - 15
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-80e4-a930-e32f1208c879')::uuid, v_rodada1, 'cl',
     'ID - 15', 52, 'pdd', 'Section 2.3.7',
     'The PP describes in Section 2.3.7 in PD that communication of potential costs, risks and benefits to indigenous was carried out in a pedagogical way and employing various methods to ensure that everyone understands the information effectively. However, further demonstration through documents and explanations on methods of communication is lacking.', 'The PP is required to explain further and demonstrate the following:

 1. Evidence of meetings mentioned and eventually material delivered to the communities.
2.  A detailed explanation of which communication methods were used to ensure that community members understand the information effectively is required.
3. A detailed explanation of each of costs, risks and benefits that were communicated to the communities.', '1. Verificar com ADLs como é realizada a comunicação com a comunidade, verificar se tem algum material de apoio, senão fazer', null,
     'fechado', 'concluido',
     'pendente', '1. Linha do Tempo do Projeto (Abril/24)
2. Apresentação Seminário
3. Apresentação usada no Encontro de jovens e mulheres
4. Termos de que docs tecnicos foram recebidos pelas associações');
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80e4-a930-e32f1208c879')::uuid, '1. Reunião realizada com IPES 30/04', false, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80e4-a930-e32f1208c879')::uuid, '2. Novas evidências do material que é passado para as Associações.', false, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80e4-a930-e32f1208c879')::uuid, '3. incluir apresentação do seminario', false, 2);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80e4-a930-e32f1208c879')::uuid, '4. checar com o pessoal, se eles tem material especificio falando sobre custos (apresentação),  riscos e beneficios.', false, 3);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80e4-a930-e32f1208c879')::uuid, '5. Entregue o PD - termo de entrega; Linha do tempo - evidencia do que ocorreu  ao longo do tempo.', false, 4);

  -- n53 | cl | pdd | ID - 16
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-8025-b56e-ed09afc43540')::uuid, v_rodada1, 'cl',
     'ID - 16', 53, 'pdd', 'Section 2.3.11',
     '1. Section 2.3.11 in PDD provides a description of three mechanisms to ensure ongoing consultation and engagement. However, documentation to attest consultation is incomplete.
 
2.  Processes to adapt management through the project lifetime are not sufficiently explained.', '1.  The PP is required to describe each of SPE, IPES and INDEVA visits to each community and demonstrate them through evidence documents. Mention dates of each FPIC consultation and sufficient evidence documents (including attendance lists) to demonstrate them.
 
2.  The PP is requested to explain the processes the project will use throughout the project lifetime to adapt management accordingly.

2nd:     1. The PP has included all required information in the PD document. Evidence was provided, however attendance lists for the 2nd FPIC in both lower and upper groups are not available to the date for the audit team. The PP is required to include attendance lists for the 2nd FPIC in both lower and upper groups.', 'Não tem lista de presença, talvez estrategia seja fazer retroativo com os principais lideres que participaram.', null,
     'aberto', 'concluido',
     'ok', null);

  -- n54 | cl | pdd | ID - 17
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-80c7-8d42-e9ec7850b51b')::uuid, v_rodada1, 'cl',
     'ID - 17', 54, 'pdd', 'Section 2.3.12',
     '1. No evidence for communication channels is available.
 
2. Evidence for consultations, participatory processes and participation of key stakeholders is incomplete', '1.  The PP is required to provide detailed information on which telephone lines, e-mails and its respective contact people are defined as stakeholder consultation channels.
2.  The PP is requested to provide evidence that all consultations and participatory processes have been undertaken directly with communities and key stakeholders or through their legitimate representatives.', '1. Incluir numero de wpp para canal de comunicação', null,
     'fechado', 'concluido',
     'pendente', '- Cartaz com o numero do canal de comunicação 
- Atas CLPIs
- Atas Seminario');
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80c7-8d42-e9ec7850b51b')::uuid, '1. Verificar se linha ainda existe - Fabiano verificou com Michelle - est a inativa', false, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80c7-8d42-e9ec7850b51b')::uuid, '2. Verificar se galera ainda tem foto com o número - [P771] enviou', false, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80c7-8d42-e9ec7850b51b')::uuid, '3. Foto do cartaz exposto na aldeia -  Não tem', false, 2);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-80c7-8d42-e9ec7850b51b')::uuid, '4. Canal de comunicação com terceiros - Inserido dados do site', false, 3);

  -- n55 | cl | pdd | ID - 18
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-801b-8cdf-e7f20713f9c7')::uuid, v_rodada1, 'cl',
     'ID - 18', 55, 'pdd', 'Section 2.3.13',
     'The PP describes in Section 3.1.13 how decision-making and implementation measures that will be carried out in the future but lacks explaining how they have been carried out since the project started date in detail.', '1.  The PP is required to describe in detail how decision-making has prioritized the Parakanã communities’ decisions and to demonstrate with evidence and documents. 
2.  The PP is requested to clarify and provide evidence of how cultural practices and gender sensitivity were respected.', '1. Verificar texto e identificar o que pode ser melhorado para deixar mais claro o que esta pedido', null,
     'fechado', 'concluido',
     'pendente', '- Seminário inicial (fotos)
 - CLPI inicial (fotos)
 - árvore dos sonhos (fotos)');
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-801b-8cdf-e7f20713f9c7')::uuid, '1.  Foto nas aldeias', false, 0);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-801b-8cdf-e7f20713f9c7')::uuid, '2. Divisão dos dois grupos', false, 1);
  insert into public.carbon_finding_subitens (finding_id, descricao, concluido, ordem)
  values (md5('finding:vvb:1eaee8ba-950e-801b-8cdf-e7f20713f9c7')::uuid, '3. Traduções', false, 2);

  -- n56 | cl | pdd | ID - 19
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-80c2-8111-c12666b9a246')::uuid, v_rodada1, 'cl',
     'ID - 19', 56, 'pdd', 'Section 3.2.2.2',
     'Item 2.2. Estimated carbon stock in post-deforestation pool p in forest stratum i (Cp,post,i), states that carbon stocks following deforestation are based in land use/land cover available for the jurisdiction, however information on which dataset was used is missing', 'The PP is required to explain further which land use and land cover data was used.', '1. Incluir de onde o dado foi tirado', null,
     'fechado', 'concluido',
     'pendente', 'Bibliografia do Cp Post (estudo utilizado)
Tools de Cp post (se necessário)');

  -- n57 | cl | pdd | ID - 20
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-8030-baac-ddc80a32171a')::uuid, v_rodada1, 'cl',
     'ID - 20', 57, 'pdd', 'Section 3.3.3',
     'Section 3.3.3 in PDD describes the monitoring plan, however detailed information on organizational structure, responsibilities, and competencies of the personnel that will be carrying out monitoring activities is not available.', 'The PP is required to provide detailed information on organizational structure, responsibilities, and competencies of the personnel that will be carrying out monitoring activities, attending to VCS+CCB Template requirements.', '1. Incluir funções da Novaterra, INDEVA e como será feita as próximas rondas (periodicidade, equipamentos, equipe)', null,
     'fechado', 'concluido',
     'pendente', 'Organograma da gestão?
CV do time contratado
CV do time a contratar');

  -- n58 | cl | pdd | ID - 21
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-805d-ba78-c33bdaf099ff')::uuid, v_rodada1, 'cl',
     'ID - 21', 58, 'pdd', 'Section 4.1.1',
     'Section 4.1.1 in PDD mentions a diagnostic census conducted across all villages in the Parakanã indigenous territory but sources are not mentioned.', 'The PP is required to clarify the source of census data, including the institution that carried out the research, date of publishing and proper evidence documents.', '1. Inserir que Interelos juntamento com IPES, INDEVA e SPE conduziram o diagnostico', null,
     'fechado', 'concluido',
     'pendente', 'Relatório socioeconômico Interelos');

  -- n59 | cl | pdd | ID - 22
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-80d4-8d8b-f07a60577a08')::uuid, v_rodada1, 'cl',
     'ID - 22', 59, 'pdd', 'Section 4.2.4',
     '1.Anticipated net well-being impacts for all community groups in the project scenario vs. without-project land use scenario are not sufficiently explained in Section 4.2.4 in PDD, considering CCB Standards v3.1.

2.A description of which activities will be implemented to provide socioeconomic transformation and quality of life improvement are not sufficiently explained in Section 4.2.4 in PDD, considering CCB Standards v3.1.', '1.  The PP is required to clarify and demonstrate in Section 4.2.4 in PDD that the anticipated net well-being impacts of the project are predicted to be positive for all identified community groups compared with their previous well-being conditions under the without-project land use scenario.

2. The PP is required to describe and explain further which activities will be implemented to effectively provide socioeconomic transformation and quality of life improvement.', null, null,
     'fechado', 'concluido',
     'pendente', 'Árvore  dos Sonhos?
Monitoring Plan, foco nas atividades de comunidade?
Linha de base do censo?');

  -- n60 | cl | pdd | ID - 23
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-80ba-a897-fbc9a4073a19')::uuid, v_rodada1, 'cl',
     'ID - 23', 60, 'pdd', 'Section 2.3.5 and 2.3.11',
     'The PP mentions in Sections 2.3.5 and 2.3.11 in PDD that LDA has conducted regular monthly visits through the past years to the Parakanã people, as well as FPIC processes for decision making.
However, sufficient evidence was not provided to the audit team.', 'The PP is requested to provide evidence of all meetings carried out in the period mentioned with the Parakanã people in this Section, as well as FPIC documents, which should also present attendance lists.', '1. Verificar se tiveram acesso aos relatorios de atividade, verificar se relatorio estão de acordo com o que pede.', null,
     'fechado', 'concluido',
     'pendente', 'Relatório mensal ONGs
Fotos com presença do time ADL e Carbon nas aldeias');

  -- n61 | cl | pdd | ID - 24
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eaee8ba-950e-8089-a779-eecd7d0cc2a1')::uuid, v_rodada1, 'cl',
     'ID - 24', 61, 'pdd', 'Section 4.5.6',
     'Section 4.5.6 in PDD refers to Section 2.5.8, which does not provide all information required for benefit sharing of the REDD+ Project to the local communities.', 'The PP is required to describe the design and implementation of a benefit sharing mechanism, demonstrating that smallholders/community members have fully and effectively participated in defining the decision-making process and the distribution mechanism for benefit sharing; and demonstrating transparency, including on project funding and costs as well as on benefit distribution', '1. Discutido com Fabiano, entender como melhorar texto', null,
     'fechado', 'concluido',
     'nao_aplicavel', null);

  -- n62 | cl | pdd | ID - 25 - PK
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-80cf-9266-ebfc19aa717c')::uuid, v_rodada2, 'cl',
     'ID - 25 - PK', 62, 'pdd', 'Section 2.1.4',
     'Observation:
The VVB has reviewed the section 2.1.4 of PD that provides justifications for eligibility under VCS and CCB standards, claiming compliance with conditions such as no conversion of native ecosystems to generate GHG credits, no draining or degradation of hydrological functions in native ecosystems, no activities under ARR, ALM, WRC, or ACOGS categories, baseline reassessment every 6 years without ex-ante projections, and no occurrence on wetlands. Specific claims include:
The project area consists of native forested land qualifying as forest (>10% canopy cover per Brazil''s UNFCCC definition) for at least 10 years prior to the project start date (~2023, thus pre-2013).
No conversion due to natural disasters (e.g., hurricanes, floods) or human activities in the last 10 years.
No hydrological alterations (draining for AFOLU activities).
Activities fall under AUDD, with no wetlands present.', 'Action Required:
1. Remote Sensing Evidence for Forest Eligibility and No Conversion: Submit time-series satellite imagery (e.g., Landsat/Sentinel-2 composites from 2013-2023) with  NDVI/canopy cover analysis demonstrating >10% canopy cover and no significant deforestation/conversion (>5% per Appendix 1 significance test) in the project area. Include geo-referenced shapefiles (.shp) or rasters (.tif) of the project boundary, excluding any deforested patches post-2013. If deforestation occurred, clarify how affected areas are excluded from crediting. 
2.  Wetlands and Hydrological Assessment: Provide geophysical/physical evidence (soil/hydrography data or field surveys) confirming no wetlands (peatlands, mangroves) or drainage activities in the project area. Include evidence from RS (Sentinel-1 radar for water bodies).
3. Baseline Reassessment Plan: Submit a plan for 6-year baseline reassessments (first due ~2029), including GIS/RS methods (updated PRODES data integration per AUDef module) and evidence of jurisdictional nesting with Brazil''s FREL (Forest Reference Emission Level).
4. Category Confirmation: Provide documentation (land use maps from MapBiomas) confirming no ARR/ACOGS (no reforestation) or WRC (no wetland restoration) activities, and clarify any overlaps with AUDD.', 'Item 1, 2, 4 - OK
Item 3 -Incluido no PD', null,
     'aberto', 'concluido',
     'ok', null);

  -- n63 | cl | pdd | ID - 26 - K
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8062-90d7-de87bdc50b65')::uuid, v_rodada2, 'cl',
     'ID - 26 - K', 63, 'pdd', 'Section 2.1.4',
     'Observation: 
The VVB has assessed section 2.1.4, and   Projects must monitor and calculate leakage ex post, with any leakage subtracted from GHG emission reductions. Justification states compliance using VMD0055, but lacks details on how leakage (activity-shifting or market-effects) is quantified, such as spatial data for leakage belts or emission sources.
 
Eligible REDD Activities: Activities reducing net GHG emissions from unplanned deforestation/degradation, with the project area described as 100% native Amazon forest (per UNFCCC definition: >10% tree cover, minimum height 2-5m at maturity). Justification emphasises no recent conversion and high forest integrity, but VVBs not provide supporting evidence for the 10-year pre-start forest qualification (stable cover from 2013-2023) or exclusion of degraded areas.
 
Project Activity Category: Falls under Avoiding Unplanned Deforestation or Degradation (AUDD), not planned. Justification confirms no planned elements, but PD references historical, raising concerns about potential planned/authorised activities (mining or logging in adjacent zones) or misclassification.
 
The justifications lack physical evidence, such as remote sensing imagery for forest cover verification, geo-referenced maps excluding degraded areas, or leakage assessment reports. This hinders audit confirmation of eligibility, which may indicate ineligible portions if not addressed via significance testing (Appendix 1).', 'Action Required
To resolve this CL, the Project Proponent must provide the following physical evidence and/or detailed clarifications:

1. Evidence for Leakage Compliance: Submit detailed leakage calculations (ex ante/ex post) using VMD0055, including GIS shapefiles of the 10km leakage belt, RS change detection (e.g., Sentinel-2 time-series 2023-2025) for activity-shifting, and market leakage models (per LK-ME module). Clarify any adjustments for emission sources (e.g., timber harvesting) and provide spreadsheets with spatial data integration.
2.  RS Evidence for REDD Eligibility and Forest Qualification: Provide time-series satellite data (e.g., Landsat/Sentinel composites 2013-2023) with canopy cover analysis (NDVI >0.4 for >10% cover) and minimum height validation (e.g., LiDAR or field plots per CP-AB). Include geo-referenced maps (.shp/.tif) showing 100% native forest exclusion of any degraded/converted areas (<10% cover or post-2013 loss). If degradation exists, justify via Appendix 1 significance test (<5% emissions).
3. Category Confirmation for AUDD: Provide documentation (FUNAI/IBGE reports or legal assessments) confirming no planned deforestation (no authorised mining/logging in IT Parakanã). Clarify how historical deforestation is classified as unplanned, with RS evidence ( PRODES alerts showing unauthorised patterns).
4.  Overall Eligibility Mapping: Submit an updated project boundary map (SIRGAS 2000 datum) delineating eligible vs. non-eligible areas, with accuracy assessments (>85% per Section 9).', '1 - RS Change nos satelites, mas não tem os calculos - [P933]? Discutir com FGM
2 - RS - OK
3 - Fazer evidências - IBGE, ANM
4 - OK', null,
     'aberto', 'concluido',
     'ok', null);

  -- n64 | car | pdd | Documents requested
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-80ef-8e54-dc984c3f53d5')::uuid, v_rodada2, 'car',
     'Documents requested', 64, 'pdd', 'Section 2.1.14',
     'Figure 4. Hydrography within and outside IT Parakanã adapted by IBGE.
Provide Geospatial Evidence of the figure.', 'GS unificando informações em um só Projeto de GIS', null, null,
     'aberto', 'concluido',
     'pendente', null);

  -- n65 | car | pdd | Documents requested
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8013-9b72-cd05018cf024')::uuid, v_rodada2, 'car',
     'Documents requested', 65, 'pdd', 'Section 2.1.14',
     'Figure 5. Topography of IT Parakanã adapted by IBGE.
Provide Geospatial Evidence of the figure.', 'GS unificando informações em um só Projeto de GIS', null, null,
     'aberto', 'concluido',
     'pendente', null);

  -- n66 | car | pdd | Documents requested
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8033-b0b8-c9709e1def66')::uuid, v_rodada2, 'car',
     'Documents requested', 66, 'pdd', 'Section 2.1.14',
     'Figure 6. Soil Types in IT Parakanã adapted by EMBRAPA.
Provide Geospatial Evidence of the figure.', 'GS unificando informações em um só Projeto de GIS', null, null,
     'aberto', 'concluido',
     'pendente', null);

  -- n67 | car | pdd | Documents requested
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-80a3-b7c3-c4b5178597ef')::uuid, v_rodada2, 'car',
     'Documents requested', 67, 'pdd', 'Section 2.1.14',
     'Figure 7. Vegetation types in IT Parakanã by IBGE.
Provide Geospatial Evidence of the figure', 'GS unificando informações em um só Projeto de GIS', null, null,
     'aberto', 'concluido',
     'pendente', null);

  -- n68 | car | pdd | Documents requested
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8031-8594-d3960b16dce8')::uuid, v_rodada2, 'car',
     'Documents requested', 68, 'pdd', 'Section 2.1.15',
     'Figure 9. Spatial representation of settlements registered in Novo Repartimento and Itupiranga by Incra.
Provide Geospatial Evidence of the figure.', 'GS unificando informações em um só Projeto de GIS', null, null,
     'aberto', 'em_andamento',
     'pendente', null);

  -- n69 | car | pdd | Documents requested
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8091-9f1e-e0890e62fecc')::uuid, v_rodada2, 'car',
     'Documents requested', 69, 'pdd', 'Section 2.1.15',
     'Figure 12. Cadastral status of rural properties outside the project area, with points representing the villages within the IT Parakanã by SICAR.
 
Provide Geospatial Evidence of the figure.
1. b) Mineral zones located outside the Parakanã IT, with villages indicated by points by RAISG.Provide Geospatial Evidence of the figure.', 'GS revisando', null, null,
     'aberto', 'concluido',
     'pendente', null);

  -- n70 | car | pdd | Documents requested
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8018-b3e9-c09978079830')::uuid, v_rodada2, 'car',
     'Documents requested', 70, 'pdd', 'Section 3.2.2.1',
     'Forest Stratification Map
Provide Geospatial Evidence.', null, null, null,
     'aberto', 'concluido',
     'pendente', 'PADA Report');

  -- n71 | car | pdd | Documents requested
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-803d-b35b-f26004f9aed5')::uuid, v_rodada2, 'car',
     'Documents requested', 71, 'pdd', 'Section 3.2.2.2',
     'Risk Map
Provide Geospatial Evidence.', null, null, null,
     'aberto', 'concluido',
     'pendente', 'PADA Report');

  -- n72 | car | pdd | Documents requested
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8091-8fb7-ed3dafe8ba41')::uuid, v_rodada2, 'car',
     'Documents requested', 72, 'pdd', 'Section 3.2.2.2',
     '1) Jurisdictional Forest Carbon
2) Baseline Map (FCBM) for the HRP
Provide Geospatial Evidence.', null, null, null,
     'aberto', 'concluido',
     'pendente', 'PADA Report');

  -- n73 | car | pdd | Documents requested
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-8022-ab72-c644c1485c42')::uuid, v_rodada2, 'car',
     'Documents requested', 73, 'pdd', 'Section 3.2.2.2',
     '1) Evidence related to the prediction phase
2) Prediction vulnerability and modeling regions maps 
Provide Geospatial Evidence.', 'Mapa final Verra', null, null,
     'aberto', 'concluido',
     'nao_aplicavel', null);

  -- n74 | car | pdd | Documents requested
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:253ee8ba-950e-80d8-ad19-edd7d42bc563')::uuid, v_rodada2, 'car',
     'Documents requested', 74, 'pdd', 'Section 3.2.2.2',
     '1) Alternative risk maps
2) Model Testing and Selection 
3) Validation and model selection
Provide Geospatial Evidence.', 'Mapa final Verra', null, null,
     'aberto', 'concluido',
     'nao_aplicavel', null);

  -- n75 | pd_comment | pdd | PD Comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1ebee8ba-950e-80f6-8fc2-c5c8fcdd18c9')::uuid, v_rodada1, 'pd_comment',
     'PD Comment', 75, 'pdd', 'Section 2.1.4',
     'Section 2.1.4', null, null, null,
     'fechado', 'concluido',
     'pendente', null);

  -- n76 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1caee8ba-950e-80bb-862d-cc1a1b6ed93a')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 76, 'pdd', null,
     'There’s information in other languages than English on Figure 19 (Sec 2.1.17) and 58 (Sec. 4.1.1)', 'PP is required to review the information in the PD and adequate it to the language required by the Standard', 'Atualizar de acordo com o pedido', null,
     'fechado', 'concluido',
     'pendente', null);

  -- n77 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1caee8ba-950e-80a5-be97-c5f719f39107')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 77, 'pdd', 'Section 2.1.8 - Other Entities',
     'Section 2.1.8 - Other Entities', null, 'Inserir Apsis Carbon', null,
     'fechado', 'concluido',
     'pendente', null);

  -- n78 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1caee8ba-950e-80f5-8485-d045d6767711')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 78, 'pdd', 'NPR',
     'Verra só aceita quando tem alguma evidência que comprove que o projeto irá se manter pelo menos por 40 anos', null, '1. Escrever Lei Brasileira que não permite contrato tão longo com TI
2. Ter alguma carta que comprove o comprometimento dos indigenas com o projeto por pelo menos 40 anos.', null,
     'em_andamento', 'em_andamento',
     'pendente', null);

  -- n79 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1cbee8ba-950e-803b-aa2a-cdab4a609f7a')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 79, 'pdd', 'Double Counting/Double Claming',
     'Tem que garantir que projeto não fará', null, '1. Fazer declaração double couting e enviar ao VVB
2. Fazer declaração double clamming e enviar ao VVB 
3. No PD dizer que documentos foram enviados ao VVB', null,
     'em_andamento', 'em_andamento',
     'pendente', null);

  -- n80 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1ebee8ba-950e-806b-a3f5-e5e4e967ed80')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 80, 'pdd', 'Section 2.2.1 - Conditions prior to the project initiation and Land use scenarios without project area.',
     'Please elaborate this section in more description.', null, null, null,
     'fechado', 'concluido',
     'pendente', null);

  -- n81 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1caee8ba-950e-80f2-93c4-f28cb69ec0cb')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 81, 'pdd', 'Management capacity',
     'Management capacity', 'Tem que comprovar a capacidade de cada entidade elencada.', null, null,
     'respondido', 'revisao',
     'pendente', null);

  -- n82 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1caee8ba-950e-8067-a575-edb59ad119d3')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 82, 'pdd', 'Section - Audit History',
     'Colocar a tabela de volta e colocar a data de realização do SV.', null, '1. Inserir datas de 
- Validation
- Verification', null,
     'respondido', 'revisao',
     'pendente', null);

  -- n83 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1caee8ba-950e-804d-8f69-ec41fe609b57')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 83, 'pdd', 'Section 2.1.22 and 2.4.5 - Financial Sustentability and Financial Health of Implementing Organization',
     'Tem que garantir que há dinheiro para os próximos anos de projeto, sem ser derivando do crédito de carbono', null, '1. Inserir um Financial Statment: declaração do capital que tem - Colar outra pasta com os dados.
2. Inserir o contrato que tem com os investidores que eles vão continuar dando suporte financeiro 
3. Verificar se o cashflow do projeto foi colocado na pasta
4. Colocar no PD e MR: Informação foi provida ao VVB, e é comercialmente sensivel.', null,
     'fechado', 'concluido',
     'pendente', null);

  -- n84 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1e5ee8ba-950e-80d1-bb53-e61364719e14')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 84, 'pdd', 'Section 2.1.18 - SDGs',
     'PP is requested to provide information individually such as  SDG Target; SDG Indicator; Net Impact on SDG indicator; &  Project SDG Contribution for each SDG chosen.', 'Provide information individually such as  SDG Target; SDG Indicator; Net Impact on SDG indicator; &  Project SDG Contribution for each SDG chosen.', '1. Inserida mesma tabela do SDG do MR, com menos colunas', null,
     'fechado', 'concluido',
     'pendente', null);

  -- n85 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1e7ee8ba-950e-8042-ae83-dbfef77cc13b')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 85, 'pdd', 'Section 2.1.19 - Risks',
     'PP shall clarify whether they assessed the natural risk & legal risks identified to the project, how was it is not a concerning to the project.', '1. Provide clarify whether they assessed the natural risk & legal risks identified to the project, how was it is not a concerning to the project.', '1. Incluir riscos naturais e legais aos riscos totais.', null,
     'fechado', 'concluido',
     'pendente', null);

  -- n86 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eeee8ba-950e-8009-afb8-d1bfda749fe4')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 86, 'pdd', 'Section 2.3.15 - Feedback and Grievance',
     '1. PP ir requested to display  the WhatsApp number
2. PP ir requested to Display the telephone number', null, null, '1. Pedido a Leticia',
     'em_andamento', 'em_andamento',
     'pendente', null);

  -- n87 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eeee8ba-950e-806e-aff1-d76a3cc3bde4')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 87, 'pdd', 'Section 2.4.2 - Required Technical Skills',
     'Does not specify which stakeholder will be responsible for it.', null, null, null,
     'respondido', 'revisao',
     'pendente', null);

  -- n88 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eeee8ba-950e-80bb-a1d3-ec1392f447de')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 88, 'pdd', 'Section 2.4.7 - Commercially Sensitive information',
     'Chapter 5 does indeed describe endemic, threatened species, and with high economic value. Information must be concise.', null, null, null,
     'fechado', 'concluido',
     'pendente', null);

  -- n89 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eeee8ba-950e-8064-b8b4-d366abb34b99')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 89, 'pdd', 'Section 2.5.8 - Benefit Sharing Mechanism',
     'Despite it doesn’t affect property rights, the benefit sharing over the two indigenous associations and each of the aldeias should be described.', null, null, '- verificar senão é necessário fazer um doc de Benefit sharing plan',
     'respondido', 'revisao',
     'pendente', '- Questionários respondidos na CLPI pelas aldeias
- Docs Seminário 
- Contrato assinado');

  -- n90 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1eeee8ba-950e-80a0-887a-fdeddd7303cc')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 90, 'pdd', 'Section 3.2.2.3 - Estimation of Emissions from carbon stock',
     'Methods and criteria to define plot counting and distribution are not presented. It is not clear why central areas of the PA were not covered in the sampling plan.', null, null, 'Incluida informações NT [P383]',
     'respondido', 'revisao',
     'pendente', null);

  -- n91 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1f4ee8ba-950e-8053-b45e-ce5ab99409ea')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 91, 'pdd', 'Section 3.2.1.4 - Estimation of Emissions from Carbon Stock Changes',
     '1. Methods and criteria to define plot counting and distribution are not presented. It is not clear why central areas of the PA were not covered in the sampling plan.

2. Clarify which land use/land cover data was used.', null, null, 'Incluido dados da NT do [P383]',
     'respondido', 'revisao',
     'pendente', null);

  -- n92 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1f4ee8ba-950e-80c3-9614-e1e6b1fd31e5')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 92, 'pdd', 'Section 5.4 - Biodiversity Impact Monitoring',
     'PP shall demonstrate the planned implementation schedule or the activities demonstrate the monitoring activity', null, null, null,
     'respondido', 'revisao',
     'pendente', null);

  -- n93 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1f4ee8ba-950e-80fc-bf13-ebe9ba93d549')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 93, 'pdd', 'Section 5.2.4 - High Conservation Values Protected',
     'Please elaborate the procedure of identification of the HCVs in more detail based on the HCV manual and demonstrate why it was selected as the high conservation value area.', null, null, null,
     'respondido', 'revisao',
     'pendente', null);

  -- n94 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1f4ee8ba-950e-80e4-8073-f4ae68da60a2')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 94, 'pdd', 'Section 5.2.2 - Mitigation Measures',
     'PP shall clarify and demonstrate in PD how PP is stating that no activity results in negative impacts on biodiversity. What steps were taken to achieve such results, also in term of VCS NPRT was no natural risk identified in the zone.', null, null, null,
     'respondido', 'revisao',
     'pendente', null);

  -- n95 | pd_comment | pdd | PD comment
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, resposta_oficial_en,
     estado, andamento_apsis, estado_evidencia, evidencia_nota)
  values
    (md5('finding:vvb:1f4ee8ba-950e-807c-a939-dd46ba3c64bc')::uuid, v_rodada1, 'pd_comment',
     'PD comment', 95, 'pdd', 'Section 5.2.3 -  Net Positive Biodiversity Impacts',
     'PP needs to demonstrate all the points to demonstrate the positive biodiversity impacts due to the implementation of the project activities.', null, null, null,
     'respondido', 'revisao',
     'pendente', null);

end $$;

-- Conferencia. Falha alto se a carga sair diferente do medido na origem, em vez
-- de deixar um "ok" que esconde carga parcial.
do $$
declare
  n_total integer;
  n_r1 integer;
  n_r2 integer;
  n_sub integer;
begin
  select count(*) into n_total
    from public.carbon_findings f
    join public.carbon_auditoria_rodadas r on r.id = f.rodada_id
   where r.origem = 'vvb';

  select count(*) into n_r1
    from public.carbon_findings f
    join public.carbon_auditoria_rodadas r on r.id = f.rodada_id
   where r.origem = 'vvb' and r.numero = 1;

  select count(*) into n_r2
    from public.carbon_findings f
    join public.carbon_auditoria_rodadas r on r.id = f.rodada_id
   where r.origem = 'vvb' and r.numero = 2;

  select count(*) into n_sub
    from public.carbon_finding_subitens s
    join public.carbon_findings f on f.id = s.finding_id
    join public.carbon_auditoria_rodadas r on r.id = f.rodada_id
   where r.origem = 'vvb';

  raise notice 'findings VVB: % (rodada 1: %, rodada 2: %), subitens: %',
    n_total, n_r1, n_r2, n_sub;

  if n_total <> 92 then
    raise exception 'esperado 92 findings VVB, encontrado %', n_total;
  end if;
  if n_r2 <> 27 then
    raise exception 'esperado 27 findings na rodada 2, encontrado %', n_r2;
  end if;
  if n_sub <> 375 then
    raise exception 'esperado 375 subitens, encontrado %', n_sub;
  end if;
end $$;

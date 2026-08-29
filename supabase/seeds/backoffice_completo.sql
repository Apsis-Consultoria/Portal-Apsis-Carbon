-- =============================================================================
-- Apsis Carbon - backoffice: reunioes da operacao e a base BD - To Do
-- Arquivo: supabase/seeds/backoffice_completo.sql
-- Gerado por: scripts/gerar-seed-backoffice.mjs (nao edite a mao)
-- Fonte: docs/notion/dados/backoffice-reunioes-e-todo.json, lido ao vivo do Notion em 26/08/2026
-- =============================================================================
-- DUAS BASES, e a segunda nunca tinha sido aberta.
--
-- 1) REUNIOES APSIS CARBON: 98 linhas no Notion, 93 carregaveis. O banco tinha
--    89. Alem das que faltavam, os TITULOS estavam diferentes da origem: o banco
--    dizia "Weekly Apsis Carbon" e o Notion diz "Weekly", "Weekly (1)" e
--    "Weekly (2)". Os sufixos numerados sao artefato de duplicacao de pagina no
--    proprio Notion; ficam como estao, porque o pedido e fidelidade a origem e
--    nao a origem arrumada.
--
-- 2) BD - TO DO: 386 tarefas em 25 trabalhos distintos. E a carteira real
--    da operacao - inventarios de GEE, RAS, materialidade, diagnostico IFRS
--    S1/S2, EVTE, emissao no MDL - e ate hoje o banco tinha 8 atividades. O nome
--    do trabalho vai para `projeto_externo` (ver a migration
--    20260826190000), porque casar com carbon_consultorias exigiria decidir o
--    que e proposta e o que e entrega, e o mesmo cliente aparece em ate tres
--    contratos diferentes.
--
-- PULADAS: 5 reunioes (n 5, 87, 88, 89, 90) e 5 tarefas (n 165, 265, 305, 382, 389).
-- Sao linhas em branco no Notion. `data` e `titulo` da reuniao e `nome` da
-- atividade sao NOT NULL, e com razao: linha sem nome vira ruido na lista.
--
-- A REUNIAO "teste" NAO E APAGADA. Ela tem evento no Teams, e apagar a linha do
-- banco nao cancela o convite na agenda de quem foi convidado - deixaria um
-- evento orfao que ninguem mais alcanca pela tela. Por isso o delete exclui
-- quem tem teams_evento_id.
--
-- LGPD: dois titulos do Notion nomeiam a pessoa com quem a reuniao foi
-- ("Reuniao <nome> TI Koatinemo" e "Reuniao <nome> TI Sao Marcos"). O nome sai e
-- a Terra Indigena fica, que e a informacao que a tela usa. Mesma decisao da
-- carga anterior, mantida de proposito para as duas nao divergirem. A coluna
-- `Responsavel` do To Do nao foi extraida.
-- =============================================================================

do $$
declare
  v_projeto uuid;
begin
  select id into v_projeto from public.carbon_projetos where nome = 'Awaete REDD+' limit 1;
  if v_projeto is null then
    raise exception 'projeto "Awaete REDD+" nao encontrado';
  end if;

  -- Reunioes do backoffice, preservando as que tem evento no Teams.
  delete from public.carbon_reunioes
   where projeto_id is null and teams_evento_id is null;

  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:89fee8ba-950e-833d-8858-81508c803c6f')::uuid, 'semanal', 'Weekly', date '2026-06-29');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:38eee8ba-950e-80f6-8966-e4a03c3d51ae')::uuid, 'semanal', 'Weekly (1)', date '2026-06-22');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:380ee8ba-950e-8082-b1e8-e9c1a40f79b2')::uuid, 'semanal', 'Weekly', date '2026-06-15');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:49eee8ba-950e-83cb-a51d-0186d2365e5c')::uuid, 'semanal', 'Weekly', date '2026-06-08');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:379ee8ba-950e-8016-83e5-f6199355a0f8')::uuid, 'semanal', 'Weekly (1)', date '2026-06-01');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:372ee8ba-950e-8076-bfdc-fe1a3dc2583e')::uuid, 'semanal', 'Weekly (1)', date '2026-05-25');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:36bee8ba-950e-8038-9a12-f502b163d679')::uuid, 'semanal', 'Weekly', date '2026-05-18');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:364ee8ba-950e-80ea-ad42-dcc9b1c870f1')::uuid, 'semanal', 'Weekly (1)', date '2026-05-11');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:874ee8ba-950e-82cc-8c5b-01a26c4db01f')::uuid, 'semanal', 'Weekly', date '2026-05-04');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:01cee8ba-950e-826e-ac58-815119fe9754')::uuid, 'semanal', 'Weekly', date '2026-04-27');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:e8fee8ba-950e-83c8-8fc0-0154526b27fe')::uuid, 'semanal', 'Weekly', date '2026-04-20');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:348ee8ba-950e-8001-9cad-d2e2e043e2f4')::uuid, 'semanal', 'Weekly (1)', date '2026-04-13');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:463ee8ba-950e-829e-ad0c-01907a0149c0')::uuid, 'semanal', 'Weekly (1)', date '2026-04-06');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:887ee8ba-950e-83e9-b867-01c97feffdce')::uuid, 'semanal', 'Weekly', date '2026-04-06');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:a84ee8ba-950e-8217-997a-810fb6e5463a')::uuid, 'semanal', 'Weekly', date '2026-03-30');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:951ee8ba-950e-83a6-b293-01adccfcb0c8')::uuid, 'semanal', 'Weekly', date '2026-03-23');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:c5eee8ba-950e-83bb-87dd-01fc0bfb6b0b')::uuid, 'semanal', 'Weekly', date '2026-03-16');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:653ee8ba-950e-83aa-a073-810315a09d73')::uuid, 'semanal', 'Weekly', date '2026-03-09');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:754ee8ba-950e-8270-a0d8-0104feecfd97')::uuid, 'semanal', 'Weekly', date '2026-03-02');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:07aee8ba-950e-82d4-8cf4-0129f83f78ae')::uuid, 'semanal', 'Weekly', date '2026-02-23');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:0cfee8ba-950e-82dc-b6f7-81d96523a3ce')::uuid, 'semanal', 'Weekly (1)', date '2026-02-09');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:915ee8ba-950e-8205-844a-818effbab831')::uuid, 'semanal', 'Weekly (1)', date '2026-02-02');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:d9fee8ba-950e-8399-ae32-81b8f3118961')::uuid, 'semanal', 'Weekly', date '2026-01-26');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:a48ee8ba-950e-83f1-8b83-8151dd51a24b')::uuid, 'semanal', 'Weekly', date '2026-01-19');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:165ee8ba-950e-8329-ae93-8188bf048390')::uuid, 'semanal', 'Weekly (1)', date '2026-01-12');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:74aee8ba-950e-8221-84a3-81fe9e7002b8')::uuid, 'semanal', 'Weekly', date '2026-01-05');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:d82ee8ba-950e-83b3-868b-8157cf1ebda1')::uuid, 'semanal', 'Weekly (1)', date '2025-12-29');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:c6cee8ba-950e-830f-aaa1-01a27d9ece11')::uuid, 'semanal', 'Weekly (1)', date '2025-12-22');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:263ee8ba-950e-836f-a6b6-01d718d55379')::uuid, 'semanal', 'Weekly (1)', date '2025-12-15');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:4b2ee8ba-950e-82a0-986f-81db83b68988')::uuid, 'semanal', 'Weekly', date '2025-12-08');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:96dee8ba-950e-835e-bdd9-815c26e71997')::uuid, 'semanal', 'Weekly (1)', date '2025-12-01');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:9beee8ba-950e-823b-ab63-81350507a8e7')::uuid, 'semanal', 'Weekly', date '2025-11-24');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:524ee8ba-950e-834e-bfdc-0111ea79ebd6')::uuid, 'semanal', 'Weekly (2)', date '2025-11-17');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:12eee8ba-950e-82cf-86bb-01ea52648818')::uuid, 'semanal', 'Weekly', date '2025-11-10');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:743ee8ba-950e-83bc-95b2-81be6cc4970d')::uuid, 'semanal', 'Weekly', date '2025-11-03');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:093ee8ba-950e-83c5-ac47-0115f209cbbd')::uuid, 'semanal', 'Weekly', date '2025-10-27');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:3b3ee8ba-950e-83bb-95fb-01e9d462b72d')::uuid, 'semanal', 'Weekly', date '2025-10-20');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:72bee8ba-950e-8331-b16c-0142e960ef76')::uuid, 'semanal', 'Weekly (1)', date '2025-10-13');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:9aeee8ba-950e-83a4-b16e-0146ff275c74')::uuid, 'semanal', 'Weekly (1)', date '2025-10-06');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:efeee8ba-950e-820f-8d8c-81e5c0792c4c')::uuid, 'semanal', 'Weekly (1)', date '2025-09-29');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:e40ee8ba-950e-83ed-9224-0194f768af12')::uuid, 'semanal', 'Weekly', date '2025-09-22');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:062ee8ba-950e-8335-ab9b-81ef54158476')::uuid, 'semanal', 'Weekly', date '2025-09-15');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:1d4ee8ba-950e-82b6-b319-014b1c7aacb5')::uuid, 'semanal', 'Weekly (1)', date '2025-09-08');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:995ee8ba-950e-8264-bfc7-81c61ff85ae0')::uuid, 'semanal', 'Weekly (1)', date '2025-09-01');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:0b6ee8ba-950e-82e9-b003-018b414f1de3')::uuid, 'semanal', 'Weekly (1)', date '2025-08-25');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:9beee8ba-950e-82c0-842a-81bac98a1f80')::uuid, 'semanal', 'Weekly', date '2025-08-18');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:656ee8ba-950e-8212-968d-01df663c4654')::uuid, 'semanal', 'Weekly', date '2025-08-11');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:753ee8ba-950e-823b-b10f-81d92ac3b986')::uuid, 'semanal', 'Weekly', date '2025-08-04');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:444ee8ba-950e-83db-9661-814df9888b29')::uuid, 'semanal', 'Weekly', date '2025-07-28');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:319ee8ba-950e-83b2-908f-01bcd93fa4fe')::uuid, 'semanal', 'Weekly', date '2025-07-21');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:1a4ee8ba-950e-8375-8906-019911cca1c5')::uuid, 'semanal', 'Weekly', date '2025-07-14');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:966ee8ba-950e-824b-a2c1-8167354e98aa')::uuid, 'semanal', 'Weekly', date '2025-07-08');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:aedee8ba-950e-8398-8565-010399d8a918')::uuid, 'semanal', 'Weekly', date '2025-07-08');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:497ee8ba-950e-8238-be8f-01d52d9cd4bb')::uuid, 'semanal', 'Weekly', date '2025-06-23');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:5b3ee8ba-950e-838c-91ef-819bf864872a')::uuid, 'semanal', 'Weekly', date '2025-06-16');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:896ee8ba-950e-825a-b730-818c334962e4')::uuid, 'semanal', 'Weekly', date '2025-06-09');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:26dee8ba-950e-833f-a715-81675ce192b7')::uuid, 'semanal', 'Weekly', date '2025-06-02');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:2d7ee8ba-950e-8226-8cad-81b807a261aa')::uuid, 'semanal', 'Weekly', date '2025-06-02');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:c0aee8ba-950e-820a-afe9-81cedfbcc6e9')::uuid, 'semanal', 'Weekly', date '2025-06-02');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:ff0ee8ba-950e-83bc-a91d-8144c9b4a2f0')::uuid, 'semanal', 'Weekly', date '2025-05-26');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:be7ee8ba-950e-83b1-a4ba-01baef178f7f')::uuid, 'semanal', 'Weekly', date '2025-05-19');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:af6ee8ba-950e-82fc-8feb-0183e2e5fac3')::uuid, 'tematica', 'Reunião Fortech', date '2025-05-16');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:776ee8ba-950e-829e-ba51-81f007b9c871')::uuid, 'semanal', 'Weekly', date '2025-05-12');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:a73ee8ba-950e-82fe-8c77-81190debda6a')::uuid, 'tematica', 'Reunião Iquantic', date '2025-05-07');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:387ee8ba-950e-820d-bed6-81965561d5d7')::uuid, 'tematica', 'Reunião TI Koatinemo', date '2025-05-02');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:3bfee8ba-950e-83d1-a271-0159a0b5e799')::uuid, 'tematica', 'Reunião Bee2Be', date '2025-05-02');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:36cee8ba-950e-8267-82cf-81aee89e9039')::uuid, 'tematica', 'Reunião DINC', date '2025-04-30');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:d84ee8ba-950e-826d-9092-8124a03e4f0f')::uuid, 'semanal', 'Weekly', date '2025-04-28');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:96dee8ba-950e-8255-8a36-015f2529995a')::uuid, 'semanal', 'Weekly', date '2025-04-07');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:04bee8ba-950e-82d1-af56-81088b5629cb')::uuid, 'semanal', 'Weekly', date '2025-03-31');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:3b3ee8ba-950e-83ad-aedf-819b17c72374')::uuid, 'tematica', 'Reunião TI São Marcos e Pimentel Barbosa', date '2025-03-28');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:89aee8ba-950e-82d5-a142-013fab6fb8f5')::uuid, 'semanal', 'Weekly', date '2025-03-24');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:3abee8ba-950e-8309-afa0-81f4d83fa362')::uuid, 'semanal', 'Weekly', date '2025-03-17');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:6f3ee8ba-950e-83ed-99bc-01566ade1038')::uuid, 'semanal', 'Weekly', date '2025-03-06');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:012ee8ba-950e-8221-ab39-0141658ec0c3')::uuid, 'semanal', 'Weekly', date '2025-02-24');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:962ee8ba-950e-8367-b1e2-01f4e9020c63')::uuid, 'semanal', 'Weekly', date '2025-02-17');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:ec7ee8ba-950e-8263-8b7b-0197fb475df0')::uuid, 'tematica', 'Reunião TI São Marcos', date '2025-02-14');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:be2ee8ba-950e-82ea-8525-81e94ae6c956')::uuid, 'semanal', 'Weekly', date '2025-02-10');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:61aee8ba-950e-83cc-86b6-81ce5cdc1489')::uuid, 'semanal', 'Weekly', date '2025-02-03');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:ad6ee8ba-950e-8254-bc06-01d7a102346b')::uuid, 'semanal', 'Weekly', date '2025-01-27');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:16eee8ba-950e-8332-b532-8152a150205f')::uuid, 'semanal', 'Weekly', date '2025-01-21');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:8c7ee8ba-950e-8330-a0a4-819bf4215024')::uuid, 'semanal', 'Weekly', date '2025-01-13');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:9dcee8ba-950e-8246-bf58-012c5361e228')::uuid, 'tematica', 'MSCI onboarding', date '2025-01-09');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:cdaee8ba-950e-83ee-9f68-016e0da49005')::uuid, 'semanal', 'Weekly', date '2025-01-06');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:a88ee8ba-950e-8239-b21e-81b28db4d38b')::uuid, 'semanal', 'Reunião Semanal Comercial', date '2025-01-06');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:9b4ee8ba-950e-82b4-8295-01e5654f0627')::uuid, 'semanal', 'Weekly (1)', date '2026-08-24');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:695ee8ba-950e-8260-8715-01a3dd5f1ec1')::uuid, 'semanal', 'Weekly', date '2026-08-17');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:8c0ee8ba-950e-82ee-8a9e-01e19b0f3f4e')::uuid, 'semanal', 'Weekly', date '2026-08-10');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:979ee8ba-950e-8322-9dda-8133d62ac406')::uuid, 'semanal', 'Weekly', date '2026-08-03');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:4f3ee8ba-950e-837d-b8f9-811a905d539e')::uuid, 'semanal', 'Weekly', date '2026-07-27');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:528ee8ba-950e-828b-aa97-01f5bb8ec5a1')::uuid, 'semanal', 'Weekly', date '2026-07-20');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:cbcee8ba-950e-8369-b18f-81c78ffe3fb6')::uuid, 'semanal', 'Weekly', date '2026-07-13');
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:backoffice:77fee8ba-950e-834d-aff8-01e1bddcd0b3')::uuid, 'semanal', 'Weekly', date '2026-07-06');

  -- ===== BD - To Do =========================================================
  -- Substitui a carga anterior de atividades, que tinha 8 linhas vindas de uma
  -- leitura parcial de outra base.
  delete from public.carbon_atividades;

  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:e1aee8ba-950e-835f-805d-01522c3cb9e7')::uuid, null,
          'Estratégia de Descarbonização [CTA]: Mary repassar relatório para Caio.', null, 'concluida', 'consultoria',
          'Estratégia de Descarbonização [CTA]', date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:cc9ee8ba-950e-82d3-bc02-0177ee35ee37')::uuid, null,
          'J6 Energia: Gabriel gerar lista de etapas e órgãos de emissão no MDL.', null, 'concluida', 'backoffice',
          null, date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:799ee8ba-950e-8385-8d3c-811e6f43961d')::uuid, null,
          'Viabilidade de nova áreas privadas', null, 'concluida', 'backoffice',
          null, date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:820ee8ba-950e-839c-a6fd-01796f62ab96')::uuid, null,
          'Revisar desmatamento Martelli', null, 'concluida', 'backoffice',
          null, date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:64eee8ba-950e-827d-a99b-8149f6ef4b4d')::uuid, null,
          'Cobrar envio dos dados abertos por fazenda(Edson)', null, 'concluida', 'backoffice',
          null, date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:302ee8ba-950e-83ab-89fd-81bd62e0a0f9')::uuid, null,
          'Mary cobrar envio dos relatórios do INDEVA.', null, 'concluida', 'backoffice',
          null, date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:58fee8ba-950e-8243-a0b6-0121301359ad')::uuid, null,
          'Carol cobrar LP para revisão do PDD.', null, 'concluida', 'backoffice',
          null, date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f6eee8ba-950e-83e5-9c50-81fb2ee3b3c7')::uuid, null,
          'Mary solicitar contrato social da Apsis Carbon.', null, 'concluida', 'backoffice',
          null, date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:6e1ee8ba-950e-8307-a4aa-819c18edc141')::uuid, null,
          'Assessoria GEE [Tecverde]: Incluir Caio na próxima reunião de fontes como ouvinte.', null, 'concluida', 'backoffice',
          null, date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d98ee8ba-950e-8377-a2d3-01bbc414b3b2')::uuid, null,
          'Preparar o Kickoff CTA (como validação e levantamento de fontes)', null, 'concluida', 'backoffice',
          null, date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3f3ee8ba-950e-8385-a31f-011c1abdb5ce')::uuid, null,
          'Contato com a Sustain para ferramenta de inventário', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:0e5ee8ba-950e-83a3-8af0-018feefdd5f6')::uuid, null,
          'Verificar empresas que soluções que possam substituir a Nova Terra', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:227ee8ba-950e-8230-bae2-81173a9ab1f5')::uuid, null,
          'Carol fazer especificação para substituição da Nova Terra', null, 'concluida', 'backoffice',
          null, date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:db7ee8ba-950e-838a-81e7-817d2de4a682')::uuid, null,
          'Marcar reunião com LP para falar sobre PD', null, 'concluida', 'backoffice',
          null, date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:aeaee8ba-950e-823e-a301-811c8a23971b')::uuid, null,
          'Remarcar Reunião com Jamel', null, 'concluida', 'backoffice',
          null, date '2025-02-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:101ee8ba-950e-831d-b9ab-01b40da63634')::uuid, null,
          'Inventário GEE [IPEL]: Estudar norma técnica GHG sobre transmissão de energia. Estudar Autogeração', null, 'concluida', 'backoffice',
          null, date '2025-02-10');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:733ee8ba-950e-831b-af22-81d373732f3d')::uuid, null,
          'Inventário GEE [Vinci]: FUP sobre declínio da proposta.', null, 'concluida', 'backoffice',
          null, date '2025-02-10');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:7a5ee8ba-950e-82a7-bb95-01d2dcbca507')::uuid, null,
          'EVTE - [Fazenda União]: FUP sobre proposta', null, 'concluida', 'backoffice',
          null, date '2025-02-10');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:38dee8ba-950e-83ce-b0c0-814a985d80b5')::uuid, null,
          'Alterar CNPJ da proposta Salinor no SAN', null, 'concluida', 'backoffice',
          null, date '2025-02-10');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:affee8ba-950e-8244-b041-8165a08a54b9')::uuid, null,
          'AP 00048/24 - Inventário GEE [IPEL]: Cobrar envio de dados IPEL.', null, 'concluida', 'backoffice',
          null, date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:5a9ee8ba-950e-8312-a0da-81a46738bfe2')::uuid, null,
          'Assessoria GEE [Tecverde]: Verificar dúvidas com Juliana.', null, 'concluida', 'backoffice',
          null, date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:83bee8ba-950e-83ed-8064-01133509bec8')::uuid, null,
          'Verificar mudanças na planilha GHG protocol', null, 'concluida', 'backoffice',
          null, date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:409ee8ba-950e-830b-bd20-012a99b72e0f')::uuid, null,
          'Estratégia de Descarbonização [CTA]: Enviar lista de dados das fontes', null, 'concluida', 'backoffice',
          null, date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d2aee8ba-950e-83a3-b5e4-81ebd3e238af')::uuid, null,
          'Estratégia de Descarbonização [CTA]: Preencher formulário da SGS e Totum.', null, 'concluida', 'backoffice',
          null, date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:fafee8ba-950e-82ef-b5d4-014ce2746a3c')::uuid, null,
          'Estratégia de Descarbonização [CTA]: Solicitar formulário Totum, BSI ou ABNT.', null, 'concluida', 'backoffice',
          null, date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:179ee8ba-950e-828b-937c-813d0777f663')::uuid, null,
          'RAS [CTA]: Fechar contrato com Impactato.', null, 'concluida', 'backoffice',
          null, date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f2dee8ba-950e-83cd-b99b-817333709654')::uuid, null,
          'RAS [CTA]: Contratos com parceiros: Designer gráfico', null, 'concluida', 'backoffice',
          null, date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:365ee8ba-950e-821f-aa5e-0183c954886b')::uuid, null,
          'J6 Energia: Entender estágio da AND.', null, 'concluida', 'backoffice',
          null, date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:345ee8ba-950e-82e2-84fe-8146d225ff5a')::uuid, null,
          'J6 Energia: Verificar outros PD’s sobre a metodologia para ter inspiração.', null, 'concluida', 'backoffice',
          null, date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:2e2ee8ba-950e-8344-b64a-01fd7ea7224d')::uuid, null,
          'J6 Energia: Elaborar KickOff para reunião Kick-off 20/02', null, 'concluida', 'backoffice',
          null, date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:9efee8ba-950e-8216-9d12-81baa10a3ae2')::uuid, null,
          'J6 Energia: Montar passo a passo do processo e os stakeholders envolvidos para reunião Kick-off', null, 'concluida', 'backoffice',
          null, date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:16dee8ba-950e-8208-8121-81c6336a63a9')::uuid, null,
          'Histórico de preços para projetos de energia - Passar dados para AC', null, 'concluida', 'consultoria',
          'Avaliação de valor justo para crédito de carbono [Ambipar]', date '2025-08-25');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:892ee8ba-950e-830a-879f-01bcb301bad9')::uuid, null,
          'Pesquisar certificações de sustentabilidade e construção verde de construção civil aplicáveis. Foco em vender como produto sustentável e como o setor trata o tema. (Certificação LED)', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', date '2025-08-25');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d7fee8ba-950e-836f-a26d-81a65cd3e508')::uuid, null,
          'Verificar se está na proposta o apoio na mudança do nome', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-08-25');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:7c9ee8ba-950e-8286-b6d2-0156db98c6cc')::uuid, null,
          'Backup de nova pasta do Yuri', null, 'concluida', 'consultoria',
          'RAS[CTA]', date '2025-08-25');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:4e0ee8ba-950e-8320-a9f7-012b4ae27d9e')::uuid, null,
          'Verificar relatório editorado novamente - Gráficos', null, 'concluida', 'consultoria',
          'EVTE - [Fazenda União]', date '2025-08-13');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:6ebee8ba-950e-8207-b43d-81b806715e12')::uuid, null,
          'Entender atualizações após reunião interna com Marcelo. Situação dos medidores e enviar propostas para Marcelo.', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-08-11');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:1f7ee8ba-950e-8269-89f8-810f2d8fdbbe')::uuid, null,
          'Revisão do RAS', null, 'concluida', 'consultoria',
          'RAS[CTA]', date '2025-08-11');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:b27ee8ba-950e-83e2-8c60-81192a0e6015')::uuid, null,
          'Verificar com Paulo (J6) sobre a calibração antes de 2015. Caso negativo, aplicar fator redutor nos créditos gerados.', 'i. Apresentação propostas dos VVBs e tirar dúvidas sobre a calibração e operação. ii. Site visit: melhor ocorrer fora do período de chuva.', 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-09-04');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a86ee8ba-950e-83ec-bb9e-81d38c81c9bd')::uuid, null,
          'Verificar uso de Sprint para estruturação das base de dados de atividades', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2025-07-14');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:247ee8ba-950e-82fb-ac31-813eecd9200a')::uuid, null,
          'Verificar se há substitutas da Climada no Brasil', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2025-05-26');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:229ee8ba-950e-83ff-90ff-016059b1ab43')::uuid, v_projeto,
          'Confeccionar planilha de orçamento em tempo real com as atividades feitas', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-04-28');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:45eee8ba-950e-839d-8f9c-81489c8edae9')::uuid, v_projeto,
          'Iniciar organização das evidências do MR atual', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-04-28');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:17cee8ba-950e-83f5-ae67-01d2c02c77d0')::uuid, null,
          'Desenvolver levantamento de fontes como banco de dados no Notion', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2025-03-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:626ee8ba-950e-82cc-9159-81c644067972')::uuid, null,
          'Glossário - Mercado Livre de energia. Incluir infos na diretriz técnica.', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:474ee8ba-950e-8327-8898-01cb3e2293a1')::uuid, v_projeto,
          'Monitoramento: Finalizar controle das atividades desde 2º Semestre 2024.', null, 'em_andamento', 'jpf',
          'JPF - Parakanã', date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:2edee8ba-950e-836f-9b97-019fb274fe0f')::uuid, null,
          'Montar Shapefiles - Everland - TI Trincheira Bacajá, TI Parakanã, TI Pimentel Barbosa, Parque Xingu', null, 'concluida', 'novos_negocios',
          'Novos Negócios', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:680ee8ba-950e-83ad-a711-81ad34f61850')::uuid, null,
          'Atualizar cronograma das reuniões', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d62ee8ba-950e-8260-bb0d-019e9ce57082')::uuid, null,
          'Fazer backup no servidor uma vez por semana', null, 'em_andamento', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:7bfee8ba-950e-8266-bf42-814a9c90ea90')::uuid, v_projeto,
          'Separar valor por pessoa no Monitoring Plan - Parakanã', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-10-06');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:453ee8ba-950e-836c-9b17-015cffcb25f3')::uuid, null,
          'Listar documentos e indicadores pendentes', null, 'concluida', 'consultoria',
          'Relatório de impacto socioambiental [ BRLig]', date '2025-10-06');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f43ee8ba-950e-820b-8cdf-011187c4ac3e')::uuid, null,
          'Definição de cronograma dos texto', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-10-06');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:2e9ee8ba-950e-826b-98da-81fe549ec8c1')::uuid, v_projeto,
          'Revisar PDD e MR quanto à tradução completa', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-09-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:99fee8ba-950e-83a5-af51-01d6f2304d17')::uuid, null,
          'Verificar metodologia para Tecverde da Isometric', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2025-09-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:6b5ee8ba-950e-838f-9aa2-81fee70bbf5c')::uuid, null,
          'Iniciar capítulo sobre comparação com o PDD', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-09-15');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:fc3ee8ba-950e-8298-8420-016fd5851ffd')::uuid, null,
          'Alteração dos nomes dos capítulos', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-09-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:9f1ee8ba-950e-82a2-b828-01b4620e31f6')::uuid, null,
          'Envio de opções de novo slogan (Larissa Areas)', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-09-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a55ee8ba-950e-8269-ba2f-81589c85fd92')::uuid, null,
          'Apresentação oportunidades', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2025-10-13');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:710ee8ba-950e-8376-9d63-8166370d6eb4')::uuid, null,
          'Revisar gráficos e legendas.', null, 'concluida', 'consultoria',
          'EVTE - [Fazenda União]', date '2025-08-25');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a6fee8ba-950e-829d-86d3-0101ea803633')::uuid, null,
          'Informar Leonardo sobre ausência de resposta pela GBF', null, 'concluida', 'consultoria',
          'EVTE - [Fazenda União]', date '2025-10-27');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:baaee8ba-950e-8251-9f40-814f4381972e')::uuid, null,
          'Enviar para Leonardo versão final MOU', null, 'concluida', 'consultoria',
          'EVTE - [Fazenda União]', date '2025-09-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:0ccee8ba-950e-8300-b82d-018f9100453a')::uuid, null,
          'Revisão do MOU', null, 'concluida', 'consultoria',
          'EVTE - [Fazenda União]', date '2025-09-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d59ee8ba-950e-8251-a862-81d532e2933d')::uuid, null,
          'Ajuste interno da proposta', null, 'concluida', 'consultoria',
          'EVTE - [Fazenda União]', date '2025-09-01');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:348ee8ba-950e-8324-854c-01858e7838a3')::uuid, null,
          'Revisar relatório final', null, 'concluida', 'consultoria',
          'EVTE - [Fazenda União]', date '2025-07-28');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:898ee8ba-950e-8346-a69c-81eb4b95656d')::uuid, null,
          'Enviar relatório revisado para editoração', null, 'concluida', 'consultoria',
          'EVTE - [Fazenda União]', date '2025-07-28');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:385ee8ba-950e-82bc-a7ae-01ef1feb9000')::uuid, null,
          'Cobrar minuta do contrato com Leonardo', null, 'concluida', 'consultoria',
          'EVTE - [Fazenda União]', date '2025-07-21');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:4daee8ba-950e-82af-81af-016c73c65a8e')::uuid, null,
          'Contar história do Mapa Antigo x Mapa novo Verra - Incluir valores financeiros', null, 'concluida', 'consultoria',
          'EVTE - [Fazenda União]', date '2025-07-14');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a66ee8ba-950e-835d-b57f-012e2b3f964b')::uuid, null,
          'Atualizar apresentação pós análise de Cp,post. Sem APD.', null, 'concluida', 'consultoria',
          'EVTE - [Fazenda União]', date '2025-07-14');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:8b4ee8ba-950e-83f3-b01b-81c6cba09756')::uuid, null,
          'Custos de terceiros', null, 'concluida', 'consultoria',
          'EVTE - [Fazenda União]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:7faee8ba-950e-8303-87ba-81c4527eb7fb')::uuid, null,
          'Cobrar Leonardo sobre envio do MOU', null, 'concluida', 'consultoria',
          'EVTE - [Fazenda União]', date '2025-05-12');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:71eee8ba-950e-82aa-a7d0-811d229db5b1')::uuid, null,
          'Avaliar pendências para envio do EVTE.', null, 'concluida', 'consultoria',
          'EVTE - [Fazenda União]', date '2026-01-12');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3e3ee8ba-950e-839b-be27-01c21e32beaa')::uuid, null,
          'Monitoramento: Apresentar prestação de contas para MV', null, 'concluida', 'backoffice',
          null, date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:19eee8ba-950e-8353-bf07-011058aea06e')::uuid, null,
          'MR: Marcar reunião com Jamel', null, 'concluida', 'backoffice',
          null, date '2025-02-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:c66ee8ba-950e-82a6-a2de-8188b364954b')::uuid, null,
          'Email de cobrança informacional - IPEL', null, 'concluida', 'backoffice',
          null, date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:9f0ee8ba-950e-82db-891f-0168d8085b11')::uuid, null,
          'Inventário TecVerde: Lembrete no dia 27/05 para envio dos dados', null, 'concluida', 'backoffice',
          null, date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d41ee8ba-950e-8250-a63c-81034a8c009a')::uuid, null,
          'Definição de funções - Relatório Apsis', null, 'concluida', 'backoffice',
          null, date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:17cee8ba-950e-8294-8462-81fa97ca204d')::uuid, null,
          'Inventário CTA: marcar reunião para validação de fontes', null, 'concluida', 'backoffice',
          null, date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:87fee8ba-950e-83b8-9405-81f4642bc2f7')::uuid, null,
          'Inventário CTA: Enviar os prazos do RPE para CTA', null, 'concluida', 'backoffice',
          null, date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:bd5ee8ba-950e-8250-84cb-010539d1a342')::uuid, null,
          'Marcar auditoria. 5 a 9/05 (ideal); 12 a 16/05 (apertado)', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a78ee8ba-950e-8225-b6a1-01b875f7affc')::uuid, null,
          'RAS CTA: Fazer esqueleto da reunião de kickoff para validar com Impactato (reunião 25/02)', null, 'concluida', 'backoffice',
          null, date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a8aee8ba-950e-822d-a234-816d28db1f82')::uuid, null,
          'RAS CTA: preparar Kickoff final (27/02) com insigths Impactato', null, 'concluida', 'backoffice',
          null, date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:ccdee8ba-950e-8237-9f25-0132271e7d3f')::uuid, null,
          'J6 Energia: Estabelecer contato com UNFCCC e MCTi', 'Geisa repassou contato da UNFCCC no Brasil.', 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:5a0ee8ba-950e-8237-90f8-01aadf4bc973')::uuid, null,
          'J6 Energia: Exemplos de MR e PD de Energia', null, 'concluida', 'backoffice',
          null, date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:8d2ee8ba-950e-8333-8cd1-81bc1ce8d0eb')::uuid, null,
          'J6 Energia: levantar VVB para emissão dos créditos UNFCCC', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:634ee8ba-950e-8258-8db7-0164a6520d0a')::uuid, null,
          'Consultoria ESG [Plascar]: Fazer último FUP', null, 'nao_iniciada', 'consultoria',
          'Consultoria ESG[Plascar]', date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:764ee8ba-950e-8339-a80a-8198da1503d5')::uuid, null,
          'Comercial: Estruturar linha de ataque comercial para TJ', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:9adee8ba-950e-83e0-812d-81e82e164c88')::uuid, null,
          'Comercial: Verificar se Comercial Apsis pode ajudar na prospecção de TJs', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2025-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:cf0ee8ba-950e-827d-a761-81c0c7584dee')::uuid, null,
          'IPEL: Mary enviar email com pendências', null, 'concluida', 'backoffice',
          null, date '2025-03-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:991ee8ba-950e-83da-94a8-816abc79aae5')::uuid, null,
          'CTA: processar dados do escopo 3 por produtor', null, 'concluida', 'backoffice',
          null, date '2025-03-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:e93ee8ba-950e-8286-9d16-81196146e9ba')::uuid, null,
          'CTA: MV enviar nome-email do contato na ABNT.', null, 'concluida', 'backoffice',
          null, date '2025-03-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:859ee8ba-950e-83b7-b14a-813da95eaace')::uuid, null,
          'J6: Listar documentos recebidos', null, 'concluida', 'backoffice',
          null, date '2025-03-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:fbdee8ba-950e-8355-ad72-81a36e73274a')::uuid, null,
          'Assessoria GEE Tecverde: Caio cobrar resposta Juliana sobre relatório preliminar', null, 'concluida', 'consultoria',
          'Assessoria GEE[TecVerde]', date '2025-03-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:af7ee8ba-950e-8373-b871-016f803def48')::uuid, null,
          'MV enviar email sobre atraso para Felipe', null, 'concluida', 'consultoria',
          'Inventário GEE[TecVerde]', date '2025-03-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:9a7ee8ba-950e-823f-b860-01a148b129fc')::uuid, null,
          'CTA: Enviar exemplo de auditoria de verificação com valores praticados.', null, 'concluida', 'backoffice',
          null, date '2025-03-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:c95ee8ba-950e-832a-8bb2-81249cb4dc69')::uuid, null,
          'CTA: consultar com verificadores as ordem de grandeza dos valores e checar se enviaram as propostas', null, 'concluida', 'backoffice',
          null, date '2025-03-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:bf5ee8ba-950e-8367-849d-01018bdaa1ab')::uuid, null,
          'CTA: Revisar cálculos para escopo 3 da CTA', null, 'concluida', 'backoffice',
          null, date '2025-03-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:ab6ee8ba-950e-826c-b9c9-81c51de9170c')::uuid, null,
          'RAS CTA - Solicitar transcrições para Rafaela', null, 'concluida', 'consultoria',
          'RAS[CTA]', date '2025-03-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:7a1ee8ba-950e-824a-8f30-8107522542ad')::uuid, null,
          'J6 Energia: DRAFT MR apresentação 25/03', null, 'concluida', 'backoffice',
          null, date '2025-03-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:019ee8ba-950e-8362-a195-8132f2870cc0')::uuid, null,
          'TJRR e TJXX - MV desenvolver orçamento', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2025-03-17');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:fa0ee8ba-950e-83d7-a3f5-01e5e76aec37')::uuid, v_projeto,
          'MR PKN: Confirmar prazo com Jamel sobre resultado final.', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-03-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:7e5ee8ba-950e-833c-804e-81caf0518910')::uuid, null,
          'Site Visit: Verificar necessidade de visto para Tript', null, 'concluida', 'backoffice',
          null, date '2025-03-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:ac6ee8ba-950e-83ea-bbee-01851e0f4bef')::uuid, null,
          'Site visit: verificar pendências de Viagem com tripti. Montar Checklist.', null, 'concluida', 'backoffice',
          null, date '2025-03-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:4d2ee8ba-950e-83ac-8feb-01cefe671fa0')::uuid, null,
          'MR PKN: Preencher NPR no ProjectHub', null, 'concluida', 'backoffice',
          null, date '2025-03-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:eeaee8ba-950e-8377-9ba3-810cdba4da65')::uuid, null,
          'Parakanã: Atualizar controle financeiro da antecipação', null, 'concluida', 'backoffice',
          null, date '2025-03-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:7b8ee8ba-950e-835c-9329-816f704480e2')::uuid, null,
          'IPEL: FUP na terça 01/04 sobre eventuais pendências.', null, 'concluida', 'consultoria',
          'Inventário GEE[IPEL]', date '2025-03-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a41ee8ba-950e-828e-b277-0144901f085b')::uuid, null,
          'Enviar para editoração', null, 'concluida', 'consultoria',
          'Inventário GEE[TecVerde]', date '2025-03-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:1b6ee8ba-950e-82b2-9855-0194438a2441')::uuid, null,
          'E-mail para LP explicando nova assinatura.', null, 'concluida', 'consultoria',
          'Inventário GEE[TecVerde]', date '2025-03-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a84ee8ba-950e-8286-b40d-01a87ce518d9')::uuid, null,
          'Inventário Apsis: Checklist dos dados o inventário e planilhamento.', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', date '2025-03-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:68aee8ba-950e-832e-8140-812eb3fb3c50')::uuid, null,
          'Inventário CTA: Definir próximas reuniões com equipes/áreas com as quais ainda não nos reunimos.', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-03-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:214ee8ba-950e-821d-bd3d-01f8f543e871')::uuid, null,
          'RAS CTA: CA solicitar transcrições à Rafaela', null, 'concluida', 'backoffice',
          null, date '2025-03-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:c27ee8ba-950e-8210-a624-8115cf6e91c8')::uuid, null,
          'Ler propostas de descarbonização e revisão de materialidade da CTA.', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2026-02-23');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d71ee8ba-950e-82e8-8c46-81f38303783c')::uuid, null,
          'Infomar planilha GHG finalizada e cobrar dados faltantes', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', date '2026-03-09');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f27ee8ba-950e-821e-8b96-81f08c2462b9')::uuid, null,
          'Analisar - GHG land sector de fórma rápida.', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2026-02-23');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:19aee8ba-950e-82a1-9a74-010e79dbaae4')::uuid, null,
          'Solicitar pra lívia estender o prazo do fomulário e cobrar preenchimento', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:371ee8ba-950e-8375-a715-018f2760d8f1')::uuid, null,
          'solicitar fotos e verificar informações pendentes.', null, 'concluida', 'consultoria',
          'Diagnóstico IFRS S1 e S2 [Aço Verde Brasil]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:55bee8ba-950e-82d4-96c4-8113f250b192')::uuid, null,
          'Email para emanuele solicitando documentos pendentes identificados na visita:', null, 'concluida', 'consultoria',
          'Diagnóstico IFRS S1 e S2 [Aço Verde Brasil]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:154ee8ba-950e-83b0-8106-019b43eb2af7')::uuid, null,
          'Revisar relatório completo', null, 'concluida', 'consultoria',
          'Relatório de impacto socioambiental [ BRLig]', date '2026-02-23');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:5bcee8ba-950e-8289-800c-815645dac6f0')::uuid, null,
          'verificar pagamento de parcela do projeto e autorizar continuidade do projeto', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', date '2026-02-09');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:374ee8ba-950e-825a-9138-01afc8e7a076')::uuid, null,
          'revisão das páginas de créditos enviadas pela aquapolo', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:82dee8ba-950e-8397-b83b-81b739d84d0c')::uuid, null,
          'Questionar Marcelo se reserva de passagem e hospedagem e data com concessionária antes da consulta pública', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2026-02-09');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:cc7ee8ba-950e-82c2-a598-01732cb5b7e7')::uuid, v_projeto,
          'Imagens dos pontos de riscos - Parakanã', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2026-02-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:dceee8ba-950e-8260-a8e3-816255f4ea92')::uuid, null,
          'Benchmark da Dexxos - Concorrentes (tubos OeG) - Melhores práticas (antes do warm up)', null, 'concluida', 'consultoria',
          'Diagnóstico S1&S2 [DEXXOS]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:699ee8ba-950e-83a6-ab7a-0155925bc41e')::uuid, null,
          'lista de projetos de sustentabilidade em curso', null, 'concluida', 'consultoria',
          'Diagnóstico IFRS S1 e S2 [Aço Verde Brasil]', date '2026-02-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:1ddee8ba-950e-8369-a71f-01bd75c00d03')::uuid, null,
          'Verificar depreciação no Balanço societário (notas explicativas)', null, 'concluida', 'consultoria',
          'Relatório de impacto socioambiental [ BRLig]', date '2026-02-09');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f34ee8ba-950e-8322-82fe-018d7c9a199b')::uuid, null,
          'Email com substituição das fotos. Informar exclusão do gráfico de energia.', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2026-02-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:1d1ee8ba-950e-82dd-8c24-81b5e549154e')::uuid, null,
          'GS: verificar com Ivan possibilidades para J6.', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2026-02-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:93aee8ba-950e-83b7-ba1d-81da93f46600')::uuid, null,
          'GS: verificar pendencias da J6. E encaminhar para J6. Amanhã.', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2026-02-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:548ee8ba-950e-8325-9e02-01fdcb3b2d4f')::uuid, null,
          'Verificar com Marcelo necessidade de quantos carros.', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2026-02-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d0aee8ba-950e-8394-a73b-015f2c5b2aad')::uuid, null,
          'Passar áreas da Mombak para MV', null, 'concluida', 'novos_negocios',
          'Novos Negócios', date '2026-01-26');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:cabee8ba-950e-8258-8f9e-012fa897c326')::uuid, v_projeto,
          'Cobrar nova proposta da SCCOM', null, 'concluida', 'jpf',
          'JPF - Parakanã', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:984ee8ba-950e-825c-a2d4-01589c316bb0')::uuid, null,
          'Montar cronograma e warmup', null, 'concluida', 'consultoria',
          'Diagnóstico S1&S2 [DEXXOS]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a9fee8ba-950e-82f1-a806-8120afc88b0a')::uuid, null,
          'Verificar co outras equipes (CC e CE) ser manterão as mesmas equipes', null, 'concluida', 'consultoria',
          'Diagnóstico S1&S2 [DEXXOS]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:8a9ee8ba-950e-8209-8426-0184745a817d')::uuid, null,
          'Visita à planta', null, 'concluida', 'consultoria',
          'Diagnóstico IFRS S1 e S2 [Aço Verde Brasil]', date '2026-02-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f04ee8ba-950e-82d4-a96d-017d7053db41')::uuid, null,
          'Verificar regras do RCE', null, 'concluida', 'consultoria',
          'Relatório de impacto socioambiental [ BRLig]', date '2026-02-09');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:dc7ee8ba-950e-821e-a230-019d1f005dc4')::uuid, null,
          'etificar infos do email sobre custos da estratégia de descarbonização + SBTI Academy.', 'Estimativa: quarta feira.', 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2026-02-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f3bee8ba-950e-83b1-b506-015221858517')::uuid, null,
          'Plano de trabalho para seguir com inventário : GS e MV', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2026-01-26');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:9ecee8ba-950e-8283-a512-817d740b6ae4')::uuid, null,
          'Apresentação sobre biochar para CTA, voltado para o talo do tabado, etc', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:53dee8ba-950e-827c-a847-01ebd90b81b9')::uuid, null,
          'Avaliar áreas de CAR enviadas por FGM', null, 'concluida', 'novos_negocios',
          'Novos Negócios', date '2026-01-12');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:2e2ee8ba-950e-8319-b544-81155461c1db')::uuid, v_projeto,
          'Analisar se é necessário registro completo antes de prosseguir verificação do 2 MR.', null, 'concluida', 'jpf',
          'JPF - Parakanã', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:bedee8ba-950e-82c8-8efd-01b15d6a6e02')::uuid, null,
          'Entender pontos mais críticos entre as pendencias analisadas.', null, 'concluida', 'consultoria',
          'Diagnóstico IFRS S1 e S2 [Aço Verde Brasil]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:211ee8ba-950e-82f4-abb0-0193e87529c7')::uuid, null,
          'Msg para Bia(edit): solicitar editoração semelhante a feita pela CTA, focada no texto.', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2026-01-12');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:7c8ee8ba-950e-8357-8662-01d59f1b3275')::uuid, null,
          'Montar cronograma para o projeto (apresentação a Edson) (modelo AVB)', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2026-01-12');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:546ee8ba-950e-832e-a82e-819e816ea7e6')::uuid, null,
          'Retomar contato antes de inicio', null, 'concluida', 'consultoria',
          'Inventário GEE[Lanxess]', date '2026-01-12');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:e7fee8ba-950e-82c2-93bb-81829b0063ca')::uuid, null,
          'analisar impactos do acordo Mercosul-UE / Gold Standard(boas práticas agricultura)', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2026-01-09');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:0b1ee8ba-950e-8395-aa81-816bfd6c167d')::uuid, null,
          'E-mail cobrando informações pendentes nesta semana', null, 'concluida', 'consultoria',
          'Relatório de impacto socioambiental [ BRLig]', date '2026-01-26');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d26ee8ba-950e-83db-a1ed-01771ab43e79')::uuid, null,
          'Revisar itens pendentes da Aquapolo', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f9aee8ba-950e-83c5-85e2-81d130e90974')::uuid, null,
          'Revisar RAS recebido dos designers', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:12eee8ba-950e-82c4-bbfe-81a544abc506')::uuid, null,
          'Iniciar revisão da Materialidade.', null, 'em_andamento', 'consultoria',
          'RAS[Acquapolo]', date '2026-01-05');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:367ee8ba-950e-8249-ad52-81a718ad5467')::uuid, null,
          'Revisão dos prazos publicados oficialmente - PPT - Datas - Migração MDL e Art. 6. (Tem na apresentação S1 e S2)', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2026-01-05');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:facee8ba-950e-8366-9475-819c6b495e40')::uuid, null,
          'Reunião com Edson/Anderson', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2026-01-15');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:9dbee8ba-950e-8284-9700-81dc1205998e')::uuid, null,
          'Rodar formulário para 2025 (Livia-CH)', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', date '2026-01-05');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a94ee8ba-950e-82ab-94d3-01e8fc645138')::uuid, null,
          'Solicitar informações pendentes logo após inicio do ano', null, 'concluida', 'consultoria',
          'Relatório de impacto socioambiental [ BRLig]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:c3aee8ba-950e-8203-9559-81453bb15a16')::uuid, null,
          'Avisar cosmos sobre próximos passos e confirmar conclusão do formulário casa trabalho.', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', date '2025-12-29');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:698ee8ba-950e-8234-9b75-01af9087fe94')::uuid, null,
          'revisar verificadores', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-12-29');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:b67ee8ba-950e-833a-9bd6-8120161a24fa')::uuid, null,
          'Revisão de comentários da Mara e também para designers', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-12-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:9faee8ba-950e-838d-bf6f-01896f500209')::uuid, null,
          'Verificar informações pendentes e mudnaça de destaque da fitch', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-12-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f36ee8ba-950e-83e9-9ee9-0111960ed491')::uuid, null,
          'Verificar mudança de foto dos depoimentos: Foto Alexandre e depoimento de mudança de turno.', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-12-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:8ccee8ba-950e-82c7-8868-01c630394f6e')::uuid, null,
          'Verificar prazo para revisão atual pela Mara', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-12-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3a7ee8ba-950e-833f-a110-81ee9e5e117a')::uuid, null,
          'Verificar prazos do CDm com unfcc', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2026-01-05');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:422ee8ba-950e-82be-ba75-019edc5f93a7')::uuid, null,
          'Verificar com marcelo como extrai informações do sistema para site visit.', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-12-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:92cee8ba-950e-823c-9f0d-81f9b6ed81a6')::uuid, null,
          'Novo PA para peru e área de cobertura', null, 'concluida', 'novos_negocios',
          'Novos Negócios', date '2025-12-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:c67ee8ba-950e-8206-b6ca-81619ed7b225')::uuid, null,
          'dados para bezero', null, 'concluida', 'novos_negocios',
          'Novos Negócios', date '2025-12-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a0aee8ba-950e-8314-81ef-81c034a6ad7f')::uuid, null,
          'Email de pendências iniciais para AVB', null, 'concluida', 'consultoria',
          'Diagnóstico IFRS S1 e S2 [Aço Verde Brasil]', date '2026-01-05');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:5c2ee8ba-950e-826c-9747-81065d9b1f13')::uuid, null,
          'Cadastrar Pkn no Bezero', null, 'concluida', 'novos_negocios',
          'Novos Negócios', date '2025-12-15');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:7a7ee8ba-950e-832e-8cf9-012accb92370')::uuid, null,
          'Analisar impostos municipais para viabilidade do Biochar e ICMS', null, 'concluida', 'novos_negocios',
          'Novos Negócios', date '2025-12-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:5caee8ba-950e-835b-975b-010bcd04cee4')::uuid, null,
          'Organizar pasta do projeto: foco nas duas operações.', null, 'concluida', 'consultoria',
          'Diagnóstico S1&S2 [DEXXOS]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:04fee8ba-950e-82e2-9ff6-012555d30714')::uuid, null,
          'Desenvolvimento de metodologia para materialidade', null, 'concluida', 'consultoria',
          'Diagnóstico IFRS S1 e S2 [Aço Verde Brasil]', date '2025-12-01');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:546ee8ba-950e-83d3-916a-81f8b9e7bf8b')::uuid, null,
          'ALM em tabaco', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:72dee8ba-950e-82ef-b238-8114ca014b8e')::uuid, null,
          'Depoimento Carol', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:7a1ee8ba-950e-8370-9421-81d06730d62e')::uuid, null,
          'Fazer FUP', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', date '2025-11-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:178ee8ba-950e-82e9-9dc1-8175f6a607b7')::uuid, null,
          'Verificar com Yuri e Aglaupe possibilidade de diluir mlehor conteúdo entre as páginas.', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:ea1ee8ba-950e-8289-8f21-018b1de5e2d1')::uuid, null,
          'Cobra los se Aquapolo recebeu as partes e se há feedback.', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:2f9ee8ba-950e-833d-b950-819e6b0622e7')::uuid, null,
          'Verificar evidências da planilha', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:8cdee8ba-950e-82f9-9cc4-01ef16a0e875')::uuid, null,
          'Finalizar Tratamento de Dados', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:dc7ee8ba-950e-827b-a354-0144021ad047')::uuid, null,
          'Quilombola - Pará - Verra - Análise', null, 'concluida', 'novos_negocios',
          'Novos Negócios', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:766ee8ba-950e-832c-8095-8122151e0f33')::uuid, null,
          'Análise de Planvivo - REDD - AERB', null, 'concluida', 'novos_negocios',
          'Novos Negócios', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:fd6ee8ba-950e-8309-a0aa-019864c3e493')::uuid, null,
          'Estudar relatório IETA recentes', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:cdcee8ba-950e-8300-86e1-813432b1fdf9')::uuid, null,
          'Pré EVTE: Verificar possibilidade de seguirmos para EVTE para biochess', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2025-11-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f0cee8ba-950e-83be-bac4-819963f407ca')::uuid, null,
          'Início da escrita da parte 1', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-11-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:4c2ee8ba-950e-8369-9e3e-816cd1101acd')::uuid, v_projeto,
          'Elaborar planilha IWA', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-10-31');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:6b3ee8ba-950e-82e0-a9d5-819da0c37153')::uuid, v_projeto,
          'Terminar planilha monitoramento financeiro', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-10-31');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:dd5ee8ba-950e-837e-8dd3-818997883bd9')::uuid, null,
          'Listar as incongruências e observações entre as evidências recebidas, para envio ao cliente.', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', date '2025-10-27');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:0cbee8ba-950e-82da-939c-014ecdd03621')::uuid, null,
          'Verificar vantagem de adesão antecipada', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-10-20');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:176ee8ba-950e-83bd-9ad2-0183aea029c5')::uuid, null,
          'Informar data de adesão ao Edson.', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-10-20');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:07bee8ba-950e-8364-96fe-817d0d130349')::uuid, null,
          'Verificar se o label CCP é automático', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:5d8ee8ba-950e-83af-94b9-012cdd663b51')::uuid, v_projeto,
          'MV verificará obrigatoriedade ou não de fazer MR digital.', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-10-13');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:798ee8ba-950e-83ea-8a7c-81e946c8434d')::uuid, v_projeto,
          'MV solicitar acesso ao Hub Verra', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-10-13');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:7fdee8ba-950e-8222-972a-0139b976fc95')::uuid, null,
          'retomar atividades', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', date '2025-10-13');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:5ecee8ba-950e-82a2-8aac-8129f55e093b')::uuid, v_projeto,
          'Email para Jamel sobre as áreas de não floresta', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-10-06');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:92fee8ba-950e-82c5-a372-01c0e0e7288a')::uuid, v_projeto,
          'Enviar lista de verificadores para MV. Carol.', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-10-06');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:90cee8ba-950e-83bc-8827-8164af209fd6')::uuid, v_projeto,
          'Reunião com Jamel, Guilherme e equipe Earthood - 03/10', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-09-29');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:584ee8ba-950e-826a-a8ba-81ecdefecb6d')::uuid, null,
          'Verificar viabilidade de atuarmos na renovação de LO e LA da BRLig', null, 'concluida', 'consultoria',
          'Relatório de impacto socioambiental [ BRLig]', date '2025-10-06');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:4f2ee8ba-950e-82ab-893c-81a77fb492ef')::uuid, null,
          'Encaminhar evidências necessárias', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', date '2025-09-29');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:474ee8ba-950e-8386-ae5f-01cc14337960')::uuid, v_projeto,
          'Encaminhar pra LP e FM o link do drive compartilhado com as ADL', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-09-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:e22ee8ba-950e-8319-8a85-81034c8c7641')::uuid, null,
          'Orçar a confecção dos documentos complementares sob responsabilidade Apsis.', null, 'concluida', 'consultoria',
          'Relatório de impacto socioambiental [ BRLig]', date '2025-09-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:02eee8ba-950e-83cc-bb46-0172d1770de3')::uuid, null,
          'Conferir se documentos que já temos conseguem cumprir as exigências da Aneel. Fazer contato com Ivan.', null, 'concluida', 'consultoria',
          'Relatório de impacto socioambiental [ BRLig]', date '2025-09-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:1a0ee8ba-950e-8356-b891-81a6b3f897f2')::uuid, null,
          'Organizar documentos enviados na pasta', null, 'concluida', 'consultoria',
          'Relatório de impacto socioambiental [ BRLig]', date '2025-09-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:734ee8ba-950e-82aa-a84b-015ed40c4b06')::uuid, null,
          'Reunião com Paulo Banco', null, 'concluida', 'consultoria',
          'Avaliação de valor justo para crédito de carbono [Ambipar]', date '2025-09-15');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:24cee8ba-950e-823a-a8a0-81798b57c76b')::uuid, null,
          'FUP no grupo sobre envio de documentos', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:089ee8ba-950e-83a4-8650-811abc8b1ae9')::uuid, null,
          'Atualizar Trello', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-09-15');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d87ee8ba-950e-83c0-96de-819b306598ba')::uuid, null,
          'Propor divisão do RAS', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-09-15');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:47cee8ba-950e-834e-a8fe-8197c6152635')::uuid, null,
          'Verificar estudos citados pelo CEO (feito - apenas WWF)', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-09-15');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:126ee8ba-950e-82bc-9c5b-013afcdaee32')::uuid, null,
          'Enviar emails com as pendências', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-09-15');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:e6cee8ba-950e-83bf-a8d3-0146320f0183')::uuid, null,
          'Checar regra de viagens para estagiários', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-09-15');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a6fee8ba-950e-82e0-a784-8161f0306db9')::uuid, v_projeto,
          'Verificar entregas GIS da Ana e Jamel', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-09-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:5b7ee8ba-950e-825c-a22d-81d1f973405f')::uuid, null,
          'Montar base de dados de projetos de energia.', null, 'concluida', 'consultoria',
          'Avaliação de valor justo para crédito de carbono [Ambipar]', date '2025-09-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:269ee8ba-950e-83ad-99e5-016dba9d6e4e')::uuid, null,
          'Finalizar laudos dos que não estão finalizados - AC passar para GS', null, 'concluida', 'consultoria',
          'Avaliação de valor justo para crédito de carbono [Ambipar]', date '2025-09-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:220ee8ba-950e-82b6-b02c-819debc7369f')::uuid, null,
          'Revisitar as atas para entender to dos pendentes', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-09-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:266ee8ba-950e-826e-a548-013c7c397e4f')::uuid, null,
          'Definir as fotos que serão utilizadas no relatório - Aquapolo.', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-09-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3dbee8ba-950e-8300-a82b-8197cc51cec1')::uuid, null,
          'Revisão das planilhas e envio para marcelo', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-09-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:17bee8ba-950e-8267-b42c-8117ae3c957b')::uuid, null,
          'Everland - Preencher planilha conforme formulário', null, 'concluida', 'novos_negocios',
          'Novos Negócios', date '2025-09-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:c01ee8ba-950e-8239-a231-01b8f0a21767')::uuid, null,
          'Solicitar feedback do projeto gráfico e datas de novas reuniões', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-09-01');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:b98ee8ba-950e-82e8-afbe-014f91069d44')::uuid, null,
          'Tabela comparativa das propostas', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-09-01');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:1ecee8ba-950e-8382-bb85-81f001e7af7f')::uuid, null,
          'Verificar prazo com marketing Apsis para peças de comunicação de divulgação do RAS', null, 'concluida', 'consultoria',
          'RAS[CTA]', date '2025-09-25');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:94aee8ba-950e-82b3-bd58-812d583eecb4')::uuid, null,
          'FUP no Bruno', null, 'concluida', 'consultoria',
          'Relatório de impacto socioambiental [ BRLig]', date '2025-08-25');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:cacee8ba-950e-8280-b37d-812bb03514c8')::uuid, null,
          'Definir prazo para eles retornarem as dúvidas (sugestão: 2 semanas)', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', date '2025-08-25');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:281ee8ba-950e-827b-9e81-019234d2fbbb')::uuid, null,
          'Realizar projeto editorial', 'Apresentação realizada no dia 03/09/', 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-09-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:dd9ee8ba-950e-831c-ab67-019df9e53f34')::uuid, null,
          'Realizar análise de outros RAS', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:168ee8ba-950e-8335-9def-812e18d84e1d')::uuid, null,
          'Tradução do resumo executivo', null, 'concluida', 'consultoria',
          'RAS[CTA]', date '2025-08-25');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:8a6ee8ba-950e-8311-bc5e-81c82ff5ceb2')::uuid, null,
          'Envia e-mail com características da CTA', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-08-27');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:0ebee8ba-950e-8214-80ad-014762a19871')::uuid, null,
          'Reunião para apresentação dos dados', null, 'concluida', 'consultoria',
          'Inventário GEE[IPEL]', date '2025-09-25');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f48ee8ba-950e-8366-bac6-815fdfe8f952')::uuid, v_projeto,
          'Cobrar do Tim a rota realizada durante os treinamentos', null, 'concluida', 'jpf',
          'JPF - Parakanã', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d2cee8ba-950e-8324-8e3c-01871b07c67e')::uuid, v_projeto,
          'Encaminhar novo template/dados necessário por email para IPES dos relatórios mensais', null, 'concluida', 'jpf',
          'JPF - Parakanã', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:96eee8ba-950e-8364-aece-81c5cdb52516')::uuid, null,
          'Enviar checklist para Brlig', null, 'concluida', 'consultoria',
          'Relatório de impacto socioambiental [ BRLig]', date '2025-08-18');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:5eeee8ba-950e-83a5-9d01-018ada250259')::uuid, null,
          'Checklist de dados complementares a serem enviados', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d52ee8ba-950e-82df-870c-816e319c1440')::uuid, null,
          'Comparar plataformas (MSCI, ABATABLE, Alliedoffsets)', null, 'concluida', 'consultoria',
          'Avaliação de valor justo para crédito de carbono [Ambipar]', date '2025-08-18');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:084ee8ba-950e-831f-9cda-01573caf0757')::uuid, null,
          'Criar tabela de preenchimento dos indicadores financeiros', null, 'concluida', 'consultoria',
          'Relatório de impacto socioambiental [ BRLig]', date '2025-08-18');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:315ee8ba-950e-828b-a832-816d0c547463')::uuid, null,
          'Análise dos indicadores e dos dados necessários', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:e67ee8ba-950e-83e1-a32f-010b9874ded5')::uuid, null,
          'Tradução do RAS. Apenas texto.', '- 2 dias para traduzir documento todo - Tem que manter narrativa do documento - Tradução apenas do texto - Doc Word - Designers vão fazer a diagramação do documento final', 'concluida', 'consultoria',
          'RAS[CTA]', date '2025-08-19');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:060ee8ba-950e-8355-b6a2-016a9656042e')::uuid, null,
          'Revisão relatório de 2023', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', date '2025-08-11');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:4d6ee8ba-950e-83e8-901a-01aff2e5cf60')::uuid, v_projeto,
          'Reunião INDEVA e Joedson - Biodiversidade', '- Verificar o que foi elaborado do protocolo.', 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-08-07');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:8c9ee8ba-950e-8234-abc7-8141291d89ce')::uuid, v_projeto,
          'Reunião IPES - Bioeconomia', '- Verificar como esta o andamento da quantificação.', 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-08-06');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:b3fee8ba-950e-8260-889e-81ad16f40717')::uuid, null,
          'Enviar link dos documentos para designers', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:60eee8ba-950e-8371-8c27-814f0b3105fd')::uuid, null,
          'Assinatura de contrato com Designers', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:9dbee8ba-950e-82cc-97fb-81d0318b03ca')::uuid, null,
          'Reunião com Giovani para feedback', null, 'concluida', 'consultoria',
          'Inventário GEE[IPEL]', date '2025-08-11');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:9b3ee8ba-950e-8313-ab7b-81b80b2f3fff')::uuid, null,
          'relatório enviado pro LP para verificar os dados', null, 'concluida', 'consultoria',
          'Inventário GEE[IPEL]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:5a6ee8ba-950e-822a-8108-0177b3d4d9b1')::uuid, v_projeto,
          'Montar padrão de relatório para INDEVA', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-07-28');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:6a8ee8ba-950e-8370-9cab-819b7aadcb30')::uuid, null,
          'Reunião preparatória pré - levantamento de fontes (Diretriz técnica)', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', date '2025-08-11');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:44bee8ba-950e-8385-80a2-81bc10e4516c')::uuid, null,
          'Revisar material antes do kick off - IFRS 1 e 2 e CBCE', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:ff1ee8ba-950e-8396-a48d-015cef4258b9')::uuid, null,
          'Kick off - Apresentação Inventário (20/08)', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', date '2025-08-13');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:39eee8ba-950e-8218-a701-81888c491346')::uuid, null,
          'Verificar habilitações para assinatura de relatórios. EVTE', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2025-07-28');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3b9ee8ba-950e-83f8-8ab3-81484f1e6a0c')::uuid, null,
          'Criar planilha com os fatores de redução já aplicados', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-07-28');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d20ee8ba-950e-8330-a61c-81a8a7a05511')::uuid, null,
          'Verificar dados ausentes para 2024', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', date '2025-07-28');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:db3ee8ba-950e-83b2-9fb5-810be892c439')::uuid, null,
          'Levantamento de fontes - Visita técnica (20/08)', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', date '2025-08-20');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:41eee8ba-950e-8215-8559-81c16648eb92')::uuid, null,
          'Incluir comentário explicativos na planilha', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-07-21');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:26fee8ba-950e-8257-847a-01bd5f96442b')::uuid, null,
          'Adicionar vizinhos amigos, trincheira(jpf- oportunidades)(risco real, garimpo, invasão, etc), capoto(propostas em andamento), parque do xingu(jpf-oportunidades)(SPE 100%, verificar modelo)', null, 'concluida', 'novos_negocios',
          'Novos Negócios', date '2025-07-21');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:865ee8ba-950e-83fd-ac48-81f797aa2711')::uuid, null,
          'Verificar com Damião sobre as áreas para Vizinhos Amigos', null, 'concluida', 'novos_negocios',
          'Novos Negócios', date '2025-07-21');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:662ee8ba-950e-82ba-9bd6-01077f66b77c')::uuid, null,
          'Verificar nomes a serem entrevistados', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:09fee8ba-950e-83ff-a83f-01286ba10e40')::uuid, null,
          'Verificar processo da alteração do nome do proponente', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-07-21');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:7feee8ba-950e-8221-a7c9-81cf4ac62e61')::uuid, null,
          'Participar do evento anual do GHG Protocol', 'Participar no mesmo dia que CTA for', 'concluida', 'consultoria',
          'Inventário GEE[CTA]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:55eee8ba-950e-8250-8078-81e400294bc4')::uuid, null,
          'Verificar dados a serem solicitados para 2024.', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', date '2025-07-21');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:73aee8ba-950e-8291-b3ea-0140cf829ba8')::uuid, v_projeto,
          'Enviar email para Tim (CC para Karla) confirmando todas as informações logísticas dos treinamentos', null, 'concluida', 'jpf',
          'JPF - Parakanã', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:ef2ee8ba-950e-8214-bc36-019543ac651a')::uuid, v_projeto,
          'Cobrar Earthood em 21/07 caso não haja envio da nova rodada de findings', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2025-07-18');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:1c2ee8ba-950e-82c6-ad4f-01494ad1d091')::uuid, null,
          'Recebimento completo das planilhas GRI', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:6d2ee8ba-950e-8367-a1d4-0127f5d76c12')::uuid, null,
          'Verificar pendências para reiniciar o inventário', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', date '2025-07-14');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:e20ee8ba-950e-8343-8022-0128a66a252e')::uuid, null,
          'Atualizar dados Salinor', null, 'concluida', 'consultoria',
          'Inventário GEE[Salinor]', date '2026-06-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:ca8ee8ba-950e-83aa-b8a9-011fb320024c')::uuid, null,
          'envio do relatório final pra cliente', null, 'concluida', 'consultoria',
          'Inventário GEE[IPEL]', date '2025-07-14');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:b83ee8ba-950e-83e4-a2e3-011933cdff80')::uuid, null,
          'Envio da minuta', null, 'concluida', 'consultoria',
          'Inventário GEE[Salinor]', date '2025-07-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:98fee8ba-950e-82e7-9a6e-01491c9b62c5')::uuid, null,
          'Achar shapefile das UMF das concessões florestais', null, 'concluida', 'novos_negocios',
          'Novos Negócios', date '2025-07-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:7d4ee8ba-950e-8275-befe-011b9dda9eb5')::uuid, null,
          'Revisar documentos para enviar ao VVB', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-07-11');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:77eee8ba-950e-8237-a325-819a34d997b1')::uuid, null,
          'Estruturar página do projeto acquapolo no Notion', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2025-07-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:37cee8ba-950e-83f4-82c4-81c571be2d78')::uuid, null,
          'Orçar com Yuri/Aglaupe o projeto editorial do RAS', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:aaaee8ba-950e-82f0-ad7b-81619e741b6d')::uuid, null,
          'Combinar com Impactato qual será a participação deles', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:44fee8ba-950e-8200-bf2a-015c7cd0f5bc')::uuid, null,
          'Verificar contabilização da produção de sal total', null, 'concluida', 'consultoria',
          'Inventário GEE[Salinor]', date '2025-06-16');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:85eee8ba-950e-8289-b600-015ae1f6f045')::uuid, null,
          'Terminar revisão', null, 'concluida', 'consultoria',
          'Inventário GEE[Salinor]', date '2025-06-16');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f48ee8ba-950e-8256-8917-01e300c72cb9')::uuid, null,
          'Verificar contabilização de escopo 2', null, 'concluida', 'consultoria',
          'Inventário GEE[IPEL]', date '2025-06-16');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:08bee8ba-950e-8316-ab63-014d942eb3f0')::uuid, null,
          'Terminar revisão', null, 'concluida', 'consultoria',
          'Inventário GEE[IPEL]', date '2025-06-16');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f27ee8ba-950e-82ab-9f55-815171af6d0a')::uuid, null,
          'Finalizar planilha de calculos de créditos', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-07-11');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:efbee8ba-950e-8377-ab8e-01ab9d512ab3')::uuid, null,
          'envio do relatório final para editoração', null, 'concluida', 'consultoria',
          'Inventário GEE[IPEL]', date '2025-06-09');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f1bee8ba-950e-82f6-ae64-018e1bd40d05')::uuid, null,
          'Marcar apresentação do relatório', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-08-01');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:c26ee8ba-950e-8250-a0bd-01e02d6a7515')::uuid, null,
          'Analisar benchmarks de RAS do setor.', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:418ee8ba-950e-83ea-ace2-818a0bbef670')::uuid, null,
          'Concluir o relatório e esclarecer dúvidas restantes.', null, 'concluida', 'consultoria',
          'Inventário GEE[IPEL]', date '2025-05-26');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:ef7ee8ba-950e-82da-83d4-818d709b5976')::uuid, null,
          'Testar envio das planilhas para servidor J6', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-05-12');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:44fee8ba-950e-827a-b519-819f6cbdaa58')::uuid, null,
          'Capítulo sobre inventário de emissões do RAS', null, 'concluida', 'consultoria',
          'RAS[CTA]', date '2025-05-12');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:66dee8ba-950e-83fc-a19f-0166f8e72639')::uuid, null,
          'Testar ferramenta do Programa GHG', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-05-12');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:83eee8ba-950e-833e-acfb-81c62a38f40c')::uuid, null,
          'Contato de atualização com auditora', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-05-12');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d93ee8ba-950e-8391-9edc-81a6dbc916bb')::uuid, v_projeto,
          'Cobrar Cinthia sobre estatuto da Paranatinga', null, 'concluida', 'jpf',
          'JPF - Parakanã', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:7b8ee8ba-950e-826a-b0df-810670da97f4')::uuid, null,
          'Iniciar confecção planilha de dados', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-04-28');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f93ee8ba-950e-8315-81e6-01553bd6b703')::uuid, null,
          'Definição da nova capa', null, 'concluida', 'consultoria',
          'RAS[CTA]', date '2025-04-28');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d75ee8ba-950e-835f-8746-01ca0367f858')::uuid, null,
          'Iniciar confecção do relatório', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:077ee8ba-950e-82fa-ba17-818c3bce6d70')::uuid, null,
          'Enviar analise dos dados já planilhados.', null, 'concluida', 'consultoria',
          'Inventário GEE[Salinor]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:ee7ee8ba-950e-8363-b54e-818b7d4b2047')::uuid, null,
          'Upload das planilhas dos outros GRI, por pessoa', null, 'concluida', 'consultoria',
          'RAS[CTA]', date '2025-04-28');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:bc5ee8ba-950e-832a-9cbc-81b84de669a6')::uuid, null,
          'Reunião interna para próximos passos do tratamento de dados do agro.', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-04-07');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:158ee8ba-950e-8313-be85-81e37e2058c5')::uuid, null,
          'marcar reunião sobre resíduos com Luciano Weiss', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-04-07');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:639ee8ba-950e-826f-8841-01559fcd8750')::uuid, null,
          'Verificar possibilidade de exportação do Onfly com sabrina', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', date '2025-04-07');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:e12ee8ba-950e-82ff-8a11-81688b8027fa')::uuid, null,
          'Desenvolver planilha de controle dos envios. Escopo/categoria/fonte/área/responsável', null, 'concluida', 'consultoria',
          'Inventário GEE[Salinor]', date '2025-04-07');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f56ee8ba-950e-83af-a03b-8134e3807050')::uuid, null,
          'Analisar a diferença entre o selo clima completo ou simples.', null, 'concluida', 'consultoria',
          'Inventário GEE[TecVerde]', date '2025-04-28');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:402ee8ba-950e-8313-993b-81021cba401c')::uuid, null,
          'Recortar apenas os veículos próprios.', null, 'concluida', 'consultoria',
          'Inventário GEE[TecVerde]', date '2025-04-28');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:bc9ee8ba-950e-8261-b884-81186a60417e')::uuid, null,
          'Enviar email com as pendências finais', null, 'concluida', 'consultoria',
          'Inventário GEE[IPEL]', date '2025-04-07');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:b2dee8ba-950e-8302-b49c-01a60a634f57')::uuid, null,
          'Analisar case da Impactato em empresa de saneamento e como elaborar CTA com storytelling', null, 'concluida', 'consultoria',
          'RAS[Acquapolo]', date '2025-05-12');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:052ee8ba-950e-82f8-ab6f-81e130c81587')::uuid, null,
          'Tratar 100% dados', null, 'concluida', 'consultoria',
          'Inventário GEE[IPEL]', date '2025-04-07');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:74fee8ba-950e-830a-94b7-01091582ca56')::uuid, null,
          'Marcar com Sustain demonstração.', null, 'concluida', 'consultoria',
          'Inventário GEE[TJRR]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:2b1ee8ba-950e-83a7-a740-8137cb127903')::uuid, null,
          'Verificar especialistas em geração hidrelétrica(Paulo blanco e pedro martins)', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-03-31');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:2e2ee8ba-950e-82c0-aa7b-8126fc231f6f')::uuid, null,
          'Enviar e-mail para Paulo com nossas dúvidas.', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2025-03-31');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a63ee8ba-950e-830b-b014-8147a795d391')::uuid, null,
          'Verificar o uso de carros dos monitores de campo para DCT', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-03-31');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d54ee8ba-950e-8399-a60d-011704da3e27')::uuid, null,
          'Solicitar certificado de compra da madeira (anderson) para verificar se há tipo de madeira específica(para calcular densidade)', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-03-31');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:5a1ee8ba-950e-8356-92b3-81d9533b2cde')::uuid, null,
          'Dados do agro: planilha com incerteza dos fatores e dos dados.', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-03-31');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:8f0ee8ba-950e-8245-8add-819b6736cd7a')::uuid, null,
          'Terminar o tratamento das planilhas de dados do agro.', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-03-31');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:624ee8ba-950e-8357-ac0c-01328728be46')::uuid, null,
          'Cobrar ABNT para retornar à CTA sobre a Data da auditoria', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-03-31');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:eccee8ba-950e-820b-a17a-81dc9e2db0df')::uuid, null,
          'Terminar de tratar os dados recebidos da Fernanda(Exportação?)', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-03-31');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f22ee8ba-950e-83db-b154-017f454d2636')::uuid, null,
          'Email solicitanto evidências com Anderson', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2025-03-31');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:f25ee8ba-950e-8327-8691-814f8f4884b5')::uuid, null,
          'Estipular prazo e definir data de apresentação final', null, 'em_andamento', 'consultoria',
          'Inventário GEE[TecVerde]', date '2025-03-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d7fee8ba-950e-83d6-804a-019c6994e3af')::uuid, null,
          'Fazer FUP sobre relatório de assessoria e inventários. 31/03.', null, 'concluida', 'consultoria',
          'Inventário GEE[TecVerde]', date '2025-03-31');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:156ee8ba-950e-82a9-8736-0137f3623a8f')::uuid, null,
          'Verificas as dúvidas das planilhas levantadas pela Leila.', null, 'concluida', 'consultoria',
          'RAS[CTA]', date '2025-03-31');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:8e9ee8ba-950e-8384-a170-016fa94ce53a')::uuid, null,
          'Tratar 100% dados', null, 'concluida', 'consultoria',
          'Inventário GEE[Salinor]', date '2025-03-31');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:857ee8ba-950e-829e-86a3-81e46ddd4356')::uuid, null,
          'Verificar se salinor tem como ter ISS Neutro', null, 'concluida', 'consultoria',
          'Inventário GEE[Salinor]', date '2026-02-24');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3b8ee8ba-950e-806b-9fba-ccc4cfa85f10')::uuid, null,
          'Verificar estudo recarga manancial com Mara', null, 'nao_iniciada', 'consultoria',
          'RAS [Aquapolo]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3b8ee8ba-950e-80ba-886e-ecee12301fdc')::uuid, null,
          'Verificar metodologia PACT', null, 'nao_iniciada', 'consultoria',
          'Inventário GEE[Salinor]', date '2026-08-10');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3b8ee8ba-950e-806f-8581-f63c2ade4623')::uuid, null,
          'Revisão Copilot - Planilhas', null, 'nao_iniciada', 'consultoria',
          'Inventário GEE [EDF]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3b1ee8ba-950e-808c-9184-d18c4f9deb2b')::uuid, null,
          'Verificar clientes incluídos SBCE', null, 'nao_iniciada', 'backoffice',
          'Interno Apsis Carbon', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3b1ee8ba-950e-808a-86c8-f6828f4d172f')::uuid, null,
          'Verificar respostas questionário', null, 'nao_iniciada', 'consultoria',
          'Materialidade [CTA]', date '2026-08-03');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3b1ee8ba-950e-8082-aa12-d3c2b48c407f')::uuid, null,
          'Revisar relatório', null, 'nao_iniciada', 'consultoria',
          'Inventário GEE [EDF]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3b1ee8ba-950e-8021-a254-cf3ef00ca1e3')::uuid, null,
          'Confeccionar planilhas extras do GHG para BeS e outras fontes', null, 'nao_iniciada', 'consultoria',
          'Inventário GEE [EDF]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3aaee8ba-950e-80d9-8ef0-c39a906f63ff')::uuid, null,
          'GS: colocar respostas no servidor.', null, 'nao_iniciada', 'consultoria',
          'Materialidade [CTA]', date '2026-07-27');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3aaee8ba-950e-806b-830c-cc27ef8e3abe')::uuid, null,
          'Relatório Apsis 2025', null, 'nao_iniciada', 'consultoria',
          'Inventário GEE [Apsis]', date '2026-07-27');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3a3ee8ba-950e-800c-b299-c4948c9f66e2')::uuid, null,
          'Colocar ecovadis CTA na pasta', null, 'concluida', 'consultoria',
          'Inventário GEE[Salinor]', date '2026-07-20');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3a3ee8ba-950e-8084-99f3-cec43f0e1436')::uuid, null,
          'Pesquisa: framework com meta relativa de pegada ou intensidade de emissões', null, 'nao_iniciada', 'consultoria',
          'Inventário GEE[CTA]', date '2026-07-20');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3a3ee8ba-950e-807c-9224-f22be0ee7bbb')::uuid, null,
          'Pesquisa: framework com meta relativa de pegada ou intensidade de emissões', null, 'concluida', 'consultoria',
          'Materialidade [CTA]', date '2026-07-20');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3a3ee8ba-950e-80a9-b8c1-d6bf2fbee771')::uuid, null,
          'Confirmar revisão co mary', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', date '2026-07-20');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:39cee8ba-950e-8045-82ee-e84ef1f4dd76')::uuid, null,
          'Enviar editável em português para CA', null, 'concluida', 'consultoria',
          'Materialidade [CTA]', date '2026-07-13');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:39cee8ba-950e-806b-83b9-db7cef4f3393')::uuid, null,
          'Email para Rômulo e deisiany. Descarbonixação e novas propostas', null, 'concluida', 'consultoria',
          'Inventário GEE[Salinor]', date '2026-07-13');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:39cee8ba-950e-80e5-ab48-d45fc72ef703')::uuid, null,
          'Cobrar Sabrina e Michelle. Informar prazo.', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:395ee8ba-950e-80dd-b047-ebc195cc33a5')::uuid, v_projeto,
          'Reuniões com Tripti E Nova Terra - Email Verra sobre monitoramento', null, 'nao_iniciada', 'jpf',
          'JPF - Parakanã', date '2026-07-06');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:395ee8ba-950e-80bf-a8f2-ea472196d184')::uuid, null,
          'Aguardar recebimento de Material sobre descomissionamento', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2026-07-06');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:395ee8ba-950e-804f-a5d5-eb890fdc1dd0')::uuid, null,
          'Verificar se eqp Marabá tem acesso ao Claude com Leonardo.', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2026-07-06');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:395ee8ba-950e-8001-8d76-c07f4cde7bcf')::uuid, null,
          'Gerar cap. Recomendações.', null, 'nao_iniciada', 'consultoria',
          'Inventário GEE[Lanxess]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:395ee8ba-950e-808e-9a76-df8e08aea928')::uuid, null,
          'Replicar tabela adicional para cada unidade', null, 'concluida', 'consultoria',
          'Inventário GEE [EDF]', date '2026-07-13');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:387ee8ba-950e-8031-b303-cea03c34999d')::uuid, null,
          'Enviar relatório para editoração', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2026-06-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:387ee8ba-950e-80be-8dec-dc4e3d9782bb')::uuid, null,
          'Terminar relatório', null, 'concluida', 'consultoria',
          'Inventário GEE[Lanxess]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:379ee8ba-950e-80ee-b442-d7ddae98d17c')::uuid, null,
          'Preparar estudo SBTI para CTA', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2026-06-08');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:372ee8ba-950e-80e8-beb9-f0f6884ba0a9')::uuid, null,
          'Definir alocações pré relatório', null, 'concluida', 'consultoria',
          'Inventário GEE [EDF]', date '2026-06-01');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:372ee8ba-950e-8079-afd5-ea559613a0f4')::uuid, null,
          'Atualizar cronograma', null, 'concluida', 'consultoria',
          'Inventário GEE[Lanxess]', date '2026-06-01');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:372ee8ba-950e-8087-a08b-fe0bbcfedd33')::uuid, null,
          'Manual do mudança do focal point. - MDL e Art. 6', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2026-06-01');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:372ee8ba-950e-809e-abb4-c87f60c76d3f')::uuid, null,
          'Verificar questionário CTA - Layout', null, 'concluida', 'consultoria',
          'Materialidade [CTA]', date '2026-06-01');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:364ee8ba-950e-80b6-9ce8-fe2b6cfcc95b')::uuid, null,
          'Atualizar drivers CTA', null, 'concluida', 'consultoria',
          'RAS[CTA]', date '2026-05-18');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:364ee8ba-950e-800f-b811-ce86f74bdf1a')::uuid, null,
          'Verificar entrevistas CTA e calendário', null, 'concluida', 'consultoria',
          'RAS[CTA]', date '2026-05-18');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:35dee8ba-950e-8031-8f0d-e39f7f87ee58')::uuid, null,
          'Verificar dados dos indicadores recebidos e informa CA sobre status', null, 'nao_iniciada', 'consultoria',
          'RAS [Aquapolo]', date '2026-06-22');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:35dee8ba-950e-8082-9223-ca09ddb8a560')::uuid, null,
          'Planilhar dados', null, 'concluida', 'consultoria',
          'Inventário GEE[Lanxess]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:35dee8ba-950e-80ee-995c-defd25a40313')::uuid, null,
          'Montar apresentação Materialidade', null, 'concluida', 'consultoria',
          'Materialidade [CTA]', date '2026-05-11');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:35dee8ba-950e-8015-ac89-f5b5dc6c822e')::uuid, null,
          'Planilhar dados após recebimento - Anderson', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:356ee8ba-950e-80ba-9aec-c52ed6c3cf4a')::uuid, null,
          'Trello', null, 'concluida', 'consultoria',
          'RAS[CTA]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:356ee8ba-950e-802c-9337-edd126e34459')::uuid, null,
          'Simulação de acesso ao sistema antes da auditoria - Luciano e Edson', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:356ee8ba-950e-80e7-ab03-ed473f687eb2')::uuid, null,
          'Análise segunda etapa de dúvidas', null, 'concluida', 'consultoria',
          'Inventário GEE [EDF]', date '2026-05-04');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:356ee8ba-950e-805c-866d-e827e81fff3a')::uuid, null,
          'Envio de cronograma até essa semana (04/05)', null, 'concluida', 'consultoria',
          'Inventário GEE [EDF]', date '2026-05-04');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:34fee8ba-950e-8084-822a-cb317c06b2fd')::uuid, null,
          'Análise de lacunas para riscos climáticos.', null, 'nao_iniciada', 'consultoria',
          'Diagnóstico IFRS S1 e S2 [Aço Verde Brasil]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:34fee8ba-950e-80bc-a373-e022decd9521')::uuid, null,
          'Revisão de lista de materialidade e Entrevistas para Érika', null, 'concluida', 'consultoria',
          'Materialidade [CTA]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:348ee8ba-950e-80b3-ba00-d7e2e631ed92')::uuid, null,
          'Revisar planilha J6 - pente fino', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2026-04-20');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:341ee8ba-950e-80e4-a9da-d1c26fff2f91')::uuid, v_projeto,
          'Informar Israel que estamos a disposição para seleção de pessoas para ser capacitada para atuação na associação e na conta azul.', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2026-04-13');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:341ee8ba-950e-8098-9f8f-f60176f5a228')::uuid, null,
          'Levantar horários Jogos do Brasil', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2026-06-29');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:341ee8ba-950e-8097-8468-dec1c6bdbf1b')::uuid, null,
          'Analisar controladoras e controladas de empresa - Grupo Alliança Saúde. Proposta diagnóstico S1 e S2.', null, 'concluida', 'backoffice',
          'Interno Apsis Carbon', date '2026-04-13');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:341ee8ba-950e-80c3-8838-d3f7db5a4fa9')::uuid, null,
          'Verificar pendencias da Apsis', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', date '2026-04-13');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:bafee8ba-950e-82e1-aeb2-815aecb20f98')::uuid, null,
          'Remarcar reunião com Marcelo para verificação das pastas e extração do sistema', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:44fee8ba-950e-820a-ac4f-016707fb0f1e')::uuid, null,
          'desenvolver plano de açõa para finalizar inventário', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', date '2026-03-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3e2ee8ba-950e-82cb-86f5-814f6a936f4e')::uuid, v_projeto,
          'Linha do tempo do PKN', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2026-03-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:4eeee8ba-950e-8254-be4f-0136dd132889')::uuid, null,
          'Sugestão: Reanalisar propostas de análise de riscos (climada, CEF, etc)', null, 'concluida', 'consultoria',
          'Diagnóstico S1&S2 [DEXXOS]', date '2026-03-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:739ee8ba-950e-83d9-ac11-01a603246d21')::uuid, null,
          'FUP dos emails enviados', null, 'concluida', 'consultoria',
          'Diagnóstico S1&S2 [DEXXOS]', date '2026-03-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:432ee8ba-950e-8205-9dd3-01f049fb3f74')::uuid, null,
          'Marcar reunião de handon (terça ou quarta): GS, AC e CA', null, 'concluida', 'consultoria',
          'Diagnóstico IFRS S1 e S2 [Aço Verde Brasil]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:fe0ee8ba-950e-82f3-b576-01588f3524d1')::uuid, v_projeto,
          'Enviar análise do último relatório INDEVA por email', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2026-03-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:047ee8ba-950e-8274-b22c-017b6a626a44')::uuid, null,
          'Mapa com fontes que precisam ter contrato verificado', null, 'concluida', 'consultoria',
          'Inventário GEE [EDF]', date '2026-03-30');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:1f5ee8ba-950e-839f-b19f-0133115937ee')::uuid, null,
          'enviar ata para evelyn da reunião de sexta', null, 'concluida', 'consultoria',
          'Inventário GEE [EDF]', date '2026-03-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:2ffee8ba-950e-8249-b13e-8134ee5d6824')::uuid, v_projeto,
          'Adiantar EOI para Everland e atualizar TOC para padrão Equitable.', null, 'concluida', 'jpf',
          'JPF - Parakanã', date '2026-03-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:bebee8ba-950e-83a4-a0bc-015a8365f4f4')::uuid, null,
          'Encaminhar para IVAN', null, 'concluida', 'consultoria',
          'Relatório de impacto socioambiental [ BRLig]', date '2026-03-30');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:32bee8ba-950e-8225-a012-815b9ef62e91')::uuid, null,
          'verificar benchmark e cronograma Dexxos', null, 'concluida', 'consultoria',
          'Diagnóstico S1&S2 [DEXXOS]', date '2026-03-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:33bee8ba-950e-825c-8986-812ca50761f6')::uuid, null,
          'Slide de feedback da visita.', null, 'concluida', 'consultoria',
          'Diagnóstico S1&S2 [DEXXOS]', date '2026-04-13');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:e2cee8ba-950e-832e-a08b-817150e22239')::uuid, null,
          'ATuação dentro do Tabaco do Bench SBTI. Além de empresas no BR. Ver guidance.', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2026-03-30');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a09ee8ba-950e-8250-a930-0198380b59c9')::uuid, null,
          'Montar Kick-off', null, 'concluida', 'consultoria',
          'Inventário GEE[Lanxess]', date '2026-03-02');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:223ee8ba-950e-8304-8809-01e8f04fc78e')::uuid, null,
          'planilha de diferenças PD e MR', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2026-03-30');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:d12ee8ba-950e-8302-bae8-0112279c9698')::uuid, null,
          'FUP sobre envio de dados', null, 'concluida', 'consultoria',
          'Inventário GEE[Lanxess]', date '2026-04-06');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:58cee8ba-950e-824b-9159-01428c4fd5db')::uuid, null,
          'Sugestão: Reanalisar propostas de análise de riscos (climada, CEF, etc)', null, 'concluida', 'consultoria',
          'Diagnóstico IFRS S1 e S2 [Aço Verde Brasil]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:857ee8ba-950e-831b-9110-815142bd8cfc')::uuid, null,
          'tabela de indicadores', null, 'concluida', 'consultoria',
          'RAS[CTA]', date '2026-03-16');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:5eaee8ba-950e-823f-a7d2-01ea2169bcb2')::uuid, null,
          'Marccar reunião com Rhuan', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a03ee8ba-950e-82a1-a2de-81df6c2579a9')::uuid, null,
          'Verificar chamado da TRia com CCEE sobre dados ausentes. Com Paulo.', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2026-04-06');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:06cee8ba-950e-82c4-bc1f-818e3e8faabb')::uuid, null,
          'Cobrar Anderson (envio de dados) e entender motivos de atraso', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2026-03-16');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:133ee8ba-950e-828e-884c-81299ab92227')::uuid, null,
          'Revisão inventário 2023 após anotações Caio', null, 'nao_iniciada', 'consultoria',
          'Inventário GEE [Apsis]', date '2026-04-06');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:96eee8ba-950e-82b2-8963-8112c10b3f95')::uuid, null,
          'Reviar cronograma e encaixar estratégia de descarbonização', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:3faee8ba-950e-8305-b4ad-81e62f83f3c9')::uuid, null,
          'Listar ressalvas das informações presentes no relatório. Explicar impossibilidade de auditoria.', null, 'concluida', 'consultoria',
          'Inventário GEE[Cosmos 3D]', null);
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:a37ee8ba-950e-82e2-91cf-813d815acd52')::uuid, null,
          'BAckup RAS 2024', null, 'concluida', 'consultoria',
          'RAS[CTA]', date '2026-03-30');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:9d7ee8ba-950e-83a2-9763-812a1afcad4b')::uuid, null,
          'Verificar pagamento', null, 'em_andamento', 'consultoria',
          'Inventário GEE[Cosmos 3D]', date '2026-03-23');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:1acee8ba-950e-829b-8646-813d57f45c35')::uuid, null,
          'Verificar com Angela e Leila a configuração do servidor', null, 'concluida', 'consultoria',
          'Materialidade [CTA]', date '2026-03-30');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:b6cee8ba-950e-8305-94f8-814ced11330b')::uuid, null,
          'Verificar necessidade de ASO, EPI.', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', date '2026-03-16');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:723ee8ba-950e-824c-9529-812d32530e51')::uuid, null,
          'verificar o que falta para CC e CE. Informar a outras áreas hoje', null, 'concluida', 'consultoria',
          'Diagnóstico IFRS S1 e S2 [Aço Verde Brasil]', date '2026-03-16');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:fa2ee8ba-950e-83b1-847a-019821ebfb6b')::uuid, null,
          'Revisar 2023', null, 'concluida', 'consultoria',
          'Inventário GEE [Apsis]', date '2026-03-16');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:cb5ee8ba-950e-83b9-b58b-8154bac96596')::uuid, null,
          'Verificar estratégia de descarbonização anterior', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2026-03-16');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:123ee8ba-950e-8343-af51-01b9410b596a')::uuid, null,
          'Comparar dados do transporte de tabaco e iniciar planilha de dados.', null, 'concluida', 'consultoria',
          'Inventário GEE[CTA]', date '2026-03-16');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:dbcee8ba-950e-83bf-8292-81a471e42d3e')::uuid, null,
          'Elaborar diretriz técnica para execução de relatório pela parte da Carbon', null, 'nao_iniciada', 'consultoria',
          'Diagnóstico IFRS S1 e S2 [Aço Verde Brasil]', date '2026-03-09');
  insert into public.carbon_atividades
    (id, projeto_id, nome, descricao, status, tipo, projeto_externo, data_fim)
  values (md5('atividade:todo:382ee8ba-950e-828d-85e3-012e76ae0b12')::uuid, null,
          'Reunião com MV e GS: verificar pastas', null, 'concluida', 'consultoria',
          'Emissão no MDL [J6 Energia]', null);

end $$;

-- Conferencia contra o medido na origem.
do $$
declare
  n_reun integer;
  n_ativ integer;
  n_proj integer;
  n_titulo_velho integer;
begin
  select count(*) into n_reun from public.carbon_reunioes
   where projeto_id is null and teams_evento_id is null;

  select count(*) into n_ativ from public.carbon_atividades;
  select count(distinct projeto_externo) into n_proj from public.carbon_atividades
   where projeto_externo is not null;

  -- O titulo antigo nao existe no Notion: se sobrou, a carga velha resistiu.
  select count(*) into n_titulo_velho from public.carbon_reunioes
   where titulo = 'Weekly Apsis Carbon';

  raise notice 'reunioes de backoffice: %, atividades: % em % trabalhos', n_reun, n_ativ, n_proj;

  if n_reun <> 93 then
    raise exception 'esperado 93 reunioes de backoffice, encontrado %', n_reun;
  end if;
  if n_ativ <> 386 then
    raise exception 'esperado 386 atividades, encontrado %', n_ativ;
  end if;
  if n_titulo_velho > 0 then
    raise exception '% reunioes com o titulo antigo "Weekly Apsis Carbon"', n_titulo_velho;
  end if;
end $$;

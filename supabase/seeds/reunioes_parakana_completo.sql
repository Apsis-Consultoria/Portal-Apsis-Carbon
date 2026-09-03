-- =============================================================================
-- Apsis Carbon - as reunioes do Parakana, base completa do Notion
-- Arquivo: supabase/seeds/reunioes_parakana_completo.sql
-- Gerado por: scripts/gerar-seed-reunioes-parakana.mjs (nao edite a mao)
-- Fonte: docs/notion/dados/reunioes-parakana-bruto.json, lido ao vivo do Notion em 26/08/2026
-- =============================================================================
-- DOIS DEFEITOS QUE ISTO CONSERTA.
--
-- 1) FALTAVAM 61 REUNIOES. A base "Reunioes periodicas" do Notion tem 106 linhas
--    e o banco tinha 45. A leitura anterior parou no corte de exibicao da
--    pagina, sem conferir o contador do rodape - a mesma armadilha que ja tinha
--    mordido as reunioes do backoffice e os findings da VVB. Conferido por data:
--    29 datas existiam no Notion e nao no banco, e nenhuma data do banco estava
--    fora do Notion.
--
-- 2) OS TITULOS ESTAVAM SEM ACENTO. No banco: "Reuniao Semanal Parakana". No
--    Notion: "Reuniao Semanal Parakana" com til e circunflexo. Parece cosmetico
--    e nao e: quem procura na tela por "Parakana" acentuado nao achava nada, e a
--    conferencia contra a origem acusava 45 divergencias que eram so grafia.
--
-- SUBSTITUICAO, e nao acrescimo: as 45 linhas antigas tem grafia diferente,
-- entao somar as 106 criaria par duplicado em 44 datas. E seguro porque nenhuma
-- reuniao de projeto tem ata ou evento do Teams pendurado (conferido antes).
-- As reunioes do backoffice, que sao as de projeto_id nulo, nao sao tocadas.
--
-- 5 LINHAS FICARAM DE FORA: n 11, 29, 30, 33, 45. Sao linhas em branco no Notion,
-- sem data e sem nome. `data` e `titulo` sao NOT NULL, e com razao: reuniao sem
-- data nao entra em cadencia nenhuma.
--
-- TIPO E PARCEIRO SAEM DO TITULO porque no Notion nao existe coluna para eles -
-- e esse e exatamente o defeito que a tela conserta. O padrao e
-- "Reuniao Semanal Parakana - <PARCEIRO>".
--
-- PENDENCIAS: a base "BD - TD Parakana" nunca tinha sido aberta. Sao 14 itens,
-- 14 deles com reuniao correspondente na mesma data. Cada um entra pendurado
-- na ata daquela reuniao, criada aqui SEM conteudo: a ata existe (a reuniao
-- aconteceu e gerou pendencia), o texto dela e que ainda nao foi extraido.
--
-- LGPD: a coluna `Responsavel` do Notion tem nome de pessoa fisica e NAO foi
-- extraida. O banco guarda responsavel como chave estrangeira para
-- carbon_usuarios, nunca como texto, entao o campo fica nulo ate alguem
-- associar pela tela. Os titulos das reunioes foram conferidos: nenhum contem
-- nome de pessoa.
--
-- Ids derivados do id do bloco no Notion: reaplicar nao duplica.
-- =============================================================================

do $$
declare
  v_projeto uuid;
begin
  select id into v_projeto from public.carbon_projetos where nome = 'Awaete REDD+' limit 1;
  if v_projeto is null then
    raise exception 'projeto "Awaete REDD+" nao encontrado; rode antes projeto_awaete.sql';
  end if;

  -- Limpa a carga anterior do projeto. Atas e pendencias caem por cascade.
  delete from public.carbon_reunioes where projeto_id = v_projeto;

  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:395ee8ba-950e-800b-b073-ebdcb269633a')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2026-07-06', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:38eee8ba-950e-809f-9261-c28d51b0faa6')::uuid, v_projeto, 'tematica', 'Reunião - FAQ Parakanã', date '2026-06-30', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:38fee8ba-950e-8097-af75-dc2830ee46c3')::uuid, v_projeto, 'governanca', 'Reunião de Alinhamento Operacional e de Governança', date '2026-06-26', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:387ee8ba-950e-80e6-9e48-dbc7920d2610')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2026-06-22', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:379ee8ba-950e-8084-863c-d388c4eb7d71')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2026-06-08', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:36bee8ba-950e-80de-bcd8-c8b32e47a9eb')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2026-05-25', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:356ee8ba-950e-806b-9de7-e222408e823d')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2026-05-04', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:317ee8ba-950e-8065-b634-f8652b7f7c13')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2026-03-02', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:310ee8ba-950e-8085-bc19-d844d5adf364')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2026-02-23', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2f4ee8ba-950e-8042-8780-eb308240d7a5')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2026-01-26', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2efee8ba-950e-806d-9b4e-e822f0e43201')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2026-01-21', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2e6ee8ba-950e-8076-b258-c9922436358d')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2026-01-12', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2c3ee8ba-950e-8071-abd0-d689dfc29d97')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-12-08', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2bcee8ba-950e-80d5-89c9-fd246cf3c0c0')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-12-01', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2b7ee8ba-950e-80ae-bda2-ddca4b6d0ca2')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-11-26', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2a7ee8ba-950e-8090-a281-ec99de489267')::uuid, v_projeto, 'semanal_parceiro', 'Reunião Semanal Parakanã - INDEVA', date '2025-11-10', 'INDEVA');
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2a7ee8ba-950e-8003-abae-e7d23b711061')::uuid, v_projeto, 'semanal_parceiro', 'Reunião Semanal Parakanã - IPES', date '2025-11-10', 'IPES');
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:292ee8ba-950e-8034-a1dc-c974ec37043d')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-10-20', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:28bee8ba-950e-8079-b524-c7ffcba29695')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-10-13', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:286ee8ba-950e-8002-b95a-e494ce2fede4')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-10-08', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:277ee8ba-950e-8046-998d-dc39ecdc6266')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-09-23', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:26fee8ba-950e-809a-a360-e975367757f2')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-09-15', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:268ee8ba-950e-801c-8435-e7f8fae66d79')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-09-08', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:261ee8ba-950e-8008-9bb9-f05c9effbbbb')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-09-01', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:253ee8ba-950e-8048-b3bf-da0334b0ddec')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-08-18', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:24cee8ba-950e-807e-83a9-ed6ed62e840f')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-08-11', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:23eee8ba-950e-80c2-b693-e06ff71fad7a')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-07-28', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:222ee8ba-950e-803e-a9f5-fae140eb4dea')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-06-30', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:21bee8ba-950e-806d-95d7-ce78d6ec7025')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-06-23', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:214ee8ba-950e-8035-8f81-f89da41e2b8c')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-06-16', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:20dee8ba-950e-801e-83ec-fab3c643f31b')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-06-09', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:206ee8ba-950e-80fb-a033-cb37c35c87d0')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-06-02', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1ffee8ba-950e-8012-9296-ca7c8f30fe29')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-05-26', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1faee8ba-950e-80e9-893a-d55c644c49e4')::uuid, v_projeto, 'governanca', 'Reunião - Modelo de governança', date '2025-05-21', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1f8ee8ba-950e-802e-a8ae-f9d6658964a1')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-05-19', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1f2ee8ba-950e-80f7-869b-cad56b53199b')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-05-13', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1eaee8ba-950e-80a3-8d72-e44fc14eb274')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-05-05', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1e3ee8ba-950e-8020-ace9-c100b0157510')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-04-28', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1d5ee8ba-950e-80e0-938b-f869c0431adc')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-04-14', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1d2ee8ba-950e-8017-b4f5-c29805e87c1f')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-04-11', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1c3ee8ba-950e-80bd-ad9a-d264c3989b1c')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-03-27', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1b9ee8ba-950e-8076-9dba-e34de1af9ade')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-03-17', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1b2ee8ba-950e-8014-8ced-d8ff31c45723')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-03-10', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1a5ee8ba-950e-8069-8ca6-ee8c33032eb8')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-02-25', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:19fee8ba-950e-8191-b2d8-ca0837ca19c4')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-02-12', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:19fee8ba-950e-816d-b1a9-f9376941fca6')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-02-03', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:19fee8ba-950e-815a-b392-e7163ea39c99')::uuid, v_projeto, 'tematica', 'Reunião Apsis - Nova Terra', date '2025-01-28', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:19fee8ba-950e-8167-a66b-f585fd34cd64')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-01-27', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:19fee8ba-950e-81c6-b261-da519d63fe1b')::uuid, v_projeto, 'tematica', 'Reunião Mensal- Monitoramento', date '2025-01-16', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:19fee8ba-950e-81e0-a8a3-f1b13a723b69')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-01-06', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:19fee8ba-950e-811b-8a96-cbb5f59a6988')::uuid, v_projeto, 'tematica', 'Reunião um grau e meio', date '2025-01-09', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:19fee8ba-950e-810a-b46c-db29c24444c2')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-01-21', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:19fee8ba-950e-810e-ac03-cef797633540')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-01-27', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:19fee8ba-950e-816f-ba3a-f4aa0562f9b2')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-01-14', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:19fee8ba-950e-81e2-be20-dd314706f11e')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-02-03', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:19fee8ba-950e-81d3-98ec-e018c967f05d')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-02-10', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1a4ee8ba-950e-81b7-82c8-dc9a289a5a01')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-02-24', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:19fee8ba-950e-81d6-a804-c8a296c2d422')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-02-17', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1b2ee8ba-950e-8162-a6fc-e55f4e5b1fff')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-03-10', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1abee8ba-950e-81e2-9bd3-d40681d475ce')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-03-03', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1b9ee8ba-950e-81c4-b79a-dc31d232c983')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-03-17', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1c0ee8ba-950e-8156-a3dc-e50086c0f0dc')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-03-24', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1ceee8ba-950e-810a-b363-e974bb580dc3')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-04-07', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1c7ee8ba-950e-8162-92a8-cbdcf58ebdf2')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-03-31', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1d5ee8ba-950e-8102-a546-ed4831f6e590')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-04-14', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1e3ee8ba-950e-8190-8419-c7b79dee1b1d')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-04-28', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1dcee8ba-950e-8128-86d8-ee61674e999a')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-04-21', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1eaee8ba-950e-810d-9ba1-c36f758f0b2f')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-05-05', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1f1ee8ba-950e-8152-bfbc-eb26f5053325')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-05-12', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1f2ee8ba-950e-80a9-a856-dd35b0f5e480')::uuid, v_projeto, 'tematica', 'Reunião [P865] Parakanã', date '2025-05-13', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1f2ee8ba-950e-8086-9c0f-c7ec15d020db')::uuid, v_projeto, 'tematica', 'Reunião Perspectivas', date '2025-05-13', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1f8ee8ba-950e-812a-8c49-d500e891add0')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-05-19', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:1ffee8ba-950e-812e-91ed-ef89672d3399')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-05-26', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:206ee8ba-950e-81ea-8e54-df4e1e429c00')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-06-02', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:20dee8ba-950e-812c-8e98-e108e1f4cb44')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-06-09', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:214ee8ba-950e-8156-8eb4-e5c488d3b349')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-06-16', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:21bee8ba-950e-813a-983d-f912d2c43faa')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-06-23', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2a7ee8ba-950e-8134-9be7-d59b20011824')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-11-10', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2a0ee8ba-950e-816c-ae98-e448cc19b166')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-11-03', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:299ee8ba-950e-8108-94e1-f235585662d3')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-10-27', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:299ee8ba-950e-801f-9a1f-fa51a130f43e')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-10-27', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:292ee8ba-950e-81ca-ba72-eacb09715ca2')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-10-20', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:28bee8ba-950e-81ab-af35-ec6a7e478dd0')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-10-13', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:284ee8ba-950e-81f7-8476-c74d66f107b2')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-10-06', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:27dee8ba-950e-81bc-8cec-f368da5a7151')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-09-29', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:276ee8ba-950e-813c-bda3-ffc274ec4017')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-09-22', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:26fee8ba-950e-8182-b505-cfab95c84fea')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-09-15', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:268ee8ba-950e-81cd-8476-f1ba604f058f')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-09-08', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:261ee8ba-950e-8105-851f-f6f68f1cdcdd')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-09-01', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:25aee8ba-950e-818b-8112-e000fa420786')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-08-25', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:253ee8ba-950e-8169-978a-e16007de6a84')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-08-18', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:24cee8ba-950e-8157-b275-cb560837702a')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-08-11', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:245ee8ba-950e-817a-89e2-cc12ec97115c')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-08-04', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:23eee8ba-950e-81ab-980c-ff508132e499')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-07-28', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:237ee8ba-950e-81a4-9ff8-fe08f11df1b5')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-07-21', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:230ee8ba-950e-8122-a5ff-ff4b4f867eff')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-07-14', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:229ee8ba-950e-81f0-b033-e6b3513f5a23')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-07-07', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:222ee8ba-950e-81bd-9d34-ee9da4822c5e')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-06-30', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2bcee8ba-950e-8106-8d75-e0dc76cd4b2e')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-12-01', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2b5ee8ba-950e-8131-b8c6-c62482e10dde')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-11-24', null);
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2aeee8ba-950e-8123-a59e-fd64e3ca52d9')::uuid, v_projeto, 'semanal', 'Reunião Semanal Parakanã', date '2025-11-17', null);

  -- ===== Pendencias da base "BD - TD Parakana" ==============================
  -- A ata nasce vazia de proposito: ela e o vinculo exigido pelo esquema
  -- (pendencia pertence a ata, ata pertence a reuniao) e o texto dela ainda nao
  -- foi extraido do corpo da pagina do Notion.
  insert into public.carbon_atas (id, reuniao_id)
  select md5('ata:parakana:2025-12-01')::uuid, id from public.carbon_reunioes
   where projeto_id = v_projeto and data = date '2025-12-01'
   order by criado_em limit 1
  on conflict (reuniao_id) do nothing;
  insert into public.carbon_atas (id, reuniao_id)
  select md5('ata:parakana:2026-07-06')::uuid, id from public.carbon_reunioes
   where projeto_id = v_projeto and data = date '2026-07-06'
   order by criado_em limit 1
  on conflict (reuniao_id) do nothing;
  insert into public.carbon_atas (id, reuniao_id)
  select md5('ata:parakana:2026-06-22')::uuid, id from public.carbon_reunioes
   where projeto_id = v_projeto and data = date '2026-06-22'
   order by criado_em limit 1
  on conflict (reuniao_id) do nothing;
  insert into public.carbon_atas (id, reuniao_id)
  select md5('ata:parakana:2026-06-08')::uuid, id from public.carbon_reunioes
   where projeto_id = v_projeto and data = date '2026-06-08'
   order by criado_em limit 1
  on conflict (reuniao_id) do nothing;
  insert into public.carbon_atas (id, reuniao_id)
  select md5('ata:parakana:2026-02-23')::uuid, id from public.carbon_reunioes
   where projeto_id = v_projeto and data = date '2026-02-23'
   order by criado_em limit 1
  on conflict (reuniao_id) do nothing;
  insert into public.carbon_atas (id, reuniao_id)
  select md5('ata:parakana:2026-01-21')::uuid, id from public.carbon_reunioes
   where projeto_id = v_projeto and data = date '2026-01-21'
   order by criado_em limit 1
  on conflict (reuniao_id) do nothing;
  insert into public.carbon_atas (id, reuniao_id)
  select md5('ata:parakana:2026-01-12')::uuid, id from public.carbon_reunioes
   where projeto_id = v_projeto and data = date '2026-01-12'
   order by criado_em limit 1
  on conflict (reuniao_id) do nothing;
  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:2beee8ba-950e-8020-a42c-c10118cd9d6b')::uuid, md5('ata:parakana:2025-12-01')::uuid,
          'Reunião - Apsis, IPES e Sindicato de Produtores Rurais - Vizinhos Amigos', true, now());
  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:395ee8ba-950e-80af-8193-ff10f26b6a95')::uuid, md5('ata:parakana:2026-07-06')::uuid,
          'Marcar reunião para inventário socioambiental', false, null);
  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:395ee8ba-950e-80db-8d98-c85da05dab39')::uuid, md5('ata:parakana:2026-07-06')::uuid,
          'Definir datas das atividades roça e rondas', false, null);
  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:387ee8ba-950e-80db-9d34-dca8cd2ad778')::uuid, md5('ata:parakana:2026-06-22')::uuid,
          'Reservas de hotéis para agronomos', false, null);
  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:379ee8ba-950e-8051-ab35-d5b214424f0a')::uuid, md5('ata:parakana:2026-06-08')::uuid,
          'Orçamentos das rondas de roça', true, now());
  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:379ee8ba-950e-80dd-90fc-d70c2f18ce18')::uuid, md5('ata:parakana:2026-06-08')::uuid,
          'Zé Carlos enviar perguntas e fazermos formulário online', true, now());
  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:310ee8ba-950e-8062-b81e-ccfbfb3609b3')::uuid, md5('ata:parakana:2026-02-23')::uuid,
          'Marcone confirmar data da visita dos advogados para escritório Rio', true, now());
  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:2efee8ba-950e-80fa-8132-ef52a5bd5013')::uuid, md5('ata:parakana:2026-01-21')::uuid,
          'Dona [P469] visitará Xataopawa no sabado', true, now());
  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:2efee8ba-950e-80b9-aa6b-df8c388df31b')::uuid, md5('ata:parakana:2026-01-21')::uuid,
          'Verificar com Jurídico Apsis um TErmo de cooperação técnica com empresa do PBA', true, now());
  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:2e6ee8ba-950e-805b-8903-c4f42d9b99e9')::uuid, md5('ata:parakana:2026-01-12')::uuid,
          'Capacitação e utilização das plataformas da NovaTerra para análise por satélite da TI', true, now());
  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:2e6ee8ba-950e-80aa-9df7-f4a82aab0a68')::uuid, md5('ata:parakana:2026-01-12')::uuid,
          'Levantamento das aldeias que estão colhendo castanha - GB', true, now());
  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:2c3ee8ba-950e-80f2-aa3b-c80d342ee2fa')::uuid, md5('ata:parakana:2026-01-12')::uuid,
          'Finalização do Cronograma de visitas/reuniões (SEDAP, IDEFLOR, consultoria contratada para o PDA)', true, now());
  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:2c3ee8ba-950e-8005-9b79-fca56a6d928d')::uuid, md5('ata:parakana:2025-12-01')::uuid,
          'Nota de esclarecimento às associações sobre situação dos repasses financeiros', true, now());
  insert into public.carbon_ata_pendencias (id, ata_id, descricao, concluida, concluida_em)
  values (md5('pendencia:parakana:2beee8ba-950e-80b0-89fd-c7caf92d79e9')::uuid, md5('ata:parakana:2025-12-01')::uuid,
          'Reunião - Planejamento das atividades 2026', true, now());

end $$;

-- Conferencia: falha alto se a carga sair diferente da origem.
do $$
declare
  n_reun integer;
  n_atas integer;
  n_pend integer;
  n_sem_acento integer;
begin
  select count(*) into n_reun from public.carbon_reunioes r
    join public.carbon_projetos p on p.id = r.projeto_id where p.nome = 'Awaete REDD+';

  select count(*) into n_atas from public.carbon_atas a
    join public.carbon_reunioes r on r.id = a.reuniao_id
    join public.carbon_projetos p on p.id = r.projeto_id where p.nome = 'Awaete REDD+';

  select count(*) into n_pend from public.carbon_ata_pendencias;

  -- Se sobrou titulo sem acento, a carga velha nao foi substituida.
  select count(*) into n_sem_acento from public.carbon_reunioes r
    join public.carbon_projetos p on p.id = r.projeto_id
   where p.nome = 'Awaete REDD+' and r.titulo like '%Parakana%';

  raise notice 'reunioes do projeto: %, atas: %, pendencias: %', n_reun, n_atas, n_pend;

  if n_reun <> 101 then
    raise exception 'esperado 101 reunioes, encontrado %', n_reun;
  end if;
  if n_pend <> 14 then
    raise exception 'esperado 14 pendencias, encontrado %', n_pend;
  end if;
  if n_sem_acento > 0 then
    raise exception '% reunioes com titulo sem acento: a carga velha sobreviveu', n_sem_acento;
  end if;
end $$;

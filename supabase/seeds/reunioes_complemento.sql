-- =============================================================================
-- Apsis Carbon - reunioes que o "Load more" do Notion escondia
-- Arquivo: supabase/seeds/reunioes_complemento.sql
-- =============================================================================
-- A base de reunioes da Apsis tem 93 linhas; a primeira carga leu as 50 que a
-- pagina mostra sem clicar em "Load more" e parou em 15/09/2025. Este arquivo
-- completa: 31 semanais de volta ate 06/01/2025 e 9 reunioes nomeadas
-- (prospeccoes e onboarding) que nao apareciam.
--
-- LICAO REGISTRADA: extracao de tabela do Notion por texto de pagina precisa
-- conferir o contador VALUES do rodape contra o numero de linhas lidas. 50 e o
-- corte padrao de exibicao, nao o tamanho da base.
--
-- LGPD: dois titulos originais continham nome de pessoa e entram reduzidos a
-- Terra Indigena. Idempotente (id por md5 do conteudo).
-- =============================================================================


insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-09-08')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-09-08')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-09-01')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-09-01')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-08-25')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-08-25')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-08-18')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-08-18')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-08-11')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-08-11')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-08-04')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-08-04')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-07-28')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-07-28')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-07-21')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-07-21')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-07-14')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-07-14')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-07-08')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-07-08')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-06-23')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-06-23')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-06-16')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-06-16')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-06-09')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-06-09')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-06-02')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-06-02')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-05-26')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-05-26')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-05-19')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-05-19')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-05-12')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-05-12')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-04-28')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-04-28')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-04-07')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-04-07')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-03-31')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-03-31')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-03-24')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-03-24')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-03-17')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-03-17')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-03-06')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-03-06')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-02-24')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-02-24')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-02-17')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-02-17')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-02-10')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-02-10')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-02-03')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-02-03')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-01-27')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-01-27')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-01-21')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-01-21')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-01-13')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-01-13')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data)
values (md5('reuniao:apsis:2025-01-06')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-01-06')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data, parceiro)
values (md5('reuniao:apsis:2025-05-16:' || 'Reunião Fortech')::uuid, 'tematica', 'Reunião Fortech', date '2025-05-16', 'Fortech')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data, parceiro)
values (md5('reuniao:apsis:2025-05-07:' || 'Reunião Iquantic')::uuid, 'tematica', 'Reunião Iquantic', date '2025-05-07', 'Iquantic')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data, parceiro)
values (md5('reuniao:apsis:2025-05-02:' || 'Reunião TI Koatinemo')::uuid, 'tematica', 'Reunião TI Koatinemo', date '2025-05-02', null)
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data, parceiro)
values (md5('reuniao:apsis:2025-05-02:' || 'Reunião Bee2Be')::uuid, 'tematica', 'Reunião Bee2Be', date '2025-05-02', 'Bee2Be')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data, parceiro)
values (md5('reuniao:apsis:2025-04-30:' || 'Reunião DINC')::uuid, 'tematica', 'Reunião DINC', date '2025-04-30', 'DINC')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data, parceiro)
values (md5('reuniao:apsis:2025-03-28:' || 'Reunião TI São Marcos e Pimentel Barbosa')::uuid, 'tematica', 'Reunião TI São Marcos e Pimentel Barbosa', date '2025-03-28', null)
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data, parceiro)
values (md5('reuniao:apsis:2025-02-14:' || 'Reunião TI São Marcos')::uuid, 'tematica', 'Reunião TI São Marcos', date '2025-02-14', null)
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data, parceiro)
values (md5('reuniao:apsis:2025-01-09:' || 'MSCI onboarding')::uuid, 'tematica', 'MSCI onboarding', date '2025-01-09', 'MSCI')
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

insert into public.carbon_reunioes (id, tipo, titulo, data, parceiro)
values (md5('reuniao:apsis:2025-01-06:' || 'Reunião Semanal Comercial')::uuid, 'semanal', 'Reunião Semanal Comercial', date '2025-01-06', null)
on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

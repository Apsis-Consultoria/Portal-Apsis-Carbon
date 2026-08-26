-- =============================================================================
-- Apsis Carbon - dados REAIS lidos das telas do Notion
-- Arquivo: supabase/seeds/notion_dados_reais.sql
-- =============================================================================
-- GERADO POR scripts/gerar-seed-notion.py A PARTIR DE
-- docs/notion/dados/coleta-25-08.json. Nao edite a mao: a proxima geracao
-- desfaz. Para mudar, mude a coleta e rode o script.
--
-- DE ONDE VEM. Leitura ao vivo do Notion em 25/08/2026, pelo navegador do dono.
-- Os arquivos 01 a 19 de docs/notion/ descrevem a ESTRUTURA das paginas e foram
-- extraidos ja anonimizados em 11/08 - eles NAO tinham os registros. Estes tem.
--
-- LGPD, E ISTO NAO E FORMALIDADE:
--
--   carbon_visitas - as colunas contato_nome, contato_telefone e contato_email
--   ficam NULL. A origem tinha as tres preenchidas em 17 linhas, com nome de
--   pessoa, celular e e-mail. Nao foram importadas. A tabela ACEITA esses
--   campos e tem retencao_ate e anonimizado_em justamente para isso: quem tem
--   a base pode preencher pela tela, sob a politica de retencao da empresa, o
--   que e diferente de uma carga em massa feita por um script.
--
--   Uma 18a visita foi descartada por inteiro: o campo Organizacao era o nome
--   de uma pessoa fisica, e nao havia como anonimizar sem apagar o registro.
--
--   carbon_compradores - o unico comprador da origem tinha e-mail pessoal
--   (dominio hotmail). Nao importado.
--
--   Findings - os campos de acao e comentario citavam primeiro nome de
--   colaborador. Trocados por referencia de papel na coleta.
--
-- DEPENDE das migrations ate 20260825140000 e do projeto criado por
-- supabase/seeds/projeto_awaete.sql.
--
-- IDEMPOTENTE: id derivado do conteudo por md5, entao rodar de novo atualiza.
-- =============================================================================

do $$
declare
  v_projeto uuid;
begin
  select id into v_projeto
    from public.carbon_projetos
   where nome ilike '%parakan%' or nome ilike '%awaet%'
   order by criado_em
   limit 1;

  if v_projeto is null then
    raise exception 'Projeto do Parakana nao encontrado. Rode supabase/seeds/projeto_awaete.sql antes.';
  end if;

  -- ----------------------------------------------------------------------
  -- Fornecedores (Notion: Cadastro de Fornecedores)
  -- ----------------------------------------------------------------------
  insert into public.carbon_fornecedores (id, nome, status_contratacao)
  values (md5('forn:Canto Bueno')::uuid, 'Canto Bueno', 'concluida')
  on conflict (id) do update set
    nome = excluded.nome, status_contratacao = excluded.status_contratacao,
    atualizado_em = now();
  insert into public.carbon_fornecedores (id, nome, status_contratacao)
  values (md5('forn:Zabotto Ambiental')::uuid, 'Zabotto Ambiental', 'concluida')
  on conflict (id) do update set
    nome = excluded.nome, status_contratacao = excluded.status_contratacao,
    atualizado_em = now();
  insert into public.carbon_fornecedores (id, nome, status_contratacao)
  values (md5('forn:Ipes')::uuid, 'Ipes', 'em_andamento')
  on conflict (id) do update set
    nome = excluded.nome, status_contratacao = excluded.status_contratacao,
    atualizado_em = now();
  insert into public.carbon_fornecedores (id, nome, status_contratacao)
  values (md5('forn:Indeva')::uuid, 'Indeva', 'em_andamento')
  on conflict (id) do update set
    nome = excluded.nome, status_contratacao = excluded.status_contratacao,
    atualizado_em = now();
  insert into public.carbon_fornecedores (id, nome, status_contratacao)
  values (md5('forn:PWPB')::uuid, 'PWPB', 'nao_iniciada')
  on conflict (id) do update set
    nome = excluded.nome, status_contratacao = excluded.status_contratacao,
    atualizado_em = now();
  insert into public.carbon_fornecedores (id, nome, status_contratacao)
  values (md5('forn:Nova Terra')::uuid, 'Nova Terra', 'nao_iniciada')
  on conflict (id) do update set
    nome = excluded.nome, status_contratacao = excluded.status_contratacao,
    atualizado_em = now();

  -- ----------------------------------------------------------------------
  -- Contrato e parcelas (Notion: cadastro de parcelas)
  -- ----------------------------------------------------------------------
  insert into public.carbon_contratos
    (id, fornecedor_id, objeto, valor_total, centro_custo, tipo_servico, status, data_contratacao)
  values (md5('contrato:PWPB:Apoio Juridico')::uuid, md5('forn:PWPB')::uuid, 'Apoio Juridico', 60000, 'Juridico',
          'Apoio Juridico', 'ativo', date '2025-01-07')
  on conflict (id) do update set
    valor_total = excluded.valor_total, atualizado_em = now();
  insert into public.carbon_parcelas
    (id, contrato_id, numero, valor, vencimento, data_pagamento, tipo_servico, centro_custo)
  values (md5('parcela:PWPB:2025-01-07')::uuid, md5('contrato:PWPB:Apoio Juridico')::uuid, 1, 10000,
          date '2025-01-07', date '2025-01-07',
          'Apoio Jurídico', 'Jurídico')
  on conflict (id) do update set
    valor = excluded.valor, data_pagamento = excluded.data_pagamento, atualizado_em = now();
  insert into public.carbon_parcelas
    (id, contrato_id, numero, valor, vencimento, data_pagamento, tipo_servico, centro_custo)
  values (md5('parcela:PWPB:2025-02-07')::uuid, md5('contrato:PWPB:Apoio Juridico')::uuid, 2, 10000,
          date '2025-02-07', null,
          'Apoio Jurídico', 'Jurídico')
  on conflict (id) do update set
    valor = excluded.valor, data_pagamento = excluded.data_pagamento, atualizado_em = now();
  insert into public.carbon_parcelas
    (id, contrato_id, numero, valor, vencimento, data_pagamento, tipo_servico, centro_custo)
  values (md5('parcela:PWPB:2025-03-07')::uuid, md5('contrato:PWPB:Apoio Juridico')::uuid, 3, 10000,
          date '2025-03-07', null,
          'Apoio Jurídico', 'Jurídico')
  on conflict (id) do update set
    valor = excluded.valor, data_pagamento = excluded.data_pagamento, atualizado_em = now();
  insert into public.carbon_parcelas
    (id, contrato_id, numero, valor, vencimento, data_pagamento, tipo_servico, centro_custo)
  values (md5('parcela:PWPB:2025-04-07')::uuid, md5('contrato:PWPB:Apoio Juridico')::uuid, 4, 10000,
          date '2025-04-07', null,
          'Apoio Jurídico', 'Jurídico')
  on conflict (id) do update set
    valor = excluded.valor, data_pagamento = excluded.data_pagamento, atualizado_em = now();
  insert into public.carbon_parcelas
    (id, contrato_id, numero, valor, vencimento, data_pagamento, tipo_servico, centro_custo)
  values (md5('parcela:PWPB:2025-05-07')::uuid, md5('contrato:PWPB:Apoio Juridico')::uuid, 5, 10000,
          date '2025-05-07', null,
          'Apoio Jurídico', 'Jurídico')
  on conflict (id) do update set
    valor = excluded.valor, data_pagamento = excluded.data_pagamento, atualizado_em = now();
  insert into public.carbon_parcelas
    (id, contrato_id, numero, valor, vencimento, data_pagamento, tipo_servico, centro_custo)
  values (md5('parcela:PWPB:2025-06-06')::uuid, md5('contrato:PWPB:Apoio Juridico')::uuid, 6, 10000,
          date '2025-06-06', null,
          'Apoio Jurídico', 'Jurídico')
  on conflict (id) do update set
    valor = excluded.valor, data_pagamento = excluded.data_pagamento, atualizado_em = now();

  -- ----------------------------------------------------------------------
  -- Compradores (Notion: Compradores). E-mail pessoal NAO importado.
  -- ----------------------------------------------------------------------
  insert into public.carbon_compradores
    (id, nome, status, recorrente, sigiloso, observacoes)
  values (md5('comprador:Comprador sob NDA')::uuid, 'Comprador sob NDA', 'recorrente',
          true, true,
          'Registro sob NDA no Notion. O e-mail de contato da origem e de pessoa fisica e nao foi importado (LGPD).')
  on conflict (id) do update set
    nome = excluded.nome, recorrente = excluded.recorrente, atualizado_em = now();

  -- ----------------------------------------------------------------------
  -- Parceiros citados nas reunioes por parceiro
  -- ----------------------------------------------------------------------
  insert into public.carbon_parceiros (id, nome, tipo)
  values (md5('parceiro:INDEVA')::uuid, 'INDEVA', 'instituto')
  on conflict (id) do update set nome = excluded.nome, atualizado_em = now();
  insert into public.carbon_parceiros (id, nome, tipo)
  values (md5('parceiro:IPES')::uuid, 'IPES', 'instituto')
  on conflict (id) do update set nome = excluded.nome, atualizado_em = now();

  -- ----------------------------------------------------------------------
  -- Reunioes Apsis Carbon (weekly) e Reunioes Parakana
  -- ----------------------------------------------------------------------
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-08-24')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-08-24')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-08-17')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-08-17')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-08-10')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-08-10')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-08-03')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-08-03')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-07-27')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-07-27')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-07-20')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-07-20')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-07-13')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-07-13')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-07-06')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-07-06')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-06-29')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-06-29')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-06-22')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-06-22')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-06-15')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-06-15')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-06-08')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-06-08')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-06-01')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-06-01')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-05-25')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-05-25')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-05-18')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-05-18')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-05-11')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-05-11')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-05-04')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-05-04')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-04-27')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-04-27')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-04-20')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-04-20')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-04-13')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-04-13')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-04-06')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-04-06')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-03-30')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-03-30')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-03-23')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-03-23')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-03-16')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-03-16')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-03-09')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-03-09')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-03-02')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-03-02')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-02-23')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-02-23')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-02-09')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-02-09')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-02-02')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-02-02')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-01-26')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-01-26')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-01-19')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-01-19')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-01-12')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-01-12')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2026-01-05')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-01-05')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-12-29')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-12-29')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-12-22')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-12-22')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-12-15')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-12-15')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-12-08')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-12-08')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-12-01')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-12-01')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-11-24')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-11-24')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-11-17')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-11-17')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-11-10')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-11-10')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-11-03')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-11-03')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-10-27')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-10-27')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-10-20')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-10-20')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-10-13')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-10-13')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-10-06')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-10-06')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-09-29')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-09-29')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-09-22')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-09-22')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values (md5('reuniao:apsis:2025-09-15')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-09-15')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2026-07-06:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2026-07-06', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2026-06-22:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2026-06-22', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2026-06-08:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2026-06-08', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2026-05-25:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2026-05-25', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2026-05-04:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2026-05-04', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2026-03-02:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2026-03-02', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2026-02-23:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2026-02-23', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2026-01-26:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2026-01-26', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2026-01-21:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2026-01-21', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2026-01-12:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2026-01-12', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-12-08:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-12-08', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-12-01:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-12-01', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-11-26:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-11-26', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-10-20:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-10-20', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-10-13:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-10-13', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-10-08:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-10-08', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-09-23:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-09-23', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-09-15:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-09-15', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-09-08:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-09-08', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-09-01:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-09-01', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-08-18:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-08-18', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-08-11:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-08-11', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-07-28:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-07-28', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-06-30:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-06-30', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-06-23:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-06-23', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-06-16:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-06-16', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-06-09:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-06-09', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-06-02:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-06-02', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-05-26:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-05-26', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-05-19:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-05-19', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-05-13:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-05-13', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-05-05:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-05-05', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-04-28:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-04-28', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-04-14:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-04-14', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-04-11:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-04-11', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-03-27:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-03-27', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-03-17:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-03-17', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-03-10:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-03-10', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-02-25:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-02-25', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-02-12:Reuniao Semanal Parakana')::uuid, v_projeto,
          'semanal', 'Reuniao Semanal Parakana', date '2025-02-12', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2026-06-30:Reuniao - FAQ Parakana')::uuid, v_projeto,
          'tematica', 'Reuniao - FAQ Parakana', date '2026-06-30', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2026-06-26:Reuniao de Alinhamento Operacional e de Governanca')::uuid, v_projeto,
          'governanca', 'Reuniao de Alinhamento Operacional e de Governanca', date '2026-06-26', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-05-21:Reuniao - Modelo de governanca')::uuid, v_projeto,
          'governanca', 'Reuniao - Modelo de governanca', date '2025-05-21', null)
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-11-10:Reuniao Semanal Parakana - INDEVA')::uuid, v_projeto,
          'semanal_parceiro', 'Reuniao Semanal Parakana - INDEVA', date '2025-11-10', 'INDEVA')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();
  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values (md5('reuniao:parakana:2025-11-10:Reuniao Semanal Parakana - IPES')::uuid, v_projeto,
          'semanal_parceiro', 'Reuniao Semanal Parakana - IPES', date '2025-11-10', 'IPES')
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();

  -- ----------------------------------------------------------------------
  -- Atividades Apsis Carbon e Atividades Parakana
  -- ----------------------------------------------------------------------
  insert into public.carbon_atividades
    (id, nome, status, prioridade, tipo, data_inicio, data_fim, horas_planejadas)
  values (md5('atividade:apsis:Preparar proposta para Biosolvit')::uuid, 'Preparar proposta para Biosolvit',
          'em_andamento', 'baixa',
          'consultoria', date '2024-12-17', date '2025-01-10',
          2)
  on conflict (id) do update set status = excluded.status, atualizado_em = now();
  insert into public.carbon_atividades
    (id, nome, status, prioridade, tipo, data_inicio, data_fim, horas_planejadas)
  values (md5('atividade:apsis:EVTE Irmãos Salles')::uuid, 'EVTE Irmãos Salles',
          'em_andamento', 'media',
          'novos_negocios', date '2024-12-30', date '2025-01-10',
          10)
  on conflict (id) do update set status = excluded.status, atualizado_em = now();
  insert into public.carbon_atividades
    (id, nome, status, prioridade, tipo, data_inicio, data_fim, horas_planejadas)
  values (md5('atividade:apsis:Checklist oportunidades JPF')::uuid, 'Checklist oportunidades JPF',
          'em_andamento', 'alta',
          'jpf', date '2024-12-30', date '2025-01-10',
          1)
  on conflict (id) do update set status = excluded.status, atualizado_em = now();
  insert into public.carbon_atividades
    (id, nome, status, prioridade, tipo, data_inicio, data_fim, horas_planejadas)
  values (md5('atividade:apsis:Estudar TI Pimentel Barbosa')::uuid, 'Estudar TI Pimentel Barbosa',
          'em_andamento', 'media',
          'jpf', date '2024-12-30', date '2025-01-10',
          1)
  on conflict (id) do update set status = excluded.status, atualizado_em = now();
  insert into public.carbon_atividades
    (id, nome, status, prioridade, tipo, data_inicio, data_fim, horas_planejadas)
  values (md5('atividade:apsis:Organizar Notion')::uuid, 'Organizar Notion',
          'em_andamento', 'media',
          'backoffice', date '2025-01-06', date '2025-01-31',
          10)
  on conflict (id) do update set status = excluded.status, atualizado_em = now();
  insert into public.carbon_atividades
    (id, nome, status, prioridade, tipo, data_inicio, data_fim, horas_planejadas)
  values (md5('atividade:apsis:EVTE Pantanal')::uuid, 'EVTE Pantanal',
          'em_andamento', 'alta',
          'novos_negocios', date '2025-01-08', date '2025-01-10',
          5)
  on conflict (id) do update set status = excluded.status, atualizado_em = now();
  insert into public.carbon_atividades
    (id, projeto_id, nome, status, prioridade, tipo, data_fim)
  values (md5('atividade:parakana:Reorganizar pasta do VVB')::uuid, v_projeto, 'Reorganizar pasta do VVB',
          'nao_iniciada', 'alta',
          'jpf', date '2025-04-17')
  on conflict (id) do update set status = excluded.status, atualizado_em = now();
  insert into public.carbon_atividades
    (id, projeto_id, nome, status, prioridade, tipo, data_fim)
  values (md5('atividade:parakana:Fazer reuniao mensal fev e marco/25')::uuid, v_projeto, 'Fazer reuniao mensal fev e marco/25',
          'nao_iniciada', 'media',
          'jpf', date '2025-04-25')
  on conflict (id) do update set status = excluded.status, atualizado_em = now();

  -- ----------------------------------------------------------------------
  -- Viagens e visitas (Notion: Relatorio de Visitas). Contato NAO importado.
  -- ----------------------------------------------------------------------
  insert into public.carbon_viagens (id, titulo, cidade, data_inicio, data_fim)
  values (md5('viagem:Fortaleza')::uuid, 'Prospeccao Fortaleza', 'Fortaleza',
          date '2025-04-23', date '2025-04-24')
  on conflict (id) do update set data_fim = excluded.data_fim, atualizado_em = now();
  insert into public.carbon_viagens (id, titulo, cidade, data_inicio, data_fim)
  values (md5('viagem:São Paulo')::uuid, 'Prospeccao São Paulo', 'São Paulo',
          date '2026-08-05', date '2026-08-05')
  on conflict (id) do update set data_fim = excluded.data_fim, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:CCM Estruturas Fotovoltaicas:2025-04-24')::uuid, md5('viagem:Fortaleza')::uuid,
          'CCM Estruturas Fotovoltaicas', date '2025-04-24', 'nao_iniciado')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:Absolar:2025-04-24')::uuid, md5('viagem:Fortaleza')::uuid,
          'Absolar', date '2025-04-24', 'nao_iniciado')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:Canal Solar:2025-04-24')::uuid, md5('viagem:Fortaleza')::uuid,
          'Canal Solar', date '2025-04-24', 'nao_iniciado')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:Satel Brasil:2025-04-23')::uuid, md5('viagem:Fortaleza')::uuid,
          'Satel Brasil', date '2025-04-23', 'nao_iniciado')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:Perspectivas Comunicações:2025-04-23')::uuid, md5('viagem:Fortaleza')::uuid,
          'Perspectivas Comunicações', date '2025-04-23', 'em_andamento')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:Brasol:2025-04-23')::uuid, md5('viagem:Fortaleza')::uuid,
          'Brasol', date '2025-04-23', 'nao_iniciado')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:Ecológica:2025-04-23')::uuid, md5('viagem:Fortaleza')::uuid,
          'Ecológica', date '2025-04-23', 'em_andamento')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:Movimento Econômico:2025-04-23')::uuid, md5('viagem:Fortaleza')::uuid,
          'Movimento Econômico', date '2025-04-23', 'nao_iniciado')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:BMG Energia:2025-04-23')::uuid, md5('viagem:Fortaleza')::uuid,
          'BMG Energia', date '2025-04-23', 'em_andamento')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:FIEC:2025-04-23')::uuid, md5('viagem:Fortaleza')::uuid,
          'FIEC', date '2025-04-23', 'nao_iniciado')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:Siemens:2026-08-05')::uuid, md5('viagem:São Paulo')::uuid,
          'Siemens', date '2026-08-05', 'nao_iniciado')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:Sustentech:2026-08-05')::uuid, md5('viagem:São Paulo')::uuid,
          'Sustentech', date '2026-08-05', 'nao_iniciado')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:SOLOS:2026-08-05')::uuid, md5('viagem:São Paulo')::uuid,
          'SOLOS', date '2026-08-05', 'nao_iniciado')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:Bradesco:2026-08-05')::uuid, md5('viagem:São Paulo')::uuid,
          'Bradesco', date '2026-08-05', 'nao_iniciado')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:Green Era:2026-08-05')::uuid, md5('viagem:São Paulo')::uuid,
          'Green Era', date '2026-08-05', 'nao_iniciado')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:Itau BBA:2026-08-05')::uuid, md5('viagem:São Paulo')::uuid,
          'Itau BBA', date '2026-08-05', 'nao_iniciado')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();
  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values (md5('visita:BMA:2026-08-05')::uuid, md5('viagem:São Paulo')::uuid,
          'BMA', date '2026-08-05', 'nao_iniciado')
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();

  -- ----------------------------------------------------------------------
  -- Candidatos (Notion: Novos Negocios JPF)
  -- ----------------------------------------------------------------------
  insert into public.carbon_candidatos (id, nome, segmento, etapa, observacoes)
  values (md5('candidato:TI Pimentel Barbosa')::uuid, 'TI Pimentel Barbosa', 'terra_indigena', 'triagem', null)
  on conflict (id) do update set
    segmento = excluded.segmento, observacoes = excluded.observacoes, atualizado_em = now();
  insert into public.carbon_candidatos (id, nome, segmento, etapa, observacoes)
  values (md5('candidato:TI Parecis')::uuid, 'TI Parecis', 'terra_indigena', 'triagem', null)
  on conflict (id) do update set
    segmento = excluded.segmento, observacoes = excluded.observacoes, atualizado_em = now();
  insert into public.carbon_candidatos (id, nome, segmento, etapa, observacoes)
  values (md5('candidato:Flona Tapajos')::uuid, 'Flona Tapajos', 'redd_privado', 'triagem', 'Segmento mal classificado: e unidade de conservacao federal (Floresta Nacional), categoria que o enum de segmento ainda nao tem. Ficou com o valor padrao. Corrigir quando o enum ganhar a categoria.')
  on conflict (id) do update set
    segmento = excluded.segmento, observacoes = excluded.observacoes, atualizado_em = now();

  -- ----------------------------------------------------------------------
  -- Rodadas de auditoria e findings da VVB
  -- ----------------------------------------------------------------------
  insert into public.carbon_auditoria_rodadas (id, projeto_id, origem, numero)
  values (md5('rodada:vvb:1')::uuid, v_projeto, 'vvb', 1)
  on conflict (id) do nothing;
  insert into public.carbon_auditoria_rodadas (id, projeto_id, origem, numero)
  values (md5('rodada:vvb:2')::uuid, v_projeto, 'vvb', 2)
  on conflict (id) do nothing;
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:PD:ID - 01:1')::uuid, md5('rodada:vvb:1')::uuid, 'car', 'ID - 01', 1,
          'pdd', 'Section 2.1.16 - Project Zone Map and Project Location',
          '1. The project location including a set of geodetic coordinates is not displayed in the PDD. 2. Section 2.1.16 in PDD describes the Project Zone but does not display a proper map of the Project Zone as required by CCB Standard.', '1. Provide a set of geodetic coordinates of the project location according to CCB Standard requirements. 2. Provide a Project Zone map according to CCB Standard requirements.',
          'Planejado: 1. Incluir coordenadas da TI no PD. 2. Mapa que contenha as aldeias, os rios (HCVs Bio), cemiterios (HCV Comunidade), limites da TI e limites do buffer. Explicar antes do mapa que todo o territorio, de acordo com censo, e HCV para Biodiversidade, e as vilas onde esta a comunidade sao HCVs de cultura e locais sagrados.

Apurado: Item 1: incluida tabela com coordenadas de acordo com decreto que homologa a TI.',
          'fechado',
          'nao_aplicavel')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:MR:ID - 01:2')::uuid, md5('rodada:vvb:1')::uuid, 'cl', 'ID - 01', 2,
          'monitoramento', 'Section 1.1',
          'It is unclear how the GHG emission reduction, Conservation and Sustainable Use of the Forest, and Conservation of Threatened Species listed under Unique Project Benefits differ from the GHG emission reductions and removals, Forest Cover, and Biodiversity Conservation benefits described in Section 1.2 (Standardized Benefit Metrics).', 'PP is required to clarify how the benefits listed in Section 1.1 are unique to the project and how they differ from the standardized benefits outlined in Section 1.2.',
          null,
          'fechado',
          'pendente')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:MR:ID - 01:3')::uuid, md5('rodada:vvb:1')::uuid, 'car', 'ID - 01', 3,
          'monitoramento', null,
          'The scientific names throughout the MR are not following the ABNT NBR 10520/2002 (scientific names should contain the genus and species and should be written in italics).', 'PP is asked to review the scientific names throughout the MR and PDD.',
          'Planejado: Verificar os nomes que nao estao em italico.

Apurado: Conferencia secao a secao registrada na origem: da 1.1 a 5.3.2.1, todas marcadas OK.',
          'em_andamento',
          'nao_aplicavel')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:PD:ID - 01:4')::uuid, md5('rodada:vvb:1')::uuid, 'cl', 'ID - 01', 4,
          'pdd', 'Section 2.1.9 - Ownership',
          'In section 2.1.9 PP has defined the landownership of the Community and their rights to land and the agreement between community and the PP, but it lacks clarity over carbon credit ownership. 2nd round: The investment agreements for both the Upper and Lower groups were presented by the PP. However, the documents contain signatures only from indigenous representatives, with the signatures of Apsis Carbon representatives still missing. Additionally, the Technical Cooperation Agreements mention a different percentage distribution of credits to IPES and INDEVA, which requires further clarification.', 'PP shall clarify the ownership and distribution of the carbon credits in detail.',
          'Planejado: 1. Incluir que o PP tem contrato de divisao dos creditos de carbono, sem precisar incluir percentual. 2. Informar que o contrato foi passado para a VVB. 2a rodada: fornecer contrato de investimento assinado pela Apsis, ja solicitado ao juridico; contrato OK. Checar contratos com Ipes e Indeva e fornecer aditivos, que corrigem os percentuais.

Apurado: Ja existe termo de compromisso das associacoes sobre os 40 anos.',
          'em_andamento',
          'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:MR:ID - 02:5')::uuid, md5('rodada:vvb:1')::uuid, 'cl', 'ID - 02', 5,
          'monitoramento', 'Section 2.2.4',
          'It is unclear whether the increase in the number of villages from 28 to 31 is considered a project emission factor.', 'PP is required to clarify whether the establishment of new villages resulted in any emissions and, if so, whether these emissions were accounted for in the project emissions.',
          'Planejado: Plataforma de monitoramento: confirmar com o responsavel os valores de desmatamento total.

Apurado: Provavelmente nao ha evidencias. Dados de populacao pedidos ao parceiro em 23/05.',
          'respondido',
          'nao_aplicavel')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:MR:ID - 02:6')::uuid, md5('rodada:vvb:1')::uuid, 'car', 'ID - 02', 6,
          'monitoramento', 'Section 2.2.6.2',
          'The project zone map presented in Section 2.2.6.2 in MR does not fulfill CCB Standard requirements.', 'The PP is required to provide a project zone map that complies with CCB Standard requirements.',
          'Apurado: Como nao e um Grouped Project, o item foi retirado, conforme o template do VCS e comentario da VVB.',
          'fechado',
          'pendente')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:MR:ID - 03:7')::uuid, md5('rodada:vvb:2')::uuid, 'car', 'ID - 03', 7,
          'monitoramento', 'Section 2.5.5',
          'In MR Section 2.5.5, the section''s table was removed by PP. However, the template indicates that when no disputes are observed, the PP must fill in N/A and provide a description of the ongoing measures implemented to protect and preserve property rights.', 'The PP is required to restore the table and complete it in accordance with the template''s requirements.',
          'Planejado: Incluir tabela.',
          'aberto',
          'pendente')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:MR:ID - 04:8')::uuid, md5('rodada:vvb:2')::uuid, 'car', 'ID - 04', 8,
          'monitoramento', 'Entire MR',
          'There is information in other languages than English of figures and maps throughout the MR. According to the VCS Standard, all information provided in MR shall be written in English.', 'PP is required to review all information in the MR and adequate them to the language required by the VCS Standard.',
          'Planejado: Revisar figuras e tabelas.

Apurado: Conferencia registrada na origem: figuras 1 a 30 e tabelas 1 a 30 marcadas OK; tabelas 22, 23, 24, 27 e 28 corrigidas; secao 3.1.3 com substituicao de nomes PT para EN.',
          'aberto',
          'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:MR:ID - 05:9')::uuid, md5('rodada:vvb:2')::uuid, 'car', 'ID - 05', 9,
          'monitoramento', 'MR 5.3.1.2',
          'PP mentions the collection of soil and litter in the Biodiversity Monitoring Plan; however, the methodology applied is not clearly described in the plan.', 'PP is requested to provide a description of the sampling methods applied to these processes.',
          'Planejado: Avaliar se a melhor estrategia e retirar.',
          'aberto',
          'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:MR:ID - 06 PK:10')::uuid, md5('rodada:vvb:2')::uuid, 'car', 'ID - 06 PK', 10,
          'monitoramento', 'Section 3.1.3',
          'Section 3.1.3 of the MR describes a 10km buffer zone for leakage monitoring, visualized in the provided red polygon and GIS attribute table (BUFFER_10KM) showing a buffered area of 643,695 ha. However, the buffer appears not to have been generated properly, as evidenced by potential multipart or undissolved features. This is not aligned with the project''s single forest stratum or leakage calculations and no dissolved shapefile. Undissolved buffers can lead to topological errors, such as inflated or fragmented areas, compromising leakage monitoring accuracy.', 'Regenerate the 10km leakage belt buffer using standard GIS tools (Dissolve All), ensuring dissolution of any multipart or overlapping features to create a single contiguous polygon. Submit the updated geospatial evidence.',
          null,
          'aberto',
          'ok')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:PD:ID - 02:11')::uuid, md5('rodada:vvb:1')::uuid, 'cl', 'ID - 02', 11,
          'pdd', 'Section 2.1.10 - Project Start Date',
          'In section 2.1.10 PP has defined how the start date is justified based on a partnership and investment agreement, but as per VCS and CCB definition the start date should be an activity that contributes to the reduction or removal of GHG.', 'PP shall clarify the justification and activity of the start date based on VCS standard v4.7.',
          'Planejado: Retirar o contrato entre as partes e informar que o monitoramento do territorio comecou em janeiro de 2023.

Apurado: Avaliar se a construcao da guarita serve como evidencia.',
          'fechado',
          'pendente')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:PD:ID - 02:12')::uuid, md5('rodada:vvb:1')::uuid, 'car', 'ID - 02', 12,
          'pdd', null,
          '1. Several maps throughout the PDD do not display the PA boundaries in the legend. 2. Several maps throughout the PDD display information in Portuguese. 3. Several maps throughout the PDD do not display information about the coordinate system.', '1. Correct legend for all maps where the PA boundaries are included. 2. Provide all maps in the PDD with all texts in English. 3. Provide all maps in the PDD with information about the coordinate system.',
          'Planejado: 1. Identificar mapas com os problemas mencionados. 2. Verificar quais mapas sao do parceiro e pedir os shapefiles. 3. Refazer os mapas conforme o guidance do CCB Standard, secao 4 (Maps).

Apurado: Treze mapas conferidos e marcados OK, entre eles classificacao de Koppen do Para (SEMAS), hidrografia e topografia (IBGE), tipos de solo (EMBRAPA), vegetacao (IBGE), municipios do entorno (IBGE), assentamentos em Novo Repartimento e Itupiranga (INCRA), zonas minerarias (RAISG), unidades de conservacao, zona de manejo de vazamento e exploracao madeireira 2021 (SIMEX).',
          'fechado',
          'nao_aplicavel')
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();

  -- ----------------------------------------------------------------------
  -- Findings da Verra (rodada propria) e as evidencias como subitens
  -- ----------------------------------------------------------------------
  insert into public.carbon_auditoria_rodadas (id, projeto_id, origem, numero)
  values (md5('rodada:verra:1')::uuid, v_projeto, 'verra', 1)
  on conflict (id) do nothing;
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo,
     descricao_en, resposta_oficial_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:verra:1')::uuid, md5('rodada:verra:1')::uuid, 'cl',
          '1', 1, 'outro',
          'Information on the governance structure of the Parakana Indigenous communities.', null,
          'A definir com o responsavel se insere ou nao.', 'em_andamento',
          'pendente')
  on conflict (id) do update set
    resposta_oficial_en = excluded.resposta_oficial_en,
    plano_resposta_pt = excluded.plano_resposta_pt,
    estado = excluded.estado, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo,
     descricao_en, resposta_oficial_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:verra:2')::uuid, md5('rodada:verra:1')::uuid, 'cl',
          '2', 2, 'outro',
          'Plano de Gestao Territorial e Ambiental (PGTA) of the Parakana Indigenous communities.', 'Currently, the Parakana Indigenous communities do not have a formally approved Territorial and Environmental Management Plan (PGTA). The development of a PGTA has been identified as a priority and is included among the project activities.

In the absence of a formal PGTA, territorial protection, environmental management and community development priorities have been identified through the socioeconomic diagnosis, FPIC processes, community consultations, leadership meetings, and participatory planning exercises such as the Dream Tree methodology. These processes have informed the project''s activities and capacity-building initiatives related to territorial monitoring, environmental protection and governance strengthening.

Furthermore, the project has supported several capacity-building activities related to territorial and environmental management, contributing to the future development and implementation of a PGTA.',
          'Apesar de ser obrigacao do governo elaborar, nao havia PGTA. Abordar a importancia de te-lo e o objetivo do plano. Garantir que o projeto de carbono esta dentro do PGTA e explicitar como a FUNAI participou.', 'em_andamento',
          'ok')
  on conflict (id) do update set
    resposta_oficial_en = excluded.resposta_oficial_en,
    plano_resposta_pt = excluded.plano_resposta_pt,
    estado = excluded.estado, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:verra:2:sub:1')::uuid, md5('finding:verra:2')::uuid, 'Diagnostico socioeconomico (parceiro Interelos)', 1)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:verra:2:sub:2')::uuid, md5('finding:verra:2')::uuid, 'Treinamento: curso basico de protecao territorial', 2)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:verra:2:sub:3')::uuid, md5('finding:verra:2')::uuid, 'Treinamento teorico e pratico no protocolo de atividades ilegais (Apsis e Indeva)', 3)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:verra:2:sub:4')::uuid, md5('finding:verra:2')::uuid, 'Ronda pela floresta com os indigenas', 4)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:verra:2:sub:5')::uuid, md5('finding:verra:2')::uuid, 'Treinamento de brigada de incendio', 5)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:verra:2:sub:6')::uuid, md5('finding:verra:2')::uuid, 'Capacitacao do Conselho Gestor', 6)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo,
     descricao_en, resposta_oficial_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:verra:3')::uuid, md5('rodada:verra:1')::uuid, 'cl',
          '3', 3, 'outro',
          'Supporting documentation regarding the designation of Instituto Wyrapina Awaete and Associacao Indigena Paranatinga Parakana as representatives of the 21 village communities.', 'An indigenous community must establish and select a legal entity to represent it in any contracts or commercial agreements it wishes to enter. Typically, associations are the recommended structure for this purpose.

The representativeness of these specific associations in the carbon credit project was determined during the FPICs held in December 2022 with the two groups, with the Associacao Paranatinga Parakana representing the Lower Group and the Instituto Wyrapina Awaete (formerly Associacao Aiaparawy Awaete) representing the Upper Group.

Besides that, during the census, each village from both Groups were asked about its priorities and the level of awareness and receptiveness regarding the implementation of the project.',
          null, 'em_andamento',
          'ok')
  on conflict (id) do update set
    resposta_oficial_en = excluded.resposta_oficial_en,
    plano_resposta_pt = excluded.plano_resposta_pt,
    estado = excluded.estado, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:verra:3:sub:1')::uuid, md5('finding:verra:3')::uuid, 'Estatuto do Instituto Wyrapina Awaete', 1)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:verra:3:sub:2')::uuid, md5('finding:verra:3')::uuid, 'Ata da diretoria do Instituto Wyrapina Awaete', 2)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:verra:3:sub:3')::uuid, md5('finding:verra:3')::uuid, 'Estatuto da Associacao Paranatinga', 3)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo,
     descricao_en, resposta_oficial_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:verra:4')::uuid, md5('rodada:verra:1')::uuid, 'cl',
          '4', 4, 'outro',
          'Clarification regarding the role of the caciques in the decision-making process and the authority delegated to them by the village communities to represent their interests within the project.', 'The Parakana governance structure combines formal institutional representation through the indigenous associations and traditional leadership exercised by caciques. Caciques play a fundamental role in facilitating dialogue, communicating information, organizing consultations, and conveying the perspectives and concerns of community members. Their authority derives from the traditional governance system recognized by the Parakana people and from the trust placed in them by their communities. Although caciques do not necessarily hold formal positions within the associations, they are key participants in the decision-making process. Project-related matters are discussed through culturally appropriate consultation processes, including village meetings, FPIC events, seminars, and leadership consultations. Decisions are informed by community discussions and communicated through both traditional leadership structures and the indigenous associations.',
          null, 'aberto',
          'ok')
  on conflict (id) do update set
    resposta_oficial_en = excluded.resposta_oficial_en,
    plano_resposta_pt = excluded.plano_resposta_pt,
    estado = excluded.estado, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:verra:4:sub:1')::uuid, md5('finding:verra:4')::uuid, 'Atas das CLPIs', 1)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:verra:4:sub:2')::uuid, md5('finding:verra:4')::uuid, 'Relatorio de analise preliminar (parceiro Interelos), a confirmar', 2)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo,
     descricao_en, resposta_oficial_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:verra:5')::uuid, md5('rodada:verra:1')::uuid, 'cl',
          '5', 5, 'outro',
          'Clarification on how feedback from the village communities collected during the Tekatawa gatherings is communicated and incorporated into the higher levels of the project''s decision-making process.', null,
          null, 'respondido',
          'pendente')
  on conflict (id) do update set
    resposta_oficial_en = excluded.resposta_oficial_en,
    plano_resposta_pt = excluded.plano_resposta_pt,
    estado = excluded.estado, atualizado_em = now();
  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo,
     descricao_en, resposta_oficial_en, plano_resposta_pt, estado, estado_evidencia)
  values (md5('finding:verra:6')::uuid, md5('rodada:verra:1')::uuid, 'cl',
          '6', 6, 'outro',
          'Additional information regarding the benefit-sharing arrangement provided to the VVB.', null,
          null, 'respondido',
          'ok')
  on conflict (id) do update set
    resposta_oficial_en = excluded.resposta_oficial_en,
    plano_resposta_pt = excluded.plano_resposta_pt,
    estado = excluded.estado, atualizado_em = now();
  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values (md5('finding:verra:6:sub:1')::uuid, md5('finding:verra:6')::uuid, 'Contratos entre a Apsis e as associacoes', 1)
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();

  -- ----------------------------------------------------------------------
  -- Funil da Consultoria (Notion: Propostas (APs) e Consultorias (APs))
  -- ----------------------------------------------------------------------
  insert into public.carbon_propostas
    (id, codigo, titulo, cliente, status, grupo_servico, data_criacao, data_ganha)
  values (md5('proposta:1:AP-000XX/25')::uuid,
          'AP-000XX/25', 'AP-000XX/25',
          null, 'ganha', 'Descarbonizacao',
          timestamptz '2025-02-19T12:24',
          date '2025-02-19')
  on conflict (id) do update set
    status = excluded.status, cliente = excluded.cliente, atualizado_em = now();
  insert into public.carbon_propostas
    (id, codigo, titulo, cliente, status, grupo_servico, data_criacao, data_ganha)
  values (md5('proposta:2:AP-000XX/25')::uuid,
          'AP-000XX/25', 'AP-000XX/25',
          null, 'elaboracao', 'Descarbonizacao',
          timestamptz '2025-02-19T12:24',
          null)
  on conflict (id) do update set
    status = excluded.status, cliente = excluded.cliente, atualizado_em = now();
  insert into public.carbon_propostas
    (id, codigo, titulo, cliente, status, grupo_servico, data_criacao, data_ganha)
  values (md5('proposta:3:sem-codigo')::uuid,
          null, 'Proposta sem codigo',
          null, 'elaboracao', 'Carbono',
          timestamptz '2025-02-19T12:24',
          null)
  on conflict (id) do update set
    status = excluded.status, cliente = excluded.cliente, atualizado_em = now();
  insert into public.carbon_propostas
    (id, codigo, titulo, cliente, status, grupo_servico, data_criacao, data_ganha)
  values (md5('proposta:4:AP-000XX/25 - Watch Dog')::uuid,
          'AP-000XX/25 - Watch Dog', 'AP-000XX/25 - Watch Dog',
          'Grupo Sada', 'elaboracao', null,
          timestamptz '2025-02-19T16:35',
          null)
  on conflict (id) do update set
    status = excluded.status, cliente = excluded.cliente, atualizado_em = now();
  insert into public.carbon_propostas
    (id, codigo, titulo, cliente, status, grupo_servico, data_criacao, data_ganha)
  values (md5('proposta:5:AP-000xx/25 - Mapeamento Oportunidades')::uuid,
          'AP-000xx/25 - Mapeamento Oportunidades', 'AP-000xx/25 - Mapeamento Oportunidades',
          'Grupo Sada', 'elaboracao', 'Carbono',
          timestamptz '2025-02-19T17:05',
          null)
  on conflict (id) do update set
    status = excluded.status, cliente = excluded.cliente, atualizado_em = now();
  insert into public.carbon_propostas
    (id, codigo, titulo, cliente, status, grupo_servico, data_criacao, data_ganha)
  values (md5('proposta:6:sem-codigo')::uuid,
          null, 'Proposta sem codigo',
          null, 'elaboracao', null,
          timestamptz '2025-02-19T17:29',
          null)
  on conflict (id) do update set
    status = excluded.status, cliente = excluded.cliente, atualizado_em = now();
  insert into public.carbon_propostas
    (id, codigo, titulo, cliente, status, grupo_servico, data_criacao, data_ganha)
  values (md5('proposta:7:S1 e S2 [Pampa Sul Energia]')::uuid,
          'S1 e S2 [Pampa Sul Energia]', 'S1 e S2 [Pampa Sul Energia]',
          null, 'elaboracao', null,
          timestamptz '2025-07-08T11:41',
          null)
  on conflict (id) do update set
    status = excluded.status, cliente = excluded.cliente, atualizado_em = now();
  insert into public.carbon_consultorias (id, nome, status, prazo, observacoes)
  values (md5('consultoria:1:AP x -25 [IPEL]')::uuid, 'AP x -25 [IPEL]',
          'em_andamento', date '2025-04-01', null)
  on conflict (id) do update set
    status = excluded.status, prazo = excluded.prazo, atualizado_em = now();
  insert into public.carbon_consultorias (id, nome, status, prazo, observacoes)
  values (md5('consultoria:2:AP 00051 - 24 [J6 - QUEIXADA]')::uuid, 'AP 00051 - 24 [J6 - QUEIXADA]',
          'em_andamento', null, null)
  on conflict (id) do update set
    status = excluded.status, prazo = excluded.prazo, atualizado_em = now();
  insert into public.carbon_consultorias (id, nome, status, prazo, observacoes)
  values (md5('consultoria:3:AP x -25 [Assessoria Tecverde]')::uuid, 'AP x -25 [Assessoria Tecverde]',
          'em_andamento', date '2025-02-17', null)
  on conflict (id) do update set
    status = excluded.status, prazo = excluded.prazo, atualizado_em = now();
  insert into public.carbon_consultorias (id, nome, status, prazo, observacoes)
  values (md5('consultoria:4:AP x -25 [CTA]')::uuid, 'AP x -25 [CTA]',
          'em_andamento', null, null)
  on conflict (id) do update set
    status = excluded.status, prazo = excluded.prazo, atualizado_em = now();
  insert into public.carbon_consultorias (id, nome, status, prazo, observacoes)
  values (md5('consultoria:6:AP - 00052-24 [Aquapolo]')::uuid, 'AP - 00052-24 [Aquapolo]',
          'em_andamento', null, null)
  on conflict (id) do update set
    status = excluded.status, prazo = excluded.prazo, atualizado_em = now();
  insert into public.carbon_consultorias (id, nome, status, prazo, observacoes)
  values (md5('consultoria:7:AP - 00003-26 [CTA]')::uuid, 'AP - 00003-26 [CTA]',
          'em_andamento', null, null)
  on conflict (id) do update set
    status = excluded.status, prazo = excluded.prazo, atualizado_em = now();
  insert into public.carbon_consultorias (id, nome, status, prazo, observacoes)
  values (md5('consultoria:8:AP -')::uuid, 'AP -',
          'nao_iniciada', null, null)
  on conflict (id) do update set
    status = excluded.status, prazo = excluded.prazo, atualizado_em = now();
  insert into public.carbon_consultorias (id, nome, status, prazo, observacoes)
  values (md5('consultoria:9:AVB - Teste')::uuid, 'AVB - Teste',
          'nao_iniciada', null, 'Registro de teste na origem.')
  on conflict (id) do update set
    status = excluded.status, prazo = excluded.prazo, atualizado_em = now();
  insert into public.carbon_consultorias (id, nome, status, prazo, observacoes)
  values (md5('consultoria:10:AVB - Teste')::uuid, 'AVB - Teste',
          'nao_iniciada', null, 'Registro de teste na origem.')
  on conflict (id) do update set
    status = excluded.status, prazo = excluded.prazo, atualizado_em = now();

  -- ----------------------------------------------------------------------
  -- PDD, Monitoring Report e evidencias: instancia do template + status real
  -- ----------------------------------------------------------------------
  perform public.carbon_pdd_criar_do_template(v_projeto, null);
  perform public.carbon_mr_criar_do_template(v_projeto, null);
  perform public.carbon_evidencias_criar_do_template(v_projeto, null);

  -- PDD: o Notion mostra COMPLETE 100%, os 43 capitulos concluidos.
  update public.carbon_pdd_capitulos set status = 'concluido', atualizado_em = now()
   where projeto_id = v_projeto;

  -- Monitoring Report: tres estados diferentes, lidos capitulo a capitulo.
  -- 'Revisao 2' do Notion vira estado em_revisao COM rodada 2: as duas
  -- informacoes vivem em colunas separadas aqui, e juntar as duas numa string
  -- perderia a capacidade de perguntar "o que esta na segunda volta".
  update public.carbon_mr_capitulos set estado = 'em_revisao', rodada = 2, atualizado_em = now()
   where projeto_id = v_projeto and capitulo in ('4.1.1', '4.1.2', '4.1.3', '4.1.4', '4.2.1', '4.2.2', '4.3.2', '4.4.1', '4.4.2', '4.4.3', '4.4.4', '4.4.5', '4.4.6', '5.1.1', '5.1.2', '5.1.3', '5.1.4', '5.1.5', '5.1.6', '5.1.7', '5.1.8', '5.2.1', '5.2.2', '5.3.1', '5.3.2', '5.4.1');

  update public.carbon_mr_capitulos set estado = 'concluido', atualizado_em = now()
   where projeto_id = v_projeto and capitulo in ('4.3.1', '5');

  update public.carbon_mr_capitulos set estado = 'em_andamento', atualizado_em = now()
   where projeto_id = v_projeto and capitulo in ('1', '2', '3', '4');

  update public.carbon_mr_capitulos set observacoes = 'The data collected in the field is currently under revision and analysis. Additionally, specific data related to the accountability of GHG reduction is being evaluated to ensure accuracy and compliance with establised methodologies.', atualizado_em = now()
   where projeto_id = v_projeto and capitulo = '1';
  update public.carbon_mr_capitulos set observacoes = 'This chapter is being revised', atualizado_em = now()
   where projeto_id = v_projeto and capitulo = '2';

  -- Evidencias: no Notion quase tudo esta como 'Anexado Pasta', que e
  -- justamente o problema que a tela existe para resolver (o arquivo esta em
  -- alguma pasta, sem vinculo). Marcamos como anexada, que e o estado honesto:
  -- existe evidencia, e ela ainda nao foi aceita pela VVB.
  update public.carbon_evidencia_itens
     set estado_evidencia = 'anexada', status_resposta = 'concluido', atualizado_em = now()
   where projeto_id = v_projeto;

  raise notice 'Carga do Notion concluida.';
end
$$;

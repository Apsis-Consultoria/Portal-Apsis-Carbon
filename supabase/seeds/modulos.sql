-- =============================================================================
-- Apsis Carbon - os cards de modulo da tela de Boas-Vindas
-- Arquivo: supabase/seeds/modulos.sql
-- =============================================================================
-- ISTO E CONFIGURACAO, NAO DADO DO NOTION. Os outros seeds carregam registros
-- reais lidos das telas da Carbon; este descreve quais modulos o portal oferece,
-- e a fonte dele e o proprio codigo: cada linha abaixo corresponde a uma tela
-- registrada em src/paginas/*.paginas.js com entrada de menu propria.
--
-- POR QUE VIVE NO BANCO E NAO NO CODIGO. A tabela existe desde a fundacao
-- (20260807120000) justamente para o menu poder mudar sem deploy do frontend.
-- Ela estava VAZIA, e por isso a tela de Boas-Vindas abria no estado vazio
-- mesmo com 95 rotas funcionando por tras - o portal parecia nao ter nada,
-- quando na verdade so faltava a lista.
--
-- A `rota` precisa casar com o que esta em src/paginas/*.paginas.js. Uma rota
-- daqui que nao exista la vira card que leva ao 404, e o defeito so aparece
-- quando alguem clica.
--
-- `ordem` foi renumerada: no registro do frontend havia duas telas com ordem 3
-- (Atividades e Documentos), o que deixaria a posicao delas ao acaso do
-- desempate. Aqui cada uma tem a sua.
--
-- NAO inclui Indicadores, PDD, Monitoramento e Evidencias: sao telas FILHAS de
-- um projeto (rota com :id) e nao existem fora dele. Um card fixo apontaria
-- para o ':id' literal, que e link quebrado.
--
-- Idempotente: conflito por `chave` atualiza.
-- =============================================================================

insert into public.carbon_modulos (chave, label, descricao, icone, rota, ordem, ativo) values
  ('projetos', 'Projetos',
   'Projetos de crédito de carbono, PDD, monitoramento, evidências e indicadores.',
   'FolderTree', '/Projetos', 10, true),

  ('atividades', 'Atividades',
   'Backlog da equipe, com prioridade, prazo e horas planejadas.',
   'ClipboardList', '/Atividades', 20, true),

  ('minhas-horas', 'Minhas horas',
   'Apontamento de horas por atividade.',
   'Calculator', '/MinhasHoras', 30, true),

  ('findings', 'Findings',
   'Apontamentos de auditoria da VVB, da Verra e da BeZero, por rodada.',
   'ClipboardList', '/Findings', 40, true),

  ('documentos', 'Documentos',
   'Documentos do projeto, com versão e vínculo ao que eles comprovam.',
   'FileText', '/Documentos', 50, true),

  ('reunioes', 'Reuniões',
   'Reuniões, atas e pendências geradas nelas.',
   'Handshake', '/Reunioes', 60, true),

  ('fornecedores', 'Fornecedores',
   'Cadastro de fornecedores e status de contratação.',
   'Users', '/Fornecedores', 70, true),

  ('contratos', 'Contratos e parcelas',
   'Contratos, obrigações financeiras e vencimentos.',
   'FileCheck2', '/Contratos', 80, true),

  ('secure-share', 'Secure Share',
   'Pasta de documentos compartilhada com o cliente, por projeto.',
   'ShieldCheck', '/SecureShare', 90, true)

on conflict (chave) do update set
  label = excluded.label,
  descricao = excluded.descricao,
  icone = excluded.icone,
  rota = excluded.rota,
  ordem = excluded.ordem,
  ativo = excluded.ativo;

do $$
declare
  qtd integer;
begin
  select count(*) into qtd from public.carbon_modulos where ativo;
  if qtd = 0 then
    raise exception 'Nenhum modulo ativo depois do seed. A tela de Boas-Vindas continuaria vazia.';
  end if;
  raise notice 'Modulos ativos: %.', qtd;
end
$$;

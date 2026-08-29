-- =============================================================================
-- Apsis Carbon - a chave natural de um indicador nao e o nome dele
-- Arquivo: 20260825140000_indicador_chave_por_posicao.sql
-- =============================================================================
-- O QUE QUEBROU, em 25/08/2026: a carga dos 161 indicadores do Plano de
-- Monitoramento abortou com
--
--   23505: duplicate key value violates unique constraint
--          "carbon_indicadores_projeto_nome_uniq"
--   Key (projeto_id, lower(btrim(nome)))=(..., number of training courses offered)
--
-- O indice veio de 20260814100000_metas.sql, onde fazia sentido: naquele momento
-- todo indicador era um indicador INTERNO, ligado a uma meta da equipe, e dois com
-- o mesmo nome no mesmo projeto seriam mesmo erro de digitacao.
--
-- O Plano de Monitoramento quebra essa premissa, e nao por acidente. Medido no
-- arquivo de origem: 161 indicadores, 144 nomes distintos, 10 nomes repetidos em
-- 27 linhas. "Number of Training Courses Offered" aparece SEIS vezes:
--
--   comunidade     / Monitoring of forest
--   comunidade     / Monitoring of productive chains   (duas sub-atividades)
--   comunidade     / Monitoring of housing structure
--   biodiversidade / Monitoring of fauna
--   biodiversidade / Monitoring of flora
--
-- Sao seis programas de treinamento diferentes, com series proprias. Fundi-los num
-- registro so somaria cursos de manejo florestal com cursos de habitacao, e o
-- numero resultante nao descreveria nada. O nome repetido e a forma como a equipe
-- escreve o plano, nao um erro para o banco corrigir.
--
-- E A CHAVE TAMBEM NAO E (plano, atividade, nome). Conferido: mesmo com a
-- atividade na chave, sobram duas colisoes dentro de "Monitoring of productive
-- chains", porque uma atividade tem varias sub-atividades (a coluna
-- atividade_descricao) e cada uma tem o seu treinamento.
--
-- A CHAVE REAL E A POSICAO NO PLANO. Um indicador do Plano de Monitoramento e
-- identificado por onde ele esta na Teoria da Mudanca, e nao pelo texto do nome.
-- E o que a planilha faz (uma linha e uma linha) e o que o seed ja usava para
-- derivar o id.
--
-- Idempotente.
-- =============================================================================

-- O indice antigo sai. Nao ha perda de protecao para o caso que ele cobria: ele
-- volta logo abaixo, restrito aos indicadores internos, que sao os unicos para os
-- quais a premissa "nome unico por projeto" e verdadeira.
drop index if exists public.carbon_indicadores_projeto_nome_uniq;

-- 1. Indicador INTERNO (plano nulo): a regra antiga continua valendo inteira.
--    Dois indicadores de meta com o mesmo nome no mesmo projeto seguem sendo
--    erro de digitacao, e o banco segue recusando.
create unique index if not exists carbon_indicadores_interno_nome_uidx
  on public.carbon_indicadores (projeto_id, lower(btrim(nome)))
  where plano is null;

-- 2. Indicador do PLANO DE MONITORAMENTO: unico por (projeto, plano, posicao).
--    Isto e o que impede a carga de duplicar a serie se o seed rodar duas vezes,
--    que era a unica protecao real que o indice antigo dava neste caso.
--
--    `ordem` e a posicao na planilha. Duas linhas do mesmo plano com a mesma
--    ordem seriam erro de extracao, e ai sim o banco deve recusar.
create unique index if not exists carbon_indicadores_plano_ordem_uidx
  on public.carbon_indicadores (projeto_id, plano, ordem)
  where plano is not null;

comment on index public.carbon_indicadores_interno_nome_uidx is
  'Nome unico por projeto, SO para indicador interno (plano nulo). Substitui o antigo carbon_indicadores_projeto_nome_uniq, que valia para a tabela toda e por isso barrava o Plano de Monitoramento, onde o mesmo nome de indicador aparece legitimamente sob atividades diferentes.';

comment on index public.carbon_indicadores_plano_ordem_uidx is
  'Chave natural do indicador do Plano de Monitoramento: projeto, plano e posicao na planilha. O nome NAO entra, porque se repete entre atividades de proposito - "Number of Training Courses Offered" aparece seis vezes, uma por frente de trabalho, cada uma com a sua serie.';

notify pgrst, 'reload schema';

-- =============================================================================
-- Apsis Carbon - o projeto ao qual o Plano de Monitoramento pertence
-- Arquivo: supabase/seeds/projeto_awaete.sql
-- =============================================================================
-- POR QUE ESTE ARQUIVO EXISTE. Em 25/08/2026 a tabela carbon_projetos estava
-- VAZIA (zero linhas), e o seed dos indicadores busca o projeto por nome e falha
-- alto se nao achar. Sem um projeto, nao ha onde pendurar 161 indicadores.
--
-- CADA CAMPO PREENCHIDO ABAIXO TEM FONTE. O que nao tem fonte fica NULL, de
-- proposito: este e um sistema de certificacao, e um campo preenchido por
-- suposicao vira numero em relatorio que alguem assina. NULL diz "ninguem
-- preencheu ainda", que e verdade; um chute diz outra coisa.
--
--   nome             'Awaete REDD+'
--                    Fonte: aba Introduction de "Monitoring Plan - EN.xlsx" -
--                    "the Climate, Community and Biodiversity Monitoring Plans
--                    of the Awaete REDD+ project".
--
--   metodologia      'VM0048 / VMD0055'
--                    Fonte: aba Climate MP, coluna Resource - "Data and
--                    parameters derived from the VM0048 and VMD0055
--                    methodologies are systematically monitored".
--
--   standard         'VCS+CCB' (default da tabela, mantido)
--                    Fonte: a base VVB Findings do Notion cobra requisitos do
--                    "CCB Standard" e o cronograma Green Musk tem a frente
--                    "Verra's Listing Process" (VCS).
--
--   status_registro  'em_validacao'
--                    Fonte: ha CARs e CLs da VVB sendo respondidos em VVB
--                    Findings, e o cronograma Green Musk tem "VVB Process" em
--                    andamento. Validacao e exatamente essa fase. Se a fase real
--                    for outra, e um UPDATE de uma linha.
--
-- O QUE FICOU EM BRANCO E PRECISA DE QUEM SABE:
--   proponente, estado, municipio, area_declarada_ha, geometria, data_inicio,
--   periodo_creditacao_inicio, periodo_creditacao_fim.
--
--   A Terra Indigena Parakana fica no Para, mas "fica no Para" nao e fonte
--   documental e area declarada e numero que entra em calculo de credito. Ficam
--   nulos ate alguem da equipe preencher.
--
-- LGPD: nenhum dado pessoal. Nome de projeto e metodologia nao identificam
-- pessoa. A comunidade Parakana e citada apenas nos comentarios, como contexto
-- da origem do documento.
--
-- IDEMPOTENTE: nao insere se ja existir projeto com este nome.
-- =============================================================================

insert into public.carbon_projetos (nome, metodologia, standard, pais, status_registro)
select 'Awaete REDD+', 'VM0048 / VMD0055', 'VCS+CCB', 'Brasil', 'em_validacao'
 where not exists (
   select 1 from public.carbon_projetos
    where nome ilike '%awaet%' or nome ilike '%parakan%'
 );

-- Conferencia que ABORTA. Um seed que "passa" sem inserir nada deixaria a tela de
-- Indicadores vazia e a causa invisivel - o mesmo modo de falha que os blocos de
-- `raise notice` das migrations deste projeto produzem.
do $$
declare
  qtd integer;
begin
  select count(*) into qtd
    from public.carbon_projetos
   where nome ilike '%awaet%' or nome ilike '%parakan%';

  if qtd = 0 then
    raise exception 'O projeto nao foi criado e nao existia antes. Conferir o insert acima.';
  end if;

  raise notice 'Projeto do Plano de Monitoramento presente (% linha(s)).', qtd;
end
$$;

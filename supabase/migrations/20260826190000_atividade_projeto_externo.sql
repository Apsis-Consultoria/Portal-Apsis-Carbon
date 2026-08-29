-- =============================================================================
-- carbon_atividades: guarda a que projeto de consultoria a atividade pertence
-- =============================================================================
-- CONTEXTO. A base `BD - To Do` do Notion nunca tinha sido aberta pelo
-- levantamento. Ela tem 391 itens, e a coluna mais util deles e `Projeto`: 26
-- valores distintos, que sao os trabalhos de consultoria em andamento
-- (inventarios de GEE, RAS, materialidade, diagnostico IFRS S1/S2, EVTE,
-- emissao no MDL), mais "Interno Apsis Carbon", "Novos Negocios" e "JPF -
-- Parakana".
--
-- POR QUE UMA COLUNA DE TEXTO, e nao uma chave estrangeira. O candidato natural
-- seria apontar para carbon_consultorias, mas as duas bases nao casam: as 10
-- linhas de carbon_consultorias sao codigos de proposta ("AP - 00003-26 [CTA]")
-- e o `Projeto` do To Do e o nome do trabalho ("Inventario GEE[CTA]",
-- "RAS[CTA]", "Materialidade [CTA]" - tres contratos diferentes do MESMO
-- cliente). Casar os dois exige decisao de produto sobre o que e proposta e o
-- que e entrega, e inventar esse vinculo agora produziria atividade pendurada no
-- contrato errado. Guardar o texto verbatim preserva o agrupamento sem afirmar
-- uma relacao que ninguem conferiu.
--
-- `projeto_id` continua sendo o projeto de CARBONO (a FK para carbon_projetos).
-- As duas coisas convivem: uma atividade de "JPF - Parakana" tem os dois
-- preenchidos, uma de "Inventario GEE[Lanxess]" tem so este texto.
--
-- LGPD: nome de empresa cliente nao e dado pessoal. A coluna `Responsavel` do
-- Notion, essa sim, nao foi extraida - o banco guarda responsavel como chave
-- estrangeira para carbon_usuarios, nunca como texto.
-- =============================================================================

begin;

alter table public.carbon_atividades
  add column if not exists projeto_externo text;

comment on column public.carbon_atividades.projeto_externo is
  'Nome do trabalho de consultoria no Notion (coluna Projeto da base BD - To '
  'Do), verbatim. Nao confundir com projeto_id, que e o projeto de carbono. '
  'Texto e nao FK porque carbon_consultorias guarda codigo de proposta e nao '
  'nome de entrega, e o casamento entre os dois ainda nao foi decidido.';

-- Agrupar por projeto e a leitura principal desta base: 391 itens em 26
-- trabalhos, e a tela de Atividades filtra por ai.
create index if not exists carbon_atividades_projeto_externo_idx
  on public.carbon_atividades (projeto_externo)
  where projeto_externo is not null;

commit;

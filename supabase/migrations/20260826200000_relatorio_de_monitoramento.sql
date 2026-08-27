-- =============================================================================
-- Capitulos e evidencias passam a saber A QUAL relatorio de monitoramento
-- pertencem
-- =============================================================================
-- O QUE QUEBROU. Existe um segundo relatorio no Notion: "Monitoring Report 2
-- (Jul 24 a Dez 25)", com 102 capitulos e 26 documentos proprios. O primeiro,
-- ja carregado, tem 32 capitulos e 26 documentos. As duas tabelas tem chave
-- unica por (projeto, capitulo) e (projeto, codigo), entao o segundo relatorio
-- nao cabe: os numeros de capitulo se repetem entre periodos, por construcao -
-- "2.1.4 Project Proponent" existe nos dois, e tem de existir.
--
-- O modelo assumia UM relatorio por projeto. Projeto de carbono emite um
-- relatorio de monitoramento por periodo de creditacao, entao a suposicao estava
-- errada desde o inicio; ela so nao doeu enquanto havia um periodo so.
--
-- POR QUE `relatorio` E TEXTO, e nao FK para uma tabela de periodos. Criar
-- carbon_relatorios agora seria a modelagem certa, e tambem uma decisao de
-- produto que ninguem tomou: quais campos o relatorio tem, quem o abre e fecha,
-- como se relaciona com rodada de auditoria. Guardar o nome da pagina do Notion
-- verbatim resolve a colisao hoje sem fechar essa porta - quando a tabela
-- existir, esta coluna vira a chave de migracao.
--
-- NAO CONFUNDIR COM `rodada`, que ja existe em carbon_mr_capitulos: rodada e a
-- volta de revisao DENTRO do mesmo relatorio ("Revisao 1", "Revisao 2" da coluna
-- Status do Notion). `relatorio` e o periodo. Os 102 capitulos do MR2 tem as
-- duas coisas: pertencem ao MR2 e estao em rodadas diferentes.
--
-- O DEFAULT preenche as linhas existentes com 'Monitoring Report', que e o nome
-- da pagina de onde elas vieram. Nenhuma linha muda de sentido.
-- =============================================================================

begin;

-- ===== Capitulos =============================================================

alter table public.carbon_mr_capitulos
  add column if not exists relatorio text not null default 'Monitoring Report';

comment on column public.carbon_mr_capitulos.relatorio is
  'Nome da pagina do relatorio no Notion, verbatim. Distingue periodos de '
  'creditacao, cujos numeros de capitulo se repetem por construcao. Nao '
  'confundir com `rodada`, que e a volta de revisao dentro do mesmo relatorio.';

alter table public.carbon_mr_capitulos
  drop constraint if exists carbon_mr_capitulos_projeto_id_capitulo_key;

alter table public.carbon_mr_capitulos
  add constraint carbon_mr_capitulos_projeto_relatorio_capitulo_key
  unique (projeto_id, relatorio, capitulo);

-- ===== Evidencias ============================================================

alter table public.carbon_evidencia_itens
  add column if not exists relatorio text not null default 'Monitoring Report';

comment on column public.carbon_evidencia_itens.relatorio is
  'Nome da pagina do relatorio no Notion, verbatim. A lista de documentos '
  'exigidos muda de um periodo para o outro.';

alter table public.carbon_evidencia_itens
  drop constraint if exists carbon_evidencia_itens_projeto_id_codigo_key;

alter table public.carbon_evidencia_itens
  add constraint carbon_evidencia_itens_projeto_relatorio_codigo_key
  unique (projeto_id, relatorio, codigo);

-- Filtrar por relatorio e a leitura padrao das duas telas a partir de agora.
create index if not exists carbon_mr_capitulos_relatorio_idx
  on public.carbon_mr_capitulos (projeto_id, relatorio);

create index if not exists carbon_evidencia_itens_relatorio_idx
  on public.carbon_evidencia_itens (projeto_id, relatorio);

commit;

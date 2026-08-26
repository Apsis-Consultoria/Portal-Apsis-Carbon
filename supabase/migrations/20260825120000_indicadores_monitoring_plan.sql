-- =============================================================================
-- Apsis Carbon - Plano de Monitoramento na tela de Indicadores
-- Arquivo: 20260825120000_indicadores_monitoring_plan.sql
-- =============================================================================
-- DE ONDE VEM. A planilha "Monitoring Plan - EN.xlsx", entregue pela dona do
-- produto em 25/08/2026. Ela consolida os planos de monitoramento de Clima,
-- Comunidade e Biodiversidade do projeto REDD+ Awaete, derivados de uma Teoria
-- da Mudanca construida com a comunidade Parakana nas consultas CLPI de abril
-- de 2024.
--
-- POR QUE A PLANILHA E A UNICA FONTE. A base `Indicadores` do Notion foi aberta
-- ao vivo em 25/08/2026 e esta VAZIA: uma tabela com a coluna `Name` e zero
-- registro (docs/notion/19-varredura-ao-vivo-25-08.md). Nao existe precedente
-- para copiar. Projetar a partir da planilha nao e atalho, e o unico caminho.
--
-- POR QUE ESTENDER carbon_indicadores EM VEZ DE CRIAR TABELA NOVA. A tabela ja
-- existia desde 20260814100000_metas.sql, para indicadores ligados a METAS
-- internas (tipo, acumulativo, meta_id). O Plano de Monitoramento e outro
-- proposito - indicador de certificacao, com cadeia de Teoria da Mudanca e
-- medicao por periodo - mas e a MESMA coisa no mundo: algo que se mede ao longo
-- do tempo. Duas tabelas chamadas "indicadores" obrigariam toda tela, todo
-- relatorio e toda pessoa nova a perguntar qual e qual, e a primeira consulta
-- que esquecesse uma delas mostraria metade dos indicadores sem avisar.
--
-- As colunas novas sao TODAS anulaveis: um indicador de meta interna nao tem
-- plano, nem output, nem frequencia da VM0048, e continua valido.
--
-- Idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. carbon_indicadores - a definicao do que se mede
-- -----------------------------------------------------------------------------

alter table public.carbon_indicadores
  -- Qual dos tres planos. NULL = indicador interno, que nao veio do Plano de
  -- Monitoramento e nao entra no relatorio de verificacao.
  add column if not exists plano text,

  -- Simbolo da metodologia, so no plano de Clima: 'APA-Udef', 'AJ', 'DLF',
  -- 'EAEF,t'. Sao os parametros da VM0048/VMD0055 e a VVB cobra por esse nome,
  -- nao pela descricao. Nos planos de Comunidade e Biodiversidade nao existe
  -- codigo: la o proprio nome do indicador ja e a frase inteira.
  add column if not exists codigo text,

  -- Cadeia da Teoria da Mudanca, na ordem em que a planilha a apresenta:
  -- atividade -> output -> outcome -> impacto. Guardada como texto e nao
  -- normalizada em tabelas proprias DE PROPOSITO: na planilha esses campos sao
  -- paragrafos escritos pela equipe, com varias frases por celula, e nao um
  -- vocabulario fechado. Normalizar agora inventaria entidades que ninguem
  -- pediu; quando a equipe quiser filtrar por outcome, os valores distintos ja
  -- estarao no banco para virar tabela sem adivinhacao.
  add column if not exists atividade text,
  add column if not exists atividade_descricao text,
  add column if not exists output text,
  add column if not exists outcome text,
  add column if not exists impacto text,

  -- O que comprova a medicao: "Supporting documents (i.e. field activities
  -- reports; photos)", ou a secao do PD que descreve o parametro. E a coluna
  -- Resource da planilha, e a VVB pede exatamente isto.
  add column if not exists recurso text,

  -- Periodicidade EM TEXTO LIVRE, e nao um enum, porque a planilha usa frases
  -- de verdade: 'Annual', 'Semi-annual', 'Every two years', 'Prior to each
  -- verification event', 'Every six years at baseline renewal', 'Continuous
  -- Camera traps. / Annual campaigns considering seasonality.'. Um enum
  -- obrigaria a traduzir cada uma para uma categoria, e a traducao seria nossa,
  -- nao da metodologia - o tipo de decisao que a auditoria pergunta quem tomou.
  add column if not exists frequencia text,

  -- Posicao na planilha, para a tela exibir na ordem em que a equipe pensa o
  -- plano. Sem isso a lista sai por nome ou por id e a leitura perde a
  -- sequencia da Teoria da Mudanca.
  add column if not exists ordem integer;

-- 'clima', 'comunidade', 'biodiversidade' sao as tres abas da planilha. NULL
-- continua valendo (indicador interno).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'carbon_indicadores_plano_chk'
  ) then
    alter table public.carbon_indicadores
      add constraint carbon_indicadores_plano_chk check (
        plano is null or plano in ('clima', 'comunidade', 'biodiversidade')
      );
  end if;
end
$$;

-- UNIDADE PASSA A ACEITAR NULL. A tabela nasceu com `unidade text not null`, o
-- que fazia sentido para indicador de meta. O Plano de Monitoramento quebra
-- essa premissa: boa parte dos indicadores e contagem pura ("Number of
-- Ethno-environmental Agents Trained") e a planilha marca a unidade como 'N/A'.
--
-- Guardar a string 'N/A' seria pior do que NULL: a tela imprimiria "12 N/A", e
-- toda consulta que agrupasse por unidade ganharia uma categoria falsa. NULL
-- diz o que e - nao ha unidade, o numero e a propria contagem - e a coluna
-- `tipo` ja registra que e 'contagem'.
alter table public.carbon_indicadores
  alter column unidade drop not null;

alter table public.carbon_indicadores
  drop constraint if exists carbon_indicadores_unidade_nao_vazia_chk;

alter table public.carbon_indicadores
  add constraint carbon_indicadores_unidade_nao_vazia_chk check (
    unidade is null or length(btrim(unidade)) > 0
  );

-- Codigo da metodologia e unico DENTRO de um projeto, e so quando existe.
-- Indice parcial em vez de constraint: a imensa maioria das linhas tem codigo
-- NULL (so o plano de Clima usa) e nao deve disputar espaco no indice.
create unique index if not exists carbon_indicadores_projeto_codigo_uidx
  on public.carbon_indicadores (projeto_id, codigo)
  where codigo is not null;

-- A tela abre sempre por projeto e por plano, na ordem da planilha.
create index if not exists carbon_indicadores_projeto_plano_ordem_idx
  on public.carbon_indicadores (projeto_id, plano, ordem)
  where plano is not null;

comment on column public.carbon_indicadores.plano is
  'Qual dos tres planos de monitoramento: clima, comunidade ou biodiversidade. NULL identifica indicador interno, ligado a meta da equipe, que nao veio do Plano de Monitoramento e nao entra no relatorio de verificacao. E o campo que separa os dois usos da tabela.';
comment on column public.carbon_indicadores.codigo is
  'Simbolo do parametro na metodologia VM0048/VMD0055 (APA-Udef, AJ, DLF, EAEF,t). So o plano de Clima tem. A VVB cobra o parametro por este nome, entao ele e identificador e nao enfeite. Na planilha original varios destes vieram como objeto de equacao do Excel e nao como texto, e por isso a primeira extracao os perdeu.';
comment on column public.carbon_indicadores.atividade is
  'Frente de trabalho a que o indicador pertence (Monitoring of forest, Monitoring of flora, Monitoring of institutional strengthening). Na planilha e uma celula mesclada que cobre varias linhas: um indicador so existe dentro de uma atividade.';
comment on column public.carbon_indicadores.output is
  'Resultado imediato esperado da atividade, na Teoria da Mudanca. Texto corrido, varias frases por celula - e assim que a equipe escreveu.';
comment on column public.carbon_indicadores.outcome is
  'Efeito de medio prazo esperado, na Teoria da Mudanca.';
comment on column public.carbon_indicadores.impacto is
  'Transformacao de longo prazo pretendida, na Teoria da Mudanca.';
comment on column public.carbon_indicadores.recurso is
  'O que comprova a medicao: documentos de apoio, relatorios de campo, fotos, ou a secao do Project Description que descreve o parametro. E a coluna Resource da planilha, e e o que a VVB pede na verificacao.';
comment on column public.carbon_indicadores.frequencia is
  'Periodicidade do monitoramento, em texto livre e nao em enum, porque a planilha usa frases da metodologia (Annual, Every two years, Prior to each verification event, Every six years at baseline renewal). Traduzir cada uma para uma categoria seria decisao nossa e nao da metodologia, e a auditoria pergunta quem tomou.';
comment on column public.carbon_indicadores.ordem is
  'Posicao na planilha de origem, para a tela preservar a sequencia da Teoria da Mudanca. Ordenar por nome ou por id embaralharia o raciocinio do plano.';
comment on column public.carbon_indicadores.unidade is
  'Unidade da medida (ha, %, tCO2e/ha, Days, sp/ha). NULL quando o indicador e contagem pura e a planilha marca N/A - guardar a string N/A faria a tela imprimir "12 N/A" e criaria uma categoria falsa em qualquer agrupamento por unidade.';

-- -----------------------------------------------------------------------------
-- 2. carbon_indicador_medicoes - o valor de cada periodo
-- -----------------------------------------------------------------------------
-- A tabela ja guarda `data` como COMPETENCIA (a que periodo o valor se refere),
-- que e mais geral do que ano/trimestre e serve sem mudanca. O que falta e
-- dizer QUAL A GRANULARIDADE daquela data.
--
-- A planilha mostra por que isso importa: as colunas sao 2022, 2023, 2024,
-- 2025, e depois 1st/2nd/3th Quarter 2026. A equipe mudou de anual para
-- trimestral no meio da serie. Gravando so a data, o valor de 2022 viraria
-- 2022-12-31 e ficaria indistinguivel de um 4o trimestre de 2022 - e o
-- cabecalho da coluna na tela passaria a ser adivinhacao.

alter table public.carbon_indicador_medicoes
  add column if not exists periodo_tipo text not null default 'pontual';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'carbon_indicador_medicoes_periodo_tipo_chk'
  ) then
    alter table public.carbon_indicador_medicoes
      add constraint carbon_indicador_medicoes_periodo_tipo_chk check (
        periodo_tipo in ('pontual', 'mensal', 'trimestral', 'semestral', 'anual')
      );
  end if;
end
$$;

-- UM valor por indicador, periodo e granularidade. Sem isto, reimportar a
-- planilha duplicaria a serie inteira em silencio, e o grafico passaria a somar
-- cada ponto duas vezes - defeito que so aparece quando alguem confere na mao.
--
-- O par (data, periodo_tipo) e o que identifica o periodo: 2026-03-31 com
-- 'trimestral' e o 1o trimestre; 2026-12-31 com 'anual' e o ano inteiro. Deixar
-- periodo_tipo de fora impediria guardar os dois, que e legitimo - o fechamento
-- anual convive com os trimestres que o compoem.
create unique index if not exists carbon_indicador_medicoes_periodo_uidx
  on public.carbon_indicador_medicoes (indicador_id, data, periodo_tipo);

comment on column public.carbon_indicador_medicoes.periodo_tipo is
  'Granularidade a que a data se refere: pontual (uma medicao de campo num dia), mensal, trimestral, semestral ou anual. Existe porque a serie do Plano de Monitoramento muda de granularidade no meio - anual ate 2025 e trimestral a partir de 2026 - e so a data nao distingue o ano de 2022 do quarto trimestre de 2022. A convencao e gravar a data FINAL do periodo.';

-- -----------------------------------------------------------------------------
-- 3. Recarga do cache de esquema do PostgREST
-- -----------------------------------------------------------------------------
-- Sem isto o PostgREST continua com o esquema antigo em memoria e responde
-- PGRST204 ("column not found") para as colunas criadas aqui, ate o proximo
-- restart. O sintoma engana: parece que a migration nao rodou.
notify pgrst, 'reload schema';

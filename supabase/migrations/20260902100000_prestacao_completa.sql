-- =============================================================================
-- Prestacao de contas: os blocos de dados que a leitura anterior nao viu.
--
-- POR QUE ESTA MIGRATION EXISTE. A importacao das planilhas localizava UM
-- cabecalho por aba e ignorava tudo abaixo e ao lado dele. O dono percebeu que
-- as telas estavam incompletas e estava certo. Uma varredura bloco a bloco
-- (todas as abas, incluindo ocultas, deteccao de tabelas empilhadas E lado a
-- lado) encontrou quatro conjuntos de dados de ORIGEM que nunca entraram:
--
--   1. CADASTRO DE ALDEIA: cacique, populacao estimada e numero de casas.
--      Baixo, aba "Outubro 24 - Abril 25 ", L24-L43 (19 aldeias).
--      Cima, aba "Out 24 a Abril 25", cols 12-16, L26-L39 (13 aldeias).
--      O portal tinha SO O NOME da aldeia.
--   2. VALOR RECEBIDO POR ALDEIA no ciclo, afirmado pelo relatorio fechado.
--      E o rateio que a equipe entregou a terceiro, e nao a soma dos
--      lancamentos - os dois divergem, e a divergencia e informacao.
--   3. DESPESA POR EIXO COM DESCRICAO FISICA: "Energia 194.079,87 - 45 placas
--      solares, 43 baterias e 21 inversores". A frase e o que a validadora le;
--      ela nao esta em nenhum lancamento individual.
--   4. PENDENCIA DE NOTA FISCAL: aba "Pendencias" do Baixo. Nota cujo valor
--      divergiu da prestacao, ou cujo item sobrou para o ciclo seguinte.
--
-- -----------------------------------------------------------------------------
-- DADO DEMOGRAFICO E DADO SENSIVEL, e por isso as duas colunas novas de
-- populacao ficam separadas do resto
-- -----------------------------------------------------------------------------
-- Populacao estimada e numero de casas por aldeia NAO sao dado pessoal: sao
-- agregados, nao identificam ninguem. Mas caracterizam demograficamente uma
-- comunidade indigena, e por isso ficam com comentario explicito de coluna e
-- entram na mesma decisao de acesso que o resto do dominio.
--
-- O CACIQUE E OUTRA COISA. "Cacique" e cargo, e cargo nao e dado pessoal; mas
-- existe UM cacique por aldeia, entao cargo + aldeia aponta uma pessoa
-- determinada. A planilha traz o nome dele. O portal guarda a EXISTENCIA do
-- cargo (quantas liderancas a aldeia declara), e nao o nome - mesma decisao do
-- resto do dominio, e o gatilho recusa nome se alguem tentar digitar.
-- =============================================================================

begin;

-- ===== 1 e 2: o cadastro da aldeia ==========================================

alter table public.carbon_aldeias
  add column if not exists populacao_estimada integer
    check (populacao_estimada is null or populacao_estimada >= 0),
  add column if not exists casas integer
    check (casas is null or casas >= 0),
  add column if not exists liderancas integer
    check (liderancas is null or liderancas >= 0),
  add column if not exists censo_em date,
  add column if not exists censo_origem text;

comment on column public.carbon_aldeias.populacao_estimada is
  'Agregado, nao identifica pessoa. Caracteriza demograficamente comunidade '
  'indigena: mesma decisao de acesso do resto do dominio.';
comment on column public.carbon_aldeias.liderancas is
  'QUANTAS liderancas a aldeia declara, nao QUEM. A planilha de origem traz o '
  'nome do cacique; o nome nao entra - existe um cacique por aldeia, entao '
  'cargo + aldeia aponta uma pessoa determinada.';
comment on column public.carbon_aldeias.censo_origem is
  'De onde veio o levantamento, para o numero nao virar fato sem data.';

/**
 * Valor recebido por aldeia, AFIRMADO pelo relatorio de um ciclo.
 *
 * POR QUE NAO SE CALCULA da soma dos lancamentos: os dois numeros DIVERGEM na
 * planilha, e a divergencia e informacao, nao erro a esconder. O relatorio
 * fechado foi entregue a terceiro; a soma dos lancamentos e o que o razao
 * registra. Guardar so um dos dois apagaria a pergunta.
 */
create table if not exists public.carbon_aldeia_rateio (
  id           uuid primary key default gen_random_uuid(),
  ciclo_id     uuid not null references public.carbon_ciclos_prestacao (id) on delete cascade,
  aldeia_id    uuid not null references public.carbon_aldeias (id) on delete cascade,
  valor        numeric(14,2) not null,
  origem_aba   text,
  origem_linha integer,
  criado_em    timestamptz not null default now(),
  unique (ciclo_id, aldeia_id)
);

comment on table public.carbon_aldeia_rateio is
  'Valor por aldeia como o RELATORIO afirma. A tela mostra ao lado da soma dos '
  'lancamentos, e destaca a diferenca quando houver.';

-- ===== 3: despesa por eixo, com a descricao fisica ==========================

/**
 * O que o dinheiro de um eixo COMPROU, em uma frase.
 *
 * "Energia: 45 placas solares, 43 baterias e 21 inversores" e a linha que a
 * validadora le no relatorio. Ela nao esta em nenhum lancamento individual: e
 * uma sintese que a equipe escreveu, e nao se deriva somando linhas.
 */
create table if not exists public.carbon_eixo_resumo (
  id           uuid primary key default gen_random_uuid(),
  ciclo_id     uuid not null references public.carbon_ciclos_prestacao (id) on delete cascade,
  eixo_id      uuid not null references public.carbon_eixos (id) on delete cascade,
  valor        numeric(14,2) not null,
  entregas     text,
  origem_aba   text,
  origem_linha integer,
  criado_em    timestamptz not null default now(),
  unique (ciclo_id, eixo_id)
);

comment on table public.carbon_eixo_resumo is
  'Total por eixo e a descricao fisica do que foi entregue, como o relatorio '
  'do ciclo afirma. `entregas` e a frase que vai para o Monitoring Report.';

-- ===== 4: pendencia de nota fiscal ==========================================

create table if not exists public.carbon_prestacao_pendencias (
  id            uuid primary key default gen_random_uuid(),
  ciclo_id      uuid not null,
  grupo_id      uuid not null,
  documento     text,
  item          text not null check (btrim(item) <> ''),
  quantidade    numeric(12,3),
  valor_unitario numeric(14,2),
  valor_total   numeric(14,2),
  data_documento date,
  competencia_prestacao date,
  situacao      text not null default 'aberta'
                check (situacao in ('aberta', 'resolvida', 'sem_solucao')),
  observacoes   text,
  origem_aba    text,
  origem_linha  integer,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  foreign key (ciclo_id, grupo_id)
    references public.carbon_ciclos_prestacao (id, grupo_id) on delete cascade,
  constraint carbon_prest_pend_origem_uq unique (ciclo_id, origem_aba, origem_linha)
);

comment on table public.carbon_prestacao_pendencias is
  'Nota fiscal cujo valor divergiu da prestacao, ou cujo item sobrou para o '
  'ciclo seguinte. Vinha da aba oculta "Pendencias": o trabalho de conferencia '
  'do analista, que nao tinha lugar no portal e por isso continuava no Excel.';

create index if not exists carbon_prest_pend_ciclo_idx
  on public.carbon_prestacao_pendencias (ciclo_id, situacao);

/* A mesma guarda das outras tabelas do dominio. */
create or replace function public.carbon_prest_pend_sem_dado_pessoal()
returns trigger
language plpgsql
as $$
declare
  campo text;
  valor text;
begin
  for campo, valor in
    select * from (values
      ('item', new.item),
      ('documento', new.documento),
      ('observacoes', new.observacoes)
    ) as t(c, v)
    where v is not null
  loop
    if valor ~ '[[:alnum:]._%%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}' then
      raise exception 'o campo "%" contem endereco de e-mail', campo;
    end if;
    if valor ~ '\m\d{3}\.\d{3}\.\d{3}-\d{2}\M' then
      raise exception 'o campo "%" contem CPF', campo;
    end if;
  end loop;
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists carbon_prest_pend_sem_dado_pessoal_trg
  on public.carbon_prestacao_pendencias;

create trigger carbon_prest_pend_sem_dado_pessoal_trg
  before insert or update on public.carbon_prestacao_pendencias
  for each row execute function public.carbon_prest_pend_sem_dado_pessoal();

revoke all on function public.carbon_prest_pend_sem_dado_pessoal() from public;

-- ===== 5: os campos do MR-1 que ficaram de fora =============================
--
-- A aba "MR - 1 " tem Valor (R$), duas Linhas Estrategicas, Link da evidencia,
-- Comentarios e "Net Benefits to Community" - esta ultima e a frase que a
-- validadora CCB le sobre beneficio liquido a comunidade. Nenhuma entrou.
alter table public.carbon_atividades_campo
  add column if not exists linha_estrategica_2 text,
  add column if not exists link_evidencia text,
  add column if not exists beneficio_comunidade text;

comment on column public.carbon_atividades_campo.beneficio_comunidade is
  'A coluna "Net Benefits to Community" do MR-1: o beneficio liquido a '
  'comunidade, escrito pela equipe. E o texto que a validadora CCB le.';

-- ===== 6: indicadores ODS do Monitoring Report ==============================

/**
 * A aba "ODS - MR 1": 11 metas ODS com o impacto do projeto em cada uma.
 *
 * NAO e o mesmo que carbon_indicadores (Plano de Monitoramento): aquele mede
 * indicador proprio do projeto ao longo do tempo; este declara CONTRIBUICAO a
 * uma meta dos Objetivos de Desenvolvimento Sustentavel da ONU, em texto, por
 * Monitoring Report. A validadora CCB le os dois em secoes diferentes.
 */
create table if not exists public.carbon_ods_contribuicoes (
  id            uuid primary key default gen_random_uuid(),
  projeto_id    uuid not null references public.carbon_projetos (id) on delete cascade,
  relatorio     text not null check (relatorio ~ '^MR-[0-9]+$'),
  meta_ods      text,
  indicador_ods text not null check (btrim(indicador_ods) <> ''),
  impacto       text,
  contribuicao_periodo text,
  contribuicao_vida text,
  idioma        text not null default 'pt' check (idioma in ('pt', 'en')),
  ordem         integer,
  origem_aba    text,
  origem_linha  integer,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint carbon_ods_origem_uq unique (relatorio, origem_aba, origem_linha)
);

comment on table public.carbon_ods_contribuicoes is
  'Contribuicao do projeto a metas ODS, por Monitoring Report. A aba de origem '
  'tem a ultima linha repetida em ingles: `idioma` separa as duas em vez de '
  'uma sobrescrever a outra.';

create index if not exists carbon_ods_relatorio_idx
  on public.carbon_ods_contribuicoes (relatorio, ordem);

-- ===== Seguranca ============================================================

alter table public.carbon_aldeia_rateio           enable row level security;
alter table public.carbon_eixo_resumo             enable row level security;
alter table public.carbon_prestacao_pendencias    enable row level security;
alter table public.carbon_ods_contribuicoes       enable row level security;

/* Ver a nota em 20260901180000: RLS sem revoke deixa o privilegio de tabela
   concedido para a chave publica pelas default privileges do schema public.
   Corrigido no banco por 20260902220000_prestacao_fecha_anon.sql. */
revoke all on table public.carbon_aldeia_rateio        from anon, authenticated;
revoke all on table public.carbon_eixo_resumo          from anon, authenticated;
revoke all on table public.carbon_prestacao_pendencias from anon, authenticated;
revoke all on table public.carbon_ods_contribuicoes    from anon, authenticated;

commit;

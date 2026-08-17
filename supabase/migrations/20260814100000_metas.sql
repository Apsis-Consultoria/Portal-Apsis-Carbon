-- =============================================================================
-- Apsis Carbon - metas quantificadas e indicadores do projeto (issue #14)
-- Arquivo: 20260814100000_metas.sql
-- =============================================================================
-- Atende a issue #14 do backlog inicial (docs/issues/BACKLOG-INICIAL.md).
-- Levantamento: docs/notion/13-objetivos-parakana.md (arvore de metas por frente,
-- com a organizacao parceira responsavel) e docs/notion/15-atividades-parakana-e-
-- menores.md, secao Indicadores (base VAZIA, so com a coluna Name).
--
-- -------------------------------------------------------------------------
-- O PROBLEMA QUE ESTA MIGRATION EXISTE PARA RESOLVER
-- -------------------------------------------------------------------------
-- No Notion as metas existem, organizadas por frente e por parceiro responsavel,
-- mas os numeros estao LITERALMENTE como placeholder: "instalar XX cameras",
-- "aumentar a venda em XX%", "vender XX toneladas", "rondas de xxx/25 a xxx/25".
-- E a base Indicadores esta vazia. Ou seja: meta sem numero e indicador sem
-- estrutura. As duas coisas nascem juntas aqui porque uma sem a outra nao mede
-- nada.
--
-- A CORRECAO CENTRAL: valor_alvo e unidade sao COLUNAS, separadas da descricao.
-- Enquanto o numero mora dentro da frase, ninguem consulta, ninguem soma e
-- ninguem compara com o realizado - que e exatamente o estado atual. Com as duas
-- colunas separadas, "instalar XX cameras" vira
--   descricao  = 'Instalar cameras trap para monitoramento de fauna'
--   valor_alvo = 20
--   unidade    = 'cameras'
-- e o progresso passa a ser uma conta, nao uma leitura de texto.
--
-- VALOR_ALVO E ANULAVEL DE PROPOSITO, e isso nao contradiz o paragrafo acima. As
-- metas de hoje ainda nao tem numero; exigir valor_alvo NOT NULL obrigaria a
-- equipe a INVENTAR um numero para cadastrar a meta, o que e pior do que nao ter
-- numero. A coluna nula e um estado visivel e contavel (carbon_metas_progresso
-- devolve sem_valor_alvo), e a tela mostra o aviso. A lacuna deixa de estar
-- escondida no meio de uma frase e passa a ser uma pendencia que aparece.
--
-- REALIZADO NAO E COLUNA. O valor realizado de uma meta e derivado das medicoes
-- dos indicadores vinculados a ela (public.carbon_meta_realizado). Guardar o
-- realizado em coluna significaria duas fontes de verdade e um numero que mente
-- sempre que alguem lanca uma medicao sem lembrar de atualizar a meta - e o mesmo
-- motivo pelo qual o status da parcela e derivado da data em
-- 20260814097000_fornecedores.sql, e nao um campo manual.
--
-- ACAO RECORRENTE COM SAZONALIDADE. O levantamento descreve "rondas quinzenais na
-- seca e mensais na chuva". Isso NAO cabe como tarefa unica e nao cabe como duas
-- metas soltas: e uma acao recorrente cuja frequencia depende da estacao. Por isso
-- a meta tem periodicidade (unica, quinzenal, mensal, trimestral) e uma janela
-- sazonal em meses (mes_inicio, mes_fim), e o previsto e CALCULADO
-- (public.carbon_meta_ocorrencias_previstas): "quinzenal, de maio a setembro de
-- 2026" da 10 rondas previstas. Esse numero e o unico caminho honesto para
-- preencher o "XX" de uma meta recorrente, e a tela o oferece como sugestao de
-- valor_alvo em vez de gravar sozinha.
--
-- VINCULO META -> INDICADOR -> EVIDENCIA. As metas de monitoramento (rondas,
-- brigadas, cameras) produzem exatamente as evidencias que a auditoria pede. O
-- vinculo com documento usa a tabela generica public.carbon_documento_vinculos com
-- tipo_alvo = 'meta' (ja previsto no comentario daquela coluna, em
-- 20260814090000_documentos.sql): nada de tabela de ligacao propria aqui.
--
-- -------------------------------------------------------------------------
-- PENDENCIAS REGISTRADAS, NAO RESOLVIDAS AQUI
-- -------------------------------------------------------------------------
-- 1. PARCEIRO E A MESMA ENTIDADE QUE FORNECEDOR? A issue #14 faz essa pergunta ao
--    dono e ela continua aberta. Enquanto isso, parceiro_id referencia
--    public.carbon_fornecedores, que e hoje a UNICA entidade de organizacao do
--    sistema: criar uma carbon_parceiros paralela seria decidir a pendencia pelo
--    lado "sao coisas diferentes" sem autorizacao, e duplicar cadastro. Se a
--    decisao for separar, muda o alvo da FK e o nome da coluna permanece.
-- 2. BIOECONOMIA. A frente entra no enum porque as metas existem no plano do
--    projeto (castanha, acai, certificacao), mas NENHUM modulo de cadeia produtiva
--    e construido aqui: volume de producao, venda e certificacao sao dominio
--    diferente de credito de carbono e a propria issue registra isso como escopo a
--    confirmar. O que existe e a meta com valor alvo e unidade, como qualquer
--    outra frente.
-- 3. Leitura aberta a qualquer colaborador ativo do dominio (ver PAPEIS_ESCRITA em
--    supabase/functions/carbon-api/index.ts) vale tambem para estas tabelas. E
--    pendencia do sistema, nao deste arquivo.
--
-- DEPENDE de:
--   20260807120000_init_apsis_carbon.sql   public.carbon_usuarios
--   20260812150000_projetos_e_pdd.sql      public.carbon_projetos
--   20260814090000_documentos.sql          public.carbon_documento_vinculos
--   20260814097000_fornecedores.sql        public.carbon_fornecedores
-- A ordem de aplicacao e a ordem dos nomes de arquivo, e todas antecedem esta.
--
-- Esta migration e idempotente: pode ser reaplicada sem erro.
-- =============================================================================


-- SOBRE A LISTA DE FRENTES, QUE APARECE DUAS VEZES NESTE ARQUIVO (no check da
-- coluna carbon_metas.frente e dentro de public.carbon_meta_frentes): o PostgreSQL
-- nao aceita chamada de funcao com resultado de conjunto dentro de um CHECK, e um
-- enum de verdade tornaria acrescentar frente um ALTER TYPE que nao roda dentro de
-- transacao em todas as versoes. Mudar uma exige mudar a outra; a funcao existe
-- porque a ORDEM das frentes (que e a ordem do plano de impacto, nao alfabetica) e
-- usada em consulta e precisa de uma fonte unica. Mesma escolha consciente do
-- limite de rodadas em 20260814091000_monitoramento.sql.


-- =============================================================================
-- 1. carbon_metas - a meta quantificada, por frente e por parceiro
-- =============================================================================

create table if not exists public.carbon_metas (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references public.carbon_projetos (id) on delete cascade,

  frente         text not null
                   check (frente in (
                     'fortalecimento_institucional',
                     'monitoramento',
                     'educacao',
                     'sensibilizacao',
                     'bioeconomia',
                     'prestacao_contas'
                   )),

  descricao      text not null,

  -- Ver a pendencia 1 no cabecalho antes de mexer no alvo desta FK.
  parceiro_id    uuid references public.carbon_fornecedores (id) on delete set null,

  -- O PONTO DA ISSUE: numero e unidade fora do texto.
  valor_alvo     numeric(14,4),
  unidade        text,

  periodicidade  text not null default 'unica'
                   check (periodicidade in (
                     'unica',
                     'quinzenal',
                     'mensal',
                     'trimestral'
                   )),

  -- Janela sazonal, em numero de mes (1 a 12). Ver o cabecalho e o comentario das
  -- colunas: a janela pode atravessar o ano (chuva = outubro a abril).
  mes_inicio     integer check (mes_inicio between 1 and 12),
  mes_fim        integer check (mes_fim between 1 and 12),

  periodo_inicio date,
  periodo_fim    date,

  status         text not null default 'planejada'
                   check (status in (
                     'planejada',
                     'em_andamento',
                     'concluida',
                     'cancelada'
                   )),

  observacoes    text,
  criado_por     uuid references public.carbon_usuarios (id),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  constraint carbon_metas_descricao_nao_vazia_chk check (
    length(btrim(descricao)) > 0
  ),

  -- Meta alvo negativa nao significa nada. ZERO significa, e por isso e aceito:
  -- "zero ocorrencia de caca ilegal" e uma meta legitima do plano de impacto. O
  -- percentual dessas metas e nulo (nao se divide por zero) e a tela compara
  -- realizado com alvo em texto.
  constraint carbon_metas_valor_alvo_nao_negativo_chk check (
    valor_alvo is null or valor_alvo >= 0
  ),

  -- NUMERO SEM UNIDADE E O PROBLEMA DE VOLTA: "20" nao diz se sao cameras,
  -- toneladas ou por cento. Quando ha valor_alvo, a unidade e obrigatoria.
  constraint carbon_metas_unidade_com_valor_chk check (
    valor_alvo is null or (unidade is not null and length(btrim(unidade)) > 0)
  ),

  -- Janela sazonal e um par: meio par nao define janela nenhuma.
  constraint carbon_metas_janela_par_chk check (
    (mes_inicio is null) = (mes_fim is null)
  ),

  constraint carbon_metas_periodo_coerente_chk check (
    periodo_inicio is null or periodo_fim is null or periodo_fim >= periodo_inicio
  )
);

comment on table public.carbon_metas is
  'Metas quantificadas do projeto, organizadas por frente de atuacao e com a organizacao parceira responsavel (issue #14). Substitui a arvore de texto descrita em docs/notion/13-objetivos-parakana.md, onde os valores estavam como placeholder XX e xxx e portanto nao eram mensuraveis. O valor REALIZADO nao e coluna: vem das medicoes dos indicadores vinculados, por public.carbon_meta_realizado. Escrita somente pela Edge Function carbon-api, com papel admin ou gestor.';
comment on column public.carbon_metas.projeto_id is
  'Projeto dono da meta. ON DELETE CASCADE: apagar o projeto apaga suas metas.';
comment on column public.carbon_metas.frente is
  'Frente de atuacao do plano de impacto, na nomenclatura observada no Notion: fortalecimento_institucional, monitoramento, educacao, sensibilizacao (educacao ambiental no entorno), bioeconomia (cadeias de castanha e acai) e prestacao_contas (acoes com recurso de antecipacao, registro de ativos e contabilidade da SPE). A frente bioeconomia existe porque as metas existem, mas o modulo de cadeia produtiva NAO faz parte deste escopo - ver a pendencia 2 no cabecalho. A ORDEM de exibicao vem de public.carbon_meta_frentes, nao da ordem alfabetica.';
comment on column public.carbon_metas.descricao is
  'A acao em si, SEM o numero: "Instalar cameras trap para fauna", nao "Instalar XX cameras". O numero mora em valor_alvo e a unidade em unidade. Manter o numero aqui recria o problema que esta tabela resolve. LGPD: nao registrar nome de pessoa nesta coluna.';
comment on column public.carbon_metas.parceiro_id is
  'Organizacao parceira responsavel por executar a frente. No Notion o parceiro aparece no proprio titulo do bloco de metas, ou seja a delegacao ja existe e nao tem onde ser registrada. Aponta para carbon_fornecedores porque e a unica entidade de organizacao do sistema hoje; se parceiro de execucao de projeto for decidido como entidade diferente de fornecedor contratado (pergunta aberta da issue #14), muda o alvo da FK. ON DELETE SET NULL: perder o cadastro do parceiro nao pode apagar a meta.';
comment on column public.carbon_metas.valor_alvo is
  'Quanto se pretende alcancar, em numero. E A CORRECAO CENTRAL DA ISSUE #14: separado da descricao, porque numero dentro de frase nao se soma nem se compara. ANULAVEL de proposito: as metas herdadas ainda nao tem numero, e exigir um valor forcaria a equipe a inventar. Meta sem valor_alvo e contada em carbon_metas_progresso como sem_valor_alvo e aparece na tela como pendencia explicita. Zero e aceito (meta de "nenhuma ocorrencia").';
comment on column public.carbon_metas.unidade is
  'Unidade do valor_alvo, no vocabulario do plano: cameras, rondas, brigadas, toneladas, por cento, associacoes, cursos. Obrigatoria quando ha valor_alvo (ver o check): numero sem unidade nao e medida. Texto livre e nao lista fechada porque cada frente conta uma coisa diferente e uma lista fechada seria um ALTER de check a cada meta nova.';
comment on column public.carbon_metas.periodicidade is
  'unica, quinzenal, mensal ou trimestral. Existe porque parte das acoes do plano E RECORRENTE - "rondas quinzenais na seca e mensais na chuva" - e recorrencia nao cabe como tarefa unica. Combinada com a janela sazonal, alimenta public.carbon_meta_ocorrencias_previstas, que calcula o previsto do periodo. Acrescentar semestral ou anual e um ALTER deste check; ficaram de fora porque nenhuma acao observada usa essas frequencias.';
comment on column public.carbon_metas.mes_inicio is
  'Primeiro mes da janela sazonal (1 a 12), ou NULL para meta sem sazonalidade. Par obrigatorio com mes_fim. A JANELA PODE ATRAVESSAR O ANO: a estacao chuvosa e outubro a abril, o que se escreve mes_inicio = 10 e mes_fim = 4. Quem interpreta a virada e public.carbon_meta_mes_na_janela; nao compare os dois numeros diretamente.';
comment on column public.carbon_metas.mes_fim is
  'Ultimo mes da janela sazonal (1 a 12), inclusive. Ver mes_inicio: menor que mes_inicio significa janela que atravessa o ano, e nao erro de digitacao.';
comment on column public.carbon_metas.periodo_inicio is
  'Inicio do periodo em que a meta vale. Tambem delimita quais medicoes contam no realizado (ver public.carbon_meta_realizado): medicao fora do periodo da meta nao entra na conta, senao a ronda do ano passado apareceria como progresso deste ano.';
comment on column public.carbon_metas.periodo_fim is
  'Fim do periodo em que a meta vale. Alem de delimitar o realizado, e o que torna a meta ATRASADA quando passa sem conclusao (derivacao em public.carbon_meta_atrasada, nunca coluna: uma meta vira atrasada a meia-noite, sem ninguem tocar na linha).';
comment on column public.carbon_metas.status is
  'planejada, em_andamento, concluida ou cancelada. NAO existe valor atrasada aqui, de proposito: atraso e derivado de periodo_fim com a data de hoje (public.carbon_meta_atrasada). Status manual de atraso mente no dia seguinte ao vencimento - mesma licao do status de parcela em 20260814097000_fornecedores.sql.';
comment on column public.carbon_metas.observacoes is
  'Anotacao interna sobre a meta. LGPD: sem nome, telefone ou e-mail de pessoa fisica; a informacao sobre pessoas nao pertence ao registro da meta.';
comment on column public.carbon_metas.criado_por is
  'Colaborador que cadastrou, resolvido pela Edge Function a partir do token. Nunca vem do corpo da requisicao.';
comment on column public.carbon_metas.atualizado_em is
  'Mantido pela trigger carbon_metas_atualizado_em a cada UPDATE.';

-- (projeto_id, frente): a tela e organizada por frente, sempre dentro de um projeto.
create index if not exists carbon_metas_projeto_frente_idx
  on public.carbon_metas (projeto_id, frente);

-- (projeto_id, status): "o que esta em andamento" e a segunda leitura da tela.
create index if not exists carbon_metas_projeto_status_idx
  on public.carbon_metas (projeto_id, status);

-- Parcial: a consulta "o que este parceiro deve entregar" so olha meta com parceiro.
create index if not exists carbon_metas_parceiro_idx
  on public.carbon_metas (parceiro_id)
  where parceiro_id is not null;

-- Metas com prazo vencido, para o painel de atraso nao varrer a tabela.
create index if not exists carbon_metas_periodo_fim_idx
  on public.carbon_metas (periodo_fim)
  where periodo_fim is not null;


create or replace function public.carbon_metas_set_atualizado_em()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

comment on function public.carbon_metas_set_atualizado_em() is
  'Mantem carbon_metas.atualizado_em em dia a cada UPDATE. Funcao propria, e nao reuso da de outro dominio, para uma tabela nao depender da migration da outra.';

drop trigger if exists carbon_metas_atualizado_em on public.carbon_metas;
create trigger carbon_metas_atualizado_em
  before update on public.carbon_metas
  for each row
  execute function public.carbon_metas_set_atualizado_em();

-- RLS ativa e NENHUMA policy, DE PROPOSITO: assim todo acesso pela anon key e
-- negado, inclusive leitura, e so o service_role (a Edge Function carbon-api, que
-- ja validou o token do Azure AD e conferiu ativo = true) alcanca a tabela. Mesmo
-- padrao de carbon_projetos, carbon_pdd_capitulos e carbon_mr_capitulos.
alter table public.carbon_metas enable row level security;
revoke all on table public.carbon_metas from anon, authenticated;
grant all on table public.carbon_metas to service_role;


-- =============================================================================
-- 2. carbon_indicadores - a estrutura que a base Indicadores nunca teve
-- =============================================================================
-- A base do Notion tinha SO a coluna Name e zero registro. O que faltava para ela
-- servir de algo e o que esta aqui: unidade, tipo, se acumula, e o vinculo com a
-- meta que ele mede.
--
-- meta_id E ANULAVEL. Ha indicador que o projeto acompanha sem que exista meta
-- para ele (area monitorada, focos de calor detectados), e no Notion a base
-- Indicadores e separada da arvore de objetivos. Forcar a meta obrigaria a criar
-- meta de mentira so para poder medir.

create table if not exists public.carbon_indicadores (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references public.carbon_projetos (id) on delete cascade,

  -- ON DELETE SET NULL, e nao CASCADE: apagar a meta nao pode destruir a serie
  -- historica de medicoes, que e dado de campo e custou coleta. O indicador fica
  -- orfao de meta e continua sendo acompanhado.
  meta_id        uuid references public.carbon_metas (id) on delete set null,

  nome           text not null,
  unidade        text not null,

  tipo           text not null default 'contagem'
                   check (tipo in (
                     'contagem',
                     'percentual',
                     'volume',
                     'area'
                   )),

  acumulativo    boolean not null default true,

  descricao      text,
  criado_por     uuid references public.carbon_usuarios (id),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  constraint carbon_indicadores_nome_nao_vazio_chk check (
    length(btrim(nome)) > 0
  ),
  constraint carbon_indicadores_unidade_nao_vazia_chk check (
    length(btrim(unidade)) > 0
  ),

  -- PERCENTUAL NAO ACUMULA. Somar 30% de um mes com 40% de outro nao da 70% de
  -- nada: percentual e um NIVEL, e o valor que vale e o ultimo medido. Sem esta
  -- checagem, a meta "aumentar a venda em XX%" mostraria um realizado que e a soma
  -- de percentuais, numero que nao existe no mundo. A Edge Function recusa antes,
  -- com mensagem explicada; este check e a ultima linha de defesa.
  constraint carbon_indicadores_percentual_nao_acumula_chk check (
    not (tipo = 'percentual' and acumulativo)
  )
);

comment on table public.carbon_indicadores is
  'Indicadores de acompanhamento do projeto (issue #14). E a estrutura que a base Indicadores do Notion nunca teve: la existiam apenas a coluna Name e zero registro (docs/notion/15-atividades-parakana-e-menores.md). O historico de valores fica em carbon_indicador_medicoes; aqui mora a DEFINICAO do que se mede. Escrita somente pela Edge Function carbon-api, com papel admin ou gestor.';
comment on column public.carbon_indicadores.projeto_id is
  'Projeto dono do indicador. ON DELETE CASCADE. Fica no indicador, e nao so na meta, porque indicador sem meta existe (ver meta_id).';
comment on column public.carbon_indicadores.meta_id is
  'Meta que este indicador mede, ou NULL para indicador acompanhado sem meta associada. ON DELETE SET NULL de proposito: apagar a meta nao pode apagar a serie historica de medicoes, que e dado de campo. Quando ha meta, o PERIODO da meta delimita quais medicoes entram no realizado.';
comment on column public.carbon_indicadores.nome is
  'O que se mede, em portugues: "Cameras trap instaladas", "Rondas realizadas", "Brigadistas formados". Unico por projeto, sem diferenca de caixa nem de espaco nas pontas (indice carbon_indicadores_projeto_nome_uniq): "Rondas" e "rondas " seriam duas series do mesmo indicador, e a divergencia so apareceria no grafico.';
comment on column public.carbon_indicadores.unidade is
  'Unidade das medicoes: cameras, rondas, pessoas, toneladas, por cento, hectares. OBRIGATORIA, ao contrario de carbon_metas.unidade: meta pode nascer sem numero (e nesse caso sem unidade), mas indicador sem unidade e exatamente a base vazia do Notion de volta. Deve ser coerente com a unidade da meta vinculada; a tela mostra as duas lado a lado justamente para a divergencia aparecer.';
comment on column public.carbon_indicadores.tipo is
  'contagem, percentual, volume ou area. Nao substitui a unidade: define como o numero se comporta e o que a tela formata. percentual implica acumulativo = false (ver o check).';
comment on column public.carbon_indicadores.acumulativo is
  'true: o realizado e a SOMA das medicoes do periodo (cameras instaladas, rondas feitas, toneladas vendidas). false: o realizado e a ULTIMA medicao do periodo (percentual de aumento de venda, area sob monitoramento) - nesse caso a serie mostra evolucao de nivel, nao acumulo. Default true porque a maioria das acoes do plano e contagem. A regra esta implementada UMA vez, em public.carbon_indicador_realizado.';
comment on column public.carbon_indicadores.descricao is
  'Como a medicao e feita, para outra pessoa repetir do mesmo jeito no proximo ciclo (fonte do dado, quem coleta, o que conta como ocorrencia). LGPD: sem nome de pessoa; descreva o papel.';
comment on column public.carbon_indicadores.atualizado_em is
  'Mantido pela trigger carbon_indicadores_atualizado_em a cada UPDATE.';

create index if not exists carbon_indicadores_projeto_idx
  on public.carbon_indicadores (projeto_id);

-- Parcial: a consulta corrente e "indicadores desta meta".
create index if not exists carbon_indicadores_meta_idx
  on public.carbon_indicadores (meta_id)
  where meta_id is not null;

-- Unico por projeto ignorando caixa e espaco nas pontas. Indice, e nao constraint,
-- porque unique constraint nao aceita expressao.
create unique index if not exists carbon_indicadores_projeto_nome_uniq
  on public.carbon_indicadores (projeto_id, lower(btrim(nome)));


create or replace function public.carbon_indicadores_set_atualizado_em()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

comment on function public.carbon_indicadores_set_atualizado_em() is
  'Mantem carbon_indicadores.atualizado_em em dia a cada UPDATE.';

drop trigger if exists carbon_indicadores_atualizado_em on public.carbon_indicadores;
create trigger carbon_indicadores_atualizado_em
  before update on public.carbon_indicadores
  for each row
  execute function public.carbon_indicadores_set_atualizado_em();

alter table public.carbon_indicadores enable row level security;
revoke all on table public.carbon_indicadores from anon, authenticated;
grant all on table public.carbon_indicadores to service_role;


-- =============================================================================
-- 3. carbon_indicador_medicoes - a serie temporal
-- =============================================================================
-- Indicador sem historico nao mostra evolucao: mostra um numero solto, que e o que
-- uma planilha ja faz. A serie e o que permite dizer "as rondas cairam no segundo
-- semestre" e o que a auditoria olha quando pergunta pela consistencia do
-- monitoramento ao longo do periodo.
--
-- SEM unique (indicador_id, data), de proposito: um indicador acumulativo pode
-- receber dois lancamentos no mesmo dia (duas frentes de campo, dois lotes). Para
-- o indicador NAO acumulativo, em que "a ultima medicao" precisa ser uma so, o
-- desempate e deterministico e esta escrito uma vez em
-- public.carbon_indicador_realizado: data desc, criado_em desc, id desc.

create table if not exists public.carbon_indicador_medicoes (
  id             uuid primary key default gen_random_uuid(),
  indicador_id   uuid not null references public.carbon_indicadores (id) on delete cascade,

  data           date not null,
  valor          numeric(14,4) not null,

  origem         text not null default 'interna'
                   check (origem in ('interna', 'parceiro')),

  observacao     text,
  criado_por     uuid references public.carbon_usuarios (id),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

comment on table public.carbon_indicador_medicoes is
  'Serie temporal de um indicador: uma linha por medicao (issue #14). Existe porque indicador sem historico nao mostra evolucao, e porque a auditoria olha a consistencia do monitoramento ao longo do periodo, nao um numero final. O agregado (soma ou ultimo valor, conforme carbon_indicadores.acumulativo) e derivado por public.carbon_indicador_realizado e nunca guardado. Escrita somente pela Edge Function carbon-api, com papel admin ou gestor.';
comment on column public.carbon_indicador_medicoes.indicador_id is
  'Indicador medido. ON DELETE CASCADE: a serie nao tem sentido sem a definicao do que ela mede.';
comment on column public.carbon_indicador_medicoes.data is
  'Data a que a medicao se refere (competencia), NAO a data em que foi digitada - essa e criado_em. A distincao importa: lancamento em atraso e comum no campo, e usar a data de digitacao jogaria a ronda de agosto para dentro de setembro. E a data que decide se a medicao entra no periodo da meta.';
comment on column public.carbon_indicador_medicoes.valor is
  'Valor medido, na unidade do indicador. Aceita NEGATIVO de proposito: indicador de variacao percentual mede queda tambem, e forcar valor nao negativo obrigaria a registrar -3% como 3% em outro campo. Indicador de contagem simplesmente nunca recebe negativo.';
comment on column public.carbon_indicador_medicoes.origem is
  'interna (a equipe do projeto mediu) ou parceiro (o dado chegou da organizacao parceira responsavel pela frente). A distincao e de auditoria, nao burocracia: dado reportado por terceiro tem outro peso na verificacao e costuma exigir a evidencia anexada.';
comment on column public.carbon_indicador_medicoes.observacao is
  'Contexto da medicao: o que explica um valor fora da curva, qual evidencia acompanha. LGPD: sem nome de pessoa.';
comment on column public.carbon_indicador_medicoes.criado_por is
  'Quem lancou, para rastreabilidade. Vem do token, nunca do corpo.';
comment on column public.carbon_indicador_medicoes.atualizado_em is
  'Mantido pela trigger carbon_indicador_medicoes_atualizado_em. A medicao tem UPDATE porque corrigir um valor digitado errado e rotina; apagar e recriar perderia criado_por e criado_em, que sao a trilha do lancamento original.';

-- (indicador_id, data desc): a serie e sempre lida por indicador, do mais recente
-- para o mais antigo, e o desempate por criado_em/id e o mesmo da regra de
-- "ultima medicao".
create index if not exists carbon_indicador_medicoes_indicador_data_idx
  on public.carbon_indicador_medicoes (indicador_id, data desc, criado_em desc, id desc);


create or replace function public.carbon_indicador_medicoes_set_atualizado_em()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

comment on function public.carbon_indicador_medicoes_set_atualizado_em() is
  'Mantem carbon_indicador_medicoes.atualizado_em em dia a cada UPDATE.';

drop trigger if exists carbon_indicador_medicoes_atualizado_em on public.carbon_indicador_medicoes;
create trigger carbon_indicador_medicoes_atualizado_em
  before update on public.carbon_indicador_medicoes
  for each row
  execute function public.carbon_indicador_medicoes_set_atualizado_em();

alter table public.carbon_indicador_medicoes enable row level security;
revoke all on table public.carbon_indicador_medicoes from anon, authenticated;
grant all on table public.carbon_indicador_medicoes to service_role;


-- =============================================================================
-- 4. Funcoes: as regras de calculo, escritas UMA vez
-- =============================================================================
-- Toda regra que a tela mostra mora aqui, e nao no cliente. O motivo e o de sempre
-- neste projeto: duas implementacoes da mesma conta divergem na primeira mudanca, e
-- a divergencia aparece como numero diferente entre a tela e um relatorio. As
-- funcoes que leem tabela sao security definer (contornam a RLS) e por isso tem o
-- EXECUTE revogado de public/anon/authenticated no fim desta secao.


-- 4.1 Frentes e sua ordem ------------------------------------------------------
-- A ordem e a do plano de impacto (a mesma do levantamento), nao a alfabetica.
-- Ver a nota sobre a lista aparecer duas vezes, no cabecalho do arquivo.
create or replace function public.carbon_meta_frentes()
returns table (frente text, ordem integer)
language sql
immutable
security invoker
set search_path = ''
as $$
  select f.frente, f.ordem
    from (values
      ('fortalecimento_institucional'::text, 1),
      ('monitoramento'::text,                2),
      ('educacao'::text,                     3),
      ('sensibilizacao'::text,               4),
      ('bioeconomia'::text,                  5),
      ('prestacao_contas'::text,             6)
    ) as f(frente, ordem);
$$;

comment on function public.carbon_meta_frentes() is
  'As seis frentes de atuacao aceitas em carbon_metas.frente e a ORDEM em que devem aparecer (a ordem do plano de impacto, nao alfabetica). Fonte unica da ordenacao usada por carbon_metas_listar e carbon_metas_progresso, que tambem devolve frente sem nenhuma meta - a tela precisa mostrar a frente vazia para a lacuna ficar visivel. Precisa ser mantida em sincronia com o CHECK da coluna: o PostgreSQL nao aceita funcao de conjunto dentro de CHECK.';


create or replace function public.carbon_meta_frente_ordem(p_frente text)
returns integer
language sql
immutable
security invoker
set search_path = ''
as $$
  -- 99 para valor desconhecido: ordena no fim em vez de virar NULL e baguncar a
  -- ordenacao inteira. O CHECK da coluna ja impede que isso aconteca de verdade.
  select coalesce(
    (select f.ordem from public.carbon_meta_frentes() f where f.frente = p_frente),
    99
  );
$$;

comment on function public.carbon_meta_frente_ordem(text) is
  'Posicao de uma frente na ordem do plano de impacto. Frente desconhecida devolve 99 (ordena no fim). Usada no ORDER BY das consultas de meta.';


-- 4.2 Janela sazonal -----------------------------------------------------------
-- A JANELA PODE ATRAVESSAR O ANO. A estacao chuvosa vai de outubro a abril, o que
-- se escreve mes_inicio = 10, mes_fim = 4. Comparar os dois numeros diretamente
-- ("mes between inicio and fim") devolveria janela vazia justamente no caso que
-- motivou a coluna. Por isso a interpretacao esta nesta funcao, uma vez.
create or replace function public.carbon_meta_mes_na_janela(
  p_mes        integer,
  p_mes_inicio integer,
  p_mes_fim    integer
)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
           when p_mes is null then false
           -- Sem janela definida, todo mes vale: meta sem sazonalidade acontece o
           -- ano inteiro.
           when p_mes_inicio is null or p_mes_fim is null then true
           when p_mes_inicio <= p_mes_fim then p_mes between p_mes_inicio and p_mes_fim
           -- Janela que vira o ano: maio a setembro e o complemento de outubro a
           -- abril, e as duas precisam funcionar com a mesma expressao.
           else p_mes >= p_mes_inicio or p_mes <= p_mes_fim
         end;
$$;

comment on function public.carbon_meta_mes_na_janela(integer, integer, integer) is
  'Diz se um mes (1 a 12) cai dentro da janela sazonal da meta. Janela nao definida aceita qualquer mes. Trata a janela que ATRAVESSA O ANO (mes_inicio 10, mes_fim 4 = estacao chuvosa), que e o caso real do plano de impacto e o motivo de esta regra nao ser um simples BETWEEN.';


-- 4.3 Ocorrencias previstas ----------------------------------------------------
-- E o numero que permite preencher o "XX" de uma meta recorrente sem inventar
-- nada: "rondas quinzenais, de maio a setembro de 2026" sao 5 meses na janela x 2
-- = 10 rondas previstas. A tela oferece isso como SUGESTAO de valor_alvo; nao
-- grava sozinha, porque a decisao do alvo e do dono do projeto.
--
-- APROXIMACAO ASSUMIDA: mes iniciado conta como mes inteiro. Um periodo de
-- 10/05 a 20/09 conta 5 meses. Refinar isso exigiria contar quinzenas de calendario
-- e traria uma discussao de regra (a quinzena que comeca em setembro e cai em
-- outubro conta?) que ninguem pediu. O numero e sugestao, nao compromisso.
create or replace function public.carbon_meta_ocorrencias_previstas(
  p_periodicidade  text,
  p_periodo_inicio date,
  p_periodo_fim    date,
  p_mes_inicio     integer,
  p_mes_fim        integer
)
returns integer
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_meses_corridos integer;
  v_mes_primeiro   integer;
  v_meses_janela   integer := 0;
  v_i              integer;
begin
  -- Acao unica acontece uma vez, com ou sem periodo declarado.
  if p_periodicidade = 'unica' then
    return 1;
  end if;

  -- Sem periodo nao ha o que prever: NULL e honesto, zero mentiria.
  if p_periodo_inicio is null or p_periodo_fim is null then
    return null;
  end if;

  v_meses_corridos :=
      (extract(year from p_periodo_fim)::integer * 12 + extract(month from p_periodo_fim)::integer)
    - (extract(year from p_periodo_inicio)::integer * 12 + extract(month from p_periodo_inicio)::integer)
    + 1;

  -- O check da tabela impede periodo invertido, mas a funcao pode ser chamada com
  -- valores soltos (e a versao JS do modo demonstracao espelha esta guarda).
  if v_meses_corridos < 1 then
    return 0;
  end if;

  -- Rede de seguranca: 100 anos. Periodo de creditacao de 30 anos digitado por
  -- engano como periodo de meta recorrente daria centenas de ocorrencias, numero
  -- que nao ajuda ninguem; NULL manda a tela mostrar "nao calculado".
  if v_meses_corridos > 1200 then
    return null;
  end if;

  v_mes_primeiro := extract(month from p_periodo_inicio)::integer;

  for v_i in 0 .. v_meses_corridos - 1 loop
    -- Mes do calendario do i-esimo mes do periodo, girando de 12 para 1.
    if public.carbon_meta_mes_na_janela(
         1 + ((v_mes_primeiro - 1 + v_i) % 12), p_mes_inicio, p_mes_fim
       ) then
      v_meses_janela := v_meses_janela + 1;
    end if;
  end loop;

  if p_periodicidade = 'mensal' then
    return v_meses_janela;
  end if;
  if p_periodicidade = 'quinzenal' then
    return v_meses_janela * 2;
  end if;
  if p_periodicidade = 'trimestral' then
    -- Arredonda para cima: dois meses de janela ainda tem uma ocorrencia dentro.
    return ceil(v_meses_janela::numeric / 3)::integer;
  end if;

  -- Periodicidade desconhecida (nao deve ocorrer pelo CHECK): nao inventa numero.
  return null;
end;
$$;

comment on function public.carbon_meta_ocorrencias_previstas(text, date, date, integer, integer) is
  'Quantas vezes uma acao recorrente deve acontecer no periodo da meta, considerando a janela sazonal: mensal = meses na janela, quinzenal = meses x 2, trimestral = meses / 3 arredondado para cima, unica = 1. Devolve NULL quando falta periodo (nao ha o que prever) ou quando o periodo passa de 100 anos. Aproximacao assumida: mes iniciado conta inteiro. E o numero que a tela oferece como sugestao de valor_alvo para as metas que ficaram com placeholder XX no Notion.';


-- 4.4 Percentual e atraso ------------------------------------------------------
create or replace function public.carbon_meta_pct(
  p_realizado  numeric,
  p_valor_alvo numeric
)
returns numeric
language sql
immutable
security invoker
set search_path = ''
as $$
  -- NULL quando nao ha o que comparar: sem alvo, sem medicao, ou alvo zero (meta
  -- de "nenhuma ocorrencia", que nao se expressa em percentual e nunca deve virar
  -- divisao por zero). Uma casa decimal, igual ao progresso de PDD e de
  -- monitoramento. Pode passar de 100: meta superada e informacao, nao erro, e o
  -- corte para a barra e feito na tela.
  select case
           when p_realizado is null or p_valor_alvo is null or p_valor_alvo = 0 then null
           else round(p_realizado * 100.0 / p_valor_alvo, 1)
         end;
$$;

comment on function public.carbon_meta_pct(numeric, numeric) is
  'Percentual do realizado sobre o alvo, com uma casa. NULL quando falta realizado, falta alvo ou o alvo e zero (nunca divide por zero). Pode passar de 100 de proposito: meta superada e informacao. Regra escrita uma vez porque a tela, a listagem e o progresso agregado precisam do mesmo numero.';


create or replace function public.carbon_meta_atrasada(
  p_status      text,
  p_periodo_fim date
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  -- STABLE, nao IMMUTABLE: depende de current_date. E exatamente por isso que
  -- atraso nao e coluna nem valor de status - a meta vira atrasada a meia-noite,
  -- sem ninguem tocar na linha, e um campo gravado mentiria a partir dali.
  select p_periodo_fim is not null
     and p_periodo_fim < current_date
     and coalesce(p_status, '') not in ('concluida', 'cancelada');
$$;

comment on function public.carbon_meta_atrasada(text, date) is
  'Meta atrasada: tem prazo, o prazo passou e ela nao esta concluida nem cancelada. Derivacao com current_date, por isso STABLE e por isso nao existe status atrasada em carbon_metas.';


-- 4.5 Realizado do indicador ---------------------------------------------------
-- A REGRA CENTRAL DA MEDICAO, e o motivo de ela estar no banco: acumulativo soma
-- as medicoes da janela; nao acumulativo vale a ULTIMA medicao da janela. Somar
-- percentual de meses diferentes produziria um numero que nao existe.
create or replace function public.carbon_indicador_realizado(
  p_indicador_id uuid,
  p_de           date default null,
  p_ate          date default null
)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_acumulativo boolean;
  v_valor       numeric;
begin
  if p_indicador_id is null then
    return null;
  end if;

  select i.acumulativo
    into v_acumulativo
    from public.carbon_indicadores i
   where i.id = p_indicador_id;

  -- Indicador inexistente devolve NULL; quem chama responde 404 se precisar.
  if not found then
    return null;
  end if;

  if v_acumulativo then
    select sum(m.valor)
      into v_valor
      from public.carbon_indicador_medicoes m
     where m.indicador_id = p_indicador_id
       and (p_de is null or m.data >= p_de)
       and (p_ate is null or m.data <= p_ate);

    -- sum() de conjunto vazio e NULL, e mantemos NULL de proposito: "sem medicao"
    -- e diferente de "medido zero". Trocar por coalesce(...,0) faria a tela mostrar
    -- 0% de progresso onde a verdade e que ninguem mediu ainda.
    return v_valor;
  end if;

  -- Desempate deterministico, igual ao indice
  -- carbon_indicador_medicoes_indicador_data_idx: sem ele, duas medicoes no mesmo
  -- dia fariam "a ultima" mudar entre duas execucoes da mesma consulta.
  select m.valor
    into v_valor
    from public.carbon_indicador_medicoes m
   where m.indicador_id = p_indicador_id
     and (p_de is null or m.data >= p_de)
     and (p_ate is null or m.data <= p_ate)
   order by m.data desc, m.criado_em desc, m.id desc
   limit 1;

  return v_valor;
end;
$$;

comment on function public.carbon_indicador_realizado(uuid, date, date) is
  'Valor realizado de um indicador dentro de uma janela de datas (aberta nas duas pontas quando os parametros sao NULL): SOMA das medicoes quando acumulativo, ULTIMA medicao quando nao acumulativo (desempate por data, criado_em e id). Devolve NULL quando nao ha medicao na janela ou o indicador nao existe - NULL significa "sem medicao" e e diferente de zero. Regra unica: a versao JS do modo demonstracao e traducao literal desta funcao.';


-- 4.6 JSON de um indicador -----------------------------------------------------
-- Uma unica montagem do objeto que a tela recebe, usada pela listagem de
-- indicadores e por dentro do JSON da meta. Duas montagens divergiriam em campo, e
-- a tela quebraria em um dos dois caminhos.
create or replace function public.carbon_indicador_json(
  p_indicador_id uuid,
  p_de           date default null,
  p_ate          date default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id',            i.id,
    'projeto_id',    i.projeto_id,
    'meta_id',       i.meta_id,
    'nome',          i.nome,
    'unidade',       i.unidade,
    'tipo',          i.tipo,
    'acumulativo',   i.acumulativo,
    'descricao',     i.descricao,
    'criado_em',     i.criado_em,
    'atualizado_em', i.atualizado_em,
    'realizado',     public.carbon_indicador_realizado(i.id, p_de, p_ate),
    -- Total de medicoes do indicador, IGNORANDO a janela, e quantas caem nela. A
    -- diferenca entre os dois e o que permite a tela avisar "ha medicao fora do
    -- periodo da meta", que e erro de lancamento comum e invisivel de outra forma.
    'medicoes_total', (
      select count(*)
        from public.carbon_indicador_medicoes m
       where m.indicador_id = i.id
    ),
    'medicoes_janela', (
      select count(*)
        from public.carbon_indicador_medicoes m
       where m.indicador_id = i.id
         and (p_de is null or m.data >= p_de)
         and (p_ate is null or m.data <= p_ate)
    ),
    'ultima_data', (
      select max(m.data)
        from public.carbon_indicador_medicoes m
       where m.indicador_id = i.id
         and (p_de is null or m.data >= p_de)
         and (p_ate is null or m.data <= p_ate)
    ),
    -- Serie curta embutida, na ordem cronologica, para a tela desenhar a evolucao
    -- sem uma requisicao por indicador. A serie completa sai pela rota
    -- /indicadores/:id/medicoes.
    'serie', coalesce((
      select jsonb_agg(jsonb_build_object('data', s.data, 'valor', s.valor, 'origem', s.origem)
                       order by s.data, s.criado_em, s.id)
        from (
          select m.data, m.valor, m.origem, m.criado_em, m.id
            from public.carbon_indicador_medicoes m
           where m.indicador_id = i.id
             and (p_de is null or m.data >= p_de)
             and (p_ate is null or m.data <= p_ate)
           order by m.data desc, m.criado_em desc, m.id desc
           limit 24
        ) s
    ), '[]'::jsonb)
  )
    from public.carbon_indicadores i
   where i.id = p_indicador_id;
$$;

comment on function public.carbon_indicador_json(uuid, date, date) is
  'Indicador com os derivados que a tela mostra: realizado na janela, medicoes_total (todas) e medicoes_janela (as que contam), ultima_data e serie com as 24 medicoes mais recentes da janela em ordem cronologica. A janela vem do periodo da meta quando ha meta. Montagem unica, usada pela listagem de indicadores e por carbon_meta_json.';


-- 4.7 Realizado da meta --------------------------------------------------------
create or replace function public.carbon_meta_realizado(p_meta_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  -- Soma o realizado de cada indicador vinculado, dentro do PERIODO DA META: sem
  -- esse recorte a ronda do ciclo anterior apareceria como progresso deste.
  --
  -- LIMITACAO ASSUMIDA, e a tela a torna visivel: somamos os indicadores sem
  -- conferir se as unidades combinam. Uma meta com um indicador em toneladas e
  -- outro em por cento produziria um numero sem sentido. Barrar isso no banco
  -- exigiria uma regra de unidade canonica que ninguem pediu e que impediria casos
  -- legitimos (duas contagens da mesma coisa em frentes diferentes). Por isso a
  -- tela lista a contribuicao de CADA indicador com a sua unidade ao lado do total:
  -- a incoerencia fica a vista de quem revisa, que e quem sabe decidir.
  --
  -- sum() ignora NULL: indicador sem medicao nao zera o realizado dos outros. Se
  -- NENHUM indicador tem medicao, o resultado e NULL - "sem medicao", nao zero.
  select sum(public.carbon_indicador_realizado(i.id, m.periodo_inicio, m.periodo_fim))
    from public.carbon_metas m
    join public.carbon_indicadores i on i.meta_id = m.id
   where m.id = p_meta_id;
$$;

comment on function public.carbon_meta_realizado(uuid) is
  'Valor realizado de uma meta: soma do realizado de cada indicador vinculado, restrito ao periodo da meta. NULL quando a meta nao tem indicador ou nenhum indicador tem medicao no periodo - e assim que a tela distingue "ninguem mediu" de "medido zero". Nao confere coerencia de unidade entre indicadores, de proposito: ver o comentario dentro da funcao.';


-- 4.8 JSON de uma meta ---------------------------------------------------------
-- Existe para a rota devolver a meta ENRIQUECIDA (com realizado, percentual,
-- atraso, previsto e indicadores) depois de um POST ou PATCH, com exatamente o
-- mesmo formato da listagem. Sem isso, a tela receberia um objeto pobre depois de
-- salvar e mostraria a linha diferente ate o proximo carregamento.
create or replace function public.carbon_meta_json(p_meta_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id',             m.id,
    'projeto_id',     m.projeto_id,
    'frente',         m.frente,
    'descricao',      m.descricao,
    'parceiro_id',    m.parceiro_id,
    -- Nome resolvido aqui para a tela nao precisar de uma segunda requisicao. Vem
    -- de carbon_fornecedores enquanto a pendencia 1 do cabecalho nao for decidida.
    'parceiro_nome',  (
      select f.nome from public.carbon_fornecedores f where f.id = m.parceiro_id
    ),
    'valor_alvo',     m.valor_alvo,
    'unidade',        m.unidade,
    'periodicidade',  m.periodicidade,
    'mes_inicio',     m.mes_inicio,
    'mes_fim',        m.mes_fim,
    'periodo_inicio', m.periodo_inicio,
    'periodo_fim',    m.periodo_fim,
    'status',         m.status,
    'observacoes',    m.observacoes,
    'criado_em',      m.criado_em,
    'atualizado_em',  m.atualizado_em,
    'realizado',      public.carbon_meta_realizado(m.id),
    'pct',            public.carbon_meta_pct(public.carbon_meta_realizado(m.id), m.valor_alvo),
    'atrasada',       public.carbon_meta_atrasada(m.status, m.periodo_fim),
    'ocorrencias_previstas', public.carbon_meta_ocorrencias_previstas(
      m.periodicidade, m.periodo_inicio, m.periodo_fim, m.mes_inicio, m.mes_fim
    ),
    'indicadores', coalesce((
      select jsonb_agg(
               public.carbon_indicador_json(i.id, m.periodo_inicio, m.periodo_fim)
               order by i.nome, i.id
             )
        from public.carbon_indicadores i
       where i.meta_id = m.id
    ), '[]'::jsonb),
    -- Evidencias vinculadas pela tabela generica de documentos (tipo_alvo 'meta').
    -- So a contagem: a lista sai pela rota /metas/:id/documentos, que e aberta sob
    -- demanda, para a listagem de metas nao carregar documento de todas elas.
    'documentos_total', (
      select count(*)
        from public.carbon_documento_vinculos v
       where v.tipo_alvo = 'meta'
         and v.alvo_id = m.id
    )
  )
    from public.carbon_metas m
   where m.id = p_meta_id;
$$;

comment on function public.carbon_meta_json(uuid) is
  'Meta com todos os derivados que a tela mostra: parceiro_nome, realizado, pct, atrasada, ocorrencias_previstas, os indicadores vinculados (cada um com a sua serie, recortada pelo periodo da meta) e a contagem de evidencias vinculadas. Montagem unica, usada pela listagem e pelo retorno das rotas de escrita, para a linha nao mudar de forma depois de salvar.';


-- 4.9 Listagem de metas do projeto --------------------------------------------
create or replace function public.carbon_metas_listar(
  p_projeto_id uuid,
  p_frente     text default null,
  p_status     text default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select
      m.id,
      public.carbon_meta_frente_ordem(m.frente) as frente_ordem,
      m.periodo_inicio,
      m.criado_em
      from public.carbon_metas m
     where m.projeto_id = p_projeto_id
       and (p_frente is null or m.frente = p_frente)
       and (p_status is null or m.status = p_status)
     order by frente_ordem, m.periodo_inicio nulls last, m.criado_em, m.id
     -- Corte de seguranca, nao paginacao: um plano de impacto real tem dezenas de
     -- metas, nao centenas. Se um dia chegar perto, o lugar de resolver e uma rota
     -- paginada, e nao aumentar este numero em silencio.
     limit 500
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    -- ORDER BY dentro do jsonb_agg de proposito: a ordem de um CTE nao e garantida
    -- na leitura, so na materializacao. Sem isto a lista poderia sair fora da
    -- ordem das frentes sem nenhum aviso.
    'metas', coalesce((
      select jsonb_agg(
               public.carbon_meta_json(b.id)
               order by b.frente_ordem, b.periodo_inicio nulls last, b.criado_em, b.id
             )
        from base b
    ), '[]'::jsonb)
  );
$$;

comment on function public.carbon_metas_listar(uuid, text, text) is
  'Metas de um projeto, cada uma no formato de carbon_meta_json, ordenadas pela ordem das frentes do plano de impacto e depois por inicio de periodo. Filtros opcionais por frente e por status. total e a quantidade devolvida (corte de seguranca em 500 registros). Projeto sem meta devolve total 0 e lista vazia, nunca NULL.';


-- 4.10 Listagem de indicadores -------------------------------------------------
create or replace function public.carbon_indicadores_listar(
  p_projeto_id       uuid,
  p_somente_sem_meta boolean default false
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select i.id, i.nome, i.meta_id
      from public.carbon_indicadores i
     where i.projeto_id = p_projeto_id
       and (not coalesce(p_somente_sem_meta, false) or i.meta_id is null)
     order by i.nome, i.id
     limit 500
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'indicadores', coalesce((
      -- A janela de datas vem da meta vinculada; indicador sem meta usa janela
      -- aberta (NULL, NULL), ou seja toda a serie conta.
      select jsonb_agg(
               public.carbon_indicador_json(b.id, mm.periodo_inicio, mm.periodo_fim)
               order by b.nome, b.id
             )
        from base b
        left join public.carbon_metas mm on mm.id = b.meta_id
    ), '[]'::jsonb)
  );
$$;

comment on function public.carbon_indicadores_listar(uuid, boolean) is
  'Indicadores de um projeto no formato de carbon_indicador_json, em ordem alfabetica. p_somente_sem_meta = true devolve so os que nao estao vinculados a meta nenhuma, que e a lista que a tela mostra em bloco separado (eles existem: a base Indicadores do Notion era separada da arvore de objetivos). Corte de seguranca em 500 registros.';


-- 4.11 Progresso agregado ------------------------------------------------------
-- Os numeros do topo da tela. O mais importante deles e sem_valor_alvo: e a
-- medida da lacuna que originou a issue #14, e ele existe para a lacuna ser
-- contada em vez de descoberta lendo meta por meta.
create or replace function public.carbon_metas_progresso(p_projeto_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select
      m.id,
      m.frente,
      m.status,
      m.valor_alvo,
      public.carbon_meta_atrasada(m.status, m.periodo_fim) as atrasada,
      public.carbon_meta_realizado(m.id)                  as realizado,
      (
        select count(*)
          from public.carbon_indicadores i
         where i.meta_id = m.id
      ) as indicadores
      from public.carbon_metas m
     where m.projeto_id = p_projeto_id
  ),
  calc as (
    select
      b.*,
      public.carbon_meta_pct(b.realizado, b.valor_alvo) as pct
      from base b
  ),
  totais as (
    -- Agregacao sem GROUP BY devolve SEMPRE uma linha, inclusive com base vazia: e
    -- o que garante zeros em vez de NULL para projeto sem meta nenhuma.
    select
      count(*)                                                   as total,
      count(*) filter (where valor_alvo is not null)              as quantificadas,
      count(*) filter (where valor_alvo is null)                  as sem_valor_alvo,
      count(*) filter (where indicadores = 0)                     as sem_indicador,
      count(*) filter (where realizado is null)                   as sem_medicao,
      count(*) filter (where status = 'planejada')                as planejadas,
      count(*) filter (where status = 'em_andamento')             as em_andamento,
      count(*) filter (where status = 'concluida')                as concluidas,
      count(*) filter (where status = 'cancelada')                as canceladas,
      count(*) filter (where atrasada)                            as atrasadas,
      -- Media do percentual das metas mensuraveis. least(pct, 100) de proposito:
      -- sem o corte, uma meta superada em 400% mascararia tres metas paradas.
      -- Cancelada fica fora da media: ela nao vai acontecer.
      coalesce(
        round(
          avg(least(pct, 100)) filter (where pct is not null and status <> 'cancelada'),
          1
        ),
        0
      ) as pct_medio,
      count(*) filter (where pct is not null and status <> 'cancelada') as com_pct
      from calc
  ),
  por_frente as (
    -- LEFT JOIN a partir das frentes: frente SEM meta nenhuma aparece com zeros. A
    -- tela precisa mostrar a frente vazia, senao a ausencia de meta numa frente do
    -- plano fica invisivel - que e metade do problema que esta issue ataca.
    select
      f.frente,
      f.ordem,
      count(c.id)                                                  as total,
      count(c.id) filter (where c.valor_alvo is not null)            as quantificadas,
      count(c.id) filter (where c.valor_alvo is null)                as sem_valor_alvo,
      count(c.id) filter (where c.status = 'concluida')              as concluidas,
      count(c.id) filter (where c.atrasada)                          as atrasadas,
      coalesce(
        round(
          avg(least(c.pct, 100)) filter (where c.pct is not null and c.status <> 'cancelada'),
          1
        ),
        0
      ) as pct_medio
      from public.carbon_meta_frentes() f
      left join calc c on c.frente = f.frente
     group by f.frente, f.ordem
  )
  select jsonb_build_object(
    'total',          t.total,
    'quantificadas',  t.quantificadas,
    'sem_valor_alvo', t.sem_valor_alvo,
    'sem_indicador',  t.sem_indicador,
    'sem_medicao',    t.sem_medicao,
    'concluidas',     t.concluidas,
    'atrasadas',      t.atrasadas,
    'pct_medio',      t.pct_medio,
    'com_pct',        t.com_pct,
    'por_status', jsonb_build_object(
      'planejada',    t.planejadas,
      'em_andamento', t.em_andamento,
      'concluida',    t.concluidas,
      'cancelada',    t.canceladas
    ),
    'indicadores_total', (
      select count(*)
        from public.carbon_indicadores i
       where i.projeto_id = p_projeto_id
    ),
    'indicadores_sem_meta', (
      select count(*)
        from public.carbon_indicadores i
       where i.projeto_id = p_projeto_id
         and i.meta_id is null
    ),
    'medicoes_total', (
      select count(*)
        from public.carbon_indicador_medicoes md
        join public.carbon_indicadores i on i.id = md.indicador_id
       where i.projeto_id = p_projeto_id
    ),
    'por_frente', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'frente',         pf.frente,
                 'ordem',          pf.ordem,
                 'total',          pf.total,
                 'quantificadas',  pf.quantificadas,
                 'sem_valor_alvo', pf.sem_valor_alvo,
                 'concluidas',     pf.concluidas,
                 'atrasadas',      pf.atrasadas,
                 'pct_medio',      pf.pct_medio
               )
               order by pf.ordem
             )
        from por_frente pf
    ), '[]'::jsonb)
  )
    from totais t;
$$;

comment on function public.carbon_metas_progresso(uuid) is
  'Numeros do topo da tela de metas de um projeto: total, quantificadas, sem_valor_alvo (a medida da lacuna que originou a issue #14), sem_indicador, sem_medicao, concluidas, atrasadas, pct_medio (media dos percentuais, cortados em 100 e sem as canceladas), por_status, contagens de indicador e medicao, e por_frente com as SEIS frentes sempre presentes, inclusive as que nao tem meta nenhuma. Projeto sem meta devolve zeros e as seis frentes zeradas, nunca NULL.';


-- Privilegios das funcoes -----------------------------------------------------
-- O PostgreSQL concede EXECUTE a PUBLIC em toda funcao nova. As SECURITY DEFINER
-- daqui leem tabela com RLS ativa: deixar assim exporia leitura de meta e de
-- medicao pela anon key via /rest/v1/rpc, contornando a RLS. As IMMUTABLE que nao
-- tocam tabela (frentes, ordem, janela, previsto, pct) tambem sao revogadas, por
-- consistencia e para nao dar pista de vocabulario interno a quem so tem a anon
-- key.
revoke all on function public.carbon_meta_frentes()                                   from public, anon, authenticated;
revoke all on function public.carbon_meta_frente_ordem(text)                          from public, anon, authenticated;
revoke all on function public.carbon_meta_mes_na_janela(integer, integer, integer)     from public, anon, authenticated;
revoke all on function public.carbon_meta_ocorrencias_previstas(text, date, date, integer, integer)
  from public, anon, authenticated;
revoke all on function public.carbon_meta_pct(numeric, numeric)                       from public, anon, authenticated;
revoke all on function public.carbon_meta_atrasada(text, date)                        from public, anon, authenticated;
revoke all on function public.carbon_indicador_realizado(uuid, date, date)            from public, anon, authenticated;
revoke all on function public.carbon_indicador_json(uuid, date, date)                 from public, anon, authenticated;
revoke all on function public.carbon_meta_realizado(uuid)                             from public, anon, authenticated;
revoke all on function public.carbon_meta_json(uuid)                                  from public, anon, authenticated;
revoke all on function public.carbon_metas_listar(uuid, text, text)                   from public, anon, authenticated;
revoke all on function public.carbon_indicadores_listar(uuid, boolean)                from public, anon, authenticated;
revoke all on function public.carbon_metas_progresso(uuid)                            from public, anon, authenticated;

grant execute on function public.carbon_meta_frentes()                                to service_role;
grant execute on function public.carbon_meta_frente_ordem(text)                       to service_role;
grant execute on function public.carbon_meta_mes_na_janela(integer, integer, integer)  to service_role;
grant execute on function public.carbon_meta_ocorrencias_previstas(text, date, date, integer, integer)
  to service_role;
grant execute on function public.carbon_meta_pct(numeric, numeric)                    to service_role;
grant execute on function public.carbon_meta_atrasada(text, date)                     to service_role;
grant execute on function public.carbon_indicador_realizado(uuid, date, date)         to service_role;
grant execute on function public.carbon_indicador_json(uuid, date, date)              to service_role;
grant execute on function public.carbon_meta_realizado(uuid)                          to service_role;
grant execute on function public.carbon_meta_json(uuid)                               to service_role;
grant execute on function public.carbon_metas_listar(uuid, text, text)                to service_role;
grant execute on function public.carbon_indicadores_listar(uuid, boolean)             to service_role;
grant execute on function public.carbon_metas_progresso(uuid)                         to service_role;


-- =============================================================================
-- 5. Sem SEED, e o motivo
-- =============================================================================
-- As outras migrations semeiam template (estrutura de capitulo do PDD, do relatorio
-- de monitoramento): metodologia PUBLICA, que nao e dado de cliente. Aqui nao ha
-- equivalente. Meta e indicador de um projeto sao dado de cliente e nao existe
-- lista publicada para semear: as frentes vem do plano de impacto daquele projeto.
--
-- Semear as metas observadas no Notion tambem esta fora de questao por dois
-- motivos: elas estao com os valores em placeholder (nao ha o que semear de util) e
-- entrariam como dado de cliente dentro de um arquivo de migration versionado.
-- Quem cadastra e a equipe, pela tela. O dataset ficticio da revisao visual vive em
-- src/lib/demo/metas.js e nunca no banco.


-- =============================================================================
-- 6. Conferencia da instalacao
-- =============================================================================
-- Notices, nao excecoes: a migration nao deve falhar por causa de ajuste legitimo
-- feito pelo SQL Editor. O objetivo e a saida do "supabase db push" mostrar que as
-- tres tabelas e as funcoes de calculo entraram.

do $$
declare
  v_tabelas  integer;
  v_funcoes  integer;
  v_frentes  integer;
  v_previsto integer;
begin
  select count(*) into v_tabelas
    from pg_tables
   where schemaname = 'public'
     and tablename in ('carbon_metas', 'carbon_indicadores', 'carbon_indicador_medicoes');

  select count(*) into v_funcoes
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in (
       'carbon_meta_frentes', 'carbon_meta_frente_ordem', 'carbon_meta_mes_na_janela',
       'carbon_meta_ocorrencias_previstas', 'carbon_meta_pct', 'carbon_meta_atrasada',
       'carbon_indicador_realizado', 'carbon_indicador_json', 'carbon_meta_realizado',
       'carbon_meta_json', 'carbon_metas_listar', 'carbon_indicadores_listar',
       'carbon_metas_progresso'
     );

  select count(*) into v_frentes from public.carbon_meta_frentes();

  -- Conferencia da regra que mais facilmente passaria errada sem ninguem notar:
  -- rondas quinzenais na seca (maio a setembro) de 2026 devem dar 10 ocorrencias
  -- previstas (5 meses na janela x 2).
  select public.carbon_meta_ocorrencias_previstas(
           'quinzenal', date '2026-01-01', date '2026-12-31', 5, 9
         ) into v_previsto;

  raise notice 'metas: % de 3 tabelas, % de 13 funcoes, % frentes, previsto de teste = % (esperado 10).',
    v_tabelas, v_funcoes, v_frentes, v_previsto;

  if v_tabelas <> 3 or v_funcoes <> 13 or v_frentes <> 6 then
    raise notice 'ATENCAO: instalacao incompleta do dominio de metas. Ver 20260814100000_metas.sql.';
  end if;

  if v_previsto is distinct from 10 then
    raise notice 'ATENCAO: carbon_meta_ocorrencias_previstas devolveu % para quinzenal na janela 5-9 de 2026; esperado 10.', v_previsto;
  end if;
end $$;

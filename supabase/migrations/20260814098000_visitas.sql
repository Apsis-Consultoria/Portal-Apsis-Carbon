-- =============================================================================
-- Apsis Carbon - viagens (rodadas de visitas), visitas comerciais e auditoria LGPD
-- Arquivo: 20260814098000_visitas.sql
-- =============================================================================
-- Atende a issue #12 do backlog (docs/issues/BACKLOG-INICIAL.md), levantada em
-- docs/notion/04-relatorio-de-visitas.md.
--
-- O QUE O LEVANTAMENTO ENCONTROU, E QUE JUSTIFICA CADA DECISAO AQUI:
--
--   1. VIAGEM NAO EXISTE COMO CONCEITO. As visitas sao registradas uma a uma
--      repetindo "Localidade" e "Data", embora uma viagem gere varias visitas no
--      mesmo dia e na mesma cidade (o levantamento observou duas ondas, em duas
--      capitais). Aqui a rodada e ENTIDADE: carbon_viagens guarda titulo, cidade,
--      uf e periodo uma vez, e cada visita aponta para ela. Continuar repetindo
--      cidade e data em cada linha e o que produz base com localidade escrita de
--      tres formas diferentes.
--
--   2. O FOLLOW-UP NAO TEM DONO NEM PRAZO. Quase todo registro esta em "Nao
--      iniciada", o que nao e coincidencia: a base nao tem onde guardar quem
--      responde nem para quando. Por isso follow_up_status, follow_up_responsavel_id
--      e follow_up_prazo sao colunas, e o que passou do prazo e calculado no BANCO
--      (ver carbon_visitas_base), nao em cada tela.
--
-- =============================================================================
-- LGPD - ESTE E O REQUISITO CENTRAL DESTA MIGRATION, NAO UM DETALHE
-- =============================================================================
-- carbon_visitas guarda NOME, TELEFONE e E-MAIL de pessoas que trabalham em
-- organizacoes externas, ou seja DADO PESSOAL DE TERCEIROS, coletado sem que o
-- titular tenha preenchido formulario nenhum. O tratamento fica registrado assim:
--
--   BASE LEGAL: interesse legitimo do controlador (Lei 13.709/2018, art. 7, IX),
--   na modalidade de prospeccao comercial entre pessoas juridicas (B2B). O contato
--   e a pessoa que atende a APSIS na organizacao visitada, na sua capacidade
--   profissional. NAO ha consentimento e nao se pretende que haja: o registro
--   existe para dar continuidade a uma conversa que a propria pessoa manteve.
--
--   FINALIDADE: retomar contato comercial sobre projeto de carbono com a
--   organizacao visitada (follow-up da visita). Qualquer outro uso, em especial
--   envio de comunicacao em massa, enriquecimento de base, cruzamento com outras
--   bases ou compartilhamento com terceiros, esta FORA da finalidade declarada.
--
--   MINIMIZACAO: as tres colunas de contato sao as unicas que o trabalho exige, e
--   a funcao de listagem (carbon_visitas_base) NAO AS SELECIONA. Elas saem do banco
--   somente por carbon_visita_detalhe, com p_incluir_contato = true, e por
--   carbon_visitas_exportar. Quem decide esse booleano e a Edge Function, pelo papel
--   do colaborador (admin ou gestor). Blindar a listagem no BANCO, e nao apenas na
--   API, significa que um erro futuro na Edge Function nao vaza a coluna: ela nao
--   esta no resultado.
--
--   RETENCAO: carbon_visitas.retencao_ate, preenchida por trigger com 24 meses a
--   contar da data da visita quando nao informada. O prazo e o ciclo de prospeccao
--   observado (duas ondas de visita ao longo de um ano), e esta escolhida aqui como
--   DEFAULT OPERACIONAL: a validacao do prazo com o juridico/DPO da APSIS e
--   pendencia do dono, nao decisao deste arquivo. Passado o prazo,
--   carbon_visitas_anonimizar_vencidas limpa o contato.
--
--   EXCLUSAO A PEDIDO DO TITULAR: carbon_visita_anonimizar. NAO existe DELETE de
--   visita, de proposito. A visita e FATO COMERCIAL da APSIS (aconteceu, gerou
--   resultado, alimenta o funil); o contato e que e dado pessoal. Anonimizar apaga
--   nome, telefone e e-mail e PRESERVA o registro da visita, que e exatamente o
--   equilibrio que a LGPD pede entre o direito do titular e o legitimo interesse
--   do controlador. A operacao e IRREVERSIVEL por trigger: nem um UPDATE direto
--   traz o contato de volta.
--
--   REGISTRO: carbon_visitas_auditoria guarda quem exportou, quando, com quais
--   filtros, se levou contato e com que finalidade, e tambem cada anonimizacao. A
--   gravacao acontece DENTRO da mesma funcao que produz a exportacao, na mesma
--   transacao, portanto nao existe caminho de exportar sem deixar registro.
--
--   NENHUM DADO PESSOAL E SEMEADO POR ESTA MIGRATION. Nenhum nome, telefone,
--   e-mail, organizacao ou cidade real aparece em qualquer linha deste arquivo.
--
-- Esta migration e idempotente: pode ser reaplicada sem erro.
-- =============================================================================


-- =============================================================================
-- 1. carbon_viagens - a rodada de visitas que hoje nao existe na base
-- =============================================================================

create table if not exists public.carbon_viagens (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  cidade         text not null,
  uf             text,
  data_inicio    date not null,
  data_fim       date,
  responsavel_id uuid references public.carbon_usuarios (id),
  criado_por     uuid references public.carbon_usuarios (id),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  -- Periodo invertido nao e registro incompleto, e registro errado: a viagem
  -- passaria a nao conter nenhuma data, e toda visita cairia "fora do periodo".
  constraint carbon_viagens_periodo_chk check (
    data_fim is null or data_fim >= data_inicio
  ),

  -- UF conferida contra as 27 unidades da federacao. O levantamento tinha um campo
  -- "Localidade" de texto livre, onde a mesma cidade aparece escrita de formas
  -- diferentes; separar cidade de UF, com a UF fechada, e o minimo para agrupar
  -- visitas por regiao depois. Nulo continua aceito porque o historico importado
  -- pode nao trazer a UF.
  constraint carbon_viagens_uf_chk check (
    uf is null or uf in (
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
      'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    )
  )
);

comment on table public.carbon_viagens is
  'Rodada de visitas comerciais: agrupa por cidade e periodo as varias visitas que uma mesma viagem gera. Existe porque na base de origem (docs/notion/04-relatorio-de-visitas.md) cidade e data eram REPETIDAS a mao em cada visita. Nao guarda dado pessoal: o responsavel e referencia a carbon_usuarios. Escrita somente pela Edge Function carbon-api, com papel admin ou gestor.';
comment on column public.carbon_viagens.titulo is
  'Como a equipe chama a rodada. Nao repita a cidade nem as datas aqui: as duas tem coluna propria, e foi justamente a mistura desses dados num campo de texto que a base antiga tinha.';
comment on column public.carbon_viagens.cidade is
  'Cidade visitada. Coluna propria, e nao "Localidade" de texto livre junto da UF, para o agrupamento por cidade ser confiavel.';
comment on column public.carbon_viagens.uf is
  'Unidade da federacao, conferida por carbon_viagens_uf_chk. Nula quando o historico importado nao trouxer.';
comment on column public.carbon_viagens.data_inicio is
  'Primeiro dia da rodada. A data deixa de ser repetida em cada visita: a visita guarda a data dela, e a viagem guarda o periodo.';
comment on column public.carbon_viagens.data_fim is
  'Ultimo dia da rodada. NULO significa viagem de um unico dia (nao "sem fim"): toda leitura usa coalesce(data_fim, data_inicio).';
comment on column public.carbon_viagens.responsavel_id is
  'Colaborador que conduziu a rodada. REFERENCIA a carbon_usuarios (dado funcional), nunca nome digitado: no Notion isso e texto, o que impede ver carga por pessoa e convida a gravar nome fora de controle.';
comment on column public.carbon_viagens.criado_por is
  'Colaborador que cadastrou a viagem. Trilha de autoria.';
comment on column public.carbon_viagens.atualizado_em is
  'Mantido pela trigger carbon_viagens_atualizado_em a cada UPDATE.';

-- Indices ---------------------------------------------------------------------
-- A listagem padrao ordena por inicio decrescente (a rodada mais recente primeiro).
create index if not exists carbon_viagens_data_idx
  on public.carbon_viagens (data_inicio desc);

create index if not exists carbon_viagens_uf_data_idx
  on public.carbon_viagens (uf, data_inicio desc);

-- SEM UNIQUE por (cidade, data_inicio), de proposito: duas equipes podem estar na
-- mesma cidade no mesmo dia, e o historico a ser importado nao pode ser recusado por
-- uma regra que a operacao nao tem.

create or replace function public.carbon_viagens_set_atualizado_em()
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

comment on function public.carbon_viagens_set_atualizado_em() is
  'Mantem carbon_viagens.atualizado_em em dia a cada UPDATE.';

drop trigger if exists carbon_viagens_atualizado_em on public.carbon_viagens;
create trigger carbon_viagens_atualizado_em
  before update on public.carbon_viagens
  for each row
  execute function public.carbon_viagens_set_atualizado_em();

-- RLS -------------------------------------------------------------------------
-- NENHUMA policy, de proposito: com RLS ativa e zero policies todo acesso pela anon
-- key e negado, inclusive leitura, e somente o service_role (a Edge Function
-- carbon-api, que ja validou o token do Azure AD e conferiu ativo = true) alcanca a
-- tabela. Mesmo padrao das demais tabelas do sistema.
alter table public.carbon_viagens enable row level security;
revoke all on table public.carbon_viagens from anon, authenticated;
grant all on table public.carbon_viagens to service_role;


-- =============================================================================
-- 2. carbon_visitas - a visita comercial, com follow-up cobravel
-- =============================================================================
-- ATENCAO: tabela com DADO PESSOAL DE TERCEIROS nas colunas contato_nome,
-- contato_telefone e contato_email. Ver o bloco LGPD no cabecalho deste arquivo
-- antes de escrever qualquer consulta nova sobre ela.

create table if not exists public.carbon_visitas (
  id                       uuid primary key default gen_random_uuid(),
  viagem_id                uuid references public.carbon_viagens (id) on delete set null,
  organizacao              text not null,

  -- ----- dado pessoal de terceiro (ver bloco LGPD no cabecalho) --------------
  contato_nome             text,
  contato_telefone         text,
  contato_email            text,
  -- --------------------------------------------------------------------------

  data                     date not null,
  assunto                  text,
  resultado                text,

  follow_up_status         text not null default 'nao_iniciado'
                             check (follow_up_status in (
                               'nao_iniciado',
                               'em_andamento',
                               'concluido',
                               'descartado'
                             )),
  follow_up_responsavel_id uuid references public.carbon_usuarios (id),
  follow_up_prazo          date,

  responsavel_id           uuid references public.carbon_usuarios (id),

  -- ----- controle de ciclo de vida do dado pessoal ---------------------------
  retencao_ate             date not null,
  anonimizado_em           timestamptz,
  anonimizado_motivo       text,
  -- --------------------------------------------------------------------------

  criado_por               uuid references public.carbon_usuarios (id),
  criado_em                timestamptz not null default now(),
  atualizado_em            timestamptz not null default now(),

  -- Visita anonimizada com contato preenchido seria a pior falha possivel desta
  -- tabela: o sistema afirmaria ter atendido o pedido do titular sem ter atendido.
  -- A trigger mantem a coerencia; este check e a rede de seguranca para escrita que
  -- nao passe pela API (SQL Editor, rotina de importacao).
  constraint carbon_visitas_anonimizacao_coerente_chk check (
    anonimizado_em is null
    or (contato_nome is null and contato_telefone is null and contato_email is null)
  ),

  -- Guarda minima de formato. Nao valida e-mail de verdade (nao existe validacao
  -- confiavel por expressao), so recusa o que claramente nao e endereco, porque
  -- lixo nesta coluna e dado pessoal errado atribuido a alguem.
  constraint carbon_visitas_contato_email_chk check (
    contato_email is null or strpos(contato_email, '@') > 1
  ),

  -- Motivo sem anonimizacao e sobra de edicao; anonimizacao sem motivo nao serve de
  -- prova de atendimento ao titular.
  constraint carbon_visitas_anonimizacao_motivo_chk check (
    (anonimizado_em is null and anonimizado_motivo is null)
    or (anonimizado_em is not null and btrim(coalesce(anonimizado_motivo, '')) <> '')
  )
);

comment on table public.carbon_visitas is
  'Visita comercial a uma organizacao, com follow-up. CONTEM DADO PESSOAL DE TERCEIROS (contato_nome, contato_telefone, contato_email), tratado com base no interesse legitimo em prospeccao B2B (Lei 13.709/2018, art. 7, IX) e com a finalidade unica de retomar o contato comercial da propria visita. As colunas de contato NAO saem em listagem: carbon_visitas_base nao as seleciona, e so carbon_visita_detalhe (com p_incluir_contato) e carbon_visitas_exportar as devolvem. Nao existe DELETE: o direito de exclusao do titular e atendido por carbon_visita_anonimizar, que limpa o contato e preserva o fato comercial. Ver o bloco LGPD no cabecalho da migration 20260814098000_visitas.sql.';
comment on column public.carbon_visitas.viagem_id is
  'Rodada de visitas a que esta visita pertence. NULLABLE de proposito: visita isolada (uma reuniao pontual na propria cidade) e caso legitimo, e o historico a importar tem visita sem rodada identificada. ON DELETE SET NULL porque a visita e o fato comercial: apagar o agrupamento nao pode apagar a visita.';
comment on column public.carbon_visitas.organizacao is
  'Organizacao visitada (pessoa juridica). Unico campo de identificacao obrigatorio. NAO escreva nome de pessoa aqui: existe coluna propria, com controle de acesso, exatamente para isso.';
comment on column public.carbon_visitas.contato_nome is
  'DADO PESSOAL DE TERCEIRO. Nome da pessoa que atendeu, na capacidade profissional dela. Base legal: interesse legitimo em prospeccao B2B. Finalidade: retomar o contato comercial desta visita. NAO retornado em listagem nem em exportacao sem registro de auditoria. Apagado por carbon_visita_anonimizar a pedido do titular ou por prazo de retencao vencido.';
comment on column public.carbon_visitas.contato_telefone is
  'DADO PESSOAL DE TERCEIRO. Telefone informado pela pessoa na visita. Mesma base legal, finalidade e ciclo de vida de contato_nome. Nunca usar para comunicacao em massa: esta fora da finalidade declarada.';
comment on column public.carbon_visitas.contato_email is
  'DADO PESSOAL DE TERCEIRO. E-mail informado pela pessoa na visita. Mesma base legal, finalidade e ciclo de vida de contato_nome. Nunca usar para comunicacao em massa nem alimentar ferramenta de disparo: esta fora da finalidade declarada.';
comment on column public.carbon_visitas.data is
  'Data da visita. Continua na visita (e nao apenas na viagem) porque uma rodada de varios dias tem visitas em dias diferentes. A cidade, sim, deixa de ser repetida: vem da viagem.';
comment on column public.carbon_visitas.assunto is
  'Assunto tratado na visita, em portugues.';
comment on column public.carbon_visitas.resultado is
  'O que saiu da visita. Campo de texto: ao escrever aqui, cite cargo ou area ("o time de sustentabilidade"), nunca nome de pessoa, senao o dado pessoal escapa do controle de acesso das colunas de contato.';
comment on column public.carbon_visitas.follow_up_status is
  'nao_iniciado, em_andamento, concluido ou descartado. Os dois primeiros valores sao os que a base de origem usa ("Nao iniciada", "Em andamento"); concluido e descartado existem porque sem estado final o follow-up fica eternamente aberto e a lista de cobranca perde sentido. Aberto = nao_iniciado ou em_andamento (definicao unica, em carbon_visitas_base).';
comment on column public.carbon_visitas.follow_up_responsavel_id is
  'Quem responde pelo follow-up. NAO EXISTIA na base de origem, e a ausencia explica o dado observado: quase todo follow-up parado em "nao iniciada". Referencia a carbon_usuarios. ATENCAO: nao ha ainda rota que liste colaboradores, por isso a interface oferece "assumir o follow-up" (a API resolve o id de quem chamou) em vez de um seletor de pessoas.';
comment on column public.carbon_visitas.follow_up_prazo is
  'Data prevista para o follow-up. Nulo = sem prazo definido, que NAO e o mesmo que vencido: as duas situacoes aparecem separadas na tela (vencido cobra a acao, sem prazo cobra a definicao do prazo).';
comment on column public.carbon_visitas.responsavel_id is
  'Colaborador que fez a visita. Referencia a carbon_usuarios (dado funcional).';
comment on column public.carbon_visitas.retencao_ate is
  'Prazo de retencao do dado pessoal desta visita. NOT NULL: base de prospeccao que so acumula contato e passivo de LGPD, entao nao existe registro sem prazo. Preenchida pela trigger carbon_visitas_before_write com 24 meses a contar da data da visita quando nao informada (default operacional, alinhado ao ciclo de prospeccao observado; validacao do prazo com o juridico/DPO e pendencia do dono). Vencido o prazo, carbon_visitas_anonimizar_vencidas limpa o contato.';
comment on column public.carbon_visitas.anonimizado_em is
  'Momento em que o contato foi apagado, a pedido do titular ou por retencao vencida. Coluna CONTROLADA POR TRIGGER: nao pode ser definida nem desfeita por UPDATE comum, so por carbon_visita_anonimizar / carbon_visitas_anonimizar_vencidas. Preenchida = a visita segue existindo como fato comercial, sem dado pessoal.';
comment on column public.carbon_visitas.anonimizado_motivo is
  'Por que o contato foi apagado (pedido do titular, retencao vencida, decisao interna). E a prova de atendimento ao direito do titular, por isso e obrigatorio quando anonimizado_em existe.';
comment on column public.carbon_visitas.atualizado_em is
  'Mantido pela trigger carbon_visitas_before_write a cada UPDATE.';

-- Indices ---------------------------------------------------------------------
create index if not exists carbon_visitas_data_idx
  on public.carbon_visitas (data desc);

create index if not exists carbon_visitas_viagem_idx
  on public.carbon_visitas (viagem_id);

create index if not exists carbon_visitas_follow_up_status_idx
  on public.carbon_visitas (follow_up_status);

-- O recorte mais consultado da tela e "o que passou do prazo". Indice PARCIAL sobre
-- o follow-up aberto: nao cresce com o historico de follow-up encerrado.
create index if not exists carbon_visitas_follow_up_aberto_idx
  on public.carbon_visitas (follow_up_prazo)
  where follow_up_status in ('nao_iniciado', 'em_andamento');

create index if not exists carbon_visitas_follow_up_responsavel_idx
  on public.carbon_visitas (follow_up_responsavel_id)
  where follow_up_responsavel_id is not null;

-- Rotina de retencao: so interessa a visita que ainda tem contato para apagar.
create index if not exists carbon_visitas_retencao_idx
  on public.carbon_visitas (retencao_ate)
  where anonimizado_em is null;

-- Trigger de retencao, anonimizacao e atualizado_em ---------------------------
-- Uma trigger so, porque as tres coisas acontecem no mesmo BEFORE.
--
-- O ponto delicado e a IRREVERSIBILIDADE da anonimizacao. Sem esta trigger, um
-- UPDATE que zerasse anonimizado_em e regravasse o nome burlaria o pedido de
-- exclusao do titular sem violar nenhum check (os dois campos voltariam coerentes).
-- Aqui, visita ja anonimizada tem anonimizado_em e anonimizado_motivo PRESERVADOS e
-- as tres colunas de contato forcadas a null, aconteca o que acontecer no UPDATE.
create or replace function public.carbon_visitas_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Retencao sempre definida. Calculada a partir da data da VISITA, e nao da data
    -- de cadastro: importar historico antigo nao pode renovar o prazo de retencao de
    -- um contato coletado dois anos atras.
    if new.retencao_ate is null then
      -- Cast explicito para date: date + interval devolve timestamp, e deixar a
      -- conversao para o cast de atribuicao esconderia a intencao.
      new.retencao_ate := (coalesce(new.data, current_date) + interval '24 months')::date;
    end if;

    -- Visita que nasce anonimizada (importacao de historico ja depurado) nao guarda
    -- contato, nem por acidente.
    if new.anonimizado_em is not null then
      new.contato_nome     := null;
      new.contato_telefone := null;
      new.contato_email    := null;
    end if;

    return new;
  end if;

  new.atualizado_em := now();

  -- Prazo de retencao nunca fica vazio por um UPDATE que nao o mencione.
  if new.retencao_ate is null then
    new.retencao_ate := old.retencao_ate;
  end if;

  if old.anonimizado_em is not null then
    -- Anonimizacao e irreversivel: o carimbo e o motivo sobrevivem a qualquer
    -- UPDATE, e o contato nao volta.
    new.anonimizado_em     := old.anonimizado_em;
    new.anonimizado_motivo := coalesce(new.anonimizado_motivo, old.anonimizado_motivo);
    new.contato_nome       := null;
    new.contato_telefone   := null;
    new.contato_email      := null;
  elsif new.anonimizado_em is not null then
    -- Transicao para anonimizada (vem de carbon_visita_anonimizar): a limpeza do
    -- contato acontece aqui, para nao depender de a chamada ter lembrado de zerar as
    -- tres colunas.
    new.contato_nome     := null;
    new.contato_telefone := null;
    new.contato_email    := null;
  end if;

  return new;
end;
$$;

comment on function public.carbon_visitas_before_write() is
  'BEFORE INSERT/UPDATE de carbon_visitas: garante retencao_ate (24 meses a contar da data da visita quando ausente), torna a anonimizacao IRREVERSIVEL (preserva anonimizado_em e o motivo e forca as colunas de contato a null) e mantem atualizado_em. Sem esta trigger, um UPDATE comum poderia desfazer um pedido de exclusao do titular sem violar nenhum check.';

drop trigger if exists carbon_visitas_before_write_trg on public.carbon_visitas;
create trigger carbon_visitas_before_write_trg
  before insert or update on public.carbon_visitas
  for each row
  execute function public.carbon_visitas_before_write();

alter table public.carbon_visitas enable row level security;
revoke all on table public.carbon_visitas from anon, authenticated;
grant all on table public.carbon_visitas to service_role;


-- =============================================================================
-- 3. carbon_visitas_auditoria - registro de acesso em massa e de anonimizacao
-- =============================================================================
-- O criterio da issue e literal: "nao permitir exportacao da base com dados de
-- contato sem controle e registro". Esta tabela e o registro. Ela e append-only: a
-- API nao expoe UPDATE nem DELETE, e a escrita acontece DENTRO das funcoes que
-- exportam e anonimizam, na mesma transacao, portanto nao ha caminho de exportar
-- contato sem deixar rastro.
--
-- O que NAO e registrado aqui, e por que: a abertura do detalhe de UMA visita por
-- alguem que ja tem permissao de ver contato. Seria uma escrita por leitura de tela,
-- e o volume tornaria o log inutil justamente para achar o que importa (extracao em
-- massa). O acesso ao detalhe ja e restrito por papel na Edge Function.

create table if not exists public.carbon_visitas_auditoria (
  id                   uuid primary key default gen_random_uuid(),
  tipo                 text not null
                         check (tipo in (
                           'exportacao',
                           'anonimizacao',
                           'anonimizacao_retencao'
                         )),
  usuario_id           uuid references public.carbon_usuarios (id),
  visita_id            uuid references public.carbon_visitas (id) on delete set null,
  quantidade_registros integer not null default 0,
  incluiu_contatos     boolean not null default false,
  filtros              jsonb,
  motivo               text,
  criado_em            timestamptz not null default now()
);

comment on table public.carbon_visitas_auditoria is
  'Log LGPD do dominio de visitas: exportacoes da base (quem, quando, com quais filtros, se levou contato e com que finalidade) e anonimizacoes (pedido do titular ou retencao vencida). APPEND-ONLY: nenhuma rota atualiza nem remove linha. Gravado dentro das proprias funcoes carbon_visitas_exportar, carbon_visita_anonimizar e carbon_visitas_anonimizar_vencidas, na mesma transacao, para nao existir exportacao sem registro.';
comment on column public.carbon_visitas_auditoria.tipo is
  'exportacao, anonimizacao (a pedido, por visita) ou anonimizacao_retencao (rotina de prazo vencido, uma linha por execucao).';
comment on column public.carbon_visitas_auditoria.usuario_id is
  'Colaborador que executou a operacao. Referencia a carbon_usuarios. Nulo apenas em execucao automatica futura (rotina agendada sem usuario).';
comment on column public.carbon_visitas_auditoria.visita_id is
  'Visita afetada, quando a operacao e por visita (anonimizacao a pedido). Nulo em exportacao e na rotina de retencao, que afetam um conjunto. ON DELETE SET NULL para o log sobreviver a qualquer limpeza futura de dado.';
comment on column public.carbon_visitas_auditoria.quantidade_registros is
  'Quantas visitas a operacao alcancou. E o numero que revela extracao em massa.';
comment on column public.carbon_visitas_auditoria.incluiu_contatos is
  'true quando a operacao envolveu nome, telefone ou e-mail. Exportacao sem contato tambem e registrada, mas com este campo em false: a diferenca entre as duas e o que interessa numa auditoria.';
comment on column public.carbon_visitas_auditoria.filtros is
  'Filtros aplicados na exportacao, em jsonb. Sem isso, o log diria que alguem exportou 300 linhas sem dizer quais.';
comment on column public.carbon_visitas_auditoria.motivo is
  'Finalidade declarada pela pessoa. OBRIGATORIO na exportacao com contato e na anonimizacao a pedido (ver as funcoes): finalidade generica nao satisfaz o principio da finalidade.';

create index if not exists carbon_visitas_auditoria_criado_idx
  on public.carbon_visitas_auditoria (criado_em desc);

create index if not exists carbon_visitas_auditoria_visita_idx
  on public.carbon_visitas_auditoria (visita_id)
  where visita_id is not null;

create index if not exists carbon_visitas_auditoria_contato_idx
  on public.carbon_visitas_auditoria (criado_em desc)
  where incluiu_contatos;

alter table public.carbon_visitas_auditoria enable row level security;
revoke all on table public.carbon_visitas_auditoria from anon, authenticated;
grant all on table public.carbon_visitas_auditoria to service_role;


-- =============================================================================
-- 4. Funcoes chamadas por RPC pela Edge Function carbon-api
-- =============================================================================
-- Todas security definer com search_path fixo, portanto TODA referencia e
-- qualificada. O EXECUTE e revogado de public/anon/authenticated no fim desta secao:
-- sem isso a anon key chamaria estas funcoes por /rest/v1/rpc e contornaria a RLS.
--
-- POR QUE AS REGRAS DERIVADAS VIVEM AQUI: "follow-up atrasado", "follow-up sem
-- cobranca" e "visita fora do periodo da viagem" aparecem na listagem de visitas, no
-- resumo do painel, na listagem de viagens e no detalhe. Definidas em quatro lugares,
-- divergem na primeira mudanca, e o dataset de demonstracao do frontend nao teria uma
-- definicao unica para copiar. Definidas UMA vez, em carbon_visitas_base, todas as
-- outras funcoes as consomem.

-- 4.0 Base comum ---------------------------------------------------------------
-- Conjunto filtrado de visitas com os campos derivados, SEM NENHUMA COLUNA DE
-- CONTATO. E a barreira de minimizacao da LGPD posta no banco: a listagem nao pode
-- vazar contato porque contato nao esta no resultado. Quem precisa do contato usa
-- carbon_visita_detalhe (uma visita, sob permissao) ou carbon_visitas_exportar (com
-- registro de auditoria obrigatorio).
--
-- Nao recebe grant para service_role: e consumida pelas outras funcoes desta
-- migration (que sao security definer e rodam como o dono), e nao pela API.
create or replace function public.carbon_visitas_base(
  p_viagem_id        uuid    default null,
  p_sem_viagem       boolean default false,
  p_follow_up_status text    default null,
  p_organizacao      text    default null,
  p_situacao         text    default null,
  p_de               date    default null,
  p_ate              date    default null
)
returns table (
  id                         uuid,
  viagem_id                  uuid,
  viagem_titulo              text,
  viagem_cidade              text,
  viagem_uf                  text,
  viagem_data_inicio         date,
  viagem_data_fim            date,
  organizacao                text,
  data                       date,
  assunto                    text,
  resultado                  text,
  follow_up_status           text,
  follow_up_prazo            date,
  follow_up_responsavel_id   uuid,
  follow_up_responsavel_nome text,
  responsavel_id             uuid,
  responsavel_nome           text,
  follow_up_aberto           boolean,
  follow_up_atrasado         boolean,
  dias_atraso                integer,
  follow_up_sem_cobranca     boolean,
  contato_registrado         boolean,
  anonimizada                boolean,
  retencao_ate               date,
  retencao_vencida           boolean,
  fora_do_periodo            boolean,
  criado_em                  timestamptz,
  atualizado_em              timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with calculadas as (
    select
      v.id,
      v.viagem_id,
      vg.titulo      as viagem_titulo,
      vg.cidade      as viagem_cidade,
      vg.uf          as viagem_uf,
      vg.data_inicio as viagem_data_inicio,
      vg.data_fim    as viagem_data_fim,
      v.organizacao,
      v.data,
      v.assunto,
      v.resultado,
      v.follow_up_status,
      v.follow_up_prazo,
      v.follow_up_responsavel_id,
      uf.nome as follow_up_responsavel_nome,
      v.responsavel_id,
      ur.nome as responsavel_nome,
      -- DEFINICAO UNICA 1: follow-up ABERTO e o que nao chegou a estado final.
      (v.follow_up_status in ('nao_iniciado', 'em_andamento')) as follow_up_aberto,
      -- DEFINICAO UNICA 2: ATRASADO e follow-up aberto, com prazo, e prazo no
      -- passado. Follow-up concluido com prazo vencido NAO e atraso, e follow-up sem
      -- prazo tambem nao: sem prazo o problema e outro (ver sem_cobranca).
      (
        v.follow_up_status in ('nao_iniciado', 'em_andamento')
        and v.follow_up_prazo is not null
        and v.follow_up_prazo < current_date
      ) as follow_up_atrasado,
      case
        when v.follow_up_status in ('nao_iniciado', 'em_andamento')
         and v.follow_up_prazo is not null
         and v.follow_up_prazo < current_date
        then (current_date - v.follow_up_prazo)
        else null
      end as dias_atraso,
      -- DEFINICAO UNICA 3: SEM COBRANCA e o follow-up aberto que nao tem dono ou nao
      -- tem prazo. E o diagnostico do levantamento em forma de campo: o follow-up
      -- para em "nao iniciada" porque ninguem responde por ele e nao ha data.
      (
        v.follow_up_status in ('nao_iniciado', 'em_andamento')
        and (v.follow_up_responsavel_id is null or v.follow_up_prazo is null)
      ) as follow_up_sem_cobranca,
      -- Existencia de contato SEM revelar o contato: e o que permite a tela dizer
      -- "ha contato registrado, oculto para o seu perfil" em vez de mentir que nao ha.
      (
        v.contato_nome is not null
        or v.contato_telefone is not null
        or v.contato_email is not null
      ) as contato_registrado,
      (v.anonimizado_em is not null) as anonimizada,
      v.retencao_ate,
      (v.anonimizado_em is null and v.retencao_ate < current_date) as retencao_vencida,
      -- Visita com data fora do periodo da viagem. Nao e bloqueada (importacao de
      -- historico nao pode ser recusada por isso), e sinalizada: quase sempre indica
      -- que a visita foi pendurada na rodada errada.
      (
        v.viagem_id is not null
        and (
          v.data < vg.data_inicio
          or v.data > coalesce(vg.data_fim, vg.data_inicio)
        )
      ) as fora_do_periodo,
      v.criado_em,
      v.atualizado_em
      from public.carbon_visitas v
      left join public.carbon_viagens vg on vg.id = v.viagem_id
      left join public.carbon_usuarios uf on uf.id = v.follow_up_responsavel_id
      left join public.carbon_usuarios ur on ur.id = v.responsavel_id
  )
  select
    c.id,
    c.viagem_id,
    c.viagem_titulo,
    c.viagem_cidade,
    c.viagem_uf,
    c.viagem_data_inicio,
    c.viagem_data_fim,
    c.organizacao,
    c.data,
    c.assunto,
    c.resultado,
    c.follow_up_status,
    c.follow_up_prazo,
    c.follow_up_responsavel_id,
    c.follow_up_responsavel_nome,
    c.responsavel_id,
    c.responsavel_nome,
    c.follow_up_aberto,
    c.follow_up_atrasado,
    c.dias_atraso,
    c.follow_up_sem_cobranca,
    c.contato_registrado,
    c.anonimizada,
    c.retencao_ate,
    c.retencao_vencida,
    c.fora_do_periodo,
    c.criado_em,
    c.atualizado_em
    from calculadas c
   where (p_viagem_id is null or c.viagem_id = p_viagem_id)
     -- "Somente visitas sem rodada" e pergunta diferente de "todas as visitas", por
     -- isso e parametro proprio e nao um valor especial de p_viagem_id.
     and (not coalesce(p_sem_viagem, false) or c.viagem_id is null)
     and (p_follow_up_status is null or c.follow_up_status = p_follow_up_status)
     -- strpos em vez de ILIKE de proposito: ILIKE trataria % e _ digitados na busca
     -- como curinga, o que confunde quem so quer procurar um nome de organizacao.
     and (p_organizacao is null or strpos(lower(c.organizacao), lower(p_organizacao)) > 0)
     and (p_de is null or c.data >= p_de)
     and (p_ate is null or c.data <= p_ate)
     and (
       p_situacao is null
       or (p_situacao = 'atrasada'     and c.follow_up_atrasado)
       or (p_situacao = 'sem_cobranca' and c.follow_up_sem_cobranca)
       or (p_situacao = 'aberta'       and c.follow_up_aberto)
       or (p_situacao = 'anonimizada'  and c.anonimizada)
       or (p_situacao = 'retencao_vencida' and c.retencao_vencida)
     );
$$;

comment on function public.carbon_visitas_base(uuid, boolean, text, text, text, date, date) is
  'Conjunto filtrado de visitas com os campos derivados (follow_up_aberto, follow_up_atrasado, dias_atraso, follow_up_sem_cobranca, contato_registrado, anonimizada, retencao_vencida, fora_do_periodo) e SEM NENHUMA COLUNA DE CONTATO. E a fonte unica dessas regras: listagem, resumo, agregado por viagem e detalhe consomem esta funcao. A ausencia das colunas de contato aqui e a barreira de minimizacao da LGPD posta no banco, e nao apenas na Edge Function. p_situacao aceita atrasada, sem_cobranca, aberta, anonimizada e retencao_vencida.';


-- 4.1 Listagem de viagens ------------------------------------------------------
-- Agrega as visitas por rodada usando carbon_visitas_base, portanto "atrasado" e
-- "sem cobranca" contam aqui exatamente o que contam na lista de visitas.
create or replace function public.carbon_viagens_listar(
  p_uf           text    default null,
  p_cidade       text    default null,
  p_de           date    default null,
  p_ate          date    default null,
  p_limite       integer default 50,
  p_deslocamento integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with visitas as (
    select * from public.carbon_visitas_base()
  ),
  filtradas as (
    select vg.*
      from public.carbon_viagens vg
     where (p_uf is null or vg.uf = p_uf)
       and (p_cidade is null or strpos(lower(vg.cidade), lower(p_cidade)) > 0)
       -- Recorte por periodo e INTERSECCAO com a janela pedida, e nao "inicio dentro
       -- da janela": rodada que comeca em um mes e termina no outro tem de aparecer
       -- nos dois.
       and (p_ate is null or vg.data_inicio <= p_ate)
       and (p_de is null or coalesce(vg.data_fim, vg.data_inicio) >= p_de)
  ),
  base as (
    select
      f.id,
      f.titulo,
      f.cidade,
      f.uf,
      f.data_inicio,
      f.data_fim,
      f.responsavel_id,
      u.nome as responsavel_nome,
      f.criado_em,
      f.atualizado_em,
      coalesce(a.visitas_total, 0)          as visitas_total,
      coalesce(a.follow_up_abertos, 0)      as follow_up_abertos,
      coalesce(a.follow_up_atrasados, 0)    as follow_up_atrasados,
      coalesce(a.follow_up_sem_cobranca, 0) as follow_up_sem_cobranca,
      coalesce(a.follow_up_concluidos, 0)   as follow_up_concluidos,
      coalesce(a.contatos_registrados, 0)   as contatos_registrados,
      coalesce(a.fora_do_periodo, 0)        as fora_do_periodo
      from filtradas f
      left join public.carbon_usuarios u on u.id = f.responsavel_id
      -- LATERAL com agregado: rodada sem visita cai em count sobre conjunto vazio,
      -- que e 0, e a linha continua na listagem por causa do "on true".
      left join lateral (
        select
          count(*)                                            as visitas_total,
          count(*) filter (where vi.follow_up_aberto)          as follow_up_abertos,
          count(*) filter (where vi.follow_up_atrasado)        as follow_up_atrasados,
          count(*) filter (where vi.follow_up_sem_cobranca)    as follow_up_sem_cobranca,
          count(*) filter (where vi.follow_up_status = 'concluido') as follow_up_concluidos,
          count(*) filter (where vi.contato_registrado)        as contatos_registrados,
          count(*) filter (where vi.fora_do_periodo)           as fora_do_periodo
          from visitas vi
         where vi.viagem_id = f.id
      ) a on true
  ),
  pagina as (
    select *
      from base
     order by base.data_inicio desc, base.criado_em desc
     -- Limites tambem aqui, e nao so na Edge Function: a funcao pode ser chamada de
     -- outro lugar (SQL Editor, rotina futura) e ?limite=100000 nao pode virar um
     -- scan da tabela inteira a pedido de quem chama.
     limit least(greatest(coalesce(p_limite, 50), 1), 200)
    offset greatest(coalesce(p_deslocamento, 0), 0)
  ),
  resumo as (
    select
      count(*)                                     as total,
      coalesce(sum(base.visitas_total), 0)          as visitas_total,
      coalesce(sum(base.follow_up_atrasados), 0)    as follow_up_atrasados,
      coalesce(sum(base.follow_up_sem_cobranca), 0) as follow_up_sem_cobranca
      from base
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'resumo', (select to_jsonb(r) from resumo r),
    'viagens', coalesce(
      (
        -- ORDER BY dentro do jsonb_agg: a ordem do LIMIT da CTE nao e garantida na
        -- agregacao, e lista de rodada fora de ordem cronologica e inutil.
        select jsonb_agg(to_jsonb(pg) order by pg.data_inicio desc, pg.criado_em desc)
          from pagina pg
      ),
      '[]'::jsonb
    )
  );
$$;

comment on function public.carbon_viagens_listar(text, text, date, date, integer, integer) is
  'Listagem de rodadas de visita com os agregados de follow-up (abertos, atrasados, sem cobranca, concluidos), o total e o resumo do painel em uma unica chamada. Os agregados vem de carbon_visitas_base, portanto usam a MESMA definicao de atrasado e de sem cobranca da lista de visitas. O filtro por periodo e interseccao com a janela pedida, nao "inicio dentro da janela". Nao devolve nenhum dado de contato.';


-- 4.2 Listagem de visitas ------------------------------------------------------
-- SEM DADO DE CONTATO, por construcao (ver carbon_visitas_base). O resumo e
-- calculado sobre o conjunto FILTRADO e nao sobre a pagina: contador que muda ao
-- virar de pagina e contador errado.
create or replace function public.carbon_visitas_listar(
  p_viagem_id        uuid    default null,
  p_sem_viagem       boolean default false,
  p_follow_up_status text    default null,
  p_organizacao      text    default null,
  p_situacao         text    default null,
  p_de               date    default null,
  p_ate              date    default null,
  p_limite           integer default 50,
  p_deslocamento     integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select * from public.carbon_visitas_base(
      p_viagem_id, p_sem_viagem, p_follow_up_status, p_organizacao, p_situacao,
      p_de, p_ate
    )
  ),
  pagina as (
    select *
      from base
     order by base.data desc, base.criado_em desc
     limit least(greatest(coalesce(p_limite, 50), 1), 200)
    offset greatest(coalesce(p_deslocamento, 0), 0)
  ),
  resumo as (
    select
      count(*)                                                        as total,
      count(*) filter (where base.follow_up_status = 'nao_iniciado')  as nao_iniciado,
      count(*) filter (where base.follow_up_status = 'em_andamento')  as em_andamento,
      count(*) filter (where base.follow_up_status = 'concluido')     as concluido,
      count(*) filter (where base.follow_up_status = 'descartado')    as descartado,
      count(*) filter (where base.follow_up_aberto)                   as abertos,
      count(*) filter (where base.follow_up_atrasado)                 as atrasados,
      count(*) filter (where base.follow_up_sem_cobranca)             as sem_cobranca,
      count(*) filter (where base.contato_registrado)                 as contatos_registrados,
      count(*) filter (where base.anonimizada)                        as anonimizadas,
      count(*) filter (where base.retencao_vencida)                   as retencao_vencida,
      count(*) filter (where base.fora_do_periodo)                    as fora_do_periodo,
      -- current_date e a data do SERVIDOR (UTC no Supabase). Diferenca de fuso pode
      -- deslocar "proximo prazo" em algumas horas na virada do dia; e resumo de
      -- painel, nao calculo de laudo.
      min(base.follow_up_prazo) filter (
        where base.follow_up_aberto and base.follow_up_prazo >= current_date
      ) as proximo_prazo
      from base
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'resumo', (select to_jsonb(r) from resumo r),
    'visitas', coalesce(
      (
        select jsonb_agg(to_jsonb(pg) order by pg.data desc, pg.criado_em desc)
          from pagina pg
      ),
      '[]'::jsonb
    )
  );
$$;

comment on function public.carbon_visitas_listar(uuid, boolean, text, text, text, date, date, integer, integer) is
  'Listagem de visitas com os campos derivados de follow-up, o total e o resumo do painel em uma unica chamada. NAO DEVOLVE contato_nome, contato_telefone nem contato_email: consome carbon_visitas_base, que nao seleciona essas colunas (requisito de LGPD da issue #12, "nao exibir contato em listagem"). O resumo e calculado sobre o conjunto FILTRADO, nao sobre a pagina.';


-- 4.3 Detalhe de uma visita ----------------------------------------------------
-- O UNICO caminho de leitura de contato por registro, e so com p_incluir_contato =
-- true. Quem decide esse booleano e a Edge Function, pelo papel do colaborador
-- (admin ou gestor). Com false, o contato nao e nem lido: as chaves vem nulas e
-- contato_visivel = false, para a tela poder explicar a ausencia em vez de sugerir
-- que nao existe contato registrado.
create or replace function public.carbon_visita_detalhe(
  p_visita_id        uuid,
  p_incluir_contato  boolean default false
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'visita', to_jsonb(b) || jsonb_build_object(
      'contato_visivel', coalesce(p_incluir_contato, false),
      'contato', case
        when not coalesce(p_incluir_contato, false) then null
        when not b.contato_registrado then null
        else jsonb_build_object(
          'nome',     v.contato_nome,
          'telefone', v.contato_telefone,
          'email',    v.contato_email
        )
      end,
      'anonimizado_em',     v.anonimizado_em,
      'anonimizado_motivo', v.anonimizado_motivo
    ),
    'viagem', case
      when vg.id is null then null
      else jsonb_build_object(
        'id',           vg.id,
        'titulo',       vg.titulo,
        'cidade',       vg.cidade,
        'uf',           vg.uf,
        'data_inicio',  vg.data_inicio,
        'data_fim',     vg.data_fim,
        'responsavel_id', vg.responsavel_id,
        'responsavel_nome', uvg.nome
      )
    end,
    -- Historico LGPD da propria visita, para a transparencia ficar na tela em que a
    -- decisao e tomada, e nao num relatorio que ninguem abre.
    'auditoria', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'id',        au.id,
                   'tipo',      au.tipo,
                   'motivo',    au.motivo,
                   'usuario_nome', ua.nome,
                   'criado_em', au.criado_em
                 )
                 order by au.criado_em desc
               )
          from public.carbon_visitas_auditoria au
          left join public.carbon_usuarios ua on ua.id = au.usuario_id
         where au.visita_id = v.id
      ),
      '[]'::jsonb
    )
  )
  from public.carbon_visitas v
  join public.carbon_visitas_base() b on b.id = v.id
  left join public.carbon_viagens vg on vg.id = v.viagem_id
  left join public.carbon_usuarios uvg on uvg.id = vg.responsavel_id
  where v.id = p_visita_id;
$$;

comment on function public.carbon_visita_detalhe(uuid, boolean) is
  'Detalhe de UMA visita, com a viagem e o historico de auditoria LGPD do registro. E o unico caminho de leitura de contato por registro, e somente com p_incluir_contato = true (a Edge Function passa true apenas para papel admin ou gestor). Com false devolve contato = null e contato_visivel = false, mantendo contato_registrado para a tela explicar a ausencia. Devolve nenhuma linha quando a visita nao existe, para a API responder 404.';


-- 4.4 Anonimizacao a pedido do titular -----------------------------------------
-- E a forma de atender o direito de exclusao SEM apagar o fato comercial. Por isso
-- nao existe DELETE de visita na API.
create or replace function public.carbon_visita_anonimizar(
  p_visita_id uuid,
  p_motivo    text,
  p_usuario_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motivo text;
  v_visita public.carbon_visitas;
begin
  if p_visita_id is null then
    raise exception 'visita_nao_encontrada: id nao informado';
  end if;

  v_motivo := btrim(coalesce(p_motivo, ''));
  if v_motivo = '' then
    -- Sem motivo o log nao prova nada, e a operacao e irreversivel: exigir a
    -- finalidade e o minimo antes de apagar dado a pedido de alguem.
    raise exception 'motivo_obrigatorio: informe por que o contato esta sendo apagado';
  end if;

  -- FOR UPDATE serializa dois cliques simultaneos no mesmo botao: sem ele as duas
  -- chamadas gravariam duas linhas de auditoria para a mesma anonimizacao.
  select * into v_visita
    from public.carbon_visitas
   where id = p_visita_id
     for update;

  if not found then
    raise exception 'visita_nao_encontrada: nenhuma visita com id %', p_visita_id;
  end if;

  if v_visita.anonimizado_em is not null then
    -- Idempotente: repetir a operacao nao gera log novo nem reescreve o carimbo
    -- original, que e a data em que o titular foi atendido.
    return jsonb_build_object(
      'anonimizada',    true,
      'ja_estava',      true,
      'visita_id',      p_visita_id,
      'anonimizado_em', v_visita.anonimizado_em
    );
  end if;

  -- As tres colunas de contato sao zeradas pela trigger carbon_visitas_before_write
  -- na transicao de anonimizado_em; escrevemos os nulos aqui tambem para a intencao
  -- ficar legivel no proprio comando.
  update public.carbon_visitas
     set contato_nome       = null,
         contato_telefone   = null,
         contato_email      = null,
         anonimizado_em     = now(),
         anonimizado_motivo = v_motivo
   where id = p_visita_id;

  insert into public.carbon_visitas_auditoria (
    tipo, usuario_id, visita_id, quantidade_registros, incluiu_contatos, motivo
  ) values (
    'anonimizacao', p_usuario_id, p_visita_id, 1, true, v_motivo
  );

  return jsonb_build_object(
    'anonimizada', true,
    'ja_estava',   false,
    'visita_id',   p_visita_id
  );
end;
$$;

comment on function public.carbon_visita_anonimizar(uuid, text, uuid) is
  'Apaga nome, telefone e e-mail do contato de UMA visita, preservando o registro da visita (fato comercial), e grava a linha de auditoria na mesma transacao. E a forma de atender o direito de exclusao do titular sem apagar o historico comercial da APSIS, e por isso nao existe DELETE de visita na API. Exige motivo (finalidade). Idempotente: visita ja anonimizada devolve ja_estava = true sem novo log e sem reescrever o carimbo original. Levanta visita_nao_encontrada e motivo_obrigatorio.';


-- 4.5 Rotina de retencao -------------------------------------------------------
-- Prazo de retencao que ninguem executa e so uma frase na politica. Esta funcao e a
-- execucao: apaga o contato de toda visita cujo prazo venceu.
create or replace function public.carbon_visitas_anonimizar_vencidas(
  p_usuario_id uuid    default null,
  p_limite     integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite integer;
  v_qtd    integer := 0;
begin
  v_limite := least(greatest(coalesce(p_limite, 500), 1), 5000);

  -- Um comando so, e nao "seleciona, depois atualiza": o UPDATE ja toma o lock das
  -- linhas que toca. O `anonimizado_em is null` REPETIDO no WHERE de fora e o que
  -- torna duas execucoes simultaneas seguras: sob READ COMMITTED, a segunda espera o
  -- lock, reavalia a condicao, ve o carimbo ja preenchido e conta zero, em vez de
  -- gravar uma segunda linha de auditoria para as mesmas visitas.
  --
  -- So entra visita que AINDA TEM contato: registro sem contato nao precisa ser
  -- tocado, e contaria numero inflado no log.
  update public.carbon_visitas
     set contato_nome       = null,
         contato_telefone   = null,
         contato_email      = null,
         anonimizado_em     = now(),
         anonimizado_motivo = 'Prazo de retencao vencido (retencao_ate anterior a data de execucao).'
   where anonimizado_em is null
     and id in (
       select v.id
         from public.carbon_visitas v
        where v.anonimizado_em is null
          and v.retencao_ate < current_date
          and (
            v.contato_nome is not null
            or v.contato_telefone is not null
            or v.contato_email is not null
          )
        order by v.retencao_ate
        limit v_limite
     );

  get diagnostics v_qtd = row_count;

  if v_qtd = 0 then
    -- Execucao sem efeito NAO gera linha de auditoria: log de rotina que roda todo
    -- dia sem fazer nada esconde as execucoes que fizeram algo.
    return jsonb_build_object('anonimizadas', 0, 'referencia', current_date);
  end if;

  insert into public.carbon_visitas_auditoria (
    tipo, usuario_id, quantidade_registros, incluiu_contatos, filtros, motivo
  ) values (
    'anonimizacao_retencao',
    p_usuario_id,
    v_qtd,
    true,
    jsonb_build_object('retencao_ate_antes_de', current_date, 'limite', v_limite),
    'Rotina de retencao: contato apagado por prazo vencido.'
  );

  return jsonb_build_object(
    'anonimizadas', v_qtd,
    'referencia',   current_date,
    'limite',       v_limite
  );
end;
$$;

comment on function public.carbon_visitas_anonimizar_vencidas(uuid, integer) is
  'Apaga o contato de todas as visitas com retencao_ate vencida que ainda tenham contato, em lote limitado, e grava UMA linha de auditoria com a quantidade. E a execucao do prazo de retencao exigido pela issue #12 (prazo declarado e nao executado nao protege ninguem). Pode ser chamada pela API por papel admin ou gestor, e futuramente por rotina agendada (pg_cron), quando o dono decidir a periodicidade. Execucao sem efeito nao gera log.';


-- 4.6 Exportacao com registro obrigatorio --------------------------------------
-- O criterio da issue: nao exportar a base com contato "sem controle e registro". A
-- gravacao do log acontece DENTRO desta funcao, na mesma transacao que produz os
-- dados, portanto nao existe caminho de exportar sem registrar. Se o insert do log
-- falhar, a exportacao inteira falha.
create or replace function public.carbon_visitas_exportar(
  p_usuario_id       uuid,
  p_incluir_contatos boolean default false,
  p_motivo           text    default null,
  p_viagem_id        uuid    default null,
  p_sem_viagem       boolean default false,
  p_follow_up_status text    default null,
  p_organizacao      text    default null,
  p_situacao         text    default null,
  p_de               date    default null,
  p_ate              date    default null,
  p_limite           integer default 2000
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_incluir boolean := coalesce(p_incluir_contatos, false);
  v_motivo  text    := nullif(btrim(coalesce(p_motivo, '')), '');
  v_limite  integer;
  v_filtros jsonb;
  v_registros jsonb;
  v_total   integer;
  v_log_id  uuid;
begin
  v_limite := least(greatest(coalesce(p_limite, 2000), 1), 5000);

  if v_incluir then
    if p_usuario_id is null then
      -- Exportacao de dado pessoal sem autor identificado nao pode existir: o log
      -- ficaria sem a informacao que justifica o log.
      raise exception 'usuario_obrigatorio: exportacao com contato exige o autor';
    end if;
    if v_motivo is null then
      raise exception 'motivo_obrigatorio: exportacao com contato exige a finalidade';
    end if;
  end if;

  v_filtros := jsonb_build_object(
    'viagem_id',        p_viagem_id,
    'sem_viagem',       coalesce(p_sem_viagem, false),
    'follow_up_status', p_follow_up_status,
    'organizacao',      p_organizacao,
    'situacao',         p_situacao,
    'de',               p_de,
    'ate',              p_ate,
    'limite',           v_limite
  );

  -- Subconsultas em vez de CTE de proposito: `SELECT ... INTO` do plpgsql com um
  -- comando que comeca por WITH e legal, mas le mal e ja confundiu revisao em outros
  -- lugares. O resultado e o mesmo plano.
  select coalesce(jsonb_agg(l.linha order by l.data desc, l.criado_em desc), '[]'::jsonb)
    into v_registros
    from (
      select
        to_jsonb(b) || case
          -- Contato entra SOMENTE quando autorizado. Sem isso, o arquivo exportado
          -- viraria a porta dos fundos da regra de "contato nao aparece em listagem".
          when v_incluir then jsonb_build_object(
            'contato_nome',     v.contato_nome,
            'contato_telefone', v.contato_telefone,
            'contato_email',    v.contato_email
          )
          else '{}'::jsonb
        end as linha,
        b.data,
        b.criado_em
        from (
          select *
            from public.carbon_visitas_base(
              p_viagem_id, p_sem_viagem, p_follow_up_status, p_organizacao,
              p_situacao, p_de, p_ate
            )
           order by data desc, criado_em desc
           limit v_limite
        ) b
        join public.carbon_visitas v on v.id = b.id
    ) l;

  v_total := jsonb_array_length(v_registros);

  insert into public.carbon_visitas_auditoria (
    tipo, usuario_id, quantidade_registros, incluiu_contatos, filtros, motivo
  ) values (
    'exportacao', p_usuario_id, v_total, v_incluir, v_filtros, v_motivo
  )
  returning id into v_log_id;

  return jsonb_build_object(
    'registros',        v_registros,
    'total',            v_total,
    'incluiu_contatos', v_incluir,
    'exportacao_id',    v_log_id,
    'filtros',          v_filtros
  );
end;
$$;

comment on function public.carbon_visitas_exportar(uuid, boolean, text, uuid, boolean, text, text, text, date, date, integer) is
  'Exportacao da base de visitas, com registro de auditoria gravado NA MESMA TRANSACAO: nao existe caminho de exportar sem deixar rastro de quem exportou, quando, com quais filtros, se levou contato e com que finalidade. Contato so entra com p_incluir_contatos = true, que a Edge Function so alcanca com papel admin ou gestor, e nesse caso motivo e autor sao obrigatorios (levanta motivo_obrigatorio e usuario_obrigatorio). Limite de 5000 linhas por chamada.';


-- Privilegios das funcoes -----------------------------------------------------
-- carbon_visitas_base NAO recebe grant: e consumida internamente pelas funcoes acima
-- (security definer, executam como o dono). Mante-la fora do alcance do service_role
-- evita que uma rota futura a chame direto e passe por cima das regras de auditoria.
revoke all on function
  public.carbon_visitas_base(uuid, boolean, text, text, text, date, date)
  from public, anon, authenticated;

revoke all on function
  public.carbon_viagens_listar(text, text, date, date, integer, integer)
  from public, anon, authenticated;
revoke all on function
  public.carbon_visitas_listar(uuid, boolean, text, text, text, date, date, integer, integer)
  from public, anon, authenticated;
revoke all on function public.carbon_visita_detalhe(uuid, boolean)
  from public, anon, authenticated;
revoke all on function public.carbon_visita_anonimizar(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.carbon_visitas_anonimizar_vencidas(uuid, integer)
  from public, anon, authenticated;
revoke all on function
  public.carbon_visitas_exportar(uuid, boolean, text, uuid, boolean, text, text, text, date, date, integer)
  from public, anon, authenticated;

grant execute on function
  public.carbon_viagens_listar(text, text, date, date, integer, integer)
  to service_role;
grant execute on function
  public.carbon_visitas_listar(uuid, boolean, text, text, text, date, date, integer, integer)
  to service_role;
grant execute on function public.carbon_visita_detalhe(uuid, boolean)          to service_role;
grant execute on function public.carbon_visita_anonimizar(uuid, text, uuid)    to service_role;
grant execute on function public.carbon_visitas_anonimizar_vencidas(uuid, integer) to service_role;
grant execute on function
  public.carbon_visitas_exportar(uuid, boolean, text, uuid, boolean, text, text, text, date, date, integer)
  to service_role;


-- =============================================================================
-- 5. Vinculo com cliente e com o funil comercial: por que NAO esta aqui
-- =============================================================================
-- ESTA SECAO NAO CRIA NADA. E o registro de uma dependencia que ainda nao existe,
-- para quem vier depois nao inventar um segundo caminho.
--
-- O criterio de aceite da issue #12 pede vinculo da visita com o cadastro de
-- clientes e com o funil comercial (Oportunidades). NENHUMA DAS DUAS ENTIDADES
-- EXISTE no sistema: o levantamento encontrou as paginas de Clientes e de
-- Oportunidades VAZIAS no Notion (docs/notion/06-paginas-vazias-e-stubs.md), e o
-- funil da consultoria e objeto de uma issue de DESCOBERTA (levantar antes de
-- especificar), nao de implementacao.
--
-- Criar aqui uma coluna cliente_id ou oportunidade_id apontando para uma tabela cujo
-- nome, chave e campos ninguem definiu seria pior do que nao ter: a coluna nasceria
-- sem chave estrangeira, seria preenchida a mao com um uuid de nada e teria de ser
-- migrada quando a entidade real aparecesse.
--
-- O que existe hoje, e e suficiente para o vinculo ser feito depois sem migracao de
-- dado: carbon_visitas.organizacao guarda a organizacao visitada, e carbon_visitas.id
-- e uuid estavel. Quando a entidade de cliente ou de oportunidade existir, o vinculo
-- entra como coluna nova com chave estrangeira (uma linha de ALTER TABLE) ou, se for
-- N:N, como tabela de ligacao, sem reescrever nada do que esta aqui.
--
-- A migration de reunioes (20260814096000) mostra o padrao a seguir nesse momento:
-- bloco anonimo do/end que so acrescenta a chave estrangeira quando a tabela
-- referenciada ja existir, mantendo a migration aplicavel em qualquer ordem.
do $$
begin
  raise notice 'carbon_visitas nao tem vinculo com cliente nem com oportunidade: nenhuma das duas entidades existe no sistema (ver secao 5 desta migration). O vinculo entra quando a issue do funil comercial for especificada.';
end $$;

-- =============================================================================
-- Apsis Carbon - findings de auditoria: uma entidade para VVB, Verra e BeZero
-- Arquivo: 20260814093000_findings.sql
-- =============================================================================
-- Atende a issue #5 do backlog inicial (docs/issues/BACKLOG-INICIAL.md), derivada
-- de tres bases separadas do Notion:
--
--   docs/notion/09-vvb-findings.md   95 registros, auditoria credenciada, CAR e CL
--   docs/notion/10-findings-verra.md  6 registros, o proprio programa, so CL
--   docs/notion/12-be-zero.md        31 itens, agencia de rating de credito
--
-- POR QUE UMA TABELA E NAO TRES. As tres bases do Notion tem as MESMAS seis views
-- (Findings, Board, Status, Revisao, Evidencias, Type of Findings) e praticamente as
-- mesmas colunas: pedido em ingles, status, estado de evidencia, responsavel e
-- comentarios. Sao a mesma entidade com ORIGEM diferente. Tres tabelas obrigariam a
-- triplicar tela, rota e regra de progresso, e a primeira mudanca de campo
-- divergiria entre elas.
--
-- OS TRES PROBLEMAS ESTRUTURAIS DO NOTION QUE ESTA MIGRATION RESOLVE:
--
--   1. RODADA COMO ENTIDADE. No Notion a coluna se chama literalmente
--      '2nd Round Findings'. O numero da rodada esta no NOME da coluna, portanto a
--      terceira rodada exigiria coluna nova, e o historico das anteriores nao tem
--      onde morar. Aqui a rodada e uma linha de carbon_auditoria_rodadas.
--
--   2. SUBITENS VERIFICAVEIS. Hoje a equipe usa o campo de comentarios como
--      checklist manual, com dezenas de linhas do tipo '2.3.12 - Sem italico OK' e
--      'Figure 1 - Ingles OK'. E uma sublista socada num campo de texto porque a
--      ferramenta nao oferece o recurso: carbon_finding_subitens da estado proprio
--      a cada item e o progresso do finding passa a ser derivado deles.
--
--   3. BILINGUISMO. O apontamento e a exigencia chegam em INGLES, a resposta
--      interna e escrita em PORTUGUES e o documento que volta para a validadora vai
--      em INGLES. No Notion isso convive tudo no mesmo campo Comments, junto com
--      decisoes pendentes e instrucoes para quem redige. Aqui sao quatro colunas
--      com idioma explicito no nome, e plano_resposta_pt (rascunho de trabalho) e
--      separado de resposta_oficial_en (o que sai para o auditor). Varios findings
--      reais existem justamente porque havia conteudo em portugues onde a norma
--      exige ingles, entao misturar os dois idiomas na mesma coluna e o problema,
--      nao a solucao.
--
-- CONTROLE DE ACESSO - PENDENCIA QUE VALE ESPECIALMENTE AQUI.
-- Findings de auditoria tratam de material sensivel de cliente e de terceiros:
-- territorio, acordos com associacoes, reparticao de beneficios e processos de
-- consentimento livre, previo e informado com comunidade indigena. A regra de
-- leitura vigente no carbon-api libera QUALQUER colaborador ativo do dominio (ver
-- o comentario de PAPEIS_ESCRITA em supabase/functions/carbon-api/index.ts), o que
-- e frouxo demais para este conteudo. Esta tela e candidata declarada a restricao
-- por projeto e por papel, com trilha de acesso. A decisao e do dono e NAO foi
-- tomada aqui; o que esta feito e o minimo que nao piora a situacao: RLS ativa sem
-- policy nenhuma, portanto nem a anon key nem o papel authenticated alcancam estas
-- tabelas - so o service_role, pela Edge Function, depois de validar o token do
-- Azure AD.
--
-- ESCOPO DELIBERADAMENTE FORA:
--   - VINCULO COM O CAPITULO DO RELATORIO DE MONITORAMENTO. capitulo_mr_id existe
--     como coluna mas SEM foreign key: a tabela de capitulos do monitoramento e da
--     issue #3 e ainda nao existe. Criar a FK aqui faria esta migration depender de
--     um objeto que pode nao ter sido aplicado. Ver a nota na propria coluna.
--   - ENTIDADE DE EVIDENCIA. A issue #4 (checklist de evidencias) e a #6 (documento
--     unico) criam a entidade que estado_evidencia deveria referenciar. Enquanto
--     nao existem, evidencia continua sendo ESTADO, como no Notion.
--   - TEMPLATE DE CHECKLIST POR AVALIADOR. Os 28 temas publicos da metodologia da
--     BeZero (docs/notion/12-be-zero.md) sao candidatos a seed, exatamente como
--     carbon_pdd_template fez com a estrutura do PDD. Isso exige uma tabela de
--     template por origem e ficou fora desta entrega, que se limita as tres
--     tabelas da issue.
--
-- LGPD: nenhuma linha de dado e semeada por esta migration. As colunas de texto
-- guardam conteudo de auditoria redigido pela equipe; nome de pessoa fisica nao
-- deve ser digitado nelas (para responsavel existe FK para carbon_usuarios, e para
-- encaminhamento externo existe aguardando_quem, que pede AREA, nao pessoa).
--
-- Esta migration e idempotente: pode ser reaplicada sem erro.
-- =============================================================================


-- =============================================================================
-- 1. carbon_auditoria_rodadas - a rodada de auditoria como ENTIDADE
-- =============================================================================
-- Um projeto responde a tres processos externos ao mesmo tempo, e cada um emite
-- findings em rodadas sucessivas. A rodada guarda o par de datas que a operacao
-- realmente cobra (quando chegou o pacote de findings e quando a resposta saiu),
-- que hoje nao existe em lugar nenhum do Notion.

create table if not exists public.carbon_auditoria_rodadas (
  id                uuid primary key default gen_random_uuid(),
  projeto_id        uuid not null references public.carbon_projetos (id) on delete cascade,
  origem            text not null
                      check (origem in ('vvb', 'verra', 'bezero')),
  numero            integer not null check (numero >= 1),
  data_recebimento  date,
  data_resposta     date,
  observacoes       text,
  criado_por        uuid references public.carbon_usuarios (id),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),

  -- A numeracao e por projeto E por origem: a rodada 2 da VVB nao tem relacao
  -- com a rodada 2 da Verra. Este unique e o que garante que 'rodada 2' seja uma
  -- referencia sem ambiguidade dentro de um processo.
  unique (projeto_id, origem, numero),

  -- Resposta nunca antes do recebimento. So vale com as duas pontas preenchidas:
  -- rodada em andamento tem recebimento e nao tem resposta.
  constraint carbon_auditoria_rodadas_datas_chk check (
    data_recebimento is null
    or data_resposta is null
    or data_resposta >= data_recebimento
  )
);

comment on table public.carbon_auditoria_rodadas is
  'Rodada de auditoria de um projeto perante um processo externo (VVB, Verra ou BeZero). E a correcao do problema estrutural do Notion, onde o numero da rodada estava no NOME da coluna (2nd Round Findings) e cada rodada nova exigiria coluna nova. Escrita somente pela Edge Function carbon-api, com papel admin ou gestor.';
comment on column public.carbon_auditoria_rodadas.projeto_id is
  'Projeto auditado. ON DELETE CASCADE: apagar o projeto apaga as rodadas e, por cascata, os findings.';
comment on column public.carbon_auditoria_rodadas.origem is
  'Quem emitiu os findings desta rodada. vvb = Validation and Verification Body, auditoria independente credenciada, aponta conformidade por secao do documento. verra = o proprio programa, na revisao para registro, com findings tematicos de governanca e salvaguardas. bezero = agencia de rating de credito, avalia risco e influencia o preco de venda. Sao processos DIFERENTES, com naturezas diferentes, sobre o mesmo projeto: e por isso que origem e atributo e nao tabela.';
comment on column public.carbon_auditoria_rodadas.numero is
  'Numero sequencial da rodada dentro do par projeto + origem, comecando em 1. Derivado no servidor por public.carbon_auditoria_rodada_criar (max + 1), nao digitado: numeracao de rodada e sequencia, nao escolha de quem cadastra.';
comment on column public.carbon_auditoria_rodadas.data_recebimento is
  'Quando o pacote de findings desta rodada chegou. Junto com data_resposta e o que permite medir tempo de resposta por rodada, informacao que a operacao cobra e que hoje nao existe em lugar nenhum.';
comment on column public.carbon_auditoria_rodadas.data_resposta is
  'Quando a resposta consolidada da rodada saiu para o auditor. Nulo enquanto a rodada esta aberta.';
comment on column public.carbon_auditoria_rodadas.observacoes is
  'Anotacao interna sobre a rodada, em portugues. Nao e conteudo de finding.';
comment on column public.carbon_auditoria_rodadas.criado_por is
  'Colaborador que registrou a rodada. Referencia funcional para trilha de autoria.';
comment on column public.carbon_auditoria_rodadas.atualizado_em is
  'Mantido pela trigger carbon_auditoria_rodadas_atualizado_em a cada UPDATE.';

-- A tela sempre carrega as rodadas de UM projeto, agrupadas por origem e ordenadas
-- por numero: e exatamente este indice.
create index if not exists carbon_auditoria_rodadas_projeto_idx
  on public.carbon_auditoria_rodadas (projeto_id, origem, numero);

alter table public.carbon_auditoria_rodadas enable row level security;
revoke all on table public.carbon_auditoria_rodadas from anon, authenticated;
grant all on table public.carbon_auditoria_rodadas to service_role;


-- =============================================================================
-- 2. carbon_findings - o apontamento
-- =============================================================================

create table if not exists public.carbon_findings (
  id                  uuid primary key default gen_random_uuid(),
  rodada_id           uuid not null
                        references public.carbon_auditoria_rodadas (id) on delete cascade,

  -- Classificacao ------------------------------------------------------------
  tipo                text check (tipo in ('car', 'cl')),
  identificador       text,
  ordem               integer check (ordem is null or ordem >= 0),
  documento_alvo      text not null default 'outro'
                        check (documento_alvo in ('pdd', 'monitoramento', 'outro')),

  -- Onde o finding pega ------------------------------------------------------
  capitulo_ref        text,
  capitulo_pdd_id     uuid references public.carbon_pdd_capitulos (id) on delete set null,
  capitulo_mr_id      uuid,

  -- Conteudo, com o idioma no nome da coluna ---------------------------------
  descricao_en        text not null check (btrim(descricao_en) <> ''),
  acao_exigida_en     text,
  plano_resposta_pt   text,
  resposta_oficial_en text,

  -- Estado -------------------------------------------------------------------
  estado              text not null default 'aberto'
                        check (estado in (
                          'aberto',
                          'em_andamento',
                          'aguardando_terceiro',
                          'respondido',
                          'fechado',
                          'nao_aplicavel'
                        )),
  estado_evidencia    text not null default 'pendente'
                        check (estado_evidencia in ('pendente', 'ok', 'nao_aplicavel')),
  responsavel_id      uuid references public.carbon_usuarios (id),
  aguardando_quem     text,

  criado_por          uuid references public.carbon_usuarios (id),
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),

  -- Espera por terceiro SEM dizer por quem se espera e o problema que este
  -- estado existe para resolver: no Notion o finding parava sem dono aparente,
  -- com o encaminhamento escondido no meio do campo de comentarios. O check
  -- transforma isso em regra: quem escolhe 'aguardando_terceiro' informa a area.
  constraint carbon_findings_aguardando_quem_chk check (
    estado <> 'aguardando_terceiro'
    or nullif(btrim(aguardando_quem), '') is not null
  )
);

comment on table public.carbon_findings is
  'Apontamento de um processo externo sobre um projeto: nao conformidade (CAR), pedido de esclarecimento (CL) ou pedido de informacao de due diligence. Entidade UNICA para VVB, Verra e BeZero - a origem vem da rodada (carbon_auditoria_rodadas.origem), porque as tres bases do Notion tem as mesmas seis views e praticamente as mesmas colunas. Material sensivel de auditoria: ver a nota de controle de acesso no cabecalho da migration.';
comment on column public.carbon_findings.rodada_id is
  'Rodada em que o finding foi emitido. E por aqui que se chega ao projeto e a origem: nao ha projeto_id denormalizado de proposito, para nao existir a possibilidade de um finding apontar para um projeto diferente do projeto da sua rodada.';
comment on column public.carbon_findings.tipo is
  'car = Corrective Action Request (nao conformidade, exige correcao obrigatoria). cl = Clarification Request (pedido de esclarecimento, exige resposta, nao necessariamente mudanca). NULLABLE de proposito: este vocabulario e da VVB. A Verra usa apenas CL, e a BeZero nao classifica seus itens - a base dela nao tem a coluna Type of finding, porque sao pedidos de informacao de due diligence. Inventar um terceiro valor de enum para a BeZero seria criar vocabulario que a equipe nao usa; a visao por tipo agrupa os sem tipo num grupo proprio.';
comment on column public.carbon_findings.identificador is
  'Identificador dado pelo auditor, como aparece na comunicacao oficial (ex.: ID - 01, ID - 06 PK). Texto livre e SEM unique de proposito: a numeracao do auditor e por documento e por rodada, repete entre PD e MR, e um finding reaberto costuma manter o identificador antigo. Unicidade aqui bloquearia importacao legitima do historico.';
comment on column public.carbon_findings.ordem is
  'Posicao sequencial do item na lista do auditor: Review process (1 a 6) nos findings da Verra e N (1 a 28) no checklist da BeZero. Serve para a tela apresentar na ordem do documento original em vez de por data de cadastro. Nulo nos findings da VVB, que se ordenam pelo identificador.';
comment on column public.carbon_findings.documento_alvo is
  'Documento do projeto a que o finding se refere: pdd (o PD do vocabulario do auditor), monitoramento (o MR) ou outro. Findings da Verra e da BeZero sao TEMATICOS, nao apontam secao de documento, e ficam em outro - por isso o default e outro e nao pdd.';
comment on column public.carbon_findings.capitulo_ref is
  'Referencia ao trecho como o auditor escreveu (ex.: Section 2.1.16, Entire MR) ou o tema, no caso de Verra e BeZero. Texto livre e conservado mesmo quando capitulo_pdd_id esta preenchido: e a citacao literal da comunicacao oficial, e o vinculo estruturado e uma interpretacao nossa.';
comment on column public.carbon_findings.capitulo_pdd_id is
  'Vinculo real com o capitulo do PDD, fechando o ciclo capitulo escrito -> auditado -> apontamento -> correcao no capitulo. ON DELETE SET NULL: recriar o PDD nao pode apagar finding de auditoria, so desfaz o vinculo (capitulo_ref continua guardando a citacao).';
comment on column public.carbon_findings.capitulo_mr_id is
  'Vinculo com o capitulo do relatorio de monitoramento. SEM FOREIGN KEY de proposito: a tabela de capitulos do monitoramento pertence a issue #3 e ainda nao existe, e declarar a FK aqui faria esta migration depender de um objeto ausente. Quando aquela migration existir, ela acrescenta a constraint (alter table ... add constraint ... references), que e o lado correto da dependencia.';
comment on column public.carbon_findings.descricao_en is
  'O apontamento como o auditor redigiu, EM INGLES. Obrigatorio: finding sem apontamento nao e finding. Nao traduzir e nao reescrever - e a citacao que sustenta a resposta.';
comment on column public.carbon_findings.acao_exigida_en is
  'O que o auditor exige (Action Required), EM INGLES. Separado da descricao porque o apontamento descreve o problema e a exigencia define o criterio de fechamento.';
comment on column public.carbon_findings.plano_resposta_pt is
  'Plano de resposta e rascunho de trabalho da equipe, EM PORTUGUES. E o campo onde cabe decisao pendente, encaminhamento e discussao interna. NAO vai para o auditor.';
comment on column public.carbon_findings.resposta_oficial_en is
  'A resposta que efetivamente vai para o auditor, EM INGLES. Separada do rascunho porque no Notion as duas coisas convivem no mesmo campo Comments, e ja houve finding causado por conteudo em portugues onde a norma exige ingles. Com a separacao, da para conferir o que sai antes de sair.';
comment on column public.carbon_findings.estado is
  'Andamento da RESPOSTA, primeiro dos dois eixos de progresso. aberto (o Open/New Finding do Notion), em_andamento, aguardando_terceiro (parado por dependencia de outra area ou de parceiro externo), respondido (resposta enviada, esperando reavaliacao do auditor), fechado (o Closed: o auditor aceitou), nao_aplicavel (o Nao se aplica do checklist da BeZero). REGRA DE PROGRESSO: nao_aplicavel sai do DENOMINADOR em public.carbon_findings_progresso - sem isso o checklist nunca fecha 100%, o mesmo problema dos criterios opcionais do PDD.';
comment on column public.carbon_findings.estado_evidencia is
  'Andamento da EVIDENCIA, segundo eixo de progresso, INDEPENDENTE do estado: um item pode estar com a resposta redigida e a evidencia ainda pendente, e essa combinacao e comum na base real. pendente, ok ou nao_aplicavel. Hoje e estado solto, como no Notion; quando existir a entidade de evidencia (issues #4 e #6) isto deve virar referencia aos documentos que satisfazem o finding.';
comment on column public.carbon_findings.responsavel_id is
  'Colaborador responsavel pelo finding. FK para carbon_usuarios em vez de texto livre: na base da BeZero este campo guarda INICIAIS de pessoas, o que impede qualquer visao de carga por pessoa e, alem disso, e dado pessoal solto em campo de texto.';
comment on column public.carbon_findings.aguardando_quem is
  'AREA ou parceiro de quem se espera, quando estado = aguardando_terceiro (ex.: juridico, geoprocessamento, parceiro externo). Obrigatorio nesse estado, ver carbon_findings_aguardando_quem_chk. LGPD: escreva a area, nunca o nome da pessoa.';
comment on column public.carbon_findings.atualizado_em is
  'Mantido pela trigger carbon_findings_atualizado_em a cada UPDATE.';

-- Indices ---------------------------------------------------------------------
-- (rodada_id, ordem): a leitura da tela e sempre por projeto -> rodadas -> findings,
-- e o join volta por rodada_id. Sem indice na FK, cada carga viraria varredura.
create index if not exists carbon_findings_rodada_ordem_idx
  on public.carbon_findings (rodada_id, ordem);

-- As visoes por estado e por estado de evidencia sao duas das seis que a equipe
-- usa; os dois eixos filtram de forma independente.
create index if not exists carbon_findings_estado_idx
  on public.carbon_findings (estado);
create index if not exists carbon_findings_estado_evidencia_idx
  on public.carbon_findings (estado_evidencia);

-- Parciais: a maioria dos findings nao tem responsavel nem vinculo com capitulo,
-- e indice cheio de null so ocuparia espaco.
create index if not exists carbon_findings_responsavel_idx
  on public.carbon_findings (responsavel_id)
  where responsavel_id is not null;
create index if not exists carbon_findings_capitulo_pdd_idx
  on public.carbon_findings (capitulo_pdd_id)
  where capitulo_pdd_id is not null;

alter table public.carbon_findings enable row level security;
revoke all on table public.carbon_findings from anon, authenticated;
grant all on table public.carbon_findings to service_role;


-- =============================================================================
-- 3. carbon_finding_subitens - a checklist que hoje vive dentro de um comentario
-- =============================================================================
-- Esta e a lacuna mais evidente da ferramenta atual. Na base real ha findings cuja
-- resposta e uma lista de dezenas de linhas digitadas a mao dentro do campo de
-- comentarios ('2.3.12 - Sem italico OK', 'Figure 1 - Ingles OK', 'Table 22 -
-- Corrigido'). Cada uma dessas linhas e um item verificavel com estado proprio, e o
-- progresso do finding e a razao entre concluidos e total.

create table if not exists public.carbon_finding_subitens (
  id            uuid primary key default gen_random_uuid(),
  finding_id    uuid not null references public.carbon_findings (id) on delete cascade,
  descricao     text not null check (btrim(descricao) <> ''),
  concluido     boolean not null default false,
  ordem         integer not null default 0 check (ordem >= 0),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.carbon_finding_subitens is
  'Itens verificaveis de UM finding, com progresso agregado no finding (public.carbon_finding_json). Existe porque hoje a equipe soca a checklist item por item dentro do campo de comentarios do Notion, com dezenas de linhas por finding: sem estado proprio por item, ninguem sabe quanto falta e a conferencia recomeca do zero a cada revisao.';
comment on column public.carbon_finding_subitens.finding_id is
  'Finding dono do item. ON DELETE CASCADE: o item nao tem sentido fora do finding.';
comment on column public.carbon_finding_subitens.descricao is
  'O item a verificar, na forma curta em que a equipe ja escreve (ex.: Section 2.3.12 - italico, Figure 1 - traduzir). Idioma livre: aqui e conferencia interna, nao texto que vai para o auditor.';
comment on column public.carbon_finding_subitens.concluido is
  'true = item verificado. E o unico dado que alimenta o progresso do finding.';
comment on column public.carbon_finding_subitens.ordem is
  'Ordem de exibicao. A criacao em lote (colar uma lista de linhas) numera em sequencia, preservando a ordem da lista colada, que normalmente e a ordem do documento.';
comment on column public.carbon_finding_subitens.atualizado_em is
  'Mantido pela trigger carbon_finding_subitens_atualizado_em a cada UPDATE.';

create index if not exists carbon_finding_subitens_finding_ordem_idx
  on public.carbon_finding_subitens (finding_id, ordem);

alter table public.carbon_finding_subitens enable row level security;
revoke all on table public.carbon_finding_subitens from anon, authenticated;
grant all on table public.carbon_finding_subitens to service_role;


-- =============================================================================
-- 4. Trigger de atualizado_em
-- =============================================================================
-- UMA funcao para as tres tabelas deste dominio, em vez de tres identicas. O padrao
-- do projeto (carbon_pdd_capitulos_set_atualizado_em) tinha uma funcao por tabela
-- porque havia uma tabela so; triplicar o mesmo corpo aqui seria copia sem ganho.

create or replace function public.carbon_auditoria_set_atualizado_em()
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

comment on function public.carbon_auditoria_set_atualizado_em() is
  'Mantem atualizado_em em dia nos UPDATEs das tres tabelas de findings de auditoria (carbon_auditoria_rodadas, carbon_findings e carbon_finding_subitens).';

drop trigger if exists carbon_auditoria_rodadas_atualizado_em on public.carbon_auditoria_rodadas;
create trigger carbon_auditoria_rodadas_atualizado_em
  before update on public.carbon_auditoria_rodadas
  for each row
  execute function public.carbon_auditoria_set_atualizado_em();

drop trigger if exists carbon_findings_atualizado_em on public.carbon_findings;
create trigger carbon_findings_atualizado_em
  before update on public.carbon_findings
  for each row
  execute function public.carbon_auditoria_set_atualizado_em();

drop trigger if exists carbon_finding_subitens_atualizado_em on public.carbon_finding_subitens;
create trigger carbon_finding_subitens_atualizado_em
  before update on public.carbon_finding_subitens
  for each row
  execute function public.carbon_auditoria_set_atualizado_em();


-- =============================================================================
-- 5. Funcoes chamadas por RPC pela Edge Function carbon-api
-- =============================================================================
-- Todas security definer com search_path fixo. SECURITY DEFINER contorna a RLS,
-- portanto o EXECUTE e revogado de public/anon/authenticated e concedido apenas ao
-- service_role no fim desta secao. Sem isso a anon key chamaria estas funcoes pelo
-- endpoint /rest/v1/rpc e leria material de auditoria direto, contornando a RLS.

-- 5.1 Criar rodada com numeracao derivada -------------------------------------
-- POR QUE EXISTE. O numero da rodada e sequencia, nao escolha: aceitar o numero do
-- cliente convida a rodada 5 sem rodada 4 e a colisao no unique. Calcular na Edge
-- Function exigiria um SELECT max() e depois um INSERT, dois commits, com janela
-- para duas pessoas criarem a mesma rodada. Aqui o max e o insert sao UMA
-- instrucao, e a unica colisao possivel e a simultaneidade real, que o unique
-- barra e a API devolve como 409.
create or replace function public.carbon_auditoria_rodada_criar(
  p_projeto_id       uuid,
  p_origem           text,
  p_data_recebimento date default null,
  p_data_resposta    date default null,
  p_observacoes      text default null,
  p_criado_por       uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linha public.carbon_auditoria_rodadas;
begin
  insert into public.carbon_auditoria_rodadas (
    projeto_id, origem, numero, data_recebimento, data_resposta, observacoes, criado_por
  )
  select
    p_projeto_id,
    p_origem,
    coalesce(max(r.numero), 0) + 1,
    p_data_recebimento,
    p_data_resposta,
    p_observacoes,
    p_criado_por
    from public.carbon_auditoria_rodadas r
   where r.projeto_id = p_projeto_id
     and r.origem = p_origem
  returning * into v_linha;

  return to_jsonb(v_linha);
end;
$$;

comment on function public.carbon_auditoria_rodada_criar(uuid, text, date, date, text, uuid) is
  'Cria a proxima rodada de auditoria do par projeto + origem, com numero = max + 1 calculado na propria instrucao de insert, e devolve a linha criada como jsonb. Projeto inexistente ou origem fora do enum sao recusados pelas constraints da tabela, que a Edge Function traduz em referencia_invalida e campo_invalido.';


-- 5.2 Forma canonica de UM finding --------------------------------------------
-- A forma do finding e definida UMA vez, aqui, e reaproveitada pela leitura da
-- tela e por todas as respostas de escrita. Sem isso, o objeto devolvido pelo PATCH
-- divergiria do objeto da listagem no primeiro campo novo, e a tela passaria a
-- mostrar dado diferente dependendo de como chegou nele.
--
-- subitens_pct e NULL, e nao 0, quando o finding nao tem subitens: 0% diria
-- 'nada feito', quando o correto e 'este finding nao usa checklist'. A tela
-- depende dessa diferenca para nao mostrar barra vazia em finding simples.
create or replace function public.carbon_finding_json(p_finding_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id',                  f.id,
    'rodada_id',           f.rodada_id,
    'projeto_id',          r.projeto_id,
    'origem',              r.origem,
    'rodada_numero',       r.numero,
    'tipo',                f.tipo,
    'identificador',       f.identificador,
    'ordem',               f.ordem,
    'documento_alvo',      f.documento_alvo,
    'capitulo_ref',        f.capitulo_ref,
    'capitulo_pdd_id',     f.capitulo_pdd_id,
    -- Numeracao e titulo do capitulo vinculado viajam junto para a tela nao
    -- precisar de uma segunda chamada so para mostrar '2.3 Safeguards...'.
    'capitulo_pdd',        case
                             when c.id is null then null
                             else jsonb_build_object(
                                    'id', c.id,
                                    'capitulo', c.capitulo,
                                    'nome', c.nome
                                  )
                           end,
    'capitulo_mr_id',      f.capitulo_mr_id,
    'descricao_en',        f.descricao_en,
    'acao_exigida_en',     f.acao_exigida_en,
    'plano_resposta_pt',   f.plano_resposta_pt,
    'resposta_oficial_en', f.resposta_oficial_en,
    'estado',              f.estado,
    'estado_evidencia',    f.estado_evidencia,
    'responsavel_id',      f.responsavel_id,
    'responsavel_nome',    u.nome,
    'aguardando_quem',     f.aguardando_quem,
    'criado_em',           f.criado_em,
    'atualizado_em',       f.atualizado_em,
    'subitens',            coalesce(s.itens, '[]'::jsonb),
    'subitens_total',      coalesce(s.total, 0),
    'subitens_concluidos', coalesce(s.concluidos, 0),
    'subitens_pct',        case
                             when coalesce(s.total, 0) = 0 then null
                             else round(s.concluidos * 100.0 / s.total, 1)
                           end
  )
  from public.carbon_findings f
  join public.carbon_auditoria_rodadas r on r.id = f.rodada_id
  left join public.carbon_pdd_capitulos c on c.id = f.capitulo_pdd_id
  left join public.carbon_usuarios u on u.id = f.responsavel_id
  left join lateral (
    select
      count(*) as total,
      count(*) filter (where sub.concluido) as concluidos,
      jsonb_agg(
        jsonb_build_object(
          'id', sub.id,
          'finding_id', sub.finding_id,
          'descricao', sub.descricao,
          'concluido', sub.concluido,
          'ordem', sub.ordem,
          'criado_em', sub.criado_em,
          'atualizado_em', sub.atualizado_em
        )
        order by sub.ordem, sub.criado_em
      ) as itens
      from public.carbon_finding_subitens sub
     where sub.finding_id = f.id
  ) s on true
  where f.id = p_finding_id;
$$;

comment on function public.carbon_finding_json(uuid) is
  'Um finding na forma canonica: campos proprios, origem e numero da rodada, capitulo do PDD vinculado, nome do responsavel e a lista de subitens com o progresso agregado (total, concluidos e pct). Devolve NULL quando o id nao existe, para a API responder 404. subitens_pct e NULL quando nao ha subitens - 0% diria nada feito, e o correto e este finding nao usa checklist.';


-- 5.3 Progresso agregado do projeto -------------------------------------------
-- Alimenta os contadores das SEIS visoes que a equipe usa (lista, board por
-- estado, por rodada, por estado de evidencia, por tipo e por origem). A conta
-- mora aqui, e nao no frontend, pelo mesmo motivo de carbon_pdd_progresso: regra
-- de denominador duplicada em JavaScript e divergencia garantida.
--
-- DUAS REGRAS QUE PRECISAM ESTAR JUNTAS NUM LUGAR SO:
--   1. estado = 'nao_aplicavel' sai do DENOMINADOR. Na base da BeZero ha itens
--      marcados assim; sem tira-los da conta o checklist nunca fecha 100%.
--   2. Os dois eixos de progresso sao INDEPENDENTES: pct mede resposta (fechados)
--      e pct_evidencia mede evidencia (ok). Um item pode estar fechado com
--      evidencia pendente, e mostrar um numero so esconderia exatamente isso.
--      No eixo de evidencia, estado_evidencia = 'nao_aplicavel' tambem sai do
--      denominador - senao evidencia que ninguem precisa entregar viraria divida.
--
-- As listas por_estado, por_evidencia, por_tipo e por_origem saem SEMPRE completas,
-- com zero onde nao ha finding: o board precisa das colunas vazias desenhadas, e um
-- agrupamento que omite a coluna vazia parece agrupamento quebrado.
create or replace function public.carbon_findings_progresso(
  p_projeto_id uuid,
  p_origem     text default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select f.id, f.estado, f.estado_evidencia, f.tipo,
           r.id as rodada_id, r.origem, r.numero
      from public.carbon_findings f
      join public.carbon_auditoria_rodadas r on r.id = f.rodada_id
     where r.projeto_id = p_projeto_id
       and (p_origem is null or r.origem = p_origem)
  ),
  totais as (
    select
      count(*)                                                     as total,
      count(*) filter (where estado = 'nao_aplicavel')             as nao_aplicaveis,
      count(*) filter (where estado <> 'nao_aplicavel')            as considerados,
      count(*) filter (where estado = 'fechado')                   as fechados,
      count(*) filter (where estado not in ('nao_aplicavel', 'fechado')) as em_aberto,
      count(*) filter (where estado = 'aguardando_terceiro')       as aguardando_terceiro,
      count(*) filter (
        where estado <> 'nao_aplicavel' and estado_evidencia <> 'nao_aplicavel'
      )                                                            as considerados_evidencia,
      count(*) filter (
        where estado <> 'nao_aplicavel' and estado_evidencia = 'ok'
      )                                                            as evidencia_ok
      from base
  ),
  subitens as (
    select
      count(*)                                  as total,
      count(*) filter (where s.concluido)       as concluidos
      from public.carbon_finding_subitens s
     where s.finding_id in (select id from base)
  ),
  por_estado as (
    select e.pos, e.estado, count(b.id) as total
      from (values
              ('aberto', 1),
              ('em_andamento', 2),
              ('aguardando_terceiro', 3),
              ('respondido', 4),
              ('fechado', 5),
              ('nao_aplicavel', 6)
           ) as e(estado, pos)
      left join base b on b.estado = e.estado
     group by e.pos, e.estado
  ),
  por_evidencia as (
    select e.pos, e.estado_evidencia, count(b.id) as total
      from (values ('pendente', 1), ('ok', 2), ('nao_aplicavel', 3))
             as e(estado_evidencia, pos)
      left join base b on b.estado_evidencia = e.estado_evidencia
     group by e.pos, e.estado_evidencia
  ),
  por_tipo as (
    -- 'sem_tipo' e o grupo dos findings da BeZero, que nao classifica em CAR/CL.
    -- Aparece na visao por tipo como grupo proprio, nunca como coluna faltando.
    select t.pos, t.tipo, count(b.id) as total
      from (values ('car', 1), ('cl', 2), ('sem_tipo', 3)) as t(tipo, pos)
      left join base b on coalesce(b.tipo, 'sem_tipo') = t.tipo
     group by t.pos, t.tipo
  ),
  por_origem as (
    select
      o.pos,
      o.origem,
      count(b.id)                                            as total,
      count(b.id) filter (where b.estado <> 'nao_aplicavel')  as considerados,
      count(b.id) filter (where b.estado = 'fechado')         as fechados
      from (values ('vvb', 1), ('verra', 2), ('bezero', 3)) as o(origem, pos)
      left join base b on b.origem = o.origem
     group by o.pos, o.origem
  ),
  por_rodada as (
    select
      rodada_id,
      origem,
      numero,
      count(*)                                          as total,
      count(*) filter (where estado <> 'nao_aplicavel')  as considerados,
      count(*) filter (where estado = 'fechado')         as fechados
      from base
     group by rodada_id, origem, numero
  )
  select jsonb_build_object(
    'total',                  t.total,
    'nao_aplicaveis',         t.nao_aplicaveis,
    'considerados',           t.considerados,
    'fechados',               t.fechados,
    'em_aberto',              t.em_aberto,
    'aguardando_terceiro',    t.aguardando_terceiro,
    'pct', case
             when t.considerados = 0 then 0
             else round(t.fechados * 100.0 / t.considerados, 1)
           end,
    'considerados_evidencia', t.considerados_evidencia,
    'evidencia_ok',           t.evidencia_ok,
    'pct_evidencia', case
                       when t.considerados_evidencia = 0 then 0
                       else round(t.evidencia_ok * 100.0 / t.considerados_evidencia, 1)
                     end,
    'subitens_total',      (select total from subitens),
    'subitens_concluidos', (select concluidos from subitens),
    'subitens_pct', (
      select case
               when total = 0 then null
               else round(concluidos * 100.0 / total, 1)
             end
        from subitens
    ),
    'por_estado', coalesce((
      select jsonb_agg(jsonb_build_object('estado', estado, 'total', total) order by pos)
        from por_estado
    ), '[]'::jsonb),
    'por_evidencia', coalesce((
      select jsonb_agg(
               jsonb_build_object('estado_evidencia', estado_evidencia, 'total', total)
               order by pos
             )
        from por_evidencia
    ), '[]'::jsonb),
    'por_tipo', coalesce((
      select jsonb_agg(jsonb_build_object('tipo', tipo, 'total', total) order by pos)
        from por_tipo
    ), '[]'::jsonb),
    'por_origem', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'origem', origem,
                 'total', total,
                 'considerados', considerados,
                 'fechados', fechados,
                 'pct', case
                          when considerados = 0 then 0
                          else round(fechados * 100.0 / considerados, 1)
                        end
               )
               order by pos
             )
        from por_origem
    ), '[]'::jsonb),
    'por_rodada', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'rodada_id', rodada_id,
                 'origem', origem,
                 'numero', numero,
                 'total', total,
                 'considerados', considerados,
                 'fechados', fechados,
                 'pct', case
                          when considerados = 0 then 0
                          else round(fechados * 100.0 / considerados, 1)
                        end
               )
               order by origem, numero
             )
        from por_rodada
    ), '[]'::jsonb)
  )
  from totais t;
$$;

comment on function public.carbon_findings_progresso(uuid, text) is
  'Contadores das seis visoes de findings de um projeto, em jsonb, opcionalmente filtrados por origem. DUAS REGRAS CENTRAIS: (1) finding com estado nao_aplicavel sai do DENOMINADOR, senao o checklist nunca fecha 100%; (2) os dois eixos de progresso sao independentes - pct mede resposta (fechados) e pct_evidencia mede evidencia (ok), porque item fechado com evidencia pendente e caso comum na base real. por_estado, por_evidencia, por_tipo e por_origem saem sempre completos, com zero onde nao ha finding, para o board desenhar as colunas vazias. Nunca divide por zero.';


-- 5.4 Carga da tela ------------------------------------------------------------
-- Uma chamada devolve tudo que a tela precisa: rodadas, findings na forma canonica
-- e os contadores. As seis visoes sao recortes do MESMO conjunto (e assim que o
-- Notion faz), e o volume e pequeno por natureza - a base real tem 95 + 6 + 31
-- registros no projeto mais movimentado. Paginar isso agora seria complexidade sem
-- demanda e quebraria os agrupamentos, que precisam do conjunto inteiro.
create or replace function public.carbon_findings_do_projeto(
  p_projeto_id uuid,
  p_origem     text default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'rodadas', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.origem, r.numero)
        from public.carbon_auditoria_rodadas r
       where r.projeto_id = p_projeto_id
         and (p_origem is null or r.origem = p_origem)
    ), '[]'::jsonb),
    -- A ordem e a do documento do auditor: rodada, depois a posicao declarada
    -- (Review process / N da BeZero) e, quando nao houver, o identificador. Data de
    -- cadastro e o ultimo criterio, so para o resultado ser deterministico.
    'findings', coalesce((
      select jsonb_agg(
               public.carbon_finding_json(f.id)
               order by r.origem, r.numero,
                        f.ordem asc nulls last,
                        f.identificador asc nulls last,
                        f.criado_em
             )
        from public.carbon_findings f
        join public.carbon_auditoria_rodadas r on r.id = f.rodada_id
       where r.projeto_id = p_projeto_id
         and (p_origem is null or r.origem = p_origem)
    ), '[]'::jsonb),
    'progresso', public.carbon_findings_progresso(p_projeto_id, p_origem)
  );
$$;

comment on function public.carbon_findings_do_projeto(uuid, text) is
  'Carga completa da tela de findings de um projeto: { rodadas, findings, progresso }, opcionalmente filtrada por origem. Chama carbon_finding_json por finding, para a forma do objeto ser definida em um lugar so; o custo e aceitavel porque o volume e de dezenas de linhas por projeto. Projeto sem finding devolve listas vazias e progresso zerado, nunca NULL.';


-- Privilegios das funcoes -----------------------------------------------------
-- O PostgreSQL concede EXECUTE a PUBLIC em toda funcao nova. Como estas sao
-- SECURITY DEFINER, deixar assim exporia leitura e escrita de material de auditoria
-- pela anon key via /rest/v1/rpc, contornando a RLS.
revoke all on function
  public.carbon_auditoria_rodada_criar(uuid, text, date, date, text, uuid)
  from public, anon, authenticated;
revoke all on function public.carbon_finding_json(uuid)
  from public, anon, authenticated;
revoke all on function public.carbon_findings_progresso(uuid, text)
  from public, anon, authenticated;
revoke all on function public.carbon_findings_do_projeto(uuid, text)
  from public, anon, authenticated;

grant execute on function
  public.carbon_auditoria_rodada_criar(uuid, text, date, date, text, uuid) to service_role;
grant execute on function public.carbon_finding_json(uuid)                to service_role;
grant execute on function public.carbon_findings_progresso(uuid, text)    to service_role;
grant execute on function public.carbon_findings_do_projeto(uuid, text)   to service_role;

-- carbon_auditoria_set_atualizado_em e SECURITY INVOKER e so serve a triggers, mas
-- tambem nao ha motivo para a anon key alcancar funcao interna.
revoke all on function public.carbon_auditoria_set_atualizado_em()
  from public, anon, authenticated;
grant execute on function public.carbon_auditoria_set_atualizado_em() to service_role;


-- =============================================================================
-- 6. Conferencia
-- =============================================================================
-- Notices, nao excecoes: esta migration nao semeia dado nenhum, entao a conferencia
-- serve para a saida do "supabase db push" mostrar que os objetos existem e que a
-- regra do denominador esta de pe. Excecao aqui faria a migration falhar por um
-- ajuste legitimo feito no SQL Editor, o que e pior do que um aviso.

do $$
declare
  v_tabelas   integer;
  v_funcoes   integer;
  v_progresso jsonb;
begin
  select count(*) into v_tabelas
    from information_schema.tables
   where table_schema = 'public'
     and table_name in (
           'carbon_auditoria_rodadas',
           'carbon_findings',
           'carbon_finding_subitens'
         );

  select count(*) into v_funcoes
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in (
           'carbon_auditoria_set_atualizado_em',
           'carbon_auditoria_rodada_criar',
           'carbon_finding_json',
           'carbon_findings_progresso',
           'carbon_findings_do_projeto'
         );

  raise notice 'Findings de auditoria: % de 3 tabelas, % de 5 funcoes.', v_tabelas, v_funcoes;

  -- Projeto inexistente: o progresso tem de vir zerado e com as listas completas,
  -- nunca NULL, porque a tela usa por_estado para desenhar as colunas do board.
  v_progresso := public.carbon_findings_progresso(
                   '00000000-0000-0000-0000-000000000000'::uuid
                 );

  if v_progresso is null
     or (v_progresso->>'pct') <> '0'
     or jsonb_array_length(v_progresso->'por_estado') <> 6 then
    raise notice 'ATENCAO: carbon_findings_progresso devolveu resultado inesperado para projeto vazio: %',
      v_progresso;
  end if;
end $$;

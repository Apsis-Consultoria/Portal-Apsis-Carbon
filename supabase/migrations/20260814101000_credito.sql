-- =============================================================================
-- Apsis Carbon - estoque e comercializacao de credito de carbono
-- Arquivo: 20260814101000_credito.sql
-- =============================================================================
-- Atende a issue #15 do backlog inicial (docs/issues/BACKLOG-INICIAL.md),
-- classificada como [lacuna].
--
-- >>> ESCOPO AGUARDANDO VALIDACAO DO DONO. LEIA ANTES DE USAR EM PRODUCAO. <<<
--
-- Esta e a UNICA migration do sistema cujo desenho NAO foi obtido por engenharia
-- reversa de estrutura existente. O levantamento do Notion registra o oposto:
-- "nao ha controle de estoque nem de emissao de credito em nenhuma pagina
-- varrida" (docs/notion/14-compradores.md). O que existe la e uma base
-- "Compradores" praticamente vazia, com nome, pais, data de compra, status e
-- e-mail, e mais nada.
--
-- Portanto:
--   * carbon_compradores segue a estrutura OBSERVADA no Notion (mais o sigilo,
--     tambem observado no dado real: um comprador esta cadastrado com o nome
--     'NDA');
--   * carbon_emissoes_credito e carbon_vendas foram INFERIDAS do padrao Verra
--     (registro de emissao com vintage e faixa de serial; transferencia e
--     retirement do credito) e do checklist de due diligence da BeZero
--     (docs/notion/12-be-zero.md, itens 12, 15, 24 e 27). NENHUM campo dessas
--     duas tabelas foi visto em uso pela equipe;
--   * a conta do estoque (secao 6) e uma PROPOSTA. A convencao do buffer, em
--     particular, muda o numero de "disponivel" e esta explicitada em
--     carbon_emissoes_credito.buffer_tco2e. Se a equipe usar a outra convencao,
--     muda a conta.
--
-- Nada disto deve ser tratado como requisito confirmado antes de o dono validar.
--
-- TRES DECISOES DE NEGOCIO QUE ESTA MIGRATION TOMA E QUE PRECISAM DE ACEITE:
--
--   1. BUFFER DENTRO DO EMITIDO. quantidade_tco2e e o volume total emitido para
--      o vintage e buffer_tco2e e a parte dele retida na conta de buffer de nao
--      permanencia, portanto NAO vendavel. Disponivel = emitido - buffer -
--      vendido. Ver a nota longa em buffer_tco2e para a convencao alternativa.
--   2. APOSENTADO E SUBCONJUNTO DE VENDIDO. O credito e aposentado (retirement)
--      DEPOIS de transferido ao comprador, entao a aposentadoria nao sai do
--      estoque uma segunda vez. Subtrair as duas coisas seria contar a mesma
--      tonelada duas vezes, e e o erro mais provavel nesta conta.
--   3. VENDA SEM EMISSAO NAO E BLOQUEADA. Venda a termo (forward) do credito de
--      vintage futuro e pratica normal do mercado, e barrar isso no banco
--      impediria de registrar o contrato que ja existe. O sistema mostra o caso
--      como conciliacao pendente (sem_emissao, sobrevendido) em vez de recusar.
--
-- Esta migration e idempotente: pode ser reaplicada sem erro.
-- =============================================================================


-- =============================================================================
-- 1. carbon_compradores - a ponta comercial
-- =============================================================================
-- Estrutura observada em docs/notion/14-compradores.md. O ponto sensivel e o
-- SIGILO POR REGISTRO: no Notion existe comprador cadastrado com o nome 'NDA',
-- ou seja, o proprio nome e informacao restrita. Isso NAO e permissao de tela, e
-- permissao de LINHA - ver a coluna sigiloso.

create table if not exists public.carbon_compradores (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  pais          text,
  status        text not null default 'prospeccao'
                  check (status in (
                    'prospeccao',
                    'negociacao',
                    'recorrente',
                    'encerrado'
                  )),
  email         text,
  recorrente    boolean not null default false,
  sigiloso      boolean not null default false,
  observacoes   text,
  ativo         boolean not null default true,
  criado_por    uuid references public.carbon_usuarios (id),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- Coerencia entre o estagio e a flag. O status 'recorrente' e o valor
  -- observado no Notion; a flag existe porque a recorrencia SOBREVIVE ao
  -- encerramento (comprador recorrente que encerrou continua tendo sido
  -- recorrente, e isso importa para previsao de receita). O que nao pode existir
  -- e o contrario: estagio dizendo recorrente com a flag negando. A Edge
  -- Function normaliza antes de gravar, portanto este check nunca deveria ser
  -- alcancado por uso normal da tela.
  constraint carbon_compradores_recorrencia_coerente_chk check (
    status <> 'recorrente' or recorrente
  ),

  -- Formato minimo de e-mail. Nao e validacao de existencia (isso nao se faz em
  -- banco): e barreira contra o campo virar deposito de texto livre com nome de
  -- pessoa e telefone dentro, que e o risco real de LGPD nesta coluna.
  constraint carbon_compradores_email_formato_chk check (
    email is null or (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
                      and char_length(email) <= 200)
  )
);

comment on table public.carbon_compradores is
  'Comprador de credito de carbono. E a unica entidade do sistema que trata da VENDA do credito: todo o resto trata de produzir e certificar. Estrutura observada em docs/notion/14-compradores.md. ESCOPO DA ISSUE #15 AGUARDA VALIDACAO DO DONO. Escrita somente pela Edge Function carbon-api, com papel admin ou gestor.';
comment on column public.carbon_compradores.nome is
  'Razao social ou nome comercial do comprador. Pessoa juridica: dado de pessoa fisica nao entra aqui (LGPD). Quando sigiloso = true, este valor NAO sai da Edge Function para quem nao e admin - ver a coluna sigiloso.';
comment on column public.carbon_compradores.pais is
  'Pais do comprador. Mercado e internacional, e por isso esta coluna e regra de negocio e nao decoracao: comprador de pais diferente do pais do projeto levanta a questao do ajuste correspondente sob o Artigo 6 do Acordo de Paris (item 12 do checklist da BeZero). Ver public.carbon_venda_ajuste_pendente.';
comment on column public.carbon_compradores.status is
  'Estagio do relacionamento: prospeccao, negociacao, recorrente ou encerrado. O valor observado no Notion indicava recorrencia, e foi o que originou este vocabulario. NAO e status da venda: a venda tem entidade propria (carbon_vendas), justamente porque um comprador tem varias.';
comment on column public.carbon_compradores.email is
  'E-mail de contato do comprador. DADO PESSOAL SOB A LGPD quando for de pessoa fisica, e o levantamento registra que um dos contatos reais usa provedor gratuito, o que sugere contato pessoal. Duas consequencias praticas: (a) prefira alias institucional (contato@, comercial@) a e-mail de pessoa; (b) a coluna NAO existe na view carbon_compradores_listagem, portanto a listagem da API nao consegue vaza-la, e no detalhe ela e omitida junto com o nome quando o registro e sigiloso.';
comment on column public.carbon_compradores.recorrente is
  'Comprador que compra mais de uma vez. Sobrevive a mudanca de status (ver carbon_compradores_recorrencia_coerente_chk): comprador recorrente que encerrou continua marcado, o que importa para previsao de receita.';
comment on column public.carbon_compradores.sigiloso is
  'true significa que a IDENTIDADE do comprador e restrita (NDA). Nao e permissao de tela, e permissao de LINHA: a Edge Function carbon-api substitui nome e e-mail por um rotulo generico para quem nao tem papel admin, tanto na listagem de compradores quanto no nome do comprador dentro das vendas. O pais continua visivel de proposito, porque dele depende a regra do ajuste correspondente. Requisito observado no dado real: existe comprador cadastrado no Notion com o nome NDA.';
comment on column public.carbon_compradores.observacoes is
  'Anotacao livre sobre o relacionamento, em portugues. LGPD: nao registre dado pessoal aqui (nome de pessoa, telefone, e-mail, documento). Esta coluna aparece para todo colaborador com acesso de leitura, INCLUSIVE nos registros sigilosos, portanto nunca escreva aqui o nome de um comprador sob NDA.';
comment on column public.carbon_compradores.ativo is
  'false esconde o comprador das listagens sem apagar as vendas ja registradas.';
comment on column public.carbon_compradores.atualizado_em is
  'Mantido pela trigger carbon_compradores_atualizado_em a cada UPDATE.';

create index if not exists carbon_compradores_nome_idx
  on public.carbon_compradores (nome);

create index if not exists carbon_compradores_status_idx
  on public.carbon_compradores (status);

-- Indice parcial: a consulta que interessa e "quais registros sao sigilosos",
-- que costuma ser uma minoria. Um indice cheio na coluna booleana nao serviria.
create index if not exists carbon_compradores_sigilosos_idx
  on public.carbon_compradores (id)
  where sigiloso;


-- =============================================================================
-- 2. carbon_emissoes_credito - o que entrou no estoque
-- =============================================================================
-- NAO OBSERVADA NO NOTION. Campos inferidos do registro de emissao do padrao
-- Verra: vintage (ano da safra do credito), volume, faixa de serial e data.
--
-- Varias emissoes por (projeto, vintage) sao possiveis de proposito: cada rodada
-- de verificacao gera um evento de emissao proprio, e agrupar tudo numa linha
-- por vintage impediria conciliar faixa de serial com o registro.

create table if not exists public.carbon_emissoes_credito (
  id               uuid primary key default gen_random_uuid(),
  projeto_id       uuid not null references public.carbon_projetos (id) on delete cascade,
  vintage          integer not null check (vintage between 1990 and 2100),
  quantidade_tco2e numeric(16,4) not null check (quantidade_tco2e >= 0),
  buffer_tco2e     numeric(16,4) not null default 0 check (buffer_tco2e >= 0),
  serial_inicio    text,
  serial_fim       text,
  data_emissao     date,
  observacoes      text,
  criado_por       uuid references public.carbon_usuarios (id),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),

  -- O buffer e parte do volume emitido, nao um valor a parte. Ver a nota longa
  -- em buffer_tco2e: e esta constraint que trava a convencao adotada.
  constraint carbon_emissoes_credito_buffer_dentro_chk check (
    buffer_tco2e <= quantidade_tco2e
  ),

  -- Faixa de serial completa ou ausente, nunca meia. Uma faixa com so uma ponta
  -- nao permite conciliar volume com o registro, que e a unica razao de guardar
  -- serial. Serial unico se registra com inicio = fim.
  constraint carbon_emissoes_credito_serial_par_chk check (
    (serial_inicio is null) = (serial_fim is null)
  ),

  constraint carbon_emissoes_credito_serial_tamanho_chk check (
    (serial_inicio is null or char_length(serial_inicio) <= 120)
    and (serial_fim is null or char_length(serial_fim) <= 120)
  )
);

comment on table public.carbon_emissoes_credito is
  'Evento de emissao de credito no registro: o que ENTROU no estoque do projeto. TABELA NAO OBSERVADA NO NOTION, inferida do padrao Verra - escopo da issue #15 aguardando validacao do dono. Varias linhas por (projeto, vintage) sao esperadas: cada rodada de verificacao emite separadamente, com faixa de serial propria.';
comment on column public.carbon_emissoes_credito.projeto_id is
  'Projeto que emitiu. ON DELETE CASCADE: apagar o projeto apaga suas emissoes.';
comment on column public.carbon_emissoes_credito.vintage is
  'Ano da safra do credito (vintage), ou seja o ano em que a reducao ou remocao aconteceu. NAO e o ano da emissao: credito de vintage 2022 pode ser emitido em 2025. E por vintage que o mercado precifica e que o estoque e conciliado, e por isso ele e dimensao obrigatoria aqui e em carbon_vendas.';
comment on column public.carbon_emissoes_credito.quantidade_tco2e is
  'Volume TOTAL emitido neste evento, em tCO2e, como consta no registro. INCLUI a parcela retida em buffer (ver buffer_tco2e).';
comment on column public.carbon_emissoes_credito.buffer_tco2e is
  'Parcela do volume emitido retida na conta de buffer de nao permanencia, e portanto NAO vendavel. CONVENCAO ADOTADA, QUE PRECISA DE ACEITE DO DONO: aqui o buffer esta DENTRO de quantidade_tco2e, logo disponivel = emitido - buffer - vendido. A convencao alternativa, tambem usada no mercado, e quantidade_tco2e ja liquida do buffer (o registro emite apenas o vendavel e deposita o buffer noutra conta); nesse caso a subtracao do buffer aqui contaria a mesma tonelada duas vezes. A constraint carbon_emissoes_credito_buffer_dentro_chk trava a convencao escolhida. O conceito de buffer ja e conhecido da equipe: aparece nos itens 24 e 27 do checklist da BeZero (docs/notion/12-be-zero.md).';
comment on column public.carbon_emissoes_credito.serial_inicio is
  'Primeiro serial da faixa emitida no registro. Texto, nunca numero: o serial do Verra e um bloco alfanumerico longo, com prefixo do registro e do projeto. Ver carbon_emissoes_credito_serial_par_chk.';
comment on column public.carbon_emissoes_credito.serial_fim is
  'Ultimo serial da faixa emitida. Serial unico se registra com inicio = fim.';
comment on column public.carbon_emissoes_credito.data_emissao is
  'Data da emissao no registro. Anulavel: emissao esperada pode ser registrada antes de a data sair.';
comment on column public.carbon_emissoes_credito.observacoes is
  'Anotacao interna sobre a emissao, em portugues. Nao registre dado pessoal (LGPD).';

create index if not exists carbon_emissoes_credito_projeto_vintage_idx
  on public.carbon_emissoes_credito (projeto_id, vintage);

create index if not exists carbon_emissoes_credito_data_idx
  on public.carbon_emissoes_credito (data_emissao);

-- Faixa de serial e unica no registro por definicao: duas linhas com a mesma
-- faixa significam lancamento em duplicidade, que inflaria o estoque em
-- silencio. Indice PARCIAL porque emissao sem serial ainda cadastrado e comum e
-- varias delas precisam conviver.
create unique index if not exists carbon_emissoes_credito_serial_uniq
  on public.carbon_emissoes_credito (serial_inicio, serial_fim)
  where serial_inicio is not null;


-- =============================================================================
-- 3. carbon_vendas - o que saiu do estoque
-- =============================================================================
-- NAO OBSERVADA NO NOTION. A base "Compradores" tem "Data de compra" no proprio
-- comprador, o que so funciona enquanto cada comprador compra uma vez. Aqui a
-- transacao e entidade propria, que e o item 2 das implicacoes do levantamento.

create table if not exists public.carbon_vendas (
  id                     uuid primary key default gen_random_uuid(),
  comprador_id           uuid not null references public.carbon_compradores (id) on delete restrict,
  projeto_id             uuid not null references public.carbon_projetos (id) on delete cascade,
  vintage                integer not null check (vintage between 1990 and 2100),
  quantidade_tco2e       numeric(16,4) not null check (quantidade_tco2e > 0),
  preco_unitario         numeric(14,4) check (preco_unitario is null or preco_unitario >= 0),
  moeda                  text not null default 'BRL' check (moeda in ('BRL', 'USD', 'EUR')),
  -- Coluna DERIVADA: nunca preencha a mao, o Postgres a mantem. Sem precisao
  -- declarada de proposito: o produto de numeric(16,4) por numeric(14,4) pode
  -- passar de 20 digitos inteiros, e um teto artificial aqui transformaria um
  -- valor grande demais em erro de escrita numa coluna que ninguem digitou.
  valor_total            numeric
                           generated always as (round(quantidade_tco2e * preco_unitario, 2)) stored,
  data                   date,
  contrato_documento_id  uuid references public.carbon_documentos (id) on delete set null,
  ajuste_correspondente  boolean not null default false,
  aposentado             boolean not null default false,
  data_aposentadoria     date,
  observacoes            text,
  criado_por             uuid references public.carbon_usuarios (id),
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now(),

  -- Data de aposentadoria sem aposentadoria e sempre contradicao. O inverso NAO
  -- e barrado de proposito: a equipe pode saber que o credito foi aposentado
  -- antes de ter em maos o extrato do registro com a data.
  constraint carbon_vendas_aposentadoria_coerente_chk check (
    aposentado or data_aposentadoria is null
  ),

  -- A aposentadoria acontece depois da transferencia, nunca antes da venda.
  constraint carbon_vendas_aposentadoria_apos_venda_chk check (
    data is null or data_aposentadoria is null or data_aposentadoria >= data
  )
);

comment on table public.carbon_vendas is
  'Transacao de venda de credito: o que SAIU do estoque. TABELA NAO OBSERVADA NO NOTION - escopo da issue #15 aguardando validacao do dono. Entidade separada do comprador de proposito: no Notion a data da compra estava no proprio comprador, o que so funciona enquanto cada comprador compra uma unica vez. E daqui que sai a resposta a pergunta que hoje ninguem consegue responder: quanto do estoque ja foi vendido.';
comment on column public.carbon_vendas.comprador_id is
  'Comprador. ON DELETE RESTRICT: venda registrada impede apagar o comprador. A venda e registro financeiro e nao pode virar orfa; para tirar o comprador das listagens use ativo = false.';
comment on column public.carbon_vendas.projeto_id is
  'Projeto que gerou o credito vendido. Junto com vintage, e a chave do estoque.';
comment on column public.carbon_vendas.vintage is
  'Vintage do credito vendido. Precisa casar com o vintage da emissao para o estoque fechar; quando nao ha emissao daquele vintage, a conciliacao marca sem_emissao (venda a termo, ou erro de digitacao no ano).';
comment on column public.carbon_vendas.quantidade_tco2e is
  'Volume vendido em tCO2e. Maior que zero: venda de zero tonelada nao existe, e devolucao ou cancelamento nao se registra com quantidade negativa (isso furaria toda a conciliacao). Se for preciso reverter uma venda, corrija ou remova a linha.';
comment on column public.carbon_vendas.preco_unitario is
  'Preco por tCO2e na moeda da coluna moeda. Anulavel: parte das transacoes tem preco sob confidencialidade ou ainda em negociacao, e exigir o valor levaria a inventar numero.';
comment on column public.carbon_vendas.moeda is
  'BRL, USD ou EUR. Nao ha conversao para moeda unica em lugar nenhum deste dominio, de proposito: converter exigiria taxa e data de referencia, que sao decisao contabil e nao existem no sistema. A receita e sempre somada POR MOEDA.';
comment on column public.carbon_vendas.valor_total is
  'quantidade_tco2e * preco_unitario, arredondado em 2 casas. Coluna GERADA pelo Postgres: nao aceita escrita e nunca divergira das duas parcelas. NULL quando nao ha preco.';
comment on column public.carbon_vendas.data is
  'Data da transacao. Anulavel enquanto o contrato nao esta assinado.';
comment on column public.carbon_vendas.contrato_documento_id is
  'Contrato que ampara a venda (ERPA ou equivalente), em carbon_documentos. ON DELETE SET NULL: apagar o documento nao apaga a venda. Vinculo direto e nao carbon_documento_vinculos porque aqui a relacao e um para um e obrigatoriamente unica na leitura da venda; o vinculo generico continua disponivel para anexar o resto da papelada.';
comment on column public.carbon_vendas.ajuste_correspondente is
  'true quando houve ajuste correspondente (corresponding adjustment) sob o Artigo 6 do Acordo de Paris para esta venda. Item 12 do checklist da BeZero (docs/notion/12-be-zero.md). Venda para comprador de outro pais levanta a questao; ver public.carbon_venda_ajuste_pendente, que e o que a tela usa para cobrar.';
comment on column public.carbon_vendas.aposentado is
  'true quando o credito vendido ja foi aposentado (retirement) no registro. ATENCAO NA CONTA DO ESTOQUE: aposentado e SUBCONJUNTO de vendido, nao uma saida adicional. O credito e aposentado depois de transferido ao comprador, portanto subtrair vendido e aposentado do emitido contaria a mesma tonelada duas vezes.';
comment on column public.carbon_vendas.data_aposentadoria is
  'Data da aposentadoria no registro. So existe quando aposentado = true (ver carbon_vendas_aposentadoria_coerente_chk). A Edge Function marca aposentado = true automaticamente quando recebe uma data, para os dois campos nao se contradizerem.';
comment on column public.carbon_vendas.observacoes is
  'Anotacao interna sobre a transacao, em portugues. Nao registre dado pessoal (LGPD) nem o nome de comprador sigiloso.';

create index if not exists carbon_vendas_projeto_vintage_idx
  on public.carbon_vendas (projeto_id, vintage);

create index if not exists carbon_vendas_comprador_idx
  on public.carbon_vendas (comprador_id);

create index if not exists carbon_vendas_data_idx
  on public.carbon_vendas (data);

create index if not exists carbon_vendas_contrato_idx
  on public.carbon_vendas (contrato_documento_id)
  where contrato_documento_id is not null;


-- =============================================================================
-- 4. Trigger de atualizado_em (uma funcao para as tres tabelas)
-- =============================================================================
-- Uma funcao so, e nao tres identicas: ela nao referencia tabela nenhuma, so
-- mexe em NEW.atualizado_em. Mesmo caminho dos dominios de findings e de
-- fornecedores.

create or replace function public.carbon_credito_set_atualizado_em()
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

comment on function public.carbon_credito_set_atualizado_em() is
  'Mantem atualizado_em em dia a cada UPDATE nas tres tabelas do dominio de credito (carbon_compradores, carbon_emissoes_credito, carbon_vendas). Uma funcao serve as tres porque nao referencia tabela: so escreve NEW.atualizado_em.';

drop trigger if exists carbon_compradores_atualizado_em on public.carbon_compradores;
create trigger carbon_compradores_atualizado_em
  before update on public.carbon_compradores
  for each row
  execute function public.carbon_credito_set_atualizado_em();

drop trigger if exists carbon_emissoes_credito_atualizado_em on public.carbon_emissoes_credito;
create trigger carbon_emissoes_credito_atualizado_em
  before update on public.carbon_emissoes_credito
  for each row
  execute function public.carbon_credito_set_atualizado_em();

drop trigger if exists carbon_vendas_atualizado_em on public.carbon_vendas;
create trigger carbon_vendas_atualizado_em
  before update on public.carbon_vendas
  for each row
  execute function public.carbon_credito_set_atualizado_em();


-- =============================================================================
-- 5. Ajuste correspondente pendente - a regra escrita UMA vez
-- =============================================================================
-- Item 12 do checklist da BeZero (Letter of Authorisation / Corresponding
-- adjustments, Artigo 6 do Acordo de Paris). A regra: venda para comprador de
-- pais DIFERENTE do pais do projeto levanta a questao do ajuste correspondente,
-- e enquanto o ajuste nao esta registrado a venda fica pendente.
--
-- Em funcao, e nao repetida nas views, porque tres lugares a consultam (a view
-- de vendas, a view de estoque e a conciliacao) e uma quarta copia divergente e
-- questao de tempo. O frontend replica a MESMA regra em ajustePendente() de
-- src/lib/api/credito.js e src/lib/demo/credito.js, para a tela nao precisar
-- perguntar ao servidor a cor de cada linha - mudar aqui exige mudar la.
--
-- PAIS DESCONHECIDO NAO GERA PENDENCIA, de proposito: afirmar "falta ajuste
-- correspondente" porque o cadastro do comprador esta incompleto e cobrar a
-- coisa errada. O que falta nesse caso e o pais, e a tela cobra isso a parte.

create or replace function public.carbon_venda_ajuste_pendente(
  p_pais_comprador text,
  p_pais_projeto   text,
  p_ajuste         boolean
)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when coalesce(p_ajuste, false)                                then false
    when p_pais_comprador is null or btrim(p_pais_comprador) = '' then false
    when p_pais_projeto   is null or btrim(p_pais_projeto)   = '' then false
    when lower(btrim(p_pais_comprador)) = lower(btrim(p_pais_projeto)) then false
    else true
  end;
$$;

comment on function public.carbon_venda_ajuste_pendente(text, text, boolean) is
  'true quando a venda e internacional (pais do comprador diferente do pais do projeto) e o ajuste correspondente sob o Artigo 6 do Acordo de Paris AINDA NAO foi registrado. Item 12 do checklist da BeZero. Pais ausente em qualquer das duas pontas devolve false de proposito: cadastro incompleto nao e pendencia de ajuste, e a tela cobra o pais separadamente. A comparacao ignora caixa e espacos nas pontas, mas NAO conhece sinonimo de pais (Brasil e Brazil sao diferentes aqui): normalizar nome de pais e assunto de uma tabela de referencia que este dominio nao tem. A mesma regra existe em ajustePendente() no frontend; mudar uma exige mudar a outra.';


-- =============================================================================
-- 6. Views
-- =============================================================================
-- DROP antes de CREATE, e nao "create or replace view": replace exige a MESMA
-- lista de colunas, na mesma ordem, entao acrescentar uma coluna numa revisao
-- desta migration faria a reaplicacao falhar. Com drop na ordem inversa das
-- dependencias, o arquivo continua idempotente.
--
-- security_invoker = true em todas: sem isso a view roda com os privilegios do
-- dono e passaria por cima da RLS das tabelas de baixo.
--
-- O QUE AS VIEWS NAO FAZEM: mascarar o nome do comprador sigiloso. O mascaramento
-- depende do PAPEL de quem chamou, e no banco quem chama e sempre o service_role
-- da Edge Function. Por isso ele acontece em rotas/credito.ts, no unico ponto por
-- onde o dado sai para o navegador. A view carbon_compradores_listagem faz a
-- parte que E estrutural: nao ter a coluna email.

drop view if exists public.carbon_estoque_credito;
drop view if exists public.carbon_vendas_detalhe;
drop view if exists public.carbon_emissoes_detalhe;
drop view if exists public.carbon_compradores_listagem;


-- 6.1 Compradores com os agregados de venda, SEM e-mail ------------------------
-- A ausencia da coluna email aqui e a metade estrutural da protecao de dado
-- pessoal: a rota de listagem le esta view, portanto nao existe select mal
-- escrito capaz de vazar o contato. Em lugar dele vai o booleano tem_email.

create view public.carbon_compradores_listagem
  with (security_invoker = true)
as
select
  c.id,
  c.nome,
  c.pais,
  c.status,
  c.recorrente,
  c.sigiloso,
  c.observacoes,
  c.ativo,
  c.criado_em,
  c.atualizado_em,
  (c.email is not null)                    as tem_email,
  coalesce(v.vendas, 0)                    as vendas,
  coalesce(v.projetos, 0)                  as projetos,
  coalesce(v.volume_tco2e, 0)              as volume_tco2e,
  coalesce(v.aposentado_tco2e, 0)          as aposentado_tco2e,
  coalesce(v.receita_brl, 0)               as receita_brl,
  coalesce(v.receita_usd, 0)               as receita_usd,
  coalesce(v.receita_eur, 0)               as receita_eur,
  coalesce(v.vendas_sem_preco, 0)          as vendas_sem_preco,
  coalesce(v.vendas_ajuste_pendente, 0)    as vendas_ajuste_pendente,
  v.primeira_venda,
  v.ultima_venda
from public.carbon_compradores c
left join (
  select
    ve.comprador_id,
    count(*)::integer                                   as vendas,
    count(distinct ve.projeto_id)::integer              as projetos,
    coalesce(sum(ve.quantidade_tco2e), 0)               as volume_tco2e,
    coalesce(sum(ve.quantidade_tco2e) filter (where ve.aposentado), 0) as aposentado_tco2e,
    coalesce(sum(ve.valor_total) filter (where ve.moeda = 'BRL'), 0)   as receita_brl,
    coalesce(sum(ve.valor_total) filter (where ve.moeda = 'USD'), 0)   as receita_usd,
    coalesce(sum(ve.valor_total) filter (where ve.moeda = 'EUR'), 0)   as receita_eur,
    (count(*) filter (where ve.preco_unitario is null))::integer       as vendas_sem_preco,
    (count(*) filter (
      where public.carbon_venda_ajuste_pendente(cc.pais, pr.pais, ve.ajuste_correspondente)
    ))::integer                                                        as vendas_ajuste_pendente,
    min(ve.data)                                        as primeira_venda,
    max(ve.data)                                        as ultima_venda
  from public.carbon_vendas ve
  join public.carbon_compradores cc on cc.id = ve.comprador_id
  join public.carbon_projetos pr    on pr.id = ve.projeto_id
  group by ve.comprador_id
) v on v.comprador_id = c.id;

comment on view public.carbon_compradores_listagem is
  'Compradores com os agregados de venda prontos para a listagem: volume, aposentado, receita POR MOEDA (nunca convertida), vendas sem preco e vendas com ajuste correspondente pendente. NAO TEM a coluna email, e essa ausencia e proposital: a rota de listagem le esta view, portanto o contato nao escapa por select mal escrito (em lugar dele vai tem_email). A view NAO mascara o nome de comprador sigiloso - isso depende do papel de quem chamou e acontece na Edge Function.';


-- 6.2 Emissoes com o projeto resolvido -----------------------------------------

create view public.carbon_emissoes_detalhe
  with (security_invoker = true)
as
select
  e.id,
  e.projeto_id,
  e.vintage,
  e.quantidade_tco2e,
  e.buffer_tco2e,
  -- Vendavel do EVENTO de emissao. Nao e o disponivel do vintage: aqui nao entra
  -- venda nenhuma, porque venda e por (projeto, vintage) e nao por evento - nao
  -- existe forma de saber de qual emissao saiu cada tonelada vendida.
  (e.quantidade_tco2e - e.buffer_tco2e) as vendavel_tco2e,
  e.serial_inicio,
  e.serial_fim,
  e.data_emissao,
  e.observacoes,
  e.criado_por,
  e.criado_em,
  e.atualizado_em,
  p.nome        as projeto_nome,
  p.registro_id as projeto_registro_id,
  p.pais        as projeto_pais,
  p.standard    as projeto_standard
from public.carbon_emissoes_credito e
join public.carbon_projetos p on p.id = e.projeto_id;

comment on view public.carbon_emissoes_detalhe is
  'Emissoes de credito com nome, ID de registro e pais do projeto resolvidos, mais vendavel_tco2e (emitido menos buffer) do proprio evento. vendavel_tco2e NAO desconta venda: venda e por (projeto, vintage) e nao por evento de emissao, portanto quem responde disponibilidade e a view carbon_estoque_credito.';


-- 6.3 Vendas com comprador, projeto e a pendencia de ajuste -------------------

create view public.carbon_vendas_detalhe
  with (security_invoker = true)
as
select
  v.id,
  v.comprador_id,
  v.projeto_id,
  v.vintage,
  v.quantidade_tco2e,
  v.preco_unitario,
  v.moeda,
  v.valor_total,
  v.data,
  v.contrato_documento_id,
  v.ajuste_correspondente,
  v.aposentado,
  v.data_aposentadoria,
  v.observacoes,
  v.criado_por,
  v.criado_em,
  v.atualizado_em,
  c.nome       as comprador_nome,
  c.pais       as comprador_pais,
  c.status     as comprador_status,
  c.recorrente as comprador_recorrente,
  c.sigiloso   as comprador_sigiloso,
  c.ativo      as comprador_ativo,
  p.nome        as projeto_nome,
  p.registro_id as projeto_registro_id,
  p.pais        as projeto_pais,
  d.titulo      as contrato_titulo,
  d.url_externa as contrato_url,
  -- Regra do Artigo 6 numa coluna, para a tela nao recalcular nada.
  public.carbon_venda_ajuste_pendente(c.pais, p.pais, v.ajuste_correspondente) as ajuste_pendente,
  -- Internacional independe de haver ajuste: e o que explica POR QUE a pendencia
  -- existe (ou por que ela desapareceu depois de marcar o ajuste).
  public.carbon_venda_ajuste_pendente(c.pais, p.pais, false) as venda_internacional
from public.carbon_vendas v
join public.carbon_compradores c on c.id = v.comprador_id
join public.carbon_projetos p    on p.id = v.projeto_id
left join public.carbon_documentos d on d.id = v.contrato_documento_id;

comment on view public.carbon_vendas_detalhe is
  'Vendas com comprador, projeto e contrato resolvidos, mais ajuste_pendente e venda_internacional calculados por public.carbon_venda_ajuste_pendente. ATENCAO: a coluna comprador_nome sai CRUA daqui; quem mascara comprador sigiloso e a Edge Function, que e o unico caminho entre esta view e o navegador. Nao aponte nenhuma outra saida de dados para esta view sem repetir o mascaramento.';


-- 6.4 Estoque por projeto e vintage - a resposta que hoje nao existe ----------
-- "Quanto do estoque ja foi vendido" e a pergunta que o levantamento registra
-- como impossivel de responder hoje. Esta view e a resposta, com os cinco
-- numeros da issue #15: emitido, vendido, aposentado, buffer e disponivel.
--
-- AS DUAS ARMADILHAS DA CONTA, escritas aqui porque ninguem le comentario de
-- coluna antes de mexer numa formula:
--
--   1. disponivel = emitido - buffer - vendido. O aposentado NAO entra: ele e
--      subconjunto do vendido (aposenta-se depois de transferir ao comprador).
--      Subtrair os dois contaria a mesma tonelada duas vezes.
--   2. A chave (projeto, vintage) vem da UNIAO das duas tabelas, e nao de um
--      LEFT JOIN a partir das emissoes. Venda a termo de vintage ainda nao
--      emitido e legitima e precisa APARECER; num left join a partir das
--      emissoes ela simplesmente nao existiria, e o estoque mentiria por
--      omissao - exatamente o silencio que este dominio existe para acabar.

create view public.carbon_estoque_credito
  with (security_invoker = true)
as
with chaves as (
  select projeto_id, vintage from public.carbon_emissoes_credito
  union
  select projeto_id, vintage from public.carbon_vendas
),
emissoes as (
  select
    e.projeto_id,
    e.vintage,
    count(*)::integer                     as emissoes,
    coalesce(sum(e.quantidade_tco2e), 0)  as emitido_tco2e,
    coalesce(sum(e.buffer_tco2e), 0)      as buffer_tco2e,
    min(e.data_emissao)                   as primeira_emissao,
    max(e.data_emissao)                   as ultima_emissao,
    (count(*) filter (where e.serial_inicio is null))::integer as emissoes_sem_serial
  from public.carbon_emissoes_credito e
  group by e.projeto_id, e.vintage
),
vendas as (
  select
    v.projeto_id,
    v.vintage,
    count(*)::integer                        as vendas,
    count(distinct v.comprador_id)::integer  as compradores,
    coalesce(sum(v.quantidade_tco2e), 0)     as vendido_tco2e,
    coalesce(sum(v.quantidade_tco2e) filter (where v.aposentado), 0) as aposentado_tco2e,
    coalesce(sum(v.valor_total) filter (where v.moeda = 'BRL'), 0)   as receita_brl,
    coalesce(sum(v.valor_total) filter (where v.moeda = 'USD'), 0)   as receita_usd,
    coalesce(sum(v.valor_total) filter (where v.moeda = 'EUR'), 0)   as receita_eur,
    (count(*) filter (
      where public.carbon_venda_ajuste_pendente(c.pais, p.pais, v.ajuste_correspondente)
    ))::integer                              as vendas_ajuste_pendente,
    min(v.data)                              as primeira_venda,
    max(v.data)                              as ultima_venda
  from public.carbon_vendas v
  join public.carbon_compradores c on c.id = v.comprador_id
  join public.carbon_projetos p    on p.id = v.projeto_id
  group by v.projeto_id, v.vintage
)
select
  k.projeto_id,
  k.vintage,
  p.nome        as projeto_nome,
  p.registro_id as projeto_registro_id,
  p.pais        as projeto_pais,
  p.standard    as projeto_standard,
  p.ativo       as projeto_ativo,

  coalesce(e.emissoes, 0)          as emissoes,
  coalesce(e.emitido_tco2e, 0)     as emitido_tco2e,
  coalesce(e.buffer_tco2e, 0)      as buffer_tco2e,
  coalesce(v.vendas, 0)            as vendas,
  coalesce(v.compradores, 0)       as compradores,
  coalesce(v.vendido_tco2e, 0)     as vendido_tco2e,
  coalesce(v.aposentado_tco2e, 0)  as aposentado_tco2e,

  -- Vendavel: o que a emissao entregou fora do buffer. E o DENOMINADOR do
  -- percentual vendido, e nao o emitido cheio: o buffer nunca esteve a venda.
  (coalesce(e.emitido_tco2e, 0) - coalesce(e.buffer_tco2e, 0)) as vendavel_tco2e,

  (coalesce(e.emitido_tco2e, 0) - coalesce(e.buffer_tco2e, 0) - coalesce(v.vendido_tco2e, 0))
    as disponivel_tco2e,

  case
    when coalesce(e.emitido_tco2e, 0) - coalesce(e.buffer_tco2e, 0) <= 0 then null
    else round(
      coalesce(v.vendido_tco2e, 0) * 100.0
        / (coalesce(e.emitido_tco2e, 0) - coalesce(e.buffer_tco2e, 0)),
      1
    )
  end as vendido_pct,

  coalesce(v.receita_brl, 0)            as receita_brl,
  coalesce(v.receita_usd, 0)            as receita_usd,
  coalesce(v.receita_eur, 0)            as receita_eur,
  coalesce(v.vendas_ajuste_pendente, 0) as vendas_ajuste_pendente,
  coalesce(e.emissoes_sem_serial, 0)    as emissoes_sem_serial,

  e.primeira_emissao,
  e.ultima_emissao,
  v.primeira_venda,
  v.ultima_venda,

  -- Vendido acima do vendavel. Nao e proibido no banco (venda a termo existe),
  -- mas e o alerta central da tela de estoque.
  (coalesce(e.emitido_tco2e, 0) - coalesce(e.buffer_tco2e, 0) - coalesce(v.vendido_tco2e, 0) < 0)
    as sobrevendido,
  -- Venda sem nenhuma emissao no vintage: venda a termo, ou ano digitado errado.
  (coalesce(e.emissoes, 0) = 0 and coalesce(v.vendas, 0) > 0) as sem_emissao,
  -- Emissao sem venda nenhuma: estoque parado, que e informacao comercial.
  (coalesce(v.vendas, 0) = 0 and coalesce(e.emissoes, 0) > 0) as sem_venda
from chaves k
join public.carbon_projetos p on p.id = k.projeto_id
left join emissoes e on e.projeto_id = k.projeto_id and e.vintage = k.vintage
left join vendas   v on v.projeto_id = k.projeto_id and v.vintage = k.vintage;

comment on view public.carbon_estoque_credito is
  'Estoque de credito por PROJETO e VINTAGE, com os cinco numeros da issue #15: emitido, buffer, vendido, aposentado e disponivel (= emitido - buffer - vendido). DUAS REGRAS QUE NAO PODEM SER MEXIDAS SEM LER OS COMENTARIOS DA MIGRATION: (1) aposentado e subconjunto de vendido e por isso NAO e subtraido de novo; (2) a chave (projeto, vintage) vem da UNIAO de emissoes e vendas, para venda a termo de vintage ainda nao emitido aparecer em vez de desaparecer. Traz tambem vendido_pct sobre o vendavel (nunca sobre o emitido cheio, porque o buffer nunca esteve a venda), receita por moeda e as tres bandeiras de conciliacao: sobrevendido, sem_emissao e sem_venda.';


-- =============================================================================
-- 7. Conciliacao agregada
-- =============================================================================
-- Contrapartida da view: a view responde por linha, esta funcao responde pelo
-- CONJUNTO (um projeto, ou todos). Existe em SQL, e nao somando na Edge Function
-- ou na tela, pelo mesmo motivo de sempre neste projeto: a conta precisa de UMA
-- implementacao. O dataset de demonstracao do frontend replica exatamente estas
-- formulas (src/lib/demo/credito.js) para a revisao nao ver numero que a
-- producao nunca produz.
--
-- NUNCA devolve NULL: conjunto vazio devolve zeros e listas vazias.

create or replace function public.carbon_estoque_conciliacao(
  p_projeto_id uuid    default null,
  p_vintage    integer default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select *
      from public.carbon_estoque_credito ec
     where (p_projeto_id is null or ec.projeto_id = p_projeto_id)
       and (p_vintage    is null or ec.vintage    = p_vintage)
  ),
  totais as (
    select
      count(*)::integer                          as linhas,
      count(distinct projeto_id)::integer        as projetos,
      count(distinct vintage)::integer           as vintages,
      coalesce(sum(emitido_tco2e), 0)            as emitido_tco2e,
      coalesce(sum(buffer_tco2e), 0)             as buffer_tco2e,
      coalesce(sum(vendavel_tco2e), 0)           as vendavel_tco2e,
      coalesce(sum(vendido_tco2e), 0)            as vendido_tco2e,
      coalesce(sum(aposentado_tco2e), 0)         as aposentado_tco2e,
      coalesce(sum(disponivel_tco2e), 0)         as disponivel_tco2e,
      coalesce(sum(emissoes), 0)::integer        as emissoes,
      coalesce(sum(vendas), 0)::integer          as vendas,
      coalesce(sum(receita_brl), 0)              as receita_brl,
      coalesce(sum(receita_usd), 0)              as receita_usd,
      coalesce(sum(receita_eur), 0)              as receita_eur,
      coalesce(sum(vendas_ajuste_pendente), 0)::integer as vendas_ajuste_pendente,
      (count(*) filter (where sobrevendido))::integer   as linhas_sobrevendidas,
      (count(*) filter (where sem_emissao))::integer    as linhas_sem_emissao,
      (count(*) filter (where sem_venda))::integer      as linhas_sem_venda
      from base
  )
  select jsonb_build_object(
    'linhas',            t.linhas,
    'projetos',          t.projetos,
    'vintages',          t.vintages,
    'emissoes',          t.emissoes,
    'vendas',            t.vendas,
    'emitido_tco2e',     t.emitido_tco2e,
    'buffer_tco2e',      t.buffer_tco2e,
    'vendavel_tco2e',    t.vendavel_tco2e,
    'vendido_tco2e',     t.vendido_tco2e,
    'aposentado_tco2e',  t.aposentado_tco2e,
    'disponivel_tco2e',  t.disponivel_tco2e,
    -- Guarda contra divisao por zero: sem nada vendavel o percentual e nulo, e
    -- nao zero. Zero afirmaria "nada vendido de um estoque que existe", e o caso
    -- e "nao existe estoque a vender".
    'vendido_pct', case
                     when t.vendavel_tco2e <= 0 then null
                     else round(t.vendido_tco2e * 100.0 / t.vendavel_tco2e, 1)
                   end,
    'aposentado_pct', case
                       when t.vendido_tco2e <= 0 then null
                       else round(t.aposentado_tco2e * 100.0 / t.vendido_tco2e, 1)
                     end,
    'receita', jsonb_build_object(
      'BRL', t.receita_brl,
      'USD', t.receita_usd,
      'EUR', t.receita_eur
    ),
    'alertas', jsonb_build_object(
      'sobrevendido',           t.linhas_sobrevendidas,
      'sem_emissao',            t.linhas_sem_emissao,
      'sem_venda',              t.linhas_sem_venda,
      'vendas_ajuste_pendente', t.vendas_ajuste_pendente
    ),
    'por_vintage', coalesce((
      select jsonb_agg(jsonb_build_object(
               'vintage',          pv.vintage,
               'emitido_tco2e',    pv.emitido_tco2e,
               'buffer_tco2e',     pv.buffer_tco2e,
               'vendavel_tco2e',   pv.vendavel_tco2e,
               'vendido_tco2e',    pv.vendido_tco2e,
               'aposentado_tco2e', pv.aposentado_tco2e,
               'disponivel_tco2e', pv.disponivel_tco2e
             ) order by pv.vintage)
        from (
          select
            vintage,
            sum(emitido_tco2e)    as emitido_tco2e,
            sum(buffer_tco2e)     as buffer_tco2e,
            sum(vendavel_tco2e)   as vendavel_tco2e,
            sum(vendido_tco2e)    as vendido_tco2e,
            sum(aposentado_tco2e) as aposentado_tco2e,
            sum(disponivel_tco2e) as disponivel_tco2e
          from base
          group by vintage
        ) pv
    ), '[]'::jsonb)
  )
  from totais t;
$$;

comment on function public.carbon_estoque_conciliacao(uuid, integer) is
  'Conciliacao agregada do estoque de credito em jsonb: emitido, buffer, vendavel, vendido, aposentado e disponivel do conjunto, percentual vendido sobre o VENDAVEL, receita por moeda (nunca convertida), a quebra por vintage e as quatro bandeiras de alerta (sobrevendido, sem_emissao, sem_venda, vendas_ajuste_pendente). Filtros opcionais por projeto e por vintage. Nunca devolve NULL: conjunto vazio devolve zeros e listas vazias. vendido_pct e aposentado_pct vem NULL quando o denominador e zero, de proposito: zero afirmaria que nada foi vendido de um estoque existente, quando o caso e nao haver estoque.';


-- =============================================================================
-- 8. Privilegios
-- =============================================================================
-- Mesma disciplina do resto do projeto: RLS ligada em TODAS as tabelas e NENHUMA
-- policy. Ninguem le nem escreve com a anon key; quem entra e a Edge Function
-- carbon-api com a service_role, depois de validar o ID token do Azure AD, o
-- dominio do e-mail e o papel.
--
-- Aqui isso vale duas vezes: com uma policy de leitura para authenticated, o
-- nome do comprador sob NDA sairia direto pelo /rest/v1 sem passar pelo
-- mascaramento da Edge Function - o sigilo por linha seria contornado por uma
-- unica linha de SQL bem intencionada.

alter table public.carbon_compradores enable row level security;
revoke all on table public.carbon_compradores from anon, authenticated;
grant all on table public.carbon_compradores to service_role;

alter table public.carbon_emissoes_credito enable row level security;
revoke all on table public.carbon_emissoes_credito from anon, authenticated;
grant all on table public.carbon_emissoes_credito to service_role;

alter table public.carbon_vendas enable row level security;
revoke all on table public.carbon_vendas from anon, authenticated;
grant all on table public.carbon_vendas to service_role;

-- Views nao tem RLS propria. security_invoker = true faz valer a RLS das tabelas
-- de baixo, e o revoke abaixo tira o privilegio que o Supabase concede por
-- default privileges do schema public a anon e authenticated.
revoke all on public.carbon_compradores_listagem from anon, authenticated;
revoke all on public.carbon_emissoes_detalhe     from anon, authenticated;
revoke all on public.carbon_vendas_detalhe       from anon, authenticated;
revoke all on public.carbon_estoque_credito      from anon, authenticated;

grant select on public.carbon_compradores_listagem to service_role;
grant select on public.carbon_emissoes_detalhe     to service_role;
grant select on public.carbon_vendas_detalhe       to service_role;
grant select on public.carbon_estoque_credito      to service_role;

-- O PostgreSQL concede EXECUTE a PUBLIC em toda funcao nova. Em
-- carbon_estoque_conciliacao, que e SECURITY DEFINER, isso exporia a leitura do
-- estoque pela anon key via /rest/v1/rpc, contornando a RLS.
revoke all on function public.carbon_estoque_conciliacao(uuid, integer)
  from public, anon, authenticated;
revoke all on function public.carbon_venda_ajuste_pendente(text, text, boolean)
  from public, anon, authenticated;
revoke all on function public.carbon_credito_set_atualizado_em()
  from public, anon, authenticated;

grant execute on function public.carbon_estoque_conciliacao(uuid, integer)      to service_role;
grant execute on function public.carbon_venda_ajuste_pendente(text, text, boolean) to service_role;
grant execute on function public.carbon_credito_set_atualizado_em()             to service_role;


-- =============================================================================
-- 9. NENHUM SEED
-- =============================================================================
-- Comprador, emissao e venda sao dado comercial confidencial. O levantamento
-- registra que o unico comprador cadastrado no Notion esta sob NDA e que o
-- e-mail nao foi transcrito (docs/notion/14-compradores.md), portanto nome de
-- comprador, volume, preco e faixa de serial nao entram em migration, issue,
-- comentario nem commit. Nao ha template publico a semear aqui, ao contrario do
-- checklist de evidencias ou dos capitulos do PDD.
--
-- Para revisar a tela sem banco existe o dataset ficticio de
-- src/lib/demo/credito.js, obviamente ficticio e nunca embarcado em producao.


-- =============================================================================
-- 10. Conferencia
-- =============================================================================
-- Notices e warnings, nunca excecao: a migration nao deve falhar por causa de
-- ajuste legitimo feito pelo dono no SQL Editor. As asserts existem porque a
-- conta do estoque e a regra do ajuste correspondente sao o CENTRO da issue #15:
-- se quebrarem, o lugar de descobrir e aqui, no push, e nao na tela de estoque
-- com um numero errado que ninguem sabe conferir.

do $$
declare
  v_views integer;
  v_conc  jsonb;
begin
  select count(*) into v_views
    from pg_views
   where schemaname = 'public'
     and viewname in (
       'carbon_compradores_listagem',
       'carbon_emissoes_detalhe',
       'carbon_vendas_detalhe',
       'carbon_estoque_credito'
     );

  raise notice 'Dominio de credito: 3 tabelas e % de 4 views no lugar.', v_views;

  if v_views <> 4 then
    raise warning 'ATENCAO: esperadas 4 views do dominio de credito, encontradas %.', v_views;
  end if;

  -- Ajuste correspondente: os quatro casos da regra do Artigo 6.
  if public.carbon_venda_ajuste_pendente('Alemanha', 'Brasil', false) is not true then
    raise warning 'ATENCAO: venda internacional sem ajuste deveria estar pendente.';
  end if;
  if public.carbon_venda_ajuste_pendente('Alemanha', 'Brasil', true) is not false then
    raise warning 'ATENCAO: venda com ajuste registrado nao pode estar pendente.';
  end if;
  if public.carbon_venda_ajuste_pendente('brasil ', 'Brasil', false) is not false then
    raise warning 'ATENCAO: venda domestica nao pode gerar pendencia de ajuste (comparacao ignora caixa e espacos).';
  end if;
  if public.carbon_venda_ajuste_pendente(null, 'Brasil', false) is not false then
    raise warning 'ATENCAO: pais do comprador ausente nao deve gerar pendencia de ajuste.';
  end if;

  -- Conciliacao de conjunto vazio: precisa devolver zeros, nunca NULL. Um NULL
  -- aqui viraria "-" em toda a tela de estoque no primeiro acesso.
  select public.carbon_estoque_conciliacao(
           '00000000-0000-0000-0000-000000000000'::uuid, null) into v_conc;
  if v_conc is null or (v_conc->>'emitido_tco2e') is distinct from '0' then
    raise warning 'ATENCAO: carbon_estoque_conciliacao deveria devolver zeros para conjunto vazio, devolveu %.',
      coalesce(v_conc::text, 'NULL');
  end if;
  if (v_conc->'por_vintage') is distinct from '[]'::jsonb then
    raise warning 'ATENCAO: por_vintage deveria ser lista vazia em conjunto vazio.';
  end if;

  raise notice 'ESCOPO DA ISSUE #15 (estoque e comercializacao de credito) AGUARDA VALIDACAO DO DONO: carbon_emissoes_credito e carbon_vendas nao foram observadas no Notion, e a convencao do buffer (dentro do emitido) muda o numero de disponivel.';
end $$;

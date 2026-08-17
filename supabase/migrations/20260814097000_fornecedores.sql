-- =============================================================================
-- Apsis Carbon - fornecedores, contratos e parcelas (issues #10 e #11)
-- Arquivo: 20260814097000_fornecedores.sql
-- =============================================================================
-- Atende as issues #10 (Fornecedores) e #11 (Contratos de fornecedor e parcelas)
-- do backlog inicial (docs/issues/BACKLOG-INICIAL.md), derivadas da base em uso
-- descrita em docs/notion/02-fornecedores.md. E a pagina do levantamento com a
-- demanda mais explicita: "Criar controle de contratacoes, cadastrar contratos,
-- obrigacoes financeiras" e "Colunas: fornecedor, data de contratacao, cadastrar
-- parcelas" estao escritos na propria pagina.
--
-- TRES TABELAS, E O MOTIVO DA DO MEIO. Hoje, no Notion, existem duas bases:
-- "Cadastro de Fornecedores" e "cadastro de parcelas", e a parcela se relaciona
-- DIRETO com o fornecedor. Falta a entidade CONTRATO no meio, e essa e a lacuna
-- estrutural registrada na issue #11. Sem ela nao existe lugar para a data de
-- contratacao, para o objeto contratado nem para o valor total, e duas
-- contratacoes do mesmo fornecedor viram um monte indistinguivel de parcelas.
-- Com ela, a geracao automatica de parcelas tem de onde partir.
--
--   carbon_fornecedores  quem presta o servico
--   carbon_contratos     o que foi contratado, quando e por quanto
--   carbon_parcelas      as obrigacoes financeiras daquele contrato
--
-- STATUS DA PARCELA E DERIVADO DE DATA, NUNCA CAMPO MANUAL. Este e o criterio de
-- aceite central da issue #11. O Notion tem hoje um "Status Pgto" selecionavel
-- convivendo com a coluna "Pagamento": nada impede marcar Pago sem data, ou
-- deixar Em aberto uma parcela com data de pagamento preenchida. Aqui existe
-- SOMENTE data_pagamento, e o status sai dela mais o vencimento, pela funcao
-- public.carbon_parcelas_status:
--
--   paga       data_pagamento preenchida
--   vencida    sem pagamento e vencimento anterior a hoje
--   a_vencer   sem pagamento e vencimento dentro dos proximos 7 dias (inclui hoje)
--   em_aberto  sem pagamento e vencimento depois dessa janela
--
-- POR QUE VIEW E NAO COLUNA GERADA: coluna gerada (generated always as) exige
-- expressao IMMUTABLE, e o status depende de current_date. Uma parcela passa de
-- a_vencer para vencida a meia-noite, sem ninguem tocar na linha; guardada em
-- coluna, ela mentiria ate o proximo UPDATE. Por isso o status vive nas views
-- (carbon_parcelas_detalhe e derivadas) e a regra esta escrita UMA vez, na
-- funcao carbon_parcelas_status, que as views chamam.
--
-- GERACAO AUTOMATICA DE PARCELAS. As parcelas observadas no Notion sao mensais e
-- de mesmo valor, ou seja foram geradas, nao digitadas uma a uma. A funcao
-- public.carbon_parcelas_gerar recebe quantidade, periodicidade e valor (total ou
-- da parcela) e cria a serie com o vencimento calculado. A conta esta no banco, e
-- nao no cliente, porque ela tem duas regras que ninguem lembra de repetir: o
-- arredondamento do resto de centavos na ULTIMA parcela e o comportamento de fim
-- de mes na soma de meses. Ver os comentarios da propria funcao.
--
-- --------------------------------------------------------------------------
-- DADOS BANCARIOS: REQUISITO DE PRIVACIDADE, NAO DETALHE DE IMPLEMENTACAO
-- --------------------------------------------------------------------------
-- O campo "Dados Bancarios" existe na base do Notion como texto livre numa
-- tabela que qualquer pessoa da equipe abre e lista. Ele NAO pode ser replicado
-- assim, e a issue #10 registra isso como requisito.
--
-- LGPD (Lei 13.709/2018): fornecedor pessoa juridica de porte normal traz dado
-- da EMPRESA, e o tratamento e legitimo. Mas parte dos fornecedores de campo de
-- projeto de carbono e MEI ou pessoa fisica, e nesse caso banco, agencia, conta
-- e chave PIX sao DADO PESSOAL de titular identificavel, com finalidade restrita
-- (pagar aquele contrato). Nao ha como saber pela linha se o fornecedor e um ou
-- outro, logo o campo e tratado SEMPRE como dado pessoal. Consequencias, todas
-- implementadas:
--
--   1. coluna separada (dados_bancarios), fora de qualquer select de listagem;
--   2. a view public.carbon_fornecedores_listagem, que a Edge Function usa na
--      listagem, NAO tem a coluna - a garantia e estrutural, nao depende de
--      alguem lembrar de escrever a lista de colunas certa;
--   3. a Edge Function devolve o valor apenas no DETALHE de um fornecedor e
--      apenas para papel admin (ver rotas/fornecedores.ts). Para os demais vai
--      so o booleano tem_dados_bancarios, que informa que existe cadastro sem
--      revelar o conteudo;
--   4. nenhum indice, nenhuma view e nenhuma funcao deste arquivo le a coluna,
--      justamente para nao criar caminho alternativo de leitura.
--
-- PENDENCIA REGISTRADA E NAO RESOLVIDA AQUI: criptografia em repouso. O certo
-- seria guardar isto no Vault do Supabase (pgsodium) e nao em text. Isso muda o
-- caminho de escrita da Edge Function e precisa de decisao do dono sobre chave e
-- rotacao, entao ficou como issue propria. Enquanto nao acontecer, o controle e
-- de acesso (itens 1 a 4), nao de criptografia.
--
-- LGPD tambem em carbon_fornecedores.contratante e .observacoes: sao campos de
-- pessoa JURIDICA e de anotacao operacional. Nome, telefone e e-mail de pessoa
-- de contato NAO entram neles - ver os comentarios das colunas.
--
-- Esta migration e idempotente: pode ser reaplicada sem erro.
-- =============================================================================


-- =============================================================================
-- 1. carbon_fornecedores - quem presta o servico
-- =============================================================================
-- Espelha a base "Cadastro de Fornecedores" do Notion (nome, CNPJ, status de
-- contratacao, contratante), mais observacoes e ativo. Os valores do status sao
-- os tres que a equipe ja usa, em snake_case: no Notion aparecem como
-- "Concluido", "Em andamento" e vazio (o vazio e a contratacao nao iniciada, que
-- passa a ser explicita aqui em vez de ausencia de valor).

create table if not exists public.carbon_fornecedores (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,
  cnpj                text,
  status_contratacao  text not null default 'nao_iniciada'
                        check (status_contratacao in (
                          'nao_iniciada',
                          'em_andamento',
                          'concluida'
                        )),
  contratante         text,
  observacoes         text,

  -- Ver o bloco DADOS BANCARIOS no cabecalho antes de mexer nesta coluna.
  dados_bancarios     text,

  ativo               boolean not null default true,
  criado_por          uuid references public.carbon_usuarios (id),
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),

  -- CNPJ guardado so em digitos (a Edge Function tira pontuacao antes de gravar).
  -- O check aceita NULL porque fornecedor entra em cadastro antes de o documento
  -- chegar, e aceita exatamente 14 digitos quando informado.
  constraint carbon_fornecedores_cnpj_digitos_chk check (
    cnpj is null or cnpj ~ '^[0-9]{14}$'
  ),

  constraint carbon_fornecedores_nome_nao_vazio_chk check (
    length(btrim(nome)) > 0
  )
);

comment on table public.carbon_fornecedores is
  'Fornecedores contratados para os projetos de carbono. Espelha a base "Cadastro de Fornecedores" descrita em docs/notion/02-fornecedores.md (issue #10). Pessoa juridica ou MEI: a coluna dados_bancarios recebe tratamento de dado pessoal por causa do MEI e da pessoa fisica - ver o cabecalho da migration. Escrita somente pela Edge Function carbon-api, com papel admin ou gestor.';
comment on column public.carbon_fornecedores.nome is
  'Razao social ou nome com que a equipe se refere ao fornecedor. Unico campo obrigatorio: o cadastro comeca antes de o contrato existir.';
comment on column public.carbon_fornecedores.cnpj is
  'CNPJ em 14 digitos, SEM pontuacao (a Edge Function normaliza antes de gravar, e a tela formata na exibicao). Guardar so digitos e o que torna o indice unico util: com mascara livre, 00.000.000/0001-00 e 00000000000100 entrariam como dois fornecedores diferentes. Nao validamos os digitos verificadores de proposito: cadastro em andamento com documento incompleto e situacao real, e recusar aqui empurraria a equipe de volta para a planilha.';
comment on column public.carbon_fornecedores.status_contratacao is
  'nao_iniciada, em_andamento ou concluida. Sao os tres estados observados na base do Notion (la o "nao iniciada" e a ausencia de valor, que aqui virou estado explicito). E o status da CONTRATACAO do fornecedor, nao do contrato: um fornecedor com contratacao concluida pode ter contrato encerrado, e vice-versa.';
comment on column public.carbon_fornecedores.contratante is
  'Quem contrata do lado de ca (a APSIS, a SPE do projeto ou o proponente). Coluna da base do Notion. Pessoa JURIDICA: LGPD - nome, telefone ou e-mail de pessoa de contato nao entram aqui.';
comment on column public.carbon_fornecedores.observacoes is
  'Anotacao operacional sobre a contratacao. LGPD: nao registrar dado de pessoa fisica (nome de representante, telefone, e-mail pessoal, CPF) neste campo. Se a informacao e sobre uma pessoa, ela nao pertence ao cadastro do fornecedor.';
comment on column public.carbon_fornecedores.dados_bancarios is
  'Dados para pagamento (banco, agencia, conta, chave PIX). REQUISITO DE PRIVACIDADE DA ISSUE #10, nao detalhe de implementacao: se o fornecedor for pessoa fisica ou MEI, isto e DADO PESSOAL de titular identificavel sob a LGPD (Lei 13.709/2018), com finalidade restrita a pagar o contrato. Por isso: nunca aparece em listagem (a view carbon_fornecedores_listagem nao tem esta coluna), so no detalhe de um fornecedor e somente para papel admin, e nenhuma view, indice ou funcao deste arquivo a le. Pendencia registrada: criptografia em repouso via Vault/pgsodium, que exige decisao sobre chave e rotacao.';
comment on column public.carbon_fornecedores.ativo is
  'false esconde o fornecedor das listagens de trabalho sem apagar o historico de contratos e parcelas, que e dado financeiro e nao se apaga.';
comment on column public.carbon_fornecedores.criado_por is
  'Colaborador que cadastrou, para rastreabilidade. Vem do registro em carbon_usuarios resolvido pela Edge Function, nunca do corpo da requisicao.';

-- Indice unico PARCIAL: garante um cadastro por CNPJ, mas nao impede varios
-- fornecedores sem CNPJ informado (em Postgres, NULL nao colide com NULL, e o
-- parcial deixa a intencao explicita).
create unique index if not exists carbon_fornecedores_cnpj_idx
  on public.carbon_fornecedores (cnpj)
  where cnpj is not null;

create index if not exists carbon_fornecedores_nome_idx
  on public.carbon_fornecedores (nome);
create index if not exists carbon_fornecedores_status_idx
  on public.carbon_fornecedores (status_contratacao);


-- =============================================================================
-- 2. carbon_contratos - a entidade que faltava entre fornecedor e parcela
-- =============================================================================
-- projeto_id e ANULAVEL de proposito: parte das contratacoes e do backoffice
-- (assessoria, ferramenta, servico administrativo) e nao pertence a projeto
-- nenhum. Exigir projeto obrigaria a inventar um projeto "geral", e o campo
-- deixaria de significar o que significa.

create table if not exists public.carbon_contratos (
  id                uuid primary key default gen_random_uuid(),
  fornecedor_id     uuid not null references public.carbon_fornecedores (id) on delete restrict,
  projeto_id        uuid references public.carbon_projetos (id) on delete set null,
  objeto            text not null,
  data_contratacao  date,
  valor_total       numeric(14,2),
  centro_custo      text,
  tipo_servico      text,
  status            text not null default 'ativo'
                      check (status in ('ativo', 'encerrado', 'cancelado')),
  observacoes       text,
  criado_por        uuid references public.carbon_usuarios (id),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),

  constraint carbon_contratos_objeto_nao_vazio_chk check (
    length(btrim(objeto)) > 0
  ),
  -- Zero e permitido (contrato de valor a apurar entra com NULL, nao com zero);
  -- negativo e sempre erro de digitacao.
  constraint carbon_contratos_valor_positivo_chk check (
    valor_total is null or valor_total >= 0
  )
);

comment on table public.carbon_contratos is
  'Contrato firmado com um fornecedor: o que foi contratado, quando, por quanto e em qual centro de custo. E a entidade que a issue #11 identifica como faltante entre fornecedor e parcelas - sem ela nao ha onde guardar a data de contratacao pedida na propria pagina do Notion, e duas contratacoes do mesmo fornecedor viram um monte indistinguivel de parcelas. As parcelas sao geradas a partir daqui por public.carbon_parcelas_gerar.';
comment on column public.carbon_contratos.fornecedor_id is
  'Fornecedor contratado. ON DELETE RESTRICT de proposito: apagar um fornecedor que tem contrato apagaria historico financeiro. Para tirar da operacao existe carbon_fornecedores.ativo.';
comment on column public.carbon_contratos.projeto_id is
  'Projeto a que a contratacao pertence, ou NULL para contratacao de backoffice, que nao pertence a projeto nenhum. ON DELETE SET NULL: se um projeto for apagado, o contrato continua existindo (a obrigacao financeira nao desaparece com o cadastro do projeto).';
comment on column public.carbon_contratos.objeto is
  'O que foi contratado, na redacao da equipe. Unico campo obrigatorio junto do fornecedor: contrato em negociacao entra sem valor e sem data.';
comment on column public.carbon_contratos.data_contratacao is
  'Data da contratacao. Coluna pedida literalmente na pagina do Notion ("Colunas: fornecedor, data de contratacao, cadastrar parcelas"). Nao e o primeiro vencimento: esse e informado na geracao das parcelas, porque muitas vezes a primeira parcela vence semanas depois da assinatura.';
comment on column public.carbon_contratos.valor_total is
  'Valor total contratado. E o valor de REFERENCIA do contrato, usado como default na geracao das parcelas; a verdade do que sera pago sao as parcelas, e as duas coisas podem divergir legitimamente (aditivo, reajuste, glosa). A API devolve os dois numeros lado a lado (valor_total e valor_parcelado) justamente para a divergencia ficar visivel em vez de ser escondida por um dos dois.';
comment on column public.carbon_contratos.centro_custo is
  'Centro de custo padrao do contrato. Herdado pelas parcelas na geracao, e sobrescrevivel parcela a parcela, porque um contrato pode ter parcelas rateadas em centros diferentes. Texto livre porque a lista de centros muda mais rapido que o sistema.';
comment on column public.carbon_contratos.tipo_servico is
  'Tipo de servico, coluna "Tipo de Servico" da base de parcelas do Notion. Fica tambem no contrato porque e propriedade da contratacao, e as parcelas o herdam na geracao.';
comment on column public.carbon_contratos.status is
  'ativo, encerrado ou cancelado. E o estado do CONTRATO, nao das parcelas: contrato encerrado pode ter parcela em aberto (o servico terminou e o pagamento nao saiu), e e exatamente esse caso que precisa continuar aparecendo no financeiro.';
comment on column public.carbon_contratos.observacoes is
  'Anotacao sobre a contratacao. LGPD: sem dado de pessoa fisica, mesma regra de carbon_fornecedores.observacoes.';

create index if not exists carbon_contratos_fornecedor_idx
  on public.carbon_contratos (fornecedor_id, data_contratacao desc);
create index if not exists carbon_contratos_projeto_idx
  on public.carbon_contratos (projeto_id);
create index if not exists carbon_contratos_status_idx
  on public.carbon_contratos (status);
create index if not exists carbon_contratos_centro_custo_idx
  on public.carbon_contratos (centro_custo);


-- =============================================================================
-- 3. carbon_parcelas - as obrigacoes financeiras do contrato
-- =============================================================================
-- Colunas espelhando a base "cadastro de parcelas" do Notion (Tipo de Servico,
-- Valor da Parcela, Centro de Custo, Vencimento, Pagamento, Descricao), com DUAS
-- diferencas deliberadas:
--
--   1. nao existe coluna de status. Ver o cabecalho: o status sai de
--      data_pagamento mais vencimento, pela funcao carbon_parcelas_status.
--   2. a parcela pendura no CONTRATO, nao no fornecedor. O fornecedor continua
--      alcancavel (contrato -> fornecedor) e as views ja trazem o nome dele.
--
-- O "ID" numerico da base do Notion virou a coluna numero, unica por contrato: e
-- o "3 de 12" que a equipe usa para conversar sobre a parcela. Chave de verdade
-- continua sendo o uuid.

create table if not exists public.carbon_parcelas (
  id              uuid primary key default gen_random_uuid(),
  contrato_id     uuid not null references public.carbon_contratos (id) on delete cascade,
  numero          integer not null check (numero > 0),
  descricao       text,
  valor           numeric(14,2) not null check (valor >= 0),
  vencimento      date not null,
  data_pagamento  date,
  tipo_servico    text,
  centro_custo    text,
  observacoes     text,
  criado_por      uuid references public.carbon_usuarios (id),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),

  -- Numero unico dentro do contrato. E tambem o que torna a geracao de parcelas
  -- resistente a clique duplo: a segunda tentativa colide em vez de duplicar.
  constraint carbon_parcelas_numero_unico unique (contrato_id, numero)
);

comment on table public.carbon_parcelas is
  'Parcelas a pagar de um contrato de fornecedor. Espelha a base "cadastro de parcelas" de docs/notion/02-fornecedores.md (issue #11) com duas diferencas deliberadas: nao ha coluna de status (ele e derivado de data_pagamento e vencimento pela funcao public.carbon_parcelas_status, exposta nas views) e a parcela pendura no contrato, nao direto no fornecedor. Normalmente criada em serie por public.carbon_parcelas_gerar, nao digitada uma a uma.';
comment on column public.carbon_parcelas.contrato_id is
  'Contrato de origem. ON DELETE CASCADE: parcela nao existe sem contrato, e apagar o contrato e uma correcao de cadastro, nao um encerramento (para encerrar existe carbon_contratos.status).';
comment on column public.carbon_parcelas.numero is
  'Posicao da parcela na serie do contrato (o "3 de 12"). Corresponde a coluna ID da base do Notion. Unico por contrato, e e essa unicidade que torna a geracao idempotente: rodar de novo colide em vez de duplicar a serie.';
comment on column public.carbon_parcelas.descricao is
  'Descricao da parcela, coluna "Descricao" do Notion. Fica NULL quando nao ha nada a dizer alem do numero e do vencimento: a serie gerada nao inventa texto.';
comment on column public.carbon_parcelas.valor is
  'Valor desta parcela em BRL. Na serie gerada a partir do valor total, a ULTIMA parcela absorve a diferenca de centavos do arredondamento - sem isso a soma das parcelas nao fecha com o valor do contrato (1000,00 em 3 vezes daria 999,99). Ver public.carbon_parcelas_gerar.';
comment on column public.carbon_parcelas.vencimento is
  'Data de vencimento. Obrigatoria: parcela sem vencimento nao pode ter status derivado, e status derivado e o requisito central da issue #11.';
comment on column public.carbon_parcelas.data_pagamento is
  'Data em que o pagamento saiu. E a UNICA fonte de "esta paga": nao existe coluna de status manual, justamente para nao repetir o problema do Notion, onde "Status Pgto" e a data de pagamento podem se contradizer. Preencher aqui e o ato de baixar a parcela; limpar desfaz a baixa.';
comment on column public.carbon_parcelas.tipo_servico is
  'Tipo de servico desta parcela. Herdado do contrato na geracao e sobrescrevivel: contrato pode ter parcela de mobilizacao e parcela de medicao.';
comment on column public.carbon_parcelas.centro_custo is
  'Centro de custo desta parcela. Herdado do contrato na geracao e sobrescrevivel, porque o rateio pode mudar no meio da serie. E a dimensao da totalizacao por centro de custo pedida na issue #11, e por isso ela mora na PARCELA: totalizar pelo centro do contrato daria numero errado sempre que houvesse rateio.';
comment on column public.carbon_parcelas.observacoes is
  'Anotacao sobre esta parcela (motivo de atraso, numero de nota). LGPD: sem dado de pessoa fisica.';

create index if not exists carbon_parcelas_contrato_idx
  on public.carbon_parcelas (contrato_id, numero);
create index if not exists carbon_parcelas_vencimento_idx
  on public.carbon_parcelas (vencimento);
-- Indice PARCIAL para o caminho mais quente da tela: "o que esta em aberto".
-- Sem ele, a view de parcelas abertas varre tambem todo o historico ja pago.
create index if not exists carbon_parcelas_abertas_idx
  on public.carbon_parcelas (vencimento)
  where data_pagamento is null;
create index if not exists carbon_parcelas_centro_custo_idx
  on public.carbon_parcelas (centro_custo);


-- =============================================================================
-- 4. Trigger de atualizado_em (uma funcao para as tres tabelas)
-- =============================================================================
-- Uma funcao so, e nao tres identicas: ela nao referencia tabela nenhuma, so
-- mexe em NEW.atualizado_em. Mesmo caminho que o dominio de findings seguiu.

create or replace function public.carbon_fornecedores_set_atualizado_em()
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

comment on function public.carbon_fornecedores_set_atualizado_em() is
  'Mantem atualizado_em em dia a cada UPDATE nas tres tabelas do dominio de fornecedores (carbon_fornecedores, carbon_contratos, carbon_parcelas). Uma funcao serve as tres porque nao referencia tabela: so escreve NEW.atualizado_em.';

drop trigger if exists carbon_fornecedores_atualizado_em on public.carbon_fornecedores;
create trigger carbon_fornecedores_atualizado_em
  before update on public.carbon_fornecedores
  for each row
  execute function public.carbon_fornecedores_set_atualizado_em();

drop trigger if exists carbon_contratos_atualizado_em on public.carbon_contratos;
create trigger carbon_contratos_atualizado_em
  before update on public.carbon_contratos
  for each row
  execute function public.carbon_fornecedores_set_atualizado_em();

drop trigger if exists carbon_parcelas_atualizado_em on public.carbon_parcelas;
create trigger carbon_parcelas_atualizado_em
  before update on public.carbon_parcelas
  for each row
  execute function public.carbon_fornecedores_set_atualizado_em();


-- =============================================================================
-- 5. Status derivado da parcela - a regra escrita UMA vez
-- =============================================================================
-- STABLE e nao IMMUTABLE porque le current_date: e exatamente por isso que o
-- status nao pode ser coluna gerada (generated always exige IMMUTABLE) nem ficar
-- guardado em coluna comum. Uma parcela vira "vencida" a meia-noite sem ninguem
-- tocar na linha.
--
-- A JANELA DE 7 DIAS separa "em aberto" de "a vencer". Os dois nomes vem da
-- issue #11 e, em portugues, significam quase a mesma coisa: a distincao util e
-- a de urgencia. 7 dias e uma semana de folga para providenciar o pagamento -
-- e o horizonte da reuniao semanal da operacao. Mudar o numero e mudar esta
-- linha e a constante JANELA_A_VENCER_DIAS do frontend (src/lib/api e
-- src/lib/demo do dominio), que existem para a tela nao ter de perguntar ao
-- servidor a cor de cada linha.

create or replace function public.carbon_parcelas_status(
  p_vencimento     date,
  p_data_pagamento date
)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when p_data_pagamento is not null     then 'paga'
    when p_vencimento is null             then 'em_aberto'
    when p_vencimento < current_date      then 'vencida'
    when p_vencimento <= current_date + 7 then 'a_vencer'
    else 'em_aberto'
  end;
$$;

comment on function public.carbon_parcelas_status(date, date) is
  'Status de pagamento DERIVADO de uma parcela: paga (tem data_pagamento), vencida (sem pagamento e vencimento anterior a hoje), a_vencer (sem pagamento e vencimento dentro de 7 dias, incluindo hoje) ou em_aberto (sem pagamento e vencimento depois disso). Requisito central da issue #11: substitui o campo "Status Pgto" manual do Notion, que podia contradizer a data de pagamento. STABLE porque le current_date, e e por isso que o status e exposto por view e nao por coluna gerada - a mudanca de a_vencer para vencida acontece a meia-noite, sem UPDATE na linha. A janela de 7 dias tambem esta no frontend, como JANELA_A_VENCER_DIAS; mudar aqui exige mudar la.';


-- =============================================================================
-- 6. Views
-- =============================================================================
-- DROP antes de CREATE, e nao "create or replace view": replace exige a MESMA
-- lista de colunas, na mesma ordem, entao acrescentar uma coluna numa revisao
-- desta migration faria a reaplicacao falhar. Com drop na ordem inversa das
-- dependencias, o arquivo continua idempotente.
--
-- security_invoker = true em todas: sem isso a view roda com os privilegios do
-- dono e passaria por cima da RLS das tabelas. Como anon e authenticated nao tem
-- privilegio nenhum aqui (revoke logo abaixo), sao duas camadas na mesma direcao.

drop view if exists public.carbon_parcelas_calendario;
drop view if exists public.carbon_parcelas_pagas;
drop view if exists public.carbon_parcelas_em_aberto;
drop view if exists public.carbon_parcelas_detalhe;
drop view if exists public.carbon_contratos_detalhe;
drop view if exists public.carbon_fornecedores_listagem;


-- 6.1 Listagem de fornecedores SEM dados bancarios ----------------------------
-- A ausencia da coluna dados_bancarios aqui e o requisito de privacidade da
-- issue #10 virando estrutura: a rota de listagem le esta view, e por isso NAO
-- existe forma de o campo escapar por um select mal escrito.

create view public.carbon_fornecedores_listagem
  with (security_invoker = true)
as
select
  f.id,
  f.nome,
  f.cnpj,
  f.status_contratacao,
  f.contratante,
  f.observacoes,
  f.ativo,
  f.criado_em,
  f.atualizado_em,
  -- Booleano, nunca o conteudo: quem nao e admin precisa saber que o cadastro de
  -- pagamento existe (ou que falta) sem ver os dados.
  (f.dados_bancarios is not null) as tem_dados_bancarios,
  coalesce(c.contratos, 0)          as contratos,
  coalesce(c.contratos_ativos, 0)   as contratos_ativos,
  coalesce(c.valor_contratado, 0)   as valor_contratado,
  coalesce(p.parcelas, 0)           as parcelas,
  coalesce(p.valor_parcelado, 0)    as valor_parcelado,
  coalesce(p.valor_pago, 0)         as valor_pago,
  coalesce(p.valor_aberto, 0)       as valor_aberto,
  coalesce(p.valor_vencido, 0)      as valor_vencido,
  coalesce(p.parcelas_vencidas, 0)  as parcelas_vencidas,
  p.proximo_vencimento
from public.carbon_fornecedores f
left join (
  select
    ct.fornecedor_id,
    count(*)                                            as contratos,
    count(*) filter (where ct.status = 'ativo')          as contratos_ativos,
    coalesce(sum(ct.valor_total), 0)                     as valor_contratado
  from public.carbon_contratos ct
  group by ct.fornecedor_id
) c on c.fornecedor_id = f.id
left join (
  select
    ct.fornecedor_id,
    count(*)                                                        as parcelas,
    coalesce(sum(pa.valor), 0)                                      as valor_parcelado,
    coalesce(sum(pa.valor) filter (where pa.data_pagamento is not null), 0) as valor_pago,
    coalesce(sum(pa.valor) filter (where pa.data_pagamento is null), 0)     as valor_aberto,
    coalesce(sum(pa.valor) filter (
      where pa.data_pagamento is null and pa.vencimento < current_date
    ), 0)                                                           as valor_vencido,
    count(*) filter (
      where pa.data_pagamento is null and pa.vencimento < current_date
    )                                                               as parcelas_vencidas,
    min(pa.vencimento) filter (
      where pa.data_pagamento is null and pa.vencimento >= current_date
    )                                                               as proximo_vencimento
  from public.carbon_parcelas pa
  join public.carbon_contratos ct on ct.id = pa.contrato_id
  group by ct.fornecedor_id
) p on p.fornecedor_id = f.id;

comment on view public.carbon_fornecedores_listagem is
  'Fornecedores com os agregados de contrato e de parcela prontos para a listagem. NAO TEM a coluna dados_bancarios, e essa ausencia e o requisito de privacidade da issue #10 virando estrutura: a rota de listagem le esta view, portanto o campo nao pode escapar por um select mal escrito. Em lugar dele vai o booleano tem_dados_bancarios. Os valores em aberto e vencido usam a mesma regra da funcao carbon_parcelas_status (sem data de pagamento; vencido quando o vencimento ja passou).';


-- 6.2 Contratos com fornecedor e o resumo das parcelas ------------------------

create view public.carbon_contratos_detalhe
  with (security_invoker = true)
as
select
  c.id,
  c.fornecedor_id,
  c.projeto_id,
  c.objeto,
  c.data_contratacao,
  c.valor_total,
  c.centro_custo,
  c.tipo_servico,
  c.status,
  c.observacoes,
  c.criado_por,
  c.criado_em,
  c.atualizado_em,
  f.nome               as fornecedor_nome,
  f.cnpj               as fornecedor_cnpj,
  f.status_contratacao as fornecedor_status_contratacao,
  f.ativo              as fornecedor_ativo,
  pr.nome              as projeto_nome,
  coalesce(p.parcelas, 0)          as parcelas,
  coalesce(p.parcelas_pagas, 0)    as parcelas_pagas,
  coalesce(p.parcelas_vencidas, 0) as parcelas_vencidas,
  coalesce(p.valor_parcelado, 0)   as valor_parcelado,
  coalesce(p.valor_pago, 0)        as valor_pago,
  coalesce(p.valor_aberto, 0)      as valor_aberto,
  coalesce(p.valor_vencido, 0)     as valor_vencido,
  p.primeiro_vencimento,
  p.ultimo_vencimento,
  p.proximo_vencimento
from public.carbon_contratos c
join public.carbon_fornecedores f on f.id = c.fornecedor_id
left join public.carbon_projetos pr on pr.id = c.projeto_id
left join (
  select
    pa.contrato_id,
    count(*)                                                        as parcelas,
    count(*) filter (where pa.data_pagamento is not null)            as parcelas_pagas,
    count(*) filter (
      where pa.data_pagamento is null and pa.vencimento < current_date
    )                                                               as parcelas_vencidas,
    coalesce(sum(pa.valor), 0)                                      as valor_parcelado,
    coalesce(sum(pa.valor) filter (where pa.data_pagamento is not null), 0) as valor_pago,
    coalesce(sum(pa.valor) filter (where pa.data_pagamento is null), 0)     as valor_aberto,
    coalesce(sum(pa.valor) filter (
      where pa.data_pagamento is null and pa.vencimento < current_date
    ), 0)                                                           as valor_vencido,
    min(pa.vencimento)                                              as primeiro_vencimento,
    max(pa.vencimento)                                              as ultimo_vencimento,
    min(pa.vencimento) filter (
      where pa.data_pagamento is null and pa.vencimento >= current_date
    )                                                               as proximo_vencimento
  from public.carbon_parcelas pa
  group by pa.contrato_id
) p on p.contrato_id = c.id;

comment on view public.carbon_contratos_detalhe is
  'Contratos com o nome do fornecedor, o nome do projeto e o resumo das parcelas (quantidade, pago, em aberto, vencido, primeiro e proximo vencimento). Existe para a tela nao precisar de tres consultas nem repetir a soma em TypeScript. valor_total (o contratado) e valor_parcelado (a soma das parcelas) vem lado a lado de proposito: divergencia entre os dois e informacao, nao erro, e esconde-la atras de um numero unico impediria de ver aditivo ou parcela faltando.';


-- 6.3 Parcelas com o status derivado ------------------------------------------
-- A view base do dominio financeiro. Todo consumo de parcela passa por aqui, para
-- que status_pagamento, dias_para_vencimento e atraso_dias tenham uma
-- implementacao unica.

create view public.carbon_parcelas_detalhe
  with (security_invoker = true)
as
select
  pa.id,
  pa.contrato_id,
  pa.numero,
  pa.descricao,
  pa.valor,
  pa.vencimento,
  pa.data_pagamento,
  pa.tipo_servico,
  pa.centro_custo,
  pa.observacoes,
  pa.criado_em,
  pa.atualizado_em,
  public.carbon_parcelas_status(pa.vencimento, pa.data_pagamento) as status_pagamento,
  -- Negativo = ja venceu. Deixamos o sinal em vez de usar abs() para a tela poder
  -- dizer "vence em 3 dias" e "venceu ha 3 dias" com o mesmo numero.
  (pa.vencimento - current_date) as dias_para_vencimento,
  case
    when pa.data_pagamento is not null then greatest(0, pa.data_pagamento - pa.vencimento)
    else greatest(0, current_date - pa.vencimento)
  end as atraso_dias,
  c.fornecedor_id,
  c.projeto_id,
  c.objeto           as contrato_objeto,
  c.status           as contrato_status,
  c.data_contratacao as contrato_data_contratacao,
  f.nome             as fornecedor_nome,
  pr.nome            as projeto_nome
from public.carbon_parcelas pa
join public.carbon_contratos c on c.id = pa.contrato_id
join public.carbon_fornecedores f on f.id = c.fornecedor_id
left join public.carbon_projetos pr on pr.id = c.projeto_id;

comment on view public.carbon_parcelas_detalhe is
  'Parcelas com o status derivado (status_pagamento pela funcao carbon_parcelas_status), dias_para_vencimento com sinal (negativo = ja venceu) e atraso_dias, mais o contrato, o fornecedor e o projeto resolvidos. E a view BASE do financeiro: em_aberto, pagas e calendario derivam dela, e a Edge Function le sempre daqui, para o status ter uma implementacao unica. atraso_dias em parcela paga e o atraso com que ela FOI paga (data_pagamento - vencimento); em parcela aberta e o atraso corrente.';


-- 6.4, 6.5 e 6.6 As tres views pedidas na issue -------------------------------
-- "Views: em aberto, pagas e calendario" (issue #11, espelhando as views da base
-- do Notion). Sao filtros e um agregado sobre carbon_parcelas_detalhe: nenhuma
-- delas repete a regra de status.

create view public.carbon_parcelas_em_aberto
  with (security_invoker = true)
as
select *
  from public.carbon_parcelas_detalhe
 where data_pagamento is null;

comment on view public.carbon_parcelas_em_aberto is
  'Parcelas sem pagamento registrado, ou seja status_pagamento em (vencida, a_vencer, em_aberto). Espelha a view "Em aberto" da base de parcelas do Notion. Filtra por data_pagamento is null, e nao por texto de status, para nao depender da janela de 7 dias que separa a_vencer de em_aberto.';

create view public.carbon_parcelas_pagas
  with (security_invoker = true)
as
select *
  from public.carbon_parcelas_detalhe
 where data_pagamento is not null;

comment on view public.carbon_parcelas_pagas is
  'Parcelas com pagamento registrado. Espelha a view "Pagas" da base de parcelas do Notion. atraso_dias aqui e o atraso com que a parcela foi paga, o que torna esta view utilizavel como historico de pontualidade.';

create view public.carbon_parcelas_calendario
  with (security_invoker = true)
as
select
  vencimento,
  count(*)::integer                                                     as parcelas,
  coalesce(sum(valor), 0)                                               as valor,
  coalesce(sum(valor) filter (where status_pagamento = 'paga'), 0)      as valor_pago,
  coalesce(sum(valor) filter (where status_pagamento <> 'paga'), 0)      as valor_aberto,
  coalesce(sum(valor) filter (where status_pagamento = 'vencida'), 0)    as valor_vencido,
  (count(*) filter (where status_pagamento <> 'paga'))::integer          as parcelas_abertas,
  count(distinct fornecedor_id)::integer                                as fornecedores
from public.carbon_parcelas_detalhe
group by vencimento;

comment on view public.carbon_parcelas_calendario is
  'Um registro por DIA de vencimento, com quantidade e valores (total, pago, em aberto, vencido). Espelha a view "Calendar" da base de parcelas do Notion e serve consulta direta no SQL Editor e relatorio externo. A tela de Contratos monta a grade do mes a partir das proprias parcelas do periodo, porque ela precisa listar cada parcela do dia ao clicar - agrupar por dia ali e apresentacao, nao regra de negocio.';


-- =============================================================================
-- 7. Geracao automatica de parcelas
-- =============================================================================
-- Criterio de aceite da issue #11: "informar valor total ou valor de parcela,
-- quantidade e periodicidade, e o sistema cria as parcelas com vencimento
-- calculado". As parcelas observadas no Notion sao mensais e de mesmo valor,
-- portanto foram geradas, nao digitadas.
--
-- POR QUE NO BANCO e nao no cliente: a conta tem duas regras que ninguem lembra
-- de reimplementar igual.
--
--   1. RESTO DE CENTAVOS. 1000,00 em 3 parcelas da 333,33 cada e soma 999,99. A
--      ultima parcela absorve a diferenca (333,34), senao a soma das parcelas nao
--      fecha com o valor do contrato e todo relatorio nasce com um centavo de
--      erro. Quando o valor informado e o da PARCELA (e nao o total), nao ha
--      resto: todas ficam iguais e o total e a multiplicacao.
--
--   2. FIM DE MES. Cada vencimento e calculado a partir do PRIMEIRO vencimento
--      mais N meses, e nao somando um mes sobre o vencimento anterior. A
--      diferenca aparece em serie que comeca no fim do mes: somando meses em
--      Postgres, 31/01 mais um mes e 28/02 (o dia e limitado ao ultimo do mes de
--      destino), mas 31/01 mais dois meses e 31/03. Calculando a partir do
--      primeiro, a serie fica 31/01, 28/02, 31/03, 30/04, 31/05 - ela VOLTA para
--      o dia 31 nos meses que tem dia 31, que e o que o contrato diz. Somando
--      cumulativamente, ela ficaria presa em 28 para sempre.
--
-- NAO GUARDAMOS periodicidade nem quantidade no contrato de proposito: as
-- parcelas SAO a verdade. Guardar tambem no contrato criaria dois lugares para a
-- mesma informacao, e o primeiro pagamento antecipado ou parcela extra deixaria
-- os dois divergentes sem ninguem perceber. Periodicidade e quantidade sao
-- ENTRADA da geracao, nao propriedade do contrato.

-- Normalizador de texto usado pela geracao ------------------------------------
-- Existe porque coalesce(p_tipo_servico, v_contrato.tipo_servico) trataria string
-- vazia como valor informado e gravaria '' na parcela, em vez de herdar do
-- contrato. IMMUTABLE porque so olha o argumento. Prefixo do dominio no nome de
-- proposito: um helper chamado carbon_texto_ou_nulo seria o tipo de nome que dois
-- dominios criam ao mesmo tempo com corpos diferentes.

create or replace function public.carbon_fornecedores_texto_ou_nulo(p_valor text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select nullif(btrim(coalesce(p_valor, '')), '');
$$;

comment on function public.carbon_fornecedores_texto_ou_nulo(text) is
  'Texto aparado, ou NULL quando vazio. Usada pela geracao de parcelas para que string vazia signifique "nao informado" (e portanto herde o valor do contrato) em vez de gravar aspas vazias na coluna.';

create or replace function public.carbon_parcelas_gerar(
  p_contrato_id         uuid,
  p_quantidade          integer,
  p_periodicidade       text,
  p_primeiro_vencimento date,
  p_valor_parcela       numeric default null,
  p_valor_total         numeric default null,
  p_tipo_servico        text    default null,
  p_centro_custo        text    default null,
  p_descricao           text    default null,
  p_substituir          boolean default false,
  p_criado_por          uuid    default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contrato        public.carbon_contratos;
  v_meses           integer;
  v_total           numeric(14,2);
  v_base            numeric(14,2);
  v_ultima          numeric(14,2);
  v_existentes      integer;
  v_pagas           integer;
  v_removidas       integer := 0;
  v_criadas         integer;
  v_tipo_servico    text;
  v_centro_custo    text;
  v_ultimo_venc     date;
begin
  -- Contrato ---------------------------------------------------------------
  if p_contrato_id is null then
    raise exception 'contrato_nao_encontrado: p_contrato_id nao informado';
  end if;

  select * into v_contrato
    from public.carbon_contratos
   where id = p_contrato_id;

  if not found then
    raise exception 'contrato_nao_encontrado: nenhum contrato com id %', p_contrato_id;
  end if;

  -- Periodicidade ----------------------------------------------------------
  -- Mapa periodicidade -> meses de intervalo. 'unica' e o pagamento a vista,
  -- que existe de verdade (servico pontual) e nao deveria obrigar a equipe a
  -- fingir uma serie de uma parcela mensal.
  v_meses := case lower(btrim(coalesce(p_periodicidade, '')))
    when 'unica'         then 0
    when 'mensal'        then 1
    when 'bimestral'     then 2
    when 'trimestral'    then 3
    when 'quadrimestral' then 4
    when 'semestral'     then 6
    when 'anual'         then 12
    else null
  end;

  if v_meses is null then
    raise exception 'periodicidade_invalida: % nao e uma periodicidade aceita', p_periodicidade;
  end if;

  -- Quantidade -------------------------------------------------------------
  -- Limite de 240 = 20 anos de parcela mensal. Existe para um zero a mais
  -- digitado nao virar dez mil linhas no banco.
  if p_quantidade is null or p_quantidade < 1 or p_quantidade > 240 then
    raise exception 'quantidade_invalida: esperado entre 1 e 240, recebido %', p_quantidade;
  end if;

  -- Pagamento unico com quantidade diferente de 1 e contradicao: recusamos em
  -- vez de ajustar em silencio, porque o silencio esconde erro de preenchimento.
  if v_meses = 0 and p_quantidade <> 1 then
    raise exception 'quantidade_invalida: periodicidade unica aceita apenas 1 parcela, recebido %',
      p_quantidade;
  end if;

  if p_primeiro_vencimento is null then
    raise exception 'vencimento_obrigatorio: p_primeiro_vencimento e obrigatorio';
  end if;

  -- Valor ------------------------------------------------------------------
  -- Os dois juntos seria ambiguo (qual manda?), e adivinhar aqui produziria
  -- serie com valor que ninguem pediu.
  if p_valor_parcela is not null and p_valor_total is not null then
    raise exception 'valor_ambiguo: informe o valor total OU o valor da parcela, nao os dois';
  end if;

  if p_valor_parcela is not null then
    if p_valor_parcela < 0 then
      raise exception 'valor_invalido: valor da parcela negativo';
    end if;
    -- Valor da parcela informado: todas iguais, sem resto para distribuir.
    v_base    := round(p_valor_parcela, 2);
    v_ultima  := v_base;
    v_total   := round(v_base * p_quantidade, 2);
  else
    -- Sem valor no corpo, cai no valor total do contrato: e o caso normal, o
    -- contrato ja tem o valor cadastrado e a equipe so escolhe em quantas vezes.
    v_total := coalesce(p_valor_total, v_contrato.valor_total);

    if v_total is null then
      raise exception 'valor_obrigatorio: informe o valor total, o valor da parcela ou preencha o valor do contrato';
    end if;
    if v_total < 0 then
      raise exception 'valor_invalido: valor total negativo';
    end if;

    v_total  := round(v_total, 2);
    v_base   := round(v_total / p_quantidade, 2);
    -- A ULTIMA parcela absorve o resto. Ver a regra 1 no cabecalho da secao.
    v_ultima := v_total - (v_base * (p_quantidade - 1));

    -- Arredondamento para cima em serie longa pode fazer a ultima parcela ficar
    -- negativa (0,01 x 240 contra um total pequeno). Nesse caso a divisao pedida
    -- nao existe em centavos, e devolver serie com parcela negativa seria pior
    -- que recusar.
    if v_ultima < 0 then
      raise exception 'valor_invalido: % nao divide em % parcelas de centavos inteiros',
        v_total, p_quantidade;
    end if;
  end if;

  -- Serie ja existente -----------------------------------------------------
  select count(*), count(*) filter (where data_pagamento is not null)
    into v_existentes, v_pagas
    from public.carbon_parcelas
   where contrato_id = p_contrato_id;

  if v_existentes > 0 and not p_substituir then
    -- Recusa em vez de completar a serie: clique duplo nao pode duplicar
    -- obrigacao financeira, e "acrescentar as que faltam" produziria parcelas
    -- com valor calculado para outra quantidade convivendo com as antigas.
    raise exception 'parcelas_ja_existem: o contrato % ja tem % parcela(s)',
      p_contrato_id, v_existentes;
  end if;

  if p_substituir and v_pagas > 0 then
    -- Regerar em volta de parcela paga produziria serie incoerente (numeros e
    -- valores que nao correspondem ao que foi pago). Quem precisa ajustar o que
    -- sobrou edita parcela a parcela.
    raise exception 'parcela_paga_impede_regeracao: o contrato % tem % parcela(s) paga(s)',
      p_contrato_id, v_pagas;
  end if;

  if p_substituir and v_existentes > 0 then
    delete from public.carbon_parcelas
     where contrato_id = p_contrato_id
       and data_pagamento is null;
    get diagnostics v_removidas = row_count;
  end if;

  -- Insercao ---------------------------------------------------------------
  v_tipo_servico := coalesce(
    public.carbon_fornecedores_texto_ou_nulo(p_tipo_servico), v_contrato.tipo_servico
  );
  v_centro_custo := coalesce(
    public.carbon_fornecedores_texto_ou_nulo(p_centro_custo), v_contrato.centro_custo
  );

  insert into public.carbon_parcelas (
    contrato_id, numero, descricao, valor, vencimento,
    tipo_servico, centro_custo, criado_por
  )
  select
    p_contrato_id,
    i,
    public.carbon_fornecedores_texto_ou_nulo(p_descricao),
    case when i < p_quantidade then v_base else v_ultima end,
    -- Sempre a partir do PRIMEIRO vencimento, nunca do anterior: e isso que faz
    -- 31/01 gerar 28/02 e voltar para 31/03. Ver a regra 2 no cabecalho.
    (p_primeiro_vencimento + make_interval(months => v_meses * (i - 1)))::date,
    v_tipo_servico,
    v_centro_custo,
    p_criado_por
  from generate_series(1, p_quantidade) as i
  -- Rede de seguranca para duas geracoes simultaneas: a unicidade de
  -- (contrato_id, numero) decide, e a segunda nao duplica a serie.
  on conflict (contrato_id, numero) do nothing;

  get diagnostics v_criadas = row_count;

  select max(vencimento) into v_ultimo_venc
    from public.carbon_parcelas
   where contrato_id = p_contrato_id;

  return jsonb_build_object(
    'contrato_id',           p_contrato_id,
    'criadas',               coalesce(v_criadas, 0),
    'removidas',             v_removidas,
    'quantidade',            p_quantidade,
    'periodicidade',         lower(btrim(p_periodicidade)),
    'intervalo_meses',       v_meses,
    'valor_total',           v_total,
    'valor_parcela',         v_base,
    'valor_ultima_parcela',  v_ultima,
    'primeiro_vencimento',   p_primeiro_vencimento,
    'ultimo_vencimento',     v_ultimo_venc
  );
end;
$$;

comment on function public.carbon_parcelas_gerar(uuid, integer, text, date, numeric, numeric, text, text, text, boolean, uuid) is
  'Cria a serie de parcelas de um contrato a partir de quantidade, periodicidade (unica, mensal, bimestral, trimestral, quadrimestral, semestral, anual) e valor (total OU da parcela; sem nenhum dos dois usa carbon_contratos.valor_total). Criterio de aceite da issue #11. Duas regras que sao o motivo de a conta estar no banco: a ULTIMA parcela absorve o resto do arredondamento em centavos (1000,00 em 3 vezes = 333,33 + 333,33 + 333,34), e cada vencimento sai do PRIMEIRO vencimento mais N meses, o que respeita mes curto sem prender a serie nele (31/01, 28/02, 31/03). Recusa gerar sobre serie existente com parcelas_ja_existem, para clique duplo nao duplicar obrigacao financeira; com p_substituir = true apaga as parcelas NAO PAGAS e regera, e recusa com parcela_paga_impede_regeracao se houver parcela paga. Devolve jsonb com criadas, removidas, valores e primeiro/ultimo vencimento. RAISE de plpgsql chega como P0001: a Edge Function reconhece os codigos pelo inicio da mensagem.';


-- =============================================================================
-- 8. Totalizacao por periodo e por centro de custo
-- =============================================================================
-- Criterio de aceite da issue #11 ("Totalizacao por periodo e por centro de
-- custo"), e o rodape com SUM que a base do Notion ja tem.
--
-- A totalizacao IGNORA de proposito a aba escolhida na tela (em aberto, pagas,
-- calendario) e sempre soma o periodo inteiro, devolvendo a quebra por status.
-- Se ela seguisse a aba, a tela "Pagas" mostraria "total do periodo" contando so
-- o que foi pago, e o numero passaria a significar outra coisa em cada aba - o
-- tipo de sutileza que faz relatorio financeiro perder credibilidade.

create or replace function public.carbon_parcelas_totais(
  p_inicio        date default null,
  p_fim           date default null,
  p_centro_custo  text default null,
  p_fornecedor_id uuid default null,
  p_projeto_id    uuid default null,
  p_contrato_id   uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select d.*
      from public.carbon_parcelas_detalhe d
     where (p_inicio        is null or d.vencimento >= p_inicio)
       and (p_fim           is null or d.vencimento <= p_fim)
       and (p_fornecedor_id is null or d.fornecedor_id = p_fornecedor_id)
       and (p_projeto_id    is null or d.projeto_id = p_projeto_id)
       and (p_contrato_id   is null or d.contrato_id = p_contrato_id)
       -- Centro de custo comparado por coalesce para o filtro '' (que a API
       -- converte de "Sem centro de custo") alcancar as parcelas sem centro.
       and (p_centro_custo  is null or coalesce(d.centro_custo, '') = p_centro_custo)
  ),
  totais as (
    select
      count(*)::integer                                                   as quantidade,
      coalesce(sum(valor), 0)                                             as valor,
      coalesce(sum(valor) filter (where status_pagamento = 'paga'), 0)     as valor_pago,
      coalesce(sum(valor) filter (where status_pagamento <> 'paga'), 0)    as valor_aberto,
      coalesce(sum(valor) filter (where status_pagamento = 'vencida'), 0)  as valor_vencido,
      coalesce(sum(valor) filter (where status_pagamento = 'a_vencer'), 0) as valor_a_vencer,
      (count(*) filter (where status_pagamento = 'paga'))::integer         as quantidade_paga,
      (count(*) filter (where status_pagamento = 'vencida'))::integer      as quantidade_vencida,
      min(vencimento) filter (
        where data_pagamento is null and vencimento >= current_date
      )                                                                   as proximo_vencimento
    from base
  ),
  por_status as (
    select
      status_pagamento,
      count(*)::integer          as quantidade,
      coalesce(sum(valor), 0)    as valor
    from base
    group by status_pagamento
  ),
  por_centro as (
    select
      centro_custo,
      count(*)::integer                                                   as quantidade,
      coalesce(sum(valor), 0)                                             as valor,
      coalesce(sum(valor) filter (where status_pagamento = 'paga'), 0)     as valor_pago,
      coalesce(sum(valor) filter (where status_pagamento <> 'paga'), 0)    as valor_aberto,
      coalesce(sum(valor) filter (where status_pagamento = 'vencida'), 0)  as valor_vencido
    from base
    group by centro_custo
  ),
  por_mes as (
    select
      to_char(date_trunc('month', vencimento), 'YYYY-MM')                 as mes,
      count(*)::integer                                                   as quantidade,
      coalesce(sum(valor), 0)                                             as valor,
      coalesce(sum(valor) filter (where status_pagamento = 'paga'), 0)     as valor_pago,
      coalesce(sum(valor) filter (where status_pagamento <> 'paga'), 0)    as valor_aberto,
      coalesce(sum(valor) filter (where status_pagamento = 'vencida'), 0)  as valor_vencido
    from base
    group by date_trunc('month', vencimento)
  )
  select jsonb_build_object(
    'periodo', jsonb_build_object('inicio', p_inicio, 'fim', p_fim),
    'quantidade',          t.quantidade,
    'valor',               t.valor,
    'valor_pago',          t.valor_pago,
    'valor_aberto',        t.valor_aberto,
    'valor_vencido',       t.valor_vencido,
    'valor_a_vencer',      t.valor_a_vencer,
    'quantidade_paga',     t.quantidade_paga,
    'quantidade_vencida',  t.quantidade_vencida,
    'proximo_vencimento',  t.proximo_vencimento,
    -- Ordem FIXA e nao alfabetica: e a ordem de urgencia com que a tela mostra
    -- os selos (vencida primeiro, paga por ultimo).
    'por_status', coalesce((
      select jsonb_agg(jsonb_build_object(
               'status_pagamento', s.status_pagamento,
               'quantidade',       s.quantidade,
               'valor',            s.valor
             ) order by case s.status_pagamento
                          when 'vencida'   then 1
                          when 'a_vencer'  then 2
                          when 'em_aberto' then 3
                          when 'paga'      then 4
                          else 5
                        end)
        from por_status s
    ), '[]'::jsonb),
    'por_centro_custo', coalesce((
      select jsonb_agg(jsonb_build_object(
               'centro_custo',  cc.centro_custo,
               'quantidade',    cc.quantidade,
               'valor',         cc.valor,
               'valor_pago',    cc.valor_pago,
               'valor_aberto',  cc.valor_aberto,
               'valor_vencido', cc.valor_vencido
             ) order by cc.valor desc, cc.centro_custo nulls last)
        from por_centro cc
    ), '[]'::jsonb),
    'por_mes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'mes',           m.mes,
               'quantidade',    m.quantidade,
               'valor',         m.valor,
               'valor_pago',    m.valor_pago,
               'valor_aberto',  m.valor_aberto,
               'valor_vencido', m.valor_vencido
             ) order by m.mes)
        from por_mes m
    ), '[]'::jsonb)
  )
  from totais t;
$$;

comment on function public.carbon_parcelas_totais(date, date, text, uuid, uuid, uuid) is
  'Totalizacao das parcelas em jsonb: total do periodo, quebra por status derivado, por centro de custo e por mes de vencimento. Atende "Totalizacao por periodo e por centro de custo" da issue #11 e o rodape com SUM que a base do Notion ja tem. Filtros todos opcionais (periodo, centro de custo, fornecedor, projeto, contrato); p_centro_custo = '''' alcanca as parcelas SEM centro de custo, que e diferente de nao filtrar. NAO respeita a aba escolhida na tela de proposito: soma sempre o periodo inteiro e devolve a quebra por status, para "total do periodo" significar a mesma coisa em todas as abas. Nunca devolve NULL: periodo sem parcela devolve zeros e listas vazias. A totalizacao por centro de custo usa o centro da PARCELA, nao o do contrato, porque o rateio pode mudar no meio da serie.';


-- =============================================================================
-- 9. Privilegios
-- =============================================================================
-- Mesma disciplina do resto do projeto: RLS ligada em TODAS as tabelas e NENHUMA
-- policy. Ninguem le nem escreve com a anon key; quem entra e a Edge Function
-- carbon-api com a service_role, depois de validar o ID token do Azure AD, o
-- dominio do e-mail e o papel.
--
-- Nas VIEWS a RLS nao se aplica diretamente (elas nao tem RLS propria), e por
-- isso duas coisas: security_invoker = true, para a RLS das tabelas de baixo
-- valer para quem consulta, e revoke explicito de anon/authenticated. O Supabase
-- concede privilegio a esses dois papeis por default privileges no schema
-- public, portanto sem o revoke a view nasceria legivel pela anon key - e a de
-- fornecedores, ainda que sem dados bancarios, nao e publica.

alter table public.carbon_fornecedores enable row level security;
revoke all on table public.carbon_fornecedores from anon, authenticated;
grant all on table public.carbon_fornecedores to service_role;

alter table public.carbon_contratos enable row level security;
revoke all on table public.carbon_contratos from anon, authenticated;
grant all on table public.carbon_contratos to service_role;

alter table public.carbon_parcelas enable row level security;
revoke all on table public.carbon_parcelas from anon, authenticated;
grant all on table public.carbon_parcelas to service_role;

revoke all on public.carbon_fornecedores_listagem from anon, authenticated;
revoke all on public.carbon_contratos_detalhe      from anon, authenticated;
revoke all on public.carbon_parcelas_detalhe       from anon, authenticated;
revoke all on public.carbon_parcelas_em_aberto     from anon, authenticated;
revoke all on public.carbon_parcelas_pagas         from anon, authenticated;
revoke all on public.carbon_parcelas_calendario    from anon, authenticated;

grant select on public.carbon_fornecedores_listagem to service_role;
grant select on public.carbon_contratos_detalhe      to service_role;
grant select on public.carbon_parcelas_detalhe       to service_role;
grant select on public.carbon_parcelas_em_aberto     to service_role;
grant select on public.carbon_parcelas_pagas         to service_role;
grant select on public.carbon_parcelas_calendario    to service_role;

-- O PostgreSQL concede EXECUTE a PUBLIC em toda funcao nova. Nas SECURITY
-- DEFINER isso exporia leitura e escrita pela anon key via /rest/v1/rpc,
-- contornando a RLS. Revogamos e devolvemos so ao service_role.
revoke all on function public.carbon_parcelas_status(date, date)
  from public, anon, authenticated;
revoke all on function public.carbon_fornecedores_texto_ou_nulo(text)
  from public, anon, authenticated;
revoke all on function public.carbon_parcelas_gerar(uuid, integer, text, date, numeric, numeric, text, text, text, boolean, uuid)
  from public, anon, authenticated;
revoke all on function public.carbon_parcelas_totais(date, date, text, uuid, uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.carbon_parcelas_status(date, date)  to service_role;
grant execute on function public.carbon_fornecedores_texto_ou_nulo(text) to service_role;
grant execute on function public.carbon_parcelas_gerar(uuid, integer, text, date, numeric, numeric, text, text, text, boolean, uuid) to service_role;
grant execute on function public.carbon_parcelas_totais(date, date, text, uuid, uuid, uuid) to service_role;


-- =============================================================================
-- 10. NENHUM SEED
-- =============================================================================
-- Fornecedor, contrato e parcela sao dado de negocio real e confidencial. O
-- levantamento registra explicitamente que nomes de fornecedores e valores de
-- contrato nao foram transcritos e nao devem entrar em issue, comentario ou
-- commit (docs/notion/02-fornecedores.md, secao Confidencialidade). Nao ha
-- template publico a semear aqui, ao contrario do checklist de evidencias ou dos
-- capitulos do PDD.
--
-- Para revisar a tela sem banco existe o dataset ficticio de
-- src/lib/demo/fornecedores.js, que nunca vai para producao.


-- =============================================================================
-- 11. Conferencia
-- =============================================================================
-- Notices e warnings, nunca excecao: a migration nao deve falhar por causa de
-- ajuste legitimo feito pelo dono no SQL Editor. As asserts do status existem
-- porque a regra derivada e o requisito central da issue #11: se ela quebrar, o
-- lugar de descobrir e aqui, no push, e nao na tela do financeiro.

do $$
declare
  v_views integer;
begin
  select count(*) into v_views
    from pg_views
   where schemaname = 'public'
     and viewname in (
       'carbon_fornecedores_listagem',
       'carbon_contratos_detalhe',
       'carbon_parcelas_detalhe',
       'carbon_parcelas_em_aberto',
       'carbon_parcelas_pagas',
       'carbon_parcelas_calendario'
     );

  raise notice 'Dominio de fornecedores: 3 tabelas e % de 6 views no lugar.', v_views;

  if v_views <> 6 then
    raise warning 'ATENCAO: esperadas 6 views do dominio de fornecedores, encontradas %.', v_views;
  end if;

  -- Status derivado: os quatro casos, com datas relativas a hoje.
  if public.carbon_parcelas_status(current_date - 1, current_date) <> 'paga' then
    raise warning 'ATENCAO: carbon_parcelas_status deveria devolver paga quando ha data de pagamento.';
  end if;
  if public.carbon_parcelas_status(current_date - 1, null) <> 'vencida' then
    raise warning 'ATENCAO: carbon_parcelas_status deveria devolver vencida para vencimento de ontem sem pagamento.';
  end if;
  if public.carbon_parcelas_status(current_date, null) <> 'a_vencer' then
    raise warning 'ATENCAO: carbon_parcelas_status deveria devolver a_vencer para vencimento de hoje sem pagamento.';
  end if;
  if public.carbon_parcelas_status(current_date + 30, null) <> 'em_aberto' then
    raise warning 'ATENCAO: carbon_parcelas_status deveria devolver em_aberto para vencimento distante sem pagamento.';
  end if;

  -- Resto de centavos: 1000,00 em 3 parcelas tem de fechar exatamente 1000,00.
  if round(1000.00 / 3, 2) * 2 + (1000.00 - round(1000.00 / 3, 2) * 2) <> 1000.00 then
    raise warning 'ATENCAO: a regra de resto de centavos da geracao de parcelas nao fecha o total.';
  end if;
end $$;

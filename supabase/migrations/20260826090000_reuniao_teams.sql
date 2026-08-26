-- =============================================================================
-- Apsis Carbon - vinculo entre a reuniao do portal e o evento do Teams
-- Arquivo: 20260826090000_reuniao_teams.sql
-- =============================================================================
-- O QUE HABILITA: criar a reuniao do Teams pela tela de Reunioes, com os
-- convidados escolhidos ali e a serie recorrente gerenciada pelo portal.
--
-- POR QUE SO ESTAS COLUNAS. O evento vive no Microsoft Graph, nao aqui. Guardar
-- horario, participantes e recorrencia no banco criaria uma SEGUNDA verdade: a
-- pessoa move a reuniao pelo Outlook, o Graph sabe, o banco nao, e a tela passa
-- a mostrar um horario que nao existe. Guardamos o PONTEIRO (o id do evento) e
-- o que e caro de buscar (o link de entrada). O resto e lido do Graph quando
-- precisa.
--
-- `teams_evento_id` e o id do evento-MESTRE quando ha serie. E dele que saem
-- PATCH da serie inteira e a lista de ocorrencias.
--
-- Idempotente.
-- =============================================================================

alter table public.carbon_reunioes
  add column if not exists teams_evento_id  text,
  add column if not exists teams_join_url   text,
  add column if not exists teams_web_link   text,
  add column if not exists teams_serie      boolean not null default false,
  add column if not exists teams_organizador text,
  add column if not exists teams_criado_em  timestamptz;

comment on column public.carbon_reunioes.teams_evento_id is
  'Id do evento no Microsoft Graph. Quando a reuniao e uma serie, e o id do evento MESTRE: PATCH nele altera a serie inteira e /instances lista as ocorrencias. NULL significa reuniao registrada no portal sem evento no Teams, que e o caso das 93 reunioes historicas importadas do Notion.';
comment on column public.carbon_reunioes.teams_join_url is
  'Link de entrada na sala do Teams (onlineMeeting.joinUrl). Guardado porque busca-lo exige uma chamada ao Graph por reuniao, e a lista mostra dezenas de uma vez. Nao e segredo: quem tem o link entra na sala, e por isso ele NAO vai para o portal do cliente.';
comment on column public.carbon_reunioes.teams_organizador is
  'Caixa dona do evento. Guardada por reuniao, e nao lida da config, porque a caixa organizadora pode mudar com o tempo: sem registrar qual foi usada, o PATCH e o DELETE de uma reuniao antiga bateriam na caixa errada e voltariam 404.';
comment on column public.carbon_reunioes.teams_serie is
  'true quando o evento foi criado com recorrencia. Decide se a tela oferece "cancelar esta ocorrencia" ou apenas "cancelar a reuniao".';

-- Uma reuniao do portal aponta para UM evento, e um evento pertence a UMA
-- reuniao. Sem isto, dois cliques no botao de criar gerariam dois eventos, os
-- convidados receberiam dois convites e o segundo id sobrescreveria o primeiro -
-- deixando um evento orfao na agenda de todo mundo, sem nada no banco que o
-- alcance para cancelar.
create unique index if not exists carbon_reunioes_teams_evento_uidx
  on public.carbon_reunioes (teams_evento_id)
  where teams_evento_id is not null;

-- A tela filtra "reunioes com Teams" para oferecer o botao de entrar.
create index if not exists carbon_reunioes_com_teams_idx
  on public.carbon_reunioes (data desc)
  where teams_evento_id is not null;

notify pgrst, 'reload schema';

-- =============================================================================
-- Apsis Carbon - Secure Share: entrada por CODIGO no e-mail, sem senha
-- Arquivo: 20260823090000_secure_share_sem_senha.sql (repositorio do Portal)
-- =============================================================================
-- O pedido do dono, textual: "o acesso ao secure share da carbon deve ser quando
-- eu alocar um usuario a um projeto no secure share do portal da carbon e n deve
-- ter senha (a logica e que deve ser enviado um email para a pessoa como 2fa ou
-- mfa)".
--
-- Esta migration vive no repositorio do PORTAL, e nao no do portal do cliente,
-- porque redefine as DUAS views de listagem, que nascem em
-- 20260817120000_secure_share.sql, e porque o repositorio secure-share-carbon
-- deixa de ter pasta de migrations.
--
-- --------------------------------------------------------------------------
-- ADITIVA, E ISSO E O DESENHO
-- --------------------------------------------------------------------------
-- Nada e removido: senha_hash, senha_definida_em, access_token e as funcoes
-- carbon_secure_share_definir_senha, _autenticar e _trocar_senha continuam
-- exatamente como estao. Depois de aplicar, o sistema segue funcionando como
-- hoje para quem usa; quem vira a chave e o DEPLOY das Edge Functions.
-- Consequencias praticas: a janela de indisponibilidade e zero, e o ROLLBACK e
-- redeploy das funcoes, sem nenhuma etapa de banco.
--
-- carbon_secure_share_autenticar (a de senha) fica INTOCADA de proposito. Ela e
-- o caminho publicado e funcionando hoje, e nao se embarca uma regressao
-- possivel num caminho que funciona dentro de uma entrega de seguranca. Quem a
-- substitui e carbon_secure_share_autorizar, criada na secao 3. A limpeza das
-- colunas e das funcoes de senha e uma migration propria, depois do corte, e so
-- quando `select count(*) from carbon_secure_share_clientes where senha_hash is
-- not null and ultimo_acesso is null` der zero.
--
-- --------------------------------------------------------------------------
-- DEPENDENCIAS
-- --------------------------------------------------------------------------
--   20260817120000_secure_share.sql   tabelas carbon_secure_share_* e as views
--   20260818120000_portal_cliente.sql tabela carbon_secure_share_tentativas
--
-- A segunda nasceu no repositorio secure-share-carbon e esta sendo trazida para
-- ca. Se ela nao estiver aplicada, a secao 7 falha com "relation does not
-- exist" e a migration inteira aborta dentro da transacao. E o comportamento
-- desejado: meia migration aplicada seria pior.
--
-- --------------------------------------------------------------------------
-- COMO APLICAR
-- --------------------------------------------------------------------------
-- Pelo SQL Editor, e depois registrar com `supabase migration repair --status
-- applied 20260823090000`. `supabase db push` esta suspenso: ha 12 migrations
-- pendentes de 20260812 e 20260814, todas ANTERIORES a 20260817 que ja esta
-- aplicada, entao a CLI recusa por fora de ordem e com --include-all arrastaria
-- centenas de KB de SQL nunca executado, incluindo `create extension postgis`.
--
-- Idempotente: pode ser reaplicada sem erro.
--
-- --------------------------------------------------------------------------
-- O QUE NAO ESTA AQUI, E POR QUE (para a proxima sessao nao reabrir)
-- --------------------------------------------------------------------------
--   1. NENHUMA COLUNA E NENHUMA TABELA DE IP. O caminho /api do frontend e um
--      REWRITE de proxy da hospedagem, entao a borda do Supabase enxerga o IP de
--      saida do Amplify/CloudFront e nao o do cliente: um teto por origem
--      colocaria a base inteira num balde so e viraria apagao. E guardar resumo
--      de IP na mesma linha do e-mail reverteria a decisao de LGPD ja escrita em
--      20260818120000_portal_cliente.sql (secao 1: "Nao guardamos IP nem user
--      agent"). Os freios daqui contam por e-mail e por resumo de e-mail.
--   2. NENHUMA TABELA DE DISPOSITIVO LEMBRADO. "Lembrar este dispositivo" esta
--      fora de escopo por decisao do dono, e nao fica meio-pronto aqui. A sessao
--      continua com 8 horas em sessionStorage DE PROPOSITO, porque o cliente
--      costuma acessar de maquina compartilhada e a sessao deve morrer ao fechar
--      a aba (ver secure-share-carbon/src/lib/sessao.js).
--   3. NENHUM INTERRUPTOR EM carbon_app_config. O frontend do portal do cliente
--      nao tem endpoint de configuracao publica nem forma de saber o modo:
--      desligar a chave faria o backend parar de emitir codigo enquanto a unica
--      tela publicada continua pedindo codigo. Isso e kill switch, nao rollback.
--   4. carbon_app_config NAO E TOCADA. O remetente continua portal@apsis.com.br
--      e portalUrl continua vazio (o portal do cliente ainda nao foi publicado).
--      Trocar qualquer um dos dois e UPDATE na linha `secure_share`, sem
--      redeploy. O convite e o e-mail de codigo PRECISAM sair com portalUrl
--      vazio, sem botao e sem link: se o convite fosse recusado por falta de
--      URL, o portao da secao 1 viraria uma porta que ninguem consegue abrir.
--
-- --------------------------------------------------------------------------
-- LGPD - Lei 13.709/2018
-- --------------------------------------------------------------------------
-- Duas tabelas novas guardam e-mail de pessoa fisica externa:
--   carbon_secure_share_pedidos  resumo HMAC sempre; e-mail em claro SOMENTE
--                                quando o endereco ja e cliente cadastrado
--                                (desfechos enviado e envio_falhou). Retencao de
--                                72 horas, na secao 8.
--   carbon_secure_share_codigos  e-mail em claro, mas so de quem ja e cliente:
--                                a Edge Function so grava codigo depois de
--                                carbon_secure_share_elegivel dizer sim.
--                                Retencao de minutos, na secao 8.
-- Finalidade das duas: seguranca da propria autenticacao do titular. Nenhuma
-- guarda IP, user agent, telefone ou campo livre.
-- =============================================================================

-- gen_random_uuid vem do core desde o Postgres 13; pgcrypto continua exigida
-- pelas funcoes de senha de 20260817120000, que esta migration nao remove. O
-- `if not exists` mantem o arquivo reaplicavel.
create extension if not exists pgcrypto with schema extensions;


-- =============================================================================
-- 1. O portao: convite enviado, por LINHA
-- =============================================================================
-- Ate hoje o portao e `senha_hash is not null`. Sem senha, ele NAO pode ser a
-- mera existencia da linha do cliente: carbon_secure_share_autenticar agrega por
-- e-mail em TODOS os projetos (20260817120000, secao 8.2), e o que hoje limita o
-- escopo as linhas certas e o par senha_hash + crypt. Tirando a senha e sem
-- portao, um cadastro digitado errado no projeto B entraria na sessao de quem ja
-- e cliente do projeto A, num login rotineiro, sem ninguem ter enviado nada.
--
-- convite_enviado_em fica na MESMA clausula where da agregacao, entao ele
-- restaura a limitacao por linha. E, como o convite passa a sair automaticamente
-- no cadastro (caixa "Avisar agora" marcada por padrao), ele nunca e um passo
-- esquecivel: ou o e-mail saiu e o acesso existe, ou o envio falhou e a tela da
-- APSIS mostra "Convite nao enviado" em ambar.

alter table public.carbon_secure_share_clientes
  add column if not exists convite_enviado_em   timestamptz,
  add column if not exists convite_enviado_por  uuid references public.carbon_usuarios (id),
  add column if not exists convite_dia          date,
  add column if not exists convite_no_dia       smallint not null default 0,
  add column if not exists ultimo_acesso_origem text;

-- drop + add em vez de `add constraint if not exists` (que nao existe em
-- Postgres) para o arquivo continuar reaplicavel quando a lista de origens
-- mudar.
alter table public.carbon_secure_share_clientes
  drop constraint if exists carbon_ss_clientes_origem_chk;
alter table public.carbon_secure_share_clientes
  add constraint carbon_ss_clientes_origem_chk check (
    ultimo_acesso_origem is null or ultimo_acesso_origem in ('senha', 'codigo')
  );

comment on column public.carbon_secure_share_clientes.convite_enviado_em is
  'Momento em que o Microsoft Graph ACEITOU o convite (HTTP 202), que nao e entrega: a mensagem ainda pode voltar como NDR. E o PORTAO do modelo sem senha, no lugar de `senha_hash is not null`, e vale POR LINHA: cada vinculo cliente/projeto so entra na sessao se o convite daquele vinculo tiver saido. Preenchido DEPOIS do envio, nunca antes.';
comment on column public.carbon_secure_share_clientes.convite_enviado_por is
  'Colaborador da APSIS que disparou o ultimo convite. Trilha de auditoria: no modelo sem senha, enviar o convite E conceder o acesso. Fica NULL para as linhas preenchidas pelo backfill abaixo, porque nao ha a quem atribuir um envio que aconteceu antes desta coluna existir.';
comment on column public.carbon_secure_share_clientes.convite_dia is
  'Dia (fuso America/Sao_Paulo) a que se refere convite_no_dia. Guardado junto do contador para o teto diario nao precisar de tabela nem de varredura.';
comment on column public.carbon_secure_share_clientes.convite_no_dia is
  'Convites disparados para este cliente no dia convite_dia. Teto diario sem tabela nova. O reenvio e um botao AUTENTICADO: um colega insistindo nao e ataque, mas enche a caixa do cliente e queima a reputacao do remetente, que e COMPARTILHADO com o e-mail de codigo. Nao confundir com o teto da secao 5, que e do endpoint publico.';
comment on column public.carbon_secure_share_clientes.ultimo_acesso is
  'Carimbo da ultima entrada bem-sucedida. ATENCAO AO VALOR PROBATORIO: ate a entrada por codigo, este carimbo era sempre precedido de posse de um SEGREDO (bcrypt). Agora e precedido de posse da CAIXA DE E-MAIL. Leia sempre junto de ultimo_acesso_origem.';
comment on column public.carbon_secure_share_clientes.ultimo_acesso_origem is
  'Como foi a ultima entrada: codigo (e-mail de uso unico) ou senha. NULL significa entrada anterior a esta migration OU entrada pelo caminho legado de senha, que NAO carimba: carbon_secure_share_autenticar fica intocada de proposito, para a migration seguir aditiva e o rollback nao ter etapa de banco. O valor senha existe no check para um backfill futuro, se alguem quiser distinguir os dois casos antes do corte.';

-- BACKFILL OBRIGATORIO. Sem ele, todo cliente que hoje tem acesso perde o acesso
-- no dia da virada, e a tela do Portal mostra "Convite nao enviado" para todos.
-- coalesce(senha_definida_em, criado_em): senha_definida_em e o carimbo do envio
-- de acesso, que e o convite do modelo antigo; criado_em cobre a linha que tem
-- hash sem carimbo (possivel via carbon_secure_share_trocar_senha, que grava
-- senha_definida_em, e via qualquer correcao manual que nao tenha gravado).
--
-- CONFERENCIA depois de aplicar, comparando com o retrato tirado antes:
--   select situacao, count(*) from public.carbon_secure_share_clientes_listagem
--    group by situacao;
-- Se `sem_convite` pulou para perto do total, o backfill falhou.
--
-- O `not exists` e o que faz o backfill rodar UMA vez, e nao a cada reaplicacao.
-- Sem ele, este arquivo teria um modo de falha desagradavel: a rota de troca de
-- endereco do cliente ZERA convite_enviado_em de proposito (trocar o e-mail sem
-- fechar o acesso seria uma primitiva de tomada de conta), e reaplicar a
-- migration depois disso devolveria o acesso, em silencio, a um vinculo que
-- alguem fechou de proposito - bastando que a linha ainda tenha senha_hash do
-- modelo antigo. Enquanto ninguem tiver convite, esta e a primeira aplicacao;
-- do primeiro convite em diante, o UPDATE inteiro vira no-op. A subconsulta le o
-- snapshot do inicio do comando, entao ela nao enxerga as linhas que o proprio
-- UPDATE esta gravando e todas as linhas elegiveis sao tratadas igual.
update public.carbon_secure_share_clientes
   set convite_enviado_em = coalesce(senha_definida_em, criado_em)
 where convite_enviado_em is null
   and senha_hash is not null
   and not exists (
     select 1 from public.carbon_secure_share_clientes
      where convite_enviado_em is not null
   );


-- =============================================================================
-- 2. Freio do reenvio de convite
-- =============================================================================
-- DUAS funcoes: a permissao e conferida ANTES do envio e o registro acontece
-- DEPOIS. Reservar antes e desfazer na falha e o desenho atual do envio de senha
-- (a rota grava o hash e so entao envia), e foi ele que produziu o codigo de
-- erro email_falhou_senha_trocada, que existe para contar ao operador que a
-- senha do cliente mudou num envio que nao chegou. Sem senha nao ha nada de
-- irreversivel a gravar: um envio que falha nao deixa marca, e o operador ve a
-- verdade na tela.

create or replace function public.carbon_secure_share_convite_permitido(
  p_cliente_id uuid,
  p_min_freio  integer default 10,
  p_teto_dia   integer default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v        record;
  v_espere integer;
begin
  select convite_enviado_em, convite_dia, convite_no_dia
    into v
    from public.carbon_secure_share_clientes
   where id = p_cliente_id;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrado');
  end if;

  if v.convite_enviado_em is not null
     and v.convite_enviado_em > now() - make_interval(mins => p_min_freio) then
    v_espere := greatest(1, ceil(extract(epoch from
      (v.convite_enviado_em + make_interval(mins => p_min_freio) - now())) / 60)::integer);
    return jsonb_build_object('ok', false, 'motivo', 'convite_recente', 'espere_min', v_espere);
  end if;

  if v.convite_dia = (now() at time zone 'America/Sao_Paulo')::date
     and v.convite_no_dia >= p_teto_dia then
    return jsonb_build_object('ok', false, 'motivo', 'teto_diario_convite');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.carbon_secure_share_convite_permitido(uuid, integer, integer) is
  'Diz se a APSIS pode disparar mais um convite para este cliente agora. Conferida ANTES do envio; quem registra e carbon_secure_share_convite_registrado, DEPOIS. Freio de 10 minutos entre convites e teto de 5 por dia (fuso America/Sao_Paulo). Nao e defesa contra ataque - o botao e autenticado -, e sim contra o colega que insiste e enche a caixa do cliente, queimando a reputacao do remetente, que e o MESMO usado pelo e-mail de codigo do endpoint publico.';

create or replace function public.carbon_secure_share_convite_registrado(
  p_cliente_id uuid,
  p_por        uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_ok   boolean;
begin
  update public.carbon_secure_share_clientes
     set convite_enviado_em  = now(),
         convite_enviado_por = coalesce(p_por, convite_enviado_por),
         convite_no_dia      = case when convite_dia = v_hoje then convite_no_dia + 1 else 1 end,
         convite_dia         = v_hoje
   where id = p_cliente_id
   returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

comment on function public.carbon_secure_share_convite_registrado(uuid, uuid) is
  'Carimba o convite DEPOIS de o Graph aceitar a mensagem, e com isso ABRE o acesso daquela linha: convite_enviado_em e o portao. Devolve false quando nenhum cliente tem o id informado. p_por fica NULL quando o disparo nao veio de uma pessoa; coalesce preserva o ultimo remetente conhecido em vez de apagar a trilha.';


-- =============================================================================
-- 3. Elegibilidade, autorizacao e contexto
-- =============================================================================
-- FUSO: `(now() at time zone 'America/Sao_Paulo')::date`, e nao current_date. O
-- Postgres do Supabase roda em UTC; com current_date, quem tem acesso_fim = hoje
-- perderia o acesso as 21h de Brasilia em vez da meia-noite. A correcao vale
-- para as funcoes desta secao E para as duas views da secao 4: se so metade
-- usasse o fuso, das 21h a meia-noite a tela da APSIS diria "expirado" enquanto
-- o cliente continuaria entrando e baixando normalmente.
--
-- Ficam de fora, de proposito, as funcoes de senha de 20260817120000, que ainda
-- comparam com current_date: mexer nelas seria mudar comportamento do caminho
-- publicado, e esta migration e aditiva. Elas somem no corte.

-- returns BOOLEAN, e nao jsonb: esta funcao decide se um e-mail SAI. Com jsonb,
-- um `if (!elegivel)` em JavaScript nunca entraria (objeto e sempre truthy) e a
-- funcao viraria relay aberto de mensagens com a marca da APSIS.
create or replace function public.carbon_secure_share_elegivel(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
      from public.carbon_secure_share_clientes c
      join public.carbon_secure_share_projetos pr on pr.id = c.projeto_id
     where lower(btrim(c.email)) = lower(btrim(coalesce(p_email, '')))
       and c.status  = 'ativo'
       and pr.status = 'ativo'
       and c.convite_enviado_em is not null
       and (c.acesso_inicio is null or c.acesso_inicio <= (now() at time zone 'America/Sao_Paulo')::date)
       and (c.acesso_fim    is null or c.acesso_fim    >= (now() at time zone 'America/Sao_Paulo')::date)
  );
$$;

comment on function public.carbon_secure_share_elegivel(text) is
  'Diz se vale a pena mandar um codigo para este endereco. Roda EXATAMENTE as condicoes de carbon_secure_share_autorizar, sem carimbar nada. NUNCA pode ser usada para responder ao cliente se ele tem acesso: o endpoint publico de pedir codigo devolve o MESMO corpo, o MESMO status e em tempo comparavel nos dois casos. Confirmar que um endereco tem cadastro ja revelaria que aquela pessoa e cliente da APSIS num projeto de carbono.';

-- Substitui carbon_secure_share_autenticar no caminho novo. Nao recebe segredo
-- nenhum: quem prova a identidade e carbon_secure_share_conferir_codigo, na
-- secao 6, e a Edge Function so chama esta funcao depois de o codigo conferir.
create or replace function public.carbon_secure_share_autorizar(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email    text := lower(btrim(coalesce(p_email, '')));
  v_hoje     date := (now() at time zone 'America/Sao_Paulo')::date;
  v_projetos jsonb;
begin
  if v_email = '' then
    return jsonb_build_object('autorizado', false);
  end if;

  select jsonb_agg(
           jsonb_build_object(
             'cliente_id', c.id,
             'projeto_id', pr.id,
             'ap_os',      pr.ap_os,
             'empresa',    pr.empresa,
             'pasta',      coalesce(pr.pasta, public.carbon_secure_share_nome_pasta(pr.ap_os, pr.empresa)),
             'nome',       c.nome
           )
           order by pr.empresa
         )
    into v_projetos
    from public.carbon_secure_share_clientes c
    join public.carbon_secure_share_projetos pr on pr.id = c.projeto_id
   where lower(btrim(c.email)) = v_email
     and c.status  = 'ativo'
     and pr.status = 'ativo'
     and c.convite_enviado_em is not null
     and (c.acesso_inicio is null or c.acesso_inicio <= v_hoje)
     and (c.acesso_fim    is null or c.acesso_fim    >= v_hoje);

  if v_projetos is null then
    return jsonb_build_object('autorizado', false);
  end if;

  -- CARIMBA ultimo_acesso. Sem isto a coluna fica NULL para sempre depois que
  -- carbon_secure_share_autenticar sair de uso, e a coluna "Viu em" das telas da
  -- APSIS e os agregados das duas views mostrariam vazio permanentemente. E a
  -- evidencia de que o material foi efetivamente entregue.
  update public.carbon_secure_share_clientes
     set ultimo_acesso        = now(),
         ultimo_acesso_origem = 'codigo'
   where id in (
     select (item ->> 'cliente_id')::uuid from jsonb_array_elements(v_projetos) as item
   );

  return jsonb_build_object('autorizado', true, 'projetos', v_projetos);
end;
$$;

comment on function public.carbon_secure_share_autorizar(text) is
  'Resolve o escopo da sessao de um cliente que JA provou a identidade pelo codigo, e carimba ultimo_acesso nas linhas autorizadas. Concentra todas as condicoes de acesso numa funcao so - cliente ativo, projeto ativo, convite enviado e janela acesso_inicio/acesso_fim - para o portal do cliente nao poder esquecer de checar uma delas. A Edge Function deve assinar o token com os projetos daqui e NUNCA aceitar projeto vindo do navegador: foi assim que o IDOR original foi fechado.';

-- Contexto de UMA requisicao de arquivo. Substitui o select solto de
-- _shared/permissoes.ts. Passa a valer POR REQUISICAO o status do cliente, o
-- status do projeto, o convite e a janela acesso_inicio/acesso_fim: hoje isso e
-- conferido uma vez so, no login, e a sessao de 8 horas atravessa a revogacao e
-- o vencimento do prazo. E o que atende ao "n tire a funcao de travar o acesso
-- de alguem por um periodo apenas".
--
-- CUSTO HONESTO: para a pasta Geral isto ACRESCENTA uma ida ao banco que hoje
-- nao existe (o resolvedor da Geral e permissivo sem nenhum I/O). E o preco de a
-- Geral deixar de ser o unico caminho que nao confere nada alem da assinatura do
-- token.
create or replace function public.carbon_secure_share_contexto(
  p_email      text,
  p_projeto_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'vale', exists(
      select 1
        from public.carbon_secure_share_clientes c
        join public.carbon_secure_share_projetos pr on pr.id = c.projeto_id
       where lower(btrim(c.email)) = lower(btrim(coalesce(p_email, '')))
         and c.status  = 'ativo'
         and pr.status = 'ativo'
         and c.convite_enviado_em is not null
         and (p_projeto_id is null or pr.id = p_projeto_id)
         and (c.acesso_inicio is null or c.acesso_inicio <= (now() at time zone 'America/Sao_Paulo')::date)
         and (c.acesso_fim    is null or c.acesso_fim    >= (now() at time zone 'America/Sao_Paulo')::date)
    ),
    'regras', coalesce((
      select jsonb_agg(jsonb_build_object(
               'item_path',           p.item_path,
               'emails_negados',      p.emails_negados,
               'emails_sem_download', p.emails_sem_download))
        from public.carbon_secure_share_permissoes p
       where p_projeto_id is not null and p.projeto_id = p_projeto_id
    ), '[]'::jsonb)
  );
$$;

comment on function public.carbon_secure_share_contexto(text, uuid) is
  'Contexto de UMA requisicao de arquivo: `vale` diz se o acesso ainda existe AGORA (cliente ativo, projeto ativo, convite enviado e dentro da janela de datas) e `regras` traz as permissoes por item daquele projeto. Uma ida ao banco em vez de duas, e por requisicao em vez de uma vez no login: e o que faz revogacao e prazo vencido valerem na requisicao seguinte, sem esperar as 8 horas da sessao. p_projeto_id nulo e a pasta Geral, que por definicao nao tem permissao por item e por isso recebe regras vazias.';


-- =============================================================================
-- 4. As DUAS views de listagem
-- =============================================================================
-- Sao duas, e nao uma: carbon_secure_share_projetos_listagem tambem deriva de
-- senha_hash nos agregados clientes_liberados e clientes_sem_acesso. Consertando
-- so a de clientes, a tela de LISTA DE PROJETOS passaria a mostrar
-- "0 liberados / N sem acesso" em todo projeto sem senha: a mesma regressao
-- silenciosa, um nivel acima.
--
-- ORDEM DOS CASOS em `situacao`: sem_convite e o ULTIMO, e nao o primeiro como
-- sem_credencial era. Sob o modelo novo quem manda no acesso e status, prazo e
-- janela; o convite pendente e so um aviso. Manter a ordem antiga faria um
-- cliente com prazo vencido aparecer como "convite nao enviado", escondendo o
-- motivo real do bloqueio.
--
-- DROP antes de CREATE, e nao `create or replace view`, para o arquivo continuar
-- idempotente agora que a lista de colunas mudou.

drop view if exists public.carbon_secure_share_clientes_listagem;
drop view if exists public.carbon_secure_share_projetos_listagem;

create view public.carbon_secure_share_clientes_listagem
  with (security_invoker = true)
as
select
  c.id,
  c.projeto_id,
  c.nome,
  c.email,
  c.acesso_inicio,
  c.acesso_fim,
  c.ultimo_acesso,
  c.ultimo_acesso_origem,
  c.status,
  c.criado_em,
  (c.convite_enviado_em is not null) as acesso_enviado,
  c.convite_enviado_em,
  c.convite_no_dia,
  -- Mantida enquanto a senha existir: e o unico jeito de a tela distinguir um
  -- cliente do modelo antigo de um do modelo novo durante a transicao. Sai na
  -- migration do corte, junto com a coluna.
  c.senha_definida_em,
  case
    when c.status <> 'ativo' then 'revogado'
    when c.acesso_fim    is not null
     and c.acesso_fim    < (now() at time zone 'America/Sao_Paulo')::date then 'expirado'
    when c.acesso_inicio is not null
     and c.acesso_inicio > (now() at time zone 'America/Sao_Paulo')::date then 'agendado'
    when c.convite_enviado_em is null then 'sem_convite'
    else 'liberado'
  end as situacao
from public.carbon_secure_share_clientes c;

comment on view public.carbon_secure_share_clientes_listagem is
  'Clientes de um projeto SEM access_token e SEM qualquer derivada de senha_hash: a ausencia das colunas e a garantia de que segredo nao escapa por um select mal escrito na Edge Function. acesso_enviado passou a significar "o convite saiu", que no modelo sem senha e a mesma coisa que "tem acesso", porque o convite E o portao. situacao mudou de ordem: sem_convite so aparece quando nenhum outro caso se aplica, senao um cliente com prazo vencido apareceria como convite pendente e o operador reenviaria convite sem resolver nada.';

create view public.carbon_secure_share_projetos_listagem
  with (security_invoker = true)
as
select
  p.id,
  p.ap_os,
  p.empresa,
  coalesce(p.pasta, public.carbon_secure_share_nome_pasta(p.ap_os, p.empresa)) as pasta,
  p.status,
  p.criado_por,
  p.criado_em,
  p.atualizado_em,
  u.email as criado_por_email,
  u.nome  as criado_por_nome,
  coalesce(c.clientes, 0)            as clientes,
  coalesce(c.clientes_liberados, 0)  as clientes_liberados,
  coalesce(c.clientes_sem_acesso, 0) as clientes_sem_acesso,
  c.ultimo_acesso,
  coalesce(e.equipe, 0)              as equipe,
  coalesce(r.restricoes, 0)          as restricoes
from public.carbon_secure_share_projetos p
left join public.carbon_usuarios u on u.id = p.criado_por
left join (
  select
    projeto_id,
    count(*)::integer as clientes,
    -- "Liberado" agora e a MESMA conta de carbon_secure_share_elegivel, menos o
    -- status do projeto (que e a linha de fora do agregado). Antes era so
    -- `senha_hash is not null`, que dizia "tem credencial" e nao "consegue
    -- entrar": um cliente com prazo vencido contava como liberado.
    (count(*) filter (
       where status = 'ativo'
         and convite_enviado_em is not null
         and (acesso_inicio is null or acesso_inicio <= (now() at time zone 'America/Sao_Paulo')::date)
         and (acesso_fim    is null or acesso_fim    >= (now() at time zone 'America/Sao_Paulo')::date)
     ))::integer as clientes_liberados,
    -- Conta so cliente ATIVO: revogado nao e "falta enviar convite", e ele ja
    -- aparece como revogado na outra tela. Somar os dois faria o operador
    -- perseguir um convite que nao deve sair.
    (count(*) filter (
       where status = 'ativo' and convite_enviado_em is null
     ))::integer as clientes_sem_acesso,
    max(ultimo_acesso) as ultimo_acesso
  from public.carbon_secure_share_clientes
  group by projeto_id
) c on c.projeto_id = p.id
left join (
  select projeto_id, count(*)::integer as equipe
  from public.carbon_secure_share_equipe
  group by projeto_id
) e on e.projeto_id = p.id
left join (
  select projeto_id, count(*)::integer as restricoes
  from public.carbon_secure_share_permissoes
  group by projeto_id
) r on r.projeto_id = p.id;

comment on view public.carbon_secure_share_projetos_listagem is
  'Projetos do Secure Share com o nome da pasta resolvido e os agregados que a listagem mostra. clientes_liberados e clientes_sem_acesso deixaram de derivar de senha_hash e passaram a derivar de convite_enviado_em mais a janela de datas, com o fuso America/Sao_Paulo igual ao das funcoes: com current_date, das 21h a meia-noite esta tela diria expirado enquanto o cliente continuaria entrando.';

-- Recriar uma view ZERA os grants dela, e no Supabase as default privileges do
-- schema public devolvem select a anon e authenticated no objeto novo. Sem estas
-- linhas, esta migration abriria nome e e-mail de pessoa fisica para qualquer
-- portador da anon key.
revoke all on public.carbon_secure_share_clientes_listagem from anon, authenticated, public;
revoke all on public.carbon_secure_share_projetos_listagem from anon, authenticated, public;

-- Explicito, e nao herdado das default privileges: se elas estiverem diferentes
-- neste projeto, a listagem do Portal quebraria com "permission denied for
-- view" e o sintoma seria um 500 generico na tela.
grant select on public.carbon_secure_share_clientes_listagem to service_role;
grant select on public.carbon_secure_share_projetos_listagem to service_role;


-- =============================================================================
-- 5. Pedidos de codigo: os freios e o caminho de suporte
-- =============================================================================
-- Conta por resumo_email (HMAC calculado na Edge Function) justamente para poder
-- existir para endereco SEM cadastro: um contador que so conhecesse clientes
-- transformaria "espere N segundos" num oraculo de existencia, e bastariam 5
-- requisicoes por endereco para enumerar a carteira pela interface.
--
-- SEM COLUNA DE IP. Ver o item 1 do cabecalho: atras do rewrite de proxy todo
-- cliente cai num balde so, e resumo de IP na mesma linha do e-mail reverteria a
-- decisao de LGPD ja escrita em 20260818120000_portal_cliente.sql.
--
-- E o unico lugar onde a APSIS enxerga que alguem pediu codigo e nao recebeu:
-- como o endpoint responde 200 mesmo quando o envio falha (nao existe resposta
-- "envio indisponivel", que seria alcancavel so por endereco elegivel e portanto
-- seria o oraculo que o desenho proibe), o desfecho envio_falhou aqui e a UNICA
-- evidencia. O caminho de saida para a pessoa e o botao "Reenviar convite" do
-- Portal.

create table if not exists public.carbon_secure_share_pedidos (
  id           uuid primary key default gen_random_uuid(),
  resumo_email text        not null,
  email        text,
  motivo       text        not null default 'pedido',
  pedido_em    timestamptz not null default now(),
  desfecho_em  timestamptz,
  constraint carbon_ss_pedidos_resumo_chk check (resumo_email ~ '^[0-9a-f]{64}$'),
  constraint carbon_ss_pedidos_motivo_chk check (motivo in (
    'pedido', 'enviado', 'sem_acesso', 'envio_falhou', 'erro_elegibilidade',
    'freio_minuto', 'teto_diario', 'teto_global', 'alerta_global'))
);

comment on table public.carbon_secure_share_pedidos is
  'Pedidos de codigo no endpoint publico, para os freios e para a APSIS enxergar quem pediu e nao recebeu. LGPD: a chave e o resumo HMAC do endereco, nao o endereco; e-mail em claro so nos desfechos enviado e envio_falhou, ou seja, so quando a pessoa ja e cliente cadastrado. Retencao de 72 horas (carbon_secure_share_limpar_pedidos). NAO guarda IP: atras do rewrite de proxy da hospedagem todo cliente tem o mesmo IP de origem, entao um teto por origem viraria apagao geral.';
comment on column public.carbon_secure_share_pedidos.resumo_email is
  'HMAC-SHA256 do endereco em minusculas, em hex de 64. Calculado na Edge Function com pepper derivado de SESSION_SECRET, entao o banco sozinho nao reverte a lista de quem tentou entrar, e mesmo assim o contador funciona para endereco sem cadastro nenhum.';
comment on column public.carbon_secure_share_pedidos.motivo is
  'Ultimo estado do pedido. pedido nasce no registro; enviado, sem_acesso, envio_falhou e erro_elegibilidade sao desfechos gravados pela Edge Function; freio_minuto, teto_diario e teto_global sao recusas dos freios; alerta_global e a linha unica por hora que denuncia saturacao do teto global. ATENCAO: so os cinco primeiros contam para os tetos - contar as recusas faria o proprio freio alimentar o freio.';

create index if not exists carbon_ss_pedidos_email_idx
  on public.carbon_secure_share_pedidos (resumo_email, pedido_em desc);
create index if not exists carbon_ss_pedidos_expurgo_idx
  on public.carbon_secure_share_pedidos (pedido_em);

alter table public.carbon_secure_share_pedidos enable row level security;
revoke all on table public.carbon_secure_share_pedidos from anon, authenticated, public;
grant all  on table public.carbon_secure_share_pedidos to service_role;

create or replace function public.carbon_secure_share_pedido_registrar(
  p_resumo_email text,
  p_seg_freio    integer default 60,
  p_teto_dia     integer default 20,
  p_teto_global  integer default 200
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ultimo timestamptz;
  v_espere integer;
  v_conta  integer;
  v_alerta boolean := false;
  v_id     uuid;
  -- Motivos que CONTAM para os tetos. As recusas ficam de fora: se contassem, o
  -- primeiro freio alimentaria o segundo e um endereco recusado uma vez ficaria
  -- recusado o dia inteiro.
  c_uteis  text[] := array['pedido', 'enviado', 'sem_acesso', 'envio_falhou', 'erro_elegibilidade'];
begin
  if coalesce(p_resumo_email, '') !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'motivo', 'formato');
  end if;

  -- Advisory lock, e nao `select ... for update`: FOR UPDATE tranca linhas que
  -- EXISTEM, e no primeiro pedido de um endereco nao ha linha nenhuma para
  -- trancar. Sem ele, dois pedidos simultaneos passam os dois pelo freio.
  perform pg_advisory_xact_lock(hashtext('ss_pedido:' || p_resumo_email));

  select max(pedido_em)
    into v_ultimo
    from public.carbon_secure_share_pedidos
   where resumo_email = p_resumo_email
     and motivo = any(c_uteis)
     and pedido_em > now() - make_interval(secs => p_seg_freio);

  if v_ultimo is not null then
    v_espere := greatest(1, p_seg_freio - floor(extract(epoch from (now() - v_ultimo)))::integer);
    insert into public.carbon_secure_share_pedidos (resumo_email, motivo)
      values (p_resumo_email, 'freio_minuto');
    return jsonb_build_object('ok', false, 'motivo', 'freio_minuto', 'espere', v_espere);
  end if;

  select count(*)
    into v_conta
    from public.carbon_secure_share_pedidos
   where resumo_email = p_resumo_email
     and motivo = any(c_uteis)
     and pedido_em > now() - interval '24 hours';

  -- TETO DIARIO POR ENDERECO. Leia a aritmetica da forca bruta na secao 6 antes
  -- de mexer neste numero: com codigo de 6 digitos e 5 palpites por codigo, este
  -- teto e um FATOR DIRETO da chance anual de invasao. Dobrar 20 para 40 dobra a
  -- chance. Ele nao e conforto, e defesa.
  if v_conta >= p_teto_dia then
    insert into public.carbon_secure_share_pedidos (resumo_email, motivo)
      values (p_resumo_email, 'teto_diario');
    return jsonb_build_object('ok', false, 'motivo', 'teto_diario');
  end if;

  -- TETO GLOBAL: protege a reputacao do remetente, que e o ativo compartilhado.
  -- SEM isencao para "quem ja entrou": isencao por historico e um oraculo
  -- acionavel sob demanda (saturo o teto com enderecos descartaveis e leio a
  -- diferenca de comportamento). Custo declarado: durante um ataque, cliente
  -- legitimo tambem nao recebe codigo. Por isso a linha de alerta.
  perform pg_advisory_xact_lock(hashtext('ss_teto_global'));

  select count(*)
    into v_conta
    from public.carbon_secure_share_pedidos
   where motivo = any(c_uteis)
     and pedido_em > now() - interval '1 hour';

  if v_conta >= p_teto_global then
    select not exists(
             select 1 from public.carbon_secure_share_pedidos
              where motivo = 'alerta_global' and pedido_em > now() - interval '1 hour')
      into v_alerta;

    insert into public.carbon_secure_share_pedidos (resumo_email, motivo)
      values (p_resumo_email, 'teto_global');

    if v_alerta then
      insert into public.carbon_secure_share_pedidos (resumo_email, motivo)
        values (p_resumo_email, 'alerta_global');
    end if;

    return jsonb_build_object('ok', false, 'motivo', 'teto_global');
  end if;

  insert into public.carbon_secure_share_pedidos (resumo_email, motivo)
    values (p_resumo_email, 'pedido')
    returning id into v_id;

  return jsonb_build_object('ok', true, 'pedido_id', v_id);
end;
$$;

comment on function public.carbon_secure_share_pedido_registrar(text, integer, integer, integer) is
  'Aplica os tres freios do endpoint publico de pedir codigo e abre a linha do pedido: 1 por minuto e 20 por dia por endereco (contados pelo resumo HMAC, entao valem igualmente para endereco COM e SEM cadastro, e por isso nao sao oraculo), e 200 por hora no sistema inteiro. O teto global nao tem isencao para quem ja entrou: isencao por historico seria um oraculo acionavel sob demanda. Devolve {ok:false, motivo} para a Edge Function traduzir; ela responde 429 nos dois primeiros e 200 no terceiro, porque o teto global tem de ser indistinguivel de um envio comum.';

-- p_email COM DEFAULT: a Edge Function chama esta funcao com 2 argumentos em
-- dois caminhos e com 3 em outros dois. Sem o default, o PostgREST responde
-- PGRST202 exatamente nos caminhos de FALHA, que sao os que ninguem testa.
create or replace function public.carbon_secure_share_pedido_desfecho(
  p_pedido_id uuid,
  p_motivo    text,
  p_email     text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.carbon_secure_share_pedidos
     set motivo      = p_motivo,
         desfecho_em = now(),
         -- E-mail em claro SO nos dois desfechos que implicam cadastro
         -- existente. Nos demais a linha continua sendo so o resumo HMAC: o
         -- endereco de quem nao e cliente nao tem por que ficar guardado.
         email = case when p_motivo in ('enviado', 'envio_falhou')
                      then lower(btrim(p_email)) else email end
   where id = p_pedido_id;
end;
$$;

comment on function public.carbon_secure_share_pedido_desfecho(uuid, text, text) is
  'Fecha a linha de um pedido com o desfecho real. Grava o e-mail em claro APENAS em enviado e envio_falhou, porque so nesses casos o endereco ja e de um cliente cadastrado; nos demais a linha permanece anonima. envio_falhou e a unica evidencia de que alguem pediu e nao recebeu, ja que o endpoint responde 200 tambem quando o Graph recusa.';


-- =============================================================================
-- 6. O codigo
-- =============================================================================
-- NUNCA guarda o codigo. Guarda o HMAC-SHA256 de 'cod:<email>:<codigo>',
-- calculado na Edge Function com pepper derivado de SESSION_SECRET. O codigo em
-- claro nao chega ao Postgres, entao nao entra em log_statement nem em
-- pg_stat_statements - o mesmo cuidado que fez carbon_secure_share_definir_senha
-- receber a senha pronta em vez de sorteia-la aqui.
--
-- NAO E BCRYPT, DE PROPOSITO. Hash lento nao muda a conta de quem tem o dump de
-- um segredo de baixa entropia e vida de 10 minutos: com 10^6 possibilidades,
-- ate bcrypt custo 10 cai em minutos numa GPU. E num endpoint publico o custo do
-- hash lento vira alavanca de CPU contra nos. Quem protege contra o dump aqui e
-- o PEPPER, que nao esta no banco. O e-mail entra DENTRO do MAC, entao o codigo
-- de um endereco e inutil em outro.
--
-- -----------------------------------------------------------------------------
-- ARITMETICA DA FORCA BRUTA, COM 6 DIGITOS
-- -----------------------------------------------------------------------------
-- O dono escolheu 6 digitos; o plano recomendava 8. A conta esta escrita aqui
-- porque e ela que justifica os dois tetos, e porque com 6 digitos eles deixaram
-- de ser conforto e viraram DEFESA.
--
--   espaco de busca      10^6 = 1.000.000 de codigos
--   palpites por codigo  5, e acabou (ver o update la embaixo)
--   codigos por dia      p_teto_dia de carbon_secure_share_pedido_registrar
--
--   chance por dia = 5 * codigos_por_dia / 1.000.000
--   chance por ano = 365 * chance por dia, em ataque dirigido e sustentado
--
--     com  5 codigos/dia:  0,0025% ao dia  ->  cerca de 0,9% ao ano
--     com 20 codigos/dia:  0,01%   ao dia  ->  cerca de 3,6% ao ano  <- hoje
--
-- Com 8 digitos as duas linhas cairiam por 100. Quem mexer no teto diario, no
-- teto de palpites ou no numero de digitos REFAZ esta conta neste comentario:
-- um numero que envelheceu em silencio e pior do que nenhum. O ataque, note, e
-- barulhento: exige 20 e-mails por dia na caixa da vitima, todos registrados em
-- carbon_secure_share_pedidos.
--
-- A constante de digitos vive num lugar so, DIGITOS em
-- secure-share-carbon/supabase/functions/_shared/otp.ts. Nao ha como conferi-la
-- aqui: o banco so ve o resumo de 64 hex, nunca o codigo.

create table if not exists public.carbon_secure_share_codigos (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null,
  resumo      text        not null,
  enviado_em  timestamptz not null default now(),
  expira_em   timestamptz not null,
  tentativas  smallint    not null default 0,
  travado_ate timestamptz,
  usado_em    timestamptz,
  constraint carbon_ss_codigos_resumo_chk     check (resumo ~ '^[0-9a-f]{64}$'),
  constraint carbon_ss_codigos_email_chk      check (email = lower(btrim(email)) and email <> ''),
  constraint carbon_ss_codigos_janela_chk     check (expira_em > enviado_em),
  constraint carbon_ss_codigos_tentativas_chk check (tentativas between 0 and 5)
);

comment on table public.carbon_secure_share_codigos is
  'Codigos de uso unico da entrada do cliente. NUNCA guarda o codigo: guarda o HMAC-SHA256 de cod:<email>:<codigo>, com pepper derivado de SESSION_SECRET e calculado na Edge Function, para o codigo em claro nao passar pelo Postgres nem aparecer em log_statement. Nao e bcrypt de proposito - hash lento nao salva um segredo de 10^6 possibilidades e vida de 10 minutos, e num endpoint publico vira alavanca de CPU. LGPD: so guarda e-mail de quem JA e cliente, porque a Edge Function so grava depois de carbon_secure_share_elegivel dizer sim; retencao de minutos, em carbon_secure_share_limpar_codigos.';
comment on column public.carbon_secure_share_codigos.resumo is
  'HMAC-SHA256 em hex de 64. O e-mail entra DENTRO do MAC: o mesmo codigo apresentado por outro endereco produz outro resumo e nao casa com nada.';
comment on column public.carbon_secure_share_codigos.tentativas is
  'Palpites errados ja gastos neste codigo. Teto de 5, e ACABOU: ao chegar a 5, travado_ate recebe expira_em e a linha nunca mais volta a ser palpitavel. Nao e pausa de um minuto, e nao pode virar uma: 5 palpites por MINUTO em vez de 5 por CODIGO multiplicaria por dez a conta de forca bruta escrita acima.';
comment on column public.carbon_secure_share_codigos.travado_ate is
  'Ate quando este codigo nao aceita mais palpite. Recebe expira_em quando as 5 tentativas se esgotam, ou seja, o resto da vida do codigo. Isto NAO tranca quem tem o codigo na mao: carbon_secure_share_conferir_codigo confere o acerto ANTES de olhar travado_ate, de proposito, para um terceiro nao conseguir trancar o acesso da vitima so gastando os palpites dela.';
comment on column public.carbon_secure_share_codigos.usado_em is
  'Carimbo do consumo. Uso unico: acertar um codigo invalida na mesma transacao TODOS os outros codigos vivos daquele e-mail, senao um codigo antigo continuaria valendo depois de a pessoa ja ter entrado.';

-- Unico PARCIAL: dois codigos VIVOS nao podem ter o mesmo resumo, mas um sorteio
-- que por acaso repita um codigo ja usado nao pode abortar a transacao.
create unique index if not exists carbon_ss_codigos_resumo_uk
  on public.carbon_secure_share_codigos (resumo) where usado_em is null;
create index if not exists carbon_ss_codigos_email_idx
  on public.carbon_secure_share_codigos (email, enviado_em desc);
create index if not exists carbon_ss_codigos_expurgo_idx
  on public.carbon_secure_share_codigos (expira_em);

alter table public.carbon_secure_share_codigos enable row level security;
revoke all on table public.carbon_secure_share_codigos from anon, authenticated, public;
grant all  on table public.carbon_secure_share_codigos to service_role;

create or replace function public.carbon_secure_share_codigo_registrar(
  p_email   text,
  p_resumo  text,
  p_minutos integer default 10,
  p_vivos   integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_conta integer;
  v_id    uuid;
begin
  if v_email = '' or coalesce(p_resumo, '') !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'motivo', 'formato');
  end if;

  perform pg_advisory_xact_lock(hashtext('ss_codigo:' || v_email));

  select count(*)
    into v_conta
    from public.carbon_secure_share_codigos
   where email = v_email and usado_em is null and expira_em > now();

  -- Ate 3 vivos, e o quarto pedido DESCARTA O MAIS ANTIGO em vez de recusar.
  -- Recusar seria assimetrico (endereco sem cadastro nunca cria linha, entao
  -- nunca seria recusado) e viraria oraculo; e invalidar o mais RECENTE
  -- permitiria a um terceiro derrubar o codigo que a vitima acabou de receber,
  -- de proposito, so pedindo outro.
  if v_conta >= p_vivos then
    delete from public.carbon_secure_share_codigos
     where id in (
       select id from public.carbon_secure_share_codigos
        where email = v_email and usado_em is null and expira_em > now()
        order by enviado_em asc
        limit (v_conta - p_vivos + 1)
     );
  end if;

  insert into public.carbon_secure_share_codigos (email, resumo, expira_em)
    values (v_email, p_resumo, now() + make_interval(mins => greatest(coalesce(p_minutos, 10), 1)))
    on conflict do nothing
    returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'motivo', 'colisao');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.carbon_secure_share_codigo_registrar(text, text, integer, integer) is
  'Grava o resumo de um codigo recem-sorteado, com validade de 10 minutos. Ate 3 codigos vivos por endereco; do quarto em diante o MAIS ANTIGO e descartado, e nao o pedido recusado - recusar so aconteceria para endereco com cadastro, o que viraria oraculo, e descartar o mais recente deixaria um terceiro derrubar de proposito o codigo que a vitima acabou de receber. Devolve {ok:false, motivo:colisao} quando o sorteio bateu num resumo vivo; a Edge Function tenta de novo. Cuidado ao chamar: um erro de RPC nao e colisao, e precisa ir para o log separado.';

create or replace function public.carbon_secure_share_codigo_descartar(p_resumo text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.carbon_secure_share_codigos where resumo = p_resumo and usado_em is null;
$$;

comment on function public.carbon_secure_share_codigo_descartar(text) is
  'Apaga um codigo que foi gravado mas cujo envio falhou. Sem isto a pessoa fica presa num codigo que nao existe em lugar nenhum, ocupando uma das 3 vagas de codigo vivo e gastando a cota diaria dela.';

-- A ORDEM DAS CHECAGENS E A PARTE IMPORTANTE:
--   1. acerto, que IGNORA travado_ate e tentativas;
--   2. existe algum codigo vivo;
--   3. trava, e so entao o incremento.
-- Conferir o acerto ANTES da trava faz com que gastar os cinco palpites de
-- alguem atrase quem chuta e NAO impeca quem tem o codigo na mao. Inverter esta
-- ordem reintroduz o trancamento de terceiro: qualquer um que saiba o endereco
-- da vitima a deixaria de fora do portal so errando cinco vezes.
create or replace function public.carbon_secure_share_conferir_codigo(
  p_email  text,
  p_resumo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email  text := lower(btrim(coalesce(p_email, '')));
  v_id     uuid;
  v_vivos  integer;
  v_livres integer;
begin
  if v_email = '' or coalesce(p_resumo, '') !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'motivo', 'formato');
  end if;

  perform pg_advisory_xact_lock(hashtext('ss_codigo:' || v_email));

  -- 1. Acerto. Sem nenhuma condicao sobre travado_ate ou tentativas.
  update public.carbon_secure_share_codigos
     set usado_em = now()
   where email = v_email and resumo = p_resumo and usado_em is null and expira_em > now()
   returning id into v_id;

  if v_id is not null then
    -- Uso unico de verdade: os outros codigos vivos deste e-mail morrem junto.
    update public.carbon_secure_share_codigos
       set usado_em = now()
     where email = v_email and usado_em is null;

    insert into public.carbon_secure_share_tentativas (email, sucesso, evento)
      values (v_email, true, 'entrada_codigo');

    return jsonb_build_object('ok', true);
  end if;

  select count(*)
    into v_vivos
    from public.carbon_secure_share_codigos
   where email = v_email and usado_em is null and expira_em > now();

  -- Trilha, nao portao: esta linha existe para investigar incidente, e nada le
  -- a contagem dela para decidir acesso. Ver a secao 7.
  insert into public.carbon_secure_share_tentativas (email, sucesso, evento)
    values (v_email, false, 'codigo_errado');

  if v_vivos = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'inexistente');
  end if;

  select count(*)
    into v_livres
    from public.carbon_secure_share_codigos
   where email = v_email and usado_em is null and expira_em > now()
     and (travado_ate is null or travado_ate <= now());

  if v_livres = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'travado');
  end if;

  -- CINCO PALPITES POR CODIGO, E ACABOU. Ao chegar a 5, travado_ate recebe
  -- expira_em, e como a clausula where exige `travado_ate is null or
  -- travado_ate <= now()` e a linha so e alcancada enquanto expira_em > now(),
  -- ela nunca mais volta a ser palpitavel. Uma pausa curta com reset do contador
  -- daria 5 palpites por MINUTO durante os 10 minutos de vida, ou seja, 50 por
  -- codigo, e multiplicaria por dez a aritmetica escrita no topo desta secao -
  -- que e justamente a conta com que o dono decidiu por 6 digitos.
  --
  -- least(..., 5) e obrigatorio mesmo com o advisory lock: ele e o que garante
  -- que o check carbon_ss_codigos_tentativas_chk nunca aborte a transacao e
  -- responda 500 no lugar de 401, exatamente na hora em que alguem esta chutando.
  update public.carbon_secure_share_codigos
     set tentativas  = least(tentativas + 1, 5),
         travado_ate = case when tentativas + 1 >= 5 then expira_em else null end
   where email = v_email and usado_em is null and expira_em > now()
     and (travado_ate is null or travado_ate <= now());

  return jsonb_build_object('ok', false, 'motivo', 'errado');
end;
$$;

comment on function public.carbon_secure_share_conferir_codigo(text, text) is
  'Confere o resumo do codigo apresentado e o consome. Os motivos (formato, inexistente, errado, travado) servem ao LOG; a Edge Function responde UM unico erro ao cliente, porque distinguir "muitas tentativas" de "codigo invalido" revelaria que existe codigo vivo para aquele endereco, ou seja, que aquele endereco e cliente da APSIS num projeto de carbono. O acerto e conferido ANTES da trava, de proposito: assim gastar os cinco palpites de alguem atrasa quem chuta e nao impede quem tem o codigo na mao.';


-- =============================================================================
-- 7. Tentativas deixa de ser PORTAO e vira TRILHA
-- =============================================================================
-- O limite de 8 falhas em 15 minutos por e-mail, que hoje vive na Edge Function
-- carbon-ss-login sobre esta tabela, SAI do caminho de decisao: num login
-- publico, bloquear por e-mail e oferecer a qualquer um a chance de trancar um
-- cliente. Quem freia palpite agora e o contador da PROPRIA LINHA do codigo, na
-- secao 6, que nao tranca quem acerta. NAO reintroduza contagem sobre esta
-- tabela.
--
-- A tabela nasce em 20260818120000_portal_cliente.sql. Se aquela migration nao
-- estiver aplicada, o alter abaixo falha e a migration inteira aborta: e o
-- comportamento desejado.

alter table public.carbon_secure_share_tentativas
  add column if not exists evento text;

alter table public.carbon_secure_share_tentativas
  drop constraint if exists carbon_ss_tentativas_evento_chk;
alter table public.carbon_secure_share_tentativas
  add constraint carbon_ss_tentativas_evento_chk check (
    evento is null or evento in ('entrada_codigo', 'codigo_errado'));

comment on column public.carbon_secure_share_tentativas.evento is
  'Qual caminho gerou a linha: entrada_codigo e codigo_errado vem da entrada sem senha; NULL e o caminho legado de senha, que nao preenchia a coluna. E TRILHA, nao portao - nenhuma decisao de acesso le a contagem desta tabela, e reintroduzir isso devolveria a qualquer pessoa o poder de trancar um cliente so errando o login dele.';

create index if not exists carbon_ss_tentativas_evento_idx
  on public.carbon_secure_share_tentativas (email, tentado_em desc)
  where evento is not null;


-- =============================================================================
-- 8. Expurgos
-- =============================================================================
-- Sem cron.schedule aqui, pelo motivo ja escrito em 20260818120000: pg_cron pode
-- nao estar habilitado no projeto, e uma migration que depende de extensao
-- ausente trava o deploy inteiro. O agendamento e passo de operacao, no README.
--
-- Os dois prazos sao curtos de proposito (LGPD, minimizacao): o codigo vive
-- minutos e o pedido vive 72 horas, que e o suficiente para alguem reclamar na
-- segunda-feira de um acesso que nao chegou na sexta.

create or replace function public.carbon_secure_share_limpar_codigos()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_removidos integer;
begin
  -- 15 minutos de folga depois de expirar: e o que permite investigar um "pedi e
  -- nao consegui entrar" logo depois de acontecer.
  delete from public.carbon_secure_share_codigos
   where expira_em < now() - interval '15 minutes';
  get diagnostics v_removidos = row_count;
  return v_removidos;
end;
$$;

comment on function public.carbon_secure_share_limpar_codigos() is
  'Apaga codigos expirados ha mais de 15 minutos e devolve quantos sairam. A folga existe para investigar um chamado recente. Sem agendamento nesta migration de proposito: pg_cron pode nao estar habilitado e uma migration que depende de extensao ausente trava o deploy. Ver o passo de operacao no README.';

create or replace function public.carbon_secure_share_limpar_pedidos(p_horas integer default 72)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_removidos integer;
begin
  delete from public.carbon_secure_share_pedidos
   where pedido_em < now() - make_interval(hours => greatest(coalesce(p_horas, 72), 24));
  get diagnostics v_removidos = row_count;
  return v_removidos;
end;
$$;

comment on function public.carbon_secure_share_limpar_pedidos(integer) is
  'Apaga pedidos de codigo com mais de N horas (padrao 72, minimo 24) e devolve quantos sairam. O minimo de 24 horas protege o teto diario: um expurgo mais agressivo apagaria o proprio contador que o freio consulta. Retencao proporcional a finalidade de seguranca (LGPD, minimizacao).';


-- =============================================================================
-- 9. Privilegios das funcoes
-- =============================================================================
-- Em Postgres, `create function` concede EXECUTE a PUBLIC por padrao. Sem os
-- revokes abaixo, qualquer portador da anon key chamaria estas funcoes direto
-- pelo PostgREST, PULANDO os freios e os pisos de tempo da Edge Function:
-- carbon_secure_share_conferir_codigo viraria um oraculo de forca bruta a taxa
-- de rede, e carbon_secure_share_elegivel responderia, para qualquer um, quem e
-- cliente da APSIS num projeto de carbono.
--
-- Todas sao chamadas exclusivamente pelas Edge Functions, com service_role.

revoke all on function public.carbon_secure_share_convite_permitido(uuid, integer, integer)        from anon, authenticated, public;
revoke all on function public.carbon_secure_share_convite_registrado(uuid, uuid)                   from anon, authenticated, public;
revoke all on function public.carbon_secure_share_elegivel(text)                                   from anon, authenticated, public;
revoke all on function public.carbon_secure_share_autorizar(text)                                  from anon, authenticated, public;
revoke all on function public.carbon_secure_share_contexto(text, uuid)                             from anon, authenticated, public;
revoke all on function public.carbon_secure_share_pedido_registrar(text, integer, integer, integer) from anon, authenticated, public;
revoke all on function public.carbon_secure_share_pedido_desfecho(uuid, text, text)                from anon, authenticated, public;
revoke all on function public.carbon_secure_share_codigo_registrar(text, text, integer, integer)   from anon, authenticated, public;
revoke all on function public.carbon_secure_share_codigo_descartar(text)                           from anon, authenticated, public;
revoke all on function public.carbon_secure_share_conferir_codigo(text, text)                      from anon, authenticated, public;
revoke all on function public.carbon_secure_share_limpar_codigos()                                 from anon, authenticated, public;
revoke all on function public.carbon_secure_share_limpar_pedidos(integer)                          from anon, authenticated, public;

grant execute on function public.carbon_secure_share_convite_permitido(uuid, integer, integer)        to service_role;
grant execute on function public.carbon_secure_share_convite_registrado(uuid, uuid)                   to service_role;
grant execute on function public.carbon_secure_share_elegivel(text)                                   to service_role;
grant execute on function public.carbon_secure_share_autorizar(text)                                  to service_role;
grant execute on function public.carbon_secure_share_contexto(text, uuid)                             to service_role;
grant execute on function public.carbon_secure_share_pedido_registrar(text, integer, integer, integer) to service_role;
grant execute on function public.carbon_secure_share_pedido_desfecho(uuid, text, text)                to service_role;
grant execute on function public.carbon_secure_share_codigo_registrar(text, text, integer, integer)   to service_role;
grant execute on function public.carbon_secure_share_codigo_descartar(text)                           to service_role;
grant execute on function public.carbon_secure_share_conferir_codigo(text, text)                      to service_role;
grant execute on function public.carbon_secure_share_limpar_codigos()                                 to service_role;
grant execute on function public.carbon_secure_share_limpar_pedidos(integer)                          to service_role;


-- =============================================================================
-- 10. Recarregar o cache de schema do PostgREST
-- =============================================================================
-- As Edge Functions chamam estas funcoes por .rpc(), que passa pelo PostgREST.
-- Sem o reload, ele responde PGRST202 ("function not found") mesmo com a funcao
-- criada, e o sintoma na tela do cliente e uma falha generica de login. O
-- Supabase tem um event trigger que costuma fazer isso sozinho; o notify
-- explicito e barato e nao depende dele.

notify pgrst, 'reload schema';


-- =============================================================================
-- CONFERENCIA depois de aplicar, no SQL Editor
-- =============================================================================
--   -- 1. O backfill nao deixou ninguem para tras (comparar com o retrato
--   --    tirado ANTES de aplicar):
--   select situacao, count(*)
--     from public.carbon_secure_share_clientes_listagem group by situacao;
--
--   -- 2. Nada novo exposto a anon. Todas as linhas tem de voltar false:
--   select has_table_privilege('anon', 'public.carbon_secure_share_pedidos', 'select'),
--          has_table_privilege('anon', 'public.carbon_secure_share_codigos', 'select'),
--          has_table_privilege('anon', 'public.carbon_secure_share_clientes_listagem', 'select'),
--          has_table_privilege('anon', 'public.carbon_secure_share_projetos_listagem', 'select');
--
--   -- 3. Nenhuma funcao security definer sem search_path fixado (zero linhas):
--   select p.proname
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname like 'carbon_secure_share_%'
--      and p.prosecdef and not coalesce(p.proconfig, '{}') @> array['search_path='];
--
--   -- 4. anon nao executa nenhuma delas (zero linhas):
--   select p.oid::regprocedure
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname like 'carbon_secure_share_%'
--      and has_function_privilege('anon', p.oid, 'execute');
-- =============================================================================

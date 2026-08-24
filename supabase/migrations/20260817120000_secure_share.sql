-- =============================================================================
-- Apsis Carbon - Secure Share
-- Arquivo: 20260817120000_secure_share.sql
-- =============================================================================
-- Troca de documentos entre a APSIS e os clientes dos projetos de carbono. A
-- equipe cria um projeto, envia arquivos para uma pasta no SharePoint e libera
-- acesso nominal a pessoas de fora da APSIS, que entram no portal do cliente
-- (repositorio proprio, "Secure Share Apsis Carbon") com e-mail e senha.
--
-- Esta migration cria APENAS o lado da APSIS: as tabelas, a autorizacao e as
-- funcoes de credencial. As telas do cliente vivem no outro repositorio e leem
-- estas mesmas tabelas por Edge Function.
--
-- --------------------------------------------------------------------------
-- ORIGEM E AS QUATRO DIFERENCAS DELIBERADAS EM RELACAO AO PORTAL APSIS
-- --------------------------------------------------------------------------
-- O Portal Apsis tem uma tela Secure Share em producao, sobre a tabela
-- inov_secure_share. A tela do Carbon e a mesma em funcao e em aparencia, mas o
-- que esta por baixo muda em quatro pontos, e cada um deles e uma regra escrita
-- no CLAUDE.md deste repositorio, nao preferencia de estilo.
--
--   1. NORMALIZACAO. Em inov_secure_share cada LINHA e um usuario-cliente, e o
--      "projeto" e o par (ap_os, empresa) repetido em todas as linhas dele.
--      Consequencias reais no portal: a listagem le a tabela inteira e deduplica
--      no navegador; renomear a empresa e um UPDATE que precisa acertar todas as
--      linhas; e a lista de colaboradores e copiada em cada linha, entao duas
--      edicoes simultaneas divergem sem ninguem perceber. Aqui sao quatro
--      tabelas, com o projeto existindo uma vez so.
--
--   2. SEM AREA. No portal a tela serve as cinco areas de negocio e tem abas de
--      area e coluna `area`. O Carbon e area unica: a coluna nao existe, e nao e
--      "nullable e ignorada" - existir vazia so convidaria alguem a preencher.
--
--   3. SENHA NUNCA EM TEXTO PURO. O portal grava a senha do cliente em texto em
--      duas colunas (password e password_hash recebem o mesmo valor) e o botao
--      "Enviar acesso" rele esse texto para mandar por e-mail. Aqui existe
--      SOMENTE senha_hash, com bcrypt do pgcrypto. A senha em claro vive apenas
--      na memoria da Edge Function que a gerou e no corpo do e-mail enviado.
--      CONSEQUENCIA VISIVEL NA TELA, e nao um detalhe: reenviar acesso GERA UMA
--      SENHA NOVA. Nao ha como reenviar a mesma, porque ninguem no sistema a
--      conhece mais. E a troca certa - senha de terceiro em texto no banco e
--      exatamente o que um vazamento transforma em incidente.
--
--   4. ADMIN NAO E LISTA NO CODIGO. O portal tem
--      `const ADMINS_SECURE_SHARE = ["<e-mail pessoal>"]` no arquivo da tela.
--      Isso e dado pessoal versionado em repositorio (LGPD, e a regra 7 do
--      CLAUDE.md) e ainda obriga um deploy para mudar quem administra. Aqui quem
--      enxerga todos os projetos e quem tem papel 'admin' em carbon_usuarios.
--
-- --------------------------------------------------------------------------
-- LGPD - Lei 13.709/2018
-- --------------------------------------------------------------------------
-- carbon_secure_share_clientes guarda NOME e E-MAIL de pessoa fisica externa a
-- APSIS. E dado pessoal de titular identificavel, e o tratamento e legitimo
-- porque e o que torna o acesso nominal possivel (execucao do contrato). O que
-- decorre disso e implementado aqui:
--
--   - finalidade restrita: as colunas existem para autenticar e para registrar
--     quem viu o que. Nao ha campo de telefone, cargo, CPF nem observacao livre,
--     de proposito - campo livre em tabela de cliente vira deposito de dado
--     pessoal que ninguem pediu;
--   - senha so como hash bcrypt, nunca reversivel;
--   - access_token e segredo de sessao e NAO sai em listagem (a view
--     carbon_secure_share_clientes_listagem nao tem a coluna);
--   - retencao: encerrar o projeto (status 'encerrado') corta o acesso sem
--     apagar o historico de auditoria. A exclusao definitiva a pedido do titular
--     e um DELETE na linha, e o ON DELETE CASCADE das permissoes limpa junto.
--
-- Esta migration e idempotente: pode ser reaplicada sem erro.
-- =============================================================================

-- bcrypt (crypt/gen_salt) vem do pgcrypto. O init do projeto ja pode te-la
-- habilitado; o if not exists mantem o arquivo reaplicavel.
create extension if not exists pgcrypto with schema extensions;


-- =============================================================================
-- 1. carbon_secure_share_projetos - a pasta compartilhada
-- =============================================================================
-- Um registro por pasta no SharePoint. O par (ap_os, empresa) e o que nomeia a
-- pasta e, por isso, e a chave natural: dois projetos com o mesmo par apontariam
-- para a mesma pasta e um sobrescreveria os arquivos do outro.
--
-- ap_os e ANULAVEL porque existe cliente sem AP/OS aberto (a tela tem a caixa
-- "Nao ha AP/OS para este cliente"). Guardamos NULL, e nao string vazia, para o
-- indice unico parcial poder distinguir os dois casos.

create table if not exists public.carbon_secure_share_projetos (
  id             uuid primary key default gen_random_uuid(),
  ap_os          text,
  empresa        text not null,

  -- Nome da pasta efetivamente criada no SharePoint. Guardado, e nao recalculado
  -- a partir de (ap_os, empresa), porque a pasta pode ter sido criada antes de
  -- uma renomeacao falhar no meio: sem esta coluna o sistema perderia o rastro
  -- dos arquivos ja enviados e criaria uma pasta nova, orfa.
  pasta          text,

  status         text not null default 'ativo'
                   check (status in ('ativo', 'encerrado')),

  criado_por     uuid references public.carbon_usuarios (id),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  constraint carbon_ss_projetos_empresa_nao_vazia_chk check (
    length(btrim(empresa)) > 0
  ),
  -- String vazia em ap_os seria um terceiro estado (nem preenchido, nem "sem
  -- AP/OS") que a tela nao sabe representar. A Edge Function normaliza '' para
  -- NULL antes de gravar; o check garante que nenhum outro caminho escape.
  constraint carbon_ss_projetos_ap_os_nao_vazio_chk check (
    ap_os is null or length(btrim(ap_os)) > 0
  )
);

comment on table public.carbon_secure_share_projetos is
  'Pasta compartilhada com um cliente: o par AP/OS + empresa que nomeia a pasta no SharePoint. Equivale ao "projeto" que, no Portal Apsis, e o par (ap_os, empresa) repetido em toda linha de inov_secure_share - aqui ele existe UMA vez. Nao tem coluna de area: o Secure Share do Carbon e de area unica.';
comment on column public.carbon_secure_share_projetos.ap_os is
  'Numero do AP/OS no formato AP-XXXXX/XX-XXX, ou NULL quando o cliente ainda nao tem AP/OS aberto (a caixa "Nao ha AP/OS" da tela). NULL e nao string vazia: e o que permite ao indice unico parcial tratar "sem AP/OS" como um caso legitimo em vez de colisao.';
comment on column public.carbon_secure_share_projetos.empresa is
  'Razao social ou nome pelo qual a equipe se refere ao cliente. Pessoa JURIDICA. LGPD: nome de pessoa fisica nao entra aqui - a pessoa que acessa e cadastrada em carbon_secure_share_clientes.';
comment on column public.carbon_secure_share_projetos.pasta is
  'Nome da pasta efetivamente criada no SharePoint. Guardado em vez de recalculado a partir de (ap_os, empresa) porque uma renomeacao que falhe no meio deixaria o nome calculado apontando para uma pasta que nao existe, e o sistema criaria outra, orfa, perdendo os arquivos ja enviados.';
comment on column public.carbon_secure_share_projetos.status is
  'ativo ou encerrado. Encerrar corta o login de todos os clientes do projeto (ver carbon_secure_share_autenticar) sem apagar nada: o historico de acesso e evidencia de auditoria.';
comment on column public.carbon_secure_share_projetos.criado_por is
  'Colaborador que criou. Junto de carbon_secure_share_equipe, decide quem enxerga o projeto na listagem. Vem do registro resolvido pela Edge Function, nunca do corpo da requisicao.';

-- Um projeto por (ap_os, empresa). Sao DOIS indices parciais porque, em Postgres,
-- NULL nao colide com NULL: um unique comum sobre as duas colunas deixaria criar
-- infinitos projetos "sem AP/OS" para a mesma empresa, que e exatamente a
-- duplicata que a tela do portal tenta impedir por consulta previa (e que uma
-- corrida entre dois cliques atravessa).
create unique index if not exists carbon_ss_projetos_ap_os_empresa_idx
  on public.carbon_secure_share_projetos (ap_os, lower(btrim(empresa)))
  where ap_os is not null;

create unique index if not exists carbon_ss_projetos_empresa_sem_ap_os_idx
  on public.carbon_secure_share_projetos (lower(btrim(empresa)))
  where ap_os is null;

create index if not exists carbon_ss_projetos_criado_por_idx
  on public.carbon_secure_share_projetos (criado_por);
create index if not exists carbon_ss_projetos_status_idx
  on public.carbon_secure_share_projetos (status);


-- =============================================================================
-- 2. carbon_secure_share_equipe - quem, da APSIS, enxerga o projeto
-- =============================================================================
-- No portal isto e uma coluna text[] de e-mails copiada em cada linha do
-- projeto. Aqui e tabela de vinculo com carbon_usuarios, no mesmo formato de
-- carbon_usuario_modulos. Ganhos concretos: o vinculo aponta para um colaborador
-- que existe (FK), sai do ar junto com ele, e nao ha N copias da lista para
-- divergirem entre si.

create table if not exists public.carbon_secure_share_equipe (
  projeto_id   uuid not null references public.carbon_secure_share_projetos (id) on delete cascade,
  usuario_id   uuid not null references public.carbon_usuarios (id) on delete cascade,
  criado_em    timestamptz not null default now(),
  primary key (projeto_id, usuario_id)
);

comment on table public.carbon_secure_share_equipe is
  'Colaboradores da APSIS que enxergam um projeto do Secure Share na listagem, alem do criador e dos admins. Substitui a coluna colaboradores text[] do Portal Apsis, que era copiada em cada linha do projeto e por isso divergia entre linhas. Mesmo formato de carbon_usuario_modulos.';
comment on column public.carbon_secure_share_equipe.usuario_id is
  'Colaborador da APSIS. FK para carbon_usuarios: so entra quem ja existe no sistema, e o vinculo desaparece com o colaborador. E o que impede a lista de acumular e-mail de quem saiu da empresa.';


-- =============================================================================
-- 3. carbon_secure_share_clientes - quem, de fora, tem acesso
-- =============================================================================
-- LGPD: nome e e-mail de pessoa fisica externa. Ver o bloco no cabecalho da
-- migration antes de acrescentar qualquer coluna aqui.
--
-- NAO EXISTE COLUNA DE SENHA EM CLARO. O portal tem duas (password e
-- password_hash) e grava o mesmo texto puro nas duas. Aqui a unica coluna e
-- senha_hash, com bcrypt.

create table if not exists public.carbon_secure_share_clientes (
  id              uuid primary key default gen_random_uuid(),
  projeto_id      uuid not null references public.carbon_secure_share_projetos (id) on delete cascade,

  nome            text not null,
  email           text not null,

  -- bcrypt (crypt + gen_salt('bf')). NULL = credencial ainda nao emitida: o
  -- cliente foi cadastrado mas o acesso nao foi enviado. Estado real e visivel
  -- na tela ("Acesso nao enviado"), melhor do que inventar uma senha que
  -- ninguem recebeu.
  senha_hash      text,
  senha_definida_em timestamptz,

  -- Segredo de sessao do portal do cliente. Nao sai em listagem.
  access_token    text not null default encode(extensions.gen_random_bytes(32), 'hex'),

  -- Janela de acesso. NULL nos dois = acesso sem prazo.
  acesso_inicio   date,
  acesso_fim      date,

  ultimo_acesso   timestamptz,

  status          text not null default 'ativo'
                    check (status in ('ativo', 'revogado')),

  criado_por      uuid references public.carbon_usuarios (id),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),

  constraint carbon_ss_clientes_nome_nao_vazio_chk check (
    length(btrim(nome)) > 0
  ),
  -- Validacao deliberadamente frouxa (tem arroba, tem ponto depois, sem espaco).
  -- Regex de e-mail "completa" recusa endereco valido e da suporte a ninguem; o
  -- que importa aqui e barrar digitacao obviamente errada antes de o convite
  -- sair.
  constraint carbon_ss_clientes_email_formato_chk check (
    email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  -- Cliente e pessoa de FORA. E-mail @apsis aqui significa que alguem se
  -- cadastrou como cliente do proprio projeto, contornando o portao de equipe.
  -- A tela ja separa as duas secoes; o banco garante.
  constraint carbon_ss_clientes_email_externo_chk check (
    lower(email) not like '%@apsis.com.br'
  ),
  constraint carbon_ss_clientes_janela_chk check (
    acesso_inicio is null or acesso_fim is null or acesso_fim >= acesso_inicio
  )
);

comment on table public.carbon_secure_share_clientes is
  'Pessoas de fora da APSIS com acesso nominal a pasta de um projeto. LGPD: nome e e-mail de pessoa fisica identificavel, com finalidade restrita a autenticar e registrar acesso - ver o cabecalho da migration. Diferenca central em relacao ao Portal Apsis: aqui NAO existe coluna de senha em claro, so o hash bcrypt.';
comment on column public.carbon_secure_share_clientes.email is
  'E-mail de login, unico dentro do projeto (indice sobre lower(email)). O check barra e-mail @apsis.com.br: colaborador da APSIS entra por carbon_secure_share_equipe, nao como cliente do proprio projeto.';
comment on column public.carbon_secure_share_clientes.senha_hash is
  'Hash bcrypt da senha (crypt com gen_salt(''bf'')). NULL enquanto o acesso nao foi enviado, e a tela mostra esse estado como "Acesso nao enviado". A senha em claro existe apenas na memoria da Edge Function que a gerou e no e-mail enviado ao cliente: NAO ha como reenviar a mesma senha, so gerar outra. E a diferenca deliberada em relacao ao Portal Apsis, que guarda o texto puro justamente para poder reenviar.';
comment on column public.carbon_secure_share_clientes.access_token is
  'Segredo usado pelo portal do cliente. 32 bytes aleatorios em hex. Nunca aparece em listagem: a view carbon_secure_share_clientes_listagem nao tem esta coluna, para que um select mal escrito na Edge Function nao o entregue ao navegador.';
comment on column public.carbon_secure_share_clientes.acesso_inicio is
  'Primeiro dia de acesso, ou NULL para "vale desde ja". Comparado em carbon_secure_share_autenticar.';
comment on column public.carbon_secure_share_clientes.acesso_fim is
  'Ultimo dia de acesso (inclusive), ou NULL para acesso sem prazo. Prazo vencido bloqueia o login sem apagar o cadastro, que continua sendo evidencia de quem teve acesso e ate quando.';
comment on column public.carbon_secure_share_clientes.ultimo_acesso is
  'Carimbo do ultimo login bem-sucedido, alimentado por carbon_secure_share_autenticar. E o "Viu em" da tela e a evidencia de que o material foi efetivamente entregue.';
comment on column public.carbon_secure_share_clientes.status is
  'ativo ou revogado. Revogar corta o login mantendo o historico. Diferente de encerrar o projeto, que corta o acesso de todos de uma vez.';

create unique index if not exists carbon_ss_clientes_email_idx
  on public.carbon_secure_share_clientes (projeto_id, lower(btrim(email)));

create index if not exists carbon_ss_clientes_projeto_idx
  on public.carbon_secure_share_clientes (projeto_id);

-- Login busca por e-mail em TODOS os projetos (a pessoa pode ter acesso a mais
-- de um). Sem este indice o login vira scan da tabela inteira.
create index if not exists carbon_ss_clientes_email_login_idx
  on public.carbon_secure_share_clientes (lower(btrim(email)))
  where status = 'ativo';


-- =============================================================================
-- 4. carbon_secure_share_permissoes - restricao por arquivo ou pasta
-- =============================================================================
-- Tres niveis por item, iguais aos do portal: acesso total (ausencia de
-- restricao), somente visualizar (entra em emails_sem_download) e sem acesso
-- (entra em emails_negados).
--
-- POR QUE E-MAIL E NAO FK PARA O CLIENTE: a mesma pessoa pode ter cadastro em
-- varios projetos, e a regra de item e escrita pensando na PESSOA. Manter e-mail
-- tambem faz a regra sobreviver a um recadastro do cliente (linha nova, mesmo
-- e-mail), que e o caso comum quando alguem apaga e cria de novo por engano.
-- O custo e nao ter FK; por isso a Edge Function grava sempre em minusculas e a
-- funcao de leitura compara em minusculas.

create table if not exists public.carbon_secure_share_permissoes (
  id                   uuid primary key default gen_random_uuid(),
  projeto_id           uuid not null references public.carbon_secure_share_projetos (id) on delete cascade,

  -- Caminho RELATIVO a pasta do projeto: 'Contrato.pdf', 'Anexos/Planta.dwg'.
  -- Sem barra inicial e sem o nome da pasta do projeto, para a regra sobreviver
  -- a renomeacao do projeto.
  item_path            text not null,

  emails_negados       text[] not null default '{}',
  emails_sem_download  text[] not null default '{}',

  atualizado_por       uuid references public.carbon_usuarios (id),
  atualizado_em        timestamptz not null default now(),

  constraint carbon_ss_permissoes_item_nao_vazio_chk check (
    length(btrim(item_path)) > 0
  ),
  -- Barra inicial ou '..' fariam a comparacao de prefixo da heranca de pasta
  -- casar com o item errado. Barrado na origem em vez de saneado na leitura.
  constraint carbon_ss_permissoes_item_relativo_chk check (
    item_path !~ '^/' and item_path !~ '\.\.'
  )
);

comment on table public.carbon_secure_share_permissoes is
  'Restricao de acesso por arquivo ou pasta dentro de um projeto. Ausencia de linha = acesso total para todos os clientes do projeto. Regra em pasta VALE PARA TODO O CONTEUDO dela, inclusive subpastas e inclusive o ZIP - a heranca esta implementada em carbon_secure_share_nivel_item, uma vez, e nao repetida no frontend.';
comment on column public.carbon_secure_share_permissoes.item_path is
  'Caminho relativo a pasta do projeto, sem barra inicial (ex.: "Anexos/Planta.dwg"). Relativo de proposito: renomear o projeto muda o nome da pasta no SharePoint e nao pode invalidar as regras ja definidas.';
comment on column public.carbon_secure_share_permissoes.emails_negados is
  'Clientes que NAO veem este item (nem na listagem). Sempre em minusculas.';
comment on column public.carbon_secure_share_permissoes.emails_sem_download is
  'Clientes que veem e abrem o item, mas nao baixam. No portal do cliente isso significa preview com marca d''agua e exclusao do arquivo do ZIP da pasta. Sempre em minusculas.';

create unique index if not exists carbon_ss_permissoes_item_idx
  on public.carbon_secure_share_permissoes (projeto_id, item_path);


-- =============================================================================
-- 5. Trigger de atualizado_em
-- =============================================================================
-- Uma funcao para as tres tabelas: ela nao referencia tabela nenhuma, so escreve
-- NEW.atualizado_em. Mesmo caminho do dominio de fornecedores.

create or replace function public.carbon_secure_share_set_atualizado_em()
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

comment on function public.carbon_secure_share_set_atualizado_em() is
  'Mantem atualizado_em em dia nas tabelas do dominio Secure Share. Uma funcao serve a todas porque nao referencia tabela: so escreve NEW.atualizado_em.';

drop trigger if exists carbon_ss_projetos_atualizado_em on public.carbon_secure_share_projetos;
create trigger carbon_ss_projetos_atualizado_em
  before update on public.carbon_secure_share_projetos
  for each row execute function public.carbon_secure_share_set_atualizado_em();

drop trigger if exists carbon_ss_clientes_atualizado_em on public.carbon_secure_share_clientes;
create trigger carbon_ss_clientes_atualizado_em
  before update on public.carbon_secure_share_clientes
  for each row execute function public.carbon_secure_share_set_atualizado_em();

drop trigger if exists carbon_ss_permissoes_atualizado_em on public.carbon_secure_share_permissoes;
create trigger carbon_ss_permissoes_atualizado_em
  before update on public.carbon_secure_share_permissoes
  for each row execute function public.carbon_secure_share_set_atualizado_em();


-- =============================================================================
-- 6. Nome da pasta no SharePoint - a regra escrita UMA vez
-- =============================================================================
-- O nome sai de (ap_os, empresa) e precisa ser identico no Portal Carbon, no
-- portal do cliente e em qualquer script de manutencao. Escrito em SQL, e nao em
-- TypeScript, para que os tres consumidores compartilhem a MESMA implementacao -
-- duas versoes divergentes deste calculo criam pastas duplicadas silenciosamente.
--
-- A BARRA VIRA HIFEN, NAO SOME. Esta e a convencao ja em uso no SharePoint da
-- APSIS: buildFolderName do Portal Apsis faz
-- `apos.replace(/[/\\:*?"<>|]/g, '-')`, entao "AP-12345/26-001" e a pasta
-- "AP-12345-26-001 - Empresa XYZ". Removendo a barra em vez de troca-la sairia
-- "AP-1234526-001", que e um nome DIFERENTE: o Carbon criaria uma segunda pasta
-- ao lado da que a equipe ja usa, e ninguem perceberia ate faltar arquivo.
--
-- Os demais caracteres proibidos pelo SharePoint (" * : < > ? |) sao removidos.
-- Tambem colapsamos espacos e cortamos ponto e espaco finais, que o SharePoint
-- remove sozinho: divergencia entre o nome pedido e o nome criado quebraria o
-- rastreio da pasta.

create or replace function public.carbon_secure_share_nome_pasta(
  p_ap_os   text,
  p_empresa text
)
returns text
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_ap      text;
  v_empresa text;
  v_nome    text;
begin
  -- Barra (e contrabarra) viram hifen; o resto dos proibidos sai.
  v_ap := btrim(regexp_replace(
            regexp_replace(coalesce(p_ap_os, ''), '[/\\]', '-', 'g'),
            '["*:<>?|]', '', 'g'));

  v_empresa := btrim(regexp_replace(
                 regexp_replace(coalesce(p_empresa, ''), '[/\\]', '-', 'g'),
                 '["*:<>?|]', '', 'g'));

  -- Sem AP/OS a pasta e so a empresa, sem prefixo inventado.
  v_nome := case
              when v_ap <> '' and v_empresa <> '' then v_ap || ' - ' || v_empresa
              when v_ap <> ''                      then v_ap
              else v_empresa
            end;

  v_nome := regexp_replace(v_nome, '\s+', ' ', 'g');
  -- Ponto e espaco no fim: o SharePoint os descarta ao criar.
  v_nome := regexp_replace(btrim(v_nome), '[ .]+$', '');

  return nullif(v_nome, '');
end;
$$;

comment on function public.carbon_secure_share_nome_pasta(text, text) is
  'Nome da pasta do projeto no SharePoint a partir de AP/OS e empresa: "AP-12345/26-001 - Empresa XYZ" vira a pasta "AP-12345-26-001 - Empresa XYZ". Sem AP/OS, e so a empresa. A BARRA VIRA HIFEN, nao some: e a convencao ja em uso (buildFolderName do Portal Apsis faz o mesmo), e remove-la produziria "AP-1234526-001", um nome diferente que faria o Carbon criar uma segunda pasta ao lado da que a equipe usa. Os demais proibidos (" * : < > ? |) sao removidos, espacos colapsam e ponto/espaco final sao cortados porque o SharePoint os descarta na criacao. Vive no banco porque o Portal Carbon, o portal do cliente e os scripts precisam calcular o MESMO nome.';


-- =============================================================================
-- 7. Nivel de acesso de um cliente a um item - a heranca de pasta
-- =============================================================================
-- Devolve 'total', 'visualizar' ou 'nenhum'.
--
-- A REGRA DE PASTA VALE PARA O CONTEUDO. Se 'Anexos' esta negado para alguem,
-- 'Anexos/Planta.dwg' tambem esta, mesmo sem linha propria. Isto e o que a tela
-- promete no texto "A regra escolhida aqui vale para todo o conteudo da pasta,
-- incluindo subpastas", e precisa ser verdade no SERVIDOR: implementada so no
-- frontend, bastaria pedir o arquivo pelo caminho completo para contornar.
--
-- O MAIS RESTRITIVO GANHA. Um item pode casar com varias regras (a dele, a da
-- pasta, a da pasta da pasta). 'nenhum' vence 'visualizar', que vence 'total'.
-- A alternativa (a regra mais especifica ganha) permitiria liberar um arquivo
-- dentro de uma pasta negada, e a tela nao tem como mostrar essa sutileza.

create or replace function public.carbon_secure_share_nivel_item(
  p_projeto_id uuid,
  p_email      text,
  p_item_path  text
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1
        from public.carbon_secure_share_permissoes p
       where p.projeto_id = p_projeto_id
         and lower(btrim(p_email)) = any (p.emails_negados)
         and (
           p.item_path = p_item_path
           or p_item_path like p.item_path || '/%'
         )
    ) then 'nenhum'
    when exists (
      select 1
        from public.carbon_secure_share_permissoes p
       where p.projeto_id = p_projeto_id
         and lower(btrim(p_email)) = any (p.emails_sem_download)
         and (
           p.item_path = p_item_path
           or p_item_path like p.item_path || '/%'
         )
    ) then 'visualizar'
    else 'total'
  end;
$$;

comment on function public.carbon_secure_share_nivel_item(uuid, text, text) is
  'Nivel de acesso de um cliente a um item: total, visualizar (abre com marca d''agua, nao baixa, e fica fora do ZIP) ou nenhum (nem aparece na listagem). Implementa as DUAS regras que a tela promete: a restricao de uma pasta vale para todo o conteudo dela (casamento por prefixo item_path || ''/%''), e quando varias regras alcancam o mesmo item vence a MAIS RESTRITIVA. Vive no banco porque o portal do cliente precisa aplica-la a cada requisicao de byte: implementada so no frontend, bastaria pedir o arquivo pelo caminho completo para contornar.';


-- =============================================================================
-- 8. Credenciais
-- =============================================================================
-- security definer porque escrevem em tabela sem policy de RLS. Sao chamadas
-- exclusivamente pelas Edge Functions com service_role; o revoke da secao 10
-- tira o acesso de anon e authenticated.

-- 8.1 Emitir senha ------------------------------------------------------------
-- Recebe a senha em claro JA GERADA pela Edge Function (que precisa dela para
-- montar o e-mail) e guarda so o hash. Nao geramos a senha aqui de proposito:
-- ela teria de ser devolvida em texto no resultado da funcao e apareceria nos
-- logs de statement do Postgres.

create or replace function public.carbon_secure_share_definir_senha(
  p_cliente_id uuid,
  p_senha      text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ok boolean;
begin
  if p_senha is null or length(p_senha) < 12 then
    raise exception 'senha_fraca: minimo de 12 caracteres';
  end if;

  update public.carbon_secure_share_clientes
     set senha_hash        = extensions.crypt(p_senha, extensions.gen_salt('bf', 10)),
         senha_definida_em = now()
   where id = p_cliente_id
   returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

comment on function public.carbon_secure_share_definir_senha(uuid, text) is
  'Grava o hash bcrypt (custo 10) da senha de um cliente. Recebe a senha em claro ja gerada pela Edge Function, que precisa dela para montar o e-mail; gerar aqui obrigaria a devolve-la em texto no resultado e ela apareceria no log de statements do Postgres. Devolve false quando nenhum cliente tem o id informado.';

-- 8.2 Autenticar --------------------------------------------------------------
-- Usada pelo portal do cliente (repositorio Secure Share Apsis Carbon). Concentra
-- TODAS as condicoes de acesso: senha, status do cliente, status do projeto e
-- janela de datas. Uma funcao so para que o portal do cliente nao possa esquecer
-- de checar uma delas.
--
-- Devolve jsonb com os projetos autorizados, para o portal emitir o token de
-- sessao com o escopo ja resolvido e nunca confiar em projeto vindo do cliente.

create or replace function public.carbon_secure_share_autenticar(
  p_email text,
  p_senha text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email    text := lower(btrim(coalesce(p_email, '')));
  v_projetos jsonb;
begin
  if v_email = '' or p_senha is null or p_senha = '' then
    return jsonb_build_object('autenticado', false);
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
     and c.status = 'ativo'
     and pr.status = 'ativo'
     and c.senha_hash is not null
     -- Comparacao bcrypt: crypt(senha, hash) reproduz o hash quando confere.
     and c.senha_hash = extensions.crypt(p_senha, c.senha_hash)
     and (c.acesso_inicio is null or c.acesso_inicio <= current_date)
     and (c.acesso_fim    is null or c.acesso_fim    >= current_date);

  if v_projetos is null then
    return jsonb_build_object('autenticado', false);
  end if;

  -- Carimba o acesso apenas nas linhas que realmente autenticaram.
  update public.carbon_secure_share_clientes
     set ultimo_acesso = now()
   where id in (
     select (item ->> 'cliente_id')::uuid from jsonb_array_elements(v_projetos) as item
   );

  return jsonb_build_object('autenticado', true, 'projetos', v_projetos);
end;
$$;

comment on function public.carbon_secure_share_autenticar(text, text) is
  'Autentica um cliente por e-mail e senha e devolve os projetos que ele pode abrir. Concentra TODAS as condicoes de acesso numa funcao so - senha bcrypt, cliente ativo, projeto ativo e janela acesso_inicio/acesso_fim - justamente para que o portal do cliente nao possa esquecer de checar uma delas. Devolve {autenticado:false} sem distinguir e-mail inexistente de senha errada (nao confirmar a existencia de um cadastro e o comportamento certo numa tela de login publica). Carimba ultimo_acesso nas linhas que autenticaram. O portal deve emitir o token de sessao com os projetos daqui e nunca aceitar projeto vindo do navegador.';


-- =============================================================================
-- 9. Views de listagem
-- =============================================================================
-- DROP antes de CREATE (e nao create or replace view) para o arquivo continuar
-- idempotente quando uma revisao acrescentar coluna.

drop view if exists public.carbon_secure_share_clientes_listagem;
drop view if exists public.carbon_secure_share_projetos_listagem;

-- 9.1 Clientes SEM o access_token ---------------------------------------------
-- A ausencia da coluna e a garantia: a rota de listagem le esta view, entao o
-- segredo de sessao nao pode escapar por um select mal escrito.

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
  c.status,
  c.criado_em,
  (c.senha_hash is not null) as acesso_enviado,
  c.senha_definida_em,
  -- Estado efetivo do acesso, calculado uma vez aqui para as duas telas (a do
  -- Carbon e a do portal do cliente) nao reimplementarem a mesma cadeia de ifs.
  case
    when c.status <> 'ativo'                                  then 'revogado'
    when c.senha_hash is null                                 then 'sem_credencial'
    when c.acesso_fim    is not null and c.acesso_fim    < current_date then 'expirado'
    when c.acesso_inicio is not null and c.acesso_inicio > current_date then 'agendado'
    else 'liberado'
  end as situacao
from public.carbon_secure_share_clientes c;

comment on view public.carbon_secure_share_clientes_listagem is
  'Clientes de um projeto SEM a coluna access_token: a ausencia e a garantia de que o segredo de sessao nao escapa por um select mal escrito na Edge Function. Acrescenta acesso_enviado (booleano, sem revelar o hash) e situacao (revogado, sem_credencial, expirado, agendado, liberado), calculada aqui uma vez para as duas telas nao reimplementarem a mesma cadeia de condicoes.';

-- 9.2 Projetos com os agregados da listagem -----------------------------------

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
    count(*)::integer                                            as clientes,
    (count(*) filter (where senha_hash is not null
                        and status = 'ativo'))::integer          as clientes_liberados,
    (count(*) filter (where senha_hash is null))::integer        as clientes_sem_acesso,
    max(ultimo_acesso)                                           as ultimo_acesso
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
  'Projetos do Secure Share com o nome da pasta resolvido e os agregados que a listagem mostra (quantos clientes, quantos com acesso liberado, quantos sem credencial, ultimo acesso de qualquer um deles, tamanho da equipe e numero de restricoes por item). Existe para a tela nao fazer quatro consultas nem deduplicar linhas no navegador, que e o que a tela do Portal Apsis precisa fazer por causa da tabela desnormalizada.';


-- =============================================================================
-- 10. RLS e privilegios
-- =============================================================================
-- Mesmo desenho do resto do Apsis Carbon: RLS ativa e NENHUMA policy. Todo
-- acesso passa pela Edge Function carbon-api (colaborador, ID token do Azure AD)
-- ou pelas Edge Functions do portal do cliente (cliente, token de sessao), as
-- duas com service_role, que ignora RLS por definicao.
--
-- Sem policy, anon e authenticated nao leem nada mesmo com a anon key em maos.

alter table public.carbon_secure_share_projetos   enable row level security;
alter table public.carbon_secure_share_equipe     enable row level security;
alter table public.carbon_secure_share_clientes   enable row level security;
alter table public.carbon_secure_share_permissoes enable row level security;

revoke all on public.carbon_secure_share_projetos   from anon, authenticated;
revoke all on public.carbon_secure_share_equipe     from anon, authenticated;
revoke all on public.carbon_secure_share_clientes   from anon, authenticated;
revoke all on public.carbon_secure_share_permissoes from anon, authenticated;

revoke all on public.carbon_secure_share_projetos_listagem from anon, authenticated;
revoke all on public.carbon_secure_share_clientes_listagem from anon, authenticated;

-- As funcoes security definer sao o caminho privilegiado: exposta a anon,
-- carbon_secure_share_autenticar viraria um oraculo de forca bruta de senha
-- chamavel direto pela anon key, sem passar pelo rate limit da Edge Function.
revoke all on function public.carbon_secure_share_definir_senha(uuid, text) from anon, authenticated;
revoke all on function public.carbon_secure_share_autenticar(text, text)    from anon, authenticated;
revoke all on function public.carbon_secure_share_nivel_item(uuid, text, text) from anon, authenticated;


-- =============================================================================
-- 11. Configuracao do SharePoint
-- =============================================================================
-- Vai para carbon_app_config, como manda a regra 4 do CLAUDE.md: nada de
-- variavel VITE_ nova. publico = false porque isto e configuracao de servidor -
-- so as Edge Functions leem, e a Edge Function app-config nao deve entrega-la ao
-- navegador.
--
-- ONDE OS ARQUIVOS FICAM (definido em 2026-08-21, pelo dono):
--
--   /sites/Projetos > biblioteca "Secure Share" > pasta "Apsis Carbon"
--
-- E a MESMA biblioteca do Portal Apsis, com uma PASTA dedicada ao Carbon. Por
-- isso existe `pastaBase`: todo caminho montado para o Graph comeca por ela, e
-- ha uma trava no codigo (exigirDentroDaBase em _shared/graph.ts) que RECUSA
-- qualquer operacao fora dela.
--
-- A trava e necessaria porque o consentimento do Azure e por SITE, nao por
-- pasta: a credencial tecnicamente alcanca a biblioteca inteira, incluindo os
-- projetos de M&A do Portal Apsis. Quem impede o Carbon de escrever la e o
-- codigo, nao o Azure.
--
-- `pastaBase` vazia significa a raiz da biblioteca, e e suportado: se o Carbon
-- ganhar biblioteca propria um dia, basta limpar o campo, sem tocar em codigo.
--
-- A ESTRUTURA DENTRO DA PASTA BASE:
--
--   Apsis Carbon/
--     Geral/                          todos os clientes veem; so a APSIS escreve
--     AP-10001-26-001 - Cliente A/    so o Cliente A, e ele pode enviar
--     AP-10044-25-007 - Cliente B/
--
-- A Geral (`pastaGeral`) entra na sessao do cliente como um projeto reservado e
-- somente leitura - ver ID_GERAL no portal do cliente. Ela NAO tem permissao por
-- item: por definicao, tudo que esta la e visivel a todos.
--
-- CONSEQUENCIA OPERACIONAL que a equipe precisa entender: um documento de
-- cliente colocado na Geral por engano fica visivel para os concorrentes dele.
-- Documento especifico vai na pasta do projeto, sempre.

insert into public.carbon_app_config (chave, valor, publico, descricao)
values (
  'secure_share',
  jsonb_build_object(
    'siteHost',   'apsisconsult.sharepoint.com',
    'sitePath',   '/sites/Projetos',
    'biblioteca', 'Secure Share',
    'pastaBase',  'Apsis Carbon',
    'pastaGeral', 'Geral',
    'remetente',  'portal@apsis.com.br',
    'portalUrl',  ''
  ),
  false,
  'Configuracao de servidor do Secure Share do Carbon: site, biblioteca e pasta base do SharePoint, remetente dos e-mails de acesso e URL do portal do cliente. publico = false: so as Edge Functions leem. Os arquivos vivem em /sites/Projetos > biblioteca "Secure Share" > pasta "Apsis Carbon" - a MESMA biblioteca do Portal Apsis, com uma pasta dedicada. A funcao exigirDentroDaBase em _shared/graph.ts RECUSA qualquer caminho fora de pastaBase, porque o consentimento do Azure e por site e nao por pasta. pastaBase vazia = raiz da biblioteca.'
)
on conflict (chave) do nothing;

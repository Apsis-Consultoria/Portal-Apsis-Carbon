-- =============================================================================
-- Apsis Carbon - entidade Documento unica por projeto
-- Arquivo: 20260814090000_documentos.sql
-- =============================================================================
-- Atende a issue #6 do backlog inicial (docs/issues/BACKLOG-INICIAL.md).
--
-- POR QUE ESTA TABELA EXISTE. Hoje o mesmo documento do mesmo projeto vive em TRES
-- lugares do Notion, e isso e sintoma, nao desenho:
--   1. base "Projetos", com o entregavel anexado (docs/notion/07-projetos-parakana.md);
--   2. pagina "Documentos Parakana" (docs/notion/15-atividades-parakana-e-menores.md);
--   3. o checklist de evidencias dentro do "Monitoring Report", onde o status
--      "Anexado Pasta" significa literalmente "esta numa pasta em algum lugar"
--      (docs/notion/08-monitoring-report.md).
-- Aqui nasce UMA entidade, consultada de varios lugares pelos vinculos.
--
-- DUAS COISAS QUE O NOTION NAO TEM E A ISSUE EXIGE:
--
-- 1. VERSAO EXPLICITA. Hoje so existe "Data de upload". PDD e relatorio de
--    monitoramento passam por varias rodadas com a validadora (o status "Revisao 2"
--    do Monitoring Report e a prova), portanto a versao e requisito, nao conveniencia.
--    Modelada como CORRENTE: a versao nova aponta para a anterior em substitui_id e
--    incrementa versao. Nao ha coluna de "familia": a familia E a corrente, e sai de
--    public.carbon_documento_familia.
--
-- 2. RASTREABILIDADE MUITOS-PARA-MUITOS. Um documento satisfaz varios itens de
--    evidencia e um item exige varios documentos. Por isso carbon_documento_vinculos
--    aponta para (tipo_alvo, alvo_id) generico, e nao uma tabela de ligacao por
--    dominio: quando entrarem checklist de evidencias (issue #4), findings (#5),
--    reunioes (#9) e contratos (#11), nenhum deles precisa de migration nova aqui.
--
-- DECISAO PENDENTE, DELIBERADAMENTE NAO RESOLVIDA (esta escrito na issue):
-- armazenar o arquivo no Supabase Storage ou referenciar repositorio externo? As
-- DUAS colunas existem (caminho_storage e url_externa) e a constraint
-- carbon_documentos_local_chk exige ao menos uma, para nao existir documento
-- registrado sem caminho para o arquivo. Nao ha upload nesta entrega: a tela cadastra
-- por URL externa. Quando a decisao sair, o que muda e o preenchimento de
-- caminho_storage (e uma Edge Function de upload), nao o esquema.
--
-- Esta migration e idempotente: pode ser reaplicada sem erro.
-- =============================================================================


-- =============================================================================
-- 1. carbon_documentos - o documento em si
-- =============================================================================

create table if not exists public.carbon_documentos (
  id              uuid primary key default gen_random_uuid(),
  projeto_id      uuid references public.carbon_projetos (id) on delete cascade,
  titulo          text not null,
  tipo            text not null default 'outro'
                    check (tipo in (
                      'pdd',
                      'relatorio_monitoramento',
                      'inventario',
                      'geoespacial',
                      'planilha',
                      'contrato',
                      'ata',
                      'foto',
                      'declaracao',
                      'laudo',
                      'outro'
                    )),
  versao          integer not null default 1 check (versao >= 1),
  descricao       text,
  origem          text not null default 'interna'
                    check (origem in ('interna', 'parceiro', 'orgao', 'validadora')),
  url_externa     text,
  caminho_storage text,
  tamanho_bytes   bigint check (tamanho_bytes is null or tamanho_bytes >= 0),
  formato         text check (formato is null or char_length(formato) <= 20),
  data_documento  date,
  substitui_id    uuid references public.carbon_documentos (id) on delete set null,
  enviado_por     uuid references public.carbon_usuarios (id),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),

  -- ONDE ESTA O ARQUIVO. Ao menos um dos dois caminhos. Documento sem nenhum dos
  -- dois e exatamente o problema que o sistema resolve: uma linha numa tabela
  -- dizendo que o arquivo existe em algum lugar que ninguem sabe qual.
  constraint carbon_documentos_local_chk check (
    url_externa is not null or caminho_storage is not null
  ),

  -- Barreira de esquema contra XSS armazenado. url_externa vai para o atributo href
  -- de um link no navegador, e o React NAO bloqueia href="javascript:...". Mesmo
  -- cuidado de carbon_modulos.url_externa. O frontend valida de novo na saida
  -- (src/utils/urlSegura.js), mas a barreira precisa existir tambem na ENTRADA.
  constraint carbon_documentos_url_http_chk check (
    url_externa is null or url_externa ~* '^https?://'
  ),

  -- Caminho relativo dentro do bucket: nunca absoluto e nunca com '..'. Se um dia o
  -- upload for implementado, um caminho assim escaparia do prefixo do projeto no
  -- Storage. Barrar agora custa nada e evita ter que migrar dado sujo depois.
  constraint carbon_documentos_caminho_relativo_chk check (
    caminho_storage is null
    or (caminho_storage !~ '^/' and position('..' in caminho_storage) = 0)
  ),

  -- Documento nao substitui a si mesmo: seria uma corrente de um elo em ciclo, e
  -- carbon_documento_familia entraria em recursao que so para por deduplicacao.
  constraint carbon_documentos_substitui_outro_chk check (
    substitui_id is null or substitui_id <> id
  )
);

comment on table public.carbon_documentos is
  'Documento de projeto (ou institucional, quando projeto_id e nulo). ENTIDADE UNICA da issue #6: substitui os tres lugares do Notion que guardavam documento do mesmo projeto. Versionada por corrente (substitui_id + versao) e referenciavel por qualquer outra entidade via carbon_documento_vinculos. Escrita somente pela Edge Function carbon-api, com papel admin ou gestor.';
comment on column public.carbon_documentos.projeto_id is
  'Projeto dono do documento. NULLABLE de proposito: documento institucional da APSIS (modelo de contrato, SOP, procedimento interno) nao pertence a projeto nenhum e nao deveria exigir um projeto de fachada. ON DELETE CASCADE: apagar o projeto apaga seus documentos.';
comment on column public.carbon_documentos.titulo is
  'Como o documento e chamado pela equipe. Unico campo textual obrigatorio.';
comment on column public.carbon_documentos.tipo is
  'Natureza do documento: pdd, relatorio_monitoramento, inventario, geoespacial, planilha, contrato, ata, foto, declaracao, laudo, outro. Os valores vem dos artefatos que o levantamento observou de verdade (docs/notion/07 e 08): KML e GeoPDF viram geoespacial; ERR, AGB e NPR viram planilha; atas de CLPI viram ata; declaracoes de double counting viram declaracao. outro existe para o caso novo nao virar tipo errado.';
comment on column public.carbon_documentos.versao is
  'Numero da versao dentro da familia, comecando em 1. Cresce ao longo da corrente de substitui_id, mantido por public.carbon_documentos_before_write. Requisito da issue #6: o Notion tem apenas data de upload, e PDD e relatorio passam por varias rodadas com a validadora.';
comment on column public.carbon_documentos.descricao is
  'Anotacao livre sobre o documento, em portugues. LGPD: nao registre dado pessoal aqui (nome, e-mail, telefone, documento de identificacao de pessoa fisica); esta coluna e texto livre e por isso e o lugar mais provavel de alguem colar dado que nao deveria estar no sistema.';
comment on column public.carbon_documentos.origem is
  'Quem produziu o documento: interna (APSIS), parceiro (proponente, associacao, consultoria contratada), orgao (poder publico, registro) ou validadora (VVB, Verra, rating). Criterio de aceite explicito da issue #6: origem registrada, inclusive quando o documento vem de parceiro externo.';
comment on column public.carbon_documentos.url_externa is
  'Endereco do arquivo em repositorio externo (pasta compartilhada, Verra project hub, portal de orgao). Aceita somente http e https, ver carbon_documentos_url_http_chk. Uma das duas metades da decisao pendente sobre armazenamento.';
comment on column public.carbon_documentos.caminho_storage is
  'Caminho relativo do arquivo dentro do bucket do Supabase Storage, quando (e se) o upload for implementado. Hoje sempre nulo: nao existe rota de upload nesta entrega. A outra metade da decisao pendente sobre armazenamento.';
comment on column public.carbon_documentos.tamanho_bytes is
  'Tamanho do arquivo em bytes, quando conhecido. Fica nulo enquanto o registro e por URL externa: o sistema nao busca a URL para descobrir tamanho (seria requisicao de servidor para endereco informado pelo usuario).';
comment on column public.carbon_documentos.formato is
  'Extensao ou formato do arquivo em minusculas e sem ponto (pdf, xlsx, kml, geojson, docx, jpg). Normalizado por public.carbon_documentos_before_write. Existe porque os artefatos sao heterogeneos e a tela filtra e sinaliza por isso.';
comment on column public.carbon_documentos.data_documento is
  'Data do PROPRIO documento (emissao, assinatura, competencia). Diferente de criado_em, que e quando o registro entrou no sistema. O Notion tinha so "Data de upload" e confundia as duas, o que atrapalha auditoria: a validadora pergunta a data do documento, nao a do upload.';
comment on column public.carbon_documentos.substitui_id is
  'Versao anterior desta, na mesma familia. NULL = primeira versao. A corrente e LINEAR, garantida por carbon_documentos_substitui_uniq: um documento e substituido por no maximo um sucessor, senao "qual e a versao vigente" nao teria resposta. ON DELETE SET NULL, e nao RESTRICT, porque RESTRICT faria o cascade de exclusao de projeto falhar; a API nao tem rota DELETE de documento, portanto isso so acontece em intervencao manual.';
comment on column public.carbon_documentos.enviado_por is
  'Colaborador que registrou o documento (o "autor" do criterio de aceite da issue). Referencia funcional para trilha de autoria, nao dado pessoal adicional.';
comment on column public.carbon_documentos.criado_em is
  'Quando o registro entrou no sistema. Equivalente a "Data de upload" do Notion.';
comment on column public.carbon_documentos.atualizado_em is
  'Mantido pela trigger carbon_documentos_before_write a cada UPDATE.';

-- Indices ---------------------------------------------------------------------
-- (projeto_id, criado_em desc): a listagem padrao filtra por projeto e ordena do
-- mais recente para o mais antigo. Serve tambem para projeto_id is null
-- (documentos institucionais), que e o outro recorte da tela.
create index if not exists carbon_documentos_projeto_criado_idx
  on public.carbon_documentos (projeto_id, criado_em desc);

create index if not exists carbon_documentos_tipo_idx
  on public.carbon_documentos (tipo);

-- Unico PARCIAL: a corrente de versoes e linear. Dois documentos apontando para o
-- mesmo antecessor criariam dois "v2" do mesmo documento, e a pergunta que a tela
-- faz o tempo todo ("qual e a versao vigente?") deixaria de ter resposta unica.
-- Parcial porque varias primeiras versoes convivem com substitui_id nulo.
-- Este indice tambem e o que torna carbon_documento_substituido_por uma busca por
-- indice, e nao um scan por linha listada.
create unique index if not exists carbon_documentos_substitui_uniq
  on public.carbon_documentos (substitui_id)
  where substitui_id is not null;


-- Trigger de atualizado_em, formato e coerencia da corrente ---------------------
-- Uma trigger so, porque as tres coisas acontecem no mesmo BEFORE.
--
-- As checagens de corrente levantam excecao com errcode 23514 (check_violation) de
-- proposito: e o mesmo SQLSTATE de uma constraint de tabela, portanto o helper
-- lancarErroEscrita da Edge Function ja traduz para 400 com o codigo de negocio da
-- rota, sem ninguem precisar inspecionar a MENSAGEM do erro (que e fragil e depende
-- de idioma do servidor).
create or replace function public.carbon_documentos_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_versao_anterior  integer;
  v_projeto_anterior uuid;
begin
  if tg_op = 'UPDATE' then
    new.atualizado_em := now();
  end if;

  -- 'PDF', '.pdf' e ' pdf ' sao o mesmo formato. Normalizar aqui, e nao so na Edge
  -- Function, mantem coerente tambem o que o dono inserir pelo SQL Editor.
  new.formato := nullif(lower(btrim(btrim(coalesce(new.formato, '')), '.')), '');

  if new.substitui_id is not null then
    select ant.versao, ant.projeto_id
      into v_versao_anterior, v_projeto_anterior
      from public.carbon_documentos ant
     where ant.id = new.substitui_id;

    -- A FK garante a existencia; o if cobre a corrida com uma exclusao concorrente.
    if found then
      if new.versao <= v_versao_anterior then
        raise exception
          'versao % nao e maior que a versao % do documento que ela substitui',
          new.versao, v_versao_anterior
          using errcode = '23514';
      end if;

      -- Familia inteira no mesmo projeto. Sem isto, a versao 2 de um documento
      -- poderia "mudar de projeto" e sair da listagem do projeto original levando o
      -- historico com ela.
      if new.projeto_id is distinct from v_projeto_anterior then
        raise exception
          'documento e a versao que ele substitui precisam pertencer ao mesmo projeto'
          using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end;
$$;

comment on function public.carbon_documentos_before_write() is
  'BEFORE INSERT/UPDATE de carbon_documentos: atualiza atualizado_em nos UPDATEs, normaliza formato para minusculas sem ponto e confere a coerencia da corrente de versoes (versao crescente e mesma familia no mesmo projeto). As recusas usam errcode 23514 para a Edge Function traduzir sem ler a mensagem do erro.';

drop trigger if exists carbon_documentos_before_write_trg on public.carbon_documentos;
create trigger carbon_documentos_before_write_trg
  before insert or update on public.carbon_documentos
  for each row
  execute function public.carbon_documentos_before_write();


-- RLS -------------------------------------------------------------------------
-- NENHUMA policy, DE PROPOSITO. Com RLS ativa e zero policies, todo acesso pela
-- anon key e negado, inclusive leitura. Somente o service_role (Edge Function
-- carbon-api, que ja validou o token do Azure AD e conferiu ativo = true) alcanca a
-- tabela. Mesmo padrao de carbon_projetos e carbon_pdd_capitulos.
alter table public.carbon_documentos enable row level security;
revoke all on table public.carbon_documentos from anon, authenticated;
grant all on table public.carbon_documentos to service_role;


-- =============================================================================
-- 2. carbon_documento_vinculos - o documento amarrado a qualquer outra entidade
-- =============================================================================
-- POR QUE GENERICO (tipo_alvo, alvo_id) E NAO UMA TABELA DE LIGACAO POR DOMINIO.
-- A relacao e muitos-para-muitos nos DOIS sentidos: um KML satisfaz o item
-- "Project Area" do checklist da VVB e tambem responde a um finding da Verra; e um
-- item do checklist ("Evidencia da data de inicio") pode exigir varios documentos.
-- Com uma tabela por dominio, cada dominio novo (checklist, findings, reunioes,
-- contratos, metas) exigiria migration nova neste arquivo e uma rota nova quase
-- identica. Com o par generico, nao exige nada.
--
-- O PRECO, ASSUMIDO: nao existe integridade referencial para alvo_id. Nao ha FK
-- polimorfica no PostgreSQL, e simular uma com trigger por tipo_alvo traria de volta
-- exatamente o acoplamento que a tabela evita. Consequencia pratica: vinculo pode
-- apontar para item que foi apagado. Quem lista trata alvo ausente como vinculo
-- orfao; quando os dominios de destino existirem, cada um pode limpar os seus.

create table if not exists public.carbon_documento_vinculos (
  id           uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.carbon_documentos (id) on delete cascade,
  tipo_alvo    text not null,
  alvo_id      uuid not null,
  observacao   text,
  criado_por   uuid references public.carbon_usuarios (id),
  criado_em    timestamptz not null default now(),

  -- Mesmo documento no mesmo item duas vezes nao significa nada. O unique tambem e
  -- o que faz a API responder 409 registro_duplicado em vez de acumular linha igual.
  unique (documento_id, tipo_alvo, alvo_id),

  -- FORMATO em vez de LISTA de valores aceitos. Uma lista fechada exigiria alterar
  -- esta constraint (migration) a cada dominio novo, o que anularia o motivo de a
  -- tabela ser generica. O que a checagem impede e o lixo que quebra consulta:
  -- 'Finding' e 'finding' seriam dois tipos diferentes, e espaco ou acento em chave
  -- tecnica sempre volta como bug de filtro.
  constraint carbon_documento_vinculos_tipo_alvo_chk check (
    tipo_alvo ~ '^[a-z][a-z0-9_]{2,49}$'
  )
);

comment on table public.carbon_documento_vinculos is
  'Vinculo MUITOS-PARA-MUITOS entre um documento e qualquer outra entidade do sistema, identificada pelo par (tipo_alvo, alvo_id). E o que permite um documento satisfazer varios itens de evidencia da auditoria e um item exigir varios documentos, sem uma tabela de ligacao por dominio. Nao ha integridade referencial em alvo_id: FK polimorfica nao existe no PostgreSQL, e o vinculo orfao e tratado por quem le.';
comment on column public.carbon_documento_vinculos.documento_id is
  'Documento vinculado. ON DELETE CASCADE: remover o documento remove seus vinculos.';
comment on column public.carbon_documento_vinculos.tipo_alvo is
  'Que tipo de coisa esta na outra ponta, em snake_case minusculo: evidencia (item do checklist da VVB), finding, pdd_capitulo, monitoramento_capitulo, reuniao, contrato, atividade, meta, projeto. Texto e nao enum porque os dominios de destino ainda vao nascer (issues #3 a #12) e nenhum deles deve precisar de migration aqui.';
comment on column public.carbon_documento_vinculos.alvo_id is
  'Chave primaria do registro na outra ponta. Sem FK, por ser polimorfico: ver o comentario da tabela.';
comment on column public.carbon_documento_vinculos.observacao is
  'Por que este documento satisfaz este item. Equivale a coluna Comments do checklist de evidencias do Notion, que hoje guarda justamente isso em texto livre. LGPD: nao registre dado pessoal aqui.';
comment on column public.carbon_documento_vinculos.criado_por is
  'Colaborador que criou o vinculo. Trilha de autoria, dado funcional.';

create index if not exists carbon_documento_vinculos_documento_idx
  on public.carbon_documento_vinculos (documento_id);

-- Sentido INVERSO da consulta: "quais documentos satisfazem este item de evidencia".
-- E como o checklist da VVB (issue #4) e os findings (#5) vao ler esta tabela, e sem
-- este indice cada abertura de item seria um scan.
create index if not exists carbon_documento_vinculos_alvo_idx
  on public.carbon_documento_vinculos (tipo_alvo, alvo_id);

-- Sem coluna atualizado_em e sem trigger: o vinculo nao tem UPDATE na API. Ele e
-- criado e removido (POST e DELETE); corrigir uma observacao e remover e recriar,
-- que custa o mesmo e mantem a tabela sem estado intermediario.
alter table public.carbon_documento_vinculos enable row level security;
revoke all on table public.carbon_documento_vinculos from anon, authenticated;
grant all on table public.carbon_documento_vinculos to service_role;


-- =============================================================================
-- 3. Funcoes chamadas por RPC pela Edge Function carbon-api
-- =============================================================================
-- As que leem tabela sao security definer com search_path fixo, e o EXECUTE e
-- revogado de public/anon/authenticated no fim desta secao: SECURITY DEFINER
-- contorna a RLS, e sem a revogacao a anon key chamaria estas funcoes pelo endpoint
-- /rest/v1/rpc e leria documento de cliente sem passar pela Edge Function.

-- 3.0 Sucessor de um documento -------------------------------------------------
-- REGRA CENTRAL DO VERSIONAMENTO, escrita UMA vez. "Versao vigente" e "versao
-- substituida" sao derivadas daqui, e a listagem e o historico chamam esta funcao em
-- vez de repetirem o LEFT JOIN: duas copias divergiriam na primeira mudanca, e a
-- divergencia apareceria como documento antigo reaparecendo na lista.
-- Busca por indice, ver carbon_documentos_substitui_uniq.
-- Definida ANTES das funcoes que a chamam, de proposito.
create or replace function public.carbon_documento_substituido_por(p_documento_id uuid)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select s.id
    from public.carbon_documentos s
   where s.substitui_id = p_documento_id
   limit 1;
$$;

comment on function public.carbon_documento_substituido_por(uuid) is
  'ID do documento que substitui o informado, ou NULL quando ele e a versao vigente. Fonte unica da derivacao usada por carbon_documentos_listar e carbon_documento_familia.';


-- 3.1 Listagem com filtros, paginacao e total ----------------------------------
-- Existe como funcao SQL, e nao como consulta do PostgREST, por tres motivos:
--   1. o filtro "so as versoes vigentes" depende do sucessor de cada linha, que e
--      uma derivacao (nao ha coluna) e precisa valer igual para qualquer cliente;
--   2. total e pagina na MESMA resposta, sem uma segunda ida ao banco que poderia
--      ler um estado diferente do da pagina;
--   3. o filtro por vinculo (quais documentos satisfazem tal item) e um EXISTS em
--      outra tabela, que pelo PostgREST viraria embed com filtro aninhado - possivel
--      e ilegivel.
create or replace function public.carbon_documentos_listar(
  p_projeto_id            uuid    default null,
  p_somente_institucional boolean default false,
  p_tipo                  text    default null,
  p_origem                text    default null,
  p_incluir_substituidos  boolean default false,
  p_busca                 text    default null,
  p_alvo_tipo             text    default null,
  p_alvo_id               uuid    default null,
  p_limite                integer default 50,
  p_deslocamento          integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with parametros as (
    select case
             when p_busca is null or btrim(p_busca) = '' then null
             -- % e _ digitados na busca sao literais, nao curinga: sem escapar,
             -- procurar "100%" devolveria tudo que comeca com 100. Nao e questao de
             -- seguranca (e parametro, nao SQL concatenado), e sim de resultado
             -- coerente com o que a pessoa digitou.
             else '%' ||
                  replace(replace(replace(btrim(p_busca), '\', '\\'), '%', '\%'), '_', '\_') ||
                  '%'
           end as busca
  ),
  base as (
    select
      d.*,
      public.carbon_documento_substituido_por(d.id) as substituido_por_id
      from public.carbon_documentos d
     cross join parametros pa
     where (p_projeto_id is null or d.projeto_id = p_projeto_id)
       and (not coalesce(p_somente_institucional, false) or d.projeto_id is null)
       and (p_tipo is null or d.tipo = p_tipo)
       and (p_origem is null or d.origem = p_origem)
       and (
         pa.busca is null
         or d.titulo ilike pa.busca
         or coalesce(d.descricao, '') ilike pa.busca
       )
       and (
         p_alvo_id is null
         or exists (
           select 1
             from public.carbon_documento_vinculos v
            where v.documento_id = d.id
              and v.alvo_id = p_alvo_id
              and (p_alvo_tipo is null or v.tipo_alvo = p_alvo_tipo)
         )
       )
  ),
  filtrados as (
    select *
      from base
     -- Sem isto a tela repetiria o problema do Notion: tres versoes do mesmo PDD
     -- lado a lado, e ninguem sabendo qual vale.
     where coalesce(p_incluir_substituidos, false) or substituido_por_id is null
  ),
  pagina as (
    select *
      from filtrados
     -- criado_em desc: a leitura natural e "o que entrou por ultimo". O id no
     -- desempate deixa a ordem estavel entre paginas quando dois registros
     -- entraram no mesmo instante (o que acontece em carga em lote).
     order by criado_em desc, id
     limit greatest(coalesce(p_limite, 50), 1)
    offset greatest(coalesce(p_deslocamento, 0), 0)
  )
  select jsonb_build_object(
    -- Total ANTES da paginacao, para a tela poder dizer "20 de 137".
    'total', (select count(*) from filtrados),
    'documentos', coalesce(
      (
        select jsonb_agg(
                 to_jsonb(p) ||
                 jsonb_build_object('substituido', p.substituido_por_id is not null)
                 order by p.criado_em desc, p.id
               )
          from pagina p
      ),
      '[]'::jsonb
    )
  );
$$;

comment on function public.carbon_documentos_listar(uuid, boolean, text, text, boolean, text, text, uuid, integer, integer) is
  'Lista documentos em jsonb: { total, documentos }. Cada documento sai com as colunas da tabela mais substituido_por_id e substituido (derivados de carbon_documento_substituido_por). p_projeto_id filtra um projeto; p_somente_institucional = true restringe aos documentos sem projeto; p_incluir_substituidos = false (padrao) devolve somente as versoes vigentes; p_alvo_tipo e p_alvo_id filtram por vinculo, que e como o checklist de evidencias e os findings vao consultar. total e contado ANTES da paginacao. Nunca devolve NULL: sem resultado, documentos vem [].';


-- 3.2 Familia de versoes de um documento ---------------------------------------
-- Sobe a corrente pelos antecessores e desce pelos sucessores, partindo de QUALQUER
-- membro: a tela de historico abre a partir do documento que a pessoa clicou, que
-- nao e necessariamente a primeira nem a ultima versao.
--
-- UNION (e nao UNION ALL) nos dois ramos recursivos, de proposito: alem de eliminar
-- a duplicata da linha semente, e o que faz a recursao TERMINAR caso a corrente
-- tenha sido posta em ciclo por escrita manual no SQL Editor (a constraint impede o
-- ciclo de tamanho 1; a de tamanho 2 exigiria dois UPDATEs e nao e barrada).
create or replace function public.carbon_documento_familia(p_documento_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with recursive antecessores as (
    select d.*
      from public.carbon_documentos d
     where d.id = p_documento_id
    union
    select a.*
      from public.carbon_documentos a
      join antecessores f on f.substitui_id = a.id
  ),
  sucessores as (
    select d.*
      from public.carbon_documentos d
     where d.id = p_documento_id
    union
    select s.*
      from public.carbon_documentos s
      join sucessores f on s.substitui_id = f.id
  ),
  familia as (
    select * from antecessores
    union
    select * from sucessores
  )
  select coalesce(
    (
      select jsonb_agg(
               to_jsonb(f) ||
               jsonb_build_object(
                 'substituido_por_id', public.carbon_documento_substituido_por(f.id),
                 'substituido', public.carbon_documento_substituido_por(f.id) is not null
               )
               -- versao primeiro; criado_em desempata caso a numeracao tenha sido
               -- ajustada a mao e duas versoes tenham ficado com o mesmo numero.
               order by f.versao, f.criado_em
             )
        from familia f
    ),
    '[]'::jsonb
  );
$$;

comment on function public.carbon_documento_familia(uuid) is
  'Todas as versoes da familia de um documento (antecessores e sucessores, partindo de qualquer membro), em jsonb, ordenadas por versao. Cada item traz as colunas da tabela mais substituido_por_id e substituido. Documento inexistente devolve [], nao NULL. Usa UNION nos ramos recursivos, o que tambem impede recursao infinita caso a corrente tenha sido posta em ciclo por escrita manual.';


-- Privilegios das funcoes -----------------------------------------------------
-- O PostgreSQL concede EXECUTE a PUBLIC em toda funcao nova. Estas leem documento de
-- cliente, portanto deixar assim exporia leitura pela anon key via /rest/v1/rpc,
-- contornando a RLS. Revogamos e devolvemos so ao service_role.
revoke all on function public.carbon_documento_substituido_por(uuid)
  from public, anon, authenticated;
revoke all on function public.carbon_documentos_listar(
  uuid, boolean, text, text, boolean, text, text, uuid, integer, integer
) from public, anon, authenticated;
revoke all on function public.carbon_documento_familia(uuid)
  from public, anon, authenticated;

grant execute on function public.carbon_documento_substituido_por(uuid) to service_role;
grant execute on function public.carbon_documentos_listar(
  uuid, boolean, text, text, boolean, text, text, uuid, integer, integer
) to service_role;
grant execute on function public.carbon_documento_familia(uuid) to service_role;


-- =============================================================================
-- 4. Conferencia
-- =============================================================================
-- Notice, nao excecao: a migration nao deve falhar por conta de ajuste legitimo que
-- o dono faca pelo SQL Editor. O objetivo e que a saida do "supabase db push" diga
-- se as duas tabelas e as tres funcoes ficaram de pe, e lembrar da pendencia de
-- armazenamento em voz alta.

do $$
declare
  v_tabelas  integer;
  v_funcoes  integer;
begin
  select count(*) into v_tabelas
    from pg_tables
   where schemaname = 'public'
     and tablename in ('carbon_documentos', 'carbon_documento_vinculos');

  select count(*) into v_funcoes
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in (
       'carbon_documento_substituido_por',
       'carbon_documentos_listar',
       'carbon_documento_familia',
       'carbon_documentos_before_write'
     );

  raise notice 'Documentos: % de 2 tabelas, % de 4 funcoes.', v_tabelas, v_funcoes;

  if v_tabelas <> 2 or v_funcoes <> 4 then
    raise notice 'ATENCAO: a migration de documentos nao ficou completa. Confira a saida acima.';
  end if;

  raise notice 'PENDENCIA (issue #6): armazenamento no Supabase Storage ou repositorio externo continua em aberto. caminho_storage existe e e sempre nulo enquanto nao houver rota de upload; hoje o cadastro e por url_externa.';
end $$;

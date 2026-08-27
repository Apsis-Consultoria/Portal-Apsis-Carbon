-- =============================================================================
-- Apsis Carbon - questionarios de campo
-- =============================================================================
-- O QUE ISTO RESOLVE. A equipe aplica quatro formularios em campo (diagnostico
-- socioambiental da aldeia, diagnostico com as Koxoas, producao agricola e
-- extrativismo, e o formulario da ronda de vigilancia). Tres deles vivem no
-- KoboToolbox e um em papel. O resultado nao chega ao sistema: quem quer saber
-- "quantas aldeias ja foram diagnosticadas" ou "o que as rondas encontraram em
-- julho" abre planilha ou PDF.
--
-- POR QUE UM MOTOR, E NAO QUATRO TABELAS. Os quatro somam cerca de 230 campos e
-- tem a mesma forma: secoes, perguntas de escolha unica, multipla, texto, numero,
-- data e coordenada. Modelar cada um como tabela propria daria quatro migrations,
-- quatro conjuntos de rotas e quatro telas - e o quinto formulario, que vai
-- existir, exigiria tudo de novo. Aqui a DEFINICAO e dado: acrescentar
-- questionario e inserir uma linha em carbon_questionario_modelos.
--
-- O CUSTO DESSA ESCOLHA, declarado: resposta em jsonb nao se consulta com a
-- mesma facilidade de coluna. Por isso os campos pelos quais a equipe realmente
-- filtra - projeto, aldeia, data e autor - saem do jsonb e viram coluna de
-- verdade, com indice. O resto fica no jsonb, onde a consulta e rara e a
-- flexibilidade vale mais.
--
-- LGPD: ESTE E O PONTO MAIS DELICADO DESTAS TABELAS.
-- Os formularios em papel e no Kobo pedem nome de pessoa em varios lugares:
-- "Nome do Cacique", "Nome do entrevistado", "Nome da Koxoa", "Contato (se
-- houver)", duas assinaturas, e "Quem esta preenchendo" com nomes da equipe
-- fixos como opcao. Nada disso entra aqui:
--
--   - quem preenche e `autor_id`, chave estrangeira para carbon_usuarios. Sai do
--     login, nunca e digitado, e some se o usuario for removido;
--   - o entrevistado e identificado pela FUNCAO (`entrevistado_funcao`), nao pelo
--     nome. Para a auditoria o que importa e ter ouvido um cacique, uma Koxoa ou
--     um membro da comunidade, e nao qual deles;
--   - contato e assinatura nao tem coluna. De proposito.
--
-- Isso e coerente com a decisao ja registrada em
-- docs/notion/11-comunidade-parakana.md de nao replicar censo nominal: origem
-- etnica e dado sensivel (Art. 5 da LGPD), e nome ligado a aldeia e posicao
-- identifica pessoa. Se a evidencia de auditoria exigir o nome, isso e decisao
-- com base legal definida, e o lugar de mexer e aqui - nao no meio de um jsonb
-- de resposta, onde ninguem acha depois.
--
-- A validacao de que a resposta nao carrega nome esta no gatilho do fim deste
-- arquivo: campo de resposta com chave de nome ou com e-mail e recusado no
-- INSERT, e nao apenas desencorajado no comentario.
-- =============================================================================

begin;

-- ===== Modelos ===============================================================

create table if not exists public.carbon_questionario_modelos (
  id          uuid primary key default gen_random_uuid(),

  -- Chave estavel usada na URL da tela ('/Questionarios/ronda') e no seed. O
  -- nome muda com o tempo; a chave nao.
  chave       text not null unique
                check (chave ~ '^[a-z][a-z0-9_]{2,39}$'),

  nome        text not null check (btrim(nome) <> ''),
  descricao   text,

  -- Versao da DEFINICAO. Questionario ja respondido nao pode mudar de forma sob
  -- os pes de quem respondeu: alterar perguntas cria versao nova, e a resposta
  -- guarda com qual versao foi preenchida.
  versao      integer not null default 1 check (versao >= 1),

  /* A definicao inteira: secoes e perguntas. Forma esperada, validada pelo
     gatilho abaixo:

       { "secoes": [
           { "chave": "perfil", "titulo": "Perfil da aldeia",
             "perguntas": [
               { "chave": "n_familias", "rotulo": "Numero de familias",
                 "tipo": "numero", "obrigatoria": false,
                 "dica": "...", "opcoes": [ {"valor":"x","rotulo":"X"} ] }
             ] } ] }

     Tipos aceitos: texto, texto_longo, numero, inteiro, data, sim_nao,
     escolha, multipla, coordenada, arquivo. */
  definicao   jsonb not null,

  -- Formulario descontinuado some da tela de novo questionario, mas as
  -- respostas antigas continuam legiveis. Apagar o modelo apagaria o
  -- significado delas.
  ativo       boolean not null default true,

  origem      text,   -- de onde veio: 'KoboToolbox', 'papel', ...
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  unique (chave, versao)
);

comment on table public.carbon_questionario_modelos is
  'Definicao dos questionarios de campo. Acrescentar formulario e inserir linha '
  'aqui, nao escrever tela nova.';

-- ===== Respostas =============================================================

create table if not exists public.carbon_questionarios (
  id            uuid primary key default gen_random_uuid(),
  modelo_id     uuid not null references public.carbon_questionario_modelos (id)
                  on delete restrict,

  -- A versao do modelo no momento do preenchimento. Sem isso, uma pergunta
  -- removida amanha faria a resposta de hoje parecer incompleta.
  modelo_versao integer not null default 1,

  projeto_id    uuid references public.carbon_projetos (id) on delete cascade,

  /* ===== Campos promovidos do jsonb ======================================
     Sao os quatro por onde a equipe filtra de fato. Ficam como coluna para a
     lista da tela ser uma consulta simples e indexada, em vez de varrer jsonb. */
  aldeia        text,
  data_referencia date,
  autor_id      uuid references public.carbon_usuarios (id) on delete set null,

  /* Funcao de quem foi entrevistado. NAO o nome: ver o cabecalho do arquivo. */
  entrevistado_funcao text
                  check (entrevistado_funcao is null or entrevistado_funcao in (
                    'cacique',
                    'vice_cacique',
                    'koxoa',
                    'membro_comunidade',
                    'agente_saude',
                    'professor',
                    'equipe_apsis',
                    'outro'
                  )),

  -- Coordenada da aplicacao. Tres dos quatro formularios pedem, e e o que
  -- amarra a resposta ao lugar sem depender do nome da aldeia estar grafado
  -- igual todas as vezes.
  latitude      numeric(10,7) check (latitude is null or latitude between -90 and 90),
  longitude     numeric(10,7) check (longitude is null or longitude between -180 and 180),
  altitude_m    numeric(8,2),
  precisao_m    numeric(8,2) check (precisao_m is null or precisao_m >= 0),

  respostas     jsonb not null default '{}'::jsonb,

  /* Rascunho existe porque o formulario e longo e aplicado em campo, muitas
     vezes sem sinal. Perder 90 respostas por falta de um campo obrigatorio
     seria o defeito mais caro possivel nesta tela. */
  status        text not null default 'rascunho'
                  check (status in ('rascunho', 'concluido')),

  observacoes   text,
  criado_por    uuid references public.carbon_usuarios (id),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- Coordenada e par: meia coordenada nao localiza nada.
  constraint carbon_questionarios_coordenada_par_chk check (
    (latitude is null) = (longitude is null)
  )
);

comment on column public.carbon_questionarios.respostas is
  'Respostas por chave de pergunta. Nao guardar nome de pessoa, e-mail nem '
  'telefone aqui: o gatilho carbon_questionarios_sem_dado_pessoal_trg recusa.';

create index if not exists carbon_questionarios_modelo_idx
  on public.carbon_questionarios (modelo_id, data_referencia desc);

create index if not exists carbon_questionarios_projeto_idx
  on public.carbon_questionarios (projeto_id, data_referencia desc);

create index if not exists carbon_questionarios_aldeia_idx
  on public.carbon_questionarios (aldeia)
  where aldeia is not null;

-- ===== Validacao da definicao ================================================

create or replace function public.carbon_questionario_definicao_valida()
returns trigger
language plpgsql
as $$
declare
  TIPOS constant text[] := array[
    'texto', 'texto_longo', 'numero', 'inteiro', 'data',
    'sim_nao', 'escolha', 'multipla', 'coordenada', 'arquivo'
  ];
  secao jsonb;
  pergunta jsonb;
  vistas text[] := array[]::text[];
  chave text;
begin
  if jsonb_typeof(new.definicao -> 'secoes') <> 'array' then
    raise exception 'definicao precisa de "secoes" como lista';
  end if;

  for secao in select * from jsonb_array_elements(new.definicao -> 'secoes') loop
    if coalesce(btrim(secao ->> 'titulo'), '') = '' then
      raise exception 'secao sem titulo';
    end if;
    if jsonb_typeof(secao -> 'perguntas') <> 'array' then
      raise exception 'secao "%" sem lista de perguntas', secao ->> 'titulo';
    end if;

    for pergunta in select * from jsonb_array_elements(secao -> 'perguntas') loop
      chave := pergunta ->> 'chave';

      if chave is null or chave !~ '^[a-z][a-z0-9_]{1,59}$' then
        raise exception 'chave de pergunta invalida: %', coalesce(chave, '(nula)');
      end if;

      -- Chave repetida faria uma resposta sobrescrever a outra em silencio,
      -- porque as respostas sao um objeto unico por chave.
      if chave = any (vistas) then
        raise exception 'chave de pergunta repetida: %', chave;
      end if;
      vistas := vistas || chave;

      if not ((pergunta ->> 'tipo') = any (TIPOS)) then
        raise exception 'tipo invalido em "%": %', chave, coalesce(pergunta ->> 'tipo', '(nulo)');
      end if;

      -- Escolha sem opcao e um campo que nao se consegue responder.
      if (pergunta ->> 'tipo') in ('escolha', 'multipla')
         and coalesce(jsonb_array_length(pergunta -> 'opcoes'), 0) = 0 then
        raise exception 'pergunta "%" e de escolha e nao tem opcoes', chave;
      end if;
    end loop;
  end loop;

  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists carbon_questionario_modelos_valida_trg
  on public.carbon_questionario_modelos;

create trigger carbon_questionario_modelos_valida_trg
  before insert or update on public.carbon_questionario_modelos
  for each row execute function public.carbon_questionario_definicao_valida();

-- ===== Guarda de dado pessoal ================================================

/**
 * Recusa resposta que carregue dado pessoal.
 *
 * POR QUE COMO GATILHO, e nao como recomendacao no comentario: o jsonb aceita
 * qualquer coisa, o formulario original PEDE nome em cinco lugares, e a tela e
 * preenchida em campo por quem esta com pressa. Uma regra que depende de todo
 * mundo lembrar nao e uma regra. Aqui a gravacao falha alto.
 *
 * A checagem e por CHAVE de pergunta e por FORMATO de valor, nao por tentativa
 * de adivinhar se um texto e nome de gente - isso nao da para fazer com
 * confianca, e um falso positivo impediria de gravar resposta legitima.
 */
create or replace function public.carbon_questionarios_sem_dado_pessoal()
returns trigger
language plpgsql
as $$
declare
  chave text;
  valor text;
begin
  for chave, valor in
    select k, case when jsonb_typeof(v) = 'string' then v #>> '{}' else v::text end
      from jsonb_each(new.respostas) as t(k, v)
  loop
    if chave ~ '(^|_)(nome|contato|telefone|email|cpf|rg|assinatura)($|_)' then
      raise exception
        'a resposta "%" guarda dado pessoal; use funcao em vez de nome (ver o cabecalho da migration)',
        chave;
    end if;

    if valor ~ '[[:alnum:]._%%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}' then
      raise exception 'a resposta "%" contem endereco de e-mail', chave;
    end if;

    if valor ~ '\m\d{3}\.\d{3}\.\d{3}-\d{2}\M' then
      raise exception 'a resposta "%" contem CPF', chave;
    end if;
  end loop;

  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists carbon_questionarios_sem_dado_pessoal_trg
  on public.carbon_questionarios;

create trigger carbon_questionarios_sem_dado_pessoal_trg
  before insert or update on public.carbon_questionarios
  for each row execute function public.carbon_questionarios_sem_dado_pessoal();

-- ===== RLS ===================================================================
-- Mesmo padrao do resto do banco: ativa e sem policy. Todo acesso passa pela
-- Edge Function, que valida o token do Azure AD antes de tocar na tabela com a
-- chave de servico.

alter table public.carbon_questionario_modelos enable row level security;
alter table public.carbon_questionarios enable row level security;

revoke all on function public.carbon_questionario_definicao_valida() from public;
revoke all on function public.carbon_questionarios_sem_dado_pessoal() from public;

commit;

-- =============================================================================
-- Apsis Carbon - portao de leitura dos projetos: equipe por projeto
-- Arquivo: 20260822090000_projeto_equipe.sql
-- =============================================================================
-- O QUE ESTA MIGRATION FECHA
--
-- garantirUsuario (carbon-api/index.ts) faz upsert a cada requisicao, e
-- carbon_usuarios nasce com papel 'colaborador' e ativo = true. Ate aqui,
-- QUALQUER conta do tenant que fizesse o primeiro login passava a ler /projetos
-- e /projetos/:id/pdd: nome, proponente, registro_id, areas, periodo de
-- creditacao e a geometria GeoJSON de TODOS os projetos.
--
-- Isso era mais frouxo do que /modulos, que exige linha em
-- carbon_usuario_modulos justamente para material sensivel nao vazar para o
-- dominio inteiro. Foi aceito enquanto a base estava vazia e esta sendo fechado
-- antes de entrar dado de cliente real.
--
-- A REGRA QUE PASSA A VALER
--
--   leitura   por PARTICIPACAO nesta tabela;
--   admin     ignora a tabela e enxerga tudo;
--   gestor    NAO enxerga tudo. Ele escreve no que ja enxerga.
--
-- A distincao entre gestor e admin e deliberada: se gestor visse tudo, o portao
-- valeria para menos da metade do time e nao seria portao nenhum. Quem precisa
-- de visao de carteira recebe papel admin nominalmente, por decisao explicita,
-- nao como efeito colateral de poder escrever.
--
-- DEPENDENCIA: 20260812150000_projetos_e_pdd, que cria carbon_projetos. Se ela
-- nao estiver aplicada, esta migration falha inteira dentro da transacao, que e
-- o comportamento desejado: melhor recusar do que criar meia estrutura.
--
-- LGPD: nenhum dado pessoal aqui. Dois uuid, quem concedeu e quando.
--
-- Idempotente: pode ser reaplicada sem erro.
-- =============================================================================

create table if not exists public.carbon_projeto_equipe (
  projeto_id uuid not null references public.carbon_projetos (id) on delete cascade,
  usuario_id uuid not null references public.carbon_usuarios (id) on delete cascade,
  criado_por uuid references public.carbon_usuarios (id) on delete set null,
  criado_em  timestamptz not null default now(),
  primary key (projeto_id, usuario_id)
);

comment on table public.carbon_projeto_equipe is
  'Colaboradores da APSIS que enxergam um projeto de carbono. E a autorizacao EFETIVA de leitura das rotas /projetos, /projetos/:id e /projetos/:id/pdd do carbon-api: a consulta faz inner join com esta tabela, entao nao existe janela entre conferir e ler. Papel admin ignora a tabela e ve tudo; papel gestor NAO ve tudo, apenas escreve no que ja enxerga. O criador de um projeto entra automaticamente, pela trigger carbon_projetos_equipe_autor_trg. Mesmo formato de carbon_usuario_modulos.';

comment on column public.carbon_projeto_equipe.criado_por is
  'Quem concedeu o acesso. Trilha de auditoria. ON DELETE SET NULL para o vinculo nao cair junto com quem concedeu: perder o registro de quem participa por causa do desligamento de outra pessoa seria pior do que perder a autoria. ATENCAO: esta e a SEGUNDA chave estrangeira desta tabela para carbon_usuarios, entao embed do PostgREST (carbon_usuarios!inner) e AMBIGUO aqui e responde PGRST201. A leitura da equipe usa duas consultas, de proposito.';

-- A chave primaria (projeto_id, usuario_id) ja cobre o caminho do DETALHE, que
-- pergunta "esta pessoa participa deste projeto". Falta o caminho da LISTAGEM,
-- que pergunta "quais projetos desta pessoa" e filtra por usuario_id - coluna
-- que nao lidera a chave primaria e portanto nao usa aquele indice.
create index if not exists carbon_projeto_equipe_usuario_idx
  on public.carbon_projeto_equipe (usuario_id);

-- RLS ativa com zero policy, mais revoke explicito: o Supabase concede ALL por
-- padrao a anon/authenticated em tabela nova do schema public. Aqui a RLS nao e
-- a unica linha de defesa, ao contrario do que acontece em carbon_app_config
-- (ver a nota em docs/arquitetura-config-backend.md). Todo acesso e por
-- service_role, de dentro das Edge Functions.
alter table public.carbon_projeto_equipe enable row level security;
revoke all on table public.carbon_projeto_equipe from anon, authenticated, public;
grant all on table public.carbon_projeto_equipe to service_role;

-- -----------------------------------------------------------------------------
-- Quem cria um projeto entra na equipe dele
-- -----------------------------------------------------------------------------
-- TRIGGER, e nao um segundo insert na Edge Function. Entre dois inserts feitos
-- pela Edge Function nao existe transacao: se o segundo falhasse, o projeto
-- existiria sem equipe e o 201 ja teria sido entregue. Quem criou nao veria o
-- que acabou de criar, e ninguem teria como inclui-lo, porque incluir exige
-- participar. E um lockout que se cria sozinho.
--
-- O WHEN e OBRIGATORIO: carbon_projetos.criado_por e NULLABLE, e sem a guarda
-- todo insert sem autor falharia com 23502 (not null violation) no insert desta
-- funcao, derrubando a criacao de projeto por inteiro.
create or replace function public.carbon_projeto_equipe_autor()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  insert into public.carbon_projeto_equipe (projeto_id, usuario_id, criado_por)
  values (new.id, new.criado_por, new.criado_por)
  on conflict (projeto_id, usuario_id) do nothing;
  return null;
end;
$$;

drop trigger if exists carbon_projetos_equipe_autor_trg on public.carbon_projetos;
create trigger carbon_projetos_equipe_autor_trg
  after insert on public.carbon_projetos
  for each row
  when (new.criado_por is not null)
  execute function public.carbon_projeto_equipe_autor();

-- -----------------------------------------------------------------------------
-- Backfill dos projetos que ja existirem
-- -----------------------------------------------------------------------------
-- Projeto com criado_por nulo fica sem equipe e passa a aparecer apenas para
-- admin. Esse e o resultado CORRETO, e nao um caso a contornar: nao ha a quem
-- atribuir o acesso, e inventar um dono seria pior do que deixar explicito. A
-- consulta de auditoria no fim deste arquivo lista esses projetos.
insert into public.carbon_projeto_equipe (projeto_id, usuario_id, criado_por)
select p.id, p.criado_por, p.criado_por
  from public.carbon_projetos p
 where p.criado_por is not null
on conflict (projeto_id, usuario_id) do nothing;

-- A Edge Function consulta por relacionamento embutido
-- (carbon_projeto_equipe!inner). O PostgREST guarda o grafo de relacionamentos
-- em cache; sem este reload, a consulta falha ate o proximo restart e o codigo
-- responde 500. E falha FECHADA, ninguem le nada indevido, mas a tela quebra.
notify pgrst, 'reload schema';

-- =============================================================================
-- AUDITORIA - rodar a mao no SQL Editor depois de aplicar
-- =============================================================================
-- Projetos que ficaram sem equipe (so admin enxerga):
--
--   select p.id, p.nome
--     from public.carbon_projetos p
--    where not exists (select 1
--                        from public.carbon_projeto_equipe e
--                       where e.projeto_id = p.id);
--
-- Tem pelo menos um admin ativo? Se der zero, NAO publique a Edge Function:
-- ninguem conseguiria enxergar projeto nenhum nem se incluir na equipe.
--
--   select count(*) from public.carbon_usuarios where papel = 'admin' and ativo;
-- =============================================================================

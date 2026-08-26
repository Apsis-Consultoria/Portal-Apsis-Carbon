-- =============================================================================
-- Apsis Carbon - liberar o que a autorizacao exige explicitamente
-- Arquivo: supabase/seeds/liberacoes.sql
-- =============================================================================
-- POR QUE ESTE ARQUIVO EXISTE. Uma auditoria das 11 telas contra o dado real,
-- em 25/08/2026, encontrou duas tabelas de autorizacao VAZIAS. Nenhuma delas e
-- defeito de codigo: as duas falham FECHADAS por desenho, que e o
-- comportamento certo. So que o resultado pratico era um portal com 788 linhas
-- de dado e nenhuma tela mostrando nada.
--
-- 1. carbon_usuario_modulos VAZIA
--
--    GET /modulos faz inner join obrigatorio com esta tabela
--    (rotas/modulos.ts:22-30). O comentario de la e explicito: "Liberar um
--    modulo passa a ser sempre um INSERT em carbon_usuario_modulos - inclusive
--    para admins". A razao e boa: sem o join, qualquer conta do dominio veria
--    todo modulo cadastrado, inclusive material de pericia e de litigio sob
--    segredo de justica.
--
--    O seed supabase/seeds/modulos.sql populou o CATALOGO de 9 modulos e parou
--    ai. Catalogo sem liberacao nao aparece para ninguem, e a tela de
--    Boas-Vindas seguia dizendo "Os modulos serao liberados em breve", com
--    HTTP 200 e zero erro no console - o modo de falha mais dificil de
--    diagnosticar que existe.
--
-- 2. carbon_projeto_equipe VAZIA
--
--    comVisibilidade() (rotas/projetos.ts:241-248) faz inner join com esta
--    tabela para quem NAO e admin. Com ela vazia, todo colaborador e todo
--    gestor recebe 404 no projeto e em TODAS as telas filhas: PDD, Monitoring
--    Report, Evidencias, Findings e Indicadores. Como carbon_usuarios nasce com
--    papel default 'colaborador', qualquer conta nova cai nesse caso.
--
--    O backfill da migration 20260822090000 so cria vinculo para projeto com
--    criado_por preenchido, e o projeto Awaete foi criado por seed, sem autor.
--    A propria migration chama isso de resultado correto - e e, mas alguem
--    precisa preencher.
--
-- O QUE ESTE ARQUIVO NAO FAZ: nao libera modulo para quem nao e admin, e nao
-- coloca ninguem na equipe do projeto alem dos admins. Quem entra na equipe e
-- decisao de quem toca o projeto, e existe tela para isso (o painel Equipe em
-- /Projetos). Automatizar aqui esvaziaria o sentido das duas tabelas.
--
-- Idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Todos os modulos ativos, para todo admin ativo
-- -----------------------------------------------------------------------------
insert into public.carbon_usuario_modulos (usuario_id, modulo_id)
select u.id, m.id
  from public.carbon_usuarios u
 cross join public.carbon_modulos m
 where u.ativo
   and u.papel = 'admin'
   and m.ativo
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 2. Todo admin ativo na equipe de todo projeto
-- -----------------------------------------------------------------------------
-- Admin ja enxerga tudo por comVisibilidade (o ramo ehAdmin devolve a consulta
-- sem o join), entao esta linha nao muda o que ele VE. Ela existe para o painel
-- Equipe abrir com alguem dentro em vez de vazio, e para quando o papel de
-- alguem for rebaixado de admin para gestor: sem o vinculo, a pessoa perderia o
-- projeto de vista no mesmo instante, e ninguem ligaria uma coisa a outra.
insert into public.carbon_projeto_equipe (projeto_id, usuario_id)
select p.id, u.id
  from public.carbon_projetos p
 cross join public.carbon_usuarios u
 where p.ativo
   and u.ativo
   and u.papel = 'admin'
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Conferencia que ABORTA
-- -----------------------------------------------------------------------------
do $$
declare
  v_admins    integer;
  v_modulos   integer;
  v_liberacao integer;
  v_equipe    integer;
begin
  select count(*) into v_admins from public.carbon_usuarios where ativo and papel = 'admin';
  select count(*) into v_modulos from public.carbon_modulos where ativo;
  select count(*) into v_liberacao from public.carbon_usuario_modulos;
  select count(*) into v_equipe from public.carbon_projeto_equipe;

  if v_admins = 0 then
    raise exception
      'Nenhum usuario ativo com papel admin. Sem isso nao ha a quem liberar, e a tela de Boas-Vindas continua vazia. Promova alguem a admin em carbon_usuarios antes de rodar.';
  end if;

  if v_liberacao = 0 then
    raise exception 'Nenhuma liberacao de modulo foi criada. A tela de Boas-Vindas continuaria vazia.';
  end if;

  raise notice
    'Admins ativos: %. Modulos ativos: %. Liberacoes: %. Vinculos de equipe: %.',
    v_admins, v_modulos, v_liberacao, v_equipe;
end
$$;

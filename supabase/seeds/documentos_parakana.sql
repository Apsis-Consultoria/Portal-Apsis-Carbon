-- =============================================================================
-- Apsis Carbon - os entregaveis registrados na pagina Projetos do Notion
-- Arquivo: supabase/seeds/documentos_parakana.sql
-- =============================================================================
-- ORIGEM: pagina `Projetos` do bloco Parakana, lida ao vivo em 25/08/2026.
-- Apesar do nome, ela nao e uma lista de projetos: e um repositorio com QUATRO
-- entregaveis anexados (a analise esta em docs/notion/07-projetos-parakana.md).
--
-- O QUE ENTRA E O QUE NAO ENTRA. Entram os REGISTROS (titulo, tipo, descricao):
-- e o metadado que a tela de Documentos lista e vincula. NAO entram os arquivos:
-- eles sao anexos do Notion, e o binario de um PDF nao viaja por seed. A
-- descricao diz onde o arquivo esta hoje, para ninguem procurar no Storage um
-- upload que nunca houve.
--
-- As colunas Descricao e Data de upload estao VAZIAS na origem - nao e omissao
-- desta carga. `data_documento` fica nula: inventar data para entregavel de
-- certificacao seria criar um fato.
--
-- 'Diagnostico - Koxoas.pdf' entra como tipo 'outro', nao 'laudo': o nome do
-- arquivo nao diz o que o documento e, e chutar categoria em material de
-- auditoria e pior do que a categoria generica.
--
-- `url_externa` recebe a URL da propria pagina do Notion, e isso satisfaz o
-- CHECK carbon_documentos_local_chk (todo documento precisa apontar para url
-- externa OU caminho no Storage). Nao e gambiarra: o arquivo ESTA la hoje, e o
-- link funciona para quem tem acesso. Quando o PDF migrar para o Secure Share,
-- o registro troca url_externa por caminho_storage - e a troca fica visivel.
--
-- Idempotente (id por md5 do conteudo).
-- =============================================================================

do $$
declare
  v_projeto uuid;
begin
  select id into v_projeto
    from public.carbon_projetos
   where nome ilike '%parakan%' or nome ilike '%awaet%'
   order by criado_em limit 1;
  if v_projeto is null then
    raise exception 'Projeto do Parakana nao encontrado. Rode projeto_awaete.sql antes.';
  end if;

  insert into public.carbon_documentos (id, projeto_id, titulo, tipo, origem, descricao, url_externa)
  values
    (md5('doc:parakana:PDD')::uuid, v_projeto,
     'PDD', 'pdd', 'interna',
     'Entregavel registrado na pagina Projetos do Notion. O arquivo esta anexado la; migrar o PDF para o Secure Share e passo pendente.',
     'https://app.notion.com/p/Projetos-19fee8ba950e811c9bb7eb2fc342fbb9'),
    (md5('doc:parakana:Relatorio de Monitoramento')::uuid, v_projeto,
     'Relatório de Monitoramento', 'relatorio_monitoramento', 'interna',
     'Entregavel registrado na pagina Projetos do Notion. O arquivo esta anexado la; migrar o PDF para o Secure Share e passo pendente.',
     'https://app.notion.com/p/Projetos-19fee8ba950e811c9bb7eb2fc342fbb9'),
    (md5('doc:parakana:Inventario de flora')::uuid, v_projeto,
     'Inventário de flora', 'inventario', 'interna',
     'Entregavel registrado na pagina Projetos do Notion. O arquivo esta anexado la; migrar para o Secure Share e passo pendente.',
     'https://app.notion.com/p/Projetos-19fee8ba950e811c9bb7eb2fc342fbb9'),
    (md5('doc:parakana:Diagnostico Koxoas')::uuid, v_projeto,
     'Diagnóstico - Koxoas', 'outro', 'parceiro',
     'PDF anexado na pagina Projetos do Notion (Diagnostico - Koxoas.pdf). Provavelmente o diagnostico socioeconomico do parceiro; confirmar o tipo ao migrar o arquivo.',
     'https://app.notion.com/p/Projetos-19fee8ba950e811c9bb7eb2fc342fbb9')
  on conflict (id) do update set
    titulo = excluded.titulo, tipo = excluded.tipo,
    descricao = excluded.descricao, url_externa = excluded.url_externa, atualizado_em = now();

  raise notice 'Entregaveis do Parakana registrados: 4.';
end
$$;

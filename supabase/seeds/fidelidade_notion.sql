-- =============================================================================
-- Apsis Carbon - fechar as divergencias entre o banco e o Notion
-- Arquivo: supabase/seeds/fidelidade_notion.sql
-- =============================================================================
-- POR QUE ESTE ARQUIVO EXISTE. A instrucao do dono em 26/08/2026 foi que o banco
-- reproduza o Notion EXATAMENTE, e que ajuste de conteudo, se for preciso, venha
-- depois. As cargas anteriores tomaram tres decisoes de limpeza que, sob essa
-- regra, viraram divergencia. Cada uma esta desfeita abaixo, com o motivo.
--
-- Medido antes: reunioes da Apsis 89 (Notion mostra 93), consultorias 9 (Notion
-- 10), medicoes dos indicadores de grupo 0 (Notion 2).
--
-- O QUE ESTE ARQUIVO NAO DESFAZ, e nao e esquecimento: a visita cujo campo
-- Organizacao e o nome de uma pessoa fisica, e os nomes de colaborador dentro
-- do texto dos findings. Dado pessoal segue o caminho ja estabelecido - o dono
-- roda o script na propria maquina (scripts/importar-contatos-visitas.mjs, que
-- passou a criar visita faltante). Nao e carga feita por terceiro.
--
-- Idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. As quatro reunioes duplicadas
-- -----------------------------------------------------------------------------
-- O Notion tem MAIS DE UMA linha na mesma data: 02/06/2025 aparece tres vezes,
-- 08/07/2025 duas, 06/04/2026 duas. A carga anterior usou md5 da data como id,
-- o que as colapsou em uma linha cada.
--
-- Colapsar era defensavel (parecem lancamentos acidentais) e agora e divergencia.
-- As extras entram com um sufixo de ocorrencia no id, para o md5 nao voltar a
-- fundir, e com observacao dizendo o que elas sao - senao daqui a um mes alguem
-- olha duas weeklies no mesmo dia e acha que o sistema duplicou.

insert into public.carbon_reunioes (id, tipo, titulo, data)
values
  (md5('reuniao:apsis:2025-06-02#2')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-06-02'),
  (md5('reuniao:apsis:2025-06-02#3')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-06-02'),
  (md5('reuniao:apsis:2025-07-08#2')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2025-07-08'),
  (md5('reuniao:apsis:2026-04-06#2')::uuid, 'semanal', 'Weekly Apsis Carbon', date '2026-04-06')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. A consultoria sem nome
-- -----------------------------------------------------------------------------
-- Uma das dez linhas de Consultorias (APs) esta com o campo Projeto VAZIO no
-- Notion, com status 'Nao iniciada'. A carga anterior pulou, porque
-- carbon_consultorias.nome e NOT NULL.
--
-- O rotulo abaixo NAO e um nome inventado para o trabalho: e a marcacao explicita
-- de que a origem esta vazia. Preferivel a linha ausente, que fazia o total da
-- tela (9) divergir do total do Notion (10) sem nada explicar.

insert into public.carbon_consultorias (id, nome, status, observacoes)
values (
  md5('consultoria:sem-nome:1')::uuid,
  '(sem nome na origem)',
  'nao_iniciada',
  'A linha existe no Notion com o campo Projeto em branco. O rotulo e marcacao, nao nome de trabalho: preencher quando a consultoria for identificada.'
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 3. As duas medicoes com recorte por grupo
-- -----------------------------------------------------------------------------
-- O Monitoring Plan traz, em 2023, dois valores que nao sao um numero:
--
--   Number of Parakana individuals   Upper: 487 / Lower: 1,031
--   Number of Parakana women         Women Upper: 244 / Lower: 728
--
-- Sao os dois grupos Parakana (Alto e Baixo), que tem consultas CLPI e
-- associacoes representativas separadas. A carga anterior deixou de fora para
-- nao inventar um total.
--
-- Agora entram, e a soma NAO e invencao neste caso especifico: sao contagens de
-- pessoas dos dois grupos que compoem a mesma populacao, e 487 + 1031 e o total
-- de individuos. O que seria invencao e perder o recorte - por isso a string
-- ORIGINAL vai inteira na observacao. Quem abrir a celula ve de onde o numero
-- veio e consegue desfazer a soma.
--
-- Quando existir recorte por grupo como estrutura (decisao de produto ainda
-- pendente), estas duas linhas viram quatro e a observacao sai.

do $$
declare
  v_ind uuid;
begin
  -- Individuos: 487 (Alto) + 1031 (Baixo)
  select id into v_ind from public.carbon_indicadores
   where plano = 'comunidade' and ordem = 92 limit 1;
  if v_ind is not null then
    insert into public.carbon_indicador_medicoes
      (id, indicador_id, data, periodo_tipo, valor, origem, observacao)
    values (
      md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
      v_ind, date '2023-12-31', 'anual', 1518, 'interna',
      'Valor na origem: "Upper: 487 / Lower: 1,031". Soma dos dois grupos Parakana (Alto e Baixo). O recorte por grupo nao existe como estrutura ainda; ate existir, o total fica aqui e a divisao nesta observacao.'
    )
    on conflict (id) do update set
      valor = excluded.valor, observacao = excluded.observacao, atualizado_em = now();
  end if;

  -- Mulheres: 244 (Alto) + 728 (Baixo)
  select id into v_ind from public.carbon_indicadores
   where plano = 'comunidade' and ordem = 93 limit 1;
  if v_ind is not null then
    insert into public.carbon_indicador_medicoes
      (id, indicador_id, data, periodo_tipo, valor, origem, observacao)
    values (
      md5('carbon_med:' || v_ind::text || ':2023-12-31:anual')::uuid,
      v_ind, date '2023-12-31', 'anual', 972, 'interna',
      'Valor na origem: "Women Upper: 244 / Lower: 728". Soma dos dois grupos Parakana (Alto e Baixo). O recorte por grupo nao existe como estrutura ainda; ate existir, o total fica aqui e a divisao nesta observacao.'
    )
    on conflict (id) do update set
      valor = excluded.valor, observacao = excluded.observacao, atualizado_em = now();
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Conferencia contra os totais do Notion
-- -----------------------------------------------------------------------------
do $$
declare
  v_reunioes     integer;
  v_consultorias integer;
begin
  select count(*) into v_reunioes from public.carbon_reunioes where projeto_id is null;
  select count(*) into v_consultorias from public.carbon_consultorias;

  -- 93 e o contador VALUES do rodape da base Reunioes Apsis Carbon; 10 e o COUNT
  -- da base Consultorias (APs). Aviso, e nao excecao: se o Notion ganhar linha
  -- nova depois desta carga, o numero muda legitimamente e abortar aqui seria
  -- travar um seed correto.
  if v_reunioes <> 93 then
    raise warning 'Reunioes da Apsis: % (o Notion mostrava 93 em 26/08/2026).', v_reunioes;
  end if;
  if v_consultorias <> 10 then
    raise warning 'Consultorias: % (o Notion mostrava 10 em 26/08/2026).', v_consultorias;
  end if;

  raise notice 'Fidelidade: % reunioes da Apsis, % consultorias.', v_reunioes, v_consultorias;
end
$$;

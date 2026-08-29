-- =============================================================================
-- carbon_findings: tres campos que a base do Notion tem e a tabela nao tinha
-- =============================================================================
-- CONTEXTO. Ate 26/08/2026 estavam no banco 12 dos 95 findings da VVB, porque a
-- primeira leitura do Notion parou no corte de exibicao da pagina. Ao trazer os
-- 95, tres coisas que existem na origem nao tinham onde ser gravadas. Esta
-- migration abre espaco para elas. Nenhuma coluna existente muda de tipo e
-- nenhuma linha e reescrita: as tres alteracoes sao aditivas.
--
-- 1) `tipo` PRECISA ACEITAR 'pd_comment'. A coluna `Type of finding` do Notion
--    tem CAR (31), CL (42) e **PD Comment (21)**. Os PD Comments sao comentarios
--    de revisao do PDD, moram na mesma base e sao acompanhados junto com os
--    findings formais. Sem este valor, 21 das 95 linhas entrariam com tipo nulo
--    e a tela nao teria como distinguir exigencia da validadora de comentario de
--    revisao - que e a diferenca entre travar e nao travar a emissao.
--
-- 2) `andamento_apsis` E UMA COLUNA NOVA, e nao um sinonimo de `estado`. No
--    Notion existem DUAS colunas de situacao e elas nao andam juntas:
--      `2nd Round Findings`  Closed / Open / New Finding  -> veredito da VVB
--      `Status`              Concluido / Em andamento / Revisao -> trabalho APSIS
--    O cruzamento medido na origem tem **7 linhas em "Open -> Concluido"**: a
--    validadora ainda nao fechou o item e a APSIS ja terminou a parte dela.
--    Guardar so uma das duas apagaria justamente esses 7 casos, que sao os que
--    interessam numa reuniao de acompanhamento (o que depende de nos e o que
--    depende do auditor). `estado` continua sendo o veredito; o andamento
--    interno vem para ca.
--
-- 3) `evidencia_nota` GUARDA O TEXTO da coluna `Evidence`. Ela e mista na
--    origem: as vezes e rotulo curto (N/A, OK, Pendente), que ja cabe em
--    `estado_evidencia`, e as vezes e um paragrafo listando quais documentos
--    comprovam cada item ("Item 2 / Evidencia: Fotos e atas CLPI 2..."). Esse
--    paragrafo e exatamente o que a auditoria pede na hora de fechar o finding.
--    Sem coluna, ele seria descartado na carga.
--
-- LGPD: nada aqui guarda dado pessoal. O conteudo dos findings foi conferido
-- antes da carga (zero e-mail, zero CPF, zero telefone, nenhuma pessoa nomeada);
-- o texto trata de secoes de documento e de exigencias tecnicas do padrao.
-- =============================================================================

begin;

-- 1) tipo aceita PD Comment ---------------------------------------------------
alter table public.carbon_findings
  drop constraint if exists carbon_findings_tipo_check;

alter table public.carbon_findings
  add constraint carbon_findings_tipo_chk
  check (tipo is null or tipo in ('car', 'cl', 'pd_comment'));

comment on column public.carbon_findings.tipo is
  'car = Corrective Action Request, cl = Clarification Request (ambos travam a '
  'emissao ate serem fechados), pd_comment = comentario de revisao do PDD, que '
  'nao trava. Nulo quando a origem nao classificou.';

-- 2) andamento interno da APSIS, separado do veredito da validadora -----------
alter table public.carbon_findings
  add column if not exists andamento_apsis text
    check (andamento_apsis is null
           or andamento_apsis in ('concluido', 'em_andamento', 'revisao'));

comment on column public.carbon_findings.andamento_apsis is
  'Andamento do trabalho DA APSIS, independente de `estado`, que e o veredito da '
  'validadora. Existem casos reais de veredito aberto com andamento concluido: a '
  'APSIS entregou e aguarda o auditor. Colapsar os dois perde essa distincao.';

-- 3) texto da evidencia -------------------------------------------------------
alter table public.carbon_findings
  add column if not exists evidencia_nota text;

comment on column public.carbon_findings.evidencia_nota is
  'Texto livre da coluna Evidence do Notion: quais documentos comprovam cada '
  'item. O rotulo curto (N/A, OK, Pendente) vai para `estado_evidencia`; o '
  'paragrafo que lista as provas vem para ca.';

commit;

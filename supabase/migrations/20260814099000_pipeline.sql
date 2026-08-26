-- =============================================================================
-- Apsis Carbon - pipeline de prospeccao de novos projetos (issue #13)
-- Arquivo: 20260814099000_pipeline.sql
-- =============================================================================
-- Atende a issue #13 do backlog inicial (docs/issues/BACKLOG-INICIAL.md),
-- derivada de docs/notion/17-novos-negocios-jpf.md. Aquela pagina do Notion e a
-- especificacao de tela MAIS DETALHADA de todo o levantamento: a propria equipe
-- escreveu, em texto livre, o que o panorama de novos negocios precisa mostrar.
-- Cada bloco deste arquivo responde a uma daquelas linhas:
--
--   "E viavel pela analise ultra preliminar?"          -> carbon_candidatos.etapa
--   "premissas dessa viabilidade, as falhas, virtudes" -> tres colunas proprias
--   "Se sim, mandar proposta para viabilidade"         -> etapa proposta_viabilidade
--   "Listar em que etapa esta cada um"                 -> carbon_pipeline_listar
--   "localizacao, tamanho, quem e o parceiro"          -> uf, municipio, area, parceiro_id
--   "Mostrar matriz de criterios"                      -> carbon_criterios + notas
--   "Mapa de parceiros"                                -> carbon_parceiros (entidade)
--   "Ver na MSCI dados de mercado"                     -> preco_mercado_ref (+ data, fonte)
--   "VCUs para o CORSIA"                               -> elegivel_corsia
--   "Um slide para TI, um para REDD privado, um agro"  -> carbon_pipeline_por_segmento
--
-- O ESTADO ATUAL, QUE E O PROBLEMA. No Notion a base "Novos Negocios" tem tres
-- registros e TRES colunas: Nome, Tipo e Metodologia. Tipo e Metodologia estao
-- VAZIAS nos tres, apesar de serem exatamente os dois atributos que definem
-- viabilidade de um projeto de carbono. Ou seja: hoje a triagem e avaliacao
-- livre, sem criterio comparavel e sem registro do porque. A matriz de criterios
-- com pontuacao (secoes 2 e 4 deste arquivo) e o que muda isso, e e pedida
-- explicitamente na pagina.
--
-- QUATRO TABELAS:
--   carbon_parceiros         quem esta do outro lado da area candidata
--   carbon_criterios         as reguas da triagem, com peso
--   carbon_candidatos        a area candidata a virar projeto
--   carbon_candidato_notas   a nota de um candidato em um criterio
--
-- POR QUE PARCEIRO E ENTIDADE, E NAO UM CAMPO DE TEXTO. A pagina pede "mapa de
-- parceiros", e mapa pressupoe relacionamento: o mesmo parceiro aparece em varias
-- areas candidatas e, mais adiante, em metas e em objetivos de projeto. Como texto
-- livre, "Associacao X", "assoc. X" e "ASSOCIACAO X" seriam tres parceiros, e o
-- mapa nao existiria.
--
-- --------------------------------------------------------------------------
-- PENDENCIAS REGISTRADAS E DELIBERADAMENTE NAO RESOLVIDAS AQUI
-- --------------------------------------------------------------------------
-- 1. PARCEIRO DE EXECUCAO E A MESMA COISA QUE FORNECEDOR CONTRATADO? Pergunta
--    registrada na issue #14 e ainda sem resposta do dono. Existem hoje DUAS
--    entidades no banco: public.carbon_parceiros (esta migration, relacionamento
--    institucional na prospeccao) e public.carbon_fornecedores (migration
--    20260814097000, contratacao com CNPJ, contrato e parcela). Elas NAO foram
--    unificadas nem ligadas por chave estrangeira de proposito: unificar agora
--    obrigaria a inventar a resposta, e ligar criaria um vinculo que talvez
--    precise ser desfeito. Se a resposta for "e a mesma coisa", a fusao e uma
--    migration propria; enquanto nao for, um parceiro que tambem presta servico
--    contratado tem cadastro nas duas, e isso e a duplicacao MENOS custosa de
--    desfazer.
-- 2. O PRODUTO DESSA ANALISE HOJE E UMA APRESENTACAO ("1 slide para TI, 1 para
--    REDD privado, 1 para agro"). A pergunta ao dono e se a tela deve GERAR esse
--    material ou apenas alimenta-lo. Este arquivo apenas ALIMENTA: a view
--    public.carbon_pipeline_por_segmento entrega o panorama por segmento, que e o
--    conteudo de cada slide. Nenhuma geracao de apresentacao foi implementada.
-- 3. LEITURA ABERTA A QUALQUER COLABORADOR ATIVO. Vale para todo o sistema e
--    aguarda decisao do dono. Pipeline comercial e informacao sensivel do negocio
--    (ver Confidencialidade, abaixo), portanto e um dos dominios que mais pesam
--    nessa decisao. Nao resolvido aqui.
--
-- --------------------------------------------------------------------------
-- CONFIDENCIALIDADE E LGPD
-- --------------------------------------------------------------------------
-- Os nomes das areas candidatas sao territorios reais e representam pipeline
-- comercial NAO PUBLICO. Por isso nao ha seed de candidato nem de parceiro nesta
-- migration: o unico seed e o das reguas da triagem (carbon_criterios), que sao
-- metodologia e nao dado de cliente.
--
-- LGPD (Lei 13.709/2018): parceiro e pessoa JURIDICA. A coluna
-- contato_institucional aceita SOMENTE alias institucional de area
-- (contato@, projetos@, um telefone de central). Nome, e-mail pessoal, telefone
-- pessoal e CPF de representante NAO entram em nenhuma coluna deste arquivo, o
-- que inclui os campos de texto livre (papel, premissas, falhas, virtudes,
-- observacoes, justificativa).
--
-- Esta migration e idempotente: pode ser reaplicada sem erro.
-- =============================================================================


-- =============================================================================
-- 1. carbon_parceiros - o mapa de parceiros
-- =============================================================================
-- Entidade propria, e nao coluna de texto em carbon_candidatos, pelos dois
-- motivos do cabecalho: mapa pressupoe relacionamento, e o mesmo parceiro reaparece
-- em outros dominios.
--
-- ATENCAO A QUEM MEXER: esta tabela e criada AQUI, nesta migration. Se outro
-- dominio precisar de organizacao parceira (as metas da issue #14 vao precisar),
-- ele deve REFERENCIAR public.carbon_parceiros, nunca recriar a tabela em outra
-- migration: com "create table if not exists" a segunda definicao seria ignorada
-- em silencio e as colunas que ela esperava simplesmente nao existiriam.

create table if not exists public.carbon_parceiros (
  id                    uuid primary key default gen_random_uuid(),
  nome                  text not null,
  tipo                  text not null default 'associacao'
                          check (tipo in (
                            'associacao',
                            'instituto',
                            'empresa',
                            'orgao',
                            'investidor'
                          )),
  papel                 text,
  contato_institucional text,
  ativo                 boolean not null default true,
  criado_por            uuid references public.carbon_usuarios (id),
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),

  constraint carbon_parceiros_nome_nao_vazio_chk check (
    length(btrim(nome)) > 0
  )
);

comment on table public.carbon_parceiros is
  'Organizacoes parceiras na prospeccao de novos projetos de carbono: e o "mapa de parceiros" pedido em docs/notion/17-novos-negocios-jpf.md (issue #13). Entidade e nao campo de texto porque o mesmo parceiro aparece em varias areas candidatas e, adiante, em metas e objetivos de projeto. PENDENCIA REGISTRADA (issue #14): nao se sabe ainda se parceiro de execucao e a mesma coisa que fornecedor contratado (public.carbon_fornecedores); as duas entidades convivem sem vinculo ate o dono decidir. LGPD: pessoa juridica, nunca pessoa fisica. Escrita somente pela Edge Function carbon-api, com papel admin ou gestor.';
comment on column public.carbon_parceiros.nome is
  'Nome da organizacao. Unico campo obrigatorio: parceiro entra no mapa assim que aparece na conversa, muito antes de haver papel definido ou contato formal.';
comment on column public.carbon_parceiros.tipo is
  'associacao (associacao comunitaria ou indigena), instituto (instituto e ONG), empresa (proprietario rural, consultoria, integradora), orgao (poder publico, FUNAI, ICMBio, secretaria estadual) ou investidor (quem aporta capital no projeto). Os cinco tipos vem da issue #13 e cobrem os parceiros observados no levantamento. Tipo define expectativa de papel e de tempo de decisao: orgao publico nao responde no mesmo prazo de uma empresa.';
comment on column public.carbon_parceiros.papel is
  'O que esta organizacao faz NESTA relacao, em texto livre: detentora do direito sobre a area, representante da comunidade, anuente, executora de campo, financiadora. Texto livre de proposito: a lista de papeis reais e maior e mais movel do que um CHECK aguentaria, e forcar um enum aqui produziria o mesmo vazio das colunas Tipo e Metodologia do Notion. LGPD: descreva a FUNCAO da organizacao, nunca a pessoa que a exerce.';
comment on column public.carbon_parceiros.contato_institucional is
  'Canal institucional de area (contato@, projetos@, telefone de central). LGPD, requisito e nao preferencia: nome, e-mail pessoal, telefone pessoal e CPF de representante NAO entram aqui. Dado pessoal de terceiro em base de prospeccao exige base legal, finalidade e prazo de retencao proprios, que esta tabela nao tem; alias institucional nao e dado pessoal e resolve a necessidade real, que e saber por onde falar com a organizacao.';
comment on column public.carbon_parceiros.ativo is
  'false esconde o parceiro das listagens de trabalho sem apagar o historico: candidato que passou por ele continua apontando para o cadastro. Prospeccao encerrada nao se apaga, porque a proxima rodada comeca perguntando o que aconteceu na anterior.';
comment on column public.carbon_parceiros.criado_por is
  'Colaborador que cadastrou, para rastreabilidade. Vem do registro em carbon_usuarios resolvido pela Edge Function, nunca do corpo da requisicao.';

-- Unicidade por nome NORMALIZADO (minusculas, sem espaco nas pontas). E o que
-- impede "Associacao X", "associacao x " e "ASSOCIACAO X" de virarem tres
-- parceiros e dissolverem o mapa. Indice de expressao, e nao constraint, porque
-- unique constraint nao aceita expressao.
create unique index if not exists carbon_parceiros_nome_idx
  on public.carbon_parceiros (lower(btrim(nome)));

create index if not exists carbon_parceiros_tipo_idx
  on public.carbon_parceiros (tipo);


-- =============================================================================
-- 2. carbon_criterios - as reguas da triagem
-- =============================================================================
-- "Mostrar matriz de criterios" e pedido literal da pagina. Matriz pressupoe as
-- MESMAS reguas para todos os candidatos, senao nao ha comparacao: por isso o
-- criterio e uma linha desta tabela, e nao um campo dentro do candidato.
--
-- PESO SEPARADO DA NOTA. Dominialidade da area e acesso logistico nao valem o
-- mesmo: irregularidade fundiaria mata o projeto, estrada ruim encarece. Sem peso,
-- a media aritmetica empataria os dois e a matriz daria uma resposta errada com
-- cara de objetiva.

create table if not exists public.carbon_criterios (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  peso          numeric(6,2) not null default 1,
  descricao     text,
  ativo         boolean not null default true,
  criado_por    uuid references public.carbon_usuarios (id),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- Peso ZERO e proibido: um criterio com peso zero nao influencia nota nenhuma e
  -- ainda ocupa uma linha da matriz, pedindo avaliacao que nao serve para nada.
  -- Quem nao quer o criterio na conta usa ativo = false, que e explicito.
  constraint carbon_criterios_peso_positivo_chk check (peso > 0),

  constraint carbon_criterios_nome_nao_vazio_chk check (
    length(btrim(nome)) > 0
  )
);

comment on table public.carbon_criterios is
  'Reguas da triagem de areas candidatas, com peso. Atende ao pedido literal "Mostrar matriz de criterios" de docs/notion/17-novos-negocios-jpf.md (issue #13). Uma linha por criterio, e nao um campo por criterio dentro do candidato, porque criterio novo nao pode exigir migration e porque comparar candidatos exige que todos respondam a mesma regua. Semeada com um conjunto inicial (secao 8) que a equipe ajusta pela tela.';
comment on column public.carbon_criterios.nome is
  'Nome curto do criterio, como aparece na coluna da matriz. Unico por nome normalizado (ver carbon_criterios_nome_idx): dois criterios com o mesmo nome fariam a matriz ter duas colunas indistinguiveis.';
comment on column public.carbon_criterios.peso is
  'Quanto este criterio pesa na nota final. Numero livre e positivo (nao e percentual e nao precisa somar 100): a nota ponderada divide pela soma dos pesos avaliados, portanto acrescentar um criterio novo nao exige reequilibrar os demais. Peso ZERO e recusado por CHECK: para tirar o criterio da conta use ativo = false, que diz a mesma coisa sem deixar uma coluna inutil na matriz.';
comment on column public.carbon_criterios.descricao is
  'O que se avalia e o que significa nota alta, para duas pessoas darem notas comparaveis. Sem isto a matriz recria a avaliacao livre que ela existe para substituir, so que com numeros.';
comment on column public.carbon_criterios.ativo is
  'false tira o criterio da matriz e da conta da nota ponderada, SEM apagar as notas ja dadas (elas continuam na tabela e voltam a contar se o criterio for reativado). Historico de triagem e argumento de decisao comercial: nao se apaga.';

create unique index if not exists carbon_criterios_nome_idx
  on public.carbon_criterios (lower(btrim(nome)));

-- A matriz sempre le apenas os criterios ativos, ordenados por nome.
create index if not exists carbon_criterios_ativo_nome_idx
  on public.carbon_criterios (ativo, nome);


-- =============================================================================
-- 3. carbon_candidatos - a area candidata a virar projeto
-- =============================================================================
-- Os campos Tipo e Metodologia do Notion, hoje vazios, viram aqui `segmento`
-- (com CHECK) e `metodologia` (texto livre, igual a carbon_projetos.metodologia).
--
-- SEGMENTO COM CHECK, METODOLOGIA SEM. Os tres segmentos estao NOMEADOS pela
-- equipe na propria pagina ("um slide para TI, um para REDD privado, um para
-- agro"), sao poucos e cada um tem logica de viabilidade e parceiros diferentes:
-- cabe em CHECK. Metodologia e a lista da Verra, que muda mais rapido que o
-- sistema; texto livre, como ja e em carbon_projetos.
--
-- AS DUAS ETAPAS DE ANALISE COM O NOME QUE A EQUIPE USA. O funil tem cinco
-- estados, e os dois do meio sao os que a pagina nomeia: `analise_preliminar` e a
-- "analise ultra preliminar" (triagem rapida, sem custo) e `proposta_viabilidade`
-- e a "proposta para viabilidade" (o estudo pago, o EVTE que aparece como tarefa
-- em Atividades). Nao renomeamos para vocabulario paralelo de proposito: a equipe
-- precisa reconhecer a propria etapa na tela.
--
-- NAO EXISTE COLUNA "e_viavel". A resposta a pergunta "e viavel pela analise ultra
-- preliminar?" e a ETAPA (aprovado ou descartado) somada a premissas, falhas e
-- virtudes, e agora tambem a nota ponderada da matriz. Um booleano separado seria
-- uma quarta forma de dizer a mesma coisa, e a primeira a ficar desatualizada.

create table if not exists public.carbon_candidatos (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,
  segmento            text not null default 'redd_privado'
                        check (segmento in (
                          'terra_indigena',
                          'redd_privado',
                          'agro'
                        )),
  metodologia         text,
  uf                  text,
  municipio           text,
  area_estimada_ha    numeric(14,4),
  parceiro_id         uuid references public.carbon_parceiros (id) on delete set null,
  etapa               text not null default 'triagem'
                        check (etapa in (
                          'triagem',
                          'analise_preliminar',
                          'proposta_viabilidade',
                          'aprovado',
                          'descartado'
                        )),
  premissas           text,
  falhas              text,
  virtudes            text,

  -- Referencias externas de decisao. Ver o comentario de cada coluna.
  preco_mercado_ref   numeric(14,4),
  preco_mercado_moeda text not null default 'USD'
                        check (preco_mercado_moeda in ('USD', 'BRL', 'EUR')),
  preco_mercado_data  date,
  preco_mercado_fonte text,
  elegivel_corsia     boolean,

  observacoes         text,

  -- Vinculo com o projeto criado a partir deste candidato (secao 7).
  projeto_id          uuid references public.carbon_projetos (id) on delete set null,

  criado_por          uuid references public.carbon_usuarios (id),
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),

  constraint carbon_candidatos_nome_nao_vazio_chk check (
    length(btrim(nome)) > 0
  ),

  -- Sigla de UF em duas maiusculas. A Edge Function normaliza antes de gravar; o
  -- CHECK garante que "para" e "PA " nao convivam com "PA" e quebrem o filtro por
  -- estado, que e como a equipe olha o pipeline.
  constraint carbon_candidatos_uf_chk check (
    uf is null or uf ~ '^[A-Z]{2}$'
  ),

  constraint carbon_candidatos_area_positiva_chk check (
    area_estimada_ha is null or area_estimada_ha >= 0
  ),

  constraint carbon_candidatos_preco_positivo_chk check (
    preco_mercado_ref is null or preco_mercado_ref >= 0
  )
);

comment on table public.carbon_candidatos is
  'Areas candidatas a se tornarem projeto de carbono: o pipeline de prospeccao (issue #13, docs/notion/17-novos-negocios-jpf.md). Substitui a base "Novos Negocios" do Notion, onde as colunas Tipo e Metodologia existiam e estavam VAZIAS nos tres registros, apesar de serem o que define viabilidade. CONFIDENCIALIDADE: o nome de uma candidata e um territorio real e o conjunto e pipeline comercial nao publico. LGPD: nenhum campo de texto desta tabela recebe dado de pessoa fisica. Escrita somente pela Edge Function carbon-api, com papel admin ou gestor.';
comment on column public.carbon_candidatos.nome is
  'Como a equipe se refere a area candidata. Unico campo obrigatorio: a area entra no pipeline no dia em que alguem a menciona, e o resto e o trabalho de triagem.';
comment on column public.carbon_candidatos.segmento is
  'terra_indigena (o "TI" da equipe), redd_privado (o "REDD privado") ou agro. Sao os tres segmentos NOMEADOS pela propria equipe na pagina do Notion ("um slide para TI, um para REDD privado, um para agro") e correspondem ao campo Tipo, que estava vazio. Cada segmento tem logica de viabilidade, parceiros e prazo diferentes, e por isso o panorama por segmento (public.carbon_pipeline_por_segmento) e uma view propria.';
comment on column public.carbon_candidatos.metodologia is
  'Metodologia candidata, ex.: VM0048. Texto livre e nao CHECK, igual a carbon_projetos.metodologia: a lista da Verra muda mais rapido que o sistema. Correspondia a coluna Metodologia do Notion, tambem vazia.';
comment on column public.carbon_candidatos.uf is
  'Sigla da unidade federativa, duas maiusculas (ver carbon_candidatos_uf_chk). Metade do "mostrar um pouco de cada area: localizacao" da pagina; a outra metade e o municipio. Georreferenciamento de verdade so entra quando a candidata vira projeto (carbon_projetos.geometria): exigir shapefile na triagem travaria o funil no primeiro estagio, que e justamente o que precisa ser rapido.';
comment on column public.carbon_candidatos.municipio is
  'Municipio principal da area. Pode nao existir um so quando a area cruza limites: nesse caso vale o municipio de referencia, e o detalhe fica em observacoes.';
comment on column public.carbon_candidatos.area_estimada_ha is
  'Tamanho ESTIMADO em hectares, o "tamanho" pedido na pagina. Estimado de proposito: na triagem o numero vem de conversa ou de mapa aproximado, e nao ha geometria para calcular. Quando a candidata vira projeto, este valor e copiado para carbon_projetos.area_declarada_ha e passa a ser confrontado com a area calculada da geometria (o aviso de divergencia de 5% da due diligence). Ou seja: aqui e estimativa, la e afirmacao documental.';
comment on column public.carbon_candidatos.parceiro_id is
  'Quem esta do outro lado da area ("quem e o parceiro", na pagina). NULL e estado valido e informativo: area sem parceiro identificado e area sem porta de entrada, e o resumo do pipeline conta essas separadamente. ON DELETE SET NULL porque apagar um cadastro de parceiro nao pode apagar a candidata.';
comment on column public.carbon_candidatos.etapa is
  'Etapa no funil, com os nomes que a equipe usa: triagem (entrou na lista, ninguem analisou), analise_preliminar (a "analise ultra preliminar" da pagina, triagem rapida e sem custo), proposta_viabilidade (a "proposta para viabilidade", o estudo pago, o EVTE que aparece como tarefa em Atividades), aprovado (viavel, pode virar projeto) e descartado (nao segue). Nao existe coluna booleana "e viavel": a resposta e esta etapa somada a premissas, falhas, virtudes e a nota ponderada da matriz.';
comment on column public.carbon_candidatos.premissas is
  'De que a viabilidade DEPENDE. Pedido literal da pagina ("quais as premissas dessa viabilidade"). E o campo que evita a pergunta de seis meses depois: por que dissemos que dava? LGPD: nenhum nome de pessoa aqui.';
comment on column public.carbon_candidatos.falhas is
  'O que joga contra: pendencia fundiaria, sobreposicao, ausencia de anuencia, dado faltando. Pedido literal da pagina. Registrado ao lado das virtudes de proposito: candidato descartado por uma falha que depois se resolve volta ao funil, e sem este campo ninguem lembra qual era a falha.';
comment on column public.carbon_candidatos.virtudes is
  'O que joga a favor: ameaca de desmatamento demonstravel, parceiro organizado, area continua, acesso viavel. Pedido literal da pagina.';
comment on column public.carbon_candidatos.preco_mercado_ref is
  'Preco de referencia do credito futuro por tCO2e. A pagina pede "ver na MSCI dados de mercado", e a leitura do levantamento e explicita: a decisao de prospectar DEPENDE de preco de mercado e de elegibilidade, o que liga prospeccao a comercializacao. Numero de REFERENCIA, nunca preco contratado: contrato de venda pertence ao dominio de comercializacao.';
comment on column public.carbon_candidatos.preco_mercado_moeda is
  'Moeda do preco de referencia. NOT NULL com default USD porque credito de carbono e cotado em dolar por convencao de mercado; quando nao ha preco a coluna e inerte. Guardar a moeda evita a comparacao silenciosa de USD com BRL na mesma coluna, que num pipeline com candidatos de origens diferentes e erro de fator cinco.';
comment on column public.carbon_candidatos.preco_mercado_data is
  'Data da cotacao usada. Sem ela o preco mente por omissao: em um ano ninguem sabe se USD 8 era a cotacao de 2024 ou de 2026, e a decisao de prospectar teria sido tomada com base num numero que nao se pode auditar.';
comment on column public.carbon_candidatos.preco_mercado_fonte is
  'Onde a cotacao foi lida (a MSCI citada na pagina, um relatorio de mercado, uma negociacao em curso). Referencia externa sem fonte nao e verificavel.';
comment on column public.carbon_candidatos.elegivel_corsia is
  'O credito futuro tende a ser elegivel para o CORSIA (esquema de compensacao da aviacao internacional)? TRES estados de proposito, e por isso a coluna e ANULAVEL: true (indicios de elegibilidade), false (avaliado e nao elegivel) e NULL (ainda nao avaliado). NULL e false sao decisoes diferentes, e um default false apagaria essa diferenca marcando como nao elegivel tudo que ninguem olhou. Importa porque elegibilidade CORSIA muda o preco do credito, ou seja muda a conta que decide prospectar.';
comment on column public.carbon_candidatos.observacoes is
  'Anotacao operacional que nao cabe em premissas, falhas nem virtudes. LGPD: nao registrar nome, telefone, e-mail pessoal nem CPF de ninguem neste campo.';
comment on column public.carbon_candidatos.projeto_id is
  'Projeto criado a partir deste candidato, ou NULL. Preenchido SOMENTE por public.carbon_candidato_criar_projeto, nunca pela API: e o campo que torna a conversao idempotente (segundo clique devolve o projeto existente em vez de criar um duplicado). ON DELETE SET NULL de proposito: se o projeto for apagado, o candidato volta a ser convertivel, em vez de ficar apontando para um id que nao existe mais.';

create index if not exists carbon_candidatos_etapa_idx
  on public.carbon_candidatos (etapa);
create index if not exists carbon_candidatos_segmento_idx
  on public.carbon_candidatos (segmento);
create index if not exists carbon_candidatos_parceiro_idx
  on public.carbon_candidatos (parceiro_id);

-- Um projeto nasce de no maximo um candidato. Indice unico PARCIAL porque NULL nao
-- colide com NULL em Postgres: varios candidatos podem estar sem conversao.
create unique index if not exists carbon_candidatos_projeto_idx
  on public.carbon_candidatos (projeto_id)
  where projeto_id is not null;


-- =============================================================================
-- 4. carbon_candidato_notas - a nota de um candidato em um criterio
-- =============================================================================
-- Uma linha por cruzamento candidato x criterio: e a matriz. Linha AUSENTE
-- significa "nao avaliado", que e diferente de nota zero, e essa distincao e a
-- regra central do calculo (ver secao 6).

create table if not exists public.carbon_candidato_notas (
  id            uuid primary key default gen_random_uuid(),
  candidato_id  uuid not null references public.carbon_candidatos (id) on delete cascade,
  criterio_id   uuid not null references public.carbon_criterios (id) on delete cascade,
  nota          numeric(4,2) not null,
  justificativa text,
  criado_por    uuid references public.carbon_usuarios (id),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- Faixa 0 a 10, a escala que a equipe ja usa para falar de nota. numeric e nao
  -- integer para caber o 7,5 sem forcar arredondamento na hora de avaliar.
  constraint carbon_candidato_notas_faixa_chk check (nota >= 0 and nota <= 10),

  -- Uma nota por cruzamento. Sem isto, duas avaliacoes do mesmo criterio contariam
  -- as duas na media ponderada, dobrando o peso daquele criterio em silencio.
  constraint carbon_candidato_notas_unica unique (candidato_id, criterio_id)
);

comment on table public.carbon_candidato_notas is
  'Nota de um candidato em um criterio: as celulas da matriz de criterios pedida em docs/notion/17-novos-negocios-jpf.md (issue #13). LINHA AUSENTE SIGNIFICA NAO AVALIADO, e nao nota zero - a diferenca e a regra central de public.carbon_candidatos_listagem: criterio sem nota fica FORA do denominador, senao um candidato com dois criterios avaliados apareceria pior do que um com oito, o que inverteria a comparacao que a matriz existe para permitir. ON DELETE CASCADE nos dois lados: nota sem candidato ou sem criterio nao significa nada.';
comment on column public.carbon_candidato_notas.nota is
  'Nota de 0 a 10 (ver carbon_candidato_notas_faixa_chk). Escala que a equipe ja usa para falar de avaliacao. Aceita uma casa decimal (7,5) porque forcar inteiro na hora de avaliar produz arredondamento arbitrario. O peso NAO entra aqui: ele e do criterio, e a ponderacao acontece no calculo.';
comment on column public.carbon_candidato_notas.justificativa is
  'Por que esta nota. E o que separa matriz de criterios de chute com numero: sem justificativa, a nota 4 em dominialidade nao informa se falta documento ou se ha litigio. LGPD: descreva o fato, nunca a pessoa.';
comment on column public.carbon_candidato_notas.criado_por is
  'Quem avaliou, para rastreabilidade da triagem. Vem do registro em carbon_usuarios resolvido pela Edge Function, nunca do corpo da requisicao.';

create index if not exists carbon_candidato_notas_candidato_idx
  on public.carbon_candidato_notas (candidato_id);
create index if not exists carbon_candidato_notas_criterio_idx
  on public.carbon_candidato_notas (criterio_id);


-- =============================================================================
-- 5. Trigger de atualizado_em (uma funcao para as quatro tabelas)
-- =============================================================================
-- Uma funcao serve as quatro porque nao referencia tabela nenhuma: so escreve
-- NEW.atualizado_em. Mesmo caminho das migrations de findings e de fornecedores.

create or replace function public.carbon_pipeline_set_atualizado_em()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

comment on function public.carbon_pipeline_set_atualizado_em() is
  'Mantem atualizado_em em dia a cada UPDATE nas quatro tabelas do dominio de pipeline (carbon_parceiros, carbon_criterios, carbon_candidatos, carbon_candidato_notas). Uma funcao serve as quatro porque nao referencia tabela: so escreve NEW.atualizado_em.';

drop trigger if exists carbon_parceiros_atualizado_em on public.carbon_parceiros;
create trigger carbon_parceiros_atualizado_em
  before update on public.carbon_parceiros
  for each row
  execute function public.carbon_pipeline_set_atualizado_em();

drop trigger if exists carbon_criterios_atualizado_em on public.carbon_criterios;
create trigger carbon_criterios_atualizado_em
  before update on public.carbon_criterios
  for each row
  execute function public.carbon_pipeline_set_atualizado_em();

drop trigger if exists carbon_candidatos_atualizado_em on public.carbon_candidatos;
create trigger carbon_candidatos_atualizado_em
  before update on public.carbon_candidatos
  for each row
  execute function public.carbon_pipeline_set_atualizado_em();

drop trigger if exists carbon_candidato_notas_atualizado_em on public.carbon_candidato_notas;
create trigger carbon_candidato_notas_atualizado_em
  before update on public.carbon_candidato_notas
  for each row
  execute function public.carbon_pipeline_set_atualizado_em();


-- =============================================================================
-- 6. Views
-- =============================================================================
-- DROP antes de CREATE, e nao "create or replace view": replace exige a MESMA
-- lista de colunas, na mesma ordem, entao acrescentar uma coluna numa revisao
-- desta migration faria a reaplicacao falhar. Com drop na ordem inversa das
-- dependencias, o arquivo continua idempotente.
--
-- security_invoker = true em todas: sem isso a view roda com os privilegios do
-- dono e passaria por cima da RLS das tabelas. Como anon e authenticated nao tem
-- privilegio nenhum aqui (revoke na secao 9), sao duas camadas na mesma direcao.

drop view if exists public.carbon_pipeline_por_segmento;
drop view if exists public.carbon_parceiros_listagem;
drop view if exists public.carbon_candidatos_listagem;


-- 6.1 Candidatos com parceiro e nota ponderada --------------------------------
-- AQUI MORA A REGRA DA NOTA PONDERADA, e ela mora aqui UMA VEZ. A Edge Function,
-- as demais funcoes SQL deste arquivo e o dataset de demonstracao do frontend
-- copiam desta definicao; se a conta estivesse escrita em cada lugar que a mostra,
-- divergiriam na primeira mudanca de peso.
--
--   nota_ponderada = soma(nota * peso) / soma(peso), somente sobre os criterios
--                    ATIVOS que TEM nota, arredondada em 2 casas.
--
-- Tres decisoes dentro dessa linha:
--
-- 1. E MEDIA PONDERADA, NAO SOMA. O resultado fica na mesma escala da nota (0 a
--    10) e nao cresce quando alguem acrescenta um criterio. Soma faria o candidato
--    avaliado em oito criterios "ganhar" do avaliado em quatro por construcao.
--
-- 2. CRITERIO SEM NOTA FICA FORA DO DENOMINADOR. Tratar ausencia como zero
--    puniria quem ainda esta sendo avaliado e inverteria a ordem do pipeline. E o
--    mesmo cuidado que os capitulos nao aplicaveis recebem no progresso do PDD.
--
-- 3. POR ISSO A COBERTURA VAI JUNTO. Nota 9,0 com um criterio de oito avaliados
--    nao e comparavel com nota 7,5 com os oito. cobertura_pct existe para a tela
--    poder mostrar as duas informacoes lado a lado, e sem ela a nota isolada
--    seria uma meia-verdade com aparencia de precisao.
--
-- Criterio INATIVO sai dos dois lados da conta, mas as notas ja dadas continuam
-- guardadas e voltam a contar se ele for reativado.

create view public.carbon_candidatos_listagem
  with (security_invoker = true)
as
select
  c.id,
  c.nome,
  c.segmento,
  c.metodologia,
  c.uf,
  c.municipio,
  c.area_estimada_ha,
  c.parceiro_id,
  p.nome  as parceiro_nome,
  p.tipo  as parceiro_tipo,
  p.ativo as parceiro_ativo,
  c.etapa,
  -- Ordem do funil, para a listagem sair na sequencia em que a equipe pensa
  -- (triagem primeiro, descartado por ultimo) sem a tela reimplementar a ordem.
  case c.etapa
    when 'triagem'              then 1
    when 'analise_preliminar'   then 2
    when 'proposta_viabilidade' then 3
    when 'aprovado'             then 4
    when 'descartado'           then 5
    else 9
  end as etapa_ordem,
  c.premissas,
  c.falhas,
  c.virtudes,
  c.preco_mercado_ref,
  c.preco_mercado_moeda,
  c.preco_mercado_data,
  c.preco_mercado_fonte,
  c.elegivel_corsia,
  c.observacoes,
  c.projeto_id,
  (c.projeto_id is not null) as convertido,
  c.criado_por,
  c.criado_em,
  c.atualizado_em,

  ativos.total                                    as criterios_ativos,
  coalesce(notas.avaliados, 0)                    as criterios_avaliados,
  coalesce(notas.peso_avaliado, 0)                as peso_avaliado,

  case
    when coalesce(notas.peso_avaliado, 0) > 0
      then round(notas.soma_ponderada / notas.peso_avaliado, 2)
    else null
  end as nota_ponderada,

  case
    when ativos.total > 0
      then round(coalesce(notas.avaliados, 0)::numeric * 100 / ativos.total, 1)
    else null
  end as cobertura_pct

from public.carbon_candidatos c
left join public.carbon_parceiros p
  on p.id = c.parceiro_id
-- Quantos criterios ativos existem. Igual para todas as linhas, mas precisa estar
-- na consulta para virar o denominador da cobertura.
cross join (
  select count(*)::int as total
  from public.carbon_criterios
  where ativo
) ativos
left join (
  select
    n.candidato_id,
    count(*)::int                       as avaliados,
    sum(cr.peso)                        as peso_avaliado,
    sum(n.nota * cr.peso)               as soma_ponderada
  from public.carbon_candidato_notas n
  join public.carbon_criterios cr on cr.id = n.criterio_id
  where cr.ativo
  group by n.candidato_id
) notas
  on notas.candidato_id = c.id;

comment on view public.carbon_candidatos_listagem is
  'Candidatos do pipeline com o parceiro resolvido e a AVALIACAO calculada. E a fonte unica da nota ponderada: nota_ponderada = soma(nota * peso) / soma(peso), somente sobre criterios ATIVOS que TEM nota, arredondada em 2 casas. Media ponderada e nao soma (fica na escala 0 a 10 e nao cresce ao acrescentar criterio); criterio sem nota fica FORA do denominador (tratar ausencia como zero puniria quem esta em avaliacao); e por isso cobertura_pct vem junto, porque nota 9,0 com 1 de 8 criterios nao e comparavel com 7,5 com 8 de 8. Criterio inativo sai dos dois lados da conta sem perder as notas ja dadas. A Edge Function e o dataset de demonstracao do frontend copiam DESTA definicao.';


-- 6.2 Mapa de parceiros -------------------------------------------------------
-- "Mapa de parceiros" com contagem por etapa: e o que transforma uma lista de
-- organizacoes em mapa. Sem os agregados, a tela de parceiro nao responde a
-- pergunta que se faz dela, que e quanto pipeline depende de cada parceiro.

create view public.carbon_parceiros_listagem
  with (security_invoker = true)
as
select
  pa.id,
  pa.nome,
  pa.tipo,
  pa.papel,
  pa.contato_institucional,
  pa.ativo,
  pa.criado_por,
  pa.criado_em,
  pa.atualizado_em,
  coalesce(ag.candidatos, 0)             as candidatos,
  coalesce(ag.em_analise, 0)             as candidatos_em_analise,
  coalesce(ag.aprovados, 0)              as candidatos_aprovados,
  coalesce(ag.descartados, 0)            as candidatos_descartados,
  coalesce(ag.convertidos, 0)            as candidatos_convertidos,
  coalesce(ag.area_total_ha, 0)          as area_total_ha,
  ag.segmentos
from public.carbon_parceiros pa
left join (
  select
    c.parceiro_id,
    count(*)::int                                                as candidatos,
    -- "Em analise" agrupa os tres estados que ainda estao em jogo: e a leitura
    -- que a tela de parceiro precisa (quanto pipeline vivo passa por aqui).
    count(*) filter (
      where c.etapa in ('triagem', 'analise_preliminar', 'proposta_viabilidade')
    )::int                                                       as em_analise,
    count(*) filter (where c.etapa = 'aprovado')::int             as aprovados,
    count(*) filter (where c.etapa = 'descartado')::int           as descartados,
    count(*) filter (where c.projeto_id is not null)::int         as convertidos,
    coalesce(sum(c.area_estimada_ha), 0)                          as area_total_ha,
    -- Segmentos distintos em que este parceiro aparece, ordenados. Um parceiro que
    -- transita entre terra indigena e agro e informacao de estrategia.
    (
      select array_agg(distinct s.segmento order by s.segmento)
      from public.carbon_candidatos s
      where s.parceiro_id = c.parceiro_id
    )                                                             as segmentos
  from public.carbon_candidatos c
  where c.parceiro_id is not null
  group by c.parceiro_id
) ag
  on ag.parceiro_id = pa.id;

comment on view public.carbon_parceiros_listagem is
  'Parceiros com o pipeline que passa por cada um: e o "mapa de parceiros" pedido em docs/notion/17-novos-negocios-jpf.md. candidatos_em_analise agrupa triagem, analise_preliminar e proposta_viabilidade, ou seja o pipeline ainda vivo, que e a leitura util na tela de parceiro. A coluna segmentos mostra em quantas frentes diferentes o parceiro atua.';


-- 6.3 Panorama por segmento ---------------------------------------------------
-- "Um slide para TI, um para REDD privado, um para agro" e a frase que revela o
-- formato de saida real desta analise hoje: uma apresentacao. Esta view ALIMENTA
-- esse material, com um registro por segmento. Gerar a apresentacao NAO esta no
-- escopo e depende de decisao do dono (pendencia 2 do cabecalho).
--
-- Sai por FROM de lista fixa, e nao por group by, para os tres segmentos
-- aparecerem sempre, inclusive zerados: segmento sem candidato nenhum e
-- informacao (ninguem esta prospectando agro), e um group by o esconderia.

create view public.carbon_pipeline_por_segmento
  with (security_invoker = true)
as
select
  s.segmento,
  count(c.id)::int                                                as candidatos,
  count(c.id) filter (where c.etapa = 'triagem')::int              as triagem,
  count(c.id) filter (where c.etapa = 'analise_preliminar')::int    as analise_preliminar,
  count(c.id) filter (where c.etapa = 'proposta_viabilidade')::int  as proposta_viabilidade,
  count(c.id) filter (where c.etapa = 'aprovado')::int             as aprovado,
  count(c.id) filter (where c.etapa = 'descartado')::int           as descartado,
  count(c.id) filter (where c.convertido)::int                     as convertidos,
  count(c.id) filter (where c.elegivel_corsia is true)::int        as elegiveis_corsia,
  count(c.id) filter (where c.criterios_avaliados = 0)::int        as sem_avaliacao,
  coalesce(sum(c.area_estimada_ha), 0)                             as area_total_ha,
  round(avg(c.nota_ponderada), 2)                                  as nota_media,
  round(avg(c.preco_mercado_ref), 2)                               as preco_medio
from (values ('terra_indigena'), ('redd_privado'), ('agro')) as s(segmento)
left join public.carbon_candidatos_listagem c
  on c.segmento = s.segmento
group by s.segmento;

comment on view public.carbon_pipeline_por_segmento is
  'Panorama do pipeline por segmento (terra_indigena, redd_privado, agro), um registro por segmento SEMPRE, inclusive zerado - segmento sem candidato e informacao, e um group by comum o esconderia. Alimenta o material de apresentacao que hoje e o produto desta analise ("um slide para TI, um para REDD privado, um para agro"); GERAR a apresentacao nao esta no escopo e depende de decisao do dono. nota_media e preco_medio ignoram os nulos, portanto sao a media do que FOI avaliado, e sem_avaliacao diz quantos ficaram de fora.';


-- =============================================================================
-- 7. Funcoes
-- =============================================================================

-- 7.1 Listagem do pipeline ----------------------------------------------------
-- RPC devolvendo jsonb, e nao tres selects na Edge Function, pelo mesmo motivo do
-- dominio de reunioes: os agregados aparecem na listagem, no resumo do topo e no
-- panorama por segmento. Definidos em tres lugares, divergem na primeira mudanca,
-- e o dataset de demonstracao do frontend nao teria UMA definicao para copiar.
--
-- O RESUMO E O PANORAMA IGNORAM OS FILTROS, de proposito. `candidatos` respeita o
-- filtro (e a lista que a pessoa pediu), mas resumo e por_segmento sao o retrato
-- do funil INTEIRO: filtrar por segmento e ver o funil daquele segmento apenas
-- esconderia que os outros dois existem, e e justamente a comparacao entre
-- segmentos que a pagina do Notion pede.

create or replace function public.carbon_pipeline_listar(
  p_segmento    text default null,
  p_etapa       text default null,
  p_parceiro_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'candidatos', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.etapa_ordem, f.nome)
      from public.carbon_candidatos_listagem f
      where (p_segmento is null or f.segmento = p_segmento)
        and (p_etapa is null or f.etapa = p_etapa)
        and (p_parceiro_id is null or f.parceiro_id = p_parceiro_id)
    ), '[]'::jsonb),

    'resumo', (
      select jsonb_build_object(
        'total', count(*),
        'por_etapa', jsonb_build_object(
          'triagem',              count(*) filter (where etapa = 'triagem'),
          'analise_preliminar',   count(*) filter (where etapa = 'analise_preliminar'),
          'proposta_viabilidade', count(*) filter (where etapa = 'proposta_viabilidade'),
          'aprovado',             count(*) filter (where etapa = 'aprovado'),
          'descartado',           count(*) filter (where etapa = 'descartado')
        ),
        'convertidos',         count(*) filter (where convertido),
        'elegiveis_corsia',    count(*) filter (where elegivel_corsia is true),
        'corsia_nao_avaliado', count(*) filter (where elegivel_corsia is null),
        'sem_parceiro',        count(*) filter (where parceiro_id is null),
        -- O numero que mostra o tamanho do problema que a matriz resolve: quantos
        -- candidatos seguem sem nenhuma nota, ou seja em avaliacao livre.
        'sem_avaliacao',       count(*) filter (where criterios_avaliados = 0),
        'area_total_ha',       coalesce(sum(area_estimada_ha), 0),
        'nota_media',          round(avg(nota_ponderada), 2)
      )
      from public.carbon_candidatos_listagem
    ),

    'por_segmento', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.candidatos desc, s.segmento)
      from public.carbon_pipeline_por_segmento s
    ), '[]'::jsonb),

    'criterios_ativos', (
      select count(*) from public.carbon_criterios where ativo
    )
  );
$$;

comment on function public.carbon_pipeline_listar(text, text, uuid) is
  'Payload da tela de pipeline: { candidatos, resumo, por_segmento, criterios_ativos }. Os filtros valem SOMENTE para candidatos; resumo e por_segmento sao sempre o funil inteiro, porque e a comparacao entre segmentos que a issue #13 pede e filtrar esconderia os outros dois. resumo.sem_avaliacao e o numero que mede o problema que a matriz de criterios resolve: quantos candidatos seguem sem nota nenhuma.';


-- 7.2 Detalhe de um candidato -------------------------------------------------
-- Devolve tambem os criterios ATIVOS, e nao apenas as notas existentes, porque a
-- matriz da tela precisa mostrar a LINHA VAZIA do criterio ainda nao avaliado. Se
-- viessem so as notas, o criterio nao avaliado desapareceria da tela e ninguem
-- lembraria de avaliar - exatamente o buraco que a matriz existe para fechar.

create or replace function public.carbon_candidato_detalhe(p_candidato_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not exists (
      select 1 from public.carbon_candidatos where id = p_candidato_id
    ) then null
    else jsonb_build_object(
      'candidato', (
        select to_jsonb(c)
        from public.carbon_candidatos_listagem c
        where c.id = p_candidato_id
      ),
      'notas', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id',             n.id,
            'candidato_id',   n.candidato_id,
            'criterio_id',    n.criterio_id,
            'criterio_nome',  cr.nome,
            'criterio_peso',  cr.peso,
            'criterio_ativo', cr.ativo,
            'nota',           n.nota,
            'justificativa',  n.justificativa,
            'criado_em',      n.criado_em,
            'atualizado_em',  n.atualizado_em
          )
          order by cr.nome
        )
        from public.carbon_candidato_notas n
        join public.carbon_criterios cr on cr.id = n.criterio_id
        where n.candidato_id = p_candidato_id
      ), '[]'::jsonb),
      'criterios', coalesce((
        select jsonb_agg(to_jsonb(cr) order by cr.nome)
        from public.carbon_criterios cr
        where cr.ativo
      ), '[]'::jsonb)
    )
  end;
$$;

comment on function public.carbon_candidato_detalhe(uuid) is
  'Detalhe de um candidato: { candidato, notas, criterios }. Devolve NULL quando o id nao existe, para a Edge Function responder 404 sem uma consulta extra. `criterios` traz os criterios ATIVOS, e nao apenas os que ja tem nota, porque a matriz precisa exibir a linha vazia do criterio nao avaliado - se so viessem as notas, o criterio esquecido desapareceria da tela. `notas` inclui as de criterio inativo (com criterio_ativo = false), que existem no historico mas nao entram no calculo.';


-- 7.3 Avaliacao recalculada ---------------------------------------------------
-- Usada depois de gravar ou apagar uma nota, para a tela atualizar a nota
-- ponderada sem recarregar a lista inteira. Le a VIEW, e nao repete a formula.

create or replace function public.carbon_candidato_avaliacao(p_candidato_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'candidato_id',        c.id,
    'criterios_ativos',    c.criterios_ativos,
    'criterios_avaliados', c.criterios_avaliados,
    'peso_avaliado',       c.peso_avaliado,
    'nota_ponderada',      c.nota_ponderada,
    'cobertura_pct',       c.cobertura_pct
  )
  from public.carbon_candidatos_listagem c
  where c.id = p_candidato_id;
$$;

comment on function public.carbon_candidato_avaliacao(uuid) is
  'Agregado de avaliacao de um candidato, para a tela atualizar a nota ponderada logo depois de gravar ou apagar uma nota. Le public.carbon_candidatos_listagem em vez de repetir a formula: a conta da nota ponderada existe em UM lugar.';


-- 7.4 Comparacao lado a lado --------------------------------------------------
-- "Comparar candidatos lado a lado" e o gesto que a matriz habilita. Uma chamada
-- so, e nao uma por candidato: a comparacao precisa das mesmas linhas de criterio
-- para todos, e montar isso com N requisicoes deixaria a tela pedindo dados em
-- cascata e mostrando colunas que aparecem uma a uma.
--
-- `notas` vem como OBJETO indexado por criterio_id (e nao lista) porque a tela
-- monta uma grade: para cada linha de criterio, buscar a nota de cada candidato.
-- Com lista, cada celula custaria uma varredura.

create or replace function public.carbon_candidatos_comparar(p_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'criterios', coalesce((
      select jsonb_agg(to_jsonb(cr) order by cr.nome)
      from public.carbon_criterios cr
      where cr.ativo
    ), '[]'::jsonb),

    'candidatos', coalesce((
      select jsonb_agg(
        to_jsonb(c) || jsonb_build_object(
          'notas', coalesce((
            select jsonb_object_agg(
              n.criterio_id::text,
              jsonb_build_object('nota', n.nota, 'justificativa', n.justificativa)
            )
            from public.carbon_candidato_notas n
            join public.carbon_criterios cr on cr.id = n.criterio_id
            where n.candidato_id = c.id
              and cr.ativo
          ), '{}'::jsonb)
        )
        order by c.nome
      )
      from public.carbon_candidatos_listagem c
      where c.id = any (p_ids)
    ), '[]'::jsonb)
  );
$$;

comment on function public.carbon_candidatos_comparar(uuid[]) is
  'Comparacao lado a lado de candidatos: { criterios, candidatos }, cada candidato com a linha da listagem (nota ponderada e cobertura inclusas) mais `notas` como OBJETO indexado por criterio_id. Objeto e nao lista porque a tela monta uma grade criterio x candidato, e com lista cada celula custaria uma varredura. Uma chamada so para todos os candidatos: com uma por candidato as colunas apareceriam uma a uma. Id inexistente e simplesmente ignorado, em vez de derrubar a comparacao inteira. O limite de quantos candidatos cabem na comparacao e da Edge Function, nao daqui.';


-- 7.5 Candidato aprovado vira projeto -----------------------------------------
-- Criterio de aceite da issue #13: "Candidato aprovado vira Projeto". A criacao
-- vive no BANCO, e nao na Edge Function, porque sao duas escritas que precisam ser
-- atomicas: inserir em carbon_projetos e marcar projeto_id no candidato. Em duas
-- chamadas HTTP, uma falha no meio deixaria projeto criado sem vinculo, e o proximo
-- clique criaria um segundo projeto igual, sem ninguem perceber.
--
-- COPIA "O QUE DER", e o que nao da fica em branco de proposito:
--   nome              -> nome
--   metodologia       -> metodologia
--   uf                -> estado
--   municipio         -> municipio
--   area_estimada_ha  -> area_declarada_ha (de estimativa passa a afirmacao documental)
--   pais              -> 'Brasil' (default da coluna, mantido explicito na conversa)
--
-- NAO copia proponente: parceiro nem sempre e o proponente do projeto (pode ser
-- anuente, executor de campo ou orgao), e adivinhar isso plantaria um dado errado
-- justamente no campo que a due diligence confere. Fica em branco para alguem
-- preencher com a entidade correta.
--
-- standard e status_registro ficam nos defaults de carbon_projetos ('VCS+CCB' e
-- 'rascunho'): projeto nascido de candidato e rascunho por definicao.

create or replace function public.carbon_candidato_criar_projeto(
  p_candidato_id uuid,
  p_criado_por   uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_candidato public.carbon_candidatos;
  v_projeto_id uuid;
begin
  -- FOR UPDATE serializa dois cliques simultaneos no mesmo candidato: o segundo
  -- espera, encontra projeto_id preenchido e devolve o projeto existente.
  select * into v_candidato
  from public.carbon_candidatos
  where id = p_candidato_id
  for update;

  if not found then
    raise exception 'nao_encontrado';
  end if;

  -- Idempotente: segundo clique NAO cria projeto duplicado nem devolve erro, porque
  -- o usuario que clica de novo quer chegar ao projeto, e nao ser repreendido.
  -- criado = false diz a tela que nada novo aconteceu.
  if v_candidato.projeto_id is not null then
    return jsonb_build_object(
      'criado',       false,
      'candidato_id', v_candidato.id,
      'projeto_id',   v_candidato.projeto_id
    );
  end if;

  -- Somente candidato APROVADO vira projeto. Deixar qualquer etapa converter
  -- transformaria o cadastro de projetos no proprio pipeline, e as duas listas
  -- passariam a significar a mesma coisa.
  if v_candidato.etapa <> 'aprovado' then
    raise exception 'candidato_nao_aprovado';
  end if;

  insert into public.carbon_projetos (
    nome,
    metodologia,
    pais,
    estado,
    municipio,
    area_declarada_ha,
    criado_por
  )
  values (
    v_candidato.nome,
    v_candidato.metodologia,
    'Brasil',
    v_candidato.uf,
    v_candidato.municipio,
    v_candidato.area_estimada_ha,
    p_criado_por
  )
  returning id into v_projeto_id;

  update public.carbon_candidatos
  set projeto_id = v_projeto_id
  where id = p_candidato_id;

  return jsonb_build_object(
    'criado',       true,
    'candidato_id', v_candidato.id,
    'projeto_id',   v_projeto_id
  );
end;
$$;

comment on function public.carbon_candidato_criar_projeto(uuid, uuid) is
  'Cria o projeto de carbono a partir de um candidato APROVADO e grava o vinculo, na MESMA transacao (criterio de aceite da issue #13). Copia nome, metodologia, uf -> estado, municipio e area_estimada_ha -> area_declarada_ha; NAO copia proponente, porque parceiro nem sempre e o proponente e adivinhar plantaria dado errado no campo que a due diligence confere. IDEMPOTENTE: candidato ja convertido devolve { criado: false, projeto_id } em vez de criar um segundo projeto igual. Recusa etapa diferente de aprovado com a mensagem candidato_nao_aprovado, e id inexistente com nao_encontrado; a Edge Function traduz as duas em codigo HTTP.';


-- =============================================================================
-- 8. Seed das reguas da triagem
-- =============================================================================
-- POR QUE SEMEAR CRITERIOS E NAO CANDIDATOS. Criterio e METODOLOGIA de analise de
-- projeto de carbono: publico, generico, sem dado de cliente. Candidato e pipeline
-- comercial nao publico, com nome de territorio real, e por isso nao entra em
-- migration nenhuma (ver Confidencialidade no cabecalho).
--
-- Sem seed, a matriz nasce vazia e a primeira triagem continua sendo avaliacao
-- livre - o estado atual que a issue #13 quer resolver. Com seed, a equipe comeca
-- com reguas defensaveis e ajusta peso, texto e ativo pela tela.
--
-- Os oito criterios saem do que o levantamento aponta como decisivo: dominialidade
-- e georreferenciamento (exigencias duras do checklist de due diligence em
-- docs/notion/12-be-zero.md e findings recorrentes do VVB), metodologia,
-- adicionalidade e permanencia (o que a Verra confere), governanca local (o
-- parceiro, e o consentimento nos casos de terra indigena), custo de campo, e as
-- duas referencias externas que a propria pagina pede, preco de mercado e
-- elegibilidade CORSIA.
--
-- Idempotencia por "where not exists" sobre o nome normalizado, e nao por
-- "on conflict": o indice unico e de EXPRESSAO (lower(btrim(nome))), e inferencia
-- de conflito por expressao e fragil de escrever e pior de ler. O efeito e o
-- mesmo, e reaplicar a migration nao duplica nem sobrescreve o que a equipe ja
-- ajustou pela tela.

insert into public.carbon_criterios (nome, peso, descricao)
select v.nome, v.peso, v.descricao
from (
  values
    (
      'Dominialidade e regularidade da area',
      3.00,
      'Quem detem o direito sobre a area e sobre o carbono, e se a documentacao sustenta isso. Nota alta: titularidade clara, sem litigio e sem sobreposicao. Nota baixa: cadeia dominial incerta, area em disputa ou sem anuencia de quem decide. E o criterio que mais derruba projeto depois de investimento feito, e por isso tem peso maximo.'
    ),
    (
      'Georreferenciamento disponivel',
      2.00,
      'Existe arquivo geoespacial da area (shapefile, KML, GeoPackage ou GeoJSON) e ele fecha com o tamanho declarado. Nota alta: poligono entregue e coerente. Nota baixa: apenas descricao em texto ou mapa aproximado. A due diligence exige consistencia entre area declarada e geometria, com aviso acima de 5% de divergencia; sem o arquivo, essa checagem nao existe.'
    ),
    (
      'Elegibilidade da metodologia',
      3.00,
      'Ha metodologia aplicavel ao tipo de area e ao uso do solo, e o projeto cabe nos requisitos dela. Nota alta: metodologia definida e aplicavel sem ginastica. Nota baixa: nenhuma metodologia se encaixa, ou o encaixe depende de interpretacao que o validador pode recusar.'
    ),
    (
      'Adicionalidade e linha de base',
      3.00,
      'Ha ameaca real e demonstravel ao estoque de carbono, ou seja o projeto muda um cenario que aconteceria sem ele. Nota alta: pressao de desmatamento documentada e linha de base defensavel. Nota baixa: area conservada sem ameaca demonstravel, onde o credito nao se sustenta.'
    ),
    (
      'Risco de reversao e permanencia',
      2.00,
      'Quanto do carbono corre risco de voltar para a atmosfera por desmatamento, fogo, invasao ou mudanca de uso, e o que existe para conter isso. Nota alta: risco baixo e mitigacao ja em operacao. Nota baixa: pressao alta sem qualquer estrutura de protecao.'
    ),
    (
      'Governanca local e parceiro',
      2.00,
      'A organizacao parceira existe, representa de fato quem precisa ser representado e tem capacidade de execucao. Nota alta: parceiro atuante, com governanca reconhecida e disposicao registrada. Nota baixa: nenhuma contraparte identificada, ou representatividade contestada. Em terra indigena este criterio carrega o consentimento livre, previo e informado, sem o qual o projeto nao existe.'
    ),
    (
      'Acesso, logistica e custo de campo',
      1.00,
      'Quanto custa e quanto demora chegar a area para inventario, monitoramento e visita de auditoria. Nota alta: acesso rodoviario e base proxima. Nota baixa: acesso fluvial ou aereo com janela sazonal. Peso menor de proposito: encarece o projeto, mas nao o inviabiliza como os criterios de direito e de metodologia.'
    ),
    (
      'Preco de mercado e elegibilidade CORSIA',
      2.00,
      'O retorno esperado do credito futuro sustenta o custo de estruturar o projeto. Nota alta: preco de referencia favoravel e indicios de elegibilidade para o CORSIA, que muda o preco do credito. Nota baixa: preco de referencia baixo e sem perspectiva de elegibilidade. Sao as duas referencias externas que a propria equipe pediu na pagina do Notion, e o que liga prospeccao a comercializacao.'
    )
) as v(nome, peso, descricao)
where not exists (
  select 1
  from public.carbon_criterios c
  where lower(btrim(c.nome)) = lower(btrim(v.nome))
);


-- =============================================================================
-- 9. RLS, privilegios e grants
-- =============================================================================
-- Mesmo padrao das migrations anteriores: RLS ligada e NENHUMA policy (portanto
-- nada passa fora do service_role, que ignora RLS), revoke explicito de anon e
-- authenticated, grant so para service_role. O Supabase concede privilegios
-- default a anon e authenticated em objetos novos do schema public, portanto sem o
-- revoke as tabelas e as views nasceriam legiveis pela anon key - que e a chave
-- que vai no bundle do navegador. Pipeline comercial nao publico e exatamente o
-- dado que nao pode escapar assim.

alter table public.carbon_parceiros enable row level security;
revoke all on table public.carbon_parceiros from anon, authenticated;
grant all on table public.carbon_parceiros to service_role;

alter table public.carbon_criterios enable row level security;
revoke all on table public.carbon_criterios from anon, authenticated;
grant all on table public.carbon_criterios to service_role;

alter table public.carbon_candidatos enable row level security;
revoke all on table public.carbon_candidatos from anon, authenticated;
grant all on table public.carbon_candidatos to service_role;

alter table public.carbon_candidato_notas enable row level security;
revoke all on table public.carbon_candidato_notas from anon, authenticated;
grant all on table public.carbon_candidato_notas to service_role;

revoke all on public.carbon_candidatos_listagem    from anon, authenticated;
revoke all on public.carbon_parceiros_listagem     from anon, authenticated;
revoke all on public.carbon_pipeline_por_segmento  from anon, authenticated;

grant select on public.carbon_candidatos_listagem   to service_role;
grant select on public.carbon_parceiros_listagem    to service_role;
grant select on public.carbon_pipeline_por_segmento to service_role;

-- Funcoes: EXECUTE tambem e concedido por default a public em objeto novo, entao o
-- revoke vem antes do grant. Assinatura completa em cada linha porque revoke e
-- grant de funcao exigem os tipos dos parametros.
revoke all on function public.carbon_pipeline_set_atualizado_em()
  from public, anon, authenticated;
revoke all on function public.carbon_pipeline_listar(text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.carbon_candidato_detalhe(uuid)
  from public, anon, authenticated;
revoke all on function public.carbon_candidato_avaliacao(uuid)
  from public, anon, authenticated;
revoke all on function public.carbon_candidatos_comparar(uuid[])
  from public, anon, authenticated;
revoke all on function public.carbon_candidato_criar_projeto(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.carbon_pipeline_listar(text, text, uuid)
  to service_role;
grant execute on function public.carbon_candidato_detalhe(uuid)
  to service_role;
grant execute on function public.carbon_candidato_avaliacao(uuid)
  to service_role;
grant execute on function public.carbon_candidatos_comparar(uuid[])
  to service_role;
grant execute on function public.carbon_candidato_criar_projeto(uuid, uuid)
  to service_role;

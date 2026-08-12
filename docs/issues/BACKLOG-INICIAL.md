# Backlog inicial - Portal Apsis Carbon

Gerado em 2026-08-12 a partir do levantamento do Notion
(ver [notion-levantamento.md](../notion-levantamento.md) e `docs/notion/`).

**Formato:** cada issue começa em `## ISSUE:`. A linha `labels:` é opcional. O restante é o corpo.
O script `scripts/criar-issues.mjs` lê este arquivo e cria as issues no GitHub.

**Como as issues foram classificadas:**

- `[base-real]` derivada de base em uso no Notion, com estrutura observada. Pode ir para
  implementação.
- `[lacuna]` funcionalidade ausente que a operação claramente precisa, mas que **ninguém escreveu
  como pedido**. Escopo proposto por mim, precisa de validação antes de estimar.
- `[descoberta]` não há estrutura para engenharia reversa. A issue é para levantar com o dono, não
  para implementar.

Nenhuma issue contém dado pessoal nem conteúdo confidencial de cliente, por decisão explícita.

---

## ISSUE: [base-real] Entidade Projeto: cadastro base do qual tudo depende

labels: enhancement

**Contexto.** O levantamento do Notion não encontrou cadastro de projeto em lugar nenhum. A página
`Projetos` do Parakanã, apesar do nome, é biblioteca de entregáveis
(`docs/notion/07-projetos-parakana.md`). Hoje o projeto é implícito porque só existe um. Todas as
outras telas penduram nele.

**Escopo.** Cadastro de projeto de carbono com: nome, proponente, standard e metodologia,
área e localização, período de creditação, datas de início e marcos, status no registro e ID no
registro (com IDs anteriores, caso tenha migrado de outro standard).

**Por que esses campos.** Não são invenção: são exatamente os itens 1, 3 e 4 do checklist de due
diligence da BeZero (`docs/notion/12-be-zero.md`).

**Critérios de aceite.**
- Criar, editar e listar projetos.
- Um projeto é pré-requisito para PDD, monitoramento, findings, metas e documentos.
- Área aceita arquivo geoespacial vetorial (Shapefile, KML, GeoPackage, GeoJSON).
- Campo de área em hectares consistente com a geometria, com aviso quando divergir mais de 5%
  (exigência literal da BeZero, item 4).

**Dependências.** Nenhuma. É a base do resto.

---

## ISSUE: [base-real] Template de PDD com a estrutura VCS + CCB

labels: enhancement

**Contexto.** `docs/notion/05-pdd-parakana.md`. O Notion tem o rastreador de capítulos do PDD com
45 linhas, hierarquia de até três níveis, status e responsável por capítulo, e percentual agregado.
A estrutura completa está capturada no arquivo de levantamento.

**Escopo.** Tela de PDD por projeto: árvore de capítulos, status e responsável por capítulo,
progresso agregado. Template VCS+CCB pré-carregado, de modo que projeto novo nasça com os 45
capítulos.

**Critérios de aceite.**
- Criar PDD a partir do template com um clique.
- Hierarquia de três níveis, numeração preservada (1, 1.1, 2.2.1).
- Capítulos marcados como opcionais no padrão (3.4, 4.5, 5.5) podem ser marcados como não
  aplicáveis e saem do cálculo de progresso. Sem isso o PDD nunca fecha 100%.
- Progresso por capítulo raiz e total.

**Decisão pendente.** O sistema guarda o texto do capítulo ou só rastreia status e aponta para o
arquivo? Hoje o Notion só rastreia; o conteúdo mora em pasta. Definir antes de implementar.

**Dependências.** Entidade Projeto.

---

## ISSUE: [base-real] Relatório de monitoramento por capítulo, com rodadas de revisão

labels: enhancement

**Contexto.** `docs/notion/08-monitoring-report.md`. A página tem 59 backlinks, é a mais
referenciada do workspace. Estrutura de capítulos própria, diferente do PDD, focada em comprovar
impacto realizado.

**Escopo.** Capítulos do relatório de monitoramento por projeto, com status, responsável e campo de
orientação para quem escreve.

**O ponto central.** O status observado inclui `Revisão 2`. O fluxo **não é** rascunho para
pronto: é um ciclo com número de volta. O status precisa suportar rodada numerada, não um booleano.

**Critérios de aceite.**
- Capítulos com hierarquia e numeração.
- Status com rodada de revisão explícita.
- Campo de orientação por capítulo, separado do conteúdo.
- Template dos capítulos de monitoramento pré-carregado (estrutura capturada no levantamento).

**Dependências.** Entidade Projeto.

---

## ISSUE: [base-real] Checklist de evidências para auditoria, por seção do padrão

labels: enhancement

**Contexto.** `docs/notion/08-monitoring-report.md`, base `Auditing Documents`. É o controle das
evidências que a validadora exige, indexado por seção do padrão VCS/CCB. Hoje o status de um item é
`Anexado Pasta`, ou seja: "está numa pasta em algum lugar". Esse é exatamente o problema a resolver.

**Escopo.** Checklist por projeto, com o item exigido, a seção do padrão que o exige, responsável,
status, e vínculo real com os documentos que o satisfazem.

**Critérios de aceite.**
- Template pré-carregado com as seções e evidências do padrão VCS+CCB (26 itens capturados no
  levantamento: Project Area, Ownership, Project start date, crediting period, Implementation
  schedule, Double counting, SD contributions, FPIC e consulta, Management capacity, SOP,
  Monitoring plan, entre outros).
- Relação muitos-para-muitos entre item e documento: um documento satisfaz vários itens e um item
  exige vários documentos.
- `N/A` como estado de primeira classe, senão o checklist nunca fecha.
- Dois eixos de progresso independentes: resposta redigida e evidência aceita. Um item pode estar
  concluído com evidência pendente.

**Dependências.** Entidade Projeto, entidade Documento.

---

## ISSUE: [base-real] Findings de auditoria: entidade única para VVB, Verra e BeZero

labels: enhancement

**Contexto.** `docs/notion/09-vvb-findings.md`, `10-findings-verra.md`, `12-be-zero.md`.

O projeto responde a **três processos externos distintos**, e no Notion são três bases separadas
com as **mesmas seis views**: VVB (auditoria credenciada, 95 findings, tipos CAR e CL), Verra (o
programa, 6 findings, só CL) e BeZero (agência de rating de crédito, 31 itens).

São a mesma entidade com origem diferente.

**Escopo.** Uma entidade de finding com: origem (VVB, Verra, BeZero), tipo (CAR, CL), documento
alvo (PDD ou relatório de monitoramento), seção referenciada, descrição do apontamento, ação
exigida, plano de resposta, evidências, responsável, status e estado da evidência.

**Critérios de aceite.**
- Rodada de auditoria como **entidade**, não coluna. No Notion cada rodada nova exigiria coluna
  nova, e a coluna atual se chama literalmente `2nd Round Findings`.
- **Subitens verificáveis** dentro do finding, com progresso agregado. Hoje a equipe soca checklist
  item por item dentro do campo de comentários, com dezenas de linhas do tipo
  `2.3.12 - Sem itálico OK`. É a lacuna mais evidente da ferramenta atual.
- Vínculo com o capítulo real do PDD ou do relatório, em vez de texto livre "Section 2.1.16".
- Vínculo com a entidade de evidência.
- Campos bilíngues: apontamento e exigência chegam em inglês, resposta interna é em português, e o
  documento final vai em inglês. Vários findings existem justamente por conteúdo em português onde
  a norma exige inglês.
- Separar rascunho de trabalho da resposta oficial.
- Estado de espera por terceiro, com responsável. Respostas mencionam repasse ao jurídico e a
  equipes externas, e hoje o finding fica parado sem dono aparente.
- Seis views: lista, board por status, por rodada, por estado de evidência, por tipo e por origem.

**Controle de acesso.** Findings tratam de material de auditoria com comunidade indígena. Acesso
restrito por projeto e papel, com trilha de auditoria. Não é conteúdo para todo colaborador
autenticado.

**Dependências.** Entidade Projeto, Documento, PDD e monitoramento.

---

## ISSUE: [base-real] Entidade Documento única por projeto

labels: enhancement

**Contexto.** Há três lugares diferentes guardando documento do mesmo projeto: `Projetos` com
entregáveis anexados, `Documentos Parakanã`, e o checklist de evidências dentro do
`Monitoring Report`. Isso é sintoma, não desenho.

**Escopo.** Uma entidade de documento por projeto, com tipo, versão, data, autor e vínculos.

**Critérios de aceite.**
- Versionamento explícito. Hoje só existe data de upload, e PDD e relatório passam por várias
  rodadas com a validadora.
- Origem registrada, inclusive quando o documento vem de parceiro externo.
- Tipos heterogêneos: geoespacial, planilha, PDF, imagem.
- Referenciável pelo checklist de evidências e pelos findings.

**Decisão pendente.** Armazenar no Supabase Storage ou referenciar repositório externo? O padrão
atual é pasta compartilhada, que é justamente o problema.

---

## ISSUE: [base-real] Atividades: base única com projeto como dimensão

labels: enhancement

**Contexto.** `docs/notion/03-atividades-apsis-carbon.md` e `15-atividades-parakana-e-menores.md`.
Existem **duas bases quase idênticas**, uma do backoffice e uma do projeto, divergindo em detalhes
provavelmente acidentais: intervalo de datas contra data única, e ausência das colunas de hora na
do projeto. A do backoffice está viva; a do projeto está com 0% e prazos vencidos há meses.

**Escopo.** Base única de atividades, com projeto como dimensão opcional.

**Critérios de aceite.**
- Campos: status, nome, responsável, período, prioridade, tipo, horas planejadas e executadas.
- Views: em andamento, agrupado por status, timeline e concluídas. A timeline não é enfeite: é como
  a equipe enxerga sobreposição de prazos.
- Agregações de contagem e de soma de horas por view.
- Prioridade editável em massa ou por arrastar, porque é repriorizada na reunião semanal.
- Controle de quem vê horas de quem.

**Pergunta ao dono.** Por que a base do projeto não pegou no uso, enquanto a do backoffice está
viva? A resposta muda o desenho.

---

## ISSUE: [base-real] Apontamento de horas

labels: enhancement

**Contexto.** É a demanda escrita mais clara de todo o levantamento. A base de atividades tem as
colunas `HH planejadas` e `HH Executada`, e a segunda está **vazia em todos os registros**. A pauta
da reunião semanal anota, literalmente: *"lembrar de contar as horas (quando tiver a
funcionalidade)"*.

A equipe planeja horas, quer comparar com o realizado, e não tem como apontar.

**Escopo.** Apontamento de horas por colaborador, alimentando o realizado da atividade.

**Critérios de aceite.**
- Granularidade mínima de apontamento por dia e por atividade, que é o necessário para fechar horas
  de consultoria.
- Comparação planejado contra realizado, por atividade, por tipo e por período.
- Lançamento rápido: a atualização é feita ao longo da semana, em tempo contínuo, não em lote no
  fim do mês.
- Colaborador vê e edita o próprio apontamento; consolidado é restrito.

**Dependências.** Atividades.

---

## ISSUE: [base-real] Reuniões e atas, com a ata servindo de evidência de auditoria

labels: enhancement

**Contexto.** `docs/notion/01-reunioes-apsis-carbon.md` e `18-reunioes-parakana.md`. Duas bases,
cadência semanal contínua desde setembro de 2025, com o mesmo problema de divergência de esquema
das atividades. A pauta da weekly está documentada e é um processo real e estável.

**O achado que dá valor.** No Parakanã, reuniões temáticas de governança coincidem exatamente com o
que os findings da Verra pedem para esclarecer. Atas de reunião de consulta e de governança são
**evidência exigida na auditoria**. Se a ata nascer estruturada no sistema, ela já pode ser
vinculada ao item de evidência, em vez de ser garimpada depois numa pasta.

**Escopo.** Reuniões com cadência recorrente, tipo, participantes e ata estruturada.

**Critérios de aceite.**
- Cadência recorrente, não cadastro manual repetido.
- Tipo de reunião como campo, não convenção no título. Valores já existentes no dado: semanal,
  semanal por parceiro, temática.
- Organização parceira como participante, permitindo filtrar histórico por parceiro. No Parakanã a
  semanal se desdobra por parceiro, com duas reuniões na mesma data.
- Ata com campos para pontos de atenção e barreiras, que são os dois artefatos que a pauta exige
  nominalmente.
- Ata gera pendências que alimentam o backlog de atividades.
- Ata vinculável a item do checklist de evidências.
- Base única para backoffice e projeto.

**Dependências.** Atividades. Para o vínculo de evidência: checklist de auditoria.

---

## ISSUE: [base-real] Fornecedores

labels: enhancement

**Contexto.** `docs/notion/02-fornecedores.md`. Base em uso, com views de tabela, quadro e galeria.

**Escopo.** Cadastro de fornecedores com nome, CNPJ, status de contratação e contratante.

**Requisito de privacidade, obrigatório.** Existe um campo `Dados Bancários`. Ele **não pode** ser
replicado como texto livre numa tabela que qualquer colaborador lista:
- acesso restrito por papel;
- não exibir em listagem, só no detalhe e sob permissão;
- se algum fornecedor for pessoa física ou MEI, é dado pessoal sob LGPD.

**Critérios de aceite.**
- Cadastro com os campos acima e as três views.
- Dados bancários atendendo às restrições acima.

---

## ISSUE: [base-real] Contratos de fornecedor e parcelas

labels: enhancement

**Contexto.** `docs/notion/02-fornecedores.md`. Demanda escrita na própria página do Notion:
*"Criar controle de contratações, cadastrar contratos, obrigações financeiras"* e
*"Colunas: fornecedor, data de contratação, cadastrar parcelas"*. A base de parcelas existente está
marcada como *"esse é um exemplo para ser seguido"*.

**A lacuna estrutural.** Falta a entidade **Contrato** entre fornecedor e parcelas. Hoje as
parcelas penduram direto no fornecedor.

**Escopo.** Contrato por fornecedor, com geração de parcelas.

**Critérios de aceite.**
- Contrato com fornecedor, data de contratação, objeto, valor e centro de custo.
- Geração automática de parcelas a partir de valor, quantidade e periodicidade, com vencimento
  calculado. As parcelas observadas são mensais e de mesmo valor, ou seja, geradas, não digitadas.
- Parcela com tipo de serviço, valor, centro de custo, vencimento, data de pagamento e descrição.
- **Status derivado de data, não campo manual:** em aberto, a vencer, vencida, paga. Hoje há um
  `Status Pgto` manual convivendo com o campo de data de pagamento, o que permite divergência.
- Views de em aberto, pagas e calendário.
- Totalização por período e por centro de custo.

**Dependências.** Fornecedores.

---

## ISSUE: [base-real] Visitas comerciais, com follow-up cobrado

labels: enhancement

**Contexto.** `docs/notion/04-relatorio-de-visitas.md`. Base em uso, com duas ondas de visitas em
duas capitais.

**Dois problemas observados no dado.** As visitas são registradas uma a uma repetindo cidade e
data, embora uma viagem gere várias visitas no mesmo dia e local. E o follow-up está quase todo em
"não iniciada", o que sugere que não tem dono nem prazo.

**Escopo.** Registro de visitas agrupadas por viagem, com follow-up cobrado.

**Critérios de aceite.**
- Conceito de viagem ou rodada agrupando visitas por cidade e período.
- Follow-up com responsável e data prevista, com destaque para o que passou do prazo.
- Vínculo com o cadastro de clientes e com o funil comercial.

**Requisitos de LGPD, obrigatórios.** A base guarda nome, telefone e e-mail de contatos em empresas
externas, ou seja, dado pessoal de terceiros:
- base legal registrada (interesse legítimo em prospecção B2B) e finalidade explícita;
- não exibir contato, telefone e e-mail em listagem aberta, só no detalhe e sob permissão;
- exclusão a pedido do titular e prazo de retenção definido;
- não permitir exportação da base com dados de contato sem controle e registro.

---

## ISSUE: [base-real] Pipeline de prospecção de novos projetos

labels: enhancement

**Contexto.** `docs/notion/17-novos-negocios-jpf.md`. A página traz a especificação de tela mais
detalhada do levantamento, escrita em texto livre pela própria equipe.

**Escopo.** Pipeline de áreas candidatas a se tornarem projeto de carbono, com triagem por
critérios.

**Critérios de aceite.**
- Candidato com segmento, metodologia, localização, tamanho e parceiro. Os campos `Tipo` e
  `Metodologia` existem hoje e estão vazios, apesar de serem o que define viabilidade.
- Segmentos nomeados pela equipe: Terra Indígena, REDD privado e agro.
- Duas etapas de análise, com os nomes que a equipe usa: análise ultra preliminar (triagem) e
  proposta para viabilidade (estudo).
- **Matriz de critérios com pontuação**, comparável entre candidatos. É pedida explicitamente.
- Registro de premissas, falhas e virtudes da viabilidade.
- Mapa de parceiros, com parceiro como entidade e não campo de texto.
- Referências externas de decisão: preço de mercado e elegibilidade do crédito futuro para CORSIA.
  A decisão de prospectar depende disso.
- Candidato aprovado vira Projeto.

**Pergunta ao dono.** O produto dessa análise hoje é uma apresentação ("1 slide para TI, 1 para
REDD privado, 1 para agro"). A tela deve gerar esse material ou apenas alimentá-lo?

**Dependências.** Entidade Projeto.

---

## ISSUE: [base-real] Metas e indicadores do projeto

labels: enhancement

**Contexto.** `docs/notion/13-objetivos-parakana.md` e `15-atividades-parakana-e-menores.md`.

O par está pela metade dos dois lados: as metas existem, organizadas por frente e por parceiro
responsável, mas os valores estão **literalmente como placeholder `XX` e `xxx` no texto** ("instalar
XX câmeras", "aumentar a venda em XX%"). E a base `Indicadores` está **vazia**, só com a coluna
`Name`.

Ou seja: meta sem número e indicador sem estrutura. As duas telas nascem juntas ou nenhuma
funciona.

**Escopo.** Metas quantificadas por projeto, com indicadores de acompanhamento.

**Critérios de aceite.**
- Meta com descrição, frente, organização responsável, **valor alvo e unidade separados do texto**,
  período, e valor realizado. Sem separar valor e unidade do texto é impossível medir, que é o
  estado atual.
- Organização parceira como entidade, com escopo delegado.
- Ações recorrentes com sazonalidade. Há rondas quinzenais na seca e mensais na chuva: não cabem
  como tarefa única.
- Vínculo meta, indicador e evidência. As metas de monitoramento produzem exatamente as evidências
  que a auditoria exige, e fechar esse vínculo evita garimpar evidência depois.

**Pergunta ao dono.** Parceiro de execução de projeto é a mesma entidade que fornecedor contratado?
Se sim, unifica.

**Escopo a confirmar.** Há metas de cadeia produtiva de bioeconomia (castanha, açaí, certificação),
que é um domínio diferente de crédito de carbono. Confirmar se entra.

**Dependências.** Entidade Projeto.

---

## ISSUE: [lacuna] Estoque e comercialização de crédito de carbono

labels: enhancement

**Contexto.** `docs/notion/14-compradores.md`. Esta é a **maior lacuna funcional do levantamento**,
e ninguém a escreveu como demanda.

O Notion tem `Compradores` com nome, país, data de compra, status e e-mail. E nada mais. **Não
existe, em nenhuma página varrida, controle de estoque nem de emissão de crédito.** Não há como
responder quanto do estoque já foi vendido, nem conciliar com o registro da Verra.

**Escopo proposto** (precisa de validação, porque não deriva de estrutura existente).

- **Comprador:** cadastro com país e recorrência. Sigilo **no nível do registro**: um comprador está
  hoje cadastrado com o nome `NDA`, ou seja, existe comprador cujo nome não pode ser exibido para
  todo mundo. Não é permissão de tela, é permissão de linha.
- **Transação de venda** como entidade separada: volume em tCO2e, preço, moeda, vintage, número ou
  faixa de serial no registro, data, contrato vinculado, e se houve ajuste correspondente sob o
  Artigo 6 do Acordo de Paris. Venda internacional levanta essa questão, e ela aparece no checklist
  da BeZero.
- **Estoque por projeto e por vintage:** emitido, vendido, aposentado e buffer de não permanência.
  O conceito de buffer já é conhecido da equipe, aparece no checklist da BeZero.
- Vínculo com o financeiro: receita de carbono é entrada do modelo financeiro exigido pela BeZero.

**Antes de estimar.** Validar o escopo com o dono. É a única issue grande cujo desenho é inteiramente
proposto por mim.

**Dependências.** Entidade Projeto.

---

## ISSUE: [lacuna] Comunidade do projeto: agregados, com decisão pendente sobre o nominal

labels: question

**Contexto e alerta.** `docs/notion/11-comunidade-parakana.md`. Esta é a página de **maior
sensibilidade de todo o workspace**.

O Notion contém censo nominal de membros de comunidade indígena: nome, aldeia, grupo e data de
nascimento, com anexos separando **crianças de 0 a 11 anos**.

Na LGPD: origem étnica é dado pessoal **sensível** por definição expressa (Art. 5º, II), e dado de
criança tem proteção específica com consentimento de responsável legal (Art. 14), sempre no melhor
interesse da criança. O vínculo nome, aldeia e grupo permite localizar a pessoa fisicamente.

**Recomendação.** Não replicar o censo nominal no sistema. O caminho tecnicamente seguro é o
sistema guardar **apenas agregados** (contagem por aldeia, grupo, sexo e faixa etária), que é o que
a metodologia CCB exige para demonstrar impacto, deixando o nominal fora.

**Escopo desta issue.**
1. Cadastro de **aldeias**, com grupo e lideranças. É pouco sensível comparado ao nominal e é o
   que se liga a georreferenciamento e a atividades de campo.
2. Camada **agregada** de população por aldeia, grupo, sexo e faixa etária, versionada por data de
   levantamento. O sistema precisa responder "qual era a população na data X": um finding do VVB
   questiona exatamente a variação no número de aldeias ao longo do projeto.
3. Origem do dado registrada, porque parte vem de parceiro externo.

**Fora de escopo até decisão formal.** O censo nominal. Se for necessário, exige antes: relatório de
impacto à proteção de dados, base legal definida, e conversa com o jurídico e com as associações
representativas. Se implementado, requer módulo isolado, acesso restrito por papel, criptografia em
repouso, trilha de auditoria de todo acesso e nenhuma exportação sem registro.

**Dependências.** Entidade Projeto.

---

## ISSUE: [descoberta] Funil comercial da consultoria: levantar antes de especificar

labels: question

**Contexto.** `docs/notion/16-consultoria.md`. A página `Consultoria` do Notion era a expectativa
principal do levantamento e **está vazia**: três blocos de toggle (`Oportunidades (OPs)`,
`Propostas (APs)`, `Consultorias (APs)`) criados há um ano, sem nada dentro. A página `Clientes`
também está vazia.

**Conclusão.** O lado comercial da consultoria não é gerenciado em nenhum sistema. A operação
acontece e deixa rastro em três lugares (visitas comerciais, atividades de tipo Consultoria e
Novos Negócios, e o panorama de novos negócios), mas não há funil.

**Por que esta issue não é de implementação.** Escrever especificação detalhada a partir de três
toggles vazios seria inventar requisito. Isso precisa de conversa.

**O único aproveitável, e é informativo.** Propostas e Consultorias compartilham a sigla `AP`, o que
sugere que **o mesmo documento muda de estado** em vez de virar outro registro: uma AP nasce
proposta e, se aceita, passa a ser a consultoria. O funil teria então dois objetos, OP e AP, não
três.

**Perguntas a levantar.**
- OP e AP são dois objetos, com AP mudando de estado? Ou três registros distintos?
- Como a oportunidade nasce hoje, na prática? Visita, indicação, edital?
- O que define passagem de OP para AP, e de AP proposta para AP contratada?
- Clientes precisa de cadastro próprio, ou organização visitada já resolve?
- Qual a relação com o pipeline de novos projetos, que é outro funil?

**Entregável.** Documento de levantamento e, a partir dele, as issues de implementação.

---

## ISSUE: [descoberta] Capital Humano: estrutura a definir

labels: question

**Contexto.** `docs/notion/06-paginas-vazias-e-stubs.md`. A página `CH` do Notion tem só o esqueleto
de uma base `Cadastro Colaborador`, com a coluna `Nome` e zero registros.

Não há estrutura para engenharia reversa.

**O que já se sabe de outras telas.** Colaborador aparece como responsável em atividades (com horas
planejadas e executadas), em capítulos de PDD e de monitoramento, e em findings. Ou seja, existe
uma noção de colaborador espalhada pelo sistema, com implicação de permissão e de dado de
desempenho.

**Perguntas a levantar.**
- O cadastro de colaborador do Carbon é próprio, ou vem do Portal Apsis, que já tem tabelas de
  capital humano?
- Quais dados são necessários de fato? Lembrar que o Carbon não deve guardar dado pessoal além do
  necessário: e-mail corporativo e dados funcionais, nunca CPF, RG ou dado bancário.
- Quem pode ver horas de quem?

**Entregável.** Definição de escopo e, se houver escopo próprio, as issues de implementação.

---

## ISSUE: [base-real] Provisionar o Supabase e ligar o app à configuração real

labels: enhancement

**Contexto.** O frontend de login e boas-vindas está pronto e roda em modo demonstração. Nada foi
executado contra banco: a migration e as Edge Functions são arquivos no repositório. Passo a passo
completo em `docs/setup-supabase.md`.

**Escopo.**
- Criar o projeto Supabase dedicado.
- Rodar a migration `supabase/migrations/20260807120000_init_apsis_carbon.sql`.
- Publicar as Edge Functions `app-config` e `carbon-api`, ambas com `verify_jwt` desabilitado.
- Registrar o app no Azure AD como SPA, com redirect para `http://localhost:5175` e para a URL de
  produção.
- Gravar `clientId` e `tenantId` na linha `azure` de `carbon_app_config`.
- Preencher `.env` com URL e chave anônima e desligar `VITE_CARBON_DEMO`.

**Critérios de aceite.**
- `curl` no endpoint `app-config` responde com `azure`, `app`, `login` e `flags`.
- Login com conta corporativa funciona e o domínio é validado no servidor.
- Tela de boas-vindas carrega módulos e avisos sem erro.

**Pendência do dono.** Confirmar o alias institucional de suporte. O seed usa `ti@apsis.com.br` e
esse endereço aparece como link na tela de boas-vindas: se o alias não existir, o link não chega a
ninguém.

---

## ISSUE: [base-real] Ajustar o gradiente final do painel de login

labels: enhancement

**Contexto.** O painel do login é verde porque a arte do logo tem a palavra CARBON em branco, que
desaparecia no painel branco original. O gradiente está na variável CSS `--carbon-painel-fundo`,
calibrável no DevTools sem recompilar.

**Escopo.** Fixar os valores escolhidos pelo dono no código e, se desejado, migrar para a linha
`login` de `carbon_app_config`, de modo que a troca passe a ser um `UPDATE` sem deploy.

**Critérios de aceite.**
- Valores definidos pelo dono aplicados.
- Contraste do texto sobre o painel acima de 4,5:1 (hoje está em 10,5:1 no ponto mais claro).
- Ritmo vertical do painel revisado: o logo horizontal tem 89px de altura contra 235px da arte
  quadrada anterior, e o espaçamento abaixo dele não foi recalibrado.

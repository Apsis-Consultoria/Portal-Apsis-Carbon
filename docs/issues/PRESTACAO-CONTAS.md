# Prestação de contas e atividades do Parakanã

Gerado em 2026-09-01 a partir da leitura completa de três planilhas da operação:
`Antecipação Grupo de Baixo.xlsx`, `Antecipação Grupo de Cima.xlsx` e
`Atividade Parakanã.xlsx` (25 abas, ~3.500 linhas úteis).

**Formato:** o mesmo de [BACKLOG-INICIAL.md](BACKLOG-INICIAL.md). Cada issue começa em
`## ISSUE:`. A linha `labels:` é opcional. `scripts/criar-issues.mjs` lê este arquivo.

**Classificação:** `[base-real]` derivada de estrutura observada, pode ir para implementação.
`[lacuna]` a operação precisa e ninguém pediu por escrito. `[descoberta]` não há o que
implementar ainda: é para levantar com o dono.

**Nenhuma issue contém dado pessoal**, por decisão explícita, como em BACKLOG-INICIAL.md.

---

## O que as três planilhas são

| Arquivo | O que é | Fonte de verdade |
|---|---|---|
| Antecipação Grupo de Baixo | razão de antecipação e despesa de um grupo | aba `Extrato`, 178 lançamentos |
| Antecipação Grupo de Cima | o mesmo processo, outro grupo, com comprovante linha a linha | aba `Base de dados`, ~1.375 comprovantes |
| Atividade Parakanã | controle de atividades por Monitoring Report | abas `MR - 1`, `MR -2`, `MR 3 - 2026`, ~473 atividades |

**Grupo de Baixo e Grupo de Cima são o mesmo processo para os dois grupos Parakanã**, que têm
consulta CLPI e associação representativa separadas. Os números **não se somam**, e é essa a
regra que o modelo inteiro existe para proteger.

As abas `Rascunho`, `TA- Rascunho`, `Área de trabalho`, `Planilha1` e a aba oculta
`Outubro 24 - Março 25` **não** são fonte de verdade: são motor de cálculo e rascunho.

---

## ALERTA DE DADO PESSOAL, antes de qualquer implementação

Cinco abas do Grupo de Cima carregam **nome completo, CPF, banco, agência, conta e contato**
de pessoas físicas, cruzados com aldeia. Aldeia Parakanã identifica **origem étnica**, que é
dado pessoal **sensível** pelo Art. 5º, II da LGPD.

E há um caso pior, porque escapa de qualquer coluna: no Grupo de Baixo, **6 lançamentos trazem
nome de pessoa dentro do texto da descrição**, e pelo menos 4 observações citam quem assinou o
recibo. Uma guarda que só olhe o nome da coluna não pega isso.

Isso **não bloqueia tudo**: valor, data, aldeia, eixo, saldo e referência de documento não são
dado pessoal e podem ser modelados já. Bloqueia a parte nominal, e essa decisão **já está
aberta** desde 12/08/2026 na issue `[lacuna] Comunidade do projeto: agregados, com decisão
pendente sobre o nominal` do BACKLOG-INICIAL. Não abri issue duplicada: a issue 1 abaixo
**estende** aquela.

---

## ISSUE: [descoberta] Identificar quem recebeu o dinheiro: base legal antes de qualquer coluna

labels: question

**Contexto.** Estende a issue `[lacuna] Comunidade do projeto` do BACKLOG-INICIAL, que trata do
censo. Aqui o dado é outro e o uso também: prestação de contas de recurso repassado. O Grupo de
Cima repassa dinheiro **direto a pessoas** e registra nome, CPF e conta em 1.375 linhas. Sem
alguma forma de identificação não se prova que o recurso chegou a quem devia, que é exatamente
o que a VVB pergunta.

**Escopo.** Decidir, com base legal escrita, entre três desenhos. Não é escolha técnica.

1. **Sem identificação nominal.** O portal guarda aldeia, eixo, categoria, data, valor, saldo e
   a referência ao comprovante. Nome e CPF ficam no comprovante original, fora do sistema. É o
   que o resto do portal já faz (ver o gatilho de `20260827090000_questionarios.sql`).
2. **Pseudonimizado.** Cada recebedor vira código estável; a tabela de correspondência vive
   fora do portal. Foi o que se fez com as 194 atas.
3. **Nominal, com salvaguardas.** Exige base legal documentada, RIPD, controle de acesso por
   papel, log de acesso e prazo de retenção.

**Três armadilhas que a decisão precisa cobrir, e que a análise já encontrou.**

- **"Cargo sem nome" não é anonimização.** Existe **um** cacique por aldeia: cargo + aldeia
  aponta uma pessoa determinada.
- **Agregado também reidentifica.** Aldeia + valor + competência + tipo de beneficiário, numa
  aldeia pequena, chega numa pessoa sem nunca citar o nome.
- **O nome está dentro do texto livre.** Ver o alerta acima. Qualquer desenho precisa dizer o
  que fazer com essas 6 descrições e 4 observações na importação: recusar, limpar, ou revisar
  a mão.

**Critérios de aceite.** Documento de decisão assinado, com base legal, finalidade, prazo de
retenção e quem pode ver. Enquanto não existir, nenhuma coluna nominal é criada.

**Dependências.** Bloqueia a parte nominal das issues 3, 4 e 5. **Não** bloqueia a parte de
valor, data, aldeia e eixo.

---

## ISSUE: [base-real] Grupo comunitário e aldeia como cadastro do projeto

labels: enhancement

**Contexto.** A aldeia é hoje a **única** chave que liga as três planilhas, e é texto livre em
todas: 20 aldeias no Grupo de Baixo mais o literal `ASSOCIACAO`, com grafias divergentes entre
abas. `carbon_questionarios.aldeia` também é texto livre. Sem cadastro canônico, nenhum
cruzamento fecha.

**Escopo.** `carbon_grupos_comunitarios` (os dois grupos, com a associação representativa) e
`carbon_aldeias` (aldeia com grupo obrigatório e apelidos conhecidos, para casar grafia).

**Duas correções sobre a proposta original, já verificadas no banco.**

- A coluna gerada com `unaccent(...)` **não compila**: a extensão não está instalada neste
  projeto (`select extname from pg_extension` não retorna `unaccent`). Normalizar em código na
  Edge Function, ou instalar a extensão numa migration própria e assumir a dependência.
- A associação representativa **não** deve virar texto solto: seria a terceira entidade de
  organização do sistema, ao lado de `carbon_fornecedores`. Decidir se reaproveita.

**Critérios de aceite.**
- Toda aldeia pertence a exatamente um grupo.
- Importação casa grafia divergente pelos apelidos e **falha alto** no que não casar, em vez de
  criar aldeia nova em silêncio.
- RLS habilitada e grants explícitos, como em todas as 28 migrations existentes.

**Dependências.** Base das issues 3, 4, 5 e 7.

---

## ISSUE: [base-real] Ciclo de prestação de contas: antecipado, declarado e o que falta comprovar

labels: enhancement

**Contexto.** A pergunta que a operação faz não é "quanto gastamos", é **"o que ainda falta
comprovar"**. Hoje ela é respondida por SUMIFS espalhados por abas ocultas, e um deles tem uma
constante de 106.000 sem origem no arquivo.

**Escopo.** `carbon_ciclos_prestacao` (período que abre, concilia e fecha, pendurado no grupo),
`carbon_antecipacoes` (o que a APSIS repassou) e `carbon_prestacao_lancamentos` (a despesa
declarada, com eixo, aldeia e situação de comprovante). Mais a view de saldo.

**A view precisa da fórmula escrita, e a proposta não a tinha.** Há duas fontes possíveis para
"comprovado" - o campo `Comprovante?` do razão e a conciliação real contra o documento - e a
issue precisa dizer qual manda. Sugestão: a conciliação manda; o campo do razão vira
`declarado_com_comprovante`, para se poder medir a diferença entre os dois.

**Critérios de aceite.**
- Nada no banco permite lançamento de um grupo dentro de ciclo de outro. Hoje o modelo não
  impede, e é o único erro de negócio que ele existe para impedir. Precisa de constraint, não
  de convenção.
- A tela **não** oferece "todos os grupos". Não há total de projeto.
- Saldo de abertura de um ciclo confere com o fechamento do anterior, ou a divergência é
  explicitada na tela.

**Dependências.** Issue 2.

---

## ISSUE: [base-real] Conciliação: comprovante bancário contra prestação declarada

labels: enhancement

**Contexto.** O Grupo de Cima tem ~1.375 comprovantes digitados linha a linha e ~1.384
lançamentos classificados. Casar os dois é hoje trabalho manual em planilha.

**Escopo.** `carbon_comprovantes` e `carbon_prestacao_conciliacao` (N:N, com valor conciliado e
parecer).

**Duas correções.**

- O `unique (comprovante_id, lancamento_id)` **não impede duplicata** quando um dos dois é
  nulo, que é justamente o caso de comprovante sem lançamento. Precisa de índice parcial.
- `instituicao_recebedor` é texto livre alimentado por linha de PIX. O nome da coluna convida
  ao nome da pessoa. Ou vira domínio fechado de instituição, ou entra na guarda de dado pessoal.

**Critérios de aceite.**
- Comprovante sem lançamento e lançamento sem comprovante aparecem, os dois, como pendência.
- Guarda de dado pessoal em **todos** os campos de texto livre da tabela, incluindo `parecer`.
- Baixar comprovante fica registrado. **Não existe tabela de log de acesso no banco hoje** -
  ela é parte desta issue, não pressuposto dela.

**Dependências.** Issues 1 e 3.

---

## ISSUE: [base-real] Importar as três planilhas, só das abas que são fonte de verdade

labels: enhancement

**Contexto.** São 178 + 44 lançamentos no Grupo de Baixo, ~1.375 comprovantes e ~1.384
lançamentos no de Cima, e 473 atividades. Digitação manual está fora de questão.

**Escopo.** Script de importação, no padrão de `scripts/gerar-seed-*.mjs`, lendo **apenas** as
abas listadas na tabela do topo deste arquivo.

**Uma contradição a resolver antes de escrever o script.** Esta issue manda importar as 178
linhas do `Extrato`, e a issue 3 manda pôr guarda de dado pessoal na descrição. **Seis dessas
linhas têm nome de pessoa dentro da descrição**: o importador vai bater na própria guarda. As
saídas são recusar e listar para revisão manual, ou limpar na importação com registro do que
foi limpo. Escolher uma e escrever na issue.

**Critérios de aceite.**
- Reimportação é idempotente. O critério exige uma constraint que hoje não existe em nenhuma
  das três tabelas de movimento: `unique (ciclo_id, origem_aba, origem_linha)`.
- O script **falha alto** quando um total importado não bate com o total que a planilha afirma.
- Relatório do que foi ignorado, por aba, com contagem.

**Dependências.** Issues 2, 3 e 4.

---

## ISSUE: [descoberta] Sete divergências financeiras encontradas nas planilhas

labels: question

**Contexto.** A leitura completa encontrou inconsistências que **não** são de modelagem: são do
dado. Elas precisam de resposta de quem opera antes de virar registro no portal, porque o
portal passaria a afirmar um número que a planilha não sustenta.

1. **Dois rateios divergentes do mesmo total.** A aba oculta do Grupo de Baixo guarda duas
   repartições dos mesmos R$ 478.357,78 por aldeia - uma tabela dinâmica viva e um bloco colado
   - divergentes em **6 aldeias**. Qual vale?
2. **Receita do 1º ciclo: 600.000 ou 700.000?** A parcela de abril/2025 aparece no relatório dos
   **dois** grupos e não existe no razão de nenhum. No Grupo de Baixo a linha existe sem valor.
3. **Saldo de abertura de R$ 52.724,45** no 2º ciclo do Grupo de Baixo, rotulado como informado
   pela comunidade, não bate com nenhum dos dois fechamentos do 1º.
4. **Setembro/2025 do Grupo de Cima:** R$ 206.611,28 em 129 linhas que existem na aba
   consolidada e nunca foram lançados na base transacional, com R$ 8.637,38 de diferença.
5. **Paranovaona virou Paranowana?** R$ 16.464,00 somados a outra aldeia no relatório, e no 2º
   ciclo a aldeia sumiu do razão. Decisão ou engano?
6. **Três valores digitados à mão** na linha de Antecipação (110.980, 109.600, 110.900) ficam
   **fora** do total da coluna, que só soma até abril.
7. **Constante de 106.000 numa fórmula de conferência**, sem origem em nenhuma aba.

**Escopo.** Nenhum código. Levantar cada item com quem operou a planilha e registrar a resposta.

**Critérios de aceite.** Cada um dos sete respondido por escrito, com o número que vale.

**Dependências.** Bloqueia a issue 5 na parte de conferência de totais.

---

## ISSUE: [base-real] Medição de indicador com recorte por grupo

labels: enhancement

**Contexto.** Fecha uma decisão pendente registrada em `docs/indicadores/LEIA-ME.md`: duas
células do Monitoring Plan trazem `Upper: 487 / Lower: 1.031` e ficaram como não medidas,
porque somar inventaria um total que a planilha nunca afirmou. As três planilhas desta leitura
são **por grupo**, o que dá o recorte que faltava.

**Escopo.** `carbon_indicador_medicoes` ganha `grupo_id` anulável. Nulo = medição do projeto
inteiro; preenchido = medição daquele grupo.

**Critérios de aceite.**
- `unique` que impeça duas medições do mesmo indicador, período e grupo. Atenção à armadilha do
  NULL: coluna anulável em unique não impede duplicata sem índice parcial.
- A tela mostra as colunas por grupo lado a lado e **nunca** soma as duas.
- As duas células pendentes passam a ser importáveis.

**Dependências.** Issue 2.

---

## ISSUE: [base-real] Atividades do Monitoring Report: grupo, tipo e evidência

labels: enhancement

**Contexto.** `Atividade Parakanã.xlsx` tem ~473 atividades em três Monitoring Reports, com
colunas de instituição, tipo, evidência e status que `carbon_atividades` não tem.

**Escopo.** ALTER em `carbon_atividades`: `grupo_id`, tipo de atividade de campo, situação da
evidência e a qual MR pertence.

**Uma correção.** O critério original mandava seguir os valores `MR-1`, `MR-2`, `MR-3` de
`carbon_mr_capitulos.relatorio`. **Os valores reais no banco não são esses** - conferir antes
de escrever a constraint.

**Critérios de aceite.**
- `carbon_atividades.nome` e `.descricao` são texto livre **sem guarda nenhuma** hoje, e o
  material do MR traz nome de responsável. A guarda entra junto.
- Filtro por grupo e por MR na tela existente.

**Dependências.** Issue 2.

---

## ISSUE: [lacuna] Eixo temático e linha estratégica como domínio único

labels: enhancement

**Contexto.** Os dois grupos usam vocabulários **diferentes** - 11 eixos contra 4, com
`Salários` só num deles - e a mesma compra mudou de eixo entre ciclos. Sem domínio, nenhum
relatório cruza os dois grupos nem liga despesa à Teoria da Mudança.

**Escopo.** `carbon_eixos` por projeto, com grafias alternativas e ligação com a linha
estratégica da Teoria da Mudança (`Comunidade`, `Cadeia bioeconomia`, `Fortalecimento cultural
e de governança`).

**Decisão embutida:** um dicionário por projeto ou um por grupo? Um por projeto força
padronização e pode falsear o histórico; um por grupo preserva o histórico e impede o
cruzamento.

**Critérios de aceite.** Eixo fora do domínio é recusado na importação, com a lista do que não
casou.

**Dependências.** Issue 2.

---

## ISSUE: [base-real] Ligar `carbon_questionarios.aldeia` ao cadastro de aldeias

labels: enhancement

**Contexto.** Hoje é texto livre digitado em campo, no celular. Com o cadastro da issue 2, vira
referência - e os questionários passam a cruzar com prestação de contas e atividades pela
mesma chave.

**Escopo.** Coluna de referência, mantendo o texto livre como preenchido em campo, para não
perder o que já foi respondido nem travar quem estiver sem sinal.

**Critérios de aceite.**
- Questionário já preenchido não é invalidado.
- O wizard passa a sugerir aldeias do cadastro, sem impedir texto novo.

**Dependências.** Issue 2.

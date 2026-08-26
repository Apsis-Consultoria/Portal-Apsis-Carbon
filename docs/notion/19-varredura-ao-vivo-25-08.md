# Varredura ao vivo do Notion

**Lido em:** 2026-08-25, direto no Notion pelo navegador do dono (acesso `Guest`).

As 18 paginas anteriores desta pasta foram extraidas em 2026-08-11. Esta varredura
fechou as lacunas que faltavam, e o resultado muda uma conclusao importante.

LGPD: os quadros do Notion mostram nomes de colaboradores em colunas de
responsavel. Nenhum foi reproduzido aqui. Onde a informacao importa, esta como
"consta um responsavel".

---

## O menu completo, como esta hoje

```
APSIS CARBON
  Backoffice gerencial   Objetivos, Reunioes, Documentos, CH, Marketing,
                         Fornecedores, Base de dados
  Consultoria            Consultoria, Clientes, Novos Negocios,
                         Novos Negocios JPF, Atividades, Relatorio de Visitas,
                         Editais
  Acesso externo         duas apostilas de Notion (treinamento, sem relacao
                         com o sistema)

PARAKANA
  Acesso interno         Comunidade, Compradores, Documentos Parakana, PDD,
                         Reunioes, Objetivos, Projetos, Atividades,
                         Indicadores, Monitoring Report, VVB Findings,
                         Findings Verra, Be Zero,
                         Monitoring Report 2 (Jul 24 a Dez 25)
  Acesso externo         Projetos Parakana, Green Musk - Investor Relationship,
                         Monitoramento, Treinamento Conta Azul
```

---

## Achado que muda o plano: Indicadores esta VAZIA

A pagina `Indicadores` do Notion existe e e um **stub**: uma tabela com a coluna
`Name` e zero registros.

Isso responde uma duvida que estava em aberto. A tela nova de Indicadores nao tem
precedente no Notion para copiar: **a planilha Monitoring Plan e a unica fonte de
estrutura que existe**. Projetar a partir dela nao e atalho, e o unico caminho.

Tambem explica por que a dona disse na call que precisava passar a planilha: o
Notion nunca recebeu esse conteudo.

---

## Consultoria: o funil que nunca tinha sido lido

A nota de 11/08 marcava esta pagina como prioridade maxima e ela seguia nao
lida. Sao tres blocos recolhidos (toggle), e por isso a extracao anterior via
so os titulos.

### Oportunidades (OPs)

**Vazia.** O primeiro estagio do funil nao tem registro nenhum.

### Propostas (APs) - base "Lista APs", 7 registros

Colunas: `Codigo AP`, `Status`, `Cliente`, `Contato`, `Grupo de Servico`,
`Servico`, `Metodologia`, `Responsavel`, `Envolvidos`, `Criado em`, `AP Ganha`,
`AP Perdida`.

Vocabulario observado nos dados, que a tela precisa usar:

| Campo | Valores vistos |
|---|---|
| Codigo AP | `AP-000XX/25`, `AP-000XX/25 - Watch Dog` |
| Status | `Ganha`, `Elaboracao` |
| Grupo de Servico | `Descarbonizacao`, `Carbono` |
| Cliente | preenchido em parte das linhas |

`Servico`, `Metodologia`, `Contato` e `Envolvidos` estao vazios em todas as
linhas visiveis: a coluna existe e o processo nao a usa, ou nao a usa ainda.

### Consultorias (APs) - 10 registros

Colunas: `Projeto`, `Status`, `Responsavel`, `Prazo`.

| Campo | Valores vistos |
|---|---|
| Projeto | `AP - 00052-24 [Aquapolo]`, `AP 00051 - 24 [J6 - QUEIXADA]`, `AP - 00003-26 [CTA]`, `AP x -25 [IPEL]` |
| Status | `Em andamento`, `Nao iniciada` |
| Prazo | data, preenchida em parte |

A convencao de nome e `AP - <numero>-<ano> [CLIENTE]`, e ela e inconsistente na
pratica: aparece `AP x -25` quando o numero ainda nao existe, e a posicao do
hifen varia. Uma tela que exija formato rigido vai brigar com o habito.

### O que isso significa

E um funil comercial de tres estagios, com codificacao propria: OP para
oportunidade, AP para proposta, e AP de novo para a consultoria contratada. O
mesmo prefixo serve a dois estagios diferentes, o que so nao confunde porque
vivem em bases separadas.

Duas observacoes que valem para o desenho:

1. **O primeiro estagio esta vazio e o ultimo tem 10 registros.** Ou as
   oportunidades nao sao registradas, ou entram direto como proposta. Vale
   perguntar antes de construir uma tela de OP que ninguem vai preencher.
2. **A pagina inteira nao e editada ha um ano** (o Notion mostra "Edited 1y
   ago"). O funil pode estar abandonado, ou ter migrado para outro lugar.

---

## Paginas confirmadas sem conteudo aproveitavel

Somam-se as ja listadas em `06-paginas-vazias-e-stubs.md`:

| Pagina | Estado |
|---|---|
| Indicadores | tabela vazia, so a coluna `Name` |
| Documentos Parakana | so um link para `Governanca Parakana` |
| Editais | so os titulos `IKI Large Grants`, `Fundo Amazonia`, `Prospera Sociobio` |
| Novos Negocios | so o titulo `Biochar` |

---

## Findings: o esquema real, que a extracao anterior nao tinha

As paginas `VVB Findings` e `Findings Verra` ja tinham arquivo nesta pasta, mas a
leitura ao vivo mostrou a ESTRUTURA, que e o que faltava para conferir a migration
`20260814093000_findings.sql`.

`VVB Findings` tem cinco views (`Findings`, `Board`, `Status`, `Revisao`,
`Evidencias`) e as colunas:

| Coluna | Valores observados |
|---|---|
| Status | `Closed`, `Open` |
| Revisao | `Concluido`, `Em andamento` |
| Document | `PD`, `MR` |
| Type of finding | `CAR`, `CL`, `N/A` |
| Item | `ID - 01` |
| Findings | numero sequencial |
| Finding Description | texto da exigencia |
| Action Required | o que a VVB pede |
| Action to be realized | o que a equipe planejou |
| Comments | andamento |

Existe uma view chamada **`2nd Round Findings`**: as rodadas sao reais e nao
suposicao nossa.

`Findings Verra` tem o mesmo desenho com uma coluna a mais, `Review process`, e
status `Revisao`.

**Cuidado de LGPD nesta base.** O conteudo de `Findings Verra` descreve governanca
da comunidade Parakana, processos de FPIC, papel dos caciques, associacoes
representativas e censo das aldeias. Origem etnica e dado pessoal SENSIVEL (Art. 5
da LGPD). A estrutura pode ser copiada a vontade; o conteudo textual e decisao de
tratamento de dado sensivel e nao entra no banco sem decisao explicita.

---

## O que ainda nao foi aberto

| Pagina | Por que pode importar |
|---|---|
| Monitoring Report 2 (Jul 24 a Dez 25) | periodo mais recente que o `Monitoring Report` ja extraido |
| IKI, Fundo Amazonia, Prospera Sociobio | paginas de edital individuais, provavelmente texto corrido |
| Biochar | linha de negocio nova |
| Treinamento Conta Azul | treinamento, provavelmente irrelevante |

Nenhuma delas bloqueia decisao de desenho hoje. `Green Musk` e `Monitoramento`
estavam nesta lista e foram abertas: o resultado esta nas duas secoes seguintes.

---

## Green Musk - Investor Relationship

Nao e uma base de dados: e um **cronograma (Timetable/Gantt)** de 42 atividades de
certificacao, em seis frentes.

| Frente | Atividades |
|---|---|
| Legal Setup | 5 |
| Monitoring Report | 5 (uma delas "Completion Chapter 1-5") |
| PDD Development | 8 |
| PDD Studies | 7 |
| VVB Process | 6 |
| Verra's Listing Process | 11 |

Mais um grupo "No date (21)", ou seja metade das atividades nao tem prazo.

Green Musk e o investidor citado na call, o da prestacao de contas mensal que
motivou juntar Fornecedores e Contratos. O cronograma e o que ele ve.

## Monitoramento (acesso externo)

Pagina curta, para comprador com NDA: "resumo dos principais indicadores e
resultados do projeto para compradores com NDA" e "Minuta de compra venda de
credito". E a visao externa do que a tela de Indicadores mostra por dentro.

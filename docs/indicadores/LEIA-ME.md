# Indicadores: do Monitoring Plan ao banco

**Escrito em:** 2026-08-25.

A tela de Indicadores foi projetada a partir da planilha `Monitoring Plan - EN.xlsx`,
e nao do Notion. Este arquivo registra por que, o que a planilha tem dentro, e as
decisoes que o dado impos.

---

## Por que a planilha e a unica fonte

A base `Indicadores` do Notion foi aberta ao vivo em 25/08/2026, no navegador do
dono. Ela e um **stub**: uma tabela com a coluna `Name` e zero registro
(`docs/notion/19-varredura-ao-vivo-25-08.md`).

Nao existe precedente para copiar. Isso tambem explica por que a dona pediu na call
para passar a planilha: o conteudo nunca chegou ao Notion.

---

## O que a planilha tem

Seis abas. As duas de comunidade tem nomes quase iguais, e a diferenca importa:

| Aba | Papel |
|---|---|
| `Introduction` | texto explicando o documento |
| `ToC` | Teoria da Mudanca: 32 atividades em linhas estrategicas |
| `Climate MP` | 31 indicadores, parametros da VM0048/VMD0055 |
| `` `Community MP` `` (sem espaco no fim) | versao ANTIGA, indicadores empilhados numa celula |
| `` `Community MP ` `` (COM espaco no fim) | versao NOVA: 109 indicadores, um por linha, **com valores medidos** |
| `Biodiversity MP` | 8 linhas que contem 21 indicadores |

A aba com espaco no fim e a fonte. A equipe evoluiu o modelo sozinha: saiu de
"varios indicadores numa celula" para "um por linha", e acrescentou colunas de
periodo. **Nao unifique os nomes das abas** ao mexer no extrator.

Total extraido: **161 indicadores, 197 medicoes**.

---

## A serie muda de granularidade no meio

As colunas de periodo sao `2022 | 2023 | 2024 | 2025 | 1st Quarter 2026 |
2nd Quarter 2026 | 3th Quarter 2026` (o "3th" e da planilha).

Anual ate 2025, trimestral a partir de 2026. E por isso que
`carbon_indicador_medicoes` ganhou a coluna `periodo_tipo`: so a data nao distingue
o ano de 2022 do quarto trimestre de 2022, e o cabecalho da coluna na tela viraria
adivinhacao.

As colunas da tela saem do DADO, nao do codigo. O proximo trimestre aparece sozinho,
sem deploy.

---

## Tres coisas que quase se perderam na extracao

**1. Os codigos do plano de Clima sao objetos de equacao do Excel.** A primeira
extracao (para texto corrido) devolveu `237`, `239`, `246` no lugar de simbolos como
`A_jurisdiction`. Lendo o `.xlsx` direto com openpyxl, os nomes vem como texto. A
licao: nao extraia de um dump intermediario.

**2. A coluna `Description` so existe na aba de Clima.** Ela carrega o SIGNIFICADO
do simbolo (`AJ` = "Area of the jurisdiction"). Sem ela, 31 indicadores ficariam
ilegiveis. O extrator quase a ignorou porque as outras abas nao a tem.

**3. Celulas mescladas agrupam indicadores por atividade.** A atividade do indicador
da linha 8 mora na celula da linha 7. Ler sem resolver merge produz indicador orfao.

---

## Decisoes que o dado impos

### Nao medido nao e zero

A planilha escreve `N/A` quando nao mediu e `0` quando mediu zero. Sao coisas
diferentes: zero e resultado apurado, ausencia e lacuna. No banco isso vira
**ausencia de linha** em `carbon_indicador_medicoes`. Na tela, um traco apagado.

Limpar uma celula na tela APAGA a medicao, em vez de gravar zero. Se gravasse zero,
um indicador que ninguem acompanhou apareceria como desempenho zero, que e uma
afirmacao que ninguem fez.

18 celulas estao nesse estado.

### Unidade `N/A` vira NULL

Guardar a string faria a tela imprimir "12 N/A" e criaria uma categoria falsa em
qualquer agrupamento por unidade. A coluna `tipo` ja diz que e contagem.

Isso exigiu relaxar `carbon_indicadores.unidade` de `not null` para anulavel.

### Estender `carbon_indicadores`, nao criar tabela nova

A tabela ja existia (`20260814100000_metas.sql`) para indicadores ligados a metas
internas. O Plano de Monitoramento e outro proposito, mas a MESMA coisa no mundo:
algo que se mede ao longo do tempo.

Duas tabelas chamadas "indicadores" obrigariam toda tela, todo relatorio e toda
pessoa nova a perguntar qual e qual, e a primeira consulta que esquecesse uma delas
mostraria metade dos indicadores sem avisar.

A coluna `plano` separa os dois usos: preenchida = Plano de Monitoramento, nula =
indicador interno.

### Frequencia e texto livre, nao enum

A planilha usa frases da metodologia: `Annual`, `Every two years`, `Prior to each
verification event`, `Every six years at baseline renewal`. Traduzir cada uma para
uma categoria seria decisao nossa e nao da metodologia, e a auditoria pergunta quem
tomou.

---

## Duas celulas que PRECISAM DE DECISAO

O gerador as reporta e nao as importa:

```
comunidade #92 (Number of Parakana individuals)  em 2023: Upper: 487 / Lower: 1,031
comunidade #93 (Number of Parakana women)        em 2023: Women Upper: 244 / Lower: 728
```

**Nao e um numero, sao dois**, um para cada grupo Parakana (Alto e Baixo), que tem
consultas CLPI e associacoes representativas separadas. Somar inventaria um total
que a planilha nunca afirma.

O que falta e uma decisao de produto: **indicador com recorte por grupo**. Isso vale
para mais do que estas duas celulas, porque o projeto inteiro tem dois grupos.
Enquanto nao houver decisao, os dois periodos ficam como nao medidos.

## Uma leitura que foi assumida

```
comunidade #80 (Total allocated in BRL for community food support)
  2023: R$ 2,119     lido como 2119
  2024: R$ 10,674    lido como 10674
```

A planilha e a versao **EN**, onde a virgula e separador de milhar. A leitura
brasileira daria R$ 2,119 para o total anual de apoio alimentar de uma comunidade,
que nao descreve nada no mundo. **Se a intencao era outra, o numero esta errado por
um fator de mil** e vale conferir com quem preencheu.

---

## Como reprocessar

```bash
python scripts/extrair-monitoring-plan.py "<caminho>/Monitoring Plan - EN.xlsx"
python scripts/gerar-seed-indicadores.py
```

O primeiro escreve `docs/indicadores/monitoring-plan.json`. O segundo escreve
`supabase/seeds/indicadores_monitoring_plan.sql`.

O seed e **idempotente**: o id de cada linha vem do md5 do conteudo, entao rodar de
novo atualiza em vez de duplicar. Mudou a planilha, roda os dois e pronto.

Aplicar (nesta ordem):

```bash
node scripts/sql.mjs --arquivo supabase/migrations/20260825120000_indicadores_monitoring_plan.sql
node scripts/sql.mjs --arquivo supabase/seeds/indicadores_monitoring_plan.sql
```

O seed busca o projeto por `nome ilike '%parakan%' or '%awaet%'` e **falha alto** se
nao achar, em vez de inserir zero linha em silencio e deixar a tela vazia sem
explicacao.

---

## LGPD

Nada aqui tem nome, e-mail ou telefone de pessoa. A planilha traz colunas de
responsavel e elas NAO sao importadas.

O conteudo importado e indicador, unidade, periodicidade e numero medido.

Vale registrar o que ficou de FORA por decisao, e nao por esquecimento: o material
do `Findings Verra` no Notion descreve governanca da comunidade Parakana, processos
de FPIC, papel dos caciques e censo das aldeias. Origem etnica e dado pessoal
sensivel (Art. 5 da LGPD). Carregar isso no banco e decisao de tratamento de dado
sensivel, nao tarefa tecnica, e nao foi feita por conta propria.

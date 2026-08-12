# Fornecedores

**URL:** `app.notion.com/p/Fornecedores-19fee8ba950e81f1b764ea1bc2fe2d96`
**Bloco:** APSIS CARBON / Backoffice gerencial
**Lido em:** 2026-08-11
**Estado:** em uso, e é a página com a demanda mais explícita de todo o levantamento

---

## O que é

Cadastro de fornecedores mais controle financeiro das parcelas a pagar. É o embrião de um
módulo de contratações e contas a pagar.

## Estrutura

### Base `Cadastro de Fornecedores`

Views: `Table`, `Visualização em quadro` (board), `Gallery`.

| Coluna | Tipo aparente |
|---|---|
| `Nome` | texto |
| `CNPJ` | texto |
| `Status contratação` | seleção (`Concluído`, `Em andamento`, vazio) |
| `Dados Bancários` | texto |
| `Contratante` | texto ou relação |

Seis fornecedores cadastrados. Dois com contratação concluída, dois em andamento, dois sem
status.

### Base `cadastro de parcelas`

Views: `Em aberto`, `Calendar`, `Pagas`. Mais duas views citadas: `Abertas`, `Finalizadas`.

| Coluna | Tipo aparente |
|---|---|
| `ID` | número |
| `Fornecedor` | relação com o cadastro de fornecedores |
| `Tipo de Serviço` | seleção |
| `Valor da Parcela` | moeda (BRL) |
| `Centro de Custo` | seleção |
| `Vencimento` | data |
| `Pagamento` | data (preenchida só quando paga) |
| `Descrição` | texto |
| `Status Pgto` | seleção (`Pago`, `Em aberto`) |

Rodapé com `SUM` do valor das parcelas. As parcelas cadastradas são de um mesmo contrato,
mensais, mesmo valor, o que indica geração de parcelas a partir de um contrato e não digitação
uma a uma.

## Demandas escritas na própria página

- "Criar controle de contratações, cadastrar contratos, obrigações financeiras"
- "Colunas: fornecedor, data de contratação, cadastrar parcelas"
- "esse é um exemplo para ser seguido" (referindo-se à base de parcelas)

## Implicações para o sistema

- Falta a entidade **Contrato** entre fornecedor e parcelas. Hoje as parcelas penduram direto no
  fornecedor. A demanda escrita pede exatamente isso: contrato com data de contratação, e
  parcelas geradas a partir dele.
- Geração automática de parcelas: informar valor total ou valor de parcela, quantidade e
  periodicidade, e o sistema cria as parcelas com vencimento calculado.
- Estados de parcela derivam de data, não de campo manual: em aberto, a vencer, vencida, paga.
  O campo `Status Pgto` manual convive mal com o campo `Pagamento`; no sistema, `Pago` deve ser
  consequência de ter data de pagamento.
- Precisa de visão de calendário e de totalização por período e por centro de custo.

## Ponto de atenção obrigatório: `Dados Bancários`

Esse campo exige tratamento específico e **não deve ser replicado como texto livre numa tabela
que qualquer colaborador lista**:

- acesso restrito por papel
- não exibir em listagem, só no detalhe e sob permissão
- se algum fornecedor for pessoa física ou MEI, é dado pessoal sob LGPD

Registrar isso como requisito da issue, não como detalhe de implementação.

## Confidencialidade

Nomes de fornecedores e valores de contrato não foram transcritos e não devem entrar em issue,
comentário ou commit.

# Compradores (Parakanã)

**URL:** `app.notion.com/p/Compradores-19fee8ba950e81c88539c9b0c3c54af6`
**Bloco:** PARAKANÃ / Páginas de acesso interno
**Lido em:** 2026-08-11
**Estado:** apenas iniciada. Um registro, e ele está protegido por NDA.

---

## O que é

Cadastro dos **compradores de crédito de carbono** do projeto. É a ponta comercial: quem compra
o crédito gerado.

Está praticamente vazia, mas é estruturalmente importante porque é o único lugar do workspace
que trata da **venda** do crédito. Todo o resto trata de produzir e certificar.

## Estrutura

| Coluna | Tipo aparente | Observação |
|---|---|---|
| `Nome` | texto | um registro está marcado como `NDA`, ou seja, o nome não pode ser exposto |
| `País` | texto ou seleção | mercado é internacional |
| `Data de compra` | data | |
| `Status comprador` | seleção | valor observado indica recorrência |
| `E-mail` | e-mail | **dado pessoal**, não transcrito |

## O que a estrutura revela

- **Confidencialidade é requisito de dado, não de sistema.** Um comprador está registrado como
  `NDA` no próprio campo de nome. Isso significa que o sistema precisa suportar comprador cujo
  nome não pode ser exibido para todo mundo: visibilidade por papel no nível do registro, não
  só no nível da tela.
- **`Status comprador` com noção de recorrência** sugere distinguir comprador pontual de
  recorrente, o que é relevante para relacionamento e previsão de receita.
- **`País`** aponta mercado internacional, então moeda e fuso importam. E, combinado com o item
  de *corresponding adjustments* do checklist da BeZero
  (ver [12-be-zero](12-be-zero.md)), venda internacional levanta a questão de ajuste
  correspondente sob o Artigo 6 do Acordo de Paris. O cadastro de comprador provavelmente precisa
  registrar se houve ajuste correspondente.

## O que falta e é essencial

O cadastro não tem nada sobre **o que foi vendido**. Faltam:

- volume de crédito (tCO2e) por transação
- preço e moeda
- safra ou vintage do crédito
- número de série ou faixa de serial do registro Verra
- status de retirement (aposentadoria do crédito) ou transferência
- contrato vinculado (ERPA ou equivalente)

Sem isso não há como responder quanto do estoque já foi vendido, nem conciliar com o registro
da Verra. Hoje isso não existe em lugar nenhum do workspace: **não há controle de estoque nem
de emissão de crédito em nenhuma página varrida até agora.** É a maior lacuna funcional
encontrada, e não está escrita como demanda em nenhum lugar.

## Implicações para o sistema

1. **Comprador** como cadastro, com sigilo por registro.
2. **Transação de venda** como entidade separada do comprador: volume, preço, moeda, vintage,
   serial, data, contrato. É o que falta.
3. **Estoque de crédito por projeto e por vintage**, com emitido, vendido, aposentado e buffer.
   O buffer de não permanência aparece no checklist da BeZero, então já é conceito conhecido pela
   equipe.
4. Vínculo com o financeiro: a receita de carbono é uma das entradas do modelo financeiro exigido
   pela BeZero no item 15.

## LGPD

`E-mail` é dado pessoal e não foi transcrito. Um dos registros usa endereço de provedor gratuito,
o que sugere contato pessoal e não corporativo: mais um motivo para acesso restrito.

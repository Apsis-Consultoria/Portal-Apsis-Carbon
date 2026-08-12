# Relatório de Visitas

**URL:** `app.notion.com/p/Relat-rio-de-Visitas-1e0ee8ba950e804bb01fdb024d659b8f`
**Bloco:** APSIS CARBON / Consultoria (também referenciada por `Base de dados - Apsis Carbon`)
**Lido em:** 2026-08-11
**Estado:** em uso

> **ATENÇÃO LGPD.** Esta base contém dados pessoais de terceiros identificados: nomes completos,
> números de celular e e-mails de contatos em empresas externas. **Nenhum registro foi
> transcrito** para este arquivo, e nenhum deve entrar em issue, comentário, commit ou PR.
> Só a estrutura está documentada abaixo.

---

## O que é

Registro de visitas comerciais a organizações, com follow-up. Funciona como camada de
prospecção presencial, alimentando o funil comercial.

## Estrutura

| Coluna | Tipo aparente | Natureza |
|---|---|---|
| `Organização` | texto | empresa visitada |
| `Localidade` | texto | cidade |
| `Data` | data | data da visita |
| `Follow-Up Status` | seleção (`Não iniciada`, `Em andamento`) | acompanhamento |
| `Contato` | texto | **dado pessoal** |
| `Telefone` | texto | **dado pessoal** |
| `E-mail` | texto | **dado pessoal** |
| `Responsável` | pessoa | colaborador da APSIS |

Padrão de uso observado: visitas em lote por cidade e por período, ou seja, uma viagem gera
várias visitas na mesma data e localidade. Duas ondas registradas, em duas capitais.

## Implicações para o sistema

- Precisa do conceito de **viagem ou rodada de visitas** agrupando várias visitas por cidade e
  data. Hoje isso é repetição manual de localidade e data em cada linha.
- `Follow-Up Status` está quase todo em "não iniciada", o que sugere que o follow-up não tem
  dono nem prazo. A tela deveria cobrar: responsável pelo follow-up e data prevista, com
  destaque para o que passou do prazo.
- Visita deve se ligar ao funil de Consultoria (Oportunidades) e ao cadastro de Clientes, senão
  o contato morre na planilha. Hoje essas páginas estão vazias, então o vínculo não existe.

## Requisitos de privacidade para a tela

Estes entram como requisito da issue, não como detalhe posterior:

- Contato, telefone e e-mail são dados pessoais de terceiros. Precisam de base legal (interesse
  legítimo em prospecção B2B) e de finalidade registrada.
- Não exibir contato, telefone e e-mail em listagem aberta; só no detalhe, sob permissão.
- Prever exclusão a pedido do titular e prazo de retenção. Um CRM que só acumula contato é
  passivo de LGPD.
- Não exportar a base inteira com dados de contato para planilha sem controle.

# Atividades Apsis Carbon

**URL:** `app.notion.com/p/Atividades-Apsis-Carbon-19fee8ba950e8120a90ff69c42e1c5d8`
**Bloco:** APSIS CARBON / Consultoria
**Lido em:** 2026-08-11
**Estado:** em uso ativo, é o coração da operação semanal

---

## O que é

Base única de atividades de toda a operação, atravessando as frentes de negócio. É o que
alimenta a reunião semanal (ver [01-reunioes-apsis-carbon](01-reunioes-apsis-carbon.md)).

## Estrutura

Views: `Em andamento`, `Por Status`, `Timeline`, `Concluídas`.

| Coluna | Tipo aparente | Valores observados |
|---|---|---|
| `Status` | seleção | `Em andamento` (e implicitamente concluída / não iniciada) |
| `Nome` | texto | título da atividade |
| `Responsável` | pessoa | dado pessoal, ver abaixo |
| `Duração` | intervalo de datas | data início -> data fim |
| `Prioridade` | seleção | `Baixa`, `Média`, `Alta` |
| `Tipo` | seleção | `Consultoria`, `Novos Negócios`, `JPF`, `Backoffice` |
| `HH planejadas` | número | horas-homem previstas |
| `HH Executada` | número | **sempre vazia nos registros vistos** |

Rodapé com `COUNT` de tarefas, `SUM` das horas e um indicador `IN PROGRESS 100%`.

## O achado mais relevante

`HH Executada` existe como coluna e está **vazia em todos os registros**. Combinada com a
anotação da pauta da weekly, "lembrar de contar as horas (quando tiver a funcionalidade)", a
conclusão é direta: a equipe planeja horas, quer comparar com o realizado, e não tem como
apontar. O Notion não resolve isso e é a lacuna que o sistema deve fechar.

## Implicações para o sistema

- Tela de atividades com as quatro views que já usam: em andamento, agrupado por status,
  timeline e concluídas. A timeline não é enfeite, é como enxergam sobreposição de prazos.
- `Tipo` é a dimensão de negócio (Consultoria, Novos Negócios, JPF, Backoffice). Provavelmente
  vira o vínculo com módulos, não um enum solto.
- **Apontamento de horas** como funcionalidade separada, alimentando `HH Executada`, com
  comparação planejado x realizado. Precisa decidir a granularidade: apontamento por dia por
  atividade é o mínimo útil para fechar horas de consultoria.
- Prioridade é usada para repriorizar backlog na reunião, então precisa ser editável em massa
  ou por arrastar, não só no detalhe de cada item.
- Agregações de contagem e soma de horas por view.

## Observação de LGPD

A coluna `Responsável` associa nome completo de colaborador a horas planejadas e executadas.
Isso é dado pessoal ligado a desempenho: os registros não foram transcritos, e a tela precisa
de controle de quem vê horas de quem.

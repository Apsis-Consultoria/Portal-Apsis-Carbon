# Projetos (Parakanã)

**URL:** `app.notion.com/p/Projetos-19fee8ba950e811c9bb7eb2fc342fbb9`
**Bloco:** PARAKANÃ / Páginas de acesso interno
**Lido em:** 2026-08-11
**Estado:** em uso, pouco conteúdo

---

## O que é

Apesar do nome, **não é uma lista de projetos**. É um repositório de documentos entregáveis do
projeto Parakanã, com arquivo anexado.

Nomear como "Projetos" é enganoso e vale confirmar com o dono: se a intenção era ter cadastro de
projetos, ele não existe em lugar nenhum do Notion.

## Estrutura

Base `Projetos`:

| Coluna | Tipo aparente |
|---|---|
| `Nome` | texto |
| `Arquivos e mídia` | anexo |
| `Descrição` | texto |
| `Data de upload` | data |

Quatro registros, que são os entregáveis principais do projeto:

- PDD
- Relatório de Monitoramento
- Inventário de flora
- um diagnóstico em PDF

## Implicações para o sistema

- Isto é biblioteca de entregáveis por projeto, com versionamento por data de upload. Deve ser
  a mesma entidade de documento usada por `Documentos Parakanã` e pelo controle de evidências do
  `Monitoring Report` (ver [08-monitoring-report](08-monitoring-report.md)), não três coisas
  separadas.
- Os nomes dos registros mapeiam exatamente para as telas de PDD, monitoramento e inventário. O
  documento é a saída dessas telas, não um upload solto.
- Falta **versão**: hoje só há data de upload. Em projeto de carbono, PDD e relatório de
  monitoramento passam por várias rodadas de revisão com a validadora, então versionamento
  explícito é requisito, não conveniência.
- **Falta o cadastro de projeto propriamente dito.** O sistema precisa de uma entidade Projeto
  (proponente, área, metodologia, período de creditação, standard) da qual PDD, monitoramento,
  indicadores e findings pendurem. Hoje tudo é implícito porque só existe um projeto.

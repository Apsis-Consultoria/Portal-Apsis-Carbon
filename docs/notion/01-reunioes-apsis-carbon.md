# Reuniões Apsis Carbon

**URL:** `app.notion.com/p/Reuni-es-Apsis-Carbon-3f4ee8ba950e82eb8d3581a4c5428bb1`
**Bloco:** APSIS CARBON / Backoffice gerencial
**Lido em:** 2026-08-11
**Estado:** em uso ativo

---

## O que é

Cadência de reunião semanal da operação, com a pauta padronizada em template.

## Estrutura

Base `Reuniões`:

| Coluna | Tipo aparente |
|---|---|
| `Nome` | texto (valor sempre "Weekly", com sufixo `(1)`, `(2)` quando há mais de uma no dia) |
| `Data` | data |

Cerca de 50 registros, de 01/09/2025 a 10/08/2026, cadência semanal contínua e sem falhas
relevantes. Há um bloco `BD - To Do` e uma anotação `VALUES 50`.

## Processo descrito no template de pauta

Antes da reunião, os responsáveis por cada frente atualizam o status das atividades **ao longo
da semana, em tempo contínuo**, em três categorias: concluídas, em andamento, não iniciadas.

Na reunião:

1. Uma pessoa assume a redação da ata.
2. Quem responde por **Consultoria** abre suas atividades: atualização das que estão em curso,
   identificação dos pontos de atenção, identificação das barreiras, atualização do backlog com
   redistribuição de prioridades.
3. Quem responde por **Projetos** faz o mesmo ciclo.
4. A ata é lida em voz alta antes de encerrar.

## Demandas escritas na própria página

- "lembrar de contar as horas (quando tiver a funcionalidade)"
- "Criar template de ata no Notion"

A primeira é a mais importante de todo o levantamento: **apontamento de horas é uma
funcionalidade que a equipe sabe que falta**, e as colunas `HH planejadas` / `HH Executada` já
existem na base de Atividades esperando por ela.

## Implicações para o sistema

- Tela de reuniões com cadência recorrente, não cadastro manual repetido.
- Ata como documento estruturado e versionado, não texto livre: precisa de campos para pontos
  de atenção e barreiras, porque são os dois artefatos que a pauta exige nominalmente.
- A ata referencia atividades. Deve haver vínculo entre ata e as atividades discutidas, e não
  cópia do texto.
- O ciclo é: atividade atualizada durante a semana -> reunião consome o estado -> backlog
  repriorizado. A tela de atividades e a de reunião são o mesmo fluxo em dois momentos.

## Observação de LGPD

A pauta menciona pessoas por nome. Ao escrever issues, usar papéis ("quem responde por
Consultoria"), não nomes.

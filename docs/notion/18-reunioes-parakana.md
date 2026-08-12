# Reuniões Parakanã

**URL:** `app.notion.com/p/Reuni-es-Parakan-19fee8ba950e81e09550c388c4e53676`
**Bloco:** PARAKANÃ / Páginas de acesso interno
**Lido em:** 2026-08-11
**Estado:** em uso ativo. Mais de 45 registros visíveis, com `Load more`.

---

## O que é

Cadência de reuniões do projeto Parakanã. É a irmã de
[01-reunioes-apsis-carbon](01-reunioes-apsis-carbon.md), mas do lado do projeto.

## Estrutura

Base com view `Table`:

| Coluna | Tipo |
|---|---|
| `Nome` | texto |
| `Data da Reunião` | data |

Note a divergência de nome: aqui é `Data da Reunião`, no backoffice é só `Data`. Mesmo padrão de
divergência acidental já visto entre as duas bases de atividades
(ver [15-atividades-parakana-e-menores](15-atividades-parakana-e-menores.md)).

Há também dois blocos ao final: `Base de dados - TD - Parakanã` e `BD - TD Parakanã`. `TD`
provavelmente é To Do. No backoffice existe um bloco equivalente, `BD - To Do`. Não foram
abertos.

## Tipos de reunião observados

O campo `Nome` é texto livre, mas os valores revelam uma tipologia real:

| Padrão | Natureza |
|---|---|
| `Reunião Semanal Parakanã` | cadência principal, semanal, de mar/2025 a jul/2026 |
| `Reunião Semanal Parakanã - <parceiro>` | semanal desdobrada por organização parceira, no mesmo dia |
| `Reunião - Modelo de governança` | reunião temática pontual |
| `Reunião de Alinhamento Operacional e de Governança` | reunião temática pontual |
| `Reunião - FAQ Parakanã` | reunião temática pontual |

Dois achados de processo:

1. **A reunião semanal se desdobra por parceiro.** Em uma mesma data existem duas reuniões
   semanais, cada uma com uma organização parceira diferente. Ou seja, a governança do projeto é
   executada em paralelo com cada parceiro, não em plenária única.
2. **Reuniões temáticas convivem com a cadência.** Governança e alinhamento operacional aparecem
   como eventos próprios, e os temas coincidem exatamente com o que os findings da Verra pedem
   para esclarecer (ver [10-findings-verra](10-findings-verra.md)). Essas atas são,
   potencialmente, evidência de auditoria.

## Implicações para o sistema

1. **Tipo de reunião** deve ser campo, não convenção de nome. Os valores já existem no dado:
   cadência semanal, semanal por parceiro, temática.
2. **Organização parceira** como participante da reunião, permitindo filtrar o histórico por
   parceiro. Hoje isso está no texto do título.
3. **Ata como evidência.** Este é o ponto mais valioso: atas de reunião de governança e de
   consulta são exatamente o tipo de documento que a VVB e a Verra pedem
   (registros de reuniões de consulta, atas de CLPI, ver
   [08-monitoring-report](08-monitoring-report.md)). Se a ata nascer estruturada no sistema, ela
   já pode ser vinculada ao item de evidência da auditoria, em vez de ser garimpada depois numa
   pasta.
4. **Uma única entidade de reunião** para backoffice e projeto, com projeto como dimensão
   opcional, evitando a divergência de esquema que já existe hoje.
5. Os blocos `TD` sugerem lista de pendências saindo da reunião. Combinado com a pauta do
   backoffice, que pede identificar pontos de atenção e barreiras, o modelo é: reunião gera ata,
   ata gera pendências, pendências alimentam o backlog de atividades.

## Pendente de varredura

- `Base de dados - TD - Parakanã`
- `BD - TD Parakanã`
- registros além dos 45 primeiros (há `Load more`)

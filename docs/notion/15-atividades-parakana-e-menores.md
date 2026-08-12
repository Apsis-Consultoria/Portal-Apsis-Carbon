# Atividades Parakanã, Indicadores e Documentos Parakanã

**Lido em:** 2026-08-11

Três páginas com pouco conteúdo, agrupadas por economia. Cada uma tem sua seção.

---

## Atividades Parakanã

**URL:** `app.notion.com/p/Atividades-Parakan-19fee8ba950e814aabdbf83fa0f0a150`
**Estado:** em uso, mas abandonada. 2 registros, `IN PROGRESS 0%`, prazos vencidos desde abril.

### Estrutura

Views: `Em andamento`, `Por Status`, `Timeline`, `Concluídas`. As mesmas quatro de
[03-atividades-apsis-carbon](03-atividades-apsis-carbon.md).

| Coluna | Tipo | Diferença em relação à base do backoffice |
|---|---|---|
| `Status` | seleção (`Não iniciada`, ...) | igual |
| `Nome` | texto | igual |
| `Responsável` | pessoa | igual |
| `Prazo` | **data única** | no backoffice é `Duração`, um intervalo |
| `Prioridade` | seleção (`Alta`, `Média`) | igual |
| `Tipo` | seleção (`JPF`) | igual, mas os dois registros usam o mesmo valor |
| — | — | **não tem `HH planejadas` nem `HH Executada`** |

### O que isso revela

São **duas bases de atividade quase idênticas**, uma para o backoffice e uma para o projeto, com
divergência pequena e provavelmente acidental: data única contra intervalo, e ausência das colunas
de hora. Nenhuma das duas está errada; elas simplesmente foram criadas em momentos diferentes.

Requisito claro: **uma base única de atividades**, com o projeto como dimensão, não duas bases
paralelas que divergem de esquema. Se o backoffice controla horas e o projeto não, isso é
configuração por tipo de atividade, não motivo para duplicar a entidade.

O abandono também informa: `0%` de progresso com prazo vencido há meses significa que a base do
projeto não pegou no uso, enquanto a do backoffice está viva. Vale perguntar ao dono por quê antes
de replicar o mesmo desenho.

---

## Indicadores

**URL:** `app.notion.com/p/19fee8ba950e81389304e68e115e23da?v=19fee8ba950e81758015000c50b6d3ac`
**Estado:** **vazia**. Só a coluna `Name` e o botão `Add property`. Zero registros.

A página existe e está linkada no menu do Parakanã, mas nunca foi estruturada.

Isso conversa diretamente com [13-objetivos-parakana](13-objetivos-parakana.md), onde as metas
existem mas estão com os valores em placeholder (`XX`, `xxx`). O par meta e indicador está pela
metade dos dois lados: meta sem número, indicador sem estrutura.

Conclusão para o backlog: **acompanhamento de indicadores é lacuna aberta**, e as duas telas
precisam nascer juntas. Não há estrutura herdada para copiar, então esta é uma das poucas telas
que exige desenho do zero, com o dono.

---

## Documentos Parakanã

**URL:** `app.notion.com/p/Documentos-Parakan-19fee8ba950e81d48bf6d1da788e2043`
**Estado:** um único item, não aberto: `Governança Parakanã`.

É página de índice, não de conteúdo. O item `Governança Parakanã` provavelmente contém o material
que os findings da Verra pedem sobre estrutura de governança e representatividade das associações
(ver [10-findings-verra](10-findings-verra.md)).

**Pendente de varredura:** abrir `Governança Parakanã`.

Observação de modelagem: existem agora três lugares diferentes guardando documento do mesmo
projeto, e isso é sintoma, não desenho:

1. `Projetos` com entregáveis anexados (ver [07-projetos-parakana](07-projetos-parakana.md))
2. `Documentos Parakanã`, aqui
3. o checklist de evidências dentro do `Monitoring Report`
   (ver [08-monitoring-report](08-monitoring-report.md))

No sistema deve ser **uma** entidade de documento por projeto, com tipo e vínculo, consultada de
vários lugares.

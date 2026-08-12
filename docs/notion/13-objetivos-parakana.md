# Objetivos Parakanã

**URL:** `app.notion.com/p/Objetivos-Parakan-19fee8ba950e818bbff2e017672e0031`
**Bloco:** PARAKANÃ / Páginas de acesso interno
**Lido em:** 2026-08-11
**Estado:** em uso, com metas ainda não quantificadas

---

## O que é

Árvore de metas do projeto, organizada por **frente de atuação** e com a **organização parceira
responsável** por cada frente. É o plano de impacto do projeto, que sustenta os capítulos de
Community e de Biodiversity do padrão CCB.

Contraste relevante: `Objetivos Apsis Carbon`, no bloco do backoffice, está **vazia**
(ver [06-paginas-vazias-e-stubs](06-paginas-vazias-e-stubs.md)). O planejamento por objetivos
existe no projeto de cliente, não na gestão da própria operação.

## Estrutura

Não é base de dados: é **lista hierárquica de texto**, em dois níveis, sob o título
`Metas Externas`. Cada bloco nomeia a frente e a organização parceira responsável, seguida das
ações.

Frentes observadas, com o parceiro responsável indicado no próprio título:

| Frente | Parceiro | Natureza das ações |
|---|---|---|
| Ações com recurso de antecipação | dois parceiros | registro de ativos e prestação de contas na contabilidade da SPE |
| Fortalecimento institucional | um parceiro | modelo de governança e sistema de gestão simplificada para as associações dos dois grupos |
| Monitoramento | um parceiro | câmeras trap para fauna, brigadas de incêndio, rondas quinzenais na seca e mensais na chuva, denúncias a órgãos públicos |
| Educação | um parceiro | curso de educação ambiental nas aldeias, curso de gestão e associativismo |
| Sensibilização no entorno | um parceiro | educação ambiental no entorno sobre queimadas e agrotóxico, ações contra caça ilegal, ação com sindicato rural |
| Cadeias da bioeconomia | um parceiro | controle de produção de castanha e de açaí, aumento de venda, certificação do açaí |

## O achado mais importante desta página

As metas quantitativas estão com **placeholder não preenchido**: aparecem literalmente como
`XX` e `xxx` no texto. Exemplos do padrão: instalar `XX` câmeras, aumentar a venda em `XX%`,
vender `XX` toneladas, rondas de `xxx/25` a `xxx/25`.

Ou seja: **as metas foram estruturadas mas nunca quantificadas**, e não há como acompanhar
progresso. Isso é uma demanda real, mesmo que ninguém a tenha escrito como pedido.

## Implicações para o sistema

1. **Meta como entidade, não como linha de texto.** Precisa de: descrição, frente, organização
   responsável, valor alvo, unidade, período, e valor realizado. Sem valor alvo e unidade
   separados do texto, é impossível medir, e é exatamente o estado atual.

2. **Organização parceira é entidade.** As frentes são delegadas a parceiros externos, cada um
   com escopo próprio. Isso não é o mesmo que `Fornecedores` do backoffice
   (ver [02-fornecedores](02-fornecedores.md))? Precisa confirmar com o dono: se for a mesma
   entidade, unifica; se parceiro de execução de projeto é diferente de fornecedor contratado,
   são duas coisas.

3. **Ligação meta -> indicador -> evidência.** As metas de monitoramento (rondas, brigadas,
   câmeras) produzem exatamente as evidências que o `Monitoring Report` precisa anexar, e os
   treinamentos citados aparecem como evidência nos findings da Verra sobre gestão territorial.
   Fechar esse vínculo evita retrabalho de garimpar evidência na hora da auditoria.

4. **Periodicidade nas ações.** Rondas quinzenais na seca e mensais na chuva são atividades
   recorrentes com sazonalidade. Não cabem como tarefa única: precisam de recorrência com
   calendário sazonal.

5. **A base `Indicadores` está vazia** (ver [06-paginas-vazias-e-stubs](06-paginas-vazias-e-stubs.md)),
   embora exista como página. É o outro lado desta moeda: metas sem quantificação, indicadores
   sem estrutura. As duas telas nascem juntas ou nenhuma funciona.

6. **Bioeconomia é cadeia produtiva**, com volume e venda (castanha, açaí) e certificação. É um
   escopo diferente de crédito de carbono e pode virar módulo próprio. Vale confirmar prioridade
   com o dono antes de assumir que entra.

## Confidencialidade

Nomes das organizações parceiras e da SPE não foram transcritos. Estrutura e natureza das ações
sim, porque é o necessário para desenhar a tela.

# PDD (Parakanã)

**URL:** `app.notion.com/p/PDD-19fee8ba950e81a29af5d204af9f3962`
**Bloco:** PARAKANÃ / Páginas de acesso interno
**Lido em:** 2026-08-11
**Estado:** em uso, 100% concluído

---

## O que é

Rastreador dos capítulos do **PDD (Project Design Document)** do projeto Parakanã, no padrão
**Verra VCS + CCB**. Cada linha é um capítulo ou subcapítulo do documento, com status e
responsável.

É a página mais reaproveitável de todo o levantamento: a estrutura de capítulos é padrão da
metodologia, então serve de **template** para qualquer projeto novo.

## Estrutura

Views: `Capítulos do PDD`, `Capítulos em andamento`, `Table`.

| Coluna | Tipo aparente |
|---|---|
| `Capítulo` | texto (numeração hierárquica: `1`, `1.1`, `2.2.1`) |
| `Nome do capítulo` | texto (em inglês, como exige a submissão) |
| `Status` | seleção (`Concluído`, e implicitamente em andamento / não iniciado) |
| `Responsável` | pessoa |
| `Cap` | número (capítulo raiz, usado para agrupar) |

**43 capítulos** transcritos, todos `Concluído`. Rodapé `COMPLETE 100%`.

> Correção de 2026-08-14: a primeira versão deste arquivo dizia "45 linhas". Era erro de
> contagem meu, feito sobre o texto bruto da página. A estrutura enumerada abaixo tem 43 itens
> (5 capítulos raiz, 22 de segundo nível e 16 de terceiro), e é esse o número que a migration
> e o dataset de demonstração usam. Como a contagem de 45 nunca foi verificada linha a linha,
> não é possível descartar que a tabela do Notion tenha 2 registros que eu não transcrevi.
> Ao reabrir a página, conferir o rodapé de contagem do Notion contra estes 43.

## Estrutura completa de capítulos capturada

Serve como seed do template no sistema.

**1. Summary of Project Benefits**
- 1.1 Unique Project Benefits
- 1.2 Standardized Benefit Metrics

**2. Project Details**
- 2.1 Project Goals, Design and Long-Term Viability
- 2.2 Without-project Land Use Scenario and Additionality
  - 2.2.1 Conditions Prior to Project Initiation and Land Use Scenarios without the Project
  - 2.2.2 Most-Likely Scenario Justification
- 2.3 Safeguards and Stakeholder Engagement
- 2.4 Management Capacity
- 2.5 Legal Status and Property Rights
- 2.6 Additional Information Relevant to the Project

**3. Climate**
- 3.1 Application of Methodology
  - 3.1.1 Title and Reference of Methodology
  - 3.1.2 Applicability of Methodology
- 3.2 Quantification of Estimated GHG Emission Reductions and Removals
- 3.3 Monitoring
  - 3.3.1 Monitoring Plan
  - 3.3.2 Data and Parameters Monitored
- 3.4 Optional Criterion: Climate Change Adaptation Benefits

**4. Community**
- 4.1 Without-Project Community Scenario
- 4.2 Net Positive Community Impacts
  - 4.2.1 Expected Community Impacts
  - 4.2.2 Negative Community Impact Mitigation
  - 4.2.3 Net Positive Community Well-Being
- 4.3 Other Stakeholder Impacts
- 4.4 Community Impact Monitoring
  - 4.4.1 Community Monitoring Plan
  - 4.4.2 Monitoring Plan Dissemination
- 4.5 Optional Criterion: Exceptional Community Benefits

**5. Biodiversity**
- 5.1 Without-Project Biodiversity Scenario
- 5.2 Net Positive Biodiversity Impacts
  - 5.2.1 Expected Biodiversity Changes
  - 5.2.2 Mitigation Measures
  - 5.2.3 Net Positive Biodiversity Impacts
- 5.3 Offsite Biodiversity Impacts
- 5.4 Biodiversity Impact Monitoring
  - 5.4.1 Biodiversity Monitoring Plan
  - 5.4.2 Biodiversity Monitoring Plan Dissemination
- 5.5 Optional Criterion: Exceptional Biodiversity Benefits

## Implicações para o sistema

- Tela de PDD por projeto, com árvore de capítulos em até três níveis, status e responsável por
  capítulo, e percentual de conclusão agregado.
- **Template VCS+CCB pré-carregado**: criar projeto novo já nasce com os 43 capítulos. Isso é
  valor imediato e barato de implementar, porque a estrutura está toda capturada acima.
- Os capítulos opcionais (3.4, 4.5, 5.5 marcados como "Optional Criterion") precisam ser
  marcáveis como não aplicáveis, senão nunca fecham 100%.
- Cada capítulo é um texto longo que vira o documento final. Precisa decidir se o sistema
  guarda o conteúdo ou só rastreia status e aponta para o arquivo. O Notion hoje rastreia
  status; o conteúdo mora em outro lugar (ver `Documentos Parakanã`, ainda não varrida).
- O PDD conversa com `Monitoring Report`, `VVB Findings` e `Findings Verra` (ainda não
  varridas): o ciclo é escrever PDD, submeter, receber apontamentos da validadora e responder.
  Esse ciclo é provavelmente o fluxo mais valioso do sistema todo.

## Armadilha técnica encontrada

Sair desta página no navegador disparou o diálogo *"Leave site?"* do Notion, alertando
alterações não salvas, embora só tenha havido navegação e leitura. **Não usar `force: true`**
para navegar: abre risco de descartar estado pendente. Abrir aba nova.

Vale o dono conferir se a página está íntegra.

## Confidencialidade

Parakanã é projeto real de cliente. Nomes de responsáveis e conteúdo dos capítulos não foram
transcritos.

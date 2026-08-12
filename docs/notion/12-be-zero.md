# Be Zero (Parakanã)

**URL:** `app.notion.com/p/33eee8ba950e809d93dde486914af860?v=33eee8ba950e8190a53d000cd2b27106`
**Bloco:** PARAKANÃ / Páginas de acesso interno
**Lido em:** 2026-08-11
**Estado:** em uso ativo. 28 itens visíveis, `COUNT` de 31.

---

## O que é

Checklist de **due diligence da BeZero Carbon**, que é uma agência de *rating* de crédito de
carbono. Não é auditoria de conformidade: é avaliação de risco que atribui nota ao crédito e
influencia diretamente o preço de venda.

Isso significa que o projeto responde a **três processos externos distintos**, e o sistema precisa
tratar os três como o mesmo tipo de entidade com origem diferente:

| Processo | Quem | Natureza | Volume |
|---|---|---|---|
| VVB | auditoria credenciada | conformidade, CAR e CL | 95 findings |
| Verra | o programa/registro | registro e salvaguardas | 6 findings |
| **BeZero** | agência de rating | risco e precificação | 31 itens |

Ver [09-vvb-findings](09-vvb-findings.md) e [10-findings-verra](10-findings-verra.md).

## Estrutura

| Coluna | Tipo | Valores observados |
|---|---|---|
| `Nº` | número | ordem do item no template da BeZero |
| `Information Required` | texto | tema do pedido |
| `Explanation` | texto longo | o que a BeZero exige, em inglês, detalhado |
| `Status` | seleção | `Concluído`, `Em andamento`, `Revisão`, `Não se aplica` |
| `Evidence` | seleção | `OK`, `Pendente`, `Em andamento`, `N/A` |
| `Comments` | texto longo | encaminhamentos internos e evidências |
| `Responsável` | texto (iniciais) | `MV`, `AC`, `FG`, `D` |

Note que `Responsável` usa **iniciais**, não pessoa vinculada, diferente das outras bases. Sinal
de campo de texto livre onde deveria haver relação com colaborador.

## Os 28 temas exigidos pela BeZero

Este é o template público da metodologia da BeZero, então serve de **seed de checklist** no
sistema. Os enunciados abaixo estão resumidos.

| Nº | Tema | Resumo do que é exigido |
|---|---|---|
| 1 | PD | Detalhes do projeto, objetivos, localização, atividade, status e ID em registro, IDs anteriores |
| 2 | PP | Entidades e pessoas-chave envolvidas, com histórico, papéis, experiência e status de onboarding |
| 3 | Project timelines | Cronograma completo: início, implementação, estabilização, operação, emissão de crédito, compromisso, e riscos de prazo |
| 4 | Project location/boundary | Limites do projeto em vetor geoespacial (Shapefile, KML, GeoPackage, GeoJSON), consistentes com a documentação, com erro de área menor que 5% |
| 5 | Activity precedence | Quão comum ou inédita é a atividade, com exemplos de projetos similares na mesma escala |
| 6 | Previous projects | Desafios de projetos similares anteriores e como as lições foram incorporadas |
| 7 | Counterfactual scenario | O que aconteceria sem o projeto, com evidência |
| 8 | Feasibility & Setup | Estudo de viabilidade técnico-econômica, orçamento, plano de implementação, contratos |
| 9 | Harvest / Forest management plan | Cronograma de manejo, quando aplicável |
| 10 | Regulation | Panorama regulatório, licenças exigidas e status de cada uma |
| 11 | Government stance | Posição e histórico de apoio do governo |
| 12 | Letter of Authorisation / Corresponding adjustments | Ajustes correspondentes e cartas de autorização, Artigo 6 do Acordo de Paris |
| 13 | Ownership & land rights | Titularidade da terra e dos equipamentos, e base dos direitos adquiridos |
| 14 | Outstanding legal issues | Pendências legais ou regulatórias do proponente e impacto potencial |
| 15 | Financial analysis | Modelo financeiro completo: receita de carbono e não-carbono, capex, opex, fluxo de caixa, TIR e payback, com e sem carbono |
| 16 | Funding | Fontes de recurso, status de captação, riscos de disponibilidade e histórico do proponente |
| 17 | Insurance | Tipo e valor da cobertura de seguro pretendida |
| 18 | Financial track record | Solidez financeira do proponente e histórico de sustentar projetos em dificuldade |
| 19 | Stakeholder landscape | Stakeholders locais, quem pode ser afetado ou se opor, e plano de relacionamento |
| 20 | Resettlement and/or FPIC | Se a área é habitada, planos de manejo ou realocação, e status do FPIC |
| 21 | Community engagement & Benefit sharing | Relatórios de engajamento e mecanismos de repartição de benefícios, com exemplo de acordo |
| 22 | Counterparties | Contrapartes e contratados essenciais, status de onboarding e plano de contingência |
| 23 | Additionality | Como a adicionalidade é estabelecida, testes usados, ou critério de adicionalidade automática |
| 24 | Carbon accounting template | Template ex ante da BeZero para todo o ciclo: emissões do projeto, vazamento, buffer de risco, linha de base |
| 25 | Carbon accounting detail | Cálculo de estoque de carbono: biomassa, desenho de parcelas, equações alométricas, fatores de degradação, amostragem |
| 26 | Leakage assessment | Avaliação de vazamento, modelos, premissas e dados históricos de uso da terra |
| 27 | Non-permanence assessment and mitigation | Risco de não permanência (fogo, seca, risco antrópico), mitigação e justificativa do buffer |
| 28 | Baseline models | Modelos de linha de base, áreas protegidas na região de referência, índice de efetividade |

## Implicações para o sistema

1. **Mesma entidade dos findings, com origem `BeZero`.** As colunas são equivalentes: pedido,
   status, evidência, responsável, comentários. Confirma a modelagem de "requisição externa"
   genérica em vez de uma base por auditor.

2. **`Não se aplica` é estado de primeira classe.** Três itens estão marcados assim. Sem isso o
   checklist nunca fecha 100%, o mesmo problema dos critérios opcionais do PDD
   (ver [05-pdd-parakana](05-pdd-parakana.md)).

3. **Dois eixos de progresso independentes**, e isso é importante: `Status` (a resposta está
   redigida) e `Evidence` (a evidência está anexada e aceita). Um item pode estar `Concluído` com
   evidência `Pendente`. A tela precisa mostrar os dois, não um só.

4. **Template de checklist por avaliador.** Os 28 temas acima são padrão da BeZero e estão
   capturados: projeto novo submetido a rating nasce com o checklist pronto.

5. **Aparece exigência financeira pesada** (itens 15 a 18: modelo financeiro, TIR, payback,
   captação, balanço). Isso conecta o módulo de projeto ao financeiro, e é a primeira evidência
   no levantamento de que o sistema precisa de dados econômicos do projeto, não só técnicos.

6. **Exigência geoespacial explícita e verificável** (item 4): vetor em formato aberto, com
   consistência de área dentro de 5% em relação à documentação. Isso é validação automatizável e
   um dos findings do VVB é justamente sobre buffer geoespacial mal gerado. Vale considerar
   validação de geometria no sistema.

7. **Responsável por iniciais** deve virar relação com colaborador.

## LGPD e confidencialidade

Os comentários citam pessoas por nome e por menção, e trazem pendências financeiras internas
(balanço de SPE, captação, apresentação de projetos de investidor). **Nada disso foi transcrito.**
Os enunciados acima são o template público da BeZero, não conteúdo do cliente.

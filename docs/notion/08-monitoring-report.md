# Monitoring Report (Parakanã)

**URL:** `app.notion.com/p/Monitoring-Report-19fee8ba950e8112a629d5e442399de0`
**Bloco:** PARAKANÃ / Páginas de acesso interno
**Lido em:** 2026-08-11
**Estado:** em uso intenso. **59 backlinks.** É a página mais rica de todo o levantamento.

---

## Por que esta é a página mais importante

Ela contém duas coisas que, juntas, são o fluxo que dá razão de existir ao sistema:

1. a redação do relatório de monitoramento por capítulo, com ciclos de revisão;
2. o **controle de evidências para a auditoria da VVB**, que é o gargalo real de um projeto de
   carbono.

Se o sistema entregar só uma tela do Parakanã, é esta.

---

## Base 1: capítulos do Monitoring Report

Views: `Table`, `List`, `Status`.

| Coluna | Tipo aparente |
|---|---|
| `Chapter` | texto (agrupador: `1 - Summary`, `2 - Project Details`, `3 - Climate`, `4 - Communty`) |
| `Subchapter` | texto (numeração hierárquica: `4.1.1`, `5.1.8`) |
| `Nome do capítulo` | texto (inglês) |
| `Status` | seleção: `Em andamento`, **`Revisão 2`**, `Concluído` |
| `Responsável` | pessoa |
| `Comments` | texto longo |

O status `Revisão 2` é o achado de processo: o documento passa por **rodadas numeradas de
revisão**, e a maioria dos subcapítulos está na segunda. Isso não é um workflow linear
"rascunho -> pronto", é um ciclo com número de volta.

Note o typo `4 - Communty` no dado, sinal de campo de texto livre onde deveria haver seleção.

### Estrutura de capítulos capturada

Diferente da estrutura do PDD (ver [05-pdd-parakana](05-pdd-parakana.md)): o monitoramento tem
subcapítulos próprios, focados em comprovar impacto realizado.

**1 Summary**, **2 Project Details**, **3 Climate**

**4 Community**
- 4.1.1 Community Impacts
- 4.1.2 Negative Community Impact Mitigation
- 4.1.3 Net Positive Community Well-Being
- 4.1.4 Protection of High Conservation Values
- 4.2.1 Mitigation of Negative Impacts on Other Stakeholders
- 4.2.2 Net Impacts on Other Stakeholders
- 4.3.1 Community Monitoring Plan
- 4.3.2 Monitoring Plan Dissemination
- 4.4.1 Short-term and Long-term Community Benefits
- 4.4.2 Marginalized and/or Vulnerable Community Groups
- 4.4.3 Net Impacts on Women
- 4.4.4 Benefit Sharing Mechanisms
- 4.4.5 Governance and Implementation Structures
- 4.4.6 Smallholders/Community Members Capacity Development

**5 Biodiversity**
- 5.1.1 Biodiversity Changes
- 5.1.2 Mitigation Actions
- 5.1.3 Net Positive Biodiversity Impacts
- 5.1.4 High Conservation Values Protected
- 5.1.5 Species Used
- 5.1.6 Invasive Species
- 5.1.7 GMO Exclusion
- 5.1.8 Inputs Justification
- 5.2.1 Negative Offsite Biodiversity Impacts and Mitigation Actions
- 5.2.2 Net Offsite Biodiversity Benefits
- 5.3.1 Biodiversity Monitoring Plan
- 5.3.2 Biodiversity Monitoring Plan Dissemination
- 5.4.1 Trigger Species Population Trends

Há ainda um bloco `Cap 5 (Com orientações)` com uma tabela de comentários por capítulo, usada
para orientar quem escreve (ex.: "The data collected in the field is currently under revision and
analysis", "This chapter is being revised"). Alguns registros estão com texto de rascunho
("aaa", "eee"), ou seja, a tabela está em uso ativo e inacabada.

---

## Base 2: Auditing Documents (controle de evidências da VVB)

É um **checklist de evidências exigidas pela validadora/verificadora**, organizado por seção do
padrão VCS/CCB. Esta é a tela de maior valor prático.

Views: `Documents`.

| Coluna | Tipo aparente |
|---|---|
| `VCS CCB Sections` | seleção (a seção do padrão que exige a evidência) |
| `List of Documents` | texto longo (o que precisa ser entregue) |
| `Status` | seleção: `Anexado Pasta`, `N/A`, `Jurídico`, `Revisão` |
| `Responsible` | pessoa |
| `Comments` | texto longo (quais evidências satisfazem o item) |

### Seções e evidências exigidas

| Seção | Evidência exigida |
|---|---|
| (geral) | Word version of the CCB VCS PD |
| (geral) | NPR Calculation excel sheet (acesso ao VERRA project hub) |
| CCB unique benefits | Evidência dos benefícios estimados (matriz de extrapolação dos benefícios CCB) |
| Project Area | KML file da área do projeto e da zona CCB |
| Project Area | Mapas LULC / cobertura florestal / imagens de satélite em formato verificável |
| Project Area | PA GeoPDF |
| Ownership | Acordo assinado entre proponente e proprietários; MoU com outras entidades |
| Ownership | Acordos/MoU entre proponente e outras entidades |
| Project start date | Evidência da data de início (uma ou várias) |
| Project crediting period | Planilha de cálculo de redução/remoção de GEE (ERR sheet) |
| Project crediting period | Planilha de cálculo de suporte |
| Implementation schedule | Evidência dos marcos de desenvolvimento e implementação previstos no PD |
| Implementation schedule | Licenças ambientais exigidas para o estabelecimento do projeto |
| Double Counting and Participation under Other GHG Programs | Declaração de que o projeto não está registrado/rejeitado/recebendo crédito em outro programa |
| Double claiming | Declaração de que não recebe crédito de outro sistema ambiental |
| Sustainable Development Contributions | Evidência dos benefícios estimados (matriz de contribuições de SD) |
| Stakeholder identification and consultation | Documentos de FPIC (consentimento livre, prévio e informado) |
| Stakeholder identification and consultation | Registros de reuniões de consulta (atas, fotos) |
| Stakeholder identification and consultation | Outra documentação de condução do FPIC |
| Management Capacity | Evidência da estrutura de governança (CV do time, modelo de governança) |
| SOP | SOP de medições de biomassa |
| SOP | Plano de garantia e controle de qualidade (QA/QC) |
| Monitoring plan | Community Monitoring Plan |
| Monitoring plan | Biodiversity Monitoring Plan |
| Monitoring plan | Adaptive Management Plan (importante para NPR) |
| Others | Coordenadas de amostragem (centroides das parcelas do inventário) |

Os tipos de evidência citados nos comentários: planilhas (ToC, ERR, AGB, estoque de carbono),
dashboard de PowerBI, arquivos geoespaciais (QGis, GeoPDF, KML), contratos e aditivos com
associações, documentos Verra (Communication Agreement, Deed of Accession, Listing
Representation), atas de CLPI, fotos, apresentações, relatórios de sensoriamento remoto e de
estoque de carbono, CVs.

---

## Implicações para o sistema

Esta página sozinha define várias telas:

1. **Relatório de monitoramento por capítulo**, com status que inclui **número da rodada de
   revisão**, responsável e campo de orientação para quem escreve. O status precisa suportar
   `Revisão N`, não só um booleano de pronto.

2. **Checklist de evidências da auditoria**, indexado por seção do padrão VCS/CCB. Cada item:
   o que a validadora pede, quem responde, status, e o vínculo com os arquivos que satisfazem.
   Hoje o status `Anexado Pasta` significa "está numa pasta em algum lugar" - o sistema deve
   substituir isso por vínculo real com o documento.

3. **Template de checklist por standard.** As seções e evidências acima são padrão VCS+CCB, não
   específicas do Parakanã. Igual ao PDD: projeto novo nasce com o checklist pronto.

4. **Status `Jurídico`** aparece como estado, ou seja, alguns itens ficam pendentes de outra área.
   Isso é encaminhamento entre áreas, não status de documento. Vale modelar como responsável
   ou fila, não como estado.

5. **Rastreabilidade de evidência**: um documento satisfaz um ou mais itens do checklist, e um
   item pode exigir vários documentos. É relação muitos-para-muitos, não campo de anexo.

6. Os artefatos são pesados e heterogêneos (geoespacial, planilha, PDF, foto). Definir se o
   sistema armazena (Supabase Storage) ou referencia repositório externo. O padrão atual é pasta
   compartilhada, o que é justamente o problema que o sistema resolve.

---

## Observações de LGPD e confidencialidade

Nomes de responsáveis aparecem nas duas bases e **não foram transcritos**. Um comentário cita
uma pessoa por nome para verificação de aportes: registrado aqui apenas como papel.

O conteúdo é material de auditoria de projeto real de cliente, com contratos, acordos com
associações comunitárias e documentos de CLPI. Nada disso deve sair do escopo do trabalho
contratado, e não entra em issue.

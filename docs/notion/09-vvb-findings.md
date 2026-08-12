# VVB Findings (Parakanã)

**URL:** `app.notion.com/p/1caee8ba950e8024b2c2f7a8f93f06b3?v=1caee8ba950e80f1bdaa000c1bd351d3`
**Bloco:** PARAKANÃ / Páginas de acesso interno
**Lido em:** 2026-08-11
**Estado:** em uso intenso. **95 registros.**

> **Confidencialidade.** O conteúdo dos findings trata de auditoria de projeto real com
> comunidade indígena: territórios, acordos com associações, repartição de benefícios, processos
> de CLPI. **O texto dos findings não foi transcrito.** Este arquivo documenta apenas a
> estrutura, o vocabulário e o fluxo, que é o que se precisa para desenhar a tela.

---

## O que é

Controle das **não conformidades e pedidos de esclarecimento levantados pela VVB** (Validation
and Verification Body, a auditoria independente credenciada) sobre os documentos do projeto,
e das ações tomadas para fechar cada um.

Junto com o [08-monitoring-report](08-monitoring-report.md), é o fluxo que justifica o sistema:
é aqui que o projeto trava ou avança para emissão de crédito.

## Estrutura

Views: `Findings`, `Board`, `Status`, `Revisão`, `Evidências`, `Type of Findings`.

Seis views para 95 registros indica que a equipe corta esses dados por vários eixos ao mesmo
tempo. Todas precisam existir na tela.

| Coluna | Tipo | Valores observados |
|---|---|---|
| `2nd Round Findings` | seleção | `Closed`, `Open`, `New Finding` |
| `Status` | seleção | `Concluído`, `Em andamento` |
| `Evidence` | seleção | `N/A`, `OK`, `Pendente`, `Revisão` |
| `Document` | seleção | `PD` (Project Design), `MR` (Monitoring Report) |
| `Type of finding` | seleção | **`CAR`**, **`CL`** |
| `Item` | texto | identificador sequencial por documento (`ID - 01`, `ID - 02`, `ID - 06 PK`) |
| `Findings` | texto | seção do documento a que se refere (ex.: "Section 2.1.16", "Entire MR") |
| `Finding Description` | texto longo | o apontamento, redigido pela VVB, em inglês |
| `Action Required` | texto longo | o que a VVB exige, em inglês |
| `Action to be realized` | texto longo | o plano de resposta da equipe, em português |
| `Comments` | texto longo | registro do que foi feito e evidências |

Rodapé com `COUNT` de 95.

## Vocabulário do domínio (importante para a modelagem)

- **CAR** = Corrective Action Request. Não conformidade: precisa de correção obrigatória.
- **CL** = Clarification Request. Pedido de esclarecimento: precisa de resposta, não
  necessariamente de mudança.
- **PD** = Project Design (o PDD). **MR** = Monitoring Report.
- **PP** = Project Proponent, como a VVB se refere à APSIS nos textos.
- **Rounds**: os findings vêm em rodadas. A coluna se chama literalmente `2nd Round Findings`,
  e existe `New Finding` para os que nasceram na rodada atual. O nome da coluna carregar o número
  da rodada é um sintoma: no Notion, cada rodada nova exigiria nova coluna.

## Fluxo real observado

1. A VVB emite um finding sobre uma seção específica de um documento (PD ou MR), classificado
   como CAR ou CL, com identificador por documento.
2. A VVB descreve o problema (`Finding Description`) e o que exige (`Action Required`).
3. A equipe registra o plano de resposta (`Action to be realized`), em português, muitas vezes
   quebrado em itens numerados e com encaminhamento para outra área ou pessoa.
4. A equipe executa e registra evidências em `Comments`.
5. O finding avança em `Status` e o campo `Evidence` indica se a evidência já está aceitável.
6. Na rodada seguinte a VVB reavalia e o finding vira `Closed` ou continua `Open`, podendo
   ganhar um segundo texto de apontamento dentro do mesmo registro ("2nd: ...").

## Padrão de uso que revela requisito

Vários registros usam o campo `Comments` como **checklist manual item por item**: um finding
pediu revisão de nomes científicos em itálico e a resposta lista dezenas de linhas no formato
`2.3.12 - Sem italico OK`. Outro pediu tradução de figuras e tabelas e a resposta lista
`Figure 1 - Inglês OK`, `Table 22 - Corrigido`, e assim por diante, dezenas de linhas.

Isso é uma sublista de verificação socada num campo de texto porque a ferramenta não oferece
o recurso. **Requisito claro: um finding precisa de subitens verificáveis**, cada um com seu
próprio estado, e o progresso do finding deve ser derivado deles.

## Implicações para o sistema

1. **Tela de findings por projeto e por documento**, com as seis visões que já usam: lista,
   board por status, por rodada de revisão, por estado de evidência e por tipo (CAR/CL).

2. **Rodada como entidade, não como coluna.** Um finding pertence a uma rodada de auditoria e
   pode reabrir na seguinte, acumulando histórico de apontamentos e respostas. Modelar rodada
   como dado resolve o problema estrutural do Notion.

3. **Subitens verificáveis** dentro do finding, com progresso agregado. É a lacuna mais
   evidente da ferramenta atual.

4. **Vínculo com a seção do documento.** `Findings` guarda "Section 2.1.16" como texto livre.
   Deve apontar para o capítulo real do PDD ou do MR (ver
   [05-pdd-parakana](05-pdd-parakana.md) e [08-monitoring-report](08-monitoring-report.md)),
   fechando o ciclo: capítulo escrito -> auditado -> apontamento -> correção no capítulo.

5. **Vínculo com evidência.** `Evidence` é hoje um estado solto. Deve referenciar os documentos
   do controle de evidências do Monitoring Report.

6. **Bilinguismo é requisito, não detalhe.** Apontamento e exigência chegam em inglês, resposta
   interna é em português, e o documento final vai para a Verra em inglês. Um finding tem campos
   nos dois idiomas por natureza. Vários findings existem justamente porque havia conteúdo em
   português onde a norma exige inglês, então o sistema deveria ajudar a controlar isso.

7. **Encaminhamento entre áreas.** As respostas mencionam repasse para o jurídico, para
   equipes externas de geoprocessamento e para parceiros. Precisa de responsável e de estado de
   espera por terceiro, senão o finding fica parado sem dono aparente.

## LGPD

Nomes de colaboradores e de terceiros aparecem nas respostas e **não foram transcritos**. A tela
precisa de controle de acesso: findings de auditoria com material de comunidade indígena não são
conteúdo para todo colaborador autenticado.

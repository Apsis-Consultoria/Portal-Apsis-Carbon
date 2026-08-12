# Novos Negócios JPF

**URL:** `app.notion.com/p/Novos-Neg-cios-JPF-19fee8ba950e815abf9eca811bf9bf19`
**Bloco:** APSIS CARBON / Consultoria
**Lido em:** 2026-08-11
**Estado:** em uso. Base pequena, mas a página traz a especificação mais detalhada de tela em
todo o levantamento.

---

## O que é

Prospecção de **novos projetos de carbono** (não de serviços de consultoria): áreas candidatas a
se tornarem projeto. `JPF` aparece também como valor do campo `Tipo` na base de atividades do
backoffice, então é uma frente de trabalho nomeada, provavelmente por iniciais de parceiro ou
sócio. Vale confirmar com o dono.

## Estrutura

Base `Novos Negócios`:

| Coluna | Tipo aparente |
|---|---|
| `Nome` | texto (a área candidata) |
| `Tipo` | seleção, vazia nos registros |
| `Metodologia` | seleção, vazia nos registros |

Três registros, todos áreas territoriais reais: duas Terras Indígenas e uma Floresta Nacional.
As colunas `Tipo` e `Metodologia` estão **vazias**, apesar de serem os dois atributos que
definem viabilidade de um projeto de carbono.

## A especificação escrita na página

Isto é o achado. A página traz, em texto livre, o que o panorama de novos negócios deve mostrar.
Transcrevo a estrutura porque é requisito, não dado de cliente:

- É viável pela análise ultra preliminar?
- Quais as premissas dessa viabilidade, as falhas e as virtudes
- Se sim, mandar proposta para viabilidade
- Listar em que etapa está cada um
- Mostrar um pouco de cada área: localização, tamanho, quem é o parceiro
- Mostrar matriz de critérios
- Um slide para TI, um para REDD privado, um para agro
- Mapa de parceiros
- Ver na MSCI dados de mercado
- VCUs para o CORSIA

## Leitura desses requisitos

1. **Duas etapas de análise**, com nomes próprios: "análise ultra preliminar" (triagem rápida) e
   "proposta para viabilidade" (estudo pago). Isso é um funil de dois estágios com critério de
   passagem, e conecta com `Atividades`, onde existem tarefas de EVTE (estudo de viabilidade
   técnico-econômica) para áreas específicas.

2. **Matriz de critérios** é pedida explicitamente. Ou seja: a triagem deve ser por critérios
   comparáveis, com nota ou classificação, não por avaliação livre. Isso é uma tela de scoring.

3. **Três segmentos de negócio** aparecem nomeados: `TI` (Terra Indígena), `REDD privado` e
   `agro`. Isso deve ser o campo `Tipo`, hoje vazio. Cada segmento tem lógica de viabilidade e
   parceiros diferentes.

4. **Atributos de área**: localização, tamanho e parceiro. Tamanho e localização puxam
   georreferenciamento, que já aparece como exigência dura no checklist da BeZero
   (ver [12-be-zero](12-be-zero.md)) e em findings do VVB. O mesmo dado geoespacial serve
   prospecção e auditoria.

5. **Mapa de parceiros** indica que parceiro é entidade com relacionamento, não campo de texto.
   Conversa com as organizações parceiras de `Objetivos Parakanã`
   (ver [13-objetivos-parakana](13-objetivos-parakana.md)) e possivelmente com `Fornecedores`.

6. **Dados de mercado (MSCI)** e **VCUs para o CORSIA** são referências externas de precificação e
   de elegibilidade. VCU é a unidade de crédito da Verra; CORSIA é o esquema de compensação da
   aviação internacional, e elegibilidade CORSIA muda o preço do crédito. Ou seja: a decisão de
   prospectar depende de preço de mercado e de elegibilidade do crédito futuro. Isso liga
   prospecção a comercialização (ver [14-compradores](14-compradores.md)).

7. **"Um slide para..."** revela o formato de saída real: hoje o produto dessa análise é uma
   apresentação. Vale perguntar ao dono se a tela deve gerar esse material ou apenas alimentá-lo.

## Implicações para o sistema

- Tela de **pipeline de projetos candidatos**, com segmento, metodologia, área, localização,
  parceiro e etapa (triagem, viabilidade, proposta).
- **Matriz de critérios** com pontuação por candidato, comparável entre áreas.
- Campos `Tipo` e `Metodologia` como seleções de verdade, alimentadas por uma lista de
  metodologias (VCS, CCB e as demais aplicáveis).
- Vínculo do candidato aprovado com o cadastro de projeto, que ainda não existe
  (ver [07-projetos-parakana](07-projetos-parakana.md)).
- Referências de mercado e elegibilidade como atributos do candidato, para sustentar a decisão.

## Confidencialidade

Os nomes das áreas candidatas são territórios reais e representam pipeline comercial não
público. Não foram transcritos.

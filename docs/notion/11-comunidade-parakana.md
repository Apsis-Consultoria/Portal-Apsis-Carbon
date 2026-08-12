# Comunidade (Parakanã)

**URL:** `app.notion.com/p/Comunidade-19fee8ba950e8116a4f5e54b8dad7df7`
**Bloco:** PARAKANÃ / Páginas de acesso interno
**Lido em:** 2026-08-11
**Estado:** em uso

---

## PARE E LEIA ANTES DE USAR ESTA PÁGINA

Esta é a página de **maior sensibilidade de todo o workspace**. Contém censo nominal de membros
de comunidade indígena.

**Nenhum dado foi transcrito para este arquivo.** Só a estrutura está registrada, e mesmo isso
com o alerta abaixo.

Por que é o caso mais grave, na LGPD:

- **Origem étnica é dado pessoal sensível** por definição expressa (Art. 5º, II). Todo registro
  aqui é, por construção, um dado sensível.
- **Há dados de crianças e adolescentes.** Os anexos separam faixas de 0 a 11 anos. Dado de
  criança exige proteção específica e consentimento de um dos pais ou responsável legal
  (Art. 14), e o tratamento deve ser sempre no melhor interesse da criança.
- Há **data de nascimento** individual, o que aumenta a identificabilidade.
- O vínculo nome + aldeia + grupo permite localizar a pessoa fisicamente.

Consequência prática, e esta é uma recomendação, não uma decisão minha:

> **Não replicar este censo no Apsis Carbon sem decisão formal e documentada.** Antes de virar
> tela, isso pede avaliação de impacto (relatório de impacto à proteção de dados), definição de
> base legal, e conversa com o jurídico e com as associações representativas. O caminho
> tecnicamente mais seguro é o sistema guardar apenas **dados agregados** (contagem por aldeia,
> por grupo e por faixa etária), que é o que a metodologia CCB exige para demonstrar impacto, e
> deixar o nominal fora do sistema.

Se ainda assim o nominal precisar existir no sistema, os requisitos mínimos são acesso restrito
por papel e por projeto, criptografia em repouso, trilha de auditoria de todo acesso, e nenhuma
exportação sem registro.

---

## O que é

Descrição na própria página: cadastro de todos os membros da comunidade Parakanã, por aldeia e
por grupo. Serve de base para os capítulos de Community do padrão CCB e para demonstrar impacto
social.

## Estrutura

### Anexos

Quatro PDFs de censo, segmentados por sexo e faixa etária: adultos de 11 a 110 anos (masculino e
feminino) e crianças de 0 a 11 anos (masculino e feminino). Arquivos pequenos, 46 a 64 KB.

### Base `Indígenas`

| Coluna | Tipo | Natureza |
|---|---|---|
| `Nome` | texto | **dado pessoal sensível** |
| `Aldeia` | relação com a base de Aldeias | localização |
| `Grupo` | seleção | dois grupos, referidos como "de Cima" e "de Baixo" |
| `Data Nascimento` | data | **dado pessoal** |
| `Idade` | número (provavelmente calculado) | derivado |

### Base `Aldeias`

| Coluna | Tipo | Natureza |
|---|---|---|
| `Nome` | texto | nome da aldeia |
| `Grupo` | seleção | de Cima / de Baixo |
| `Cacique` | pessoa ou texto | **dado pessoal de liderança** |
| `Vice-cacique` | pessoa ou texto | **dado pessoal de liderança** |

## Como isso se conecta ao resto

- A divisão em dois grupos, cada um com sua associação representativa, é a mesma que aparece nos
  findings da Verra sobre representatividade e nos acordos de repartição de benefícios
  (ver [10-findings-verra](10-findings-verra.md)).
- A estrutura de caciques e vice-caciques por aldeia é exatamente o que um dos findings da Verra
  pede para esclarecer, sobre o papel das lideranças na tomada de decisão.
- O censo alimenta os capítulos de Community do CCB, inclusive os subcapítulos de grupos
  vulneráveis e de impacto sobre mulheres (ver [08-monitoring-report](08-monitoring-report.md)),
  o que explica a segmentação por sexo e faixa etária dos anexos.
- No `Monitoring Report` há um item de evidência que menciona cobrar dados de população a um
  parceiro, ou seja, o censo é atualizado por terceiro.

## Implicações para o sistema, se a decisão for prosseguir

1. **Camada agregada como padrão.** A tela default deve mostrar contagens por aldeia, grupo,
   sexo e faixa etária. É o que a metodologia exige e o que a operação consulta no dia a dia.
2. **Aldeias como cadastro separado**, com grupo e lideranças. Esse cadastro é pouco sensível
   comparado ao nominal e é o que se liga a georreferenciamento e a atividades de campo.
3. **Censo nominal, se existir, como módulo isolado**, com permissão própria, e nunca listado
   junto de outras telas.
4. **Versionamento do censo por data de levantamento.** População muda, e o número de aldeias
   mudou ao longo do projeto: um finding do VVB questiona exatamente o aumento de 28 para 31
   aldeias. O sistema precisa responder "qual era a população na data X".
5. **Origem do dado registrada**, porque parte vem de parceiro externo.

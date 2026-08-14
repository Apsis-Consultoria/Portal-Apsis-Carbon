# Levantamento do Notion - Apsis Carbon

**Data:** 2026-08-11
**Objetivo:** mapear, tela por tela, o que hoje é gerenciado no Notion, para virar issues de
implementação no sistema Apsis Carbon.
**Estado:** PARCIAL. 15 de ~31 páginas visitadas. A varredura foi interrompida por limite de
tokens da conta, não por bloqueio técnico. A lista do que falta está na seção
[O que falta varrer](#o-que-falta-varrer), com as URLs prontas.

> Este arquivo é o **índice e o handoff**: método de acesso, armadilhas, regras de privacidade,
> inventário de páginas, o que falta varrer e os bloqueios.

> **O detalhe de cada página fica em um arquivo próprio**, em `docs/notion/`, gravado assim que
> a página é lida. Se a sessão for interrompida, o que já foi lido está salvo:
>
> | Arquivo | Página | Conteúdo |
> |---|---|---|
> | [01-reunioes-apsis-carbon.md](notion/01-reunioes-apsis-carbon.md) | Reuniões Apsis Carbon | rico |
> | [02-fornecedores.md](notion/02-fornecedores.md) | Fornecedores | rico |
> | [03-atividades-apsis-carbon.md](notion/03-atividades-apsis-carbon.md) | Atividades Apsis Carbon | rico |
> | [04-relatorio-de-visitas.md](notion/04-relatorio-de-visitas.md) | Relatório de Visitas | rico, dado pessoal |
> | [05-pdd-parakana.md](notion/05-pdd-parakana.md) | PDD (Parakanã) | rico |
> | [06-paginas-vazias-e-stubs.md](notion/06-paginas-vazias-e-stubs.md) | vazias e stubs do backoffice | negativo |
> | [07-projetos-parakana.md](notion/07-projetos-parakana.md) | Projetos (Parakanã) | pouco |
> | [08-monitoring-report.md](notion/08-monitoring-report.md) | Monitoring Report | **o mais rico** |
> | [09-vvb-findings.md](notion/09-vvb-findings.md) | VVB Findings | rico, 95 registros |
> | [10-findings-verra.md](notion/10-findings-verra.md) | Findings Verra | rico |
> | [11-comunidade-parakana.md](notion/11-comunidade-parakana.md) | Comunidade | **dado sensível** |
> | [12-be-zero.md](notion/12-be-zero.md) | Be Zero | rico, 31 itens |
> | [13-objetivos-parakana.md](notion/13-objetivos-parakana.md) | Objetivos Parakanã | rico |
> | [14-compradores.md](notion/14-compradores.md) | Compradores | pouco, lacuna grande |
> | [15-atividades-parakana-e-menores.md](notion/15-atividades-parakana-e-menores.md) | Atividades Parakanã, Indicadores, Documentos Parakanã | pouco |
> | [16-consultoria.md](notion/16-consultoria.md) | Consultoria | **vazia** |
> | [17-novos-negocios-jpf.md](notion/17-novos-negocios-jpf.md) | Novos Negócios JPF | rico |
> | [18-reunioes-parakana.md](notion/18-reunioes-parakana.md) | Reuniões Parakanã | rico |
>
> Continuar a numeração a partir de `19`. Os arquivos por página são a fonte canônica; a
> seção 4 deste índice é resumo parcial e desatualizado a partir do item 4.9.

## Balanço da varredura (2026-08-11)

**27 de ~31 páginas visitadas.** Das visitadas:

| Situação | Quantidade | Quais |
|---|---|---|
| Conteúdo rico, viram tela | 12 | Reuniões (x2), Fornecedores, Atividades (x2), Relatório de Visitas, PDD, Monitoring Report, VVB Findings, Findings Verra, Be Zero, Objetivos Parakanã, Novos Negócios JPF |
| Pouco conteúdo, mas estrutura útil | 3 | Projetos, Compradores, Documentos Parakanã |
| Vazias ou stub | 7 | Objetivos Apsis Carbon, Documentos Apsis Carbon, Marketing, Clientes, CH, Indicadores, **Consultoria** |
| Índice sem conteúdo próprio | 2 | Base de dados - Apsis Carbon, menu raiz |

Ainda **não varridas** (todas de baixo valor esperado): `Monitoring Report 2`,
`Documentos Parakanã > Governança Parakanã`, `Editais` (3 subpáginas), `Novos Negócios > Biochar`,
os blocos `TD` das duas páginas de reunião, e as páginas de acesso externo (2 apostilas de Notion,
`Projetos Parakanã`, `Green Musk - Investor Relationship`, `Monitoramento`,
`Treinamento Conta Azul`).

### O que a varredura mudou de entendimento

1. **O valor está no Parakanã, não no backoffice.** O bloco APSIS CARBON tem metade das páginas
   vazias. O bloco PARAKANÃ é onde a operação real acontece.
2. **O projeto responde a três processos externos distintos**, não um: VVB (conformidade, 95
   findings), Verra (registro, 6) e BeZero (rating de crédito, 31 itens). As views são idênticas
   nas três bases, então é a mesma entidade com origem diferente.
3. **`Consultoria` está vazia**, contrariando a expectativa: era a prioridade máxima e são três
   toggles criados há um ano, sem nada dentro. O funil comercial não existe em nenhum sistema.
4. **Não existe cadastro de projeto** em lugar nenhum, nem controle de estoque e emissão de
   crédito. São as duas maiores lacunas funcionais, e nenhuma está escrita como demanda.
5. **Apontamento de horas** é a demanda escrita mais clara.
6. Há **duplicação acidental de esquema** entre backoffice e projeto (atividades e reuniões), e
   **três representações diferentes de documento** e de evidência.

---

## 1. Como acessar o Notion (o que funcionou)

O conteúdo **não** é acessível por `WebFetch` nem pelo navegador interno do Claude Code: a
página é uma SPA atrás de login e o navegador interno não tem sessão. Retorna a parede
*"Faça login para ver esta página em Apsis Carbon"*.

O que funcionou foi a **extensão Claude in Chrome**, no perfil de Chrome chamado `Claude`,
que é onde a conta com acesso ao workspace está logada.

Pré-requisitos:

1. Extensão Claude in Chrome instalada: https://chromewebstore.google.com/detail/fcoeoabgfenejglbffodgkkbkcdhcgfn
2. Painel lateral do Claude aberto no Chrome, logado na mesma conta do app.
3. Chrome no perfil `Claude` (os outros perfis da máquina não têm a sessão do Notion).

Verificar com `mcp__claude-in-chrome__list_connected_browsers`: deve retornar um item. Se
retornar `[]`, a extensão não está conectada e nada mais funciona.

### Método de leitura eficiente

Um `navigate`, uma espera de 2s e um `get_page_text`, tudo em lote com `browser_batch`:

```
browser_batch([
  { navigate:      { tabId, url } },
  { computer:      { tabId, action: "wait", duration: 2 } },
  { get_page_text: { tabId } },
  ... repetir por página, 4 ou 5 páginas por lote
])
```

A espera é obrigatória. Sem ela o `get_page_text` às vezes captura a página antes de o Notion
renderizar, e uma página com conteúdo parece vazia. Dá falso negativo.

Para pegar as URLs das subpáginas de uma página, use `read_page` com `filter: "interactive"`:
os links vêm como `href="/p/Nome-<id>"`.

### Armadilhas encontradas

- **Diálogo "Leave site?"**: sair da página `PDD` foi bloqueado por um alerta de alterações
  não salvas do Notion. Só houve navegação e leitura, nenhum clique ou digitação, então o
  estado pendente provavelmente é sincronização normal do editor. **Não use `force: true`**:
  isso descarta o estado pendente do Notion. Abra uma aba nova (`tabs_create_mcp`) e continue
  nela. Vale conferir com o dono se a página PDD está íntegra.
- **Acesso é `Guest`**: no sidebar o workspace aparece como "Apsis Carbon `Guest`" e só
  "Menu Apsis Carbon" aparece em *Shared*. Pode haver conteúdo invisível para essa conta.
  Se alguma página abrir vazia, considerar permissão antes de concluir que está vazia.
- **Página vazia de verdade** se apresenta com o placeholder do Notion
  `Get started with / Database / Form / Templates`. Isso é o estado de página em branco,
  não é erro de carregamento.

### Alternativa sem browser

Exportar do Notion: "Menu Apsis Carbon" -> `...` -> Exportar -> **Markdown & CSV** ->
Incluir conteúdo **Tudo** -> marcar **Incluir subpáginas** e **Criar pastas para subpáginas**.
Traz tudo de uma vez, inclusive as bases como CSV, e dispensa navegação. É o caminho mais
barato em tokens se a varredura for retomada do zero.

---

## 2. Regras obrigatórias para este material

Estas restrições não são preferência de estilo, valem para qualquer sessão que continuar:

**Dados pessoais (LGPD).** O Notion contém dados pessoais de terceiros identificados. Eles
foram **deliberadamente não transcritos** para este arquivo. O que existe está registrado
apenas como *estrutura* (nome da coluna), nunca como conteúdo:

- `Relatório de Visitas`: colunas `Contato`, `Telefone`, `E-mail` com nomes completos,
  celulares e e-mails de contatos em empresas externas (bancos, indústria, associações).
- `Atividades Apsis Carbon`: coluna `Responsável` com nomes completos de colaboradores,
  associados a horas planejadas e executadas.
- `Reuniões Apsis Carbon`: a pauta da weekly menciona pessoas por nome.
- `Fornecedores`: coluna `Dados Bancários`.

Ao escrever issues, descrever papéis ("responsável pela consultoria", "quem redige a ata"),
nunca pessoas. Não colar linhas de banco em issue, comentário, commit ou PR.

**Confidencialidade de cliente.** Parakanã é projeto real de cliente, com comunidade,
compradores, PDD e findings de auditoria. Material de projeto de carbono e valores de
contrato de fornecedor não entram em texto que circule fora do escopo do trabalho.

**Visibilidade do repositório.** `Apsis-Consultoria/Apsis-Carbon` é **privado**: a API do
GitHub sem autenticação devolve 404 para um repositório que existe (o push funcionou com
credencial), que é como o GitHub trata repos privados. Reduz o risco, mas não dispensa a
minimização acima.

**Campo `Dados Bancários`.** Quando essa tela for implementada, o campo exige tratamento
específico: acesso restrito por papel, e não expor em listagem. Não replicar como texto livre
numa tabela lida por qualquer colaborador.

---

## 3. Inventário de páginas

Raiz: `https://app.notion.com/p/Menu-Apsis-Carbon-19fee8ba950e81c0ac26c7538de16b8a`

A raiz é um menu com dois blocos, `APSIS CARBON` e `PARAKANÃ`, cada um subdividido em
páginas de acesso interno e externo.

### APSIS CARBON - Backoffice gerencial

| Página | URL (sufixo de `app.notion.com`) | Estado |
|---|---|---|
| Objetivos Apsis Carbon | `/p/Objetivos-Apsis-Carbon-19fee8ba950e81d79c15df5ac2b41ed8` | **vazia** |
| Reuniões Apsis Carbon | `/p/Reuni-es-Apsis-Carbon-3f4ee8ba950e82eb8d3581a4c5428bb1` | conteúdo |
| Documentos Apsis Carbon | `/p/Documentos-Apsis-Carbon-19fee8ba950e8142a871ebede4f44406` | **vazia** |
| CH | `/p/CH-19fee8ba950e81808469d935f7013cdf` | esqueleto |
| Marketing Apsis Carbon | `/p/Marketing-Apsis-Carbon-19fee8ba950e81efa8f0def10fce7502` | **vazia** |
| Fornecedores | `/p/Fornecedores-19fee8ba950e81f1b764ea1bc2fe2d96` | conteúdo rico |
| Base de dados - Apsis Carbon | `/p/Base-de-dados-Apsis-Carbon-19fee8ba950e81f88ba7ea4067047a4b` | só um link |

### APSIS CARBON - Consultoria

| Página | URL | Estado |
|---|---|---|
| Consultoria | `/p/Consultoria-19fee8ba950e8150b9ffce435eca497a` | 3 seções, **não abertas** |
| Clientes | `/p/Clientes-19fee8ba950e81b68086c4a9b7060a7d` | **vazia** |
| Novos Negócios | `/p/Novos-Neg-cios-19fee8ba950e813a89bcdb3c2820af52` | 1 item, não aberto |
| Novos Negócios JPF | `/p/Novos-Neg-cios-JPF-19fee8ba950e815abf9eca811bf9bf19` | **não visitada** |
| Atividades Apsis Carbon | `/p/Atividades-Apsis-Carbon-19fee8ba950e8120a90ff69c42e1c5d8` | conteúdo |
| Relatório de Visitas | `/p/Relat-rio-de-Visitas-1e0ee8ba950e804bb01fdb024d659b8f` | conteúdo (dado pessoal) |
| Editais | `/p/Editais-2e2ee8ba950e8040ab6ecb4b5df3cbb1` | 3 itens, não abertos |

### PARAKANÃ - páginas de acesso interno

| Página | URL | Estado |
|---|---|---|
| Comunidade | `/p/Comunidade-19fee8ba950e8116a4f5e54b8dad7df7` | **não visitada** |
| Compradores | `/p/Compradores-19fee8ba950e81c88539c9b0c3c54af6` | **não visitada** |
| Documentos Parakanã | `/p/Documentos-Parakan-19fee8ba950e81d48bf6d1da788e2043` | **não visitada** |
| PDD | `/p/PDD-19fee8ba950e81a29af5d204af9f3962` | conteúdo rico |
| Reuniões Parakanã | `/p/Reuni-es-Parakan-19fee8ba950e81e09550c388c4e53676` | **não visitada** |
| Objetivos Parakanã | `/p/Objetivos-Parakan-19fee8ba950e818bbff2e017672e0031` | **não visitada** |
| Projetos | `/p/Projetos-19fee8ba950e811c9bb7eb2fc342fbb9` | **não visitada** |
| Atividades Parakanã | `/p/Atividades-Parakan-19fee8ba950e814aabdbf83fa0f0a150` | **não visitada** |
| Indicadores | `/p/19fee8ba950e81389304e68e115e23da?v=19fee8ba950e81758015000c50b6d3ac` | **não visitada** |
| Monitoring Report | `/p/Monitoring-Report-19fee8ba950e8112a629d5e442399de0` | **não visitada** |
| VVB Findings | `/p/1caee8ba950e8024b2c2f7a8f93f06b3?v=1caee8ba950e80f1bdaa000c1bd351d3` | **não visitada** |
| Findings Verra | `/p/37cee8ba950e80a5973edeb7fe5046af?v=1c2ee8ba950e83b295c188c05418c879` | **não visitada** |
| Be Zero | `/p/33eee8ba950e809d93dde486914af860?v=33eee8ba950e8190a53d000cd2b27106` | **não visitada** |
| Monitoring Report 2 (Jul 24 a Dez 25) | link não capturado | **não visitada** |

### Páginas de acesso externo (URLs não capturadas)

Aparecem no texto da raiz mas os links não vieram no `read_page` (provavelmente renderização
tardia, rolar a página antes de ler):

- APSIS CARBON: `Apostila: Dominando o Notion Básico`, `Apostila: Dominando o Notion Avançado`
- PARAKANÃ: `Projetos Parakanã`, `Green Musk - Investor Relationship`, `Monitoramento`,
  `Treinamento Conta Azul`

---

## 4. O que foi encontrado, página por página

### 4.1 Reuniões Apsis Carbon

Base `Reuniões` com colunas `Nome` e `Data`. Cerca de 50 registros de reunião semanal
("Weekly"), de 01/09/2025 a 10/08/2026, cadência semanal contínua.

A página traz um **template de pauta da weekly**, que é o processo real:

- Preparação antes da reunião: os responsáveis atualizam o status das atividades ao longo da
  semana, em tempo contínuo, nas categorias *concluídas*, *em andamento*, *não iniciadas*.
- Na reunião: uma pessoa redige a ata; quem responde por Consultoria abre suas atividades;
  quem responde por Projetos abre as dela. Para cada frente: atualização das atividades em
  curso, identificação de pontos de atenção, identificação de barreiras e atualização do
  backlog com redistribuição de prioridades. No fim, a ata é lida.

Há um bloco `BD - To Do` e uma anotação `VALUES 50`.

### 4.2 CH (Capital Humano)

Apenas o esqueleto de uma base `Cadastro Colaborador`, com a coluna `Nome` e nenhum registro.
Estrutura a definir.

### 4.3 Fornecedores

A página mais operacional do backoffice. Duas bases:

**`Cadastro de Fornecedores`** - views `Table`, `Visualização em quadro` (board) e `Gallery`.
Colunas: `Nome`, `CNPJ`, `Status contratação`, `Dados Bancários`, `Contratante`.
Seis fornecedores cadastrados, com `Status contratação` em `Concluído` ou `Em andamento`.

**`cadastro de parcelas`** - views `Em aberto`, `Calendar` e `Pagas`.
Colunas: `ID`, `Fornecedor`, `Tipo de Serviço`, `Valor da Parcela`, `Centro de Custo`,
`Vencimento`, `Pagamento`, `Descrição`, `Status Pgto` (`Pago` / `Em aberto`).
Tem agregação de soma no rodapé. Views adicionais `Abertas` e `Finalizadas`.

### 4.4 Atividades Apsis Carbon

Base de atividades com views `Em andamento`, `Por Status`, `Timeline` e `Concluídas`.

Colunas: `Status`, `Nome`, `Responsável`, `Duração` (intervalo de datas), `Prioridade`
(`Baixa` / `Média` / `Alta`), `Tipo` (`Consultoria` / `Novos Negócios` / `JPF` / `Backoffice`),
`HH planejadas`, `HH Executada`.

Rodapé com `COUNT` de tarefas e `SUM` das horas. É o mesmo eixo citado na pauta da weekly:
esta base é o que alimenta a reunião.

### 4.5 Relatório de Visitas

Base de visitas comerciais. Colunas: `Organização`, `Localidade`, `Data`,
`Follow-Up Status` (`Não iniciada` / `Em andamento`), `Contato`, `Telefone`, `E-mail`,
`Responsável`. Duas ondas de visitas, uma em Fortaleza e outra em São Paulo.

Conteúdo com dado pessoal de terceiros, ver seção 2.

### 4.6 Consultoria

Três seções, cujo conteúdo **não foi aberto**: `Oportunidades (OPs)`, `Propostas (APs)`,
`Consultorias (APs)`. Pelo nome, é um funil comercial em três estágios com codificação
própria (OP e AP). **Prioridade alta para a próxima sessão**: é provavelmente o núcleo do
módulo de Consultoria.

### 4.7 Editais

Três itens, não abertos: `IKI Large Grants`, `Fundo Amazônia`, `Prospera Sociobio`.
Editais de financiamento climático. Sugere uma tela de acompanhamento de editais com prazos.

### 4.8 Novos Negócios

Um item, não aberto: `Biochar`.

### 4.9 PDD (Parakanã)

Rastreador dos capítulos do PDD (Project Design Document) no padrão Verra VCS + CCB.
Views `Capítulos do PDD`, `Capítulos em andamento` e `Table`.
Colunas: `Capítulo` (numeração hierárquica: 1, 1.1, 2.2.1 ...), `Nome do capítulo`,
`Status`, `Responsável`, `Cap` (agrupador do capítulo raiz).

Estrutura completa capturada, 43 capítulos, todos em `Concluído`, rodapé `COMPLETE 100%`
(corrigido de 45 em 2026-08-14: erro de contagem, ver a nota em `notion/05-pdd-parakana.md`):

1. Summary of Project Benefits (1.1 Unique Project Benefits, 1.2 Standardized Benefit Metrics)
2. Project Details (2.1 Goals/Design/Long-Term Viability, 2.2 Without-project Land Use
   Scenario and Additionality com 2.2.1 e 2.2.2, 2.3 Safeguards and Stakeholder Engagement,
   2.4 Management Capacity, 2.5 Legal Status and Property Rights, 2.6 Additional Information)
3. Climate (3.1 Application of Methodology com 3.1.1 Title/Reference e 3.1.2 Applicability,
   3.2 Quantification of Estimated GHG Emission Reductions and Removals, 3.3 Monitoring com
   3.3.1 Monitoring Plan e 3.3.2 Data and Parameters Monitored, 3.4 Climate Change Adaptation)
4. Community (4.1 Without-Project Community Scenario, 4.2 Net Positive Community Impacts com
   4.2.1/4.2.2/4.2.3, 4.3 Other Stakeholder Impacts, 4.4 Community Impact Monitoring com
   4.4.1/4.4.2, 4.5 Exceptional Community Benefits)
5. Biodiversity (5.1 Without-Project Biodiversity Scenario, 5.2 Net Positive Biodiversity
   Impacts com 5.2.1/5.2.2/5.2.3, 5.3 Offsite Biodiversity Impacts, 5.4 Biodiversity Impact
   Monitoring com 5.4.1/5.4.2, 5.5 Exceptional Biodiversity Benefits)

Esta estrutura é reaproveitável: qualquer projeto novo no padrão VCS+CCB nasce com estes
capítulos. Serve de *template* no sistema.

---

## 5. Demandas escritas explicitamente no Notion

Não são inferências minhas, estão escritas nas páginas:

| Origem | Texto |
|---|---|
| Fornecedores | "Criar controle de contratações, cadastrar contratos, obrigações financeiras" |
| Fornecedores | "Colunas: fornecedor, data de contratação, cadastrar parcelas" |
| Fornecedores | "esse é um exemplo para ser seguido" (sobre a base de parcelas) |
| Reuniões | "lembrar de contar as horas (quando tiver a funcionalidade)" |
| Reuniões | "Criar template de ata no Notion" |

A frase das horas é a mais reveladora: **apontamento de horas é uma funcionalidade que eles
sabem que falta**, e as colunas `HH planejadas` / `HH Executada` já existem na base de
Atividades esperando por ela.

---

## 6. Telas candidatas (rascunho, ainda não são issues)

Derivado apenas do que foi visto. Falta metade da varredura, então isto não é o backlog final.

**Alta confiança, porque há base em uso e demanda escrita:**

1. **Atividades** - lista com views por status, timeline e concluídas; campos de responsável,
   duração, prioridade, tipo e horas planejadas/executadas; agregações de contagem e soma.
2. **Apontamento de horas** - a funcionalidade que falta, alimentando `HH Executada`.
3. **Fornecedores** - cadastro com CNPJ, status de contratação e contratante.
4. **Contratos e parcelas** - parcelas com vencimento, pagamento, centro de custo, tipo de
   serviço, status e totalização; views de em aberto, pagas e calendário.
5. **Reuniões e atas** - cadência semanal, template de pauta, ata, pontos de atenção,
   barreiras e atualização de backlog.
6. **PDD** - rastreador de capítulos hierárquico com status e responsável, com template
   VCS+CCB pronto.
7. **Visitas comerciais** - organização, localidade, data, follow-up e responsável, com o
   cuidado de dado pessoal da seção 2.

**Sinalizadas mas sem estrutura conhecida ainda:**

8. Funil de Consultoria em três estágios (Oportunidades, Propostas, Consultorias)
9. Clientes
10. Editais com prazos
11. Novos Negócios
12. Capital Humano
13. Monitoring Report, Indicadores, VVB Findings, Findings Verra, Be Zero
14. Comunidade e Compradores (Parakanã)

---

## 7. O que falta varrer

Por ordem de valor para o desenho de telas:

1. `Consultoria` -> abrir `Oportunidades (OPs)`, `Propostas (APs)`, `Consultorias (APs)`
2. `Monitoring Report` e `Monitoring Report 2`
3. `Indicadores`
4. `VVB Findings` e `Findings Verra` (fluxo de auditoria e resposta a apontamentos)
5. `Projetos` e `Atividades Parakanã`
6. `Compradores` (comercialização de créditos) e `Comunidade`
7. `Be Zero`
8. `Objetivos Parakanã`, `Reuniões Parakanã`, `Documentos Parakanã`
9. `Novos Negócios JPF`, `Novos Negócios > Biochar`, `Editais` (3 subpáginas)
10. Páginas de acesso externo, inclusive `Green Musk - Investor Relationship`

URLs na seção 3. Recomendação forte: **usar o export do Notion** em vez de navegar, pelo
custo em tokens.

---

## 8. Bloqueio para criar as issues no GitHub

O `gh` CLI **não está instalado** nesta máquina, então não há como criar issues por linha de
comando. O `git push` funciona porque há credencial salva no Git Credential Manager, mas isso
não serve para a API.

Duas saídas:

**Instalar o CLI** e autenticar (o `gh auth login` precisa ser feito pelo dono, em terminal
interativo):

```bash
winget install --id GitHub.cli --source winget
```

**Ou gerar as issues como arquivos** e importar depois: um markdown por issue, com título,
corpo, labels e critérios de aceite.

---

## 9. Observação sobre o estado do Notion

Metade das páginas do bloco APSIS CARBON está vazia: `Objetivos`, `Documentos`, `Marketing`,
`Clientes`, e `CH` só tem o esqueleto. O que está de fato em uso é `Reuniões`, `Fornecedores`,
`Atividades`, `Relatório de Visitas` e, do lado Parakanã, o `PDD`.

Isso muda a leitura do pedido original: o Notion não é um espaço de requisitos já escritos
esperando tradução. É um conjunto de bases operacionais em uso, mais várias páginas
abandonadas ou nunca preenchidas. As telas devem sair **do que está em uso**, e as páginas
vazias precisam de conversa com o dono antes de virarem issue, senão vira especificação
inventada.

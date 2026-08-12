# Páginas vazias e stubs

**Lido em:** 2026-08-11

Registro das páginas que foram abertas e **não têm conteúdo aproveitável**. Importante para não
gastar tokens revisitando, e para não gerar issue a partir de página em branco.

---

## Como reconhecer

Página vazia de verdade no Notion se apresenta com o placeholder
`Get started with / Database / Form / Templates`. Isso é o estado de página em branco com
permissão de edição, **não** é falha de carregamento.

Todas as páginas abaixo foram confirmadas com espera de 3 segundos antes da leitura, justamente
para descartar falso negativo por renderização tardia.

Ressalva: o acesso ao workspace é `Guest`. Não se pode descartar que exista conteúdo invisível
para essa conta. Vale confirmar com o dono antes de concluir que a página nunca foi preenchida.

---

## Vazias

| Página | URL | Bloco |
|---|---|---|
| Objetivos Apsis Carbon | `/p/Objetivos-Apsis-Carbon-19fee8ba950e81d79c15df5ac2b41ed8` | Backoffice |
| Documentos Apsis Carbon | `/p/Documentos-Apsis-Carbon-19fee8ba950e8142a871ebede4f44406` | Backoffice |
| Marketing Apsis Carbon | `/p/Marketing-Apsis-Carbon-19fee8ba950e81efa8f0def10fce7502` | Backoffice |
| Clientes | `/p/Clientes-19fee8ba950e81b68086c4a9b7060a7d` | Consultoria |

`Clientes` estar vazia é significativo: o cadastro de clientes, que seria o centro de um sistema
de consultoria, não existe no Notion. As visitas comerciais registram organizações em campo de
texto solto, sem vínculo com cadastro. É lacuna real, não descuido de documentação.

---

## Stubs (estrutura iniciada, sem conteúdo)

### CH (Capital Humano)

`/p/CH-19fee8ba950e81808469d935f7013cdf`

Só o esqueleto de uma base `Cadastro Colaborador`, com a coluna `Nome` e o botão
`Add property`. Zero registros. Estrutura inteiramente a definir com o dono.

### Base de dados - Apsis Carbon

`/p/Base-de-dados-Apsis-Carbon-19fee8ba950e81f88ba7ea4067047a4b`

Contém apenas um link para `Relatório de Visitas`. É página de índice, não de conteúdo.

---

## Páginas com apenas títulos de subpáginas (conteúdo não aberto)

Estas **não são vazias**: têm subpáginas que não foram visitadas por limite de tokens. Precisam
de varredura.

| Página | URL | Subitens listados |
|---|---|---|
| Consultoria | `/p/Consultoria-19fee8ba950e8150b9ffce435eca497a` | `Oportunidades (OPs)`, `Propostas (APs)`, `Consultorias (APs)` |
| Novos Negócios | `/p/Novos-Neg-cios-19fee8ba950e813a89bcdb3c2820af52` | `Biochar` |
| Editais | `/p/Editais-2e2ee8ba950e8040ab6ecb4b5df3cbb1` | `IKI Large Grants`, `Fundo Amazônia`, `Prospera Sociobio` |

`Consultoria` é a **prioridade máxima** da próxima varredura: pelos nomes, é um funil comercial
em três estágios com codificação própria (OP para oportunidade, AP para proposta e para
consultoria contratada). É provavelmente o núcleo do módulo de Consultoria e nada dele foi
lido ainda.

`Editais` sugere acompanhamento de editais de financiamento climático, com prazos de submissão.
Os três citados são reais e públicos (IKI, Fundo Amazônia, Prospera Sociobio).

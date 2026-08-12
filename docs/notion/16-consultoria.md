# Consultoria

**URL:** `app.notion.com/p/Consultoria-19fee8ba950e8150b9ffce435eca497a`
**Bloco:** APSIS CARBON / Consultoria
**Lido em:** 2026-08-11
**Estado:** **estrutura vazia.** Editada pela última vez há um ano.

---

## Conclusão, que contraria a expectativa inicial

Esta página era a **prioridade máxima** do levantamento: pelos nomes das seções, parecia ser o
funil comercial da consultoria, o núcleo do módulo. Não é. **Está vazia.**

A página contém exatamente três blocos de toggle, nada mais:

- `Oportunidades (OPs)`
- `Propostas (APs)`
- `Consultorias (APs)`

Os três estão fechados. Expandi o primeiro para verificar: **não há nada dentro**. O cabeçalho da
página informa `Edited 1y ago`.

Ou seja: alguém desenhou a intenção do funil em três estágios há um ano e nunca preencheu.

### Como isso foi verificado

Importante registrar, porque é fácil errar aqui e concluir que a página tem conteúdo escondido:

1. `get_page_text` retorna apenas os três títulos. Poderia ser renderização tardia.
2. Rolar a página e esperar 3 segundos não muda nada.
3. Os elementos que o `find` identifica como triângulo de toggle são, na verdade, botões `Open`
   do Notion, e clicar neles não expande.
4. Clicar **diretamente na coordenada do triângulo** expande de fato: o marcador vira `▼` e o
   espaço abaixo fica em branco até o divisor.

Sem o passo 4 a conclusão seria errada.

Ressalva honesta: o acesso ao workspace é `Guest`. Não é possível descartar por completo que
haja conteúdo restrito invisível para essa conta. Mas o toggle expandindo vazio, somado ao
`Edited 1y ago`, aponta para estrutura abandonada, não para restrição de permissão.

---

## O que dá para aproveitar

Só a **taxonomia**, e ela é informativa:

| Estágio | Sigla | Leitura |
|---|---|---|
| Oportunidades | **OP** | contato ou demanda identificada, ainda sem proposta |
| Propostas | **AP** | proposta enviada ao cliente |
| Consultorias | **AP** | proposta aceita, trabalho em execução |

Note que Propostas e Consultorias compartilham a sigla `AP`. Isso sugere que **o mesmo documento
muda de estado** em vez de virar outro registro: uma AP nasce proposta e, se aceita, passa a ser
a consultoria. O funil tem então dois objetos, OP e AP, não três.

Vale confirmar com o dono, porque muda a modelagem: se AP é um objeto com estados, o histórico de
conversão fica natural; se são dois registros, precisa de vínculo.

---

## Por que isso importa para o backlog

Junto com `Clientes` vazia (ver [06-paginas-vazias-e-stubs](06-paginas-vazias-e-stubs.md)), o
quadro é claro: **o lado comercial da consultoria não é gerenciado em nenhum sistema.**

O que existe hoje, disperso:

- `Relatório de Visitas` registra prospecção presencial, com follow-up quase todo não iniciado
  (ver [04-relatorio-de-visitas](04-relatorio-de-visitas.md))
- `Atividades Apsis Carbon` tem tarefas de tipo `Consultoria` e `Novos Negócios`, inclusive
  atividades de preparar proposta e fazer estudo de viabilidade
  (ver [03-atividades-apsis-carbon](03-atividades-apsis-carbon.md))
- `Novos Negócios JPF` tem um panorama de prospecção de projetos
  (ver [17-novos-negocios-jpf](17-novos-negocios-jpf.md))

Ou seja: a operação comercial acontece, deixa rastro em três lugares, e não tem funil. Isso é
demanda real, mas **não é tradução de algo escrito**: é uma lacuna. Precisa de conversa com o
dono para desenhar, e não de engenharia reversa do Notion.

Recomendação para o backlog: tratar o funil comercial como **descoberta**, com uma conversa de
levantamento antes de virar issue de implementação. Escrever issue detalhada a partir de três
toggles vazios seria inventar requisito.

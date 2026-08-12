# Findings Verra (Parakanã)

**URL:** `app.notion.com/p/37cee8ba950e80a5973edeb7fe5046af?v=1c2ee8ba950e83b295c188c05418c879`
**Bloco:** PARAKANÃ / Páginas de acesso interno
**Lido em:** 2026-08-11
**Estado:** em uso. 6 registros, todos abertos.

> **Confidencialidade reforçada.** Os findings aqui tratam de governança de comunidade indígena,
> representatividade de associações, papel de lideranças tradicionais, processos de CLPI e
> repartição de benefícios. **Nada do conteúdo foi transcrito.** Este arquivo registra somente
> estrutura, vocabulário e fluxo.

---

## O que é

Findings emitidos pela **própria Verra**, no processo de revisão do registro, e não pela VVB.
São dois processos distintos e o sistema precisa distinguir:

- **VVB** (ver [09-vvb-findings](09-vvb-findings.md)): auditoria independente credenciada,
  valida e verifica os documentos. 95 findings, técnicos e por seção.
- **Verra**: o próprio programa, na revisão para registro e emissão. 6 findings, mais amplos e
  concentrados em governança, salvaguardas e consentimento.

## Estrutura

Views: `Findings`, `Board`, `Status`, `Revisão`, `Evidências`, `Type of Findings`.
As mesmas seis views do VVB Findings, o que reforça que as duas bases são a mesma entidade com
origem diferente.

| Coluna | Tipo | Valores observados |
|---|---|---|
| `Review process` | número | ordem sequencial do item na revisão (1 a 6) |
| `Findings Description` | texto longo | o pedido da Verra, em inglês |
| `Comments` | texto longo | rascunho da resposta, misturando português e inglês |
| `Documents` | texto longo | lista das evidências que sustentam a resposta |
| `Evidence` | seleção | `OK`, vazio |
| `Type of finding` | seleção | `CL` (todos os seis) |
| `Item` | texto | identificador |
| `Status` | seleção | `Revisão` |

Rodapé com `COUNT` de 6.

## Diferenças relevantes em relação ao VVB Findings

| Aspecto | VVB Findings | Findings Verra |
|---|---|---|
| Origem | auditoria credenciada | programa Verra |
| Volume | 95 | 6 |
| Tipo | `CAR` e `CL` | só `CL` |
| Referência | seção específica do PD ou MR | tema, não seção |
| Coluna de ordem | `Item` por documento | `Review process` sequencial |
| Coluna de evidência | `Evidence` (estado) | `Documents` (lista) + `Evidence` |

O campo `Documents` aqui é **lista de evidências em texto livre**, enquanto no VVB Findings a
evidência é só um estado. Duas soluções diferentes para o mesmo problema, o que é sintoma de
falta de uma entidade de evidência compartilhada.

## Padrão de uso que revela requisito

O campo `Comments` está sendo usado como **área de redação colaborativa da resposta**: contém
rascunho em português, texto final em inglês, decisões pendentes ("decidir se insere ou não"),
instruções para quem escreve ("começar falando com...") e perguntas abertas, tudo no mesmo campo.

Requisito: separar **rascunho de trabalho** da **resposta oficial** que vai para a Verra, e ter
um estado explícito de decisão pendente com dono. Hoje uma decisão de negócio fica escondida
dentro de um campo de texto.

## Implicações para o sistema

1. **Uma entidade de finding, com origem como atributo** (`VVB` ou `Verra`), e não duas bases
   separadas. Os campos são quase os mesmos e as views são idênticas.

2. **Entidade de evidência compartilhada**, referenciada por findings das duas origens e pelo
   checklist de auditoria do Monitoring Report. Hoje há três representações diferentes de
   evidência no Notion.

3. **Separar rascunho e resposta oficial**, com o idioma explícito em cada um.

4. **Estado de decisão pendente com responsável.** Vários itens estão parados esperando decisão,
   não execução, e isso não é visível em nenhuma view.

5. **Findings da Verra são temáticos**, então precisam se ligar a temas ou salvaguardas, não a
   capítulos. A modelagem deve permitir os dois tipos de vínculo.

6. Os temas recorrentes são governança, representatividade, consentimento livre prévio e
   informado, e repartição de benefícios. São exatamente os capítulos de Community do padrão CCB.
   Ou seja: o sistema deveria conectar finding de governança ao capítulo de Community e às
   evidências de CLPI, fechando o triângulo.

## LGPD e sensibilidade

Este material envolve povos indígenas, suas lideranças, associações representativas e acordos de
repartição de benefícios. É informação sensível de cliente e de terceiros.

Requisitos que decorrem disso, para a issue:

- acesso restrito por projeto e por papel, não liberado a todo colaborador autenticado;
- trilha de auditoria de quem acessou e alterou;
- nenhuma exportação aberta sem controle.

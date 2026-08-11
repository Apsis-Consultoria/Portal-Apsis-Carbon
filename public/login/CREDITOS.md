# Creditos das imagens de fundo - tela de login

Todas as cinco fotos estao baixadas nesta pasta e verificadas (assinatura JPEG `ff d8 ff`,
todas acima de 150000 bytes). O slideshow com crossfade da tela de login usa a ordem
`amazonia-1.jpg` a `amazonia-5.jpg`, definida na linha `login` da tabela
`carbon_app_config` do Supabase (chave `imagens`) - para trocar a ordem ou substituir uma
foto, basta um `UPDATE` no banco, sem deploy de frontend.

## Arquivos presentes

| Arquivo | Tema | Banco | Licenca | Pagina de origem | Atribuicao sugerida |
| --- | --- | --- | --- | --- | --- |
| `amazonia-1.jpg` | dossel com bruma | Pexels | Pexels License | https://www.pexels.com/photo/rainforest-surrounded-by-fog-975771/ | Foto de David Riano-Cortes / Pexels |
| `amazonia-2.jpg` | Amazonia ao anoitecer | Pexels | Pexels License | https://www.pexels.com/photo/fog-over-amazon-rainforest-at-dusk-23857952/ | Foto de VANNGO Ng / Pexels |
| `amazonia-3.jpg` | Amazonia em vista aerea | Pexels | Pexels License | https://www.pexels.com/photo/amazon-rainforest-in-birds-eye-view-16562858/ | Foto de Kelly / Pexels |
| `amazonia-4.jpg` | dossel com nuvem | Pexels | Pexels License | https://www.pexels.com/photo/19635626/ | Foto de Lukas Faust / Pexels |
| `amazonia-5.jpg` | rio na floresta | Pexels | Pexels License | https://www.pexels.com/photo/aerial-view-of-muddy-river-through-rainforest-17025853/ | Foto de Nando Freitas / Pexels |

Outros assets desta pasta:

| Arquivo | Origem | Uso |
| --- | --- | --- |
| `logo-apsis-carbon.png` | fornecido pelo Filipe (350x100, RGBA) | logo da tela de login |
| `logo-apsis-transp.png` | copiado de `portal-apsis/public/login/logo-apsis-transp.png` | logo da sidebar do shell |

O arquivo `logo-apsis.png` (favicon) foi copiado para a raiz de `public/`.

### Aviso sobre o `logo-apsis-carbon.png`

O arquivo tem a palavra **APSIS em laranja (#F48126) e CARBON em branco**, ou seja, e uma arte
para **fundo escuro**. Medido no PNG: 4.414 pixels laranja e 2.272 pixels quase brancos.

O painel do login e branco (`rgba(255,255,255,0.90)`), portanto **a palavra CARBON fica
invisivel** nesse fundo: aparece so o "APSIS" laranja com a seta. Isso esta assim de proposito
neste momento, para avaliacao visual pedida em 2026-08-11.

Saidas possiveis, se a decisao for corrigir:

1. variante do PNG com CARBON num tom escuro (por exemplo `#1A2B1F`), mantendo o painel branco;
2. escurecer o painel do login para o verde profundo do Carbon, mantendo a arte intacta;
3. pedir ao marketing a versao oficial do logo para fundo claro.

Observacao: na **sidebar** do shell o fundo e o verde `#1A4731`, onde esta arte funcionaria
sem alteracao nenhuma. Hoje a sidebar usa o `logo-apsis-transp.png` (a piramide) com o texto
"Carbon" abaixo.

O dimensionamento no `CarbonLoginLayout.jsx` e por **largura** (`w-[260px] lg:w-[340px]`), e nao
por altura como no portal, porque esta arte e horizontal (3,5:1) e a do portal e quadrada.
Um `h-[235px]` daria 823px de largura num painel de ~468px.

## Procedencia geografica

Registro importante para uso institucional: `amazonia-2.jpg`, `amazonia-3.jpg` e
`amazonia-5.jpg` sao fotos genuinamente amazonicas ou de bacia amazonica, conforme a
descricao registrada no banco de imagens. `amazonia-1.jpg` e `amazonia-4.jpg` sao floresta
tropical e dossel com bruma, sem procedencia amazonica confirmada.

Consequencia pratica: as cinco servem como imagem de clima para o fundo do login, onde
nao ha legenda nem descricao. Nenhuma delas deve ser legendada, descrita ou reaproveitada
em laudo, proposta ou material institucional como "Amazonia" sem confirmar a procedencia,
sob risco de comprometer a credibilidade tecnica da APSIS.

## Detalhamento das licencas

### Pexels License (todos os cinco arquivos)

Uso gratuito para fins pessoais e comerciais, sem necessidade de compra e sem atribuicao
obrigatoria. Restricoes: e vedado revender copias nao alteradas da foto e e vedado usar
pessoas identificaveis de forma ofensiva. Nenhuma das fotos selecionadas contem pessoas
identificaveis (`amazonia-5.jpg` tem um pequeno barco no rio, sem pessoa reconhecivel).

Usar como fundo da tela de login de um sistema proprietario esta claramente dentro do
permitido, inclusive em contexto comercial.

## Notas de enquadramento

Medicoes de luminancia feitas na pesquisa lendo os pixels do arquivo real em largura 1920
(escala 0 a 255). As zonas medidas sao exatamente as que os overlays da tela de login
afetam: faixa esquerda (0% a 30% da largura), faixa inferior (70% a 100% da altura) e
bloco centro-direita superior (45% a 100% da largura por 0% a 55% da altura).

Referencia: abaixo de 60 na esquerda e na base e ideal para os gradientes; acima de 140 no
centro-direita superior indica bom ponto focal.

| Arquivo | Dimensoes originais | Esquerda | Base | Centro-direita superior | Observacao |
| --- | --- | --- | --- | --- | --- |
| `amazonia-1.jpg` | 1920x1076 (AR 1.78) | 68 | 43 | 182 | Praticamente 16:9 nativo, sem crop. Melhor contraste do lote entre base escura e bruma clara no alto - por isso e a primeira do slideshow. |
| `amazonia-2.jpg` | 1920x1231 (AR 1.56) | 87 | 28 | 115 | Base mais escura do lote. A paleta puxa para cinza-azulado (RGB medio 75,90,103); o overlay verde-quase-preto fecha o tom. |
| `amazonia-3.jpg` | 1920x1079 (AR 1.78) | 129 | 74 | 162 | Sem crop. Base menos escura que o ideal: se incomodar, reforce o gradiente inferior. |
| `amazonia-4.jpg` | 1920x1080 (AR 1.78) | 130 | 40 | 160 | 16:9 exato, zero ajuste. Esquerda um pouco clara, coberta com folga pelo gradiente de 92%. |
| `amazonia-5.jpg` | 1920x1280 (AR 1.50) | 93 | 79 | 138 | Unica que precisa de crop vertical. Enquadrar com o rio no centro-direita superior e dossel escuro na faixa inferior. |

O `object-cover` do CSS ja resolve o crop das fotos que nao sao 16:9 nativas, cortando
pelas bordas. As medicoes acima servem para decidir se vale gerar um crop manual melhor.

## Como repor os arquivos

Se algum arquivo for perdido, executar a partir desta pasta (`public/login`):

```bash
curl -L --fail --max-time 90 -o amazonia-1.jpg "https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=1920"
```

As demais seguem o mesmo padrao, trocando o ID: `23857952` para a 2, `16562858` para a 3,
`19635626` para a 4 e `17025853` para a 5.

Verificacao apos o download:

```bash
for f in amazonia-*.jpg; do printf "%s %s bytes " "$f" "$(stat -c%s "$f")"; head -c 3 "$f" | od -An -tx1; done
```

Cada arquivo deve ter mais de 150000 bytes e comecar com `ff d8 ff`.

## Nota final

As licencas permitem uso comercial sem atribuicao obrigatoria. A atribuicao esta registrada
aqui por boa pratica, para manter a rastreabilidade da procedencia em eventual auditoria de
uso de imagens de terceiros.

Recomenda-se substituir estas fotos por acervo proprio da APSIS assim que houver, o que
elimina a dependencia de licenca de terceiros, resolve a questao da procedencia geografica e
reforca a identidade visual do Apsis Carbon.

Sobre o tema "contratos de emissao": a pesquisa nao encontrou foto adequada nos bancos com
licenca livre comercial. O tema so aparece como documento sobre a mesa, reuniao ou aperto de
mao, sempre com pessoas identificaveis, luz neutra de escritorio e frequentemente texto
legivel na imagem - tres restricoes do briefing violadas ao mesmo tempo. A recomendacao e
tratar mercado de carbono por elemento grafico na interface (tipografia, selo, dado
numerico), nao por fotografia de fundo.

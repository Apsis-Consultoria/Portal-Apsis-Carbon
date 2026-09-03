-- =============================================================================
-- Apsis Carbon - as atas de reuniao, do corpo das paginas do Notion
-- Arquivo: supabase/seeds/atas_reunioes.sql
-- Gerado por: scripts/gerar-seed-atas.mjs (nao edite a mao)
-- Fonte: docs/notion/dados/atas-pseudonimizadas.json, lido ao vivo do Notion em 26/08/2026
-- =============================================================================
-- ONDE ELAS ESTAVAM. Nao na base de dados: no CORPO de cada pagina de reuniao.
-- Por isso todas as leituras anteriores passaram por elas sem ver - a extracao
-- lia as linhas da tabela (data, titulo) e nunca abria a pagina. Sao 194 atas,
-- 101 do Parakana e 93 do backoffice, e carbon_atas tinha 7 linhas vazias.
--
-- LGPD, E ESTA E A PARTE QUE IMPORTA. As atas nomeiam pessoas, e 26 delas
-- nomeiam caciques em contexto de deliberacao interna da comunidade. Isso e dado
-- pessoal SENSIVEL (Art. 5 da LGPD, origem etnica), e o proprio levantamento ja
-- tinha decidido nao replicar o censo nominal pelo mesmo motivo
-- (docs/notion/11-comunidade-parakana.md). Carregar o texto cru desfaria essa
-- decisao pela porta dos fundos.
--
-- A saida foi PSEUDONIMIZAR ANTES DE GRAVAR. Cada nome proprio virou um marcador
-- estavel do tipo [P123], o mesmo marcador para o mesmo nome em todas as atas -
-- entao "esta pessoa aparece na ata de marco e na de agosto" continua
-- respondivel sem que o nome exista no banco. Foram 6029 substituicoes.
--
-- A SUBSTITUICAO E DELIBERADAMENTE EXAGERADA. Detectar nome em texto livre erra
-- nos dois sentidos, e os dois erros nao custam igual: trocar demais deixa o
-- texto um pouco mais seco, trocar de menos vaza um nome. Por isso todo termo
-- capitalizado no meio da frase que nao esta no vocabulario do projeto foi
-- trocado - inclusive alguns que provavelmente nao sao pessoas. A lista completa
-- dos termos, com contexto, ficou em
-- C:\Users\FilipeOliveiraAPSISC\notion-export\revisao-termos-atas.csv, FORA
-- do repositorio, para conferencia. O que for devolvido para o vocabulario faz o
-- seed ser regerado.
--
-- pontos_atencao E barreiras FICAM NULAS. O template de pauta descrito no
-- levantamento pede as duas secoes, mas na pratica so 14 atas falam em ponto de
-- atencao e 2 em barreira. Distribuir o texto em colunas que a origem nao
-- preenche produziria campo com conteudo inventado; o texto inteiro vai para
-- `conteudo`, que e o que existe de fato. Vale como achado: o processo escrito
-- e o processo praticado divergem aqui.
--
-- `aprovada` fica false: o Notion nao registra aprovacao de ata, e marcar como
-- aprovada uma ata que ninguem aprovou a transformaria em evidencia de auditoria
-- falsa - exatamente o oposto do que a tela existe para fazer.
--
-- INSERT-SELECT contra carbon_reunioes: ata de reuniao que nao entrou (as linhas
-- em branco do Notion) simplesmente nao grava. O upsert e por reuniao_id porque
-- 7 atas ja existem, criadas vazias para pendurar as pendencias do BD - TD; elas
-- ganham conteudo aqui e as pendencias continuam presas nelas.
-- =============================================================================


insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:395ee8ba-950e-800b-b073-ebdcb269633a')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Ata da semana:
  - Reunião com grupo de baixo e grupo de cima realizadas
  - Dinheiro na conta no dia 14, possivelmente.
  - Reunião no grupo de cima
    - [P342], após a reunião, conversou com caciques.
      - Alguns caciques não divulgam para comunidade algumas informações oriundas de reuniões mais reservadas.
        - Em atividades em campo, equipes ADL e Apsis podem auxiliar na divulgação de informações para comunidade.
        - [P354] foi único cacique a faltar reunião.
          - [P354] já comentou sobre sair do projeto.
    - Apresentaram entendimento das limitações orçamentárias e acordo sobre o uso dos recursos.
    - Chegaram, por exemplo, a acordo sobre distribuição para indigena que já possuem emprego, que moiram fora da TI, etc.
    - Ata feita, conforme necessidades do projeto. [P778] enviada hoje.
  - [P158] de roça
    - [P349] verificar se pode ser adiantada, para o dia 12 e 13.
    - 6 a 7 dias de atividade.
    - Quinta ou sexta feira: Reunião para alinhamento sobre atividades de roç e inventário socioambiental.
  - Sem necessidade de revisar questionário.
  - [P528] de monitoramento
    - [P30] para ultima semana de julho.
    - Considerando que precisa ter alguém da Apsis junto e não poderá ser junto da atividade de roça.
  - [P126] tentativo: (a ser confirmado por equipes Marabá)
    - Roça: semana dia 13 ou 15 ( a confirmar com zé carlos). A principio, [P517] no dia 13.
    - Visita equipe Apsis Rio: semana dia 20
    - Ronda: semana dia 27 (Indeva confirmará com indígenas)
  - Diretorias das associações
    - [P341] e D. [P469] estão atuando para conscientização dos caciques.
    - Caciques como [P518] preocupados com o projeto e continuidade
    - Importância de concientizar: "chave do cofre" dos recursos ficará com próprios indígenas.
    - [P34] de estarmos no dia a dia para esta conscientização.
  ## Tabela - To dos'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:395ee8ba-950e-800b-b073-ebdcb269633a')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:387ee8ba-950e-80e6-9e48-dbc7920d2610')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Ata da semana:
  - [P158] roça
    - Dependendo do conserto dos carros da IPES
    - Zé carlos tbm tem médico dia 29.
  - Reunião com todos dos caciques da divissão da antecipação - Apsis Carbon poderá ajudar no custo logóistico.
    - [P177] está marcando data.
    - Preocupação: [P23] de todos os caciques
    - Logística nós ajudaremos para viabilizar.
    - IPES pode participar. [P342] e [P609] tbm.
  - Importante: caciques comunicarem projetos que envolvam supressão de árvores.
    - Exemplo: pista de pouso do moreira.
  - Reunião apenas com agrônomos: sexta, 15h30.
    - Ipes e [P342] encaminhará os formulários alterados para agrônomos.
  - Nova previsão das rondas: dia 1, quarta.
  - Para Zé carlos: pernoite de terça para quarta.
  ## Tabela - To dos'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:387ee8ba-950e-80e6-9e48-dbc7920d2610')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:36bee8ba-950e-80de-bcd8-c8b32e47a9eb')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Ata da semana:
  - [P528]
    - Prefeitura ainda não ajeitou os ramais de acesso da TI pós chuvas.
    - Carros dos indígenas quebraram. Só temos nosso carro para realizar rondas.
    - [P367] quer alugar carro para uso na rondas
    - Há necessidade de retornarmos as rondas.
    - [P690] do xeteria ficou ruim. [P801] tbm.
    - Outro indígena, mirytiga, exige a o aluguel do carro.
    - Aldeia - [P157] e aldeia do [P785].
    - São vários indigenas.
  - [P342] e [P609] estão confeccionando orçamento, a depender da situação dos carros.
    - Por base, 14. 000 de orçamento por ronda.
    - [P609] enviará orçamento.
  - IPES
  - [P276] estaremos em treinamento da conta azul, devemos receber os valores
    - [P467] ainda não indicou quem será o responsável pelo conta azul.
  - [P87] relacionadas a roças
    - Timming em junho, pois depende da sazonalidade
    - [P243] de atividade em junho. [P258] é manter o planejamento.
  - Reunião 26/05/26 - 9h - [P87] de roça e rondas - orçamento.
  - Sábado - [P158] no [P159]
  ## Tabela - To dos'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:36bee8ba-950e-80de-bcd8-c8b32e47a9eb')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:379ee8ba-950e-8084-863c-d388c4eb7d71')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Ata da semana:
  - Treinamentos Conta [P794]
    - No escritório Apsis.
    - Na quinta feira, faremos treinamento com [P360].
    - Momento de testar cinthia e rithelly
  - [P306] com advogados
    - [P622] jurídica avançando
    - possibilidade de recurso liberado na seman que vem
    - Indigenas estão achando que tudo nós temos que pagar com nossos 40%
      - [P13] de desenvolvimento de cartilha, em audio ou podcast
  - Roças
    - [P87] na penultima semana de junho - 22 ao dia 7.
    - [P110] ida nas rondas na semana do dia 15 para coletar tbm insumos e informações sobre as roças.
      - [P306] com caciques, fotos, etc
    - Irão em todas as aldeias na atividade de roças.
    - [P34] de formalizar novo formulário de coleta de informações das roças.
    - [P468] irá definir esse formulário. [P361] o preenchimento pelo [P816] tool box
  ## Tabela - To dos'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:379ee8ba-950e-8084-863c-d388c4eb7d71')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:38eee8ba-950e-809f-9261-c28d51b0faa6')::uuid, r.id, 'Reunião ‣
    - Projeto REDD Parakanã no melhor ranking da [P689], nos 4,3% melhores. Só tem o nosso com essa nota em todo o Brasil. [P500] o nosso é ranking A.
    - Pontos de Atenção: [P862] viram pista de pouso mas viram a base do DNIT.
    - Nós estamos atrasados em relação ao projeto. [P34] de iniciar entendimento sobre processo educacional com [P132]. [P394] recebimento de recursos para iniciar processo educacional.
    - Pra pista de pouso
      - Explicar que é iniciativa dos indígenas dentro do próprio território.
      - Explicar distância da rodovia
      - Sesai se comprometeu a ter avião para atendimento médico.
      - Ficar ao lado dos indígenas é melhor que dizer que não sabia.
    - [P247] enviou email para advogados sobre desmatamentos
      - [P237] prosseguimento e comprometimento do conselhor gestor com desmatamento, etc.
    - Adiamento da atividade de roça
      - [P341] atrasou por causa da indisponibilidade de [P483], [P690] do [P341], etc. [P817] reunião de sábado.
      - [P341] com problema de carro e mão de obra.
      - [P263] que não pode adiar mais.
      - Mecanização de roças: verificar problema de aumentar desmatamento.
      - IPES que esta contratando OSEAS e nòs contratamos Zé [P468]
      - Outro candidato:
        - LOtado em outra cooperativa, aparentemente sem disponibilidade.
        - Comprometido com [P395].
      - FAQ
        - [P160] e respostas - [P160] que [P132] poderiam fazer sobre o projeto. [P396] a semana.
    [P778] que vão entrar? [P777] limpar coisa também, né?
    Correct.
    Со идеја ли ке ја?
    Hey
    [P790] tem alguma ideia do que vai ser?
    Tá um nervoso, né? Eu tenho muito estresse, tô ficando muito velho pra ver esse tanto de planta.
    Ah não, mas tem a nova do [P269] [P397] que eu acho que só falta enviar, né?
    [P720] eu projetar aqui antes pro [P347] aquele relatório que eu falei.
    [P720] eu fazer a transparência.
    Tá vendo? [P790] tá me assistindo? Tá vendo a tela? O relatório? [P869]. Tá em inglês aqui, depois eu vou pedir para traduzir, [P519], mas aqui dá um bom resumo do projeto, lembrando, isso é uma opinião de uma agência internacional, essa B0, que dá nota de qualidade para todos os projetos de [P691] no mundo, os compradores internacionais.
    inclusive projeto indígena, e a opinião externa de tudo que a gente tá fazendo. [P776] conversaram com o [P259] no dia que eu tava indo pro escritório, eu consegui o [P259] deu um depoimento. E eles, como você vai ver aqui, [P776] deram para a gente aqui uma nota A.
    [P807] já, dizer se esse projeto é bom ou não, para quem está comprando, né? [P870] segurança para quem vai comprar o crédito. [P607], olha só como a gente está bem colocado, [P520]. Eu gosto desse gráfico e a gente vai pedir para eles compararem com o mundo também.
    Aqui é um gráfico da nota de todos os projetos RED no Brasil, de todos os tempos, tá? [P692] que começou o negócio de carbono até agora, triple A, que a gente chama de três A, que é esse aqui, não tem nenhum no Brasil até hoje, tá vendo? [P818] As também não tem nenhum.
    [P634] tem a gente. [P802] que é só o nosso. [P862], é só o nosso. Só vai no um então. [P803] só, BBB, aí já começa 22%. Ou seja, todos os projetos até hoje era BBB para baixo. Só o nosso ganhou A. E aí, primeiro que isso me deu uma felicidade pessoal. [P466] eu fico sempre achando, caramba, será que tá certo tudo que a gente tá fazendo? [P786] governança, essa briga que a gente tá de gerenciar os recursos, de treinar os indígenas, tudo. Aí você vê que é difícil, mas se a gente conseguir ter resultado, vale a pena.
    [P466] a gente vai fazer história nisso aqui, tá? E os principais pontos de risco que estão aqui é o que a gente já sabe. É a parte regulatória, mas essa [P521] vê como um risco pequeno, porque ela disse que... O território, de forma muito clara pela [P24] e pela lei lá do [P522], é o território que os indígenas têm autodeterminação para fazer o projeto, e a parte regulatória que a gente está vendo aí, esses projetos do Pará, o [P93], a FUNAI implicando com um monte de coisa, eles vêm como um risco também, mas também vê um risco...
    Se a gente tiver folha e os indígenas do nosso lado, eles acham que é um modelo que vai parar de pé. ajudar a preservar o território deles, que está muito ameaçado, isso que é importante desse relatório. [P693] buscas que eles fizeram, eles viram que realmente madeireiro ilegal já está batendo na porta deles. [P780] negócio de pista de pouso lá do [P354],
    Eu acho que tem boi nessa linha. [P523] [P270] pode estar mancomunada com algum madeireiro ilegal e já pode ter escoado aquela madeira toda. A gente não sabe, não quero levantar falso testemunho de ninguém, mas alguma coisa ali, além do que ele falou de picada de cobra para avião da CESAI e tudo, tem algum boi nessa linha.
    [P466] eles simplesmente cortaram mais de cinco campos de futebol em árvore, né? [P607] é muita madeira. E o [P646] vem me falar assim, "Ah, mas lá só tinha cipó", que o [P354] me falou, não tinha madeira, né? Aí o [P646] acha que a gente é criança também, né?
    Eu nem respondi, né? Eu falei, "Ah, [P646], desculpe, mas o satélite viu que lá tinha madeira e madeira muito boa", né? A gente deu uma sorte que eles olharam também os satélites em tempo real. E ela não viu a pista de pouso, mas ela viu a estrada do [P694].
    [P774] foi um dos pontos que eles questionaram. [P864] assim, eu fiquei imaginando se eles tivessem visto essa pista de pouso, né? A gente certamente teria que melhorar essa justificativa. A gente vai justificar essa abertura da estrada do DENIT, que é um ponto que está no relatório, que a gente vai tentar amarrar melhor, que abriu essa pista porque eles estão elaborando aquela base, né, igual o grupo de baixo tem, o grupo de cima também.
    [P864] é um alerta, né? [P466] todos esses desmatamentos a gente tem que ficar ali muito bem entendendo por que que eles estão acontecendo, porque o tempo todo a gente vai precisar justificar. [P780] da pista de pouso é um que a gente vai precisar amarrar de alguma forma, porque na próxima auditoria, por exemplo, e aí agora não estou falando dessa auditoria de nota do projeto, a auditoria mesmo de validação do próximo período, com certeza eles vão...
    E a gente vai ter que ter alguma justificativa pra isso. [P864] aí, [P398], eu concordo, mas daí vai... O processo tem que ser lento, de educação deles, né? E aí vale uma falha nossa, sim, porque... [P819] dizer, a nossa equipe pequena, orçamento pequeno, tudo, né?
    [P864] daqui pra frente, com... [P695] a primeira emissão e a gente tendo recurso, primeiro que eles vão ver que entrou um recurso grande do projeto, o projeto foi aprovado. [P607] antes do projeto ser aprovado e entrar esse recurso, se a gente está só nessa fase de adiantamento, toda essa coisa educacional com eles não vai funcionar.
    Por isso que a gente tem que ter cuidado, porque na verdade a gente está interferindo dentro da casa de outra pessoa, que não é a nossa casa. E esse comprometimento que a gente quer deles, na verdade quem está devendo a eles somos nós, porque nós não conseguimos ainda aprovar o projeto que a gente falou que ia aprovar.
    Nós estamos atrasados. [P607] esse processo de conscientização a gente tem que começar aos poucos. [P466] na verdade eles estão abrindo a estrada, estão derrubando árvore, mas eles não sabem muito claramente que isso vai reduzir o crédito de carbono. [P776] não fazem esse vínculo, né? [P466], inclusive, a gente já disse pra ele que pras coisas deles, eles já perguntaram isso, eles vão poder derrubar árvore pra roça, pra aldeia, fazer uma nova aldeia.
    [P607] fazer uma estrada com centro cultural tá dentro das coisas deles. [P607] vai começar uma coisa educacional também. A pista de pouso, se fosse para a saúde mesmo, estaria também dentro das coisas deles. [P864] aí eu já tenho dúvida se a saúde está ali dentro. [P607] por isso que isso faz parte da gente educar toda a comunidade. [P803], essa pista de pouso, essa estrada vai derrubar tantas árvores.
    [P650] têm que falar antes de fazer, falar isso. porque a gente tem que fazer essa conta para vocês verem se vale a pena a pista de pouso mesmo. A gente não pode, por exemplo, vai ter que tentar ficar um pouco do lado deles quando for justificar isso para qualquer fiscalização da verba, tudo isso. [P874] ter que falar, olha, eles estão assimilando o projeto de carbono e dentro da cultura deles, né...
    eles ainda estão aprendendo a monetizar, né? [P774] não é uma interferência externa, que isso eles já aprenderam, né? [P864] é uma coisa interna deles. [P786] estrada, por exemplo, é um centro cultural onde também vai ser a base de todo o monitoramento do grupo de cima da floresta e eles estão muito acostumados a fazer uma estradinha até esses lugares, porque eles têm o DENIT trabalhando para eles, inclusive, né?
    [P878] é um órgão do governo.[P607]... A gente não sabe o impacto de fazer essa estrada. [P780] é um processo aos poucos que a gente está fazendo. O território é deles. A gente tem que mostrar pra [P820] que o território é deles. A pista de pouso, a gente também vai ter que justificar que foi um grupo de aldeias que pediu, por conta, elas não têm acesso a emergências médicas, que é um grupo de cima.
    Diferente do grupo de baixo que está do lado da rodovia. E aí, justamente porque eles não sabem monetizar, eles decidiram lá na assembleia deles fazer aquela puxinha de pouso, porque o CESAI se comprometeu, e eles falam isso, né? A gente ainda não sabe.
    [P864] eles falam que o CESAI se comprometeu a ter um aviãozinho para retirar os doentes. [P864] como eles ainda não sabem monetizar, a gente está dentro do processo educacional. [P776] não souberam monetizar, por exemplo, indo um helicóptero lá, em vez de um aviãozinho. [P470] no futuro, quando tiver que for uma solução desse tipo, eles vão ver outras soluções que não cortem água. [P864] por enquanto isso aconteceu por uma demanda interna e a gente dá a justificativa.
    A [P696] gostou, não gostou, é melhor do que a gente falar que a gente não sabia e foi uma coisa descontrolada. e que a gente acha que tem alguma coisa ilícita por trás. [P774] não vai ser um bom discurso, né? Por enquanto a gente está acreditando aí no que eles estão conversando com a gente, né? E sempre colocando pra ver que eles estão no topo da gestão do nosso projeto, que foi por isso que a gente ganhou ponto, inclusive, na bezeira.
    [P776] estão no topo da gestão, né? [P607], eu não posso chegar lá com proibições. para quem é dono do território, porque corre o risco de expulsar a gente para fora. É mais ou menos por aí, né? E por isso que eu tô até com medo desse relatório de monitoramento, que mandei só para os advogados. Eu já sei que o [P467] vai dar um chilique porque vai falar que isso é culpa do grupo de cima. [P524] que o [P467] não faça fofoca com os outros caciques dessa ficha de pouso.
    Enfim, já tô até com medo desse relatório. [P864] a gente vai ligar bem, essa aqui é a segunda safra. Eu falei pelo amor de [P821], manda só pro advogado e fala pro advogado que não é pra mandar pros indígenas, que a gente vai ver como vai lidar com isso, pra não provocar uma guerra lá dentro.
    [P776] não retornaram ainda, esse e-mail jurídico? [P776] vão fazer, [P342], lá na reunião sábado, quando vocês estiverem lá, e aí vocês ficam monitorando com a IPs, na ATA é bom eles reforçarem com as doze lideranças uma pergunta se eles estão todos comprometidos com o projeto, e eles falando sim, isso fica em ATA, já é suficiente.
    Eu acho que vocês estão de acordo com os termos dos compradores, dos compradores pediram, né? E aí depois eu mando para você o que a DUAS pediu no contrato, que eu já mandei para os advogados, né? A gente traduziu para o português o contrato. [P39] a DUAS quer saber se eles vão fazer a governança, se o ponto azul vai entrar, tudo aquilo que a gente já combinou com os compradores.
    Se eles estão comprometidos a... [P271] projeto que vá tirar árvore eles levam para o conselho gestor, esse que é comprometimento mais sério, que o [P354] vai ficar lá querendo ficar contra.
    [P780] tato que a gente tem que ter aí. Hoje eu pensei mais a gente ter um papo aí. O [P609], acho que esqueceu da reunião, né?
    Eu mandei mensagem para ele, acho que deu só um tracinho. [P884] mandar aqui.
    [P628] jogar então para amanhã se possível, [P347]. Eu vou falar que a gente vê um horário. E vou mandar um recadinho aqui pro [P609] e falar assim, você e o [P347] são os mais importantes. Amanhã a gente tinha falado que a gente ia conversar com o [P822] [P238] semanal.
    [P466] por causa de hoje teria o jogo, né? [P875] palco, [P606]?
    Eu acho que não, [P804]. [P787] é que tá? [P786] questão do cargo do [P341], essa logística deles, com a [P238] não tem. [P697] mais vigilância e até então não tem nada planejado. O que você achou disso, LP? [P790] entendeu o porquê que o [P341] adiou a atividade lá pra frente, né? O carro não ficou pronto. [P862], eu acho que é pra além do carro. [P466], por exemplo, pra ele ir nessa atividade, se começasse essa semana, ele não conseguiria ir sozinho, ele precisaria de duas pessoas.
    E ele não tem a segunda pessoa, porque na real aqui ninguém trabalha, né? E aí ele falou lá que a [P647] pode a partir do dia quinze. [P607] assim, pode até ser que o carro dele esteja ruim, mas mesmo se ficasse bom, ele não ia poder quarta-feira agora. [P876] tinha pego esse detalhe aí, mas daí reforça um problema que a gente já sabe, que o [P525], por exemplo, é o de carro que a gente já tá tentando resolver, e o [P341], ele tem carro, mas não tem equipe.
    [P98]. [P607] é complicado. E aí, o que que isso bagunçou, né? [P272] que eu achei que foi muito indelicado da parte dele falar isso na frente do [P788] [P468], que fez uma cara de ficar aborrecido. [P466], poxa, ele tinha um médico hoje, estava marcado pra gente começar essa atividade hoje.
    [P871] tinha um médico. Aí falaram que a gente podia começar amanhã. O [P341] confirmou semana passada que poderia começar amanhã. Em momento nenhum ele falou que a [P647] não ia estar disponível. E aí desmarcou pra gente... O Zé [P468] fez uma cara de puto na hora, deu pra perceber. E aí dia quinze era o dia que a gente tava se organizando, eu e [P345], pra estar lá presencial, pra fazer a semana junto com o [P885] [P606] e com o [P609]. E aí também mexe com a nossa agenda de novo.
    [P607] assim, ainda bem que a gente não reservou passagem. E esse caca complicado, [P399], independente de todos esses problemas do [P341], essa reunião de sábado é a mais importante de tudo. Eu acho que isso ia bagunçar também o cronograma de todo mundo. [P144], se não tivesse essa reunião de sábado, eu ia fazer força para dar um jeito de ter a reunião com o [P788] [P468].
    E fazer uma pressão com o [P341], ele que alugasse um carro, a gente ia se virar, a gente alugaria. [P864] aí pensando que vai ter essa reunião no sábado, o [P341] quer colocar essa atividade pro dia 15. A gente não poderia tentar antecipar pelo menos uma semana? [P466] a reunião é sábado, dia 4. [P776] poderiam ir pra campo, sei lá, dia 6, dia 8?
    Depois dessa reunião, não é? [P862] precisa deixar lá para o dia quinze. [P877] quinze tá muito longe. Ah, nem sei, porque aí depende do dia que eles vão estar em campo, porque o meu objetivo com [P345] é trabalhar com [P342] e [P609], então eles não podem estar em campo.
    Aí tem que ver, eu também não sou desse estilo. que eu não sei realmente o problema que ele tem, né? E você vê, a gente tá fazendo uma pressão por conta de uma agenda nossa, para não mudar, e ele tá fazendo uma pressão porque ele não tem dois recursos importantes, que é o [P823] e a [P647], né?
    [P607] vai ficar uma queda de braço cada um por uma questão quase que particular. Já sei. O que a gente pensa, né? A gente então espera, é flexível com ele nesse ponto e deixa lá para o dia 15, mas pede para ele também um compromisso. Eu acho que agora tem que fazer uma coisa depois adiada e tem que deixar para ele as coisas até claras, né?
    Falar assim, olha, [P341], a gente está vendo aqui que... [P790] tem um problema antes de carro e de mão de obra. É até bom isso não estar presente, porque eu falo isso tudo com ele, né? [P526]. [P607] é bom falar que você está com um problema de carro e mão de obra, né? [P878] é o que a gente está sempre pontuando.
    [P876] é melhor falar isso. [P774] não. [P607] pede pra ele que não pode adiar mais depois do dia quinze, pra ele se planejar. [P876] precisa entrar nesse mérito, via mais o carro. [P607] é assim, até um certo desgaste com relação a isso. [P864] assim, eu acredito que a gente passou o recado naquele dia, né? [P871] tentou argumentar nessa questão de que mudando até o dia 15 não ia impactar nos prazos que a gente tem ainda para executar a atividade.
    Impactou já, porque a gente não tem que focar só na questão, por exemplo, de roça. [P864] tem as outras atividades, açaí, castanha. Se a gente já estivesse fazendo em campo, a gente já teria algo que a gente poderia estar ajudando. Os recursos caíssem na conta das associações, por exemplo.
    [P864] assim, não pensa, e há um cuidado que a gente tem que ter e o domínio da agenda. [P466] a gente estava discutindo agora, né, LP, sobre essa questão, por exemplo, de desmatamento, o impacto que gerou essa pista de pouso que foi construída lá na aldeia do [P354].
    Aí veja bem. Na cabeça do [P341] também vem muito essa discussão com relação a mecanização das roças dentro das aldeias. [P466] veja bem, aí é outra preocupação que às vezes a gente não atenta. Se a gente começa a trabalhar, por exemplo, mecanizar...
    Daqui a pouco a gente mecaniza uma área em trinta e uma aldeia? [P400]. O agrônomo vai muito na parte técnica de desenvolver atividade. Com a essência do projeto em si. Se a gente tem alguma atividade, a gente tem que conciliar. [P607] é muito pensar nisso. Se você observa lá naquele planejamento.
    [P725] atentos a esses pontos de trabalhar justamente as áreas que já foram trabalhadas ali. O último estágio é abrir novas áreas de floresta nativa para produção de roça. A gente focar, trabalhar naquilo que já foi aberto ali. E eu recordo muito bem que na época que o seu [P501] que estava trabalhando no curso da [P364], ele batia também muito forte com relação a ser contra trabalhar mecanização de áreas, principalmente dentro de terra indígena.
    Eu confesso também para vocês, eu não sou muito adepto a gente trabalhar as áreas com relação... Eu também. Eu também não sou, mas daí eu achava que o Zé [P468] ia ficar do meu lado nessa discussão e ele mesmo ficou do lado do [P341], que falou que muitas áreas precisa sim do trator para roça, para limpeza, não sei o quê.
    Eu confesso que ia ser melhor se tivesse uma outra alternativa. É engraçado que depois que o [P341] falou que precisava de mecanização, não sei o quê, aí eu fui lá e falei para ele assim: "Ah, [P341], então tá bom, então faz contato aí com o pessoal, entende quanto que custa esses tratores, entende quanto custa a hora, entende se tem agenda para eles emprestarem...
    os tratores, como que tudo isso funciona, pedir para ele fazer todo esse levantamento. Aí quando eu pedi isso, aí ele já veio dizendo que não, que a roça não precisava de mecanização. [P824] hora eu falo uma coisa, eu fico meio confusa. É melhor agora a gente centrar mesmo só na opinião do agrônomo, do diagnóstico. [P871] que vai dar a nossa linha para a gente não ficar queimando muita mufa, com coisa que a gente ainda não entende, fica sempre na mão de um, de outro, é muito chato isso.
    E gastando dinheiro à toa, né? [P870] coisa que eu fiquei com dúvida foi o seguinte... É a IPEIS que está contratando esse [P502]? [P869], eu combinei com o [P341]. E a gente que tá contratando o [P788] [P468]. [P869]. [P466] o [P609] falou que a gente também fez uma entrevista com outro agrônomo. [P401], mas daí muito bom também, mas ele está em lá, ele está lotado numa cooperativa dos caiapões. [P607], por exemplo, ele não tem uma agenda flexível, não sei se ele vai poder ter uma dedicação, mas me pareceu ser um garoto muito comprometido, inteligente.
    [P871] já falou desde o início, ele precisa de alguém que vai ficar lá. [P273] as orientações dele dormindo na aldeia, e a gente já viu que esse amigo do [P609] não vai ser esse cara. De repente ele vai ajudar a gente e o Zé [P468], a gente ter ele em alguma conversa, ele facilitando, por exemplo, escoar os produtos com alguma cooperativa lá dos caracóis que ele já fez.
    [P835] a rede aí de conexão. Eu acho que é isso aí, da gente atrair essa facilidade que ele já tem, esse envolvimento com relação a essas outras redes sobre essa parte de comercialização. [P864] eu confesso também, eu não vi esse comprometimento mesmo dele desvincular e tentar emplacar uma agenda aqui com a gente, não.
    [P864] que nem o [P805] [P614] colocou, é um cara muito safo, muito inteligente, e tem experiência, né? [P260] com as populações indígenas, trabalha com os [P527]. Se ele tivesse disposto para cá, seria ótima a contribuição dele no projeto. E esse do [P341], esse [P481], o que vocês acharam?
    Eu gosto de conviver, de ver lá o dia a dia, de estar no campo. [P871] tem bastante experiência, né? [P260] em projeto de assentamento, [P648], [P474]. É, é só que a gente precisa ter um cuidado com quem a gente tá levando pra dentro da aldeia minimamente, porque é diferente, né? Os indígenas confiam na gente pra gente levar uma pessoa lá, mas se o [P341] também indicou, deve ser de confiança dele, né?
    Conhece recém.
    O agrônomo tem experiência em agronomia, o ideal do cara é realmente produzir o máximo possível. A nossa realidade não é essa, então talvez a gente tenha que filtrar alguma coisa.
    [P878] horas é nossa reunião amanhã mesmo? Amanhã tem a quatro e meia. [P144] acho que pode ser com o [P341], mas aí sinceramente nem tem muito assunto pra conversar não, LP. Tá tão longe. A menos que tenha alguma coisa da governança. 
[P862], eu acho melhor a gente focar na governança com o [P341], que ele vai estar lá sábado.
    A gente pode fazer uma mais cedo. [P886] está na'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:38eee8ba-950e-809f-9261-c28d51b0faa6')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:356ee8ba-950e-806b-9de7-e222408e823d')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Ata da semana:
  - Mapas - SCCON
    - 1º Mapa: mapa para ronda com hidrografia, estradas, etc
    - 2º  Mapa do projeto com informações de áreas prioritárias, etc.
    - [P58] na plataforma - [P470] nessa sexta feira (8/4)
  - Visita LP na próxima semana
    - [P900] tocar a divisão de recursos e seus critérios
      - Entre família e por aldeia
    - De segunda a quarta.
    - [P609]: montando orçamento da viagem dos indígenas até Marabá.
      - [P350] iria arrumar espaço na secretaria de agricultura ou auditório da prefeitura. Sem confirmação ainda.
      - [P722] então dois dias.
    - [P795] também em demonstrar o Conta [P794], fazendo uma organização de sua implementação.
    - Reuniões podem ser entre segunda e quarta. [P617] não foi definido.
      - São dois dias de reunião e um que será usado para treinamento do conta azul, se possível. Ou em qualquer momento não dedicado às reuniões.
    - [P862] são todas as lideranças, mas sim os diretores das associações.
    - Quanto à reunião da Conta [P794], indígênas estão reunidos para falar em conjunto conosco. [P470]  para criarem “força” frente o controle da Apsis.
      - [P470] os indígenas estejam com medo de controlarmos a conta bancária.
  - Ronda emergencial programada não ocorrerá devido à impossibilidade da INDEVA de pagamento do aluguel de carro
  - Alerta: indígenas podem querer tratar sobre a diferença entre recursos por famílias e divisão desigual das famílias do grupos.
  ## Tabela - To dos'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:356ee8ba-950e-806b-9de7-e222408e823d')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:317ee8ba-950e-8065-b634-f8652b7f7c13')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Ata da semana:
  - INDEVA
    - [P366] recebeu msg de caciques: furtos de castanhas ocorrendo na TI. [P780] último período de fevereiro é a “última queda” da castanha.
    - É possível que outros indígenas que estejam chegando antes de outros nas castanheiras, já que seria difícil brancos entrarem sem serem vistos.
    - [P176] relatou que [P775] e servidor da Funai foram colocar placas de identificação e encontraram abertura de “pique” para dentro do limite da TI. Funai está ciente.
    - [P132] pediram a FUNAI que fosse feito arrastão - caminho na mata - dentro da TI.
      - Pedido encaminhado para [P242], para facilitar vigilância.
    - [P236] de [P528] sem participação indígena:
      - [P366]: acha importante relatar aos indigenas que ainda não podemos pagar para eles. [P825] que é possível conversar com indígenas para fazermos rondas sem eles.
      - [P236] de [P341]: 2 visitas por mês nas aldeias.
    - Secretaria dos povos indígenas se reuniram em Belém e se comunicaram com [P806] dizendo que poderiam fazer projeto jurisdicional no [P879].
      - [P806] foi por conta própria.
      - [P877] 11, [P887]. [P698] [P132] farão reunião em [P73] com indígenas.
      - As visitas mensais são vistas por [P341] como importante para manter presença e confiança dos indígenas.
    - [P367] marcou reunião com equipe INDEVA e IPES essa semana, para falar a respeito das rondas.
  ## Tabela - To dos'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:317ee8ba-950e-8065-b634-f8652b7f7c13')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:310ee8ba-950e-8085-bc19-d844d5adf364')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Ata da semana:
  - LP deve ir em março para o [P879], após conclusão da casa.
  - Ida dos advogados à Apsis:
    - Início de março. [P470] dia 7/3.
  - Projeto aguarda análise da Verra da [P33] do projeto.
  - [P158] com ICMBio
    - Compartilhada pelo [P637] para equipe Carbon.
  - [P890] [P501]
    - Importância de mantivermos capacitações, para evitar “esquecimento” pelos indígenas.
  - Grupo de baixo tem dificuldade de entender a escassez de recursos, enquanto grupo de cima tem maior facilidade em entender os recursos
    - Koatinemo mandou áudio para outros caciques para agendar reunião para tratar sobre a falta de atividades.
  - Monitoramento via satélite está atrasado, devido a Nova Terra.
    - Indeva fez monitoramento de pontos críticos, mas sem cálculo de desmatamento.
    - [P642] imagens antes e depois por [P637].
    - [P864] sem capacidade de monitoramento e quantificação.
  - Visita [P782] helena em 3 aldeias
    - Entrega de lixeiras em 2 aldeias e outra sob pedido do cacique.
    - Tudo em relatório.
  - IPES
    - Fizeram reunião com [P775] do ProPkn, sobre monitoramento e atividades.
    - [P236] de fazermos atividade em conjunto com pro pkn para definição de ações de proteção, pois propkn está participando de investigações junto à PF.
    - Preocupação do propkn quanto ao projeto é a dependencia dos indigenas com os recursos e não quererem mais produzirem as cadeias de bioeconomia.
    - Teve relatório da reunião.
  - Castanha
    - Ipes ainda fazendo levantamento com quem está vendendo. [P529] chuvas atrapalharam o andamento desse levantamento.
  ## Tabela - To dos'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:310ee8ba-950e-8085-bc19-d844d5adf364')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:2f4ee8ba-950e-8042-8780-eb308240d7a5')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Ata da semana:
  - INDEVA
    - Visita a duas aldeias do grupo de baixo no FDS para entregas de lixeira
    - Falaram com caciques
      - Estavam “tristes” com a ausência do pessoal nas aldeias.
      - Cacique da [P94], [P402] pediu maior presença do projeto, fez bastante perguntas sobre a ausência do projeto.
    - Pediu que professoras fizessem relatório de recebimento das lixeiras. [P274] no relatório de janeiro
    - Relatório de dezembro está pendente, [P782] [P469] ciente. [P638] providenciando.
    - Do grupo de baixo, apenas uma aldeia não colhe castanha.
      - [P782] [P469]: apenas a [P161] não colheu castanha. Por ser aldeia nova, quem colhe naquele local é a [P377].
      - [P787] é de uma aldeia nova, o combinado do povo Parakanã é privilegiar aldeias mais antigas para colherem a castanha.
      - “as castanhas já tem dono” segundo o cacique, pois quem colhe lá é o pessoal da [P377].
    - [P637] e Indeva mapearam pontos de pressão e pontos estratégicos na TI, além de rotas.
      - Incluiu inclusive trilhas localizadas pelo [P365]
      - Importante que seja registrado a reunião com fotos e inclusão no relatório.
    - Uso de câmeras de monitoramento nos pontos de pressão
      - [P342] pediu mais informações sobre o tipo de câmera que pode ser usada: camera trap, etc, sem é ao vivo.
      - Vê importância para ser utilizada para denúncias, mas que pode aumentar perigo de destruição das câmeras, etc.
    - PMIF: conversarão com “seu [P530]” sobre confecção do PMIF
      - [P530] informou que FUNAI reclamou após curso da brigada de incêndio.
      - Ou seja, antes de seguirmos com PMIF, necessitamos abrir contato com a FUNAI.
      - Mapa: pode ser utilizado para confecção do plano de proteção territorial, onde poderá ser compartilhado com IBAMA, Funai, etc.
        - [P342] acha melhor aprimorar e aprofundar o mapa antes de ser compartilhado.
      - [P795] também em criar um modelo de proteção territorial do [P95].
    - Modelo de governança aprofundado e será levado aos advogados.
      - Final de fevereiro haverá reunião presencial com advogados. [P341] engajará com advogados para resposta, etc.
  - IPES
    - [P617] não houve nenhuma solicitação por parte dos indígenas sobre o apoio de combustíveis. [P649] entrar em contato na quarta-feira.
    - Do grupo de cima, todas as aldeias colhem castanhas. [P500] não possuem controle da quantidade.
    - Reunião com a consultoria NRS ainda não foi confirmada.
    - IPES está montan
  ## Tabela - To dos'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:2f4ee8ba-950e-8042-8780-eb308240d7a5')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:38fee8ba-950e-8097-af75-dc2830ee46c3')::uuid, r.id, 'Reunião de [P40] [P41] e de Governança - Projeto Carbono Parakanã ‣
    ### Itens de [P826]
    - [ ] [P609] comunicar aos caciques que a atividade de roça está adiada, sem definir nova data, e informar que haverá reunião de governança antes ‣
    - [ ] Equipe alinhar com [P467] sobre a reunião do dia 4 em [P82] e a participação do time no evento ‣
    - [ ] [P609] e [P347] participar da reunião do grupo de cima, registrar lista de presença e fotos como evidência ‣
    - [ ] Remanejar parte do orçamento do adiantamento para cobrir a ajuda de custo dos advogados na reunião do dia 4 - [P251] passar orçamento ‣ ‣
    - [ ] Realizar atualização técnica rápida do projeto com [P609] e [P347] antes da reunião de governança ‣ ‣
    - [ ] [P167] com [P345] sobre o agrônomo sugerido por [P609] para a atividade de roça ‣
    - [ ] [P254] política/regimento interno de atividades de campo da Apsis Carbon (regras de adiantamento, telemetria de veículos, etc.) junto com [P609] e [P347] ‣ ‣
    - [ ] [P449] pauta fixa nas reuniões de segunda-feira para acompanhamento de denúncias/ligações informais dos indígenas ‣
    - [ ] [P348] organizar série de reuniões temáticas com [P609] e [P347] durante a semana em que [P345] estiver de férias (temas: política de campo, biodiversidade/outros indicadores do PD, bioeconomia, roça) ‣ ‣
    - [ ] [P184] pauta da reunião com LP na segunda-feira às 11h e repassar para a equipe ‣ ‣
    ### Contexto [P699] da Reunião
    - Reunião de alinhamento operacional do projeto de carbono/bioeconomia em território indígena Parakanã, no Pará ‣
    - Participantes incluem equipe de campo ([P609], [P347]), coordenação ([P341], [P804]) e dois agrônomos convidados ([P481] e Zé [P468]) ‣ ‣
    - [P20] de [P481] e Zé [P468] foi iniciada mas ficou prejudicada por instabilidade de conexão; ficou acordado fazer reunião específica para conhecê-los melhor antes da próxima ronda ‣ ‣
    ### Governança e [P378] com os Grupos [P132]
    Grupo de baixo (principal preocupação):
    - Grupo de baixo ainda não recebeu adiantamento e há desconfiança crescente sobre o projeto, divisão de recursos e atrasos ‣ ‣
    - [P467] é o principal condutor das reuniões com as lideranças, mas a equipe avalia que ele não tem o preparo necessário para lidar com as dúvidas e conflitos internos das aldeias ‣ ‣
    - Informações sobre o projeto não estão chegando às lideranças locais, gerando dispersão e desengajamento ‣ ‣
    - [P165] e [P614] relataram preocupação de outros caciques com a divisão de recursos e a nova fase de governança ‣
    - Dependência excessiva de [P467] para qualquer reunião com lideranças foi identificada como risco crítico ‣ ‣
    Decisão sobre adiantamento:
    - Consenso de que o repasse do adiantamento deve ser feito, pois sem recurso fica difícil qualquer diálogo ‣ ‣
    - [P67]: não sinalizar publicamente os problemas com compradores para não afastar o interesse no projeto ‣ ‣
    - Após o repasse, aproveitar o momento favorável para aproximação presencial com as aldeias do grupo de baixo ‣ ‣
    - Grupo de cima: contas abertas, documentação regularizada, considerado "em dia" - não deve ser penalizado pelo atraso do grupo de baixo ‣ ‣
    Reunião emergencial (dia 4):
    - Reunião não prevista foi pautada para o dia 4 em [P82], com presença dos advogados das lideranças ‣
    - [P843] reunião se sobrepõe à atividade de roça e tem prioridade; atividade de roça foi adiada em consequência ‣
    - Equipe ([P609], [P347]) estará presente; ajuda de custo dos advogados é responsabilidade do projeto ‣
    ### [P87] de Campo - Roça e [P42]
    - [P158] de levantamento da roça estava planejada para semana seguinte, mas foi adiada pela reunião do dia 4 e pela reunião do grupo de cima ‣ ‣
    - Calendário agrícola: limpeza das áreas a partir de outubro, plantio após primeiras chuvas (normalmente outubro), mas com incerteza climática - inverno tem chegado cada vez mais tarde, por vezes só em dezembro ‣ ‣ ‣
    - [P22] de julho não afeta plantio de 2026, pois julho-setembro é período de preparação ‣
    - Alerta de que o projeto não deve se limitar à roça: há outras culturas relevantes (açaí em safra atual, castanha, cacau, banana) que também precisam de assistência técnica e podem ser registradas no âmbito da bioeconomia ‣ ‣ ‣
    ### Incidente da [P700] de [P701] (Grupo de Cima)
    - Um cacique do grupo de cima construiu uma pista de pouso desmatando área equivalente a cinco campos de futebol, sem consulta ao projeto ou à FUNAI ‣
    - [P846] foi comunicado a compradores, que questionaram impacto no projeto (impacto apenas na segunda safra) ‣
    - [P251] incluirá cláusula no estatuto exigindo que qualquer projeto com área superior a um hectare passe pelo conselho gestor ‣
    - A omissão de órgãos públicos (FUNAI, ANAC) no controle dessas ações reforça a narrativa de adicionalidade do projeto de carbono ‣ ‣
    ### [P178] [P403] - [P807] A
    - Projeto recebeu nota A em avaliação externa (ainda não validada), considerada muito positiva para o projeto ‣
    - Avaliadores destacaram a adicionalidade em razão do desmatamento interno no território [P531] do [P532] como referência comparativa ‣ ‣
    - Um dos requisitos levantados na avaliação: controle do número de denúncias informais recebidas dos indígenas (ligações, mensagens), que ainda não é sistematizado ‣
    ### Protocolo de [P162] [P163]
    - [P162] informais (ligações dos indígenas sobre invasões, desmatamento etc.) recebidas por [P238] e IPES não são registradas nem consolidadas ‣
    - Proposta: criar momento fixo nas reuniões de segunda-feira para coletar esses dados da equipe de campo ‣
    - Meta: ter número mensal de denúncias para inclusão nos indicadores do projeto ‣
    ### Contratos e [P378] com IPES e [P238]
    - Discussão sobre o cumprimento das obrigações contratuais de IPES e [P238]: equipe avalia que entregas não estão sendo feitas conforme contrato ‣ ‣
    - Decisão operacional de [P345] e LP foi de assumir internamente as atividades não entregues pelos parceiros, para manter controle sobre o resultado ‣ ‣
    - Reconhecido que a dependência dos parceiros ainda é de aproximadamente 30%; com dois profissionais adicionais na equipe própria, o projeto ficaria 100% autônomo ‣ ‣
    - [P345] pediu elaboração de política de campo com regras claras (uso de adiantamento, telemetria, etc.) para dar mais controle e respaldo formal à equipe ‣ ‣
    ### Próximos [P533] e [P534]
    - Reunião com LP confirmada para segunda-feira às 11h - pauta a ser definida e repassada ‣ ‣
    - Série de reuniões temáticas a ser organizada durante a semana em que [P345] estiver de férias (política de campo, biodiversidade, indicadores do PD, bioeconomia) ‣ ‣ ‣
    - [P355] ronda de campo ainda sem data definida (possivelmente fora de julho) ‣ ‣
    - Reunião específica para apresentação completa de [P481] e Zé [P468] a ser marcada antes da próxima atividade de campo ‣
    [P466] se tiver algum problema mesmo com o grupo de baixo também não entra o depósito do grupo de cima, a gente sabe, né? E é pior do que isso, o grupo de baixo pode parar o projeto inteiro. [P864] assim, a reunião de segunda talvez não tenha, né? da nossa reunião semanal, mas aí a gente alinha algumas coisas lá sobre isso aí.
    [P774] a gente só pode mesmo com o [P467]. [P466] ele que conduz a reunião com todo mundo. Eu acho, por exemplo, como a gente já foi várias vezes, né, [P341], colocar a governança para o grupo de cima, para o grupo de baixo. O [P467] já passei várias vezes todos aqueles slides da governança para as reuniões que eles fazem com a diretoria.
    [P607] eu acho que a gente pode ver qual informação que o [P467] precisa. E aí eu acho que a gente combina também porque em outras crises no passado, o [P702] ligou para o [P664] [P703], ligou para o [P535], né? E conversaram. [P275] à disposição dele, com toda a equipe, pra gente ir pras reuniões, ajudar nesse esclarecimento. A gente fica na dependência dele, né? Na verdade eles estão esperando o grupo de baixo e o dinheiro entrar na conta, sinceramente, [P341], eu acho.
    [P786] coisa de governança acho que não é mais conversa sobre isso. [P776] querem o adiantamento e aí eles ficam mais abertos para escutar. O projeto está atrasado, tudo isso, realmente eu acho que só o [P467] que tem esse trato aí com eles, né? [P607], vamos lá, uma sugestão então por partes aqui. [P607] o time aqui dos agrônomos, a gente posterga ou faz algum alinhamento hoje? Só para a gente conduzir aqui a conversa. O objetivo hoje era a gente conhecer um pouco também o OZES, a gente falar sobre o formulário da Roça.
    A gente já iria semana que vem aplicar. [P774] se acontecer, não sei se vale a pena. [P276] a gente está na parte operacional, vamos conhecer um pouco o [P481]. E aí acho que o Zé [P468] conversar um pouco aí também com você. E depois em outra reunião a gente fala dessa parte de governança.
    [P628] fazer isso. [P607], desde 2003 a gente vem trabalhando. O movimento social é formado numa escola agrícola de Marabá, mesmo. E em 2006, quando saí da escola, já entrei numa cooperativa chamada [P404]. da agricultura familiar do sul e sudeste do Pará, onde tinha sete cooperativas de sete municípios que fazia parte dessa cooperativa.
    A gente entrou lá como auxiliar de produção, e aí no segundo ano a gente entrou para a área de... A gente organizava a produção no município de Marabá e nessas sete cooperativas, nesses sete municípios. [P277], São [P775], [P43] e Marabá. [P607], eu trabalhei oito anos nessa cooperativa.
    [P536] da cooperativa nós tínhamos um projeto chamado [P704] [P278], que era um projeto voltado também para filhos de agricultores. [P44] familiar voltada mais para fruticultura. [P787] trabalhei oito anos na cooperativa. A empresa fazia esse técnico no projeto do [P648].
    Música Marabá e quando foi no final de 2001? O projeto era para mais um ano e seria renovado, né? E aí a gente não conseguiu renovar com o [P648], acabou o projeto. Aí eu fui terminar um projeto em [P279] dos [P405], que era da mesma empresa. [P164] também na [P280], muito conhecida aqui na região.
    Assistência técnica na zona rural. A gente pegava ali Rio [P281]. E pegando uma parte também voltada já na divisa do [P282]. envolta ali de quase reverenção geral. Em 2016, a mesma empresa também tinha um projeto voltado de acompanhamento da assistência técnica lá no [P283].
    financiamento da [P808] para pequenos agricultores. Por mais ou menos aquelas regiões, e 2017 o projeto acabou, né? E volto pra [P705].
    Trabalhei três anos e nesse período também teve um concurso público e eu não consegui passar nos primeiros lugares do concurso. [P607], licenciatura em educação no campo. [P706] período eu trabalhei quatro anos na SEAG. A gente atende os projetos de assentamento do município.
    mais ou menos de distância dos assentamentos. O [P406] e repartimento. E eu também trabalhei com o projeto de consultoria técnica. São [P775], [P872] [P665], [P827] [P96]. A empresa chamada [P407]. [P707] vários parceiros também, ONGs que trabalhavam. A empresa de São [P614] prestava serviço aqui com a consultoria também com a PPA.
    O município rodou, uma das financiadoras do projeto. [P97] também na consultoria nessa área de assistência técnica, mais voltada mais para consultoria. E as culturas que você teve bastante contato lá? A gente não cheguei a trabalhar ainda diretamente.
    Os pedaços que a gente trabalhou em [P872] [P665] foi próximo aos indígenas aqui. [P408] grande e [P25], né? [P870] outra empresa que prestava serviço para os indígenas aqui. E as culturas que a gente trabalha geralmente é a cultura do cacau. [P284] a cutajada com tamarema e que coisas florestais, de joroba, castanha.
    O mogno, o amareloão, enfim, várias essências florestais madeireira e não madeireira, né?
    O intuito também da empresa era fazer também a recuperação das áreas degradadas, principalmente das nascentes. [P863] importante mesmo, principalmente nos vizinhos amigos. [P98] isso. Eu acho que o Zé [P468] caiu. Ah, my baby. Eu sofri três dias e fiquei no escuro.
    [P634] voltou. [P634] sumiu. [P888], eu não tenho o que perguntar nada aqui. O que eu acho importante é passar pelo [P708], do [P828], do [P341], da região aí. A empresa ligada a esses projetos junta o INCRA. [P607] é acostumado, acredito eu, conviver com assentado, dormir em volta, sair na minha linha para voltar. [P774] é importantíssimo. [P503] a gente trabalha com área de assentamento junto com a gente do INCRA, não só para elaborar projetos, mas como assistência técnica, a gente encontra de tudo nas áreas, em termos de cultura.
    [P607] isso aí é um ponto muito importante. [P829], na verdade, a equipe, acredito com todo respeito, é só uma equipe conversar, alinhar só a questão do trabalho da positiva. O que é que deve proceder? porque já estão acostumados a trabalhar diretamente com os indígenas.
    Até porque também, com certeza, a equipe já deve ter quebrado bastante. A gente vai trocar as informações, tirar as dúvidas. A gente está planejando essa primeira viagem? [P709] são as condições, a questão da água? Até onde eu entendo aqui, a gente tem um mês de julho para essa questão de plantio.
    [P832] eles vão limpar é a partir de outubro, correto? [P536] do nosso calendário, né? [P409] aqui no Pará. [P862] tem problema algum, o exemplo. Julho, agosto, setembro. [P871] não consegue determinar cem por cento. Se for trabalhar esperando mesmo o nosso inverno aqui. Eu ainda acho meio complicado outubro.
    Hoje nós estamos com uma dificuldade de chuva muito grande na nossa região, que o inverno geralmente só está chegando de dezembro para frente. Se a gente for trabalhar pensando na questão de irrigação ou uma molhação parecida, a gente consegue trabalhar o ano todo, mas pensando na chuva em si, outubro ainda acho...
    [P634] prepare o [P710]. Às vezes a chuva, às vezes vai dar uma chuva. Aí não faz mais nada. Se começar a chover, a gente acha que vai parar. [P862], essas chuvas vão acontecer, mas depois dá uma pausa. Do ponto de vista, nós temos que trabalhar essa questão.
    vai ser feito, quando a chuva sair. O povo, a gente está pronto. [P864], não tem problema. [P341], principalmente porque na semana passada o [P609] comunicou a todos os caciques que essa atividade ia acontecer. A gente pediu adiantamento, a gente se mobilizou.
    O questionamento do diagnóstico, questionamento da roça e agora a gente vai levar pra frente de novo, né? [P607], nós estamos ainda fazendo esse levantamento agora em julho. [P864] isso não vai afetar o plantio de 2026, tá? [P466] julho, agosto e setembro é preparação diária. [P503] é que eles vão plantar? É quando os alunos falaram. [P45] caem as primeiras chuvas em outubro, mas não é certeza. [P607] a partir desse momento é que vai fazer o plantio, porque não é plantio de ligar.
    Eu fiz essa comunicação dessa forma. [P607] mesmo que a gente tivesse em campo dia 2, a gente não ia conseguir muita coisa. Por isso que eu sempre tenho um planejamento, tenho um cronograma, mas ele tem que ser flexível. [P786] reunião do dia 4 foi um imprevisto mesmo, e ela se sobrepõe a tudo que a gente tá falando aqui. Eu acho que vai ter que comunicar, [P609], que vai ficar para frente por causa da reunião deles mesmos com os advogados que a gente ficou sabendo e que a gente vai estar presente inclusive no dia 4 lá na [P82].
    [P607], vai ter que comunicar isso pros caciques, né? [P874] ser depois da reunião. Depois da reunião do [P711] de [P712]. E aí a gente vê internamente, [P609] e [P347], como a gente vai fazer, porque a gente pediu adiantamento para essa ronda. E eu já combinei com os advogados que a ajuda de custo para essa reunião, os advogados pediram ajuda e tudo, e é nossa responsabilidade também que isso aconteça.
    A gente vai ajudar, a [P251] vai passar o orçamento, e o [P467] também deve passar quando for marcar a reunião. De repente a gente vai ter que remanejar parte desse orçamento pra essa ajuda de custo, né? Já comprometeu alguma coisa, [P609], pra essa onda? [P862], só as impressões, só o material que ia ser levado. Ah, tá, isso a gente pode... [P862], tudo bem, isso daí a gente aproveita, lógico, a gente só joga pra frente.
    E essa reunião é o que tá me preocupando é esse feedback aí do grupo de baixo. [P802] legal a gente fazer uma atualização de vocês da parte técnica, porque [P347] e [P609] que vão estar lá. [P347] já entende bastante do projeto, [P341] também. É só uma atualização mais rápida, vai tirar qualquer dúvida lá. E [P609] é bom estar presente também para ir entendendo cada vez mais aí.
    Em que fase está o projeto? Por que está atrasando? [P26] que tem. A gente repassa.
    [P810] das reuniões que o [P830] conduz, e que ele sempre fez questão de conduzir sozinho, a gente está bem mais presente nas aldeias do grupo de baixo do que do grupo de cima, passando... Até porque ali ficava mais perto da rodovia a maioria também, né? [P650] acham que vale a pena mandar uma mensagem para os caciques avisando que não vai ter mais essa atividade de roça? O que você acha, [P341]? [P862] é nem que não vai ter mais, mas não vai ter mais agora, né? Na próxima semana. É, a gente está jogando para frente por causa da reunião.
    dos caciques sobre o adiantamento do recurso. Reunião da governança e a [P831] vai ficar um pouquinho mais pra frente na semana seguinte, sem falar a data.
    [P875] a roça, tem a castanha e tem o açaí. O açaí já está iniciando a sua safra. O que a gente poderia estar incentivando ou ajudando nessa parte do açaí? A castanha, no início do ano, a gente deu uma pequena ajuda ali na parte de apoio logístico, transporte da produção. A gente consegue descrever algo com relação ao projeto nessa etapa da castanha.
    E do açaí a gente tentava já nesse trabalho do levantamento da produção aí, de entender até também dar uma... de que forma a gente poderia estar ajudando ali. tem outras culturas que o pessoal está iniciando, como por exemplo o próprio cacau, né? [P878] o pessoal observou, tem a parte de banana que o pessoal tem trabalhado também. [P607] assim, tem outras culturas que eles desenvolvem e que também requerem esse nosso olhar de pelo menos a parte de assistência técnica a essas outras culturas que são desenvolvidas dentro do território.
    E aí assim, só pra gente deixar alinhado aqui, pra gente não ficar postergando. [P607] a gente... a gente olhar para o todo da parte do projeto que envolve a parte da bioeconomia. E assim a gente também compreende os problemas que vêm acontecendo, já tem uma sobreposição de uma reunião que foi pautada agora e que tem a sua grande importância e que a gente também tem que estar acompanhando. [P780] é um ponto com relação à parte da produção.
    Em conversa com o próprio [P165] e o [P614]... [P776] têm demonstrado muita preocupação por parte de outros caciques, tendo isso que eles não estão ainda compreendendo essa parte de divisa dos recursos e tudo mais, essa nova etapa que vai vir pela frente, de trabalhar essa parte do fortalecimento e a governança mais severa nesse aspecto.
    E a gente já observou, já participei de algumas reuniões que o [P467] conduz ali e assim, a gente tem visto que ele não tem essa, vamos dizer, esse traquejo, essa condição plena para estar lidando. a desvalorização deles ali. [P607], junto a isso, o perigo é de dar um conflito maior. [P666] eu que, se a gente está acompanhando ali mais de perto, orientando, tirando essa dúvida, ele se sente, vamos dizer assim, de uma certa forma, vamos dizer assim, mais acolhido nesse aspecto.
    [P276] mais gente está envolvida, os outros caciques se sentem mais abraçados. [P628] planejar isso. O que eu quero combinar com o [P467] é que eu estou propenso a não levantar esse problema dos compradores, porque é uma coisa, uma sua responsabilidade que eu estou assumindo, porque senão não vai ter depósito para nenhum dos grupos.
    Se eu levantar que está com esse problema ainda no grupo de baixo, de desconfiança do projeto... [P713] problema com relação aos adiantamentos. [P46] de entender que são os americanos que demoram para aprovar. Eu estou propenso a que seja feito esse primeiro depósito da primeira parcela.
    os recursos nas associações, eles vão ficar mais atentos e propensos a receber vocês. O que você acha? [P790], o [P609], o [P341], uma proximidade maior no grupo de baixo? O que você acha? Depois eu dou minha consideração. Só um minutinho, [P502] e Zé [P468]. Eu acho que esse papo aqui agora a gente tá falando da governança.
    [P786] coisa de... [P781] que a gente vai marcar uma outra reunião agora, era baixo para te conhecer, Zé. [P261], um abraço. [P667] a semana, hein? Segunda-feira a gente vai ganhar lá no mata-mata. [P261]. [P714], tchau. [P667]! [P628] mais aqui a gente agora.
    Antes da viagem a gente faz um brief. [P668] reunião aí, vamos lá.
    Eu vejo que essa governança está ficando na mão dos advogados. E isso está ficando muito difícil a gente aqui interferir. A gente aqui está mais junto, está mais próximo. [P466] fica muito assim, eu quero reunir com as lideranças, eu preciso que o [P467] autorize. Se ele estiver presente, a gente reúne. Se não estiver, ele não pode.
    [P607] é por isso que eu sempre fazia essa visão de conselho, porque o conselho se remite... E o advogado está ali como um pleno do conselho. e aí a gente vê a dificuldade nossa no grupo de baixo não é com as lideranças, é porque elas não estão entendendo, por exemplo, tá bom, e aí agora como é que vai ser a partir? O que vai ser feito, né? São esses esclarecimentos, porque não está chegando lá na ponta.
    [P862] está chegando em cada liderança, por quê? [P466] eles não têm um traquejo, né, que o [P379] tanto fala. [P862] quer tirar tempo para ficar lá explicando detalhando, e aí causa esse mal-estar das lideranças às vezes ficarem dispersas, não estarem muito envolvidas porque elas não estão entendendo. [P862] é que elas não estão entendendo o projeto e não estão aceitando e não estão discutindo, elas não estão entendendo essa etapa, né?
    [P787] é essa ponta da comunidade? [P832] é que a gente vai usar isso aí? Eu queria conversar com o diretor dietro do grupo de parte. [P537] eles para uma reunião? [P869]. [P833] autorizou fazer essa reunião? [P607] não vai ter reunião. É muito isso. [P607] a gente chegou nesse ponto crítico. [P862] é para ser assim, né? [P864] é assim.
    Para vocês talvez é tomar o foco. [P628] resolver. [P774] aí amanhã depois está tudo em dias. [P864] a prática do dia a dia aqui é diferente. Eu penso em liberar o recurso, mas junto com uma marcação mano a mano que a gente vai fazer. A [P538] tentando ajudar, porque eu acho que sem o recurso fica difícil, [P341]. Eu acho, qualquer tipo de papo. [P869], sim, com recurso ou também, é só você entender que o que está acontecendo mais é que o [P467] não está conseguindo o que a gente se propôs a fazer, né?
    [P873] perdeu pouca coisa, né? [P539] a saída dela. [P774] que é o importante, vocês poderem estar próximos. A próxima série PI, para todo mundo, é melhor a gente fazer nas aldeias. Eu espero que esse adiantamento, o projeto seja aprovado pela VERGA, enquanto o adiantamento tá caindo, vai ser o melhor dos mundos. E aí a gente vai na aldeia, vai ser num clima muito bom, porque eles vão estar com dinheiro nas associações e a gente vai na aldeia dizendo que vai entrar mais dinheiro, que foi tudo aprovado, os créditos já vão estar na conta dele lá nos [P410] [P540].
    [P872], as atividades da Roça também, se a gente não adianta, pode ter problemas. [P607], tem outras ações que vão vir pela frente. [P607], direto ao ponto. Eu estou de pleno acordo de que passe-se o repasso. Até também, vai contando outro ponto, de não prejudicar o justo pelo pecador. [P466] os meninos correram, andaram, fizeram, vamos dizer, as coisas dentro do prazo, do grupo de cima, se anteciparam, abriram as contas, correram atrás da documentação, está registrada, está tudo ok.
    E aí a gente fazia essas condicionantes para eles, até também relatar o pessoal lá do grupo de cima, eles fizeram todos os processos ali dentro do seu prazo que estava estabelecido. [P650] aqui tiveram esse atraso até para se sentir um pouco ali vamos dizer responsabilizado pelo não cumprimento dos prazos que foram estipulados.
    O grupo de cima, por um lado, vai bem, por outro lado, faz uma pista de aeroporto. [P774] daí já foi parar, a gente mandou lá para duas compradores, e eles quiseram saber se isso teria impacto no projeto. [P774] vai ter só na segunda safra, mas é o que eu falei hoje também.
    A [P251] até concordou, ela vai colocar lá no regimento do estatuto, [P341], um item que qualquer projeto... embora seja uma área maior do que um hectare, por exemplo, que isso vai ser levado só para discutir no conselho gestor. [P774] daí é uma... [P774] é muito
    [P786] pista pequenininha que ele fez foram cinco campos de futebol. Eu fiz a conta para ver a proporção desses hectares em um campo de futebol, até para dar ordem de grandeza. [P607], se é um projeto que vai preservar a floresta, como é que eu arranco cinco campos de futebol? O cacique faz isso sem falar com ninguém. [P607] isso é uma coisa que foi grave também. E isso eu não sei como é que isso vai cair lá no grupo de baixo, né?
    Os órgãos públicos, eles são omissos, isso é um ponto. [P466] para abrir cinco campos de futebol dentro de um território indígena, isso tem que ser aprovado por ANAC, porque é uma pista de poço. [P862] interessa se é um aviãozinho monomotor ou se é um jato, é um avião.
    [P607] tem que ter aprovação, tem que ter licenciamento ambiental. Eu duvido que a FUNAI vai dar uma autorização. dentro do território para suprimir cinco campos de futebol de árvore, assim de uma hora para outra. [P607] vê mais ou menos uma espécie de omissão que acontece dos órgãos públicos. [P774] reforça a nossa tese que eles na hora H não ajudam a proteger a floresta.
    O que ajudou muito é porque, [P341], essa entidade comparou a pressão do desmatamento em territórios indígenas no Pará também, para ver se realmente tinha uma grande adicionalidade no nosso negócio. E uma área que eles ficaram abismados da quantidade de desmatamento interno recentemente foi o xicrinho do cateté.
    E teve um desmatamento bem grande, né [P609]? Até na reunião lá com a menina da Funai, ela deu lá justificativa, né? [P862] sei se foi um incêndio misturado com alguma outra coisa lá. incêndio roça abaixo. [P809] é, isso daí deu uma adicionalidade para os Parakanã, que mostrou que nem governo nem ninguém consegue proteger, por exemplo, uma área gigante como os [P541] de ter um desmatamento daquele tamanho. [P715] ver como é que vai ser lá no futuro, se o projeto de carbono deles vai conseguir segurar isso.
    Ah, foi a [P285] que participou. [P809] é, estava viajando. [P780] [P542] a gente não quer mais. [P777] tirar ele. [P666] assim que envolve as últimas reuniões que ele conduziu. [P411]. [P607] é bem importante vocês participarem, ficarem bem atentos, [P609] e [P380] tomando conta da lista de presença, das fotos, que é o que a gente precisa, né? [P166] de que essas reuniões estão sendo feitas, que está sendo conversado com os indígenas e passado para ele todos esses assuntos, né?
    [P878] eles estão por dentro. E aí a nossa parte, acho que nessas reuniões é só essa, né, [P380]? É um apoio mesmo. Tá, mas elas saberem e os indígenas... [P864] de saber elas estão por dentro. Da roça por agora, a gente ganha tempo, [P609], para conversar sobre o agrônomo que você sugeriu, vou falar com o [P345].
    [P864] aí a APIS colocou no agrônomo e... Se a atividade é toda da IPES, eu vou conversar com o [P345], vou esperar ele voltar semana que vem. [P27], acho que não vai sair no dia quinze não. [P862] sei qual é o problema mecânico não. [P607] tá, é bom também que a gente ganhe tempo para criar aquele... o [P345] pediu para mim, para conversar com vocês, para a gente criar uma política. O que é essa política? É uma listinha com algumas normas sobre essas atividades de campo. Aí a gente definir algumas regras, algumas coisinhas aqui, dar uma olhada nas regras internas que a [P716] já tem.
    Me dá um exemplo aí, [P609]. De algumas regrinhas mesmo... [P167] sobre todas essas regrinhas que o financeiro acaba impondo e deixar isso numa política até para disponibilizar para a empresa também. [P466] assim, a gente, a [P639] Carbon tá tomando mais corpo, né? E aí todas essas políticas existem na [P639], mas ainda não existem na [P639] Carbon. [P607] a gente tem que ir adotando na [P639] Carbon também. [P717] mais claro, [P718]?
    [P607] assim, de pensar internamente, vamos dizer, parte mais administrativa da APES aí, e colocar isso de uma forma estruturada, e aí capta bem ao servidor aqui, a gente... Se está de acordo com aquela, vamos dizer, regra desse mais ou não, né? E a ideia é até a gente elaborar junto, [P347], para ter a participação de vocês, né? [P466] no final do dia, quem está aí no campo são vocês. [P607] acho que é legal a gente elaborar isso junto.
    [P790] falou comigo no [P286], depois gerou o arquivo. A gente pode implementar essas boas práticas. [P787] é precisar de alguma informação, é ter isso como embasamento. [P634] eu tô pensando aqui em outra coisa. A gente tem já data para a próxima ronda?
    [P470] em julho, não sei se vai acontecer. Se tiver mais para frente, talvez se for período para entrar de férias, a gente conversa. Ah, aí depende muito, [P342]. Por exemplo, é uma atividade que é da Apsis? É uma atividade que é a [P238] ou a IPEs que está, digamos assim, responsável? Eu penso, [P342], e aí você me conhece se eu estiver errado. Se é uma atividade que a Apsis está dando recurso, a Apsis que está responsável e a IPEs ou a [P238]...
    E é isso que às vezes realmente, como o [P379] falou, a gente pode estar tendo fragilidade nisso. [P466] a gente já tentou cobrar deles entregarem, não já, [P342]? Ao longo desse tempo todo a gente já tentou cobrar e eles não entregam. [P862] é isso que a gente tem assim já definido. [P776] têm umas responsabilidades, a gente sabe a responsabilidade, eles sabem.
    A gente já cobrou por muito tempo, a gente já conversou, a gente já deu várias chances e eles não entregam. E aí o que eu tenho... Já sabendo que eles não entregam, a gente conta com eles só pro mínimo e a gente nem se dá ao trabalho mais de ficar cobrando. [P466], por exemplo, eu enviei um e-mail tem quase três meses com uma coisa básica e até hoje a [P834] não me respondeu.
    [P607] eu nem conto mais, eu nem conto mais. E peso é a mesma coisa, eles vão lá no negócio da ronda, agora nem vão mais, estão dando pra trás, mas ali a gente pegando pra gente como responsabilidade nossa. [P347], se você me perguntar se essa é a melhor forma, eu não sei te falar, mas essa foi a forma que o [P345] e o LP decidiram.
    Até porque, de alguma forma, essa forma permite que a gente tenha maior controle sobre... [P776] não faziam, entre outros fatores, que não entendiam até onde a gente queria chegar. [P774] sumia, a gente tinha maior controle do resultado final. E aí fazendo essa política, esse documento com essa lista de regrinhas, é mais para a gente ter mais controle, para sair mais do nosso jeito.
    A gente só vai poder fazer isso quando tiver a plenitude do projeto rodando. Se a gente tivesse pessoal, tivesse carro e tivesse recurso para a gente fazer as atividades, a gente estava na mão deles? [P669] da gente já ter avançado bastante, a gente ainda está dependendo bastante deles.
    Bastante não, acho, sei lá, 30% deles. O que falta é mais gente, na verdade. [P862] muita gente, sei lá, duas pessoas a mais. Eu acho que com duas pessoas a mais isso fica 100% nosso. [P889] poucos, né? 
[P466], vamos pensar aqui, essa atividade da roça, né?
    essas nossas trocas são super importantes. [P168] o número, como a coisa que o [P719] falou lá daquela nota que a gente ganhou, né? [P543] lá foi uma coisa muito importante. Eu não sei se ele conseguiu transmitir isso para vocês, mas aquela nota A que a gente ganhou é uma nota muito importante para o projeto.
    [P617] a gente não validou, mas quando validar, a gente já tem uma avaliação externa. E essa avaliação externa deu uma nota muito alta para a gente. [P864] uma das coisas que durante esse processo elas pediram para a gente controlar é, por exemplo, o número de denúncias informais. [P466] o número de alertas de satélite a gente vê lá no SSPOP. [P634], o número de denúncias informais, que são aquelas denúncias que os indígenas fazem para vocês pelo celular, isso a gente não consegue controlar.
    A gente não controla ainda, né? A gente não mapeia. E aí ela pediu para a gente começar a controlar. E aí eu sei que a [P238] recebe também essas informações, né? [P544] essas ligações. [P890] [P366] recebe, [P782] [P469] recebe. E aí eu queria a ideia de vocês. [P787] que a gente pode pedir para IPs [P238], principalmente, informar para a gente...
    A gente precisa de um número no final do dia. A gente precisa assim, no mês de junho... A gente recebeu 30 ligações, 60 ligações. [P864] como que a gente vai contar isso? [P650] acham que a [P891] consegue fazer esse controle? Ou vocês acham que eles não vão conseguir ajudar a gente nisso?
    Para a gente botar isso na prática, você acha que a gente chama uma reunião? [P862] fazer uma reunião só pra isso. [P864], por exemplo, toda reunião de segunda-feira a gente perguntar: Ah, na semana passada preencheram algum questionário? [P412] alguma ligação? [P835] segunda tem um momento da reunião para perguntar.
    A gente tem coisa que começar a fazer pra ontem. A gente pode fechar a agenda uma hora e meia, e a gente respeita a agenda, né? Eu monto uma pauta, é bem objetivo, um tema por dia. A gente tem que falar de biodiversidade, [P892]. Eu tô sabendo que você tem uma pessoa aí pra indicar, o [P345] comentou comigo.
    A gente tem que falar de roça, a gente tem que falar de bioeconomia, a gente tem que falar de... A gente pode tanta coisa.
    [P607] eu vou combinar aqui com o [P348] sobre os temas dessas reuniões. é esse da política, é urgente, o da biodiversidade, é importante, aí você pode anotar em biodiversidade mais outros indicadores do PD. A gente fica falando de ronda e ronda. [P864] o nosso projeto, que é o PD, ele tem diversos outros indicadores.
    E pensar. [P607] tá, pessoal. [P720] eu ir embora, que eu estou presencial até chegar na minha casa, atravessar a ponte vai demorar ainda. E a gente se fala semana que vem, eu vou organizar com o [P348] essas reuniões e a gente marca. [P169], o LP confirmou que segunda-feira, 11 horas, ele pode.
    Pergunta assim, qual é a pauta dessa reunião das onze? Aí a gente passa pra vocês.[P607] valeu pessoal, beijo.
Anotações - Reunião de alinhamento interno e entrevista com agrônomo
- Reunião com 12 caciques do grupo de cima na [P75]
- LP também já falou com [P467] para fazer reunião no GB
- Reunião dia 4 e reunião do [P467] a ser marcado.
- Peças do carro do [P341] ainda não chegaram completamente.
- Reunião com caciques são prioridades e [P483] estará disponível apenas no dia 15.
- [P34] de entender necessidades do [P467] para repassar informações para comunidade.
- Oseas
- Zé carlos
- [P341]
- [P342]
- [P341]:
- Liberação dos recursos
- Reunião terç 16h30
- Segunda feira 11h - verificar com LP. LP pode.
- [P801] pediu para tirar wilson
- Importante saber quem está pagando os agronomos - a principios IPES.
- Denuncias'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:38fee8ba-950e-8097-af75-dc2830ee46c3')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:2efee8ba-950e-806d-9b4e-e822f0e43201')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Tabela - To dos (histórico)
  ## Ata da semana:
  - Reunião com empresa do PBA feita
    - [P441] 2 linhas de trabalho:
      - [P42](precificação e venda) e [P47] de açaí, castanha.
      - [P236] levantada: compartilhamento de informações entre o que já fizemos e os que estão fazendo.
      - [P236]: termo de cooperação técnica.
      - Só estão incluídas 16 aldeias no escopo de serviços deles.
      - [P341] agendará reunião online no início de fevereiro para organizar a cooperação técnica.
      - O compartilhamento de informações será apenas após o termo. [P893]. [P894].
  - Ronda - Fevereiro
    - Pontos definidos conforme histórico.
    - [P795] em mostrar presença, não em verificar pontos de risco.
  - Ações a serem realizadas - IPES e INDEVA
    - [P795] em atividades a serem feitas internamente
    - [P172] para apoio à safra da castanha feito.
      - Já que estamos oferecendo combustível, podemos solicitar fotos da coletas ou mesmo número de latas como forma de controle.
      - Os orçamentos são para os dois grupos, entretanto há menos controle no grupo de baixo sobre quem colherá castanha. [P670] contato com as aldeias para determinar quais as aldeias colherão.
      - [P795] é não ter pressa para oferecer o recurso, mas perceber o compromisso deles com a coleta antes.
      - INDEVA fez contato com aldeias para saber quem colherá
        - [P617] não responderam. [P628] analisar caso a caso e esperar que se interessem e se comprometam na colheita.
      - IPES entrou em contato com compradores de castanha
        - [P638] alinhando condições para compra. [P413] enviado pelo [P806].
  - [P782] [P469] visitará aldeia xataopwa neste sábado.
  - [P413] com ICMBio feito para construção do PMIF'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:2efee8ba-950e-806d-9b4e-e822f0e43201')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:2e6ee8ba-950e-8076-b258-c9922436358d')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Ata da semana:
  - Modelo de governança já feito e detalhado pela Apsis Carbon.
    - [P778] enviado para avaliação do [P350] e [P467]. [P12] haverá discussão presencial na sede da Apsis.
    - [P495] será avaliado por [P651].
  - [P74] definir atividades a serem feitas/monitoradas enquanto não há venda dos créditos, mantendo-se os orçamentos fixos.
    - INDEVA - [P87] de campo são as mais caras. [P236]: [P349] focar em analisar as áreas de risco verificadas por satélite, como uma dupla checagem.
      - INDEVA pode contar com apoio do [P637] para análise desses pontos de risco.
      - Os mapas estão disponíveis na plataforma da NovaTerra. [P777]-se utilizar esses mapas para análise.
        - [P236] para estas análises: [P637] e Indeva utilizarem a plataforma da [P145] online para análise a distância.
        - Há necessidade de capacitação da equipe de campo no uso da plataforma online da NovaTerra.
      - INDEVA tem recebido mensagens dos indígenas sobre atividades de campo do INDEVA.
      - Na última expedição, na comunicação via rádio, perceberam pessoas operando na mesma frequência.
        - [P236] da INDEVA: implementar comunicação em código Q e alfabeto fonético internacional (OTAN) para padronizar comunicação entre as equipes de campo.
    - IPES - IPES montou cronograma de visitas institucionais para [P895]/[P880].
      - Inclui reunião com a SEDAP e IDEFLOR para verificar contribuições reais da SEDAP com o projeto.
      - É importante, por exemplo, entendermos o que eles precisam para continuidade das parcerias: tanto pendências nossas quanto deles.
      - Inclui também reunião com empresa que está elaborando o PDA da TI. ([P617] esta semana). A licitação da empresa está orçada em 12 mi.
        - O foco é manter relações com a empresa para monitoramento dos trabalhos que estão sendo realizados.
      - Safra de castanha
        - [P136] estão colhendo. IPES está em contato com compradores para fechar contrato de compra com a TI.
        - [P617] não foi possível fechar contrato com comprador único.
        - Preço atual da lata de castanha, com a casca= R$ 80 em Marabá, R$ 60 em [P73]. [P132] não aceitaram propostas de até 120 de produtores.
          - [P132] estão tentando compensar aumento de preços de bens que compram na cidade com aumento de preços pedido pela castanha.
          - Têm ocorrido vendas esporádicas nas aldeias, mas vendem pouca quantidade (~3 latas) apenas quando há necessidade. IPES consegue identificar quais aldeias tão colhendo castanha para nosso diagnóstico social.
  ## Tabela - [P1]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:2e6ee8ba-950e-8076-b258-c9922436358d')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:2c3ee8ba-950e-8071-abd0-d689dfc29d97')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Ata da semana:
  ## Tabela - To dos'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:2c3ee8ba-950e-8071-abd0-d689dfc29d97')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:2b7ee8ba-950e-80ae-bda2-ddca4b6d0ca2')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - COP
    - Governo focou no TFFF e não houve nenhuma declaração sobre projetos privados de carbono em TIs, mas não houve impedimentos no evento a empresas que fizeram projetos junto a indígenas.
    - Muita participação de novas certificadoras, que não estão incluídas no CCP ainda, sem ter validação de serem padrões idôneos.
  - IPES
    - [P83] focar nas informações necessárias para o segundo período de monitoramento, concluindo as informações pendentes atuais.
    - IPES possui lista de pendências a serem sanadas e poderá contar com apoio do [P609]/[P342].
  - [P87] em dezembro
    - Para dezembro, pode-se focar em planejar as atividades do ano que vem.
    - A principio, não haverá ronda completa em dezembro para o INDEVA.
    - [P641] mês, finaliza-se o recebimento dos valores da venda de créditos para os indígenas. LP já informou a diversos indígenas. Os compradores estão aguardando o registro do projeto para compra de créditos.
    - [P30] anual das atividades de 2026
      - [P778] iniciado pelas equipes locais e depois enviado para Apsis Rio.
      - Há necessidade se separar as atividades de campo e as atividades
      - IPES: continuidade das assistências técnicas às roças , visitas às aldeias, cooperações tecnicas e apoios nas safras de bioeconomia.
      - INDEVA: treinamentos, vigilâncias com maior participação indígena, PMIF
      - [P449] treinamentos de administrativos para as associações, etc.
  - Caçador sumiu temporariamente na TI recentemente,  oq ue ocasionou trânsito de pessoas armadas dentro da TI, a procura do homem até então desaparecido. [P132] relatam aproximadamente 40 pessoas que chegaram a estar na aldeia do [P414].
    - LP recomendou a caciques que registros dessas pessoas armadas sejam encaminhados à FUNAI e MPF.
    - No domingo, o caçador foi encontrado na TI após mobilização de pessoas de fora da TI.
    - [P250] que população tenha acreditado que os indígenas que tivessem causado do desaparecimento do invasor.
    - INDEVA e Equipe Apsis local planejaram se reunir com lideranças parakanã para confeccionar comunicações a FUNAI, MPF. É importante que demos esse apoio e suporte aos indígenas, para denúncias via associação.  A situação pode servir para nos aproximar com a Funai local ([P775]) e entender se algo foi feito por eles. [P775] está de férias.
      - [P870] reunião com a lideranças indígenas seria importante para analisar a situação atual da vigilância territorial, mas devido a falta de recursos e a pausa nas antecipações, a reunião poderia ser pouco produtiva.
      - A idéia é boa, mas há poucos recursos disponíveis para uma grande reunião. [P777]-se tentar outras formas de colaborarmos e construirmos o documento de denúncia sem muito uso de recursos.
      - [P787] forma de comunicação mais barata, pode ser feito como opção um [P415] de [P99]. [P71], em casos anteriores, a falta de evidência impediu o prosseguimento de denúncias. É necessário entender junto aos indígenas quais evidências possuem do ocorrido, informando que não há recursos para realizar uma reunião com todos, sem deixar de apoiar as denúncias.
      - [P641] caso, pode-se falar com o [P472] em Marabá, por exemplo, ou falar com  [P140] e caciques responsáveis pela vigilância. [P71], não se deve juntar os dois grupos na mesma reunião, para evitar atritos. Sr. [P366] acredita que pode-se focar no grupo de cima, onde ocorreu a invasão.
      - As reclamações dos Parakanã incluem queixas contra a própria demora da Funai em resolver problemas passados. Equipe Apsis local pode adiantar informações a serem comunicadas antes da reunião com indígenas.
      - A estrutura Parakanã não permitiria a reunião apenas com os líderes das associações. Por isso há o problema da necessidade de ter a participação de mais indígenas na reunião.
      - [P349] buscar nova aproximação com a coordenação da FUNAI de Marabá, marcando uma reunião na própria FUNAI, aproveitando também a participação de alguma liderança indígena. [P721] linha do tempo de todas as comunicações que já foram feitas com a FUNAI desde o início do projeto.
      - [P669] a relação FUNAI e [P136] não é bem alinhada. FUNAI não pagou até hoje os [P478] que participaram da expedições. Os indígenas nos procuraram para pedirmos esses recursos à FUNAI.
  - [P1]
    - Apsis Rio - [P252] viabilidade de reunião com indígenas com confecção de denúncia.
    - Apsis Marabá - [P100] informações prévias que podem ser incluídas na denúncia a ser feita.
    - ADLs e Apsis Marabá - [P170] do planejamento das atividades de 2026 durante o mês de dezembro.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:2b7ee8ba-950e-80ae-bda2-ddca4b6d0ca2')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:2bcee8ba-950e-80d5-89c9-fd246cf3c0c0')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Recursos e venda de créditos
    - [P787] não há mais recursos de adiantamento, o próximo gatilho de recebimento de recursos é o registro na Verra.
    - [P394] o registro também é benéfico ao evitar o deságio no preço do nosso crédito, o que prejudicaria os indígenas.
    - [P680], os recursos serão utilizados focando em emergências até o registro. [P243] de registro é em fevereiro.
    - Recursos fixos das ADL serão mantidos. [P545] da Apsis-Marabá serão avaliados caso a caso.
    - [P132] estão cobrando a Apsis e o discurso para eles deve ser transparente: temos que ter paciência e esperar até o registro
  - [P87] prioritárias futuras
    - Há diversas pendências deste ano e ano passado não concluídas, por diversos motivos. [P722] consideradas
    - Apsis Rio está criando controle das atividades prioritárias para o próximo ano, considerando os eixos do projeto. [P236] de implementarmos reuniões temáticas, por exemplo.
    - Apsis enviará por e-mail a lista de atividades nesta quarta.
  - [P87] e pendências- IPES
    - A realização de contatos com compradores da bioeconomia, contatos para parcerias, etc, muitas vezes não possuem evidências materiais. No entanto, podem ser feitos relatórios das ocorrências e também dos encaminhamentos feitos após os contatos realizados.
    - Safra da castanha já está iniciando. [P34] urgente de se levantar as quantidades colhidas por cada família.
    - Um comprador único seria importante para controle da produção. IPES está conversando com dois compradores para que seja definido um comprador único para toda a TI.
    - IPES já informou a caciques do grupo de que estão definindo o comprador único, iniciando-se a colheita, já que haverá um comprador.
    - [P106] da IPES por atividade: estão separados por mês no drive conjunto. Os dados podem ser colocados nas pastas do drive e preenchidas na planilha de pendências do drive conjunto.
    - Quinta feira- Reunião d
  - [P87] - INDEVA
    - [P795] em contato com os indígenas para que saibam que em dezembro não ocorrerão atividades, mas ocorrerão a partir de janeiro: expedições e também a reunião com lideranças sobre ameaças e denúncias.
    - Estamos negociando plataforma de monitoramento via satélite, a mesma da PF e MPF, para monitorar atividades e denúncias na TI. [P778] possível acompanhar toda a evolução das denúncias.
    - Até o início do uso da ferramenta, será mantido o apoio da NovaTerra e rondas.
    - Manejo integrado do fogo - Há de ser tratado nas atividades prioritárias. [P349], futuramente, ter participação de técnicos do [P416] em capacitação do tema.
  - [P367] solicitou apoio para criação de associação. Os indígenas já possuem o [P350] como advogado.
  - [P236]: nota de esclarecimento da Apsis sobre repasses.
    - Importante ressaltar que a safra de castanha é uma fonte de renda para as comunidades indígenas e que não devem deixar de exercer estas atividades, ressaltando que o assistencialismo não é sempre garantido.
  - [P775] já encaminhou denúncias sobre ocorrências próximas a aldeia do [P546] para PF.
    - Contatos com Funai devem ser formalizados, privilegiando o contato com [P287] já que não reconhecimento do projeto por [P242].
    - [P775] pode estar presente na reunião com caciques
  - Na quarta feira haverá reunião Apsis Marabá, IPES e INDEVA,  para planejamento das atividades para 2026.
  - Reunião com IPES e Apsis Marabá com sindicado de trabalhadores rurais de [P73], sobre projeto [P262] [P488], será amanhã.
  - [P1]
    - Apsis Rio informará à IPES/Apsis Marabá a lista de atividades prioritárias pra 2026.
    - Reunião nesta quinta feira, entre Apsis Rio e IPES, para tratar sobre  relatório de atividades.
    - Apsis Rio - [P807] de esclarecimento às associações sobre repasses financeiros
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:2bcee8ba-950e-80d5-89c9-fd246cf3c0c0')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:2a7ee8ba-950e-8090-a281-ec99de489267')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Expedições realizadas
    - Contaram com participação de 2 indígenas por grupo.
    - O planejamento foi alterado devido a pedido dos caciques
    - FUNAI não participou das expedições, mas patrocinou. [P349] buscar contato com [P775] e [P171] sobre o caso das invasões.
      - [P777]-se fazer um relatório formalizado dos fatos encontrados, incluindo a participação da FUNAI nas atividades.
      - Abertura da área ocorreu por volta de 26 a 28 de outubro. [P355] a [P48] e [P288].
    - Grupo de baixo
      - Identificadas ações de desmatamento por vizinhos, inclusive com avanço de 10 metros em um das áreas além do limite da área dele.
        - Sema já foi avisada e o proprietário provavelmente multado.
        - [P862] tinha o CAR
        - A propriedade tinha CAR do proprietário antigo e o georreferenciador do primeiro CAR também trabalhou no INCRA.  GEOTOP.
        - [P349] tentar contato com ele esse georreferenciador
        - Adquiriu a propriedade em 2017.
        - [P900] plantar [P723]
        - Apresentou comportamento não confrontoso e pode ser foco do [P262] [P488]. [P417] bem propício a aderir o projeto.
      - Na região do cacique [P836] foi verificado a mesma situação de desmatamento
        - [P132] orientados a  informar FUNAI e [P504], visando melhor identificação dos limites legais. Indigenas acreditam que proprietários tenham alterado os marcos.
        - Percebida a área, indígenas avisaram a outros de outras aldeias, que inclusive apareceram armados para prestar apoio.
    - Grupo de cima
      - Encontrada fazenda com área que invade a TI. [P862] tem cerca e o gado entra para a TI.
      - Encontrado arrastão com aproximadamente 20 áreas derrubadas.
        - [P132]([P785] e xeteria) ficaram nervosos com a situação e irão fazer reunião para entender se há [P478] envolvidos.
        - [P132] foram informados sobre os riscos caso estejam envolvidos.
        - Relatório será feito pelo INDEVA e entregue aos parceiros e associação. [P137] preparos para denúncia ao MPF e INDEVA.
        - [P367] informou ao [P342] que awaetés sabem quem fez o desmate e deixaram acontecer. [P10] há [P381] envolvidos acobertados.
        - [P783] denúncia siga na FUNAI, é necessário ter o apoio de uma liderança indígena e partir deles para protocolar denúncias.
        - O projeto não pode ser cúmplice da situação, que é um crime, mas deve alertar e formalizar. É necessário pressioná-los, sem  que nos tornemos os vilões. [P777]-se também fazer um informe à FUNAI sem formalizar denúncia.
        - Na mesma região, há também atividades de garimpo. Há aumento de ofertas ilegais aos awaetés, que até culpam a demora dos recursos dos créditos.
        - Há possibilidade também de repassarmos informações pra órgãos de inteligência da PF e IBAMA, buscando menor ligação ao projeto possível.
    - Necessitamos também controlar o fluxo dessas informações, para evitar conflitos entre os dois grupos/aldeias.
    - Relatório das expedições terão dados mais detalhados das área com retirada de madeira e sairão nesta semana.
    - Equipe de campo acredita que esses casos já estão acontecendo há um tempo.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:2a7ee8ba-950e-8090-a281-ec99de489267')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:292ee8ba-950e-8034-a1dc-c974ec37043d')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Participantes
  - [P79] de [P132] até a COP 30
    - Valores de ônibus ida e volta por volta de 24 mil com fornecedor que já transportou indígenas para a CLPI.
    - [P366] acompanhará os indígenas, por convite deles.
    - [P132] podem ser abordados quanto ao projeto de carbono. [P236] de disponibilizar material explicativo do projeto para eles.
    - Irão 20 indígenas e ônibus tem capacidade de 30 pessoas.
  - Visita de campo
    - IPES desenvolveu banner com principais pontos sobre conselho gestor.
    - Para as verificadoras, chamar o telefone de contato de “[P640] de denúncia”  ao invés de “[P640] de comunicação” é o ideal, mas pode haver problema com o entendimento indígena sobre o escopo das denúncias.
      - [P777]-se verificar com o indigenista qual a melhor forma de divulgar o canal de denúncia da forma ideal para os indígenas.
    - [P382] participará do fechamento na sexta feira. [P38] da [P474] está interessado em estabelecer um acordo de cooperação técnica para o projeto. [P382] tentará levar o coordenador na reunião de fechamento.
    - [P777]-se tentar contato com [P474] tbm durante a COP.
  - Expedição de novembro
    - Aquisições solicitadas já realizadas. [P671] apenas deve chegar em meados de novembro, devido às dificuldades logísticas.
    - [P777]-se obter botes/canoas também com SESAI/[P474].
  - Reunião com agrônomo - [P788]
    - [P617] não foi marcada.
    - [P368] irá marcar reunião de alinhamento com ele.
  - [P1]
    - [P366] - [P130] destino da hospedagem dos indígenas em Belém.
    - [P360] - [P475] banner desenvolvido pelo IPES para visita de campo com pontos do conselho gestor
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:292ee8ba-950e-8034-a1dc-c974ec37043d')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:2a7ee8ba-950e-8003-abae-e7d23b711061')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Viagem dos indígenas à COP
    - Motorista voltará para Marabá e depois para Belém, apenas para buscar os [P136].
  - Reunião Apsis - IPES ([P625] Flora)
    - [P547] avaliará a operação financeira da IPES na próxima fase.
    - Quarta feira (dia 12)- 14h - Reunião com [P547]/[P625] Flora
    - Reunião Apsis - IPES - Amanhã (dia 11) - 15h30, para alinhamento do orçamento e governança para [P625] Flora.
  - Aluguel da [P101]
    - [P777] ser comprada a pickup pelo valor residual ou renovar por uma pickup zero.
  - Repassado para o [P49] tudo o que foi feito quanto ao conselho gestor, incluindo minutas, estatutos, etc.
    - [P871] iria responder diretamente à Apsis quanto às minutas do conselho recebidas.
  - [P360] ficará ausente das atividades junto ao projeto até dezembro.
  - Próximas atividades
    - Recebido o planejamento do IPES pela Apsis das próximas atividades.
      - [P236] de 2 dias em campo de atividades  para cada grupo.
    - [P862] há certeza se as atividade completas das visitas/conselho gestor serão completadas totalmente este ano.
    - Inclui-se também as visitas com o agrônomo.
    - As atividades de conselho gestor e visitas podem ser tocadas em paralelo.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:2a7ee8ba-950e-8003-abae-e7d23b711061')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:28bee8ba-950e-8079-b524-c7ffcba29695')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA
## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Reunião com MPF
    - Reunião foi cancelada. [P418] entrar em contato futuramente, sobretudo após outubro e após COP. 20/11 como sugestão.
    - Preferência para marcarmos reunião presencial. Se esperarmos entrar em contato, demorará muito. [P470] seja necessário reunião em Belém.
  - Visita nas aldeias
    - [P728] do agrônomo e do indigenista é para diagnosticar demandas da comunidades, como um piloto. A ideia é avaliar se a presença deles será produtiva para próximas visitas.
      - [P49], em resumo:
        - Remediar/[P289] conversas relacionadas ao conselho gestor
        - [P31] da governança atual e propor melhorias.
      - Apsis e ADL, em resumo:
        - Registrar infraestrutura e condições gerais das aldeias. [P237] o que o projeto auxiliou e quais as necessidades das aldeias.
      - Agrônomo, em resumo:
        - [P237] situação das roças e compartilhar boas práticas;
    - [P766] de atualizar dados das condições das aldeias nos diversos eixos estratégicos do projeto, fazendo um diagnóstico situacional.
    - [P529] das informações podem ser obtidas por outros meios que não perguntas diretas aos indígenas. [P360], por exemplo, conseguiu um levantamento da SESAI com diversos dados populacionais da TI, inclusive com atualização do censo. [P837] foi obtido direto com funcionário da SESAI. [P838]. Parakanã dificulta obtenção desse tipo de informações.
    - [P172] total: R$ 9.760.
  - IPES submeteu novo projeto para CEF, voltado à mulheres e vulnerabilidades femininas, feito com base no anterior, mas focado no protagonismo feminino.
  - Monitoramento e vigilância participativa
    - [P146] - sugeriu 4 ou 5 awaeté para acompanhar expedições, para transportar suprimentos e material.
    - Koatinma - [P862] possuem canoa e sugeriu comprar canoa para atividades
    - Diária será 100 reais. 500 no todo por 5 dias.  [P146] sugeriu 150 ou 200. [P783] não aceitem, o monitoramento será apenas via satélite.
    - LP já informou [P367] e [P146] de que quanto maior o valor, menor o número de participantes, pois não há créditos de carbono emitidos ainda e os recursos são limitados. Ao contrário do caso do dadá, não fazem de forma voluntária.
    - [P146] já foi informado que não tem dinheiro. Já sabem que as expedições podem ser suspensas. [P864] os indígenas fazem pressão para que peçam recursos, mesmo que lideranças e até outros indígenas já tenham sido comunicados dos recursos limitados.
  - [P528]
    - [P528] INDEVA foram paralisadas. [P132] solicitaram não ter mais rondas sem a presença deles no território. [P71], outros indígenas (awyakinga) já reclamaram sobre não ter mais rondas: necessário conversar com principais lideranças para entender como serão as rondas futuras.
    - Nova Terra([P131]) continuará enviando os mapas.
    - [P349] focar que é um treinamento, com um grupo diferente de [P381], para evitar esse vínculo de remuneração.
  - [P132] irão para a COP a partir do dia 10/11. [P783] não seja possível fazer treinamento com os dois grupos antes da COP, é melhor fazer após a COP.  Após a COP tem o período de chuvas , então é ideal fazer com os dois grupos antes da COP.
  - [P1]
    - IPES - [P290] despesas eventuais([P548], etc) para [P342] incluir no [P172].
    - IPES - [P475] para Apsis os dados do projeto submetido para CEF.
    - [P342] - [P489] orçamentos de diária de 100 e diária de 150 para as rondas de vigilância territorial
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:28bee8ba-950e-8079-b524-c7ffcba29695')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:286ee8ba-950e-8002-b95a-e494ce2fede4')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - [P172]
  - [P156] do [P625] Flora
    - [P352] dia 07/10 pelo IPES.
  - [P158] do INDEVA no treinamento  territorial dos [P136] encerrada com sucesso
    - Bastante participação de jovens.
    - [P305] atividade que envolve com indígenas em áreas de maior risco: identificaram vestígios de atividades de invasores na Terra [P291], com produção de evidências.
    - Todas essas evidências serão colocadas nos relatórios e há de se entender quais vestígios se tornarão denúncias, através do protocolo de denúncias
    - Vestígios também de invasões para lazer em áreas da TI.
    - As atividades deverão
  - [P126] de visita de diagnóstico na TI
    image.png
    - Thales não deve conseguir ir, por ter indisponibilidade durante os dias de semana.
    - A visita na [P75] poderá contar com análise do agronômo na roça.
    - Muita informação pode ser obtida sem perguntar diretamente no questionário, para otimizar o tempo. É necessário entender o que pode ser tirado do questionário sem se perder a informação.
    - [P810] de obter os informações de estrutura, entender quais melhorias são dos recursos do programa Parakanã e quais são do nosso projeto.
    - [P622] do orçamento será para Apsis e parte para IPES.
    - [P786] viagem inicial é um ensaio das viagens que serão futuramente recorrentes nas aldeias. [P724] assistência futura será de viabilizar as decisões do conselho gestor.
    - Viagem 2 do cronograma no resto das aldeias ainda não deve ocorrer e será suspensa, sobretudo por motivo financeiro: serão pagas também a logística da COP para os indígenas. O foco inicial é nas aldeias mais problemáticas de governança, dando uma enxugada no total. Por isso, outras aldeias podem ser tiradas da lista.
    - [P175] raiz de conflitos é o não entendimento sobre o processo de tomada de decisões: alguns não acatam as decisões da maioria.  No entanto, esses da minoria podem impactar muito o andamento do projeto. É necessário entender, com MPF por exemplo,  o impacto que esses caciques podem causar no projeto.
    - [P559] a mudança no cronograma, os orçamentos iniciais deverão ser alterados.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:286ee8ba-950e-8002-b95a-e494ce2fede4')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:26fee8ba-950e-809a-a360-e975367757f2')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - E-mail de solicitação de reunião com a Funai já foi protocolado. [P472] levará em mãos para a FUNAI em [P242].
  - LP estará em Marabá a partir do dia 29.
    - [P785] solicitou presença de LP em sua aldeia. LP explicou que não poderia explicar as divergências entre os caciques quanto aos recursos, isso é de gestão interna dos caciques.
    - Alguns caciques demonstraram não querer estar nas reuniões do conselho gestor. É importante demonstrar que é importante a presença de todos eles em todas as reuniões para tomar as decisões do conselho.
    - LP pretende ir nas aldeias, sobretudo as consideradas problemáticas.
    - LP pretende levar também uma demonstração dos valores já distribuídos. A pretensão é aumentar a transparência para os indígenas, sem definir o que estaria certo ou errado nas decisões deles.
  - [P126] das atividades e visitas enviado pelo IPES não foi enviado com datas fixas, focando em ter flexibilidade das datas para coincidir com as datas de disponibilidade da comunidade. A sugestão inicial é iniciar no início de outubro.
    - Essas atividades poderão ser oportunidade também para atualização e coleta de dados sociais das aldeias.
    - IPES montou questionário social e encaminhará para Apsis. [P791] diagnóstico poderá ser um instrumento para medir o impacto dos recursos neste MR atual.
    - [P777]-se utilizar os programas de formulários georreferenciados ([P505]123) neste nova pesquisa social.
    - IPES tem acesso ao formulário da [P147] e fez uma mescla daqueles dados/questões com novos questionamentos.
    - IPES elaborou também uma apresentação bilíngue do conselho gestor.
  - Governança do [P253] gestor
    - Há necessidade de aprimorar a governança na tomada de decisões do conselho gestor: ser por maioria têm causado intrigas entre os indígenas. [P777]-se ser por unanimidades, etc.
  - Capacitação de vigilância e proteção territorial
    - Pessoal da universidade participou das atividades em campo, mas não pernoitaram em campo.
    - [P638] atualmente com 17 participantes.
    - Aluguel dos carros foi feito no nome do [P342] em razão da impossibilidade do uso da CNH de outros da equipe.
    - Recibo dos recursos poderá ser o modelo utilizado pelo JPF, com pagamento em dinheiro e recibo em nome da associação, com assinatura do [P478] que recebeu o valor.
  - [P762] de presença da segunda CLPI foi entregue ao [P651].
  - [P1]
    - [P341] - [P76] ofício enviado para a Funai para LP.
    - IPES - [P76] questionário social a ser executado nas aldeias.
    - Apsis - [P252] o cronograma da IPES e questionário social, indicando quais indicadores poderão ser incluídos.
    - Ipes - [P130] se possuem cópias disponíveis das atas da 2ª CLPI
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:26fee8ba-950e-809a-a360-e975367757f2')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:277ee8ba-950e-8046-998d-dc39ecdc6266')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - [P506] mandou mensagem para LP relatando ameaça de fazer denúncia contra o projeto no MPF.
    - LP acredita que [P506] não faria isso pois sofreria retaliação dos Parakanã.
    - [P785] já relatou que [P506] não quer voltar para a aldeia mesmo que fosse bem vindo.
    - Terengawa e itanaronga já relataram com [P342] insatisfação com o projeto e vontade de terminar o projeto. [P342] repassou os áudios para [P785], que travou esses 2 caciques, dizendo que não teriam autoridade sozinhos para vetar algo do projeto.
    - Terengawa também relatou com LP não querer ir para a reunião do conselho gestor.
  - LP se reuniu com [P549], ex presidente da FUNAI
    - [P549] relatou que esse problema na divisão dos recursos é cultural e comum.
    - Apesar do censo de comunidade no geral, é cultural que pensem antes em atender a própria família, com os excedentes destinados a comunidades.
    - [P549] recomendou não utilizar “briga” para descrever os conflitos indígenas. “briga”, para os Parakanã, é algo mais grave.
  - Drone e tablet já estão na Apsis e serão levados para Marabá pelo LP.
    - [P131] da NovaTerra estará em Belém. Na semana em que LP estiver em Marabá.
    - Apsis está tentando realizar uma instrução com o [P131] ou com outro contato que possa ministrar curso e emitir certificado.
  - [P58] de vigilância territorial com indígenas - INDEVA
    - Conseguiram identificar castanheira derrubas, comprovante que foram derrubadas fora da TI.
    - [P193]-se fazer o rastreio dos percursos das rondas, inclusive próprios indígenas conseguiram rastrear o percurso.
    - O aplicativo que mais se familiarizaram foi o wikiloc.
    - [P367] estava em contato com o [P775] durante as rondas, que perguntava sobre as condições dos locais.
    - Capacitação com grupo de baixo começará nessa sexta.
  - [P815] das ADL
    - Ipes já montou site.
    - Indeva ainda está montando o site, que será focado em toda a atuação do INDEVA e não só do projeto.
  - [P367] questionou se a ajuda de custo seria de mil reais. LP e [P342] esclareceram que não seria esse valor.
  - Grupo de cima: [P173] manter a divisão do valor por famílias.
  - Rithely esta atualizando, junto de [P472], a prestação de contas do grupo de cima.
    - [P529] famílias não possuem conta bancária e nem podem utilizar as contas do bolsa família.
  - [P1]
    - Apsis - [P479] reunião com IPES sobre proposta do [P625] Flora
    - IPES - [P76] link do agendamento da reunião com [P625] Flora. Amanhã 16h.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:277ee8ba-950e-8046-998d-dc39ecdc6266')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:261ee8ba-950e-8008-9bb9-f05c9effbbbb')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Ofícios da Funai e MPF ainda não foram enviados. O da Funai deve ser entregue no dia 10, aproximadamente.
  - Relatos de invasões têm sido constantes, e há consultoria contratada pelo DNIT para licenciamento ambiental que tem encontrado evidências fotográficas de extração de madeira e desmatamento.
    - DNIT está lidando diretamente com IBAMA e FUNAI sobre comunicações e denúncias, sem qualquer participação indígena ou consulta ao projetos em atividade do local no PDA.
    - O fato de não haver consulta indígena ou aos projetos pode ser abordada em reunião com a FUNAI em [P242] ou localmente com o [P775].
    - Preocupação do [P342]: que atuação da FUNAI decorrente dessas denúncias do DNIT possa gerar ainda mais conflitos e tensão com os proprietários locais.
    - Há necessidade do projeto estreitar laço com a atividade dessa consultoria. [P349] tentar contato com DNIT para podermos acompanhar as atividades dessa consultoria contratada.
    - [P638] com escritório localizado em [P73]. [P349] tentar contato, incluindo com as participação indígena ([P472] e [P174])
  - Sábado houve reunião entre INDEVA e professora da UEPA ([P550]) a respeito do termo de cooperação.
    - [P743] uma reunião inicial na UEPA, em que houve a demanda por uma nova apresentação após a volta do recesso universitário, mas a UEPA entrou em greve e o processo para o termo de cooperação está pausado.
    - A professora relatou com o INDEVA que houve um professor crítico ao projeto durante discussão do termo de cooperação, criticando a participação de empresas em território indígena. [P341] acredita que este caso não é um risco à cooperação com a INDEVA.
    - Após o fim da greve, há previsão de ser feita uma nova apresentação do projeto para professores universitários. [P786] apresentação é importante para quebrar preconceitos com os projetos de carbono.
    - Quanto aos preconceitos com os projetos de carbono, LP tentou contato com [P775] [P354] [P551], que demonstrou não aprovar projetos de carbono em terras indígenas e não estar aberto para ser apresentado ao projeto.
  - Reunião com [P50] de Novo Repartimento
    - Amanhã haverá um reunião de IPES+ [P342] com as secretarias de agricultura e educação de Novo Repartimento.
  - Orçamentos do conselho gestor e divisão dos recursos
    - Apsis necessita definir critério das distribuição futura dos recursos por grupo/aldeia, a depender também da definição do conselho gestor, tendo em vista a dificuldade em planejamento dos Parakanã. [P350] relatou dificuldade dos indígenas em definir projetos prioritários para divisão dos recursos, inclusive com sugestão de arrendamento de área da TI.
    - O exemplo dos recursos gastos com placas solares enquanto a energia elétrica passa a chegar nas aldeias é um desperdício de recursos e pode ser um exemplo da importância do planejamento prévio dos recursos e a sinergia entre os projetos/planejamentos. [P780] caso é importante também para alinharmos com o DNIT e a consultoria sobre os planejamentos do DNIT, já que pode haver duplicidade(desperdício) entre os planejamentos do DNIT e os recursos do projeto.
    - Hetá alegou com [P342] uma certa confusão e repulsa em relação ao funcionamento do conselho, inclusive com postura de ameaça. [P342] fez uma sensibilização e LP também solicitou ao [P350] que fizesse outra sensibilização sobre o tema. É importante que saibam que todos os problemas tem que ser resolvidos no conselho, já que a divisão dos indigenas pode causar o fim do projeto e intervenção pública.
  - Equipamentos para rondas INDEVA já foram solicitados pela Apsis.
  - LP vê a necessidade de que os treinamentos e instruções sejam feitos mais em visitas de campo do que em salas de aula. Os Parakanã possuem dificuldade de assimilar as atividades quando não envolvem prática, tendendo a aprender melhor por tentativa e erro.
  - [P1]
    - Apsis e IPES - [P254] a minuta das regras/regimento do conselho gestor. A sugestão é apresentar a minuta na próxima reunião do conselho gestor.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:261ee8ba-950e-8008-9bb9-f05c9effbbbb')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:268ee8ba-950e-801c-8435-e7f8fae66d79')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - LP já solicitou ao advogados os relatórios e prestações de contas. [P631] cobrou o envio desses relatórios e segurou o pagamento até o envio dos relatórios. LP encaminhará os e-mails também para [P342] e [P341].
  - [P341] verificará com [P350] se é possível fazer um alinhamento (amanhã) com [P672]. LP também tentará contato com [P350].
  - LP estará em Marabá entre o dia 29/09 e 04/10.
    - [P622] do pessoal da INDEVA estará em campo com indígenas neste período.
    - LP deseja falar com o indígenas que estiverem disponíveis nessa data, sem necessidade enviar carros para os buscarem
  - [P106] de atividades
    - [P773] estabeleceu novo modelo para as ADL. As ADL estão ajustando os relatórios antigos ao novo modelo, que serão revisados pela Apsis.
    - As ADL estão atualizando em um Google Drive compartilhado todos estes documentos pendentes.
  - Reunião com prefeitura de Novo Repartimento
    - [P638] dispostos e participativos. [P236] do secretário de agricultura é trabalharmos as cadeias produtivas que já existem na TI. A prefeitura vê que é parte da responsabilidade dela, mas não tem braço e pessoal suficiente para executar atividades.
    - Prefeitura fará um levantamento de que as comunidades do município podem fornecer para a merenda escolar. [P175] barreira da prefeitura é estabelecer comunicação com vínculo com as aldeias. [P641] caso, podemos intermediar este contato entre a prefeitura e a comunidade.
  - Fornecimento cabeado de energia já está sendo implantada nas aldeias
    - [P137], indígenas já estão comprando geladeiras.
    - Comprou-se placas solares mesmo com o DNIT tendo conhecimento de que futuramente haveria fornecimento de energia.
    - Da mesma forma, o tempo de seca se aproxima, a demanda por poços artesianos aumentará, enquanto o DNIT poderá também furar poços no futuro, desperdiçando recursos do projeto.
  - Safra do Açaí já está em andamento, mas parceria com empresa compradora ainda não avançou.
    - Com o recebimento dos recursos do projeto, [P341] tem notado diminuição no interesse na coleta do [P839], mas essa diminuição não atinge todos: há algumas famílias menos favorecidas ainda colhendo Açaí.
    - [P669] com uma diminuição da colheita, [P342] ainda têm visto muitos indígenas colhendo açaí e outros produtos.
  - Caminhões recebidos no ano passado foram recolhidos pelo DNIT por estarem avariados.
  - [P1]
    - LP(Apsis) e Ipes marcarão um alinhamento entre [P672] e advogados das associações quanto ao conselho gestor. LP também enviará regras básicas para avaliação do IPES.
    - [P341](IPES) enviará esta semana a programação de visitas das aldeias. [P795] é registrar o entendimento sobre o modelo de governança entre os [P136].
    - [P341](IPES) enviar protocolo do ofício enviado para MPF.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:268ee8ba-950e-801c-8435-e7f8fae66d79')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:253ee8ba-950e-8048-b3bf-da0334b0ddec')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Orçamentos do INDEVA
    - Autorizados pelo LP.
    - Alguns equipamentos para INDEVA poderão ser enviados do Rio para Marabá ou comprados em Marabá([P292]).
    - Notebook poderão ser enviados da própria Apsis.
  - Drones
    - Drones inicialmente orçados R$6k e agora atingiram o valor de R$ 10k. No entanto, drones sugeridos pelo [P131] da [P145]([P620]) custariam R$ 5k. [P83] se verificar se os drones sugeridos pelo [P131] servirão.
    - [P236] do [P131] foi iniciar com um drone mais barato e depois evoluir para mais drone. O foco é ter maior quantidade.
  - PMIF
    - [P778] feito com a ajuda do ICMBio e aplicação dos formulários.
  - [P146], [P176] e [P367] gostariam de agendar reunião com LP. Um procurador esteve na aldeia, foi informado sobre o funcionamento das rondas e se animou com as rondas, aprovando-as.  Sr. [P366] tentou levantar com indígenas as informações sobre o procurador.
    - [P132] relatam que há muitas trilhas e há relatos de invasões na reserva. No entanto, não fornecem evidências ou demais registros. [P725] casos devem ser utilizados para reforçarmos a necessidade deles se capacitarem para realizar corretamente os registros e denúncias.
  - [P490], em Novo Repartimento, ao parar em um restaurante, foi questionado se trabalhava com o indígenas que estavam no carro, que foram xingados.
  - Para evitar e diminuir os riscos, essas rondas poderão ser feitas por dentro da TI, após capacitação dos indígenas para utilizarem os aplicativos de localização.
  - Responsabilidade
    - LP - [P130] com [P131] (novaterra) qual o modelo definitivo de drone a ser adquirido.
    - INDEVA -  [P244] informações do procurador que esteve na TI.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:253ee8ba-950e-8048-b3bf-da0334b0ddec')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:24cee8ba-950e-807e-83a9-ed6ed62e840f')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - [P625] Flora
    - Proposta enviada.
    - [P51]: [P419] o projeto e submeter a outros fundos.
  - Ronda territorial
    - [P99] verificada a 5km de uma aldeia. [P863] derrubada para estrada, fora da TI, mas bem no limite. [P870] estrada antiga e já aberta.
    - Por ser fora da TI, voltaram para a aldeia, com mais um pernoite, e orientaram [P785] e [P102].
    - [P642] georreferenciamento no momento e local da verificação.
    - Nos casos de ocorrências nos limites da TI, deve-se sempre verificar se os marcos de limite estão realmente na localização georreferenciada correta.
    - [P46]: comunicação durante ronda. [P71], os apps usados na ronda para marcar localização funcionam offline.
    - Wyama relatou barulho de motor, drone, lanternas para [P490]. [P490] orientou que fosse feita a verificação e localização do local para posterior verificação e denúncia.
  - [P598] [P507] de Governança e recebimento de recursos
    - Após capacitação, devemos já marcar reuniões do comitê.
    - LP recebeu mensagem de caciques do grupo de baixo. Caciques em discordância sobre uso dos recursos, inclusive com compra de carro sem concordância de todos os caciques.
      - [P291] relatou ao LP saber que o problema é de entendimento entre os [P478].
      - [P467] falou para LP que estava tudo em concordância.
    - Nesta situação, a ideia de ter conselho consultivo das ADL e Apsis se torna ainda mais importante. [P349] sugerir participar das próximas reuniões. [P774] foi explicado para eles, mas fazem as reuniões sem nos avisarem.
    - [P236] do [P341]: realizar 2 reuniões até o fim do ano do conselho gestor para o planejamento financeiro de 2026.
    - [P236] do LP: dividir planejamento e reuniões entre os recursos atuais e os futuros, que não são garantidos.
    - Quanto aos recursos de 2026, é importante deixar claro que os recursos dependem de diversos fatores, inclusive da FUNAI. Funai, por exemplo, alegou desconhecimento quanto ao projeto. Importante ressaltar que depende até mesmo deles manterem proximidade com FUNAI([P775]) e uso dos recursos conforme os planejamentos.
    - [P83] marcar reunião de avaliação com [P467] e indígenas do grupo de baixo quanto ao recursos recebidos. [P12] quando LP estiver no Pará.(To do)
    - [P617] não entendem que todos os recursos só podem ser depositados na associação nomeada inicialmente para o projeto.
  - Prestação de contas
    - Em outros modelos de governança, há contratados nas associações especificamente para burocracia com prestação de contas, etc.
    - No grupo de cima: IPES([P177]) auxilia na confecção das prestações, mas os indígenas que controlam quando enviar, etc. No grupo de baixo: [P467] monopoliza as informações financeiras e nunca solicitou apoio do IPES para a prestação de contas.
    - Prestação de abril já está feita. [P632] aprovação do [P350] e associação.
    - [P236] de alinhar com [P467] e [P350] antes de conversar com lideranças [P478] sobre prestação de contas. [P137] com conferência de extrato bancário junto ao LP na próxima visita.
  - Compra fidelizada de açaí
    - Possibilitará controle de indicadores de produção de bioeconomia
    - A compra será centralizada. [P51] há de se definir o instrumento para definição da divisão dos recursos da venda.
  - Sites
    - [P824] ADL já contratou uma empresa para confecção do site.
    - Deverão ser compartilhados com a Apsis antes de disponibilização na rede.
  - Visita de campo
    - [P243] da próxima ser entre 24-29/08. Com mapa de julho.
    - Solicitado ao [P620] que os pontos do mapa sejam indicados em tabela já com coordenadas e que os pontos sejam filtrados para evitar repetição e duplicidade de verificação sem necessidade.
    - Há uma divergência entre os mapas disponibilizados pelo [P131] e as coordenadas encontradas no [P491]. [P34] de reunião com [P131] para alinhar a melhor forma de encontrar as coordenadas.
  - [P1]
    - Apsis e Indeva - [P420] reunião com [P131]/[P620] para sugestão de melhorias no uso do [P505]123 e [P491].
    - IPES e INDEVA - [P629] dos rascunhos dos sites das ADL para Apsis antes de upload.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:24cee8ba-950e-807e-83a9-ed6ed62e840f')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:23eee8ba-950e-80c2-b693-e06ff71fad7a')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Ronda Mensal
    - Realizar rondas fora da TI com os [P132] é muito perigoso para os próprios indígenas. [P641] sentido, a participação dos Parakanã na vigilância deve ser dentro da TI, inserindo os [P132] no processo de vigilância em seu território.
    - [P132] estão ansiosos para participarem da vigilância após o treinamento. [P673] rondas não começarão agora por segurança dos indígenas. [P881] percebido, por exemplo, que as equipes foram filmadas por locais durante o trajeto fora da TI durante o treinamento com [P865]. [P792]-se iniciar aos poucos um planejamento estratégico para inclusão dos indígenas no monitoramento.
    - Ronda Mensal iniciará amanhã, com mapa de junho.
  - Treinamentos com [P865] e de Governança
    - LP: personalidade do cacique [P840] é diferente da etnia Parakanã. É importante filtrar o que poderá ser aplicado ao nosso projeto.
    - [P418] aproveitar a proximidade com os cursos para incluir os Parakanã cada vez mais na governança do projeto e também no monitoramento florestal, ao longo prazo.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA
## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:23eee8ba-950e-80c2-b693-e06ff71fad7a')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:222ee8ba-950e-803e-a9f5-fae140eb4dea')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Participantes
  - [P625] Flora
    - Limite para apresentar proposta: 1/Agosto. [P178] em setembro e resultado em outubro.
    - [P776] uxiliam na elaboração das propostas, de forma participativa. [P776] são abertos quanto a confecção das propostas.
    - Solicitação de recursos deve ser pelo IPES. [P862] pode ocorrer pela Apsis pois a Apsis possui fins lucrativos enão poderia rceber este recurso a fundo perdido.
  - Curso de governança - 13 a 20/07.
    - [P360] se reuniu com [P368] e [P611] na última semana para alinhar os indicadores necessários para os relatórios mensais e para uso nas instruções do curso de governança. [P368] definiu com [P342] os principais indicadores a serem monitorados este ano, que serão utilizados para monitoramento do projeto e instrução para os indígenas.
    - [P483] auxiliará LP com a parte de contabilidade nas instruções. Atenção aos balanços das associações.
    - Os materiais(preferencialmente) bilingues das capacitações podem ser enviados por meio virtual ou disponibilizadas cópias para as associações.
  - [P87] da segunda safra
    - [P613] para todas as atividades é do fim do ano.
    - O monitoramento da safra de açai é uma importante atividade a ser iniciada. [P52] já pressionaram para entender as quantidades mas não tinhamos dados.
    - Quanto ao açai, IPES entrou em contato com compradores que estão com disponibilidade para comprar o que conseguir, por ser uma indústria em ascensão. [P369], possuem flexibilidade dos negócios.
    - [P617] não temos quantidades para informar aos compradores qual quantidade temos disponíveis. É necessário acordar um preço(bom o suficiente para que nenhum atravessador bata) com um comprador para o qual toda a produção seja direcionada. [P791] monitoramento da quantidade da produção foi um dos indicadores comprometidos com a Verra que ainda não temos nenhuma informação.
    - Com o recebimento dos indicadores pela IPES, pode-se planejar melhor as atividades. [P617] não se tem monitoramento estruturado de informações de resíduos, meio ambiente e saúde, por exemplo. [P673] atividades de conscientização podem ser feitas juntas das rondas realizadas pelo INDEVA e deverão ser o foco até o fim do ano após as capacitações dos próximos meses.
  - [P1]
    - LP passar minuta da proposta do [P625] Flora já com comentários do [P103] [P726] para [P342]/ADL
    - Apsis enviar para IPES os principais indicadores a serem monitorados pelo projeto.
    - [P366] informar qual o intervalo em agosto e em setembro em que os indígenas terão folga e estarão disponíveis para o treinamento do [P865].
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:222ee8ba-950e-803e-a9f5-fae140eb4dea')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:21bee8ba-950e-806d-95d7-ce78d6ec7025')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - [P528]
    - [P172] das rondas deste mês já estão aprovados.
    - [P722] feitas de 26 a 30/junho.
  - [P58] de governança
    - [P862] pôde ser antecipado.
    - [P236] de inicio no dia 13/07 até o dia 20/07.
  - [P58] do [P865]
    - Inicialmente: 20 a 27 de julho. [P34] de se verificar a postergação do treinamento com [P865], pois o início no dia 20 emendaria com os treinamentos de governança.
    - [P34] de participação de jovens que participarão da vigilância territorial além dos caciques.
  - Visita da [P631]
    - Gostaram muito do que viram, mas sentiram falta de evidências no grupo de cima.
    - Modo de uso dos recursos pelo grupo de baixo melhora a percepção de melhoria pelo projeto. É importante mostrar para os caciques que as melhoras das aldeias serão legados deles.
    - [P396] a visita, houve uma dúvida se uma placa solar era dos nossos recursos ou do ProPkn. Para evitar esse tipo de confusão, os equipamentos comprados pelos projetos para as associações deverão ser etiquetados e catalogados para serem inseridos no balanço patrimonial das associações.
  - Utilização dos recursos antecipados
    - Indigenas possuem dúvidas sobre o recebimento em dólar. [P350] irá explicar em reunião sobre câmbio da moeda para [P552]
  - [P1]
    - INDEVA: montar lista de participação do treinamento do [P865].
    - INDEVA: [P263] datas possíveis de participação dos indigenas no treinamento.
    - APSIS: [P130] novas datas possíveis para treinamento com [P865] em agosto.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:21bee8ba-950e-806d-95d7-ce78d6ec7025')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:206ee8ba-950e-80fb-a033-cb37c35c87d0')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - [P342] já enviou valores a do INDEVA para [P344]([P77] -Apsis). [P69] resposta.
  - Áreas do Pimentel Barbosa parecem possuir muito incêndio dentro da TI, sendo uma característica comum de [P421] e [P553]. [P641] caso, o foco é o manejo do fogo, pois pode ser usado até mesmo a queima controlada para impedir grandes incêndios.
  - [P641] caso, para projetos em áreas de cerrado e savana, poderíamos procurar parceiros do ICMBio ou IBAMA para compreender o plano de manejo da Pimentel Barbosa.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:206ee8ba-950e-80fb-a033-cb37c35c87d0')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:214ee8ba-950e-8035-8f81-f89da41e2b8c')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Programação da visita de LP, [P345] e [P631]
    image.png
  image.png
  - [P743] feriado em [P73], que atrasou o recebimento dos recursos das associações.
  - Ronda na semana passada ocorreu com êxito.
  - [P483] enviou email para LP com correção na quantidade de pessoas dos orçamentos do IPES.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:214ee8ba-950e-8035-8f81-f89da41e2b8c')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:20dee8ba-950e-801e-83ec-fab3c643f31b')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Participantes
  - [P528] de monitoramento aconteceram com sucesso.
  - Visita dos [P104]
    - LP irá ao campo novamente na semana que vem junto com [P674], [P796] e [P492]
    - [P342] já montou planejamento das atividades.
    - Aldeias que serão visitadas já estão definidas: [P179], [P422](Baixo) e [P180](cima).
    - [P83] que se converse com [P472], [P785], [P367] e outras lideranças para explicar que a visita dos holandeses será muito rápida e que não haverá tempo de visitar todas as aldeias. [P776] poderão conversar com os holandeses em Marabá ou acompanharem a visita dos holandeses nas aldeias a serem visitadas.
    - É importante também explicar ao [P148] esta a necessidade da visita ser rápida pelos holandeses. [P105] pode querer participar também das visitas, pois há desentendimento entre [P140] e [P148].
    - [P175] preocupação dos caciques é quanto a chegada dos recursos. [P862] é possível ter certeza de que os recursos chegarão antes das visitas, o que seria o ideal.
    - É importante que as visitas sejam acompanhadas pelos presidentes das associações ([P472] e [P140]) . É uma oportunida para os holandeses saberem quem são os presidentes e também para evitar ciúmes entre os caciques.
    - [P641] caso, o número de carros pode não ser suficiente para todos dos projeto irem às aldeias. [P484] necessidade de diminuir o número de pessoas que irão com os carros. [P345] e LP revezarem por exemplo.
    - [P172] já foi feito pelo [P342] e aprovado pelo [P345].
  - [P625] Flora
    - LP visitará a gestora do [P625] Flora.
    - [P83] pensar em parcerias possíveis com o [P625] Flora: [P341] sugeriu projeto de recuperação de área degradada no entorno.
    - [P625] Flora não abarcou [P73], que é onde temos mais demanda por reflorestamento.
    - LP poderá, na reunião, verificar a possibilidade de inclusão de [P73]. [P369], Marabá foi abarcada pelo fundo e é a sede das ADL. [P470] o projeto seja beneficiado considerando a sede do IPES/INDEVA.
    - LP entrará em contato com contato do EMATER para possibilitar reunião, buscando orientação sobre possibilidades de projeto de reflorestamento.
    - [P341] entrará em contato com [P554], do IDEFLOR, para verificar possibilidades  de projetos de reflorestamento que possamos fazer.
  - Parceria com UEPA
    - Após visita de campo dos técnicos da UEPA, poderá se entender o escopo de apoio da universidade e as esponsabilidades do IPES e INDEVA.
  - Orçamementos das capacitações do [P253] [P507]
    - [P341] já enviou planejamento para LP.
  - [P1]:
    - LP entrar em contato com EMATER.
    - [P341] entrar em contato com IDEFLOR.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:20dee8ba-950e-801e-83ec-fab3c643f31b')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1ffee8ba-950e-8012-9296-ca7c8f30fe29')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Lourenço está traduzindo contratos da DOERS para enviar para IPES. [P792] seguir hoje para serem validados e assinados.
  - LP analisará orçamento das capacitações do [P865] recebidos do INDEVA, analisará também a minuta do contrato do INDEVA com a UEPA.
  Contratos com universidade
  - [P722] feitos 2 contratos separados com a univeridade, um para cad ADL. O contrato já foca nas atividades do INDEVA e a deve-se criar um voltado para as atividades do IPES. [P369], sugere-se  que o pessoal da universidade conheça pessoalmente a TI antes da assinatura dos contratos.
  - Contrapartida das ADL para a universidade é, a principio, na parte logística.
  - [P83] também analisar sobre direitos das produções ciêntificas realizadas nos termos dos contratos.
  Ronda mensal
  - [P172] da ronda foi enviada pelo INDEVA, mas o arquivo não foi recebido pela APSIS.
  - A ronda, que estava programada para amanhã(27), deverá ser adiada para a próxima semana.
  Orçamentos
  - Apesar dos orçamentos serem anuais, é feita uma análise individual de cada atividade. Por isso é importante que o orçamento das atividades sejam encaminhados previamente para a Apsis antecipadamente. Os recursos são limitados e estão sendo adiantado pela Apsis, logo terão que ser priorizados e planejados preliminearmente no decorre do projeto, até a venda dos créditos.
  [P322] [P727] [P555]
  - IPES participou de seminário da fundação. Um dos focos da fundação é a recomposição florestal(e formação de cinturões ecológicos) e há alta demanda por sementes. [P870] sugestão para o futuro é a parceria com o projeto Parakanã na colheita de sementes.
  - [P1]
    - INDEVA enviar minuta do contrato para IPES.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1ffee8ba-950e-8012-9296-ca7c8f30fe29')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1faee8ba-950e-80e9-893a-d55c644c49e4')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Opinião IPES
    - O foco é ter uma conta corrente separada com controle separado das associações e, para os recursos dessa conta corrente, estabelecer os conselhos sugeridos.  [P71], o objetivo não é ter uma personalidade jurídica separada como um fundo real.
    - O estabelecimento dessa estrutura seria planejada a longo prazo, com o estabelecimento dos conselhos gestores, depois estabelece-se os responsáveis por cada eixo, etc. A venda antecipada dos créditos é um momento para testar essa estrutura.
    - É importante repassar esse planejamento para os advogados das associações em conjunto para que tirem dúvidas em conjunto.
    - Reunião com os advogados deve ser feita junto com a entrega dos contratos.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1faee8ba-950e-80e9-893a-d55c644c49e4')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1f8ee8ba-950e-802e-a8ae-f9d6658964a1')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  Treinamentos e parcerias com UEPA
    - Alguns poderão ser dados por antrópologos, inclusive o [P556] da [P147], mas IPES pretende focar em fazer uma formação continuada, inclusive com apoio da escola EFA.
    - [P236] do LP é realizar 2 contratos separados com a UEPA. Um para monitoramento florestal e biodiversidade, outro para apoio em gestão do projeto, agricultura e bioeconomia, nos temas que são de interesse do IPES. Ou seja, UEPA apoiaria IPES e INDEVA em suas atribuições próprias.
    - A separação poderá permitir negociações e contrapartidas diferentes com cada ADL.
    - As equipes da UEPA já estarão separadas entre os temas de biodiversidade e de bioeconomia, então a separação contratual faz sentido dentro deste modelo de separação.
    Visita do [P796] e [P492]
    - [P796] e [P492] estarão no Brasil entre o dia 15 e 20/06. [P423] em Marabá por alguns dias.
    - [P776] querem ir nas aldeias, mas o ideal é não fazer dessa visita um evento com grande alarde.
    - [P236] é visitar as aldeias que tenham estruturas pagas pelos holandeses. [P424], do grupo de cima, por exemplo, fez um roça coletiva e seria ideal de ser mostrada. [P83] também escolher outra aldeia do grupo de baixo que tenham comprado equipamentos coletivos(irrigação, roçadeiras, geradores, etc).
    - No entanto, caso os caciques se interessem, podem ir até Marabá caso queiram conversar com os holandeses.
    Formação de governança
      - Planejada para início de julho, mas é preciso sondar com índigenas as melhores datas, considerando que provavelmente estarão em período de férias ou fim de período do ensino técnico.
    Reunião IPES- APSIS
      - Amanhã(19/05) às 9h.
      - Assunto: programa de treinamento e capacitações.
    Capacitações com o [P865] estão confirmadas para início após 20 de julho.
    [P528] ocorrerão este mês após recebimento de recursos. [P53] para 20/05.
    Cursos - [P244] programa da formação técnica de agroecologia .
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1f8ee8ba-950e-802e-a8ae-f9d6658964a1')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1eaee8ba-950e-80a3-8d72-e44fc14eb274')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Formação do conselho gestor
    - Parecido com o que foi apresentado à [P675] [P149]: aulas de finanças, contabilidade, etc.
    - O foco é dar autonomia aos indígenas, com apoio do IPES.
    - Xikrins, por exemplo, possuem um conselho e a associação tem um assessor técnico para auxiliar com trabalhos administrativos. [P791] assessor seria alguém do IPES de início.
    - “[P625] [P841]” e conselhos de gestão de [P293] de [P54] podem ter ideias para serem aplicadas pelo projeto.
    - Ideal é coletarmos exemplos em outras associações índigenas.
    - [P87] e cursos devem iniciar no início de julho.
    - Os indígenas decidirão os membros do conselho. [P638] sendo conscientizados sobre necessidade de representação feminina e de jovens, além da Apsis.
    - Cursos devem ocorrer em [P73], por questões logísticas.
    - Dificuldades para a confecção dos relatórios das antecipações servirão como norte para capacitações, sobretudo sobre necessidade de valorização do dinheiro e ganho de responsabilidades no planejamento.
    - [P763] que os recursos são para a comunidade e árvores dos sonhos, inclusive que o foco não é cada aldeia, mas todo o grupo.
    - LP buscará contato com EMATER, sobretudo para destacar a necessidade de conscientização e controle do entorno.
  - Ronda de Monitoramento
    - Estradas em condições ruins, impossibilitando acesso a todos os pontos.
    - Todos os pontos verificados foram de fora da TI.
    - Emanuel, do ICMBio, quando for em Marabá, irá se reunir com Indeva para tratar sobre monitoramento. [P137], ele tem interesse de participar das rondas.
    - Registro de animais pequenos mortos na BR.
    - [P743] conversas com colonos, onde foi feita conscientização sobre a intenção e funcionamento de nossas rondas.
  - Buffer
    - Monitoramento nos 10km faz parte da metodologia e não pode ser alterada, pelo menos por satélite.
    - No entanto, a zona de gestão de atividades do leakeage pode ter diferentes tipos de monitoramento. [P236] é que podemos particionar o buffer e monitorar uma parte apenas por satélite, outra parte com equipes no solo, etc. [P349] criar diferentes zonas de gestão das atividades.
    - INDEVA concorda que restringir a zona de ronda presencial para 5km de buffer faz sentido e aprimoraria a eficiência do monitoramento.
    - É uma sugestão que pode ou não ser aprovada pelo VVB. Equipe de campo(INDEVA, IPES e [P342]) irá analisar essa sugestão.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1eaee8ba-950e-80a3-8d72-e44fc14eb274')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1f2ee8ba-950e-80f7-869b-cad56b53199b')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - [P528]
    - [P243] de se realizar rondas dos dados de março e abril neste mês. [P862] realizadas devido às atividades de auditoria e brigada de incêndio.
    - [P243] de muitos pontos de limpeza de pasto e muito uso de agrotóxico lançados por drone.
    - Importante localizar por GPS as fotos tiradas do desmatamento e agrotóxico.
    - INDEVA possui as informações dos pontos de maiores tensões e tipos de pressões sobre o território indigena.
    - Importante identificar onde entram madereiros, onde entram caçadores, etc. Para monitorarmos os caçadores e invasores, a ideia é montar futuramente um mapa de calor e identificar as áreas mais vulneráveis.
    - Essas informaçõoes podem ser incluídas nos relatórios que já são feitos mensalmente.
    - [P369], as informações de áreas vulneráveis também estarão no MIF.
    - [P490] tem utilizado [P365] para identificar algumas invasões.
    - Aliás, suma sugestão seria o uso de drone para monitorar aumento da fronteira da fazendas em direção à TI.
  - Parceria INDEVA-UEPA
    - Contrapartida da INDEVA será prover apoio logístico para as atividades.
    - [P236] de locação do carro sob posse do [P342] pelo INDEVA. Há de se analisar com o jurídico da Apsis.
    - O contrato da UEPA com a INDEVA servirá de comprovação que há engenheiros florestal auxiliando no projeto. INDEVA deverá encaminhar uma minuta desse contrato.
  - IPES
    - Apsis preparou estrutura de governança com base em outros caos e fundos.
    - Focado em implementação no longo prazo. [P607] Apsis vai elaborar algo mais simples, para o curto prazo, focado no conselho de caciques.
    - O foco é também em  montar um estrutura enxuta, para que sobre mais recursos para a comunidade.
    - [P34] de que o entendimento de comunidade seja mais plural entre os caciques, pois a centralização em cada aldeia gera custos desnecessários. É importante que eles percebam que quanto mais gastos para os conselhos e associações, menso gastos sobram para a comunidade.
    - Necessária a estruturação também dos regulamentos e regras para as tomadas das decisões nos conselhos.
    - A estrutura criada para o conselho indigena poderá também ser replicada para o ProPkn e DNIT.
    - [P236] também de implementar estrutura e cultura de planejamento orçamentário para os conselhos.
  - MPF
    - MPF expediu ofícios a respeito do projeto. [P617] não se sabe o conteúdo e destinatário, então é importante as associações, IPES e INDEVA estarem prontos para receberam e informarem à Apsis Carbon caso recebam alguma comunicação.
  - Contrato com [P631]
    - LP cobrou à [P631] o envio do contrato com o indígenas.
  - [P1]
    - INDEVA: desenvolvimento de mapeamento das áreas mais vulneráveis da TI e dos principais fatores de risco, semelhantemente ao MIF. [P810], de incluir os registros nos relatórios mensais que já são feito.
    - [P247] - Apsis: analizar a possibilidade de locação do carro sob posse do [P342] pelo INDEVA.
    - INDEVA: [P76] minuta do contrato com UEPA para Apsis.
    - IPES e INDEVA: informar à Apsis em caso de recebimento de ofício do MPF.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1f2ee8ba-950e-80f7-869b-cad56b53199b')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1d5ee8ba-950e-80e0-938b-f869c0431adc')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - [P58] da [P364]
    - [P861]: 21/04/2025
  - Solicitação de [P728] para dia dos povos indigenas
    - [P861]: dia 19/04/2025
    - [P132] devem se organizar para repartir o custo entre eles, a partir da repartição dos valores recebidos das antecipações.
  - Contratos e depósitos das ADL
    - IPES e INDEVA podem contactar Apsis Carbon para ajustes nos contratos.
    - Reunião com [P483], representando as duas ADL, 15/04/2025, para retirada de dúvidas.
    - [P861] ideal do depósito para as ADL é na quarta-feira, após assinatura dos contratos(16/04)
  - Ronda de monitoramento
    - Adiada para o fim do mês em decorrência do feriado da semana santa e festa indígena, além da necessidade de planejamento para o treinamento das brigadas.
  - Mapas de dúvidas
    - Todos os pontos do último mês foram fora da TI e na BR.
    - [P787] a ronda foi adiada, os potos da BR podem ser verificados na ocasião da viagem para o treinamento da brigada.
    - Para os pontos fora da TI, pode-se repetir os textos para pontos fora da TI utilizados anterioremente.
  - Reunião com auditoras
    - IDEFLOR e SEDAP estarão juntos na mesma reunião. [P425] será enviado após confirmação.
    - ICMBio em reunião separada.
  - A fazer:
    - Apsis([P345]): [P479] reunião com [P483] sobre contratos e enviar convites para ADLs.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1d5ee8ba-950e-80e0-938b-f869c0431adc')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1e3ee8ba-950e-8020-ace9-c100b0157510')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Pendências da auditoria
    - [P613] para resposta: 2 semanas
    - Reuniões anteriores
      - [P599] muitas listas de presenças de reuniões anteriores e “meios de comunicação” com os indigenas com o projeto
      - [P721] cartazes e fotos de reuniões que podem ser utilizados como evidência adicional.
      - Comunicações via whatsapp também podem ser utilizadas como evidência.
      - [P724] justificativa principal pode ser a recuso inicial dos indígenas em assinarem listas de presenças.
      - [P106] de monitoramento antigos não estão completos como os atuais.
    - Inventário - [P383]
      - [P383] está preparando resposta para os questionamentos iniciais.
    - Evidências
      - [P341] possui algumas evidências e fotos catalogadas. [P611] irá repassar quais as evidências precisam ser levantadas.
    - INDEVA
      - [P475] currículos e estatuto.
      - [P34] de criação de um site ou land page(custo menor).
      - INDEVA já levantou o preço para um site: em torno de R$ 1500, sem contar custo de domínio e hospedagem.
    - Reunião com Sindicato
      - [P341] têm tentado contato, mas eles estão organizando evento nesta semana, fora o feriado.
    - Buffer
      - O buffer de 10km é estabelecido pela Verra e não é equivalente à zona de amortecimento das TI/UC pelos orgãos legais. [P557] atividades se restringem ao monitoramente e conscientização, sem força legal.
      - [P74] monitorar o buffer pois o aumento de desmatamento nessa área pode afetar a geração de créditos, mas não temos nenhum poder legal sobre as atividades nesta área.
    - [P365]
      - [P396] instrução aos indigenas do uso do wikiloc, foi veriifcado que há pessoas fazendo trilhas dentro da TI, registrando as trilhas no [P365] e inclusive registrando espécies da TI.
    - Capacitação dos brigadistas
      - [P743] apenas uma desistência, por problemas de saúde.
    - A fazer
      - Apsis: [P244] custos para confecção de [P842] page das ADL e associações.
      - INDEVA: [P475] currículos e estatuto para Apsis
      - Apsis([P611]): [P244] evidências pendentes de atividades anteriores e verificar se IPES/INDEVA possui registros.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1e3ee8ba-950e-8020-ace9-c100b0157510')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1c3ee8ba-950e-80bd-ad9a-d264c3989b1c')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] [P815] [P635]
  ## Ata da semana:
  - Participantes
    - [P805] [P614] - Apsis
    - [P345] [P426]- Apsis
    - [P342] [P294]- Apsis
    - [P904] [P295]- Apsis
    - [P368] [P729]- Apsis
    - [P348] [P181]- Apsis
    - [P341] [P676] - IPES
    - [P360] [P676] - IPES
    - [P490] [P677] - INDEVA
    - [P469] [P730] - INDEVA
    - [P788] [P677] - INDEVA
  Visita de campo:
  - Grupo de cima
    - [P743] participação das mulheres e jovens
    - [P785] conseguiu deixar claro que era necessário apoiarem o projeto na auditoria
    - [P810] de tirar dúvidas especialmente das mulheres
    - [P23] do [P472] como tradutor e palestrante
  - Grupo de Baixo
    - Pouca participação das mulheres, apenas uma parakanã presente e mais outro, que professora indígena, mas não é Parakanã.
    - [P881] deixado claro que a aprovação do projeto depende deles é que qualquer reclamação com as auditoras pode acabar com o projeto.
  - Haytiga solicitou possibilidade de ser pago diretamente pela Apsis. [P360] [P427] informou sobre a impossibilidade de pagamentos direto da Apsis, sem passar pelas associações.
  - [P862] fomos aprovados pelo CEF, mas fomos elogiados e ficamos entre os 25 primeiros entre 400 projetos.
  - Verra deseja fazer contato com Funai, PF e MPF, dentro das verificações do protocolo da Verra.
  - [P881] protocolado convite pelo IPES para ProPkn e para FUNAI.
  - [P775](FUNAI) informou ao [P472] que não poderia participar da reunião na [P75], mas que mandaria representante. [P342] pediu a [P558] que reforçasse o convite para o [P775].
  - A auditoria concordou que a conversa com o MPF, PF e FUNAI-[P242] seja online. [P247] da Apsis fará esse convite.
  - O ideal é não envolver órgãos estaduais de meio ambiente(SEMAS) por questão política e também por conflito de interesses com programa jurisdicional.
  - STJ reafirma fim do regime de tutela e reforça que Funai não é garantidora universal de serviços em áreas indígenas.
  - Aldeia com melhor acesso é a [P75].
  - [P721] 2 carros garantidos, mas 1 dos que iam ser alugados não poderá mais ser alugado pois sofreu um acidente.
  - [P342] e [P490] não estarão junto da equipe na segunda feira.
  A ser feito:
  - [P341] enviará para [P345] as instruções e e-mail de cadastro do SEI, tendo em vista que o cadastro é necessário para protocolar documentos com órgãos públicos.
  - IPES e INDEVA deverão enviar o quanto antes os convites para ICMBio, [P428], EMATER, SESAI,DNIT, SEDAP e demais órgãos, endereçando para as pessoas que já tem contato com o projeto
  - DNIT: marcar reunião preliminar antes da reunião com auditoras
  - Apsis enviará minuta do contrato para IPES e INDEVA amanhã.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1c3ee8ba-950e-80bd-ad9a-d264c3989b1c')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1b9ee8ba-950e-8076-9dba-e34de1af9ade')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Ata da semana:
  [P172]:
  - [P172] das ADL já confeccionado, considerando custo fixo e atividades extras.
  - [P484] continuidade do depósito mensal para IPES e INDEVA em março.
  Auditoria
  - Importante: distribuição de cartazes sobre auditoria. [P182] citaram necessidade de evidências de comunicação sobre a auditoria.
  - Arte para apresentação na quinta-feira aos indígenas: caso enviem na terça-feira(18/03) pela manhã, Apsis tentará entregar a arte na quarta-feira.
  - Aluguel de carros de carros confirmado para a auditoria.
  - [P472] entregará ofício diretamente ao [P775] (ProPKn).
  - Sobre informação à FUNAI para atividades na TI, a princípio não é obrigatória, pois já temos contratos com os indígenas. [P843] comunicação tem o foco em situações de contato inicial nos territórios indígenas.
  - [P83] conscientizar [P801] e os outros indígenas sobre as reuniões com as auditoras não serem uma reunião para reclamações, mas sim sobre o que eles esperam do projeto e o que o projeto está evoluindo nesses 3 anos. A postura é de não cobrar, mas de falar as coisas boas.
  - [P778] servido apenas peixe e frango na auditoria.
  [P87] [P429]
  - [P675] solicitou reunião com projeto no dia 26/03. [P559] à proximidade com a auditoria, ADL não participarão pessoalmente da reunião.
  - Junto ao treinamento da brigada de incêndio e das equipes de monitoramento, planeja-se fazer um treinamento sobre resolução de conflitos para os indígenas que poderão lidar com fazendeiros, caçadores, etc.
  - Os vídeos feitos sobre o projeto poderão ser divulgados pelos próprios caciques após validação.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1b9ee8ba-950e-8076-9dba-e34de1af9ade')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1d2ee8ba-950e-8017-b4f5-c29805e87c1f')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Reunião com UEPA
    - Fizeram ata, lista de presença e fotos.
    - Reunião realizada com coordenadores dos cursos de [P896]. [P183] e [P150].
    - Desejam fazer visita de campo para iniciar cooperação técnica. [P430] para agendar para 1 quinzena de julho.
      - [P236] de visitarem IPES/INDEVA para conheceram processo de monitoramento e posteriormente conhecerem aldeias.
      - [P795] é entender a situação atual dos indígenas.
    - Oportunidade e parcerias sobretudo na parte de monitoramento, sobretudo por terem interesse na parte florestal e estudo das parcelas.
    - Possiblidade de Parakanã ser um local para possibilitar atividades práticas aos estudantes e também de produção científica.
  - [P172] das ADL
    - [P629] dos aditivos será feito até segunda-feira, após verificação com setor jurídico.
  - [P58] dos brigadistas
    - [P172] do treinamento dos brigadistas foi previamente aprovado pela LP.
    - Estes cursos terão futuramente alimentação e transporte custeados pelos próprios indigenas. [P778] pago pela Apsis por enquanto.
    - [P236]: [P678] de [P296] de 2026 já com estes valores sob responsabilidade dos indígenas.
    - [P455] de valores do treinamento:
    image.png
    - [P722] 5 dias de campo durante o curso, para 25 indigenas. [P4] R$ 2.600 por pessoa.
  - Antecipação
    - [P745] de antecipação do grupo de baixo bloqueado por enquanto, devido a pendências nas prestações de contas.
  - Venda e antecipação de créditos
    - Proposta da LATAM não deve avançar.
    - [P81] com [P631] avançada, com últimos ajustes da minuta do contrato de venda.
    - Pagamento de antecipação para as associações será mensal, como possibilidade de  teste da organização e governança dos indígenas.
    - Minuta do contrato de adiantamento tem que ser apresentado para a CEF e para o BB, visando liberação do recebimento de valores em dólar direto para as associações.
    - [P631] irá pagar mensalmente(para índigenas) em dólar diretamente para as associações, além de seguir a divisão definida dos recursos.
  - [P106] mensais
    - Fevereiro e março ainda estão pendentes.
    - Mapas de pontos das rondas se encontram atrasados. [P560] mapa disponível é o de fevereiro.
  - [P1]:
    - IPES: [P184] agendamento de visita técnica do equipe da UEPA ao projeto(1° [P297]/julho?)
    - Apsis([P345]): [P130] com setor jurídico(Apsis) a possibilidade de envio dos aditivos até 14/04/2025.
    - IPES: [P431] com as associações o contato com a [P675] [P149] e com o Banco do Brasil para possibilitar o recebimento de valores em dólar, da venda de créditos, para as associações.
    - Apsis: [P130] pendências para atualização dos pontos de dúvidas com equipe do [P620]([P131] [P508])
    - Apsis: [P130], em definitivo, o orçamento para o treinamento da brigada de incêndio.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1d2ee8ba-950e-8017-b4f5-c29805e87c1f')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1b2ee8ba-950e-8014-8ced-d8ff31c45723')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Importância de não haver abate de boi na ocasião da auditoria(auditora indiana)
  - No dia 22, é necessário consultar os indígenas se seria possível o pernoite das auditoras. [P71], provavelmente não haverá esta necessidade. O ideal seria que as auditoras, durante o dia, caminhassem pelas aldeias para fazer as perguntas necessárias.
  - LP separou o orçamento entre os custos fixos e os variáveis, bem como dividiu pelas atividades. [P432] também o orçamento em 2 safras, objetivando a disponibilidade dos recursos durante todo o ano.
  - [P350] ainda não respondeu LP.
  - Sem resposta da CEF ainda. [P341] cobrou no início do mês.
  - Grupo de baixo tem criado várias associações. É um alerta para governança do projeto, pois aumentam o custo burocrático, certificados, com impostos, contadores, etc.
  - [P342] fez contato hoje com [P383] para envio das coordenadas das parcelas de 6 aldeias. [P649] ser enviadas até amanhã 11/03.
  - [P862] haverá pagamento para tradutor, sendo “no improviso”, pois, se pagar para um, teremos que pagar para todos e inflará o orçamento.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1b2ee8ba-950e-8014-8ced-d8ff31c45723')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1a5ee8ba-950e-8069-8ca6-ee8c33032eb8')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [x] Auditoria
  ## Ata da semana:
  [P172] das ADL
  - Reuniões sobre orçamento anual:
    Quarta [P731](26/02) - 15h - IPES 
Quinta feira(27/02) - 15h - INDEVA
  Auditoria Verra
  - 31/03 a 04/04
  - [P722] 2 técnicos indianos e 2 brasileiros.
  - [P870] dupla focará em inventário com [P561] e outra na Comunidade
  - [P34] de haver comunicação à FUNAI sobre a realização da auditoria, partindo da Associação.
  - Documentação de saúde necessária para a FUNAI:
    Atestado [P562] de não moléstia infectocontagiosa: atestado médico declarando expressamente que não é portador de moléstia infectocontagiosa, com validade de 6 (seis) meses.
    Cópia da carteira de vacina com anotação contra febre amarela, [P732]-19 e contra H1N1/[P185].
  - [P87] do PBA - DNIT podem diminuir a adicionalidade do projeto de carbono, apesar da demorar no atendimento às solicitações dos indígenas pelo DNIT. [P783] o recurso deles seja utilizado para algum benefício da TI, não poderemos utilizar nossos recursos para o mesmo fim.
  - Vídeo do projeto: [P186] da Apsis Carbon irá reduzir o vídeo. Hoje já devem estar prontos(25/02).
  - Os convites/comunicados da auditoria serão emitidos pelas [P55]. ProPKn e Sindicato serão convidados.
  - Levar [P775] do [P298] para a aldeia durante a auditoria como estratégia.  [P871] é convidado por ser o coordenador do programa.
  - Levar impressos todos os convites e comunicações feitos com Funai, MPF, ProPkn na auditoria, para provar as comunicações.
  Informações da semana
  - Um outra empresa ofereceu projeto de carbono para a TI nesta semana, aparentemente uma empresa do [P187].  [P733] no grupo de cima e de baixo, mas os indígenas negaram. [P299] na TI sem qualquer aviso ou comunicação prévia.
  - INDEVA terá reunião com o instrutor do ICMBio para a [P364] de [P300] no sábado(01/03).
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1a5ee8ba-950e-8069-8ca6-ee8c33032eb8')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:19fee8ba-950e-8191-b2d8-ca0837ca19c4')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Os acessos para o aplicativo de monitoramento foram disponibilizadas durante a reunião:
  Login: usuario-campo
  Senha: [P897]@2025
  INDEVA
  - INDEVA iniciará seu planejamento em fevereiro. [P781], o primeiro trimestre de atividades abrangerá Fevereiro, Março e Abril. A cada trimestre serão reavaliadas as atividades e planejamento.
  - Os orçamentos para 2025  serão feitos com base nas atividades planejadas para 2025. A Apsis Carbon usará o planejamento trimestral do INDEVA para basear o orçamento anual. [P791] orçamento é feito do zero com base nas atividades planejadas, por isso é importante que se planeje o ano todo, elencando as atividades que poderão ser feitas.
  - INDEVA encaminhará o orçamento dos rádios e do treinamento de combate a incêndio.
  - Reunião com INDEVA na sexta-feira. LP mandará o convite.
  IPES
  - As atividades foram baseadas nas linhas estratégicas do plano de monitoramento, focando também na formação do conselho gestor antes da venda dos créditos.
  - A estimativa de orçamento será feita com base nas metas definidas por atividade/eixo estratégico.
  - O monitoramento de cadeias produtivas feito anteriormente não foi efetivo em diagnosticar a produção e comercialização., por isso será necessário um novo diagnóstico pelo IPES.
  - IPES enviará um estimativa de orçamento para APSIS.
  - Reunião com IPES na segunda feira. LP mandará o convite.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:19fee8ba-950e-8191-b2d8-ca0837ca19c4')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:19fee8ba-950e-815a-b392-e7163ea39c99')::uuid, r.id, '- Dashboard de campo será um separado.
- [P505]123 era utilizado em uma conta de desenvolvedor, que era utilizada pela NovaTerra para todos os clientes. A empresa mudou a forma de fornecimento e NovaTerra precisou mudar o serviço. [P634] foi feito um licenciamento comercial do software para o projeto, evitando tais problemas de descontinuidade.
- Os dados espacializados perdidos foram a partir de [P898]/24.
- Novo questionário terá que ser validado e um outro dashboard será feito com base nestes dados.
- [P34] de marcar reunião com pessoal de campo para tirar dúvidas e repassar o questionário.
- Atualização constante do mapa offline e repasse para equipe de transito. Antes de cada ronda eles baixarão os dados novos do mês.
- A previsão é que na terceira semana de fevereiro já tenha o mapa de janeiro. Relatório tem previsão para a mesma data.
Pendências
- [P762] suspensa dos nomes, com opção de "outro". [P74] passar para [P131] [P508] os nomes de quem ele registrará.
- Inclusão do tracker para rastrear ao vivo o trajeto de algum agente de campo. Com a starlink, podemos ter esses dados ao vivo.
- Inclusão do registro de animais. Apsis Carbon irá avaliar melhorias possíveis.
- Nova Terra fazer o envio do login e senha para acesso ao formulário no survey123 para Apsis Carbon.
- Reunião com o pessoal de campo para repassar as novas instruções e vídeos explicativos.
- [P342] enviar dados que possui do [P491].'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:19fee8ba-950e-815a-b392-e7163ea39c99')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:19fee8ba-950e-816d-b1a9-f9376941fca6')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
  ## Ata da semana:
  - [P58] da equipe de campo no novo aplicativo depende da disponibilidade do [P131], da Nova Terra. [P243] para ocorrer esta semana.
  - [P236] do LP: incluir o registro de outras evidências nesses relatórios. [P342] e [P368] já conversaram sobre a inclusão de indicadores de biodiversidade no aplicativo de monitoramento.
  - IPES sintetizou a lista de atividades em 3 principais: inicio do controle e organização das cadeia produtivas, a organização do conselho gestor(ter a organização para quando chegarem os recursos) e programa de educação ambiental(parceria com universidades, secretarias de meio ambiente, etc). A lista de atividades terá estimativa de prazos/datas para execução.
  - INDEVA participará junto ao IPES das articulações e atividades dentro dessa lista.
  - [P795] do programa de educação ambiental será dividido em 6 eixos. [P28] para Apsis provavelmente nesta semana ainda.
  - [P341] conversou com caciques: este ano não terá produção de castanha.
  - [P625] [P301] tem um plano para financiar o desenvolvimento dos planos e comitês de gestão. [P370] a organização desse comitê é o ponto inicial para acesso aos recursos. [P563] dar maior autonomia aos indígenas também.
  - Com o desenvolvimento e maturação do projeto, podemos iniciar uma estratégia de marketing com um material único  e adaptado para todos os envolvidos.
  - Fotos de adultos podem ser utilizadas, conforme o contrato/aditivo.
  - INDEVA enviará para a APSIS a lista de material requerido para o [P679] de [P141] para o treinamento da brigada de incêndio.  Após análise, verificar(Apsis e INDEVA) meios para compras do equipamento
  - INDEVA irá retomar conversas com ICMBio e IBAMA sobre treinamentos(fazer referência às solicitações passadas). Com a resposta do ICMBio e IBAMA, poderemos ter o treinamento sem necessidade da compra dos materiais solicitados pelos [P141]. [P668] vantagem do treinamento do ICMBio é o fornecimento de veículo, equipamento e salário temporário para a equipe.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:19fee8ba-950e-816d-b1a9-f9376941fca6')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:19fee8ba-950e-8167-a66b-f585fd34cd64')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [x] [P87] de IPES e INDEVA para 2025.
  ## Ata da semana:
  - Safra de castanha é até fevereiro. [P638] controlando apesar de estar muito pouco de produção(produção dá muito num ano e pouco no seguinte), mas precisa-se verificar por aldeia a produção. Caciques devem ter essa informação.
  - [P34] de marcar com [P564] sobre de que forma ela pode auxiliar na venda de açaí. Reunião marcada dia 29 às 9h.
  - Apesar das atividades se misturarem na prática, separou-se as atividades para melhorar organização. A separação das atividades foi de atividades da comunidade, governança e economia para IPES e atividades de floresta e monitoramento foram para INDEVA.
  - [P782] [P469]: temos resposta do IBAMA e MPF, que serão enviadas por e-mail. [P628] auxilia-los para responder os órgãos.
  IPES
  - [P22] de modelos de governança é prioridade alta para antes de 2026. [P680] como desenvolvimento das parcerias com faculdades.
  - [P668] prioridade é o registro dos itens comprados com os recursos antecipados. [P734] ou receber fotos para as reuniões mensais.
  - [P668] alta prioridade é controlarmos a produção de castanha e açaí. [P777] ser da forma que acharem melhor: whatsapp, pessoalmente, etc.
  - Demais prioridades estão conforme o e-mail enviado.
  - [P341]: [P735] e custo para atividades. [P78] parceria com universidades demanda custos e deslocamentos, além de execução de muitas atividades menores. LP: Para tal, é necessário planejar as atividades anteriormente, para também planejar as verbas, etc. É importante desmembrar essas atividades em atividades menores para planejar em etapas.
  - Todos os temas são relacionados e dependem um dos outros. A própria faculdade pode auxiliar nas capacitações, por exemplo. [P864] temos o ano para desenvolver e concluir essas atividades, o importante é montar as bases para maturar as atividades durante o ano. O modelo de governança, por exemplo, tem se desenvolvido nestes anos, apesar de não estar totalmente institucionalizado, conforme as associações têm ganhado autonomia.
  INDEVA
  - O protocolo de registro é importante para registrar o que já temos feito sobre as denúncias, sobretudo para uso da auditoria.
  - Brigadistas: importante focar nisso e entender se é viável. [P782] [P469] já esteve no [P679] de [P141]: eles enviaram a lista do que é necessário para o treinamento hoje (27/01).  [P188] de recursos, mas eles estão de prontidão para nos ajudarem.
  - Sobre monitoramento de pontos de dúvidas e rondas, pode ser alinhado conforme necessidade do INDEVA e Apsis Carbon. [P236] de reuniões para alinhar estes detalhes, inclusive o uso do aplicativo.
  - INDEVA já iniciou cotação para compra de rádios. [P34] imediata das ter estes aparelhos disponíveis tanto para IPES quanto para INDEVA.
  PARA PRÓXIMA SEMANA
  - O objetivo é abrir a planilha, enviada em anexo, e detalhar cada tarefa, dividindo-as em etapas menores e definindo como serão executadas. É importante avaliar se a divisão das responsabilidades está adequada, identificando ajustes, caso necessário. [P810] disso, será preciso identificar o que já pode ser iniciado, listar as necessidades de recursos para cada tarefa e, por fim, definir prazos para garantir a execução das atividades.
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:19fee8ba-950e-8167-a66b-f585fd34cd64')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:19fee8ba-950e-811b-8a96-cbb5f59a6988')::uuid, r.id, '- atendem a [P565] e regreen
- ZEG está fazendo projetos de REDD
- [P638] em [P433], mas estão espalhados pelo Brasil e mundo ([P736])
- [P119] chamada [P434], detecção e outros
- tecnologia de detecção instantanea, em tempo real
- ferramentas que ajudam na prevenção e
- pantera pro: inclui torres e câmeras para detecção de incendio
- satélite tem tempo de resposta de 2 a 3h, com câmeras que detectam no início, 2, 3 minutos
- clientes nas usinas de alcool e celulose
- tem a plataforma sistema web, app, e alertas por email
- para o pantera pro, precisa  ter uma antena, uma sala de monitores e computadores aonde é feita um sistema de controle e processamento em tempo real com o uso de AI
- eles cobram (mobilização) e também implementam o sistema, indicam a empresa que instala a torre, cobram manutenção e licença do software
- Central [P189] de [P566]: para a detecção in loco
- [P776] também fornecem a detecção satelital, 3h de delay
  - [P875] deteção de fogo e desmatamento
  - ainda não tem de biomassa / LIDAR, mas poderiam integrar para a plataforma dele
  - alertas por email, zap,
- Modelo de propagação de incêndio
- Alerta de desmatamento semanal, a partir de 0,1 ha
- ferramenta de emissão de CO2
- os módulos estão 0,15 por ha é o teto
- entregam pronto'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:19fee8ba-950e-811b-8a96-cbb5f59a6988')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:19fee8ba-950e-81c6-b261-da519d63fe1b')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [x] Leitura e [P371] dos [P106] de Monitoramento
  ## Ata da semana:
  - Melhorias [P190] nos relatórios:
  - [P449] a cópia dos ofícios enviados sobre ações de combate incêndio
  - [P449] mais fotos dos combates
  - Maior detalhamento dos ofícios feitos e enviados a órgãos
  - Maior detalhamento de valores monetários diversos(além das NF e prestação de contas)
  - Desenvolver medidas de análise da biodiversidade: incluir relatos de animais encontrados mortos na BR e TI, oficinas com [P478] para entender relatos e pressões identificadas, permitindo em tempo real uma análise de fauna além do inventário.
  - Inclusão de pequenos auxílios emergenciais nos relatórios: ajudas em transporte, etc.
  - Dificuldades relatadas pelos ADL:
  - [P132] não assinam listas de presenças, dificultando contagem em apresentações, além da dificuldade de escrita e alfabetização. Há dificuldade também de se aproximar e recrutar grupos como mulheres, por exemplo, necessitando convidar por meio de comida
  - [P151] de continuidade com os recursos do [P504]: [P844] cavado não tem energia para bomba, internet não tem quem pagar mensalidade, etc
  - O monitoramento não consegue adentrar toda a TI e nem pode atingir as propriedades no entorno, dificultando o monitoramento de desmatamento. [P360] relata que pode haver aumento de roçado em direção a TI'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:19fee8ba-950e-81c6-b261-da519d63fe1b')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:19fee8ba-950e-810a-b46c-db29c24444c2')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:19fee8ba-950e-810a-b46c-db29c24444c2')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:19fee8ba-950e-81e0-a8a3-f1b13a723b69')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:19fee8ba-950e-81e0-a8a3-f1b13a723b69')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:19fee8ba-950e-816f-ba3a-f4aa0562f9b2')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:19fee8ba-950e-816f-ba3a-f4aa0562f9b2')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:19fee8ba-950e-810e-ac03-cef797633540')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:19fee8ba-950e-810e-ac03-cef797633540')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:19fee8ba-950e-81e2-be20-dd314706f11e')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:19fee8ba-950e-81e2-be20-dd314706f11e')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:19fee8ba-950e-81d3-98ec-e018c967f05d')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:19fee8ba-950e-81d3-98ec-e018c967f05d')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1a4ee8ba-950e-81b7-82c8-dc9a289a5a01')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1a4ee8ba-950e-81b7-82c8-dc9a289a5a01')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:19fee8ba-950e-81d6-a804-c8a296c2d422')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:19fee8ba-950e-81d6-a804-c8a296c2d422')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1b2ee8ba-950e-8162-a6fc-e55f4e5b1fff')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1b2ee8ba-950e-8162-a6fc-e55f4e5b1fff')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1abee8ba-950e-81e2-9bd3-d40681d475ce')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1abee8ba-950e-81e2-9bd3-d40681d475ce')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1b9ee8ba-950e-81c4-b79a-dc31d232c983')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1b9ee8ba-950e-81c4-b79a-dc31d232c983')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1c0ee8ba-950e-8156-a3dc-e50086c0f0dc')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1c0ee8ba-950e-8156-a3dc-e50086c0f0dc')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1d5ee8ba-950e-8102-a546-ed4831f6e590')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1d5ee8ba-950e-8102-a546-ed4831f6e590')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1dcee8ba-950e-8128-86d8-ee61674e999a')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1dcee8ba-950e-8128-86d8-ee61674e999a')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1ceee8ba-950e-810a-b363-e974bb580dc3')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1ceee8ba-950e-810a-b363-e974bb580dc3')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1e3ee8ba-950e-8190-8419-c7b79dee1b1d')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1e3ee8ba-950e-8190-8419-c7b79dee1b1d')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1c7ee8ba-950e-8162-92a8-cbdcf58ebdf2')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1c7ee8ba-950e-8162-92a8-cbdcf58ebdf2')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1eaee8ba-950e-810d-9ba1-c36f758f0b2f')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1eaee8ba-950e-810d-9ba1-c36f758f0b2f')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1f2ee8ba-950e-8086-9c0f-c7ec15d020db')::uuid, r.id, '[P862] faz assessoria de imprensa, faz lobby com governo
mas tem contato com jornalistas, mas não é consultoria de assessoria de imprensa
construção de imagem e influência, atuou em COPs com comunicação do setor químico, apresentou em 2016 um posicionamento institucional de precificação do carbono
agenda de desburocratização do setor, trabalhou no governo de transição, para a ABIQUIM
premio marco maciel, ganhou o premio
entrou para o Banco mundial carbon pricing leasdership coalition, agora está meio parado, mas antes era atuante
latam era clinete, faz 5 anos de consultoria, sempre puxa para o tema de economia de baixo carbono; faz agenda para empresas nas COPs suzano, casa do seguro,
Seguro pro clima: ela defende esse seguro e deu ideia para fazer algo assim para as comuniades, por ex perda de crédito por eventos climáticos
  fazer a floresta amazonica em meta verso, para a cop do egito, fez fila, todo mundo queria assistir
  bancada do Pará, representante indígena, parlamentares fortes no crédito de carbono; senador quer apresentar um novo PL para
  ir na CNI para apresentar para todas as empresas sobre os projetos do JPF e créditos de carbono
  ela tem clinte para se aproximar de fundos de investimento, colocou ele falando em painéis da COP
  para a ANFAV atende a agenda COP 30, coloca a gente para falar em painéis, fazer eventos, etc.'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1f2ee8ba-950e-8086-9c0f-c7ec15d020db')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1f2ee8ba-950e-80a9-a856-dd35b0f5e480')::uuid, r.id, '- Participantes: [P865], [P674], [P342], [P796], [P805] [P614] e [P345]
- Ata:
  - [P871] ajuda no formato de comunicação com o MPF para fazer um relatório mensal que é enviado ao MPF, com as denúncias de invasão,
  - dá um curso de 3 dias e ensina eles a fazer a denúncia
  - outras equipes de vigilância possuem colaboração com o MPF, é diferente, e apresenta provas
  - trabalha com MPE, pq tem mais escritórios e as pessoas são do Pará, conhecem mais a região
  - Antes faz um diagnóstico da vizinhança?
  - Sobre o orçamento:
    - Uniforme para prevenção: faz diferença mas não precisa ser uniforme militar, mas geralmente é verde; com logo do território Parakanã (logo da associação?);
    - Drones: ele não tem sugestão
    - Câmeras com GPS: é mais precisa, pode cair no rio, é a prova d''água, e importante usar GPS, câmera GPS e celular com app
    - Outros equipamentos: mochila a prova d’água, placas solares, barraca de camping'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1f2ee8ba-950e-80a9-a856-dd35b0f5e480')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1f1ee8ba-950e-8152-bfbc-eb26f5053325')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1f1ee8ba-950e-8152-bfbc-eb26f5053325')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1f8ee8ba-950e-812a-8c49-d500e891add0')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1f8ee8ba-950e-812a-8c49-d500e891add0')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:1ffee8ba-950e-812e-91ed-ef89672d3399')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:1ffee8ba-950e-812e-91ed-ef89672d3399')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:206ee8ba-950e-81ea-8e54-df4e1e429c00')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:206ee8ba-950e-81ea-8e54-df4e1e429c00')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:20dee8ba-950e-812c-8e98-e108e1f4cb44')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:20dee8ba-950e-812c-8e98-e108e1f4cb44')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:214ee8ba-950e-8156-8eb4-e5c488d3b349')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:214ee8ba-950e-8156-8eb4-e5c488d3b349')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:21bee8ba-950e-813a-983d-f912d2c43faa')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:21bee8ba-950e-813a-983d-f912d2c43faa')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:2a7ee8ba-950e-8134-9be7-d59b20011824')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:2a7ee8ba-950e-8134-9be7-d59b20011824')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:2a0ee8ba-950e-816c-ae98-e448cc19b166')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:2a0ee8ba-950e-816c-ae98-e448cc19b166')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:299ee8ba-950e-8108-94e1-f235585662d3')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:299ee8ba-950e-8108-94e1-f235585662d3')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:292ee8ba-950e-81ca-ba72-eacb09715ca2')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:292ee8ba-950e-81ca-ba72-eacb09715ca2')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:284ee8ba-950e-81f7-8476-c74d66f107b2')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:284ee8ba-950e-81f7-8476-c74d66f107b2')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:27dee8ba-950e-81bc-8cec-f368da5a7151')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:27dee8ba-950e-81bc-8cec-f368da5a7151')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:28bee8ba-950e-81ab-af35-ec6a7e478dd0')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:28bee8ba-950e-81ab-af35-ec6a7e478dd0')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:299ee8ba-950e-801f-9a1f-fa51a130f43e')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Participantes
  - [P79] de [P132] até a COP 30
    - Valores de ônibus ida e volta por volta de 24 mil com fornecedor que já transportou indígenas para a CLPI.
    - [P366] acompanhará os indígenas, por convite deles.
    - [P132] podem ser abordados quanto ao projeto de carbono. [P236] de disponibilizar material explicativo do projeto para eles.
    - Irão 20 indígenas e ônibus tem capacidade de 30 pessoas.
  - Visita de campo
    - IPES desenvolveu banner com principais pontos sobre conselho gestor.
    - Para as verificadoras, chamar o telefone de contato de “[P640] de denúncia”  ao invés de “[P640] de comunicação” é o ideal, mas pode haver problema com o entendimento indígena sobre o escopo das denúncias.
      - [P777]-se verificar com o indigenista qual a melhor forma de divulgar o canal de denúncia da forma ideal para os indígenas.
    - [P382] participará do fechamento na sexta feira. [P38] da [P474] está interessado em estabelecer um acordo de cooperação técnica para o projeto. [P382] tentará levar o coordenador na reunião de fechamento.
    - [P777]-se tentar contato com [P474] tbm durante a COP.
  - Expedição de novembro
    - Aquisições solicitadas já realizadas. [P671] apenas deve chegar em meados de novembro, devido às dificuldades logísticas.
    - [P777]-se obter botes/canoas também com SESAI/[P474].
  - Reunião com agrônomo - [P788]
    - [P617] não foi marcada.
    - [P368] irá marcar reunião de alinhamento com ele.
  - [P1]
    - [P366] - [P130]  destino da hospedagem dos indígenas em Belém.
    - [P360] - [P475] banner desenvolvido pelo IPES para visita de campo com pontos do conselho gestor
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:299ee8ba-950e-801f-9a1f-fa51a130f43e')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:276ee8ba-950e-813c-bda3-ffc274ec4017')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:276ee8ba-950e-813c-bda3-ffc274ec4017')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:26fee8ba-950e-8182-b505-cfab95c84fea')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:26fee8ba-950e-8182-b505-cfab95c84fea')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:268ee8ba-950e-81cd-8476-f1ba604f058f')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:268ee8ba-950e-81cd-8476-f1ba604f058f')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:25aee8ba-950e-818b-8112-e000fa420786')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:25aee8ba-950e-818b-8112-e000fa420786')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:261ee8ba-950e-8105-851f-f6f68f1cdcdd')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:261ee8ba-950e-8105-851f-f6f68f1cdcdd')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:253ee8ba-950e-8169-978a-e16007de6a84')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:253ee8ba-950e-8169-978a-e16007de6a84')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:245ee8ba-950e-817a-89e2-cc12ec97115c')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:245ee8ba-950e-817a-89e2-cc12ec97115c')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:24cee8ba-950e-8157-b275-cb560837702a')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:24cee8ba-950e-8157-b275-cb560837702a')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:23eee8ba-950e-81ab-980c-ff508132e499')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:23eee8ba-950e-81ab-980c-ff508132e499')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:237ee8ba-950e-81a4-9ff8-fe08f11df1b5')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:237ee8ba-950e-81a4-9ff8-fe08f11df1b5')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:230ee8ba-950e-8122-a5ff-ff4b4f867eff')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:230ee8ba-950e-8122-a5ff-ff4b4f867eff')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:229ee8ba-950e-81f0-b033-e6b3513f5a23')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:229ee8ba-950e-81f0-b033-e6b3513f5a23')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:222ee8ba-950e-81bd-9d34-ee9da4822c5e')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:222ee8ba-950e-81bd-9d34-ee9da4822c5e')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:2bcee8ba-950e-8106-8d75-e0dc76cd4b2e')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:2bcee8ba-950e-8106-8d75-e0dc76cd4b2e')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:2b5ee8ba-950e-8131-b8c6-c62482e10dde')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:2b5ee8ba-950e-8131-b8c6-c62482e10dde')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:parakana:2aeee8ba-950e-8123-a59e-fd64e3ca52d9')::uuid, r.id, '## Participantes:
    > Apsis Carbon
    > Ipes
    > Indeva
  ## Pauta da semana:
  - [ ] Tópico 1
    - [ ] Subtópico 1
  - [ ] Tópico 2
    - [ ] Subtópico 2
  - [ ] Tópico 3
    - [ ] Subtópico 3
  ## Ata da semana:
  - Tópico 1
  - Tópico 2
  - Tópico 3
  ## Ata das semanas anteriores:
  - Reunião do dia DD/MM/AAAA
  - Reunião do dia DD/MM/AAAA'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:parakana:2aeee8ba-950e-8123-a59e-fd64e3ca52d9')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:89fee8ba-950e-833d-8858-81508c803c6f')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - E-mails da [P344] e [P232] recebidos.
      - GS: organizando [P630].
      - [P877] 20: dados.
  - [P67] de [P3] [CTA] e Inventário
    - Reunião interna: MV - preparação de estudo do SBTI para CTA.
      - Montagem de apresentação e CA
    - Reunião com [P606] (22 a 26) - [P356] [P67]
      - Requisitar informações de produção de 2025
      - [P155] material da [P67] com informações novas
    - Inventário enviado para editoração.
    - SBTI - Reunião na Quarta:
    - Reunião dia 7, 8 ou 9 para falar sobre SBTI com [P606].
      - [P155] dados de descarbonização com dados do novo inventário. - CA
      - Sexta feira - [P343] de
      - [P237] adequações pré adesão - custos no SBTI e custos internos.
  - [P465] [P9] de impacto [CTA]
  - [P155] [P84] [P35]
  - [P489] grupos focais
    - [P618] e [P485] enviarem para as pessoas
    - [P56] com grupos focais
  - CA conversou com [P621].
    - [P457] horários de entrevistas.
    - [P236]: respostas aos questionários antes das entrevistas, sem marcar entrevistas.
  - RAS 2025 [CTA]
    - Realizada entrevista com:
      - Daniel, [P362]
      - [P632] entrevista com [P606] e [P493]
        - [P606] - programas com produtores
    - Finalizada [P72] [P622] 1 - [P784] [P240]. [P352] para revisão de CA.
    - Deixar espaços para relatos de integrantes das empresas.
  - Emissão de CERS [J6 Energia]
    Prazos CDM
    - [P877] 30/06 - pedido de submissão de creditos
    - [P877] 30/09 - pagamento da taxa de administração
    - [P877] 15/11 - fazer mudanças na comunicação: focal point, PP
    - [P877] 31/12 - transicionar para CDM
    - [P862] deixam claro que tem prazo final para emissão dos créditos
  - Pendência na transição do projeto para o artigo 6.4.
    - GS - [P244] benchmarks e modelos para preenchimento de documentos pendentes para transição.
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS 2025 [Aquapolo]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Compromisso com o [P616] e [P471] Bezero
Resumo IA Notion ‣'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:89fee8ba-950e-833d-8858-81508c803c6f')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:38eee8ba-950e-80f6-8966-e4a03c3d51ae')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - E-mails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - Reunião interna: MV - preparação de estudo do SBTI para CTA.
      - Montagem de apresentação e CA
    - Reunião com [P606] (22 a 26) - [P356] [P67]
      - Requisitar informações de produção de 2025
      - [P155] material da [P67] com informações novas
    - SBTI
      - Reunião de discussão pendente.
      - Novo foco após desobrigação do IFRS.
        - [P83] entender necessidades de parceiros para contratação para prosseguimento do trabalho com CTA.
        - Quarta feira: 16h.
  - [P465] [P9] de impacto [CTA]
  - [P155] [P84] [P35]
  - [P489] grupos focais
    - [P618] e [P485] enviarem para as pessoas
    - [P56] com grupos focais
  - RAS 2025 [CTA]
    - Realizada entrevista com:
      - Daniel, [P362]
      - [P632] entrevista com [P606] e [P493]
        - [P606] - programas com produtores
    - Finalizada [P72] [P622] 1 - [P784] [P240]. [P352] para revisão de CA.
  - Emissão de CERS [J6 Energia]
    - [P881] para UNFCCC, já enviaram invoice para emissão do CERs
    - Acompanhamos até emissão dos créditos - aguardar
    - Pós: UNFCCC pode pedir revisão do PD
    Prazos CDM
    - [P877] 30/06 - pedido de submissão de creditos
    - [P877] 30/09 - pagamento da taxa de administração
    - [P877] 15/11 - fazer mudanças na comunicação: focal point, PP
    - [P877] 31/12 - transicionar para CDM
    - [P862] deixam claro que tem prazo final para emissão dos créditos
  - Pendência na transição do projeto para o artigo 6.4.
    - [P236] de consultoria por horas nesta transição.
    - Fluxograma: transição dos créditos.
      - Etapas, condições e implicações
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS 2025 [Aquapolo]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Compromisso com o [P616] e [P471] Bezero'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:38eee8ba-950e-80f6-8966-e4a03c3d51ae')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:380ee8ba-950e-8082-b1e8-e9c1a40f79b2')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - E-mails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - Reunião interna: MV - preparação de estudo do SBTI para CTA.
      - Montagem de apresentação e CA
    - Reunião com [P606] (22 a 26) - [P356] [P67]
      - Requisitar informações de produção de 2025
      - [P155] material da [P67] com informações novas
  - [P465] [P9] de impacto [CTA]
  - [P155] [P84] [P35]
  - [P489] grupos focais
    - [P618] e [P485] enviarem para as pessoas
    - [P56] com grupos focais
  - RAS 2025 [CTA]
    - Realizada entrevista com:
      - Daniel, [P362]
      - [P632] entrevista com [P606] e [P493]
        - [P606] - programas com produtores
    - Iniciada [P72] [P622] 1 - [P784] [P240]
  - Emissão de CERS [J6 Energia]
    - [P881] para UNFCCC, já enviaram invoice para emissão do CERs
    - Acompanhamos até emissão dos créditos - aguardar
    - Pós: UNFCCC pode pedir revisão do PD
    Prazos CDM
    - [P877] 30/06 - pedido de submissão de creditos
    - [P877] 30/09 - pagamento da taxa de administração
    - [P877] 15/11 - fazer mudanças na comunicação: focal point, PP
    - [P877] 31/12 - transicionar para CDM
    - [P862] deixam claro que tem prazo final para emissão dos créditos
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [P31] concluído. [P130] posicionamento da continuidade do trabalho.
    - FUP após Reunião de [P253] (15/06)
  - [P31] S1&S2 [DEXXOS]
    - Relatório apresentado em 12/06
    - [P475] minuta e relatório para [P88]
  - Inventário GEE [Lanxess]
    - E-mail para [P737] cobrando informações: [P630] PDF diferentes da [P302]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS 2025 [Aquapolo]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Compromisso com o [P616] e [P471] Bezero'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:380ee8ba-950e-8082-b1e8-e9c1a40f79b2')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:379ee8ba-950e-8016-83e5-f6199355a0f8')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - E-mails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - [P33] final
      - MV fará ajuste para retirada de lenha do inventário.
        - [P343] feita e reenviado para ABNT
        - Validado.
    - MV - preparação de estudo do SBTI para CTA.
      - Montagem de apresentação e envio até sexta para CA
      - SBTI - Reunião MV e CA - [P470]  dia 02/06 pela tarde.
    - Inclusão em RPE até essa semana.
  - [P465] [P9] de impacto [CTA]
  - [P35] análise de benchmarks CTA
  - Responderam indicadores - [P34] de finalizar projeto editorial.
  - [P619] - FInalizar apresentação
  - [P392] grupos de entrevistas
  - Hoje - 17h.
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
      - [P632] entrevista com [P606] e [P779] liderança
        - [P606] - programas com produtores.
        - Compliance não foi tratado.
    - Tabelas de indicadores e documentos enviada
    - [P72] RAS
      - Pendência: apresentação projeto editorial
      - Separação “dentro e fora”, dando ênfase na CTA pelo entorno.
      - Montando linha narrativa dos programas da CTA.
    - [P371] de informação recebidas.
  - Emissão de CERS [J6 Energia]
    - Versão final com resposta ao primeiro finding enviado.
    - [P777] gerar necessidade de PRC na ONU ou não. [P862] afetará geração de créditos.
    - [P643] enviou documentação para review da RINA.
    - CA informará [P341] sobre situação do projeto.
    - Focal point - passo a passo da mudança.
  - Relatório de impacto socioambiental [BRLig]
    - ACT. [P642]?
      - [P862].
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS [Aquapolo]
  - Propostas
  Interno - Apsis Carbon'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:379ee8ba-950e-8016-83e5-f6199355a0f8')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:49eee8ba-950e-83cb-a51d-0186d2365e5c')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - E-mails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - [P33] final
      - MV fará ajuste para retirada de lenha do inventário.
        - [P343] feita e reenviado para ABNT
        - Validado.
    - MV - preparação de estudo do SBTI para CTA.
      - Montagem de apresentação e envio até sexta para CA
  - [P465] [P9] de impacto [CTA]
  - [P35] análise de benchmarks CTA
  - Apsis agrupar selecionados de entrevistas para apresentar a CTA.
  - [P84] [P35].
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
      - [P632] entrevista com [P606] e [P779] liderança
        - [P606] - programas com produtores.
        - Compliance não foi tratado.
    - Tabelas de indicadores e documentos enviada
  - Emissão de CERS [J6 Energia]
    - Versão final com resposta ao primeiro finding enviado.
    - [P777] gerar necessidade de PRC na ONU ou não. [P862] afetará geração de créditos.
    - [P643] enviará docs para revisão final da RINA HO.
    - CA informará [P341] sobre situação do projeto.
    - Focal point - passo a passo da mudança.
  - Relatório de impacto socioambiental [BRLig]
    - ACT. [P642]?
      - [P862].
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [P31] concluído. [P130] posicionamento da continuidade do trabalho.
  - [P31] S1&S2 [DEXXOS]
    - Relatório apresentado.
  - Inventário GEE [Lanxess]
    - [P630] planilhados e lançados na tabela GHG. [P303] feitos.
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS [Aquapolo]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:49eee8ba-950e-83cb-a51d-0186d2365e5c')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:372ee8ba-950e-8076-bfdc-fe1a3dc2583e')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - E-mails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - [P33]
      - MV viaja 20/05
      - [P815] visit 21/05
    - [P33] final
      - MV fará ajuste para retirada de lenha do inventário.
        - MV revisará e retirará do relatório.
        - Fatores de emissão para a lenha deveriam ser os de agricultura.
        - Reunião pós [P494] - IPEL.
    - MV - preparação de estudo do SBTI para CTA.
      - Montagem de apresentação e envio até sexta para CA
  - [P465] [P9] de impacto [CTA]
  - [P35] análise de benchmarks CTA
  - [P160] mais complexas - entrevistas
    - Questionário: necessidade de validar com CTA
  - [P56]
    - [P763] em grupos focais - Ao invés de vários entrevistas, workshop
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
      - [P632] entrevista com [P606] e [P779] liderança
        - [P606] - programas com produtores.
    - Tabelas de indicadores e documentos enviada
    - [P72] RAS
      - Pendência: apresentação projeto editorial
      - Separação “dentro e fora”, dando ênfase na CTA pelo entorno.
      - Montando linha narrativa dos programas da CTA.
    - [P371] de informação recebidas.
  - Emissão de CERS [J6 Energia]
    - Versão final com resposta ao primeiro finding enviado.
    - [P777] gerar necessidade de PRC na ONU ou não. [P862] afetará geração de créditos.
  - Relatório de impacto socioambiental [BRLig]
    - ACT. [P642]?
      - [P862].
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS [Aquapolo]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:372ee8ba-950e-8076-bfdc-fe1a3dc2583e')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:36bee8ba-950e-8038-9a12-f502b163d679')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - E-mails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - [P70] de dados e relatório
      - [P109] essa semana.
    - [P33]
      - MV viaja 20/05
      - [P815] visit 21/05
    - [P396] inventário, verificar alterações no perfil de emissões. E citar troca de motores na fábrica
    - [P67] de [P3]
      - CA assumirá frente desse tema
      - [P74] focar na nova ferramenta/metodologia agro do GHG [P245] - GS e MV estudar
      - [P771] teve reunião com [P606] e [P362]: metas de escopo 3 sendo estudadas
      - Consumo relatado muito maior que o esperado por padrão.
  - [P465] [P9] de impacto [CTA]
  - [P35] análise de benchmarks CTA
  - [P160] mais complexas - entrevistas
    - Questionário: necessidade de validar com CTA
  - Reunião de materialidade - [P191].
  - [P476] atualizado. [P486] no [P476].
  - [P56]
    - [P763] em grupos focais - Ao invés de vários entrevistas, workshop
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
      - [P632] entrevista com [P606] e [P779] liderança
        - [P606] - programas com produtores.
    - Tabelas de indicadores e documentos enviada
      - [P613] de resposta: dia 30/04 - [P613] extra: 08/5
    - [P72] RAS
      - [P843] semana (27 a 30) - iniciar trabalho de elaboração do relatório RAS - Projeto editorial
        - [P236] - [P477] reforçou que valor da CTA está na cadeia deles
          - [P236]: [P681] capítulo de destaque da cadeia e projetos
        - [P243]: apresentar no início da semana que vem.
    - Projeto [P192]
      - A ser finalizado essa semana.
      - Separação “dentro e fora”, dando ênfase na CTA pelo entorno.
        - Montando linha narrativa dos programas da CTA.
  - Emissão de CERS [J6 Energia]
    - [P630] mensais incluídos na planilha. [P652] dados obtidos da aba “mercado mensal” da CCEE.
    - Respostas aos findings enviadas (exceto um) enviadas ao VVB.
    - [P771] incluiu comentários
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS [Aquapolo]
  - Propostas
  Interno - Apsis Carbon'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:36bee8ba-950e-8038-9a12-f502b163d679')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:364ee8ba-950e-80ea-ad42-dcc9b1c870f1')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - Emails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - [P70] de dados
      - Em andamento: tratamento de escopo 1 e 2.
      - [P306] agendada com [P234]
        - [P234] enviou dados?
    - [P33]
      - [P617] sem informação de data da auditoria.
      - Opção: dia 21/05 para viagem. [P142] reserva de data com auditora.
      - MV irá para pkn entre 25/05 e 05/06. [P781], é importante que a auditoria da CTA não tenha conflito.
    - [P396] inventário, verificar alterações no perfil de emissões. E citar troca de motores na fábrica
    - [P67] de [P3]
      - CA assumirá frente desse tema
      - [P74] focar na nova ferramenta/metodologia agro do GHG [P245] - GS e MV estudar
  - [P465] [P9] de impacto [CTA]
  - [P762] de entrevistas e documentos
    - [P613] de respostas prolongado até 08/05
  - [P621] montou também modelo de questionário/formulário.
    - [P34] de desenvolver formulário mais complexo para stakeholders internos, com formulário mais simples
    - [P160] mais complexas - entrevistas
      - Questionário: necessidade de validar com CTA
  - Reunião [P621] - 29/04
    - Para semana que vem - [P264] MTD benchmarks passar para padrão Carbon
    - [P371] stakeholders
    - Temas materiais: a refinar para apresentar para CTA. E esperar envio de sugestões da CTA.
  - [P476] atualizado. [P486] no [P476].
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
      - [P632] entrevista com [P606] e [P779] liderança
        - CA tentará combinar essa semana (04/05). [P193]?
    - Tabelas de indicadores e documentos enviada
      - [P613] de resposta: dia 30/04 - [P613] extra: 08/5
        - Preencheram uma parte dos indicadores
    - [P72] RAS
      - [P843] semana (27 a 30) - iniciar trabalho de elaboração do relatório RAS - Projeto editorial
        - [P236] - [P477] reforçou que valor da CTA está na cadeia deles
          - [P236]: [P681] capítulo de destaque da cadeia e projetos
        - [P243]: apresentar no início da semana que vem.
      - Com projeto gráfico apresentado na semana que vem, semana 11-15 já com algum capítulo elaborado.
    - [P155] [P476] e segregar mais trabalho com designers de trabalho editorial.
  - Emissão de CERS [J6 Energia]
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS [Aquapolo]
  - Propostas
  Interno - Apsis Carbon
  # Projetos'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:364ee8ba-950e-80ea-ad42-dcc9b1c870f1')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:874ee8ba-950e-82cc-8c5b-01a26c4db01f')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024 ([P613]: 24 de abril)
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - Emails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - [P70] de dados
      - Em andamento: tratamento de escopo 1 e 2.
      - [P306] agendada com [P234]
        - [P243] de entrega de pendências hoje (04/05)
      - [P306] com [P606]
        - [P230] agrícolas
          - Enviará dados reexportados hoje (04/05)
          - [P630] este ano estão muito semelhantes ao do ano passado. [P606] disse que o aumento da produção não é necessariamente proporcional a mudança da produção.
        - [P929] - [P265]
          - Informações divergentes sobre resíduos
          - Simular auditoria da extração de dados
    - [P33]
      - [P617] sem informação de data da auditoria.
      - Opção: dia 21/05 para viagem. [P142] reserva de data com auditora.
      - MV irá para pkn entre 25/05 e 05/06. [P781], é importante que a auditoria da CTA não tenha conflito.
    - [P396] inventário, verificar alterações no perfil de emissões. E citar troca de motores na fábrica
    - [P67] de [P3]
      - CA assumirá frente desse tema
      - [P74] focar na nova ferramenta/metodologia agro do GHG [P245] - GS e MV estudar
  - [P465] [P9] de impacto [CTA]
  - [P762] de entrevistas e documentos
    - [P613] de respostas prolongado até 08/05
  - [P621] montou também modelo de questionário/formulário.
    - [P34] de desenvolver formulário mais complexo para stakeholders internos, com formulário mais simples
    - [P160] mais complexas - entrevistas
      - Questionário: necessidade de validar com CTA
  - Reunião [P621] - 29/04
    - Para semana que vem - [P264] MTD  benchmarks passar para padrão Carbon
    - [P371] stakeholders
    - Temas materiais: a refinar para apresentar para CTA. E esperar envio de sugestões da CTA.
  - [P476] atualizado. [P486] no [P476].
  - [P134]
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
      - [P632] entrevista com [P606] e [P779] liderança
        - CA tentará combinar essa semana (04/05)
    - Tabelas de indicadores e documentos enviada
    - [P72] RAS
    - [P155] [P476] e segregar mais trabalho com designers de trabalho editorial.
    - Estrutua
  - Emissão de CERS [J6 Energia]
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS [Aquapolo]
  - Propostas'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:874ee8ba-950e-82cc-8c5b-01a26c4db01f')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:e8fee8ba-950e-83c8-8fc0-0154526b27fe')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024 ([P613]: 24 de abril)
      - Status: Em andamento. [P343] e Relatório MV.
      - Rodado formulário de 2025. 69 respostas.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025 ([P613]: 24 de abril)
      - Emails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - [P70] de dados
      - Em andamento: tratamento de escopo 1 e 2. Há algumas pendências dos dados do [P234].
      - Pendências com [P234] para essa semana.
    - Em casos de atraso, revisar cronograma com cliente em tempo real sempre.
    - [P33]?
      - Sem novidade sobre data da auditoria.
      - MV irá para pkn entre 25/05 e 05/06. [P781], é importante que a auditoria da CTA não tenha conflito
    - [P207] SBTI para [P357]
      - [P384] para [P621]?
    - [P795] agora é estratégia de descarbonização.
    - [P396] inventário, verificar alterações no perfil de emissões. E citar troca de motores na fábrica
    - Timelime de alterações.
    - SBTI - Segunda que vem.
  - [P465] [P9] de impacto [CTA]
    - [P762] de entrevistas e documentos
      - [P762] de documentos realizada e stakeholders - [P495] enviada
  - [P13] de workshop + verificação junto
  - [P207] enviado para [P621]?
    - CA irá falar com [P621]
  - [P621] iniciará questionário com stakeholder e devemos revisar.
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
      - [P632] entrevista com [P606] e [P779] liderança
    - [P370] estudo de mudança de textos e projeto gráfico.
      - Ser mais direcionado.
      - Reunião essa semana na quinta-feira.
      - Feedback entre CTA e [P372] e [P797].
    - Tabelas de indicadores e documentos enviada
      - [P613] de resposta: dia 30/04.
  - Emissão de CERS [J6 Energia]
    - [P630] mensais incluídos na planilha. [P652] dados obtidos da aba “mercado mensal” da CCEE.
    - Pendência de obtenção de dados TEG com [P341].
    - Solicitação do governo - analisar
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Atualização lista de documentos - finalização 30/03/26
  - Visita
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:e8fee8ba-950e-83c8-8fc0-0154526b27fe')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:348ee8ba-950e-8001-9cad-d2e2e043e2f4')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024 ([P613]: 24 de abril)
      - Status: Em andamento. [P343] e Relatório MV.
      - Rodado formulário de 2025. 69 respostas.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025 ([P613]: 24 de abril)
      - Emails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - [P70] de dados
      - Em andamento: tratamento de escopo 1 e 2. Há algumas pendências dos dados do [P234].
      - Pendências com [P234] para essa semana.
    - [P33]?
      - Sem novidade sobre data da auditoria.
    - [P207] SBTI para [P357]
      - [P470] escalem essa decisão para a [P798]&[P496].
      - MV, GS e CA estudando SBTI.
    - [P795] agora é estratégia de descarbonização.
  - [P465] [P9] de impacto [CTA]
    - [P762] de entrevistas e documentos
      - [P762] de documentos realizada e stakeholders - [P495] enviada
  - [P13] de workshop + verificação junto
  - Em planejamento: reunião de apresentação [P633] e [P626] com equipe CTA. [P653]? [P617] não aconteceu.
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
    - [P370] estudo de mudança de textos e projeto gráfico.
      - Ser mais direcionado.
    - Tabelas de indicadores enviada
      - [P243] de 2 semanas de prazo.
      - [P613]: dia 30/04.
  - Emissão de CERS [J6 Energia]
    - [P630] mensais incluídos na planilha. [P652] dados obtidos da aba “mercado mensal” da CCEE.
    - Pendência de obtenção de dados TEG com [P341].
      - Reunião 16h30 - GS e CA
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - Relatório final minuta enviado em 20/03/26
      - [P384] minuta final  (sem ser a assinada) para editoração - 06/04/2026 - [P304] retornado.
  - Relatório de impacto socioambiental [BRLig]
    - Relatório enviado para [P373] - [P738].
    - FUP com [P373] sobre resposta de confirmações do relatório.
    - [P617] não retornado da editoração.
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Atualização lista de documentos - finalização 30/03/26
  - Visita
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Compromisso com o [P616] e [P471] Bezero
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:348ee8ba-950e-8001-9cad-d2e2e043e2f4')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:01cee8ba-950e-826e-ac58-815119fe9754')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024 ([P613]: 24 de abril)
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - Emails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - [P70] de dados
      - Em andamento: tratamento de escopo 1 e 2. Há algumas pendências dos dados do [P234].
      - [P306] agendada com [P234]: Quarta-feira (29/4 - 10h)
        - [P306] prévia - (28/4 - 18h)
        - Abordar as melhorias e compras de novos equipamentos citados por [P234] em reunião do RAS.
          - [P795] em verificar impacto de mudanças na estratégia de descarbonização.
    - Em casos de atraso, revisar cronograma com cliente em tempo real sempre.
    - [P33]
      - MV - FUP com contato da ABNT ([P373]) ([P29])
      - CA - FUP com contato da ABNT  ([P567])
      - MV irá para pkn entre 25/05 e 05/06. [P781], é importante que a auditoria da CTA não tenha conflito.
    - [P795] agora é estratégia de descarbonização.
    - [P396] inventário, verificar alterações no perfil de emissões. E citar troca de motores na fábrica
    - Timelime de alterações.
  - [P465] [P9] de impacto [CTA]
  - [P762] de entrevistas e documentos
    - [P762] de documentos realizada e stakeholders - [P495] enviada. [P435] em 30/4.
    - Com a lista, indicarmos quais serão também entrevistados, para propor na semana que vem
  - [P621] montou também modelo de questionário/formulário.
    - [P449] outros temas materiais e sermos mais assertivos do que a necessidade da CTA.
    - [P34] de desenvolver formulário mais complexo para stakeholders internos, com formulário mais simples
      - Questionário: necessidade de validar com CTA
  - Reunião com [P621] na última sexta.
    - Montagem de benchmark com concorrentes.
    - Apsis enviar para [P621] infos do RAS (GRI)
      - [P223] pasta do RAS (tirar pastas “sensíveis” da Carbon, financeiros)
        - Trazer infos do ano passado para pasta desse ano.
    - [P355] Reunião (29/04 - 16h30)
      - Montarmos lista de temas materiais. [P621] montará lista. Para montar lista única.
      - Posteriormente, apresentar para CTA.
      - [P20] do questionário comentado.
    - Para semana que vem, apresentar tudo para CTA.
    - Após fechar o cronograma com a CTA, montar tbm cronograma com [P621].
      - [P476] atualizado. [P486] no [P476].
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
      - [P632] entrevista com [P606] e [P779] liderança
    - Tabelas de indicadores e documentos enviada
    - [P843] semana (27 a 30) - iniciar trabalho de elaboração do relatório RAS - Projeto editorial
    - Com projeto gráfico apresentado na semana que vem, semana 11-15 já com algum capítulo elaborado.
  - Emissão de CERS [J6 Energia]
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Visita
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Compromisso com o [P616] e [P471] Bezero
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:01cee8ba-950e-826e-ac58-815119fe9754')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:463ee8ba-950e-829e-ad0c-01907a0149c0')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - [P69] revisão.
      - CA revisaria em 30/3. [P778] enviado tbm para editoração em 30/3. [P384]?
    - Anos: 2024
      - Etapa: [P480] e escrita do relatório
      - Status: Em andamento
      - Rodado formulário de 2025. 69 respostas.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025 ([P613]: 24 de abril)
      - Emails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - Reuniões de levantamento realizadas.
    - [P70] de dados
      - Em andamento: tratamento de escopo 1 e 2. Há algumas pendências dos dados do [P234].
    - Processos não muito alterados, mas importante manter impessoalidade nos processos: evitar atrasos como o que ocorreu com [P234].
    - [P33]
      - [P332]: vão verificar se é possível fazer junto verificação GHG junto com SBTI.
    - [P207] SBTI para [P357]
      - [P470] escalem essa decisão para a [P798]&[P496].
      - Continuaremos estudando SBTI, mantendo agenda interna de análise.
        - [P207] de empresas, ler padrões, etc. Reunião 10/4/2026 - CAxMVxGSxAC
    - [P575] FGV GHG [P245] [P653].
  - [P9] financeira [CTA]
    - [P762] de entrevistas e documentos
      - [P762] de documentos realizada - [P343] [P771] (identificar se separa em etapas o envio da documentação)
      - [P771] refez para CTA e também voltada para todas empresas, com separação por blocos, semelhante ao relatório AVB.
        - Tarefa: equipe analisar criticamente a lista. Importante pensar tbm sobre divulgação aos clientes.
  - [P13] de workshop + verificação junto
  - Em planejamento: reunião de apresentação [P633] e [P626] com equipe CTA.  10/4? A verificar.
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
    - Tabelas de indicadores já confeccionada
      - [P109] em 02/04/2026
  - Emissão de CERS [J6 Energia]
    - Visita de auditoria realizada.
      - PDD não informava forma de cálculo da forma que é feita com divisão Queixada e [P497].
        - Isto gerar um conflito entre o MR e os dados do PDD.
        - [P470] seja necessário revisar o PDD.
      - Importante: problemas com dados históricos de geração de energia na CCEE. Atenção para próximos projetos.
      - Há possibilidade de incluir mudanças do PDD no MR. [P617] é inconclusivo se é possível sem PRC.
      - [P324] para auditora dados prévios: [P385] com nível do reservatório e histórico de troca dos medidores da CCEE.
        - Auditora enviará documentos até o fim do dia (06/4)
      - [P595] [P614]: [P89] pendentes.
      - [P449] dados mensais das faturas na planilha.
      - [P449] dados sem calibração
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Atualização lista de documentos - finalização 30/03/26
  - Visita
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Compromisso com o [P616] e Bezero
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:463ee8ba-950e-829e-ad0c-01907a0149c0')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:887ee8ba-950e-83e9-b867-01c97feffdce')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - [P69] revisão.
      - CA revisaria em 30/3. [P778] enviado tbm para editoração em 30/3. [P384]?
    - Anos: 2024
      - Etapa: [P480] e escrita do relatório
      - Status: Em andamento
      - Rodado formulário de 2025. 69 respostas.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025 ([P613]: 24 de abril)
      - Emails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - Reuniões de levantamento realizadas.
    - [P70] de dados
      - Em andamento: tratamento de escopo 1 e 2. Há algumas pendências dos dados do [P234].
    - Processos não muito alterados, mas importante manter impessoalidade nos processos: evitar atrasos como o que ocorreu com [P234].
    - [P33]
      - [P332]: vão verificar se é possível fazer junto verificação GHG junto com SBTI.
    - [P207] SBTI para [P357]
      - [P470] escalem essa decisão para a [P798]&[P496].
      - Continuaremos estudando SBTI, mantendo agenda interna de análise.
        - [P207] de empresas, ler padrões, etc. Reunião 10/4/2026 - CAxMVxGSxAC
    - [P575] FGV GHG [P245] [P653].
  - [P9] financeira [CTA]
    - [P762] de entrevistas e documentos
      - [P762] de documentos realizada - [P343] [P771] (identificar se separa em etapas o envio da documentação)
      - [P771] refez para CTA e também voltada para todas empresas, com separação por blocos, semelhante ao relatório AVB.
        - Tarefa: equipe analisar criticamente a lista. Importante pensar tbm sobre divulgação aos clientes.
  - [P13] de workshop + verificação junto
  - Em planejamento: reunião de apresentação [P633] e [P626] com equipe CTA.  10/4? A verificar.
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
    - Tabelas de indicadores já confeccionada
      - [P109] em 02/04/2026
  - Emissão de CERS [J6 Energia]
    - Visita de auditoria realizada.
      - PDD não informava forma de cálculo da forma que é feita com divisão Queixada e [P497].
        - Isto gerar um conflito entre o MR e os dados do PDD.
        - [P470] seja necessário revisar o PDD.
      - Importante: problemas com dados históricos de geração de energia na CCEE. Atenção para próximos projetos.
      - Há possibilidade de incluir mudanças do PDD no MR. [P617] é inconclusivo se é possível sem PRC.
      - [P324] para auditora dados prévios: [P385] com nível do reservatório e histórico de troca dos medidores da CCEE.
        - Auditora enviará documentos até o fim do dia (06/4)
      - [P595] [P614]: [P89] pendentes.
      - [P449] dados mensais das faturas na planilha.
      - [P449] dados sem calibração
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Atualização lista de documentos - finalização 30/03/26
  - Visita
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Compromisso com o [P616] e Bezero
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:887ee8ba-950e-83e9-b867-01c97feffdce')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:a84ee8ba-950e-8217-997a-810fb6e5463a')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - [P69] revisão.
      - Colocar os principais na pasta final e o resto na pasta old.
      - CA termina hoje. [P568] para editoração hoje, se der.
    - Anos: 2024
      - Etapa: [P480] e escrita do relatório
      - Status: Em andamento
      - Rodado formulário de 2025. 69 respostas.
      - [P343] 2023 e 2024: [P771] fará durantes viagem para J6.
      - [P263] no relatório sobre OM quanto a udnaça constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025 ([P613]: 24 de abril)
      - E-mail enviado para RH com o formulário de 2025 ([P623])
      - Reunião Apsis - [P232]: pendente
        - MV : enviado e-mail com pedidos para financeiro. [P344] e [P232]. [P69] respostas.
        - Emails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - Reuniões de levantamento realizadas.
    - [P70] de dados
      - Em andamento: tratamento de escopo 1 e 2 pendente.
    - Conversas com [P234]: deve enviar tudo hoje.
    - Conversas com [P618] e [P248]: dúvidas de transporte esclarecidas.
    - Processos não muito alterados, mas importante manter impessoalidade nos processos: evitar atrasos como o que ocorreu com [P234].
    - [P33]
      - [P332]: vão verificar se é possível fazer junto verificação GHG junto com SBTI.
    - [P207] SBTI para [P357]
    - Reunião
      - Quinta: 9h - SBTI CTA - GS e MV.
  - [P9] financeira [CTA]
    - [P762] de entrevistas e documentos
      - [P762] de documentos realizada - [P343] [P771] (identificar se separa em etapas o envio da documentação)
      - [P762] de stakeholders
        - Em andamento com [P771]
        - Checar se os stakeholders dos relatórios estão na lista e caso não, atualizar
        - [P728] da [P626] e [P633]: [P509] [P90] - [P236] de acréscimo
    - [P13]: workshop presencial
      - [P13] de workshop + verificação junto
      - Tarefas
        - Tarefa 1 : questionário inicial para os stakeholders.
          - [P130] stakeholders presentes no RAS
          - [P130] stakeholders citados nas redes sociais da CTA
        - Tarefa 2: desenvolver informações financeiras para materialidade financeira.
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
    - Tabelas de indicadores já confeccionada.
    - [P762] de indicadores em andamento - finalização 30/03
  - Emissão de CERS [J6 Energia]
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS][P194] sendo atualizado. [P258] de enviar hoje a atualização de status.
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Compromisso com o [P616]
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:a84ee8ba-950e-8217-997a-810fb6e5463a')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:951ee8ba-950e-83a6-b293-01adccfcb0c8')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - [P69] revisão.
    - Anos: 2024
      - Etapa: [P480] e escrita do relatório
      - Status: Em andamento
      - Rodado formulário de 2025. 69 respostas.
      - [P343] 2023 e 2024: [P771] fará durantes viagem para J6.
    - Ano: 2025 ([P613]: 24 de abril)
      - E-mail enviado para RH com o formulário de 2025 ([P623])
      - Reunião Apsis - [P232]: pendente
        - MV : enviado e-mail com pedidos para financeiro. [P344] e [P232]. [P69] respostas.
        - Emails da [P344] e [P232] recebidos.
  - [P67] de [P3] [CTA] e Inventário
    - Reuniões de levantamento realizadas.
    - [P70] de dados
      - GS: finalizado conforme todos foram recebidos.
      - [P69] dados de escopo 1 e 2.
        - [P595] [P234].
      - [P461] dados de transporte de tabaco. [P266] com ano passado.
        - [P630] de transporte de tabaco ok.
        - E-mail de transporte acabado pendente.
    - [P33]
      - Sem retorno de OVV
  - [P9] financeira [CTA]
    - [P343] de materialidade já em curso e evoluir para dupla materialidade financeira
    - [P762] de entrevistas e documentos
      - [P762] em elaboração pela [P611]. [P243] de entrega amanhã.
      - Servirão também para o RAS.
    - [P728] da [P626] e [P633]: [P509] [P90]
    - [P13]: workshop presencial
      - [P13] de workshop + verificação junto
      - Tarefas
        - Tarefa 1 : questionário inicial para os stakeholders.
        - Tarefa 2: desenvolver informações financeiras para materialidade financeira.
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
    - [P681] tabelas de indicadores.
  - Emissão de CERS [J6 Energia]
    - [P69] comentários públicos MR - publicado CDM.
    - [P89] da verificação - espelhar drives J6 e Apsis
      - [P155] links da planilha de documentos referenciados
    - Checar documentação, cobrar envio dos dados pendentes.
    - [P130] com [P341] se há login do CDM para acompanhar verificação.
    - [P634] citam calibração inicial de medidores, que nunca foi citada anteriormente e tbm substituição de outro medidor que não havia sido citada.
    - [P431] narrativa com clientes. [P569] clientes para controla fluxo de infos para auditora.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Everland - Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:951ee8ba-950e-83a6-b293-01adccfcb0c8')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:c5eee8ba-950e-83bb-87dd-01fc0bfb6b0b')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - [P69] revisão.
    - Anos: 2024
      - Etapa: [P480] e escrita do relatório
      - Status: Em andamento
      - Rodado formulário de 2025. 69 respostas.
    - Ano: 2025 ([P613]: 24 de abril)
      - E-mail enviado para RH com o formulário de 2025 ([P623])
      - Reunião Apsis - [P232]: pendente
        - MV : enviado e-mail com pedidos para financeiro. [P344] e [P232]. [P69] respostas.
  - [P67] de [P3] [CTA] e Inventário
    - Reuniões de levantamento realizadas.
    - [P70] de dados
      - GS: finalizado conforme todos foram recebidos.
      - [P69] dados de escopo 1 e 2.
        - [P595] [P234].
      - [P461] dados de transporte de tabaco. [P266] com ano passado.
        - E-mail de transporte acabado pendente.
    - Para documentos pendentes: envio de e-mails de lembrança a cada 3 dias.
    - Copiar sempre [P606]/[P618] nos e-mails de cobrança e inventário.
    - Começa a pensar em estratégia de descarbonização.
      - Citar recomendação - padronização de dados entre anos.
      - [P602] em frameworks elegíveis e utilizáveis para CTA
      - [P130] proposta para entender escopo.
      - Direcionar mais que a estratégia do ano passado: aprofundar framework.
      - [P370] cronograma da estratégia e definir frameworks.
    - [P33]
      - 2 propostas recebidas. ABNT pendente.
      - Tentativa de agendar visita com outras atividades lá em VA.
      - GS: verificar estratégia de descarbonização anterior
  - [P9] financeira [CTA]
    - [P343] de materialidade já em curso e evoluir para dupla materialidade financeira
    - [P813]-off realizado
      - Ultima matriz de materialidade feita foi a primeira. [P606], [P618] e [P477] atuaram de forma passiva.
      - [P762] de stakeholders: mais de 100. 70 com retorno. 30 viraram entrevistas.
      - Acharam cronograma um pouco apertado.
    - [P133] está preenchendo [P235]. [P267] de nossas informação para preenchimento do [P235].
      - [P613] [P235]: ?
    - [P13]: workshop presencial
      - [P13] de workshop + verificação junto
      - Tarefas
        - Tarefa 1 : questionário inicial para os stakeholders.
        - Tarefa 2: desenvolver informações financeiras para materialidade financeira.
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
    - [P681] tabelas de indicadores.
  - Emissão de CERS [J6 Energia]
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Everland - Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:c5eee8ba-950e-83bb-87dd-01fc0bfb6b0b')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:653ee8ba-950e-83aa-a073-810315a09d73')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - [P69] revisão.
    - Anos: 2024
      - Etapa: [P480] e escrita do relatório
      - Status: Em andamento
      - Rodado formulário de 2025. 69 respostas.
        - CA : comentar com RM para reforçar necessidade de respostas.
    - Ano: 2025
      - E-mail enviado para RH com o formulário de 2025 ([P623])
      - Reunião Apsis - [P232]: pendente
        - MV enviará infos pendentes para [P232] verificar oq pode ser enviado.
  - [P67] de [P3] [CTA] e Inventário
    - Reuniões de levantamento realizadas.
    - Reunião [P79] de tabaco realizada
    - [P70] de dados
      - GS: finalizado conforme todos foram recebidos.
      - [P69] dados de escopo 1 e 2, além do transporte de tabaco.
    - Para documentos pendentes: envio de e-mails de lembrança a cada 3 dias.
    - Começa a pensar em estratégia de descarbonização.
      - [P602] em frameworks elegíveis e utilizáveis para CTA
      - [P130] proposta para entendr escopo.
      - Direcionar mais que a estratégia do ano passado: aprofundar framework.
      - [P370] cronograma da estratégia e definir frameworks.
  - [P9] financeira [CTA]
    - [P343] de materialidade já em curso e evoluir para dupla materialidade financeira
    - Etapas (Apsis Carbon)
      - [P343] de riscos que afetam operação da empresa.
      - [P203] de pesos na operação.
      - Cálculo de impacto financeiro
    - Há de se definir cenários de curto, médio e longo prazo.
    - [P244] ferramentas e parceiros utilizáveis para apoio, sobretudo tecnológico.
    - [P813]-off essa semana: materialidade de impacto, com apoio da [P626] (e sócia [P633]).
      - Almoço CA e FM com [P626]: quarta-feira.
    - [P813]-off: sexta-feira 13/03.
    - [P133] está preenchendo [P235]. [P267] de nossas informação para preenchimento do [P235].
    - Importante: analisar SASB e TCFD.
    - [P13]: workshop presencial
      - [P13] de workshop + verificação junto
    - [P613] [P235]: ?
    - [P20]: AC
  - RAS 2025 [CTA]
    - [P56] de materialidade servirão para o RAS.
  - Emissão de CERS [J6 Energia]
    - [P69] comentários públicos MR - publicado CDM.
    - Visitas a serem realizadas no dia 25/03.
    - [P89] da verificação - espelhar drives J6 e Apsis
      - [P155] links da planilha de documentos referenciados
    - Checar documentação, cobrar envio dos dados pendentes.
    - [P130] com [P341] se há login do CDM para acompanhar verificação
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Everland - Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:653ee8ba-950e-83aa-a073-810315a09d73')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:754ee8ba-950e-8270-a0d8-0104feecfd97')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE []
    - [ ] Inventário GEE [Lanxess]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - [P69] revisão.
      - AC está revisando dados apontados por CA.
    - Anos: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
      - Rodar formulário de 2025. 65 respostas.
    - E-mail enviado para RH com o formulário de 2025 ([P623])
      - Reunião GS - [P232]: após volta da MV de férias.
    - [P236] da letícia sobre 0h de ar condicionado no home-office: acatada.
    - Após email da [P899]: verificar se questionário está adequado.
  - [P67] de [P3] [CTA] e Inventário
    - Reuniões de levantamento realizadas.
    - [P630] sendo recebidos e tratados.
    - Tanque de resfriamento da ETE
      - [P130] se há fato positivo no resfriamento dos resíduos que possa ser mitigada ou comunicada no RAS.
      - [P80] se o tanque é fechado ou aberto e processo.
    - Reunião pendente: [P79] de tabaco
      - [P130] se foram utilizados os caminhões a gás da nova empresa de transporte de tabaco no ano de período do relatório: 2025.
      - CA verificará com [P618] se tem problema aguardar MV para reunião com área de transporte de tabaco.
      - Esperaremos MAry voltar.
    - Orçamentos já solicitados com VVBs
    - CA: expectativa de aumento de adesão ao RPE esse ano.
    - [P302] nova do GHG já adicionada no site FGV.
      - [P237] se a nova ferramenta para land use está incluída de alguma forma.
    - [P70] de dados
      - GS: finalizado conforme todos foram recebidos.
    - [P479] reunião de trabalho: CA, MV e GS: [P107] inventários.
      - Pontos de atenção: erros de extração CTA.
    - Reunião GS e MV: 16h.
    - Alocação: MV e GS
  - J6 Energia
    - MR
      - [P384] para [P799] ([P654])
    - Ensaio de verificação feito com equipe J6. [P151] na extração de dados, mas solucinaram após a reunião. [P386] diferença e introdução de uma nova medição “m1 e m0”
    - Visitas a serem realizadas no dia 25/03.
    - [P89] da verificação - espelhar drives J6 e Apsis
      - [P155] links da planilha de documentos referenciados
    - [P130] UNFCCC. [P108].  - [P862] há nada publicado.
    - Checar documentação, cobrar envio dos dados pendentes.
  - Relatório de [P2] [Aquapolo]
    - Relatório [P109]
    - CA irá finalizar projeto no SAN hoje de tarde.
    - Rever horas lançadas.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - [P611] já tratou os dados enviados na planilha GHG.
      - Introduzir, no relatório, sugestões de governança estratégica e controle interno deles.
    - MV revisará relatório após conclusão.
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:754ee8ba-950e-8270-a0d8-0104feecfd97')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:07aee8ba-950e-82d4-8cf4-0129f83f78ae')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [Lanxess]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - [P69] revisão.
      - AC está revisando dados apontados por CA.
    - Anos: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
      - Rodar formulário de 2025.
    - E-mail enviado para RH com o formulário de 2025 ([P623])
      - Reunião GS - [P232]: após volta da MV de férias.
    - [P795] em tratar todos os dados essa semana.
    - 50 respostas ao formulário. [P682] irá cobrar e estender por uma semana.
  - [P67] de [P3] [CTA] e Inventário
    - Reuniões de levantamento realizadas.
    - [P630] sendo recebidos e tratados.
    - Tanque de resfriamento da ETE
      - [P130] se há fato positivo no resfriamento dos resíduos que possa ser mitigada ou comunicada no RAS.
      - [P80] se o tanque é fechado ou aberto e processo.
    - Reunião pendente: [P79] de tabaco
      - [P130] se foram utilizados os caminhões a gás da nova empresa de transporte de tabaco no ano de período do relatório: 2025.
      - CA verificará com [P618] se tem problema aguardar MV para reunião com área de transporte de tabaco.
      - Esperaremos MAry voltar.
    - Orçamentos já solicitados com VVBs
    - CA: expectativa de aumento de adesão ao RPE esse ano.
    - [P302] nova do GHG já adicionada no site FGV.
      - [P237] se a nova ferramenta para land use está incluída de alguma forma.
    - [P70] de dados
      - GS: [P363] o que foi feito com CA e GS
      - GS: verificar melhorias possíveis no tratamento.
      - GS: acompanha formulário DCT.
    - Alocação: MV e GS
  - J6 Energia
    - MR
      - [P384] para [P799] ([P654])
    - Ensaio de verificação feito com equipe J6. [P151] na extração de dados, mas solucinaram após a reunião. [P386] diferença e introdução de uma nova medição “m1 e m0”
    - Visitas a serem realizadas no dia 25/03.
    - [P89] da verificação - espelhar drives J6 e Apsis
      - [P155] links da planilha de documentos referenciados
  - Relatório de [P2] [Aquapolo]
    - Versão final com revisões enviada para designers.
    - Responder [P772]: designers pediram maior prazo.
    - [P797] e [P372] estão crescendo e aumentando preços. [P74] entender se é possível internalizar alguns serviços dentro do escopo do RAS.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - Parcela?
    - MV revisará relatório após conclusão.
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  1.2. ‣ - Findings.
  1.3. Monitoramento - Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:07aee8ba-950e-82d4-8cf4-0129f83f78ae')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:0cfee8ba-950e-82dc-b6f7-81d96523a3ce')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [Lanxess]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - [P69] revisão.
      - AC está revisando dados apontados por CA.
    - Anos: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
      - Rodar formulário de 2025.
    - E-mail enviado para RH com o formulário de 2025 ([P623])
      - [P34] de informar prazo para [P682] para preenchimento (uma semana, se enviado hoje)
      - Reunião GS - [P232]: após volta da MV de férias.
    - [P795] em tratar todos os dados essa semana. [P110].
  - [P67] de [P3] [CTA] e Inventário
    - Reuniões de levantamento realizadas.
    - [P630] sendo recebidos e serão tratados por GS na próxima semana.
    - Tanque de resfriamento da ETE
      - [P130] se há fato positivo no resfriamento dos resíduos que possa ser mitigada ou comunicada no RAS.
      - [P80] se o tanque é fechado ou aberto e processo.
    - Reunião pendente: [P79] de tabaco
      - [P130] se foram utilizados os caminhões a gás da nova empresa de transporte de tabaco no ano de período do relatório: 2025.
      - CA verificará com [P618] se tem problema aguardar MV para reunião com área de transporte de tabaco.
    - [P70] de dados
      - GS: [P363] o que foi feito com CA e GS
      - GS: verificar melhorias possíveis no tratamento.
      - GS: acompanha formulário DCT.
    - Alocação: MV e GS
  - J6 Energia
    - MR
      - [P384] para [P799] ([P654])
    - [P130] agenda com [P341] e [P614] para ensaio de verificação. [P479] para fim da semana. [P152] de acesso aos dados.
      - Quarta - às 17h.
    - [P668] reunião: [P643] informando cronograma de verificação para equipe J6
      - CA questionou disponibilidade hoje para equipe.
    - [P89] da verificação - espelhar drives J6 e Apsis
      - [P155] links da planilha de documentos referenciados
  - Relatório de [P2] [Aquapolo]
    - [P372] enviou página de créditos de água.
      - [P792] enviar o resto das páginas esta semana.
      - [P461] e enviar para editoração após recebimento.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - [P332] planilha GHG.
    - Parcela?
      - Após pagamento, dar continuidade com email de pendencias.
    - MV revisará relatório após conclusão.
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  1.2. ‣ - Findings.
  1.3. Monitoramento - Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:0cfee8ba-950e-82dc-b6f7-81d96523a3ce')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:915ee8ba-950e-8205-844a-818effbab831')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [Lanxess]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109]
      - [P69] revisão
      - AC está revisando dados apontados por CA.
    - Anos: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
      - Rodar formulário de 2025.
    - Após envio de e-mail para RH ([P623]), [P623] solicitou envio de prazo para rodar e preencherem o formulário.
    - Já podemos enviar o formulário e manter uma semana de prazo para preenchimento.
  - [P67] de [P3] [CTA] e Inventário
    - [P22] de fontes
      - MV disparará e-mails hoje com as informações de [P606] e [P234].
    - [P929] e [P248] já estão iniciando envio de informações
    - Iniciaremos as cotações de verificadores.
    - [P70] de dados
      - GS - [P370] tratamento e MV revisará.
    - [P473] 3 - [P570] da queima de lenha da cura do tabaco.
    - GS - [P195] infos do email sobre custos da estratégia de descarbonização + SBTI [P436].
    - Alocação: MV e GS
  - J6 Energia
    - Contrato
      - [P636] FUP com [P341] para assinatura do contrato.
    - MR
      - MR
        - Status: [P233]
      - [P302] de cálculo de emissões
        - Status: [P233]
    - Contrato assinado entre J6 e RINA
    - Visita provável na segunda metade de março. ([P643] - RINA)
      - [P341] sugeriu a viagem ser no final da semana. Quarta, quinta e sexta.
    - [P873] abre pedido de emissão MDL, há análise inicial pelo MDL e depois um período de consulta pública. Após, é possível haver a visita.
    - [P34] de passar cronograma da UNFCCC para verificação e entender se é possivel seguir assim: se ele tem essa flexibilidade.
    - [P130] agenda com [P341] e [P614] para ensaio de verificação. [P479] para fim da semana. [P152] de acesso aos dados.
    - [P799]
      - 2 auditorias da UNFCC enquanto fazem auditoria de outros clientes.
      - Preocupação extra: 2 vezes no mesmo ano, no MDL.
  - Relatório de [P2] [Aquapolo]
    - Fotos: [P74] criar um book de fotos para substituição nas páginas.
    - GS - [P489] num email a susbstituição por fotos - [P571] tal por foto tal. [P634].
  - EVTE - [Fazenda União]
    - Pago pela GBF.
    - EVTE e linha do tempo enviado.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:915ee8ba-950e-8205-844a-818effbab831')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:d9fee8ba-950e-8399-ae32-81b8f3118961')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [Lanxess]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109]
      - [P69] revisão
      - AC está revisando dados apontados por CA.
    - Ano: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
      - Rodar formulário de 2025.
      - [P343] cruzada entre MV, AC e GS.
      - [P70] de dados: há de ser finalizado ainda em janeiro, conforme priorização dos projetos em andamento.
    - Ano: 2025
      - [P630] de 2025 para [P232] já solicitados: MV. [P873] entrará de férias por 20 dias. [P349] esperar.
      - [P84] DCT encaminhado para RH ([P623]).
    - MV está atualizando a diretriz técnica interna, com registros das alterações realizadas.
  - [P67] de [P3] [CTA] e Inventário
    - [P813]-off: 21/01/2026
      - [P346] realizado e reuniões de levantamento marcadas
    - To do: [P254] cronograma de trabalho do inventário CTA
      - Alocação de próximos passos de confecção do inventário.
    - Proposta - [P67] de descarbonização
      - [P130] objetivos do ano passado e verificar metas futuras factíveis
      - Certificações de neutralidade de carbono/ redução
      - MV e GS: levantar custos externos necessários para desenvolver a estratégia(normas ABNT, softwares, etc).
      - Para o futuro (outras propostas): apresentar biochar e ARR, apresentando custos.
      - [P603] para desenvolver a proposta.
      - [P449] levantamento de oportunidade de crédito/renúncia verdes.
    - Proposta - [P343] de materialidade e RAS
      - [P34]: entender tudo necessário para desenvolver a proposta (custos externos: normas, consultores, etc)
      - [P351] incluída no RAS. [P56], revisão e link com o que está realizando com [P235].
    - Alocação: MV e GS
  - J6 Energia
    - Contrato
      - [P636] FUP com [P341] para assinatura do contrato.
    - MR
      - MR
        - Status: [P233]
      - [P302] de cálculo de emissões
        - Status: [P233]
    - [P622] da comunicação foi feita entre J6 e RINA diretamente, sem nos copiar. Ou seja, o intervalo de comunicação entre eles é menor do que imaginávamos. A resposta pendente está na J6.
    - [P762] de datas e prazos do MDL confeccionada.
      - [P34] de entender com [P341] se é viável manter a emissão de créditos.
  - Relatório de [P2] [Aquapolo]
    - [P629] final para Aquapolo apenas após termos todos os dados pendentes, editoração feita  e revisado pela Carbon.
    - Reunião com [P772]: 27/01  - 15h
      - Após reunião e definição de dados, a depender do prazo, enviar para editoração e depois designers.
    - [P343] do último envio dos designers e dos comentários internos feita e encaminhada para [P772] no drive.
  - EVTE - [Fazenda União]
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de [P437] [P6] [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:d9fee8ba-950e-8399-ae32-81b8f3118961')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:a48ee8ba-950e-83f1-8b83-8151dd51a24b')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [Lanxess]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109]
      - [P69] revisão
      - AC está revisando dados apontados por CA.
    - Anos: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
      - Rodar formulário de 2025.
    - [P343] cruzada entre MV, AC e GS.
    - [P630] de 2025 para [P232] já solicitados: MV. [P873] entrará de férias por 20 dias. [P349] esperar.
    - [P629] de pedido dos formulários ainda pendente.
    - Modelo [P572] - 2023 está em revisão.
    - [P343] dos dados não é refazer os cálculos. A revisão deve ser feita por amostragem.
    - Ou seja, há de se definir o processo de avaliação dos dados e após tratados, revisar apenas por amostragem.
  - [P67] de [P3] [CTA] e Inventário
    - [P813]-off: 21/01/2026
      - [P20] enviada para revisão do CA.
    - Warm-up ([P606])
      - 15/01
      - [P67] de descarbonização iniciará este ano.  [P196] a adoção de etanol como combustível.
      - Créditos de carbono: restauração nas áreas dos associados da CTA.
      - [P388]: possibilidade de ser feito com farelo de tabaco. [P845] de tabaco no solo dos produtores pode ser retirado para produção de biochar tbm.
        - [P349] montar apresentação sobre biochar para CTA.
      - Propostas futuras: descarbonização e biochar. (após kickoff)
    - Suzian nos fez muitos elogios, sobre como conduzimos os projetos com CTA.
      - [P795] em não deixarmos a bola cair.
    - Alocação: MV e GS
  - J6 Energia
    - Contrato
      - [P636] FUP com [P341] para assinatura do contrato.
    - MR
      - MR
        - Status: [P233]
      - [P302] de cálculo de emissões
        - Status: [P233]
    - Contrato ainda não assinado entre J6 e RINA
    - [P341] pediu revisão dos verificadores disponíveis.
    - Checar prazos vigentes do CDM. [P130] com canais oficiais.
    - [P678] B:  AENOR sinalizou nos contatos iniciais que não tinha equipe disponível. FUP com [P341] para verificar desistência com RINA e inicio de contato com AENOR.
    - [P622] da comunicação foi feita entre J6 e RINA diretamente, sem nos copiar. Ou seja, o intervalo de comunicação entre eles é menor do que imaginávamos. A resposta pendente está na J6.
  - Relatório de [P2] [Aquapolo]
    - [P134] enviaram o relatório da versão final do RAS completo. Após, faremos a editoração com revisão interna simultânea.
    - Término do relatório inteiro em janeiro.
    - Férias [P772] - 5 de janeiro
    - [P370] definição da revisão da materialidade. [P237] como faremos em 2026.
    - [P629] para Aquapolo apenas após termos todos os dados pendentes, editoração feita  e revisado pela Carbon.
    - [P343] tbm das páginas de créditos de água. (separar do todo, sfc)
  - EVTE - [Fazenda União]
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:a48ee8ba-950e-83f1-8b83-8151dd51a24b')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:74aee8ba-950e-8221-84a3-81fe9e7002b8')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [Lanxess]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109]
      - [P69] revisão
      - AC está revisando dados apontados por CA.
    - Anos: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
      - Rodar formulário de 2025.
    - [P343] cruzada entre MV, AC e GS.
  - [P67] de [P3] [CTA] e Inventário
    - Início de inventário 2025.
      - CA iniciará conversa. [P606] e [P234]: confirmar envolvidos na empresa, cronograma de sugestão de datas.
        - Visita de verificação?
        - [P130] itens monitorados no campo: consumo de lenha, por exemplo, que não foi monitorado.
        - [P130]  implantação de uso de software.
        - [P335] processo produtivo para verificar possibilidade de nova categoria para escopo 3.
    - Reunião CA-MV
      - 13/01 - 9h
    - Alocação: MV e GS
  - J6 Energia
    - Contrato
      - [P636] FUP com [P341] para assinatura do contrato.
    - MR
      - MR
        - Status: [P233]
      - [P302] de cálculo de emissões
        - Status: [P233]
    - Contrato ainda não assinado entre J6 e RINA
    - [P341] pediu revisão dos verificadores disponíveis.
    - Checar prazos vigentes do CDM. [P130] com canais oficiais.
    - AENOR sinalizou nos contatos iniciais que não tinha equipe disponível. FUP com [P341] para verificar desistência com RINA e inicio de contato com AENOR.
  - Relatório de [P2] [Aquapolo]
    - [P134] enviaram hoje o relatório da versão final do RAS completo. Após, faremos a editoração com revisão interna simultânea.
    - Término do relatório inteiro em janeiro.
    - Férias [P772] - 5 de janeiro
    - [P370] definição da revisão da materialidade. [P237] como faremos em 2026.
  - EVTE - [Fazenda União]
    - [P306] com [P138] (GBF): proposta de valor da 2 parcela. [P361] contra proposta.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - [P332] planilha GHG.
    - [P20] do formulário casa-trabalho realizada.
      - 9 respostas até agora. [P80] se faltam ainda.
    - Comunicação com Cosmos: destacar que trabalho só será concluído com uso da planilha GHG nova e confirmar conclusão do formulário casa-trabalho. CA via Whatsapp. AC por email.
    - MV revisará relatório após conclusão.
  - Relatório de impacto socioambiental [BRLig]
    - [P69] fim do ano para envio de informações pendentes.
    - [P142] dados.
    - Reunião de atualização: MV/AC - CA > 9/1 - 16h.
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:74aee8ba-950e-8221-84a3-81fe9e7002b8')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:165ee8ba-950e-8329-ae93-8188bf048390')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [Lanxess]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109]
      - [P69] revisão
      - AC está revisando dados apontados por CA.
    - Anos: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
      - Rodar formulário de 2025.
    - [P343] cruzada entre MV, AC e GS.
    - [P630] de 2025 para [P232] já solicitados: MV. [P873] entrará de férias por 20 dias. [P349] me esperar.
  - [P67] de [P3] [CTA] e Inventário
    - Início de inventário 2025.
      - CA iniciará conversa. [P606] e [P234]: confirmar envolvidos na empresa, cronograma de sugestão de datas.
        - Visita de verificação?
        - [P130] itens monitorados no campo: consumo de lenha, por exemplo, que não foi monitorado.
        - [P130]  implantação de uso de software.
        - [P335] processo produtivo para verificar possibilidade de nova categoria para escopo 3.
    - Reunião CA-MV
      - 13/01 - 9h
    - Warm-up ([P606])
      - 15/01 -  11h
      - Citar: expansão do escopo 3: inclusão de lenha utilizada pelos produtores.
    - Alocação: MV e GS
  - J6 Energia
    - Contrato
      - [P636] FUP com [P341] para assinatura do contrato.
    - MR
      - MR
        - Status: [P233]
      - [P302] de cálculo de emissões
        - Status: [P233]
    - Contrato ainda não assinado entre J6 e RINA
    - [P341] pediu revisão dos verificadores disponíveis.
    - Checar prazos vigentes do CDM. [P130] com canais oficiais.
    - [P678] B:  AENOR sinalizou nos contatos iniciais que não tinha equipe disponível. FUP com [P341] para verificar desistência com RINA e inicio de contato com AENOR.
  - Relatório de [P2] [Aquapolo]
    - [P134] enviaram o relatório da versão final do RAS completo. Após, faremos a editoração com revisão interna simultânea.
    - Término do relatório inteiro em janeiro.
    - Férias [P772] - 5 de janeiro
    - [P370] definição da revisão da materialidade. [P237] como faremos em 2026.
  - EVTE - [Fazenda União]
    - [P306] com [P138] (GBF): proposta de valor da 2 parcela. [P361] contra proposta.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - [P332] planilha GHG.
    - [P20] do formulário casa-trabalho realizada.
    - Comunicação com Cosmos: destacar que trabalho só será concluído com uso da planilha GHG nova e confirmar conclusão do formulário casa-trabalho. CA via Whatsapp. AC por e-mail.
    - Cosmos devendo parcela. AC esperar resolução de problema de pagamento para mandar e-mail.
    - MV revisará relatório após conclusão.
  - Relatório de impacto socioambiental [BRLig]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:165ee8ba-950e-8329-ae93-8188bf048390')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:d82ee8ba-950e-83b3-868b-8157cf1ebda1')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [Lanxess]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109]
      - [P69] revisão
    - Anos: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
      - [P222] até  o fim do ano. GS, AC e MV.
      - Rodar formulário de 2025.
    - VN finalizado.
    - [P343] cruzada entre MV, AC e GS.
  - [P67] de [P3] [CTA] e Inventário
  - J6 Energia
    - Contrato
      - RINA enviou o contrato com alterações.
      - [P636] FUP com [P341] para assinatura do contrato.
    - MR
      - MR
        - Status: [P233]
      - [P302] de cálculo de emissões
        - Status: [P233]
    - Contrato ainda não assinado entre J6 e RINA
    - [P341] pediu revisão dos verificadores disponíveis.
    - Checar prazos vigentes do CDM. [P130] com canais oficiais.
  - Relatório de [P2] [Aquapolo]
    - CA fez FUP com [P772] cobrando documentos sobre crédito de água.
    - Há um projeto em discussão sobre créditos de água no Brasil.
    - [P134] terminarão revisões esta semana. Após, faremos a editoração com revisão interna simultânea.
    - Término do relatório em janeiro.
    - Férias [P772] - 5 de janeiro
  - EVTE - [Fazenda União]
    - Minuta do MOU enviado para GBF. Sem retorno.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - [P332] planilha GHG.
    - [P20] do formulário casa-trabalho realizada.
      - Entrega prevista: Janeiro. [P78] prazo com [P793] por email.
      - 9 respostas até agora. [P80] se faltam ainda.
    - Comunicação com Cosmos: destacar que trabalho só será concluído com uso da planilha nova e confirmar conclusão do formulário casa-trabalho.
  - Relatório de impacto socioambiental [BRLig]
    - [P69] fim do ano para envio de informações pendentes.
    - [P142] dados após fim do ano.
  - [P178] de valor justo para crédito de carbono [Ambipar]
    - Pagamento pendente: Ambipar está insolvente.
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:d82ee8ba-950e-83b3-868b-8157cf1ebda1')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:263ee8ba-950e-836f-a6b6-01d718d55379')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [Lanxess]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109]
      - [P69] revisão
    - Anos: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
      - [P222] até  o fim do ano. GS, AC e MV
      - [P479] reunião MV, GS e AC.
      - Rodar formulário de 2025.
  - [P67] de [P3] [CTA] e Inventário
  - J6 Energia
    - Contrato
      - RINA enviou o contrato com alterações.
      - [P636] FUP com [P341] para assinatura do contrato.
    - MR
      - MR
        - Status: [P233]
      - [P302] de cálculo de emissões
        - Status: [P233]
    - Contrato ainda não assinado entre J6 e RINA
    - [P130] com [P341] como extrai informações do sistema para site visit.
    - CA fará fup com [P643].
    - [P529] viagens em 2026. [P254] calendário.
  - Relatório de [P2] [Aquapolo]
    - [P759] enviada para ao designers
    - [P611] fazendo capitulo de governança.
    - Capítulo de futuro: CA confirmará com [P772] quais informações adicionar.
    - [P361] últimas revisão completa e enviaremos tudo para editoração. [P629] simultâneo: Aquapolo e [P134].
    - Para editoração: somente texto. [P629] após retorno dos designers. A ser ponderado.
    - CA fez FUP com [P772] cobrando documentos sobre crédito de água.
    - 2 parte do drive disponível para os designers.
    - [P613] designers: essa semana. [P305] parte. [P74] do editável.
  - EVTE - [Fazenda União]
    - Minuta do MOU enviado para GBF. Sem retorno.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - [P302]:  desenvolver planilha Apsis.
    - [P332] planilha GHG.
    - [P20] do formulário casa-trabalho: quinta feira, 15h.
      - Entrega prevista: Janeiro. [P78] prazo com [P793] por email.
      - 9 respostas até agora. [P80] se faltam ainda.
  - Relatório de impacto socioambiental [BRLig]
    - [P69] fim do ano para envio de informações pendentes.
  - [P178] de valor justo para crédito de carbono [Ambipar]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:263ee8ba-950e-836f-a6b6-01d718d55379')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:4b2ee8ba-950e-82a0-986f-81db83b68988')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [Lanxess]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109]
      - [P69] revisão
    - Anos: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
    - [P222] até  o fim do ano. GS, AC e MV
    - Criação e otimização de planilha para confecção de inventário
  - [P67] de [P3] [CTA] e Inventário
  - J6 Energia
    - Contrato
      - RINA enviou o contrato com alterações.
      - [P636] FUP com [P341] para assinatura do contrato.
    - [P815] [P635]
      - [P243]: dez/25
    - MR
      - MR
        - Status: [P233]
      - [P302] de cálculo de emissões
        - Status: [P233]
    - Contrato ainda não assinado entre J6 e RINA
    - [P130] com [P341] como extrai informações do sistema para site visit.
  - Relatório de [P2] [Aquapolo]
    - [P759] enviada para ao designers
    - [P611] fazendo capitulo de governança.
    - Capítulo de futuro: CA confirmará com [P772] quais informações adicionar.
    - [P629] de partes pendentes hoje.
    - [P361] últimas revisão completa e enviaremos tudo para editoração. [P629] simultâneo: Aquapolo e [P134].
    - Para editoração: somente texto. [P629] após retorno dos designers. A ser ponderado.
  - EVTE - [Fazenda União]
    - Minuta do MOU enviado para GBF. Sem retorno.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - [P302]:  desenvolver planilha Apsis.
    - [P332] planilha GHG.
    - Agendamento da apresentação do formulário casa-trabalho: quinta feira, 15h.
  - Relatório de impacto socioambiental [BRLig]
    - [P384] e-mail com pendencias dos indicadores financeiros
      - FUP e-mail [P627] (24/11 a 28/11)
      - [P69] fim do ano para envio de informações pendentes.
    - Esqueleto geral do relatório já está montado.
      - Apresentar formato na semana (24/11 a 05/12)
    - [P69] término de ano.
  - [P178] de valor justo para crédito de carbono [Ambipar]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:4b2ee8ba-950e-82a0-986f-81db83b68988')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:c6cee8ba-950e-830f-aaa1-01a27d9ece11')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [Lanxess]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109]
      - [P69] revisão
    - Anos: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
      - [P222] até  o fim do ano. GS, AC e MV.
      - Rodar formulário de 2025.
    - [P70] anual em VN e fontes móveis. [P438] maior tempo.
    - [P34] de entendermos demanda de trabalho antes de iniciar os trabalhos. [P153] devido ao aumento previsto de trabalho em 2025. [P573] também a necessidade de otimização de tempo e automatização em serviços de inventário.
  - [P67] de [P3] [CTA] e Inventário
  - J6 Energia
    - Contrato
      - RINA enviou o contrato com alterações.
      - [P636] FUP com [P341] para assinatura do contrato.
    - MR
      - MR
        - Status: [P233]
      - [P302] de cálculo de emissões
        - Status: [P233]
    - Contrato ainda não assinado entre J6 e RINA
    - [P771] cobrou [P643]. [P137] cobrou sobre orçamento JPF. [P617] sem envios.
    - Checar prazos vigentes do CDM. [P130] com canais oficiais.
  - Relatório de [P2] [Aquapolo]
    - [P361] últimas revisão completa e enviaremos tudo para editoração. [P629] simultâneo: Aquapolo e [P134].
    - Para editoração: somente texto. [P629] após retorno dos designers. A ser ponderado.
    - CA fez FUP com [P772] cobrando documentos sobre crédito de água.
    - [P384] parte 1 e 2 para [P772] na semana passada. [P900] fazer os comentários e revisar no ppt do drive compartilhado.
    - [P772] abriu possibilidade de fazermos RAS de 2025 já no primeiro semestre de 2026.
    - Precisarão fazer a revisão da materialidade. [P197] também.
    - [P203] de slogan ainda pendente.
    - Email para [P772]: ser enviado amanhã. 23/12.
    - Alteração da linha do tempo. [P306] com designers.
    - Férias [P772] - 5 de janeiro
  - EVTE - [Fazenda União]
    - Minuta do MOU enviado para GBF. Sem retorno.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - [P302]:  desenvolver planilha Apsis.
    - [P332] planilha GHG.
    - [P20] do formulário casa-trabalho realizada.
      - Entrega prevista: Janeiro. [P78] prazo com [P793] por email.
      - 9 respostas até agora. [P80] se faltam ainda.
    - Comunicação com Cosmos: destacar que trabalho só será concluído com uso da planilha nova.
  - Relatório de impacto socioambiental [BRLig]
  - [P178] de valor justo para crédito de carbono [Ambipar]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:c6cee8ba-950e-830f-aaa1-01a27d9ece11')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:96dee8ba-950e-835e-bdd9-815c26e71997')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [Lanxess]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109]
      - [P69] revisão
    - Anos: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
    - [P222] até  o fim do ano. GS, AC e MV
    - Criação e otimização de planilha para confecção de inventário
  - [P67] de [P3] [CTA] e Inventário
  - J6 Energia
    - Contrato
      - RINA enviou o contrato com alterações
      - [P636] FUP com [P341] para assinatura do contrato
    - [P815] [P635]
      - [P243]: dez/25
    - MR
      - MR
        - Status: [P233]
      - [P302] de cálculo de emissões
        - Status: [P233]
    - Contrato ainda não assinado entre J6 e RINA
    - [P130] com [P341] como extrai informações do sistema para site visit.
  - Relatório de [P2] [Aquapolo]
    - [P759] enviada para ao designers
    - [P611] fazendo capitulo de governança.
    - Capítulo de futuro: CA confirmará com [P772] quais informações adicionar.
  - EVTE - [Fazenda União]
    - Minuta do MOU enviado para GBF. Sem retorno.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - [P302]:  desenvolver planilha Apsis.
    - [P332] planilha GHG.
  - Relatório de impacto socioambiental [BRLig]
    - [P384] e-mail com pendencias dos indicadores financeiros
      - FUP e-mail [P627] (24/11 a 28/11)
      - [P69] fim do ano para envio de informações pendentes.
    - Esqueleto geral do relatório já está montado.
      - Apresentar formato na semana (24/11 a 05/12)
  - [P178] de valor justo para crédito de carbono [Ambipar]
    - Pagamento pendente: Ambipar está insolvente.
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:96dee8ba-950e-835e-bdd9-815c26e71997')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:9beee8ba-950e-823b-ab63-81350507a8e7')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109]
      - [P69] revisão
    - Anos: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
    - [P222] até  o fim do ano. GS, AC e MV
  - [P67] de [P3] [CTA] e Inventário
    - Pausado
  - J6 Energia
    - Contrato
      - RINA enviou o contrato com alterações
      - [P636] FUP com [P341] para assinatura do contrato
    - [P815] [P635]
      - [P243]: dez/25
    - MR
      - MR
        - Status: [P233]
      - [P302] de cálculo de emissões
        - Status: [P233]
    - Contrato ainda não assinado entre J6 e RINA
    - [P130] com [P341] como extrai informações do sistema para site visit.
  - Relatório de [P2] [Aquapolo]
    - [P629] partes finalizadas -  Aquapolo
      - [P861]: 17/11/2024
      - [P595] [P772]:
        - [P130] mensagem da liderança
        - Depoimentos: [P91], [P374] de [P683]
    - [P629] documentação: [P134]
      - Partes finalizadas
      - [P861]: 17/11/2024
      - [P420] reunião após envio dos dados
    - Depoimentos
      - [P212] ainda, fora da [P611].
      - [P629] para designer e aquapolo - [P622] 2 (antigas 3 e 4)
  - EVTE - [Fazenda União]
    - Minuta do MOU enviado para GBF. Sem retorno.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - Etapa: [P36] de dados
      - [P384] e-mail com os comentários que forem enviados
      - [P479] reunião semana que vem (24/11 a 28/11) para tirar dúvidas
      - [P617] sem retorno.
  - Relatório de impacto socioambiental [BRLig]
    - [P384] e-mail com pendencias dos indicadores financeiros
    - Esqueleto geral do relatório já está montado.
  - [P178] de valor justo para crédito de carbono [Ambipar]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:9beee8ba-950e-823b-ab63-81350507a8e7')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:12eee8ba-950e-82cf-86bb-01ea52648818')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - [P356] atividades.
    - 2023 finalizado e 2024 pendente de tratamento de dados.
  - [P67] de [P3] [CTA] e Inventário
    - Pausado
  - J6 Energia
    - [P862] há certificados de calibração anteriores a jul/2015.
    - FUP com [P341] feito.
    - Comunicação do MMA direto com a UNFCCC.
    - Buscaremos com as auditores não ter o desconto por falta de calibração por terceiros: veio com com garantia de calibração de fábrica.
    - MR: tese sem desconto.
    - [P343] do MR em andamento.
    - [P236]: verificar impacto de adicionalidade de projetos de energia com renovação de energia termoeletrica a carvão no Brasil.
  - Relatório de [P2] [Aquapolo]
    - [P629] das partes conjuntas  - ficará abaixo do prazo dos designers
    - [P629] para designer e aquapolo - [P622] 2 (antigas 3 e 4)
    - [P370] a escrita da parte 1.
    - [P786] semana entrevista com [P611], de operação.
    - Slogan ainda pendente.
    - Nome dos capítulos ainda não definidos.
    - [P653] reunião para coleta de depoimento com carol - Aquapolo
      - [P100] frases de depoimentos conforme reunião com [P611] (aquapolo)
    - Capital IQ - [P130] [P471] - se há outros ratings negativos para Aquapolo
    - Próximos passos:
      - diversificar carteira de clientes e de serviços
  - EVTE - [Fazenda União]
    - Minuta do MOU enviado para GBF. Sem retorno.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
    - Esqueleto geral do relatório que já está montado.
    - [P349] enviar para o cliente o esqueleto já pronto e sinalizar a necessidade de envio dos indicadores financeiros (talvez estejam esperando o fim do ano).
    - [P457] se traremos ou se temos histórico anterior de dados financeiros da empresa.
  - [P178] de valor justo para crédito de carbono [Ambipar]
    - Pagamento pendente: Ambipar está insolvente.
    - [P296] pausado, sem retorno do [P644].
    - Alteração de data base não alterou resultados negativos.
    - Situação está sob cuidados do jurídico. [P387] incluídos na lista dos credores da Ambipar.
    - O que nos é devido é apenas a primeira parcela: 50% do total.
  - [P31] IFRS [Aço Verde Brasil]
    - Realizar diagnóstico da capacidade da empresa de cumprir as exigências da norma.
    - Ao fim do diagnóstico, realizar plano de ação com atividades a serem estruturadas para realização do S1 e S1 e também montar uma estrutura básica do relatório.
    - [P728] externo da Apsis: relatório será assegurado e é necessário apoio no relato correto das informações e seu reporte.
    - Equipe de Consultoria [P37] ([P627] [P375]) e de [P255] ([P477]).
    - Ler CBPS 1 e CBPS 2, ler relatório [P498].
    - Há um série de webinars do IFRS S1 S2 no site do IFRS.
    - AVB solicitou a confecção de contrato. [P11] e esperando assinatura para início. [P484] aproximadamente uma semana depois da [P85] para [P346].
    - [P236]: durante a execução, entender pendências da AVB com o IFRS que podem ser cumpridas com o apoio de serviços da Apsis.
    - [P419] processos de CE para o escopo do S1 e S2.
    - [P9] financeira e de sustentabilidade feita pela Carbon de forma complementada por [P68] contábil
    - [P728] de A.C. para preparar relatório pronto para auditoria e demonstrações financeiras.
    - [P237] documentos pendentes para serem apresentados no kickoff.
    - [P74] revisar o questionário e planilhas do S1 e S2, para definir escopo das planilhas e entrevistas.
    - Contrato ainda não assinado. [P346] provável para semana seguinte.
    - Reunião de [P739] hoje para definição da metodologia do diagnóstico e organização do trabalho.
    - [P346]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:12eee8ba-950e-82cf-86bb-01ea52648818')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:524ee8ba-950e-834e-bfdc-0111ea79ebd6')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109]
      - [P69] revisão
    - Anos: 2024
      - Etapa: [P70] de dados
      - Status: Em andamento
  - [P67] de [P3] [CTA] e Inventário
    - Pausado
  - J6 Energia
    - Contrato
      - RINA enviou o contrato com alterações
      - [P636] FUP com [P341] para assinatura do contrato
    - [P815] [P635]
      - [P243]: dez/25
    - MR
      - MR
        - Status: [P233]
      - [P302] de cálculo de emissões
        - Status: [P233]
  - Relatório de [P2] [Aquapolo]
    - [P629] partes finalizadas -  Aquapolo
      - [P861]: 17/11/2024
      - [P595] [P772]:
        - [P130] mensagem da liderança
        - Depoimentos: [P91], [P374] de [P683]
    - [P629] documentação: [P134]
      - Partes finalizadas
      - [P861]: 17/11/2024
      - [P420] reunião após envio dos dados
    - Depoimentos
      - [P629] para desig/ner e aquapolo - [P622] 2 (antigas 3 e 4)
  - EVTE - [Fazenda União]
    - Minuta do MOU enviado para GBF. Sem retorno.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - Etapa: [P36] de dados
      - [P384] e-mail com os comentários que forem enviados
      - [P479] reunião semana que vem (24/11 a 28/11) para tirar dúvidas
  - Relatório de impacto socioambiental [BRLig]
    - [P384] e-mail com pendencias dos indicadores financeiros
      - FUP e-mail [P627] (24/11 a 28/11)
    - Esqueleto geral do relatório já está montado.
      - Apresentar formato na semana (24/11 a 05/12)
      - [P457] se traremos ou se temos histórico anterior de dados financeiros da empresa.
  - [P178] de valor justo para crédito de carbono [Ambipar]
    - Pagamento pendente: Ambipar está insolvente.
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:524ee8ba-950e-834e-bfdc-0111ea79ebd6')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:743ee8ba-950e-83bc-95b2-81be6cc4970d')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - [P356] atividades.
    - 2023 finalizado e 2024 pendente de tratamento de dados.
  - [P67] de [P3] [CTA] e Inventário
    - Pausado
  - J6 Energia
    - [P862] há certificados de calibração anteriores a jul/2015.
    - FUP com [P341] feito.
    - Comunicação do MMA direto com a UNFCCC.
    - Buscaremos com as auditores não ter o desconto por falta de calibração por terceiros: veio com com garantia de calibração de fábrica.
    - MR: tese sem desconto.
  - Relatório de [P2] [Aquapolo]
    - [P629] das partes conjuntas  - ficará abaixo do prazo dos designers
    - [P629] para designer e aquapolo - [P622] 2 (antigas 3 e 4)
    - [P370] a escrita da parte 1.
    - [P786] semana entrevista com [P611], de operação.
    - Slogan ainda pendente.
    - NOme dos capítulos ainda não definidos.
    - Depoimentos
      - [P23] feminina: [P611]
      - [P374] de turno: outra pessoa ou usar da própria [P611].
      - Identificar outros temas que tem necessidade de depoimentos.
  - EVTE - [Fazenda União]
    - Minuta do MOU enviado para GBF. Sem retorno.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
    - Esqueleto geral do relatório que já está montado.
    - [P349] enviar para o cliente o esqueleto já pronto e sinalizar a necessidade de envio dos indicadores financeiros (talvez estejam esperando o fim do ano).
  - [P178] de valor justo para crédito de carbono [Ambipar]
    - Pagamento pendente: Ambipar está insolvente.
    - [P296] pausado, sem retorno do [P644].
    - Alteração de data base não alterou resultados negativos.
    - Situação está sob cuidados do jurídico. [P387] incluídos na lista dos credores da Ambipar.
    - O que nos é devido é apenas a primeira parcela: 50% do total.
  - [P31] IFRS [Aço Verde Brasil]
    - Realizar diagnóstico da capacidade da empresa de cumprir as exigências da norma.
    - Ao fim do diagnóstico, realizar plano de ação com atividades a serem estruturadas para realização do S1 e S1 e também montar uma estrutura básica do relatório.
    - [P728] externo da Apsis: relatório será assegurado e é necessário apoio no relato correto das informações e seu reporte.
    - Equipe de Consultoria [P37] ([P627] [P375]) e de [P255] ([P477]).
    - Ler CBPS 1 e CBPS 2, ler relatório [P498].
    - Há um série de webinars do IFRS S1 S2 no site do IFRS.
    - AVB solicitou a confecção de contrato. [P11] e esperando assinatura para início. [P484] aproximadamente uma semana depois da [P85] para [P346].
    - [P236]: durante a execução, entender pendências da AVB com o IFRS que podem ser cumpridas com o apoio de serviços da Apsis.
    - [P419] processos de CE para o escopo do S1 e S2.
    - [P237] documentos pendentes para serem apresentados no kickoff.
    - [P74] revisar o questionário e planilhas do S1 e S2, para definir escopo das planilhas e entrevistas.
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:743ee8ba-950e-83bc-95b2-81be6cc4970d')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:093ee8ba-950e-83c5-ac47-0115f209cbbd')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [Apsis]
    - [P356] atividades.
  - [P67] de [P3] [CTA] e Inventário
    - Pausado
  - J6 Energia
    - [P799] ainda não respondeu sobre impacto da mudança do nome.
    - [P614] ainda não enviou certificados dos medidores.
    - FUP com [P341] esta semana.
    - Comunicação do MMA direto com a UNFCCC.
    - Há portal dos projetos no site MMA.
  - Relatório de [P2] [Aquapolo]
    - [P629] das partes conjuntas  - ficará abaixo do prazo dos designers
  - EVTE - [Fazenda União]
    - Minuta do MOU enviado para GBF. Sem retorno.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
    - [P370] escrita do relatório, com a esqueleto do relatório que já montada.
  - [P178] de valor justo para crédito de carbono [Ambipar]
    - Pagamento pendente: Ambipar está insolvente.
    - [P296] pausado, sem retorno do [P644].
    - Alteração de data base não alterou resultados negativos.
  - [P31] IFRS [Aço Verde Brasil]
    - Realizar diagnóstico da capacidade da empresa de cumprir as exigências da norma.
    - Ao fim do diagnóstico, realizar plano de ação com atividades a serem estruturadas para realização do S1 e S1 e também montar uma estrutura básica do relatório.
    - [P728] externo da Apsis: relatório será assegurado e é necessário apoio no relato correto das informações e seu reporte.
    - Equipe de Consultoria [P37] ([P627] [P375]) e de [P255] ([P477]).
    - Ler CBPS 1 e CBPS 2, ler relatório [P498].
    - Há um série de webinars do IFRS S1 S2 no site do IFRS.
    - AVB solicitou a confecção de contrato. [P11] e esperando assinatura para início. [P484] aproximadamente uma semana depois da [P85] para [P346].
  - Propostas
  Interno - Apsis Carbon
    - Há metodologia possível para TecVerde na [P143].
    - Capítulo de livro
      - [P236] CA: [P574] e fazer um comparativo entre o GRI e o oq há obrigatório a nível federal e estadual para o tema ESG.
      - Lados positivos do IFRS obrigatório as SA e a disseminação. O que pode ser melhorado.
      - [P795] em regulamentação para ESG.
      - [P613]: 22/10
      - 15 a 20 páginas.
    - Relacionamento com IPES
    - [P67] de prospecção
    - Importância: nos mantermos atualizados, sobretudo com notícias, a respeito de tópicos novos: S1S2, etc…
    - Propostas:
    - [P848] a solução: [P388]
    - [P388]
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:093ee8ba-950e-83c5-ac47-0115f209cbbd')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:3b3ee8ba-950e-83bb-95fb-01e9d462b72d')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
  - Inventário GEE [Apsis]
    - [P356] atividades.
  - [P67] de [P3] [CTA] e Inventário
    - GHG abriu ciclo de 2026 com cronograma. [P575] até 15/04.
    - [P263] ao [P606] a data prazo da adesão.
  - Relatório de [P2] [CTA]
    - Projeto fechado.
  - J6 Energia
    - [P799] ainda não respondeu sobre impacto da mudança do nome.
    - [P130] se ele reportou algo sobre o MR ou apenas a planilha: apenas planilha.
    - [P614] ainda não enviou certificados dos medidores.
    - [P420] reunião com [P614].
    - [P595] RINA.
    - Reunião de atualização - GS e CA. - 21/10 - 9h30.
  6.  Relatório de [P2] [Aquapolo]
    - Entrevista com diretoria [P307] dia 13/10.
    - Entrevista com diretor [P241] ainda pendente. [P684] los. ([P236] - [P510] privatização e aquisição EMAE e planejamento estratégico)
    - E-mail de pendências não enviado.
    - Reunião com MV - 13/10. [P256] fato como oportunidade.
    - CA revisando parte 3.
    - [P236] de fazermos mais rápido que o RAS CTA. [P198] parece só dar atenção no relatório final para revisar.
    - 23/10 - 9h30 - Reunião de revisão.
    - Matéria sobre riscos de seca em SP possui insights sobre escrita do relatório e riscos climáticos.
    - Reunião com MV sobre  erros no inventário GHG -  30/10- 9h30.
  - EVTE - [Fazenda União]
    - Minuta do MOU enviado para GBF. Sem retorno.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - Entregaremos apenas o número, sem relatório.
    - Cálculo preliminar das emissões atualizada. [P655] baixo, abaixo de 0,1 tCO2/ton produzida.
    - [P793] está preparando material pendente para envio.
  - Relatório de impacto socioambiental [BRLig]
    - Estrutura do documento montada: com documentos e informações que já possuem.
    - MV: sugestão de adiantar o máximo antes de iniciar as confecções de inventários no fim do ano.
    - Após o fim do ano, preencher lacunas de informações.
    - CA: empresas possuem portais com dados de distribuição salarial nos sites, em formato padronizado. [P237] se há algum benefício/obrigação para algum setor/ empresa.
  - [P178] de valor justo para crédito de carbono [Ambipar]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]
  - [P20] de viabilidades - GS - Só atualizar dados.'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:3b3ee8ba-950e-83bb-95fb-01e9d462b72d')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:72bee8ba-950e-8331-b16c-0142e960ef76')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
  - Inventário GEE [Apsis]
    - [P356] atividades
  - [P67] de [P3] [CTA] e Inventário 24
  - Relatório de [P2] [CTA]
    - Versão completa 100% entregue para conferência, inclusive peças de divulgação.
    - Projeto fechado.
  - J6 Energia
    - [P799] ainda não respondeu sobre impacto da mudança do nome. [P248] cobrou [P576].
    - [P130] se ele reportou algo sobre o MR ou apenas a planilha: apenas planilha.
    - [P614] ainda não enviou certificados dos medidores.
    - [P420] reunião com [P614].
    - [P595] RINA.
  7.  Relatório de [P2] [Aquapolo]
    - Entrevista com diretoria jurídica/compliance dia 13/10.
    - Entrevista com diretor [P241] ainda pendente. [P684] los. ([P236] - [P510] privatização e aquisição EMAE e planejamento estratégico)
    - E-mail de pendências não enviado.
    - [P237] e expor inconsistências do GEE anterior. Reunião com MV - 13/10. [P256] fato como oportunidade.
    - [P237] com [P772] oq pode ser tratado na reunião com [P247].
    - Ajustar cronograma
  - EVTE - [Fazenda União]
    - Minuta do MOU enviado para GBF. Sem retorno.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - Entregaremos apenas o número, sem relatório.
    - Cálculo preliminar das emissões atualizada. [P655] baixo, abaixo de 0,1 tCO2/ton produzida.
  - Relatório de impacto socioambiental [BRLig]
    - Estrutura do documento montada: com documentos e informações que já possuem.
    - IBASE: entender as principais instruções para preenchimento e repassar ao cliente. [P237] também o regime dos empregados e estrutura da empresa. - [P199] CRC.
  - [P178] de valor justo para crédito de carbono [Ambipar]
    - Pagamento pendente: Ambipar está insolvente.
    - [P296] pausado, sem retorno do [P644].
    - Alteração de data base não alterou resultados negativos.
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:72bee8ba-950e-8331-b16c-0142e960ef76')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:9aeee8ba-950e-83a4-b16e-0146ff275c74')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
  - Relatório de [P2] [CTA]
    - Versão completa entregue para conferência. Em ajustes finais.
    - [P328] enviarão versão traduzida diagramada hoje.
    - [P243]: conclusão nesta semana.
  - J6 Energia
    - FUP: MR e  medidores.
    - [P799] devendo resposta do contrato com as correções sugeridas pela [P248] (J6).
    - [P799] ainda não respondeu sobre impacto da mudança do nome.
  7.  Relatório de [P2] [Aquapolo]
    - Entrevista com diretoria jurídica dia 13/10.
    - Entrevista com diretor [P241] ainda pendente.
    - [P499] comprou EMAE. [P200] está sendo judicializada.
    - E-mail de pendências não enviado.
      - AC verificará ajustes a serem feitos neste email.
    - Rascunhar frases importantes que podem ser repetidas no relatório.
    - Enviaram indicadores pendentes.
    - CA está estruturando banco das frase/palavras mais comuns entre os RAS benchmark.
    - [P34] de definição com designers do cronograma de confecção dos textos.
    - Projeto editorial editável não enviado.
    - Inventário GEE Aquapolo errado. MV revisou. [P349] comentar para sugerir confecção de inventário.
  - EVTE - [Fazenda União]
    - Minuta do MOU enviado para GBF. Sem retorno.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - Entregaremos apenas o número, sem relatório.
  - [P617] não enviaram dados preliminares do primeiro semestre para que façamos o inventário dos primeiros 6 meses.
  - Relatório de impacto socioambiental [BRLig]
    - Enviaram as licenças ambientais e de operação. [P901] como relatório anual feito por outra consultoria, com documento preliminares.
    - Usaremos tais documentos como insumo para confeccionar o relatório socioambiental, entretanto não teremos espaço para fazer novos entregáveis.
    - [P385] enviada é de 2022. [P777]-se verificar se há espaço para Apsis atuar nas próximas licenças, mas o escopo do trabalho é diferente do que estamos acostumados.
    - [P862] conhecemos o órgão ambiental e as normas do Pará, mas pode-se estudar a viabilidade financeira de atuar nesses trabalhos.
    - Necessitará de ART.
    - CA e [P811]: [P811] não tem conhecimento sobre esse relatório.
    - Preenchimento do relatório IBASE por Apsis Carbon, para evitar que zerem todos os dados de primeira.
  - [P178] de valor justo para crédito de carbono [Ambipar]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]
  - Peru - AC'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:9aeee8ba-950e-83a4-b16e-0146ff275c74')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:e40ee8ba-950e-83ed-9224-0194f768af12')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
    - [P67] de prospecção: concorrentes da CTA. [P606] pode nos promover dentro do [P111].
  - Relatório de [P2] [CTA]
    - Versão completa entregue para conferência entregue.
    - [P137] com tradução para inglês.
  - J6 Energia
    - Proposta bilingue enviada.
  7.  Relatório de [P2] [Aquapolo]
    - Definido o índice e temas a serem tratados, bem como o número de páginas para cada subcapítulo.
    - Definido o prazo de 1 semana para cada subcapítulo.
    - Entrevista com diretor da [P499]-[P241] pendente.
  - EVTE - [Fazenda União]
    - Contrato aprovado por [P577] e LP. [P247] irá enviar e agendar próxima conversa com GBF.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - FUP realizado quanto ao envio de dados pendentes.
    - Seguirão com inventário.
  - Relatório de impacto socioambiental [BRLig]
    - [P302] com status dos dados a serem colocados no relatório enviada, inclusive com o que eles possuem encaminhados em anexo.
    - Iremos orçar a confecção dos documentos que a Apsis poderá desenvolver.
  - [P178] de valor justo para crédito de carbono [Ambipar]
    - [P349] colocar a database dentro do período dos créditos da amostra que temos da MSCI.
    - Nova metodologia: amortecimento exponencial, no anexo dos cálculos dos relatórios.
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]
  - Everland
  - Reunião quinta às 15h para tratar sobre os projetos em andamento.'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:e40ee8ba-950e-83ed-9224-0194f768af12')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:efeee8ba-950e-820f-8d8c-81e5c0792c4c')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
  - Relatório de [P2] [CTA]
    - Versão completa entregue para conferência. [P617].
  - J6 Energia
    - Proposta bilingue enviada.
    - [P248] (jurídico da J6) analisou contrato e solicitou algumas mudanças.
    - próximos passo: reunião jurídico RINA x jurídico J6.
    - Atenção à mudança do legal name e impacto na verificação. [P236] de sempre citar nome nove e antigo nos arquivos.
    - FUP: MR e  medidores.
  7.  Relatório de [P2] [Aquapolo]
    - Entrevista com diretor da [P499]-[P241] pendente.
    - Reunião 29/09 -  [P201] iniciados.
      - Slogan
      - Títulos dos capitulos
      - Banco de frases
      - [P371] do que já está em andamento
      - Distribuição dos capitulos.
    - E-mail de pendências não enviado.
    - Rascunhar frases importantes que podem ser repetidas no relatório.
  - EVTE - [Fazenda União]
    - Minuta do MOU enviado para GBF. Sem retorno.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - [P413] com [P793]:
      - Daniel está ansioso para ter resultados.
      - Daremos resultados informais preliminares.
      - [P680] que recebermos informações, faremos este cálculo para primeiro semestre.
  - Relatório de impacto socioambiental [BRLig]
    - Iremos orçar a confecção dos documentos que a Apsis poderá desenvolver.
    - Reunião de acompanhamento: entender quais propostas poderão ser desenvolvidas a partir dos documentos pendentes.
    - 30/09: 13h
  - [P178] de valor justo para crédito de carbono [Ambipar]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]
  - Peru - AC
  - [P315]+21 e [P139] - MV
  - [P625] Flora e IFM [P143] - GS'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:efeee8ba-950e-820f-8d8c-81e5c0792c4c')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:062ee8ba-950e-8335-ab9b-81ef54158476')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
  - Relatório de [P2] [CTA]
    - [P327] terminada e diagramação do resumo executivo bilingue.
    - Entrega essa semana - 15/09 a 19/09
  - J6 Energia
    - Solicitado à RINA que o contrato seja feito bilíngue. [P341] propôs fazer em português e depois passar por um tradução.
    - [P815] visit será feito apenas após publicação do MR no CDM. [P10] cairá no período de chuvas, entre outubro e novembro.
  7.  Relatório de [P2] [Aquapolo]
    - [P632] entrevista com o diretor [P241], representante da [P499].
    - Aquapolo escolheu a capa.
    - [P34] de definirmos as atribuições de cada integrante da equipe no RAS - 16/09
  - EVTE - [Fazenda União]
    - Minuta do contrato (sobre interesse no projeto e atualização contínua de cenário e mapa de risco) em aprovação.
    - [P249] saiu do projeto e de todos os projetos com a GBF.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - Daniel (CEO) gostaria de fazer a pegada de carbono da casa construída. [P641] caso, seria necessário uma ACV, muito mais complexa. [P881] sugerido calcularmos um indicador de tCO2 por tonelada produzida.
    - [P10] farão RPE e verificação.
  - Relatório de impacto socioambiental [BRLig]
    - [P862] retornaram a planilha de pendências enviadas.
    - CA fará FUP.
  - [P178] de valor justo para crédito de carbono [Ambipar]
    - Valores negativos para estimativas mesmo para REDD.  [P130] com [P614] [P511] (15h) a possibilidade de alteração do intercepto.
  - Propostas
  Interno - Apsis Carbon
    - Fim do ano: oportunidade de prospecção para inventários GHG.
  # Projetos
  - JPF Parakanã
  - [P652] [P229]
  - Everland'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:062ee8ba-950e-8335-ab9b-81ef54158476')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:1d4ee8ba-950e-82b6-b319-014b1c7aacb5')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - FUP com [P358] para resposta do e-mail e verificar se quer apresentação de resultados.
  - Inventário GEE [Apsis]
    - Pausado.
  - [P67] de [P3] [CTA] e Inventário 24
    - Estruturação das soluções no início de setembro - 01/09/2025
  - Relatório de [P2] [CTA]
    - [P327] ficará pronta essa semana.
    - [P862] viram a versão definitiva do resumo executivo, então pode incorrer em revisões.
    - [P186] já está fazendo as peças de divulgação.
  - J6 Energia
    - Solicitamos R$ 50.300 de valor da propostas e também um cronograma mais completo.
    - [P343] da planilha nova
  7.  Relatório de [P2] [Aquapolo]
    - Projeto editorial apresentado.
    - Versão do novo projeto editorial ([P797]) - incluir no drive.
    - Reunião - 09/09
  - EVTE - [Fazenda União]
    - Ajuste interno da proposta pendente.
    - Atualizaremos informalmente por 2 anos, em caso de novidades que impactem o processo.
    - Preocupados em não fazermos o projeto caso se torne viável.
      - [P32] não é um critério bem definido
      - Deixaremos aberto em contrato para que a definição da viabilidade seja feita após novidades que alterem as condições do projeto.
    - [P343] do MOU (realizado pelo [P247]) - [P475] para [P249]
    - Reunião pré revisão do relatório - 09/09
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - [P613] para enviar documentos vencido.
    - [P34] de entender qual a necessidade do cliente, parecem precisar de um ACV.
  - Relatório de impacto socioambiental [BRLig]
    - CA fazendo FUP com [P627]. [P638] providenciando o checklist.
  - [P178] de valor justo para crédito de carbono [Ambipar]
    - Filtrar projetos que tiveram aumento de valor a longo do ano (2025) - REDD
      - [P130] no MSCI
    - [P763] em fechar a base de energia para futuramente ver os teste possíveis.
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]
  - Everland'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:1d4ee8ba-950e-82b6-b319-014b1c7aacb5')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:0b6ee8ba-950e-82e9-b003-018b414f1de3')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - FUP com [P358] para resposta do e-mail e verificar se quer apresentação de resultados.
    - [P343] da apresentação do relatório, com foco na análise de resultados ao longo do período.
  - Inventário GEE [Apsis]
    - Pausado.
  - [P67] de [P3] [CTA] e Inventário 24
    - Estruturação das soluções no início de setembro - 01/09/2025
    - [P22] das caracteristicas da CTA que já foram enviadas para outros projetos
      - Caldeiras (modelo, ano de fabricação)
      - Energia (qual empresa esta fornecendo)
      - Lenha
      - [P265] de tabaco
    - COMERC para conversar com a CTA - [P237] se tem fit.
      - Comerc fornece i-[P882], energia e caldeiras mais eficientes.
  - Relatório de [P2] [CTA]
  - [P88] interna feita.
  - MV traduziu 15/38 páginas.
  - Traduzir sumário executivo (semana que vem)
  - J6 Energia
    - RINA e [P246] enviaram proposta. [P246] não tem equipe brasileira e o idioma é uma barreira para J6.
    - [P875] que resolver a situação da razão social da J6 antes de prosseguir com verificações.
  7.  Relatório de [P2] [Aquapolo]
    - Restam as entrevistas para governança, compliance e jurídico.
    - Entregar projeto gráfico e editoral junto.
    - [P795] em circularidade da água, venda de sustentabilidade e como estão desenvolvendo a parte social(pessoas)
    - FUP para repostas pra apresentação do projeto gráfico + editorial
    - Projeto editorial: [P740] estrutura de outros RAS como exemplo, pensar estrutura que faça mais sentido
      - [P795] em valorizar pessoas, circularidade da água.
      - [P201] e itens do projeto editorial.
      - Referencial: RAS GS [P685]
  - EVTE - [Fazenda União]
    - Reunião 19/08 com [P249] e [P138]. [P20] da linha do tempo da Verra. [P202] a parte técnica mas questionaram não terem sido avisados. [P112] no desconto do valor.
    - Outras empresas ofereceram EVTE gratuito, no risco, e reduziu a percepção de valor do cliente quanto ao nosso relatório.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - [P22] de fontes e kickoff realizado.
    - Empresa muito jovem, desenvolvendo nova tecnologia de aclopamento de peças e pensando em produzir as impressoras nacionalmente.
    - Inventário é muito simples, são poucos funcionários em apenas um turno. O foco é não perder o cliente ao tentar desenvolver o inventário com equipe própria.
    - Limite do inventário é a fabrica mas possuem uma sala no escritório da [P770](necessário verificar como as emissões serão alocados no inventário.)
  - Relatório de impacto socioambiental [BRLig]
    - [P595] [P627] para verificar se checaram a lista de documentas enviadas.
  - [P178] de valor justo para crédito de carbono [Ambipar]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:0b6ee8ba-950e-82e9-b003-018b414f1de3')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:656ee8ba-950e-8212-968d-01df663c4654')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - Em editoração.
  - Inventário GEE [Apsis]
    - Segurar por uma semana devido a outras demandas.
    - [P20] dos resultados será unificada entre os dois anos.
  - [P67] de [P3] [CTA] e Inventário 24
    - Direcionamento da [P67] para carbono:
      - [P13] de projetos ALM com produtores de tabaco, aumento de eficiência e agricultura regenerativa.
        - Produtores possuem certa aversão à praticas regenerativas. [P846] mais cultural.
      - Em contato com ponto focal que tem know how em projetos sobre biochar.
      - CTA implementando à fundo perdido biodigestores(restos de plantação e pecuária).
    - [P298] de recuperação de nascentes podem ser usados para créditos de biodiversidade.
  - Relatório de [P2] [CTA]
    - CTA com entrega da análise deles atrasada. Após entrega pela CTA, revisão final da Apsis, entrega para designers e finalização. Relatório deverá ser traduzido.
    - [P327] do relatório: Entre MV e GS. [P203] final na próxima semana.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
    - Reunião interna com [P341]. [P479] reunião com [P341] para entender mudanças.
    - [P905] respondeu. [P862] poderá fazer proposta com razão social antiga. [P771] solicitou draft.
    - [P130] [P308] como DOE do MDL.
  7.  Relatório de [P2] [Aquapolo]
    - [P305] reunião com [P784] [P240](04/08). IA [P847].ia não funcionou durante toda a reunião.
    - Já começaremos a enviar os pontos chaves e palavras mais utilizadas para os designer conforme ocorram as entrevistas.
    - [P617] não foi definido se será alinhado ou em conformidade com o GRI. Por enquanto faremos alinhado.
    - Relatório de materialidade enviado é bem raso, mas está conforme o último RAS. Há necessidade de revisão, mas não de se refazer.
    - Drive compartilhado com o cliente. [P578] será direta no G drive. [P579] documentos internos(com 00 na frente).
  - EVTE - [Fazenda União]
    - [P249] quer desconto. [P862] iremos dar desconto, mas irão pagar de qualquer maneira.
    - Por isso, demonstraremos que os problemas técnicos ou falta de viabilidade são derivados de situações fora do escopo de controle da Apsis(Verra, [P812] [P902]….).  FM fez linha do tempo.
    - [P249] sugeriu atualização do EVTE(informal) futura com atualizações da Verra.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - [P813] off 13/08. MV apoiará AC.
  - Relatório de impacto socioambiental [BRLig]
    - Equipe: AC e MV
    - Relatório será concluído em 2026. É de todo o ano de 2025.
    - Empresa pequena. 5 pessoas. São transmissores de energia.
    - Recomendação de usar como benchmark relatórios curtos, utilizados por empresas menores, para analisar o que será obrigatório e/ou prioritário colocar. [P389] solicitou fazer algo pequeno.
    - [P636] semelhante ao feito no Aquapolo com comparação entre benchmark.
    - Nunca fizeram este relatório.
    - Para kickoff: estrutura mínima e ideal do relatório(bench) e documentos pendentes a serem enviados pelo cliente.
    - [P795] não é iniciar relatório de inicio, mas apresentar o que será feito e solicitar informações e dados do cliente.
    - [P811] apresentou “[P848] é a [P439]? AFR - [P741] [P849] [P57]” [P309].
  - [P178] de valor justo para crédito de carbono [Ambipar]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]
  - Novo padrão: [P139] [P656]
  - [P388]: dois parceiros que estamos conversando.'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:656ee8ba-950e-8212-968d-01df663c4654')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:753ee8ba-950e-823b-b10f-81d92ac3b986')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - [P449] no cronograma a revisão do LP (2 a 3 dias).
    - [P237] com [P358] oportunidade de novos negócios
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
    - [P872] momento para sugerir projetos de carbono.
    - FGV limita a 2 participantes por organização no evento presencial, impossibilitando presença de CJ e MV no evento.
  - Relatório de [P2] [CTA]
    - Relatório em revisão com CTA
    - [P874] passar por mais uma revisão de todos antes de ir para os designers.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
    - Em atualização da razão social no MCTI.
    - Sem resposta dos verificadores ainda.
  7.  Relatório de [P2] [Aquapolo]
    - [P305] entrevista será realizada as 04/08 - [P784] [P240]
    - Nova identidade da Aquapolo
  - EVTE - [Fazenda União]
    - Reunião com [P249]: querem renegociar a última parcela (pagar menos pelo relatório).
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - Visita técnica no dia 20/08.
    - IFRS S1 e S2 na apresentação do [P346] e SBCE. [P346] Salinor possui estes dados.
    - [P431] logística com [P850] da visita técnica
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
    1.1. [P221] - Parakanã e [P33] - Parakanã
    - ‣.
    1.2. ‣ - Findings.
    - Link servidor das evidências: ‣
    - [P194] das evidências: ‣
    - Respostas aos findings: ‣
    1.3. Monitoramento - Parakanã
    - Ronda semana passada - [P742] 6 dias.
    - IPES elaborando documentos dos últimos cursos e relatórios.
    - Atualização de atividades que ocorreram.
  - [P652] [P229]
  - Novo padrão: [P139] [P656]
  - [P388]: dois parceiros que estamos conversando.'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:753ee8ba-950e-823b-b10f-81d92ac3b986')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:444ee8ba-950e-83db-9661-814df9888b29')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - [P243] de conclusão de relatório - 29/07/2025
  - Inventário GEE [Apsis]
    - [P34] de se automatizar a confecção de nosso relatórios. [P113] a ferramenta “[P440]” no dia 25/07. [P361] um trial e pode ser testado com o inventário da Apsis. [P777]-se testar inclusive o BD de fatores deles, como os do agro do CTA.
  - [P67] de [P3] [CTA] e Inventário 24
    - [P872] momento para sugerir projetos de carbono.
    - FGV limita a 2 participantes por organização no evento presencial, impossibilitando presença de CJ e MV no evento.
  - Relatório de [P2] [CTA]
    - Relatório versão final recebido dos designers.
    - Importante: não é um relatório em conformidade com o GRI, apenas alinhado.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
    - Em atualização da razão social no MCTI.
    - Sem resposta dos verificadores ainda.
  7.  Relatório de [P2] [Acquapolo]
    - Google drive já configurado e enviado. [P617] aguardando os indicadores preenchidos e documentos.
  - EVTE - [Fazenda União]
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - Visita técnica no dia 20/08.
    - IFRS S1 e S2 na apresentação do [P346] e SBCE. [P346] Salinor possui estes dados.
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
    1.1. [P221] - Parakanã e [P33] - Parakanã
    - ‣.
    1.2. ‣ - Findings.
    - Link servidor das evidências: ‣
    - [P194] das evidências: ‣
    - Respostas aos findings: ‣
    1.3. Monitoramento - Parakanã
    1.4. Visita [P773] - [P58] [P865] e Governança
    - Em média 30 receberam o certificado no final.
    - Bastante engajamento nos treinamentos e participação de 2 mulheres.
    - Instrução do [P114] [P851] para monitoramento florestal, marcação de pontos, inserção de fotos e videos georreferenciados. [P13] de utilização para denúncias. [P743] teste e utilização em campo.
    - [P236]: criação de um grupo no wpp para que os Parakanã tirem duvidas.
    - [P743] tradução durante a reunião.
    - [P236]: Relatório por parte do [P865].
    - [P236]: [P268], nora da [P782] [P469], fazer relatórios de rondas do INDEVA.
    - [P236] 2: [P268] como estagiária da Apsis Carbon.
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:444ee8ba-950e-83db-9661-814df9888b29')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:9beee8ba-950e-82c0-842a-81bac98a1f80')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - Relatório enviado para o [P358]. [P580] sobre emissões fugitivas respondida por MV.
  - Inventário GEE [Apsis]
    - Pausado.
  - [P67] de [P3] [CTA] e Inventário 24
    - Novas oportunidades de crédito de carbono:
      - [P388] - [P115]
      - ALM
    - [P236] de aplicar os projetos também para todo o [P59]. [P680] será possível diluir os custos iniciais, sobretudo no ALM.
    - Estruturação das soluções no início de setembro.
  - Relatório de [P2] [CTA]
    - [P88] interna feita.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
    - [P308], da [P744] [P310], está se creditando no Art. 6.4 e também Verra. [P441] equipe no BR.
    - RINA voltou a fazer contato e enviará proposta 18/08.
  7.  Relatório de [P2] [Aquapolo]
    - Restam as entrevistas para governança, compliance e jurídico.
    - Entregar projeto gráfico e editoral junto.
    - [P795] em circularidade da água, venda de sustentabilidade e como estão desenvolvendo a parte social.
  - EVTE - [Fazenda União]
    - Reunião 19/08 com [P249] e [P138]. [P20] da linha do tempo da Verra.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
    - Reunião sobre diretriz técnica - 13h30.
  - Relatório de impacto socioambiental [BRLig]
    - Apresentada a lista de documentação necessária. [P389] vai analisar o que possuem e o que vão elaborar(contratar ou fazer conosco) durante esta semana.
    - [P455] [P868] 4:
  - [P178] de valor justo para crédito de carbono [Ambipar]
    - [P389] enviou lista de negociações da Ambipar, que inclui as compensações no total, com taxas além dos preços de carbono.
    - Para créditos de energia, não podemos utilizar a análise CCB (apenas AFOLU)
    - [P777]-se inclui um índice de projetos, desenvolvido por outros, que sirva de variavel proxy dos preços na regressão.
    - Para conversar com LP e equipe AF que variáveis podemos ajustar na amostra
    - [P868] 1 - [P116]
      - [P203] do trabalho
      - [P861] base, equipe, etc.
    - [P868] 2 - [P117] e ressalvas
    - [P868] 4 - [P7] dos créditos no laudo
    - [P868] 5 - [P745] [P746]
    - [P868] 6 - [P60] de avaliação
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]
  - Novo padrão: [P139] [P656]
  - [P388]: dois parceiros que estamos conversando.'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:9beee8ba-950e-82c0-842a-81bac98a1f80')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:995ee8ba-950e-8264-bfc7-81c61ff85ae0')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P178] de valor justo para crédito de carbono [Ambipar]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - FUP com [P358] para resposta do e-mail e verificar se quer apresentação de resultados.
    - [P343] da apresentação do relatório, com foco na análise de resultados ao longo do período.
  - Inventário GEE [Apsis]
    - Pausado.
  - [P67] de [P3] [CTA] e Inventário 24
    - Estruturação das soluções no início de setembro - 01/09/2025
    - [P22] das caracteristicas da CTA que já foram enviadas para outros projetos
      - Caldeiras (modelo, ano de fabricação)
      - Energia (qual empresa esta fornecendo)
      - Lenha
      - [P265] de tabaco
    - COMERC para conversar com a CTA - [P237] se tem fit.
      - Comerc fornece i-[P882], energia e caldeiras mais eficientes.
  - Relatório de [P2] [CTA]
    - Diagramação do resumo executivo e tradução.
    - Peças de comunicação do lançamento do RAS.
  - J6 Energia
    - Reunião com [P341] 02/09 ou 04/09.
    - Tabela comparativa entre as propostas e características.
      - Estimativa de logística
      - Estimativa de impostos
  7.  Relatório de [P2] [Aquapolo]
    - [P20] do projeto editorial: 03/09
  - EVTE - [Fazenda União]
    - Ajuste interno da proposta pendente.
  - Inventário de [P230] [Cosmos 3D - [P770] ]
  - Relatório de impacto socioambiental [BRLig]
    - [P595] [P627] para verificar se checaram a lista de documentas enviadas.
  - [P178] de valor justo para crédito de carbono [Ambipar]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:995ee8ba-950e-8264-bfc7-81c61ff85ae0')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:319ee8ba-950e-83b2-908f-01bcd93fa4fe')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00049/24 - Inventário GEE [Salinor]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs J6 Energia
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
  - Inventário GEE [Salinor]
    - Fechou o projeto.
    - [P329] solicitou levantarmos as informações que iremos precisar da empresa terceirizada do armazém de santos para inventário.
    - Querem divulgar o inventário no site e estão em dúvida se seria positivo para empresa. Já se divulgam como sal com pouca emissão.
  - Inventário GEE [Apsis]
    - Trabalhar em paralelo os dois anos.
    - Já solicitar dados do 2024.
    - Contrato com [P747] encerrado. [P130] disponibilidade de dados com financeiro.
  - [P67] de [P3] [CTA] e Inventário 24
  - Relatório de [P2] [CTA]
    - [P296] pausado para que finalizem preenchimento do ecovadis e verificar dados a serem acrescentados no RAS.
    - Última versão a ser aprovada no dia 24/07/25. [P243] de Relatório pronto na segunda semana de agosto.
    - [P343] do RAS CTA pode ser teste para revisão do RAS Aquapolo, a partir do dia 24/07.
    - CTA participará de evento do RPE em SP. ‣ e ‣ comparecerão também.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
    - VVB ainda não enviaram orçamentos. [P204], RINA e [P581] [P442] estão sem responder as propostas.
    - [P34] de incluir comentários explicativos, no modelo da [P311].
  10. Relatório de [P2] [Acquapolo]
    - Reunião com [P797], [P372] e marketing da Aquapolo feita na semana passada para definição da identidade visual do relatório.
    - Configurada pasta dos arquivos no google drive. [P772] fechará os indicadores nesta semana.
    - [P476] já configurado.
  - EVTE - [Fazenda União]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
    1.1. [P221] - Parakanã e [P33] - Parakanã
    - ‣.
    1.2. ‣ - Findings.
    - Link servidor das evidências: ‣
    - [P194] das evidências: ‣
    - Respostas aos findings: ‣
    - [P595] [P246] em 21/07 caso não haja envio da nova rodada de findings.
    1.3. Monitoramento - Parakanã
  - [P652] [P229]
  - VM00045(IFM) - FM perguntou a [P390]. [P390] solicitou verificar com Verra. [P236] é utilizar para TI do MT.
  - [P262] [P488] - [P69] dados do IPES para preencher proposta.'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:319ee8ba-950e-83b2-908f-01bcd93fa4fe')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:1a4ee8ba-950e-8375-8906-019911cca1c5')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00049/24 - Inventário GEE [Salinor]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/25 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs J6 Energia
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] - Parakanã
    - [ ] [P33] - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
  - Inventário GEE [Salinor]
    - Relatório final já enviado.
    - Mkt cobrará o envio do ACT.
  - Inventário GEE [Apsis]
    - Reiniciar.
  - [P67] de [P3] [CTA] e Inventário 24
    - Iniciará após fim do RAS 2024.
  - Relatório de [P2] [CTA]
    - Revisaram parte 1 e 3. [P205] parte 3 e 4.
    - [P613] parte 3: 23/06 e parte 4: 30/07.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
    - [P348] revisou. [P632] revisão FM e AC.
  10. Relatório de [P2] [Acquapolo]
    - Planilhas enviadas. [P69] [P36].
  - EVTE - [Fazenda União]
    - GS: [P118] outros estoques de CO2
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
    1.1. [P221] - Parakanã e [P33] - Parakanã
    - ‣.
    1.2. ‣ - Findings.
    - Link servidor das evidências: ‣
    - [P194] das evidências: ‣
    - Respostas aos findings: ‣
    - [P595] [P246] em 18/07 caso não haja envio da nova rodada de findings.
    1.3. Monitoramento - Parakanã
    - MV fecha hoje planilha do [P487] e apresentação MPF.
    - [P865] não passou informações solicitadas pela MV. [P649] ir 4 pessoas, mas sem dados das pessoas enviados.
    - Início dos treinamentos após 12h, por insistência do [P865].
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:1a4ee8ba-950e-8375-8906-019911cca1c5')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:aedee8ba-950e-8398-8565-010399d8a918')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00049/24 - Inventário GEE [Salinor]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs J6 Energia
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] - Parakanã
    - [ ] [P33] - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - Pendência: CA enviar minuta para IPEL.
  - Inventário GEE [Salinor]
    - Pendência: CA enviar minuta para Salinor.
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
  - Relatório de [P2] [CTA]
    - [P205] a parte 3 do RAS.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
  10. Relatório de [P2] [Acquapolo]
  - EVTE - [Fazenda União]
  Propostas
  Interno - Apsis Carbon
    - Estruturação dos projetos no Notion está pendente. [P778] algo semelhante ao SAN, em que os projetos evoluirão de oportunidades para projetos, com uma base de dados das atividades.
      - A base de dados é semelhante á weekly: uma base de dados macro e outras visualizações da base de dados.
      - Começar pela aquapolo e estabelecer um template para RAS e incluir já o controle de horas.
    - Propostas na weekly- [P391] entre enviadas e FUP.
  Projetos
  - [P221] - Parakanã
  - [P33] - Parakanã
  - ‣.
  - [P243] de inicio de escrita para o próximo MR em agosto.
  - [P370] o novo MR já com as lições apreendidas nesta primeira verificação.
  - Monitoramento - Parakanã
  - [P865] virá fazer o curso entre 21 a 25 de julho.
  - [P773] deve participar do curso. [P792] ir sozinha.
  - Findings - Parakanã
  - ‣ - Findings.
  - Link servidor das evidências: ‣
  - [P194] das evidências: ‣
  - Respostas aos findings: ‣
  - [P652] [P229]
  - [P262] amigos - ARR nos 10km do entorno no Parakanã. [P130] critérios de elegibilidade.
  - TI ([P92] [P512])
  - Mapa de risco da Verra para as [P582]
  [P735]:'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:aedee8ba-950e-8398-8565-010399d8a918')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:966ee8ba-950e-824b-a2c1-8167354e98aa')::uuid, r.id, '> Pauta:
    Consultoria
    - [x] AP 00048/24 - Inventário GEE [IPEL]
    - [x] AP 00049/24 - Inventário GEE [Salinor]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs J6 Energia
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] - Parakanã
    - [ ] [P33] - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - Pendência: CA enviar minuta para IPEL.
  - Inventário GEE [Salinor]
    - Pendência: CA enviar minuta para Salinor.
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
  - Relatório de [P2] [CTA]
    - [P205] a parte 3 do RAS.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
  10. Relatório de [P2] [Acquapolo]
  - EVTE - [Fazenda União]
  Propostas
  Interno - Apsis Carbon
    - Estruturação dos projetos no Notion está pendente. [P778] algo semelhante ao SAN, em que os projetos evoluirão de oportunidades para projetos, com uma base de dados das atividades.
      - A base de dados é semelhante á weekly: uma base de dados macro e outras visualizações da base de dados.
      - Começar pela aquapolo e estabelecer um template para RAS e incluir já o controle de horas.
    - Propostas na weekly- [P391] entre enviadas e FUP.
  Projetos
  - [P221] - Parakanã
  - [P33] - Parakanã
  - ‣.
  - [P243] de inicio de escrita para o próximo MR em agosto.
  - [P370] o novo MR já com as lições apreendidas nesta primeira verificação.
  - Monitoramento - Parakanã
  - [P865] virá fazer o curso entre 21 a 25 de julho.
  - [P773] deve participar do curso. [P792] ir sozinha.
  - Findings - Parakanã
  - ‣ - Findings.
  - Link servidor das evidências: ‣
  - [P194] das evidências: ‣
  - Respostas aos findings: ‣
  - [P652] [P229]
  - IFRS S1 e S2
  - FLONAS
  - [P262] amigos - ARR nos 10km do entorno no Parakanã. [P130] critérios de elegibilidade.
  - TI ([P92] [P512]): [P206] mais detalhes, já tem o econômico. [P371] do trincheira: entender os riscos no entorno
  - Capoto [P583]: 1 slide > Propostas em andamento
  - Parque [P748]: 1 slide
  [P735]:'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:966ee8ba-950e-824b-a2c1-8167354e98aa')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:497ee8ba-950e-8238-be8f-01d52d9cd4bb')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00049/24 - Inventário GEE [Salinor]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs J6 Energia
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [ ] AP-00008/25 - Emissão no MDL [[P464]]
    - [ ] AP-00006/25 - Inventário GEE [TJMT]
    - [ ] AP-00009-25 - EVTE [[P231]]
    - [ ] AP-00010/25 - [P31] ESG [[P608]]:
    - [ ] OP-00106-24 - [P866]-viabilidade [[P610] [P863]]:
    - [ ] AP-00014/25 - Inventário GEE [TJSE]:
    - [ ] AP-00013/25 - Inventário GEE [TJRR]:
    - [ ] Inventário GEE [TST]
    - [ ] AP-00020/25 - Inventário GEE [STM]
    - [ ] AP-00019/25 - Inventário [Lanxess]
    - [ ] AP-00018/25 - [P67] de descarbonização [CMOC]
    - [ ] AP-00021/25 - EVTE[DINC]
    Projetos
    - [ ] PDD - Parakanã
    - [ ] MR - Parakanã
    - [ ] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
  - Inventário GEE [Salinor]
    - Está em editoração.
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
  - Relatório de [P2] [CTA]
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
  10. Relatório de [P2] [Acquapolo]
    - [P475] hoje as planilhas pré preenchidas hoje ou amanhã.
    - [P795] esta semana para AC.
  - EVTE - [Fazenda União]
    - Reunião na quarta feira e na sexta feira.
    - [P20] será na sexta feira.
  Propostas
  - Emissão no MDL [[P464]]
  - Inventário GEE [TJMT]
  - [P866] - [P32] - [[P231]]
  - [P31] ESG [[P608]]
  - EVTE [[P610] [P863]]
  - Inventário GEE [TJSE]
  - Inventário GEE [TJRR]
  - Inventário GEE [TST]
  - Inventário GEE [STM]
  - Inventário [Lanxess]
  - [P67] de descarbonização [CMOC]
  - EVTE [DINC]
  - Inventário + [P67] [TJMMG]
  - CEF [[P119] de [P584] [P120]]
  - S1 S2 [BRQ]
  - Inventário de [P230] [Cosmos 3D ]
  - S1 e S2 [[P749] Sul Energia]
  - S1 S2 [[P443] [P585]]
  - [Nortek]
  - S1 S2 [REFIT]
  - [Constellation]
  Interno - Apsis Carbon
  Projetos
  - PDD - Parakanã
  - MR - Parakanã
  - Monitoramento - Parakanã
  - Findings - Parakanã'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:497ee8ba-950e-8238-be8f-01d52d9cd4bb')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:5b3ee8ba-950e-838c-91ef-819bf864872a')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00037/24 -  [P68] GEE [Tecverde]
    - [ ] AP 00055/24 - Inventário de GEE [Tecverde]
    - [ ] AP 00049/24 - Inventário GEE [Salinor]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs J6 Energia
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [ ] AP-00008/25 - Emissão no MDL [[P464]]
    - [ ] AP-00006/25 - Inventário GEE [TJMT]
    - [ ] AP-00009-25 - EVTE [[P231]]
    - [ ] AP-00010/25 - [P31] ESG [[P608]]:
    - [ ] OP-00106-24 - [P866]-viabilidade [[P610] [P863]]:
    - [ ] AP-00014/25 - Inventário GEE [TJSE]:
    - [ ] AP-00013/25 - Inventário GEE [TJRR]:
    - [ ] Inventário GEE [TST]
    - [ ] AP-00020/25 - Inventário GEE [STM]
    - [ ] AP-00019/25 - Inventário [Lanxess]
    - [ ] AP-00018/25 - [P67] de descarbonização [CMOC]
    - [ ] AP-00021/25 - EVTE[DINC]
    Projetos
    - [ ] PDD - Parakanã
    - [ ] MR - Parakanã
    - [ ] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - [P473] 2: [P8] normal (Ab. [P61]) no primeiro semestre e contabilização considerando os I-RECs no 2 semestre. [P130] na nota técnica GHG.
  - [P68] GEE [Tecverde]
  - Inventário de GEE [Tecverde]
  - Inventário GEE [Salinor]
    - [P20] no dia 18.
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
    - [P771] fecha revisão essa semana.
    - FGV fechou etapa de desk review. [P800] [P852] obtido.
  - Relatório de [P2] [CTA]
    - [P622] 3 diagramada será enviada pelos designers
    - [P613] de meados de Julho.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
  10. Relatório de [P2] [Acquapolo]
    - [P85] do contrato está atrasada
    - [P370] confecção de planilhas dos indicadores.
    - Sugerimos os indicadores, passamos as planilhas pra eles, definimos responsáveis e depois faremos as entrevistas.
    - [P870] planilha por caderno e uma aba por indicador.
    - [P771]: elaborar kickoff.
  - EVTE - [Fazenda União]
    - Prioridade esta semana.
  Propostas
  - Emissão no MDL [[P464]]
  - Inventário GEE [TJMT]
  - [P866] - [P32] - [[P231]]
  - [P31] ESG [[P608]]
  - EVTE [[P610] [P863]]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:5b3ee8ba-950e-838c-91ef-819bf864872a')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:896ee8ba-950e-825a-b730-818c334962e4')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00037/24 -  [P68] GEE [Tecverde]
    - [ ] AP 00055/24 - Inventário de GEE [Tecverde]
    - [ ] AP 00049/24 - Inventário GEE [Salinor]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs J6 Energia
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [ ] AP-00008/25 - Emissão no MDL [[P464]]
    - [ ] AP-00006/25 - Inventário GEE [TJMT]
    - [ ] AP-00009-25 - EVTE [[P231]]
    - [ ] AP-00010/25 - [P31] ESG [[P608]]:
    - [ ] OP-00106-24 - [P866]-viabilidade [[P610] [P863]]:
    - [ ] AP-00014/25 - Inventário GEE [TJSE]:
    - [ ] AP-00013/25 - Inventário GEE [TJRR]:
    - [ ] Inventário GEE [TST]
    - [ ] AP-00020/25 - Inventário GEE [STM]
    - [ ] AP-00019/25 - Inventário [Lanxess]
    - [ ] AP-00018/25 - [P67] de descarbonização [CMOC]
    - [ ] AP-00021/25 - EVTE[DINC]
    Projetos
    - [ ] PDD - Parakanã
    - [ ] MR - Parakanã
    - [ ] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - [P773] finalizou dados na semana passada.
    - [P632] revisão, editoração e envio da minuta.
  - [P68] GEE [Tecverde]
    - [P222] projeto.
  - Inventário de GEE [Tecverde]
    - [P222] projeto.
  - Inventário GEE [Salinor]
    - [P721] diversas oportunidade de melhoria em relação à formatação dos dados, mas não é necessário informar estas informações agora.
    - [P486] prazos iniciais, a menos que seja realmente necessário.
    - [P479] reunião para revisitarmos projetos e forma de calcular as fotes.
    - Capítulo de [P14] de melhoria deverá ser um anexo do relatório.
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
  - Relatório de [P2] [CTA]
    - [P638] atrasados nas revisões.
    - Gargalos com decisões da alta direção.
    - [P351] ([P133]) irá fazer o [P235] da CTA. [P771] irá acompanhar o andamento.
  - Inventário 25 e [P31] [CTA]
    - [P475] minuta do documento para CTA e depois da aprovação enviar a editoração para envio da minuta final.
  - J6 Energia
    - Realizada reunião para entender divergências entre os dados da geração. [P312] problema com infestação de abelhas nos medidores.
    - [P222] os cálculos.
  10. Relatório de [P2] [Acquapolo]
    - [P306] com [P772] na última sexta. [P74] diminuir opções apresentadas para ela, para evitar retrabalho.
    - [P126]: [P207] do indicadores, definição das áreas, [P346] e depois entrevistas.
    - [P862] tem GRI específico para o setor.
    - [P346] agendado para terça feira, 17/06.
    - Importante olhar também o RAS da GS [P685], uma das controladoras da Aquapolo.
  - EVTE - [Fazenda União]
  Propostas
  - Emissão no MDL [[P464]]
  - Inventário GEE [TJMT]
  - [P866] - [P32] - [[P231]]
  - [P31] ESG [[P608]]
  - EVTE [[P610] [P863]]
  - Inventário GEE [TJSE]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:896ee8ba-950e-825a-b730-818c334962e4')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:c0aee8ba-950e-820a-afe9-81cedfbcc6e9')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00037/24 -  [P68] GEE [Tecverde]
    - [ ] AP 00055/24 - Inventário de GEE [Tecverde]
    - [ ] AP 00049/24 - Inventário GEE [Salinor]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs J6 Energia
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [ ] AP-00008/25 - Emissão no MDL [[P464]]
    - [ ] AP-00006/25 - Inventário GEE [TJMT]
    - [ ] AP-00009-25 - EVTE [[P231]]
    - [ ] AP-00010/25 - [P31] ESG [[P608]]:
    - [ ] OP-00106-24 - [P866]-viabilidade [[P610] [P863]]:
    - [ ] AP-00014/25 - Inventário GEE [TJSE]:
    - [ ] AP-00013/25 - Inventário GEE [TJRR]:
    - [ ] Inventário GEE [TST]
    - [ ] AP-00020/25 - Inventário GEE [STM]
    - [ ] AP-00019/25 - Inventário [Lanxess]
    - [ ] AP-00018/25 - [P67] de descarbonização [CMOC]
    - [ ] AP-00021/25 - EVTE[DINC]
    Projetos
    - [ ] PDD - Parakanã
    - [ ] MR - Parakanã
    - [ ] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - Dúvidas confirmadas pela IPEL. [P250] já fechar o relatório.
    - [P359], trocou de R22 para R407 em 2023. Por isso que houve aumento dessas emissões fugitivas do [P359].
  - [P68] GEE [Tecverde]
    - [P69] marcar apresentação.
  - Inventário de GEE [Tecverde]
  - Inventário GEE [Salinor]
    - [P250] de ser finalizado até o final da semana.
    - [P343] GS e MV
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
    - [P235] será feito com consultoria pela [P351].
    - Iniciaram estratégia de descarbonização por iniciativa própria
  - Relatório de [P2] [CTA]
    - [P622] 1 já revisado.
    - [P622] 2 em revisão do designers.
    - [P622] 3 para ser aprovado pela CTA
    - [P622] 4 em revisão ortográfica.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
    - Terminaram a revisão do MR.  [P657] revisão.
    - Pesquisar alternativas MR para dados horários.
  10. Relatório de [P2] [Acquapolo]
    - [P346] para ser marcado semana que vem. Contrato já encaminhado para assinatura.
    - Reunião na quarta feira sobre o projeto.
  - EVTE - [Fazenda União]
  Propostas
  - Emissão no MDL [[P464]]
  - Inventário GEE [TJMT]
  - [P866] - [P32] - [[P231]]
  - [P31] ESG [[P608]]
  - EVTE [[P610] [P863]]
  - Inventário GEE [TJSE]
  - Inventário GEE [TJRR]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:c0aee8ba-950e-820a-afe9-81cedfbcc6e9')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:2d7ee8ba-950e-8226-8cad-81b807a261aa')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00037/24 -  [P68] GEE [Tecverde]
    - [ ] AP 00055/24 - Inventário de GEE [Tecverde]
    - [ ] AP 00049/24 - Inventário GEE [Salinor]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs J6 Energia
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [ ] AP-00008/25 - Emissão no MDL [[P464]]
    - [ ] AP-00006/25 - Inventário GEE [TJMT]
    - [ ] AP-00009-25 - EVTE [[P231]]
    - [ ] AP-00010/25 - [P31] ESG [[P608]]:
    - [ ] OP-00106-24 - [P866]-viabilidade [[P610] [P863]]:
    - [ ] AP-00014/25 - Inventário GEE [TJSE]:
    - [ ] AP-00013/25 - Inventário GEE [TJRR]:
    - [ ] Inventário GEE [TST]
    - [ ] AP-00020/25 - Inventário GEE [STM]
    - [ ] AP-00019/25 - Inventário [Lanxess]
    - [ ] AP-00018/25 - [P67] de descarbonização [CMOC]
    - [ ] AP-00021/25 - EVTE[DINC]
    Projetos
    - [ ] PDD - Parakanã
    - [ ] MR - Parakanã
    - [ ] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - Dúvidas confirmadas pela IPEL. [P250] já fechar o relatório.
    - [P359], trocou de R22 para R407 em 2023. Por isso que houve aumento dessas emissões fugitivas do [P359].
  - [P68] GEE [Tecverde]
    - [P69] marcar apresentação.
  - Inventário de GEE [Tecverde]
  - Inventário GEE [Salinor]
    - [P250] de ser finalizado até o final da semana.
    - [P343] GS e MV
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
    - [P235] será feito com consultoria pela [P351].
    - Iniciaram estratégia de descarbonização por iniciativa própria
  - Relatório de [P2] [CTA]
    - [P622] 1 já revisado.
    - [P622] 2 em revisão do designers.
    - [P622] 3 para ser aprovado pela CTA
    - [P622] 4 em revisão ortográfica.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
    - Terminaram a revisão do MR.  [P657] revisão.
    - Pesquisar alternativas MR para dados horários.
  10. Relatório de [P2] [Acquapolo]
    - [P346] para ser marcado semana que vem. Contrato já encaminhado para assinatura.
    - Reunião na quarta feira sobre o projeto.
  - EVTE - [Fazenda União]
  Propostas
  - Emissão no MDL [[P464]]
  - Inventário GEE [TJMT]
  - [P866] - [P32] - [[P231]]
  - [P31] ESG [[P608]]
  - EVTE [[P610] [P863]]
  - Inventário GEE [TJSE]
  - Inventário GEE [TJRR]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:2d7ee8ba-950e-8226-8cad-81b807a261aa')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:be7ee8ba-950e-83b1-a4ba-01baef178f7f')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00037/24 -  [P68] GEE [Tecverde]
    - [ ] AP 00055/24 - Inventário de GEE [Tecverde]
    - [ ] AP 00049/24 - Inventário GEE [Salinor]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs J6 Energia
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [ ] AP-00008/25 - Emissão no MDL [[P464]]
    - [ ] AP-00006/25 - Inventário GEE [TJMT]
    - [ ] AP-00009-25 - EVTE [[P231]]
    - [ ] AP-00010/25 - [P31] ESG [[P608]]:
    - [ ] OP-00106-24 - [P866]-viabilidade [[P610] [P863]]:
    - [ ] AP-00014/25 - Inventário GEE [TJSE]:
    - [ ] AP-00013/25 - Inventário GEE [TJRR]:
    - [ ] Inventário GEE [TST]
    - [ ] AP-00020/25 - Inventário GEE [STM]
    - [ ] AP-00019/25 - Inventário [Lanxess]
    - [ ] AP-00018/25 - [P67] de descarbonização [CMOC]
    - [ ] AP-00021/25 - EVTE[DINC]
    Projetos
    - [ ] PDD - Parakanã
    - [ ] MR - Parakanã
    - [ ] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
  - [P68] GEE [Tecverde]
  - Inventário de GEE [Tecverde]
  - Inventário GEE [Salinor]
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
  - Relatório de [P2] [CTA]
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
  10. Relatório de [P2] [Acquapolo]
  - EVTE - [Fazenda União]
  Propostas
  - Emissão no MDL [[P464]]
  - Inventário GEE [TJMT]
  - [P866] - [P32] - [[P231]]
  - [P31] ESG [[P608]]
  - EVTE [[P610] [P863]]
  - Inventário GEE [TJSE]
  - Inventário GEE [TJRR]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:be7ee8ba-950e-83b1-a4ba-01baef178f7f')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:26dee8ba-950e-833f-a715-81675ce192b7')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00037/24 -  [P68] GEE [Tecverde]
    - [ ] AP 00055/24 - Inventário de GEE [Tecverde]
    - [ ] AP 00049/24 - Inventário GEE [Salinor]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs J6 Energia
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [ ] AP-00008/25 - Emissão no MDL [[P464]]
    - [ ] AP-00006/25 - Inventário GEE [TJMT]
    - [ ] AP-00009-25 - EVTE [[P231]]
    - [ ] AP-00010/25 - [P31] ESG [[P608]]:
    - [ ] OP-00106-24 - [P866]-viabilidade [[P610] [P863]]:
    - [ ] AP-00014/25 - Inventário GEE [TJSE]:
    - [ ] AP-00013/25 - Inventário GEE [TJRR]:
    - [ ] Inventário GEE [TST]
    - [ ] AP-00020/25 - Inventário GEE [STM]
    - [ ] AP-00019/25 - Inventário [Lanxess]
    - [ ] AP-00018/25 - [P67] de descarbonização [CMOC]
    - [ ] AP-00021/25 - EVTE[DINC]
    Projetos
    - [ ] PDD - Parakanã
    - [ ] MR - Parakanã
    - [ ] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - Dúvidas confirmadas pela IPEL. [P250] já fechar o relatório.
    - [P359], trocou de R22 para R407 em 2023. Por isso que houve aumento dessas emissões fugitivas do [P359].
  - [P68] GEE [Tecverde]
    - [P69] marcar apresentação.
  - Inventário de GEE [Tecverde]
  - Inventário GEE [Salinor]
    - [P250] de ser finalizado até o final da semana.
    - [P343] GS e MV
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
    - [P235] será feito com consultoria pela [P351].
    - Iniciaram estratégia de descarbonização por iniciativa própria
  - Relatório de [P2] [CTA]
    - [P622] 1 já revisado.
    - [P622] 2 em revisão do designers.
    - [P622] 3 para ser aprovado pela CTA
    - [P622] 4 em revisão ortográfica.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
    - Terminaram a revisão do MR.  [P657] revisão.
    - Pesquisar alternativas MR para dados horários.
  10. Relatório de [P2] [Acquapolo]
    - [P346] para ser marcado semana que vem. Contrato já encaminhado para assinatura.
    - Reunião na quarta feira sobre o projeto.
  - EVTE - [Fazenda União]
  Propostas
  - Emissão no MDL [[P464]]
  - Inventário GEE [TJMT]
  - [P866] - [P32] - [[P231]]
  - [P31] ESG [[P608]]
  - EVTE [[P610] [P863]]
  - Inventário GEE [TJSE]
  - Inventário GEE [TJRR]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:26dee8ba-950e-833f-a715-81675ce192b7')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:ff0ee8ba-950e-83bc-a91d-8144c9b4a2f0')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00037/24 -  [P68] GEE [Tecverde]
    - [ ] AP 00055/24 - Inventário de GEE [Tecverde]
    - [ ] AP 00049/24 - Inventário GEE [Salinor]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs J6 Energia
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [ ] AP-00008/25 - Emissão no MDL [[P464]]
    - [ ] AP-00006/25 - Inventário GEE [TJMT]
    - [ ] AP-00009-25 - EVTE [[P231]]
    - [ ] AP-00010/25 - [P31] ESG [[P608]]:
    - [ ] OP-00106-24 - [P866]-viabilidade [[P610] [P863]]:
    - [ ] AP-00014/25 - Inventário GEE [TJSE]:
    - [ ] AP-00013/25 - Inventário GEE [TJRR]:
    - [ ] Inventário GEE [TST]
    - [ ] AP-00020/25 - Inventário GEE [STM]
    - [ ] AP-00019/25 - Inventário [Lanxess]
    - [ ] AP-00018/25 - [P67] de descarbonização [CMOC]
    - [ ] AP-00021/25 - EVTE[DINC]
    Projetos
    - [ ] PDD - Parakanã
    - [ ] MR - Parakanã
    - [ ] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - Todos os dados enviados e planilhados.
    - Relatório em confecção, [P313] apenas dúvida sobre estimativa do óleo diesel e chiller.
    - [P13] de verificação retroativa dos inventários.
    - Sobre o [P359], importante entender se foi manutenção programada, se foi regular, etc.
    - Importante: [P237] o modelo do [P359] e verificar se é possivel alterar o fluido refrigerante utilizado.
    - [P783] não haja resposta até quinta feira, manda minuta com o cenário mais conservador.
  - [P68] GEE [Tecverde]
    - Sem retorno quanto a marcação da apresentação do relatório final.
    - [P876] sobre [P800] [P616].
  - Inventário de GEE [Tecverde]
    - [P734] da lista na próxima weekly. Já faturado.
  - Inventário GEE [Salinor]
    - Alguns dados ainda pendentes de envio por eles. [P153] do RH.
    - [P613] esticado devido a demora de envio de dados.
    - [P763] em fechar todo o planilhamento durante essa semana e compreender o motivo da demora, mas sem colocar prazo final pro envio.
    - [P76] todos os e-mail em que o caio não esteja em CC para ele.
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
    - Sistema do GHG permite não divulgação de fatores além da planilha GHG. No entanto, há erro no sistam que divulga as informações mesmo sem consentimento do cliente.
    - [P606] enviaria hoje para o GHG. A ABNT valida e tbm há revisão da FGV.
    - ABNT ainda não enviou declaração de verificação.
    - Indicador de intensidade de emissões: [P606] passou dados de produção e poderemos incluir este indicador nos resultados.
  - Relatório de [P2] [CTA]
    - [P227] de diminuição da participação no CTA, sobretudo pois precisam focar em preencher o [P235].
    - [P622] 1 já diagramada e falta avaliação dos C levels. [P853] ainda é ponto de dúvida.
    - [P622] 2 já foi revisada e parte 3(ambiental) está em revisão do conteúdo.  [P622] 4 (social) foi enviada.
    - [P617] no prazo
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
  10. Relatório de [P2] [Acquapolo]
  - EVTE - [Fazenda União]
  Propostas
  - Emissão no MDL [[P464]]
  - Inventário GEE [TJMT]
  - [P866] - [P32] - [[P231]]
  - [P31] ESG [[P608]]
  - EVTE [[P610] [P863]]
  - Inventário GEE [TJSE]
  - Inventário GEE [TJRR]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:ff0ee8ba-950e-83bc-a91d-8144c9b4a2f0')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:af6ee8ba-950e-82fc-8feb-0183e2e5fac3')::uuid, r.id, 'empresa de transportes
fortech: estação de tratamento industrial e doméstico e bandeira
a nova que é a [P686], estação de tratamento mais nova, atuação geográfica diferente,
Lodo de ETE: eles recebem lodo sanitário e industrial, e conseguiram um lodo com baixa humidade e alto poder calorífico; é ocmbustível para cimenteiras, substitui o coque de petróleo
clientes são [P686], empresa que faz serviço de limpexa de caixa de gordura, fossa, etc. doméstico industrial
FIcam na região metropolitana de catuana, perto do porto do [P750]
próximo a área industrial, a nova é próxima do polo de maracanaú, está quase concluída; a fortech está instalada,
não tem em mente uma possibilidade específica, estão com crédito pré aprovado para a obra de maracanaú, a obra lá é de 8M 62% foi realizado com capital próprio
expandindo com capital próprio, com prioridade para macaranaú que vai dobrar para 12 mil m³ de tratamento, dobrar a capacidade da Fortech
estão com um projeto junto com um aterro para tratar o chorume
Viasoluti,
Candido comentou sobre o terreno do lado do condomínio de laranjeiras, em [P586], de 40M USD'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:af6ee8ba-950e-82fc-8feb-0183e2e5fac3')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:a73ee8ba-950e-82fe-8c77-81190debda6a')::uuid, r.id, 'Presentes: [P444] e [P587]
[P390] apresentou
Ata:
- trabalha com automação de processos como ar condicionado, monitoramento de variáveis de processo, controlam temperatura, água, equipamentos, ar condicionado, et.
- ar condicionado ed shopping, etc.
- trabalham na engenharia da automação, fazem integração da máquina com os periféricos, bombas, sistemas, sensores, etc. no ambiente tem o sensor do ambiente com humidade, temperatura etc.  pega esses sistemas e colocam numa plataforma e fazem a engenharia para que isso funcione da melhor forma
- vem demanda de cliente como biodigestor, eventos carbon neutro,
- elaboração de projetos de crédito de carbono:
  - complemento para algumas demandas que eles foram consultados;
  - Tb acha que pode ter sinergias no S1 e S2'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:a73ee8ba-950e-82fe-8c77-81190debda6a')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:776ee8ba-950e-829e-ba51-81f007b9c871')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00048/24 - Inventário GEE [IPEL]
    - [ ] AP 00037/24 -  [P68] GEE [Tecverde]
    - [ ] AP 00055/24 - Inventário de GEE [Tecverde]
    - [ ] AP 00049/24 - Inventário GEE [Salinor]
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00016/24 - [P67] de [P3] [CTA]
    - [ ] AP 00004/25 - Relatório de [P2] [CTA]
    - [ ] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [ ] AP 00051/24 - Emissão CERs J6 Energia
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [ ] AP-00008/25 - Emissão no MDL [[P464]]
    - [ ] AP-00006/25 - Inventário GEE [TJMT]
    - [ ] AP-00009-25 - EVTE [[P231]]
    - [ ] AP-00010/25 - [P31] ESG [[P608]]:
    - [ ] OP-00106-24 - [P866]-viabilidade [[P610] [P863]]:
    - [ ] AP-00014/25 - Inventário GEE [TJSE]:
    - [ ] AP-00013/25 - Inventário GEE [TJRR]:
    - [ ] AP-00015/25 - Inventário GEE [TJMMG]
    Projetos
    - [ ] PDD - Parakanã
    - [ ] MR - Parakanã
    - [ ] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - [P630] da manutenção pendentes: responsável [P445]
    - Problema no SANFLOW enviou mensagem de conclusão de laudos passados para clientes. [P783] clientes recorrentes questionem sobre o conteúdo das mensagens, esclarecer que se trata de laudos passados e não os que estão em curso.
  - [P68] GEE [Tecverde]
    - [P106](Inventário e assessoria) em versões finais enviados.
    - [P274] em contato para a agendar reunião esta semana.
  - Inventário de GEE [Tecverde]
    - Já faturado.
  - Inventário GEE [Salinor]
    - [P302] de pendências enviada na sexta feira. [P69] respostas para tratar todos os dados.
    - Reunião para retirar dúvidas com equipe Salinor sobre dados do [P446] e demais dados pendentes - 12/05 - 14h30
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
    - Auditora faria contato caso houvesse alguma dúvida sobre os dados. [P617] não enviou mensagem.
    - Declaração de verificação prevista para dia 19/05.
    - Quinta feira - 15/05(16h30) - MV e CA - Reunião de alinhamento para estratégia de descarbonização
  - Relatório de [P2] [CTA]
    - Pendência: CTA aprovar a parte 2 e Apsis Carbon aprovar parte 3.
    - [P622] 1: Governança, estratégia e indicadores financeiros.
    - [P622] 2: [P150], incluindo inventário.
    - [P622] 2, após aprovada, vai pra revisão ortográfica da Apsis e para revisão de design pelos designers.
    - [P622] 3: [P513] e segurança do trabalho.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
    - Conversas com OVV iniciadas. Com preenchimento de planilhas para solicitação de orçamento iniciada.
    - [P341] questionou a necessidade de envio da geração de dados horários de energia.
    - [P237] como ocorre o rateio da energia entre PCH [P497] e PCH Queixada.
  10. Relatório de [P2] [Acquapolo]
    - [P69] assinatura de contrato.
    - [P457] se [P133]([P351]) apoiará o projeto.
    - [P237] necessidade de melhoria além da parte técnica.
  - EVTE - [Fazenda União]
  Propostas
  - Emissão no MDL [[P464]]
  - Inventário GEE [TJMT]
  - [P866] - [P32] - [[P231]]
  - [P31] ESG [[P608]]
  - EVTE [[P610] [P863]]
  - Inventário GEE [TJSE]
  - Inventário GEE [TJRR]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:776ee8ba-950e-829e-ba51-81f007b9c871')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:387ee8ba-950e-820d-bed6-81965561d5d7')::uuid, r.id, 'Presentes:
  - [P556]
  - [P345]
Pauta:
- [ ] Koatinemo
  - [ ] Estudos técnicos
  - [ ] Governança
  - [ ] Logística
  - [ ] perguntar sobre possíveis invasões e conflitos
  - [ ] Perguntar sobre outros contratos
- [ ] Perguntar cadeias produtivas
- [ ] Aderiu ao programa jurisdicional do PA?
- [ ] [P787] é relação com o MPF, quem atende?
- [ ] [P787] é a relação com Funai, quem atende
- [ ] perguntar sobre [P62] e [P854] [P664]
# Ata reunião
- Altamira
Já possuem parceiros ou assinaram contrato com alguém?
[P776] estavam com um advogada chamada [P751], que levou até eles o pessoal da [P903] Brasil, porém não assinaram contrato pq haviam pontos críticos que eles não consideravam viáveis, como não poder ampliar as áreas de roça e de novas aldeias para moradia!
- [P787] é a logística?
Logística relativamente simples mas fluvial! São aproximadamente 4/6 horas de voadeira a partir de Altamira, no verão com o agravamento das secas a viagem pode levar até 10h!
- [P441] associação ativa? Com advogado ajudando?
[P869], possuem associação e hoje tem um novo advogado atuando com eles, possuem cácique geral e lideranças por aldeia!
- Há invasões ou conflitos atualmente, com presença de garimpeiros ou grileiros?
[P862] mais, a última desintrusão foi há 5 anos, porém são vizinhos da [P208] e essa é uma grande preocupação deles!
- Aderiu ao programa jurisdicional do PA?
[P617] não tenho esse informação, posso pesquisar!
- [P787] é relação com o MPF, quem atende?
Razoável, mas o MPF em Altamira não é fácil!
- Quantas aldeias? [P787] é a governança, possuem caciques por aldeias, algum líder central?
23 aldeias! [P752] todas as margens do [P753]!
- [P787] é a relação com Funai, quem atende?
CR Altamira, não ajuda muito mas tbm não atrapalha! [P855]
- [P787] é a relação com a Norte Energia e que tipos de projetos eles fazem no território?
Norte tem duas frente principais, uma de projetos produtivos e outra de proteção territorial! [P875] investido nas roças e castanha majoritariamente'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:387ee8ba-950e-820d-bed6-81965561d5d7')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:36cee8ba-950e-8267-82cf-81aee89e9039')::uuid, r.id, '- Ata reunião:
  - [P487] e [P447] [P588]
    - Tudo que está na parte de créditos de carbono está com eles
    - ideia muito forte de entrar nesse mercado
    - bioma da [P314]: captura mais carbono do que se imaginava, mais do que [P315]
    - capta água do São [P154], e através de canais e estações de bombeamento, 20% na [P658] e 80% em [P121];
    - 50 mil ha, sendo 25 mil ha de área irrigada, 80% de uva e manga
    - 2 áreas de reserva legal 3600 ha; 3200 ha de reserva legal
    - grandes produtores empresariais, com projetos de geração de créditos de carbono, com culturas perenes, tem a possibilidade de gerar crédito da agricutlura, com culturas perenes,
  - [P568] proposta de EVTE / mapeamento de oportunidades VM0042 ALM
  - Falar com [P482]
  - 01 - CAPA POARELATORIO
  - Abrir AP no SAN'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:36cee8ba-950e-8267-82cf-81aee89e9039')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:3bfee8ba-950e-83d1-a271-0159a0b5e799')::uuid, r.id, 'Participantes: [P754] da [P883]2Be
- Projeto em [P122], e um projeto no [P316]
- Gov: [P862] tem projeto para apresentar na COP 30, precisamos de algo simples para a COP
- vai estar com a [P755] na quinta-feira, para falar
- Ambipar é investidora deles, no final da primeira captação
- 1 ano e meio operando, com velocidade que ele não esperava
- mercado de restauração ambiental foi grande, a demanda, desenvolve projetos em 6 estados do Brasil, com [P808], MA e PA, restauração de manguezal com a [P687] Energia, focado em carbono, trabalha com a [P448], projeto com a EDP em SP, debaixo de placas solares com berçário de abelhas nativas ameaçadas de extinção
- Frente de agricultura familiar, com desenvolvimento comunitário, quando a indústria enfrenta problemas com a comunidade,
- projeto de real estate, [P658], terreno de 7 mil ha de floresta, mangue, etc.
  - Grupo [P659]: [P209], incorporadores com residenciais e hoteleiros, alto padrão baixio, município [P658], 30 km de [P589], com lagoa azul, com mgue, restinga,
  - 3 hoteis e condomínios com bandeira fasano e arantara, primeiro [P756]; vão construir aeroporto, apesar do aero de salvador ter 1;30, 2h; aeroporto de aracaju tb deve ser perto
  - querem transformar em um ecoempreendimento, faz parte da narrativa;
  - começaram em 2023 ou 2024 um estudo da [P856] tree, to tree, essa empresa fez a parte consultiva mas não conseguiram tirar do papel para a prática; fizeram mapeamento de floresta, manguezais, recursos hídricos, etc. como projeto de PSA, espécies em extin
  - 257 milhões estimaram o valor dos ativos; 242,2 milhões o recurso flroestal e os hídricos 14,9 milhões: valor de uso direto, valor de uso indireto, valor
  - parecer jurídico e fundiário, estratégia para captação de recursos: carbono, green bonds, PSA, PPP, crédito de biodiversidade, o projeto pode captar 272 milhões para ser revertido em ativos ambientais,
- quer fazer PSA nesse projeto, mas a consultoria não conseguiu resolver os problemas e nunca fecharam o produto, nem para o roadshow do projeto
- estão implementando um projeto de meliponicultura para PSA em um mangue com pressão urbana, mas que já estava sendo cercada e foi indo pro caminho do PSA
  - possuem projetos de meli com experiência turística, parceria com hoteis da região, já construíram hotel, condomínio, obras do fasano, o baiano é o representante da SPE da [P659] no Brasil, como toda incorporadora está com o caixa apertado, quer se financiar
  - teve reunião com a diretora de mkt do empreendimento, ex atriz do castelo ratimbum
  - agora o desafio é construir um caminho para mostrar para ele; achar compradores da região, como a BYD? esse projeto se tornou muito maior do que a [P883]2Be, para tirar do papel
  - eles têm a confiança do diretor, mas não possuem a expertise e está disposto a abrir uma oportunidade para gente (são LTDA)
  - prima subholding LTDA, abaixo da [P659] SA
  - perda econômica pra um APD da área que ele poderia desenvolver, mas não consegue
    - eles querem tudo no sucesso
    - falar com ERA
  - gostaria que tivesse abelhas: colcoar a abelha como tese de adicionalidade, medir como está melhorando a parte
  - ele vai testar uma tecnologia de monotiramento de biodiversidade com uma smart hive (enxame), como birds, 3,000 [P757] por caixa por 180 euros por mês, por caixa (preços a serem abrasileirados e com margem
  - ele quer se posicionar como supplier de luxo para projetos de crédito de carbono
- dar novidades do projeto DINC,
- marido da ivete vem de lá,
- REDD: engajamento com comunidade, treinamento, fazer meliponicultura'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:3bfee8ba-950e-83d1-a271-0159a0b5e799')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:d84ee8ba-950e-826d-9092-8124a03e4f0f')::uuid, r.id, '> Pauta:
    Consultoria
    - [x] AP 00048/24 - Inventário GEE [IPEL]
    - [x] AP 00037/24 -  [P68] GEE [Tecverde]
    - [x] AP 00055/24 - Inventário de GEE [Tecverde]
    - [x] AP 00049/24 - Inventário GEE [Salinor]
    - [x] AP 00001/24 - Inventário GEE [Apsis]
    - [x] AP 00016/24 - [P67] de [P3] [CTA]
    - [x] AP 00004/25 - Relatório de [P2] [CTA]
    - [x] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [x] AP 00051/24 - Emissão CERs J6 Energia
    - [x] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [x] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [x] AP-00002/25 - [P31] S1 e S2 [[P615]]
    - [x] AP-00008/25 - Emissão no MDL [[P464]]
    - [x] AP-00006/25 - Inventário GEE [TJMT]
    - [x] AP-00009-25 - EVTE [[P231]]
    - [x] AP-00010/25 - [P31] ESG [[P608]]:
    - [x] OP-00106-24 - [P866]-viabilidade [[P610] [P863]]:
    - [x] AP-00014/25 - Inventário GEE [TJSE]:
    - [x] AP-00013/25 - Inventário GEE [TJRR]:
    - [x] AP-00015/25 - Inventário GEE [TJMMG]
    Projetos
    - [x] PDD - Parakanã
    - [x] MR - Parakanã
    - [x] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - [P613] para envio dos dados finalizado semana passada. [P628] cobrar esta semana.
  - [P68] GEE [Tecverde]
  - Inventário de GEE [Tecverde]
    - [P88] concluída.
    - [P80] se hé recorte apenas dos veículos próprios para o [P800] [P616] completo.
    - Compreender necessidade de preencher a planilha completa ou simples do selo clima.
  - Inventário GEE [Salinor]
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
    - Email com pendências enviado para [P234] - [P473] 1 e 2. [P783] não responda, vamos falar com [P606].
    - Já escrever corpo do texto do relatório, deixando lacunas dos números.
    - [P272] contato com auditores Hoje. (não enviaram plano de verficação)
  - Relatório de [P2] [CTA]
    - Apresentamos 1 parte do RAS, com FUP feito com [P485] e [P618].
    - [P362] [P590], CEO, quer alterar o foco e suprimir o foco em pessoas para focar no produto e lavoura, incluindo a diminuição do foco do slogan.
    - Liberação do novos indicadores HOJE, 28/04.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
    - [P653] solicitação com [P614] [P210] dos dados horários de geração para cálculo dos fatores, processo de medição e medidores, cálculo e rateio da CCEE.
    - [P370] trabalho esta semana na planilha de cálculo.
  10. Relatório de [P2] [Acquapolo]
    - [P69] contrato.
  - EVTE - [Fazenda União]
    - Professor [P904] já enviou orçamento.
    - [P904] - [P317] também o estoque de carbono.
  Propostas
  - [P31] S1 e S2 [[P615]]
  - Emissão no MDL [[P464]]
  - Inventário GEE [TJMT]
  - [P866] - [P32] - [[P231]]
  18. [P31] ESG [[P608]]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:d84ee8ba-950e-826d-9092-8124a03e4f0f')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:96dee8ba-950e-8255-8a36-015f2529995a')::uuid, r.id, '> Pauta:
    Consultoria
    - [x] AP 00048/24 - Inventário GEE [IPEL]
    - [x] AP 00037/24 -  [P68] GEE [Tecverde]
    - [x] AP 00055/24 - Inventário de GEE [Tecverde]
    - [x] AP 00049/24 - Inventário GEE [Salinor]
    - [x] AP 00001/24 - Inventário GEE [Apsis]
    - [x] AP 00016/24 - [P67] de [P3] [CTA]
    - [x] AP 00004/25 - Relatório de [P2] [CTA]
    - [x] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [x] AP 00051/24 - Emissão CERs J6 Energia
    - [x] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [x] AP 00003/25  - EVTE - [Fazenda União]
    Propostas
    - [x] AP-00002/25 - [P31] S1 e S2 [[P615]]
    - [x] AP-00008/25 - Emissão no MDL [[P464]]
    - [x] AP-00006/25 - Inventário GEE [TJMT]
    - [x] AP-00009-25 - EVTE [[P231]]
    - [x] AP-00010/25 - [P31] ESG [[P608]]:
    - [x] OP-00106-24 - [P866]-viabilidade [[P610] [P863]]:
    - [x] AP-00014/25 - Inventário GEE [TJSE]:
    - [x] AP-00013/25 - Inventário GEE [TJRR]:
    - [x] AP-00015/25 - Inventário GEE [TJMMG]
    Projetos
    - [x] PDD - Parakanã
    - [x] MR - Parakanã
    - [x] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - [P475] email sobre pendências com no máximo 3 dias após fim dos prazos. [P449] em nossa diretriz técnica.
  - [P68] GEE [Tecverde]
    - Autorizaram confecção do relatório final.
  - Inventário de GEE [Tecverde]
    - [P487] aprovou a planilha do selo clima.
  - Inventário GEE [Salinor]
    - Todas as reuniões de levantamento já realizadas.
  - Inventário GEE [Apsis]
  - [P67] de [P3] [CTA] e Inventário 24
    - Luís, de transportes, sugeriu reunião com o setor de compras para levantarmos mais dados sobre compras de insumos.
    - Fórmulário do RPE possui divergências entre o ciclo solicitado plataforme e os anos de inventários a serem feitos, mas os contratos estão com o valor correto.
    - [P83] verificar na plataforma a categorização entre matrizes e filiais.
    - Reunião 08/04. 14h. MV, GS e CA sobre inventário.
    - Fator de emissão da lenha: considerar eucalipto como o tipo de madeira e verificar alternativas disponíveis.
  - Relatório de [P2] [CTA]
    - [P638] preenchendo o GRI 2.
    - [P628] upar as planilhas por responsável nesta semana.
    - Reunião amanhã sobre apresentação do projeto editorial.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
    - FGM enviar contato do [P905] - [P246]- para CA.
    - Reunião 09/04 - 14h30 - GS e CA - [P318]
  10. Relatório de [P2] [Acquapolo]
  - [P243] para início após o feriado.
  - [P473] final do contrato em aberto.
  - EVTE - [Fazenda União]
  - Fase de contrato ainda, com NF já emitida. [P72] da minuta pelo advogado do cliente.
  Propostas
  - [P31] S1 e S2 [[P615]]
  - Emissão no MDL [[P464]]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:96dee8ba-950e-8255-8a36-015f2529995a')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:3b3ee8ba-950e-83ad-aedf-819b17c72374')::uuid, r.id, '- Presentes:
  - [P390]
  - [P651]
  - Dagoberto
  - [P319]
  - Amauri
  - [P154]
  - [P805] [P614]
  - [P345]
- Pauta:
  - Seminário
  - CLPI
- Ata:
  - Ianacula pode fazer o orçamento da logística, vai entregar na próxima semana
  - nesse momento vamos fazer apenas na TI Pimentel Barbosa, porque está sendo desenvolvido apenas
  - Os caciques tem interesse, de ambas as TIs; só que no primeiro momento, o primeiro passo é uma visita a aldeia paraíso,
  - querem que seja para maio/25
  - são 28 aldeias, quer ter todos os caciques no seminário
  - último orçamento sobre BR080 deu quanto?
  - dia 7 a 10 [P651] não pode em junho
  - A partir do dia 11 de maio, antes eles não podem
  - sugeri marcarmos uma visita de cortesia no MPF e na Funai
  - [P651] sugeriu um adv de fora, pq eles não querem usar um adv da região;
  - ele já falou que quer ver o acerto entre ele, [P319] e nós, algo bom para gente e para eles;'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:3b3ee8ba-950e-83ad-aedf-819b17c72374')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:04bee8ba-950e-82d1-af56-81088b5629cb')::uuid, r.id, '> Pauta:
    Consultoria
    - [x] AP 00048/24 - Inventário GEE [IPEL]
    - [x] AP 00037/24 -  [P68] GEE [Tecverde]
    - [x] AP 00055/24 - Inventário de GEE [Tecverde]
    - [x] AP 00049/24 - Inventário GEE [Salinor]
    - [x] AP 00001/24 - Inventário GEE [Apsis]
    - [x] AP 00016/24 - [P67] de [P3] [CTA]
    - [x] AP 00004/25 - Relatório de [P2] [CTA]
    - [x] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [x] AP 00051/24 - Emissão CERs J6 Energia
    Propostas
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00002/25 - [P31] S1 e S2 [[P615]]
    - [ ] AP-00008/25 - Emissão no MDL [[P464]]
    - [ ] AP-00006/25 - Inventário GEE [TJMT]
    - [ ] AP 00003/25  - EVTE - [Fazenda União]
    - [ ] AP-00009-25 - EVTE - [[P231]]
    - [ ] AP-00010/25 - [P31] ESG [[P608]]:
    - [ ] OP-00106-24 - [P866]-viabilidade[[P610] [P863]]:
    - [ ] AP-00014/25 - Inventário GEE[TJSE]:
    - [ ] AP-00013/25 - Inventário GEE[TJRR]:
    - [ ] AP-00015/25 - Inventário GEE [TJMMG]
    Projetos
    - [ ] PDD - Parakanã
    - [ ] MR - Parakanã
    - [ ] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - [P599] aproximadamente 40% dos dados que deveriam enviar: manutenção e fontes móveis.
  - [P68] GEE [Tecverde]
  - Inventário de GEE [Tecverde]
  - Inventário GEE [Salinor]
    - [P22] de fontes iniciando-se nesta semana, com reuniões divididas por áreas.
    - [P638] com visita do CEO nesta semana, que pode impactar o calendário de reuniões.
    - [P83] confirmar com [P320] antes das reuniões.
  - Inventário GEE [Apsis]
    - [P348]: [P321] funcionamento do on-fly.
  - [P67] de [P3] [CTA] e Inventário 24
    - [P638] cadastrados no RPE.
    - [P606] concordou com data proposta para verificação.
    - [P33]: 08/05.
    - GS: alterar layout da planilha que tem base climas.
    - Seguir trâmite normal para assinatura do relatório. [P10] terá que se estar assinado já no dia 5/5(segunda)
    - [P83] montar drive para controle e rápido acesso às evidências, tanto nossa quanto para CTA.
  - Relatório de [P2] [CTA]
    - [P256] este RAS como base de estruturação para próximos. [P83] levantar as dúvidas do cliente e melhorias possíveis.
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
    - E-mail com prazo para envio já especificado.
    - No email: incluir faturar ACR, ACL e CCEE.
  Propostas
  - Relatório de [P2] [Acquapolo]
    - [P66](e foi aprovado) desconto e mudança da forma de pagamento.
  - [P31] S1 e S2 [[P615]]
  - Emissão no MDL [[P464]]
  - Inventário GEE [TJMT]
  - EVTE - [Fazenda União]
    - [P249] deu aceite formal.
    - [P761] projeto.
  - [P866] - [P32] - [[P231]]
  18. [P31] ESG [[P608]]
    - [P66] desconto e para separar escopo técnico do comercial.
  - [P866]-viabilidade [[P610] [P863]]
  - Inventário GEE [TJSE]
  - Inventário GEE[TJRR]
  - Inventário GEE [TJMMG]
  - RAS [[P211]]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:04bee8ba-950e-82d1-af56-81088b5629cb')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:89aee8ba-950e-82d5-a142-013fab6fb8f5')::uuid, r.id, '> Pauta:
    Consultoria
    - [x] AP 00048/24 - Inventário GEE [IPEL]
    - [x] AP 00037/24 -  [P68] GEE [Tecverde]
    - [x] AP 00055/24 - Inventário de GEE [Tecverde]
    - [x] AP 00049/24 - Inventário GEE [Salinor]
    - [x] AP 00001/24 - Inventário GEE [Apsis]
    - [x] AP 00016/24 - [P67] de [P3] [CTA]
    - [x] AP 00004/25 - Relatório de [P2] [CTA]
    - [x] AP 00005/24 - Inventário 25 e benchmarking [CTA]
    - [x] AP 00051/24 - Emissão CERs J6 Energia
    Propostas
    - [x] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [x] AP-00002/25 - [P31] S1 e S2 [[P615]]
    - [x] AP-00008/25 - Emissão no MDL [[P464]]
    - [x] AP-00006/25 - Inventário GEE [TJMT]
    - [x] AP-00050-24 - Consultoria ESG [Plascar]
    - [x] AP-00047-24 - [P371] de [P867][BPBioEnergy]
    - [x] AP 00003/25  - EVTE - [Fazenda União]
    - [x] AP-00009-25 - EVTE - [[P231]]
    - [x] AP-00010/25 - [P31] ESG [[P608]]:
    - [x] OP-00106-24 - [P866]-viabilidade[[P610] [P863]]:
    - [x] AP-00014/25 - Inventário GEE[TJSE]:
    - [x] AP-00013/25 - Inventário GEE[TJRR]:
    Projetos
    - [x] PDD - Parakanã
    - [x] MR - Parakanã
    - [x] Monitoramento - Parakanã
    [P735]:  2h21m
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]
    - [P630] recebidos já estão planilhados.
    - Enviarão dados finais até o fim de março.
    - FUP na terça 01/04 sobre eventuais pendências.
  - [P68] GEE [Tecverde]
    - CA já liberou no SAN para cobrança do que foi feito.
    - FUP sobre alteração necessárias. [P783] não haja resposta, enviar para editoração.
  - Inventário de GEE [Tecverde]
    - Inventário 2023 com todas revisões de dados feitas. [P475] para editoração e inserir assinatura do LP.
    - Inventário 2023 - E-mail para LP explicando nova assinatura.
    - Inventário 2024: há dúvidas sobre a planilha de dados enviados. Após esclarecer as dúvidas, precisamos alinhar com TecVerde novo prazo.
    - Inventário 2024: iniciaremos revisão interna hoje e enviaremos para TecVerde no dia 27/03.
    - [P338] as oportunidades de melhorias, inclusive as já apontadas no ano passado, citando exemplos.
    - [P371] comparativa fonte por fonte, inclusive indicadores relativos por produção.
    - [P130] se o servidor da TecVerde voltou.
  - Inventário GEE [Salinor]
    - [P813]-off : 27/03 - 10h
    - [P34] de MV, CA, GS alinharem os pontos focais, como serão os [P346] de [P22] de fontes, etc. 26/03 - 09h30.
    - MV e GS revisar material de [P346], incluir S1, S2, [P450] regulado.
    - GS estudar documentos de inventário anterior da Salinor.
  - Inventário GEE [Apsis]
    - [P89] recebidos do financeiro. [P212] de planilhamento.
  - [P67] de [P3] [CTA] e Inventário 24
    - [P69] dados :
      - [P473] 1 e 2 , responsável [P234] ([P613] 25/03)
      - [P79] de funcionários e viagens, responsável pelo envio [P618] ([P613] 28/03).
    - [P83] acompanhar a contratação o OVV ([P63]: [P213])
    - [P431] com [P606] a ida da equipe até a CTA.
    - [P457] próximas reuniões com equipes/áreas com as quais ainda não nos reunimos. (CA com [P618])
  - Relatório de [P2] [CTA]
    - [P130] as planilhas, editar para ficar com cara da Carbon e pré-preencher com os indicadores.
    - GS/MV: pré-preencher com os indicadores.
    - GS: separar os documentos.
    - Escrita pela Apsis Carbon: [P265], [P214] e emissões.
    - [P107] o que esta no [P476] para o Notion
  - Inventário 25 e [P31] [CTA]
  - J6 Energia
    - Reunião 25/03.
    - GS: [P64] de pendências e enviar e-mail para CJ
  Propostas
  - Relatório de [P2] [Acquapolo]
    - [P66] nosso CNPJ para seguir com a nossa proposta. [P69].
    - [P107] e pensar o que precisamos para montar um RAS sem contratação externa.
  - [P31] S1 e S2 [[P615]]
    - [P236] de utilizar cliente premium como [P857].
    - Sem retorno sobre parceria pela [P615].
    - Outras áreas fazem captação do cliente
  - Emissão no MDL [[P464]]
    - Sem retorno. [P243] de FUP para essa semana.
  - Inventário GEE [TJMT]
    - Sem resposta.
  - Consultoria ESG [Plascar]
  - [P371] de [P867] [BPBioEnergy]
  - EVTE - [Fazenda União]
  - [P866] - [P32] - [[P231]]
  18. [P31] ESG [[P608]]
  - [P866]-viabilidade [[P610] [P863]]
  - Inventário GEE [TJSE]
  - Inventário GEE[TJRR]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:89aee8ba-950e-82d5-a142-013fab6fb8f5')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:3abee8ba-950e-8309-afa0-81f4d83fa362')::uuid, r.id, '> Pauta:
    Consultoria
    - [x] AP 00048/24 - Inventário GEE [IPEL]
    - [x] AP 00037/24 -  [P68] GEE [Tecverde]
    - [x] AP 00016/24 - [P67] de [P3] [CTA]
    - [x] AP xxxx/25 - Relatório de [P2] [CTA]
    - [x] AP 00051/24 - J6 Energia
    - [x] AP 00001/24 - Inventário GEE [Apsis]
    - [x] AP xxxx/25 - Inventário GEE [Salinor]
    - [x] AP 00005/24 - Inventário 25 e benchmarking [CTA]: [CTA]
    - [x] AP 00055/24 - Inventário de GEE [Tecverde]
    Propostas
    - [x] AP 00052/24 Relatório de [P2] [Acquapolo]
    - [x] [P31] S1 e S2 [[P615]]
    - [x] Emissão no MDL [[P464]]
    - [x] Inventário GEE [TJMT]
    - [x] Consultoria ESG [Plascar]
    - [x] [P371] de [P867][BPBioEnergy]
    - [x] AP 00003/25  - EVTE - [Fazenda União]
    - [x] [P866] [P32] - [[P231]]
    Projetos
    - [x] PDD - Parakanã
    - [x] MR - Parakanã
    - [x] Monitoramento - Parakanã
    [P735]:  2h10m
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]:
    - [P333] informou que o prazo seria para fim de março.
    - [P835] reunião com cliente: Ata nossa circulada internamente e ata enviada para o cliente com as informações e pendências pertinentes.
    - [P457] prazos limites no kick-off.
  - [P68] GEE [Tecverde]:
    - Mensagem enviada dia 10/03 para [P353] sobre relatório preliminar. Sem resposta da [P353] ainda.
    - Se não houver resposta, já podemos elaborar o relatório final e fechar o projeto.
  - Inventário de GEE [Tecverde]:
    - Pendência fora do prazo: NF de botijões da cozinha. GLP 13Kg.
    - 1 semana de atraso dessa pendência.
    - Se [P487] enviar hoje, podemos atrasar para o dia 25. MV enviar e-mail.
    - MV confirmar com FM sobre resposta ao [P858]. [P591] [P451].
    - Inventário do ano passado: vamos revisar. [P263] no e-mail sobre novos prazos com [P487] e cobrar que revisem tudo do ano passado.
  - Inventário GEE [Salinor]:
    - Sem atualização. 27/03. MV e GS.
    - [P449] S1 e S2 e estratégia de descarbonização no kick-off.
  - Inventário GEE [Apsis]:
    - AC: solicitar lista de colaboradores ao CH.
    - MV: solicitar acesso aos relatórios financeiro. [P215] [P452] antes de contato com [P232].
  - [P67] de [P3] [CTA] e inventário 24:
    - [P420] reunião [P877] 20/03 - 10h com [P618].
    - CA marcar reunião com responsáveis de outras fontes.
    - [P475] exemplo de auditoria de verificação com valores praticados e confirmar envio de propostas pelos verificadores. MV
    - Agro: [P758] bem certo das premissas utilizadas
  - Relatório de [P2] [CTA]:
    - [P56] serão finalizadas esta semana.
    - [P130] faltas de indicadores dos anos anteriores e sugerir novos.
    - [P142] transcrições para [P351].
  - J6 Energia:
    - Realização de tabela de dados com dados faltantes da J6
    - 3 Tools são aplicáveis ao caso da J6
    - Docs:
      - [P599] as leituras dos medidores comprovados - Já foi solicitado
      - Só tem medição que bota no GRID não tem o total da Queixada (pegou por estimativa no último PD)
      - [P130] se precisa fazer retificação do PD.
    - Ponto de atenção: cálculo de fator, verificar unidades
    - [P222] [P759] do MR - CJ e GS
    - Ponto de atenção: [P130] a tecnologia de geração de energia.
  - Inventário 25 e [P31] ([P473] 3 - [P21]) [CTA]:
    - [P31] - Após Inventário.
  Propostas
  - Relatório de [P2] [Acquapolo]:
  - [P31] S1 e S2 [[P615]]:
    - FUP semana passada.
  - EVTE - [Fazenda União]:
  - [P866] - [P32] - [[P231]]:
  - Emissão no MDL [[P464]]:
  - Inventário GEE [TJMT]:
  - Consultoria ESG [Plascar]:
  - [P371] de [P867][BPBioEnergy]:
  18. [P31] ESG [[P608]]:
  - [P866]-viabilidade[[P610] [P863]]:
  - Inventário GEE: TJXX e TJRR:'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:3abee8ba-950e-8309-afa0-81f4d83fa362')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:6f3ee8ba-950e-83ed-99bc-01566ade1038')::uuid, r.id, '> Pauta:
    Consultoria
    - [x] AP 00048/24 - Inventário GEE [IPEL]
    - [x] AP 00037/24 -  [P68] GEE [Tecverde]
    - [x] AP 00016/24 - [P67] de [P3] [CTA]
    - [x] AP xxxx/25 - Relatório de [P2] [CTA]
    - [x] AP 00051/24 - J6 Energia
    - [x] AP 00001/24 - Inventário GEE [Apsis]
    - [x] AP xxxx/25 - Inventário GEE [Salinor]
    - [x] AP 00005/24 - Inventário 25 e benchmarking [CTA]: [CTA]
    - [x] AP 00055/24 - Inventário de GEE [Tecverde]
    Propostas
    - [x] AP 00052/24 Relatório de [P2] [Acquapolo]
    - [x] [P31] S1 e S2 [[P615]]
    - [x] Emissão no MDL [[P464]]
    - [x] Inventário GEE [TJMT]
    - [x] Consultoria ESG [Plascar]
    - [x] [P371] de [P867][BPBioEnergy]
    - [x] AP 00003/25  - EVTE - [Fazenda União]
    - [x] [P866] [P32] - [[P231]]
    Projetos
    - [x] PDD - Parakanã
    - [x] MR - Parakanã
    - [x] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]:
    - [P773] enviará email sobre pendências hoje(06/03)
  - [P68] GEE [Tecverde]:
    - [P184] com [P353] sobre conformidade do relatório preliminar.
  - Inventário de GEE [Tecverde]:
    - Execução e tratamento dos dados 06/3 e 07/3
  - Inventário GEE [Salinor]:
    - Sem atualização.
  - Inventário GEE [Apsis]:
    - Sem atualização. [P69] reunião semana que vem(GS, MV e AC)
  - [P67] de [P3] [CTA] e inventário 24:
    - MV enviar nome-email do contato na ABNT.
    - CTA enviou dados abertos por produtor. [P482] analisará. GS e MV processarem os dados da planilha.
  - Relatório de [P2] [CTA]:
    - Reu 07/03 com [P351] e CTA sobre preenchimento da planilha.
    - Disparo dos convites de entrevistas até 07/03.
  - J6 Energia:
    - GS listar arquivos recebidos.
    - Reu 11/03 de atualização do projeto.
  - Inventário 25 e [P31] ([P473] 3 - [P21]) [CTA]:
  Propostas
  - Relatório de [P2] [Acquapolo]:
  - [P31] S1 e S2 [[P615]]:
  - EVTE - [Fazenda União]:
  - [P866] - [P32] - [[P231]]:
  - Emissão no MDL [[P464]]:
  - Inventário GEE [TJMT]:
  - Consultoria ESG [Plascar]:
  - [P371] de [P867][BPBioEnergy]:
  18. [P31] ESG [[P608]]:
  - Proposta em elaboração.
  - [P866]-viabilidade[[P610] [P863]]:
  - KML solicitados
  - GS iniciar estudos com KML recebidos.
  [P226]
  - Inventário GEE TJs
  Projetos
  - PDD - Parakanã:
  - Reunião 07/03 com [P453] e [P592] sobre mudanças do site visit.
  - Reunião com o [P620] na semana passada: não conseguiram dar um prazo de quando vão entregar os dados. Reunião 06/03 para atualizar status da entrega dos dados.
  - MR - Parakanã: ‣.
  - [P868]. Comunidade em revisão.
  - [P622] de clima: pendente de dados do [P620].
  - Monitoramento - Parakanã:
  [P735]:  40 minutos
  10 a 14/04: [P345] fora
  11 a 14/04: [P771] fora'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:6f3ee8ba-950e-83ed-99bc-01566ade1038')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:ec7ee8ba-950e-8263-8b7b-0197fb475df0')::uuid, r.id, 'Presentes:
  - Amauri
  - [P319]
  - [P651]
  - [P345]
Pauta:
- [ ] Pimentel Barbosa
  - [ ] Estudos técnicos
  - [ ] Governança
- [ ] São Marcos
- [ ] perguntar sobre possíveis invasões e conflitos
- [ ] Perguntar sobre projeto da [P322] [P760]; há outra iniciativa semelhante?
- [x] Perguntar cadeias produtivas
- [ ] Aderiu ao programa jurisdicional do MT
- [ ] [P787] é relação com o MPF, quem atende?
- [ ] perguntar sobre [P872] [P593]
# Ata reunião
- Nova [P216], e canarana
- [P412] junto com o [P154] com o povo,
- [P154] fez cirurgia, por isso que não pode participar
  - Ribeirão cascalheira, cocalinho e outros municípios
  - [P594]: 180 mil ha, território geral
- De xavantina até agua boa, pimentel barbosa, [P594] é do lado do pimentel barbosa, encostado na rodovia 158, os dois bem protegidos, tem lacoura e gado do lado, aeroporto de água boa  canarana são asfaltados, verificar se é só bimotor
- descer em goiania, 750 km até a cidade, estradas boas, dormir no caminho
- cadeias produtivas: passam necessidade, pessoal entra na aldeia, tem muita necessidade, situação delicada, não tem mais caça, estão passando fome
- de sinop até lá 1h de voo bimotor, mas custa 11 mil, 5 pessoas
- [P154] está assumindo a CTL de água boa,
- colocar cerca de arame, quase todos estão querendo,
- tempo de demora do projeto:
- cacique é academico, pode se reunir na aldeia paraíso, saber quando pode ir, marcar reunião com eles, fazer a proposta,
- contrato: precisa consultar cacique de cada aldeia, essa visita é importante para explicar como trabalhamos
- Manda por email o prazo, as dúvidas, imprimir, e ver o que tem para responder, bom que formaliza
- senta com o lider para ver  oque precisa, e quem faz a reunião banca
- Roberto é o que manda,
- perguntar quanto custa para uma reunião na [P454]
- Preparar email com dúvidas e material da Apsis'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:ec7ee8ba-950e-8263-8b7b-0197fb475df0')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:be2ee8ba-950e-82ea-8525-81e94ae6c956')::uuid, r.id, '> Pauta:
    Consultoria
    - [x] AP 00048/24 - Inventário GEE [IPEL]
    - [x] AP 00037/24 -  [P68] GEE [Tecverde]
    - [x] AP 00016/24 - [P67] de [P3] [CTA]
    - [x] AP 00001/24 - Inventário GEE [Apsis]
    Propostas
    - [x] AP 00051/24 - J6 Energia
    - [x] Inventário GEE [[P135]]
    - [x] AP 00052/24 Relatório de [P2] [Acquapolo]
    - [x] Relatório de [P2] [CTA]
    - [x] AP 00005/24 - [P68] na [P19] de Carbono [CTA]
    - [x] AP 00001/25 - Inventário GEE [[P624]] - [P323]
    - [x] AP 00055/24 - Inventário de GEE [Tecverde]
    - [x] AP 00003/25  - EVTE - [Fazenda União]
    - [x] [P866] [P32] - [[P231]]:
    Projetos
    - [x] PDD - Parakanã
    - [x] MR - Parakanã
    - [x] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]:
  a. [P69] dados.
  - [P68] GEE [Tecverde]: a. [P352] previsão preliminar. Relatório será feito após volta da MV
  - [P67] de [P3] [CTA]:
  a.  [P630] pendentes do [P606]. [P346] inicial do inventário realizada.
  b.  2º [P346] na semana entre dia 17-21 [P880].
  - Inventário GEE [Apsis]:   Pendente de marcação da apresentação.
  Propostas
  - J6 Energia:
  a. Contrato pendente de assinatura.
  - Inventário GEE [[P239]]:
  a. FUP feito dia 06/02.
  - Relatório de [P2] [Acquapolo]:
  a. [P130] visita na semana 10-14/03 com [P772].
  - Relatório de [P2] [CTA]:
  a. [P343] do valor da proposta feita e encaminhada. [P69] aceite.
  - [P68] na [P19] de Carbono [CTA] e Inventário:
  a.  Pendente de aprovação.
  - Inventário GEE [[P624]]:
  a. [P217] declínio.
  - Inventário de GEE [Tecverde]:
  a. [P69] assinatura do contrato.
  - EVTE - [Fazenda União]:
  a. [P69] aceite e proposta revisada.
  - [P866] - [P32] - [[P231]]:
  a.  Reunião marcada - FM e GS 10/02 14h.
  b. [P613] até quarta feira.
  Projetos
  - PDD - Parakanã:
  - MR - Parakanã: ‣.
  - Monitoramento - Parakanã:
  [P735]:'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:be2ee8ba-950e-82ea-8525-81e94ae6c956')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:962ee8ba-950e-8367-b1e2-01f4e9020c63')::uuid, r.id, '> Pauta:
    Consultoria
    - [x] AP 00048/24 - Inventário GEE [IPEL]
    - [x] AP 00037/24 -  [P68] GEE [Tecverde]
    - [x] AP 00016/24 - [P67] de [P3] [CTA]
    - [x] AP 00001/24 - Inventário GEE [Apsis]
    Propostas
    - [x] AP 00051/24 - J6 Energia
    - [x] Inventário GEE [[P135]]
    - [x] AP 00052/24 Relatório de [P2] [Acquapolo]
    - [x] Relatório de [P2] [CTA]
    - [x] AP 00005/24 - [P68] na [P19] de Carbono [CTA]
    - [x] AP 00055/24 - Inventário de GEE [Tecverde] ([P761] Projeto)
    - [x] AP 00003/25  - EVTE - [Fazenda União]
    - [x] [P866] [P32] - [[P231]]:
    Projetos
    - [x] PDD - Parakanã
    - [x] MR - Parakanã
    - [x] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]:
    a.  [P324] apenas alguns dados de [P473] 1 e 2.
    b. [P475] email hoje para cobrar o resto dos dados.
    c. [P630] enviados já planilhados.
  - [P68] GEE [Tecverde]:
    a.  [P353] relatou dúvidas no processo. Há necessidade de fazer FUP sobre eventuais dúvidas.
    b. [P859] feedback para desenvolver relatório final.
  - [P67] de [P3] [CTA]:
    a.  Inventário 24.  [P15] escopo 1,2 e 3. (MV)
    b.  Pendência: [P218] lista de dados a serem enviados. (CJ)
    c. [P473] 3: [P630] abertos por fazenda.
    d. [P219] formulário [P33] de Inventário da SGS e [P660] e +1. (MV)
    e.  [P142] formulário [P660], BSI ou ABNT. (MV)
  - Relatório de [P2] [CTA]:
    a. [P376].
    b. [P325] [P133]. [P346] para semana que vem.
    c. [P455] de tarefas: Apsis Carbon [P326] e tratará os dados, reuniões; [P133] fará a redação do relatório, reuniões.
    d. [P256] desenvolvimento da impactato como benchmark para futuros RAS da Apsis
    e. [P130] possibilidade de ajuste no relatório para aproximar ao CSRD, IFRS S1 e S2, visando sugestões de serviços futuros.
    f. [P611] como representante da Apsis, CJ como revisor e GS.
    g. [P327] e editoração interna. [P133] e [P328] com parceiro externo.
  - J6 Energia:
    a.  [P376]. Contrato assinado.
    b.  CJ e GS
    c. [P813]-off 20/02 - [P489] passo a passo do processo e os stakeholders envolvidos.
    d. [P130] outros  PD’s sobre a metodologia para ter inspiração.
    e. [P237] estágio da AND.
  - Inventário GEE [Apsis]:   Pendente de marcação da apresentação.   Após férias de FM.
  - Inventário GEE [Salinor]:
  a.  Em fechamento de contrato.
  b. MV e AC.
  c. [P130] com [P329] de reduzir [P330] para já incluir levantamento de fontes.
  d. [P762] com responsáveis de cada área - MV
  - [P68] na [P19] de Carbono [CTA] e Inventário 25:
  a.  [P376]. [P16] o inventário 24 e iniciaremos diagnóstico de gaps do escopo 3.
  b. [P636] 3 orçamentos com certificadoras. (MV)
  Propostas
  - Inventário GEE [[P239]]:
    a.  Sem retorno desde 06/02.  [P906] baixa.
  - Relatório de [P2] [Acquapolo]:
    a.     [P13] de visitaFM e CJ após carnaval. Sem confirmação por enquanto.
  - Inventário GEE [[P624]]:
    a.  [P860] baixa.
  - Inventário de GEE [Tecverde]:
    a. Contrato [P331]. [P346] 18/02.
    b. Equipe GS e MV
    c. [P392] melhorias no controle de emissões GEE, certificação, contabilização de escopo 3.
    d. [P155] reunião de [P346] - MV
  - EVTE - [Fazenda União]:
  - [P866] - [P32] - [[P231]]:
  - [P31] S1 e S2 [[P615]]: Proposta enviada.
  - Emissão no MDL [[P464]]:
  b. [P130] outros projetos possíveis deles.
  - Inventário GEE [TJMT]: Proposta enviada.
  - Consultoria ESG [Plascar]: [P636] último FUP.
  - [P371] de [P867][BPBioEnergy]: FUP para agendar quando forem para São [P614].
  Projetos
  - PDD - Parakanã: Em comentários públicos (13/02 - 13/03). [P861] da auditoria ainda não confirmada (31/03 - 04/04).
  - MR - Parakanã: ‣. [P611] revisará [P868]. Comunidade e Biodiversidade.
  - Monitoramento - Parakanã: [P332] recebimento dos relatórios para marcar reunião.  [P595] [P620] sobre mapas de janeiro.'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:962ee8ba-950e-8367-b1e2-01f4e9020c63')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:012ee8ba-950e-8221-ab39-0141658ec0c3')::uuid, r.id, '> Pauta:
    Consultoria
    - [x] AP 00048/24 - Inventário GEE [IPEL]
    - [x] AP 00037/24 -  [P68] GEE [Tecverde]
    - [x] AP 00016/24 - [P67] de [P3] [CTA]
    - [x] AP xxxx/25 - Relatório de [P2] [CTA]
    - [x] AP 00051/24 - J6 Energia
    - [x] AP 00001/24 - Inventário GEE [Apsis]
    - [x] AP xxxx/25 - Inventário GEE [Salinor]
    - [x] AP 00005/24 - Inventário 25 e benchmarking [CTA]: [CTA]
    - [x] AP 00055/24 - Inventário de GEE [Tecverde]
    Propostas
    - [x] AP 00052/24 Relatório de [P2] [Acquapolo]
    - [x] [P31] S1 e S2 [[P615]]
    - [x] Emissão no MDL [[P464]]
    - [x] Inventário GEE [TJMT]
    - [x] Consultoria ESG [Plascar]
    - [x] [P371] de [P867][BPBioEnergy]
    - [x] AP 00003/25  - EVTE - [Fazenda União]
    - [x] [P866] [P32] - [[P231]]
    Projetos
    - [x] PDD - Parakanã
    - [x] MR - Parakanã
    - [x] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]:
    - Cobramos os dados não enviados ao [P333].
    - Reunião sobre escopo 2 hoje(24/02/2025).
    - [P252] mercado livre de energia antes da reunião e encaminhar email com glossário.
    - [P449] infos nas diretrizes técnicas.
    - Instituirmos cobrança informacional periódica, com base no cronograma do projeto. [P763] no ponto focal principal.
  - [P68] GEE [Tecverde]:
    - [P632] revisão para enviar relatório hoje.
  - Inventário de GEE [Tecverde]:
    - Reunião de levantamento de fontes realizada com falta de engajamento por parte do cliente.
    - Para clientes recorrentes: focar em validação de fontes já levantadas em anos anteriores.
    - [P263] situação adversas com clientes para superiores.
    - [P630]  a serem enviados até 28/02. [P17] de dados: 6 e 7/03.
    - Lembrete para Tecverde 27/03.
  - Inventário GEE [Salinor]:
    - [P346]: 27/03 - [P65] com todos da Salinor. Reunião levantamento de fontes deverá ser em menor escala.
    - Rodrigo [P456]: assumiu as funções da [P596].
  - Inventário GEE [Apsis]:
    - [P370] inventário de 2024, para apresentar os dois anos juntos.
    - GS, AC e MV separar funções. 11 a 14/03 (Semana com CA e FM fora).
    - [P106] separados, apresentação única.
  - [P67] de [P3] [CTA] e inventário 24:
    - [P479] reunião com [P234] para verificar mudanças nas fontes.
    - Apsis já tem histórico de cálculos para o agro utilizados em inventários e da literatura.
    - Preocupação recai sobre os dados e a rastreabilidade das informações (evidências).
    - [P601] entender com verificador o que será o foco da verificação e os principais dados necessários (principalmente a amostra relacionada as fontes de [P473] 3 do agro).
    - Indicar ABNT e BSI para CTA. [P250] conflito de interesse do [P660] e SGS.
    - 24 a 28/02 ou 6 e 7/03: Reunião de validação de fontes.
    - [P613] RPE: 30/05. [P33] na 1ª ou 2ª Semana de maio. (5 a 9/05 como ideal)
  - Relatório de [P2] [CTA]:
    - [P40] com [P133] 25/02 e [P813] off com CTA 27/02.
    - Equipe: GS e AC.
    - [P254] cronograma a partir da proposta para [P346]. [P363] com [P351] ([P133]).
    - Ponto de atenção: agendamento reuniões pontos focais
  - J6 Energia:
    - Buscar parceiro especialista ao setor de geração de energia, especialmente PCHs.
  - Inventário 25 e [P31] ([P473] 3 - [P21]) [CTA]:
    - Bench: inicia após Inventário 24.
  Propostas
  - Relatório de [P2] [Acquapolo]:
    - Visita agendada em SP.
  - [P31] S1 e S2 [[P615]]:
    - Vender na faixa para ter cases.  Ex: [P220], Banco [P764]…
    - Sem resposta.
  - EVTE - [Fazenda União]:
    - Reunião na quarta-feira (26/02)
  - [P866] - [P32] - [[P231]]:
    - [P20] na sexta-feira passada (21/02)
  - Emissão no MDL [[P464]]:
    - [P69] retorno.
  - Inventário GEE [TJMT]:
    - Sem retorno. [P597] TJ.
  - Consultoria ESG [Plascar]:
    - FUP 24/02. [P393].
  - [P371] de [P867][BPBioEnergy]:
    - Tentativa de agendamento de visita durante viagem a SP.
  [P226]
  - Inventário GEE TJs
  Projetos
  - PDD - Parakanã:'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:012ee8ba-950e-8221-ab39-0141658ec0c3')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:61aee8ba-950e-83cc-86b6-81ce5cdc1489')::uuid, r.id, '> Pauta:
    Consultoria
    - [x] AP 00048/24 - Inventário GEE [IPEL]
    - [x] AP 00037/24 -  [P68] GEE [Tecverde]
    - [x] AP 00016/24 - [P67] de [P3] [CTA]
    - [x] AP 00001/24 - Inventário GEE [Apsis]
    Propostas
    - [x] AP 00051/24 - J6 Energia
    - [x] Inventário GEE [[P135]]
    - [x] AP 00052/24 Relatório de [P2] [Acquapolo]
    - [x] Relatório de [P2] [CTA]
    - [x] AP 00005/24 - [P68] na [P19] de Carbono [CTA]
    - [x] AP 00001/25 - Inventário GEE [[P624]]
    - [x] AP 00055/24 - Inventário de GEE [Tecverde]
    - [x] AP 00003/25  - EVTE - [Fazenda União]
    Projetos
    - [x] PDD - Parakanã
    - [x] MR - Parakanã
    - [x] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]:
    - [P22] de fontes concluída. IPEL estimou até fim de fevereiro como prazo para enviar pendências.
    - [P130] se [P348] pode iniciar planilhamento de dados conforme chegarem.
    - Sobre informações omissas pelos clientes: deixarmos sempre claro nos relatórios que a verificação é remota com base em informações diretas dos clientes.
    - To Do’s
      - [ ] [P461] template relatório GEE para incluir considerandos
  - [P68] GEE [Tecverde]
    - Em finalização. [P20] após fim das férias da MV.
    - [P20] final: Relatório + tabela síntese anexa. [P795] do relatório é explicar os escopos e informações das emissões.
    - Em documentos enviados aos clientes, buscar reforçar a marca da Apsis Carbon.
    - [P449] [P771] na próxima reunião de fontes como ouvinte.
  - [P67] de [P3] [CTA]:
    - Reunião será com conselho de sustentabilidade (04/02). [P130] quem é responsável por cada escopo. [P473] 3 deve ser com a [P618].
  - Inventário GEE [Apsis]:
  a.  [P479] apresentação para o [P598] após volta de férias (MV e AC)
  Propostas
  - J6 Energia:
  a. [P514] provável esta semana.
  b. Equipe: [P771] e [P348].
  - Inventário GEE [[P239]]:
  a. Sem resposta. [P636] último contato.
    b. Se não houver retorno dar como “[P393]” no SAN.
    c.  [P457] regra de 3 tentativas máximas de contato após proposta.
  - Relatório de [P2] [Acquapolo]:
  a. [P622] técnica validada pela parte técnica. [P69].
  - Relatório de [P2] [CTA]:
  a. Proposta enviada considerando a [P133]([P351]) como parceira. [P69].
  - [P68] na [P19] de Carbono [CTA] e Inventário:
  a.  [P907] postergar a certificação. [P771] fará contato para propor realização de diagnóstico.
  - Inventário GEE [[P624]]:
  a. Sem retorno. FUP.
  - Inventário de GEE [Tecverde]:
  a. [P123] minuta do contrato. [P69].
  - EVTE - [Fazenda União]:
  a.  [P352] ao cliente. [P69]. [P778] validado com o conselho sobre o pagamento somente após a avaliação do projeto e conclusão do EVTE por parte do cliente.
  Projetos
  - PDD - Parakanã: LP terminou revisão. [P611] realizou as correções necessárias. [P599] pontos a se verificar com o jurídico.
  - MR - Parakanã: ‣. [P611] iniciou revisão do [P868]. 4 na semana passada.
  - Monitoramento - Parakanã:
  a. [P131](Nova Terra) conseguiu recuperar pontos de checagem que tinham sido perdidos. [P611] confirmará com [P782] [P469] se há pontos que não foram recuperados (aguardando).
  b.  [P130] outras empresas que possam substituir a NovaTerra.
  c. [P20] do novo questionário com o [P342] e preparação para instrução ao INDEVA: 03/02, 14h.
  [P735]:'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:61aee8ba-950e-83cc-86b6-81ce5cdc1489')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:8c7ee8ba-950e-8330-a0a4-819bf4215024')::uuid, r.id, '> Pauta:
  Consultoria
  - [x] AP xx/24 - Inventário GEE [IPEL]
  - [x] AP xx/24 -  [P68] GEE [Tecverde]
  - [x] AP xx/24 - [P67] de [P3] [CTA]
  - [x] AP xx/24 - Inventário GEE [Apsis]
  Projetos
  - [x] MR - Parakanã
  - [x] PDD - Parakanã
  - [x] Monitoramento - Parakanã
  Propostas
  - [x] AP xx/24 - J6 Energia
  - [x] Inventário GEE [[P239]]
  - [x] Inventário de [P2] [Acquapolo]
  - [x] Inventário GEE [[P624]]
  [P735]: 1h47
> Ata da reunião atual
  - [P566]: [P221] do template da Ata [P494].
  - Inventário GEE [Apsis]: [P630] finalizados. [P458] em etapa de editoração e revisão pelo [P771] [P334].
  - [P67] de [P3] [CTA]: [P606] retornou. A partir de 20/01. [P773] concluirá parte do relatório e liberará para a parte do [P771] esta semana.
  - [P67] de [P3] [CTA]: [P606] quer proposta de outro inventário (2025). [P655] antecipado, será avaliado se será cotado agora. [P606] também está interessado em acompanhamento de certificação e verificação de inventário(apenas assessoria). Proposta apenas de assessoria e estimativa para acompanhamento. [P335] informações com certificadoras.
  - [P68] GEE [Tecverde]: [P487] disse que faltava uma assinatura. [P130] andamento. Reunião 16h30 com [P353].
  - Crédito de Carbono[TecVerde]: [P392] nova rodada de treinamento com [P353].
  - Inventário GEE [IPEL]: Reunião KickOff hoje. Equipe diferente do ano anterior. [P628] sugerir o cronograma para eles com reunião de levantamento de fontes já para essa semana, com uma semana de prazo para envio. [P773] e [P348].
  - J6 Energia: [P18] ganha. [P636] FUP com [P341] se contrato está feito.
  - Inventário de [P2] [Acquapolo]: [P66] [P765] e não temos.  [P771] falou com [P626], especialista de relatórios ESG, e informou que as empreses têm buscado fazer relatório de impacto. [P862] tem framework, mas é bem mais centrado e gerencial nos impactos [P459] e [P124]. [P626] não faz mais RAS, indicou [P600].
  - Inventário GEE [[P239]]: [P773] enviará e-mail cobrando para envio de dados.
  - PDD Parakanã: [P862] jogar tabela da teoria da mudança para anexos. [P771] revisou  1 e 2, poderá revisar o resto conforme outras demandas. [P611] dará sinal verde. LP está revisando ainda, desde sexta. Após o MR, [P611] preencherá o [P908] [P125] [P812] no [P460] [P909]. [P632] o fluxo de caixa ([P345]). [P461] documentos acessórios.
  - MR Parakanã: 3 em andamento com [P611]. [P611] e [P345] marcarão reunião esta semana sobre capítulo 2. [P611] preencherá plano de monitoramento do 3 e 4. [P343] do 4 e 5: [P611] iniciará e depois [P345]. [P222] [P678] de monitoramento do 5.
  - Monitoramento Parakanã: Reunião dia 15 marcada com [P342]. [P223] as informações para contabilizar indicadores. [P30] de 2025 no radar para apresentar para IPES e INDEVA (verificar data na reunião de hoje).  Após terminar este MR e verificação, já adiantar as informações para segundo relatório.
> To-do das reuniões anteriores
  - [P158] 1
  - [P158] 2
  - [P158] 3'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:8c7ee8ba-950e-8330-a0a4-819bf4215024')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:9dcee8ba-950e-8246-bf58-012c5361e228')::uuid, r.id, '- se algum relatório não temos acesso, podemos pedir acesso específico
- ela sugeriu assistirmos o próximo seminar
- Padrão [P388]: [P143]
- Falar com a [P687] [P336] sobre Parakanã
- [P492] vai falar conosco sobre o fornecimento de dados relativos ao mercado'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:9dcee8ba-950e-8246-bf58-012c5361e228')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:16eee8ba-950e-8332-b532-8152a150205f')::uuid, r.id, '> Pauta:
  Consultoria
  - [x] AP 00048/24 - Inventário GEE [IPEL]
  - [x] AP 00037/24 -  [P68] GEE [Tecverde]
  - [x] AP 00016/24 - [P67] de [P3] [CTA]
  - [x] AP 00001/24 - Inventário GEE [Apsis]
  Propostas
  - [x] AP 00051/24 - J6 Energia
  - [x] Inventário GEE [[P135]]
  - [x] AP 00052/24 Relatório de [P2] [Acquapolo]
  - [x] Relatório de [P2] [CTA]
  - [x] [P68] na [P19] de Carbono [CTA]
  - [x] AP 00001/25 - Inventário GEE [[P624]]
  Projetos
  - [x] PDD - Parakanã
  - [x] MR - Parakanã
  - [x] Monitoramento - Parakanã
  [P735]: 1h30
> Ata da reunião atual
  - Inventário GEE [IPEL]: Reunião de confirmação de fontes marcada.(28/01) [P126] será enviado após eles confirmarem os prazos demandados. [P67] comercial: sondar possibilidades de fazer inventário para outras plantas e outros escopos.
  - [P68] GEE [Tecverde]: Reunião inicial feita semana passada, sem dúvidas deles. [P230] de logística facilitadas pelo alojamento ser perto, mas é necessário entender melhor como funciona este alojamento. Reunião de levantamento de fontes hoje. [P669] com a pressa da TecVerde(5º dia útil do mês), manter nosso padrão.
  - [P67] de [P3] [CTA]: [P356] contato com [P606]. Há também proposta de RAS, mas foge de nosso escopo pelo viés narrativo. [P252] se é viável fazermos, será necessário terceirizar redator etc.
  - Inventário GEE [Apsis]: [P632] apenas editoração do relatório([P771]).
  Propostas
  - AP xx/24 - J6 Energia: [P514] provável esta semana ou na outra. [P74] ler PD, metodologia e template. [P601] contato com a UNFCCC e conversar com [P341] para entender andamento da migração do MDL.
  - Inventário GEE [[P239]]: [P617] não enviaram nada.
  - Relatório de [P2] [Acquapolo]: Reunião feita com [P772] sobre cases. [P69] decisão.
  - Inventário GEE [[P624]]: [P337] proposta revisada. [P69] decisão.
  Projetos
  - PDD - Parakanã: LP já foi até cap. 3. [P862] demanda muita correção textual por enquanto. [P462] validações pelo jurídico necessárias. [P771] irá revisar [P868]. 3.
  - MR - Parakanã: ‣.  Reunião hoje com [P620] sobre andamento.
  - Monitoramento - Parakanã: [P22] de atividades prioritárias até sexta feira([P773] e [P348]). [P338] fluxo: relatórios enviados primeiro para [P342].
> To-do
  - [ ] [P419] disclaimer do [P68] GEE [Tecverde] para esta entrega.
  - [ ] [P67] de [P3] [CTA]: [P773] repassar relatório para [P771].
  - [ ] Inventário GEE [Apsis]: [P632] editoração.
  - [ ] J6 Energia: [P348] gerar lista de etapas e órgãos de emissão no MDL.
  - [ ] [P32] de nova áreas privadas([P348] e [P771])
  - [ ] Rascunho de projetos no Notion([P773] e [P771])
  - [ ] [P343] do Carbon [P814]([P771])'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:16eee8ba-950e-8332-b532-8152a150205f')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:cdaee8ba-950e-83ee-9f68-016e0da49005')::uuid, r.id, '# Projetos - Consultoria
Inventário GEE - Apsis
- [P303] em elaboração. [P613] mantido, apesar de ter havido grande retrabalho ao incluir centro de custo para algumas categorias na quinta-feira(02/01).
- [P773]: [P470] tirar a divisão de [P515] de custo para algumas categorias. [P771]: Inventário Apsis é um balão de ensaio nosso, então é válido manter a divisão por centro de custo para as categorias.
- OnFly: levantarmos o que precisamos de melhoria e inclusão na plataforma. [P127] do relatório. [P602] em soluções para coleta dos dados de [P515] de [P603].
- Orçarmos o inventário Apsis.
CTA
- Reunião com [P606] e [P482] essa semana.
TecVerde
- [P487] quer iniciar, mas não há contrato assinado. Reunião hoje para levantamento de cronograma, estrutura, responsabilidades, etc.
- [P74] ter informação do cronograma das obras para entender responsabilidades e fontes.
IPEL
- KickOff semana que vem. [P155] apresentação - [P773].
- San - [P771] e [P348].
J6
- [P773] e [P348]. [P370] a pesquisa na UNFCCC, mas “não mergulhar” ainda.
- Ler a proposta enviada ao cliente
- “PD” da PCH Queixada e metodologia
- Estudar projeto semelhantes com mesma metodologia
- Entregas por milestones (desde o início até a emissão)
# JPF
PDD
- Há colunas quebradas e desalinhadas. [P611] olhar tabela [P604] da [P374]. [P470] adicionar quebra de página pra fixar informações.
- Imagens em português, talvez explicar em texto.
- Após revisarmos, mandar pra LP revisar 1 e 2.
MR
- MR: [P128] implementação de canal de comunicação/denúncia.
- Andamento em ‣
- [P868]. 3 - [P611], [P868]. 4 - [P348] e  [P868].  5 - [P773]. [P670] alinhamento com [P345].  [P910] avanços na próxima [P494].
Monitoramento
- Reunião 07/01([P348] e [P773]): [P342] de férias, verificar se a reunião poderá ser feita só com o IPES e INDEVA ou remarcada.'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:cdaee8ba-950e-83ee-9f68-016e0da49005')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:ad6ee8ba-950e-8254-bc06-01d7a102346b')::uuid, r.id, '> Pauta:
    Consultoria
    - [x] AP 00048/24 - Inventário GEE [IPEL]
    - [x] AP 00037/24 -  [P68] GEE [Tecverde]
    - [x] AP 00016/24 - [P67] de [P3] [CTA]
    - [x] AP 00001/24 - Inventário GEE [Apsis]
    Propostas
    - [x] AP 00051/24 - J6 Energia
    - [x] Inventário GEE [[P135]]
    - [x] AP 00052/24 Relatório de [P2] [Acquapolo]
    - [x] Relatório de [P2] [CTA]
    - [x] [P68] na [P19] de Carbono [CTA]
    - [x] AP 00001/25 - Inventário GEE [[P624]]
    - [x] AP xxx - Inventário de GEE [Tecverde]
    - [x] EVTE - [Fazenda União]
    Projetos
    - [x] PDD - Parakanã
    - [x] MR - Parakanã
    - [x] Monitoramento - Parakanã
    [P735]:
> Ata da reunião atual
  Consultoria
  - Inventário GEE [IPEL]:
    - [P22] de fontes xx/xx
  - [P68] GEE [Tecverde]
    - Pendências  e fontes levantadas enviados em xx/xx. [P69] confirmação. FUP previsto para xx/xx. [P363] instruções de trabalho com [P614] [P511]
  - [P67] de [P3] [CTA]:
    - Inventário GEE 2024
      - [P22] de fontes xx/xx ([P339] o Inventário)
        - [P574] quem deve participar da reunião - [P773] (levantamento de fontes para inventário 2024.)([P773] indicar quem mais poderia estar na próxima reunião.)
      - [P630] fazendeiros:
        - [P606] enviou dados consolidados, precisamos ter separado por propriedade devido às características diferentes de cada área (em excel). A princípio, todos os cálculos conseguiram ser automatizados com os inputs recebidos.
        - [P595] envio dos dados abertos por fazenda - CJA
  - Inventário GEE [Apsis]:
    - [P88] gráficos - [P771]  ([P88] com [P771].)
  Propostas
  - J6 Energia:
    - Contrato em elaboração pelo cliente
    - FUP 27/01
  - Inventário GEE [[P239]]: [P636] FUP em 2 semanas.
  - Relatório de [P2] [Acquapolo]: [P69] resposta.
  - Relatório de [P2] [CTA]: [P642] contato com [P351]([P129] ESG e especialista da indústria de tabaco), recebido proposta e está em negociação para melhoria de margem.
  - [P68] na [P19] de Carbono [CTA] e Inventário: [P766] de proposta única para agregar valor.
  - Inventário GEE [[P624]]: FUP 22/01. [P69] resposta.
  - Inventário de GEE [Tecverde]: [P224] Contrato [P513] da Apsis. [P776] já têm o disponibilizado anteriormente.
  - EVTE - [Fazenda União]: [P352] proposta semana passada. [P69].
  Projetos
  - PDD - Parakanã: [P771] ainda revisando. LP fez comentários revisando, mas falta o final do 4.
  - MR - Parakanã: ‣.  Há trava devido às pendências do [P620]. Reunião esta quinta com [P620]. [P795] esta semana será revisão do [P868]. 4.
  - Monitoramento - Parakanã: [P225] as atividades prioritárias e enviadas para IPES e INDEVA. Reunião hoje. [P862] recebemos relatório do INDEVA(novembro e dezembro). 
[P370] análise dos relatórios IPES e INDEVA do segundo semestre de 2024.
  [P735]:  1h7m.
> To-do desta reunião
  - [ ] [P773] solicitar contrato social da Apsis Carbon.
  - [ ] [P611] cobrar LP para revisão do PDD.
  - [ ] [P773] cobrar envio dos relatórios do INDEVA.
  - [ ] [P595] envio dos dados abertos por fazenda([P606])([P771])
> To-do da reunião anterior
  - [x] [P419] disclaimer do [P68] GEE [Tecverde] para esta entrega.
  - [ ] [P67] de [P3] [CTA]: [P773] repassar relatório para [P771].
  - [ ] Inventário GEE [Apsis]: [P632] editoração.
  - [ ] J6 Energia: [P348] gerar lista de etapas e órgãos de emissão no MDL.
  - [ ] [P32] de nova áreas privadas([P348] e [P771])
  - [x] Rascunho de projetos no Notion([P773] e [P771])
  - [ ] [P343] do Carbon [P814]([P345])'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:ad6ee8ba-950e-8254-bc06-01d7a102346b')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:a88ee8ba-950e-8239-b21e-81b28db4d38b')::uuid, r.id, 'Pauta Reunião [P226]
  - [P598] do S1 e S2:
    - [P824] diretoria ficou de fazer o que a gente não tinha, dentro da matriz feita
    - Miguel ficou de agendar retomada do comitê com outros diretores
    - [P363] com LP o que é obrigatório, o que é recomendável e o que é opcional nas normas
  - Consultorias: fazer mailing de inventário de emissões GEE. [P767] ajuda para os executivos de conta da Apsis nessa abordagem:
    - [P740] lista de propostas enviadas de inventário
    - Avaliar empresas da cadeia de fornecimento / suprimentos das grandes
  - Falar com [P463] sobre
  Outros assuntos:
  conferir na base do balanço a despesa com viagens.
  [P910] com a [P605] sobre OCPC10 para gente, quais impactos o que precisamos mudar no balanço da SPE: ver reunião para essa semana
  - [P172] de 2025: ver com o LP na quinta agora, dia 9
  - [P30] Carbon: quais quais produtos iremos priorizar nesse trimestre, time, pegar o do ano passado e atualizar. 15 a 17, ver melhor horário
    - Falar de CBIOs
    - Falar de CPR Verde
    - Falar sobre qual segmento do mercado vamos focar na prospecção de empresas para consultoria (inventário, descarbonização, etc)
  - Alterar a precificação para valor, e não para custo'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:a88ee8ba-950e-8239-b21e-81b28db4d38b')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:9b4ee8ba-950e-82b4-8295-01e5654f0627')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - [P877] 20: dados.
      - Pendência de recebimento de dados da [P344].
      - [P630] de aplicativos fora do aplicativo [P789]: [P862] estavam inicialmente monitorados.
      - [P74] sistematizar a confecção do inventário da Apsis.
        - [P602] em como sistematizar.
          - incluir no relatório sugestão de automação
        - [P489] relatório Apsis - [P86] anos anteriores.
      - [P613]: dia 25, com relatório pronto.
  - [P67] de [P3] [CTA] e Inventário
    - Inventário: voltou da editoração. [P5] para [P606].
    - Estudo SBTI
      - Reunião feita com [P606]. [P35] SBTI 1.3 , 2.0, explicação do FLAG
      - Levantadas alternativas de descarbonização no campo.
      - [P130] reunião com corpo técnico da CTA.
        - [P602] em participação do [P482] conjuntamente
  - [P465] [P9] de impacto [CTA]
    - Questionários - respostas e planilhas resumos finalizadas.
      - Reunião de análise em stand-by.
      - [P619] enviou email com correções a serem feitas nas planilhas.
    - Viagem: final de agosto e início de setembro.
    - CTA vai sair do [P235].
    - Para próximos trabalhos: automatizar processos.
  - RAS 2025 [CTA]
    - [P622] 1 enviada em 09/07
      - [P618] enviou comentários desta parte
      - Checar com designers qual o prazo para versão com comentários da CTA
    - [P622] 2 com comentários CTA enviada
      - Checado os comentários e os mesmos respondidos: versão [P661]
      - Realizado versão [P662] com inclusão dos comentários
      - Checar com designers qual melhor formato para envio da versão com os comentários e qual prazo
    - [P622] 3 finalizada. A ser enviada amanhã ( 18/08/2026)
      - Boas vindas
      - Msg liderança
      - Descrição CTA
      - Estrutura de Governança e [P77]
      - Comunidade
    - Pessoas e financeiro enviado.
      - [P349] ter apoio com [P619]. [P71], Atenção: [P619] não tem entendimento total sobre condições dos produtores.
    - Para reduzir prazos com designers: intercalar entregas CTA e Aquapolo.
    - Reunião CA - AC
  - Emissão de CERS [J6 Energia]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS 2025 [Aquapolo]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P52]
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:9b4ee8ba-950e-82b4-8295-01e5654f0627')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:979ee8ba-950e-8322-9dda-8133d62ac406')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - [P877] 20: dados.
      - Pendência de recebimento de dados da [P344].
      - [P630] de aplicativos fora do aplicativo [P789]: [P862] estavam inicialmente monitorados.
      - [P74] sistematizar a confecção do inventário Apsis.
        - [P602] em como sistematizar.
  - [P67] de [P3] [CTA] e Inventário
    - Inventário: voltou da editoração. [P5] para [P606].
    - Estudo SBTI
      - Power [P663] [P257] para apresentação CTA feito.
  - [P465] [P9] de impacto [CTA]
    - Questionários realizados, inclusive o bilingue
      - [P613] de envio: 14/07/2026
    - Etapa de respostas: concluída.
      - Nuvem de palavras atualizada para cada um depois para todos juntos
      - Com resultados das pesquisas, formatar resultados das pesquisas.
      - No consolidado não incluir especialistas internos.
    - Viagem: final de agosto e inicio de setembro.
    - CTA vai sai do [P235].
    - Para próximos trabalhos: automatizar processos.
  - RAS 2025 [CTA]
    - [P622] 1 revisada de acordo com Reunião realizada em 06/07/2026, enviada em 09/07
      - [P618] enviou comentários desta parte
    - [P622] 3 em [P72]
    - Pessoas e financeiro enviado.
      - [P349] ter apoio com [P619]. [P71], Atenção: [P619] não tem entendimento total sobre condições dos produtores.
    - Para reduzir prazos com designers: intercalar entregas CTA e Aquapolo.
  - Emissão de CERS [J6 Energia]
    Prazos CDM
      - [P877] 30/06 - pedido de submissão de créditos
      - [P877] 30/09 - pagamento da taxa de administração
      - [P877] 15/11 - fazer mudanças na comunicação: focal point, PP
      - [P877] 31/12 - transicionar para CDM e transição de créditos
      - Completeness [P645] da emissão feita. [P355] etapa terminará 5 de agosto.
    - Outras propostas para J6
    - M&A - [P81] de 3 PCH.
    - 5 de agosto: [P613] para resposta da UNFCCC (verificar [P815])
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS 2025 [Aquapolo]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Compromisso com o [P616] e Bezero
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:979ee8ba-950e-8322-9dda-8133d62ac406')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:695ee8ba-950e-8260-8715-01a3dd5f1ec1')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - [P877] 20: dados.
      - Pendência de recebimento de dados da [P344].
      - [P630] de aplicativos fora do aplicativo [P789]: [P862] estavam inicialmente monitorados.
      - [P74] sistematizar a confecção do inventário da Apsis.
        - [P602] em como sistematizar.
          - incluir no relatório sugestão de automação
        - [P489] relatório Apsis - [P86] anos anteriores.
      - [P613]: dia 25, com relatório pronto.
  - [P67] de [P3] [CTA] e Inventário
    - Inventário: voltou da editoração. [P5] para [P606].
    - Estudo SBTI
      - Reunião feita com [P606]. [P35] SBTI 1.3 , 2.0, explicação do FLAG
      - Levantadas alternativas de descarbonização no campo.
      - [P130] reunião com corpo técnico da CTA.
        - [P602] em participação do [P482] conjuntamente
  - [P465] [P9] de impacto [CTA]
    - Questionários - respostas e planilhas resumos finalizadas.
      - Reunião de análise em stand-by.
      - [P619] enviou email com correções a serem feitas nas planilhas.
    - Viagem: final de agosto e início de setembro.
    - CTA vai sair do [P235].
    - Para próximos trabalhos: automatizar processos.
  - RAS 2025 [CTA]
    - [P622] 1 enviada em 09/07
      - [P618] enviou comentários desta parte
      - Checar com designers qual o prazo para versão com comentários da CTA
    - [P622] 2 com comentários CTA enviada
      - Checado os comentários e os mesmos respondidos: versão [P661]
      - Realizado versão [P662] com inclusão dos comentários
      - Checar com designers qual melhor formato para envio da versão com os comentários e qual prazo
    - [P622] 3 finalizada. A ser enviada amanhã ( 18/08/2026)
      - Boas vindas
      - Msg liderança
      - Descrição CTA
      - Estrutura de Governança e [P77]
      - Comunidade
    - Pessoas e financeiro enviado.
      - [P349] ter apoio com [P619]. [P71], Atenção: [P619] não tem entendimento total sobre condições dos produtores.
    - Para reduzir prazos com designers: intercalar entregas CTA e Aquapolo.
    - Reunião CA - AC
  - Emissão de CERS [J6 Energia]
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS 2025 [Aquapolo]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P52]
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:695ee8ba-950e-8260-8715-01a3dd5f1ec1')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:8c0ee8ba-950e-82ee-8a9e-01e19b0f3f4e')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - [P877] 20: dados.
      - Pendência de recebimento de dados da [P344].
      - [P630] de aplicativos fora do aplicativo [P789]: [P862] estavam inicialmente monitorados.
      - [P74] sistematizar a confecção do inventário da Apsis.
        - [P602] em como sistematizar.
        - [P489] relatório Apsis - [P86] anos anteriores
      - [P613]: dia 25, com relatório pronto.
  - [P67] de [P3] [CTA] e Inventário
    - Inventário: voltou da editoração. [P5] para [P606].
    - Estudo SBTI
      - Power [P663] [P257] para apresentação CTA feito.
  - [P465] [P9] de impacto [CTA]
    - Questionários - respostas e planilhas resumos finalizadas.
      - Reunião de análise em stand-by.
    - Viagem: final de agosto e início de setembro.
    - CTA vai sair do [P235].
    - Para próximos trabalhos: automatizar processos.
  - RAS 2025 [CTA]
    - [P622] 1 revisada de acordo com Reunião realizada em 06/07/2026, enviada em 09/07
      - [P618] enviou comentários desta parte
      - Checar com designers qual o prazo para versão com comentários da CTA
    - [P622] 2 diagramada será enviada em 13/08
    - [P622] 2 com comentários CTA enviada
      - Checado os comentários e os mesmos respondidos: versão [P661]
      - Realizado versão [P662] com inclusão dos comentários
      - Checar com designers qual melhor formato para envio da versão com os comentários e qual prazo
    - [P622] 3 finalizada:
      - Boas vindas
      - Msg liderança
      - Descrição CTA
      - Estrutura de Governança e [P77]
      - Comunidade
    - Pessoas e financeiro enviado.
      - [P349] ter apoio com [P619]. [P71], Atenção: [P619] não tem entendimento total sobre condições dos produtores.
    - Para reduzir prazos com designers: intercalar entregas CTA e Aquapolo.
      - 2 partes seguidas para CTA direto enquanto se envia para Aquapolo.
    - [P771]:
      - [P130] parte 2 hoje pós comentários AC com AC.
  - Emissão de CERS [J6 Energia]
    Prazos CDM
    - Outras propostas para J6
    - M&A - [P81] de 3 PCH - Sem resposta
    - 5 de agosto: [P613] para resposta da UNFCCC
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS 2025 [Aquapolo]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - [P52]
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:8c0ee8ba-950e-82ee-8a9e-01e19b0f3f4e')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:cbcee8ba-950e-8369-b18f-81c78ffe3fb6')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - [P877] 20: dados.
      - Pendência de recebimento de dados da sabrina.
      - Utilização de [P516] pra leitura de [P688].
        - Para inventários assegurados, verificar uso de geração de lista aleatória de amostra para ser verificada para conferência.
        - [P130] regra de asseguração para entender checagem de amostra.
        - Para pacto global (dia 20): apenas relatório.
        - Reunião GS-MV: relatório Apsis. 13/07 - 13h
  - [P67] de [P3] [CTA] e Inventário
    - Inventário: voltou da editoração. [P5] para [P606].
    - Estudo SBTI
      - [P484] organização de atribuições da equipe nesse estudo.
    - [P489] passo a passo para introdução. [P156] de metas.
      - Custo para estudos antes de submissão de meta: aprofundar o levantamento de custos da nossa estratégia já alinhada as necessidades SBTI.
      - Oq é necessário para a tomada de decisão.
      - Reunião Quarta-feira com CTA.
  - [P465] [P9] de impacto [CTA]
    - Questionários realizados, inclusive o bilingue
      - [P613] de envio: 14/07/2026
    - Visita presencial: final de julho e início de agosto, 3 dias.
    - Tarefas:
      - Alterar imagem do fundo do formulário: colocar imagem de capa do RAS do ano passado das folhas de tabaco na estufa
      - Colocar [P781] CTA na primeira página/pergunta.
      - [P155] tabela de controle com a edição de cada link.
      - [P475] editável em ptbr.
      - [P681] outros formulários para outros públicos
    - Formulários: entender se a resposta aos formulários está sendo feita pelo ponto focal.
  - RAS 2025 [CTA]
    - [P622] 1 revisada de acordo com Reunião realizada em 06/07/2026, enviada em 09/07
    - [P622] 3 em [P72]
    - Reunião CA/AC - 14/07 - 16h30
  - Emissão de CERS [J6 Energia]
    Prazos CDM
    - [P877] 30/06 - pedido de submissão de créditos
    - [P877] 30/09 - pagamento da taxa de administração
    - [P877] 15/11 - fazer mudanças na comunicação: focal point, PP
    - [P877] 31/12 - transicionar para CDM e transição de créditos
    - Completeness [P645] da emissão feita. [P355] etapa terminará 5 de agosto.
    - Outras propostas para J6
      - Transição do projeto para A6.4
      - Transferência de créditos para A6.4
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS 2025 [Aquapolo]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Compromisso com o [P616] e [P471] Bezero
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:cbcee8ba-950e-8369-b18f-81c78ffe3fb6')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:528ee8ba-950e-828b-aa97-01f5bb8ec5a1')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - [P877] 20: dados.
      - Pendência de recebimento de dados da sabrina.
      - Utilização de [P516] pra leitura de [P688].
        - Para inventários assegurados, verificar uso de geração de lista aleatória de amostra para ser verificada para conferência.
        - [P130] regra de asseguração para entender checagem de amostra.
        - Para pacto global (dia 20): apenas valores.
        - Reunião GS-MV: relatório Apsis. 13/07 - 13h
  - [P67] de [P3] [CTA] e Inventário
    - Inventário: voltou da editoração. [P5] para [P606].
    - [P606]: [P20] [P606] - SBTI
      - 21/07 - 16h30
    - Estudo SBTI
      - [P484] organização de atribuições da equipe nesse estudo.
      - SBTI - [P773] para [P611]
  - [P465] [P9] de impacto [CTA]
    - Questionários realizados, inclusive o bilingue
      - [P613] de envio: 14/07/2026
    - [P613] para preenchimento:: até quarta feira. FUP na quarta e mais uma semana de prazo.
    - [P84] sem resposta até 20/07: B, J, M, K.
    - Visita presencial: final de julho e início de agosto, 3 dias.
    - Formulários: entender se a resposta aos formulários está sendo feita pelo ponto focal.
    - Para próximos trabalhos: automatizar processos.
  - RAS 2025 [CTA]
    - [P622] 1 revisada de acordo com Reunião realizada em 06/07/2026, enviada em 09/07
      - [P618] enviou comentários desta parte
    - [P622] 3 em [P72]
    - [P343] [P134]: [P613] de 10 dias corridos.
      - [P877] 25: [P613]
    - Reunião CA/AC - 14/07 - 16h30
  - Emissão de CERS [J6 Energia]
    Prazos CDM
    - [P877] 30/06 - pedido de submissão de créditos
    - [P877] 30/09 - pagamento da taxa de administração
    - [P877] 15/11 - fazer mudanças na comunicação: focal point, PP
    - [P877] 31/12 - transicionar para CDM e transição de créditos
    - Completeness [P645] da emissão feita. [P355] etapa terminará 5 de agosto.
    - Outras propostas para J6
      - Transição do projeto para A6.4
      - Transferência de créditos para A6.4
    - M&A - [P81] de 3 PCH.
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS 2025 [Aquapolo]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Compromisso com o [P616] e [P471] Bezero
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:528ee8ba-950e-828b-aa97-01f5bb8ec5a1')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:77fee8ba-950e-834d-aff8-01e1bddcd0b3')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - E-mails da [P344] e [P232] recebidos.
      - GS: organizando [P630].
      - [P877] 20: dados.
  - [P67] de [P3] [CTA] e Inventário
    - Reunião interna: MV - preparação de estudo do SBTI para CTA.
      - Montagem de apresentação e CA
    - Reunião com [P606] (22 a 26) - [P356] [P67]
      - Requisitar informações de produção de 2025
      - [P155] material da [P67] com informações novas
    - Inventário enviado para editoração.
    - SBTI - Reunião na Quarta:
    - Reunião dia 7, 8 ou 9 para falar sobre SBTI com [P606].
      - [P155] dados de descarbonização com dados do novo inventário. - CA
      - Sexta feira - [P343] de
      - [P237] adequações pré adesão - custos no SBTI e custos internos.
  - [P465] [P9] de impacto [CTA]
    - [P618] e [P477] com [P227] diferente da nossa sobre dinâmica das entrevistas.
    - Questionário: CA e [P619] conversaram: estão revisando questionários.
    - Investidores e [P340]: fazer questionário bilingue.
    - Visita presencial: final de julho e início de agosto, 3 dias.
    - [P489] passo a passo para introdução. [P156] de metas.
      - Custo para estudos antes de submissão de meta: aprofundar o levantamento de custos da nossa estratégia já alinhada as necessidades SBTI.
      - Oq é necessário para a tomada de decisão.
      - Reunião Quarta-feira com CTA.
  - RAS 2025 [CTA]
    - Finalizada [P72] [P622] 1 - [P784] [P240]. [P352] para revisão de CA.
      - Em [P343].
    - Reunião RAS - 06/07/2026 - 17h
  - Emissão de CERS [J6 Energia]
    Prazos CDM
    - [P877] 30/06 - pedido de submissão de creditos
    - [P877] 30/09 - pagamento da taxa de administração
    - [P877] 15/11 - fazer mudanças na comunicação: focal point, PP
    - [P877] 31/12 - transicionar para CDM
    - [P862] deixam claro que tem prazo final para emissão dos créditos
    - [P613] para revisão do MR pela UNFCCC inicia hoje.
    - Checar com [P341] se faz sentido fazer mudança do FP.
    - [P130] posicionamento do J. [P228] em relação ao SBCE.
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS 2025 [Aquapolo]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Compromisso com o [P616] e [P471] Bezero
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:77fee8ba-950e-834d-aff8-01e1bddcd0b3')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();

insert into public.carbon_atas (id, reuniao_id, conteudo)
select md5('ata:backoffice:4f3ee8ba-950e-837d-b8f9-811a905d539e')::uuid, r.id, '> Pauta:
    Consultoria
    - [ ] AP 00001/24 - Inventário GEE [Apsis]
    - [ ] AP 00005/25 - Inventário 25 e [P67] de [P3] [CTA]
    - [ ] AP 00003/26 - [P465] de [P9] [CTA]
    - [ ] RAS 2025 [CTA]
    - [ ] AP 00051/24 - Emissão CERs [J6 Energia]
    - [ ] AP 00052/24 - Relatório de [P2] [Acquapolo]
    - [ ] AP-00023/25 - Inventário de [P230] [Cosmos 3D]
    - [ ] Relatório de impacto socioambiental [BRLig]
    - [ ] [P31] IFRS S1 e S2 [Aço Verde Brasil]
    - [ ] [P31] S1&S2 [DEXXOS]
    - [ ] Inventário GEE [EDF]
    - [ ] Inventário GEE [Lanxess]
    - [ ] Inventário [Salinor]
    Propostas
    - [ ] Propostas
    Projetos
    - [ ] [P221] e verificação - Parakanã
    - [ ] Monitoramento - Parakanã
    - [ ] Findings - Parakanã
    - [ ] [P652] [P229]
    [P735]:
> Ata da reunião atual
  1. Consultoria
  - Inventário GEE [Apsis]
    - Ano: 2023
      - [P109].
      - GS fazendo alterações pós revisão.
    - Anos: 2024
      - Status: Em andamento. [P343] e Relatório MV.
      - [P263] no relatório sobre OM quanto a mudança constante de reserve/onfly. etc. [P612] se mudou metodologia ou só fornecedor.
    - Ano: 2025
      - [P877] 20: dados.
      - Pendência de recebimento de dados da [P344].
      - [P630] de aplicativos fora do aplicativo [P789]: [P862] estavam inicialmente monitorados.
      - Relatório: fim dessa semana.
  - [P67] de [P3] [CTA] e Inventário
    - Inventário: voltou da editoração. [P5] para [P606].
    - Estudo SBTI
      - Power [P663] [P257] para apresentação CTA.
      - Pós almoço: AC atualizar [P771] sobre situação do PPT.
        - Próx. [P768]: Já atualizar e apresentar para CTA.
        - [P263] passos práticos a serem cumpridos para CTA.
  - [P465] [P9] de impacto [CTA]
    - Questionários realizados, inclusive o bilingue
      - [P613] de envio: 14/07/2026
    - Etapa de respostas: concluída.
      - [P84] H, [P769] representative. Sem respostas: preocupante.
    - Para próximos trabalhos: automatizar processos.
  - RAS 2025 [CTA]
    - [P622] 1 revisada de acordo com Reunião realizada em 06/07/2026, enviada em 09/07
      - [P618] enviou comentários desta parte
    - [P622] 3 em [P72]
    - Pessoas e financeiro enviado.
      - [P349] ter apoio com [P619]. [P71], Atenção: [P619] não tem entendimento total sobre condições dos produtores.
    - GS: Governança e ética (10 dias)
      - AC: enviar data da reunião com pessoal de jurídico para CA fornecer transcrição.
    - [P337] partes do relatório ao mesmo tempo que enviamos para CTA.
    - Reunião RAS Quinta feira .
  - Emissão de CERS [J6 Energia]
    Prazos CDM
      - [P877] 30/06 - pedido de submissão de créditos
      - [P877] 30/09 - pagamento da taxa de administração
      - [P877] 15/11 - fazer mudanças na comunicação: focal point, PP
      - [P877] 31/12 - transicionar para CDM e transição de créditos
      - Completeness [P645] da emissão feita. [P355] etapa terminará 5 de agosto.
    - Outras propostas para J6
      - Transição do projeto para A6.4
      - Transferência de créditos para A6.4
    - M&A - [P81] de 3 PCH.
    - 5 de agosto: [P613] para resposta da UNFCCC (verificar [P815])
  - [P31] IFRS S1 e S2 [Aço Verde Brasil]
  - [P31] S1&S2 [DEXXOS]
  - Inventário GEE [Lanxess]
  - Inventário GEE [EDF]
  - Inventário GEE [Salinor]
  - RAS 2025 [Aquapolo]
  - Propostas
  Interno - Apsis Carbon
  # Projetos
  - JPF Parakanã
  - Compromisso com o [P616] e Bezero
  - [P652] [P229]'
  from public.carbon_reunioes r
 where r.id = md5('reuniao:backoffice:4f3ee8ba-950e-837d-b8f9-811a905d539e')::uuid
on conflict (reuniao_id) do update set conteudo = excluded.conteudo, atualizado_em = now();


-- Conferencia.
do $$
declare
  n_atas integer;
  n_com_texto integer;
  n_sem_marcador integer;
  n_pend integer;
begin
  select count(*) into n_atas from public.carbon_atas;
  select count(*) into n_com_texto from public.carbon_atas where conteudo is not null;
  select count(*) into n_pend from public.carbon_ata_pendencias;

  -- As 7 atas antigas nasceram vazias; se alguma ficou sem conteudo depois
  -- desta carga, a reuniao dela nao foi encontrada e o insert-select passou
  -- batido em silencio.
  select count(*) into n_sem_marcador from public.carbon_atas where conteudo is null;

  raise notice 'atas: % (com texto: %), pendencias preservadas: %', n_atas, n_com_texto, n_pend;

  if n_com_texto <> 194 then
    raise exception 'esperado 194 atas com texto, encontrado %', n_com_texto;
  end if;
  if n_pend <> 14 then
    raise exception 'as 14 pendencias deveriam continuar presas as atas, encontrado %', n_pend;
  end if;
  if n_sem_marcador > 0 then
    raise exception '% atas ficaram sem conteudo: a reuniao delas nao foi encontrada', n_sem_marcador;
  end if;
end $$;

/**
 * Definicao dos quatro questionarios de campo, transcrita dos formularios
 * originais (tres do KoboToolbox e um em papel).
 *
 * ESTE ARQUIVO E A FONTE. O banco recebe uma copia por seed, porque a Edge
 * Function precisa da definicao para validar a resposta que chega, e a tela
 * precisa dela para desenhar o formulario. Duas copias de uma verdade so seria
 * problema se as duas fossem editaveis - por isso a do banco e SEMPRE gerada
 * daqui, nunca editada no dashboard.
 *
 * O QUE NAO FOI TRANSCRITO, e por que. Os originais pedem nome de pessoa em
 * cinco lugares: "Nome do Cacique", "Nome do entrevistado", "Nome da Koxoa",
 * "Contato (se houver)" e duas assinaturas. Nenhum virou campo:
 *
 *   - "Quem esta preenchendo", que no Kobo e uma lista com nomes da equipe,
 *     sai do login. Nao e pergunta.
 *   - o entrevistado entra pela FUNCAO, em `entrevistado_funcao`, que e coluna
 *     da tabela e nao pergunta do formulario. Para a auditoria importa ter
 *     ouvido um cacique ou uma Koxoa, nao qual deles.
 *   - contato e assinatura ficam de fora.
 *
 * O gatilho carbon_questionarios_sem_dado_pessoal recusa gravar resposta cuja
 * chave contenha nome, contato, telefone, email, cpf, rg ou assinatura, entao
 * reintroduzir um desses campos aqui quebra na hora de salvar, e nao seis meses
 * depois numa auditoria.
 *
 * CAMPOS DE ARQUIVO (foto, video, audio) estao declarados com tipo 'arquivo' e
 * a tela os mostra como pendentes: nao existe bucket de storage neste projeto
 * ainda. Declarar agora mantem a numeracao e o sentido do formulario, e liga
 * sozinho quando o upload existir.
 */

/* Vocabularios repetidos entre formularios. Escrever uma vez evita que o mesmo
   conceito ganhe rotulos diferentes em duas telas. */

const SIM_NAO = [
  { valor: 'sim', rotulo: 'Sim' },
  { valor: 'nao', rotulo: 'Não' },
];

const SIM_AS_VEZES_NAO = [
  { valor: 'sim', rotulo: 'Sim' },
  { valor: 'as_vezes', rotulo: 'Às vezes' },
  { valor: 'nao', rotulo: 'Não' },
];

const CONDICAO_ESTRUTURA = [
  { valor: 'boa', rotulo: 'Boa (estrutura completa)' },
  { valor: 'regular', rotulo: 'Regular (funciona, mas com problemas)' },
  { valor: 'precaria', rotulo: 'Precária (estrutura comprometida)' },
  { valor: 'sem_estrutura', rotulo: 'Não há estrutura física' },
];

const ESCOLA = [
  { valor: 'na_aldeia', rotulo: 'Sim, escola dentro da aldeia' },
  { valor: 'fora', rotulo: 'Não, alunos estudam fora da aldeia' },
  { valor: 'nao_estudam', rotulo: 'Não, alunos não estudam' },
];

const MERENDA = [
  { valor: 'boa', rotulo: 'Boa e regular' },
  { valor: 'insuficiente', rotulo: 'Insuficiente (quantidade baixa ou não atende a todos)' },
  { valor: 'irregular', rotulo: 'Irregular (falta com frequência)' },
];

const POSTO_SAUDE = [
  { valor: 'funciona', rotulo: 'Sim, funciona com agente de saúde' },
  { valor: 'sem_funcionar', rotulo: 'Sim, existe a estrutura mas não funciona' },
  { valor: 'nao_ha', rotulo: 'Não há' },
];

const AGENTE_ORIGEM = [
  { valor: 'propkn', rotulo: 'Sim, do ProPkn' },
  { valor: 'sesai', rotulo: 'Sim, da Sesai' },
  { valor: 'nao_ha', rotulo: 'Não há' },
];

const TRANSPORTE = [
  { valor: 'carro_cacique', rotulo: 'Sim, carro do cacique ou vice-cacique' },
  { valor: 'carro_membros', rotulo: 'Sim, carros de outros membros da comunidade' },
  { valor: 'nao_ha', rotulo: 'Não há carros na aldeia' },
];

const QUANTIDADE_0_2 = [
  { valor: 'nenhum', rotulo: 'Nenhum' },
  { valor: '1', rotulo: '1' },
  { valor: '2', rotulo: '2' },
  { valor: 'mais_de_2', rotulo: 'Mais de 2' },
];

const TIPO_POCO = [
  { valor: 'boca_larga', rotulo: 'Boca larga' },
  { valor: 'semiartesiano', rotulo: 'Semiartesiano' },
];

const ABASTECIMENTO = [
  { valor: 'bom', rotulo: 'Bom (tem água que atende a todos)' },
  { valor: 'medio', rotulo: 'Médio (tem água, mas o abastecimento é irregular)' },
  { valor: 'precario', rotulo: 'Precário (falta água ou é insuficiente)' },
];

const QUALIDADE_AGUA = [
  { valor: 'com_tratamento', rotulo: 'Há tratamento da água' },
  { valor: 'sem_tratamento', rotulo: 'Não há nenhum tratamento' },
  { valor: 'contaminacao', rotulo: 'Com relatos de contaminação ou problemas de saúde' },
];

const RESIDUOS = [
  { valor: 'queima_separado', rotulo: 'Queima em local separado' },
  { valor: 'queima_aleatorio', rotulo: 'Queima em local aleatório' },
  { valor: 'queima_buraco', rotulo: 'Queima em buraco' },
  { valor: 'sem_destinacao', rotulo: 'Sem destinação de resíduos' },
];

const ENERGIA_ALIMENTO = [
  { valor: 'tem', rotulo: 'Sim, tem geladeira ou freezer' },
  { valor: 'nao_tem', rotulo: 'Não tem geladeira nem freezer na aldeia' },
  { valor: 'compartilhado', rotulo: 'Geladeira ou freezer compartilhado entre casas' },
];

const CONHECE_PROJETO = [
  { valor: 'entende', rotulo: 'Sim, entende bem' },
  { valor: 'ouviu_falar', rotulo: 'Ouviu falar mas não entende direito' },
  { valor: 'nao_sabe', rotulo: 'Não sabe nada sobre' },
];

const MELHOROU = [
  { valor: 'sim', rotulo: 'Sim' },
  { valor: 'mais_ou_menos', rotulo: 'Mais ou menos' },
  { valor: 'nao', rotulo: 'Não' },
];

/** Fotos extras: os dois diagnosticos do Kobo terminam com dez campos iguais. */
const fotosExtras = (quantas) =>
  Array.from({ length: quantas }, (_, i) => ({
    chave: `foto_extra_${i + 1}`,
    rotulo: `Foto extra ${i + 1}`,
    tipo: 'arquivo',
  }));

/* ===== 1. Diagnostico Socioambiental ====================================== */

const socioambiental = {
  chave: 'socioambiental',
  nome: 'Diagnóstico Socioambiental',
  descricao: 'Diagnóstico da aldeia: educação, saúde, habitação, água, energia e percepção sobre o projeto de carbono.',
  origem: 'KoboToolbox',
  definicao: {
    secoes: [
      {
        chave: 'acesso',
        titulo: 'Acesso e identificação da área',
        perguntas: [
          { chave: 'placas_identificacao_ti', rotulo: 'Há placas de identificação na entrada da TI?', tipo: 'sim_nao', opcoes: SIM_NAO },
          { chave: 'acesso_por_propriedade_privada', rotulo: 'O acesso à aldeia passa por dentro de propriedades privadas?', tipo: 'sim_nao', opcoes: SIM_NAO },
        ],
      },
      {
        chave: 'educacao',
        titulo: 'Educação',
        perguntas: [
          { chave: 'ha_escola', rotulo: 'Há escola na aldeia?', tipo: 'escolha', opcoes: ESCOLA },
          { chave: 'condicao_escola', rotulo: 'Condições e status das escolas', tipo: 'escolha', opcoes: CONDICAO_ESTRUTURA },
          { chave: 'merenda_escolar', rotulo: 'Merenda escolar', tipo: 'escolha', opcoes: MERENDA },
          { chave: 'video_escola', rotulo: 'Filme a escola', tipo: 'arquivo' },
          { chave: 'foto_escola', rotulo: 'Fotografe a escola', tipo: 'arquivo' },
        ],
      },
      {
        chave: 'saude',
        titulo: 'Saúde',
        perguntas: [
          { chave: 'enfermaria_posto', rotulo: 'Enfermaria e posto de saúde', tipo: 'escolha', opcoes: POSTO_SAUDE },
          { chave: 'condicao_enfermaria', rotulo: 'Condição da enfermaria e posto de saúde', tipo: 'escolha', opcoes: CONDICAO_ESTRUTURA },
          { chave: 'agentes_saude', rotulo: 'Há agentes de saúde?', tipo: 'multipla', opcoes: AGENTE_ORIGEM },
          { chave: 'aisan', rotulo: 'Há AISAN?', tipo: 'multipla', opcoes: AGENTE_ORIGEM },
          { chave: 'sesai_trimestral', rotulo: 'Q7. Os atendimentos trimestrais médicos e odontológicos da SESAI estão acontecendo?', tipo: 'escolha', opcoes: SIM_AS_VEZES_NAO, dica: 'Essa política pública está sendo realizada?' },
          { chave: 'atendimento_casos_graves', rotulo: 'Q7. Em casos graves, há atendimento?', tipo: 'sim_nao', opcoes: SIM_NAO },
          { chave: 'projeto_ajudou_emergencia', rotulo: 'Q7. No último mês, o projeto de carbono ajudou em alguma emergência médica?', tipo: 'sim_nao', opcoes: SIM_NAO },
          { chave: 'meios_transporte', rotulo: 'Há meios de transporte disponíveis na comunidade?', tipo: 'multipla', opcoes: TRANSPORTE },
          { chave: 'foto_enfermaria', rotulo: 'Fotografe a enfermaria e posto de saúde', tipo: 'arquivo' },
          { chave: 'video_enfermaria', rotulo: 'Filme a enfermaria e posto de saúde', tipo: 'arquivo' },
          { chave: 'obs_saude_educacao', rotulo: 'Observações adicionais sobre saúde e educação', tipo: 'texto_longo' },
        ],
      },
      {
        chave: 'habitacao',
        titulo: 'Habitação',
        perguntas: [
          { chave: 'condicao_habitacoes', rotulo: 'Condições das habitações', tipo: 'texto_longo', dica: 'Descreva condições gerais e tipo das habitações da aldeia.' },
          { chave: 'foto_habitacoes', rotulo: 'Fotografe as condições das habitações', tipo: 'arquivo' },
          { chave: 'video_habitacoes', rotulo: 'Filme as condições das habitações', tipo: 'arquivo' },
        ],
      },
      {
        chave: 'agua_saneamento',
        titulo: 'Água e saneamento',
        perguntas: [
          { chave: 'numero_pocos', rotulo: 'Número de poços na aldeia', tipo: 'escolha', opcoes: QUANTIDADE_0_2 },
          { chave: 'tipos_pocos', rotulo: 'Quais os tipos de poços existentes?', tipo: 'multipla', opcoes: TIPO_POCO },
          { chave: 'condicao_abastecimento', rotulo: 'Quais as condições de abastecimento de água?', tipo: 'escolha', opcoes: ABASTECIMENTO },
          { chave: 'qualidade_agua', rotulo: 'Qualidade da água', tipo: 'multipla', opcoes: QUALIDADE_AGUA },
          { chave: 'percepcao_agua_segura', rotulo: 'Q5. O entrevistado acha que a água da comunidade é limpa e segura?', tipo: 'escolha', opcoes: SIM_AS_VEZES_NAO },
          { chave: 'foto_pocos', rotulo: 'Fotografe poços e estruturas de abastecimento', tipo: 'arquivo' },
          { chave: 'video_pocos', rotulo: 'Filme poços e estruturas de abastecimento', tipo: 'arquivo' },
          { chave: 'banheiros_comunitarios', rotulo: 'Há banheiros comunitários?', tipo: 'escolha', opcoes: QUANTIDADE_0_2 },
          { chave: 'foto_banheiros', rotulo: 'Fotografe os banheiros', tipo: 'arquivo' },
          { chave: 'gestao_residuos', rotulo: 'Gestão de resíduos', tipo: 'multipla', opcoes: RESIDUOS },
        ],
      },
      {
        chave: 'energia_conectividade',
        titulo: 'Energia e conectividade',
        perguntas: [
          { chave: 'internet_aldeia', rotulo: 'Há internet na aldeia?', tipo: 'escolha', opcoes: [
            { valor: 'starlink_jpf', rotulo: 'Sim, com starlink fornecida pelo JPF' },
            { valor: 'starlink_propkn', rotulo: 'Sim, com starlink fornecida pelo ProPkn' },
            { valor: 'ambas', rotulo: 'Sim, ambas' },
            { valor: 'nao_ha', rotulo: 'Não há internet' },
          ] },
          { chave: 'foto_antenas', rotulo: 'Fotografe as antenas starlink', tipo: 'arquivo' },
          { chave: 'video_antenas', rotulo: 'Filme as antenas starlink', tipo: 'arquivo' },
          { chave: 'energia_eletrica', rotulo: 'A comunidade tem acesso a energia elétrica?', tipo: 'escolha', opcoes: SIM_AS_VEZES_NAO },
          { chave: 'energia_armazenar_alimento', rotulo: 'Q6. O fornecimento de energia é suficiente para o armazenamento de alimentos sem estragar?', tipo: 'escolha', opcoes: ENERGIA_ALIMENTO },
          { chave: 'tres_refeicoes', rotulo: 'A comunidade tem acesso às 3 refeições diárias?', tipo: 'escolha', opcoes: SIM_AS_VEZES_NAO },
        ],
      },
      {
        chave: 'projeto_carbono',
        titulo: 'Projeto de carbono',
        perguntas: [
          { chave: 'q1_conhece_projeto', rotulo: 'Q1. O entrevistado sabe o que é o projeto de carbono?', tipo: 'escolha', opcoes: CONHECE_PROJETO },
          { chave: 'q2_informacao_recursos', rotulo: 'Q2. O entrevistado recebeu alguma informação sobre os recursos do projeto?', tipo: 'sim_nao', opcoes: SIM_NAO },
          { chave: 'q3_como_comunidade_e_informada', rotulo: 'Q3. De que forma a comunidade é informada sobre o projeto e as decisões dos caciques?', tipo: 'texto_longo' },
          { chave: 'q4_pode_se_manifestar', rotulo: 'Q4. O entrevistado sente que pode se manifestar em reuniões sobre o projeto?', tipo: 'escolha', opcoes: SIM_AS_VEZES_NAO },
          { chave: 'q12_protecao_melhorou', rotulo: 'Q12. O entrevistado sente que a proteção do território melhorou desde o início do projeto de carbono?', tipo: 'escolha', opcoes: MELHOROU },
          { chave: 'ativos_jpf', rotulo: 'Ativos entregues pelo Programa JPF (painéis, starlinks, etc.)', tipo: 'texto_longo', dica: 'Informe quantidades, status e observações. Exemplo: placas solares, antenas de internet, geladeira.' },
        ],
      },
      {
        chave: 'encerramento',
        titulo: 'Encerramento',
        perguntas: [
          { chave: 'necessidades_aldeia', rotulo: 'Necessidades especiais, demandas e pedidos da aldeia', tipo: 'texto_longo', dica: 'Seja específico.' },
          ...fotosExtras(10),
        ],
      },
    ],
  },
};

/* ===== 2. Diagnostico com as Koxoas ======================================= */

const koxoas = {
  chave: 'koxoas',
  nome: 'Diagnóstico Socioambiental - Koxoas',
  descricao: 'Mesmo diagnóstico da aldeia, aplicado às Koxoas. Registra a percepção delas sobre escola, saúde, água e o projeto de carbono.',
  origem: 'KoboToolbox',
  definicao: {
    secoes: [
      {
        chave: 'educacao',
        titulo: 'Educação',
        perguntas: [
          { chave: 'ha_escola', rotulo: 'Há escola na aldeia?', tipo: 'escolha', opcoes: ESCOLA },
          { chave: 'condicao_escola', rotulo: 'Condições e status das escolas', tipo: 'escolha', opcoes: CONDICAO_ESTRUTURA },
          { chave: 'merenda_escolar', rotulo: 'Merenda escolar', tipo: 'escolha', opcoes: MERENDA },
          { chave: 'necessidades_escola', rotulo: 'Necessidades, demandas e pedidos das Koxoas referentes às escolas', tipo: 'texto_longo', dica: 'Seja específico.' },
        ],
      },
      {
        chave: 'saude',
        titulo: 'Saúde',
        perguntas: [
          { chave: 'enfermaria_posto', rotulo: 'Enfermaria e posto de saúde', tipo: 'escolha', opcoes: POSTO_SAUDE },
          { chave: 'condicao_enfermaria', rotulo: 'Condição da enfermaria e posto de saúde', tipo: 'escolha', opcoes: CONDICAO_ESTRUTURA },
          { chave: 'agentes_saude', rotulo: 'Há agentes de saúde?', tipo: 'multipla', opcoes: AGENTE_ORIGEM },
          { chave: 'aisan', rotulo: 'Há AISAN?', tipo: 'multipla', opcoes: AGENTE_ORIGEM },
          { chave: 'sesai_trimestral', rotulo: 'Q7. Os atendimentos trimestrais médicos e odontológicos da SESAI estão acontecendo?', tipo: 'escolha', opcoes: SIM_AS_VEZES_NAO },
          { chave: 'atendimento_casos_graves', rotulo: 'Q7. Em casos graves, há atendimento?', tipo: 'sim_nao', opcoes: SIM_NAO },
          { chave: 'projeto_ajudou_emergencia', rotulo: 'Q7. No último mês, o projeto de carbono ajudou em alguma emergência médica?', tipo: 'sim_nao', opcoes: SIM_NAO },
          { chave: 'meios_transporte', rotulo: 'Há meios de transporte disponíveis na comunidade?', tipo: 'multipla', opcoes: TRANSPORTE },
          { chave: 'necessidades_saude', rotulo: 'Necessidades, demandas e pedidos das Koxoas referentes à saúde', tipo: 'texto_longo' },
        ],
      },
      {
        chave: 'habitacao_agua',
        titulo: 'Habitação, água e saneamento',
        perguntas: [
          { chave: 'condicao_habitacoes', rotulo: 'Condições das habitações', tipo: 'texto_longo', dica: 'Descreva condições gerais e tipo das habitações da aldeia.' },
          { chave: 'numero_pocos', rotulo: 'Número de poços na aldeia', tipo: 'escolha', opcoes: QUANTIDADE_0_2 },
          { chave: 'tipos_pocos', rotulo: 'Quais os tipos de poços existentes?', tipo: 'multipla', opcoes: TIPO_POCO },
          { chave: 'condicao_abastecimento', rotulo: 'Quais as condições de abastecimento de água?', tipo: 'escolha', opcoes: ABASTECIMENTO },
          { chave: 'qualidade_agua', rotulo: 'Qualidade da água', tipo: 'multipla', opcoes: QUALIDADE_AGUA },
          { chave: 'percepcao_agua_segura', rotulo: 'Q5. A Koxoa acha que a água da comunidade é limpa e segura?', tipo: 'escolha', opcoes: SIM_AS_VEZES_NAO },
          { chave: 'banheiros_comunitarios', rotulo: 'Há banheiros comunitários?', tipo: 'escolha', opcoes: QUANTIDADE_0_2 },
          { chave: 'gestao_residuos', rotulo: 'Gestão de resíduos', tipo: 'multipla', opcoes: RESIDUOS },
        ],
      },
      {
        chave: 'energia_alimentacao',
        titulo: 'Energia e alimentação',
        perguntas: [
          { chave: 'energia_armazenar_alimento', rotulo: 'Q6. O fornecimento de energia é suficiente para o armazenamento de alimentos sem estragar?', tipo: 'escolha', opcoes: ENERGIA_ALIMENTO },
          { chave: 'tres_refeicoes', rotulo: 'A comunidade tem acesso às 3 refeições diárias?', tipo: 'escolha', opcoes: SIM_AS_VEZES_NAO },
        ],
      },
      {
        chave: 'projeto_carbono',
        titulo: 'Projeto de carbono',
        perguntas: [
          { chave: 'q1_conhece_projeto', rotulo: 'Q1. A Koxoa sabe o que é o projeto de carbono?', tipo: 'escolha', opcoes: CONHECE_PROJETO },
          { chave: 'q2_informacao_recursos', rotulo: 'Q2. A Koxoa recebeu alguma informação sobre os recursos do projeto?', tipo: 'sim_nao', opcoes: SIM_NAO },
          { chave: 'q3_como_comunidade_e_informada', rotulo: 'Q3. De que forma a comunidade é informada sobre o projeto e as decisões dos caciques?', tipo: 'texto_longo' },
          { chave: 'q4_pode_se_manifestar', rotulo: 'Q4. A Koxoa sente que pode se manifestar em reuniões sobre o projeto?', tipo: 'escolha', opcoes: SIM_AS_VEZES_NAO },
          { chave: 'q12_protecao_melhorou', rotulo: 'Q12. A Koxoa sente que a proteção do território melhorou desde o início do projeto de carbono?', tipo: 'escolha', opcoes: MELHOROU },
          { chave: 'expectativas_projeto', rotulo: 'Quais as expectativas das Koxoas para o projeto de carbono?', tipo: 'texto_longo' },
          { chave: 'participa_colheita', rotulo: 'A Koxoa participa da colheita de açaí e castanha?', tipo: 'texto_longo' },
        ],
      },
      {
        chave: 'encerramento',
        titulo: 'Encerramento',
        perguntas: [
          { chave: 'necessidades_koxoas', rotulo: 'Necessidades especiais, demandas e pedidos das Koxoas', tipo: 'texto_longo', dica: 'Seja específico.' },
          ...fotosExtras(10),
        ],
      },
    ],
  },
};

/* ===== 3. Producao agricola e extrativismo (rocas) ======================== */

const rocas = {
  chave: 'rocas',
  nome: 'Produção Agrícola e Extrativismo',
  descricao: 'Levantamento das roças da aldeia: área de plantio, safra, manejo, comercialização, extrativismo, beneficiamento e queima de roçado.',
  origem: 'Formulário em papel',
  definicao: {
    secoes: [
      {
        chave: 'perfil_aldeia',
        titulo: 'Perfil da aldeia',
        perguntas: [
          { chave: 'familias_residentes', rotulo: 'Número de famílias residentes na aldeia', tipo: 'inteiro' },
          { chave: 'funcao_na_aldeia', rotulo: 'Função do entrevistado na aldeia', tipo: 'texto', dica: 'Cargo ou papel, não o nome. O nome não é guardado.' },
        ],
      },
      {
        chave: 'area_plantio',
        titulo: 'Identificação da área de plantio',
        perguntas: [
          { chave: 'area_util_ha', rotulo: 'Área útil para cultivo (hectares)', tipo: 'numero' },
          { chave: 'forma_plantio', rotulo: 'Forma de plantio de roça', tipo: 'escolha', opcoes: [
            { valor: 'comunitario', rotulo: 'Comunitário' },
            { valor: 'por_familia', rotulo: 'Por família' },
          ] },
          { chave: 'areas_em_uso', rotulo: 'Número de áreas de roça atualmente em uso', tipo: 'inteiro' },
        ],
      },
      {
        chave: 'finalidade',
        titulo: 'Finalidade da produção',
        perguntas: [
          { chave: 'finalidade_producao', rotulo: 'Finalidade da produção', tipo: 'escolha', opcoes: [
            { valor: 'subsistencia', rotulo: 'Subsistência' },
            { valor: 'comercializacao', rotulo: 'Comercialização' },
            { valor: 'ambos', rotulo: 'Ambos' },
            { valor: 'outros', rotulo: 'Outros' },
          ] },
          { chave: 'finalidade_outros', rotulo: 'Se outros, qual?', tipo: 'texto' },
        ],
      },
      {
        chave: 'infraestrutura_solo',
        titulo: 'Infraestrutura e solo',
        perguntas: [
          { chave: 'fontes_agua', rotulo: 'Fontes de água disponíveis', tipo: 'multipla', opcoes: [
            { valor: 'rio_corrego', rotulo: 'Rio ou córrego' },
            { valor: 'poco_artesiano', rotulo: 'Poço artesiano' },
            { valor: 'cisterna', rotulo: 'Cisterna' },
            { valor: 'acude', rotulo: 'Açude' },
          ] },
          { chave: 'mecanizacao', rotulo: 'Mecanização', tipo: 'escolha', opcoes: [
            { valor: 'trator_alugado', rotulo: 'Trator alugado' },
            { valor: 'manual', rotulo: 'Trabalho manual' },
            { valor: 'necessita_trator', rotulo: 'Necessita mecanização com trator' },
          ] },
          { chave: 'ferramentas', rotulo: 'Ferramentas utilizadas no cultivo', tipo: 'texto_longo' },
          { chave: 'condicao_solo', rotulo: 'Condição do solo para produção', tipo: 'escolha', opcoes: [
            { valor: 'boa', rotulo: 'Boa' },
            { valor: 'regular', rotulo: 'Regular' },
            { valor: 'ruim', rotulo: 'Ruim' },
          ] },
          { chave: 'condicao_solo_comentarios', rotulo: 'Comentários sobre o solo', tipo: 'texto_longo' },
        ],
      },
      {
        chave: 'planejamento_cultivo',
        titulo: 'Planejamento de cultivo (safra atual)',
        perguntas: [
          { chave: 'culturas_principais', rotulo: 'Cultura ou culturas principais', tipo: 'texto_longo' },
          { chave: 'area_mandioca_ha', rotulo: 'Área plantada de mandioca (ha)', tipo: 'numero' },
          { chave: 'area_milho_ha', rotulo: 'Área plantada de milho (ha)', tipo: 'numero' },
          { chave: 'area_feijao_ha', rotulo: 'Área plantada de feijão (ha)', tipo: 'numero' },
          { chave: 'area_banana_ha', rotulo: 'Área plantada de banana (ha)', tipo: 'numero' },
          { chave: 'area_macaxeira_ha', rotulo: 'Área plantada de macaxeira (ha)', tipo: 'numero' },
          { chave: 'area_outras_ha', rotulo: 'Área plantada de outras culturas (ha)', tipo: 'numero' },
          { chave: 'epoca_plantio', rotulo: 'Época de plantio', tipo: 'texto' },
          { chave: 'origem_sementes', rotulo: 'Sementes utilizadas', tipo: 'multipla', opcoes: [
            { valor: 'proprias', rotulo: 'Próprias (crioulas)' },
            { valor: 'compradas', rotulo: 'Compradas' },
            { valor: 'doadas', rotulo: 'Doadas' },
          ] },
          { chave: 'sementes_doadas_por', rotulo: 'Se doadas, por qual instituição?', tipo: 'texto', dica: 'Instituição ou programa, não pessoa.' },
        ],
      },
      {
        chave: 'manejo_insumos',
        titulo: 'Manejo e insumos',
        perguntas: [
          { chave: 'controle_pragas', rotulo: 'Controle de pragas e doenças', tipo: 'multipla', opcoes: [
            { valor: 'agrotoxicos', rotulo: 'Aplicação de agrotóxicos' },
            { valor: 'biologico', rotulo: 'Controle biológico' },
            { valor: 'nenhum', rotulo: 'Nenhum' },
          ] },
          { chave: 'adubacao', rotulo: 'Adubação', tipo: 'escolha', opcoes: [
            { valor: 'organica', rotulo: 'Orgânica' },
            { valor: 'quimica', rotulo: 'Química' },
            { valor: 'nenhuma', rotulo: 'Nenhuma' },
          ] },
          { chave: 'principais_pragas', rotulo: 'Principais pragas encontradas', tipo: 'texto_longo' },
        ],
      },
      {
        chave: 'comercializacao',
        titulo: 'Comercialização e gestão',
        perguntas: [
          { chave: 'destino_safra', rotulo: 'Destino da safra', tipo: 'multipla', opcoes: [
            { valor: 'venda_direta', rotulo: 'Venda direta ao consumidor' },
            { valor: 'cooperativas', rotulo: 'Cooperativas' },
            { valor: 'troca_entre_aldeias', rotulo: 'Troca de produtos entre aldeias' },
            { valor: 'consumo_proprio', rotulo: 'Consumo próprio' },
          ] },
          { chave: 'locais_comercializacao', rotulo: 'Locais de comercialização', tipo: 'multipla', opcoes: [
            { valor: 'novo_repartimento', rotulo: 'Novo Repartimento' },
            { valor: 'itupiranga', rotulo: 'Itupiranga' },
            { valor: 'maraba', rotulo: 'Marabá' },
            { valor: 'tucurui', rotulo: 'Tucuruí' },
            { valor: 'outros', rotulo: 'Outros' },
          ] },
          { chave: 'locais_outros', rotulo: 'Se outros locais, quais?', tipo: 'texto' },
          { chave: 'produtos_comercializados', rotulo: 'Principais produtos comercializados', tipo: 'texto_longo' },
          { chave: 'quantidade_ano', rotulo: 'Quantidade comercializada por ano', tipo: 'texto' },
          { chave: 'dificuldades_comercializacao', rotulo: 'Principais dificuldades para comercialização', tipo: 'texto_longo' },
        ],
      },
      {
        chave: 'extrativismo',
        titulo: 'Produtos extrativistas',
        perguntas: [
          { chave: 'produtos_coletados', rotulo: 'Produtos coletados', tipo: 'multipla', opcoes: [
            { valor: 'acai', rotulo: 'Açaí' },
            { valor: 'castanha', rotulo: 'Castanha' },
            { valor: 'cacau', rotulo: 'Cacau' },
            { valor: 'mel', rotulo: 'Mel' },
            { valor: 'copaiba', rotulo: 'Copaíba' },
            { valor: 'andiroba', rotulo: 'Andiroba' },
            { valor: 'sementes', rotulo: 'Coleta de sementes' },
            { valor: 'outros', rotulo: 'Outros' },
          ] },
          { chave: 'extrativismo_outros', rotulo: 'Se outros produtos, quais?', tipo: 'texto' },
          { chave: 'sementes_coletadas', rotulo: 'Quais sementes são coletadas?', tipo: 'texto_longo' },
          { chave: 'extrativismo_quantidade_ano', rotulo: 'Quantidade produzida por ano', tipo: 'texto' },
          { chave: 'extrativismo_destino', rotulo: 'Destino da produção extrativista', tipo: 'escolha', opcoes: [
            { valor: 'consumo_proprio', rotulo: 'Consumo próprio' },
            { valor: 'venda', rotulo: 'Venda' },
            { valor: 'ambos', rotulo: 'Ambos' },
          ] },
        ],
      },
      {
        chave: 'beneficiamento',
        titulo: 'Beneficiamento na aldeia',
        perguntas: [
          { chave: 'beneficiamento_produtos', rotulo: 'Produtos beneficiados na aldeia', tipo: 'multipla', opcoes: [
            { valor: 'farinha', rotulo: 'Farinha' },
            { valor: 'acai', rotulo: 'Açaí' },
            { valor: 'castanha', rotulo: 'Castanha' },
            { valor: 'oleo_vegetal', rotulo: 'Óleo vegetal' },
            { valor: 'outros', rotulo: 'Outros' },
          ] },
          { chave: 'beneficiamento_outros', rotulo: 'Se outros, quais?', tipo: 'texto' },
          { chave: 'processo_farinha', rotulo: 'Como é realizado o processo de produção da farinha na aldeia?', tipo: 'texto_longo' },
          { chave: 'produtos_beneficiados_detalhe', rotulo: 'Quais produtos são beneficiados na aldeia?', tipo: 'texto_longo' },
          { chave: 'culturas_perenes_interesse', rotulo: 'Quais culturas perenes possuem interesse em implantar?', tipo: 'texto_longo' },
        ],
      },
      {
        chave: 'infraestrutura_aldeia',
        titulo: 'Infraestrutura existente na aldeia',
        perguntas: [
          { chave: 'tem_casa_farinha', rotulo: 'Existe casa de farinha?', tipo: 'sim_nao', opcoes: SIM_NAO },
          { chave: 'tem_galpao', rotulo: 'Existe galpão para armazenamento?', tipo: 'sim_nao', opcoes: SIM_NAO },
          { chave: 'tem_energia', rotulo: 'Existe energia elétrica?', tipo: 'sim_nao', opcoes: SIM_NAO },
          { chave: 'tem_internet', rotulo: 'Existe acesso à internet?', tipo: 'sim_nao', opcoes: SIM_NAO },
          { chave: 'tem_transporte', rotulo: 'Existe meio de transporte?', tipo: 'sim_nao', opcoes: SIM_NAO },
          { chave: 'tem_veiculo_producao', rotulo: 'Existe veículo para apoio à produção?', tipo: 'sim_nao', opcoes: SIM_NAO },
        ],
      },
      {
        chave: 'queima_rocado',
        titulo: 'Planejamento de queima de roçado',
        perguntas: [
          { chave: 'previsao_queima', rotulo: 'Há previsão de queima nesta safra?', tipo: 'sim_nao', opcoes: SIM_NAO },
          { chave: 'periodo_queima', rotulo: 'Período previsto para a queima', tipo: 'texto' },
          { chave: 'area_queima_ha', rotulo: 'Tamanho da área a ser queimada (ha)', tipo: 'numero' },
          { chave: 'local_queima', rotulo: 'Localização da área de queima', tipo: 'texto_longo' },
          { chave: 'precisa_brigada', rotulo: 'Necessita acompanhamento da brigada ou da equipe de vigilância?', tipo: 'sim_nao', opcoes: SIM_NAO },
          { chave: 'tem_aceiro', rotulo: 'Existe aceiro ao redor da área?', tipo: 'sim_nao', opcoes: SIM_NAO },
        ],
      },
      {
        chave: 'relacoes_e_participacao',
        titulo: 'Relações e participação',
        perguntas: [
          { chave: 'relacao_vizinhos', rotulo: 'Como é a relação da aldeia com os proprietários e comunidades vizinhas?', tipo: 'escolha', opcoes: [
            { valor: 'boa', rotulo: 'Boa' },
            { valor: 'regular', rotulo: 'Regular' },
            { valor: 'ruim', rotulo: 'Ruim' },
          ] },
          { chave: 'relacao_vizinhos_comentarios', rotulo: 'Comentários sobre a relação com os vizinhos', tipo: 'texto_longo' },
          { chave: 'participacao_mulheres', rotulo: 'Como ocorre a participação das mulheres nas atividades produtivas?', tipo: 'multipla', opcoes: [
            { valor: 'plantio', rotulo: 'Plantio' },
            { valor: 'colheita', rotulo: 'Colheita' },
            { valor: 'beneficiamento', rotulo: 'Beneficiamento' },
            { valor: 'comercializacao', rotulo: 'Comercialização' },
            { valor: 'gestao', rotulo: 'Gestão da produção' },
          ] },
          { chave: 'participacao_mulheres_comentarios', rotulo: 'Comentários sobre a participação das mulheres', tipo: 'texto_longo' },
        ],
      },
      {
        chave: 'necessidades',
        titulo: 'Necessidades e observações',
        perguntas: [
          { chave: 'dificuldades', rotulo: 'Principais dificuldades enfrentadas atualmente', tipo: 'multipla', opcoes: [
            { valor: 'falta_trator', rotulo: 'Falta de trator' },
            { valor: 'falta_implementos', rotulo: 'Falta de implementos agrícolas' },
            { valor: 'falta_sementes', rotulo: 'Falta de sementes' },
            { valor: 'falta_ferramentas', rotulo: 'Falta de ferramentas' },
            { valor: 'transporte', rotulo: 'Transporte' },
            { valor: 'comercializacao', rotulo: 'Comercialização' },
            { valor: 'assistencia_tecnica', rotulo: 'Assistência técnica' },
            { valor: 'beneficiamento', rotulo: 'Beneficiamento da produção' },
            { valor: 'controle_incendios', rotulo: 'Controle de incêndios' },
            { valor: 'outros', rotulo: 'Outros' },
          ] },
          { chave: 'dificuldades_comentarios', rotulo: 'Comentários sobre as dificuldades', tipo: 'texto_longo' },
          { chave: 'instituicoes_parceiras', rotulo: 'Existem outras instituições parceiras que apoiam nas atividades produtivas?', tipo: 'texto_longo' },
          { chave: 'observacoes_gerais', rotulo: 'Observações gerais', tipo: 'texto_longo' },
        ],
      },
    ],
  },
};

/* ===== 4. Formulario da ronda ============================================= */

const ronda = {
  chave: 'ronda',
  nome: 'Formulário da Ronda',
  descricao: 'Registro de alerta observado em campo durante a ronda de vigilância territorial, com classificação, coordenada e relato.',
  origem: 'KoboToolbox',
  definicao: {
    secoes: [
      {
        chave: 'alerta',
        titulo: 'Alerta observado',
        perguntas: [
          { chave: 'numero_alerta', rotulo: 'Número do alerta observado', tipo: 'texto', obrigatoria: true },
          { chave: 'classificacao', rotulo: 'Classifique o alerta', tipo: 'escolha', obrigatoria: true, opcoes: [
            { valor: 'desmatamento_ilegal', rotulo: 'Desmatamento ilegal dentro da TI' },
            { valor: 'roca', rotulo: 'Roça' },
            { valor: 'garimpo', rotulo: 'Garimpo' },
            { valor: 'abertura_acesso', rotulo: 'Abertura de acesso' },
            { valor: 'incendio', rotulo: 'Incêndio' },
            { valor: 'falso_positivo', rotulo: 'Falso positivo' },
            { valor: 'outros', rotulo: 'Outros (descreva na observação)' },
          ] },
          { chave: 'observacoes_ponto', rotulo: 'Observações adicionais sobre o ponto observado', tipo: 'texto_longo' },
          { chave: 'ronda_referencia', rotulo: 'Qual a ronda?', tipo: 'texto', dica: 'No formato MM-AAAA, como no formulário original. Exemplo: 07-2026.' },
        ],
      },
      {
        chave: 'registro',
        titulo: 'Registro do local',
        perguntas: [
          { chave: 'foto_alerta', rotulo: 'Registro fotográfico', tipo: 'arquivo', dica: 'Escolha o melhor ângulo para mostrar todo o local.' },
          { chave: 'audio_relato', rotulo: 'Breve relato sobre o alerta', tipo: 'arquivo', dica: 'Áudio curto explicando melhor o local observado.' },
          { chave: 'video_area', rotulo: 'Vídeo da área do alerta', tipo: 'arquivo', dica: 'Vídeo de até 30 segundos.' },
        ],
      },
    ],
  },
};

export const QUESTIONARIOS = [socioambiental, koxoas, rocas, ronda];

export default QUESTIONARIOS;

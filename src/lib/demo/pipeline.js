/**
 * demo/pipeline.js - dataset de demonstração da tela de Pipeline (issue #13).
 *
 * POR QUE EXISTE: permite revisar a tela sem banco. Em MODO_DEMO (ver
 * src/lib/runtimeConfig.js: exige dev E o clique no botão de demonstração) as funções de
 * src/lib/api/pipeline.js não fazem rede e operam sobre o estado em memória daqui. As
 * mutações ALTERAM esse estado, porque os dois gestos centrais da tela - dar nota num
 * critério e ver a nota ponderada se mexer, e promover um candidato aprovado a projeto -
 * só são revisáveis se de fato acontecerem.
 *
 * ESCOPO: não é cache nem persistência. Recarregar a página volta ao estado inicial. Em
 * build de produção MODO_DEMO é false por força (import.meta.env.DEV é estático) e o
 * bundler elimina os ramos que chamam este módulo, junto com o módulo inteiro.
 *
 * FIDELIDADE AO BANCO - cada regra abaixo tem contraparte em
 * supabase/migrations/20260814099000_pipeline.sql, e as duas TÊM de concordar, senão a
 * revisão do dono mostra um número que a produção nunca produz:
 *
 *   1. nota_ponderada = soma(nota * peso) / soma(peso), somente sobre critérios ATIVOS
 *      que TÊM nota, arredondada em 2 casas       (carbon_candidatos_listagem)
 *   2. critério SEM nota fica FORA do denominador. Ausência não é zero: zero entra na
 *      média e derruba o candidato, ausência derruba a cobertura            (idem)
 *   3. cobertura_pct = avaliados * 100 / critérios ativos, 1 casa            (idem)
 *   4. etapa_ordem segue o funil: triagem 1 ... descartado 5                 (idem)
 *   5. o resumo e o panorama por segmento IGNORAM os filtros: são sempre o funil
 *      inteiro                                          (carbon_pipeline_listar)
 *   6. os três segmentos aparecem SEMPRE no panorama, inclusive zerados
 *                                             (carbon_pipeline_por_segmento)
 *   7. o detalhe traz os critérios ATIVOS, e não só os que já têm nota, para a matriz
 *      mostrar a linha vazia do critério esquecido    (carbon_candidato_detalhe)
 *   8. só candidato na etapa `aprovado` vira projeto, e a conversão é IDEMPOTENTE
 *                                        (carbon_candidato_criar_projeto)
 *   9. uma nota por cruzamento candidato x critério: regravar corrige, não duplica
 *                                        (carbon_candidato_notas_unica)
 *
 * SOBRE OS DADOS: os oito critérios são cópia literal do seed da migration - são
 * METODOLOGIA de análise de projeto de carbono, pública e sem dado de cliente. Os três
 * candidatos e os dois parceiros são os registros que já existem em
 * supabase/seeds/notion_dados_reais.sql; nome de território e nome de instituto são
 * pessoa jurídica e geografia pública. O que a origem NÃO tinha - etapa diferente de
 * triagem, UF, área, preço de referência, elegibilidade CORSIA e todas as notas - é
 * preenchimento de demonstração, e está aqui porque uma tela em que a coluna de nota
 * está vazia em todas as linhas não permite revisar a matriz que a issue #13 existe para
 * construir. A área em hectares é aproximada de propósito: na triagem o número vem de
 * conversa ou de mapa, e é isso que a coluna significa.
 *
 * O CASO DA FLONA TAPAJÓS É DADO REAL E FOI PRESERVADO. Ela está com segmento
 * `redd_privado` e a observação diz que a classificação está errada: Floresta Nacional é
 * unidade de conservação federal e o enum de segmento não tem categoria para ela. A
 * observação fica visível na tela, não escondida - é o registro de uma limitação
 * conhecida do modelo, e apagá-la faria a classificação errada parecer intencional.
 *
 * LGPD: nenhum nome de pessoa, e-mail ou telefone, nem aqui nem em campo de texto livre.
 * Parceiro é pessoa jurídica.
 */

/* ===== Erro tipado ========================================================
   Mesmos códigos do backend, para a tela não tratar validação de um jeito no demo e de
   outro em produção. Classe própria e não a de outro domínio: quem converte em ErroApi
   (chamarDemo, em src/lib/api/base.js) só olha `codigo`, e acoplar dois datasets faria um
   mudar quando o outro mudasse.

   DIVERGÊNCIA CONHECIDA E ACEITA: chamarDemo mapeia todo código que não seja
   'nao_encontrado' para status 400, então 'candidato_nao_aprovado' chega como 400 aqui e
   como 409 em produção. A tela decide pelo CÓDIGO e nunca pelo status, então não há
   diferença de comportamento; alinhar os status exigiria uma tabela de status no demo,
   que é mais uma coisa para divergir.                                        */
export class ErroDemoPipeline extends Error {
  constructor(codigo) {
    super(`Recusado pelo modo demonstracao: ${codigo}`);
    this.name = 'ErroDemoPipeline';
    this.codigo = codigo;
  }
}

/* ===== Estado =============================================================
   Montado na PRIMEIRA LEITURA e não no topo do módulo. Uma expressão de topo é efeito
   colateral que o Rollup não consegue provar puro, e o módulo inteiro (com o dataset)
   ficaria vivo no bundle de produção mesmo com todos os ramos que o chamam eliminados.
   O acessador bd() é o mesmo padrão de src/lib/demo/indicadores.js.           */
let estado = null;

function inicial() {
  return {
    parceiros: [
      {
        id: 'demo-parc-1',
        nome: 'INDEVA',
        tipo: 'instituto',
        papel: 'Instituto parceiro na articulação com as comunidades do território',
        contato_institucional: null,
        ativo: true,
        criado_por: null,
        criado_em: '2026-08-01T12:00:00Z',
        atualizado_em: '2026-08-01T12:00:00Z',
      },
      {
        id: 'demo-parc-2',
        nome: 'IPES',
        tipo: 'instituto',
        papel: 'Instituto parceiro em levantamento socioambiental',
        contato_institucional: null,
        ativo: true,
        criado_por: null,
        criado_em: '2026-08-01T12:00:00Z',
        atualizado_em: '2026-08-01T12:00:00Z',
      },
    ],

    // Cópia literal do seed da migration: nome, peso e descrição. Os pesos são o que
    // faz a matriz responder certo - dominialidade (3) e estrada ruim (1) não podem
    // valer o mesmo, senão a média empata o que mata o projeto com o que o encarece.
    criterios: [
      criterio(
        'demo-crit-1',
        'Dominialidade e regularidade da area',
        3,
        'Quem detem o direito sobre a area e sobre o carbono, e se a documentacao sustenta isso. Nota alta: titularidade clara, sem litigio e sem sobreposicao. Nota baixa: cadeia dominial incerta, area em disputa ou sem anuencia de quem decide.'
      ),
      criterio(
        'demo-crit-2',
        'Georreferenciamento disponivel',
        2,
        'Existe arquivo geoespacial da area e ele fecha com o tamanho declarado. Nota alta: poligono entregue e coerente. Nota baixa: apenas descricao em texto ou mapa aproximado.'
      ),
      criterio(
        'demo-crit-3',
        'Elegibilidade da metodologia',
        3,
        'Ha metodologia aplicavel ao tipo de area e ao uso do solo, e o projeto cabe nos requisitos dela. Nota baixa: nenhuma metodologia se encaixa, ou o encaixe depende de interpretacao que o validador pode recusar.'
      ),
      criterio(
        'demo-crit-4',
        'Adicionalidade e linha de base',
        3,
        'Ha ameaca real e demonstravel ao estoque de carbono. Nota alta: pressao de desmatamento documentada e linha de base defensavel. Nota baixa: area conservada sem ameaca demonstravel.'
      ),
      criterio(
        'demo-crit-5',
        'Risco de reversao e permanencia',
        2,
        'Quanto do carbono corre risco de voltar para a atmosfera por desmatamento, fogo, invasao ou mudanca de uso, e o que existe para conter isso.'
      ),
      criterio(
        'demo-crit-6',
        'Governanca local e parceiro',
        2,
        'A organizacao parceira existe, representa de fato quem precisa ser representado e tem capacidade de execucao. Em terra indigena este criterio carrega o consentimento livre, previo e informado.'
      ),
      criterio(
        'demo-crit-7',
        'Acesso, logistica e custo de campo',
        1,
        'Quanto custa e quanto demora chegar a area para inventario, monitoramento e visita de auditoria. Peso menor de proposito: encarece o projeto, mas nao o inviabiliza.'
      ),
      criterio(
        'demo-crit-8',
        'Preco de mercado e elegibilidade CORSIA',
        2,
        'O retorno esperado do credito futuro sustenta o custo de estruturar o projeto. Elegibilidade CORSIA muda o preco do credito, ou seja muda a conta que decide prospectar.'
      ),
    ],

    candidatos: [
      {
        id: 'demo-cand-1',
        nome: 'TI Pimentel Barbosa',
        segmento: 'terra_indigena',
        metodologia: 'VM0048',
        uf: 'MT',
        municipio: 'Canarana',
        area_estimada_ha: 328000,
        parceiro_id: 'demo-parc-1',
        etapa: 'aprovado',
        premissas:
          'Anuencia da comunidade formalizada nas consultas e ameaca de desmatamento no entorno demonstravel pela serie do satelite.',
        falhas: 'Falta o arquivo geoespacial fechado; hoje so existe o limite do decreto de homologacao.',
        virtudes: 'Area continua, parceiro atuante no territorio e pressao de desmatamento documentada no entorno.',
        preco_mercado_ref: 8.5,
        preco_mercado_moeda: 'USD',
        preco_mercado_data: '2026-07-31',
        preco_mercado_fonte: 'Relatorio de mercado de credito florestal',
        elegivel_corsia: true,
        observacoes: null,
        projeto_id: null,
        criado_por: null,
        criado_em: '2026-08-05T12:00:00Z',
        atualizado_em: '2026-08-20T12:00:00Z',
      },
      {
        id: 'demo-cand-2',
        nome: 'TI Parecis',
        segmento: 'terra_indigena',
        metodologia: null,
        uf: 'MT',
        municipio: 'Tangara da Serra',
        area_estimada_ha: 56000,
        parceiro_id: 'demo-parc-2',
        etapa: 'analise_preliminar',
        premissas: 'Depende de confirmar se ha ameaca de conversao suficiente para sustentar a linha de base.',
        falhas: 'Sem levantamento de campo e sem estimativa de estoque; a analise ainda nao passou da leitura de mapa.',
        virtudes: 'Acesso rodoviario e base logistica proxima, o que reduz o custo de inventario e de auditoria.',
        preco_mercado_ref: 8.5,
        preco_mercado_moeda: 'USD',
        preco_mercado_data: '2026-07-31',
        preco_mercado_fonte: 'Relatorio de mercado de credito florestal',
        elegivel_corsia: null,
        observacoes: null,
        projeto_id: null,
        criado_por: null,
        criado_em: '2026-08-05T12:00:00Z',
        atualizado_em: '2026-08-18T12:00:00Z',
      },
      {
        /**
         * DADO REAL, preservado inclusive no que ele tem de errado.
         *
         * Floresta Nacional e unidade de conservacao federal, nao REDD privado. O
         * segmento ficou no valor padrao porque o enum nao tem categoria para ela, e a
         * observacao registra isso. A tela MOSTRA a observacao: escondida, a
         * classificacao errada passaria a parecer deliberada, e o panorama por segmento
         * contaria uma UC federal como negocio privado.
         *
         * E tambem o candidato SEM NOTA NENHUMA, de proposito: e o estado real dos tres
         * no levantamento, e o que o `sem_avaliacao` do resumo mede.
         */
        id: 'demo-cand-3',
        nome: 'Flona Tapajos',
        segmento: 'redd_privado',
        metodologia: null,
        uf: 'PA',
        municipio: 'Belterra',
        area_estimada_ha: 527000,
        parceiro_id: null,
        etapa: 'triagem',
        premissas: null,
        falhas: 'Nenhuma contraparte identificada ate agora, e a gestao federal muda inteiramente a porta de entrada.',
        virtudes: null,
        preco_mercado_ref: null,
        preco_mercado_moeda: 'USD',
        preco_mercado_data: null,
        preco_mercado_fonte: null,
        elegivel_corsia: null,
        observacoes:
          'Segmento mal classificado: e unidade de conservacao federal (Floresta Nacional), categoria que o enum de segmento ainda nao tem. Ficou com o valor padrao. Corrigir quando o enum ganhar a categoria.',
        projeto_id: null,
        criado_por: null,
        criado_em: '2026-08-05T12:00:00Z',
        atualizado_em: '2026-08-05T12:00:00Z',
      },
    ],

    /* Duas coberturas diferentes de propósito: 8 de 8 no primeiro e 5 de 8 no segundo.
       É o que deixa visível, na revisão, por que a nota ponderada nunca aparece sozinha
       na tela - 8,1 com 5 critérios não é comparável com 7,4 com os 8. */
    notas: [
      nota('demo-nota-1', 'demo-cand-1', 'demo-crit-1', 8, 'Territorio homologado por decreto, sem litigio conhecido.'),
      nota('demo-nota-2', 'demo-cand-1', 'demo-crit-2', 4, 'So o limite do decreto; falta o arquivo geoespacial fechado.'),
      nota('demo-nota-3', 'demo-cand-1', 'demo-crit-3', 8, 'VM0048 aplicavel sem interpretacao forcada.'),
      nota('demo-nota-4', 'demo-cand-1', 'demo-crit-4', 9, 'Pressao de desmatamento no entorno documentada na serie do satelite.'),
      nota('demo-nota-5', 'demo-cand-1', 'demo-crit-5', 6, 'Risco de invasao presente, com vigilancia comunitaria ja em operacao.'),
      nota('demo-nota-6', 'demo-cand-1', 'demo-crit-6', 9, 'Parceiro atuante e consulta formalizada.'),
      nota('demo-nota-7', 'demo-cand-1', 'demo-crit-7', 4, 'Acesso longo por estrada de terra, com janela sazonal.'),
      nota('demo-nota-8', 'demo-cand-1', 'demo-crit-8', 7, 'Indicios de elegibilidade CORSIA e preco de referencia favoravel.'),

      nota('demo-nota-9', 'demo-cand-2', 'demo-crit-1', 8, 'Territorio homologado, sem sobreposicao conhecida.'),
      nota('demo-nota-10', 'demo-cand-2', 'demo-crit-3', 6, 'Metodologia provavel, ainda sem confirmacao do encaixe.'),
      nota('demo-nota-11', 'demo-cand-2', 'demo-crit-4', 4, 'Ameaca de conversao ainda nao demonstrada.'),
      nota('demo-nota-12', 'demo-cand-2', 'demo-crit-6', 7, 'Parceiro identificado, capacidade de execucao a confirmar.'),
      nota('demo-nota-13', 'demo-cand-2', 'demo-crit-7', 9, 'Acesso rodoviario e base proxima.'),
    ],

    proximoId: 100,
  };
}

function bd() {
  if (!estado) estado = inicial();
  return estado;
}

function criterio(id, nome, peso, descricao) {
  return {
    id,
    nome,
    peso,
    descricao,
    ativo: true,
    criado_por: null,
    criado_em: '2026-08-01T12:00:00Z',
    atualizado_em: '2026-08-01T12:00:00Z',
  };
}

function nota(id, candidatoId, criterioId, valor, justificativa) {
  return {
    id,
    candidato_id: candidatoId,
    criterio_id: criterioId,
    nota: valor,
    justificativa,
    criado_por: null,
    criado_em: '2026-08-20T12:00:00Z',
    atualizado_em: '2026-08-20T12:00:00Z',
  };
}

/* ===== Projeção: a linha de carbon_candidatos_listagem ====================
   Tradução da view. Ela é a FONTE ÚNICA da nota ponderada no banco, então aqui ela
   também é o único lugar onde a conta aparece: o resumo, o panorama por segmento e a
   comparação leem desta função, nunca refazem a média.                        */

/**
 * Arredondamento equivalente ao `round(numeric, n)` do Postgres.
 *
 * O Postgres arredonda meio para longe do zero; Math.round arredonda meio para cima.
 * Coincidem para valores positivos, e nota, peso e cobertura são todos não negativos
 * por CHECK. Se um dia entrar valor negativo aqui, os dois passam a divergir no empate.
 */
function arredondar(valor, casas) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

const ORDEM_ETAPA = {
  triagem: 1,
  analise_preliminar: 2,
  proposta_viabilidade: 3,
  aprovado: 4,
  descartado: 5,
};

function criteriosAtivos() {
  return bd().criterios.filter((c) => c.ativo);
}

function projetar(candidato) {
  const b = bd();
  const ativos = criteriosAtivos();
  const parceiro = b.parceiros.find((p) => p.id === candidato.parceiro_id) ?? null;

  // Critério INATIVO sai dos dois lados da conta, e a nota dada a ele continua guardada
  // (volta a contar se o critério for reativado). Igual à view.
  const doCandidato = b.notas.filter(
    (n) => n.candidato_id === candidato.id && ativos.some((c) => c.id === n.criterio_id)
  );

  let pesoAvaliado = 0;
  let somaPonderada = 0;
  for (const n of doCandidato) {
    const peso = ativos.find((c) => c.id === n.criterio_id).peso;
    pesoAvaliado += peso;
    somaPonderada += n.nota * peso;
  }

  return {
    ...candidato,
    parceiro_nome: parceiro?.nome ?? null,
    parceiro_tipo: parceiro?.tipo ?? null,
    parceiro_ativo: parceiro?.ativo ?? null,
    etapa_ordem: ORDEM_ETAPA[candidato.etapa] ?? 9,
    convertido: candidato.projeto_id !== null,
    criterios_ativos: ativos.length,
    criterios_avaliados: doCandidato.length,
    peso_avaliado: pesoAvaliado,
    nota_ponderada: pesoAvaliado > 0 ? arredondar(somaPonderada / pesoAvaliado, 2) : null,
    cobertura_pct:
      ativos.length > 0 ? arredondar((doCandidato.length * 100) / ativos.length, 1) : null,
  };
}

/** Média que IGNORA os nulos, como o avg() do SQL. Sem nenhum valor, devolve null. */
function mediaSemNulos(valores, casas) {
  const uteis = valores.filter((v) => v !== null && v !== undefined);
  if (uteis.length === 0) return null;
  return arredondar(uteis.reduce((a, b) => a + b, 0) / uteis.length, casas);
}

const SEGMENTOS = ['terra_indigena', 'redd_privado', 'agro'];

function porSegmento(linhas) {
  // FROM de lista fixa, e não group by: segmento sem candidato nenhum é informação
  // (ninguém está prospectando agro), e um group by o esconderia.
  return SEGMENTOS.map((segmento) => {
    const doSegmento = linhas.filter((c) => c.segmento === segmento);
    const contar = (fn) => doSegmento.filter(fn).length;
    return {
      segmento,
      candidatos: doSegmento.length,
      triagem: contar((c) => c.etapa === 'triagem'),
      analise_preliminar: contar((c) => c.etapa === 'analise_preliminar'),
      proposta_viabilidade: contar((c) => c.etapa === 'proposta_viabilidade'),
      aprovado: contar((c) => c.etapa === 'aprovado'),
      descartado: contar((c) => c.etapa === 'descartado'),
      convertidos: contar((c) => c.convertido),
      elegiveis_corsia: contar((c) => c.elegivel_corsia === true),
      sem_avaliacao: contar((c) => c.criterios_avaliados === 0),
      area_total_ha: doSegmento.reduce((soma, c) => soma + (c.area_estimada_ha ?? 0), 0),
      nota_media: mediaSemNulos(doSegmento.map((c) => c.nota_ponderada), 2),
      preco_medio: mediaSemNulos(doSegmento.map((c) => c.preco_mercado_ref), 2),
    };
  });
}

function montarResumo(linhas) {
  const contar = (fn) => linhas.filter(fn).length;
  return {
    total: linhas.length,
    por_etapa: {
      triagem: contar((c) => c.etapa === 'triagem'),
      analise_preliminar: contar((c) => c.etapa === 'analise_preliminar'),
      proposta_viabilidade: contar((c) => c.etapa === 'proposta_viabilidade'),
      aprovado: contar((c) => c.etapa === 'aprovado'),
      descartado: contar((c) => c.etapa === 'descartado'),
    },
    convertidos: contar((c) => c.convertido),
    elegiveis_corsia: contar((c) => c.elegivel_corsia === true),
    corsia_nao_avaliado: contar((c) => c.elegivel_corsia === null),
    sem_parceiro: contar((c) => !c.parceiro_id),
    sem_avaliacao: contar((c) => c.criterios_avaliados === 0),
    area_total_ha: linhas.reduce((soma, c) => soma + (c.area_estimada_ha ?? 0), 0),
    nota_media: mediaSemNulos(linhas.map((c) => c.nota_ponderada), 2),
  };
}

/* ===== Leitura ============================================================ */

export function demoListarPipeline({ segmento = null, etapa = null, parceiroId = null } = {}) {
  const todos = bd().candidatos.map(projetar);

  let lista = todos;
  if (segmento) lista = lista.filter((c) => c.segmento === segmento);
  if (etapa) lista = lista.filter((c) => c.etapa === etapa);
  if (parceiroId) lista = lista.filter((c) => c.parceiro_id === parceiroId);

  return {
    candidatos: [...lista].sort((a, b) =>
      a.etapa_ordem === b.etapa_ordem ? a.nome.localeCompare(b.nome) : a.etapa_ordem - b.etapa_ordem
    ),
    // Resumo e panorama sobre TODOS, e não sobre a lista filtrada: é a regra da função
    // SQL, e o motivo é que a comparação entre segmentos é justamente o que se quer ver.
    resumo: montarResumo(todos),
    por_segmento: porSegmento(todos),
    criterios_ativos: criteriosAtivos().length,
  };
}

export function demoListarParceiros() {
  const linhas = bd().candidatos.map(projetar);

  return {
    parceiros: bd()
      .parceiros.map((p) => {
        const meus = linhas.filter((c) => c.parceiro_id === p.id);
        return {
          ...p,
          candidatos: meus.length,
          // "Em análise" agrupa os três estados que ainda estão em jogo, igual à view:
          // é a leitura útil, quanto pipeline vivo passa por este parceiro.
          candidatos_em_analise: meus.filter((c) =>
            ['triagem', 'analise_preliminar', 'proposta_viabilidade'].includes(c.etapa)
          ).length,
          candidatos_aprovados: meus.filter((c) => c.etapa === 'aprovado').length,
          candidatos_descartados: meus.filter((c) => c.etapa === 'descartado').length,
          candidatos_convertidos: meus.filter((c) => c.convertido).length,
          area_total_ha: meus.reduce((soma, c) => soma + (c.area_estimada_ha ?? 0), 0),
          segmentos: [...new Set(meus.map((c) => c.segmento))].sort(),
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome)),
  };
}

function acharCandidato(id) {
  const achado = bd().candidatos.find((c) => c.id === id);
  if (!achado) throw new ErroDemoPipeline('nao_encontrado');
  return achado;
}

export function demoObterCandidato(candidatoId) {
  const alvo = acharCandidato(candidatoId);
  const b = bd();

  return {
    candidato: projetar(alvo),
    notas: b.notas
      .filter((n) => n.candidato_id === candidatoId)
      .map((n) => {
        const c = b.criterios.find((x) => x.id === n.criterio_id);
        return {
          ...n,
          criterio_nome: c?.nome ?? null,
          criterio_peso: c?.peso ?? null,
          criterio_ativo: c?.ativo ?? false,
        };
      })
      .sort((a, b2) => String(a.criterio_nome).localeCompare(String(b2.criterio_nome))),
    // Os ATIVOS, e não só os que já têm nota: é o que faz a linha vazia do critério
    // esquecido aparecer na matriz.
    criterios: [...criteriosAtivos()].sort((a, b2) => a.nome.localeCompare(b2.nome)),
  };
}

export function demoCompararCandidatos(ids = []) {
  const b = bd();
  const ativos = criteriosAtivos();

  return {
    criterios: [...ativos].sort((a, b2) => a.nome.localeCompare(b2.nome)),
    candidatos: b.candidatos
      // Id inexistente é simplesmente ignorado, igual ao `= any` do SQL: um id velho na
      // seleção não pode derrubar a comparação inteira.
      .filter((c) => ids.includes(c.id))
      .map((c) => {
        // Objeto indexado por criterio_id, e não lista: a tela monta uma grade
        // critério x candidato, e com lista cada célula custaria uma varredura.
        const notas = {};
        for (const n of b.notas) {
          if (n.candidato_id !== c.id) continue;
          if (!ativos.some((x) => x.id === n.criterio_id)) continue;
          notas[n.criterio_id] = { nota: n.nota, justificativa: n.justificativa };
        }
        return { ...projetar(c), notas };
      })
      .sort((a, b2) => a.nome.localeCompare(b2.nome)),
  };
}

/* ===== Escrita ============================================================ */

const SEGMENTOS_ACEITOS = new Set(SEGMENTOS);
const ETAPAS_ACEITAS = new Set(Object.keys(ORDEM_ETAPA));

/** Campos que o demo aceita gravar. Mesma lista branca da Edge Function. */
const CAMPOS_CANDIDATO = [
  'nome',
  'segmento',
  'metodologia',
  'uf',
  'municipio',
  'area_estimada_ha',
  'parceiro_id',
  'etapa',
  'premissas',
  'falhas',
  'virtudes',
  'preco_mercado_ref',
  'preco_mercado_moeda',
  'preco_mercado_data',
  'preco_mercado_fonte',
  'elegivel_corsia',
  'observacoes',
];

function validarCandidato(dados) {
  if (dados.segmento !== undefined && dados.segmento !== null && !SEGMENTOS_ACEITOS.has(dados.segmento)) {
    throw new ErroDemoPipeline('segmento_invalido');
  }
  if (dados.etapa !== undefined && dados.etapa !== null && !ETAPAS_ACEITAS.has(dados.etapa)) {
    throw new ErroDemoPipeline('etapa_invalida');
  }
  // Mesma normalização e mesmo CHECK do banco: sigla de duas maiúsculas.
  if (dados.uf !== undefined && dados.uf !== null && dados.uf !== '') {
    if (!/^[A-Za-z]{2}$/.test(String(dados.uf))) throw new ErroDemoPipeline('uf_invalida');
  }
}

function normalizar(dados) {
  const saida = {};
  for (const campo of CAMPOS_CANDIDATO) {
    if (!Object.prototype.hasOwnProperty.call(dados, campo)) continue;
    const valor = dados[campo];
    if (campo === 'uf') {
      saida.uf = valor ? String(valor).toUpperCase() : null;
    } else if (typeof valor === 'string') {
      saida[campo] = valor.trim() === '' ? null : valor.trim();
    } else {
      saida[campo] = valor;
    }
  }
  return saida;
}

export function demoCriarCandidato(dados = {}) {
  if (!dados?.nome || !String(dados.nome).trim()) {
    throw new ErroDemoPipeline('campo_obrigatorio');
  }
  validarCandidato(dados);

  const b = bd();
  const novo = {
    id: `demo-cand-${b.proximoId++}`,
    nome: String(dados.nome).trim(),
    segmento: 'redd_privado',
    metodologia: null,
    uf: null,
    municipio: null,
    area_estimada_ha: null,
    parceiro_id: null,
    etapa: 'triagem',
    premissas: null,
    falhas: null,
    virtudes: null,
    preco_mercado_ref: null,
    preco_mercado_moeda: 'USD',
    preco_mercado_data: null,
    preco_mercado_fonte: null,
    elegivel_corsia: null,
    observacoes: null,
    projeto_id: null,
    criado_por: null,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    ...normalizar(dados),
  };

  b.candidatos.push(novo);
  return { candidato: projetar(novo) };
}

export function demoAtualizarCandidato(candidatoId, dados = {}) {
  const alvo = acharCandidato(candidatoId);
  validarCandidato(dados);

  const mudancas = normalizar(dados);
  if (Object.keys(mudancas).length === 0) throw new ErroDemoPipeline('nada_para_atualizar');

  Object.assign(alvo, mudancas, { atualizado_em: new Date().toISOString() });
  return { candidato: projetar(alvo) };
}

/**
 * Grava ou corrige a nota de um critério.
 *
 * UPSERT pela chave natural, igual ao servidor: regravar o mesmo critério corrige a nota
 * em vez de criar uma segunda linha. Sem isso, o mesmo critério contaria duas vezes na
 * média ponderada e dobraria o peso dele em silêncio.
 */
export function demoAvaliarCriterio(candidatoId, dados = {}) {
  acharCandidato(candidatoId);
  const b = bd();

  const criterioId = dados?.criterio_id;
  if (!criterioId) throw new ErroDemoPipeline('campo_obrigatorio');

  const alvo = b.criterios.find((c) => c.id === criterioId);
  if (!alvo) throw new ErroDemoPipeline('referencia_invalida');
  // Critério inativo está fora dos dois lados do cálculo: aceitar a nota faria a tela
  // dizer "salvo" com a nota ponderada parada, que é o pior desfecho para quem avaliou.
  if (!alvo.ativo) throw new ErroDemoPipeline('criterio_inativo');

  const valor = Number(dados.nota);
  if (!Number.isFinite(valor)) throw new ErroDemoPipeline('campo_invalido');
  if (valor < 0 || valor > 10) throw new ErroDemoPipeline('nota_fora_da_faixa');

  const justificativa = dados.justificativa ? String(dados.justificativa).trim() || null : null;

  const existente = b.notas.find(
    (n) => n.candidato_id === candidatoId && n.criterio_id === criterioId
  );

  let linha;
  if (existente) {
    existente.nota = valor;
    existente.justificativa = justificativa;
    existente.atualizado_em = new Date().toISOString();
    linha = existente;
  } else {
    linha = nota(`demo-nota-${b.proximoId++}`, candidatoId, criterioId, valor, justificativa);
    b.notas.push(linha);
  }

  return { nota: linha, avaliacao: demoAvaliacao(candidatoId) };
}

export function demoRemoverNota(notaId) {
  const b = bd();
  const i = b.notas.findIndex((n) => n.id === notaId);
  if (i < 0) throw new ErroDemoPipeline('nao_encontrado');

  const candidatoId = b.notas[i].candidato_id;
  b.notas.splice(i, 1);

  return { removido: true, candidato_id: candidatoId, avaliacao: demoAvaliacao(candidatoId) };
}

/** Mesmo recorte de carbon_candidato_avaliacao: só os agregados, para a tela atualizar. */
function demoAvaliacao(candidatoId) {
  const linha = projetar(acharCandidato(candidatoId));
  return {
    candidato_id: linha.id,
    criterios_ativos: linha.criterios_ativos,
    criterios_avaliados: linha.criterios_avaliados,
    peso_avaliado: linha.peso_avaliado,
    nota_ponderada: linha.nota_ponderada,
    cobertura_pct: linha.cobertura_pct,
  };
}

/**
 * Promove o candidato aprovado a projeto.
 *
 * Reproduz as duas regras da função SQL: só etapa `aprovado` converte, e a conversão é
 * IDEMPOTENTE - o segundo clique devolve `criado: false` com o projeto que já existe, em
 * vez de criar um segundo projeto igual ou repreender quem só queria chegar lá.
 *
 * O projeto criado não existe no dataset de Projetos (é outro módulo de demonstração),
 * então o link que a tela oferece depois da conversão leva a uma tela vazia no demo. Em
 * produção ele leva ao projeto recém-criado.
 */
export function demoPromoverAProjeto(candidatoId) {
  const alvo = acharCandidato(candidatoId);

  if (alvo.projeto_id) {
    return {
      criado: false,
      candidato_id: alvo.id,
      projeto_id: alvo.projeto_id,
      candidato: projetar(alvo),
    };
  }

  if (alvo.etapa !== 'aprovado') throw new ErroDemoPipeline('candidato_nao_aprovado');

  alvo.projeto_id = `demo-proj-${bd().proximoId++}`;
  alvo.atualizado_em = new Date().toISOString();

  return {
    criado: true,
    candidato_id: alvo.id,
    projeto_id: alvo.projeto_id,
    candidato: projetar(alvo),
  };
}

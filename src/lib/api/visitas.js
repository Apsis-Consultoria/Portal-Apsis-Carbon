import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo, ErroApi } from "@/lib/api/base";
import {
  demoListarViagens,
  demoCriarViagem,
  demoAtualizarViagem,
  demoListarVisitas,
  demoObterVisita,
  demoCriarVisita,
  demoAtualizarVisita,
  demoAnonimizarVisita,
  demoAnonimizarVencidas,
  demoExportarVisitas,
} from "@/lib/demo/visitas";

/**
 * api/visitas - viagens (rodadas), visitas comerciais e LGPD (issue #12).
 *
 * MODO DEMONSTRACAO: o projeto Supabase ainda nao foi provisionado, entao com MODO_DEMO
 * ligado estas funcoes NAO fazem rede - operam sobre o dataset em memoria de
 * src/lib/demo/visitas.js, e as mutacoes alteram esse dataset para a tela ser realmente
 * interativa na revisao.
 *
 * O `if (MODO_DEMO && MODO_DEMO_ATIVO())` fica SEM Boolean() em volta de proposito: com o wrapper o Rollup
 * nao dobra a expressao para a constante false, os ramos sobrevivem ao tree-shaking e o
 * dataset ficticio inteiro vai para o bundle de producao. Ver a nota longa em
 * src/lib/runtimeConfig.js.
 *
 * LGPD - o que este modulo NAO faz, e nao deve passar a fazer:
 *   - nao existe funcao que traga contato de uma LISTA. A rota de lista nao devolve
 *     contato, e a funcao SQL por tras dela nem seleciona as colunas;
 *   - nao ha cache de contato em modulo: quem precisa do contato chama obterVisita e o
 *     usa na tela, sem copiar para estado global;
 *   - exportarVisitas SEMPRE registra auditoria no servidor, e com contato exige a
 *     finalidade declarada. Nao ha caminho alternativo de exportacao no frontend.
 */

/**
 * Mensagens dos codigos de erro DESTE dominio.
 *
 * POR QUE AQUI E NAO EM src/lib/api/base.js: base.js e da fundacao e compartilhado por
 * todos os dominios, e as traducoes gerais dele falam do cadastro de projetos. Aqui:
 *
 *   - 'sem_permissao': o texto geral fala de criar e editar projetos. Neste dominio o
 *     403 pode ser tres coisas (registrar visita, exportar a base, executar a rotina de
 *     retencao), todas ligadas a papel admin ou gestor.
 *   - 'periodo_invalido': o texto geral fala do periodo de creditacao do projeto, que
 *     aqui seria simplesmente errado. Aqui e o periodo da viagem ou do filtro.
 *   - 'motivo_obrigatorio' e 'visita_anonimizada': codigos novos, sem traducao no
 *     catalogo geral, que cairiam no texto tecnico cru.
 *
 * Os textos vao acentuados, como manda a regra de interface do projeto.
 */
const MENSAGENS = {
  sem_permissao:
    "Seu perfil não permite registrar visitas, ver dados de contato nem exportar a base. Fale com a equipe responsável pelo sistema.",
  periodo_invalido: "A data final não pode ser anterior à data inicial.",
  motivo_obrigatorio:
    "Informe a finalidade: apagar dado de contato e exportar contatos são operações registradas em auditoria, e o registro sem motivo não prova nada.",
  visita_anonimizada:
    "O contato desta visita foi apagado a pedido do titular ou por prazo de retenção vencido. Isso é irreversível: não é possível regravar nome, telefone ou e-mail.",
  referencia_invalida:
    "Um dos vínculos informados não existe mais no sistema (viagem ou colaborador).",
};

/**
 * Troca a mensagem do ErroApi quando o codigo tem texto proprio deste dominio.
 *
 * Preserva codigo e status para o GuardaDeSessao e as telas continuarem decidindo pelo
 * codigo, nunca pelo texto.
 */
function traduzir(erro) {
  const mensagem = MENSAGENS[erro?.codigo];
  if (!mensagem) return erro;
  return new ErroApi(mensagem, { codigo: erro.codigo, status: erro.status });
}

async function chamar(caminho, msal, opcoes) {
  try {
    return await chamarApi(caminho, msal, opcoes);
  } catch (erro) {
    throw traduzir(erro);
  }
}

async function chamarNoDemo(rota, executar) {
  try {
    return await chamarDemo(rota, executar);
  } catch (erro) {
    throw traduzir(erro);
  }
}

/**
 * Query string. Valor vazio e OMITIDO: `?situacao=` chegaria ao servidor como filtro
 * por situacao vazia, que e diferente de "sem filtro de situacao" (e o servidor recusa
 * o valor vazio como invalido).
 */
function consulta(filtros = {}, chaves) {
  const params = new URLSearchParams();
  for (const chave of chaves) {
    const valor = filtros[chave];
    if (valor === null || valor === undefined || valor === "") continue;
    params.set(chave, String(valor));
  }
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

const CHAVES_VIAGENS = ["uf", "cidade", "de", "ate", "pagina", "limite"];
const CHAVES_VISITAS = [
  "viagem_id",
  "follow_up_status",
  "situacao",
  "organizacao",
  "de",
  "ate",
  "pagina",
  "limite",
];

/* ===== Viagens (rodadas de visita) ======================================== */

/**
 * GET /viagens -> { viagens, total, resumo, pagina, limite }
 *
 * `filtros`: { uf, cidade, de, ate, pagina, limite }. O recorte por periodo e
 * interseccao com a janela: rodada que atravessa a virada do mes aparece nos dois.
 *
 * Cada viagem vem com os agregados de follow-up das visitas dela (abertos, atrasados,
 * sem cobranca, concluidos), calculados no banco com a MESMA definicao usada na lista
 * de visitas. Nenhum dado de contato.
 */
export async function listarViagens(msal, filtros = {}) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo("/viagens", () => demoListarViagens(filtros));
  return chamar(`/viagens${consulta(filtros, CHAVES_VIAGENS)}`, msal);
}

/** POST /viagens -> { viagem } */
export async function criarViagem(msal, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo("/viagens", () => demoCriarViagem(dados));
  return chamar("/viagens", msal, { metodo: "POST", corpo: dados });
}

/** PATCH /viagens/:id -> { viagem } */
export async function atualizarViagem(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo(`/viagens/${id}`, () => demoAtualizarViagem(id, dados));
  return chamar(`/viagens/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/* ===== Visitas ============================================================ */

/**
 * GET /visitas -> { visitas, total, resumo, pagina, limite }
 *
 * `filtros`: { viagem_id, follow_up_status, situacao, organizacao, de, ate, pagina,
 * limite }. viagem_id aceita o valor especial 'sem_viagem' (somente visitas fora de
 * rodada). situacao aceita 'atrasada', 'sem_cobranca', 'aberta', 'anonimizada' e
 * 'retencao_vencida'.
 *
 * NAO TRAZ CONTATO, e isso nao e opcao de chamada: a funcao SQL por tras da rota nem
 * seleciona as colunas de contato. Cada visita traz `contato_registrado` (existe contato
 * ou nao) para a tela poder dizer que ha dado ali sem exibi-lo.
 */
export async function listarVisitas(msal, filtros = {}) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo("/visitas", () => demoListarVisitas(filtros));
  return chamar(`/visitas${consulta(filtros, CHAVES_VISITAS)}`, msal);
}

/**
 * GET /visitas/:id -> { visita, viagem, auditoria }
 *
 * Unico caminho que devolve contato, e somente para papel admin ou gestor: quem decide
 * e o SERVIDOR, e a resposta informa `visita.contato_visivel`. Com false, `visita.contato`
 * vem nulo enquanto `visita.contato_registrado` continua dizendo se existe contato
 * cadastrado - e assim que a tela explica a ausencia em vez de sugerir que nao ha nada.
 */
export async function obterVisita(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo(`/visitas/${id}`, () => demoObterVisita(id));
  return chamar(`/visitas/${cam(id)}`, msal);
}

/** POST /visitas -> { visita, viagem, auditoria } (o detalhe inteiro) */
export async function criarVisita(msal, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo("/visitas", () => demoCriarVisita(dados));
  return chamar("/visitas", msal, { metodo: "POST", corpo: dados });
}

/**
 * PATCH /visitas/:id -> { visita, viagem, auditoria } (o detalhe inteiro)
 *
 * Campos anulaveis vao como `null` quando esvaziados, e nao omitidos: o servidor usa "a
 * chave veio no corpo?" para decidir o que tocar, entao omitir significa "mantenha o
 * valor atual".
 *
 * `assumir_follow_up: true` atribui o follow-up a quem esta chamando (o servidor resolve
 * o id). Existe porque nao ha rota que liste colaboradores, e sem isso o follow-up
 * nasceria sempre sem dono - exatamente o problema que a issue #12 existe para resolver.
 */
export async function atualizarVisita(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo(`/visitas/${id}`, () => demoAtualizarVisita(id, dados));
  return chamar(`/visitas/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/* ===== LGPD =============================================================== */

/**
 * POST /visitas/:id/anonimizar -> { anonimizada, ja_estava, visita_id }
 *
 * Apaga nome, telefone e e-mail e PRESERVA a visita (fato comercial). E a forma de
 * atender o direito de exclusao do titular, e substitui o DELETE que este dominio nao
 * tem. IRREVERSIVEL: nem um UPDATE direto no banco traz o contato de volta.
 *
 * `motivo` e obrigatorio: e o que registra a finalidade no log de auditoria. Idempotente
 * no servidor - repetir devolve `ja_estava: true`, sem novo registro.
 */
export async function anonimizarVisita(msal, id, motivo) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/visitas/${id}/anonimizar`, () => demoAnonimizarVisita(id, motivo));
  }
  return chamar(`/visitas/${cam(id)}/anonimizar`, msal, {
    metodo: "POST",
    corpo: { motivo },
  });
}

/**
 * POST /visitas/anonimizar-vencidas -> { anonimizadas, referencia, limite }
 *
 * Executa o prazo de retencao: apaga o contato de toda visita com `retencao_ate`
 * vencido. Prazo de retencao que ninguem executa e so uma frase na politica.
 */
export async function anonimizarVencidas(msal, limite) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo("/visitas/anonimizar-vencidas", () => demoAnonimizarVencidas(limite));
  }
  return chamar("/visitas/anonimizar-vencidas", msal, {
    metodo: "POST",
    corpo: limite ? { limite } : {},
  });
}

/**
 * POST /visitas/exportacao -> { registros, total, incluiu_contatos, exportacao_id }
 *
 * POST, e nao GET, porque a chamada TEM efeito: grava a linha de auditoria (quem, quando,
 * filtros, se levou contato, finalidade) na mesma transacao que produz os dados. Nao
 * existe caminho de exportar sem registro.
 *
 * `opcoes`: { incluir_contatos, motivo, limite, ...filtros da listagem }. Com
 * incluir_contatos verdadeiro, o motivo e obrigatorio e o servidor exige papel admin ou
 * gestor. O CSV e montado na tela a partir de `registros`: o servidor devolve dados, nao
 * arquivo, para nao existir uma segunda formatacao de saida fora do controle da tela.
 */
export async function exportarVisitas(msal, opcoes = {}) {
  const corpo = {};
  for (const chave of [
    "viagem_id",
    "sem_viagem",
    "follow_up_status",
    "situacao",
    "organizacao",
    "de",
    "ate",
    "limite",
    "incluir_contatos",
    "motivo",
  ]) {
    const valor = opcoes[chave];
    if (valor === null || valor === undefined || valor === "") continue;
    corpo[chave] = valor;
  }

  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo("/visitas/exportacao", () => demoExportarVisitas(corpo));
  }
  return chamar("/visitas/exportacao", msal, { metodo: "POST", corpo });
}

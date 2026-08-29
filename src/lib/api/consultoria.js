import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo, ErroApi } from "@/lib/api/base";
import {
  demoAtualizarConsultoria,
  demoAtualizarProposta,
  demoCriarConsultoria,
  demoCriarProposta,
  demoListarConsultorias,
  demoListarPropostas,
} from "@/lib/demo/consultoria";

/**
 * api/consultoria - funil comercial da Consultoria: propostas e consultorias.
 *
 *   GET   /propostas            lista, com resumo e as linhas de serviço existentes
 *   POST  /propostas            cria
 *   PATCH /propostas/:id        altera (inclusive o status, que deriva a data de desfecho)
 *   GET   /consultorias         lista, com resumo e a proposta de origem achatada
 *   POST  /consultorias         cria
 *   PATCH /consultorias/:id     altera
 *
 * NÃO EXISTE DELETE, e a ausência é a decisão: as duas tabelas têm a coluna `ativo` e é
 * ela que arquiva. Proposta perdida e consultoria cancelada são justamente o dado que
 * sustenta a taxa de conversão; apagar melhoraria a métrica a cada limpeza de tela.
 *
 * O CÓDIGO DA PROPOSTA NÃO É IDENTIFICADOR. Ele é anulável e repetido no dado real (duas
 * propostas carregam o literal `AP-000XX/25`, com o XX por preencher). Toda função daqui
 * recebe e devolve `id`; código é conteúdo, como o título.
 *
 * Sobre o modo demonstração e o motivo de o `if (MODO_DEMO && MODO_DEMO_ATIVO())` não ter
 * Boolean() em volta, ver o cabeçalho de src/lib/api/projetos.js: a constante precisa
 * aparecer crua para o Rollup dobrar a condição e não levar o dataset de demonstração
 * para o bundle de produção. Já houve vazamento real por causa disso.
 *
 * Este módulo NÃO entra em src/lib/api/indice.js, de propósito (ver o cabeçalho de lá).
 * Importe '@/lib/api/consultoria' direto.
 */

/* ===== Mensagens dos códigos deste domínio ================================
   src/lib/api/base.js traduz os códigos da fundação, mas dois deles têm texto ERRADO
   aqui: 'registro_duplicado' fala de ID de registro de projeto, e neste domínio o 409
   significa código de AP repetido; 'referencia_invalida' fala de vínculo genérico, e aqui
   só existe um vínculo possível. Os demais são novos e cairiam no código técnico cru.   */
const MENSAGENS = {
  registro_duplicado:
    "Já existe uma proposta com este código. Confira o número da AP, ou abra a proposta existente em vez de criar outra.",
  desfecho_ambiguo:
    "A proposta não pode ter data de ganha e data de perdida ao mesmo tempo. Escolha o desfecho pelo status e a data certa é preenchida sozinha.",
  proposta_sem_identificacao:
    "Informe pelo menos um entre código, título e cliente. Sem nenhum dos três a proposta nasce sem nada que a identifique na lista.",
  campo_obrigatorio:
    "Falta um campo obrigatório: a consultoria precisa de um nome, e a proposta precisa de código, título ou cliente.",
  status_invalido: "O status informado não é válido para este registro.",
  referencia_invalida:
    "A proposta escolhida não existe mais. Atualize a página e escolha outra, ou deixe a consultoria sem vínculo.",
  sem_permissao:
    "Seu perfil não permite criar nem editar propostas e consultorias. Fale com a equipe responsável pelo sistema.",
};

/**
 * Troca a mensagem do ErroApi quando o código tem texto próprio deste domínio.
 *
 * Preserva código e status para o GuardaDeSessao e a tela continuarem decidindo pelo
 * código, nunca pelo texto.
 */
function traduzir(erro) {
  const mensagem = MENSAGENS[erro?.codigo];
  if (!mensagem || !(erro instanceof ErroApi)) return erro;
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
 * Query string dos filtros. Valor vazio é OMITIDO: `?status=` chegaria ao servidor como
 * filtro por status vazio, que é diferente de "sem filtro de status".
 */
function consulta(filtros = {}, chaves = []) {
  const params = new URLSearchParams();
  for (const chave of chaves) {
    const valor = filtros[chave];
    if (valor === null || valor === undefined || valor === "") continue;
    params.set(chave, String(valor));
  }
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

/* ===== Propostas ========================================================== */

const CHAVES_PROPOSTAS = ["status", "grupo_servico", "busca", "ativo", "pagina", "limite"];

/**
 * GET /propostas -> { propostas, total, pagina, limite, resumo, grupos, sem_grupo }
 *
 * `grupo_servico` aceita o valor especial 'sem_grupo', que significa "somente as
 * propostas sem linha de serviço declarada" - diferente de não filtrar, que traz todas.
 *
 * `grupos` é a lista de linhas de serviço que EXISTEM no banco, com a contagem de cada
 * uma. Ela vem do servidor porque a coluna é texto livre (hoje só 'Carbono' e
 * 'Descarbonizacao' aparecem, e a APSIS tem mais linhas de serviço): uma lista fixa no
 * código esconderia a terceira que alguém cadastrasse. Vem sempre sobre a tabela
 * INTEIRA, sem filtro, para escolher um grupo não apagar os outros do seletor.
 *
 * No `resumo`, `taxa_conversao` é uma fração de 0 a 1 sobre as propostas DECIDIDAS
 * (ganhas mais perdidas), e é `null` quando não há nenhuma decidida. Nunca sobre o total:
 * proposta ainda em elaboração não é derrota. Sempre mostre o denominador `decididas` ao
 * lado do percentual - hoje ele vale 1, e um "100%" sem essa informação seria propaganda.
 *
 * O `limite` padrão é alto porque o conjunto é pequeno (7 propostas reais) e a tela mostra
 * o funil inteiro; `total` existe para ela avisar se um dia deixar de caber.
 */
export async function listarPropostas(msal, filtros = {}) {
  const comLimite = { limite: 200, ...filtros };
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo("/propostas", () => demoListarPropostas(comLimite));
  }
  return chamar(`/propostas${consulta(comLimite, CHAVES_PROPOSTAS)}`, msal);
}

/**
 * POST /propostas -> { proposta }
 *
 * Exige pelo menos um entre `codigo`, `titulo` e `cliente`: a migration deixou os três
 * anuláveis (com razão, para ninguém inventar um código de AP), e sem esta regra nasceria
 * uma linha em branco que ninguém consegue identificar nem para arquivar.
 */
export async function criarProposta(msal, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo("/propostas", () => demoCriarProposta(dados));
  }
  return chamar("/propostas", msal, { metodo: "POST", corpo: dados });
}

/**
 * PATCH /propostas/:id -> { proposta }
 *
 * Envie apenas o que mudou: campo ausente do corpo não é tocado.
 *
 * MUDAR O STATUS PREENCHE A DATA DE DESFECHO sozinho. `ganha` grava data_ganha com o dia
 * de hoje (fuso de Brasília, no servidor) e limpa data_perdida; `perdida` faz o inverso;
 * voltar para `elaboracao` ou `cancelada` limpa as duas. Isso existe por dois motivos: um
 * select de status não teria onde pedir a data, e ir de ganha para perdida sem limpar a
 * anterior violaria o CHECK do banco - a pessoa receberia um erro ao corrigir um clique.
 * Mandar `data_ganha` junto no mesmo corpo continua valendo: a derivação é o padrão, não
 * uma trava.
 */
export async function atualizarProposta(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/propostas/${id}`, () => demoAtualizarProposta(id, dados));
  }
  return chamar(`/propostas/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/* ===== Consultorias ======================================================= */

const CHAVES_CONSULTORIAS = ["status", "vinculo", "busca", "ativo", "pagina", "limite"];

/**
 * GET /consultorias -> { consultorias, total, pagina, limite, resumo, hoje }
 *
 * `vinculo` aceita 'sem_proposta' e 'com_proposta'. Existe porque o Notion não liga as
 * duas bases: a ligação está na cabeça de quem trabalha, e hoje quase toda consultoria
 * está sem proposta de origem. O filtro é o que permite atacar essa lacuna em vez de
 * apenas contá-la no resumo.
 *
 * Cada linha vem com `prazo_vencido` já resolvido pelo SERVIDOR, e com a proposta de
 * origem achatada em `proposta_codigo`, `proposta_titulo`, `proposta_cliente` e
 * `proposta_status`. O atraso é derivado lá e não aqui porque o relógio do navegador é do
 * usuário: uma máquina com a data errada pintaria de vermelho meia lista. `hoje` vem
 * junto na resposta para o texto ("venceu há 3 dias") usar a mesma referência que a cor.
 *
 * Só consultoria EM CURSO (não iniciada ou em andamento) atrasa. Concluída não atrasa
 * porque o trabalho acabou, e cancelada porque não vai acontecer.
 */
export async function listarConsultorias(msal, filtros = {}) {
  const comLimite = { limite: 200, ...filtros };
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo("/consultorias", () => demoListarConsultorias(comLimite));
  }
  return chamar(`/consultorias${consulta(comLimite, CHAVES_CONSULTORIAS)}`, msal);
}

/**
 * POST /consultorias -> { consultoria }
 *
 * Só `nome` é obrigatório, e ele NÃO tem máscara de propósito. A convenção é
 * `AP - <número>-<ano> [CLIENTE]` e o dado real a desrespeita de várias maneiras
 * (`AP x -25 [IPEL]` quando o número ainda não existe, hífen fora de lugar). Uma tela que
 * exigisse formato rígido brigaria com o hábito, e o resultado seria a equipe parar de
 * lançar - não passar a escrever certo.
 *
 * `proposta_id` é opcional e é o que costura o funil: preenchê-lo faz a proposta de
 * origem aparecer como "consultoria registrada" na outra aba.
 */
export async function criarConsultoria(msal, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo("/consultorias", () => demoCriarConsultoria(dados));
  }
  return chamar("/consultorias", msal, { metodo: "POST", corpo: dados });
}

/**
 * PATCH /consultorias/:id -> { consultoria }
 *
 * Envie apenas o que mudou. `proposta_id: null` desfaz o vínculo, o que precisa ser
 * possível: a ligação entre as duas bases é reconstruída à mão e vai ser feita no
 * registro errado alguma vez.
 */
export async function atualizarConsultoria(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/consultorias/${id}`, () => demoAtualizarConsultoria(id, dados));
  }
  return chamar(`/consultorias/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

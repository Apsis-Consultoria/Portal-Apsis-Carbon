import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo, ErroApi } from "@/lib/api/base";
import {
  demoAtualizarComprador,
  demoAtualizarEmissao,
  demoAtualizarVenda,
  demoCriarComprador,
  demoCriarEmissao,
  demoCriarVenda,
  demoListarCompradores,
  demoListarEmissoes,
  demoListarEstoque,
  demoListarVendas,
  demoObterComprador,
  demoRemoverEmissao,
  demoRemoverVenda,
} from "@/lib/demo/credito";

/**
 * api/credito - emissão e venda de crédito de carbono (issue #15).
 *
 * Rotas da Edge Function carbon-api atendidas aqui:
 *   GET    /compradores            POST   /compradores
 *   GET    /compradores/:id        PATCH  /compradores/:id
 *   GET    /emissoes-credito       POST   /emissoes-credito
 *   PATCH  /emissoes-credito/:id   DELETE /emissoes-credito/:id
 *   GET    /vendas                 POST   /vendas
 *   PATCH  /vendas/:id             DELETE /vendas/:id
 *   GET    /estoque-credito
 *
 * TRÊS REGRAS DO DOMÍNIO QUE ESTE MÓDULO PRESERVA E NÃO PODE AFROUXAR:
 *
 *   1. RECEITA NUNCA É CONVERTIDA. Toda resposta traz `receita` como um objeto com
 *      BRL, USD e EUR separados, e NÃO existe um campo de total somado - nem aqui,
 *      nem no servidor, nem no banco. Converter exigiria taxa e data de referência,
 *      que são decisão contábil e não existem no sistema. Se alguma tela precisar de
 *      um número único, o que falta é a decisão contábil, não a linha de código.
 *   2. O BUFFER ESTÁ DENTRO DO EMITIDO. `disponivel_tco2e` já vem descontado dele, e
 *      o aposentado NÃO é subtraído de novo (é subconjunto do vendido). Nenhuma
 *      dessas contas se refaz no navegador.
 *   3. COMPRADOR SIGILOSO chega com `nome` já substituído por um rótulo genérico e
 *      `nome_mascarado: true`, decidido pelo SERVIDOR a partir do papel de quem
 *      pergunta. A tela obedece a esse par e nunca decide sigilo por conta própria.
 *
 * MODO DEMONSTRAÇÃO: o `if (MODO_DEMO && MODO_DEMO_ATIVO())` fica SEM Boolean() em
 * volta de propósito. Com o wrapper o Rollup não dobra a expressão para a constante
 * false, os ramos sobrevivem ao tree-shaking e o dataset fictício inteiro vai para o
 * bundle de produção. Ver a nota longa em src/lib/runtimeConfig.js.
 *
 * Este módulo NÃO entra em src/lib/api/indice.js, de propósito (ver o cabeçalho de
 * lá). Importe '@/lib/api/credito' direto.
 */

/**
 * A venda precisa de ajuste correspondente e ele ainda não foi registrado?
 *
 * GÊMEA de public.carbon_venda_ajuste_pendente, que a migration
 * 20260814101000_credito manda replicar aqui: mudar uma exige mudar a outra (e a
 * terceira cópia, em src/lib/demo/credito.js, que não pode importar deste arquivo
 * sem criar ciclo). O comentário da função no banco registra o mesmo pacto.
 *
 * POR QUE A TELA PRECISA DELA, se a view já devolve `ajuste_pendente` por linha: o
 * formulário de venda avisa ANTES de salvar que aquela combinação de comprador e
 * projeto levanta a questão do Artigo 6 do Acordo de Paris. Perguntar isso ao
 * servidor a cada troca de campo seria uma requisição por tecla.
 *
 * PAÍS AUSENTE NÃO GERA PENDÊNCIA, de propósito: afirmar "falta ajuste
 * correspondente" porque o cadastro do comprador está incompleto é cobrar a coisa
 * errada. O que falta nesse caso é o país, e a tela cobra isso à parte. A comparação
 * ignora caixa e espaços nas pontas, mas NÃO conhece sinônimo de país (Brasil e
 * Brazil são diferentes aqui): normalizar nome de país é assunto de uma tabela de
 * referência que este domínio não tem.
 */
export function ajustePendente(paisComprador, paisProjeto, ajuste) {
  if (ajuste === true) return false;
  const comprador = String(paisComprador ?? "").trim();
  const projeto = String(paisProjeto ?? "").trim();
  if (comprador === "" || projeto === "") return false;
  return comprador.toLowerCase() !== projeto.toLowerCase();
}

/* ===== Mensagens dos códigos deste domínio ================================
   src/lib/api/base.js traduz os códigos da fundação. Os de baixo são deste domínio e
   cairiam no fallback genérico, que mostra o código técnico cru e não diz a quem lê o
   que fazer a seguir. 'registro_duplicado' está aqui porque o texto da fundação fala
   de ID de registro de PROJETO, e neste domínio o 409 significa outra coisa: faixa de
   serial repetida.                                                            */
const MENSAGENS = {
  vintage_invalido:
    "O vintage é o ano da safra do crédito e precisa estar entre 1990 e 2100.",
  quantidade_invalida:
    "A quantidade precisa ser maior que zero. Devolução ou cancelamento não se registra com volume negativo: corrija ou remova a venda.",
  buffer_maior_que_emitido:
    "O buffer faz parte do volume emitido e não pode ser maior que ele. Informe o volume TOTAL emitido em quantidade e a parcela retida em buffer.",
  serial_incompleto:
    "A faixa de serial precisa ter início e fim, ou nenhum dos dois. Serial único se registra com início igual ao fim.",
  moeda_invalida: "A moeda precisa ser BRL, USD ou EUR.",
  email_invalido: "O e-mail de contato do comprador está fora do formato aceito.",
  status_invalido:
    "O estágio do comprador precisa ser prospecção, negociação, recorrente ou encerrado.",
  comprador_sigiloso:
    "Este comprador está sob acordo de confidencialidade: alterar o nome, o e-mail ou retirar o sigilo exige perfil administrador.",
  registro_duplicado:
    "Já existe uma emissão com esta faixa de serial. Lançar a mesma faixa duas vezes inflaria o estoque: abra a emissão existente em vez de criar outra.",
  referencia_invalida:
    "Um dos vínculos informados não existe mais no sistema (comprador, projeto ou contrato).",
  sem_permissao:
    "Seu perfil não permite registrar emissão nem venda de crédito. Fale com a equipe responsável pelo sistema.",
  nada_para_atualizar: "Nenhum campo foi alterado.",
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
  return new ErroApi(mensagem, { codigo: erro.codigo, status: erro.status, detalhe: erro.detalhe });
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
 * Query string dos filtros. Valor vazio é OMITIDO: `?status=` chegaria ao servidor
 * como filtro por status vazio, que é diferente de "sem filtro de status".
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

/* ===== Compradores ======================================================== */

const CHAVES_COMPRADORES = ["busca", "status", "ativo", "recorrente", "pagina", "limite"];

/**
 * GET /compradores -> { compradores, total, pagina, limite, resumo }
 *
 * Lê a view carbon_compradores_listagem, que NÃO tem a coluna email: no lugar dela vem
 * o booleano `tem_email`, para a tela cobrar o cadastro do contato sem que o endereço
 * trafegue. Os agregados (volume, aposentado, receita por moeda, vendas com ajuste
 * pendente) já vêm somados do banco.
 *
 * A BUSCA POR NOME NÃO ALCANÇA COMPRADOR SIGILOSO quando quem pergunta não é
 * administrador, e os sigilosos vão para o fim da lista. As duas coisas acontecem no
 * servidor e existem pelo mesmo motivo: sem elas, refinar o termo de busca (ou ler a
 * posição alfabética da linha mascarada) soletraria a razão social que a máscara
 * acabou de esconder.
 */
export async function listarCompradores(msal, filtros = {}) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo("/compradores", () => demoListarCompradores(filtros));
  }
  return chamar(`/compradores${consulta(filtros, CHAVES_COMPRADORES)}`, msal);
}

/**
 * POST /compradores -> { comprador }
 *
 * `sigiloso: true` marca a identidade como restrita (NDA) e vale a partir da próxima
 * leitura, para todo mundo que não for administrador.
 */
export async function criarComprador(msal, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo("/compradores", () => demoCriarComprador(dados));
  }
  return chamar("/compradores", msal, { metodo: "POST", corpo: dados });
}

/** GET /compradores/:id -> { comprador, vendas } */
export async function obterComprador(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/compradores/${id}`, () => demoObterComprador(id));
  }
  return chamar(`/compradores/${cam(id)}`, msal);
}

/**
 * PATCH /compradores/:id -> { comprador }
 *
 * Envie apenas o que mudou. DUAS RECUSAS a esperar em comprador sigiloso, as duas com
 * o código 'comprador_sigiloso' e status 403: quem não é administrador não altera nome
 * nem e-mail (sobrescrever às cegas um valor que a API se recusou a mostrar é perda de
 * dado) e não retira o sigilo (isso publicaria para o time inteiro um nome que quem
 * retirou não podia ler).
 *
 * NÃO EXISTE remoção de comprador: a chave estrangeira de carbon_vendas é ON DELETE
 * RESTRICT porque venda é registro financeiro e não pode virar órfã. Para tirar o
 * comprador das listagens de trabalho, envie `ativo: false`.
 */
export async function atualizarComprador(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/compradores/${id}`, () => demoAtualizarComprador(id, dados));
  }
  return chamar(`/compradores/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/* ===== Emissões =========================================================== */

const CHAVES_EMISSOES = ["projeto_id", "vintage", "busca", "pagina", "limite"];

/**
 * GET /emissoes-credito -> { emissoes, total, pagina, limite }
 *
 * `busca` procura na faixa de serial, que é o único texto desta tabela que alguém
 * procura de cabeça (é por ela que se concilia o volume com o registro).
 *
 * `vendavel_tco2e` de cada linha é o vendável do EVENTO de emissão (emitido menos
 * buffer) e não desconta venda nenhuma: venda é por (projeto, vintage) e não por
 * evento, e quem responde disponibilidade é o estoque.
 */
export async function listarEmissoes(msal, filtros = {}) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo("/emissoes-credito", () => demoListarEmissoes(filtros));
  }
  return chamar(`/emissoes-credito${consulta(filtros, CHAVES_EMISSOES)}`, msal);
}

/**
 * POST /emissoes-credito -> { emissao }
 *
 * Corpo: { projeto_id, vintage, quantidade_tco2e, buffer_tco2e, serial_inicio,
 *          serial_fim, data_emissao, observacoes }
 *
 * `quantidade_tco2e` é o volume TOTAL emitido no evento, INCLUINDO a parcela retida em
 * buffer - e não o líquido. Mandar o líquido em quantidade e repetir o buffer ao lado
 * subtrairia a mesma tonelada duas vezes no estoque.
 *
 * Várias emissões por (projeto, vintage) são esperadas: cada rodada de verificação
 * emite separadamente, com faixa de serial própria.
 */
export async function criarEmissao(msal, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo("/emissoes-credito", () => demoCriarEmissao(dados));
  }
  return chamar("/emissoes-credito", msal, { metodo: "POST", corpo: dados });
}

/**
 * PATCH /emissoes-credito/:id -> { emissao }
 *
 * `projeto_id` não é aceito: mudar o dono de uma emissão já lançada moveria estoque de
 * um projeto para outro em silêncio, com a faixa de serial do registro apontando para
 * o projeto errado.
 */
export async function atualizarEmissao(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/emissoes-credito/${id}`, () => demoAtualizarEmissao(id, dados));
  }
  return chamar(`/emissoes-credito/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/**
 * DELETE /emissoes-credito/:id -> { removida, emissao }
 *
 * As vendas do mesmo vintage NÃO vão junto: emissão e venda se encontram por (projeto,
 * vintage), nunca por chave estrangeira. Apagar a emissão de um vintage que já tem
 * venda deixa a linha do estoque acusando `sem_emissao`, que é exatamente o que se
 * quer ver - recusar impediria corrigir o lançamento duplicado, que é o caso de uso
 * real desta rota.
 */
export async function removerEmissao(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/emissoes-credito/${id}`, () => demoRemoverEmissao(id));
  }
  return chamar(`/emissoes-credito/${cam(id)}`, msal, { metodo: "DELETE" });
}

/* ===== Vendas ============================================================= */

const CHAVES_VENDAS = [
  "comprador_id",
  "projeto_id",
  "vintage",
  "moeda",
  "situacao",
  "aposentado",
  "pagina",
  "limite",
];

/**
 * GET /vendas -> { vendas, total, pagina, limite, resumo }
 *
 * `situacao` aceita 'ajuste_pendente', 'internacional' e 'sem_preco'. As duas primeiras
 * filtram por colunas CALCULADAS pela view a partir de carbon_venda_ajuste_pendente,
 * e não por uma regra remontada no cliente.
 *
 * No `resumo`, `receita` traz as três moedas separadas e não existe total somado. Ver
 * a regra 1 do cabeçalho.
 */
export async function listarVendas(msal, filtros = {}) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo("/vendas", () => demoListarVendas(filtros));
  }
  return chamar(`/vendas${consulta(filtros, CHAVES_VENDAS)}`, msal);
}

/**
 * POST /vendas -> { venda }
 *
 * Corpo: { comprador_id, projeto_id, vintage, quantidade_tco2e, preco_unitario, moeda,
 *          data, contrato_documento_id, ajuste_correspondente, aposentado,
 *          data_aposentadoria, observacoes }
 *
 * `valor_total` NÃO vai no corpo: é coluna gerada pelo Postgres (quantidade vezes
 * preço, arredondado em 2 casas) e volta pronta na resposta.
 *
 * `preco_unitario` é opcional: parte das transações tem preço sob confidencialidade ou
 * ainda em negociação, e exigir o valor levaria alguém a inventar número.
 *
 * VENDA SEM EMISSÃO NÃO É RECUSADA. Venda a termo de vintage futuro é prática normal
 * do mercado, e barrar isso impediria de registrar um contrato que já existe. O caso
 * aparece como conciliação pendente (`sem_emissao`, `sobrevendido`) no estoque.
 */
export async function criarVenda(msal, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo("/vendas", () => demoCriarVenda(dados));
  }
  return chamar("/vendas", msal, { metodo: "POST", corpo: dados });
}

/**
 * PATCH /vendas/:id -> { venda }
 *
 * Informar `data_aposentadoria` marca `aposentado` como true automaticamente, e enviar
 * `aposentado: false` limpa a data junto: os dois campos não podem se contradizer (há
 * um CHECK no banco para isso). O caminho de marcar a aposentadoria sem ter a data em
 * mãos continua aberto, porque a equipe costuma saber do retirement antes de receber o
 * extrato do registro.
 */
export async function atualizarVenda(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/vendas/${id}`, () => demoAtualizarVenda(id, dados));
  }
  return chamar(`/vendas/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/**
 * DELETE /vendas/:id -> { removida, venda }
 *
 * É assim que se reverte uma venda lançada errado. Não existe venda com quantidade
 * negativa neste domínio (a coluna exige volume maior que zero): uma "venda de
 * estorno" furaria toda a conciliação do estoque.
 */
export async function removerVenda(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/vendas/${id}`, () => demoRemoverVenda(id));
  }
  return chamar(`/vendas/${cam(id)}`, msal, { metodo: "DELETE" });
}

/* ===== Estoque ============================================================ */

const CHAVES_ESTOQUE = ["projeto_id", "vintage", "alerta", "pagina", "limite"];

/**
 * GET /estoque-credito -> { estoque, conciliacao, total, pagina, limite }
 *
 * `estoque` é uma linha por (projeto, vintage), com emitido, buffer, vendável,
 * vendido, aposentado e disponível, mais as três bandeiras de conciliação
 * (`sobrevendido`, `sem_emissao`, `sem_venda`). A chave sai da UNIÃO de emissões e
 * vendas: venda a termo de vintage ainda não emitido APARECE, em vez de sumir.
 *
 * `conciliacao` é o mesmo conjunto somado, com a quebra por vintage e os alertas. Ela
 * segue os filtros de projeto e vintage e IGNORA o filtro de alerta, de propósito: se
 * seguisse, "disponível" significaria uma coisa ao olhar os sobrevendidos e outra ao
 * olhar o estoque parado. Nunca vem nula - conjunto vazio devolve zeros e listas
 * vazias, que é justamente o estado de hoje.
 *
 * `alerta` aceita 'sobrevendido', 'sem_emissao', 'sem_venda' e 'ajuste_pendente'.
 */
export async function listarEstoque(msal, filtros = {}) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo("/estoque-credito", () => demoListarEstoque(filtros));
  }
  return chamar(`/estoque-credito${consulta(filtros, CHAVES_ESTOQUE)}`, msal);
}

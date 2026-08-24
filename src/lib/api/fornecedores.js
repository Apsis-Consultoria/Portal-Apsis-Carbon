import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo, ErroApi } from "@/lib/api/base";
import {
  demoListarFornecedores,
  demoCriarFornecedor,
  demoObterFornecedor,
  demoAtualizarFornecedor,
  demoListarContratos,
  demoCriarContrato,
  demoObterContrato,
  demoAtualizarContrato,
  demoCriarParcela,
  demoGerarParcelas,
  demoListarParcelas,
  demoAtualizarParcela,
  demoRemoverParcela,
} from "@/lib/demo/fornecedores";

/**
 * api/fornecedores - fornecedores, contratos e parcelas (issues #10 e #11).
 *
 * Rotas da Edge Function carbon-api atendidas aqui:
 *   GET    /fornecedores                     POST   /fornecedores
 *   GET    /fornecedores/:id                 PATCH  /fornecedores/:id
 *   GET    /contratos                        POST   /contratos
 *   GET    /contratos/:id                    PATCH  /contratos/:id
 *   POST   /contratos/:id/parcelas           POST   /contratos/:id/parcelas-gerar
 *   GET    /parcelas                         PATCH  /parcelas/:id
 *   DELETE /parcelas/:id
 *
 * MODO DEMONSTRACAO: o projeto Supabase ainda nao foi provisionado, entao com
 * MODO_DEMO ligado estas funcoes NAO fazem rede - operam sobre o dataset em memoria
 * de src/lib/demo/fornecedores.js, que reproduz as mesmas regras de calculo do SQL.
 *
 * O `if (MODO_DEMO && MODO_DEMO_ATIVO())` fica SEM Boolean() em volta de proposito: com o wrapper o
 * Rollup nao dobra a expressao para a constante false, os ramos sobrevivem ao
 * tree-shaking e o dataset ficticio inteiro vai para o bundle de producao. Ver a
 * nota longa em src/lib/runtimeConfig.js.
 */

/**
 * Janela em dias que separa 'a_vencer' de 'em_aberto'.
 *
 * MESMO numero do `current_date + 7` da funcao SQL public.carbon_parcelas_status e
 * da constante JANELA_A_VENCER_DIAS de src/lib/demo/fornecedores.js. Vive em tres
 * lugares porque cada camada precisa dele sem importar as outras (o dataset de
 * demonstracao nao pode depender deste modulo, que importa o dataset). Se mudar,
 * mude nos tres: a migration 20260814097000_fornecedores registra isso tambem.
 *
 * A tela usa o valor apenas para ESCREVER o rotulo ("a vencer em 7 dias"); quem
 * decide o status de cada parcela e sempre o servidor.
 */
export const JANELA_A_VENCER_DIAS = 7;

/**
 * Periodicidades aceitas na geracao de parcelas, com o rotulo de interface.
 *
 * Espelha o CASE de public.carbon_parcelas_gerar. Fica aqui, e nao na tela, porque
 * as duas telas do dominio precisam da mesma lista e porque acrescentar uma
 * periodicidade exige mexer no SQL de qualquer forma.
 */
export const PERIODICIDADES = [
  { valor: "mensal", rotulo: "Mensal", meses: 1 },
  { valor: "bimestral", rotulo: "Bimestral", meses: 2 },
  { valor: "trimestral", rotulo: "Trimestral", meses: 3 },
  { valor: "quadrimestral", rotulo: "Quadrimestral", meses: 4 },
  { valor: "semestral", rotulo: "Semestral", meses: 6 },
  { valor: "anual", rotulo: "Anual", meses: 12 },
  { valor: "unica", rotulo: "Pagamento único", meses: 0 },
];

/**
 * Mensagens dos codigos de erro DESTE dominio.
 *
 * POR QUE AQUI E NAO EM src/lib/api/base.js: base.js e da fundacao e compartilhado
 * por todos os dominios, e a traducao generica de 'registro_duplicado' fala de ID de
 * registro de projeto ("Este ID no registro ja pertence a outro projeto"), que aqui
 * seria uma mensagem simplesmente errada - neste dominio o 409 de fornecedor
 * significa CNPJ repetido. Os demais codigos sao novos e cairiam no texto tecnico
 * cru.
 *
 * Os textos vao acentuados, como manda a regra de interface do projeto.
 */
const MENSAGENS = {
  registro_duplicado:
    "Já existe um fornecedor cadastrado com este CNPJ. Abra o cadastro existente em vez de criar outro.",
  cnpj_invalido: "O CNPJ precisa ter 14 dígitos. Confira o número informado.",
  parcelas_ja_existem:
    "Este contrato já tem parcelas geradas. Para refazer a série, marque a opção de substituir as parcelas em aberto.",
  parcela_paga_impede_regeracao:
    "Não é possível refazer a série: o contrato já tem parcela paga. Ajuste as parcelas restantes uma a uma.",
  parcela_paga:
    "Parcela paga não pode ser removida: ela é o registro de um pagamento efetuado. Se o pagamento foi lançado por engano, limpe a data de pagamento primeiro.",
  periodicidade_invalida:
    "Escolha uma periodicidade válida para a série de parcelas.",
  valor_ambiguo:
    "Informe o valor total OU o valor da parcela, não os dois: com os dois o sistema não sabe qual deve valer.",
  valor_obrigatorio:
    "Informe o valor total, o valor da parcela ou preencha o valor do contrato antes de gerar as parcelas.",
  status_invalido: "O status informado não é válido para este cadastro.",
  referencia_invalida:
    "Um dos vínculos informados não existe mais no sistema (fornecedor ou projeto).",
  sem_permissao:
    "Seu perfil não permite criar nem editar fornecedores, contratos e parcelas. Fale com a equipe responsável pelo sistema.",
  periodo_invalido: "A data final do período não pode ser anterior à inicial.",
};

/**
 * Troca a mensagem do ErroApi quando o codigo tem texto proprio deste dominio.
 *
 * Preserva codigo e status para o GuardaDeSessao e as telas continuarem decidindo
 * pelo codigo, nunca pelo texto.
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
 * Query string dos filtros. Valor vazio e OMITIDO: `?status=` chegaria ao servidor
 * como filtro por status vazio, que e diferente de "sem filtro de status".
 *
 * Booleano vira 'true'/'false' porque a Edge Function le a string da query.
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

/* ===== Fornecedores ======================================================= */

const CHAVES_FORNECEDORES = ["busca", "status", "ativo", "pagina", "limite"];

/**
 * GET /fornecedores -> { fornecedores, total, pagina, limite, resumo }
 *
 * A listagem NUNCA traz dados bancarios: ela le uma view que nao tem a coluna. O
 * que vem e o booleano tem_dados_bancarios, para a tela poder cobrar o cadastro
 * sem expor o dado. Ver o requisito de privacidade da issue #10.
 */
export async function listarFornecedores(msal, filtros = {}) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo("/fornecedores", () => demoListarFornecedores(filtros));
  return chamar(`/fornecedores${consulta(filtros, CHAVES_FORNECEDORES)}`, msal);
}

/** POST /fornecedores -> { fornecedor } */
export async function criarFornecedor(msal, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo("/fornecedores", () => demoCriarFornecedor(dados));
  return chamar("/fornecedores", msal, { metodo: "POST", corpo: dados });
}

/**
 * GET /fornecedores/:id -> { fornecedor, contratos }
 *
 * `fornecedor.dados_bancarios_visivel` diz se o servidor liberou o conteudo (papel
 * admin). Quando false, o campo dados_bancarios simplesmente NAO vem na resposta -
 * a tela nao deve inferir permissao por conta propria, so obedecer a esse booleano.
 */
export async function obterFornecedor(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo(`/fornecedores/${id}`, () => demoObterFornecedor(id));
  return chamar(`/fornecedores/${cam(id)}`, msal);
}

/**
 * PATCH /fornecedores/:id -> { fornecedor }
 *
 * Envie apenas o que mudou. A coluna dados_bancarios so e tocada quando a chave vem
 * no corpo, portanto o formulario de quem nao pode ler o campo (que nao o mostra)
 * nunca apaga o que ja estava cadastrado.
 */
export async function atualizarFornecedor(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/fornecedores/${id}`, () => demoAtualizarFornecedor(id, dados));
  }
  return chamar(`/fornecedores/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/* ===== Contratos ========================================================== */

const CHAVES_CONTRATOS = [
  "fornecedor_id",
  "projeto_id",
  "status",
  "centro_custo",
  "busca",
  "pagina",
  "limite",
];

/**
 * GET /contratos -> { contratos, total, pagina, limite, resumo }
 *
 * `projeto_id` aceita o valor especial 'backoffice', que significa "somente
 * contratos SEM projeto" (assessoria, ferramenta, servico administrativo) -
 * diferente de nao filtrar, que traz tudo. `centro_custo` aceita 'sem_centro' com a
 * mesma logica.
 *
 * No `resumo`, `com_divergencia` conta contratos em que a soma das parcelas nao
 * fecha com o valor contratado. Nao e erro: pode ser aditivo, glosa ou serie ainda
 * nao gerada. E informacao, e a tela mostra em vez de esconder.
 */
export async function listarContratos(msal, filtros = {}) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo("/contratos", () => demoListarContratos(filtros));
  return chamar(`/contratos${consulta(filtros, CHAVES_CONTRATOS)}`, msal);
}

/** POST /contratos -> { contrato } */
export async function criarContrato(msal, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo("/contratos", () => demoCriarContrato(dados));
  return chamar("/contratos", msal, { metodo: "POST", corpo: dados });
}

/** GET /contratos/:id -> { contrato, parcelas, totais } */
export async function obterContrato(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo(`/contratos/${id}`, () => demoObterContrato(id));
  return chamar(`/contratos/${cam(id)}`, msal);
}

/** PATCH /contratos/:id -> { contrato } */
export async function atualizarContrato(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/contratos/${id}`, () => demoAtualizarContrato(id, dados));
  }
  return chamar(`/contratos/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/* ===== Parcelas =========================================================== */

/**
 * POST /contratos/:id/parcelas-gerar -> { geracao, contrato, parcelas, totais }
 *
 * Geracao automatica da serie (criterio de aceite da issue #11). Corpo:
 *   { quantidade, periodicidade, primeiro_vencimento,
 *     valor_total | valor_parcela, tipo_servico, centro_custo, descricao,
 *     substituir }
 *
 * Informe valor_total OU valor_parcela, nunca os dois (409/400 'valor_ambiguo'); sem
 * nenhum dos dois, o servidor usa o valor total do contrato. A conta (resto de
 * centavos na ultima parcela e vencimento calculado a partir do PRIMEIRO
 * vencimento) esta na funcao SQL, nao aqui.
 *
 * Contrato que ja tem parcelas responde 409 'parcelas_ja_existem': clique duplo nao
 * duplica obrigacao financeira. Para refazer, envie substituir: true, que apaga as
 * parcelas EM ABERTO e regera - e recusa com 409 se houver parcela paga.
 */
export async function gerarParcelas(msal, contratoId, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/contratos/${contratoId}/parcelas-gerar`, () =>
      demoGerarParcelas(contratoId, dados)
    );
  }
  return chamar(`/contratos/${cam(contratoId)}/parcelas-gerar`, msal, {
    metodo: "POST",
    corpo: dados,
  });
}

/**
 * POST /contratos/:id/parcelas -> { parcela, contrato }
 *
 * Parcela avulsa (aditivo, medicao fora do cronograma). O `numero` NAO vai no
 * corpo: o servidor usa o proximo da serie do contrato.
 */
export async function criarParcela(msal, contratoId, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/contratos/${contratoId}/parcelas`, () =>
      demoCriarParcela(contratoId, dados)
    );
  }
  return chamar(`/contratos/${cam(contratoId)}/parcelas`, msal, {
    metodo: "POST",
    corpo: dados,
  });
}

const CHAVES_PARCELAS = [
  "visao",
  "inicio",
  "fim",
  "centro_custo",
  "fornecedor_id",
  "projeto_id",
  "contrato_id",
  "pagina",
  "limite",
];

/**
 * GET /parcelas -> { parcelas, total, pagina, limite, visao, totais }
 *
 * `visao`: 'em_aberto' | 'pagas' | 'calendario' | 'todas'. Espelha as views da base
 * do Notion. 'calendario' devolve as mesmas parcelas de 'todas' no periodo: quem
 * agrupa por dia e a tela.
 *
 * `totais` NAO segue a visao de proposito: soma sempre o periodo inteiro e devolve a
 * quebra por status, por centro de custo e por mes. Se seguisse, "total do periodo"
 * significaria uma coisa na aba de pagas e outra na de em aberto.
 *
 * `centro_custo` aceita 'sem_centro' para alcancar as parcelas sem centro de custo.
 */
export async function listarParcelas(msal, filtros = {}) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo("/parcelas", () => demoListarParcelas(filtros));
  return chamar(`/parcelas${consulta(filtros, CHAVES_PARCELAS)}`, msal);
}

/**
 * PATCH /parcelas/:id -> { parcela, contrato }
 *
 * NAO existe campo de status: baixar a parcela e enviar `data_pagamento`, e desfazer
 * a baixa e envia-la como null. Requisito central da issue #11 - com um status
 * manual ao lado da data, os dois divergem (e e o que acontece no Notion hoje).
 *
 * O contrato volta junto porque os agregados dele mudaram com a baixa.
 */
export async function atualizarParcela(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo(`/parcelas/${id}`, () => demoAtualizarParcela(id, dados));
  return chamar(`/parcelas/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/**
 * DELETE /parcelas/:id -> { removida, parcela, contrato }
 *
 * Somente parcela NAO paga. Parcela paga e registro de pagamento efetuado e
 * responde 409 'parcela_paga': para corrigir um lancamento errado, limpe a data de
 * pagamento primeiro.
 */
export async function removerParcela(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo(`/parcelas/${id}`, () => demoRemoverParcela(id));
  return chamar(`/parcelas/${cam(id)}`, msal, { metodo: "DELETE" });
}

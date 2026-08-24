import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo, ErroApi } from "@/lib/api/base";
import {
  demoListarReunioes,
  demoObterReuniao,
  demoCriarReuniao,
  demoAtualizarReuniao,
  demoGerarSerieReunioes,
  demoCriarAta,
  demoAtualizarAta,
  demoCriarPendencia,
  demoAtualizarPendencia,
  demoRemoverPendencia,
} from "@/lib/demo/reunioes";

/**
 * api/reunioes - reunioes, atas e pendencias de ata (issue #9).
 *
 * MODO DEMONSTRACAO: o projeto Supabase ainda nao foi provisionado, entao com MODO_DEMO
 * ligado estas funcoes NAO fazem rede - operam sobre o dataset em memoria de
 * src/lib/demo/reunioes.js, e as mutacoes alteram esse dataset para a tela ser
 * realmente interativa na revisao.
 *
 * O `if (MODO_DEMO && MODO_DEMO_ATIVO())` fica SEM Boolean() em volta de proposito: com o wrapper o Rollup
 * nao dobra a expressao para a constante false, os ramos sobrevivem ao tree-shaking e o
 * dataset ficticio inteiro vai para o bundle de producao. Ver a nota longa em
 * src/lib/runtimeConfig.js.
 */

/**
 * Mensagens dos codigos de erro DESTE dominio.
 *
 * POR QUE AQUI E NAO EM src/lib/api/base.js: base.js e da fundacao e compartilhado por
 * todos os dominios. Dois codigos precisam de texto proprio para as telas de reuniao:
 *
 *   - 'registro_duplicado': a traducao generica de base.js fala de ID de registro de
 *     projeto ("Este ID no registro ja pertence a outro projeto"), que aqui seria uma
 *     mensagem simplesmente errada. Neste dominio o 409 significa uma coisa so: a
 *     reuniao ja tem ata (a coluna reuniao_id de carbon_atas e unique).
 *   - 'tipo_nao_recorrente' e 'parceiro_obrigatorio': codigos novos, sem traducao no
 *     catalogo geral, que cairiam no texto tecnico cru.
 *
 * Os textos vao acentuados, como manda a regra de interface do projeto.
 */
const MENSAGENS = {
  registro_duplicado:
    "Esta reunião já tem ata. Abra a ata existente em vez de criar outra.",
  tipo_nao_recorrente:
    "Só a reunião semanal e a semanal por parceiro têm cadência recorrente. Reunião temática, de governança e de consulta acontece por evento, então não gera série.",
  parceiro_obrigatorio:
    "Reunião semanal por parceiro precisa da organização parceira: é ela que distingue as duas reuniões da mesma data.",
  referencia_invalida:
    "Um dos vínculos informados não existe mais no sistema (projeto, colaborador ou atividade).",
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
 * Query string da listagem. Valor vazio e OMITIDO: `?tipo=` chegaria ao servidor como
 * filtro por tipo vazio, que e diferente de "sem filtro de tipo".
 */
function consulta(filtros = {}) {
  const params = new URLSearchParams();
  for (const chave of ["projeto_id", "tipo", "parceiro", "pagina", "limite"]) {
    const valor = filtros[chave];
    if (valor === null || valor === undefined || valor === "") continue;
    params.set(chave, String(valor));
  }
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

/* ===== Reunioes =========================================================== */

/**
 * GET /reunioes -> { reunioes, total, resumo, pagina, limite }
 *
 * `filtros`: { projeto_id, tipo, parceiro, pagina, limite }. projeto_id aceita o valor
 * especial 'backoffice', que significa "somente reunioes sem projeto" (a weekly da
 * operacao) - diferente de nao filtrar, que traz tudo.
 */
export async function listarReunioes(msal, filtros = {}) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo("/reunioes", () => demoListarReunioes(filtros));
  return chamar(`/reunioes${consulta(filtros)}`, msal);
}

/** GET /reunioes/:id -> { reuniao, ata, pendencias } */
export async function obterReuniao(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo(`/reunioes/${id}`, () => demoObterReuniao(id));
  return chamar(`/reunioes/${cam(id)}`, msal);
}

/** POST /reunioes -> { reuniao } */
export async function criarReuniao(msal, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo("/reunioes", () => demoCriarReuniao(dados));
  return chamar("/reunioes", msal, { metodo: "POST", corpo: dados });
}

/** PATCH /reunioes/:id -> { reuniao, ata, pendencias } (o detalhe inteiro) */
export async function atualizarReuniao(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/reunioes/${id}`, () => demoAtualizarReuniao(id, dados));
  }
  return chamar(`/reunioes/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/**
 * POST /reunioes/:id/serie -> { criadas, ignoradas, recorrencia_id, intervalo_dias }
 *
 * Gera as proximas N reunioes semanais copiando projeto, tipo, titulo e parceiro desta.
 * Idempotente no backend: data que ja tem reuniao equivalente e pulada e contada em
 * `ignoradas`, portanto clicar duas vezes nao duplica a agenda.
 */
export async function gerarSerieReunioes(msal, id, quantidade) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/reunioes/${id}/serie`, () =>
      demoGerarSerieReunioes(id, quantidade)
    );
  }
  return chamar(`/reunioes/${cam(id)}/serie`, msal, {
    metodo: "POST",
    corpo: { quantidade },
  });
}

/* ===== Ata ================================================================ */

/**
 * POST /reunioes/:id/ata -> { ata }
 *
 * Abre a ata da reuniao. Pode ser chamada sem nenhum campo: ata em branco no comeco da
 * reuniao, preenchida durante ela, e o fluxo real da pauta.
 */
export async function criarAta(msal, reuniaoId, dados = {}) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/reunioes/${reuniaoId}/ata`, () => demoCriarAta(reuniaoId, dados));
  }
  return chamar(`/reunioes/${cam(reuniaoId)}/ata`, msal, { metodo: "POST", corpo: dados });
}

/**
 * PATCH /atas/:id -> { ata }
 *
 * `aprovada_em` NAO e enviado: e coluna derivada, mantida por trigger no banco, para o
 * carimbo de aprovacao de uma evidencia de auditoria nao ser editavel a mao.
 */
export async function atualizarAta(msal, ataId, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo(`/atas/${ataId}`, () => demoAtualizarAta(ataId, dados));
  return chamar(`/atas/${cam(ataId)}`, msal, { metodo: "PATCH", corpo: dados });
}

/* ===== Pendencias da ata ================================================== */

/** POST /atas/:id/pendencias -> { pendencia } */
export async function criarPendencia(msal, ataId, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/atas/${ataId}/pendencias`, () => demoCriarPendencia(ataId, dados));
  }
  return chamar(`/atas/${cam(ataId)}/pendencias`, msal, { metodo: "POST", corpo: dados });
}

/** PATCH /ata-pendencias/:id -> { pendencia } */
export async function atualizarPendencia(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/ata-pendencias/${id}`, () => demoAtualizarPendencia(id, dados));
  }
  return chamar(`/ata-pendencias/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/** DELETE /ata-pendencias/:id -> { removido: true } */
export async function removerPendencia(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/ata-pendencias/${id}`, () => demoRemoverPendencia(id));
  }
  return chamar(`/ata-pendencias/${cam(id)}`, msal, { metodo: "DELETE" });
}

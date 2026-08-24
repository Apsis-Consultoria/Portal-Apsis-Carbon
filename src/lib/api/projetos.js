import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo } from "@/lib/api/base";
import {
  demoListarProjetos,
  demoObterProjeto,
  demoCriarProjeto,
  demoAtualizarProjeto,
  demoAtualizarEquipe,
} from "@/lib/demoProjetos";

/**
 * api/projetos - rotas de projeto de carbono (issue #1).
 *
 * MODO DEMONSTRACAO: o projeto Supabase ainda nao foi provisionado, entao com
 * MODO_DEMO ligado estas funcoes NAO fazem rede - operam sobre o dataset em memoria
 * de src/lib/demoProjetos.js, e as mutacoes alteram esse dataset para a tela ser
 * realmente interativa na revisao.
 *
 * Isso vale SOMENTE em desenvolvimento: MODO_DEMO exige import.meta.env.DEV E a
 * variavel o clique no botao de demonstracao (ver src/lib/runtimeConfig.js). Em build de producao
 * MODO_DEMO e false por forca, e como import.meta.env.DEV e estatico o bundler
 * elimina o ramo do demo do bundle.
 *
 * O `if (MODO_DEMO && MODO_DEMO_ATIVO())` fica SEM Boolean() em volta de proposito: com o wrapper o Rollup
 * nao dobra a expressao para a constante false, os ramos sobrevivem ao tree-shaking e
 * o dataset ficticio inteiro ia para o bundle de producao.
 *
 * NOTA DE CONVENCAO: dominios novos colocam o dataset em src/lib/demo/<dominio>.js.
 * Projetos e PDD continuam em src/lib/demoProjetos.js porque o arquivo ja existia
 * antes da convencao; mover agora seria diff sem ganho.
 */

export async function listarProjetos(msal) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo("/projetos", () => demoListarProjetos());
  return chamarApi("/projetos", msal);
}

/**
 * normalizarListaProjetos - forma ÚNICA da resposta de GET /projetos para as telas.
 *
 * POR QUE PRECISA SER ÚNICA: a chave de cache ['carbon', 'projetos'] do TanStack Query
 * é compartilhada de propósito por seis telas (Projetos, Atividades, Contratos,
 * Documentos, Reuniões e a escolha de projeto de ProjetoFindings), para que abrir a
 * segunda tela não refaça a requisição. Cache compartilhado só funciona com formato
 * compartilhado: se uma tela guardasse o array puro e outra guardasse o envelope,
 * quem chegasse depois leria o formato da primeira. Um `.map()` sobre objeto derruba
 * o render inteiro no ErrorBoundary, e o `?? []` não protege, porque o valor errado
 * não é nulo. Toda tela que usar essa chave passa a resposta por aqui, sem exceção.
 *
 * O RAMO DO ARRAY é a forma ANTIGA da rota, quando ela devolvia um array puro. Ele
 * fica para a janela de deploy em que o frontend novo já está publicado e o backend
 * ainda é o velho: sem ele, as seis telas ficariam vazias até a Edge Function subir.
 *
 * NESSA JANELA `podeCriar` é false DE PROPÓSITO. O backend velho não manda
 * `pode_criar`, e assumir true "porque antes todo mundo podia" ofereceria uma ação
 * que o servidor vai recusar com 403. Ser conservador aqui significa esconder uma
 * capacidade que talvez exista, nunca inventar uma que talvez não exista. O botão
 * volta sozinho assim que o backend novo responder.
 *
 * @param {Array|{projetos?: Array, pode_criar?: boolean}} resposta
 * @returns {{ projetos: Array, podeCriar: boolean }} formato estável para as seis telas.
 */
export function normalizarListaProjetos(resposta) {
  if (Array.isArray(resposta)) return { projetos: resposta, podeCriar: false };

  // Array.isArray e nao `?? []`: o `??` só cobre null e undefined, e o valor
  // perigoso aqui é qualquer OUTRA coisa. Um `projetos` que chegue como objeto,
  // string ou número atravessa o `??` intacto e só estoura lá na frente, num
  // `.map()` dentro do render, que é o caminho direto para a tela branca que a
  // regra 8 do CLAUDE.md proíbe. Degradar para lista vazia é pior do que mostrar
  // os dados, mas é muito melhor do que derrubar a tela, e o console guarda o
  // motivo para quem for depurar.
  const projetos = resposta?.projetos;
  if (projetos !== undefined && !Array.isArray(projetos)) {
    console.error(
      '[api/projetos] GET /projetos devolveu `projetos` que não é lista:',
      typeof projetos,
    );
  }

  return {
    projetos: Array.isArray(projetos) ? projetos : [],
    podeCriar: resposta?.pode_criar === true,
  };
}

export async function obterProjeto(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo(`/projetos/${id}`, () => demoObterProjeto(id));
  return chamarApi(`/projetos/${cam(id)}`, msal);
}

export async function criarProjeto(msal, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo("/projetos", () => demoCriarProjeto(dados));
  return chamarApi("/projetos", msal, { metodo: "POST", corpo: dados });
}

export async function atualizarProjeto(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarDemo(`/projetos/${id}`, () => demoAtualizarProjeto(id, dados));
  return chamarApi(`/projetos/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/**
 * PATCH /projetos/:id/equipe -> { equipe, nao_encontrados }
 *
 * Mesmo contrato do PATCH de equipe do Secure Share: o corpo é
 * `{ adicionar: ['<e-mail>'], remover: ['<e-mail>'] }`, por E-MAIL e nunca por id, porque
 * quem inclui alguém sabe o e-mail da pessoa e não o identificador dela no banco.
 *
 * `nao_encontrados` traz os e-mails que ainda não têm linha em carbon_usuarios (ela
 * nasce no primeiro login no Apsis Carbon). NÃO é erro: os demais entraram, e a tela
 * avisa quem ficou de fora e por quê.
 *
 * Esta rota é a única saída para o cenário de bloqueio criado pela leitura por
 * participação: sem ela, quem não está em nenhum projeto ficaria com a lista vazia e
 * sem nenhum botão, em lugar nenhum do sistema, capaz de incluí-lo.
 *
 * SEM mapa de mensagens próprio: 'colaborador_externo' e 'equipe_vazia' são traduzidos
 * em mensagemDeErro (src/lib/api/base.js), junto dos outros códigos deste domínio.
 * Um segundo texto para o mesmo código divergiria do primeiro na revisão de copy
 * seguinte, e ninguém saberia qual dos dois a tela mostra.
 */
export async function atualizarEquipe(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarDemo(`/projetos/${id}/equipe`, () => demoAtualizarEquipe(id, dados));
  }
  return chamarApi(`/projetos/${cam(id)}/equipe`, msal, { metodo: "PATCH", corpo: dados });
}

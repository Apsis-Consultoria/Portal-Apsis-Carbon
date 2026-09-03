import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { caminhoFuncao } from "@/lib/endpoint";
import { getConfig } from "@/lib/runtimeConfig";
import { montarLoginRequest } from "@/lib/msalConfig";

/**
 * api/base - transporte e tratamento de erro das chamadas a Edge Function carbon-api.
 *
 * Este arquivo nao conhece NENHUMA rota de negocio. Cada dominio tem o seu proprio
 * modulo (src/lib/api/<dominio>.js) que importa `chamarApi` daqui. Assim uma frente
 * nova de trabalho nao precisa editar um arquivo que todas as outras tambem editam.
 *
 * Autenticacao: enviamos o ID token do Azure AD no Authorization, e mais nada. A Edge
 * Function valida o token contra o JWKS da Microsoft (aud, iss, tid) e o dominio do e-mail
 * antes de tocar no banco com service_role.
 *
 * SEM anon key. As funcoes sao publicadas com --no-verify-jwt, entao a anon key nunca
 * participou de autorizacao: era so identificacao de projeto no gateway, e o gateway agora
 * e alcancado pelo rewrite de /api da hospedagem. Ver src/lib/endpoint.js.
 *
 * Nao usamos o access token porque quem consome nao e o Microsoft Graph: e a nossa funcao,
 * e o aud do access token do Graph nao seria o nosso clientId.
 */

const TIMEOUT_MS = 10000;

/** Erro tipado de API. `codigo` carrega o campo `erro` do corpo quando existir. */
export class ErroApi extends Error {
  /**
   * `detalhe` e o campo opcional que o backend manda junto do codigo, e ele e
   * SEMPRE generico por contrato (ver respostaErro em _shared/cors.ts): nunca
   * carrega mensagem de banco nem dado de outra pessoa. Serve para o caso em que
   * a tela precisa de um numero para montar a frase - por exemplo, quantos
   * minutos faltam para poder reenviar um convite.
   *
   * Antes ele era descartado aqui, e a tela so conseguia dizer "espere um pouco".
   */
  constructor(mensagem, { codigo = null, status = null, detalhe = null } = {}) {
    super(mensagem);
    this.name = "ErroApi";
    this.codigo = codigo;
    this.status = status;
    this.detalhe = detalhe;
  }
}

/**
 * Erro tipado para "precisa de interacao do usuario".
 * Propositalmente NAO disparamos loginRedirect daqui: um redirect saindo de uma chamada de
 * dados joga o usuario fora da tela no meio de um carregamento e pode entrar em loop se
 * duas queries falharem juntas.
 *
 * QUEM E O DONO DESTE ERRO: o GuardaDeSessao em src/App.jsx observa o cache do TanStack
 * Query e, ao ver codigo === 'interacao_necessaria', renderiza a tela
 * src/pages/AcessoBloqueado.jsx com o botao "Entrar novamente". Se este erro voltar a ficar
 * sem consumidor, a sessao expirada volta a deixar o app permanentemente vazio.
 */
export class ErroInteracaoNecessaria extends Error {
  constructor(mensagem = "Sessao expirada. Entre novamente para continuar.") {
    super(mensagem);
    this.name = "ErroInteracaoNecessaria";
    this.codigo = "interacao_necessaria";
  }
}

/** Obtem o ID token silenciosamente a partir da conta ativa do MSAL. */
async function obterIdToken(msal) {
  const instance = msal?.instance;
  const contas = msal?.accounts || [];

  if (!instance) {
    throw new ErroApi("Instancia do MSAL nao disponivel para autenticar a chamada.", {
      codigo: "msal_indisponivel",
    });
  }
  if (!contas.length) {
    throw new ErroInteracaoNecessaria("Nenhuma conta autenticada. Entre para continuar.");
  }

  const pedido = { ...montarLoginRequest(getConfig()), account: contas[0] };

  try {
    const resposta = await instance.acquireTokenSilent(pedido);
    if (!resposta?.idToken) {
      throw new ErroInteracaoNecessaria("Nao foi possivel obter o token de identidade.");
    }
    return resposta.idToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError || e?.name === "InteractionRequiredAuthError") {
      throw new ErroInteracaoNecessaria();
    }
    if (e instanceof ErroInteracaoNecessaria) throw e;
    throw new ErroApi(`Falha ao renovar a sessao: ${e?.message || "erro desconhecido"}`, {
      codigo: "falha_token",
    });
  }
}

/**
 * chamarApi - GET/POST/PATCH/DELETE em /api/carbon-api<caminho> (relativo, sem env).
 *
 * O metodo precisa existir em ALGUMA rota do carbon-api: o roteador monta
 * METODOS_ACEITOS a partir da propria tabela de rotas, e recusa o que nao estiver
 * la com 405 'metodo_nao_permitido'. DELETE ja e usado por mais de vinte rotas.
 *
 * (Este comentario dizia "apenas estes tres metodos" ate 03/09/2026, quando ja
 * havia DELETE em producao ha semanas. Documentacao desatualizada sobre o que a
 * API aceita custa uma rodada de depuracao em cima da hipotese errada.)
 *
 * @param {string} caminho  Ex.: '/me', '/modulos', '/projetos/<uuid>/pdd'
 * @param {{ instance: object, accounts: array }} msal  Vindo do useMsal()
 * @param {{ metodo?: string, corpo?: any, signal?: AbortSignal }} opcoes
 */
export async function chamarApi(caminho, msal, opcoes = {}) {
  const { metodo = "GET", corpo = null, signal = null } = opcoes;
  const idToken = await obterIdToken(msal);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  // Permite que o chamador (TanStack Query) cancele junto com o proprio timeout.
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });

  const rota = caminho.startsWith("/") ? caminho : `/${caminho}`;

  let resposta;
  try {
    resposta = await fetch(`${caminhoFuncao("carbon-api")}${rota}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: "application/json",
        ...(corpo ? { "Content-Type": "application/json" } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new ErroApi(`A requisicao para ${rota} excedeu ${TIMEOUT_MS / 1000} segundos.`, {
        codigo: "timeout",
      });
    }
    throw new ErroApi(`Falha de rede ao chamar ${rota}.`, { codigo: "falha_rede" });
  } finally {
    clearTimeout(timer);
  }

  // Le o corpo uma unica vez; erros do backend vem como { erro: 'codigo' }.
  let dados = null;
  try {
    const texto = await resposta.text();
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }

  if (!resposta.ok) {
    const codigo = dados?.erro || null;
    throw new ErroApi(mensagemDeErro(codigo, resposta.status, rota), {
      codigo,
      status: resposta.status,
      detalhe: dados?.detalhe ?? null,
    });
  }

  return dados;
}

/**
 * enviarFormData - POST multipart para OUTRA Edge Function que nao a carbon-api.
 *
 * Existe porque o roteador do carbon-api le todo corpo nao-GET como JSON, entao
 * upload de arquivo mora em funcao propria (hoje: carbon-secure-share-upload).
 * O portao de autenticacao e o MESMO: ID token do Azure AD no Authorization.
 *
 * DIFERENCAS EM RELACAO A chamarApi, todas por causa do arquivo:
 *   - sem Content-Type: o navegador precisa montar o boundary do multipart
 *     sozinho. Definir 'multipart/form-data' na mao produz um corpo que o
 *     servidor nao consegue separar;
 *   - sem o timeout de 10s: um envio de 200 MB em rede de escritorio passa
 *     disso com folga. Quem cancela e o `signal` de quem chamou;
 *   - aceita 207, que a funcao de upload usa para "parte subiu, parte nao".
 *
 * @returns {{ status: number, dados: any }} status junto porque 200 e 207 sao
 *          respostas diferentes para a tela, e nao dois sucessos iguais.
 */
export async function enviarFormData(nomeFuncao, msal, formData, { signal = null } = {}) {
  const idToken = await obterIdToken(msal);

  let resposta;
  try {
    resposta = await fetch(caminhoFuncao(nomeFuncao), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: "application/json",
      },
      body: formData,
      signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new ErroApi("O envio foi cancelado.", { codigo: "cancelado" });
    }
    throw new ErroApi(`Falha de rede ao enviar para ${nomeFuncao}.`, { codigo: "falha_rede" });
  }

  let dados = null;
  try {
    const texto = await resposta.text();
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }

  // 207 = envio parcial. Nao e erro: a tela precisa mostrar o que subiu E o que
  // falhou, e transformar isso em throw perderia a lista dos que deram certo.
  if (!resposta.ok && resposta.status !== 207) {
    const codigo = dados?.erro || null;
    throw new ErroApi(mensagemDeErro(codigo, resposta.status, nomeFuncao), {
      codigo,
      status: resposta.status,
    });
  }

  return { status: resposta.status, dados };
}

/**
 * Traduz os codigos do contrato para texto de interface em pt-BR.
 *
 * Os codigos 'nao_autenticado', 'usuario_inativo' e o 'interacao_necessaria' do
 * ErroInteracaoNecessaria tem DONO na UI: o GuardaDeSessao em src/App.jsx observa
 * o cache das queries e troca a arvore por src/pages/AcessoBloqueado.jsx. Estas
 * mensagens sao o fallback (log, console, futuros toasts).
 *
 * Exportada porque os modulos de dominio precisam dela para converter o erro do
 * modo demonstracao no mesmo formato do erro de producao (ver chamarDemo).
 */
export function mensagemDeErro(codigo, status, rota) {
  if (codigo === "nao_autenticado") return "Sessao invalida ou expirada. Entre novamente.";
  if (codigo === "dominio_nao_permitido")
    return "Sua conta nao pertence ao dominio autorizado para o Apsis Carbon.";
  if (codigo === "usuario_inativo")
    return "Seu acesso ao Apsis Carbon esta suspenso. Fale com a equipe responsavel pelo sistema.";

  /* Codigos das rotas de projeto e de PDD. Sao mensagens de INTERFACE: as telas de
     Projetos e de PDD mostram `erro.message` em toast, entao o texto precisa dizer
     o que a pessoa faz a seguir, e nao repetir o codigo tecnico. */
  if (codigo === "sem_permissao")
    return "Seu perfil nao permite criar nem editar projetos. Fale com a equipe responsavel pelo sistema.";
  if (codigo === "nome_obrigatorio") return "Informe o nome do projeto para continuar.";
  if (codigo === "id_invalido") return "O identificador informado nao e valido.";
  if (codigo === "geometria_invalida")
    return "A geometria enviada nao e um GeoJSON valido de Polygon ou MultiPolygon.";
  if (codigo === "status_invalido") return "O status informado para o capitulo nao e valido.";
  /* 'nao_encontrado' cobre DOIS casos de proposito: o registro nao existe, e o registro
     existe mas voce nao participa dele. O texto e deliberadamente o mesmo nos dois. Se a
     mensagem separasse "nao existe" de "sem acesso", a propria tela viraria um oraculo de
     existencia: bastaria varrer identificadores para descobrir quais projetos ha no
     sistema. Nao troque este texto por um mais especifico. */
  if (codigo === "nao_encontrado") return "O registro nao foi encontrado. Ele pode ter sido removido.";

  /* Codigos do painel de equipe do projeto (PATCH /projetos/:id/equipe). Sao os dois
     unicos motivos de recusa que a pessoa consegue resolver sozinha na tela, entao o
     texto diz a acao, e nao so o diagnostico.

     DONO UNICO: e aqui. `atualizarEquipe`, em src/lib/api/projetos.js, chegou a ter um
     mapa MENSAGENS_EQUIPE proprio que sobrescrevia estes textos no catch; ele foi
     apagado justamente para nao existirem dois textos para o mesmo codigo, que
     divergiriam na primeira revisao de copy sem ninguem saber qual a tela mostra.
     Se um dia estes codigos precisarem de texto diferente por rota, mova para o modulo
     de dominio e apague DAQUI, nunca mantenha os dois.

     ACENTUACAO: as mensagens novas vao acentuadas (regra 5 do CLAUDE.md) enquanto as
     antigas deste arquivo nao estao. A inconsistencia e visivel em toast e merece uma
     passada de correcao no arquivo inteiro, em commit proprio - nao propague o erro. */
  if (codigo === "colaborador_externo")
    return "Só é possível incluir na equipe quem tem conta corporativa da APSIS. Confira o endereço digitado e tente de novo.";
  if (codigo === "equipe_vazia")
    return "O projeto precisa de pelo menos uma pessoa na equipe. Inclua outra pessoa antes de remover esta.";

  /* Codigos que a Edge Function tambem produz nas rotas de escrita. Sem traducao
     explicita eles cairiam no fallback generico com o codigo tecnico cru, e o
     'registro_duplicado' em particular e MUITO alcancavel: basta reaproveitar um ID
     de registro que outro projeto ja usa (indice unico parcial em registro_id). */
  if (codigo === "registro_duplicado")
    return "Este ID no registro ja pertence a outro projeto. Confira o numero informado.";
  if (codigo === "periodo_invalido")
    return "O fim do periodo de creditacao nao pode ser anterior ao inicio.";
  if (codigo === "campo_invalido") return "Um dos campos enviados esta fora do formato aceito.";
  /* 'campo_obrigatorio' vem do helper exigir() do roteador. Nenhuma rota atual o
     produz, mas ele existe no contrato para os dominios novos: sem esta linha, a
     primeira tela que usar o helper mostraria o codigo tecnico cru na tela. */
  if (codigo === "campo_obrigatorio") return "Preencha os campos obrigatorios para continuar.";
  if (codigo === "referencia_invalida")
    return "Um dos vinculos informados nao existe mais no sistema.";
  if (codigo === "nada_para_atualizar") return "Nenhuma alteracao foi enviada.";
  if (codigo === "corpo_invalido") return "A requisicao chegou ao servidor em formato invalido.";

  if (codigo) return `O servidor recusou a requisicao (${codigo}).`;
  return `O servidor retornou HTTP ${status} em ${rota}.`;
}

/**
 * Executa a versao demonstracao de uma rota e converte ErroDemo em ErroApi.
 *
 * Sem isso, o modo demo recusaria entrada invalida com um erro de formato diferente
 * do de producao, e a tela teria dois caminhos de tratamento de erro - o do demo
 * (que sempre funciona na revisao) e o real (que ninguem exercita).
 *
 * Todo dataset de demonstracao (src/lib/demo/<dominio>.js) deve lancar um erro com a
 * propriedade `codigo` igual ao codigo do backend, e nunca ErroApi direto: importar
 * ErroApi no dataset criaria ciclo entre o modulo de dados e o modulo de transporte.
 */
export async function chamarDemo(rota, executar) {
  try {
    return await executar();
  } catch (e) {
    const codigo = e?.codigo || null;
    if (!codigo) throw e;
    const status = codigo === "nao_encontrado" ? 404 : 400;
    throw new ErroApi(mensagemDeErro(codigo, status, rota), { codigo, status });
  }
}

/**
 * Segmento de caminho seguro para interpolar em URL de rota.
 *
 * Nunca montar `/projetos/${id}` cru: um valor inesperado (undefined, uma barra, um
 * '..') viraria um caminho torto e uma chamada para uma rota que ninguem escreveu.
 * A Edge Function valida o UUID de novo e responde 400 'id_invalido' quando nao for.
 */
export const cam = (valor) => encodeURIComponent(String(valor ?? ""));

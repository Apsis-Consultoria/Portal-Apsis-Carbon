import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo, enviarFormData, ErroApi } from "@/lib/api/base";
import {
  demoListarProjetos,
  demoObterProjeto,
  demoCriarProjeto,
  demoAtualizarProjeto,
  demoListarArquivos,
  demoCriarCliente,
  demoAtualizarCliente,
  demoRemoverCliente,
  // PONTE TEMPORARIA, e ela precisa morrer. O dataset ficticio ainda chama esta
  // funcao de "enviar acesso", nome do tempo em que o clique gerava senha. Ele
  // vira `demoEnviarConvite` junto com o resto de src/lib/demo/secureshare.js
  // (recalcularSituacao passando a devolver 'sem_convite' no lugar de
  // 'sem_credencial', e senha_definida_em saindo dos registros). Quando isso
  // acontecer, apague o `as` desta linha - e so isto.
  //
  // O import e NOMEADO, e nao `import * as demo`, de proposito: com namespace o
  // Rollup nao consegue provar que nada do modulo e usado em producao e o dataset
  // ficticio inteiro vai para o bundle, junto com nome e e-mail de exemplo. Ver a
  // nota sobre MODO_DEMO em src/lib/runtimeConfig.js.
  demoEnviarAcesso as demoEnviarConvite,
  demoAtualizarEquipe,
  demoDefinirPermissao,
} from "@/lib/demo/secureshare";

/**
 * api/secureshare - Secure Share do Apsis Carbon.
 *
 * Tudo passa pela Edge Function carbon-api. Nao existe aqui, e nao pode existir,
 * chamada direta ao Supabase com service_role nem token do Microsoft Graph: a
 * tela equivalente do Portal Apsis faz as duas coisas do navegador, e e
 * exatamente o que as regras 2 e 10 do CLAUDE.md proibem repetir.
 *
 * SEM SENHA, desde 2026-08-23. O cliente entra digitando o e-mail no portal dele
 * e recebendo um codigo de uso unico. Deste lado nao existe mais gerar, reenviar
 * nem exibir senha: o que existe e o CONVITE, que abre o portao daquele vinculo
 * cliente/projeto. Se voce encontrar a palavra "senha" em algum texto desta tela,
 * e sobra da versao anterior e esta errada.
 *
 * O `if (MODO_DEMO && MODO_DEMO_ATIVO())` fica SEM Boolean() em volta de proposito. Ver a nota longa
 * em src/lib/runtimeConfig.js: com o wrapper, o dataset ficticio inteiro iria
 * para o bundle de producao.
 */

/**
 * Mensagens dos codigos DESTE dominio. Ficam aqui, e nao em src/lib/api/base.js,
 * porque base.js e compartilhado por todos os dominios e estes textos so fazem
 * sentido no Secure Share.
 */
const MENSAGENS = {
  registro_duplicado:
    "Já existe um projeto com este AP/OS e esta empresa. Abra o projeto existente para acrescentar acessos.",
  cliente_interno:
    'E-mail @apsis.com.br não entra como cliente. Adicione a pessoa na seção "Equipe APSIS".',
  colaborador_externo:
    "Na Equipe APSIS só entram e-mails @apsis.com.br. Para dar acesso a alguém de fora, cadastre como cliente.",
  cliente_nao_encontrado:
    "Este e-mail não é cliente deste projeto, então não há permissão para definir.",
  cliente_revogado: "O acesso deste cliente está revogado. Reative antes de enviar o convite.",
  projeto_encerrado: "Este projeto está encerrado. Reabra antes de enviar novos convites.",
  nivel_invalido: "Nível de acesso inválido.",
  periodo_invalido: "O fim do prazo de acesso não pode ser anterior ao início.",

  /* Freios do convite. Existem porque o convite e o e-mail de código saem da MESMA
     caixa remetente: um colega insistindo no botão não é ataque, mas enche a caixa
     do cliente e queima a reputação do remetente, e quem paga é o e-mail de código,
     que é a única porta de entrada do portal.

     Nenhuma das duas cita minutos. O servidor manda o número no `detalhe`, e o
     src/lib/api/base.js monta o ErroApi só com `codigo` e `status`: prometer aqui
     "aguarde N minutos" seria inventar um número que a tela não recebeu. */
  /**
   * Recebe o `detalhe` do backend, que aqui e a quantidade de MINUTOS que ainda
   * faltam (veredito.espere_min, em rotas/secureshare.ts).
   *
   * Vira HORARIO em vez de "espere um pouco", e a diferenca nao e cosmetica:
   * "espere um pouco" faz a pessoa clicar de novo a cada trinta segundos, e cada
   * clique recusado parece defeito. Com a hora na tela ela sabe quando voltar.
   *
   * Arredonda o minuto para CIMA: dizer 16:42 quando o freio solta as 16:42:40
   * produziria mais uma recusa, que e exatamente o que a frase existe para evitar.
   */
  convite_recente: (minutos) => {
    const espera = Number(minutos);
    if (!Number.isFinite(espera) || espera <= 0) {
      // Sem o numero, degrada para a frase antiga em vez de mostrar "Invalid Date".
      return "Um convite para esta pessoa saiu há poucos minutos. Espere um pouco antes de reenviar: o e-mail ainda pode estar a caminho.";
    }
    const quando = new Date(Date.now() + Math.ceil(espera) * 60_000);
    const hora = quando.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `Um convite para esta pessoa saiu há poucos minutos e o e-mail ainda pode estar a caminho. Você poderá reenviar a partir das ${hora}.`;
  },
  teto_diario_convite:
    "Já saíram convites demais para esta pessoa hoje. Tente amanhã, ou confirme por outro canal se o e-mail está chegando.",

  /* Codigos do Microsoft Graph. Sao falhas de INFRAESTRUTURA e a mensagem
     precisa dizer a quem recorrer, porque nao ha nada que o usuario da tela
     possa corrigir sozinho. */
  graph_nao_configurado:
    "A integração com o SharePoint ainda não foi configurada. Fale com a equipe responsável pelo sistema.",
  graph_sem_token:
    "Não foi possível autenticar no SharePoint. Fale com a equipe responsável pelo sistema.",
  sharepoint_sem_permissao:
    "O aplicativo não tem permissão para esta operação no SharePoint. Fale com a equipe responsável pelo sistema.",
  biblioteca_nao_encontrada:
    "A biblioteca do Secure Share não existe no SharePoint. Ela precisa ser criada antes do primeiro envio.",
  sharepoint_nao_encontrado: "A pasta ou o arquivo não foi encontrado no SharePoint.",
  sharepoint_falhou: "O SharePoint recusou a operação. Tente novamente em alguns instantes.",
  pasta_destino_existe:
    "Já existe uma pasta com esse nome no SharePoint. Renomear misturaria os arquivos dos dois cadastros.",
  email_sem_permissao:
    "O sistema não conseguiu enviar o convite. Fale com a equipe responsável pelo sistema.",
  email_falhou: "Não foi possível enviar o convite. Tente novamente.",
};

/* NÃO EXISTE MAIS `email_falhou_senha_trocada`, e a ausência é o ponto.
   Ele existia porque a senha era gravada ANTES do envio: quando o e-mail falhava,
   a senha antiga já tinha morrido e o cliente ficava sem acesso nenhum. No modelo
   sem senha a ordem é conferir, enviar e só então registrar, então um envio que
   falha não deixa marca: o portão continua como estava e a linha aparece em âmbar
   como "Convite não enviado". Não reintroduza o código nem a ordem antiga. */

function traduzir(erro) {
  const entrada = MENSAGENS[erro?.codigo];
  if (!entrada) return erro;
  // Entrada pode ser texto fixo ou funcao do `detalhe`, para os codigos em que a
  // frase util depende de um numero que so o servidor conhece.
  const mensagem = typeof entrada === "function" ? entrada(erro.detalhe) : entrada;
  return new ErroApi(mensagem, {
    codigo: erro.codigo,
    status: erro.status,
    detalhe: erro.detalhe,
  });
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

/* ===== Projetos =========================================================== */

/** GET /secure-share/projetos -> { projetos, total } */
export async function listarProjetos(msal) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo("/secure-share/projetos", () => demoListarProjetos());
  return chamar("/secure-share/projetos", msal);
}

/** GET /secure-share/projetos/:id -> { projeto, clientes, equipe, permissoes, pode_administrar } */
export async function obterProjeto(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/secure-share/projetos/${id}`, () => demoObterProjeto(id));
  }
  return chamar(`/secure-share/projetos/${cam(id)}`, msal);
}

/**
 * POST /secure-share/projetos -> { projeto, aviso_pasta, aviso_convite }
 *
 * `dados.avisar` (booleano, default true no servidor) manda o convite sair junto
 * com o cadastro, um por contato. E o default porque o convite VIROU o portao de
 * acesso: se dependesse de um segundo clique, esquecer nao daria erro nenhum e o
 * cliente ficaria cadastrado, sem acesso e sem ninguem saber.
 *
 * Nenhum dos dois avisos e erro. `aviso_pasta`: o projeto foi criado e a pasta no
 * SharePoint falhou (ela e recriada no primeiro envio de arquivo). `aviso_convite`:
 * o projeto e os contatos foram gravados e algum convite nao saiu. Os dois se
 * mostram em ambar, nunca como falha da criacao - e `aviso_convite` PRECISA ser
 * mostrado, porque contato sem convite e contato sem acesso.
 */
export async function criarProjeto(msal, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) return chamarNoDemo("/secure-share/projetos", () => demoCriarProjeto(dados));
  return chamar("/secure-share/projetos", msal, { metodo: "POST", corpo: dados });
}

/** PATCH /secure-share/projetos/:id -> { projeto } */
export async function atualizarProjeto(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/secure-share/projetos/${id}`, () => demoAtualizarProjeto(id, dados));
  }
  return chamar(`/secure-share/projetos/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/* ===== Arquivos =========================================================== */

/**
 * GET /secure-share/projetos/:id/arquivos?sub= -> { itens, caminho, pasta }
 *
 * Um nivel por chamada, sob demanda. Trazer a arvore inteira de uma pasta de due
 * diligence (milhares de arquivos) travaria a tela e o Graph pagina de 999 em
 * 999 de qualquer forma.
 */
/**
 * Identificador reservado da pasta Geral, no lugar de um uuid de projeto.
 *
 * O MESMO valor em quatro lugares, e eles nao se importam: aqui, em
 * rotas/secureshare.ts (ID_GERAL), em carbon-secure-share-upload/index.ts, e no
 * portal do cliente. Nao e uuid de proposito: nao existe linha de projeto para a
 * Geral, e inventar uma criaria um cliente fantasma nas views de listagem.
 *
 * As funcoes de arquivo e de envio aceitam este id no lugar do id de projeto:
 * `listarArquivos(msal, ID_GERAL)` e `enviarArquivos(msal, ID_GERAL, itens)`.
 */
export const ID_GERAL = "geral";

export async function listarArquivos(msal, id, sub = "") {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/secure-share/projetos/${id}/arquivos`, () =>
      demoListarArquivos(id, sub)
    );
  }
  const consulta = sub ? `?sub=${encodeURIComponent(sub)}` : "";

  /*
   * A GERAL TEM CAMINHO PROPRIO, sem :id. Nao e
   * `/secure-share/projetos/geral/arquivos`: o roteador da Edge Function confere
   * todo parametro de rota contra UUID_RE antes de despachar, entao a palavra
   * "geral" voltava 400 id_invalido sem chegar na rota. Afrouxar aquela
   * conferencia abriria excecao nas rotas de todos os dominios.
   */
  if (id === ID_GERAL) return chamar(`/secure-share/geral/arquivos${consulta}`, msal);

  return chamar(`/secure-share/projetos/${cam(id)}/arquivos${consulta}`, msal);
}

/**
 * Envia arquivos para a pasta do projeto.
 *
 * Vai para a Edge Function carbon-secure-share-upload, e nao para a carbon-api:
 * o roteador da carbon-api le todo corpo nao-GET como JSON, e arquivo e binario.
 *
 * @param {Array<{arquivo: File, subPath?: string}>} itens  `subPath` preserva a
 *        estrutura quando a pessoa arrasta uma PASTA inteira.
 * @param {string} sub  subpasta de destino dentro do projeto ('' = raiz).
 * @returns {{ status, enviados, falhas }} status 207 significa envio PARCIAL:
 *          `falhas` traz arquivo e motivo, um por um.
 */
export async function enviarArquivos(msal, projetoId, itens, { sub = "", signal } = {}) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    // Sem rede no modo demonstracao. Devolvemos o formato real para a tela
    // exercitar o mesmo caminho de sucesso, mas nada e gravado: a arvore
    // ficticia continua a mesma, e o aviso deixa isso claro.
    return {
      status: 200,
      enviados: itens.map(({ arquivo }) => arquivo.name),
      falhas: [],
      demo: true,
    };
  }

  const formulario = new FormData();
  formulario.append("projeto_id", projetoId);
  formulario.append("sub", sub);

  for (const { arquivo, subPath } of itens) {
    formulario.append("arquivo", arquivo, arquivo.name);
    // Um `caminho` por `arquivo`, na MESMA ordem: e assim que o servidor
    // reconstroi a estrutura de pastas arrastada.
    formulario.append("caminho", subPath || "");
  }

  try {
    const { status, dados } = await enviarFormData(
      "carbon-secure-share-upload",
      msal,
      formulario,
      { signal },
    );
    return { status, enviados: dados?.enviados ?? [], falhas: dados?.falhas ?? [] };
  } catch (erro) {
    throw traduzir(erro);
  }
}

/* ===== Clientes =========================================================== */

/**
 * POST /secure-share/projetos/:id/clientes -> { cliente, aviso_convite }
 *
 * `dados.avisar` (booleano, default true no servidor): mesmo raciocinio de
 * criarProjeto. O `cliente` que volta ja foi relido DEPOIS do envio, entao
 * `situacao` e `acesso_enviado` refletem o convite desta mesma requisicao.
 */
export async function criarCliente(msal, projetoId, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/secure-share/projetos/${projetoId}/clientes`, () =>
      demoCriarCliente(projetoId, dados)
    );
  }
  return chamar(`/secure-share/projetos/${cam(projetoId)}/clientes`, msal, {
    metodo: "POST",
    corpo: dados,
  });
}

/** PATCH /secure-share/clientes/:id -> { cliente } */
export async function atualizarCliente(msal, id, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/secure-share/clientes/${id}`, () => demoAtualizarCliente(id, dados));
  }
  return chamar(`/secure-share/clientes/${cam(id)}`, msal, { metodo: "PATCH", corpo: dados });
}

/** DELETE /secure-share/clientes/:id -> { removido: true } */
export async function removerCliente(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/secure-share/clientes/${id}`, () => demoRemoverCliente(id));
  }
  return chamar(`/secure-share/clientes/${cam(id)}`, msal, { metodo: "DELETE" });
}

/**
 * POST /secure-share/clientes/:id/convite -> { enviado, cliente }
 *
 * Envia o convite de primeiro acesso e, com ele, ABRE o portao daquele vinculo
 * cliente/projeto. Enquanto o convite nao sair, o projeto nao entra na sessao de
 * ninguem, mesmo com o cadastro gravado.
 *
 * NAO ENVIA SENHA e nao envia codigo. O convite so diz que o acesso existe e como
 * entrar; o codigo de uso unico sai da Edge Function carbon-ss-codigo, do
 * repositorio secure-share-carbon, a cada tentativa de login. Por isso reenviar e
 * inofensivo do lado do cliente: nao ha segredo trafegando, e nada do que ele ja
 * tinha deixa de valer. O unico custo e a caixa dele, e para esse custo existe o
 * freio (convite_recente e teto_diario_convite).
 *
 * Nome antigo da rota: `/acesso`, que gerava senha nova a cada clique.
 */
export async function enviarConvite(msal, id) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/secure-share/clientes/${id}/convite`, () => demoEnviarConvite(id));
  }
  return chamar(`/secure-share/clientes/${cam(id)}/convite`, msal, { metodo: "POST", corpo: {} });
}

/* AINDA SEM FUNCAO AQUI, de proposito: POST /secure-share/clientes/:id/email.
   A rota existe no servidor porque ela e um CONTROLE, nao uma comodidade: sem
   senha, quem controla a caixa de e-mail controla o acesso, e trocar o endereco
   de um cliente ja liberado por um update comum daria acesso imediato ao novo
   dono, herdando o portao que foi aberto para outra pessoa. A rota fecha o portao
   junto com a troca.

   Nao ha funcao nem botao ainda porque a tela precisaria de confirmacao propria e
   de dataset de demonstracao, e o dataset ficticio vive em src/lib/demo/secureshare.js.
   Ate la o caminho seguro na tela continua sendo remover o cliente e cadastrar de
   novo, que produz exatamente o mesmo efeito (linha nova, portao fechado). */

/* ===== Equipe ============================================================= */

/**
 * PATCH /secure-share/projetos/:id/equipe -> { equipe, nao_encontrados }
 *
 * `nao_encontrados` traz os e-mails que ainda nao tem linha em carbon_usuarios
 * (a linha nasce no primeiro login no Apsis Carbon). Nao e erro: os demais
 * entraram, e a tela avisa quem ficou de fora e por que.
 */
export async function atualizarEquipe(msal, projetoId, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/secure-share/projetos/${projetoId}/equipe`, () =>
      demoAtualizarEquipe(projetoId, dados)
    );
  }
  return chamar(`/secure-share/projetos/${cam(projetoId)}/equipe`, msal, {
    metodo: "PATCH",
    corpo: dados,
  });
}

/* ===== Permissoes ========================================================= */

/**
 * POST /secure-share/projetos/:id/permissoes -> { permissoes }
 *
 * `nivel`: 'total' | 'visualizar' | 'nenhum'. Regra definida numa PASTA vale
 * para todo o conteudo dela, inclusive subpastas e inclusive o ZIP. A heranca e
 * aplicada no banco (carbon_secure_share_nivel_item), nao aqui: implementada no
 * frontend, bastaria pedir o arquivo pelo caminho completo para contornar.
 */
export async function definirPermissao(msal, projetoId, dados) {
  if (MODO_DEMO && MODO_DEMO_ATIVO()) {
    return chamarNoDemo(`/secure-share/projetos/${projetoId}/permissoes`, () =>
      demoDefinirPermissao(projetoId, dados)
    );
  }
  return chamar(`/secure-share/projetos/${cam(projetoId)}/permissoes`, msal, {
    metodo: "POST",
    corpo: dados,
  });
}

/* ===== Utilitarios de tela ================================================ */

/**
 * Mascara do AP/OS: AP-XXXXX/XX-XXX a partir dos digitos.
 *
 * Mesma regra do Portal Apsis (formatApOs), reescrita aqui porque os dois
 * sistemas nao compartilham codigo. Digitando so numeros, a pessoa recebe o
 * formato pronto.
 */
export function formatarApOs(bruto) {
  const digitos = String(bruto ?? "").replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.length <= 5) return `AP-${digitos}`;

  const parte1 = digitos.slice(0, 5);
  const parte2 = digitos.slice(5, 7);
  const parte3 = digitos.slice(7, 10);

  let saida = `AP-${parte1}`;
  if (parte2) saida += `/${parte2}`;
  if (parte3) saida += `-${parte3}`;
  return saida;
}

/** Tamanho legivel de arquivo. */
export function formatarTamanho(bytes) {
  if (bytes === null || bytes === undefined) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Nivel de acesso de um e-mail a um item, considerando a heranca de pasta.
 *
 * Espelha carbon_secure_share_nivel_item para a tela poder PINTAR o estado sem
 * ida ao servidor. Nao e a autorizacao: quem decide e o banco, a cada
 * requisicao de byte. Se as duas divergirem, a do banco vale.
 */
export function nivelDoItem(permissoes, itemPath, email) {
  const alvo = String(email ?? "").toLowerCase();
  const alcanca = (regra) => regra.item_path === itemPath || itemPath.startsWith(`${regra.item_path}/`);

  for (const regra of permissoes ?? []) {
    if (alcanca(regra) && (regra.emails_negados ?? []).includes(alvo)) return "nenhum";
  }
  for (const regra of permissoes ?? []) {
    if (alcanca(regra) && (regra.emails_sem_download ?? []).includes(alvo)) return "visualizar";
  }
  return "total";
}

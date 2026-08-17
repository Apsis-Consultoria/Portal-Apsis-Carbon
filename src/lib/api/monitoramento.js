import { MODO_DEMO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo, ErroApi } from "@/lib/api/base";
import {
  demoObterMonitoramento,
  demoCriarMonitoramentoDoTemplate,
  demoAtualizarCapituloMonitoramento,
  demoNovaRodadaCapitulo,
} from "@/lib/demo/monitoramento";

/**
 * api/monitoramento - rotas do relatorio de monitoramento (issue #3).
 *
 *   GET   /projetos/:id/monitoramento
 *   POST  /projetos/:id/monitoramento        cria os capitulos a partir do template
 *   PATCH /mr-capitulos/:id                  estado, rodada, responsavel, textos
 *   POST  /mr-capitulos/:id/rodada           abre a proxima rodada de revisao
 *
 * Sobre o modo demonstracao e o motivo de o `if (MODO_DEMO)` nao ter Boolean() em volta,
 * ver o cabecalho de src/lib/api/projetos.js: a constante precisa aparecer crua para o
 * Rollup dobrar a condicao e nao levar o dataset de demonstracao para o bundle.
 *
 * Este modulo NAO entra em src/lib/api/indice.js de proposito (o indice existe so por
 * compatibilidade com quem importava do carbonApi; `export *` la arrastaria este dataset
 * de demonstracao para o mesmo pedaco do bundle dos outros dominios). Importe
 * '@/lib/api/monitoramento' direto.
 */

/* ===== Mensagens dos codigos deste dominio ================================
   src/lib/api/base.js traduz os codigos que existiam quando a fundacao foi escrita.
   Os dois codigos abaixo sao deste dominio e cairiam no fallback generico
   ('O servidor recusou a requisicao (rodada_invalida).'), que nao diz a quem le o que
   fazer a seguir. Traduzimos AQUI em vez de editar o base.js, que e arquivo
   compartilhado da fundacao.

   NOTA sobre o status: em producao a recusa de rodada volta como 409 (o pedido esta
   bem formado, o estado do capitulo e que nao permite) e no modo demonstracao o
   chamarDemo usa 400 para tudo que nao e 404. A tela nao decide nada por status, so
   mostra a mensagem, entao a diferenca nao muda comportamento.                */
const MENSAGENS = {
  estado_invalido: "O estado informado para o capítulo não é válido.",
  rodada_invalida:
    "Não é possível abrir uma nova rodada neste capítulo: ele está marcado como não aplicável, ou já alcançou o limite de rodadas.",
};

/**
 * Reescreve a mensagem quando o codigo e deste dominio, preservando codigo e status.
 *
 * Envolve TODAS as chamadas, inclusive as de demonstracao, para o texto ser o mesmo nos
 * dois caminhos - senao a revisao do dono leria uma frase que a producao nunca mostra.
 */
async function comMensagensDoDominio(executar) {
  try {
    return await executar();
  } catch (e) {
    const mensagem = MENSAGENS[e?.codigo];
    if (!mensagem || !(e instanceof ErroApi)) throw e;
    throw new ErroApi(mensagem, { codigo: e.codigo, status: e.status });
  }
}

export async function obterMonitoramento(msal, projetoId) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO) {
      return chamarDemo(`/projetos/${projetoId}/monitoramento`, () =>
        demoObterMonitoramento(projetoId)
      );
    }
    return chamarApi(`/projetos/${cam(projetoId)}/monitoramento`, msal);
  });
}

/**
 * Cria os capitulos do relatorio a partir do template do standard do projeto.
 * Idempotente no backend (funcao SQL carbon_mr_criar_do_template): clicar duas vezes
 * nao duplica capitulo, so devolve criados = 0.
 */
export async function criarMonitoramentoDoTemplate(msal, projetoId) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO) {
      return chamarDemo(`/projetos/${projetoId}/monitoramento`, () =>
        demoCriarMonitoramentoDoTemplate(projetoId)
      );
    }
    // Sem corpo de proposito: o standard vem do proprio projeto, no servidor.
    return chamarApi(`/projetos/${cam(projetoId)}/monitoramento`, msal, { metodo: "POST" });
  });
}

/**
 * Atualiza um capitulo. Campos aceitos: estado, rodada, responsavel_id, orientacao,
 * observacoes. `rodada` aqui e para CORRIGIR uma volta digitada errada; para AVANCAR use
 * avancarRodadaCapitulo, que incrementa no banco.
 */
export async function atualizarCapituloMonitoramento(msal, capituloId, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO) {
      return chamarDemo(`/mr-capitulos/${capituloId}`, () =>
        demoAtualizarCapituloMonitoramento(capituloId, dados)
      );
    }
    return chamarApi(`/mr-capitulos/${cam(capituloId)}`, msal, {
      metodo: "PATCH",
      corpo: dados,
    });
  });
}

/**
 * Abre a proxima rodada de revisao do capitulo: rodada + 1 e estado em_revisao.
 *
 * Sem corpo, e sem a rodada nova calculada aqui: quem soma e o banco, para duas pessoas
 * devolvendo o mesmo capitulo ao mesmo tempo nao perderem uma volta.
 */
export async function avancarRodadaCapitulo(msal, capituloId) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO) {
      return chamarDemo(`/mr-capitulos/${capituloId}/rodada`, () =>
        demoNovaRodadaCapitulo(capituloId)
      );
    }
    return chamarApi(`/mr-capitulos/${cam(capituloId)}/rodada`, msal, { metodo: "POST" });
  });
}

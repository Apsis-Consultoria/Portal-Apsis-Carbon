import { MODO_DEMO, MODO_DEMO_ATIVO } from "@/lib/runtimeConfig";
import { cam, chamarApi, chamarDemo, ErroApi } from "@/lib/api/base";
import {
  demoCancelarTeams,
  demoCriarTeams,
  demoDiagnosticoTeams,
  demoOcorrenciasTeams,
  demoAtualizarTeams,
} from "@/lib/demo/reunioesteams";

/**
 * api/reunioesteams - integração das reuniões com o Microsoft Teams.
 *
 *   GET    /reunioes-teams/diagnostico        a permissão está concedida?
 *   POST   /reunioes/:id/teams                cria o evento com convites
 *   PATCH  /reunioes/:id/teams                altera (a série inteira)
 *   DELETE /reunioes/:id/teams                cancela e avisa os convidados
 *   GET    /reunioes/:id/teams/ocorrencias    ocorrências da série
 *
 * MÓDULO SEPARADO de api/reunioes.js de propósito: esta é a única parte da tela
 * que depende de um sistema externo e que pode estar indisponível por falta de
 * permissão. Separar deixa o modo degradado explícito - a tela de Reuniões
 * funciona inteira sem o Teams, e o Teams é um acréscimo que pode faltar.
 *
 * Sobre o `if (MODO_DEMO && MODO_DEMO_ATIVO())` sem Boolean() em volta, ver o
 * cabeçalho de src/lib/api/projetos.js: a constante precisa aparecer crua para o
 * Rollup dobrar a condição e não levar o dataset de demonstração para o bundle.
 *
 * Este módulo NÃO entra em src/lib/api/indice.js (ver o cabeçalho de lá).
 */

/* ===== Mensagens dos códigos deste domínio ================================
   O fallback genérico do base.js diria "O servidor recusou a requisição
   (calendario_sem_permissao)", que não diz a quem lê o que fazer. Estes textos
   dizem, inclusive de quem depende a solução.                               */
const MENSAGENS = {
  calendario_sem_permissao:
    "A integração com o Teams ainda não foi liberada. É preciso conceder a permissão Calendars.ReadWrite ao aplicativo no Azure, com o consentimento do administrador.",
  calendario_indisponivel:
    "O Microsoft Teams não respondeu. Tente de novo em alguns instantes; se continuar, avise a equipe responsável pelo sistema.",
  reuniao_ja_tem_teams:
    "Esta reunião já tem um evento no Teams. Cancele o atual antes de criar outro.",
  reuniao_sem_teams:
    "Esta reunião ainda não tem evento no Teams.",
  fim_antes_do_inicio: "O horário de término precisa ser depois do de início.",
  hora_invalida: "Informe o horário no formato HH:MM.",
  participante_invalido: "Há um endereço de e-mail inválido na lista de participantes.",
  frequencia_invalida: "A repetição precisa ser nenhuma, diária, semanal ou mensal.",
  nada_para_atualizar: "Nenhum campo foi alterado.",
};

async function comMensagensDoDominio(executar) {
  try {
    return await executar();
  } catch (e) {
    const mensagem = MENSAGENS[e?.codigo];
    if (!mensagem || !(e instanceof ErroApi)) throw e;
    throw new ErroApi(mensagem, { codigo: e.codigo, status: e.status });
  }
}

/**
 * Diz se o portal consegue criar reunião no Teams.
 *
 * A tela chama isto ANTES de mostrar o botão de criar. Sem essa checagem, a
 * pessoa preencheria o formulário inteiro, escolheria os convidados e só então
 * descobriria que a permissão não existe - e o erro pareceria defeito do
 * sistema, não configuração pendente no Azure.
 */
export async function diagnosticoTeams(msal) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo("/reunioes-teams/diagnostico", () => demoDiagnosticoTeams());
    }
    return chamarApi("/reunioes-teams/diagnostico", msal);
  });
}

/**
 * Cria o evento no Teams para uma reunião que já existe no portal.
 *
 * `dados`: { hora_inicio: 'HH:MM', hora_fim: 'HH:MM', participantes: [...],
 *            descricao, recorrencia: { frequencia, dias, intervalo, ate } }
 *
 * A DATA não vai aqui: ela é a da reunião no portal, e o servidor a usa. Mandar
 * data por fora abriria a porta para o evento do Teams cair num dia diferente do
 * registro que o originou.
 */
export async function criarReuniaoTeams(msal, reuniaoId, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/reunioes/${reuniaoId}/teams`, () => demoCriarTeams(reuniaoId, dados));
    }
    return chamarApi(`/reunioes/${cam(reuniaoId)}/teams`, msal, { metodo: "POST", corpo: dados });
  });
}

/**
 * Altera o evento. Numa série, altera a SÉRIE INTEIRA.
 *
 * ATENÇÃO com `participantes`: a lista SUBSTITUI a anterior, porque é assim que
 * o Graph funciona - não existe "acrescentar participante". Mandar uma lista
 * parcial remove quem ficou de fora, e essas pessoas recebem um cancelamento.
 * A tela precisa enviar sempre a lista completa.
 */
export async function atualizarReuniaoTeams(msal, reuniaoId, dados) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/reunioes/${reuniaoId}/teams`, () => demoAtualizarTeams(reuniaoId, dados));
    }
    return chamarApi(`/reunioes/${cam(reuniaoId)}/teams`, msal, { metodo: "PATCH", corpo: dados });
  });
}

/**
 * Cancela o evento no Teams e avisa os convidados.
 *
 * NÃO apaga a reunião do portal nem a ata: são coisas diferentes. O registro e o
 * histórico continuam; o que sai da agenda é o convite.
 */
export async function cancelarReuniaoTeams(msal, reuniaoId) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/reunioes/${reuniaoId}/teams`, () => demoCancelarTeams(reuniaoId));
    }
    return chamarApi(`/reunioes/${cam(reuniaoId)}/teams`, msal, { metodo: "DELETE" });
  });
}

/** Ocorrências da série, numa janela (padrão: 180 dias a partir da reunião). */
export async function ocorrenciasTeams(msal, reuniaoId, { de = null, ate = null } = {}) {
  return comMensagensDoDominio(() => {
    if (MODO_DEMO && MODO_DEMO_ATIVO()) {
      return chamarDemo(`/reunioes/${reuniaoId}/teams/ocorrencias`, () =>
        demoOcorrenciasTeams(reuniaoId)
      );
    }
    const busca = new URLSearchParams();
    if (de) busca.set("de", de);
    if (ate) busca.set("ate", ate);
    const qs = busca.toString();
    return chamarApi(
      `/reunioes/${cam(reuniaoId)}/teams/ocorrencias${qs ? `?${qs}` : ""}`,
      msal
    );
  });
}

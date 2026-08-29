/**
 * rascunhoOffline - a caixa de saída dos questionários de campo.
 *
 * POR QUE ELE EXISTE. Os formulários são aplicados em aldeia, no meio da
 * Amazônia, onde o sinal cai no meio do preenchimento. Sem isto, a pessoa
 * responde quarenta perguntas, o salvamento falha e some tudo - e ela descobre
 * só quando volta ao acampamento. É o defeito mais caro que esta tela pode ter,
 * porque a visita não se repete.
 *
 * Aqui cada resposta é gravada no aparelho ANTES de tentar a rede. Se a rede
 * falhar, o que foi digitado continua no aparelho e é reenviado sozinho quando
 * o sinal volta, ou na próxima vez que a tela abrir.
 *
 * SOBRE A REGRA 1 DO CLAUDE.md ("nada de estado persistido só no frontend").
 * Isto não é exceção a ela, é o caso que ela não cobre. O banco continua sendo
 * a única fonte de verdade: o que está aqui é uma FILA DE ENVIO, existe para
 * ser esvaziada, e o registro só é considerado salvo quando o servidor confirma.
 * A tela nunca lê daqui para exibir dado que o servidor já tem - só para não
 * perder o que ainda não conseguiu mandar.
 *
 * POR QUE localStorage E NÃO IndexedDB. O que se guarda são respostas de texto e
 * escolha, alguns kilobytes por questionário. IndexedDB seria a escolha certa
 * para os anexos (foto e vídeo), que ainda não existem neste sistema; para
 * texto, ele acrescenta assincronia e um esquema de versão sem devolver nada.
 * Quando o upload de arquivo entrar, a fila dele nasce em IndexedDB e esta aqui
 * continua como está.
 *
 * NÃO É sessionStorage: a sessão morre ao fechar a aba, e fechar a aba sem
 * querer é exatamente uma das formas de perder o trabalho de campo.
 */

const PREFIXO = 'carbonRascunho:';

/** Quantos dias uma pendência sobrevive antes de ser considerada lixo. */
const VALIDADE_DIAS = 30;

function chaveDe(id) {
  return `${PREFIXO}${id}`;
}

function armazem() {
  try {
    // Navegador em modo privado pode ter localStorage que lança ao escrever.
    // Detectar aqui evita derrubar a tela inteira num acesso de leitura.
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Guarda o que ainda não foi confirmado pelo servidor.
 *
 * `pendente: true` marca que existe alteração por enviar. Depois que o servidor
 * confirma, quem chama usa `confirmar()` e a entrada some.
 */
export function guardar(id, dados) {
  const ls = armazem();
  if (!ls || !id) return false;
  try {
    ls.setItem(
      chaveDe(id),
      JSON.stringify({ id, dados, em: new Date().toISOString(), pendente: true }),
    );
    return true;
  } catch (e) {
    // QuotaExceeded é o caso real: aparelho de campo com armazenamento cheio.
    // Falhar aqui em silêncio seria pior do que avisar quem chamou, porque a
    // tela mostraria "guardado no aparelho" sem nada estar guardado.
    console.error('[rascunhoOffline] não foi possível guardar:', e?.name || e);
    return false;
  }
}

/** O que está guardado para este questionário, ou null. */
export function ler(id) {
  const ls = armazem();
  if (!ls || !id) return null;
  try {
    const cru = ls.getItem(chaveDe(id));
    if (!cru) return null;
    const item = JSON.parse(cru);

    // Pendência velha demais provavelmente é de um aparelho que ninguém mais
    // usa para aquele questionário. Reenviar isso por cima do que já foi
    // corrigido no servidor seria pior do que descartar.
    const idade = Date.now() - new Date(item.em).getTime();
    if (Number.isFinite(idade) && idade > VALIDADE_DIAS * 86400000) {
      ls.removeItem(chaveDe(id));
      return null;
    }
    return item;
  } catch {
    // Conteúdo corrompido não pode travar a abertura da tela.
    try { ls.removeItem(chaveDe(id)); } catch { /* nada a fazer */ }
    return null;
  }
}

/** O servidor confirmou: a pendência deixa de existir. */
export function confirmar(id) {
  const ls = armazem();
  if (!ls || !id) return;
  try { ls.removeItem(chaveDe(id)); } catch { /* nada a fazer */ }
}

/**
 * Joga fora a pendência sem o servidor ter confirmado nada.
 *
 * Mesma operação que `confirmar`, nome diferente porque o motivo é outro e o
 * motivo é o que se lê no lugar da chamada: aqui o questionário foi APAGADO. Sem
 * isto, a cópia órfã continuaria no aparelho e a caixa de saída tentaria
 * reenviar um registro que não existe mais, ressuscitando na lista o que a
 * pessoa acabou de apagar.
 */
export function descartar(id) {
  confirmar(id);
}

/** Todas as pendências, para a tela de lista avisar que há coisa por enviar. */
export function listarPendentes() {
  const ls = armazem();
  if (!ls) return [];
  const saida = [];
  for (let i = 0; i < ls.length; i += 1) {
    const chave = ls.key(i);
    if (!chave || !chave.startsWith(PREFIXO)) continue;
    const item = ler(chave.slice(PREFIXO.length));
    if (item?.pendente) saida.push(item);
  }
  return saida;
}

/**
 * Diz se a falha foi de REDE, e não de regra.
 *
 * A distinção decide o que fazer: falha de rede vira pendência para reenviar
 * depois; recusa do servidor (400, 409) é erro de conteúdo, e insistir em
 * reenviar seria repetir para sempre uma requisição que nunca vai passar.
 *
 * `status` ausente é o caso do fetch que nem chegou a ter resposta - sem sinal,
 * DNS falhando, timeout. É exatamente a situação de campo.
 */
export function ehFalhaDeRede(erro) {
  if (!erro) return false;
  if (erro.codigo === 'falha_rede' || erro.codigo === 'timeout') return true;
  if (typeof erro.status === 'number') return erro.status >= 500;
  return erro.status === null || erro.status === undefined;
}

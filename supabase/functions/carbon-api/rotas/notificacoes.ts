// -----------------------------------------------------------------------------
// Rota /notificacoes - avisos do sistema visiveis para o colaborador.
// -----------------------------------------------------------------------------
// GET carbon-api/notificacoes -> { notificacoes: [...] }

import { respostaErro, respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';

const LIMITE_NOTIFICACOES = 20;

/**
 * Notificacoes visiveis para o colaborador: nao expiradas e destinadas a todos
 * (email_destino null) ou a ele.
 *
 * Os dois .or() sao combinados com AND pelo PostgREST (cada parametro or= e uma
 * condicao independente). O e-mail e interpolado no filtro com seguranca porque
 * o azureAuth ja o validou contra uma regex que proibe virgula e parenteses,
 * que sao os metacaracteres da sintaxe de filtro do PostgREST.
 */
async function listar(ctx: Contexto): Promise<Response> {
  const agora = new Date().toISOString();

  const { data, error } = await ctx.admin
    .from('carbon_notificacoes')
    .select('id, tipo, titulo, descricao, acao, criado_em')
    .or(`expira_em.is.null,expira_em.gt.${agora}`)
    .or(`email_destino.is.null,email_destino.eq.${ctx.usuario.email}`)
    .order('criado_em', { ascending: false })
    .limit(LIMITE_NOTIFICACOES);

  if (error) {
    console.error('Falha ao ler carbon_notificacoes:', error.message);
    return respostaErro('erro_interno', 500);
  }

  return respostaJson({ notificacoes: data ?? [] });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'notificacoes', escrita: false, handler: listar },
];

// -----------------------------------------------------------------------------
// Rota /modulos - cards e itens de menu liberados para o colaborador.
// -----------------------------------------------------------------------------
// GET carbon-api/modulos -> { modulos: [...] }

import { respostaErro, respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';

/**
 * Modulos ATIVOS e LIBERADOS para este colaborador, na ordem de exibicao.
 *
 * O inner join com carbon_usuario_modulos e obrigatorio: sem ele qualquer
 * colaborador do dominio veria todos os modulos cadastrados, inclusive material
 * sensivel (pericia, litigio sob segredo de justica), e a tabela de autorizacao
 * seria decoracao. Liberar um modulo passa a ser sempre um INSERT em
 * carbon_usuario_modulos - inclusive para admins.
 *
 * Sem liberacao nenhuma a lista volta vazia, e o frontend mostra o estado vazio
 * elegante: nao e erro.
 */
async function listar(ctx: Contexto): Promise<Response> {
  const { data, error } = await ctx.admin
    .from('carbon_modulos')
    .select(
      'chave, label, descricao, icone, rota, url_externa, accent, ordem, carbon_usuario_modulos!inner(usuario_id)',
    )
    .eq('ativo', true)
    .eq('carbon_usuario_modulos.usuario_id', ctx.registro.id)
    .order('ordem', { ascending: true })
    .order('label', { ascending: true });

  if (error) {
    console.error('Falha ao ler carbon_modulos:', error.message);
    return respostaErro('erro_interno', 500);
  }

  // A coluna do join existe apenas para filtrar: nao faz parte do contrato da
  // resposta, entao sai do payload antes de ir para o navegador.
  const modulos = ((data ?? []) as Record<string, unknown>[]).map((linha) => {
    const copia = { ...linha };
    delete copia.carbon_usuario_modulos;
    return copia;
  });

  return respostaJson({ modulos });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'modulos', escrita: false, handler: listar },
];

// -----------------------------------------------------------------------------
// Rota /me - perfil do colaborador autenticado.
// -----------------------------------------------------------------------------
// GET carbon-api/me -> { email, nome, papel, ativo }
//
// Nao consulta o banco: o registro de carbon_usuarios ja foi resolvido pelo
// index.ts (garantirUsuario) para TODAS as rotas, e repetir a consulta aqui seria
// um round trip a mais para devolver o que ja esta em memoria.

import { respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';

export const rotas: Rota[] = [
  {
    metodo: 'GET',
    padrao: 'me',
    escrita: false,
    handler: (ctx: Contexto) =>
      Promise.resolve(
        respostaJson({
          email: ctx.registro.email,
          nome: ctx.registro.nome,
          papel: ctx.registro.papel,
          ativo: ctx.registro.ativo,
        }),
      ),
  },
];

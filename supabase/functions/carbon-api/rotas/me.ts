// -----------------------------------------------------------------------------
// Rota /me - perfil do colaborador autenticado.
// -----------------------------------------------------------------------------
// GET carbon-api/me -> { email, nome, papel, ativo, cargo_id, areas }
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
          cargo_id: ctx.registro.cargo_id ?? null,
          /*
           * As areas vao para o frontend ESCONDER menu, e nada alem disso. Quem
           * autoriza e o portao do index.ts, que confere a area da rota a cada
           * requisicao: esconder no menu e conveniencia, e um item escondido
           * continua recusado no servidor se alguem digitar a URL.
           *
           * A ordem inversa - filtrar so no frontend - e o erro classico, e o
           * CLAUDE.md global ja proibe ("autorizacao sempre server side; nunca
           * dependa de filtro feito no frontend").
           */
          areas: ctx.registro.areas,
        }),
      ),
  },
];

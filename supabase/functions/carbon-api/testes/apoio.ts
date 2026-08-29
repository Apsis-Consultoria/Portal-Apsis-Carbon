// -----------------------------------------------------------------------------
// Apoio dos testes do carbon-api: um cliente Supabase falso que GRAVA a consulta.
// -----------------------------------------------------------------------------
// POR QUE UM DUBLE E NAO UM BANCO: nao ha Postgres nem Docker nesta maquina, e o
// que precisa ser provado aqui nao e o comportamento do Postgres - e o da NOSSA
// camada. As perguntas sao: o portao entrou na consulta? Ele vale no detalhe e nao
// so na lista? Erro de banco vira 500 ou vira lista vazia?
//
// Essas perguntas se respondem inspecionando a consulta MONTADA, e um duble
// responde melhor que um banco: com banco de verdade, um portao que existisse
// apenas na lista passaria no teste sempre que o dado de teste fosse pequeno.
//
// O QUE ESTE DUBLE NAO PROVA, e precisa ficar escrito para ninguem se enganar:
//   - que a trigger carbon_projetos_equipe_autor_trg funciona;
//   - que a FK, o backfill e a RLS da migration fazem o que dizem;
//   - que o PostgREST traduz `carbon_projeto_equipe!inner(...)` no join esperado.
// Os tres exigem Postgres. Ficam para quando houver Docker, ou para a verificacao
// manual descrita no fim de docs/contrato-api.md.

import { respostaErro } from '../../_shared/cors.ts';
import { ErroRota } from '../rotas/helpers.ts';
import type { Contexto, RegistroUsuario, Rota } from '../rotas/tipos.ts';

/** Uma chamada registrada: o metodo do builder e os argumentos que recebeu. */
export type Passo = { metodo: string; args: unknown[] };

/** O que o duble deve devolver quando a consulta for aguardada. */
export type Resposta = { data?: unknown; error?: { message: string } | null };

/**
 * Resultado de uma consulta montada, para o teste inspecionar.
 *
 * `tabela` e o argumento de .from(); `passos` e a cadeia inteira em ordem.
 */
export type Consulta = { tabela: string; passos: Passo[] };

/**
 * Builder falso. Toda chamada desconhecida devolve o proprio builder, para a
 * cadeia continuar; o resultado so materializa no await (ele e "thenable").
 *
 * Aceita respostas em FILA: o primeiro await consome a primeira resposta. E o que
 * permite testar handlers que fazem varias consultas em sequencia, como
 * atualizarEquipe, sem o teste precisar saber a ordem interna de cor.
 */
function criarBuilder(consulta: Consulta, fila: Resposta[]): unknown {
  const alvo = {
    then(resolver: (r: Resposta) => unknown, rejeitar?: (e: unknown) => unknown) {
      const proxima = fila.shift() ?? { data: null, error: null };
      try {
        return Promise.resolve(resolver({ data: null, error: null, ...proxima }));
      } catch (e) {
        return rejeitar ? Promise.resolve(rejeitar(e)) : Promise.reject(e);
      }
    },
  };

  return new Proxy(alvo, {
    get(destino, prop) {
      if (prop === 'then') return destino.then;
      return (...args: unknown[]) => {
        consulta.passos.push({ metodo: String(prop), args });
        return criarBuilder(consulta, fila);
      };
    },
  });
}

export type Duble = {
  admin: unknown;
  /** Consultas montadas, em ordem de .from(). */
  consultas: Consulta[];
  /** Chamadas a .rpc(nome, args). */
  rpcs: { nome: string; args: unknown }[];
};

/**
 * Cria o cliente falso.
 *
 * @param respostas fila consumida a cada await. Vazio devolve { data: null }.
 * @param respostasRpc fila propria do .rpc().
 */
export function criarDuble(respostas: Resposta[] = [], respostasRpc: Resposta[] = []): Duble {
  const consultas: Consulta[] = [];
  const rpcs: { nome: string; args: unknown }[] = [];
  const fila = [...respostas];
  const filaRpc = [...respostasRpc];

  const admin = {
    from(tabela: string) {
      const consulta: Consulta = { tabela, passos: [] };
      consultas.push(consulta);
      return criarBuilder(consulta, fila);
    },
    rpc(nome: string, args: unknown) {
      rpcs.push({ nome, args });
      const proxima = filaRpc.shift() ?? { data: null, error: null };
      return Promise.resolve({ data: null, error: null, ...proxima });
    },
  };

  return { admin, consultas, rpcs };
}

/** Registro de colaborador para os testes. Nome e e-mail ficticios (LGPD). */
export function registro(papel: string, id = 'u-1'): RegistroUsuario {
  return { id, email: `pessoa.${id}@apsis.com.br`, nome: null, papel, ativo: true };
}

/** Monta um Contexto completo em cima do duble. */
export function contexto(
  duble: Duble,
  opcoes: {
    papel?: string;
    id?: string;
    params?: Record<string, string>;
    corpo?: Record<string, unknown> | null;
    url?: string;
  } = {},
): Contexto {
  const reg = registro(opcoes.papel ?? 'colaborador', opcoes.id ?? 'u-1');
  return {
    registro: reg,
    usuario: { email: reg.email, nome: 'Pessoa de Teste' },
    // deno-lint-ignore no-explicit-any
    admin: duble.admin as any,
    params: opcoes.params ?? {},
    corpo: opcoes.corpo ?? null,
    url: new URL(opcoes.url ?? 'https://exemplo.test/carbon-api/projetos'),
    dominio: 'apsis.com.br',
  };
}

/** Acha o handler de uma rota pelo metodo e padrao. Falha alto se nao existir. */
export function handler(rotas: Rota[], metodo: string, padrao: string) {
  const achada = rotas.find((r) => r.metodo === metodo && r.padrao === padrao);
  if (!achada) throw new Error(`Rota nao registrada: ${metodo} ${padrao}`);
  return achada.handler;
}

/** Junta a cadeia de uma consulta num texto, para assercao legivel na falha. */
export function resumir(consulta: Consulta): string {
  const cadeia = consulta.passos
    .map((p) => `${p.metodo}(${p.args.map((a) => JSON.stringify(a)).join(', ')})`)
    .join('.');
  return `${consulta.tabela}.${cadeia}`;
}

/** Le o corpo JSON de uma Response. */
export async function corpoDe(resposta: Response): Promise<Record<string, unknown>> {
  const texto = await resposta.text();
  return texto ? JSON.parse(texto) : {};
}

/**
 * Chama um handler pelo MESMO caminho do sistema real.
 *
 * Handler de rota nao devolve resposta de erro: ele LANCA ErroRota, e quem
 * traduz para HTTP e o catch do index.ts. Um teste que chamasse o handler cru
 * veria a excecao subir e concluiria que a rota "quebrou", quando ela fez
 * exatamente o certo. Repetimos aqui a mesma traducao, e nada alem dela.
 */
export async function chamar(
  handlerDaRota: (ctx: Contexto) => Promise<Response>,
  ctx: Contexto,
): Promise<Response> {
  try {
    return await handlerDaRota(ctx);
  } catch (e) {
    if (e instanceof ErroRota) return respostaErro(e.codigo, e.status, e.detalhe);
    throw e;
  }
}

// -----------------------------------------------------------------------------
// Edge Function: carbon-api
// -----------------------------------------------------------------------------
// Este arquivo e SO a composicao: CORS, portao de metodo, roteamento,
// autenticacao, resolucao do colaborador, portao de escrita e conversao de erro.
// Nenhuma regra de negocio mora aqui. As rotas vivem em rotas/<dominio>.ts e
// entram pelo rotas/indice.ts.
//
// Rotas publicadas hoje (ver o cabecalho de cada modulo para o contrato completo):
//   GET   carbon-api/me                  rotas/me.ts
//   GET   carbon-api/modulos             rotas/modulos.ts
//   GET   carbon-api/notificacoes        rotas/notificacoes.ts
//   GET   carbon-api/projetos            rotas/projetos.ts
//   POST  carbon-api/projetos            rotas/projetos.ts
//   GET   carbon-api/projetos/:id        rotas/projetos.ts
//   PATCH carbon-api/projetos/:id        rotas/projetos.ts
//   GET   carbon-api/projetos/:id/pdd    rotas/pdd.ts
//   POST  carbon-api/projetos/:id/pdd    rotas/pdd.ts
//   PATCH carbon-api/pdd-capitulos/:id   rotas/pdd.ts
//
// Exige:
//   Authorization: Bearer <ID token do Azure AD>
//   apikey: <anon key do projeto>
//
// verify_jwt = false em supabase/config.toml porque o token do Authorization e da
// MICROSOFT, nao do Supabase Auth. A autenticacao real acontece aqui, em
// _shared/azureAuth.ts, contra o JWKS oficial do tenant. Somente DEPOIS de o
// token passar por assinatura, issuer, audience, tid e dominio corporativo o
// codigo toca o banco com o client de servidor.
//
// Erros padronizados:
//   400 { erro: 'id_invalido' }              :id fora do formato uuid
//   400 { erro: 'corpo_invalido' }           corpo da requisicao nao e objeto JSON
//   400 { erro: 'campo_obrigatorio', detalhe } campo exigido ausente (helper exigir)
//   400 { erro: 'nome_obrigatorio' }         POST /projetos sem nome
//   400 { erro: 'status_invalido' }          status_registro ou status de capitulo fora do enum
//   400 { erro: 'campo_invalido', detalhe }  detalhe = nome do campo recusado
//   400 { erro: 'periodo_invalido' }         fim do periodo de creditacao antes do inicio
//   400 { erro: 'referencia_invalida' }      responsavel_id (ou outra FK) inexistente
//   400 { erro: 'nada_para_atualizar' }      PATCH sem nenhum campo da lista branca
//   400 { erro: 'geometria_invalida' }       GeoJSON malformado ou recusado pelo PostGIS
//   401 { erro: 'nao_autenticado' }
//   403 { erro: 'dominio_nao_permitido' }
//   403 { erro: 'usuario_inativo' }          colaborador com carbon_usuarios.ativo = false
//   403 { erro: 'sem_permissao' }            escrita sem papel admin ou gestor
//   404 { erro: 'nao_encontrado' }           id valido que nao existe
//   404 { erro: 'rota_desconhecida' }
//   405 { erro: 'metodo_nao_permitido' }
//   409 { erro: 'registro_duplicado' }       registro_id ja usado por outro projeto
//   413 { erro: 'geometria_invalida' }       GeoJSON acima do limite aceito
//   500 { erro: 'config_indisponivel' | 'config_incompleta' | 'erro_interno' }

import { respostaErro, tratarOptions } from '../_shared/cors.ts';
import { obterAdmin } from '../_shared/supabaseAdmin.ts';
import { validarTokenAzure } from '../_shared/azureAuth.ts';
import type { ConfigApp, ConfigAzure } from '../_shared/azureAuth.ts';

import { TODAS_AS_ROTAS } from './rotas/indice.ts';
import type { Contexto, MetodoRota, RegistroUsuario, Rota, Usuario } from './rotas/tipos.ts';
import { ErroRota, lerCorpo, UUID_RE } from './rotas/helpers.ts';

const NOME_FUNCAO = 'carbon-api';

/**
 * Papeis que podem escrever. Regra INICIAL e deliberadamente grossa: qualquer
 * colaborador ativo do dominio le, so admin e gestor escrevem. O refinamento por
 * projeto (quem participa de qual projeto) entra quando existir a issue de
 * permissao por projeto; antes disso nao vale inventar um modelo intermediario.
 *
 * PENDENCIA CONHECIDA, VALE PARA A LEITURA (nao e "definitivo por decisao"):
 * garantirUsuario faz upsert a cada requisicao e carbon_usuarios nasce com papel
 * 'colaborador' e ativo = true, portanto QUALQUER conta do tenant que fizer o
 * primeiro login passa a ler /projetos e /projetos/:id/pdd - nome, proponente,
 * registro_id, areas, periodo de creditacao e a geometria em GeoJSON de todos os
 * projetos. Isso e mais frouxo do que /modulos, que exige linha em
 * carbon_usuario_modulos justamente para material sensivel nao vazar para o
 * dominio inteiro. Foi aceito para a entrega inicial (a base ainda esta vazia e
 * sem projeto real), mas precisa de portao antes de entrar dado de cliente:
 * liberacao explicita por modulo ou equipe por projeto. Registrado como pendencia
 * no contexto do projeto.
 */
const PAPEIS_ESCRITA = new Set(['admin', 'gestor']);

// -----------------------------------------------------------------------------
// Roteamento
// -----------------------------------------------------------------------------

type Segmento = { param: string | null; literal: string };

type RotaCompilada = {
  rota: Rota;
  segmentos: Segmento[];
  quantidadeParams: number;
};

/** Quebra 'projetos/:id/pdd' em segmentos literais e parametros. */
function compilar(rota: Rota): RotaCompilada {
  const segmentos = rota.padrao
    .split('/')
    .filter(Boolean)
    .map((parte) =>
      parte.startsWith(':')
        ? { param: parte.slice(1), literal: '' }
        : { param: null, literal: parte }
    );

  return {
    rota,
    segmentos,
    quantidadeParams: segmentos.filter((s) => s.param !== null).length,
  };
}

/**
 * Rotas compiladas UMA vez por isolate, das mais especificas para as menos.
 *
 * Menos parametros primeiro: se algum dia existirem 'projetos/arquivadas' e
 * 'projetos/:id' juntas, a literal tem que ganhar, senao 'arquivadas' seria
 * tratado como id e recusado como uuid invalido.
 */
const ROTAS_COMPILADAS: RotaCompilada[] = TODAS_AS_ROTAS
  .map(compilar)
  .sort((a, b) => a.quantidadeParams - b.quantidadeParams);

/**
 * Metodos aceitos, derivados das rotas registradas.
 *
 * Derivar em vez de fixar garante que uma rota DELETE de um dominio novo passe a
 * ser aceita (e anunciada no preflight) sem ninguem lembrar de editar duas
 * constantes. A ordem da lista e fixa para o cabecalho ficar estavel.
 */
const ORDEM_METODOS: MetodoRota[] = ['GET', 'POST', 'PATCH', 'DELETE'];
const METODOS_ACEITOS = new Set<string>(TODAS_AS_ROTAS.map((r) => r.metodo));
const CABECALHO_METODOS = [
  ...ORDEM_METODOS.filter((m) => METODOS_ACEITOS.has(m)),
  'OPTIONS',
].join(', ');

/**
 * Extrai a rota depois do nome da funcao. O pathname chega como
 * /functions/v1/carbon-api/modulos em producao e pode variar em ambiente local,
 * por isso ancoramos no nome da funcao em vez de contar segmentos.
 */
function extrairRota(url: URL): string {
  const segmentos = url.pathname.split('/').filter(Boolean);
  const indice = segmentos.lastIndexOf(NOME_FUNCAO);
  if (indice === -1) return '';
  return segmentos.slice(indice + 1).join('/');
}

type Casamento =
  | { ok: true; rota: Rota; params: Record<string, string> }
  | { ok: false; codigo: string; status: number };

/**
 * Casa metodo + caminho com uma rota registrada.
 *
 * Roda ANTES da autenticacao de proposito: caminho que nao existe, metodo que nao
 * existe e :id fora do formato uuid sao recusados sem gastar uma validacao de JWKS
 * (busca de chaves na Microsoft) nem uma consulta ao banco. Nada disso depende de
 * quem esta chamando, entao nao ha informacao vazada ao recusar antes.
 *
 * A ordem das checagens tambem e preservada: caminho conhecido com metodo errado e
 * 405 metodo_nao_permitido; caminho desconhecido e 404 rota_desconhecida; e o
 * uuid so e conferido depois de o metodo casar.
 */
function casarRota(metodo: string, caminho: string): Casamento {
  const partes = caminho.split('/').filter(Boolean);

  let caminhoCasou = false;
  let escolhida: { rota: Rota; params: Record<string, string> } | null = null;

  for (const compilada of ROTAS_COMPILADAS) {
    if (compilada.segmentos.length !== partes.length) continue;

    const params: Record<string, string> = {};
    let casa = true;

    for (let i = 0; i < compilada.segmentos.length; i++) {
      const segmento = compilada.segmentos[i];
      if (segmento.param !== null) {
        params[segmento.param] = partes[i];
      } else if (segmento.literal !== partes[i]) {
        casa = false;
        break;
      }
    }
    if (!casa) continue;

    caminhoCasou = true;
    if (compilada.rota.metodo === metodo && !escolhida) {
      escolhida = { rota: compilada.rota, params };
    }
  }

  if (!escolhida) {
    return caminhoCasou
      ? { ok: false, codigo: 'metodo_nao_permitido', status: 405 }
      : { ok: false, codigo: 'rota_desconhecida', status: 404 };
  }

  // Todo parametro de rota no Apsis Carbon e chave primaria uuid. Conferir aqui
  // significa que nenhum handler recebe um id torto, e que um valor absurdo na URL
  // nao chega a virar consulta ao banco.
  for (const valor of Object.values(escolhida.params)) {
    if (!UUID_RE.test(valor)) return { ok: false, codigo: 'id_invalido', status: 400 };
  }

  return { ok: true, rota: escolhida.rota, params: escolhida.params };
}

/**
 * Preflight com os metodos desta funcao.
 *
 * O CORS_HEADERS de _shared/cors.ts anuncia apenas GET, POST e OPTIONS, porque e
 * compartilhado com a app-config, que so le. Aqui existe PATCH, e sem anunciar o
 * metodo o navegador barra a requisicao no proprio preflight, antes de sair da
 * maquina. Sobrescrevemos so o cabecalho de metodos, reaproveitando o resto.
 */
function tratarPreflight(req: Request): Response | null {
  const base = tratarOptions(req);
  if (!base) return null;

  const cabecalhos = new Headers(base.headers);
  cabecalhos.set('Access-Control-Allow-Methods', CABECALHO_METODOS);
  return new Response(null, { status: 204, headers: cabecalhos });
}

// -----------------------------------------------------------------------------
// Configuracao (lida do banco a cada invocacao fria)
// -----------------------------------------------------------------------------

type ConfigNecessaria = { azure: ConfigAzure; app: ConfigApp };

/**
 * Le os blocos azure e app de carbon_app_config.
 *
 * Sem filtro por publico aqui de proposito: esta funcao usa a config para
 * VALIDAR o token e nada do que le e devolvido ao cliente. Quem expoe config ao
 * navegador e a app-config, que filtra publico = true.
 */
async function carregarConfig(): Promise<ConfigNecessaria | null> {
  const admin = obterAdmin();

  const { data, error } = await admin
    .from('carbon_app_config')
    .select('chave, valor')
    .in('chave', ['azure', 'app']);

  if (error) {
    console.error('Falha ao ler carbon_app_config:', error.message);
    return null;
  }

  const mapa: Record<string, Record<string, unknown>> = {};
  for (const linha of (data ?? []) as { chave: string; valor: Record<string, unknown> }[]) {
    mapa[linha.chave] = linha.valor ?? {};
  }

  if (!mapa.azure || !mapa.app) {
    console.error('Blocos azure e/ou app ausentes em carbon_app_config. Rode a migration.');
    return null;
  }

  return {
    azure: {
      clientId: String(mapa.azure.clientId ?? ''),
      tenantId: String(mapa.azure.tenantId ?? ''),
    },
    app: {
      dominioPermitido: String(mapa.app.dominioPermitido ?? ''),
    },
  };
}

// -----------------------------------------------------------------------------
// Resolucao do colaborador (usada por TODAS as rotas)
// -----------------------------------------------------------------------------

/**
 * Garante o registro do colaborador e devolve a linha completa.
 *
 * O upsert usa o e-mail como chave natural. Enviamos apenas email e nome, para
 * que papel, cargo e ativo (curados pela administracao) nao sejam sobrescritos
 * a cada login. O e-mail ja chega normalizado em minusculas pelo azureAuth,
 * casando com o indice unico carbon_usuarios_email_lower_idx.
 *
 * Chamado no handler, ANTES de despachar para a rota, por dois motivos:
 *   1. `ativo = false` precisa bloquear TODAS as rotas (era letra morta antes:
 *      a coluna era apenas devolvida por /me e ninguem a conferia);
 *   2. o `id` resultante e o que permite filtrar os modulos liberados para este
 *      colaborador em carbon_usuario_modulos e gravar autoria nas escritas.
 */
async function garantirUsuario(usuario: Usuario): Promise<RegistroUsuario | null> {
  const admin = obterAdmin();

  const { data, error } = await admin
    .from('carbon_usuarios')
    .upsert({ email: usuario.email, nome: usuario.nome }, { onConflict: 'email' })
    .select('id, email, nome, papel, ativo')
    .single();

  if (error || !data) {
    console.error('Falha no upsert de carbon_usuarios:', error?.message ?? 'sem retorno');
    return null;
  }

  return data as RegistroUsuario;
}

/** Autorizacao de escrita. Ver comentario de PAPEIS_ESCRITA. */
function podeEscrever(registro: RegistroUsuario): boolean {
  return PAPEIS_ESCRITA.has(String(registro.papel ?? '').toLowerCase());
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = tratarPreflight(req);
  if (preflight) return preflight;

  if (!METODOS_ACEITOS.has(req.method)) {
    return respostaErro('metodo_nao_permitido', 405);
  }

  const url = new URL(req.url);

  // Roteamento antes da autenticacao: ver comentario de casarRota.
  const casamento = casarRota(req.method, extrairRota(url));
  if (!casamento.ok) {
    return respostaErro(casamento.codigo, casamento.status);
  }

  try {
    const cfg = await carregarConfig();
    if (!cfg) {
      return respostaErro('config_indisponivel', 500);
    }

    const validacao = await validarTokenAzure(req, cfg);
    if (!validacao.ok) {
      return respostaErro(validacao.erro, validacao.status);
    }

    const usuario: Usuario = { email: validacao.email, nome: validacao.nome };

    // Registro do colaborador resolvido para TODAS as rotas. O bloqueio por
    // ativo = false acontece aqui, antes do despacho: desativar alguem em
    // carbon_usuarios corta o acesso a todas as rotas de uma vez.
    const registro = await garantirUsuario(usuario);
    if (!registro) {
      return respostaErro('erro_interno', 500);
    }
    if (registro.ativo !== true) {
      // Log so com o dominio, nunca o e-mail completo (LGPD).
      console.warn(
        `Acesso bloqueado: colaborador inativo no dominio ${usuario.email.split('@')[1] ?? ''}`,
      );
      return respostaErro('usuario_inativo', 403);
    }

    // Escrita so para admin e gestor. A leitura hoje passa com qualquer
    // colaborador ativo do dominio, o que e uma PENDENCIA e nao uma decisao final:
    // ver o comentario de PAPEIS_ESCRITA antes de considerar isso resolvido.
    if (casamento.rota.escrita && !podeEscrever(registro)) {
      return respostaErro('sem_permissao', 403);
    }

    // Corpo lido apenas quando existe corpo a ler. GET recebe null, e handler de
    // escrita usa `ctx.corpo ?? {}` (corpo vazio vira {} em lerCorpo, para POST
    // sem corpo cair na validacao de campo obrigatorio e nao em erro de parse).
    const corpo = casamento.rota.metodo === 'GET' ? null : await lerCorpo(req);

    const ctx: Contexto = {
      registro,
      usuario,
      admin: obterAdmin(),
      params: casamento.params,
      corpo,
      url,
    };

    return await casamento.rota.handler(ctx);
  } catch (e) {
    // Erro de validacao de corpo e de estado do recurso vira resposta de cliente;
    // o resto e 500 com log tecnico e sem detalhe para o navegador.
    if (e instanceof ErroRota) {
      return respostaErro(e.codigo, e.status, e.detalhe);
    }
    console.error('Erro inesperado em carbon-api:', e instanceof Error ? e.message : e);
    return respostaErro('erro_interno', 500);
  }
});

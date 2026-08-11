// -----------------------------------------------------------------------------
// Edge Function: carbon-api
// -----------------------------------------------------------------------------
// GET {SUPABASE_URL}/functions/v1/carbon-api/me
// GET {SUPABASE_URL}/functions/v1/carbon-api/modulos
// GET {SUPABASE_URL}/functions/v1/carbon-api/notificacoes
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
//   401 { erro: 'nao_autenticado' }
//   403 { erro: 'dominio_nao_permitido' }
//   403 { erro: 'usuario_inativo' }        colaborador com carbon_usuarios.ativo = false
//   404 { erro: 'rota_desconhecida' }
//   500 { erro: 'config_indisponivel' | 'config_incompleta' | 'erro_interno' }

import { respostaErro, respostaJson, tratarOptions } from '../_shared/cors.ts';
import { obterAdmin } from '../_shared/supabaseAdmin.ts';
import { validarTokenAzure } from '../_shared/azureAuth.ts';
import type { ConfigApp, ConfigAzure } from '../_shared/azureAuth.ts';

const NOME_FUNCAO = 'carbon-api';
const LIMITE_NOTIFICACOES = 20;

type Usuario = { email: string; nome: string };

/** Linha de carbon_usuarios resolvida a cada requisicao autenticada. */
type RegistroUsuario = {
  id: string;
  email: string;
  nome: string | null;
  papel: string;
  ativo: boolean;
};

// -----------------------------------------------------------------------------
// Roteamento
// -----------------------------------------------------------------------------

/**
 * Extrai a rota depois do nome da funcao. O pathname chega como
 * /functions/v1/carbon-api/modulos em producao e pode variar em ambiente local,
 * por isso ancoramos no nome da funcao em vez de contar segmentos.
 */
function extrairRota(url: string): string {
  const segmentos = new URL(url).pathname.split('/').filter(Boolean);
  const indice = segmentos.lastIndexOf(NOME_FUNCAO);
  if (indice === -1) return '';
  return segmentos.slice(indice + 1).join('/');
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
 * Chamado no handler, ANTES do switch de rotas, por dois motivos:
 *   1. `ativo = false` precisa bloquear TODAS as rotas (era letra morta antes:
 *      a coluna era apenas devolvida por /me e ninguem a conferia);
 *   2. o `id` resultante e o que permite filtrar os modulos liberados para este
 *      colaborador em carbon_usuario_modulos.
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

// -----------------------------------------------------------------------------
// Rota /me
// -----------------------------------------------------------------------------

/** Perfil do colaborador. O registro ja foi resolvido pelo handler. */
function rotaMe(registro: RegistroUsuario): Response {
  return respostaJson({
    email: registro.email,
    nome: registro.nome,
    papel: registro.papel,
    ativo: registro.ativo,
  });
}

// -----------------------------------------------------------------------------
// Rota /modulos
// -----------------------------------------------------------------------------

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
async function rotaModulos(registro: RegistroUsuario): Promise<Response> {
  const admin = obterAdmin();

  const { data, error } = await admin
    .from('carbon_modulos')
    .select(
      'chave, label, descricao, icone, rota, url_externa, accent, ordem, carbon_usuario_modulos!inner(usuario_id)',
    )
    .eq('ativo', true)
    .eq('carbon_usuario_modulos.usuario_id', registro.id)
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

// -----------------------------------------------------------------------------
// Rota /notificacoes
// -----------------------------------------------------------------------------

/**
 * Notificacoes visiveis para o colaborador: nao expiradas e destinadas a todos
 * (email_destino null) ou a ele.
 *
 * Os dois .or() sao combinados com AND pelo PostgREST (cada parametro or= e uma
 * condicao independente). O e-mail e interpolado no filtro com seguranca porque
 * o azureAuth ja o validou contra uma regex que proibe virgula e parenteses,
 * que sao os metacaracteres da sintaxe de filtro do PostgREST.
 */
async function rotaNotificacoes(usuario: Usuario): Promise<Response> {
  const admin = obterAdmin();
  const agora = new Date().toISOString();

  const { data, error } = await admin
    .from('carbon_notificacoes')
    .select('id, tipo, titulo, descricao, acao, criado_em')
    .or(`expira_em.is.null,expira_em.gt.${agora}`)
    .or(`email_destino.is.null,email_destino.eq.${usuario.email}`)
    .order('criado_em', { ascending: false })
    .limit(LIMITE_NOTIFICACOES);

  if (error) {
    console.error('Falha ao ler carbon_notificacoes:', error.message);
    return respostaErro('erro_interno', 500);
  }

  return respostaJson({ notificacoes: data ?? [] });
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = tratarOptions(req);
  if (preflight) return preflight;

  if (req.method !== 'GET') {
    return respostaErro('metodo_nao_permitido', 405);
  }

  const rota = extrairRota(req.url);

  // Rota desconhecida antes de autenticar: nao ha motivo para gastar uma
  // validacao de JWKS em caminho que nao existe.
  if (rota !== 'me' && rota !== 'modulos' && rota !== 'notificacoes') {
    return respostaErro('rota_desconhecida', 404);
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
    // ativo = false acontece aqui, antes do switch: desativar alguem em
    // carbon_usuarios corta o acesso a /me, /modulos e /notificacoes de uma vez.
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

    switch (rota) {
      case 'me':
        return rotaMe(registro);
      case 'modulos':
        return await rotaModulos(registro);
      case 'notificacoes':
        return await rotaNotificacoes(usuario);
      default:
        return respostaErro('rota_desconhecida', 404);
    }
  } catch (e) {
    console.error('Erro inesperado em carbon-api:', e instanceof Error ? e.message : e);
    return respostaErro('erro_interno', 500);
  }
});

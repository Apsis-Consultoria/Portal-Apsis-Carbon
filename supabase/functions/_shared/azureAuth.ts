// -----------------------------------------------------------------------------
// Validacao do ID token do Azure AD (Entra ID) dentro da Edge Function.
// -----------------------------------------------------------------------------
// Por que validamos aqui e nao deixamos para a plataforma:
// o Authorization das chamadas ao carbon-api traz um ID token emitido pela
// MICROSOFT, nao um JWT do Supabase Auth. O verify_jwt da plataforma nao sabe
// validar esse token, por isso as duas funcoes usam verify_jwt = false e a
// autenticacao acontece neste modulo, ANTES de qualquer consulta ao banco.
//
// O que e conferido, em ordem:
//   1. assinatura, contra o JWKS oficial do tenant (chaves publicas da Microsoft)
//   2. issuer  = https://login.microsoftonline.com/<tenantId>/v2.0
//   3. audience = clientId do aplicativo registrado
//   4. claim tid = tenantId (barra token de outro tenant assinado pela Microsoft)
//   5. formato do e-mail e dominio corporativo permitido
//
// LGPD: nao logamos o token nem o e-mail completo. Quando precisamos de rastro,
// logamos apenas o dominio do e-mail.

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'npm:jose@5.9.6';

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------

export type ConfigAzure = {
  clientId: string;
  tenantId: string;
};

export type ConfigApp = {
  dominioPermitido: string;
};

export type ResultadoValidacao =
  | { ok: true; email: string; nome: string }
  | { ok: false; status: number; erro: string };

// -----------------------------------------------------------------------------
// Cache do JWKS
// -----------------------------------------------------------------------------
// createRemoteJWKSet devolve uma funcao que faz cache das chaves em memoria e
// so refaz a busca quando aparece um kid desconhecido. Guardamos por tenantId
// para que o isolate reaproveite entre invocacoes: sem isso, cada chamada
// baixaria o JWKS da Microsoft de novo.

type ResolvedorJwks = ReturnType<typeof createRemoteJWKSet>;
const cacheJwks = new Map<string, ResolvedorJwks>();

function obterJwks(tenantId: string): ResolvedorJwks {
  const existente = cacheJwks.get(tenantId);
  if (existente) return existente;

  const url = new URL(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/discovery/v2.0/keys`,
  );
  const resolvedor = createRemoteJWKSet(url, {
    // Se um kid novo aparecer, espera no minimo 30s antes de rebuscar o JWKS.
    // Evita que token invalido em rajada vire tempestade de requisicoes a Microsoft.
    cooldownDuration: 30_000,
    // Mantem as chaves por 12h antes de considerar o cache velho.
    cacheMaxAge: 12 * 60 * 60 * 1000,
  });
  cacheJwks.set(tenantId, resolvedor);
  return resolvedor;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Regex restritiva de e-mail. Alem de validar o formato, garante que o valor nao
 * contem virgula, parenteses ou espaco. Isso e o que torna seguro interpolar o
 * e-mail em filtros do PostgREST (ex.: .or('email_destino.eq.<email>')), onde
 * virgula e parentese sao metacaracteres de sintaxe.
 */
const EMAIL_SEGURO = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

/** Extrai o token do cabecalho Authorization: Bearer <token>. */
function extrairBearer(req: Request): string | null {
  const cabecalho = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!cabecalho) return null;

  const partes = cabecalho.trim().split(/\s+/);
  if (partes.length !== 2) return null;
  if (partes[0].toLowerCase() !== 'bearer') return null;
  if (!partes[1]) return null;

  return partes[1];
}

/**
 * O Azure AD nao tem um claim unico de e-mail. Em conta corporativa o valor util
 * costuma estar em preferred_username; email aparece quando o atributo mail esta
 * preenchido no diretorio; upn e o fallback historico.
 */
function extrairEmail(payload: JWTPayload): string | null {
  const candidatos = [
    payload.preferred_username,
    payload.email,
    payload.upn,
  ];

  for (const candidato of candidatos) {
    if (typeof candidato === 'string' && candidato.includes('@')) {
      return candidato.trim().toLowerCase();
    }
  }
  return null;
}

/** Somente o dominio, para log. Nunca o e-mail inteiro (LGPD). */
function dominioDe(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1) : 'desconhecido';
}

// -----------------------------------------------------------------------------
// Validacao principal
// -----------------------------------------------------------------------------

/**
 * Valida o ID token do Azure AD presente no Authorization da requisicao.
 *
 * Devolve { ok: true, email, nome } ou { ok: false, status, erro } com os codigos
 * combinados no contrato:
 *   401 nao_autenticado       -> sem token, token invalido, expirado, aud/iss/tid errados
 *   403 dominio_nao_permitido -> token valido, mas e-mail fora do dominio corporativo
 *   500 config_incompleta     -> clientId/tenantId ainda nao preenchidos no banco
 */
export async function validarTokenAzure(
  req: Request,
  cfg: { azure: ConfigAzure; app: ConfigApp },
): Promise<ResultadoValidacao> {
  const { clientId, tenantId } = cfg.azure;
  const dominioPermitido = (cfg.app.dominioPermitido ?? '').trim().toLowerCase();

  // Guarda contra o estado inicial do banco: enquanto o seed nao for atualizado
  // com os valores reais do Azure, nenhuma validacao faz sentido. Devolvemos um
  // erro distinto para nao mascarar problema de configuracao como falha de login.
  const naoPreenchido = (valor: string | undefined) =>
    !valor || valor.startsWith('PREENCHER');

  if (naoPreenchido(clientId) || naoPreenchido(tenantId) || !dominioPermitido) {
    console.error(
      'Config do Azure incompleta em carbon_app_config: preencha clientId, tenantId e app.dominioPermitido.',
    );
    return { ok: false, status: 500, erro: 'config_incompleta' };
  }

  const token = extrairBearer(req);
  if (!token) {
    return { ok: false, status: 401, erro: 'nao_autenticado' };
  }

  let payload: JWTPayload;
  try {
    const resultado = await jwtVerify(token, obterJwks(tenantId), {
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      audience: clientId,
      // Tolerancia pequena para diferenca de relogio entre a Microsoft e a edge.
      clockTolerance: 60,
    });
    payload = resultado.payload;
  } catch (e) {
    // Log sem token e sem e-mail: apenas o motivo tecnico da recusa.
    console.warn('ID token recusado:', e instanceof Error ? e.message : 'erro desconhecido');
    return { ok: false, status: 401, erro: 'nao_autenticado' };
  }

  // O issuer ja amarra o tenant, mas conferimos o claim tid explicitamente:
  // defesa em profundidade contra token de outro tenant (multi-tenant apps).
  if (payload.tid !== tenantId) {
    console.warn('ID token com tid diferente do tenant configurado.');
    return { ok: false, status: 401, erro: 'nao_autenticado' };
  }

  const email = extrairEmail(payload);
  if (!email || !EMAIL_SEGURO.test(email)) {
    console.warn('ID token sem claim de e-mail em formato aceitavel.');
    return { ok: false, status: 401, erro: 'nao_autenticado' };
  }

  if (dominioDe(email) !== dominioPermitido) {
    // Logamos apenas o dominio, nunca o e-mail completo (LGPD).
    console.warn(`Acesso negado para dominio nao permitido: ${dominioDe(email)}`);
    return { ok: false, status: 403, erro: 'dominio_nao_permitido' };
  }

  const nome = typeof payload.name === 'string' && payload.name.trim()
    ? payload.name.trim()
    : email.split('@')[0];

  return { ok: true, email, nome };
}

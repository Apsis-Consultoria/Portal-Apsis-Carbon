// -----------------------------------------------------------------------------
// Edge Function: app-config
// -----------------------------------------------------------------------------
// GET {SUPABASE_URL}/functions/v1/app-config
//
// Endpoint PUBLICO de boot (verify_jwt = false em supabase/config.toml). O
// frontend chama antes de existir qualquer sessao, sem Authorization, para
// descobrir clientId/tenantId do Azure AD, dominio permitido, textos e imagens
// do login e feature flags.
//
// Resposta:
//   { azure: {...}, app: {...}, login: {...}, flags: {...} }
//
// REGRA DE OURO: somente linhas de carbon_app_config com publico = true entram
// na resposta. O filtro .eq('publico', true) e explicito mesmo usando o client
// de servidor (que ignora RLS), porque essa e a unica barreira contra vazar
// configuracao interna para o navegador.

import { respostaErro, respostaJson, tratarOptions } from '../_shared/cors.ts';
import { obterAdmin } from '../_shared/supabaseAdmin.ts';

type LinhaConfig = {
  chave: string;
  valor: unknown;
};

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = tratarOptions(req);
  if (preflight) return preflight;

  if (req.method !== 'GET') {
    return respostaErro('metodo_nao_permitido', 405);
  }

  try {
    const admin = obterAdmin();

    const { data, error } = await admin
      .from('carbon_app_config')
      .select('chave, valor')
      .eq('publico', true);

    if (error) {
      // Log tecnico fica no painel da funcao; o cliente recebe codigo generico.
      console.error('Falha ao ler carbon_app_config:', error.message);
      return respostaErro('config_indisponivel', 500);
    }

    // chave -> valor. Qualquer linha publica nova aparece automaticamente aqui,
    // sem precisar mexer nesta funcao: e assim que se adiciona configuracao nova.
    const config: Record<string, unknown> = {};
    for (const linha of (data ?? []) as LinhaConfig[]) {
      config[linha.chave] = linha.valor;
    }

    return respostaJson(config, 200, {
      // 60s de cache: suficiente para nao castigar o endpoint em recarregamentos
      // seguidos e curto o bastante para uma troca de config valer rapido.
      'Cache-Control': 'public, max-age=60',
    });
  } catch (e) {
    console.error('Erro inesperado em app-config:', e instanceof Error ? e.message : e);
    return respostaErro('config_indisponivel', 500);
  }
});

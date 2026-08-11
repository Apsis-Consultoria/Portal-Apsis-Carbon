// -----------------------------------------------------------------------------
// Client Supabase com privilegio de servidor, para uso EXCLUSIVO dentro das
// Edge Functions.
// -----------------------------------------------------------------------------
// SEGURANCA: este client ignora RLS. Ele existe apenas aqui, no runtime Deno do
// Supabase, e le a chave de variavel de ambiente injetada pela plataforma. A
// chave nunca e hardcoded e nunca vai para o bundle do frontend.
//
// Contraste deliberado com o Portal Apsis, onde a service_role key esta
// hardcoded no codigo do frontend e exporta um client admin para o navegador
// (bypass total de RLS). Isso NAO se repete no Apsis Carbon: o frontend usa
// somente a anon key.
//
// Variaveis injetadas automaticamente pela plataforma (nao precisam ser criadas):
//   SUPABASE_URL                -> gateway da API do projeto
//   SUPABASE_SERVICE_ROLE_KEY   -> chave legada de servidor (valida ate o fim de 2026)
//   SUPABASE_SECRET_KEYS        -> JSON { "default": "sb_secret_..." } no modelo novo
// Aceitamos as duas para o projeto funcionar tanto em conta antiga quanto nova.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

function lerChaveDeServidor(): string {
  // Preferimos a chave legada quando existe, porque e a que todo projeto
  // atual possui. Se o projeto ja migrou para as chaves novas, caimos no
  // dicionario SUPABASE_SECRET_KEYS.
  const legada = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legada) return legada;

  const dicionario = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (dicionario) {
    try {
      const chaves = JSON.parse(dicionario) as Record<string, string>;
      if (chaves.default) return chaves.default;
    } catch {
      throw new Error(
        'SUPABASE_SECRET_KEYS existe mas nao e um JSON valido. Verifique os secrets da funcao.',
      );
    }
  }

  throw new Error(
    'Chave de servidor ausente: defina SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEYS) ' +
      'nos secrets das Edge Functions. Em projeto hospedado essa variavel e injetada ' +
      'automaticamente; se faltou, a funcao foi publicada fora do projeto.',
  );
}

/**
 * Cria o client de servidor. Chamado uma vez por isolate e reaproveitado
 * pelo modulo (ver export `admin` abaixo).
 */
export function criarSupabaseAdmin(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) {
    throw new Error(
      'SUPABASE_URL ausente no ambiente da Edge Function. Em projeto hospedado ' +
        'essa variavel e injetada automaticamente.',
    );
  }

  return createClient(url, lerChaveDeServidor(), {
    auth: {
      // Edge Function e stateless: nada de sessao, nada de refresh automatico,
      // nada de leitura de token de URL.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-application-name': 'apsis-carbon-edge' },
    },
  });
}

let cache: SupabaseClient | null = null;

/**
 * Devolve a instancia unica do isolate, criando na primeira chamada.
 *
 * Proposital: a criacao e preguicosa, e nao no topo do modulo. Assim, se faltar
 * variavel de ambiente, o erro estoura DENTRO do try/catch do handler e o cliente
 * recebe um JSON de erro com CORS, em vez de um crash de boot sem cabecalho CORS
 * (que no navegador aparece como erro de CORS e esconde a causa real).
 */
export function obterAdmin(): SupabaseClient {
  if (!cache) cache = criarSupabaseAdmin();
  return cache;
}

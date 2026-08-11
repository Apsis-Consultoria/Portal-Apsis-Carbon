import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase publico do Apsis Carbon.
 *
 * SEGURANCA - LEIA ANTES DE MEXER:
 * Aqui existe SOMENTE a anon key. NAO existe (e nunca deve existir) a service_role key
 * nem um cliente "supabaseAdmin" neste arquivo. Tudo que esta em src/ vai para o bundle
 * do navegador, ou seja, qualquer pessoa que abrir o DevTools le o valor. A service_role
 * key faz bypass total de RLS: exposta no frontend, ela entrega o banco inteiro.
 * O portal-apsis tem esse problema (service key hardcoded como fallback em
 * src/lib/supabaseClient.js) e ele NAO deve ser replicado aqui.
 *
 * Operacoes que precisam de privilegio vivem nas Edge Functions (carbon-api), onde a
 * service_role key existe apenas como secret do lado do servidor.
 *
 * A anon key e publica por design: ela so identifica o projeto. A protecao real vem das
 * politicas de RLS no PostgreSQL e da validacao de token nas Edge Functions.
 */

// Sem fallback hardcoded de proposito: se a env faltar, fica string vazia e o
// runtimeConfig reclama com uma mensagem clara na ConfigErrorScreen.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

/**
 * Cliente anon (RLS ativa).
 *
 * Nao lancamos erro no import mesmo se as variaveis faltarem: um import que lanca deixa
 * a tela branca antes de qualquer componente montar. Com as strings vazias o createClient
 * ate constroi o objeto; quem falha de forma controlada e o carregarConfig().
 *
 * auth.persistSession = false porque a sessao do usuario e do Azure AD via MSAL, nao do
 * Supabase Auth. Deixar o supabase-js gravar sessao no localStorage aqui so criaria uma
 * segunda fonte de verdade de autenticacao (e lixo no storage).
 */
export const supabase = createClient(
  SUPABASE_URL || "http://localhost",
  SUPABASE_ANON_KEY || "anon-key-ausente",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

/** Monta a URL de uma Edge Function: urlFuncao('app-config') -> <url>/functions/v1/app-config */
export function urlFuncao(nome) {
  const base = (SUPABASE_URL || "").replace(/\/+$/, "");
  return `${base}/functions/v1/${nome}`;
}

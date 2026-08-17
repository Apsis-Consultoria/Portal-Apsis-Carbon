import { MODO_DEMO } from "@/lib/runtimeConfig";
import { chamarApi } from "@/lib/api/base";

/**
 * api/nucleo - rotas de estrutura do shell: perfil, modulos do menu e notificacoes.
 *
 * Ficam separadas dos dominios de negocio porque nao pertencem a nenhum: sao o que o
 * Layout e a tela de Boas-Vindas precisam para existir.
 *
 * MODO DEMONSTRACAO: sem Supabase provisionado, as tres devolvem o vazio elegante em
 * vez de fazer rede. O `if (MODO_DEMO)` e escrito assim de proposito, sem Boolean() em
 * volta: MODO_DEMO e uma expressao estatica (import.meta.env.DEV && ...) e o Rollup
 * dobra para `false` no build de producao, eliminando o ramo do demo do bundle. Ver a
 * nota longa em src/lib/runtimeConfig.js.
 */

export async function obterPerfil(msal) {
  if (MODO_DEMO) {
    // Perfil minimo para a tela ser revisavel sem backend. Nenhum dado real.
    return { email: "", nome: "", papel: "visitante", ativo: false };
  }
  return chamarApi("/me", msal);
}

export async function obterModulos(msal) {
  if (MODO_DEMO) return { modulos: [] };
  return chamarApi("/modulos", msal);
}

export async function obterNotificacoes(msal) {
  if (MODO_DEMO) return { notificacoes: [] };
  return chamarApi("/notificacoes", msal);
}

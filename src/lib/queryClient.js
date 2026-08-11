import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente unico do TanStack Query do Apsis Carbon.
 *
 * Escolhas dos defaults:
 * - refetchOnWindowFocus: false -> o portal usa o mesmo valor. Os dados do Carbon
 *   (config de modulos e avisos) mudam raramente; refazer a chamada a cada vez que o
 *   usuario volta para a aba so gastaria invocacao de Edge Function sem ganho visivel.
 * - retry: 1 -> uma segunda tentativa cobre falha de rede momentanea, mas nao insiste
 *   em erro real. Importante porque 401/403 da carbon-api sao respostas definitivas
 *   (token invalido / dominio nao permitido): repetir varias vezes so atrasaria a tela.
 * - staleTime: 60000 (1 min) -> evita refetch em cada montagem enquanto o usuario
 *   navega entre Layout e BoasVindas, que compartilham as MESMAS chaves de query
 *   (['carbon','modulos'] e ['carbon','notificacoes']). Sem staleTime, cada montagem
 *   dispararia uma chamada nova mesmo com o cache quente.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60000,
    },
  },
});

import { PAGE_ROUTES } from '@/lib/pageRoutes';

/**
 * Retorna o caminho canonico de uma pagina do Apsis Carbon.
 *
 * Paginas mapeadas em PAGE_ROUTES usam o caminho declarado la; qualquer outro nome
 * cai no fallback flat '/NomeDaPagina' (espacos viram hifen). O fallback existe para
 * que uma tela nova funcione mesmo antes de ser registrada em pageRoutes.js.
 */
export function createPageUrl(nomeDaPagina) {
  const nome = String(nomeDaPagina ?? '');
  return PAGE_ROUTES[nome] ?? '/' + nome.replace(/ /g, '-');
}

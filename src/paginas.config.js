import { PAGINAS_BRUTAS } from '@/paginas/indice';

/**
 * paginas.config.js - registro unico das telas proprias do Apsis Carbon.
 *
 * O que sai daqui alimenta, sem duplicacao:
 *   - as <Route> do src/App.jsx (o arquivo nao muda mais a cada tela nova);
 *   - o titulo e o subtitulo da topbar e os itens fixos da navegacao (src/Layout.jsx);
 *   - o PAGE_ROUTES e o createPageUrl (src/lib/pageRoutes.js).
 *
 * PARA ACRESCENTAR UMA TELA: crie `src/paginas/<dominio>.paginas.js` exportando
 * `export const paginas = [...]`. O agregador src/paginas/indice.js encontra o arquivo
 * por import.meta.glob. NAO edite este arquivo nem o App.jsx nem o Layout.jsx.
 * A forma de uma entrada esta documentada em src/paginas/nucleo.paginas.js.
 *
 * Nada aqui derruba o app: entrada torta e ignorada com aviso no console. O registro de
 * paginas roda no boot, antes de qualquer ErrorBoundary existir, e um throw neste ponto
 * seria exatamente a tela branca que o projeto proibe.
 */

const SUBTITULO_PADRAO = 'Apsis Carbon';

/** Preenche os campos opcionais para o resto do codigo nunca precisar de `?.`. */
function normalizar(entrada) {
  const nome = typeof entrada?.nome === 'string' ? entrada.nome.trim() : '';
  const rota = typeof entrada?.rota === 'string' && entrada.rota.trim() ? entrada.rota.trim() : null;

  // Rota com parametro nao tem URL fixa, logo nao pode virar item de menu: o link
  // apontaria para o ':id' literal, que e um link quebrado silencioso.
  const temParametro = rota !== null && rota.includes(':');
  let menu = entrada?.menu ?? null;
  if (menu && temParametro) {
    console.warn(
      `[Apsis Carbon] A pagina "${nome}" tem rota com parametro (${rota}) e nao pode ter item ` +
        'de menu. Use menuPai para acender o item da tela pai. O menu foi ignorado.',
    );
    menu = null;
  }

  return {
    nome,
    rota,
    componente: entrada?.componente ?? null,
    titulo: typeof entrada?.titulo === 'string' && entrada.titulo ? entrada.titulo : nome,
    subtitulo:
      typeof entrada?.subtitulo === 'string' && entrada.subtitulo
        ? entrada.subtitulo
        : SUBTITULO_PADRAO,
    // Default true: a esmagadora maioria das telas vive dentro do shell.
    shell: entrada?.shell !== false,
    curinga: entrada?.curinga === true,
    menuPai: typeof entrada?.menuPai === 'string' && entrada.menuPai ? entrada.menuPai : null,
    menu: menu
      ? {
          icone: typeof menu.icone === 'string' ? menu.icone : '',
          ordem: Number.isFinite(menu.ordem) ? menu.ordem : Number.MAX_SAFE_INTEGER,
          grupo: typeof menu.grupo === 'string' && menu.grupo ? menu.grupo : null,
        }
      : null,
    temParametro,
  };
}

/** Descarta entrada inutilizavel e avisa. Nome repetido: a primeira vale. */
function validar(entradas) {
  const vistos = new Set();
  const validas = [];

  for (const entrada of entradas) {
    if (!entrada.nome) {
      console.error('[Apsis Carbon] Entrada de PAGINAS sem `nome`. Ignorada.');
      continue;
    }
    if (!entrada.componente) {
      console.error(`[Apsis Carbon] A pagina "${entrada.nome}" nao tem componente. Ignorada.`);
      continue;
    }
    if (vistos.has(entrada.nome)) {
      console.error(
        `[Apsis Carbon] Pagina duplicada no registro: "${entrada.nome}". ` +
          'A primeira registrada vale; a segunda foi ignorada.',
      );
      continue;
    }
    vistos.add(entrada.nome);
    validas.push(entrada);
  }

  return validas;
}

/**
 * Ordem: menu.ordem crescente e, empatando, titulo em pt-BR.
 *
 * Telas fora do menu recebem ordem MAX_SAFE_INTEGER na normalizacao, entao ficam no fim
 * ordenadas por titulo. Isso NAO afeta o roteamento: o React Router 6 ranqueia por
 * especificidade, e nao pela ordem em que as <Route> aparecem.
 */
function ordenar(entradas) {
  return [...entradas].sort((a, b) => {
    const ordemA = a.menu ? a.menu.ordem : Number.MAX_SAFE_INTEGER;
    const ordemB = b.menu ? b.menu.ordem : Number.MAX_SAFE_INTEGER;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return String(a.titulo).localeCompare(String(b.titulo), 'pt-BR');
  });
}

export const PAGINAS = ordenar(validar(PAGINAS_BRUTAS.map(normalizar)));

/** Tela pelo nome (o mesmo valor que o Layout recebe em currentPageName). */
export function paginaPorNome(nome) {
  return PAGINAS.find((p) => p.nome === nome) ?? null;
}

/**
 * Itens fixos da navegacao, na forma que o Layout consome.
 *
 * `paginas` lista os currentPageName que devem acender o item: o proprio, mais toda tela
 * que se declarou filha por `menuPai`. E assim que o PDD ('/Projetos/<id>/PDD') mantem o
 * item "Projetos" aceso sem que o registro de Projetos saiba que o PDD existe.
 */
export const ITENS_MENU_FIXOS = PAGINAS.filter((p) => p.menu && p.rota).map((p) => ({
  chave: p.nome,
  label: p.titulo,
  icone: p.menu.icone,
  grupo: p.menu.grupo,
  rota: p.rota,
  paginas: [p.nome, ...PAGINAS.filter((f) => f.menuPai === p.nome).map((f) => f.nome)],
}));

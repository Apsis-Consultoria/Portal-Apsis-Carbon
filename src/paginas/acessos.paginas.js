import GestaoAcessos from '@/pages/GestaoAcessos';

/**
 * acessos.paginas.js - registro da tela de Gestao de acessos.
 *
 * O NOME DO ARQUIVO E A AREA. `acessos.paginas.js` -> area `acessos`, derivada
 * pelo agregador em src/paginas/indice.js. E a mesma chave da tabela
 * carbon_areas no banco e a mesma que o indice de rotas da Edge Function carimba
 * em rotas/acessos.ts. Os tres precisam bater, e batem porque nenhum dos tres
 * escreve a palavra a mao: dois derivam do nome do arquivo e o terceiro e a
 * linha do catalogo.
 *
 * ORDEM 900: por ultimo no menu. Nao e a tela do dia a dia de ninguem, e a
 * frequencia de uso e o que deve ordenar um menu - nao a importancia.
 *
 * ICONE 'KeyRound': tem de existir no mapa ICONES do src/Layout.jsx, senao cai
 * no fallback em silencio.
 */
export const paginas = [
  {
    nome: 'GestaoAcessos',
    rota: '/GestaoAcessos',
    componente: GestaoAcessos,
    titulo: 'Gestão de acessos',
    subtitulo: 'Cargos e quem tem cada um',
    menu: { icone: 'KeyRound', ordem: 900, grupo: null },
  },
];

export default paginas;

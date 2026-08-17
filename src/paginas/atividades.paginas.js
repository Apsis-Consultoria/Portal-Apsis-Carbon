import Atividades from '@/pages/Atividades';
import MinhasHoras from '@/pages/MinhasHoras';

/**
 * atividades.paginas.js - registro das telas do dominio Atividades (issues #7 e #8).
 *
 * O agregador src/paginas/indice.js encontra este arquivo por import.meta.glob, portanto
 * publicar estas duas telas nao exigiu tocar em App.jsx, Layout.jsx nem paginas.config.js.
 * A forma de uma entrada esta documentada em src/paginas/nucleo.paginas.js.
 *
 * Os nomes de icone sao chaves do mapa ICONES de src/Layout.jsx (nome desconhecido cai
 * no fallback e nunca derruba o menu):
 *   ClipboardList - a lista da reuniao semanal;
 *   Calculator    - "lembrar de contar as horas", que e literalmente o que a pauta da
 *                   weekly anota como pendencia e o que esta tela resolve.
 *
 * ORDEM NO MENU: 3 e 4, logo depois de BoasVindas (1) e Projetos (2). Atividades vem
 * antes de Minhas Horas porque a primeira e a visao da equipe e a segunda e a acao
 * individual dentro dela.
 */
export const paginas = [
  {
    nome: 'Atividades',
    rota: '/Atividades',
    componente: Atividades,
    titulo: 'Atividades',
    subtitulo: 'Base única de atividades, com projeto como dimensão',
    menu: { icone: 'ClipboardList', ordem: 3, grupo: null },
  },
  {
    nome: 'MinhasHoras',
    rota: '/MinhasHoras',
    componente: MinhasHoras,
    titulo: 'Minhas horas',
    subtitulo: 'Lançamento das horas da semana, dia por atividade',
    menu: { icone: 'Calculator', ordem: 4, grupo: null },
  },
];

export default paginas;

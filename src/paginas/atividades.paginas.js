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
 * ORDEM NO MENU: 3.5 e 4, logo depois de Projetos (2) e Documentos (3). Atividades vem
 * antes de Minhas Horas porque a primeira é a visão da equipe e a segunda é a ação
 * individual dentro dela.
 *
 * POR QUE 3.5 E NÃO UM INTEIRO: até 01/09/2026 Atividades e Documentos declaravam os
 * dois `ordem: 3`, e quem decidia a posição era o desempate por título de
 * src/paginas.config.js (A antes de D), não a intenção de ninguém. Documentos quer ficar
 * colado em Projetos (o documento pendura no projeto) e ficou com o 3; Findings ocupa o
 * 5. Sobram dois inteiros (3 e 4) para três telas, então o meio número é o menor ajuste
 * que honra as duas intenções sem renumerar Findings, Metas, Pipeline, Questionários,
 * Reuniões, Fornecedores e Consultoria. O agregador src/paginas/indice.js avisa no
 * console se dois registros voltarem a disputar o mesmo número.
 */
export const paginas = [
  {
    nome: 'Atividades',
    rota: '/Atividades',
    componente: Atividades,
    titulo: 'Atividades',
    subtitulo: 'Base única de atividades, com projeto como dimensão',
    menu: { icone: 'ClipboardList', ordem: 3.5, grupo: null },
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

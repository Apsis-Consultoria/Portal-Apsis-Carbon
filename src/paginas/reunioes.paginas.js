import Reunioes from '@/pages/Reunioes';
import ReuniaoAta from '@/pages/ReuniaoAta';

/**
 * reunioes.paginas.js - registro das telas do dominio de Reunioes (issue #9).
 *
 * Arquivo PROPRIO do dominio: o agregador src/paginas/indice.js encontra este arquivo
 * por import.meta.glob, portanto publicar estas duas telas nao exige tocar em
 * App.jsx, Layout.jsx nem paginas.config.js. A forma de uma entrada esta documentada
 * em src/paginas/nucleo.paginas.js.
 */
export const paginas = [
  {
    nome: 'Reunioes',
    rota: '/Reunioes',
    componente: Reunioes,
    titulo: 'Reuniões',
    subtitulo: 'Cadência de reuniões e atas',
    // ordem 9 = numero da issue deste dominio. E a convencao que mantem os itens de
    // menu previsiveis enquanto os modulos de carbon_modulos nao existem; empate de
    // ordem entre dominios cai no desempate por titulo em paginas.config.js.
    menu: { icone: 'Handshake', ordem: 9, grupo: null },
  },
  {
    /**
     * Ata e tela FILHA de Reunioes: tem o shell, mas nao tem item de menu proprio
     * (a rota depende do id da reuniao). `menuPai` mantem o item "Reuniões" aceso
     * enquanto a ata esta aberta.
     */
    nome: 'ReuniaoAta',
    rota: '/Reunioes/:id/Ata',
    componente: ReuniaoAta,
    titulo: 'Ata',
    subtitulo: 'Ata da reunião, pendências e evidência de auditoria',
    menuPai: 'Reunioes',
    menu: null,
  },
];

export default paginas;

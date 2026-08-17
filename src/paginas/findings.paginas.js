import ProjetoFindings from '@/pages/ProjetoFindings';

/**
 * findings.paginas.js - registro das telas de findings de auditoria (issue #5).
 *
 * O agregador src/paginas/indice.js encontra este arquivo por import.meta.glob, portanto
 * nada em App.jsx, Layout.jsx ou paginas.config.js precisa ser editado. A forma de uma
 * entrada esta documentada em src/paginas/nucleo.paginas.js.
 *
 * DUAS ENTRADAS PARA O MESMO COMPONENTE, de proposito:
 *
 *   /Findings                  item de menu. Findings sempre pertencem a UM projeto, mas
 *                              uma tela cuja unica URL tem :id nao pode ter item de menu
 *                              (o link apontaria para o ':id' literal). Sem esta entrada
 *                              a tela so seria alcancavel por URL digitada a mao. Aqui
 *                              ela pede o projeto e redireciona.
 *
 *   /Projetos/:id/Findings     a tela de verdade, com URL compartilhavel. `menuPai:
 *                              'Findings'` mantem o item do menu aceso enquanto ela esta
 *                              aberta - o mesmo mecanismo que o PDD usa para acender
 *                              "Projetos".
 */
export const paginas = [
  {
    nome: 'Findings',
    rota: '/Findings',
    componente: ProjetoFindings,
    titulo: 'Findings',
    subtitulo: 'Auditoria de VVB, Verra e BeZero',
    menu: { icone: 'ClipboardList', ordem: 5, grupo: null },
  },
  {
    nome: 'ProjetoFindings',
    rota: '/Projetos/:id/Findings',
    componente: ProjetoFindings,
    titulo: 'Findings',
    subtitulo: 'Apontamentos de auditoria do projeto',
    menuPai: 'Findings',
    menu: null,
  },
];

export default paginas;

import ProjetoEvidencias from '@/pages/ProjetoEvidencias';

/**
 * evidencias.paginas.js - registro da tela do dominio de Evidencias (issue #4).
 *
 * O agregador src/paginas/indice.js encontra este arquivo por import.meta.glob, entao
 * publicar a tela nao exige tocar em App.jsx, Layout.jsx nem paginas.config.js. A
 * forma de uma entrada esta documentada em src/paginas/nucleo.paginas.js.
 */
export const paginas = [
  {
    /**
     * Tela FILHA de Projetos, como o PDD: tem o shell, mas nao tem item de menu
     * proprio, porque a rota depende do id do projeto e um item de menu apontaria
     * para o ':id' literal. `menuPai` mantem o item "Projetos" aceso enquanto o
     * checklist esta aberto.
     *
     * PENDENCIA CONHECIDA (nao resolvida aqui de proposito): nao existe link para
     * esta tela em nenhuma outra. O caminho natural seria um botao "Evidências" na
     * linha de cada projeto em src/pages/Projetos.jsx, que e arquivo de outro
     * dominio. Ate isso ser acrescentado, a tela e alcancavel pela URL
     * /Projetos/<id>/Evidencias e pelo atalho que ela mesma oferece para o PDD.
     */
    nome: 'ProjetoEvidencias',
    rota: '/Projetos/:id/Evidencias',
    componente: ProjetoEvidencias,
    titulo: 'Evidências',
    subtitulo: 'Checklist de evidências exigidas na auditoria',
    menuPai: 'Projetos',
    menu: null,
  },
];

export default paginas;

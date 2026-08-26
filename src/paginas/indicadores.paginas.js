import ProjetoIndicadores from '@/pages/ProjetoIndicadores';

/**
 * indicadores.paginas.js - registro da tela de Indicadores do Plano de Monitoramento.
 *
 * O agregador src/paginas/indice.js encontra este arquivo por import.meta.glob, então
 * publicar a tela não exigiu editar App.jsx, Layout.jsx nem paginas.config.js. A forma de
 * uma entrada está documentada em src/paginas/nucleo.paginas.js.
 */
export const paginas = [
  {
    /**
     * Tela FILHA de Projetos, igual ao PDD e ao Monitoramento: tem o shell, mas não pode
     * ter item de menu próprio porque a rota depende do id do projeto (um item fixo
     * apontaria para o ':id' literal). `menuPai` mantém "Projetos" aceso enquanto esta
     * tela está aberta.
     *
     * NÃO EXISTE UMA TELA DE INDICADORES SEM PROJETO, de propósito. O Plano de
     * Monitoramento é construído sobre a Teoria da Mudança de UM projeto, com a
     * comunidade dele: um indicador do Awaeté não descreve nem compara com o de outro
     * projeto. Uma tela geral que os empilhasse convidaria a somar o que não soma.
     */
    nome: 'ProjetoIndicadores',
    rota: '/Projetos/:id/Indicadores',
    componente: ProjetoIndicadores,
    titulo: 'Indicadores',
    subtitulo: 'Plano de Monitoramento: clima, comunidade e biodiversidade',
    menuPai: 'Projetos',
    menu: null,
  },
];

export default paginas;

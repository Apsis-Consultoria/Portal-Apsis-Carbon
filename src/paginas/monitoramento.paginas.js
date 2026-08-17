import ProjetoMonitoramento from '@/pages/ProjetoMonitoramento';

/**
 * monitoramento.paginas.js - registro da tela do relatorio de monitoramento (issue #3).
 *
 * O agregador src/paginas/indice.js encontra este arquivo por import.meta.glob, entao
 * publicar a tela nao exigiu editar App.jsx, Layout.jsx nem paginas.config.js. A forma de
 * uma entrada esta documentada em src/paginas/nucleo.paginas.js.
 */
export const paginas = [
  {
    /**
     * Tela FILHA de Projetos, igual ao PDD: tem o shell, mas nao pode ter item de menu
     * proprio porque a rota depende do id do projeto (um item fixo apontaria para o ':id'
     * literal). `menuPai` mantem o item "Projetos" aceso enquanto esta tela esta aberta.
     *
     * O caminho usa 'Monitoramento' com M maiusculo para casar com o padrao das outras
     * rotas do registro ('/Projetos', '/Projetos/:id/PDD'), que sao capitalizadas.
     */
    nome: 'ProjetoMonitoramento',
    rota: '/Projetos/:id/Monitoramento',
    componente: ProjetoMonitoramento,
    titulo: 'Monitoramento',
    subtitulo: 'Capítulos do relatório de monitoramento',
    menuPai: 'Projetos',
    menu: null,
  },
];

export default paginas;

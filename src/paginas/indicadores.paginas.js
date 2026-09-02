import ProjetoIndicadores from '@/pages/ProjetoIndicadores';
import PlanoMonitoramento from '@/pages/PlanoMonitoramento';

/**
 * indicadores.paginas.js - registro das telas do Plano de Monitoramento.
 *
 * O agregador src/paginas/indice.js encontra este arquivo por import.meta.glob, então
 * publicar a tela não exigiu editar App.jsx, Layout.jsx nem paginas.config.js. A forma de
 * uma entrada está documentada em src/paginas/nucleo.paginas.js.
 *
 * DUAS PORTAS PARA A MESMA TELA, e nenhuma cópia de código entre elas.
 * `ProjetoIndicadores` recebe o projeto pela rota quando é filha de Projetos, e por
 * prop quando é o tópico. Duplicar as 598 linhas daria duas telas que divergem na
 * primeira correção feita só numa delas.
 */
export const paginas = [
  {
    /**
     * O TÓPICO, e a razão de ele existir contra o que este arquivo dizia antes.
     *
     * A versão anterior afirmava que não devia existir tela de Indicadores sem projeto,
     * porque "uma tela geral que os empilhasse convidaria a somar o que não soma". A
     * preocupação continua correta e esta tela não a viola: ela mostra UM projeto por
     * vez, igual à filha, e só oferece seletor quando há mais de um.
     *
     * O que o argumento errou foi o remédio. O Plano de Monitoramento é um documento
     * que a equipe procura pelo nome, não uma aba de projeto. Vivendo só dentro de
     * Projetos, ficava a dois cliques e um painel lateral, e o dono do sistema não o
     * encontrou duas vezes seguidas (31/08/2026). Navegação que o dono não acha é
     * navegação quebrada, por melhor que seja o argumento conceitual.
     *
     * `ordem: 6.5` deixa o tópico entre Metas (6) e Pipeline (7): meta interna e
     * indicador de Plano de Monitoramento são as duas coisas que se medem ao longo do
     * tempo, e se leem juntas; Pipeline é comercial e não tem relação.
     *
     * Decimal em vez de renumerar as outras dez entradas, que estão espalhadas por
     * nove arquivos. O sort do Layout é subtração numérica (`a.ordem - b.ordem`), então
     * 6.5 ordena certo. Usar 7 empatado com Pipeline funcionaria, mas o desempate é por
     * título e "Pipeline" vem antes de "Plano de Monitoramento" - o tópico cairia do
     * lado errado, longe de Metas.
     *
     * ÍCONE: 'BarChart3', que já está no mapa ICONES de src/Layout.jsx. O mapa é
     * explícito de propósito (import dinâmico por nome quebraria o tree-shaking).
     */
    nome: 'PlanoMonitoramento',
    rota: '/PlanoMonitoramento',
    componente: PlanoMonitoramento,
    titulo: 'Plano de Monitoramento',
    subtitulo: 'Indicadores de clima, comunidade e biodiversidade',
    menu: { icone: 'BarChart3', ordem: 6.5, grupo: null },
  },
  {
    /**
     * Tela FILHA de Projetos, igual ao PDD e ao Monitoramento: tem o shell, mas não pode
     * ter item de menu próprio porque a rota depende do id do projeto (um item fixo
     * apontaria para o ':id' literal). `menuPai` mantém "Projetos" aceso enquanto esta
     * tela está aberta.
     *
     * Continua existindo depois do tópico acima, e não é redundância: quem já está
     * olhando um projeto chega aqui sem trocar de contexto, e o botão no painel lateral
     * do projeto aponta para cá.
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

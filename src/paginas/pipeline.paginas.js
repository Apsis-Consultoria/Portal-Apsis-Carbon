import Pipeline from '@/pages/Pipeline';

/**
 * pipeline.paginas.js - registro da tela de prospecção de novos negócios (issue #13).
 *
 * O agregador src/paginas/indice.js encontra este arquivo por import.meta.glob, então
 * publicar a tela não exigiu editar App.jsx, Layout.jsx nem paginas.config.js. A forma de
 * uma entrada está documentada em src/paginas/nucleo.paginas.js.
 */
export const paginas = [
  {
    /**
     * TELA DE PRIMEIRO NÍVEL, e não filha de Projetos. O pipeline é o que existe ANTES
     * de haver projeto: uma área candidata só vira linha em carbon_projetos quando é
     * aprovada e convertida. Pendurá-la em Projetos sugeriria o contrário e obrigaria a
     * escolher um projeto para chegar a uma tela que fala de coisas que ainda não são
     * projeto.
     *
     * ORDEM 6 no menu: depois do bloco de execução (Projetos, Documentos, Atividades,
     * Findings) e antes de Reuniões e Fornecedores. É a leitura do ciclo comercial -
     * prospectar vem antes de contratar.
     *
     * ÍCONE: 'Target'. Os ícones Target, Goal, Briefcase e Coins foram acrescentados ao mapa
     * ICONES de src/Layout.jsx em 26/08/2026, na integração. O mapa é explícito de
     * propósito (import dinâmico por nome quebraria o tree-shaking), então nome novo
     * exige as duas linhas lá: o import e a chave.
     */
    nome: 'Pipeline',
    rota: '/Pipeline',
    componente: Pipeline,
    titulo: 'Pipeline',
    subtitulo: 'Prospecção de novos negócios e matriz de critérios',
    menu: { icone: 'Target', ordem: 7, grupo: null },
  },
];

export default paginas;

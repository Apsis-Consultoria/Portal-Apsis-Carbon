import Consultoria from '@/pages/Consultoria';

/**
 * consultoria.paginas.js - registro da tela do funil comercial da Consultoria.
 *
 * O agregador src/paginas/indice.js encontra este arquivo por import.meta.glob, então
 * publicar a tela não exige editar App.jsx, Layout.jsx nem paginas.config.js. A forma de
 * uma entrada está documentada em src/paginas/nucleo.paginas.js.
 */
export const paginas = [
  {
    /**
     * UMA TELA COM DUAS ABAS, e não duas telas de menu. Propostas e consultorias são dois
     * estágios do MESMO funil e a leitura útil é a passagem de um para o outro: quantas
     * propostas viraram trabalho. Separá-las em dois itens de menu (como Fornecedores e
     * Contratos, que são cadastros de públicos diferentes) esconderia justamente a
     * relação que dá sentido às duas.
     *
     * NÃO HÁ ABA DE OPORTUNIDADES. O primeiro estágio do funil está vazio no Notion: zero
     * registros, e a página não é editada há um ano. Por isso a migration também não criou
     * tabela para ele. Quando alguém confirmar que o estágio é usado, entram a tabela, a
     * rota e a terceira aba - inventar a estrutura agora seria desenhar um processo que
     * talvez não exista mais.
     *
     * ÍCONE: 'Briefcase'. Os ícones Target, Goal, Briefcase e Coins foram acrescentados ao mapa
     * ICONES de src/Layout.jsx em 26/08/2026, na integração. O mapa é explícito de
     * propósito (import dinâmico por nome quebraria o tree-shaking), então nome novo
     * exige as duas linhas lá: o import e a chave.
     * Reuniões já usa Handshake, e dois itens de menu com o mesmo ícone tiram do
     * ícone a função de distinguir.
     *
     * `ordem: 12`. A convenção da casa é usar o número da issue do domínio, e este não tem
     * uma: ele nasceu do levantamento do Notion. 12 põe o item logo depois de Contratos
     * (11), que fecha a faixa das issues #1 a #11, e antes do Secure Share (20), que já se
     * declarou fora dessa faixa.
     */
    nome: 'Consultoria',
    rota: '/Consultoria',
    componente: Consultoria,
    titulo: 'Consultoria',
    subtitulo: 'Funil comercial: propostas e consultorias contratadas',
    menu: { icone: 'Briefcase', ordem: 12, grupo: null },
  },
];

export default paginas;

import Credito from '@/pages/Credito';

/**
 * credito.paginas.js - registro da tela de crédito de carbono (issue #15).
 *
 * O agregador src/paginas/indice.js encontra este arquivo por import.meta.glob, então
 * publicar a tela não exige tocar em App.jsx, Layout.jsx nem paginas.config.js. A forma
 * de uma entrada está documentada em src/paginas/nucleo.paginas.js.
 *
 * `ordem: 15` = número da issue do domínio, convenção que os outros domínios já seguem:
 * mantém os itens do menu na sequência do backlog e evita disputa por número entre
 * frentes que rodam em paralelo.
 *
 * ÍCONE: 'Leaf'. Os ícones Target, Goal, Briefcase e Coins foram acrescentados ao mapa
     * ICONES de src/Layout.jsx em 26/08/2026, na integração. O mapa é explícito de
     * propósito (import dinâmico por nome quebraria o tree-shaking), então nome novo
     * exige as duas linhas lá: o import e a chave.
 *
 * UMA TELA E NÃO TRÊS. Compradores, estoque e vendas são três abas da mesma página, e
 * não três itens de menu, porque as três respondem à MESMA pergunta em recortes
 * diferentes: quanto do crédito emitido já foi comercializado. Separar em telas
 * obrigaria a repetir a faixa de conciliação em cada uma, ou pior, a deixá-la só numa
 * delas e forçar a navegação para conferir um número.
 */
export const paginas = [
  {
    nome: 'Credito',
    rota: '/Credito',
    componente: Credito,
    titulo: 'Crédito de carbono',
    subtitulo: 'Emissão, estoque por safra e comercialização',
    menu: { icone: 'Leaf', ordem: 15, grupo: null },
  },
];

export default paginas;

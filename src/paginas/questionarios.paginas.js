import Questionarios from '@/pages/Questionarios';
import QuestionarioLista from '@/pages/QuestionarioLista';
import QuestionarioForm from '@/pages/QuestionarioForm';

/**
 * questionarios.paginas.js - registro do tópico Questionários.
 *
 * O agregador src/paginas/indice.js encontra este arquivo por import.meta.glob,
 * então publicar as telas não exigiu editar App.jsx nem paginas.config.js. A
 * forma de uma entrada está documentada em src/paginas/nucleo.paginas.js.
 *
 * TRÊS TELAS E UM ITEM DE MENU, e não quatro itens fixos. O pedido foi "um
 * tópico chamado Questionários e cada tipo dos quatro seria uma tela", e são
 * quatro hoje - com mais por vir. Quatro itens fixos no menu empurrariam o resto
 * para baixo e teriam de virar cinco, seis, no braço, a cada formulário novo.
 * Com o hub, o menu ganha UM item e a lista de formulários vem do banco:
 * questionário novo aparece sozinho, sem deploy do frontend.
 *
 * `menuPai` mantém o item "Questionários" aceso enquanto a lista de um tipo ou o
 * formulário estão abertos - mesmo mecanismo que o PDD usa para manter
 * "Projetos" aceso.
 *
 * ROTA COM PARÂMETRO NÃO PODE TER `menu`: não existe URL fixa para o item. Por
 * isso só a primeira das três tem entrada de menu.
 *
 * `ordem: 8` deixa o tópico depois de Metas (6) e antes de Reuniões (9):
 * questionário de campo é o registro que alimenta as metas e vira evidência das
 * reuniões de consulta, então se lê entre os dois.
 *
 * ÍCONE: 'ClipboardList', que já está no mapa ICONES de src/Layout.jsx. O mapa é
 * explícito de propósito (import dinâmico por nome quebraria o tree-shaking),
 * então nome novo exigiria duas linhas lá - este não exige.
 */
export const paginas = [
  {
    nome: 'Questionarios',
    rota: '/Questionarios',
    componente: Questionarios,
    titulo: 'Questionários',
    subtitulo: 'Formulários aplicados em campo',
    menu: { icone: 'ClipboardList', ordem: 8, grupo: null },
  },
  {
    nome: 'QuestionarioLista',
    rota: '/Questionarios/:tipo',
    componente: QuestionarioLista,
    titulo: 'Questionários',
    subtitulo: 'Preenchimentos anteriores',
    menuPai: 'Questionarios',
    menu: null,
  },
  {
    /**
     * `:id` aceita o literal 'novo' além de um uuid, e é a tela que decide o que
     * fazer com isso. Uma rota separada '/Questionarios/:tipo/novo' seria mais
     * explícita e criaria um problema real: o formulário precisa trocar a URL
     * para a do registro logo depois de criar (senão recarregar a página abre um
     * formulário em branco por cima do que foi salvo), e trocar de rota no meio
     * do preenchimento remontaria o componente e perderia o estado.
     */
    nome: 'QuestionarioForm',
    rota: '/Questionarios/:tipo/:id',
    componente: QuestionarioForm,
    titulo: 'Questionário',
    subtitulo: 'Preenchimento do formulário de campo',
    menuPai: 'Questionarios',
    menu: null,
  },
];

export default paginas;

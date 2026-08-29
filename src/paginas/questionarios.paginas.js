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
 * UM TÓPICO QUE ABRE EM SUBITENS, um por formulário. `menu.submenu` diz ao
 * Layout que este item tem filhos e de onde carregá-los; a lista vem do banco,
 * não daqui. Escrever os quatro como entradas fixas neste arquivo seria mais
 * simples de ler e perderia o ponto do desenho: questionário novo é um seed, e
 * com itens fixos passaria a exigir deploy do frontend também.
 *
 * A primeira versão desta tela (27/08/2026) tinha um hub com quatro cartões em
 * vez de subitens no menu. Estava errado: o pedido era "cada tipo dos quatro
 * seria uma tela" dentro de um tópico, e um cartão a mais para clicar antes de
 * chegar ao formulário é exatamente o passo que a navegação lateral existe para
 * eliminar. O hub continua existindo como a tela do próprio tópico, para quem
 * clica no pai e para o estado colapsado da sidebar.
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
    menu: { icone: 'ClipboardList', ordem: 8, grupo: null, submenu: 'questionarios' },
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
    /* SEM O SHELL, e esta e a unica tela do sistema assim por escolha de uso e
       nao por ser tela de erro. O preenchimento acontece no celular, em aldeia:
       a barra lateral e a topbar comem um terco da altura util, e a pergunta
       precisa dessa altura. A volta e o botao de fechar do proprio cabecalho do
       wizard, como no EPO. */
    shell: false,
    menuPai: 'Questionarios',
    menu: null,
  },
];

export default paginas;

import AcessoBloqueado from '@/pages/AcessoBloqueado';
import BoasVindas from '@/pages/BoasVindas';
import Projetos from '@/pages/Projetos';
import ProjetoPdd from '@/pages/ProjetoPdd';
import NaoAutorizado from '@/pages/NaoAutorizado';
import PaginaNaoEncontrada from '@/pages/PaginaNaoEncontrada';

/**
 * nucleo.paginas.js - telas de estrutura do Apsis Carbon.
 *
 * Este e o arquivo de registro do dominio "nucleo". Um dominio novo NAO edita este
 * arquivo nem o App.jsx: cria o proprio `src/paginas/<dominio>.paginas.js` exportando
 * `export const paginas = [...]`, e o agregador src/paginas/indice.js encontra sozinho.
 *
 * FORMA DE UMA ENTRADA (campos opcionais tem default aplicado em src/paginas.config.js):
 *
 *   {
 *     nome: 'Projetos',                 // OBRIGATORIO. Chave unica. Vira o
 *                                       // currentPageName do Layout e a chave de
 *                                       // PAGE_ROUTES / createPageUrl.
 *     rota: '/Projetos',                // OBRIGATORIO para telas roteadas. Aceita
 *                                       // parametro ('/Projetos/:id/PDD'). null =
 *                                       // tela sem rota propria (ver AcessoBloqueado).
 *     componente: Projetos,             // OBRIGATORIO. Componente ja importado.
 *     titulo: 'Projetos',               // topbar e rotulo do item de menu. Default: nome.
 *     subtitulo: '...',                 // topbar. Default: 'Apsis Carbon'.
 *     shell: true,                      // false = tela cheia, sem sidebar/topbar.
 *     curinga: false,                   // true = registrada tambem como path="*" (404).
 *     menuPai: null,                    // nome da pagina cujo item de menu deve
 *                                       // acender quando esta tela esta aberta.
 *     menu: { icone: 'FolderTree', ordem: 2, grupo: null },  // null = fora do menu.
 *   }
 *
 * Regras que valem para todas as telas:
 *   - nenhuma tela renderiza <h1> de titulo proprio; o titulo sai da topbar, daqui;
 *   - rota COM parametro nao pode ter `menu` (nao existe URL fixa para o item);
 *   - o icone e o NOME de um icone do lucide-react registrado no mapa ICONES do
 *     src/Layout.jsx. Nome desconhecido cai no fallback e nunca derruba o menu.
 */
export const paginas = [
  {
    nome: 'BoasVindas',
    rota: '/BoasVindas',
    componente: BoasVindas,
    titulo: 'Boas-Vindas',
    subtitulo: 'Apsis Carbon',
    menu: { icone: 'Home', ordem: 1, grupo: null },
  },
  {
    /**
     * POR QUE "Projetos" TEM ITEM FIXO NO MENU: carbon_modulos esta vazia enquanto os
     * modulos de negocio nao sao definidos, entao um item que so viesse do banco
     * deixaria esta tela inalcancavel pelo menu - so por URL digitada a mao.
     */
    nome: 'Projetos',
    rota: '/Projetos',
    componente: Projetos,
    titulo: 'Projetos',
    subtitulo: 'Cadastro dos projetos de carbono',
    menu: { icone: 'FolderTree', ordem: 2, grupo: null },
  },
  {
    /**
     * PDD e tela FILHA de Projetos: tem o shell, mas nao tem item de menu proprio
     * (a rota depende do id do projeto). `menuPai` mantem o item "Projetos" aceso
     * enquanto o PDD esta aberto.
     */
    nome: 'ProjetoPdd',
    rota: '/Projetos/:id/PDD',
    componente: ProjetoPdd,
    titulo: 'PDD',
    subtitulo: 'Capítulos do Project Design Document',
    menuPai: 'Projetos',
    menu: null,
  },
  {
    // Tela cheia, sem shell: quem cai aqui nao passou na checagem de dominio.
    nome: 'NaoAutorizado',
    rota: '/NaoAutorizado',
    componente: NaoAutorizado,
    titulo: 'Acesso não autorizado',
    subtitulo: 'Apsis Carbon',
    shell: false,
    menu: null,
  },
  {
    /**
     * 404 tambem sem shell, para nao sugerir navegacao que nao existe.
     *
     * `rota` e `curinga` convivem de proposito: a rota registrada no React Router e
     * o path="*" (por isso curinga: true), mas o caminho '/PaginaNaoEncontrada'
     * continua declarado para o createPageUrl saber montar a URL desta tela.
     */
    nome: 'PaginaNaoEncontrada',
    rota: '/PaginaNaoEncontrada',
    componente: PaginaNaoEncontrada,
    titulo: 'Página não encontrada',
    subtitulo: 'Apsis Carbon',
    shell: false,
    curinga: true,
    menu: null,
  },
  {
    /**
     * AcessoBloqueado nao e uma ROTA: quem a renderiza e o GuardaDeSessao do
     * src/App.jsx, trocando a arvore inteira quando uma query devolve
     * 'interacao_necessaria', 'nao_autenticado' ou 'usuario_inativo'. Ela precisa do
     * prop `motivo`, que rota nenhuma saberia passar - por isso `rota: null`, e o
     * App.jsx ignora entradas sem rota.
     *
     * Esta listada aqui para o registro documentar TODAS as telas do sistema, e nao
     * apenas as alcancaveis por URL.
     */
    nome: 'AcessoBloqueado',
    rota: null,
    componente: AcessoBloqueado,
    titulo: 'Acesso bloqueado',
    subtitulo: 'Apsis Carbon',
    shell: false,
    menu: null,
  },
];

export default paginas;

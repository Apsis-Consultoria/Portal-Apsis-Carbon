import SecureShare from '@/pages/SecureShare';
import SecureShareProjeto from '@/pages/SecureShareProjeto';
import SecureShareGeral from '@/pages/SecureShareGeral';

/**
 * secureshare.paginas.js - registro das telas do Secure Share.
 *
 * Arquivo PROPRIO do dominio: o agregador src/paginas/indice.js encontra este
 * arquivo por import.meta.glob, portanto publicar estas duas telas nao exige
 * tocar em App.jsx, Layout.jsx nem paginas.config.js. A forma de uma entrada
 * esta documentada em src/paginas/nucleo.paginas.js.
 *
 * ICONE: 'ShieldCheck', do mapa ICONES do src/Layout.jsx. O Portal Apsis usa
 * Share2 nesta tela, mas Share2 nao esta no mapa do Carbon, e nome desconhecido
 * cai no fallback silenciosamente. ShieldCheck e o mais proximo do que a tela
 * faz: acesso controlado, nao compartilhamento aberto.
 */
export const paginas = [
  {
    nome: 'SecureShare',
    rota: '/SecureShare',
    componente: SecureShare,
    titulo: 'Secure Share',
    subtitulo: 'Envie arquivos e libere acesso seguro para clientes',
    // ordem 20: depois dos dominios das issues #1 a #11, que usam o numero da
    // propria issue como ordem.
    menu: { icone: 'ShieldCheck', ordem: 20, grupo: null },
  },
  {
    /**
     * A pasta Geral, compartilhada com todos os clientes.
     *
     * ROTA ESTATICA, e ela CONVIVE com /SecureShare/:id logo abaixo: o React
     * Router 6 ranqueia por especificidade e nao pela ordem de declaracao, e um
     * segmento fixo ganha de um dinamico. Entao /SecureShare/Geral cai aqui, e
     * nao na tela de projeto tentando abrir um projeto de id "Geral".
     *
     * Sem item de menu proprio: ela e a primeira coisa da tela de lista, que e
     * onde a pessoa naturalmente chega. Um segundo item de menu para uma pasta
     * so competiria com o do dominio.
     */
    nome: 'SecureShareGeral',
    rota: '/SecureShare/Geral',
    componente: SecureShareGeral,
    titulo: 'Pasta Geral',
    subtitulo: 'Visível para todos os clientes',
    menuPai: 'SecureShare',
    menu: null,
  },
  {
    /**
     * Tela FILHA: tem o shell, mas nao tem item de menu proprio (a rota depende
     * do id do projeto). `menuPai` mantem o item "Secure Share" aceso enquanto o
     * projeto esta aberto.
     */
    nome: 'SecureShareProjeto',
    rota: '/SecureShare/:id',
    componente: SecureShareProjeto,
    titulo: 'Projeto compartilhado',
    subtitulo: 'Arquivos, acessos e permissões',
    menuPai: 'SecureShare',
    menu: null,
  },
];

export default paginas;

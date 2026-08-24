import SecureShare from '@/pages/SecureShare';
import SecureShareProjeto from '@/pages/SecureShareProjeto';

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

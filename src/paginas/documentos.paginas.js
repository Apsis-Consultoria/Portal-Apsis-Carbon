import Documentos from '@/pages/Documentos';

/**
 * documentos.paginas.js - registro da tela do domínio Documentos (issue #6).
 *
 * O agregador src/paginas/indice.js encontra este arquivo por import.meta.glob, então
 * publicar a tela não exige tocar em App.jsx, Layout.jsx nem paginas.config.js. A forma
 * de uma entrada está documentada em src/paginas/nucleo.paginas.js.
 *
 * SEM ROTA POR PROJETO, de propósito. O documento é a única entidade do sistema que
 * também existe SEM projeto (modelo de contrato, SOP, procedimento interno: a coluna
 * projeto_id é anulável), então uma rota '/Projetos/:id/Documentos' deixaria essa
 * metade do acervo sem endereço. A tela é uma só e filtra por projeto, com a opção
 * "sem projeto" no mesmo seletor. Consequência: existe item fixo no menu, e não
 * `menuPai`.
 *
 * `ordem: 3` deixa o item logo depois de Projetos (ordem 2), que é a leitura natural:
 * o documento pendura no projeto.
 */
export const paginas = [
  {
    nome: 'Documentos',
    rota: '/Documentos',
    componente: Documentos,
    titulo: 'Documentos',
    subtitulo: 'Acervo único de documentos por projeto',
    // FileText já está no mapa ICONES do src/Layout.jsx: nome fora do mapa cairia no
    // fallback e o item nasceria com o ícone de outra coisa.
    menu: { icone: 'FileText', ordem: 3, grupo: null },
  },
];

export default paginas;

import Fornecedores from '@/pages/Fornecedores';
import Contratos from '@/pages/Contratos';

/**
 * fornecedores.paginas.js - registro das telas do dominio de fornecedores
 * (issues #10 e #11).
 *
 * O agregador src/paginas/indice.js encontra este arquivo por import.meta.glob,
 * entao publicar as telas nao exige tocar em App.jsx, Layout.jsx nem
 * paginas.config.js. A forma de uma entrada esta documentada em
 * src/paginas/nucleo.paginas.js.
 *
 * Os nomes de icone sao chaves do mapa ICONES de src/Layout.jsx (nome desconhecido
 * cai no fallback e nunca derruba o menu).
 *
 * `ordem` = numero da issue do dominio, convencao que os outros dominios ja seguem:
 * mantem os itens do menu na mesma sequencia do backlog e evita disputa por numero
 * entre frentes que rodam em paralelo.
 *
 * DUAS TELAS E NAO UMA. Fornecedores e cadastro (quem presta o servico); Contratos e
 * o financeiro (o que foi contratado e as parcelas a pagar). Sao publicos
 * diferentes: quem cadastra fornecedor nao e necessariamente quem baixa parcela.
 * Juntar as duas numa tela unica produziria uma pagina com dois assuntos e nenhum
 * foco - e as parcelas, que sao o volume, ficariam escondidas atras de um
 * fornecedor selecionado.
 */
export const paginas = [
  {
    nome: 'Fornecedores',
    rota: '/Fornecedores',
    componente: Fornecedores,
    titulo: 'Fornecedores',
    subtitulo: 'Cadastro e status de contratação dos fornecedores',
    menu: { icone: 'Users', ordem: 10, grupo: null },
  },
  {
    nome: 'Contratos',
    rota: '/Contratos',
    componente: Contratos,
    titulo: 'Contratos e parcelas',
    subtitulo: 'Contratações, obrigações financeiras e vencimentos',
    menu: { icone: 'FileCheck2', ordem: 11, grupo: null },
  },
];

export default paginas;

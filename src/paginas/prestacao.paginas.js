import PrestacaoPainel from '@/pages/PrestacaoPainel';
import PrestacaoAntecipacoes from '@/pages/PrestacaoAntecipacoes';
import PrestacaoLancamentos from '@/pages/PrestacaoLancamentos';
import PrestacaoComprovantes from '@/pages/PrestacaoComprovantes';
import PrestacaoCadastros from '@/pages/PrestacaoCadastros';
import PrestacaoAtividades from '@/pages/PrestacaoAtividades';

/**
 * prestacao.paginas.js - o tópico Prestação de contas e os cinco subtópicos.
 *
 * A PARTIR DE 01/09/2026 A EQUIPE DEIXA O EXCEL e alimenta o portal. Os
 * subtópicos cobrem, um a um, o que a planilha fazia:
 *
 *   Painel        a leitura gerencial que os SUMIFS das abas ocultas davam,
 *                 mais a gestão de ciclos (abrir, editar, fechar)
 *   Repasses      as linhas de Receita do razão e a matriz da aba Resumo
 *   Despesas      as linhas de Despesa das abas de período
 *   Comprovantes  a aba "Base de dados": cada PIX e recibo, um a um
 *   Cadastros     a aba de domínios ("TA"): aldeias e eixos
 *
 * NÃO É "uma aba da planilha = uma tela": das 25 abas, a maioria é rascunho ou
 * motor de cálculo, e uma oculta guarda DUAS repartições divergentes do mesmo
 * total. As telas reproduzem o PROCESSO que as abas boas descrevem, não a
 * estrutura do arquivo.
 *
 * ATIVIDADES continua no tópico Atividades que já existe: um segundo lugar para
 * a mesma coisa faria alguém lançar em um e procurar no outro.
 *
 * O GRUPO E O CICLO VIVEM NA QUERY STRING (`?grupo=&ciclo=`), e não na rota:
 * trocar de subtópico não pode perder a escolha, e rota com parâmetro não pode
 * ter item de menu (apontaria para o ':grupo' literal). Ver o cabeçalho de
 * src/components/prestacao/ContextoPrestacao.jsx.
 */
export const paginas = [
  {
    /**
     * O PAI do submenu, e também uma tela de verdade: clicar no tópico abre o
     * painel; o chevron abre os filhos.
     *
     * `ordem: 6.7` fica entre o Plano de Monitoramento (6.5) e Pipeline (7):
     * indicador e prestação de contas são as duas prestações que o projeto deve
     * à validadora, e se leem juntas.
     *
     * `submenu: 'prestacao'` diz ao Layout que este item tem filhos; a lista é
     * FIXA em CARREGADORES_SUBMENU (src/Layout.jsx), porque os subtópicos são o
     * processo, não um cadastro que cresce.
     */
    nome: 'PrestacaoContas',
    rota: '/PrestacaoContas',
    componente: PrestacaoPainel,
    titulo: 'Prestação de contas',
    subtitulo: 'Visão gerencial: repassado, declarado e o que o extrato comprova',
    menu: { icone: 'Coins', ordem: 6.7, grupo: null, submenu: 'prestacao' },
  },
  {
    nome: 'PrestacaoAntecipacoes',
    rota: '/PrestacaoContas/Repasses',
    componente: PrestacaoAntecipacoes,
    titulo: 'Repasses',
    subtitulo: 'Antecipação de recursos ao grupo comunitário',
    menuPai: 'PrestacaoContas',
    menu: null,
  },
  {
    nome: 'PrestacaoLancamentos',
    rota: '/PrestacaoContas/Despesas',
    componente: PrestacaoLancamentos,
    titulo: 'Despesas declaradas',
    subtitulo: 'O que a comunidade declarou, por aldeia e por eixo',
    menuPai: 'PrestacaoContas',
    menu: null,
  },
  {
    nome: 'PrestacaoComprovantes',
    rota: '/PrestacaoContas/Comprovantes',
    componente: PrestacaoComprovantes,
    titulo: 'Comprovantes',
    subtitulo: 'O extrato digitado: cada PIX e cada recibo',
    menuPai: 'PrestacaoContas',
    menu: null,
  },
  {
    /**
     * A terceira planilha da operacao: o diario de atividades por Monitoring
     * Report. Mora aqui, e nao no topico Atividades, porque aquele e o quadro
     * de tarefas interno da equipe; este e o registro historico que vira anexo
     * do MR - misturar os dois faria tarefa interna aparecer no relatorio.
     */
    nome: 'PrestacaoAtividades',
    rota: '/PrestacaoContas/Atividades',
    componente: PrestacaoAtividades,
    titulo: 'Atividades de campo',
    subtitulo: 'O diário que alimenta o Monitoring Report',
    menuPai: 'PrestacaoContas',
    menu: null,
  },
  {
    nome: 'PrestacaoCadastros',
    rota: '/PrestacaoContas/Cadastros',
    componente: PrestacaoCadastros,
    titulo: 'Aldeias e eixos',
    subtitulo: 'Os domínios que eram a aba TA da planilha',
    menuPai: 'PrestacaoContas',
    menu: null,
  },
];

export default paginas;

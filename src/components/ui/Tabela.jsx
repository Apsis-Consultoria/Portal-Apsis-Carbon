/**
 * Tabela - listagem com os quatro estados resolvidos: carregando, erro, vazio e dados.
 *
 * Os três estados de exceção têm visual PRÓPRIO e substituem a tabela inteira, em vez
 * de aparecerem como uma linha dentro dela. É o padrão das telas de referência, e o
 * motivo é prático: cabeçalho de coluna sobre um bloco de erro sugere que existem
 * dados carregados que simplesmente não apareceram.
 *
 * ROLAGEM HORIZONTAL: a tabela vive dentro de um `overflow-x-auto` e as colunas usam
 * `min-w` em vez de largura fixa. Em tela estreita, a tabela rola dentro do cartão e o
 * layout da página não estoura. O invólucro tem `tabIndex={0}` e rótulo próprio quando
 * há rolagem, porque uma região rolável precisa ser alcançável pelo teclado.
 *
 * ACESSIBILIDADE: `legenda` é obrigatória na prática (vira <caption> visualmente
 * escondida), é ela que diz a quem usa leitor de tela o que a tabela lista. Linha
 * clicável recebe `tabIndex`, `aria-label` e tratamento de Enter e Espaço - sem isso
 * a navegação por teclado não alcança a ação da linha.
 *
 * E NÃO recebe `role="button"`, o que mudou em 26/08/2026: aquele papel SUBSTITUÍA o
 * papel implícito de linha, e o leitor de tela deixava de anunciar a posição e de
 * associar célula a cabeçalho. Numa tela onde a informação está no cruzamento, isso
 * apagava a tabela inteira para quem depende do leitor, em troca de dizer "botão".
 */

import { WifiOff } from 'lucide-react';
import { CLASSE_CARTAO } from './Cartao';
import Carregando from './Carregando';
import EstadoVazio from './EstadoVazio';

const ALINHAMENTOS = {
  esquerda: 'text-left',
  centro: 'text-center',
  direita: 'text-right',
};

/** Converte `larguraMinima` (número em px ou string CSS) em style. */
function estiloColuna(coluna) {
  const min = coluna?.larguraMinima;
  if (min === undefined || min === null || min === '') return undefined;
  return { minWidth: typeof min === 'number' ? `${min}px` : String(min) };
}

/**
 * @typedef {object} Coluna
 * @property {string} chave caminho simples da propriedade da linha; também é a key da célula
 * @property {React.ReactNode} titulo texto do cabeçalho
 * @property {'esquerda'|'centro'|'direita'} [alinhamento='esquerda']
 * @property {number|string} [larguraMinima] px (número) ou valor CSS ('12rem')
 * @property {(linha: object, indice: number) => React.ReactNode} [render] conteúdo da
 *           célula; sem ele a célula mostra `linha[chave]` (nulo e vazio viram '-')
 * @property {string} [classeCelula] classes extras na célula do corpo
 * @property {boolean} [numerica] usa tabular-nums e alinha à direita por padrão
 */

/**
 * @param {object} props
 * @param {Coluna[]} props.colunas
 * @param {object[]} props.dados
 * @param {string} props.legenda descrição da tabela para leitor de tela
 * @param {(linha: object, indice: number) => string} [props.chaveLinha] padrão: linha.id
 * @param {boolean} [props.carregando=false]
 * @param {string} [props.rotuloCarregando='Carregando registros']
 * @param {boolean|Error|string} [props.erro=false]
 * @param {string} [props.mensagemErro] texto do estado de erro
 * @param {React.ComponentType} [props.iconeVazio]
 * @param {string} [props.tituloVazio='Nenhum registro']
 * @param {React.ReactNode} [props.textoVazio]
 * @param {React.ReactNode} [props.acaoVazio] botão do estado vazio
 * @param {React.ReactNode} [props.vazio] substitui por completo o estado vazio padrão
 * @param {(linha: object, indice: number) => void} [props.onLinhaClick]
 * @param {(linha: object, indice: number) => string} [props.rotuloLinha] rótulo
 *        acessível da linha clicável, ex.: (p) => `Abrir ${p.nome}`
 * @param {(linha: object, indice: number) => string} [props.classeLinha] classes por
 *        linha, para esmaecer registro inativo por exemplo
 * @param {React.ReactNode} [props.rodape] bloco abaixo da tabela, dentro do cartão
 * @param {boolean} [props.comSuperficie=true] desenha o cartão branco em volta; passe
 *        false quando a tabela já está dentro de um Cartao
 * @param {string} [props.className]
 */
export default function Tabela({
  colunas = [],
  dados = [],
  legenda,
  chaveLinha,
  carregando = false,
  rotuloCarregando = 'Carregando registros',
  erro = false,
  mensagemErro = 'Não foi possível carregar os registros agora. Se o aviso continuar, avise a equipe responsável pelo sistema.',
  iconeVazio,
  tituloVazio = 'Nenhum registro',
  textoVazio,
  acaoVazio,
  vazio,
  onLinhaClick,
  rotuloLinha,
  classeLinha,
  rodape,
  comSuperficie = true,
  className = '',
}) {
  const superficie = comSuperficie ? CLASSE_CARTAO : '';

  /* ===== Estados de exceção, na ordem em que importam ===== */

  if (carregando) {
    return (
      <div className={`${superficie} overflow-hidden ${className}`} aria-busy="true">
        <Carregando rotulo={rotuloCarregando} />
      </div>
    );
  }

  if (erro) {
    return (
      <div className={`${superficie} overflow-hidden ${className}`}>
        {/* role="alert" para a falha ser anunciada, e sem prometer que recarregar
            resolve: sessão expirada e acesso suspenso têm tela própria. */}
        <div role="alert" className="flex items-start gap-2 px-5 py-8 text-xs text-[#5C7060]">
          <WifiOff size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span className="leading-relaxed">
            {typeof erro === 'string' ? erro : mensagemErro}
          </span>
        </div>
      </div>
    );
  }

  if (!dados.length) {
    return (
      <div className={`${superficie} overflow-hidden ${className}`}>
        {vazio ?? (
          <EstadoVazio
            icone={iconeVazio}
            titulo={tituloVazio}
            texto={textoVazio}
            acao={acaoVazio}
          />
        )}
      </div>
    );
  }

  /* ===== Dados ===== */

  const aoTeclarNaLinha = (evento, linha, indice) => {
    if (!onLinhaClick) return;
    // Espaço e Enter são o contrato de teclado esperado de qualquer elemento que
    // aja como controle. O preventDefault no Espaço evita a página rolar junto.
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      onLinhaClick(linha, indice);
    }
  };

  return (
    <div className={`${superficie} overflow-hidden ${className}`}>
      <div
        className="overflow-x-auto"
        // Região rolável precisa receber foco para ser rolável pelo teclado. O papel de
        // grupo com rótulo evita que o leitor de tela anuncie uma parada sem nome.
        tabIndex={0}
        role="group"
        aria-label={legenda ? `${legenda} (tabela rolável na horizontal)` : 'Tabela rolável na horizontal'}
      >
        <table className="w-full border-collapse">
          {legenda && <caption className="sr-only">{legenda}</caption>}
          <thead>
            <tr className="border-b border-[#F4F6F4]">
              {colunas.map((coluna) => {
                const alinhamento =
                  ALINHAMENTOS[coluna.alinhamento] ||
                  (coluna.numerica ? ALINHAMENTOS.direita : ALINHAMENTOS.esquerda);
                return (
                  <th
                    key={coluna.chave}
                    scope="col"
                    style={estiloColuna(coluna)}
                    className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#5C7060] whitespace-nowrap ${alinhamento}`}
                  >
                    {coluna.titulo}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F6F4]">
            {dados.map((linha, indice) => {
              const clicavel = Boolean(onLinhaClick);
              return (
                <tr
                  key={chaveLinha ? chaveLinha(linha, indice) : (linha?.id ?? `linha-${indice}`)}
                  onClick={clicavel ? () => onLinhaClick(linha, indice) : undefined}
                  onKeyDown={clicavel ? (evento) => aoTeclarNaLinha(evento, linha, indice) : undefined}
                  /* SEM role="button" aqui, e isso mudou em 26/08/2026.
                     `role="button"` SUBSTITUI o papel implícito de linha: o leitor
                     de tela deixa de anunciar "linha 3 de 20", perde a associação
                     entre célula e cabeçalho e a pessoa não consegue mais navegar a
                     tabela por coluna. Numa tela como Contratos, onde a informação
                     está justamente no cruzamento, isso apaga a tabela inteira para
                     quem depende do leitor - em troca de anunciar "botão".
                     `tabIndex` e `onKeyDown` sozinhos já dão o acesso por teclado e
                     preservam a semântica; o rótulo abaixo é que diz o que a tecla
                     Enter faz. */
                  tabIndex={clicavel ? 0 : undefined}
                  aria-label={clicavel && rotuloLinha ? rotuloLinha(linha, indice) : undefined}
                  className={`transition-colors ${clicavel ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1A4731]/30' : ''} hover:bg-[#F4F6F4]/60 ${classeLinha ? classeLinha(linha, indice) : ''}`}
                >
                  {colunas.map((coluna) => {
                    const alinhamento =
                      ALINHAMENTOS[coluna.alinhamento] ||
                      (coluna.numerica ? ALINHAMENTOS.direita : ALINHAMENTOS.esquerda);
                    const bruto = linha?.[coluna.chave];
                    const conteudo = coluna.render
                      ? coluna.render(linha, indice)
                      : bruto === null || bruto === undefined || bruto === ''
                        ? '-'
                        : bruto;
                    return (
                      <td
                        key={coluna.chave}
                        style={estiloColuna(coluna)}
                        className={`px-4 py-3 text-xs text-[#1A2B1F] align-top ${alinhamento} ${coluna.numerica ? 'tabular-nums' : ''} ${coluna.classeCelula || ''}`}
                      >
                        {conteudo}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rodape && <div className="px-5 py-3 border-t border-[#F4F6F4] bg-[#F4F6F4]/40">{rodape}</div>}
    </div>
  );
}

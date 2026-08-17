/**
 * indice.js - agregador dos registros de pagina.
 *
 * Junta o array exportado por TODOS os arquivos `src/paginas/*.paginas.js`. E isto que
 * permite a um dominio novo publicar a tela dele criando UM arquivo, sem tocar em
 * nenhum arquivo compartilhado (nem App.jsx, nem Layout.jsx, nem este).
 *
 * POR QUE import.meta.glob COM { eager: true }:
 *   - o glob e resolvido pelo VITE em tempo de build, olhando o disco. Nao e leitura de
 *     diretorio em runtime (que nao existe no navegador) nem require dinamico;
 *   - `eager: true` transforma cada arquivo encontrado em um import ESTATICO no bundle.
 *     Sem isso, cada modulo viraria uma funcao que devolve Promise, o registro de
 *     paginas passaria a ser assincrono e o App.jsx precisaria de Suspense so para
 *     montar as rotas - complexidade grande para ganho nenhum, ja que o componente de
 *     toda tela registrada e necessario logo no primeiro render de qualquer rota;
 *   - as chaves do objeto devolvido vem em ordem alfabetica de caminho, portanto o
 *     resultado e deterministico entre builds. A ordem final de exibicao nao depende
 *     disso: quem ordena e src/paginas.config.js, por menu.ordem e depois por titulo.
 *
 * O caminho do glob e um LITERAL de proposito. Vite exige literal estatico; montar o
 * padrao a partir de variavel faz o glob resolver para vazio em silencio - o registro
 * ficaria sem nenhuma pagina e o app abriria so com o 404.
 */
const MODULOS = import.meta.glob('./*.paginas.js', { eager: true });

/**
 * Aceitamos `export const paginas` (preferido, mais legivel no import) e `export
 * default`. Arquivo que exporta outra coisa e ignorado com aviso no console, e nao
 * derruba o boot: uma tela nova mal registrada nao pode apagar o sistema inteiro.
 */
function extrair(caminho, modulo) {
  const bruto = modulo?.paginas ?? modulo?.default;
  if (Array.isArray(bruto)) return bruto;

  console.warn(
    `[Apsis Carbon] ${caminho} nao exporta um array de paginas. ` +
      'Use "export const paginas = [...]". O arquivo foi ignorado.',
  );
  return [];
}

/** Entradas na ordem de descoberta, ainda SEM defaults aplicados nem ordenacao. */
export const PAGINAS_BRUTAS = Object.entries(MODULOS).flatMap(([caminho, modulo]) =>
  extrair(caminho, modulo),
);

export default PAGINAS_BRUTAS;

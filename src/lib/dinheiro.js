/**
 * O par formatar/interpretar dos campos de dinheiro, em pt-BR.
 *
 * -----------------------------------------------------------------------------
 * OS DOIS MORAM JUNTOS DE PROPÓSITO, E ISSO JÁ MULTIPLICOU VALOR EM QUATRO TELAS
 * -----------------------------------------------------------------------------
 * Até 02/09/2026, cada formulário da prestação de contas abria a edição com
 * `String(linha.valor)` - que em JavaScript sai com PONTO decimal, `"1425.5"` -
 * e salvava com um interpretador pt-BR que apagava todo ponto, por considerá-lo
 * separador de milhar. Abrir um lançamento de R$ 1.425,50 e salvar sem tocar no
 * campo gravava R$ 14.255,00.
 *
 * O fator dependia dos decimais: 100 com dois, 10 com um, e NADA com valor
 * inteiro. Foi por isso que passou em toda conferência manual - quem testa digita
 * 1000, não 1425,50.
 *
 * A lição não é "corrigir o parser". É que formatar e interpretar são um par, e
 * mantê-los em quatro arquivos diferentes garante que um dia divergem. Num campo
 * de dinheiro, use sempre estes dois. Nunca `String(valor)`.
 *
 * Arquivo sem JSX e sem React de propósito: assim scripts/verificar-dinheiro.mjs
 * consegue importar e testar as duas funções sem montar árvore de componente.
 */

/** Número do banco -> texto do campo. Sempre duas casas, sempre vírgula. */
export function paraCampoValor(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(2).replace('.', ',');
}

/**
 * Texto do campo -> número. Devolve null quando não dá para interpretar, e nunca
 * NaN: NaN atravessa validação de `if (!valor)` e chega no banco como null ou
 * como erro de tipo, longe de onde nasceu.
 *
 * Aceita "1.425,50", "1425,50" e "1425.50". O último é ambíguo por natureza, e a
 * regra escolhida é: ponto vale como decimal só quando é o ÚNICO separador e
 * sobram uma ou duas casas depois dele. "1.425" continua sendo mil quatrocentos e
 * vinte e cinco, como qualquer pessoa escreve aqui.
 */
export function deValorDoCampo(texto) {
  const bruto = String(texto ?? '').trim();
  if (!bruto) return null;

  let normalizado;
  if (bruto.includes(',')) {
    normalizado = bruto.replace(/\./g, '').replace(',', '.');
  } else {
    const partes = bruto.split('.');
    normalizado = partes.length === 2 && partes[1].length > 0 && partes[1].length <= 2
      ? bruto
      : bruto.replace(/\./g, '');
  }

  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

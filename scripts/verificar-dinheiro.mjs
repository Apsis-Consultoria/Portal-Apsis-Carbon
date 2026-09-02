/**
 * Testa o par formatar/interpretar dos campos de dinheiro.
 *
 * O teste que importa e o de IDA E VOLTA: abrir a edicao de um valor e salvar sem
 * tocar no campo tem que devolver o MESMO numero. Era exatamente isso que estava
 * quebrado em quatro telas da prestacao de contas: R$ 1.425,50 virava
 * R$ 14.255,00 porque o formatador escrevia ponto decimal e o interpretador
 * apagava ponto como separador de milhar.
 *
 * O caso 1425.5 e o caso-testemunha: valor inteiro passava, valor com decimais
 * nao, e por isso nenhuma conferencia manual pegou.
 *
 * Uso:
 *   node scripts/verificar-dinheiro.mjs
 */
import { deValorDoCampo, paraCampoValor } from '../src/lib/dinheiro.js';

let ok = 0;
const falhas = [];

function conferir(rotulo, obtido, esperado) {
  if (Object.is(obtido, esperado)) {
    ok += 1;
    console.log('  ok   %s', rotulo);
  } else {
    falhas.push(`${rotulo}: esperado ${JSON.stringify(esperado)}, obtido ${JSON.stringify(obtido)}`);
    console.log('  FALHOU %s -> esperado %j, obtido %j', rotulo, esperado, obtido);
  }
}

console.log('IDA E VOLTA (o defeito real: abrir e salvar sem editar)');
for (const n of [1425.5, 1425.55, 1425, -750, -1425.5, 0.01, 0.1, 1000000.99, 2100, 279.9]) {
  conferir(`${n} -> campo -> numero`, deValorDoCampo(paraCampoValor(n)), n);
}

console.log('');
console.log('FORMATAR: numero do banco -> texto do campo');
conferir('1425.5 vira 1425,50', paraCampoValor(1425.5), '1425,50');
conferir('1425 vira 1425,00', paraCampoValor(1425), '1425,00');
conferir('-750 mantem o sinal', paraCampoValor(-750), '-750,00');
conferir('null vira vazio', paraCampoValor(null), '');
conferir('undefined vira vazio', paraCampoValor(undefined), '');
conferir('vazio continua vazio', paraCampoValor(''), '');
conferir('texto sem numero vira vazio', paraCampoValor('abc'), '');
conferir('zero aparece, nao vira vazio', paraCampoValor(0), '0,00');

console.log('');
console.log('INTERPRETAR: o que a pessoa digita');
conferir('1.425,50 (pt-BR completo)', deValorDoCampo('1.425,50'), 1425.5);
conferir('1425,50 (sem milhar)', deValorDoCampo('1425,50'), 1425.5);
conferir('1425.50 (ponto como decimal)', deValorDoCampo('1425.50'), 1425.5);
conferir('1425.5 (ponto, uma casa)', deValorDoCampo('1425.5'), 1425.5);
conferir('1.425 e MILHAR, nao 1,425', deValorDoCampo('1.425'), 1425);
conferir('1.234.567 (dois milhares)', deValorDoCampo('1.234.567'), 1234567);
conferir('espaco em volta e ignorado', deValorDoCampo('  1425,50  '), 1425.5);
conferir('negativo', deValorDoCampo('-1.425,50'), -1425.5);

console.log('');
console.log('INTERPRETAR: entrada ruim NUNCA devolve NaN');
for (const ruim of ['', '   ', null, undefined, 'abc', 'R$', ',', '.', '1,2,3']) {
  const r = deValorDoCampo(ruim);
  const aceitavel = r === null || Number.isFinite(r);
  conferir(`${JSON.stringify(ruim)} -> null ou numero finito`, aceitavel, true);
}

console.log('');
console.log('REGRESSAO: o defeito antigo nao pode voltar');
{
  // Era isto que as telas faziam: String(valor) e depois apagar todo ponto.
  const comoEraAntes = (v) => Number(String(String(v)).replace(/\./g, '').replace(',', '.'));
  conferir('o jeito antigo multiplicava por 10', comoEraAntes(1425.5), 14255);
  conferir('o jeito novo preserva', deValorDoCampo(paraCampoValor(1425.5)), 1425.5);
}

console.log('');
if (falhas.length) {
  console.log('%d ok, %d FALHA(S)', ok, falhas.length);
  for (const f of falhas) console.log('  - %s', f);
  process.exit(1);
}
console.log('%d verificacoes ok', ok);

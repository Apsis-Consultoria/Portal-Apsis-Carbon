// Exercita src/lib/rascunhoOffline.js fora do navegador.
//
// POR QUE UM SCRIPT E NAO UM TESTE: o frontend deste projeto nao tem runner
// (nao ha vitest nem jest no package.json), e acrescentar um por causa de um
// modulo seria decisao maior do que o modulo. O que este arquivo faz e o que um
// teste faria: monta um localStorage falso, roda os casos que importam e falha
// com codigo de saida diferente de zero.
//
// O QUE ELE PROVA. A promessa da tela e "se o sinal cair, o que voce respondeu
// nao se perde". Essa promessa depende de quatro comportamentos, e nenhum deles
// e obvio o bastante para ficar sem conferencia:
//   1. o que foi guardado volta igual;
//   2. confirmar apaga (senao a fila nunca esvazia e o reenvio vira eterno);
//   3. pendencia velha demais e descartada (senao um aparelho esquecido
//      sobrescreve, meses depois, o que ja foi corrigido no servidor);
//   4. falha de REDE vira pendencia e recusa do servidor NAO vira - reenviar um
//      400 para sempre e pior do que perder a tentativa.
//
//   node scripts/verificar-rascunho-offline.mjs

/* localStorage falso com a mesma superficie que o modulo usa. */
class ArmazemFalso {
  constructor() { this.mapa = new Map(); }
  get length() { return this.mapa.size; }
  key(i) { return [...this.mapa.keys()][i] ?? null; }
  getItem(k) { return this.mapa.has(k) ? this.mapa.get(k) : null; }
  setItem(k, v) {
    if (this.cheio) throw Object.assign(new Error('cheio'), { name: 'QuotaExceededError' });
    this.mapa.set(k, String(v));
  }
  removeItem(k) { this.mapa.delete(k); }
}

const armazem = new ArmazemFalso();
globalThis.window = { localStorage: armazem };

const { guardar, ler, confirmar, listarPendentes, ehFalhaDeRede } = await import(
  '../src/lib/rascunhoOffline.js'
);

const falhas = [];
const conferir = (nome, condicao) => {
  if (condicao) console.log(`  ok   ${nome}`);
  else { console.log(`  FALHA ${nome}`); falhas.push(nome); }
};

console.log('rascunhoOffline:');

// 1. Ida e volta.
guardar('q1', { respostas: { a: 1 }, status: 'rascunho' });
const lido = ler('q1');
conferir('o que foi guardado volta igual', lido?.dados?.respostas?.a === 1);
conferir('vem marcado como pendente', lido?.pendente === true);

// 2. Confirmar esvazia.
confirmar('q1');
conferir('confirmar apaga a pendencia', ler('q1') === null);

// 3. Pendencia velha e descartada.
armazem.setItem(
  'carbonRascunho:q2',
  JSON.stringify({
    id: 'q2',
    dados: { respostas: {} },
    em: new Date(Date.now() - 40 * 86400000).toISOString(),
    pendente: true,
  }),
);
conferir('pendencia de 40 dias e descartada', ler('q2') === null);

// 4. Pendencia recente sobrevive.
guardar('q3', { respostas: { b: 2 } });
conferir('pendencia de agora sobrevive', ler('q3') !== null);

// 5. A lista enxerga o que esta por enviar.
conferir('listarPendentes acha a pendencia', listarPendentes().some((p) => p.id === 'q3'));

// 6. Conteudo corrompido nao derruba a leitura.
armazem.setItem('carbonRascunho:q4', '{isso nao e json');
conferir('json corrompido devolve null em vez de lancar', ler('q4') === null);
conferir('e o lixo e removido', armazem.getItem('carbonRascunho:q4') === null);

// 7. Armazenamento cheio: avisa em vez de mentir que guardou.
armazem.cheio = true;
conferir('quota estourada devolve false', guardar('q5', { x: 1 }) === false);
armazem.cheio = false;

// 8. A distincao que decide reenviar ou nao.
console.log('ehFalhaDeRede:');
conferir('falha_rede e de rede', ehFalhaDeRede({ codigo: 'falha_rede' }) === true);
conferir('timeout e de rede', ehFalhaDeRede({ codigo: 'timeout' }) === true);
conferir('500 e de rede (servidor caiu)', ehFalhaDeRede({ status: 500 }) === true);
conferir('sem status e de rede (nem respondeu)', ehFalhaDeRede({ codigo: 'x' }) === true);
conferir('400 NAO e de rede', ehFalhaDeRede({ status: 400, codigo: 'campo_invalido' }) === false);
conferir('409 NAO e de rede', ehFalhaDeRede({ status: 409 }) === false);
conferir('401 NAO e de rede', ehFalhaDeRede({ status: 401 }) === false);

console.log('');
if (falhas.length) {
  console.error(`${falhas.length} falha(s): ${falhas.join(', ')}`);
  process.exit(1);
}
console.log('todas as conferencias passaram');

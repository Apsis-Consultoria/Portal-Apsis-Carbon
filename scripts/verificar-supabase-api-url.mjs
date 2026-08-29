// Prova que o proxy de /api se registra a partir de SUPABASE_API_URL.
//
// POR QUE CONFERIR ISTO. O proxy so existe em desenvolvimento, e a unica forma de
// perceber que ele nao subiu e tentar fazer login e receber 404 em /api - o que
// nao diz "faltou a variavel", diz "o backend nao respondeu". Renomear a variavel
// sem conferir seria trocar um nome por um dia perdido depurando a coisa errada.
//
// Sao cinco cenarios. Os dois ultimos existem porque a variavel MUDOU DE FORMATO
// em 28/08/2026: antes levava o caminho completo `.../functions/v1`, agora leva
// so o endereco do projeto. Quem tiver o valor antigo anotado geraria caminho
// DUPLICADO, e o sintoma seria 404 em toda chamada de /api sem nada apontar para
// a variavel.
//
//   1. so o nome NOVO         -> proxy registrado, sem aviso
//   2. so o nome ANTIGO       -> proxy registrado, COM aviso de renomear
//   3. nenhuma das duas       -> proxy ausente (404 claro, e nao destino default errado)
//   4. valor com /functions/v1 no fim -> corrigido, COM aviso
//   5. valor com barra no fim         -> corrigido
//
//   cd "C:/Users/FilipeOliveiraAPSISC/Sistemas/portal-apsis-carbon"; node scripts/verificar-supabase-api-url.mjs

/** O que se digita na variavel hoje: so o endereco do projeto. */
const ALVO = 'https://exemplo.supabase.co';

const falhas = [];
const conferir = (nome, ok) => {
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${nome}`);
  if (!ok) falhas.push(nome);
};

/**
 * Carrega vite.config.js com o ambiente pedido e devolve o que ele produziu.
 *
 * Cada cenario importa o arquivo com uma query diferente para escapar do cache de
 * modulos do Node: sem isso, as tres chamadas devolveriam o resultado da primeira
 * e os tres cenarios "passariam" sem nunca terem sido executados.
 */
async function carregar(env, marca) {
  delete process.env.SUPABASE_API_URL;
  delete process.env.SUPABASE_FUNCTIONS_URL;
  Object.assign(process.env, env);

  const avisos = [];
  const original = console.warn;
  console.warn = (...a) => avisos.push(a.join(' '));
  try {
    const mod = await import(`../vite.config.js?cenario=${marca}`);
    const cfg = typeof mod.default === 'function' ? mod.default({ mode: 'development' }) : mod.default;
    const regra = cfg?.server?.proxy?.['/api'];
    return {
      proxy: cfg?.server?.proxy,
      alvo: regra?.target,
      // O caminho final que uma chamada real produziria. E o que interessa: um
      // alvo certo com rewrite errado erra do mesmo jeito.
      caminhoFinal: regra?.rewrite ? regra.rewrite('/api/carbon-api/me') : null,
      avisos,
    };
  } finally {
    console.warn = original;
  }
}

/** O caminho que o proxy precisa produzir para /api/carbon-api/me. */
const CAMINHO_ESPERADO = '/functions/v1/carbon-api/me';

console.log('1. so SUPABASE_API_URL (nome novo, so o endereco):');
const novo = await carregar({ SUPABASE_API_URL: ALVO }, 'novo');
conferir('o proxy de /api foi registrado', Boolean(novo.proxy?.['/api']));
conferir('aponta para o endereco da variavel', novo.alvo === ALVO);
conferir('o codigo acrescenta /functions/v1', novo.caminhoFinal === CAMINHO_ESPERADO);
conferir('nao avisa nada', novo.avisos.length === 0);

console.log('2. so SUPABASE_FUNCTIONS_URL (nome antigo):');
const antigo = await carregar({ SUPABASE_FUNCTIONS_URL: ALVO }, 'antigo');
conferir('ainda funciona, para nao derrubar quem nao renomeou', Boolean(antigo.proxy?.['/api']));
conferir('aponta para o endereco certo', antigo.alvo === ALVO);
conferir(
  'AVISA que o nome mudou',
  antigo.avisos.some((a) => a.includes('SUPABASE_API_URL')),
);

console.log('3. nenhuma das duas:');
const vazio = await carregar({}, 'vazio');
conferir('o proxy NAO e registrado (404 claro em /api)', !vazio.proxy);

console.log('4. valor no formato ANTIGO, terminando em /functions/v1:');
const completo = await carregar({ SUPABASE_API_URL: `${ALVO}/functions/v1` }, 'completo');
conferir('o caminho NAO fica duplicado', completo.caminhoFinal === CAMINHO_ESPERADO);
conferir('o alvo volta a ser so o endereco', completo.alvo === ALVO);
conferir(
  'AVISA para tirar o /functions/v1 da variavel',
  completo.avisos.some((a) => a.includes('/functions/v1')),
);

console.log('5. valor com barra sobrando no fim:');
const comBarra = await carregar({ SUPABASE_API_URL: `${ALVO}/` }, 'barra');
conferir('a barra e removida, sem caminho duplo', comBarra.caminhoFinal === CAMINHO_ESPERADO);
conferir('o alvo fica limpo', comBarra.alvo === ALVO);

console.log('');
if (falhas.length) {
  console.error(`${falhas.length} falha(s): ${falhas.join(', ')}`);
  process.exit(1);
}
console.log('todas as conferencias passaram');

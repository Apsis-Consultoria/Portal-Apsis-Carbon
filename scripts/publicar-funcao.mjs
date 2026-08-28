// Publica uma Edge Function usando o token que REALMENTE funciona.
//
// POR QUE ELE EXISTE. `npx supabase functions deploy` le SUPABASE_ACCESS_TOKEN
// do ambiente, e nesta maquina o ambiente do processo carrega um token ANTIGO:
// existem dois, e o processo herda o velho enquanto o registro do Windows tem o
// novo. O sintoma e um 401 Unauthorized no fim do upload, depois de mandar todos
// os arquivos - parece problema de permissao no projeto e e so token velho.
//
// E o mesmo remendo que scripts/sql.mjs ja faz para a Management API, pela mesma
// razao. Quando o ambiente for corrigido (abrir um terminal novo basta), este
// script continua funcionando: ele tenta o do ambiente primeiro.
//
// O TOKEN NUNCA E IMPRESSO. Nem em log, nem em mensagem de erro.
//
//   node scripts/publicar-funcao.mjs <nome-da-funcao>

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const nome = process.argv[2];
if (!nome) {
  console.error('uso: node scripts/publicar-funcao.mjs <nome-da-funcao>');
  process.exit(1);
}

/** Token persistido no ambiente do usuario do Windows. Null se nao houver. */
function tokenPersistidoNoWindows() {
  if (process.platform !== 'win32') return null;
  try {
    const saida = execFileSync(
      'reg',
      ['query', 'HKCU\\Environment', '/v', 'SUPABASE_ACCESS_TOKEN'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const achado = saida.match(/REG_SZ\s+(\S+)/);
    return achado ? achado[1] : null;
  } catch {
    return null;
  }
}

const ref = JSON.parse(
  readFileSync(new URL('../supabase/.temp/linked-project.json', import.meta.url), 'utf8'),
).ref;

const doAmbiente = process.env.SUPABASE_ACCESS_TOKEN || null;
const doRegistro = tokenPersistidoNoWindows();

/* Ordem: o do registro primeiro quando os dois existem e sao diferentes. E o
   inverso do sql.mjs de proposito - la o do ambiente e tentado e o fallback so
   entra depois do 401, porque uma consulta e barata. Aqui uma tentativa custa o
   upload inteiro dos arquivos da funcao, entao vale comecar pelo que a evidencia
   desta maquina diz ser o bom. */
const candidatos = [];
if (doRegistro) candidatos.push({ origem: 'registro do Windows', valor: doRegistro });
if (doAmbiente && doAmbiente !== doRegistro) {
  candidatos.push({ origem: 'variavel de ambiente', valor: doAmbiente });
}

if (!candidatos.length) {
  console.error('nenhum SUPABASE_ACCESS_TOKEN encontrado, nem no ambiente nem no registro');
  process.exit(1);
}

for (const [i, candidato] of candidatos.entries()) {
  console.log(`publicando "${nome}" com o token do ${candidato.origem}...`);

  /* `shell: true` no Windows nao e preferencia: desde a correcao de seguranca do
     Node 18.20/20.12, spawnSync recusa executar arquivo .cmd diretamente e
     devolve EINVAL sem nenhuma saida - o sintoma e um "falhou" mudo, que foi
     exatamente o que aconteceu na primeira tentativa. Os argumentos aqui sao
     todos literais nossos ou o ref do arquivo de link, nenhum vem de entrada de
     usuario, entao passar pelo shell nao abre porta para injecao. */
  const r = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['supabase', 'functions', 'deploy', nome, '--project-ref', ref, '--no-verify-jwt'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: process.platform === 'win32',
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: candidato.valor },
    },
  );

  if (r.error) {
    console.error(`nao foi possivel executar o CLI: ${r.error.message}`);
    process.exit(1);
  }

  const saida = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const naoAutorizado = /401|Unauthorized/i.test(saida);

  if (r.status === 0 && !naoAutorizado) {
    // Filtra as centenas de linhas "Uploading asset": o que importa e o fim.
    console.log(saida.split('\n').filter((l) => !/Uploading asset/.test(l)).join('\n').trim());
    console.log(`\nok: "${nome}" publicada.`);
    process.exit(0);
  }

  const ultimo = i === candidatos.length - 1;
  if (naoAutorizado && !ultimo) {
    console.log('  token recusado (401). Tentando o proximo.');
    continue;
  }

  console.error(saida.split('\n').filter((l) => !/Uploading asset/.test(l)).join('\n').trim());
  console.error(`\nfalhou ao publicar "${nome}".`);
  process.exit(1);
}

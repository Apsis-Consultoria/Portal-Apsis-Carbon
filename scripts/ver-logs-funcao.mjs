// Le os logs recentes de uma Edge Function pela Management API.
//
// POR QUE: quando a funcao devolve 401 ou 500, o motivo esta num console.warn
// dentro dela e nao na resposta HTTP - de proposito, porque detalhe de
// autenticacao nao vai para o cliente. Sem uma forma de ler o log, resta
// adivinhar, que foi exatamente o que me custou tempo hoje.
//
// Usa o mesmo token que scripts/sql.mjs, com o mesmo remendo do registro do
// Windows. O token nunca e impresso.
//
//   node scripts/ver-logs-funcao.mjs <nome-da-funcao> [minutos]

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const API = 'https://api.supabase.com/v1';

const nome = process.argv[2] ?? 'carbon-api';
const minutos = Number(process.argv[3] ?? 15);

function tokenPersistidoNoWindows() {
  if (process.platform !== 'win32') return null;
  try {
    const saida = execFileSync('reg', ['query', 'HKCU\\Environment', '/v', 'SUPABASE_ACCESS_TOKEN'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const achado = saida.match(/REG_SZ\s+(\S+)/);
    return achado ? achado[1] : null;
  } catch {
    return null;
  }
}

const ref = JSON.parse(
  await readFile(new URL('../supabase/.temp/linked-project.json', import.meta.url), 'utf8'),
).ref;

const candidatos = [tokenPersistidoNoWindows(), process.env.SUPABASE_ACCESS_TOKEN].filter(Boolean);
if (!candidatos.length) {
  console.error('nenhum SUPABASE_ACCESS_TOKEN encontrado');
  process.exit(1);
}

const desde = Date.now() - minutos * 60 * 1000;

/* A consulta e SQL sobre a tabela de logs do Analytics. `event_message` traz o
   que a funcao escreveu em console; os metadados trazem o status da resposta. */
const sql = `
  select id, timestamp, event_message
  from function_edge_logs
  order by timestamp desc
  limit 80
`;

for (const token of candidatos) {
  const url = new URL(`${API}/projects/${ref}/analytics/endpoints/logs.all`);
  url.searchParams.set('sql', sql);
  url.searchParams.set('iso_timestamp_start', new Date(desde).toISOString());

  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (r.status === 401) continue;
  if (!r.ok) {
    console.error(`falha ao ler logs: HTTP ${r.status}`);
    console.error((await r.text()).slice(0, 400));
    process.exit(1);
  }

  const j = await r.json();
  const linhas = j?.result ?? [];
  if (!linhas.length) {
    console.log(`nenhum log de "${nome}" nos ultimos ${minutos} min`);
    process.exit(0);
  }

  for (const l of linhas.reverse()) {
    const quando = new Date(Number(l.timestamp) / 1000).toISOString().slice(11, 19);
    console.log(`${quando}  ${String(l.event_message ?? '').slice(0, 220)}`);
  }
  process.exit(0);
}

console.error('todos os tokens foram recusados (401)');
process.exit(1);

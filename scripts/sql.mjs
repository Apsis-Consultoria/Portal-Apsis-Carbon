// Roda SQL no projeto hospedado pela Management API do Supabase.
//
// POR QUE ELE EXISTE: ate agora as migrations eram aplicadas colando SQL no
// editor do dashboard, e isso ja causou um estrago real - em 23/08/2026 o
// arquivo 20260817120000_secure_share.sql foi reaplicado inteiro por engano e
// derrubou as views do login sem senha, que tinham sido criadas depois. Colar
// texto em navegador nao deixa rastro de o que foi rodado nem em que ordem.
//
// Aqui o SQL vem de ARQUIVO, o nome do arquivo aparece na saida, e o script
// recusa rodar sem confirmacao quando o conteudo tem comando destrutivo.
//
// COMO RODAR (PowerShell 5.1 - o separador e ';', o '&&' nao funciona):
//
//   $env:SUPABASE_ACCESS_TOKEN = "<token de acesso pessoal>"
//   node scripts/sql.mjs --arquivo supabase/migrations/2026...sql
//   node scripts/sql.mjs --consulta "select count(*) from carbon_projetos"
//
// O ref do projeto sai de supabase/.temp/linked-project.json, o mesmo que o
// CLI usa, para nao existir uma segunda fonte de verdade que possa divergir.

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';

const API = 'https://api.supabase.com/v1';

const cor = (c, s) => `\x1b[${c}m${s}\x1b[0m`;

// Comandos que apagam ou substituem definicao existente. `create or replace`
// NAO entra: e o feitio normal das funcoes das migrations, e pedir confirmacao
// em toda migration treinaria a pessoa a apertar "s" sem ler - que e
// exatamente o habito que este script existe para evitar.
const DESTRUTIVO = /\b(drop\s+(table|schema|database|column)|truncate|delete\s+from)\b/i;

// Bloco entre cifroes: $$ ... $$ ou $tag$ ... $tag$, que e como o Postgres delimita
// corpo de funcao e bloco DO.
const CIFRAO = /\$([A-Za-z_]\w*)?\$[\s\S]*?\$\1?\$/g;

/**
 * Tira corpo de funcao e bloco DO antes de procurar comando destrutivo.
 *
 * POR QUE: um `delete from` dentro de `create function` nao apaga nada na hora de
 * aplicar a migration - ele so roda se alguem CHAMAR a funcao depois, e as vezes
 * so em um ramo (`if p_substituir then delete ...`). Sem esta limpeza, a guarda
 * pedia confirmacao em 20260814097000_fornecedores.sql, que e uma migration
 * puramente aditiva.
 *
 * Isso importa mais do que parece: guarda que grita sem motivo treina quem aplica
 * a digitar "confirmo" no automatico, e ai ela deixa de proteger justamente no dia
 * em que o comando destrutivo for de verdade.
 *
 * O preco e conhecido e aceito: um DROP TABLE escrito dentro de um bloco DO passa
 * sem perguntar. Em compensacao, o comando destrutivo de verdade quase sempre esta
 * no nivel de cima, que continua coberto.
 */
function foraDeCorpoDeFuncao(sql) {
  return sql.replace(CIFRAO, ' ');
}

async function refDoProjeto() {
  const bruto = await readFile(
    new URL('../supabase/.temp/linked-project.json', import.meta.url),
    'utf8',
  );
  // O campo mudou de nome entre versoes do CLI (`id` nas antigas, `ref` nas
  // novas). Aceita os dois para o script nao quebrar num `npx supabase` que
  // resolveu para outra versao.
  const j = JSON.parse(bruto);
  const ref = j?.ref ?? j?.id;
  if (!ref) throw new Error('linked-project.json nao tem `ref` nem `id`.');
  return ref;
}

async function rodar(ref, token, sql) {
  const resp = await fetch(`${API}/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });

  const texto = await resp.text();

  if (!resp.ok) {
    // A API devolve a mensagem do Postgres aqui dentro, e ela e a parte util:
    // numero da linha, coluna, constraint violada.
    let detalhe = texto;
    try {
      const j = JSON.parse(texto);
      detalhe = j.message ?? j.error ?? texto;
    } catch { /* resposta nao era JSON; mostra crua */ }
    throw new Error(`${resp.status} - ${detalhe}`);
  }

  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

// -----------------------------------------------------------------------------
// De onde vem o token, e por que nao basta ler process.env
// -----------------------------------------------------------------------------
// O PROBLEMA REAL, diagnosticado em 25/08/2026. `$env:X = '...'` no PowerShell vale
// para AQUELE processo e para os filhos que ele criar DEPOIS. Um processo que ja
// estava aberto - o editor, um terminal antigo, o proprio Claude Code - guarda para
// sempre o valor que herdou quando nasceu.
//
// Junte a isso um `setx` (ou a tela de variaveis de ambiente do Windows) feito uma
// vez no passado, e voce tem duas verdades convivendo: a persistida no registro, que
// todo terminal NOVO recebe, e a congelada dentro de cada processo velho.
//
// O sintoma e cruel porque mente sobre a causa: o token novo funciona no terminal
// onde foi criado e falha em todo o resto, o que parece "o Supabase revogou meu
// token de novo". Nao revogou. O processo esta usando outro token, mais antigo, que
// de fato ja morreu.
//
// Por isso este script NAO confia no ambiente: ele testa o que encontrou e, se o
// ambiente estiver com um token morto, cai para o valor persistido e DIZ que fez
// isso. Ficar em silencio devolveria o usuario ao mesmo engano.

async function tokenFunciona(token) {
  try {
    const r = await fetch(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } });
    return r.ok;
  } catch {
    // Falha de rede nao e token invalido. Deixa passar para o erro real aparecer
    // na chamada de verdade, com a mensagem do Postgres ou do fetch.
    return true;
  }
}

/** Le a variavel persistida no nivel do usuario (a que todo terminal novo herda). */
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
    // `reg` devolve codigo de erro quando a chave nao existe. Nao e problema.
    return null;
  }
}

async function resolverToken() {
  const doAmbiente = process.env.SUPABASE_ACCESS_TOKEN || null;
  const persistido = tokenPersistidoNoWindows();

  if (doAmbiente && (await tokenFunciona(doAmbiente))) {
    return { token: doAmbiente, origem: 'ambiente' };
  }

  if (persistido && persistido !== doAmbiente && (await tokenFunciona(persistido))) {
    if (doAmbiente) {
      console.log(
        `${cor(33, 'AVISO  ')} o token do ambiente foi recusado; usando o persistido no Windows.`,
      );
      console.log(
        `        Este processo herdou um token antigo. Nao e revogacao: abra um terminal`,
      );
      console.log(
        `        NOVO e o valor correto ja vem. Para limpar o antigo desta sessao:`,
      );
      console.log(`          Remove-Item Env:SUPABASE_ACCESS_TOKEN`);
    }
    return { token: persistido, origem: 'variavel persistida do Windows' };
  }

  return { token: doAmbiente || persistido, origem: doAmbiente ? 'ambiente' : 'nenhuma' };
}

async function main() {
  const args = process.argv.slice(2);
  const pegar = (nome) => {
    const i = args.indexOf(nome);
    return i >= 0 ? args[i + 1] : null;
  };

  const arquivo = pegar('--arquivo');
  const consulta = pegar('--consulta');

  if (!arquivo && !consulta) {
    console.error('Use --arquivo <caminho.sql> ou --consulta "<sql>".');
    process.exitCode = 1;
    return;
  }

  const { token, origem: origemToken } = await resolverToken();
  if (!token) {
    console.error('Nao achei SUPABASE_ACCESS_TOKEN nem no ambiente nem persistido.');
    console.error('  $env:SUPABASE_ACCESS_TOKEN = Read-Host "Token"');
    console.error('Gere em https://supabase.com/dashboard/account/tokens');
    process.exitCode = 1;
    return;
  }

  const sql = arquivo ? await readFile(arquivo, 'utf8') : consulta;
  const origem = arquivo ?? '(--consulta)';
  const ref = await refDoProjeto();

  console.log(`${cor(36, 'projeto')} ${ref}`);
  console.log(`${cor(36, 'token  ')} ${origemToken}`);
  console.log(`${cor(36, 'sql    ')} ${origem}`);

  const sqlDeTopo = foraDeCorpoDeFuncao(sql);
  if (DESTRUTIVO.test(sqlDeTopo)) {
    const achado = sqlDeTopo.match(DESTRUTIVO)[0];
    console.log(`\n${cor(33, 'ATENCAO')} o SQL contem \`${achado}\`.`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const r = (await rl.question('Digite "confirmo" para rodar assim mesmo: ')).trim();
    rl.close();
    if (r !== 'confirmo') {
      console.log('Cancelado. Nada foi executado.');
      return;
    }
  }

  const inicio = process.hrtime.bigint();
  const saida = await rodar(ref, token, sql);
  const ms = Number(process.hrtime.bigint() - inicio) / 1e6;

  console.log(`${cor(32, 'ok     ')} ${ms.toFixed(0)} ms\n`);
  console.log(typeof saida === 'string' ? saida : JSON.stringify(saida, null, 2));
}

try {
  await main();
} catch (e) {
  console.error(`\n${cor(31, 'ERRO')} ${e.message}`);
  process.exitCode = 1;
}

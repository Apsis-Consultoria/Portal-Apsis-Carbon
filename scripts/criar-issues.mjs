#!/usr/bin/env node
/**
 * Cria no GitHub as issues descritas em docs/issues/BACKLOG-INICIAL.md.
 *
 * Por que este script existe: o `gh` CLI nao esta instalado na maquina de
 * desenvolvimento e o navegador nao tem sessao do GitHub. O `git push` funciona porque
 * usa o Credential Manager, mas isso nao serve para a API. Este script deixa a criacao
 * a um comando de distancia, sem ninguem precisar manipular a credencial em texto puro
 * dentro de uma conversa.
 *
 * ---------------------------------------------------------------------------
 * MODO 1 - criar de verdade (precisa de um token com escopo `repo`)
 *
 *   GH_TOKEN=<seu-token> node scripts/criar-issues.mjs
 *
 * O token e lido do ambiente, nunca de argumento de linha de comando (argumento
 * vaza no historico do shell e na lista de processos).
 *
 * ---------------------------------------------------------------------------
 * MODO 2 - gerar links prontos, sem token
 *
 *   node scripts/criar-issues.mjs --links
 *
 * Imprime uma URL por issue com titulo e corpo ja preenchidos. Abrir no navegador
 * onde voce ja esta logado e clicar em "Create". Nao precisa de token nenhum.
 *
 * ---------------------------------------------------------------------------
 * MODO 3 - conferir o que seria criado
 *
 *   node scripts/criar-issues.mjs --dry-run
 *
 * ---------------------------------------------------------------------------
 * O script e IDEMPOTENTE: antes de criar, lista as issues existentes (abertas e
 * fechadas) e pula as que já tem titulo igual. Rodar duas vezes nao duplica.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = 'Apsis-Consultoria/Portal-Apsis-Carbon';
const API = 'https://api.github.com';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ARQUIVO = join(AQUI, '..', 'docs', 'issues', 'BACKLOG-INICIAL.md');

const args = new Set(process.argv.slice(2));
const modoLinks = args.has('--links');
const modoSeco = args.has('--dry-run');
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';

/** Quebra o markdown em issues. Cada issue comeca em "## ISSUE: ". */
function extrairIssues(markdown) {
  // split com lookahead preserva o delimitador no inicio de cada pedaco
  const pedacos = markdown.split(/^(?=## ISSUE: )/m).filter((p) => p.startsWith('## ISSUE: '));

  return pedacos.map((pedaco) => {
    const linhas = pedaco.split('\n');
    const titulo = linhas[0].replace(/^## ISSUE:\s*/, '').trim();

    let labels = [];
    let inicioCorpo = 1;
    // a linha de labels, se existir, vem nas primeiras linhas nao vazias
    for (let i = 1; i < Math.min(linhas.length, 5); i++) {
      const l = linhas[i].trim();
      if (!l) continue;
      const m = l.match(/^labels:\s*(.+)$/i);
      if (m) {
        labels = m[1].split(',').map((s) => s.trim()).filter(Boolean);
        inicioCorpo = i + 1;
      }
      break;
    }

    const corpo = linhas.slice(inicioCorpo).join('\n').trim();
    return { titulo, labels, corpo };
  });
}

async function api(caminho, opcoes = {}) {
  const resposta = await fetch(`${API}${caminho}`, {
    ...opcoes,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opcoes.headers || {}),
    },
  });
  const texto = await resposta.text();
  let corpo;
  try { corpo = texto ? JSON.parse(texto) : null; } catch { corpo = texto; }
  return { ok: resposta.ok, status: resposta.status, corpo };
}

/** Titulos ja existentes no repositorio, para nao duplicar. */
async function titulosExistentes() {
  const titulos = new Set();
  for (let pagina = 1; pagina <= 10; pagina++) {
    const { ok, status, corpo } = await api(
      `/repos/${REPO}/issues?state=all&per_page=100&page=${pagina}`
    );
    if (!ok) {
      if (status === 404) {
        throw new Error(
          `Repositorio ${REPO} nao encontrado (404). Se o repo e privado, o token precisa do ` +
          `escopo "repo". Se o nome mudou de novo, ajuste a constante REPO no topo deste arquivo.`
        );
      }
      throw new Error(`Falha ao listar issues: HTTP ${status} ${JSON.stringify(corpo)}`);
    }
    if (!Array.isArray(corpo) || corpo.length === 0) break;
    // a API de issues devolve pull requests tambem; filtra
    for (const item of corpo) if (!item.pull_request) titulos.add(item.title);
    if (corpo.length < 100) break;
  }
  return titulos;
}

async function criar(issue) {
  const payload = { title: issue.titulo, body: issue.corpo };
  if (issue.labels.length) payload.labels = issue.labels;

  let r = await api(`/repos/${REPO}/issues`, { method: 'POST', body: JSON.stringify(payload) });

  // 422 costuma ser label inexistente. Tenta de novo sem labels em vez de falhar.
  if (!r.ok && r.status === 422 && payload.labels) {
    console.log(`     label recusada, recriando sem label`);
    delete payload.labels;
    r = await api(`/repos/${REPO}/issues`, { method: 'POST', body: JSON.stringify(payload) });
  }
  return r;
}

function urlPreenchida(issue) {
  const p = new URLSearchParams({ title: issue.titulo, body: issue.corpo });
  if (issue.labels.length) p.set('labels', issue.labels.join(','));
  return `https://github.com/${REPO}/issues/new?${p.toString()}`;
}

const markdown = await readFile(ARQUIVO, 'utf8');
const issues = extrairIssues(markdown);

if (issues.length === 0) {
  console.error(`Nenhuma issue encontrada em ${ARQUIVO}. O formato esperado e "## ISSUE: titulo".`);
  process.exit(1);
}

console.log(`${issues.length} issues lidas de docs/issues/BACKLOG-INICIAL.md\n`);

if (modoSeco) {
  issues.forEach((i, n) => {
    console.log(`${String(n + 1).padStart(2)}. ${i.titulo}`);
    console.log(`    labels: ${i.labels.join(', ') || '(nenhuma)'} | corpo: ${i.corpo.length} chars`);
  });
  console.log(`\nNada foi criado (--dry-run).`);
  process.exit(0);
}

if (modoLinks) {
  console.log('Abra cada link no navegador logado e clique em "Create". Um por issue.\n');
  issues.forEach((i, n) => {
    const url = urlPreenchida(i);
    console.log(`${String(n + 1).padStart(2)}. ${i.titulo}`);
    console.log(`    ${url}\n`);
    if (url.length > 6000) {
      console.log(`    AVISO: URL com ${url.length} caracteres. Alguns navegadores truncam acima`);
      console.log(`    de 8000. Se o corpo vier cortado, use o modo com token.\n`);
    }
  });
  process.exit(0);
}

if (!token) {
  console.error('Falta o token. Duas saidas:\n');
  console.error('  1) criar de verdade:');
  console.error('     GH_TOKEN=<token com escopo repo> node scripts/criar-issues.mjs\n');
  console.error('  2) sem token, gerando links prontos para clicar:');
  console.error('     node scripts/criar-issues.mjs --links\n');
  console.error('Gere o token em https://github.com/settings/tokens (classico, escopo "repo",');
  console.error('ou fine-grained com permissao de Issues: Read and write neste repositorio).');
  process.exit(1);
}

console.log(`Repositorio: ${REPO}`);
console.log('Conferindo issues existentes para nao duplicar...');
const existentes = await titulosExistentes();
console.log(`${existentes.size} issues ja no repositorio.\n`);

let criadas = 0;
let puladas = 0;
let falhas = 0;

for (const [n, issue] of issues.entries()) {
  const prefixo = `${String(n + 1).padStart(2)}/${issues.length}`;

  if (existentes.has(issue.titulo)) {
    console.log(`${prefixo} PULADA (ja existe): ${issue.titulo}`);
    puladas++;
    continue;
  }

  const r = await criar(issue);
  if (r.ok) {
    console.log(`${prefixo} criada #${r.corpo.number}: ${issue.titulo}`);
    criadas++;
  } else {
    console.error(`${prefixo} FALHOU (HTTP ${r.status}): ${issue.titulo}`);
    console.error(`     ${JSON.stringify(r.corpo)}`);
    falhas++;
  }

  // respiro entre chamadas: a API de criacao de conteudo tem limite secundario
  await new Promise((r) => setTimeout(r, 1200));
}

console.log(`\nResumo: ${criadas} criadas, ${puladas} puladas, ${falhas} falhas.`);
if (falhas > 0) process.exit(1);

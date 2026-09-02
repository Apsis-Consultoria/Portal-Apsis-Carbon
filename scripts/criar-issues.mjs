#!/usr/bin/env node
/**
 * Cria no GitHub as issues descritas em docs/issues/BACKLOG-INICIAL.md, ou no
 * arquivo indicado por `--arquivo <nome>` dentro da mesma pasta.
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
import { basename, dirname, join } from 'node:path';

const REPO = 'Apsis-Consultoria/Portal-Apsis-Carbon';
const API = 'https://api.github.com';

const AQUI = dirname(fileURLToPath(import.meta.url));

/*
 * QUAL ARQUIVO LER. O padrao continua BACKLOG-INICIAL.md, e `--arquivo <nome>`
 * aponta para outro dentro de docs/issues/.
 *
 * O caminho era fixo ate 01/09/2026, quando nasceu o segundo arquivo de issues
 * (PRESTACAO-CONTAS.md) e ele simplesmente nao era lido - sem erro, sem aviso, e
 * o script relatava "0 issues" como se o arquivo estivesse vazio.
 *
 * So o NOME e aceito, e nao um caminho: `basename` impede que um `../..` no
 * argumento faca o script ler arquivo de fora de docs/issues/.
 */
const listaArgs = process.argv.slice(2);
const posArquivo = listaArgs.indexOf('--arquivo');
const nomeArquivo = posArquivo !== -1 && listaArgs[posArquivo + 1]
  ? basename(listaArgs[posArquivo + 1])
  : 'BACKLOG-INICIAL.md';
const ARQUIVO = join(AQUI, '..', 'docs', 'issues', nomeArquivo);

const args = new Set(listaArgs);
const modoLinks = args.has('--links');
const modoSeco = args.has('--dry-run');
// .trim() e proposital: colar token no terminal costuma arrastar espaco ou quebra de
// linha, e um token com espaco no fim falha com 401 sem explicacao obvia.
const token = (process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '').trim();

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

/**
 * Confere, em dois passos, ANTES de tentar qualquer coisa, para nao confundir
 * "token invalido" com "token valido sem acesso ao repositorio". Os dois davam 404
 * na primeira versao deste script, e a mensagem culpava o escopo por engano.
 */
async function verificarAcesso() {
  // Passo 1: o token autentica?
  const quem = await api('/user');
  if (quem.status === 401) {
    console.error('\nO token nao foi aceito pelo GitHub (HTTP 401).\n');
    console.error('Causas, em ordem de probabilidade:');
    console.error('  1. A variavel ficou vazia. No PowerShell, o token e o que voce DIGITA no');
    console.error('     prompt do Read-Host, nao o texto que voce passa como argumento dele.');
    console.error('     Confira antes de rodar:  $env:GH_TOKEN.Length');
    console.error('     Deve dar algo em torno de 90 caracteres, nunca 0.');
    console.error('  2. O token expirou ou foi revogado.');
    console.error('  3. Sobrou espaco ou quebra de linha no valor (o script ja faz trim).');
    process.exit(1);
  }
  if (!quem.ok) {
    console.error(`\nFalha ao validar o token: HTTP ${quem.status} ${JSON.stringify(quem.corpo)}`);
    process.exit(1);
  }
  console.log(`Token valido, autenticado como: ${quem.corpo.login}`);

  // Passo 2: esse token ve ESTE repositorio?
  const repo = await api(`/repos/${REPO}`);
  if (repo.status === 404) {
    console.error(`\nO token autentica, mas nao ve o repositorio ${REPO} (HTTP 404).`);
    console.error('Num repositorio privado o GitHub responde 404, e nao 403, para quem nao tem');
    console.error('acesso: ele nao revela nem que o repositorio existe.\n');
    console.error('Causas, em ordem de probabilidade:');
    console.error('  1. Token fine-grained SEM o repositorio selecionado, ou sem a permissao');
    console.error('     "Issues: Read and write".');
    console.error('  2. Token fine-grained em repositorio de ORGANIZACAO: a organizacao precisa');
    console.error('     permitir tokens fine-grained, e o token precisa ser aprovado por ela.');
    console.error('     Se a Apsis-Consultoria nao tiver isso liberado, use um token CLASSICO');
    console.error('     com escopo "repo", que funciona sem aprovacao da organizacao.');
    console.error('  3. O nome do repositorio mudou. Ajuste a constante REPO no topo do arquivo.');
    process.exit(1);
  }
  if (repo.status === 403) {
    console.error(`\nAcesso negado ao repositorio (HTTP 403): ${JSON.stringify(repo.corpo)}`);
    console.error('Costuma ser aprovacao pendente do token pela organizacao.');
    process.exit(1);
  }
  if (!repo.ok) {
    console.error(`\nFalha ao ler o repositorio: HTTP ${repo.status} ${JSON.stringify(repo.corpo)}`);
    process.exit(1);
  }
  if (repo.corpo.has_issues === false) {
    console.error('\nAs Issues estao DESABILITADAS neste repositorio.');
    console.error(`Habilite em https://github.com/${REPO}/settings e rode de novo.`);
    process.exit(1);
  }
  console.log(`Repositorio acessivel: ${repo.corpo.full_name} (${repo.corpo.private ? 'privado' : 'publico'})`);
}

/** Titulos ja existentes no repositorio, para nao duplicar. */
async function titulosExistentes() {
  const titulos = new Set();
  for (let pagina = 1; pagina <= 10; pagina++) {
    const { ok, status, corpo } = await api(
      `/repos/${REPO}/issues?state=all&per_page=100&page=${pagina}`
    );
    // verificarAcesso() ja rodou antes daqui, entao 404 nesta altura seria algo raro
    // (repositorio renomeado no meio da execucao, por exemplo).
    if (!ok) throw new Error(`Falha ao listar issues: HTTP ${status} ${JSON.stringify(corpo)}`);
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

/* O nome sai da variavel, e nao escrito a mao: com o texto fixo, rodar
   `--arquivo PRESTACAO-CONTAS.md` listava as issues certas sob o cabecalho
   "lidas de BACKLOG-INICIAL.md". Mensagem que mente sobre a propria entrada faz
   quem le desconfiar do resultado certo. */
console.log(`${issues.length} issues lidas de docs/issues/${nomeArquivo}\n`);

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

console.log(`Repositorio alvo: ${REPO}`);
console.log(`Token recebido: ${token.length} caracteres\n`);

await verificarAcesso();

console.log('\nConferindo issues existentes para nao duplicar...');
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

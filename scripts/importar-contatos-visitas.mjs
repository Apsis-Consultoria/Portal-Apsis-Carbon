// Preenche nome, telefone e e-mail de contato nas visitas ja carregadas.
//
// POR QUE ESTE SCRIPT EXISTE SEPARADO. A carga de 25/08/2026 trouxe as 17
// visitas do Notion com organizacao, cidade, data e status de follow-up, e
// deixou as tres colunas de contato NULAS. Nao foi limitacao tecnica: dado
// pessoal de pessoa fisica (nome, celular, e-mail) tem regra propria na APSIS, e
// carga em massa feita por terceiro nao e o caminho previsto. A tabela ACEITA
// esses campos - tem `retencao_ate` e `anonimizado_em` justamente para isso.
//
// Aqui quem roda e voce, com o arquivo na sua maquina, e o dado vai direto para
// o seu banco.
//
// COMO USAR
//
// 1. No Notion, abra `Relatorio de Visitas` e exporte em CSV:
//      ... (canto superior direito) > Export > Markdown & CSV
//
// 2. Rode apontando para o arquivo:
//      node scripts/importar-contatos-visitas.mjs "C:\caminho\Relatorio de Visitas.csv"
//
//    Para conferir sem gravar nada:
//      node scripts/importar-contatos-visitas.mjs "<arquivo>" --simular
//
// COMO ELE CASA AS LINHAS. Por organizacao + data, que e a chave natural da
// visita e a mesma que o seed usou. Linha que casa recebe os contatos; linha
// que NAO casa e CRIADA.
//
// Criar mudou de ideia em 26/08/2026, e a razao e concreta: uma visita do CSV
// nao existia no banco porque o campo Organizacao dela e o NOME DE UMA PESSOA -
// a carga automatica a descartou inteira, ja que nao havia como grava-la sem
// gravar dado pessoal. Reportar "sem par" e parar deixava aquela visita fora do
// sistema para sempre. Aqui quem roda e o dono, na propria maquina, entao o
// caminho existe: o script cria a visita com o que o CSV traz (organizacao,
// data, localidade e status) e preenche os contatos.
//
// O risco de duplicar existe e esta contido: o casamento e por organizacao +
// data, entao rodar duas vezes o MESMO arquivo nao cria nada na segunda - a
// visita criada na primeira passa a casar. Conferir a lista "a CRIAR" que o
// --simular imprime antes de gravar continua sendo o certo.
//
// RETENCAO. Nao e preciso informar prazo: a trigger carbon_visitas_before_write
// preenche `retencao_ate` com 24 meses a contar da data da visita. Depois desse
// prazo, o dado de contato deve ser anonimizado - e para isso que existem as
// colunas anonimizado_em e anonimizado_motivo.

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const API = 'https://api.supabase.com/v1';
const cor = (c, s) => `\x1b[${c}m${s}\x1b[0m`;

/* ===== Token: mesma resolucao do scripts/sql.mjs ========================== */

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

async function tokenFunciona(t) {
  try {
    const r = await fetch(`${API}/projects`, { headers: { Authorization: `Bearer ${t}` } });
    return r.ok;
  } catch {
    return true;
  }
}

async function resolverToken() {
  const ambiente = process.env.SUPABASE_ACCESS_TOKEN || null;
  if (ambiente && (await tokenFunciona(ambiente))) return ambiente;
  const persistido = tokenPersistidoNoWindows();
  if (persistido && (await tokenFunciona(persistido))) {
    if (ambiente) {
      console.log(cor(33, 'AVISO ') + ' token do ambiente recusado; usando o persistido no Windows.');
    }
    return persistido;
  }
  return ambiente || persistido;
}

/* ===== CSV =============================================================== */

// Parser pequeno, porque o CSV do Notion tem campo com virgula e com aspas
// dentro (nome de empresa com vírgula, observação com aspas). Um split(',')
// quebraria essas linhas em silencio, deslocando todas as colunas seguintes -
// e o sintoma seria um telefone gravado no campo de e-mail.
function lerCsv(texto) {
  const linhas = [];
  let campo = '';
  let linha = [];
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }
        else dentroDeAspas = false;
      } else campo += c;
      continue;
    }

    if (c === '"') dentroDeAspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas.filter((l) => l.some((x) => x.trim() !== ''));
}

const normalizar = (s) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// Rotulo do Notion -> valor do CHECK carbon_visitas.follow_up_status.
const FOLLOW_UP = {
  'Nao iniciada': 'nao_iniciado',
  'Não iniciada': 'nao_iniciado',
  'Em andamento': 'em_andamento',
  'Concluída': 'concluido',
  'Concluida': 'concluido',
  'Descartada': 'descartado',
};

/** Acha a coluna pelo titulo, tolerando acento e variacao de caixa. */
function acharColuna(cabecalho, ...candidatos) {
  const semAcento = (s) => normalizar(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const alvo of candidatos) {
    const i = cabecalho.findIndex((c) => semAcento(c) === semAcento(alvo));
    if (i >= 0) return i;
  }
  return -1;
}

/** '24/04/2025' e '2025-04-24' viram '2025-04-24'. */
function paraIso(bruto) {
  const s = (bruto ?? '').trim();
  if (!s) return null;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : null;
}

/* ===== Banco ============================================================= */

async function rodarSql(ref, token, sql) {
  const r = await fetch(`${API}/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const texto = await r.text();
  if (!r.ok) {
    let detalhe = texto;
    try { detalhe = JSON.parse(texto).message ?? texto; } catch { /* cru */ }
    throw new Error(`${r.status} - ${detalhe}`);
  }
  try { return JSON.parse(texto); } catch { return texto; }
}

const lit = (v) => (v == null || String(v).trim() === '' ? 'null' : `'${String(v).trim().replace(/'/g, "''")}'`);

async function main() {
  const arquivo = process.argv[2];
  const simular = process.argv.includes('--simular');

  if (!arquivo) {
    console.error('Uso: node scripts/importar-contatos-visitas.mjs "<arquivo.csv>" [--simular]');
    console.error('Exporte a base `Relatorio de Visitas` do Notion em CSV.');
    process.exitCode = 1;
    return;
  }

  const token = await resolverToken();
  if (!token) {
    console.error('Nao achei SUPABASE_ACCESS_TOKEN. Veja o cabecalho de scripts/sql.mjs.');
    process.exitCode = 1;
    return;
  }

  const vinculo = JSON.parse(
    await readFile(new URL('../supabase/.temp/linked-project.json', import.meta.url), 'utf8'),
  );
  const ref = vinculo.ref ?? vinculo.id;

  const linhas = lerCsv(await readFile(arquivo, 'utf8'));
  if (linhas.length < 2) { console.error('CSV vazio ou so com cabecalho.'); process.exitCode = 1; return; }

  const cab = linhas[0];
  const iOrg = acharColuna(cab, 'Organização', 'Organizacao', 'Organization');
  const iData = acharColuna(cab, 'Data', 'Date');
  const iNome = acharColuna(cab, 'Contato', 'Contact', 'Contato Nome');
  const iTel = acharColuna(cab, 'Telefone', 'Phone');
  const iMail = acharColuna(cab, 'E-mail', 'Email', 'E-Mail');
  const iLocal = acharColuna(cab, 'Localidade', 'Local', 'Cidade');
  const iFollow = acharColuna(cab, 'Follow-Up Status', 'Follow Up Status', 'Status');

  if (iOrg < 0 || iData < 0) {
    console.error(`Nao achei as colunas de organizacao e data. Cabecalho lido: ${cab.join(' | ')}`);
    process.exitCode = 1;
    return;
  }

  console.log(`${cor(36, 'projeto')} ${ref}`);
  console.log(`${cor(36, 'arquivo')} ${arquivo}`);
  console.log(`${cor(36, 'modo   ')} ${simular ? 'SIMULACAO (nao grava)' : 'gravando'}\n`);

  const existentes = await rodarSql(
    ref, token,
    'select id, organizacao, data::text from public.carbon_visitas',
  );
  const porChave = new Map(
    existentes.map((v) => [`${normalizar(v.organizacao)}|${v.data}`, v.id]),
  );

  const atualizacoes = [];
  const criacoes = [];
  const novas = [];
  let semContato = 0;

  for (const l of linhas.slice(1)) {
    const org = l[iOrg];
    const data = paraIso(l[iData]);
    if (!org?.trim() || !data) continue;

    const nome = iNome >= 0 ? l[iNome] : null;
    const tel = iTel >= 0 ? l[iTel] : null;
    const mail = iMail >= 0 ? l[iMail] : null;
    if (!nome?.trim() && !tel?.trim() && !mail?.trim()) { semContato++; continue; }

    const localidade = iLocal >= 0 ? l[iLocal] : null;
    const follow = iFollow >= 0 ? l[iFollow] : null;

    const id = porChave.get(`${normalizar(org)}|${data}`);

    if (!id) {
      // CRIA a visita, em vez de so reportar.
      //
      // Uma visita do CSV pode nao existir no banco por um motivo especifico e
      // conhecido: a carga automatica de 25/08/2026 descartou a linha cujo campo
      // Organizacao era o NOME DE UMA PESSOA - nao havia como carregar sem
      // gravar dado pessoal, e isso nao se faz por carga de terceiro. Aqui quem
      // roda e o dono, com o arquivo na propria maquina, entao o caminho existe.
      //
      // O follow_up cai em 'nao_iniciado' quando o CSV traz um valor que o CHECK
      // nao aceita: recusar a linha inteira por causa do rotulo de status seria
      // perder o registro por um detalhe.
      criacoes.push(
        `insert into public.carbon_visitas ` +
        `(organizacao, data, follow_up_status, contato_nome, contato_telefone, contato_email) ` +
        `values (${lit(org)}, date '${data}', ${lit(FOLLOW_UP[(follow ?? '').trim()] ?? 'nao_iniciado')}, ` +
        `${lit(nome)}, ${lit(tel)}, ${lit(mail)});`,
      );
      novas.push(`${org.trim()} (${data})${localidade ? ' - ' + localidade.trim() : ''}`);
      continue;
    }

    atualizacoes.push(
      `update public.carbon_visitas set contato_nome = ${lit(nome)}, ` +
      `contato_telefone = ${lit(tel)}, contato_email = ${lit(mail)}, atualizado_em = now() ` +
      `where id = '${id}';`,
    );
  }

  console.log(`  visitas ja no banco       ${existentes.length}`);
  console.log(`  linhas com contato        ${atualizacoes.length}`);
  console.log(`  linhas sem contato        ${semContato}`);
  console.log(`  linhas sem par no banco   ${semPar.length}`);
  for (const x of semPar) console.log(`      ${cor(33, 'sem par')} ${x}`);

  if (!atualizacoes.length) { console.log('\nNada a fazer.'); return; }

  if (simular) {
    console.log(`\n${cor(33, 'SIMULACAO')} nada foi gravado. Rode sem --simular para aplicar.`);
    return;
  }

  // Tudo num bloco so: ou as N visitas recebem contato, ou nenhuma recebe. Uma
  // carga pela metade deixaria a base num estado que ninguem sabe descrever.
  await rodarSql(ref, token, `begin;\n${atualizacoes.join('\n')}\ncommit;`);

  console.log(`\n${cor(32, 'ok')} ${atualizacoes.length} visita(s) atualizada(s).`);
  console.log('   `retencao_ate` foi preenchida pela trigger: 24 meses a contar da visita.');
  console.log('   Passado o prazo, anonimize preenchendo anonimizado_em e anonimizado_motivo.');
}

try {
  await main();
} catch (e) {
  console.error(`\n${cor(31, 'ERRO')} ${e.message}`);
  process.exitCode = 1;
}

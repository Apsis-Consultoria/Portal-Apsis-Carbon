// Confere os 4 questionários de verdade contra as TRÊS camadas que precisam
// concordar sobre eles.
//
// POR QUE ELE EXISTE. A definição de um formulário atravessa três validadores
// escritos em linguagens diferentes, e nenhum dos três conhece os outros:
//
//   1. o gatilho do banco  (carbon_questionario_definicao_valida, plpgsql)
//      recusa a DEFINIÇÃO malformada, no momento do seed;
//   2. a Edge Function     (validarRespostas, TypeScript)
//      recusa a RESPOSTA que não casa com a definição, no momento do save;
//   3. o wizard            (PerguntaWizard.jsx, React)
//      DESENHA a pergunta, e só sabe desenhar alguns tipos.
//
// Uma definição pode passar por 1 e 2 e ainda assim produzir uma pergunta que
// não se consegue responder na tela, ou uma que a tela deixa responder e o
// servidor recusa. É esse vão entre as camadas que este arquivo procura, e é o
// tipo de defeito que só aparece em campo, no meio da Amazônia, quando não há
// como corrigir.
//
// Ele lê o SEED, e não o banco: é o seed que define o que vai para produção, e
// rodar sem credencial é o que permite conferir antes de aplicar.
//
//   cd "C:/Users/FilipeOliveiraAPSISC/Sistemas/portal-apsis-carbon"; node scripts/verificar-questionarios.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = join(RAIZ, 'supabase/seeds/questionario_modelos.sql');

/* ===== As regras, copiadas de cada camada =================================
   Copiadas e não importadas de propósito: o gatilho é plpgsql e o validador é
   Deno/TypeScript, nenhum dos dois importável daqui. A cópia é o preço, e a
   linha de origem está anotada para quando divergirem. */

/** supabase/migrations/20260827090000_questionarios.sql, constante TIPOS. */
const TIPOS_DO_BANCO = new Set([
  'texto', 'texto_longo', 'numero', 'inteiro', 'data',
  'sim_nao', 'escolha', 'multipla', 'coordenada', 'arquivo',
]);

/** Mesma migration: chave de pergunta precisa casar com isto. */
const CHAVE_VALIDA = /^[a-z][a-z0-9_]{1,59}$/;

/** rotas/questionarios.ts, CHAVE_PESSOAL. Chave que casa tem a RESPOSTA
    recusada com 400 no save, o que torna a pergunta impossível de responder. */
const CHAVE_PESSOAL = /(^|_)(nome|contato|telefone|email|cpf|rg|assinatura)($|_)/;

/** src/components/PerguntaWizard.jsx: o que a tela sabe desenhar de fato.
    Tipo fora desta lista não vira mais campo de texto silencioso - a tela avisa
    que não sabe desenhar. Ainda assim é defeito, porque a pergunta fica sem
    resposta possível; este script é o portão que impede o seed de chegar lá. */
const TIPOS_QUE_A_TELA_DESENHA = new Set([
  'escolha', 'sim_nao', 'multipla', 'arquivo', 'texto_longo', 'data',
  'numero', 'inteiro', 'texto', 'coordenada',
]);

/** Tipos que a tela desenha com botões a partir de `opcoes`. Sem opção, a
    pergunta aparece vazia - o gatilho só cobre 'escolha' e 'multipla'. */
const TIPOS_COM_OPCOES = new Set(['escolha', 'sim_nao', 'multipla']);

/* ===== Extração do seed ==================================================== */

/**
 * Lê os pares (chave do modelo, definição) do arquivo de seed.
 *
 * Feito por varredura de caractere, e não por regex: o JSON tem chaves e aspas
 * dentro, e a string SQL escapa aspas simples duplicando. Uma regex sobre isso
 * é o tipo de coisa que funciona nos quatro de hoje e falha no quinto.
 */
function lerModelosDoSeed(sql) {
  const modelos = [];
  const marcador = 'values (';
  let i = 0;

  while ((i = sql.indexOf(marcador, i)) !== -1) {
    i += marcador.length;
    const campos = [];
    let atual = '';
    let dentroDeTexto = false;

    for (; i < sql.length; i += 1) {
      const c = sql[i];
      if (dentroDeTexto) {
        if (c === "'" && sql[i + 1] === "'") { atual += "'"; i += 1; continue; }
        if (c === "'") { dentroDeTexto = false; campos.push(atual); atual = ''; continue; }
        atual += c;
        continue;
      }
      if (c === "'") { dentroDeTexto = true; continue; }
      if (c === ')') break;
    }

    // (chave, nome, descricao, origem, versao, definicao) - a definição é a
    // última string do VALUES, e a chave é a primeira.
    if (campos.length >= 2) {
      const bruto = campos[campos.length - 1];
      if (bruto.trimStart().startsWith('{')) {
        modelos.push({ chave: campos[0], nome: campos[1], definicaoBruta: bruto });
      }
    }
  }
  return modelos;
}

/* ===== Conferência ========================================================= */

const problemas = [];
const avisos = [];
let totalPerguntas = 0;

function erro(modelo, chave, texto) {
  problemas.push({ modelo, chave, texto });
}
function aviso(modelo, chave, texto) {
  avisos.push({ modelo, chave, texto });
}

const sql = readFileSync(SEED, 'utf8');
const modelos = lerModelosDoSeed(sql);

console.log(`Seed: ${modelos.length} modelo(s) encontrado(s).\n`);

for (const m of modelos) {
  let definicao;
  try {
    definicao = JSON.parse(m.definicaoBruta);
  } catch (e) {
    erro(m.chave, '(definicao)', `JSON inválido no seed: ${e.message}`);
    continue;
  }

  if (!Array.isArray(definicao.secoes)) {
    erro(m.chave, '(definicao)', 'não tem "secoes" como lista - o gatilho recusa o seed');
    continue;
  }

  const vistas = new Set();
  let perguntasDoModelo = 0;
  const porTipo = {};

  for (const [is, secao] of definicao.secoes.entries()) {
    const ondeSecao = `secoes[${is}]`;

    if (!String(secao.titulo ?? '').trim()) {
      erro(m.chave, ondeSecao, 'seção sem título - o gatilho recusa o seed');
    }
    if (!Array.isArray(secao.perguntas)) {
      erro(m.chave, ondeSecao, 'seção sem lista de perguntas - o gatilho recusa o seed');
      continue;
    }
    if (secao.perguntas.length === 0) {
      aviso(m.chave, ondeSecao, `seção "${secao.titulo}" está vazia: vira um passo em branco no wizard`);
    }

    for (const p of secao.perguntas) {
      perguntasDoModelo += 1;
      totalPerguntas += 1;
      const chave = p.chave;
      porTipo[p.tipo] = (porTipo[p.tipo] ?? 0) + 1;

      // --- Camada 1: o gatilho do banco ---
      if (!chave || !CHAVE_VALIDA.test(chave)) {
        erro(m.chave, chave ?? '(nula)', 'chave fora de ^[a-z][a-z0-9_]{1,59}$ - o gatilho recusa o seed');
        continue;
      }
      if (vistas.has(chave)) {
        erro(m.chave, chave, 'chave repetida - o gatilho recusa o seed, e uma resposta sobrescreveria a outra');
      }
      vistas.add(chave);

      if (!TIPOS_DO_BANCO.has(p.tipo)) {
        erro(m.chave, chave, `tipo "${p.tipo}" não está na lista do gatilho - o seed não aplica`);
        continue;
      }
      if (['escolha', 'multipla'].includes(p.tipo) && !(p.opcoes ?? []).length) {
        erro(m.chave, chave, 'escolha sem opções - o gatilho recusa o seed');
      }

      // --- Camada 2: o validador de resposta da Edge Function ---
      if (CHAVE_PESSOAL.test(chave)) {
        erro(
          m.chave,
          chave,
          'a chave casa com CHAVE_PESSOAL: a RESPOSTA é recusada com 400 no save. ' +
          'A pergunta aparece na tela e não pode ser respondida por ninguém.',
        );
      }

      // --- Camada 3: o wizard ---
      if (!TIPOS_QUE_A_TELA_DESENHA.has(p.tipo)) {
        erro(
          m.chave,
          chave,
          `tipo "${p.tipo}" passa no gatilho do banco mas o wizard não sabe desenhar. ` +
          'A tela mostra o aviso de tipo desconhecido e a pergunta fica sem resposta possível. ' +
          'Ou acrescente o tipo em PerguntaWizard.jsx, ou troque o tipo no seed.',
        );
      }
      if (TIPOS_COM_OPCOES.has(p.tipo) && !(p.opcoes ?? []).length) {
        erro(m.chave, chave, `tipo "${p.tipo}" sem opções: o wizard mostra a pergunta sem nada para tocar`);
      }

      // --- Coerência interna das opções ---
      const opcoes = p.opcoes ?? [];
      const valores = new Set();
      for (const o of opcoes) {
        if (o.valor === undefined || o.valor === null || o.valor === '') {
          erro(m.chave, chave, 'opção sem "valor"');
        }
        if (valores.has(o.valor)) {
          erro(m.chave, chave, `valor de opção repetido: "${o.valor}" - a segunda é inalcançável`);
        }
        valores.add(o.valor);
        if (!String(o.rotulo ?? '').trim()) {
          erro(m.chave, chave, `opção "${o.valor}" sem rótulo: vira botão em branco`);
        }
      }
      if (opcoes.length && !TIPOS_COM_OPCOES.has(p.tipo)) {
        aviso(m.chave, chave, `tipo "${p.tipo}" tem opções que a tela ignora`);
      }

      // --- Rótulo ---
      if (!String(p.rotulo ?? '').trim()) {
        erro(m.chave, chave, 'pergunta sem rótulo: passo em branco no wizard');
      }

      // --- Obrigatória que não se consegue cumprir ---
      if (p.obrigatoria && p.tipo === 'arquivo') {
        aviso(
          m.chave,
          chave,
          'obrigatória e do tipo arquivo. Não existe upload no sistema: só se conclui ' +
          'escrevendo à mão onde a foto ficou.',
        );
      }
    }
  }

  const resumoTipos = Object.entries(porTipo)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${t}:${n}`)
    .join('  ');
  console.log(`  ${m.chave.padEnd(18)} ${String(perguntasDoModelo).padStart(3)} perguntas em ${String(definicao.secoes.length).padStart(2)} seções`);
  console.log(`  ${' '.repeat(18)} ${resumoTipos}\n`);
}

console.log(`Total: ${totalPerguntas} perguntas nos ${modelos.length} formulários.\n`);

if (avisos.length) {
  console.log(`AVISOS (${avisos.length}) - não impedem, mas alguém precisa saber:`);
  for (const a of avisos) console.log(`  [${a.modelo}] ${a.chave}: ${a.texto}`);
  console.log('');
}

if (problemas.length) {
  console.error(`PROBLEMAS (${problemas.length}):`);
  for (const p of problemas) console.error(`  [${p.modelo}] ${p.chave}: ${p.texto}`);
  process.exit(1);
}

console.log('Nenhum problema. As três camadas concordam sobre os 4 formulários.');

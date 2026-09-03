/**
 * Pseudonimizacao de nome de pessoa nos seeds - a fonte unica, lado JavaScript.
 *
 * Par de scripts/pseudonimos.py, e os dois leem o MESMO CSV, para a mesma pessoa
 * receber o mesmo marcador venha o seed de um gerador .py ou .mjs. A explicacao
 * completa da convencao esta no cabecalho do .py; o resumo:
 *
 *   [Pnnn]    substitua este termo por este marcador
 *   MANTER    VETO: nao e nome de pessoa. Cobre palavra comum que a heuristica
 *             marcou ("Tem", "Alta", "Falta") e TOPONIMO - `Maroxewara` e
 *             `Xeteria` sao ALDEIAS; `Pimentel`, `Barbosa`, `Marcos` e
 *             `Koatinemo` sao TERRAS INDIGENAS, e substituir apagaria o nome do
 *             territorio.
 *   PROTEGER  FRASE que contem um nome mas nao e nome de pessoa. Casada antes,
 *             por ser mais longa, e deixada intacta. Nasceu de "Paulo" casando
 *             dez vezes dentro de "Sao Paulo", a cidade.
 *
 * DUAS COISAS CODIFICADAS AQUI porque ja causaram vazamento:
 *   1. FALHA FECHADA: sem o arquivo, aborta. Devolver mapa vazio e seguir produz
 *      seed com nome cru e parece sucesso.
 *   2. CONFERIR A SAIDA: os dois vazamentos de 02/09/2026 foram pseudonimizacao
 *      aplicada em ALGUNS campos. Conferir a saida nao depende de memoria.
 */

import { readFile } from 'node:fs/promises';

export const CAMINHO_PADRAO = 'C:/Users/FilipeOliveiraAPSISC/notion-export/nomes-seeds.csv';

const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Carrega a lista. Aborta o processo se o arquivo nao existir ou estiver vazio. */
export async function carregar(caminho = CAMINHO_PADRAO) {
  let bruto;
  try {
    bruto = await readFile(caminho, 'utf8');
  } catch {
    console.error(
      `ABORTADO: nao encontrei ${caminho}.\n` +
      'Esse arquivo carrega os nomes de pessoa e vive FORA do repositorio de\n' +
      'proposito. Sem ele o seed sairia com nome de pessoa em texto livre, o que\n' +
      'e dado pessoal sob a LGPD e nao pode entrar no git.',
    );
    process.exit(1);
  }

  // Dois passes, para a ordem das linhas no arquivo nao importar: um veto
  // escrito ANTES da linha da pessoa tem que valer igual.
  const vetos = new Set();
  const protegidos = new Set();
  const mapa = new Map();
  for (const linha of bruto.replace(/^\uFEFF/, '').split(/\r?\n/).slice(1)) {
    if (!linha.trim()) continue;
    const campos = linha.split(';');
    if (campos.length < 2) continue;
    const codigo = campos[0].trim();
    const termo = campos[1].trim();
    if (!codigo || !termo) continue;
    if (codigo === 'MANTER') vetos.add(termo);
    else if (codigo === 'PROTEGER') protegidos.add(termo);
    else mapa.set(termo, codigo);
  }
  for (const v of vetos) mapa.delete(v);

  if (mapa.size === 0) {
    console.error('ABORTADO: a lista de nomes esta vazia. Nada seria substituido.');
    process.exit(1);
  }
  return { mapa, protegidos };
}

/**
 * Pseudonimizador: substitui e sabe conferir a propria saida.
 *
 * Uso:
 *   const p = await novoPseudonimizador();
 *   const texto = p.aplicar(bruto);
 *   p.conferirSaida(sqlGerado);   // ANTES de escrever o arquivo
 *   console.log('  ' + p.relatorio());
 */
export async function novoPseudonimizador(caminho = CAMINHO_PADRAO) {
  const { mapa, protegidos } = await carregar(caminho);
  const trocas = new Map();

  // MAIS LONGO PRIMEIRO, e nao e cosmetico: e o que faz PROTEGER funcionar, e o
  // que faz "Luciano Weiss" casar antes de "Luciano".
  const termos = [...new Set([...mapa.keys(), ...protegidos])].sort((a, b) => b.length - a.length);
  const padrao = new RegExp('\\b(' + termos.map(escapar).join('|') + ')\\b', 'g');

  return {
    mapa,
    protegidos,

    aplicar(texto) {
      const t = String(texto ?? '');
      if (!t) return t;
      return t.replace(padrao, (m) => {
        if (protegidos.has(m)) return m; // frase legitima: sai igual
        const codigo = mapa.get(m);
        trocas.set(codigo, (trocas.get(codigo) ?? 0) + 1);
        return codigo;
      });
    },

    /**
     * Aborta se algum nome sobreviveu. Chame ANTES de escrever o arquivo.
     *
     * USA O MESMO PADRAO DA SUBSTITUICAO, de proposito: o que a conferencia
     * acusa e exatamente o que `aplicar` teria trocado, e as duas nao podem
     * divergir. A primeira versao contava termo por termo e reportava UM
     * vazamento QUATRO vezes, porque a lista tem o nome completo e as partes
     * dele com o mesmo codigo, e todas casam dentro do nome completo.
     */
    conferirSaida(sqlGerado, rotulo = 'o SQL gerado') {
      const porCodigo = new Map();
      // `padrao` tem a flag g e e compartilhado: zera o lastIndex antes de usar,
      // senao uma chamada anterior deixa a varredura comecando no meio.
      padrao.lastIndex = 0;
      for (const m of sqlGerado.matchAll(padrao)) {
        const termo = m[1];
        if (protegidos.has(termo)) continue; // frase legitima
        const codigo = mapa.get(termo);
        porCodigo.set(codigo, (porCodigo.get(codigo) ?? 0) + 1);
      }
      if (porCodigo.size) {
        console.error(`ABORTADO: nome de pessoa sobreviveu em ${rotulo}.`);
        // Reporta o CODIGO, nunca o termo: imprimir poria o nome no log.
        for (const [codigo, n] of [...porCodigo.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
          console.error(`  ${codigo} aparece ${n} vez(es)`);
        }
        console.error('Algum campo de texto novo nao esta passando pela pseudonimizacao.');
        process.exit(1);
      }
    },

    /** Linha para o log, POR CODIGO. Nunca imprime termo. */
    relatorio() {
      const total = [...trocas.values()].reduce((a, b) => a + b, 0);
      if (!total) return 'nomes de pessoa trocados por marcador: nenhum';
      const codigos = [...trocas.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([c, n]) => `${c}=${n}`)
        .join('  ');
      return `nomes de pessoa trocados por marcador: ${total} ocorrencias em ${trocas.size} pessoas\n    ${codigos}`;
    },
  };
}

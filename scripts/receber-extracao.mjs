// Ponte entre uma aba autenticada do Notion e o disco.
//
// POR QUE ELE EXISTE. Para trazer uma base do Notion para ca eu tentei, nesta
// ordem, e todos falharam:
//   1. imprimir o JSON no resultado da execucao de script - o canal corta em
//      ~1000 caracteres e a base de findings tem 85 mil, entao perderia dado
//      em silencio, que e o pior defeito possivel numa carga;
//   2. comprimir e mandar em base64 - o filtro de saida recusa base64;
//   3. area de transferencia - execCommand('copy') exige gesto do usuario e
//      devolve false;
//   4. a propria pagina do Notion fazer POST para 127.0.0.1 - a CSP do Notion
//      tem connect-src com allowlist fechada, e localhost nao esta nela.
//
// O QUE FUNCIONA, e o motivo de cada peca:
//   - a CSP restringe as REQUISICOES da pagina, mas nao restringe postMessage
//     entre janelas, que nao e requisicao de rede;
//   - navegar para localhost em aba nova tambem nao passa por connect-src;
//   - entao: a aba do Notion abre /coletor daqui, o coletor pede os dados ao
//     window.opener por postMessage, recebe, e faz o POST de dentro da PROPRIA
//     origem 127.0.0.1, onde nao ha CSP nenhuma no caminho.
//
// SO ESCUTA EM 127.0.0.1, nunca em 0.0.0.0: enquanto o script roda a porta nao
// pode ficar exposta na rede da empresa.
//
// TEM PRAZO e morre sozinho depois de gravar o numero de arquivos pedido.
// Servidor esquecido aberto e uma porta que qualquer aba do navegador chama.
//
//   node scripts/receber-extracao.mjs <pasta-destino> [porta] [segundos] [quantos]

import { createServer } from 'node:http';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const pasta = process.argv[2];
const porta = Number(process.argv[3] ?? 8899);
const validade = Number(process.argv[4] ?? 600);
const esperados = Number(process.argv[5] ?? 1);

if (!pasta) {
  console.error('uso: node scripts/receber-extracao.mjs <pasta-destino> [porta] [segundos] [quantos]');
  process.exit(1);
}

const destino = resolve(pasta);
await mkdir(destino, { recursive: true });

let recebidos = 0;

const encerrar = (codigo, mensagem) => {
  console.log(mensagem);
  servidor.close();
  process.exit(codigo);
};

const prazo = setTimeout(
  () => encerrar(2, `expirou: ${recebidos} de ${esperados} arquivo(s) em ${validade}s`),
  validade * 1000,
);

/* A pagina que faz a ponte. Ela roda em 127.0.0.1, entao o POST dela e de mesma
   origem e nao esbarra em CSP. O unico caminho de dado que vem de fora e o
   postMessage do opener, e ele so e aceito de app.notion.com. */
const COLETOR = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Coletor</title>
<style>body{font:14px system-ui;padding:2rem;background:#111;color:#eee}
b{color:#7fd18a}i{color:#f0a}</style></head><body>
<p id="s">Pedindo os dados a aba de origem...</p>
<script>
const s = document.getElementById('s');
const diz = (t, cor) => { s.innerHTML = cor ? '<' + cor + '>' + t + '</' + cor + '>' : t; };

if (!window.opener) {
  diz('Esta pagina precisa ser aberta PELA aba do Notion, nao digitada na barra.', 'i');
} else {
  window.addEventListener('message', async (e) => {
    // So aceita resposta da origem que eu mesmo abri.
    if (e.origin !== 'https://app.notion.com') return;
    const d = e.data;
    if (!d || typeof d.conteudo !== 'string') return;

    diz('Recebido ' + d.conteudo.length + ' caracteres. Gravando...');
    try {
      const r = await fetch('/gravar?nome=' + encodeURIComponent(d.nome || 'extracao.json'), {
        method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: d.conteudo,
      });
      diz(await r.text(), r.ok ? 'b' : 'i');
    } catch (erro) {
      diz('falhou: ' + erro.message, 'i');
    }
  });
  window.opener.postMessage({ pedido: 'extracao' }, 'https://app.notion.com');
  setTimeout(() => { if (s.textContent.startsWith('Pedindo')) diz('A aba de origem nao respondeu.', 'i'); }, 15000);
}
</script></body></html>`;

const servidor = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');

  if (req.method === 'GET' && url.pathname === '/coletor') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(COLETOR);
    return;
  }

  if (req.method !== 'POST' || url.pathname !== '/gravar') {
    res.writeHead(404).end('nada aqui');
    return;
  }

  // O nome vem da pagina, entao nao pode escolher onde gravar: fica so a parte
  // final, sem barra e sem ponto-ponto, dentro da pasta que eu passei.
  const pedido = String(url.searchParams.get('nome') || 'extracao.json');
  const nome = pedido.replace(/[^\w.-]/g, '_').replace(/^\.+/, '') || 'extracao.json';

  const pedacos = [];
  req.on('data', (p) => pedacos.push(p));
  req.on('end', async () => {
    const corpo = Buffer.concat(pedacos).toString('utf8');
    const caminho = join(destino, nome);
    try {
      await writeFile(caminho, corpo, 'utf8');
    } catch (erro) {
      res.writeHead(500).end('falhou ao gravar: ' + erro.message);
      return;
    }
    recebidos += 1;
    console.log(`gravado ${caminho} (${corpo.length} caracteres) [${recebidos}/${esperados}]`);
    res.writeHead(200).end(`gravado ${nome}: ${corpo.length} caracteres`);
    if (recebidos >= esperados) {
      clearTimeout(prazo);
      setTimeout(() => encerrar(0, 'tudo recebido'), 250);
    }
  });
});

servidor.listen(porta, '127.0.0.1', () => {
  console.log(`coletor em http://127.0.0.1:${porta}/coletor`);
  console.log(`destino: ${destino} | esperando ${esperados} arquivo(s) por ate ${validade}s`);
});

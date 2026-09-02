# -*- coding: utf-8 -*-
"""
Falha se algum nome de pessoa da lista revisada aparecer em seed versionado.

POR QUE ELE EXISTE. Em 02/09/2026, na conferencia anterior ao push, os seeds da
prestacao de contas estavam com nome de pessoa em texto livre, ligado a valor
gasto, dentro de uma comunidade indigena - dado pessoal sob a LGPD, e em contexto
que caracteriza origem etnica (Art. 5). Duas causas no gerador:

  1. `sinal_pessoa` do revisao-termos-atas.csv e CONTAGEM, e o teste era
     `linha[3] == '1'`. Joedson tem 5, Marcelo 12, Tyge 3: nenhum casava.
  2. `pseudonimizar()` rodava so em atividade/evidencia/obs, nunca na DESCRICAO do
     lancamento, que e onde os nomes estavam.

As duas foram corrigidas, mas correcao em gerador nao se defende sozinha: basta
alguem regerar com o mapa ausente, ou colar SQL a mao. Este script e a rede.

ELE NAO CONTEM NENHUM NOME. A lista de nomes vive fora do repositorio, no mesmo
arquivo que o gerador usa. Sem esse arquivo o script aborta em vez de passar:
"nao consegui verificar" nunca deve parecer "esta limpo".

Uso:
    python scripts/verificar-seed-sem-nome.py
"""
import csv
import io
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SEEDS = RAIZ / 'supabase' / 'seeds'
ARQ_NOMES = Path('C:/Users/FilipeOliveiraAPSISC/notion-export/nomes-prestacao.csv')

# DIVIDA CONHECIDA, declarada de proposito e com data.
#
# Estes dois seeds JA ESTAO no histórico do git (commit d58fdc4) com nome de
# pessoa em texto livre. Corrigir o arquivo na ponta nao apaga o passado: quem
# clonar o repositorio e olhar aquele commit continua vendo os nomes. Limpar
# exige reescrever historico (git filter-repo ou BFG) e force push, o que quebra
# clone existente - e essa decisao e do dono do repositorio, nao deste script.
#
# ENQUANTO ESTAO AQUI, O ACHADO E CONTADO E IMPRESSO, mas nao derruba o exit. O
# proposito e este script poder servir de porteiro para o codigo NOVO sem ficar
# vermelho por uma divida antiga, que e como um verificador vira ruido e depois
# vira ignorado. Tirar um arquivo desta lista e o ultimo passo da correcao dele.
DIVIDA_CONHECIDA = {
    'backoffice_completo.sql',
    'findings_vvb_completo.sql',
}

# Padroes que nunca deveriam estar em seed, independentemente da lista de nomes.
PADROES = [
    ('CPF', re.compile(r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b')),
    ('CPF sem pontuacao', re.compile(r"'\d{11}'")),
    ('e-mail', re.compile(r'[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}')),
    ('telefone', re.compile(r'\(\d{2}\)\s?\d{4,5}-?\d{4}')),
]


def carregar_nomes():
    if not ARQ_NOMES.exists():
        sys.exit(
            'ABORTADO: nao encontrei %s.\n'
            'Sem a lista revisada nao da para afirmar que os seeds estao limpos, e\n'
            '"nao consegui verificar" nao pode passar por "esta limpo".' % ARQ_NOMES
        )
    nomes = []
    with io.open(ARQ_NOMES, encoding='utf-8-sig') as f:
        r = csv.reader(f, delimiter=';')
        next(r, None)
        for linha in r:
            if len(linha) >= 2 and linha[0].strip() and linha[1].strip():
                if linha[0].strip() != 'MANTER':
                    nomes.append(linha[1].strip())
    return nomes


nomes = carregar_nomes()
if not nomes:
    sys.exit('ABORTADO: a lista de nomes esta vazia. Nada foi verificado.')

# Mais longo primeiro, so para o relatorio apontar o achado mais especifico.
padrao_nomes = re.compile(
    r'\b(' + '|'.join(re.escape(n) for n in sorted(nomes, key=len, reverse=True)) + r')\b')

arquivos = sorted(SEEDS.glob('*.sql'))
if not arquivos:
    sys.exit('ABORTADO: nenhum seed encontrado em %s.' % SEEDS)

falhas = 0
pendentes = 0
for arq in arquivos:
    texto = arq.read_text(encoding='utf-8', errors='replace')
    conhecido = arq.name in DIVIDA_CONHECIDA
    rotulo_arq = 'PENDENTE' if conhecido else 'FALHA'

    # Conta ocorrencia POR LINHA para o relatorio ser acionavel, e informa o
    # TAMANHO do termo no lugar do termo - imprimir o nome poria ele de volta na
    # tela e no log do terminal, que e o que estamos tentando evitar.
    for i, linha in enumerate(texto.splitlines(), 1):
        for m in padrao_nomes.finditer(linha):
            print('%-9s %s:%d  nome de pessoa em texto versionado (%d caracteres)'
                  % (rotulo_arq, arq.name, i, len(m.group(1))))
            if conhecido:
                pendentes += 1
            else:
                falhas += 1
        for rot, padrao in PADROES:
            if padrao.search(linha):
                print('%-9s %s:%d  %s' % (rotulo_arq, arq.name, i, rot))
                if conhecido:
                    pendentes += 1
                else:
                    falhas += 1

print('')
print('%d seeds conferidos contra %d termos da lista revisada e %d padroes fixos.'
      % (len(arquivos), len(nomes), len(PADROES)))
if pendentes:
    print('%d ocorrencia(s) em divida conhecida (%s): ja estao no historico do git,'
          % (pendentes, ', '.join(sorted(DIVIDA_CONHECIDA))))
    print('  e a limpeza depende de decisao sobre reescrever historico. Nao derruba este check.')
if falhas:
    print('FALHOU: %d ocorrencia(s) NOVA(S). Nao faca commit.' % falhas)
    sys.exit(1)
print('ok: nenhum nome novo, e nenhum CPF, e-mail ou telefone nos seeds.')

# -*- coding: utf-8 -*-
"""
Pseudonimizacao de nome de pessoa nos seeds - a fonte unica, lado Python.

Existe porque a mesma logica de 30 linhas estava copiada em cada gerador, e a
copia divergiu na primeira mudanca de regra: quando o codigo `PROTEGER` foi
criado (para "Sao Paulo" nao ser confundido com a pessoa "Paulo"), a correcao
precisou ir a cinco arquivos. O par em JavaScript e scripts/pseudonimos.mjs, e os
dois leem o MESMO CSV.

-------------------------------------------------------------------------------
A CONVENCAO
-------------------------------------------------------------------------------
Nome proprio vira um marcador estavel `[Pnnn]`, o MESMO marcador para a mesma
pessoa em todos os seeds - entao "esta pessoa aparece na ata de marco e tambem na
prestacao de contas?" continua respondivel sem o nome existir no banco.

A lista vive FORA do repositorio, porque ela E a lista de nomes: versiona-la
desfaria a pseudonimizacao pela porta dos fundos. Colunas `codigo;termo;motivo`:

  [Pnnn]    substitua este termo por este marcador
  MANTER    VETO: nao e nome de pessoa. Nasceu do CSV das atas marcar como
            pessoa palavras comuns ("Tem" 7 sinais, "Alta" 12, "Falta" 9) e
            TOPONIMOS - `Maroxewara` e `Xeteria` sao ALDEIAS, e `Pimentel`,
            `Barbosa`, `Marcos` e `Koatinemo` sao TERRAS INDIGENAS. Substituir
            apagaria o nome do territorio, que e a dimensao que as telas usam.
  PROTEGER  FRASE que contem um nome mas nao e nome de pessoa. Casada ANTES (por
            ser mais longa) e deixada intacta, o que impede o termo curto de
            casar dentro dela. Nasceu de "Paulo" casando dez vezes dentro de
            "Sao Paulo", a cidade, e de "Zabotto" dentro de "Zabotto Ambiental",
            que e o fornecedor e nao a pessoa.

-------------------------------------------------------------------------------
DUAS COISAS QUE JA CAUSARAM VAZAMENTO, e por isso estao codificadas aqui
-------------------------------------------------------------------------------
1. FALHA FECHADA. Sem o arquivo, `carregar` ABORTA. O padrao anterior era
   devolver mapa vazio e seguir, o que produz seed com nome cru sem ninguem
   perceber: o pior resultado possivel, porque parece sucesso.

2. CONFERIR A SAIDA, e nao so os campos. Os dois vazamentos de 02/09/2026
   tiveram a mesma forma: a pseudonimizacao existia e era aplicada em ALGUNS
   campos - na atividade e na observacao, nunca na descricao do lancamento; no
   titulo da reuniao, nunca na descricao da tarefa. Conferir campo por campo
   depende de alguem lembrar de todos. `conferir_saida` nao depende de memoria.
"""
import csv
import io
import re
import sys
from pathlib import Path

CAMINHO_PADRAO = Path('C:/Users/FilipeOliveiraAPSISC/notion-export/nomes-seeds.csv')


def carregar(caminho=CAMINHO_PADRAO, com_vetos=False):
    """Devolve (mapa termo->codigo, frases protegidas) e, opcionalmente, os vetos.

    `com_vetos` existe porque quem combina a lista com uma fonte secundaria
    precisa aplicar o veto MANTER contra a fonte secundaria tambem.
    """
    caminho = Path(caminho)
    if not caminho.exists():
        sys.exit(
            'ABORTADO: nao encontrei %s.\n'
            'Esse arquivo carrega os nomes de pessoa e vive FORA do repositorio de\n'
            'proposito. Sem ele o seed sairia com nome de pessoa em texto livre, o\n'
            'que e dado pessoal sob a LGPD e nao pode entrar no git.' % caminho
        )

    # DOIS PASSES, para a ordem das linhas no arquivo nao importar. Na primeira
    # versao um veto escrito ANTES da linha da pessoa nao tinha efeito, o que e
    # uma armadilha silenciosa num CSV editado a mao.
    vetos, protegidos, mapa = set(), set(), {}
    with io.open(caminho, encoding='utf-8-sig') as f:
        leitor = csv.reader(f, delimiter=';')
        next(leitor, None)  # cabecalho
        for linha in leitor:
            if len(linha) < 2 or not linha[0].strip() or not linha[1].strip():
                continue
            codigo, termo = linha[0].strip(), linha[1].strip()
            if codigo == 'MANTER':
                vetos.add(termo)
            elif codigo == 'PROTEGER':
                protegidos.add(termo)
            else:
                mapa[termo] = codigo

    mapa = {t: c for t, c in mapa.items() if t not in vetos}
    if not mapa:
        sys.exit('ABORTADO: a lista de nomes esta vazia. Nada seria substituido.')
    if com_vetos:
        return mapa, protegidos, vetos
    return mapa, protegidos


def montar_padrao(mapa, protegidos):
    """Alternancia com nome E frase protegida, MAIS LONGO PRIMEIRO.

    A ordem nao e cosmetica: e o que faz PROTEGER funcionar. Com as frases na
    mesma alternancia, "Sao Paulo" (9 letras) e tentada antes de "Paulo" (5),
    casa, e quem consome a decide manter - entao o nome curto nunca chega a casar
    dentro dela. O mesmo vale para nome completo antes do primeiro nome:
    "Luciano Weiss" tem que casar antes de "Luciano", senao sai como dois
    marcadores em sequencia.
    """
    termos = sorted(set(mapa) | set(protegidos), key=len, reverse=True)
    return re.compile(r'\b(' + '|'.join(re.escape(t) for t in termos) + r')\b')


class Pseudonimizador:
    """Substitui nome por marcador e sabe conferir a propria saida."""

    def __init__(self, caminho=CAMINHO_PADRAO, extras=None):
        """`extras` e uma fonte SECUNDARIA de termo -> codigo.

        Existe para o gerar-seed-prestacao.py, que alem da lista revisada usa a
        heuristica do revisao-termos-atas.csv (os termos com `sinal_pessoa`
        exatamente 1). Os extras entram PRIMEIRO e a lista revisada sobrepoe, que
        e a ordem documentada: a lista e autoritativa porque a heuristica erra
        nos dois sentidos - classificou o Damiao como organizacao, e marcou como
        pessoa a aldeia MAROXEWARA e palavras comuns como "Tem" e "Houve". O veto
        MANTER da lista vale por cima de tudo.
        """
        self.mapa, self.protegidos, vetos = carregar(caminho, com_vetos=True)
        if extras:
            combinado = dict(extras)
            combinado.update(self.mapa)  # a lista revisada sobrepoe a heuristica
            # O VETO VALE TAMBEM CONTRA OS EXTRAS, e isto e o ponto: sem esta
            # linha a heuristica reintroduz exatamente o que a revisao humana
            # tirou, e "Tem foto?" volta a virar "[P875] foto?".
            self.mapa = {t: c for t, c in combinado.items() if t not in vetos}
        self.padrao = montar_padrao(self.mapa, self.protegidos)
        self.trocas = {}

    def aplicar(self, texto):
        if not texto:
            return texto

        def troca(m):
            termo = m.group(1)
            if termo in self.protegidos:
                return termo  # frase legitima: sai igual como entrou
            codigo = self.mapa[termo]
            self.trocas[codigo] = self.trocas.get(codigo, 0) + 1
            return codigo

        return self.padrao.sub(troca, texto)

    def conferir_saida(self, sql_gerado, rotulo='o SQL gerado'):
        """Aborta se algum nome sobreviveu. Chame ANTES de escrever o arquivo.

        USA O MESMO PADRAO DA SUBSTITUICAO, de proposito: assim o que a
        conferencia acusa e exatamente o que `aplicar` teria trocado, e as duas
        nao podem divergir.

        A primeira versao contava termo por termo e reportava UM vazamento
        QUATRO vezes: a lista tem o nome completo e as tres partes dele
        apontando para o mesmo codigo, e todas casam dentro do nome completo.
        Alem de inflar a contagem, dava a impressao de quatro problemas
        distintos - e o `finditer` do padrao unico resolve porque ele consome o
        trecho casado e nao volta atras.
        """
        por_codigo = {}
        for m in self.padrao.finditer(sql_gerado):
            termo = m.group(1)
            if termo in self.protegidos:
                continue  # frase legitima que contem um nome
            codigo = self.mapa[termo]
            por_codigo[codigo] = por_codigo.get(codigo, 0) + 1

        if por_codigo:
            print('ABORTADO: nome de pessoa sobreviveu em %s.' % rotulo, file=sys.stderr)
            # Reporta o CODIGO, nunca o termo: imprimir poria o nome no log.
            for codigo, n in sorted(por_codigo.items()):
                print('  %s aparece %d vez(es)' % (codigo, n), file=sys.stderr)
            print('Algum campo de texto novo nao esta passando pela pseudonimizacao.',
                  file=sys.stderr)
            sys.exit(1)

    def relatorio(self):
        """Linha para o log, POR CODIGO. Nunca imprime termo."""
        total = sum(self.trocas.values())
        if not total:
            return 'nomes de pessoa trocados por marcador: nenhum'
        codigos = '  '.join('%s=%d' % (c, n) for c, n in sorted(self.trocas.items()))
        return ('nomes de pessoa trocados por marcador: %d ocorrencias em %d pessoas\n    %s'
                % (total, len(self.trocas), codigos))

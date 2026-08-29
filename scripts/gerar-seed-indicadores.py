# Gera o seed SQL dos indicadores a partir de docs/indicadores/monitoring-plan.json.
#
# RODAR (depois de extrair-monitoring-plan.py):
#   python scripts/gerar-seed-indicadores.py
#
# Escreve supabase/seeds/indicadores_monitoring_plan.sql.
#
# POR QUE UM GERADOR E NAO SQL ESCRITO A MAO: sao 161 indicadores e 81 series de
# valores. SQL digitado erraria em algum lugar e o erro seria invisivel - um
# indicador com a unidade do vizinho nao quebra nada, so mente. Gerando, a
# planilha continua sendo a fonte: mudou a planilha, roda os dois scripts e o
# seed novo atualiza o banco no lugar de duplicar.
#
# IDEMPOTENTE POR CONSTRUCAO. O id de cada linha e derivado do conteudo
# (md5 do projeto + plano + ordem), entao reimportar faz UPDATE e nao INSERT.
# Sem isso, rodar duas vezes dobraria a serie e todo grafico passaria a contar
# cada ponto duas vezes - defeito que so aparece quando alguem confere na mao.

import io
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
ENTRADA = RAIZ / 'docs' / 'indicadores' / 'monitoring-plan.json'
SAIDA = RAIZ / 'supabase' / 'seeds' / 'indicadores_monitoring_plan.sql'

# Fim de cada trimestre. A convencao da migration e gravar a data FINAL do
# periodo, para a serie ordenar sozinha.
FIM_TRIMESTRE = {1: '03-31', 2: '06-30', 3: '09-30', 4: '12-31'}

# '1st', '2nd', '3th' (sic - a planilha escreve assim), '4th'.
RE_TRIMESTRE = re.compile(r'^\s*(\d)\s*(?:st|nd|rd|th)\s+Quarter\s+(\d{4})\s*$', re.I)
RE_ANO = re.compile(r'^\s*(\d{4})\s*$')


def sql_texto(v):
    """Literal de texto para SQL, ou NULL."""
    if v is None:
        return 'null'
    s = str(v)
    if not s.strip():
        return 'null'
    return "'" + s.replace("'", "''") + "'"


def classificar(unidade):
    """Mapeia a unidade da planilha para o enum `tipo` que a tabela ja tinha.

    A tabela nasceu com quatro tipos (contagem, percentual, volume, area) para
    indicadores de meta. O Plano de Monitoramento traz unidades que nao cabem
    exatamente nesses quatro ('Days', 'sp/ha', 'Decimal year'), e a escolha aqui
    e deliberadamente conservadora: o que nao e claramente percentual, area ou
    volume vira 'contagem', que e o tipo neutro. Errar para 'contagem' produz um
    rotulo generico; errar para 'volume' produziria uma agregacao errada.
    """
    if not unidade:
        return 'contagem'
    u = unidade.strip().lower()
    if u in ('%', 'proportion') or u.startswith('%'):
        return 'percentual'
    if u == 'ha':
        return 'area'
    if 'tco2e' in u:
        return 'volume'
    return 'contagem'


RE_MILHAR_EN = re.compile(r'^\d{1,3}(,\d{3})+$')


def numero(bruto):
    """Converte a celula em numero, ou devolve (None, motivo).

    A planilha nao e uniforme, e cada formato encontrado exige uma decisao:

    - 'N/A'  nao foi medido naquele periodo. NAO e zero, e a diferenca importa:
             zero medido e resultado, nao medido e lacuna. Ausencia de linha na
             tabela de medicoes ja significa "nao medido", entao pular e a
             representacao correta e nao uma perda.

    - 'R$ 2,119'  valor monetario com a unidade repetida dentro da celula. A
             planilha e a versao EN, e ali a virgula e separador de MILHAR:
             2,119 e dois mil cento e dezenove. Aplicar a leitura brasileira
             daria 2,119 reais para "total alocado no ano em apoio alimentar a
             comunidade", que nao descreve nada no mundo. A regra abaixo so trata
             a virgula como milhar quando ela e seguida de exatamente tres
             digitos; '2,5' continua sendo dois e meio.

    - 'Upper: 487 / Lower: 1,031'  NAO e um numero: sao dois, um para cada grupo
             Parakana (Alto e Baixo), que tem consultas CLPI e associacoes
             representativas separadas. Somar inventaria um total que a planilha
             nunca afirma. Fica de fora e e reportado - o que falta e uma decisao
             de produto sobre indicador com recorte por grupo, que vale para mais
             do que estas duas celulas.
    """
    s = str(bruto).strip()
    if not s or s.upper() in ('N/A', 'NA', '-'):
        return None, 'nao medido'

    if re.search(r'\b(upper|lower)\b', s, re.I):
        return None, 'valor separado por grupo (Alto/Baixo), precisa de decisao'

    # Tira simbolo de moeda e espacos; a unidade ja esta no indicador.
    s = re.sub(r'(?i)^\s*R\$\s*', '', s).replace('\xa0', ' ').strip()

    if RE_MILHAR_EN.match(s):
        s = s.replace(',', '')
    elif ',' in s:
        s = s.replace(',', '.')

    try:
        return float(s), None
    except ValueError:
        return None, f'formato nao reconhecido: {bruto!r}'


def periodo_para_data(rotulo):
    """'2024' -> ('2024-12-31', 'anual'); '1st Quarter 2026' -> ('2026-03-31',
    'trimestral'). Devolve None para rotulo que nao reconhece, em vez de
    chutar - um periodo mal lido colocaria a medicao no ano errado."""
    m = RE_TRIMESTRE.match(rotulo)
    if m:
        tri, ano = int(m.group(1)), m.group(2)
        if tri in FIM_TRIMESTRE:
            return f'{ano}-{FIM_TRIMESTRE[tri]}', 'trimestral'
        return None
    m = RE_ANO.match(rotulo)
    if m:
        return f'{m.group(1)}-12-31', 'anual'
    return None


def main():
    dados = json.loads(ENTRADA.read_text(encoding='utf-8'))

    linhas = []
    total_ind = 0
    total_med = 0
    ignorados = []
    nao_medidos = []

    for plano in ('clima', 'comunidade', 'biodiversidade'):
        for ordem, reg in enumerate(dados['planos'].get(plano, []), start=1):
            # No plano de Clima o "indicador" e o simbolo da metodologia e o
            # sentido esta na coluna Description. Quem le a tela precisa da
            # frase; quem fala com a VVB precisa do simbolo. Guardamos os dois:
            # nome recebe a frase, codigo recebe o simbolo.
            if plano == 'clima':
                codigo = reg['indicador']
                nome = reg.get('descricao') or reg['indicador']
                descricao = None
            else:
                codigo = None
                nome = reg['indicador']
                descricao = reg.get('descricao')

            unidade = reg.get('unidade')
            campos = {
                'plano': plano,
                'ordem': ordem,
                'codigo': codigo,
                'nome': nome,
                'descricao': descricao,
                'unidade': unidade,
                'tipo': classificar(unidade),
                'frequencia': reg.get('frequencia'),
                'atividade': reg.get('atividade'),
                'atividade_descricao': reg.get('atividade_descricao'),
                'output': reg.get('output'),
                'outcome': reg.get('outcome'),
                'impacto': reg.get('impacto'),
                'recurso': reg.get('recurso'),
            }

            linhas.append(f"""
  -- {plano} #{ordem}: {nome[:70].replace(chr(10), ' ')}
  v_ind := md5('carbon_ind:' || v_projeto::text || ':{plano}:{ordem}')::uuid;
  insert into public.carbon_indicadores (
    id, projeto_id, plano, ordem, codigo, nome, descricao, unidade, tipo,
    acumulativo, frequencia, atividade, atividade_descricao, output, outcome,
    impacto, recurso
  ) values (
    v_ind, v_projeto, {sql_texto(plano)}, {ordem}, {sql_texto(codigo)},
    {sql_texto(nome)}, {sql_texto(descricao)}, {sql_texto(unidade)},
    {sql_texto(campos['tipo'])},
    false,
    {sql_texto(campos['frequencia'])}, {sql_texto(campos['atividade'])},
    {sql_texto(campos['atividade_descricao'])}, {sql_texto(campos['output'])},
    {sql_texto(campos['outcome'])}, {sql_texto(campos['impacto'])},
    {sql_texto(campos['recurso'])}
  )
  on conflict (id) do update set
    codigo = excluded.codigo, nome = excluded.nome,
    descricao = excluded.descricao, unidade = excluded.unidade,
    tipo = excluded.tipo, frequencia = excluded.frequencia,
    atividade = excluded.atividade,
    atividade_descricao = excluded.atividade_descricao,
    output = excluded.output, outcome = excluded.outcome,
    impacto = excluded.impacto, recurso = excluded.recurso,
    atualizado_em = now();""".rstrip())
            total_ind += 1

            for rotulo, bruto in (reg.get('valores') or {}).items():
                periodo = periodo_para_data(rotulo)
                if periodo is None:
                    ignorados.append(f'{plano} #{ordem}: periodo {rotulo!r}')
                    continue
                valor, motivo = numero(bruto)
                if valor is None:
                    # 'nao medido' e o caso esperado e nao merece alarme; o resto
                    # e coisa que alguem precisa olhar.
                    destino = nao_medidos if motivo == 'nao medido' else ignorados
                    destino.append(f'{plano} #{ordem} ({nome[:40]}) em {rotulo}: {motivo}')
                    continue

                data, tipo_periodo = periodo
                linhas.append(f"""
  insert into public.carbon_indicador_medicoes (
    id, indicador_id, data, periodo_tipo, valor, origem
  ) values (
    md5('carbon_med:' || v_ind::text || ':{data}:{tipo_periodo}')::uuid,
    v_ind, date '{data}', '{tipo_periodo}', {valor}, 'interna'
  )
  on conflict (id) do update set
    valor = excluded.valor, atualizado_em = now();""".rstrip())
                total_med += 1

    cabecalho = f"""-- =============================================================================
-- Apsis Carbon - carga do Plano de Monitoramento
-- Arquivo: supabase/seeds/indicadores_monitoring_plan.sql
-- =============================================================================
-- GERADO POR scripts/gerar-seed-indicadores.py A PARTIR DE
-- docs/indicadores/monitoring-plan.json. Nao edite a mao: a proxima geracao
-- desfaz. Para mudar o conteudo, mude a planilha e rode os dois scripts.
--
-- Origem: {dados.get('origem', 'Monitoring Plan - EN.xlsx')}
-- Conteudo: {total_ind} indicadores, {total_med} medicoes.
--
-- DEPENDE DA MIGRATION 20260825120000_indicadores_monitoring_plan.sql. Rodar
-- antes dela falha em `column "plano" does not exist`.
--
-- IDEMPOTENTE: o id de cada linha vem do md5 do conteudo, entao rodar de novo
-- ATUALIZA e nao duplica.
--
-- LGPD: nenhuma linha aqui tem nome, e-mail ou telefone de pessoa. A planilha
-- traz colunas de responsavel; elas NAO sao importadas. O conteudo e indicador,
-- unidade, periodicidade e numero medido.
-- =============================================================================

do $$
declare
  v_projeto uuid;
  v_ind     uuid;
begin
  -- O Plano de Monitoramento e do projeto REDD+ Awaete / Parakana. A busca e
  -- por nome porque o id e gerado no banco e difere entre ambientes.
  --
  -- FALHA ALTO SE NAO ACHAR, de proposito: sem projeto, um seed silencioso
  -- inseriria zero linha e a tela apareceria vazia sem ninguem saber por que.
  select id into v_projeto
    from public.carbon_projetos
   where nome ilike '%parakan%' or nome ilike '%awaet%'
   order by criado_em
   limit 1;

  if v_projeto is null then
    raise exception
      'Nenhum projeto com nome contendo "parakan" ou "awaet" existe em carbon_projetos. Crie o projeto antes de rodar este seed, ou ajuste a busca acima.';
  end if;
"""

    rodape = """
end
$$;

-- Conferencia rapida depois de rodar:
--   select plano, count(*) from public.carbon_indicadores
--    where plano is not null group by plano order by plano;
--   select count(*) from public.carbon_indicador_medicoes m
--     join public.carbon_indicadores i on i.id = m.indicador_id
--    where i.plano is not null;
"""

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    with io.open(SAIDA, 'w', encoding='utf-8', newline='\n') as f:
        f.write(cabecalho + '\n'.join(linhas) + rodape)

    print(f'Escrito: {SAIDA}')
    print(f'  {total_ind} indicadores, {total_med} medicoes')
    print(f'  {len(nao_medidos)} celula(s) marcada(s) como nao medida (esperado, sem linha na tabela)')
    if ignorados:
        print(f'  {len(ignorados)} celula(s) PRECISAM DE DECISAO:')
        for x in ignorados:
            print(f'    - {x}')
    else:
        print('  nenhuma celula pendente de decisao')


main()

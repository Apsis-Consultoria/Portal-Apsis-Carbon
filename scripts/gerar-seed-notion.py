# Gera o seed SQL dos dados reais do Notion a partir de
# docs/notion/dados/coleta-25-08.json.
#
# RODAR:
#   python scripts/gerar-seed-notion.py
#
# Escreve supabase/seeds/notion_dados_reais.sql.
#
# POR QUE GERADOR E NAO SQL A MAO: sao mais de 150 registros em 11 tabelas, com
# vocabulario que precisa casar exatamente com os CHECK do banco. SQL digitado
# erraria um valor em algum lugar, e o erro seria 23514 no meio da carga - ou,
# pior, um valor plausivel e errado que ninguem percebe.
#
# IDEMPOTENTE: cada linha tem id derivado do conteudo (md5), entao rodar de novo
# atualiza em vez de duplicar.
#
# LGPD: a coleta ja entra sem nome de pessoa fisica, telefone ou e-mail pessoal.
# Este script nao tem como reintroduzir o que nao esta no JSON. As colunas
# carbon_visitas.contato_nome, contato_telefone e contato_email ficam NULL de
# proposito, e o motivo esta escrito no cabecalho do SQL gerado.

import io
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
ENTRADA = RAIZ / 'docs' / 'notion' / 'dados' / 'coleta-25-08.json'
SAIDA = RAIZ / 'supabase' / 'seeds' / 'notion_dados_reais.sql'


def txt(v):
    if v is None:
        return 'null'
    s = str(v).strip()
    if not s:
        return 'null'
    return "'" + s.replace("'", "''") + "'"


def data(v):
    return f"date '{v}'" if v else 'null'


def num(v):
    return str(v) if v is not None else 'null'


def uid(semente):
    """Id deterministico, derivado do conteudo. Igual ao seed de indicadores."""
    return f"md5('{semente}')::uuid"


# ---------------------------------------------------------------------------
# Traducoes do vocabulario do Notion para os CHECK do banco.
# Cada uma foi conferida contra o pg_constraint em 25/08/2026.
# ---------------------------------------------------------------------------

STATUS_FORNECEDOR = {
    'Concluído': 'concluida',
    'Em andamento': 'em_andamento',
    None: 'nao_iniciada',
}

STATUS_ATIVIDADE = {
    'Em andamento': 'em_andamento',
    'Não iniciada': 'nao_iniciada',
    'Nao iniciada': 'nao_iniciada',
    'Concluída': 'concluida',
}

PRIORIDADE = {'Baixa': 'baixa', 'Média': 'media', 'Media': 'media', 'Alta': 'alta'}

TIPO_ATIVIDADE = {
    'Consultoria': 'consultoria',
    'Novos Negócios': 'novos_negocios',
    'JPF': 'jpf',
    'Backoffice': 'backoffice',
    'Projeto': 'projeto',
}

FOLLOW_UP = {
    'Não iniciada': 'nao_iniciado',
    'Em andamento': 'em_andamento',
    'Concluída': 'concluido',
}

# Findings: o Notion tem DUAS colunas de estado (Status e Revisao) e o banco tem
# uma. A combinacao das duas e o que diz o estado de verdade, e por isso a
# traducao olha as duas.
def estado_finding(status, revisao):
    if status == 'Closed':
        return 'fechado'
    if status == 'New Finding':
        return 'aberto'
    # status Open: quem manda e a coluna Revisao.
    if revisao == 'Concluído':
        # A equipe respondeu e espera a VVB. Nao e 'fechado', porque quem fecha
        # e a VVB, nao nos.
        return 'respondido'
    return 'em_andamento'


EVIDENCIA_FINDING = {
    'N/A': 'nao_aplicavel',
    'OK': 'ok',
    'Pendente': 'pendente',
    'Em andamento': 'pendente',
    None: 'pendente',
}

DOCUMENTO_ALVO = {'PD': 'pdd', 'MR': 'monitoramento'}


def main():
    d = json.loads(ENTRADA.read_text(encoding='utf-8'))
    L = []
    contagem = {}

    def bloco(titulo):
        L.append(f'\n  -- {"-" * 70}\n  -- {titulo}\n  -- {"-" * 70}')

    # ----- Fornecedores -----------------------------------------------------
    bloco('Fornecedores (Notion: Cadastro de Fornecedores)')
    for f in d['fornecedores']['registros']:
        L.append(f"""  insert into public.carbon_fornecedores (id, nome, status_contratacao)
  values ({uid('forn:' + f['nome'])}, {txt(f['nome'])}, {txt(STATUS_FORNECEDOR[f['status_contratacao']])})
  on conflict (id) do update set
    nome = excluded.nome, status_contratacao = excluded.status_contratacao,
    atualizado_em = now();""")
    contagem['carbon_fornecedores'] = len(d['fornecedores']['registros'])

    # ----- Contrato e parcelas ---------------------------------------------
    # A base de parcelas do Notion nao tem contrato: ela pendura a parcela
    # direto no fornecedor. O banco exige contrato, e com razao - parcela sem
    # contrato nao tem objeto nem valor total. As seis parcelas sao todas do
    # mesmo fornecedor, mesmo servico e mesmo centro de custo, entao formam UM
    # contrato, e a soma delas (60000) e o valor total, que bate com o SUM que
    # o proprio Notion exibe.
    bloco('Contrato e parcelas (Notion: cadastro de parcelas)')
    parcelas = d['parcelas']['registros']
    total = sum(p['valor'] for p in parcelas)
    id_contrato = uid('contrato:PWPB:Apoio Juridico')
    L.append(f"""  insert into public.carbon_contratos
    (id, fornecedor_id, objeto, valor_total, centro_custo, tipo_servico, status, data_contratacao)
  values ({id_contrato}, {uid('forn:PWPB')}, 'Apoio Juridico', {total}, 'Juridico',
          'Apoio Juridico', 'ativo', date '2025-01-07')
  on conflict (id) do update set
    valor_total = excluded.valor_total, atualizado_em = now();""")

    for i, p in enumerate(sorted(parcelas, key=lambda x: x['vencimento']), start=1):
        L.append(f"""  insert into public.carbon_parcelas
    (id, contrato_id, numero, valor, vencimento, data_pagamento, tipo_servico, centro_custo)
  values ({uid('parcela:PWPB:' + p['vencimento'])}, {id_contrato}, {i}, {p['valor']},
          {data(p['vencimento'])}, {data(p.get('pagamento'))},
          {txt(p['tipo_servico'])}, {txt(p['centro_custo'])})
  on conflict (id) do update set
    valor = excluded.valor, data_pagamento = excluded.data_pagamento, atualizado_em = now();""")
    contagem['carbon_contratos'] = 1
    contagem['carbon_parcelas'] = len(parcelas)

    # ----- Compradores ------------------------------------------------------
    bloco('Compradores (Notion: Compradores). E-mail pessoal NAO importado.')
    for c in d['compradores']['registros']:
        # A flag `recorrente` tem que concordar com o estagio: existe o CHECK
        # carbon_compradores_recorrencia_coerente_chk para impedir um comprador
        # marcado como recorrente sem a flag, e vice-versa. Derivar a flag do
        # estagio, em vez de deixar o default, e o que mantem as duas coerentes.
        eh_recorrente = 'true' if c['estagio'] == 'recorrente' else 'false'
        L.append(f"""  insert into public.carbon_compradores
    (id, nome, status, recorrente, sigiloso, observacoes)
  values ({uid('comprador:' + c['nome'])}, {txt(c['nome'])}, {txt(c['estagio'])},
          {eh_recorrente}, true,
          'Registro sob NDA no Notion. O e-mail de contato da origem e de pessoa fisica e nao foi importado (LGPD).')
  on conflict (id) do update set
    nome = excluded.nome, recorrente = excluded.recorrente, atualizado_em = now();""")
    contagem['carbon_compradores'] = len(d['compradores']['registros'])

    # ----- Parceiros --------------------------------------------------------
    bloco('Parceiros citados nas reunioes por parceiro')
    for nome, tipo in (('INDEVA', 'instituto'), ('IPES', 'instituto')):
        L.append(f"""  insert into public.carbon_parceiros (id, nome, tipo)
  values ({uid('parceiro:' + nome)}, {txt(nome)}, {txt(tipo)})
  on conflict (id) do update set nome = excluded.nome, atualizado_em = now();""")
    contagem['carbon_parceiros'] = 2

    # ----- Reunioes ---------------------------------------------------------
    bloco('Reunioes Apsis Carbon (weekly) e Reunioes Parakana')
    n_reunioes = 0
    for dt in d['reunioes_apsis']['datas']:
        L.append(f"""  insert into public.carbon_reunioes (id, tipo, titulo, data)
  values ({uid('reuniao:apsis:' + dt)}, 'semanal', 'Weekly Apsis Carbon', {data(dt)})
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();""")
        n_reunioes += 1

    for r in d['reunioes_parakana']['registros']:
        L.append(f"""  insert into public.carbon_reunioes (id, projeto_id, tipo, titulo, data, parceiro)
  values ({uid('reuniao:parakana:' + r['data'] + ':' + r['titulo'])}, v_projeto,
          {txt(r['tipo'])}, {txt(r['titulo'])}, {data(r['data'])}, {txt(r.get('parceiro'))})
  on conflict (id) do update set titulo = excluded.titulo, atualizado_em = now();""")
        n_reunioes += 1
    contagem['carbon_reunioes'] = n_reunioes

    # ----- Atividades -------------------------------------------------------
    bloco('Atividades Apsis Carbon e Atividades Parakana')
    n_at = 0
    for a in d['atividades_apsis']['registros']:
        L.append(f"""  insert into public.carbon_atividades
    (id, nome, status, prioridade, tipo, data_inicio, data_fim, horas_planejadas)
  values ({uid('atividade:apsis:' + a['nome'])}, {txt(a['nome'])},
          {txt(STATUS_ATIVIDADE[a['status']])}, {txt(PRIORIDADE[a['prioridade']])},
          {txt(TIPO_ATIVIDADE[a['tipo']])}, {data(a['inicio'])}, {data(a['fim'])},
          {num(a['hh_planejadas'])})
  on conflict (id) do update set status = excluded.status, atualizado_em = now();""")
        n_at += 1

    for a in d['atividades_parakana']['registros']:
        L.append(f"""  insert into public.carbon_atividades
    (id, projeto_id, nome, status, prioridade, tipo, data_fim)
  values ({uid('atividade:parakana:' + a['nome'])}, v_projeto, {txt(a['nome'])},
          {txt(STATUS_ATIVIDADE[a['status']])}, {txt(PRIORIDADE[a['prioridade']])},
          {txt(TIPO_ATIVIDADE[a['tipo']])}, {data(a['prazo'])})
  on conflict (id) do update set status = excluded.status, atualizado_em = now();""")
        n_at += 1
    contagem['carbon_atividades'] = n_at

    # ----- Viagens e visitas ------------------------------------------------
    # O Notion tem so a visita, com a cidade repetida em cada linha. O banco
    # separa viagem de visita, o que e melhor: a viagem tem custo e periodo, e a
    # visita tem o contato. Agrupamos por cidade, que e o que a origem permite.
    bloco('Viagens e visitas (Notion: Relatorio de Visitas). Contato NAO importado.')
    visitas = d['visitas']['registros']
    cidades = {}
    for v in visitas:
        cidades.setdefault(v['localidade'], []).append(v['data'])
    for cidade, datas in cidades.items():
        L.append(f"""  insert into public.carbon_viagens (id, titulo, cidade, data_inicio, data_fim)
  values ({uid('viagem:' + cidade)}, {txt('Prospeccao ' + cidade)}, {txt(cidade)},
          {data(min(datas))}, {data(max(datas))})
  on conflict (id) do update set data_fim = excluded.data_fim, atualizado_em = now();""")
    for v in visitas:
        L.append(f"""  insert into public.carbon_visitas
    (id, viagem_id, organizacao, data, follow_up_status)
  values ({uid('visita:' + v['organizacao'] + ':' + v['data'])}, {uid('viagem:' + v['localidade'])},
          {txt(v['organizacao'])}, {data(v['data'])}, {txt(FOLLOW_UP[v['follow_up']])})
  on conflict (id) do update set
    follow_up_status = excluded.follow_up_status, atualizado_em = now();""")
    contagem['carbon_viagens'] = len(cidades)
    contagem['carbon_visitas'] = len(visitas)

    # ----- Candidatos -------------------------------------------------------
    bloco('Candidatos (Notion: Novos Negocios JPF)')
    for c in d['novos_negocios_jpf']['registros']:
        if c['segmento']:
            segmento, obs = c['segmento'], None
        else:
            # `segmento` e NOT NULL com default 'redd_privado', e nenhum dos tres
            # valores aceitos (terra_indigena, redd_privado, agro) descreve uma
            # Floresta Nacional, que e unidade de conservacao federal e terra
            # PUBLICA. Nao da para deixar nulo e nao da para rotular certo.
            #
            # Fica com o default e a divergencia escrita na observacao, em vez de
            # um rotulo errado e silencioso. O enum e que precisa de um valor
            # novo; ate la, o registro existe e diz que esta mal classificado.
            segmento = 'redd_privado'
            obs = ('Segmento mal classificado: e unidade de conservacao federal '
                   '(Floresta Nacional), categoria que o enum de segmento ainda '
                   'nao tem. Ficou com o valor padrao. Corrigir quando o enum '
                   'ganhar a categoria.')
        L.append(f"""  insert into public.carbon_candidatos (id, nome, segmento, etapa, observacoes)
  values ({uid('candidato:' + c['nome'])}, {txt(c['nome'])}, {txt(segmento)}, 'triagem', {txt(obs)})
  on conflict (id) do update set
    segmento = excluded.segmento, observacoes = excluded.observacoes, atualizado_em = now();""")
    contagem['carbon_candidatos'] = len(d['novos_negocios_jpf']['registros'])

    # ----- Rodadas e findings ----------------------------------------------
    # O Notion tem a view "2nd Round Findings" e marca parte dos itens como
    # "New Finding". Lemos assim: quem esta como New Finding veio na 2a rodada,
    # o resto veio na 1a. E a unica leitura que a origem sustenta.
    bloco('Rodadas de auditoria e findings da VVB')
    L.append(f"""  insert into public.carbon_auditoria_rodadas (id, projeto_id, origem, numero)
  values ({uid('rodada:vvb:1')}, v_projeto, 'vvb', 1)
  on conflict (id) do nothing;
  insert into public.carbon_auditoria_rodadas (id, projeto_id, origem, numero)
  values ({uid('rodada:vvb:2')}, v_projeto, 'vvb', 2)
  on conflict (id) do nothing;""")

    for i, f in enumerate(d['vvb_findings']['registros'], start=1):
        rodada = uid('rodada:vvb:2') if f['status'] == 'New Finding' else uid('rodada:vvb:1')
        semente = f"finding:{f['documento']}:{f['item']}:{i}"

        # O Notion tem DUAS colunas de trabalho em portugues: "Action to be
        # realized" (o que se planejou fazer) e "Comments" (o que se apurou
        # depois). O banco tem um campo so para nota de trabalho. Juntar as duas
        # com rotulo preserva a distincao; descartar a segunda, como a primeira
        # versao deste script fazia, perdia a conferencia item a item que a
        # equipe registrou - que e justamente a prova de que o finding foi
        # tratado.
        partes = []
        if f.get('acao_planejada'):
            partes.append('Planejado: ' + f['acao_planejada'])
        if f.get('comentario'):
            partes.append('Apurado: ' + f['comentario'])
        plano = '\n\n'.join(partes) if partes else None
        L.append(f"""  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo, capitulo_ref,
     descricao_en, acao_exigida_en, plano_resposta_pt, estado, estado_evidencia)
  values ({uid(semente)}, {rodada}, {txt(f['tipo'].lower())}, {txt(f['item'])}, {i},
          {txt(DOCUMENTO_ALVO[f['documento']])}, {txt(f.get('secao'))},
          {txt(f['descricao'])}, {txt(f.get('acao_requerida'))},
          {txt(plano)},
          {txt(estado_finding(f['status'], f['revisao']))},
          {txt(EVIDENCIA_FINDING.get(f.get('evidencia'), 'pendente'))})
  on conflict (id) do update set
    estado = excluded.estado, estado_evidencia = excluded.estado_evidencia,
    plano_resposta_pt = excluded.plano_resposta_pt, atualizado_em = now();""")

    # ----- Findings da Verra ------------------------------------------------
    # Rodada propria: a Verra e outro avaliador, com outro ciclo. Misturar com a
    # VVB faria "quantos findings abertos temos" devolver um numero que nao
    # corresponde a nenhuma conversa real.
    bloco('Findings da Verra (rodada propria) e as evidencias como subitens')
    L.append(f"""  insert into public.carbon_auditoria_rodadas (id, projeto_id, origem, numero)
  values ({uid('rodada:verra:1')}, v_projeto, 'verra', 1)
  on conflict (id) do nothing;""")

    n_sub = 0
    for f in d['findings_verra']['registros']:
        semente = f"finding:verra:{f['item']}"
        # A Verra nao diz a qual documento o finding se refere: as perguntas sao
        # sobre o projeto, nao sobre uma secao. 'outro' e o valor honesto.
        estado = {'OK': 'respondido', 'Revisão': 'em_andamento'}.get(f.get('status'), 'aberto')
        L.append(f"""  insert into public.carbon_findings
    (id, rodada_id, tipo, identificador, ordem, documento_alvo,
     descricao_en, resposta_oficial_en, plano_resposta_pt, estado, estado_evidencia)
  values ({uid(semente)}, {uid('rodada:verra:1')}, {txt(f['tipo'].lower())},
          {txt(f['item'])}, {f['item']}, 'outro',
          {txt(f['descricao'])}, {txt(f.get('resposta_oficial'))},
          {txt(f.get('comentario'))}, {txt(estado)},
          {txt('ok' if f.get('evidencias') else 'pendente')})
  on conflict (id) do update set
    resposta_oficial_en = excluded.resposta_oficial_en,
    plano_resposta_pt = excluded.plano_resposta_pt,
    estado = excluded.estado, atualizado_em = now();""")

        for j, ev in enumerate(f.get('evidencias') or [], start=1):
            L.append(f"""  insert into public.carbon_finding_subitens (id, finding_id, descricao, ordem)
  values ({uid(semente + ':sub:' + str(j))}, {uid(semente)}, {txt(ev)}, {j})
  on conflict (id) do update set descricao = excluded.descricao, atualizado_em = now();""")
            n_sub += 1

    contagem['carbon_auditoria_rodadas'] = 3
    contagem['carbon_findings'] = len(d['vvb_findings']['registros']) + len(d['findings_verra']['registros'])
    contagem['carbon_finding_subitens'] = n_sub

    # ----- Funil da Consultoria ---------------------------------------------
    bloco('Funil da Consultoria (Notion: Propostas (APs) e Consultorias (APs))')
    cons = d['consultoria']
    for i, p in enumerate(cons['propostas'], start=1):
        status = {'Ganha': 'ganha', 'Elaboracao': 'elaboracao',
                  'Elaboração': 'elaboracao'}.get(p['status'], 'elaboracao')
        # `criado_em` do Notion vem como 2025-02-19T12:24, sem fuso. Gravado como
        # timestamptz na hora local do banco: a precisao de minuto nao muda
        # decisao nenhuma aqui, e inventar fuso seria pior.
        L.append(f"""  insert into public.carbon_propostas
    (id, codigo, titulo, cliente, status, grupo_servico, data_criacao, data_ganha)
  values ({uid('proposta:' + str(i) + ':' + (p.get('codigo') or 'sem-codigo'))},
          {txt(p.get('codigo'))}, {txt(p.get('codigo') or 'Proposta sem codigo')},
          {txt(p.get('cliente'))}, {txt(status)}, {txt(p.get('grupo_servico'))},
          {("timestamptz '" + p['criado_em'] + "'") if p.get('criado_em') else 'null'},
          {data(p['criado_em'][:10]) if status == 'ganha' and p.get('criado_em') else 'null'})
  on conflict (id) do update set
    status = excluded.status, cliente = excluded.cliente, atualizado_em = now();""")

    n_cons = 0
    for i, c in enumerate(cons['consultorias'], start=1):
        if not c.get('projeto'):
            # Duas linhas do Notion nao tem nome nenhum. `nome` e NOT NULL e nao
            # ha o que inventar: ficam de fora e o motivo esta no relatorio.
            continue
        status = {'Em andamento': 'em_andamento',
                  'Nao iniciada': 'nao_iniciada',
                  'Não iniciada': 'nao_iniciada'}.get(c['status'], 'nao_iniciada')
        obs = 'Registro de teste na origem.' if c.get('_teste') else None
        L.append(f"""  insert into public.carbon_consultorias (id, nome, status, prazo, observacoes)
  values ({uid('consultoria:' + str(i) + ':' + c['projeto'])}, {txt(c['projeto'])},
          {txt(status)}, {data(c.get('prazo'))}, {txt(obs)})
  on conflict (id) do update set
    status = excluded.status, prazo = excluded.prazo, atualizado_em = now();""")
        n_cons += 1

    contagem['carbon_propostas'] = len(cons['propostas'])
    contagem['carbon_consultorias'] = n_cons

    # ----- PDD, MR e evidencias --------------------------------------------
    # Aqui NAO inserimos linha a linha: o banco ja tem as funcoes que criam o
    # checklist a partir do template, e elas sao idempotentes. Depois de criar,
    # aplicamos o status real lido no Notion.
    bloco('PDD, Monitoring Report e evidencias: instancia do template + status real')
    L.append("""  perform public.carbon_pdd_criar_do_template(v_projeto, null);
  perform public.carbon_mr_criar_do_template(v_projeto, null);
  perform public.carbon_evidencias_criar_do_template(v_projeto, null);

  -- PDD: o Notion mostra COMPLETE 100%, os 43 capitulos concluidos.
  update public.carbon_pdd_capitulos set status = 'concluido', atualizado_em = now()
   where projeto_id = v_projeto;""")

    mr = d['monitoring_report_status']['por_capitulo']
    revisao2 = sorted(k for k, v in mr.items() if v == 'Revisão 2')
    concluidos = sorted(k for k, v in mr.items() if v == 'Concluído')
    andamento = sorted(k for k, v in mr.items() if v == 'Em andamento')

    def lista(xs):
        return ', '.join(txt(x.rstrip('.')) for x in xs)

    L.append(f"""
  -- Monitoring Report: tres estados diferentes, lidos capitulo a capitulo.
  -- 'Revisao 2' do Notion vira estado em_revisao COM rodada 2: as duas
  -- informacoes vivem em colunas separadas aqui, e juntar as duas numa string
  -- perderia a capacidade de perguntar "o que esta na segunda volta".
  update public.carbon_mr_capitulos set estado = 'em_revisao', rodada = 2, atualizado_em = now()
   where projeto_id = v_projeto and capitulo in ({lista(revisao2)});

  update public.carbon_mr_capitulos set estado = 'concluido', atualizado_em = now()
   where projeto_id = v_projeto and capitulo in ({lista(concluidos)});

  update public.carbon_mr_capitulos set estado = 'em_andamento', atualizado_em = now()
   where projeto_id = v_projeto and capitulo in ({lista(andamento)});

  -- COMENTARIOS_MR_AQUI

  -- Evidencias: no Notion quase tudo esta como 'Anexado Pasta', que e
  -- justamente o problema que a tela existe para resolver (o arquivo esta em
  -- alguma pasta, sem vinculo). Marcamos como anexada, que e o estado honesto:
  -- existe evidencia, e ela ainda nao foi aceita pela VVB.
  update public.carbon_evidencia_itens
     set estado_evidencia = 'anexada', status_resposta = 'concluido', atualizado_em = now()
   where projeto_id = v_projeto;""")

    # Comentarios de capitulo do MR. Sao poucos e sao o unico texto que a equipe
    # escreveu explicando POR QUE o capitulo esta no estado em que esta - o
    # estado sozinho diz "em andamento" e nao diz que o dado de campo esta em
    # revisao. Sem isso, a tela mostraria um selo e nenhuma razao.
    coment = d['monitoring_report_status'].get('comentarios_por_capitulo') or {}
    linhas_coment = []
    for rotulo, texto in coment.items():
        # A chave vem como '1 - Summary' e '2 - Project Details'; o capitulo e o
        # que vem antes do hifen.
        capitulo = rotulo.split('-')[0].strip().rstrip('.')
        linhas_coment.append(
            f"""  update public.carbon_mr_capitulos set observacoes = {txt(texto)}, atualizado_em = now()
   where projeto_id = v_projeto and capitulo = {txt(capitulo)};"""
        )
    contagem['(mr_capitulos com comentario)'] = len(linhas_coment)

    corpo = '\n'.join(L).replace(
        '  -- COMENTARIOS_MR_AQUI',
        '\n'.join(linhas_coment) if linhas_coment else '  -- (nenhum comentario de capitulo na origem)',
    )

    cabecalho = f"""-- =============================================================================
-- Apsis Carbon - dados REAIS lidos das telas do Notion
-- Arquivo: supabase/seeds/notion_dados_reais.sql
-- =============================================================================
-- GERADO POR scripts/gerar-seed-notion.py A PARTIR DE
-- docs/notion/dados/coleta-25-08.json. Nao edite a mao: a proxima geracao
-- desfaz. Para mudar, mude a coleta e rode o script.
--
-- DE ONDE VEM. Leitura ao vivo do Notion em 25/08/2026, pelo navegador do dono.
-- Os arquivos 01 a 19 de docs/notion/ descrevem a ESTRUTURA das paginas e foram
-- extraidos ja anonimizados em 11/08 - eles NAO tinham os registros. Estes tem.
--
-- LGPD, E ISTO NAO E FORMALIDADE:
--
--   carbon_visitas - as colunas contato_nome, contato_telefone e contato_email
--   ficam NULL. A origem tinha as tres preenchidas em 17 linhas, com nome de
--   pessoa, celular e e-mail. Nao foram importadas. A tabela ACEITA esses
--   campos e tem retencao_ate e anonimizado_em justamente para isso: quem tem
--   a base pode preencher pela tela, sob a politica de retencao da empresa, o
--   que e diferente de uma carga em massa feita por um script.
--
--   Uma 18a visita foi descartada por inteiro: o campo Organizacao era o nome
--   de uma pessoa fisica, e nao havia como anonimizar sem apagar o registro.
--
--   carbon_compradores - o unico comprador da origem tinha e-mail pessoal
--   (dominio hotmail). Nao importado.
--
--   Findings - os campos de acao e comentario citavam primeiro nome de
--   colaborador. Trocados por referencia de papel na coleta.
--
-- DEPENDE das migrations ate 20260825140000 e do projeto criado por
-- supabase/seeds/projeto_awaete.sql.
--
-- IDEMPOTENTE: id derivado do conteudo por md5, entao rodar de novo atualiza.
-- =============================================================================

do $$
declare
  v_projeto uuid;
begin
  select id into v_projeto
    from public.carbon_projetos
   where nome ilike '%parakan%' or nome ilike '%awaet%'
   order by criado_em
   limit 1;

  if v_projeto is null then
    raise exception 'Projeto do Parakana nao encontrado. Rode supabase/seeds/projeto_awaete.sql antes.';
  end if;
"""

    rodape = """

  raise notice 'Carga do Notion concluida.';
end
$$;
"""

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    with io.open(SAIDA, 'w', encoding='utf-8', newline='\n') as f:
        f.write(cabecalho + corpo + rodape)

    print(f'Escrito: {SAIDA}')
    for t, n in sorted(contagem.items()):
        print(f'  {t:28s} {n:4d}')
    print(f'  {"TOTAL":28s} {sum(contagem.values()):4d} registros')
    print('  (mais 43 capitulos PDD, 32 MR e 26 evidencias, criados pelas funcoes de template)')


main()

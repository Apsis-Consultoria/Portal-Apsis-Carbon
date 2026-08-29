/**
 * demo/secureshare - dataset ficticio do Secure Share.
 *
 * Serve para revisar a tela antes de o projeto Supabase existir. As mutacoes
 * alteram este dataset em memoria, para a tela ser realmente interativa na
 * revisao (cadastrar cliente, mudar prazo, restringir arquivo). Recarregar a
 * pagina volta ao estado inicial: nao e cache nem persistencia.
 *
 * LGPD: todos os nomes, e-mails e empresas aqui sao INVENTADOS. Nenhum cliente
 * real da APSIS, nenhuma pessoa real. O dominio dos e-mails ficticios e
 * `exemplo.com`, reservado para documentacao (RFC 2606), justamente para nao
 * existir a chance de um envio de teste alcancar uma caixa de verdade.
 *
 * --------------------------------------------------------------------------
 * POR QUE O ESTADO NASCE PREGUICOSO (nao mexa nisso sem medir o bundle)
 * --------------------------------------------------------------------------
 * A primeira versao deste arquivo montava os arrays direto no topo do modulo:
 *
 *     let projetos = [{ criado_em: emDias(-42), ... }];
 *
 * Isso e uma CHAMADA DE FUNCAO num inicializador de topo. O Rollup nao consegue
 * provar que `emDias()` e pura, entao marca o modulo como tendo efeito colateral
 * e o mantem no bundle MESMO com todos os `if (MODO_DEMO)` dobrados para false.
 * Medido: o dataset ficticio inteiro foi parar em dist/assets/index-*.js, que e
 * exatamente o que a nota de src/lib/runtimeConfig.js manda evitar.
 *
 * Com o estado criado dentro de `bd()`, na primeira chamada, o topo do modulo
 * passa a ser so declaracoes de funcao e um `let estado = null`. Nada de efeito
 * colateral, e o modulo some do bundle de producao.
 */

/** Erro no formato que chamarDemo() converte em ErroApi. */
function erro(codigo) {
  const e = new Error(codigo);
  e.codigo = codigo;
  return e;
}

const hoje = () => new Date().toISOString().slice(0, 10);

function emDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function horasAtras(horas) {
  return new Date(Date.now() - horas * 3600 * 1000).toISOString();
}

function novoId(prefixo) {
  return `${prefixo}-${Math.floor(1000 + Math.random() * 9000)}`;
}

/* ===== Estado ============================================================= */

let estado = null;

/** Estado ficticio, criado na primeira leitura. Ver a nota do cabecalho. */
function criarEstado() {
  return {
    projetos: [
      {
        id: 'demo-ss-0001',
        ap_os: 'AP-10001/26-001',
        empresa: 'Reflorestadora Exemplo S.A.',
        pasta: 'AP-10001-26-001 - Reflorestadora Exemplo S.A.',
        status: 'ativo',
        criado_por: 'demo-usuario',
        criado_por_email: 'equipe.carbon@apsis.com.br',
        criado_por_nome: 'Equipe Carbon',
        criado_em: emDias(-42),
        atualizado_em: emDias(-3),
      },
      {
        id: 'demo-ss-0002',
        ap_os: null,
        empresa: 'Cooperativa Exemplo do Vale',
        pasta: 'Cooperativa Exemplo do Vale',
        status: 'ativo',
        criado_por: 'demo-usuario',
        criado_por_email: 'equipe.carbon@apsis.com.br',
        criado_por_nome: 'Equipe Carbon',
        criado_em: emDias(-11),
        atualizado_em: emDias(-11),
      },
      {
        id: 'demo-ss-0003',
        ap_os: 'AP-10044/25-007',
        empresa: 'Verificadora Exemplo Ltda.',
        pasta: 'AP-10044-25-007 - Verificadora Exemplo Ltda.',
        status: 'encerrado',
        criado_por: 'demo-outro',
        criado_por_email: 'outra.pessoa@apsis.com.br',
        criado_por_nome: 'Outra Pessoa',
        criado_em: emDias(-180),
        atualizado_em: emDias(-90),
      },
    ],

    clientes: [
      {
        id: 'demo-cli-01',
        projeto_id: 'demo-ss-0001',
        nome: 'Contato Um',
        email: 'contato.um@exemplo.com',
        acesso_inicio: null,
        acesso_fim: null,
        ultimo_acesso: horasAtras(48),
        status: 'ativo',
        criado_em: emDias(-42),
        acesso_enviado: true,
        senha_definida_em: horasAtras(24 * 40),
        situacao: 'liberado',
      },
      {
        id: 'demo-cli-02',
        projeto_id: 'demo-ss-0001',
        nome: 'Contato Dois',
        email: 'contato.dois@exemplo.com',
        acesso_inicio: null,
        acesso_fim: emDias(20),
        ultimo_acesso: null,
        status: 'ativo',
        criado_em: emDias(-30),
        acesso_enviado: true,
        senha_definida_em: horasAtras(24 * 30),
        situacao: 'liberado',
      },
      {
        // Cadastrado e sem credencial: o erro operacional mais comum da tela.
        id: 'demo-cli-03',
        projeto_id: 'demo-ss-0001',
        nome: 'Auditoria Exemplo',
        email: 'auditoria@exemplo.com',
        acesso_inicio: null,
        acesso_fim: null,
        ultimo_acesso: null,
        status: 'ativo',
        criado_em: emDias(-4),
        acesso_enviado: false,
        senha_definida_em: null,
        situacao: 'sem_credencial',
      },
      {
        // Prazo vencido: exercita o badge vermelho e o bloqueio de login.
        id: 'demo-cli-04',
        projeto_id: 'demo-ss-0002',
        nome: 'Coordenacao Exemplo',
        email: 'coordenacao@exemplo.com',
        acesso_inicio: null,
        acesso_fim: emDias(-5),
        ultimo_acesso: horasAtras(24 * 30),
        status: 'ativo',
        criado_em: emDias(-11),
        acesso_enviado: true,
        senha_definida_em: horasAtras(24 * 11),
        situacao: 'expirado',
      },
    ],

    equipe: [
      {
        projeto_id: 'demo-ss-0001',
        id: 'demo-colab-1',
        email: 'colega.um@apsis.com.br',
        nome: 'Colega Um',
      },
    ],

    permissoes: [
      {
        projeto_id: 'demo-ss-0001',
        item_path: 'Confidencial',
        emails_negados: ['auditoria@exemplo.com'],
        emails_sem_download: [],
      },
      {
        projeto_id: 'demo-ss-0001',
        item_path: 'Relatorio de monitoramento 2025.pdf',
        emails_negados: [],
        emails_sem_download: ['contato.dois@exemplo.com'],
      },
    ],

    /**
     * Arvore ficticia do SharePoint, por projeto. Chave '' e a raiz da pasta.
     *
     * Tem pasta dentro de pasta de proposito: e o que exercita a expansao
     * preguicosa e a HERANCA de permissao (a regra em 'Confidencial' precisa
     * alcancar 'Confidencial/Parecer juridico.pdf') na revisao visual.
     */
    arvore: {
      'demo-ss-0001': {
        '': [
          { nome: 'Confidencial', tipo: 'pasta', tamanho: null, criadoEm: emDias(-40), atualizadoEm: emDias(-6) },
          { nome: 'Documentos do projeto', tipo: 'pasta', tamanho: null, criadoEm: emDias(-42), atualizadoEm: emDias(-3) },
          { nome: 'Relatorio de monitoramento 2025.pdf', tipo: 'arquivo', tamanho: 4215330, criadoEm: emDias(-8), atualizadoEm: emDias(-8) },
          { nome: 'Planilha de emissoes.xlsx', tipo: 'arquivo', tamanho: 812004, criadoEm: emDias(-3), atualizadoEm: emDias(-3) },
        ],
        Confidencial: [
          { nome: 'Parecer juridico.pdf', tipo: 'arquivo', tamanho: 220118, criadoEm: emDias(-6), atualizadoEm: emDias(-6) },
        ],
        'Documentos do projeto': [
          { nome: 'Anexos', tipo: 'pasta', tamanho: null, criadoEm: emDias(-20), atualizadoEm: emDias(-20) },
          { nome: 'PDD versao 3.docx', tipo: 'arquivo', tamanho: 1540992, criadoEm: emDias(-20), atualizadoEm: emDias(-20) },
        ],
        'Documentos do projeto/Anexos': [
          { nome: 'Mapa da area.png', tipo: 'arquivo', tamanho: 3004112, criadoEm: emDias(-20), atualizadoEm: emDias(-20) },
        ],
      },
      'demo-ss-0002': { '': [] },
      'demo-ss-0003': {
        '': [
          { nome: 'Encerramento.pdf', tipo: 'arquivo', tamanho: 90221, criadoEm: emDias(-95), atualizadoEm: emDias(-95) },
        ],
      },
    },
  };
}

function bd() {
  if (!estado) estado = criarEstado();
  return estado;
}

/* ===== Apoio ============================================================== */

function comAgregados(p) {
  const { clientes, equipe, permissoes } = bd();
  const doProjeto = clientes.filter((c) => c.projeto_id === p.id);
  const acessos = doProjeto.map((c) => c.ultimo_acesso).filter(Boolean).sort();

  return {
    ...p,
    clientes: doProjeto.length,
    clientes_liberados: doProjeto.filter((c) => c.acesso_enviado && c.status === 'ativo').length,
    clientes_sem_acesso: doProjeto.filter((c) => !c.acesso_enviado).length,
    ultimo_acesso: acessos.length ? acessos[acessos.length - 1] : null,
    equipe: equipe.filter((e) => e.projeto_id === p.id).length,
    restricoes: permissoes.filter((r) => r.projeto_id === p.id).length,
  };
}

function acharProjeto(id) {
  const p = bd().projetos.find((x) => x.id === id);
  if (!p) throw erro('nao_encontrado');
  return p;
}

function acharCliente(id) {
  const c = bd().clientes.find((x) => x.id === id);
  if (!c) throw erro('nao_encontrado');
  return c;
}

/** Recalcula `situacao` com a MESMA regra da view carbon_secure_share_clientes_listagem. */
function recalcularSituacao(c) {
  const d = hoje();
  if (c.status !== 'ativo') c.situacao = 'revogado';
  else if (!c.acesso_enviado) c.situacao = 'sem_credencial';
  else if (c.acesso_fim && c.acesso_fim < d) c.situacao = 'expirado';
  else if (c.acesso_inicio && c.acesso_inicio > d) c.situacao = 'agendado';
  else c.situacao = 'liberado';
  return c;
}

/**
 * Mesmo calculo de public.carbon_secure_share_nome_pasta.
 *
 * Barra vira HIFEN, nao some: "AP-10001/26-001" gera a pasta
 * "AP-10001-26-001 - Empresa". E a convencao ja em uso no SharePoint da APSIS.
 */
function limparParte(valor) {
  return String(valor ?? '').replace(/[/\\]/g, '-').replace(/["*:<>?|]/g, '').trim();
}

function nomePasta(apOs, empresa) {
  const a = limparParte(apOs);
  const e = limparParte(empresa);
  const bruto = a && e ? `${a} - ${e}` : a || e;
  return bruto.replace(/\s+/g, ' ').trim().replace(/[ .]+$/, '');
}

function permissoesDoProjeto(projetoId) {
  return bd()
    .permissoes.filter((r) => r.projeto_id === projetoId)
    .map(({ item_path, emails_negados, emails_sem_download }) => ({
      item_path,
      emails_negados,
      emails_sem_download,
    }));
}

/* ===== Projetos =========================================================== */

export function demoListarProjetos() {
  const lista = [...bd().projetos]
    .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)))
    .map(comAgregados);
  return { projetos: lista, total: lista.length };
}

export function demoObterProjeto(id) {
  const p = acharProjeto(id);
  const { clientes, equipe } = bd();

  return {
    projeto: comAgregados(p),
    clientes: clientes.filter((c) => c.projeto_id === id).map(recalcularSituacao),
    equipe: equipe
      .filter((e) => e.projeto_id === id)
      .map(({ id: uid, email, nome }) => ({ id: uid, email, nome })),
    permissoes: permissoesDoProjeto(id),
    pode_administrar: true,
  };
}

export function demoCriarProjeto(dados = {}) {
  const banco = bd();
  const empresa = String(dados.empresa || '').trim();
  if (!empresa) throw erro('campo_obrigatorio');

  const apOs = String(dados.ap_os || '').trim() || null;

  const duplicado = banco.projetos.some(
    (p) => (p.ap_os || null) === apOs && p.empresa.toLowerCase() === empresa.toLowerCase(),
  );
  if (duplicado) throw erro('registro_duplicado');

  const id = novoId('demo-ss');
  const projeto = {
    id,
    ap_os: apOs,
    empresa,
    pasta: nomePasta(apOs, empresa),
    status: 'ativo',
    criado_por: 'demo-usuario',
    criado_por_email: 'equipe.carbon@apsis.com.br',
    criado_por_nome: 'Equipe Carbon',
    criado_em: hoje(),
    atualizado_em: hoje(),
  };

  banco.projetos = [projeto, ...banco.projetos];
  banco.arvore[id] = { '': [] };

  for (const contato of Array.isArray(dados.contatos) ? dados.contatos : []) {
    const email = String(contato?.email || '').trim().toLowerCase();
    if (!email) continue;
    banco.clientes.push(
      recalcularSituacao({
        id: novoId('demo-cli'),
        projeto_id: id,
        nome: String(contato?.nome || '').trim() || email,
        email,
        acesso_inicio: null,
        acesso_fim: null,
        ultimo_acesso: null,
        status: 'ativo',
        criado_em: hoje(),
        acesso_enviado: false,
        senha_definida_em: null,
        situacao: 'sem_credencial',
      }),
    );
  }

  return { projeto: comAgregados(projeto), aviso_pasta: null };
}

export function demoAtualizarProjeto(id, dados = {}) {
  const p = acharProjeto(id);
  const tem = (campo) => Object.prototype.hasOwnProperty.call(dados, campo);

  if (tem('empresa')) {
    const empresa = String(dados.empresa || '').trim();
    if (!empresa) throw erro('campo_obrigatorio');
    p.empresa = empresa;
  }
  if (tem('ap_os')) p.ap_os = String(dados.ap_os || '').trim() || null;
  if (tem('status')) {
    if (!['ativo', 'encerrado'].includes(dados.status)) throw erro('status_invalido');
    p.status = dados.status;
  }

  p.pasta = nomePasta(p.ap_os, p.empresa);
  p.atualizado_em = hoje();
  return { projeto: comAgregados(p) };
}

/* ===== Arquivos =========================================================== */

export function demoListarArquivos(id, sub = '') {
  const p = acharProjeto(id);
  const doProjeto = bd().arvore[id] || { '': [] };
  return { itens: doProjeto[sub] || [], caminho: sub, pasta: p.pasta };
}

/* ===== Clientes =========================================================== */

export function demoCriarCliente(projetoId, dados = {}) {
  acharProjeto(projetoId);
  const banco = bd();

  const email = String(dados.email || '').trim().toLowerCase();
  if (!email) throw erro('campo_obrigatorio');
  if (email.endsWith('@apsis.com.br')) throw erro('cliente_interno');
  if (banco.clientes.some((c) => c.projeto_id === projetoId && c.email === email)) {
    throw erro('registro_duplicado');
  }

  const cliente = recalcularSituacao({
    id: novoId('demo-cli'),
    projeto_id: projetoId,
    nome: String(dados.nome || '').trim() || email,
    email,
    acesso_inicio: null,
    acesso_fim: null,
    ultimo_acesso: null,
    status: 'ativo',
    criado_em: hoje(),
    acesso_enviado: false,
    senha_definida_em: null,
    situacao: 'sem_credencial',
  });

  banco.clientes.push(cliente);
  return { cliente };
}

export function demoAtualizarCliente(id, dados = {}) {
  const c = acharCliente(id);
  const tem = (campo) => Object.prototype.hasOwnProperty.call(dados, campo);

  if (tem('nome')) {
    const nome = String(dados.nome || '').trim();
    if (!nome) throw erro('campo_obrigatorio');
    c.nome = nome;
  }
  if (tem('acesso_inicio')) c.acesso_inicio = dados.acesso_inicio || null;
  if (tem('acesso_fim')) c.acesso_fim = dados.acesso_fim || null;
  if (tem('status')) {
    if (!['ativo', 'revogado'].includes(dados.status)) throw erro('status_invalido');
    c.status = dados.status;
  }

  if (c.acesso_inicio && c.acesso_fim && c.acesso_fim < c.acesso_inicio) {
    throw erro('periodo_invalido');
  }

  return { cliente: recalcularSituacao(c) };
}

export function demoRemoverCliente(id) {
  const c = acharCliente(id);
  const banco = bd();

  banco.clientes = banco.clientes.filter((x) => x.id !== id);

  // Espelha a limpeza que a rota real faz: as permissoes guardam e-mail, nao FK,
  // entao o cascade do banco nao alcanca as regras deste cliente.
  banco.permissoes = banco.permissoes
    .map((r) =>
      r.projeto_id !== c.projeto_id
        ? r
        : {
            ...r,
            emails_negados: r.emails_negados.filter((e) => e !== c.email),
            emails_sem_download: r.emails_sem_download.filter((e) => e !== c.email),
          },
    )
    .filter((r) => r.emails_negados.length || r.emails_sem_download.length);

  return { removido: true };
}

/**
 * Envio de acesso no modo demonstracao: NAO manda e-mail e nao mostra senha.
 * So marca a credencial como emitida, que e o efeito que a tela reflete.
 */
export function demoEnviarAcesso(id) {
  const c = acharCliente(id);
  const p = acharProjeto(c.projeto_id);

  if (c.status !== 'ativo') throw erro('cliente_revogado');
  if (p.status !== 'ativo') throw erro('projeto_encerrado');

  c.acesso_enviado = true;
  c.senha_definida_em = new Date().toISOString();
  return { enviado: true, cliente: recalcularSituacao(c) };
}

/* ===== Equipe ============================================================= */

export function demoAtualizarEquipe(projetoId, dados = {}) {
  acharProjeto(projetoId);
  const banco = bd();

  const normalizar = (lista) =>
    (lista || []).map((e) => String(e).trim().toLowerCase()).filter(Boolean);

  const adicionar = normalizar(dados.adicionar);
  const remover = normalizar(dados.remover);

  if (!adicionar.length && !remover.length) throw erro('nada_para_atualizar');

  const externo = adicionar.find((e) => !e.endsWith('@apsis.com.br'));
  if (externo) throw erro('colaborador_externo');

  for (const email of adicionar) {
    if (banco.equipe.some((e) => e.projeto_id === projetoId && e.email === email)) continue;
    banco.equipe.push({
      projeto_id: projetoId,
      id: novoId('demo-colab'),
      email,
      nome: email.split('@')[0].replace(/\./g, ' '),
    });
  }

  if (remover.length) {
    banco.equipe = banco.equipe.filter(
      (e) => !(e.projeto_id === projetoId && remover.includes(e.email)),
    );
  }

  return {
    equipe: banco.equipe
      .filter((e) => e.projeto_id === projetoId)
      .map(({ id, email, nome }) => ({ id, email, nome })),
    nao_encontrados: [],
  };
}

/* ===== Permissoes ========================================================= */

export function demoDefinirPermissao(projetoId, dados = {}) {
  acharProjeto(projetoId);
  const banco = bd();

  const itemPath = String(dados.item_path || '').trim();
  const email = String(dados.email || '').trim().toLowerCase();
  const nivel = dados.nivel;

  if (!itemPath || !email || !nivel) throw erro('campo_obrigatorio');
  if (!['total', 'visualizar', 'nenhum'].includes(nivel)) throw erro('nivel_invalido');
  if (!banco.clientes.some((c) => c.projeto_id === projetoId && c.email === email)) {
    throw erro('cliente_nao_encontrado');
  }

  let linha = banco.permissoes.find(
    (r) => r.projeto_id === projetoId && r.item_path === itemPath,
  );
  if (!linha) {
    linha = {
      projeto_id: projetoId,
      item_path: itemPath,
      emails_negados: [],
      emails_sem_download: [],
    };
    banco.permissoes.push(linha);
  }

  // Tira das duas listas e recoloca na certa: um e-mail nunca pode estar nas
  // duas ao mesmo tempo.
  linha.emails_negados = linha.emails_negados.filter((e) => e !== email);
  linha.emails_sem_download = linha.emails_sem_download.filter((e) => e !== email);
  if (nivel === 'nenhum') linha.emails_negados.push(email);
  if (nivel === 'visualizar') linha.emails_sem_download.push(email);

  banco.permissoes = banco.permissoes.filter(
    (r) => r.emails_negados.length || r.emails_sem_download.length,
  );

  return { permissoes: permissoesDoProjeto(projetoId) };
}

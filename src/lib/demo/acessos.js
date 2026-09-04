/**
 * Dados ficticios da Gestao de acessos.
 *
 * POR QUE EXISTE. Demonstracao e como o time revisa tela. Sem este arquivo, as
 * tres consultas da tela tentavam rede de verdade em demonstracao, nao havia
 * conta MSAL, e o erro `interacao_necessaria` fazia o GuardaDeSessao trocar o
 * app inteiro pela tela "sua sessao expirou" - a tela nova derrubava o portal
 * todo, e nao so a si mesma.
 *
 * NENHUM DADO PESSOAL, nem inventado com cara de real (regra 7 do CLAUDE.md).
 * Os e-mails usam o dominio `exemplo.test`, reservado para exemplo e que nunca
 * resolve, e os nomes sao funcoes e nao pessoas.
 *
 * O estado vive em memoria e some ao recarregar, igual aos outros datasets: em
 * demonstracao nada e gravado, e a tela exercita o mesmo caminho de sucesso.
 */

const AREAS = [
  ['nucleo', 'Início e notificações', 'Boas-vindas, notificações e perfil. Todos têm.', true, 0],
  ['acessos', 'Gestão de acessos', 'Criar cargos e definir quem tem cada um.', false, 1],
  ['projetos', 'Projetos', 'Projetos de carbono, PDD e equipe.', false, 10],
  ['prestacao', 'Prestação de contas', 'Repasses, lançamentos e comprovantes.', false, 20],
  ['indicadores', 'Indicadores', 'Indicadores do projeto e medições.', false, 30],
  ['monitoramento', 'Plano de monitoramento', 'Plano de monitoramento por projeto.', false, 40],
  ['questionarios', 'Questionários', 'Formulários de campo e respostas.', false, 50],
  ['atividades', 'Atividades', 'Atividades e visitas de campo.', false, 60],
  ['documentos', 'Documentos', 'Documentos do projeto.', false, 70],
  ['evidencias', 'Evidências', 'Evidências para validação.', false, 80],
  ['findings', 'Findings', 'Apontamentos da validadora e da VVB.', false, 90],
  ['metas', 'Metas', 'Metas do projeto.', false, 100],
  ['pipeline', 'Pipeline', 'Oportunidades em prospecção.', false, 110],
  ['reunioes', 'Reuniões', 'Reuniões, atas e pendências.', false, 120],
  ['fornecedores', 'Fornecedores', 'Fornecedores e contratos.', false, 130],
  ['consultoria', 'Consultoria', 'Carteira de consultoria.', false, 140],
  ['credito', 'Crédito de carbono', 'Emissão e venda de crédito.', false, 150],
  ['secureshare', 'Secure Share', 'Pastas compartilhadas com clientes.', false, 160],
].map(([chave, label, descricao, sempre_liberada, ordem]) => ({
  chave, label, descricao, sempre_liberada, ordem,
}));

let estado = null;

function bd() {
  if (estado) return estado;
  estado = {
    cargos: [
      {
        id: 'demo-cargo-1',
        nome: 'Coordenação do projeto',
        descricao: 'Acompanha o projeto de ponta a ponta.',
        ativo: true,
        criado_em: new Date().toISOString(),
        areas: ['acessos', 'projetos', 'prestacao', 'indicadores', 'monitoramento', 'reunioes'],
      },
      {
        id: 'demo-cargo-2',
        nome: 'Equipe de campo',
        descricao: 'Preenche questionários e registra atividades em campo.',
        ativo: true,
        criado_em: new Date().toISOString(),
        areas: ['questionarios', 'atividades'],
      },
      {
        id: 'demo-cargo-3',
        nome: 'Financeiro',
        descricao: 'Confere repasses e comprovantes.',
        ativo: true,
        criado_em: new Date().toISOString(),
        areas: ['prestacao', 'fornecedores'],
      },
    ],
    pessoas: [
      { id: 'demo-p1', email: 'coordenacao@exemplo.test', nome: 'Coordenação', papel: 'admin', ativo: true, cargo_id: 'demo-cargo-1' },
      { id: 'demo-p2', email: 'campo@exemplo.test', nome: 'Equipe de campo', papel: 'colaborador', ativo: true, cargo_id: 'demo-cargo-2' },
      { id: 'demo-p3', email: 'financeiro@exemplo.test', nome: 'Financeiro', papel: 'gestor', ativo: true, cargo_id: 'demo-cargo-3' },
      { id: 'demo-p4', email: 'novo@exemplo.test', nome: 'Pessoa recém-chegada', papel: 'colaborador', ativo: true, cargo_id: null },
    ],
  };
  return estado;
}

/** Erro no MESMO formato do backend, para a tela exercitar o caminho real. */
function erro(codigo) {
  const e = new Error(codigo);
  e.codigo = codigo;
  return e;
}

const comContagem = (c) => ({
  ...c,
  pessoas: bd().pessoas.filter((p) => p.ativo && p.cargo_id === c.id).length,
});

export function demoListarAreas() {
  return { areas: AREAS };
}

export function demoListarCargos() {
  return { cargos: bd().cargos.map(comContagem) };
}

export function demoListarPessoas() {
  return { pessoas: bd().pessoas.map((p) => ({ ...p })) };
}

/** Mesma normalizacao do indice unico do banco: caixa e acento nao criam cargo novo. */
const chaveNome = (s) =>
  String(s ?? '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

export function demoCriarCargo(dados = {}) {
  const nome = String(dados.nome ?? '').trim();
  if (!nome) throw erro('campo_obrigatorio');
  if (bd().cargos.some((c) => chaveNome(c.nome) === chaveNome(nome))) {
    throw erro('cargo_duplicado');
  }
  const cargo = {
    id: `demo-cargo-${bd().cargos.length + 1}-${chaveNome(nome).slice(0, 8)}`,
    nome,
    descricao: dados.descricao ?? null,
    ativo: true,
    criado_em: new Date().toISOString(),
    areas: [...new Set(dados.areas ?? [])],
  };
  bd().cargos.push(cargo);
  return { cargo: comContagem(cargo) };
}

/**
 * Espelha a trava do servidor: nao deixa o sistema sem ninguem que administre
 * acessos. Sem isto, a demonstracao ensinaria um comportamento que producao
 * recusa, e a primeira vez que alguem tentasse de verdade levaria um erro que a
 * revisao nunca mostrou.
 */
function contarAdministradores() {
  const idsComAcesso = new Set(
    bd().cargos.filter((c) => c.ativo && c.areas.includes('acessos')).map((c) => c.id),
  );
  return bd().pessoas.filter((p) => p.ativo && p.cargo_id && idsComAcesso.has(p.cargo_id)).length;
}

/**
 * Recusa REDUZIR A ZERO, e nao "chegar a zero".
 *
 *     antes > 0 e depois = 0  ->  recusa
 *     antes = 0               ->  deixa passar
 *
 * O segundo caso e o que a primeira versao errava, no banco e aqui: com o
 * sistema ja sem administrador, uma trava que so olha o estado final recusa
 * exatamente a acao que conserta. Trava que impede a recuperacao e pior do que
 * trava nenhuma. Chame com o estado ja alterado, e desfaca se ela lancar.
 */
function garantirQueNaoZerou(antes) {
  if (antes > 0 && contarAdministradores() === 0) throw erro('sem_administrador_de_acesso');
}

export function demoAtualizarCargo(id, dados = {}) {
  const cargo = bd().cargos.find((c) => c.id === id);
  if (!cargo) throw erro('nao_encontrado');

  const adminsAntes = contarAdministradores();
  const antes = { nome: cargo.nome, ativo: cargo.ativo, areas: [...cargo.areas] };

  if (dados.nome !== undefined) {
    const nome = String(dados.nome).trim();
    if (bd().cargos.some((c) => c.id !== id && chaveNome(c.nome) === chaveNome(nome))) {
      throw erro('cargo_duplicado');
    }
    cargo.nome = nome;
  }
  if (dados.descricao !== undefined) cargo.descricao = dados.descricao;
  if (dados.ativo !== undefined) cargo.ativo = !!dados.ativo;
  if (dados.areas !== undefined) cargo.areas = [...new Set(dados.areas)];

  try {
    garantirQueNaoZerou(adminsAntes);
  } catch (e) {
    Object.assign(cargo, antes);
    throw e;
  }
  return { ok: true };
}

export function demoApagarCargo(id) {
  const i = bd().cargos.findIndex((c) => c.id === id);
  if (i < 0) throw erro('nao_encontrado');

  const adminsAntes = contarAdministradores();
  const removido = bd().cargos.splice(i, 1)[0];
  const orfaos = bd().pessoas.filter((p) => p.cargo_id === id);
  orfaos.forEach((p) => { p.cargo_id = null; });

  try {
    garantirQueNaoZerou(adminsAntes);
  } catch (e) {
    bd().cargos.splice(i, 0, removido);
    orfaos.forEach((p) => { p.cargo_id = id; });
    throw e;
  }
  return { ok: true };
}

export function demoAtualizarPessoa(id, dados = {}) {
  const pessoa = bd().pessoas.find((p) => p.id === id);
  if (!pessoa) throw erro('nao_encontrado');

  const adminsAntes = contarAdministradores();
  const antes = { cargo_id: pessoa.cargo_id, ativo: pessoa.ativo };

  if (dados.cargo_id !== undefined) {
    const alvo = dados.cargo_id || null;
    if (alvo && !bd().cargos.some((c) => c.id === alvo)) throw erro('referencia_invalida');
    pessoa.cargo_id = alvo;
  }
  if (dados.ativo !== undefined) pessoa.ativo = !!dados.ativo;

  try {
    garantirQueNaoZerou(adminsAntes);
  } catch (e) {
    Object.assign(pessoa, antes);
    throw e;
  }
  return { ok: true };
}

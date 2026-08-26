/**
 * demo/reunioesteams.js - dataset de demonstração da integração com o Teams.
 *
 * POR QUE EXISTE: a integração depende de uma permissão do Azure concedida pelo
 * administrador do tenant. Sem este dataset, a tela só seria revisável por quem
 * tem essa permissão liberada - e o comportamento mais importante de revisar é
 * justamente o oposto: o que a tela mostra quando a permissão NÃO existe.
 *
 * Por isso `demoDiagnosticoTeams` responde `disponivel: true` mas deixa o
 * caminho de indisponibilidade exercitável (ver a constante abaixo).
 *
 * ESCOPO: não é cache nem persistência. Recarregar volta ao estado inicial. Em
 * produção MODO_DEMO é false por força e o bundler elimina este módulo.
 *
 * LGPD: os participantes de exemplo usam o domínio reservado example.com, que
 * a RFC 2606 garante que nunca será de ninguém. Nenhum endereço da APSIS nem de
 * cliente aparece aqui.
 */

/** Vire para false para revisar a tela no estado "permissão não concedida". */
const PERMISSAO_CONCEDIDA_NO_DEMO = true;

export class ErroDemoTeams extends Error {
  constructor(codigo) {
    super(`Recusado pelo modo demonstracao: ${codigo}`);
    this.name = 'ErroDemoTeams';
    this.codigo = codigo;
  }
}

/* ===== Estado =============================================================
   Montado na PRIMEIRA LEITURA, e não numa expressão de topo de módulo: expressão
   de topo é efeito colateral que o Rollup não consegue provar puro, e manteria o
   dataset vivo no bundle de produção. Mesmo padrão de src/lib/demoProjetos.js. */
let estado = null;

function bd() {
  if (!estado) estado = { eventos: new Map(), proximo: 1 };
  return estado;
}

export function demoDiagnosticoTeams() {
  return {
    disponivel: PERMISSAO_CONCEDIDA_NO_DEMO,
    papeis: PERMISSAO_CONCEDIDA_NO_DEMO
      ? ['Calendars.ReadWrite', 'Mail.Send', 'Sites.ReadWrite.All']
      : ['Mail.Send', 'Sites.ReadWrite.All'],
    organizador: 'portal@apsis.com.br',
    permissao_exigida: 'Calendars.ReadWrite',
  };
}

function exigirPermissao() {
  if (!PERMISSAO_CONCEDIDA_NO_DEMO) throw new ErroDemoTeams('calendario_sem_permissao');
}

export function demoCriarTeams(reuniaoId, dados) {
  exigirPermissao();
  const b = bd();
  if (b.eventos.has(reuniaoId)) throw new ErroDemoTeams('reuniao_ja_tem_teams');

  if (!dados?.hora_inicio || !dados?.hora_fim) throw new ErroDemoTeams('campo_obrigatorio');
  if (dados.hora_fim <= dados.hora_inicio) throw new ErroDemoTeams('fim_antes_do_inicio');

  const n = b.proximo++;
  const evento = {
    teams_evento_id: `demo-evento-${n}`,
    // Formato parecido com o real, para a tela exercitar o truncamento do link.
    teams_join_url: `https://teams.microsoft.com/l/meetup-join/demo-${n}`,
    teams_web_link: `https://outlook.office365.com/calendar/item/demo-${n}`,
    teams_serie: Boolean(dados.recorrencia && dados.recorrencia.frequencia !== 'nenhuma'),
    teams_organizador: 'portal@apsis.com.br',
    teams_criado_em: '2026-08-26T12:00:00.000Z',
    _hora_inicio: dados.hora_inicio,
    _hora_fim: dados.hora_fim,
    _participantes: dados.participantes ?? [],
    _recorrencia: dados.recorrencia ?? null,
  };
  b.eventos.set(reuniaoId, evento);
  return { reuniao: { id: reuniaoId, ...evento } };
}

export function demoAtualizarTeams(reuniaoId, dados) {
  exigirPermissao();
  const evento = bd().eventos.get(reuniaoId);
  if (!evento) throw new ErroDemoTeams('reuniao_sem_teams');
  if (!dados || Object.keys(dados).length === 0) throw new ErroDemoTeams('nada_para_atualizar');

  if (dados.hora_inicio) evento._hora_inicio = dados.hora_inicio;
  if (dados.hora_fim) evento._hora_fim = dados.hora_fim;
  // Substitui a lista, como o Graph faz. Reproduzir isso no demo importa: é o
  // comportamento que surpreende quem espera "acrescentar".
  if (dados.participantes) evento._participantes = dados.participantes;

  return { reuniao: { id: reuniaoId, ...evento } };
}

export function demoCancelarTeams(reuniaoId) {
  exigirPermissao();
  if (!bd().eventos.delete(reuniaoId)) throw new ErroDemoTeams('reuniao_sem_teams');
  return {
    removido: true,
    reuniao: {
      id: reuniaoId,
      teams_evento_id: null,
      teams_join_url: null,
      teams_web_link: null,
      teams_serie: false,
    },
  };
}

export function demoOcorrenciasTeams(reuniaoId) {
  exigirPermissao();
  const evento = bd().eventos.get(reuniaoId);
  if (!evento) throw new ErroDemoTeams('reuniao_sem_teams');
  if (!evento.teams_serie) return { ocorrencias: [], de: null, ate: null };

  // Oito ocorrências semanais a partir de uma data fixa. Data fixa, e não
  // calculada de "hoje", para a revisão da tela ser igual em qualquer dia.
  const base = new Date('2026-09-07T00:00:00Z');
  const ocorrencias = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(base.getTime() + i * 7 * 86_400_000).toISOString().slice(0, 10);
    return {
      id: `${evento.teams_evento_id}-oc-${i + 1}`,
      inicio: `${d}T${evento._hora_inicio}:00`,
      fim: `${d}T${evento._hora_fim}:00`,
      // Uma cancelada no meio, para a tela mostrar o estado que existe de verdade
      // numa série longa.
      cancelada: i === 3,
    };
  });
  return { ocorrencias, de: '2026-09-07T00:00:00', ate: '2026-11-02T23:59:59' };
}

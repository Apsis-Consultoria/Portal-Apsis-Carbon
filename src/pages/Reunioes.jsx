/**
 * Reunioes - cadência de reuniões, com a ata como evidência de auditoria (issue #9).
 *
 * O que o levantamento do Notion mostrou, e que esta tela resolve:
 *
 * 1. BASE ÚNICA. Havia duas bases de reunião, uma do backoffice e uma do projeto,
 *    divergindo por acidente até no nome da coluna de data. Aqui há uma lista só, com
 *    o projeto como dimensão: reunião sem projeto é reunião de backoffice.
 * 2. TIPO É CAMPO, não convenção de título. No Notion o tipo e a organização parceira
 *    viviam dentro do nome ("Reunião Semanal <projeto> - <parceiro>"), o que torna
 *    impossível filtrar histórico por parceiro ou contar cadência.
 * 3. A SEMANAL SE DESDOBRA POR PARCEIRO: duas reuniões na mesma data são legítimas, e
 *    o que as distingue é a coluna parceiro. Por isso o parceiro é obrigatório nesse
 *    tipo, e não há restrição de unicidade por data.
 * 4. CADÊNCIA RECORRENTE, não cadastro manual repetido: o botão de série cria as
 *    próximas N reuniões semanais a partir de uma existente, copiando projeto, tipo,
 *    título e parceiro.
 *
 * AUTORIZAÇÃO: quem pode escrever é decidido no SERVIDOR (a Edge Function exige papel
 * admin ou gestor e responde 403 'sem_permissao'). A tela não esconde ações por perfil
 * de propósito: seria uma segunda fonte de verdade para a mesma regra, e ficaria
 * dessincronizada do backend na primeira mudança. Um 403 vira toast com texto claro.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Handshake, Plus, Pencil, Repeat, ArrowRight, ClipboardList, ShieldCheck,
  FileText, ListChecks, CalendarDays, ChevronLeft, ChevronRight, Filter, Video,
} from 'lucide-react';
import {
  listarReunioes,
  criarReuniao,
  atualizarReuniao,
  gerarSerieReunioes,
} from '@/lib/api/reunioes';
import { listarProjetos, normalizarListaProjetos } from '@/lib/api/projetos';
import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import { montarUrl } from '@/lib/pageRoutes';
import Cartao from '@/components/ui/Cartao';
import CabecalhoSecao from '@/components/ui/CabecalhoSecao';
import Tabela from '@/components/ui/Tabela';
import Badge from '@/components/ui/Badge';
import Campo from '@/components/ui/Campo';
import PainelLateral from '@/components/ui/PainelLateral';
import PainelTeams from '@/components/PainelTeams';
import CamposTeams, {
  formTeamsVazio,
  participantesInvalidos,
  payloadTeams,
} from '@/components/CamposTeams';
import { criarReuniaoTeams } from '@/lib/api/reunioesteams';
import { useAuth } from '@/lib/AuthContext';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';

/* ===== Domínio ============================================================
   Espelha o CHECK de carbon_reunioes.tipo. Valor fora deste mapa ainda aparece na
   tela (com o rótulo cru), em vez de sumir: um tipo novo criado no banco antes do
   deploy do frontend não pode deixar a linha sem identificação.               */
const TIPOS = {
  semanal: { rotulo: 'Semanal', tom: 'azul' },
  semanal_parceiro: { rotulo: 'Semanal por parceiro', tom: 'azul' },
  tematica: { rotulo: 'Temática', tom: 'neutro' },
  governanca: { rotulo: 'Governança', tom: 'laranja' },
  consulta_comunidade: { rotulo: 'Consulta à comunidade', tom: 'verde' },
};

const ORDEM_TIPOS = Object.keys(TIPOS);

/** Tipos que a geração de série aceita. Mesma regra da função SQL. */
const TIPOS_RECORRENTES = ['semanal', 'semanal_parceiro'];

/**
 * Tipos cuja ata é EVIDÊNCIA EXIGIDA na auditoria. É o achado que dá valor à issue:
 * ata de reunião de governança e de consulta é exatamente o registro que a validadora
 * pede. A tela sinaliza isso para a ata não nascer como texto solto.
 */
const TIPOS_EVIDENCIA = ['governanca', 'consulta_comunidade'];

const OPCOES_TIPO = ORDEM_TIPOS.map((valor) => ({ valor, rotulo: TIPOS[valor].rotulo }));

/** Valor especial do filtro e do formulário: reunião sem projeto. */
const ESCOPO_BACKOFFICE = 'backoffice';

const LIMITE_PAGINA = 20;
const QUANTIDADE_SERIE_PADRAO = 4;
const QUANTIDADE_SERIE_MAXIMA = 26;
const INTERVALO_SERIE_DIAS = 7;

/* ===== Formatação ========================================================= */

/**
 * Formata uma coluna `date` do Postgres, que chega como 'AAAA-MM-DD'.
 *
 * Feito na mão de propósito: new Date('2026-01-01') é meia-noite UTC e, no fuso do
 * Brasil, toLocaleDateString mostraria o dia ANTERIOR - erro que passa despercebido
 * justamente na data da reunião, que é o dado central desta tela.
 */
function fmtData(valor) {
  if (!valor) return '-';
  const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!partes) return String(valor);
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

/** Hoje em 'AAAA-MM-DD', para comparar com a coluna date por string (é ordenável). */
function hojeIso() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/* ===== Formulário ========================================================= */

const FORM_VAZIO = {
  tipo: 'semanal',
  titulo: '',
  data: hojeIso(),
  escopo: ESCOPO_BACKOFFICE,
  parceiro: '',
};

function formDaReuniao(reuniao) {
  return {
    tipo: reuniao?.tipo || 'semanal',
    titulo: reuniao?.titulo ?? '',
    data: reuniao?.data ?? hojeIso(),
    escopo: reuniao?.projeto_id || ESCOPO_BACKOFFICE,
    parceiro: reuniao?.parceiro ?? '',
  };
}

/**
 * Monta o corpo da requisição. Lança Error com a mensagem de interface na primeira
 * inconsistência; quem chama mostra em toast.
 *
 * Na EDIÇÃO os campos anuláveis vão como `null` quando esvaziados, e não omitidos: a
 * Edge Function usa "a chave veio no corpo?" para decidir o que tocar, então omitir
 * significaria "mantenha o valor atual" e limpar o parceiro seria impossível, com a
 * tela ainda dizendo que salvou.
 */
function montarPayload(form, editando = false) {
  const tipo = String(form.tipo ?? '').trim();
  if (!TIPOS[tipo]) throw new Error('Escolha o tipo da reunião.');

  const titulo = String(form.titulo ?? '').trim();
  if (!titulo) throw new Error('Informe o título da reunião.');

  const data = String(form.data ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Informe a data da reunião.');

  const parceiro = String(form.parceiro ?? '').trim();
  if (tipo === 'semanal_parceiro' && !parceiro) {
    throw new Error(
      'Reunião semanal por parceiro precisa da organização parceira: é ela que distingue as duas reuniões da mesma data.',
    );
  }

  const escopo = String(form.escopo ?? ESCOPO_BACKOFFICE);

  const payload = { tipo, titulo, data };
  payload.projeto_id = escopo === ESCOPO_BACKOFFICE ? null : escopo;
  if (parceiro) payload.parceiro = parceiro;
  else if (editando) payload.parceiro = null;

  return payload;
}

/* ===== Blocos de interface ================================================ */

function BadgeTipo({ tipo }) {
  const visual = TIPOS[tipo];
  return (
    <Badge tom={visual?.tom ?? 'neutro'} tamanho="sm">
      {visual?.rotulo || tipo || 'Sem tipo'}
    </Badge>
  );
}

/**
 * Estado da ata em uma palavra.
 *
 * Três estados, e a diferença importa: sem ata (a reunião não deixou registro),
 * rascunho (registro existe mas não foi aprovado) e aprovada (é o que pode ser
 * anexado como evidência).
 */
function BadgeAta({ reuniao }) {
  if (!reuniao?.tem_ata) {
    return <Badge tamanho="sm">Sem ata</Badge>;
  }
  if (reuniao.ata_aprovada) {
    return (
      <Badge tom="verde" tamanho="sm" icone={ShieldCheck}>
        Aprovada
      </Badge>
    );
  }
  return (
    <Badge tom="ambar" tamanho="sm">
      Rascunho
    </Badge>
  );
}

/** Indicador do painel de resumo. Superfície do Cartao, sem cabeçalho. */
function Indicador({ icone: Icone, rotulo, valor, detalhe }) {
  return (
    <Cartao classeCorpo="flex items-start gap-3">
      {Icone && (
        <div className="w-8 h-8 rounded-xl bg-[#F4F6F4] flex items-center justify-center flex-shrink-0">
          <Icone size={15} className="text-[#5C7060]" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
          {rotulo}
        </p>
        <p className="text-lg font-bold text-[#1A2B1F] tabular-nums leading-tight">{valor}</p>
        {detalhe && <p className="text-[11px] text-[#8A9990] leading-relaxed">{detalhe}</p>}
      </div>
    </Cartao>
  );
}

function FormularioReuniao({ form, setForm, editando, opcoesProjeto, avisoProjetos }) {
  const alterar = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));
  const exigeParceiro = form.tipo === 'semanal_parceiro';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Campo
        rotulo="Tipo"
        tipo="select"
        obrigatorio
        opcoes={OPCOES_TIPO}
        valor={form.tipo}
        onChange={alterar('tipo')}
        dica={
          TIPOS_EVIDENCIA.includes(form.tipo)
            ? 'A ata deste tipo de reunião é evidência exigida na auditoria: vale preencher pontos de atenção e barreiras com cuidado.'
            : TIPOS_RECORRENTES.includes(form.tipo)
              ? 'Tipo com cadência recorrente: depois de criar, use "Série" para gerar as próximas semanas.'
              : undefined
        }
      />

      <Campo
        rotulo="Data"
        tipo="data"
        obrigatorio
        valor={form.data}
        onChange={alterar('data')}
      />

      <Campo
        rotulo="Título"
        obrigatorio
        valor={form.titulo}
        onChange={alterar('titulo')}
        placeholder="Como a reunião é chamada internamente"
        extras={{ maxLength: 200 }}
        className="sm:col-span-2"
        dica="Não repita o tipo nem o parceiro aqui: os dois têm campo próprio, e é justamente essa mistura que a base antiga tinha."
      />

      <Campo
        rotulo="Escopo"
        tipo="select"
        opcoes={opcoesProjeto}
        valor={form.escopo}
        onChange={alterar('escopo')}
        dica={avisoProjetos || 'Reunião sem projeto é reunião de backoffice (a cadência da operação).'}
      />

      <Campo
        rotulo={exigeParceiro ? 'Organização parceira' : 'Organização parceira (opcional)'}
        obrigatorio={exigeParceiro}
        valor={form.parceiro}
        onChange={alterar('parceiro')}
        placeholder="Nome da organização"
        extras={{ maxLength: 200 }}
        dica={
          exigeParceiro
            ? 'Obrigatória neste tipo: a semanal se desdobra por parceiro, com duas reuniões na mesma data.'
            : 'Pessoa jurídica. Não registre nome de pessoa aqui.'
        }
      />

      {editando && (
        <AvisoDiscreto
          className="sm:col-span-2"
          papel="nenhum"
          texto="Alterar tipo, data ou parceiro não mexe na ata nem nas pendências já registradas."
        />
      )}
    </div>
  );
}

/* ===== Página ============================================================= */

export default function Reunioes() {
  const { usuario } = useAuth();
  const emailOrganizador = usuario?.email ?? '';

  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const autenticado = (accounts?.length ?? 0) > 0;
  const habilitado = (MODO_DEMO && MODO_DEMO_ATIVO()) || autenticado;
  const queryClient = useQueryClient();

  const [filtros, setFiltros] = useState({ escopo: '', tipo: '', parceiro: '' });
  const [pagina, setPagina] = useState(1);
  const [painel, setPainel] = useState(null); // { modo: 'criar' | 'editar', reuniao }
  const [form, setForm] = useState(FORM_VAZIO);
  const [serie, setSerie] = useState(null); // { reuniao }
  const [quantidadeSerie, setQuantidadeSerie] = useState(String(QUANTIDADE_SERIE_PADRAO));

  /* Filtro novo sempre volta para a primeira página: manter a página 3 de um recorte
     que agora tem uma página só mostraria lista vazia com dados existindo. */
  useEffect(() => {
    setPagina(1);
  }, [filtros.escopo, filtros.tipo, filtros.parceiro]);

  const consulta = {
    projeto_id: filtros.escopo || undefined,
    tipo: filtros.tipo || undefined,
    parceiro: filtros.parceiro.trim() || undefined,
    pagina,
    limite: LIMITE_PAGINA,
  };

  const reunioesQuery = useQuery({
    queryKey: ['carbon', 'reunioes', consulta],
    queryFn: () => listarReunioes(msal, consulta),
    /* Em modo demonstração não existe conta no MSAL (o login fica desabilitado) e as
       funções da API não usam token: exigir `autenticado` deixaria a tela
       permanentemente vazia justamente no modo que existe para revisá-la. */
    enabled: habilitado,
  });

  /**
   * Projetos, só para o seletor de escopo e nada mais.
   *
   * Falha aqui NÃO pode derrubar a tela de reuniões: o seletor degrada para
   * "Backoffice" e o formulário continua utilizável, com aviso no campo.
   */
  const projetosQuery = useQuery({
    queryKey: ['carbon', 'projetos'],
    queryFn: async () => {
      /* normalizarListaProjetos: a chave ['carbon', 'projetos'] é compartilhada; ler o
         envelope aqui é o que impede outra tela de encontrar um formato diferente. */
      return normalizarListaProjetos(await listarProjetos(msal));
    },
    enabled: habilitado,
  });

  const reunioes = reunioesQuery.data?.reunioes ?? [];
  const total = reunioesQuery.data?.total ?? 0;
  const resumo = reunioesQuery.data?.resumo ?? null;
  const projetos = projetosQuery.data?.projetos ?? [];

  const opcoesProjeto = useMemo(
    () => [
      { valor: ESCOPO_BACKOFFICE, rotulo: 'Backoffice (sem projeto)' },
      ...projetos.map((p) => ({ valor: p.id, rotulo: p.nome || 'Projeto sem nome' })),
    ],
    [projetos],
  );

  const opcoesFiltroEscopo = useMemo(
    () => [
      { valor: '', rotulo: 'Todas as reuniões' },
      { valor: ESCOPO_BACKOFFICE, rotulo: 'Somente backoffice' },
      ...projetos.map((p) => ({ valor: p.id, rotulo: p.nome || 'Projeto sem nome' })),
    ],
    [projetos],
  );

  const avisoProjetos = projetosQuery.isError
    ? 'Não foi possível carregar a lista de projetos agora, então só o escopo de backoffice está disponível.'
    : undefined;

  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE_PAGINA));
  const filtroAtivo = Boolean(filtros.escopo || filtros.tipo || filtros.parceiro.trim());

  const fecharPainel = () => {
    setPainel(null);
    setForm(FORM_VAZIO);
  };

  const abrirNova = () => {
    setForm(FORM_VAZIO);
    setFormTeams(formTeamsVazio(emailOrganizador));
    setPainel({ modo: 'criar', reuniao: null });
  };

  const abrirEdicao = (reuniao) => {
    setForm(formDaReuniao(reuniao));
    setPainel({ modo: 'editar', reuniao });
  };

  const salvar = useMutation({
    /*
     * DUAS CHAMADAS, uma transação de mentira, e a escolha é deliberada.
     *
     * Criar a reunião e criar o evento no Teams são dois sistemas diferentes
     * (nosso banco e o Microsoft Graph) e não há transação que abranja os dois.
     * A ordem é reunião primeiro: o evento precisa do id dela.
     *
     * SE O TEAMS FALHAR, a reunião FICA. Desfazer seria pior: a pessoa
     * preencheu título, data, tipo e parceiro, e perder tudo porque o Graph
     * estava fora do ar é castigo por um problema que não é dela. O aviso diz o
     * que aconteceu e o que fazer - o painel de edição tem o botão para tentar
     * de novo.
     */
    mutationFn: async ({ id, payload, teams }) => {
      const reuniao = id
        ? await atualizarReuniao(msal, id, payload)
        : await criarReuniao(msal, payload);

      if (!teams) return { reuniao, teams: null };

      const idNovo = id ?? reuniao?.reuniao?.id ?? reuniao?.id;
      if (!idNovo) return { reuniao, teams: null, avisoTeams: 'sem_id' };

      try {
        return { reuniao, teams: await criarReuniaoTeams(msal, idNovo, teams) };
      } catch (e) {
        return { reuniao, teams: null, avisoTeams: e?.message || 'falha' };
      }
    },
    onSuccess: (resultado, variaveis) => {
      queryClient.invalidateQueries({ queryKey: ['carbon', 'reunioes'] });
      if (variaveis?.id) {
        queryClient.invalidateQueries({ queryKey: ['carbon', 'reuniao', variaveis.id] });
      }

      if (resultado?.avisoTeams) {
        // A reunião existe; só o evento não. Aviso e não erro, porque metade do
        // trabalho deu certo e some da tela se o toast for vermelho.
        toast.warning(
          `Reunião criada, mas o evento no Teams não: ${resultado.avisoTeams} ` +
            'Abra a reunião em Editar para tentar de novo.',
          { duration: 9000 },
        );
      } else if (resultado?.teams) {
        toast.success('Reunião criada no portal e no Teams. Os convites foram enviados.');
      } else {
        toast.success(variaveis?.id ? 'Reunião atualizada.' : 'Reunião criada.');
      }
      fecharPainel();
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar a reunião.'),
  });

  const gerar = useMutation({
    mutationFn: async ({ id, quantidade }) => gerarSerieReunioes(msal, id, quantidade),
    onSuccess: (resposta) => {
      queryClient.invalidateQueries({ queryKey: ['carbon', 'reunioes'] });
      const criadas = Number(resposta?.criadas) || 0;
      const ignoradas = Number(resposta?.ignoradas) || 0;

      /* `criadas = 0` com `ignoradas > 0` NÃO é erro: significa que a agenda já estava
         criada (a geração é idempotente por data). Tratar os dois casos com o mesmo
         toast verde de sucesso esconderia justamente o que a pessoa precisa saber. */
      if (criadas === 0) {
        toast.info(
          ignoradas > 0
            ? `Nenhuma reunião nova: as ${ignoradas} datas da série já estavam cadastradas.`
            : 'Nenhuma reunião foi criada.',
        );
      } else {
        toast.success(
          ignoradas > 0
            ? `${criadas} ${criadas === 1 ? 'reunião criada' : 'reuniões criadas'}. ${ignoradas} ${ignoradas === 1 ? 'data já existia' : 'datas já existiam'} e foram ignoradas.`
            : `${criadas} ${criadas === 1 ? 'reunião criada' : 'reuniões criadas'}.`,
        );
      }
      setSerie(null);
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível gerar a série.'),
  });

  /* Estado dos campos do Teams durante a CRIAÇÃO. Na edição quem cuida é o
     PainelTeams, que fala direto com a API porque a reunião já existe. */
  const [formTeams, setFormTeams] = useState(() => formTeamsVazio(emailOrganizador));

  const enviar = () => {
    let payload;
    try {
      // Validação no cliente antes de gastar requisição. O servidor valida de novo:
      // esta camada é conveniência, não é a barreira.
      payload = montarPayload(form, painel?.modo === 'editar');
    } catch (erro) {
      toast.error(erro?.message || 'Revise os campos do formulário.');
      return;
    }
    const editando = painel?.modo === 'editar';

    /* Endereço torto barra AQUI, e não no servidor. Lá a recusa chega depois de
       a reunião já estar gravada, e o resultado é "reunião criada, mas o evento
       no Teams não" - um estado meio pronto por causa de uma letra. */
    if (!editando && formTeams.ativo && participantesInvalidos(formTeams.participantes) > 0) {
      toast.error('Há e-mail de participante sem @. Corrija antes de salvar.');
      return;
    }

    /* Na criação, o Teams vai JUNTO: quem preencheu os campos espera que a
       reunião nasça com o evento e os convites, não que precise reabrir em
       "editar" para completar. O encadeamento é feito no onSuccess do salvar
       (ver `teamsDaCriacao`), porque só ali existe o id da reunião. */
    salvar.mutate({
      id: editando ? painel.reuniao?.id : null,
      payload,
      teams: editando ? null : payloadTeams(formTeams),
    });
  };

  const enviarSerie = () => {
    const quantidade = Number(quantidadeSerie);
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > QUANTIDADE_SERIE_MAXIMA) {
      toast.error(`Informe um número de reuniões entre 1 e ${QUANTIDADE_SERIE_MAXIMA}.`);
      return;
    }
    gerar.mutate({ id: serie?.reuniao?.id, quantidade });
  };

  const hoje = hojeIso();

  const colunas = [
    {
      chave: 'data',
      titulo: 'Data',
      larguraMinima: 120,
      render: (linha) => (
        <div>
          <span className="font-semibold tabular-nums">{fmtData(linha.data)}</span>
          {linha.data >= hoje && (
            <span className="block text-[10px] uppercase tracking-wider text-[#8A9990]">
              A realizar
            </span>
          )}
        </div>
      ),
    },
    {
      chave: 'tipo',
      titulo: 'Tipo',
      larguraMinima: 170,
      render: (linha) => <BadgeTipo tipo={linha.tipo} />,
    },
    {
      chave: 'titulo',
      titulo: 'Reunião',
      larguraMinima: 260,
      render: (linha) => (
        <div className="min-w-0">
          <span className="font-semibold text-[#1A2B1F] break-words">
            {linha.titulo || 'Reunião sem título'}
          </span>
          {linha.parceiro && (
            <span className="block text-[11px] text-[#5C7060] break-words">
              Parceiro: {linha.parceiro}
            </span>
          )}
        </div>
      ),
    },
    {
      chave: 'projeto_nome',
      titulo: 'Escopo',
      larguraMinima: 170,
      render: (linha) =>
        linha.projeto_id ? (
          <span className="break-words">{linha.projeto_nome || 'Projeto'}</span>
        ) : (
          <span className="text-[#8A9990]">Backoffice</span>
        ),
    },
    {
      chave: 'tem_ata',
      titulo: 'Ata',
      larguraMinima: 130,
      render: (linha) => <BadgeAta reuniao={linha} />,
    },
    {
      chave: 'pendencias_abertas',
      titulo: 'Pendências',
      numerica: true,
      larguraMinima: 120,
      render: (linha) => {
        const totalPendencias = Number(linha.pendencias_total) || 0;
        const abertas = Number(linha.pendencias_abertas) || 0;
        if (totalPendencias === 0) return <span className="text-[#8A9990]">-</span>;
        return (
          <span className={abertas > 0 ? 'font-semibold text-[#A34F0C]' : 'text-[#5C7060]'}>
            {abertas} de {totalPendencias} {abertas === 1 ? 'aberta' : 'abertas'}
          </span>
        );
      },
    },
    {
      chave: 'acoes',
      titulo: 'Ações',
      alinhamento: 'direita',
      larguraMinima: 250,
      render: (linha) => (
        <div className="flex items-center justify-end gap-1.5">
          {TIPOS_RECORRENTES.includes(linha.tipo) && (
            <BotaoSecundario
              icone={Repeat}
              tamanho="sm"
              titulo="Gerar as próximas reuniões semanais a partir desta"
              onClick={() => {
                setQuantidadeSerie(String(QUANTIDADE_SERIE_PADRAO));
                setSerie({ reuniao: linha });
              }}
            >
              Série
            </BotaoSecundario>
          )}
          <BotaoSecundario icone={Pencil} tamanho="sm" onClick={() => abrirEdicao(linha)}>
            Editar
          </BotaoSecundario>
          <BotaoPrimario
            tom="verde"
            tamanho="sm"
            como="link"
            para={montarUrl('ReuniaoAta', { id: linha.id }) ?? `/Reunioes/${linha.id}/Ata`}
            icone={FileText}
            iconeDireita={ArrowRight}
          >
            Ata
          </BotaoPrimario>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* O título da página fica na topbar do Layout (nenhuma tela renderiza h1). */}
      <CabecalhoSecao
        titulo="Reuniões"
        descricao={
          reunioesQuery.isLoading
            ? 'Carregando reuniões...'
            : reunioesQuery.isError
              ? 'Não foi possível carregar a lista agora'
              : total === 0
                ? filtroAtivo
                  ? 'Nenhuma reunião no filtro aplicado'
                  : 'Nenhuma reunião cadastrada'
                : `${total} ${total === 1 ? 'reunião' : 'reuniões'}${filtroAtivo ? ' no filtro aplicado' : ''}`
        }
        acao={
          <BotaoPrimario icone={Plus} onClick={abrirNova}>
            Nova reunião
          </BotaoPrimario>
        }
      />

      {/* ===== Filtros ===== */}
      <Cartao
        icone={Filter}
        tomIcone="neutro"
        titulo="Filtros"
        subtitulo="O histórico por parceiro só é possível porque parceiro e tipo são campos, e não parte do título."
        acao={
          filtroAtivo ? (
            <BotaoSecundario
              variante="fantasma"
              tamanho="sm"
              onClick={() => setFiltros({ escopo: '', tipo: '', parceiro: '' })}
            >
              Limpar
            </BotaoSecundario>
          ) : null
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Campo
            rotulo="Escopo"
            tipo="select"
            opcoes={opcoesFiltroEscopo}
            valor={filtros.escopo}
            onChange={(valor) => setFiltros((a) => ({ ...a, escopo: valor }))}
          />
          <Campo
            rotulo="Tipo"
            tipo="select"
            rotuloVazio="Todos os tipos"
            opcoes={OPCOES_TIPO}
            valor={filtros.tipo}
            onChange={(valor) => setFiltros((a) => ({ ...a, tipo: valor }))}
          />
          <Campo
            rotulo="Parceiro"
            valor={filtros.parceiro}
            onChange={(valor) => setFiltros((a) => ({ ...a, parceiro: valor }))}
            placeholder="Trecho do nome da organização"
            extras={{ maxLength: 200 }}
          />
        </div>
      </Cartao>

      {/* ===== Resumo ===== */}
      {resumo && !reunioesQuery.isError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Indicador
            icone={CalendarDays}
            rotulo="Próxima reunião"
            valor={fmtData(resumo.proxima_data)}
            detalhe={
              resumo.ultima_data ? `Última realizada: ${fmtData(resumo.ultima_data)}` : undefined
            }
          />
          <Indicador
            icone={ClipboardList}
            rotulo="Sem ata"
            valor={Number(resumo.sem_ata) || 0}
            detalhe="Reunião sem registro não serve de evidência."
          />
          <Indicador
            icone={ShieldCheck}
            rotulo="Atas aprovadas"
            valor={Number(resumo.atas_aprovadas) || 0}
            detalhe="Prontas para anexar à auditoria."
          />
          <Indicador
            icone={ListChecks}
            rotulo="Pendências abertas"
            valor={Number(resumo.pendencias_abertas) || 0}
            detalhe="Alimentam o backlog de atividades."
          />
        </div>
      )}

      {/* ===== Lista ===== */}
      <Tabela
        legenda="Reuniões cadastradas, com estado da ata e pendências abertas"
        colunas={colunas}
        dados={reunioes}
        carregando={reunioesQuery.isLoading}
        rotuloCarregando="Carregando reuniões"
        erro={reunioesQuery.isError}
        iconeVazio={Handshake}
        tituloVazio={filtroAtivo ? 'Nenhuma reunião no filtro' : 'Nenhuma reunião cadastrada'}
        textoVazio={
          filtroAtivo
            ? 'Nenhuma reunião corresponde ao escopo, tipo e parceiro escolhidos. Limpe o filtro para ver o histórico completo.'
            : 'A cadência semanal é contínua e a ata de reunião de governança e de consulta é evidência exigida na auditoria. Cadastre a primeira reunião e gere as próximas semanas de uma vez.'
        }
        acaoVazio={
          filtroAtivo ? (
            <BotaoSecundario onClick={() => setFiltros({ escopo: '', tipo: '', parceiro: '' })}>
              Limpar filtros
            </BotaoSecundario>
          ) : (
            <BotaoPrimario icone={Plus} onClick={abrirNova}>
              Cadastrar reunião
            </BotaoPrimario>
          )
        }
        rodape={
          totalPaginas > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-[#8A9990]">
                Página {pagina} de {totalPaginas}
              </span>
              <div className="flex items-center gap-2">
                <BotaoSecundario
                  tamanho="sm"
                  icone={ChevronLeft}
                  desabilitado={pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </BotaoSecundario>
                <BotaoSecundario
                  tamanho="sm"
                  iconeDireita={ChevronRight}
                  desabilitado={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                >
                  Próxima
                </BotaoSecundario>
              </div>
            </div>
          ) : null
        }
      />

      {/* ===== Painel de cadastro e edição ===== */}
      <PainelLateral
        aberto={Boolean(painel)}
        onFechar={fecharPainel}
        icone={Handshake}
        titulo={painel?.modo === 'editar' ? 'Editar reunião' : 'Nova reunião'}
        subtitulo="Tipo, data e parceiro são campos próprios: não repita nenhum deles no título."
        largura="lg"
        // Formulário preenchido não pode ser descartado por um clique distraído fora.
        fecharAoClicarFora={false}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario variante="fantasma" onClick={fecharPainel}>
              Cancelar
            </BotaoSecundario>
            {/* onClick e não type="submit": o rodapé do painel fica fora do formulário. */}
            <BotaoPrimario onClick={enviar} carregando={salvar.isPending}>
              {painel?.modo === 'editar' ? 'Salvar alterações' : 'Criar reunião'}
            </BotaoPrimario>
          </div>
        }
      >
        <FormularioReuniao
          form={form}
          setForm={setForm}
          editando={painel?.modo === 'editar'}
          opcoesProjeto={opcoesProjeto}
          avisoProjetos={avisoProjetos}
        />

        {/* O Teams só aparece ao EDITAR, nunca ao criar: o evento precisa de uma
            reunião com id e data já gravados, e a data do evento vem do registro.
            Oferecer o painel numa reunião que ainda não existe daria um botão que
            só pode falhar. */}
        <div className="mt-6 pt-5 border-t border-[#DDE3DE]">
          <div className="flex items-center gap-2 mb-3">
            <Video size={15} className="text-[#5C7060]" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[#1A2B1F]">Microsoft Teams</h3>
          </div>

          {/* Os campos aparecem NOS DOIS momentos, e isso mudou em 26/08/2026.
              Antes só existiam ao editar, então quem criava uma reunião salvava,
              reabria e só ali descobria que faltava preencher o Teams: duas idas
              para uma tarefa só.

              Na CRIAÇÃO os campos são controlados por esta tela e enviados logo
              depois de a reunião nascer (ver a mutation `salvar`), porque o
              evento precisa do id. Na EDIÇÃO quem manda é o PainelTeams, que já
              tem o id e fala direto com a API. */}
          {painel?.modo === 'editar' && painel?.reuniao?.id ? (
            <PainelTeams
              reuniao={painel.reuniao}
              aoMudar={() => reunioesQuery.refetch()}
            />
          ) : (
            <CamposTeams
              valor={formTeams}
              aoMudar={setFormTeams}
              emailOrganizador={emailOrganizador}
              dataReuniao={form.data}
            />
          )}
        </div>
      </PainelLateral>

      {/* ===== Painel da série recorrente ===== */}
      <PainelLateral
        aberto={Boolean(serie)}
        onFechar={() => setSerie(null)}
        icone={Repeat}
        titulo="Gerar próximas reuniões"
        subtitulo="Cadência recorrente em vez de cadastro manual repetido."
        largura="md"
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario variante="fantasma" onClick={() => setSerie(null)}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={enviarSerie} carregando={gerar.isPending}>
              Gerar
            </BotaoPrimario>
          </div>
        }
      >
        <div className="space-y-4">
          <Cartao
            titulo={serie?.reuniao?.titulo || 'Reunião'}
            subtitulo={`${TIPOS[serie?.reuniao?.tipo]?.rotulo || serie?.reuniao?.tipo || ''} · ${fmtData(serie?.reuniao?.data)}${serie?.reuniao?.parceiro ? ` · ${serie.reuniao.parceiro}` : ''}`}
            nivelTitulo={3}
          >
            <p className="text-xs text-[#5C7060] leading-relaxed">
              As novas reuniões copiam o escopo, o tipo, o título e o parceiro desta, com
              intervalo de {INTERVALO_SERIE_DIAS} dias a partir de {fmtData(serie?.reuniao?.data)}.
            </p>
          </Cartao>

          <Campo
            rotulo="Quantas reuniões"
            tipo="numero"
            valor={quantidadeSerie}
            onChange={(valor) => setQuantidadeSerie(valor)}
            extras={{ min: 1, max: QUANTIDADE_SERIE_MAXIMA, step: 1 }}
            dica={`De 1 a ${QUANTIDADE_SERIE_MAXIMA} (meio ano de agenda).`}
          />

          <AvisoDiscreto
            tom="azul"
            titulo="Gerar duas vezes não duplica a agenda."
            texto="Data que já tem reunião equivalente é ignorada pelo servidor, e o resultado informa quantas foram criadas e quantas já existiam."
          />
        </div>
      </PainelLateral>
    </div>
  );
}

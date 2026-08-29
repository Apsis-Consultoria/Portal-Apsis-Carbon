/**
 * Consultoria - o funil comercial da APSIS Carbon: propostas e consultorias.
 *
 * DE ONDE VEM O CONTEÚDO. A página `Consultoria` do Notion, lida ao vivo em 25/08/2026
 * (docs/notion/19-varredura-ao-vivo-25-08.md). São 7 propostas e 9 consultorias reais. O
 * primeiro estágio do funil, `Oportunidades (OPs)`, está VAZIO e por isso não tem tabela
 * no banco nem aba aqui: construir tela para um estágio sem nenhum registro seria desenhar
 * um processo que talvez não exista mais.
 *
 * DUAS ABAS E NÃO UMA LISTA SÓ. Proposta e consultoria são dois estágios do mesmo funil,
 * mas as colunas não se encontram: a proposta tem código de AP, linha de serviço e
 * desfecho; a consultoria tem prazo e andamento. Empilhar as duas numa tabela deixaria
 * metade das células vazias em metade das linhas, que é exatamente o motivo de a migration
 * ter criado duas tabelas em vez de uma com coluna de estágio.
 *
 * QUATRO DECISÕES QUE O DADO IMPÔS:
 *
 * 1. CÓDIGO NÃO É IDENTIFICADOR. Ele é anulável e repetido: três das sete propostas não
 *    têm código e duas carregam o literal `AP-000XX/25`, com o XX por preencher porque o
 *    número só é atribuído depois. A lista usa `id` como chave, nunca o código, e marca o
 *    placeholder na tela para ninguém ler aquilo como um número de AP de verdade.
 *
 * 2. A TAXA DE CONVERSÃO TEM DENOMINADOR VISÍVEL. Ela é ganhas sobre propostas DECIDIDAS
 *    (ganhas mais perdidas), nunca sobre o total: proposta em elaboração não é derrota.
 *    Hoje há 1 ganha e 0 perdidas, então o número é 100% sobre uma única proposta - e é
 *    por isso que o denominador aparece sempre ao lado, e que a tela avisa quando a base é
 *    pequena demais para a porcentagem significar alguma coisa. Métrica sem denominador,
 *    aqui, seria propaganda.
 *
 * 3. NOME DE CONSULTORIA NÃO TEM MÁSCARA. A convenção é `AP - <número>-<ano> [CLIENTE]` e
 *    o dado real a desrespeita de várias maneiras (`AP x -25 [IPEL]` quando o número não
 *    existe, hífen fora de lugar, um registro só com `AP -`). Um campo que exigisse
 *    formato brigaria com o hábito, e o resultado seria a equipe parar de lançar.
 *
 * 4. O VÍNCULO ENTRE OS DOIS ESTÁGIOS ESTÁ FALTANDO, E A TELA MOSTRA ISSO. O Notion não
 *    liga as duas bases: a ligação existe na cabeça de quem trabalha. O resumo conta
 *    quantas consultorias estão sem proposta de origem e há filtro para isolá-las, porque
 *    esconder a lacuna faria o funil parecer costurado quando não está.
 *
 * AUTORIZAÇÃO: quem pode escrever é decidido no SERVIDOR (a Edge Function exige papel
 * admin ou gestor e responde 403 'sem_permissao'). A tela não esconde ações por perfil de
 * propósito: seria uma segunda fonte de verdade para a mesma regra e ficaria
 * dessincronizada do backend na primeira mudança. Um 403 vira toast com texto claro.
 *
 * LGPD: nenhum campo desta tela guarda pessoa. As colunas `Responsável` e `Envolvidos` do
 * Notion traziam nome de colaborador e não foram importadas para o banco; cliente é pessoa
 * jurídica. As dicas dos formulários pedem explicitamente que não se registre nome,
 * telefone nem e-mail de contato.
 */

import { useMemo, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Handshake, Briefcase, FileText, Plus, Search, TrendingUp, CalendarClock,
  TriangleAlert, Link2, Unlink, Check, Info,
} from 'lucide-react';
import {
  listarPropostas,
  criarProposta,
  atualizarProposta,
  listarConsultorias,
  criarConsultoria,
  atualizarConsultoria,
} from '@/lib/api/consultoria';
import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import Cartao from '@/components/ui/Cartao';
import CabecalhoSecao from '@/components/ui/CabecalhoSecao';
import Tabela from '@/components/ui/Tabela';
import Badge from '@/components/ui/Badge';
import Campo from '@/components/ui/Campo';
import SeletorStatus from '@/components/ui/SeletorStatus';
import PainelLateral from '@/components/ui/PainelLateral';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';

/* ===== Domínio ============================================================
   Espelham os CHECK de carbon_propostas.status e carbon_consultorias.status. Valor fora
   do mapa ainda aparece na tela, com o rótulo cru, em vez de sumir: um status novo criado
   no banco antes do deploy do frontend não pode deixar a linha sem identificação.     */
const STATUS_PROPOSTA = {
  elaboracao: { rotulo: 'Em elaboração', tom: 'azul' },
  ganha: { rotulo: 'Ganha', tom: 'verde' },
  perdida: { rotulo: 'Perdida', tom: 'vermelho' },
  cancelada: { rotulo: 'Cancelada', tom: 'neutro' },
};

const STATUS_CONSULTORIA = {
  nao_iniciada: { rotulo: 'Não iniciada', tom: 'neutro' },
  em_andamento: { rotulo: 'Em andamento', tom: 'ambar' },
  concluida: { rotulo: 'Concluída', tom: 'verde' },
  cancelada: { rotulo: 'Cancelada', tom: 'neutro' },
};

/** `{valor, rotulo, tom}` como o SeletorStatus espera, na ordem do ciclo de vida. */
const opcoesDe = (mapa) =>
  Object.entries(mapa).map(([valor, visual]) => ({ valor, rotulo: visual.rotulo, tom: visual.tom }));

const OPCOES_PROPOSTA = opcoesDe(STATUS_PROPOSTA);
const OPCOES_CONSULTORIA = opcoesDe(STATUS_CONSULTORIA);

/**
 * Código de AP com o número ainda por atribuir.
 *
 * MESMA REGRA do índice único parcial da migration, que ignora `codigo not ilike '%xx%'`
 * justamente porque `AP-000XX/25` aparece em duas propostas diferentes. Marcar isso na
 * tela evita que alguém leia o placeholder como número real e vá procurá-lo no sistema
 * da APSIS.
 */
const codigoEhPlaceholder = (codigo) => /xx/i.test(String(codigo ?? ''));

/* ===== Formatação =========================================================
   Duas funções de data, e a diferença entre elas importa.

   `prazo`, `data_ganha` e `data_perdida` são colunas `date` e chegam como 'AAAA-MM-DD':
   formatadas na mão, sem passar por Date, porque new Date('2026-01-01') é meia-noite UTC
   e no fuso do Brasil mostraria o dia ANTERIOR - e aqui um dia de diferença é a diferença
   entre no prazo e vencido.

   `data_criacao` é `timestamptz` e tem hora de verdade: essa passa por Intl com o fuso
   explícito, que é o único jeito de o dia exibido ser o dia em São Paulo.            */

const FORMATO_DIA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function fmtData(valor) {
  if (!valor) return null;
  const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!partes) return String(valor);
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

function fmtMomento(valor) {
  if (!valor) return null;
  const momento = new Date(valor);
  if (Number.isNaN(momento.getTime())) return String(valor);
  return FORMATO_DIA.format(momento);
}

/**
 * Data 'AAAA-MM-DD' para o `<input type="date">`, que exige exatamente esse formato.
 *
 * Coluna `date` volta como está: já é o formato do input, e passar por Date só criaria a
 * chance de escorregar um dia. `timestamptz` (data_criacao) passa pelo MESMO fuso que a
 * tabela usa para exibir - sem isso, o formulário mostraria 18/02 ao lado de uma linha da
 * tabela escrita 19/02, e quem salvasse sem mexer no campo gravaria a data errada.
 */
const FORMATO_ISO_SAO_PAULO = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function paraCampoData(valor) {
  if (!valor) return '';
  const texto = String(valor);
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

  const momento = new Date(texto);
  if (Number.isNaN(momento.getTime())) return '';
  const partes = {};
  for (const parte of FORMATO_ISO_SAO_PAULO.formatToParts(momento)) {
    partes[parte.type] = parte.value;
  }
  return `${partes.year}-${partes.month}-${partes.day}`;
}

/** Diferença em dias entre duas datas ISO, em UTC para não escorregar no horário de verão. */
function diasEntre(inicio, fim) {
  const [a1, m1, d1] = String(inicio).split('-').map(Number);
  const [a2, m2, d2] = String(fim).split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}

/** Fração de 0 a 1 vinda do servidor. Sem casa decimal: 33% já diz o que precisa dizer. */
const fmtPercentual = (fracao) =>
  fracao === null || fracao === undefined ? '-' : `${Math.round(fracao * 100)}%`;

/* ===== Blocos de interface ================================================ */

/**
 * Célula de status editável.
 *
 * SeletorStatus e não Badge nas duas tabelas: mudar o estágio é o gesto mais frequente do
 * funil, e enterrá-lo dentro do formulário custaria quatro cliques para trocar uma
 * palavra. O SeletorStatus preserva valor fora da lista de opções como opção extra, então
 * um status novo criado no banco antes do deploy não faz o select cair sozinho na primeira
 * opção e gravar o status errado no salvamento seguinte.
 *
 * O clique (e o Enter) param aqui: a linha da tabela abre o formulário, e sem o
 * stopPropagation trocar o status abriria o painel junto - o mesmo cuidado que a célula
 * de arquivo de Documentos.jsx precisou.
 */
function CelulaStatus({ valor, opcoes, rotuloAcessivel, salvando, aoTrocar }) {
  return (
    <div
      onClick={(evento) => evento.stopPropagation()}
      onKeyDown={(evento) => evento.stopPropagation()}
    >
      <SeletorStatus
        valor={valor}
        opcoes={opcoes}
        onChange={aoTrocar}
        carregando={salvando}
        tamanho="sm"
        rotuloAcessivel={rotuloAcessivel}
      />
    </div>
  );
}

/** Cartão de número da faixa de resumo. */
function Indicador({ rotulo, valor, detalhe, alerta = false }) {
  return (
    <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">{rotulo}</p>
      <p
        className={`text-base font-bold tabular-nums mt-0.5 ${alerta ? 'text-[#A3231C]' : 'text-[#1A2B1F]'}`}
      >
        {valor}
      </p>
      <p className="text-[11px] text-[#5C7060]">{detalhe}</p>
    </div>
  );
}

/**
 * Faixa de resumo do funil inteiro, com os dois estágios lado a lado.
 *
 * Os números vêm do conjunto FILTRADO de cada aba, e não da página: um resumo que contasse
 * só as 50 primeiras linhas seria pior do que nenhum. Como as duas listas são carregadas
 * sempre (o funil não se lê pela metade), a faixa não muda ao trocar de aba.
 */
function FaixaFunil({ propostas, consultorias }) {
  if (!propostas && !consultorias) return null;

  const decididas = propostas?.decididas ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Indicador
        rotulo="Em elaboração"
        valor={String(propostas?.por_status?.elaboracao ?? 0)}
        detalhe={`de ${propostas?.total ?? 0} propostas`}
      />
      <Indicador
        rotulo="Ganhas"
        valor={String(propostas?.por_status?.ganha ?? 0)}
        detalhe={
          decididas === 0
            ? 'nenhuma decidida ainda'
            : `${decididas} ${decididas === 1 ? 'decidida' : 'decididas'}`
        }
      />
      <Indicador
        rotulo="Conversão"
        valor={fmtPercentual(propostas?.taxa_conversao)}
        // O denominador viaja junto do número, sempre. Ver a decisão 2 do cabeçalho.
        detalhe={
          decididas === 0
            ? 'sem base para calcular'
            : `sobre ${decididas} ${decididas === 1 ? 'decidida' : 'decididas'}`
        }
      />
      <Indicador
        rotulo="Consultorias em curso"
        valor={String(consultorias?.em_curso ?? 0)}
        detalhe={`${consultorias?.por_status?.nao_iniciada ?? 0} não iniciadas`}
      />
      <Indicador
        rotulo="Prazo vencido"
        valor={String(consultorias?.prazo_vencido ?? 0)}
        detalhe={
          (consultorias?.sem_prazo ?? 0) > 0
            ? `${consultorias.sem_prazo} sem prazo definido`
            : 'todas com prazo'
        }
        alerta={(consultorias?.prazo_vencido ?? 0) > 0}
      />
    </div>
  );
}

/**
 * O que a taxa de conversão quer dizer, em texto, ao lado do número.
 *
 * Existe porque a conta é discutível e a escolha precisa ficar registrada onde quem lê o
 * número está olhando, não só no código. Três situações, três textos diferentes: sem base,
 * base pequena, e base suficiente. O corte em cinco propostas decididas é arbitrário e
 * está aqui declarado como o que é - um limiar de exibição, não uma regra de negócio.
 */
function AvisoConversao({ resumo }) {
  const decididas = resumo?.decididas ?? 0;
  const emElaboracao = resumo?.por_status?.elaboracao ?? 0;

  if (decididas === 0) {
    return (
      <AvisoDiscreto tom="azul" icone={TrendingUp} titulo="Ainda não há taxa de conversão.">
        Nenhuma proposta foi marcada como ganha ou perdida. As {emElaboracao} em elaboração
        não entram na conta: proposta que ainda está sendo negociada não é derrota.
      </AvisoDiscreto>
    );
  }

  if (decididas < 5) {
    return (
      <AvisoDiscreto tom="ambar" icone={TriangleAlert} titulo="Base pequena para a porcentagem.">
        A conversão é calculada sobre {decididas}{' '}
        {decididas === 1 ? 'proposta decidida' : 'propostas decididas'} (ganhas mais
        perdidas), e não sobre o total: as {emElaboracao} em elaboração ainda não têm
        desfecho. Com uma base tão pequena, prefira ler os números absolutos ao lado.
      </AvisoDiscreto>
    );
  }

  return (
    <AvisoDiscreto tom="azul" icone={TrendingUp} titulo="Como a conversão é calculada.">
      Ganhas divididas pelas {decididas} propostas decididas (ganhas mais perdidas). As{' '}
      {emElaboracao} em elaboração ficam fora da conta até terem desfecho, senão a taxa
      subiria sozinha toda vez que alguém decidisse uma proposta antiga.
    </AvisoDiscreto>
  );
}

/* ===== Formulários ======================================================== */

const FORM_PROPOSTA = {
  codigo: '',
  titulo: '',
  cliente: '',
  status: 'elaboracao',
  grupo_servico: '',
  servico: '',
  metodologia: '',
  data_criacao: '',
  observacoes: '',
  ativo: true,
};

const FORM_CONSULTORIA = {
  nome: '',
  cliente: '',
  status: 'nao_iniciada',
  prazo: '',
  proposta_id: '',
  observacoes: '',
  ativo: true,
};

function formDaProposta(proposta) {
  return {
    ...FORM_PROPOSTA,
    codigo: proposta?.codigo ?? '',
    titulo: proposta?.titulo ?? '',
    cliente: proposta?.cliente ?? '',
    status: proposta?.status || 'elaboracao',
    grupo_servico: proposta?.grupo_servico ?? '',
    servico: proposta?.servico ?? '',
    metodologia: proposta?.metodologia ?? '',
    data_criacao: paraCampoData(proposta?.data_criacao),
    observacoes: proposta?.observacoes ?? '',
    ativo: proposta?.ativo !== false,
  };
}

function formDaConsultoria(consultoria) {
  return {
    ...FORM_CONSULTORIA,
    nome: consultoria?.nome ?? '',
    cliente: consultoria?.cliente ?? '',
    status: consultoria?.status || 'nao_iniciada',
    prazo: paraCampoData(consultoria?.prazo),
    proposta_id: consultoria?.proposta_id ?? '',
    observacoes: consultoria?.observacoes ?? '',
    ativo: consultoria?.ativo !== false,
  };
}

/**
 * Monta o corpo da requisição.
 *
 * `editando` muda o significado de campo vazio: na edição vai como null (limpar), na
 * criação é omitido (deixa o default do banco). Sem isso, apagar um campo já preenchido
 * seria impossível, com a tela ainda dizendo "atualizado".
 */
function montarPayload(form, campos, editando) {
  const payload = {};
  for (const campo of campos) {
    const valor = String(form[campo] ?? '').trim();
    if (valor) payload[campo] = valor;
    else if (editando) payload[campo] = null;
  }
  return payload;
}

const CAMPOS_TEXTO_PROPOSTA = [
  'codigo',
  'titulo',
  'cliente',
  'grupo_servico',
  'servico',
  'metodologia',
  'data_criacao',
  'observacoes',
];

const CAMPOS_TEXTO_CONSULTORIA = ['nome', 'cliente', 'prazo', 'proposta_id', 'observacoes'];

function payloadProposta(form, editando, statusOriginal = null) {
  const payload = montarPayload(form, CAMPOS_TEXTO_PROPOSTA, editando);
  payload.ativo = form.ativo;

  // `status` SÓ VAI QUANDO MUDOU, e isso não é economia de bytes.
  //
  // O servidor deriva a data de desfecho a partir do status: receber
  // status='ganha' grava data_ganha com HOJE (ver o comentário de
  // atualizarProposta em rotas/consultoria.ts). Mandando o status em toda
  // edição, corrigir o título de uma proposta ganha em fevereiro reescreveria
  // data_ganha para hoje - e a taxa de conversão passaria a datar as vitórias
  // pela última vez que alguém abriu o formulário.
  //
  // Na criação sempre vai: não há estado anterior para comparar.
  if (!editando || form.status !== statusOriginal) {
    payload.status = form.status;
  }

  // Mesma recusa do servidor, feita aqui só para a pessoa corrigir sem perder o
  // formulário. A barreira de verdade é a Edge Function.
  if (!payload.codigo && !payload.titulo && !payload.cliente) {
    throw new Error(
      'Informe pelo menos um entre código, título e cliente: sem nenhum dos três a proposta fica sem nada que a identifique na lista.'
    );
  }
  return payload;
}

function payloadConsultoria(form, editando) {
  const payload = montarPayload(form, CAMPOS_TEXTO_CONSULTORIA, editando);
  if (!payload.nome) throw new Error('Informe o nome da consultoria.');
  payload.status = form.status;
  payload.ativo = form.ativo;
  return payload;
}

function FormularioProposta({ form, setForm, grupos }) {
  const alterar = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const conhecidos = (grupos ?? []).map((g) => g.grupo).join(', ');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Campo
        rotulo="Código da AP"
        valor={form.codigo}
        onChange={alterar('codigo')}
        placeholder="AP-00052/25"
        dica="Pode ficar em branco enquanto o número não é atribuído, e pode repetir: AP-000XX/25 é placeholder, não identificador."
        extras={{ maxLength: 120 }}
      />

      <Campo
        rotulo="Cliente"
        valor={form.cliente}
        onChange={alterar('cliente')}
        placeholder="Razão social ou como a equipe se refere"
        dica="Pessoa jurídica. Não registre nome, telefone ou e-mail de pessoa de contato."
        extras={{ maxLength: 200 }}
      />

      <Campo
        rotulo="Título"
        valor={form.titulo}
        onChange={alterar('titulo')}
        placeholder="O que foi proposto, em uma linha"
        extras={{ maxLength: 300 }}
        className="sm:col-span-2"
      />

      <Campo
        rotulo="Status"
        tipo="select"
        opcoes={OPCOES_PROPOSTA.map(({ valor, rotulo }) => ({ valor, rotulo }))}
        valor={form.status}
        onChange={alterar('status')}
        dica="Marcar como ganha ou perdida preenche a data do desfecho automaticamente, com o dia de hoje."
      />

      <Campo
        rotulo="Criada em"
        tipo="data"
        valor={form.data_criacao}
        onChange={alterar('data_criacao')}
        dica="Data de criação da proposta, que pode ser anterior ao cadastro aqui."
      />

      <Campo
        rotulo="Linha de serviço"
        valor={form.grupo_servico}
        onChange={alterar('grupo_servico')}
        placeholder="Carbono"
        /* Texto livre e não seleção fechada: a coluna é livre na migration porque a APSIS
           tem mais linhas de serviço do que as duas que aparecem no Notion, e uma lista
           fechada recusaria a terceira. A dica mostra o que já existe para o mesmo nome
           não ser escrito de duas formas. */
        dica={conhecidos ? `Já cadastradas: ${conhecidos}. Escreva igual para agrupar.` : undefined}
        extras={{ maxLength: 120 }}
      />

      <Campo
        rotulo="Serviço"
        valor={form.servico}
        onChange={alterar('servico')}
        extras={{ maxLength: 200 }}
      />

      <Campo
        rotulo="Metodologia"
        valor={form.metodologia}
        onChange={alterar('metodologia')}
        extras={{ maxLength: 200 }}
        className="sm:col-span-2"
      />

      <Campo
        rotulo="Observações"
        tipo="textarea"
        linhas={3}
        valor={form.observacoes}
        onChange={alterar('observacoes')}
        dica="Anotação operacional. Sem dado de pessoa física (LGPD)."
        className="sm:col-span-2"
      />

      <Campo
        rotulo="Proposta ativa"
        tipo="checkbox"
        valor={form.ativo}
        onChange={alterar('ativo')}
        dica="Desmarcar arquiva sem apagar. Proposta perdida continua ativa de propósito: é ela que sustenta a taxa de conversão."
        className="sm:col-span-2"
      />
    </div>
  );
}

function FormularioConsultoria({ form, setForm, propostas }) {
  const alterar = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  /* O rótulo junta código e cliente porque o código sozinho repete: duas propostas
     carregam AP-000XX/25. O `valor` da opção é o id, então a escolha nunca é ambígua -
     ambígua seria só a leitura. */
  const opcoesProposta = (propostas ?? []).map((p) => ({
    valor: p.id,
    rotulo: [p.codigo || p.titulo || 'Sem identificação', p.cliente].filter(Boolean).join(' - '),
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Campo
        rotulo="Nome da consultoria"
        obrigatorio
        valor={form.nome}
        onChange={alterar('nome')}
        placeholder="AP - 00052-24 [CLIENTE]"
        dica="A convenção é AP - número-ano [CLIENTE], mas o campo aceita o texto como a equipe escreve: exigir formato rígido faria o lançamento parar."
        extras={{ maxLength: 300 }}
        className="sm:col-span-2"
      />

      <Campo
        rotulo="Cliente"
        valor={form.cliente}
        onChange={alterar('cliente')}
        dica="Pessoa jurídica. Não registre nome, telefone ou e-mail de pessoa de contato."
        extras={{ maxLength: 200 }}
      />

      <Campo
        rotulo="Status"
        tipo="select"
        opcoes={OPCOES_CONSULTORIA.map(({ valor, rotulo }) => ({ valor, rotulo }))}
        valor={form.status}
        onChange={alterar('status')}
      />

      <Campo
        rotulo="Prazo"
        tipo="data"
        valor={form.prazo}
        onChange={alterar('prazo')}
        dica="Só consultoria não iniciada ou em andamento aparece como vencida: trabalho concluído não atrasa."
      />

      <Campo
        rotulo="Proposta de origem"
        tipo="select"
        opcoes={opcoesProposta}
        rotuloVazio="Sem proposta de origem"
        valor={form.proposta_id}
        onChange={alterar('proposta_id')}
        dica="O Notion não liga as duas bases. Preencher aqui é o que costura o funil e faz a proposta aparecer como já executada."
      />

      <Campo
        rotulo="Observações"
        tipo="textarea"
        linhas={3}
        valor={form.observacoes}
        onChange={alterar('observacoes')}
        dica="Anotação operacional. Sem dado de pessoa física (LGPD)."
        className="sm:col-span-2"
      />

      <Campo
        rotulo="Consultoria ativa"
        tipo="checkbox"
        valor={form.ativo}
        onChange={alterar('ativo')}
        dica="Desmarcar arquiva sem apagar o histórico do trabalho."
        className="sm:col-span-2"
      />
    </div>
  );
}

/* ===== Página ============================================================= */

const ABAS = [
  { chave: 'propostas', rotulo: 'Propostas', icone: FileText },
  { chave: 'consultorias', rotulo: 'Consultorias', icone: Briefcase },
];

export default function Consultoria() {
  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const autenticado = (accounts?.length ?? 0) > 0;
  const queryClient = useQueryClient();

  const [aba, setAba] = useState('propostas');
  const [filtrosProposta, setFiltrosProposta] = useState({
    busca: '',
    status: '',
    grupo_servico: '',
    ativo: '',
  });
  const [filtrosConsultoria, setFiltrosConsultoria] = useState({
    busca: '',
    status: '',
    vinculo: '',
    ativo: '',
  });

  /** null | { tipo: 'proposta' | 'consultoria', modo: 'novo' | 'editar', id?: string } */
  const [painel, setPainel] = useState(null);
  const [form, setForm] = useState(FORM_PROPOSTA);
  const [statusSalvando, setStatusSalvando] = useState(null);

  /* Em modo demonstração não existe conta no MSAL (o login fica desabilitado) e as funções
     da API não usam token: exigir `autenticado` deixaria a tela permanentemente vazia
     justamente no modo que existe para revisá-la. */
  const habilitado = (MODO_DEMO && MODO_DEMO_ATIVO()) || autenticado;

  /* As DUAS listas carregam sempre, mesmo com uma aba escondida: a faixa de resumo mostra
     o funil inteiro, e o seletor de proposta de origem do formulário de consultoria
     precisa da lista de propostas. São 7 e 9 registros - carregar as duas custa menos do
     que o piscar de uma faixa que muda de número ao trocar de aba. */
  const propostasQuery = useQuery({
    queryKey: ['carbon', 'propostas', filtrosProposta],
    queryFn: async () => listarPropostas(msal, filtrosProposta),
    enabled: habilitado,
  });

  const consultoriasQuery = useQuery({
    queryKey: ['carbon', 'consultorias', filtrosConsultoria],
    queryFn: async () => listarConsultorias(msal, filtrosConsultoria),
    enabled: habilitado,
  });

  const propostas = propostasQuery.data?.propostas ?? [];
  const resumoPropostas = propostasQuery.data?.resumo ?? null;
  const grupos = propostasQuery.data?.grupos ?? [];

  const consultorias = consultoriasQuery.data?.consultorias ?? [];
  const resumoConsultorias = consultoriasQuery.data?.resumo ?? null;
  /* A referência de "hoje" vem do SERVIDOR, junto da lista. Recalcular no navegador faria
     o texto ("venceu há 3 dias") discordar da cor da linha numa máquina com a data torta. */
  const hoje = consultoriasQuery.data?.hoje ?? null;

  const invalidarFunil = () => {
    queryClient.invalidateQueries({ queryKey: ['carbon', 'propostas'] });
    // As duas listas se afetam: criar uma consultoria com vínculo muda a contagem que
    // aparece na linha da proposta, e nada avisaria a outra aba disso.
    queryClient.invalidateQueries({ queryKey: ['carbon', 'consultorias'] });
  };

  /* ===== Mudança de status pela linha ===================================== */

  const statusDaProposta = useMutation({
    mutationFn: ({ id, status }) => atualizarProposta(msal, id, { status }),
    onSuccess: () => {
      invalidarFunil();
      toast.success('Status da proposta atualizado.');
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível mudar o status.'),
    onSettled: () => setStatusSalvando(null),
  });

  const statusDaConsultoria = useMutation({
    mutationFn: ({ id, status }) => atualizarConsultoria(msal, id, { status }),
    onSuccess: () => {
      invalidarFunil();
      toast.success('Status da consultoria atualizado.');
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível mudar o status.'),
    onSettled: () => setStatusSalvando(null),
  });

  const trocarStatus = (mutacao) => (id, status) => {
    setStatusSalvando(id);
    mutacao.mutate({ id, status });
  };

  /* ===== Painel =========================================================== */

  const fecharPainel = () => setPainel(null);

  const abrirNovaProposta = () => {
    setForm(FORM_PROPOSTA);
    setPainel({ tipo: 'proposta', modo: 'novo' });
  };

  const abrirNovaConsultoria = (proposta = null) => {
    setForm({
      ...FORM_CONSULTORIA,
      // Pré-preenche a partir da proposta ganha, sem inventar formato: o nome vem do
      // código (ou do título) como está, e quem sabe a convenção ajusta antes de salvar.
      nome: proposta ? proposta.codigo || proposta.titulo || '' : '',
      cliente: proposta?.cliente ?? '',
      proposta_id: proposta?.id ?? '',
      status: 'nao_iniciada',
    });
    setPainel({ tipo: 'consultoria', modo: 'novo' });
  };

  const abrirEdicao = (tipo) => (registro) => {
    setForm(tipo === 'proposta' ? formDaProposta(registro) : formDaConsultoria(registro));
    // `statusOriginal` viaja junto para o envio saber se o estágio MUDOU.
    // Ver o comentário de payloadProposta: mandar status sem ter mudado faz o
    // servidor reescrever a data de desfecho com a data de hoje.
    setPainel({ tipo, modo: 'editar', id: registro.id, statusOriginal: registro.status });
  };

  const salvar = useMutation({
    mutationFn: async ({ tipo, id, payload }) => {
      if (tipo === 'proposta') {
        return id ? atualizarProposta(msal, id, payload) : criarProposta(msal, payload);
      }
      return id ? atualizarConsultoria(msal, id, payload) : criarConsultoria(msal, payload);
    },
    onSuccess: (_resposta, variaveis) => {
      invalidarFunil();
      const nome = variaveis.tipo === 'proposta' ? 'Proposta' : 'Consultoria';
      toast.success(variaveis.id ? `${nome} atualizada.` : `${nome} cadastrada.`);
      fecharPainel();
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar.'),
  });

  const enviar = () => {
    const editando = painel?.modo === 'editar';
    let payload;
    try {
      payload = painel?.tipo === 'proposta'
        ? payloadProposta(form, editando, painel?.statusOriginal)
        : payloadConsultoria(form, editando);
    } catch (erro) {
      toast.error(erro?.message || 'Revise os campos do formulário.');
      return;
    }
    salvar.mutate({ tipo: painel.tipo, id: editando ? painel.id : null, payload });
  };

  /** A proposta aberta no painel, para o atalho de registrar a consultoria dela. */
  const propostaEmEdicao = useMemo(
    () =>
      painel?.tipo === 'proposta' && painel?.modo === 'editar'
        ? propostas.find((p) => p.id === painel.id) ?? null
        : null,
    [painel, propostas]
  );

  /* ===== Colunas ========================================================== */

  const colunasPropostas = [
    {
      chave: 'titulo',
      titulo: 'Proposta',
      larguraMinima: 300,
      render: (linha) => {
        const principal = linha.titulo || linha.codigo || 'Proposta sem identificação';
        // Só mostra o selo de código quando ele não é o próprio rótulo principal, para a
        // linha não repetir a mesma string duas vezes.
        const mostrarCodigo = Boolean(linha.codigo) && linha.codigo !== principal;
        return (
          <div className="min-w-0">
            <span
              className={`font-semibold break-words ${linha.titulo ? 'text-[#1A2B1F]' : 'text-[#5C7060] italic'}`}
            >
              {principal}
            </span>
            <span className="flex flex-wrap items-center gap-1.5 mt-1">
              {mostrarCodigo && (
                <Badge tom="neutro" tamanho="sm" className="font-mono">
                  {linha.codigo}
                </Badge>
              )}
              {codigoEhPlaceholder(linha.codigo) && (
                <span className="text-[10px] uppercase tracking-wider text-[#8A9990]">
                  número por atribuir
                </span>
              )}
              {!linha.codigo && (
                <span className="text-[11px] text-[#8A9990]">Sem código de AP</span>
              )}
              {linha.ativo === false && (
                <Badge tom="neutro" tamanho="sm">
                  Arquivada
                </Badge>
              )}
            </span>
          </div>
        );
      },
    },
    {
      chave: 'cliente',
      titulo: 'Cliente',
      larguraMinima: 180,
      render: (linha) => linha.cliente || <span className="text-[#8A9990]">-</span>,
    },
    {
      chave: 'status',
      titulo: 'Status',
      larguraMinima: 170,
      render: (linha) => (
        <CelulaStatus
          valor={linha.status}
          opcoes={OPCOES_PROPOSTA}
          salvando={statusSalvando === linha.id}
          rotuloAcessivel={`Status da proposta ${linha.titulo || linha.codigo || 'sem identificação'}`}
          aoTrocar={(status) => trocarStatus(statusDaProposta)(linha.id, status)}
        />
      ),
    },
    {
      chave: 'grupo_servico',
      titulo: 'Linha de serviço',
      larguraMinima: 150,
      render: (linha) =>
        linha.grupo_servico ? (
          <Badge tom="azul" tamanho="sm">
            {linha.grupo_servico}
          </Badge>
        ) : (
          <span className="text-[11px] text-[#8A9990]">Não declarada</span>
        ),
    },
    {
      chave: 'data_criacao',
      titulo: 'Criada em',
      larguraMinima: 110,
      render: (linha) =>
        linha.data_criacao ? (
          <span className="tabular-nums">{fmtMomento(linha.data_criacao)}</span>
        ) : (
          <span className="text-[#8A9990]">-</span>
        ),
    },
    {
      chave: 'data_ganha',
      titulo: 'Desfecho',
      larguraMinima: 130,
      render: (linha) => {
        if (linha.data_ganha) {
          return (
            <span className="tabular-nums text-[#2F6B45]">Ganha em {fmtData(linha.data_ganha)}</span>
          );
        }
        if (linha.data_perdida) {
          return (
            <span className="tabular-nums text-[#A3231C]">
              Perdida em {fmtData(linha.data_perdida)}
            </span>
          );
        }
        return <span className="text-[11px] text-[#8A9990]">Em aberto</span>;
      },
    },
    {
      chave: 'consultorias',
      titulo: 'Consultoria',
      alinhamento: 'centro',
      larguraMinima: 120,
      render: (linha) =>
        (linha.consultorias ?? 0) > 0 ? (
          <Badge tom="verde" tamanho="sm" icone={Check}>
            {linha.consultorias === 1 ? 'Registrada' : `${linha.consultorias} registradas`}
          </Badge>
        ) : (
          <span className="text-[11px] text-[#8A9990]">-</span>
        ),
    },
  ];

  const colunasConsultorias = [
    {
      chave: 'nome',
      titulo: 'Consultoria',
      larguraMinima: 300,
      render: (linha) => (
        <div className="min-w-0">
          <span className="font-semibold text-[#1A2B1F] break-words">{linha.nome}</span>
          {linha.ativo === false && (
            <Badge tom="neutro" tamanho="sm" className="mt-1">
              Arquivada
            </Badge>
          )}
        </div>
      ),
    },
    {
      chave: 'cliente',
      titulo: 'Cliente',
      larguraMinima: 180,
      render: (linha) => linha.cliente || <span className="text-[#8A9990]">-</span>,
    },
    {
      chave: 'status',
      titulo: 'Status',
      larguraMinima: 170,
      render: (linha) => (
        <CelulaStatus
          valor={linha.status}
          opcoes={OPCOES_CONSULTORIA}
          salvando={statusSalvando === linha.id}
          rotuloAcessivel={`Status da consultoria ${linha.nome}`}
          aoTrocar={(status) => trocarStatus(statusDaConsultoria)(linha.id, status)}
        />
      ),
    },
    {
      chave: 'prazo',
      titulo: 'Prazo',
      larguraMinima: 160,
      render: (linha) => {
        if (!linha.prazo) return <span className="text-[11px] text-[#8A9990]">Sem prazo</span>;
        // `prazo_vencido` vem resolvido do servidor; o texto abaixo só explica o porquê.
        if (!linha.prazo_vencido) {
          return <span className="tabular-nums">{fmtData(linha.prazo)}</span>;
        }
        const atraso = hoje ? diasEntre(linha.prazo, hoje) : null;
        return (
          <span className="font-semibold text-[#A3231C] tabular-nums">
            {fmtData(linha.prazo)}
            {atraso !== null && (
              <span className="block text-[10px] font-semibold uppercase tracking-wider">
                {atraso === 1 ? 'venceu ontem' : `venceu há ${atraso} dias`}
              </span>
            )}
          </span>
        );
      },
    },
    {
      chave: 'proposta_id',
      titulo: 'Proposta de origem',
      larguraMinima: 190,
      render: (linha) =>
        linha.proposta_id ? (
          <Badge tom="verde" tamanho="sm" icone={Link2} className="font-mono">
            {linha.proposta_codigo || linha.proposta_titulo || 'Vinculada'}
          </Badge>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] text-[#8A9990]">
            <Unlink size={12} aria-hidden="true" />
            Não vinculada
          </span>
        ),
    },
  ];

  /* ===== Render =========================================================== */

  const naAbaPropostas = aba === 'propostas';
  const query = naAbaPropostas ? propostasQuery : consultoriasQuery;
  const contagem = naAbaPropostas ? propostas.length : consultorias.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* O título da página fica na topbar do Layout: nenhuma tela renderiza h1. */}
      <CabecalhoSecao
        titulo="Funil da Consultoria"
        descricao={
          query.isLoading
            ? 'Carregando o funil...'
            : `${resumoPropostas?.total ?? 0} propostas e ${resumoConsultorias?.total ?? 0} consultorias`
        }
        acao={
          <BotaoPrimario
            icone={Plus}
            onClick={naAbaPropostas ? abrirNovaProposta : () => abrirNovaConsultoria()}
          >
            {naAbaPropostas ? 'Nova proposta' : 'Nova consultoria'}
          </BotaoPrimario>
        }
      />

      {MODO_DEMO && MODO_DEMO_ATIVO() ? (
        <AvisoDiscreto tom="ambar">
          Modo demonstração: as propostas e consultorias abaixo são um recorte de exemplo,
          com clientes fictícios, e as alterações não são gravadas.
        </AvisoDiscreto>
      ) : null}

      <FaixaFunil propostas={resumoPropostas} consultorias={resumoConsultorias} />

      <AvisoConversao resumo={resumoPropostas} />

      {/* Abas dos dois estágios. A contagem é do conjunto filtrado inteiro, não da página. */}
      <div className="flex flex-wrap gap-2">
        {ABAS.map((item) => {
          const Icone = item.icone;
          const ativa = item.chave === aba;
          const total =
            item.chave === 'propostas'
              ? resumoPropostas?.total ?? 0
              : resumoConsultorias?.total ?? 0;
          return (
            <button
              key={item.chave}
              type="button"
              onClick={() => setAba(item.chave)}
              aria-pressed={ativa}
              className={[
                'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm border transition-colors',
                ativa
                  ? 'bg-[#F47920] text-white border-[#F47920] shadow-sm'
                  : 'bg-white text-slate-600 border-[#DDE3DE] hover:border-[#F47920]/50',
              ].join(' ')}
            >
              <Icone className="w-4 h-4" />
              {item.rotulo}
              <span
                className={[
                  'text-xs tabular-nums px-1.5 py-0.5 rounded-md',
                  ativa ? 'bg-white/20' : 'bg-slate-100 text-slate-500',
                ].join(' ')}
              >
                {total}
              </span>
            </button>
          );
        })}
      </div>

      {naAbaPropostas ? (
        <>
          <Cartao icone={Search} titulo="Filtros" nivelTitulo={3}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Campo
                rotulo="Buscar"
                valor={filtrosProposta.busca}
                onChange={(valor) => setFiltrosProposta((a) => ({ ...a, busca: valor }))}
                placeholder="Código, título ou cliente"
              />
              <Campo
                rotulo="Status"
                tipo="select"
                opcoes={OPCOES_PROPOSTA.map(({ valor, rotulo }) => ({ valor, rotulo }))}
                rotuloVazio="Todos"
                valor={filtrosProposta.status}
                onChange={(valor) => setFiltrosProposta((a) => ({ ...a, status: valor }))}
              />
              <Campo
                rotulo="Linha de serviço"
                tipo="select"
                /* As opções vêm do BANCO, não de uma lista fixa: a coluna é texto livre e
                   uma linha de serviço nova precisa aparecer aqui sem deploy. */
                opcoes={[
                  ...grupos.map((g) => ({ valor: g.grupo, rotulo: `${g.grupo} (${g.total})` })),
                  { valor: 'sem_grupo', rotulo: 'Sem linha declarada' },
                ]}
                rotuloVazio="Todas"
                valor={filtrosProposta.grupo_servico}
                onChange={(valor) => setFiltrosProposta((a) => ({ ...a, grupo_servico: valor }))}
              />
              <Campo
                rotulo="Situação do cadastro"
                tipo="select"
                opcoes={[
                  { valor: 'true', rotulo: 'Somente ativas' },
                  { valor: 'false', rotulo: 'Somente arquivadas' },
                ]}
                rotuloVazio="Ativas e arquivadas"
                valor={filtrosProposta.ativo}
                onChange={(valor) => setFiltrosProposta((a) => ({ ...a, ativo: valor }))}
              />
            </div>
          </Cartao>

          <Tabela
            legenda="Propostas comerciais da Consultoria, com status e desfecho"
            colunas={colunasPropostas}
            dados={propostas}
            carregando={propostasQuery.isLoading}
            rotuloCarregando="Carregando propostas"
            erro={propostasQuery.isError}
            iconeVazio={FileText}
            tituloVazio="Nenhuma proposta nesta visão"
            textoVazio="A proposta é o começo do funil: é ela que registra o que foi oferecido, a quem, e como terminou. Sem ela não há taxa de conversão nem histórico do que a APSIS já propôs."
            acaoVazio={
              <BotaoPrimario icone={Plus} onClick={abrirNovaProposta}>
                Cadastrar proposta
              </BotaoPrimario>
            }
            onLinhaClick={abrirEdicao('proposta')}
            rotuloLinha={(linha) =>
              `Editar ${linha.titulo || linha.codigo || 'proposta sem identificação'}`
            }
            classeLinha={(linha) => (linha.ativo === false ? 'opacity-60' : '')}
          />
        </>
      ) : (
        <>
          <Cartao icone={Search} titulo="Filtros" nivelTitulo={3}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Campo
                rotulo="Buscar"
                valor={filtrosConsultoria.busca}
                onChange={(valor) => setFiltrosConsultoria((a) => ({ ...a, busca: valor }))}
                placeholder="Nome ou cliente"
              />
              <Campo
                rotulo="Status"
                tipo="select"
                opcoes={OPCOES_CONSULTORIA.map(({ valor, rotulo }) => ({ valor, rotulo }))}
                rotuloVazio="Todos"
                valor={filtrosConsultoria.status}
                onChange={(valor) => setFiltrosConsultoria((a) => ({ ...a, status: valor }))}
              />
              <Campo
                rotulo="Proposta de origem"
                tipo="select"
                opcoes={[
                  { valor: 'sem_proposta', rotulo: 'Sem proposta vinculada' },
                  { valor: 'com_proposta', rotulo: 'Com proposta vinculada' },
                ]}
                rotuloVazio="Tanto faz"
                valor={filtrosConsultoria.vinculo}
                onChange={(valor) => setFiltrosConsultoria((a) => ({ ...a, vinculo: valor }))}
              />
              <Campo
                rotulo="Situação do cadastro"
                tipo="select"
                opcoes={[
                  { valor: 'true', rotulo: 'Somente ativas' },
                  { valor: 'false', rotulo: 'Somente arquivadas' },
                ]}
                rotuloVazio="Ativas e arquivadas"
                valor={filtrosConsultoria.ativo}
                onChange={(valor) => setFiltrosConsultoria((a) => ({ ...a, ativo: valor }))}
              />
            </div>
          </Cartao>

          <Tabela
            legenda="Consultorias contratadas, com andamento e prazo"
            colunas={colunasConsultorias}
            dados={consultorias}
            carregando={consultoriasQuery.isLoading}
            rotuloCarregando="Carregando consultorias"
            erro={consultoriasQuery.isError}
            iconeVazio={Briefcase}
            tituloVazio="Nenhuma consultoria nesta visão"
            textoVazio="A consultoria é a proposta ganha em execução: é aqui que o prazo passa a valer e que se sabe o que está de fato em andamento."
            acaoVazio={
              <BotaoPrimario icone={Plus} onClick={() => abrirNovaConsultoria()}>
                Cadastrar consultoria
              </BotaoPrimario>
            }
            onLinhaClick={abrirEdicao('consultoria')}
            rotuloLinha={(linha) => `Editar ${linha.nome}`}
            classeLinha={(linha) => (linha.ativo === false ? 'opacity-60' : '')}
          />

          {(resumoConsultorias?.sem_proposta ?? 0) > 0 && (
            <AvisoDiscreto tom="azul" icone={Unlink} titulo="O vínculo com a proposta está faltando.">
              {resumoConsultorias.sem_proposta} de {resumoConsultorias.total} consultorias não
              apontam para a proposta que as originou. O Notion não liga as duas bases, então
              essa ligação é reconstruída à mão, uma a uma, pelo campo Proposta de origem do
              formulário.
              Enquanto ela falta, o funil não fecha: não dá para dizer quanto do que foi
              vendido virou trabalho.
            </AvisoDiscreto>
          )}
        </>
      )}

      {/* Painel único, com o formulário do estágio que está aberto. Dois painéis
          separados dariam dois estados de abertura para sincronizar sem ganho nenhum:
          nunca faz sentido editar uma proposta e uma consultoria ao mesmo tempo. */}
      <PainelLateral
        aberto={Boolean(painel)}
        onFechar={fecharPainel}
        icone={painel?.tipo === 'consultoria' ? Briefcase : Handshake}
        titulo={
          painel?.tipo === 'consultoria'
            ? painel?.modo === 'editar'
              ? 'Editar consultoria'
              : 'Nova consultoria'
            : painel?.modo === 'editar'
              ? 'Editar proposta'
              : 'Nova proposta'
        }
        subtitulo={
          painel?.tipo === 'consultoria'
            ? 'Só o nome é obrigatório.'
            : 'Informe pelo menos código, título ou cliente.'
        }
        largura="lg"
        fecharAoClicarFora={false}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario variante="fantasma" onClick={fecharPainel}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={enviar} carregando={salvar.isPending}>
              {painel?.modo === 'editar' ? 'Salvar alterações' : 'Cadastrar'}
            </BotaoPrimario>
          </div>
        }
      >
        {painel?.tipo === 'consultoria' ? (
          <FormularioConsultoria form={form} setForm={setForm} propostas={propostas} />
        ) : (
          <div className="space-y-4">
            {/* Atalho do gesto central do funil: a proposta foi ganha e ainda não virou
                trabalho registrado. Aparece só nesse caso, porque um botão permanente
                convidaria a criar consultoria de proposta que ninguém contratou. */}
            {propostaEmEdicao?.status === 'ganha' &&
              (propostaEmEdicao?.consultorias ?? 0) === 0 && (
                <AvisoDiscreto
                  tom="verde"
                  icone={Handshake}
                  titulo="Proposta ganha e ainda sem consultoria."
                  acao={
                    <BotaoSecundario
                      tamanho="sm"
                      icone={Briefcase}
                      onClick={() => abrirNovaConsultoria(propostaEmEdicao)}
                    >
                      Registrar consultoria
                    </BotaoSecundario>
                  }
                >
                  O trabalho vendido não aparece em nenhum lugar como em execução. Registrar a
                  consultoria daqui já preenche o vínculo com esta proposta.
                </AvisoDiscreto>
              )}

            <FormularioProposta form={form} setForm={setForm} grupos={grupos} />
          </div>
        )}
      </PainelLateral>

      <p className="flex items-start gap-2 text-[11px] text-[#8A9990] px-1">
        <Info size={12} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
        Nada aqui é apagado: desmarcar a caixa de registro ativo arquiva. Proposta perdida e
        consultoria cancelada continuam contando, porque são elas que dão sentido à taxa de
        conversão - um funil que só guarda o que deu certo mostra 100% para sempre.
      </p>

      {(contagem > 0 || query.isLoading) && (
        <p className="flex items-start gap-2 text-[11px] text-[#8A9990] px-1">
          <CalendarClock size={12} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          O atraso de prazo e a data de desfecho são calculados no servidor, no fuso de
          Brasília, e nunca marcados à mão.
        </p>
      )}
    </div>
  );
}

/**
 * QuestionarioForm - preenchimento de questionário de campo, em formato de
 * celular, uma pergunta por vez.
 *
 * POR QUE ASSIM, E NÃO O FORMULÁRIO DE PÁGINA ÚNICA que havia antes. Estes
 * formulários são aplicados em aldeia, no telefone, com a pessoa entrevistada
 * esperando. Sessenta e um campos numa página rolável produzem resposta na linha
 * errada. O formato aqui é o do wizard do EPO (auditoria.html), que já resolveu
 * isto: casca de 560px centrada, cabeçalho com progresso, uma pergunta grande
 * por passo, alvos de 56px e rodapé fixo respeitando a área segura do aparelho.
 *
 * SEM O SHELL do sistema (`shell: false` no registro): no celular, a barra
 * lateral e a topbar comem um terço da tela útil. A volta é o botão do
 * cabeçalho, como no EPO.
 *
 * -----------------------------------------------------------------------------
 * O RASCUNHO, que é o coração desta tela
 * -----------------------------------------------------------------------------
 * O sinal cai no meio do preenchimento, e isso não é hipótese: é a condição
 * normal de trabalho em campo. Três decisões vêm daí:
 *
 * 1. O RASCUNHO NASCE AO ABRIR, antes da primeira resposta. Quem abriu e saiu no
 *    meio encontra o questionário na lista marcado como rascunho, em vez de
 *    descobrir que nada ficou registrado.
 *
 * 2. CADA RESPOSTA É SALVA SOZINHA, com uma espera curta depois da última tecla,
 *    e o passo também salva ao virar. Não há botão "salvar" a lembrar.
 *
 * 3. GRAVA NO APARELHO ANTES DA REDE (ver src/lib/rascunhoOffline.js). Se o
 *    envio falhar por falta de sinal, o que foi digitado continua no telefone e
 *    sai sozinho quando o sinal voltar. O cabeçalho diz em que estado está,
 *    sempre, porque em campo a pergunta é "posso fechar a tela agora?".
 *
 * CONCLUIR continua sendo um passo separado e explícito: concluído não se altera
 * nem se apaga pela tela, porque vira evidência de consulta à comunidade, que é
 * o documento que a validadora pede.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Check, CloudOff, CloudUpload, CircleCheck, Loader2, MapPin,
  MapPinOff, X,
} from 'lucide-react';
import {
  atualizarQuestionario,
  detalharQuestionario,
  listarModelosQuestionario,
} from '@/lib/api/questionarios';
import { listarProjetos, normalizarListaProjetos } from '@/lib/api/projetos';
import { montarUrl } from '@/lib/pageRoutes';
import { useSalvamentoContinuo } from '@/lib/useSalvamentoContinuo';
import { useLocalizacao } from '@/lib/useLocalizacao';
import PerguntaWizard from '@/components/PerguntaWizard';
import Campo from '@/components/ui/Campo';
import Carregando from '@/components/ui/Carregando';
import EstadoVazio from '@/components/ui/EstadoVazio';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';

const FUNCOES = [
  { valor: '', rotulo: 'Não informado' },
  { valor: 'cacique', rotulo: 'Cacique' },
  { valor: 'vice_cacique', rotulo: 'Vice-cacique' },
  { valor: 'koxoa', rotulo: 'Koxoa' },
  { valor: 'membro_comunidade', rotulo: 'Membro da comunidade' },
  { valor: 'agente_saude', rotulo: 'Agente de saúde' },
  { valor: 'professor', rotulo: 'Professor' },
  { valor: 'equipe_apsis', rotulo: 'Equipe Apsis' },
  { valor: 'outro', rotulo: 'Outro' },
];

function hojeIso() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Número digitado em pt-BR. Decide pela ESTRUTURA, igual ao servidor: com
 * vírgula, todo ponto é milhar; mais de um ponto, idem. O que não converte
 * devolve NaN, e não null, para quem chama poder recusar em vez de mandar um
 * buraco - "1.234" virando 1,234 já foi defeito real aqui.
 */
function numeroOuNulo(valor) {
  const t = String(valor ?? '').trim();
  if (!t) return null;
  const pontos = (t.match(/\./g) ?? []).length;
  let normalizado;
  if (t.includes(',')) normalizado = t.replace(/\./g, '').replace(',', '.');
  else if (pontos > 1) normalizado = t.replace(/\./g, '');
  else normalizado = t;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : NaN;
}

/** Os quatro campos que o GPS preenche, e que desligam o automatico ao serem
    editados a mao. */
const CAMPOS_DE_POSICAO = ['latitude', 'longitude', 'altitude_m', 'precisao_m'];

const ROTULO_NUMERICO = {
  latitude: 'Latitude',
  longitude: 'Longitude',
  altitude_m: 'Altitude',
  precisao_m: 'Precisão',
};

/** Uma pergunta está respondida? Lista vazia e texto em branco não contam. */
function respondida(v) {
  if (v === null || v === undefined || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/**
 * Indicador de salvamento, sempre visível no cabeçalho.
 *
 * Em campo, "posso fechar a tela agora?" é a pergunta que a pessoa faz. Um
 * indicador que só aparecesse no erro a deixaria sem resposta no caso normal,
 * que é justamente quando ela precisa da confirmação para seguir.
 */
function Situacao({ situacao }) {
  const mapa = {
    salvando: { Icone: Loader2, texto: 'Salvando', cor: 'text-[#5C7060]', girar: true },
    salvo: { Icone: CircleCheck, texto: 'Salvo', cor: 'text-[#1A4731]' },
    pendente: { Icone: CloudOff, texto: 'No aparelho', cor: 'text-[#8A6D3B]' },
    erro: { Icone: CloudUpload, texto: 'Não salvou', cor: 'text-[#C0392B]' },
  };
  const item = mapa[situacao];
  if (!item) return null;
  const { Icone, texto, cor, girar } = item;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${cor}`} role="status">
      <Icone size={13} aria-hidden="true" className={girar ? 'animate-spin' : ''} />
      {texto}
    </span>
  );
}

/**
 * O que o GPS está fazendo, dito em voz alta.
 *
 * POR QUE MOSTRAR A PRECISÃO, e não só um "localização obtida". O número é a
 * informação que decide o trabalho: o formulário da ronda registra ponto de
 * alerta de desmatamento, e uma leitura de 800 metros aponta para o lugar
 * errado da floresta. Sem o número na tela, uma estimativa de rede e uma
 * fixação de satélite parecem a mesma coisa.
 *
 * A ORIENTAÇÃO DE ESPERAR vem do formulário original, que diz por escrito
 * "aguarde até que o GPS tenha a melhor precisão possível". A tela repete isso
 * enquanto a precisão está ruim, em vez de deixar a pessoa adivinhar se vale
 * esperar mais.
 */
function PainelGps({ gps, naMao, desabilitado, aoUsar }) {
  if (desabilitado || gps.situacao === 'indisponivel') return null;

  const precisao = gps.leitura?.precisao_m;
  const boa = typeof precisao === 'number' && precisao <= 10;
  const razoavel = typeof precisao === 'number' && precisao <= 50;

  const base = 'flex items-start gap-2.5 rounded-xl px-3.5 py-3 mb-1 border';

  if (gps.situacao === 'procurando') {
    return (
      <div className={`${base} border-[#DDE3DE] bg-[#F4F6F4]`} role="status">
        <Loader2 size={15} className="text-[#5C7060] mt-0.5 flex-shrink-0 animate-spin" aria-hidden="true" />
        <p className="text-[12.5px] leading-relaxed text-[#5C7060]">
          Procurando a localização pelo GPS.
          {gps.demorando
            ? ' Está demorando. Sem sinal de internet, a primeira fixação leva um ou dois minutos. Fique a céu aberto.'
            : ' Os campos abaixo se preenchem sozinhos.'}
        </p>
      </div>
    );
  }

  if (gps.situacao === 'negada' || gps.situacao === 'erro') {
    return (
      <div className={`${base} border-[#E8D9B8] bg-[#FDF8EE]`}>
        <MapPinOff size={15} className="text-[#8A6D3B] mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-[12.5px] leading-relaxed text-[#7A6231]">{gps.mensagem}</p>
          <button
            type="button"
            onClick={gps.procurarDeNovo}
            className="mt-1.5 text-[12px] font-semibold text-[#8A6D3B] underline underline-offset-2
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D3B]/30 rounded"
          >
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  // Obtida.
  const tom = boa
    ? 'border-[#CFE0D3] bg-[#F1F7F2]'
    : razoavel
      ? 'border-[#DDE3DE] bg-[#F4F6F4]'
      : 'border-[#E8D9B8] bg-[#FDF8EE]';
  const corTexto = boa ? 'text-[#1A4731]' : razoavel ? 'text-[#5C7060]' : 'text-[#7A6231]';

  return (
    <div className={`${base} ${tom}`} role="status">
      <MapPin size={15} className={`${corTexto} mt-0.5 flex-shrink-0`} aria-hidden="true" />
      <div className="flex-1">
        <p className={`text-[12.5px] leading-relaxed ${corTexto}`}>
          <strong className="font-semibold">
            Localização obtida
            {typeof precisao === 'number' ? `, precisão de ${Math.round(precisao)} m` : ''}
            .
          </strong>{' '}
          {naMao
            ? 'Os campos abaixo estão como você digitou.'
            : boa
              ? 'Já é uma boa fixação.'
              : 'Ainda pode melhorar: espere alguns segundos a céu aberto e o número cai sozinho.'}
        </p>
        {naMao && (
          <button
            type="button"
            onClick={aoUsar}
            className="mt-1.5 text-[12px] font-semibold text-[#1A4731] underline underline-offset-2
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30 rounded"
          >
            Usar a leitura do GPS
          </button>
        )}
      </div>
    </div>
  );
}

export default function QuestionarioForm() {
  const msal = useMsal();
  const navegar = useNavigate();
  const clienteQuery = useQueryClient();
  const { tipo, id: idUrl } = useParams();

  /* O id vive em estado porque ele MUDA: a tela abre com 'novo' e, assim que o
     rascunho nasce no servidor, passa a ter id de verdade. A URL é trocada com
     replace, sem remontar o componente - remontar perderia o passo em que a
     pessoa está e o que ela acabou de digitar. */
  const [id, setId] = useState(idUrl === 'novo' ? null : idUrl);
  const [passo, setPasso] = useState(0);
  const [cabecalho, setCabecalho] = useState({
    projeto_id: '',
    aldeia: '',
    data_referencia: hojeIso(),
    entrevistado_funcao: '',
    latitude: '',
    longitude: '',
    altitude_m: '',
    precisao_m: '',
    observacoes: '',
  });
  const [respostas, setRespostas] = useState({});
  const [idCarregado, setIdCarregado] = useState(null);
  const [nascendo, setNascendo] = useState(false);

  const modelosQuery = useQuery({
    queryKey: ['carbon', 'questionarios', 'modelos'],
    queryFn: () => listarModelosQuestionario(msal),
    staleTime: 60 * 60 * 1000,
  });

  const detalheQuery = useQuery({
    queryKey: ['carbon', 'questionarios', 'detalhe', id],
    queryFn: () => detalharQuestionario(msal, id),
    enabled: Boolean(id),
  });

  /* normalizarListaProjetos DENTRO do queryFn: a chave ['carbon','projetos'] é
     compartilhada com outras telas, e todas guardam o envelope no cache. */
  const projetosQuery = useQuery({
    queryKey: ['carbon', 'projetos'],
    queryFn: async () => normalizarListaProjetos(await listarProjetos(msal)),
  });
  const projetos = projetosQuery.data?.projetos ?? [];

  const modelo = id
    ? detalheQuery.data?.modelo ?? null
    : (modelosQuery.data?.modelos ?? []).find((m) => m.chave === tipo) ?? null;

  const questionario = detalheQuery.data?.questionario ?? null;
  const concluido = questionario?.status === 'concluido';

  /** Todas as perguntas achatadas, com a seção junto. O passo 0 é a capa. */
  const perguntas = useMemo(() => {
    const saida = [];
    for (const secao of modelo?.definicao?.secoes ?? []) {
      for (const p of secao.perguntas ?? []) saida.push({ ...p, secao: secao.titulo });
    }
    return saida;
  }, [modelo]);

  const totalPassos = perguntas.length + 1;

  /** Os campos do cabeçalho já normalizados. NaN vira null aqui: a recusa com
   *  mensagem acontece em `montarPayload`, na hora de concluir. */
  const camposDoCabecalho = useCallback((c) => {
    const n = {};
    for (const campo of ['latitude', 'longitude', 'altitude_m', 'precisao_m']) {
      const v = numeroOuNulo(c[campo]);
      n[campo] = Number.isNaN(v) ? null : v;
    }
    return {
      projeto_id: c.projeto_id || null,
      aldeia: c.aldeia || null,
      data_referencia: c.data_referencia || null,
      entrevistado_funcao: c.entrevistado_funcao || null,
      observacoes: c.observacoes || null,
      ...n,
    };
  }, []);

  const montarPayload = useCallback(
    (status, dados = {}) => {
      const c = dados.cabecalho ?? cabecalho;
      const r = dados.respostas ?? respostas;

      if (status === 'concluido') {
        // Só ao CONCLUIR o número inválido vira recusa. Durante o rascunho ele
        // não pode travar o salvamento automático: perder o preenchimento por
        // causa de uma vírgula no GPS é o oposto do que esta tela existe para
        // evitar.
        for (const campo of ['latitude', 'longitude', 'altitude_m', 'precisao_m']) {
          if (Number.isNaN(numeroOuNulo(c[campo]))) {
            throw new Error(`${ROTULO_NUMERICO[campo]}: o valor digitado não é um número válido.`);
          }
        }
        const lat = numeroOuNulo(c.latitude);
        const lon = numeroOuNulo(c.longitude);
        if ((lat !== null) !== (lon !== null)) {
          throw new Error(
            lat !== null
              ? 'Falta a longitude. A coordenada só vale com os dois valores.'
              : 'Falta a latitude. A coordenada só vale com os dois valores.',
          );
        }
      }

      return {
        modelo_id: modelo?.id,
        ...camposDoCabecalho(c),
        respostas: r,
        status: status ?? 'rascunho',
      };
    },
    [cabecalho, respostas, modelo, camposDoCabecalho],
  );

  const aoNascer = useCallback(
    (novoId) => {
      setId(novoId);
      clienteQuery.invalidateQueries({ queryKey: ['carbon', 'questionarios'] });
      // replace: a URL passa a apontar o registro sem empilhar histórico, então
      // o botão voltar do aparelho sai da tela em vez de voltar para 'novo'.
      navegar(montarUrl('QuestionarioForm', { tipo, id: novoId }), { replace: true });
    },
    [clienteQuery, navegar, tipo],
  );

  const { situacao, agendar, salvarAgora } = useSalvamentoContinuo({ msal, id, aoNascer });

  /* Marca que a posicao passou a ser responsabilidade da pessoa: ou porque ela
     digitou, ou porque o rascunho ja veio do servidor com coordenada. Em ref e
     nao em estado porque ninguem re-renderiza por causa disto, e porque o
     efeito do GPS precisa ler o valor do momento em que dispara. */
  const posicaoNaMao = useRef(false);

  /* Comeca a procurar assim que a tela abre. Para sozinho quando a precisao
     fica boa, depois de tres minutos, ou quando a tela fecha - ver o cabecalho
     de useLocalizacao. Desligado no concluido: nao ha o que preencher. */
  const gps = useLocalizacao({ ligado: !concluido });

  /* O RASCUNHO NASCE AO ABRIR. Espera o modelo chegar (o servidor exige
     modelo_id) e acontece uma vez só. É o que faz o questionário aparecer na
     lista como rascunho mesmo se a pessoa sair sem responder nada. */
  useEffect(() => {
    if (id || !modelo?.id || nascendo) return;
    setNascendo(true);
    salvarAgora({
      modelo_id: modelo.id,
      data_referencia: hojeIso(),
      respostas: {},
      status: 'rascunho',
    }).catch(() => { /* falha de rede já virou pendência dentro do gancho */ });
  }, [id, modelo?.id, nascendo, salvarAgora]);

  /* Carrega o servidor para a tela UMA vez por registro: sem esta guarda, o
     refetch em segundo plano apagaria o que está sendo digitado. */
  useEffect(() => {
    if (!questionario?.id || idCarregado === questionario.id) return;
    setIdCarregado(questionario.id);
    setCabecalho({
      projeto_id: questionario.projeto_id ?? '',
      aldeia: questionario.aldeia ?? '',
      data_referencia: questionario.data_referencia ?? '',
      entrevistado_funcao: questionario.entrevistado_funcao ?? '',
      latitude: questionario.latitude ?? '',
      longitude: questionario.longitude ?? '',
      altitude_m: questionario.altitude_m ?? '',
      precisao_m: questionario.precisao_m ?? '',
      observacoes: questionario.observacoes ?? '',
    });
    /* Rascunho que ja tem coordenada gravada foi decidido por alguem, em algum
       momento, possivelmente no ponto certo. O GPS de agora - que pode ser o
       acampamento, horas depois - nao passa por cima disso. */
    if (questionario.latitude !== null && questionario.latitude !== undefined) {
      posicaoNaMao.current = true;
    }
    setRespostas(questionario.respostas ?? {});
  }, [questionario, idCarregado]);

  const alterarCabecalho = (campo) => (valor) => {
    // Mexer num dos quatro campos de posição desliga o preenchimento automático
    // pelo GPS: a partir daí o número na tela é o que a pessoa decidiu, e uma
    // leitura melhor chegando depois não pode trocá-lo por baixo da mão dela.
    if (CAMPOS_DE_POSICAO.includes(campo)) posicaoNaMao.current = true;
    const novo = { ...cabecalho, [campo]: valor };
    setCabecalho(novo);
    if (!concluido && id) agendar(montarPayload('rascunho', { cabecalho: novo }));
  };

  /** Escreve a leitura do GPS nos quatro campos de uma vez. */
  const aplicarLeitura = useCallback(
    (l, { porOrdemDaPessoa = false } = {}) => {
      if (!l) return;
      if (porOrdemDaPessoa) posicaoNaMao.current = false;
      setCabecalho((atual) => {
        const novo = {
          ...atual,
          latitude: String(l.latitude),
          longitude: String(l.longitude),
          altitude_m: l.altitude_m === null ? '' : String(Math.round(l.altitude_m)),
          precisao_m: l.precisao_m === null ? '' : String(Math.round(l.precisao_m)),
        };
        if (!concluido && id) agendar(montarPayload('rascunho', { cabecalho: novo }));
        return novo;
      });
    },
    [agendar, concluido, id, montarPayload],
  );

  /*
   * A POSIÇÃO ENTRA SOZINHA enquanto a pessoa não mexeu nos campos.
   *
   * O gancho entrega a MELHOR leitura vista até agora, e ela melhora com o
   * tempo: começa em centenas de metros pela rede e cai para poucos metros
   * quando o GPS fixa. Por isso este efeito reescreve a cada melhora, em vez de
   * gravar a primeira e parar - a primeira é justamente a pior.
   *
   * Some no instante em que alguém digita: ver `posicaoNaMao` acima.
   */
  useEffect(() => {
    if (concluido || posicaoNaMao.current || !gps.leitura) return;
    aplicarLeitura(gps.leitura);
  }, [gps.leitura, concluido, aplicarLeitura]);

  const alterarResposta = (chave, valor) => {
    const novas = { ...respostas, [chave]: valor };
    setRespostas(novas);
    if (!concluido && id) agendar(montarPayload('rascunho', { respostas: novas }));
  };

  const concluir = useMutation({
    mutationFn: () => atualizarQuestionario(msal, id, montarPayload('concluido')),
    onSuccess: () => {
      clienteQuery.invalidateQueries({ queryKey: ['carbon', 'questionarios'] });
      toast.success('Questionário concluído.');
      navegar(montarUrl('QuestionarioLista', { tipo }));
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível concluir.'),
  });

  const sair = () => navegar(montarUrl('QuestionarioLista', { tipo }));

  const irPara = async (novo) => {
    // Salva ao virar o passo, sem esperar a espera curta: trocar de tela é o
    // momento em que a pessoa pode largar o aparelho.
    if (!concluido && id) {
      try { await salvarAgora(montarPayload('rascunho')); } catch { /* já tratado */ }
    }
    setPasso(novo);
    window.scrollTo({ top: 0 });
  };

  /* ===== Estados de borda ================================================ */

  if (modelosQuery.isLoading || (id && detalheQuery.isLoading)) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-white">
        <Carregando rotulo="Abrindo o questionário" />
      </div>
    );
  }

  if (!modelo) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-white p-6">
        <EstadoVazio
          titulo="Formulário não encontrado"
          texto={`Não existe questionário com a chave "${tipo}".`}
          acao={
            <button type="button" onClick={sair} className="text-sm text-[#F47920] underline">
              Voltar
            </button>
          }
        />
      </div>
    );
  }

  const respondidas = perguntas.filter((p) => respondida(respostas[p.chave])).length;
  const progresso = Math.round((passo / Math.max(1, totalPassos - 1)) * 100);
  const naCapa = passo === 0;
  const perguntaAtual = naCapa ? null : perguntas[passo - 1];
  const ultimo = passo === totalPassos - 1;

  const faltamObrigatorias = perguntas
    .filter((p) => p.obrigatoria && !respondida(respostas[p.chave]))
    .map((p) => p.rotulo);

  return (
    <div className="min-h-[100dvh] flex flex-col max-w-[560px] mx-auto bg-white relative">
      {/* ===== Cabeçalho: sair, progresso, contador ===== */}
      <header className="flex items-center gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2.5 flex-shrink-0">
        <button
          type="button"
          onClick={sair}
          aria-label="Sair do questionário"
          className="w-9 h-9 flex-shrink-0 rounded-full bg-[#F4F6F4] text-[#5C7060] grid place-items-center
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="flex-1 h-1.5 rounded-full bg-[#F4F6F4] overflow-hidden">
          <div
            className="h-full bg-[#1A4731] rounded-full transition-[width] duration-200"
            style={{ width: `${progresso}%` }}
            role="progressbar"
            aria-valuenow={passo}
            aria-valuemin={0}
            aria-valuemax={totalPassos - 1}
            aria-label="Progresso do questionário"
          />
        </div>

        <span className="flex-shrink-0 min-w-[42px] text-right text-[12px] text-[#5C7060] tabular-nums">
          {passo}/{totalPassos - 1}
        </span>
      </header>

      <div className="px-4 pb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] text-[#8A9990] truncate">{modelo.nome}</span>
        <Situacao situacao={situacao} />
      </div>

      {/* ===== Corpo ===== */}
      <main className="flex-1 overflow-y-auto px-5 pt-2.5 pb-7">
        {concluido && (
          <AvisoDiscreto tom="verde" className="mb-4">
            Concluído. Este questionário não aceita mais alteração: ele é evidência de campo.
          </AvisoDiscreto>
        )}

        {situacao === 'pendente' && (
          <AvisoDiscreto tom="ambar" className="mb-4">
            Sem conexão agora. O que você respondeu está guardado no aparelho e será enviado
            sozinho quando o sinal voltar. Pode continuar preenchendo.
          </AvisoDiscreto>
        )}

        {naCapa ? (
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#F47920] mb-2">
              Identificação
            </p>
            <h2 className="text-[21px] font-bold leading-[1.32] text-[#1A2B1F] mb-1">
              {modelo.nome}
            </h2>
            <p className="text-[13px] text-[#5C7060] leading-relaxed mb-5">
              {perguntas.length} perguntas. Cada resposta é salva sozinha, e o rascunho fica
              guardado no aparelho mesmo sem sinal.
            </p>

            <div className="flex flex-col gap-4">
              <Campo
                rotulo="Aldeia"
                tipo="texto"
                valor={cabecalho.aldeia}
                onChange={alterarCabecalho('aldeia')}
                desabilitado={concluido}
              />
              <Campo
                rotulo="Data da aplicação"
                tipo="data"
                valor={cabecalho.data_referencia}
                onChange={alterarCabecalho('data_referencia')}
                desabilitado={concluido}
              />
              <Campo
                rotulo="Função do entrevistado"
                tipo="select"
                opcoes={FUNCOES}
                valor={cabecalho.entrevistado_funcao}
                onChange={alterarCabecalho('entrevistado_funcao')}
                desabilitado={concluido}
                dica="A função, não o nome. O sistema não guarda nome de pessoa entrevistada."
              />
              <Campo
                rotulo="Projeto"
                tipo="select"
                opcoes={[
                  { valor: '', rotulo: 'Sem projeto' },
                  ...projetos.map((p) => ({ valor: p.id, rotulo: p.nome })),
                ]}
                valor={cabecalho.projeto_id}
                onChange={alterarCabecalho('projeto_id')}
                desabilitado={concluido}
              />

              <PainelGps
                gps={gps}
                naMao={posicaoNaMao.current}
                desabilitado={concluido}
                aoUsar={() => aplicarLeitura(gps.leitura, { porOrdemDaPessoa: true })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Campo
                  rotulo="Latitude"
                  tipo="decimal"
                  valor={cabecalho.latitude}
                  onChange={alterarCabecalho('latitude')}
                  desabilitado={concluido}
                  placeholder="-4.7312"
                  extras={{ inputMode: 'text' }}
                />
                <Campo
                  rotulo="Longitude"
                  tipo="decimal"
                  valor={cabecalho.longitude}
                  onChange={alterarCabecalho('longitude')}
                  desabilitado={concluido}
                  placeholder="-49.9418"
                  extras={{ inputMode: 'text' }}
                />
              </div>

              {/*
                * ALTITUDE E PRECISÃO só aparecem depois que uma coordenada
                * começa a ser preenchida. Sem coordenada elas não querem dizer
                * nada, e três dos quatro formulários nunca as usam - a capa
                * ficaria com dois campos mortos em cima de quem só quer
                * responder sobre a escola da aldeia.
                *
                * Elas EXISTIAM no payload, na tabela e no validador desde o
                * começo, e não existiam na tela: chegavam sempre nulas. Quem
                * percebeu foi a conferência contra o formulário original da
                * ronda, que captura `accuracy (m)` e manda esperar o GPS
                * estabilizar. Sem a precisão registrada, não se distingue uma
                * fixação de 5 metros de uma de 200 num ponto de alerta de
                * desmatamento, e é essa distinção que decide se vale mandar
                * equipe ao local.
                */}
              {(String(cabecalho.latitude).trim() !== '' ||
                String(cabecalho.longitude).trim() !== '') && (
                <div className="grid grid-cols-2 gap-3">
                  <Campo
                    rotulo="Altitude (m)"
                    tipo="decimal"
                    valor={cabecalho.altitude_m}
                    onChange={alterarCabecalho('altitude_m')}
                    desabilitado={concluido}
                    placeholder="180"
                    extras={{ inputMode: 'text' }}
                  />
                  <Campo
                    rotulo="Precisão do GPS (m)"
                    tipo="decimal"
                    valor={cabecalho.precisao_m}
                    onChange={alterarCabecalho('precisao_m')}
                    desabilitado={concluido}
                    placeholder="5"
                    dica="O que o aparelho informa como margem de erro. Espere o número baixar antes de anotar."
                    extras={{ inputMode: 'text' }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <PerguntaWizard
            pergunta={perguntaAtual}
            secao={perguntaAtual.secao}
            valor={respostas[perguntaAtual.chave]}
            aoMudar={(v) => alterarResposta(perguntaAtual.chave, v)}
            desabilitado={concluido}
          />
        )}

        {ultimo && !concluido && (
          <div className="mt-7 pt-5 border-t border-[#F4F6F4]">
            <p className="text-[13px] text-[#5C7060] mb-3">
              {respondidas} de {perguntas.length} perguntas respondidas.
            </p>
            {faltamObrigatorias.length > 0 && (
              <AvisoDiscreto tom="ambar">
                Falta responder: {faltamObrigatorias.join(', ')}. O rascunho continua salvo;
                concluir exige essas respostas.
              </AvisoDiscreto>
            )}
          </div>
        )}
      </main>

      {/* ===== Rodapé fixo ===== */}
      <footer
        className="flex gap-2.5 flex-shrink-0 px-4 py-3 pb-[max(14px,env(safe-area-inset-bottom))]
          border-t border-[#EEF2F0] bg-white sticky bottom-0"
      >
        <button
          type="button"
          onClick={() => irPara(passo - 1)}
          disabled={passo === 0}
          className="flex items-center justify-center gap-1.5 h-[50px] px-5 rounded-xl border border-[#DDE3DE]
            text-[15px] font-semibold text-[#1A2B1F] bg-white disabled:opacity-40
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Voltar
        </button>

        {ultimo ? (
          <button
            type="button"
            onClick={() => {
              if (concluido) return sair();
              if (window.confirm('Concluir o questionário? Depois disso ele não pode mais ser alterado nem apagado pela tela.')) {
                concluir.mutate();
              }
              return undefined;
            }}
            disabled={concluir.isPending}
            className="flex-1 flex items-center justify-center gap-2 h-[50px] rounded-xl bg-[#1A4731]
              text-[15px] font-semibold text-white disabled:opacity-60
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30"
          >
            {concluir.isPending ? (
              <Loader2 size={17} className="animate-spin" aria-hidden="true" />
            ) : (
              <Check size={17} aria-hidden="true" />
            )}
            {concluido ? 'Fechar' : 'Concluir'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => irPara(passo + 1)}
            className="flex-1 flex items-center justify-center gap-2 h-[50px] rounded-xl bg-[#1A4731]
              text-[15px] font-semibold text-white
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30"
          >
            {naCapa ? 'Começar' : 'Próxima'}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        )}
      </footer>
    </div>
  );
}

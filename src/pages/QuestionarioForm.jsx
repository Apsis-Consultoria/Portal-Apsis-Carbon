/**
 * QuestionarioForm - preenche ou revê um questionário de campo.
 *
 * A mesma tela serve para os quatro formulários e para os dois momentos: `id`
 * igual a 'novo' cria, qualquer outro abre o que existe. O formulário em si é
 * desenhado por CamposQuestionario a partir da definição que veio do servidor.
 *
 * DUAS DECISÕES QUE VÊM DE COMO ESTA TELA É USADA DE VERDADE.
 *
 * 1. RASCUNHO ACEITA INCOMPLETO. O formulário mais longo tem 61 perguntas e é
 *    aplicado em campo, com a pessoa entrevistada esperando. Recusar o salvamento
 *    por um campo em branco faria perder o resto do preenchimento, que é o
 *    defeito mais caro que esta tela pode ter. Obrigatório só vale ao concluir.
 *
 * 2. CONCLUIR É UM BOTÃO SEPARADO de salvar, e não uma caixa de seleção perdida
 *    no meio. Concluído não se apaga pela tela (o servidor recusa com 409): ele
 *    vira evidência de campo, e em projeto de carbono é o tipo de documento que
 *    a VVB pede. Uma ação com esse peso não pode ser um clique distraído.
 *
 * LGPD: não há campo de nome em lugar nenhum. Quem preencheu é quem está logado,
 * resolvido pelo servidor, e o entrevistado entra pela FUNÇÃO. Se o servidor
 * recusar uma resposta por dado pessoal, a tela rola até o campo e o destaca em
 * vez de mostrar só um aviso genérico.
 */

import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Check, Save, Trash2, WifiOff } from 'lucide-react';
import {
  atualizarQuestionario,
  criarQuestionario,
  detalharQuestionario,
  listarModelosQuestionario,
  removerQuestionario,
} from '@/lib/api/questionarios';
import { listarProjetos, normalizarListaProjetos } from '@/lib/api/projetos';
import { montarUrl } from '@/lib/pageRoutes';
import CamposQuestionario from '@/components/CamposQuestionario';
import Cartao from '@/components/ui/Cartao';
import CabecalhoSecao from '@/components/ui/CabecalhoSecao';
import Campo from '@/components/ui/Campo';
import Badge from '@/components/ui/Badge';
import Carregando from '@/components/ui/Carregando';
import EstadoVazio from '@/components/ui/EstadoVazio';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';

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
 * Número digitado em pt-BR. Vazio vira null, e não zero.
 *
 * A primeira versão fazia `Number(t.replace(',', '.'))` e tinha DOIS defeitos,
 * os dois silenciosos:
 *
 * 1. ERRAVA A ESCALA EM MIL VEZES. "1.234" (mil duzentos e trinta e quatro,
 *    com ponto de milhar) virava 1.234. Num campo de altitude ou de área isso
 *    grava um número mil vezes menor sem nada acusar.
 * 2. DESCARTAVA EM SILÊNCIO o que não soubesse converter: "-60.67.2", um erro
 *    de digitação de coordenada, virava null. O campo ficava em branco, o par
 *    de coordenada quebrava lá no servidor e a mensagem falava de outra coisa.
 *
 * Agora decide pela ESTRUTURA, com a mesma regra do servidor (ver lerNumero em
 * helpers.ts): com vírgula, todo ponto é milhar; mais de um ponto, idem; um
 * ponto só e sem vírgula é decimal. E o que não converte devolve NaN em vez de
 * null, para quem chama poder recusar em vez de mandar um buraco.
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

/** Rótulo dos campos numéricos do cabeçalho, para a mensagem dizer qual é. */
const ROTULO_NUMERICO = {
  latitude: 'Latitude',
  longitude: 'Longitude',
  altitude_m: 'Altitude',
  precisao_m: 'Precisão',
};

export default function QuestionarioForm() {
  const msal = useMsal();
  const navegar = useNavigate();
  const clienteQuery = useQueryClient();
  const { tipo, id } = useParams();

  const criando = id === 'novo';

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
  const [chaveComErro, setChaveComErro] = useState(null);

  const modelosQuery = useQuery({
    queryKey: ['carbon', 'questionarios', 'modelos'],
    queryFn: () => listarModelosQuestionario(msal),
    staleTime: 60 * 60 * 1000,
  });

  const detalheQuery = useQuery({
    queryKey: ['carbon', 'questionarios', 'detalhe', id],
    queryFn: () => detalharQuestionario(msal, id),
    enabled: !criando && Boolean(id),
  });

  /* normalizarListaProjetos DENTRO do queryFn, e nao depois: a chave
     ['carbon', 'projetos'] e compartilhada com Reunioes, Atividades e Contratos,
     e todas elas guardam o ENVELOPE { projetos, podeCriar } no cache. Normalizar
     so aqui fora deixaria o cache com dois formatos diferentes conforme a tela
     que carregasse primeiro. */
  const projetosQuery = useQuery({
    queryKey: ['carbon', 'projetos'],
    queryFn: async () => normalizarListaProjetos(await listarProjetos(msal)),
  });

  /* Ao CRIAR, o modelo vem da chave da URL. Ao EDITAR, vem junto do detalhe, e
     é ele que manda: o preenchimento guarda a versão em que foi respondido, e a
     definição atual do modelo pode já ter mudado. */
  const modelo = criando
    ? (modelosQuery.data?.modelos ?? []).find((m) => m.chave === tipo) ?? null
    : detalheQuery.data?.modelo ?? null;

  const questionario = detalheQuery.data?.questionario ?? null;
  const concluido = questionario?.status === 'concluido';
  const podeEscrever = criando
    ? true
    : detalheQuery.data?.pode_escrever === true;
  const somenteLeitura = concluido || !podeEscrever;

  /* `.projetos` do envelope, e nao o envelope inteiro. Foi exatamente aqui que
     a tela quebrava: normalizarListaProjetos devolve { projetos, podeCriar }, e
     tratar isso como lista fazia `projetos.map` estourar no render - ou seja, a
     tela de criar questionario morria ao ABRIR, antes de qualquer salvamento. */
  const projetos = projetosQuery.data?.projetos ?? [];

  /* Carrega o que veio do servidor para o estado local UMA vez, quando o
     detalhe chega. Sem a guarda de `questionario?.id`, cada refetch em segundo
     plano apagaria o que a pessoa está digitando. */
  const [idCarregado, setIdCarregado] = useState(null);

  useEffect(() => {
    if (!questionario?.id) return;
    /* Carrega UMA vez por registro. Sem esta guarda, o refetch que acontece
       logo depois de criar (a URL muda para a do registro e o detalhe é
       buscado) sobrescrevia o que a pessoa continuou digitando enquanto o POST
       viajava. Com ela, o servidor só popula a tela ao ABRIR um questionário. */
    if (idCarregado === questionario.id) return;
    setIdCarregado(questionario.id);

    setCabecalho({
      projeto_id: questionario.projeto_id ?? '',
      aldeia: questionario.aldeia ?? '',
      // Vazio continua vazio: trocar por hoje faria um questionário salvo sem
      // data ganhar a data em que alguém o reabriu, e isso é dado inventado
      // num registro de campo que vira evidência de auditoria.
      data_referencia: questionario.data_referencia ?? '',
      entrevistado_funcao: questionario.entrevistado_funcao ?? '',
      latitude: questionario.latitude ?? '',
      longitude: questionario.longitude ?? '',
      altitude_m: questionario.altitude_m ?? '',
      precisao_m: questionario.precisao_m ?? '',
      observacoes: questionario.observacoes ?? '',
    });
    setRespostas(questionario.respostas ?? {});
  }, [questionario?.id, idCarregado]);

  const alterarCabecalho = (campo) => (valor) =>
    setCabecalho((a) => ({ ...a, [campo]: valor }));

  const alterarResposta = (chave, valor) => {
    setRespostas((a) => ({ ...a, [chave]: valor }));
    if (chaveComErro === chave) setChaveComErro(null);
  };

  /**
   * Monta o corpo, ou lança com a mensagem pronta para o toast.
   *
   * Recusa AQUI o que o servidor recusaria depois, por dois motivos: a mensagem
   * daqui sabe o rótulo do campo ("Latitude"), e a do servidor volta como
   * `campo_invalido` sem contexto; e uma coordenada pela metade só é detectada
   * pelo CHECK do banco, que devolve um 400 genérico.
   */
  function montarPayload(status) {
    const numeros = {};
    for (const campo of ['latitude', 'longitude', 'altitude_m', 'precisao_m']) {
      const n = numeroOuNulo(cabecalho[campo]);
      if (Number.isNaN(n)) {
        throw new Error(`${ROTULO_NUMERICO[campo]}: o valor digitado não é um número válido.`);
      }
      numeros[campo] = n;
    }

    // O par de coordenada: meia coordenada não localiza nada, e o servidor a
    // recusaria sem dizer qual metade falta.
    const temLat = numeros.latitude !== null;
    const temLon = numeros.longitude !== null;
    if (temLat !== temLon) {
      throw new Error(
        temLat
          ? 'Falta a longitude. A coordenada só vale com os dois valores.'
          : 'Falta a latitude. A coordenada só vale com os dois valores.',
      );
    }

    return {
      projeto_id: cabecalho.projeto_id || null,
      aldeia: cabecalho.aldeia || null,
      data_referencia: cabecalho.data_referencia || null,
      entrevistado_funcao: cabecalho.entrevistado_funcao || null,
      latitude: numeros.latitude,
      longitude: numeros.longitude,
      altitude_m: numeros.altitude_m,
      precisao_m: numeros.precisao_m,
      observacoes: cabecalho.observacoes || null,
      respostas,
      status,
    };
  }

  const salvar = useMutation({
    mutationFn: ({ status }) => {
      // montarPayload lança com a mensagem pronta quando o cabeçalho está
      // inconsistente. Cai no onError abaixo, como qualquer recusa do servidor.
      const payload = montarPayload(status);
      if (criando) return criarQuestionario(msal, { ...payload, modelo_id: modelo.id });
      return atualizarQuestionario(msal, id, payload);
    },
    onSuccess: (dados, variaveis) => {
      clienteQuery.invalidateQueries({ queryKey: ['carbon', 'questionarios'] });
      setChaveComErro(null);
      toast.success(
        variaveis.status === 'concluido'
          ? 'Questionário concluído.'
          : 'Rascunho salvo.',
      );
      const novoId = dados?.questionario?.id;
      if (criando && novoId) {
        // Substitui a URL 'novo' pela do registro: recarregar a página depois de
        // criar não pode abrir um formulário em branco por cima do que foi salvo.
        navegar(montarUrl('QuestionarioForm', { tipo, id: novoId }), { replace: true });
      }
    },
    onError: (erro) => {
      /* `detalhe` carrega a chave da pergunta que o servidor recusou. Usar isso
         para rolar até o campo é a diferença entre "algo deu errado" e "está
         faltando esta resposta aqui" - num formulário de 61 perguntas, a
         primeira mensagem é inútil. */
      const chave = erro?.detalhe;
      if (chave) {
        setChaveComErro(chave);
        /* Duas ancoras, porque o servidor recusa dois tipos de campo. Uma chave
           de PERGUNTA vira `pergunta-<chave>`; um campo do CABECALHO (latitude,
           aldeia, entrevistado_funcao) vira `cabecalho-<chave>`. Antes só a
           primeira existia, então um 400 em latitude não destacava nada e a
           pessoa via um toast sobre um campo que não sabia localizar. */
        const alvo =
          document.getElementById(`pergunta-${chave}`) ??
          document.getElementById(`cabecalho-${chave}`);
        if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast.error(erro?.message ?? 'Não foi possível salvar o questionário.');
    },
  });

  const apagar = useMutation({
    mutationFn: () => removerQuestionario(msal, id),
    onSuccess: () => {
      clienteQuery.invalidateQueries({ queryKey: ['carbon', 'questionarios'] });
      toast.success('Rascunho apagado.');
      navegar(montarUrl('QuestionarioLista', { tipo }));
    },
    onError: (erro) => toast.error(erro?.message ?? 'Não foi possível apagar.'),
  });

  const voltar = (
    <Link
      to={montarUrl('QuestionarioLista', { tipo })}
      className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#F47920] transition-colors"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      {modelo?.nome ?? 'Questionários'}
    </Link>
  );

  const carregando = modelosQuery.isLoading || (!criando && detalheQuery.isLoading);

  if (carregando) {
    return (
      <div className="p-6 space-y-4">
        {voltar}
        <Carregando rotulo="Carregando o questionário" />
      </div>
    );
  }

  if (!criando && detalheQuery.isError) {
    return (
      <div className="p-6 space-y-4">
        {voltar}
        <EstadoVazio
          icone={WifiOff}
          titulo="Não foi possível abrir este questionário"
          texto={detalheQuery.error?.message ?? 'Verifique a conexão e tente novamente.'}
          comSuperficie
        />
      </div>
    );
  }

  if (!modelo) {
    return (
      <div className="p-6 space-y-4">
        {voltar}
        <EstadoVazio
          titulo="Formulário não encontrado"
          texto={`Não existe questionário com a chave "${tipo}".`}
          comSuperficie
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {voltar}
        <div className="flex flex-wrap items-center gap-2">
          {!criando && (
            <Badge tom={concluido ? 'verde' : 'ambar'} tamanho="sm">
              {concluido ? 'Concluído' : 'Rascunho'}
            </Badge>
          )}
          {!criando && !concluido && podeEscrever && (
            <BotaoSecundario
              variante="fantasma"
              tamanho="sm"
              icone={Trash2}
              carregando={apagar.isPending}
              onClick={() => {
                if (window.confirm('Apagar este rascunho? As respostas preenchidas somem.')) {
                  apagar.mutate();
                }
              }}
            >
              Apagar rascunho
            </BotaoSecundario>
          )}
        </div>
      </div>

      {concluido && (
        <AvisoDiscreto tom="verde">
          Este questionário está concluído e não aceita mais alteração. Ele é evidência de campo:
          em auditoria, registro de consulta à comunidade é justamente o documento que a
          validadora pede.
        </AvisoDiscreto>
      )}

      {!concluido && !podeEscrever && (
        <AvisoDiscreto tom="ambar">
          Você pode ler este questionário, mas não alterá-lo. A escrita depende do papel de
          administrador ou gestor.
        </AvisoDiscreto>
      )}

      {/* ===== Cabeçalho =====
          `classeCorpo` e não `className`: o Cartao põe os filhos num corpo
          interno com padding próprio, então espaçamento posto no invólucro não
          alcança o conteúdo. */}
      <Cartao classeCorpo="space-y-4">
        <CabecalhoSecao
          titulo="Identificação"
          descricao="Onde e quando o formulário foi aplicado. Quem preencheu sai do seu login, e não é digitado aqui."
          nivel={3}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo
            rotulo="Aldeia"
            tipo="texto"
            valor={cabecalho.aldeia}
            onChange={alterarCabecalho('aldeia')}
            desabilitado={somenteLeitura}
          />
          <Campo
            rotulo="Data da aplicação"
            tipo="data"
            valor={cabecalho.data_referencia}
            onChange={alterarCabecalho('data_referencia')}
            desabilitado={somenteLeitura}
          />
          <Campo
            rotulo="Função do entrevistado"
            tipo="select"
            opcoes={FUNCOES}
            valor={cabecalho.entrevistado_funcao}
            onChange={alterarCabecalho('entrevistado_funcao')}
            desabilitado={somenteLeitura}
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
            desabilitado={somenteLeitura}
          />
        </div>

        {/* Cada campo numérico ganha uma âncora `cabecalho-<campo>`: é por ela
            que o onError rola até o campo que o servidor recusou. O anel
            vermelho usa a mesma chave que o destaque das perguntas. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            /* `sinal: true` troca o teclado do celular para o completo. O
               inputMode 'decimal' abre um teclado SEM tecla de menos, e a
               coordenada brasileira é negativa: no telefone, que é onde o
               formulário é preenchido em campo, ela ficava indigitável.
               Precisão é distância e nunca é negativa, então fica no teclado
               numérico, que é mais rápido. */
            { campo: 'latitude', rotulo: 'Latitude', placeholder: '-4.7312', sinal: true },
            { campo: 'longitude', rotulo: 'Longitude', placeholder: '-49.9418', sinal: true },
            { campo: 'altitude_m', rotulo: 'Altitude (m)', sinal: true },
            { campo: 'precisao_m', rotulo: 'Precisão (m)' },
          ].map(({ campo, rotulo, placeholder, sinal }) => (
            <div
              key={campo}
              id={`cabecalho-${campo}`}
              className={chaveComErro === campo ? 'rounded-xl ring-2 ring-[#C0392B]/40 p-2 -m-2' : ''}
            >
              <Campo
                rotulo={rotulo}
                tipo="decimal"
                valor={cabecalho[campo]}
                onChange={alterarCabecalho(campo)}
                desabilitado={somenteLeitura}
                placeholder={placeholder}
                extras={sinal ? { inputMode: 'text' } : undefined}
              />
            </div>
          ))}
        </div>
      </Cartao>

      {/* ===== Perguntas ===== */}
      <Cartao>
        <CamposQuestionario
          definicao={modelo.definicao}
          valores={respostas}
          aoMudar={alterarResposta}
          desabilitado={somenteLeitura}
          chaveComErro={chaveComErro}
        />
      </Cartao>

      <Cartao>
        <Campo
          rotulo="Observações gerais"
          tipo="textarea"
          linhas={3}
          valor={cabecalho.observacoes}
          onChange={alterarCabecalho('observacoes')}
          desabilitado={somenteLeitura}
          dica="Contexto da visita que não cabe nas perguntas."
        />
      </Cartao>

      {!somenteLeitura && (
        <div className="flex flex-wrap items-center justify-end gap-2 pb-2">
          {/* Os DOIS botões travam enquanto QUALQUER um salva, e não só o que
              foi clicado. Com a trava por botão, clicar em "Salvar rascunho" e
              logo em "Concluir" durante a criação disparava dois POST: o
              primeiro ainda não tinha voltado, `criando` continuava true, e
              nasciam DOIS questionários - um rascunho órfão e um concluído,
              que nem dá para apagar pela tela. */}
          <BotaoSecundario
            icone={Save}
            carregando={salvar.isPending && salvar.variables?.status === 'rascunho'}
            desabilitado={salvar.isPending}
            onClick={() => salvar.mutate({ status: 'rascunho' })}
          >
            Salvar rascunho
          </BotaoSecundario>
          <BotaoPrimario
            icone={Check}
            carregando={salvar.isPending && salvar.variables?.status === 'concluido'}
            desabilitado={salvar.isPending}
            onClick={() => {
              if (window.confirm('Concluir o questionário? Depois disso ele não pode mais ser alterado nem apagado pela tela.')) {
                salvar.mutate({ status: 'concluido' });
              }
            }}
          >
            Concluir
          </BotaoPrimario>
        </div>
      )}
    </div>
  );
}

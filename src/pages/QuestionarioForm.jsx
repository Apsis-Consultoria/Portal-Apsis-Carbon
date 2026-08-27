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

import { useEffect, useMemo, useState } from 'react';
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

/** Número em pt-BR: vazio vira null, e não zero. */
function numeroOuNulo(valor) {
  const t = String(valor ?? '').trim();
  if (!t) return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

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

  const projetosQuery = useQuery({
    queryKey: ['carbon', 'projetos'],
    queryFn: () => listarProjetos(msal),
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

  const projetos = useMemo(
    () => normalizarListaProjetos(projetosQuery.data),
    [projetosQuery.data],
  );

  /* Carrega o que veio do servidor para o estado local UMA vez, quando o
     detalhe chega. Sem a guarda de `questionario?.id`, cada refetch em segundo
     plano apagaria o que a pessoa está digitando. */
  useEffect(() => {
    if (!questionario?.id) return;
    setCabecalho({
      projeto_id: questionario.projeto_id ?? '',
      aldeia: questionario.aldeia ?? '',
      data_referencia: questionario.data_referencia ?? hojeIso(),
      entrevistado_funcao: questionario.entrevistado_funcao ?? '',
      latitude: questionario.latitude ?? '',
      longitude: questionario.longitude ?? '',
      altitude_m: questionario.altitude_m ?? '',
      precisao_m: questionario.precisao_m ?? '',
      observacoes: questionario.observacoes ?? '',
    });
    setRespostas(questionario.respostas ?? {});
  }, [questionario?.id]);

  const alterarCabecalho = (campo) => (valor) =>
    setCabecalho((a) => ({ ...a, [campo]: valor }));

  const alterarResposta = (chave, valor) => {
    setRespostas((a) => ({ ...a, [chave]: valor }));
    if (chaveComErro === chave) setChaveComErro(null);
  };

  function montarPayload(status) {
    return {
      projeto_id: cabecalho.projeto_id || null,
      aldeia: cabecalho.aldeia || null,
      data_referencia: cabecalho.data_referencia || null,
      entrevistado_funcao: cabecalho.entrevistado_funcao || null,
      latitude: numeroOuNulo(cabecalho.latitude),
      longitude: numeroOuNulo(cabecalho.longitude),
      altitude_m: numeroOuNulo(cabecalho.altitude_m),
      precisao_m: numeroOuNulo(cabecalho.precisao_m),
      observacoes: cabecalho.observacoes || null,
      respostas,
      status,
    };
  }

  const salvar = useMutation({
    mutationFn: ({ status }) => {
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
        const alvo = document.getElementById(`pergunta-${chave}`);
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Campo rotulo="Latitude" tipo="decimal" valor={cabecalho.latitude} onChange={alterarCabecalho('latitude')} desabilitado={somenteLeitura} placeholder="-4.7312" />
          <Campo rotulo="Longitude" tipo="decimal" valor={cabecalho.longitude} onChange={alterarCabecalho('longitude')} desabilitado={somenteLeitura} placeholder="-49.9418" />
          <Campo rotulo="Altitude (m)" tipo="decimal" valor={cabecalho.altitude_m} onChange={alterarCabecalho('altitude_m')} desabilitado={somenteLeitura} />
          <Campo rotulo="Precisão (m)" tipo="decimal" valor={cabecalho.precisao_m} onChange={alterarCabecalho('precisao_m')} desabilitado={somenteLeitura} />
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
          <BotaoSecundario
            icone={Save}
            carregando={salvar.isPending && salvar.variables?.status === 'rascunho'}
            onClick={() => salvar.mutate({ status: 'rascunho' })}
          >
            Salvar rascunho
          </BotaoSecundario>
          <BotaoPrimario
            icone={Check}
            carregando={salvar.isPending && salvar.variables?.status === 'concluido'}
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

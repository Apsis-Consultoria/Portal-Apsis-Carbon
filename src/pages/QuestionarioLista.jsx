/**
 * QuestionarioLista - os preenchimentos de UM formulário, com o botão de novo.
 *
 * A tela é a mesma para os quatro questionários: o que muda é a chave na URL
 * ('/Questionarios/ronda'). Um componente por tipo daria quatro arquivos quase
 * idênticos, e a quinta cópia é onde o defeito aparece.
 *
 * ORGANIZAÇÃO: filtro por situação e por aldeia, e ordem por data decrescente,
 * que é como a equipe procura ("o que foi feito na última ida a campo"). A
 * paginação é do servidor.
 *
 * É AQUI QUE O RASCUNHO APARECE. O formulário cria o registro assim que é
 * aberto, então todo questionário começado - inclusive o que foi abandonado no
 * meio - está nesta lista marcado como rascunho, com o quanto já foi respondido.
 * O preço dessa escolha é o rascunho vazio de quem abriu por engano, e é por
 * isso que existe o botão de apagar nesta tela: quem abriu sem querer precisa
 * conseguir limpar. Concluído não tem esse botão, e o servidor recusa mesmo que
 * alguém chame a rota na mão - é evidência de campo.
 *
 * A COLUNA "NO APARELHO" lê a caixa de saída local (rascunhoOffline) e marca as
 * linhas cujas últimas respostas ainda não chegaram ao servidor. Sem ela, o
 * questionário preenchido offline apareceria com contagem antiga e a pessoa
 * acharia que perdeu o trabalho. Ela some sozinha quando o reenvio passa.
 *
 * LGPD: a lista mostra aldeia, data, situação e a FUNÇÃO de quem foi
 * entrevistado. Não existe coluna de nome porque não existe o dado - ver o
 * cabeçalho da migration 20260827090000_questionarios.sql.
 */

import { useMemo, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, CloudOff, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  listarModelosQuestionario,
  listarQuestionarios,
  removerQuestionario,
} from '@/lib/api/questionarios';
import { descartar, listarPendentes } from '@/lib/rascunhoOffline';
import { montarUrl } from '@/lib/pageRoutes';
import Tabela from '@/components/ui/Tabela';
import Campo from '@/components/ui/Campo';
import Badge from '@/components/ui/Badge';
import Cartao from '@/components/ui/Cartao';
import Carregando from '@/components/ui/Carregando';
import EstadoVazio from '@/components/ui/EstadoVazio';
import BotaoPrimario from '@/components/ui/BotaoPrimario';

/* Espelha o CHECK de carbon_questionarios.entrevistado_funcao. Valor fora do
   mapa aparece cru, e não some: função nova criada no banco antes do deploy do
   frontend não pode deixar a linha sem identificação. */
const FUNCOES = {
  cacique: 'Cacique',
  vice_cacique: 'Vice-cacique',
  koxoa: 'Koxoa',
  membro_comunidade: 'Membro da comunidade',
  agente_saude: 'Agente de saúde',
  professor: 'Professor',
  equipe_apsis: 'Equipe Apsis',
  outro: 'Outro',
};

/**
 * Formata coluna `date` do Postgres, que chega como 'AAAA-MM-DD'.
 *
 * Feito na mão de propósito: new Date('2026-01-01') é meia-noite UTC e, no fuso
 * do Brasil, toLocaleDateString mostraria o dia ANTERIOR - erro que passa
 * despercebido justamente na data da visita a campo.
 */
function fmtData(valor) {
  if (!valor) return '-';
  const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!partes) return String(valor);
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

/** Quantas perguntas o formulário tem ao todo, somando as seções. */
function contarPerguntas(definicao) {
  return (definicao?.secoes ?? []).reduce((s, sec) => s + (sec.perguntas?.length ?? 0), 0);
}

export default function QuestionarioLista() {
  const msal = useMsal();
  const navegar = useNavigate();
  const cliente = useQueryClient();
  const { tipo } = useParams();

  const [situacao, setSituacao] = useState('');
  const [aldeia, setAldeia] = useState('');
  /* Só existe para forçar a releitura do localStorage depois de apagar. A caixa
     de saída não é reativa, e não vale um observador para uma tela só. */
  const [versaoLocal, setVersaoLocal] = useState(0);

  const modelosQuery = useQuery({
    queryKey: ['carbon', 'questionarios', 'modelos'],
    queryFn: () => listarModelosQuestionario(msal),
    staleTime: 60 * 60 * 1000,
  });

  const modelo = (modelosQuery.data?.modelos ?? []).find((m) => m.chave === tipo) ?? null;

  const listaQuery = useQuery({
    queryKey: ['carbon', 'questionarios', 'lista', tipo, situacao, aldeia],
    queryFn: () => listarQuestionarios(msal, { modelo: tipo, status: situacao, aldeia }),
    enabled: Boolean(tipo),
  });

  /* Ids com resposta ainda no aparelho. Recalculado quando a lista muda porque é
     depois de um reenvio bem-sucedido que a pendência some. */
  const pendentes = useMemo(() => {
    const ids = new Set();
    for (const p of listarPendentes()) ids.add(p.id);
    return ids;
  }, [listaQuery.dataUpdatedAt, versaoLocal]);

  const apagar = useMutation({
    mutationFn: (linha) => removerQuestionario(msal, linha.id),
    onSuccess: (_r, linha) => {
      // A cópia local vai junto: senão a caixa de saída reenviaria o que
      // acabou de ser apagado e a linha voltaria sozinha para a lista.
      descartar(linha.id);
      setVersaoLocal((v) => v + 1);
      toast.success('Rascunho apagado.');
      cliente.invalidateQueries({ queryKey: ['carbon', 'questionarios', 'lista'] });
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível apagar o rascunho.'),
  });

  const voltar = (
    <Link
      to={montarUrl('Questionarios')}
      className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#F47920] transition-colors"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      Questionários
    </Link>
  );

  if (modelosQuery.isLoading) {
    return (
      <div className="p-6 space-y-4">
        {voltar}
        <Carregando rotulo="Carregando o formulário" />
      </div>
    );
  }

  /* Chave que não existe é endereço digitado errado, não falha de sistema: a
     tela diz isso e oferece a volta, em vez de deixar a pessoa num beco. */
  if (!modelo) {
    return (
      <div className="p-6 space-y-4">
        {voltar}
        <EstadoVazio
          icone={ClipboardList}
          titulo="Formulário não encontrado"
          texto={`Não existe questionário com a chave "${tipo}". Volte e escolha um da lista.`}
          comSuperficie
        />
      </div>
    );
  }

  const linhas = listaQuery.data?.questionarios ?? [];
  const podeEscrever = listaQuery.data?.pode_escrever === true;
  const totalPerguntas = contarPerguntas(modelo.definicao);
  const comPendencia = linhas.filter((l) => pendentes.has(l.id)).length;

  const colunas = [
    {
      chave: 'data_referencia',
      titulo: 'Data',
      larguraMinima: 110,
      render: (l) => <span className="font-semibold tabular-nums">{fmtData(l.data_referencia)}</span>,
    },
    {
      chave: 'aldeia',
      titulo: 'Aldeia',
      larguraMinima: 190,
      render: (l) => l.aldeia || <span className="text-[#8A9990]">Sem aldeia informada</span>,
    },
    {
      chave: 'entrevistado_funcao',
      titulo: 'Entrevistado',
      larguraMinima: 160,
      render: (l) =>
        l.entrevistado_funcao
          ? FUNCOES[l.entrevistado_funcao] ?? l.entrevistado_funcao
          : <span className="text-[#8A9990]">-</span>,
    },
    {
      chave: 'status',
      titulo: 'Situação',
      larguraMinima: 150,
      render: (l) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge tom={l.status === 'concluido' ? 'verde' : 'ambar'} tamanho="sm">
            {l.status === 'concluido' ? 'Concluído' : 'Rascunho'}
          </Badge>
          {pendentes.has(l.id) && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8A6D3B]"
              title="Há resposta guardada neste aparelho que ainda não chegou ao servidor. Abra o questionário com internet para enviar."
            >
              <CloudOff size={12} aria-hidden="true" />
              no aparelho
            </span>
          )}
        </div>
      ),
    },
    {
      /* Quantas de quantas, e não só a contagem: "12" não diz se falta muito. */
      chave: 'respostas',
      titulo: 'Respondidas',
      larguraMinima: 120,
      numerica: true,
      render: (l) => {
        const feitas = Object.keys(l.respostas ?? {}).length;
        return (
          <span className="tabular-nums">
            {feitas}
            {totalPerguntas ? <span className="text-[#8A9990]"> de {totalPerguntas}</span> : null}
          </span>
        );
      },
    },
  ];

  /* Coluna de apagar só existe para quem pode escrever, e o botão só aparece na
     linha de rascunho. A regra de verdade é do servidor (DELETE recusa
     concluído com 409); aqui é para não oferecer o que vai ser negado. */
  if (podeEscrever) {
    colunas.push({
      chave: 'acoes',
      titulo: '',
      larguraMinima: 52,
      render: (l) =>
        l.status === 'concluido' ? null : (
          <button
            type="button"
            aria-label={`Apagar o rascunho de ${fmtData(l.data_referencia)}`}
            disabled={apagar.isPending}
            onClick={(e) => {
              // A linha inteira abre o questionário; sem isto, apagar abriria a
              // tela do que acabou de ser apagado.
              e.stopPropagation();
              const feitas = Object.keys(l.respostas ?? {}).length;
              const aviso = feitas
                ? `Apagar este rascunho? ${feitas} resposta(s) serão perdidas.`
                : 'Apagar este rascunho vazio?';
              if (window.confirm(aviso)) apagar.mutate(l);
            }}
            className="p-1.5 rounded-lg text-[#8A9990] hover:text-[#C0392B] hover:bg-[#C0392B]/[0.08]
              transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2
              focus-visible:ring-[#C0392B]/30"
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        ),
    });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {voltar}
        {podeEscrever && (
          <BotaoPrimario
            icone={Plus}
            onClick={() => navegar(montarUrl('QuestionarioForm', { tipo, id: 'novo' }))}
          >
            Novo questionário
          </BotaoPrimario>
        )}
      </div>

      {modelo.descricao && (
        <p className="text-sm text-[#5C7060] max-w-3xl">{modelo.descricao}</p>
      )}

      {comPendencia > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#E8D9B8] bg-[#FDF8EE] px-4 py-3">
          <CloudOff size={16} className="text-[#8A6D3B] mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-[13px] leading-relaxed text-[#7A6231]">
            <strong className="font-semibold">
              {comPendencia} questionário(s) com resposta guardada só neste aparelho.
            </strong>{' '}
            Abra cada um com internet e o envio acontece sozinho. Não limpe os dados do navegador
            antes disso.
          </p>
        </div>
      )}

      <Cartao>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Campo
            rotulo="Situação"
            tipo="select"
            opcoes={[
              { valor: '', rotulo: 'Todas' },
              { valor: 'rascunho', rotulo: 'Rascunho' },
              { valor: 'concluido', rotulo: 'Concluído' },
            ]}
            valor={situacao}
            onChange={setSituacao}
          />
          <div className="sm:col-span-2">
            <Campo
              rotulo="Aldeia"
              tipo="texto"
              valor={aldeia}
              onChange={setAldeia}
              placeholder="Parte do nome já filtra"
            />
          </div>
        </div>
      </Cartao>

      <Tabela
        legenda={`Preenchimentos do formulário ${modelo.nome}`}
        colunas={colunas}
        dados={linhas}
        carregando={listaQuery.isLoading}
        erro={listaQuery.isError ? (listaQuery.error?.message ?? true) : false}
        iconeVazio={ClipboardList}
        tituloVazio="Nenhum preenchimento"
        textoVazio={
          situacao || aldeia
            ? 'Nenhum preenchimento com esse filtro. Limpe os filtros para ver todos.'
            : 'Este formulário ainda não foi aplicado. Use o botão de novo questionário.'
        }
        onLinhaClick={(l) => navegar(montarUrl('QuestionarioForm', { tipo, id: l.id }))}
        rotuloLinha={(l) => `Abrir o preenchimento de ${fmtData(l.data_referencia)}`}
        rodape={
          linhas.length ? (
            <span className="text-[11px] text-[#5C7060]">
              {listaQuery.data?.total ?? linhas.length} preenchimento(s) no total
            </span>
          ) : null
        }
      />
    </div>
  );
}

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
 * LGPD: a lista mostra aldeia, data, situação e a FUNÇÃO de quem foi
 * entrevistado. Não existe coluna de nome porque não existe o dado - ver o
 * cabeçalho da migration 20260827090000_questionarios.sql.
 */

import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Plus } from 'lucide-react';
import { listarModelosQuestionario, listarQuestionarios } from '@/lib/api/questionarios';
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

export default function QuestionarioLista() {
  const msal = useMsal();
  const navegar = useNavigate();
  const { tipo } = useParams();

  const [situacao, setSituacao] = useState('');
  const [aldeia, setAldeia] = useState('');

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
      larguraMinima: 200,
      render: (l) => l.aldeia || <span className="text-[#8A9990]">Sem aldeia informada</span>,
    },
    {
      chave: 'entrevistado_funcao',
      titulo: 'Entrevistado',
      larguraMinima: 170,
      render: (l) =>
        l.entrevistado_funcao
          ? FUNCOES[l.entrevistado_funcao] ?? l.entrevistado_funcao
          : <span className="text-[#8A9990]">-</span>,
    },
    {
      chave: 'status',
      titulo: 'Situação',
      larguraMinima: 120,
      render: (l) => (
        <Badge tom={l.status === 'concluido' ? 'verde' : 'ambar'} tamanho="sm">
          {l.status === 'concluido' ? 'Concluído' : 'Rascunho'}
        </Badge>
      ),
    },
    {
      chave: 'respostas',
      titulo: 'Respondidas',
      larguraMinima: 110,
      numerica: true,
      render: (l) => Object.keys(l.respostas ?? {}).length,
    },
  ];

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

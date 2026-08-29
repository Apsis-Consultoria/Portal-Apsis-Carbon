/**
 * Questionarios - o tópico. Mostra os quatro formulários de campo e quantos
 * preenchimentos cada um já tem.
 *
 * POR QUE UM HUB, e não quatro itens soltos no menu lateral. São quatro
 * formulários hoje e a lista cresce; quatro itens fixos empurrariam o resto do
 * menu para baixo e teriam de virar cinco, seis, no braço. Aqui o menu ganha
 * UM item e a tela lista o que existe, vindo do servidor - formulário novo
 * aparece sozinho.
 *
 * A CONTAGEM POR TIPO É UMA CHAMADA POR MODELO, e isso é deliberado. Uma rota de
 * agregado seria mais barata em requisições e mais cara em código; com quatro
 * modelos, quatro consultas paralelas de contagem custam menos que uma rota nova
 * para manter. Se um dia forem vinte formulários, o lugar de consertar é aqui.
 */

import { useMsal } from '@azure/msal-react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, WifiOff, ArrowRight } from 'lucide-react';
import { listarModelosQuestionario, listarQuestionarios } from '@/lib/api/questionarios';
import { montarUrl } from '@/lib/pageRoutes';
import Cartao from '@/components/ui/Cartao';
import Carregando from '@/components/ui/Carregando';
import EstadoVazio from '@/components/ui/EstadoVazio';
import Badge from '@/components/ui/Badge';

export default function Questionarios() {
  const msal = useMsal();

  const modelosQuery = useQuery({
    queryKey: ['carbon', 'questionarios', 'modelos'],
    queryFn: () => listarModelosQuestionario(msal),
    // A definição de formulário muda por seed, não por uso. Uma hora de cache
    // evita refazer a chamada a cada volta para esta tela.
    staleTime: 60 * 60 * 1000,
  });

  const modelos = modelosQuery.data?.modelos ?? [];

  /* Contagem por modelo. `limite: 1` porque só o total interessa: o servidor
     devolve `total` com a contagem exata mesmo trazendo uma linha só. */
  const contagens = useQueries({
    queries: modelos.map((m) => ({
      queryKey: ['carbon', 'questionarios', 'contagem', m.chave],
      queryFn: () => listarQuestionarios(msal, { modelo: m.chave, limite: 1 }),
      staleTime: 60 * 1000,
    })),
  });

  if (modelosQuery.isLoading) {
    return (
      <div className="p-6">
        <Carregando rotulo="Carregando os questionários" />
      </div>
    );
  }

  if (modelosQuery.isError) {
    return (
      <div className="p-6">
        <EstadoVazio
          icone={WifiOff}
          titulo="Não foi possível carregar os questionários"
          texto={modelosQuery.error?.message ?? 'Verifique a conexão e tente novamente.'}
          comSuperficie
        />
      </div>
    );
  }

  if (!modelos.length) {
    return (
      <div className="p-6">
        <EstadoVazio
          icone={ClipboardList}
          titulo="Nenhum formulário cadastrado"
          texto="Os formulários de campo vêm do banco. Se esta lista está vazia, o seed dos modelos ainda não foi aplicado."
          comSuperficie
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <p className="text-sm text-[#5C7060] max-w-3xl">
        Os formulários aplicados em campo. Cada um tem a própria tela, com os preenchimentos
        anteriores organizados por data e aldeia.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modelos.map((modelo, i) => {
          const contagem = contagens[i];
          const total = contagem?.data?.total;

          return (
            <Link
              key={modelo.chave}
              to={montarUrl('QuestionarioLista', { tipo: modelo.chave })}
              className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30 rounded-2xl"
            >
              <Cartao className="h-full transition-colors group-hover:border-[#1A4731]/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#1A2B1F]">{modelo.nome}</h3>
                    {modelo.descricao && (
                      <p className="mt-1 text-xs text-[#5C7060] leading-relaxed">{modelo.descricao}</p>
                    )}
                  </div>
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="flex-shrink-0 mt-0.5 text-[#8A9990] group-hover:text-[#F47920] transition-colors"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {/* Enquanto a contagem não chega, o rótulo é "carregando" e não
                      zero: zero prematuro diria que não há preenchimento, que é
                      uma afirmação diferente de "ainda não sei". */}
                  <Badge tom={total ? 'verde' : 'neutro'} tamanho="sm">
                    {contagem?.isLoading
                      ? 'contando...'
                      : total === 1
                        ? '1 preenchimento'
                        : `${total ?? 0} preenchimentos`}
                  </Badge>
                  {modelo.origem && (
                    <span className="text-[11px] text-[#8A9990]">Origem: {modelo.origem}</span>
                  )}
                </div>
              </Cartao>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

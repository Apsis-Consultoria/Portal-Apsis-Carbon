/**
 * PlanoMonitoramento - o Plano de Monitoramento como tela propria, no menu.
 *
 * POR QUE ELA EXISTE, e por que contraria o que estava escrito antes. O registro
 * de `indicadores.paginas.js` dizia que nao devia existir tela de Indicadores sem
 * projeto, porque "uma tela geral que os empilhasse convidaria a somar o que nao
 * soma". A preocupacao era real e continua valendo: clima, comunidade e
 * biodiversidade tem unidades que nao se comparam, e dois projetos tem Teorias da
 * Mudanca diferentes.
 *
 * O que a regra errou foi o remedio. Esta tela NAO empilha nada: ela mostra UM
 * projeto por vez, exatamente como a tela filha, e por isso nao cria nenhuma soma
 * indevida. O que ela conserta e outra coisa - o Plano de Monitoramento e um
 * documento que a equipe procura pelo nome, e nao "uma aba de um projeto". Estando
 * so dentro de Projetos, ele ficava a dois cliques e um painel lateral de
 * distancia, e o dono do sistema nao o encontrou duas vezes seguidas (31/08/2026).
 * Navegacao que o dono nao acha e navegacao quebrada, por melhor que seja o
 * argumento conceitual.
 *
 * A TELA FILHA CONTINUA EXISTINDO, em /Projetos/:id/Indicadores, e e a mesma
 * componente. Quem esta olhando um projeto chega por ali sem trocar de contexto;
 * quem procura o Plano chega pelo menu. As duas portas levam ao mesmo lugar, e nao
 * ha copia de codigo entre elas: `ProjetoIndicadores` aceita o projeto por prop.
 *
 * ESCOLHA DE PROJETO SEM SELETOR QUANDO SO HA UM. Hoje um unico projeto tem Plano
 * de Monitoramento. Mostrar um seletor de um item so seria um clique que nao
 * decide nada. Com dois ou mais, o seletor aparece sozinho.
 */

import { useMemo, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, WifiOff } from 'lucide-react';
import { listarProjetos, normalizarListaProjetos } from '@/lib/api/projetos';
import Campo from '@/components/ui/Campo';
import Cartao from '@/components/ui/Cartao';
import Carregando from '@/components/ui/Carregando';
import EstadoVazio from '@/components/ui/EstadoVazio';
import ProjetoIndicadores from '@/pages/ProjetoIndicadores';

export default function PlanoMonitoramento() {
  const msal = useMsal();
  const [escolhido, setEscolhido] = useState('');

  /* normalizarListaProjetos DENTRO do queryFn: a chave ['carbon','projetos'] e
     compartilhada com outras telas, e todas guardam o envelope no cache. Ler
     `.projetos` fora daqui ja quebrou a tela de questionarios uma vez, porque a
     funcao devolve { projetos, podeCriar } e nao um array. */
  const projetosQuery = useQuery({
    queryKey: ['carbon', 'projetos'],
    queryFn: async () => normalizarListaProjetos(await listarProjetos(msal)),
    staleTime: 5 * 60 * 1000,
  });

  const projetos = useMemo(
    () => projetosQuery.data?.projetos ?? [],
    [projetosQuery.data],
  );

  const projetoId = escolhido || projetos[0]?.id || '';

  if (projetosQuery.isLoading) {
    return (
      <div className="p-6">
        <Carregando rotulo="Carregando os projetos" />
      </div>
    );
  }

  if (projetosQuery.isError) {
    return (
      <div className="p-6">
        <EstadoVazio
          icone={WifiOff}
          titulo="Não foi possível carregar os projetos"
          texto={projetosQuery.error?.message ?? 'Verifique a conexão e tente novamente.'}
          comSuperficie
        />
      </div>
    );
  }

  /* Sem projeto nenhum a tela nao tem o que mostrar, e dizer isso e melhor do que
     renderizar a matriz vazia de um projeto inexistente. */
  if (!projetoId) {
    return (
      <div className="p-6">
        <EstadoVazio
          icone={BarChart3}
          titulo="Nenhum projeto cadastrado"
          texto="O Plano de Monitoramento é construído sobre a Teoria da Mudança de um projeto. Cadastre um projeto para começar."
          comSuperficie
        />
      </div>
    );
  }

  /* Seletor so com dois ou mais. Ver o cabecalho: um seletor de item unico e um
     clique que nao decide nada. */
  const seletor = projetos.length > 1 ? (
    <Cartao className="mb-4">
      <Campo
        rotulo="Projeto"
        tipo="select"
        opcoes={projetos.map((p) => ({ valor: p.id, rotulo: p.nome }))}
        valor={projetoId}
        onChange={setEscolhido}
        dica="Cada projeto tem a própria Teoria da Mudança. Os indicadores não se comparam entre projetos."
      />
    </Cartao>
  ) : null;

  return (
    <div>
      {seletor && <div className="px-6 pt-6">{seletor}</div>}
      {/* voltar={null} desliga o link "Projetos": quem chegou pelo menu nao veio
          de la, e um voltar para uma tela em que a pessoa nunca esteve confunde
          mais do que ajuda. */}
      <ProjetoIndicadores projetoIdFixo={projetoId} voltar={null} />
    </div>
  );
}

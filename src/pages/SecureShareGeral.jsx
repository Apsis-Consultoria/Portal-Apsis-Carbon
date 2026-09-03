/**
 * SecureShareGeral - a pasta compartilhada com TODOS os clientes.
 *
 * O que entra aqui aparece para toda pessoa que entra no portal do cliente, de
 * qualquer projeto. E o lugar de material que vale para todos: politica de
 * privacidade, apresentacao institucional, metodologia publica.
 *
 * -----------------------------------------------------------------------------
 * ESTA TELA E SO A METADE DA APSIS DE UMA FEATURE QUE JA EXISTIA
 * -----------------------------------------------------------------------------
 * A Geral ja estava pronta no backend e no portal do cliente antes desta tela:
 *
 *   - a funcao de login do cliente injeta a Geral na sessao de todo mundo
 *     (secure-share-carbon, _shared/sessaoProjetos.ts);
 *   - o envio do cliente a recusa: para ele a pasta e SOMENTE LEITURA
 *     (carbon-ss-enviar/index.ts);
 *   - o banco registra que ela nao tem permissao por item (ver o comentario de
 *     carbon_secure_share_contexto);
 *   - a funcao de upload da APSIS ja reconhece o id reservado `geral` e exige
 *     papel admin ou gestor para escrever;
 *   - o portal do cliente ja tem os rotulos traduzidos ("Compartilhado com
 *     todos" / "Shared with everyone").
 *
 * O que faltava era exatamente isto: um lugar onde a APSIS SOBE o arquivo. Sem
 * esta tela a pasta existia, o cliente a via, e ninguem conseguia alimenta-la.
 *
 * REAPROVEITA `Envio` e `Arquivos` de SecureShareProjeto.jsx em vez de ter copia
 * propria. Sao 700 linhas de arvore sob demanda, drag-and-drop de pasta,
 * conflito de nome e progresso de envio; uma segunda copia divergiria na
 * primeira correcao. O `projeto` passado e sintetico, com o id reservado.
 */

import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { ArrowLeft, Globe2, Users, Lock } from 'lucide-react';

import { ID_GERAL } from '@/lib/api/secureshare';
import { rotaDaPagina } from '@/lib/pageRoutes';

import CabecalhoSecao from '@/components/ui/CabecalhoSecao';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import BotaoSecundario from '@/components/ui/BotaoSecundario';

import { Envio, Arquivos } from '@/pages/SecureShareProjeto';

/**
 * Projeto SINTETICO. Nao existe linha em carbon_secure_share_projetos para a
 * Geral, de proposito: inventar uma criaria um "cliente" fantasma que apareceria
 * nas duas views de listagem e nos agregados de acesso da tela de lista.
 *
 * `id` e o identificador reservado que a rota de arquivos e a funcao de upload
 * reconhecem. `pasta` aqui e so rotulo de tela: o nome que vale e o que o
 * servidor devolve, lido de carbon_app_config.secure_share.pastaGeral.
 */
const PROJETO_GERAL = {
  id: ID_GERAL,
  empresa: 'Geral',
  ap_os: null,
  pasta: 'Geral',
  /**
   * `status: 'ativo'` NAO E ENFEITE, e sem ele a tela nasceu quebrada.
   *
   * `Envio` desabilita a area de arrastar com `projeto?.status !== 'ativo'`, e a
   * primeira versao deste objeto nao tinha a chave: `undefined !== 'ativo'` e
   * verdade, entao a Geral abria com "Projeto encerrado" e ninguem conseguia
   * subir nada - exatamente o problema que esta tela existe para resolver.
   *
   * A Geral nao tem ciclo de vida: nao se encerra, nao se reabre e nao aparece
   * no seletor de status. Ela e sempre ativa, e e isso que a constante afirma.
   */
  status: 'ativo',
};

export default function SecureShareGeral() {
  const msal = useMsal();
  const navegar = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <BotaoSecundario
        variante="fantasma"
        icone={ArrowLeft}
        onClick={() => navegar(rotaDaPagina('SecureShare') ?? '/SecureShare')}
      >
        Voltar para as pastas
      </BotaoSecundario>

      <CabecalhoSecao
        icone={Globe2}
        titulo="Pasta Geral"
        descricao="Visível para todos os clientes, de todos os projetos"
      />

      {/* OS DOIS AVISOS JUNTOS, e ANTES da area de envio.
          Eles respondem a mesma pergunta - "quem vê o que eu subir aqui?" - e
          separados por 700 pixels de arvore de arquivos a resposta ficava pela
          metade em cada ponta: em cima "todos veem", e so no fim da pagina
          "mas o cliente nao escreve". Quem chega para subir um arquivo precisa
          das duas antes de arrastar, nao depois de o envio terminar. */}
      <div className="space-y-2.5">
        <AvisoDiscreto tom="ambar" titulo="O que entra aqui todos veem." icone={Users}>
          Qualquer pessoa que acesse o portal do cliente, de <strong>qualquer projeto</strong>,
          vê e baixa o conteúdo desta pasta. Documento de um cliente específico não vem para
          cá: use a pasta do projeto dele.
        </AvisoDiscreto>

        <AvisoDiscreto tom="azul" titulo="Somente leitura para o cliente." icone={Lock}>
          O portal do cliente mostra esta pasta como <strong>Compartilhado com todos</strong> e
          recusa envio dela: só a equipe da APSIS escreve aqui.
        </AvisoDiscreto>
      </div>

      <Envio projeto={PROJETO_GERAL} msal={msal} />

      {/* semRegras: na Geral nao existe permissao por item, e a razao e o proprio
          significado da pasta - ela e compartilhada com todos, entao nao ha a
          quem restringir. Com o painel ligado, a tela mostraria um controle de
          acesso com lista de clientes vazia. */}
      <Arquivos
        projeto={PROJETO_GERAL}
        msal={msal}
        clientes={[]}
        permissoes={[]}
        semRegras
        onMudou={() => {}}
      />
    </div>
  );
}

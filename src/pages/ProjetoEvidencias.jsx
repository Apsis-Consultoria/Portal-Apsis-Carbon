/**
 * ProjetoEvidencias - checklist de evidências exigidas na auditoria (issue #4).
 *
 * O que a validadora (VVB) pede de um projeto de carbono é uma lista de artefatos,
 * indexada pela seção do padrão VCS/CCB que faz a exigência. Hoje isso vive numa base
 * do Notion cujo status de item é "Anexado Pasta", ou seja "está numa pasta em algum
 * lugar" (docs/notion/08-monitoring-report.md). É esse o problema que a tela resolve.
 *
 * REGRA CENTRAL: DOIS EIXOS DE PROGRESSO INDEPENDENTES, e a tela mostra sempre os dois.
 *
 *   Resposta redigida   nao_iniciado, em_andamento, concluido, nao_aplicavel
 *   Evidência aceita    pendente, anexada, aceita, nao_aplicavel
 *
 * Um item pode estar com a resposta concluída e a evidência pendente (foi escrito que o
 * projeto tem licença ambiental, mas o PDF não chegou). Mostrar um número só esconderia
 * exatamente a metade que costuma travar a auditoria. Em cada eixo, 'não aplicável' sai
 * do DENOMINADOR daquele eixo, senão o checklist nunca fecha - quem calcula é o servidor
 * (função SQL carbon_evidencias_progresso), a tela só exibe e deixa a regra explícita.
 *
 * O vínculo com os arquivos é muitos-para-muitos e mora no domínio de Documentos: a
 * coluna "Documentos" mostra a contagem, e mostra "indisponível" (não zero) enquanto
 * esse domínio não estiver no ar.
 */

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, ClipboardCheck, ListTree, Paperclip, Pencil, Scale, Sparkles, User, WifiOff,
} from 'lucide-react';

import { obterProjeto } from '@/lib/api/projetos';
import {
  obterEvidencias,
  criarEvidenciasDoTemplate,
  atualizarItemEvidencia,
} from '@/lib/api/evidencias';
import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import { urlPdd } from '@/lib/pageRoutes';
import { createPageUrl } from '@/utils';

import Cartao from '@/components/ui/Cartao';
import Tabela from '@/components/ui/Tabela';
import Badge from '@/components/ui/Badge';
import EstadoVazio from '@/components/ui/EstadoVazio';
import Carregando from '@/components/ui/Carregando';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import Campo from '@/components/ui/Campo';
import PainelLateral from '@/components/ui/PainelLateral';
import BarraProgresso from '@/components/ui/BarraProgresso';
import SeletorStatus from '@/components/ui/SeletorStatus';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';

/* ===== Domínio =============================================================
   Espelham os CHECK de carbon_evidencia_itens. A ordem das chaves é a ordem das
   opções no seletor, do mais cru ao mais fechado, com 'não aplicável' no fim porque
   é decisão de escopo, e não etapa de trabalho.                                  */

const STATUS_RESPOSTA = {
  nao_iniciado: { rotulo: 'Não iniciado', tom: 'neutro' },
  em_andamento: { rotulo: 'Em andamento', tom: 'azul' },
  concluido: { rotulo: 'Concluído', tom: 'verde' },
  nao_aplicavel: { rotulo: 'Não aplicável', tom: 'neutro' },
};

const ESTADO_EVIDENCIA = {
  pendente: { rotulo: 'Pendente', tom: 'ambar' },
  anexada: { rotulo: 'Anexada', tom: 'azul' },
  aceita: { rotulo: 'Aceita', tom: 'verde' },
  nao_aplicavel: { rotulo: 'Não aplicável', tom: 'neutro' },
};

/**
 * Encaminhamento para outra área. No Notion isso aparecia como o "status" Jurídico,
 * que não é estado do documento: é fila de outra área. Por isso convive com os dois
 * eixos em vez de substituir um deles.
 */
const ENCAMINHAMENTOS = {
  juridico: 'Jurídico',
  tecnico: 'Equipe técnica',
  externo: 'Parceiro externo',
};

const opcoesDe = (mapa) =>
  Object.entries(mapa).map(([valor, v]) => ({ valor, rotulo: v.rotulo, tom: v.tom }));

const OPCOES_RESPOSTA = opcoesDe(STATUS_RESPOSTA);
const OPCOES_EVIDENCIA = opcoesDe(ESTADO_EVIDENCIA);
const OPCOES_ENCAMINHAMENTO = Object.entries(ENCAMINHAMENTOS).map(([valor, rotulo]) => ({
  valor,
  rotulo,
}));

/* Mesma forma que a função SQL carbon_evidencias_progresso devolve, para a tela nunca
   precisar de `?.` em cadeia nem dividir por zero antes do primeiro carregamento. */
const PROGRESSO_VAZIO = {
  itens: 0,
  resposta: { total: 0, concluidos: 0, em_andamento: 0, nao_aplicaveis: 0, pct: 0 },
  evidencia: { total: 0, aceitas: 0, anexadas: 0, pendentes: 0, nao_aplicaveis: 0, pct: 0 },
  encaminhados: 0,
  na_com_evidencia_pendente: 0,
  por_secao: [],
};

/** Percentual em pt-BR: 58,3 e não 58.3. O separador decimal é vírgula. */
function fmtPct(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

const plural = (n, singular, pluralForma) => (n === 1 ? singular : pluralForma);

/* ===== Blocos de interface ================================================ */

/**
 * Um dos dois eixos, com percentual, barra e a explicação do denominador.
 *
 * A frase sobre os itens não aplicáveis não é decoração: sem ela, quem revisa não
 * entende por que o total considerado é menor do que a quantidade de linhas.
 */
function ResumoEixo({ titulo, explicacao, pct, feitos, total, naoAplicaveis, tom, extra }) {
  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5C7060]">
            {titulo}
          </p>
          <p className="text-[11px] text-[#8A9990] mt-0.5 leading-relaxed">{explicacao}</p>
        </div>
        <p className="text-2xl font-bold text-[#1A2B1F] tabular-nums flex-shrink-0">
          {fmtPct(pct)}%
        </p>
      </div>

      <BarraProgresso
        className="mt-2"
        valor={pct}
        alta
        tom={tom}
        rotuloAcessivel={titulo}
        detalhe={`${feitos} de ${total}`}
      />

      {extra}

      {naoAplicaveis > 0 && (
        <p className="text-[11px] text-[#8A9990] mt-1.5 leading-relaxed">
          {naoAplicaveis}{' '}
          {plural(
            naoAplicaveis,
            'item não aplicável está fora',
            'itens não aplicáveis estão fora',
          )}{' '}
          do cálculo, por isso o total considerado é {total} e não {total + naoAplicaveis}.
        </p>
      )}
    </div>
  );
}

/** Progresso dos dois eixos de uma seção, em miniatura, no cabeçalho do cartão. */
function ProgressoSecao({ progresso }) {
  const p = progresso || null;
  if (!p) {
    return <span className="text-[11px] text-[#8A9990]">Sem itens na conta</span>;
  }
  return (
    <div className="w-44 sm:w-60 space-y-2">
      <BarraProgresso
        valor={p.resposta_pct}
        rotulo="Resposta"
        detalhe={`${p.resposta_concluidos}/${p.resposta_total}`}
        tom="laranja"
      />
      <BarraProgresso
        valor={p.evidencia_pct}
        rotulo="Evidência"
        detalhe={`${p.evidencia_aceitas}/${p.evidencia_total}`}
        tom="azul"
      />
    </div>
  );
}

/** Contagem de documentos vinculados ao item. null significa "ainda não sei". */
function ContagemDocumentos({ item }) {
  const n = item?.documentos_vinculados;

  if (n === null || n === undefined) {
    return (
      <span className="text-[11px] text-[#A8B4AC]" title="Vínculo com documentos indisponível">
        indisponível
      </span>
    );
  }
  if (Number(n) === 0) {
    return <span className="text-[11px] text-[#8A9990]">nenhum</span>;
  }
  return (
    <Badge tom="azul" tamanho="sm" icone={Paperclip}>
      {n} {plural(Number(n), 'documento', 'documentos')}
    </Badge>
  );
}

/**
 * Painel de detalhe do item.
 *
 * Remontado a cada item (o pai usa `key={item.id}`) em vez de sincronizado por efeito:
 * o formulário nasce do item aberto e não precisa de useEffect para se
 * ressincronizar, o que também evita sobrescrever o que a pessoa está digitando
 * quando a lista é recarregada por trás.
 *
 * Envia APENAS o que mudou. Mandar o objeto inteiro faria cada salvamento reescrever
 * os dois eixos, apagando a alteração que outra pessoa acabou de fazer no outro.
 */
function PainelItem({ item, salvando, onFechar, onSalvar }) {
  const [form, setForm] = useState({
    status_resposta: item?.status_resposta ?? 'nao_iniciado',
    estado_evidencia: item?.estado_evidencia ?? 'pendente',
    encaminhado_para: item?.encaminhado_para ?? '',
    observacoes: item?.observacoes ?? '',
  });

  const trocar = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const alteracoes = useMemo(() => {
    const dados = {};
    if (form.status_resposta !== (item?.status_resposta ?? 'nao_iniciado')) {
      dados.status_resposta = form.status_resposta;
    }
    if (form.estado_evidencia !== (item?.estado_evidencia ?? 'pendente')) {
      dados.estado_evidencia = form.estado_evidencia;
    }
    if (form.encaminhado_para !== (item?.encaminhado_para ?? '')) {
      // String vazia limpa o encaminhamento; o backend trata '' e null igual.
      dados.encaminhado_para = form.encaminhado_para || null;
    }
    if (form.observacoes.trim() !== String(item?.observacoes ?? '').trim()) {
      dados.observacoes = form.observacoes.trim();
    }
    return dados;
  }, [form, item]);

  const alterado = Object.keys(alteracoes).length > 0;

  return (
    <PainelLateral
      aberto
      onFechar={onFechar}
      icone={ClipboardCheck}
      titulo={`Item ${item?.codigo ?? ''}`}
      subtitulo={item?.secao}
      largura="lg"
      // Formulário preenchido não pode fechar por clique fora sem aviso.
      fecharAoClicarFora={!alterado}
      rodape={
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#8A9990]">
            {alterado ? 'Há alterações não salvas.' : 'Nenhuma alteração.'}
          </span>
          <div className="flex items-center gap-2">
            <BotaoSecundario variante="fantasma" onClick={onFechar}>
              Cancelar
            </BotaoSecundario>
            {/* onClick e não type="submit": o rodapé do painel fica fora do form. */}
            <BotaoPrimario
              onClick={() => onSalvar(alteracoes)}
              carregando={salvando}
              desabilitado={!alterado}
            >
              Salvar
            </BotaoPrimario>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5C7060]">
            Evidência exigida
          </p>
          <p className="text-sm text-[#1A2B1F] mt-1 leading-relaxed break-words">
            {item?.exigencia}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo
            rotulo="Resposta redigida"
            tipo="select"
            opcoes={OPCOES_RESPOSTA.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))}
            valor={form.status_resposta}
            onChange={trocar('status_resposta')}
            dica="Andamento do texto de resposta ao item."
          />
          <Campo
            rotulo="Evidência"
            tipo="select"
            opcoes={OPCOES_EVIDENCIA.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))}
            valor={form.estado_evidencia}
            onChange={trocar('estado_evidencia')}
            dica="Anexada é entregue; aceita é aprovada pela validadora."
          />
        </div>

        <Campo
          rotulo="Aguardando outra área"
          tipo="select"
          opcoes={OPCOES_ENCAMINHAMENTO}
          rotuloVazio="Ninguém: o item está com a equipe"
          valor={form.encaminhado_para}
          onChange={trocar('encaminhado_para')}
          dica="Encaminhamento não é estado do documento: o item continua com resposta e evidência próprias."
        />

        <Campo
          rotulo="Observações"
          tipo="textarea"
          linhas={5}
          valor={form.observacoes}
          onChange={trocar('observacoes')}
          placeholder="Quais evidências satisfazem o item, o que falta, com quem está."
          dica="Anotação interna. Não substitui o vínculo com o documento."
          extras={{ maxLength: 5000 }}
        />

        <div className="pt-1 border-t border-[#F4F6F4]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5C7060] mt-4">
            Documentos vinculados
          </p>
          <div className="mt-1.5">
            <ContagemDocumentos item={item} />
          </div>
          <p className="text-[11px] text-[#8A9990] mt-1.5 leading-relaxed">
            Um documento pode satisfazer vários itens e um item pode exigir vários
            documentos. O vínculo é mantido no cadastro de Documentos do projeto.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5C7060]">
            Responsável
          </p>
          {/* Somente leitura: responsavel_id é chave estrangeira para carbon_usuarios e
              ainda não existe rota que liste os colaboradores. Um campo de UUID solto
              seria pior do que não ter campo; fica para a issue de equipe por projeto. */}
          <p className="text-xs text-[#5C7060] mt-1 inline-flex items-center gap-1.5">
            <User size={12} aria-hidden="true" />
            {item?.responsavel_nome || item?.responsavel_email ||
              (item?.responsavel_id ? 'Atribuído' : 'Sem responsável')}
          </p>
        </div>
      </div>
    </PainelLateral>
  );
}

/** Estado de exceção com caminho de volta. Nunca deixa a tela vazia sem explicação. */
function TelaAviso({ titulo, texto }) {
  return (
    <EstadoVazio
      comSuperficie
      icone={WifiOff}
      titulo={titulo}
      texto={texto}
      acao={
        <BotaoSecundario como="link" para={createPageUrl('Projetos')} icone={ArrowLeft}>
          Voltar para Projetos
        </BotaoSecundario>
      }
    />
  );
}

/* ===== Página ============================================================= */

export default function ProjetoEvidencias() {
  const { id: projetoId } = useParams();
  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const autenticado = (accounts?.length ?? 0) > 0;
  const queryClient = useQueryClient();

  // Guarda qual item está salvando, para o spinner ficar na linha certa em vez de
  // bloquear a tela inteira a cada troca de status.
  const [salvandoId, setSalvandoId] = useState(null);
  const [itemAbertoId, setItemAbertoId] = useState(null);

  /* Em modo demonstração não existe conta no MSAL (o login fica desabilitado) e as
     funções de api não usam token, então `autenticado` não pode ser exigido: a tela
     ficaria vazia no único modo em que ela é revisável sem Supabase. */
  const habilitado = ((MODO_DEMO && MODO_DEMO_ATIVO()) || autenticado) && Boolean(projetoId);

  const projetoQuery = useQuery({
    queryKey: ['carbon', 'projeto', projetoId],
    queryFn: async () => {
      const resposta = await obterProjeto(msal, projetoId);
      return resposta?.projeto ?? null;
    },
    enabled: habilitado,
  });

  const checklistQuery = useQuery({
    queryKey: ['carbon', 'evidencias', projetoId],
    queryFn: async () => {
      const resposta = await obterEvidencias(msal, projetoId);
      return {
        itens: Array.isArray(resposta?.itens) ? resposta.itens : [],
        progresso: resposta?.progresso ?? PROGRESSO_VAZIO,
        // Só é false quando o servidor diz explicitamente que não consegue contar.
        vinculosDisponiveis: resposta?.vinculos_disponiveis !== false,
      };
    },
    enabled: habilitado,
  });

  const projeto = projetoQuery.data ?? null;
  const itens = checklistQuery.data?.itens ?? [];
  const progresso = checklistQuery.data?.progresso ?? PROGRESSO_VAZIO;
  const vinculosDisponiveis = checklistQuery.data?.vinculosDisponiveis !== false;

  const resposta = progresso.resposta ?? PROGRESSO_VAZIO.resposta;
  const evidencia = progresso.evidencia ?? PROGRESSO_VAZIO.evidencia;

  /**
   * Agrupa por seção do padrão. A seção herda a MENOR ordem dos seus itens, que é o
   * mesmo critério do min(ordem) da função SQL: a ordem do checklist é a ordem em que
   * a validadora cobra, e não a alfabética.
   */
  const secoes = useMemo(() => {
    const mapa = new Map();
    for (const item of itens) {
      const chave = String(item?.secao ?? '');
      const ordem = Number(item?.ordem) || 0;
      if (!mapa.has(chave)) mapa.set(chave, { secao: chave, ordem, itens: [] });
      const grupo = mapa.get(chave);
      grupo.ordem = Math.min(grupo.ordem, ordem);
      grupo.itens.push(item);
    }
    return [...mapa.values()].sort(
      (a, b) => a.ordem - b.ordem || a.secao.localeCompare(b.secao, 'pt-BR'),
    );
  }, [itens]);

  const progressoPorSecao = useMemo(() => {
    const mapa = new Map();
    for (const linha of progresso?.por_secao ?? []) mapa.set(String(linha?.secao), linha);
    return mapa;
  }, [progresso]);

  const itemAberto = useMemo(
    () => itens.find((item) => item?.id === itemAbertoId) ?? null,
    [itens, itemAbertoId],
  );

  const criar = useMutation({
    mutationFn: async () => criarEvidenciasDoTemplate(msal, projetoId),
    /**
     * `criados = 0` tem DOIS significados, e confundi-los mostraria um toast verde
     * para uma operação que não fez nada: a função SQL filtra o template pelo standard
     * do projeto, então standard sem template semeado insere zero itens exatamente
     * como o checklist que já estava completo. A lista que volta na resposta é o que
     * separa os dois casos - vazia significa que não havia template.
     */
    onSuccess: (respostaApi) => {
      queryClient.invalidateQueries({ queryKey: ['carbon', 'evidencias', projetoId] });
      const criados = Number(respostaApi?.criados) || 0;
      const total = Array.isArray(respostaApi?.itens) ? respostaApi.itens.length : 0;

      if (criados > 0) {
        toast.success(`Checklist criado com ${criados} ${plural(criados, 'item', 'itens')}.`);
        return;
      }
      if (total === 0) {
        toast.error(
          `Não há checklist de evidências cadastrado para o padrão ${projeto?.standard || 'deste projeto'}. Avise a equipe responsável pelo sistema para carregar a lista de exigências.`,
        );
        return;
      }
      toast.success('O checklist já estava criado: nenhum item novo foi necessário.');
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível criar o checklist agora.'),
  });

  const alterar = useMutation({
    mutationFn: async ({ id, dados }) => atualizarItemEvidencia(msal, id, dados),
    onMutate: ({ id }) => setSalvandoId(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['carbon', 'evidencias', projetoId] }),
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar o item.'),
    onSettled: () => setSalvandoId(null),
  });

  const aoAlterarItem = (id, dados) => {
    if (!id) return;
    alterar.mutate({ id, dados });
  };

  const salvarDoPainel = async (dados) => {
    if (!itemAberto) return;
    if (Object.keys(dados).length === 0) {
      setItemAbertoId(null);
      return;
    }
    try {
      await alterar.mutateAsync({ id: itemAberto.id, dados });
      setItemAbertoId(null);
    } catch {
      // O toast de erro já saiu no onError da mutação; o painel fica aberto com o
      // que a pessoa digitou, para ela poder tentar de novo sem redigitar.
    }
  };

  /* Colunas iguais em todas as seções: montadas uma vez. Os dois seletores ficam na
     linha porque trocar status é a ação mais frequente da tela; o resto do item abre
     no painel. */
  const colunas = useMemo(
    () => [
      {
        chave: 'codigo',
        titulo: 'Item',
        larguraMinima: 88,
        render: (item) => (
          <span className="font-mono text-[11px] font-bold text-[#8A9990] whitespace-nowrap">
            {item?.codigo}
          </span>
        ),
      },
      {
        chave: 'exigencia',
        titulo: 'Evidência exigida',
        larguraMinima: 300,
        render: (item) => (
          <div className="min-w-0">
            <p className="text-xs text-[#1A2B1F] leading-snug break-words">{item?.exigencia}</p>

            {item?.encaminhado_para && (
              <span className="inline-flex mt-1.5">
                <Badge tom="ambar" tamanho="sm" icone={Scale}>
                  Aguarda {ENCAMINHAMENTOS[item.encaminhado_para] || item.encaminhado_para}
                </Badge>
              </span>
            )}

            {item?.observacoes && (
              <p className="text-[11px] text-[#5C7060] italic leading-relaxed mt-1 line-clamp-2">
                {item.observacoes}
              </p>
            )}
          </div>
        ),
      },
      {
        chave: 'status_resposta',
        titulo: 'Resposta',
        larguraMinima: 168,
        render: (item) => (
          <SeletorStatus
            valor={item?.status_resposta}
            opcoes={OPCOES_RESPOSTA}
            onChange={(valor) => aoAlterarItem(item?.id, { status_resposta: valor })}
            carregando={salvandoId === item?.id}
            rotuloAcessivel={`Resposta do item ${item?.codigo}`}
          />
        ),
      },
      {
        chave: 'estado_evidencia',
        titulo: 'Evidência',
        larguraMinima: 168,
        render: (item) => (
          <SeletorStatus
            valor={item?.estado_evidencia}
            opcoes={OPCOES_EVIDENCIA}
            onChange={(valor) => aoAlterarItem(item?.id, { estado_evidencia: valor })}
            carregando={salvandoId === item?.id}
            rotuloAcessivel={`Estado da evidência do item ${item?.codigo}`}
          />
        ),
      },
      {
        chave: 'documentos_vinculados',
        titulo: 'Documentos',
        larguraMinima: 132,
        render: (item) => <ContagemDocumentos item={item} />,
      },
      {
        chave: 'acoes',
        titulo: '',
        alinhamento: 'direita',
        larguraMinima: 108,
        render: (item) => (
          <BotaoSecundario
            variante="fantasma"
            tamanho="sm"
            icone={Pencil}
            onClick={() => setItemAbertoId(item?.id)}
          >
            Detalhes
          </BotaoSecundario>
        ),
      },
    ],
    // Dependência única de propósito: `aoAlterarItem` e `setItemAbertoId` são estáveis
    // o bastante (a primeira só fecha sobre a mutação, que o React Query mantém), e o
    // que de fato muda o conteúdo das células é salvandoId.
    [salvandoId],
  );

  /* ===== Estados de exceção, antes do conteúdo ===== */

  if (!projetoId) {
    return (
      <TelaAviso
        titulo="Projeto não informado"
        texto="A URL do checklist de evidências precisa incluir o identificador do projeto."
      />
    );
  }

  const codigoErro = projetoQuery.error?.codigo || checklistQuery.error?.codigo || null;
  if (codigoErro === 'nao_encontrado' || codigoErro === 'id_invalido') {
    return (
      <TelaAviso
        titulo="Projeto não encontrado"
        texto="O projeto pode ter sido removido, ou o endereço está incorreto."
      />
    );
  }

  const carregando = projetoQuery.isLoading || checklistQuery.isLoading;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Volta explícita: o item do menu fica aceso em "Projetos", mas o caminho de
          volta precisa existir na própria tela. */}
      <Link
        to={createPageUrl('Projetos')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C7060] hover:text-[#1A4731] transition-colors"
      >
        <ArrowLeft size={13} />
        Projetos
      </Link>

      {/* ===== Cabeçalho: os DOIS eixos, lado a lado ===== */}
      <Cartao
        icone={ClipboardCheck}
        titulo={projeto?.nome || (carregando ? 'Carregando projeto...' : 'Projeto sem nome')}
        subtitulo={
          `Checklist de auditoria no padrão ${projeto?.standard || 'VCS+CCB'}` +
          ` · ${progresso.itens} ${plural(progresso.itens, 'item', 'itens')}` +
          (progresso.encaminhados > 0
            ? ` · ${progresso.encaminhados} aguardando outra área`
            : '')
        }
        acao={
          <BotaoSecundario como="link" para={urlPdd(projetoId)} icone={ListTree} tamanho="sm">
            PDD
          </BotaoSecundario>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ResumoEixo
            titulo="Resposta redigida"
            explicacao="O texto que responde ao item do padrão."
            pct={resposta.pct}
            feitos={resposta.concluidos}
            total={resposta.total}
            naoAplicaveis={resposta.nao_aplicaveis}
            tom="laranja"
            extra={
              resposta.em_andamento > 0 ? (
                <p className="text-[11px] text-[#8A9990] mt-1.5">
                  {resposta.em_andamento} em andamento.
                </p>
              ) : null
            }
          />
          <ResumoEixo
            titulo="Evidência aceita"
            explicacao="O arquivo que comprova, aceito pela validadora."
            pct={evidencia.pct}
            feitos={evidencia.aceitas}
            total={evidencia.total}
            naoAplicaveis={evidencia.nao_aplicaveis}
            tom="azul"
            extra={
              evidencia.anexadas > 0 || evidencia.pendentes > 0 ? (
                <p className="text-[11px] text-[#8A9990] mt-1.5">
                  {evidencia.anexadas} anexada{evidencia.anexadas === 1 ? '' : 's'} aguardando
                  aceite, {evidencia.pendentes} sem arquivo.
                </p>
              ) : null
            }
          />
        </div>

        {/* Os dois eixos andam separados de propósito, e isso precisa estar dito: um
            item concluído com evidência pendente não é inconsistência, é o estado
            normal de metade da auditoria. */}
        {itens.length > 0 && (
          <p className="text-[11px] text-[#8A9990] mt-5 leading-relaxed">
            Os dois percentuais são independentes: um item pode estar com a resposta
            concluída e a evidência ainda pendente.
          </p>
        )}

        {progresso.na_com_evidencia_pendente > 0 && (
          <AvisoDiscreto
            tom="ambar"
            className="mt-3"
            titulo="Itens não aplicáveis com evidência pendente."
          >
            {progresso.na_com_evidencia_pendente}{' '}
            {plural(progresso.na_com_evidencia_pendente, 'item está', 'itens estão')} com a
            resposta marcada como não aplicável e a evidência ainda pendente. Enquanto
            ficarem assim, o eixo da evidência não fecha: confirme se a evidência também
            não se aplica.
          </AvisoDiscreto>
        )}

        {!vinculosDisponiveis && itens.length > 0 && (
          <AvisoDiscreto
            className="mt-3"
            texto="A contagem de documentos vinculados não está disponível neste ambiente, por isso a coluna Documentos aparece como indisponível. O estado da evidência continua valendo."
          />
        )}
      </Cartao>

      {/* ===== Corpo ===== */}
      {carregando ? (
        <Cartao>
          <Carregando rotulo="Carregando o checklist de evidências" />
        </Cartao>
      ) : checklistQuery.isError ? (
        <TelaAviso
          titulo="Não foi possível carregar o checklist"
          texto="Houve uma falha ao buscar os itens. Se o aviso continuar, avise a equipe responsável pelo sistema."
        />
      ) : itens.length === 0 ? (
        <EstadoVazio
          comSuperficie
          icone={ClipboardCheck}
          titulo="Este projeto ainda não tem checklist de evidências"
          texto="A lista de evidências é padrão da metodologia, então não precisa ser digitada: crie o checklist a partir do template e o projeto já nasce com todas as exigências, agrupadas pela seção do padrão que as cobra."
          acao={
            <BotaoPrimario
              icone={Sparkles}
              onClick={() => criar.mutate()}
              carregando={criar.isPending}
            >
              Criar checklist a partir do template {projeto?.standard || 'VCS+CCB'}
            </BotaoPrimario>
          }
        />
      ) : (
        <div className="space-y-4">
          {secoes.map((grupo) => (
            <Cartao
              key={grupo.secao}
              titulo={grupo.secao}
              nivelTitulo={3}
              semPaddingCorpo
              acao={<ProgressoSecao progresso={progressoPorSecao.get(grupo.secao)} />}
            >
              <Tabela
                comSuperficie={false}
                legenda={`Evidências exigidas na seção ${grupo.secao}`}
                colunas={colunas}
                dados={grupo.itens}
                classeLinha={(item) =>
                  item?.status_resposta === 'nao_aplicavel' &&
                  item?.estado_evidencia === 'nao_aplicavel'
                    ? 'opacity-60'
                    : ''
                }
              />
            </Cartao>
          ))}
        </div>
      )}

      {itemAberto && (
        <PainelItem
          key={itemAberto.id}
          item={itemAberto}
          salvando={salvandoId === itemAberto.id}
          onFechar={() => setItemAbertoId(null)}
          onSalvar={salvarDoPainel}
        />
      )}
    </div>
  );
}

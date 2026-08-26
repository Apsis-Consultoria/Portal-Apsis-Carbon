/**
 * Pipeline - prospecção de novos negócios, com avaliação por critérios ponderados.
 *
 * O QUE ESTA TELA RESOLVE. No Notion, a base "Novos Negócios" tem três registros e três
 * colunas: Nome, Tipo e Metodologia. Tipo e Metodologia estão VAZIAS nos três, apesar de
 * serem exatamente os dois atributos que definem viabilidade de um projeto de carbono.
 * Hoje, portanto, a triagem é avaliação livre: sem critério comparável e sem registro do
 * porquê. A matriz de critérios com peso é o que muda isso, e é pedido literal da página
 * de levantamento.
 *
 * QUATRO DECISÕES QUE O DADO IMPÔS:
 *
 * 1. A NOTA NUNCA APARECE SOZINHA. Ela vem sempre acompanhada da cobertura (quantos dos
 *    critérios ativos foram avaliados), porque 9,0 com um critério de oito não é
 *    comparável com 7,5 com os oito. Nota isolada é meia-verdade com aparência de
 *    precisão, e a coluna "Avaliação" existe justamente para as duas andarem juntas.
 *
 * 2. NÃO AVALIADO NÃO É ZERO. Critério sem nota fica fora do denominador da média, e na
 *    matriz aparece como linha vazia e não como 0. Tratar ausência como zero puniria
 *    quem ainda está em análise e inverteria a ordem do funil. Limpar uma nota APAGA a
 *    linha em vez de gravar zero.
 *
 * 3. O RESUMO E O PANORAMA IGNORAM OS FILTROS. Filtrar por segmento e ver o funil só
 *    daquele segmento esconderia que os outros dois existem, e a comparação entre
 *    segmentos é o que a análise pede ("um slide para TI, um para REDD privado, um para
 *    agro"). Quem filtra muda a LISTA; o retrato do funil continua sendo do todo.
 *
 * 4. A OBSERVAÇÃO DO CANDIDATO É CONTEÚDO, NÃO RODAPÉ. A Flona Tapajós está classificada
 *    como `redd_privado` e a observação diz que a classificação está errada: Floresta
 *    Nacional é unidade de conservação federal e o enum de segmento não tem categoria
 *    para ela. Esconder esse texto faria o erro conhecido parecer deliberado e o
 *    panorama contaria uma UC federal como negócio privado sem nenhum aviso. Por isso a
 *    linha ganha um sinal na lista e o painel abre com a observação em destaque.
 *
 * PROMOVER A PROJETO É O GESTO MAIS CONSEQUENTE DAQUI e por isso é o único com passo de
 * confirmação: cria uma linha em carbon_projetos que passa a existir no cadastro para
 * todo mundo. É idempotente no servidor (o segundo clique devolve o projeto que já
 * existe), mas idempotência protege contra o clique duplo, não contra o clique errado.
 *
 * AUTORIZAÇÃO: quem pode escrever é decidido no SERVIDOR (papel admin ou gestor; 403
 * 'sem_permissao'). A tela não esconde ações por perfil, pelo mesmo motivo documentado
 * em Fornecedores: seria uma segunda fonte de verdade para a mesma regra e ficaria
 * dessincronizada do backend na primeira mudança.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Target, Scale, MapPin, Info, Search, WifiOff, TriangleAlert, Sprout,
  ArrowRight, Trash2, CircleHelp, Handshake, Plus} from 'lucide-react';
import {
  listarPipeline,
  listarParceiros,
  obterCandidato,
  compararCandidatos,
  atualizarCandidato,
  avaliarCriterio,
  removerNota,
  promoverAProjeto,
} from '@/lib/api/pipeline';
import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import { urlPdd } from '@/lib/pageRoutes';
import Cartao from '@/components/ui/Cartao';
import Tabela from '@/components/ui/Tabela';
import Badge from '@/components/ui/Badge';
import Campo from '@/components/ui/Campo';
import EstadoVazio from '@/components/ui/EstadoVazio';
import Carregando from '@/components/ui/Carregando';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import PainelLateral from '@/components/ui/PainelLateral';
import FormularioCandidato from '@/components/FormularioCandidato';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';

/* ===== Domínio ============================================================
   Espelham os CHECK de carbon_candidatos. Valor fora destes mapas ainda aparece na tela,
   com o rótulo cru: uma etapa nova criada no banco antes do deploy do frontend não pode
   deixar a linha sem identificação.

   A ORDEM DAS ETAPAS é a do funil, a mesma do etapa_ordem da view. */
const ETAPAS = [
  { chave: 'triagem', rotulo: 'Triagem', tom: 'neutro' },
  { chave: 'analise_preliminar', rotulo: 'Análise preliminar', tom: 'azul' },
  { chave: 'proposta_viabilidade', rotulo: 'Proposta de viabilidade', tom: 'laranja' },
  { chave: 'aprovado', rotulo: 'Aprovado', tom: 'verde' },
  { chave: 'descartado', rotulo: 'Descartado', tom: 'vermelho' },
];

const SEGMENTOS = [
  { chave: 'terra_indigena', rotulo: 'Terra indígena' },
  { chave: 'redd_privado', rotulo: 'REDD privado' },
  { chave: 'agro', rotulo: 'Agro' },
];

const rotuloEtapa = (chave) => ETAPAS.find((e) => e.chave === chave)?.rotulo ?? chave ?? '-';
const tomEtapa = (chave) => ETAPAS.find((e) => e.chave === chave)?.tom ?? 'neutro';
const rotuloSegmento = (chave) => SEGMENTOS.find((s) => s.chave === chave)?.rotulo ?? chave ?? '-';

/** Teto da comparação. O servidor recusa acima disso; aqui o botão para de aceitar antes. */
const MAXIMO_COMPARACAO = 6;

/* ===== Formatação ========================================================= */

const NUMERO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const INTEIRO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

function fmtNumero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? NUMERO.format(n) : '-';
}

/** Área em hectares sem casas decimais: na triagem o número é estimativa, e "328.000,00
    ha" sugere uma precisão que a conversa que originou o número não tem. */
function fmtArea(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n === 0) return '-';
  return `${INTEIRO.format(n)} ha`;
}

/** Preço de referência COM a moeda sempre visível: USD 8,50 e BRL 8,50 na mesma coluna,
    sem o símbolo, são um erro de fator cinco esperando para acontecer. */
function fmtPreco(valor, moeda) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '-';
  return `${moeda || 'USD'} ${NUMERO.format(n)}`;
}

/** Coluna `date` do Postgres chega como 'AAAA-MM-DD'. Convertida à mão porque
    new Date('2026-01-01') é meia-noite UTC e mostraria o dia anterior no fuso do Brasil. */
function fmtData(valor) {
  if (!valor) return '-';
  const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : String(valor);
}

/** Localização legível a partir de município e UF, que são independentes e opcionais. */
function fmtLocal(candidato) {
  const partes = [candidato?.municipio, candidato?.uf].filter(Boolean);
  return partes.length ? partes.join(' - ') : null;
}

/* ===== Avaliação ==========================================================
   A NOTA E A COBERTURA ANDAM JUNTAS. Este é o único lugar da tela que desenha nota
   ponderada, e ele sempre desenha a cobertura ao lado. Ter um segundo lugar que mostrasse
   só o número reabriria a comparação enganosa que a regra 1 do cabeçalho fecha. */
function Avaliacao({ candidato, compacto = false }) {
  const avaliados = Number(candidato?.criterios_avaliados ?? 0);
  const ativos = Number(candidato?.criterios_ativos ?? 0);

  if (!avaliados) {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-400">
        <CircleHelp className="w-3.5 h-3.5" />
        Sem avaliação
      </span>
    );
  }

  const cobertura = Number(candidato?.cobertura_pct ?? 0);
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="font-medium tabular-nums text-slate-800">
        {fmtNumero(candidato?.nota_ponderada)}
      </span>
      <span className={compacto ? 'text-xs text-slate-400' : 'text-xs text-slate-500'}>
        {avaliados} de {ativos} critérios
        {cobertura < 100 ? ` (${fmtNumero(cobertura)}%)` : ''}
      </span>
    </span>
  );
}

/* ===== Linha da matriz de critérios =======================================
   Estado local enquanto edita, e não um estado global de formulário: com oito critérios
   abertos ao mesmo tempo, digitar a justificativa de um re-renderizaria a matriz inteira
   a cada tecla. É o mesmo motivo da célula editável da tela de Indicadores. */
function LinhaCriterio({ criterio, nota, salvando, aoSalvar, aoLimpar }) {
  const [valor, setValor] = useState(nota ? String(nota.nota) : '');
  const [justificativa, setJustificativa] = useState(nota?.justificativa ?? '');

  const original = nota ? String(nota.nota) : '';
  const mudou = valor !== original || justificativa !== (nota?.justificativa ?? '');

  function salvar() {
    const limpo = valor.trim().replace(',', '.');
    if (limpo === '') {
      toast.error('Informe a nota, de 0 a 10. Para tirar a avaliação, use "Limpar".');
      return;
    }
    const n = Number(limpo);
    if (!Number.isFinite(n) || n < 0 || n > 10) {
      toast.error('A nota precisa ser um número entre 0 e 10.');
      return;
    }
    aoSalvar({ criterio_id: criterio.id, nota: n, justificativa: justificativa.trim() || null });
  }

  return (
    <div className="py-3 border-b border-[#EEF2F0] last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 leading-snug">{criterio.nome}</p>
          {criterio.descricao ? (
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{criterio.descricao}</p>
          ) : null}
        </div>
        {/* O peso fica à vista porque é ele que explica por que duas notas iguais movem
            a média de formas diferentes. Sem o peso na tela, a matriz parece uma média
            simples que não fecha. */}
        <Badge tom="neutro" tamanho="sm" className="shrink-0 tabular-nums">
          peso {fmtNumero(criterio.peso)}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Nota</span>
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0 a 10"
            className="w-20 px-2.5 py-1.5 text-sm text-right tabular-nums border border-[#DDE3DE] rounded-lg outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
            aria-label={`Nota de ${criterio.nome}`}
          />
        </label>

        <label className="flex flex-col gap-1 flex-1 min-w-[12rem]">
          <span className="text-xs text-slate-500">Justificativa</span>
          <input
            type="text"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Por que esta nota"
            className="w-full px-2.5 py-1.5 text-sm border border-[#DDE3DE] rounded-lg outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
            aria-label={`Justificativa da nota de ${criterio.nome}`}
          />
        </label>

        <div className="flex items-center gap-1.5">
          <BotaoSecundario onClick={salvar} desabilitado={!mudou} carregando={salvando}>
            Salvar
          </BotaoSecundario>
          {nota ? (
            <BotaoSecundario
              variante="perigo"
              onClick={() => aoLimpar(nota)}
              desabilitado={salvando}
              icone={Trash2}
              rotuloAcessivel={`Limpar a avaliação de ${criterio.nome}`}
            />
          ) : null}
        </div>
      </div>

      {!nota ? (
        // Dito com todas as letras: a ausência de nota NÃO é zero, ela sai do
        // denominador. Sem esta linha, um critério em branco parece nota zero.
        <p className="mt-1.5 text-xs text-slate-400">
          Não avaliado. Fica fora do cálculo da nota e derruba a cobertura.
        </p>
      ) : null}
    </div>
  );
}

export default function Pipeline() {
  const msal = useMsal();
  const clienteQuery = useQueryClient();

  const [segmento, setSegmento] = useState('');
  const [etapa, setEtapa] = useState('');
  const [parceiroId, setParceiroId] = useState('');
  const [busca, setBusca] = useState('');

  const [detalheId, setDetalheId] = useState(null);
  const [selecionados, setSelecionados] = useState([]);
  const [comparando, setComparando] = useState(false);
  const [confirmandoProjeto, setConfirmandoProjeto] = useState(false);
  const [criterioSalvando, setCriterioSalvando] = useState(null);

  const pipelineQuery = useQuery({
    queryKey: ['pipeline', segmento, etapa, parceiroId],
    queryFn: () => listarPipeline(msal, { segmento, etapa, parceiroId }),
    // Mantém a lista anterior visível enquanto a nova chega: sem isto, trocar de filtro
    // pisca a tela inteira para o estado de carregamento e a leitura se perde.
    placeholderData: (anterior) => anterior,
  });

  // null = fechado; { candidato: null } = novo; { candidato } = editar.
  const [painelCandidato, setPainelCandidato] = useState(null);

  const parceirosQuery = useQuery({
    queryKey: ['pipeline-parceiros'],
    queryFn: () => listarParceiros(msal),
  });

  const detalheQuery = useQuery({
    queryKey: ['pipeline-candidato', detalheId],
    queryFn: () => obterCandidato(msal, detalheId),
    enabled: Boolean(detalheId),
  });

  const comparacaoQuery = useQuery({
    queryKey: ['pipeline-comparacao', [...selecionados].sort().join(',')],
    queryFn: () => compararCandidatos(msal, selecionados),
    enabled: comparando && selecionados.length >= 2,
  });

  function recarregar() {
    clienteQuery.invalidateQueries({ queryKey: ['pipeline'] });
    clienteQuery.invalidateQueries({ queryKey: ['pipeline-candidato'] });
    clienteQuery.invalidateQueries({ queryKey: ['pipeline-comparacao'] });
    clienteQuery.invalidateQueries({ queryKey: ['pipeline-parceiros'] });
  }

  const salvarNota = useMutation({
    mutationFn: ({ candidatoId, dados }) => avaliarCriterio(msal, candidatoId, dados),
    onSuccess: () => {
      recarregar();
      toast.success('Avaliação registrada.');
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível registrar a avaliação.'),
    onSettled: () => setCriterioSalvando(null),
  });

  const limparNota = useMutation({
    mutationFn: (notaId) => removerNota(msal, notaId),
    onSuccess: () => {
      recarregar();
      toast.success('Critério devolvido a "não avaliado".');
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível apagar a avaliação.'),
    onSettled: () => setCriterioSalvando(null),
  });

  const mudarEtapa = useMutation({
    mutationFn: ({ candidatoId, novaEtapa }) =>
      atualizarCandidato(msal, candidatoId, { etapa: novaEtapa }),
    onSuccess: (_dados, variaveis) => {
      recarregar();
      toast.success(`Candidato movido para ${rotuloEtapa(variaveis.novaEtapa)}.`);
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível mudar a etapa.'),
  });

  const converter = useMutation({
    mutationFn: (candidatoId) => promoverAProjeto(msal, candidatoId),
    onSuccess: (resposta) => {
      recarregar();
      setConfirmandoProjeto(false);
      toast.success(
        resposta?.criado
          ? 'Projeto criado a partir do candidato.'
          : 'Este candidato já tinha virado projeto; nada foi duplicado.',
      );
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível criar o projeto.'),
  });

  const dados = pipelineQuery.data;
  const resumo = dados?.resumo ?? null;
  const parceiros = parceirosQuery.data?.parceiros ?? [];

  /* Busca por texto acontece AQUI, e não no servidor: carbon_pipeline_listar não tem
     parâmetro de busca porque o pipeline é curto por natureza e o conjunto inteiro já
     veio. Filtrar no navegador evita uma ida ao servidor por tecla digitada. */
  const candidatos = useMemo(() => {
    const lista = dados?.candidatos ?? [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return lista;
    return lista.filter((c) =>
      [c.nome, c.municipio, c.uf, c.parceiro_nome, c.metodologia]
        .some((campo) => String(campo ?? '').toLowerCase().includes(termo)),
    );
  }, [dados, busca]);

  const detalhe = detalheQuery.data;
  const candidatoAberto = detalhe?.candidato ?? null;

  /* Índice criterio_id -> nota, para a matriz não varrer o array a cada linha. */
  const notaPorCriterio = useMemo(() => {
    const mapa = new Map();
    for (const n of detalhe?.notas ?? []) mapa.set(n.criterio_id, n);
    return mapa;
  }, [detalhe]);

  function alternarSelecao(id) {
    setSelecionados((atual) => {
      if (atual.includes(id)) return atual.filter((x) => x !== id);
      if (atual.length >= MAXIMO_COMPARACAO) {
        toast.error(`Compare no máximo ${MAXIMO_COMPARACAO} candidatos por vez.`);
        return atual;
      }
      return [...atual, id];
    });
  }

  function abrirDetalhe(id) {
    setDetalheId(id);
    setConfirmandoProjeto(false);
  }

  function fecharDetalhe() {
    setDetalheId(null);
    setConfirmandoProjeto(false);
  }

  const colunas = [
    {
      chave: 'selecao',
      titulo: <span className="sr-only">Selecionar para comparar</span>,
      larguraMinima: 44,
      render: (linha) => (
        <input
          type="checkbox"
          checked={selecionados.includes(linha.id)}
          onChange={() => alternarSelecao(linha.id)}
          className="w-4 h-4 rounded border-[#DDE3DE] accent-[#F47920]"
          aria-label={`Comparar ${linha.nome}`}
        />
      ),
    },
    {
      chave: 'nome',
      titulo: 'Candidato',
      larguraMinima: 260,
      render: (linha) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-800">{linha.nome}</span>
            {/* Sinal da observação na PRÓPRIA linha, e não só dentro do painel: é assim
                que o caso da Flona Tapajós (classificação sabidamente errada) aparece
                para quem só passa o olho na lista. */}
            {linha.observacoes ? (
              <TriangleAlert
                role="img"
                className="w-3.5 h-3.5 text-amber-500 shrink-0"
                aria-label="Este candidato tem uma observação registrada"
              />
            ) : null}
            {linha.convertido ? (
              <Badge tom="verde" tamanho="sm">
                virou projeto
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {fmtLocal(linha) ?? 'Localização não informada'}
            {linha.metodologia ? ` - ${linha.metodologia}` : ''}
          </p>
        </div>
      ),
    },
    {
      chave: 'segmento',
      titulo: 'Segmento',
      larguraMinima: 130,
      render: (linha) => <span className="text-slate-600">{rotuloSegmento(linha.segmento)}</span>,
    },
    {
      chave: 'etapa',
      titulo: 'Etapa',
      larguraMinima: 170,
      render: (linha) => (
        <Badge tom={tomEtapa(linha.etapa)} tamanho="sm">
          {rotuloEtapa(linha.etapa)}
        </Badge>
      ),
    },
    {
      chave: 'avaliacao',
      titulo: 'Avaliação',
      larguraMinima: 200,
      render: (linha) => <Avaliacao candidato={linha} compacto />,
    },
    {
      chave: 'parceiro_nome',
      titulo: 'Parceiro',
      larguraMinima: 150,
      render: (linha) =>
        linha.parceiro_nome ? (
          <span className="text-slate-600">{linha.parceiro_nome}</span>
        ) : (
          // Área sem parceiro é área sem porta de entrada. Vale a pena dizer isso em vez
          // de deixar a célula em branco, que se lê como "não preencheram ainda".
          <span className="text-[#5C7060]">sem parceiro</span>
        ),
    },
    {
      chave: 'area_estimada_ha',
      titulo: 'Área',
      numerica: true,
      larguraMinima: 110,
      render: (linha) => fmtArea(linha.area_estimada_ha),
    },
    {
      chave: 'detalhe',
      titulo: <span className="sr-only">Detalhes</span>,
      larguraMinima: 44,
      render: (linha) => (
        <button
          type="button"
          onClick={() => abrirDetalhe(linha.id)}
          className="p-1 rounded-lg text-[#5C7060] hover:text-[#F47920] hover:bg-amber-50 transition-colors"
          aria-label={`Abrir a avaliação de ${linha.nome}`}
        >
          <Info className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {MODO_DEMO && MODO_DEMO_ATIVO() ? (
        <AvisoDiscreto tom="ambar">
          Modo demonstração: o pipeline abaixo é um recorte de exemplo e as alterações não
          são gravadas.
        </AvisoDiscreto>
      ) : null}

      {/* ===== Funil ========================================================
          As pílulas são o resumo E o filtro por etapa, de propósito: separar as duas
          coisas produziria dois lugares dizendo o mesmo número, e um deles ficaria
          desatualizado. A contagem é sempre do funil INTEIRO, mesmo com filtro de
          segmento ou parceiro aplicado (regra 3 do cabeçalho). */}
      <Cartao
        titulo="Funil de prospecção"
        subtitulo={
          resumo
            ? `${resumo.total} ${resumo.total === 1 ? 'área candidata' : 'áreas candidatas'}, ${fmtArea(resumo.area_total_ha)} no total. A contagem é do funil inteiro e não muda com os filtros.`
            : 'Áreas candidatas a se tornarem projeto de carbono.'
        }
        icone={Target}
        tomIcone="laranja"
      >
        {pipelineQuery.isLoading ? (
          <Carregando rotulo="Carregando o pipeline" />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ETAPAS.map((e) => {
                const ativo = etapa === e.chave;
                const qtd = resumo?.por_etapa?.[e.chave] ?? 0;
                return (
                  <button
                    key={e.chave}
                    type="button"
                    onClick={() => setEtapa(ativo ? '' : e.chave)}
                    aria-pressed={ativo}
                    className={[
                      'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm border transition-colors',
                      ativo
                        ? 'bg-[#F47920] text-white border-[#F47920] shadow-sm'
                        : 'bg-white text-slate-600 border-[#DDE3DE] hover:border-[#F47920]/50',
                    ].join(' ')}
                  >
                    {e.rotulo}
                    <span
                      className={[
                        'text-xs tabular-nums px-1.5 py-0.5 rounded-md',
                        ativo ? 'bg-white/20' : 'bg-slate-100 text-slate-500',
                      ].join(' ')}
                    >
                      {qtd}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Os três números que medem a qualidade do pipeline, e não o tamanho dele.
                `sem_avaliacao` é o mais importante: é quantos candidatos seguem em
                avaliação livre, ou seja o problema que a matriz de critérios resolve. */}
            {resumo ? (
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="rounded-xl border border-[#DDE3DE] px-3 py-2">
                  <dt className="text-xs text-slate-500">Sem avaliação</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-slate-800">
                    {resumo.sem_avaliacao ?? 0}
                  </dd>
                </div>
                <div className="rounded-xl border border-[#DDE3DE] px-3 py-2">
                  <dt className="text-xs text-slate-500">Sem parceiro</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-slate-800">
                    {resumo.sem_parceiro ?? 0}
                  </dd>
                </div>
                <div className="rounded-xl border border-[#DDE3DE] px-3 py-2">
                  <dt className="text-xs text-slate-500">Nota média</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-slate-800">
                    {resumo.nota_media === null || resumo.nota_media === undefined
                      ? '-'
                      : fmtNumero(resumo.nota_media)}
                  </dd>
                </div>
                <div className="rounded-xl border border-[#DDE3DE] px-3 py-2">
                  <dt className="text-xs text-slate-500">Viraram projeto</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-slate-800">
                    {resumo.convertidos ?? 0}
                  </dd>
                </div>
              </dl>
            ) : null}

            {/* Panorama por segmento: um bloco por segmento SEMPRE, inclusive zerado.
                Segmento sem candidato nenhum é informação (ninguém está prospectando
                agro), e escondê-lo faria o panorama mentir por omissão. */}
            <div className="grid gap-3 sm:grid-cols-3">
              {(dados?.por_segmento ?? []).map((s) => (
                <div key={s.segmento} className="rounded-xl border border-[#DDE3DE] px-3 py-2.5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {rotuloSegmento(s.segmento)}
                  </p>
                  <p className="mt-1 text-sm text-slate-800">
                    <span className="font-medium tabular-nums">{s.candidatos}</span>{' '}
                    {s.candidatos === 1 ? 'candidata' : 'candidatas'}
                    {s.candidatos > 0 ? ` - ${fmtArea(s.area_total_ha)}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {s.candidatos === 0
                      ? 'Ninguém está prospectando este segmento.'
                      : `Nota média ${s.nota_media === null ? '-' : fmtNumero(s.nota_media)} - ${s.sem_avaliacao} sem avaliação`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Cartao>

      {/* ===== Lista ======================================================== */}
      <Cartao
        titulo="Áreas candidatas"
        subtitulo="Marque duas ou mais para comparar lado a lado."
        icone={Sprout}
        tomIcone="verde"
        semPaddingCorpo
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar área, município ou parceiro"
                className="w-full sm:w-72 pl-9 pr-3 py-2 text-sm border border-[#DDE3DE] rounded-xl outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
              />
            </div>
            <BotaoSecundario
              onClick={() => setPainelCandidato({ candidato: null })}
              icone={Plus}
            >
              Novo candidato
            </BotaoSecundario>
            <BotaoPrimario
              onClick={() => setComparando(true)}
              desabilitado={selecionados.length < 2}
              icone={Scale}
              titulo={
                selecionados.length < 2
                  ? 'Marque pelo menos dois candidatos na lista'
                  : undefined
              }
            >
              Comparar ({selecionados.length})
            </BotaoPrimario>
          </div>
        }
      >
        <div className="px-4 pt-3 flex flex-wrap gap-3">
          <Campo
            rotulo="Segmento"
            tipo="select"
            valor={segmento}
            onChange={setSegmento}
            opcoes={SEGMENTOS.map((s) => ({ valor: s.chave, rotulo: s.rotulo }))}
            rotuloVazio="Todos os segmentos"
            className="w-full sm:w-56"
          />
          <Campo
            rotulo="Parceiro"
            tipo="select"
            valor={parceiroId}
            onChange={setParceiroId}
            opcoes={parceiros.map((p) => ({ valor: p.id, rotulo: p.nome }))}
            rotuloVazio="Todos os parceiros"
            className="w-full sm:w-56"
          />
        </div>

        <div className="p-4">
          <Tabela
            colunas={colunas}
            dados={candidatos}
            legenda="Áreas candidatas do pipeline de prospecção, com etapa, segmento, nota de avaliação e parceiro"
            carregando={pipelineQuery.isLoading}
            rotuloCarregando="Carregando as áreas candidatas"
            erro={pipelineQuery.isError ? pipelineQuery.error : false}
            mensagemErro={
              pipelineQuery.error?.message ?? 'Verifique a conexão e tente novamente.'
            }
            iconeVazio={busca || segmento || etapa || parceiroId ? Search : Target}
            tituloVazio={
              busca || segmento || etapa || parceiroId
                ? 'Nenhuma área candidata para este recorte'
                : 'Nenhuma área candidata registrada'
            }
            textoVazio={
              busca || segmento || etapa || parceiroId
                ? 'Limpe os filtros ou tente outro termo para ver o pipeline inteiro.'
                : 'As áreas entram no pipeline no dia em que alguém as menciona; o resto é o trabalho de triagem.'
            }
            comSuperficie={false}
          />
        </div>
      </Cartao>

      {/* ===== Painel de detalhe e matriz =================================== */}
      <PainelLateral
        aberto={Boolean(detalheId)}
        onFechar={fecharDetalhe}
        titulo={candidatoAberto?.nome ?? 'Candidato'}
        subtitulo={
          candidatoAberto
            ? `${rotuloSegmento(candidatoAberto.segmento)}${fmtLocal(candidatoAberto) ? ` - ${fmtLocal(candidatoAberto)}` : ''}`
            : undefined
        }
        icone={Target}
        largura="lg"
        fecharAoClicarFora={false}
        rodape={
          candidatoAberto ? (
            <RodapeConversao
              candidato={candidatoAberto}
              confirmando={confirmandoProjeto}
              convertendo={converter.isPending}
              aoPedirConfirmacao={() => setConfirmandoProjeto(true)}
              aoCancelar={() => setConfirmandoProjeto(false)}
              aoConfirmar={() => converter.mutate(candidatoAberto.id)}
            />
          ) : null
        }
      >
        {detalheQuery.isLoading ? (
          <Carregando rotulo="Carregando o candidato" />
        ) : detalheQuery.isError ? (
          <EstadoVazio
            icone={WifiOff}
            titulo="Não foi possível carregar o candidato"
            texto={detalheQuery.error?.message ?? 'Verifique a conexão e tente novamente.'}
          />
        ) : candidatoAberto ? (
          <div className="space-y-5 text-sm">
            {/* A OBSERVAÇÃO VEM PRIMEIRO, e em bloco de aviso. É o caso da Flona
                Tapajós: o texto diz que o segmento está errado porque o enum não tem
                categoria para unidade de conservação federal. Escondido no fim do
                painel, esse aviso não seria lido por quem decide. */}
            {candidatoAberto.observacoes ? (
              <AvisoDiscreto tom="ambar" titulo="Observação registrada" icone={TriangleAlert}>
                {candidatoAberto.observacoes}
              </AvisoDiscreto>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Badge tom={tomEtapa(candidatoAberto.etapa)}>{rotuloEtapa(candidatoAberto.etapa)}</Badge>
              <Avaliacao candidato={candidatoAberto} />
            </div>

            {/* Mudar de etapa é a ação corriqueira e fica à mão. Descartar é uma etapa e
                não uma exclusão: candidato descartado por uma falha que depois se
                resolve volta ao funil, e apagar o registro levaria junto a memória de
                qual era a falha. */}
            <div className="flex flex-wrap gap-1.5">
              {ETAPAS.map((e) => (
                <button
                  key={e.chave}
                  type="button"
                  disabled={e.chave === candidatoAberto.etapa || mudarEtapa.isPending}
                  onClick={() =>
                    mudarEtapa.mutate({ candidatoId: candidatoAberto.id, novaEtapa: e.chave })
                  }
                  className={[
                    'px-2.5 py-1 rounded-lg text-xs border transition-colors',
                    e.chave === candidatoAberto.etapa
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default'
                      : 'bg-white text-slate-600 border-[#DDE3DE] hover:border-[#F47920]/50 hover:text-[#F47920]',
                  ].join(' ')}
                >
                  {e.rotulo}
                </button>
              ))}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Info2 rotulo="Parceiro" valor={candidatoAberto.parceiro_nome} icone={Handshake} />
              <Info2 rotulo="Localização" valor={fmtLocal(candidatoAberto)} icone={MapPin} />
              <Info2 rotulo="Área estimada" valor={fmtArea(candidatoAberto.area_estimada_ha)} />
              <Info2 rotulo="Metodologia" valor={candidatoAberto.metodologia} />
              <Info2
                rotulo="Preço de referência"
                valor={
                  candidatoAberto.preco_mercado_ref === null
                    ? null
                    : `${fmtPreco(candidatoAberto.preco_mercado_ref, candidatoAberto.preco_mercado_moeda)} em ${fmtData(candidatoAberto.preco_mercado_data)}`
                }
              />
              {/* Três estados, e o terceiro precisa dizer o próprio nome: NULL é "ainda
                  não avaliado" e é diferente de "não elegível". Mostrar os dois como
                  "não" transformaria uma pendência em uma decisão. */}
              <Info2
                rotulo="Elegível ao CORSIA"
                valor={
                  candidatoAberto.elegivel_corsia === true
                    ? 'Há indícios de elegibilidade'
                    : candidatoAberto.elegivel_corsia === false
                      ? 'Avaliado: não elegível'
                      : 'Ainda não avaliado'
                }
              />
            </dl>

            {[
              ['Premissas da viabilidade', candidatoAberto.premissas],
              ['O que joga contra', candidatoAberto.falhas],
              ['O que joga a favor', candidatoAberto.virtudes],
            ].map(([rotulo, valor]) =>
              valor ? (
                <div key={rotulo}>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    {rotulo}
                  </p>
                  <p className="mt-0.5 text-slate-700 whitespace-pre-line leading-relaxed">
                    {valor}
                  </p>
                </div>
              ) : null,
            )}

            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Matriz de critérios
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                A nota final é a média das notas PONDERADA pelos pesos, apenas sobre os
                critérios avaliados. Critério sem nota fica de fora da conta e derruba a
                cobertura.
              </p>

              <div className="mt-1">
                {(detalhe?.criterios ?? []).map((criterio) => (
                  <LinhaCriterio
                    // A chave inclui o id da nota para o React REMONTAR a linha quando a
                    // nota passa a existir ou deixa de existir. Só com o id do critério,
                    // "Limpar" apagaria a nota no servidor e os campos continuariam
                    // exibindo o valor removido, porque o estado local não é recriado.
                    key={`${criterio.id}|${notaPorCriterio.get(criterio.id)?.id ?? 'vazio'}`}
                    criterio={criterio}
                    nota={notaPorCriterio.get(criterio.id) ?? null}
                    salvando={criterioSalvando === criterio.id}
                    aoSalvar={(dadosNota) => {
                      setCriterioSalvando(criterio.id);
                      salvarNota.mutate({ candidatoId: candidatoAberto.id, dados: dadosNota });
                    }}
                    aoLimpar={(n) => {
                      setCriterioSalvando(criterio.id);
                      limparNota.mutate(n.id);
                    }}
                  />
                ))}
              </div>

              {(detalhe?.criterios ?? []).length === 0 ? (
                <EstadoVazio
                  compacto
                  icone={Scale}
                  titulo="Nenhum critério ativo"
                  texto="Sem critérios não há matriz, e a triagem volta a ser avaliação livre."
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </PainelLateral>

      {/* ===== Painel de comparação ========================================= */}
      <PainelLateral
        aberto={comparando}
        onFechar={() => setComparando(false)}
        titulo="Comparar candidatos"
        subtitulo="Mesmos critérios para todos, que é o que torna a comparação possível."
        icone={Scale}
        largura="xl"
      >
        {comparacaoQuery.isLoading ? (
          <Carregando rotulo="Montando a comparação" />
        ) : comparacaoQuery.isError ? (
          <EstadoVazio
            icone={WifiOff}
            titulo="Não foi possível montar a comparação"
            texto={comparacaoQuery.error?.message ?? 'Verifique a conexão e tente novamente.'}
          />
        ) : (
          <GradeComparacao dados={comparacaoQuery.data} />
        )}
      </PainelLateral>

      {/* Cadastro e edição. Sem isto a tela só sabia avaliar e mover de etapa:
          candidato novo teria que entrar no banco por SQL, e o pipeline
          congelaria nos três que a carga trouxe. */}
      <PainelLateral
        aberto={Boolean(painelCandidato)}
        onFechar={() => setPainelCandidato(null)}
        icone={Sprout}
        titulo={painelCandidato?.candidato ? 'Editar candidato' : 'Novo candidato'}
        subtitulo="Segmento, etapa e preço de referência alimentam a comparação e o panorama."
        largura="lg"
        fecharAoClicarFora={false}
      >
        {painelCandidato && (
          <FormularioCandidato
            candidato={painelCandidato.candidato}
            parceiros={parceiros}
            aoConcluir={() => setPainelCandidato(null)}
            aoCancelar={() => setPainelCandidato(null)}
          />
        )}
      </PainelLateral>
    </div>
  );
}

/* ===== Bloquinho de par rótulo/valor ====================================== */
function Info2({ rotulo, valor, icone: Icone }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">{rotulo}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 text-slate-700">
        {Icone && valor ? <Icone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : null}
        {valor || <span className="text-[#5C7060]">não informado</span>}
      </dd>
    </div>
  );
}

/* ===== Rodapé da conversão ================================================
   O ÚNICO GESTO DA TELA COM PASSO DE CONFIRMAÇÃO, e a confirmação é o próprio rodapé em
   vez de um window.confirm: precisa dizer o QUE vai acontecer (um projeto novo no
   cadastro, com nome, metodologia, UF, município e área copiados) e o que NÃO vai (o
   proponente fica em branco, porque parceiro nem sempre é proponente e adivinhar
   plantaria dado errado justo no campo que a due diligence confere).

   O botão não aparece para quem não está aprovado. O servidor recusa de qualquer forma
   com 'candidato_nao_aprovado', mas oferecer um botão que sempre falha é convite para
   descobrir a regra por tentativa e erro. */
function RodapeConversao({
  candidato,
  confirmando,
  convertendo,
  aoPedirConfirmacao,
  aoCancelar,
  aoConfirmar,
}) {
  if (candidato.convertido) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Este candidato já virou projeto.</p>
        <Link
          to={urlPdd(candidato.projeto_id)}
          className="inline-flex items-center gap-1.5 text-sm text-[#F47920] hover:underline"
        >
          Abrir o projeto
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (candidato.etapa !== 'aprovado') {
    return (
      <p className="text-xs text-slate-500">
        Só candidato na etapa Aprovado vira projeto. Conclua a análise e mova para Aprovado.
      </p>
    );
  }

  if (!confirmando) {
    return (
      <div className="flex justify-end">
        <BotaoPrimario onClick={aoPedirConfirmacao} iconeDireita={ArrowRight}>
          Transformar em projeto
        </BotaoPrimario>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-600 leading-relaxed">
        Isto cria um <strong>projeto de carbono de verdade</strong>, visível no cadastro de
        Projetos, com nome, metodologia, UF, município e área copiados deste candidato. O
        proponente fica em branco de propósito: parceiro nem sempre é o proponente.
      </p>
      <div className="flex justify-end gap-2">
        <BotaoSecundario onClick={aoCancelar} desabilitado={convertendo}>
          Cancelar
        </BotaoSecundario>
        <BotaoPrimario onClick={aoConfirmar} carregando={convertendo}>
          Criar o projeto
        </BotaoPrimario>
      </div>
    </div>
  );
}

/* ===== Grade da comparação ================================================
   Critério nas LINHAS e candidato nas COLUNAS, e não o contrário: os critérios são os
   mesmos para todos e são a régua; a leitura que se quer é correr o olho por uma linha e
   ver quem vai melhor naquele critério. Transposta, cada comparação exigiria pular entre
   colunas distantes.

   O peso fica na coluna do critério porque ele explica por que dois candidatos com a
   mesma média de notas terminam com notas ponderadas diferentes. */
function GradeComparacao({ dados }) {
  const criterios = dados?.criterios ?? [];
  const candidatos = dados?.candidatos ?? [];

  if (candidatos.length === 0) {
    return (
      <EstadoVazio
        icone={Scale}
        titulo="Nada para comparar"
        texto="Os candidatos selecionados não estão mais disponíveis."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <caption className="sr-only">
          Comparação de candidatos do pipeline, critério a critério
        </caption>
        <thead>
          <tr className="border-b border-[#DDE3DE]">
            <th className="text-left font-medium text-slate-500 px-3 py-2.5 min-w-[14rem]">
              Critério
            </th>
            {candidatos.map((c) => (
              <th
                key={c.id}
                className="text-right font-medium text-slate-700 px-3 py-2.5 min-w-[8rem] align-bottom"
              >
                <span className="block leading-snug">{c.nome}</span>
                <span className="block mt-0.5 text-xs font-normal text-slate-400">
                  {rotuloEtapa(c.etapa)}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {criterios.map((criterio) => (
            <tr key={criterio.id} className="border-b border-[#EEF2F0]">
              <td className="px-3 py-2 align-top">
                <span className="text-slate-700">{criterio.nome}</span>
                <span className="ml-1.5 text-xs text-slate-400 tabular-nums">
                  peso {fmtNumero(criterio.peso)}
                </span>
              </td>
              {candidatos.map((c) => {
                const nota = c.notas?.[criterio.id];
                return (
                  <td
                    key={c.id}
                    className="px-3 py-2 text-right tabular-nums align-top"
                    title={nota?.justificativa || undefined}
                  >
                    {nota ? (
                      <span className="text-slate-800">{fmtNumero(nota.nota)}</span>
                    ) : (
                      // Traço apagado, nunca 0: a diferença entre lacuna e resultado.
                      <span className="text-[#5C7060]" aria-label="não avaliado">
                        -
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="bg-[#F6F8F7]">
            <td className="px-3 py-2.5 font-medium text-slate-600">Nota ponderada</td>
            {candidatos.map((c) => (
              <td key={c.id} className="px-3 py-2.5 text-right">
                <span className="block font-semibold tabular-nums text-slate-900">
                  {c.nota_ponderada === null || c.nota_ponderada === undefined
                    ? '-'
                    : fmtNumero(c.nota_ponderada)}
                </span>
                {/* A cobertura embaixo da nota, sempre. É o que impede a leitura errada
                    de "este é melhor" quando um foi avaliado em oito critérios e o outro
                    em dois. */}
                <span className="block text-xs font-normal text-slate-400">
                  {c.criterios_avaliados} de {c.criterios_ativos}
                </span>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>

    </div>
  );
}

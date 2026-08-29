/**
 * ProjetoIndicadores - matriz do Plano de Monitoramento de um projeto.
 *
 * DE ONDE VEM O CONTEÚDO. A planilha "Monitoring Plan - EN.xlsx". A base `Indicadores` do
 * Notion foi aberta ao vivo em 25/08/2026 e está VAZIA: uma tabela com a coluna `Name` e
 * zero registro. Não existe precedente para copiar, e a planilha é a única fonte de
 * estrutura que existe - por isso esta tela é desenhada a partir dela e não do Notion.
 *
 * POR QUE UMA MATRIZ E NÃO UMA LISTA. A planilha é lida na horizontal: a pessoa procura
 * uma linha e corre o olho pelos períodos para ver se o número subiu. Uma lista com
 * "último valor" responderia a pergunta errada - a verificação da VVB não pergunta quanto
 * é hoje, pergunta se houve monitoramento consistente ao longo do período.
 *
 * TRÊS DECISÕES QUE O DADO IMPÔS:
 *
 * 1. NÃO MEDIDO NÃO É ZERO. A planilha escreve 'N/A' quando não mediu e 0 quando mediu
 *    zero, e são coisas diferentes: zero é resultado apurado, ausência é lacuna. Célula
 *    sem medição mostra um traço apagado, nunca 0. Limpar uma célula APAGA a medição em
 *    vez de gravar zero.
 *
 * 2. AS COLUNAS SAEM DO DADO. A série mudou de anual (até 2025) para trimestral (2026) e
 *    vai continuar mudando. Colunas fixas no código significariam um deploy por
 *    trimestre; aqui o servidor devolve os períodos que existem e a coluna nova aparece
 *    sozinha.
 *
 * 3. UM PLANO POR VEZ. Clima, Comunidade e Biodiversidade têm metodologias e unidades que
 *    não se comparam (ha, tCO2e/ha, sp/ha, Days, %). Empilhar os três na mesma tabela
 *    convidaria a somar o que não soma.
 */

import { Fragment, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, BarChart3, Leaf, Users, TreePine, Settings2, Search,
  WifiOff, Info, Loader2,
} from 'lucide-react';
import { obterProjeto } from '@/lib/carbonApi';
import { listarIndicadores, registrarMedicao, removerMedicao } from '@/lib/api/indicadores';
import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import { createPageUrl } from '@/utils';
import Cartao from '@/components/ui/Cartao';
import EstadoVazio from '@/components/ui/EstadoVazio';
import Carregando from '@/components/ui/Carregando';
import Badge from '@/components/ui/Badge';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import PainelLateral from '@/components/ui/PainelLateral';

/* ===== Domínio ============================================================
   Espelha o CHECK de carbon_indicadores.plano, mais a pseudo-aba 'internos' (plano NULL),
   que é como a tabela guarda o indicador ligado a uma meta da equipe em vez de ao Plano
   de Monitoramento. A ordem é a da planilha: Clima, Comunidade, Biodiversidade.   */
const PLANOS = [
  {
    chave: 'clima',
    rotulo: 'Clima',
    icone: Leaf,
    tom: 'verde',
    nota: 'Parâmetros das metodologias VM0048 e VMD0055. O código é o nome pelo qual a VVB cobra o parâmetro.',
  },
  {
    chave: 'comunidade',
    rotulo: 'Comunidade',
    icone: Users,
    tom: 'azul',
    nota: 'Indicadores sociais derivados da Teoria da Mudança construída nas consultas CLPI.',
  },
  {
    chave: 'biodiversidade',
    rotulo: 'Biodiversidade',
    icone: TreePine,
    tom: 'verde',
    nota: 'Monitoramento de fauna e flora, por campanha e por armadilha fotográfica.',
  },
  {
    chave: 'internos',
    rotulo: 'Internos',
    icone: Settings2,
    tom: 'neutro',
    nota: 'Indicadores da equipe, ligados a metas próprias. Não entram no relatório de verificação.',
  },
];

/* ===== Formatação =========================================================
   pt-BR com no máximo duas casas: a planilha traz inteiros na maioria e decimais em
   percentual e área. Fixar duas casas em tudo transformaria "3 ocorrências" em "3,00
   ocorrências", que lê como precisão que a contagem não tem.                  */
const NUMERO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function formatarValor(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? NUMERO.format(n) : String(valor ?? '');
}

/* ===== Célula da matriz ===================================================
   Estado local só enquanto está em edição. Manter o rascunho num estado global faria a
   digitação de uma célula re-renderizar a matriz inteira, que com 109 linhas e 7 colunas
   é perceptível.                                                              */
function Celula({ medicao, podeEscrever, salvando, aoSalvar, aoLimpar }) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState('');

  const temValor = medicao !== undefined && medicao !== null;

  function abrir() {
    if (!podeEscrever || salvando) return;
    setRascunho(temValor ? String(medicao.valor) : '');
    setEditando(true);
  }

  function confirmar() {
    setEditando(false);
    const limpo = rascunho.trim().replace(',', '.');

    // Campo esvaziado APAGA a medição em vez de gravar zero. É a regra 1 do cabeçalho:
    // devolver o período a "não medido" é diferente de afirmar que o resultado foi zero.
    if (limpo === '') {
      if (temValor) aoLimpar(medicao);
      return;
    }

    const n = Number(limpo);
    if (!Number.isFinite(n)) {
      toast.error('Valor inválido. Use apenas números.');
      return;
    }
    if (temValor && n === Number(medicao.valor)) return;
    aoSalvar(n);
  }

  if (editando) {
    return (
      <td className="px-2 py-1 text-right align-middle bg-amber-50/60">
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirmar();
            if (e.key === 'Escape') setEditando(false);
          }}
          className="w-20 px-2 py-1 text-right text-sm border border-[#F47920] rounded-lg outline-none focus:ring-2 focus:ring-[#F47920]/30"
          aria-label="Valor medido"
        />
      </td>
    );
  }

  return (
    <td
      onClick={abrir}
      className={[
        'px-3 py-2 text-right text-sm tabular-nums align-middle',
        podeEscrever ? 'cursor-pointer hover:bg-amber-50/60' : '',
        temValor ? 'text-slate-800' : 'text-[#5C7060]',
      ].join(' ')}
      title={
        temValor
          ? `${formatarValor(medicao.valor)}${medicao.observacao ? ` - ${medicao.observacao}` : ''}`
          : 'Não medido neste período'
      }
    >
      {salvando ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin inline text-[#F47920]" />
      ) : temValor ? (
        formatarValor(medicao.valor)
      ) : (
        // Traço apagado, e não 0: a diferença entre lacuna e resultado.
        <span aria-label="não medido">-</span>
      )}
    </td>
  );
}

export default function ProjetoIndicadores() {
  const { id: projetoId } = useParams();
  const msal = useMsal();
  const clienteQuery = useQueryClient();

  const [plano, setPlano] = useState('comunidade');
  const [busca, setBusca] = useState('');
  const [detalhe, setDetalhe] = useState(null);
  const [celulaSalvando, setCelulaSalvando] = useState(null);

  const projetoQuery = useQuery({
    queryKey: ['projeto', projetoId],
    queryFn: () => obterProjeto(msal, projetoId),
    enabled: Boolean(projetoId),
  });

  const indicadoresQuery = useQuery({
    queryKey: ['indicadores', projetoId, plano, busca],
    queryFn: () => listarIndicadores(msal, projetoId, { plano, busca }),
    enabled: Boolean(projetoId),
    // Mantém a matriz anterior visível enquanto a nova chega. Sem isto, trocar de aba
    // pisca a tela inteira para o estado de carregamento e a leitura se perde.
    placeholderData: (anterior) => anterior,
  });

  const podeEscrever = projetoQuery.data?.pode_escrever === true;

  const salvar = useMutation({
    mutationFn: ({ indicadorId, dados }) => registrarMedicao(msal, indicadorId, dados),
    onSuccess: () => clienteQuery.invalidateQueries({ queryKey: ['indicadores', projetoId] }),
    onError: (e) => toast.error(e?.message ?? 'Não foi possível salvar a medição.'),
    onSettled: () => setCelulaSalvando(null),
  });

  const limpar = useMutation({
    mutationFn: (medicaoId) => removerMedicao(msal, medicaoId),
    onSuccess: () => {
      clienteQuery.invalidateQueries({ queryKey: ['indicadores', projetoId] });
      toast.success('Período marcado como não medido.');
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível apagar a medição.'),
    onSettled: () => setCelulaSalvando(null),
  });

  const dados = indicadoresQuery.data;
  const periodos = dados?.periodos ?? [];
  const resumo = dados?.resumo ?? {};

  /* Agrupa por atividade preservando a ordem em que o servidor devolveu, que é a ordem
     da planilha. Um Map mantém a ordem de inserção; um objeto simples reordenaria chaves
     que parecessem número, e várias atividades começam com dígito. */
  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const ind of dados?.indicadores ?? []) {
      const chave = ind.atividade || 'Sem atividade declarada';
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(ind);
    }
    return [...mapa.entries()];
  }, [dados]);

  /* Índice (indicador, período) -> medição, para a célula não varrer o array a cada
     render. Com 109 linhas e 7 colunas seriam 763 buscas lineares por render. */
  const porCelula = useMemo(() => {
    const mapa = new Map();
    for (const ind of dados?.indicadores ?? []) {
      for (const m of ind.medicoes ?? []) mapa.set(`${ind.id}|${m.periodo_chave}`, m);
    }
    return mapa;
  }, [dados]);

  function aoSalvarCelula(indicador, periodo, valor) {
    setCelulaSalvando(`${indicador.id}|${periodo.chave}`);
    salvar.mutate({
      indicadorId: indicador.id,
      dados: { data: periodo.data, periodo_tipo: periodo.tipo, valor },
    });
  }

  function aoLimparCelula(indicador, periodo, medicao) {
    setCelulaSalvando(`${indicador.id}|${periodo.chave}`);
    limpar.mutate(medicao.id);
  }

  const planoAtual = PLANOS.find((p) => p.chave === plano);

  /* ===== Estados de borda ================================================
     O link de voltar aparece TAMBÉM aqui, e não é excesso de zelo: é para esta
     tela de erro que cai quem não está na equipe do projeto (o portão devolve
     404). Sem o link, a pessoa fica num beco sem saída dentro do shell - foi
     defeito real, sentido em uso e apontado pelo dono em 25/08/2026. */

  const voltarProjetos = (
    <Link
      to={createPageUrl('Projetos')}
      className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#F47920] transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Projetos
    </Link>
  );

  if (projetoQuery.isLoading) {
    return (
      <div className="p-6 space-y-4">
        {voltarProjetos}
        <Carregando rotulo="Carregando o projeto" />
      </div>
    );
  }

  if (projetoQuery.isError) {
    return (
      <div className="p-6 space-y-4">
        {voltarProjetos}
        <EstadoVazio
          icone={WifiOff}
          titulo="Não foi possível carregar o projeto"
          texto={projetoQuery.error?.message ?? 'Verifique a conexão e tente novamente.'}
          comSuperficie
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <Link
          to={createPageUrl('Projetos')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#F47920] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Projetos
        </Link>
        <h1 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-900">
          Indicadores
        </h1>
        <p className="text-sm text-slate-500">
          {/* `data.projeto.nome`, e nao `data.nome`: GET /projetos/:id devolve o
              ENVELOPE { projeto, equipe, pode_escrever }. Isto ja esteve errado
              aqui, e o sintoma era o subtitulo dizer sempre "de projeto" - sem
              erro no console, sem falha de rede, sem nada que apontasse a causa.
              Repare que `pode_escrever` logo acima e mesmo de raiz: metade do
              envelope e plana e a outra metade nao, que e justamente o que faz
              alguem errar. */}
          Plano de Monitoramento de {projetoQuery.data?.projeto?.nome ?? 'projeto'}
        </p>
      </div>

      {MODO_DEMO && MODO_DEMO_ATIVO() ? (
        <AvisoDiscreto tom="ambar">
          Modo demonstração: os indicadores abaixo são um recorte de exemplo e as alterações
          não são gravadas.
        </AvisoDiscreto>
      ) : null}

      {/* Abas por plano. A contagem vem do projeto inteiro e não da página, para não
          mudar de número ao paginar. */}
      <div className="flex flex-wrap gap-2">
        {PLANOS.map((p) => {
          const Icone = p.icone;
          const ativo = p.chave === plano;
          const qtd = resumo[p.chave] ?? 0;
          return (
            <button
              key={p.chave}
              type="button"
              onClick={() => setPlano(p.chave)}
              aria-pressed={ativo}
              className={[
                'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm border transition-colors',
                ativo
                  ? 'bg-[#F47920] text-white border-[#F47920] shadow-sm'
                  : 'bg-white text-slate-600 border-[#DDE3DE] hover:border-[#F47920]/50',
              ].join(' ')}
            >
              <Icone className="w-4 h-4" />
              {p.rotulo}
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

      <Cartao
        titulo={planoAtual?.rotulo}
        subtitulo={planoAtual?.nota}
        icone={planoAtual?.icone ?? BarChart3}
        tomIcone={planoAtual?.tom ?? 'verde'}
        semPaddingCorpo
        acao={
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar indicador, código ou atividade"
              className="w-full sm:w-80 pl-9 pr-3 py-2 text-sm border border-[#DDE3DE] rounded-xl outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
            />
          </div>
        }
      >
        {indicadoresQuery.isLoading ? (
          <div className="p-8">
            <Carregando rotulo="Carregando os indicadores" />
          </div>
        ) : indicadoresQuery.isError ? (
          <div className="p-6">
            <EstadoVazio
              icone={WifiOff}
              titulo="Não foi possível carregar os indicadores"
              texto={indicadoresQuery.error?.message ?? 'Verifique a conexão e tente novamente.'}
            />
          </div>
        ) : grupos.length === 0 ? (
          <div className="p-6">
            <EstadoVazio
              icone={BarChart3}
              titulo={busca ? 'Nenhum indicador para esta busca' : 'Nenhum indicador neste plano'}
              texto={
                busca
                  ? 'Tente outro termo, ou limpe a busca para ver o plano inteiro.'
                  : 'Os indicadores do Plano de Monitoramento são carregados a partir da planilha do projeto.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#DDE3DE]">
                  <th className="sticky left-0 z-10 bg-white text-left font-medium text-slate-500 px-4 py-2.5 min-w-[22rem]">
                    Indicador
                  </th>
                  <th className="text-left font-medium text-slate-500 px-3 py-2.5 whitespace-nowrap">
                    Unidade
                  </th>
                  {periodos.map((p) => (
                    <th
                      key={p.chave}
                      className="text-right font-medium text-slate-500 px-3 py-2.5 whitespace-nowrap"
                      title={p.tipo === 'anual' ? 'Ano fechado' : `Período ${p.tipo}`}
                    >
                      {p.rotulo}
                    </th>
                  ))}
                  <th className="w-10 px-2" aria-label="Detalhes" />
                </tr>
              </thead>

              <tbody>
                {grupos.map(([atividade, itens]) => (
                  // Fragment COM chave, e nao <>: a chave precisa ficar no elemento que
                  // o map devolve. Posta so no <tr> de dentro, o React reclama de lista
                  // sem chave e reconcilia o grupo inteiro a cada render.
                  <Fragment key={atividade}>
                    <tr className="bg-[#F6F8F7]">
                      <td
                        colSpan={periodos.length + 3}
                        className="px-4 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide"
                      >
                        {atividade}
                      </td>
                    </tr>

                    {itens.map((ind) => (
                      <tr
                        key={ind.id}
                        className="border-b border-[#EEF2F0] last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="sticky left-0 z-10 bg-white px-4 py-2 align-top">
                          <div className="flex items-start gap-2">
                            {ind.codigo ? (
                              <Badge tom="verde" tamanho="sm" className="font-mono shrink-0 mt-0.5">
                                {ind.codigo}
                              </Badge>
                            ) : null}
                            <span className="text-slate-800 leading-snug">{ind.nome}</span>
                          </div>
                          {ind.frequencia ? (
                            <p className="mt-0.5 text-xs text-slate-400">{ind.frequencia}</p>
                          ) : null}
                        </td>

                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap align-top">
                          {/* Unidade nula é contagem pura. A planilha escreve 'N/A' e
                              guardar essa string faria a tela imprimir "12 N/A". */}
                          {ind.unidade ?? <span className="text-[#5C7060]">un.</span>}
                        </td>

                        {periodos.map((p) => {
                          const chaveCelula = `${ind.id}|${p.chave}`;
                          return (
                            <Celula
                              key={p.chave}
                              medicao={porCelula.get(chaveCelula)}
                              podeEscrever={podeEscrever}
                              salvando={celulaSalvando === chaveCelula}
                              aoSalvar={(valor) => aoSalvarCelula(ind, p, valor)}
                              aoLimpar={(m) => aoLimparCelula(ind, p, m)}
                            />
                          );
                        })}

                        <td className="px-2 py-2 align-top">
                          <button
                            type="button"
                            onClick={() => setDetalhe(ind)}
                            className="p-1 rounded-lg text-[#5C7060] hover:text-[#F47920] hover:bg-amber-50 transition-colors"
                            aria-label={`Ver a Teoria da Mudança de ${ind.nome}`}
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      {/* Aviso de truncamento. Hoje o maior plano tem 109 indicadores e o teto do servidor
          é 200, então nunca aparece - existe para o dia em que o plano crescer, porque
          uma matriz cortada em silêncio é pior do que uma matriz que avisa. */}
      {dados && dados.total > (dados.indicadores?.length ?? 0) ? (
        <AvisoDiscreto tom="ambar">
          Mostrando {dados.indicadores.length} de {dados.total} indicadores. Use a busca para
          restringir a lista.
        </AvisoDiscreto>
      ) : null}

      {!podeEscrever && grupos.length > 0 ? (
        <p className="text-xs text-slate-400">
          Você tem acesso de leitura a este projeto. Lançar medição exige papel de gestor ou
          administrador.
        </p>
      ) : null}

      <PainelLateral
        aberto={Boolean(detalhe)}
        onFechar={() => setDetalhe(null)}
        titulo="Teoria da Mudança"
        icone={Info}
      >
        {detalhe ? (
          <div className="space-y-4 text-sm">
            <div>
              {detalhe.codigo ? (
                <Badge tom="verde" tamanho="sm" className="font-mono mb-1.5">
                  {detalhe.codigo}
                </Badge>
              ) : null}
              <p className="font-medium text-slate-900 leading-snug">{detalhe.nome}</p>
              {detalhe.descricao ? (
                <p className="mt-1 text-slate-500">{detalhe.descricao}</p>
              ) : null}
            </div>

            {[
              ['Atividade', detalhe.atividade_descricao],
              ['Output', detalhe.output],
              ['Outcome', detalhe.outcome],
              ['Impacto', detalhe.impacto],
              ['Evidência exigida', detalhe.recurso],
              ['Frequência', detalhe.frequencia],
            ].map(([rotulo, valor]) =>
              valor ? (
                <div key={rotulo}>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    {rotulo}
                  </p>
                  {/* whitespace-pre-line: os textos da planilha têm quebras de linha
                      significativas, com várias frases por célula. */}
                  <p className="mt-0.5 text-slate-700 whitespace-pre-line leading-relaxed">
                    {valor}
                  </p>
                </div>
              ) : null
            )}

            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Série medida
              </p>
              {detalhe.medicoes?.length ? (
                <ul className="mt-1 space-y-1">
                  {detalhe.medicoes.map((m) => (
                    <li key={m.id} className="flex justify-between text-slate-700">
                      <span>{m.periodo_rotulo}</span>
                      <span className="tabular-nums font-medium">
                        {formatarValor(m.valor)} {detalhe.unidade ?? ''}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-0.5 text-slate-400">
                  Nenhum período medido até agora.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </PainelLateral>
    </div>
  );
}

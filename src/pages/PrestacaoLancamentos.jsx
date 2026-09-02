/**
 * PrestacaoLancamentos - a despesa que a comunidade declarou, e o lançamento de
 * despesa nova.
 *
 * É a segunda metade da prestação de contas. A primeira é PrestacaoAntecipacoes.
 *
 * O FILTRO QUE IMPORTA é "só o que falta comprovar". O total de despesa já
 * estava na planilha e nunca foi o que travava a prestação: o que trava é a
 * linha sem comprovante, e é ela que a equipe precisa achar rápido.
 *
 * TRÊS ESTADOS DE COMPROVANTE, e a diferença é deliberada: tem, falta, e **não
 * informado**. Tratar "não informado" como "falta" afirmaria que o comprovante
 * não existe onde ninguém conferiu, e é justamente esse número que o painel
 * destaca. A planilha de origem usa `NA` para o mesmo caso.
 *
 * A ALDEIA É FILTRADA PELO GRUPO no formulário. O banco recusa aldeia de outro
 * grupo por chave estrangeira composta, mas oferecer a opção e depois recusar
 * seria fazer a pessoa descobrir a regra pelo erro.
 *
 * SEM NOME DE PESSOA: ver o aviso na tela e o cabeçalho da migration.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Coins, FileWarning, Landmark, Pencil, Plus, Trash2, WifiOff, X,
} from 'lucide-react';
import {
  atualizarLancamento, criarLancamento, detalharCiclo, listarCatalogos, removerLancamento,
} from '@/lib/api/prestacao';
import {
  NotaSemDadoPessoal, SeletorPrestacao, brl, deValorDoCampo, fmtMes, paraCampoValor, usePrestacao,
} from '@/components/prestacao/ContextoPrestacao';
import Cartao from '@/components/ui/Cartao';
import Tabela from '@/components/ui/Tabela';
import Campo from '@/components/ui/Campo';
import Badge from '@/components/ui/Badge';
import Carregando from '@/components/ui/Carregando';
import EstadoVazio from '@/components/ui/EstadoVazio';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import PainelLateral from '@/components/ui/PainelLateral';

function fimDoMes(iso) {
  const p = String(iso ?? '').match(/^(\d{4})-(\d{2})/);
  if (!p) return '';
  const ultimo = new Date(Number(p[1]), Number(p[2]), 0);
  return `${p[1]}-${p[2]}-${String(ultimo.getDate()).padStart(2, '0')}`;
}

const VAZIO = {
  competencia: '', descricao: '', valor: '', quantidade: '',
  aldeia_id: '', eixo_id: '', documento: '', tem_comprovante: '', observacoes: '',
};

export default function PrestacaoLancamentos() {
  const cliente = useQueryClient();
  const { msal, grupos, grupo, ciclo, escolher, podeEscrever, carregando, erro } = usePrestacao();

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [filtroAldeia, setFiltroAldeia] = useState('');
  const [filtroEixo, setFiltroEixo] = useState('');
  const [soFalta, setSoFalta] = useState(false);

  const detalheQuery = useQuery({
    queryKey: ['carbon', 'prestacao', 'ciclo', ciclo?.ciclo_id],
    queryFn: () => detalharCiclo(msal, ciclo.ciclo_id),
    enabled: Boolean(ciclo?.ciclo_id),
  });

  const catalogoQuery = useQuery({
    queryKey: ['carbon', 'prestacao', 'catalogos'],
    queryFn: () => listarCatalogos(msal),
    staleTime: 30 * 60 * 1000,
  });

  const lancamentos = useMemo(() => detalheQuery.data?.lancamentos ?? [], [detalheQuery.data]);

  /* Só as aldeias DESTE grupo. O banco recusaria a de outro por FK composta, mas
     oferecer e depois recusar faria a pessoa descobrir a regra pelo erro. */
  const aldeiasDoGrupo = useMemo(
    () => (catalogoQuery.data?.aldeias ?? []).filter((a) => a.grupo_id === grupo?.id),
    [catalogoQuery.data, grupo?.id],
  );
  const eixos = catalogoQuery.data?.eixos ?? [];

  const aldeiasNaLista = useMemo(() => {
    const s = new Set();
    for (const l of lancamentos) if (l.aldeia) s.add(l.aldeia);
    return [...s].sort();
  }, [lancamentos]);

  const eixosNaLista = useMemo(() => {
    const s = new Set();
    for (const l of lancamentos) if (l.eixo) s.add(l.eixo);
    return [...s].sort();
  }, [lancamentos]);

  const linhas = useMemo(() => lancamentos.filter((l) => {
    if (filtroAldeia && l.aldeia !== filtroAldeia) return false;
    if (filtroEixo && l.eixo !== filtroEixo) return false;
    if (soFalta && l.tem_comprovante === true) return false;
    return true;
  }), [lancamentos, filtroAldeia, filtroEixo, soFalta]);

  const invalidar = () => cliente.invalidateQueries({ queryKey: ['carbon', 'prestacao'] });

  const salvar = useMutation({
    mutationFn: (dados) =>
      editando
        ? atualizarLancamento(msal, editando.id, dados)
        : criarLancamento(msal, { ciclo_id: ciclo.ciclo_id, ...dados }),
    onSuccess: () => {
      toast.success(editando ? 'Lançamento alterado.' : 'Lançamento registrado.');
      setAberto(false); setEditando(null); setForm(VAZIO); invalidar();
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível salvar o lançamento.'),
  });

  const apagar = useMutation({
    mutationFn: (l) => removerLancamento(msal, l.id),
    onSuccess: () => { toast.success('Lançamento apagado.'); invalidar(); },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível apagar.'),
  });

  const abrirNovo = () => { setEditando(null); setForm(VAZIO); setAberto(true); };

  const abrirEdicao = (l) => {
    setEditando(l);
    setForm({
      competencia: String(l.competencia ?? '').slice(0, 10),
      descricao: l.descricao ?? '',
      // Mostra positivo no formulário: o sinal é convenção interna, e pedir
      // "digite negativo" seria expor a convenção a quem só quer lançar a compra.
      valor: paraCampoValor(Math.abs(Number(l.valor ?? 0))),
      quantidade: l.quantidade == null ? '' : String(l.quantidade),
      aldeia_id: l.aldeia_id ?? '',
      eixo_id: l.eixo_id ?? '',
      documento: l.documento ?? '',
      tem_comprovante: l.tem_comprovante === true ? 'sim' : l.tem_comprovante === false ? 'nao' : '',
      observacoes: l.observacoes ?? '',
    });
    setAberto(true);
  };

  const enviar = () => {
    const bruto = deValorDoCampo(form.valor);
    if (!form.competencia) { toast.error('Informe a competência.'); return; }
    if (!String(form.descricao).trim()) { toast.error('Descreva o item ou o serviço.'); return; }
    if (bruto === null || bruto === 0) { toast.error('O valor precisa ser diferente de zero.'); return; }
    const qtd = String(form.quantidade).trim();
    salvar.mutate({
      competencia: fimDoMes(form.competencia) || form.competencia,
      descricao: form.descricao.trim(),
      // Despesa é negativa no banco, como na planilha. A tela pede o valor da
      // compra e converte aqui, num lugar só.
      valor: -Math.abs(bruto),
      quantidade: qtd ? Number(qtd.replace(',', '.')) : null,
      aldeia_id: form.aldeia_id || null,
      eixo_id: form.eixo_id || null,
      documento: form.documento || null,
      tem_comprovante: form.tem_comprovante === 'sim' ? true
        : form.tem_comprovante === 'nao' ? false : null,
      observacoes: form.observacoes || null,
    });
  };

  if (carregando) return <div className="p-6"><Carregando rotulo="Carregando" /></div>;
  if (erro) {
    return (
      <div className="p-6">
        <EstadoVazio icone={WifiOff} comSuperficie titulo="Não foi possível carregar"
          texto={typeof erro === 'string' ? erro : 'Verifique a conexão e tente novamente.'} />
      </div>
    );
  }
  if (!grupo) {
    return (
      <div className="p-6">
        <EstadoVazio icone={Coins} comSuperficie titulo="Nenhum grupo cadastrado"
          texto="Rode o seed de prestação para carregar os dados das planilhas." />
      </div>
    );
  }

  const somaFiltrada = linhas.reduce((s, l) => s + Math.abs(Number(l.valor ?? 0)), 0);

  const colunas = [
    {
      chave: 'competencia', titulo: 'Competência', larguraMinima: 110,
      render: (l) => <span className="tabular-nums">{fmtMes(l.competencia)}</span>,
    },
    {
      chave: 'descricao', titulo: 'O que', larguraMinima: 240,
      render: (l) => (
        <span className="block leading-snug">
          {l.descricao}
          {l.quantidade ? <span className="text-[#8A9990]"> ({Number(l.quantidade)}x)</span> : null}
        </span>
      ),
    },
    {
      chave: 'aldeia', titulo: 'Aldeia', larguraMinima: 150,
      render: (l) => l.aldeia_e_associacao ? (
        <span className="inline-flex items-center gap-1 text-[#5C7060]">
          <Landmark size={12} aria-hidden="true" />Associação
        </span>
      ) : (l.aldeia || <span className="text-[#8A9990]">-</span>),
    },
    {
      chave: 'eixo', titulo: 'Eixo', larguraMinima: 160,
      render: (l) => l.eixo || <span className="text-[#8A9990]">-</span>,
    },
    {
      chave: 'valor', titulo: 'Valor', larguraMinima: 120, numerica: true,
      render: (l) => <span className="tabular-nums font-semibold">{brl(Math.abs(Number(l.valor)))}</span>,
    },
    {
      chave: 'tem_comprovante', titulo: 'Comprovante', larguraMinima: 130,
      render: (l) => l.tem_comprovante === true ? <Badge tom="verde" tamanho="sm">Sim</Badge>
        : l.tem_comprovante === false ? <Badge tom="ambar" tamanho="sm">Falta</Badge>
          : <span className="text-[#8A9990] text-[12px]">não informado</span>,
    },
  ];

  if (podeEscrever) {
    colunas.push({
      chave: 'acoes', titulo: '', larguraMinima: 84,
      render: (l) => (
        <div className="flex items-center gap-1">
          <button type="button" aria-label={`Editar ${l.descricao}`}
            onClick={(e) => { e.stopPropagation(); abrirEdicao(l); }}
            className="p-1.5 rounded-lg text-[#8A9990] hover:text-[#1A4731] hover:bg-[#1A4731]/[0.08]
              transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30">
            <Pencil size={14} aria-hidden="true" />
          </button>
          <button type="button" aria-label={`Apagar ${l.descricao}`} disabled={apagar.isPending}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Apagar "${l.descricao}", de ${brl(Math.abs(Number(l.valor)))}?`)) apagar.mutate(l);
            }}
            className="p-1.5 rounded-lg text-[#8A9990] hover:text-[#C0392B] hover:bg-[#C0392B]/[0.08]
              transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2
              focus-visible:ring-[#C0392B]/30">
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      ),
    });
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <SeletorPrestacao grupos={grupos} grupo={grupo} ciclo={ciclo} escolher={escolher} />

      {!ciclo ? (
        <EstadoVazio icone={Coins} comSuperficie titulo="Nenhum ciclo neste grupo"
          texto="Não há ciclo de prestação de contas cadastrado para este grupo." />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-[#5C7060]">
              <strong className="font-semibold text-[#1A2B1F]">{linhas.length}</strong>
              {' '}de {lancamentos.length} lançamentos ·{' '}
              <strong className="font-semibold text-[#1A2B1F] tabular-nums">{brl(somaFiltrada)}</strong>
            </p>
            {podeEscrever && (
              <BotaoPrimario icone={Plus} onClick={abrirNovo}>Novo lançamento</BotaoPrimario>
            )}
          </div>

          <NotaSemDadoPessoal />

          <Cartao
            titulo={`Despesas declaradas - ${grupo.nome}`}
            icone={FileWarning}
            semPaddingCorpo
            acao={
              <div className="flex flex-wrap items-end gap-2">
                <Campo rotulo="Aldeia" tipo="select" valor={filtroAldeia} onChange={setFiltroAldeia}
                  opcoes={[{ valor: '', rotulo: 'Todas' }, ...aldeiasNaLista.map((a) => ({ valor: a, rotulo: a }))]} />
                <Campo rotulo="Eixo" tipo="select" valor={filtroEixo} onChange={setFiltroEixo}
                  opcoes={[{ valor: '', rotulo: 'Todos' }, ...eixosNaLista.map((e) => ({ valor: e, rotulo: e }))]} />
                <button type="button" onClick={() => setSoFalta((v) => !v)} aria-pressed={soFalta}
                  className={`h-[38px] px-3 rounded-xl border text-[12.5px] font-semibold transition-colors
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F47920]/30 ${
                    soFalta ? 'border-[#8A6D3B] bg-[#FDF8EE] text-[#7A6231]'
                      : 'border-[#DDE3DE] bg-white text-[#5C7060] hover:border-[#8A6D3B]/50'}`}>
                  Só o que falta comprovar
                </button>
              </div>
            }
          >
            <Tabela
              legenda={`Despesas declaradas do ciclo ${ciclo.ciclo}`}
              colunas={colunas}
              dados={linhas}
              carregando={detalheQuery.isLoading}
              erro={detalheQuery.isError ? (detalheQuery.error?.message ?? true) : false}
              iconeVazio={FileWarning}
              tituloVazio="Nenhum lançamento"
              textoVazio={filtroAldeia || filtroEixo || soFalta
                ? 'Nenhum lançamento com esse filtro.'
                : 'Este ciclo ainda não tem despesa declarada.'}
            />
          </Cartao>
        </>
      )}

      <PainelLateral
        aberto={aberto}
        onFechar={() => { setAberto(false); setEditando(null); }}
        titulo={editando ? 'Editar lançamento' : 'Novo lançamento'}
        subtitulo={grupo?.nome}
        largura="lg"
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario icone={X} onClick={() => { setAberto(false); setEditando(null); }}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={enviar} carregando={salvar.isPending}>
              {editando ? 'Salvar' : 'Lançar'}
            </BotaoPrimario>
          </div>
        }
      >
        <div className="space-y-4">
          <Campo rotulo="Competência" tipo="data" valor={form.competencia}
            onChange={(v) => setForm((f) => ({ ...f, competencia: v }))}
            dica="Gravada no último dia do mês, como na planilha." />
          <Campo rotulo="O que foi comprado ou pago" tipo="texto" valor={form.descricao}
            onChange={(v) => setForm((f) => ({ ...f, descricao: v }))}
            placeholder="2 Placas Solares"
            dica="Descreva o item ou o serviço. Sem nome de pessoa: o banco recusa CPF, e-mail e dado bancário." />
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Valor" tipo="decimal" valor={form.valor}
              onChange={(v) => setForm((f) => ({ ...f, valor: v }))} placeholder="1700,00"
              dica="Valor da compra, positivo." />
            <Campo rotulo="Quantidade" tipo="decimal" valor={form.quantidade}
              onChange={(v) => setForm((f) => ({ ...f, quantidade: v }))} placeholder="2" />
          </div>
          <Campo rotulo="Aldeia" tipo="select" valor={form.aldeia_id}
            onChange={(v) => setForm((f) => ({ ...f, aldeia_id: v }))}
            opcoes={[
              { valor: '', rotulo: 'Sem aldeia' },
              ...aldeiasDoGrupo.map((a) => ({
                valor: a.id, rotulo: a.e_associacao ? `${a.nome} (associação)` : a.nome,
              })),
            ]}
            dica="Só as aldeias deste grupo. Despesa da entidade vai em Associação." />
          <Campo rotulo="Eixo" tipo="select" valor={form.eixo_id}
            onChange={(v) => setForm((f) => ({ ...f, eixo_id: v }))}
            opcoes={[{ valor: '', rotulo: 'Sem eixo' },
              ...eixos.map((e) => ({ valor: e.id, rotulo: e.nome }))]} />
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Documento" tipo="texto" valor={form.documento}
              onChange={(v) => setForm((f) => ({ ...f, documento: v }))}
              placeholder="NF 67986 ou Recibo" />
            <Campo rotulo="Comprovante" tipo="select" valor={form.tem_comprovante}
              onChange={(v) => setForm((f) => ({ ...f, tem_comprovante: v }))}
              opcoes={[
                { valor: '', rotulo: 'Não informado' },
                { valor: 'sim', rotulo: 'Sim, existe' },
                { valor: 'nao', rotulo: 'Falta' },
              ]}
              dica="Deixar em 'não informado' é diferente de 'falta'." />
          </div>
          <Campo rotulo="Observação" tipo="textarea" linhas={3} valor={form.observacoes}
            onChange={(v) => setForm((f) => ({ ...f, observacoes: v }))} />
        </div>
      </PainelLateral>
    </div>
  );
}

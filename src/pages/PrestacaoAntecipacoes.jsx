/**
 * PrestacaoAntecipacoes - o que a APSIS repassou, e o cadastro de repasse novo.
 *
 * É a primeira metade da prestação de contas. A outra é PrestacaoLancamentos,
 * e o painel mostra as duas contra o saldo.
 *
 * UMA LINHA POR COMPETÊNCIA, e o banco tem `unique (ciclo_id, competencia)`.
 * Dois repasses no mesmo mês quase sempre são o mesmo repasse lançado duas
 * vezes, e o erro só apareceria meses depois, na conferência do saldo. Quando
 * acontece de verdade, a saída é somar no mesmo lançamento e explicar na
 * observação, que é como a planilha já fazia.
 *
 * SEM NOME DE PESSOA: ver o aviso na tela e o cabeçalho da migration.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Coins, Pencil, Plus, Trash2, WifiOff, X } from 'lucide-react';
import {
  atualizarAntecipacao, criarAntecipacao, detalharCiclo, removerAntecipacao,
} from '@/lib/api/prestacao';
import {
  NotaSemDadoPessoal, SeletorPrestacao, brl, deValorDoCampo, fmtMes, paraCampoValor, usePrestacao,
} from '@/components/prestacao/ContextoPrestacao';
import Cartao from '@/components/ui/Cartao';
import Tabela from '@/components/ui/Tabela';
import Campo from '@/components/ui/Campo';
import Carregando from '@/components/ui/Carregando';
import EstadoVazio from '@/components/ui/EstadoVazio';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import PainelLateral from '@/components/ui/PainelLateral';

/** Último dia do mês, que é como a planilha registra a competência. */
function fimDoMes(iso) {
  const p = String(iso ?? '').match(/^(\d{4})-(\d{2})/);
  if (!p) return '';
  const ultimo = new Date(Number(p[1]), Number(p[2]), 0);
  return `${p[1]}-${p[2]}-${String(ultimo.getDate()).padStart(2, '0')}`;
}

const VAZIO = { competencia: '', valor: '', observacoes: '' };

export default function PrestacaoAntecipacoes() {
  const cliente = useQueryClient();
  const { msal, grupos, grupo, ciclo, escolher, podeEscrever, carregando, erro } = usePrestacao();

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VAZIO);

  const detalheQuery = useQuery({
    queryKey: ['carbon', 'prestacao', 'ciclo', ciclo?.ciclo_id],
    queryFn: () => detalharCiclo(msal, ciclo.ciclo_id),
    enabled: Boolean(ciclo?.ciclo_id),
  });

  const antecipacoes = detalheQuery.data?.antecipacoes ?? [];

  const invalidar = () => {
    cliente.invalidateQueries({ queryKey: ['carbon', 'prestacao'] });
  };

  const salvar = useMutation({
    mutationFn: (dados) =>
      editando
        ? atualizarAntecipacao(msal, editando.id, dados)
        : criarAntecipacao(msal, { ciclo_id: ciclo.ciclo_id, ...dados }),
    onSuccess: () => {
      toast.success(editando ? 'Repasse alterado.' : 'Repasse lançado.');
      setAberto(false);
      setEditando(null);
      setForm(VAZIO);
      invalidar();
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível salvar o repasse.'),
  });

  const apagar = useMutation({
    mutationFn: (linha) => removerAntecipacao(msal, linha.id),
    onSuccess: () => { toast.success('Repasse apagado.'); invalidar(); },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível apagar.'),
  });

  const abrirNovo = () => {
    setEditando(null);
    setForm(VAZIO);
    setAberto(true);
  };

  const abrirEdicao = (linha) => {
    setEditando(linha);
    setForm({
      competencia: String(linha.competencia ?? '').slice(0, 10),
      valor: paraCampoValor(linha.valor),
      observacoes: linha.observacoes ?? '',
    });
    setAberto(true);
  };

  const enviar = () => {
    const valor = deValorDoCampo(form.valor);
    if (!form.competencia) { toast.error('Informe a competência.'); return; }
    if (valor === null || valor <= 0) { toast.error('O valor precisa ser maior que zero.'); return; }
    salvar.mutate({
      competencia: fimDoMes(form.competencia) || form.competencia,
      valor,
      observacoes: form.observacoes || null,
    });
  };


  if (carregando) return <div className="p-6"><Carregando rotulo="Carregando" /></div>;
  if (erro) {
    return (
      <div className="p-6">
        <EstadoVazio icone={WifiOff} titulo="Não foi possível carregar" comSuperficie
          texto={typeof erro === 'string' ? erro : 'Verifique a conexão e tente novamente.'} />
      </div>
    );
  }
  if (!grupo) {
    return (
      <div className="p-6">
        <EstadoVazio icone={Coins} titulo="Nenhum grupo cadastrado" comSuperficie
          texto="Rode o seed de prestação para carregar os dados das planilhas." />
      </div>
    );
  }

  const total = antecipacoes.reduce((s, a) => s + Number(a.valor ?? 0), 0);

  const colunas = [
    {
      chave: 'competencia',
      titulo: 'Competência',
      larguraMinima: 120,
      render: (l) => <span className="tabular-nums font-semibold">{fmtMes(l.competencia)}</span>,
    },
    {
      chave: 'valor',
      titulo: 'Valor',
      larguraMinima: 140,
      numerica: true,
      render: (l) => <span className="tabular-nums font-semibold">{brl(l.valor)}</span>,
    },
    {
      chave: 'observacoes',
      titulo: 'Observação',
      larguraMinima: 220,
      render: (l) => l.observacoes || <span className="text-[#8A9990]">-</span>,
    },
    {
      chave: 'origem_aba',
      titulo: 'Origem',
      larguraMinima: 150,
      render: (l) =>
        l.origem_aba
          ? <span className="text-[11.5px] text-[#8A9990]">{l.origem_aba} L{l.origem_linha}</span>
          : <span className="text-[11.5px] text-[#8A9990]">lançado no portal</span>,
    },
  ];

  if (podeEscrever) {
    colunas.push({
      chave: 'acoes',
      titulo: '',
      larguraMinima: 84,
      render: (l) => (
        <div className="flex items-center gap-1">
          <button
            type="button" aria-label={`Editar o repasse de ${fmtMes(l.competencia)}`}
            onClick={(e) => { e.stopPropagation(); abrirEdicao(l); }}
            className="p-1.5 rounded-lg text-[#8A9990] hover:text-[#1A4731] hover:bg-[#1A4731]/[0.08]
              transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30"
          >
            <Pencil size={14} aria-hidden="true" />
          </button>
          <button
            type="button" aria-label={`Apagar o repasse de ${fmtMes(l.competencia)}`}
            disabled={apagar.isPending}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Apagar o repasse de ${fmtMes(l.competencia)}, no valor de ${brl(l.valor)}?`)) {
                apagar.mutate(l);
              }
            }}
            className="p-1.5 rounded-lg text-[#8A9990] hover:text-[#C0392B] hover:bg-[#C0392B]/[0.08]
              transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2
              focus-visible:ring-[#C0392B]/30"
          >
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
        <EstadoVazio icone={Coins} titulo="Nenhum ciclo neste grupo" comSuperficie
          texto="Não há ciclo de prestação de contas cadastrado para este grupo." />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-[#5C7060]">
              <strong className="font-semibold text-[#1A2B1F]">{brl(total)}</strong>{' '}
              repassado em {antecipacoes.length} parcela{antecipacoes.length === 1 ? '' : 's'}
            </p>
            {podeEscrever && (
              <BotaoPrimario icone={Plus} onClick={abrirNovo}>Novo repasse</BotaoPrimario>
            )}
          </div>

          <NotaSemDadoPessoal />

          <Cartao titulo={`Repasses - ${grupo.nome}`} icone={Coins} semPaddingCorpo>
            <Tabela
              legenda={`Repasses do ciclo ${ciclo.ciclo}`}
              colunas={colunas}
              dados={antecipacoes}
              carregando={detalheQuery.isLoading}
              erro={detalheQuery.isError ? (detalheQuery.error?.message ?? true) : false}
              iconeVazio={Coins}
              tituloVazio="Nenhum repasse lançado"
              textoVazio={podeEscrever
                ? 'Use o botão de novo repasse para lançar a primeira parcela.'
                : 'Este ciclo ainda não tem repasse lançado.'}
            />
          </Cartao>
        </>
      )}

      <PainelLateral
        aberto={aberto}
        onFechar={() => { setAberto(false); setEditando(null); }}
        titulo={editando ? 'Editar repasse' : 'Novo repasse'}
        subtitulo={grupo?.nome}
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
          <Campo
            rotulo="Competência"
            tipo="data"
            valor={form.competencia}
            onChange={(v) => setForm((f) => ({ ...f, competencia: v }))}
            dica="A data é gravada no último dia do mês, como na planilha. Só o mês importa."
          />
          <Campo
            rotulo="Valor repassado"
            tipo="decimal"
            valor={form.valor}
            onChange={(v) => setForm((f) => ({ ...f, valor: v }))}
            placeholder="100000,00"
            dica="Positivo. Repasse é entrada."
          />
          <Campo
            rotulo="Observação"
            tipo="textarea"
            linhas={3}
            valor={form.observacoes}
            onChange={(v) => setForm((f) => ({ ...f, observacoes: v }))}
            dica="Sem nome de pessoa: o banco recusa texto com CPF, e-mail ou dado bancário."
          />
        </div>
      </PainelLateral>
    </div>
  );
}

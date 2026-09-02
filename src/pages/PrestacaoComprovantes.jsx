/**
 * PrestacaoComprovantes - o extrato digitado: cada PIX e cada recibo, um a um.
 *
 * É a antiga aba "Base de dados" do Excel, que a equipe alimentava à mão com
 * 1.377 linhas. A partir de agora o registro é aqui.
 *
 * SEM NOME E SEM CPF, e a tela diz isso: o que identifica o documento físico é
 * o par (mês, ordem no mês), que é como a própria equipe numera os PDFs no
 * arquivo. Quem precisar do nome abre o comprovante original pelo número.
 *
 * PAGINADA NO SERVIDOR: um dos ciclos tem 1.075 comprovantes, e ninguém precisa
 * deles todos de uma vez - nem a rede de quem estiver no campo.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Landmark, Pencil, Plus, Receipt, Trash2, WifiOff, X,
} from 'lucide-react';
import {
  atualizarComprovante, criarComprovante, listarCatalogos, listarComprovantes, removerComprovante,
} from '@/lib/api/prestacao';
import {
  NotaSemDadoPessoal, SeletorPrestacao, brl, deValorDoCampo, fmtData, paraCampoValor, usePrestacao,
} from '@/components/prestacao/ContextoPrestacao';
import Cartao from '@/components/ui/Cartao';
import Tabela from '@/components/ui/Tabela';
import Campo from '@/components/ui/Campo';
import Carregando from '@/components/ui/Carregando';
import EstadoVazio from '@/components/ui/EstadoVazio';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import PainelLateral from '@/components/ui/PainelLateral';

const LIMITE = 50;
const VAZIO = {
  data: '', valor: '', ordem_no_mes: '', aldeia_id: '',
  instituicao_recebedor: '', instituicao_pagador: '', observacoes: '',
};

export default function PrestacaoComprovantes() {
  const cliente = useQueryClient();
  const { msal, grupos, grupo, ciclo, escolher, podeEscrever, carregando, erro } = usePrestacao();

  const [pagina, setPagina] = useState(1);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VAZIO);

  const listaQuery = useQuery({
    queryKey: ['carbon', 'prestacao', 'comprovantes', ciclo?.ciclo_id, pagina],
    queryFn: () => listarComprovantes(msal, ciclo.ciclo_id, { pagina, limite: LIMITE }),
    enabled: Boolean(ciclo?.ciclo_id),
    // Mantém a página anterior na tela enquanto a nova chega: sem isso a
    // paginação pisca para o estado vazio a cada clique.
    placeholderData: (anterior) => anterior,
  });

  const catalogoQuery = useQuery({
    queryKey: ['carbon', 'prestacao', 'catalogos'],
    queryFn: () => listarCatalogos(msal),
    staleTime: 30 * 60 * 1000,
  });

  const aldeiasDoGrupo = (catalogoQuery.data?.aldeias ?? []).filter((a) => a.grupo_id === grupo?.id);

  const invalidar = () => cliente.invalidateQueries({ queryKey: ['carbon', 'prestacao'] });

  const salvar = useMutation({
    mutationFn: (dados) =>
      editando
        ? atualizarComprovante(msal, editando.id, dados)
        : criarComprovante(msal, { ciclo_id: ciclo.ciclo_id, ...dados }),
    onSuccess: () => {
      toast.success(editando ? 'Comprovante alterado.' : 'Comprovante registrado.');
      setAberto(false); setEditando(null); setForm(VAZIO); invalidar();
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível salvar o comprovante.'),
  });

  const apagar = useMutation({
    mutationFn: (c) => removerComprovante(msal, c.id),
    onSuccess: () => { toast.success('Comprovante apagado.'); invalidar(); },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível apagar.'),
  });

  const abrirNovo = () => { setEditando(null); setForm(VAZIO); setAberto(true); };
  const abrirEdicao = (c) => {
    setEditando(c);
    setForm({
      data: String(c.data ?? '').slice(0, 10),
      valor: paraCampoValor(c.valor),
      ordem_no_mes: c.ordem_no_mes == null ? '' : String(c.ordem_no_mes),
      aldeia_id: c.aldeia_id ?? '',
      instituicao_recebedor: c.instituicao_recebedor ?? '',
      instituicao_pagador: c.instituicao_pagador ?? '',
      observacoes: c.observacoes ?? '',
    });
    setAberto(true);
  };

  const enviar = () => {
    const valor = deValorDoCampo(form.valor);
    if (!form.data) { toast.error('Informe a data do comprovante.'); return; }
    if (valor === null || valor <= 0) { toast.error('O valor precisa ser maior que zero.'); return; }
    salvar.mutate({
      data: form.data,
      valor,
      ordem_no_mes: form.ordem_no_mes === '' ? null : Number(form.ordem_no_mes),
      aldeia_id: form.aldeia_id || null,
      instituicao_recebedor: form.instituicao_recebedor || null,
      instituicao_pagador: form.instituicao_pagador || null,
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
        <EstadoVazio icone={Receipt} comSuperficie titulo="Nenhum grupo cadastrado"
          texto="Rode o seed de prestação para carregar os dados das planilhas." />
      </div>
    );
  }

  const linhas = listaQuery.data?.comprovantes ?? [];
  const total = listaQuery.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / LIMITE));

  const colunas = [
    {
      chave: 'data', titulo: 'Data', larguraMinima: 105,
      render: (c) => <span className="tabular-nums">{fmtData(c.data)}</span>,
    },
    {
      chave: 'ordem_no_mes', titulo: 'Ordem no mês', larguraMinima: 110, numerica: true,
      render: (c) => c.ordem_no_mes ?? <span className="text-[#8A9990]">-</span>,
    },
    {
      chave: 'valor', titulo: 'Valor', larguraMinima: 120, numerica: true,
      render: (c) => <span className="tabular-nums font-semibold">{brl(c.valor)}</span>,
    },
    {
      chave: 'aldeia', titulo: 'Aldeia', larguraMinima: 150,
      render: (c) => c.aldeia_e_associacao ? (
        <span className="inline-flex items-center gap-1 text-[#5C7060]">
          <Landmark size={12} aria-hidden="true" />Associação
        </span>
      ) : (c.aldeia || <span className="text-[#8A9990]">-</span>),
    },
    {
      chave: 'instituicao_recebedor', titulo: 'Banco de destino', larguraMinima: 150,
      render: (c) => c.instituicao_recebedor || <span className="text-[#8A9990]">-</span>,
    },
    {
      chave: 'origem_aba', titulo: 'Origem', larguraMinima: 140,
      render: (c) => c.origem_aba
        ? <span className="text-[11.5px] text-[#8A9990]">{c.origem_aba} L{c.origem_linha}</span>
        : <span className="text-[11.5px] text-[#8A9990]">registrado no portal</span>,
    },
  ];

  if (podeEscrever) {
    colunas.push({
      chave: 'acoes', titulo: '', larguraMinima: 84,
      render: (c) => (
        <div className="flex items-center gap-1">
          <button type="button" aria-label={`Editar o comprovante de ${fmtData(c.data)}`}
            onClick={(e) => { e.stopPropagation(); abrirEdicao(c); }}
            className="p-1.5 rounded-lg text-[#8A9990] hover:text-[#1A4731] hover:bg-[#1A4731]/[0.08]
              transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30">
            <Pencil size={14} aria-hidden="true" />
          </button>
          <button type="button" aria-label={`Apagar o comprovante de ${fmtData(c.data)}`}
            disabled={apagar.isPending}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Apagar o comprovante de ${fmtData(c.data)}, ${brl(c.valor)}?`)) apagar.mutate(c);
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
        <EstadoVazio icone={Receipt} comSuperficie titulo="Nenhum ciclo neste grupo"
          texto="Abra um ciclo no Painel antes de registrar comprovantes." />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-[#5C7060]">
              <strong className="font-semibold text-[#1A2B1F] tabular-nums">{total}</strong>{' '}
              comprovante(s) neste ciclo
            </p>
            {podeEscrever && (
              <BotaoPrimario icone={Plus} onClick={abrirNovo}>Novo comprovante</BotaoPrimario>
            )}
          </div>

          <NotaSemDadoPessoal />

          <Cartao titulo={`Comprovantes - ${grupo.nome}`} icone={Receipt} semPaddingCorpo>
            <Tabela
              legenda={`Comprovantes do ciclo ${ciclo.ciclo}`}
              colunas={colunas}
              dados={linhas}
              carregando={listaQuery.isLoading}
              erro={listaQuery.isError ? (listaQuery.error?.message ?? true) : false}
              iconeVazio={Receipt}
              tituloVazio="Nenhum comprovante"
              textoVazio={podeEscrever
                ? 'Registre o primeiro PIX ou recibo pelo botão acima.'
                : 'Este ciclo ainda não tem comprovante registrado.'}
              rodape={
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] text-[#5C7060] tabular-nums">
                    página {pagina} de {paginas}
                  </span>
                  <span className="flex items-center gap-1">
                    <button type="button" aria-label="Página anterior" disabled={pagina <= 1}
                      onClick={() => setPagina((v) => Math.max(1, v - 1))}
                      className="p-1.5 rounded-lg text-[#5C7060] hover:bg-[#F4F6F4] disabled:opacity-30
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30">
                      <ChevronLeft size={15} aria-hidden="true" />
                    </button>
                    <button type="button" aria-label="Próxima página" disabled={pagina >= paginas}
                      onClick={() => setPagina((v) => Math.min(paginas, v + 1))}
                      className="p-1.5 rounded-lg text-[#5C7060] hover:bg-[#F4F6F4] disabled:opacity-30
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30">
                      <ChevronRight size={15} aria-hidden="true" />
                    </button>
                  </span>
                </div>
              }
            />
          </Cartao>
        </>
      )}

      <PainelLateral
        aberto={aberto}
        onFechar={() => { setAberto(false); setEditando(null); }}
        titulo={editando ? 'Editar comprovante' : 'Novo comprovante'}
        subtitulo={grupo?.nome}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario icone={X} onClick={() => { setAberto(false); setEditando(null); }}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={enviar} carregando={salvar.isPending}>
              {editando ? 'Salvar' : 'Registrar'}
            </BotaoPrimario>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Data" tipo="data" valor={form.data}
              onChange={(v) => setForm((f) => ({ ...f, data: v }))} />
            <Campo rotulo="Valor" tipo="decimal" valor={form.valor}
              onChange={(v) => setForm((f) => ({ ...f, valor: v }))} placeholder="1700,00" />
          </div>
          <Campo rotulo="Ordem no mês" tipo="decimal" valor={form.ordem_no_mes}
            onChange={(v) => setForm((f) => ({ ...f, ordem_no_mes: v }))}
            dica="O número do comprovante no arquivo físico do mês. É por ele que se acha o PDF - o portal não guarda o nome de quem recebeu." />
          <Campo rotulo="Aldeia" tipo="select" valor={form.aldeia_id}
            onChange={(v) => setForm((f) => ({ ...f, aldeia_id: v }))}
            opcoes={[
              { valor: '', rotulo: 'Sem aldeia' },
              ...aldeiasDoGrupo.map((a) => ({
                valor: a.id, rotulo: a.e_associacao ? `${a.nome} (associação)` : a.nome,
              })),
            ]} />
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Banco de destino" tipo="texto" valor={form.instituicao_recebedor}
              onChange={(v) => setForm((f) => ({ ...f, instituicao_recebedor: v }))}
              dica="Só a instituição. Sem agência nem conta." />
            <Campo rotulo="Banco de origem" tipo="texto" valor={form.instituicao_pagador}
              onChange={(v) => setForm((f) => ({ ...f, instituicao_pagador: v }))} />
          </div>
          <Campo rotulo="Observação" tipo="textarea" linhas={3} valor={form.observacoes}
            onChange={(v) => setForm((f) => ({ ...f, observacoes: v }))}
            dica="Sem nome de pessoa: o banco recusa CPF, e-mail e dado bancário." />
        </div>
      </PainelLateral>
    </div>
  );
}

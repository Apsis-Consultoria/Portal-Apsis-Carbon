/**
 * PrestacaoAtividades - o diário de atividades de campo, por Monitoring Report.
 *
 * É a antiga "Atividade Parakanã.xlsx" (~490 atividades em MR-1, MR-2 e MR-3).
 * A partir de 01/09/2026 a equipe registra AQUI: reunião, ofício, capacitação,
 * entrega - com evidência e status, que é o que a validadora pede no MR.
 *
 * O FILTRO PRINCIPAL É O RELATÓRIO, em abas: quando a equipe monta o MR-3, as
 * atividades do MR-1 são história. Busca por texto para achar "aquela reunião
 * de fevereiro".
 *
 * SEM RESPONSÁVEL NOMINAL: a planilha de origem tem essa coluna e ela não veio
 * (LGPD). A instituição responde pela atividade.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarRange, ChevronLeft, ChevronRight, ClipboardList, Paperclip, Pencil,
  Plus, Search, Trash2, WifiOff, X,
} from 'lucide-react';
import {
  atualizarAtividadeCampo, criarAtividadeCampo, listarAtividadesCampo, removerAtividadeCampo,
} from '@/lib/api/prestacao';
import {
  NotaSemDadoPessoal, fmtData, usePrestacao,
} from '@/components/prestacao/ContextoPrestacao';
import { EsqueletoTabela } from '@/components/prestacao/Visual';
import Cartao from '@/components/ui/Cartao';
import Campo from '@/components/ui/Campo';
import Badge from '@/components/ui/Badge';
import EstadoVazio from '@/components/ui/EstadoVazio';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import PainelLateral from '@/components/ui/PainelLateral';

const RELATORIOS = ['MR-1', 'MR-2', 'MR-3'];
const LIMITE = 50;

const TOM_STATUS = {
  'Concluído': 'verde',
  'Em andamento': 'azul',
  'Pendente': 'ambar',
  'Dúvida': 'ambar',
};

const VAZIO = {
  relatorio: 'MR-3', inicio: '', termino: '', atividade: '', instituicao: '',
  tipo: '', evidencia: '', status: '', observacoes: '',
};

export default function PrestacaoAtividades() {
  const cliente = useQueryClient();
  // O contexto compartilhado entra só pelo msal e pela permissão: atividade de
  // campo pertence ao RELATÓRIO, não ao ciclo financeiro.
  // `grupo` entra aqui porque o backend passou a exigir grupo_id ao criar: e dele
  // que sai o projeto da atividade, e e nele que o portao de participacao bate.
  // Antes o backend pegava um grupo qualquer da tabela, sem conferir nada.
  const { msal, grupo, podeEscrever, carregando, erro } = usePrestacao();

  const [relatorio, setRelatorio] = useState('MR-1');
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [pagina, setPagina] = useState(1);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VAZIO);

  const listaQuery = useQuery({
    queryKey: ['carbon', 'prestacao', 'atividades', relatorio, buscaAplicada, pagina],
    queryFn: () => listarAtividadesCampo(msal, { relatorio, busca: buscaAplicada, pagina, limite: LIMITE }),
    placeholderData: (anterior) => anterior,
  });

  const invalidar = () => cliente.invalidateQueries({ queryKey: ['carbon', 'prestacao', 'atividades'] });

  const salvar = useMutation({
    mutationFn: (dados) =>
      editando
        ? atualizarAtividadeCampo(msal, editando.id, dados)
        : criarAtividadeCampo(msal, { grupo_id: grupo?.id, ...dados }),
    onSuccess: () => {
      toast.success(editando ? 'Atividade alterada.' : 'Atividade registrada.');
      setAberto(false); setEditando(null); setForm(VAZIO); invalidar();
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível salvar a atividade.'),
  });

  const apagar = useMutation({
    mutationFn: (a) => removerAtividadeCampo(msal, a.id),
    onSuccess: () => { toast.success('Atividade apagada.'); invalidar(); },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível apagar.'),
  });

  const abrirNovo = () => {
    setEditando(null);
    setForm({ ...VAZIO, relatorio });
    setAberto(true);
  };

  const abrirEdicao = (a) => {
    setEditando(a);
    setForm({
      relatorio: a.relatorio ?? relatorio,
      inicio: String(a.inicio ?? '').slice(0, 10),
      termino: String(a.termino ?? '').slice(0, 10),
      atividade: a.atividade ?? '',
      instituicao: a.instituicao ?? '',
      tipo: a.tipo ?? '',
      evidencia: a.evidencia ?? '',
      status: a.status ?? '',
      observacoes: a.observacoes ?? '',
    });
    setAberto(true);
  };

  const enviar = () => {
    if (!form.atividade.trim()) { toast.error('Descreva a atividade.'); return; }
    salvar.mutate({
      relatorio: form.relatorio,
      inicio: form.inicio || null,
      termino: form.termino || null,
      atividade: form.atividade.trim(),
      instituicao: form.instituicao || null,
      tipo: form.tipo || null,
      evidencia: form.evidencia || null,
      status: form.status || null,
      observacoes: form.observacoes || null,
    });
  };

  if (carregando) return <div className="p-4 sm:p-6"><EsqueletoTabela linhas={8} /></div>;
  if (erro) {
    return (
      <div className="p-6">
        <EstadoVazio icone={WifiOff} comSuperficie titulo="Não foi possível carregar"
          texto={typeof erro === 'string' ? erro : 'Verifique a conexão e tente novamente.'} />
      </div>
    );
  }

  const atividades = listaQuery.data?.atividades ?? [];
  const total = listaQuery.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / LIMITE));

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-300">
        <div className="inline-flex rounded-xl border border-[#DDE3DE] bg-white p-1" role="group"
          aria-label="Monitoring Report">
          {RELATORIOS.map((r) => (
            <button key={r} type="button" aria-pressed={r === relatorio}
              onClick={() => { setRelatorio(r); setPagina(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30 ${
                r === relatorio ? 'bg-[#1A4731] text-white' : 'text-[#5C7060] hover:text-[#1A4731]'
              }`}>
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <form
            className="relative"
            onSubmit={(e) => { e.preventDefault(); setBuscaAplicada(busca.trim()); setPagina(1); }}
          >
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9990]"
              aria-hidden="true" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar atividade"
              aria-label="Buscar atividade"
              className="h-[38px] w-[220px] pl-9 pr-3 rounded-xl border border-[#DDE3DE] bg-white
                text-[13px] text-[#1A2B1F] placeholder:text-[#8A9990]
                focus:outline-none focus:ring-2 focus:ring-[#1A4731]/25 focus:border-[#1A4731]/50"
            />
          </form>
          {podeEscrever && (
            <BotaoPrimario icone={Plus} onClick={abrirNovo}>Nova atividade</BotaoPrimario>
          )}
        </div>
      </div>

      <Cartao titulo={`Atividades do ${relatorio}`} icone={CalendarRange} semPaddingCorpo
        subtitulo={`${total} atividade(s)${buscaAplicada ? ` com "${buscaAplicada}"` : ''}. O diário que alimenta o Monitoring Report.`}>
        {listaQuery.isLoading ? (
          <EsqueletoTabela linhas={8} />
        ) : listaQuery.isError ? (
          <div className="p-5">
            <EstadoVazio icone={WifiOff} titulo="Não foi possível listar"
              texto={listaQuery.error?.message ?? 'Tente novamente.'} />
          </div>
        ) : !atividades.length ? (
          <div className="p-5">
            <EstadoVazio icone={ClipboardList} titulo="Nenhuma atividade"
              texto={buscaAplicada
                ? 'Nada com esse texto neste relatório.'
                : 'Este relatório ainda não tem atividade registrada.'} />
          </div>
        ) : (
          <ul className="animate-in fade-in duration-300">
            {atividades.map((a) => (
              <li key={a.id}
                className="px-5 py-3.5 border-b border-[#F4F6F4] last:border-b-0 hover:bg-[#FAFBFA]
                  transition-colors">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
                  <div className="flex-1 min-w-[260px]">
                    <p className="text-[13.5px] font-semibold text-[#1A2B1F] leading-snug">
                      {a.atividade}
                    </p>
                    <p className="text-[11.5px] text-[#5C7060] mt-0.5 flex flex-wrap items-center gap-x-2">
                      <span className="tabular-nums">{fmtData(a.inicio)}</span>
                      {a.instituicao && <span>· {a.instituicao}</span>}
                      {a.tipo && <span>· {a.tipo}</span>}
                      {a.grupo && <span>· {a.grupo}</span>}
                    </p>
                    {a.evidencia && (
                      <p className="text-[11.5px] text-[#8A9990] mt-1 flex items-center gap-1">
                        <Paperclip size={11} className="flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{a.evidencia}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {a.status && (
                      <Badge tom={TOM_STATUS[a.status] ?? 'neutro'} tamanho="sm">{a.status}</Badge>
                    )}
                    {podeEscrever && (
                      <>
                        <button type="button" aria-label={`Editar: ${a.atividade}`}
                          onClick={() => abrirEdicao(a)}
                          className="p-1.5 rounded-lg text-[#8A9990] hover:text-[#1A4731]
                            hover:bg-[#1A4731]/[0.08] transition-colors focus:outline-none
                            focus-visible:ring-2 focus-visible:ring-[#1A4731]/30">
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        <button type="button" aria-label={`Apagar: ${a.atividade}`}
                          disabled={apagar.isPending}
                          onClick={() => {
                            if (window.confirm(`Apagar a atividade "${a.atividade}"?`)) apagar.mutate(a);
                          }}
                          className="p-1.5 rounded-lg text-[#8A9990] hover:text-[#C0392B]
                            hover:bg-[#C0392B]/[0.08] transition-colors disabled:opacity-40
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C0392B]/30">
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {paginas > 1 && (
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-[#F4F6F4]">
            <span className="text-[11px] text-[#5C7060] tabular-nums">página {pagina} de {paginas}</span>
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
        )}
      </Cartao>

      <NotaSemDadoPessoal />

      <PainelLateral
        aberto={aberto}
        onFechar={() => { setAberto(false); setEditando(null); }}
        titulo={editando ? 'Editar atividade' : 'Nova atividade'}
        subtitulo={form.relatorio}
        largura="lg"
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
          <Campo rotulo="Relatório" tipo="select" valor={form.relatorio}
            onChange={(v) => setForm((f) => ({ ...f, relatorio: v }))}
            opcoes={RELATORIOS.map((r) => ({ valor: r, rotulo: r }))} />
          <Campo rotulo="Atividade" tipo="textarea" linhas={3} valor={form.atividade}
            onChange={(v) => setForm((f) => ({ ...f, atividade: v }))}
            placeholder="Reunião de consulta sobre o plano de trabalho"
            dica="Sem nome de pessoa: identifique pela instituição ou pelo cargo." />
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Início" tipo="data" valor={form.inicio}
              onChange={(v) => setForm((f) => ({ ...f, inicio: v }))} />
            <Campo rotulo="Término" tipo="data" valor={form.termino}
              onChange={(v) => setForm((f) => ({ ...f, termino: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Instituição" tipo="texto" valor={form.instituicao}
              onChange={(v) => setForm((f) => ({ ...f, instituicao: v }))} />
            <Campo rotulo="Tipo" tipo="texto" valor={form.tipo}
              onChange={(v) => setForm((f) => ({ ...f, tipo: v }))}
              placeholder="Reunião, Ofício, Capacitação" />
          </div>
          <Campo rotulo="Evidência" tipo="texto" valor={form.evidencia}
            onChange={(v) => setForm((f) => ({ ...f, evidencia: v }))}
            placeholder="Foto e lista de presença"
            dica="Onde a prova ficou. O envio de arquivo pelo sistema ainda não existe." />
          <Campo rotulo="Situação" tipo="select" valor={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            opcoes={[
              { valor: '', rotulo: 'Não informada' },
              { valor: 'Concluído', rotulo: 'Concluído' },
              { valor: 'Em andamento', rotulo: 'Em andamento' },
              { valor: 'Pendente', rotulo: 'Pendente' },
              { valor: 'Dúvida', rotulo: 'Dúvida' },
            ]} />
          <Campo rotulo="Observação" tipo="textarea" linhas={2} valor={form.observacoes}
            onChange={(v) => setForm((f) => ({ ...f, observacoes: v }))} />
        </div>
      </PainelLateral>
    </div>
  );
}

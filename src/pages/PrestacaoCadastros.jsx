/**
 * PrestacaoCadastros - aldeias e eixos, os domínios que eram a aba "TA" do
 * Excel.
 *
 * Quando a equipe usava a planilha, aldeia nova e eixo novo eram uma linha na
 * aba de validação. Sem esta tela, a primeira aldeia nova depois da migração
 * obrigaria alguém a voltar para o Excel - e é assim que a planilha ressuscita.
 *
 * ALDEIA NÃO SE APAGA, se DESATIVA: as que têm lançamento histórico precisam
 * continuar legíveis nos ciclos antigos. Desativar só a tira dos formulários
 * novos.
 *
 * EIXO É DO PROJETO, não do grupo, por decisão registrada na issue de eixos: os
 * dois grupos usavam vocabulários diferentes (11 contra 4) e sem dicionário
 * único nenhum relatório cruza os dois.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Landmark, Layers, MapPin, Pencil, Plus, WifiOff, X } from 'lucide-react';
import {
  atualizarAldeia, atualizarEixo, criarAldeia, criarEixo, listarCatalogos,
} from '@/lib/api/prestacao';
import { SeletorPrestacao, usePrestacao } from '@/components/prestacao/ContextoPrestacao';
import Cartao from '@/components/ui/Cartao';
import Campo from '@/components/ui/Campo';
import Badge from '@/components/ui/Badge';
import Carregando from '@/components/ui/Carregando';
import EstadoVazio from '@/components/ui/EstadoVazio';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import PainelLateral from '@/components/ui/PainelLateral';

const LINHAS_ESTRATEGICAS = [
  { valor: '', rotulo: 'Sem linha estratégica' },
  { valor: 'Comunidade', rotulo: 'Comunidade' },
  { valor: 'Cadeia bioeconomia', rotulo: 'Cadeia bioeconomia' },
  { valor: 'Fortalecimento cultural e de governança', rotulo: 'Fortalecimento cultural e de governança' },
];

export default function PrestacaoCadastros() {
  const cliente = useQueryClient();
  const { msal, grupos, grupo, ciclo, escolher, podeEscrever, carregando, erro } = usePrestacao();

  // 'aldeia' ou 'eixo'; null fechado. Um painel só para os dois formulários.
  const [painel, setPainel] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});

  const catalogoQuery = useQuery({
    queryKey: ['carbon', 'prestacao', 'catalogos'],
    queryFn: () => listarCatalogos(msal),
    staleTime: 5 * 60 * 1000,
  });

  const aldeias = (catalogoQuery.data?.aldeias ?? []).filter((a) => a.grupo_id === grupo?.id);
  const eixos = catalogoQuery.data?.eixos ?? [];

  const invalidar = () => cliente.invalidateQueries({ queryKey: ['carbon', 'prestacao'] });

  const salvarAldeia = useMutation({
    mutationFn: (dados) =>
      editando ? atualizarAldeia(msal, editando.id, dados) : criarAldeia(msal, { grupo_id: grupo.id, ...dados }),
    onSuccess: () => {
      toast.success(editando ? 'Aldeia alterada.' : 'Aldeia cadastrada.');
      setPainel(null); setEditando(null); invalidar();
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível salvar a aldeia.'),
  });

  const salvarEixo = useMutation({
    mutationFn: (dados) =>
      // grupo_id no mesmo formato da aldeia: o backend usa ele para descobrir o
      // projeto do eixo e para conferir que a pessoa participa desse projeto.
      // Antes o backend pegava um grupo qualquer da tabela, sem portao nenhum.
      editando ? atualizarEixo(msal, editando.id, dados) : criarEixo(msal, { grupo_id: grupo.id, ...dados }),
    onSuccess: () => {
      toast.success(editando ? 'Eixo alterado.' : 'Eixo cadastrado.');
      setPainel(null); setEditando(null); invalidar();
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível salvar o eixo.'),
  });

  const abrirAldeia = (a) => {
    setEditando(a ?? null);
    setForm(a
      ? { nome: a.nome, e_associacao: a.e_associacao === true, ativa: a.ativa !== false }
      : { nome: '', e_associacao: false, ativa: true });
    setPainel('aldeia');
  };

  const abrirEixo = (e) => {
    setEditando(e ?? null);
    setForm(e
      ? { nome: e.nome, linha_estrategica: e.linha_estrategica ?? '' }
      : { nome: '', linha_estrategica: '' });
    setPainel('eixo');
  };

  const enviar = () => {
    if (!String(form.nome ?? '').trim()) { toast.error('Informe o nome.'); return; }
    if (painel === 'aldeia') {
      salvarAldeia.mutate({ nome: form.nome.trim(), e_associacao: form.e_associacao === true, ativa: form.ativa !== false });
    } else {
      salvarEixo.mutate({ nome: form.nome.trim(), linha_estrategica: form.linha_estrategica || null });
    }
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
        <EstadoVazio icone={MapPin} comSuperficie titulo="Nenhum grupo cadastrado"
          texto="Rode o seed de prestação para carregar os dados das planilhas." />
      </div>
    );
  }

  const salvando = salvarAldeia.isPending || salvarEixo.isPending;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <SeletorPrestacao grupos={grupos} grupo={grupo} ciclo={ciclo} escolher={escolher} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Cartao titulo={`Aldeias - ${grupo.nome}`} icone={MapPin} semPaddingCorpo
          subtitulo="Aldeia com lançamento histórico não se apaga: desativa."
          acao={podeEscrever
            ? <BotaoPrimario icone={Plus} tamanho="sm" onClick={() => abrirAldeia(null)}>Nova aldeia</BotaoPrimario>
            : null}>
          <ul>
            {aldeias.map((a) => (
              <li key={a.id}
                className="px-5 py-2.5 border-b border-[#F4F6F4] last:border-b-0 flex items-center gap-2">
                <span className="flex-1 text-[13px] font-semibold text-[#1A2B1F] flex items-center gap-1.5 min-w-0">
                  {a.e_associacao && <Landmark size={12} className="text-[#5C7060] flex-shrink-0" aria-hidden="true" />}
                  <span className="truncate">{a.nome}</span>
                </span>
                {a.ativa === false && <Badge tom="neutro" tamanho="sm">Inativa</Badge>}
                {a.e_associacao && <Badge tom="neutro" tamanho="sm">Associação</Badge>}
                {podeEscrever && (
                  <button type="button" aria-label={`Editar a aldeia ${a.nome}`}
                    onClick={() => abrirAldeia(a)}
                    className="p-1.5 rounded-lg text-[#8A9990] hover:text-[#1A4731] hover:bg-[#1A4731]/[0.08]
                      transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30">
                    <Pencil size={13} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
            {!aldeias.length && (
              <li className="px-5 py-5 text-[13px] text-[#5C7060]">Nenhuma aldeia neste grupo.</li>
            )}
          </ul>
        </Cartao>

        <Cartao titulo="Eixos temáticos" icone={Layers} semPaddingCorpo
          subtitulo="Dicionário único do projeto, para os dois grupos."
          acao={podeEscrever
            ? <BotaoPrimario icone={Plus} tamanho="sm" onClick={() => abrirEixo(null)}>Novo eixo</BotaoPrimario>
            : null}>
          <ul>
            {eixos.map((e) => (
              <li key={e.id}
                className="px-5 py-2.5 border-b border-[#F4F6F4] last:border-b-0 flex items-center gap-2">
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold text-[#1A2B1F] truncate">{e.nome}</span>
                  {e.linha_estrategica && (
                    <span className="block text-[11px] text-[#5C7060] truncate">{e.linha_estrategica}</span>
                  )}
                </span>
                {podeEscrever && (
                  <button type="button" aria-label={`Editar o eixo ${e.nome}`}
                    onClick={() => abrirEixo(e)}
                    className="p-1.5 rounded-lg text-[#8A9990] hover:text-[#1A4731] hover:bg-[#1A4731]/[0.08]
                      transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30">
                    <Pencil size={13} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
            {!eixos.length && (
              <li className="px-5 py-5 text-[13px] text-[#5C7060]">Nenhum eixo cadastrado.</li>
            )}
          </ul>
        </Cartao>
      </div>

      <PainelLateral
        aberto={painel !== null}
        onFechar={() => { setPainel(null); setEditando(null); }}
        titulo={painel === 'aldeia'
          ? (editando ? 'Editar aldeia' : 'Nova aldeia')
          : (editando ? 'Editar eixo' : 'Novo eixo')}
        subtitulo={painel === 'aldeia' ? grupo?.nome : 'Projeto inteiro'}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario icone={X} onClick={() => { setPainel(null); setEditando(null); }}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={enviar} carregando={salvando}>
              {editando ? 'Salvar' : 'Cadastrar'}
            </BotaoPrimario>
          </div>
        }
      >
        <div className="space-y-4">
          <Campo rotulo="Nome" tipo="texto" valor={form.nome ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, nome: v }))} />
          {painel === 'aldeia' ? (
            <>
              <Campo rotulo="Tipo" tipo="select"
                valor={form.e_associacao ? 'associacao' : 'aldeia'}
                onChange={(v) => setForm((f) => ({ ...f, e_associacao: v === 'associacao' }))}
                opcoes={[
                  { valor: 'aldeia', rotulo: 'Aldeia' },
                  { valor: 'associacao', rotulo: 'Associação (despesa da entidade)' },
                ]}
                dica="Despesa que não é de uma aldeia específica vai na Associação." />
              {editando && (
                <Campo rotulo="Situação" tipo="select"
                  valor={form.ativa === false ? 'inativa' : 'ativa'}
                  onChange={(v) => setForm((f) => ({ ...f, ativa: v !== 'inativa' }))}
                  opcoes={[
                    { valor: 'ativa', rotulo: 'Ativa' },
                    { valor: 'inativa', rotulo: 'Inativa (some dos formulários novos)' },
                  ]}
                  dica="Os lançamentos históricos continuam mostrando a aldeia." />
              )}
            </>
          ) : (
            <Campo rotulo="Linha estratégica" tipo="select" valor={form.linha_estrategica ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, linha_estrategica: v }))}
              opcoes={LINHAS_ESTRATEGICAS}
              dica="Liga o eixo à Teoria da Mudança do projeto." />
          )}
        </div>
      </PainelLateral>
    </div>
  );
}

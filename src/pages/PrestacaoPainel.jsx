/**
 * PrestacaoPainel - a visão gerencial da prestação de contas, e a gestão dos
 * ciclos.
 *
 * A PARTIR DE 01/09/2026 A EQUIPE ALIMENTA O SISTEMA, não o Excel. O painel é a
 * leitura que a planilha nunca deu de graça: quanto entrou, quanto foi
 * declarado, quanto o EXTRATO comprova, e onde está o buraco - mês a mês, por
 * eixo e por aldeia.
 *
 * O desenho segue o método da skill de visualização (ver o cabeçalho de
 * src/components/prestacao/Visual.jsx): número-herói em tiles, barras pareadas
 * para as duas séries, barras horizontais para categoria, paleta validada.
 *
 * OS DOIS GRUPOS NÃO SE SOMAM: não existe total do projeto em lugar nenhum, e o
 * seletor não tem "todos". CLPI e associações separadas.
 *
 * A GESTÃO DE CICLOS MORA AQUI porque abrir e fechar ciclo é decisão gerencial.
 * Fechar TRAVA a escrita no servidor (409): a prestação vira evidência estável.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, BadgeCheck, CalendarRange, Coins, FileWarning, Landmark, Layers,
  Lock, MapPin, Pencil, Plus, Receipt, Scale, WifiOff, X,
} from 'lucide-react';
import { atualizarCiclo, criarCiclo, painelDoCiclo } from '@/lib/api/prestacao';
import { montarUrl } from '@/lib/pageRoutes';
import {
  NotaSemDadoPessoal, SeletorPrestacao, brl, brlCurto, deValorDoCampo, mesCurto,
  paraCampoValor, usePrestacao,
} from '@/components/prestacao/ContextoPrestacao';
import {
  BarraLista, EsqueletoPainel, GraficoMensal, StatTile,
} from '@/components/prestacao/Visual';
import Cartao from '@/components/ui/Cartao';
import Campo from '@/components/ui/Campo';
import Badge from '@/components/ui/Badge';
import EstadoVazio from '@/components/ui/EstadoVazio';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import PainelLateral from '@/components/ui/PainelLateral';

const STATUS_CICLO = {
  aberto: { rotulo: 'Aberto', tom: 'verde' },
  em_conciliacao: { rotulo: 'Em conciliação', tom: 'ambar' },
  fechado: { rotulo: 'Fechado', tom: 'neutro' },
};

const CICLO_VAZIO = { nome: '', inicio: '', fim: '', saldo_abertura: '', status: 'aberto' };

export default function PrestacaoPainel() {
  const cliente = useQueryClient();
  const { msal, grupos, grupo, ciclo, escolher, podeEscrever, carregando, erro } = usePrestacao();

  const [cicloAberto, setCicloAberto] = useState(false);
  const [cicloEditando, setCicloEditando] = useState(null);
  const [formCiclo, setFormCiclo] = useState(CICLO_VAZIO);

  const painelQuery = useQuery({
    queryKey: ['carbon', 'prestacao', 'painel', ciclo?.ciclo_id],
    queryFn: () => painelDoCiclo(msal, ciclo.ciclo_id),
    enabled: Boolean(ciclo?.ciclo_id),
  });

  const salvarCiclo = useMutation({
    mutationFn: (dados) =>
      cicloEditando
        ? atualizarCiclo(msal, cicloEditando.ciclo_id, dados)
        : criarCiclo(msal, { grupo_id: grupo.id, ...dados }),
    onSuccess: () => {
      toast.success(cicloEditando ? 'Ciclo alterado.' : 'Ciclo aberto.');
      setCicloAberto(false);
      setCicloEditando(null);
      cliente.invalidateQueries({ queryKey: ['carbon', 'prestacao'] });
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível salvar o ciclo.'),
  });

  const abrirNovoCiclo = () => { setCicloEditando(null); setFormCiclo(CICLO_VAZIO); setCicloAberto(true); };
  const abrirEdicaoCiclo = (c) => {
    setCicloEditando(c);
    setFormCiclo({
      nome: c.ciclo ?? '',
      inicio: '',
      fim: '',
      saldo_abertura: paraCampoValor(c.saldo_abertura),
      status: c.status ?? 'aberto',
    });
    setCicloAberto(true);
  };

  const enviarCiclo = () => {
    if (!cicloEditando && (!formCiclo.nome.trim() || !formCiclo.inicio)) {
      toast.error('Informe o nome e o início do ciclo.');
      return;
    }
    const dados = { status: formCiclo.status };
    if (formCiclo.nome.trim()) dados.nome = formCiclo.nome.trim();
    if (formCiclo.inicio) dados.inicio = formCiclo.inicio;
    if (formCiclo.fim) dados.fim = formCiclo.fim;
    /* deValorDoCampo já devolve null para campo vazio, e nunca NaN. Antes daqui
       saía NaN quando a pessoa digitava algo torto, e NaN atravessa a validação
       do backend como valor ausente: o ciclo era salvo com saldo de abertura
       null e ninguém sabia por quê. */
    dados.saldo_abertura = deValorDoCampo(formCiclo.saldo_abertura);
    salvarCiclo.mutate(dados);
  };

  if (carregando) return <div className="p-4 sm:p-6"><EsqueletoPainel /></div>;

  if (erro) {
    return (
      <div className="p-6">
        <EstadoVazio icone={WifiOff} comSuperficie titulo="Não foi possível carregar a prestação de contas"
          texto={typeof erro === 'string' ? erro : 'Verifique a conexão e tente novamente.'} />
      </div>
    );
  }
  if (!grupo) {
    return (
      <div className="p-6">
        <EstadoVazio icone={Coins} comSuperficie titulo="Nenhum grupo cadastrado"
          texto="A prestação de contas é organizada por grupo comunitário. Rode o seed de prestação para carregar os dados das planilhas." />
      </div>
    );
  }

  const p = painelQuery.data;
  const saldo = p?.saldo ?? ciclo ?? {};
  const semComprovante = Math.abs(Number(saldo.declarado_sem_comprovante ?? 0));
  const declarado = Math.abs(Number(saldo.declarado ?? 0));
  const antecipado = Number(saldo.antecipado ?? 0);
  const comprovadoExtrato = Number(p?.comprovantes?.soma ?? 0);
  const pct = declarado ? Math.round((semComprovante / declarado) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <SeletorPrestacao grupos={grupos} grupo={grupo} ciclo={ciclo} escolher={escolher} />

      {!ciclo ? (
        <div className="space-y-4">
          <EstadoVazio icone={CalendarRange} comSuperficie titulo="Nenhum ciclo neste grupo"
            texto={podeEscrever ? 'Abra o primeiro ciclo para começar a lançar.' : 'Não há ciclo de prestação cadastrado.'} />
          {podeEscrever && <BotaoPrimario icone={Plus} onClick={abrirNovoCiclo}>Abrir ciclo</BotaoPrimario>}
        </div>
      ) : painelQuery.isLoading ? (
        <EsqueletoPainel />
      ) : painelQuery.isError ? (
        <EstadoVazio icone={WifiOff} comSuperficie titulo="Não foi possível calcular o painel"
          texto={painelQuery.error?.message ?? 'Verifique a conexão e tente novamente.'} />
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatTile rotulo="Antecipado" Icone={Coins} tom="verde" valor={brl(antecipado)}
              sub={antecipado === 0 ? 'A planilha de origem não registra repasses neste período.' : `${grupo.nome}`} />
            <StatTile rotulo="Declarado" Icone={BadgeCheck} tom="verde" valor={brl(declarado)}
              sub={`${saldo.lancamentos ?? 0} lançamentos`} />
            <StatTile rotulo="Comprovado pelo extrato" Icone={Receipt} tom="laranja" valor={brl(comprovadoExtrato)}
              sub={`${p?.comprovantes?.quantidade ?? 0} comprovantes registrados`} />
            <StatTile rotulo="Falta comprovar" Icone={FileWarning} alerta={semComprovante > 0}
              valor={brl(semComprovante)} sub={`${pct}% do declarado, pelo próprio razão`} />
            <StatTile rotulo="Saldo do ciclo" Icone={Scale} tom="neutro" valor={brl(Number(saldo.saldo ?? 0))}
              sub={saldo.saldo_abertura != null
                ? `Inclui abertura de ${brl(saldo.saldo_abertura)}`
                : 'Sem saldo de abertura informado'} />
          </div>

          <Cartao titulo="Declarado contra o extrato, mês a mês" icone={CalendarRange} semPaddingCorpo
            subtitulo="A distância entre as duas barras é o que ainda precisa de conciliação.">
            <GraficoMensal itens={p?.por_competencia ?? []} formatar={brl}
              formatarEixo={brlCurto} rotuloMes={mesCurto} />
          </Cartao>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Cartao titulo="Por eixo temático" icone={Layers} semPaddingCorpo
              subtitulo="Em que o recurso foi aplicado. A fatia âmbar falta comprovar.">
              <BarraLista itens={p?.por_eixo ?? []} formatar={brl} />
            </Cartao>
            <Cartao titulo="Por aldeia" icone={MapPin} semPaddingCorpo
              subtitulo="Quem recebeu o benefício, e quanto ficou na associação.">
              <BarraLista itens={p?.por_aldeia ?? []} formatar={brl}
                iconeDe={(i) => (/associa/i.test(i.chave) ? Landmark : undefined)} />
            </Cartao>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ['PrestacaoAntecipacoes', Coins, 'Lançar repasses'],
              ['PrestacaoLancamentos', FileWarning, 'Lançar despesas'],
              ['PrestacaoComprovantes', Receipt, 'Registrar comprovantes'],
              ['PrestacaoAtividades', CalendarRange, 'Atividades de campo'],
            ].map(([nome, Icone, rotulo]) => (
              <Link key={nome}
                to={`${montarUrl(nome)}?grupo=${grupo.id}&ciclo=${ciclo.ciclo_id}`}
                className="group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DDE3DE]
                  bg-white text-[13px] font-semibold text-[#5C7060] hover:text-[#1A4731]
                  hover:border-[#1A4731]/40 transition-colors">
                <Icone size={14} aria-hidden="true" />
                {rotulo}
                <ArrowRight size={13} className="opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all"
                  aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <Cartao titulo={`Ciclos - ${grupo.nome}`} icone={CalendarRange} semPaddingCorpo
        subtitulo="Fechar um ciclo trava lançamentos novos: a prestação vira evidência estável."
        acao={podeEscrever
          ? <BotaoPrimario icone={Plus} tamanho="sm" onClick={abrirNovoCiclo}>Novo ciclo</BotaoPrimario>
          : null}>
        <ul>
          {(grupo.ciclos ?? []).map((c) => {
            const st = STATUS_CICLO[c.status] ?? STATUS_CICLO.aberto;
            return (
              <li key={c.ciclo_id}
                className="px-5 py-3 border-b border-[#F4F6F4] last:border-b-0 flex flex-wrap items-center gap-3
                  hover:bg-[#FAFBFA] transition-colors">
                <div className="flex-1 min-w-[220px]">
                  <p className="text-[13.5px] font-semibold text-[#1A2B1F] flex items-center gap-2">
                    {c.status === 'fechado' && <Lock size={12} className="text-[#8A9990]" aria-hidden="true" />}
                    {c.ciclo}
                  </p>
                  <p className="text-[11.5px] text-[#5C7060] tabular-nums">
                    {c.lancamentos} lançamento(s) · saldo {brl(c.saldo)}
                    {c.saldo_abertura != null && ` · abertura ${brl(c.saldo_abertura)}`}
                  </p>
                </div>
                <Badge tom={st.tom} tamanho="sm">{st.rotulo}</Badge>
                {podeEscrever && (
                  <button type="button" aria-label={`Editar o ciclo ${c.ciclo}`}
                    onClick={() => abrirEdicaoCiclo(c)}
                    className="p-1.5 rounded-lg text-[#8A9990] hover:text-[#1A4731] hover:bg-[#1A4731]/[0.08]
                      transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30">
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
          {!(grupo.ciclos ?? []).length && (
            <li className="px-5 py-5 text-[13px] text-[#8A9990]">Nenhum ciclo ainda.</li>
          )}
        </ul>
      </Cartao>

      <NotaSemDadoPessoal />

      <PainelLateral
        aberto={cicloAberto}
        onFechar={() => { setCicloAberto(false); setCicloEditando(null); }}
        titulo={cicloEditando ? 'Editar ciclo' : 'Novo ciclo'}
        subtitulo={grupo?.nome}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario icone={X} onClick={() => { setCicloAberto(false); setCicloEditando(null); }}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={enviarCiclo} carregando={salvarCiclo.isPending}>
              {cicloEditando ? 'Salvar' : 'Abrir ciclo'}
            </BotaoPrimario>
          </div>
        }
      >
        <div className="space-y-4">
          <Campo rotulo="Nome" tipo="texto" valor={formCiclo.nome}
            onChange={(v) => setFormCiclo((f) => ({ ...f, nome: v }))}
            placeholder="Outubro 2025 a Março 2026" />
          {!cicloEditando && (
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Início" tipo="data" valor={formCiclo.inicio}
                onChange={(v) => setFormCiclo((f) => ({ ...f, inicio: v }))} />
              <Campo rotulo="Fim" tipo="data" valor={formCiclo.fim}
                onChange={(v) => setFormCiclo((f) => ({ ...f, fim: v }))} />
            </div>
          )}
          <Campo rotulo="Saldo de abertura" tipo="decimal" valor={formCiclo.saldo_abertura}
            onChange={(v) => setFormCiclo((f) => ({ ...f, saldo_abertura: v }))}
            dica="O que a comunidade informou trazer do ciclo anterior. Divergência com o fechamento calculado fica visível de propósito." />
          <Campo rotulo="Situação" tipo="select" valor={formCiclo.status}
            onChange={(v) => setFormCiclo((f) => ({ ...f, status: v }))}
            opcoes={[
              { valor: 'aberto', rotulo: 'Aberto' },
              { valor: 'em_conciliacao', rotulo: 'Em conciliação' },
              { valor: 'fechado', rotulo: 'Fechado (trava lançamentos)' },
            ]} />
        </div>
      </PainelLateral>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, BellOff, ArrowRight, ExternalLink, CheckCircle2, AlertCircle, Info,
  X, Loader2, Leaf, LayoutGrid, Mail, WifiOff,
  // ícones oferecidos aos módulos (mesmo mapa explícito do Layout)
  Home, TreePine, FileText, FileCheck2, BarChart3, Factory, Globe2,
  ClipboardList, Users, Settings, Sparkles, Cloud, Recycle, Handshake, Award,
  ShieldCheck, Calculator, Layers, Megaphone,
} from 'lucide-react';
import { obterModulos, obterNotificacoes } from '@/lib/carbonApi';
import { getConfig } from '@/lib/runtimeConfig';
import { createPageUrl } from '@/utils';
import { rotaInternaSegura, urlExternaSegura } from '@/utils/urlSegura';

/* ===== Mapa de ícones =====================================================
   O banco guarda o ícone como string. O mapa é explícito (e não um import
   dinâmico) para preservar o tree-shaking do lucide; nome desconhecido cai no
   fallback Leaf, então um typo no cadastro nunca quebra a tela.            */
const ICONES = {
  Home, Leaf, TreePine, FileText, FileCheck2, BarChart3, Factory, Globe2,
  ClipboardList, Users, Settings, Sparkles, Cloud, Recycle, Handshake, Award,
  ShieldCheck, Calculator, Layers, Megaphone,
};
const resolverIcone = (nome) => ICONES[nome] || Leaf;

const ACCENT_PADRAO = '#1A4731';

/* ===== Helpers ============================================================ */
function saudacaoPorHora(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatarData(d = new Date()) {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "agora", "há 12 min", "ontem"... Data inválida devolve string vazia (sem crash). */
function tempoRelativo(iso) {
  if (!iso) return '';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const min = Math.floor((new Date() - data) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return data.toLocaleDateString('pt-BR');
}

const TIPO_VISUAL = {
  info:    { icon: Info,         color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
  sucesso: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  alerta:  { icon: AlertCircle,  color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
};

/* ===== Blocos reutilizados ================================================ */
function AvisoDiscreto({ texto }) {
  return (
    <div className="flex items-center gap-2 px-5 py-6 text-xs text-[#8A9990]">
      <WifiOff size={14} className="flex-shrink-0" />
      <span>{texto}</span>
    </div>
  );
}

function Carregando({ rotulo }) {
  return (
    <div className="flex items-center justify-center gap-2 px-5 py-12 text-[#8A9990]">
      <Loader2 size={16} className="animate-spin" />
      <span className="text-xs">{rotulo}</span>
    </div>
  );
}

/* ===== Notificações ======================================================= */
/**
 * Resolve a ação de uma notificação (jsonb livre em carbon_notificacoes.acao).
 *
 * Aceita as DUAS formas de rota interna: `rota` (caminho pronto, ex.: '/BoasVindas')
 * e `page` (NOME da página, resolvido por createPageUrl) - o comentário da coluna no
 * banco documentava `page`, que o frontend simplesmente ignorava, então a ação
 * cadastrada conforme a documentação nunca aparecia.
 *
 * `url` só é aceita com esquema http/https: o React não bloqueia href="javascript:...".
 */
function resolverAcao(acao) {
  if (!acao || typeof acao !== 'object') return { rotaInterna: null, urlExterna: null, label: 'Abrir' };
  const rotaInterna =
    rotaInternaSegura(acao.rota) ??
    (typeof acao.page === 'string' && acao.page.trim() ? rotaInternaSegura(createPageUrl(acao.page.trim())) : null);
  return {
    rotaInterna,
    urlExterna: urlExternaSegura(acao.url),
    label: acao.label || 'Abrir',
  };
}

function NotificacaoItem({ notificacao, onDispensar }) {
  const visual = TIPO_VISUAL[notificacao.tipo] || TIPO_VISUAL.info;
  const Icon = visual.icon;
  const { rotaInterna, urlExterna, label: rotuloAcao } = resolverAcao(notificacao.acao);

  return (
    <div className="group flex items-start gap-3 px-5 py-4 hover:bg-[#F4F6F4]/60 transition-colors">
      <div className={`w-9 h-9 ${visual.bg} ${visual.border} border rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} className={visual.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1A2B1F] leading-snug">{notificacao.titulo}</p>
        {notificacao.descricao && (
          <p className="text-xs text-[#5C7060] mt-0.5 leading-relaxed">{notificacao.descricao}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[11px] text-[#8A9990]">{tempoRelativo(notificacao.criado_em)}</span>
          {/* A ação pode vir como rota interna (`rota` ou `page`) ou link externo (`url`) */}
          {rotaInterna && (
            <Link
              to={rotaInterna}
              className="text-[11px] font-semibold text-[#F47920] hover:text-[#e06810] flex items-center gap-1"
            >
              {rotuloAcao}
              <ArrowRight size={10} />
            </Link>
          )}
          {urlExterna && (
            <a
              href={urlExterna}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-[#F47920] hover:text-[#e06810] flex items-center gap-1"
            >
              {rotuloAcao}
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDispensar(notificacao.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center"
        aria-label="Dispensar notificação"
      >
        <X size={13} className="text-slate-400" />
      </button>
    </div>
  );
}

function NotificacoesCard({ notificacoes, carregando, erro }) {
  // Dispensar é apenas visual, no estado do componente: ainda não existe endpoint
  // de "marcar como lida", então recarregar a página traz o aviso de volta.
  const [dispensadas, setDispensadas] = useState([]);
  const dispensar = (id) => setDispensadas((atual) => [...atual, id]);

  const visiveis = useMemo(
    () => notificacoes.filter((n) => !dispensadas.includes(n.id)),
    [notificacoes, dispensadas],
  );
  const total = visiveis.length;

  return (
    <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F6F4]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#F47920]/10 rounded-xl flex items-center justify-center">
            <Bell size={17} className="text-[#F47920]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1A2B1F]">Notificações</h2>
            {/* O estado de erro vem ANTES do teste de total: com a busca falhando,
                `total` é 0 e o cartão afirmaria "Você está em dia" logo acima do
                aviso de que a lista não carregou - o usuário concluiria que não há
                nada pendente quando os avisos apenas não foram lidos. */}
            <p className="text-xs text-[#5C7060]">
              {carregando
                ? 'Carregando avisos...'
                : erro
                  ? 'Não foi possível verificar agora'
                  : total === 0
                    ? 'Você está em dia'
                    : `${total} ${total === 1 ? 'novo aviso' : 'novos avisos'}`}
            </p>
          </div>
        </div>
        {total > 0 && (
          <button
            type="button"
            onClick={() => setDispensadas(notificacoes.map((n) => n.id))}
            className="text-xs font-semibold text-[#5C7060] hover:text-[#1A4731] transition-colors"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {carregando ? (
        <Carregando rotulo="Buscando notificações" />
      ) : erro ? (
        <AvisoDiscreto texto="Não foi possível carregar as notificações agora." />
      ) : total === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="w-14 h-14 bg-[#F4F6F4] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BellOff size={22} className="text-[#8A9990]" />
          </div>
          <p className="text-sm font-semibold text-[#1A2B1F]">Nenhuma notificação no momento</p>
          <p className="text-xs text-[#5C7060] mt-1 max-w-xs mx-auto leading-relaxed">
            Quando houver algum aviso ou atualização relevante para você, ele aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#F4F6F4]">
          {visiveis.map((n) => (
            <NotificacaoItem key={n.id} notificacao={n} onDispensar={dispensar} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== Sobre o Apsis Carbon =============================================== */
function SobreCard() {
  return (
    <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F4F6F4]">
        <div className="w-9 h-9 bg-[#1A4731]/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Leaf size={17} className="text-[#1A4731]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#1A2B1F]">Sobre o Apsis Carbon</h2>
          <p className="text-xs text-[#5C7060]">O que você faz por aqui</p>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-sm text-[#5C7060] leading-relaxed">
          O Apsis Carbon concentra a estruturação e o acompanhamento de projetos de carbono,
          os contratos de emissão, o inventário de gases de efeito estufa (GEE) e os relatórios
          de sustentabilidade.
        </p>
        <p className="text-sm text-[#5C7060] leading-relaxed">
          Cada módulo liberado passa a aparecer no menu lateral e nesta tela.
        </p>
      </div>
    </div>
  );
}

/* ===== Módulos ============================================================ */
function ModuloCard({ modulo }) {
  const Icone = resolverIcone(modulo.icone);
  const accent = modulo.accent || ACCENT_PADRAO;
  /* Destinos vindos do banco: só http/https em url_externa e só caminho com uma
     barra inicial em rota. O React não bloqueia href="javascript:...", e um valor
     desses num card clicado por qualquer colaborador executaria script na origem
     do Carbon (com acesso ao cache do MSAL). Recusado cai no cartão inerte. */
  const urlExterna = urlExternaSegura(modulo.url_externa);
  const rotaInterna = rotaInternaSegura(modulo.rota);
  const externo = Boolean(urlExterna);

  const conteudo = (
    <div className="group h-full bg-white border border-[#DDE3DE] rounded-2xl p-5 flex flex-col gap-3 hover:border-[#1A4731]/30 hover:shadow-md transition-all cursor-pointer">
      {/* o sufixo 14 no hex é o alpha (~8%) do fundo da caixa do ícone */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
        style={{ background: `${accent}14` }}
      >
        <Icone size={20} style={{ color: accent }} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-[#1A2B1F]">{modulo.label}</p>
        {modulo.descricao && (
          <p className="text-xs text-[#5C7060] mt-0.5 leading-relaxed">{modulo.descricao}</p>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs font-semibold text-[#5C7060] group-hover:text-[#F47920] transition-colors">
        Abrir
        {externo ? <ExternalLink size={11} /> : <ArrowRight size={11} />}
      </div>
    </div>
  );

  if (externo) {
    return (
      <a href={urlExterna} target="_blank" rel="noopener noreferrer" className="block">
        {conteudo}
      </a>
    );
  }
  if (rotaInterna) {
    return <Link to={rotaInterna} className="block">{conteudo}</Link>;
  }

  // Módulo sem rota nem url (ou com destino recusado pela validação de esquema):
  // mostra o cartão inerte, sem link quebrado.
  return (
    <div className="h-full bg-white border border-[#DDE3DE] rounded-2xl p-5 flex flex-col gap-3 opacity-60">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${accent}14` }}>
        <Icone size={20} style={{ color: accent }} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-[#1A2B1F]">{modulo.label}</p>
        {modulo.descricao && (
          <p className="text-xs text-[#5C7060] mt-0.5 leading-relaxed">{modulo.descricao}</p>
        )}
      </div>
      <div className="text-xs font-semibold text-[#8A9990]">Em breve</div>
    </div>
  );
}

function ModulosVazio({ suporteEmail }) {
  return (
    <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm px-5 py-12 text-center">
      <div className="w-14 h-14 bg-[#F4F6F4] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <LayoutGrid size={22} className="text-[#8A9990]" />
      </div>
      <p className="text-sm font-semibold text-[#1A2B1F]">Os módulos serão liberados em breve</p>
      <p className="text-xs text-[#5C7060] mt-1 max-w-md mx-auto leading-relaxed">
        A equipe de Inovação está configurando os acessos. Assim que um módulo for liberado para
        você, ele aparece aqui e no menu lateral.
      </p>
      {suporteEmail && (
        <a
          href={`mailto:${suporteEmail}`}
          className="inline-flex items-center gap-2 mt-4 text-xs font-semibold text-[#1A4731] hover:text-[#245E40] underline underline-offset-2"
        >
          <Mail size={13} />
          {suporteEmail}
        </a>
      )}
    </div>
  );
}

/* ===== Página ============================================================= */
export default function BoasVindas() {
  const { instance, accounts } = useMsal();
  const autenticado = (accounts?.length ?? 0) > 0;
  const primeiroNome = useMemo(
    () => ((accounts?.[0]?.name || '').split(' ')[0] || '').trim(),
    [accounts],
  );
  const config = getConfig();
  const suporteEmail = config?.app?.suporteEmail || '';

  /**
   * Feature flags do bloco `flags` de carbon_app_config. `!== false` de propósito:
   * chave ausente mantém a funcionalidade ligada; só um `false` explícito desliga.
   * Desligada, a query nem é disparada (a Edge Function não é chamada).
   */
  const flags = config?.flags || {};
  const notificacoesLigadas = flags.notificacoes !== false;
  const modulosLigados = flags.modulosDinamicos !== false;

  // As duas queries usam as MESMAS chaves do Layout, de propósito: o cache é
  // compartilhado e a Edge Function é chamada uma vez só por sessão de navegação.
  const notificacoesQuery = useQuery({
    queryKey: ['carbon', 'notificacoes'],
    queryFn: async () => {
      const resposta = await obterNotificacoes({ instance, accounts });
      return Array.isArray(resposta) ? resposta : (resposta?.notificacoes ?? []);
    },
    enabled: autenticado && notificacoesLigadas,
  });

  const modulosQuery = useQuery({
    queryKey: ['carbon', 'modulos'],
    queryFn: async () => {
      const resposta = await obterModulos({ instance, accounts });
      return Array.isArray(resposta) ? resposta : (resposta?.modulos ?? []);
    },
    enabled: autenticado && modulosLigados,
    staleTime: 5 * 60 * 1000,
  });

  const notificacoes = notificacoesQuery.data ?? [];
  const modulos = useMemo(
    () => [...(modulosQuery.data ?? [])].sort(
      (a, b) => (a?.ordem ?? Number.MAX_SAFE_INTEGER) - (b?.ordem ?? Number.MAX_SAFE_INTEGER),
    ),
    [modulosQuery.data],
  );

  return (
    <div className="min-h-screen bg-[#F4F6F4]">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.45s ease both; }
        .fade-up-1 { animation-delay: 0.04s; }
        .fade-up-2 { animation-delay: 0.10s; }
        .fade-up-3 { animation-delay: 0.18s; }
      `}</style>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ===== Saudação (o título da página fica na topbar do Layout) ===== */}
        <div className="fade-up fade-up-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2B1F] tracking-tight">
              {saudacaoPorHora()}{primeiroNome ? `, ${primeiroNome}` : ''}.
            </h1>
            {/* first-letter:uppercase, e NAO capitalize: `capitalize` capitaliza CADA
                palavra e produz "Sexta-Feira, 7 De Agosto" (o portal tem esse defeito).
                Aqui sai "Sexta-feira, 7 de agosto", que e a forma correta em portugues. */}
            <p className="text-sm text-[#5C7060] mt-1 first-letter:uppercase">{formatarData()}</p>
          </div>
        </div>

        {/* ===== Notificações + Sobre =====
            Com a flag `notificacoes` desligada, o card sai e o "Sobre" ocupa a
            largura útil, em vez de sobrar uma coluna vazia. */}
        <div className="fade-up fade-up-2 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {notificacoesLigadas && (
            <div className="lg:col-span-2">
              <NotificacoesCard
                notificacoes={notificacoes}
                carregando={notificacoesQuery.isLoading}
                erro={notificacoesQuery.isError}
              />
            </div>
          )}
          <div className={notificacoesLigadas ? '' : 'lg:col-span-3'}>
            <SobreCard />
          </div>
        </div>

        {/* ===== Módulos (some inteira com a flag `modulosDinamicos` false) ===== */}
        {modulosLigados && (
          <div className="fade-up fade-up-3 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-[#F47920]" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#5C7060]">Módulos</h2>
            </div>

            {modulosQuery.isLoading ? (
              <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm">
                <Carregando rotulo="Carregando módulos" />
              </div>
            ) : modulosQuery.isError ? (
              <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm">
                {/* Sem prometer que recarregar resolve: sessão expirada e acesso
                    suspenso já têm tela própria (GuardaDeSessao em App.jsx), então
                    o que sobra aqui é falha momentânea de rede ou do servidor. */}
                <AvisoDiscreto texto="Não foi possível carregar os módulos agora. Se o aviso continuar, avise a equipe responsável pelo sistema." />
              </div>
            ) : modulos.length === 0 ? (
              <ModulosVazio suporteEmail={suporteEmail} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {modulos.map((modulo, i) => (
                  <ModuloCard key={modulo.chave || modulo.rota || modulo.url_externa || `modulo-${i}`} modulo={modulo} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

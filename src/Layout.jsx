/**
 * Layout - shell do Apsis Carbon (sidebar + topbar + área de conteúdo).
 *
 * Diferença central em relação ao Layout do Portal APSIS: aqui NÃO existe árvore de
 * menu hardcoded nem filtro de permissão por perfil. A navegação é a soma de
 *   1. os itens fixos (ITENS_FIXOS, telas próprias do Carbon); e
 *   2. os módulos vindos da tabela carbon_modulos, lidos pela Edge Function carbon-api.
 * Assim, liberar um módulo novo é um INSERT no banco, sem deploy do frontend.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { rotaInternaSegura, urlExternaSegura } from '@/utils/urlSegura';
import { obterModulos, obterNotificacoes } from '@/lib/carbonApi';
import { getConfig } from '@/lib/runtimeConfig';
import {
  // ícones do próprio shell
  ChevronLeft, ChevronRight, Bell, User, Menu, X, ExternalLink,
  // ícones disponíveis para os módulos (ver mapa ICONES)
  Home, Leaf, TreePine, FileText, FileCheck2, BarChart3, Factory, Globe2,
  ClipboardList, Users, Settings, Sparkles, Cloud, Recycle, Handshake, Award,
  ShieldCheck, Calculator, Layers, Megaphone, FolderTree,
} from 'lucide-react';

const LOGO_SRC = '/login/logo-apsis-transp.png';

/**
 * Mapa explícito nome-do-ícone -> componente do lucide-react.
 *
 * O banco guarda o ícone como STRING (coluna `icone`), então o mapa precisa ser
 * explícito: importar o lucide inteiro dinamicamente inflaria o bundle e um import
 * dinâmico por nome quebraria o tree-shaking. Nome desconhecido cai no fallback Leaf,
 * ou seja, um typo no banco nunca derruba o menu.
 * Para oferecer um ícone novo aos módulos, acrescente o import acima e a chave aqui.
 */
const ICONES = {
  Home,
  Leaf,
  TreePine,
  FileText,
  FileCheck2,
  BarChart3,
  Factory,
  Globe2,
  ClipboardList,
  Users,
  Settings,
  Sparkles,
  Cloud,
  Recycle,
  Handshake,
  Award,
  ShieldCheck,
  Calculator,
  Layers,
  Megaphone,
  FolderTree,
};

const resolverIcone = (nome) => ICONES[nome] || Leaf;

/**
 * Itens fixos da navegação: telas próprias do Carbon, que existem no bundle e não
 * dependem de cadastro em carbon_modulos.
 *
 * POR QUE "Projetos" É FIXO: carbon_modulos está vazia enquanto os módulos de negócio
 * não são definidos, então um item que só viesse do banco deixaria a tela de Projetos
 * inalcançável pelo menu - só por URL digitada à mão.
 *
 * `paginas` lista os currentPageName que devem acender o item. O PDD é tela filha de
 * Projetos ('/Projetos/<id>/PDD'), por isso mantém o mesmo item aceso.
 */
const ITENS_FIXOS = [
  {
    chave: 'BoasVindas',
    label: 'Boas-Vindas',
    icone: 'Home',
    rota: createPageUrl('BoasVindas'),
    paginas: ['BoasVindas'],
  },
  {
    chave: 'Projetos',
    label: 'Projetos',
    icone: 'FolderTree',
    rota: createPageUrl('Projetos'),
    paginas: ['Projetos', 'ProjetoPdd'],
  },
];

/**
 * Cabeçalho único por página, exibido só na topbar.
 * Regra herdada do portal: nenhuma tela renderiza <h1> de título próprio.
 * O subtítulo cai no fallback "Apsis Carbon" quando a página não está mapeada.
 */
const PAGE_HEADERS = {
  BoasVindas: { title: 'Boas-Vindas', subtitle: 'Apsis Carbon' },
  Projetos: { title: 'Projetos', subtitle: 'Cadastro dos projetos de carbono' },
  ProjetoPdd: { title: 'PDD', subtitle: 'Capítulos do Project Design Document' },
};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { instance, accounts } = useMsal();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const usuario = accounts?.[0];
  const nomeUsuario = usuario?.name || 'Usuário';
  const emailUsuario = usuario?.username || '';
  const autenticado = (accounts?.length ?? 0) > 0;

  /**
   * Feature flags de carbon_app_config (bloco `flags`). O teste é `!== false` de
   * propósito: uma chave ausente no banco não pode apagar um pedaço da tela - só
   * um `false` explícito desliga. Desligar a flag também impede a chamada à Edge
   * Function, e não apenas esconde o resultado.
   */
  const flags = getConfig()?.flags || {};
  const modulosLigados = flags.modulosDinamicos !== false;
  const notificacoesLigadas = flags.notificacoes !== false;

  // Módulos do menu. staleTime de 5 min porque a lista muda com frequência de dias,
  // não de segundos. Erro de rede não derruba o shell: `data` fica undefined e o
  // default [] mantém apenas o item fixo "Boas-Vindas".
  const { data: modulos = [] } = useQuery({
    queryKey: ['carbon', 'modulos'],
    queryFn: async () => {
      const resposta = await obterModulos({ instance, accounts });
      return Array.isArray(resposta) ? resposta : (resposta?.modulos ?? []);
    },
    enabled: autenticado && modulosLigados,
    staleTime: 5 * 60 * 1000,
  });

  // Mesma chave usada pela tela de Boas-Vindas: o contador do sino reaproveita o
  // cache da query dela, sem uma segunda chamada à Edge Function.
  const { data: notificacoes = [] } = useQuery({
    queryKey: ['carbon', 'notificacoes'],
    queryFn: async () => {
      const resposta = await obterNotificacoes({ instance, accounts });
      return Array.isArray(resposta) ? resposta : (resposta?.notificacoes ?? []);
    },
    enabled: autenticado && notificacoesLigadas,
  });

  const totalNotificacoes = notificacoes.length;

  // Itens fixos + módulos ordenados por `ordem` (linhas sem ordem vão para o fim).
  const itensNav = useMemo(() => {
    const doBanco = [...modulos].sort(
      (a, b) => (a?.ordem ?? Number.MAX_SAFE_INTEGER) - (b?.ordem ?? Number.MAX_SAFE_INTEGER),
    );
    return [...ITENS_FIXOS, ...doBanco];
  }, [modulos]);

  // Fecha o menu do usuário ao clicar fora
  useEffect(() => {
    const aoClicar = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', aoClicar);
    return () => document.removeEventListener('mousedown', aoClicar);
  }, []);

  const sair = async () => {
    try {
      // O deep link guardado no boot (sessionStorage) sobrevive ao logout, porque
      // sessionStorage é por ABA e o logoutRedirect volta para a mesma aba. Sem
      // apagar aqui, o próximo login feito nesta aba - possivelmente de outra
      // pessoa - herdaria o destino da sessão anterior.
      sessionStorage.removeItem('postLoginRedirect');
    } catch {
      // sessionStorage bloqueado: nada a limpar.
    }
    try {
      await instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
    } catch (e) {
      console.error('[Apsis Carbon] Falha ao encerrar a sessão:', e);
    }
  };

  /**
   * Item ativo. As páginas fixas são identificadas por currentPageName (cada item
   * declara em `paginas` quais telas o acendem, o que mantém "Projetos" aceso também
   * no PDD); os módulos, pelo pathname, porque a rota deles vem do banco e não passa
   * por PAGE_ROUTES.
   */
  const estaAtivo = (item) => {
    if (Array.isArray(item.paginas)) return item.paginas.includes(currentPageName);
    if (!item.rota) return false;
    return location.pathname === item.rota || location.pathname.startsWith(item.rota + '/');
  };

  /**
   * @param {boolean} compacto  esconde os rótulos (só a sidebar desktop colapsa)
   * @param {Function|null} aoClicarLink  usado no mobile para fechar o overlay
   */
  const renderItensNav = (compacto, aoClicarLink = null) =>
    itensNav.map((item, i) => {
      const Icone = resolverIcone(item.icone);
      const ativo = estaAtivo(item);
      const chave = item.chave || item.rota || item.url_externa || `modulo-${i}`;
      const classes = `nav-item flex items-center gap-3 px-3 py-2.5 rounded-l-lg cursor-pointer ${ativo ? 'active' : ''}`;
      const corIcone = ativo ? 'text-[var(--apsis-orange)]' : 'text-white/50';
      const corTexto = ativo ? 'text-white' : 'text-white/60';

      /* Os destinos vêm do BANCO e vão direto para um href. O React não bloqueia
         href="javascript:...", então um valor colado por engano em carbon_modulos
         viraria execução de código na origem do Carbon - com acesso ao cache do
         MSAL no localStorage. urlExternaSegura só aceita http/https e
         rotaInternaSegura só aceita uma barra inicial; recusado vira o item inerte
         mais abaixo, do mesmo jeito que um módulo cadastrado sem destino. */
      const urlExterna = urlExternaSegura(item.url_externa);
      const rotaInterna = rotaInternaSegura(item.rota);

      // Módulo em outro sistema (ex.: ferramenta de inventário de GEE hospedada fora)
      if (urlExterna) {
        return (
          <a
            key={chave}
            href={urlExterna}
            target="_blank"
            rel="noopener noreferrer"
            onClick={aoClicarLink || undefined}
            className={classes}
            title={compacto ? item.label : undefined}
          >
            <Icone size={18} className={`${corIcone} flex-shrink-0`} />
            {!compacto && (
              <>
                <span className={`flex-1 text-sm font-medium ${corTexto}`}>{item.label}</span>
                <ExternalLink size={12} className="text-white/30 flex-shrink-0" />
              </>
            )}
          </a>
        );
      }

      if (rotaInterna) {
        return (
          <Link
            key={chave}
            to={rotaInterna}
            onClick={aoClicarLink || undefined}
            className={classes}
            title={compacto ? item.label : undefined}
          >
            <Icone size={18} className={`${corIcone} flex-shrink-0`} />
            {!compacto && <span className={`text-sm font-medium ${corTexto}`}>{item.label}</span>}
          </Link>
        );
      }

      // Módulo cadastrado sem destino (ou com destino recusado pela validação de
      // esquema): aparece inerte em vez de sumir em silêncio, para que a
      // configuração incompleta fique visível para quem administra.
      return (
        <div
          key={chave}
          className="nav-item flex items-center gap-3 px-3 py-2.5 rounded-l-lg opacity-50 cursor-default"
          title={compacto ? `${item.label} (disponível em breve)` : 'Disponível em breve'}
        >
          <Icone size={18} className="text-white/40 flex-shrink-0" />
          {!compacto && <span className="text-sm font-medium text-white/40">{item.label}</span>}
        </div>
      );
    });

  const cabecalho = PAGE_HEADERS[currentPageName] || {};
  const tituloPagina =
    cabecalho.title ||
    itensNav.find((i) => i.chave === currentPageName)?.label ||
    currentPageName ||
    'Apsis Carbon';
  const subtituloPagina = cabecalho.subtitle || 'Apsis Carbon';

  return (
    <div className="min-h-screen bg-[#F4F6F4] flex font-sans">
      {/* As fontes são carregadas UMA vez, em src/index.css. Aqui só as variáveis
          de tema e as regras de navegação/animação do shell. */}
      <style>{`
        * { font-family: 'Inter', sans-serif; }
        :root {
          --apsis-green: #1A4731;
          --apsis-green-light: #245E40;
          --apsis-orange: #F47920;
          --apsis-orange-light: #F9A15A;
          --apsis-gray: #E8EDE9;
          --surface: #FFFFFF;
          --surface-2: #F4F6F4;
          --border: #DDE3DE;
          --text-primary: #1A2B1F;
          --text-secondary: #5C7060;
          --success: #22C55E;
          --warning: #F47920;
          --danger: #EF4444;
        }
        .nav-item { transition: all 0.18s ease; border-right: 3px solid transparent; }
        .nav-item:hover { background: rgba(244,121,32,0.10); }
        .nav-item.active { background: rgba(244,121,32,0.15); border-right: 3px solid #F47920; }
        .nav-item-sub { transition: all 0.18s ease; }
        .nav-item-sub:hover { background: rgba(255,255,255,0.06); }
        .nav-item-sub.is-open { background: rgba(255,255,255,0.08); }
        .nav-item-sub.is-current { background: rgba(255,255,255,0.10); }
        .sidebar-transition { transition: width 0.25s cubic-bezier(0.4,0,0.2,1); }
        .fade-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        /* Logo desliza da esquerda a cada abrir/fechar do menu. O replay depende do
           key={collapsed ? ...} no elemento .logo-reveal, que força o remount. */
        .logo-reveal { animation: logoSlideLR 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes logoSlideLR {
          from { transform: translateX(-115%); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
      `}</style>

      {/* ===== Sidebar desktop ===== */}
      <aside
        className={`hidden md:flex flex-col sidebar-transition bg-[var(--apsis-green)] relative z-30 ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}
        style={{ minHeight: '100vh' }}
      >
        {/* Logo direto sobre o verde (sem cartão branco), com o selo CARBON abaixo */}
        <div className={`border-b border-white/10 overflow-hidden ${collapsed ? 'px-3 py-3' : 'py-3 px-4'}`}>
          <div
            key={collapsed ? 'logo-min' : 'logo-full'}
            className={`logo-reveal flex flex-col items-center ${collapsed ? 'w-11 mx-auto' : 'w-full py-2.5'}`}
          >
            <img
              src={LOGO_SRC}
              alt="APSIS"
              className={`object-contain ${collapsed ? 'w-full h-auto' : 'h-9 w-auto'}`}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            {!collapsed && (
              <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/45">
                Carbon
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {renderItensNav(collapsed)}
        </nav>

        {/* Botão de colapso */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="absolute -right-3 top-[72px] w-6 h-6 bg-[var(--apsis-orange)] rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
        >
          {collapsed ? <ChevronRight size={12} className="text-white" /> : <ChevronLeft size={12} className="text-white" />}
        </button>

        {/* Rodapé da sidebar */}
        <div className={`p-3 border-t border-white/10 flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          {/* Fundo e borda em rgba explicito, e nao com modificador de opacidade
              sobre cor arbitraria em var(). Motivo: o Tailwind 3 precisa decompor
              a cor em canais para aplicar o modificador, e nao consegue fazer isso
              com um var() (o valor so existe em runtime, no navegador). O resultado
              e que a classe nao entra no CSS gerado - silenciosamente, sem warning -
              e o circulo ficaria sem fundo e com a borda cinza do preflight.
              rgba(244,121,32,...) e o mesmo laranja de var(--apsis-orange). */}
          <div
            className="w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(244, 121, 32, 0.2)', borderColor: 'rgba(244, 121, 32, 0.3)' }}
          >
            <User size={13} className="text-[var(--apsis-orange)]" />
          </div>
          {!collapsed && <span className="text-white/50 text-xs">Minha conta</span>}
        </div>
      </aside>

      {/* ===== Sidebar mobile (overlay) ===== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 w-64 h-full bg-[var(--apsis-green)] flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 w-full">
              <div className="flex flex-col items-center w-full overflow-hidden">
                <div className="text-white text-xs font-bold tracking-wider uppercase mb-1">Carbon</div>
                <div className="logo-reveal bg-white rounded-xl px-3 py-2 flex items-center justify-center overflow-hidden w-40">
                  <img
                    src={LOGO_SRC}
                    alt="APSIS"
                    className="w-full h-auto object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)} className="ml-4" aria-label="Fechar menu">
                <X size={18} className="text-white/50" />
              </button>
            </div>
            <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
              {/* compacto = false: no mobile a sidebar nunca colapsa */}
              {renderItensNav(false, () => setMobileOpen(false))}
            </nav>
          </aside>
        </div>
      )}

      {/* ===== Conteúdo ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[var(--border)] px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button type="button" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
              <Menu size={20} className="text-[var(--text-secondary)]" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-[var(--apsis-orange)]" />
              <div>
                <h1 className="text-base font-semibold text-[var(--text-primary)]">{tituloPagina}</h1>
                <p className="text-xs text-[var(--text-secondary)]">{subtituloPagina}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* O sino leva para a Boas-Vindas, onde fica o cartão completo de avisos.
                Some por inteiro quando a flag `notificacoes` está false no banco. */}
            {notificacoesLigadas && (
              <Link
                to={createPageUrl('BoasVindas')}
                className="relative p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                aria-label={
                  totalNotificacoes > 0
                    ? `${totalNotificacoes} notificação(ões)`
                    : 'Nenhuma notificação'
                }
              >
                <Bell size={18} className="text-[var(--text-secondary)]" />
                {totalNotificacoes > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[var(--apsis-orange)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalNotificacoes > 9 ? '9+' : totalNotificacoes}
                  </span>
                )}
              </Link>
            )}

            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-full bg-[var(--apsis-green)] flex items-center justify-center hover:opacity-80 transition-opacity"
                aria-label="Menu do usuário"
              >
                <User size={14} className="text-white" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-10 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-3 z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">{nomeUsuario}</p>
                    <p className="text-xs text-slate-500 mt-0.5 break-all">{emailUsuario || 'Sem e-mail'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={sair}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 fade-in">{children}</main>
      </div>
    </div>
  );
}

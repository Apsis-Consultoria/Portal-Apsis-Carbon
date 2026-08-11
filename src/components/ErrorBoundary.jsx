import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * ErrorBoundary - rede de segurança da árvore de rotas.
 *
 * Um erro de render em qualquer tela dentro do Router cai aqui e vira um cartão no
 * padrão visual, em vez de tela branca. Precisa ser class component porque
 * getDerivedStateFromError/componentDidCatch não têm equivalente em hooks.
 *
 * A stack trace aparece SOMENTE em desenvolvimento (import.meta.env.DEV): em produção
 * ela poderia expor caminhos de arquivo e nomes internos para o usuário final.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    // O log no console é o único canal de diagnóstico por enquanto. Quando existir
    // telemetria (Edge Function de log), é aqui que a chamada deve entrar.
    console.error('[Apsis Carbon] Erro não tratado na árvore de componentes:', erro, info?.componentStack);
  }

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    return (
      <div className="min-h-screen bg-[#F4F6F4] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg bg-white border border-[#DDE3DE] rounded-2xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={24} className="text-amber-600" />
          </div>

          <h1
            className="text-xl font-bold text-[#1A2B1F] tracking-tight"
            style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}
          >
            Algo não carregou como esperado
          </h1>
          <p className="text-sm text-[#5C7060] mt-2 leading-relaxed">
            A tela encontrou um erro inesperado. Recarregar normalmente resolve. Se o problema
            continuar, avise a equipe de Inovação informando o que você estava fazendo.
          </p>

          {import.meta.env.DEV && (
            <pre className="mt-5 text-left text-[11px] text-[#8A9990] bg-[#F4F6F4] border border-[#DDE3DE] rounded-xl p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {String(erro?.stack || erro?.message || erro)}
            </pre>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-[#F47920] hover:bg-[#e06810] text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm mt-6"
          >
            <RotateCcw size={15} />
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}

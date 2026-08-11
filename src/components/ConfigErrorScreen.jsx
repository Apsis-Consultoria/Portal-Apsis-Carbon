import { AlertTriangle, RefreshCw } from 'lucide-react'

const SORA = "'Sora', 'Segoe UI', sans-serif"
const INTER = "'Inter', 'Segoe UI', sans-serif"

// Itens objetivos, na ordem em que vale a pena checar (do mais comum ao menos).
const VERIFICAR = [
  {
    titulo: 'VITE_SUPABASE_URL',
    detalhe: 'Precisa apontar para o projeto Supabase do Carbon (https://SEU-PROJETO.supabase.co), sem barra no final.',
  },
  {
    titulo: 'VITE_SUPABASE_ANON_KEY',
    detalhe: 'A chave anon/publishable do mesmo projeto. Em produção ela é definida no painel de deploy, não no código.',
  },
  {
    titulo: 'Edge Function app-config publicada',
    detalhe: 'Deve estar no ar com verify_jwt = false, respondendo GET /functions/v1/app-config sem Authorization.',
  },
  {
    titulo: 'Linhas em carbon_app_config com publico = true',
    detalhe: 'A função monta a resposta apenas com as linhas marcadas como públicas. Sem elas, a configuração chega vazia.',
  },
]

/**
 * Tela de erro do boot. Renderizada pelo src/main.jsx quando carregarConfig()
 * ou a inicialização do MSAL falham. Existe para que uma configuração ausente
 * ou errada nunca resulte em tela branca: o usuário vê o que aconteceu e o
 * time de TI vê exatamente o que checar.
 *
 * Sem dependência de config, MSAL, Router ou Supabase de propósito: este
 * componente tem que funcionar justamente quando nada disso funcionou.
 */
export default function ConfigErrorScreen({ erro }) {
  // O erro pode chegar como Error, string ou objeto de rede. Normaliza sem
  // deixar "undefined" aparecer na tela.
  const mensagem =
    (erro && (erro.message || erro.erro || erro.error)) ||
    (typeof erro === 'string' ? erro : '') ||
    'Erro desconhecido ao carregar a configuração.'

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-6 py-12"
      style={{
        fontFamily: INTER,
        background: 'linear-gradient(160deg, #10291c 0%, #0e241a 45%, #07130d 100%)',
      }}
    >
      <div className="w-full max-w-xl">
        {/* Cartão translúcido sobre o verde profundo, no mesmo espírito do
            painel curvo da tela de login. */}
        <div
          className="rounded-2xl border border-white/10 px-7 py-8 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#F48126]/15 border border-[#F48126]/30">
              <AlertTriangle size={20} className="text-[#F48126]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-1">
                Apsis Carbon
              </p>
              <h1
                className="text-xl sm:text-2xl font-black leading-tight text-white"
                style={{ fontFamily: SORA }}
              >
                Não foi possível carregar a configuração
              </h1>
            </div>
          </div>

          <p className="text-sm text-white/70 leading-relaxed mt-5">
            O sistema busca toda a configuração no backend antes de abrir a tela de
            login. Como essa leitura falhou, não há como autenticar agora.
          </p>

          {/* Mensagem técnica do erro: fica visível de propósito, é o que o time
              de TI precisa para diagnosticar. Nunca conteria dado de cliente. */}
          <div className="mt-4 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/35 mb-1">
              Detalhe técnico
            </p>
            <p className="text-xs text-[#F9A15A] break-words font-mono leading-relaxed">
              {String(mensagem)}
            </p>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-[#F48126]" />
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-white/50">
                O que verificar
              </h2>
            </div>
            <ul className="space-y-3">
              {VERIFICAR.map((item) => (
                <li key={item.titulo} className="flex items-start gap-3">
                  <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#F48126] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/90">{item.titulo}</p>
                    <p className="text-xs text-white/55 leading-relaxed mt-0.5">
                      {item.detalhe}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full mt-8 inline-flex items-center justify-center gap-2 bg-[#F47920] hover:bg-[#e06810] text-white font-semibold py-3.5 px-6 rounded-lg text-sm transition-colors shadow-sm"
          >
            <RefreshCw size={16} />
            Tentar novamente
          </button>

          <p className="text-[11px] text-white/35 text-center mt-5 leading-relaxed">
            Se o erro continuar, acione a equipe de TI da APSIS informando a
            mensagem técnica acima.
          </p>
        </div>
      </div>
    </div>
  )
}

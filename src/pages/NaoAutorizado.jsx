import { useMsal } from '@azure/msal-react';
import { ShieldAlert, LogOut, Mail } from 'lucide-react';
import { getConfig } from '@/lib/runtimeConfig';

/**
 * Tela para quem autenticou na Microsoft mas não passou na checagem de domínio da
 * carbon-api (resposta 403 { erro: 'dominio_nao_permitido' }).
 *
 * Renderiza em tela cheia, sem o shell: quem cai aqui não tem acesso a menu nenhum.
 * O domínio e o e-mail de suporte vêm da config do Supabase, para que ajustar a
 * mensagem seja um UPDATE em carbon_app_config, sem deploy.
 */
export default function NaoAutorizado() {
  const { instance } = useMsal();
  const config = getConfig();
  const dominio = config?.app?.dominioPermitido || 'apsis.com.br';
  const suporteEmail = config?.app?.suporteEmail || '';

  const sairETentarOutraConta = async () => {
    try {
      // O deep link guardado no boot não pode sobreviver ao logout: na mesma aba,
      // o próximo login (possivelmente de outra pessoa) o herdaria.
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

  return (
    <div className="min-h-screen bg-[#F4F6F4] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white border border-[#DDE3DE] rounded-2xl shadow-sm p-8 text-center">
        <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldAlert size={24} className="text-amber-600" />
        </div>

        <h1
          className="text-xl font-bold text-[#1A2B1F] tracking-tight"
          style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}
        >
          Acesso não autorizado
        </h1>
        <p className="text-sm text-[#5C7060] mt-2 leading-relaxed">
          O Apsis Carbon é restrito a contas corporativas{' '}
          <span className="font-semibold text-[#1A4731]">@{dominio}</span>. A conta usada no login
          não pertence a esse domínio.
        </p>
        <p className="text-sm text-[#5C7060] mt-3 leading-relaxed">
          Se você é colaborador da APSIS, saia e entre novamente com a sua conta corporativa.
        </p>

        <button
          type="button"
          onClick={sairETentarOutraConta}
          className="inline-flex items-center gap-2 bg-[#F47920] hover:bg-[#e06810] text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm mt-6"
        >
          <LogOut size={15} />
          Sair e tentar outra conta
        </button>

        {suporteEmail && (
          <div className="mt-6 pt-5 border-t border-[#F4F6F4]">
            <p className="text-xs text-[#8A9990]">Precisa de ajuda?</p>
            <a
              href={`mailto:${suporteEmail}`}
              className="inline-flex items-center gap-2 mt-1.5 text-xs font-semibold text-[#1A4731] hover:text-[#245E40] underline underline-offset-2"
            >
              <Mail size={13} />
              {suporteEmail}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

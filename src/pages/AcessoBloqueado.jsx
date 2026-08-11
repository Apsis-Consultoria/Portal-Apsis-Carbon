import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { Clock, LogIn, LogOut, Mail, UserX } from 'lucide-react';
import { getConfig } from '@/lib/runtimeConfig';
import { montarLoginRequest } from '@/lib/msalConfig';
import { limparEstadoTransitorioMsal } from '@/lib/msalCache';

/**
 * AcessoBloqueado - tela cheia para os dois casos em que o app NAO pode continuar
 * e recarregar a pagina nao resolve:
 *
 *   motivo = 'sessao_expirada'  a renovacao silenciosa do token falhou
 *                               (ErroInteracaoNecessaria no carbonApi, ou 401
 *                               nao_autenticado da Edge Function). Sem uma nova
 *                               interacao com a Microsoft nada volta a funcionar:
 *                               o boot repete exatamente o mesmo caminho.
 *   motivo = 'usuario_inativo'  a carbon-api respondeu 403 usuario_inativo, ou
 *                               seja, carbon_usuarios.ativo = false para esta
 *                               conta (offboarding em andamento, por exemplo).
 *
 * Antes desta tela os dois casos terminavam num app vazio: menu so com
 * Boas-Vindas, sino zerado e um aviso discreto pedindo para recarregar - o que
 * nao resolvia nem explicava nada.
 */
export default function AcessoBloqueado({ motivo = 'sessao_expirada' }) {
  const { instance } = useMsal();
  const config = getConfig();
  const suporteEmail = config?.app?.suporteEmail || '';
  const [erro, setErro] = useState('');

  const inativo = motivo === 'usuario_inativo';

  const entrarNovamente = async () => {
    setErro('');
    try {
      await instance.loginRedirect(montarLoginRequest(config));
    } catch (e) {
      // Estado de interacao travado (aba fechada no meio de um redirect anterior):
      // limpa o transitorio e tenta uma unica vez mais.
      if (e?.errorCode === 'interaction_in_progress') {
        limparEstadoTransitorioMsal();
        try {
          await instance.loginRedirect(montarLoginRequest(config));
          return;
        } catch (erroNaRetentativa) {
          console.warn('[AcessoBloqueado] loginRedirect falhou:', erroNaRetentativa?.message || erroNaRetentativa);
        }
      } else {
        console.warn('[AcessoBloqueado] loginRedirect falhou:', e?.message || e);
      }
      setErro('Nao foi possivel abrir a tela de login. Recarregue a pagina e tente de novo.');
    }
  };

  const sair = async () => {
    try {
      // O deep link guardado antes do login nao pode sobreviver ao logout: na mesma
      // aba, o proximo login (possivelmente de outra pessoa) o herdaria.
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

  const Icone = inativo ? UserX : Clock;

  return (
    <div className="min-h-screen bg-[#F4F6F4] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white border border-[#DDE3DE] rounded-2xl shadow-sm p-8 text-center">
        <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Icone size={24} className="text-amber-600" />
        </div>

        <h1
          className="text-xl font-bold text-[#1A2B1F] tracking-tight"
          style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}
        >
          {inativo ? 'Acesso suspenso' : 'Sua sessão expirou'}
        </h1>

        {inativo ? (
          <>
            <p className="text-sm text-[#5C7060] mt-2 leading-relaxed">
              Sua conta está cadastrada no Apsis Carbon, mas o acesso está suspenso. Isso costuma
              acontecer durante mudanças de time ou desligamento.
            </p>
            <p className="text-sm text-[#5C7060] mt-3 leading-relaxed">
              Se você acredita que é um engano, fale com a equipe responsável pelo sistema.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-[#5C7060] mt-2 leading-relaxed">
              Por segurança, a Microsoft encerrou a sessão e ela não pôde ser renovada
              automaticamente.
            </p>
            <p className="text-sm text-[#5C7060] mt-3 leading-relaxed">
              Recarregar a página não resolve: é preciso entrar de novo com a sua conta corporativa.
            </p>
          </>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          {!inativo && (
            <button
              type="button"
              onClick={entrarNovamente}
              className="inline-flex items-center gap-2 bg-[#F47920] hover:bg-[#e06810] text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
            >
              <LogIn size={15} />
              Entrar novamente
            </button>
          )}
          <button
            type="button"
            onClick={sair}
            className="inline-flex items-center gap-2 bg-white border border-[#DDE3DE] hover:border-[#1A4731]/30 text-[#1A4731] font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>

        {erro && (
          <p role="alert" className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4">
            {erro}
          </p>
        )}

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

/**
 * PainelLateral - gaveta da direita para formulários.
 *
 * Existe porque o formulário inline de Projetos empurra a lista para baixo: com mais
 * campos, ou com a lista longa, a pessoa perde o contexto do registro que estava vendo.
 * O painel preserva a lista atrás e sai sem recarregar nada.
 *
 * O que este componente resolve, e por que cada parte é necessária:
 *
 * - ESCAPE e CLIQUE FORA fecham. São as duas saídas que todo mundo tenta primeiro.
 * - FOCO PRESO enquanto aberto. Sem isso, o Tab continua andando pelos links do menu
 *   atrás do painel: quem navega por teclado fica editando um formulário que não vê e
 *   pode ativar um link e perder o que digitou.
 * - FOCO DEVOLVIDO ao fechar, para o elemento que abriu o painel. Sem isso o foco volta
 *   para o começo do documento e a pessoa recomeça a navegação.
 * - ROLAGEM DO FUNDO TRAVADA, e rolagem própria no corpo. Duas barras de rolagem
 *   competindo fazem o painel "escapar" da tela ao rolar.
 * - PORTAL para o body. O painel é `fixed`, e um `fixed` dentro de um ancestral com
 *   transform (a transição do menu lateral, por exemplo) passa a se posicionar em
 *   relação a esse ancestral em vez da janela.
 *
 * Sem dependência nova: react-dom e tailwindcss-animate já estão no projeto.
 */

import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/* Elementos que podem receber foco. `[tabindex="-1"]` fica fora: é focável por script,
   mas não faz parte da ordem do Tab. */
const SELETOR_FOCAVEL = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const LARGURAS = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

/**
 * @param {object} props
 * @param {boolean} props.aberto
 * @param {() => void} props.onFechar chamado por Escape, clique fora e botão de fechar
 * @param {string} props.titulo obrigatório: é o rótulo acessível do diálogo
 * @param {React.ReactNode} [props.subtitulo]
 * @param {React.ComponentType<{size?: number}>} [props.icone]
 * @param {'sm'|'md'|'lg'|'xl'} [props.largura='md']
 * @param {React.ReactNode} [props.rodape] barra fixa embaixo, para os botões de ação
 * @param {boolean} [props.fecharAoClicarFora=true] passe false em formulário com
 *        alteração não salva, para um clique distraído não descartar o preenchimento
 * @param {string} [props.className] classes extras no painel
 * @param {React.ReactNode} props.children
 */
export default function PainelLateral({
  aberto,
  onFechar,
  titulo,
  subtitulo,
  icone: Icone,
  largura = 'md',
  rodape,
  fecharAoClicarFora = true,
  className = '',
  children,
}) {
  const painelRef = useRef(null);
  const focoAnterior = useRef(null);
  const idTitulo = useId();

  // Guarda quem tinha o foco e devolve ao fechar.
  useEffect(() => {
    if (!aberto) return undefined;
    focoAnterior.current = document.activeElement;
    return () => {
      const alvo = focoAnterior.current;
      // `document.contains` porque o elemento que abriu pode ter saído da árvore
      // (um botão dentro da linha que acabou de ser removida da lista).
      if (alvo && typeof alvo.focus === 'function' && document.contains(alvo)) alvo.focus();
    };
  }, [aberto]);

  // Foco inicial: primeiro controle do painel, ou o próprio painel se não houver.
  useEffect(() => {
    if (!aberto) return;
    const painel = painelRef.current;
    if (!painel) return;
    const primeiro = painel.querySelector(SELETOR_FOCAVEL);
    (primeiro || painel).focus();
  }, [aberto]);

  // Trava a rolagem do documento enquanto o painel está aberto.
  useEffect(() => {
    if (!aberto) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  // Escape no documento (e não só no painel): funciona mesmo se o foco escapar.
  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') onFechar?.();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto, onFechar]);

  /** Circula o Tab dentro do painel. */
  const prenderFoco = useCallback((evento) => {
    if (evento.key !== 'Tab') return;
    const painel = painelRef.current;
    if (!painel) return;

    // `offsetParent` nulo significa elemento escondido (display none, ancestral
    // recolhido): incluí-lo mandaria o foco para um lugar invisível.
    const focaveis = Array.from(painel.querySelectorAll(SELETOR_FOCAVEL)).filter(
      (el) => el.offsetParent !== null,
    );

    if (!focaveis.length) {
      evento.preventDefault();
      painel.focus();
      return;
    }

    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const ativo = document.activeElement;
    const foraDoPainel = !painel.contains(ativo);

    if (evento.shiftKey && (ativo === primeiro || foraDoPainel)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && (ativo === ultimo || foraDoPainel)) {
      evento.preventDefault();
      primeiro.focus();
    }
  }, []);

  if (!aberto || typeof document === 'undefined') return null;

  return createPortal(
    // z-50 é o topo da pilha do shell (o menu lateral do mobile usa z-40 e z-50, e a
    // topbar z-20): a gaveta tem de cobrir os dois.
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-[#1A2B1F]/40 animate-in fade-in duration-200"
        onClick={fecharAoClicarFora ? onFechar : undefined}
        aria-hidden="true"
      />

      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        onKeyDown={prenderFoco}
        className={`relative h-full w-full ${LARGURAS[largura] || LARGURAS.md} bg-white border-l border-[#DDE3DE] shadow-xl flex flex-col focus:outline-none animate-in slide-in-from-right duration-200 ${className}`}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#F4F6F4] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {Icone && (
              <div className="w-9 h-9 bg-[#1A4731]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icone size={17} className="text-[#1A4731]" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0">
              <h2 id={idTitulo} className="text-sm font-bold text-[#1A2B1F] break-words">
                {titulo}
              </h2>
              {subtitulo && <p className="text-xs text-[#5C7060] mt-0.5 leading-relaxed">{subtitulo}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar painel"
            className="w-8 h-8 rounded-lg hover:bg-[#F4F6F4] flex items-center justify-center flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30"
          >
            <X size={15} className="text-[#8A9990]" aria-hidden="true" />
          </button>
        </div>

        {/* A rolagem é AQUI, não no painel: o cabeçalho e o rodapé ficam visíveis com o
            formulário longo, e o botão de salvar não foge para fora da tela. */}
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {rodape && (
          <div className="px-5 py-4 border-t border-[#F4F6F4] bg-[#F4F6F4]/40 flex-shrink-0">{rodape}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}

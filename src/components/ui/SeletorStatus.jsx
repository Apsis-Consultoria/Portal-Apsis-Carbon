/**
 * SeletorStatus - <select> que se pinta com o tom do valor escolhido.
 *
 * Extraído do seletor de status do PDD: o mesmo controle mostra o estado atual (cor) e
 * permite trocá-lo, sem precisar de um badge ao lado repetindo a informação.
 *
 * Duas decisões que não são estéticas:
 *
 * 1. VALOR DESCONHECIDO NÃO É DESCARTADO. Se o banco tiver um status que o frontend
 *    ainda não conhece, um <select> comum cairia sozinho na primeira opção e a tela
 *    passaria a exibir um estado que não é o do registro - e o primeiro salvamento
 *    gravaria essa mentira. Aqui o valor cru entra como opção extra, marcada, para
 *    ficar visível que existe algo fora do mapa.
 * 2. `<option>` sempre com fundo branco e texto escuro. A lista aberta é desenhada pelo
 *    sistema operacional e herda a cor do <select>: sem isso, no tom vermelho, a lista
 *    aparece com texto vinho sobre vinho em algumas combinações de Windows e Chrome.
 */

import { useId } from 'react';
import { Loader2 } from 'lucide-react';
import { classesDoTom } from './Badge';

const TAMANHOS = {
  sm: 'px-2 py-1 text-[10px] rounded-lg',
  md: 'px-2.5 py-1.5 text-[11px] rounded-lg',
};

/**
 * @param {object} props
 * @param {string} props.valor valor atual
 * @param {{valor: string, rotulo: string, tom?: string}[]} props.opcoes
 * @param {(valor: string) => void} props.onChange recebe o VALOR, não o evento
 * @param {string} props.rotuloAcessivel obrigatório: o controle não tem <label> visível
 * @param {boolean} [props.desabilitado=false]
 * @param {boolean} [props.carregando=false] mostra spinner ao lado e desabilita
 * @param {'sm'|'md'} [props.tamanho='md']
 * @param {string} [props.className]
 */
export default function SeletorStatus({
  valor,
  opcoes = [],
  onChange,
  rotuloAcessivel = 'Status',
  desabilitado = false,
  carregando = false,
  tamanho = 'md',
  className = '',
}) {
  const idAviso = useId();
  const atual = valor === null || valor === undefined ? '' : String(valor);
  const conhecida = opcoes.find((o) => String(o?.valor) === atual);
  const tom = conhecida?.tom || 'neutro';
  const classeTamanho = TAMANHOS[tamanho] || TAMANHOS.md;
  const bloqueado = desabilitado || carregando;

  return (
    <span className="inline-flex items-center gap-1.5">
      {carregando && (
        <Loader2 size={12} className="animate-spin text-[#8A9990] flex-shrink-0" aria-hidden="true" />
      )}
      <select
        value={atual}
        onChange={(evento) => onChange?.(evento.target.value)}
        disabled={bloqueado}
        aria-label={rotuloAcessivel}
        aria-busy={carregando || undefined}
        aria-describedby={!conhecida && atual ? idAviso : undefined}
        className={`border font-semibold cursor-pointer transition-colors disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30 ${classeTamanho} ${classesDoTom(tom)} ${className}`}
      >
        {!conhecida && atual && (
          <option value={atual} className="bg-white text-[#1A2B1F]">
            {atual}
          </option>
        )}
        {!atual && (
          // Placeholder desabilitado: o registro sem status não pode parecer que já
          // está na primeira opção da lista.
          <option value="" disabled className="bg-white text-[#8A9990]">
            Selecione
          </option>
        )}
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor} className="bg-white text-[#1A2B1F]">
            {opcao.rotulo}
          </option>
        ))}
      </select>
      {!conhecida && atual && (
        <span id={idAviso} className="sr-only">
          Status fora da lista conhecida pelo sistema.
        </span>
      )}
    </span>
  );
}

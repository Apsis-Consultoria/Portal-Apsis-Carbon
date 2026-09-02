/**
 * ContextoPrestacao - o grupo e o ciclo escolhidos, compartilhados pelos seis
 * subtópicos de Prestação de contas, mais os utilitários de formato.
 *
 * POR QUE NA URL, e não em estado do React: os subtópicos são rotas diferentes,
 * e trocar de rota desmonta a tela anterior. Com `?grupo=&ciclo=` na barra de
 * endereço a escolha atravessa a navegação, volta igual no botão de voltar, e o
 * endereço pode ser colado para outra pessoa ver o mesmo recorte.
 *
 * NÃO EXISTE "TODOS OS GRUPOS". Os grupos têm consulta CLPI e associação
 * representativa separadas: somar inventaria um total que ninguém apurou. O
 * seletor é um controle segmentado com um botão por grupo, sem opção de soma.
 *
 * O modo demonstração NÃO aparece aqui: a camada de API (src/lib/api/prestacao)
 * roteia para o dublê em memória, como todos os outros módulos fazem.
 */

import { useMemo } from 'react';
import { useMsal } from '@azure/msal-react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { listarGruposPrestacao } from '@/lib/api/prestacao';

/** Reais. Os seis subtópicos formatam dinheiro do mesmo jeito. */
export function brl(v) {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* O par formatar/interpretar dos campos de dinheiro mora em src/lib/dinheiro.js,
   fora deste arquivo, para scripts/verificar-dinheiro.mjs conseguir importar as
   duas funções sem montar árvore de componente. Reexportado aqui porque as telas
   da prestação já importam brl e fmtData deste módulo, e obrigá-las a dois
   imports diferentes para formatar dinheiro é o tipo de atrito que faz alguém
   escrever String(valor) na pressa - que é exatamente o defeito que isso corrige. */
export { deValorDoCampo, paraCampoValor } from '@/lib/dinheiro';

/** Reais compactos para eixos de gráfico: 12,3 mil em vez de R$ 12.345,67. */
export function brlCurto(v) {
  const n = Math.abs(Number(v ?? 0));
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/**
 * Competência 'AAAA-MM-DD' do Postgres, formatada à mão: `new Date('2026-01-01')`
 * é meia-noite UTC e, no fuso do Brasil, mostraria o mês anterior - erro que
 * passa despercebido justamente na virada de mês, quando a prestação fecha.
 */
export function fmtMes(valor) {
  const p = String(valor ?? '').match(/^(\d{4})-(\d{2})/);
  return p ? `${p[2]}/${p[1]}` : '-';
}

export function fmtData(valor) {
  const p = String(valor ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return p ? `${p[3]}/${p[2]}/${p[1]}` : '-';
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** '2025-03' vira 'mar/25', para caber no pé de um gráfico. */
export function mesCurto(chave) {
  const p = String(chave ?? '').match(/^(\d{4})-(\d{2})/);
  if (!p) return String(chave ?? '');
  return `${MESES_CURTOS[Number(p[2]) - 1] ?? p[2]}/${p[1].slice(2)}`;
}

/**
 * Carrega os grupos e resolve grupo e ciclo correntes a partir da URL.
 */
export function usePrestacao() {
  const msal = useMsal();
  const [busca, setBusca] = useSearchParams();

  const query = useQuery({
    queryKey: ['carbon', 'prestacao', 'grupos'],
    queryFn: () => listarGruposPrestacao(msal),
    staleTime: 5 * 60 * 1000,
  });

  const grupos = useMemo(() => query.data?.grupos ?? [], [query.data]);

  /* Sem parâmetro na URL cai no primeiro grupo: a tela abre mostrando alguma
     coisa em vez de pedir uma escolha antes de existir. */
  const grupo = grupos.find((g) => g.id === busca.get('grupo')) ?? grupos[0] ?? null;
  const ciclos = grupo?.ciclos ?? [];
  const ciclo = ciclos.find((c) => c.ciclo_id === busca.get('ciclo')) ?? ciclos[0] ?? null;

  /* `replace` para o filtro não empilhar histórico: voltar deve sair da tela,
     não desfazer quatro trocas de grupo. */
  const escolher = (campo) => (valor) => {
    const novo = new URLSearchParams(busca);
    novo.set(campo, valor);
    if (campo === 'grupo') novo.delete('ciclo');
    setBusca(novo, { replace: true });
  };

  return {
    msal,
    grupos,
    grupo,
    ciclo,
    podeEscrever: query.data?.pode_escrever === true,
    escolher,
    carregando: query.isLoading,
    erro: query.isError ? (query.error?.message ?? true) : null,
  };
}

/**
 * O seletor dos seis subtópicos: grupos como controle segmentado (são dois, e
 * não há "todos"), ciclos como pílulas. Pílula é mais lenta de varrer que um
 * select quando há trinta opções - aqui há duas e punhado, e o custo de abrir
 * um dropdown a cada troca é maior que o de ler duas pílulas.
 */
export function SeletorPrestacao({ grupos, grupo, ciclo, escolher }) {
  if (!grupo) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-300">
      <div className="inline-flex rounded-xl border border-[#DDE3DE] bg-white p-1" role="group"
        aria-label="Grupo comunitário">
        {grupos.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => escolher('grupo')(g.id)}
            aria-pressed={g.id === grupo.id}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30 ${
              g.id === grupo.id
                ? 'bg-[#1A4731] text-white'
                : 'text-[#5C7060] hover:text-[#1A4731]'
            }`}
          >
            {g.nome}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Ciclo">
        {(grupo.ciclos ?? []).map((c) => (
          <button
            key={c.ciclo_id}
            type="button"
            onClick={() => escolher('ciclo')(c.ciclo_id)}
            aria-pressed={c.ciclo_id === ciclo?.ciclo_id}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12.5px]
              font-semibold transition-colors focus:outline-none focus-visible:ring-2
              focus-visible:ring-[#F47920]/30 ${
              c.ciclo_id === ciclo?.ciclo_id
                ? 'border-[#F47920] bg-[#F47920]/[0.09] text-[#9A4B0F]'
                : 'border-[#DDE3DE] bg-white text-[#5C7060] hover:border-[#F47920]/50'
            }`}
          >
            {c.status === 'fechado' && <Lock size={11} aria-hidden="true" />}
            {c.ciclo}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * O aviso de que não há nome de pessoa. Uma linha discreta, presente nos seis
 * subtópicos: quem chega por link direto não passou pelo painel e faria a
 * mesma pergunta.
 */
export function NotaSemDadoPessoal() {
  return (
    <p className="text-[11.5px] leading-relaxed text-[#8A9990]">
      Sem nome de pessoa, por decisão (LGPD): quem recebeu está identificado no comprovante
      físico, achável pelo mês e pela ordem no mês. O banco recusa texto com CPF, e-mail ou
      dado bancário.
    </p>
  );
}

/**
 * Visual - o kit gráfico da Prestação de contas.
 *
 * Construído pelo método da skill de visualização de dados, na ordem que ela
 * manda: forma primeiro, cor por função, paleta VALIDADA por script, marcas
 * finas, hover, acessibilidade.
 *
 * A PALETA DE SÉRIE FOI VALIDADA em 01/09/2026 (validate_palette.js, modo
 * light): verde #348558 e laranja #C25714 passam as seis checagens - banda de
 * luminosidade, piso de croma, separação para daltônicos (ΔE deutan/protan/
 * tritan), piso de visão normal e contraste. As cores da marca (#1A4731,
 * #F47920) FALHARAM como série de gráfico e ficam para texto e superfície;
 * âmbar #D9A441 é cor de STATUS (falta comprovar) e nunca aparece sem rótulo.
 *
 * Duas séries no máximo, um eixo só, texto sempre em tinta de texto - a cor da
 * série vive na marca, nunca na palavra.
 */

const SERIE_1 = '#348558'; // declarado
const SERIE_2 = '#C25714'; // comprovado pelo extrato
const STATUS_ALERTA = '#D9A441'; // falta comprovar, sempre com rótulo

const TONS_TILE = {
  verde: { fundo: 'bg-[#348558]/[0.10]', tinta: 'text-[#1F5A38]' },
  laranja: { fundo: 'bg-[#C25714]/[0.10]', tinta: 'text-[#9A4B0F]' },
  ambar: { fundo: 'bg-[#D9A441]/[0.14]', tinta: 'text-[#7A6231]' },
  neutro: { fundo: 'bg-[#5C7060]/[0.10]', tinta: 'text-[#42544A]' },
};

/**
 * StatTile - o número-herói. Ícone em quadrado tingido, valor grande tabular,
 * rótulo em caixa alta discreta, e uma sublinha para o contexto.
 */
export function StatTile({ rotulo, valor, sub, Icone, tom = 'neutro', alerta = false }) {
  const t = TONS_TILE[alerta ? 'ambar' : tom] ?? TONS_TILE.neutro;
  return (
    <div className={`rounded-2xl border bg-white px-4 py-3.5 transition-shadow hover:shadow-sm ${
      alerta ? 'border-[#D9A441]/50' : 'border-[#E4E9E5]'
    }`}>
      {/* Icone na linha do rotulo, e nao ao lado do numero: o numero e o heroi
          e precisa da largura inteira do tile - "R$ 407.480,00" nao trunca. */}
      <div className="flex items-center gap-2 mb-1.5">
        {Icone && (
          <span className={`w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 ${t.fundo}`}>
            <Icone size={14} className={t.tinta} aria-hidden="true" />
          </span>
        )}
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#8A9990] leading-tight">
          {rotulo}
        </p>
      </div>
      <p className="text-[19px] font-bold tabular-nums leading-[1.15] text-[#1A2B1F] whitespace-nowrap">
        {valor}
      </p>
      {sub && <p className="text-[11px] text-[#5C7060] mt-1 leading-snug">{sub}</p>}
    </div>
  );
}

/**
 * BarraLista - comparação de magnitude por categoria (eixo, aldeia), barras
 * horizontais finas com ponta arredondada. A fatia âmbar é o que falta
 * comprovar DENTRO do total, com o valor dito em texto - âmbar é status e não
 * anda sem rótulo.
 */
export function BarraLista({ itens, formatar, iconeDe, aoMedirRotulo }) {
  const maximo = Math.max(...itens.map((i) => i.total), 0);
  if (!itens.length) {
    return <p className="px-5 py-8 text-[13px] text-[#8A9990] text-center">Nenhum lançamento neste corte.</p>;
  }
  return (
    <ul className="px-5 py-2">
      {itens.map((i) => {
        const Icone = iconeDe?.(i);
        const pct = maximo ? (i.total / maximo) * 100 : 0;
        const pctFalta = i.total ? (i.sem_comprovante / i.total) * 100 : 0;
        return (
          <li key={i.chave} className="py-2.5 group" title={`${i.chave}: ${formatar(i.total)} em ${i.linhas} lançamento(s)`}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-[12.5px] font-medium text-[#1A2B1F] flex items-center gap-1.5 min-w-0">
                {Icone && <Icone size={12} className="text-[#8A9990] flex-shrink-0" aria-hidden="true" />}
                <span className="truncate">{aoMedirRotulo ? aoMedirRotulo(i) : i.chave}</span>
              </span>
              <span className="text-[12.5px] font-semibold tabular-nums text-[#1A2B1F] flex-shrink-0">
                {formatar(i.total)}
              </span>
            </div>
            <div className="h-[7px] rounded-full bg-[#EFF2EF] overflow-hidden">
              <div
                className="h-full rounded-full relative transition-[width] duration-500"
                style={{ width: `${Math.max(pct, 1)}%`, background: SERIE_1 }}
              >
                {i.sem_comprovante > 0 && (
                  <div className="absolute inset-y-0 right-0 rounded-r-full"
                    style={{ width: `${pctFalta}%`, background: STATUS_ALERTA }} />
                )}
              </div>
            </div>
            {i.sem_comprovante > 0 && (
              <p className="text-[10.5px] text-[#7A6231] mt-0.5 tabular-nums opacity-80 group-hover:opacity-100">
                {formatar(i.sem_comprovante)} sem comprovante
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * GraficoMensal - declarado contra comprovado, mês a mês, em barras pareadas.
 *
 * Duas séries, um eixo, grade recessiva de três linhas, legenda sempre
 * presente, ponta arredondada só no topo (a base ancora no zero), 2px de vão
 * entre barras do par. Tooltip nativo por barra (title), que é o hover mínimo
 * que um SVG estático oferece sem uma camada de script.
 */
export function GraficoMensal({ itens, formatar, formatarEixo, rotuloMes }) {
  if (!itens.length) {
    return <p className="px-5 py-8 text-[13px] text-[#8A9990] text-center">Nenhum lançamento neste ciclo.</p>;
  }

  const ALT = 190;
  const TOPO = 12;
  const BASE = ALT - 26;
  const grupoLarg = 84;
  const larg = Math.max(itens.length * grupoLarg + 48, 320);
  const maximo = Math.max(...itens.map((i) => Math.max(i.total, i.comprovado ?? 0)), 1);
  const escala = (v) => (BASE - TOPO) * (v / maximo);

  const grade = [0.25, 0.5, 0.75, 1];

  return (
    <div className="px-5 pb-4">
      <div className="flex items-center justify-end gap-4 pt-1 pb-2" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#5C7060]">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: SERIE_1 }} />
          Declarado
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#5C7060]">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: SERIE_2 }} />
          Comprovado pelo extrato
        </span>
      </div>
      <div className="overflow-x-auto flex justify-center">
        <svg viewBox={`0 0 ${larg} ${ALT}`} width={larg} height={ALT}
          role="img" aria-label="Declarado contra comprovado, mês a mês">
          {grade.map((f) => (
            <g key={f}>
              <line x1="34" x2={larg - 4} y1={BASE - (BASE - TOPO) * f} y2={BASE - (BASE - TOPO) * f}
                stroke="#EDF0ED" strokeWidth="1" />
              <text x="30" y={BASE - (BASE - TOPO) * f + 3} textAnchor="end"
                fontSize="9" fill="#8A9990">{formatarEixo(maximo * f)}</text>
            </g>
          ))}
          <line x1="34" x2={larg - 4} y1={BASE} y2={BASE} stroke="#D8DED9" strokeWidth="1" />

          {itens.map((i, n) => {
            const x0 = 44 + n * grupoLarg;
            const h1 = Math.max(escala(i.total), i.total > 0 ? 2 : 0);
            const h2 = Math.max(escala(i.comprovado ?? 0), (i.comprovado ?? 0) > 0 ? 2 : 0);
            return (
              <g key={i.chave}>
                <rect x={x0} y={BASE - h1} width="22" height={h1} rx="3" fill={SERIE_1}>
                  <title>{`${rotuloMes(i.chave)} - declarado ${formatar(i.total)}`}</title>
                </rect>
                <rect x={x0 + 24} y={BASE - h2} width="22" height={h2} rx="3" fill={SERIE_2}>
                  <title>{`${rotuloMes(i.chave)} - comprovado ${formatar(i.comprovado ?? 0)}`}</title>
                </rect>
                <text x={x0 + 23} y={BASE + 14} textAnchor="middle" fontSize="9.5" fill="#5C7060">
                  {rotuloMes(i.chave)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/** Esqueleto de carregamento: o formato da tela, pulsando. */
export function EsqueletoPainel() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden="true">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-[88px] rounded-2xl bg-[#E9EDE9]" />
        ))}
      </div>
      <div className="h-[250px] rounded-2xl bg-[#E9EDE9]" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[220px] rounded-2xl bg-[#E9EDE9]" />
        <div className="h-[220px] rounded-2xl bg-[#E9EDE9]" />
      </div>
    </div>
  );
}

export function EsqueletoTabela({ linhas = 6 }) {
  return (
    <div className="space-y-2 p-5 animate-pulse" aria-hidden="true">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="h-9 rounded-lg bg-[#E9EDE9]" />
      ))}
    </div>
  );
}

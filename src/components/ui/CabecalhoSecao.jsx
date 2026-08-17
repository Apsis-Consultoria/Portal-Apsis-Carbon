/**
 * CabecalhoSecao - separador de bloco dentro de uma tela.
 *
 * Extraído do bloco "Módulos" da Boas-Vindas: barrinha laranja + rótulo curto em
 * caixa alta com tracking largo. Serve para dividir uma tela em seções sem criar
 * outro nível de cartão, e para pendurar a ação da seção (um "Novo ...", um filtro)
 * ao lado do título.
 *
 * O heading é h2 por padrão porque o h1 da página é o título da topbar do Layout.
 */

/**
 * @param {object} props
 * @param {string} props.titulo
 * @param {React.ReactNode} [props.descricao] linha de apoio sob o título
 * @param {React.ReactNode} [props.acao] botão ou grupo de botões à direita
 * @param {2|3} [props.nivel=2]
 * @param {string} [props.id] útil para aria-labelledby de uma região
 * @param {string} [props.className]
 */
export default function CabecalhoSecao({
  titulo,
  descricao,
  acao,
  nivel = 2,
  id,
  className = '',
}) {
  const Titulo = nivel === 3 ? 'h3' : 'h2';
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-[#F47920] flex-shrink-0" aria-hidden="true" />
          <Titulo id={id} className="text-xs font-bold uppercase tracking-widest text-[#5C7060]">
            {titulo}
          </Titulo>
        </div>
        {descricao && (
          // pl-3 alinha a descrição com o texto do título, e não com a barrinha.
          <p className="text-xs text-[#8A9990] mt-1 pl-3 leading-relaxed">{descricao}</p>
        )}
      </div>
      {acao && <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-auto">{acao}</div>}
    </div>
  );
}

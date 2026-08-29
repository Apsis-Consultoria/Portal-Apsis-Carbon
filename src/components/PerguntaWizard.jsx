/**
 * PerguntaWizard - UMA pergunta ocupando a tela do celular.
 *
 * Segue o desenho do wizard do EPO (auditoria.html): pergunta grande, opções
 * como blocos de 56px de altura, e nada mais competindo por atenção. Não é
 * estética: quem preenche está de pé, no sol, muitas vezes com uma mão só e a
 * outra segurando o caderno. Um formulário de 61 campos numa página rolável, no
 * telefone, produz resposta na linha errada.
 *
 * ESCOLHA VIRA BOTÃO, e não <select>. O seletor nativo esconde as opções atrás
 * de um toque e abre uma roleta; com as opções à vista, quem entrevista lê em
 * voz alta e marca. Também é o que torna visível que a pergunta AINDA não foi
 * respondida, coisa que um select com a primeira opção pré-selecionada esconde.
 *
 * "NÃO RESPONDIDO" É EXPLÍCITO nas perguntas de escolha. Em diagnóstico de
 * campo, deixar em branco e responder são coisas diferentes, e a segunda não
 * pode acontecer por acidente ao passar o dedo.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Paperclip } from 'lucide-react';
import Campo from '@/components/ui/Campo';

/** Tipos que este arquivo sabe desenhar. Quem mexer aqui mexe também na
    constante TIPOS_QUE_A_TELA_DESENHA de scripts/verificar-questionarios.mjs,
    que é o que impede um seed com tipo novo de chegar em campo quebrado. */
const TIPOS_DE_TEXTO = { texto: 'texto', texto_longo: 'textarea', data: 'data', numero: 'decimal', inteiro: 'decimal' };

/**
 * Par de coordenadas.
 *
 * O TEXTO CRU FICA EM ESTADO LOCAL e só sobe quando os dois lados são números
 * válidos. O servidor recusa coordenada malformada com 400, e 400 não é falha de
 * rede: viraria "Não salvou" na tela. Sem isto, quem digita "-" e para um
 * segundo para conferir o GPS veria o aviso de erro no meio da digitação.
 *
 * O par sobe junto ou não sobe. Meia coordenada não localiza nada, e o servidor
 * recusaria de qualquer forma.
 */
function ParDeCoordenadas({ valor, aoMudar, desabilitado }) {
  const objeto = valor && typeof valor === 'object' ? valor : {};
  const [lat, setLat] = useState(objeto.latitude ?? '');
  const [lon, setLon] = useState(objeto.longitude ?? '');

  /* Resseminado quando o questionário termina de carregar do servidor, que é
     depois da primeira renderização deste componente. */
  useEffect(() => {
    setLat(objeto.latitude ?? '');
    setLon(objeto.longitude ?? '');
  }, [objeto.latitude, objeto.longitude]);

  const numero = (t) => {
    const s = String(t ?? '').trim();
    if (!s) return null;
    const n = Number(s.includes('.') ? s : s.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  };

  const propagar = (novaLat, novaLon) => {
    const a = numero(novaLat);
    const b = numero(novaLon);
    if (a === null && b === null) { aoMudar(null); return; }
    // Fora de faixa é erro de digitação, e não coordenada exótica: -49 e -4
    // trocados de lugar é o engano mais comum, e o servidor recusaria.
    const ok =
      typeof a === 'number' && !Number.isNaN(a) && a >= -90 && a <= 90 &&
      typeof b === 'number' && !Number.isNaN(b) && b >= -180 && b <= 180;
    if (ok) aoMudar({ latitude: a, longitude: b });
  };

  const incompleto =
    (String(lat).trim() !== '' || String(lon).trim() !== '') &&
    !(valor && typeof valor === 'object');

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Campo
          rotulo="Latitude"
          tipo="decimal"
          valor={lat}
          onChange={(v) => { setLat(v); propagar(v, lon); }}
          desabilitado={desabilitado}
          placeholder="-4,7312"
          classeControle="text-base"
        />
        <Campo
          rotulo="Longitude"
          tipo="decimal"
          valor={lon}
          onChange={(v) => { setLon(v); propagar(lat, v); }}
          desabilitado={desabilitado}
          placeholder="-49,9418"
          classeControle="text-base"
        />
      </div>
      <p className="mt-2 text-[12px] text-[#5C7060]">
        {incompleto
          ? 'A coordenada só é guardada com os dois valores preenchidos e dentro da faixa.'
          : 'Vírgula ou ponto, tanto faz. No Brasil os dois valores são negativos.'}
      </p>
    </div>
  );
}

/** Botão de opção única. */
function Opcao({ rotulo, marcada, aoTocar, desabilitado }) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      disabled={desabilitado}
      aria-pressed={marcada}
      className={`w-full flex items-center gap-3 min-h-[56px] px-4 py-3 rounded-xl border-[1.5px]
        text-[15px] font-semibold text-left transition-colors disabled:opacity-60
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30 ${
        marcada
          ? 'border-[#1A4731] bg-[#1A4731]/[0.06] text-[#1A2B1F]'
          : 'border-[#DDE3DE] bg-white text-[#1A2B1F] active:bg-[#F4F6F4]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`w-5 h-5 rounded-full border-[1.5px] grid place-items-center flex-shrink-0 ${
          marcada ? 'border-[#1A4731] bg-[#1A4731]' : 'border-[#C6D0C9]'
        }`}
      >
        {marcada && <Check size={12} className="text-white" strokeWidth={3} />}
      </span>
      <span className="flex-1 leading-snug">{rotulo}</span>
    </button>
  );
}

/** Caixa de múltipla escolha, mesmo alvo de toque da opção única. */
function Caixa({ rotulo, marcada, aoTocar, desabilitado }) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      disabled={desabilitado}
      aria-pressed={marcada}
      className={`w-full flex items-center gap-3 min-h-[56px] px-4 py-3 rounded-xl border-[1.5px]
        text-[15px] font-semibold text-left transition-colors disabled:opacity-60
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4731]/30 ${
        marcada
          ? 'border-[#1A4731] bg-[#1A4731]/[0.06] text-[#1A2B1F]'
          : 'border-[#DDE3DE] bg-white text-[#1A2B1F] active:bg-[#F4F6F4]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`w-5 h-5 rounded-md border-[1.5px] grid place-items-center flex-shrink-0 ${
          marcada ? 'border-[#1A4731] bg-[#1A4731]' : 'border-[#C6D0C9]'
        }`}
      >
        {marcada && <Check size={12} className="text-white" strokeWidth={3} />}
      </span>
      <span className="flex-1 leading-snug">{rotulo}</span>
    </button>
  );
}

/**
 * @param {object} props
 * @param {object} props.pergunta   entrada da definição
 * @param {string} props.secao      título da seção, mostrado como sobrelinha
 * @param {unknown} props.valor
 * @param {(v: unknown) => void} props.aoMudar
 * @param {boolean} [props.desabilitado=false]
 */
export default function PerguntaWizard({ pergunta, secao, valor, aoMudar, desabilitado = false }) {
  const opcoes = pergunta.opcoes ?? [];

  let controle = null;

  if (pergunta.tipo === 'escolha' || pergunta.tipo === 'sim_nao') {
    controle = (
      <div className="flex flex-col gap-2.5">
        {opcoes.map((o) => (
          <Opcao
            key={o.valor}
            rotulo={o.rotulo}
            marcada={valor === o.valor}
            desabilitado={desabilitado}
            // Tocar de novo na opção marcada DESMARCA. Sem isso, uma escolha
            // feita por engano não tem volta e a pessoa é obrigada a responder
            // algo, o que é pior do que a ausência de resposta.
            aoTocar={() => aoMudar(valor === o.valor ? null : o.valor)}
          />
        ))}
        <button
          type="button"
          onClick={() => aoMudar(null)}
          disabled={desabilitado || valor === null || valor === undefined}
          className="self-start mt-1 px-2 py-1 text-[13px] text-[#5C7060] underline underline-offset-2
            disabled:opacity-40 disabled:no-underline focus:outline-none focus-visible:ring-2
            focus-visible:ring-[#1A4731]/30 rounded"
        >
          Deixar sem resposta
        </button>
      </div>
    );
  } else if (pergunta.tipo === 'multipla') {
    const marcadas = Array.isArray(valor) ? valor : [];
    controle = (
      <div className="flex flex-col gap-2.5">
        {opcoes.map((o) => (
          <Caixa
            key={o.valor}
            rotulo={o.rotulo}
            marcada={marcadas.includes(o.valor)}
            desabilitado={desabilitado}
            aoTocar={() =>
              aoMudar(
                marcadas.includes(o.valor)
                  ? marcadas.filter((v) => v !== o.valor)
                  : [...marcadas, o.valor],
              )
            }
          />
        ))}
      </div>
    );
  } else if (pergunta.tipo === 'arquivo') {
    controle = (
      <Campo
        rotulo="Onde o arquivo ficou"
        tipo="textarea"
        linhas={3}
        valor={valor ?? ''}
        onChange={aoMudar}
        desabilitado={desabilitado}
        placeholder="Pasta, link do drive ou nome do registro"
        dica="O envio de arquivo pelo sistema ainda não existe. Anote aqui onde a foto ou o vídeo ficaram."
        acao={
          <span className="inline-flex items-center gap-1 text-[11px] text-[#8A6D3B]">
            <Paperclip size={12} aria-hidden="true" />
            anexo ainda não sobe pelo sistema
          </span>
        }
      />
    );
  } else if (pergunta.tipo === 'coordenada') {
    controle = (
      <ParDeCoordenadas valor={valor} aoMudar={aoMudar} desabilitado={desabilitado} />
    );
  } else if (TIPOS_DE_TEXTO[pergunta.tipo]) {
    controle = (
      <Campo
        rotulo="Resposta"
        tipo={TIPOS_DE_TEXTO[pergunta.tipo]}
        linhas={4}
        valor={valor ?? ''}
        onChange={aoMudar}
        desabilitado={desabilitado}
        classeControle="text-base"
      />
    );
  } else {
    /*
     * TIPO QUE ESTA TELA NÃO CONHECE.
     *
     * Antes isto caía num campo de texto, e essa era a pior saída possível: o
     * banco aceita dez tipos, esta tela desenha nove, e questionário novo é um
     * seed e não um deploy. Quem seedasse o décimo veria um campo comum,
     * digitaria a resposta em campo, e o servidor devolveria 400 - erro de
     * regra, que não vira pendência e não é reenviado. A resposta se perderia
     * em silêncio, no meio da Amazônia.
     *
     * Dizer a verdade na tela transforma isso num defeito de autoria, visível
     * na primeira abertura. O portão de verdade é scripts/verificar-questionarios.mjs,
     * que recusa o seed antes de ele existir; isto aqui é a segunda camada.
     */
    controle = (
      <div className="flex items-start gap-2.5 rounded-xl border border-[#E8D9B8] bg-[#FDF8EE] px-4 py-3.5">
        <AlertTriangle size={16} className="text-[#8A6D3B] mt-0.5 flex-shrink-0" aria-hidden="true" />
        <p className="text-[13px] leading-relaxed text-[#7A6231]">
          Esta pergunta é do tipo <code className="font-mono">{String(pergunta.tipo)}</code>, que
          esta tela ainda não sabe desenhar. Pule e avise a equipe do sistema: responder aqui não
          seria salvo.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#F47920] mb-2">
        {secao}
      </p>
      {/* 21px como no EPO: a pergunta precisa ser legível de relance, com o
          telefone na mão e a pessoa entrevistada olhando. */}
      <h2 className="text-[21px] font-bold leading-[1.32] text-[#1A2B1F] mb-3.5">
        {pergunta.rotulo}
        {pergunta.obrigatoria && (
          <span className="text-[#C0392B] ml-1" aria-hidden="true">*</span>
        )}
      </h2>

      {pergunta.dica && (
        <p className="text-[13px] leading-relaxed text-[#5C7060] bg-[#F4F6F4] rounded-xl px-3.5 py-3 mb-5">
          {pergunta.dica}
        </p>
      )}

      {controle}
    </div>
  );
}

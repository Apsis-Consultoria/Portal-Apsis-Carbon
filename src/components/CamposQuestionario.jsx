/**
 * CamposQuestionario - desenha um formulário inteiro a partir da definição que
 * veio do servidor.
 *
 * POR QUE DIRIGIDO POR DEFINIÇÃO, e não quatro telas escritas à mão. Os quatro
 * formulários de campo somam 163 perguntas e seguem a mesma forma: seções com
 * perguntas de escolha, múltipla, texto, número, data e coordenada. Escrever
 * cada um como JSX daria quatro arquivos enormes e, mais caro que isso, faria o
 * quinto formulário exigir desenvolvedor. Aqui o quinto é uma linha no banco.
 *
 * O CUSTO, declarado: nenhuma pergunta pode ter regra própria. Se um dia um
 * campo precisar depender de outro ("se marcou Outros, mostre o texto"), isso
 * vira propriedade da definição, e não um `if` escondido aqui.
 *
 * NÃO GUARDA ESTADO. Recebe `valores` e devolve mudanças por `aoMudar`. Quem
 * chama decide quando salvar - é o que permite a tela salvar rascunho sozinha
 * sem este componente saber que rascunho existe.
 *
 * LGPD: não existe campo de nome. Os formulários originais pedem em cinco
 * lugares e nenhum foi transcrito para a definição; quem preenche sai do login e
 * o entrevistado entra pela função, que é campo do cabeçalho e não pergunta. Se
 * alguém reintroduzir uma pergunta com chave de nome, o servidor recusa a
 * gravação - ver o gatilho carbon_questionarios_sem_dado_pessoal.
 */

import { Fragment } from 'react';
import { Paperclip } from 'lucide-react';
import Campo from '@/components/ui/Campo';
import CabecalhoSecao from '@/components/ui/CabecalhoSecao';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';

/** Uma pergunta de múltipla escolha: uma caixa por opção. */
function Multipla({ pergunta, valor, aoMudar, desabilitado }) {
  const marcadas = Array.isArray(valor) ? valor : [];

  const alternar = (opcao) => {
    const novas = marcadas.includes(opcao)
      ? marcadas.filter((v) => v !== opcao)
      : [...marcadas, opcao];
    aoMudar(novas);
  };

  return (
    <fieldset className="flex flex-col gap-1.5">
      {/* <legend> e não <span>: é o que amarra o grupo de caixas à pergunta para
          quem usa leitor de tela. Sem isso, cada caixa é anunciada solta e a
          pergunta se perde. */}
      <legend className="text-[11px] font-semibold uppercase tracking-wider text-[#5C7060]">
        {pergunta.rotulo}
      </legend>
      <div className="flex flex-col gap-1.5 pt-1">
        {(pergunta.opcoes ?? []).map((o) => (
          <label key={o.valor} className="flex items-start gap-2 text-sm text-[#1A2B1F] cursor-pointer">
            <input
              type="checkbox"
              checked={marcadas.includes(o.valor)}
              onChange={() => alternar(o.valor)}
              disabled={desabilitado}
              className="mt-0.5 w-4 h-4 rounded border-[#DDE3DE] text-[#1A4731] focus:ring-2 focus:ring-[#1A4731]/30"
            />
            <span>{o.rotulo}</span>
          </label>
        ))}
      </div>
      {pergunta.dica && (
        <span className="text-[11px] text-[#5C7060] leading-relaxed">{pergunta.dica}</span>
      )}
    </fieldset>
  );
}

/** Coordenada é um par, e meio par não localiza nada: os dois campos juntos. */
function Coordenada({ pergunta, valor, aoMudar, desabilitado }) {
  const atual = valor && typeof valor === 'object' ? valor : {};
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5C7060]">
        {pergunta.rotulo}
      </span>
      <div className="grid grid-cols-2 gap-3">
        <Campo
          rotulo="Latitude"
          tipo="decimal"
          valor={atual.latitude ?? ''}
          onChange={(v) => aoMudar({ ...atual, latitude: v })}
          desabilitado={desabilitado}
          placeholder="-4.7312"
        />
        <Campo
          rotulo="Longitude"
          tipo="decimal"
          valor={atual.longitude ?? ''}
          onChange={(v) => aoMudar({ ...atual, longitude: v })}
          desabilitado={desabilitado}
          placeholder="-49.9418"
        />
      </div>
      {pergunta.dica && (
        <span className="text-[11px] text-[#5C7060] leading-relaxed">{pergunta.dica}</span>
      )}
    </div>
  );
}

/**
 * Campo de arquivo, enquanto não existe upload.
 *
 * Ele NÃO some do formulário só porque o upload ainda não foi construído: a
 * pergunta existe no formulário original, e escondê-la faria a equipe achar que
 * o registro fotográfico deixou de ser pedido. Aceita a anotação de onde o
 * arquivo está, para o vínculo não se perder até o storage existir.
 */
function Arquivo({ pergunta, valor, aoMudar, desabilitado }) {
  return (
    <Campo
      rotulo={pergunta.rotulo}
      tipo="texto"
      valor={valor ?? ''}
      onChange={aoMudar}
      desabilitado={desabilitado}
      placeholder="Onde o arquivo está (pasta, link do drive, nome do registro)"
      dica={
        pergunta.dica
          ? `${pergunta.dica} O envio de arquivo pelo sistema ainda não existe: anote aqui onde ele ficou.`
          : 'O envio de arquivo pelo sistema ainda não existe: anote aqui onde ele ficou.'
      }
      acao={
        <span className="inline-flex items-center gap-1 text-[11px] text-[#8A6D3B]">
          <Paperclip size={12} aria-hidden="true" />
          anexo ainda não sobe pelo sistema
        </span>
      }
    />
  );
}

function Pergunta({ pergunta, valor, aoMudar, desabilitado, comErro }) {
  const comum = { valor, aoMudar, desabilitado, pergunta };

  const marcado = comErro ? 'rounded-xl ring-2 ring-[#C0392B]/40 p-2 -m-2' : '';

  let controle;
  switch (pergunta.tipo) {
    case 'multipla':
      controle = <Multipla {...comum} />;
      break;

    case 'coordenada':
      controle = <Coordenada {...comum} />;
      break;

    case 'arquivo':
      controle = <Arquivo {...comum} />;
      break;

    case 'escolha':
    case 'sim_nao':
      controle = (
        <Campo
          rotulo={pergunta.rotulo}
          tipo="select"
          /* A opção vazia é explícita: sem ela o select nasceria mostrando a
             primeira opção como se alguém já tivesse respondido. Num diagnóstico
             de campo isso vira dado inventado. */
          opcoes={[{ valor: '', rotulo: 'Não respondido' }, ...(pergunta.opcoes ?? [])]}
          valor={valor ?? ''}
          onChange={aoMudar}
          desabilitado={desabilitado}
          obrigatorio={pergunta.obrigatoria}
          dica={pergunta.dica}
        />
      );
      break;

    case 'texto_longo':
      controle = (
        <Campo
          rotulo={pergunta.rotulo}
          tipo="textarea"
          linhas={3}
          valor={valor ?? ''}
          onChange={aoMudar}
          desabilitado={desabilitado}
          obrigatorio={pergunta.obrigatoria}
          dica={pergunta.dica}
        />
      );
      break;

    case 'numero':
    case 'inteiro':
      controle = (
        <Campo
          rotulo={pergunta.rotulo}
          tipo="decimal"
          valor={valor ?? ''}
          onChange={aoMudar}
          desabilitado={desabilitado}
          obrigatorio={pergunta.obrigatoria}
          dica={pergunta.dica}
        />
      );
      break;

    case 'data':
      controle = (
        <Campo
          rotulo={pergunta.rotulo}
          tipo="data"
          valor={valor ?? ''}
          onChange={aoMudar}
          desabilitado={desabilitado}
          obrigatorio={pergunta.obrigatoria}
          dica={pergunta.dica}
        />
      );
      break;

    default:
      controle = (
        <Campo
          rotulo={pergunta.rotulo}
          tipo="texto"
          valor={valor ?? ''}
          onChange={aoMudar}
          desabilitado={desabilitado}
          obrigatorio={pergunta.obrigatoria}
          dica={pergunta.dica}
        />
      );
  }

  return <div className={marcado} id={`pergunta-${pergunta.chave}`}>{controle}</div>;
}

/**
 * @param {object} props
 * @param {object} props.definicao `{ secoes: [...] }`, vinda do servidor
 * @param {object} props.valores respostas por chave de pergunta
 * @param {(chave: string, valor: unknown) => void} props.aoMudar
 * @param {boolean} [props.desabilitado=false] questionário concluído ou sem permissão
 * @param {string} [props.chaveComErro] pergunta que o servidor recusou, para destacar
 */
export default function CamposQuestionario({
  definicao,
  valores = {},
  aoMudar,
  desabilitado = false,
  chaveComErro = null,
}) {
  const secoes = definicao?.secoes ?? [];

  if (!secoes.length) {
    return (
      <AvisoDiscreto tom="ambar">
        Este formulário não tem perguntas cadastradas. Avise a equipe responsável pelo sistema.
      </AvisoDiscreto>
    );
  }

  return (
    <div className="space-y-8">
      {secoes.map((secao, i) => (
        <Fragment key={secao.chave ?? `secao-${i}`}>
          <section className="space-y-4">
            <CabecalhoSecao titulo={secao.titulo} nivel={3} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(secao.perguntas ?? []).map((pergunta) => (
                <div
                  key={pergunta.chave}
                  /* Texto longo, múltipla e coordenada ocupam a linha inteira:
                     espremidos em meia coluna viram caixa de duas palavras. */
                  className={
                    ['texto_longo', 'multipla', 'coordenada'].includes(pergunta.tipo)
                      ? 'md:col-span-2'
                      : ''
                  }
                >
                  <Pergunta
                    pergunta={pergunta}
                    valor={valores[pergunta.chave]}
                    aoMudar={(v) => aoMudar(pergunta.chave, v)}
                    desabilitado={desabilitado}
                    comErro={chaveComErro === pergunta.chave}
                  />
                </div>
              ))}
            </div>
          </section>
        </Fragment>
      ))}
    </div>
  );
}

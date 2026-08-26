/**
 * CamposTeams - os campos da reunião do Teams, CONTROLADOS por quem usa.
 *
 * POR QUE ELE FOI SEPARADO do PainelTeams em 26/08/2026. Na primeira versão os
 * campos só existiam ao EDITAR uma reunião, porque o evento precisa de um id e
 * de uma data já gravados. O efeito prático, apontado em uso: quem criava uma
 * reunião não via nada do Teams, salvava, reabria em "editar" e só então
 * descobria que havia mais a preencher. Duas idas para uma tarefa só.
 *
 * Agora os mesmos campos aparecem nos dois momentos. Este componente não sabe
 * salvar nada: ele só desenha e devolve o valor. Quem chama decide quando
 * gravar - na criação, a tela encadeia "criar reunião" e depois "criar evento";
 * na edição, o painel manda direto.
 *
 * PARTICIPANTE É UM CAMPO POR PESSOA, e não uma caixa de texto com vírgulas.
 * A caixa única parece prática e erra: um endereço colado com espaço no meio,
 * uma vírgula esquecida, e o convite vai para um endereço que não existe - o
 * Exchange aceita a criação e a pessoa simplesmente não recebe. Com um campo
 * por pessoa, o erro fica visível antes de sair.
 */

import { Plus, Trash2, TriangleAlert, User } from 'lucide-react';
import Campo from '@/components/ui/Campo';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';

const FREQUENCIAS = [
  { valor: 'nenhuma', rotulo: 'Não se repete' },
  { valor: 'semanal', rotulo: 'Toda semana' },
  { valor: 'diaria', rotulo: 'Todo dia' },
  { valor: 'mensal', rotulo: 'Todo mês' },
];

/**
 * Estado inicial dos campos.
 *
 * `emailOrganizador` entra JÁ como o primeiro participante. Quem marca a reunião
 * está nela - tratar isso como algo a lembrar de preencher só produz reunião sem
 * o próprio organizador na agenda, que foi o pedido explícito de quem usa.
 */
export function formTeamsVazio(emailOrganizador = '') {
  return {
    ativo: false,
    hora_inicio: '10:00',
    hora_fim: '11:00',
    // Sempre pelo menos uma linha, para o campo não nascer invisível.
    participantes: [emailOrganizador || ''],
    descricao: '',
    frequencia: 'nenhuma',
    ate: '',
  };
}

/** Lista limpa, sem vazios e sem repetido, na ordem em que foi digitada. */
export function participantesLimpos(lista) {
  const vistos = new Set();
  return (lista ?? [])
    .map((e) => String(e || '').trim().toLowerCase())
    .filter((e) => {
      if (!e || vistos.has(e)) return false;
      vistos.add(e);
      return true;
    });
}

/**
 * Quantos endereços preenchidos não têm arroba.
 *
 * Existe como função exportada, e não só como cálculo interno da tela, porque o
 * servidor recusa a lista inteira com 400 se UM endereço estiver torto. Na
 * criação isso sairia caro: a reunião já teria sido gravada, e a pessoa
 * receberia "reunião criada, mas o evento no Teams não". Barrar antes de enviar
 * é a diferença entre corrigir uma letra e refazer o caminho.
 */
export function participantesInvalidos(lista) {
  return (lista ?? []).filter((e) => String(e || '').trim() && !String(e).includes('@')).length;
}

/** O que o cliente de API espera. Devolve null quando o Teams está desligado. */
export function payloadTeams(form) {
  if (!form?.ativo) return null;
  return {
    hora_inicio: form.hora_inicio,
    hora_fim: form.hora_fim,
    participantes: participantesLimpos(form.participantes),
    descricao: form.descricao || null,
    recorrencia:
      form.frequencia === 'nenhuma'
        ? null
        : { frequencia: form.frequencia, ate: form.ate || null },
  };
}

/**
 * @param {object} props
 * @param {object} props.valor estado vindo de `formTeamsVazio`
 * @param {(novo: object) => void} props.aoMudar
 * @param {string} [props.emailOrganizador] marca quem está criando na lista
 * @param {string} [props.dataReuniao] AAAA-MM-DD, só para o texto de aviso
 * @param {boolean} [props.permiteDesligar=true] mostra os botões de ligar e
 *        desligar o Teams. Passe false onde a decisão já foi tomada por fora,
 *        como no painel que só abre para criar o evento.
 */
export default function CamposTeams({
  valor,
  aoMudar,
  emailOrganizador,
  dataReuniao,
  permiteDesligar = true,
}) {
  const alterar = (campo) => (v) => aoMudar({ ...valor, [campo]: v });

  const alterarParticipante = (indice) => (v) => {
    const lista = [...valor.participantes];
    lista[indice] = v;
    aoMudar({ ...valor, participantes: lista });
  };

  const acrescentar = () =>
    aoMudar({ ...valor, participantes: [...valor.participantes, ''] });

  const remover = (indice) => {
    const lista = valor.participantes.filter((_, i) => i !== indice);
    // Nunca deixa a lista vazia: sem nenhum campo, não há onde clicar para
    // recomeçar a não ser no botão de acrescentar, que fica órfão na tela.
    aoMudar({ ...valor, participantes: lista.length ? lista : [''] });
  };

  const invalidos = participantesInvalidos(valor.participantes);

  if (!valor.ativo) {
    // Sem o botão de ligar e com `ativo` falso não sobraria nada na tela. Quem
    // passa permiteDesligar={false} é responsável por nascer com ativo: true.
    if (!permiteDesligar) return null;
    return (
      <BotaoSecundario
        icone={Plus}
        onClick={() => aoMudar({ ...valor, ativo: true })}
      >
        Criar também no Teams
      </BotaoSecundario>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#5C7060]">
          {dataReuniao
            ? `A reunião será criada em ${String(dataReuniao).split('-').reverse().join('/')}, no fuso de São Paulo.`
            : 'A reunião usa a data preenchida acima, no fuso de São Paulo.'}
          {' '}Os convidados recebem o convite do próprio Outlook.
        </p>
        {permiteDesligar && (
          <BotaoSecundario
            variante="fantasma"
            tamanho="sm"
            onClick={() => aoMudar({ ...valor, ativo: false })}
          >
            Não criar no Teams
          </BotaoSecundario>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Campo
          rotulo="Início"
          tipo="time"
          valor={valor.hora_inicio}
          onChange={alterar('hora_inicio')}
        />
        <Campo
          rotulo="Término"
          tipo="time"
          valor={valor.hora_fim}
          onChange={alterar('hora_fim')}
        />
        <Campo
          rotulo="Repetição"
          tipo="select"
          opcoes={FREQUENCIAS}
          valor={valor.frequencia}
          onChange={alterar('frequencia')}
        />
        <Campo
          rotulo="Repetir até"
          tipo="date"
          valor={valor.ate}
          onChange={alterar('ate')}
          desabilitado={valor.frequencia === 'nenhuma'}
        />
      </div>

      <div>
        <span className="block text-xs font-semibold text-[#1A2B1F] mb-2">
          Participantes
        </span>

        <div className="space-y-2">
          {valor.participantes.map((email, i) => {
            /* O primeiro campo é o de quem está criando: vem preenchido e
               marcado. Continua editável de propósito - marcar reunião no nome
               de outra pessoa é caso real, e travar o campo obrigaria a sair da
               tela para fazer o que o sistema já sabe fazer. */
            const ehOrganizador =
              emailOrganizador &&
              String(email).trim().toLowerCase() === String(emailOrganizador).toLowerCase();

            return (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  {/* Sem rótulo por campo de propósito: o cabeçalho acima já diz
                      "Participantes" e repetir "E-mail" em cada linha empurraria
                      a lista para baixo. O nome de cada controle vem do
                      aria-label, que é o que o leitor de tela anuncia. */}
                  <Campo
                    tipo="email"
                    valor={email}
                    onChange={alterarParticipante(i)}
                    placeholder="nome@apsis.com.br"
                    extras={{ 'aria-label': `Participante ${i + 1}` }}
                  />
                </div>

                {ehOrganizador && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] text-[#5C7060] whitespace-nowrap"
                    title="Você está criando esta reunião"
                  >
                    <User size={12} aria-hidden="true" />
                    você
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => remover(i)}
                  aria-label={`Remover participante ${i + 1}`}
                  className="p-2 rounded-lg text-[#5C7060] hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>

        <BotaoSecundario
          variante="fantasma"
          tamanho="sm"
          icone={Plus}
          onClick={acrescentar}
          className="mt-2"
        >
          Acrescentar participante
        </BotaoSecundario>
      </div>

      <Campo
        rotulo="Pauta ou descrição"
        tipo="textarea"
        linhas={2}
        valor={valor.descricao}
        onChange={alterar('descricao')}
        dica="Aparece no corpo do convite que os participantes recebem."
      />

      {invalidos > 0 && (
        <AvisoDiscreto tom="ambar" icone={TriangleAlert}>
          {invalidos === 1
            ? 'Há um endereço sem @. Corrija antes de salvar.'
            : `Há ${invalidos} endereços sem @. Corrija antes de salvar.`}
        </AvisoDiscreto>
      )}

      {valor.frequencia !== 'nenhuma' && !valor.ate && (
        <AvisoDiscreto tom="ambar" icone={TriangleAlert}>
          Sem data de término, a série é criada sem fim e ocupa a agenda de todos os
          convidados indefinidamente.
        </AvisoDiscreto>
      )}
    </div>
  );
}

/**
 * PainelTeams - cria e gerencia a reunião do Microsoft Teams de uma reunião.
 *
 * COMPONENTE PRÓPRIO, e não mais um trecho de Reunioes.jsx, por dois motivos:
 * aquela tela já tem 800 linhas e cuida de reunião, ata e pendência; e esta
 * parte depende de um sistema EXTERNO que pode estar indisponível. Isolar deixa
 * o modo degradado explícito - a tela de Reuniões funciona inteira sem o Teams.
 *
 * O QUE ELE ASSUME DO SERVIDOR (contrato):
 *   reuniao.teams_evento_id   null = sem evento; preenchido = tem
 *   reuniao.teams_join_url    link de entrada na sala
 *   reuniao.teams_serie       true = recorrente, tem ocorrências
 *   reuniao.data              a data do evento vem DAQUI, nunca do formulário
 *
 * A DATA NÃO É EDITÁVEL AQUI, de propósito: ela é a da reunião no portal. Se
 * fosse escolhida no formulário, o evento do Teams poderia cair num dia
 * diferente do registro que o originou, e ninguém perceberia até alguém não
 * aparecer.
 */

import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Video, Plus, Trash2, ExternalLink, Copy, Check, Loader2, TriangleAlert, CalendarClock,
} from 'lucide-react';
import {
  cancelarReuniaoTeams,
  criarReuniaoTeams,
  diagnosticoTeams,
  ocorrenciasTeams,
} from '@/lib/api/reunioesteams';
import Campo from '@/components/ui/Campo';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import Badge from '@/components/ui/Badge';

const FREQUENCIAS = [
  { valor: 'nenhuma', rotulo: 'Não se repete' },
  { valor: 'semanal', rotulo: 'Toda semana' },
  { valor: 'diaria', rotulo: 'Todo dia' },
  { valor: 'mensal', rotulo: 'Todo mês' },
];

const FORM_VAZIO = {
  hora_inicio: '10:00',
  hora_fim: '11:00',
  participantes: '',
  descricao: '',
  frequencia: 'nenhuma',
  ate: '',
};

/**
 * Uma lista de e-mails colada de qualquer jeito vira array.
 *
 * Aceita vírgula, ponto e vírgula e quebra de linha porque é assim que a lista
 * chega na prática: copiada de um e-mail, de uma planilha ou digitada. Exigir um
 * separador único faria a pessoa perder a lista inteira por um caractere.
 */
function separarEmails(texto) {
  return String(texto || '')
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function LinhaOcorrencia({ oc }) {
  const quando = oc.inicio ? oc.inicio.replace('T', ' às ').slice(0, 16) : 'sem horário';
  return (
    <li className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className={oc.cancelada ? 'text-slate-400 line-through' : 'text-slate-700'}>
        {quando}
      </span>
      {oc.cancelada && <Badge tom="neutro" tamanho="sm">Cancelada</Badge>}
    </li>
  );
}

export default function PainelTeams({ reuniao, aoMudar }) {
  const msal = useMsal();
  const clienteQuery = useQueryClient();
  const [form, setForm] = useState(FORM_VAZIO);
  const [copiado, setCopiado] = useState(false);
  const [verOcorrencias, setVerOcorrencias] = useState(false);

  const temEvento = Boolean(reuniao?.teams_evento_id);

  /* A permissão é consultada UMA vez e reaproveitada: ela não muda entre dois
     cliques, e a resposta não depende da reunião. staleTime alto evita uma
     chamada ao Graph por linha da tabela. */
  const diag = useQuery({
    queryKey: ['carbon', 'teams', 'diagnostico'],
    queryFn: () => diagnosticoTeams(msal),
    staleTime: 10 * 60 * 1000,
  });

  const ocorrencias = useQuery({
    queryKey: ['carbon', 'teams', 'ocorrencias', reuniao?.id],
    queryFn: () => ocorrenciasTeams(msal, reuniao.id),
    enabled: verOcorrencias && temEvento && reuniao?.teams_serie === true,
  });

  const invalidar = () => {
    clienteQuery.invalidateQueries({ queryKey: ['carbon', 'reunioes'] });
    aoMudar?.();
  };

  const criar = useMutation({
    mutationFn: () =>
      criarReuniaoTeams(msal, reuniao.id, {
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
        participantes: separarEmails(form.participantes),
        descricao: form.descricao || null,
        recorrencia:
          form.frequencia === 'nenhuma'
            ? null
            : { frequencia: form.frequencia, ate: form.ate || null },
      }),
    onSuccess: () => {
      toast.success('Reunião criada no Teams. Os convites já foram enviados.');
      setForm(FORM_VAZIO);
      invalidar();
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível criar a reunião no Teams.'),
  });

  const cancelar = useMutation({
    mutationFn: () => cancelarReuniaoTeams(msal, reuniao.id),
    onSuccess: () => {
      toast.success('Evento cancelado. Os convidados foram avisados.');
      invalidar();
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível cancelar o evento.'),
  });

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(reuniao.teams_join_url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard exige contexto seguro e permissão; falhar aqui não é defeito
      // do sistema, e o link continua visível na tela para copiar à mão.
      toast.error('O navegador não permitiu copiar. Selecione o link e copie manualmente.');
    }
  }

  /* ===== Permissão ausente =============================================== */
  if (diag.data && diag.data.disponivel === false) {
    return (
      <AvisoDiscreto tom="ambar" titulo="Integração com o Teams não liberada">
        Falta conceder a permissão <code>{diag.data.permissao_exigida}</code> ao aplicativo no
        Azure, com o consentimento do administrador. Enquanto isso, a reunião continua registrada
        aqui normalmente - só não é criada no Teams.
      </AvisoDiscreto>
    );
  }

  /* ===== Já tem evento =================================================== */
  if (temEvento) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tom="azul" icone={Video} tamanho="sm">
            {reuniao.teams_serie ? 'Série no Teams' : 'Reunião no Teams'}
          </Badge>

          {reuniao.teams_join_url && (
            <>
              <BotaoSecundario
                como="a"
                href={reuniao.teams_join_url}
                target="_blank"
                rel="noopener noreferrer"
                tamanho="sm"
                icone={ExternalLink}
              >
                Entrar
              </BotaoSecundario>
              <BotaoSecundario
                variante="fantasma"
                tamanho="sm"
                onClick={copiarLink}
                icone={copiado ? Check : Copy}
              >
                {copiado ? 'Copiado' : 'Copiar link'}
              </BotaoSecundario>
            </>
          )}

          {reuniao.teams_serie && (
            <BotaoSecundario
              variante="fantasma"
              tamanho="sm"
              icone={CalendarClock}
              onClick={() => setVerOcorrencias((v) => !v)}
            >
              {verOcorrencias ? 'Ocultar ocorrências' : 'Ver ocorrências'}
            </BotaoSecundario>
          )}

          <BotaoSecundario
            variante="fantasma"
            tamanho="sm"
            icone={cancelar.isPending ? Loader2 : Trash2}
            disabled={cancelar.isPending}
            onClick={() => {
              // Confirmação porque o cancelamento dispara aviso para todos os
              // convidados: é ação visível para fora, não só para quem clicou.
              const alvo = reuniao.teams_serie ? 'a SÉRIE inteira' : 'a reunião';
              if (window.confirm(`Cancelar ${alvo} no Teams? Os convidados serão avisados.`)) {
                cancelar.mutate();
              }
            }}
          >
            Cancelar no Teams
          </BotaoSecundario>
        </div>

        {verOcorrencias && (
          <div className="rounded-xl border border-[#DDE3DE] p-3">
            {ocorrencias.isLoading ? (
              <p className="text-sm text-slate-500">Carregando as ocorrências...</p>
            ) : ocorrencias.isError ? (
              <p className="text-sm text-red-600">
                {ocorrencias.error?.message ?? 'Não foi possível ler as ocorrências.'}
              </p>
            ) : (ocorrencias.data?.ocorrencias?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma ocorrência na janela consultada.</p>
            ) : (
              <ul className="divide-y divide-[#EEF2F0]">
                {ocorrencias.data.ocorrencias.map((oc) => (
                  <LinhaOcorrencia key={oc.id} oc={oc} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ===== Ainda não tem: formulário ======================================= */
  return (
    <div className="space-y-3">
      <p className="text-xs text-[#5C7060]">
        A reunião será criada em {reuniao?.data ? reuniao.data.split('-').reverse().join('/') : 'a data do registro'},
        no fuso de São Paulo. Os convidados recebem o convite por e-mail do próprio Outlook.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Campo
          rotulo="Início"
          tipo="time"
          valor={form.hora_inicio}
          onChange={(v) => setForm((a) => ({ ...a, hora_inicio: v }))}
        />
        <Campo
          rotulo="Término"
          tipo="time"
          valor={form.hora_fim}
          onChange={(v) => setForm((a) => ({ ...a, hora_fim: v }))}
        />
        <Campo
          rotulo="Repetição"
          tipo="select"
          opcoes={FREQUENCIAS.map((f) => ({ valor: f.valor, rotulo: f.rotulo }))}
          valor={form.frequencia}
          onChange={(v) => setForm((a) => ({ ...a, frequencia: v }))}
        />
        <Campo
          rotulo="Repetir até"
          tipo="date"
          valor={form.ate}
          onChange={(v) => setForm((a) => ({ ...a, ate: v }))}
          desabilitado={form.frequencia === 'nenhuma'}
          dica={form.frequencia !== 'nenhuma' && !form.ate ? 'Sem data, a série não termina' : null}
        />
      </div>

      <Campo
        rotulo="Participantes"
        tipo="textarea"
        linhas={2}
        valor={form.participantes}
        onChange={(v) => setForm((a) => ({ ...a, participantes: v }))}
        placeholder="Um e-mail por linha, ou separados por vírgula"
        dica="Cada pessoa recebe o convite do Outlook e a reunião entra na agenda dela."
      />

      <BotaoPrimario
        icone={criar.isPending ? Loader2 : Plus}
        disabled={criar.isPending || !form.hora_inicio || !form.hora_fim}
        onClick={() => criar.mutate()}
      >
        {criar.isPending ? 'Criando...' : 'Criar reunião no Teams'}
      </BotaoPrimario>

      {form.frequencia !== 'nenhuma' && !form.ate && (
        <AvisoDiscreto tom="ambar" icone={TriangleAlert}>
          Sem data de término, a série é criada sem fim e ocupa a agenda de todos os convidados
          indefinidamente. Cancelar depois avisa todo mundo de novo.
        </AvisoDiscreto>
      )}
    </div>
  );
}

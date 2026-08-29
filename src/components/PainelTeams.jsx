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
 *
 * OS CAMPOS EM SI VIVEM EM `CamposTeams` desde 26/08/2026, porque agora também
 * aparecem na criação da reunião. Este painel cuida do que só existe depois de
 * gravado: o link de entrada, as ocorrências da série e o cancelamento.
 */

import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Video, Plus, Trash2, ExternalLink, Copy, Check, CalendarClock,
} from 'lucide-react';
import {
  cancelarReuniaoTeams,
  criarReuniaoTeams,
  diagnosticoTeams,
  ocorrenciasTeams,
} from '@/lib/api/reunioesteams';
import CamposTeams, {
  formTeamsVazio,
  participantesInvalidos,
  payloadTeams,
} from '@/components/CamposTeams';
import { useAuth } from '@/lib/AuthContext';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import Badge from '@/components/ui/Badge';

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
  const { usuario } = useAuth();
  const emailOrganizador = usuario?.email ?? '';
  // `ativo: true` porque neste painel a pessoa ja decidiu criar no Teams:
  // ela abriu a reuniao existente e clicou aqui. O botao de ligar seria
  // um passo a mais para dizer o que o contexto ja diz.
  const [form, setForm] = useState(() => ({ ...formTeamsVazio(emailOrganizador), ativo: true }));
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
    mutationFn: () => criarReuniaoTeams(msal, reuniao.id, payloadTeams(form)),
    onSuccess: () => {
      toast.success('Reunião criada no Teams. Os convites já foram enviados.');
      setForm({ ...formTeamsVazio(emailOrganizador), ativo: true });
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
            icone={Trash2}
            /* `carregando`, e nao `disabled`: BaseBotao desestrutura uma lista
               fechada de props e nao tem rest, entao `disabled` era DESCARTADO
               em silencio e o botao nunca travava. Ele ja troca o icone pelo
               spinner e poe aria-busy sozinho. */
            carregando={cancelar.isPending}
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
      <CamposTeams
        valor={form}
        aoMudar={setForm}
        emailOrganizador={emailOrganizador}
        dataReuniao={reuniao?.data}
        // Aqui não faz sentido oferecer "não criar no Teams": a pessoa abriu
        // este painel justamente para criar. O botão só existe na tela de
        // criação, onde o Teams é opcional.
        permiteDesligar={false}
      />

      <BotaoPrimario
        icone={Plus}
        /* `carregando` e `desabilitado`, NUNCA `disabled`. BaseBotao desestrutura
           uma lista fechada de props e nao repassa o que nao conhece, entao o
           `disabled` que estava aqui era descartado calado: o botao continuava
           clicavel durante a requisicao. Dois cliques seguidos criavam DOIS
           eventos no Graph, o segundo update sobrescrevia o id do primeiro, e
           sobrava um convite orfao na agenda de todos os convidados, sem nada
           na tela que o alcançasse para cancelar. */
        carregando={criar.isPending}
        desabilitado={
          !form.hora_inicio
          || !form.hora_fim
          || form.hora_fim <= form.hora_inicio
          || participantesInvalidos(form.participantes) > 0
        }
        onClick={() => criar.mutate()}
      >
        {criar.isPending ? 'Criando...' : 'Criar reunião no Teams'}
      </BotaoPrimario>
    </div>
  );
}

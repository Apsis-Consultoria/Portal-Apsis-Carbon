/**
 * ReuniaoAta - a ata de uma reunião e as pendências que saem dela (issue #9).
 *
 * POR QUE ESTA TELA É O CORAÇÃO DA ISSUE. Ata de reunião de governança e de consulta é
 * EVIDÊNCIA EXIGIDA na auditoria: a validadora e o registro pedem registros de reunião
 * de consulta e atas das instâncias de governança. Hoje isso é garimpado numa pasta
 * depois de a auditoria pedir. Nascendo estruturada aqui, a ata já pode ser anexada ao
 * item de evidência (o vínculo é feito pelo domínio de Documentos, com tipo de alvo
 * "ata" apontando para o identificador desta ata).
 *
 * PONTOS DE ATENÇÃO e BARREIRAS têm campo próprio, e não são um parágrafo no meio do
 * texto, porque a pauta padronizada da reunião semanal os exige nominalmente. Sendo
 * campo, entram em painel e em busca; dentro do conteúdo, não existiriam para o sistema.
 *
 * PENDÊNCIAS fecham o ciclo descrito no levantamento: atividade atualizada durante a
 * semana, reunião consome o estado, ata gera pendências, pendências realimentam o
 * backlog. Quando a pendência vira atividade, o vínculo fica guardado.
 *
 * O CARIMBO DE APROVAÇÃO NÃO É EDITÁVEL: quem mantém `aprovada_em` é uma trigger no
 * banco. A tela só liga e desliga a aprovação.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, FileText, ShieldCheck, ShieldAlert, TriangleAlert, Ban, ListChecks,
  Plus, Pencil, Trash2, CheckCircle2, RotateCcw, Link2, CalendarDays, User,
  Handshake, Sparkles,
} from 'lucide-react';
import {
  obterReuniao,
  criarAta,
  atualizarAta,
  criarPendencia,
  atualizarPendencia,
  removerPendencia,
} from '@/lib/api/reunioes';
import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import { createPageUrl } from '@/utils';
import Cartao from '@/components/ui/Cartao';
import CabecalhoSecao from '@/components/ui/CabecalhoSecao';
import Tabela from '@/components/ui/Tabela';
import Badge from '@/components/ui/Badge';
import Campo from '@/components/ui/Campo';
import PainelLateral from '@/components/ui/PainelLateral';
import EstadoVazio from '@/components/ui/EstadoVazio';
import Carregando from '@/components/ui/Carregando';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';

/* ===== Domínio ============================================================ */

const TIPOS = {
  semanal: { rotulo: 'Semanal', tom: 'azul' },
  semanal_parceiro: { rotulo: 'Semanal por parceiro', tom: 'azul' },
  tematica: { rotulo: 'Temática', tom: 'neutro' },
  governanca: { rotulo: 'Governança', tom: 'laranja' },
  consulta_comunidade: { rotulo: 'Consulta à comunidade', tom: 'verde' },
};

/** Tipos cuja ata é evidência exigida na auditoria. */
const TIPOS_EVIDENCIA = ['governanca', 'consulta_comunidade'];

/* ===== Formatação ========================================================= */

/** 'AAAA-MM-DD' -> 'DD/MM/AAAA', na mão (ver a nota de fuso em Reunioes.jsx). */
function fmtData(valor) {
  if (!valor) return '-';
  const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!partes) return String(valor);
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

/** timestamptz -> data e hora local. Usado no carimbo de aprovação. */
function fmtDataHora(valor) {
  if (!valor) return '-';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function hojeIso() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/* ===== Blocos de interface ================================================ */

/** Aviso de tela cheia para os casos em que não há o que renderizar. */
function TelaAviso({ icone: Icone = TriangleAlert, titulo, texto }) {
  return (
    <EstadoVazio
      comSuperficie
      icone={Icone}
      titulo={titulo}
      texto={texto}
      acao={
        <BotaoSecundario como="link" para={createPageUrl('Reunioes')} icone={ArrowLeft}>
          Voltar para Reuniões
        </BotaoSecundario>
      }
    />
  );
}

function Dado({ icone: Icone, rotulo, children }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icone size={14} className="text-[#8A9990] mt-0.5 flex-shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
          {rotulo}
        </p>
        <div className="text-xs text-[#1A2B1F] leading-relaxed break-words">{children}</div>
      </div>
    </div>
  );
}

/**
 * Situação da pendência.
 *
 * "Virou atividade" é estado próprio de propósito: é o que prova que a reunião
 * realimentou o backlog, e não apenas gerou uma anotação que ninguém pegou.
 */
function BadgePendencia({ pendencia }) {
  if (pendencia?.concluida) {
    return (
      <Badge tom="verde" tamanho="sm" icone={CheckCircle2}>
        Concluída
      </Badge>
    );
  }
  if (pendencia?.atividade_id) {
    return (
      <Badge tom="azul" tamanho="sm" icone={Link2}>
        Virou atividade
      </Badge>
    );
  }
  const atrasada = pendencia?.prazo && pendencia.prazo < hojeIso();
  return (
    <Badge tom={atrasada ? 'vermelho' : 'ambar'} tamanho="sm">
      {atrasada ? 'Atrasada' : 'Aberta'}
    </Badge>
  );
}

const FORM_PENDENCIA_VAZIO = { descricao: '', prazo: '', atividade_id: '', concluida: false };

function formDaPendencia(pendencia) {
  return {
    descricao: pendencia?.descricao ?? '',
    prazo: pendencia?.prazo ?? '',
    atividade_id: pendencia?.atividade_id ?? '',
    concluida: Boolean(pendencia?.concluida),
  };
}

/* ===== Página ============================================================= */

export default function ReuniaoAta() {
  const { id: reuniaoId } = useParams();
  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const autenticado = (accounts?.length ?? 0) > 0;
  const habilitado = ((MODO_DEMO && MODO_DEMO_ATIVO()) || autenticado) && Boolean(reuniaoId);
  const queryClient = useQueryClient();

  const chaveQuery = ['carbon', 'reuniao', reuniaoId];

  const detalheQuery = useQuery({
    queryKey: chaveQuery,
    queryFn: () => obterReuniao(msal, reuniaoId),
    enabled: habilitado,
  });

  const reuniao = detalheQuery.data?.reuniao ?? null;
  const ata = detalheQuery.data?.ata ?? null;
  const pendencias = detalheQuery.data?.pendencias ?? [];
  /* Quantos itens de evidência já apontam para esta ata. `null` significa "não foi
     possível saber" (o módulo de Documentos ainda não está no ar), e nesse caso a tela
     omite o indicador em vez de afirmar que não há vínculo nenhum - que é justamente a
     informação que esta tela existe para dar. */
  const vinculosEvidencia = detalheQuery.data?.vinculos_evidencia ?? null;

  /* Texto da ata em estado local, sincronizado quando o servidor traz uma ata
     diferente. Não ressincronizamos a cada resposta: reescrever o campo durante a
     digitação apagaria o que a pessoa está escrevendo se outra sessão salvasse ao
     mesmo tempo. A chave da sincronização é o id da ata, e não o conteúdo. */
  const [rascunho, setRascunho] = useState({ conteudo: '', pontos_atencao: '', barreiras: '' });
  const [ataSincronizada, setAtaSincronizada] = useState(null);

  // Valores extraídos antes do efeito para o array de dependências não depender de
  // encadeamento opcional (e para a condição de sincronização ficar legível).
  const ataId = ata?.id ?? null;
  const ataConteudo = ata?.conteudo ?? '';
  const ataPontos = ata?.pontos_atencao ?? '';
  const ataBarreiras = ata?.barreiras ?? '';

  useEffect(() => {
    if (!ataId || ataId === ataSincronizada) return;
    setRascunho({ conteudo: ataConteudo, pontos_atencao: ataPontos, barreiras: ataBarreiras });
    setAtaSincronizada(ataId);
  }, [ataId, ataConteudo, ataPontos, ataBarreiras, ataSincronizada]);

  const [painelPendencia, setPainelPendencia] = useState(null); // { modo, pendencia }
  const [formPendencia, setFormPendencia] = useState(FORM_PENDENCIA_VAZIO);
  /* Remoção em dois passos: o botão da lixeira ARMA a confirmação na própria linha, e
     só o segundo clique remove. Sem isso um clique errado apaga a pendência sem volta,
     e o projeto não tem primitiva de diálogo de confirmação. */
  const [removendo, setRemovendo] = useState(null);

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: chaveQuery });
    // A listagem mostra estado da ata e contagem de pendências: sem isto ela fica
    // desatualizada até a próxima navegação.
    queryClient.invalidateQueries({ queryKey: ['carbon', 'reunioes'] });
  };

  const abrirAta = useMutation({
    mutationFn: async () => criarAta(msal, reuniaoId, {}),
    onSuccess: () => {
      invalidar();
      toast.success('Ata aberta. Registre o conteúdo, os pontos de atenção e as barreiras.');
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível abrir a ata.'),
  });

  const salvarAta = useMutation({
    mutationFn: async (dados) => atualizarAta(msal, ata?.id, dados),
    onSuccess: (_resposta, dados) => {
      invalidar();
      if (dados?.aprovada === true) toast.success('Ata aprovada.');
      else if (dados?.aprovada === false) toast.success('Aprovação da ata desfeita.');
      else toast.success('Ata salva.');
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar a ata.'),
  });

  const salvarPendencia = useMutation({
    mutationFn: async ({ id, dados }) =>
      id ? atualizarPendencia(msal, id, dados) : criarPendencia(msal, ata?.id, dados),
    onSuccess: (_resposta, variaveis) => {
      invalidar();
      toast.success(variaveis?.id ? 'Pendência atualizada.' : 'Pendência registrada.');
      setPainelPendencia(null);
      setFormPendencia(FORM_PENDENCIA_VAZIO);
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar a pendência.'),
  });

  const excluirPendencia = useMutation({
    mutationFn: async (id) => removerPendencia(msal, id),
    onSuccess: () => {
      invalidar();
      toast.success('Pendência removida.');
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível remover a pendência.'),
    onSettled: () => setRemovendo(null),
  });

  /** Alterna concluída sem abrir o painel: é a ação mais frequente da lista. */
  const alternarConclusao = (pendencia) => {
    salvarPendencia.mutate({
      id: pendencia.id,
      dados: { concluida: !pendencia.concluida },
    });
  };

  const alterado =
    Boolean(ata) &&
    (rascunho.conteudo !== (ata.conteudo ?? '') ||
      rascunho.pontos_atencao !== (ata.pontos_atencao ?? '') ||
      rascunho.barreiras !== (ata.barreiras ?? ''));

  const enviarAta = () => {
    if (!alterado) {
      toast.info('Nenhuma alteração para salvar.');
      return;
    }
    salvarAta.mutate({
      conteudo: rascunho.conteudo.trim() || null,
      pontos_atencao: rascunho.pontos_atencao.trim() || null,
      barreiras: rascunho.barreiras.trim() || null,
    });
  };

  const enviarPendencia = () => {
    const descricao = String(formPendencia.descricao ?? '').trim();
    if (!descricao) {
      toast.error('Descreva a pendência.');
      return;
    }

    const dados = {
      descricao,
      // Campo esvaziado vai como null, e não omitido: a API usa "a chave veio no
      // corpo?" para decidir o que tocar, então omitir significaria "mantenha".
      prazo: String(formPendencia.prazo ?? '').trim() || null,
      atividade_id: String(formPendencia.atividade_id ?? '').trim() || null,
      concluida: Boolean(formPendencia.concluida),
    };

    salvarPendencia.mutate({ id: painelPendencia?.pendencia?.id ?? null, dados });
  };

  /* ===== Estados de exceção, antes do conteúdo ===== */

  if (!reuniaoId) {
    return (
      <TelaAviso
        titulo="Reunião não informada"
        texto="O endereço da ata precisa incluir o identificador da reunião."
      />
    );
  }

  const codigoErro = detalheQuery.error?.codigo ?? null;
  if (codigoErro === 'nao_encontrado' || codigoErro === 'id_invalido') {
    return (
      <TelaAviso
        titulo="Reunião não encontrada"
        texto="A reunião pode ter sido removida, ou o endereço está incorreto."
      />
    );
  }

  if (detalheQuery.isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Cartao>
          <Carregando rotulo="Carregando a reunião e a ata" />
        </Cartao>
      </div>
    );
  }

  if (detalheQuery.isError) {
    return (
      <TelaAviso
        titulo="Não foi possível carregar a ata"
        texto="Houve uma falha ao buscar a reunião. Se o aviso continuar, avise a equipe responsável pelo sistema."
      />
    );
  }

  const visualTipo = TIPOS[reuniao?.tipo];
  const ehEvidencia = TIPOS_EVIDENCIA.includes(reuniao?.tipo);

  const colunasPendencia = [
    {
      chave: 'descricao',
      titulo: 'Pendência',
      larguraMinima: 280,
      render: (linha) => (
        <div className="min-w-0">
          <span className={linha.concluida ? 'text-[#8A9990] line-through' : 'text-[#1A2B1F]'}>
            {linha.descricao}
          </span>
          {linha.atividade_id && (
            <span className="block text-[11px] text-[#5C7060] mt-0.5">
              Vinculada a uma atividade do backlog.
            </span>
          )}
        </div>
      ),
    },
    {
      chave: 'responsavel_nome',
      titulo: 'Responsável',
      larguraMinima: 160,
      render: (linha) => (
        <span className={linha.responsavel_nome ? '' : 'text-[#8A9990]'}>
          {linha.responsavel_nome || 'Sem responsável'}
        </span>
      ),
    },
    {
      chave: 'prazo',
      titulo: 'Prazo',
      larguraMinima: 110,
      render: (linha) => (
        <span className="tabular-nums">{linha.prazo ? fmtData(linha.prazo) : 'Sem prazo'}</span>
      ),
    },
    {
      chave: 'situacao',
      titulo: 'Situação',
      larguraMinima: 150,
      render: (linha) => <BadgePendencia pendencia={linha} />,
    },
    {
      chave: 'acoes',
      titulo: 'Ações',
      alinhamento: 'direita',
      larguraMinima: 250,
      render: (linha) =>
        removendo === linha.id ? (
          // Segundo passo da remoção, na própria linha: nada é apagado no primeiro clique.
          <div className="flex items-center justify-end gap-1.5">
            <BotaoSecundario variante="fantasma" tamanho="sm" onClick={() => setRemovendo(null)}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario
              tom="vermelho"
              tamanho="sm"
              icone={Trash2}
              carregando={excluirPendencia.isPending}
              onClick={() => excluirPendencia.mutate(linha.id)}
            >
              Remover
            </BotaoPrimario>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1.5">
            <BotaoSecundario
              tamanho="sm"
              icone={linha.concluida ? RotateCcw : CheckCircle2}
              titulo={linha.concluida ? 'Reabrir pendência' : 'Marcar como concluída'}
              rotuloAcessivel={
                linha.concluida
                  ? `Reabrir a pendência ${linha.descricao}`
                  : `Concluir a pendência ${linha.descricao}`
              }
              onClick={() => alternarConclusao(linha)}
            />
            <BotaoSecundario
              tamanho="sm"
              icone={Pencil}
              titulo="Editar pendência"
              rotuloAcessivel={`Editar a pendência ${linha.descricao}`}
              onClick={() => {
                setFormPendencia(formDaPendencia(linha));
                setPainelPendencia({ modo: 'editar', pendencia: linha });
              }}
            />
            <BotaoSecundario
              tamanho="sm"
              variante="perigo"
              icone={Trash2}
              titulo="Remover pendência"
              rotuloAcessivel={`Remover a pendência ${linha.descricao}`}
              onClick={() => setRemovendo(linha.id)}
            />
          </div>
        ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Volta explícita: o item do menu fica aceso em "Reuniões", mas o caminho de
          volta precisa existir na própria tela. */}
      <Link
        to={createPageUrl('Reunioes')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C7060] hover:text-[#1A4731] transition-colors"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        Reuniões
      </Link>

      {/* ===== Cabeçalho da reunião ===== */}
      <Cartao
        icone={Handshake}
        titulo={reuniao?.titulo || 'Reunião sem título'}
        subtitulo={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tom={visualTipo?.tom ?? 'neutro'} tamanho="sm">
              {visualTipo?.rotulo || reuniao?.tipo || 'Sem tipo'}
            </Badge>
            <span>{fmtData(reuniao?.data)}</span>
          </span>
        }
        acao={
          ata ? (
            ata.aprovada ? (
              <Badge tom="verde" icone={ShieldCheck}>
                Ata aprovada
              </Badge>
            ) : (
              <Badge tom="ambar" icone={ShieldAlert}>
                Ata em rascunho
              </Badge>
            )
          ) : (
            <Badge>Sem ata</Badge>
          )
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Dado icone={CalendarDays} rotulo="Data">
            {fmtData(reuniao?.data)}
          </Dado>
          <Dado icone={Handshake} rotulo="Escopo">
            {reuniao?.projeto_id ? reuniao.projeto_nome || 'Projeto' : 'Backoffice (sem projeto)'}
          </Dado>
          <Dado icone={User} rotulo="Organização parceira">
            {reuniao?.parceiro || 'Não se aplica'}
          </Dado>
        </div>

        {/* O achado que dá valor à issue, dito na tela onde a decisão acontece. */}
        {ehEvidencia && (
          <AvisoDiscreto
            tom="azul"
            className="mt-4"
            titulo="Esta ata é evidência de auditoria."
            texto="Reunião de governança e de consulta é exatamente o registro que a validadora pede. Preenchida e aprovada aqui, a ata pode ser anexada ao item de evidência pelo módulo de Documentos, em vez de ser garimpada numa pasta depois."
          />
        )}

        {/* Estado do vínculo com a auditoria. Só aparece quando o número é conhecido. */}
        {ata && vinculosEvidencia !== null && (
          <AvisoDiscreto
            className="mt-3"
            tom={vinculosEvidencia > 0 ? 'verde' : ehEvidencia ? 'ambar' : 'neutro'}
            icone={vinculosEvidencia > 0 ? Link2 : undefined}
            titulo={
              vinculosEvidencia > 0
                ? `Ata vinculada a ${vinculosEvidencia} ${vinculosEvidencia === 1 ? 'documento de evidência' : 'documentos de evidência'}.`
                : 'Ata ainda não vinculada a nenhum item de evidência.'
            }
            texto={
              vinculosEvidencia > 0
                ? 'O vínculo é mantido pelo módulo de Documentos e é o que evita procurar esta ata numa pasta quando a auditoria pedir.'
                : 'O vínculo é criado pelo módulo de Documentos, apontando para esta ata. Enquanto ele não existir, a ata continua sendo material que alguém terá de procurar depois.'
            }
          />
        )}
      </Cartao>

      {/* ===== Ata ===== */}
      {!ata ? (
        <EstadoVazio
          comSuperficie
          icone={FileText}
          titulo="Esta reunião ainda não tem ata"
          texto="A pauta começa com alguém assumindo a redação da ata. Abra a ata em branco agora e escreva durante a reunião: conteúdo, pontos de atenção e barreiras têm campo próprio."
          acao={
            <BotaoPrimario
              icone={Sparkles}
              carregando={abrirAta.isPending}
              onClick={() => abrirAta.mutate()}
            >
              Abrir ata desta reunião
            </BotaoPrimario>
          }
        />
      ) : (
        <>
          <Cartao
            icone={FileText}
            titulo="Ata"
            subtitulo={
              ata.aprovada
                ? `Aprovada em ${fmtDataHora(ata.aprovada_em)}${ata.redigida_por_nome ? ` · redigida por ${ata.redigida_por_nome}` : ''}`
                : ata.redigida_por_nome
                  ? `Rascunho · redigida por ${ata.redigida_por_nome}`
                  : 'Rascunho'
            }
            acao={
              ata.aprovada ? (
                <BotaoSecundario
                  variante="perigo"
                  tamanho="sm"
                  icone={Ban}
                  carregando={salvarAta.isPending}
                  onClick={() => salvarAta.mutate({ aprovada: false })}
                >
                  Desfazer aprovação
                </BotaoSecundario>
              ) : (
                <BotaoPrimario
                  tom="verde"
                  tamanho="sm"
                  icone={ShieldCheck}
                  carregando={salvarAta.isPending}
                  onClick={() => salvarAta.mutate({ aprovada: true })}
                >
                  Aprovar ata
                </BotaoPrimario>
              )
            }
            rodape={
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-[11px] text-[#8A9990]">
                  {alterado
                    ? 'Há alterações não salvas nesta ata.'
                    : 'O carimbo de aprovação é mantido pelo sistema e não é editável.'}
                </span>
                <BotaoPrimario
                  onClick={enviarAta}
                  desabilitado={!alterado}
                  carregando={salvarAta.isPending}
                >
                  Salvar ata
                </BotaoPrimario>
              </div>
            }
          >
            <div className="space-y-4">
              {ata.aprovada && (
                <AvisoDiscreto
                  tom="ambar"
                  titulo="Ata já aprovada."
                  texto="Alterar o texto depois da aprovação descaracteriza a evidência. Corrija apenas erro material, e prefira desfazer a aprovação, ajustar e aprovar de novo."
                />
              )}

              <Campo
                rotulo="Conteúdo da ata"
                tipo="textarea"
                linhas={10}
                valor={rascunho.conteudo}
                onChange={(valor) => setRascunho((a) => ({ ...a, conteudo: valor }))}
                placeholder="O que foi tratado, quem apresentou cada frente e o que ficou deliberado."
                dica="A pauta encerra com a leitura da ata em voz alta antes de aprovar."
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Campo
                  rotulo="Pontos de atenção"
                  tipo="textarea"
                  linhas={5}
                  valor={rascunho.pontos_atencao}
                  onChange={(valor) => setRascunho((a) => ({ ...a, pontos_atencao: valor }))}
                  placeholder="O que precisa de acompanhamento antes da próxima reunião."
                  dica="Campo próprio porque a pauta o exige nominalmente, e não solto no meio do texto."
                />
                <Campo
                  rotulo="Barreiras"
                  tipo="textarea"
                  linhas={5}
                  valor={rascunho.barreiras}
                  onChange={(valor) => setRascunho((a) => ({ ...a, barreiras: valor }))}
                  placeholder="O que está impedindo o avanço e depende de terceiros ou de decisão."
                  dica="Barreira é diferente de ponto de atenção: aqui entra o que bloqueia."
                />
              </div>
            </div>
          </Cartao>

          {/* ===== Pendências ===== */}
          <CabecalhoSecao
            titulo="Pendências da ata"
            descricao="O que sai da reunião e realimenta o backlog de atividades. Quando a pendência vira atividade, guarde o vínculo em vez de recopiar o texto."
            acao={
              <BotaoPrimario
                icone={Plus}
                tamanho="sm"
                onClick={() => {
                  setFormPendencia(FORM_PENDENCIA_VAZIO);
                  setPainelPendencia({ modo: 'criar', pendencia: null });
                }}
              >
                Nova pendência
              </BotaoPrimario>
            }
          />

          <Tabela
            legenda="Pendências geradas por esta ata"
            colunas={colunasPendencia}
            dados={pendencias}
            iconeVazio={ListChecks}
            tituloVazio="Nenhuma pendência registrada"
            textoVazio="Reunião que não gera pendência costuma ser reunião que não muda o backlog. Registre o que ficou combinado, com responsável e prazo."
            acaoVazio={
              <BotaoSecundario
                icone={Plus}
                onClick={() => {
                  setFormPendencia(FORM_PENDENCIA_VAZIO);
                  setPainelPendencia({ modo: 'criar', pendencia: null });
                }}
              >
                Registrar pendência
              </BotaoSecundario>
            }
            classeLinha={(linha) => (linha.concluida ? 'opacity-70' : '')}
          />
        </>
      )}

      {/* ===== Painel de pendência ===== */}
      <PainelLateral
        aberto={Boolean(painelPendencia)}
        onFechar={() => setPainelPendencia(null)}
        icone={ListChecks}
        titulo={painelPendencia?.modo === 'editar' ? 'Editar pendência' : 'Nova pendência'}
        subtitulo="Pendência da ata, com prazo acordado na reunião."
        largura="md"
        fecharAoClicarFora={false}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario variante="fantasma" onClick={() => setPainelPendencia(null)}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={enviarPendencia} carregando={salvarPendencia.isPending}>
              {painelPendencia?.modo === 'editar' ? 'Salvar alterações' : 'Registrar'}
            </BotaoPrimario>
          </div>
        }
      >
        <div className="space-y-4">
          <Campo
            rotulo="Descrição"
            tipo="textarea"
            linhas={3}
            obrigatorio
            valor={formPendencia.descricao}
            onChange={(valor) => setFormPendencia((a) => ({ ...a, descricao: valor }))}
            placeholder="O que ficou pendente"
            extras={{ maxLength: 2000 }}
          />

          <Campo
            rotulo="Prazo"
            tipo="data"
            valor={formPendencia.prazo}
            onChange={(valor) => setFormPendencia((a) => ({ ...a, prazo: valor }))}
            dica="Deixe vazio quando a reunião não acordou prazo. Sem prazo é diferente de vencido."
          />

          <Campo
            rotulo="Atividade vinculada"
            valor={formPendencia.atividade_id}
            onChange={(valor) => setFormPendencia((a) => ({ ...a, atividade_id: valor }))}
            placeholder="Identificador da atividade"
            monoespacado
            dica="Preencha quando a pendência já virou atividade no backlog. O campo aceita o identificador da atividade; escolher a atividade por nome depende do módulo de Atividades."
          />

          <Campo
            rotulo="Já concluída"
            tipo="checkbox"
            valor={formPendencia.concluida}
            onChange={(valor) => setFormPendencia((a) => ({ ...a, concluida: valor }))}
            dica="A data de conclusão é registrada pelo sistema, não digitada."
          />

          <AvisoDiscreto
            papel="nenhum"
            texto="A atribuição de responsável depende do módulo de colaboradores: ainda não há rota que liste as pessoas do sistema, e um campo de identificador solto seria pior do que não ter campo. O responsável já registrado continua sendo exibido na lista."
          />
        </div>
      </PainelLateral>
    </div>
  );
}

/**
 * Projetos - cadastro base dos projetos de carbono (issue #1).
 *
 * O projeto é a entidade da qual todo o resto depende (PDD, monitoramento, findings,
 * metas, documentos), então esta tela é deliberadamente simples: listar, criar e editar.
 *
 * AUTORIZAÇÃO: são DUAS metades, e as duas são decididas no SERVIDOR.
 *
 * ESCRITA, por PAPEL: a Edge Function exige papel admin ou gestor para criar e editar, e
 * responde 403 'sem_permissao' para os demais.
 *
 * LEITURA, por PARTICIPAÇÃO: GET /projetos devolve apenas os projetos em que a conta
 * está na equipe (tabela carbon_projeto_equipe). Papel admin enxerga todos; gestor NÃO
 * enxerga todos, ele só escreve no que já enxerga. Projeto de que a conta não participa
 * responde 404 'nao_encontrado', o mesmo código de projeto inexistente: de propósito,
 * para a tela não virar um oráculo de existência de projeto.
 *
 * A tela não esconde formulário nem botão por perfil de propósito: seria uma segunda
 * fonte de verdade para a mesma regra, e ficaria dessincronizada do backend na primeira
 * mudança. Um 403 vira toast com texto claro.
 *
 * Renderizar `pode_criar` e `pode_escrever` é outra coisa, e é permitido: são booleanos
 * que o SERVIDOR mandou na resposta. Mostrar o que ele decidiu não é recalcular a
 * decisão; ler o papel do /me e concluir sozinho o que mostrar, sim.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus, X, Loader2, WifiOff, FolderTree, TriangleAlert, MapPin, Ruler,
  CalendarRange, Hash, Building2, ArrowRight, Pencil, Upload, ListTree, Users, BarChart3,
} from 'lucide-react';
import {
  listarProjetos, normalizarListaProjetos, criarProjeto, atualizarProjeto,
} from '@/lib/carbonApi';
// Import direto do módulo do domínio, como pede o cabeçalho de src/lib/api/indice.js.
import { obterProjeto, atualizarEquipe } from '@/lib/api/projetos';
import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import { urlPdd, urlIndicadores } from '@/lib/pageRoutes';
import PainelLateral from '@/components/ui/PainelLateral';

/* ===== Domínio ============================================================
   Espelha o CHECK de carbon_projetos.status_registro. Valor fora deste mapa ainda
   aparece na tela (com o rótulo cru), em vez de sumir: assim um status novo criado
   no banco antes do deploy do frontend não deixa o cartão sem badge.          */
const STATUS_REGISTRO = {
  rascunho: { label: 'Rascunho', classe: 'bg-slate-100 text-slate-700 border-slate-200' },
  em_desenvolvimento: { label: 'Em desenvolvimento', classe: 'bg-sky-50 text-sky-700 border-sky-200' },
  em_validacao: { label: 'Em validação', classe: 'bg-amber-50 text-amber-700 border-amber-200' },
  registrado: { label: 'Registrado', classe: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  em_verificacao: { label: 'Em verificação', classe: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  suspenso: { label: 'Suspenso', classe: 'bg-red-50 text-red-700 border-red-200' },
  encerrado: { label: 'Encerrado', classe: 'bg-slate-200 text-slate-600 border-slate-300' },
};

const ORDEM_STATUS = Object.keys(STATUS_REGISTRO);

/**
 * Standards oferecidos no formulário. Lista INICIAL: a coluna é text livre no banco e
 * a Edge Function aceita qualquer valor, então acrescentar um standard novo aqui não
 * exige migration.
 *
 * ATENÇÃO: template de PDD é outra coisa. Hoje só existe seed de capítulos para
 * VCS+CCB (carbon_pdd_template na migration de projetos e PDD), então projeto criado
 * nos outros dois não consegue gerar o PDD com um clique - a tela do PDD diz isso com
 * clareza em vez de fingir sucesso. Semear os demais standards é uma issue própria.
 */
const STANDARDS = ['VCS+CCB', 'VCS', 'CCB'];

/** Standards que já têm capítulos de PDD semeados. Usado só para avisar na tela. */
const STANDARDS_COM_TEMPLATE_PDD = ['VCS+CCB'];

/* ===== Formatação ========================================================= */

function fmtNumero(valor, casas = 2) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const n = Number(valor);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/**
 * Formata uma coluna `date` do Postgres, que chega como 'AAAA-MM-DD'.
 *
 * Feito na mão de propósito: new Date('2024-01-01') é interpretado como meia-noite UTC
 * e, no fuso do Brasil (UTC-3), toLocaleDateString mostraria 31/12/2023 - o dia
 * ANTERIOR. Esse erro passa despercebido justamente nas datas que mais importam aqui
 * (início do projeto e limites do período de creditação).
 */
function fmtData(valor) {
  if (!valor) return '-';
  const texto = String(valor);
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (partes) return `${partes[3]}/${partes[2]}/${partes[1]}`;
  const d = new Date(texto);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
}

/* ===== GeoJSON ============================================================ */

/**
 * Reduz qualquer GeoJSON de entrada a Polygon ou MultiPolygon, que é o que a Edge
 * Function aceita (ST_Multi(ST_GeomFromGeoJSON(...))).
 *
 * Aceitamos também Feature e FeatureCollection porque é a forma em que praticamente
 * todo arquivo exportado de SIG chega. Vários polígonos numa FeatureCollection são
 * unidos num único MultiPolygon: a área do projeto pode ser mesmo descontínua.
 *
 * @returns {{type: string, coordinates: any[]}|null} null quando não há polígono
 */
function extrairGeometria(bruto) {
  if (!bruto || typeof bruto !== 'object') return null;

  if (bruto.type === 'Feature') return extrairGeometria(bruto.geometry);

  if (bruto.type === 'FeatureCollection') {
    const partes = (Array.isArray(bruto.features) ? bruto.features : [])
      .map((f) => extrairGeometria(f?.geometry))
      .filter(Boolean);
    if (!partes.length) return null;
    const coordinates = partes.flatMap((g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates));
    return { type: 'MultiPolygon', coordinates };
  }

  if (bruto.type === 'Polygon' || bruto.type === 'MultiPolygon') {
    if (!Array.isArray(bruto.coordinates) || !bruto.coordinates.length) return null;
    return { type: bruto.type, coordinates: bruto.coordinates };
  }

  return null;
}

/* ===== Formulário ========================================================= */

const FORM_VAZIO = {
  nome: '',
  proponente: '',
  standard: 'VCS+CCB',
  metodologia: '',
  pais: 'Brasil',
  estado: '',
  municipio: '',
  area_declarada_ha: '',
  data_inicio: '',
  periodo_creditacao_inicio: '',
  periodo_creditacao_fim: '',
  status_registro: 'rascunho',
  registro_id: '',
  registros_anteriores: '',
  geometria: '',
};

/** Projeto -> estado do formulário. A geometria fica vazia (ver dica do campo). */
function formDoProjeto(projeto) {
  return {
    ...FORM_VAZIO,
    nome: projeto?.nome ?? '',
    proponente: projeto?.proponente ?? '',
    standard: projeto?.standard || 'VCS+CCB',
    metodologia: projeto?.metodologia ?? '',
    pais: projeto?.pais ?? '',
    estado: projeto?.estado ?? '',
    municipio: projeto?.municipio ?? '',
    area_declarada_ha:
      projeto?.area_declarada_ha === null || projeto?.area_declarada_ha === undefined
        ? ''
        : String(projeto.area_declarada_ha),
    data_inicio: projeto?.data_inicio ?? '',
    periodo_creditacao_inicio: projeto?.periodo_creditacao_inicio ?? '',
    periodo_creditacao_fim: projeto?.periodo_creditacao_fim ?? '',
    status_registro: projeto?.status_registro || 'rascunho',
    registro_id: projeto?.registro_id ?? '',
    registros_anteriores: Array.isArray(projeto?.registros_anteriores)
      ? projeto.registros_anteriores.join(', ')
      : '',
    geometria: '',
  };
}

/**
 * Campos que aceitam ausência (colunas anuláveis no banco).
 *
 * Na EDIÇÃO, campo esvaziado aqui vai como `null`, e não omitido: a Edge Function usa
 * "a chave veio no corpo?" para decidir o que tocar, então omitir significaria "mantenha
 * o valor atual" - e limpar um campo já preenchido seria impossível, com a tela ainda
 * dizendo "Projeto atualizado". Enviar null é seguro: o backend converte '' e null em
 * NULL antes de chegar ao Postgres, em qualquer um destes tipos.
 */
const CAMPOS_ANULAVEIS = [
  'proponente',
  'metodologia',
  'estado',
  'municipio',
  'registro_id',
  'data_inicio',
  'periodo_creditacao_inicio',
  'periodo_creditacao_fim',
];

/**
 * Campos NOT NULL com default no banco (e que na tela são select, ou têm valor inicial).
 * Em branco continuam OMITIDOS: mandar null quebraria a constraint, e "manter o valor
 * atual" é justamente o comportamento desejado.
 */
const CAMPOS_COM_DEFAULT = ['standard', 'pais', 'status_registro'];

// Ponto seguido de exatamente três dígitos: assinatura do separador de milhar em
// pt-BR ("13.250", "1.234,50"). Mesma regra de lerNumero na Edge Function.
const SEPARADOR_MILHAR = /\.\d{3}(?!\d)/;

/**
 * Monta o corpo da requisição a partir do formulário.
 *
 * Lança Error com a mensagem de interface na primeira inconsistência - quem chama
 * mostra em toast.
 *
 * @param editando true quando é PATCH: campo em branco passa a significar "limpar".
 */
function montarPayload(form, editando = false) {
  const nome = String(form.nome ?? '').trim();
  if (!nome) throw new Error('Informe o nome do projeto.');

  const payload = { nome };

  for (const campo of CAMPOS_ANULAVEIS) {
    const valor = String(form[campo] ?? '').trim();
    if (valor) payload[campo] = valor;
    else if (editando) payload[campo] = null;
  }

  for (const campo of CAMPOS_COM_DEFAULT) {
    const valor = String(form[campo] ?? '').trim();
    if (valor) payload[campo] = valor;
  }

  const areaBruta = String(form.area_declarada_ha ?? '').trim();
  if (areaBruta) {
    /* Entrada ambígua é RECUSADA, não adivinhada: Number('13.250') é 13,25, mil vezes
       menor do que os treze mil duzentos e cinquenta hectares digitados, e essa é a
       coluna que alimenta o aviso de divergência de 5%. Errar a escala aqui
       contaminaria a checagem em silêncio. */
    if (SEPARADOR_MILHAR.test(areaBruta)) {
      throw new Error(
        'Digite a área sem ponto de milhar, usando vírgula apenas como separador decimal. Exemplo: 13250,5.',
      );
    }
    // Aceita vírgula decimal: é o separador do teclado brasileiro e o campo é numérico.
    const n = Number(areaBruta.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('A área declarada deve ser um número maior ou igual a zero.');
    }
    payload.area_declarada_ha = n;
  } else if (editando) {
    payload.area_declarada_ha = null;
  }

  if (
    payload.periodo_creditacao_inicio &&
    payload.periodo_creditacao_fim &&
    payload.periodo_creditacao_fim < payload.periodo_creditacao_inicio
  ) {
    // Comparação de string funciona porque 'AAAA-MM-DD' é ordenável lexicograficamente.
    throw new Error('O fim do período de creditação não pode ser anterior ao início.');
  }

  const anteriores = String(form.registros_anteriores ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Lista vazia na edição vai como [] (a coluna é NOT NULL com default '{}'), para
  // apagar os IDs anteriores ser possível.
  if (anteriores.length) payload.registros_anteriores = anteriores;
  else if (editando) payload.registros_anteriores = [];

  const geoTexto = String(form.geometria ?? '').trim();
  if (geoTexto) {
    let bruto;
    try {
      bruto = JSON.parse(geoTexto);
    } catch {
      throw new Error('A geometria colada não é um JSON válido.');
    }
    const geometria = extrairGeometria(bruto);
    if (!geometria) {
      throw new Error(
        'A geometria precisa ser um GeoJSON com polígono (Polygon, MultiPolygon, Feature ou FeatureCollection).',
      );
    }
    payload.geometria = geometria;
  }

  return payload;
}

/* ===== Blocos de interface ================================================ */

const CLASSE_CAMPO =
  'w-full px-3 py-2 text-sm bg-white border border-[#DDE3DE] rounded-xl text-[#1A2B1F] placeholder:text-[#A8B4AC] focus:outline-none focus:border-[#1A4731] focus:ring-2 focus:ring-[#1A4731]/10 transition-colors';

/**
 * Rótulo + campo.
 *
 * `como` existe porque o campo de geometria tem um <label> próprio dentro dele (o botão
 * de carregar arquivo, que embrulha um input file). <label> dentro de <label> é HTML
 * inválido: o clique no botão borbulharia para o rótulo externo e focaria o textarea
 * junto de abrir o seletor de arquivos. Nesse caso o invólucro vira <div>.
 */
function Campo({ rotulo, dica, children, className = '', como = 'label' }) {
  const Envolucro = como === 'div' ? 'div' : 'label';
  return (
    <Envolucro className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5C7060]">{rotulo}</span>
      {children}
      {dica && <span className="text-[11px] text-[#8A9990] leading-relaxed">{dica}</span>}
    </Envolucro>
  );
}

function BadgeStatus({ status }) {
  const visual = STATUS_REGISTRO[status];
  const label = visual?.label || status || 'Sem status';
  const classe = visual?.classe || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap ${classe}`}>
      {label}
    </span>
  );
}

function Dado({ icone: Icone, rotulo, children }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icone size={14} className="text-[#8A9990] mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">{rotulo}</p>
        <div className="text-xs text-[#1A2B1F] leading-relaxed break-words">{children}</div>
      </div>
    </div>
  );
}

/**
 * Aviso de divergência de área.
 *
 * CRITÉRIO DE ACEITE LITERAL da issue #1 (item 4 da due diligence da BeZero): a área em
 * hectares tem de ser consistente com a geometria, com aviso quando divergir mais de 5%.
 * Quem decide se divergiu é o SERVIDOR (campos area_divergencia_pct e area_alerta); a
 * tela só não pode ser sutil ao mostrar.
 */
function AvisoArea({ projeto }) {
  if (!projeto?.area_alerta) return null;
  return (
    <div className="mt-4 flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl">
      <TriangleAlert size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
      <div className="text-xs text-amber-900 leading-relaxed">
        <span className="font-bold">Área declarada divergente da geometria.</span>{' '}
        Declarada <strong>{fmtNumero(projeto.area_declarada_ha)} ha</strong>, calculada pela geometria{' '}
        <strong>{fmtNumero(projeto.area_calculada_ha)} ha</strong>, divergência de{' '}
        <strong>{fmtNumero(projeto.area_divergencia_pct)}%</strong> - acima do limite de 5% aceito na
        due diligence. Revise a documentação ou o arquivo geoespacial antes de submeter.
      </div>
    </div>
  );
}

function CartaoProjeto({ projeto, onEditar, onEquipe }) {
  const localizacao = [projeto?.municipio, projeto?.estado, projeto?.pais].filter(Boolean).join(', ');
  const anteriores = Array.isArray(projeto?.registros_anteriores) ? projeto.registros_anteriores : [];

  return (
    <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-[#1A2B1F] break-words">{projeto?.nome || 'Projeto sem nome'}</h3>
            <BadgeStatus status={projeto?.status_registro} />
            {projeto?.ativo === false && (
              <span className="px-2.5 py-1 rounded-full border border-slate-300 bg-slate-100 text-[11px] font-semibold text-slate-600">
                Inativo
              </span>
            )}
          </div>
          <p className="text-xs text-[#5C7060] mt-1">
            {projeto?.proponente || 'Proponente não informado'}
            {projeto?.standard ? ` · ${projeto.standard}` : ''}
            {projeto?.metodologia ? ` · ${projeto.metodologia}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {/* "Equipe" fica ao lado de "Editar", e não escondido por perfil: quem não
              pode escrever abre o painel e vê só a lista de quem participa. Quem decide
              é o `pode_escrever` que vem na resposta de GET /projetos/:id. */}
          <button
            type="button"
            onClick={() => onEquipe(projeto)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DDE3DE] text-xs font-semibold text-[#5C7060] hover:text-[#1A4731] hover:border-[#1A4731]/40 transition-colors"
          >
            <Users size={13} />
            Equipe
          </button>
          <button
            type="button"
            onClick={() => onEditar(projeto)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DDE3DE] text-xs font-semibold text-[#5C7060] hover:text-[#1A4731] hover:border-[#1A4731]/40 transition-colors"
          >
            <Pencil size={13} />
            Editar
          </button>
          <Link
            to={urlIndicadores(projeto?.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DDE3DE] text-xs font-semibold text-[#5C7060] hover:text-[#1A4731] hover:border-[#1A4731]/40 transition-colors"
          >
            <BarChart3 size={13} />
            Indicadores
          </Link>
          <Link
            to={urlPdd(projeto?.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A4731] text-xs font-semibold text-white hover:bg-[#245E40] transition-colors"
          >
            <ListTree size={13} />
            PDD
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[#F4F6F4]">
        <Dado icone={MapPin} rotulo="Localização">
          {localizacao || 'Não informada'}
        </Dado>

        <Dado icone={Ruler} rotulo="Área">
          <span>{fmtNumero(projeto?.area_declarada_ha)} ha declarados</span>
          <br />
          <span className="text-[#5C7060]">
            {projeto?.tem_geometria
              ? `${fmtNumero(projeto?.area_calculada_ha)} ha pela geometria`
              : 'Sem geometria carregada'}
          </span>
        </Dado>

        <Dado icone={CalendarRange} rotulo="Período de creditação">
          {projeto?.periodo_creditacao_inicio || projeto?.periodo_creditacao_fim
            ? `${fmtData(projeto?.periodo_creditacao_inicio)} a ${fmtData(projeto?.periodo_creditacao_fim)}`
            : 'Não definido'}
          <br />
          <span className="text-[#5C7060]">Início do projeto: {fmtData(projeto?.data_inicio)}</span>
        </Dado>

        <Dado icone={Hash} rotulo="Registro">
          {projeto?.registro_id || 'Sem ID no registro'}
          {anteriores.length > 0 && (
            <>
              <br />
              <span className="text-[#5C7060]">Anteriores: {anteriores.join(', ')}</span>
            </>
          )}
        </Dado>
      </div>

      <AvisoArea projeto={projeto} />
    </div>
  );
}

/* ===== Painel de equipe ===================================================
   Sem este painel a leitura por participação vira um bloqueio sem saída: quem não está
   em nenhum projeto abre a tela, vê a lista vazia e não existe, em lugar nenhum do
   sistema, um botão capaz de incluir essa pessoa. Ele é a única porta.

   O desenho e o vocabulário seguem o bloco "Equipe APSIS" de
   src/pages/SecureShareProjeto.jsx: mesma lista de chips com o X para tirar, mesmo
   campo de e-mail para acrescentar, mesmo aviso sobre quem ainda não tem cadastro. */

function PainelEquipe({ aberto, projeto, msal, habilitado, onFechar }) {
  const [novo, setNovo] = useState('');
  const queryClient = useQueryClient();
  const projetoId = projeto?.id ?? null;

  /* Chave PRÓPRIA, e não ['carbon', 'projeto', id]: essa já pertence à tela do PDD, que
     guarda no cache apenas o objeto `projeto` do envelope. Compartilhar a chave faria
     uma das duas telas ler o formato guardado pela outra. */
  const chave = ['carbon', 'projeto', projetoId, 'equipe'];

  const equipeQuery = useQuery({
    queryKey: chave,
    queryFn: async () => {
      const resposta = await obterProjeto(msal, projetoId);
      return {
        // Array garantido: um `.map()` sobre outra coisa derrubaria o render inteiro no
        // ErrorBoundary, e o `?? []` não protege porque o valor errado não é nulo.
        equipe: Array.isArray(resposta?.equipe) ? resposta.equipe : [],
        podeEscrever: resposta?.pode_escrever === true,
      };
    },
    // Só busca com o painel aberto: a lista pode ter dezenas de projetos, e uma
    // requisição por cartão renderizado seria desperdício puro.
    enabled: aberto && habilitado && Boolean(projetoId),
  });

  const equipe = equipeQuery.data?.equipe ?? [];
  const podeEscrever = equipeQuery.data?.podeEscrever === true;

  const mudar = useMutation({
    mutationFn: async (dados) => atualizarEquipe(msal, projetoId, dados),
    onSuccess: (resposta) => {
      setNovo('');
      queryClient.invalidateQueries({ queryKey: chave });
      /* A leitura é por participação: tirar alguém da equipe muda a lista de projetos
         que a conta enxerga - inclusive a sua própria, se você se tirou. */
      queryClient.invalidateQueries({ queryKey: ['carbon', 'projetos'] });
      if (resposta?.nao_encontrados?.length) {
        // Não é falha: a linha em carbon_usuarios nasce no primeiro login. Dizer isso
        // evita a pessoa achar que digitou o e-mail errado.
        toast.warning('Alguns e-mails ainda não têm cadastro no Apsis Carbon.', {
          description: `${resposta.nao_encontrados.join(', ')}. Peça para entrarem uma vez no sistema e tente de novo.`,
          duration: 12000,
        });
      }
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível alterar a equipe.'),
  });

  const acrescentar = (evento) => {
    evento.preventDefault();
    const email = novo.trim();
    if (!email) return;
    mudar.mutate({ adicionar: [email] });
  };

  /* 404 aqui significa as duas coisas ao mesmo tempo, e a tela não escolhe uma: o
     projeto pode ter sumido, ou a sua participação nele pode ter sido retirada
     enquanto a lista já estava carregada. */
  const semAcesso = equipeQuery.error?.codigo === 'nao_encontrado';

  return (
    <PainelLateral
      aberto={aberto}
      onFechar={onFechar}
      titulo="Equipe do projeto"
      subtitulo={projeto?.nome || 'Projeto sem nome'}
      icone={Users}
      largura="md"
    >
      {equipeQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[#8A9990]">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs">Carregando a equipe</span>
        </div>
      ) : equipeQuery.isError ? (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 leading-relaxed">
          <TriangleAlert size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <span>
            {semAcesso
              ? 'Este projeto não está disponível para a sua conta. Ele pode não existir, ou você ainda não faz parte da equipe dele.'
              : equipeQuery.error?.message || 'Não foi possível carregar a equipe agora.'}
          </span>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-[#5C7060] leading-relaxed">
            Quem está nesta lista enxerga o projeto em <strong>Projetos</strong> e nas telas que
            dependem dele. Administradores enxergam todos os projetos, estejam aqui ou não.
          </p>

          <div className="flex flex-wrap gap-2">
            {equipe.map((pessoa, i) => (
              <span
                key={pessoa?.id || `pessoa-${i}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#F4F6F4] text-[#5C7060] border border-[#DDE3DE] rounded-full pl-3 pr-1 py-1"
              >
                <span className="break-all">{pessoa?.email || 'Sem e-mail'}</span>
                {podeEscrever && pessoa?.email && (
                  <button
                    type="button"
                    onClick={() => mudar.mutate({ remover: [pessoa.email] })}
                    disabled={mudar.isPending}
                    aria-label={`Tirar ${pessoa.email} da equipe`}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[#8A9990] hover:text-[#C0392B] hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
              </span>
            ))}
            {equipe.length === 0 && (
              <p className="text-xs text-[#8A9990]">
                Ninguém além dos administradores participa deste projeto.
              </p>
            )}
          </div>

          {podeEscrever ? (
            <form onSubmit={acrescentar} className="space-y-3 pt-4 border-t border-[#F4F6F4]">
              <Campo
                rotulo="Acrescentar colaborador"
                dica="Só e-mails @apsis.com.br. Para alguém de fora da APSIS, o caminho é o Secure Share."
              >
                <input
                  type="email"
                  value={novo}
                  onChange={(evento) => setNovo(evento.target.value)}
                  maxLength={320}
                  placeholder="colega@apsis.com.br"
                  className={CLASSE_CAMPO}
                />
              </Campo>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!novo.trim() || mudar.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F47920] text-xs font-bold text-white hover:bg-[#e06810] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {mudar.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Adicionar
                </button>
              </div>
            </form>
          ) : (
            /* Não é o perfil que esconde os controles: é a resposta do servidor. Sem
               pode_escrever a pessoa continua vendo quem participa, que é justamente a
               informação de quem ela precisa pedir a inclusão de alguém. */
            <p className="text-xs text-[#8A9990] leading-relaxed pt-4 border-t border-[#F4F6F4]">
              Você vê quem participa deste projeto, mas não pode alterar a equipe dele. Peça a
              alguém da lista acima, ou à equipe responsável pelo sistema.
            </p>
          )}
        </div>
      )}
    </PainelLateral>
  );
}

function FormularioProjeto({ form, setForm, editando, salvando, onSubmit, onCancelar }) {
  const alterar = (campo) => (evento) => setForm((atual) => ({ ...atual, [campo]: evento.target.value }));

  /**
   * Leitura de arquivo .geojson/.json no navegador. Shapefile, KML e GeoPackage estão
   * nos critérios da issue mas exigem conversão (biblioteca ou Edge Function própria):
   * ficam para uma issue de importação geoespacial, e a dica do campo diz isso em vez
   * de aceitar o arquivo e falhar depois.
   */
  const aoEscolherArquivo = async (evento) => {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!arquivo) return;
    try {
      const texto = await arquivo.text();
      setForm((atual) => ({ ...atual, geometria: texto }));
      toast.success(`Arquivo "${arquivo.name}" carregado no campo de geometria.`);
    } catch {
      toast.error('Não foi possível ler o arquivo selecionado.');
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F6F4]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#1A4731]/10 rounded-xl flex items-center justify-center">
            <FolderTree size={17} className="text-[#1A4731]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1A2B1F]">
              {editando ? 'Editar projeto' : 'Novo projeto'}
            </h2>
            <p className="text-xs text-[#5C7060]">
              Somente o nome é obrigatório. O resto pode ser preenchido ao longo da estruturação.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          className="w-8 h-8 rounded-lg hover:bg-[#F4F6F4] flex items-center justify-center"
          aria-label="Fechar formulário"
        >
          <X size={15} className="text-[#8A9990]" />
        </button>
      </div>

      <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Campo rotulo="Nome do projeto *" className="sm:col-span-2 lg:col-span-2">
          <input
            type="text"
            value={form.nome}
            onChange={alterar('nome')}
            required
            maxLength={200}
            placeholder="Como o projeto é chamado internamente"
            className={CLASSE_CAMPO}
          />
        </Campo>

        <Campo rotulo="Proponente">
          <input
            type="text"
            value={form.proponente}
            onChange={alterar('proponente')}
            maxLength={200}
            className={CLASSE_CAMPO}
          />
        </Campo>

        <Campo
          rotulo="Standard"
          dica={
            STANDARDS_COM_TEMPLATE_PDD.includes(form.standard)
              ? undefined
              : `Ainda não há template de PDD cadastrado para ${form.standard}: o PDD deste projeto não poderá ser gerado a partir do template.`
          }
        >
          <select value={form.standard} onChange={alterar('standard')} className={CLASSE_CAMPO}>
            {STANDARDS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Metodologia" dica="Ex.: o código da metodologia aplicada.">
          <input
            type="text"
            value={form.metodologia}
            onChange={alterar('metodologia')}
            maxLength={120}
            className={CLASSE_CAMPO}
          />
        </Campo>

        <Campo rotulo="Status no registro">
          <select value={form.status_registro} onChange={alterar('status_registro')} className={CLASSE_CAMPO}>
            {ORDEM_STATUS.map((chave) => (
              <option key={chave} value={chave}>
                {STATUS_REGISTRO[chave].label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="País">
          <input type="text" value={form.pais} onChange={alterar('pais')} maxLength={80} className={CLASSE_CAMPO} />
        </Campo>

        <Campo rotulo="Estado">
          <input type="text" value={form.estado} onChange={alterar('estado')} maxLength={80} className={CLASSE_CAMPO} />
        </Campo>

        <Campo rotulo="Município">
          <input
            type="text"
            value={form.municipio}
            onChange={alterar('municipio')}
            maxLength={120}
            className={CLASSE_CAMPO}
          />
        </Campo>

        <Campo
          rotulo="Área declarada (ha)"
          dica="O que a documentação do projeto afirma. Sem ponto de milhar: 13250,5."
        >
          <input
            type="text"
            inputMode="decimal"
            value={form.area_declarada_ha}
            onChange={alterar('area_declarada_ha')}
            placeholder="13250,5"
            className={CLASSE_CAMPO}
          />
        </Campo>

        <Campo rotulo="Início do projeto">
          <input type="date" value={form.data_inicio} onChange={alterar('data_inicio')} className={CLASSE_CAMPO} />
        </Campo>

        <Campo rotulo="Creditação - início">
          <input
            type="date"
            value={form.periodo_creditacao_inicio}
            onChange={alterar('periodo_creditacao_inicio')}
            className={CLASSE_CAMPO}
          />
        </Campo>

        <Campo rotulo="Creditação - fim">
          <input
            type="date"
            value={form.periodo_creditacao_fim}
            onChange={alterar('periodo_creditacao_fim')}
            className={CLASSE_CAMPO}
          />
        </Campo>

        <Campo rotulo="ID no registro">
          <input
            type="text"
            value={form.registro_id}
            onChange={alterar('registro_id')}
            maxLength={80}
            className={CLASSE_CAMPO}
          />
        </Campo>

        <Campo
          rotulo="IDs anteriores"
          dica="Separados por vírgula. Preencha quando o projeto migrou de outro standard."
        >
          <input
            type="text"
            value={form.registros_anteriores}
            onChange={alterar('registros_anteriores')}
            className={CLASSE_CAMPO}
          />
        </Campo>

        <Campo
          rotulo="Geometria (GeoJSON)"
          como="div"
          className="sm:col-span-2 lg:col-span-3"
          dica={
            editando
              ? 'Deixe vazio para manter a geometria atual. Shapefile, KML e GeoPackage ainda precisam ser convertidos para GeoJSON antes de colar aqui.'
              : 'Cole o GeoJSON ou carregue um arquivo .geojson. Shapefile, KML e GeoPackage ainda precisam ser convertidos antes. A área calculada e o aviso de divergência saem daqui.'
          }
        >
          <textarea
            value={form.geometria}
            onChange={alterar('geometria')}
            rows={4}
            spellCheck={false}
            placeholder='{"type":"MultiPolygon","coordinates":[...]}'
            className={`${CLASSE_CAMPO} font-mono text-[11px] leading-relaxed resize-y`}
          />
          <div className="flex items-center gap-2 mt-1">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDE3DE] text-[11px] font-semibold text-[#5C7060] hover:text-[#1A4731] hover:border-[#1A4731]/40 cursor-pointer transition-colors">
              <Upload size={12} />
              Carregar arquivo
              <input
                type="file"
                accept=".geojson,.json,application/geo+json,application/json"
                onChange={aoEscolherArquivo}
                className="hidden"
              />
            </label>
            {form.geometria && (
              <button
                type="button"
                onClick={() => setForm((atual) => ({ ...atual, geometria: '' }))}
                className="text-[11px] font-semibold text-[#8A9990] hover:text-red-600 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </Campo>
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#F4F6F4] bg-[#F4F6F4]/40">
        <button
          type="button"
          onClick={onCancelar}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5C7060] hover:text-[#1A4731] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F47920] text-xs font-bold text-white hover:bg-[#e06810] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {salvando && <Loader2 size={13} className="animate-spin" />}
          {editando ? 'Salvar alterações' : 'Criar projeto'}
        </button>
      </div>
    </form>
  );
}

/**
 * Estado vazio.
 *
 * O cabeçalho diz "disponível", e não "cadastrado", porque com a leitura por
 * participação a lista vazia não significa mais base vazia: significa que a conta não
 * participa de nenhum projeto. Afirmar que não há projeto cadastrado passaria a ser
 * mentira, e mandaria a pessoa cadastrar de novo algo que talvez já exista.
 *
 * O texto muda conforme `podeCriar`, que veio do SERVIDOR no envelope de GET /projetos.
 * O botão de cadastrar continua aparecendo nos dois casos: quem decide é o servidor, e
 * um 403 vira toast (ver o cabeçalho do arquivo).
 */
function ListaVazia({ podeCriar, onNovo }) {
  return (
    <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm px-5 py-14 text-center">
      <div className="w-14 h-14 bg-[#F4F6F4] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <FolderTree size={22} className="text-[#8A9990]" />
      </div>
      <p className="text-sm font-semibold text-[#1A2B1F]">Nenhum projeto disponível</p>
      <p className="text-xs text-[#5C7060] mt-1 max-w-md mx-auto leading-relaxed">
        {podeCriar
          ? 'Você vê aqui os projetos em que participa. Todo projeto que criar já nasce com você na equipe.'
          : 'O acesso a projeto é nominal: alguém da equipe do projeto precisa incluir você.'}
      </p>
      <button
        type="button"
        onClick={onNovo}
        className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-xl bg-[#1A4731] text-xs font-bold text-white hover:bg-[#245E40] transition-colors"
      >
        <Plus size={14} />
        Cadastrar projeto
      </button>
    </div>
  );
}

/* ===== Página ============================================================= */

export default function Projetos() {
  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const autenticado = (accounts?.length ?? 0) > 0;
  const queryClient = useQueryClient();

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  // Projeto cujo painel de equipe está aberto. Guarda o objeto, e não só o id, porque o
  // cabeçalho do painel mostra o nome antes de a requisição da equipe responder.
  const [equipeDe, setEquipeDe] = useState(null);

  const projetosQuery = useQuery({
    queryKey: ['carbon', 'projetos'],
    queryFn: async () => {
      /* normalizarListaProjetos: a chave ['carbon', 'projetos'] é compartilhada com
         Atividades, Contratos, Documentos, Reuniões e ProjetoFindings. O envelope
         { projetos, podeCriar } é o formato único guardado no cache; quem chegar
         depois encontra sempre a mesma forma, venha de qual tela vier. */
      return normalizarListaProjetos(await listarProjetos(msal));
    },
    /* Em modo demonstração não existe conta no MSAL (o login fica desabilitado) e as
       funções do carbonApi não usam token: exigir `autenticado` deixaria a tela
       permanentemente vazia justamente no modo que existe para revisá-la. */
    enabled: (MODO_DEMO && MODO_DEMO_ATIVO()) || autenticado,
  });

  const projetos = projetosQuery.data?.projetos ?? [];
  // Booleano do SERVIDOR, só renderizado. Ele escolhe o texto do estado vazio; o botão
  // de criar continua sempre visível (ver o cabeçalho do arquivo).
  const podeCriar = projetosQuery.data?.podeCriar === true;
  const comAlerta = projetos.filter((p) => p?.area_alerta).length;

  const fechar = () => {
    setAberto(false);
    setEditando(null);
    setForm(FORM_VAZIO);
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setAberto(true);
  };

  const abrirEdicao = (projeto) => {
    setEditando(projeto?.id ?? null);
    setForm(formDoProjeto(projeto));
    setAberto(true);
  };

  const salvar = useMutation({
    mutationFn: async ({ id, payload }) =>
      id ? atualizarProjeto(msal, id, payload) : criarProjeto(msal, payload),
    onSuccess: (_resposta, variaveis) => {
      queryClient.invalidateQueries({ queryKey: ['carbon', 'projetos'] });
      if (variaveis?.id) {
        // O PDD mostra o nome do projeto: invalidar aqui evita cabeçalho desatualizado.
        queryClient.invalidateQueries({ queryKey: ['carbon', 'projeto', variaveis.id] });
      }
      toast.success(variaveis?.id ? 'Projeto atualizado.' : 'Projeto criado.');
      fechar();
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar o projeto.'),
  });

  const enviar = (evento) => {
    evento.preventDefault();
    let payload;
    try {
      // Validação no cliente antes de gastar requisição. O servidor valida de novo:
      // esta camada é conveniência, não é a barreira.
      payload = montarPayload(form, Boolean(editando));
    } catch (erro) {
      toast.error(erro?.message || 'Revise os campos do formulário.');
      return;
    }
    salvar.mutate({ id: editando, payload });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* O título da página fica na topbar do Layout (regra herdada do portal:
          nenhuma tela renderiza h1 próprio). Aqui só o resumo e a ação. */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#1A2B1F]">
            {projetosQuery.isLoading
              ? 'Carregando projetos...'
              : projetosQuery.isError
                ? 'Não foi possível carregar a lista agora'
                : projetos.length === 0
                  ? 'Nenhum projeto disponível'
                  : `${projetos.length} ${projetos.length === 1 ? 'projeto' : 'projetos'}`}
          </p>
          {comAlerta > 0 && (
            <p className="text-xs text-amber-700 font-semibold mt-0.5">
              {comAlerta === 1
                ? '1 projeto com divergência de área acima de 5%'
                : `${comAlerta} projetos com divergência de área acima de 5%`}
            </p>
          )}
        </div>

        {!aberto && (
          <button
            type="button"
            onClick={abrirNovo}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F47920] text-xs font-bold text-white hover:bg-[#e06810] transition-colors self-start sm:self-auto"
          >
            <Plus size={14} />
            Novo projeto
          </button>
        )}
      </div>

      {aberto && (
        <FormularioProjeto
          form={form}
          setForm={setForm}
          editando={editando}
          salvando={salvar.isPending}
          onSubmit={enviar}
          onCancelar={fechar}
        />
      )}

      {projetosQuery.isLoading ? (
        <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm flex items-center justify-center gap-2 px-5 py-14 text-[#8A9990]">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs">Carregando projetos</span>
        </div>
      ) : projetosQuery.isError ? (
        /* Sessão expirada e acesso suspenso já têm tela própria (GuardaDeSessao em
           src/App.jsx), então o que sobra aqui é falha momentânea de rede ou do
           servidor: aviso discreto, sem prometer que recarregar resolve. */
        <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm flex items-start gap-2 px-5 py-8 text-xs text-[#8A9990]">
          <WifiOff size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            Não foi possível carregar os projetos agora. Se o aviso continuar, avise a equipe
            responsável pelo sistema.
          </span>
        </div>
      ) : projetos.length === 0 ? (
        <ListaVazia podeCriar={podeCriar} onNovo={abrirNovo} />
      ) : (
        <div className="space-y-4">
          {projetos.map((projeto, i) => (
            <CartaoProjeto
              key={projeto?.id || `projeto-${i}`}
              projeto={projeto}
              onEditar={abrirEdicao}
              onEquipe={setEquipeDe}
            />
          ))}
        </div>
      )}

      {/* Fica fora do .map(): um painel por cartão significaria uma requisição de
          equipe por cartão renderizado. Montado só quando alguém clica em "Equipe". */}
      {equipeDe && (
        <PainelEquipe
          aberto={Boolean(equipeDe)}
          projeto={equipeDe}
          msal={msal}
          habilitado={(MODO_DEMO && MODO_DEMO_ATIVO()) || autenticado}
          onFechar={() => setEquipeDe(null)}
        />
      )}

      {/* Rodapé explicativo: a listagem não traz a geometria bruta (payload pesado),
          só o indicador tem_geometria e as áreas. */}
      {projetos.length > 0 && (
        <p className="flex items-center gap-2 text-[11px] text-[#8A9990] px-1">
          <Building2 size={12} className="flex-shrink-0" />
          As áreas calculadas vêm da geometria armazenada no banco. A listagem não carrega o desenho
          em si, para não pesar a página.
        </p>
      )}
    </div>
  );
}

/**
 * Fornecedores - cadastro e status de contratação dos fornecedores (issue #10).
 *
 * O que o levantamento do Notion mostrou (docs/notion/02-fornecedores.md) e o que
 * esta tela resolve:
 *
 * 1. O CADASTRO EXISTE E FUNCIONA, então aqui não se reinventa nada: nome, CNPJ,
 *    status de contratação e contratante são as colunas que a equipe já usa.
 * 2. O STATUS VAZIO VIROU ESTADO. No Notion, "contratação não iniciada" é a ausência
 *    de valor na coluna, o que impede filtrar e contar. Aqui é `nao_iniciada`.
 * 3. DADOS BANCÁRIOS NÃO SÃO TEXTO LIVRE NUMA LISTA. É o requisito de privacidade da
 *    issue, não um detalhe de implementação: se o fornecedor for pessoa física ou
 *    MEI, banco, agência, conta e chave PIX são dado pessoal sob a LGPD. Por isso o
 *    campo NÃO aparece nesta listagem em nenhuma circunstância (o servidor lê uma
 *    view que não tem a coluna), e no painel de detalhe ele só aparece quando o
 *    servidor autoriza - a tela obedece ao booleano `dados_bancarios_visivel` e
 *    nunca decide isso por conta própria.
 * 4. O QUE O FORNECEDOR DEVE, EM DINHEIRO, é a informação que faltava. A listagem
 *    traz valor em aberto, valor vencido e próximo vencimento vindos das parcelas,
 *    porque "fornecedor com contratação concluída" não diz se há pagamento atrasado.
 *
 * AUTORIZAÇÃO: quem pode escrever é decidido no SERVIDOR (a Edge Function exige
 * papel admin ou gestor e responde 403 'sem_permissao'). A tela não esconde ações
 * por perfil de propósito: seria uma segunda fonte de verdade para a mesma regra e
 * ficaria dessincronizada do backend na primeira mudança. Um 403 vira toast com
 * texto claro. A única exceção é o CONTEÚDO dos dados bancários, que o servidor
 * simplesmente não envia a quem não pode ver.
 */

import { useMemo, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users, Plus, Pencil, Building2, Landmark, Lock, Eye, EyeOff, ArrowRight,
  FileCheck2, TriangleAlert, CalendarClock, Search,
} from 'lucide-react';
import {
  listarFornecedores,
  criarFornecedor,
  obterFornecedor,
  atualizarFornecedor,
} from '@/lib/api/fornecedores';
import { MODO_DEMO } from '@/lib/runtimeConfig';
import { rotaDaPagina } from '@/lib/pageRoutes';
import Cartao from '@/components/ui/Cartao';
import CabecalhoSecao from '@/components/ui/CabecalhoSecao';
import Tabela from '@/components/ui/Tabela';
import Badge from '@/components/ui/Badge';
import Campo from '@/components/ui/Campo';
import PainelLateral from '@/components/ui/PainelLateral';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import Carregando from '@/components/ui/Carregando';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';

/* ===== Domínio ============================================================
   Espelha o CHECK de carbon_fornecedores.status_contratacao. Valor fora deste mapa
   ainda aparece na tela (com o rótulo cru), em vez de sumir: um status novo criado
   no banco antes do deploy do frontend não pode deixar a linha sem identificação. */
const STATUS = {
  nao_iniciada: { rotulo: 'Não iniciada', tom: 'neutro' },
  em_andamento: { rotulo: 'Em andamento', tom: 'ambar' },
  concluida: { rotulo: 'Concluída', tom: 'verde' },
};

const ORDEM_STATUS = Object.keys(STATUS);

const OPCOES_STATUS = ORDEM_STATUS.map((valor) => ({ valor, rotulo: STATUS[valor].rotulo }));

/* ===== Formatação ========================================================= */

/**
 * Dinheiro em BRL. Sempre com o símbolo: a tela mistura contagem e valor na mesma
 * linha, e número solto ao lado de número solto é onde nasce a leitura errada.
 */
function fmtMoeda(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Formata uma coluna `date` do Postgres, que chega como 'AAAA-MM-DD'.
 *
 * Feito na mão de propósito: new Date('2026-01-01') é meia-noite UTC e, no fuso do
 * Brasil, toLocaleDateString mostraria o dia ANTERIOR - e aqui a data é vencimento
 * de parcela, justamente onde um dia de diferença importa.
 */
function fmtData(valor) {
  if (!valor) return '-';
  const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!partes) return String(valor);
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

/** CNPJ guardado em 14 dígitos, exibido com máscara. Tamanho torto sai como veio. */
function fmtCnpj(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  if (digitos.length !== 14) return valor ? String(valor) : '-';
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
}

/* ===== Formulário ========================================================= */

const FORM_VAZIO = {
  nome: '',
  cnpj: '',
  status_contratacao: 'nao_iniciada',
  contratante: '',
  observacoes: '',
  dados_bancarios: '',
  ativo: true,
};

function formDoFornecedor(fornecedor) {
  return {
    ...FORM_VAZIO,
    nome: fornecedor?.nome ?? '',
    cnpj: fmtCnpj(fornecedor?.cnpj) === '-' ? '' : fmtCnpj(fornecedor?.cnpj),
    status_contratacao: fornecedor?.status_contratacao || 'nao_iniciada',
    contratante: fornecedor?.contratante ?? '',
    observacoes: fornecedor?.observacoes ?? '',
    /* Só preenche quando o servidor mandou o conteúdo. Para quem não pode ler, o
       campo fica vazio E fora do payload: o PATCH só toca a coluna quando a chave
       vem no corpo, então editar o nome de um fornecedor não apaga o dado bancário
       que outra pessoa cadastrou. */
    dados_bancarios: fornecedor?.dados_bancarios ?? '',
    ativo: fornecedor?.ativo !== false,
  };
}

/**
 * Monta o corpo da requisição.
 *
 * `editando` muda o significado de campo vazio: na edição vai como null (limpar),
 * na criação é omitido (deixa o default do banco). Sem isso, apagar um campo já
 * preenchido seria impossível, com a tela ainda dizendo "atualizado".
 */
function montarPayload(form, editando, podeEditarDadosBancarios) {
  const nome = String(form.nome ?? '').trim();
  if (!nome) throw new Error('Informe o nome do fornecedor.');

  const payload = { nome, status_contratacao: form.status_contratacao, ativo: form.ativo };

  const digitos = String(form.cnpj ?? '').replace(/\D/g, '');
  if (digitos) {
    // Recusa no cliente para a pessoa corrigir sem perder o formulário. O servidor
    // valida de novo (CHECK na coluna): esta camada é conveniência, não a barreira.
    if (digitos.length !== 14) throw new Error('O CNPJ precisa ter 14 dígitos.');
    payload.cnpj = digitos;
  } else if (editando) {
    payload.cnpj = null;
  }

  for (const campo of ['contratante', 'observacoes']) {
    const valor = String(form[campo] ?? '').trim();
    if (valor) payload[campo] = valor;
    else if (editando) payload[campo] = null;
  }

  /* Só entra no payload quem pode ver o campo. Quem não pode nem recebeu o valor
     atual, e mandar a chave (mesmo vazia) apagaria o cadastro de pagamento. */
  if (podeEditarDadosBancarios) {
    const valor = String(form.dados_bancarios ?? '').trim();
    if (valor) payload.dados_bancarios = valor;
    else if (editando) payload.dados_bancarios = null;
  }

  return payload;
}

/* ===== Blocos de interface ================================================ */

function BadgeStatus({ status }) {
  const visual = STATUS[status];
  return (
    <Badge tom={visual?.tom ?? 'neutro'}>{visual?.rotulo || status || 'Sem status'}</Badge>
  );
}

/** Rótulo curto + valor, para os cartões de resumo e o painel de detalhe. */
function Dado({ icone: Icone, rotulo, children, className = '' }) {
  return (
    <div className={`flex items-start gap-2 min-w-0 ${className}`}>
      {Icone && <Icone size={14} className="text-[#8A9990] mt-0.5 flex-shrink-0" />}
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
 * Bloco de dados bancários do painel de detalhe.
 *
 * TRÊS estados, e nenhum deles pode ser confundido com outro:
 *   - servidor não autorizou: diz que existe (ou não) cadastro, sem o conteúdo;
 *   - autorizado e vazio: cobra o cadastro, porque sem ele o pagamento não sai;
 *   - autorizado e preenchido: o conteúdo fica ESCONDIDO até um clique explícito.
 *
 * O clique existe por um motivo prático, não decorativo: painel aberto numa reunião
 * com a tela compartilhada não pode expor dado de pagamento sem alguém ter pedido.
 */
function BlocoDadosBancarios({ fornecedor }) {
  const [revelado, setRevelado] = useState(false);
  const visivel = fornecedor?.dados_bancarios_visivel === true;
  const conteudo = fornecedor?.dados_bancarios ?? null;
  const existe = fornecedor?.tem_dados_bancarios === true;

  if (!visivel) {
    return (
      <AvisoDiscreto
        tom="azul"
        icone={Lock}
        titulo={existe ? 'Dados bancários cadastrados.' : 'Sem dados bancários cadastrados.'}
      >
        O conteúdo é restrito ao perfil administrador. Se o fornecedor for pessoa
        física ou MEI, esses dados são pessoais sob a LGPD, com finalidade restrita a
        pagar o contrato.
      </AvisoDiscreto>
    );
  }

  if (!existe || !conteudo) {
    return (
      <AvisoDiscreto tom="ambar" icone={Landmark} titulo="Sem dados bancários cadastrados.">
        O pagamento das parcelas depende deles. Cadastre pelo botão Editar.
      </AvisoDiscreto>
    );
  }

  return (
    <div className="border border-[#DDE3DE] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#F4F6F4]/60">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#5C7060]">
          <Landmark size={13} />
          Dados bancários
        </span>
        <BotaoSecundario
          variante="fantasma"
          tamanho="sm"
          icone={revelado ? EyeOff : Eye}
          onClick={() => setRevelado((atual) => !atual)}
        >
          {revelado ? 'Ocultar' : 'Mostrar'}
        </BotaoSecundario>
      </div>
      <div className="px-3 py-3">
        {revelado ? (
          <p className="text-xs text-[#1A2B1F] leading-relaxed whitespace-pre-wrap break-words">
            {conteudo}
          </p>
        ) : (
          <p className="text-xs text-[#8A9990] leading-relaxed">
            Conteúdo oculto. Dado pessoal quando o fornecedor é pessoa física ou MEI
            (LGPD): use apenas para o pagamento deste contrato.
          </p>
        )}
      </div>
    </div>
  );
}

/** Faixa de resumo. Números do conjunto FILTRADO inteiro, não da página. */
function Resumo({ resumo }) {
  if (!resumo) return null;
  const itens = [
    { rotulo: 'Fornecedores', valor: String(resumo.total ?? 0), detalhe: `${resumo.ativos ?? 0} ativos` },
    {
      rotulo: 'Contratação concluída',
      valor: String(resumo.por_status?.concluida ?? 0),
      detalhe: `${resumo.por_status?.em_andamento ?? 0} em andamento`,
    },
    {
      rotulo: 'Em aberto',
      valor: fmtMoeda(resumo.valor_aberto),
      detalhe: `de ${fmtMoeda(resumo.valor_contratado)} contratados`,
    },
    {
      rotulo: 'Vencido',
      valor: fmtMoeda(resumo.valor_vencido),
      detalhe:
        (resumo.fornecedores_com_vencido ?? 0) > 0
          ? `${resumo.fornecedores_com_vencido} ${resumo.fornecedores_com_vencido === 1 ? 'fornecedor' : 'fornecedores'}`
          : 'nenhum atraso',
      alerta: (resumo.valor_vencido ?? 0) > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {itens.map((item) => (
        <div key={item.rotulo} className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
            {item.rotulo}
          </p>
          <p
            className={`text-base font-bold tabular-nums mt-0.5 ${item.alerta ? 'text-[#A3231C]' : 'text-[#1A2B1F]'}`}
          >
            {item.valor}
          </p>
          <p className="text-[11px] text-[#5C7060]">{item.detalhe}</p>
        </div>
      ))}
    </div>
  );
}

function FormularioFornecedor({ form, setForm, podeEditarDadosBancarios }) {
  const alterar = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Campo
        rotulo="Nome do fornecedor"
        obrigatorio
        valor={form.nome}
        onChange={alterar('nome')}
        placeholder="Razão social ou como a equipe se refere"
        extras={{ maxLength: 200 }}
        className="sm:col-span-2"
      />

      <Campo
        rotulo="CNPJ"
        valor={form.cnpj}
        onChange={alterar('cnpj')}
        placeholder="00.000.000/0000-00"
        dica="Pode ficar em branco enquanto a documentação não chega."
        extras={{ maxLength: 20, inputMode: 'numeric' }}
      />

      <Campo
        rotulo="Status da contratação"
        tipo="select"
        opcoes={OPCOES_STATUS}
        valor={form.status_contratacao}
        onChange={alterar('status_contratacao')}
      />

      <Campo
        rotulo="Contratante"
        valor={form.contratante}
        onChange={alterar('contratante')}
        placeholder="Quem contrata deste lado"
        dica="Pessoa jurídica. Não registre nome, telefone ou e-mail de pessoa de contato."
        extras={{ maxLength: 200 }}
        className="sm:col-span-2"
      />

      <Campo
        rotulo="Observações"
        tipo="textarea"
        linhas={3}
        valor={form.observacoes}
        onChange={alterar('observacoes')}
        dica="Anotação operacional. Sem dado de pessoa física (LGPD)."
        className="sm:col-span-2"
      />

      {podeEditarDadosBancarios ? (
        <Campo
          rotulo="Dados bancários"
          tipo="textarea"
          linhas={3}
          valor={form.dados_bancarios}
          onChange={alterar('dados_bancarios')}
          dica="Acesso restrito: nunca aparece em listagem, só no detalhe e para o perfil administrador. Se o fornecedor for pessoa física ou MEI, é dado pessoal sob a LGPD."
          className="sm:col-span-2"
        />
      ) : (
        <AvisoDiscreto tom="azul" icone={Lock} className="sm:col-span-2">
          Os dados bancários deste fornecedor não são editáveis por aqui porque seu
          perfil não pode ler o conteúdo atual, e salvar o campo em branco apagaria o
          cadastro existente.
        </AvisoDiscreto>
      )}

      <Campo
        rotulo="Fornecedor ativo"
        tipo="checkbox"
        valor={form.ativo}
        onChange={alterar('ativo')}
        dica="Desmarcar esconde das listagens de trabalho sem apagar contratos e parcelas."
        className="sm:col-span-2"
      />
    </div>
  );
}

/** Contratos do fornecedor, dentro do painel de detalhe. */
function ContratosDoFornecedor({ contratos, carregando, rotaContratos }) {
  if (carregando) return <Carregando rotulo="Carregando contratos do fornecedor" tamanho="sm" />;

  if (!contratos.length) {
    return (
      <p className="text-xs text-[#8A9990] leading-relaxed">
        Nenhum contrato cadastrado para este fornecedor. O contrato é o que amarra o
        objeto, a data de contratação e as parcelas a pagar.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {contratos.map((contrato) => (
        <div key={contrato.id} className="border border-[#DDE3DE] rounded-xl px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-[#1A2B1F] break-words min-w-0">
              {contrato.objeto}
            </p>
            <span className="text-[11px] text-[#8A9990] tabular-nums flex-shrink-0">
              {fmtData(contrato.data_contratacao)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[11px] text-[#5C7060] tabular-nums">
            <span>Contratado {fmtMoeda(contrato.valor_total)}</span>
            <span>
              {contrato.parcelas_pagas ?? 0}/{contrato.parcelas ?? 0} parcelas pagas
            </span>
            <span>Em aberto {fmtMoeda(contrato.valor_aberto)}</span>
            {(contrato.valor_vencido ?? 0) > 0 && (
              <span className="font-semibold text-[#A3231C]">
                Vencido {fmtMoeda(contrato.valor_vencido)}
              </span>
            )}
          </div>
        </div>
      ))}
      <BotaoSecundario
        como="link"
        para={`${rotaContratos}?fornecedor_id=${encodeURIComponent(contratos[0].fornecedor_id)}`}
        icone={FileCheck2}
        iconeDireita={ArrowRight}
        tamanho="sm"
        larguraTotal
      >
        Abrir na tela de contratos
      </BotaoSecundario>
    </div>
  );
}

/* ===== Página ============================================================= */

export default function Fornecedores() {
  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const autenticado = (accounts?.length ?? 0) > 0;
  const queryClient = useQueryClient();

  const [filtros, setFiltros] = useState({ busca: '', status: '', ativo: '' });
  /** null | { modo: 'detalhe' | 'novo' | 'editar', id?: string } */
  const [painel, setPainel] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);

  const rotaContratos = rotaDaPagina('Contratos') ?? '/Contratos';

  const listaQuery = useQuery({
    queryKey: ['carbon', 'fornecedores', filtros],
    queryFn: async () =>
      listarFornecedores(msal, {
        busca: filtros.busca || undefined,
        status: filtros.status || undefined,
        ativo: filtros.ativo === '' ? undefined : filtros.ativo,
        limite: 200,
      }),
    /* Em modo demonstração não existe conta no MSAL (o login fica desabilitado) e as
       funções da API não usam token: exigir `autenticado` deixaria a tela
       permanentemente vazia justamente no modo que existe para revisá-la. */
    enabled: MODO_DEMO || autenticado,
  });

  const fornecedores = listaQuery.data?.fornecedores ?? [];
  const resumo = listaQuery.data?.resumo ?? null;

  const idAberto = painel?.id ?? null;
  const detalheQuery = useQuery({
    queryKey: ['carbon', 'fornecedor', idAberto],
    queryFn: async () => obterFornecedor(msal, idAberto),
    enabled: Boolean(idAberto) && (MODO_DEMO || autenticado),
  });

  const detalhe = detalheQuery.data?.fornecedor ?? null;
  const contratos = detalheQuery.data?.contratos ?? [];

  /* Quem decide se o conteúdo dos dados bancários pode ser lido é o SERVIDOR. Na
     criação ainda não há resposta para consultar, então usamos o que o detalhe já
     revelou nesta sessão; sem nenhuma informação, o campo aparece (o backend aceita
     a escrita de admin e gestor) - e o que ele nunca faz é devolver o conteúdo. */
  const podeEditarDadosBancarios =
    painel?.modo === 'editar' ? detalhe?.dados_bancarios_visivel === true : true;

  const fecharPainel = () => {
    setPainel(null);
    setForm(FORM_VAZIO);
  };

  const abrirDetalhe = (fornecedor) => setPainel({ modo: 'detalhe', id: fornecedor?.id });

  const abrirNovo = () => {
    setForm(FORM_VAZIO);
    setPainel({ modo: 'novo' });
  };

  const abrirEdicao = () => {
    if (!detalhe) return;
    setForm(formDoFornecedor(detalhe));
    setPainel({ modo: 'editar', id: detalhe.id });
  };

  const salvar = useMutation({
    mutationFn: async ({ id, payload }) =>
      id ? atualizarFornecedor(msal, id, payload) : criarFornecedor(msal, payload),
    onSuccess: (resposta, variaveis) => {
      queryClient.invalidateQueries({ queryKey: ['carbon', 'fornecedores'] });
      // A tela de contratos mostra o nome do fornecedor: sem isto, um nome corrigido
      // continuaria antigo lá até alguém recarregar.
      queryClient.invalidateQueries({ queryKey: ['carbon', 'contratos'] });
      if (variaveis?.id) {
        queryClient.invalidateQueries({ queryKey: ['carbon', 'fornecedor', variaveis.id] });
      }
      toast.success(variaveis?.id ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.');

      // Depois de criar, abre o detalhe do novo cadastro: o passo seguinte é quase
      // sempre lançar o contrato, e voltar para a lista obrigaria a procurá-lo.
      const novoId = resposta?.fornecedor?.id;
      if (!variaveis?.id && novoId) setPainel({ modo: 'detalhe', id: novoId });
      else if (variaveis?.id) setPainel({ modo: 'detalhe', id: variaveis.id });
      else fecharPainel();
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar o fornecedor.'),
  });

  const enviar = () => {
    let payload;
    try {
      payload = montarPayload(form, painel?.modo === 'editar', podeEditarDadosBancarios);
    } catch (erro) {
      toast.error(erro?.message || 'Revise os campos do formulário.');
      return;
    }
    salvar.mutate({ id: painel?.modo === 'editar' ? painel.id : null, payload });
  };

  const colunas = [
    {
      chave: 'nome',
      titulo: 'Fornecedor',
      larguraMinima: 260,
      render: (linha) => (
        <div className="min-w-0">
          <span className="font-semibold text-[#1A2B1F] break-words">
            {linha.nome || 'Sem nome'}
          </span>
          <span className="block text-[11px] text-[#5C7060] tabular-nums">
            {fmtCnpj(linha.cnpj)}
          </span>
          {linha.ativo === false && (
            <Badge tom="neutro" tamanho="sm" className="mt-1">
              Inativo
            </Badge>
          )}
        </div>
      ),
    },
    {
      chave: 'status_contratacao',
      titulo: 'Contratação',
      larguraMinima: 140,
      render: (linha) => <BadgeStatus status={linha.status_contratacao} />,
    },
    {
      chave: 'contratante',
      titulo: 'Contratante',
      larguraMinima: 170,
      render: (linha) => linha.contratante || <span className="text-[#8A9990]">-</span>,
    },
    {
      chave: 'contratos',
      titulo: 'Contratos',
      numerica: true,
      larguraMinima: 110,
      render: (linha) => {
        const total = Number(linha.contratos) || 0;
        if (total === 0) return <span className="text-[#8A9990]">-</span>;
        return (
          <span>
            {total}
            <span className="block text-[10px] uppercase tracking-wider text-[#8A9990]">
              {Number(linha.contratos_ativos) || 0} ativos
            </span>
          </span>
        );
      },
    },
    {
      chave: 'valor_aberto',
      titulo: 'Em aberto',
      numerica: true,
      larguraMinima: 130,
      render: (linha) =>
        (Number(linha.valor_aberto) || 0) === 0 ? (
          <span className="text-[#8A9990]">-</span>
        ) : (
          fmtMoeda(linha.valor_aberto)
        ),
    },
    {
      chave: 'valor_vencido',
      titulo: 'Vencido',
      numerica: true,
      larguraMinima: 130,
      render: (linha) => {
        const vencido = Number(linha.valor_vencido) || 0;
        if (vencido === 0) return <span className="text-[#8A9990]">-</span>;
        return (
          <span className="font-semibold text-[#A3231C]">
            {fmtMoeda(vencido)}
            <span className="block text-[10px] font-semibold uppercase tracking-wider">
              {linha.parcelas_vencidas} {Number(linha.parcelas_vencidas) === 1 ? 'parcela' : 'parcelas'}
            </span>
          </span>
        );
      },
    },
    {
      chave: 'proximo_vencimento',
      titulo: 'Próximo vencimento',
      larguraMinima: 150,
      render: (linha) =>
        linha.proximo_vencimento ? (
          <span className="tabular-nums">{fmtData(linha.proximo_vencimento)}</span>
        ) : (
          <span className="text-[#8A9990]">-</span>
        ),
    },
    {
      /* Só o indicador, nunca o conteúdo: esta é a listagem, e o requisito de
         privacidade da issue #10 é que os dados bancários não apareçam aqui. */
      chave: 'tem_dados_bancarios',
      titulo: 'Dados bancários',
      alinhamento: 'centro',
      larguraMinima: 130,
      render: (linha) =>
        linha.tem_dados_bancarios ? (
          <Badge tom="azul" tamanho="sm" icone={Lock}>
            Cadastrados
          </Badge>
        ) : (
          <span className="text-[11px] text-[#8A9990]">Não cadastrados</span>
        ),
    },
  ];

  const modoFormulario = painel?.modo === 'novo' || painel?.modo === 'editar';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* O título da página fica na topbar do Layout: nenhuma tela renderiza h1. */}
      <CabecalhoSecao
        titulo="Fornecedores"
        descricao={
          listaQuery.isLoading
            ? 'Carregando cadastro...'
            : `${fornecedores.length} ${fornecedores.length === 1 ? 'fornecedor' : 'fornecedores'} na visão atual`
        }
        acao={
          <BotaoPrimario icone={Plus} onClick={abrirNovo}>
            Novo fornecedor
          </BotaoPrimario>
        }
      />

      <Resumo resumo={resumo} />

      <Cartao icone={Search} titulo="Filtros" nivelTitulo={3}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Campo
            rotulo="Buscar"
            valor={filtros.busca}
            onChange={(valor) => setFiltros((atual) => ({ ...atual, busca: valor }))}
            placeholder="Nome ou CNPJ"
            dica="Termo só com dígitos busca no CNPJ."
          />
          <Campo
            rotulo="Contratação"
            tipo="select"
            opcoes={OPCOES_STATUS}
            rotuloVazio="Todas"
            valor={filtros.status}
            onChange={(valor) => setFiltros((atual) => ({ ...atual, status: valor }))}
          />
          <Campo
            rotulo="Situação do cadastro"
            tipo="select"
            opcoes={[
              { valor: 'true', rotulo: 'Somente ativos' },
              { valor: 'false', rotulo: 'Somente inativos' },
            ]}
            rotuloVazio="Ativos e inativos"
            valor={filtros.ativo}
            onChange={(valor) => setFiltros((atual) => ({ ...atual, ativo: valor }))}
          />
        </div>
      </Cartao>

      <Tabela
        legenda="Fornecedores cadastrados, com contratação e valores a pagar"
        colunas={colunas}
        dados={fornecedores}
        carregando={listaQuery.isLoading}
        rotuloCarregando="Carregando fornecedores"
        erro={listaQuery.isError}
        iconeVazio={Users}
        tituloVazio="Nenhum fornecedor cadastrado"
        textoVazio="O fornecedor é o começo da cadeia: sem ele não há contrato, e sem contrato não há parcela a pagar nem controle de vencimento."
        acaoVazio={
          <BotaoPrimario icone={Plus} onClick={abrirNovo}>
            Cadastrar fornecedor
          </BotaoPrimario>
        }
        onLinhaClick={abrirDetalhe}
        rotuloLinha={(linha) => `Abrir ${linha.nome}`}
        classeLinha={(linha) => (linha.ativo === false ? 'opacity-60' : '')}
      />

      <AvisoDiscreto icone={Lock} tom="azul" titulo="Sobre os dados bancários.">
        Eles não aparecem nesta listagem em nenhuma circunstância, só no painel de
        detalhe e apenas para o perfil administrador. Quando o fornecedor é pessoa
        física ou MEI, são dado pessoal sob a LGPD, com finalidade restrita ao
        pagamento do contrato.
      </AvisoDiscreto>

      {/* Painel de detalhe */}
      <PainelLateral
        aberto={painel?.modo === 'detalhe'}
        onFechar={fecharPainel}
        icone={Building2}
        titulo={detalhe?.nome || 'Fornecedor'}
        subtitulo={detalhe ? fmtCnpj(detalhe.cnpj) : 'Carregando cadastro'}
        largura="lg"
        rodape={
          <div className="flex items-center justify-between gap-2">
            <BotaoSecundario variante="fantasma" onClick={fecharPainel}>
              Fechar
            </BotaoSecundario>
            <BotaoPrimario icone={Pencil} onClick={abrirEdicao} desabilitado={!detalhe}>
              Editar cadastro
            </BotaoPrimario>
          </div>
        }
      >
        {detalheQuery.isLoading ? (
          <Carregando rotulo="Carregando fornecedor" />
        ) : detalheQuery.isError ? (
          <AvisoDiscreto texto="Não foi possível carregar o fornecedor agora. Se o aviso continuar, avise a equipe responsável pelo sistema." />
        ) : detalhe ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Dado rotulo="Contratação">
                <BadgeStatus status={detalhe.status_contratacao} />
              </Dado>
              <Dado rotulo="Cadastro">
                {detalhe.ativo === false ? 'Inativo' : 'Ativo'}
              </Dado>
              <Dado icone={Building2} rotulo="Contratante" className="col-span-2">
                {detalhe.contratante || 'Não informado'}
              </Dado>
              {detalhe.observacoes && (
                <Dado rotulo="Observações" className="col-span-2">
                  <span className="whitespace-pre-wrap">{detalhe.observacoes}</span>
                </Dado>
              )}
            </div>

            <BlocoDadosBancarios fornecedor={detalhe} />

            <div>
              <CabecalhoSecao
                titulo="Contratos"
                nivel={3}
                descricao={
                  contratos.length
                    ? `${contratos.length} ${contratos.length === 1 ? 'contrato' : 'contratos'}`
                    : undefined
                }
              />
              <div className="mt-3">
                <ContratosDoFornecedor
                  contratos={contratos}
                  carregando={detalheQuery.isFetching && !detalheQuery.data}
                  rotaContratos={rotaContratos}
                />
              </div>
            </div>
          </div>
        ) : (
          <AvisoDiscreto
            tom="ambar"
            icone={TriangleAlert}
            texto="Fornecedor não encontrado. Ele pode ter sido removido."
          />
        )}
      </PainelLateral>

      {/* Painel de formulário */}
      <PainelLateral
        aberto={modoFormulario}
        onFechar={fecharPainel}
        icone={Users}
        titulo={painel?.modo === 'editar' ? 'Editar fornecedor' : 'Novo fornecedor'}
        subtitulo="Somente o nome é obrigatório."
        largura="lg"
        fecharAoClicarFora={false}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario variante="fantasma" onClick={fecharPainel}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={enviar} carregando={salvar.isPending}>
              {painel?.modo === 'editar' ? 'Salvar alterações' : 'Cadastrar fornecedor'}
            </BotaoPrimario>
          </div>
        }
      >
        <FormularioFornecedor
          form={form}
          setForm={setForm}
          podeEditarDadosBancarios={podeEditarDadosBancarios}
        />
      </PainelLateral>

      {(resumo?.valor_vencido ?? 0) > 0 && (
        <p className="flex items-center gap-2 text-[11px] text-[#8A9990] px-1">
          <CalendarClock size={12} className="flex-shrink-0" />
          Os valores em aberto e vencido vêm das parcelas dos contratos. O status de
          cada parcela é calculado a partir da data de vencimento e da data de
          pagamento, nunca marcado à mão.
        </p>
      )}
    </div>
  );
}

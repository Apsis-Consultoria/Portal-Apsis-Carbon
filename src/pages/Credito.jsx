/**
 * Credito - estoque, emissão e venda de crédito de carbono (issue #15).
 *
 * A PERGUNTA QUE ESTA TELA EXISTE PARA RESPONDER. O levantamento do Notion registra
 * que "não há controle de estoque nem de emissão de crédito em nenhuma página varrida"
 * (docs/notion/14-compradores.md): o que existe lá é uma base Compradores quase vazia,
 * com a data da compra guardada no próprio comprador. Ninguém consegue responder hoje
 * quanto do estoque já foi vendido, e é essa a conta que a aba Estoque mostra.
 *
 * A TELA ABRE VAZIA, E ISSO ESTÁ CERTO. carbon_emissoes_credito e carbon_vendas
 * nasceram vazias e o escopo delas ainda aguarda validação do dono (ver o cabeçalho da
 * migration 20260814101000_credito). Nenhum estado vazio aqui diz apenas "nenhum
 * registro": os três explicam o que vai aparecer ali quando a primeira emissão for
 * lançada, porque quem abrir esta tela primeiro não vai saber o que ela faz.
 *
 * TRÊS REGRAS DE NEGÓCIO QUE A INTERFACE NÃO PODE VIOLAR:
 *
 * 1. NÃO EXISTE CONVERSÃO PARA MOEDA ÚNICA. Receita aparece sempre POR MOEDA, lado a
 *    lado, e não há em lugar nenhum um número que some BRL com USD. Converter exigiria
 *    taxa e data de referência, que são decisão contábil e não existem no sistema: uma
 *    tela que somasse estaria mentindo com aparência de precisão.
 *
 * 2. O BUFFER ESTÁ DENTRO DO VOLUME EMITIDO, não é valor à parte. Por isso a faixa de
 *    resumo mostra emitido, buffer e vendável na mesma linha de leitura, e o
 *    percentual vendido é sempre sobre o VENDÁVEL. O aposentado é subconjunto do
 *    vendido e nunca é subtraído de novo do estoque.
 *
 * 3. COMPRADOR SOB NDA NÃO TEM A RAZÃO SOCIAL EXIBIDA. Quem decide isso é o servidor,
 *    a partir do papel de quem pergunta: a tela apenas obedece ao par (nome,
 *    nome_mascarado) e nunca tenta inferir sigilo por conta própria. O país continua
 *    visível de propósito, porque é dele que depende a cobrança do ajuste
 *    correspondente do Artigo 6.
 *
 * AUTORIZAÇÃO: quem pode escrever é decidido no SERVIDOR (a Edge Function exige papel
 * admin ou gestor e responde 403 'sem_permissao'). A tela não esconde ações por perfil,
 * pelo mesmo motivo de src/pages/Fornecedores.jsx: seria uma segunda fonte de verdade
 * para a mesma regra, e ficaria dessincronizada na primeira mudança. Um 403 vira toast
 * com texto claro.
 */

import { useMemo, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Leaf, Coins, Plus, Pencil, Trash2, Lock, Users, Layers, Globe2, TriangleAlert,
  Handshake, ArrowRight, Info,
} from 'lucide-react';
import {
  ajustePendente,
  atualizarComprador,
  atualizarEmissao,
  atualizarVenda,
  criarComprador,
  criarEmissao,
  criarVenda,
  listarCompradores,
  listarEmissoes,
  listarEstoque,
  listarVendas,
  obterComprador,
  removerEmissao,
  removerVenda,
} from '@/lib/api/credito';
import { listarProjetos, normalizarListaProjetos } from '@/lib/api/projetos';
import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import Cartao from '@/components/ui/Cartao';
import CabecalhoSecao from '@/components/ui/CabecalhoSecao';
import Tabela from '@/components/ui/Tabela';
import Badge from '@/components/ui/Badge';
import Campo from '@/components/ui/Campo';
import PainelLateral from '@/components/ui/PainelLateral';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';

/* ===== Domínio ============================================================
   Espelha os CHECK da migration 20260814101000_credito. Valor fora destes mapas ainda
   aparece na tela com o rótulo cru, em vez de sumir: um status novo criado no banco
   antes do deploy do frontend não pode deixar a linha sem identificação.      */

const STATUS_COMPRADOR = {
  prospeccao: { rotulo: 'Prospecção', tom: 'neutro' },
  negociacao: { rotulo: 'Negociação', tom: 'ambar' },
  recorrente: { rotulo: 'Recorrente', tom: 'verde' },
  encerrado: { rotulo: 'Encerrado', tom: 'neutro' },
};

const OPCOES_STATUS = Object.entries(STATUS_COMPRADOR).map(([valor, { rotulo }]) => ({
  valor,
  rotulo,
}));

/** As três moedas de carbon_vendas.moeda. Nenhuma taxa de conversão entre elas. */
const MOEDAS = ['BRL', 'USD', 'EUR'];

const ABAS = [
  { chave: 'estoque', rotulo: 'Estoque', icone: Layers },
  { chave: 'vendas', rotulo: 'Vendas', icone: Handshake },
  { chave: 'compradores', rotulo: 'Compradores', icone: Users },
];

const OPCOES_ALERTA = [
  { valor: 'sobrevendido', rotulo: 'Sobrevendido' },
  { valor: 'sem_emissao', rotulo: 'Vendido sem emissão' },
  { valor: 'sem_venda', rotulo: 'Estoque parado' },
  { valor: 'ajuste_pendente', rotulo: 'Com ajuste pendente' },
];

const OPCOES_SITUACAO_VENDA = [
  { valor: 'ajuste_pendente', rotulo: 'Ajuste correspondente pendente' },
  { valor: 'internacional', rotulo: 'Venda internacional' },
  { valor: 'sem_preco', rotulo: 'Sem preço informado' },
];

/* ===== Formatação ========================================================= */

/**
 * Volume em tCO2e. Até duas casas, e não quatro: a coluna guarda numeric(16,4) porque
 * o registro pode emitir fração, mas escrever "120.000,0000 tCO2e" numa tabela de
 * cinco colunas rouba a leitura do número que importa.
 */
const NUMERO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function fmtVolume(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? NUMERO.format(n) : '-';
}

/**
 * Dinheiro COM a moeda sempre visível.
 *
 * O símbolo não é enfeite aqui: a mesma tela mostra receita em três moedas, e um
 * número solto ao lado de outro número solto é exatamente onde alguém soma o que não
 * se soma.
 */
function fmtMoeda(valor, moeda = 'BRL') {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: moeda });
}

/**
 * Formata uma coluna `date` do Postgres, que chega como 'AAAA-MM-DD'.
 *
 * Na mão de propósito: new Date('2026-01-01') é meia-noite UTC e, no fuso do Brasil,
 * toLocaleDateString mostraria o dia ANTERIOR - e aqui a data é a da transferência do
 * crédito, justamente onde um dia de diferença importa.
 */
function fmtData(valor) {
  if (!valor) return '-';
  const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!partes) return String(valor);
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

/** Percentual que aceita a AUSÊNCIA de denominador. Nulo vira traço, nunca 0%. */
function fmtPct(valor) {
  const n = Number(valor);
  if (valor === null || valor === undefined || !Number.isFinite(n)) return '-';
  return `${NUMERO.format(n)}%`;
}

const vazio = <span className="text-[#8A9990]">-</span>;

/* ===== Blocos de interface ================================================ */

/**
 * Receita separada por moeda.
 *
 * É a regra 1 desenhada: três valores lado a lado, sem total. Moeda sem receita some
 * da lista para não poluir a leitura com zeros, e quando NENHUMA tem valor o bloco diz
 * isso por extenso, em vez de mostrar "R$ 0,00" e sugerir que houve venda sem preço.
 */
function Receita({ receita, className = '' }) {
  const comValor = MOEDAS.filter((moeda) => Number(receita?.[moeda]) > 0);

  if (!comValor.length) {
    return <span className={`text-[#8A9990] ${className}`}>Sem receita registrada</span>;
  }

  return (
    <div className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 ${className}`}>
      {comValor.map((moeda) => (
        <span key={moeda} className="tabular-nums text-[#1A2B1F]">
          {fmtMoeda(receita[moeda], moeda)}
        </span>
      ))}
    </div>
  );
}

/** Cartão de número da faixa de conciliação. */
function Numero({ rotulo, valor, detalhe, alerta = false }) {
  return (
    <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">{rotulo}</p>
      <p
        className={`text-base font-bold tabular-nums mt-0.5 ${
          alerta ? 'text-[#A3231C]' : 'text-[#1A2B1F]'
        }`}
      >
        {valor}
      </p>
      <p className="text-[11px] text-[#5C7060]">{detalhe}</p>
    </div>
  );
}

/**
 * Faixa de conciliação do conjunto filtrado.
 *
 * Os seis números vêm prontos da função SQL carbon_estoque_conciliacao. Nenhum deles é
 * recalculado aqui, e essa é a decisão que mantém o rodapé coerente com a tabela: duas
 * implementações da mesma soma divergem no primeiro caso de borda.
 */
function Conciliacao({ conciliacao }) {
  if (!conciliacao) return null;

  const alertas = conciliacao.alertas ?? {};
  const sobrevendido = Number(alertas.sobrevendido) || 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Numero
          rotulo="Emitido"
          valor={fmtVolume(conciliacao.emitido_tco2e)}
          detalhe={`${fmtVolume(conciliacao.buffer_tco2e)} tCO2e em buffer`}
        />
        <Numero
          rotulo="Vendável"
          valor={fmtVolume(conciliacao.vendavel_tco2e)}
          detalhe="emitido menos o buffer"
        />
        <Numero
          rotulo="Vendido"
          valor={fmtVolume(conciliacao.vendido_tco2e)}
          detalhe={`${fmtPct(conciliacao.vendido_pct)} do vendável`}
        />
        <Numero
          rotulo="Disponível"
          valor={fmtVolume(conciliacao.disponivel_tco2e)}
          detalhe={`${fmtVolume(conciliacao.aposentado_tco2e)} tCO2e já aposentados`}
          alerta={Number(conciliacao.disponivel_tco2e) < 0}
        />
      </div>

      <div className="bg-white border border-[#DDE3DE] rounded-2xl shadow-sm px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A9990]">
          Receita por moeda
        </p>
        <Receita receita={conciliacao.receita} className="mt-1 text-base font-bold" />
        {/* Não é rodapé decorativo: é a explicação de por que não existe um total. */}
        <p className="text-[11px] text-[#5C7060] mt-1">
          As moedas nunca são somadas entre si. Converter exigiria taxa e data de
          referência, que são decisão contábil e não existem no sistema.
        </p>
      </div>

      {sobrevendido > 0 && (
        <AvisoDiscreto tom="ambar" icone={TriangleAlert} titulo="Vendido acima do vendável.">
          {sobrevendido} {sobrevendido === 1 ? 'safra está' : 'safras estão'} com volume vendido
          maior que o emitido menos o buffer. Não é proibido - venda a termo de crédito
          ainda não emitido é prática de mercado -, mas precisa casar com uma emissão
          futura.
        </AvisoDiscreto>
      )}
    </div>
  );
}

/** Nome do comprador com o selo de sigilo quando o servidor mascarou. */
function NomeComprador({ nome, mascarado }) {
  if (!mascarado) return <span className="font-semibold text-[#1A2B1F]">{nome || 'Sem nome'}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Lock size={13} className="text-[#8A9990] flex-shrink-0" />
      <span className="font-semibold text-[#5C7060] italic">{nome}</span>
    </span>
  );
}

/** Selos de conciliação da linha de estoque. */
function SelosDaLinha({ linha }) {
  const selos = [];
  if (linha.sobrevendido) selos.push({ tom: 'vermelho', texto: 'Sobrevendido' });
  if (linha.sem_emissao) selos.push({ tom: 'ambar', texto: 'Sem emissão' });
  if (linha.sem_venda) selos.push({ tom: 'neutro', texto: 'Estoque parado' });
  if (Number(linha.vendas_ajuste_pendente) > 0) {
    selos.push({ tom: 'azul', texto: `${linha.vendas_ajuste_pendente} sem ajuste` });
  }
  if (Number(linha.emissoes_sem_serial) > 0) {
    selos.push({ tom: 'neutro', texto: 'Sem serial' });
  }
  if (!selos.length) return vazio;

  return (
    <div className="flex flex-wrap gap-1">
      {selos.map((selo) => (
        <Badge key={selo.texto} tom={selo.tom} tamanho="sm">
          {selo.texto}
        </Badge>
      ))}
    </div>
  );
}

/* ===== Formulários ========================================================
   Campo vazio significa coisas diferentes na criação e na edição: na criação é
   "deixe o default do banco" (omitir), na edição é "limpar" (mandar null). Sem essa
   distinção, apagar um campo já preenchido seria impossível, com a tela ainda dizendo
   que salvou.                                                                 */

const FORM_EMISSAO = {
  projeto_id: '',
  vintage: '',
  quantidade_tco2e: '',
  buffer_tco2e: '',
  serial_inicio: '',
  serial_fim: '',
  data_emissao: '',
  observacoes: '',
};

const FORM_VENDA = {
  comprador_id: '',
  projeto_id: '',
  vintage: '',
  quantidade_tco2e: '',
  preco_unitario: '',
  moeda: 'BRL',
  data: '',
  ajuste_correspondente: false,
  aposentado: false,
  data_aposentadoria: '',
  observacoes: '',
};

const FORM_COMPRADOR = {
  nome: '',
  pais: '',
  status: 'prospeccao',
  recorrente: false,
  sigiloso: false,
  observacoes: '',
  ativo: true,
};

/** Número em pt-BR para o corpo da requisição. Vírgula decimal é aceita. */
function numeroDoCampo(valor, rotulo) {
  const texto = String(valor ?? '').trim();
  if (!texto) return null;

  /*
   * Ponto de milhar é RECUSADO em vez de adivinhado: Number('13.250') é 13,25,
   * mil vezes menor que os treze mil duzentos e cinquenta que a pessoa digitou,
   * e num volume de crédito esse erro passa direto pela revisão.
   *
   * MAS a regra antiga era `/\.\d{3}(?!\d)/`, e ela recusava 0.123 - um decimal
   * legítimo. As colunas são numeric(14,4): três e quatro casas decimais são
   * exatamente o que se espera de tCO2e e de preço unitário. O efeito era não
   * conseguir salvar um registro com o valor que o próprio banco aceita, com
   * uma mensagem que acusava a pessoa de um erro que ela não cometeu.
   *
   * A regra certa não olha a quantidade de dígitos, olha a ESTRUTURA:
   *   - tem vírgula? então a vírgula é o decimal e todo ponto é milhar (13.250,5)
   *   - mais de um ponto? só pode ser milhar (1.234.567)
   *   - um ponto só, sem vírgula? é o separador decimal (0.123)
   */
  const pontos = (texto.match(/\./g) ?? []).length;
  const temVirgula = texto.includes(',');

  let normalizado;
  if (temVirgula) {
    normalizado = texto.replace(/\./g, '').replace(',', '.');
  } else if (pontos > 1) {
    normalizado = texto.replace(/\./g, '');
  } else {
    normalizado = texto;
  }

  const n = Number(normalizado);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Informe um número válido em ${rotulo}.`);
  return n;
}

function payloadEmissao(form, editando) {
  const corpo = {};
  if (!editando) {
    if (!form.projeto_id) throw new Error('Escolha o projeto que emitiu o crédito.');
    corpo.projeto_id = form.projeto_id;
  }

  const vintage = numeroDoCampo(form.vintage, 'vintage');
  if (vintage === null) throw new Error('Informe o vintage (o ano da safra do crédito).');
  corpo.vintage = vintage;

  const quantidade = numeroDoCampo(form.quantidade_tco2e, 'volume emitido');
  if (quantidade === null) throw new Error('Informe o volume total emitido em tCO2e.');
  corpo.quantidade_tco2e = quantidade;

  corpo.buffer_tco2e = numeroDoCampo(form.buffer_tco2e, 'buffer') ?? 0;
  if (corpo.buffer_tco2e > quantidade) {
    throw new Error(
      'O buffer faz parte do volume emitido e não pode ser maior que ele. Informe em volume o TOTAL emitido, buffer incluído.'
    );
  }

  for (const campo of ['serial_inicio', 'serial_fim', 'data_emissao', 'observacoes']) {
    const valor = String(form[campo] ?? '').trim();
    if (valor) corpo[campo] = valor;
    else if (editando) corpo[campo] = null;
  }

  return corpo;
}

function payloadVenda(form, editando) {
  const corpo = {};
  if (!editando) {
    if (!form.projeto_id) throw new Error('Escolha o projeto que gerou o crédito vendido.');
    corpo.projeto_id = form.projeto_id;
  }
  if (!form.comprador_id) throw new Error('Escolha o comprador.');
  corpo.comprador_id = form.comprador_id;

  const vintage = numeroDoCampo(form.vintage, 'vintage');
  if (vintage === null) throw new Error('Informe o vintage do crédito vendido.');
  corpo.vintage = vintage;

  const quantidade = numeroDoCampo(form.quantidade_tco2e, 'volume vendido');
  if (quantidade === null || quantidade <= 0) {
    throw new Error('O volume vendido precisa ser maior que zero.');
  }
  corpo.quantidade_tco2e = quantidade;

  // Preço opcional de propósito: parte das transações tem valor sob confidencialidade
  // ou ainda em negociação, e exigir o número levaria alguém a inventar um.
  corpo.preco_unitario = numeroDoCampo(form.preco_unitario, 'preço por tCO2e');
  corpo.moeda = form.moeda || 'BRL';
  corpo.ajuste_correspondente = form.ajuste_correspondente === true;
  corpo.aposentado = form.aposentado === true;

  for (const campo of ['data', 'data_aposentadoria', 'observacoes']) {
    const valor = String(form[campo] ?? '').trim();
    if (valor) corpo[campo] = valor;
    else if (editando) corpo[campo] = null;
  }
  // Desmarcar a aposentadoria limpa a data junto; o servidor faz o mesmo, e mandar as
  // duas coisas coerentes evita um 400 do CHECK que a pessoa não saberia interpretar.
  if (!corpo.aposentado) corpo.data_aposentadoria = null;

  return corpo;
}

/**
 * Corpo do comprador.
 *
 * `bloqueadoPorSigilo` é o caso do cadastro sob NDA aberto por quem não pode ler a
 * razão social: `nome` e `sigiloso` ficam FORA do corpo, e não vão vazios nem com o
 * rótulo genérico. Enviar o rótulo gravaria "Comprador sob NDA" por cima do nome
 * verdadeiro, e enviar vazio esbarraria na validação de campo obrigatório de um campo
 * que a pessoa nem podia preencher. O servidor recusa os dois com 403, mas a tela não
 * deveria chegar lá.
 */
function payloadComprador(form, editando, bloqueadoPorSigilo = false) {
  const corpo = {
    status: form.status,
    recorrente: form.recorrente === true,
    ativo: form.ativo !== false,
  };

  if (!bloqueadoPorSigilo) {
    const nome = String(form.nome ?? '').trim();
    if (!nome) throw new Error('Informe o nome do comprador.');
    corpo.nome = nome;
    corpo.sigiloso = form.sigiloso === true;
  }

  for (const campo of ['pais', 'observacoes']) {
    const valor = String(form[campo] ?? '').trim();
    if (valor) corpo[campo] = valor;
    else if (editando) corpo[campo] = null;
  }

  return corpo;
}

function FormularioEmissao({ form, setForm, projetos, editando }) {
  const alterar = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Campo
        rotulo="Projeto"
        tipo="select"
        obrigatorio
        opcoes={projetos.map((p) => ({ valor: p.id, rotulo: p.nome }))}
        rotuloVazio="Escolha o projeto"
        valor={form.projeto_id}
        onChange={alterar('projeto_id')}
        desabilitado={editando}
        dica={
          editando
            ? 'O projeto de uma emissão já lançada não muda: isso moveria estoque de um projeto para outro em silêncio.'
            : undefined
        }
        className="sm:col-span-2"
      />

      <Campo
        rotulo="Vintage"
        tipo="numero"
        obrigatorio
        valor={form.vintage}
        onChange={alterar('vintage')}
        placeholder="2024"
        dica="Ano da safra, ou seja, o ano em que a redução aconteceu. Não é o ano da emissão."
        extras={{ min: 1990, max: 2100 }}
      />

      <Campo
        rotulo="Data da emissão"
        tipo="data"
        valor={form.data_emissao}
        onChange={alterar('data_emissao')}
        dica="Pode ficar em branco enquanto o registro não confirma."
      />

      <Campo
        rotulo="Volume emitido (tCO2e)"
        tipo="decimal"
        obrigatorio
        valor={form.quantidade_tco2e}
        onChange={alterar('quantidade_tco2e')}
        placeholder="120000"
        dica="Volume TOTAL do evento, como consta no registro, com o buffer incluído."
      />

      <Campo
        rotulo="Buffer (tCO2e)"
        tipo="decimal"
        valor={form.buffer_tco2e}
        onChange={alterar('buffer_tco2e')}
        placeholder="18000"
        dica="Parcela retida na conta de não permanência. Faz parte do volume acima e não é vendável."
      />

      <Campo
        rotulo="Serial inicial"
        valor={form.serial_inicio}
        onChange={alterar('serial_inicio')}
        dica="Início e fim andam juntos: informe os dois ou nenhum."
        extras={{ maxLength: 120 }}
      />

      <Campo
        rotulo="Serial final"
        valor={form.serial_fim}
        onChange={alterar('serial_fim')}
        dica="Serial único se registra com início igual ao fim."
        extras={{ maxLength: 120 }}
      />

      <Campo
        rotulo="Observações"
        tipo="textarea"
        linhas={3}
        valor={form.observacoes}
        onChange={alterar('observacoes')}
        dica="Anotação interna. Sem dado de pessoa física (LGPD)."
        className="sm:col-span-2"
      />
    </div>
  );
}

function FormularioVenda({ form, setForm, projetos, compradores, editando }) {
  const alterar = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const projeto = projetos.find((p) => p.id === form.projeto_id) ?? null;
  const comprador = compradores.find((c) => c.id === form.comprador_id) ?? null;

  /* Aviso montado no cliente com a MESMA regra do banco (ajustePendente é gêmea de
     public.carbon_venda_ajuste_pendente). Existe para a pessoa ver a pendência ANTES
     de salvar: perguntar isso ao servidor a cada troca de campo seria uma requisição
     por tecla. */
  const pendente = ajustePendente(comprador?.pais, projeto?.pais, form.ajuste_correspondente);
  const faltaPais = Boolean(comprador) && Boolean(projeto) && !comprador?.pais;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Campo
        rotulo="Comprador"
        tipo="select"
        obrigatorio
        opcoes={compradores.map((c) => ({ valor: c.id, rotulo: c.nome }))}
        rotuloVazio="Escolha o comprador"
        valor={form.comprador_id}
        onChange={alterar('comprador_id')}
      />

      <Campo
        rotulo="Projeto"
        tipo="select"
        obrigatorio
        opcoes={projetos.map((p) => ({ valor: p.id, rotulo: p.nome }))}
        rotuloVazio="Escolha o projeto"
        valor={form.projeto_id}
        onChange={alterar('projeto_id')}
        desabilitado={editando}
      />

      <Campo
        rotulo="Vintage"
        tipo="numero"
        obrigatorio
        valor={form.vintage}
        onChange={alterar('vintage')}
        placeholder="2024"
        dica="Vender vintage ainda não emitido é venda a termo, e é aceito."
        extras={{ min: 1990, max: 2100 }}
      />

      <Campo
        rotulo="Volume vendido (tCO2e)"
        tipo="decimal"
        obrigatorio
        valor={form.quantidade_tco2e}
        onChange={alterar('quantidade_tco2e')}
        placeholder="40000"
      />

      <Campo
        rotulo="Preço por tCO2e"
        tipo="decimal"
        valor={form.preco_unitario}
        onChange={alterar('preco_unitario')}
        placeholder="45,00"
        dica="Pode ficar em branco: preço sob confidencialidade ou ainda em negociação."
      />

      <Campo
        rotulo="Moeda"
        tipo="select"
        opcoes={MOEDAS}
        valor={form.moeda}
        onChange={alterar('moeda')}
        dica="A receita é somada por moeda. Não há conversão em lugar nenhum do sistema."
      />

      <Campo
        rotulo="Data da transação"
        tipo="data"
        valor={form.data}
        onChange={alterar('data')}
        dica="Em branco enquanto o contrato não está assinado."
      />

      <Campo
        rotulo="Ajuste correspondente registrado"
        tipo="checkbox"
        valor={form.ajuste_correspondente}
        onChange={alterar('ajuste_correspondente')}
        dica="Artigo 6 do Acordo de Paris. Marque quando o ajuste já constar formalmente."
      />

      {pendente && (
        <AvisoDiscreto tom="ambar" icone={Globe2} className="sm:col-span-2">
          Venda internacional: o comprador é de {comprador?.pais} e o projeto é de{' '}
          {projeto?.pais}. Enquanto o ajuste correspondente não for registrado, esta venda
          aparece como pendente na conciliação.
        </AvisoDiscreto>
      )}

      {faltaPais && (
        <AvisoDiscreto tom="azul" icone={Info} className="sm:col-span-2">
          O comprador está sem país no cadastro. Sem ele o sistema não tem como dizer se
          esta venda exige ajuste correspondente, e por isso não vai cobrar nada - o que
          falta aqui é o país, não o ajuste.
        </AvisoDiscreto>
      )}

      <Campo
        rotulo="Crédito já aposentado"
        tipo="checkbox"
        valor={form.aposentado}
        onChange={alterar('aposentado')}
        dica="A aposentadoria acontece depois da transferência ao comprador, e não tira o volume do estoque uma segunda vez."
      />

      <Campo
        rotulo="Data da aposentadoria"
        tipo="data"
        valor={form.data_aposentadoria}
        onChange={(valor) =>
          // Informar a data é afirmar que o retirement aconteceu: marcamos junto para o
          // formulário não conseguir montar um par contraditório que o banco recusaria.
          setForm((atual) => ({
            ...atual,
            data_aposentadoria: valor,
            aposentado: valor ? true : atual.aposentado,
          }))
        }
        desabilitado={!form.aposentado}
      />

      <Campo
        rotulo="Observações"
        tipo="textarea"
        linhas={3}
        valor={form.observacoes}
        onChange={alterar('observacoes')}
        dica="Anotação interna. Não registre dado pessoal nem o nome de comprador sigiloso (LGPD)."
        className="sm:col-span-2"
      />
    </div>
  );
}

function FormularioComprador({ form, setForm, bloqueadoPorSigilo }) {
  const alterar = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {bloqueadoPorSigilo && (
        <AvisoDiscreto tom="azul" icone={Lock} className="sm:col-span-2">
          Este comprador está sob acordo de confidencialidade e seu perfil não pode ler a
          razão social. O nome e o sigilo ficam travados aqui: sobrescrever às cegas um
          valor que o sistema se recusou a mostrar seria perda de dado. O resto do
          cadastro continua editável.
        </AvisoDiscreto>
      )}

      <Campo
        rotulo="Nome do comprador"
        obrigatorio
        valor={form.nome}
        onChange={alterar('nome')}
        desabilitado={bloqueadoPorSigilo}
        placeholder="Razão social ou nome comercial"
        dica="Pessoa jurídica. Dado de pessoa física não entra aqui (LGPD)."
        extras={{ maxLength: 200 }}
        className="sm:col-span-2"
      />

      <Campo
        rotulo="País"
        valor={form.pais}
        onChange={alterar('pais')}
        placeholder="Brasil"
        dica="Regra de negócio, não decoração: comprador de país diferente do projeto levanta a questão do ajuste correspondente."
        extras={{ maxLength: 120 }}
      />

      <Campo
        rotulo="Estágio do relacionamento"
        tipo="select"
        opcoes={OPCOES_STATUS}
        valor={form.status}
        onChange={(valor) =>
          // Estágio 'recorrente' implica a flag; o banco tem um CHECK para isso e o
          // servidor normaliza. Refletir aqui só evita a ida e volta.
          setForm((atual) => ({
            ...atual,
            status: valor,
            recorrente: valor === 'recorrente' ? true : atual.recorrente,
          }))
        }
        dica="Não é o status da venda: cada venda tem registro próprio."
      />

      <Campo
        rotulo="Comprador recorrente"
        tipo="checkbox"
        valor={form.recorrente}
        onChange={alterar('recorrente')}
        dica="Sobrevive ao encerramento: quem foi recorrente continua tendo sido, e isso importa para previsão de receita."
      />

      <Campo
        rotulo="Identidade sob acordo de confidencialidade"
        tipo="checkbox"
        valor={form.sigiloso}
        onChange={alterar('sigiloso')}
        desabilitado={bloqueadoPorSigilo}
        dica="Marcado, a razão social deixa de sair para quem não é administrador. O país continua visível, porque dele depende a cobrança do ajuste correspondente."
      />

      <Campo
        rotulo="Cadastro ativo"
        tipo="checkbox"
        valor={form.ativo}
        onChange={alterar('ativo')}
        dica="Desmarcar esconde das listagens sem apagar as vendas já registradas."
      />

      <Campo
        rotulo="Observações"
        tipo="textarea"
        linhas={3}
        valor={form.observacoes}
        onChange={alterar('observacoes')}
        dica="Aparece para todo leitor, inclusive nos cadastros sigilosos: nunca escreva aqui o nome de um comprador sob NDA."
        className="sm:col-span-2"
      />
    </div>
  );
}

/* ===== Página ============================================================= */

export default function Credito() {
  const { instance, accounts } = useMsal();
  const msal = useMemo(() => ({ instance, accounts }), [instance, accounts]);
  const autenticado = (accounts?.length ?? 0) > 0;
  /* Em modo demonstração não existe conta no MSAL e as funções da API não usam token:
     exigir `autenticado` deixaria a tela permanentemente vazia justamente no modo que
     existe para revisá-la. */
  const habilitado = (MODO_DEMO && MODO_DEMO_ATIVO()) || autenticado;
  const queryClient = useQueryClient();

  const [aba, setAba] = useState('estoque');
  const [filtros, setFiltros] = useState({ projeto_id: '', vintage: '', alerta: '', situacao: '' });
  /** null | { tipo: 'emissao' | 'venda' | 'comprador', registro?: object } */
  const [painel, setPainel] = useState(null);
  const [form, setForm] = useState(FORM_EMISSAO);

  /* Mesma chave de src/pages/Projetos.jsx: o cache é compartilhado e abrir Crédito
     depois de Projetos não refaz a requisição. normalizarListaProjetos é obrigatória
     aqui - ler o envelope é o que impede outra tela de encontrar um formato diferente. */
  const projetosQuery = useQuery({
    queryKey: ['carbon', 'projetos'],
    queryFn: async () => normalizarListaProjetos(await listarProjetos(msal)),
    enabled: habilitado,
  });
  const projetos = projetosQuery.data?.projetos ?? [];

  const filtroEstoque = {
    projeto_id: filtros.projeto_id || undefined,
    vintage: filtros.vintage || undefined,
    alerta: filtros.alerta || undefined,
  };

  const estoqueQuery = useQuery({
    queryKey: ['carbon', 'credito', 'estoque', filtroEstoque],
    queryFn: async () => listarEstoque(msal, filtroEstoque),
    enabled: habilitado,
  });

  const emissoesQuery = useQuery({
    queryKey: ['carbon', 'credito', 'emissoes', filtros.projeto_id, filtros.vintage],
    queryFn: async () =>
      listarEmissoes(msal, {
        projeto_id: filtros.projeto_id || undefined,
        vintage: filtros.vintage || undefined,
        limite: 200,
      }),
    enabled: habilitado && aba === 'estoque',
  });

  const filtroVendas = {
    projeto_id: filtros.projeto_id || undefined,
    vintage: filtros.vintage || undefined,
    situacao: filtros.situacao || undefined,
    limite: 200,
  };

  const vendasQuery = useQuery({
    queryKey: ['carbon', 'credito', 'vendas', filtroVendas],
    queryFn: async () => listarVendas(msal, filtroVendas),
    enabled: habilitado && aba === 'vendas',
  });

  /* A lista de compradores é buscada SEMPRE, e não só na aba de compradores: o
     formulário de venda precisa dela para montar o seletor, e uma segunda requisição
     no momento de abrir o painel deixaria o campo vazio por um instante. */
  const compradoresQuery = useQuery({
    queryKey: ['carbon', 'credito', 'compradores'],
    queryFn: async () => listarCompradores(msal, { limite: 200 }),
    enabled: habilitado,
  });

  /* Detalhe do comprador aberto no painel: traz as vendas dele, que a aba de Vendas
     mostra misturadas com as dos outros. Só dispara com um cadastro existente aberto -
     no formulário de criação não há id para consultar. */
  const compradorAberto = painel?.tipo === 'comprador' ? painel.registro?.id ?? null : null;
  const compradorQuery = useQuery({
    queryKey: ['carbon', 'credito', 'comprador', compradorAberto],
    queryFn: async () => obterComprador(msal, compradorAberto),
    enabled: habilitado && Boolean(compradorAberto),
  });

  const conciliacao = estoqueQuery.data?.conciliacao ?? null;
  const estoque = estoqueQuery.data?.estoque ?? [];

  /*
   * A rota pagina com o limite padrão (50) e devolve `total`. A tela não manda
   * `limite` nem oferece paginação, então o que ela mostra pode ser um recorte.
   *
   * Isto AVISA em vez de cortar em silêncio: uma tabela de estoque truncada lê
   * como "é todo o estoque que existe", e alguém somaria a coluna disponível
   * achando que tem o total do projeto. Com poucas safras nunca aparece; existe
   * para o dia em que passar de 50, que é quando o erro seria caro.
   */
  const estoqueTruncado =
    typeof estoqueQuery.data?.total === 'number' && estoqueQuery.data.total > estoque.length;
  const emissoes = emissoesQuery.data?.emissoes ?? [];
  const vendas = vendasQuery.data?.vendas ?? [];
  const compradores = compradoresQuery.data?.compradores ?? [];
  const resumoCompradores = compradoresQuery.data?.resumo ?? null;
  const resumoVendas = vendasQuery.data?.resumo ?? null;

  /* Uma invalidação só, com o prefixo do domínio: lançar uma venda muda o estoque, a
     conciliação e os agregados do comprador ao mesmo tempo, e listar as três chaves à
     mão significaria esquecer uma na próxima aba que aparecer. */
  const recarregar = () => queryClient.invalidateQueries({ queryKey: ['carbon', 'credito'] });

  const fecharPainel = () => setPainel(null);

  const abrir = (tipo, registro = null) => {
    if (tipo === 'emissao') {
      setForm(
        registro
          ? {
              ...FORM_EMISSAO,
              projeto_id: registro.projeto_id ?? '',
              vintage: registro.vintage ?? '',
              quantidade_tco2e: registro.quantidade_tco2e ?? '',
              buffer_tco2e: registro.buffer_tco2e ?? '',
              serial_inicio: registro.serial_inicio ?? '',
              serial_fim: registro.serial_fim ?? '',
              data_emissao: registro.data_emissao ?? '',
              observacoes: registro.observacoes ?? '',
            }
          : { ...FORM_EMISSAO, projeto_id: filtros.projeto_id || projetos[0]?.id || '' }
      );
    } else if (tipo === 'venda') {
      setForm(
        registro
          ? {
              ...FORM_VENDA,
              comprador_id: registro.comprador_id ?? '',
              projeto_id: registro.projeto_id ?? '',
              vintage: registro.vintage ?? '',
              quantidade_tco2e: registro.quantidade_tco2e ?? '',
              preco_unitario: registro.preco_unitario ?? '',
              moeda: registro.moeda ?? 'BRL',
              data: registro.data ?? '',
              ajuste_correspondente: registro.ajuste_correspondente === true,
              aposentado: registro.aposentado === true,
              data_aposentadoria: registro.data_aposentadoria ?? '',
              observacoes: registro.observacoes ?? '',
            }
          : { ...FORM_VENDA, projeto_id: filtros.projeto_id || projetos[0]?.id || '' }
      );
    } else {
      setForm(
        registro
          ? {
              ...FORM_COMPRADOR,
              nome: registro.nome_mascarado ? '' : registro.nome ?? '',
              pais: registro.pais ?? '',
              status: registro.status ?? 'prospeccao',
              recorrente: registro.recorrente === true,
              sigiloso: registro.sigiloso === true,
              observacoes: registro.observacoes ?? '',
              ativo: registro.ativo !== false,
            }
          : FORM_COMPRADOR
      );
    }
    setPainel({ tipo, registro });
  };

  const salvar = useMutation({
    mutationFn: async ({ tipo, id, corpo }) => {
      if (tipo === 'emissao') {
        return id ? atualizarEmissao(msal, id, corpo) : criarEmissao(msal, corpo);
      }
      if (tipo === 'venda') return id ? atualizarVenda(msal, id, corpo) : criarVenda(msal, corpo);
      return id ? atualizarComprador(msal, id, corpo) : criarComprador(msal, corpo);
    },
    onSuccess: (_resposta, variaveis) => {
      recarregar();
      toast.success(variaveis.id ? 'Registro atualizado.' : 'Registro criado.');
      fecharPainel();
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível salvar o registro.'),
  });

  const remover = useMutation({
    mutationFn: async ({ tipo, id }) =>
      tipo === 'emissao' ? removerEmissao(msal, id) : removerVenda(msal, id),
    onSuccess: () => {
      recarregar();
      toast.success('Registro removido.');
      fecharPainel();
    },
    onError: (erro) => toast.error(erro?.message || 'Não foi possível remover o registro.'),
  });

  const enviar = () => {
    const tipo = painel?.tipo;
    const id = painel?.registro?.id ?? null;
    let corpo;
    try {
      if (tipo === 'emissao') corpo = payloadEmissao(form, Boolean(id));
      else if (tipo === 'venda') corpo = payloadVenda(form, Boolean(id));
      else corpo = payloadComprador(form, Boolean(id), painel?.registro?.nome_mascarado === true);
    } catch (erro) {
      toast.error(erro?.message || 'Revise os campos do formulário.');
      return;
    }

    salvar.mutate({ tipo, id, corpo });
  };

  const confirmarRemocao = () => {
    const tipo = painel?.tipo;
    const id = painel?.registro?.id;
    if (!id || (tipo !== 'emissao' && tipo !== 'venda')) return;
    remover.mutate({ tipo, id });
  };

  /* ===== Colunas ========================================================== */

  const colunasEstoque = [
    {
      chave: 'projeto_nome',
      titulo: 'Projeto e safra',
      larguraMinima: 240,
      render: (linha) => (
        <div className="min-w-0">
          <span className="font-semibold text-[#1A2B1F] break-words">{linha.projeto_nome}</span>
          <span className="block text-[11px] text-[#5C7060] tabular-nums">
            Vintage {linha.vintage}
            {linha.projeto_registro_id ? ` - ${linha.projeto_registro_id}` : ''}
          </span>
        </div>
      ),
    },
    {
      chave: 'emitido_tco2e',
      titulo: 'Emitido',
      numerica: true,
      larguraMinima: 130,
      render: (linha) => (
        <span>
          {fmtVolume(linha.emitido_tco2e)}
          {/* O buffer aparece SOB o emitido, e não numa coluna própria, porque ele está
              dentro dele: uma coluna ao lado convidaria a somar os dois. */}
          <span className="block text-[10px] uppercase tracking-wider text-[#8A9990]">
            {fmtVolume(linha.buffer_tco2e)} em buffer
          </span>
        </span>
      ),
    },
    {
      chave: 'vendavel_tco2e',
      titulo: 'Vendável',
      numerica: true,
      larguraMinima: 120,
      render: (linha) => fmtVolume(linha.vendavel_tco2e),
    },
    {
      chave: 'vendido_tco2e',
      titulo: 'Vendido',
      numerica: true,
      larguraMinima: 130,
      render: (linha) => (
        <span>
          {fmtVolume(linha.vendido_tco2e)}
          <span className="block text-[10px] uppercase tracking-wider text-[#8A9990]">
            {fmtPct(linha.vendido_pct)} do vendável
          </span>
        </span>
      ),
    },
    {
      chave: 'aposentado_tco2e',
      titulo: 'Aposentado',
      numerica: true,
      larguraMinima: 120,
      render: (linha) =>
        Number(linha.aposentado_tco2e) > 0 ? fmtVolume(linha.aposentado_tco2e) : vazio,
    },
    {
      chave: 'disponivel_tco2e',
      titulo: 'Disponível',
      numerica: true,
      larguraMinima: 130,
      render: (linha) => (
        <span
          className={Number(linha.disponivel_tco2e) < 0 ? 'font-semibold text-[#A3231C]' : ''}
        >
          {fmtVolume(linha.disponivel_tco2e)}
        </span>
      ),
    },
    {
      chave: 'receita',
      titulo: 'Receita',
      larguraMinima: 190,
      render: (linha) => (
        <Receita
          receita={{
            BRL: linha.receita_brl,
            USD: linha.receita_usd,
            EUR: linha.receita_eur,
          }}
          className="text-xs"
        />
      ),
    },
    {
      chave: 'conciliacao',
      titulo: 'Conciliação',
      larguraMinima: 190,
      render: (linha) => <SelosDaLinha linha={linha} />,
    },
  ];

  const colunasEmissoes = [
    {
      chave: 'projeto_nome',
      titulo: 'Projeto e safra',
      larguraMinima: 230,
      render: (linha) => (
        <div className="min-w-0">
          <span className="font-semibold text-[#1A2B1F] break-words">{linha.projeto_nome}</span>
          <span className="block text-[11px] text-[#5C7060] tabular-nums">
            Vintage {linha.vintage} - emitido em {fmtData(linha.data_emissao)}
          </span>
        </div>
      ),
    },
    {
      chave: 'quantidade_tco2e',
      titulo: 'Emitido',
      numerica: true,
      larguraMinima: 120,
      render: (linha) => fmtVolume(linha.quantidade_tco2e),
    },
    {
      chave: 'buffer_tco2e',
      titulo: 'Buffer',
      numerica: true,
      larguraMinima: 110,
      render: (linha) => (Number(linha.buffer_tco2e) > 0 ? fmtVolume(linha.buffer_tco2e) : vazio),
    },
    {
      chave: 'vendavel_tco2e',
      titulo: 'Vendável',
      numerica: true,
      larguraMinima: 120,
      render: (linha) => fmtVolume(linha.vendavel_tco2e),
    },
    {
      chave: 'serial_inicio',
      titulo: 'Faixa de serial',
      larguraMinima: 230,
      render: (linha) =>
        linha.serial_inicio ? (
          <span className="font-mono text-[11px] text-[#5C7060] break-all">
            {linha.serial_inicio} a {linha.serial_fim}
          </span>
        ) : (
          <Badge tom="neutro" tamanho="sm">
            Sem serial
          </Badge>
        ),
    },
  ];

  const colunasVendas = [
    {
      chave: 'comprador_nome',
      titulo: 'Comprador',
      larguraMinima: 230,
      render: (linha) => (
        <div className="min-w-0">
          <NomeComprador
            nome={linha.comprador_nome}
            mascarado={linha.comprador_nome_mascarado}
          />
          <span className="block text-[11px] text-[#5C7060]">
            {linha.comprador_pais || 'País não informado'}
          </span>
        </div>
      ),
    },
    {
      chave: 'projeto_nome',
      titulo: 'Projeto e safra',
      larguraMinima: 210,
      render: (linha) => (
        <div className="min-w-0">
          <span className="text-[#1A2B1F] break-words">{linha.projeto_nome}</span>
          <span className="block text-[11px] text-[#5C7060] tabular-nums">
            Vintage {linha.vintage}
          </span>
        </div>
      ),
    },
    {
      chave: 'quantidade_tco2e',
      titulo: 'Volume',
      numerica: true,
      larguraMinima: 120,
      render: (linha) => fmtVolume(linha.quantidade_tco2e),
    },
    {
      chave: 'valor_total',
      titulo: 'Valor',
      numerica: true,
      larguraMinima: 150,
      render: (linha) =>
        linha.preco_unitario === null || linha.preco_unitario === undefined ? (
          <Badge tom="neutro" tamanho="sm">
            Sem preço
          </Badge>
        ) : (
          <span>
            {fmtMoeda(linha.valor_total, linha.moeda)}
            <span className="block text-[10px] uppercase tracking-wider text-[#8A9990]">
              {fmtMoeda(linha.preco_unitario, linha.moeda)} por tCO2e
            </span>
          </span>
        ),
    },
    {
      chave: 'data',
      titulo: 'Data',
      larguraMinima: 110,
      render: (linha) => <span className="tabular-nums">{fmtData(linha.data)}</span>,
    },
    {
      chave: 'situacao',
      titulo: 'Situação',
      larguraMinima: 200,
      render: (linha) => (
        <div className="flex flex-wrap gap-1">
          {linha.aposentado && (
            <Badge tom="verde" tamanho="sm">
              Aposentado
            </Badge>
          )}
          {linha.ajuste_pendente ? (
            <Badge tom="ambar" tamanho="sm" icone={Globe2}>
              Ajuste pendente
            </Badge>
          ) : linha.venda_internacional ? (
            <Badge tom="azul" tamanho="sm" icone={Globe2}>
              Internacional
            </Badge>
          ) : null}
          {!linha.aposentado && !linha.venda_internacional && vazio}
        </div>
      ),
    },
  ];

  const colunasCompradores = [
    {
      chave: 'nome',
      titulo: 'Comprador',
      larguraMinima: 250,
      render: (linha) => (
        <div className="min-w-0">
          <NomeComprador nome={linha.nome} mascarado={linha.nome_mascarado} />
          <span className="block text-[11px] text-[#5C7060]">
            {linha.pais || 'País não informado'}
            {linha.ativo === false ? ' - cadastro inativo' : ''}
          </span>
        </div>
      ),
    },
    {
      chave: 'status',
      titulo: 'Estágio',
      larguraMinima: 140,
      render: (linha) => {
        const visual = STATUS_COMPRADOR[linha.status];
        return <Badge tom={visual?.tom ?? 'neutro'}>{visual?.rotulo || linha.status}</Badge>;
      },
    },
    {
      chave: 'vendas',
      titulo: 'Vendas',
      numerica: true,
      larguraMinima: 110,
      render: (linha) =>
        Number(linha.vendas) > 0 ? (
          <span>
            {linha.vendas}
            <span className="block text-[10px] uppercase tracking-wider text-[#8A9990]">
              {linha.projetos} {Number(linha.projetos) === 1 ? 'projeto' : 'projetos'}
            </span>
          </span>
        ) : (
          vazio
        ),
    },
    {
      chave: 'volume_tco2e',
      titulo: 'Volume',
      numerica: true,
      larguraMinima: 130,
      render: (linha) =>
        Number(linha.volume_tco2e) > 0 ? fmtVolume(linha.volume_tco2e) : vazio,
    },
    {
      chave: 'receita',
      titulo: 'Receita',
      larguraMinima: 190,
      render: (linha) => (
        <Receita
          receita={{ BRL: linha.receita_brl, USD: linha.receita_usd, EUR: linha.receita_eur }}
          className="text-xs"
        />
      ),
    },
    {
      chave: 'vendas_ajuste_pendente',
      titulo: 'Pendências',
      larguraMinima: 170,
      render: (linha) => {
        const selos = [];
        if (Number(linha.vendas_ajuste_pendente) > 0) {
          selos.push(
            <Badge key="ajuste" tom="ambar" tamanho="sm">
              {linha.vendas_ajuste_pendente} sem ajuste
            </Badge>
          );
        }
        if (Number(linha.vendas_sem_preco) > 0) {
          selos.push(
            <Badge key="preco" tom="neutro" tamanho="sm">
              {linha.vendas_sem_preco} sem preço
            </Badge>
          );
        }
        if (!linha.tem_email) {
          selos.push(
            <Badge key="email" tom="neutro" tamanho="sm">
              Sem contato
            </Badge>
          );
        }
        return selos.length ? <div className="flex flex-wrap gap-1">{selos}</div> : vazio;
      },
    },
  ];

  /* ===== Render =========================================================== */

  const tituloPainel = {
    emissao: painel?.registro ? 'Editar emissão' : 'Registrar emissão',
    venda: painel?.registro ? 'Editar venda' : 'Registrar venda',
    comprador: painel?.registro ? 'Editar comprador' : 'Novo comprador',
  }[painel?.tipo ?? 'emissao'];

  const podeRemover = painel?.registro && (painel.tipo === 'emissao' || painel.tipo === 'venda');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* O título da página fica na topbar do Layout: nenhuma tela renderiza h1. */}
      <CabecalhoSecao
        titulo="Crédito de carbono"
        descricao="Emissão, estoque por safra e comercialização. A receita é sempre apresentada por moeda."
        acao={
          <div className="flex flex-wrap gap-2">
            <BotaoSecundario icone={Plus} onClick={() => abrir('emissao')}>
              Emissão
            </BotaoSecundario>
            <BotaoPrimario icone={Plus} onClick={() => abrir('venda')}>
              Venda
            </BotaoPrimario>
          </div>
        }
      />

      {MODO_DEMO && MODO_DEMO_ATIVO() && (
        <AvisoDiscreto tom="ambar">
          Modo demonstração: compradores, emissões e vendas abaixo são fictícios e as
          alterações não são gravadas. Em produção esta tela abre vazia, porque ainda não
          há emissão nem venda registrada.
        </AvisoDiscreto>
      )}

      <Conciliacao conciliacao={conciliacao} />

      <div className="flex flex-wrap gap-2">
        {ABAS.map((item) => {
          const Icone = item.icone;
          const ativa = item.chave === aba;
          return (
            <button
              key={item.chave}
              type="button"
              onClick={() => setAba(item.chave)}
              aria-pressed={ativa}
              className={[
                'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm border transition-colors',
                ativa
                  ? 'bg-[#F47920] text-white border-[#F47920] shadow-sm'
                  : 'bg-white text-[#5C7060] border-[#DDE3DE] hover:border-[#F47920]/50',
              ].join(' ')}
            >
              <Icone className="w-4 h-4" />
              {item.rotulo}
            </button>
          );
        })}
      </div>

      <Cartao icone={Coins} titulo="Filtros" nivelTitulo={3}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Campo
            rotulo="Projeto"
            tipo="select"
            opcoes={projetos.map((p) => ({ valor: p.id, rotulo: p.nome }))}
            rotuloVazio="Todos os projetos"
            valor={filtros.projeto_id}
            onChange={(valor) => setFiltros((atual) => ({ ...atual, projeto_id: valor }))}
          />
          <Campo
            rotulo="Vintage"
            tipo="numero"
            valor={filtros.vintage}
            onChange={(valor) => setFiltros((atual) => ({ ...atual, vintage: valor }))}
            placeholder="Todas as safras"
            extras={{ min: 1990, max: 2100 }}
          />
          {aba === 'vendas' ? (
            <Campo
              rotulo="Situação da venda"
              tipo="select"
              opcoes={OPCOES_SITUACAO_VENDA}
              rotuloVazio="Todas"
              valor={filtros.situacao}
              onChange={(valor) => setFiltros((atual) => ({ ...atual, situacao: valor }))}
            />
          ) : (
            <Campo
              rotulo="Conciliação"
              tipo="select"
              opcoes={OPCOES_ALERTA}
              rotuloVazio="Todas as linhas"
              valor={filtros.alerta}
              onChange={(valor) => setFiltros((atual) => ({ ...atual, alerta: valor }))}
              desabilitado={aba === 'compradores'}
            />
          )}
        </div>
      </Cartao>

      {aba === 'estoque' && (
        <>
          {estoqueTruncado && (
            <AvisoDiscreto tom="ambar" titulo="A lista está cortada.">
              Mostrando {estoque.length} de {estoqueQuery.data.total} linhas. Filtre por projeto
              ou safra para ver o restante: os totais abaixo são do recorte exibido, não do
              estoque inteiro.
            </AvisoDiscreto>
          )}

          <Tabela
            legenda="Estoque de crédito por projeto e safra"
            colunas={colunasEstoque}
            dados={estoque}
            carregando={estoqueQuery.isLoading}
            rotuloCarregando="Carregando o estoque de crédito"
            erro={estoqueQuery.isError}
            iconeVazio={Layers}
            tituloVazio="Nenhuma safra com estoque ainda"
            /* Estado vazio que EXPLICA, e não que constata. Quem abrir esta tela hoje
               não faz ideia do que ela mostra quando houver dado, e a alternativa
               ("Nenhum registro") transformaria a tela num beco. */
            textoVazio="Cada linha aqui é um projeto e uma safra (vintage), com quanto foi emitido, quanto ficou retido em buffer, quanto já foi vendido e quanto sobra disponível. A primeira linha aparece assim que uma emissão for registrada - ou assim que uma venda a termo for lançada para uma safra que ainda nem foi emitida."
            acaoVazio={
              <BotaoPrimario icone={Plus} onClick={() => abrir('emissao')}>
                Registrar a primeira emissão
              </BotaoPrimario>
            }
            classeLinha={(linha) => (linha.projeto_ativo === false ? 'opacity-60' : '')}
          />

          <Cartao
            icone={Leaf}
            titulo="Emissões registradas"
            subtitulo="Cada rodada de verificação emite separadamente, com faixa de serial própria."
            nivelTitulo={3}
            semPaddingCorpo
            acao={
              <BotaoSecundario icone={Plus} tamanho="sm" onClick={() => abrir('emissao')}>
                Nova emissão
              </BotaoSecundario>
            }
          >
            <Tabela
              legenda="Eventos de emissão de crédito no registro"
              colunas={colunasEmissoes}
              dados={emissoes}
              carregando={emissoesQuery.isLoading}
              rotuloCarregando="Carregando as emissões"
              erro={emissoesQuery.isError}
              iconeVazio={Leaf}
              tituloVazio="Nenhuma emissão registrada"
              textoVazio="A emissão é o que entra no estoque: o volume que o registro creditou àquela safra, com a faixa de serial que permite conciliar com o extrato. Sem ela, a conta de disponível não tem de onde partir."
              acaoVazio={
                <BotaoPrimario icone={Plus} onClick={() => abrir('emissao')}>
                  Registrar emissão
                </BotaoPrimario>
              }
              onLinhaClick={(linha) => abrir('emissao', linha)}
              rotuloLinha={(linha) => `Editar a emissão de ${linha.vintage}`}
              comSuperficie={false}
            />
          </Cartao>
        </>
      )}

      {aba === 'vendas' && (
        <>
          <Tabela
            legenda="Vendas de crédito de carbono"
            colunas={colunasVendas}
            dados={vendas}
            carregando={vendasQuery.isLoading}
            rotuloCarregando="Carregando as vendas"
            erro={vendasQuery.isError}
            iconeVazio={Handshake}
            tituloVazio="Nenhuma venda registrada"
            textoVazio="A venda é o que sai do estoque: comprador, safra, volume e preço na moeda do contrato. É daqui que sai a resposta que hoje ninguém consegue dar - quanto do crédito emitido já foi comercializado."
            acaoVazio={
              <BotaoPrimario icone={Plus} onClick={() => abrir('venda')}>
                Registrar venda
              </BotaoPrimario>
            }
            onLinhaClick={(linha) => abrir('venda', linha)}
            rotuloLinha={(linha) => `Editar a venda de ${fmtVolume(linha.quantidade_tco2e)} tCO2e`}
          />

          {resumoVendas && resumoVendas.total > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Numero
                rotulo="Vendas"
                valor={String(resumoVendas.total)}
                detalhe={`${resumoVendas.aposentadas} já aposentadas`}
              />
              <Numero
                rotulo="Volume vendido"
                valor={fmtVolume(resumoVendas.volume_tco2e)}
                detalhe={`${fmtVolume(resumoVendas.aposentado_tco2e)} tCO2e aposentados`}
              />
              <Numero
                rotulo="Sem preço"
                valor={String(resumoVendas.sem_preco)}
                detalhe="valor sob confidencialidade ou em negociação"
              />
              <Numero
                rotulo="Ajuste pendente"
                valor={String(resumoVendas.ajuste_pendente)}
                detalhe={`de ${resumoVendas.internacionais} vendas internacionais`}
                alerta={resumoVendas.ajuste_pendente > 0}
              />
            </div>
          )}

          {resumoVendas && resumoVendas.ajuste_pendente > 0 && (
            <AvisoDiscreto tom="ambar" icone={Globe2} titulo="Ajuste correspondente pendente.">
              Venda para comprador de país diferente do país do projeto levanta a questão do
              ajuste correspondente sob o Artigo 6 do Acordo de Paris. Comprador sem país
              cadastrado não entra nesta conta: nesse caso o que falta é o país.
            </AvisoDiscreto>
          )}
        </>
      )}

      {aba === 'compradores' && (
        <>
          <CabecalhoSecao
            titulo="Compradores"
            nivel={3}
            descricao={
              resumoCompradores
                ? `${resumoCompradores.total} cadastrados, ${resumoCompradores.com_venda} com venda registrada`
                : undefined
            }
            acao={
              <BotaoSecundario icone={Plus} tamanho="sm" onClick={() => abrir('comprador')}>
                Novo comprador
              </BotaoSecundario>
            }
          />

          <Tabela
            legenda="Compradores de crédito, com volume e receita por moeda"
            colunas={colunasCompradores}
            dados={compradores}
            carregando={compradoresQuery.isLoading}
            rotuloCarregando="Carregando os compradores"
            erro={compradoresQuery.isError}
            iconeVazio={Users}
            tituloVazio="Nenhum comprador cadastrado"
            textoVazio="O comprador é a ponta comercial do sistema: todo o resto trata de produzir e certificar o crédito. Cada venda registrada aqui alimenta o volume, a receita por moeda e a cobrança do ajuste correspondente."
            acaoVazio={
              <BotaoPrimario icone={Plus} onClick={() => abrir('comprador')}>
                Cadastrar comprador
              </BotaoPrimario>
            }
            onLinhaClick={(linha) => abrir('comprador', linha)}
            rotuloLinha={(linha) => `Editar ${linha.nome}`}
            classeLinha={(linha) => (linha.ativo === false ? 'opacity-60' : '')}
          />

          {/* O filtro de projeto e safra continua na tela, mas NÃO vale aqui, e dizer
              isso é melhor do que sumir com os controles: os agregados por comprador
              vêm de uma view que soma as vendas dele na operação inteira, e recortá-los
              por projeto daria um painel que soma um conjunto e lista outro. */}
          <p className="text-[11px] text-[#8A9990] px-1">
            Volume e receita de cada comprador cobrem todas as vendas dele, em todos os
            projetos e safras: os filtros de projeto e vintage acima valem para o estoque e
            para as vendas, não para esta lista.
          </p>

          {Number(resumoCompradores?.sigilosos) > 0 && (
            <AvisoDiscreto icone={Lock} tom="azul" titulo="Compradores sob acordo de confidencialidade.">
              {resumoCompradores.sigilosos}{' '}
              {resumoCompradores.sigilosos === 1 ? 'cadastro tem' : 'cadastros têm'} a razão
              social restrita. Quem decide o que aparece é o servidor, pelo seu perfil: para
              quem não é administrador, o nome e o e-mail não saem do banco, a busca por nome
              não alcança esses cadastros e eles vão para o fim da lista. O país continua
              visível de propósito, porque é dele que depende a regra do ajuste
              correspondente.
            </AvisoDiscreto>
          )}
        </>
      )}

      <PainelLateral
        aberto={Boolean(painel)}
        onFechar={fecharPainel}
        icone={painel?.tipo === 'comprador' ? Users : painel?.tipo === 'venda' ? Handshake : Leaf}
        titulo={tituloPainel}
        subtitulo={
          painel?.tipo === 'emissao'
            ? 'O buffer faz parte do volume emitido, não é um valor à parte.'
            : painel?.tipo === 'venda'
              ? 'Vender safra ainda não emitida é venda a termo, e é aceito.'
              : 'Pessoa jurídica. Nenhum dado pessoal neste cadastro.'
        }
        largura="lg"
        fecharAoClicarFora={false}
        rodape={
          <div className="flex items-center justify-between gap-2">
            {podeRemover ? (
              <BotaoSecundario
                variante="perigo"
                icone={Trash2}
                onClick={confirmarRemocao}
                carregando={remover.isPending}
              >
                Remover
              </BotaoSecundario>
            ) : (
              <BotaoSecundario variante="fantasma" onClick={fecharPainel}>
                Cancelar
              </BotaoSecundario>
            )}
            <BotaoPrimario
              icone={painel?.registro ? Pencil : Plus}
              onClick={enviar}
              carregando={salvar.isPending}
            >
              {painel?.registro ? 'Salvar alterações' : 'Registrar'}
            </BotaoPrimario>
          </div>
        }
      >
        {painel?.tipo === 'emissao' && (
          <FormularioEmissao
            form={form}
            setForm={setForm}
            projetos={projetos}
            editando={Boolean(painel?.registro)}
          />
        )}
        {painel?.tipo === 'venda' && (
          <FormularioVenda
            form={form}
            setForm={setForm}
            projetos={projetos}
            compradores={compradores}
            editando={Boolean(painel?.registro)}
          />
        )}
        {painel?.tipo === 'comprador' && (
          <div className="space-y-5">
            <FormularioComprador
              form={form}
              setForm={setForm}
              bloqueadoPorSigilo={painel?.registro?.nome_mascarado === true}
            />

            {compradorAberto && (
              <div>
                <CabecalhoSecao
                  titulo="Vendas deste comprador"
                  nivel={3}
                  descricao={
                    compradorQuery.data?.vendas?.length
                      ? `${compradorQuery.data.vendas.length} ${
                          compradorQuery.data.vendas.length === 1 ? 'transação' : 'transações'
                        }`
                      : undefined
                  }
                />
                <div className="mt-3 space-y-2">
                  {compradorQuery.isLoading && (
                    <p className="text-xs text-[#8A9990]">Carregando as vendas do comprador...</p>
                  )}
                  {compradorQuery.isError && (
                    <AvisoDiscreto texto="Não foi possível carregar as vendas deste comprador agora. Se o aviso continuar, avise a equipe responsável pelo sistema." />
                  )}
                  {compradorQuery.data?.vendas?.length === 0 && (
                    <p className="text-xs text-[#8A9990] leading-relaxed">
                      Nenhuma venda registrada para este comprador. Enquanto não houver, ele
                      conta como relacionamento em aberto e não entra na receita.
                    </p>
                  )}
                  {(compradorQuery.data?.vendas ?? []).map((linha) => (
                    <div key={linha.id} className="border border-[#DDE3DE] rounded-xl px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-[#1A2B1F] break-words min-w-0">
                          {linha.projeto_nome} - vintage {linha.vintage}
                        </p>
                        <span className="text-[11px] text-[#8A9990] tabular-nums flex-shrink-0">
                          {fmtData(linha.data)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[11px] text-[#5C7060] tabular-nums">
                        <span>{fmtVolume(linha.quantidade_tco2e)} tCO2e</span>
                        <span>
                          {linha.preco_unitario === null || linha.preco_unitario === undefined
                            ? 'Sem preço informado'
                            : fmtMoeda(linha.valor_total, linha.moeda)}
                        </span>
                        {linha.aposentado && <span>Aposentado</span>}
                        {linha.ajuste_pendente && (
                          <span className="font-semibold text-[#8A5A12]">Ajuste pendente</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </PainelLateral>

      <p className="flex items-start gap-2 text-[11px] text-[#8A9990] px-1">
        <ArrowRight size={12} className="flex-shrink-0 mt-0.5" />
        Disponível é o emitido menos o buffer menos o vendido. O crédito aposentado não é
        descontado outra vez: ele é parte do que já foi vendido, e subtrair os dois
        contaria a mesma tonelada duas vezes.
      </p>
    </div>
  );
}

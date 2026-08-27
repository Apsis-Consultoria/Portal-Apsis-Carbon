// -----------------------------------------------------------------------------
// Rotas dos questionarios de campo.
// -----------------------------------------------------------------------------
// GET    carbon-api/questionarios/modelos      -> { modelos }
// GET    carbon-api/questionarios              -> { questionarios, total, pagina, pode_escrever }
// GET    carbon-api/questionarios/:id          -> { questionario, modelo }
// POST   carbon-api/questionarios              -> { questionario }
// PATCH  carbon-api/questionarios/:id          -> { questionario }
// DELETE carbon-api/questionarios/:id          -> { removido }
//
// Objetos SQL de que este modulo depende (20260827090000_questionarios.sql):
//   public.carbon_questionario_modelos
//   public.carbon_questionarios
//
// -----------------------------------------------------------------------------
// A VALIDACAO ACONTECE CONTRA A DEFINICAO, E ISSO E O PONTO DO ARQUIVO
// -----------------------------------------------------------------------------
// As respostas chegam como um objeto livre. Gravar isso sem conferir faria o
// jsonb virar deposito: chave com erro de digitacao entra calada, opcao que nao
// existe entra calada, e a tela depois mostra campo vazio sem ninguem entender
// por que. Entao toda escrita carrega a definicao do modelo e confere, pergunta
// por pergunta:
//   - a chave existe no formulario;
//   - o tipo do valor bate (numero e numero, data e data, escolha e uma das
//     opcoes declaradas, multipla e uma lista de opcoes declaradas);
//   - pergunta marcada obrigatoria tem valor quando o questionario e concluido.
//
// POR QUE OBRIGATORIA SO VALE NA CONCLUSAO. O formulario e longo e aplicado em
// campo, muitas vezes sem sinal e com a pessoa entrevistada esperando. Recusar o
// rascunho por causa de um campo em branco faria perder o resto do preenchimento,
// que e o defeito mais caro que esta tela pode ter. Rascunho aceita incompleto;
// concluir exige.
//
// -----------------------------------------------------------------------------
// LGPD
// -----------------------------------------------------------------------------
// Nenhuma rota daqui aceita nome de pessoa. `autor_id` sai do registro do
// chamador, nunca do corpo - quem preenche e quem esta logado, e mandar autor no
// corpo seria poder assinar em nome de outro. O entrevistado entra por
// `entrevistado_funcao`, um enum fechado.
//
// O gatilho carbon_questionarios_sem_dado_pessoal e a rede embaixo: se uma chave
// de resposta contiver nome, contato, telefone, email, cpf, rg ou assinatura, ou
// se o valor tiver cara de e-mail ou CPF, o banco recusa. A validacao daqui
// devolve isso como 400 com mensagem util, em vez de 500.
// -----------------------------------------------------------------------------

import { respostaJson } from '../../_shared/cors.ts';
import type { Contexto, Rota } from './tipos.ts';
import {
  ErroRota,
  type ErroBanco,
  exigir,
  lancarErroEscrita,
  lerData,
  lerEnum,
  lerNumero,
  lerTexto,
  lerUuid,
  LIMITE_TEXTO_LONGO,
  paginar,
  veioNoCorpo,
} from './helpers.ts';
import { lerProjetoVisivel } from './projetos.ts';
import { podeEscrever } from './acesso.ts';

const COLUNAS =
  'id, modelo_id, modelo_versao, projeto_id, aldeia, data_referencia, autor_id, ' +
  'entrevistado_funcao, latitude, longitude, altitude_m, precisao_m, respostas, ' +
  'status, observacoes, criado_em, atualizado_em';

const FUNCOES = new Set([
  'cacique',
  'vice_cacique',
  'koxoa',
  'membro_comunidade',
  'agente_saude',
  'professor',
  'equipe_apsis',
  'outro',
]);

const STATUS = new Set(['rascunho', 'concluido']);

/* Mesma expressao do gatilho do banco. Existe nos dois lugares de proposito: o
   banco e a garantia, e esta copia e o que transforma "500 erro_interno" numa
   mensagem que diz o que fazer. Se divergirem, quem manda e o banco. */
const CHAVE_PESSOAL = /(^|_)(nome|contato|telefone|email|cpf|rg|assinatura)($|_)/;

type Pergunta = {
  chave: string;
  rotulo: string;
  tipo: string;
  obrigatoria?: boolean;
  opcoes?: { valor: string; rotulo: string }[];
};

type Modelo = {
  id: string;
  chave: string;
  nome: string;
  versao: number;
  definicao: { secoes: { chave?: string; titulo: string; perguntas: Pergunta[] }[] };
};

/** Achata a definicao num mapa chave -> pergunta, que e como a validacao consulta. */
function perguntasDe(modelo: Modelo): Map<string, Pergunta> {
  const mapa = new Map<string, Pergunta>();
  for (const secao of modelo.definicao?.secoes ?? []) {
    for (const p of secao.perguntas ?? []) mapa.set(p.chave, p);
  }
  return mapa;
}

async function lerModelo(ctx: Contexto, id: string): Promise<Modelo> {
  const { data, error } = await ctx.admin
    .from('carbon_questionario_modelos')
    .select('id, chave, nome, versao, definicao, ativo')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('questionarios: falha ao ler modelo', error);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) throw new ErroRota('modelo_nao_encontrado', 404, 'modelo_id');
  if ((data as { ativo: boolean }).ativo === false) {
    throw new ErroRota('modelo_inativo', 400, 'modelo_id');
  }
  return data as unknown as Modelo;
}

/**
 * Confere as respostas contra a definicao e devolve o objeto normalizado.
 *
 * EXPORTADA para o teste. E funcao pura - nao toca em banco, nao le contexto - e
 * e a peca que decide se uma resposta entra ou e recusada. Testar por fora, pela
 * rota, exigiria montar Contexto e duble de client para provar coisa que se
 * prova chamando a funcao.
 *
 * Devolve um objeto NOVO em vez de validar no lugar: assim o que vai para o
 * banco e exatamente o que passou pela conferencia, e nao o corpo cru com
 * algum campo extra que escapou.
 */
export function validarRespostas(
  bruto: unknown,
  modelo: Modelo,
  concluindo: boolean,
): Record<string, unknown> {
  if (bruto === null || bruto === undefined) return {};
  if (typeof bruto !== 'object' || Array.isArray(bruto)) {
    throw new ErroRota('campo_invalido', 400, 'respostas');
  }

  const perguntas = perguntasDe(modelo);
  const entrada = bruto as Record<string, unknown>;
  const saida: Record<string, unknown> = {};

  for (const [chave, valor] of Object.entries(entrada)) {
    if (CHAVE_PESSOAL.test(chave)) {
      throw new ErroRota('resposta_com_dado_pessoal', 400, chave);
    }

    const pergunta = perguntas.get(chave);
    // Chave desconhecida e recusada, e nao ignorada: ignorar faria o
    // preenchimento sumir sem aviso, e quem preencheu acharia que salvou.
    if (!pergunta) throw new ErroRota('pergunta_desconhecida', 400, chave);

    if (valor === null || valor === undefined || valor === '') continue;

    switch (pergunta.tipo) {
      case 'texto':
        saida[chave] = lerTexto(valor, chave);
        break;

      case 'texto_longo':
        saida[chave] = lerTexto(valor, chave, LIMITE_TEXTO_LONGO);
        break;

      case 'numero':
        saida[chave] = lerNumero(valor, chave);
        break;

      case 'inteiro': {
        const n = lerNumero(valor, chave);
        if (n !== null && !Number.isInteger(n)) throw new ErroRota('campo_invalido', 400, chave);
        saida[chave] = n;
        break;
      }

      case 'data':
        saida[chave] = lerData(valor, chave);
        break;

      case 'sim_nao':
      case 'escolha': {
        const aceitos = new Set((pergunta.opcoes ?? []).map((o) => o.valor));
        saida[chave] = lerEnum(valor, aceitos, 'opcao_invalida', chave);
        break;
      }

      case 'multipla': {
        if (!Array.isArray(valor)) throw new ErroRota('campo_invalido', 400, chave);
        const aceitos = new Set((pergunta.opcoes ?? []).map((o) => o.valor));
        const lista: string[] = [];
        for (const item of valor) {
          const v = lerEnum(item, aceitos, 'opcao_invalida', chave);
          // Repetida nao e erro do usuario, e ruido de interface: some.
          if (v !== null && !lista.includes(v)) lista.push(v);
        }
        saida[chave] = lista;
        break;
      }

      case 'coordenada': {
        if (typeof valor !== 'object' || valor === null) {
          throw new ErroRota('campo_invalido', 400, chave);
        }
        const c = valor as Record<string, unknown>;
        saida[chave] = {
          latitude: lerNumero(c.latitude, chave),
          longitude: lerNumero(c.longitude, chave),
        };
        break;
      }

      case 'arquivo':
        // Ainda nao existe bucket de storage neste projeto. O campo aceita a
        // anotacao textual de que o registro foi feito fora do sistema, para a
        // pergunta nao sumir do formulario enquanto o upload nao existe.
        saida[chave] = lerTexto(valor, chave, LIMITE_TEXTO_LONGO);
        break;

      default:
        throw new ErroRota('campo_invalido', 400, chave);
    }
  }

  if (concluindo) {
    for (const [chave, pergunta] of perguntas) {
      const v = saida[chave];
      const vazio = v === null || v === undefined || v === '' ||
        (Array.isArray(v) && v.length === 0);
      if (pergunta.obrigatoria && vazio) {
        throw new ErroRota('campo_obrigatorio', 400, chave);
      }
    }
  }

  return saida;
}

/**
 * Le o questionario conferindo que o chamador enxerga o projeto dele.
 *
 * Questionario sem projeto (o formulario da ronda pode nascer assim) e visivel
 * para qualquer usuario ativo: nao ha projeto que restrinja, e esconder de todos
 * tornaria o registro inalcancavel.
 */
async function lerQuestionarioVisivel(
  ctx: Contexto,
  id: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await ctx.admin
    .from('carbon_questionarios')
    .select(COLUNAS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('questionarios: falha ao ler', error);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) throw new ErroRota('nao_encontrado', 404);

  /* `as unknown as` e nao `as` direto: com a lista de colunas em string, o tipo
     que o supabase-js infere para `data` inclui GenericStringError, e o
     compilador recusa a conversao direta (TS2352). Nao e cast preguicoso - a
     forma real e conhecida, e a alternativa seria tipar o client inteiro. Mesmo
     padrao dos outros modulos de rota deste diretorio. */
  const linha = data as unknown as Record<string, unknown>;

  const projetoId = linha.projeto_id;
  if (projetoId && !(await lerProjetoVisivel(ctx, String(projetoId)))) {
    // 404 e nao 403, para a rota nao virar oraculo de existencia.
    throw new ErroRota('nao_encontrado', 404);
  }
  return linha;
}

/* ===== Handlers =========================================================== */

async function listarModelos(ctx: Contexto): Promise<Response> {
  const { data, error } = await ctx.admin
    .from('carbon_questionario_modelos')
    .select('id, chave, nome, descricao, origem, versao, definicao')
    .eq('ativo', true)
    .order('nome');

  if (error) {
    console.error('questionarios: falha ao listar modelos', error);
    throw new ErroRota('erro_interno', 500);
  }
  return respostaJson({ modelos: data ?? [] });
}

async function listar(ctx: Contexto): Promise<Response> {
  const { limite, deslocamento, pagina } = paginar(ctx.url);

  let consulta = ctx.admin
    .from('carbon_questionarios')
    .select(COLUNAS, { count: 'exact' })
    .order('data_referencia', { ascending: false, nullsFirst: false })
    .order('criado_em', { ascending: false })
    .range(deslocamento, deslocamento + limite - 1);

  const chaveModelo = ctx.url.searchParams.get('modelo');
  if (chaveModelo) {
    const { data: modelo } = await ctx.admin
      .from('carbon_questionario_modelos')
      .select('id')
      .eq('chave', chaveModelo)
      .maybeSingle();
    // Modelo inexistente devolve lista vazia, e nao erro: a tela filtra por
    // chave vinda da URL, e um endereco digitado errado nao e falha de sistema.
    if (!modelo) return respostaJson({ questionarios: [], total: 0, pagina, pode_escrever: podeEscrever(ctx.registro) });
    consulta = consulta.eq('modelo_id', (modelo as { id: string }).id);
  }

  const projeto = ctx.url.searchParams.get('projeto');
  if (projeto) {
    if (!(await lerProjetoVisivel(ctx, projeto))) throw new ErroRota('nao_encontrado', 404);
    consulta = consulta.eq('projeto_id', projeto);
  }

  const status = ctx.url.searchParams.get('status');
  if (status && STATUS.has(status)) consulta = consulta.eq('status', status);

  const aldeia = ctx.url.searchParams.get('aldeia');
  if (aldeia) consulta = consulta.ilike('aldeia', `%${aldeia}%`);

  const { data, error, count } = await consulta;
  if (error) {
    console.error('questionarios: falha ao listar', error);
    throw new ErroRota('erro_interno', 500);
  }

  return respostaJson({
    questionarios: data ?? [],
    total: count ?? 0,
    pagina,
    pode_escrever: podeEscrever(ctx.registro),
  });
}

async function detalhar(ctx: Contexto): Promise<Response> {
  const questionario = await lerQuestionarioVisivel(ctx, ctx.params.id);
  const modelo = await lerModelo(ctx, String(questionario.modelo_id));
  return respostaJson({
    questionario,
    modelo,
    pode_escrever: podeEscrever(ctx.registro),
  });
}

/** Campos de cabecalho comuns a criar e atualizar. */
async function lerCabecalho(
  ctx: Contexto,
  corpo: Record<string, unknown>,
  parcial: boolean,
): Promise<Record<string, unknown>> {
  const campos: Record<string, unknown> = {};
  const tocar = (nome: string) => !parcial || veioNoCorpo(corpo, nome);

  if (tocar('projeto_id')) {
    const projetoId = lerUuid(corpo.projeto_id, 'projeto_id');
    if (projetoId && !(await lerProjetoVisivel(ctx, projetoId))) {
      throw new ErroRota('nao_encontrado', 404, 'projeto_id');
    }
    campos.projeto_id = projetoId;
  }
  if (tocar('aldeia')) campos.aldeia = lerTexto(corpo.aldeia, 'aldeia');
  if (tocar('data_referencia')) campos.data_referencia = lerData(corpo.data_referencia, 'data_referencia');
  if (tocar('entrevistado_funcao')) {
    campos.entrevistado_funcao = lerEnum(
      corpo.entrevistado_funcao, FUNCOES, 'funcao_invalida', 'entrevistado_funcao',
    );
  }
  if (tocar('latitude')) campos.latitude = lerNumero(corpo.latitude, 'latitude');
  if (tocar('longitude')) campos.longitude = lerNumero(corpo.longitude, 'longitude');
  if (tocar('altitude_m')) campos.altitude_m = lerNumero(corpo.altitude_m, 'altitude_m');
  if (tocar('precisao_m')) campos.precisao_m = lerNumero(corpo.precisao_m, 'precisao_m');
  if (tocar('observacoes')) campos.observacoes = lerTexto(corpo.observacoes, 'observacoes', LIMITE_TEXTO_LONGO);

  return campos;
}

async function criar(ctx: Contexto): Promise<Response> {
  const corpo = ctx.corpo ?? {};
  exigir(corpo, ['modelo_id']);

  const modeloId = lerUuid(corpo.modelo_id, 'modelo_id');
  if (!modeloId) throw new ErroRota('campo_obrigatorio', 400, 'modelo_id');
  const modelo = await lerModelo(ctx, modeloId);

  const status = lerEnum(corpo.status, STATUS, 'status_invalido', 'status') ?? 'rascunho';
  const respostas = validarRespostas(corpo.respostas, modelo, status === 'concluido');

  const registro = {
    ...(await lerCabecalho(ctx, corpo, false)),
    modelo_id: modelo.id,
    // A versao e carimbada no momento do preenchimento: o formulario pode mudar
    // depois, e a resposta continua legivel na forma em que foi respondida.
    modelo_versao: modelo.versao,
    respostas,
    status,
    // Autoria SEMPRE do chamador, nunca do corpo: aceitar autor no corpo seria
    // deixar qualquer um assinar em nome de outro.
    autor_id: ctx.registro.id,
    criado_por: ctx.registro.id,
  };

  const { data, error } = await ctx.admin
    .from('carbon_questionarios')
    .insert(registro)
    .select(COLUNAS)
    .single();

  if (error) lancarErroEscrita(error as ErroBanco, 'questionario');
  return respostaJson({ questionario: data }, 201);
}

async function atualizar(ctx: Contexto): Promise<Response> {
  const atual = await lerQuestionarioVisivel(ctx, ctx.params.id);
  const corpo = ctx.corpo ?? {};
  const modelo = await lerModelo(ctx, String(atual.modelo_id));

  const campos = await lerCabecalho(ctx, corpo, true);

  const status = veioNoCorpo(corpo, 'status')
    ? (lerEnum(corpo.status, STATUS, 'status_invalido', 'status') ?? 'rascunho')
    : String(atual.status);
  if (veioNoCorpo(corpo, 'status')) campos.status = status;

  if (veioNoCorpo(corpo, 'respostas')) {
    campos.respostas = validarRespostas(corpo.respostas, modelo, status === 'concluido');
  } else if (status === 'concluido' && atual.status !== 'concluido') {
    // Concluir sem reenviar respostas revalida o que ja esta gravado: e aqui que
    // o campo obrigatorio em branco tem de aparecer, e nao depois.
    validarRespostas(atual.respostas, modelo, true);
  }

  if (Object.keys(campos).length === 0) return respostaJson({ questionario: atual });

  const { data, error } = await ctx.admin
    .from('carbon_questionarios')
    .update(campos)
    .eq('id', ctx.params.id)
    .select(COLUNAS)
    .single();

  if (error) lancarErroEscrita(error as ErroBanco, 'questionario');
  return respostaJson({ questionario: data });
}

async function remover(ctx: Contexto): Promise<Response> {
  const atual = await lerQuestionarioVisivel(ctx, ctx.params.id);

  /* Questionario concluido nao se apaga pela tela. Ele e registro de campo, e
     em projeto de carbono vira evidencia de consulta a comunidade - exatamente
     o tipo de documento que a VVB pede. Apagar rascunho e limpeza; apagar
     concluido e destruir evidencia, e isso nao pode ser um clique. */
  if (atual.status === 'concluido') {
    throw new ErroRota('questionario_concluido', 409, 'status');
  }

  const { error } = await ctx.admin
    .from('carbon_questionarios')
    .delete()
    .eq('id', ctx.params.id);

  if (error) lancarErroEscrita(error as ErroBanco, 'questionario');
  return respostaJson({ removido: true });
}

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'questionarios/modelos', escrita: false, handler: listarModelos },
  { metodo: 'GET', padrao: 'questionarios', escrita: false, handler: listar },
  { metodo: 'GET', padrao: 'questionarios/:id', escrita: false, handler: detalhar },
  { metodo: 'POST', padrao: 'questionarios', escrita: true, handler: criar },
  { metodo: 'PATCH', padrao: 'questionarios/:id', escrita: true, handler: atualizar },
  { metodo: 'DELETE', padrao: 'questionarios/:id', escrita: true, handler: remover },
];

export default rotas;

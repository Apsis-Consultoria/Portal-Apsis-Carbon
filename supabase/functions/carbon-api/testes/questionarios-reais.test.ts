// -----------------------------------------------------------------------------
// Preenche os QUATRO formularios de verdade e ve o que o validador recusa.
// -----------------------------------------------------------------------------
// POR QUE ESTE TESTE EXISTE, e por que ele e diferente do questionarios.test.ts.
//
// O outro arquivo testa a validacao contra um modelo INVENTADO, com cinco
// perguntas escolhidas para exercitar cada regra. Prova que a regra funciona.
// Nao prova que os formularios REAIS passam por ela - e foi exatamente ai que o
// sistema quebrou: o dono clicou em criar e tomou 400, com todo o codigo de
// validacao "correto" e testado.
//
// A causa foi um helper generico usado onde a premissa dele nao vale.
// lerNumero() recusa numero negativo, porque nasceu para colunas de area e
// quantidade, onde negativo nao significa nada. Latitude e longitude no Brasil
// sao negativas. Nenhum teste pegava isso porque nenhum teste tentava responder
// um formulario inteiro com valores plausiveis.
//
// Entao este teste faz o obvio que faltava: para cada uma das 163 perguntas dos
// quatro formularios, monta uma resposta legitima do tipo declarado e manda para
// o validador. Qualquer recusa e defeito, porque a resposta e valida por
// construcao.
//
// Ele le a MESMA fonte que gera o seed (scripts/questionarios/definicoes.mjs),
// e nao uma copia: copia envelheceria e o teste passaria a provar outra coisa.

import { assertEquals } from 'jsr:@std/assert@1';
import { ErroRota } from '../rotas/helpers.ts';
import { validarRespostas } from '../rotas/questionarios.ts';
import { QUESTIONARIOS } from '../../../../scripts/questionarios/definicoes.mjs';

/**
 * Uma resposta plausivel para o tipo declarado.
 *
 * Os valores nao sao aleatorios: sao os que o campo receberia em uso real. A
 * coordenada e a do territorio Parakana, que e onde estes formularios sao
 * aplicados - e e justamente ela que expoe o defeito do sinal.
 */
function respostaPlausivel(pergunta: { tipo: string; opcoes?: { valor: string }[] }): unknown {
  switch (pergunta.tipo) {
    case 'texto':
      return 'Resposta curta de teste';
    case 'texto_longo':
      return 'Resposta longa de teste, com virgula, ponto e acentuacao: manutencao, agua, producao.';
    case 'numero':
      return 12.5;
    case 'inteiro':
      return 12;
    case 'data':
      return '2026-07-18';
    case 'sim_nao':
    case 'escolha':
      return pergunta.opcoes?.[0]?.valor ?? null;
    case 'multipla':
      return pergunta.opcoes?.length ? [pergunta.opcoes[0].valor] : [];
    case 'coordenada':
      return { latitude: -4.7312, longitude: -49.9418 };
    case 'arquivo':
      return 'Pasta do projeto, registro de julho';
    default:
      return 'valor';
  }
}

/**
 * A forma de Modelo que validarRespostas espera.
 *
 * O `as never` no retorno e deliberado e vale um comentario: a definicao vem de
 * um .mjs sem tipos, entao o TypeScript so sabe que e `unknown`. Tipar a fonte
 * inteira para satisfazer o teste inverteria a relacao - o teste existe para
 * conferir o arquivo real, e nao o contrario. O que importa aqui e o
 * COMPORTAMENTO em tempo de execucao.
 */
// deno-lint-ignore no-explicit-any
function comoModelo(q: any): any {
  return {
    id: '00000000-0000-4000-8000-000000000000',
    chave: q.chave,
    nome: q.nome,
    versao: 1,
    definicao: q.definicao,
  };
}

for (const q of QUESTIONARIOS) {
  const modelo = comoModelo(q);
  // deno-lint-ignore no-explicit-any
  const perguntas: any[] = q.definicao.secoes.flatMap((s: any) => s.perguntas);

  Deno.test(`${q.chave}: cada pergunta aceita uma resposta plausivel do proprio tipo`, () => {
    const recusadas: string[] = [];

    // UMA PERGUNTA POR VEZ, e nao o formulario inteiro de uma vez: com tudo
    // junto, a primeira recusa mascara todas as seguintes e o conserto vira um
    // jogo de tentativa e erro, uma rodada por campo.
    for (const p of perguntas) {
      const valor = respostaPlausivel(p);
      if (valor === null || valor === undefined) continue;

      try {
        validarRespostas({ [p.chave]: valor }, modelo, false);
      } catch (e) {
        const codigo = e instanceof ErroRota ? e.codigo : String(e);
        recusadas.push(`${p.chave} (${p.tipo}): ${codigo}`);
      }
    }

    assertEquals(
      recusadas,
      [],
      `${q.chave}: o validador recusou resposta legitima em ${recusadas.length} pergunta(s):\n  ${recusadas.join('\n  ')}`,
    );
  });

  Deno.test(`${q.chave}: o formulario inteiro preenchido passa e conclui`, () => {
    const respostas: Record<string, unknown> = {};
    for (const p of perguntas) {
      const valor = respostaPlausivel(p);
      if (valor !== null && valor !== undefined) respostas[p.chave] = valor;
    }

    // concluindo = true tambem cobra o obrigatorio. Se uma pergunta obrigatoria
    // for de um tipo que nao se consegue responder, e aqui que aparece.
    const saida = validarRespostas(respostas, modelo, true);
    assertEquals(
      Object.keys(saida).length,
      Object.keys(respostas).length,
      `${q.chave}: o validador engoliu resposta - entraram ${Object.keys(respostas).length} e sairam ${Object.keys(saida).length}`,
    );
  });

  Deno.test(`${q.chave}: rascunho vazio e aceito`, () => {
    // O formulario e longo e aplicado em campo sem sinal. Salvar vazio precisa
    // funcionar, senao a pessoa perde tudo ao sair da tela.
    assertEquals(validarRespostas({}, modelo, false), {});
  });
}

Deno.test('nenhuma chave de pergunta dos formularios reais bate na guarda de dado pessoal', () => {
  // A guarda existe para impedir que alguem reintroduza "nome do cacique". Se
  // ela pegasse uma chave legitima, o formulario ficaria impossivel de salvar e
  // o erro apontaria para LGPD, mandando quem investiga para o lado errado.
  const proibida = /(^|_)(nome|contato|telefone|email|cpf|rg|assinatura)($|_)/;
  const batendo: string[] = [];

  for (const q of QUESTIONARIOS) {
    // deno-lint-ignore no-explicit-any
    for (const s of q.definicao.secoes as any[]) {
      // deno-lint-ignore no-explicit-any
      for (const p of s.perguntas as any[]) {
        if (proibida.test(p.chave)) batendo.push(`${q.chave}.${p.chave}`);
      }
    }
  }

  assertEquals(batendo, [], `chaves que a guarda de dado pessoal recusaria: ${batendo.join(', ')}`);
});

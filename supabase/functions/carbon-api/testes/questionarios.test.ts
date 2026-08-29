// -----------------------------------------------------------------------------
// Testes da validacao de resposta de questionario.
// -----------------------------------------------------------------------------
// POR QUE ESTES TESTES EXISTEM. A resposta chega como jsonb livre, e o jsonb
// aceita tudo. Sem conferencia, tres coisas entram caladas e so aparecem semanas
// depois: chave com erro de digitacao (a resposta some da tela), opcao que nao
// existe no formulario (o filtro nunca acha) e dado pessoal (que e o problema
// serio, porque estes formularios sao aplicados numa comunidade indigena).
//
// A funcao validada aqui e pura: nao toca em banco nem em contexto. Por isso o
// teste chama direto, sem duble - o duble de apoio.ts serve para provar que o
// portao entrou na CONSULTA, que e outra pergunta.
//
// O QUE ESTE ARQUIVO NAO PROVA: que o gatilho
// carbon_questionarios_sem_dado_pessoal do Postgres funciona. Ele e a garantia
// de verdade; esta validacao e o que transforma a recusa dele numa mensagem
// util. Provar o gatilho exige Postgres, e nao ha Docker nesta maquina.

import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import { ErroRota, lerDecimalComSinal } from '../rotas/helpers.ts';
import { validarRespostas } from '../rotas/questionarios.ts';

const MODELO = {
  id: '00000000-0000-4000-8000-000000000001',
  chave: 'teste',
  nome: 'Formulario de teste',
  versao: 1,
  definicao: {
    secoes: [
      {
        chave: 'unica',
        titulo: 'Seção única',
        perguntas: [
          { chave: 'observacao', rotulo: 'Observação', tipo: 'texto_longo' },
          { chave: 'familias', rotulo: 'Famílias', tipo: 'inteiro' },
          { chave: 'area_ha', rotulo: 'Área', tipo: 'numero' },
          {
            chave: 'classificacao',
            rotulo: 'Classificação',
            tipo: 'escolha',
            obrigatoria: true,
            opcoes: [
              { valor: 'garimpo', rotulo: 'Garimpo' },
              { valor: 'incendio', rotulo: 'Incêndio' },
            ],
          },
          {
            chave: 'fontes_agua',
            rotulo: 'Fontes de água',
            tipo: 'multipla',
            opcoes: [
              { valor: 'rio', rotulo: 'Rio' },
              { valor: 'poco', rotulo: 'Poço' },
            ],
          },
        ],
      },
    ],
  },
};

function erroDe(fn: () => unknown): ErroRota {
  return assertThrows(fn, ErroRota) as ErroRota;
}

Deno.test('chave com nome de pessoa e recusada antes de qualquer outra coisa', () => {
  const erro = erroDe(() => validarRespostas({ nome_entrevistado: 'x' }, MODELO, false));
  assertEquals(erro.codigo, 'resposta_com_dado_pessoal');
  assertEquals(erro.detalhe, 'nome_entrevistado');
});

Deno.test('as outras chaves proibidas tambem sao recusadas', () => {
  for (const chave of ['contato', 'telefone_aldeia', 'email', 'cpf', 'rg', 'assinatura_cacique']) {
    const erro = erroDe(() => validarRespostas({ [chave]: 'x' }, MODELO, false));
    assertEquals(erro.codigo, 'resposta_com_dado_pessoal', `esperava recusa de "${chave}"`);
  }
});

Deno.test('chave que nao existe no formulario e recusada, e nao ignorada', () => {
  // Ignorar faria o preenchimento sumir sem aviso, e quem respondeu acharia
  // que salvou. E o defeito que este teste existe para impedir.
  const erro = erroDe(() => validarRespostas({ observacoes: 'texto' }, MODELO, false));
  assertEquals(erro.codigo, 'pergunta_desconhecida');
  assertEquals(erro.detalhe, 'observacoes');
});

Deno.test('opcao fora da lista declarada e recusada', () => {
  const erro = erroDe(() => validarRespostas({ classificacao: 'roca' }, MODELO, false));
  assertEquals(erro.codigo, 'opcao_invalida');
  assertEquals(erro.detalhe, 'classificacao');
});

Deno.test('multipla recusa item fora da lista e remove repetido', () => {
  const erro = erroDe(() => validarRespostas({ fontes_agua: ['rio', 'cisterna'] }, MODELO, false));
  assertEquals(erro.codigo, 'opcao_invalida');

  const ok = validarRespostas({ fontes_agua: ['rio', 'poco', 'rio'] }, MODELO, false);
  assertEquals(ok.fontes_agua, ['rio', 'poco']);
});

Deno.test('multipla que nao vem como lista e recusada', () => {
  const erro = erroDe(() => validarRespostas({ fontes_agua: 'rio' }, MODELO, false));
  assertEquals(erro.codigo, 'campo_invalido');
});

Deno.test('inteiro recusa valor quebrado', () => {
  const erro = erroDe(() => validarRespostas({ familias: 12.5 }, MODELO, false));
  assertEquals(erro.codigo, 'campo_invalido');
  assertEquals(erro.detalhe, 'familias');

  const ok = validarRespostas({ familias: 12 }, MODELO, false);
  assertEquals(ok.familias, 12);
});

Deno.test('rascunho aceita incompleto e conclusao exige o obrigatorio', () => {
  // A distincao que sustenta o preenchimento em campo: recusar o rascunho por
  // um campo em branco faria perder o resto das respostas.
  const rascunho = validarRespostas({ observacao: 'sem sinal aqui' }, MODELO, false);
  assertEquals(rascunho.observacao, 'sem sinal aqui');

  const erro = erroDe(() => validarRespostas({ observacao: 'x' }, MODELO, true));
  assertEquals(erro.codigo, 'campo_obrigatorio');
  assertEquals(erro.detalhe, 'classificacao');
});

Deno.test('obrigatorio preenchido passa na conclusao', () => {
  const ok = validarRespostas({ classificacao: 'garimpo' }, MODELO, true);
  assertEquals(ok.classificacao, 'garimpo');
});

Deno.test('multipla vazia conta como nao respondida ao concluir', () => {
  const MODELO_MULTIPLA = {
    ...MODELO,
    definicao: {
      secoes: [{
        chave: 'unica',
        titulo: 'Seção única',
        perguntas: [{
          chave: 'fontes_agua',
          rotulo: 'Fontes de água',
          tipo: 'multipla',
          obrigatoria: true,
          opcoes: [{ valor: 'rio', rotulo: 'Rio' }],
        }],
      }],
    },
  };
  const erro = erroDe(() => validarRespostas({ fontes_agua: [] }, MODELO_MULTIPLA, true));
  assertEquals(erro.codigo, 'campo_obrigatorio');
});

Deno.test('valor vazio nao entra no objeto gravado', () => {
  // Gravar string vazia faria "respondido em branco" e "nao respondido" ficarem
  // indistinguiveis, e a contagem de respondidas da lista mentiria.
  const ok = validarRespostas({ observacao: '', familias: null, area_ha: undefined }, MODELO, false);
  assertEquals(Object.keys(ok).length, 0);
});

Deno.test('respostas nao-objeto sao recusadas', () => {
  assertEquals(validarRespostas(null, MODELO, false), {});
  assertEquals(erroDe(() => validarRespostas([1, 2], MODELO, false)).codigo, 'campo_invalido');
  assertEquals(erroDe(() => validarRespostas('texto', MODELO, false)).codigo, 'campo_invalido');
});

/* ===== Coordenada ==========================================================
   O Brasil inteiro tem latitude e longitude negativas. Estes testes existem
   porque a primeira versao usava lerNumero, que recusa negativo de proposito, e
   o formulario so falhava para quem de fato marcou o ponto em campo.          */

Deno.test('coordenada do territorio Parakana e aceita', () => {
  assertEquals(lerDecimalComSinal(-4.7312, { min: -90, max: 90 }, 'latitude'), -4.7312);
  assertEquals(lerDecimalComSinal(-49.9418, { min: -180, max: 180 }, 'longitude'), -49.9418);
});

Deno.test('coordenada digitada com virgula, como em pt-BR', () => {
  assertEquals(lerDecimalComSinal('-4,7312', { min: -90, max: 90 }, 'latitude'), -4.7312);
});

Deno.test('a faixa barra o eixo trocado de lugar', () => {
  // Uma longitude posta no campo de latitude e o erro classico de coordenada.
  // Sem a faixa, gravaria um ponto no meio do oceano sem ninguem notar.
  const erro = erroDe(() => lerDecimalComSinal(-120, { min: -90, max: 90 }, 'latitude'));
  assertEquals(erro.codigo, 'campo_invalido');
  assertEquals(erro.detalhe, 'latitude');
});

Deno.test('coordenada vazia continua sendo ausencia, e nao zero', () => {
  // Zero e uma coordenada valida (golfo da Guine). Confundir vazio com zero
  // poria todo questionario sem GPS no meio do Atlantico.
  assertEquals(lerDecimalComSinal('', { min: -90, max: 90 }), null);
  assertEquals(lerDecimalComSinal(null, { min: -90, max: 90 }), null);
  assertEquals(lerDecimalComSinal(0, { min: -90, max: 90 }), 0);
});

Deno.test('pergunta do tipo coordenada aceita valor negativo', () => {
  const MODELO_COORD = {
    ...MODELO,
    definicao: {
      secoes: [{
        chave: 'unica',
        titulo: 'Seção única',
        perguntas: [{ chave: 'ponto', rotulo: 'Ponto', tipo: 'coordenada' }],
      }],
    },
  };
  const ok = validarRespostas(
    { ponto: { latitude: -4.7312, longitude: -49.9418 } },
    MODELO_COORD,
    false,
  );
  assertEquals(ok.ponto, { latitude: -4.7312, longitude: -49.9418 });
});

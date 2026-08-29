// -----------------------------------------------------------------------------
// Testes do portao de leitura de projetos (Frente A).
// -----------------------------------------------------------------------------
// Rodar:  npx.cmd deno test --allow-env supabase/functions/carbon-api/testes/
//
// A pergunta que estes testes respondem e uma so, em varias formas: existe algum
// caminho pelo qual quem NAO esta na equipe alcanca dado de projeto?
//
// Cada teste que passa fecha um caminho. O que eles NAO cobrem esta escrito no
// cabecalho de apoio.ts, e resumidamente e tudo que exige Postgres.

import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';

import { rotas as rotasProjetos } from '../rotas/projetos.ts';
import { rotas as rotasPdd } from '../rotas/pdd.ts';
import { ehAdmin, podeEscrever } from '../rotas/acesso.ts';
import { chamar, contexto, corpoDe, criarDuble, handler, registro, resumir } from './apoio.ts';

const listar = handler(rotasProjetos, 'GET', 'projetos');
const obter = handler(rotasProjetos, 'GET', 'projetos/:id');
const atualizar = handler(rotasProjetos, 'PATCH', 'projetos/:id');
const equipe = handler(rotasProjetos, 'PATCH', 'projetos/:id/equipe');
const capitulo = handler(rotasPdd, 'PATCH', 'pdd-capitulos/:id');

const ID = '11111111-1111-4111-8111-111111111111';

/* ===== O portao entra na consulta ========================================= */

Deno.test('listar: colaborador filtra pela equipe DENTRO da consulta', async () => {
  const duble = criarDuble([{ data: [] }]);
  await chamar(listar, contexto(duble, { papel: 'colaborador', id: 'u-7' }));

  const texto = resumir(duble.consultas[0]);
  // O join precisa estar na MESMA consulta que traz o dado. Se ele virasse uma
  // consulta separada de "confere primeiro", existiria janela entre as duas.
  assertStringIncludes(texto, 'carbon_projeto_equipe!inner(usuario_id)');
  assertStringIncludes(texto, '"carbon_projeto_equipe.usuario_id", "u-7"');
});

Deno.test('listar: gestor NAO enxerga tudo, so o que participa', async () => {
  const duble = criarDuble([{ data: [] }]);
  await chamar(listar, contexto(duble, { papel: 'gestor', id: 'u-9' }));

  // Gestor escreve, mas nao ve carteira inteira. Se este teste quebrar, o portao
  // passou a valer para menos da metade do time.
  assertStringIncludes(resumir(duble.consultas[0]), 'carbon_projeto_equipe!inner');
});

Deno.test('listar: admin nao leva o filtro', async () => {
  const duble = criarDuble([{ data: [] }]);
  await chamar(listar, contexto(duble, { papel: 'admin' }));

  assert(
    !resumir(duble.consultas[0]).includes('carbon_projeto_equipe'),
    'admin nao deveria ter join de equipe',
  );
});

Deno.test('listar: erro de banco vira 500, e NAO lista vazia', async () => {
  const duble = criarDuble([{ error: { message: 'conexao caiu' } }]);
  const r = await chamar(listar, contexto(duble, { papel: 'colaborador' }));

  // Devolver [] aqui faria a tela dizer "voce nao participa de nenhum projeto"
  // quando o banco caiu. Falha fechada tem que ser visivel, nao silenciosa.
  assertEquals(r.status, 500);
});

Deno.test('listar: envelope traz pode_criar conforme o papel', async () => {
  for (const [papel, esperado] of [['admin', true], ['gestor', true], ['colaborador', false]] as const) {
    const duble = criarDuble([{ data: [] }]);
    const r = await chamar(listar, contexto(duble, { papel }));
    const corpo = await corpoDe(r);
    assertEquals(corpo.pode_criar, esperado, `pode_criar errado para ${papel}`);
    assert(Array.isArray(corpo.projetos), 'projetos precisa ser lista');
  }
});

/* ===== O detalhe tem o MESMO portao da lista ============================== */

Deno.test('obter: sem participar responde 404 e nao consulta mais nada', async () => {
  const duble = criarDuble([{ data: null }]);
  const r = await chamar(obter, contexto(duble, { papel: 'colaborador', params: { id: ID } }));

  assertEquals(r.status, 404);
  assertEquals((await corpoDe(r)).erro, 'nao_encontrado');
  // Nao pode ter ido buscar equipe nem geometria de projeto que ele nao ve.
  assertEquals(duble.consultas.length, 1, 'consultou alem do projeto invisivel');
});

Deno.test('obter: o filtro de equipe esta no detalhe, nao so na lista', async () => {
  const duble = criarDuble([{ data: null }]);
  await chamar(obter, contexto(duble, { papel: 'colaborador', id: 'u-3', params: { id: ID } }));

  // Este e o teste do IDOR classico: lista filtrada e detalhe aberto.
  assertStringIncludes(resumir(duble.consultas[0]), 'carbon_projeto_equipe!inner');
  assertStringIncludes(resumir(duble.consultas[0]), '"u-3"');
});

/* ===== Escrita tambem passa pelo portao =================================== */

Deno.test('atualizar: gestor de fora da equipe nao chega na RPC', async () => {
  const duble = criarDuble([{ data: null }]);
  const r = await chamar(atualizar, 
    contexto(duble, { papel: 'gestor', params: { id: ID }, corpo: { nome: 'Novo nome' } }),
  );

  assertEquals(r.status, 404);
  // O papel dele autoriza escrita, mas nao neste projeto. Se a RPC for chamada,
  // a escrita ja aconteceu e o 404 depois seria mentira.
  assertEquals(duble.rpcs.length, 0, 'a RPC de atualizacao foi chamada mesmo sem visibilidade');
});

Deno.test('capitulo de PDD: projeto invisivel nao e atualizado', async () => {
  // 1a consulta resolve o dono do capitulo; 2a e o portao, que nao acha.
  const duble = criarDuble([{ data: { projeto_id: ID } }, { data: null }]);
  const r = await chamar(capitulo, 
    contexto(duble, { papel: 'gestor', params: { id: ID }, corpo: { status: 'concluido' } }),
  );

  assertEquals(r.status, 404);
  // Nenhum update pode ter sido montado.
  const houveUpdate = duble.consultas.some((c) => c.passos.some((p) => p.metodo === 'update'));
  assert(!houveUpdate, 'capitulo foi atualizado sem o projeto ser visivel');
});

Deno.test('capitulo de PDD: capitulo inexistente e projeto invisivel dao o MESMO 404', async () => {
  const semCapitulo = criarDuble([{ data: null }]);
  const a = await chamar(capitulo, 
    contexto(semCapitulo, { papel: 'gestor', params: { id: ID }, corpo: { status: 'concluido' } }),
  );
  const semAcesso = criarDuble([{ data: { projeto_id: ID } }, { data: null }]);
  const b = await chamar(capitulo, 
    contexto(semAcesso, { papel: 'gestor', params: { id: ID }, corpo: { status: 'concluido' } }),
  );

  // Respostas distinguiveis transformariam a rota em oraculo de existencia.
  assertEquals(a.status, b.status);
  assertEquals((await corpoDe(a)).erro, (await corpoDe(b)).erro);
});

/* ===== A rota de equipe =================================================== */

Deno.test('equipe: projeto invisivel responde 404 antes de qualquer escrita', async () => {
  const duble = criarDuble([{ data: null }]);
  const r = await chamar(equipe, 
    contexto(duble, {
      papel: 'admin',
      params: { id: ID },
      corpo: { adicionar: ['alguem@apsis.com.br'] },
    }),
  );

  assertEquals(r.status, 404);
  const houveUpsert = duble.consultas.some((c) => c.passos.some((p) => p.metodo === 'upsert'));
  assert(!houveUpsert, 'incluiu gente em projeto invisivel');
});

Deno.test('equipe: e-mail de fora do dominio e recusado', async () => {
  const duble = criarDuble([{ data: { id: ID } }]);
  const r = await chamar(equipe, 
    contexto(duble, {
      papel: 'admin',
      params: { id: ID },
      corpo: { adicionar: ['pessoa@outraempresa.com'] },
    }),
  );

  assertEquals(r.status, 400);
  assertEquals((await corpoDe(r)).erro, 'colaborador_externo');
});

Deno.test('equipe: o dominio vem da config, nao de literal no codigo', async () => {
  const duble = criarDuble([{ data: { id: ID } }]);
  const ctx = contexto(duble, {
    papel: 'admin',
    params: { id: ID },
    corpo: { adicionar: ['pessoa@outrodominio.com.br'] },
  });
  // Troca o dominio permitido: o mesmo e-mail passa a ser aceito.
  const r = await chamar(equipe, { ...ctx, dominio: 'outrodominio.com.br' });

  assert(r.status !== 400, 'recusou e-mail do dominio configurado');
});

Deno.test('equipe: erro ao resolver quem remover vira 500, nao 200 silencioso', async () => {
  const duble = criarDuble([
    { data: { id: ID } }, // portao
    { error: { message: 'timeout' } }, // resolucao dos e-mails a remover
  ]);
  const r = await chamar(equipe, 
    contexto(duble, {
      papel: 'admin',
      params: { id: ID },
      corpo: { remover: ['alguem@apsis.com.br'] },
    }),
  );

  // Engolir esse erro faria a revogacao NAO acontecer e a rota responder 200 com
  // a equipe intacta: quem clicou iria embora achando que tirou o acesso.
  assertEquals(r.status, 500);
});

Deno.test('equipe: nao deixa o projeto sem ninguem', async () => {
  const duble = criarDuble([
    { data: { id: ID } }, // portao
    { data: [{ id: 'u-1' }] }, // quem remover resolve para u-1
    { data: [{ usuario_id: 'u-1' }] }, // vinculos atuais: so u-1
    { data: [{ id: 'u-1', email: 'pessoa@apsis.com.br', nome: null }] },
  ]);
  const r = await chamar(equipe, 
    contexto(duble, {
      papel: 'admin',
      params: { id: ID },
      corpo: { remover: ['pessoa@apsis.com.br'] },
    }),
  );

  // Projeto sem equipe so apareceria para admin, e nao existiria via de volta:
  // incluir alguem exige participar. Lockout que se cria sozinho.
  assertEquals(r.status, 400);
  assertEquals((await corpoDe(r)).erro, 'equipe_vazia');
  const houveDelete = duble.consultas.some((c) => c.passos.some((p) => p.metodo === 'delete'));
  assert(!houveDelete, 'apagou o ultimo membro da equipe');
});

Deno.test('equipe: leitura da equipe NAO usa embed do PostgREST', async () => {
  const duble = criarDuble([
    { data: { id: ID } },
    { data: [{ id: 'u-2', email: 'nova.pessoa@apsis.com.br' }] },
    { data: null }, // upsert
    { data: [{ usuario_id: 'u-2' }] },
    { data: [{ id: 'u-2', email: 'nova.pessoa@apsis.com.br', nome: null }] },
  ]);
  await chamar(equipe, 
    contexto(duble, {
      papel: 'admin',
      params: { id: ID },
      corpo: { adicionar: ['nova.pessoa@apsis.com.br'] },
    }),
  );

  // carbon_projeto_equipe tem DUAS FKs para carbon_usuarios (usuario_id e
  // criado_por). Um embed ali responde PGRST201 e derruba a rota para todos.
  for (const consulta of duble.consultas) {
    assert(
      !resumir(consulta).includes('carbon_usuarios!inner'),
      `embed ambiguo encontrado: ${resumir(consulta)}`,
    );
  }
});

/* ===== Papeis ============================================================= */

Deno.test('papeis: caixa alta no banco nao burla o portao', () => {
  assert(ehAdmin(registro('Admin')), 'Admin com maiuscula deixou de ser admin');
  assert(podeEscrever(registro('GESTOR')), 'GESTOR deixou de escrever');
  assert(!ehAdmin(registro('colaborador')));
  assert(!podeEscrever(registro('colaborador')));
  // deno-lint-ignore no-explicit-any
  assert(!ehAdmin({ ...registro('admin'), papel: null as any }), 'papel nulo virou admin');
});

/* ===== Caminho POSITIVO ===================================================
   Os testes acima provam que o portao fecha. Estes provam que ele ABRE para
   quem deve passar. Sem eles, uma implementacao que negasse tudo passaria na
   suite inteira e o sistema estaria "seguro" e inutil ao mesmo tempo.      */

Deno.test('listar: quem participa recebe os projetos', async () => {
  const duble = criarDuble([{
    data: [
      { id: ID, nome: 'Projeto A', ativo: true, carbon_projeto_equipe: [{ usuario_id: 'u-1' }] },
    ],
  }]);
  const r = await chamar(listar, contexto(duble, { papel: 'colaborador' }));
  const corpo = await corpoDe(r);

  assertEquals(r.status, 200);
  assertEquals((corpo.projetos as unknown[]).length, 1);
  // A coluna do join existe so para filtrar e nao pode sair no payload.
  const primeiro = (corpo.projetos as Record<string, unknown>[])[0];
  assert(
    !('carbon_projeto_equipe' in primeiro),
    'a coluna do join vazou para a resposta',
  );
});

Deno.test('obter: quem participa recebe projeto, equipe e pode_escrever', async () => {
  const duble = criarDuble([
    { data: { id: ID, nome: 'Projeto A', ativo: true } }, // portao passa
    { data: [{ usuario_id: 'u-1' }] }, // vinculos
    { data: [{ id: 'u-1', email: 'pessoa.u-1@apsis.com.br', nome: null }] },
  ]);
  const r = await chamar(obter, contexto(duble, { papel: 'gestor', params: { id: ID } }));
  const corpo = await corpoDe(r);

  assertEquals(r.status, 200);
  assert(corpo.projeto, 'faltou o projeto');
  assertEquals((corpo.equipe as unknown[]).length, 1);
  assertEquals(corpo.pode_escrever, true);
});

Deno.test('obter: colaborador da equipe le, mas pode_escrever e false', async () => {
  const duble = criarDuble([
    { data: { id: ID, nome: 'Projeto A', ativo: true } },
    { data: [] },
  ]);
  const r = await chamar(obter, contexto(duble, { papel: 'colaborador', params: { id: ID } }));
  const corpo = await corpoDe(r);

  assertEquals(r.status, 200);
  assertEquals(corpo.pode_escrever, false);
});

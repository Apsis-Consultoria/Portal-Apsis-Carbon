// -----------------------------------------------------------------------------
// Autorizacao do carbon-api: quem escreve e quem enxerga tudo.
// -----------------------------------------------------------------------------
// Importa SOMENTE tipos.ts, de proposito. Este modulo e importado pelo index.ts e
// por varios modulos de rota; qualquer import de volta criaria ciclo, e ciclo no
// Deno Deploy nao falha no build, falha no boot do isolate, o que o navegador ve
// como erro de CORS (a resposta sai sem cabecalho nenhum) e manda quem for
// depurar procurar no lugar errado.
//
// A REGRA, em uma frase: o papel decide a ESCRITA; a participacao em
// carbon_projeto_equipe decide a LEITURA; e admin ignora a participacao.
//
// Estas duas metades vivem em lugares diferentes porque sao aplicadas em momentos
// diferentes. A escrita e conferida uma unica vez no index.ts, antes de qualquer
// handler rodar, porque e uma pergunta sobre a PESSOA. A leitura e conferida
// DENTRO da consulta que traz o dado (ver comVisibilidade em rotas/projetos.ts),
// porque e uma pergunta sobre a pessoa E a linha, e separar "conferir" de "ler"
// em duas consultas abriria uma janela entre as duas.

import type { RegistroUsuario } from './tipos.ts';

/**
 * Papeis que podem escrever.
 *
 * Regra deliberadamente grossa: a escrita nao e por projeto. Um gestor que
 * enxerga um projeto pode edita-lo; o que ele NAO pode e enxergar um projeto de
 * que nao participa. O refinamento (papel diferente por projeto) so vale a pena
 * quando existir demanda concreta - antes disso e um modelo intermediario que
 * ninguem pediu e que todo mundo precisa entender.
 */
const PAPEIS_ESCRITA = new Set(['admin', 'gestor']);

/** Autorizacao de escrita. Conferida no index.ts, antes do handler. */
export function podeEscrever(registro: RegistroUsuario): boolean {
  return PAPEIS_ESCRITA.has(String(registro.papel ?? '').toLowerCase());
}

/**
 * Admin enxerga TODOS os projetos, sem participar de nenhum.
 *
 * POR QUE GESTOR NAO ENTRA AQUI, ja que gestor escreve: se gestor enxergasse
 * tudo, o portao valeria para menos da metade do time e nao seria portao. Quem
 * precisa de visao de carteira recebe papel admin nominalmente, por decisao
 * explicita de alguem, e nao como efeito colateral de poder editar.
 *
 * A comparacao normaliza a caixa pelo mesmo motivo de podeEscrever: o papel vem
 * de uma coluna text com CHECK, mas o CHECK nao impede uma correcao manual no
 * SQL Editor gravar 'Admin' e o portao passar a negar em silencio.
 */
export function ehAdmin(registro: RegistroUsuario): boolean {
  return String(registro.papel ?? '').toLowerCase() === 'admin';
}

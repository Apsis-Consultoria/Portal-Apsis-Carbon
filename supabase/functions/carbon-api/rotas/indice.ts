// -----------------------------------------------------------------------------
// Indice das rotas do carbon-api.
// -----------------------------------------------------------------------------
// UNICO ponto compartilhado do backend. Para publicar as rotas de um dominio novo:
//   1. crie supabase/functions/carbon-api/rotas/<dominio>.ts exportando
//      `export const rotas: Rota[]`;
//   2. acrescente aqui UM import e UM spread em TODAS_AS_ROTAS.
// Nada mais muda: o index.ts nao lista rotas e nao precisa ser editado.
//
// POR QUE NAO E AUTOMATICO: o Deno Deploy do Supabase publica um grafo de modulos
// estatico. Nao existe equivalente do import.meta.glob do Vite, e varredura de
// diretorio em runtime (Deno.readDir) nao funciona no isolate publicado, porque os
// arquivos que ninguem importa nao vao no bundle. Import estatico e a unica forma
// confiavel, e as duas linhas de diff sao aceitaveis para um arquivo que quase nao
// tem conteudo (baixissimo risco de conflito real).

import type { Rota } from './tipos.ts';

import { rotas as rotasMe } from './me.ts';
import { rotas as rotasModulos } from './modulos.ts';
import { rotas as rotasNotificacoes } from './notificacoes.ts';
import { rotas as rotasProjetos } from './projetos.ts';
import { rotas as rotasPdd } from './pdd.ts';
import { rotas as rotasSecureShare } from './secureshare.ts';

export const TODAS_AS_ROTAS: Rota[] = [
  ...rotasMe,
  ...rotasModulos,
  ...rotasNotificacoes,
  ...rotasProjetos,
  ...rotasPdd,
  ...rotasSecureShare,
];

// Guarda de colisao. Duas rotas com o mesmo metodo e o mesmo padrao fariam a
// segunda ser inalcancavel em silencio - o tipo de bug que aparece semanas depois
// como "minha rota nova nao faz nada". Avisamos no log, mas NAO lancamos: excecao
// no topo do modulo derruba o isolate antes do handler existir, e o navegador
// receberia uma falha sem cabecalho CORS, que aparece como erro de CORS e esconde
// a causa. Com o aviso, a primeira rota registrada continua valendo.
{
  const vistos = new Set<string>();
  for (const rota of TODAS_AS_ROTAS) {
    const chave = `${rota.metodo} ${rota.padrao}`;
    if (vistos.has(chave)) {
      console.error(
        `Rota duplicada no indice do carbon-api: ${chave}. A primeira registrada vale; ` +
          'a segunda esta inalcancavel. Corrija rotas/indice.ts.',
      );
    }
    vistos.add(chave);
  }
}

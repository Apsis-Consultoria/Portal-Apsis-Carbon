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
import { rotas as rotasAtividades } from './atividades.ts';
import { rotas as rotasDocumentos } from './documentos.ts';
import { rotas as rotasEvidencias } from './evidencias.ts';
import { rotas as rotasFindings } from './findings.ts';
import { rotas as rotasFornecedores } from './fornecedores.ts';
import { rotas as rotasIndicadores } from './indicadores.ts';
import { rotas as rotasMonitoramento } from './monitoramento.ts';
import { rotas as rotasReunioes } from './reunioes.ts';
import { rotas as rotasReunioesTeams } from './reunioesteams.ts';
import { rotas as rotasVisitas } from './visitas.ts';
import { rotas as rotasConsultoria } from './consultoria.ts';
import { rotas as rotasCredito } from './credito.ts';
import { rotas as rotasMetas } from './metas.ts';
import { rotas as rotasPipeline } from './pipeline.ts';

export const TODAS_AS_ROTAS: Rota[] = [
  ...rotasMe,
  ...rotasModulos,
  ...rotasNotificacoes,
  ...rotasProjetos,
  ...rotasPdd,
  ...rotasSecureShare,
  // Os oito abaixo entraram no indice em 25/08/2026. Os arquivos existiam desde
  // 14/08 e nunca tinham sido registrados: 66 rotas escritas, testadas de forma
  // isolada e inalcancaveis em producao. O sintoma era "as telas nao carregam
  // nada do servidor", que parecia problema de frontend e nao era - o
  // carbon-api respondia 404 para todas elas, porque de fato nao existiam no
  // roteador. Ao acrescentar um dominio novo, o passo 2 do cabecalho e o que
  // costuma ser esquecido.
  ...rotasAtividades,
  ...rotasDocumentos,
  ...rotasEvidencias,
  ...rotasFindings,
  ...rotasFornecedores,
  ...rotasIndicadores,
  ...rotasMonitoramento,
  ...rotasReunioes,
  // Separado de rotasReunioes de proposito: e a unica parte da tela que depende
  // de um sistema externo (Microsoft Graph) e que pode estar indisponivel por
  // falta de permissao. Ver o cabecalho de reunioesteams.ts.
  ...rotasReunioesTeams,
  ...rotasVisitas,
  // Os quatro abaixo entraram em 26/08/2026. As tabelas e as funcoes SQL deles
  // existiam desde 14/08 e ja tinham dado carregado; faltava so a publicacao,
  // que e este arquivo. E a mesma armadilha que deixou oito modulos em 404 por
  // onze dias: migration aplicada nao e rota no ar.
  ...rotasConsultoria,
  ...rotasCredito,
  ...rotasMetas,
  ...rotasPipeline,
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

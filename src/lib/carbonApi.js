/**
 * carbonApi - COMPATIBILIDADE. O conteudo mudou de lugar.
 *
 * A camada de acesso ao backend foi quebrada por dominio para que frentes de trabalho
 * paralelas nao editem o mesmo arquivo:
 *
 *   src/lib/api/base.js       transporte, ErroApi, ErroInteracaoNecessaria, mensagemDeErro
 *   src/lib/api/nucleo.js     /me, /modulos, /notificacoes (estrutura do shell)
 *   src/lib/api/projetos.js   rotas de projeto (issue #1)
 *   src/lib/api/pdd.js        rotas do PDD (issue #2)
 *
 * Este arquivo continua existindo apenas para nao quebrar quem ja importava dele
 * (src/Layout.jsx, src/pages/BoasVindas.jsx, src/pages/Projetos.jsx,
 * src/pages/ProjetoPdd.jsx). Em CODIGO NOVO importe o modulo do dominio direto:
 *
 *   import { listarProjetos } from '@/lib/api/projetos';
 *
 * Nao acrescente funcao nova aqui.
 */

export * from "@/lib/api/indice";

/**
 * api/indice - agregador de compatibilidade da camada de API.
 *
 * Existe por UM motivo: src/lib/carbonApi.js era o unico ponto de acesso ao backend e
 * varias telas importam dele. Depois da quebra por dominio, o carbonApi.js passou a ser
 * um re-export deste arquivo, e nenhum import existente quebrou.
 *
 * QUAL IMPORT USAR EM CODIGO NOVO: o modulo do proprio dominio,
 * `import { listarProjetos } from '@/lib/api/projetos'`. NAO acrescente o seu dominio
 * aqui. Dois motivos:
 *   1. este arquivo e compartilhado, e cada linha nova aqui e um conflito potencial
 *      entre frentes que trabalham em paralelo;
 *   2. `export *` cria uma dependencia do agregador para TODOS os dominios, e quem
 *      importar um deles arrasta os outros (e os respectivos datasets de demonstracao)
 *      para o mesmo pedaco do bundle.
 *
 * Nao usamos import.meta.glob aqui: glob nao consegue reexportar nomes estaticamente,
 * o que quebraria tanto o tree-shaking quanto o autocompletar. Onde o glob e a
 * ferramenta certa e no registro de PAGINAS, que agrega ARRAYS e nao nomes exportados
 * (ver src/paginas/indice.js).
 */

export * from "@/lib/api/base";
export * from "@/lib/api/nucleo";
export * from "@/lib/api/projetos";
export * from "@/lib/api/pdd";

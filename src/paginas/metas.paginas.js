import Metas from '@/pages/Metas';

/**
 * metas.paginas.js - registro da tela de Metas por frente de trabalho (issue #14).
 *
 * O agregador src/paginas/indice.js encontra este arquivo por import.meta.glob, então
 * publicar a tela não exigiu editar App.jsx, Layout.jsx nem paginas.config.js. A forma
 * de uma entrada está documentada em src/paginas/nucleo.paginas.js.
 *
 * SEM ROTA POR PROJETO, de propósito, e por um motivo diferente do de Documentos. A meta
 * pertence sempre a um projeto (carbon_metas.projeto_id é NOT NULL), então uma rota
 * '/Projetos/:id/Metas' seria defensável. O que decidiu foi a leitura: metas são o
 * acompanhamento semanal da equipe, e quem abre esta tela quer chegar nela pelo menu, não
 * navegando até um projeto primeiro. O projeto é o primeiro filtro da própria tela, com
 * seleção automática quando existe só um. Consequência: item fixo no menu, e não `menuPai`.
 *
 * `ordem: 6` deixa o item depois de Findings (5) e antes de Reuniões (9): metas e
 * findings são as duas listas de pendência do projeto e se leem em sequência.
 *
 * ÍCONE: 'Goal'. Os ícones Target, Goal, Briefcase e Coins foram acrescentados ao mapa
     * ICONES de src/Layout.jsx em 26/08/2026, na integração. O mapa é explícito de
     * propósito (import dinâmico por nome quebraria o tree-shaking), então nome novo
     * exige as duas linhas lá: o import e a chave.
 */
export const paginas = [
  {
    nome: 'Metas',
    rota: '/Metas',
    componente: Metas,
    titulo: 'Metas',
    subtitulo: 'Metas por frente de trabalho, com progresso e prazo',
    menu: { icone: 'Goal', ordem: 6, grupo: null },
  },
];

export default paginas;

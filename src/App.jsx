import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { AuthProvider } from '@/lib/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { createPageUrl } from '@/utils';
import { PAGINAS } from '@/paginas.config';
import ErrorBoundary from '@/components/ErrorBoundary';
import Layout from '@/Layout';
import AcessoBloqueado from '@/pages/AcessoBloqueado';

/**
 * Códigos de erro da carbon-api que NÃO podem ficar sem dono. São falhas em que
 * continuar renderizando o app produz uma tela vazia e enganosa (menu só com
 * Boas-Vindas, sino zerado, "tente recarregar" que nunca resolve).
 */
const BLOQUEIOS_POR_CODIGO = {
  interacao_necessaria: 'sessao_expirada',
  nao_autenticado: 'sessao_expirada',
  usuario_inativo: 'usuario_inativo',
};

/**
 * GuardaDeSessao - dono único dos erros de sessão vindos das queries.
 *
 * A camada de API (src/lib/api/base.js) lança ErroInteracaoNecessaria (código
 * 'interacao_necessaria') e ErroApi com o código do backend, mas de propósito NÃO
 * dispara loginRedirect de dentro de um queryFn (um redirect no meio de um
 * carregamento tira o usuário da tela e pode entrar em loop se duas queries falharem
 * juntas). Quem decide o que mostrar é esta camada: observamos o cache do TanStack
 * Query e, ao ver um dos códigos acima, trocamos a árvore inteira por uma tela
 * explicativa com ação.
 *
 * Fica DENTRO do QueryClientProvider (precisa do cache) e FORA do Router (a tela
 * é cheia, sem shell nem rota própria) - é por isso que AcessoBloqueado é importada
 * aqui direto, e não pelo registro de PAGINAS: ela recebe o prop `motivo`, que rota
 * nenhuma saberia passar.
 */
function GuardaDeSessao({ children }) {
  const [bloqueio, setBloqueio] = useState(null);

  useEffect(() => {
    const cache = queryClient.getQueryCache();

    const avaliar = (erro) => {
      const destino = BLOQUEIOS_POR_CODIGO[erro?.codigo];
      // 'usuario_inativo' tem prioridade: é decisão administrativa, não sessão.
      if (destino) setBloqueio((atual) => (atual === 'usuario_inativo' ? atual : destino));
    };

    // Uma query pode ter falhado antes deste efeito rodar (StrictMode, remount).
    cache.getAll().forEach((query) => avaliar(query.state.error));

    return cache.subscribe((evento) => avaliar(evento?.query?.state?.error));
  }, []);

  if (bloqueio) return <AcessoBloqueado motivo={bloqueio} />;
  return children;
}

/**
 * Monta o element de uma entrada do registro.
 *
 * `shell: true` (o normal) embrulha a tela no Layout, passando o nome da página como
 * currentPageName - é o que alimenta o título da topbar e o item ativo do menu.
 * `shell: false` renderiza a tela cheia, sem sidebar nem topbar.
 */
function elementoDaPagina(pagina) {
  const Pagina = pagina.componente;
  if (!pagina.shell) return <Pagina />;
  return (
    <Layout currentPageName={pagina.nome}>
      <Pagina />
    </Layout>
  );
}

/**
 * App - composição da árvore. Este arquivo NÃO muda quando uma tela nova aparece:
 * as rotas saem de src/paginas.config.js, alimentado por src/paginas/*.paginas.js.
 * Para publicar uma tela, crie o arquivo de registro do seu domínio (a forma de uma
 * entrada está documentada em src/paginas/nucleo.paginas.js).
 */
function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <GuardaDeSessao>
          {/*
            basename: no dominio proprio vale '/' e nada muda. No GitHub Pages de
            repositorio de projeto o site e servido em /<repo>/, e sem o basename
            o Router acha que a rota atual e "/Portal-Apsis-Carbon/" - que nao
            casa com nenhuma <Route> - e a tela fica vazia sem erro no console.
            A constante e injetada pelo `define` do vite.config.js.
          */}
          <Router basename={__BASE_ROTAS__}>
            <ErrorBoundary>
              <Routes>
                {/* Home: o Carbon não tem dashboard próprio ainda, então a raiz cai na boas-vindas */}
                <Route path="/" element={<Navigate to={createPageUrl('BoasVindas')} replace />} />

                {/* Uma <Route> por página registrada. Entradas sem rota são telas que
                    existem mas não são alcançáveis por URL (AcessoBloqueado é renderizada
                    pelo GuardaDeSessao, acima). Entradas com `curinga` viram o path="*",
                    que é o 404. A ordem não importa: o React Router 6 ranqueia por
                    especificidade, não pela ordem de declaração. */}
                {PAGINAS.filter((pagina) => pagina.rota).map((pagina) => (
                  <Route
                    key={pagina.nome}
                    path={pagina.curinga ? '*' : pagina.rota}
                    element={elementoDaPagina(pagina)}
                  />
                ))}
              </Routes>
            </ErrorBoundary>

            {/* Toaster importado direto do sonner (o Carbon não usa o wrapper shadcn do portal,
                que depende de next-themes). Props na mão, iguais às do portal. */}
            <Toaster position="bottom-right" richColors closeButton />
          </Router>
        </GuardaDeSessao>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;

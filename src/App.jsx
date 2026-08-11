import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { AuthProvider } from '@/lib/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { createPageUrl } from '@/utils';
import ErrorBoundary from '@/components/ErrorBoundary';
import Layout from '@/Layout';
import AcessoBloqueado from '@/pages/AcessoBloqueado';
import BoasVindas from '@/pages/BoasVindas';
import NaoAutorizado from '@/pages/NaoAutorizado';
import PaginaNaoEncontrada from '@/pages/PaginaNaoEncontrada';

/**
 * Registro único nome-da-página -> componente, no mesmo espírito do PAGE_COMPONENTS
 * do portal. Toda página listada aqui ganha automaticamente:
 *   - a URL canônica devolvida por createPageUrl(nome) (ver src/lib/pageRoutes.js);
 *   - o shell do Layout, com currentPageName = a chave (é o que alimenta o título
 *     da topbar via PAGE_HEADERS e o estado ativo do menu).
 *
 * PARA ADICIONAR UMA TELA NOVA (o caminho esperado quando os módulos de negócio
 * forem definidos):
 *   1. crie src/pages/MinhaTela.jsx;
 *   2. importe aqui e acrescente `MinhaTela` neste objeto;
 *   3. se a URL precisar ser hierárquica, declare a chave em src/lib/pageRoutes.js;
 *   4. se a tela precisar de título próprio na topbar, acrescente a chave em
 *      PAGE_HEADERS (src/Layout.jsx).
 * Nada mais precisa mudar: a rota e o item de menu saem daí.
 *
 * Telas que NÃO devem receber o shell (tela cheia) ficam como <Route> explícita
 * abaixo, fora deste laço - é o caso de NaoAutorizado e do 404.
 */
const PAGE_COMPONENTS = {
  BoasVindas,
};

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
 * O carbonApi lança ErroInteracaoNecessaria (código 'interacao_necessaria') e
 * ErroApi com o código do backend, mas de propósito NÃO dispara loginRedirect de
 * dentro de um queryFn (um redirect no meio de um carregamento tira o usuário da
 * tela e pode entrar em loop se duas queries falharem juntas). Quem decide o que
 * mostrar é esta camada: observamos o cache do TanStack Query e, ao ver um dos
 * códigos acima, trocamos a árvore inteira por uma tela explicativa com ação.
 *
 * Fica DENTRO do QueryClientProvider (precisa do cache) e FORA do Router (a tela
 * é cheia, sem shell nem rota própria).
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

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <GuardaDeSessao>
          <Router>
            <ErrorBoundary>
              <Routes>
                {/* Home: o Carbon não tem dashboard próprio ainda, então a raiz cai na boas-vindas */}
                <Route path="/" element={<Navigate to={createPageUrl('BoasVindas')} replace />} />

                {/* Páginas com o shell (sidebar + topbar), geradas a partir do registro acima */}
                {Object.entries(PAGE_COMPONENTS).map(([nome, Pagina]) => (
                  <Route
                    key={nome}
                    path={createPageUrl(nome)}
                    element={
                      <Layout currentPageName={nome}>
                        <Pagina />
                      </Layout>
                    }
                  />
                ))}

                {/* Tela cheia, sem shell: quem cai aqui não passou na checagem de domínio */}
                <Route path={createPageUrl('NaoAutorizado')} element={<NaoAutorizado />} />

                {/* 404 também sem shell, para não sugerir navegação que não existe */}
                <Route path="*" element={<PaginaNaoEncontrada />} />
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

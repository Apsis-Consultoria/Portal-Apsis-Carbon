/**
 * SecureShare - lista das pastas compartilhadas com clientes.
 *
 * Equivalente a tela Secure Share do Portal Apsis, com duas diferencas visiveis
 * e uma invisivel:
 *
 *   - NAO existe filtro por area, nem campo de area no cadastro. O Secure Share
 *     do Carbon e de area unica (foi o pedido). As abas "M&A / Business
 *     Valuation / ..." do portal simplesmente nao fazem sentido aqui;
 *   - a lista traz o estado dos acessos (quantos clientes, quantos ainda sem
 *     credencial), que no portal so aparece abrindo o projeto;
 *   - invisivel: nada aqui fala com o Supabase nem com o Microsoft Graph
 *     diretamente. Tudo passa pela Edge Function carbon-api. Ver o cabecalho de
 *     src/lib/api/secureshare.js.
 *
 * AUTORIZACAO: quem pode criar e decidido no SERVIDOR (papel admin ou gestor,
 * 403 'sem_permissao'). A tela nao esconde o botao por perfil, pelo mesmo motivo
 * de Projetos.jsx: seria uma segunda fonte de verdade para a mesma regra.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus, X, ShieldCheck, Building2, Users, Calendar, Lock, MailWarning, FolderOpen,
  Globe2, ChevronRight,
} from 'lucide-react';

import { listarProjetos, criarProjeto, formatarApOs } from '@/lib/api/secureshare';
import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';
import { montarUrl, rotaDaPagina } from '@/lib/pageRoutes';

import Tabela from '@/components/ui/Tabela';
import Badge from '@/components/ui/Badge';
import Campo from '@/components/ui/Campo';
import CabecalhoSecao from '@/components/ui/CabecalhoSecao';
import PainelLateral from '@/components/ui/PainelLateral';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';

/* ===== Dominio ============================================================ */

const TOM_STATUS = { ativo: 'verde', encerrado: 'neutro' };
const ROTULO_STATUS = { ativo: 'Ativo', encerrado: 'Encerrado' };

/** URL do detalhe. Fallback plausivel se o registro da pagina sumir. */
function urlProjeto(id) {
  return (
    montarUrl('SecureShareProjeto', { id }) ??
    `/SecureShare/${encodeURIComponent(String(id ?? ''))}`
  );
}

function fmtData(valor) {
  if (!valor) return '-';
  const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (partes) return `${partes[3]}/${partes[2]}/${partes[1]}`;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
}

const FORM_VAZIO = { ap_os: '', semApOs: false, empresa: '', contatos: [{ nome: '', email: '' }] };

/* ===== Tela =============================================================== */

export default function SecureShare() {
  const msal = useMsal();
  const navegar = useNavigate();
  const cliente = useQueryClient();

  const autenticado = (msal.accounts?.length ?? 0) > 0;

  const query = useQuery({
    queryKey: ['carbon', 'secure-share', 'projetos'],
    queryFn: () => listarProjetos(msal),
    enabled: (MODO_DEMO && MODO_DEMO_ATIVO()) || autenticado,
  });

  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erros, setErros] = useState({});

  const projetos = query.data?.projetos ?? [];

  const criar = useMutation({
    mutationFn: (dados) => criarProjeto(msal, dados),
    onSuccess: (resposta) => {
      cliente.invalidateQueries({ queryKey: ['carbon', 'secure-share', 'projetos'] });
      setAberto(false);
      setForm(FORM_VAZIO);
      setErros({});

      // aviso_pasta nao e falha: o projeto existe e a pasta sera criada no
      // primeiro envio. Distinguir os dois evita a pessoa achar que precisa
      // cadastrar tudo de novo.
      if (resposta?.aviso_pasta) {
        toast.warning('Projeto criado, mas a pasta no SharePoint falhou.', {
          description: resposta.aviso_pasta,
          duration: 10000,
        });
      } else {
        toast.success('Projeto criado.', {
          description: 'A pasta foi criada no SharePoint. Envie os arquivos e depois libere os acessos.',
        });
      }

      const id = resposta?.projeto?.id;
      if (id) navegar(urlProjeto(id));
    },
    onError: (erro) => toast.error(erro.message),
  });

  /* ---- Formulario -------------------------------------------------------- */

  const atualizarContato = (indice, campo, valor) =>
    setForm((a) => {
      const contatos = [...a.contatos];
      contatos[indice] = { ...contatos[indice], [campo]: valor };
      return { ...a, contatos };
    });

  function validar() {
    const novos = {};
    if (!form.empresa.trim()) novos.empresa = 'Informe o nome da empresa.';
    if (!form.semApOs && !form.ap_os.trim()) {
      novos.ap_os = 'Informe o AP/OS ou marque que não há.';
    }

    // Contato e OPCIONAL aqui, ao contrario do portal, que exige pelo menos um.
    // Abrir a pasta antes de saber quem vai receber e o fluxo real: o AP abre,
    // os arquivos comecam a chegar e os contatos vem depois. O que validamos e
    // o que foi digitado.
    form.contatos.forEach((c, i) => {
      const email = c.email.trim();
      if (!email) return;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        novos[`contato-${i}`] = 'E-mail inválido.';
      } else if (email.toLowerCase().endsWith('@apsis.com.br')) {
        novos[`contato-${i}`] = 'E-mail @apsis não é cliente. Adicione depois em Equipe APSIS.';
      }
    });

    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  function salvar() {
    if (!validar()) return;
    criar.mutate({
      ap_os: form.semApOs ? null : form.ap_os.trim(),
      empresa: form.empresa.trim(),
      contatos: form.contatos
        .filter((c) => c.email.trim())
        .map((c) => ({ nome: c.nome.trim(), email: c.email.trim() })),
    });
  }

  /* ---- Colunas ----------------------------------------------------------- */

  const colunas = useMemo(
    () => [
      {
        chave: 'empresa',
        titulo: 'Cliente',
        larguraMinima: 260,
        render: (l) => (
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {l.ap_os ? (
                <span className="font-semibold text-[#1A4731]">{l.ap_os}</span>
              ) : (
                <Badge tom="neutro" tamanho="sm">Sem AP/OS</Badge>
              )}
              <span className="text-[#5C7060] truncate">{l.empresa}</span>
            </div>
            <p className="text-[11px] text-[#8A9990] truncate mt-0.5 flex items-center gap-1">
              <FolderOpen size={11} /> {l.pasta}
            </p>
          </div>
        ),
      },
      {
        chave: 'clientes',
        titulo: 'Acessos',
        larguraMinima: 170,
        render: (l) => (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-[#5C7060]">
              <Users size={12} /> {l.clientes ?? 0}
            </span>
            {/* Cliente cadastrado e sem credencial e o erro operacional mais
                comum desta tela: alguem cadastra e esquece de enviar o acesso.
                Fica visivel na LISTA, nao so dentro do projeto. */}
            {(l.clientes_sem_acesso ?? 0) > 0 && (
              <Badge tom="ambar" tamanho="sm" icone={MailWarning}>
                {l.clientes_sem_acesso} sem acesso
              </Badge>
            )}
            {(l.restricoes ?? 0) > 0 && (
              <Badge tom="azul" tamanho="sm" icone={Lock}>
                {l.restricoes}
              </Badge>
            )}
          </div>
        ),
      },
      {
        chave: 'ultimo_acesso',
        titulo: 'Último acesso',
        larguraMinima: 130,
        render: (l) =>
          l.ultimo_acesso ? (
            <span className="text-xs text-[#5C7060]">
              {new Date(l.ultimo_acesso).toLocaleDateString('pt-BR')}
            </span>
          ) : (
            <span className="text-xs text-[#8A9990]">Nunca abriu</span>
          ),
      },
      {
        chave: 'criado_em',
        titulo: 'Criado',
        larguraMinima: 110,
        render: (l) => (
          <span className="text-xs text-[#5C7060] inline-flex items-center gap-1">
            <Calendar size={11} /> {fmtData(l.criado_em)}
          </span>
        ),
      },
      {
        chave: 'status',
        titulo: 'Status',
        larguraMinima: 110,
        render: (l) => (
          <Badge tom={TOM_STATUS[l.status] ?? 'neutro'}>
            {ROTULO_STATUS[l.status] ?? l.status}
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <CabecalhoSecao
        titulo="Pastas compartilhadas"
        descricao={
          query.isLoading
            ? 'Carregando...'
            : `${projetos.length} ${projetos.length === 1 ? 'projeto' : 'projetos'} que você acompanha`
        }
        acao={
          <BotaoPrimario icone={Plus} onClick={() => setAberto(true)}>
            Novo projeto
          </BotaoPrimario>
        }
      />

      {(MODO_DEMO && MODO_DEMO_ATIVO()) && (
        <AvisoDiscreto tom="azul" titulo="Modo demonstração.">
          Os projetos e os arquivos abaixo são fictícios e nada é enviado ao SharePoint.
          Nenhum e-mail sai daqui.
        </AvisoDiscreto>
      )}

      {/* ===== Pasta Geral ==================================================
          FORA DA TABELA de propósito, e acima dela. A Geral não é um projeto:
          não tem cliente, não tem AP/OS, não tem prazo e não tem permissão por
          item. Como linha da tabela, quatro das cinco colunas ficariam vazias e
          ela pareceria um projeto mal cadastrado.

          O verde da marca (#1A4731) sustenta o bloco. É a diferença visual em
          relação ao Portal Apsis, que nesta tela usava só os cinzas: aqui o
          verde marca o que é do Carbon, e o laranja fica reservado para ação. */}
      <button
        type="button"
        onClick={() => navegar(rotaDaPagina('SecureShareGeral') ?? '/SecureShare/Geral')}
        className="w-full text-left group rounded-xl border border-[#1A4731]/20 bg-[#1A4731]/[0.04]
                   hover:bg-[#1A4731]/[0.07] hover:border-[#1A4731]/35
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F47920]
                   transition-colors px-4 py-3.5 flex items-center gap-3.5"
      >
        <span className="shrink-0 w-10 h-10 rounded-lg bg-[#1A4731] flex items-center justify-center">
          <Globe2 size={19} className="text-white" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#1A4731]">Pasta Geral</span>
            <Badge tom="verde" tamanho="sm">Todos os clientes</Badge>
          </span>
          <span className="block text-xs text-[#5C7060] mt-0.5">
            O que você sobe aqui aparece para todos os clientes, de todos os projetos.
            Somente leitura para eles.
          </span>
        </span>
        <ChevronRight
          size={18}
          className="shrink-0 text-[#8A9990] group-hover:text-[#1A4731] transition-colors"
        />
      </button>

      <Tabela
        legenda="Pastas compartilhadas com clientes no Secure Share"
        colunas={colunas}
        dados={projetos}
        chaveLinha={(l) => l.id}
        carregando={query.isLoading}
        erro={query.isError ? query.error?.message : false}
        iconeVazio={ShieldCheck}
        tituloVazio="Nenhuma pasta compartilhada ainda"
        textoVazio="Crie um projeto para abrir uma pasta no SharePoint e liberar acesso nominal aos contatos do cliente, com prazo e permissão por arquivo."
        acaoVazio={
          <BotaoPrimario icone={Plus} onClick={() => setAberto(true)}>
            Novo projeto
          </BotaoPrimario>
        }
        onLinhaClick={(l) => navegar(urlProjeto(l.id))}
        rotuloLinha={(l) => `Abrir ${l.ap_os ? `${l.ap_os} ` : ''}${l.empresa}`}
        classeLinha={(l) => (l.status === 'encerrado' ? 'opacity-60' : '')}
      />

      {/* ===== Novo projeto ================================================= */}
      <PainelLateral
        aberto={aberto}
        onFechar={() => setAberto(false)}
        icone={ShieldCheck}
        titulo="Novo projeto"
        subtitulo="Abre a pasta no SharePoint e cadastra os contatos do cliente."
        largura="lg"
        fecharAoClicarFora={!form.empresa && !form.ap_os}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario variante="fantasma" onClick={() => setAberto(false)}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={salvar} carregando={criar.isPending}>
              Criar projeto
            </BotaoPrimario>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="AP/OS"
              valor={form.ap_os}
              desabilitado={form.semApOs}
              placeholder={form.semApOs ? 'Sem AP/OS' : 'AP-XXXXX/XX-XXX'}
              dica={
                form.semApOs
                  ? 'A pasta usará apenas o nome da empresa.'
                  : 'Digite só os números: o formato é aplicado sozinho.'
              }
              erro={erros.ap_os}
              onChange={(v) => setForm((a) => ({ ...a, ap_os: formatarApOs(v) }))}
            />
            <Campo
              rotulo="Nome da empresa"
              obrigatorio
              valor={form.empresa}
              placeholder="Ex.: Reflorestadora Exemplo S.A."
              erro={erros.empresa}
              onChange={(v) => setForm((a) => ({ ...a, empresa: v }))}
              extras={{ maxLength: 200 }}
            />
          </div>

          <Campo
            rotulo="Não há AP/OS para este cliente"
            tipo="checkbox"
            valor={form.semApOs}
            onChange={(v) => setForm((a) => ({ ...a, semApOs: v, ap_os: v ? '' : a.ap_os }))}
          />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A9990] mb-2">
              Contatos do cliente
            </p>
            <div className="space-y-3">
              {form.contatos.map((contato, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Campo
                    rotulo={i === 0 ? 'Nome' : ''}
                    valor={contato.nome}
                    placeholder="Nome da pessoa"
                    className="flex-1"
                    onChange={(v) => atualizarContato(i, 'nome', v)}
                    extras={{ maxLength: 200 }}
                  />
                  <Campo
                    rotulo={i === 0 ? 'E-mail' : ''}
                    tipo="email"
                    valor={contato.email}
                    placeholder="email@empresa.com"
                    className="flex-1"
                    erro={erros[`contato-${i}`]}
                    onChange={(v) => atualizarContato(i, 'email', v)}
                    extras={{ maxLength: 320 }}
                  />
                  {form.contatos.length > 1 && (
                    <BotaoSecundario
                      variante="fantasma"
                      icone={X}
                      tamanho="sm"
                      rotuloAcessivel={`Remover o contato ${i + 1}`}
                      className={i === 0 ? 'mt-6' : ''}
                      onClick={() =>
                        setForm((a) => ({ ...a, contatos: a.contatos.filter((_, j) => j !== i) }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            <BotaoSecundario
              variante="fantasma"
              icone={Plus}
              tamanho="sm"
              className="mt-2"
              onClick={() =>
                setForm((a) => ({ ...a, contatos: [...a.contatos, { nome: '', email: '' }] }))
              }
            >
              Adicionar outro contato
            </BotaoSecundario>
          </div>

          <AvisoDiscreto tom="ambar" titulo="O acesso não é enviado agora." icone={Building2}>
            Os contatos entram cadastrados e <strong>sem senha</strong>. Depois de subir os
            arquivos, abra o projeto e clique em <strong>Enviar acesso</strong> em cada pessoa:
            é aí que a senha é gerada e o e-mail sai.
          </AvisoDiscreto>
        </div>
      </PainelLateral>
    </div>
  );
}

/**
 * GestaoAcessos - cargos e quem tem cada um.
 *
 * DUAS LISTAS, e a ordem entre elas e a ordem do trabalho: primeiro se desenha o
 * cargo, depois se coloca gente nele. Invertido, a tela pediria para escolher um
 * cargo que ainda nao existe.
 *
 * VER E EDITAR SAO A MESMA PERMISSAO, por decisao do dono. Marcar a area no
 * cargo da leitura E escrita naquela area; desmarcar tira as duas. Nao existe
 * nivel intermediario, e e por isso que a tela usa caixa de marcar e nao um
 * seletor de tres estados - representar um nivel que o servidor nao tem seria
 * mentir para quem opera.
 *
 * NADA AQUI AUTORIZA NADA. O portao esta no carbon-api, conferido antes de cada
 * handler: esconder item de menu e conveniencia, e um item escondido continua
 * recusado no servidor se alguem digitar a URL.
 */

import { useMemo, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, ShieldCheck, Users, Trash2, Pencil, KeyRound, UserCog } from 'lucide-react';

import {
  listarAreas, listarCargos, criarCargo, atualizarCargo, apagarCargo,
  listarPessoas, atualizarPessoa, ERROS_ACESSOS,
} from '@/lib/api/acessos';
import { MODO_DEMO, MODO_DEMO_ATIVO } from '@/lib/runtimeConfig';

import Tabela from '@/components/ui/Tabela';
import Badge from '@/components/ui/Badge';
import Campo from '@/components/ui/Campo';
import Cartao from '@/components/ui/Cartao';
import CabecalhoSecao from '@/components/ui/CabecalhoSecao';
import PainelLateral from '@/components/ui/PainelLateral';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';
import AvisoDiscreto from '@/components/ui/AvisoDiscreto';

/** Traduz o codigo do backend, com queda para a mensagem que ja veio pronta. */
const textoDoErro = (e) => ERROS_ACESSOS[e?.codigo] ?? e?.message ?? 'Não foi possível salvar.';

const FORM_VAZIO = { nome: '', descricao: '', areas: [] };

export default function GestaoAcessos() {
  const msal = useMsal();
  const cache = useQueryClient();
  const autenticado = (msal.accounts?.length ?? 0) > 0;
  const ligado = (MODO_DEMO && MODO_DEMO_ATIVO()) || autenticado;

  const qAreas = useQuery({
    queryKey: ['carbon', 'acessos', 'areas'],
    queryFn: () => listarAreas(msal),
    enabled: ligado,
  });
  const qCargos = useQuery({
    queryKey: ['carbon', 'acessos', 'cargos'],
    queryFn: () => listarCargos(msal),
    enabled: ligado,
  });
  const qPessoas = useQuery({
    queryKey: ['carbon', 'acessos', 'pessoas'],
    queryFn: () => listarPessoas(msal),
    enabled: ligado,
  });

  const areas = qAreas.data?.areas ?? [];
  const cargos = qCargos.data?.cargos ?? [];
  const pessoas = qPessoas.data?.pessoas ?? [];

  const recarregar = () => {
    cache.invalidateQueries({ queryKey: ['carbon', 'acessos'] });
    // O menu da propria pessoa pode ter mudado: /me carrega as areas efetivas.
    cache.invalidateQueries({ queryKey: ['carbon', 'me'] });
  };

  const [painel, setPainel] = useState(null); // null | 'novo' | { ...cargo }
  const [form, setForm] = useState(FORM_VAZIO);
  const [erros, setErros] = useState({});

  const nomeDoCargo = useMemo(
    () => Object.fromEntries(cargos.map((c) => [c.id, c.nome])),
    [cargos],
  );

  /* ---- Cargos ------------------------------------------------------------ */

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setErros({});
    setPainel('novo');
  }

  function abrirEdicao(cargo) {
    setForm({
      nome: cargo.nome ?? '',
      descricao: cargo.descricao ?? '',
      areas: [...(cargo.areas ?? [])],
    });
    setErros({});
    setPainel(cargo);
  }

  const salvar = useMutation({
    mutationFn: (dados) =>
      painel === 'novo' ? criarCargo(msal, dados) : atualizarCargo(msal, painel.id, dados),
    onSuccess: () => {
      recarregar();
      setPainel(null);
      toast.success(painel === 'novo' ? 'Cargo criado.' : 'Cargo atualizado.');
    },
    onError: (e) => toast.error(textoDoErro(e)),
  });

  const apagar = useMutation({
    mutationFn: (id) => apagarCargo(msal, id),
    onSuccess: () => {
      recarregar();
      toast.success('Cargo apagado.', {
        description: 'Quem tinha esse cargo ficou sem cargo, e aparece assim na lista abaixo.',
      });
    },
    onError: (e) => toast.error(textoDoErro(e)),
  });

  function confirmarSalvar() {
    const novos = {};
    if (!form.nome.trim()) novos.nome = 'Dê um nome ao cargo.';
    setErros(novos);
    if (Object.keys(novos).length) return;

    salvar.mutate({
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      areas: form.areas,
    });
  }

  const alternarArea = (chave) =>
    setForm((a) => ({
      ...a,
      areas: a.areas.includes(chave)
        ? a.areas.filter((x) => x !== chave)
        : [...a.areas, chave],
    }));

  /* ---- Pessoas ----------------------------------------------------------- */

  const mudarPessoa = useMutation({
    mutationFn: ({ id, dados }) => atualizarPessoa(msal, id, dados),
    onSuccess: () => {
      recarregar();
      toast.success('Acesso atualizado.');
    },
    onError: (e) => toast.error(textoDoErro(e)),
  });

  /* ---- Colunas ----------------------------------------------------------- */

  const colunasCargos = useMemo(
    () => [
      {
        chave: 'nome',
        titulo: 'Cargo',
        larguraMinima: 240,
        render: (c) => (
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[#1A4731]">{c.nome}</span>
              {!c.ativo && <Badge tom="neutro" tamanho="sm">Inativo</Badge>}
            </div>
            {c.descricao && (
              <p className="text-[11px] text-[#8A9990] truncate mt-0.5">{c.descricao}</p>
            )}
          </div>
        ),
      },
      {
        chave: 'areas',
        titulo: 'Abre estas áreas',
        larguraMinima: 300,
        render: (c) => {
          const lista = c.areas ?? [];
          if (!lista.length) {
            return <span className="text-xs text-[#8A9990]">Nenhuma área</span>;
          }
          const rotulos = areas.filter((a) => lista.includes(a.chave));
          return (
            <div className="flex flex-wrap gap-1">
              {rotulos.map((a) => (
                <Badge key={a.chave} tom={a.chave === 'acessos' ? 'laranja' : 'verde'} tamanho="sm">
                  {a.label}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        chave: 'pessoas',
        titulo: 'Pessoas',
        larguraMinima: 90,
        render: (c) => (
          <span className="inline-flex items-center gap-1 text-xs text-[#5C7060]">
            <Users size={12} /> {c.pessoas ?? 0}
          </span>
        ),
      },
      {
        chave: 'acoes',
        titulo: '',
        larguraMinima: 90,
        render: (c) => (
          <div className="flex items-center gap-1 justify-end">
            <BotaoSecundario
              variante="fantasma"
              icone={Pencil}
              tamanho="sm"
              rotuloAcessivel={`Editar o cargo ${c.nome}`}
              onClick={(e) => { e.stopPropagation(); abrirEdicao(c); }}
            />
            <BotaoSecundario
              variante="fantasma"
              icone={Trash2}
              tamanho="sm"
              rotuloAcessivel={`Apagar o cargo ${c.nome}`}
              onClick={(e) => {
                e.stopPropagation();
                // Sem confirmacao dupla: o servidor RECUSA apagar o ultimo cargo
                // que administra acessos, que e o unico dano irreversivel aqui.
                // Apagar um cargo comum deixa as pessoas sem cargo, estado
                // visivel e reversivel em dois cliques.
                apagar.mutate(c.id);
              }}
            />
          </div>
        ),
      },
    ],
    [areas],
  );

  const colunasPessoas = useMemo(
    () => [
      {
        chave: 'pessoa',
        titulo: 'Pessoa',
        larguraMinima: 260,
        render: (p) => (
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[#1A4731]">{p.nome || p.email}</span>
              {!p.ativo && <Badge tom="vermelho" tamanho="sm">Desativada</Badge>}
            </div>
            <p className="text-[11px] text-[#8A9990] truncate mt-0.5">{p.email}</p>
          </div>
        ),
      },
      {
        chave: 'cargo',
        titulo: 'Cargo',
        larguraMinima: 220,
        render: (p) => (
          <select
            value={p.cargo_id ?? ''}
            aria-label={`Cargo de ${p.nome || p.email}`}
            className="w-full text-xs rounded-lg border border-[#DDE3DE] bg-white px-2 py-1.5
                       text-[#1A2B1F] focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            onChange={(e) =>
              mudarPessoa.mutate({ id: p.id, dados: { cargo_id: e.target.value || null } })
            }
          >
            <option value="">Sem cargo (regra antiga do papel)</option>
            {cargos.filter((c) => c.ativo).map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        ),
      },
      {
        chave: 'papel',
        titulo: 'Papel',
        larguraMinima: 110,
        render: (p) => (
          <Badge tom={p.papel === 'admin' ? 'laranja' : 'neutro'} tamanho="sm">
            {p.papel}
          </Badge>
        ),
      },
      {
        chave: 'ativo',
        titulo: '',
        larguraMinima: 110,
        render: (p) => (
          <BotaoSecundario
            variante="fantasma"
            tamanho="sm"
            onClick={() => mudarPessoa.mutate({ id: p.id, dados: { ativo: !p.ativo } })}
          >
            {p.ativo ? 'Desativar' : 'Reativar'}
          </BotaoSecundario>
        ),
      },
    ],
    [cargos],
  );

  const semCargo = pessoas.filter((p) => p.ativo && !p.cargo_id).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <CabecalhoSecao
        icone={KeyRound}
        titulo="Gestão de acessos"
        descricao="Crie cargos e defina quem tem cada um"
        acao={<BotaoPrimario icone={Plus} onClick={abrirNovo}>Novo cargo</BotaoPrimario>}
      />

      <AvisoDiscreto tom="azul" titulo="Quem vê a área, edita a área." icone={ShieldCheck}>
        Não existe &quot;ver sem editar&quot;: marcar uma área no cargo dá leitura e escrita
        nela. Se alguém precisa de um recorte diferente, crie <strong>outro cargo</strong> em
        vez de abrir exceção para a pessoa. Assim, quando alguém não enxergar uma tela, há um
        só lugar para olhar.
      </AvisoDiscreto>

      {semCargo > 0 && (
        <AvisoDiscreto tom="ambar" titulo="Ainda há gente sem cargo." icone={UserCog}>
          {semCargo} {semCargo === 1 ? 'pessoa ativa continua' : 'pessoas ativas continuam'} sem
          cargo, e para {semCargo === 1 ? 'ela' : 'elas'} ainda vale a regra antiga: admin e
          gestor escrevem em tudo, colaborador não vê nada além do início. Atribuir um cargo
          substitui essa regra.
        </AvisoDiscreto>
      )}

      <Cartao titulo="Cargos" subtitulo={`${cargos.length} cargo(s)`}>
        <Tabela
          legenda="Cargos e as áreas que cada um abre"
          colunas={colunasCargos}
          dados={cargos}
          chaveLinha={(c) => c.id}
          carregando={qCargos.isLoading}
          erro={qCargos.isError ? qCargos.error?.message : false}
          iconeVazio={ShieldCheck}
          tituloVazio="Nenhum cargo ainda"
          textoVazio="Crie um cargo, marque as áreas que ele abre e depois atribua às pessoas na lista abaixo."
          acaoVazio={<BotaoPrimario icone={Plus} onClick={abrirNovo}>Novo cargo</BotaoPrimario>}
          onLinhaClick={(c) => abrirEdicao(c)}
          rotuloLinha={(c) => `Editar o cargo ${c.nome}`}
          classeLinha={(c) => (c.ativo ? '' : 'opacity-60')}
        />
      </Cartao>

      <Cartao titulo="Pessoas" subtitulo={`${pessoas.length} colaborador(es)`}>
        <Tabela
          legenda="Colaboradores e o cargo de cada um"
          colunas={colunasPessoas}
          dados={pessoas}
          chaveLinha={(p) => p.id}
          carregando={qPessoas.isLoading}
          erro={qPessoas.isError ? qPessoas.error?.message : false}
          iconeVazio={Users}
          tituloVazio="Nenhum colaborador ainda"
          textoVazio="A lista é preenchida sozinha: cada pessoa aparece aqui no primeiro login pelo Azure."
        />
      </Cartao>

      {/* ===== Cargo ======================================================== */}
      <PainelLateral
        aberto={painel !== null}
        onFechar={() => setPainel(null)}
        icone={ShieldCheck}
        titulo={painel === 'novo' ? 'Novo cargo' : `Editar ${painel?.nome ?? ''}`}
        subtitulo="Marque as áreas que este cargo abre. Marcar dá leitura e escrita."
        largura="lg"
        fecharAoClicarFora={!form.nome}
        rodape={
          <div className="flex items-center justify-end gap-2">
            <BotaoSecundario variante="fantasma" onClick={() => setPainel(null)}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario onClick={confirmarSalvar} carregando={salvar.isPending}>
              {painel === 'novo' ? 'Criar cargo' : 'Salvar'}
            </BotaoPrimario>
          </div>
        }
      >
        <div className="space-y-5">
          <Campo
            rotulo="Nome do cargo"
            obrigatorio
            valor={form.nome}
            placeholder="Ex.: Analista de campo"
            erro={erros.nome}
            onChange={(v) => setForm((a) => ({ ...a, nome: v }))}
            extras={{ maxLength: 120 }}
          />
          <Campo
            rotulo="Descrição"
            valor={form.descricao}
            placeholder="Para que serve este cargo"
            onChange={(v) => setForm((a) => ({ ...a, descricao: v }))}
            extras={{ maxLength: 400 }}
          />

          {painel !== 'novo' && (
            <Campo
              rotulo="Cargo ativo"
              tipo="checkbox"
              valor={painel?.ativo ?? true}
              dica="Cargo inativo não dá acesso nenhum, e não perde o desenho nem quem o tinha."
              onChange={(v) => atualizarCargo(msal, painel.id, { ativo: v })
                .then(() => { recarregar(); setPainel({ ...painel, ativo: v }); })
                .catch((e) => toast.error(textoDoErro(e)))}
            />
          )}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A9990] mb-2">
              Áreas do sistema
            </p>
            <div className="space-y-1.5">
              {areas.map((a) => {
                const sempre = a.sempre_liberada;
                const marcada = sempre || form.areas.includes(a.chave);
                return (
                  <label
                    key={a.chave}
                    className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
                      sempre
                        ? 'border-[#DDE3DE] bg-[#F4F6F4] cursor-default'
                        : marcada
                          ? 'border-[#1A4731]/35 bg-[#1A4731]/[0.05] cursor-pointer'
                          : 'border-[#DDE3DE] bg-white hover:border-[#1A4731]/25 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-[#1A4731]"
                      checked={marcada}
                      disabled={sempre}
                      onChange={() => alternarArea(a.chave)}
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[#1A2B1F]">{a.label}</span>
                        {sempre && <Badge tom="neutro" tamanho="sm">Todos têm</Badge>}
                        {a.chave === 'acessos' && (
                          <Badge tom="laranja" tamanho="sm">Administra acessos</Badge>
                        )}
                      </span>
                      {a.descricao && (
                        <span className="block text-[11px] text-[#8A9990] mt-0.5">
                          {a.descricao}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <AvisoDiscreto tom="ambar" titulo="Cuidado com a área Gestão de acessos.">
            Quem tem essa área cria e apaga cargos, inclusive o seu. O sistema recusa deixar
            <strong> ninguém</strong> com ela: se esta for a última pessoa, a mudança volta com
            erro em vez de trancar todo mundo do lado de fora.
          </AvisoDiscreto>
        </div>
      </PainelLateral>
    </div>
  );
}

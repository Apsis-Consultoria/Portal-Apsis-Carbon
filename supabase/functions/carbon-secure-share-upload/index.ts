// -----------------------------------------------------------------------------
// carbon-secure-share-upload - envio de arquivos para a pasta de um projeto.
// -----------------------------------------------------------------------------
// POST carbon-secure-share-upload
//   multipart/form-data:
//     projeto_id  uuid do projeto (obrigatorio)
//     sub         subpasta relativa, opcional ('Anexos', 'Anexos/2026')
//     arquivo     um ou mais arquivos
//     caminho     um por arquivo, na MESMA ordem, com a subpasta de origem do
//                 arquivo quando a pessoa arrastou uma pasta inteira
//
// POR QUE UMA FUNCAO SEPARADA E NAO UMA ROTA DO carbon-api: o roteador do
// carbon-api le todo corpo nao-GET como JSON (lerCorpo no index.ts) e devolve
// corpo_invalido para qualquer outra coisa. Fazer binario passar por la exigiria
// mudar o contrato de corpo de TODAS as rotas de TODOS os dominios, por causa de
// uma unica rota. A autenticacao e a autorizacao sao as mesmas, reaproveitadas
// dos mesmos helpers.
//
// LIMITE. Edge Function do Supabase tem teto de corpo por requisicao e tempo de
// execucao curto. Aqui aceitamos ate LIMITE_ARQUIVO_BYTES por arquivo e enviamos
// com upload simples do Graph. Arquivo maior precisa de sessao resumavel
// (createUploadSession), que e trabalho proprio: o portal do cliente do
// secure_share ja tem isso em upload-large, e o mesmo caminho vale aqui quando
// aparecer a necessidade. Recusamos com mensagem explicita em vez de falhar no
// meio e deixar arquivo parcial na pasta.

import { tratarOptions, respostaErro, respostaJson, CORS_HEADERS } from '../_shared/cors.ts';
import { obterAdmin } from '../_shared/supabaseAdmin.ts';
import { validarTokenAzure } from '../_shared/azureAuth.ts';
import type { ConfigApp, ConfigAzure } from '../_shared/azureAuth.ts';
import {
  ErroGraph,
  caminhoNaBiblioteca,
  garantirPasta,
  obterDriveId,
  obterTokenApp,
} from '../_shared/graph.ts';

const LIMITE_ARQUIVO_BYTES = 200 * 1024 * 1024; // 200 MB
const LIMITE_ARQUIVOS = 50;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Identificador reservado da pasta GERAL, o mesmo do portal do cliente.
 *
 * Enviar para ela e privilegio da equipe da APSIS: o cliente so LE. Por isso o
 * portao de papel (admin ou gestor) mais acima ja e a autorizacao - nao ha
 * projeto para conferir vinculo, porque a Geral nao pertence a projeto nenhum.
 *
 * ATENCAO OPERACIONAL: o que entra aqui aparece para TODOS os clientes de TODOS
 * os projetos. Documento de um cliente especifico NAO vai aqui.
 */
const ID_GERAL = 'geral';

// Ver a nota em rotas/secureshare.ts: e uma PASTA dentro da biblioteca que a
// APSIS ja usa, nao uma biblioteca separada.
const CONFIG_PADRAO = {
  siteHost: 'apsisconsult.sharepoint.com',
  sitePath: '/sites/Projetos',
  biblioteca: 'Secure Share',
  pastaBase: 'Apsis Carbon',
  pastaGeral: 'Geral',
};

/** Caminho de item codificado segmento a segmento (barras precisam sobreviver). */
function caminhoGraph(caminho: string): string {
  return caminho.split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

/**
 * Mesmo calculo de public.carbon_secure_share_nome_pasta.
 *
 * Barra vira HIFEN, nao some: e a convencao do SharePoint da APSIS. Remove-la
 * apontaria para uma pasta diferente da que a equipe ja usa.
 */
function limparParte(valor: string): string {
  return valor.replace(/[/\\]/g, '-').replace(/["*:<>?|]/g, '').trim();
}

function nomePasta(apOs: string | null, empresa: string): string {
  const e = limparParte(empresa ?? '');
  const a = limparParte(apOs ?? '');
  const bruto = a && e ? `${a} - ${e}` : a || e;
  return bruto.replace(/\s+/g, ' ').trim().replace(/[ .]+$/, '');
}

/**
 * Sanitiza o nome de um arquivo ou de um segmento de subpasta.
 *
 * Vem do navegador, portanto e entrada nao confiavel: '../' aqui escreveria
 * fora da pasta do projeto, na biblioteca inteira. Removemos os caracteres que o
 * SharePoint proibe e barramos travessia.
 */
function nomeSeguro(bruto: string): string | null {
  const limpo = bruto.replace(/["*:<>?/\\|]/g, '').replace(/\s+/g, ' ').trim().replace(/[ .]+$/, '');
  if (!limpo || limpo === '.' || limpo === '..') return null;
  return limpo.slice(0, 240);
}

/** Subcaminho relativo sanitizado segmento a segmento, ou null se invalido. */
function subCaminhoSeguro(bruto: string): string | null {
  if (!bruto) return '';
  const partes = bruto.split('/').map(nomeSeguro);
  if (partes.some((p) => p === null)) return null;
  return partes.filter(Boolean).join('/');
}

/**
 * Config de autenticacao, no mesmo formato que o carbon-api monta.
 *
 * Duplicada aqui, e nao importada do index.ts do carbon-api, porque cada Edge
 * Function e um bundle proprio: importar de outra funcao arrastaria o roteador
 * inteiro para dentro deste isolate. Sao dois blocos de carbon_app_config, e a
 * fonte de verdade continua sendo o banco.
 */
async function carregarConfigAuth(): Promise<{ azure: ConfigAzure; app: ConfigApp } | null> {
  const admin = obterAdmin();

  const { data, error } = await admin
    .from('carbon_app_config')
    .select('chave, valor')
    .in('chave', ['azure', 'app']);

  if (error) {
    console.error('Falha ao ler carbon_app_config:', error.message);
    return null;
  }

  const mapa: Record<string, Record<string, unknown>> = {};
  for (const linha of (data ?? []) as { chave: string; valor: Record<string, unknown> }[]) {
    mapa[linha.chave] = linha.valor ?? {};
  }
  if (!mapa.azure || !mapa.app) {
    console.error('Blocos azure e/ou app ausentes em carbon_app_config. Rode a migration.');
    return null;
  }

  return {
    azure: {
      clientId: String(mapa.azure.clientId ?? ''),
      tenantId: String(mapa.azure.tenantId ?? ''),
    },
    app: { dominioPermitido: String(mapa.app.dominioPermitido ?? '') },
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = tratarOptions(req);
  if (preflight) {
    return new Response(null, {
      status: 204,
      headers: { ...CORS_HEADERS, 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
    });
  }

  if (req.method !== 'POST') return respostaErro('metodo_nao_permitido', 405);

  try {
    // ---- Autenticacao -------------------------------------------------------
    // Mesmo portao do carbon-api: ID token do Azure AD validado contra o JWKS da
    // Microsoft (aud, iss, tid) e dominio do e-mail conferido.
    const cfgAuth = await carregarConfigAuth();
    if (!cfgAuth) return respostaErro('config_indisponivel', 500);

    const validacao = await validarTokenAzure(req, cfgAuth);
    if (!validacao.ok) return respostaErro(validacao.erro, validacao.status);

    const admin = obterAdmin();

    // Sem upsert aqui de proposito: garantirUsuario vive no carbon-api e e o
    // dono do autoprovisionamento. Quem chega ao upload ja carregou a tela, ou
    // seja ja passou pelo carbon-api e ja tem linha.
    const { data: registro } = await admin
      .from('carbon_usuarios')
      .select('id, papel, ativo')
      .eq('email', validacao.email)
      .maybeSingle();

    if (!registro) return respostaErro('nao_autenticado', 401);
    if (!registro.ativo) return respostaErro('usuario_inativo', 403);

    const papel = String(registro.papel ?? '').toLowerCase();
    if (!['admin', 'gestor'].includes(papel)) return respostaErro('sem_permissao', 403);

    // ---- Corpo --------------------------------------------------------------
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return respostaErro('corpo_invalido', 400);
    }

    const projetoId = String(form.get('projeto_id') ?? '');
    const paraGeral = projetoId === ID_GERAL;
    if (!paraGeral && !UUID_RE.test(projetoId)) return respostaErro('id_invalido', 400);

    const sub = subCaminhoSeguro(String(form.get('sub') ?? '').trim());
    if (sub === null) return respostaErro('campo_invalido', 400, 'sub');

    const arquivos = form.getAll('arquivo').filter((f): f is File => f instanceof File);
    if (!arquivos.length) return respostaErro('campo_obrigatorio', 400, 'arquivo');
    if (arquivos.length > LIMITE_ARQUIVOS) {
      return respostaErro('arquivos_demais', 400, `maximo de ${LIMITE_ARQUIVOS} por envio`);
    }

    // Caminhos de origem, um por arquivo e na mesma ordem. Vem preenchido quando
    // a pessoa arrastou uma PASTA: e o que preserva a estrutura no destino.
    const caminhos = form.getAll('caminho').map((c) => String(c ?? ''));

    // ---- Autorizacao no destino --------------------------------------------
    // A GERAL nao pertence a projeto nenhum: quem autoriza e o papel (admin ou
    // gestor), ja conferido acima. Nao ha vinculo de equipe a checar.
    let projeto: {
      id: string; ap_os: string | null; empresa: string;
      pasta: string | null; status: string; criado_por: string | null;
    } | null = null;

    if (!paraGeral) {
      const { data } = await admin
        .from('carbon_secure_share_projetos')
        .select('id, ap_os, empresa, pasta, status, criado_por')
        .eq('id', projetoId)
        .maybeSingle();

      if (!data) return respostaErro('nao_encontrado', 404);
      if (data.status !== 'ativo') return respostaErro('projeto_encerrado', 409);
      projeto = data;

      if (papel !== 'admin' && projeto.criado_por !== registro.id) {
        const { count } = await admin
          .from('carbon_secure_share_equipe')
          .select('projeto_id', { count: 'exact', head: true })
          .eq('projeto_id', projetoId)
          .eq('usuario_id', registro.id);
        // 404 e nao 403: confirmar a existencia do projeto ja diria que a
        // empresa e cliente do Carbon.
        if (!count) return respostaErro('nao_encontrado', 404);
      }
    }

    // ---- Configuracao -------------------------------------------------------
    const { data: linhaConfig } = await admin
      .from('carbon_app_config')
      .select('valor')
      .eq('chave', 'secure_share')
      .maybeSingle();

    const bruto = (linhaConfig?.valor ?? {}) as Record<string, unknown>;
    const cfg = {
      siteHost: typeof bruto.siteHost === 'string' && bruto.siteHost ? bruto.siteHost : CONFIG_PADRAO.siteHost,
      sitePath: typeof bruto.sitePath === 'string' && bruto.sitePath ? bruto.sitePath : CONFIG_PADRAO.sitePath,
      biblioteca:
        typeof bruto.biblioteca === 'string' && bruto.biblioteca
          ? bruto.biblioteca
          : CONFIG_PADRAO.biblioteca,
      // String vazia e valor VALIDO (raiz da biblioteca).
      pastaBase:
        typeof bruto.pastaBase === 'string' ? bruto.pastaBase.trim() : CONFIG_PADRAO.pastaBase,
      pastaGeral:
        typeof bruto.pastaGeral === 'string' && bruto.pastaGeral.trim()
          ? bruto.pastaGeral.trim()
          : CONFIG_PADRAO.pastaGeral,
    };

    const base = paraGeral
      ? caminhoNaBiblioteca(cfg, cfg.pastaGeral)
      : caminhoNaBiblioteca(
          cfg,
          projeto!.pasta || nomePasta(projeto!.ap_os, projeto!.empresa),
        );

    // ---- Envio --------------------------------------------------------------
    const driveId = await obterDriveId(cfg);
    const token = await obterTokenApp();

    const enviados: string[] = [];
    const falhas: { arquivo: string; motivo: string }[] = [];

    // Garantimos cada pasta UMA vez por envio: uma pasta arrastada com 200
    // arquivos faria 200 checagens identicas no Graph, e cada uma e uma ida a
    // rede que conta contra o tempo de execucao da funcao.
    const pastasGarantidas = new Set<string>();

    for (let i = 0; i < arquivos.length; i++) {
      const arquivo = arquivos[i];
      const nome = nomeSeguro(arquivo.name);

      if (!nome) {
        falhas.push({ arquivo: arquivo.name, motivo: 'Nome de arquivo invalido.' });
        continue;
      }
      if (arquivo.size > LIMITE_ARQUIVO_BYTES) {
        falhas.push({
          arquivo: arquivo.name,
          motivo: `Acima de ${Math.round(LIMITE_ARQUIVO_BYTES / 1024 / 1024)} MB. Envie pelo SharePoint ou peca o upload resumavel.`,
        });
        continue;
      }

      const origem = subCaminhoSeguro((caminhos[i] ?? '').trim());
      if (origem === null) {
        falhas.push({ arquivo: arquivo.name, motivo: 'Caminho de origem invalido.' });
        continue;
      }

      const destino = [base, sub, origem].filter(Boolean).join('/');

      try {
        if (!pastasGarantidas.has(destino)) {
          await garantirPasta(cfg, destino);
          pastasGarantidas.add(destino);
        }

        const resposta = await fetch(
          `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${caminhoGraph(`${destino}/${nome}`)}:/content`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': arquivo.type || 'application/octet-stream',
            },
            body: arquivo.stream(),
          },
        );

        if (!resposta.ok) {
          const corpo = await resposta.json().catch(() => ({}));
          console.error(`Upload de ${nome} falhou:`, corpo?.error?.message ?? resposta.status);
          falhas.push({ arquivo: arquivo.name, motivo: 'O SharePoint recusou o arquivo.' });
          continue;
        }

        enviados.push([sub, origem, nome].filter(Boolean).join('/'));
      } catch (e) {
        console.error(`Upload de ${nome} falhou:`, e);
        falhas.push({
          arquivo: arquivo.name,
          motivo: e instanceof ErroGraph ? e.message : 'Falha inesperada no envio.',
        });
      }
    }

    // 207 quando parte foi e parte nao: a tela precisa distinguir "tudo certo"
    // de "3 de 5 subiram", e um 200 liso esconderia as falhas.
    const status = falhas.length ? (enviados.length ? 207 : 502) : 200;
    return respostaJson({ enviados, falhas, pasta: base }, status);
  } catch (e) {
    if (e instanceof ErroGraph) return respostaErro(e.codigo, e.status, e.message);
    console.error('Falha inesperada no carbon-secure-share-upload:', e);
    return respostaErro('erro_interno', 500);
  }
});

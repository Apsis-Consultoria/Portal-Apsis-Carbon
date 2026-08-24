// -----------------------------------------------------------------------------
// Microsoft Graph app-only (SharePoint e e-mail) para as Edge Functions.
// -----------------------------------------------------------------------------
// POR QUE APP-ONLY E NAO O TOKEN DO USUARIO:
//
// O Portal Apsis fala com o SharePoint direto do NAVEGADOR, pedindo ao MSAL um
// token delegado com escopo Files.ReadWrite.All (e Mail.Send para o e-mail de
// acesso). Isso da a QUALQUER colaborador logado, no console do navegador, um
// token que le e escreve toda a biblioteca de documentos do tenant a que ele
// tenha acesso, e o Secure Share e apenas uma das coisas que ele alcanca.
//
// A regra 10 do CLAUDE.md deste repositorio proibe esse caminho: o login do
// Carbon pede apenas User.Read, openid, profile e email. Logo, o SharePoint so
// pode ser tocado do lado do servidor, com credencial de aplicativo (client
// credentials), que vive como secret da Edge Function e nunca chega ao browser.
//
// O ganho nao e so de superficie de ataque: com app-only, a autorizacao de QUEM
// pode enviar arquivo para QUAL pasta passa a ser decidida pelo nosso codigo
// (papel em carbon_usuarios, vinculo em carbon_secure_share_equipe), e nao pelas
// permissoes que a pessoa por acaso tem no SharePoint.
//
// SECRETS EXIGIDOS (no Supabase, nunca no repositorio), com prefixo AZURE_PORTAL_:
//   AZURE_PORTAL_TENANT_ID
//   AZURE_PORTAL_CLIENT_ID
//   AZURE_PORTAL_CLIENT_SECRET
//
// POR QUE O PREFIXO: este sistema e o Secure Share Carbon rodam no MESMO projeto
// Supabase, e secret de Edge Function e por PROJETO. Com os dois lendo
// `AZURE_CLIENT_ID`, so um registro de aplicativo caberia, e o sintoma seria um
// dos sistemas usando a credencial do outro sem ninguem perceber. Sao dois
// registros no Azure, com rotacao e log de entrada independentes.
//
// PERMISSOES DE APLICATIVO exigidas no registro do app no Azure AD, com consent
// de administrador: Sites.ReadWrite.All (SharePoint) e Mail.Send (envio do
// convite). Sao permissoes de APLICATIVO, nao delegadas.

const GRAPH = 'https://graph.microsoft.com/v1.0';

// -----------------------------------------------------------------------------
// Token de aplicativo
// -----------------------------------------------------------------------------
// Cacheado no isolate. O token do Graph dura tipicamente 1 hora; renovamos com
// 5 minutos de folga para nao usar um token que expira no meio de um upload
// longo.

let tokenCache: { valor: string; expiraEm: number } | null = null;

const FOLGA_MS = 5 * 60 * 1000;

function exigirEnv(nome: string): string {
  const valor = Deno.env.get(nome);
  if (!valor) {
    throw new ErroGraph(
      'graph_nao_configurado',
      `Secret ${nome} ausente nas Edge Functions. Sem ela nao ha como falar com o SharePoint.`,
    );
  }
  return valor;
}

/** Erro do Graph que a rota sabe traduzir em resposta HTTP. */
export class ErroGraph extends Error {
  codigo: string;
  status: number;

  constructor(codigo: string, mensagem: string, status = 502) {
    super(mensagem);
    this.name = 'ErroGraph';
    this.codigo = codigo;
    this.status = status;
  }
}

export async function obterTokenApp(): Promise<string> {
  const agora = Date.now();
  if (tokenCache && tokenCache.expiraEm - FOLGA_MS > agora) return tokenCache.valor;

  const tenant = exigirEnv('AZURE_PORTAL_TENANT_ID');
  const corpo = new URLSearchParams({
    client_id: exigirEnv('AZURE_PORTAL_CLIENT_ID'),
    client_secret: exigirEnv('AZURE_PORTAL_CLIENT_SECRET'),
    // .default pede exatamente as permissoes de APLICATIVO ja consentidas no
    // registro do app. Listar escopos um a um aqui nao funciona em client
    // credentials: o Azure recusa com invalid_scope.
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const resposta = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corpo,
    },
  );

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok || !dados.access_token) {
    // A descricao do Azure entra no LOG, nunca na resposta ao navegador: ela
    // costuma citar tenant, clientId e a permissao faltante.
    console.error('Falha ao obter token app-only do Graph:', dados.error_description || dados.error);
    throw new ErroGraph(
      'graph_sem_token',
      'Nao foi possivel autenticar no Microsoft Graph com a credencial do aplicativo.',
    );
  }

  tokenCache = {
    valor: dados.access_token as string,
    expiraEm: agora + Number(dados.expires_in ?? 3600) * 1000,
  };
  return tokenCache.valor;
}

// -----------------------------------------------------------------------------
// Chamada generica
// -----------------------------------------------------------------------------

async function chamarGraph(
  caminho: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await obterTokenApp();
  const url = caminho.startsWith('http') ? caminho : `${GRAPH}${caminho}`;

  const resposta = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  return resposta;
}

async function graphJson<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const resposta = await chamarGraph(caminho, {
    ...init,
    headers: { Accept: 'application/json', ...(init.headers ?? {}) },
  });

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}));
    const mensagem = corpo?.error?.message || `HTTP ${resposta.status}`;
    console.error(`Graph ${init.method ?? 'GET'} ${caminho} falhou:`, mensagem);

    if (resposta.status === 404) {
      throw new ErroGraph('sharepoint_nao_encontrado', 'Item nao encontrado no SharePoint.', 404);
    }
    if (resposta.status === 401 || resposta.status === 403) {
      throw new ErroGraph(
        'sharepoint_sem_permissao',
        'O aplicativo nao tem permissao para esta operacao no SharePoint. Confira o consent de Sites.ReadWrite.All.',
        502,
      );
    }
    throw new ErroGraph('sharepoint_falhou', 'O SharePoint recusou a operacao.');
  }

  if (resposta.status === 204) return null as T;
  return (await resposta.json()) as T;
}

// -----------------------------------------------------------------------------
// Resolucao de site e biblioteca
// -----------------------------------------------------------------------------
// Cacheados por isolate: sao dois GETs que nunca mudam durante a vida do
// processo, e faze-los a cada upload dobraria a latencia de cada arquivo.

const driveCache = new Map<string, string>();

export type ConfigSharePoint = {
  siteHost: string;
  sitePath: string;
  biblioteca: string;
  /**
   * Pasta dentro da biblioteca onde TUDO do Carbon vive ('' = raiz).
   *
   * O Carbon divide a biblioteca "Secure Share" com o Portal Apsis: sem este
   * prefixo, os projetos dos dois se misturariam na raiz. Monte o caminho
   * SEMPRE com caminhoNaBiblioteca(), nunca concatenando a mao.
   */
  pastaBase: string;
};

/**
 * Caminho absoluto dentro da biblioteca, ja com a pasta base.
 *
 * TODO caminho enviado ao Graph precisa passar por aqui. Montar
 * `${projeto.pasta}/${sub}` a mao esquece o prefixo e escreve na raiz da
 * biblioteca, no meio dos projetos de M&A do Portal Apsis.
 */
export function caminhoNaBiblioteca(
  cfg: ConfigSharePoint,
  ...partes: (string | null | undefined)[]
): string {
  return [cfg.pastaBase, ...partes].filter((p) => p && String(p).trim()).join('/');
}


/**
 * TRAVA: nenhum caminho pode sair da pasta base.
 *
 * Chamada no topo de TODA funcao que toca um caminho. Nao e conveniencia, e
 * contencao: o consentimento do Azure (Sites.Selected) e por SITE, nao por
 * pasta, entao a credencial tecnicamente alcanca a biblioteca inteira -
 * inclusive os projetos do Portal Apsis, que dividem a mesma biblioteca
 * "Secure Share". O que impede o Carbon de escrever la e ESTE codigo.
 *
 * Por isso a checagem fica aqui embaixo, no unico ponto por onde todo caminho
 * passa, e nao em cada chamador. Esquecer o prefixo passa a ser um erro
 * barulhento em vez de uma escrita silenciosa na pasta errada.
 *
 * pastaBase vazia significa "a biblioteca inteira e o escopo": nada a conferir.
 */
function exigirDentroDaBase(cfg: ConfigSharePoint, caminho: string): void {
  const base = (cfg.pastaBase ?? '').trim().replace(/^\/+|\/+$/g, '');
  if (!base) return;

  const alvo = String(caminho ?? '').replace(/^\/+/, '');
  if (alvo === base || alvo.startsWith(`${base}/`)) return;

  console.error(`Caminho fora da pasta base: "${alvo}" nao esta em "${base}".`);
  throw new ErroGraph(
    'fora_da_pasta_base',
    'Operacao recusada: o caminho esta fora da pasta do Apsis Carbon.',
    500,
  );
}

export async function obterDriveId(cfg: ConfigSharePoint): Promise<string> {
  const chave = `${cfg.siteHost}${cfg.sitePath}::${cfg.biblioteca}`;
  const emCache = driveCache.get(chave);
  if (emCache) return emCache;

  const site = await graphJson<{ id: string }>(
    `/sites/${cfg.siteHost}:${cfg.sitePath}`,
  );

  const drives = await graphJson<{ value: { id: string; name: string }[] }>(
    `/sites/${site.id}/drives`,
  );

  const drive = drives.value.find((d) => d.name === cfg.biblioteca);
  if (!drive) {
    throw new ErroGraph(
      'biblioteca_nao_encontrada',
      `A biblioteca "${cfg.biblioteca}" nao existe no site ${cfg.sitePath}. Crie-a no SharePoint antes do primeiro envio.`,
      502,
    );
  }

  driveCache.set(chave, drive.id);
  return drive.id;
}

/**
 * Caminho de item codificado para a sintaxe `/root:/<caminho>:`.
 *
 * Codificamos SEGMENTO A SEGMENTO: encodeURIComponent no caminho inteiro
 * transformaria as barras em %2F e o Graph passaria a procurar um unico arquivo
 * cujo nome contem barras, em vez de descer na arvore de pastas.
 */
function caminhoGraph(caminho: string): string {
  return caminho
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}

// -----------------------------------------------------------------------------
// Pastas
// -----------------------------------------------------------------------------

export type ItemSharePoint = {
  nome: string;
  tipo: 'pasta' | 'arquivo';
  tamanho: number | null;
  criadoEm: string | null;
  atualizadoEm: string | null;
};

/**
 * Cria a pasta se ela ainda nao existir, e devolve o nome usado.
 *
 * conflictBehavior 'fail' mais a tolerancia ao 409 e deliberado: 'rename' faria
 * o Graph criar "Empresa XYZ 1" em silencio quando a pasta ja existisse, e o
 * projeto passaria a apontar para uma pasta vazia enquanto os arquivos antigos
 * ficariam na original.
 */
export async function garantirPasta(cfg: ConfigSharePoint, caminho: string): Promise<void> {
  exigirDentroDaBase(cfg, caminho);
  const driveId = await obterDriveId(cfg);
  const segmentos = caminho.split('/').filter(Boolean);

  for (let i = 0; i < segmentos.length; i++) {
    const atual = segmentos.slice(0, i + 1).join('/');

    const existe = await chamarGraph(`/drives/${driveId}/root:/${caminhoGraph(atual)}`);
    if (existe.ok) continue;

    const pai = segmentos.slice(0, i).join('/');
    const alvo = pai
      ? `/drives/${driveId}/root:/${caminhoGraph(pai)}:/children`
      : `/drives/${driveId}/root/children`;

    const criacao = await chamarGraph(alvo, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: segmentos[i],
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      }),
    });

    // 409 = criada por outra requisicao entre o nosso GET e o POST. Nao e erro.
    if (!criacao.ok && criacao.status !== 409) {
      const corpo = await criacao.json().catch(() => ({}));
      console.error('Falha ao criar pasta no SharePoint:', corpo?.error?.message);
      throw new ErroGraph('sharepoint_falhou', `Nao foi possivel criar a pasta "${segmentos[i]}".`);
    }
  }
}

/** Conteudo de uma pasta, ja normalizado. Pasta inexistente devolve lista vazia. */
export async function listarPasta(
  cfg: ConfigSharePoint,
  caminho: string,
): Promise<ItemSharePoint[]> {
  exigirDentroDaBase(cfg, caminho);
  const driveId = await obterDriveId(cfg);
  const alvo = caminho
    ? `/drives/${driveId}/root:/${caminhoGraph(caminho)}:/children`
    : `/drives/${driveId}/root/children`;

  const resposta = await chamarGraph(
    `${alvo}?$select=name,size,folder,file,createdDateTime,lastModifiedDateTime&$top=999`,
    { headers: { Accept: 'application/json' } },
  );

  // Pasta que ainda nao existe nao e erro: e um projeto recem-criado, sem envio
  // nenhum. Devolver lista vazia deixa a tela mostrar o estado vazio em vez de
  // um erro que nao pede acao nenhuma.
  if (resposta.status === 404) return [];

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}));
    console.error('Falha ao listar pasta no SharePoint:', corpo?.error?.message);
    throw new ErroGraph('sharepoint_falhou', 'Nao foi possivel listar os arquivos da pasta.');
  }

  const dados = await resposta.json();
  const itens = (dados.value ?? []) as Record<string, unknown>[];

  return itens
    .map((item) => ({
      nome: String(item.name ?? ''),
      tipo: (item.folder ? 'pasta' : 'arquivo') as 'pasta' | 'arquivo',
      tamanho: typeof item.size === 'number' ? item.size : null,
      criadoEm: (item.createdDateTime as string) ?? null,
      atualizadoEm: (item.lastModifiedDateTime as string) ?? null,
    }))
    // Pasta antes de arquivo, e cada grupo em ordem alfabetica pt-BR. A ordenacao
    // fica aqui e nao no frontend para as duas telas (Carbon e portal do cliente)
    // mostrarem a mesma arvore.
    .sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === 'pasta' ? -1 : 1;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
}

/**
 * Renomeia a pasta do projeto.
 *
 * Devolve o nome final. Se a pasta antiga nao existir (projeto criado e nunca
 * usado), nao e erro: nao ha o que renomear, e a tela deve poder corrigir o
 * nome da empresa de um projeto vazio.
 */
export async function renomearPasta(
  cfg: ConfigSharePoint,
  nomeAntigo: string,
  nomeNovo: string,
): Promise<{ renomeada: boolean }> {
  exigirDentroDaBase(cfg, nomeAntigo);
  exigirDentroDaBase(cfg, nomeNovo);
  if (nomeAntigo === nomeNovo) return { renomeada: false };

  const driveId = await obterDriveId(cfg);
  const origem = await chamarGraph(`/drives/${driveId}/root:/${caminhoGraph(nomeAntigo)}`);
  if (origem.status === 404) return { renomeada: false };

  const destino = await chamarGraph(`/drives/${driveId}/root:/${caminhoGraph(nomeNovo)}`);
  if (destino.ok) {
    // Recusamos em vez de mesclar: duas pastas de clientes diferentes com o
    // mesmo nome final significa que alguem errou o cadastro, e mesclar
    // misturaria documentos de dois clientes.
    throw new ErroGraph(
      'pasta_destino_existe',
      `Ja existe a pasta "${nomeNovo}" no SharePoint. Renomear misturaria os arquivos dos dois cadastros.`,
      409,
    );
  }

  await graphJson(`/drives/${driveId}/root:/${caminhoGraph(nomeAntigo)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nomeNovo }),
  });

  return { renomeada: true };
}

// -----------------------------------------------------------------------------
// E-mail
// -----------------------------------------------------------------------------

/**
 * Envia e-mail como a caixa `remetente`, usando permissao de aplicativo Mail.Send.
 *
 * A conta remetente e institucional (portal@apsis.com.br por padrao, configurado
 * em carbon_app_config). Nunca a caixa pessoal de quem clicou: o convite e do
 * sistema, e usar a caixa do colaborador faria a resposta do cliente cair na
 * caixa individual dele, fora do registro do projeto.
 *
 * saveToSentItems = false: o app-only nao tem caixa propria e a copia so poluiria
 * a pasta Enviados da conta institucional com centenas de convites automaticos.
 */
export async function enviarEmail(opcoes: {
  remetente: string;
  para: string;
  paraNome?: string;
  assunto: string;
  html: string;
}): Promise<void> {
  const resposta = await chamarGraph(
    `/users/${encodeURIComponent(opcoes.remetente)}/sendMail`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: opcoes.assunto,
          body: { contentType: 'HTML', content: opcoes.html },
          toRecipients: [
            {
              emailAddress: {
                address: opcoes.para,
                ...(opcoes.paraNome ? { name: opcoes.paraNome } : {}),
              },
            },
          ],
        },
        saveToSentItems: false,
      }),
    },
  );

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}));
    const mensagem = corpo?.error?.message || `HTTP ${resposta.status}`;
    console.error('Falha ao enviar e-mail pelo Graph:', mensagem);

    if (resposta.status === 403) {
      throw new ErroGraph(
        'email_sem_permissao',
        `O aplicativo nao pode enviar como ${opcoes.remetente}. Confira o consent de Mail.Send e se a caixa existe.`,
        502,
      );
    }
    throw new ErroGraph('email_falhou', 'Nao foi possivel enviar o e-mail de acesso.');
  }
}

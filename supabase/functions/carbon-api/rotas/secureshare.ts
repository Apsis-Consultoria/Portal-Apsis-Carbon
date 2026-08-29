// -----------------------------------------------------------------------------
// Rotas secure-share - a tela Secure Share do Apsis Carbon.
// -----------------------------------------------------------------------------
//   GET    secure-share/projetos                  lista visivel para o chamador
//   POST   secure-share/projetos                  cria projeto e clientes iniciais
//   GET    secure-share/projetos/:id              detalhe (clientes, equipe, permissoes)
//   PATCH  secure-share/projetos/:id              AP/OS, empresa e status
//   GET    secure-share/projetos/:id/arquivos     conteudo da pasta no SharePoint
//   POST   secure-share/projetos/:id/clientes     cadastra cliente externo
//   PATCH  secure-share/projetos/:id/equipe       adiciona e remove colaborador
//   POST   secure-share/projetos/:id/permissoes   nivel de um cliente num item
//   PATCH  secure-share/clientes/:id              prazo e status do cliente
//   DELETE secure-share/clientes/:id              remove o cliente
//   POST   secure-share/clientes/:id/convite      envia (ou reenvia) o convite
//   POST   secure-share/clientes/:id/email        troca o endereco e revoga o acesso
//
// COMO O CLIENTE ENTRA, desde 2026-08-23: nao ha mais senha. O portal do cliente
// pede o e-mail e manda um codigo de uso unico para a caixa dele, a cada login.
// Quem trabalha nesta tela NAO define, nao ve e nao reenvia senha nenhuma.
//
// O que esta rota controla e o PORTAO: carbon_secure_share_clientes.convite_enviado_em
// entrou no lugar de `senha_hash is not null`, e vale POR LINHA. Enquanto o
// convite daquele vinculo cliente/projeto nao sair, aquele projeto nao entra na
// sessao de ninguem. Sem esse portao, um e-mail digitado errado no projeto B
// cairia na sessao de quem ja e cliente do projeto A, porque a autorizacao passou
// a agregar so por e-mail. Por isso o convite sai sozinho no cadastro
// (`avisar`, default true) em vez de depender de alguem lembrar de clicar.
//
// DOIS E-MAILS DIFERENTES, para nao confundir na hora de mexer:
//   CONVITE  sai daqui, uma vez por vinculo (e de novo se alguem reenviar). Diz
//            que existe acesso e como entrar. NUNCA contem codigo.
//   CODIGO   sai da Edge Function carbon-ss-codigo, do repositorio
//            secure-share-carbon, a cada tentativa de login.
//
// O ENVIO DE ARQUIVO NAO ESTA AQUI. O roteador do carbon-api le todo corpo
// nao-GET como JSON (ver lerCorpo no index.ts), e arquivo e binario. O upload
// vive na Edge Function propria carbon-secure-share-upload, que recebe
// multipart. Forcar binario neste roteador exigiria mudar o contrato de corpo de
// todas as rotas de todos os dominios.
//
// VISIBILIDADE: quem enxerga um projeto e o criador, quem esta em
// carbon_secure_share_equipe e quem tem papel 'admin'. No Portal Apsis o "vê
// tudo" e uma constante com e-mail pessoal no arquivo da tela; aqui e o papel
// que ja existe em carbon_usuarios (regra 7 do CLAUDE.md, LGPD).

import { respostaErro, respostaJson } from '../../_shared/cors.ts';
import {
  ErroGraph,
  garantirPasta,
  listarPasta,
  renomearPasta,
  enviarEmail,
  caminhoNaBiblioteca,
  type ConfigSharePoint,
} from '../../_shared/graph.ts';
import type { Contexto, Rota } from './tipos.ts';
import { ehAdmin } from './acesso.ts';
import { LOGO_CARBON_CID, LOGO_CARBON_PNG_BASE64 } from '../../_shared/marcaEmail.ts';
import {
  ErroRota,
  exigir,
  lancarErroEscrita,
  lerBooleano,
  lerData,
  lerEnum,
  lerTexto,
  listaBranca,
  veioNoCorpo,
  LIMITE_ITENS_LISTA,
} from './helpers.ts';

// -----------------------------------------------------------------------------
// Configuracao e utilitarios
// -----------------------------------------------------------------------------

/**
 * ONDE OS ARQUIVOS FICAM, decidido em 2026-08-21:
 *
 *   /sites/Projetos > biblioteca "Secure Share" > pasta "Apsis Carbon"
 *
 * Nao e biblioteca separada: e uma PASTA dentro da que a APSIS ja usa, e por
 * isso existe pastaBase. `pastaBase` vazia significa a raiz da biblioteca, e e
 * suportado de proposito - se o Carbon ganhar biblioteca propria, basta limpar
 * o campo em carbon_app_config, sem tocar em codigo.
 */
const CONFIG_PADRAO: ConfigSharePoint & { remetente: string; portalUrl: string } = {
  siteHost: 'apsisconsult.sharepoint.com',
  sitePath: '/sites/Projetos',
  biblioteca: 'Secure Share',
  pastaBase: 'Apsis Carbon',
  remetente: 'portal@apsis.com.br',
  portalUrl: '',
};

type ConfigSecureShare = typeof CONFIG_PADRAO;

/**
 * Cache por isolate, COM PRAZO. A linha `secure_share` de carbon_app_config nao
 * muda no meio de uma sessao, e cada requisicao do Secure Share tocaria o banco
 * de novo so para reler o mesmo caminho de SharePoint.
 *
 * O prazo entrou junto com o convite sem senha, e o motivo e concreto: `remetente`
 * e `portalUrl` sao os dois campos que a operacao muda por UPDATE, sem publicar
 * codigo (a caixa de envio ainda vai trocar, e o endereco do portal do cliente
 * ainda nao existe). Com cache eterno de modulo, o UPDATE so valia quando o
 * isolate morresse - sem hora marcada, e diferente em cada isolate, entao metade
 * dos convites sairia com o valor velho e ninguem entenderia por que. Sessenta
 * segundos e o mesmo numero que a app-config ja usa no max-age da resposta
 * publica.
 */
const CONFIG_TTL_MS = 60_000;
let configCache: ConfigSecureShare | null = null;
let configCacheAte = 0;

/**
 * Endereco do portal do cliente, ou string vazia para "nao configurado".
 *
 * So aceita https:// : o convite e um e-mail que sai do nosso dominio para a
 * caixa de um cliente, e um botao http:// seria um link de texto claro carimbado
 * com a marca da APSIS. Espaco em branco no meio recusa a URL inteira em vez de
 * ser removido, porque um espaco ali quase sempre significa que alguem colou duas
 * coisas no campo. A barra final some para o valor ter uma forma so.
 *
 * NUNCA derivar do cabecalho Origin da requisicao: quem chama esta rota e o
 * portal INTERNO da APSIS, e o endereco dele e justamente o que o cliente nao
 * pode receber.
 */
function normalizarPortalUrl(bruto: unknown): string {
  if (typeof bruto !== 'string') return '';
  const valor = bruto.trim();
  if (!valor.startsWith('https://') || valor.length <= 'https://'.length) return '';
  if (/\s/.test(valor)) return '';
  return valor.replace(/\/+$/, '');
}

/**
 * Configuracao de servidor do Secure Share, vinda da linha `secure_share` de
 * carbon_app_config (publico = false: NUNCA e devolvida ao navegador).
 *
 * Cai para CONFIG_PADRAO campo a campo, e nao no bloco inteiro: um cadastro
 * incompleto no banco (alguem gravou so `portalUrl`) nao pode apagar o caminho do
 * SharePoint e mandar os arquivos para a raiz da biblioteca, que e compartilhada
 * com o Portal Apsis.
 *
 * `pastaBase` e a excecao que confirma a regra: string vazia e valor VALIDO ali
 * (significa "a raiz da biblioteca"), entao ela nao pode cair para o default por
 * ser falsy. Ver o comentario de ConfigSharePoint em _shared/graph.ts.
 */
async function lerConfig(ctx: Contexto): Promise<ConfigSecureShare> {
  if (configCache && Date.now() < configCacheAte) return configCache;

  const { data, error } = await ctx.admin
    .from('carbon_app_config')
    .select('valor')
    .eq('chave', 'secure_share')
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler a configuracao do Secure Share:', error.message);
    throw new ErroRota('erro_interno', 500);
  }

  const bruto = (data?.valor ?? {}) as Record<string, unknown>;
  const texto = (campo: keyof ConfigSecureShare): string => {
    const valor = bruto[campo];
    return typeof valor === 'string' && valor.trim() !== ''
      ? valor.trim()
      : CONFIG_PADRAO[campo];
  };

  configCache = {
    siteHost: texto('siteHost'),
    sitePath: texto('sitePath'),
    biblioteca: texto('biblioteca'),
    pastaBase: typeof bruto.pastaBase === 'string'
      ? bruto.pastaBase.trim()
      : CONFIG_PADRAO.pastaBase,
    remetente: texto('remetente'),
    // portalUrl vazio e o estado de HOJE: o portal do cliente ainda nao foi
    // publicado e nao existe endereco de producao em arquivo nenhum dos dois
    // repositorios. O convite sai assim mesmo, sem botao e sem link (ver
    // enviarConvitePara), e ganha o botao sozinho no dia em que o campo for
    // preenchido, sem publicar codigo.
    portalUrl: normalizarPortalUrl(bruto.portalUrl),
  };
  configCacheAte = Date.now() + CONFIG_TTL_MS;
  return configCache;
}

/** Escapa texto que entra em HTML de e-mail. Nome de empresa e livre. */
function esc(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Converte ErroGraph em ErroRota para o index.ts responder padronizado. */
function traduzirGraph(erro: unknown): never {
  if (erro instanceof ErroGraph) {
    throw new ErroRota(erro.codigo, erro.status, erro.message);
  }
  throw erro;
}

// -----------------------------------------------------------------------------
// Acesso a um projeto
// -----------------------------------------------------------------------------

type ProjetoLinha = {
  id: string;
  ap_os: string | null;
  empresa: string;
  pasta: string | null;
  status: string;
  criado_por: string | null;
};

/**
 * Carrega o projeto e confere que o chamador pode ve-lo.
 *
 * Um SELECT por projeto e nao um filtro na consulta principal: o 404 e o 403
 * precisam ser distinguiveis para o log, e a checagem fica num lugar so, usada
 * por todas as rotas de detalhe.
 */
async function exigirProjeto(ctx: Contexto, projetoId: string): Promise<ProjetoLinha> {
  const { data, error } = await ctx.admin
    .from('carbon_secure_share_projetos')
    .select('id, ap_os, empresa, pasta, status, criado_por')
    .eq('id', projetoId)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler projeto do Secure Share:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) throw new ErroRota('nao_encontrado', 404);

  if (ehAdmin(ctx.registro)) return data as ProjetoLinha;
  if (data.criado_por === ctx.registro.id) return data as ProjetoLinha;

  const { count } = await ctx.admin
    .from('carbon_secure_share_equipe')
    .select('projeto_id', { count: 'exact', head: true })
    .eq('projeto_id', projetoId)
    .eq('usuario_id', ctx.registro.id);

  if ((count ?? 0) > 0) return data as ProjetoLinha;

  // 404 e nao 403 de proposito: confirmar que o projeto existe ja diria a um
  // colaborador que a empresa X e cliente do Carbon, o que e informacao.
  throw new ErroRota('nao_encontrado', 404);
}

/**
 * Nome de pasta do projeto. MESMO calculo de
 * public.carbon_secure_share_nome_pasta - se um mudar, o outro tem de mudar.
 *
 * Barra vira HIFEN (convencao ja em uso no SharePoint da APSIS, igual ao
 * buildFolderName do Portal Apsis). Removendo-a, "AP-12345/26-001" viraria
 * "AP-1234526-001", uma pasta diferente da que a equipe ja usa.
 */
function limparParte(valor: string): string {
  return valor
    .replace(/[/\\]/g, '-')
    .replace(/["*:<>?|]/g, '')
    .trim();
}

function nomePasta(projeto: { ap_os: string | null; empresa: string; pasta?: string | null }) {
  if (projeto.pasta) return projeto.pasta;

  const empresa = limparParte(projeto.empresa ?? '');
  const apOs = limparParte(projeto.ap_os ?? '');
  const bruto = apOs && empresa ? `${apOs} - ${empresa}` : apOs || empresa;

  const limpo = bruto.replace(/\s+/g, ' ').trim().replace(/[ .]+$/, '');

  // VAZIO E DEVOLVIDO COMO null, e nao como string vazia, de proposito.
  //
  // limparParte remove caracteres proibidos no SharePoint. Empresa e AP/OS
  // compostos so por esses caracteres (por exemplo "***" ou "..") reduzem a
  // nada, e o nome da pasta vira ''. Com string vazia, caminhoNaBiblioteca
  // monta o caminho da PASTA BASE: a listagem de um cliente passaria a devolver
  // a pasta de TODOS os clientes, e um upload cairia na raiz da biblioteca.
  //
  // Devolver null em vez de '' faz o TypeScript apontar cada ponto que precisa
  // decidir o que fazer - que era exatamente o que faltava.
  return limpo === '' ? null : limpo;
}

// -----------------------------------------------------------------------------
// Convite de primeiro acesso
// -----------------------------------------------------------------------------
// UM lugar so para os tres pontos de disparo (cadastro de projeto com contatos,
// cadastro de cliente avulso e o botao de reenviar). Duas copias divergiriam, e a
// divergencia apareceria como um convite que abre o portao e outro que nao.

/** O minimo que o convite precisa saber sobre o destinatario. */
type ClienteConvite = { id: string; nome: string; email: string; status: string };

/**
 * Quantos convites um unico POST dispara sozinho.
 *
 * O cadastro de projeto aceita ate LIMITE_ITENS_LISTA contatos, e cada envio pelo
 * Graph custa tipicamente de 300 a 700 ms. Cem contatos passariam do tempo de
 * parede da Edge Function e o cliente veria 504 com o projeto ja criado, alguns
 * convites enviados e nenhum aviso dizendo quais. Acima deste teto os que sobram
 * ficam para o botao de enviar convite, um a um, e o corpo da resposta diz isso.
 */
const LIMITE_CONVITES_AUTOMATICOS = 10;

/**
 * HTML do convite.
 *
 * DESENHO, refeito em 24/08/2026 no formato do convite da Auditoria de EPOs, que
 * ja circula com cliente: faixa de marca, cartao branco, caixa "como entrar" e UM
 * botao. O anterior era o mesmo e-mail escrito duas vezes de cima a baixo, e
 * ficava com o dobro do tamanho sem dizer nada a mais.
 *
 * BILINGUE, mas so na PROSA. A caixa de como entrar, o botao e a assinatura sao
 * unicos, com rotulo nos dois idiomas. Quem le portugues nao precisa rolar um
 * e-mail inteiro em ingles para achar o botao. O ingles vem primeiro pela mesma
 * razao que a interface tem ingles por padrao: auditor de VVB e destinatario
 * possivel, e nao existe coluna de idioma em carbon_secure_share_clientes.
 *
 * A MARCA E A ARTE REAL, embutida como anexo (cid:), e nao <img src="http">
 * nem data: base64. O porque de cada descarte esta em _shared/marcaEmail.ts.
 * Ela vai SOBRE O VERDE porque a palavra CARBON e branca na arte e some em fundo
 * claro - mesmo tratamento da tela de login.
 *
 * TABELA E ESTILO INLINE, sem <style> e sem flex: o Outlook ignora folha de
 * estilo em <head> e nao implementa flexbox. O que parece datado aqui e o que
 * sobrevive.
 */
function htmlConvite(
  cliente: ClienteConvite,
  cfg: ConfigSecureShare,
  consultor: { nome: string; email: string },
): string {
  // Com portalUrl vazio nao ha botao: um <a> sem href vira texto morto, e um
  // botao que nao leva a lugar nenhum e pior do que a ausencia dele. A frase
  // substituta diz o que fazer. O botao aparece sozinho no dia em que
  // carbon_app_config ganhar o endereco, sem publicar codigo.
  const acao = cfg.portalUrl
    ? `<tr><td align="center" style="padding:4px 0 22px">
         <a href="${esc(cfg.portalUrl)}" style="background:#1A4731;color:#ffffff;padding:14px 30px;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
           Ir para a tela de entrada &rarr;
         </a>
       </td></tr>`
    : `<tr><td style="padding:4px 0 22px">
         <div style="padding:13px 16px;background:#FDF6E7;border:1px solid #E8D7AE;border-radius:10px;font-size:13px;color:#8A5A12;line-height:1.6">
           The portal address will be sent to you by the consultant below.<br />
           O endere&ccedil;o do portal ser&aacute; enviado a voc&ecirc; pelo consultor indicado abaixo.
         </div>
       </td></tr>`;

  return `
<div style="background:#F3F5F3;padding:26px 12px;font-family:Segoe UI,Arial,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="width:100%;max-width:520px;border-collapse:collapse">

    <tr>
      <td align="center" style="background:#1A4731;border-radius:14px 14px 0 0;padding:26px 24px 22px">
        <img src="cid:${LOGO_CARBON_CID}" width="176" alt="APSIS Carbon"
             style="display:block;width:176px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none" />
        <div style="color:#ffffff;font-size:17px;font-weight:700;margin-top:18px">Acesso ao Secure Share</div>
        <div style="color:#A8C4B4;font-size:12px;margin-top:5px">Documentos do seu projeto de carbono &middot; APSIS Consultoria</div>
      </td>
    </tr>

    <tr>
      <td style="background:#ffffff;border-radius:0 0 14px 14px;padding:28px 26px 24px;color:#1A2B1F;font-size:14px;line-height:1.65">

        <p style="margin:0 0 18px;font-weight:700">Hello / Ol&aacute;, ${esc(cliente.nome)},</p>

        <p style="margin:0 0 14px">
          You now have access to the <strong>APSIS Secure Share</strong>, where the documents
          of your carbon project are kept: what has already been delivered, what is under
          review, and the files you send back to us.
        </p>
        <p style="margin:0 0 20px">
          To sign in, type your e-mail on the entry screen. A six-digit code arrives at this
          address within the minute, and you type it on the screen.
          <strong>There is no password to create or to remember.</strong>
        </p>

        <div style="border-top:1px solid #E4E9E5;margin:0 0 20px"></div>

        <p style="margin:0 0 14px">
          Voc&ecirc; passou a ter acesso ao <strong>APSIS Secure Share</strong>, onde ficam os
          documentos do seu projeto de carbono: o que j&aacute; foi entregue, o que est&aacute;
          em an&aacute;lise e os arquivos que voc&ecirc; envia de volta para n&oacute;s.
        </p>
        <p style="margin:0 0 22px">
          Para entrar, informe o seu e-mail na tela de entrada. Um c&oacute;digo de seis
          d&iacute;gitos chega neste endere&ccedil;o na hora, e voc&ecirc; digita na tela.
          <strong>N&atilde;o h&aacute; senha para criar nem para lembrar.</strong>
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #DDE3DE;border-radius:10px;margin:0 0 22px">
          <tr>
            <td colspan="2" style="padding:13px 16px 4px;font-size:10px;font-weight:700;letter-spacing:1.2px;color:#8A9990">
              HOW TO SIGN IN &middot; COMO ENTRAR
            </td>
          </tr>
          <tr>
            <td style="padding:6px 16px 4px;font-size:13px;color:#5C7060;width:38%">Your e-mail &middot; Seu e-mail</td>
            <td style="padding:6px 16px 4px;font-size:14px;font-weight:600;color:#1A4731;word-break:break-all">${esc(cliente.email)}</td>
          </tr>
          <tr>
            <td style="padding:0 16px 14px;font-size:13px;color:#5C7060">Your key &middot; Sua chave</td>
            <td style="padding:0 16px 14px;font-size:13px;color:#8A9990">
              o c&oacute;digo que chega aqui quando voc&ecirc; pedir
            </td>
          </tr>
        </table>

        ${acao}

        <p style="margin:0 0 18px;font-size:12px;color:#8A9990;line-height:1.6">
          The code is valid for a few minutes and works only once. APSIS will never ask you
          for it by phone or message.<br />
          O c&oacute;digo vale por alguns minutos e serve uma vez s&oacute;. A APSIS nunca vai
          pedir esse c&oacute;digo por telefone ou mensagem.
        </p>

        <div style="border-top:1px solid #E4E9E5;margin:0 0 16px"></div>

        <p style="margin:0;font-size:13px;color:#5C7060;line-height:1.6">
          ${esc(consultor.nome)}<br />
          <a href="mailto:${esc(consultor.email)}" style="color:#1A4731;text-decoration:none">${esc(consultor.email)}</a><br />
          <span style="color:#8A9990">APSIS Consultoria Empresarial</span>
        </p>

      </td>
    </tr>

    <tr>
      <td align="center" style="padding:16px 20px 0;font-size:11px;color:#8A9990;line-height:1.6">
        Se voc&ecirc; n&atilde;o estava esperando esta mensagem, por favor ignore.<br />
        If you were not expecting this message, please ignore it.
      </td>
    </tr>

  </table>
</div>`;
}

/**
 * Dispara o convite de UM cliente e, so depois de o Graph aceitar, abre o portao.
 *
 * ORDEM, e ela e o desenho: conferir (RPC), enviar (Graph), registrar (RPC).
 * O envio de senha fazia o contrario - gravava a credencial e depois tentava
 * enviar - e foi isso que produziu o codigo email_falhou_senha_trocada, em que a
 * senha antiga morria sem ninguem receber a nova. Sem senha nao ha nada de
 * irreversivel a gravar antes: um envio que falha simplesmente nao deixa marca, o
 * portao continua fechado e a tela mostra "Convite nao enviado" em ambar. O
 * operador ve a verdade e reenvia.
 *
 * Lanca ErroRota. Quem chama no CADASTRO captura e transforma em `aviso_convite`,
 * porque falha de e-mail nao pode derrubar um cadastro ja gravado; quem chama no
 * botao de reenviar deixa subir, porque ali o envio e o proprio pedido.
 */
async function enviarConvitePara(
  ctx: Contexto,
  cfg: ConfigSecureShare,
  cliente: ClienteConvite,
  projeto: { status: string },
): Promise<void> {
  // Os dois portoes de estado ficam AQUI, e nao em cada chamador, para o cadastro
  // e o reenvio nunca discordarem sobre quem pode receber convite.
  if (cliente.status !== 'ativo') throw new ErroRota('cliente_revogado', 409);
  if (projeto.status !== 'ativo') throw new ErroRota('projeto_encerrado', 409);

  const { data: permissao, error: erroPermissao } = await ctx.admin.rpc(
    'carbon_secure_share_convite_permitido',
    { p_cliente_id: cliente.id },
  );

  if (erroPermissao) {
    console.error('Falha ao conferir o freio do convite:', erroPermissao.message);
    throw new ErroRota('erro_interno', 500);
  }

  const veredito = (permissao ?? {}) as { ok?: boolean; motivo?: string; espere_min?: number };
  if (veredito.ok !== true) {
    if (veredito.motivo === 'nao_encontrado') throw new ErroRota('nao_encontrado', 404);
    if (veredito.motivo === 'teto_diario_convite') {
      throw new ErroRota('teto_diario_convite', 429);
    }
    // Os minutos que faltam vao no `detalhe`, e a TELA os transforma em horario
    // ("a partir das 16:42"). Nao mandamos o horario pronto de proposito: o
    // relogio que vale e o de quem esta olhando, e o servidor esta em UTC.
    // Numero cru atravessa fuso e formato de data sem estragar.
    throw new ErroRota('convite_recente', 429, String(veredito.espere_min ?? ''));
  }

  try {
    await enviarEmail({
      remetente: cfg.remetente,
      para: cliente.email,
      paraNome: cliente.nome,
      // Assunto sem empresa e sem AP/OS: a linha de assunto e o que mais aparece
      // em previa de notificacao, inclusive em tela de bloqueio de celular.
      assunto: 'APSIS Secure Share - your access / seu acesso',
      html: htmlConvite(cliente, cfg, {
        nome: ctx.registro.nome ?? ctx.usuario.nome,
        email: ctx.registro.email,
      }),
      // A marca viaja com a mensagem. Ver _shared/marcaEmail.ts para o porque de
      // nao ser <img src="http"> nem data: base64.
      imagens: [{
        contentId: LOGO_CARBON_CID,
        nome: 'apsis-carbon.png',
        tipo: 'image/png',
        contentBytes: LOGO_CARBON_PNG_BASE64,
      }],
    });
  } catch (e) {
    console.error('Falha ao enviar o convite do Secure Share:', e);
    traduzirGraph(e);
  }

  const { data: registrado, error: erroRegistro } = await ctx.admin.rpc(
    'carbon_secure_share_convite_registrado',
    { p_cliente_id: cliente.id, p_por: ctx.registro.id },
  );

  // O e-mail JA saiu. Nao dar para gravar significa que o portao continua
  // fechado: o cliente recebe a mensagem e nao consegue entrar. Falha ALTA e de
  // proposito, para o operador reenviar - reenviar e inofensivo do lado de la,
  // porque o convite nao carrega segredo nenhum.
  if (erroRegistro) {
    console.error('Convite enviado, mas o registro falhou:', erroRegistro.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (registrado !== true) {
    console.error('Convite enviado para um cliente que sumiu do banco:', cliente.id);
    throw new ErroRota('nao_encontrado', 404);
  }
}

/**
 * Roda enviarConvitePara sem deixar a falha derrubar o cadastro.
 *
 * Devolve a frase que vai em `aviso_convite`, ou null quando o convite saiu. Segue
 * o padrao ja usado por `aviso_pasta`: a tela pinta em ambar, o registro fica.
 */
async function convidarSemDerrubar(
  ctx: Contexto,
  cfg: ConfigSecureShare,
  cliente: ClienteConvite,
  projeto: { status: string },
): Promise<string | null> {
  try {
    await enviarConvitePara(ctx, cfg, cliente, projeto);
    return null;
  } catch (e) {
    console.error('Cadastro gravado, mas o convite nao saiu:', e);
    return e instanceof ErroRota && e.codigo !== 'erro_interno'
      ? `O convite para ${cliente.email} nao saiu (${e.codigo}). Use o botao de enviar convite.`
      : `O convite para ${cliente.email} nao saiu. Use o botao de enviar convite.`;
  }
}

// -----------------------------------------------------------------------------
// GET secure-share/projetos
// -----------------------------------------------------------------------------

async function listarProjetos(ctx: Contexto): Promise<Response> {
  let ids: string[] | null = null;

  if (!ehAdmin(ctx.registro)) {
    // Duas consultas e uma uniao em memoria, em vez de um OR com subconsulta:
    // o PostgREST nao compoe `or=(criado_por.eq.X, id.in.(subselect))`, e a
    // alternativa seria uma view por usuario.
    const { data: vinculos } = await ctx.admin
      .from('carbon_secure_share_equipe')
      .select('projeto_id')
      .eq('usuario_id', ctx.registro.id);

    const { data: criados } = await ctx.admin
      .from('carbon_secure_share_projetos')
      .select('id')
      .eq('criado_por', ctx.registro.id);

    ids = [
      ...new Set([
        ...(vinculos ?? []).map((v) => v.projeto_id as string),
        ...(criados ?? []).map((p) => p.id as string),
      ]),
    ];

    if (ids.length === 0) return respostaJson({ projetos: [], total: 0 });
  }

  let consulta = ctx.admin
    .from('carbon_secure_share_projetos_listagem')
    .select('*')
    .order('criado_em', { ascending: false });

  if (ids) consulta = consulta.in('id', ids);

  const { data, error } = await consulta;

  if (error) {
    console.error('Falha ao listar projetos do Secure Share:', error.message);
    return respostaErro('erro_interno', 500);
  }

  return respostaJson({ projetos: data ?? [], total: (data ?? []).length });
}

// -----------------------------------------------------------------------------
// POST secure-share/projetos
// -----------------------------------------------------------------------------

const CAMPOS_PROJETO = ['ap_os', 'empresa', 'contatos', 'avisar'] as const;

/**
 * `avisar` chega DEFAULT TRUE, e isso e decisao, nao conveniencia.
 *
 * O portao de acesso passou a ser o convite. Se ele dependesse de alguem clicar
 * um segundo botao depois, o esquecimento nao daria erro nenhum: o cliente ficaria
 * cadastrado, sem acesso e sem ninguem saber, ate ligar reclamando. Saindo junto
 * com o cadastro, so existem dois desfechos, e os dois sao visiveis na tela: ou o
 * convite saiu e o acesso existe, ou o envio falhou e a linha aparece em ambar.
 */
function lerAvisar(corpo: Record<string, unknown>): boolean {
  return veioNoCorpo(corpo, 'avisar') ? lerBooleano(corpo.avisar, 'avisar') : true;
}

async function criarProjeto(ctx: Contexto): Promise<Response> {
  const corpo = listaBranca(ctx.corpo, CAMPOS_PROJETO);
  exigir(corpo, ['empresa']);
  const avisar = lerAvisar(corpo);

  const empresa = lerTexto(corpo.empresa, 'empresa', 200)!;
  const apOs = lerTexto(corpo.ap_os, 'ap_os', 40);

  // Contatos iniciais sao opcionais: a tela do portal exige pelo menos um, mas
  // criar a pasta antes de saber quem vai receber e um fluxo real (o AP abre,
  // os arquivos comecam a chegar, os contatos vem depois).
  const contatosBrutos = Array.isArray(corpo.contatos) ? corpo.contatos : [];
  if (contatosBrutos.length > LIMITE_ITENS_LISTA) {
    throw new ErroRota('campo_invalido', 400, 'contatos');
  }

  const contatos = contatosBrutos.map((item, i) => {
    if (typeof item !== 'object' || item === null) {
      throw new ErroRota('campo_invalido', 400, `contatos[${i}]`);
    }
    const bruto = item as Record<string, unknown>;
    const email = lerTexto(bruto.email, `contatos[${i}].email`, 320);
    if (!email) throw new ErroRota('campo_obrigatorio', 400, `contatos[${i}].email`);
    return {
      email: email.toLowerCase(),
      nome: lerTexto(bruto.nome, `contatos[${i}].nome`, 200) ?? email,
    };
  });

  const pasta = nomePasta({ ap_os: apOs, empresa });
  if (!pasta) {
    // Sem nome de pasta nao ha onde guardar o arquivo do cliente, e seguir
    // criaria um projeto apontado para a pasta base.
    throw new ErroRota('nome_de_pasta_vazio', 400, 'empresa');
  }

  const { data: projeto, error } = await ctx.admin
    .from('carbon_secure_share_projetos')
    .insert({ ap_os: apOs, empresa, pasta, criado_por: ctx.registro.id })
    .select('id, ap_os, empresa, pasta, status, criado_por')
    .single();

  if (error) lancarErroEscrita(error, 'carbon_secure_share_projetos');

  // `.select()` no insert dos contatos: o convite precisa do id de cada linha
  // para o freio e para o registro. Sem ele o cadastro funcionava, mas nenhum
  // convite poderia sair no mesmo POST.
  let criados: ClienteConvite[] = [];

  if (contatos.length) {
    const { data: linhas, error: erroClientes } = await ctx.admin
      .from('carbon_secure_share_clientes')
      .insert(
        contatos.map((c) => ({
          projeto_id: projeto!.id,
          nome: c.nome,
          email: c.email,
          criado_por: ctx.registro.id,
        })),
      )
      .select('id, nome, email, status');

    if (erroClientes) {
      // Desfaz o projeto para nao deixar pasta orfa por causa de um e-mail
      // torto no formulario. O CASCADE limpa os clientes que porventura
      // entraram antes do erro.
      await ctx.admin.from('carbon_secure_share_projetos').delete().eq('id', projeto!.id);
      lancarErroEscrita(erroClientes, 'carbon_secure_share_clientes');
    }

    criados = (linhas ?? []) as ClienteConvite[];
  }

  // A pasta e criada DEPOIS do banco e o erro dela nao desfaz o projeto: pasta
  // que falta e recriada no primeiro envio (garantirPasta e idempotente), mas
  // projeto perdido levaria junto os contatos ja digitados.
  let avisoPasta: string | null = null;
  let avisoConvite: string | null = null;

  try {
    const cfg = await lerConfig(ctx);

    try {
      await garantirPasta(cfg, caminhoNaBiblioteca(cfg, pasta));
    } catch (e) {
      console.error('Projeto criado, mas a pasta no SharePoint falhou:', e);
      avisoPasta = e instanceof ErroGraph
        ? e.message
        : 'A pasta no SharePoint nao pode ser criada agora. Ela sera criada no primeiro envio de arquivo.';
    }

    if (avisar && criados.length) {
      avisoConvite = await convidarTodos(ctx, cfg, criados, projeto as { status: string });
    }
  } catch (e) {
    // lerConfig falhou: nem pasta nem convite acontecem, e nenhum dos dois pode
    // derrubar um projeto ja gravado.
    console.error('Projeto criado, mas a configuracao do Secure Share nao carregou:', e);
    avisoPasta ??= 'A pasta no SharePoint nao pode ser criada agora. Ela sera criada no primeiro envio de arquivo.';
    if (avisar && criados.length) {
      avisoConvite = 'Os convites nao sairam agora. Use o botao de enviar convite em cada cliente.';
    }
  }

  return respostaJson({ projeto, aviso_pasta: avisoPasta, aviso_convite: avisoConvite }, 201);
}

/**
 * Convida uma lista de clientes recem-cadastrados, um por vez.
 *
 * Sequencial e nao Promise.all: sao chamadas ao mesmo tenant do Graph com a mesma
 * credencial de aplicativo, e disparar dez de uma vez e a receita para 429 do
 * proprio Microsoft, que transformaria "um convite falhou" em "nenhum saiu".
 */
async function convidarTodos(
  ctx: Contexto,
  cfg: ConfigSecureShare,
  clientes: ClienteConvite[],
  projeto: { status: string },
): Promise<string | null> {
  const falhas: string[] = [];
  const sobraram = clientes.slice(LIMITE_CONVITES_AUTOMATICOS);

  for (const cliente of clientes.slice(0, LIMITE_CONVITES_AUTOMATICOS)) {
    if (await convidarSemDerrubar(ctx, cfg, cliente, projeto)) falhas.push(cliente.email);
  }

  const partes: string[] = [];
  if (falhas.length) {
    partes.push(
      `O convite nao saiu para: ${falhas.join(', ')}. Use o botao de enviar convite.`,
    );
  }
  if (sobraram.length) {
    partes.push(
      `${sobraram.length} contato(s) acima de ${LIMITE_CONVITES_AUTOMATICOS} ficaram sem convite automatico. Envie um a um.`,
    );
  }
  return partes.length ? partes.join(' ') : null;
}

// -----------------------------------------------------------------------------
// GET secure-share/projetos/:id
// -----------------------------------------------------------------------------

async function obterProjeto(ctx: Contexto): Promise<Response> {
  const projeto = await exigirProjeto(ctx, ctx.params.id);

  const [detalhe, clientes, equipe, permissoes] = await Promise.all([
    ctx.admin
      .from('carbon_secure_share_projetos_listagem')
      .select('*')
      .eq('id', projeto.id)
      .maybeSingle(),
    ctx.admin
      .from('carbon_secure_share_clientes_listagem')
      .select('*')
      .eq('projeto_id', projeto.id)
      .order('criado_em', { ascending: true }),
    ctx.admin
      .from('carbon_secure_share_equipe')
      .select('usuario_id, carbon_usuarios!inner(id, email, nome)')
      .eq('projeto_id', projeto.id),
    ctx.admin
      .from('carbon_secure_share_permissoes')
      .select('item_path, emails_negados, emails_sem_download')
      .eq('projeto_id', projeto.id),
  ]);

  return respostaJson({
    projeto: detalhe.data ?? projeto,
    clientes: clientes.data ?? [],
    equipe: (equipe.data ?? []).map((linha) => {
      const u = (linha as Record<string, unknown>).carbon_usuarios as Record<string, unknown>;
      return { id: u.id, email: u.email, nome: u.nome };
    }),
    permissoes: permissoes.data ?? [],
    pode_administrar: ehAdmin(ctx.registro) || projeto.criado_por === ctx.registro.id,
  });
}

// -----------------------------------------------------------------------------
// PATCH secure-share/projetos/:id
// -----------------------------------------------------------------------------

const STATUS_PROJETO = new Set(['ativo', 'encerrado']);

async function atualizarProjeto(ctx: Contexto): Promise<Response> {
  const projeto = await exigirProjeto(ctx, ctx.params.id);
  const corpo = listaBranca(ctx.corpo, ['ap_os', 'empresa', 'status']);

  const mudancas: Record<string, unknown> = {};

  if (veioNoCorpo(corpo, 'empresa')) {
    const empresa = lerTexto(corpo.empresa, 'empresa', 200);
    if (!empresa) throw new ErroRota('campo_obrigatorio', 400, 'empresa');
    mudancas.empresa = empresa;
  }
  if (veioNoCorpo(corpo, 'ap_os')) {
    mudancas.ap_os = lerTexto(corpo.ap_os, 'ap_os', 40);
  }
  if (veioNoCorpo(corpo, 'status')) {
    mudancas.status = lerEnum(corpo.status, STATUS_PROJETO, 'status_invalido', 'status');
  }

  if (Object.keys(mudancas).length === 0) throw new ErroRota('nada_para_atualizar', 400);

  // Renomear a pasta ANTES de gravar. Se a ordem fosse a inversa e o SharePoint
  // recusasse, o banco apontaria para uma pasta com o nome antigo e o proximo
  // envio criaria uma segunda pasta, partindo os arquivos do cliente em duas.
  const nomeAntigo = nomePasta(projeto);
  const nomeNovo = nomePasta({
    ap_os: (mudancas.ap_os ?? projeto.ap_os) as string | null,
    empresa: (mudancas.empresa ?? projeto.empresa) as string,
  });

  // O CAMINHO MAIS PERIGOSO DOS TRES, e o compilador NAO o aponta.
  //
  // caminhoNaBiblioteca aceita (string | null | undefined)[] e descarta as
  // partes vazias com um filter. Isso e conveniente para caminho opcional e
  // engole o null aqui em silencio: com nomeNovo nulo, renomearPasta receberia
  // o caminho da PASTA BASE nos dois lados e tentaria renomear a biblioteca
  // inteira - a pasta de todos os clientes de uma vez.
  //
  // Por isso a recusa e explicita, e nao confiada ao tipo. Foi o proprio
  // typecheck passar sem reclamar que revelou a lacuna: o conserto tambem
  // precisa de auditoria.
  if (!nomeAntigo || !nomeNovo) {
    console.error(
      'Renomear recusado: nome de pasta vazio no projeto de Secure Share',
      projeto.id,
      { antigo: nomeAntigo, novo: nomeNovo },
    );
    throw new ErroRota('nome_de_pasta_vazio', 400, 'empresa');
  }

  if (nomeNovo !== nomeAntigo) {
    try {
      const cfg = await lerConfig(ctx);
      await renomearPasta(
        cfg,
        caminhoNaBiblioteca(cfg, nomeAntigo),
        caminhoNaBiblioteca(cfg, nomeNovo),
      );
    } catch (e) {
      traduzirGraph(e);
    }
    mudancas.pasta = nomeNovo;
  }

  const { data, error } = await ctx.admin
    .from('carbon_secure_share_projetos')
    .update(mudancas)
    .eq('id', projeto.id)
    .select('id, ap_os, empresa, pasta, status')
    .single();

  if (error) lancarErroEscrita(error, 'carbon_secure_share_projetos');

  return respostaJson({ projeto: data });
}

// -----------------------------------------------------------------------------
// GET secure-share/projetos/:id/arquivos
// -----------------------------------------------------------------------------
// ?sub=<caminho relativo> abre uma subpasta. A arvore e carregada sob demanda,
// um nivel por vez, como na tela do portal: uma pasta de due diligence tem
// milhares de arquivos, e trazer tudo de uma vez trava a tela.

async function listarArquivos(ctx: Contexto): Promise<Response> {
  const projeto = await exigirProjeto(ctx, ctx.params.id);

  const sub = (ctx.url.searchParams.get('sub') ?? '').trim();
  // Barra inicial e '..' sairiam da pasta do projeto e listariam a biblioteca
  // inteira. Recusamos em vez de sanear, para o caminho torto aparecer no log.
  if (sub.startsWith('/') || sub.includes('..')) {
    throw new ErroRota('campo_invalido', 400, 'sub');
  }

  const base = nomePasta(projeto);
  if (!base) {
    // Projeto antigo, gravado antes da recusa acima, pode ter nome vazio. Aqui a
    // consequencia seria listar a biblioteca inteira para o cliente.
    console.error('Projeto de Secure Share sem nome de pasta utilizavel:', projeto.id);
    throw new ErroRota('nome_de_pasta_vazio', 409);
  }

  try {
    const cfg = await lerConfig(ctx);
    const itens = await listarPasta(cfg, caminhoNaBiblioteca(cfg, base, sub));
    return respostaJson({ itens, caminho: sub, pasta: base });
  } catch (e) {
    traduzirGraph(e);
  }
}

// -----------------------------------------------------------------------------
// POST secure-share/projetos/:id/clientes
// -----------------------------------------------------------------------------

async function criarCliente(ctx: Contexto): Promise<Response> {
  const projeto = await exigirProjeto(ctx, ctx.params.id);
  const corpo = listaBranca(ctx.corpo, ['nome', 'email', 'avisar']);
  exigir(corpo, ['email']);

  const avisar = lerAvisar(corpo);
  const email = lerTexto(corpo.email, 'email', 320)!.toLowerCase();
  const nome = lerTexto(corpo.nome, 'nome', 200) ?? email;

  // Mensagem propria em vez de deixar o check do banco virar campo_invalido:
  // este e o erro que a pessoa comete de verdade, e a tela precisa dizer para
  // onde ir.
  if (email.endsWith('@apsis.com.br')) {
    throw new ErroRota('cliente_interno', 400, 'email');
  }

  const { data, error } = await ctx.admin
    .from('carbon_secure_share_clientes')
    .insert({ projeto_id: projeto.id, nome, email, criado_por: ctx.registro.id })
    .select('id, nome, email, status')
    .single();

  if (error) lancarErroEscrita(error, 'carbon_secure_share_clientes');

  // Convite ANTES de reler a linha de listagem: e o envio que preenche
  // convite_enviado_em, e e essa coluna que decide `acesso_enviado` e `situacao`
  // na view. Relendo antes, a tela receberia "Convite nao enviado" para um
  // cadastro que acabou de convidar, e o operador clicaria de novo sem
  // necessidade - direto no freio de dez minutos.
  let avisoConvite: string | null = null;
  if (avisar) {
    try {
      const cfg = await lerConfig(ctx);
      avisoConvite = await convidarSemDerrubar(ctx, cfg, data as ClienteConvite, projeto);
    } catch (e) {
      console.error('Cliente cadastrado, mas a configuracao do Secure Share nao carregou:', e);
      avisoConvite = 'O convite nao saiu agora. Use o botao de enviar convite.';
    }
  }

  const { data: linha } = await ctx.admin
    .from('carbon_secure_share_clientes_listagem')
    .select('*')
    .eq('id', data!.id)
    .maybeSingle();

  return respostaJson({ cliente: linha, aviso_convite: avisoConvite }, 201);
}

// -----------------------------------------------------------------------------
// PATCH e DELETE secure-share/clientes/:id
// -----------------------------------------------------------------------------

const STATUS_CLIENTE = new Set(['ativo', 'revogado']);

/** Carrega o cliente e confere o acesso ao projeto dele. */
async function exigirCliente(ctx: Contexto, clienteId: string) {
  const { data, error } = await ctx.admin
    .from('carbon_secure_share_clientes')
    .select('id, projeto_id, nome, email, acesso_inicio, acesso_fim, status, convite_enviado_em')
    .eq('id', clienteId)
    .maybeSingle();

  if (error) {
    console.error('Falha ao ler cliente do Secure Share:', error.message);
    throw new ErroRota('erro_interno', 500);
  }
  if (!data) throw new ErroRota('nao_encontrado', 404);

  const projeto = await exigirProjeto(ctx, data.projeto_id as string);
  return { cliente: data, projeto };
}

async function atualizarCliente(ctx: Contexto): Promise<Response> {
  const { cliente } = await exigirCliente(ctx, ctx.params.id);
  const corpo = listaBranca(ctx.corpo, ['nome', 'acesso_inicio', 'acesso_fim', 'status']);

  const mudancas: Record<string, unknown> = {};
  if (veioNoCorpo(corpo, 'nome')) {
    const nome = lerTexto(corpo.nome, 'nome', 200);
    if (!nome) throw new ErroRota('campo_obrigatorio', 400, 'nome');
    mudancas.nome = nome;
  }
  if (veioNoCorpo(corpo, 'acesso_inicio')) {
    mudancas.acesso_inicio = lerData(corpo.acesso_inicio, 'acesso_inicio');
  }
  if (veioNoCorpo(corpo, 'acesso_fim')) {
    mudancas.acesso_fim = lerData(corpo.acesso_fim, 'acesso_fim');
  }
  if (veioNoCorpo(corpo, 'status')) {
    mudancas.status = lerEnum(corpo.status, STATUS_CLIENTE, 'status_invalido', 'status');
  }

  if (Object.keys(mudancas).length === 0) throw new ErroRota('nada_para_atualizar', 400);

  // O check do banco cobre o par completo; conferimos aqui tambem porque o
  // PATCH pode mandar so uma das duas datas e a outra vir da linha atual.
  const inicio = (mudancas.acesso_inicio ?? cliente.acesso_inicio) as string | null;
  const fim = (mudancas.acesso_fim ?? cliente.acesso_fim) as string | null;
  if (inicio && fim && fim < inicio) throw new ErroRota('periodo_invalido', 400, 'acesso_fim');

  const { error } = await ctx.admin
    .from('carbon_secure_share_clientes')
    .update(mudancas)
    .eq('id', cliente.id);

  if (error) lancarErroEscrita(error, 'carbon_secure_share_clientes');

  const { data } = await ctx.admin
    .from('carbon_secure_share_clientes_listagem')
    .select('*')
    .eq('id', cliente.id)
    .maybeSingle();

  return respostaJson({ cliente: data });
}

async function removerCliente(ctx: Contexto): Promise<Response> {
  const { cliente } = await exigirCliente(ctx, ctx.params.id);

  const { error } = await ctx.admin
    .from('carbon_secure_share_clientes')
    .delete()
    .eq('id', cliente.id);

  if (error) lancarErroEscrita(error, 'carbon_secure_share_clientes');

  // As permissoes guardam e-mail, nao FK: apagar o cliente nao limpa as regras
  // dele por cascade. Limpamos aqui para a lista de restricoes nao acumular
  // e-mails de quem nao tem mais acesso.
  await limparPermissoesDoEmail(ctx, cliente.projeto_id as string, cliente.email as string);

  return respostaJson({ removido: true });
}

/** Tira um e-mail das duas listas de todas as permissoes do projeto. */
async function limparPermissoesDoEmail(ctx: Contexto, projetoId: string, email: string) {
  const alvo = email.toLowerCase();
  const { data } = await ctx.admin
    .from('carbon_secure_share_permissoes')
    .select('id, item_path, emails_negados, emails_sem_download')
    .eq('projeto_id', projetoId);

  for (const linha of data ?? []) {
    const negados = ((linha.emails_negados ?? []) as string[]).filter((e) => e !== alvo);
    const semDownload = ((linha.emails_sem_download ?? []) as string[]).filter((e) => e !== alvo);

    const mudou =
      negados.length !== (linha.emails_negados ?? []).length ||
      semDownload.length !== (linha.emails_sem_download ?? []).length;
    if (!mudou) continue;

    if (!negados.length && !semDownload.length) {
      await ctx.admin.from('carbon_secure_share_permissoes').delete().eq('id', linha.id);
    } else {
      await ctx.admin
        .from('carbon_secure_share_permissoes')
        .update({ emails_negados: negados, emails_sem_download: semDownload })
        .eq('id', linha.id);
    }
  }
}

// -----------------------------------------------------------------------------
// POST secure-share/clientes/:id/convite
// -----------------------------------------------------------------------------
// Envia (ou reenvia) o convite de primeiro acesso e, com ele, ABRE O PORTAO
// daquele vinculo cliente/projeto.
//
// Nome antigo da rota: clientes/:id/acesso, que gerava uma senha nova a cada
// clique. Nao existe mais senha para gerar: quem entra digita o e-mail no portal
// do cliente e recebe um codigo de uso unico. Reenviar aqui e inofensivo do lado
// de la, porque o convite nao carrega segredo nenhum - o unico custo e a caixa do
// cliente, e e por isso que existe o freio da RPC.

async function enviarConvite(ctx: Contexto): Promise<Response> {
  const { cliente, projeto } = await exigirCliente(ctx, ctx.params.id);

  const cfg = await lerConfig(ctx);

  // Sem try: aqui o envio E o pedido, entao a falha tem de aparecer na tela. O
  // caminho que engole a falha e o do cadastro (aviso_convite), nao este.
  await enviarConvitePara(ctx, cfg, cliente as unknown as ClienteConvite, projeto);

  const { data } = await ctx.admin
    .from('carbon_secure_share_clientes_listagem')
    .select('*')
    .eq('id', cliente.id)
    .maybeSingle();

  return respostaJson({ enviado: true, cliente: data });
}

// -----------------------------------------------------------------------------
// POST secure-share/clientes/:id/email
// -----------------------------------------------------------------------------
// Troca o endereco de um cliente e FECHA o portao daquele vinculo.
//
// Por que uma rota propria, e nao um campo a mais no PATCH: sem senha, quem
// controla a caixa de e-mail controla o acesso. Um update comum de endereco seria
// uma primitiva de tomada de conta - trocar o e-mail de um cliente ja liberado
// por outro endereco daria acesso imediato ao novo dono, herdando o portao aberto
// pelo convite que foi enviado a OUTRA pessoa. Zerando convite_enviado_em, o
// endereco novo comeca fechado e so entra depois de receber o proprio convite.
//
// O `avisar` default true fecha o outro lado: a troca legitima (a pessoa mudou de
// e-mail corporativo) nao vira um bloqueio silencioso.

async function trocarEmailCliente(ctx: Contexto): Promise<Response> {
  const { cliente, projeto } = await exigirCliente(ctx, ctx.params.id);
  const corpo = listaBranca(ctx.corpo, ['email', 'avisar']);
  exigir(corpo, ['email']);

  const avisar = lerAvisar(corpo);
  const email = lerTexto(corpo.email, 'email', 320)!.toLowerCase();

  if (email === String(cliente.email).toLowerCase()) {
    throw new ErroRota('nada_para_atualizar', 400, 'email');
  }
  if (email.endsWith('@apsis.com.br')) throw new ErroRota('cliente_interno', 400, 'email');

  const { error } = await ctx.admin
    .from('carbon_secure_share_clientes')
    .update({
      email,
      // O portao FECHA. Os contadores do freio zeram junto porque eles medem
      // convites entregues aquela caixa, e a caixa e outra.
      convite_enviado_em: null,
      convite_enviado_por: null,
      convite_dia: null,
      convite_no_dia: 0,
      // A senha antiga tambem morre. Enquanto carbon-ss-login aceitar o formato
      // antigo (ver o passo de corte), deixar o hash vivo faria a credencial
      // emitida para o endereco ANTIGO continuar valendo sob o endereco novo.
      senha_hash: null,
      senha_definida_em: null,
    })
    .eq('id', cliente.id);

  if (error) lancarErroEscrita(error, 'carbon_secure_share_clientes');

  // As permissoes guardam E-MAIL, nao FK: sem esta limpeza, as restricoes
  // ficariam apontando para o endereco antigo e o endereco novo entraria com
  // acesso total a itens que estavam restritos.
  await limparPermissoesDoEmail(ctx, cliente.projeto_id as string, cliente.email as string);

  // AUDITORIA: nao existe tabela de eventos no Carbon (ver a lista de tabelas da
  // 20260817120000). Enquanto ela nao existir, o rastro e esta linha de log, com
  // IDS e SEM endereco de e-mail - o log da Edge Function nao e lugar de dado
  // pessoal. Quem trocou fica em carbon_secure_share_clientes.atualizado_em mais
  // este registro; o par completo exige a tabela.
  console.warn(
    `[secure-share] troca de e-mail: cliente=${cliente.id} projeto=${cliente.projeto_id} por=${ctx.registro.id} portao=fechado`,
  );

  let avisoConvite: string | null = null;
  if (avisar) {
    try {
      const cfg = await lerConfig(ctx);
      avisoConvite = await convidarSemDerrubar(
        ctx,
        cfg,
        { id: String(cliente.id), nome: String(cliente.nome), email, status: String(cliente.status) },
        projeto,
      );
    } catch (e) {
      console.error('E-mail trocado, mas a configuracao do Secure Share nao carregou:', e);
      avisoConvite = 'O convite nao saiu agora. Use o botao de enviar convite.';
    }
  }

  const { data } = await ctx.admin
    .from('carbon_secure_share_clientes_listagem')
    .select('*')
    .eq('id', cliente.id)
    .maybeSingle();

  return respostaJson({ cliente: data, aviso_convite: avisoConvite });
}

// -----------------------------------------------------------------------------
// PATCH secure-share/projetos/:id/equipe
// -----------------------------------------------------------------------------
// Corpo: { adicionar: ['colega@apsis.com.br'], remover: ['outro@apsis.com.br'] }
//
// Por e-mail e nao por uuid porque e o que a tela tem em maos ao digitar. A
// resolucao para carbon_usuarios acontece aqui, e e ela que garante o vinculo
// apontar para colaborador que existe.

async function atualizarEquipe(ctx: Contexto): Promise<Response> {
  const projeto = await exigirProjeto(ctx, ctx.params.id);
  const corpo = listaBranca(ctx.corpo, ['adicionar', 'remover']);

  const lista = (valor: unknown, campo: string): string[] => {
    if (valor === undefined || valor === null) return [];
    if (!Array.isArray(valor) || valor.length > LIMITE_ITENS_LISTA) {
      throw new ErroRota('campo_invalido', 400, campo);
    }
    return valor
      .map((e) => lerTexto(e, campo, 320))
      .filter((e): e is string => !!e)
      .map((e) => e.toLowerCase());
  };

  const adicionar = lista(corpo.adicionar, 'adicionar');
  const remover = lista(corpo.remover, 'remover');

  if (!adicionar.length && !remover.length) throw new ErroRota('nada_para_atualizar', 400);

  const naoEncontrados: string[] = [];

  if (adicionar.length) {
    const externos = adicionar.filter((e) => !e.endsWith('@apsis.com.br'));
    if (externos.length) throw new ErroRota('colaborador_externo', 400, externos[0]);

    const { data: usuarios } = await ctx.admin
      .from('carbon_usuarios')
      .select('id, email')
      .in('email', adicionar);

    const achados = new Map((usuarios ?? []).map((u) => [String(u.email).toLowerCase(), u.id]));
    for (const email of adicionar) if (!achados.has(email)) naoEncontrados.push(email);

    if (achados.size) {
      const { error } = await ctx.admin
        .from('carbon_secure_share_equipe')
        .upsert(
          [...achados.values()].map((usuario_id) => ({ projeto_id: projeto.id, usuario_id })),
          { onConflict: 'projeto_id,usuario_id', ignoreDuplicates: true },
        );
      if (error) lancarErroEscrita(error, 'carbon_secure_share_equipe');
    }
  }

  if (remover.length) {
    const { data: usuarios } = await ctx.admin
      .from('carbon_usuarios')
      .select('id')
      .in('email', remover);

    const ids = (usuarios ?? []).map((u) => u.id);
    if (ids.length) {
      await ctx.admin
        .from('carbon_secure_share_equipe')
        .delete()
        .eq('projeto_id', projeto.id)
        .in('usuario_id', ids);
    }
  }

  const { data: equipe } = await ctx.admin
    .from('carbon_secure_share_equipe')
    .select('carbon_usuarios!inner(id, email, nome)')
    .eq('projeto_id', projeto.id);

  return respostaJson({
    equipe: (equipe ?? []).map((linha) => {
      const u = (linha as Record<string, unknown>).carbon_usuarios as Record<string, unknown>;
      return { id: u.id, email: u.email, nome: u.nome };
    }),
    // Nao e erro: quem nunca entrou no Apsis Carbon ainda nao tem linha em
    // carbon_usuarios (ela nasce no primeiro login). A tela avisa e mantem os
    // demais que entraram.
    nao_encontrados: naoEncontrados,
  });
}

// -----------------------------------------------------------------------------
// POST secure-share/projetos/:id/permissoes
// -----------------------------------------------------------------------------
// Corpo: { item_path, email, nivel: 'total' | 'visualizar' | 'nenhum' }

const NIVEIS = new Set(['total', 'visualizar', 'nenhum']);

async function definirPermissao(ctx: Contexto): Promise<Response> {
  const projeto = await exigirProjeto(ctx, ctx.params.id);
  const corpo = listaBranca(ctx.corpo, ['item_path', 'email', 'nivel']);
  exigir(corpo, ['item_path', 'email', 'nivel']);

  const itemPath = lerTexto(corpo.item_path, 'item_path', 1000)!;
  if (itemPath.startsWith('/') || itemPath.includes('..')) {
    throw new ErroRota('campo_invalido', 400, 'item_path');
  }

  const email = lerTexto(corpo.email, 'email', 320)!.toLowerCase();
  const nivel = lerEnum(corpo.nivel, NIVEIS, 'nivel_invalido', 'nivel')!;

  // So aceita e-mail que e cliente DESTE projeto. Sem esta checagem, a tabela
  // acumularia regras para e-mails quaisquer, e a tela de permissoes mostraria
  // "3 restricoes" referentes a ninguem.
  const { count } = await ctx.admin
    .from('carbon_secure_share_clientes')
    .select('id', { count: 'exact', head: true })
    .eq('projeto_id', projeto.id)
    .eq('email', email);

  if (!count) throw new ErroRota('cliente_nao_encontrado', 404, 'email');

  const { data: atual } = await ctx.admin
    .from('carbon_secure_share_permissoes')
    .select('id, emails_negados, emails_sem_download')
    .eq('projeto_id', projeto.id)
    .eq('item_path', itemPath)
    .maybeSingle();

  // Tira das duas listas e recoloca na certa: um e-mail nunca pode estar nas
  // duas ao mesmo tempo, e "estava em negados e virou visualizar" e o caminho
  // normal do seletor da tela.
  const negados = ((atual?.emails_negados ?? []) as string[]).filter((e) => e !== email);
  const semDownload = ((atual?.emails_sem_download ?? []) as string[]).filter((e) => e !== email);

  if (nivel === 'nenhum') negados.push(email);
  if (nivel === 'visualizar') semDownload.push(email);

  if (!negados.length && !semDownload.length) {
    // Sem nenhuma restricao, a linha nao precisa existir. Apagar mantem a
    // contagem de restricoes do projeto honesta.
    if (atual) {
      await ctx.admin.from('carbon_secure_share_permissoes').delete().eq('id', atual.id);
    }
  } else {
    const { error } = await ctx.admin
      .from('carbon_secure_share_permissoes')
      .upsert(
        {
          projeto_id: projeto.id,
          item_path: itemPath,
          emails_negados: negados,
          emails_sem_download: semDownload,
          atualizado_por: ctx.registro.id,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'projeto_id,item_path' },
      );
    if (error) lancarErroEscrita(error, 'carbon_secure_share_permissoes');
  }

  const { data: permissoes } = await ctx.admin
    .from('carbon_secure_share_permissoes')
    .select('item_path, emails_negados, emails_sem_download')
    .eq('projeto_id', projeto.id);

  return respostaJson({ permissoes: permissoes ?? [] });
}

// -----------------------------------------------------------------------------

export const rotas: Rota[] = [
  { metodo: 'GET', padrao: 'secure-share/projetos', escrita: false, handler: listarProjetos },
  { metodo: 'POST', padrao: 'secure-share/projetos', escrita: true, handler: criarProjeto },
  { metodo: 'GET', padrao: 'secure-share/projetos/:id', escrita: false, handler: obterProjeto },
  { metodo: 'PATCH', padrao: 'secure-share/projetos/:id', escrita: true, handler: atualizarProjeto },
  {
    metodo: 'GET',
    padrao: 'secure-share/projetos/:id/arquivos',
    escrita: false,
    handler: listarArquivos,
  },
  {
    metodo: 'POST',
    padrao: 'secure-share/projetos/:id/clientes',
    escrita: true,
    handler: criarCliente,
  },
  {
    metodo: 'PATCH',
    padrao: 'secure-share/projetos/:id/equipe',
    escrita: true,
    handler: atualizarEquipe,
  },
  {
    metodo: 'POST',
    padrao: 'secure-share/projetos/:id/permissoes',
    escrita: true,
    handler: definirPermissao,
  },
  { metodo: 'PATCH', padrao: 'secure-share/clientes/:id', escrita: true, handler: atualizarCliente },
  { metodo: 'DELETE', padrao: 'secure-share/clientes/:id', escrita: true, handler: removerCliente },
  {
    metodo: 'POST',
    padrao: 'secure-share/clientes/:id/convite',
    escrita: true,
    handler: enviarConvite,
  },
  {
    metodo: 'POST',
    padrao: 'secure-share/clientes/:id/email',
    escrita: true,
    handler: trocarEmailCliente,
  },
];

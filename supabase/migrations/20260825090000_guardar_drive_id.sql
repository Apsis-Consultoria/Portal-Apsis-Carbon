-- =============================================================================
-- Apsis Carbon - guardar o id da biblioteca do SharePoint
-- Arquivo: 20260825090000_guardar_drive_id.sql
-- =============================================================================
-- O QUE ISTO RESOLVE, medido em 25/08/2026: o portal do cliente demorava para
-- listar arquivos e para abrir o primeiro deles.
--
-- A causa nao era o boot da Edge Function (170 a 360 ms, medido) nem o
-- SharePoint em si. Era a resolucao da biblioteca: para descobrir o driveId, o
-- codigo fazia DUAS chamadas em serie ao Graph -  `/sites/{host}:{path}` e
-- depois `/sites/{id}/drives`, que lista TODAS as bibliotecas do site so para
-- achar uma pelo nome. Perto de 700 ms antes de comecar o trabalho pedido.
--
-- Havia cache, mas so em memoria do isolate. O Supabase derruba isolate ocioso
-- rapido, e sao SEIS funcoes, cada uma com o seu: na pratica o cliente pagava
-- os 700 ms quase toda vez que voltava ao portal, e de novo ao clicar no
-- primeiro arquivo, porque baixar e outra funcao e outro isolate.
--
-- Agora o valor descoberto e gravado na linha `secure_share` de
-- carbon_app_config, que as funcoes JA leem no inicio de cada requisicao. O
-- proximo isolate frio recebe o driveId de graca, sem consulta a mais.
--
-- POR QUE UMA FUNCAO E NAO UM UPDATE DIRETO DA EDGE FUNCTION: a linha guarda
-- tambem siteHost, sitePath, biblioteca, pastaBase, pastaGeral, remetente e
-- portalUrl. Um UPDATE que escrevesse o objeto inteiro apagaria todos eles se
-- alguem montasse o jsonb errado. Aqui a mesclagem esta escrita UMA vez, com o
-- operador `||`, e a Edge Function nao tem como errar a forma.
--
-- Idempotente.
-- =============================================================================

create or replace function public.carbon_secure_share_gravar_drive_id(
  p_drive_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- p_drive_id nulo ou vazio APAGA a chave, e esse caminho e usado de verdade:
  -- quando o Graph responde 404 para a biblioteca (ela foi apagada e recriada,
  -- entao o id mudou), a Edge Function chama esta funcao com null para forcar a
  -- redescoberta. Sem isso, o valor gravado manteria o portal quebrado ate
  -- alguem editar a linha a mao, e o sintoma seria "parou de achar os arquivos"
  -- sem nada no codigo ter mudado.
  if p_drive_id is null or btrim(p_drive_id) = '' then
    update public.carbon_app_config
       set valor = valor - 'driveId'
     where chave = 'secure_share';
  else
    update public.carbon_app_config
       set valor = valor || jsonb_build_object('driveId', btrim(p_drive_id))
     where chave = 'secure_share';
  end if;
end;
$$;

comment on function public.carbon_secure_share_gravar_drive_id(text) is
  'Guarda na linha secure_share de carbon_app_config o id da biblioteca do SharePoint que a Edge Function descobriu, para o proximo isolate frio nao repetir as duas chamadas ao Graph que a descoberta custa (perto de 700 ms). Recebe null para APAGAR a chave, caminho usado quando o Graph responde 404 para a biblioteca - sinal de que ela foi recriada e o id mudou. Usa merge com || em vez de substituir o valor, porque a mesma linha guarda o caminho do SharePoint, o remetente e a URL do portal.';

-- Mesmo desenho das demais: so as Edge Functions, com service_role, chamam.
revoke all on function public.carbon_secure_share_gravar_drive_id(text) from anon, authenticated;

-- Limpa um valor eventualmente ja gravado, para a primeira execucao depois
-- desta migration redescobrir e gravar em formato conhecido.
update public.carbon_app_config
   set valor = valor - 'driveId'
 where chave = 'secure_share';

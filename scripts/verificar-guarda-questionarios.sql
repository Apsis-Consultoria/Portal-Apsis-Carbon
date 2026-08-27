-- Verifica, contra o banco de verdade, que o gatilho de dado pessoal dos
-- questionarios recusa o que deve recusar e aceita o que deve aceitar.
--
-- POR QUE UM ARQUIVO E NAO UM TESTE EM DENO: o gatilho e do Postgres. O teste em
-- Deno prova a validacao da Edge Function, que e a camada que produz mensagem
-- util; esta aqui prova a garantia, que e a que continua valendo se alguem
-- gravar por fora da API.
--
-- Nao deixa lixo: tudo roda dentro de um bloco que faz rollback do que inseriu.

do $$
declare
  m uuid;
  q uuid;
  passou boolean;
begin
  select id into m from public.carbon_questionario_modelos where chave = 'ronda';
  if m is null then
    raise exception 'modelo "ronda" nao encontrado; rode antes o seed questionario_modelos.sql';
  end if;

  -- 1. Chave com nome de pessoa tem de ser recusada.
  passou := false;
  begin
    insert into public.carbon_questionarios (modelo_id, respostas)
    values (m, '{"nome_cacique": "texto qualquer"}'::jsonb);
    passou := true;
  exception when others then
    if sqlerrm not like '%dado pessoal%' then raise; end if;
    raise notice 'ok: chave com nome recusada';
  end;
  if passou then raise exception 'FALHOU: o gatilho aceitou chave com nome'; end if;

  -- 2. Valor com cara de e-mail tem de ser recusado, mesmo em chave permitida.
  passou := false;
  begin
    insert into public.carbon_questionarios (modelo_id, respostas)
    values (m, format('{"observacoes_ponto": "falar com %s"}', 'alguem' || chr(64) || 'exemplo.com')::jsonb);
    passou := true;
  exception when others then
    if sqlerrm not like '%e-mail%' then raise; end if;
    raise notice 'ok: valor com e-mail recusado';
  end;
  if passou then raise exception 'FALHOU: o gatilho aceitou e-mail no valor'; end if;

  -- 3. Valor com CPF tem de ser recusado.
  passou := false;
  begin
    insert into public.carbon_questionarios (modelo_id, respostas)
    values (m, '{"observacoes_ponto": "documento 123.456.789-00 apresentado"}'::jsonb);
    passou := true;
  exception when others then
    if sqlerrm not like '%CPF%' then raise; end if;
    raise notice 'ok: valor com CPF recusado';
  end;
  if passou then raise exception 'FALHOU: o gatilho aceitou CPF no valor'; end if;

  -- 4. Resposta legitima tem de PASSAR. Um gatilho que recusa tudo tambem
  --    passaria nos tres testes acima, e seria inutil.
  insert into public.carbon_questionarios (modelo_id, respostas, aldeia, entrevistado_funcao)
  values (m, '{"numero_alerta": "ALT-TESTE", "classificacao": "garimpo"}'::jsonb,
          'Aldeia de verificacao', 'equipe_apsis')
  returning id into q;
  raise notice 'ok: resposta legitima aceita';

  -- 5. Pergunta de escolha SEM opcoes tem de ser recusada pelo outro gatilho:
  --    e um campo que ninguem consegue responder.
  --    A chave usada aqui e valida de proposito ('cor'), para o gatilho chegar
  --    ate a checagem de opcoes. Com uma chave de uma letra so, ele barraria
  --    antes, por formato, e o teste passaria pelo motivo errado.
  passou := false;
  begin
    insert into public.carbon_questionario_modelos (chave, nome, definicao)
    values ('verificacao_tmp', 'Temporario',
            '{"secoes": [{"titulo": "S", "perguntas": [{"chave": "cor", "tipo": "escolha"}]}]}'::jsonb);
    passou := true;
  exception when others then
    if sqlerrm not like '%nao tem opcoes%' then raise; end if;
    raise notice 'ok: escolha sem opcoes recusada';
  end;
  if passou then raise exception 'FALHOU: aceitou pergunta de escolha sem opcoes'; end if;

  -- 6. Chave de pergunta mal formada tambem e recusada.
  passou := false;
  begin
    insert into public.carbon_questionario_modelos (chave, nome, definicao)
    values ('verificacao_tmp2', 'Temporario',
            '{"secoes": [{"titulo": "S", "perguntas": [{"chave": "Cor Favorita", "tipo": "texto"}]}]}'::jsonb);
    passou := true;
  exception when others then
    if sqlerrm not like '%chave de pergunta invalida%' then raise; end if;
    raise notice 'ok: chave de pergunta mal formada recusada';
  end;
  if passou then raise exception 'FALHOU: aceitou chave de pergunta mal formada'; end if;

  -- 7. Chave repetida entre secoes tem de ser recusada: uma resposta
  --    sobrescreveria a outra em silencio, porque as respostas sao um objeto
  --    unico por chave.
  passou := false;
  begin
    insert into public.carbon_questionario_modelos (chave, nome, definicao)
    values ('verificacao_tmp3', 'Temporario',
            '{"secoes": [
               {"titulo": "A", "perguntas": [{"chave": "obs", "tipo": "texto"}]},
               {"titulo": "B", "perguntas": [{"chave": "obs", "tipo": "texto"}]}
             ]}'::jsonb);
    passou := true;
  exception when others then
    if sqlerrm not like '%repetida%' then raise; end if;
    raise notice 'ok: chave repetida recusada';
  end;
  if passou then raise exception 'FALHOU: aceitou chave de pergunta repetida'; end if;

  -- Limpa o que este bloco inseriu.
  delete from public.carbon_questionarios where id = q;
  delete from public.carbon_questionario_modelos
   where chave in ('verificacao_tmp', 'verificacao_tmp2', 'verificacao_tmp3');

  raise notice 'todas as guardas passaram';
end $$;

-- Reproduz, contra o banco de verdade, o INSERT que a rota de criacao monta -
-- para os QUATRO formularios e para os casos de borda que a tela produz.
--
-- POR QUE: o dono relatou "erro ao criar questionario" e a validacao da Edge
-- Function passa em todos os testes. Se o defeito nao esta na validacao, esta
-- entre ela e o banco. Este arquivo isola essa metade.
--
-- Nao deixa lixo: o bloco inteiro e uma transacao e apaga o que inseriu.

do $$
declare
  m record;
  q uuid;
  n integer := 0;
  falhas text[] := array[]::text[];
begin
  for m in select id, chave from public.carbon_questionario_modelos order by chave loop

    -- 1. O caso do clique: rascunho vazio, so o que a tela preenche sozinha.
    begin
      insert into public.carbon_questionarios
        (modelo_id, modelo_versao, data_referencia, respostas, status)
      values (m.id, 1, current_date, '{}'::jsonb, 'rascunho')
      returning id into q;
      delete from public.carbon_questionarios where id = q;
      n := n + 1;
    exception when others then
      falhas := falhas || format('%s rascunho vazio: %s', m.chave, sqlerrm);
    end;

    -- 2. Com coordenada do territorio Parakana. Latitude e longitude NEGATIVAS,
    --    que e como o Brasil inteiro se localiza.
    begin
      insert into public.carbon_questionarios
        (modelo_id, modelo_versao, data_referencia, latitude, longitude, altitude_m, precisao_m, respostas, status)
      values (m.id, 1, current_date, -4.7312, -49.9418, 142, 4, '{}'::jsonb, 'rascunho')
      returning id into q;
      delete from public.carbon_questionarios where id = q;
      n := n + 1;
    exception when others then
      falhas := falhas || format('%s com coordenada: %s', m.chave, sqlerrm);
    end;

    -- 3. Cabecalho completo, como fica depois de preenchido em campo.
    begin
      insert into public.carbon_questionarios
        (modelo_id, modelo_versao, aldeia, data_referencia, entrevistado_funcao,
         latitude, longitude, respostas, status, observacoes)
      values (m.id, 1, 'Aldeia de verificacao', current_date, 'cacique',
              -4.7312, -49.9418, '{}'::jsonb, 'rascunho', 'observacao de teste')
      returning id into q;
      delete from public.carbon_questionarios where id = q;
      n := n + 1;
    exception when others then
      falhas := falhas || format('%s cabecalho completo: %s', m.chave, sqlerrm);
    end;

  end loop;

  -- 4. Meia coordenada tem de ser RECUSADA: o par e o que localiza.
  begin
    select id into m from public.carbon_questionario_modelos where chave = 'ronda';
    insert into public.carbon_questionarios (modelo_id, latitude) values (m.id, -4.7312)
    returning id into q;
    delete from public.carbon_questionarios where id = q;
    falhas := falhas || 'meia coordenada foi ACEITA, e o CHECK de par deveria recusar';
  exception when others then
    if sqlerrm not like '%coordenada_par%' then
      falhas := falhas || format('meia coordenada recusada pelo motivo errado: %s', sqlerrm);
    end if;
  end;

  -- 5. Longitude com tres digitos inteiros. numeric(10,7) guarda 3 digitos
  --    inteiros e 7 decimais; o Brasil vai ate -74 e nao estoura, mas vale
  --    saber se a coluna aguenta o limite do mundo.
  begin
    select id into m from public.carbon_questionario_modelos where chave = 'ronda';
    insert into public.carbon_questionarios (modelo_id, latitude, longitude)
    values (m.id, -4.7312, -179.9999999)
    returning id into q;
    delete from public.carbon_questionarios where id = q;
  exception when others then
    falhas := falhas || format('longitude de 3 digitos inteiros nao coube: %s', sqlerrm);
  end;

  raise notice 'insercoes bem sucedidas: %', n;
  if array_length(falhas, 1) is null then
    raise notice 'BANCO OK: nenhum dos casos falhou';
  else
    raise exception 'FALHAS: %', array_to_string(falhas, ' | ');
  end if;
end $$;

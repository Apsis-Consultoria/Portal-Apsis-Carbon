-- Gerado por scripts/gerar-seed-prestacao-blocos.py. Nao edite a mao.
-- Os blocos de contexto das planilhas: ver o cabecalho do script.

begin;

delete from public.carbon_aldeia_rateio where origem_aba is not null;
delete from public.carbon_eixo_resumo where origem_aba is not null;
delete from public.carbon_prestacao_pendencias where origem_aba is not null;
delete from public.carbon_ods_contribuicoes where origem_aba is not null;

update public.carbon_aldeias a set
  populacao_estimada = coalesce(58.0, a.populacao_estimada),
  casas = coalesce(12.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'ARAWAYGA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 19946.0, 'Outubro 24 - Abril 25', 25
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'ARAWAYGA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(30.0, a.populacao_estimada),
  casas = coalesce(3.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'AWYKATOA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 11348.0, 'Outubro 24 - Abril 25', 26
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'AWYKATOA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(null, a.populacao_estimada),
  casas = coalesce(null, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'HEREKATAWA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 20668.0, 'Outubro 24 - Abril 25', 27
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'HEREKATAWA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(67.0, a.populacao_estimada),
  casas = coalesce(14.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'INATA''ARONA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 13298.47, 'Outubro 24 - Abril 25', 28
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'INATA''ARONA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(39.0, a.populacao_estimada),
  casas = coalesce(6.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'ITAOENAWA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 20030.68, 'Outubro 24 - Abril 25', 29
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'ITAOENAWA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(31.0, a.populacao_estimada),
  casas = coalesce(9.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'ITAYGARA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 16919.68, 'Outubro 24 - Abril 25', 30
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'ITAYGARA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(null, a.populacao_estimada),
  casas = coalesce(null, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'ITAYGO''A';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 14923.27, 'Outubro 24 - Abril 25', 31
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'ITAYGO''A' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(60.0, a.populacao_estimada),
  casas = coalesce(10.0, a.casas),
  liderancas = coalesce(2.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'OAYGA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 10698.0, 'Outubro 24 - Abril 25', 32
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'OAYGA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(183.0, a.populacao_estimada),
  casas = coalesce(22.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'PARANATINGA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 27915.29, 'Outubro 24 - Abril 25', 33
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'PARANATINGA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(23.0, a.populacao_estimada),
  casas = coalesce(5.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'PARANOAWE';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 17698.0, 'Outubro 24 - Abril 25', 34
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'PARANOAWE' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(34.0, a.populacao_estimada),
  casas = coalesce(17.0, a.casas),
  liderancas = coalesce(2.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'PARANOWANA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 23405.47, 'Outubro 24 - Abril 25', 35
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'PARANOWANA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(6.0, a.populacao_estimada),
  casas = coalesce(2.0, a.casas),
  liderancas = coalesce(2.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'PARONOMOKOA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 19230.68, 'Outubro 24 - Abril 25', 36
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'PARONOMOKOA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(46.0, a.populacao_estimada),
  casas = coalesce(13.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'PETIYTAWA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 22937.68, 'Outubro 24 - Abril 25', 37
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'PETIYTAWA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(null, a.populacao_estimada),
  casas = coalesce(null, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'TATOKOAPE';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 16198.0, 'Outubro 24 - Abril 25', 38
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'TATOKOAPE' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(25.0, a.populacao_estimada),
  casas = coalesce(6.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'XANYPAYWA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 18441.47, 'Outubro 24 - Abril 25', 39
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'XANYPAYWA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(144.0, a.populacao_estimada),
  casas = coalesce(29.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'XARAIRA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 25653.0, 'Outubro 24 - Abril 25', 40
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'XARAIRA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(112.0, a.populacao_estimada),
  casas = coalesce(18.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'XATAOPAWA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 30008.53, 'Outubro 24 - Abril 25', 41
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'XATAOPAWA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(43.0, a.populacao_estimada),
  casas = coalesce(9.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'XAWEWYRYGA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 11705.0, 'Outubro 24 - Abril 25', 42
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'XAWEWYRYGA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(38.0, a.populacao_estimada),
  casas = coalesce(6.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'baixo' and a.nome = 'XOMANAKAWA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 16398.47, 'Outubro 24 - Abril 25', 43
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'XOMANAKAWA' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(14.0, a.populacao_estimada),
  casas = coalesce(1.0, a.casas),
  liderancas = coalesce(2.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'cima' and a.nome = 'PARANOPYTERA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 4800.0, 'Out 24 a Abril 25', 27
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'PARANOPYTERA' where g.chave = 'cima' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(null, a.populacao_estimada),
  casas = coalesce(null, a.casas),
  liderancas = coalesce(2.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'cima' and a.nome = 'PARANOEMA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 15000.0, 'Out 24 a Abril 25', 28
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'PARANOEMA' where g.chave = 'cima' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(20.0, a.populacao_estimada),
  casas = coalesce(3.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'cima' and a.nome = 'PARANOITA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 16100.0, 'Out 24 a Abril 25', 29
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'PARANOITA' where g.chave = 'cima' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(15.0, a.populacao_estimada),
  casas = coalesce(1.0, a.casas),
  liderancas = coalesce(2.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'cima' and a.nome = 'PARAXOTINGA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 21000.0, 'Out 24 a Abril 25', 30
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'PARAXOTINGA' where g.chave = 'cima' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(35.0, a.populacao_estimada),
  casas = coalesce(8.0, a.casas),
  liderancas = coalesce(2.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'cima' and a.nome = 'ITANARONGA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 28100.0, 'Out 24 a Abril 25', 31
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'ITANARONGA' where g.chave = 'cima' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(26.0, a.populacao_estimada),
  casas = coalesce(5.0, a.casas),
  liderancas = coalesce(2.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'cima' and a.nome = 'MOROPAIGA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 28500.0, 'Out 24 a Abril 25', 32
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'MOROPAIGA' where g.chave = 'cima' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(null, a.populacao_estimada),
  casas = coalesce(12.0, a.casas),
  liderancas = coalesce(2.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'cima' and a.nome = 'PARANOONA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 32400.0, 'Out 24 a Abril 25', 33
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'PARANOONA' where g.chave = 'cima' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(20.0, a.populacao_estimada),
  casas = coalesce(3.0, a.casas),
  liderancas = coalesce(2.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'cima' and a.nome = 'PARAPYPEREWA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 36800.0, 'Out 24 a Abril 25', 34
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'PARAPYPEREWA' where g.chave = 'cima' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 43050.0, 'Out 24 a Abril 25', 35
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'NÃO IDENTIFICADO' where g.chave = 'cima' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(44.0, a.populacao_estimada),
  casas = coalesce(11.0, a.casas),
  liderancas = coalesce(2.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'cima' and a.nome = 'PARANOA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 55800.0, 'Out 24 a Abril 25', 36
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'PARANOA' where g.chave = 'cima' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(49.0, a.populacao_estimada),
  casas = coalesce(7.0, a.casas),
  liderancas = coalesce(2.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'cima' and a.nome = 'ITAPEYGA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 59150.0, 'Out 24 a Abril 25', 37
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'ITAPEYGA' where g.chave = 'cima' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(41.0, a.populacao_estimada),
  casas = coalesce(18.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'cima' and a.nome = 'INAXYNGANGA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 97400.0, 'Out 24 a Abril 25', 38
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'INAXYNGANGA' where g.chave = 'cima' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;
update public.carbon_aldeias a set
  populacao_estimada = coalesce(107.0, a.populacao_estimada),
  casas = coalesce(35.0, a.casas),
  liderancas = coalesce(1.0, a.liderancas),
  censo_origem = 'Planilha de antecipacao, bloco de cadastro de aldeias',
  atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where a.grupo_id = g.id and g.chave = 'cima' and a.nome = 'MAROXEWARA';
insert into public.carbon_aldeia_rateio (ciclo_id, aldeia_id, valor, origem_aba, origem_linha)
select c.id, a.id, 117650.0, 'Out 24 a Abril 25', 39
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_aldeias a on a.grupo_id = g.id and a.nome = 'MAROXEWARA' where g.chave = 'cima' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, aldeia_id) do update set valor = excluded.valor;

insert into public.carbon_eixo_resumo (ciclo_id, eixo_id, valor, entregas, origem_aba, origem_linha)
select c.id, e.id, 194079.87, '45 placas solares, 43 baterias e 21 inversores', 'Outubro 24 - Abril 25', 62
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_eixos e on e.projeto_id = g.projeto_id and e.nome = 'Energia' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, eixo_id) do update set
  valor = excluded.valor, entregas = excluded.entregas;
insert into public.carbon_eixo_resumo (ciclo_id, eixo_id, valor, entregas, origem_aba, origem_linha)
select c.id, e.id, 35000.0, '5 poços artesianos', 'Outubro 24 - Abril 25', 63
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_eixos e on e.projeto_id = g.projeto_id and e.nome = 'Saneamento' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, eixo_id) do update set
  valor = excluded.valor, entregas = excluded.entregas;
insert into public.carbon_eixo_resumo (ciclo_id, eixo_id, valor, entregas, origem_aba, origem_linha)
select c.id, e.id, 120934.09, 'Despesas com Associação (Advogado, contador, diretoria e ajuda de custo para caciques)', 'Outubro 24 - Abril 25', 64
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_eixos e on e.projeto_id = g.projeto_id and e.nome = 'Fortalecimento Institucional' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, eixo_id) do update set
  valor = excluded.valor, entregas = excluded.entregas;
insert into public.carbon_eixo_resumo (ciclo_id, eixo_id, valor, entregas, origem_aba, origem_linha)
select c.id, e.id, 68689.82, '20 antenas de Starlink', 'Outubro 24 - Abril 25', 65
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_eixos e on e.projeto_id = g.projeto_id and e.nome = 'Internet' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, eixo_id) do update set
  valor = excluded.valor, entregas = excluded.entregas;
insert into public.carbon_eixo_resumo (ciclo_id, eixo_id, valor, entregas, origem_aba, origem_linha)
select c.id, e.id, 23427.0, '3 Motoserras e 2 roçadeiras', 'Outubro 24 - Abril 25', 66
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_eixos e on e.projeto_id = g.projeto_id and e.nome = 'Cadeia Produtiva' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, eixo_id) do update set
  valor = excluded.valor, entregas = excluded.entregas;
insert into public.carbon_eixo_resumo (ciclo_id, eixo_id, valor, entregas, origem_aba, origem_linha)
select c.id, e.id, 9629.0, 'Festa do boi', 'Outubro 24 - Abril 25', 67
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_eixos e on e.projeto_id = g.projeto_id and e.nome = 'Resgate Cultural' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, eixo_id) do update set
  valor = excluded.valor, entregas = excluded.entregas;
insert into public.carbon_eixo_resumo (ciclo_id, eixo_id, valor, entregas, origem_aba, origem_linha)
select c.id, e.id, 3302.0, 'Cesta básica', 'Outubro 24 - Abril 25', 68
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_eixos e on e.projeto_id = g.projeto_id and e.nome = 'Segurança Alimentar' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, eixo_id) do update set
  valor = excluded.valor, entregas = excluded.entregas;
insert into public.carbon_eixo_resumo (ciclo_id, eixo_id, valor, entregas, origem_aba, origem_linha)
select c.id, e.id, 5000.0, 'Cortes de Madeira', 'Outubro 24 - Abril 25', 69
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_eixos e on e.projeto_id = g.projeto_id and e.nome = 'Infraestrutura' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, eixo_id) do update set
  valor = excluded.valor, entregas = excluded.entregas;
insert into public.carbon_eixo_resumo (ciclo_id, eixo_id, valor, entregas, origem_aba, origem_linha)
select c.id, e.id, 18296.0, 'Repasse direto para associação', 'Outubro 24 - Abril 25', 70
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_eixos e on e.projeto_id = g.projeto_id and e.nome = 'Outros' where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025'
on conflict (ciclo_id, eixo_id) do update set
  valor = excluded.valor, entregas = excluded.entregas;
insert into public.carbon_eixo_resumo (ciclo_id, eixo_id, valor, entregas, origem_aba, origem_linha)
select c.id, e.id, 169261.81, 'Cesta básica', 'Maio - Julho 2025', 57
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_eixos e on e.projeto_id = g.projeto_id and e.nome = 'Segurança Alimentar' where g.chave = 'baixo' and c.nome = 'Maio a Julho 2025'
on conflict (ciclo_id, eixo_id) do update set
  valor = excluded.valor, entregas = excluded.entregas;
insert into public.carbon_eixo_resumo (ciclo_id, eixo_id, valor, entregas, origem_aba, origem_linha)
select c.id, e.id, 30166.78, 'Repasse direto para associação', 'Maio - Julho 2025', 58
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_eixos e on e.projeto_id = g.projeto_id and e.nome = 'Outros' where g.chave = 'baixo' and c.nome = 'Maio a Julho 2025'
on conflict (ciclo_id, eixo_id) do update set
  valor = excluded.valor, entregas = excluded.entregas;
insert into public.carbon_eixo_resumo (ciclo_id, eixo_id, valor, entregas, origem_aba, origem_linha)
select c.id, e.id, 100000.0, 'Camionete', 'Maio - Julho 2025', 59
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_eixos e on e.projeto_id = g.projeto_id and e.nome = 'Logística e Mobilidade' where g.chave = 'baixo' and c.nome = 'Maio a Julho 2025'
on conflict (ciclo_id, eixo_id) do update set
  valor = excluded.valor, entregas = excluded.entregas;
insert into public.carbon_eixo_resumo (ciclo_id, eixo_id, valor, entregas, origem_aba, origem_linha)
select c.id, e.id, 77359.0, 'Despesas com Associação (Advogado, contador, diretoria e ajuda de custo para caciques)', 'Maio - Julho 2025', 60
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id join public.carbon_eixos e on e.projeto_id = g.projeto_id and e.nome = 'Fortalecimento Institucional' where g.chave = 'baixo' and c.nome = 'Maio a Julho 2025'
on conflict (ciclo_id, eixo_id) do update set
  valor = excluded.valor, entregas = excluded.entregas;

insert into public.carbon_prestacao_pendencias
  (ciclo_id, grupo_id, documento, item, quantidade, valor_unitario, valor_total,
   data_documento, competencia_prestacao, situacao, observacoes, origem_aba, origem_linha)
select c.id, g.id, '785', 'Placas solares', 16.0, 980.0, 15680.0, '2025-01-09', '2024-12-01', 'aberta', '6 placas solares na nota / Sobrou 10 da nota, das quais descontei duas de janeiro e duas de fevereiro/25. Declarou valor sem considerar desconto', 'Pendencias', 3
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025';
insert into public.carbon_prestacao_pendencias
  (ciclo_id, grupo_id, documento, item, quantidade, valor_unitario, valor_total,
   data_documento, competencia_prestacao, situacao, observacoes, origem_aba, origem_linha)
select c.id, g.id, '3173', 'gerador', 1.0, 7900.0, 7900.0, '2024-10-28', '2024-10-01', 'aberta', 'Valor na prestação é R$ 7800', 'Pendencias', 4
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025';
insert into public.carbon_prestacao_pendencias
  (ciclo_id, grupo_id, documento, item, quantidade, valor_unitario, valor_total,
   data_documento, competencia_prestacao, situacao, observacoes, origem_aba, origem_linha)
select c.id, g.id, '8854', 'baterias moura', 8.0, 890.0, 7120.0, '2024-10-29', '2024-10-02', 'aberta', 'Valor na prestação é R$7600. Quantidade bate', 'Pendencias', 5
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025';
insert into public.carbon_prestacao_pendencias
  (ciclo_id, grupo_id, documento, item, quantidade, valor_unitario, valor_total,
   data_documento, competencia_prestacao, situacao, observacoes, origem_aba, origem_linha)
select c.id, g.id, 'Orc - 35578', 'geradores', 2.0, 7900.0, 15800.0, '2024-10-18', '2024-10-02', 'aberta', 'Valor na prestação é R$ 7800', 'Pendencias', 6
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025';
insert into public.carbon_prestacao_pendencias
  (ciclo_id, grupo_id, documento, item, quantidade, valor_unitario, valor_total,
   data_documento, competencia_prestacao, situacao, observacoes, origem_aba, origem_linha)
select c.id, g.id, '1829', 'baterias moura', 16.0, 895.0, 14320.0, '2025-01-08', '2024-12-01', 'aberta', 'Valor na nota é R$915, mas o da prestação é R$895', 'Pendencias', 7
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025';
insert into public.carbon_prestacao_pendencias
  (ciclo_id, grupo_id, documento, item, quantidade, valor_unitario, valor_total,
   data_documento, competencia_prestacao, situacao, observacoes, origem_aba, origem_linha)
select c.id, g.id, '1874', 'baterias moura', 14.0, 1410.0, 19740.0, '2025-02-26', '2025-02-01', 'aberta', '4 baterias remanescentes na nota', 'Pendencias', 8
  from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id where g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025';

update public.carbon_ciclos_prestacao c set observacoes = 'Receitas e Despesas referentes a outubro 24 a março de 2025

Não foi enviada nenhuma prestação de contas referente a ABRIL 2025

Baseada no relatório de prestação de contas enviado pelo [P467] e alguns comprovantes como extrato PIX e recibos

Os comprovantes do relatório de prestação de contas não contempla todas as despesas enviadas (28% das despesas não possuem comprovantes, total de R$ 89.616,90)', atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where c.grupo_id = g.id and g.chave = 'baixo' and c.nome = 'Outubro 2024 a Abril 2025';
update public.carbon_ciclos_prestacao c set observacoes = 'Receitas e Despesas referente a Maio, Junho e Julho - 2025

Baseada no relatório de prestação de contas enviado pelo [P467]

Não foram enviadas as evidências, exemplo: recibo, NF ou comprovante PIX', atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where c.grupo_id = g.id and g.chave = 'baixo' and c.nome = 'Maio a Julho 2025';
update public.carbon_ciclos_prestacao c set observacoes = 'Planilha com prestação de Contas feita pela [P924]

Principal dificuldade: a planilha não corresponde aos comprovantes que são enviados.

38% dos valores prestados possuem divergências quanto aos valores declarados nas prestações, o que representa um total de R$ 53.700.

Desses valores com pendências, R$ 38.577 são de casos em que comprovantes não foram encontrados na prestação ou que nem houvesse a citação ao indígena recebedor na prestação. Neste caso, há a possibilidade serem valores sobressalentes não declarados inicialmente ou prestações duplicadas, despesas agrupadas etc.', atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where c.grupo_id = g.id and g.chave = 'cima' and c.nome = 'Outubro 2024 a Abril 2025';
update public.carbon_ciclos_prestacao c set observacoes = '34% dos valores prestados possuem divergências quanto aos valores declarados nas prestações, o que representa um total de R$ 87.103.

Desses valores com pendências, R$ 37.591 são de casos em que comprovantes não foram encontrados na prestação ou que nem houvesse a citação ao indígena recebedor na prestação. Neste caso, há a possibilidade serem valores sobressalentes não declarados inicialmente ou prestações duplicadas, despesas agrupadas etc.', atualizado_em = now()
 from public.carbon_grupos_comunitarios g
 where c.grupo_id = g.id and g.chave = 'cima' and c.nome = 'Maio a Setembro 2025';

insert into public.carbon_antecipacoes (ciclo_id, competencia, valor, origem_aba, origem_linha)
select c.id, '2025-06-28', 107337.68, 'Maio a setembro 25', 13 from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id where g.chave = 'cima' and c.nome = 'Maio a Setembro 2025'
on conflict (ciclo_id, competencia) do update set valor = excluded.valor;
insert into public.carbon_antecipacoes (ciclo_id, competencia, valor, origem_aba, origem_linha)
select c.id, '2025-07-28', 108525.92, 'Maio a setembro 25', 14 from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id where g.chave = 'cima' and c.nome = 'Maio a Setembro 2025'
on conflict (ciclo_id, competencia) do update set valor = excluded.valor;
insert into public.carbon_antecipacoes (ciclo_id, competencia, valor, origem_aba, origem_linha)
select c.id, '2025-08-28', 105555.0, 'Maio a setembro 25', 15 from public.carbon_ciclos_prestacao c join public.carbon_grupos_comunitarios g on g.id = c.grupo_id where g.chave = 'cima' and c.nome = 'Maio a Setembro 2025'
on conflict (ciclo_id, competencia) do update set valor = excluded.valor;

-- ASSOCIACAO do Cima: 235 mil de despesa estavam com aldeia_id NULL porque a
-- aldeia nao existia para esse grupo. Cria e reaponta pelo texto da origem.
insert into public.carbon_aldeias (grupo_id, nome, e_associacao)
select g.id, 'ASSOCIAÇÃO', true from public.carbon_grupos_comunitarios g
 where g.chave = 'cima'
on conflict (grupo_id, nome) do update set e_associacao = true;

insert into public.carbon_ods_contribuicoes
  (projeto_id, relatorio, meta_ods, indicador_ods, impacto,
   contribuicao_periodo, contribuicao_vida, idioma, ordem, origem_aba, origem_linha)
select p.id, 'MR-1', '1.2', '1.2.1 - Proporção da população vivendo abaixo da linha nacional de pobreza, desagregada por sexo e idade.', 'Atividades implementadas para reduzir', 'Durante o período de monitoramento, as atividades relacionadas ao projeto, incluindo inventários de fauna, flora e socioeconômicos, envolveram a contratação de indígenas, particularmente lideranças comunitárias e jovens, para a execução dessas tarefas. Essa iniciativa contribuiu para a geração de renda de R$ 1.080.000 para a comunidade.', 'Geração de renda de R$ 1.080.000 para líderes e jovens da comunidade Parakanã.', 'pt', 2, 'ODS - MR 1', 2
  from public.carbon_projetos p
  where p.nome ilike '%parakan%' or p.nome ilike '%awaet%'
on conflict on constraint carbon_ods_origem_uq do update set
  indicador_ods = excluded.indicador_ods, impacto = excluded.impacto,
  contribuicao_periodo = excluded.contribuicao_periodo,
  contribuicao_vida = excluded.contribuicao_vida, atualizado_em = now();
insert into public.carbon_ods_contribuicoes
  (projeto_id, relatorio, meta_ods, indicador_ods, impacto,
   contribuicao_periodo, contribuicao_vida, idioma, ordem, origem_aba, origem_linha)
select p.id, 'MR-1', '2.1', '2.1.2 - Prevalência de insegurança alimentar moderada ou severa, com base na escala de insegurança alimentar.', 'Atividades implementadas para reduzir', 'Durante o período de monitoramento, diversas aldeias receberam doações de alimentos destinadas a mitigar a insegurança alimentar e atender às necessidades imediatas da comunidade Parakanã. Um total de R$ 12.793 foi destinado à distribuição de alimentos nessas comunidades.', 'Um total de R$ 4.513 foi destinado à distribuição de alimentos para o Grupo Baixo, enquanto R$ 8.280 foi destinado ao Grupo Alto.', 'pt', 3, 'ODS - MR 1', 3
  from public.carbon_projetos p
  where p.nome ilike '%parakan%' or p.nome ilike '%awaet%'
on conflict on constraint carbon_ods_origem_uq do update set
  indicador_ods = excluded.indicador_ods, impacto = excluded.impacto,
  contribuicao_periodo = excluded.contribuicao_periodo,
  contribuicao_vida = excluded.contribuicao_vida, atualizado_em = now();
insert into public.carbon_ods_contribuicoes
  (projeto_id, relatorio, meta_ods, indicador_ods, impacto,
   contribuicao_periodo, contribuicao_vida, idioma, ordem, origem_aba, origem_linha)
select p.id, 'MR-1', '7.1', '7.1.1 - Percentual da população com acesso à eletricidade.', 'Atividades implementadas para aumentar', 'Durante o período de monitoramento, três geradores foram fornecidos para atender às necessidades das aldeias: Morapayga do Grupo Alto e Inatoarona e Xanipawaya, ambas do Grupo Baixo.', 'Três geradores foram fornecidos a três aldeias: um ao Grupo Alto e dois ao Grupo Baixo.', 'pt', 4, 'ODS - MR 1', 4
  from public.carbon_projetos p
  where p.nome ilike '%parakan%' or p.nome ilike '%awaet%'
on conflict on constraint carbon_ods_origem_uq do update set
  indicador_ods = excluded.indicador_ods, impacto = excluded.impacto,
  contribuicao_periodo = excluded.contribuicao_periodo,
  contribuicao_vida = excluded.contribuicao_vida, atualizado_em = now();
insert into public.carbon_ods_contribuicoes
  (projeto_id, relatorio, meta_ods, indicador_ods, impacto,
   contribuicao_periodo, contribuicao_vida, idioma, ordem, origem_aba, origem_linha)
select p.id, 'MR-1', null, '10.2.1 - Proporção de indivíduos vivendo abaixo de 50% da renda mediana, desagregada por sexo, idade e pessoas com deficiência.', 'Atividades implementadas para reduzir', 'Durante o período de monitoramento, as atividades relacionadas ao projeto, incluindo inventários de fauna, flora e socioeconômicos, envolveram a contratação de indígenas, particularmente lideranças comunitárias e jovens. Essas iniciativas contribuíram para a geração de renda de R$ 1.080.000 por meio de doação para ambas as associações.', 'Essas iniciativas contribuíram para a geração de renda de R$ 1.080.000 por meio de doação para ambas as associações.', 'pt', 5, 'ODS - MR 1', 5
  from public.carbon_projetos p
  where p.nome ilike '%parakan%' or p.nome ilike '%awaet%'
on conflict on constraint carbon_ods_origem_uq do update set
  indicador_ods = excluded.indicador_ods, impacto = excluded.impacto,
  contribuicao_periodo = excluded.contribuicao_periodo,
  contribuicao_vida = excluded.contribuicao_vida, atualizado_em = now();
insert into public.carbon_ods_contribuicoes
  (projeto_id, relatorio, meta_ods, indicador_ods, impacto,
   contribuicao_periodo, contribuicao_vida, idioma, ordem, origem_aba, origem_linha)
select p.id, 'MR-1', '10.2', '11.2.1 - Proporção da população com acesso adequado ao transporte público, desagregada por sexo, idade e pessoas com deficiência.', 'Atividades implementadas para aumentar', 'Durante o período de monitoramento, o projeto melhorou a logística de transporte para as comunidades indígenas, garantindo sua participação em reuniões fora de seus territórios, facilitando o acesso a unidades de saúde e fornecendo combustível para apoiar sua mobilidade em compromissos comunitários. O valor total destinado a essas atividades foi de R$ 18.708, com R$ 6.028 destinados ao Grupo Baixo e R$ 12.680 ao Grupo Alto.', 'Um total de R$ 18.708 foi destinado à logística de transporte do povo Awaeté, com R$ 6.028 destinados ao Grupo Baixo e R$ 12.680 ao Grupo Alto.', 'pt', 6, 'ODS - MR 1', 6
  from public.carbon_projetos p
  where p.nome ilike '%parakan%' or p.nome ilike '%awaet%'
on conflict on constraint carbon_ods_origem_uq do update set
  indicador_ods = excluded.indicador_ods, impacto = excluded.impacto,
  contribuicao_periodo = excluded.contribuicao_periodo,
  contribuicao_vida = excluded.contribuicao_vida, atualizado_em = now();
insert into public.carbon_ods_contribuicoes
  (projeto_id, relatorio, meta_ods, indicador_ods, impacto,
   contribuicao_periodo, contribuicao_vida, idioma, ordem, origem_aba, origem_linha)
select p.id, 'MR-1', '11.2', '11.4.1 - Despesa total per capita (pública e privada) destinada à preservação, proteção e conservação de todo o patrimônio cultural e natural, desagregada por tipo de patrimônio (cultural, natural, misto e sítios designados como Patrimônio Mundial), nível de governo (nacional, regional e local), tipo de despesa (corrente/investimento) e tipo de financiamento privado.', 'Atividades implementadas para aumentar', 'Durante o período de monitoramento, foram realizadas atividades relacionadas ao inventário de fauna, avaliação de biodiversidade florística e diagnóstico socioeconômico, incorporando as especificidades culturais do povo Parakanã. Além disso, patrulhas territoriais foram realizadas para assegurar a preservação e proteção.', 'Um inventário de fauna, um inventário de flora e um censo diagnóstico foram realizados, juntamente com uma patrulha para garantir a preservação e proteção do patrimônio natural e cultural.', 'pt', 7, 'ODS - MR 1', 7
  from public.carbon_projetos p
  where p.nome ilike '%parakan%' or p.nome ilike '%awaet%'
on conflict on constraint carbon_ods_origem_uq do update set
  indicador_ods = excluded.indicador_ods, impacto = excluded.impacto,
  contribuicao_periodo = excluded.contribuicao_periodo,
  contribuicao_vida = excluded.contribuicao_vida, atualizado_em = now();
insert into public.carbon_ods_contribuicoes
  (projeto_id, relatorio, meta_ods, indicador_ods, impacto,
   contribuicao_periodo, contribuicao_vida, idioma, ordem, origem_aba, origem_linha)
select p.id, 'MR-1', '11.4', '13.2.2 - Total anual de emissões de Gases de Efeito Estufa (GEE).', 'Atividades implementadas para reduzir', 'O projeto reduziu com sucesso as emissões de GEE em 1.366.236 tCO₂e durante este período de monitoramento.', 'O projeto evitou a emissão de 1.366.236 tCO₂e na atmosfera.', 'pt', 8, 'ODS - MR 1', 8
  from public.carbon_projetos p
  where p.nome ilike '%parakan%' or p.nome ilike '%awaet%'
on conflict on constraint carbon_ods_origem_uq do update set
  indicador_ods = excluded.indicador_ods, impacto = excluded.impacto,
  contribuicao_periodo = excluded.contribuicao_periodo,
  contribuicao_vida = excluded.contribuicao_vida, atualizado_em = now();
insert into public.carbon_ods_contribuicoes
  (projeto_id, relatorio, meta_ods, indicador_ods, impacto,
   contribuicao_periodo, contribuicao_vida, idioma, ordem, origem_aba, origem_linha)
select p.id, 'MR-1', '13.2', 'Montantes fornecidos e mobilizados em dólares por ano em relação à meta coletiva de mobilização de US$ 100 bilhões até 2025.', 'Atividades implementadas para aumentar', 'Implementação e desenvolvimento do Projeto Awaeté REDD+ dentro da comunidade Parakanã para gerar fluxos financeiros dedicados à mitigação das mudanças climáticas, conservação ambiental e melhoria do bem-estar comunitário.', 'Projeto Awaeté REDD+ dentro da comunidade Parakanã.', 'pt', 9, 'ODS - MR 1', 9
  from public.carbon_projetos p
  where p.nome ilike '%parakan%' or p.nome ilike '%awaet%'
on conflict on constraint carbon_ods_origem_uq do update set
  indicador_ods = excluded.indicador_ods, impacto = excluded.impacto,
  contribuicao_periodo = excluded.contribuicao_periodo,
  contribuicao_vida = excluded.contribuicao_vida, atualizado_em = now();
insert into public.carbon_ods_contribuicoes
  (projeto_id, relatorio, meta_ods, indicador_ods, impacto,
   contribuicao_periodo, contribuicao_vida, idioma, ordem, origem_aba, origem_linha)
select p.id, 'MR-1', '13.a', '13.b.1 - Número de estratégias desenvolvidas localmente para mitigação e adaptação às mudanças climáticas, incluindo planos de gestão territorial, iniciativas de conservação ambiental e participação em políticas climáticas nacionais e internacionais.', 'Atividades implementadas para aumentar', 'Dois acordos de parceria estratégica foram formalizados com as associações indígenas Paranatinga Parakanã e Wyrapina Awaeté. Esses acordos visam facilitar o desenvolvimento do projeto de crédito de carbono, fortalecer as estruturas de governança local e promover a valorização dos recursos florestais, gerando benefícios ambientais, sociais e econômicos para a comunidade Parakanã.', 'Estabelecimento de parceria estratégica com as associações indígenas Paranatinga Parakanã e Wyrapina Awaeté.', 'pt', 10, 'ODS - MR 1', 10
  from public.carbon_projetos p
  where p.nome ilike '%parakan%' or p.nome ilike '%awaet%'
on conflict on constraint carbon_ods_origem_uq do update set
  indicador_ods = excluded.indicador_ods, impacto = excluded.impacto,
  contribuicao_periodo = excluded.contribuicao_periodo,
  contribuicao_vida = excluded.contribuicao_vida, atualizado_em = now();
insert into public.carbon_ods_contribuicoes
  (projeto_id, relatorio, meta_ods, indicador_ods, impacto,
   contribuicao_periodo, contribuicao_vida, idioma, ordem, origem_aba, origem_linha)
select p.id, 'MR-1', '13.b', '15.2.1 - Progresso no Manejo Florestal Sustentável.', 'Atividades implementadas para aumentar', 'Durante o período de monitoramento, 2.592 ha de floresta foram conservados por meio da implementação de tecnologias de sensoriamento remoto. Além disso, a vigilância territorial foi fortalecida com a participação ativa dos ADLs em 8 patrulhas por toda a área, garantindo a proteção do território.', 'Conservação de 2.592 hectares e realização de 8 patrulhas de vigilância territorial em todo o território.', 'pt', 11, 'ODS - MR 1', 11
  from public.carbon_projetos p
  where p.nome ilike '%parakan%' or p.nome ilike '%awaet%'
on conflict on constraint carbon_ods_origem_uq do update set
  indicador_ods = excluded.indicador_ods, impacto = excluded.impacto,
  contribuicao_periodo = excluded.contribuicao_periodo,
  contribuicao_vida = excluded.contribuicao_vida, atualizado_em = now();
insert into public.carbon_ods_contribuicoes
  (projeto_id, relatorio, meta_ods, indicador_ods, impacto,
   contribuicao_periodo, contribuicao_vida, idioma, ordem, origem_aba, origem_linha)
select p.id, 'MR-1', '15.2', '15.5.1 - Índice da Lista Vermelha.', 'Atividades implementadas para reduzir', 'Durante o período de monitoramento, foi realizado um inventário de fauna, resultando na identificação de 326 espécies. Isso inclui 222 espécies de aves, 29 espécies de mamíferos e 75 espécies de herpetofauna. Paralelamente, foi realizado um inventário de biodiversidade florística, levando à identificação de 122 espécies pertencentes a 28 famílias botânicas. Além disso, 6 espécies foram identificadas como ameaçadas segundo a Lista Vermelha da IUCN.', 'Um total de 326 espécies de fauna e 122 espécies de flora foram identificadas durante a avaliação. 6 espécies foram identificadas como ameaçadas de extinção.', 'pt', 12, 'ODS - MR 1', 12
  from public.carbon_projetos p
  where p.nome ilike '%parakan%' or p.nome ilike '%awaet%'
on conflict on constraint carbon_ods_origem_uq do update set
  indicador_ods = excluded.indicador_ods, impacto = excluded.impacto,
  contribuicao_periodo = excluded.contribuicao_periodo,
  contribuicao_vida = excluded.contribuicao_vida, atualizado_em = now();
insert into public.carbon_ods_contribuicoes
  (projeto_id, relatorio, meta_ods, indicador_ods, impacto,
   contribuicao_periodo, contribuicao_vida, idioma, ordem, origem_aba, origem_linha)
select p.id, 'MR-1', '15.5', '15.5.1 - Red List Index.', 'Implemented activities to decrease.', 'During the monitoring period, a fauna inventory was conducted, resulting in the identification of 326 species. This included 222 avian species, 29 mammalian species, and 75 herpetofauna species. Concurrently, a floristic biodiversity inventory was undertaken, leading to the identification of 122 species belonging to 28 botanical families. Furthermore, 6 species were identified as facing some level of threat according to the IUCN Red List.', 'A total of 326 fauna species and 122 flora species were identified during the assessment. 6 species were identified as facing some level of extinction threat.', 'en', 13, 'ODS - MR 1', 13
  from public.carbon_projetos p
  where p.nome ilike '%parakan%' or p.nome ilike '%awaet%'
on conflict on constraint carbon_ods_origem_uq do update set
  indicador_ods = excluded.indicador_ods, impacto = excluded.impacto,
  contribuicao_periodo = excluded.contribuicao_periodo,
  contribuicao_vida = excluded.contribuicao_vida, atualizado_em = now();

update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Acordo SPE x LDA', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 2;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Acordo SPE x LDAs x Associação', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 3;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Carta FUNAI', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 4;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ofício Convite Seminário FUNAI 1', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 5;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ofício Convite Seminário FUNAI 2', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 6;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ata Seminário Grupo Baixo', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 7;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 8;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ata Seminário Grupo de Cima', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 9;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 10;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ofício Convite CLPI FUNAI', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 11;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ofício Convite CLPI Programa PKN', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 12;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 13;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Construção guarita: fortalecimento da proteção territorial da aldeia Xataopawa, localizada no Grupo de Cima da Terra Indígena Parakanã. Promoção de autonomia e o empoderamento da comunidade indígena, que participou ativamente de todas as etapas do projeto, desde o planejamento até a construção. / Capacitação guarda florestal: Capacitação de 20 indígenas para identificarem sinais de desmatamento, caça ilegal e outras atividades prejudiciais ao meio ambiente em seu território.', beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 1', link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 15;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Fortalecimento de autonomia e representatividade legal, permitindo acesso a recursos, parcerias e financiamentos, participação em editais e projetos governamentais e 05r poder na defesa de direitos territoriais e culturais. Além disso, facilita a formalização de acordos comerciais e ambientais, como projetos de crédito de carbono e iniciativas de sustentabilidade.', beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 16;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Acesso a recursos financeiros sustentáveis para investir em preservação e monitoramento da floresta, infraestrutura, educação, saúde e proteção territorial. Além disso, fortalece a autonomia da comunidade, valoriza o conhecimento tradicional, promove a preservação ambiental e aumenta o reconhecimento dos seus direitos sobre o território.', beneficio_comunidade),
  link_evidencia = coalesce('Contrato Assinado SPE x Grupo Cima', link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 17;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Proposta Prestador Serviço - Inventário Flora', link_evidencia),
  linha_estrategica_2 = coalesce('Biodiversidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 18;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Fortalecimento de autonomia e representatividade legal, permitindo acesso a recursos, parcerias e financiamentos, participação em editais e projetos governamentais e 05r poder na defesa de direitos territoriais e culturais. Além disso, facilita a formalização de acordos comerciais e ambientais, como projetos de crédito de carbono e iniciativas de sustentabilidade.', beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 19;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 1', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 20;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Atividades de engajamento fortalecem a coesão comunitária, garantindo que diferentes grupos, incluindo lideranças e mulheres, sejam ouvidos. Isso promove autonomia, melhora a gestão territorial e assegura que decisões reflitam os interesses de toda a comunidade. Além disso, reforça a preservação cultural e facilita o acesso a oportunidades e direitos.', beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 2', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 21;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Fotos Engajamento Comunidade', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 22;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Atividades de engajamento fortalecem a coesão comunitária, garantindo que diferentes grupos, incluindo lideranças e mulheres, sejam ouvidos. Isso promove autonomia, melhora a gestão territorial e assegura que decisões reflitam os interesses de toda a comunidade. Além disso, reforça a preservação cultural e facilita o acesso a oportunidades e direitos.', beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 2', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 23;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Fotos Engajamento Comunidade', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 24;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 2', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 25;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Acesso a recursos financeiros sustentáveis para investir em preservação e monitoramento da floresta, infraestrutura, educação, saúde e proteção territorial. Além disso, fortalece a autonomia da comunidade, valoriza o conhecimento tradicional, promove a preservação ambiental e aumenta o reconhecimento dos seus direitos sobre o território.', beneficio_comunidade),
  link_evidencia = coalesce('Contrato Assinado SPE x Grupo Baixo', link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 26;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Acesso a recursos financeiros sustentáveis para investir em preservação e monitoramento da floresta, infraestrutura, educação, saúde e proteção territorial. Além disso, fortalece a autonomia da comunidade, valoriza o conhecimento tradicional, promove a preservação ambiental e aumenta o reconhecimento dos seus direitos sobre o território.', beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 3', link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 27;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 3', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 28;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Oficio Associações', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 29;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 3', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 30;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Potencial créditos VM0015', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 31;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Atividades 4', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 32;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 4', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 33;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatorio Atividades 5', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 34;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatorio Atividades 5', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 35;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatorio Atividades 5', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 36;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('entrega de geradores de energia melhora a qualidade de vida, garantindo iluminação.  Além de viabilizar atividades como comunicação e segurança, fortalecendo a autonomia da comunidade', beneficio_comunidade),
  link_evidencia = coalesce('Relatorio Atividades 5', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 37;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('entrega de geradores de energia melhora a qualidade de vida, garantindo iluminação.  Além de viabilizar atividades como comunicação e segurança, fortalecendo a autonomia da comunidade', beneficio_comunidade),
  link_evidencia = coalesce('Relatorio Atividades 5', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 38;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatorio Monitoramento 5', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 39;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Atividades 6', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 40;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 41;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 42;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 43;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ofício FUNAI', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 44;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ofício ProPKN', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 45;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 46;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 6', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 47;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('A reunião com outros stakeholders para apoiar as atividades do projeto de crédito de carbono traz benefícios como o fortalecimento de parcerias estratégicas, acesso a recursos técnicos e financeiros e 05r visibilidade e reconhecimento do projeto. Além disso, possibilita a troca de conhecimentos, o aprimoramento da gestão territorial e ambiental e a criação de oportunidades para a comunidade em áreas como educação, bioeconomia e infraestrutura. Esse apoio contribui para a sustentabilidade e a eficácia do projeto a longo prazo, garantindo que ele gere impactos positivos tanto ambientais quanto sociais.', beneficio_comunidade),
  link_evidencia = coalesce('Relatório Atividades 6', link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 48;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Fotos', link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 49;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Fortalecimento de autonomia e protagonismo da comunidade no processo. Esse envolvimento garante que o projeto esteja alinhado às necessidades e conhecimentos tradicionais da comunidade, promovendo a valorização da biodiversidade e a proteção do território.', beneficio_comunidade),
  link_evidencia = coalesce('Relatório Atividades 6', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 50;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Fotos', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 51;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Atividades 6', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 52;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Fotos', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 53;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Busca por parcerias para diversificação de fontes de renda, ao conectar a comunidade a mercados sustentáveis.Além disso, fortalece parcerias estratégicas, amplia oportunidades de certificação e valorização dos produtos locais, e possibilita a troca de conhecimento sobre boas práticas ambientais alinhadas ao projeto de carbono. Isso contribui para a preservação da floresta, garantindo que o manejo do açaí seja sustentável e gere benefícios socioeconômicos de longo prazo.', beneficio_comunidade),
  link_evidencia = coalesce('Relatório Atividades 6', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 54;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Fotos', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 55;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Inicio do mapeamento das condições reais da comunidade. A coleta de dados da comunidade em um projeto de crédito de carbono traz benefícios como a melhoria no planejamento e tomada de decisões, garantindo que as ações sejam adaptadas às necessidades e realidade local. Além disso, permite um mapeamento preciso do território, infraestrutura e atividades produtivas, facilitando a captação de recursos e a estruturação de iniciativas de sustentabilidade e geração de renda. Também fortalece a autonomia da comunidade, promovendo 05r controle sobre seu território e possibilitando uma melhor negociação e valorização dos créditos de carbono no mercado.', beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 7', link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 56;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Dados', link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 57;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 7', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 58;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 7', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 59;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('O sensoriamento remoto do território em um projeto de crédito de carbono permite um monitoramento preciso e contínuo das mudanças no uso do solo, ajudando a comunidade indígena a proteger seu território contra invasões, desmatamento e atividades ilegais. Essa tecnologia também possibilita a tomada de decisões estratégicas para o manejo sustentável da terra, fortalecendo a autonomia da comunidade e aumentando a valorização dos créditos de carbono no mercado.', beneficio_comunidade),
  link_evidencia = coalesce('Contrato Prestador Serviço 1', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 60;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 8', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 61;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Proposta Inventário', link_evidencia),
  linha_estrategica_2 = coalesce('Biodiversidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 62;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 8', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 63;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Instrumento Doação 1', link_evidencia),
  linha_estrategica_2 = coalesce('Cadeia bioeconomia', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 64;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 8', link_evidencia),
  linha_estrategica_2 = coalesce('Cadeia bioeconomia', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 65;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('1. Fortalecimento da gestão territorial e cultural: O inventário documenta a riqueza biológica do território, reforçando a importância da preservação e validando o conhecimento tradicional sobre espécies e ecossistemas. / Esse conhecimento pode ser incorporado em programas de manejo sustentável, ajudando a comunidade a decidir como usar e proteger os recursos naturais. / 2. Apoio à certificação do crédito de carbono: Um inventário bem estruturado ajuda a comprovar a conservação ambiental do território, aumentando a credibilidade do projeto no mercado de carbono. Isso pode elevar o valor dos créditos e atrair investidores que valorizam projetos com forte impacto socioambiental. / 3. Geração de oportunidades econômicas: Ao mapear a biodiversidade, a comunidade pode identificar recursos naturais de interesse comercial, como plantas medicinais, frutos nativos e matérias-primas para artesanato. Esse conhecimento pode impulsionar cadeias produtivas sustentáveis, trazendo renda complementar sem comprometer o meio ambiente. / 4. Criação de parcerias e acesso a financiamentos: Instituições ambientais e de pesquisa podem se interessar pelo território, trazendo projetos de conservação e educação ambiental. O inventário pode abrir portas para editais e financiamentos que incentivam a preservação e o uso sustentável da biodiversidade. / 5. Proteção contra ameaças externas: Ao documentar a fauna e a flora, a comunidade pode reivindicar seus direitos sobre o território e combater invasões, exploração ilegal e degradação ambiental. / Isso fortalece a argumentação contra políticas ou projetos externos que possam ameaçar seus recursos naturais. / 6. Engajamento da comunidade e transmissão de conhecimento: A participação ativa no inventário fortalece o envolvimento dos indígenas, incentivando o resgate e a valorização dos saberes tradicionais sobre plantas e animais. / Esse processo pode estimular a educação e a formação de jovens indígenas como monitores ambientais, criando oportunidades para que a própria comunidade lidere e gerencie ações de conservação.', beneficio_comunidade),
  link_evidencia = coalesce('Contrato Prestação Serviço 2', link_evidencia),
  linha_estrategica_2 = coalesce('Biodiversidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 66;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 8', link_evidencia),
  linha_estrategica_2 = coalesce('Biodiversidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 67;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 8', link_evidencia),
  linha_estrategica_2 = coalesce('Biodiversidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 68;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Biodiversidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 69;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('A atividade de georreferenciamento das aldeias traz benefícios significativos para a comunidade indígena, pois permite a delimitação precisa e o mapeamento do território, o que fortalece a segurança territorial e assegura a proteção contra ameaças externas, como invasões ou disputas fundiárias. Além disso, o georreferenciamento facilita a gestão eficiente dos recursos naturais, possibilitando o planejamento sustentável do uso do solo. Também contribui para a visibilidade e o reconhecimento oficial das terras, auxiliando em processos de reivindicação de direitos e garantindo a preservação cultural e ambiental das comunidades.', beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 9', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 70;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 71;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('O envolvimento da comunidade indígena nas atividades do inventário de fauna e flora proporciona benefícios diretos, como o fortalecimento do conhecimento tradicional sobre o território, a geração de renda com a remuneração pelo trabalho realizado e a valorização da participação ativa na conservação ambiental. /', beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 9', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 72;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 73;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 9', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 74;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Promoção de transparência e fortaleciento de comunicação com os diversos atores envolvidos no projeto. Esse tipo de comunicação facilita o acesso a recursos e parcerias, contribui para a visibilidade e reconhecimento da TI, e assegura que as atividades do projeto sejam realizadas de forma coordenada e em conformidade com as regulamentações locais e nacionais.', beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 9', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 75;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ofício Cronograma Atividades', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 76;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('garante que as equipes envolvidas no projeto compreendam profundamente as especificidades culturais e ambientais do território. O treinamento proporciona uma abordagem mais sensível e respeitosa ao realizar as atividades de campo, o que minimiza impactos negativos no ambiente e nas práticas tradicionais da comunidade.', beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 9', link_evidencia),
  linha_estrategica_2 = coalesce('Biodiversidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 77;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Apresentação Treinamento da Equipe', link_evidencia),
  linha_estrategica_2 = coalesce('Biodiversidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 78;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Fotos Treinamento', link_evidencia),
  linha_estrategica_2 = coalesce('Biodiversidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 79;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Fotos Montagem Acampamentos', link_evidencia),
  linha_estrategica_2 = coalesce('Biodiversidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 80;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 9', link_evidencia),
  linha_estrategica_2 = coalesce('Biodiversidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 81;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Além disso, o envolvimento da comunidade na capacitação e na coleta de dados fortalece o empoderamento local, contribui para o desenvolvimento de habilidades e promove o engajamento ativo nas decisões sobre o uso sustentável dos recursos naturais. A formação da equipe também assegura que o inventário seja conduzido de forma técnica, precisa e alinhada aos objetivos de conservação e manejo sustentável, beneficiando tanto a preservação ambiental quanto a qualidade de vida da comunidade.', beneficio_comunidade),
  link_evidencia = coalesce('Fotos Campo Inventário', link_evidencia),
  linha_estrategica_2 = coalesce('Biodiversidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 82;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 10', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 83;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 10', link_evidencia),
  linha_estrategica_2 = coalesce('Biodiversidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 84;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 10', link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 85;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Fotos Reunião Stakeholders', link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 86;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 10', link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 87;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 88;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 11', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 89;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Aumento de melhoria do indicador 2.1.2 ODS;  Segurança alimentar imediata: Garantia de acesso a alimentos essenciais, especialmente em momentos de escassez ou dificuldades no cultivo local.Melhoria na saúde da comunidade: Fornecimento de alimentos nutritivos que contribuem para a saúde e bem-estar da população; Alívio para famílias em situação de vulnerabilidade: Suporte direto às famílias em 05r necessidade, assegurando que as necessidades básicas sejam atendidas.', beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 90;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 11', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 91;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Acesso a Serviços Essenciais - Facilita o deslocamento para unidades de saúde, garantindo atendimento médico, vacinação e outros serviços fundamentais. / Fortalecimento da Governança Comunitária - Permite que lideranças indígenas participem de reuniões externas, promovendo a autonomia na tomada de decisões e o engajamento em políticas públicas. / Inclusão em Processos de Consulta e Diálogo - Viabiliza a participação em reuniões com stakeholders, órgãos governamentais e parceiros, garantindo que os interesses da comunidade sejam representados.', beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 94;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Cadeia bioeconomia', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 111;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 11', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 112;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ofício ICMBIO', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 113;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 12', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 115;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 12', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 117;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 12', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 118;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('A atividade de reunião com stakeholders das cadeias produtivas do açaí e da castanha traz benefícios significativos para a comunidade indígena, pois permite o fortalecimento do diálogo e da colaboração entre diferentes partes envolvidas na produção e comercialização desses produtos. Essa interação proporciona à comunidade acesso a informações e conhecimentos técnicos que podem melhorar a gestão das cadeias produtivas, promovendo práticas mais eficientes e sustentáveis. Além disso, as reuniões criam oportunidades para a construção de parcerias e a atração de recursos e investimentos para o fortalecimento econômico da comunidade, respeitando seus valores e necessidades. A participação ativa das lideranças indígenas nesses encontros garante que as decisões tomadas estejam alinhadas com os interesses locais, contribuindo para o desenvolvimento sustentável, o empoderamento econômico e a preservação dos recursos naturais.', beneficio_comunidade),
  link_evidencia = coalesce('Entrevistas cadeia açaí', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 119;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Entrevistas cadeia castanha', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 120;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Questionário Operadores Logisticos Açaí', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 121;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Questionário Indústrias Açaí', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 122;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Questionário Operadores Logistics Castanha', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 123;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Questionário Indústrias Castanha', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 124;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 12', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 125;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Fotos Treinamento Cadeias', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 126;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 12', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 130;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 13', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 136;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 13', link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 138;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 13', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 139;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 13', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 140;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 13', link_evidencia),
  linha_estrategica_2 = coalesce('Cadeia bioeconomia', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 142;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Estabelecer parcerias com as lideranças indígenas é essencial para o êxito do projeto, pois assegura a participação ativa da comunidade nas decisões e ações relativas à gestão territorial, ao monitoramento ambiental e à comercialização dos créditos de carbono, além de contribuir para o desenvolvimento sustentável da Terra Indígena Parakanã.', beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 13', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 143;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 13', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 146;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 13', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 147;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 13', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 148;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 13', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 152;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 13', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 154;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 14', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 156;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatorio Interelos Etapa 3', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 158;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('Aumento da produtividade agrícola: O acesso a ferramentas adequadas facilita o manejo eficiente da terra, melhorando a qualidade e a quantidade da produção. / Redução de esforço físico: Ferramentas apropriadas, como motosserras e arados, reduzem o trabalho manual, aumentando a eficiência e diminuindo o cansaço físico dos agricultores. Promoção da autonomia: A comunidade ganha 05r controle sobre suas atividades agrícolas, com menos dependência de apoio externo', beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 160;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 13', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 166;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 14', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 169;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 14', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 173;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 14', link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 177;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 14', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 180;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ofício Convite ProPKN', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 181;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 15', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 183;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 14', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 185;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 14', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 186;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 14', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 187;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ofício Atividades Ilegais - IBAMA', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 188;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 14', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 189;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 14', link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 191;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 14', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 192;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 15', link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 193;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ata CLPI 02/04/24', link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 194;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 195;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 15', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 196;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('autonomia da comunidade para tomar suas proprias decisoes; Teoria da Mudança feita de acordo com as prioridades da comunidade, aumento de transparencia do projeto', beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 15', link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 198;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ata CLPI 03/04/24', link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 199;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 200;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 15', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 201;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Contrato Assinado - CarbonFor', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 202;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 15', link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 203;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ata CLPI 05/04/24', link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 204;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 205;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 15', link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 206;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Ata CLPI 06/04/24', link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 207;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 208;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce('aumento da participação feminina no processo decisorio da comunidade, certeza que demandas femininas estão sendo ouvidas, Empoderamento Feminino: A reunião oferece um espaço para as mulheres expressarem suas opiniões, preocupações e ideias, promovendo o empoderamento das mulheres dentro da comunidade. Isso fortalece sua participação em decisões importantes, permitindo-lhes um papel ativo nas discussões sobre o projeto.', beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 15', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 209;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 15', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 214;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 15', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 215;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 15', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 216;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 15', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 217;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 16', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 221;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 15', link_evidencia),
  linha_estrategica_2 = coalesce(null, linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 226;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 15', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 227;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Atividades 15', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 228;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 17', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 237;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 241;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Fortalecimento cultural e de governança', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 244;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 245;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 246;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 247;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 248;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 249;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 250;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 251;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 252;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade entorno', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 253;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório Monitoramento 18', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 261;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Evidencia 3 tri', link_evidencia),
  linha_estrategica_2 = coalesce('Cadeia bioeconomia', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 279;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Evidencia 3 tri', link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 280;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Campo', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 281;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Campo', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 282;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Campo', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 283;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Campo', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 284;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce('Relatório de Campo', link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 285;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 286;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 287;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 288;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 289;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 290;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Preservação floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 291;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 292;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 293;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Cadeia bioeconomia', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 294;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Monitoramento floresta', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 295;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 298;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 299;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 300;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 301;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 302;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 303;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 304;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 305;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 306;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 307;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 308;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 309;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 310;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 311;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('Comunidade', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 312;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('-', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 319;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('-', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 320;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('-', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 322;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('-', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 323;
update public.carbon_atividades_campo set
  beneficio_comunidade = coalesce(null, beneficio_comunidade),
  link_evidencia = coalesce(null, link_evidencia),
  linha_estrategica_2 = coalesce('-', linha_estrategica_2),
  atualizado_em = now()
 where relatorio = 'MR-1' and origem_aba = 'MR - 1' and origem_linha = 326;

commit;

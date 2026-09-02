-- O upsert do seed e das telas identifica o ciclo por (grupo, nome). Sem o
-- unique, rodar o seed duas vezes duplicaria os quatro ciclos em silencio.
alter table public.carbon_ciclos_prestacao
  add constraint carbon_ciclos_grupo_nome_uq unique (grupo_id, nome);

-- =============================================================================
-- carbon_mr_capitulos: o padrao chega ao quarto nivel de capitulo
-- =============================================================================
-- O CHECK aceitava `nivel between 1 and 3` porque o primeiro relatorio de
-- monitoramento nao passava de tres niveis. O segundo passa: existem 9 capitulos
-- do tipo "2.1.10.1 Double Counting and Participation under Other GHG Programs -
-- No Double Issuance", em que a Verra desdobrou um item em subitens numerados.
--
-- Nao e caso excepcional a tratar com gambiarra: e o padrao VCS/CCB crescendo, e
-- vai voltar a acontecer. Quatro niveis cobrem o que a Verra publica hoje; se um
-- dia vier o quinto, este e o lugar de mexer.
--
-- O check de coerencia entre `nivel` e a quantidade de pontos do codigo continua
-- valendo e nao precisa mudar: ele deriva o nivel do proprio codigo.
-- =============================================================================

begin;

alter table public.carbon_mr_capitulos
  drop constraint if exists carbon_mr_capitulos_nivel_check;

alter table public.carbon_mr_capitulos
  add constraint carbon_mr_capitulos_nivel_chk check (nivel between 1 and 4);

commit;

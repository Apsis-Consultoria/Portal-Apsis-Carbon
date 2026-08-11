
## 2026-08-08 - Subir o sistema Apsis Carbon em ambiente local e entregar ao dono uma URL funcional (localhost) para inspecao visual, sem alterar codigo de producao. Bloqueio atual: a sessao so tem acesso liberado a 'C:/Dev/Orquestrador Local/apps/server'; a pasta 'C:/Users/FilipeOliveiraAPSISC/dev/Apsis/Apsis Carbon' precisa ser autorizada pelo dono antes da execucao.
- [ ] [backend] Mapear a stack do projeto: ler package.json/requirements, scripts de start, .env.example e porta padrao; produzir nota de 5 linhas com o comando exato de subida e dependencias faltantes
- [ ] [backend] Instalar dependencias e subir o servico em modo dev na porta local; aceite: processo ativo e HTTP 200 na rota raiz verificado por requisicao de linha de comando
- [ ] [frontend] Confirmar que a interface carrega no navegador e registrar a URL exata mais 1 print da tela inicial; aceite: URL entregue ao dono abre a home sem tela branca
- [ ] [qa] Checagem rapida de saude: listar erros do console do navegador e do log do servidor nos primeiros 2 minutos de uso; aceite: lista de erros ou declaracao explicita de zero erros

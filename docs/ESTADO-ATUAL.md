# Estado atual do Apsis Carbon

**Atualizado em:** 2026-08-14
**Por que este arquivo existe:** ele viaja com o repositório. O handoff de sessão fica em
`.remember/`, que é ignorado pelo git, e as notas de contexto ficam no Obsidian local
(`Conciencia_Obisidian\projetos\Apsis Carbon\`), que também não viaja. Ao trocar de máquina,
**este arquivo é a fonte de verdade.**

---

## Como rodar

```bash
npm install
npm run dev
```

`http://localhost:5175`. O Supabase ainda **não foi provisionado**, então na tela de login clique
em **"Entrar em modo demonstração"** para abrir as telas com dados fictícios.

`npx eslint . --quiet` e `npm run build` passam limpos neste commit.

---

## O que existe

### Telas prontas e navegáveis

| Tela | Arquivo | Issue |
|---|---|---|
| Login | `src/components/CarbonLoginLayout.jsx` + `AuthGuard.jsx` | - |
| Boas-Vindas | `src/pages/BoasVindas.jsx` | - |
| Projetos | `src/pages/Projetos.jsx` | #1 |
| PDD | `src/pages/ProjetoPdd.jsx` | #2 |
| Relatório de monitoramento | `src/pages/ProjetoMonitoramento.jsx` | #3 |
| Checklist de evidências | `src/pages/ProjetoEvidencias.jsx` | #4 |
| Findings de auditoria | `src/pages/ProjetoFindings.jsx` | #5 |
| Documentos | `src/pages/Documentos.jsx` | #6 |
| Atividades | `src/pages/Atividades.jsx` | #7 |
| Minhas horas | `src/pages/MinhasHoras.jsx` | #8 |
| Reuniões | `src/pages/Reunioes.jsx` | #9 |
| Ata de reunião | `src/pages/ReuniaoAta.jsx` | #9 |
| Fornecedores | `src/pages/Fornecedores.jsx` | #10 |
| Contratos e parcelas | `src/pages/Contratos.jsx` | #11 |

### Banco

38 tabelas em 13 migrations. Ordem das chaves estrangeiras verificada: nenhuma FK referencia
tabela criada depois. PostGIS habilitado (área do projeto e a regra dos 5%).

RLS ativa em todas, **sem policy nenhuma** exceto `carbon_app_config` (linhas públicas). Todo
acesso passa pela Edge Function `carbon-api`, que valida o ID token do Azure AD contra o JWKS da
Microsoft antes de tocar no banco com a chave de serviço.

### Arquitetura modular (fundação criada em 2026-08-14)

Foi refatorado para que tela nova não exija tocar em arquivo compartilhado:

| Camada | Como acrescentar |
|---|---|
| Rotas da Edge Function | novo `supabase/functions/carbon-api/rotas/<dominio>.ts` exportando `rotas: Rota[]` |
| API do frontend | novo `src/lib/api/<dominio>.js` |
| Dados de demonstração | novo `src/lib/demo/<dominio>.js` |
| Registro da tela | novo `src/paginas/<dominio>.paginas.js` |
| Primitivas de UI | usar `src/components/ui/` (ver `LEIA-ME.md` de lá) |

O índice de rotas e o de páginas descobrem os módulos sozinhos. `App.jsx` e `Layout.jsx` não
mudam mais a cada tela.

---

## O que está incompleto

O trabalho das issues #12 a #16 foi **interrompido no meio**. O que está no repositório compila e
não quebra nada, mas está pela metade:

| Domínio | Issue | Migration | Rotas | API | Demo | Tela |
|---|---|---|---|---|---|---|
| visitas | #12 | pronta | pronta | pronta | pronta | **falta** |
| pipeline | #13 | pronta | **falta** | **falta** | **falta** | **falta** |
| metas | #14 | pronta | **falta** | **falta** | **falta** | **falta** |
| credito | #15 | pronta | **falta** | **falta** | **falta** | **falta** |
| comunidade | #16 | **falta** | **falta** | **falta** | **falta** | **falta** |

As migrations órfãs (pipeline, metas, credito) criam tabelas que ainda não têm rota nem tela.
Isso é inofensivo: são apenas tabelas vazias. Mas se preferir um repositório sem estrutura sem
uso, elas podem sair e voltar junto com o resto do domínio.

**Retomar por:** `src/pages/Visitas.jsx` mais `src/paginas/visitas.paginas.js`. É o mais barato:
backend, API e dados de demonstração já existem, falta só a tela.

### Verificação que NÃO aconteceu

Importante saber, para não confiar demais no que está aqui:

- A fase de **integração** (coerência entre camadas) não rodou nos domínios de #3 a #11. Pode
  haver nome de função SQL divergindo do que a Edge Function chama, enum diferente entre migration
  e frontend, ou coluna referenciada que não existe. Nas issues #1 e #2 essa fase encontrou quatro
  divergências desse tipo, então a chance de haver aqui é real.
- A fase de **revisão adversarial** não rodou nesses domínios.
- **Nenhuma migration foi executada contra Postgres.** Não existe banco. Erro de SQL só aparece
  quando o projeto Supabase for criado.

---

## Pendências que dependem de decisão

1. **Provisionar o Supabase** (issue #19). Passo a passo em `docs/setup-supabase.md`. Nada foi
   executado contra banco: as migrations e as Edge Functions são arquivos.
2. **Registrar o app no Azure AD** e gravar `clientId` e `tenantId` na linha `azure` de
   `carbon_app_config`.
3. **Leitura aberta a qualquer conta do domínio.** Escrita já exige papel `admin` ou `gestor`, mas
   leitura é liberada a qualquer colaborador ativo. Como `garantirUsuario` autoprovisiona no
   primeiro login, qualquer conta do tenant passa a ler todos os projetos, contornando o portão de
   `carbon_usuario_modulos`. Considerando que o Parakanã envolve material de auditoria com
   comunidade indígena, **isso precisa ser resolvido antes de entrar dado real.**
4. **Escopo de estoque e comercialização de crédito** (issue #15) é proposta minha, inferida do
   padrão Verra, não observada no Notion. Precisa de validação antes de continuar.
5. **Censo nominal da comunidade** (issue #16): decidido **não** replicar. Só aldeias e agregados
   por grupo, sexo e faixa etária. Mudar isso exige relatório de impacto, base legal e conversa com
   o jurídico e com as associações. Ver `docs/notion/11-comunidade-parakana.md`.
6. **Gradiente do painel de login** (issue #20): valores a definir, hoje na variável CSS
   `--carbon-painel-fundo`.
7. **Alias de suporte:** o seed usa `ti@apsis.com.br` e ele aparece na tela de boas-vindas.
   Confirmar se existe.
8. **Issue #2 no GitHub diz 45 capítulos do PDD.** São 43. Corrigido nos documentos, falta
   corrigir no GitHub.
9. **Portal Apsis:** remover a `service_role key` do frontend
   (`portal-apsis/src/lib/supabaseClient.js`). A chave deve ser considerada comprometida.

---

## Regras do projeto que não estão óbvias no código

- Proibido o caractere travessão (em dash) em qualquer arquivo. Use hífen.
- Toda configuração vive no banco (`carbon_app_config`), não em variável de ambiente. O frontend
  conhece apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- `MODO_DEMO` não pode ser envolvido em `Boolean()`: o wrapper impede o tree-shaking e os datasets
  fictícios vão para o bundle de produção.
- Dado pessoal não entra em listagem: contatos de visitas, dados bancários de fornecedor e nome de
  comprador sob NDA só no detalhe e sob papel.
- Levantamento do Notion que originou tudo: `docs/notion-levantamento.md` e `docs/notion/`.
- Backlog completo: `docs/issues/BACKLOG-INICIAL.md`, e as 20 issues estão criadas em
  `Apsis-Consultoria/Portal-Apsis-Carbon`.

# Diario - Apsis Carbon

Memoria factual do projeto. Entradas novas no topo.

---

## 2026-08-08 - Mapear stack e confirmar subida local

Pedido do dono: mapear a stack do projeto (comando de subida e dependencias
faltantes) e confirmar que a interface carrega no navegador, com URL exata e
print da tela inicial.

O que mudou: documentado que o Apsis Carbon nao tem servidor proprio (SPA
Vite + Supabase remoto + MSAL); registrado comando (`npm run dev`), URL fixa
(`http://localhost:5175`), envs (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_CARBON_DEMO`) e contrato das Edge Functions. Confirmado HTTP 200 em `/`
e em `/preview-boasvindas.html`, com prints das duas telas. Dev server ficou
rodando em background (ID `b4f6n6ter`) para o dono abrir a URL.

Arquivos: `docs/contrato-api.md` (criado), `docs/evidencias/url-inspecao-visual.md`
(criado), `docs/evidencias/home-localhost-5175.png`,
`docs/evidencias/preview-boasvindas-5175.png`.

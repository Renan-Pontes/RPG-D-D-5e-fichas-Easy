# Forja de Heróis — guia curto para agentes

D&D 5e (2014 + 2024): fichas, criação, campanhas do mestre, combate, mesa/TV. Frontend Vite + React 18 (`frontend/`), backend Django + DRF (`backend/`). UI em pt-BR e en (`lang`), textos de regra em `{pt, en}`.

## Comandos
- Automação enxuta + grafo (`heroesforge-ops`): `py .agents/skills/heroesforge-ops/scripts/hf_ops.py status` · `outline sheet|tabs|css|combat` · `trace-api <rota>` · `data-peek <catálogo> <termo>` · `verify [--sync] [--full]` · `graph-query "<termo>"` · `graph-sync --update`.
- Testes front: `cd frontend && npm test` (node --test, ~1.700). Teste só o arquivo tocado primeiro: `node --test tests/<nome>.test.js` (ou `hf_ops.py verify` para saída condensada).
- Build: `cd frontend && npm run build` (ou `--outDir /tmp/vb` para não sujar).
- Testes back: `cd backend && .venv/Scripts/python manage.py test api --noinput` (Linux/CI: `python manage.py test api --parallel auto`).
- Regras e docs sincronizados: `npm --prefix frontend run check:rules`; `py scripts/check_doc_refs.py`; tags de magia: `node scripts/build-spell-tags.mjs`; resumos de magia: `node frontend/scripts/slim-spells.mjs`.

## Onde fica o quê
- `frontend/components/Sheet.jsx` (5,4k linhas) e `SheetTabs.jsx` (2,6k): ficha. Use Grep + Read com offset/limit, nunca o arquivo inteiro.
- `frontend/src/sheet/`: peças da ficha — `feature-placement.js` (linha do tempo de traços), `rich-text.{js,jsx}` (texto de regra formatado), `FhFeatures.jsx`, `play-layout.js`, `ficha.css` (7k linhas, blocos datados por versão no fim).
- `frontend/src/progression/`: motor de níveis (`engine.js`, `rules.js`, uma por classe), `LevelUpModal.jsx`.
- `frontend/src/combat/MonsterStatblock.jsx`: bloco de criatura (reusado nas magias).
- `frontend/src/campaigns`, `play`, `player`, `screen`, `stage`, `world`, `grimoire`, `creator`: telas por domínio.
- `frontend/data/`: dados de regra gerados/grandes (ver abaixo). `frontend/tests/`: um arquivo por funcionalidade.
- `backend/api/views_*.py` por domínio; `models.py`; `progression/catalog.json` (snapshot de regras, gerado).
- Docs de referência (só quando o assunto pedir): `ARCHITECTURE.md`, `SYSTEM_MAP.md`, `API.md`, `DECISIONS.md`, `DESIGN.md`, `TECH_DEBT.md`. `ADR.md` (130 KB) e `HANDOFF.md` são históricos: buscar com Grep, não ler.

## Arquivos grandes — não ler inteiros
`frontend/data/*.json`, `srd.js`, `magic-items-srd.js`, `monsters-srd521.js`, `spells-extra.js`, `expanded-*.js`, `backend/api/progression/catalog.json`, `frontend/public/rules/*.pdf`, `frontend/src/art-*.json`. Para dados: Grep com `-o '.{0,80}chave.{0,200}'` ou um script node/python que imprime só o registro pedido.

## Convenções
- Commits: `tipo(escopo): frase longa em inglês descrevendo o efeito para o usuário (v1.0.N)`; a versão só existe na mensagem — incremente a do último commit. Sem trailers de autoria de IA.
- CSS novo vai no fim de `ficha.css` num bloco `/* ---------- v1.0.N · assunto ---------- */`.
- Conteúdo pago: só fatos (nomes, níveis) e resumos próprios; texto SRD pode ser literal.
- Toda mudança de comportamento ganha/ajusta teste em `frontend/tests/`.

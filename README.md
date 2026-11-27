# Forja de Heróis — RPG D&D 5e

Plataforma web dual-edition (`2024` / SRD 5.2.1 e `2014` / SRD 5.1) para fichas de D&D 5e, criação guiada, Mesa unificada do mestre (Mundo, Preparar, Jogar, Raio-X do Grupo), combate tático VTT, telão público de TV, progressão declarativa (12 classes do PHB + Artífice) e _dice rigging_ pelo mestre.

## Quick start (30 segundos)

```bash
# Backend (Django) — use `py` ou `uv` no Windows
cd backend && py -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
py manage.py migrate && py manage.py seed && py manage.py runserver 4000

# Frontend (Vite) — em outro terminal
cd frontend && npm install && npm run dev
```

Abre `http://localhost:5173`. Credenciais do seed:

- **Mestre**: `mestre@forja.local` / `forja-mestre-2026`
- **Jogador**: `renan@forja.local` / `thalion-druida-2026`

## Funcionalidades

- **Personagens na nuvem e versões por campanha** (auth por conta, suporte N:N a múltiplas campanhas/fichas e fallback offline em `localStorage`).
- **Campanhas e Mesa do Mestre** com áreas dedicadas (`Mundo`, `Preparar`, `Jogar`, `Grupo` / Raio-X tático de 11 eixos), `inviteCode` restrito ao mestre e entrada direta por `campaignId` para membros.
- **Workflow de aprovações**: jogador pede subir de nível → mestre aprova → backend aplica HP/level/spells e re-roda os autos da subclasse.
- **Telão público e Palco**: `/tv/<screenToken>` mostra HP animado, condições com ícones, mapa/cenas do palco, indicador de turno destacado e rolagens da mesa em 1080p+.
- **Engine de progressão declarativa dual (`2024` & `2014`)**: as 12 classes do PHB + Artífice, linha do tempo universal com captura/divulgação e troca manual de escolhas (espécie, classe, subclasse, talentos e antecedente), blocos ricos de regras com fichas de criaturas invocadas inline e efeitos visuais/informativos de condições.
- **Dice rigging**: mestre pré-define os próximos valores de cada jogador (fila por tipo de dado), reordena, injeta e limpa. Rolagens passam pelo backend e consomem da fila sem expor o marcador ao jogador.
- **Bilíngue PT/EN**, tema medieval forjado em couro e ouro, com exportação/importação de PDF editável oficial de 3 páginas.

## Stack

| Camada | Tecnologia | Deploy |
|---|---|---|
| Frontend | Vite 6 + React 18 (lazy chunks + slim spell core) | Vercel |
| Backend | Django 5.2 + DRF + SQLite | PythonAnywhere |
| Realtime | Pulse ETag / HTTP 304 Polling 2.5s | — |
| Cache | LocMem (rate limit) | — |

Detalhes em [DECISIONS.md](DECISIONS.md). Arquitetura do sistema: [ARCHITECTURE.md](ARCHITECTURE.md). Design System e UI/UX: [DESIGN.md](DESIGN.md). Registros de decisão: [ADR.md](ADR.md). Roadmap técnico e de produto: [ROADMAP.md](ROADMAP.md). Dívida técnica e modernização: [TECH_DEBT.md](TECH_DEBT.md). Engenharia de dados e regras: [DATA_ENGINEERING.md](DATA_ENGINEERING.md). Mapa de componentes: [SYSTEM_MAP.md](SYSTEM_MAP.md). Para subir em produção: [DEPLOY.md](DEPLOY.md). Endpoints: [API.md](API.md). Auditoria técnica/UX atual: [AUDIT.md](AUDIT.md) e [docs/ux-audit-table-speed.md](docs/ux-audit-table-speed.md). Crítica estratégica de design: [CRITIQUE.md](CRITIQUE.md).

## Estrutura

```
/frontend              Vite + React 18 (vai pra Vercel)
/backend               Django 5 + DRF (vai pra PythonAnywhere)
/.agents/skills        Skill heroesforge-ops (hf_ops.py + Graphify + automação enxuta)
vercel.json            build aponta pra frontend/
AGENTS.md, CLAUDE.md, .graphifyignore
ARCHITECTURE.md, DESIGN.md, ADR.md, ROADMAP.md, TECH_DEBT.md, DATA_ENGINEERING.md, SYSTEM_MAP.md
DECISIONS.md, DEPLOY.md, API.md, HANDOFF.md, RULES.md, PRODUCT.md
```

## Testes e Automação

```bash
# Portão completo condensado (sync check + refs de docs + testes FE/BE + build limpo)
py .agents/skills/heroesforge-ops/scripts/hf_ops.py verify --full

# Execução direta por camada
cd backend && .venv\Scripts\activate && py manage.py test api    # 57 módulos (~1.010+ testes, 100% green)
cd frontend && npm test                                          # 157 suítes (~1.750+ testes, 100% green)
```

Cobertura cruzada Python/JS pra engine de progressão, autorização cross-user, rate limit, pulso ETag, fluxo de aprovação e dice rigging.

## Endpoints — TL;DR

```
POST /api/auth/{csrf,signup,login,logout}, GET /api/auth/me
GET|POST /api/characters       PUT|GET|DELETE /api/characters/:id
GET|POST /api/campaigns        PUT|PATCH|GET|DELETE /api/campaigns/:idOrSlug
GET /api/campaigns/:id/pulse   POST /api/campaigns/:id/stage{/scene}
POST /api/campaigns/join       PUT|DELETE /api/campaigns/:id/members/:mid
POST /api/campaigns/:id/rotate-{screen-token,invite-code}
GET|POST /api/approvals/campaign/:id   POST /api/approvals/:id/review
POST /api/dice/roll            POST /api/characters/:id/table-roll
GET|POST /api/dice/campaign/:id/rigs   PUT|DELETE /api/dice/rigs/:id   GET /api/dice/campaign/:id/log
GET /api/screen/:token  (público)
```

Tudo detalhado em [API.md](API.md).

## Licença

Conteúdo de regras: SRD 5.2.1 e SRD 5.1 (Wizards of the Coast), CC-BY 4.0.
Código: livre.

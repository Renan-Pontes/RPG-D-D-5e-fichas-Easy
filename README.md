# Forja de Heróis — RPG D&D 5e

Ferramenta web para fichas de D&D 5e com contas, campanhas, mestre, telão de TV, progressão automática por classe/subclasse e _dice rigging_ pelo mestre.

## Quick start (30 segundos)

```bash
# Backend (Django) — use `py` no Windows
cd backend && py -m venv venv && venv\Scripts\activate
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

- **Personagens na nuvem** (auth por conta). Fallback offline em localStorage.
- **Campanhas** com mestre (DM), jogadores que entram com `inviteCode`, atribuição de personagem por jogador.
- **Workflow de aprovações**: jogador pede subir de nível → mestre aprova → backend aplica HP/level/spells e re-roda os autos da subclasse.
- **Telão público**: `/tv/<screenToken>` mostra HP animado, condições com ícones, indicador de turno destacado, iniciativa. Pensado pra 1080p+ a 2-3m.
- **Engine de progressão declarativa**: as 12 classes do PHB com 1+ subclasse cada. Ganhos automáticos (sem escolha) entram sozinhos: ex. druida Círculo das Estrelas no nível 2 ganha `guidance` via Mapa Estelar; clérigo Life sempre tem domain spells preparados; paladino Devotion idem.
- **Dice rigging**: mestre pré-define os próximos valores de cada jogador (queue por dado), reordena, injeta, limpa. Rolagens do jogador via app passam pelo backend e consomem da fila. Log visível só pro mestre.
- **Bilíngue PT/EN**, tema medieval.

## Stack

| Camada | Tecnologia | Deploy |
|---|---|---|
| Frontend | Vite + React 18 (lazy chunks) | Vercel |
| Backend | Django 5 + DRF + SQLite | PythonAnywhere |
| Realtime | Polling 2.5s (PA free não tem WS) | — |
| Cache | LocMem (rate limit) | — |

Detalhes em [DECISIONS.md](DECISIONS.md). Para subir em produção: [DEPLOY.md](DEPLOY.md). Endpoints: [API.md](API.md).

## Estrutura

```
/frontend       Vite + React (vai pra Vercel)
/backend        Django (vai pra PythonAnywhere)
vercel.json     build aponta pra frontend/
DECISIONS.md, DEPLOY.md, API.md, HANDOFF.md
```

## Testes

```bash
cd backend && venv\Scripts\activate && py manage.py test api    # 70 testes
cd frontend && npm test                                          # 63 testes
```

Cobertura cruzada Python/JS pra engine de progressão, autorização cross-user, rate limit, fluxo de aprovação, dice rigging.

## Endpoints — TL;DR

```
POST /api/auth/{csrf,signup,login,logout}, GET /me
GET|POST /api/characters       PUT|GET|DELETE /api/characters/:id
GET|POST /api/campaigns        PUT|GET|DELETE /api/campaigns/:idOrSlug
POST /api/campaigns/join       PUT|DELETE /api/campaigns/:id/members/:mid
POST /api/campaigns/:id/rotate-{screen-token,invite-code}
GET|POST /api/approvals/campaign/:id   POST /api/approvals/:id/review
POST /api/dice/roll            GET|POST /api/dice/campaign/:id/rigs
PUT|DELETE /api/dice/rigs/:id  GET /api/dice/campaign/:id/log
GET /api/screen/:token  (público)
```

Tudo detalhado em [API.md](API.md).

## Licença

Conteúdo de regras: SRD 5.1 (Wizards of the Coast), CC-BY 4.0.
Código: livre.

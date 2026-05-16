# Forja de Heróis — RPG D&D 5e

Ferramenta web para fichas de D&D 5e com:

- **Personagens salvos na nuvem** (auth por conta)
- **Campanhas e mestre**: mestre cria, jogadores entram com código, mestre aprova evoluções
- **Telão (TV view)**: link público para colocar na TV mostrando HP, condições, iniciativa
- **Engine de progressão**: ganhos por nível e subclasse são aplicados automaticamente (ex: druida Círculo das Estrelas ganha `guidance` no nível 2 sem precisar escolher)
- **Dice rigging do mestre**: o mestre pode pré-definir valores para próximas rolagens de um jogador, garantindo fluidez narrativa
- 100% bilíngue (PT/EN), tema medieval

## Stack

| Camada | Tecnologia | Deploy |
|---|---|---|
| Frontend | Vite + React 18 | Vercel |
| Backend | Django 5 + DRF | PythonAnywhere |
| Banco | SQLite (free) → MySQL fácil | local file / PythonAnywhere |
| Realtime | Polling 2.5s (sem WebSocket; PA free não suporta) | — |

Ver [DECISIONS.md](DECISIONS.md) para detalhes da arquitetura e [DEPLOY.md](DEPLOY.md) para subir em produção.

## Estrutura

```
/frontend       Vite + React (vai pra Vercel)
/backend        Django (vai pra PythonAnywhere)
DECISIONS.md
DEPLOY.md
vercel.json     aponta build pra frontend/
```

## Rodar localmente

### Backend (use `py` no Windows)

```bash
cd backend
py -m venv venv
venv\Scripts\activate                # Windows
# source venv/bin/activate           # Linux/Mac
pip install -r requirements.txt
cp .env.example .env                 # ajustar SECRET se quiser
py manage.py migrate
py manage.py createsuperuser         # opcional, pra acessar /admin
py manage.py runserver 4000
```

Backend roda em `http://localhost:4000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend roda em `http://localhost:5173`.

### Testar

Abrir `http://localhost:5173` → criar conta → criar personagem → criar campanha (clicar em "Campanhas" no header) → copiar `invite code` → fazer logout → criar outro usuário → entrar com o invite code.

## Testar a engine de progressão

```bash
cd backend
venv\Scripts\activate
py manage.py test api
```

42 testes cobrem progressão, autorização cross-user, fluxo de aprovação, dice rigging.

## Endpoints principais

Sob `/api`:

```
POST /auth/csrf            cookie inicial
POST /auth/signup          {email, password, displayName}
POST /auth/login
POST /auth/logout
GET  /auth/me

GET  /characters
POST /characters           {name, data}
GET  /characters/:id
PUT  /characters/:id
DEL  /characters/:id

GET  /campaigns
POST /campaigns            {name, description?}
GET  /campaigns/:id|slug
PUT  /campaigns/:id        (DM)
DEL  /campaigns/:id        (DM)
POST /campaigns/join       {inviteCode, characterId?}
PUT  /campaigns/:id/members/:mid
DEL  /campaigns/:id/members/:mid  (DM)
POST /campaigns/:id/rotate-screen-token   (DM)
POST /campaigns/:id/rotate-invite-code    (DM)

GET  /approvals/campaign/:id
POST /approvals/campaign/:id   {characterId, type, payload, note?}
POST /approvals/:id/review     {status, applyChanges?, note?}  (DM)

POST /dice/roll                {diceType, campaignId?, label?, count?}
GET  /dice/campaign/:id/rigs   (DM)
POST /dice/campaign/:id/rigs   {targetUserId, diceType, values}  (DM)
PUT  /dice/rigs/:id            (DM)
DEL  /dice/rigs/:id            (DM)
GET  /dice/campaign/:id/log    (DM)

GET  /screen/:token            PÚBLICO — telão TV
```

## Telão na TV

Mestre abre a aba **Telão** numa campanha → copia link → abre na smart TV / tablet / notebook. Polling de 2.5s mantém HP, condições e iniciativa atualizados. Funciona em qualquer navegador.

URL padrão: `https://SEU_FRONTEND/tv/<screen_token>`.

## Dice rigging do mestre — como funciona

1. Mestre vai em **Dados** na campanha.
2. Escolhe um jogador, tipo de dado e enfileira valores (ex: `15, 12, 18` para os próximos 3 d20).
3. Quando o jogador rola pelo app, o servidor retorna esses valores em ordem.
4. Após a fila acabar, volta a rolar random.
5. Tudo registrado em log que só o mestre vê.

Isso permite ao mestre "salvar" momentos críticos (evitar um 1 numa percepção essencial, ou garantir um crítico planejado) sem precisar pedir rerolls.

## Engine de progressão

Em `frontend/src/progression/rules.js` (e portada em `backend/api/progression/rules.py`) há um descritor declarativo por classe+subclasse+nível. Exemplo:

```js
druid: {
  subclassPerLevel: {
    stars: {
      2: { autoCantrips: ['guidance'], features: [...] }
    }
  }
}
```

Quando o personagem é salvo, `applyAutosToCharacter()` aplica os autos. É **idempotente** — rodar 2x não duplica truques. Trocar de subclasse remove autos antigos.

Quando o jogador solicita level-up, o mestre aprova, e o backend aplica via `apply_approval_to_character()`. O personagem sobe de nível, ganha HP, e os novos autos da subclasse entram.

Classes cobertas: bárbaro, bardo, clérigo, druida, feiticeiro, guerreiro, ladino, mago, monge, paladino, patrulheiro, bruxo. Subclasses do exemplo do usuário (druida) completas; outras com esqueleto pronto para encher.

## Licença

Conteúdo de regras: System Reference Document 5.1 (Wizards of the Coast), CC-BY 4.0.

Código: livre — pode usar como quiser.

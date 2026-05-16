# Decisões de arquitetura — Forja de Heróis v2

> Documento escrito durante a sessão noturna em que o backend, campanhas, telão e engine de progressão foram introduzidos. Lê isto primeiro de manhã.

## Contexto inicial

Antes desta sessão o projeto era um SPA Vite + React 18 puro, sem backend. Personagens salvos em `localStorage` (`dnd5e-forge:characters:v1`). O SRD em `data/srd.js` já estava bem completo (12 classes, ~25 raças, ~100 magias, ~50 bestas, várias subclasses).

Quatro frentes pedidas:

1. Backend com contas e personagens salvos na conta.
2. Campanhas com mestre, jogadores, aprovação de evoluções.
3. Telão (TV view) com status da campanha.
4. Engine que aplica automaticamente ganhos não-escolha (nível, subclasse).

Bônus mencionado: o mestre poder "controlar" os dados dos jogadores (injetar valores antes da rolagem).

## Pivot durante a sessão

Comecei com **Express + Prisma + SQLite + Socket.io** e ficou tudo funcional (commit `3c5391e`). Depois você mandou outra mensagem fixando o stack:

> "não esquece de deixar o backend em django preparado pra subir num python anywhere e o frontend na vercel"

Então **substituí o backend Node inteiro por Django** (apaguei `server/`). A engine de progressão (JS) e todo o frontend foram preservados. O custo foi reescrever as rotas — felizmente já estavam descritas e os contratos JSON eram claros. Você vai encontrar no `git log`:

- commits anteriores ao pivot: `feat(server): backend Express...` — referência histórica, não é o que roda.
- commits a partir do pivot: estrutura final em `backend/` Django.

## Stack final

| Camada | Escolha | Por quê |
|---|---|---|
| Backend | **Django 5 + Django REST Framework** | Pedido explícito, deploy fácil no PythonAnywhere |
| Auth | DRF token / `SessionAuthentication` com cookie | Sem dependências externas; cookie httpOnly via CSRF + sessão |
| DB | SQLite em dev e prod (PythonAnywhere free aceita) | Zero setup; migrar pra MySQL depois é uma config |
| Realtime | **Polling 2s** (sem Channels) | PythonAnywhere free **não suporta WebSocket** — Channels precisaria de plano pago. Optei pelo caminho conservador. O frontend faz polling pro telão e pro DM. |
| Frontend | Vite + React 18 (mantido) | Já existia, funciona, deploy Vercel já configurado |
| Dice rigging | API: cliente sempre rola pelo servidor quando em campanha | Mesmo conceito do plano original |

## Estrutura do repositório

```
/                       ← raiz
  vercel.json           ← aponta build pra frontend/
  DECISIONS.md          ← este arquivo
  DEPLOY.md             ← passos PythonAnywhere
  README.md
/frontend               ← Vite + React (deploy: Vercel)
  app.jsx, main.jsx, components/, data/, styles.css, utils.js
  src/
    api/                ← client.js, storage.js, polling.js
    auth/               ← AuthContext, AuthScreen
    campaigns/          ← CampaignList, CampaignDetail
    screen/             ← TVScreen (telão)
    progression/        ← engine + rules + ProgressionPanel
/backend                ← Django (deploy: PythonAnywhere)
  manage.py
  requirements.txt
  forja/                ← Django project (settings, urls, wsgi)
  api/                  ← app principal: models, serializers, views, urls
  api/progression/      ← engine portada para Python (validações server-side)
  api/tests/
```

## Modelo de dados

- **User** (`auth.User`): email único como username + `display_name` no perfil.
- **Character**: `owner FK→User`, `name`, `data` (JSONField com a ficha inteira). Não normalizo `weapons/spells/etc` — o frontend já lida com o JSON, normalizar seria reescrever todo o Sheet.
- **Campaign**: `dm FK→User`, `name`, `slug` único, `screen_token` único (UUID), `invite_code` único curto, `description`, `state` (JSON com iniciativa/cena/etc).
- **Membership**: `(campaign, user)` único, `character FK→Character?`, `role` (`player`/`dm`), `joined_at`.
- **Approval**: `campaign`, `character`, `requested_by`, `reviewed_by?`, `type`, `payload` (JSON), `status` (`pending/approved/rejected`), `note`.
- **DiceRig**: `campaign`, `target_user`, `dice_type` (d20/d6/.../any), `values` (JSON: `[{value, consumed, label?}]`).
- **DiceLog**: `campaign?`, `user`, `dice_type`, `result`, `rigged`, `label?`.

## Segurança / autorização

- Toda rota autenticada exige sessão (cookie httpOnly + CSRF).
- CSRF token entregue via endpoint `GET /api/auth/csrf` antes do primeiro POST (frontend pega no boot).
- Personagens: só o `owner` lê/edita. DM da campanha lê (readonly).
- Campanhas: só o `dm` edita config; jogadores leem e atribuem o próprio personagem.
- Telão: rota pública por `screen_token` — sem auth, com rate limit suave.
- Dice rig: só o DM lê/edita. Jogador alvo nunca vê a fila.
- Senhas: `make_password` do Django (PBKDF2 por padrão).

## Engine de progressão automática

O ponto crítico aqui é o pedido do usuário: "ganhos por evolução/ciclo entram direto no personagem, não são escolha". Modelei como **descritor declarativo por classe+subclasse+nível**:

```js
// frontend/src/progression/rules.js
{
  classId: 'druid',
  perLevel: {
    2: { features: [...], subclassChoice: true },
    // ...
  },
  subclassPerLevel: {
    stars: {
      2: { autoCantrips: ['guidance'], features: [...] }
      // ↑ EXEMPLO DO USUÁRIO: Estrelas dá guidance automático via Mapa Estelar
    }
  }
}
```

A função `applyAutosToCharacter(character)` é **idempotente**: recomputa do zero o que vem por nível/subclasse, sem duplicar truques já adicionados manualmente. Vive no frontend (cobertura imediata na UI) e tem **uma cópia portada em `backend/api/progression/`** para validação server-side ao aprovar uma `Approval`.

Testes: 20 casos cobrindo druida (incluindo o exemplo do user), guerreiro, ladino, idempotência, troca de subclasse, validação de level-up.

## Dice rigging — como funciona pro mestre

1. Mestre abre dashboard da campanha, escolhe um jogador.
2. Adiciona "próximos valores" — ex: pra Renan, próximas 3 rolagens de d20 devem ser `15, 12, 18`.
3. Salvo em `DiceRig.values = [15, 12, 18]`.
4. Quando o jogador clica "rolar d20", o frontend chama `POST /api/dice/roll` (não rola local).
5. Backend retorna o primeiro valor de `values` (e o consome) — se vazio, rola random.
6. Tudo é registrado em `DiceLog` que só o mestre vê.

## Caminhos onde fui conservador / TODOs

- **Sem OAuth ainda** — só email/senha. Já deixei o `AuthSerializer` modular pra adicionar provider depois.
- **Sem rate limiting** — adicionar `django-ratelimit` antes de produção.
- **Sem reset de senha** — TODO. PythonAnywhere free não tem SMTP fácil; um Mailgun grátis resolve.
- **Sem WebSocket** — PythonAnywhere free não suporta. Polling 2s é mais que suficiente pro número de jogadores típico (2-6). Migração pra Channels é trivial se mudar de host.
- **Sem `collectstatic` integrado** — o backend serve só API. Static do Django Admin sim, configurado.
- **Engine de progressão** prioriza ganhos não-escolha. Onde há escolha (subclasse, estilo de combate), o jogador continua escolhendo no Creator. Mestre pode aprovar.

## Como rodar (dev)

```bash
# Frontend
cd frontend
npm install
npm run dev          # http://localhost:5173

# Backend (use py no Windows)
cd backend
py -m venv venv
venv\Scripts\activate    # (Windows; no Linux: source venv/bin/activate)
pip install -r requirements.txt
py manage.py migrate
py manage.py createsuperuser   # opcional
py manage.py runserver 4000    # http://localhost:4000
```

Variáveis em `backend/.env` (ver `backend/.env.example`).

## Como deploy

- **Frontend → Vercel**: já configurado via `vercel.json` na raiz (build aponta pra `frontend/`).
- **Backend → PythonAnywhere**: ver `DEPLOY.md`.

## Próximos passos sugeridos (de manhã)

1. Subir backend no PythonAnywhere e frontend no Vercel.
2. Testar fluxo: signup → criar personagem → criar campanha → outro user entra → solicita levelup → mestre aprova.
3. Testar telão num celular como TV.
4. Decidir se quer OAuth e qual provider.
5. Encher o resto das subclasses na engine de progressão (deixei estrutura, falta dado nas menos comuns).

# Handoff — sessão noturna 2026-05-16

Bom dia. Aqui está o que foi feito enquanto você dormia.

## TL;DR

- Backend novo em **Django + DRF** pronto pra subir no **PythonAnywhere**.
- Frontend Vite/React mantido, agora em `frontend/`, pronto pra **Vercel**.
- Auth, personagens na nuvem, campanhas, mestre, aprovações, **dice rigging**, **telão TV**, **progressão automática** — tudo funcionando.
- **55 testes verdes** (42 Django + 13 JS).
- Seed pronto: `py manage.py seed` cria 2 contas, 1 campanha, 1 personagem e 1 aprovação pendente.

## Como ver funcionando em 2 minutos

```bash
# Terminal 1 — backend
cd backend
py -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
py manage.py migrate
py manage.py seed
py manage.py runserver 4000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`:

- **Login do mestre**: `mestre@forja.local` / `forja-mestre-2026`
- **Login do jogador**: `renan@forja.local` / `thalion-druida-2026`

Como mestre você vê a campanha "Reino Esquecido" com 1 aprovação pendente (Thalion quer subir pro nível 3) e 3 dice rigs prontos (20, 12, 17). Como jogador você vê o Thalion (druida das Estrelas nível 2) já com `guidance` aplicado automaticamente.

A **tela pública do telão**: o seed printa a URL no fim. Algo como `http://localhost:5173/tv/<token>`.

## O que foi entregue, por frente

### 1. Backend + auth + personagens
- Django 5 + DRF + SQLite. Sessão com cookie httpOnly + CSRF.
- CRUD de personagens com ownership: ninguém vê personagem de ninguém.
- O mestre da campanha tem leitura (readonly) sobre os personagens dos jogadores.
- Migração automática do localStorage para a conta quando o user loga.

### 2. Campanhas + área do mestre
- Mestre cria campanha → recebe slug, invite code (6 dígitos) e screen token.
- Jogadores entram com o invite code.
- Cada membro pode atribuir um personagem seu à campanha.
- Mestre pode rotacionar invite/screen, remover membros.
- Editor inline na aba "Visão geral": sessão, cena, clima — propaga pro telão.

### 3. Aprovação de evoluções
- Jogador clica "Solicitar subida" na ficha (precisa estar em uma campanha).
- Backend valida com a engine de progressão (rejeita pular níveis, HP absurdo).
- Mestre vê na aba "Aprovações", aprova ou rejeita.
- Ao aprovar, a mudança é aplicada automaticamente: nível sobe, HP cresce, autos da subclasse entram.

### 4. Telão (TV view)
- Rota pública: `/tv/<screen_token>` — não exige login.
- Mostra HP em barra colorida (verde/amarelo/vermelho), CA, deslocamento, condições, inspiração, salvamentos contra morte.
- Sessão, cena e clima da campanha aparecem no topo.
- Polling a cada 2.5s mantém atualizado (escolhi polling porque PythonAnywhere free não tem WebSocket).
- Pausa o polling quando a aba está oculta.

### 5. Engine de progressão automática
- `frontend/src/progression/rules.js` — descritor declarativo de todas as 12 classes do PHB.
- `applyAutosToCharacter()` é idempotente: rodar 2x não duplica.
- Trocar de subclasse remove autos antigos.
- **Exemplo do user**: druida Círculo das Estrelas no nível 2 ganha `guidance` automaticamente (via Mapa Estelar) — coberto por testes.
- Cópia em Python no backend (`backend/api/progression/`) pra validar level-ups server-side.
- Subclasses: Estrelas, Lua, Terra, Esporos, Chama Selvagem, Sonhos pro druida; mais 12+ subclasses esqueletadas pras outras classes.

### 6. Dice rigging do mestre
- Aba "Dados" da campanha: mestre escolhe um jogador, tipo de dado, e enfileira valores.
- O frontend tem um componente "Rolar dados (oficial)" na visão geral — passa pelo backend e respeita o rig.
- O dice roller flutuante existente continua rolando local (visual/diversão) — não interfere.
- Log de todas as rolagens visível só pro mestre (sob `/api/dice/campaign/<id>/log`).

### 7. Deploy
- `vercel.json` na raiz aponta o build pra `frontend/`. Variável `VITE_API_URL` aponta pro backend.
- `DEPLOY.md` tem passo a passo PythonAnywhere completo (WSGI customizado, env vars, collectstatic, plano de migração para MySQL).
- CORS, CSRF_TRUSTED_ORIGINS, SECURE_PROXY_SSL_HEADER tudo configurado via env.

## Estrutura do repo

```
/
  vercel.json
  DECISIONS.md       arquitetura e justificativas
  DEPLOY.md          passo a passo de produção
  HANDOFF.md         este aqui
  README.md
/frontend            Vite + React
  src/
    api/             client, polling, storage
    auth/            AuthContext, AuthScreen
    campaigns/       lista, detalhe (5 abas)
    screen/          TVScreen
    progression/     rules, engine, panel
  tests/             13 testes node:test
/backend             Django
  manage.py
  requirements.txt
  forja/             settings, urls, wsgi
  api/               models, serializers, views_*, progression/
    management/commands/seed.py
    tests/           42 testes
```

## Testes

```bash
# Backend
cd backend
venv\Scripts\activate
py manage.py test api     # 42/42

# Frontend
cd frontend
npm test                  # 13/13
```

Cobertura cruzada (Python e JS testam a mesma engine de progressão com os mesmos casos) garante que as duas implementações andam juntas.

## O que NÃO foi feito (TODOs claros)

1. **Reset de senha** — precisa de mailer. Sugestão: Mailgun grátis + `django.core.mail`.
2. **OAuth** (Google/GitHub) — só email/senha. O `views_auth.py` está modular, fácil de adicionar com `social-auth-app-django`.
3. **Rate limiting** — exposto a brute-force. Adicionar `django-ratelimit` no login.
4. **WebSocket** — substituí por polling 2.5s porque PythonAnywhere free não suporta. Migração trivial pra Channels se mudar de host.
5. **Subclasses 100% preenchidas** — a estrutura está pronta, mas só Estrelas tem auto-features definidas. Pra encher: editar `frontend/src/progression/rules.js` e `backend/api/progression/rules.py` mantendo paridade.
6. **Notificação para mestre quando há aprovação nova** — hoje aparece via polling, mas sem som/toast.
7. **Personagem do mestre na campanha** — a UI atual assume mestre não tem personagem. Trivial de habilitar.

## Decisão crítica que tomei autonomamente

**Polling em vez de WebSocket** — o pivot para Django + PythonAnywhere free não permite WebSocket sem upgrade pago. Polling de 2.5s com pausa quando aba oculta é a alternativa conservadora. Documentado em `DECISIONS.md`. Migrar pra Channels se você quiser real-time real é uma mudança contida no `polling.js` + adicionar Channels no backend.

## Commits relevantes

```
5ed10a3 feat(campanhas): editor do estado da campanha + rolagem oficial via backend
c8cae3a chore: seed command + README com instrucoes
1bc5826 test(frontend): restaura testes JS da engine de progressao
ccdec33 feat(frontend): adapta para backend Django + CSRF + polling
7e3ef02 feat(backend): pivot para Django + DRF, prep PythonAnywhere
ad2237b feat(progression): engine declarativo para ganhos automaticos
3c5391e feat(server): backend Express ... (HISTÓRICO — foi removido no pivot)
```

Bom dia. Tudo verde, tudo testado, prontidão pra subir.

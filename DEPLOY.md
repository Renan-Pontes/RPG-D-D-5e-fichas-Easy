# Deploy

Dois alvos: **frontend → Vercel** e **backend → PythonAnywhere**.

---

## 1. Backend no PythonAnywhere

PythonAnywhere oferece tier free com Python 3.10/3.11 e SQLite. O plano free **não suporta WebSocket**, mas o frontend usa polling — sem problema.

### 1.1 Subir o código

Opção A — pelo Bash do PythonAnywhere clonando seu repo:

```bash
# No console Bash do PythonAnywhere
git clone https://github.com/SEU_USUARIO/SEU_REPO.git ~/forja
cd ~/forja
```

Opção B — upload manual:
1. Zipar a pasta `backend/` localmente.
2. Subir pelo Files do PythonAnywhere e descompactar com `unzip backend.zip`.

### 1.2 Criar virtualenv

PythonAnywhere já tem `mkvirtualenv`. Use **Python 3.11** (alinha com o desenvolvimento local):

```bash
mkvirtualenv --python=python3.11 forja
workon forja
cd ~/forja/backend
pip install -r requirements.txt
```

### 1.3 Variáveis de ambiente

Crie `~/forja/backend/.env`:

```ini
DJANGO_SECRET_KEY=gere-uma-string-aleatoria-de-64-chars
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=SEU_USUARIO.pythonanywhere.com
CORS_ALLOWED_ORIGINS=https://SEU_PROJETO.vercel.app
CSRF_TRUSTED_ORIGINS=https://SEU_PROJETO.vercel.app
DJANGO_COOKIE_SECURE=True
DATABASE_PATH=/home/SEU_USUARIO/forja/backend/db.sqlite3
```

Para gerar a SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 1.4 Migrar banco e criar superuser

```bash
cd ~/forja/backend
python manage.py migrate
python manage.py createsuperuser
```

### 1.5 Configurar o Web App

No PythonAnywhere, aba **Web** → **Add a new web app**:

- **Manual configuration** (Python 3.11).
- **Path to source**: `/home/SEU_USUARIO/forja/backend`
- **Virtualenv**: `/home/SEU_USUARIO/.virtualenvs/forja`
- **WSGI file**: clique no link do arquivo (algo como `/var/www/SEU_USUARIO_pythonanywhere_com_wsgi.py`) e substitua o conteúdo por:

```python
import os
import sys
from dotenv import load_dotenv

path = '/home/SEU_USUARIO/forja/backend'
if path not in sys.path:
    sys.path.insert(0, path)

load_dotenv(os.path.join(path, '.env'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'forja.settings')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

### 1.6 Static files (apenas Django Admin)

```bash
cd ~/forja/backend
python manage.py collectstatic --noinput
```

Na aba Web, em **Static files**, adicione:
- URL: `/static/`
- Directory: `/home/SEU_USUARIO/forja/backend/staticfiles/`

### 1.7 Recarregar

Clique no botão verde **Reload SEU_USUARIO.pythonanywhere.com**.

Teste: `https://SEU_USUARIO.pythonanywhere.com/api/health` deve retornar `{"ok": true}`.

### 1.8 Atualizar depois

Quando você fizer push novo:

```bash
cd ~/forja && git pull
workon forja
cd backend
pip install -r requirements.txt  # se mudou
python manage.py migrate          # se houver migration nova
python manage.py collectstatic --noinput
# Aba Web → Reload
```

---

## 2. Frontend no Vercel

O `vercel.json` na raiz já está configurado para buildar de `frontend/`.

### 2.1 Criar projeto

1. Importe o repo no Vercel.
2. **Root Directory**: deixe na raiz (`/`) — o `vercel.json` cuida do resto.
3. **Build Command**, **Install Command** e **Output Directory** virão do `vercel.json`.

### 2.2 Variáveis de ambiente

Na config do projeto Vercel (**Settings → Environment Variables**), adicione:

| Nome | Valor | Quando |
|---|---|---|
| `VITE_API_URL` | `https://SEU_USUARIO.pythonanywhere.com` | Production, Preview, Development |

> ⚠️ Sem `VITE_API_URL` setada, o build usa o fallback `https://api-not-set.example` de `frontend/.env.production`. O frontend detecta que o backend está offline, mostra **banner laranja** no topo (“Backend offline – modo standalone”), esconde os botões de login/campanhas e funciona **só com `localStorage`**. Isso é proposital: o site sobe mesmo sem backend, e o usuário consegue criar/editar fichas localmente até o PythonAnywhere subir.

Quando você tiver o backend rodando, abra a Vercel UI, edite `VITE_API_URL` apontando pro seu domínio do PythonAnywhere e **Redeploy** (Settings → Deployments → ⋯ → Redeploy). O banner some automaticamente.

### 2.3 Deploy

Push pra branch principal → Vercel builda automático (o projeto está conectado ao GitHub).

**Redeploy manual** (sem novo commit): Vercel UI → Deployments → último deploy → ⋯ → **Redeploy**.

**Deploy local via CLI** (alternativa, exige `vercel login`):

```bash
cd frontend  # ou raiz — vercel.json cuida do path
npx vercel --prod
```

A CLI vai pedir login na primeira vez (abre browser) e criar `.vercel/project.json` (já está no `.gitignore`).

Teste: abrir o site, criar conta, criar personagem, criar campanha.

### 2.4 Modo offline (standalone-only)

Sem backend acessível (env não setada, PythonAnywhere caiu, CORS bloqueando), o frontend **não quebra**:

- `AuthContext` faz `api.me()` no boot. Se a request explodir por erro de rede (não 401/403), seta `backendAvailable=false`.
- Aparece banner global laranja no topo: *“Backend offline — você está em modo standalone. Fichas ficam só neste navegador (localStorage). Login/campanhas vão voltar quando o backend responder.”*
- Botões **Entrar/Cadastrar** e **Minhas campanhas** somem da topbar.
- Tudo que é local (criar ficha, editar atributos, rolar dados sem mestre, wild shape, inventário) continua funcionando contra `localStorage`.
- Quando o backend voltar, recarregar a página re-checa `api.me()` e o banner some.

---

## 3. Checks finais

- [ ] `https://SEU_USUARIO.pythonanywhere.com/api/health` retorna 200.
- [ ] Frontend Vercel carrega e mostra tela de login.
- [ ] Signup funciona (cookie de sessão é setado).
- [ ] Criar personagem → aparece na lista.
- [ ] Criar campanha → outro usuário entra com invite code.
- [ ] Telão `https://SEU_PROJETO.vercel.app/tv/<screen_token>` mostra os personagens.
- [ ] Dice rigging do mestre influencia rolagens do jogador.

---

## 4. Domínio personalizado (opcional)

### Frontend (Vercel)
1. Aba **Settings** → **Domains** → adicionar `forja.seudominio.com`.
2. Configurar CNAME no DNS.

### Backend (PythonAnywhere)
Free tier **não permite domínio próprio** — só `SEU_USUARIO.pythonanywhere.com`. Pra ter `api.seudominio.com` você precisaria do plano Hacker ($5/mês). Alternativa free: usar o subdomínio do PythonAnywhere e referenciar via `VITE_API_URL` no frontend.

---

## 5. Migrar pra Postgres/MySQL depois

Quando SQLite ficar pequeno:

1. PythonAnywhere oferece MySQL no free tier. Editar `forja/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'SEU_USUARIO$forja',
        'USER': 'SEU_USUARIO',
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST': 'SEU_USUARIO.mysql.pythonanywhere-services.com',
    }
}
```

2. `pip install mysqlclient`
3. Adicionar `DB_PASSWORD` ao `.env`.
4. `python manage.py migrate` no novo banco.
5. Migrar dados se necessário (`dumpdata` → `loaddata`).

---

## 6. Backup do SQLite

No PythonAnywhere, agendar uma task diária (aba **Tasks**) que faz:

```bash
cp /home/SEU_USUARIO/forja/backend/db.sqlite3 /home/SEU_USUARIO/backups/forja-$(date +%F).sqlite3
```

---

## 7. Atualização automática do backend

Desde 16/10/2026 o servidor se atualiza sozinho a partir do GitHub.

1. Cada push na `main` roda `.github/workflows/backend-release.yml`: empacota o
   backend com o build do frontend e publica `forja-release.zip` no release
   `backend-latest`.
2. O passo **Atualiza o servidor** chama `POST /api/ops/update` com o sha256 da senha
   de atualização. Ele só roda se o secret `FORJA_UPDATE_KEY_SHA256` existir no
   repositório.
3. No servidor, `scripts/self_update.py` baixa o pacote, faz backup do banco, troca as
   pastas, roda `migrate` e `collectstatic` e recarrega o site. Se algo falha depois da
   troca, volta a pasta e o banco antigos.

### Configurar (uma vez)

```bash
# no console do PythonAnywhere: define a senha (grava só um verificador em ~/forja-data/update-key)
~/.virtualenvs/forja/bin/python ~/forja/backend/manage.py chave_atualizacao

# no seu computador: o valor do secret é o sha256 em hex da mesma senha
printf '%s' 'SUA_SENHA' | sha256sum
```

No GitHub: *Settings → Secrets and variables → Actions → New repository secret*, nome
`FORJA_UPDATE_KEY_SHA256`. Só quem é dono (admin) do repositório consegue.

### Conferir e disparar na mão

| Para | Chamada |
|---|---|
| Ver a versão que está no ar | `GET /api/ops/version` |
| Ver o andamento da atualização | `POST /api/ops/status` com `{"password": "<sha256>"}` |
| Disparar | `POST /api/ops/update` com `{"password": "<sha256>"}` |
| Rodar no servidor, sem senha | `~/.virtualenvs/forja/bin/python ~/forja/scripts/self_update.py` |

### Estado em 11/11/2026

O secret não existe, então o passo 2 é pulado em todo push: o pacote do último commit
está publicado, mas a produção continua no backend de 26/10/2026. `/api/ops/version`
ainda diz `fcaa730` (16/10): o rótulo ficou velho. O que entra quando a atualização
rodar, e o que consertar antes, está em [`docs/sync-spec.md`](docs/sync-spec.md).


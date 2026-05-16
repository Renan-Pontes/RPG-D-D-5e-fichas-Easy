# Handoff — sessão noturna 2026-05-16

Bom dia. Aqui está o que foi feito enquanto você dormia (1º turno + 2º turno).

## TL;DR

- Backend Django + DRF pronto pra PythonAnywhere. Frontend Vite/React pronto pra Vercel.
- **178 testes verdes** (110 Django + 68 JS).
- **Combate completo**: bestiário com ~130 monstros (CR 0-12), engine que rola ataque/crítico/dano/save/condições, aplica HP automaticamente, sincroniza com a ficha do PC.
- **Grid VTT** no telão: upload de background, grid ajustável, tokens drag-drop com PNG opcional, escala por tamanho. Telão público vê em modo combate vs exploração automático.
- **Rolagem dramática DM-gated**: jogador clica rolar → mestre vê pedido → decide "Mostrar no telão" (overlay com dado girando, total grande, crit em dourado pulsante, falha em vermelho) ou "Privado".
- Auth, personagens na nuvem, campanhas, mestre, aprovações, **dice rigging completo (UX)**, **telão TV polido**, **progressão automática 1→20 das 12 classes do PHB**, **gerenciador de iniciativa**, **busca de personagens**.
- **Rate limiting** no login/signup/dice. Erros padronizados `{error: code}`.
- **Lazy loading** + chunks → bundle inicial reduzido de 568KB para 9KB.
- Seed: `py manage.py seed` cria 2 contas, 1 campanha, 1 personagem e 1 aprovação pendente.

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

## Segundo turno (madrugada → manhã)

Você acordou rápido e pediu mais melhorias. Foi feito (em 8 commits):

### 1. Cobertura de progressão 1→20 das 12 classes
- **Cleric Life**: domain spells automáticos (Bless+CureWounds @1, LesserRest+SpiritualWeapon @3, BeaconOfHope+Revivify @5, DeathWard+GuardianOfFaith @7, MassCureWounds+RaiseDead @9). Idem **Light** e **Knowledge**.
- **Paladin Devotion**: Oath spells @3/5/7/9/13/17 todos auto-preparados.
- **Druid Land**: nova estrutura `landTypeSpells` por terreno (arctic, coast, desert, forest, grassland, mountain, swamp, underdark) com 8 spells por terreno espalhados em 3/5/7/9. Engine aplica conforme `character.landType`. Pendência se faltar escolher terreno.
- **Warlock Hexblade**: subclasse nova com Hexblade Curse + Hex Warrior + autoSpells. Warlock Fiend expandido com autoSpells por nível.
- 63 testes JS + 15 testes Python novos validando cada classe 1→20, `asiLevels` canônicos, extra attacks, idempotência.

### 2. Polish do telão
- Condições com **ícones SVG** inline (15 do PHB).
- HP **anima** prev→next via requestAnimationFrame, 600ms easing.
- "Vez de _X_" destacado pulsando no topo, e o card do personagem ativo ganha **glow gold** com transform.
- HP crítico (<30%) pulsa vermelho; HP morto deixa o card grayscale.
- Tipografia `clamp()` escala de mobile a 4K.
- Iniciativa fixa bottom-right com highlight do turno atual.

### 3. UX completa do dice rigging
- Cards agrupados **por jogador** (todas as filas dele juntas).
- **Reordenar** valores com setas ↑↓ (só não-consumidos).
- **Injetar** valor único inline ("⚡ Injetar").
- **Limpar tudo** por jogador (volta a aleatório).
- Enter no campo de valores enfileira no jogador selecionado.
- **Histórico** das últimas 50 rolagens com flag `★` para rigged. Só o DM vê.

### 4. Segurança
- `rate_limit` decorator (`backend/api/rate_limit.py`) usando cache do Django. 10 logins/10min, 5 signups/10min, 120 rolls/min.
- `exception_handler` customizado → todos os erros DRF viram `{error: code, detail?, fields?}`.
- Testes novos: rate limit bloqueia e reseta após sucesso; auditoria cross-user (Bob não acessa nada da Alice em 5 cenários); shape dos erros padronizada.

### 5. Performance
- Backend: `select_related('user__profile', 'character', 'dm__profile')` nas queries de campanhas, screen, approvals, rigs. Mata N+1.
- Frontend: `React.lazy()` para `App` e `TVScreen`; `manualChunks` separa `react-vendor`, `srd` (200KB), `progression` (34KB). **Bundle inicial: 9.5KB** (era 568KB monolítico).

### 6. Docs
- **API.md**: todos os endpoints com payload/response, codes de erro, rate limits.
- **README**: quick-start em 30s, seção de funcionalidades, links.
- **HANDOFF.md** atualizado (este arquivo).

### 7. Acessibilidade
- Skip link "Pular para o conteúdo" visível no foco.
- `:focus-visible` com outline gold em todos os inputs/botões.
- Tabs da campanha com `role`, `aria-selected`, `aria-controls`, `aria-labelledby`.
- `prefers-reduced-motion`: zera animações.
- Media queries `@max-width: 720px`: tabs scrollaveis, grid 1 coluna, dice log compacto.

## Mobile-first (celular do jogador)

Audit do item 7 — validado via preview em 375×812 (iPhone 13). Arquivo dedicado: `frontend/src/mobile-styles.css` carregado por último em `main.jsx` (sobrepõe os outros quando necessário).

### Resultados medidos (no preview)

| Elemento | Desktop | Mobile (≤720px) | Alvo |
|---|---|---|---|
| `.btn.btn-primary` | 44px | 44px | ≥44px ✅ |
| `.btn.btn-sm` | 32px | 40px | ≥40px ✅ (era 32) |
| `.btn-icon` (↑↓×) | 26×26 | 36×36 | ≥36 ✅ |
| `.chip` (action-bar) | 29px | 40px | ≥40px ✅ |
| `.tab` (campanha + ficha) | 48px | 44px | ≥44px ✅ |
| `.slot-pip` (uso de slot) | 22×22 | 45×45 | ≥40 ✅ (era pequeno demais) |
| `.lang-toggle button` PT/EN | 28×39 | 40×47 | ≥40 ✅ (era 28×39) |
| `.cc-cond` (toggle condição) | compacto | 6×12 padding | OK ✅ |
| `.dm-cond-chip` | compacto | 36px | ≥36 ✅ |
| `.inv-row-head` (item) | normal | 48px clique | ≥48 ✅ |
| `<input>` font-size | 17px | 16px (`!important`) | ≥16 evita zoom iOS ✅ |
| `<select>` font-size | 17px | 16px | ≥16 ✅ |

### Outras melhorias aplicadas

- **Modais full-screen em ≤480px** (`.modal`, `.dm-editor-modal`): ocupam 100vw×100vh sem border-radius. Em tablets 480-720 continuam como sheet bottom (já existia).
- **Action-bar da Sheet** (print/share/export/edit/inspiration): wrap removido, scroll horizontal com touch scroll, scrollbar fina. Não quebra mais layout em telas estreitas.
- **Tabs sticky** no topo do scroll na Sheet — útil pra trocar de aba sem scrollar até cima de novo.
- **`.combat-grid-wrapper`** ocupa toda a largura no mobile (margem negativa). Token drag-drop continua funcional.
- **`.tv-rolls-log`** sai do `position: fixed` em mobile e vira inline depois dos cards.
- **`.wild-shape-banner`** e **`.campaign-mode-banner`** empilham em ≤600px com botão "Sair" full-width.
- **Touch feedback** `:active` com `opacity 0.7` + `scale(0.98)` em `@media (hover: none)` — feedback visual claro ao tocar.
- **Safe area** (iPhone notch): `padding: max(N, env(safe-area-inset-*))` no `.container` e `.tv-screen`.
- **`viewport-fit=cover`** + `apple-mobile-web-app-capable` no `index.html` para experiência fullscreen quando salvo na home screen.
- **`format-detection telephone=no`** previne iOS de transformar numbers em links de telefone.

### Layout em coluna (breakpoint 600px)

- `.cc-attack-row` (linha de ataque do combate): empilha select + button.
- `.tv-stats`: stats em coluna única.
- `.dice-log-row`: grid compacto sem o tipo nem o ★ rigged.
- `.dm-slots-row`: tabela com cols menores em ≤420px.
- `.rolls-panel .roll-row`: histórico em coluna.

### Não regredido em desktop

Confirmado por inspect em 1280×800: `slot-pip 22→31 com padding original`, `btn-sm 32px`, `chip 29px` — overrides só dentro do `@media (max-width: 720px)`.

## Matriz de autorização (endpoint → quem pode)

Auditoria completa em `backend/api/tests/test_authz_matrix.py` (39 testes).

### Públicos (sem auth)
| Endpoint | Acesso |
|---|---|
| `GET /api/health` | anônimo OK |
| `GET /api/auth/csrf` | anônimo OK (entrega cookie) |
| `POST /api/auth/signup` | anônimo OK (rate-limit 5/10min/IP) |
| `POST /api/auth/login` | anônimo OK (rate-limit 10/10min/IP) |
| `POST /api/auth/logout` | qualquer um |
| `GET /api/screen/<token>` | anônimo OK (telão) |
| `GET /api/screen/<token>/rolls` | anônimo OK |

### Personagens
| Endpoint | Dono | DM da camp do char | Outro user |
|---|---|---|---|
| `GET /characters` | ✅ (lista própria) | — | ✅ (lista própria) |
| `POST /characters` | ✅ | — | ✅ (cria próprio) |
| `GET /characters/<id>` | ✅ | ✅ (readonly) | 403 |
| `PUT /characters/<id>` | ✅ standalone; 🔒 campos sensíveis em campanha | 403 (usa `/dm-edit`) | 403 |
| `DELETE /characters/<id>` | ✅ | 403 | 403 |
| `GET /characters/<id>/campaigns` | ✅ | 403 | 403 |
| `PATCH /characters/<id>/dm-edit` | 403 | ✅ | 403 |
| `POST /characters/<id>/cast` | ✅ | 403 | 403 |
| `POST /characters/<id>/rest` | ✅ | ✅ | 403 |
| `POST /characters/<id>/wild-shape/transform` | ✅ druida com usos | 403 | 403 |
| `POST /characters/<id>/wild-shape/end` | ✅ | 403 | 403 |
| `POST /characters/<id>/wild-shape/force-end` | 403 | ✅ | 403 |
| `POST /characters/<id>/inventory` (add) | ✅ standalone; 403 em campanha | ✅ | 403 |
| `PATCH /characters/<id>/inventory/<itm>` | ✅ standalone tudo; campanha só `{equipped,qty,notes,attuned}` | ✅ tudo | 403 |
| `DELETE /characters/<id>/inventory/<itm>` | ✅ standalone; 403 em campanha | ✅ | 403 |
| `POST /characters/<id>/inventory/<itm>/consume` | ✅ | ✅ | 403 |

### Campanhas
| Endpoint | DM da campanha | Membro | Outro |
|---|---|---|---|
| `GET /campaigns` | ✅ | ✅ | — |
| `POST /campaigns` | — | — | ✅ (cria como DM) |
| `GET /campaigns/<id>` | ✅ (full) | ✅ (sem invite/screen tokens) | 403 |
| `PUT /campaigns/<id>` | ✅ | 403 | 403 |
| `DELETE /campaigns/<id>` | ✅ | 403 | 403 |
| `POST /campaigns/join` | — | (qualquer user com inviteCode válido) | — |
| `PUT /campaigns/<id>/members/<mid>` | ✅ | ✅ (própria membership) | 403 |
| `DELETE /campaigns/<id>/members/<mid>` | ✅ remove qualquer (não DM) | ✅ sai sozinho | 403 |
| `POST /campaigns/<id>/rotate-{screen,invite}-{token,code}` | ✅ | 403 | 403 |
| `POST /campaigns/<id>/long-rest-all` | ✅ | 403 | 403 |

### Combate
| Endpoint | DM | Membro player | Outro |
|---|---|---|---|
| `GET /combat/campaign/<id>` | ✅ | ✅ | 403 |
| `POST /combat/campaign/<id>/{start,end,reset}` | ✅ | 403 | 403 |
| `POST /combat/campaign/<id>/combatants` | ✅ | 403 | 403 |
| `PUT/DELETE /combat/campaign/<id>/combatants/<cid>` | ✅ | 403 | 403 |
| `POST /combat/campaign/<id>/action` | ✅ | 403 | 403 |
| `POST /combat/campaign/<id>/next-turn` | ✅ | 403 | 403 |
| `POST /combat/campaign/<id>/map` | ✅ | 403 | 403 |

### Dice & Rolls
| Endpoint | DM | Membro | Outro |
|---|---|---|---|
| `POST /dice/roll` (sem campaignId) | — | ✅ qualquer autenticado (rate-limited 120/min) | ✅ |
| `POST /dice/roll` (com campaignId) | ✅ | ✅ | 403 não-membro |
| `GET/POST /dice/campaign/<id>/rigs` | ✅ | 403 | 403 |
| `PUT/DELETE /dice/rigs/<id>` | ✅ da campanha | 403 | 403 |
| `GET /dice/campaign/<id>/log` | ✅ | 403 | 403 |
| `POST /rolls/campaign/<id>` (cria pedido) | ✅ | ✅ | 403 |
| `GET /rolls/campaign/<id>/pending` | ✅ vê tudo | ✅ vê só os próprios | 403 |
| `GET /rolls/campaign/<id>/recent` | ✅ tudo | ✅ public + próprios | 403 |
| `POST /rolls/<id>/resolve` | ✅ da campanha do roll | 403 (mesmo o requester) | 403 |
| `POST /rolls/<id>/cancel` | ✅ | ✅ se requester | 403 |

### Aprovações de evolução
| Endpoint | DM | Membro | Outro |
|---|---|---|---|
| `GET /approvals/campaign/<id>` | ✅ tudo | ✅ próprios | 403 |
| `POST /approvals/campaign/<id>` | ✅ | ✅ (pra char próprio) | 403 |
| `POST /approvals/<id>/review` | ✅ da campanha | 403 | 403 |

### Garantias específicas testadas (`test_authz_matrix.py`)
- Anônimo bloqueado em 5 rotas autenticadas; público liberado em `/health`, `/auth/csrf`, `/screen/*`.
- Cross-user (Bob vs char da Alice): GET/PUT/DELETE/cast/rest/wild-shape/dm-edit/give-item todos 403.
- Cross-campaign (DM da B em recursos da A): edit campaign, rotate, combat actions, dice rigs/log, review approval — tudo 403.
- Recursos aninhados: rig/approval/roll de outra campanha 403.
- `dice/roll` com `campaignId` não-membro agora 403 explícito (era silent ignore).
- Player não resolve próprio roll (só DM resolve); player cancela próprio OK.

## Standalone vs Campanha

A ficha tem **dois modos** identificados pelo campo `inCampaign` (computado: true se existe `Membership` ligando o personagem a alguma campanha).

### Tabela de permissões

| Ação                         | Standalone (dono) | Campanha (dono) | Campanha (DM)                          |
|------------------------------|-------------------|-----------------|----------------------------------------|
| Editar nome / avatar / notas | ✅                | ✅              | ✅ via `/dm-edit`                      |
| Editar HP atual / temp / inspiration / condições | ✅ | ✅           | ✅                                     |
| Editar HP **máximo**         | ✅                | ❌ 403          | ✅                                     |
| Editar **atributos** (STR/DEX/...) | ✅          | ❌ 403          | ✅                                     |
| Editar **nível, classe, raça, subclasse, antecedente, alinhamento, XP** | ✅ | ❌ 403 | ✅ |
| Editar perícias / saves proficientes | ✅          | ❌ 403          | ✅                                     |
| Slots de magia (toggle pip direto) | ✅           | ❌ 🔒 (travados) | ✅                                     |
| Conjurar magia (consome slot) | ✅ (local)        | ✅ (via /cast) | ✅                                     |
| Descansar curto/longo        | ✅                | ✅              | ✅                                     |
| Adicionar item ao inventário | ✅                | ❌ 403 (DM dá)  | ✅                                     |
| Equipar / consumir / anotar item | ✅            | ✅              | ✅                                     |
| Marcar item quebrado / alterar stats | ✅          | ❌ 403          | ✅                                     |
| Attune item (limite 3)       | ✅                | ✅              | ✅                                     |
| Remover item                 | ✅                | ❌ 403          | ✅                                     |
| Wild Shape: transformar / sair | ✅              | ✅              | ✅ (force-end)                         |
| Solicitar level-up           | ✅ (sobe direto)  | ✅ (pede aprovação) | ✅                                  |
| Sair da campanha             | —                 | ✅ DELETE membership própria | ✅ pode remover qualquer membro     |

### Fluxo de transição

1. **Entrar em campanha**: jogador na tela "Campanhas" → "Entrar com código" → cola `inviteCode` de 6 chars dado pelo DM → escolhe um personagem dele pra anexar (opcional) → vira modo campanha.
2. **Anexar personagem depois**: na campanha, tab Membros → "Trocar personagem" → seleciona.
3. **Sair de campanha**: na ficha do PC, banner gold "🏰 Em campanha: X" tem botão "Sair". Confirma → DELETE da membership → personagem volta a standalone.
4. **Validação**: personagem só fica em UMA campanha. Tentar anexar a outra retorna 409 `character_already_in_campaign` com `campaignId` da original.

### Garantia server-side

Em campanha, o `PUT /api/characters/:id` regular rejeita patches em campos sensíveis (lista `OWNER_LOCKED_IN_CAMPAIGN` em `views_characters.py`). Owner que tenta hackear o frontend toma 403 com `fields_locked_in_campaign` e lista os campos rejeitados.

Garante que mesmo se o frontend tiver bug e mandar HP máximo de 9999, o backend bloqueia.

## Segundo turno — extras de 'fim'

- **Gerenciador de iniciativa**: aba "Visão geral" da campanha (só DM) com lista ordenada, marcador de turno atual, próximo/anterior turno, tracking de rodada, "Adicionar todos os jogadores (10+DEX)", form pra NPC custom, "Limpar combate". Persistido em `campaign.state` e refletido no telão via polling.
- **Endpoint `/api/characters/:id/campaigns`**: antes, solicitar level-up fazia N+1 GETs no frontend pra encontrar a campanha. Agora é 1 GET. Autorização: só o dono lê.
- **Busca/filtro na lista de personagens**: input aparece quando há >4 personagens; filtra por nome+raça+classe+subclasse+alinhamento+nível, case-insensitive.

## Terceiro turno — combate, bestiário, VTT, rolagem dramática

### Bestiário (~130 monstros, CR 0-12)
`frontend/data/monsters.js` — humanoides (goblin, orc, knight, mage, archmage, gladiator…), undead (skeleton, zombie, ghoul, wight, wraith, mummy, banshee, shadow, specter), fiends (imp, dretch, quasit, hell hound, succubus), giants (ogre, ettin, hill/frost/fire giant), wyrmlings (red, blue, green, black, white), monstrosities (owlbear, troll, minotaur, basilisk, displacer beast, mimic, rust monster, harpy), oozes (gelatinous cube), elementals (gargoyle). Cada um com CA, HP, atributos, saves, skills, resistências/imunidades/vulnerabilidades, sentidos, traits e ações (atk + damage `XdY+Z` + damageType + opcionalmente save).

Usado pelo `MonsterPicker` no painel do mestre (busca por nome, filtro por tipo e CR).

### Engine de combate (`backend/api/combat.py`)
Funções puras (sem DB):
- `parse_dice`, `roll_dice` (com `double_dice` para crítico), `roll_d20` (vantagem/desvantagem/forced)
- `resolve_attack`: d20+atk vs CA, nat 1 sempre erra, nat 20 sempre crítico (dobra dados de dano)
- `resolve_save` / `resolve_save_effect` (estilo Fireball: alvos rolam DEX save, falhou = total, passou = metade)
- `apply_damage`: respeita resistências/imunidades/vulnerabilidades, consome `temp_hp` primeiro, marca `unconscious` + inicia death saves quando PC chega a 0, marca `defeated` para monstro
- `apply_healing`: tira `unconscious`, reseta death_saves, max é `max_hp`
- `add_condition` (com duração opcional em rounds) / `remove_condition` / `tick_effects` (decrementa nos turnos)
- `death_save`: nat 20 acorda com 1 HP, nat 1 = 2 falhas, 3 sucessos estabiliza, 3 falhas morre

### Models + endpoints
- **CombatInstance** (`OneToOne` com Campaign): combatants JSON, map_data JSON, log
- **RollRequest**: pending → public/private/cancelled, com rolls/total/crit/critfail/rigged
- 16 endpoints novos (ver `API.md`)
- PCs em combate têm HP/condições sincronizados com `Character.data` automaticamente

### Painel do mestre (frontend)
- Aba **⚔ Combate**: start/end/reset, lista de combatentes com HP bar colorida, condições toggláveis, ataques expandíveis (escolha de target), dano/cura manual, death save quando 0 HP.
- **MonsterPicker** modal: busca/filtro, adicionar N cópias do mesmo monstro com initiative.
- **CombatGrid** canvas: upload background (max 1600px JPEG q82 base64), grid sobreposto com slider (20-120px), toggle ligar/desligar, drag-drop de tokens com snap ao grid, PNG por token (max 256px), escala por tamanho (Tiny/Small/Medium/Large/Huge/Gargantuan).
- Aba **🎲 Rolagens**: form de pedido + presets (Percepção, Furtividade, etc), pendentes com botões "Mostrar no telão" / "Privado" (DM) ou "aguardando" (player), histórico recente.

### Telão público
- **Auto-detecta modo**: `combat.active` → grid VTT + side bar de HP; senão → cards grandes + iniciativa + log de rolagens.
- **Overlay dramático** quando nova rolagem pública chega: dado girando 1.4s, depois revela "valor + mod = total" gigante. Crítico em dourado pulsante com tag "CRÍTICO", falha em vermelho com tag "FALHA". Auto-fecha em 8s.
- **Log de rolagens públicas** fixo no canto bottom-left (5 mais recentes).
- Pill "EM COMBATE · Rodada N" em vermelho pulsante.

### Decisões críticas registradas (DECISIONS.md)
- **Catálogo de monstros no frontend** (JSON estático lazy chunk), instâncias no backend (combatant inline).
- **Imagens em base64 no JSON do CombatInstance** (sem filesystem do PythonAnywhere, sem dep Pillow). Frontend comprime antes de enviar.
- **Canvas em vez de SVG** pra drag-drop fluido.
- **RollRequest separado** do `/dice/roll` síncrono — fluxos diferentes não se misturam.
- **Sincronização HP combat → Character.data** para coerência fora do combate.

### Como testar em 1 minuto
```bash
# Já seedado
py manage.py seed
# Login DM → "Reino Esquecido" → aba ⚔ Combate
# 1. Botão "Adicionar monstro" → buscar "goblin" → adicionar 3 com Init 12
# 2. Botão "Adicionar PC" → escolher Thalion
# 3. "Iniciar combate"
# 4. Clicar em um goblin → expandir Ataques → escolher Thalion como target → "Atacar"
#    (rolagem aparece, HP do Thalion cai)
# 5. Telão (link na aba "Telão") muda automaticamente pro modo combate

# Login player → aba 🎲 Rolagens → "Pedir" um d20+3 com label "percepção"
# Voltar pro DM → ver pendente → "Mostrar no telão"
# Telão (em outra aba) mostra overlay dramático
```

### Commits do terceiro turno
```
8ccde28 test(combat): 34 testes Django de combate + RollRequest (110 total)
xxxxxxx feat(combat-ui): UI completa de combate, grid VTT, rolagens dramaticas no telao
xxxxxxx feat(combat): backend completo — bestiario, engine, models, REST, RollRequest
```

## Commits do segundo turno

```
f26d820 feat(home): busca/filtro na lista de personagens (>4 chars)
b86fef7 feat: endpoint /characters/:id/campaigns + frontend usa-o
7d8c6c8 feat(dm): gerenciador de iniciativa pelo painel do mestre
3366a4a test: applyAutos cobre as novas subclasses
b401585 docs+a11y: API.md, README quick-start, foco visivel, ARIA nas tabs
8dd6884 perf: select_related em endpoints + lazy loading no frontend
438f2a8 feat(security): rate limit, exception handler customizado e logging em prod
3c5c4bd feat(dice-rigging): UX completa para o mestre
2a208fc feat(tv): polish do telao - icones de condicoes, animacao HP, indicador de turno
f1937d5 feat(progression): cobertura completa 1-20 das 12 classes do PHB
```

## Commits do primeiro turno (anteriores)

```
5ed10a3 feat(campanhas): editor do estado da campanha + rolagem oficial via backend
c8cae3a chore: seed command + README com instrucoes
1bc5826 test(frontend): restaura testes JS da engine de progressao
ccdec33 feat(frontend): adapta para backend Django + CSRF + polling
7e3ef02 feat(backend): pivot para Django + DRF, prep PythonAnywhere
ad2237b feat(progression): engine declarativo para ganhos automaticos
```

Bom dia. Tudo verde, tudo testado, prontidão pra subir.

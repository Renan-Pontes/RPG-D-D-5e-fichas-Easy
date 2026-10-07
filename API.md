# API — Forja de Heróis

Base URL: `https://SEU_BACKEND/api`. Em dev local, `http://localhost:4000/api`.

## Convenções

- **Auth**: sessão Django via cookie `sessionid` (httpOnly, sameSite=Lax). Toda requisição mutante (POST/PUT/DELETE) precisa do header `X-CSRFToken` lido do cookie `csrftoken`. Para inicializar o cookie, faça um GET em `/api/auth/csrf` no boot.
- **Content-Type**: `application/json`.
- **Credentials**: o frontend usa `credentials: 'include'`. CORS no backend permite o origin do frontend via `CORS_ALLOWED_ORIGINS`.
- **Erros**: todos seguem `{ "error": "<code>", "detail"?: "<msg>", "fields"?: {...} }`. Codes comuns:
  - `auth_required` (401/403): não logado.
  - `auth_failed` (401)
  - `forbidden` (403)
  - `not_found` (404)
  - `invalid` ou `invalid_input` (400)
  - `rate_limited` (429): inclui `retryAfter` (segundos).
  - `conflict` (409): ex: email já cadastrado (`email_taken`).
- **Rate limit**:
  - `POST /auth/login` — 10/10min por IP. Reseta após sucesso.
  - `POST /auth/signup` — 5/10min por IP.
  - `POST /dice/roll` — 120/min por usuário.

---

## Auth

### `GET /auth/csrf` (público)
Garante o cookie `csrftoken`. Resposta:
```json
{ "csrfToken": "..." }
```

### `POST /auth/signup` (público)
```json
{ "email": "a@b.com", "password": "minimo-6", "displayName": "Nome" }
```
**200** `{ user: { id, email, displayName } }` · seta cookie de sessão.
**409** `{ error: "email_taken" }` · **400** `{ error: "invalid", fields: {...} }`.

### `POST /auth/login` (público, rate-limited)
```json
{ "email": "a@b.com", "password": "..." }
```
**200** `{ user }` · **401** `{ error: "invalid_credentials" }`.

### `POST /auth/logout`
**200** `{ ok: true }`.

### `GET /auth/me`
**200** `{ user }` se logado · 401/403 caso contrário.

---

## Characters

### `GET /characters`
Lista personagens do usuário. **200** `{ characters: [...] }`.

### `POST /characters`
```json
{ "name": "Thalion", "data": { ...ficha completa em JSON... } }
```
**200** `{ character }`.

### `GET /characters/:id`
**200** `{ character }`. Dono ou DM da campanha em que está atribuído podem ler.
**403 forbidden** caso contrário.

### `PUT /characters/:id`
Body igual ao POST. Só o dono.

### `DELETE /characters/:id`
Só o dono.

---

## Admin (só contas `is_staff`, somente leitura)

`GET /admin/overview` (números, cadastros e fichas recentes, fichas por classe/regra) · `GET /admin/users?q=&offset=` · `GET /admin/users/:id` (fichas e campanhas da conta) · `GET /admin/characters?q=&className=&rules=&offset=` · `GET /admin/characters/:id` (ficha completa) · `GET /admin/campaigns?q=&offset=`. `GET /auth/me` traz `isAdmin`. Para dar acesso: `python manage.py make_admin email@x.com` (`--remove` tira). O painel do Django fica em `/admin/`.

## Shares (link de ficha, 24h)

### `POST /shares`
Logado (rate-limited 30/h por usuário). Body `{ character: {...} }` (até ~1,5 MB, precisa de `name`). Responde `201 { token, expiresAt }`; o link do app é `/#s=<token>`. Guarda no máximo 50 links ativos por usuário; expirados são apagados ao criar novos.

### `GET /shares/:token` (público)
`200 { character, expiresAt }` ou `404` se expirou (24h) ou não existe. Quem abre recebe uma cópia da ficha.

## Campaigns

### `GET /campaigns`
Lista todas as campanhas onde o user é DM ou jogador. Itens trazem `role: 'dm' | 'player'`.

### `POST /campaigns`
```json
{ "name": "Reino Esquecido", "description"?: "..." }
```
**200** `{ campaign }`. Cria com `slug`, `inviteCode` e `screenToken` (visíveis apenas pro DM).

### `GET /campaigns/:idOrSlug`
**200** com `members[]`. DM vê `inviteCode` e `screenToken`. Jogadores não.
`character` dentro de cada membership: DM e o próprio dono veem `data` completo; outros veem `summary` reduzido.

### `PUT /campaigns/:id` (DM)
```json
{ "name"?: "...", "description"?: "...", "state"?: {"session": 12, "scene": "...", "weather": "..." } }
```

`dm_settings` aceitos no PUT/PATCH (só o mestre): `onboarding`, `advancedDice`, `immersion` (bool, "Mundo vivo", padrão `true`) e `fogHint` (bool, padrão `false`: deixa o jogador ter uma noção *aproximada* do que ainda não conhece). O GET devolve `immersion` para todos (o jogador precisa saber se mostra os ecos) e `fogHint` só ao mestre.

### `DELETE /campaigns/:id` (DM)
Apaga a campanha e tudo o que é dela (CASCADE): mundo, imagens, ecos, aventuras, diário/Crônica, combate, itens, pedidos de teste/rolagem, dados viciados e as memberships. **As fichas dos jogadores NÃO são apagadas** — só saem da mesa (`Membership.character` é SET_NULL). Jogador = 403. → `{ok: true}`.

### `POST /campaigns/:id/leave` (jogador)
Sai da campanha (atalho de `DELETE /members/<a própria>`). A ficha continua do jogador; reações/leituras do Mundo e dados viciados que miravam o jogador nesta mesa somem. Mestre = **400** `dm_cannot_leave` (ele apaga a campanha). Não-membro = 403.

### `POST /campaigns/join`
```json
{ "inviteCode": "ABC123", "characterId"?: 5 }
```
**200** `{ membership, campaignId, slug }`. **404 invite_invalid**.

### `GET /campaigns/invite/:code` (logado)
Prévia da mesa antes de entrar (ex.: "Tem um código de sala?" na criação de personagem). Código sem diferenciar maiúsculas.
```json
{ "campaignId": 3, "slug": "mesa", "name": "Mesa", "tagline": "…", "accent": "#c9a24a", "dmName": "Mestre",
  "members": 4, "levelingMode": "milestone" | "xp", "allowMulticlass": true, "alreadyMember": false,
  "coverUrl"?: "/api/campaigns/invite/ABC234/cover?v=<coverVer>" }
```
`members` = jogadores (sem o mestre). `coverUrl` só se houver capa. **404 invite_invalid**. **429 rate_limited** acima de 30 consultas/min por usuário (contra força bruta). Nada de estado, nomes de membros ou tokens.

### `GET /campaigns/invite/:code/cover` (logado)
Capa da campanha para a prévia (imagem binária, cache por `?v=`). 60/min por usuário. 404 sem capa ou código inválido.

### `PUT /campaigns/:id/members/:membershipId`
```json
{ "characterId": 5 | null }
```
- O próprio usuário pode mudar seu personagem (precisa ser dele).
- DM pode mudar de qualquer jogador (mas o personagem precisa pertencer ao dono da membership).

### `DELETE /campaigns/:id/members/:membershipId` (DM ou o próprio jogador)
O mestre remove qualquer jogador; o próprio jogador pode remover a si mesmo (sair). Não permite remover o DM (`cannot_remove_dm` / `dm_cannot_leave`).

### `POST /campaigns/:id/rotate-screen-token` (DM)
Gera novo token para o telão. O link antigo deixa de funcionar.

### `POST /campaigns/:id/rotate-invite-code` (DM)

---

## Approvals (workflow de evoluções)

### `GET /approvals/campaign/:idOrSlug`
DM vê todas. Jogador vê só as suas. **200** `{ approvals: [...] }`.

### `POST /approvals/campaign/:idOrSlug`
```json
{
  "characterId": 1,
  "type": "levelup" | "feature" | "item" | "spell" | "other",
  "payload": { ... },
  "note"?: "..."
}
```
Para `type=levelup`, o backend valida via `validate_level_up`:
- `payload.toLevel` deve ser exatamente +1 do atual.
- `payload.hpGain` (se informado) entre 1 e 20.

### `POST /approvals/:id/review` (DM)
```json
{ "status": "approved" | "rejected", "note"?: "...", "applyChanges"?: true }
```
Se aprovado e `applyChanges` (default true), o backend aplica via `apply_approval_to_character`:
- `levelup`: sobe `level`, aumenta `maxHp`/`currentHp`, adiciona magias listadas e features extras. **Reaplica autos da subclasse** (ex: druida Estrelas ganha `guidance` ao subir pro 2).
- `spell`: adiciona magia (sem duplicar).
- `item`: appenda no `equipment`.
- `feature`: appenda no `customFeatures`.

---

## Dice

### `POST /dice/roll` (rate-limited 120/min)
```json
{
  "diceType": "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100",
  "count"?: 1,
  "campaignId"?: 1,
  "label"?: "percepção"
}
```
**200**
```json
{
  "results": [
    { "value": 15, "rigged": true,  "source": 12 },
    { "value": 8,  "rigged": false }
  ],
  "total": 23
}
```
Se houver `campaignId` e o usuário for membro, o backend consome valores enfileirados pelo DM (`DiceRig`) primeiro; senão rola justo (`secrets.randbelow`).

### `GET /dice/campaign/:idOrSlug/rigs` (DM)
Lista filas de rigging da campanha.

### `POST /dice/campaign/:idOrSlug/rigs` (DM)
```json
{
  "targetUserId": 2,
  "diceType": "d20" | "any",
  "values": [
    { "value": 20, "label"?: "..." },
    { "value": 12 }
  ]
}
```
Até 50 valores por fila.

### `PUT /dice/rigs/:id` (DM)
```json
{ "values": [...], "diceType"?: "d20" }
```
Use pra reordenar (passe a lista na nova ordem) ou apagar valores (filtre a lista).

### `DELETE /dice/rigs/:id` (DM)

### `GET /dice/campaign/:idOrSlug/log` (DM)
Últimas 200 rolagens da campanha com flag `rigged: bool`.

---

## Screen (telão público)

### `GET /screen/:token` (PÚBLICO, sem auth)
**200** Snapshot da campanha pra TV:
```json
{
  "campaign": {
    "id": 1,
    "name": "Reino Esquecido",
    "slug": "reino-esquecido",
    "state": { "scene": "...", "session": 12, "weather": "...",
               "initiative": [{"name":"Thalion","value":17}], "initiativeTurn": 0 },
    "dm": { "id": 1, "displayName": "Mestre" },
    "members": [
      {
        "id": 1,
        "role": "player",
        "user": { "id": 2, "displayName": "Renan" },
        "character": {
          "id": 1, "name": "Thalion", "race": "elf-wood",
          "className": "druid", "subclass": "stars", "level": 3,
          "currentHp": 21, "maxHp": 21, "tempHp": 0,
          "armorClass": 12, "speed": 35,
          "conditions": ["poisoned"], "inspiration": true,
          "deathSaves": {"success":0,"fail":0},
          "avatar": "", "symbol": ""
        }
      }
    ]
  }
}
```
**404 not_found** se token inválido.

---

## Combat

### `GET /combat/campaign/:idOrSlug`
Estado atual do combate (member).
```json
{ "combat": { "active": false, "round": 1, "turnIndex": 0,
              "combatants": [...], "map": {...}, "log": [...] } }
```

### `POST /combat/campaign/:idOrSlug/start | /end | /reset` (DM)

### `POST /combat/campaign/:idOrSlug/combatants` (DM)
Adiciona combatente. Body:
```json
{ "type": "pc", "characterId": 1, "initiative": 17 }
// OU
{ "type": "monster", "monster": { ...stats inline... }, "initiative": 12,
  "position": {"x":100,"y":100}, "tokenScale": 1 }
```

### `PUT /combat/campaign/:idOrSlug/combatants/:cid` (DM)
Patch livre: name, initiative, position, sprite (base64 PNG), token_scale,
current_hp, temp_hp, conditions, defeated, death_saves, stats (parcial).

### `DELETE /combat/campaign/:idOrSlug/combatants/:cid` (DM)

### `POST /combat/campaign/:idOrSlug/action` (DM)
Action types:
- `attack`: `{ action, attackerId, targetId, actionIndex, advantage?, disadvantage? }`
  Resolve d20+atk vs CA. Crit em 20 (dobra dados). Aplica dano automático.
  Consome dice rig do d20 se houver.
- `damage`: `{ action, targetId, amount, damageType }` — aplica direto.
- `heal`: `{ action, targetId, amount }`
- `save_aoe`: `{ action, attackerId, targetIds: [...], actionIndex }` — magia
  estilo Fireball, cada alvo rola save, dano total/metade.
- `add_condition`: `{ action, targetId, condition, rounds? }`
- `remove_condition`: `{ action, targetId, condition }`
- `death_save`: `{ action, targetId }` — só PC a 0 HP.

PC com mudança de HP/conditions sincroniza com `Character.data`.

### `POST /combat/campaign/:idOrSlug/next-turn` (DM)
Avança turno. Tick effects do combatante atual (decrementa condições com duração).
Volta ao 0 = nova rodada.

### `POST /combat/campaign/:idOrSlug/map` (DM)
Configura mapa. Body parcial:
```json
{ "background_image": "data:image/jpeg;base64,...", "grid_size_px": 50,
  "grid_visible": true, "width_px": 1200, "height_px": 800 }
```

---

## Roll Requests (DM-gated)

### `POST /rolls/campaign/:idOrSlug` (member)
Cria pedido de rolagem. Status fica `pending` até o DM decidir.
```json
{ "label": "Perception", "diceType": "d20", "count": 1, "modifier": 3,
  "hasAdvantage": false, "hasDisadvantage": false, "characterId": 1 }
```

### `GET /rolls/campaign/:idOrSlug/pending`
DM vê todos. Jogador vê só os próprios.

### `GET /rolls/campaign/:idOrSlug/recent`
Histórico (public + os próprios do user).

### `POST /rolls/:id/resolve` (DM)
```json
{ "visibility": "public" | "private" }
```
Backend rola consumindo `DiceRig` se houver. Marca `isCritical` (nat 20 em d20),
`isCriticalFail` (nat 1 em d20), `rigged`. Salva também em `DiceLog`.

### `POST /rolls/:id/cancel` (DM ou owner)

### `GET /screen/:token` (público)
Inclui agora `combat: {...}` e `publicRolls: [...]` (só a mais recente). `combat.map` traz `grid_size_px`, `grid_visible`, `width_px`, `height_px` e, se houver fundo, `backgroundVer` + `backgroundUrl` — o fundo **não** vem mais inline (`background_image`).

### `GET /screen/:token/map?v=<backgroundVer>` (público)
Fundo do mapa de combate (binário, cacheável). 404 sem fundo.

**Cartão "Mostrar agora":** documento (`handout`) com `recipients` diferente de `'all'` nunca vai ao telão: o POST `/campaigns/:id/screen-card` responde **400** `handout_private`, um cartão já gravado é ignorado (`card: null`) e `GET /screen/:token/image/:id` dá 404.

---

## Mundo da campanha

Lugares, NPCs, facções, itens, lore e documentos do mestre (`WorldEntry`). O filtro do que o jogador vê é feito **só no backend** (`api/world_rules.py`). Revelar é sempre ação do mestre.

**Visibilidade para o jogador:** `hidden` → nada (lista não traz; detalhe, imagem e pin = 404) · `partial` → `kind`, `name`, `summary`, imagem e `tags` · `revealed` → + `body`, segredos revelados (só `{id, text, session}`), dados públicos do tipo, `links`/`parentId`/`mentions` cujo alvo não está oculto e `whenLabel`. **Nunca:** `dmNotes`, segredos não revelados, `data.statblock`, `data.campaignItemId`, `data.recipients`. Menções `@[Nome](id)` a alvos ocultos chegam ao jogador como texto simples (`Nome`). Handout com `recipients: [membershipId…]` só existe para esses jogadores.

**Limites:** 500 entradas por campanha (`too_many_entries`), `name` 120, `summary` 280, `body` e `dmNotes` 20k, 20 segredos × 1k, 12 tags × 30, 40 links, 100 pins, imagem ≤ 450k caracteres (`image_too_large`). A lista nunca traz corpo, notas nem imagem.

### `GET /campaigns/:id/world` (membro)
```json
{ "entries": [WorldEntryLight], "count": 7, "max": 500 }      // mestre
{ "entries": [WorldEntryLight], "seenAt": "iso" | null }       // jogador
```
`WorldEntryLight`: `{id, kind, name, summary, tags, visibility, imageVer, imageUrl, isMap, revealedAt, updatedAt, parentId, whenLabel, whenOrder, links, mentions, secretsCount, sort, data?}`; o mestre recebe também `version`, `secretsRevealed`, `pinTargets`. `data` é um subconjunto para o rótulo do cartão — `npc.role`, `place.placeType`, `item.rarity`, `handout.style` — e só aparece quando há valor (para o jogador, só se a entrada estiver `revealed`).

### `POST /campaigns/:id/world` (mestre) → **201** `{entry: WorldEntryFull}`
Só `kind` (`place|npc|faction|item|lore|handout`) e `name` são obrigatórios. Campos aceitos (camelCase): `summary, body, dmNotes, secrets, visibility, parentId, tags, links, data, whenLabel, whenOrder, sort`.
- `secrets`: `[{id?, text, revealed?}]` ou `["texto"]` (ids `s1, s2…` gerados).
- `links`: `[{to: entryId, rel: ally|enemy|family|member|employer|owes|located_in|other, note?}]` — alvos inexistentes são descartados.
- `data` por tipo (whitelist): npc `{role, appearance, mannerism, wants, statblock?}` · place `{placeType: region|city|village|dungeon|building|landmark, map?: {pins: [{id, entryId, x: 0..1, y: 0..1, visible, label?}]}}` · faction `{goal, symbolColor: '#hex'}` · item `{rarity, attunement, effect, campaignItemId?}` · lore `{}` · handout `{style: scroll|letter|wanted|note, recipients: 'all' | [membershipId]}`.

### `GET /world/:pk` (membro) → `{entry: WorldEntryFull}`
Mestre: tudo (`body, dmNotes, secrets, data, createdAt, version…`). Jogador: filtrado; oculto ou sem acesso = **404**.

### `PATCH /world/:pk` (mestre)
`{...campos, version}` → `{entry}` (versão +1). Se `version` não bate: **409** `{error: 'version_conflict', entry}` com a entrada atual. Aumentar visibilidade, revelar segredo ou mostrar pin grava `revealedAt` (não escreve na Crônica).

### `DELETE /world/:pk` (mestre)
Também limpa `links` e pins de outras entradas que apontavam para ela.

### `PUT /world/:pk/image` (mestre) · `DELETE`
`{image: 'data:image/(jpeg|png|webp);base64,…'}` → `{imageVer, imageUrl}`. Outros formatos: `invalid_image`.

### `GET /world/:pk/image?v=<ver>` (membro; jogador só se não oculta)
Bytes da imagem. `ETag: "<imageVer>"`, `Cache-Control: private, max-age=31536000`; `If-None-Match` igual → **304**.

### `POST /world/:pk/reveal` (mestre)
```json
{ "visibility": "partial", "secrets": {"s1": true}, "pins": {"p2": true}, "logDiary": true, "lang": "pt" }
```
Todas as chaves são opcionais; `false` oculta de novo. Se algo passou a ser visto, grava `revealedAt` e (com `logDiary`, padrão `true`) cria no diário um evento `reveal` (`"Revelado: Irmã Velna"`, `"Rumor: …"`, `"Descoberto: …"` com o texto dos segredos no corpo, `"No mapa: …"`), `data: {entryId, entryName, kind, visibility, secretIds, pinIds}`. Segredos revelados ganham `session` (sessão atual) e `revealedAt`. Resposta: `{entry}`.

### `POST /campaigns/:id/world/sample` (mestre)
`{lang: 'pt'|'en'}` → **201** `{entries: [WorldEntryLight], adventureId}`: a vila "Vale de Brumafria" / "Mistfrost Vale" (lugar com mapa e 4 pins, 3 NPCs, 1 facção, 1 rumor parcial, 1 segredo oculto) e a aventura de 3 salas "O Sino Afogado" com `refs` nos nós. **409** `world_not_empty` se já houver entradas.

### `POST /campaigns/:id/world/seen` (jogador)
Grava `Membership.world_seen_at = agora` → `{seenAt}`. Para o mestre é no-op (`{seenAt: null}`). A contagem "Novo!" do GET da campanha usa `views_world.world_new_count(campaign, membership)`.

### Ecos da mesa (imersão do Mundo — desligável com `dm_settings.immersion`)
Os jogadores reagem como personagem a cartões **revelados ou conhecidos de nome**: `shiver` 😱 (arrepio), `love` ❤️ (afeto), `doubt` 🤔 (desconfiança), `fight` ⚔️ (quero enfrentar) e `star` ⭐ ("quero voltar aqui"). Nada de pontos, selos ou placar; o jogador **nunca** vê quem reagiu.

- `POST /world/:pk/react` (jogador) `{kind}` — idempotente (único por cartão+jogador+kind). Aceita também o emoji. → `{entryId, myReactions, myFavorite, reactionCounts}`. Cartão oculto, handout de outro destinatário ou não-membro = **404**; mestre = **403** `players_only`; "Mundo vivo" desligado = **409** `immersion_off`; kind inválido = **400** `invalid_reaction`; 90/min por usuário (**429**).
- `DELETE /world/:pk/react` (jogador) `{kind}` ou `?kind=` — desmarca. Mesmas respostas.
- `POST /world/:pk/view` (jogador) — registra leitura; conta no máximo **1 por minuto por cartão** → `{counted: bool}`. Mestre ou imersão desligada = no-op `{counted: false}`.
- `GET /campaigns/:id/world/echoes?lang=pt|en` (mestre) →
```json
{ "immersion": true, "known": "Seus jogadores já conhecem cerca de um terço do seu mundo",
  "lines": [{"entryId": 4, "kind": "shiver", "text": "Irmã Velna arrepiou Thalion e Bia"},
            {"entryId": 1, "kind": "read", "text": "Thalion voltou quatro vezes ao mapa de Brumafria"}],
  "entries": [{"entryId": 4, "kind": "npc", "name": "Irmã Velna", "visibility": "revealed", "isMap": false,
               "reactions": {"shiver": 2}, "favorites": 0, "views": 5, "lastAt": "iso",
               "people": [{"membershipId": 7, "name": "Thalion", "kinds": ["shiver"], "views": 4, "lastAt": "iso"}]}] }
```
`name` = personagem do jogador (ou o nome dele, se não houver ficha). `known` é frase, nunca porcentagem. Desligado → `{immersion: false, entries: [], lines: [], known}`.

Na lista/detalhe do Mundo (`immersion` vem na lista): o **jogador** recebe, só em cartões revelados/parciais, `myReactions` (sem `star`), `myFavorite` e `reactionCounts` (agregado sem nomes, sem favoritos); se o mestre ligou `fogHint`, a lista traz `fog: {hint: 'none'|'few'|'some'|'many'}` (nunca um número). O **mestre** recebe `reactionCounts`, `favoriteCount`, `viewCount` e, no detalhe, `whispers` (`[{membershipId, name, kinds, views, lastAt}]`).

### `GET /campaigns/:id/session-plan` · `PUT` (mestre)
Plano da próxima sessão em `Campaign.dm_settings.sessionPlan`. PUT (ou PATCH) faz **merge por chave** no servidor (`{plan: {...}}` ou as chaves direto) e devolve `{plan}`:
```json
{ "strongStart": "texto",
  "scenes":  [{"id":"c1","text":"","nodeRef":{"adventureId":1,"nodeId":"n3"}|null,"done":false}],
  "secrets": [{"id":"p1","text":"","ref":{"entryId":5,"secretId":"s2"}|null,"discovered":false}],
  "npcIds": [5,9], "placeIds": [3], "monsters": "texto", "rewards": "texto" }
```
Limites: 30 cenas, 30 pistas, 60 ids por lista, ~60 KB no total. Marcar `discovered` **não** revela nada; o front sugere "Revelar também no cartão?" e chama `/world/:pk/reveal` se o mestre aceitar.

### Rotas do WP2 registradas em `urls.py` (contrato C1)
`PATCH /campaigns/:id/state` → `views_campaigns.campaign_state_patch` · `GET/PUT /campaigns/:id/cover` → `campaign_cover` · `POST /campaigns/:id/screen-card` → `campaign_screen_card` · `GET /screen/:token/image/:entryId` → `views_screen.screen_image(request, token, entry_id)` · `GET /screen/:token/cover` → `screen_cover` · `POST /combat/campaign/:id/attack-preview` → `views_combat.combat_attack_preview`. Enquanto a função não existir, a rota responde **501** `not_implemented`.

---

## Health

### `GET /health` (público)
`{ "ok": true }`.

---

## Padrão de polling

O frontend usa polling de 2.5s para atualizar telão, campanha e aprovações (PythonAnywhere free não suporta WebSocket). Pausa quando a aba está oculta (`document.hidden`). Para migrar para WebSocket: instalar `channels` + Redis no backend e substituir `usePolling` por listener real-time.

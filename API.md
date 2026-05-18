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

### `DELETE /campaigns/:id` (DM)

### `POST /campaigns/join`
```json
{ "inviteCode": "ABC123", "characterId"?: 5 }
```
**200** `{ membership, campaignId, slug }`. **404 invite_invalid**.

### `PUT /campaigns/:id/members/:membershipId`
```json
{ "characterId": 5 | null }
```
- O próprio usuário pode mudar seu personagem (precisa ser dele).
- DM pode mudar de qualquer jogador (mas o personagem precisa pertencer ao dono da membership).

### `DELETE /campaigns/:id/members/:membershipId` (DM)
Não permite remover o próprio DM.

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
Inclui agora `combat: {...}` e `publicRolls: [...]` (últimas 5 públicas).

---

## Health

### `GET /health` (público)
`{ "ok": true }`.

---

## Padrão de polling

O frontend usa polling de 2.5s para atualizar telão, campanha e aprovações (PythonAnywhere free não suporta WebSocket). Pausa quando a aba está oculta (`document.hidden`). Para migrar para WebSocket: instalar `channels` + Redis no backend e substituir `usePolling` por listener real-time.

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

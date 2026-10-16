# Plano — Mesa (rework do telão) + Métricas do mestre

> 2026-10-16. Pedido do Renan + doc "Fix & Tweaks 2" do Ivan (tester nº 1).
> Duas frentes **em paralelo**, cada uma na sua branch/worktree.

## Contexto

**Métricas (Ivan):** o mestre quer ver, dentro da campanha, gráficos da party: forças, fraquezas,
oportunidades e ameaças; atributos, salvaguardas e perícias de cada um; tipos de dano que o grupo
causa; escolas de magia; dificuldade e engajamento ao longo das sessões; e um checklist de
"holofote" por personagem. O objetivo é preparar testes, perigos, combates, itens e cenas sob medida
para o grupo. As imagens do doc são o modelo:

| Imagem do doc | O que vira aqui |
|---|---|
| 1. Tabela "Party Comp Attributes" (classe × 11 papéis, nota de 1 a 5) | Tabela de papéis por classe (mapa de calor) e base do cálculo |
| 2. "Session Comp Overview" + radar (média vs representação) | Visão da sessão + radar de papéis (média da party × melhor da party) |
| 3. Radar de perícias (0–20) | Cobertura de perícias |
| 4. Radares de escola de magia por conjurador | Escolas de magia por conjurador |
| 5. Tabelas por personagem + radares de atributos, salvaguardas e perícias | Comparação por personagem |

**Mesa:** o telão de hoje só mostra a última rolagem pública aprovada e um teste por vez. As
rolagens da ficha e do combate nunca chegam lá, e o mapa só existe dentro do combate. Pelo menos
11 telas diferentes mandam coisas pro telão, cada uma de um jeito. O telão novo vira **a mesa**:
mostra tudo o que acontece (todas as rolagens, locais, imagens, mapa, tokens, iniciativa) e o
mestre controla tudo de **um lugar só**, com poucos toques.

## Decisões (Renan, 2026-10-16)

- TV **em pé** (parede ou rack): layout 16:9 com "cima" definido.
- Rolagens: **as dos jogadores vão direto pro telão**, sem aprovação. As do mestre (monstros) são
  **secretas por padrão**, com um botão "rolar aberto".
- Extras que entram: **névoa de guerra**, **jogador move o próprio token**, **ping no mapa**,
  **música e ambiente**.
- **As duas frentes em paralelo** (branches separadas).
- Métricas **sem trava de plano**: rodam no navegador e não custam nada ("só se limita o que custa",
  `DECISIONS.md:351`). São **só do mestre**.

---

## Frente A — Métricas do mestre (branch `feat/metricas`)

**Onde fica:** nova subaba **Grupo › Métricas** (`metrics`). Entra em `DM_AREAS[3].subs`,
`SUB_LABELS` e `SUB_ICONS` (`frontend/src/shell/shell-logic.js`), e em `SUBS` e `SubChips` de
`frontend/src/group/GroupArea.jsx`.

**Dados:** o mestre já recebe a ficha completa de cada jogador em `campaign.members[].character.data`
(`serializers.py:114-142`), no mesmo poll da campanha. As fases A1 a A3 **não precisam de endpoint
novo**.

### A1. Motor de métricas (lógica pura + testes)

`frontend/src/metrics/party-metrics.js`, sem React. Reaproveita os helpers de `frontend/utils.js`:
`abilityMod`, `profBonus`, `saveBonus`, `skillBonus`, `attackFor`, `spellSaveDc`, `spellCatalog`,
`computeAc`, `passivePerception`. Reaproveita também `MC.classEntries` (`progression/multiclass.js`),
`computeProgression(char).features` (`progression/engine.js`), `Species.speciesGrants(char).resist`
e `SRD.SKILLS`.

**Funções:**
- `partyOverview(members)`: personagem, classe principal e secundária (multiclasse), nível, PV máx.,
  CA, Percepção passiva, CD de magia.
- `roleScores(char)`: 11 papéis de 1 a 5 (dano, mitigação de dano, capacidade mágica, cura, à
  distância, corpo a corpo, controle, utilidade, mobilidade, social, exploração).
  - Ponto de partida: a **base da classe e subclasse**, em `metrics/class-roles.js`, com os valores
    iniciais da tabela do Ivan.
  - Ajustes pela ficha real:
    - CAR e perícias sociais pesam em social.
    - Sobrevivência, Percepção e Furtividade pesam em exploração.
    - Arma ou truque à distância pesa em à distância.
    - Magias de cura conhecidas pesam em cura.
    - Deslocamento acima de 30 e magias de movimento pesam em mobilidade.
    - CA, PV e resistências pesam em mitigação.
- `partyRoles(members)`: `{avg, best}` por papel. São as duas séries do radar do Ivan.
- `skillCoverage(members)`: bônus por personagem e o melhor da party em cada perícia. Marca as
  lacunas ("ninguém treinado em Intuição") e os destaques (+7 ou mais).
- `abilityAndSaves(members)`: atributos e salvaguardas por personagem (uma série por personagem).
- `damageProfile(members)`: tipos de dano que o grupo causa, vindos de armas (`attackFor().dmgType`)
  e de magias.
  - Cruza com o bestiário (`data/bestiary.js`: `damageResistances`, `damageImmunities`,
    `damageVulnerabilities`) para listar os monstros do nível da party que **resistem ao dano
    principal** do grupo e os que **são vulneráveis** a ele.
- `spellSchools(char)`: contagem por escola (o catálogo já tem `school`).
- `swot(metrics)`: textos curtos gerados por regra.
  - **Forças:** papéis com melhor ≥ 4.
  - **Fraquezas:** papéis com melhor ≤ 2, salvaguardas fracas.
  - **Oportunidades:** perícias em que alguém brilha, viram testes sugeridos.
  - **Ameaças:** monstros e condições que exploram as fraquezas. Ex.: SAB baixa → medo e encanto;
    sem cura → desgaste.
- `spotlightSuggestions(char, metrics)`: 2 "brilhar" (pelos pontos fortes) e 1 "desafio" (pelo ponto
  fraco), com texto pronto. Ex.: "Floyd: cena social — Persuasão +7".

**Lacuna de dados:** as magias do SRD não têm tipo de dano, salvaguarda nem cura estruturados (só
`desc`). A solução é criar `frontend/src/metrics/spell-effects.js`, um mapa
`id → {damageType?, save?, attack?, healing?, control?}`.
- Geração: um script em `frontend/scripts/` lê o `desc.en` com regex ("X damage", "Y saving throw",
  "regain hit points"), depois revisamos à mão.
- **Bônus:** o mesmo mapa conserta o `deriveAttacks` de `CombatActionPanel.jsx:63-92`, que lê campos
  inexistentes. Por isso os truques de dano não aparecem na lista de ataques do jogador.

**Testes:** `frontend/tests/party-metrics.test.js` e `spell-effects.test.js`, no padrão `node:test`.
Usam as fichas de `data/pregens.json`.

### A2. Gráficos e tela de Métricas

Gráficos em **SVG feito à mão**, sem biblioteca, para o bundle continuar leve:
`frontend/src/metrics/charts/` com `RadarChart`, `BarChart`, `LineChart` e `HeatTable`.
- Cores vêm dos tokens de `styles.css:7-48`.
- Cada personagem tem uma cor fixa em todos os gráficos.
- Tooltip ao tocar.
- Antes de implementar, carregar o skill `dataviz`.

Tela `frontend/src/metrics/MetricsPanel.jsx`. Seções que recolhem, nesta ordem:
1. **Visão da party** (imagem 2): tabela + sessão atual (`state.session` e `diarySessions`).
2. **Papéis da party**: radar de 11 eixos com média × melhor. Botão "ver tabela por classe"
   (imagem 1, mapa de calor).
3. **FOFA**: quatro cartões com os textos de `swot()`.
4. **Comparação por personagem** (imagem 5): radares de atributos e de salvaguardas, uma linha por
   personagem.
5. **Cobertura de perícias** (imagem 3): radar de 18 eixos + tabela de calor com as lacunas
   marcadas.
6. **Dano e resistências**: barras por tipo de dano + "monstros que resistem ou são vulneráveis".
7. **Escolas de magia** (imagem 4): um radar pequeno por conjurador.
8. **Holofote**: ver A3.
9. **Ao longo das sessões**: ver A4.

### A3. Checklist de holofote

- **Onde guarda:** `dm_settings.spotlight` (só do mestre), com a mesma whitelist e validação de
  `sessionPlan` e `onboarding` (`views_campaigns.py:57-79`). Não precisa de migração.
- Formato: `{[characterId]: {items: [{id, text, kind: 'shine'|'challenge'|'story', done, doneSession}]}}`.
- **Interface:** um cartão por personagem com as sugestões automáticas (botão "adicionar") e os itens
  do mestre. Marcar como feito grava em que sessão foi. Mostra "último holofote: sessão N".
- **Integração:** o passo 1 "O grupo" do `prep/NextSession.jsx` ganha um resumo (fraquezas e
  holofotes pendentes) com link para Métricas.

### A4. Dificuldade e engajamento por sessão (depende da B1)

Esta fase só começa depois da B1, porque precisa dos eventos da mesa.
- **Backend:** `log_combat_end` (`api/diary.py:330`) passa a gravar, por monstro, o CR e o XP, os
  níveis da party, a dificuldade calculada (fácil, média, difícil ou mortal) e o dano sofrido por
  PJ.
  - Hoje ele não grava nada disso, apesar de os combatentes terem `stats.cr` e `stats.xp`.
  - A tabela de limiares de XP sai de `combat/EncounterDifficulty.jsx`: virar função pura se estiver
    dentro do componente.
- **Endpoint (só mestre):** `GET /api/campaigns/<id>/metrics/sessions`. Por sessão devolve: título,
  combates (dificuldade, XP, rodadas, quedas, dano sofrido), rolagens e testes por personagem,
  críticos e falhas (contados em `TableEvent`), e holofotes feitos.
- **Gráficos de linha:**
  - dificuldade por sessão;
  - participação de cada personagem (rolagens e testes), para achar quem está sumindo da mesa.
- Sessões antigas não têm esses dados. A tela mostra "dados a partir da sessão N".

---

## Frente B — Mesa (branch `feat/mesa`)

### Como a TV fica (16:9, em pé)

```
┌───────────────────────────────────────────────┬──────────────┐
│ ● AO VIVO  Sessão 12 · Taverna do Corvo · 🌧  │  INICIATIVA  │  ← só em combate
│                                               │ ▶ Floyd   18 │
│                 PALCO                         │   Goblin  15 │
│   capa · imagem do local/cena · mapa com      │   Hakim   11 │
│   tokens + névoa + ping · cartão por cima     ├──────────────┤
│                                               │  ROLAGENS    │  ← feed ao vivo
│                                               │ Floyd ⚔ 17   │
│                                               │ Hakim 🎲 20! │
├───────────────────────────────────────────────┴──────────────┤
│ [Floyd ❤22/30 CA15] [Hakim ❤9/27 CA13 ☠1] [Escanor …]        │  ← party
└──────────────────────────────────────────────────────────────┘
```

**Modos do palco:** o mestre escolhe um, com um toque.
- 🏠 **Descanso**: a capa.
- 🖼 **Imagem**: local, cena, NPC ou upload rápido, em tela cheia, com título e texto opcional.
- 🗺 **Mapa**: exploração, com tokens, névoa e ping.
- ⚔ **Combate**: automático quando o combate começa. Usa o mapa ativo e mostra a iniciativa.

Por cima de qualquer modo pode entrar um **cartão** (entrada do Mundo, documento, recapitulação),
que o mestre fecha quando quiser. A opção **"Foco"** esconde as barras laterais para um momento de
impacto.

**Rolagens no telão:**
- Toda rolagem entra no **feed** da direita, com avatar, rótulo, total e cor de crítico ou falha.
- O **overlay dramático** (dado 3D grande) fica para natural 20 ou 1 e para ataques e salvaguardas
  em combate. É configurável: só críticos, tudo ou desligado.
- Os overlays entram numa fila, então nenhuma rolagem se perde.

### Modelo de dados (backend)

| Peça | Onde | Pra quê |
|---|---|---|
| `TableEvent` (novo model) | `campaign`, `kind` (roll / check / combat / ping), `visibility` (`table` / `dm`), `user`, `character`, `session`, `data` JSON, `created_at`; índice `(campaign, id)` | Feed único de tudo que acontece na mesa. Cursor por **id**, não por relógio, então nada se perde quando duas rolagens caem no mesmo poll. Ping é efêmero (podado); rolagens ficam (alimentam a A4). |
| `TableMap` (novo model) | `campaign`, `name`, `source` (upload / entrada do Mundo / nó de aventura), `image_data` (**só upload**), `image_ver`, `grid` {size, offsetX, offsetY, visible}, `width`/`height`, `fog` {enabled, ops[]}, `tokens` JSON | Mapa fora do combate. Ao usar a imagem de um local ou de uma cena, guarda só a **referência**: fim da cópia em base64 e da cota contada em dobro. |
| `Campaign.table_rev` (novo campo) | inteiro, sobe a cada mudança que afeta a mesa | Polling barato (ver abaixo). |
| `Campaign.tv_code` (novo campo) | 6 caracteres, gira junto com o `screen_token` | Abrir na TV digitando `forja…/tv` + código, em vez do link enorme. |
| `state.stage` (chave só do servidor, em `SERVER_KEYS`) | `{mode, image, mapId, view, card, focus, audio, settings}` | O que está na mesa agora. O `screenCard` atual vira `stage.card` (migração de dados). `settings` = {openDmRolls, playersMoveTokens, moveOnlyOnTurn, rollOverlay}. |
| `CombatInstance` | ganha `map_id` (FK → TableMap); combatente ganha `token_id` | O combate usa o mapa ativo. **Posição mora no token do mapa** (fonte única). O `map_data` atual vira um `TableMap` "Mapa de combate" (migração). |

### Todas as rolagens passam pelo servidor quando há campanha

- **Rota única:** `POST /api/campaigns/<id>/roll`.
  - Corpo: `{groups:[{sides,count,sign}], mod, adv, label, kind, characterId?, secret?}`.
  - Valores de `kind`: attack, damage, skill, save, check, init, death, hitdie, custom.
  - O servidor rola cada dado com `_consume_or_roll` (`views_dice.py:134`), então **respeita os
    rigs**.
  - Grava o `DiceLog` como hoje, cria um `TableEvent` e devolve o resultado já filtrado por
    `scrub_dice`.
- **Ficha:** `window.__diceRoll` (`components/DiceRoller.jsx:98`) ganha um "contexto de mesa"
  (campanha + personagem). A ficha já descobre a campanha em `Sheet.jsx:553`.
  - Com contexto, rola no servidor: a animação começa na hora e para no valor que o servidor
    devolver.
  - Sem campanha ou offline, rola local, com a marca "local".
  - Cobre perícia, atributo, salvaguarda, ataque e dano de arma e de magia, iniciativa, salvaguarda
    contra morte e dado de vida (este botão é novo; hoje é só um contador).
- **Combate:** `combat_action`, `combat_player_attack` e a recarga do `next_turn` passam a gravar
  `TableEvent` (hoje só vão pro `action_log`).
  - Rolagens de jogador: `table`.
  - Rolagens de monstro: `dm`, a menos que `openDmRolls` esteja ligado ou que o mestre aperte "rolar
    aberto" naquela ação.
  - O `SaveResultCard` hoje rola d20 local (`Math.random`) e passa a usar o servidor.
- **Testes de grupo:** cada `CheckResponse` vira um evento `check` no feed. O painel de resultados
  continua aparecendo quando o mestre pede.
- **Fluxo antigo "pedir ao mestre" (`RollRequest`):** a caixinha vira **"Só pro mestre"**: uma
  rolagem secreta do jogador, com visibilidade `dm`. Os pedidos pendentes antigos são resolvidos na
  migração. A interface de aprovação sai na B5.
- **Dado físico:** o rolador ganha "rolei na mão: __". O valor vai pro feed com 🎲 "físico".
- **Bugs corrigidos de passagem:**
  - O PV de subida de nível é rolado duas vezes (`LevelUpModal.jsx:152-155`): uma no `Math.random`,
    outra na animação.
  - O `combat_player_attack` consome um rig no caminho de salvaguarda, onde o valor nem é usado.

### Controle da mesa: um lugar só, fácil

**Jogar › Telão** vira **Jogar › Mesa**, a central do mestre (reescreve o `play/ScreenPanel.jsx`):

```
┌ Prévia REAL do telão (o mesmo componente da TV, reduzido) ───┐
│                                                              │
└──────────────────────────────────────────────────────────────┘
Na mesa:  [🏠 Descanso] [🖼 Imagem] [🗺 Mapa] [⚔ Combate]   [Foco]
Rápido:   miniaturas da aventura atual e das últimas usadas (1 toque)
Mapa:     mover · revelar · cobrir · revelar tudo · ping · enquadrar na TV
Som:      [Taverna ▾] ▶ ━━━○ volume
Ajustes:  ☐ rolagens do mestre abertas  ☑ jogadores movem tokens  ☐ só no turno
Abrir na TV: forja…/tv  código  K7Q2PX
```

- **Prévia real:** `screen/TableView.jsx` é o componente do telão sem o polling. A TV e a prévia usam
  o mesmo componente, então a prévia mostra exatamente o que a TV mostra (hoje é uma aproximação).
- **Um botão 📺 só:** `<ShowOnTableButton target={...}/>` + `screen/stage-api.js`
  (`showOnTable({kind, ref})`). Substitui os 5 wrappers duplicados de `screen-card` (`client.js:199`,
  `play-api.js:36`, `world-api.js:107`, `group-api.js:10`, `prep-api.js:15`). Os pontos de 📺 que já
  existem no Mundo, na Aventura, no Diário e no Teste continuam, todos chamando a mesma API.
- **Cena:** conserta os dois caminhos que hoje divergem (`adventures/:pk/screen` × `screen-card
  {type:'scene'}`). Mostrar uma cena manda **nome + texto + imagem do nó**; hoje a imagem do nó nunca
  aparece.
- Sessão, cena e clima saem do `TableNow` e também ficam editáveis na Mesa.
- **Atalhos de teclado do mestre:** 1–4 trocam o modo, F liga o foco, Esc fecha o cartão.

### Mapas, névoa, tokens, ping, música

- **`TableCanvas`** (`screen/table/`): camadas de canvas (imagem, grade, névoa, tokens, pings).
  - Redesenha só quando algo muda, com `requestAnimationFrame`. Hoje há um timer de 700 ms em
    `CombatGrid.jsx`.
  - Zoom e pan no mestre e no jogador. A TV se ajusta ao **enquadramento** que o mestre escolher
    (`stage.view`).
- **Fontes de mapa:**
  - upload, comprimido com `compressForEntry` de `world/image.js`;
  - imagem de um local do Mundo, com os pins de `data.map.pins` virando marcadores;
  - imagem de um nó de aventura.
- **Névoa de guerra:** começa coberta. Ferramentas do mestre:
  - "revelar" com retângulo ou pincel, "cobrir" e "revelar tudo";
  - as operações ficam em `fog.ops[]`, com limite e compactação.
  - O mestre vê a névoa semitransparente. A TV e os jogadores veem preto.
  - Tokens do mestre escondidos ou sob a névoa **não vão no payload público**.
- **Tokens:**
  - PJ usa o avatar do personagem (hoje não usa: `CombatTab.jsx:126`).
  - Monstro usa a sprite e mostra só a faixa de saúde, como hoje.
  - O mestre move qualquer token.
- **Jogador move o próprio token:** a área **Mesa** do jogador (`player/PlayerTable.jsx`) ganha
  o mapa da mesa, a mesma visão da TV, com névoa.
  - O jogador arrasta só o token ligado ao personagem dele.
  - Precisa de `playersMoveTokens` ligado. Com `moveOnlyOnTurn`, só move no próprio turno de
    combate.
  - Rota: `PATCH /api/campaigns/<id>/maps/<m>/tokens/<t>`, aberta ao mestre e ao dono, com teste na
    matriz de permissões.
- **Ping:** toque longo no mapa, pelo mestre ou pelo jogador.
  - `POST /api/campaigns/<id>/ping {x,y}`, com limite de 10 a cada 10 s.
  - Na TV aparece um pulso na cor do jogador por 4 s.
- **Música e ambiente:** **8 a 10 loops CC0** em `frontend/public/audio/` (taverna, floresta, chuva,
  caverna, cidade, mar, tensão, batalha), servidos pelo CDN da Vercel, com os créditos em
  `audio/CREDITS.md`.
  - Também aceita um link direto de mp3 ou ogg.
  - `stage.audio = {track, url?, volume, playing}` e crossfade na troca de faixa.
  - A TV mostra **"Toque para ativar o som"** uma vez, porque o navegador bloqueia autoplay.
  - Upload de áudio fica de fora: base64 no banco não aguenta.

### Desempenho (continua polling: PythonAnywhere free não tem WebSocket)

- **`table_rev`:** um helper `bump_table(campaign_id)` é chamado em `merge_state`, no palco, em
  mapas, tokens e névoa, no combate, nas rolagens e nos testes. Um sinal `post_save` de `Character`
  avisa as campanhas do personagem quando PV ou condição mudam.
  - A TV chama `GET /api/screen/<t>?rev=N`. Se nada mudou, responde `{unchanged:true}` com **1
    query**. Hoje são cerca de 6 queries a cada 2 s, sem 304.
  - Com isso dá para baixar o intervalo para cerca de 1,5 s.
- **Payload mais magro:**
  - `state`, `card` e `combat` deixam de ser enviados duas vezes (`views_screen.py:91-117`).
  - Avatares, sprites e mapas passam a ir por URL com ETag e `?v=` (`/screen/<t>/avatar/<id>`,
    `/screen/<t>/token/...`, `/screen/<t>/map/<mapId>`). Hoje vão em base64 a cada poll.
  - O cartão de cena para de carregar o JSON inteiro da aventura.
- **Feed:** `?since=<eventId>` traz só os eventos novos.
- **Um hook só:** `useTableFeed` no shell da campanha substitui os 3 `getScreen` com timers
  separados (TV, `ScreenPanel`, popover do cabeçalho).

### Fases

| Fase | Entrega | Resultado visível |
|---|---|---|
| **B1 Fundação** | `TableEvent`, rota única de rolagem, ficha e combate no servidor, feed com cursor, `table_rev` + payload magro, `tv_code` | **Todas as rolagens no telão**, sem perder nenhuma; TV abre por código |
| **B2 Palco + Controle** | `state.stage`, `TableView` novo (layout acima), modos, foco, Controle da Mesa com prévia real, `ShowOnTableButton` único, cena com imagem | Mestre controla tudo de um lugar; locais e imagens em tela cheia |
| **B3 Mapas** | `TableMap` + migração do mapa de combate, `TableCanvas`, mapa de exploração, enquadramento, combate no mapa ativo, iniciativa na TV | Mapa fora do combate; iniciativa visível |
| **B4 Extras** | Névoa, jogador move o token (mapa na Mesa do jogador), ping, música | Mesa virtual completa |
| **B5 Limpeza** | Tira o código morto: `/screen/<t>/rolls`, `_serialize_combat_public`, `LegacyTabs` `ScreenTab`/`CampaignDiceRoller`, CSS sem uso (`.tv-initiative` antigo etc.), interface de aprovação de `RollRequest`. Atualiza `DECISIONS.md` e `API.md` | Base enxuta |

---

## Como as duas frentes se tocam

- **`shell-logic.js`:** a frente A adiciona `metrics` em Grupo; a frente B renomeia o rótulo
  `screen` para "Mesa". O conflito é trivial.
- **Migrações:** **só a frente B cria migrations**. A frente A usa `dm_settings` e o JSON do diário,
  então não há colisão de numeração.
- **Ordem de merge:** A1–A3 e B1 podem entrar em qualquer ordem. **A4 vem depois de B1**, porque usa
  `TableEvent`. O resto da frente B segue em sequência (B2 → B5).
- **Worktrees:** `.claude/worktrees/` (já existe). Este arquivo precisa estar commitado na `main`
  antes de criar as worktrees.

## Riscos e o que aceitamos

- **A névoa é visual.** A imagem crua do mapa ainda pode ser baixada por quem tem o link da TV. Para
  mapas com segredo, o mestre usa mapas separados por área. Isso vai registrado em `DECISIONS.md`.
- **Rigs passam a valer na ficha.** Antes a ficha rolava local e o rig não pegava. Fica coerente
  com o resto do app, mas vale avisar.
- **Latência da rolagem no servidor:** a animação disfarça. Offline cai no modo local.
- **Polling no plano free:** o `table_rev` deixa cada poll muito barato. Medir antes e depois
  (queries por request) na B1.
- **Telão aberto durante o deploy:** manter `publicRolls` no payload por uma versão. Deploy do
  backend primeiro, depois do frontend.

## Verificação

- **Testes automáticos:** `cd backend && py manage.py test api` e `cd frontend && npm test`.
- **Backend novo:**
  - `test_table_events.py`: rigs aplicados e escondidos, rolagem secreta do mestre nunca no payload
    público, cursor sem perda;
  - `test_table_maps.py`: tokens sob névoa ou escondidos fora do payload, jogador move só o próprio
    token;
  - `test_stage.py`;
  - `test_screen_rev.py`: `unchanged` com 1 query;
  - casos novos em `test_authz_matrix.py` e `test_screen_privacy.py`.
- **Frontend novo:** `party-metrics.test.js`, `spell-effects.test.js`, `stage-logic.test.js`,
  `fog.test.js`, `feed-logic.test.js`.
- **Ponta a ponta local:** `py manage.py seed`, com o seed ganhando mais 3 pregens para a party ter
  graça nas métricas. Backend em `runserver 4000`, frontend em `npm run dev`. Três janelas: mestre,
  jogador e `/tv` em 1920×1080, verificadas pelo Chrome com screenshots. Roteiro:
  1. rolar perícia na ficha → aparece no feed da TV em até 2 s;
  2. ataque de monstro → não aparece; com "rolar aberto" → aparece;
  3. duas rolagens em sequência rápida → as duas aparecem;
  4. mostrar um local → imagem em tela cheia;
  5. abrir mapa, revelar névoa, jogador arrasta o token, ping, tocar música;
  6. aba Rede da TV parada → respostas `unchanged`;
  7. Grupo › Métricas com os gráficos da party.
- **Produção:** backup → zip + `forja-deploy.sh` no PythonAnywhere (NGhetsis, com migrações) →
  push na `main` (Vercel). Na Aethernum (id 4), conferir com Floyd e Hakim.

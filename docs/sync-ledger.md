# Livro-razão da diferença entre produção e `main`

> Gerado do git por `docs/sync-spec.md` §8 (não editar à mão). Base: `5655785` (26/10/2026, o código que a produção roda de fato) → `d1607f4`.

**329 commits** (sem merges): F: 266, B: 31, F+B: 30, docs: 2.

Área: **F** só frontend · **B** só backend · **F+B** os dois no mesmo commit · **ops** deploy/scripts · **docs** só documentação.

## 1. Rotas do backend × quem chama no frontend

`nova` = não existe na produção (entrou depois da base). Sem chamador = endereço montado pelo servidor (imagens) ou rota só de operação.

| Rota (`/api/…`) | Métodos | View | Nova | Chamada em (frontend) |
|---|---|---|---|---|
| `proxy` | GET | `views_proxy.proxy_fetch` | **nova** | `src/campaigns/url-monster-importer.js`, `vite.config.js` |
| `auth/csrf` | GET | `views_auth.csrf` |  | `src/api/client.js` |
| `auth/signup` | POST | `views_auth.signup` |  | `src/api/client.js` |
| `auth/login` | POST | `views_auth.login_view` |  | `src/api/client.js` |
| `auth/logout` | POST | `views_auth.logout_view` |  | `src/api/client.js` |
| `auth/me` | GET | `views_auth.me` |  | `src/api/client.js` |
| `auth/change-password` | POST | `views_auth.change_password` |  | `src/api/client.js` |
| `characters` | GET,POST | `views_characters.character_list` |  | `src/api/client.js`, `src/plans/plans-api.js` |
| `characters/<int:pk>` | GET,PUT,DELETE | `views_characters.character_detail` |  | `src/api/client.js` |
| `characters/<int:pk>/campaigns` | GET | `views_characters.character_campaigns` |  | `src/api/client.js` |
| `characters/<int:pk>/dm-edit` | PATCH | `views_characters.character_dm_edit` |  | `src/api/client.js` |
| `characters/<int:pk>/cast` | POST | `views_characters.character_cast_spell` |  | `src/api/client.js` |
| `characters/<int:pk>/rest` | POST | `views_characters.character_rest` |  | `src/api/client.js` |
| `characters/<int:pk>/level-choice` | POST | `views_characters.character_level_choice` |  | `src/api/client.js` |
| `characters/<int:pk>/class-options` | POST | `views_characters.character_class_options` |  | `src/api/client.js` |
| `characters/<int:pk>/resource` | POST | `views_characters.character_resource` |  | `src/api/client.js` |
| `characters/<int:pk>/inventory` | POST | `views_inventory.inventory_add` |  | `src/api/client.js` |
| `characters/<int:pk>/inventory/open-pack` | POST | `views_inventory.inventory_open_pack` |  | `src/api/client.js` |
| `characters/<int:pk>/inventory/<str:item_id>` | PATCH,DELETE | `views_inventory.inventory_item` |  | `src/api/client.js` |
| `characters/<int:pk>/inventory/<str:item_id>/consume` | POST | `views_inventory.inventory_consume` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/long-rest-all` | POST | `views_characters.campaign_long_rest_all` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/short-rest-all` | POST | `views_characters.campaign_short_rest_all` |  | `src/api/client.js` |
| `characters/<int:pk>/wild-shape/transform` | POST | `views_characters.wild_shape_transform` |  | `src/api/client.js` |
| `characters/<int:pk>/wild-shape/end` | POST | `views_characters.wild_shape_end` |  | `src/api/client.js` |
| `characters/<int:pk>/wild-shape/force-end` | POST | `views_characters.wild_shape_force_end` |  | `src/api/client.js` |
| `campaigns` | GET,POST | `views_campaigns.campaign_list` |  | `src/api/client.js` |
| `campaigns/join` | POST | `views_campaigns.campaign_join` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>` | GET,PUT,PATCH,DELETE | `views_campaigns.campaign_detail` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/members/<int:membership_id>` | PUT,DELETE | `views_campaigns.campaign_member` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/close` | POST | `views_campaigns.campaign_close` |  | `src/plans/plans-api.js` |
| `campaigns/<str:id_or_slug>/reopen` | POST | `views_campaigns.campaign_reopen` |  | `src/plans/plans-api.js` |
| `campaigns/<str:id_or_slug>/leave` | POST | `views_campaigns.campaign_leave` |  | `src/group/group-api.js` |
| `campaigns/<str:id_or_slug>/rotate-screen-token` | POST | `views_campaigns.campaign_rotate_screen` |  | `src/api/client.js`, `src/stage/stage-api.js` |
| `campaigns/<str:id_or_slug>/rotate-invite-code` | POST | `views_campaigns.campaign_rotate_invite` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/items` | GET,POST | `views_items.campaign_items` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/items/<int:item_pk>` | PATCH,DELETE | `views_items.campaign_item_detail` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/state` | PATCH | `views_campaigns.campaign_state_patch` |  | `src/api/client.js`, `src/group/group-api.js`, `src/play/play-api.js` +1 |
| `campaigns/<str:id_or_slug>/cover` | GET,PUT,DELETE | `views_campaigns.campaign_cover` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/screen-card` | POST | `views_campaigns.campaign_screen_card` |  | `src/stage/stage-api.js` |
| `campaigns/<str:id_or_slug>/stage` | POST | `views_campaigns.campaign_stage` | **nova** | `src/stage/stage-api.js` |
| `campaigns/<str:id_or_slug>/stage/scene` | POST | `views_campaigns.campaign_stage_scene` | **nova** | `src/stage/stage-api.js` |
| `campaigns/<str:id_or_slug>/stage-image` | GET | `views_campaigns.campaign_stage_image` | **nova** | `src/stage/stage-now.js` |
| `campaigns/<str:id_or_slug>/pulse` | GET | `views_pulse.campaign_pulse` | **nova** | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/members/<int:membership_id>/avatar` | GET | `views_campaigns.campaign_member_avatar` | **nova** | — |
| `campaigns/<str:id_or_slug>/world` | GET,POST | `views_world.world_list` |  | `src/prep/prep-api.js`, `src/world/world-api.js` |
| `campaigns/<str:id_or_slug>/world/sample` | POST | `views_world.world_sample` |  | `src/world/world-api.js` |
| `campaigns/<str:id_or_slug>/world/clear` | POST | `views_world.world_clear` |  | `src/world/world-api.js` |
| `campaigns/<str:id_or_slug>/world/ingest` | POST | `views_world.world_ingest` | **nova** | `src/world/world-api.js` |
| `campaigns/<str:id_or_slug>/world/seen` | POST | `views_world.world_seen` |  | `src/world/world-api.js` |
| `campaigns/<str:id_or_slug>/world/echoes` | GET | `views_world.world_echoes` |  | `src/world/world-api.js` |
| `campaigns/<str:id_or_slug>/session-plan` | GET,PUT,PATCH | `views_world.session_plan` |  | `src/prep/prep-api.js`, `src/world/world-api.js` |
| `campaigns/<str:id_or_slug>/session-plan/archive` | POST | `views_world.session_plan_archive` | **nova** | `src/world/world-api.js` |
| `campaigns/<str:id_or_slug>/session-plan/restore` | POST | `views_world.session_plan_restore` | **nova** | `src/world/world-api.js` |
| `campaigns/<str:id_or_slug>/party-insights` | GET,PUT,PATCH | `views_insights.party_insights` | **nova** | `src/group/insights-api.js` |
| `campaigns/<str:id_or_slug>/party-insights/history` | GET | `views_insights.party_insights_history` | **nova** | `src/group/insights-api.js` |
| `world/<int:pk>` | GET,PATCH,PUT,DELETE | `views_world.world_detail` |  | `src/prep/prep-api.js`, `src/world/world-api.js` |
| `world/<int:pk>/image` | GET,PUT,DELETE | `views_world.world_image` |  | `src/prep/prep-api.js`, `src/prep/prep-world.js`, `src/stage/stage-now.js` +4 |
| `world/<int:pk>/reveal` | POST | `views_world.world_reveal` |  | `src/prep/prep-api.js`, `src/world/world-api.js` |
| `world/<int:pk>/react` | POST,DELETE | `views_world.world_react` |  | `src/player/living/living-api.js`, `src/world/world-api.js` |
| `world/<int:pk>/view` | POST | `views_world.world_view` |  | `src/player/living/living-api.js`, `src/world/world-api.js` |
| `campaigns/<str:id_or_slug>/diary` | GET,POST | `views_diary.campaign_diary` |  | `src/api/client.js`, `src/group/group-api.js`, `src/world/Timeline.jsx` |
| `campaigns/<str:id_or_slug>/diary/sessions` | POST | `views_diary.campaign_diary_start_session` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/diary/sessions/<int:number>` | PATCH | `views_diary.campaign_diary_session` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/diary/sessions/<int:number>/end` | POST | `views_diary.campaign_diary_end_session` | **nova** | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/diary/<int:entry_pk>` | PATCH,DELETE | `views_diary.campaign_diary_entry` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/adventures` | GET,POST | `views_adventures.adventure_list` |  | `src/api/client.js`, `src/play/play-api.js` |
| `campaigns/<str:id_or_slug>/adventures/<int:pk>` | GET,PATCH,PUT,DELETE | `views_adventures.adventure_detail` |  | `src/api/client.js`, `src/play/play-api.js`, `src/prep/prep-api.js` |
| `campaigns/<str:id_or_slug>/adventures/<int:pk>/play` | POST | `views_adventures.adventure_play` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/adventures/<int:pk>/screen` | POST | `views_adventures.adventure_screen` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/adventures/<int:pk>/nodes` | GET | `views_adventures.adventure_nodes` | **nova** | — |
| `campaigns/<str:id_or_slug>/adventures/<int:pk>/node/<str:node_id>` | GET,PATCH | `views_adventures.adventure_node` | **nova** | — |
| `ready-adventures` | GET | `views_ready.ready_catalog` |  | `src/ready/ready-logic.js` |
| `campaigns/<str:id_or_slug>/ready-adventure` | GET,POST | `views_ready.campaign_ready_adventure` |  | `src/ready/ready-logic.js` |
| `approvals/campaign/<str:id_or_slug>` | GET,POST | `views_approvals.campaign_approvals` |  | `src/api/client.js` |
| `approvals/campaign/<str:id_or_slug>/grant-levelup` | POST | `views_approvals.campaign_grant_levelup` |  | `src/api/client.js` |
| `campaigns/<str:id_or_slug>/award-xp` | POST | `views_approvals.campaign_award_xp` |  | `src/api/client.js` |
| `approvals/<int:pk>/review` | POST | `views_approvals.approval_review` |  | `src/api/client.js` |
| `approvals/<int:pk>/consume` | POST | `views_approvals.approval_consume` |  | `src/api/client.js` |
| `admin/overview` | GET | `views_admin.overview` |  | `src/api/client.js` |
| `admin/users` | GET | `views_admin.users` |  | `src/api/client.js` |
| `admin/users/<int:pk>` | GET | `views_admin.user_detail` |  | `src/api/client.js` |
| `admin/characters` | GET | `views_admin.characters` |  | `src/api/client.js` |
| `admin/characters/<int:pk>` | GET | `views_admin.character_detail` |  | `src/api/client.js` |
| `admin/campaigns` | GET | `views_admin.campaigns` |  | `src/api/client.js` |
| `admin/users/<int:pk>/plan` | GET,PATCH | `views_plans.admin_user_plan` |  | `src/plans/plans-api.js` |
| `admin/users/<int:pk>/temp-password` | POST | `views_admin.user_temp_password` |  | `src/api/client.js` |
| `plans` | GET | `views_plans.plan_catalog` |  | `src/plans/plans-api.js` |
| `me/plan` | GET | `views_plans.my_plan` |  | `src/plans/plans-api.js` |
| `me/plan/checkout` | POST | `views_plans.my_plan_checkout` |  | `src/plans/plans-api.js` |
| `shares` | POST | `views_share.share_create` |  | `src/api/client.js` |
| `shares/<str:token>` | GET | `views_share.share_get` |  | `src/api/client.js` |
| `dice/roll` | POST | `views_dice.dice_roll` |  | `src/api/client.js` |
| `characters/<int:pk>/table-roll` | POST | `views_dice.sheet_roll` | **nova** | `src/api/client.js` |
| `dice/campaign/<str:id_or_slug>/rigs` | GET,POST | `views_dice.campaign_rigs` |  | `src/api/client.js` |
| `dice/campaign/<str:id_or_slug>/log` | GET | `views_dice.campaign_dice_log` |  | `src/api/client.js` |
| `dice/rigs/<int:pk>` | PUT,DELETE | `views_dice.rig_detail` |  | `src/api/client.js` |
| `checks/mine` | GET | `views_checks.my_checks` |  | `src/api/client.js` |
| `checks/campaign/<str:id_or_slug>` | GET,POST | `views_checks.campaign_checks` |  | `src/api/client.js` |
| `checks/<int:pk>` | DELETE | `views_checks.check_detail` |  | `src/api/client.js` |
| `checks/<int:pk>/respond` | POST | `views_checks.check_respond` |  | `src/api/client.js` |
| `checks/<int:pk>/close` | POST | `views_checks.check_close` |  | `src/api/client.js` |
| `checks/<int:pk>/screen` | POST | `views_checks.check_screen` |  | `src/stage/stage-api.js` |
| `campaigns/invite/<str:code>` | GET | `views_campaigns.campaign_invite_preview` |  | `src/api/client.js` |
| `campaigns/invite/<str:code>/cover` | GET | `views_campaigns.campaign_invite_cover` |  | — |
| `screen/<str:token>` | GET | `views_screen.screen` |  | `src/api/client.js`, `src/stage/stage-api.js` |
| `screen/<str:token>/image/<int:entry_id>` | GET | `views_screen.screen_image` |  | `src/world/fixtures.js` |
| `screen/<str:token>/cover` | GET | `views_screen.screen_cover` |  | — |
| `screen/<str:token>/map` | GET | `views_screen.screen_map` |  | — |
| `screen/<str:token>/stage-image` | GET | `views_screen.screen_stage_image` | **nova** | — |
| `screen/<str:token>/portrait/<int:char_id>` | GET | `views_screen.screen_portrait` | **nova** | — |
| `screen/<str:token>/token/<str:combatant_id>` | GET | `views_screen.screen_token_image` | **nova** | — |
| `combat/campaign/<str:id_or_slug>` | GET | `views_combat.combat_get` |  | `src/api/client.js` |
| `combat/campaign/<str:id_or_slug>/start` | POST | `views_combat.combat_start` |  | `src/api/client.js` |
| `combat/campaign/<str:id_or_slug>/end` | POST | `views_combat.combat_end` |  | `src/api/client.js` |
| `combat/campaign/<str:id_or_slug>/reset` | POST | `views_combat.combat_reset` |  | `src/api/client.js` |
| `combat/campaign/<str:id_or_slug>/combatants` | POST | `views_combat.combat_add_combatant` |  | `src/api/client.js` |
| `combat/campaign/<str:id_or_slug>/combatants/<str:combatant_id>` | PUT,DELETE | `views_combat.combat_combatant` |  | `src/api/client.js` |
| `combat/campaign/<str:id_or_slug>/action` | POST | `views_combat.combat_action` |  | `src/api/client.js`, `src/play/play-api.js` |
| `combat/campaign/<str:id_or_slug>/player-attack` | POST | `views_combat.combat_player_attack` |  | `src/api/client.js` |
| `combat/campaign/<str:id_or_slug>/attack-preview` | POST | `views_combat.combat_attack_preview` |  | `src/play/play-api.js` |
| `combat/campaign/<str:id_or_slug>/save-preview` | POST | `views_combat.combat_save_preview` | **nova** | `src/play/play-api.js` |
| `combat/campaign/<str:id_or_slug>/next-turn` | POST | `views_combat.combat_next_turn` |  | `src/api/client.js` |
| `combat/campaign/<str:id_or_slug>/prev-turn` | POST | `views_combat.combat_prev_turn` | **nova** | `src/api/client.js` |
| `combat/campaign/<str:id_or_slug>/map` | POST | `views_combat.combat_set_map` |  | `src/api/client.js` |
| `combat/campaign/<str:id_or_slug>/encounter` | POST | `views_combat.combat_encounter` | **nova** | `src/api/client.js` |
| `combat/campaign/<str:id_or_slug>/undo` | POST | `views_combat.combat_undo` | **nova** | `src/api/client.js` |
| `combat/campaign/<str:id_or_slug>/map-from` | POST | `views_combat.combat_map_from` | **nova** | `src/api/client.js` |
| `combat/campaign/<str:id_or_slug>/map-image` | GET | `views_combat.combat_map_image` | **nova** | `src/stage/stage-now.js` |
| `combat/campaign/<str:id_or_slug>/token/<str:combatant_id>` | GET | `views_combat.combat_token_image` | **nova** | — |
| `combat/campaign/<str:id_or_slug>/actions/<str:ref>` | GET | `views_combat.combat_actions` | **nova** | `src/api/client.js` |
| `rolls/campaign/<str:id_or_slug>` | POST | `views_combat.roll_create` |  | `src/api/client.js` |
| `rolls/campaign/<str:id_or_slug>/pending` | GET | `views_combat.roll_list_pending` |  | `src/api/client.js` |
| `rolls/campaign/<str:id_or_slug>/recent` | GET | `views_combat.roll_list_recent` |  | `src/api/client.js` |
| `rolls/<int:pk>/resolve` | POST | `views_combat.roll_resolve` |  | `src/api/client.js` |
| `rolls/<int:pk>/cancel` | POST | `views_combat.roll_cancel` |  | `src/api/client.js` |

## 2. Todos os commits desde a base


### 2026-10-26

| Commit | Área | Onde | O que |
|---|---|---|---|
| `fd7d337` | F | campaigns, checks, group | fix(mesa): achados da verificação das partes 1 a 6 |
| `f0891e7` | F | campaigns, player, world | fix(mundo): zoom do mapa com o mouse, contagem do Mundo no Mais e plano × Mesa do jogador |
| `3e60715` | F | Sheet | ficha: deslocamento soma o Movimento sem Armadura do Monge e o Movimento Rápido do Bárbaro |
| `936974d` | F+B | test_sheet_speed, views_combat, views_screen | mesa: Tela e combate mostram o deslocamento que a ficha calculou |

### 2026-10-27

| Commit | Área | Onde | O que |
|---|---|---|---|
| `f64c8d1` | B | combat, test_sheet_speed, views_combat | mesa: Tela e combate só recebem deslocamento inteiro |
| `3b85603` | F | api, campaigns | ficha: grava o deslocamento automático, e o Editar ficha do mestre recalcula |
| `d8e4181` | F | — | ficha: Andarilho do Patrulheiro 2024 soma 10 pés; bônus do medalhão sem quebra no meio |
| `3618b0a` | F+B | progression | regras: texto 2014 do Movimento sem Armadura com escudo e os níveis |
| `3bb239e` | B | campaign_state, test_party_insights, urls | Raio-X: endpoint dos ajustes do grupo e trava do PATCH da campanha |
| `a209eab` | B | campaign_state, screen_card, serializers | mesa(V3): palco da Tela no servidor — frente, fundo, só a imagem, desfazer |
| `b1621f5` | F | play, stage, world | mesa(V3): Jogar › Tela, o 📺 único e a TV pelo palco |
| `dd73dc0` | F | shell, play, api | mesa(V3): "Telão" vira "Tela" em todo o app |
| `74c3626` | F | group | Raio-X: contas do grupo, lacunas, quadros e monstro × grupo |
| `1cbbc1d` | F | group, shell | Grupo › Raio-X: a tela do Raio-X do grupo para o mestre |
| `90177b2` | F | player | mesa(V3): "Revelar e mostrar" não troca o aviso do jogador por uma revelação antiga |
| `b79a2af` | F | stage, world, play | mesa(V3): "Guardar para depois do combate" nunca revela; listas veem a revelação do 📺 |
| `a08e76b` | F | stage, play, shell | mesa(V3): Jogar › Tela sem nada pulando debaixo do dedo e sem mentir sobre a frente |
| `3da02a9` | F | stage | mesa(V3): 📺 Mostrar das listas da Tela com 48 px e motivo escrito no texto vazio |
| `f0d24c0` | B | stage, test_stage, views_adventures | mesa(V3): palco diz a verdade ao mestre e não guarda nome de oculto no resumo |
| `f4a4640` | F | group | Raio-X: toque duplo em "Levar para o plano" não abre o plano |
| `24111dc` | F | group | Raio-X: Ajustar cabe a 320, títulos dos quadros a 12 px, rótulos dos radares ≥ 12 px |
| `06bcaaf` | F | group | Raio-X: magias de espécie e de talento usam o atributo da ficha |
| `6de27d8` | F | group | Raio-X: etiquetas dos truques de dano que faltavam (Explosão Feiticeira e outros) |
| `73cbb63` | B | test_party_insights, urls, views_insights | Raio-X: histórico do Equilíbrio na mesa (testes e quedas por sessão) |
| `80c779f` | F | group | Raio-X: momentos, estilo do jogador e equilíbrio (contas) |
| `8c120dd` | F | group | Raio-X: o melhor da mesa em módulo leve e um de cada tipo à vista |
| `7c4a648` | F | group | Grupo › Raio-X: Momentos, estilo do jogador e Equilíbrio na mesa |
| `2ebbca2` | F | group, prep, campaigns | Ganchos do Raio-X: Pedir teste, Escolher monstro, cartões e Próxima sessão |
| `9939984` | B | adventures_ready, test_pulse, urls | mesa(V4): pulso do mestre no lugar do GET completo e "TV conectada" |
| `77c845d` | B | test_combat_turn, urls, views_combat | mesa(V4): Próximo turno que não pula vez e ↶ Voltar turno |
| `6dd37f9` | F | stage, api, campaigns | mesa(V4): loja da mesa (pulso) e o modelo da barra da mesa |
| `16d46b9` | F | shell, stage, DiceRoller | mesa(V4): barra da mesa, folha Tela ao vivo e janela da Tela no PC |
| `6cd39f7` | F | campaigns, play | mesa(V4): Jogar lê a loja da mesa — faixa do PC, combate e testes sem polling |
| `ae08ab9` | F | checks, group | Pedir teste: a chance do melhor segue o dado escolhido |
| `56efa70` | F | group | Momentos: o estilo do jogador não repete uma sugestão |
| `ff13035` | F | prep, group | Momentos: a cena do "→ Cena" não leva o momento à Tela |
| `e66e2d0` | F | group | Momentos: Desfazer no Dispensar e no Apagar, aviso com 2 sessões e alvos de 48 px |
| `30c972d` | F | group, prep | Próxima sessão e Jogadores: o Raio-X que chega não empurra nada |
| `775a0c0` | B | test_combat_turn, views_combat | mesa(V4): ↶ Voltar turno volta para quem tinha a vez (pelo id) |
| `3eba7dc` | F+B | test_pulse, views_pulse, campaigns | mesa(V4): o Combate não busca de novo o combate que já tem |
| `7b9b080` | F | stage | mesa(V4): faixa do turno do PC presa abaixo das abas das áreas |
| `228ba51` | F | stage, shell, campaigns | mesa(V4): "Sem conexão" sem a barra e o nome de quem age inteiro na barra |
| `254dd1f` | F | campaigns, stage, prep | mesa(V4): janela da Tela fora do mapa do Combate e à esquerda na aventura |
| `549c2cb` | B | image_data, serializers, test_combat | mesa(V9): Tela, combate e campanha sem imagem em base64 |
| `bbfe680` | F | campaigns, shell | Grupo: Pedidos com rota própria e o selo leva direto a eles |
| `69bdd15` | F | group, campaigns, shell | Grupo › Jogadores e Pedidos: cartões de até 260 px e os pedidos na 1ª tela |
| `db3ffd7` | F | campaigns | Crônica começa pela história: nota e recap em folha, filtros de 44 px |
| `65e6bac` | F | screen, api, player | mesa(V9): a Tela em 16:9 com a ordem de iniciativa e a língua da campanha |
| `44220ab` | F | campaigns, group, plans | mesa(V9): fotos, mapa e tokens por URL no app; o mapa parado não redesenha |
| `0caff55` | F | screen | mesa(V9): tarja do turno por cima das tarjas de cinema do recap |
| `346c585` | F | campaigns, group, shell | Selo do Grupo: fora do Grupo segue a campanha e leva aos Pedidos |
| `525fd8c` | F | campaigns, shell | Crônica: erro da nota e do recap dentro da folha; Fechar do recap pergunta |
| `8f92576` | F | group | Menu ⋯ no PC: a linha de ajuda volta embaixo do rótulo |
| `91c5fec` | B | test_screen_payload, test_screen_privacy, views_screen | mesa(V9): /api/screen volta a ter o resumo do combate e da cena no topo |
| `5de5239` | B | fixtures, test_screen_payload, urls | mesa(V9): combate do mestre sem as ações dos stat blocks a cada mudança |
| `4636b29` | F | api, play | mesa(V9): o app pede o combate magro e devolve as ações aos stat blocks |
| `4695592` | F | screen | mesa(V9): a Tela não corta texto, nome, número do monstro nem condição |
| `544b456` | F | campaigns | mesa(V9): o editor da ficha do mestre recalcula a CA ao salvar |
| `3eb7fc5` | B | table_rolls, test_combat, test_privacy_secrets | mesa(V10): rolagens na Tela pelo servidor, em janela e sem se perder |
| `c40a92d` | F | screen | mesa(V10): a TV enfileira as rolagens (dado grande < 10 s e feed no canto) |
| `816e5f5` | F | dice, DiceRoller, api | mesa(V10): 🎲 do mestre com 🔒 Só eu · 📺 Na tela e "Para quê?" |
| `637f83f` | F | play, campaigns | mesa(V10): ataques e salvaguardas de monstro vão à Tela sem o bônus |
| `ca7b342` | F | play, player, stage | mesa(V10): regras das rolagens em Jogar › Tela, filtro em Testes e a Mesa do jogador |
| `4c04019` | B | test_screen_rolls, views_checks, views_combat | mesa(V10): rolagens privadas fora do Diário e da TV, e a salvaguarda do PJ pela ficha |
| `71d91db` | F | play | mesa(V10): salvaguarda em área usa a salvaguarda da ficha de cada PJ |
| `c84d05c` | F | dice, DiceRoller, api | mesa(V10): 🎲 do mestre não confunde servidor lento com sem rede e deixa os dados à vista |
| `7471dfd` | F | play, stage | mesa(V10): Jogar › Tela sem pulo nas Últimas 5 e sem a busca de 60 s |
| `5733df2` | F | screen | mesa(V10): feed da TV nunca corta o resultado e o resumo da salvaguarda cabe inteiro |
| `48ddf1c` | B | stage, table_rolls, test_sheet_rolls | mesa(V15): rolagens da ficha entram na fila da Tela pelo servidor |
| `125bd28` | F | dice, sheet, DiceRoller | mesa(V15): a ficha manda a rolagem à Tela sem esperar, com 🔒 Só eu |
| `3c3df4a` | F | play, screen | mesa(V15): o mestre liga e desliga as rolagens das fichas em Jogar › Tela |
| `b5d5a2f` | F+B | play, test_pulse, views_pulse | mesa(V15): rolagem da ficha não faz o mestre buscar Testes de novo |
| `f74d828` | F+B | test_sheet_rolls, views_dice, dice | mesa(V15): ataque e dano com a rede variando vão os dois à Tela |
| `7d9d826` | F | DiceRoller, Sheet, dice | mesa(V15): com as fichas fora da Tela, a ficha não manda nada |
| `a75cc84` | F | play | mesa(V15): "Nenhuma" não promete uma TV sem as rolagens das fichas |
| `b1e3835` | F | group | Grupo: os pedidos do mestre seguem o pulso da mesa, sem o polling de 6 s |
| `3ae9b98` | F | campaigns | Crônica: o comentário do aviso também diz "Tela" |
| `0a7b7fe` | F | group | Raio-X: magia "Pessoal" com área longa conta à distância também em 2024 |
| `9ae2bd8` | F | group | Raio-X: as Lacunas seguem a gravidade e o Importante, também recolhidas |
| `2683508` | F | group | Raio-X: a ideia levada ao plano não põe a análise no nome da cena |
| `11b4808` | F | group | Raio-X: Restaurar padrão seguido de outro toque no mesmo mapa não se perde |
| `77cc99d` | F+B | group, test_party_insights, views_insights | Raio-X: quem chega à mesa entra sozinho, e quem saiu não trava o teto |
| `d07c85a` | F | campaigns, play, stage | Mesa: as folhas abertas em Jogar param acima da barra da mesa |
| `4575a43` | F | stage, play | Barra da mesa: sai do "Enviando…" quando o envio termina, deu certo ou não |
| `19022dd` | F | campaigns, stage | Crônica: o aviso do recap segue a regra da Tela, não o screenCard antigo |
| `88cc5a5` | F | play, stage | Jogar › Tela: o selo da TV conectada debaixo da prévia |
| `e28b7f9` | F+B | stage, campaign_state, test_combat | Tela: a miniatura mostra o mapa do combate, como a TV |
| `ccfd1a8` | F | player, screen | TV: quem chegou a 0 PV é "Derrotado", não "Caído" (a condição) |
| `c62b360` | F | stage, play, campaigns | Tela: campanha encerrada fica só para ver (sem barra, sem Próximo, sem 423) |
| `3cd9120` | F+B | test_sheet_rolls, views_characters, DiceRoller | Ficha: fora da sessão ao vivo a rolagem não vai ao servidor |
| `7499103` | F+B | test_pulse, views_pulse, campaigns | Pulso: 304 menor e o GET de segurança no lugar do pulso daquele tick |
| `82914d1` | F | group, shell | Grupo › Jogadores: com PV temporário, o PV máximo não some a 320 px |
| `6fcbe64` | F | stage, api | mesa: Tela e Raio-X funcionam com o servidor ainda não atualizado |
| `fc57ef6` | B | combat, diary, image_data | Combate: montar numa chamada, opId nas ações de PV e Desfazer por foto |
| `9db3600` | F | combat, checks, play | Combate: lógica do teclado de dano, do "mais comum" e de montar o combate |
| `d24c629` | F | play, campaigns, api | Combate: chamadas novas com a ponte para o servidor antigo |
| `a28147a` | F | campaigns, play, checks | Jogar › Combate rápido: Começar o combate, teclado de dano e marcas da vez |
| `ce0db34` | B | adventures_ready, test_ready_adventures, test_world | Plano da sessão: de qual sessão é, _rev, cenas juntadas por id e o exemplo preenche o plano |
| `47f6387` | F | prep, ready, shell | Preparar › Plano: o Plano da Sessão N em 5 passos, as 3 portas e o "O que fazer agora" |
| `bc57508` | F | shell, campaigns, play | Casca: campanha nova abre no Plano; Preparar = Plano · Aventuras · Itens |
| `de5c1d1` | F+B | test_combat_encounter, views_combat, campaigns | Combate: o ▶ Iniciar da barra usa as respostas da iniciativa |
| `c4a93de` | F | prep | Plano: "＋ Pessoa ou lugar" na mesma fileira das pílulas de À mão na sessão toda |
| `bfca948` | B | adventures_ready, test_ready_adventures, test_world | Plano: aventura pronta e exemplo preenchem plano só com pistas e mantêm a sessão escolhida |
| `0fc8748` | F | prep, shell | Plano: o cartão vê o combate das salas sem abrir ③ e usa o número certo num plano já jogado |
| `ae658ff` | B | test_combat_encounter, test_combat_undo, views_adventures | Combate: iniciativa 0, teste de iniciativa preso e Desfazer da Forma Selvagem |
| `39d00f1` | F | prep | Plano: com um passo aberto a página cabe em ~2 telas no celular |
| `0580747` | F | play, campaigns | Teclado de dano: o opId fica o mesmo até dar certo ("Talvez não enviado") |
| `8967934` | F | campaigns, combat, play | Jogar › Combate: respostas da iniciativa com o combate andando, linha de 56 px e Cena |
| `abebb22` | F | campaigns, prep, shell | Casca: selo "!" em Preparar com o plano em branco fora da sessão ao vivo |
| `404afb1` | F+B | test_adventures, test_world, urls | Aventuras: uma sala por vez (GET/PATCH …/node/:id e salas leves) e monstros seus na cena |
| `118177a` | B | test_pulse, views_pulse | Pulso do jogador: a projeção dele no /pulse (vez no combate, testes e pedidos dele) |
| `d6a520c` | F | player, campaigns, checks | Mesa do jogador: o pulso no lugar dos GET de 2,5 s e 3 s, e a faixa do combate |
| `7e10fd9` | F | Sheet, campaigns | Ficha: o painel de combate sobe para o topo na vez do jogador |
| `dff06f2` | F | prep | Folha da Cena: lógica pura (scene-model.js) e as salas leves no prep-api |
| `3acd6c2` | F | shell | MesaSheet: painel de 520 px à direita no PC (side) e um pedaço no cabeçalho (aside) |
| `77d87ae` | F | prep | Preparar › Plano: a folha da Cena (um editor só) com a paleta "Pôr nesta cena" |
| `7717b96` | F | prep | Aventuras: a sala abre na folha da Cena em modo sala |
| `7130f63` | F | world | Mundo: "Aparece em" do editor do cartão lista as cenas do plano |
| `1f39ab8` | F | prep | Folha da Cena: o ND em cada monstro, "Combate desta sala" e linhas de 64 px |
| `04d3cab` | F | Sheet, campaigns, player | Ficha: o painel de combate espera o dedo e só sobe para aparecer |
| `a6cfed7` | F | player | Mesa: na vez do jogador, "depois: <nome>" quebra em 2 linhas em vez de sumir |
| `4618fc3` | F+B | prep, test_world, world_rules | Cena ligada: "sem imagem" fica no plano e a CD livre de 1 a 40 (lógica e servidor) |
| `8a65cd8` | F | prep | Folha da Cena: CD livre, tirar a imagem da cena ligada, a sala que chega devagar, Desfazer do ★ e imagem recusada |
| `585ae77` | F | prep | Plano: "Aparece em" do cartão aberto do Plano lista as salas, como no Mundo |
| `5e761ea` | F | prep, shell, stage | PC: o painel da Cena não cobre a casca nem a janela da Tela |
| `2bc209f` | F | prep | Folha da Cena: a imagem da sala volta depois do Desfazer e o chip tocado com a sala chegando rola até o bloco |
| `1f890c4` | B | campaign_state, stage, test_stage | Jogar › Agora: ▶ Começar esta cena no servidor (POST /stage/scene) e o sceneId só do mestre |
| `385234d` | F | shell | Dados preparados: as contas dos cartões por jogador em prepared-dice.js |
| `576813c` | F | shell | Ajustes: folha da mesa com as 6 seções à vista e Dados preparados por jogador |
| `0945e35` | F | campaigns, plans, shell | Nova campanha, entrada e limite: folhas da mesa que cabem no celular |
| `9b06a36` | F | play, shell | Jogar › Agora: lógica pura (regras J1–J6, cena agora, painel do momento, selo da sessão) |

### 2026-10-28

| Commit | Área | Onde | O que |
|---|---|---|---|
| `406b568` | B | stage, test_stage | Tela: 📺 Mostrar uma cena do plano usa o nome da cena e o texto e a imagem da sala |
| `fa6fae1` | F | play, stage | Jogar › Agora: ações da cena agora (começar, desfazer, feita) e useRevData |
| `72ab524` | F | checks, play, shell | Jogar › Testes: selo só da sessão atual ("1·2"), De sessões passadas e 📺 ao pedir |
| `ca7b732` | F | stage | Mostrar na Tela: as imagens e a cena da cena agora primeiro |
| `2358df4` | F | play, shell, campaigns | Jogar › Agora guiada: cena agora, painel do momento de 120 px e folha Começar a sessão |
| `1b5f7ed` | F | shell, campaigns | Capa: ▶ Começar a Sessão N abre a folha Começar e o relógio da sessão no Ao vivo |
| `7d210d6` | F | prep | Aventuras: abre Na mesa durante a sessão, ＋ Sala em Editar e Apagar só no ⋯ |
| `5ac9789` | F | campaigns | Nova campanha: toque duplo no Próximo não cria a campanha |
| `430b6b5` | F | shell | Folha da mesa: o Esc fecha só a folha de cima |
| `2fc6a19` | F | shell | Ajustes › Identidade: nome com espaço no fim fica salvo |
| `c7aec6b` | B | test_api, views_dice | Dados preparados: fila nova com `before` entra antes de outra (servidor) |
| `ca0a578` | F | shell | Dados preparados: uma fila por dado, ⚡ fura a fila e setas que funcionam |
| `7e9ed35` | F | world | Mundo: as contas do Ordenar ↑ ↓, do selo curto, das dicas e do Mundo vivo recolhido |
| `df37903` | F | world | Mundo vivo numa linha recolhida no celular; o toque na estrela espia o nome |
| `636ae03` | F | world | Editor do cartão: topo e rodapé presos, × de 44, dicas escritas e só leitura na encerrada |
| `c2ac68e` | F | world | Atlas no celular: barra presa, linhas de até 96 px com 👁 e 📺, "Quem vê:" fixo e Ordenar |
| `5961e0b` | B | stage, test_stage | Começar esta cena: a Crônica registra o nome da cena, não o da sala |
| `92a4529` | F | play | Jogar › Testes aberto direto: "De sessões passadas" com 44 px e a linha da sessão com cor |
| `ddc437f` | F | shell, play | Agora: cartões J da sessão ao vivo só ao vivo, a TV do pulso e o começo forte inteiro no J4 |
| `196b7c3` | F | play | Agora: servidor antigo marca a cena de antes feita, "Outra…" com o resumo entra no plano e o ensaio sai ao começar |
| `c42bc83` | F | play | Agora: o ⚡ Começo forte inteiro na Cena agora da 1ª cena da sessão e nas Anotações do plano |
| `716fb34` | F | play | Folha da cena: "Guardar para depois do combate" e a caixa "Registrar na Crônica" da sala |
| `391e657` | B | diary, test_diary, test_session_end | Encerrar a sessão no servidor: uma chamada arruma a mesa, grava o fim e arquiva o plano |
| `21ea3ba` | F | campaigns, play, shell | Encerrar e Resumo: lógica pura (folha Encerrar, rascunho rico e o J2 pelo endedAt) |
| `5cb40b5` | F | world | Ordenar: a resposta de um toque não desfaz o seguinte; 2 PATCH com filtro; conflito desfaz a troca e avisa à vista |
| `5d81c6c` | F | world, api, prep | "Só o nome" no selo, no filtro, no interruptor e nos avisos (saiu "Conhecido de nome") |
| `b62e228` | F | world | Atlas no celular: meta na largura toda, motivo do 📺 sempre inteiro e "sem frase ainda" |
| `24d0f27` | F | world | Campo que cresce: mede de novo quando a largura muda e rola de reserva |
| `944addb` | F | world | Céu do Mundo vivo: nomes das estrelas e o "N" com 12,5 px na tela |
| `647f205` | B | test_session_end, views_diary, views_world | Encerrar: as cenas já feitas ao começar ficam fora das jogadas e o texto lido sai da capa |
| `446a4eb` | F | play, campaigns, stage | Resumo da sessão: um editor só, o salvo primeiro e o rascunho rico |
| `2006940` | F | play, api, campaigns | Encerrar a sessão: folha com a lista, uma chamada e o resumo já aberto |
| `35b4843` | F | campaigns, prep, group | Crônica e Plano: Ver o plano desta sessão com Restaurar e o plano novo com arquivo |
| `e424bce` | F | play, prep | Plano: "Recomeçar o plano da Sessão N" quando o plano já é o da sessão que vem |
| `1e99179` | F | world | Mapa do Mundo: rótulos dos marcadores só onde cabem (map-labels.js) |
| `5192e15` | F | world | Mapa do mestre: folha do marcador com ele à vista, painel ao lado no PC e página que rola |
| `9b07234` | F | world | Linha do tempo: ↑ ↓ de 50 × 48 com o nome, selo com texto e só leitura na encerrada |
| `3cdbf79` | F | player | Mundo do jogador: mapa com pinça, ＋ − ⤢ e arrastar; alvos de 44 e textos de 12 |
| `d05aad7` | B | stage, test_session_end, test_stage | Encerrar no servidor: momento de cena não jogada fica em aberto, Restaurar não apaga o plano de agora |
| `77af798` | F | campaigns | Rascunho do resumo: CD secreta só com quantos responderam e a imagem oculta como "uma imagem" |
| `82f1fe9` | F | play, shell | Agora: depois de encerrar, o J2 vem primeiro, sem a faixa de ensaio e sem virar J1 |
| `c517372` | F | play, campaigns | Folha Encerrar: o que cada momento marca escrito, Levar sem esperar o plano e os momentos no servidor antigo |
| `9dcb7a0` | F | prep, campaigns, shell | Linguagem: Combate e Na mesa no lugar de Encontro e Conduzir; o ui-words cobre a §9 |
| `bba6f39` | F | shell, campaigns, play | Guia do mestre e "O que mudou": 5 cartões com "Me leve lá" e o aviso dos nomes novos |
| `0caa163` | F | shell, campaigns | Busca pelo nome antigo, Mundo em Cartões · Mapas · Tempo e o próximo passo no cartão da campanha |
| `e60ea79` | F | world, play | Folha "Quem vê" única no Mundo, na Agora e em "Nesta cena" |
| `e410b5a` | F | world | Editor do cartão só leitura na campanha encerrada (A13) |
| `213dec1` | F | world | Cartões: "⋯ Mover" para cima/baixo, sem arrastar |
| `1717197` | F | world | Céu do Mundo vivo: o toque na estrela mostra o nome sem abrir o cartão |
| `cb6acd4` | F | prep | Aventuras: a alça ● acesa na sala marcada (44 px no toque) e o tesouro escrito na lista |
| `da5a453` | F | ConfirmDialog, group, prep | Confirmações numa aparência só: Preparar, Itens e Grupo usam o confirmDialog |
| `10316a6` | F | world | ⋯ Mover: o motivo do botão desligado embaixo dos dois, numa linha fixa |
| `f70861f` | F | player, world | Mundo do jogador: ＋ − ⤢ à esquerda, o nome do marcador abre e textos de 12 px |
| `9b2728e` | F | world | Mapa do mestre: clicar não rola a página no PC; nome clicável; gravação na folha |
| `8a320e1` | F | world | Linha do tempo: toque duplo nas setas move uma vez; "Fechar" do seletor com 44 |
| `e35cd2a` | F | shell | Guia do mestre e "O que mudou" no PC: faixa do turno e janela da Tela |
| `9128fce` | F | shell | Cartão da campanha: sem o resumo do plano no aparelho, linha neutra |
| `006ca6d` | F | world | ⋯ Mover: o conflito de versão avisa na folha em vez de sumir |
| `7dd43d4` | F | world | Cartões do Mundo no celular: quem vê escrito no selo e Quem vê/Mostrar com 48 px |
| `0a6a76f` | F | play, campaigns, checks | Agora e Combate: "Começar o combate" da cena usa a folha do combate rápido |
| `50dbb75` | F | play | Cena agora: o combate da cena com o nome do catálogo, como na folha e no Combate |
| `ef7c11d` | F | prep, campaigns, shell | Plano: servidor antigo avisa na cena, Levar atualiza a sala e o ⋯ ganha os planos arquivados |
| `8a90dc2` | F | prep, world | Aventuras com alvos de 44/48 px e o mapa inteiro com a sala aberta; Atlas em até 5 telas |
| `965e81c` | B | test_combat_undo, views_combat | Combate: dano e cura não apagam as condições da ficha |
| `eac96de` | F | play, campaigns, combat | Combate: iniciativa na ordem no servidor antigo e montar com menos toques |
| `31bd77a` | F+B | play, test_session_end, world_rules | Resumo da sessão: a cena interrompida continua, sem o teste de iniciativa, e certo no servidor antigo |
| `57ce686` | F | stage, play | Mostrar na Tela: "Da cena agora" é a cena do plano; a Agora sem o combate encerrado |
| `a7de175` | F | prep | Aventuras no PC: ＋ e － do mapa com 44 px e o "▶ AQUI" da sala com 12 px |

### 2026-11-04

| Commit | Área | Onde | O que |
|---|---|---|---|
| `5255810` | B | test_world, world_rules | Plano: a cena solta guarda o tesouro (moedas e itens) no plano |
| `6cc29ba` | F | prep, group, api | Plano: momentos em frase de mestre, variados e com uma conta só; folha da cena com Teste confirmado e Tesouro |
| `84997a2` | B | stage, test_combat_undo, test_stage | Servidor: começar o combate leva a TV a ele e o ↶ do combate fica à mão |
| `aff8dab` | F | play, shell, campaigns | Jogar: ensaio de verdade, começar por qualquer cena e o Plano depois de encerrar |
| `a6c6d34` | F | campaigns, play, stage | Começar o combate leva a TV a ele; o fim do combate oferece XP e volta ao guardado |
| `57941aa` | F | campaigns, play, stage | Combate: ↶ Voltar turno e ↶ Desfazer que não somem em 6 s |
| `51b9a66` | F | play, shell | Agora em combate: o botão dourado leva ao combate; "próxima cena", não "primeira" |
| `36b9c0e` | F | screen, play, player | PJ a 0 PV: "Caído" na TV (sem riscar) e o perigo primeiro no painel do momento |
| `3282724` | F | checks, play, prep | Pedir teste: quem está a 0 PV fica de fora do "Todos" e as perícias aparecem sem rolar |
| `ce3f6bd` | F | campaigns, stage | Celular e PC no combate: tipos de dano dentro da tela e Próximo na janela da Tela |
| `8677444` | F+B | test_combat_undo, views_combat, play | Voltar turno só quando o servidor sabe voltar (canPrev no combate do mestre) |
| `d288a5d` | F | play, campaigns, stage | PC: o ↶ Voltar turno da faixa só aparece quando o servidor sabe voltar |
| `6d3d1ef` | F | play | Agora: "Ficou da Sessão N:" numa linha acima dos contadores |
| `848628c` | F | prep | Folha da cena: tocar de novo no 🎯 Teste não apaga o rascunho |
| `a966a5e` | F | shell | Cabeçalho: o jogador e a campanha encerrada voltam a ver a cena da última sessão |
| `2f2a783` | F | group | Raio-X em inglês: "an Arcana check", "an Insight check" |
| `ed82df8` | F | shell | Agora: o J2 diz quantas cenas o plano da próxima sessão já tem, não "está pronto" |
| `5686992` | F+B | group, test_party_insights, views_insights | Raio-X: o momento numa cena que saiu do plano conta como "sem cena ainda" |
| `44e01c8` | F+B | group, prep, test_party_insights | Raio-X: "Levar para o plano" leva a ideia inteira e não duplica; sem "Ivan" na tela |
| `0e7ebd4` | F | group | Raio-X › Contra quem?: vulnerabilidades do SRD 5.2.1 e a dificuldade contra o grupo |
| `babc255` | F+B | group, test_party_insights, world_rules | Raio-X: o padrão pesa a ficha (10% tabela / 90% ficha) e as ameaças são do nível do grupo |
| `9603e16` | F | group | Raio-X: radares de perícias com o nome de cada eixo e escala que não espreme |
| `ff946cb` | B | test_combat_undo, views_combat | Servidor: o ↶ Desfazer só nas ações que ele ainda desfaz |
| `50a6e87` | F | campaigns, play | Combate: a linha do ↶ presa no topo e o aviso diz o que voltou |
| `13bb534` | F | checks | Pedir teste no celular: perícias à vista a 360 e 375 |
| `64ea91b` | F | stage | Tablet: o ↶ Voltar turno da faixa longe do Próximo |
| `6237512` | F | stage | Janela da Tela: o Próximo não anuncia a tecla N |
| `b41e3f7` | F | screen, player | TV: PJ a 0 PV é "Morrendo" ("Estável" depois de 3 sucessos) |
| `9d89030` | F | group | Raio-X: página curta — índice preso e as seções de analista recolhidas com resumo |
| `c84411a` | F | group | Raio-X: o histórico do Equilíbrio continua sob demanda com a página curta |
| `7bc4281` | F | screen, DiceRoller, dice | TV: rolagem do jogador em cartão grande e Últimas rolagens; a ficha manda depois de o dado parar |
| `5f1d414` | F | stage, screen, campaigns | TV: imagem grande e inteira, cena sem imagem num painel e nomes do mapa legíveis |
| `790fe06` | F | stage, campaigns | Miniatura de verdade: a imagem da TV, a última rolagem, miniplayer no celular e janela lembrada |
| `a58ea65` | F+B | stage, table_rolls, test_sheet_rolls | Rolagens na Tela: a lista do que vai à TV com a frase certa; fichas com Só 20 e 1; aviso embaixo |
| `40fde06` | F | shell, campaigns | Primeiros passos: a TV conectada marca "Abra a Tela na TV"; ao vivo, o cartão vira uma linha |
| `482c727` | F | play, player, screen | Acabamento da Tela: nome inteiro nas Últimas rolagens, linha dos Primeiros passos a 320 e a rolagem na prévia |
| `b88e989` | F | group, prep | Raio-X: a cena que vem de uma ideia ganha um nome de história, sem personagem nem lacuna |
| `840b1b6` | F | group | Raio-X › Momentos no celular: aceitar ou escrever não troca o personagem à vista |
| `734f6db` | F | group | Raio-X › Ajustar: no servidor de antes, sem o passo 0,1 que ele grava como "Só a ficha" |
| `3139f83` | F | screen | TV: Últimas rolagens sem cobrir texto, ordem nem tokens; o PV do grupo volta no cartão com imagem |
| `ffbee00` | F+B | test_sheet_rolls, views_dice, DiceRoller | Ficha: o mestre volta de "Só 20 e 1" para "Todas" e a ficha aberta passa a mandar tudo |
| `81b3af3` | F | stage, play | Celular: miniplayer em cima com folga no topo; a 320 px o aviso "Na tela" mostra o nome |

### 2026-11-05

| Commit | Área | Onde | O que |
|---|---|---|---|
| `6b799f9` | F | prep | Plano: encerrar a sessão com o Plano aberto lê o plano novo e não regrava o velho |
| `1af11e5` | F | campaigns | Fim do combate: com monstro de pé, o XP já vem com o dos derrotados |
| `f2151f2` | F | group | Raio-X: as Ameaças não citam criaturas boas (Águia Gigante, Sprite) |
| `2f4c951` | F | group | Raio-X: "Abrir o plano ›" depois de Levar para o plano abre a cena criada |
| `306fa27` | F | stage | Mostrar › Imagens: quem está na cena e na sala ligada aparece uma vez só |
| `07f4400` | F+B | stage, campaigns, test_pulse | Combate do mestre: PJ a 0 PV aparece "Morrendo · ✓1 ✗2", sem † nem riscado |
| `532aee9` | F | stage, play | Celular: o aviso longo da Tela aparece inteiro e "Guardar para depois" não diz "Na tela" |
| `70f3301` | F | screen | TV: as 5 Últimas rolagens também no combate cheio e na faixa de uma linha |
| `7180f89` | F | checks | Pedir teste a 320×568: as perícias aparecem sem rolar a folha |

### 2026-11-06

| Commit | Área | Onde | O que |
|---|---|---|---|
| `90152bb` | F | Sheet, sheet | feat(belt): 3D gold medal PB hexad, 3D spherical studs for ability scores, and hover fix |
| `43a06fa` | F | Sheet, sheet | feat(belt): consolidated unified bonus sum on dice silhouette, dynamic 2d20 stance label, and removal of peripheral crest/foot labels |
| `2bb1ca5` | F | Sheet, sheet | feat(belt): zero-tangent spacing, neon bound formula color, universal slot binding, and hold-to-roll gesture |

### 2026-11-07

| Commit | Área | Onde | O que |
|---|---|---|---|
| `4da31eb` | F | dice, DiceRoller, Sheet | feat(belt): drag-to-bind with visual trailing path, advantage roll-up animation, and drop-lowest mechanical fix |
| `aa2d029` | docs | — | docs: update spec with drag-to-bind trailing path, advantage roll-up, and drop-lowest fix |
| `a431437` | F | dice, DiceRoller, Sheet | feat(dice): clean minimalist roll outcome, art deco crit frame, satellite unpicked die, and robust slot binding |
| `267132e` | F | Sheet | fix(belt): restore fh-belt-hex-wrap class and uppercase abbreviations on attribute hexads |
| `2090f36` | F | Sheet, dice, sheet | feat(belt): hold-to-roll gesture, contoured drag guide, non-intersecting satellite die, and oscillating sheen |
| `7d68155` | F | dice, Sheet, sheet | feat(dice): geometric flower multi-roll layout, 50% scale edge-docked satellite die, and gapless knob contour |
| `842abb5` | F | dice | feat(dice): authentic geometric tessellation layout engine for D4, D6, D8, D10, D12, D20 |
| `8427842` | F | dice | feat(dice): seamless geometric block tessellations with facet parallelism for all dice shapes |
| `b06a16a` | F | dice | fix(dice): calibrate block tessellations to exact SVG polygon bounds and 180deg inner pentagon facets |
| `be374d3` | F | dice, DiceRoller | feat(dice): enforce non-warped regular polygons, symmetric axis gutters, and unified golden/adv/dis colors |
| `051662f` | F | dice, DiceRoller | feat(dice): implement juicy 2-phase roll-up to 1.5s with snap, shake, and elastic bonus/penalty pump |
| `3cb8b3e` | F | dice | feat(dice): implement anticipation roll-up with zero initial wobble, increasing shake frequency/strength, motion blur, and final punch reveal |
| `725968a` | F | dice | feat(dice): add follow-through and overlapping action falloff ripple on roll reveal |
| `f118bf9` | F | dice | feat(dice): synchronize roll-off peak, punch, number reveal, and ripple at 750ms with 50% speed-up |
| `e3e97ec` | F | dice | feat(dice): add randomized faster neighboring dice catch-up roll-up and single powerful glowing ripple |
| `627563d` | F | dice, DiceRoller | feat(dice): add smooth 0.5s fade-in for the entire roll-up interface and version architecture docs |
| `1972a98` | F | dice, Sheet, sheet | feat(dice): add 20-dice tessellations, radially aligned pentagon rosette, and hood-triggered ability drag with live-locked contour |
| `1f7d18a` | F | dice | feat(dice): calibrate zero-collision tessellation geometry with SAT verification across all dice types (N=2..20) |
| `ce68ab2` | F | Sheet, sheet | feat(belt): expand dice belt mode dimensions by 25% for screen utilization |
| `b1c2691` | F | dice, DiceRoller, Sheet | feat(sheet): decouple stats into 4 scopes, add mobile swipe navigation, resistance save vignette, and red critical failure |
| `e16ff2b` | F | dice, DiceRoller, Sheet | feat(sheet): promote stats scopes to top-bar tabs with swipe nav, save vignette ripple pulse, and half-roll disclosure |
| `d4731ce` | F | DiceRoller, Sheet, dice | feat(sheet): align canonical 10-tab sequence, encapsulate header actions under alignment badge, and add full-screen saving throw pulse |
| `2259e12` | F | Sheet | fix(sheet): restore hideBrokenImg and eliminate duplicate action bar |
| `75c7ccf` | F | dice, sheet, DiceRoller | feat(sheet): hero sub-header encapsulation, ability check toast banner, progression scope gating, roll-up sparks, and 4-row categorized skills with passive/active scores |
| `23ce21e` | F | dice, DiceRoller, Sheet | feat(dice): universal inline dice notation recognition, reactive dice tokens, and global tap-to-roll architecture |
| `9839db7` | F | Creator, DiceRoller, Shared | feat(sheet): foldable 4-action skills grid, tools consolidation, rollup checkered removal, and configurable banner framing |
| `739b930` | F | dice, sheet, Sheet | feat(sheet): fix features tab crash, vertical battle action skills, shorthand score layout, and discrete half-roll |
| `1af4810` | F | dice | fix(dice): eliminate half text label, anchor calculated half to bottom via portal, and prevent dice overlap |
| `23311ad` | F | campaigns, combat | feat(combat): auto-magic monster statblock ingestion via direct resource links (ADR-0022) |
| `6f87d31` | F | campaigns, combat | feat(combat): 1:1 D&D 5e monster statblock fidelity and comprehensive ingestion architecture (ADR-0023) |

### 2026-11-08

| Commit | Área | Onde | O que |
|---|---|---|---|
| `a1c5eb0` | F | dice, combat, DiceRoller | feat(combat): advanced roll parsing, universal web ingestion & dnd 2024 statblock layout |
| `55c333d` | F+B | campaigns, urls, views_proxy | feat(monsters): remediate browser CORS for DandWiki & add dual-tier proxy with 1:1 wikitext fidelity (v1.0.14) |
| `55a6048` | F | campaigns, combat | feat(monsters): universal multi-tier CORS proxy cascade & arbitrary link/plaintext ingestion (v1.0.15) |
| `646df41` | F | campaigns | feat(proxy): server-side challenge bypass & dual-tier fallback reinforcement |
| `7a3511a` | F | dice, combat | feat(combat): action-grouped skills, 3-state swipe-roll engine, nat 20 flash & multi-assignment analysis (v1.0.16) |
| `eaca81a` | F | dice, campaigns | fix(dice): resolve roll screen blackout, isolate overlay stacking & auto-decode base64 proxy data (v1.0.17) |
| `2420a7d` | F | dice, combat, campaigns | feat(combat): universal advantage engine, keen senses auto-adv, action header rolls, vignette blackout & staggered proxy race (v1.0.18) |

### 2026-11-09

| Commit | Área | Onde | O que |
|---|---|---|---|
| `4efccb4` | F+B | views_campaigns, views_characters, DiceRoller | feat(sheet): top HUD roll banners, N:N multi-campaign assignment, skills & tools monster parity, and hero header badge cluster (v1.0.19) |
| `5f5a8bb` | F+B | sheet, migrations, models | feat(campaigns): N characters per user in same campaign, DM NPC setting, campaign seal medal, and skills scoping (v1.0.20) |
| `5a2a991` | F+B | sheet, serializers, views_campaigns | feat(campaigns): multi-character campaign seats for DMs and players, inspiration seal cluster, partly collapsed skills, and corner actions (v1.0.21) |
| `b1d3978` | F+B | sheet, serializers, views_campaigns | feat(campaigns): fix multi-character link invalid input, npc party holster & world sync, indented skills accordion, single-row hero footer, and unified spells hud with golden subclass spells (v1.0.22) |
| `a2ce1d0` | F+B | serializers, views_campaigns, world_rules | feat(campaigns): multi-char table seats, holster npc world sync, skills accordion styling, hero layout proximity, global rest buttons, and unified spell hud (v1.0.23) |
| `b83c634` | F+B | test_multi_char_seats, views_campaigns, Sheet | fix(campaigns): npc world sync crash on missing className, multi-char seat regression test, hero rest corner & even padding, slot gem rows on spell levels, and multiclass shared casting hud (v1.0.24) |
| `234eefe` | F | Sheet, SheetTabs, sheet | feat(sheet): hero footer with rest left and icon tools right, compact slot matrix with long/short rest pact columns, and single spellcasting panel with all-spells tab (v1.0.25) |
| `ca4b9f1` | F+B | sheet, spells, test_rest_pact | feat(sheet): dense folded spell rows with save/attack badges, full srd text on unfold, 9-section slot slider with upcast scaling, species grants for 40+ supplement races, multiclass pact short rest on server, and hero tools reorder (v1.0.26) |
| `858730f` | F | SheetTabs, progression, sheet | feat(sheet): resources grouped by rest cadence and client-side pact slot refund on short rest (v1.0.27) |
| `c08062c` | F | sheet, world, Sheet | feat(campaigns): dm sheets as world npc cards with sheet reference via world api, hero three-row subtitle with subclass fold, and site-wide zebra rows (v1.0.28) |
| `346e137` | F | dice, DiceRoller, Sheet | feat(dice): multi-roll row groups with ability/pb bindings, per-row advantage, drag-to-tray simultaneous rolls and crit-doubled damage dice (v1.0.29) |
| `4b90b64` | F | dice, DiceRoller | feat(dice): badge-array multi-roll with drag/tap shortcut bar, swipe add/subtract, slot-machine lock-in reels, crit damage respin and full-screen gesture lock (v1.0.30) |
| `4679abb` | F | dice | feat(dice): color-coded die silhouettes and ability icons, badge coupling groups, row lock with temporary badges, and in-badge merged results (v1.0.31) |
| `dff164c` | F | dice | feat(dice): sheet-based default attack rows, pre-roll static merge, row swipe advantage glow, fit-to-screen scaling and roll-up style reels (v1.0.32) |
| `fe86e22` | F | dice | feat(dice): roll focus mode hiding idle rows and chrome with enlarged dice, and d20 swipe advantage with green/gold/red states (v1.0.33) |
| `6b4c569` | F | dice | feat(dice): frameless roll focus with label-free rows, adv/dis background only, dice-only fit scaling and roll start after layout settles (v1.0.34) |
| `87a04fd` | F | dice | fix(dice): keep rolling rows horizontal and evenly spaced, and sync multi-roll timings 1:1 with the main roll-up (v1.0.35) |
| `86fe77b` | F | dice | feat(dice): multi-roll uses the main DieShape roll-up (same shake, punch and ripple), feathered adv/dis light bands with directional damped noise, and d20-coupled dice excluded from crit doubling (v1.0.36) |
| `dae894d` | F | dice | fix(dice): roll multi-roll dice in place without the screen-wide throw path, contain the tone halo to each die, and settle into frameless merged totals (v1.0.37) |
| `718410b` | F | dice | feat(dice): multi-roll dice run the main roller's hero roll-up (shake, glow rise, sparks, flash and ripple) with a focal vignette, staggered starts and per-die durations; adv/dis bands become thin glowing beams; drop end-of-roll role icons (v1.0.38) |
| `23ada3a` | F | dice | perf(dice): smooth multi-roll animation — drop the per-frame drop-shadow re-raster on ripple rings and dice, drive the focal vignette as a composited element instead of body custom properties, and freeze row zoom while dice roll (v1.0.39) |
| `f7f1958` | F | dice | feat(dice): multi-roll rows drop the advantage label and badge icons, Roll moves left under the row selectors, and dice coupled to the d20 roll stacked beneath it and merge into its total (v1.0.40) |
| `4ce3895` | F | dice | feat(dice): multi-roll palette shows die silhouettes only, ordered d100 to d4; row selectors sit left of the lock on one axis with a golden guide line down to a round icon-only Roll button (v1.0.41) |
| `05e9e3c` | F | Sheet, sheet | feat(belt): dice belt puts STR and DEX over two central d20s with PB on by default, swaps DEX/CON and WIS/CHA, and replaces the PB hexad with a fourth die plus per-die PB wedges that trace a glowing contour onto the hexad below (v1.0.42) |
| `7a50aa4` | F | Sheet, sheet | fix(belt): PB wedges fill the exact gap between the top vertices of STR\|CON and CON\|DEX, edges flush with both hexads (v1.0.43) |
| `e256924` | F | Sheet, sheet | style(belt): PB wedges get shaded slits, chamfered corners, bevel highlights, a gradient face with sheen and a deeply etched PB (v1.0.44) |
| `09f613a` | F | Sheet, sheet | style(belt): PB wedges keep the standard slit width to their neighbours, and when on a glowing gold thread runs through the slits down to the die hexad and around its edges (v1.0.45) |
| `6812d9f` | F | sheet | style(belt): centre the etched PB on the wedge face's centroid (v1.0.46) |
| `4c46190` | F | Sheet, sheet | fix(belt): a PB wedge lights and boosts only the die hexad beneath it instead of framing every slot in gold (v1.0.47) |
| `7fb1290` | F | Sheet, sheet | style(belt): an active PB traces one continuous glow — around the wedge, down the slit between the ability hexads, then around the die hexad — and breathes as a single path (v1.0.48) |
| `63d5a85` | F | Sheet, sheet | feat(belt): ability check and save halves roll on hold-and-release like the die hexads, with a charging glow; a quick tap no longer rolls (v1.0.49) |
| `f646485` | F | dice, Sheet | feat(belt): rolling a die hexad rolls every hexad sharing its ability as d20 + damage pairs, one column per pair for multiattacks; damage reveals first and a natural 20 re-rolls the extra crit dice on top (v1.0.50) |
| `58733c6` | F | Sheet, dice, sheet | feat(belt): label-free paired rolls with per-die start delay, speed-up and HSV drift; I/II loadout wedges under the belt swap each side's dice; belt setup persists per character (v1.0.51) |

### 2026-11-10

| Commit | Área | Onde | O que |
|---|---|---|---|
| `a35051f` | F+B | world, urls, views_world | feat(world): full resolution images, direct image and source links, automagic ingestion, and auto-fit map zones (v1.0.25) |

### 2026-11-11

| Commit | Área | Onde | O que |
|---|---|---|---|
| `884c635` | B | test_world, test_world_ingest, world_ingest | feat(world): ingestion unwraps reddit, imgur and google image links, sends browser-like request headers, and returns images as links instead of bytes; tests cover ingest and the new image rules (v1.0.52) |
| `f4f8c07` | F+B | world, sheet, serializers | fix(world/sheet): dynamic external image linking with auto-proxy fallback, multi-char campaign joining, npc world sync, dark fantasy skills accordion and spell slots hud |
| `2f22e00` | F | Sheet, SheetTabs, sheet | fix(sheet): top-right discrete Cheat/Edit/Export tools, rest buttons below languages, remove hero tags, consolidate ability in spell DC/attack, restore SlotMatrix, and show casting time on spell rows (v1.0.53) |
| `2c458f6` | F | sheet, Sheet | feat(sheet): campaigns as versions of a character — template plus one full copy per campaign, with a version switcher, leave/join that keeps the version, owner-only exclude, promote to template, read-only archived versions, and the backend spec in docs/character-versions.md (v1.0.54) |
| `d1607f4` | docs | — | docs: frontend × backend × production sync spec with full route and commit ledger, ADR-0032 to 0035, API routes pending deploy, automatic update guide, belt v2 spec, and roadmap/tech-debt/system-map updates (v1.0.55) |

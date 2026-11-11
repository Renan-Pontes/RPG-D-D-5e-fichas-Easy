# Contratos e deltas por função — backend e frontend

> Gerado do git (`5655785` → `HEAD`) por leitura do código: nenhuma linha foi escrita à mão.
> Entrada: [`sync-spec.md`](sync-spec.md). Rotas × chamadores e commits: [`sync-ledger.md`](sync-ledger.md).
> Os campos de entrada, as chaves de resposta e os códigos de erro são os que aparecem no corpo da função
> da view; o que a view delega a outro módulo (regras em `world_rules`, `combat`, `stage`…) aparece na §2,
> na função que faz o trabalho. Coluna vazia = a função não lê ou não devolve nada daquele tipo diretamente.
> Limite: é leitura estática. "Quem" vem das guardas chamadas na função ("membro e mestre" = parte da rota é só do mestre);
> chaves montadas em variável antes do `Response` não aparecem em "Devolve". Na dúvida vale o código e o teste da rota.

## 1. Views com rota: nova ou alterada

`N` = função nova · `A` = alterada · `+campos`/`+erros` = o que a função passou a ler ou a devolver desde a produção.

### `backend/api/views_adventures.py` (+119 −18)

| | Rota | View | Métodos | Quem | Lê (`+campos`) | Devolve | `+erros` | Em produção | Arquivos do frontend |
|---|---|---|---|---|---|---|---|---|---|
| N | `/campaigns/:id_or_slug/adventures/:pk/nodes` | `adventure_nodes` | GET | mestre |  | `adventure` |  | não | 0 |
| N | `/campaigns/:id_or_slug/adventures/:pk/node/:node_id` | `adventure_node` | GET / PATCH | mestre | `nodes` | `adventure` | `adventure_too_large`, `node_not_found`, `not_found` | não | 0 |
| A | `/campaigns/:id_or_slug/adventures/:pk/screen` | `adventure_screen` | POST | mestre |  |  |  | sim | 1 |

### `backend/api/views_campaigns.py` (+344 −50)

| | Rota | View | Métodos | Quem | Lê (`+campos`) | Devolve | `+erros` | Em produção | Arquivos do frontend |
|---|---|---|---|---|---|---|---|---|---|
| A | `/campaigns/:id_or_slug` | `campaign_detail` | GET / PUT / PATCH / DELETE | membro e mestre |  |  |  | sim | 1 |
| A | `/campaigns/:id_or_slug/state` | `campaign_state_patch` | PATCH | mestre |  |  |  | sim | 4 |
| A | `/campaigns/:id_or_slug/screen-card` | `campaign_screen_card` | POST | mestre |  |  |  | sim | 1 |
| N | `/campaigns/:id_or_slug/stage` | `campaign_stage` | POST | mestre |  |  |  | não | 1 |
| N | `/campaigns/:id_or_slug/stage/scene` | `campaign_stage_scene` | POST | mestre | `undo` |  |  | não | 1 |
| N | `/campaigns/:id_or_slug/stage-image` | `campaign_stage_image` | GET | membro | `v` |  |  | não | 1 |
| N | `/campaigns/:id_or_slug/members/:membership_id/avatar` | `campaign_member_avatar` | GET | membro |  |  | `campaign_not_found` | não | 0 |
| A | `/campaigns/join` | `campaign_join` | POST | logado | `campaign`, `campaignId`, `campaign_id`, `charId`, `charType`, `character`, `character_id`, `code`, `id`, `invite_code`, `isNpc` |  | `campaign_not_found`, `campaign_required`, `character_already_in_campaign`, `not_a_member` | sim | 1 |
| A | `/campaigns/:id_or_slug/members/:membership_id` | `campaign_member` | PUT / DELETE | mestre | `charType`, `isNpc` |  | `character_already_in_campaign` | sim | 1 |

### `backend/api/views_characters.py` (+32 −7)

| | Rota | View | Métodos | Quem | Lê (`+campos`) | Devolve | `+erros` | Em produção | Arquivos do frontend |
|---|---|---|---|---|---|---|---|---|---|
| A | `/characters` | `character_list` | GET / POST | logado |  |  |  | sim | 2 |
| A | `/characters/:pk` | `character_detail` | GET / PUT / DELETE | logado |  |  |  | sim | 1 |
| A | `/characters/:pk/campaigns` | `character_campaigns` | GET | logado |  |  |  | sim | 1 |

### `backend/api/views_checks.py` (+29 −4)

| | Rota | View | Métodos | Quem | Lê (`+campos`) | Devolve | `+erros` | Em produção | Arquivos do frontend |
|---|---|---|---|---|---|---|---|---|---|
| A | `/checks/:pk/close` | `check_close` | POST | logado |  |  |  | sim | 1 |
| A | `/checks/:pk/respond` | `check_respond` | POST | logado |  |  |  | sim | 1 |

### `backend/api/views_combat.py` (+1514 −96)

| | Rota | View | Métodos | Quem | Lê (`+campos`) | Devolve | `+erros` | Em produção | Arquivos do frontend |
|---|---|---|---|---|---|---|---|---|---|
| A | `/combat/campaign/:id_or_slug` | `combat_get` | GET | membro |  |  |  | sim | 1 |
| A | `/combat/campaign/:id_or_slug/start` | `combat_start` | POST | mestre |  |  |  | sim | 1 |
| A | `/combat/campaign/:id_or_slug/end` | `combat_end` | POST | mestre |  |  |  | sim | 1 |
| A | `/combat/campaign/:id_or_slug/reset` | `combat_reset` | POST | mestre | `keepMap` |  |  | sim | 1 |
| A | `/combat/campaign/:id_or_slug/combatants` | `combat_add_combatant` | POST | mestre |  |  |  | sim | 1 |
| A | `/combat/campaign/:id_or_slug/combatants/:combatant_id` | `combat_combatant` | PUT / DELETE | mestre | `initiative`, `sprite` |  |  | sim | 1 |
| N | `/combat/campaign/:id_or_slug/encounter` | `combat_encounter` | POST | mestre | `askInitiative`, `closeCheck`, `fromCheck`, `grid_size_px`, `height_px`, `initiatives`, `lang`, `map`, `mode`, `monsterInit`, `monsters`, `pcs`, `scene`, `start`, `width_px` | `duplicate` | `invalid_mode` | não | 1 |
| N | `/combat/campaign/:id_or_slug/undo` | `combat_undo` | POST | mestre |  | `combat`, `error` | `changed_since`, `missing_opId`, `nothing_to_undo` | não | 1 |
| N | `/combat/campaign/:id_or_slug/map-from` | `combat_map_from` | POST | mestre |  | `combat` |  | não | 1 |
| A | `/combat/campaign/:id_or_slug/action` | `combat_action` | POST | mestre |  | `duplicate` |  | sim | 2 |
| N | `/combat/campaign/:id_or_slug/save-preview` | `combat_save_preview` | POST | mestre | `actionIndex`, `attackerId`, `saveMods`, `targetIds` | `attackerId` | `action_has_no_save`, `attacker_not_found`, `combatant_not_found`, `missing_targets` | não | 1 |
| A | `/combat/campaign/:id_or_slug/player-attack` | `combat_player_attack` | POST | membro |  |  |  | sim | 1 |
| A | `/combat/campaign/:id_or_slug/next-turn` | `combat_next_turn` | POST | mestre |  |  |  | sim | 1 |
| N | `/combat/campaign/:id_or_slug/prev-turn` | `combat_prev_turn` | POST | mestre |  | `error` | `nothing_to_undo` | não | 1 |
| A | `/combat/campaign/:id_or_slug/map` | `combat_set_map` | POST | mestre |  |  |  | sim | 1 |
| N | `/combat/campaign/:id_or_slug/map-image` | `combat_map_image` | GET | logado |  |  | `not_found` | não | 1 |
| N | `/combat/campaign/:id_or_slug/actions/:ref` | `combat_actions` | GET | mestre |  | `ref` | `campaign_not_found`, `not_found` | não | 1 |
| N | `/combat/campaign/:id_or_slug/token/:combatant_id` | `combat_token_image` | GET | logado |  |  | `not_found` | não | 0 |
| A | `/rolls/campaign/:id_or_slug` | `roll_create` | POST | membro |  |  |  | sim | 1 |
| A | `/rolls/campaign/:id_or_slug/recent` | `roll_list_recent` | GET | membro | `table` |  |  | sim | 1 |

### `backend/api/views_diary.py` (+215 −10)

| | Rota | View | Métodos | Quem | Lê (`+campos`) | Devolve | `+erros` | Em produção | Arquivos do frontend |
|---|---|---|---|---|---|---|---|---|---|
| A | `/campaigns/:id_or_slug/diary` | `campaign_diary` | GET / POST | membro |  |  |  | sim | 3 |
| A | `/campaigns/:id_or_slug/diary/:entry_pk` | `campaign_diary_entry` | PATCH / DELETE | membro |  |  | `plan_stays_hidden` | sim | 1 |
| A | `/campaigns/:id_or_slug/diary/sessions` | `campaign_diary_start_session` | POST | mestre |  |  |  | sim | 1 |
| N | `/campaigns/:id_or_slug/diary/sessions/:number/end` | `campaign_diary_end_session` | POST | mestre | `moments` | `already`, `error`, `state` | `not_current_session` | não | 1 |

### `backend/api/views_dice.py` (+173 −21)

| | Rota | View | Métodos | Quem | Lê (`+campos`) | Devolve | `+erros` | Em produção | Arquivos do frontend |
|---|---|---|---|---|---|---|---|---|---|
| A | `/dice/campaign/:id_or_slug/rigs` | `campaign_rigs` | GET / POST | mestre | `before` |  | `invalid_before` | sim | 1 |
| A | `/dice/roll` | `dice_roll` | POST | logado | `adv`, `modifier`, `table` |  |  | sim | 1 |
| N | `/characters/:pk/table-roll` | `sheet_roll` | POST | logado |  | `error`, `shown` | `campaign_closed`, `not_a_member` | não | 1 |

### `backend/api/views_insights.py` (+203 −0)

| | Rota | View | Métodos | Quem | Lê (`+campos`) | Devolve | `+erros` | Em produção | Arquivos do frontend |
|---|---|---|---|---|---|---|---|---|---|
| N | `/campaigns/:id_or_slug/party-insights` | `party_insights` | GET / PUT / PATCH | mestre | `insights` | `insights` |  | não | 1 |
| N | `/campaigns/:id_or_slug/party-insights/history` | `party_insights_history` | GET | mestre |  |  |  | não | 1 |

### `backend/api/views_proxy.py` (+107 −0)

| | Rota | View | Métodos | Quem | Lê (`+campos`) | Devolve | `+erros` | Em produção | Arquivos do frontend |
|---|---|---|---|---|---|---|---|---|---|
| N | `/proxy` | `proxy_fetch` | GET | — | `url` | `error` | `forbidden_host`, `invalid_scheme`, `invalid_url`, `method_not_allowed`, `missing_url`, `network_error`, `upstream_error` | não | 2 |

### `backend/api/views_pulse.py` (+581 −0)

| | Rota | View | Métodos | Quem | Lê (`+campos`) | Devolve | `+erros` | Em produção | Arquivos do frontend |
|---|---|---|---|---|---|---|---|---|---|
| N | `/campaigns/:id_or_slug/pulse` | `campaign_pulse` | GET | logado |  |  |  | não | 1 |

### `backend/api/views_screen.py` (+149 −46)

| | Rota | View | Métodos | Quem | Lê (`+campos`) | Devolve | `+erros` | Em produção | Arquivos do frontend |
|---|---|---|---|---|---|---|---|---|---|
| A | `/screen/:token` | `screen` | GET | público | `c`, `preview`, `tv` |  |  | sim | 2 |
| N | `/screen/:token/portrait/:char_id` | `screen_portrait` | GET | público |  |  | `not_found` | não | 0 |
| N | `/screen/:token/token/:combatant_id` | `screen_token_image` | GET | público |  |  | `not_found` | não | 0 |
| N | `/screen/:token/stage-image` | `screen_stage_image` | GET | público | `v` |  | `not_found` | não | 0 |

### `backend/api/views_world.py` (+215 −26)

| | Rota | View | Métodos | Quem | Lê (`+campos`) | Devolve | `+erros` | Em produção | Arquivos do frontend |
|---|---|---|---|---|---|---|---|---|---|
| A | `/world/:pk/image` | `world_image` | GET / PUT / DELETE | logado |  |  |  | sim | 7 |
| A | `/world/:pk/reveal` | `world_reveal` | POST | logado | `zones` |  | `invalid_zones`, `unknown_zone` | sim | 2 |
| A | `/campaigns/:id_or_slug/world/sample` | `world_sample` | POST | mestre |  |  |  | sim | 1 |
| A | `/campaigns/:id_or_slug/session-plan` | `session_plan` | GET / PUT / PATCH | mestre |  |  |  | sim | 2 |
| N | `/campaigns/:id_or_slug/session-plan/archive` | `session_plan_archive` | POST | mestre | `carry`, `forSession` |  | `invalid_carry` | não | 1 |
| N | `/campaigns/:id_or_slug/session-plan/restore` | `session_plan_restore` | POST | mestre |  | `plan` | `invalid_session`, `plan_not_archived` | não | 1 |
| N | `/campaigns/:id_or_slug/world/ingest` | `world_ingest` | POST | mestre | `url`, `withImage` |  | `missing_url` | não | 1 |

### Contratos escritos no próprio código (módulos novos)

Os módulos de view novos trazem o contrato no docstring; as linhas `VERBO /api/…` de cada um:

- `backend/api/views_insights.py`
  - `GET  /api/campaigns/<c>/party-insights   → {insights, planScenes}`
  - `PUT  /api/campaigns/<c>/party-insights   {insights: {...}} (ou as chaves soltas) → {insights}`
  - `GET  /api/campaigns/<c>/party-insights/history → {current, sessions: [...]}`
- `backend/api/views_pulse.py`
  - `GET /api/campaigns/<id>/pulse   (mestre; o jogador recebe a projeção dele)`

## 2. Funções sem rota própria: novas, alteradas e removidas

Regras, serializadores e ajudantes. `N` nova · `A` alterada · `R` removida. Erros = códigos que a função levanta.


### `backend/api/adventures_ready/__init__.py` (+6 −3)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| A | `_plan_is_empty` | 5 | Sem começo e sem cena com texto (as pistas do mestre ficam, antes das do pacote): as |  |
| A | `import_ready_adventure` | 130 | Cria cartões + aventura. Chamar dentro de transaction.atomic(). |  |

### `backend/api/campaign_state.py` (+32 −3)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| A | `clean_state_value` | 31 | Valida um valor do patch. None remove a chave (devolve None). | `+invalid_sceneId` |
| N | `locked_dm_settings` | 15 | Relê `Campaign.dm_settings` já com o lock de escrita. Chame dentro de |  |

### `backend/api/combat.py` (+162 −0)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| N | `sheet_speed` | 17 | Deslocamento da ficha em pés, para a Tela e o combatente PJ (o servidor não calcula |  |
| N | `apply_temp_hp` | 7 | + Temp (teclado de dano, V8): PV temporário não soma — fica o maior (5e). |  |
| N | `photo_of` | 7 | {id, before, after} dos campos `fields` (só os que mudaram, com only_changed) ou None. |  |
| N | `photo_conflicts` | 8 | Nomes dos combatentes da foto que mudaram depois (ou saíram do combate). |  |
| N | `restore_photo` | 13 | Combatentes com a foto "antes" de volta (quem chama já conferiu os conflitos). |  |
| N | `_span` | 6 |  |  |
| N | `occupied_cells` | 20 | Casas (col, linha) ocupadas pelos tokens. |  |
| N | `free_positions` | 32 | `count` centros de casas livres, linha a linha a partir de `start` (px). `taken` |  |
| N | `initiative_bonus` | 12 | Bônus de iniciativa do stat block: `initiative` (2024) ou o modificador de DES. |  |

### `backend/api/diary.py` (+33 −2)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| N | `session_minutes` | 10 | Minutos entre dois ISO (startedAt/endedAt de diarySessions); None sem os dois. |  |
| N | `length_text` | 3 | "2h10" (o mesmo relógio da capa, play/now-model.clockText). |  |
| N | `log_session_end` | 9 | "Sessão 4 terminou · 2h10" na Crônica (o par do "Sessão 4 começou"). A duração vai |  |
| A | `combat_summary` | 49 | Resumo estruturado do combate: participantes, quedas e vencedor. |  |

### `backend/api/image_data.py` (+57 −2)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| N | `image_link` | 10 | O que vai no JSON no lugar de uma imagem guardada em base64 (retrato do |  |
| N | `image_size` | 40 | (largura, altura) em px lidos do cabeçalho do arquivo (PNG, GIF, JPEG, WebP), ou |  |

### `backend/api/models.py` (+7 −2)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| A | `Membership` | 21 |  |  |

### `backend/api/screen_card.py` (+36 −17)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| N | `entry_card` | 19 | Cartão público de uma entrada visível (revelada ou conhecida de nome). |  |
| A | `resolve_screen_card` | 35 | Cartão público resolvido ou None. `token` → URLs de imagem do telão |  |

### `backend/api/serializers.py` (+90 −21)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| A | `CharacterSerializer` | 41 |  |  |
| N | `CharacterSerializer.get_campaignIds` | 4 | Lista de IDs das campanhas em que este personagem participa (suporte N:N). |  |
| A | `MembershipSerializer` | 62 |  |  |
| A | `MembershipSerializer.to_representation` | 10 |  |  |
| A | `MembershipSerializer.get_character` | 41 |  |  |
| A | `CampaignSerializer` | 103 | Campanha completa (contrato C3). |  |
| A | `CampaignSerializer.to_representation` | 47 |  |  |
| N | `CampaignSerializer._mine_list` | 8 |  |  |
| A | `CampaignListSerializer` | 63 | Lista de campanhas: leve, sem segredos. state só com o recorte público |  |
| A | `CampaignListSerializer.to_representation` | 18 |  |  |
| N | `CampaignListSerializer._mine_list` | 9 | Lista de memberships de quem vê nesta campanha (suporte a múltiplos personagens). |  |
| A | `CampaignListSerializer._mine` | 4 | Membership primária de quem vê nesta campanha (compatibilidade). |  |

### `backend/api/spells.py` (+10 −0)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| A | `short_rest` | 25 | Restauração parcial. PHB: |  |

### `backend/api/stage.py` (+999 −0)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| N | `_bad` | 2 |  |  |
| N | `_int_id` | 4 |  |  |
| N | `_str` | 9 |  |  |
| N | `_short_id` | 4 |  |  |
| N | `_now` | 2 |  |  |
| N | `_ver` | 4 | Versão da imagem da frente: muda a cada "mostrar" (a URL velha morre). |  |
| N | `_json_len` | 2 |  |  |
| N | `legacy_front` | 23 | Campanha de antes do palco (só `screenCard`): a frente equivalente, guardada |  |
| N | `get_stage` | 24 | Palco normalizado (com os padrões), a partir do `state` cru. |  |
| N | `_snapshot` | 2 |  |  |
| N | `_same_front` | 6 | A mesma coisa na frente? (ignora `ver`/`label`, que mudam a cada envio). |  |
| N | `_entry` | 7 |  | `entry_not_found` |
| N | `_node` | 6 |  | `scene_not_found` |
| N | `_plan_scene` | 8 |  | `scene_not_found` |
| N | `node_scene_front` | 6 | A sala de uma aventura como cena na frente (Conduzir: "Nome" ou "Nome + texto"). |  |
| N | `_node_scene` | 13 |  |  |
| N | `clean_target` | 80 | Valida o `target` do op 'show' e devolve a frente pronta para gravar. | `empty_recap`, `empty_text`, `entry_hidden`, `handout_private`, `invalid_recap`, `invalid_ref`, `invalid_secretIds`, `invalid_target`, `no_image`, `recap_too_long` |
| N | `clean_prefs` | 15 |  | `invalid_prefs` |
| N | `clean_stage_op` | 27 | Valida o corpo de POST /stage. Faz as leituras (cartão, sala, plano) fora | `invalid_bg`, `invalid_focus`, `invalid_on`, `invalid_op` |
| N | `next_stage` | 70 | Aplica o op (já validado) sobre o palco normalizado. Puro. | `stage_too_large` |
| N | `compat_card` | 20 | `screenCard` que a TV antiga entende para esta frente (ou None). |  |
| N | `apply_stage_op` | 35 | Grava o op (POST /stage). Não escreve nada se o palco não mudou (cada |  |
| N | `hold_for_combat` | 14 | ⚔ O combate começou (E1.1, o ▶ Iniciar e o "⚔ Começar" do combate rápido): a TV vai |  |
| N | `waiting_replaced` | 10 | O "mostrar" tirou o que esperava o fim do combate? (E1.3d: o aviso diz que |  |
| N | `_legacy_card_name` | 12 | Campanha de antes do palco cuja frente antiga é um cartão: o nome dele (1 |  |
| N | `_named_legacy` | 7 | O palco montado do `screenCard` antigo, com o nome do cartão na frente. |  |
| N | `shown_in_session` | 21 | diarySessions com o que foi mostrado na sessão ao vivo (`shown`: [{t, k}], |  |
| N | `stage_from_screen_card` | 13 | O POST /screen-card antigo vira um op do palco (mesma validação de antes: |  |
| N | `_scene_name` | 2 |  |  |
| N | `_first_ref_image` | 12 | O 1º cartão com imagem de uma lista de ids (na ordem dela), sem documento privado. |  |
| N | `_maybe_node` | 5 |  |  |
| N | `plan_scene_front` | 42 | A frente "cena" de uma cena do plano, com o que ela tem (um lugar por dado, §3.3): | `empty_scene` |
| N | `set_scene_done` | 28 | Marca (ou desmarca) uma cena do plano como feita, com a trava do dm_settings e o |  |
| N | `_enter_room` | 31 | A sala da cena ligada vira a sala atual da aventura (o "O grupo entrou aqui" do modo |  |
| N | `_leave_room` | 19 | ↶ da sala: a sala atual de antes, o "visitado" e a situação de antes; o registro sai. |  |
| N | `_bool_opt` | 7 |  |  |
| N | `start_scene` | 48 | ▶ Começar esta cena. body: {sceneId, show?, focus?, log?} | `invalid_show` |
| N | `_clean_undo` | 31 |  | `invalid_undo` |
| N | `undo_scene_start` | 16 | ↶ Desfazer do ▶ Começar esta cena: o `undo` que a resposta trouxe. |  |
| N | `stage_image_url` | 7 |  |  |
| N | `public_front` | 43 | A frente como a TV e os jogadores podem ver (sem `label`, sem nome de |  |
| N | `public_stage` | 22 | Projeção pública do palco (irmã de `public_state`): vai à TV (/api/screen) |  |
| N | `with_combat_now` | 6 | Anota no queryset da campanha as 2 colunas do combate que a regra da Tela |  |
| N | `combat_now` | 12 | Resumo mínimo do combate para a regra da Tela ({active, round}). Usa a |  |
| N | `dm_stage` | 18 | O palco do MESTRE (cru, com os nomes) para o GET da campanha. Numa campanha |  |
| N | `stage_image_data` | 24 | (data URL, ver) da imagem que está na frente AGORA, ou None. Só a frente |  |
| N | `_entry_or_none` | 6 |  |  |

### `backend/api/table_rolls.py` (+302 −0)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| N | `note_for` | 3 |  |  |
| N | `parse_note` | 8 | '@mesa:monster Goblin #2' → ('monster', 'Goblin #2'). Pedido → (None, ''). |  |
| N | `is_table` | 2 |  |  |
| N | `natural_crit` | 6 | (20 natural, 1 natural) entre os d20 que contam. |  |
| N | `players_allow` | 9 | Política "Dos jogadores": all → todas; crits → só 20/1 natural em d20; off → nenhuma. |  |
| N | `sheets_mode` | 4 | A regra "Rolagens das fichas" (onda 3, E2.6): 'all' · 'crits' (só 20/1 natural) · 'off'. |  |
| N | `prefs_of` | 3 |  |  |
| N | `record` | 17 | Grava UMA rolagem de mesa já resolvida (1 escrita) e arruma as velhas. |  |
| N | `_bad` | 3 |  |  |
| N | `_plain_int` | 2 |  |  |
| N | `clean_sheet_roll` | 54 | Valida a rolagem que a ficha já rolou no aparelho e manda pronta: | `incoherent_advantage`, `incoherent_total`, `invalid_dice`, `invalid_dice_type`, `invalid_label`, `invalid_modifier`, `invalid_value`, `label_too_long`, `too_many_dice` |
| N | `prune` | 10 | Apaga as rolagens de mesa além das `keep` mais novas da campanha (2 consultas |  |
| N | `who_of` | 15 | (tipo, quem). Mestre: quem = '' (a tela escreve "Mestre"/"GM"); monstro e |  |
| N | `_user_name` | 8 |  |  |
| N | `_dice` | 12 |  |  |
| N | `detail` | 15 | Os campos de cada tipo: {hit, damage} do ataque; {ability, dc, targets} da salvaguarda. |  |
| N | `public_roll` | 13 | Uma rolagem para a Tela (e o jogador): nada de dado viciado, bônus de monstro |  |
| N | `screen_rolls` | 13 | A janela da TV: até 6 públicas dos últimos 90 s (relógio do servidor), em |  |
| N | `dm_row` | 10 | A linha do mestre (Testes › 🎲 Rolagens na Tela): o pedido serializado + tipo, |  |

### `backend/api/views_adventures.py` (+119 −18)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| A | `_clean_checks` | 15 |  |  |
| N | `_current_fight` | 11 | O combate da sala em jogo, em poucos bytes (V8: o atalho "Usar o combate da cena" |  |
| A | `_summary` | 9 |  |  |
| N | `_node_out` | 5 | A sala sem a imagem (só `hasImage`): o que a folha da Cena precisa. |  |
| N | `_node_light` | 10 | A linha da sala no Plano: nome, o que ela tem (contagens e nomes), sem textos nem imagem. |  |

### `backend/api/views_campaigns.py` (+344 −50)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| A | `_get_light` | 9 | Como get_campaign_or_404, sem carregar a capa (o GET da campanha é polling). |  |
| A | `_apply_dm_settings` | 35 | onboarding (merge raso de flags) e advancedDice — só o mestre vê (dm_settings). | `+invalid_lang` |
| N | `_npc_summary_from` | 46 | Linha + campos de NPC do Mundo tirados da ficha (dados que existirem). |  |
| N | `_sync_char_to_world_npc` | 64 | Ficha marcada como NPC → cartão de NPC no Mundo da campanha (cria ou |  |

### `backend/api/views_checks.py` (+29 −4)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| A | `serialize_for_screen` | 20 | Resumo público para a Tela. CD secreta: nem a CD nem o ✓/✗ (que |  |

### `backend/api/views_combat.py` (+1514 −96)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| A | `_action_name` | 5 |  |  |
| A | `_sync_changed` | 7 | `before` = {id do combatente: ele antes da ação}: a ficha só ganha ou perde as condições |  |
| N | `map_payload` | 18 | Mapa do combate SEM o fundo em base64 (V9: 85 KB → poucos bytes): grade, |  |
| N | `_sprite_link` | 5 | `sprite` do combatente: a URL da imagem do token (nunca o base64). |  |
| N | `_without_scene` | 3 | O mapa sem `scene` (de que sala do preparo veio o combate, V8): só o mestre vê. |  |
| A | `_serialize_combat` | 40 | Combat instance → dict. Jogador e Tela recebem a versão filtrada. |  |
| N | `_undoable` | 16 | opIds do registro curto que o POST …/undo ainda desfaz: com foto, não desfeitos e sem |  |
| N | `_can_prev` | 11 | Dá para voltar o turno? (E1.4: o "↶ Voltar turno" fica à mão enquanto há turno |  |
| N | `_recent_log` | 15 | O pedaço do registro que vai a cada mudança. O app mostra as 8 últimas linhas |  |
| N | `actions_ref` | 4 | Hash curto e estável das ações de um stat block (o mesmo conteúdo dá o mesmo ref). |  |
| N | `with_action_refs` | 18 | Combate do mestre com as ações de cada stat block trocadas por `stats.actionsRef`. |  |
| N | `action_sets` | 13 | Com `?sets=1` (o app desta versão), o `combat` da resposta vai com |  |
| N | `_amount` | 6 | PV de uma ação (dano, cura, temporário): inteiro de 0 a 9999, senão 400. | `invalid_amount` |
| N | `_op_id` | 8 | `opId` do corpo (o uuid que o app gera por toque) ou None. | `invalid_opId` |
| N | `_op_entries` | 3 | As entradas do registro (as últimas 100) feitas por este `opId`. |  |
| N | `_lock_combat` | 4 | Pega o lock de escrita ANTES de ler o combate (como o Próximo turno): no SQLite |  |
| N | `_photos` | 20 | A foto da ação: dos alvos, os campos de PV (antes e depois); dos atacantes, só as |  |
| N | `_cond_photo` | 6 | A foto de uma condição posta ou tirada (E1.4): as condições e os efeitos com |  |
| N | `_by_initiative` | 5 |  |  |
| N | `_sort_keep_turn` | 12 | Grava `combatants` em `c` na ordem da iniciativa (desc, estável). Com o combate |  |
| N | `_build_combatant` | 112 | Combatente novo a partir do corpo de POST …/combatants (ou de um item do | `character_not_found`, `invalid_type`, `missing_characterId`, `missing_monster_data` |
| N | `_base_and_number` | 3 |  |  |
| N | `_monster_name` | 5 |  |  |
| N | `_encounter_groups` | 23 | [{monster, count, initiative?, sprite?, tokenScale?}] → grupos validados. | `invalid_encounter`, `too_many_monsters` |
| N | `_encounter_pcs` | 20 | 'all' ou [{characterId, initiative?}] → [(Character, iniciativa\|None)] da campanha. | `character_not_in_campaign`, `invalid_pcs` |
| N | `_encounter_inits` | 13 | "Usar e começar": [{id, initiative, guess?}] (as respostas do teste de iniciativa). | `invalid_initiatives` |
| N | `_scene_ref` | 11 | De onde veio o combate: {advId, nodeId, name} (o fim guiado lista o tesouro da sala). |  |
| N | `_map_image_from` | 26 | A imagem (data URL) de uma sala ({advId, nodeId}) ou de um cartão do Mundo | `entry_not_found`, `invalid_map`, `no_image`, `private_handout`, `scene_not_found` |
| N | `_set_map_background` | 19 | Põe (ou tira, com None) o fundo do mapa, com o tamanho lido do arquivo. → mudou? |  |
| N | `_map_ver_to_state` | 4 |  |  |
| N | `_initiative_check` | 17 | O teste de iniciativa pedido à mesa: `kind:'custom', key:'initiative'` (um app de |  |
| N | `_close_initiative_checks` | 6 | Encerra o teste de iniciativa aberto (V8): o combate acabou, recomeçou ou foi |  |
| N | `_combat_since` | 5 | Quando o combate de agora começou a ser montado: a hora da 1ª entrada do registro |  |
| N | `_answers_of_open_check` | 21 | As respostas do teste de iniciativa aberto mais novo → ([{id, initiative}], check id). |  |
| N | `_close_check` | 6 |  |  |
| N | `_check_payload` | 8 |  |  |
| N | `_apply_action` | 345 | O corpo do POST …/action, já dentro da transação. → (payload, show_after). | `action_has_no_save`, `attacker_not_found`, `combatant_not_found`, `invalid_action_index`, `invalid_action_type`, `invalid_op`, `invalid_resources`, `invalid_target`, `missing_targets` |
| N | `_save_plan` | 26 | Valida os alvos do save_apply: [{id, total, success, damage, conditions, d20}]. | `invalid_damage`, `invalid_target`, `missing_targets` |
| N | `_show_attack` | 11 | A linha da Tela do ataque de monstro: "Goblin #2 ⚔ Dagna · d20 11 · ACERTA · |  |
| N | `_show_save` | 10 | A linha-resumo da salvaguarda em área: cada alvo com o total e ✓/✗. |  |
| N | `_save_mod` | 15 | Modificador de resistência (a regra do app: saves → atributo); None se a ficha não diz. |  |
| N | `_merged_conditions` | 13 | As condições da ficha depois de uma ação do combate: muda só o que o combate pôs ou |  |
| A | `_sync_pc_to_character` | 58 | Sincroniza HP/condições/death_saves de volta na Character.data do PC. |  |
| N | `_sheet_conflicts` | 12 | Nomes de quem tem a ficha diferente do que a ação deixou (o jogador mexeu depois). |  |
| N | `_restore_sheets` | 17 | Põe de volta na ficha o "antes" da foto (só os campos que a ação mudou). |  |
| N | `_expect` | 9 | `expect: {round, turnIndex}` do corpo → (round, turnIndex) ou None. | `invalid_expect` |
| N | `_stale` | 3 |  | `stale_turn` |
| N | `_turn_photo` | 8 | Campos de turno que mudaram num combatente: {id, before, after} ou None. |  |
| N | `_merge_photo` | 11 | Junta a foto de um combatente que mudou duas vezes (sozinho no combate: |  |
| N | `_swap_turn` | 10 | Grava a vez nova só se ninguém escreveu no combate desde a leitura. → bool |  |
| N | `_log_add` | 3 |  |  |
| N | `_turn_write` | 24 | Lê o combate, confere a vez esperada e grava `compute(c)` com CAS (até 3 |  |
| N | `_member_campaign` | 9 | Campanha só com o necessário para a permissão (as rotas de imagem não | `campaign_not_found` |
| N | `token_sprite` | 5 | A imagem própria (data URL) do token, ou None. |  |
| N | `_live_session_start` | 12 | Início da sessão ao vivo (state.diarySessions[session].startedAt) ou None. |  |
| R | `roll_public_screen` | 10 | Rota pública (telão): últimas rolagens com status=public da campanha. |  |

### `backend/api/views_diary.py` (+215 −10)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| A | `_serialize` | 16 |  |  |
| A | `_sessions_payload` | 10 |  |  |
| N | `_end_flags` | 8 |  |  |
| N | `_end_moments` | 14 | [{charId, id?, text?}] → validado (o texto só vale para o momento novo). | `invalid_moments` |
| N | `_closing_stage` | 9 | A Tela no fim da sessão: sem frente, de volta ao fundo automático (a capa, já sem |  |
| N | `_mark_moments` | 46 | Os momentos escolhidos em "Quem teve um momento hoje?" ganham `done = number`; quem |  |

### `backend/api/views_dice.py` (+173 −21)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| N | `_int_in` | 5 |  |  |
| N | `_groups` | 20 | Os grupos da fórmula: `groups` [{diceType, count, sign}] (fórmula mista do | `invalid_dice_type`, `too_many_dice`, `too_many_groups` |
| N | `_table_row` | 19 | A linha da Tela desta rolagem (ou None): 🔒/📺 do mestre ou a política dos jogadores. |  |

### `backend/api/views_insights.py` (+203 −0)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| N | `_run` | 5 |  |  |
| N | `_session_numbers` | 13 | As últimas `limit` sessões (em ordem crescente): as do diário (diarySessions e o |  |
| N | `_session_starts` | 20 | Quando cada sessão começou: diarySessions[n].startedAt; sem ele, a 1ª entrada do |  |
| N | `session_history` | 74 |  |  |

### `backend/api/views_proxy.py` (+107 −0)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| N | `_is_safe_host` | 28 |  |  |

### `backend/api/views_pulse.py` (+581 −0)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| N | `_tv_key` | 2 |  |  |
| N | `clean_tab` | 4 | Id da aba da TV (aleatório, do navegador): só letras, números, - e _. |  |
| N | `mark_tv` | 12 | A TV `tab` pediu agora. Só cache em memória (0 escrita no banco). |  |
| N | `tv_count` | 4 |  |  |
| N | `_sub` | 4 | Subconsulta correlacionada: um agregado de `model` desta campanha. |  |
| N | `_row_sql` | 28 | A linha da campanha com os agregados (SQL pronto: montar 16 subconsultas |  |
| N | `_campaign_row` | 26 | A campanha (pelo id ou pelo slug) com os agregados, num SELECT só. Outro | `campaign_not_found` |
| N | `_campaign_row_orm` | 22 |  | `campaign_not_found` |
| N | `_tables` | 5 |  |  |
| N | `_fetch` | 4 |  |  |
| N | `_seats` | 12 | As vagas da mesa, só o que o `rev` e a contagem de alvos precisam: |  |
| N | `_combat_rows` | 30 | (active, round, turn_index, updated_at, [combatente mínimo]) ou None. |  |
| N | `_down` | 2 |  |  |
| N | `_dying` | 3 | PJ a 0 PV que não morreu (testes contra a morte): a fita do mestre não o risca. |  |
| N | `_turn` | 12 | (quem age agora, quem vem depois): o próximo pula quem caiu. |  |
| N | `combat_summary` | 29 | O resumo do combate da barra da mesa (a vez, quem vem, quem já agiu). |  |
| N | `_shown_test` | 8 |  |  |
| N | `_last_roll` | 20 | A rolagem pública mais nova (pelo relógio do servidor), com o nome do personagem. |  |
| N | `_front_entry_id` | 14 | O cartão do Mundo que o GET completo resolve para a Tela (frente ou o cartão antigo). |  |
| N | `_front_payload` | 16 | A frente para a barra (nomes do mestre; a imagem pela URL do mestre). |  |
| N | `_iso` | 13 | Data em ISO com fuso (o SQL cru do SQLite devolve a data sem fuso; o banco guarda em UTC). |  |
| N | `_h` | 3 |  |  |
| N | `_screen_sources` | 11 | O que o GET completo resolve para a Tela fora da campanha: o cartão do Mundo |  |
| N | `build_pulse` | 58 | (payload, etag) do pulso: o do mestre ou, para quem é da mesa, o do jogador | `not_a_member` |
| N | `_same_id` | 2 |  |  |
| N | `player_combat` | 13 | A vez no combate para a Mesa do jogador: os nomes da ordem, como a TV mostra. |  |
| N | `_player_checks` | 8 | (checksRev, abertos sem resposta) dos testes abertos PARA o jogador (os que a |  |
| N | `build_player_pulse` | 34 | (payload, etag) do pulso do jogador. PermissionDenied se não for da mesa. | `not_a_member` |

### `backend/api/views_screen.py` (+149 −46)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| N | `armor_class` | 14 | CA da FICHA (`data.armorClass`, que o app grava ao salvar com o cálculo |  |
| A | `_public_character` | 23 |  |  |
| R | `_public_map` | 11 | Mapa do telão: grade + fundo. O fundo NÃO vai inline (payload pesado a |  |

### `backend/api/views_world.py` (+215 −26)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| A | `_check_refs` | 28 | Confere parent/links/pins contra as entradas da campanha. Links e pins |  |
| A | `_pins_newly_visible` | 8 |  |  |
| A | `_delete_entry` | 27 | Apaga e limpa links/pins que apontavam para ela (parent já vira NULL). |  |
| A | `image_response` | 30 | Bytes da imagem com ETag = image_ver (304 se o cliente já tem). |  |
| N | `_state_now` | 2 |  |  |
| N | `archive_session_plan` | 29 | Arquiva o plano de agora como o da Sessão `session` (DiaryEntry oculta; uma por |  |
| N | `_session_arg` | 6 |  | `invalid_session` |

### `backend/api/world_ingest.py` (+509 −0)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| N | `normalize_image_url` | 29 | Normaliza links de imagem (desembrulha visualizadores HTML como reddit /media, limpa imgur e wikia). |  |
| N | `IngestError` | 4 |  |  |
| N | `IngestError.__init__` | 3 |  |  |
| N | `is_public_ip` | 9 |  |  |
| N | `check_url` | 20 | Valida esquema/porta/host. `resolver(host) -> [ip]` (injetável nos testes). |  |
| N | `_resolve` | 5 |  |  |
| N | `fetch` | 47 | GET com SSRF-guard → (final_url, content_type, bytes). |  |
| N | `clean_text` | 6 |  |  |
| N | `summarize` | 10 | Primeira(s) frase(s) até `limit` caracteres, sem cortar palavra. |  |
| N | `guess_kind` | 16 |  |  |
| N | `_Digest` | 68 |  |  |
| N | `_Digest.__init__` | 10 |  |  |
| N | `_Digest._skipping` | 2 |  |  |
| N | `_Digest._in_content` | 2 |  |  |
| N | `_Digest.handle_starttag` | 26 |  |  |
| N | `_Digest.handle_endtag` | 17 |  |  |
| N | `_Digest.handle_data` | 5 |  |  |
| N | `digest_html` | 44 | HTML → rascunho {name, summary, body, imageUrl, kind, tags}. |  |
| N | `_name_from_url` | 5 |  |  |
| N | `mediawiki_api_url` | 11 | Wikipedia/MediaWiki com TextExtracts: URL da API para o resumo limpo, ou ''. |  |
| N | `digest_mediawiki_json` | 15 |  |  |
| N | `_flat` | 6 |  |  |
| N | `digest_json` | 44 | SRD (dnd5eapi.co / Open5e) e JSON genérico com name/desc. |  |
| N | `image_data_url` | 6 |  |  |
| N | `sniff_image_type` | 10 |  |  |
| N | `ingest` | 36 | URL → {draft, source}. `fetcher(url) -> (final_url, ctype, bytes)`. |  |

### `backend/api/world_rules.py` (+753 −19)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| A | `image_version` | 2 |  |  |
| A | `clean_image` | 17 | Data URL jpeg/png/webp/gif em base64 (até MAX_IMAGE_CHARS), ou link externo http(s). |  |
| A | `_clean_map` | 29 |  |  |
| N | `_clean_zones` | 30 | Áreas (retângulos) de um mapa que levam a outro lugar: zoom aninhado. | `invalid_map`, `too_many_zones` |
| N | `clean_contains` | 14 | Ids de cartões "aqui dentro / membros" (N:N). Existência na view. | `invalid_contains`, `too_many_contains` |
| N | `clean_url` | 6 | URL http(s) segura para guardar (sem espaços, sem javascript:). |  |
| N | `clean_sources` | 27 | Fontes do mestre: [{url, label?, ingestedAt?}] (só mestre vê). | `invalid_sources`, `too_many_sources` |
| N | `data_fields` | 2 |  |  |
| A | `clean_data` | 13 | Whitelist dos campos por tipo. Campos desconhecidos são descartados. |  |
| N | `map_zone_targets` | 5 |  |  |
| N | `contains_of` | 3 |  |  |
| A | `_image_url` | 4 |  |  |
| A | `_public_pins` | 28 |  |  |
| A | `public_data` | 20 | `data` que o jogador pode ver (sem statblock/recipients/campaignItemId). |  |
| A | `serialize_light` | 40 | WorldEntryLight. `visible_ids` = ids não-hidden que o jogador pode ver |  |
| A | `_items` | 22 |  |  |
| N | `_snap_text` | 6 |  |  |
| N | `_snap_value` | 14 | Tira as imagens (data:…) de qualquer nível e corta as descrições das listas de ações. |  |
| N | `_scene_snap` | 7 |  | `scene_monster_too_large` |
| N | `_scene_show` | 11 |  |  |
| N | `_scene_fight` | 19 |  |  |
| N | `_scene_check` | 13 |  |  |
| N | `_scene_treasure` | 16 |  | `scene_item_too_large` |
| N | `_clean_scene` | 7 |  |  |
| A | `clean_session_plan_patch` | 24 | Valida as chaves presentes (merge por chave no servidor; `_rev` é só do servidor). |  |
| N | `_merge_scenes` | 4 | Cenas do patch por cima das guardadas, pelo id: o bolso que não veio continua. |  |
| A | `merged_session_plan` | 14 |  | `+too_many_scene_monsters` |
| N | `bump_session_plan` | 7 | Antes de gravar: `_rev` + 1 e, no 1º PUT de um plano sem dono, a sessão dele |  |
| N | `plan_session_number` | 7 | Nº da sessão de um plano novo: a ao vivo (é o plano de hoje) ou a próxima. |  |
| N | `_filled_items` | 2 |  |  |
| N | `session_plan_is_empty` | 7 | Plano "vazio" para quem preenche sozinho (aventura pronta, exemplo): sem começo e |  |
| N | `fill_empty_session_plan` | 28 | Plano vazio + o que veio (aventura pronta, exemplo). As pessoas, os lugares e as |  |
| N | `_real_scene` | 2 |  |  |
| N | `_real_secret` | 2 |  |  |
| N | `plan_has_content` | 6 | Há o que arquivar: começo, cena, pista, pessoa, lugar ou anotação. |  |
| N | `plan_leftovers` | 10 | O que "Levar para a Sessão N+1" leva: as cenas de verdade não feitas (a que estava |  |
| N | `plan_idea_keys` | 10 | As ideias do Raio-X que já viraram cena no plano de agora (`fromIdea` das cenas de |  |
| N | `plan_scene_ids` | 11 | As cenas de verdade do plano de agora (ids, na ordem): o Raio-X confere com elas em que |  |
| N | `played_scene_ids` | 9 | As cenas jogadas na sessão (as mesmas do rascunho do resumo, diary-summary.playedScenes): |  |
| N | `carried_plan` | 10 | O plano da Sessão `next_session`: com `carry`, o que sobrou (plan_leftovers, com os |  |
| N | `archive_payload` | 23 | `data` da DiaryEntry do plano arquivado: o plano inteiro (sem o `_rev`), a cena que | `session_plan_too_large` |
| N | `_blank` | 2 |  |  |
| N | `_by_id_union` | 9 | Na ordem de `first` e, depois, o que de `second` tem um id que `first` não tem. O mesmo |  |
| N | `restored_plan` | 25 | "Restaurar": o plano arquivado volta ao Plano sem apagar nada do que já está nele. O | `session_plan_too_large`, `too_many_scene_monsters` |
| N | `_party_bad` | 2 |  | `invalid_party_insights` |
| N | `_char_map` | 12 | {"<id da ficha>": valor \| null}, no máximo MAX_PARTY_CHARS personagens. | `party_insights_too_large` |
| N | `_clean_spotlights` | 25 | Momentos de um personagem: [{id, kind, text, auto, done, plan}], até 12. | `invalid_spotlight_kind`, `party_insights_too_large` |
| N | `_clean_style` | 4 |  |  |
| N | `_clean_dismissed` | 11 |  | `party_insights_too_large` |
| N | `_clean_base_row` | 6 | 11 notas inteiras de 1 a 5, na ordem de PARTY_AXES. |  |
| N | `clean_party_insights_patch` | 49 | Valida as chaves presentes (merge por chave no servidor). `null` numa chave volta | `invalid_class` |
| N | `merged_party_insights` | 36 | O gravado (com os padrões) + o patch já limpo. Nos mapas, o patch troca só os | `party_insights_too_large` |

### `backend/api/world_sample.py` (+29 −3)

| | Função | Linhas | O que é | Erros |
|---|---|---|---|---|
| A | `create_sample_world` | 102 | Cria as entradas e a aventura. Chamar dentro de transaction.atomic(). |  |

## 3. Modelo, migrações, testes e demais arquivos do backend

| | Arquivo | + | − | Nota |
|---|---|---|---|---|
| A | `backend/api/migrations/0014_membership_npc_and_multi_characters.py` | 34 | 0 | operações: AlterUniqueTogether, AddField, AddField, AddIndex, AddIndex |
| M | `backend/api/progression/catalog.json` | 1 | 1 |  |
| A | `backend/api/tests/fixtures/statblocks.json` | 233 | 0 |  |
| M | `backend/api/tests/test_adventures.py` | 60 | 0 | 15 testes (+3) |
| M | `backend/api/tests/test_api.py` | 39 | 0 | 25 testes (+2) |
| M | `backend/api/tests/test_checks.py` | 2 | 1 | 17 testes (+0) |
| M | `backend/api/tests/test_combat.py` | 103 | 2 | 57 testes (+4) |
| A | `backend/api/tests/test_combat_encounter.py` | 374 | 0 | 23 testes (+23) |
| A | `backend/api/tests/test_combat_turn.py` | 247 | 0 | 16 testes (+16) |
| A | `backend/api/tests/test_combat_undo.py` | 361 | 0 | 24 testes (+24) |
| M | `backend/api/tests/test_diary.py` | 24 | 0 | 23 testes (+2) |
| M | `backend/api/tests/test_invite_preview.py` | 3 | 2 | 17 testes (+0) |
| A | `backend/api/tests/test_multi_char_seats.py` | 45 | 0 | 2 testes (+2) |
| A | `backend/api/tests/test_party_insights.py` | 372 | 0 | 24 testes (+24) |
| M | `backend/api/tests/test_privacy_secrets.py` | 6 | 3 | 15 testes (+0) |
| A | `backend/api/tests/test_pulse.py` | 671 | 0 | 34 testes (+34) |
| M | `backend/api/tests/test_ready_adventures.py` | 42 | 0 | 16 testes (+3) |
| A | `backend/api/tests/test_rest_pact.py` | 22 | 0 | 3 testes (+3) |
| A | `backend/api/tests/test_screen_payload.py` | 352 | 0 | 17 testes (+17) |
| M | `backend/api/tests/test_screen_privacy.py` | 21 | 5 | 15 testes (+1) |
| A | `backend/api/tests/test_screen_rolls.py` | 435 | 0 | 28 testes (+28) |
| A | `backend/api/tests/test_session_end.py` | 307 | 0 | 19 testes (+19) |
| A | `backend/api/tests/test_sheet_rolls.py` | 242 | 0 | 12 testes (+12) |
| A | `backend/api/tests/test_sheet_speed.py` | 102 | 0 | 7 testes (+7) |
| A | `backend/api/tests/test_stage.py` | 612 | 0 | 37 testes (+37) |
| M | `backend/api/tests/test_state_patch.py` | 16 | 0 | 21 testes (+1) |
| M | `backend/api/tests/test_world.py` | 208 | 2 | 55 testes (+14) |
| A | `backend/api/tests/test_world_ingest.py` | 59 | 0 | 8 testes (+8) |

## 4. Frontend: todos os arquivos tocados

Agrupado por pasta. `Rotas` = quantas rotas do backend o arquivo chama hoje (detalhe em `sync-ledger.md` §1).

### `frontend/` (4)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `app.jsx` | 61 | 2 |  |  |
| M | `styles.css` | 29 | 5 |  |  |
| M | `utils.js` | 67 | 3 |  |  |
| M | `vite.config.js` | 43 | 1 | 1 | `/proxy` |

### `frontend/api/` (1)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| A | `proxy.js` | 127 | 0 |  |  |

### `frontend/components/` (6)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `ConfirmDialog.jsx` | 2 | 0 |  |  |
| M | `Creator.jsx` | 1 | 1 |  |  |
| M | `DiceRoller.jsx` | 313 | 38 |  |  |
| M | `Shared.jsx` | 150 | 8 |  |  |
| M | `Sheet.jsx` | 2537 | 303 |  |  |
| M | `SheetTabs.jsx` | 485 | 160 |  |  |

### `frontend/data/` (5)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `i18n.js` | 14 | 2 |  |  |
| M | `monsters-srd521.js` | 14 | 14 |  |  |
| M | `species-2024.js` | 75 | 0 |  |  |
| A | `spell-mechanics.json` | 1 | 0 |  |  |
| A | `spell-tags.json` | 1 | 0 |  |  |

### `frontend/src/` (1)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `mobile-styles.css` | 1 | 1 |  |  |

### `frontend/src/api/` (4)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `client.js` | 81 | 18 | 90 | `/campaigns/:id_or_slug/pulse`, `/campaigns/:id_or_slug/diary/sessions/:number/end`, `/characters/:pk/table-roll`, `/combat/campaign/:id_or_slug/prev-turn`, `/combat/campaign/:id_or_slug/encounter`, `/combat/campaign/:id_or_slug/undo`, `/combat/campaign/:id_or_slug/map-from`, `/combat/campaign/:id_or_slug/actions/:ref` |
| A | `combat-sets.js` | 65 | 0 |  |  |
| M | `errors.js` | 20 | 4 |  |  |
| M | `storage.js` | 3 | 2 |  |  |

### `frontend/src/auth/` (1)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `AuthScreen.jsx` | 1 | 1 |  |  |

### `frontend/src/campaigns/` (26)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `CampaignDetail.jsx` | 271 | 80 |  |  |
| M | `CampaignList.jsx` | 146 | 108 |  |  |
| M | `CombatActionPanel.jsx` | 69 | 32 |  |  |
| M | `CombatGrid.jsx` | 75 | 28 |  |  |
| M | `CombatTab.jsx` | 773 | 176 |  |  |
| M | `CombatantSheet.jsx` | 113 | 77 |  |  |
| M | `DMCharacterEditor.jsx` | 4 | 1 |  |  |
| M | `DiaryTab.jsx` | 349 | 186 |  |  |
| M | `EndOfEncounterPanel.jsx` | 54 | 8 |  |  |
| M | `InviteChoice.jsx` | 40 | 43 |  |  |
| M | `MonsterPicker.jsx` | 181 | 15 |  |  |
| M | `NudgeList.jsx` | 3 | 1 |  |  |
| M | `RollRequestPanel.jsx` | 2 | 2 |  |  |
| M | `TableNow.jsx` | 5 | 616 |  |  |
| M | `combat-styles.css` | 275 | 13 |  |  |
| M | `cover-picker.css` | 2 | 1 |  |  |
| M | `diary-styles.css` | 94 | 65 |  |  |
| M | `diary-summary.js` | 131 | 8 |  |  |
| M | `dm-desktop.css` | 19 | 0 |  |  |
| M | `end-of-encounter.js` | 11 | 2 |  |  |
| M | `import-5emm.js` | 59 | 7 |  |  |
| M | `monster-actions.js` | 13 | 3 |  |  |
| M | `nudges.js` | 1 | 1 |  |  |
| M | `table-now.css` | 2 | 0 |  |  |
| M | `token-label.js` | 14 | 0 |  |  |
| A | `url-monster-importer.js` | 1742 | 0 | 1 | `/proxy` |

### `frontend/src/checks/` (5)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `CheckRequestCard.jsx` | 7 | 3 |  |  |
| M | `GroupCheckPanel.jsx` | 151 | 27 |  |  |
| M | `PlayerCampaignChecks.jsx` | 6 | 4 |  |  |
| M | `check-logic.js` | 55 | 1 |  |  |
| M | `checks-styles.css` | 54 | 5 |  |  |

### `frontend/src/combat/` (8)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `EncounterDifficulty.jsx` | 1 | 1 |  |  |
| M | `MonsterImportPanel.jsx` | 3 | 3 |  |  |
| A | `MonsterStatblock.jsx` | 541 | 0 |  |  |
| A | `common-monsters.js` | 66 | 0 |  |  |
| A | `encounter-setup.js` | 237 | 0 |  |  |
| A | `monster-action-skills.js` | 182 | 0 |  |  |
| A | `monster-statblock.css` | 524 | 0 |  |  |
| M | `monster-tools.css` | 102 | 0 |  |  |

### `frontend/src/creator/steps/` (1)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `details.jsx` | 1 | 1 |  |  |

### `frontend/src/dice/` (15)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| A | `BeltMultiRoll.jsx` | 122 | 0 |  |  |
| M | `DiceStage.jsx` | 227 | 9 |  |  |
| M | `DieShape.jsx` | 514 | 22 |  |  |
| A | `MultiRoll.jsx` | 542 | 0 |  |  |
| A | `active-char.js` | 6 | 0 |  |  |
| A | `dice-gestures.js` | 219 | 0 |  |  |
| A | `dice-rollup.js` | 367 | 0 |  |  |
| M | `dice-styles.css` | 1410 | 2 |  |  |
| A | `dice-table.js` | 126 | 0 |  |  |
| A | `dice-tessellation.js` | 521 | 0 |  |  |
| A | `dice-text.js` | 389 | 0 |  |  |
| A | `dice-text.jsx` | 175 | 0 |  |  |
| M | `dice-tones.js` | 8 | 6 |  |  |
| A | `multi-roll.js` | 279 | 0 |  |  |
| A | `sheet-roll.js` | 289 | 0 |  |  |

### `frontend/src/group/` (25)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `GroupArea.jsx` | 81 | 24 |  |  |
| M | `GroupConfirm.jsx` | 15 | 58 |  |  |
| A | `InsightsSheets.jsx` | 279 | 0 |  |  |
| M | `InviteCard.jsx` | 24 | 17 |  |  |
| A | `Moments.jsx` | 439 | 0 |  |  |
| M | `MoreMenu.jsx` | 52 | 11 |  |  |
| A | `PartyInsights.jsx` | 983 | 0 |  |  |
| M | `PlayersPanel.jsx` | 365 | 103 |  |  |
| A | `Radar.jsx` | 53 | 0 |  |  |
| M | `RequestsPanel.jsx` | 216 | 170 |  |  |
| M | `group-api.js` | 5 | 4 | 3 |  |
| M | `group-model.js` | 51 | 0 |  |  |
| M | `group-styles.css` | 241 | 141 |  |  |
| A | `idea-titles.js` | 79 | 0 |  |  |
| A | `insights-api.js` | 138 | 0 | 2 | `/campaigns/:id_or_slug/party-insights`, `/campaigns/:id_or_slug/party-insights/history` |
| A | `insights-sections.js` | 103 | 0 |  |  |
| A | `insights.css` | 460 | 0 |  |  |
| A | `moment-words.js` | 128 | 0 |  |  |
| A | `party-best.js` | 39 | 0 |  |  |
| A | `party-metrics.js` | 572 | 0 |  |  |
| A | `radar-layout.js` | 103 | 0 |  |  |
| A | `spotlights.js` | 668 | 0 |  |  |
| A | `useRaioX.js` | 35 | 0 |  |  |
| A | `useTouchHold.js` | 28 | 0 |  |  |
| A | `versus.js` | 272 | 0 |  |  |

### `frontend/src/home/` (1)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `HomeActions.jsx` | 1 | 1 |  |  |

### `frontend/src/plans/` (4)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `ClosedCampaignBanner.jsx` | 21 | 2 |  |  |
| M | `LimitDialog.jsx` | 47 | 55 |  |  |
| M | `MyPlan.jsx` | 2 | 2 |  |  |
| M | `plans.css` | 19 | 18 |  |  |

### `frontend/src/play/` (33)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| A | `AdventureNow.jsx` | 74 | 0 |  |  |
| M | `AttackResultCard.jsx` | 21 | 3 |  |  |
| A | `DamagePad.jsx` | 229 | 0 |  |  |
| A | `EndSessionSheet.jsx` | 174 | 0 |  |  |
| M | `InScenePanel.jsx` | 24 | 59 |  |  |
| A | `MomentPanel.jsx` | 147 | 0 |  |  |
| A | `NowPanel.jsx` | 757 | 0 |  |  |
| A | `NowParts.jsx` | 372 | 0 |  |  |
| M | `PlayArea.jsx` | 52 | 20 |  |  |
| D | `RecapCard.jsx` | 0 | 99 |  |  |
| A | `RecapEditor.jsx` | 270 | 0 |  |  |
| M | `RollRows.jsx` | 32 | 2 |  |  |
| M | `SaveResultCard.jsx` | 64 | 11 |  |  |
| A | `SceneNowCard.jsx` | 236 | 0 |  |  |
| D | `ScreenPanel.jsx` | 0 | 220 |  |  |
| M | `SessionPlanPanel.jsx` | 2 | 2 |  |  |
| A | `StagePanel.jsx` | 321 | 0 |  |  |
| A | `StartCombatSheet.jsx` | 271 | 0 |  |  |
| A | `StartSessionSheet.jsx` | 151 | 0 |  |  |
| M | `TestsPanel.jsx` | 89 | 23 |  |  |
| M | `attack-model.js` | 68 | 4 |  |  |
| A | `combat-actions.js` | 142 | 0 |  |  |
| A | `damage-model.js` | 281 | 0 |  |  |
| A | `end-session.js` | 211 | 0 |  |  |
| M | `flash.js` | 37 | 4 |  |  |
| A | `now-model.js` | 330 | 0 |  |  |
| A | `now.css` | 200 | 0 |  |  |
| M | `play-api.js` | 18 | 19 | 6 | `/combat/campaign/:id_or_slug/save-preview` |
| M | `play-styles.css` | 69 | 68 |  |  |
| A | `scene-actions.js` | 158 | 0 |  |  |
| M | `screen-now.js` | 8 | 3 |  |  |
| A | `table-store.js` | 386 | 0 |  |  |
| A | `undo-model.js` | 101 | 0 |  |  |

### `frontend/src/player/` (6)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `PlayerTable.jsx` | 133 | 31 |  |  |
| M | `PlayerWorld.jsx` | 110 | 20 |  |  |
| M | `RevealToast.jsx` | 7 | 4 |  |  |
| M | `player-model.js` | 86 | 5 |  |  |
| M | `player-styles.css` | 104 | 25 |  |  |
| M | `reveal-toast-model.js` | 49 | 14 |  |  |

### `frontend/src/player/living/` (1)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `living.css` | 3 | 3 |  |  |

### `frontend/src/prep/` (20)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| A | `EntrySheet.jsx` | 23 | 0 |  |  |
| M | `MapCanvas.jsx` | 10 | 3 |  |  |
| M | `NextSession.jsx` | 1205 | 321 |  |  |
| M | `NodeEditor.jsx` | 233 | 210 |  |  |
| M | `NodeList.jsx` | 3 | 2 |  |  |
| M | `PlayPanel.jsx` | 59 | 60 |  |  |
| M | `PrepTab.jsx` | 84 | 34 |  |  |
| M | `PrepareArea.jsx` | 12 | 36 |  |  |
| A | `ReadySheet.jsx` | 20 | 0 |  |  |
| A | `SceneBlocks.jsx` | 511 | 0 |  |  |
| A | `SceneSheet.jsx` | 666 | 0 |  |  |
| M | `WorldRefs.jsx` | 92 | 59 |  |  |
| M | `next-session.css` | 243 | 109 |  |  |
| M | `next-session.js` | 337 | 42 |  |  |
| M | `prep-api.js` | 68 | 5 | 6 |  |
| M | `prep-styles.css` | 41 | 3 |  |  |
| M | `prep-world.js` | 1 | 1 | 1 |  |
| A | `scene-model.js` | 613 | 0 |  |  |
| A | `scene-sheet.css` | 204 | 0 |  |  |
| M | `usePrepConfirm.jsx` | 20 | 53 |  |  |

### `frontend/src/progression/` (2)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `ResourcesCard.jsx` | 12 | 1 |  |  |
| M | `rules.js` | 1 | 1 |  |  |

### `frontend/src/ready/` (2)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `ready-logic.js` | 2 | 2 | 2 |  |
| M | `ready.css` | 1 | 8 |  |  |

### `frontend/src/screen/` (6)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `TVScreen.jsx` | 607 | 211 |  |  |
| A | `roll-queue.js` | 243 | 0 |  |  |
| A | `tv-fit.js` | 56 | 0 |  |  |
| M | `tv-logic.js` | 251 | 2 |  |  |
| A | `tv-names.json` | 1 | 0 |  |  |
| M | `tv-styles.css` | 785 | 808 |  |  |

### `frontend/src/sheet/` (12)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `CampaignLinkModal.jsx` | 107 | 20 |  |  |
| M | `FhChecks.jsx` | 18 | 4 |  |  |
| M | `FhFeatures.jsx` | 3 | 2 |  |  |
| A | `SheetRollTarget.jsx` | 40 | 0 |  |  |
| A | `VersionsModal.jsx` | 306 | 0 |  |  |
| M | `campaign-link.css` | 9 | 0 |  |  |
| M | `campaign-link.js` | 14 | 12 |  |  |
| M | `ficha.css` | 5013 | 2228 |  |  |
| A | `npc-link.js` | 119 | 0 |  |  |
| A | `spell-text.js` | 60 | 0 |  |  |
| A | `versions.css` | 63 | 0 |  |  |
| A | `versions.js` | 308 | 0 |  |  |

### `frontend/src/shell/` (20)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `AdvancedDice.jsx` | 277 | 261 |  |  |
| M | `AreaNav.jsx` | 24 | 4 |  |  |
| M | `CampaignHeader.jsx` | 90 | 90 |  |  |
| A | `GmGuide.jsx` | 114 | 0 |  |  |
| M | `MesaPc.jsx` | 39 | 6 |  |  |
| M | `MesaSheet.jsx` | 64 | 13 |  |  |
| M | `MoreSheet.jsx` | 26 | 8 |  |  |
| A | `NextStepCard.jsx` | 105 | 0 |  |  |
| M | `Onboarding.jsx` | 21 | 3 |  |  |
| M | `QuickSearch.jsx` | 9 | 5 |  |  |
| M | `SettingsMenu.jsx` | 295 | 182 |  |  |
| M | `ToneAccentFields.jsx` | 9 | 6 |  |  |
| A | `WhatsNew.jsx` | 46 | 0 |  |  |
| A | `guide-model.js` | 193 | 0 |  |  |
| A | `guide.css` | 53 | 0 |  |  |
| M | `mesa.css` | 95 | 14 |  |  |
| A | `next-step.js` | 394 | 0 |  |  |
| A | `prepared-dice.js` | 227 | 0 |  |  |
| M | `shell-logic.js` | 189 | 25 |  |  |
| M | `shell.css` | 256 | 77 |  |  |

### `frontend/src/shell/legacy/` (1)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `LegacyTabs.jsx` | 3 | 3 |  |  |

### `frontend/src/stage/` (15)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| A | `LiveScreenSheet.jsx` | 261 | 0 |  |  |
| A | `MiniPlayer.jsx` | 98 | 0 |  |  |
| A | `ScreenWindow.jsx` | 201 | 0 |  |  |
| A | `ShowOnTable.jsx` | 200 | 0 |  |  |
| A | `ShowSheet.jsx` | 306 | 0 |  |  |
| A | `StageThumb.jsx` | 95 | 0 |  |  |
| A | `TableBar.jsx` | 249 | 0 |  |  |
| A | `roll-rules.js` | 109 | 0 |  |  |
| A | `show-model.js` | 141 | 0 |  |  |
| A | `stage-api.js` | 261 | 0 | 7 | `/campaigns/:id_or_slug/stage`, `/campaigns/:id_or_slug/stage/scene` |
| A | `stage-legacy.js` | 14 | 0 |  |  |
| A | `stage-now.js` | 328 | 0 | 3 | `/campaigns/:id_or_slug/stage-image`, `/combat/campaign/:id_or_slug/map-image` |
| A | `stage.css` | 563 | 0 |  |  |
| A | `table-bar-model.js` | 415 | 0 |  |  |
| A | `useStage.js` | 20 | 0 |  |  |

### `frontend/src/world/` (16)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `Atlas.jsx` | 184 | 56 |  |  |
| M | `EntryCard.jsx` | 155 | 16 | 1 |  |
| M | `EntryEditor.jsx` | 566 | 76 |  |  |
| A | `GrowTextarea.jsx` | 35 | 0 |  |  |
| M | `ImproviseModal.jsx` | 3 | 2 |  |  |
| M | `LinksField.jsx` | 1 | 1 |  |  |
| M | `RevealControl.jsx` | 69 | 6 |  |  |
| M | `Timeline.jsx` | 47 | 17 | 1 |  |
| M | `WorldArea.jsx` | 95 | 56 |  |  |
| M | `WorldMap.jsx` | 727 | 106 | 1 |  |
| M | `image.js` | 184 | 34 |  |  |
| A | `map-labels.js` | 137 | 0 |  |  |
| M | `world-api.js` | 58 | 11 | 14 | `/campaigns/:id_or_slug/world/ingest`, `/campaigns/:id_or_slug/session-plan/archive`, `/campaigns/:id_or_slug/session-plan/restore` |
| A | `world-finish.css` | 29 | 0 |  |  |
| M | `world-model.js` | 125 | 5 |  |  |
| M | `world-styles.css` | 765 | 45 |  |  |

### `frontend/src/world/living/` (5)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| M | `BlankPages.jsx` | 2 | 1 |  |  |
| M | `LivingWorld.jsx` | 50 | 29 |  |  |
| M | `SkyAtlas.jsx` | 94 | 20 |  |  |
| M | `living-logic.js` | 30 | 0 |  |  |
| M | `living.css` | 36 | 2 |  |  |

### `frontend/tests/` (59)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| A | `action-skills-gestures.test.js` | 161 | 0 |  |  |
| A | `atlas-move.test.js` | 48 | 0 |  |  |
| M | `campaign-link.test.js` | 5 | 5 |  |  |
| M | `checks.test.js` | 53 | 1 |  |  |
| A | `combat-sets.test.js` | 73 | 0 |  |  |
| A | `common-monsters.test.js` | 48 | 0 |  |  |
| A | `damage-model.test.js` | 203 | 0 |  |  |
| M | `diary-summary.test.js` | 100 | 0 |  |  |
| A | `dice-rollup.test.js` | 249 | 0 |  |  |
| A | `dice-table.test.js` | 90 | 0 |  |  |
| A | `dice-tessellation.test.js` | 361 | 0 |  |  |
| A | `dice-text-click-roll.test.js` | 189 | 0 |  |  |
| A | `encounter-setup.test.js` | 147 | 0 |  |  |
| M | `end-of-encounter.test.js` | 17 | 5 |  |  |
| A | `end-session.test.js` | 111 | 0 |  |  |
| M | `group-model.test.js` | 53 | 1 |  |  |
| A | `guide-model.test.js` | 122 | 0 |  |  |
| A | `insights-sections.test.js` | 63 | 0 |  |  |
| M | `living-logic.test.js` | 20 | 1 |  |  |
| A | `map-labels.test.js` | 185 | 0 |  |  |
| A | `moment-words.test.js` | 141 | 0 |  |  |
| A | `monster-statblock-fidelity.test.js` | 130 | 0 |  |  |
| A | `multi-char-inspiration-skills.test.js` | 120 | 0 |  |  |
| A | `multi-roll.test.js` | 113 | 0 |  |  |
| M | `next-session.test.js` | 218 | 28 |  |  |
| A | `next-step.test.js` | 369 | 0 |  |  |
| A | `old-server.test.js` | 39 | 0 |  |  |
| A | `party-gaps.test.js` | 223 | 0 |  |  |
| A | `party-metrics.test.js` | 333 | 0 |  |  |
| M | `play-model.test.js` | 233 | 1 |  |  |
| M | `player-model.test.js` | 79 | 1 |  |  |
| A | `prepared-dice.test.js` | 209 | 0 |  |  |
| A | `radar-layout.test.js` | 85 | 0 |  |  |
| M | `ready.test.js` | 2 | 2 |  |  |
| M | `reveal-toast-model.test.js` | 30 | 0 |  |  |
| A | `roll-queue.test.js` | 163 | 0 |  |  |
| A | `roll-rules.test.js` | 57 | 0 |  |  |
| A | `scene-model.test.js` | 365 | 0 |  |  |
| M | `sheet-export.test.js` | 5 | 1 |  |  |
| A | `sheet-roll.test.js` | 378 | 0 |  |  |
| A | `sheet-skills-vignette-enhancements.test.js` | 207 | 0 |  |  |
| M | `shell-logic.test.js` | 159 | 18 |  |  |
| A | `show-model.test.js` | 131 | 0 |  |  |
| M | `species-innate-spells.test.js` | 1 | 1 |  |  |
| A | `speed.test.js` | 158 | 0 |  |  |
| A | `spotlights.test.js` | 321 | 0 |  |  |
| A | `stage-api-calls.test.js` | 35 | 0 |  |  |
| A | `stage-now.test.js` | 196 | 0 |  |  |
| A | `subclass-spells-hud-linking.test.js` | 73 | 0 |  |  |
| A | `table-bar-model.test.js` | 332 | 0 |  |  |
| M | `token-label.test.js` | 12 | 0 |  |  |
| A | `top-hud-campaigns-tools.test.js` | 135 | 0 |  |  |
| M | `tv-logic.test.js` | 270 | 2 |  |  |
| A | `ui-words.test.js` | 129 | 0 |  |  |
| A | `undo-model.test.js` | 69 | 0 |  |  |
| A | `url-monster-importer.test.js` | 528 | 0 |  |  |
| A | `versions.test.js` | 173 | 0 |  |  |
| A | `versus.test.js` | 133 | 0 |  |  |
| M | `world-model.test.js` | 202 | 1 |  |  |

### `frontend/tests/fixtures/` (1)

| | Arquivo | + | − | Rotas | Das quais fora de produção |
|---|---|---|---|---|---|
| A | `party-jogo-e-combate.json` | 893 | 0 |  |  |

## 5. Fora de `frontend/` e `backend/`

| | Arquivo | + | − |
|---|---|---|---|
| A | `.impeccable/critique/2026-11-06T17-55-01Z__frontend-src-shell-settingsmenu-jsx.md` | 130 | 0 |
| A | `ADR.md` | 1298 | 0 |
| M | `API.md` | 54 | 0 |
| A | `ARCHITECTURE.md` | 221 | 0 |
| A | `AUDIT.md` | 171 | 0 |
| A | `CRITIQUE.md` | 126 | 0 |
| A | `DATA_ENGINEERING.md` | 207 | 0 |
| M | `DEPLOY.md` | 46 | 0 |
| A | `DESIGN.md` | 171 | 0 |
| A | `PRODUCT.md` | 83 | 0 |
| M | `README.md` | 4 | 3 |
| A | `ROADMAP.md` | 105 | 0 |
| A | `SPEC_BELT_HIVE_STATS_HANDOFF.md` | 523 | 0 |
| A | `SYSTEM_MAP.md` | 151 | 0 |
| A | `TECH_DEBT.md` | 152 | 0 |
| A | `api/proxy.js` | 127 | 0 |
| A | `docs/character-versions.md` | 117 | 0 |
| A | `docs/sync-ledger.md` | 535 | 0 |
| A | `docs/sync-spec.md` | 144 | 0 |
| A | `scripts/build-spell-tags.mjs` | 211 | 0 |
| M | `scripts/import-open5e-monsters.mjs` | 17 | 1 |
| A | `scripts/tv-names.mjs` | 14 | 0 |
| M | `vercel.json` | 1 | 0 |

## 6. Conferência

- Arquivos alterados no intervalo: **384** = 27 módulos Python do backend (§1–2) + 28 outros do backend (§3) + 306 do frontend (§4) + 23 fora das duas pastas (§5).
- Views com rota: **26** novas, **33** alteradas. Funções sem rota: **252** novas, **44** alteradas, **2** removidas.

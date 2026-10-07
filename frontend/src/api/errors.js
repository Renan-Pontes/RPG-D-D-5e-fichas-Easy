// Códigos de erro do backend → texto legível (PT/EN), num lugar só.
//
// O backend responde `{ error: '<código>', detail?, issues? }` (ver
// backend/api/exception_handler.py). Nas negações de permissão o código útil
// vem em `detail` (ex.: error 'forbidden', detail 'dm_only').
// Uso: `errorMessage(e, lang)` em qualquer catch que mostre erro ao usuário.

const E = {
  // Conexão / sessão
  network: ['Sem conexão com o servidor. Verifique a internet e tente de novo.', 'No connection to the server. Check your internet and try again.'],
  backend_unavailable: ['O servidor não respondeu direito. Tente de novo em instantes.', 'The server did not respond properly. Try again shortly.'],
  auth_required: ['Sua sessão expirou. Entre de novo.', 'Your session expired. Please log in again.'],
  auth_failed: ['Não foi possível confirmar seu login. Entre de novo.', 'Could not verify your login. Please log in again.'],
  rate_limited: ['Muitas tentativas seguidas. Espere um pouco e tente de novo.', 'Too many attempts. Wait a moment and try again.'],
  method_not_allowed: ['Ação não permitida.', 'Action not allowed.'],
  // Permissão / não encontrado
  forbidden: ['Você não tem permissão para isso.', "You don't have permission to do that."],
  dm_only: ['Só o mestre pode fazer isso.', 'Only the DM can do that.'],
  owner_only: ['Só o dono pode fazer isso.', 'Only the owner can do that.'],
  not_a_member: ['Você não participa desta campanha.', "You're not in this campaign."],
  not_a_target: ['Este pedido não é para você.', 'This request is not for you.'],
  not_your_combatant: ['Este combatente não é seu.', 'This combatant is not yours.'],
  character_not_owned: ['Este personagem não é seu.', 'This character is not yours.'],
  character_forbidden: ['Você não pode usar este personagem.', "You can't use this character."],
  dm_gives_items_in_campaign: ['Em campanha, itens são entregues pelo mestre.', 'In a campaign, items are given by the DM.'],
  not_found: ['Não encontrado (pode ter sido apagado).', 'Not found (it may have been deleted).'],
  campaign_not_found: ['Campanha não encontrada.', 'Campaign not found.'],
  character_not_found: ['Personagem não encontrado.', 'Character not found.'],
  combatant_not_found: ['Combatente não encontrado (talvez já tenha saído do combate).', 'Combatant not found (it may have left combat).'],
  attacker_not_found: ['Atacante não encontrado no combate.', 'Attacker not found in combat.'],
  item_not_found: ['Item não encontrado.', 'Item not found.'],
  // Conta / campanha
  invalid_credentials: ['E-mail ou senha incorretos.', 'Wrong email or password.'],
  email_taken: ['E-mail já cadastrado.', 'Email already registered.'],
  invite_invalid: ['Código de convite inválido. Confira com o mestre (letras e números, sem espaços).', 'Invalid invite code. Check it with your DM (letters and numbers, no spaces).'],
  character_already_in_campaign: ['Este personagem já está em outra campanha. Escolha outro ou crie um novo.', 'This character is already in another campaign. Pick another or create a new one.'],
  cannot_remove_dm: ['O mestre não pode ser removido da campanha.', 'The DM cannot be removed from the campaign.'],
  dm_cannot_leave: ['O mestre não pode sair da própria campanha.', "The DM can't leave their own campaign."],
  fields_locked_in_campaign: ['Em campanha, esses campos só mudam pelo mestre ou pela subida de nível.', 'In a campaign, these fields change only via the DM or leveling up.'],
  fields_forbidden_in_campaign: ['Em campanha, esses campos só mudam pelo mestre.', 'In a campaign, these fields are changed by the DM only.'],
  campaign_uses_milestones: ['Esta campanha usa Marcos, não XP. Mude o modo de progressão para XP para distribuir XP.', 'This campaign uses Milestones, not XP. Switch leveling to XP to award XP.'],
  no_players: ['Não há jogadores na campanha.', 'There are no players in the campaign.'],
  no_characters: ['Nenhum personagem escolhido.', 'No character selected.'],
  target_not_player: ['O alvo precisa ser um jogador da campanha.', 'The target must be a campaign player.'],
  // Subida de nível / opções
  not_unlocked: ['A subida de nível ainda não foi liberada pelo mestre.', 'Level up has not been unlocked by the DM yet.'],
  invalid_levelup: ['Escolhas de subida de nível incompletas ou inválidas.', 'Level-up choices are incomplete or invalid.'],
  invalid_level: ['Nível inválido.', 'Invalid level.'],
  invalid_choice: ['Escolha inválida.', 'Invalid choice.'],
  invalid_options: ['Opções de classe inválidas.', 'Invalid class options.'],
  multiclass_not_allowed: ['O mestre não liberou multiclasse nesta subida.', 'The DM did not allow multiclassing for this level.'],
  multiclass_prereq: ['Atributos insuficientes para essa multiclasse.', 'Ability scores too low for that multiclass.'],
  already_resolved: ['Este pedido já foi resolvido.', 'This request was already resolved.'],
  // Recursos / descanso / forma selvagem
  unknown_resource: ['Recurso desconhecido.', 'Unknown resource.'],
  invalid_resources: ['Recursos inválidos.', 'Invalid resources.'],
  invalid_resource_action: ['Ação de recurso inválida.', 'Invalid resource action.'],
  no_uses_remaining: ['Sem usos restantes.', 'No uses left.'],
  restore_needs_rest: ['Isso só volta com descanso.', 'That only comes back with a rest.'],
  invalid_rest_type: ['Tipo de descanso inválido.', 'Invalid rest type.'],
  not_druid: ['Só druidas usam Forma Selvagem.', 'Only druids can Wild Shape.'],
  invalid_beast: ['Fera inválida.', 'Invalid beast.'],
  beast_not_eligible: ['Essa fera não está disponível no seu nível.', 'That beast is not available at your level.'],
  // Itens
  attunement_limit_reached: ['Limite de sintonização atingido (3 itens).', 'Attunement limit reached (3 items).'],
  item_does_not_require_attunement: ['Este item não exige sintonização.', 'This item does not require attunement.'],
  missing_item_name: ['Dê um nome ao item.', 'Give the item a name.'],
  invalid_item: ['Item inválido.', 'Invalid item.'],
  invalid_value_item: ['Valor do item inválido.', 'Invalid item value.'],
  item_too_large: ['Item grande demais (texto ou imagem).', 'Item too large (text or image).'],
  catalog_full: ['O catálogo de itens da campanha está cheio.', 'The campaign item catalog is full.'],
  // Combate
  recharging: ['Recarregando: role d6 no início do turno.', 'Recharging: rolls d6 at the start of its turn.'],
  no_uses_left: ['Sem usos restantes.', 'No uses left.'],
  no_legendary_actions: ['Ações lendárias insuficientes nesta rodada.', 'Not enough legendary actions this round.'],
  missing_targets: ['Escolha ao menos um alvo.', 'Pick at least one target.'],
  missing_target: ['Escolha um alvo.', 'Pick a target.'],
  invalid_targets: ['Alvos inválidos.', 'Invalid targets.'],
  invalid_action: ['Ação inválida.', 'Invalid action.'],
  invalid_action_index: ['Essa ação não existe mais neste combatente.', 'That action no longer exists on this combatant.'],
  invalid_action_type: ['Tipo de ação inválido.', 'Invalid action type.'],
  action_has_no_save: ['Essa ação não pede teste de resistência.', 'That action has no saving throw.'],
  missing_monster_data: ['Dados do monstro incompletos.', 'Incomplete monster data.'],
  monster_too_large: ['Monstro com dados grandes demais.', 'Monster data too large.'],
  unknown_condition: ['Condição desconhecida.', 'Unknown condition.'],
  immune: ['O alvo é imune.', 'The target is immune.'],
  // Rolagens / testes à mesa
  invalid_dice_type: ['Tipo de dado inválido.', 'Invalid die type.'],
  invalid_advantage: ['Vantagem inválida.', 'Invalid advantage.'],
  dc_out_of_range: ['CD fora do intervalo permitido.', 'DC out of range.'],
  natural_out_of_range: ['Valor do dado fora do intervalo.', 'Die value out of range.'],
  total_out_of_range: ['Total fora do intervalo.', 'Total out of range.'],
  override_out_of_range: ['Valor fora do intervalo.', 'Value out of range.'],
  invalid_override_value: ['Valor inválido.', 'Invalid value.'],
  too_many_values: ['Valores demais de uma vez.', 'Too many values at once.'],
  invalid_values: ['Valores inválidos.', 'Invalid values.'],
  missing_value: ['Informe um valor.', 'Enter a value.'],
  missing_label: ['Dê um nome ao teste.', 'Give the check a name.'],
  already_answered: ['Você já respondeu este teste.', 'You already answered this check.'],
  already_rolled: ['Já rolado.', 'Already rolled.'],
  check_closed: ['Este teste já foi encerrado pelo mestre.', 'This check was closed by the DM.'],
  invalid_checks: ['Testes inválidos.', 'Invalid checks.'],
  natural_one: ['1 natural.', 'Natural 1.'],
  // Diário
  empty_note: ['Escreva algo antes de salvar.', 'Write something before saving.'],
  diary_full: ['O diário atingiu o limite de entradas.', 'The diary reached its entry limit.'],
  invalid_visibility: ['Visibilidade inválida.', 'Invalid visibility.'],
  invalid_kind: ['Tipo de entrada inválido.', 'Invalid entry type.'],
  invalid_session: ['Sessão inválida.', 'Invalid session.'],
  missing_text: ['Escreva um texto.', 'Enter some text.'],
  // Preparação
  too_many_adventures: ['Limite de aventuras da campanha atingido.', 'Campaign adventure limit reached.'],
  adventure_too_large: ['Aventura grande demais para salvar.', 'Adventure too large to save.'],
  image_too_large: ['Imagem grande demais mesmo depois de comprimir. Tente uma menor.', 'Image still too large after compression. Try a smaller one.'],
  invalid_image: ['Imagem inválida.', 'Invalid image.'],
  invalid_node: ['Sala/cena inválida.', 'Invalid room/scene.'],
  invalid_node_id: ['Sala/cena inválida.', 'Invalid room/scene.'],
  duplicate_node_id: ['Duas salas/cenas com o mesmo id.', 'Two rooms/scenes share an id.'],
  invalid_edge: ['Conexão inválida no mapa.', 'Invalid map connection.'],
  duplicate_edge_id: ['Conexão duplicada no mapa.', 'Duplicate map connection.'],
  invalid_encounter: ['Encontro inválido.', 'Invalid encounter.'],
  invalid_hazards: ['Perigos inválidos.', 'Invalid hazards.'],
  invalid_treasure: ['Tesouro inválido.', 'Invalid treasure.'],
  invalid_treasure_item: ['Item de tesouro inválido.', 'Invalid treasure item.'],
  treasure_item_too_large: ['Item de tesouro grande demais.', 'Treasure item too large.'],
  missing_name: ['Dê um nome.', 'Enter a name.'],
  // Genéricos
  invalid: ['Dados inválidos.', 'Invalid data.'],
  invalid_input: ['Dados inválidos.', 'Invalid input.'],
  invalid_data: ['Dados inválidos.', 'Invalid data.'],
  invalid_patch: ['Alteração inválida.', 'Invalid change.'],
  invalid_type: ['Tipo inválido.', 'Invalid type.'],
  invalid_subtype: ['Subtipo inválido.', 'Invalid subtype.'],
  invalid_status: ['Situação inválida.', 'Invalid status.'],
  invalid_mode: ['Modo inválido.', 'Invalid mode.'],
  invalid_amount: ['Quantidade inválida.', 'Invalid amount.'],
  invalid_pagination: ['Página inválida.', 'Invalid page.'],
  // Mundo / telão
  version_conflict: ['Este cartão foi alterado em outra aba ou aparelho. Recarregue para ver a versão mais nova antes de salvar.', 'This card was changed in another tab or device. Reload to see the latest version before saving.'],
  entry_hidden: ['Este cartão está oculto. Revele (ou deixe conhecido de nome) antes de mostrar aos jogadores.', 'This card is hidden. Reveal it (or make it known by name) before showing it to players.'],
  entry_not_found: ['Cartão do mundo não encontrado (pode ter sido apagado).', 'World card not found (it may have been deleted).'],
  too_many_entries: ['O mundo desta campanha atingiu o limite de cartões.', "This campaign's world reached its card limit."],
  handout_private: ['Este material é só para alguns jogadores; não dá para mostrar no telão.', "This handout is for specific players only; it can't go on the shared screen."],
  world_not_empty: ['O mundo já tem cartões; o modelo inicial só entra num mundo vazio.', 'The world already has cards; the starter template only goes into an empty world.'],
  scene_not_found: ['Cena não encontrada (a aventura pode ter mudado).', 'Scene not found (the adventure may have changed).'],
  empty_recap: ['Escreva o resumo antes de mostrar.', 'Write the recap before showing it.'],
  no_image: ['Este cartão não tem imagem.', 'This card has no image.'],
  too_many_links: ['Ligações demais neste cartão.', 'Too many links on this card.'],
  too_many_secrets: ['Segredos demais neste cartão.', 'Too many secrets on this card.'],
  too_many_tags: ['Marcadores demais neste cartão.', 'Too many tags on this card.'],
  too_many_pins: ['Marcadores demais neste mapa.', 'Too many pins on this map.'],
  unknown_secret: ['Esse segredo não existe mais no cartão.', 'That secret no longer exists on the card.'],
  unknown_pin: ['Esse marcador não existe mais no mapa.', 'That pin no longer exists on the map.'],
  body_too_long: ['Texto longo demais.', 'Text too long.'],
  notes_too_long: ['Anotações longas demais.', 'Notes too long.'],
  recap_too_long: ['Resumo longo demais.', 'Recap too long.'],
  // Planos / ciclo da campanha
  plan_limit: ['Você chegou a um limite do seu plano. Nada foi apagado — veja "Meu plano" para liberar mais.', 'You reached a limit of your plan. Nothing was deleted — see "My plan" to get more.'],
  campaign_closed: ['Esta campanha foi encerrada: agora ela é só para leitura. Baixe sua ficha enquanto dá (ou peça ao mestre para reabrir).', 'This campaign was closed: it is read-only now. Download your sheet while you can (or ask the GM to reopen it).'],
};

// Limite do plano por recurso (`limit` no corpo do erro plan_limit).
const PLAN_LIMIT = {
  images: ['Seu espaço de imagens encheu. Nada foi apagado — veja "Meu plano" para ter mais espaço.', 'Your image space is full. Nothing was deleted — see "My plan" for more space.'],
  campaigns: ['Você chegou ao limite de campanhas do seu plano. Encerre uma que acabou ou veja "Meu plano".', "You reached your plan's campaign limit. Close one that has ended or see \"My plan\"."],
  characters: ['Você chegou ao limite de personagens do seu plano. Nenhuma ficha foi apagada — veja "Meu plano".', "You reached your plan's character limit. No sheet was deleted — see \"My plan\"."],
  slots: ['A mesa está sem vagas e você já está no limite de personagens do seu plano.', 'The table has no free seats and you are already at your plan\'s character limit.'],
  cards: ['O mundo desta campanha chegou ao limite de 2.000 cartões.', "This campaign's world reached its 2,000-card limit."],
};

function currentLang() {
  try { return localStorage.getItem('dnd5e-forge:lang') || 'pt'; } catch { return 'pt'; }
}

/** Texto para um código conhecido, ou null. */
export function errorText(code, lang = currentLang()) {
  const m = code && E[code];
  return m ? (lang === 'en' ? m[1] : m[0]) : null;
}

/**
 * Mensagem legível para qualquer erro (ApiError, erro de rede, string).
 * `fallback` (opcional) substitui a mensagem genérica.
 */
export function errorMessage(e, lang = currentLang(), fallback) {
  if (!e) return fallback || errorText('invalid', lang);
  if (typeof e === 'string') return errorText(e, lang) || e;
  const data = e.data || {};
  if (Array.isArray(data.issues) && data.issues.length) return data.issues.join(' · ');
  if (data.error === 'plan_limit' && PLAN_LIMIT[data.limit]) return lang === 'en' ? PLAN_LIMIT[data.limit][1] : PLAN_LIMIT[data.limit][0];
  const byDetail = typeof data.detail === 'string' && /^[a-z_]+$/.test(data.detail) ? errorText(data.detail, lang) : null;
  const known = byDetail || errorText(data.error, lang) || errorText(e.message, lang);
  if (known) return known;
  // fetch() sem resposta (offline, CORS, timeout)
  if (e.name === 'TypeError' || e.name === 'AbortError' || e.name === 'TimeoutError') return errorText('network', lang);
  const code = data.error || e.message;
  if (fallback) return fallback;
  if (code && /^[a-z_]+$/.test(code)) {
    return lang === 'en' ? `Could not complete the action (code: ${code}).` : `Não foi possível concluir a ação (código: ${code}).`;
  }
  return code || (lang === 'en' ? 'Something went wrong. Try again.' : 'Algo deu errado. Tente de novo.');
}

/**
 * Avisos ("nudges") da mesa — funções puras, sem React (testáveis com node --test).
 *
 * Regra de produto: o app é ajudante do mestre. Um aviso SÓ sugere. Nada aqui
 * chama a API: cada aviso traz, no máximo, a descrição de uma ação (`op`) que a
 * interface executa quando o mestre clica em "Aplicar". O mestre pode dispensar
 * (some só para este evento) ou desligar o tipo (preferência em
 * `campaign.state.nudges`, vale em todos os aparelhos dele).
 *
 * Formato de um aviso:
 * {
 *   id: 'concentration:2026-…:Ana',   // estável enquanto o evento existir
 *   type: 'concentration',             // um dos NUDGE_TYPES
 *   severity: 'danger' | 'warn' | 'info',
 *   target: { kind: 'pc' | 'monster', name, characterId?, combatantId? },
 *   text: 'Ana sofreu 14 de dano concentrando em Bênção: salvaguarda de CON CD 10.',
 *   actions: [{ id, label, op }],      // op: ver runNudgeOp em NudgeList.jsx
 * }
 */

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

const COND_PT = {
  blinded: 'cego', charmed: 'enfeitiçado', deafened: 'surdo', frightened: 'amedrontado', grappled: 'agarrado',
  incapacitated: 'incapacitado', invisible: 'invisível', paralyzed: 'paralisado', petrified: 'petrificado',
  poisoned: 'envenenado', prone: 'caído', restrained: 'contido', stunned: 'atordoado', unconscious: 'inconsciente',
  exhaustion: 'exaustão', stable: 'estável', dead: 'morto',
};
/** Nome da condição no idioma (o combate guarda em inglês). */
export const conditionLabel = (c, lang = 'pt') => (lang === 'en' ? c : COND_PT[c] || c);

/**
 * Tipos de aviso. `default` = ligado quando o mestre nunca mexeu.
 * Desligados por padrão (os "barulhentos"): PV baixo e sem espaços de magia —
 * são estados que duram a sessão inteira e já aparecem nos cartões da Mesa
 * agora (barra de PV e resumo de espaços); como aviso viram ruído constante.
 */
export const NUDGE_TYPES = [
  { id: 'concentration', default: true, pt: 'Concentração ao sofrer dano', en: 'Concentration on damage',
    hintPt: 'CD = 10 ou metade do dano (o maior), até 30. Também avisa quando quem concentra cai a 0 PV.',
    hintEn: 'DC = 10 or half the damage (higher), max 30. Also warns when the concentrating creature drops to 0 HP.' },
  { id: 'zeroHp', default: true, pt: 'Criatura a 0 PV', en: 'Creature at 0 HP',
    hintPt: 'Personagem inconsciente e testes contra a morte; monstro a 0 PV ainda não marcado como derrotado.',
    hintEn: 'Unconscious character and death saves; monster at 0 HP not yet marked defeated.' },
  { id: 'recharge', default: true, pt: 'Recarga de monstro', en: 'Monster recharge',
    hintPt: 'No turno do monstro: habilidade pronta ou resultado do d6 de recarga.',
    hintEn: "On the monster's turn: ability ready or the recharge d6 result." },
  { id: 'legendary', default: true, pt: 'Ações lendárias restantes', en: 'Legendary actions left',
    hintPt: 'Durante o turno de outra criatura, lembra quantas ações lendárias o monstro ainda tem.',
    hintEn: "During another creature's turn, reminds how many legendary actions the monster has left." },
  { id: 'conditionEnd', default: true, pt: 'Condição com duração terminando', en: 'Timed condition ending',
    hintPt: 'Só para condições aplicadas com duração em rodadas.',
    hintEn: 'Only for conditions applied with a duration in rounds.' },
  { id: 'exhaustion', default: true, pt: 'Exaustão', en: 'Exhaustion',
    hintPt: 'Personagem com exaustão: lembra o efeito nos testes.',
    hintEn: 'Character with exhaustion: reminds the effect on tests.' },
  { id: 'lowHp', default: false, pt: 'PV baixo (menos de 25%)', en: 'Low HP (under 25%)',
    hintPt: 'Desligado por padrão: a barra de PV dos cartões já mostra isso.',
    hintEn: 'Off by default: the HP bar on the cards already shows it.' },
  { id: 'noSlots', default: false, pt: 'Sem espaços de magia', en: 'Out of spell slots',
    hintPt: 'Desligado por padrão: estado que dura até o descanso; o cartão já mostra.',
    hintEn: 'Off by default: lasts until a rest; the card already shows it.' },
];

const TYPE_IDS = new Set(NUDGE_TYPES.map(t => t.id));
const SEVERITY_ORDER = { danger: 0, warn: 1, info: 2 };

/** Preferências completas {tipo: bool} a partir de campaign.state.nudges. */
export function nudgePrefs(state) {
  const saved = (state && typeof state.nudges === 'object' && state.nudges) || {};
  const out = {};
  for (const t of NUDGE_TYPES) out[t.id] = typeof saved[t.id] === 'boolean' ? saved[t.id] : t.default;
  return out;
}

/** Novo campaign.state com o tipo ligado/desligado (grava explícito, vale em todos os aparelhos). */
export function stateWithNudgePref(state, type, on) {
  if (!TYPE_IDS.has(type)) return state || {};
  const cur = (state && typeof state.nudges === 'object' && state.nudges) || {};
  return { ...(state || {}), nudges: { ...cur, [type]: !!on } };
}

/** CD de concentração (SRD 5.2.1): 10 ou metade do dano, o que for maior, até 30. */
export function concentrationDc(damage) {
  const d = Math.max(0, Math.floor(Number(damage) || 0));
  return Math.min(30, Math.max(10, Math.floor(d / 2)));
}

// ---------------------------------------------------------------------------
// Concentração: quem está concentrando em quê.
// Fonte 1: campaign.state.concentration { 'char:<id>' | 'cb:<combatantId>': { spell } }
//          (o mestre marca na Mesa agora).
// Fonte 2: character.data.concentration (string ou { spell | name }) se a ficha tiver.
// ---------------------------------------------------------------------------
export const concentrationKey = (target) => (
  target?.characterId != null ? `char:${target.characterId}` : `cb:${target?.combatantId}`
);

function spellName(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v.spell || v.name || '';
  return '';
}

export function concentrationOf(state, { characterId, combatantId, data } = {}) {
  const map = (state && state.concentration) || {};
  if (characterId != null) {
    const s = spellName(map[`char:${characterId}`]);
    if (s) return { spell: s, key: `char:${characterId}`, fromSheet: false };
    const fromData = spellName(data?.concentration);
    if (fromData) return { spell: fromData, key: `char:${characterId}`, fromSheet: true };
  }
  if (combatantId != null) {
    const s = spellName(map[`cb:${combatantId}`]);
    if (s) return { spell: s, key: `cb:${combatantId}`, fromSheet: false };
  }
  return null;
}

/** Novo campaign.state com a concentração definida (spell vazio = remove). */
export function stateWithConcentration(state, key, spell) {
  const cur = { ...((state && state.concentration) || {}) };
  const s = String(spell || '').trim().slice(0, 80);
  if (s) cur[key] = { spell: s };
  else delete cur[key];
  return { ...(state || {}), concentration: cur };
}

// ---------------------------------------------------------------------------
// Log do combate
// ---------------------------------------------------------------------------
const TURN_MARKERS = new Set(['start', 'next_turn']);

/**
 * Entradas recentes: do início do turno anterior até agora (o mestre ainda tem
 * tempo de reagir, mas eventos velhos não voltam a incomodar).
 */
export function recentLog(log) {
  const list = Array.isArray(log) ? log : [];
  let seen = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (TURN_MARKERS.has(list[i]?.type)) {
      seen += 1;
      if (seen === 2) return list.slice(i);
    }
  }
  return list;
}

/** Entradas do turno atual (depois do último marcador de turno). */
export function currentTurnLog(log) {
  const list = Array.isArray(log) ? log : [];
  for (let i = list.length - 1; i >= 0; i--) {
    if (TURN_MARKERS.has(list[i]?.type)) return list.slice(i + 1);
  }
  return list;
}

/**
 * Eventos de dano do log: [{ key, target, amount, approx }].
 * `approx` = valor rolado (antes de resistências) quando o log não traz o dano sofrido.
 */
export function damageEvents(entries) {
  const out = [];
  for (const e of entries || []) {
    if (!e) continue;
    const ts = e.ts || '';
    if (e.type === 'damage' && e.amount > 0) {
      out.push({ key: `${ts}:${e.target}`, target: e.target, amount: e.amount, approx: false });
    } else if (e.type === 'attack' && e.hit) {
      if (typeof e.damage_taken === 'number') {
        if (e.damage_taken > 0) out.push({ key: `${ts}:${e.target}`, target: e.target, amount: e.damage_taken, approx: false });
      } else {
        const total = [e.damage, ...(e.extra_damage || [])].reduce((n, d) => n + (Number(d?.total) || 0), 0);
        if (total > 0) out.push({ key: `${ts}:${e.target}`, target: e.target, amount: total, approx: true });
      }
    } else if (e.type === 'save_aoe') {
      for (const p of e.per_target || []) {
        if (p?.damage_taken > 0) out.push({ key: `${ts}:${p.target_name}`, target: p.target_name, amount: p.damage_taken, approx: false });
      }
    } else if (e.type === 'player_attack') {
      if (e.damage_taken > 0) out.push({ key: `${ts}:${e.target}`, target: e.target, amount: e.damage_taken, approx: false });
      if (e.fallout_to && e.fallout_damage_taken > 0) {
        out.push({ key: `${ts}:${e.fallout_to}`, target: e.fallout_to, amount: e.fallout_damage_taken, approx: false });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Mesa: junta personagens da campanha e combatentes num "quem é quem"
// ---------------------------------------------------------------------------
function conSaveMod(c) {
  const st = c?.stats || {};
  if (st.saves && st.saves.con != null) return Number(st.saves.con) || 0;
  const con = st.abilities?.con;
  return con != null ? Math.floor((Number(con) - 10) / 2) : 0;
}

const fmtMod = (n) => (n >= 0 ? `+${n}` : `${n}`);

/**
 * Personagens da mesa com estado "vivo": se estão no combate, usa o combatente
 * (PV/condições do combate); senão, a ficha.
 */
export function partyStatus(campaign, combat) {
  const combatants = combat?.combatants || [];
  return (campaign?.members || [])
    .filter(m => m.role !== 'dm' && m.character)
    .map(m => {
      const ch = m.character;
      const d = ch.data || ch.summary || {};
      const cb = combatants.find(c => c.type === 'pc' && c.character_id === ch.id) || null;
      const hp = cb ? cb.current_hp : d.currentHp;
      const max = cb ? cb.stats?.max_hp : d.maxHp;
      return {
        memberId: m.id,
        userId: m.user?.id,
        characterId: ch.id,
        combatantId: cb?.id ?? null,
        name: ch.name,
        data: ch.data || null,
        hp: Number.isFinite(Number(hp)) ? Number(hp) : null,
        maxHp: Number.isFinite(Number(max)) ? Number(max) : null,
        tempHp: Number((cb ? cb.temp_hp : d.tempHp) || 0),
        conditions: [...((cb ? cb.conditions : d.conditions) || [])],
        deathSaves: (cb ? cb.death_saves : d.deathSaves) || { success: 0, fail: 0 },
        inCombat: !!cb,
      };
    });
}

function exhaustionLevel(p) {
  const n = Number(p.data?.exhaustion);
  if (Number.isFinite(n) && n > 0) return Math.min(6, Math.floor(n));
  return p.conditions.includes('exhaustion') ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Geração
// ---------------------------------------------------------------------------
/**
 * @param {object} args
 * @param {object} args.campaign   campanha (members com character.data para o mestre; state)
 * @param {object|null} args.combat estado do combate (GET /combat)
 * @param {string} [args.lang]
 * @param {object} [args.prefs]    {tipo: bool}; padrão = nudgePrefs(campaign.state)
 * @param {function} [args.slotsMax] (data) => [n1..n9] espaços máximos (Utils.spellSlots)
 * @returns aviso[] ordenados por gravidade
 */
export function buildNudges({ campaign, combat, lang = 'pt', prefs, slotsMax } = {}) {
  const on = prefs || nudgePrefs(campaign?.state);
  const state = campaign?.state || {};
  const out = [];
  const push = (n) => { if (on[n.type]) out.push(n); };

  const combatants = combat?.combatants || [];
  const active = !!combat?.active && combatants.length > 0;
  const round = combat?.round ?? 1;
  const turnIndex = combat?.turnIndex ?? 0;
  const current = active ? combatants[turnIndex] : null;
  const byName = new Map(combatants.map(c => [c.name, c]));
  const party = partyStatus(campaign, combat);
  const partyByCombatant = new Map(party.filter(p => p.combatantId).map(p => [p.combatantId, p]));
  const log = combat?.log || [];
  const recent = recentLog(log);
  const thisTurn = currentTurnLog(log);

  // --- Concentração ------------------------------------------------------
  const concOf = (c) => {
    const p = partyByCombatant.get(c.id);
    return concentrationOf(state, { characterId: p?.characterId ?? c.character_id ?? undefined, combatantId: c.id, data: p?.data });
  };
  for (const ev of damageEvents(recent)) {
    const c = byName.get(ev.target);
    if (!c) continue;
    const conc = concOf(c);
    if (!conc) continue;
    if ((c.current_hp ?? 1) <= 0) continue; // cair a 0 PV já encerra (aviso abaixo)
    const dc = concentrationDc(ev.amount);
    const p = partyByCombatant.get(c.id);
    const target = { kind: c.type === 'pc' ? 'pc' : 'monster', name: c.name, combatantId: c.id, characterId: p?.characterId };
    const actions = [];
    if (p?.userId != null) {
      actions.push({
        id: 'apply',
        label: L(lang, `Pedir CON CD ${dc}`, `Ask CON DC ${dc}`),
        op: {
          kind: 'check',
          body: {
            kind: 'save', key: 'con',
            label: L(lang, `Concentração (${conc.spell}) — Resistência de CON`, `Concentration (${conc.spell}) — CON save`).slice(0, 120),
            dc, dcHidden: false, advantage: 'normal', targetUserIds: [p.userId],
          },
        },
      });
    }
    actions.push({
      id: 'lost',
      label: L(lang, 'Perdeu a concentração', 'Lost concentration'),
      op: { kind: 'clearConcentration', key: conc.key, characterId: conc.fromSheet ? p?.characterId : undefined },
    });
    const approx = ev.approx ? L(lang, ' (dano rolado, antes de resistências)', ' (rolled damage, before resistances)') : '';
    const mod = c.type === 'monster' ? ` (CON ${fmtMod(conSaveMod(c))})` : '';
    push({
      id: `concentration:${ev.key}`,
      type: 'concentration', severity: 'danger', target,
      text: L(lang,
        `${c.name} sofreu ${ev.amount} de dano${approx} concentrando em ${conc.spell}: salvaguarda de CON CD ${dc}${mod}.`,
        `${c.name} took ${ev.amount} damage${approx} while concentrating on ${conc.spell}: CON save DC ${dc}${mod}.`),
      actions,
    });
  }
  // Quem concentra e caiu a 0 PV (combate ou ficha).
  const downConc = [];
  for (const c of combatants) {
    if ((c.current_hp ?? 1) > 0) continue;
    const conc = concOf(c);
    if (conc) downConc.push({ name: c.name, conc, kind: c.type === 'pc' ? 'pc' : 'monster', combatantId: c.id, characterId: partyByCombatant.get(c.id)?.characterId });
  }
  for (const p of party) {
    if (p.inCombat || p.hp == null || p.hp > 0) continue;
    const conc = concentrationOf(state, { characterId: p.characterId, data: p.data });
    if (conc) downConc.push({ name: p.name, conc, kind: 'pc', characterId: p.characterId });
  }
  for (const d of downConc) {
    push({
      id: `concentration-down:${d.conc.key}`,
      type: 'concentration', severity: 'warn',
      target: { kind: d.kind, name: d.name, combatantId: d.combatantId, characterId: d.characterId },
      text: L(lang,
        `${d.name} está a 0 PV: a concentração em ${d.conc.spell} termina (incapacitado).`,
        `${d.name} is at 0 HP: concentration on ${d.conc.spell} ends (incapacitated).`),
      actions: [{
        id: 'apply', label: L(lang, 'Encerrar concentração', 'End concentration'),
        op: { kind: 'clearConcentration', key: d.conc.key, characterId: d.conc.fromSheet ? d.characterId : undefined },
      }],
    });
  }

  // --- 0 PV ---------------------------------------------------------------
  for (const p of party) {
    if (p.hp == null || p.hp > 0) continue;
    const dead = p.conditions.includes('dead') || (p.deathSaves?.fail || 0) >= 3;
    if (dead) continue;
    const stable = p.conditions.includes('stable');
    const cb = p.combatantId ? combatants.find(c => c.id === p.combatantId) : null;
    const isTurn = !!(cb && current && current.id === cb.id);
    const ds = p.deathSaves || {};
    const actions = [];
    if (cb && !p.conditions.includes('unconscious')) {
      actions.push({ id: 'apply', label: L(lang, 'Marcar Inconsciente', 'Mark Unconscious'),
        op: { kind: 'combat', body: { action: 'add_condition', targetId: cb.id, condition: 'unconscious' } } });
    }
    if (isTurn && !stable) {
      actions.push({ id: 'deathSave', label: L(lang, 'Rolar teste contra a morte', 'Roll death save'),
        op: { kind: 'combat', body: { action: 'death_save', targetId: cb.id } } });
    }
    const text = stable
      ? L(lang, `${p.name} está a 0 PV, estável (inconsciente até recuperar PV).`, `${p.name} is at 0 HP, stable (unconscious until healed).`)
      : L(lang,
        `${p.name} está a 0 PV: inconsciente, testes contra a morte ✓${ds.success || 0} ✗${ds.fail || 0}${isTurn ? ' — é a vez dele(a) de rolar.' : '.'}`,
        `${p.name} is at 0 HP: unconscious, death saves ✓${ds.success || 0} ✗${ds.fail || 0}${isTurn ? " — it's their turn to roll." : '.'}`);
    push({
      id: isTurn ? `zeroHp:${p.characterId}:r${round}` : `zeroHp:${p.characterId}`,
      type: 'zeroHp', severity: stable ? 'warn' : 'danger',
      target: { kind: 'pc', name: p.name, characterId: p.characterId, combatantId: p.combatantId },
      text, actions,
    });
  }
  for (const c of combatants) {
    if (c.type !== 'monster' || c.defeated || (c.current_hp ?? 1) > 0) continue;
    push({
      id: `zeroHp:cb:${c.id}`, type: 'zeroHp', severity: 'warn',
      target: { kind: 'monster', name: c.name, combatantId: c.id },
      text: L(lang, `${c.name} está a 0 PV e ainda não foi marcado como derrotado.`, `${c.name} is at 0 HP but not marked defeated.`),
      actions: [{ id: 'apply', label: L(lang, 'Marcar derrotado', 'Mark defeated'),
        op: { kind: 'updateCombatant', combatantId: c.id, body: { defeated: true } } }],
    });
  }

  // --- Recarga (turno do monstro) ------------------------------------------
  if (current && current.type === 'monster' && !current.defeated) {
    const rolled = thisTurn.filter(e => e?.type === 'recharge' && e.target === current.name).flatMap(e => e.rolls || []);
    (current.stats?.actions || []).forEach((a, index) => {
      if (!a || !a.recharge) return;
      const st = current.action_state?.[String(index)] || {};
      const name = (typeof a.name === 'object' && a.name) ? (a.name[lang] || a.name.en || a.name.pt) : a.name;
      const roll = rolled.find(r => r.index === index);
      const range = a.recharge >= 6 ? '6' : `${a.recharge}–6`;
      let text; let actions = [];
      if (roll && roll.recharged) {
        text = L(lang, `${current.name}: ${name} recarregou (d6 = ${roll.roll}) — disponível neste turno.`,
          `${current.name}: ${name} recharged (d6 = ${roll.roll}) — available this turn.`);
      } else if (roll) {
        text = L(lang, `${current.name}: ${name} não recarregou (d6 = ${roll.roll}, precisa ${range}).`,
          `${current.name}: ${name} did not recharge (d6 = ${roll.roll}, needs ${range}).`);
        actions = [{ id: 'apply', label: L(lang, 'Recarregar mesmo assim', 'Recharge anyway'),
          op: { kind: 'combat', body: { action: 'set_resources', targetId: current.id, actionIndex: index, charged: true } } }];
      } else if (st.charged !== false) {
        text = L(lang, `${current.name}: ${name} está pronta (Recarga ${range}).`, `${current.name}: ${name} is ready (Recharge ${range}).`);
      } else {
        text = L(lang, `${current.name}: ${name} está gasta — role d6 (Recarga ${range}).`, `${current.name}: ${name} is spent — roll d6 (Recharge ${range}).`);
        actions = [{ id: 'apply', label: L(lang, 'Marcar recarregada', 'Mark recharged'),
          op: { kind: 'combat', body: { action: 'set_resources', targetId: current.id, actionIndex: index, charged: true } } }];
      }
      push({
        id: `recharge:${current.id}:${index}:r${round}`, type: 'recharge', severity: 'info',
        target: { kind: 'monster', name: current.name, combatantId: current.id }, text, actions,
      });
    });
  }

  // --- Ações lendárias (no turno de outra criatura) ------------------------
  if (current) {
    for (const c of combatants) {
      if (c.type !== 'monster' || c.defeated || c.id === current.id || !c.legendary) continue;
      const max = c.in_lair && c.legendary.lair_max ? c.legendary.lair_max : (c.legendary.max || 0);
      const rem = Math.min(c.legendary.remaining ?? max, max);
      if (rem <= 0) continue;
      push({
        id: `legendary:${c.id}:r${round}:t${turnIndex}`, type: 'legendary', severity: 'info',
        target: { kind: 'monster', name: c.name, combatantId: c.id },
        text: L(lang,
          `${c.name} tem ${rem}/${max} ações lendárias — pode usar ao fim do turno de ${current.name}.`,
          `${c.name} has ${rem}/${max} legendary actions — usable at the end of ${current.name}'s turn.`),
        actions: [],
      });
    }
  }

  // --- Condições com duração ------------------------------------------------
  if (current) {
    for (const e of current.effects || []) {
      if ((e?.rounds_left ?? 0) !== 1) continue;
      push({
        id: `conditionEnd:${current.id}:${e.name}:r${round}`, type: 'conditionEnd', severity: 'info',
        target: { kind: current.type === 'pc' ? 'pc' : 'monster', name: current.name, combatantId: current.id },
        text: L(lang, `${current.name}: ${conditionLabel(e.name)} termina no fim deste turno.`, `${current.name}: ${e.name} ends at the end of this turn.`),
        actions: [],
      });
    }
  }
  for (const e of recent) {
    if (e?.type !== 'effects_expired' || !(e.expired || []).length) continue;
    const c = byName.get(e.target);
    push({
      id: `conditionEnd:expired:${e.ts}:${e.target}`, type: 'conditionEnd', severity: 'info',
      target: { kind: c?.type === 'pc' ? 'pc' : 'monster', name: e.target, combatantId: c?.id },
      text: L(lang, `${e.target}: ${e.expired.map(x => conditionLabel(x)).join(', ')} terminou (duração acabou).`, `${e.target}: ${e.expired.join(', ')} ended (duration over).`),
      actions: c ? [{ id: 'apply', label: L(lang, 'Manter mais 1 rodada', 'Keep 1 more round'),
        op: { kind: 'combat', body: { action: 'add_condition', targetId: c.id, condition: e.expired[0], rounds: 1 } } }] : [],
    });
  }

  // --- Personagens: exaustão, PV baixo, sem espaços -------------------------
  for (const p of party) {
    const ex = exhaustionLevel(p);
    if (ex > 0) {
      const is2024 = p.data?.rulesVersion === '2024';
      push({
        id: `exhaustion:${p.characterId}:${ex}`, type: 'exhaustion', severity: 'warn',
        target: { kind: 'pc', name: p.name, characterId: p.characterId, combatantId: p.combatantId },
        text: is2024
          ? L(lang, `${p.name} tem Exaustão ${ex}: −${2 * ex} nos testes de d20 e −${5 * ex} pés de deslocamento. Descanso longo tira 1 nível.`,
            `${p.name} has Exhaustion ${ex}: −${2 * ex} to d20 tests and −${5 * ex} ft speed. A long rest removes 1 level.`)
          : L(lang, `${p.name} tem Exaustão (nível ${ex}): confira os efeitos do nível. Descanso longo tira 1 nível.`,
            `${p.name} has Exhaustion (level ${ex}): check that level's effects. A long rest removes 1 level.`),
        actions: [],
      });
    }
    if (p.hp != null && p.maxHp > 0 && p.hp > 0 && p.hp / p.maxHp < 0.25) {
      push({
        id: `lowHp:${p.characterId}`, type: 'lowHp', severity: 'warn',
        target: { kind: 'pc', name: p.name, characterId: p.characterId, combatantId: p.combatantId },
        text: L(lang, `${p.name} está com PV baixo (${p.hp}/${p.maxHp}).`, `${p.name} is low on HP (${p.hp}/${p.maxHp}).`),
        actions: [],
      });
    }
    if (slotsMax && p.data) {
      let max = [];
      try { max = slotsMax(p.data) || []; } catch { max = []; }
      const total = max.reduce((n, v) => n + (Number(v) || 0), 0);
      const used = (p.data.spellSlotsUsed || []).reduce((n, v, i) => n + Math.min(Number(v) || 0, Number(max[i]) || 0), 0);
      if (total > 0 && used >= total) {
        push({
          id: `noSlots:${p.characterId}`, type: 'noSlots', severity: 'info',
          target: { kind: 'pc', name: p.name, characterId: p.characterId },
          text: L(lang, `${p.name} está sem espaços de magia (só truques até descansar).`, `${p.name} is out of spell slots (cantrips only until a rest).`),
          actions: [],
        });
      }
    }
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/** Remove da lista de dispensados o que não está mais ativo (o evento acabou). */
export function pruneDismissed(dismissed, nudges) {
  const active = new Set((nudges || []).map(n => n.id));
  return (dismissed || []).filter(id => active.has(id));
}

export function visibleNudges(nudges, dismissed) {
  const set = new Set(dismissed || []);
  return (nudges || []).filter(n => !set.has(n.id));
}

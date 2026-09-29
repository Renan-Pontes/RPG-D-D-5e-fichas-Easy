/**
 * Efeitos dos Estilos de Luta e da Maestria em Armas na ficha.
 *
 * Lê as escolhas de `character.classOptions` (pool 'fightingStyle' de qualquer
 * classe, pool 'weaponMastery') e o campo `effect` das opções (chaves
 * documentadas em data/class-options/shared.js). Opções sem `effect` próprio
 * (ex.: Duelismo do Colégio das Espadas) herdam o do estilo compartilhado de
 * mesmo id. Talentos de Estilo de Luta (2024) guardados em `character.feats`
 * também contam, se o id/nome bater com um estilo.
 *
 * Tudo puro; não importa utils.js (utils.js importa este arquivo).
 */
import SRD from '../../data/srd.js';
import { SHARED } from '../../data/class-options/shared.js';
import { findOption } from './options.js';

const b = (pt, en) => ({ pt, en });
const SHARED_STYLE = new Map(SHARED.fightingStyle.options.map(o => [o.id, o]));
const MASTERY_WEAPON = new Map(SHARED.weaponMastery.options.map(o => [o.id, o]));
const norm = (s) => String(s || '').trim().toLowerCase();

const picks = (character, pool) => (Array.isArray(character?.classOptions) ? character.classOptions : [])
  .filter(p => p && p.pool === pool && typeof p.id === 'string');

/** Estilos de luta ativos: [{ id, classId, name, desc, effect }], sem repetir id. */
export function activeFightingStyles(character) {
  const out = new Map();
  for (const p of picks(character, 'fightingStyle')) {
    const opt = findOption(p.classId, 'fightingStyle', p.id) || SHARED_STYLE.get(p.id);
    if (!opt || out.has(opt.id)) continue;
    const effect = opt.effect || SHARED_STYLE.get(opt.id)?.effect || null;
    out.set(opt.id, { id: opt.id, classId: p.classId, name: opt.name, desc: opt.desc, effect });
  }
  // Talentos de Estilo de Luta (2024) registrados como talentos.
  for (const f of Array.isArray(character?.feats) ? character.feats : []) {
    const key = norm(f?.styleId || f?.id || f?.name);
    const opt = SHARED.fightingStyle.options.find(o => norm(o.id) === key || norm(o.name.pt) === key || norm(o.name.en) === key);
    if (!opt || out.has(opt.id)) continue;
    if (opt.rules && opt.rules !== (character.rulesVersion === '2024' ? '2024' : '2014')) continue;
    out.set(opt.id, { id: opt.id, classId: null, name: opt.name, desc: opt.desc, effect: opt.effect || null });
  }
  return [...out.values()];
}

/** [{ value, style }] das fontes de uma chave de efeito numérica/texto. */
function sources(styles, key) {
  return styles.filter(s => s.effect && s.effect[key] != null && s.effect[key] !== false)
    .map(s => ({ value: s.effect[key], name: s.name, id: s.id }));
}

/** Bônus de CA dos estilos: [{ value, label: {pt,en} }]. Defesa só vale usando armadura. */
export function acBonuses(character, styles = activeFightingStyles(character)) {
  const armor = character?.armor ? SRD.ARMOR.find(a => a.id === character.armor) : null;
  const armored = !!armor && ['light', 'medium', 'heavy'].includes(armor.type);
  if (!armored) return [];
  return sources(styles, 'acBonusArmored').map(s => ({ value: s.value, label: s.name }));
}

export const acBonusTotal = (character) => acBonuses(character).reduce((n, x) => n + x.value, 0);

/** Classificação da arma a partir de srd.js (2014) ou da opção de maestria (2024). */
export function weaponTraits(weapon) {
  const def = weapon?.id ? SRD.WEAPONS.find(x => x.id === weapon.id) : null;
  const m = weapon?.id ? MASTERY_WEAPON.get(weapon.id) : null;
  const props = def?.props || weapon?.props || m?.props || [];
  const ranged = def ? (def.type || '').includes('ranged') : m ? !m.melee : false;
  return {
    known: !!(def || m),
    ranged, melee: !ranged,
    props,
    twoHanded: props.includes('two-handed'),
    versatile: props.includes('versatile'),
    light: props.includes('light'),
    thrown: props.includes('thrown'),
    finesse: props.includes('finesse'),
  };
}

/** Maestria que o personagem dominou para esta arma: { id, name, desc } | null. */
export function weaponMastery(character, weapon) {
  if (!weapon?.id) return null;
  if (!picks(character, 'weaponMastery').some(p => p.id === weapon.id)) return null;
  const id = MASTERY_WEAPON.get(weapon.id)?.mastery;
  const prop = id && SHARED.masteryProperties[id];
  return prop ? { id, name: prop.name, desc: prop.desc } : null;
}

/**
 * Efeitos dos estilos numa arma da ficha.
 * Retorna {
 *   attack, damage,                       // somas já aplicáveis
 *   attackParts, damageParts: [{ value, label }],
 *   notes: [{ pt, en }],                  // efeitos condicionais / não numéricos
 *   mastery: { id, name, desc } | null,
 * }
 * Duelo é aplicado a toda arma corpo a corpo sem Duas Mãos (a ficha não sabe
 * o que está empunhado); a condição aparece no rótulo.
 */
export function weaponStyleBonuses(character, weapon, styles = activeFightingStyles(character)) {
  const t = weaponTraits(weapon);
  const attackParts = [];
  const damageParts = [];
  const notes = [];
  if (t.ranged) {
    for (const s of sources(styles, 'rangedAttackBonus')) attackParts.push({ value: s.value, label: s.name });
  }
  if (t.melee && !t.twoHanded) {
    for (const s of sources(styles, 'oneHandedDamageBonus')) {
      damageParts.push({ value: s.value, label: b(`${s.name.pt} (uma mão, sem outra arma)`, `${s.name.en} (one hand, no other weapon)`) });
    }
  }
  if (t.thrown) {
    for (const s of sources(styles, 'thrownDamageBonus')) {
      // Arma à distância com Arremesso (dardo): sempre; arma corpo a corpo: só ao arremessar.
      if (t.ranged) damageParts.push({ value: s.value, label: s.name });
      else notes.push(b(`+${s.value} no dano ao arremessar (${s.name.pt})`, `+${s.value} damage when thrown (${s.name.en})`));
    }
  }
  if (t.melee && (t.twoHanded || t.versatile)) {
    const hands = t.versatile && !t.twoHanded ? b(' com as duas mãos', ' when used two-handed') : b('', '');
    for (const s of sources(styles, 'damageDieFloor')) {
      notes.push(b(`${s.name.pt}: dados de dano 1 ou 2 contam como ${s.value}${hands.pt}`, `${s.name.en}: damage dice of 1 or 2 count as ${s.value}${hands.en}`));
    }
    for (const s of sources(styles, 'damageRerollBelow')) {
      notes.push(b(`${s.name.pt}: rola de novo dados de dano 1 ou 2${hands.pt}`, `${s.name.en}: reroll damage dice of 1 or 2${hands.en}`));
    }
  }
  if (t.light) {
    for (const s of sources(styles, 'lightExtraAttackAbilityMod')) {
      notes.push(b(`${s.name.pt}: o ataque extra (Leve) soma o modificador ao dano`, `${s.name.en}: the Light extra attack adds your ability modifier to damage`));
    }
  }
  const sum = (arr) => arr.reduce((n, x) => n + x.value, 0);
  return {
    attack: sum(attackParts), damage: sum(damageParts),
    attackParts, damageParts, notes,
    mastery: weaponMastery(character, weapon),
  };
}

/** "+2 Arquearia, +2 Duelo (…)" para exibir de onde veio o bônus. */
export function partsLabel(parts, lang = 'pt') {
  return parts.map(p => `${p.value >= 0 ? '+' : ''}${p.value} ${p.label[lang] || p.label.pt}`).join(', ');
}

/** Golpe desarmado do Combate Desarmado: { die, dieFree, grapple, name } | null. */
export function unarmedStrike(character, styles = activeFightingStyles(character)) {
  const s = styles.find(x => x.effect?.unarmedDie);
  if (!s) return null;
  return { die: s.effect.unarmedDie, dieFree: s.effect.unarmedDieFree || s.effect.unarmedDie, grapple: s.effect.grappleDamage || null, name: s.name };
}

/** Percepção às cegas (pés) dos estilos, ou 0. */
export function blindsight(character, styles = activeFightingStyles(character)) {
  return Math.max(0, ...sources(styles, 'blindsight').map(s => +s.value || 0));
}

const REACTIONS = {
  interception: b('Reação: quando uma criatura que você vê acerta outra a até 1,5 m de você, reduz o dano em 1d10 + BP (empunhando escudo ou arma simples/marcial).',
    'Reaction: when a creature you can see hits another creature within 5 ft of you, reduce the damage by 1d10 + PB (holding a shield or a simple/martial weapon).'),
  protection: b('Reação (com escudo): impõe Desvantagem ao ataque contra um alvo a até 1,5 m de você e a todos os ataques contra ele até o início do seu próximo turno.',
    'Reaction (with a shield): impose Disadvantage on the attack against a target within 5 ft of you, and on all attacks against it until the start of your next turn.'),
  protection2014: b('Reação (com escudo): impõe desvantagem a um ataque contra outro alvo a até 1,5 m de você.',
    'Reaction (with a shield): impose disadvantage on an attack against another target within 5 ft of you.'),
};

/** Lembretes de reação: [{ id, name, text }]. */
export function styleReactions(character, styles = activeFightingStyles(character)) {
  return styles.filter(s => s.effect?.reaction).map(s => ({ id: s.id, name: s.name, text: REACTIONS[s.effect.reaction] || s.desc }));
}

/**
 * Resumo de uma linha por estilo ativo, para o painel da ficha:
 * [{ id, name, summary: {pt,en} }].
 */
export function styleSummaries(character, styles = activeFightingStyles(character)) {
  return styles.map(s => {
    const e = s.effect || {};
    const parts = [];
    if (e.acBonusArmored) parts.push(b(`+${e.acBonusArmored} CA usando armadura`, `+${e.acBonusArmored} AC while wearing armor`));
    if (e.rangedAttackBonus) parts.push(b(`+${e.rangedAttackBonus} no ataque com armas à distância`, `+${e.rangedAttackBonus} to attack with ranged weapons`));
    if (e.oneHandedDamageBonus) parts.push(b(`+${e.oneHandedDamageBonus} no dano corpo a corpo com uma mão, sem outra arma`, `+${e.oneHandedDamageBonus} melee damage with one hand and no other weapon`));
    if (e.thrownDamageBonus) parts.push(b(`+${e.thrownDamageBonus} no dano de armas arremessadas`, `+${e.thrownDamageBonus} damage with thrown weapons`));
    if (e.thrownDrawFree) parts.push(b('saca a arma de arremesso como parte do ataque', 'draw a thrown weapon as part of the attack'));
    if (e.damageDieFloor) parts.push(b(`armas de duas mãos/versáteis (duas mãos): dados 1–2 contam como ${e.damageDieFloor}`, `two-handed/versatile (two hands): damage dice 1–2 count as ${e.damageDieFloor}`));
    if (e.damageRerollBelow) parts.push(b('armas de duas mãos/versáteis (duas mãos): rola de novo dados 1–2', 'two-handed/versatile (two hands): reroll damage dice 1–2'));
    if (e.lightExtraAttackAbilityMod) parts.push(b('ataque extra (Leve) soma o modificador ao dano', 'Light extra attack adds the ability modifier to damage'));
    if (e.blindsight) parts.push(b(`Percepção às Cegas ${Math.round(e.blindsight * 0.3)} m`, `Blindsight ${e.blindsight} ft`));
    if (e.unarmedDie) parts.push(b(`golpe desarmado ${e.unarmedDie} (${e.unarmedDieFree} com as mãos livres)${e.grappleDamage ? `; ${e.grappleDamage} no agarrado` : ''}`, `unarmed strike ${e.unarmedDie} (${e.unarmedDieFree} with free hands)${e.grappleDamage ? `; ${e.grappleDamage} to grappled` : ''}`));
    if (e.reaction) parts.push(b('reação (ver lembrete)', 'reaction (see reminder)'));
    if (e.maneuvers) parts.push(b(`${e.maneuvers} manobra, ${e.superiorityDice?.count || 1} dado de superioridade ${e.superiorityDice?.die || 'd6'}`, `${e.maneuvers} maneuver, ${e.superiorityDice?.count || 1} ${e.superiorityDice?.die || 'd6'} superiority die`));
    const summary = parts.length
      ? b(parts.map(p => p.pt).join('; '), parts.map(p => p.en).join('; '))
      : (s.desc || b('', ''));
    return { id: s.id, name: s.name, summary };
  });
}

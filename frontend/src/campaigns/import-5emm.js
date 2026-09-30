/**
 * Importação de monstros para o combate.
 *
 * Aceita:
 *  (a) arquivo .5emm.json do 5e Monster Maker (saveVersion 1–11);
 *  (b) criatura do Open5e — v1 (/v1/monsters/) ou v2 (/v2/creatures/), avulsa,
 *      em lista ou na resposta paginada ({ results: [...] }).
 * Converte para o NOSSO formato de monstro de combate (cabeçalho de
 * frontend/data/bestiary.js: ações 'melee'|'ranged'|'save'|'special', extraDamage
 * [{damage, damageType}], recharge 5, uses/usesPer, bonusActions, reactions,
 * legendary {uses, actions}) + `multiattack` estruturado para o estimador de ND. Monstros importados ficam só no navegador
 * (ver src/combat/custom-monsters.js) e vão ao combate como snapshot inline.
 *
 * A leitura do formato 5emm (tabela de ND por índice, média de dados e o
 * processamento de tokens {NAME}, {3d6}, {DC:STR}, {A:STR}) segue
 * 5e Monster Maker (github.com/ebshimizu/5e-monster-maker):
 * src/components/models.ts, src/components/rendering/mathRendering.ts e
 * src/components/rendering/useProcessTokens.ts.
 * Copyright (c) 2024 Evan Shimizu — MIT
 */
import { CR_TABLE, crLabel, crToNumber } from '../combat/cr-estimate.js';

const STAT_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const FULL_TO_ABBR = {
  strength: 'str', dexterity: 'dex', constitution: 'con',
  intelligence: 'int', wisdom: 'wis', charisma: 'cha',
};
const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

const L = (lang, pt, en) => (lang === 'en' ? en : pt);
const both = (s) => ({ pt: s, en: s });
const statMod = (score) => Math.floor(((Number(score) || 10) - 10) / 2);
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

function slugify(s) {
  return String(s || 'monster').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'monster';
}

function normSize(s) {
  const v = String(s?.name || s || '').trim().toLowerCase();
  return SIZES.find(x => x.toLowerCase() === v) || 'Medium';
}

function normType(s) {
  const v = String(s?.name || s || '').trim().toLowerCase();
  const m = v.match(/[a-z]+/);
  return m ? m[0] : 'monstrosity';
}

/** "1d6 + 2" → "1d6+2"; valor fixo vira "1d1+N-1" (o motor do combate só lê XdY±Z). */
function diceExpr(count, dice, mod) {
  count = num(count); dice = num(dice); mod = num(mod);
  if (!count || !dice) return mod > 0 ? `1d1${mod - 1 ? signed(mod - 1) : ''}` : '';
  if (dice === 1) {
    const total = count + mod;
    return total > 0 ? `1d1${total - 1 ? signed(total - 1) : ''}` : '';
  }
  return `${count}d${dice}${mod ? signed(mod) : ''}`;
}

function cleanDice(s) {
  return String(s || '').replace(/\s+/g, '').replace(/−/g, '-');
}

/** Split de "cold; bludgeoning, piercing, and slashing from nonmagical attacks" em itens. */
function splitDefenses(v) {
  if (Array.isArray(v)) return v.map(x => String(x?.name || x).trim().toLowerCase()).filter(Boolean);
  const s = String(v || '').trim();
  if (!s) return [];
  return s.split(';').flatMap(seg => {
    const t = seg.trim();
    if (!t) return [];
    if (/nonmagical|non-magical|magical attacks|silvered|adamantine|from spells/i.test(t)) return [t.toLowerCase()];
    return t.split(/,\s*|\s+and\s+/).map(x => x.trim().toLowerCase()).filter(Boolean);
  });
}

const ABILITY_NAMES = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };

/**
 * Lê o texto de uma ação de bloco de estatísticas (formato 2014 ou 2024) e extrai
 * ataque (bônus, alcance, dano, tipo), salvaguarda (CD, atributo, metade) e recarga.
 * Retorna campos no nosso formato de ação (sem name).
 */
export function parseActionText(desc, name = '') {
  const text = String(desc || '').replace(/\s+/g, ' ').replace(/[–—]/g, '-').trim();
  const out = {};
  const rech = `${name} ${text}`.match(/Recharge\s*(\d(?:\s*-\s*\d)?)/i);
  if (rech) out.recharge = parseInt(rech[1], 10);
  else {
    const perDay = `${name} ${text}`.match(/\(\s*(\d+)\s*\/\s*day/i);
    if (perDay) { out.uses = parseInt(perDay[1], 10); out.usesPer = 'day'; }
  }

  // 2014: "Melee Weapon Attack: +4 to hit, reach 5 ft., one target."
  // 2024: "Melee Attack Roll: +4, reach 5 ft. Hit: ..."
  const atk = text.match(/(Melee or Ranged|Melee|Ranged)\s+(?:Weapon\s+|Spell\s+)?Attack(?:\s+Roll)?:\s*([+-]\d+)/i);
  if (atk) {
    out.type = /^ranged$/i.test(atk[1]) ? 'ranged' : 'melee';
    out.atk = parseInt(atk[2], 10);
    const rg = text.match(/\b(reach|range)\s+([\d/]+)\s*(?:ft|feet)/i);
    if (rg) out.range = `${rg[2]} ft`;
  }

  const dmgRe = /(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s*([A-Za-z]+)\s+damage/gi;
  const hitIdx = text.search(/\bHit:/i);
  const hitText = hitIdx >= 0 ? text.slice(hitIdx) : text;
  const dmgs = [...hitText.matchAll(dmgRe)];
  if (dmgs.length) {
    out.damage = cleanDice(dmgs[0][2]);
    out.damageType = dmgs[0][3].toLowerCase();
    // "plus 7 (2d6) fire damage" → dano extra (o combate rola só o principal)
    const extra = dmgs.slice(1).filter(m => /plus\s*$/i.test(hitText.slice(Math.max(0, m.index - 6), m.index)));
    if (extra.length && atk) {
      out.extraDamage = extra.map(m => ({ damage: cleanDice(m[2]), damageType: m[3].toLowerCase() }));
    }
  } else {
    const flat = hitText.match(/Hit:\s*(\d+)\s+([A-Za-z]+)\s+damage/i);
    if (flat) { out.damage = diceExpr(1, 1, parseInt(flat[1], 10) - 1); out.damageType = flat[2].toLowerCase(); }
  }

  if (!atk) {
    // 2014: "DC 21 Dexterity saving throw"; 2024: "Dexterity Saving Throw: DC 21"
    const s14 = text.match(/DC\s*(\d+)\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw/i);
    const s24 = text.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+Saving Throw:\s*DC\s*(\d+)/i);
    if (s14 || s24) {
      const ability = ABILITY_NAMES[(s14 ? s14[2] : s24[1]).toLowerCase()];
      const dc = parseInt(s14 ? s14[1] : s24[2], 10);
      out.type = 'save';
      out.save = { ability, dc };
      if (out.damage && /half as much|half damage|Success:\s*Half/i.test(text)) out.save.halfOnSave = true;
      if (/cone|line|radius|sphere|cube|emanation|each creature/i.test(text)) out.save.area = true;
    }
  }
  return out;
}

function makeAction(name, desc, extra = {}) {
  const parsed = parseActionText(desc, name);
  const a = {
    name: both(String(name || 'Action').trim()),
    type: parsed.type || 'special',
    ...parsed,
    ...extra,
  };
  if ((a.type === 'melee' || a.type === 'ranged') && !a.damage) {
    // ataque sem dano legível: vira especial para não quebrar o combate
    a.type = 'special';
  }
  if (desc) a.desc = both(String(desc).trim());
  return a;
}

function legendaryCost(name) {
  const m = String(name || '').match(/Costs?\s*(\d+)\s*Actions?/i);
  return m ? parseInt(m[1], 10) : 1;
}

function stripCost(name) {
  return String(name || '').replace(/\s*\(Costs?\s*\d+\s*Actions?\)/i, '').trim();
}

function finalize(m, source) {
  const crNum = crToNumber(m.crNum ?? m.cr) ?? 0;
  return {
    ...m,
    id: m.id,
    cr: crLabel(crNum),
    crNum,
    size: normSize(m.size),
    type: normType(m.type),
    speed: m.speed && Object.keys(m.speed).length ? m.speed : { walk: 30 },
    ac: Math.max(1, num(m.ac, 10)),
    hp: Math.max(1, num(m.hp, 1)),
    abilities: Object.fromEntries(['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => [k, Math.max(1, Math.min(30, num(m.abilities?.[k], 10)))])),
    actions: m.actions || [],
    traits: m.traits || [],
    custom: true,
    source,
    importedAt: new Date().toISOString(),
  };
}

// ============================================================
// 5e Monster Maker (.5emm.json)
// ============================================================

/** Processa os tokens do 5emm ({NAME}, {3d6}, {DC:STR}, {A:STR}, {monster.hp}, {XP:..}). */
export function process5emmTokens(input, mm) {
  if (!input) return '';
  const prof = num(mm.proficiency, 2);
  const stats = mm.stats || {};
  const name = mm.nickname || mm.name || 'monster';
  let s = String(input);
  s = s.replace(/\{monster\.hp\}/gi, () => `{${num(mm.HP?.HD)}d${num(mm.HP?.type)}+${num(mm.HP?.modifier)}}`);
  s = s.replace(/\{(\d+)d(\d+)[ ]*([+-][ ]*\d+)?\}/gi, (_m, count, dice, mod) => {
    const clean = mod ? parseInt(mod.replace(/\s/g, ''), 10) : 0;
    const c = parseInt(count, 10); const d = parseInt(dice, 10);
    const avg = (d === 1 ? c : Math.floor(c * ((d + 1) / 2))) + clean;
    if (d === 1 || c === 0) return `${avg}`;
    return `${avg} (${c}d${d}${mod ? ` ${clean >= 0 ? '+' : '-'} ${Math.abs(clean)}` : ''})`;
  });
  s = s.replace(/\{DC:(\w{3})\}/gi, (m, st) => (st.toUpperCase() in stats ? `DC ${8 + prof + statMod(stats[st.toUpperCase()])}` : m));
  s = s.replace(/\{A:(\w{3})\}/gi, (m, st) => (st.toUpperCase() in stats ? signed(prof + statMod(stats[st.toUpperCase()])) : m));
  s = s.replace(/\{NAME\}/gi, `${mm.useArticleInToken ? 'the ' : ''}${name}`);
  s = s.replace(/(?:\.\s*|^)\s*(the)\b/gm, (m) => m.replace('the', 'The'));
  s = s.replace(/\{XP:([\d/]+|monster)(\+)?\}/gi, (_m, cr) => {
    const row = cr.toLowerCase() === 'monster' ? CR_TABLE[num(mm.CR)] : CR_TABLE.find(r => r.cr === cr);
    return row ? `${row.xp.toLocaleString('en-US')} XP` : '';
  });
  s = s.replace(/\{spellcasting\.save\}/gi, () => `DC ${spellSave5emm(mm)}`);
  s = s.replace(/\{[a-z]+\.[\w.[\]]+\}/gi, ''); // tokens de contexto que não dá para resolver aqui
  return s.trim();
}

function spellSave5emm(mm) {
  const sc = mm.spellcasting || {};
  if (sc.save?.override) return num(sc.save.overrideValue);
  return 8 + num(mm.proficiency, 2) + statMod(mm.stats?.[sc.stat || 'INT']);
}
function spellAttack5emm(mm) {
  const sc = mm.spellcasting || {};
  if (sc.attack?.override) return num(sc.attack.overrideValue);
  return num(mm.proficiency, 2) + statMod(mm.stats?.[sc.stat || 'INT']);
}

function validate5emm(mm, lang) {
  const errs = [];
  const v = num(mm.saveVersion);
  if (!Number.isInteger(v) || v < 1 || v > 11) errs.push(L(lang, `saveVersion ${mm.saveVersion} não suportada (1–11).`, `Unsupported saveVersion ${mm.saveVersion} (1–11).`));
  if (!mm.name || typeof mm.name !== 'string') errs.push(L(lang, 'Falta o nome.', 'Missing name.'));
  if (!mm.stats || STAT_KEYS.some(k => !Number.isFinite(Number(mm.stats[k])))) errs.push(L(lang, 'Atributos (stats) incompletos.', 'Incomplete ability scores (stats).'));
  if (!mm.HP || !Number.isFinite(Number(mm.HP.HD)) || !Number.isFinite(Number(mm.HP.type))) errs.push(L(lang, 'PV (HP) inválido.', 'Invalid HP.'));
  if (!Number.isFinite(Number(mm.AC))) errs.push(L(lang, 'CA (AC) inválida.', 'Invalid AC.'));
  const cr = Number(mm.CR);
  if (!Number.isInteger(cr) || cr < 0 || cr >= CR_TABLE.length) errs.push(L(lang, 'ND (CR) fora da tabela.', 'CR out of table.'));
  if (mm.attacks != null && !Array.isArray(mm.attacks)) errs.push(L(lang, 'attacks precisa ser lista.', 'attacks must be a list.'));
  if (mm.actions != null && !Array.isArray(mm.actions)) errs.push(L(lang, 'actions precisa ser lista.', 'actions must be a list.'));
  return errs;
}

function attackBonus5emm(mm, a) {
  const md = a.modifier || {};
  if (md.override) return num(md.overrideValue);
  return statMod(mm.stats?.[md.stat || 'STR']) + (md.proficient === false ? 0 : num(mm.proficiency, 2));
}

function damageMod5emm(mm, dmg) {
  const md = dmg?.modifier || {};
  if (md.override) return num(md.overrideValue);
  return statMod(mm.stats?.[md.stat || 'STR']);
}

function convertAttack5emm(mm, a) {
  const distance = String(a.distance || 'MELEE').toUpperCase();
  const r = a.range || {};
  const range = distance === 'RANGED' ? `${num(r.standard)}/${num(r.long)} ft`
    : distance === 'BOTH' ? `${num(r.reach, 5)} ft or ${num(r.standard)}/${num(r.long)} ft`
      : `${num(r.reach, 5)} ft`;
  const dmg = a.damage || {};
  const out = {
    name: both(a.name || 'Attack'),
    type: distance === 'RANGED' ? 'ranged' : 'melee',
    atk: attackBonus5emm(mm, a),
    range,
    damage: diceExpr(dmg.count, dmg.dice, damageMod5emm(mm, dmg)),
    damageType: String(dmg.type || 'bludgeoning').toLowerCase(),
  };
  if (num(a.targets, 1) > 1) out.targets = num(a.targets);
  const extras = (a.additionalDamage || []).filter(x => num(x.count) > 0 && num(x.dice) > 0);
  if (extras.length) {
    out.extraDamage = extras.map(x => ({
      damage: num(x.dice) === 1 ? diceExpr(1, 1, num(x.count) - 1) : `${num(x.count)}d${num(x.dice)}`,
      damageType: String(x.type || '').toLowerCase(),
    }));
  }
  const notes = [];
  if (extras.length) notes.push('plus ' + extras.map(x => `${x.count}d${x.dice} ${x.type}${x.note ? ` ${x.note}` : ''}`).join(', plus '));
  const alt = a.alternateDamage;
  if (alt?.active) notes.push(`or ${diceExpr(alt.count, alt.dice, damageMod5emm(mm, alt))} ${alt.type}${alt.condition ? ` ${alt.condition}` : ''}`);
  if (num(a.save) > 0) notes.push(`DC ${num(a.save)}`);
  const desc = [notes.join('; '), process5emmTokens(a.description, mm)].filter(Boolean).join('. ');
  if (desc) out.desc = both(desc);
  if (!out.damage) { out.type = 'special'; delete out.damage; }
  return out;
}

function convertAction5emm(mm, a) {
  const desc = process5emmTokens(a.description, mm);
  let name = a.name || 'Action';
  const rech = String(a.recharge || '').trim();
  const lim = num(a.limitedUse?.count);
  const extra = {};
  if (rech) extra.recharge = parseInt(rech, 10) || 5;
  else if (lim > 0) { extra.uses = lim; extra.usesPer = /rest|short|long/i.test(String(a.limitedUse?.rate)) ? 'rest' : 'day'; }
  const action = makeAction(name, desc, extra);
  // v9+: CD ligada a um atributo
  if (a.stat && a.stat !== 'none' && STAT_KEYS.includes(a.stat)) {
    const dc = a.save?.override ? num(a.save.overrideValue) : 8 + num(mm.proficiency, 2) + statMod(mm.stats[a.stat]);
    if (action.save) action.save.dc = dc;
    else { action.save = { ability: a.stat, dc }; action.type = 'save'; }
  }
  // anotação de ND do 5emm quando o texto não tem dados legíveis
  const ann = a.crAnnotation || {};
  if (!action.damage && num(ann.maxDamage) > 0) action.avgDamage = num(ann.maxDamage);
  if (ann.multitarget) { if (action.save) action.save.area = true; else action.multitarget = true; }
  return action;
}

function numberWord(n) {
  return ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'][n] || String(n);
}
function numberWordPt(n) {
  return ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito'][n] || String(n);
}

/** Texto e estrutura de multiataque a partir de [{name, count}]. */
export function multiattackAction(list) {
  const enText = list.map(x => `${numberWord(x.count)} ${x.name} attack${x.count > 1 ? 's' : ''}`).join(' and ');
  const ptText = list.map(x => `${numberWordPt(x.count)} × ${x.name}`).join(' + ');
  return {
    name: { pt: 'Multiataque', en: 'Multiattack' },
    type: 'special',
    desc: { pt: `Ataca: ${ptText}.`, en: `Makes ${enText}.` },
  };
}

export function convert5emm(mm, { lang = 'pt' } = {}) {
  const errors = validate5emm(mm, lang);
  if (errors.length) return { errors };
  const warnings = [];
  const stats = mm.stats;
  const prof = num(mm.proficiency, 2);
  const crRowV = CR_TABLE[num(mm.CR)];

  const abilities = Object.fromEntries(STAT_KEYS.map(k => [k.toLowerCase(), num(stats[k], 10)]));
  const saves = {};
  for (const k of STAT_KEYS) {
    const sv = mm.saves?.[k];
    if (!sv) continue;
    if (sv.override) saves[k.toLowerCase()] = num(sv.overrideValue);
    else if (sv.proficient) saves[k.toLowerCase()] = statMod(stats[k]) + prof;
  }
  const skills = {};
  for (const sk of mm.skills || []) {
    const key = String(sk.key || sk.skill?.key || sk.skill?.label || '').toLowerCase()
      .replace(/[_\s]+(\w)/g, (_m, c) => c.toUpperCase());
    if (!key) continue;
    const stat = sk.skill?.stat || 'WIS';
    skills[key] = sk.override ? num(sk.overrideValue)
      : statMod(stats[stat]) + prof * (sk.expertise ? 2 : sk.proficient ? 1 : 0);
  }
  const speed = {};
  for (const sp of mm.speeds || []) {
    const type = String(sp.type || 'walk').toLowerCase();
    speed[type] = num(sp.speed);
  }
  const senses = [];
  for (const [k, v] of Object.entries(mm.senses || {})) if (num(v) > 0) senses.push(`${k} ${num(v)} ft`);
  if (mm.sensesNotes) senses.push(mm.sensesNotes);

  const byId = {};
  const actions = [];
  const legendaryOnly = {};
  for (const a of mm.attacks || []) {
    const conv = convertAttack5emm(mm, a);
    byId[a.id] = conv;
    if (a.legendaryOnly) legendaryOnly[a.id] = conv; else actions.push(conv);
  }
  const otherActions = [];
  const bonusActions = [];
  for (const a of mm.actions || []) {
    const conv = convertAction5emm(mm, a);
    byId[a.id] = conv;
    if (a.legendaryOnly) legendaryOnly[a.id] = conv;
    else if (a.bonusAction) bonusActions.push(conv);
    else otherActions.push(conv);
  }

  // Multiataques: estrutura (para o estimador) + ação descritiva (para a mesa)
  const multi = [];
  for (const ma of mm.multiattacks || []) {
    const counts = new Map();
    for (const id of ma.attacks || []) {
      const a = byId[id];
      if (a) counts.set(a.name.en, (counts.get(a.name.en) || 0) + 1);
    }
    const list = [...counts.entries()].map(([name, count]) => ({ name, count }));
    if (list.length) multi.push(list);
  }
  const monsterActions = [];
  if (multi.length) {
    const ma = multiattackAction(multi[0]);
    if (multi.length > 1) {
      ma.desc.en += ' ' + multi.slice(1).map(l => 'Or ' + multiattackAction(l).desc.en.replace(/^Makes/, 'makes')).join(' ');
      ma.desc.pt += ' ' + multi.slice(1).map(l => 'Ou ' + multiattackAction(l).desc.pt.replace(/^Ataca/, 'ataca')).join(' ');
    }
    if (mm.multiattackOptions?.postscript) ma.desc.en += ' ' + process5emmTokens(mm.multiattackOptions.postscript, mm);
    monsterActions.push(ma);
  }
  monsterActions.push(...actions, ...otherActions);

  const traits = (mm.traits || []).map(t => {
    const lim = num(t.limitedUse?.count);
    const suffix = lim > 0 ? ` (${lim}/${String(t.limitedUse.rate || 'day').toLowerCase().replace(/_/g, ' ')})` : '';
    return { name: both(`${t.name}${suffix}`), desc: both(process5emmTokens(t.description, mm)) };
  });

  const sc = mm.spellcasting || {};
  const spellList = [...(sc.standard || []), ...((sc.atWill || []).flatMap(a => a.spells || []))];
  let spellSaveDc; let spellAttack;
  if (spellList.length) {
    spellSaveDc = spellSave5emm(mm);
    spellAttack = spellAttack5emm(mm);
    traits.push({
      name: { pt: 'Conjuração', en: 'Spellcasting' },
      desc: both(`DC ${spellSaveDc}, ${signed(spellAttack)} to hit${sc.level ? ` (caster level ${sc.level})` : ''}. ${spellList.join(', ')}.${sc.notes ? ' ' + process5emmTokens(sc.notes, mm) : ''}`),
    });
    warnings.push(L(lang, 'Magias entram só como texto (o combate não conjura sozinho).', 'Spells are imported as text only.'));
  }

  const legendaryActions = (mm.legendaryActions?.actions || []).map(la => {
    const ref = byId[la.actionId];
    if (!ref) return null;
    return { ...ref, cost: Math.max(1, num(la.cost, 1)) };
  }).filter(Boolean);

  const reactions = (mm.reactions || []).map(r => ({
    name: both(r.name || 'Reaction'),
    type: 'special',
    desc: both([r.trigger ? `Trigger: ${process5emmTokens(r.trigger, mm)}` : '', process5emmTokens(r.description, mm)].filter(Boolean).join(' ')),
  }));

  const hpAvg = Math.floor(num(mm.HP.HD) * ((num(mm.HP.type) + 1) / 2) + num(mm.HP.modifier));
  const m = finalize({
    id: `imp-${slugify(mm.name)}`,
    name: both(mm.name),
    crNum: crRowV.numeric,
    type: mm.type,
    size: mm.size,
    alignment: mm.alignment || '',
    speed,
    ac: num(mm.AC, 10),
    hp: hpAvg,
    hitDice: `${num(mm.HP.HD)}d${num(mm.HP.type)}${num(mm.HP.modifier) ? signed(num(mm.HP.modifier)) : ''}`,
    abilities,
    ...(Object.keys(saves).length ? { saves } : {}),
    ...(Object.keys(skills).length ? { skills } : {}),
    damageResistances: splitDefenses(mm.resistances),
    damageImmunities: splitDefenses(mm.immunities),
    damageVulnerabilities: splitDefenses(mm.vulnerabilities),
    conditionImmunities: (mm.conditions || []).map(c => String(c).toLowerCase()),
    senses: senses.join(', ') || '—',
    languages: mm.languages || '—',
    traits,
    actions: monsterActions,
    ...(multi.length ? { multiattack: multi } : {}),
    ...(bonusActions.length ? { bonusActions } : {}),
    ...(legendaryActions.length ? { legendary: { uses: num(mm.legendaryActions?.count, 3) || 3, actions: legendaryActions } } : {}),
    ...(reactions.length ? { reactions } : {}),
    ...(spellSaveDc ? { spellSaveDc, spellAttack } : {}),
    proficiency: prof,
  }, '5emm');
  if (Object.keys(legendaryOnly).length && !legendaryActions.length) {
    warnings.push(L(lang, 'Ações só lendárias sem lista de ações lendárias foram ignoradas.', 'Legendary-only actions without a legendary list were skipped.'));
  }
  return { monster: m, warnings };
}

// ============================================================
// Open5e
// ============================================================

function open5eActions(list, extra = {}) {
  if (!Array.isArray(list)) return [];
  return list.map(a => {
    const act = makeAction(stripCost(a.name), a.desc, extra);
    // campos estruturados do v1 como reserva
    if (!act.damage && a.damage_dice && /^\d+d\d+/.test(String(a.damage_dice))) {
      const main = String(a.damage_dice).split('+')[0];
      act.damage = cleanDice(`${main}${a.damage_bonus ? signed(num(a.damage_bonus)) : ''}`);
      if (act.type === 'special' && a.attack_bonus != null) { act.type = 'melee'; act.atk = num(a.attack_bonus); }
    }
    if (act.atk == null && a.attack_bonus != null && (act.type === 'melee' || act.type === 'ranged')) act.atk = num(a.attack_bonus);
    return act;
  });
}

function legendaryCount(desc) {
  const m = String(desc || '').match(/(?:take|use)\s+(\w+)\s+legendary actions?/i);
  if (!m) return 3;
  const w = { one: 1, two: 2, three: 3, four: 4, five: 5 }[m[1].toLowerCase()];
  return w || parseInt(m[1], 10) || 3;
}

export function convertOpen5eV1(o, { lang = 'pt' } = {}) {
  if (!o.name || !Number.isFinite(Number(o.hit_points)) || !Number.isFinite(Number(o.armor_class))) {
    return { errors: [L(lang, 'Criatura Open5e v1 sem nome/PV/CA.', 'Open5e v1 creature missing name/HP/AC.')] };
  }
  const abilities = Object.fromEntries(Object.entries(FULL_TO_ABBR).map(([full, k]) => [k, num(o[full], 10)]));
  const saves = {};
  for (const [full, k] of Object.entries(FULL_TO_ABBR)) if (o[`${full}_save`] != null) saves[k] = num(o[`${full}_save`]);
  const speed = {};
  for (const [k, v] of Object.entries(o.speed || {})) if (typeof v === 'number') speed[k] = v;
  const skills = { ...(o.skills || {}) };
  if (o.perception != null && skills.perception == null) skills.perception = num(o.perception);

  const actions = open5eActions(o.actions);
  const bonusActions = open5eActions(o.bonus_actions);
  const legendaryActions = Array.isArray(o.legendary_actions)
    ? o.legendary_actions.map(a => ({ ...makeAction(stripCost(a.name), a.desc), cost: legendaryCost(a.name) }))
    : [];
  const reactions = Array.isArray(o.reactions) ? o.reactions.map(r => ({ name: both(r.name), type: 'special', desc: both(r.desc || '') })) : [];

  const m = finalize({
    id: `o5e-${slugify(o.slug || o.name)}`,
    name: both(o.name),
    cr: o.challenge_rating,
    crNum: o.cr ?? crToNumber(o.challenge_rating),
    type: o.type, size: o.size, alignment: o.alignment || '',
    speed,
    ac: num(o.armor_class, 10), hp: num(o.hit_points, 1), hitDice: o.hit_dice || '',
    abilities,
    ...(Object.keys(saves).length ? { saves } : {}),
    ...(Object.keys(skills).length ? { skills } : {}),
    damageResistances: splitDefenses(o.damage_resistances),
    damageImmunities: splitDefenses(o.damage_immunities),
    damageVulnerabilities: splitDefenses(o.damage_vulnerabilities),
    conditionImmunities: splitDefenses(o.condition_immunities),
    senses: o.senses || '—', languages: o.languages || '—',
    traits: (Array.isArray(o.special_abilities) ? o.special_abilities : []).map(t => ({ name: both(t.name), desc: both(t.desc || '') })),
    actions,
    ...(bonusActions.length ? { bonusActions } : {}),
    ...(legendaryActions.length ? { legendary: { uses: legendaryCount(o.legendary_desc), actions: legendaryActions } } : {}),
    ...(reactions.length ? { reactions } : {}),
    sourceDoc: o.document__title || o.document__slug || '',
  }, 'open5e');
  return { monster: m, warnings: [] };
}

export function convertOpen5eV2(o, { lang = 'pt' } = {}) {
  if (!o.name || !o.ability_scores || !Number.isFinite(Number(o.hit_points))) {
    return { errors: [L(lang, 'Criatura Open5e v2 sem nome/atributos/PV.', 'Open5e v2 creature missing name/abilities/HP.')] };
  }
  const abilities = Object.fromEntries(Object.entries(FULL_TO_ABBR).map(([full, k]) => [k, num(o.ability_scores[full], 10)]));
  const saves = {};
  for (const [full, v] of Object.entries(o.saving_throws || {})) if (FULL_TO_ABBR[full]) saves[FULL_TO_ABBR[full]] = num(v);
  const speed = {};
  for (const [k, v] of Object.entries(o.speed || {})) if (typeof v === 'number' && v > 0) speed[k] = v;
  const skills = {};
  for (const [k, v] of Object.entries(o.skill_bonuses || {})) skills[k.replace(/_(\w)/g, (_m, c) => c.toUpperCase())] = num(v);
  const ri = o.resistances_and_immunities || {};
  const senses = [];
  for (const k of ['darkvision', 'blindsight', 'tremorsense', 'truesight']) if (num(o[`${k}_range`]) > 0) senses.push(`${k} ${num(o[`${k}_range`])} ft`);
  if (o.passive_perception != null) senses.push(`passive Perception ${o.passive_perception}`);

  const actions = [];
  const bonusActions = [];
  const legendaryActions = [];
  const reactions = [];
  const list = [...(o.actions || [])].sort((a, b) => num(a.order_in_statblock) - num(b.order_in_statblock));
  for (const a of list) {
    const kind = String(a.action_type || 'ACTION').toUpperCase();
    if (kind === 'REACTION') { reactions.push({ name: both(a.name), type: 'special', desc: both(a.desc || '') }); continue; }
    const act = makeAction(stripCost(a.name), a.desc);
    const ul = a.usage_limits;
    if (ul?.type === 'RECHARGE_ON_ROLL' && !act.recharge) act.recharge = num(ul.param, 5);
    else if (ul?.type === 'PER_DAY' && !act.recharge && !act.uses) { act.uses = num(ul.param, 1); act.usesPer = 'day'; }
    // reserva: dados estruturados (o tipo de dano do v2 às vezes vem errado; o texto tem prioridade)
    const s = Array.isArray(a.attacks) ? a.attacks[0] : null;
    if (s && !act.damage && num(s.damage_die_count) > 0) {
      act.type = s.range ? 'ranged' : 'melee';
      act.atk = num(s.to_hit_mod);
      act.damage = diceExpr(s.damage_die_count, String(s.damage_die_type || 'D6').replace(/\D/g, ''), s.damage_bonus);
      act.damageType = String(s.damage_type?.key || s.damage_type?.name || 'bludgeoning').toLowerCase();
    }
    if (kind === 'LEGENDARY_ACTION') legendaryActions.push({ ...act, cost: Math.max(1, num(a.legendary_action_cost, legendaryCost(a.name))) });
    else if (kind === 'BONUS_ACTION') bonusActions.push(act);
    else actions.push(act);
  }
  // Multiataque primeiro, como no bloco de estatísticas
  actions.sort((a, b) => (/multiattack/i.test(b.name.en) ? 1 : 0) - (/multiattack/i.test(a.name.en) ? 1 : 0));

  const m = finalize({
    id: `o5e-${slugify(o.key || o.name)}`,
    name: both(o.name),
    crNum: crToNumber(o.challenge_rating ?? o.challenge_rating_decimal),
    type: o.type, size: o.size, alignment: o.alignment || '',
    speed,
    ac: num(o.armor_class, 10), hp: num(o.hit_points, 1), hitDice: o.hit_dice || '',
    abilities,
    ...(Object.keys(saves).length ? { saves } : {}),
    ...(Object.keys(skills).length ? { skills } : {}),
    damageResistances: splitDefenses(ri.damage_resistances_display || ri.damage_resistances),
    damageImmunities: splitDefenses(ri.damage_immunities_display || ri.damage_immunities),
    damageVulnerabilities: splitDefenses(ri.damage_vulnerabilities_display || ri.damage_vulnerabilities),
    conditionImmunities: splitDefenses(ri.condition_immunities_display || ri.condition_immunities),
    senses: senses.join(', ') || '—',
    languages: o.languages?.as_string ?? (typeof o.languages === 'string' ? o.languages : '—'),
    traits: (o.traits || []).map(t => ({ name: both(t.name), desc: both(t.desc || '') })),
    actions,
    ...(bonusActions.length ? { bonusActions } : {}),
    ...(legendaryActions.length ? { legendary: { uses: 3, actions: legendaryActions } } : {}),
    ...(reactions.length ? { reactions } : {}),
    sourceDoc: o.document?.name || '',
  }, 'open5e');
  return { monster: m, warnings: [] };
}

// ============================================================
// Entrada única
// ============================================================

export function detectFormat(o) {
  if (!o || typeof o !== 'object') return null;
  if (o.saveVersion != null && o.stats && o.HP) return '5emm';
  if (o.ability_scores && o.hit_points != null) return 'open5e-v2';
  if (o.strength != null && o.hit_points != null) return 'open5e-v1';
  return null;
}

/**
 * Converte texto JSON (ou objeto já lido) em monstros do nosso formato.
 * Retorna { monsters, errors, warnings } — nunca lança.
 */
export function importMonsters(input, { lang = 'pt' } = {}) {
  let data = input;
  const errors = [];
  const warnings = [];
  if (typeof input === 'string') {
    try { data = JSON.parse(input.replace(/^﻿/, '')); } catch (e) {
      return { monsters: [], errors: [L(lang, 'JSON inválido: ', 'Invalid JSON: ') + e.message], warnings };
    }
  }
  const items = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [data];
  const monsters = [];
  items.forEach((item, i) => {
    const fmt = detectFormat(item);
    const label = item?.name ? `"${item.name}"` : `#${i + 1}`;
    if (!fmt) {
      errors.push(L(lang, `${label}: formato não reconhecido (esperado .5emm.json ou criatura do Open5e).`, `${label}: unrecognized format (expected .5emm.json or Open5e creature).`));
      return;
    }
    let r;
    try {
      r = fmt === '5emm' ? convert5emm(item, { lang }) : fmt === 'open5e-v2' ? convertOpen5eV2(item, { lang }) : convertOpen5eV1(item, { lang });
    } catch (e) {
      errors.push(`${label}: ${e.message}`);
      return;
    }
    if (r.errors?.length) errors.push(...r.errors.map(e => `${label}: ${e}`));
    if (r.monster) monsters.push(r.monster);
    for (const w of r.warnings || []) if (!warnings.includes(w)) warnings.push(w);
  });
  return { monsters, errors, warnings };
}

export default importMonsters;

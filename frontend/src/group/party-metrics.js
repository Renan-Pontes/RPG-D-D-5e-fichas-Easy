// Raio-X do grupo (Grupo › Raio-X): as contas, sem React — testadas em
// tests/party-metrics.test.js. Tudo sai da ficha que o GET da campanha já entrega
// ao mestre (members[].character.data), com as MESMAS funções da ficha (utils.js,
// progression, creation.js): os números batem com os da Agora e da ficha, e o
// servidor não faz conta nenhuma (0 pedido a mais). Fórmulas: especificação §6.3.
//
//  - sheetFacts(ficha, lang)        a ficha em números (dano/rodada, PV efetivos, cura…)
//  - axisScores(fatos, opts)        11 eixos do Ivan: base da classe → ficha → final
//  - partyAxes(fatos, opts)         média, melhor (ou "2 melhores") e o 2º do grupo
//  - partySkills(fatos, dc)         18 perícias: passiva do melhor e chance do grupo
//  - partyDamage / partySchools     tipos de dano e escolas de magia de quem entra
//  - whyAxis(fato, eixo, opts)      a folha "Por quê": base → ficha → final + motivos
import Utils from '../../utils.js';
import SRD from '../../data/srd.js';
import { tName } from '../../data/i18n.js';
import { computeProgression } from '../progression/engine.js';
import { computeResources } from '../progression/resources.js';
import { knownSpells } from '../creator/creation.js';
import TAGS from '../../data/spell-tags.json' with { type: 'json' };

export const t = (lang, pt, en) => (lang === 'en' ? en : pt);

export const AXES = ['dmg', 'mit', 'magic', 'heal', 'ranged', 'melee', 'control', 'utility', 'mobility', 'social', 'explore'];
export const AXIS_LABELS = {
  dmg: ['Dano', 'Damage'], mit: ['Mitigação', 'Mitigation'], magic: ['Magia', 'Magic'], heal: ['Cura', 'Healing'],
  ranged: ['Distância', 'Ranged'], melee: ['Corpo a corpo', 'Melee'], control: ['Controle', 'Control'],
  utility: ['Utilidade', 'Utility'], mobility: ['Mobilidade', 'Mobility'], social: ['Social', 'Social'],
  explore: ['Exploração', 'Exploration'],
};
export const axisLabel = (k, lang) => (AXIS_LABELS[k] ? AXIS_LABELS[k][lang === 'en' ? 1 : 0] : k);

// Tabela do Ivan (pág. 1, "Party Comp Attributes [1-5]"), na ordem de AXES. O mestre
// pode editar (partyInsights.base, só as classes mudadas). Blood Hunter fica de fora.
export const IVAN_BASE = {
  artificer: [3, 3, 4, 3, 4, 3, 4, 5, 3, 2, 3],
  barbarian: [5, 5, 1, 1, 2, 5, 1, 1, 4, 2, 4],
  bard:      [1, 1, 4, 3, 3, 2, 5, 4, 2, 5, 2],
  cleric:    [2, 2, 5, 5, 2, 1, 4, 3, 1, 4, 1],
  druid:     [3, 2, 5, 5, 2, 3, 5, 5, 3, 2, 4],
  fighter:   [4, 4, 1, 2, 4, 5, 3, 2, 3, 1, 2],
  monk:      [3, 3, 1, 2, 1, 5, 1, 2, 5, 2, 5],
  paladin:   [5, 4, 3, 4, 1, 5, 2, 3, 2, 4, 1],
  ranger:    [3, 2, 3, 3, 5, 3, 2, 4, 4, 3, 5],
  rogue:     [3, 3, 1, 1, 4, 4, 1, 4, 4, 3, 5],
  sorcerer:  [4, 2, 5, 1, 4, 2, 3, 3, 1, 4, 1],
  warlock:   [4, 1, 4, 2, 5, 2, 3, 3, 1, 4, 2],
  wizard:    [5, 2, 5, 1, 5, 1, 5, 4, 2, 1, 2],
};
export const BASE_CLASSES = Object.keys(IVAN_BASE);

export const SKILLS = SRD.SKILLS.map(s => s.id);
export const SKILL_ABILITY = Object.fromEntries(SRD.SKILLS.map(s => [s.id, s.stat]));
export const ABILS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABIL_SHORT = {
  str: ['FOR', 'STR'], dex: ['DES', 'DEX'], con: ['CON', 'CON'], int: ['INT', 'INT'], wis: ['SAB', 'WIS'], cha: ['CAR', 'CHA'],
};
export const abilShort = (a, lang) => ABIL_SHORT[a]?.[lang === 'en' ? 1 : 0] || a;
export const DAMAGE_TYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
export const DAMAGE_LABELS = {
  acid: ['ácido', 'acid'], bludgeoning: ['concussão', 'bludgeoning'], cold: ['frio', 'cold'], fire: ['fogo', 'fire'],
  force: ['energia', 'force'], lightning: ['elétrico', 'lightning'], necrotic: ['necrótico', 'necrotic'],
  piercing: ['perfurante', 'piercing'], poison: ['veneno', 'poison'], psychic: ['psíquico', 'psychic'],
  radiant: ['radiante', 'radiant'], slashing: ['cortante', 'slashing'], thunder: ['trovejante', 'thunder'],
};
export const damageLabel = (k, lang) => DAMAGE_LABELS[k]?.[lang === 'en' ? 1 : 0] || k;
export const SCHOOLS = ['abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation'];
export const SCHOOL_LABELS = {
  abjuration: ['Abjuração', 'Abjuration'], conjuration: ['Conjuração', 'Conjuration'], divination: ['Adivinhação', 'Divination'],
  enchantment: ['Encantamento', 'Enchantment'], evocation: ['Evocação', 'Evocation'], illusion: ['Ilusão', 'Illusion'],
  necromancy: ['Necromancia', 'Necromancy'], transmutation: ['Transmutação', 'Transmutation'],
};
export const schoolLabel = (k, lang) => SCHOOL_LABELS[k]?.[lang === 'en' ? 1 : 0] || k;
export const skillLabel = (k, lang) => tName('skill', k, lang === 'en' ? 'en' : 'pt');

// Cores: média e melhor (só no Papel do grupo) e uma por personagem, validadas no
// fundo do cartão (#221a13). A cor segue o personagem: tirar alguém não repinta os outros.
export const AVG_COLOR = '#3987e5';
export const BEST_COLOR = '#d95926';
export const CHAR_COLORS = ['#199e70', '#c98500', '#d55181', '#9085e9', '#3987e5', '#d95926'];

export const clamp = (lo, hi, v) => Math.max(lo, Math.min(hi, v));
export const r1 = (v) => Math.round(v * 10) / 10;
const safe = (fn, fb = null) => { try { const v = fn(); return v ?? fb; } catch { return fb; } };
const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
/** "3,4" (pt) / "3.4" (en), 1 casa só quando precisa. */
export const fmt = (v, lang) => { const s = String(r1(v)); return lang === 'en' ? s : s.replace('.', ','); };
export const fmtMod = (v) => (v >= 0 ? `+${v}` : `−${Math.abs(v)}`);
export const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || String(n || '');

/** Média do dado ("2d6+3" → 10). */
export function avgDice(expr) {
  let n = 0;
  for (const m of String(expr || '').matchAll(/(\d+)d(\d+)/g)) n += (+m[1]) * (+m[2] + 1) / 2;
  const flat = /([+-]\s*\d+)\s*$/.exec(String(expr || '').trim());
  return n + (flat && /d/.test(expr) ? +flat[1].replace(/\s/g, '') : 0);
}

// ---------------------------------------------------------------- referências do nível
// "Monstro típico do nível" (heurística calibrada nos níveis 1–5; §6.3).
export const monsterAc = (L) => clamp(13, 19, 13 + Math.floor(L / 3));
export const monsterAtk = (L) => Math.min(10, 3 + Math.floor(L / 2));
export const monsterSave = (L) => 1 + Math.floor(L / 3);
export const dprRef = (L) => 4 + 2 * L;
export const hpRef = (L) => 4 + 6 * L;
export const pHit = (bonus, ac) => clamp(0.05, 0.95, (21 - (ac - bonus)) / 20);
export const pFail = (dc, save) => clamp(0.05, 0.95, (dc - save - 1) / 20);
export const eHpRef = (L) => hpRef(L) / pHit(monsterAtk(L), 15);
export const bRef = (L) => 2 + SRD.profBonus(L);
export const toScore = (x, ref) => clamp(1, 5, 1 + 2 * x / ref);
export const skillScore = (b, L) => clamp(1, 5, 3 + (b - bRef(L)) / 2);
const cantripTier = (L) => (L >= 17 ? 4 : L >= 11 ? 3 : L >= 5 ? 2 : 1);

/** Chance de passar num teste de bônus `b` contra a CD (o 1 natural não falha teste). */
export const chance = (b, dc) => clamp(0.05, 1, (21 + b - dc) / 20);
/** "Pelo menos 1 passa se todos tentarem": 1 − Π(1 − chance). */
export const groupChance = (bonuses, dc) => 1 - bonuses.reduce((p, b) => p * (1 - chance(b, dc)), 1);
export const pct = (p) => Math.round(p * 100);

/** Etiquetas da magia (data/spell-tags.json, gerado por scripts/build-spell-tags.mjs). */
export function spellTags(id, rulesVersion) {
  return (rulesVersion !== '2024' && TAGS.legacy[id]) || TAGS.spells[id] || {};
}

// ---------------------------------------------------------------- CD e ataque por classe
/**
 * Atributo de conjuração de UMA magia: o da classe de origem (a lista onde a magia
 * está; com mais de uma, a de melhor modificador); talento com atributo escolhido usa
 * o dele; espécie e o resto, o maior de INT/SAB/CAR. Hoje Utils.spellSaveDc usa só a
 * 1ª classe conjuradora (um Clérigo 1/Mago 3 teria as magias de Mago com SAB).
 */
export function spellAbilityFor(c, spellId, source = 'class') {
  const mod = (a) => Utils.abilityMod(c, a);
  const best = (list) => list.reduce((a, b) => (mod(b) > mod(a) ? b : a));
  if (source === 'feat') {
    const f = (c.feats || []).find(x => Object.values(x?.picks || {}).some(v => (Array.isArray(v) ? v : [v]).includes(spellId)));
    if (ABILS.includes(f?.picks?.spellAbility)) return f.picks.spellAbility;
  }
  if (source === 'class') {
    const sp = Utils.spellCatalog(c).find(s => s.id === spellId);
    const views = safe(() => Utils.casterViews(c), []);
    const abil = views.filter(v => Utils.inSpellList(v, sp)).map(v => Utils.spellcastingAbilityOfClass(v)).filter(Boolean);
    if (abil.length) return best(abil);
    const first = safe(() => Utils.spellcastingAbility(c));
    if (first) return first;
  }
  return best(['int', 'wis', 'cha']);
}

export function spellDcFor(c, spellId, source) {
  return 8 + Utils.profBonus(c) + Utils.abilityMod(c, spellAbilityFor(c, spellId, source));
}
export function spellAttackFor(c, spellId, source) {
  return Utils.profBonus(c) + Utils.abilityMod(c, spellAbilityFor(c, spellId, source));
}

// ---------------------------------------------------------------- a ficha em números
const MASTERY_CONTROL = { topple: 0.5, push: 0.5, slow: 0.5, sap: 0.25 };
const MASTERY_LABELS = { topple: ['Derrubar', 'Topple'], push: ['Empurrar', 'Push'], slow: ['Lentidão', 'Slow'], sap: ['Enfraquecer', 'Sap'] };

/**
 * A ficha em números (tudo o que os gráficos e a tabela usam). `id` é o da ficha
 * (character.id) quando vem de memberFacts.
 */
export function sheetFacts(c, lang = 'pt') {
  const L = c.level || 1;
  const rv = c.rulesVersion === '2024' ? '2024' : '2014';
  const prog = safe(() => computeProgression(c), { extraAttacks: 0, features: [] });
  const res = safe(() => computeResources(c), []);
  const catalog = Utils.spellCatalog(c) || [];
  const byId = new Map(catalog.map(s => [s.id, s]));
  const allKnown = safe(() => knownSpells(c, lang), []);
  const spells = allKnown.filter(s => s.prepared).map(s => {
    const tags = spellTags(s.id, rv);
    const dc = safe(() => spellDcFor(c, s.id, s.source), null);
    const atk = safe(() => spellAttackFor(c, s.id, s.source), null);
    const range = String(byId.get(s.id)?.range || '');
    const rangeFt = /touch/i.test(range) ? 5 : /self/i.test(range) && !/\(/.test(range) ? 0 : (+(/(\d+)/.exec(range) || [])[1] || 0);
    return { ...s, tags, dc, atk, rangeFt, ritual: !!byId.get(s.id)?.ritual };
  });
  const knows = (id) => spells.some(s => s.id === id);
  const sg = safe(() => Utils.speciesGrants(c), { resist: [], darkvision: 0 }) || {};
  const slots = safe(() => Utils.spellSlots(c), []) || [];
  const slotPower = slots.reduce((n, k, i) => n + k * (i + 1), 0);
  const slotCount = slots.reduce((n, k) => n + k, 0);
  const ac = safe(() => Utils.computeAc(c), c.armorClass ?? 10);
  const dex = Utils.abilityMod(c, 'dex');
  const acMage = !c.armor && knows('mageArmor') ? Math.max(ac, 13 + dex + (c.hasShield ? 2 : 0)) : ac;
  const maxHp = c.maxHp || safe(() => Utils.maxHpDefault(c), 0) || 0;
  const feats = [...(prog.features || []).map(f => f.id || f.name), ...(c.feats || []).map(f => f?.id)].filter(Boolean);
  const lvlOf = (cls) => safe(() => Utils.classLevel(c, cls), 0) || 0;
  const tAc = monsterAc(L);
  const attacks = 1 + (prog.extraAttacks || 0);
  const tx = (pt, en) => t(lang, pt, en);

  // armas: dano esperado por rodada contra a CA típica do nível
  const weaponRows = (c.weapons || []).map(w => {
    const a = safe(() => Utils.attackFor(c, w));
    if (!a) return null;
    const def = w.id ? SRD.weaponFor(w.id, c.rulesVersion) : null;
    const props = def?.props || w.props || [];
    const ranged = (def?.type || '').includes('ranged');
    const avg = avgDice(a.dice) + (a.dmgMod || 0);
    return {
      name: w.name || def?.name?.[lang] || def?.name?.pt || w.id || '?', dice: a.damage, ranged, thrown: props.includes('thrown'),
      light: props.includes('light'), type: a.dmgType, avg, bonus: a.bonus, exp: avg * pHit(a.bonus, tAc) * attacks,
    };
  }).filter(Boolean);
  const un = safe(() => Utils.unarmedStrike(c));
  if (un) {
    const avg = avgDice(un.dice) + (un.dice ? un.dmgMod : 0) || un.dmgMod;
    weaponRows.push({ name: tx('Desarmado', 'Unarmed'), dice: un.damage, ranged: false, thrown: false, light: false, type: 'bludgeoning', avg, bonus: un.bonus, exp: avg * pHit(un.bonus, tAc) * attacks });
  }
  // mão inábil (duas armas leves corpo a corpo): só o dado
  const lights = weaponRows.filter(w => w.light && !w.ranged);
  const offWeapon = lights.length ? (c.weapons || []).find(w => w.name === lights[0].name) : null;
  const offhand = lights.length >= 2 || (lights.length === 1 && /×\s*[2-9]/.test(lights[0].name))
    ? avgDice(offWeapon?.damage || '1d4') * pHit(lights[0].bonus, tAc) : 0;

  // dano que vai junto do acerto: 1×/turno (Ataque Furtivo, Destruição Divina) ou por acerto
  const riders = [];
  const rogue = lvlOf('rogue');
  if (rogue) riders.push({ id: 'sneak', label: tx(`Ataque Furtivo ${Math.ceil(rogue / 2)}d6`, `Sneak Attack ${Math.ceil(rogue / 2)}d6`), perTurn: Math.ceil(rogue / 2) * 3.5 });
  const barb = lvlOf('barbarian');
  if (barb) riders.push({ id: 'rage', label: tx('Fúria', 'Rage'), perHit: barb >= 16 ? 4 : barb >= 9 ? 3 : 2, meleeOnly: true });
  const spellName = (id) => spells.find(s => s.id === id)?.name || id;
  if (knows('huntersMark')) riders.push({ id: 'hm', label: spellName('huntersMark'), perHit: 3.5, type: rv === '2024' ? 'force' : null });
  if (knows('hex')) riders.push({ id: 'hex', label: spellName('hex'), perHit: 3.5, type: 'necrotic' });
  const paladin = lvlOf('paladin');
  if (paladin && slotCount > 0 && (rv === '2024' ? knows('divineSmite') || paladin >= 2 : paladin >= 2)) {
    riders.push({ id: 'smite', label: tx('Destruição Divina', 'Divine Smite'), perTurn: 9 * 0.5, type: 'radiant', meleeOnly: true });
  }

  const bestWeapon = (filter) => {
    const rows = weaponRows.filter(filter);
    if (!rows.length) return { exp: 0, row: null, riders: [] };
    const best = rows.reduce((a, b) => (b.exp > a.exp ? b : a));
    let exp = best.exp + (best.ranged ? 0 : offhand);
    const p = pHit(best.bonus, tAc);
    const used = [];
    for (const r of riders) {
      if (r.meleeOnly && best.ranged) continue;
      if (r.perHit) exp += r.perHit * p * attacks;
      if (r.perTurn) exp += r.perTurn * (1 - Math.pow(1 - p, attacks));
      used.push(r.label);
    }
    return { exp, row: best, riders: used };
  };
  // magias de dano: truque escalado; magia de círculo vale metade (é recurso que acaba)
  const spellExp = (s) => {
    const g = s.tags;
    if (!g.dmg || g.rider) return 0;
    let avg = g.avg || (s.level === 0 ? 4.5 : 0);
    if (s.level === 0) avg *= cantripTier(L);
    const save = monsterSave(L);
    const p = g.atk && s.atk != null ? pHit(s.atk, tAc)
      : g.save && s.dc != null ? pFail(s.dc, save) + (g.half ? (1 - pFail(s.dc, save)) * 0.5 : 0)
      : 1; // sem ataque nem salvaguarda: acerta sempre (Mísseis Mágicos)
    return avg * p * (g.area ? 2 : 1) * (s.level === 0 ? 1 : 0.5);
  };
  const spellRows = spells.filter(s => s.tags.dmg && !s.tags.rider).map(s => ({
    id: s.id, name: s.name, level: s.level, exp: spellExp(s), dice: s.tags.avg, types: s.tags.dmg,
    // alcance "Pessoal" (Onda Trovejante, Mãos Flamejantes) é luta de perto também
    ranged: s.rangeFt >= 30, melee: s.rangeFt < 30,
  }));
  const bestSpell = (f) => spellRows.filter(f).reduce((a, b) => (b.exp > a.exp ? b : a), { exp: 0 });

  const wAll = bestWeapon(() => true), wRanged = bestWeapon(w => w.ranged || w.thrown), wMelee = bestWeapon(w => !w.ranged);
  const sAll = bestSpell(() => true), sRanged = bestSpell(s => s.ranged), sMelee = bestSpell(s => s.melee);
  const dpr = Math.max(wAll.exp, sAll.exp);
  const rangedDpr = Math.max(wRanged.exp * (wRanged.row && !wRanged.row.ranged ? 0.7 : 1), sRanged.exp);
  const meleeDpr = Math.max(wMelee.exp, sMelee.exp);
  const weaponLabel = (w) => (w ? `${w.name} ${fmtMod(w.bonus)}, ${w.dice}` : null);
  const spellLabel = (s) => (s?.name ? s.name : null);
  const topSpells = spellRows.slice().sort((a, b) => b.exp - a.exp).slice(0, 2).map(s => s.name);
  const dmgWhy = sAll.exp > wAll.exp ? topSpells : [weaponLabel(wAll.row), ...wAll.riders].filter(Boolean);
  const rangedWhy = [sRanged.exp >= wRanged.exp ? spellLabel(sRanged) : weaponLabel(wRanged.row)].filter(Boolean);
  const meleeWhy = [sMelee.exp > wMelee.exp ? spellLabel(sMelee) : weaponLabel(wMelee.row)].filter(Boolean);

  // defesa: PV efetivos contra o ataque típico do nível
  let mult = 1;
  const mitWhy = [tx(`CA ${acMage} · PV ${maxHp}`, `AC ${acMage} · HP ${maxHp}`)];
  if (barb) { mult *= 1.5; mitWhy.push(tx('Fúria (resistência)', 'Rage (resistance)')); }
  if (rogue >= 5) { mult *= 1.15; mitWhy.push(tx('Esquiva Sobrenatural', 'Uncanny Dodge')); }
  if (knows('shield')) { mult *= 1.1; mitWhy.push(spellName('shield')); }
  const resist = sg.resist || [];
  if (resist.length) { mult *= 1 + 0.05 * resist.length; mitWhy.push(tx(`resiste a ${resist.map(x => damageLabel(x, lang)).join(', ')}`, `resists ${resist.join(', ')}`)); }
  if (acMage !== ac) mitWhy.push(tx(`${spellName('mageArmor')} (CA ${acMage})`, `${spellName('mageArmor')} (AC ${acMage})`));
  const eHp = maxHp / pHit(monsterAtk(L), acMage) * mult;

  // cura por dia: melhor magia de cura × até 3 espaços + Imposição de Mãos + Mãos Curativas
  const healSpells = spells.filter(s => s.tags.heal > 0 && s.level > 0);
  const healOf = (s) => s.tags.heal + (s.tags.hm ? Utils.abilityMod(c, spellAbilityFor(c, s.id, s.source)) : 0);
  const bestHeal = healSpells.reduce((m, s) => Math.max(m, healOf(s)), 0);
  const loh = res.find(r => r.id === 'layOnHands')?.max || 0;
  const hands = res.find(r => r.id === 'healingHands') ? 2.5 * SRD.profBonus(L) : 0;
  const healDay = bestHeal * Math.min(slotCount, 3) + loh + hands;
  const healWhy = [...healSpells.map(s => s.name), loh ? tx(`Imposição de Mãos ${loh}`, `Lay on Hands ${loh}`) : null, hands ? tx('Mãos Curativas', 'Healing Hands') : null].filter(Boolean);

  // controle
  const masteries = rv === '2024' ? (c.classOptions || []).filter(o => o?.pool === 'weaponMastery')
    .map(o => safe(() => SRD.weaponFor(o.id, c.rulesVersion)?.mastery)).filter(Boolean) : [];
  let control = 0;
  const ctlWhy = [];
  for (const s of spells) {
    if (!s.tags.ctl) continue;
    control += s.level === 0 ? 0.5 : (s.tags.ctl === 'area' || s.tags.area) ? 1.5 : 1;
    ctlWhy.push(s.name);
  }
  for (const m of masteries) {
    if (!MASTERY_CONTROL[m]) continue;
    control += MASTERY_CONTROL[m];
    ctlWhy.push(tx(`maestria ${MASTERY_LABELS[m][0]}`, `${MASTERY_LABELS[m][1]} mastery`));
  }
  if (lvlOf('monk') >= 5) { control += 1.5; ctlWhy.push(tx('Golpe Atordoante', 'Stunning Strike')); }
  if (/battle/i.test(String(c.subclass || '')) && lvlOf('fighter') >= 3) { control += 1.5; ctlWhy.push(tx('Manobras', 'Maneuvers')); }

  // utilidade
  const tools = c.toolProfs || [];
  const expertise = SKILLS.filter(k => safe(() => Utils.hasExpertise(c, k), false)).length;
  const langs = safe(() => Utils.languagesFor(c).length, 0) || 0;
  const utilSpells = spells.filter(s => !s.tags.dmg && !s.tags.heal && !s.tags.ctl);
  const thieves = tools.includes('thievesTools');
  const utility = 0.5 * utilSpells.length + 0.25 * utilSpells.filter(s => s.ritual).length + 0.5 * tools.length
    + (thieves ? 0.5 : 0) + 0.5 * expertise + 0.25 * Math.max(0, langs - 2);
  const utilWhy = [...utilSpells.slice(0, 4).map(s => s.name),
    tools.length ? tx(`${tools.length} ferramenta(s)`, `${tools.length} tool(s)`) : null,
    expertise ? tx(`${expertise} especialização(ões)`, `${expertise} expertise`) : null].filter(Boolean);

  // mobilidade (Utils.speed já soma Movimento sem Armadura e Movimento Rápido)
  const speed = safe(() => Utils.speed(c), 30) || 30;
  const mobSpells = spells.filter(s => s.tags.mob);
  const cunning = rogue >= 2 || lvlOf('monk') >= 2;
  const mobile = feats.some(f => /^mobile/i.test(String(f)));
  const mobility = speed / 30 + 0.5 * mobSpells.length + (cunning ? 0.5 : 0) + (mobile ? 0.5 : 0);
  const mobWhy = [tx(`deslocamento ${speed} pés`, `speed ${speed} ft`), ...mobSpells.map(s => s.name),
    cunning ? (rogue >= 2 ? tx('Ação Ardilosa', 'Cunning Action') : tx('Passo do Vento', 'Step of the Wind')) : null,
    mobile ? tx('Móvel', 'Mobile') : null].filter(Boolean);

  // perícias, salvaguardas, atributos
  const skills = Object.fromEntries(SKILLS.map(k => [k, safe(() => Utils.skillBonus(c, k), 0) || 0]));
  const saves = Object.fromEntries(ABILS.map(k => [k, safe(() => Utils.saveBonus(c, k), 0) || 0]));
  const scores = Object.fromEntries(ABILS.map(k => [k, Utils.abilityWithRace(c, k)]));
  const mods = Object.fromEntries(ABILS.map(k => [k, Utils.abilityMod(c, k)]));
  const topOf = (keys, n) => keys.map(k => ({ k, b: skills[k] })).sort((a, b) => b.b - a.b).slice(0, n);
  const socialTop = topOf(['persuasion', 'deception', 'intimidation', 'performance', 'insight'], 2);
  const exploreTop = topOf(['perception', 'survival', 'stealth', 'investigation', 'nature', 'athletics'], 3);
  const socialSpells = spells.filter(s => s.tags.soc);
  const exploreSpells = spells.filter(s => s.tags.exp);
  const skillChips = (list) => list.map(x => `${skillLabel(x.k, lang)} ${fmtMod(x.b)}`);

  // tipos de dano que entrega (arma, magia, o que vai junto do acerto, sopro)
  const dmgTypes = {};
  const addType = (k, src, exp) => { if (!k) return; const key = String(k).toLowerCase(); if (!DAMAGE_TYPES.includes(key)) return; (dmgTypes[key] ||= []).push({ src, exp: r1(exp || 0) }); };
  for (const w of weaponRows) addType(w.type, w.name, w.exp);
  for (const s of spells) for (const k of s.tags.dmg || []) addType(k, s.name, spellExp(s));
  for (const r of riders) if (r.type) addType(r.type, r.label, (r.perHit || r.perTurn || 0) * 0.6);
  const breath = sg.options?.ancestry?.damage;
  if (breath) addType(breath, tx('Sopro', 'Breath'), 0);
  const schools = {};
  for (const s of allKnown) { const sp = byId.get(s.id); if (sp?.school) (schools[sp.school] ||= []).push(s.name); }

  const classes = safe(() => Utils.classEntries(c), null) || [{ id: c.className, level: L, subclass: c.subclass || '' }];
  const primary = classes.slice().sort((a, b) => (b.level || 0) - (a.level || 0))[0] || null;
  return {
    name: c.name || '', rules: rv, level: L,
    classes: classes.map(e => ({ id: e.id, level: e.level || 0, subclass: e.subclass || '' })),
    primary: primary?.id || c.className || '', secondary: classes.find(e => e.id !== primary?.id)?.id || '',
    race: c.race, prof: Utils.profBonus(c), ac, acMage, maxHp, speed,
    passive: { perception: 10 + skills.perception, investigation: 10 + skills.investigation, insight: 10 + skills.insight },
    scores, mods, saves, skills, darkvision: sg.darkvision || 0, resist, tools, langs, expertise, thieves,
    slots, slotPower, slotCount, cantrips: allKnown.filter(s => s.level === 0).length, leveled: allKnown.filter(s => s.level > 0 && s.prepared).length,
    weapons: weaponRows.map(w => ({ ...w, exp: r1(w.exp) })), riders: riders.map(r => r.label),
    spellDmg: spellRows.map(s => ({ ...s, exp: r1(s.exp) })),
    dpr: r1(dpr), rangedDpr: r1(rangedDpr), meleeDpr: r1(meleeDpr), eHp: r1(eHp), healDay: r1(healDay),
    control: r1(control), utility: r1(utility), mobility: r1(mobility),
    socialB: r1(mean(socialTop.map(x => x.b))), exploreB: r1(mean(exploreTop.map(x => x.b))),
    socialSpells: socialSpells.map(s => s.name), exploreSpells: exploreSpells.map(s => s.name),
    healWhy, ctlWhy, mobSpells: mobSpells.map(s => s.name), cunning,
    why: {
      dmg: dmgWhy, mit: mitWhy, magic: [
        slotCount ? tx(`${slotCount} espaço(s) de magia`, `${slotCount} spell slot(s)`) : tx('sem espaços de magia', 'no spell slots'),
        tx(`${allKnown.filter(s => s.level === 0).length} truque(s)`, `${allKnown.filter(s => s.level === 0).length} cantrip(s)`),
        tx(`${allKnown.filter(s => s.level > 0 && s.prepared).length} magia(s) preparada(s)`, `${allKnown.filter(s => s.level > 0 && s.prepared).length} prepared spell(s)`),
      ],
      heal: healWhy, ranged: rangedWhy, melee: [...meleeWhy, tx(`PV efetivos ${fmt(eHp, lang)}`, `effective HP ${fmt(eHp, lang)}`)],
      control: ctlWhy, utility: utilWhy, mobility: mobWhy,
      social: [...skillChips(socialTop), ...socialSpells.map(s => s.name)],
      explore: [...skillChips(exploreTop), sg.darkvision >= 60 ? tx(`visão no escuro ${sg.darkvision} pés`, `darkvision ${sg.darkvision} ft`) : null,
        thieves ? tx('Ferramentas de Ladrão', "Thieves' Tools") : null, ...exploreSpells.map(s => s.name)].filter(Boolean),
    },
    dmgTypes, schools,
    story: { bonds: c.bonds || '', ideals: c.ideals || '', flaws: c.flaws || '', personality: c.personality || '' },
  };
}

// ---------------------------------------------------------------- 11 eixos
/** Tabela de classes em uso: a do Ivan com as linhas que o mestre editou. */
export function baseTable(edited) {
  const out = { ...IVAN_BASE };
  for (const [k, row] of Object.entries(edited || {})) if (IVAN_BASE[k] && Array.isArray(row) && row.length === AXES.length) out[k] = row;
  return out;
}

/** base(eixo) = Σ (nível na classe × T[classe][eixo]) / nível total; classe sem linha → 3. */
export function classBase(f, table = IVAN_BASE) {
  const tot = f.classes.reduce((n, e) => n + (e.level || 0), 0) || 1;
  return AXES.map((_, i) => f.classes.reduce((n, e) => n + (table[e.id]?.[i] ?? 3) * (e.level || 0), 0) / tot);
}

/** Média da tabela para uma lista de classes (o azul do Ivan: só as classes primárias). */
export function baseAverage(classIds, table = IVAN_BASE) {
  return AXES.map((_, i) => r1(mean(classIds.map(id => table[id]?.[i] ?? 3))));
}

/** Nota medida na ficha (1–5, "3 = o normal do nível") de cada eixo. */
export function sheetScores(f) {
  const L = f.level;
  const magicRef = 0.6 * ((SRD.getSpellSlots('wizard', L) || []).reduce((n, k, i) => n + k * (i + 1), 0) + 3 + 0.5 * (L + 1));
  const magicX = f.slotPower + f.cantrips + 0.5 * f.leveled;
  const meleeX = 0.6 * (f.meleeDpr / dprRef(L)) + 0.4 * (f.eHp / eHpRef(L));
  return {
    dmg: toScore(f.dpr, dprRef(L)),
    mit: toScore(f.eHp, eHpRef(L)),
    magic: toScore(magicX, magicRef),
    heal: toScore(f.healDay, 3 * L + 6),
    ranged: toScore(f.rangedDpr, dprRef(L)),
    melee: clamp(1, 5, 1 + 2 * meleeX),
    control: toScore(f.control, 2 + L / 4),
    utility: toScore(f.utility, 3 + L / 2),
    mobility: toScore(f.mobility, 1.5),
    social: clamp(1, 5, skillScore(f.socialB, L) + Math.min(0.5, 0.25 * f.socialSpells.length)),
    explore: clamp(1, 5, skillScore(f.exploreB, L) + (f.darkvision >= 60 ? 0.25 : 0) + (f.thieves ? 0.25 : 0) + Math.min(0.5, 0.25 * f.exploreSpells.length)),
  };
}

/** final = base + (1 − w)·(ficha − base). w: 1 = só a Tabela, 0 = só a Ficha. */
export function axisScores(f, { w = 0.5, base = null } = {}) {
  const b = classBase(f, baseTable(base));
  const sheet = sheetScores(f);
  return Object.fromEntries(AXES.map((k, i) => [k, {
    base: r1(b[i]), sheet: r1(sheet[k]), final: r1(clamp(1, 5, b[i] + (1 - w) * (sheet[k] - b[i]))),
  }]));
}

/**
 * Média, melhor (com quem; empate lista todos), 2º e "2 melhores" de cada eixo.
 * `rep: 'top2'` faz o laranja mostrar a média dos 2 melhores (há reserva se alguém cai?).
 */
export function partyAxes(facts, { w = 0.5, base = null, rep = 'best' } = {}) {
  const rows = facts.map(f => ({ id: f.id, name: f.name, s: axisScores(f, { w, base }) }));
  const axes = {};
  for (const k of AXES) {
    const vals = rows.map(r => ({ id: r.id, name: r.name, v: r.s[k].final })).sort((a, b) => b.v - a.v);
    const best = vals[0]?.v ?? 0;
    const second = vals[1]?.v ?? best;
    const holders = vals.filter(x => x.v === best);
    axes[k] = {
      avg: r1(mean(vals.map(x => x.v))), best, second: vals[1]?.v ?? 0, top2: r1((best + second) / 2),
      bestWho: holders.map(x => x.name), bestIds: holders.map(x => x.id), secondWho: vals[1]?.name || '',
      shown: rep === 'top2' ? r1((best + second) / 2) : best,
    };
  }
  return { rows, axes };
}

// ---------------------------------------------------------------- perícias, dano, escolas
/** As 18 perícias: o melhor bônus, a passiva dele (escala 0–20 do Ivan) e as chances. */
export function partySkills(facts, dc = 15) {
  return SKILLS.map(k => {
    const vals = facts.map(f => ({ id: f.id, name: f.name, b: f.skills[k] })).sort((a, b) => b.b - a.b);
    const best = vals[0]?.b ?? 0;
    return {
      skill: k, ability: SKILL_ABILITY[k], best, passive: 10 + best,
      who: vals.filter(v => v.b === best).map(v => v.name), whoIds: vals.filter(v => v.b === best).map(v => v.id),
      second: vals[1]?.b ?? null, chanceBest: pct(chance(best, dc)),
      chanceSecond: vals[1] ? pct(chance(vals[1].b, dc)) : null,
      chanceGroup: pct(groupChance(facts.map(f => f.skills[k]), dc)), avg: r1(mean(vals.map(v => v.b))),
    };
  });
}

/** Quem causa cada um dos 13 tipos de dano, e por onde. */
export function partyDamage(facts) {
  return Object.fromEntries(DAMAGE_TYPES.map(k => [k, facts.filter(f => f.dmgTypes[k])
    .map(f => ({ id: f.id, name: f.name, via: [...new Set(f.dmgTypes[k].map(x => x.src))] }))]));
}

/** "Magias que têm": quantas magias de cada escola cada um conhece. */
export function partySchools(facts) {
  return Object.fromEntries(SCHOOLS.map(s => [s, facts.filter(f => f.schools[s]).map(f => ({ id: f.id, name: f.name, n: f.schools[s].length }))]));
}

/** "Lista da classe" (a referência da pág. 3 do Ivan): o catálogo pelas classes de cada um. */
export function classSchools(chars) {
  return Object.fromEntries(SCHOOLS.map(s => [s, chars.map(({ id, name, data }) => {
    const views = safe(() => Utils.casterViews(data), []) || [];
    const n = views.length ? (Utils.spellCatalog(data) || []).filter(sp => sp.school === s && views.some(v => Utils.inSpellList(v, sp))).length : 0;
    return { id, name, n };
  }).filter(x => x.n > 0)]));
}

/** Dano principal de um personagem: o tipo de maior dano esperado (e as alternativas). */
export function mainDamage(f) {
  return Object.entries(f.dmgTypes || {})
    .map(([k, v]) => ({ type: k, exp: Math.max(...v.map(x => x.exp)), via: v.slice().sort((a, b) => b.exp - a.exp)[0]?.src || '' }))
    .sort((a, b) => b.exp - a.exp);
}

// ---------------------------------------------------------------- "Por quê"
/** Folha "Por quê" de um eixo, para um personagem: base → ficha → final e os motivos. */
export function whyAxis(f, axis, { w = 0.5, base = null } = {}) {
  const s = axisScores(f, { w, base })[axis];
  return { ...s, chips: (f.why?.[axis] || []).filter(Boolean).slice(0, 6) };
}

// ---------------------------------------------------------------- quem é o grupo
/**
 * Personagens da mesa com ficha completa (o mestre recebe a ficha inteira), na ordem
 * de members, cada um com a cor fixa pela posição na mesa inteira.
 */
export function partyMembers(members) {
  const out = [];
  for (const m of members || []) {
    const ch = m?.character;
    if (!ch?.data || m.role === 'dm') continue;
    out.push({ id: ch.id, name: ch.name || ch.data.name || '?', player: m.user?.displayName || '', data: ch.data });
  }
  return out.map((p, i) => ({ ...p, color: CHAR_COLORS[i % CHAR_COLORS.length] }));
}

/** Quem entra: `include` (ids) do Ajustar; null/vazio de quem ainda está na mesa = todos. */
export function includedIds(party, include) {
  const all = party.map(p => p.id);
  if (!Array.isArray(include)) return all;
  return all.filter(id => include.includes(id));
}

/** Os fatos de cada personagem (com id, cor e jogador). */
export function partyFacts(party, lang = 'pt') {
  return party.map(p => ({ ...sheetFacts({ ...p.data, name: p.name }, lang), id: p.id, color: p.color, player: p.player }));
}

/** Nível médio do grupo (arredondado), que as lacunas usam como referência. */
export const partyLevel = (facts) => Math.max(1, Math.round(mean(facts.map(f => f.level || 1))));

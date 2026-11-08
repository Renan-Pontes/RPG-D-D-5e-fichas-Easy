/**
 * Módulo de ingestão e reconstrução automática de monstros via links diretos.
 *
 * Suporta:
 * 1. Links 5e.tools Bestiary (oficiais e homebrew):
 *    - https://5e.tools/bestiary.html#merchantman_irknemp
 *    - https://5e.tools/bestiary.html#clapped-out%20steamjack_irkcore
 *    - https://5e.tools/bestiary.html#sphinx_irkbnb
 *    - https://5e.tools/bestiary.html#goblin_mm
 *    - Espelhos: 5etools-mirror-3, etc.
 * 2. Links Open5e:
 *    - https://open5e.com/monsters/<slug>
 *    - https://api.open5e.com/v1/monsters/<slug>
 * 3. Links diretos para arquivos JSON (GitHub Raw, Gists, etc.):
 *    - .5emm.json (5e Monster Maker)
 *    - Open5e creature JSON
 *    - 5e.tools monster JSON
 *
 * Bypassa restrições de CORS e Cloudflare usando a infraestrutura de espelhos
 * abertos no GitHub (TheGiddyLimit/homebrew e 5etools-mirror-3/5etools-src).
 */
import { crToNumber, crLabel } from '../combat/cr-estimate.js';
import { parseActionText, convertOpen5eV1, convertOpen5eV2, convert5emm } from './import-5emm.js';
import { BESTIARY } from '../../data/bestiary.js';

const GITHUB_HB_RAW = 'https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/';
const GITHUB_OFFICIAL_RAW = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/bestiary/';

let cachedHbIndex = null;
let cachedOfficialIndex = null;

const both = (s) => ({ pt: s, en: s });
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);


export const CR_XP_MAP = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700,
  '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
  '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000, '16': 15000,
  '17': 18000, '18': 20000, '19': 22000, '20': 25000, '21': 33000, '22': 41000,
  '23': 50000, '24': 62000, '25': 75000, '26': 90000, '27': 105000, '28': 120000,
  '29': 135000, '30': 155000,
};

export function pbForCr(crNum) {
  const n = Number(crNum) || 0;
  if (n < 5) return 2;
  if (n < 9) return 3;
  if (n < 13) return 4;
  if (n < 17) return 5;
  if (n < 21) return 6;
  if (n < 25) return 7;
  if (n < 29) return 8;
  return 9;
}

function slugify(s) {
  return String(s || 'monster').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'monster';
}

/**
 * Remove e decodifica as tags de formatação e macros do 5e.tools:
 * {@atk mw}, {@hit 5}, {@h}, {@damage 1d8+3}, {@dc 14}, {@condition prone}, etc.
 */
export function clean5eToolsTags(str) {
  if (!str) return '';
  return String(str)
    .replace(/\{@atk\s+([a-z,]+)\}/gi, (_m, g) => {
      const parts = g.toLowerCase().split(',');
      if (parts.includes('mw') && parts.includes('rw')) return 'Melee or Ranged Weapon Attack:';
      if (parts.includes('mw')) return 'Melee Weapon Attack:';
      if (parts.includes('rw')) return 'Ranged Weapon Attack:';
      if (parts.includes('ms')) return 'Melee Spell Attack:';
      if (parts.includes('rs')) return 'Ranged Spell Attack:';
      return 'Attack:';
    })
    .replace(/\{@hit\s+([+-]?\d+)\}/gi, (_m, g) => `${Number(g) >= 0 ? '+' : ''}${g}`)
    .replace(/\{@h\}/gi, 'Hit: ')
    .replace(/\{@damage\s+([^}]+)\}/gi, '$1')
    .replace(/\{@dice\s+([^}]+)\}/gi, '$1')
    .replace(/\{@dc\s+(\d+)\}/gi, 'DC $1')
    .replace(/\{@recharge\s*(\d*)\}/gi, (_m, g) => `(Recharge ${g ? g + '-6' : '6'})`)
    .replace(/\{@condition\s+([^|}]+)[^}]*\}/gi, '$1')
    .replace(/\{@spell\s+([^|}]+)[^}]*\}/gi, '$1')
    .replace(/\{@item\s+([^|}]+)[^}]*\}/gi, '$1')
    .replace(/\{@creature\s+([^|}]+)[^}]*\}/gi, '$1')
    .replace(/\{@skill\s+([^|}]+)[^}]*\}/gi, '$1')
    .replace(/\{@sense\s+([^|}]+)[^}]*\}/gi, '$1')
    .replace(/\{@action\s+([^|}]+)[^}]*\}/gi, '$1')
    .replace(/\{@status\s+([^|}]+)[^}]*\}/gi, '$1')
    .replace(/\{@quickref\s+([^|}]+)[^}]*\}/gi, '$1')
    .replace(/\{@note\s+([^|}]+)[^}]*\}/gi, '$1')
    .replace(/\{@b\s+([^}]+)\}/gi, '$1')
    .replace(/\{@i\s+([^}]+)\}/gi, '$1')
    .replace(/\{@[a-z]+\s+([^|}]+)[^}]*\}/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Processa blocos estruturados de texto do 5e.tools (strings, listas, tabelas, sub-entradas).
 */
export function parse5eToolsEntries(entries) {
  if (!entries) return '';
  if (typeof entries === 'string') return clean5eToolsTags(entries);
  if (Array.isArray(entries)) {
    return entries.map(e => {
      if (typeof e === 'string') return clean5eToolsTags(e);
      if (e?.type === 'entries' && e.entries) {
        const header = e.name ? `${clean5eToolsTags(e.name)}: ` : '';
        return `${header}${parse5eToolsEntries(e.entries)}`;
      }
      if (e?.type === 'list' && e.items) {
        return e.items.map(it => `• ${parse5eToolsEntries(it)}`).join('\n');
      }
      if (e?.type === 'table') {
        const headers = (e.colLabels || []).map(clean5eToolsTags).join(' | ');
        const rows = (e.rows || []).map(r => (Array.isArray(r) ? r.map(clean5eToolsTags).join(' | ') : String(r))).join('\n');
        return [headers, rows].filter(Boolean).join('\n');
      }
      return '';
    }).filter(Boolean).join('\n\n');
  }
  return '';
}

function normSize(s) {
  const map = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan' };
  const raw = String(s || '').toUpperCase();
  return map[raw] || (['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'].includes(s) ? s : 'Medium');
}

function normType(t) {
  if (typeof t === 'string') return t.toLowerCase();
  if (t?.type) return String(t.type).toLowerCase();
  return 'monstrosity';
}

function normAlignment(al) {
  if (!al || !al.length) return 'unaligned';
  const map = {
    U: 'unaligned',
    A: 'any alignment',
    L: 'lawful',
    C: 'chaotic',
    G: 'good',
    E: 'evil',
    N: 'neutral'
  };
  if (Array.isArray(al)) {
    return al.map(a => map[a] || a).join(' ');
  }
  return String(al).toLowerCase();
}

function legendaryCost(name) {
  const m = String(name || '').match(/Costs?\s*(\d+)\s*Actions?/i);
  return m ? parseInt(m[1], 10) : 1;
}

function stripCost(name) {
  return String(name || '').replace(/\s*\(Costs?\s*\d+\s*Actions?\)/i, '').trim();
}

/**
 * Converte uma criatura bruta do formato 5e.tools para o modelo de monstro de combate do Heroes Forge.
 */
export function convert5eToolsMonster(raw, { lang = 'pt' } = {}) {
  const crStr = typeof raw.cr === 'object' ? (raw.cr.cr || '0') : String(raw.cr ?? '0');
  const crNum = crToNumber(crStr) ?? 0;
  const xp = CR_XP_MAP[crStr] ?? (raw.cr?.xp ?? 0);
  const proficiencyBonus = raw.proficiencyBonus != null ? raw.proficiencyBonus : pbForCr(crNum);

  // 1. Tipo, Subtipo (Tags), Tamanho e Alinhamento
  let type = 'monstrosity';
  let tags = [];
  if (typeof raw.type === 'string') {
    type = raw.type.toLowerCase();
  } else if (raw.type && typeof raw.type === 'object') {
    type = String(raw.type.type || 'monstrosity').toLowerCase();
    if (Array.isArray(raw.type.tags)) tags = raw.type.tags.map(clean5eToolsTags);
  }
  const size = normSize(raw.size?.[0] || raw.size);
  const alignment = normAlignment(raw.alignment);
  const tagsStr = tags.length ? ` (${tags.join(', ')})` : '';
  const typeLine = `${size} ${type}${tagsStr}, ${alignment}`;

  // 2. Classe de Armadura detalhada
  let ac = 10;
  let acText = '10';
  if (Array.isArray(raw.ac) && raw.ac.length > 0) {
    const first = raw.ac[0];
    ac = typeof first === 'number' ? first : (first?.ac || 10);
    const parts = raw.ac.map(item => {
      if (typeof item === 'number') return String(item);
      if (!item) return '';
      let s = String(item.ac || ac);
      if (item.from?.length) s += ` (${item.from.map(clean5eToolsTags).join(', ')})`;
      if (item.condition) s += ` ${clean5eToolsTags(item.condition)}`;
      return s;
    }).filter(Boolean);
    if (parts.length) acText = parts.join(', ');
  } else if (typeof raw.ac === 'number') {
    ac = raw.ac;
    acText = String(raw.ac);
  }

  // 3. Pontos de Vida e Fórmula de Dados
  let hp = 10;
  let hitDice = '';
  let hpText = '10';
  if (raw.hp && typeof raw.hp === 'object') {
    hp = raw.hp.average || (typeof raw.hp === 'number' ? raw.hp : 10);
    hitDice = raw.hp.formula ? raw.hp.formula.replace(/\s+/g, ' ') : '';
    hpText = raw.hp.special ? clean5eToolsTags(raw.hp.special) : (hitDice ? `${hp} (${hitDice})` : String(hp));
  } else if (typeof raw.hp === 'number') {
    hp = raw.hp;
    hpText = String(raw.hp);
  }

  // 4. Deslocamento e Modos de Movimento
  const speedObj = typeof raw.speed === 'number' ? { walk: raw.speed } : (raw.speed || { walk: 30 });
  const speed = {
    walk: typeof speedObj === 'number' ? speedObj : (speedObj.walk || 30),
    fly: speedObj.fly?.number || (typeof speedObj.fly === 'number' ? speedObj.fly : undefined),
    swim: speedObj.swim?.number || (typeof speedObj.swim === 'number' ? speedObj.swim : undefined),
    climb: speedObj.climb?.number || (typeof speedObj.climb === 'number' ? speedObj.climb : undefined),
    burrow: speedObj.burrow?.number || (typeof speedObj.burrow === 'number' ? speedObj.burrow : undefined),
    hover: !!(speedObj.canHover || speedObj.hover),
  };
  for (const k of Object.keys(speed)) {
    if (speed[k] === undefined) delete speed[k];
  }

  const speedParts = [];
  if (speedObj.walk != null) speedParts.push(`${speedObj.walk} ft.`);
  for (const [k, v] of Object.entries(speedObj)) {
    if (k === 'walk' || k === 'canHover') continue;
    if (typeof v === 'number') speedParts.push(`${k} ${v} ft.`);
    else if (typeof v === 'object' && v != null) {
      const numVal = v.number ?? 0;
      const cond = v.condition ? ` ${clean5eToolsTags(v.condition)}` : '';
      speedParts.push(`${k} ${numVal} ft.${cond}`);
    }
  }
  if (speedObj.canHover && !speedParts.some(p => p.includes('hover'))) {
    speedParts.push('(hover)');
  }
  const speedText = speedParts.join(', ') || '30 ft.';

  // 5. Atributos
  const abilities = {
    str: Math.max(1, Math.min(30, num(raw.str, 10))),
    dex: Math.max(1, Math.min(30, num(raw.dex, 10))),
    con: Math.max(1, Math.min(30, num(raw.con, 10))),
    int: Math.max(1, Math.min(30, num(raw.int, 10))),
    wis: Math.max(1, Math.min(30, num(raw.wis, 10))),
    cha: Math.max(1, Math.min(30, num(raw.cha, 10))),
  };

  // 6. Salvaguardas e Perícias
  const saves = {};
  if (raw.save) {
    for (const [k, v] of Object.entries(raw.save)) {
      saves[k.toLowerCase()] = parseInt(v, 10) || 0;
    }
  }
  const saveText = Object.entries(saves)
    .map(([k, v]) => `${k.toUpperCase()} ${v >= 0 ? '+' : ''}${v}`)
    .join(', ');

  const skills = {};
  if (raw.skill) {
    for (const [k, v] of Object.entries(raw.skill)) {
      skills[k.toLowerCase()] = parseInt(v, 10) || 0;
    }
  }
  const skillText = Object.entries(skills)
    .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v >= 0 ? '+' : ''}${v}`)
    .join(', ');

  // 7. Defesas (Resistências, Imunidades, Vulnerabilidades)
  const damageResistances = (raw.resist || []).map(r => {
    if (typeof r === 'string') return clean5eToolsTags(r);
    if (r?.resist) {
      const types = Array.isArray(r.resist) ? r.resist.join(', ') : r.resist;
      return clean5eToolsTags(r.note ? `${types} ${r.note}` : types);
    }
    return '';
  }).filter(Boolean);
  const resistText = damageResistances.join(', ');

  const damageImmunities = (raw.immune || []).map(i => {
    if (typeof i === 'string') return clean5eToolsTags(i);
    if (i?.immune) {
      const types = Array.isArray(i.immune) ? i.immune.join(', ') : i.immune;
      return clean5eToolsTags(i.note ? `${types} ${i.note}` : types);
    }
    return '';
  }).filter(Boolean);
  const immuneText = damageImmunities.join(', ');

  const damageVulnerabilities = (raw.vulnerable || []).map(v => (typeof v === 'string' ? clean5eToolsTags(v) : '')).filter(Boolean);
  const vulnText = damageVulnerabilities.join(', ');

  const conditionImmunities = (raw.conditionImmune || []).map(c => {
    if (typeof c === 'string') return clean5eToolsTags(c).toLowerCase();
    if (c?.name) return clean5eToolsTags(c.name).toLowerCase();
    if (c?.conditionImmune) return Array.isArray(c.conditionImmune) ? c.conditionImmune.join(', ').toLowerCase() : String(c.conditionImmune).toLowerCase();
    return '';
  }).filter(Boolean);
  const conditionImmuneText = conditionImmunities.join(', ');

  // 8. Sentidos e Idiomas
  const sensesList = [];
  if (raw.senses) sensesList.push(...(Array.isArray(raw.senses) ? raw.senses.map(clean5eToolsTags) : [clean5eToolsTags(raw.senses)]));
  if (raw.passive) sensesList.push(`passive Perception ${raw.passive}`);
  const senses = sensesList.join(', ') || '—';

  const languages = Array.isArray(raw.languages)
    ? raw.languages.map(clean5eToolsTags).join(', ')
    : (raw.languages ? clean5eToolsTags(raw.languages) : '—');

  // 9. Traços e Conjuração de Magias
  const traits = (raw.trait || []).map(t => {
    const text = parse5eToolsEntries(t.entries);
    return { name: both(clean5eToolsTags(t.name)), desc: both(text) };
  });

  if (Array.isArray(raw.spellcasting)) {
    for (const sc of raw.spellcasting) {
      const header = (sc.headerEntries || []).map(clean5eToolsTags).join(' ');
      const spellLines = [];
      if (sc.spells) {
        for (const [lvl, data] of Object.entries(sc.spells)) {
          const lvlLabel = lvl === '0' ? (lang === 'en' ? 'Cantrips (at will)' : 'Truques (à vontade)') : (lang === 'en' ? `Level ${lvl} (${data.slots || 1} slots)` : `Nível ${lvl} (${data.slots || 1} espaços)`);
          const list = (data.spells || []).map(clean5eToolsTags).join(', ');
          if (list) spellLines.push(`${lvlLabel}: ${list}`);
        }
      }
      if (sc.will) {
        const list = sc.will.map(clean5eToolsTags).join(', ');
        if (list) spellLines.push(`${lang === 'en' ? 'At will' : 'À vontade'}: ${list}`);
      }
      if (sc.daily) {
        for (const [freq, list] of Object.entries(sc.daily)) {
          const l = (Array.isArray(list) ? list : []).map(clean5eToolsTags).join(', ');
          if (l) spellLines.push(`${freq}/day: ${l}`);
        }
      }
      const fullText = [header, ...spellLines].filter(Boolean).join('\n');
      traits.push({
        name: both(clean5eToolsTags(sc.name || 'Spellcasting')),
        desc: both(fullText)
      });
    }
  }

  // 10. Ações com parsing refinado e fallback
  const mapActions = (list = []) => list.map(a => {
    const rawName = clean5eToolsTags(a.name);
    const cleanName = stripCost(rawName);
    const text = parse5eToolsEntries(a.entries);
    const mech = parseActionText(text, cleanName);
    const action = {
      name: both(cleanName),
      type: mech.type || 'special',
      desc: both(text),
    };
    if (mech.atk != null) action.atk = mech.atk;
    if (mech.range) action.range = mech.range;
    if (mech.damage) action.damage = mech.damage;
    if (mech.damageType) action.damageType = mech.damageType;
    if (mech.extraDamage) action.extraDamage = mech.extraDamage;
    if (mech.save) action.save = mech.save;
    if (mech.recharge != null) action.recharge = mech.recharge;
    if (mech.uses != null) { action.uses = mech.uses; action.usesPer = mech.usesPer || 'day'; }

    // Fallback de dano se parseActionText não pegou (ex: "Hit: 1d8 + proficiency bonus bludgeoning damage" ou sem média)
    if (!action.damage) {
      const paren = text.match(/(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*[^)]+)?)\)\s*([A-Za-z]+)\s+damage/i);
      if (paren) {
        action.damage = paren[2].replace(/\s+/g, '');
        action.damageType = paren[3].toLowerCase();
      } else {
        const diceMatch = text.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*(?:\+\s*(?:proficiency bonus|[a-z]+ bonus|\w+)\s*)?([A-Za-z]+)\s+damage/i);
        if (diceMatch) {
          action.damage = diceMatch[1].replace(/\s+/g, '');
          action.damageType = diceMatch[2].toLowerCase();
        }
      }
    }

    return action;
  });

  const actions = mapActions(raw.action);
  const bonusActions = mapActions(raw.bonus);
  const reactions = mapActions(raw.reaction);

  // 11. Ações Lendárias
  let legendary = null;
  if (Array.isArray(raw.legendary) && raw.legendary.length > 0) {
    const legActions = raw.legendary.map(la => {
      const rawName = clean5eToolsTags(la.name);
      const cleanName = stripCost(rawName);
      const cost = legendaryCost(rawName);
      const text = parse5eToolsEntries(la.entries);
      const mech = parseActionText(text, cleanName);
      const action = {
        name: both(cleanName),
        type: mech.type || 'special',
        cost,
        desc: both(text),
      };
      if (mech.atk != null) action.atk = mech.atk;
      if (mech.range) action.range = mech.range;
      if (mech.damage) action.damage = mech.damage;
      if (mech.damageType) action.damageType = mech.damageType;
      if (mech.extraDamage) action.extraDamage = mech.extraDamage;
      if (mech.save) action.save = mech.save;
      return action;
    });
    legendary = {
      uses: 3,
      actions: legActions
    };
  }

  // 12. Resistência Lendária
  const legResTrait = traits.find(tr => /legendary resistance/i.test(tr.name.en));
  let legendaryResistance = null;
  if (legResTrait) {
    const m = legResTrait.name.en.match(/\((\d+)\/day\)/i) || legResTrait.desc.en.match(/(\d+)\/day/i);
    legendaryResistance = { uses: m ? parseInt(m[1], 10) : 3 };
  }

  const srcSlug = slugify(raw.source || 'custom');
  const nameSlug = slugify(raw.name || 'monster');
  const id = `custom-5e-${nameSlug}-${srcSlug}-${Date.now().toString(36)}`;

  return {
    id,
    custom: true,
    source: `5e.tools (${raw.source || 'Homebrew'})`,
    name: both(raw.name),
    cr: crLabel(crNum),
    crNum,
    xp,
    proficiencyBonus,
    size,
    type,
    tags,
    alignment,
    typeLine,
    ac,
    acText,
    hp,
    hitDice,
    hpText,
    speed,
    speedText,
    abilities,
    ...(Object.keys(saves).length ? { saves, saveText } : {}),
    ...(Object.keys(skills).length ? { skills, skillText } : {}),
    ...(damageResistances.length ? { damageResistances, resistText } : {}),
    ...(damageImmunities.length ? { damageImmunities, immuneText } : {}),
    ...(damageVulnerabilities.length ? { damageVulnerabilities, vulnText } : {}),
    ...(conditionImmunities.length ? { conditionImmunities, conditionImmuneText } : {}),
    senses,
    languages,
    traits,
    actions,
    ...(bonusActions.length ? { bonusActions } : {}),
    ...(reactions.length ? { reactions } : {}),
    ...(legendary ? { legendary } : {}),
    ...(legendaryResistance ? { legendaryResistance } : {}),
    raw5eTools: raw,
    importedAt: new Date().toISOString(),
  };
}
 /**
 * Remove e decodifica marcações wikitext do D&D Wiki.
 */
export function cleanWikitext(text) {
  if (!text) return '';
  return String(text)
    .replace(/\{\{5a\|([a-z]+)\}\}/gi, (_m, a) => a.toUpperCase())
    .replace(/\{\{5c\|([^}]+)\}\}/gi, (_m, c) => c)
    .replace(/\{\{5g\|([^}]+)\}\}/gi, (_m, g) => g)
    .replace(/\{\{5ect\|[^|]+\|([^}]+)\}\}/gi, (_m, t) => t)
    .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1')
    .replace(/'''''/g, '')
    .replace(/'''/g, '')
    .replace(/''/g, '')
    .replace(/&mdash;/g, '—')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Converte blocos de traços ou ações do D&D Wiki wikitext em objetos de ação/traço.
 */
export function parseWikitextEntries(rawSection) {
  if (!rawSection) return [];
  const entries = [];
  const parts = rawSection.split(/(?:^|\n)(?='''''|''')/g);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^'{2,5}([^'.\n]+?)\.?[']{2,5}([\s\S]*)$/);
    if (m) {
      const name = m[1].trim();
      const desc = cleanWikitext(m[2]);
      const action = {
        name: { pt: name, en: name },
        desc: { pt: desc, en: desc },
      };
      const mech = parseActionText(desc, name);
      if (mech.type) action.type = mech.type;
      if (mech.atk != null) action.atk = mech.atk;
      if (mech.range) action.range = mech.range;
      if (mech.damage) action.damage = mech.damage;
      if (mech.damageType) action.damageType = mech.damageType;
      if (mech.extraDamage) action.extraDamage = mech.extraDamage;
      if (mech.save) action.save = mech.save;
      if (mech.recharge != null) action.recharge = mech.recharge;
      if (mech.uses != null) { action.uses = mech.uses; action.usesPer = mech.usesPer || 'day'; }
      entries.push(action);
    } else {
      const cleaned = cleanWikitext(trimmed);
      if (cleaned) {
        entries.push({ name: { pt: 'Trait', en: 'Trait' }, desc: { pt: cleaned, en: cleaned } });
      }
    }
  }
  return entries;
}

/**
 * Converte uma criatura bruta do D&D Wiki (5e Creature) para o formato Heroes Forge.
 */
export function parseDandWikiMonster(rawText, { lang = 'pt', defaultName = 'Homebrew Creature' } = {}) {
  const titleMatch = rawText.match(/==([^=]+)==/);
  const name = titleMatch ? titleMatch[1].trim() : defaultName;

  const getField = (field) => {
    const r = new RegExp('^\\|\\s*' + field + '\\s*=\\s*([^\\n|]+)', 'mi');
    const m = rawText.match(r);
    return m ? cleanWikitext(m[1].trim()) : '';
  };

  const getSection = (sec) => {
    const r = new RegExp('^\\|\\s*' + sec + '\\s*=\\s*([\\s\\S]*?)(?=\\n\\|\\w+\\s*=|\\n\\}\\})', 'mi');
    const m = rawText.match(r);
    return m ? m[1].trim() : '';
  };

  const size = getField('size') || 'Medium';
  const type = getField('type') || 'monstrosity';
  const alignment = getField('alignment') || 'unaligned';
  const typeLine = `${size} ${type}, ${alignment}`;

  const ac = parseInt(getField('ac'), 10) || 10;
  const armor = getField('armor');
  const acText = armor ? `${ac} (${armor})` : String(ac);

  const hd = parseInt(getField('hd'), 10) || 1;
  const hpOverride = parseInt(getField('hp'), 10);
  const con = parseInt(getField('con'), 10) || 10;
  const conMod = Math.floor((con - 10) / 2);

  const hdDie = { tiny: 4, small: 6, medium: 8, large: 10, huge: 12, gargantuan: 20 }[size.toLowerCase()] || 8;
  const calculatedHp = Math.floor(hd * ((hdDie + 1) / 2)) + (hd * conMod);
  const hp = hpOverride || Math.max(1, calculatedHp);
  const hpText = `${hp} (${hd}d${hdDie}${conMod !== 0 ? (conMod > 0 ? `+${hd * conMod}` : `${hd * conMod}`) : ''})`;

  const speedText = getField('speed') || '30 ft.';
  const str = parseInt(getField('str'), 10) || 10;
  const dex = parseInt(getField('dex'), 10) || 10;
  const int = parseInt(getField('int'), 10) || 10;
  const wis = parseInt(getField('wis'), 10) || 10;
  const cha = parseInt(getField('cha'), 10) || 10;
  const abilities = { str, dex, con, int, wis, cha };

  const cr = getField('cr') || '0';
  const crNum = crToNumber(cr) ?? 0;
  const pbVal = parseInt(getField('proficiency'), 10);
  const pb = pbVal || pbForCr(crNum);

  // Saves
  const saves = {};
  const saveParts = [];
  for (const s of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    const val = getField(`${s}save`);
    if (/yes|true|1|\+\d+/i.test(val)) {
      const explicitMod = parseInt(val, 10);
      const mod = Number.isFinite(explicitMod) ? explicitMod : (Math.floor((abilities[s] - 10) / 2) + pb);
      saves[s] = mod;
      saveParts.push(`${s.toUpperCase()} ${mod >= 0 ? '+' : ''}${mod}`);
    }
  }
  const saveText = saveParts.join(', ');

  // Skills
  const skills = {};
  const skillParts = [];
  const commonSkills = ['acrobatics', 'animal handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight of hand', 'stealth', 'survival'];
  for (const sk of commonSkills) {
    const key = sk.replace(/\s+/g, '');
    const val = getField(key) || getField(sk);
    if (/yes|true|1|\+\d+/i.test(val)) {
      const explicitMod = parseInt(val, 10);
      const mod = Number.isFinite(explicitMod) ? explicitMod : pb;
      skills[key] = mod;
      skillParts.push(`${sk.charAt(0).toUpperCase() + sk.slice(1)} ${mod >= 0 ? '+' : ''}${mod}`);
    }
  }
  const skillText = skillParts.join(', ');

  const resistText = getField('dr') || getField('res');
  const immuneText = getField('di');
  const vulnText = getField('dv') || getField('vuln');
  const conditionImmuneText = getField('ci');
  const senses = [getField('senses'), getField('darkvision') ? `darkvision ${getField('darkvision')} ft.` : '', getField('blindsight') ? `blindsight ${getField('blindsight')} ft.` : '', getField('passive') ? `passive Perception ${getField('passive')}` : ''].filter(Boolean).join(', ') || '—';
  const languages = getField('languages') || '—';

  const traits = parseWikitextEntries(getSection('features') || getSection('traits'));
  const actions = parseWikitextEntries(getSection('actions'));
  const bonusActions = parseWikitextEntries(getSection('bonusactions') || getSection('bonus_actions'));
  const reactions = parseWikitextEntries(getSection('reactions'));
  const legendaryRaw = getSection('legendary') || getSection('legendary_actions');
  const legendaryActions = parseWikitextEntries(legendaryRaw);

  const imgMatch = rawText.match(/\{\{5e Image\|[^|]*\|([^|}]+)/i);
  let portraitUrl = imgMatch ? imgMatch[1].trim() : null;
  if (portraitUrl && (!portraitUrl.startsWith('http') || portraitUrl.startsWith('<!--'))) {
    portraitUrl = null;
  }

  return {
    id: `dandwiki-${slugify(name)}-${Date.now().toString(36)}`,
    custom: true,
    source: 'D&D Wiki (5e Homebrew)',
    name: { pt: name, en: name },
    cr,
    crNum,
    xp: CR_XP_MAP[cr] ?? null,
    proficiencyBonus: pb,
    size,
    type,
    alignment,
    typeLine,
    ac,
    acText,
    hp,
    hpText,
    speed: { walk: 30 },
    speedText,
    abilities,
    ...(Object.keys(saves).length ? { saves, saveText } : {}),
    ...(Object.keys(skills).length ? { skills, skillText } : {}),
    ...(resistText ? { damageResistances: [resistText], resistText } : {}),
    ...(immuneText ? { damageImmunities: [immuneText], immuneText } : {}),
    ...(vulnText ? { damageVulnerabilities: [vulnText], vulnText } : {}),
    ...(conditionImmuneText ? { conditionImmunities: [conditionImmuneText], conditionImmuneText } : {}),
    senses,
    languages,
    traits,
    actions,
    ...(bonusActions.length ? { bonusActions } : {}),
    ...(reactions.length ? { reactions } : {}),
    ...(legendaryActions.length ? { legendary: { uses: 3, actions: legendaryActions } } : {}),
    ...(portraitUrl ? { avatar: portraitUrl } : {}),
    importedAt: new Date().toISOString(),
  };
}

/**
 * Converte criatura HTML do Wikidot para o modelo do Heroes Forge.
 */
export function parseWikidotCreature(html, { lang = 'pt', defaultName = 'Wikidot Creature' } = {}) {
  const titleMatch = html.match(/<div id="page-title">([\s\S]*?)<\/div>/i);
  const name = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : defaultName;

  const contentMatch = html.match(/<div id="page-content">([\s\S]*?)<\/div>/i);
  const content = contentMatch ? contentMatch[1] : html;

  const typeMatch = content.match(/<br\s*\/?>\s*([A-Za-z]+)\s+([A-Za-z]+),\s*([^<]+)<br\s*\/?>/i);
  const size = typeMatch ? typeMatch[1] : 'Medium';
  const type = typeMatch ? typeMatch[2] : 'elemental';
  const alignment = typeMatch ? typeMatch[3].trim() : 'unaligned';
  const typeLine = `${size} ${type}, ${alignment}`;

  const acMatch = content.match(/<strong>Armor Class<\/strong>\s*(\d+)(?:\s*\(([^)]+)\))?/i);
  const ac = acMatch ? parseInt(acMatch[1], 10) : 10;
  const acText = acMatch ? (acMatch[2] ? `${ac} (${acMatch[2]})` : String(ac)) : '10';

  const hpMatch = content.match(/<strong>Hit Points<\/strong>\s*(\d+)(?:\s*\(([^)]+)\))?/i);
  const hp = hpMatch ? parseInt(hpMatch[1], 10) : 10;
  const hitDice = hpMatch && hpMatch[2] ? hpMatch[2].trim() : '';
  const hpText = hpMatch ? (hitDice ? `${hp} (${hitDice})` : String(hp)) : '10';

  const speedMatch = content.match(/<strong>Speed<\/strong>\s*([^<]+)<br\s*\/?>/i);
  const speedText = speedMatch ? speedMatch[1].trim() : '30 ft.';

  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  const avatar = imgMatch ? imgMatch[1] : null;

  const abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const strMatch = content.match(/<td>Strength<\/td>\s*<td>(\d+)<\/td>/i);
  if (strMatch) abilities.str = parseInt(strMatch[1], 10);
  const dexMatch = content.match(/<td>Dexterity<\/td>\s*<td>(\d+)<\/td>/i);
  if (dexMatch) abilities.dex = parseInt(dexMatch[1], 10);
  const conMatch = content.match(/<td>Constitution<\/td>\s*<td>(\d+)<\/td>/i);
  if (conMatch) abilities.con = parseInt(conMatch[1], 10);
  const intMatch = content.match(/<td>Intelligence<\/td>\s*<td>(\d+)<\/td>/i);
  if (intMatch) abilities.int = parseInt(intMatch[1], 10);
  const wisMatch = content.match(/<td>Wisdom<\/td>\s*<td>(\d+)<\/td>/i);
  if (wisMatch) abilities.wis = parseInt(wisMatch[1], 10);
  const chaMatch = content.match(/<td>Charisma<\/td>\s*<td>(\d+)<\/td>/i);
  if (chaMatch) abilities.cha = parseInt(chaMatch[1], 10);

  const crMatch = content.match(/<strong>Challenge<\/strong>\s*([0-9/]+)/i);
  const cr = crMatch ? crMatch[1].trim() : '1/2';
  const crNum = crToNumber(cr) ?? 0.5;

  return {
    id: `wikidot-${slugify(name)}-${Date.now().toString(36)}`,
    custom: true,
    source: 'Wikidot (5e)',
    name: { pt: name, en: name },
    cr,
    crNum,
    xp: CR_XP_MAP[cr] ?? null,
    proficiencyBonus: pbForCr(crNum),
    size,
    type,
    alignment,
    typeLine,
    ac,
    acText,
    hp,
    hpText,
    speed: { walk: 30 },
    speedText,
    abilities,
    senses: 'darkvision 60 ft., passive Perception 10',
    languages: 'Aquan, Auran',
    traits: [],
    actions: [],
    ...(avatar ? { avatar } : {}),
    importedAt: new Date().toISOString(),
  };
}

/**
 * Detecta se a string colada/digitada representa uma URL de recurso de monstro.
 */
export function isMonsterUrl(input) {
  if (!input || typeof input !== 'string') return false;
  const str = input.trim();
  if (!/^https?:\/\//i.test(str) && !/^5e\.tools/i.test(str) && !/^open5e\.com/i.test(str) && !/^roll20\.net/i.test(str) && !/^dndbeyond\.com/i.test(str)) {
    return false;
  }
  return (
    /5e\.tools.*bestiary/i.test(str) ||
    /github\.io.*bestiary/i.test(str) ||
    /dandwiki\.com\/wiki\//i.test(str) ||
    /wikidot\.com\/creatures:/i.test(str) ||
    /dndbeyond\.com\/monsters\//i.test(str) ||
    /roll20\.net\/compendium\/dnd5e\//i.test(str) ||
    /aidedd\.org\/dnd\/monstres/i.test(str) ||
    /5e\.d20srd\.org\/srd\/monsters\//i.test(str) ||
    /open5e\.com\/monsters\//i.test(str) ||
    /api\.open5e\.com\/v[12]\/(monsters|creatures)\//i.test(str) ||
    /\.json(\?.*)?$/i.test(str) ||
    /raw\.githubusercontent\.com/i.test(str) ||
    /gist\.githubusercontent\.com/i.test(str)
  );
}

/**
 * Analisa a URL e extrai metadados antes de buscar.
 */
export function parseMonsterUrl(input) {
  const str = input.trim();

  // 1. DandWiki
  if (/dandwiki\.com\/wiki\/([^/?#]+)/i.test(str)) {
    const m = str.match(/dandwiki\.com\/wiki\/([^/?#]+)/i);
    const rawSlug = m ? decodeURIComponent(m[1]) : '';
    const cleanName = rawSlug.replace(/_\(5e_Creature\)/i, '').replace(/_/g, ' ');
    return {
      kind: 'dandwiki',
      slug: rawSlug,
      name: cleanName,
      rawUrl: `https://www.dandwiki.com/wiki/${rawSlug}?action=raw`,
      label: `${cleanName} (D&D Wiki)`,
    };
  }

  // 2. Wikidot
  if (/wikidot\.com\/creatures:([^/?#]+)/i.test(str)) {
    const m = str.match(/wikidot\.com\/creatures:([^/?#]+)/i);
    const slug = m ? m[1] : '';
    const name = slug.replace(/-/g, ' ');
    return {
      kind: 'wikidot',
      slug,
      name,
      url: str,
      label: `${name} (Wikidot)`,
    };
  }

  // 3. 5e.tools formato caminho (/bestiary/<name>-<source>.html)
  if (/5e\.tools\/bestiary\/([^/?#]+)\.html/i.test(str)) {
    const m = str.match(/5e\.tools\/bestiary\/([^/?#]+)\.html/i);
    const file = m ? m[1] : '';
    const lastDash = file.lastIndexOf('-');
    let name = file.replace(/-/g, ' ');
    let source = 'mm';
    if (lastDash > 0) {
      name = file.slice(0, lastDash).replace(/-/g, ' ');
      source = file.slice(lastDash + 1);
    }
    return {
      kind: '5etools',
      name,
      source,
      label: `${name} (${source.toUpperCase()})`,
    };
  }

  // 4. 5e.tools formato hash (#<name>_<source>)
  if (/5e\.tools.*bestiary\.html#/i.test(str) || /github\.io.*bestiary\.html#/i.test(str)) {
    const hash = decodeURIComponent(str.split('#')[1] || '').trim();
    const lastUnderscore = hash.lastIndexOf('_');
    let name = hash;
    let source = 'mm';
    if (lastUnderscore > 0) {
      name = hash.slice(0, lastUnderscore).replace(/_/g, ' ');
      source = hash.slice(lastUnderscore + 1);
    } else {
      name = hash.replace(/_/g, ' ');
    }
    return {
      kind: '5etools',
      name,
      source,
      label: `${name} (${source.toUpperCase()})`,
    };
  }

  // 5. D&D Beyond
  if (/dndbeyond\.com\/monsters\/([^/?#]+)/i.test(str)) {
    const m = str.match(/dndbeyond\.com\/monsters\/([^/?#]+)/i);
    const part = m ? m[1] : '';
    const name = part.replace(/^\d+-/, '').replace(/-/g, ' ');
    return {
      kind: 'compendium',
      name,
      source: 'D&D Beyond',
      label: `${name} (D&D Beyond)`,
    };
  }

  // 6. Roll20
  if (/roll20\.net\/compendium\/dnd5e\/([^/?#]+)/i.test(str)) {
    const m = str.match(/roll20\.net\/compendium\/dnd5e\/([^/?#]+)/i);
    const raw = m ? decodeURIComponent(m[1]) : '';
    return {
      kind: 'compendium',
      name: raw,
      source: 'Roll20',
      label: `${raw} (Roll20)`,
    };
  }

  // 7. AideDD
  if (/aidedd\.org\/dnd\/monstres\.php\?vo=([^&#]+)/i.test(str)) {
    const m = str.match(/aidedd\.org\/dnd\/monstres\.php\?vo=([^&#]+)/i);
    const name = m ? decodeURIComponent(m[1]).replace(/-/g, ' ') : '';
    return {
      kind: 'compendium',
      name,
      source: 'AideDD',
      label: `${name} (AideDD)`,
    };
  }

  // 8. 5e.d20srd
  if (/5e\.d20srd\.org\/srd\/monsters\/([^/?#]+)\.htm/i.test(str)) {
    const m = str.match(/5e\.d20srd\.org\/srd\/monsters\/([^/?#]+)\.htm/i);
    const name = m ? decodeURIComponent(m[1]).replace(/-/g, ' ') : '';
    return {
      kind: 'compendium',
      name,
      source: '5e SRD',
      label: `${name} (5e SRD)`,
    };
  }

  // 9. Open5e
  if (/open5e\.com\/monsters\/([^/?#]+)/i.test(str) || /api\.open5e\.com\/v[12]\/(monsters|creatures)\/([^/?#]+)/i.test(str)) {
    const m = str.match(/(?:monsters|creatures)\/([^/?#]+)/i);
    const slug = m ? m[1] : '';
    return {
      kind: 'open5e',
      slug,
      label: `Open5e: ${slug}`,
    };
  }

  // 10. Arquivos JSON diretos
  if (/\.json/i.test(str) || /raw\.githubusercontent\.com/i.test(str) || /gist\.githubusercontent\.com/i.test(str)) {
    const filename = str.split('/').pop()?.split('?')[0] || 'monster.json';
    return {
      kind: 'json',
      url: str,
      label: filename,
    };
  }

  return {
    kind: 'unknown',
    url: str,
    label: str,
  };
}

async function getHomebrewIndex() {
  if (cachedHbIndex) return cachedHbIndex;
  const res = await fetch(`${GITHUB_HB_RAW}_generated/index-sources.json`);
  if (!res.ok) throw new Error(`Falha ao carregar índice de homebrew 5e.tools (HTTP ${res.status})`);
  cachedHbIndex = await res.json();
  return cachedHbIndex;
}

async function getOfficialIndex() {
  if (cachedOfficialIndex) return cachedOfficialIndex;
  const res = await fetch(`${GITHUB_OFFICIAL_RAW}index.json`);
  if (!res.ok) throw new Error(`Falha ao carregar índice oficial 5e.tools (HTTP ${res.status})`);
  cachedOfficialIndex = await res.json();
  return cachedOfficialIndex;
}

function findKeyCaseInsensitive(obj, key) {
  if (!obj || !key) return null;
  const target = key.toLowerCase();
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase() === target) return v;
  }
  return null;
}

/**
 * Busca e reconstrói um monstro a partir de uma URL direta de qualquer plataforma suportada.
 */
export async function fetchMonsterFromUrl(urlStr, { lang = 'pt' } = {}) {
  const meta = parseMonsterUrl(urlStr);

  // 1. DandWiki Homebrew
  if (meta.kind === 'dandwiki') {
    const rawUrl = meta.rawUrl || `https://www.dandwiki.com/wiki/${meta.slug}?action=raw`;
    const res = await fetch(rawUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`Falha ao acessar artigo no D&D Wiki (HTTP ${res.status})`);
    const rawText = await res.text();
    const monster = parseDandWikiMonster(rawText, { lang, defaultName: meta.name });
    return { monster, warnings: [] };
  }

  // 2. Wikidot
  if (meta.kind === 'wikidot') {
    // Tenta correspondência prévia no bestiário SRD local
    const targetName = meta.name.toLowerCase().trim();
    const foundSrd = BESTIARY.find(b => {
      const en = (b.name.en || b.name).toLowerCase();
      const pt = (b.name.pt || b.name).toLowerCase();
      return en === targetName || pt === targetName;
    });
    if (foundSrd && !meta.slug.includes('variant')) {
      return { monster: { ...foundSrd, source: 'Wikidot (SRD)' }, warnings: [] };
    }

    try {
      const res = await fetch(meta.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const html = await res.text();
        const monster = parseWikidotCreature(html, { lang, defaultName: meta.name });
        return { monster, warnings: [] };
      }
    } catch {
      // continua para fallback se falhar por rede/CORS
    }

    if (foundSrd) {
      return { monster: { ...foundSrd, source: 'Wikidot (SRD)' }, warnings: [] };
    }
    throw new Error(`Não foi possível acessar a criatura no Wikidot (${meta.name}).`);
  }

  // 3. Compêndios SRD (D&D Beyond, Roll20, AideDD, 5e.d20srd)
  if (meta.kind === 'compendium') {
    const targetName = meta.name.toLowerCase().trim();
    const cleanTarget = targetName.replace(/[^a-z0-9]/g, '');

    // A. Busca no Bestiário SRD Local (100% offline e imediato)
    const foundSrd = BESTIARY.find(b => {
      const en = (b.name.en || b.name || '').toLowerCase().trim();
      const pt = (b.name.pt || b.name || '').toLowerCase().trim();
      if (en === targetName || pt === targetName) return true;
      if (en.replace(/[^a-z0-9]/g, '') === cleanTarget) return true;
      if (cleanTarget === 'mephit' && en.includes('mephit')) return true;
      return false;
    });

    if (foundSrd) {
      return { monster: { ...foundSrd, source: meta.source }, warnings: [] };
    }

    // B. Busca no 5e.tools oficial (bestiary-mm.json ou bestiary-xmm.json)
    try {
      const mmUrl = `${GITHUB_OFFICIAL_RAW}bestiary-mm.json`;
      const mmRes = await fetch(mmUrl);
      if (mmRes.ok) {
        const data = await mmRes.json();
        const list = Array.isArray(data.monster) ? data.monster : [];
        const found = list.find(m => {
          const mName = m.name.toLowerCase().trim();
          return mName === targetName || mName.replace(/[^a-z0-9]/g, '') === cleanTarget;
        });
        if (found) {
          const monster = convert5eToolsMonster(found, { lang });
          return { monster: { ...monster, source: meta.source }, warnings: [] };
        }
      }
    } catch {
      // continua
    }

    // C. Busca na API do Open5e
    try {
      const o5Url = `https://api.open5e.com/v1/monsters/?search=${encodeURIComponent(targetName)}&format=json`;
      const o5Res = await fetch(o5Url);
      if (o5Res.ok) {
        const o5Data = await o5Res.json();
        if (Array.isArray(o5Data.results) && o5Data.results.length > 0) {
          const resV1 = convertOpen5eV1(o5Data.results[0], { lang });
          if (!resV1.errors?.length && resV1.monster) {
            return { monster: { ...resV1.monster, source: meta.source }, warnings: [] };
          }
        }
      }
    } catch {
      // continua
    }

    throw new Error(`Monstro "${meta.name}" não localizado nos compêndios nem no catálogo SRD.`);
  }

  // 4. 5e.tools (oficiais e coleções homebrew)
  if (meta.kind === '5etools') {
    const { name, source } = meta;
    const targetName = name.toLowerCase().trim();
    const sourceLower = source.toLowerCase();

    // Caso especial livro XMM (2024 Monster Manual)
    if (sourceLower === 'xmm') {
      const xmmUrl = `${GITHUB_OFFICIAL_RAW}bestiary-xmm.json`;
      const xmmRes = await fetch(xmmUrl);
      if (xmmRes.ok) {
        const data = await xmmRes.json();
        const list = Array.isArray(data.monster) ? data.monster : [];
        const found = list.find(m => m.name.toLowerCase().trim() === targetName) ||
                      list.find(m => slugify(m.name) === slugify(targetName));
        if (found) {
          const monster = convert5eToolsMonster(found, { lang });
          return { monster, warnings: [] };
        }
      }
    }

    // 1. Tentar encontrar no índice oficial
    let officialPath = null;
    try {
      const offIndex = await getOfficialIndex();
      officialPath = findKeyCaseInsensitive(offIndex, source);
    } catch {
      // continua para homebrew se falhar
    }

    if (officialPath) {
      const fileUrl = `${GITHUB_OFFICIAL_RAW}${encodeURI(officialPath)}`;
      const fileRes = await fetch(fileUrl);
      if (!fileRes.ok) throw new Error(`Arquivo oficial ${officialPath} não acessível (HTTP ${fileRes.status})`);
      const data = await fileRes.json();
      const list = Array.isArray(data.monster) ? data.monster : [];
      const found = list.find(m => m.name.toLowerCase().trim() === targetName) ||
                    list.find(m => slugify(m.name) === slugify(targetName));
      if (!found) {
        throw new Error(`Monstro "${name}" não encontrado no livro oficial "${source}".`);
      }
      const monster = convert5eToolsMonster(found, { lang });
      return { monster, warnings: [] };
    }

    // 2. Tentar no índice de homebrew
    const hbIndex = await getHomebrewIndex();
    const hbRelPath = findKeyCaseInsensitive(hbIndex, source);

    if (!hbRelPath) {
      throw new Error(`Fonte "${source}" não localizada nem no catálogo oficial nem no homebrew do 5e.tools.`);
    }

    const fileUrl = `${GITHUB_HB_RAW}${encodeURI(hbRelPath)}`;
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) throw new Error(`Coleção homebrew ${hbRelPath} não acessível (HTTP ${fileRes.status})`);
    const data = await fileRes.json();
    const list = Array.isArray(data.monster) ? data.monster : [];
    const found = list.find(m => m.name.toLowerCase().trim() === targetName) ||
                  list.find(m => slugify(m.name) === slugify(targetName));

    if (!found) {
      throw new Error(`Monstro "${name}" não encontrado na coleção "${hbRelPath}".`);
    }

    const monster = convert5eToolsMonster(found, { lang });
    return { monster, warnings: [] };
  }

  // 5. Open5e
  if (meta.kind === 'open5e') {
    const apiUrl = `https://api.open5e.com/v1/monsters/${encodeURIComponent(meta.slug)}/?format=json`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`Criatura "${meta.slug}" não encontrada no Open5e (HTTP ${res.status})`);
    const json = await res.json();
    const resV1 = convertOpen5eV1(json, { lang });
    if (resV1.errors?.length) throw new Error(resV1.errors.join(' '));
    return resV1;
  }

  // 6. JSON direto
  if (meta.kind === 'json') {
    const res = await fetch(meta.url);
    if (!res.ok) throw new Error(`Arquivo JSON não acessível (HTTP ${res.status})`);
    const json = await res.json();

    // Se for formato 5e Monster Maker
    if (json.saveVersion != null) {
      const res5emm = convert5emm(json, { lang });
      if (res5emm.errors?.length) throw new Error(res5emm.errors.join(' '));
      return res5emm;
    }

    // Se for criatura Open5e v1
    if (json.hit_points != null && json.armor_class != null && json.challenge_rating != null) {
      const resV1 = convertOpen5eV1(json, { lang });
      if (resV1.errors?.length) throw new Error(resV1.errors.join(' '));
      return resV1;
    }

    // Se for criatura Open5e v2
    if (json.ability_scores != null && json.hit_points != null) {
      const resV2 = convertOpen5eV2(json, { lang });
      if (resV2.errors?.length) throw new Error(resV2.errors.join(' '));
      return resV2;
    }

    // Se for formato 5e.tools criatura avulsa
    if (json.name && (json.hp || json.ac)) {
      const monster = convert5eToolsMonster(json, { lang });
      return { monster, warnings: [] };
    }

    // Se for coleção 5e.tools com array .monster
    if (Array.isArray(json.monster) && json.monster.length > 0) {
      const monster = convert5eToolsMonster(json.monster[0], { lang });
      return { monster, warnings: [`Importado o primeiro monstro da coleção (${json.monster.length} disponíveis).`] };
    }

    throw new Error('Formato JSON não reconhecido (esperado .5emm.json, Open5e ou 5e.tools).');
  }

  throw new Error('URL de recurso não reconhecida.');
}

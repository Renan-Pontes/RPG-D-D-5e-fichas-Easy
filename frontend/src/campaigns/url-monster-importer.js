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

const GITHUB_HB_RAW = 'https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/';
const GITHUB_OFFICIAL_RAW = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/bestiary/';

let cachedHbIndex = null;
let cachedOfficialIndex = null;

const both = (s) => ({ pt: s, en: s });
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

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
    .replace(/\{@hit\s+([+-]?\d+)\}(?:\s+to\s+hit,?)?/gi, (_m, g) => `${Number(g) >= 0 ? '+' : ''}${g} to hit,`)
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

  let ac = 10;
  if (Array.isArray(raw.ac)) {
    const first = raw.ac[0];
    ac = typeof first === 'number' ? first : (first?.ac || 10);
  } else if (typeof raw.ac === 'number') {
    ac = raw.ac;
  }

  const hp = raw.hp?.average || (typeof raw.hp === 'number' ? raw.hp : 10);
  const hitDice = raw.hp?.formula || '';

  const speed = {
    walk: typeof raw.speed === 'number' ? raw.speed : (raw.speed?.walk || 30),
    fly: raw.speed?.fly?.number || (typeof raw.speed?.fly === 'number' ? raw.speed.fly : undefined),
    swim: raw.speed?.swim?.number || (typeof raw.speed?.swim === 'number' ? raw.speed.swim : undefined),
    climb: raw.speed?.climb?.number || (typeof raw.speed?.climb === 'number' ? raw.speed.climb : undefined),
    burrow: raw.speed?.burrow?.number || (typeof raw.speed?.burrow === 'number' ? raw.speed.burrow : undefined),
    hover: !!(raw.speed?.canHover || raw.speed?.hover),
  };
  // remove undefined
  for (const k of Object.keys(speed)) {
    if (speed[k] === undefined) delete speed[k];
  }

  const abilities = {
    str: Math.max(1, Math.min(30, num(raw.str, 10))),
    dex: Math.max(1, Math.min(30, num(raw.dex, 10))),
    con: Math.max(1, Math.min(30, num(raw.con, 10))),
    int: Math.max(1, Math.min(30, num(raw.int, 10))),
    wis: Math.max(1, Math.min(30, num(raw.wis, 10))),
    cha: Math.max(1, Math.min(30, num(raw.cha, 10))),
  };

  const saves = {};
  if (raw.save) {
    for (const [k, v] of Object.entries(raw.save)) {
      saves[k.toLowerCase()] = parseInt(v, 10) || 0;
    }
  }

  const skills = {};
  if (raw.skill) {
    for (const [k, v] of Object.entries(raw.skill)) {
      skills[k.toLowerCase()] = parseInt(v, 10) || 0;
    }
  }

  const damageResistances = (raw.resist || []).map(r => {
    if (typeof r === 'string') return clean5eToolsTags(r);
    if (r?.resist) {
      const types = Array.isArray(r.resist) ? r.resist.join(', ') : r.resist;
      return clean5eToolsTags(r.note ? `${types} ${r.note}` : types);
    }
    return '';
  }).filter(Boolean);

  const damageImmunities = (raw.immune || []).map(i => {
    if (typeof i === 'string') return clean5eToolsTags(i);
    if (i?.immune) {
      const types = Array.isArray(i.immune) ? i.immune.join(', ') : i.immune;
      return clean5eToolsTags(i.note ? `${types} ${i.note}` : types);
    }
    return '';
  }).filter(Boolean);

  const damageVulnerabilities = (raw.vulnerable || []).map(v => (typeof v === 'string' ? clean5eToolsTags(v) : '')).filter(Boolean);
  const conditionImmunities = (raw.conditionImmune || []).map(c => {
    if (typeof c === 'string') return clean5eToolsTags(c).toLowerCase();
    if (c?.name) return clean5eToolsTags(c.name).toLowerCase();
    if (c?.conditionImmune) return Array.isArray(c.conditionImmune) ? c.conditionImmune.join(', ').toLowerCase() : String(c.conditionImmune).toLowerCase();
    return '';
  }).filter(Boolean);

  const sensesList = [];
  if (raw.senses) sensesList.push(...(Array.isArray(raw.senses) ? raw.senses.map(clean5eToolsTags) : [clean5eToolsTags(raw.senses)]));
  if (raw.passive) sensesList.push(`passive Perception ${raw.passive}`);
  const senses = sensesList.join(', ') || '—';

  const languages = Array.isArray(raw.languages)
    ? raw.languages.map(clean5eToolsTags).join(', ')
    : (raw.languages ? clean5eToolsTags(raw.languages) : '—');

  const traits = (raw.trait || []).map(t => {
    const text = parse5eToolsEntries(t.entries);
    return { name: both(clean5eToolsTags(t.name)), desc: both(text) };
  });

  // Spellcasting integration
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
    return action;
  });

  const actions = mapActions(raw.action);
  const bonusActions = mapActions(raw.bonus);
  const reactions = mapActions(raw.reaction);

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
    size: normSize(raw.size?.[0]),
    type: normType(raw.type),
    alignment: normAlignment(raw.alignment),
    ac,
    hp,
    hitDice,
    speed,
    abilities,
    ...(Object.keys(saves).length ? { saves } : {}),
    ...(Object.keys(skills).length ? { skills } : {}),
    ...(damageResistances.length ? { damageResistances } : {}),
    ...(damageImmunities.length ? { damageImmunities } : {}),
    ...(damageVulnerabilities.length ? { damageVulnerabilities } : {}),
    ...(conditionImmunities.length ? { conditionImmunities } : {}),
    senses,
    languages,
    traits,
    actions,
    ...(bonusActions.length ? { bonusActions } : {}),
    ...(reactions.length ? { reactions } : {}),
    ...(legendary ? { legendary } : {}),
    importedAt: new Date().toISOString(),
  };
}

/**
 * Detecta se a string colada/digitada representa uma URL de recurso de monstro.
 */
export function isMonsterUrl(input) {
  if (!input || typeof input !== 'string') return false;
  const str = input.trim();
  if (!/^https?:\/\//i.test(str) && !/^5e\.tools/i.test(str) && !/^open5e\.com/i.test(str)) {
    return false;
  }
  return (
    /5e\.tools.*bestiary\.html#/i.test(str) ||
    /github\.io.*bestiary\.html#/i.test(str) ||
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

  if (/open5e\.com\/monsters\/([^/?#]+)/i.test(str) || /api\.open5e\.com\/v1\/monsters\/([^/?#]+)/i.test(str)) {
    const m = str.match(/(?:monsters\/)([^/?#]+)/i);
    const slug = m ? m[1] : '';
    return {
      kind: 'open5e',
      slug,
      label: `Open5e: ${slug}`,
    };
  }

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
 * Busca e reconstrói um monstro a partir de uma URL direta.
 */
export async function fetchMonsterFromUrl(urlStr, { lang = 'pt' } = {}) {
  const meta = parseMonsterUrl(urlStr);

  if (meta.kind === '5etools') {
    const { name, source } = meta;
    const targetName = name.toLowerCase().trim();

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

  if (meta.kind === 'open5e') {
    const apiUrl = `https://api.open5e.com/v1/monsters/${encodeURIComponent(meta.slug)}/?format=json`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`Criatura "${meta.slug}" não encontrada no Open5e (HTTP ${res.status})`);
    const json = await res.json();
    const resV1 = convertOpen5eV1(json, { lang });
    if (resV1.errors?.length) throw new Error(resV1.errors.join(' '));
    return resV1;
  }

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

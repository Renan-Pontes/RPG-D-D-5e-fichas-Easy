/**
 * Escolhas de espécie (char.speciesChoices) e o que elas concedem.
 * Dados em data/species-2024.js; a tabela de magias é espelhada no backend
 * (catalog.json → backend/api/progression/species.py) por scripts/sync-rules.mjs.
 *
 * Puro e sem Utils (utils.js e engine.js importam este arquivo).
 *
 * char.speciesChoices = {
 *   lineage?, size?, spellAbility?, ancestry?, skill? (id ou [ids]), cantrip?, asi?: { str: 1 }, bonus?
 * }
 * O talento da espécie (Humano 2024, humano variante e linhagem personalizada 2014)
 * fica em char.feats com origin: 'species'.
 */
import { SPECIES_2024_REVISED, AASIMAR_2024, SPECIES_2014_CHOICES } from '../../data/species-2024.js';
import { findFeat } from '../../data/feats.js';
import { featPicksIssues } from './feat-rules.js';

export const SKILL_IDS = [
  'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation',
  'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion',
  'sleightOfHand', 'stealth', 'survival',
];
const SPELL_ABILITIES = ['int', 'wis', 'cha'];
const list = (v) => (Array.isArray(v) ? v : v != null && v !== '' ? [v] : []);

/** Tabela de espécies por versão (2024 revisadas + Aasimar; 2014 e raças antigas). */
export const SPECIES_TABLE = {
  '2024': { ...SPECIES_2024_REVISED, aasimar: AASIMAR_2024 },
  '2014': SPECIES_2014_CHOICES,
};

/** Definição de escolhas/efeitos da espécie da ficha (ou null). */
export function speciesDef(char) {
  const id = char?.race;
  if (!id) return null;
  if (char.rulesVersion === '2024' && SPECIES_TABLE['2024'][id]) return SPECIES_TABLE['2024'][id];
  return SPECIES_TABLE['2014'][id] || null;
}

/** Escolhas ativas (respeitando `when`, ex.: truque do Alto Elfo). */
export function speciesChoiceSpecs(char) {
  const sc = char?.speciesChoices || {};
  return (speciesDef(char)?.choices || []).filter(c => !c.when || Object.entries(c.when).every(([k, v]) => sc[k] === v));
}

export const speciesFeatEntry = (char) => (char?.feats || []).find(f => f?.origin === 'species') || null;

/** Troca o talento da espécie em `feats` (entry null remove). */
export function withSpeciesFeat(feats, entry) {
  const rest = (feats || []).filter(f => f?.origin !== 'species');
  return entry ? [...rest, { ...entry, origin: 'species', level: 1 }] : rest;
}

/** A escolha de bônus de atributo bate com o padrão ([1, 1] ou [2])? */
export function asiMatches(asi, pattern, from) {
  if (!asi || typeof asi !== 'object') return false;
  const entries = Object.entries(asi).filter(([, v]) => v);
  if (entries.some(([k, v]) => !from.includes(k) || !Number.isInteger(v))) return false;
  const a = entries.map(([, v]) => v).sort().join(',');
  return a === [...pattern].sort().join(',');
}

/** Escolhas pendentes/invalidas: [{ key, pt, en }]. Vazio = tudo certo. */
export function speciesChoiceIssues(char) {
  const sc = char?.speciesChoices || {};
  const out = [];
  const miss = (c) => out.push({ key: c.key, pt: `Escolha: ${c.label.pt}`, en: `Choose: ${c.label.en}` });
  for (const c of speciesChoiceSpecs(char)) {
    const v = sc[c.key];
    if (c.key === 'feat') {
      const e = speciesFeatEntry(char);
      const feat = e?.id ? findFeat(e.id) : null;
      if (!e || !(e.name || '').trim() || (feat && featPicksIssues(feat, e.picks, 1).length)) miss(c);
    } else if (c.key === 'asi') {
      if (!asiMatches(v, c.pattern, c.from)) miss(c);
    } else if (c.key === 'cantrip') {
      if (!c.default && !(typeof v === 'string' && v)) miss(c);
    } else if (c.options) {
      if (!c.options.some(o => o.id === v)) miss(c);
    } else if (c.key === 'skill') {
      const arr = list(v);
      const n = c.count || 1;
      if (arr.length !== n || new Set(arr).size !== n || arr.some(s => !SKILL_IDS.includes(s) || (c.from && !c.from.includes(s)))) miss(c);
    } else if (c.from && !c.from.includes(v)) miss(c);
  }
  return out;
}

/**
 * O que a espécie concede no nível atual da ficha:
 * { cantrips, spells, spellsByLevel, skills, resist, darkvision, speed, size, spellAbility, options }.
 * `spells` só traz as magias já liberadas (nível do personagem ≥ nível da linhagem).
 */
export function speciesGrants(char) {
  const out = { cantrips: [], spells: [], spellsByLevel: {}, skills: [], resist: [], darkvision: 0, speed: null, size: null, spellAbility: null, options: {} };
  const def = speciesDef(char);
  if (!def) return out;
  const sc = char.speciesChoices || {};
  const lv = char.level || 1;
  const add = (src) => {
    if (src.darkvision) out.darkvision = Math.max(out.darkvision, src.darkvision);
    if (src.speed) out.speed = src.speed;
    out.resist.push(...(src.resist || []));
    out.skills.push(...(src.skills || []));
    out.cantrips.push(...(src.cantrips || []));
    for (const [l, ids] of Object.entries(src.spells || {})) {
      (out.spellsByLevel[l] ||= []).push(...ids);
      if (lv >= +l) out.spells.push(...ids);
    }
  };
  add(def);
  for (const c of speciesChoiceSpecs(char)) {
    const v = sc[c.key];
    if (c.key === 'skill') out.skills.push(...list(v).filter(s => SKILL_IDS.includes(s) && (!c.from || c.from.includes(s))));
    else if (c.key === 'cantrip') { const id = typeof v === 'string' && v ? v : c.default; if (id) out.cantrips.push(id); }
    else if (c.options) {
      const o = c.options.find(x => x.id === v);
      if (o) { out.options[c.key] = o; add(o); }
    }
  }
  if (speciesChoiceSpecs(char).some(c => c.key === 'size') && ['Medium', 'Small'].includes(sc.size)) out.size = sc.size;
  out.spellAbility = def.fixedSpellAbility || (SPELL_ABILITIES.includes(sc.spellAbility) ? sc.spellAbility : null);
  for (const k of ['cantrips', 'spells', 'skills', 'resist']) out[k] = [...new Set(out[k])];
  return out;
}

/** Bônus de atributo escolhido na espécie (humano variante, linhagem personalizada). */
export function speciesAsi(char) {
  const c = speciesChoiceSpecs(char).find(x => x.key === 'asi');
  const v = char?.speciesChoices?.asi;
  if (!c || !v || typeof v !== 'object') return {};
  return Object.fromEntries(Object.entries(v).filter(([k, n]) => c.from.includes(k) && Number.isInteger(n) && n > 0));
}

/**
 * Tabela compacta de truques/magias para o backend (catalog.json):
 * { '2024': { raceId: { cantrips, spells, options: { key: { optId: { cantrips, spells } } }, cantrip?: { when, default } } }, '2014': … }
 */
export function speciesSpellTable() {
  const spellPart = (src) => ({
    ...(src.cantrips?.length ? { cantrips: src.cantrips } : {}),
    ...(src.spells && Object.keys(src.spells).length ? { spells: src.spells } : {}),
  });
  const conv = (def) => {
    const row = spellPart(def);
    for (const c of def.choices || []) {
      if (c.key === 'cantrip') row.cantrip = { ...(c.when ? { when: c.when } : {}), ...(c.default ? { default: c.default } : {}) };
      else if (c.options) {
        const opts = Object.fromEntries(c.options.map(o => [o.id, spellPart(o)]).filter(([, p]) => Object.keys(p).length));
        if (Object.keys(opts).length) (row.options ||= {})[c.key] = opts;
      }
    }
    return row;
  };
  const table = (t) => Object.fromEntries(Object.entries(t).map(([id, def]) => [id, conv(def)]).filter(([, r]) => Object.keys(r).length));
  return { '2024': table(SPECIES_TABLE['2024']), '2014': table(SPECIES_TABLE['2014']) };
}

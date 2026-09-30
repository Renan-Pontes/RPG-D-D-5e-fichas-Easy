// The frontend's declarative rules and catalog are the editable source.
// Generate the Python deployment snapshot; CI rejects stale snapshots.
import { readFileSync, writeFileSync } from 'node:fs';
import { PROGRESSION_RULES, PROGRESSION_RULES_2024 } from '../frontend/src/progression/rules.js';
import { CLASS_OPTIONS } from '../frontend/data/class-options/index.js';
import { SPECIES_RESOURCES } from '../frontend/src/progression/resources.js';
import { FEATS } from '../frontend/data/feats.js';
import { speciesSpellTable } from '../frontend/src/progression/species.js';

const keys = {
  classId: 'class_id', hitDie: 'hit_die', perLevel: 'per_level',
  subclassPerLevel: 'subclass_per_level', landTypeSpells: 'land_type_spells',
  cantripsKnown: 'cantrips_known', spellsKnown: 'spells_known', spellsPrepared: 'spells_prepared',
  autoCantrips: 'auto_cantrips', autoSpells: 'auto_spells', extraAttacks: 'extra_attacks',
  subclassChoice: 'subclass_choice', fightingStyleChoice: 'fighting_style_choice',
  expertiseChoice: 'expertise_choice', asiOrFeat: 'asi_or_feat',
};
function convert(value) {
  if (Array.isArray(value)) return value.map(convert);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [keys[k] || k, convert(v)]));
  return value;
}
// Opções de classe: só o que a validação usa (sem nomes/descrições), em camelCase.
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] != null).map(k => [k, o[k]]));
function optionsForBackend(data) {
  const pools = Object.fromEntries(Object.entries(data.pools || {}).map(([id, pool]) => [id, {
    ...pick(pool, ['kind', 'grantAs', 'swapOnLevelUp', 'swapLevels', 'freeSwap', 'startingClassOnly']),
    ...(pool.filter?.from ? { filter: { from: pool.filter.from } } : {}),
    ...(pool.options ? { options: pool.options.map(o => ({
      ...pick(o, ['id', 'rules', 'repeatable', 'grants', 'choices', 'resource', 'classes2014']),
      ...(o.detail ? { detail: true } : {}),
      ...(o.prereq ? { prereq: pick(o.prereq, ['level', 'options', 'anyOption', 'subclass']) } : {}),
    })) } : {}),
  }]));
  const resources = (data.resources || []).map(r => pick(r, ['id', 'uses', 'recharge', 'shortRestRegain', 'shortRestFromLevel', 'minLevel', 'subclass', 'rules']));
  return { pools, resources, ...pick(data, ['choices', 'legacyChoices', 'subclassChoices', 'legacySubclassChoices']) };
}
const options = Object.fromEntries(Object.entries(CLASS_OPTIONS).map(([id, data]) => [id, optionsForBackend(data)]));
const output = new URL('../backend/api/progression/catalog.json', import.meta.url);
// Talentos: só o que a validação usa (sem nomes/descrições). Sub-escolhas viram
// lista de ids (escolha única) ou { count, from? }.
const choiceForBackend = (v) => (Array.isArray(v) ? v.map(o => (typeof o === 'string' ? o : o.id))
  : v && typeof v === 'object' ? pick(v, ['count', 'from']) : v);
const feats = FEATS.map(f => ({
  ...pick(f, ['id', 'base', 'rules', 'category', 'repeatable', 'repeatKey', 'asi']),
  ...(f.prereq ? { prereq: pick(f.prereq, ['level', 'abilities', 'anyAbility', 'feats', 'feature']) } : {}),
  ...(f.choices ? { choices: Object.fromEntries(Object.entries(f.choices).map(([k, v]) => [k, choiceForBackend(v)])) } : {}),
}));
// Espécies: só truques/magias (por linhagem e nível), para o apply_autos do servidor.
const species = speciesSpellTable();
const speciesResources = Object.fromEntries(Object.entries(SPECIES_RESOURCES).map(([rv, bySpecies]) => [rv, Object.fromEntries(Object.entries(bySpecies).map(([sp, list]) => [sp, list.map(r => pick(r, ['id', 'uses', 'recharge', 'minLevel']))]))]));
const text = JSON.stringify({ legacy: convert(PROGRESSION_RULES), current: convert(PROGRESSION_RULES_2024), options, feats, species, speciesResources }, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== text) throw new Error('Run node scripts/sync-rules.mjs to update backend rules.');
} else writeFileSync(output, text);

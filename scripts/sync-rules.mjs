// The frontend's declarative rules and catalog are the editable source.
// Generate the Python deployment snapshot; CI rejects stale snapshots.
import { readFileSync, writeFileSync } from 'node:fs';
import { PROGRESSION_RULES, PROGRESSION_RULES_2024 } from '../frontend/src/progression/rules.js';

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
const output = new URL('../backend/api/progression/catalog.json', import.meta.url);
const text = JSON.stringify({ legacy: convert(PROGRESSION_RULES), current: convert(PROGRESSION_RULES_2024) }, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== text) throw new Error('Run node scripts/sync-rules.mjs to update backend rules.');
} else writeFileSync(output, text);

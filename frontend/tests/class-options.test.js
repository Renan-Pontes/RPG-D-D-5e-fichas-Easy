import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLASS_OPTIONS } from '../data/class-options/index.js';
import { SPELLS_2024 } from '../data/rules2024.js';
import SRD from '../data/srd.js';
import { PROGRESSION_RULES_2024 } from '../src/progression/rules.js';

// Valida a forma dos dados de data/class-options/ (formato no README de lá).
const bilingual = (v) => v && typeof v.pt === 'string' && v.pt.trim() && typeof v.en === 'string' && v.en.trim();
const spellIds = new Set([...SPELLS_2024, ...SRD.SPELLS].map(s => s.id));
const KINDS = ['spell', 'skill', 'language'];
const missingSpells = new Map();
const noteSpell = (classId, id) => { if (!spellIds.has(id)) missingSpells.set(id, classId); };

for (const [key, data] of Object.entries(CLASS_OPTIONS)) {
  test(`opções de classe: ${key}`, () => {
    assert.equal(data.classId, key);
    const pools = data.pools || {};
    const allIds = new Set(Object.values(pools).flatMap(p => p.options || []).map(o => o.id));
    for (const [poolId, pool] of Object.entries(pools)) {
      assert.ok(bilingual(pool.name), `${key}.${poolId}: name pt/en`);
      if (pool.kind) {
        assert.ok(KINDS.includes(pool.kind), `${key}.${poolId}: kind inválido`);
        continue;
      }
      assert.ok(Array.isArray(pool.options), `${key}.${poolId}: options`);
      const seen = new Set();
      for (const o of pool.options) {
        const where = `${key}.${poolId}.${o.id}`;
        assert.match(o.id, /^[a-z][A-Za-z0-9]*$/, `${where}: id camelCase`);
        assert.ok(!seen.has(o.id), `${where}: id repetido`);
        seen.add(o.id);
        assert.ok(bilingual(o.name), `${where}: name pt/en`);
        assert.ok(bilingual(o.desc), `${where}: desc pt/en`);
        assert.ok(typeof o.source === 'string' && o.source, `${where}: source`);
        if (o.rules) assert.ok(['2014', '2024'].includes(o.rules), `${where}: rules`);
        for (const ref of [...(o.prereq?.options || []), ...(o.prereq?.anyOption || [])]) {
          assert.ok(allIds.has(ref), `${where}: pré-requisito ${ref} não existe`);
        }
        for (const sub of o.prereq?.subclass || []) {
          assert.ok(PROGRESSION_RULES_2024[key]?.subclassPerLevel?.[sub] || SRD.SUBCLASSES[key]?.some(s => s.id === sub), `${where}: subclasse ${sub}`);
        }
        for (const p of Object.keys(o.choices || {})) assert.ok(pools[p], `${where}: choices → pool ${p}`);
        for (const id of [...(o.grants?.spells || []), ...(o.grants?.cantrips || [])]) noteSpell(key, id);
        for (const k of [...(o.grants?.skills || []), ...(o.grants?.expertise || [])]) assert.ok(SRD.SKILLS.some(s => s.id === k), `${where}: perícia ${k}`);
      }
    }
    const checkTable = (table, label) => {
      for (const [lv, gains] of Object.entries(table || {})) {
        assert.ok(+lv >= 1 && +lv <= 20, `${key}.${label}: nível ${lv}`);
        for (const [p, n] of Object.entries(gains)) {
          assert.ok(pools[p], `${key}.${label}[${lv}]: pool ${p} não existe`);
          assert.ok(Number.isInteger(n) && n > 0, `${key}.${label}[${lv}].${p}: quantidade`);
        }
      }
    };
    checkTable(data.choices, 'choices');
    checkTable(data.legacyChoices, 'legacyChoices');
    for (const [sub, table] of Object.entries(data.subclassChoices || {})) checkTable(table, `subclassChoices.${sub}`);

    const checkFeatures = (list, where) => {
      assert.ok(Array.isArray(list), `${where}: lista`);
      for (const f of list) {
        assert.ok(f.id && bilingual(f.name) && bilingual(f.desc), `${where}.${f.id}: id/name/desc`);
      }
    };
    for (const [lv, list] of Object.entries(data.features || {})) checkFeatures(list, `${key}.features[${lv}]`);
    for (const [id, sub] of Object.entries(data.subclasses || {})) {
      const where = `${key}.subclasses.${id}`;
      assert.ok(bilingual(sub.name) && bilingual(sub.desc) && sub.source, `${where}: name/desc/source`);
      for (const [lv, node] of Object.entries(sub.levels || {})) {
        assert.ok(+lv >= 1 && +lv <= 20, `${where}: nível ${lv}`);
        if (node.features) checkFeatures(node.features, `${where}[${lv}]`);
        for (const s of [...(node.autoSpells || []), ...(node.autoCantrips || [])]) noteSpell(key, s);
      }
    }
  });
}

test('magias citadas pelas classes (aviso)', () => {
  // Magias fora do catálogo são adicionadas pela frente de magias; só avisa.
  if (missingSpells.size) console.warn(`[class-options] magias fora do catálogo: ${[...missingSpells].map(([s, c]) => `${s} (${c})`).join(', ')}`);
});

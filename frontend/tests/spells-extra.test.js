import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EXTRA_SPELLS_2024, SPELL_NAMES_PT } from '../data/spells-extra.js';
import { SPELLS_2024 } from '../data/rules2024.js';
import { CLASS_OPTIONS } from '../data/class-options/index.js';
import SRD from '../data/srd.js';

const SRD_SPELLS = JSON.parse(readFileSync(new URL('../data/srd2024-spells.json', import.meta.url), 'utf8'));
const srdIds = new Set(SRD_SPELLS.map(s => s.id));
const catalogIds = new Set(SPELLS_2024.map(s => s.id));
// Opções marcadas `rules: '2014'` só aparecem em fichas legadas e usam os ids do catálogo 2014 (slowSpell, sendingSpell).
const legacyIds = new Set([...catalogIds, ...SRD.SPELLS.map(s => s.id)]);
const SCHOOLS = new Set(SRD_SPELLS.map(s => s.school));
const CLASSES = ['artificer', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'];
const text = (v) => typeof v === 'string' && v.trim().length > 0;
const bilingual = (v) => v && text(v.pt) && text(v.en);

test('magias extras: ids únicos, camelCase e sem colisão com o SRD', () => {
  const seen = new Set();
  for (const s of EXTRA_SPELLS_2024) {
    assert.match(s.id, /^[a-z][A-Za-z0-9]*$/, `${s.id}: id camelCase`);
    assert.ok(!seen.has(s.id), `${s.id}: id repetido`);
    assert.ok(!srdIds.has(s.id), `${s.id}: já existe em srd2024-spells.json`);
    seen.add(s.id);
  }
});

test('magias extras: campos obrigatórios', () => {
  for (const s of EXTRA_SPELLS_2024) {
    assert.ok(bilingual(s.name), `${s.id}: name pt/en`);
    assert.ok(bilingual(s.desc), `${s.id}: desc pt/en`);
    assert.ok(Number.isInteger(s.level) && s.level >= 0 && s.level <= 9, `${s.id}: nível 0–9`);
    assert.ok(SCHOOLS.has(s.school), `${s.id}: escola ${s.school}`);
    assert.ok(Array.isArray(s.classes) && s.classes.every(c => CLASSES.includes(c)), `${s.id}: classes`);
    for (const k of ['castingTime', 'range', 'components', 'duration', 'source']) assert.ok(text(s[k]), `${s.id}: ${k}`);
    assert.equal(typeof s.ritual, 'boolean', `${s.id}: ritual`);
    assert.equal(typeof s.concentration, 'boolean', `${s.id}: concentration`);
    assert.equal(s.rulesVersion, '2024', `${s.id}: rulesVersion`);
    assert.equal(s.concentration, /concentration/i.test(s.duration), `${s.id}: concentração × duração`);
    if (s.ritual) assert.match(s.castingTime, /Ritual/, `${s.id}: ritual no tempo de conjuração`);
  }
});

test('nomes PT: só ids do SRD, sem nome em inglês', () => {
  for (const [id, name] of Object.entries(SPELL_NAMES_PT)) {
    assert.ok(srdIds.has(id), `${id}: não está no SRD`);
    assert.ok(text(name), `${id}: nome vazio`);
    assert.equal(SPELLS_2024.find(s => s.id === id).name.pt, name, `${id}: nome não aplicado`);
  }
});

// Percorre os dados de classe atrás de grants.spells/cantrips e autoSpells/autoCantrips.
function collectSpellRefs(node, where, out, legacy = false) {
  if (Array.isArray(node)) { node.forEach((v, i) => collectSpellRefs(v, `${where}[${i}]`, out, legacy)); return; }
  if (!node || typeof node !== 'object') return;
  legacy = legacy || node.rules === '2014';
  for (const [k, v] of Object.entries(node)) {
    const isRef = ['autoSpells', 'autoCantrips'].includes(k) || (k === 'grants' && v && typeof v === 'object');
    if (isRef) {
      const lists = k === 'grants' ? [v.spells, v.cantrips] : [v];
      for (const list of lists) for (const s of Array.isArray(list) ? list : []) out.push([typeof s === 'string' ? s : s?.id, `${where}.${k}`, legacy]);
    }
    collectSpellRefs(v, `${where}.${k}`, out, legacy);
  }
}

test('toda magia citada em data/class-options existe no catálogo 2024', () => {
  const refs = [];
  for (const [key, data] of Object.entries(CLASS_OPTIONS)) collectSpellRefs(data, key, refs);
  assert.ok(refs.length > 0, 'nenhuma referência encontrada');
  const missing = refs.filter(([id, , legacy]) => !(legacy ? legacyIds : catalogIds).has(id)).map(([id, where]) => `${id} (${where})`);
  assert.deepEqual(missing, [], `magias fora do catálogo: ${missing.join(', ')}`);
});

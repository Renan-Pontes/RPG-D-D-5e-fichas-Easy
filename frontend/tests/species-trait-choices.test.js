import test from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import { speciesChoiceSpecs } from '../src/progression/species.js';
import { assignSpeciesChoices } from '../src/sheet/species-trait-choices.js';

const traitOf = (rv, race, key) => {
  const r = Utils.races({ rulesVersion: rv }).find(x => x.id === race);
  const specs = speciesChoiceSpecs({ rulesVersion: rv, race, level: 5 });
  const i = assignSpeciesChoices(r.traits, specs)[specs.findIndex(c => c.key === key)];
  return i < 0 ? null : (r.traits[i].name.en || r.traits[i].name);
};

test('each species choice sits on the trait that asks for it', () => {
  assert.equal(traitOf('2024', 'changeling', 'skill'), 'Changeling Instincts');
  assert.equal(traitOf('2024', 'elf', 'lineage'), 'Elven Lineage');
  assert.equal(traitOf('2024', 'elf', 'skill'), 'Keen Senses');
  assert.equal(traitOf('2024', 'tiefling', 'lineage'), 'Fiendish Legacy');
  assert.equal(traitOf('2024', 'tiefling', 'spellAbility'), 'Fiendish Legacy');
  assert.equal(traitOf('2014', 'centaur', 'skill'), 'Survival Instinct');
  assert.equal(traitOf('2014', 'dwarf-hill', 'tool'), 'Tool Proficiency');
  assert.equal(traitOf('2024', 'dwarf-hill', 'tool'), 'Tool Proficiency');
  assert.equal(traitOf('2014', 'hexblood', 'spellAbility'), 'Hex Magic');
  assert.equal(traitOf('2014', 'hexblood', 'skill'), 'Ancestral Legacy');
  assert.equal(traitOf('2014', 'deep-gnome', 'spellAbility'), 'Gift of the Svirfneblin');
  assert.equal(traitOf('2014', 'reborn', 'skill'), 'Ancestral Legacy');
  assert.equal(traitOf('2014', 'orc', 'skill'), 'Primal Intuition');
  assert.equal(traitOf('2014', 'satyr', 'tool'), 'Reveler');
  assert.equal(traitOf('2014', 'vedalken', 'skill'), 'Tireless Precision');
  assert.equal(traitOf('2014', 'vedalken', 'tool'), 'Tireless Precision');
  assert.equal(traitOf('2014', 'autognome', 'tool'), 'Specialized Design');
  assert.equal(traitOf('2014', 'eladrin', 'season'), 'Fey Step');
  assert.equal(traitOf('2014', 'simic-hybrid', 'enhancement1'), 'Animal Enhancement');
  assert.equal(traitOf('2014', 'simic-hybrid', 'enhancement5'), 'Animal Enhancement');
  assert.equal(traitOf('2014', 'human-mark-making', 'tool'), "Maker's Gift");
  assert.equal(traitOf('2024', 'human', 'size'), null); // fica no bloco do nível 1
});

test('simic-hybrid gates 5th level enhancement until level 5 unless includeFuture is set', () => {
  const lv1 = speciesChoiceSpecs({ rulesVersion: '2014', race: 'simic-hybrid', level: 1 }).map(s => s.key);
  const lv1Future = speciesChoiceSpecs({ rulesVersion: '2014', race: 'simic-hybrid', level: 1 }, { includeFuture: true }).map(s => s.key);
  const lv5 = speciesChoiceSpecs({ rulesVersion: '2014', race: 'simic-hybrid', level: 5 }).map(s => s.key);
  assert.ok(lv1.includes('enhancement1') && !lv1.includes('enhancement5'));
  assert.ok(lv1Future.includes('enhancement1') && lv1Future.includes('enhancement5'));
  assert.ok(lv5.includes('enhancement1') && lv5.includes('enhancement5'));
});

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
  assert.equal(traitOf('2014', 'centaur', 'skill'), 'Survival Instinct');
  assert.equal(traitOf('2014', 'dwarf-hill', 'tool'), 'Tool Proficiency');
  assert.equal(traitOf('2024', 'human', 'size'), null); // fica no bloco do nível 1
});

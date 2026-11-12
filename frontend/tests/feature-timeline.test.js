import test from 'node:test';
import assert from 'node:assert/strict';
import { charLevelOf, buildTimeline, byLevel, ASI_ID } from '../src/sheet/feature-timeline.js';

const seq = ['warlock', 'sorcerer', 'sorcerer', 'warlock', 'warlock'];   // personagem nível 5

test('nível de classe → nível do personagem pela ordem da multiclasse', () => {
  assert.equal(charLevelOf(seq, 'warlock', 1), 1);
  assert.equal(charLevelOf(seq, 'sorcerer', 2), 3);
  assert.equal(charLevelOf(seq, 'warlock', 3), 5);
  assert.equal(charLevelOf(seq, 'sorcerer', 3), null);
});

test('linha do tempo: espécie no próprio nível, talento no nível escolhido, ASI trocado', () => {
  const tl = buildTimeline({
    level: 5, seq,
    classItems: [
      { id: 'pact', classId: 'warlock', level: 1, name: { pt: 'Pacto', en: 'Pact' } },
      { id: 'font', classId: 'sorcerer', level: 2, name: { pt: 'Fonte', en: 'Font' } },
      { id: ASI_ID, classId: 'warlock', level: 4, name: { pt: 'ASI', en: 'ASI' } },
    ],
    speciesTraits: [{ name: 'Visão no Escuro' }, { name: { pt: 'Legado (3)', en: 'Legacy (3)' }, level: 3 }, { name: 'Legado (5)', level: 5 }, { name: 'Futuro', level: 9 }],
    feats: [{ name: 'Alerta', level: 4 }, { name: 'Iniciado em Magia', origin: 'background' }],
    background: { name: 'Erudito', desc: '' },
    levelChoices: { 4: { type: 'feat' } },
  });
  const lv = byLevel(tl).map(g => [g.level, g.entries.map(e => e.kind)]);
  assert.deepEqual(lv, [
    [1, ['species', 'background', 'class', 'feat']],
    [3, ['species', 'class']],
    [4, ['feat']],
    [5, ['species']],
    [9, ['species']],
  ]);
  assert.equal(tl.find(e => e.level === 9).later, true);
});

test('ASI: escolhido em atributos mostra os pontos; sem escolha fica pendente', () => {
  const items = [{ id: ASI_ID, classId: 'fighter', level: 4, name: { pt: 'ASI', en: 'ASI' } }];
  const s4 = Array(4).fill('fighter');
  const done = buildTimeline({ level: 4, seq: s4, classItems: items, levelChoices: { 4: { type: 'asi', asi: { str: 2 } } }, asiText: a => `+${a.str} FOR` });
  assert.equal(done[0].item.desc.pt, '+2 FOR');
  assert.equal(done[0].done, true);
  const pend = buildTimeline({ level: 4, seq: s4, classItems: items });
  assert.equal(pend[0].pending, true);
});

import { tierOf, byTier } from '../src/sheet/feature-timeline.js';
test('tiers de jogo e agrupamento', () => {
  assert.deepEqual([1, 4, 5, 10, 11, 16, 17, 20].map(l => tierOf(l).tier), [1, 1, 2, 2, 3, 3, 4, 4]);
  assert.equal(tierOf(12).en, 'Masters of the Realm');
  const t = byTier([{ level: 1 }, { level: 3 }, { level: 6 }, { level: 17 }]);
  assert.deepEqual(t.map(x => [x.tier, x.levels.map(l => l.level)]), [[1, [1, 3]], [2, [6]], [4, [17]]]);
});

import { classesAt } from '../src/sheet/feature-timeline.js';
test('classes em cada nível com a que subiu', () => {
  const seq = ['warlock', 'warlock', 'sorcerer', 'warlock'];
  assert.deepEqual(classesAt(seq, 3), [{ id: 'warlock', level: 2, up: false }, { id: 'sorcerer', level: 1, up: true }]);
  assert.deepEqual(classesAt(seq, 4), [{ id: 'warlock', level: 3, up: true }, { id: 'sorcerer', level: 1, up: false }]);
  assert.deepEqual(classesAt(seq, 6), []);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import {
  computeProgression, applyLevelUpChoices, levelChoiceKind, validateLevelChoice, revertLastLevel, applyLevelChoice,
} from '../src/progression/engine.js';
import { withClassLevel, classSequence, classAt, canMulticlassInto } from '../src/progression/multiclass.js';

const base = (className, level, extra = {}) => ({
  rulesVersion: '2014', className, subclass: '', level, race: 'human', background: 'sage', maxHp: 30, currentHp: 30,
  abilities: { str: 13, dex: 14, con: 14, int: 13, wis: 15, cha: 10 }, raceBonus: {}, spells: [], skillProfs: [], ...extra,
});
// Sobe `n` níveis na classe `id` (só a sequência, sem PV/escolhas).
const up = (c, id, n = 1) => { for (let i = 0; i < n; i++) c = withClassLevel(c, id); return c; };

test('ficha de uma classe não ganha sequência nem lista de multiclasse', () => {
  const c = up(base('druid', 3), 'druid');
  assert.equal(c.level, 4);
  assert.equal(c.multiclass, undefined);
  assert.equal(c.classSequence, undefined);
  assert.deepEqual(Utils.classEntries(c).map(e => [e.id, e.level]), [['druid', 4]]);
});

test('entrar numa segunda classe: níveis por classe, rótulo e proficiência pelo total', () => {
  const c = up(base('druid', 4), 'fighter');
  assert.deepEqual(classSequence(c), ['druid', 'druid', 'druid', 'druid', 'fighter']);
  assert.deepEqual(Utils.classEntries(c).map(e => [e.id, e.level]), [['druid', 4], ['fighter', 1]]);
  assert.equal(Utils.classLevel(c, 'fighter'), 1);
  assert.equal(Utils.profBonus(c), 3);
  assert.equal(Utils.classLabel(c, 'pt', (_, id) => id), 'druid 4 / fighter 1');
  assert.equal(Utils.hitDiceLabel(c), '1d10 + 4d8');
});

test('espaços de magia: uma conjuradora usa a própria tabela; duas somam o nível de conjurador', () => {
  assert.deepEqual(Utils.spellSlots(up(base('druid', 3), 'fighter')), [4, 2]);
  assert.deepEqual(Utils.spellSlots(up(base('druid', 3), 'wizard', 2)), [4, 3, 2]);        // 3 + 2 = 5
  assert.deepEqual(Utils.spellSlots(up(base('druid', 3), 'paladin', 2)), [4, 3]);          // 3 + 1 = 4
  assert.deepEqual(Utils.spellSlots(up(base('druid', 3), 'paladin', 3)), [4, 3]);          // 3 + 1 (arredonda p/ baixo)
  assert.deepEqual(Utils.spellSlots(up(base('druid', 3), 'warlock', 2)), [6, 2]);          // Pacto somado
});

test('ASI vem do nível da classe, registrado no nível total', () => {
  let c = up(up(base('druid', 4), 'fighter', 3), 'fighter');                               // druida 4 / guerreiro 4
  assert.equal(c.level, 8);
  assert.equal(levelChoiceKind(c, 8), 'asi');                                               // guerreiro 4
  assert.equal(levelChoiceKind(c, 5), null);                                                // guerreiro 1
  assert.equal(levelChoiceKind(c, 4), 'asi');                                               // druida 4
  const prog = computeProgression(c);
  assert.deepEqual(prog.asiLevels, [4, 8]);
  assert.ok(prog.pendingChoices.some(p => p.type === 'asiOrFeat' && p.level === 8 && p.classId === 'fighter'));
  assert.ok(validateLevelChoice(c, 8, { type: 'asi', asi: { str: 2 } }).valid);
  assert.ok(!validateLevelChoice(c, 6, { type: 'asi', asi: { str: 2 } }).valid);
  c = applyLevelChoice(c, 8, { type: 'asi', asi: { str: 2 } });
  assert.ok(!computeProgression(c).pendingChoices.some(p => p.level === 8));
});

test('pré-requisitos: 13 na nova classe e nas atuais', () => {
  const c = base('druid', 3);
  assert.equal(canMulticlassInto(c, 'fighter').ok, true);                                   // FOR 13 ou DES 13
  assert.equal(canMulticlassInto(c, 'sorcerer').ok, false);                                 // CAR 10
  assert.equal(canMulticlassInto(c, 'druid').reason, 'already');
  const weakWis = base('druid', 3, { abilities: { str: 13, dex: 14, con: 14, int: 13, wis: 12, cha: 10 } });
  const r = canMulticlassInto(weakWis, 'fighter');
  assert.equal(r.ok, false);                                                                // o próprio druida exige SAB 13
  assert.deepEqual(r.missing, [{ classId: 'druid', group: ['wis'] }]);
});

test('subir de nível em nova classe e voltar desfaz classe, perícia e magias dela', () => {
  const c = base('druid', 3, { maxHp: 24, currentHp: 24, spells: [{ id: 'produceFlame', prepared: true }] });
  const up1 = applyLevelUpChoices(c, { toLevel: 4, hpGain: 6, classId: 'bard', skillAdded: 'performance', spellsAdded: ['viciousMockery'] });
  assert.deepEqual(Utils.classEntries(up1).map(e => [e.id, e.level]), [['druid', 3], ['bard', 1]]);
  assert.ok(up1.skillProfs.includes('performance'));
  assert.deepEqual(up1.spells.find(s => s.id === 'viciousMockery'), { id: 'viciousMockery', prepared: true, cls: 'bard' });
  assert.equal(up1.levelHistory.at(-1).classId, 'bard');
  assert.equal(classAt(up1, 4).entry.id, 'bard');

  const back = revertLastLevel(up1);
  assert.equal(back.level, 3);
  assert.equal(back.maxHp, 24);
  assert.equal(back.multiclass, undefined);
  assert.equal(back.classSequence, undefined);
  assert.ok(!back.skillProfs.includes('performance'));
  assert.ok(!back.spells.some(s => s.id === 'viciousMockery'));
  assert.ok(back.spells.some(s => s.id === 'produceFlame'));
});

test('PV padrão soma o dado de cada classe; CA sem armadura pega a melhor defesa', () => {
  const c = up(base('fighter', 1), 'barbarian');                                            // 10+2, depois d12 médio 7+2
  assert.equal(Utils.maxHpDefault(c), 12 + 9);
  assert.equal(Utils.computeAc(c), 10 + 2 + 2);                                             // Defesa sem Armadura do bárbaro
});

test('características de cada classe aparecem com a classe e o nível total', () => {
  const c = up(base('druid', 2), 'fighter');
  const f = computeProgression(c).features;
  assert.ok(f.some(x => x.classId === 'fighter' && x.classLevel === 1 && x.level === 3));
  assert.ok(f.some(x => x.classId === 'druid' && x.level <= 2));
});

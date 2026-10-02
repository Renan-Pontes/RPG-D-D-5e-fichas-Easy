import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ABILITIES, STANDARD_ARRAY, STANDARD_ARRAY_BY_CLASS, POINT_BUY_TOTAL, pointBuyCost, nextPointCost, roll4d6,
  abilityMethod, abilityAssign, setMethodPatch, assignPatch, pointBuyPatch, rollPatch, suggestionPatch, abilitiesIssues,
  bonusMode, bonusChoice, bonusPatch, expectedRaceBonus, raceBonusInSync, recommendedBonus, abilityBonusIssues, quickSummary,
} from '../src/creator/ability-helpers.js';

const eights = () => ({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
const mk = (rulesVersion, extra = {}) => ({
  rulesVersion, className: 'wizard', level: 1, race: rulesVersion === '2014' ? 'human' : 'elf', background: 'sage',
  feats: [], abilities: eights(), raceBonus: {}, creation: {}, speciesChoices: {}, ...extra,
});
const apply = (c, p) => ({ ...c, ...p });

test('tabela Standard Array by Class do SRD 5.2.1 usa exatamente o conjunto padrão', () => {
  const sorted = [...STANDARD_ARRAY].sort((a, b) => a - b).join();
  for (const [cls, row] of Object.entries(STANDARD_ARRAY_BY_CLASS)) {
    assert.equal(ABILITIES.map(k => row[k]).sort((a, b) => a - b).join(), sorted, cls);
    assert.equal(pointBuyCost(row), 27, cls);
  }
  assert.deepEqual(STANDARD_ARRAY_BY_CLASS.wizard, { str: 8, dex: 12, con: 13, int: 15, wis: 14, cha: 10 });
  assert.deepEqual(STANDARD_ARRAY_BY_CLASS.fighter, { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 });
});

test('custos da compra de pontos', () => {
  assert.equal(pointBuyCost(eights()), 0);
  assert.equal(nextPointCost(8), 1);
  assert.equal(nextPointCost(13), 2);
  assert.equal(nextPointCost(14), 2);
  assert.equal(nextPointCost(15), null);
});

test('4d6 descarta o menor', () => {
  const seq = [0, 0.99, 0.5, 0.2]; let i = 0; // 1, 6, 4, 2
  const r = roll4d6(() => seq[i++]);
  assert.deepEqual(r.dice, [1, 6, 4, 2]);
  assert.equal(r.total, 12);
});

for (const rules of ['2024', '2014']) {
  test(`${rules}: conjunto padrão é o método padrão e exige os 6 atribuídos`, () => {
    let c = mk(rules);
    assert.equal(abilityMethod(c), 'standard');
    assert.equal(abilitiesIssues(c).length, 1);
    assert.match(abilitiesIssues(c)[0].pt, /Força/);
    c = apply(c, assignPatch(c, 'str', 0));
    assert.equal(c.abilities.str, 15);
    // escolher o mesmo valor em outro atributo troca
    c = apply(c, assignPatch(c, 'dex', 0));
    assert.equal(abilityAssign(c).dex, 0);
    assert.equal(abilityAssign(c).str, undefined);
    assert.equal(c.abilities.str, 8);
    c = apply(c, suggestionPatch(c));
    assert.deepEqual(c.abilities, STANDARD_ARRAY_BY_CLASS.wizard);
    assert.deepEqual(abilitiesIssues(c), []);
  });

  test(`${rules}: compra de pontos não deixa avançar com tudo 8 nem passar de 27`, () => {
    let c = apply(mk(rules), setMethodPatch(mk(rules), 'pointbuy'));
    assert.equal(abilityMethod(c), 'pointbuy');
    assert.match(abilitiesIssues(c)[0].pt, /27 pontos/);
    assert.equal(pointBuyPatch(c, 'str', -1), null);
    for (let n = 0; n < 7; n++) c = apply(c, pointBuyPatch(c, 'str', 1));
    assert.equal(c.abilities.str, 15);
    assert.equal(pointBuyPatch(c, 'str', 1), null);
    c = apply(c, suggestionPatch(c));
    assert.equal(pointBuyCost(c.abilities), POINT_BUY_TOTAL);
    assert.deepEqual(abilitiesIssues(c), []);
    assert.equal(pointBuyPatch(c, 'cha', 1), null); // sem pontos sobrando
    // conjunto padrão vale 27 pontos: trocar para padrão mantém a distribuição
    const s = apply(c, setMethodPatch(c, 'standard'));
    assert.deepEqual(abilitiesIssues(s), []);
    assert.deepEqual(s.abilities, STANDARD_ARRAY_BY_CLASS.wizard);
  });

  test(`${rules}: rolagem exige rolar e atribuir os 6`, () => {
    let c = apply(mk(rules), setMethodPatch(mk(rules), 'roll'));
    assert.match(abilitiesIssues(c)[0].pt, /Rolar/);
    let x = 0;
    c = apply(c, rollPatch(c, () => ((x++ * 0.37) % 1)));
    assert.equal(c.creation.abilityRolls.length, 6);
    assert.match(abilitiesIssues(c)[0].pt, /Falta/);
    c = apply(c, suggestionPatch(c));
    assert.deepEqual(abilitiesIssues(c), []);
    const totals = c.creation.abilityRolls.map(r => r.total).sort((a, b) => b - a);
    assert.equal(c.abilities.int, totals[0]); // maior valor no principal do mago
  });
}

test('2024: bônus do antecedente +2/+1 ou +1/+1/+1 só entre os 3 do antecedente', () => {
  let c = mk('2024', { abilities: { ...STANDARD_ARRAY_BY_CLASS.wizard } });
  const mode = bonusMode(c);
  assert.equal(mode.kind, 'background');
  assert.deepEqual(mode.from, ['con', 'int', 'wis']);
  assert.match(abilityBonusIssues(c)[0].pt, /\+2 e \+1/);
  c = apply(c, bonusPatch(c, { pattern: '2-1', picks: { int: 2 } }));
  assert.match(abilityBonusIssues(c)[0].pt, /\+1/);
  c = apply(c, bonusPatch(c, { pattern: '2-1', picks: { int: 2, str: 1 } })); // FOR não é do Sábio
  assert.deepEqual(bonusChoice(c).picks, { int: 2 });
  c = apply(c, bonusPatch(c, { pattern: '2-1', picks: { int: 2, wis: 1 } }));
  assert.deepEqual(abilityBonusIssues(c), []);
  assert.deepEqual(c.raceBonus, { int: 2, wis: 1 });
  c = apply(c, bonusPatch(c, { pattern: '1-1-1', picks: { con: 1, int: 1, wis: 1 } }));
  assert.deepEqual(abilityBonusIssues(c), []);
  // trocar o antecedente invalida as escolhas antigas
  const other = { ...c, background: 'soldier' };
  assert.deepEqual(bonusChoice(other).picks, {});
  assert.ok(abilityBonusIssues(other).length);
  assert.equal(raceBonusInSync(other), false);
});

test('2024: recomendação põe +2 no principal da classe e respeita o teto 20', () => {
  const c = mk('2024', { abilities: { ...STANDARD_ARRAY_BY_CLASS.wizard } });
  assert.deepEqual(recommendedBonus(c), { pattern: '2-1', picks: { int: 2, wis: 1 } });
  const high = mk('2024', { creation: { abilityMethod: 'roll' }, abilities: { str: 8, dex: 8, con: 10, int: 19, wis: 12, cha: 8 } });
  const r = recommendedBonus(high);
  assert.ok(!r.picks.int || r.picks.int === 1);
  const over = apply(high, bonusPatch(high, { pattern: '2-1', picks: { int: 2, wis: 1 } }));
  assert.ok(abilityBonusIssues(over).some(i => /20/.test(i.pt)));
  assert.equal(bonusMode(mk('2024', { background: '' })).kind, 'needBackground');
  assert.equal(abilityBonusIssues(mk('2024', { background: '' })).length, 1);
});

test('2014: raça com bônus fixo já vem aplicada', () => {
  const c = mk('2014', { race: 'dwarf-hill' });
  assert.equal(bonusMode(c).kind, 'fixed');
  assert.deepEqual(expectedRaceBonus(c), { con: 2, wis: 1 });
  assert.ok(abilityBonusIssues(c).some(i => /atualizar/.test(i.pt))); // raceBonus vazio ainda
  const synced = { ...c, raceBonus: expectedRaceBonus(c) };
  assert.deepEqual(abilityBonusIssues(synced), []);
  const human = mk('2014', { race: 'human' });
  assert.deepEqual(expectedRaceBonus(human), { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 });
});

test('2014: Meio-Elfo precisa de +1 em dois atributos (fora Carisma)', () => {
  let c = mk('2014', { race: 'half-elf' });
  const mode = bonusMode(c);
  assert.equal(mode.kind, 'other');
  assert.equal(mode.count, 2);
  assert.ok(!mode.from.includes('cha'));
  assert.match(abilityBonusIssues(c)[0].pt, /mais 2 atributos/);
  c = apply(c, bonusPatch(c, { picks: { dex: 1, cha: 1 } })); // CAR não vale
  assert.deepEqual(bonusChoice(c).picks, { dex: 1 });
  assert.match(abilityBonusIssues(c)[0].pt, /mais 1 atributo/);
  c = apply(c, bonusPatch(c, { picks: { dex: 1, con: 2 } })); // +2 não vale
  assert.deepEqual(bonusChoice(c).picks, { dex: 1 });
  c = apply(c, bonusPatch(c, { picks: { dex: 1, con: 1, int: 1 } }));
  assert.match(abilityBonusIssues(c)[0].pt, /desmarque 1/);
  c = apply(c, bonusPatch(c, { picks: { dex: 1, con: 1 } }));
  assert.deepEqual(abilityBonusIssues(c), []);
  assert.deepEqual(c.raceBonus, { cha: 2, dex: 1, con: 1 });
});

test('2014: raça flexível soma exatamente +3 (não +12)', () => {
  let c = mk('2014', { race: 'githyanki' });
  assert.equal(bonusMode(c).kind, 'flex');
  c = apply(c, bonusPatch(c, { pattern: '2-1', picks: { str: 2, dex: 2, con: 2 } }));
  assert.ok(abilityBonusIssues(c).length);
  c = apply(c, bonusPatch(c, { pattern: '1-1-1', picks: { str: 1, dex: 1 } }));
  assert.match(abilityBonusIssues(c)[0].pt, /mais 1/);
  c = apply(c, bonusPatch(c, { pattern: '1-1-1', picks: { str: 1, dex: 1, cha: 1 } }));
  assert.deepEqual(abilityBonusIssues(c), []);
  c = apply(c, bonusPatch(c, { pattern: '2-1', picks: { str: 2, dex: 1 } }));
  assert.deepEqual(abilityBonusIssues(c), []);
  assert.deepEqual(c.raceBonus, { str: 2, dex: 1 });
});

test('2014: humano variante usa o bônus escolhido na etapa da espécie', () => {
  const c = mk('2014', { race: 'human-variant', speciesChoices: { asi: { str: 1, con: 1 } } });
  assert.equal(bonusMode(c).kind, 'fixed');
  assert.deepEqual(expectedRaceBonus(c), { str: 1, con: 1 });
});

test('mini-resumo: PV, CA sem armadura e iniciativa', () => {
  let c = mk('2024', { className: 'fighter', abilities: { ...STANDARD_ARRAY_BY_CLASS.fighter }, background: 'soldier' });
  c = apply(c, bonusPatch(c, { pattern: '2-1', picks: { str: 2, con: 1 } }));
  const s = quickSummary(c);
  assert.equal(s.hp, 10 + 2); // d10 + CON 14 (+2)
  assert.equal(s.ac, 12); // 10 + DES 14 (+2)
  assert.equal(s.initiative, 2);
  const alert = quickSummary({ ...c, feats: [{ id: 'alert', origin: 'background' }] });
  assert.equal(alert.initiative, 4);
  const barb = quickSummary(mk('2014', { className: 'barbarian', race: 'dwarf-hill', abilities: { ...STANDARD_ARRAY_BY_CLASS.barbarian } }));
  assert.equal(barb.hp, 12 + 3 + 1); // d12 + CON 14+2=16 (+3) + 1 do Anão da Colina
  assert.equal(barb.ac, 10 + 1 + 3); // Defesa sem Armadura
});

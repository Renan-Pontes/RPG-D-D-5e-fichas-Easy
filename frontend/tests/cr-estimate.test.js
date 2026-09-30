/**
 * Estimador de ND (método do DMG 2014, portado do 5e Monster Maker) e
 * dificuldade de encontro (SRD 5.2.1).
 *
 * Precisão medida no catálogo inteiro (data/bestiary.js, 337 criaturas, set/2026):
 * ~85% dentro de ±1 passo da tabela de ND e ~96% dentro de ±2; viés leve para
 * baixo (−0,4 passo). Limites conhecidos — ficam fora (ou abaixo) do esperado:
 *  - conjuradores cujo dano está só em magias (Mage, Archmage, Priest);
 *  - criaturas cujo perigo é controle/efeito sem dano (Basilisk, Cloaker,
 *    Invisible Stalker, Fire Elemental com dano contínuo);
 *  - dragões 2024 com dano extra condicional / lendárias fortes ficam ~+3;
 *  - Regeneração, voo com ataque à distância e outras "Monster Features" do
 *    DMG não entram (só Resistência à Magia = +2 CA efetiva).
 * O ND oficial do catálogo continua sendo o usado no combate; a estimativa
 * serve para monstros personalizados/importados.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { BESTIARY, monsterForCombat } from '../data/bestiary.js';
import {
  CR_TABLE, CR_TABLE_NOTE, averageDamage, crByRange, crRow, estimateCr, parseMultiattack, xpForCr,
} from '../src/combat/cr-estimate.js';
import { encounterDifficulty, partyBudget, XP_BUDGET_PER_CHARACTER, combatantXp } from '../src/combat/encounter.js';

const step = (crNum) => crRow(crNum).index;
const byId = (id) => BESTIARY.find(m => m.id === id);

test('tabela de ND: 34 linhas, marcada como estimativa DMG 2014, XP do SRD', () => {
  assert.equal(CR_TABLE.length, 34);
  assert.match(CR_TABLE_NOTE.pt, /DMG 2014.*estimativa/);
  assert.equal(xpForCr('1/4'), 50);
  assert.equal(xpForCr(5), 1800);
  assert.equal(xpForCr('17'), 18000);
  assert.equal(xpForCr(30), 155000);
  assert.equal(xpForCr(0), 10); // SRD: "0 or 10"
});

test('busca por faixa segue o 5emm', () => {
  assert.equal(crByRange(7, 'hpMin').cr, '1/8');
  assert.equal(crByRange(100, 'hpMin').cr, '2');
  assert.equal(crByRange(9, 'dprMin').cr, '1');
  assert.equal(crByRange(3, 'attack').cr, '2'); // última linha com +3
  assert.equal(crByRange(0, 'saveDc').cr, '0');
  assert.equal(crByRange(10000, 'hpMin').cr, '30');
});

test('média de dados como o 5emm (arredonda para baixo por termo)', () => {
  assert.equal(averageDamage('1d6+2'), 5);
  assert.equal(averageDamage('2d10 + 8'), 19);
  assert.equal(averageDamage('1d10+1d6+4'), 12);
  assert.equal(averageDamage('17d6'), 59);
  assert.equal(averageDamage([{ damage: '2d4' }]), 5);
  assert.equal(averageDamage(''), 0);
});

test('multiataque lido do texto (2014 e 2024)', () => {
  const m = {
    actions: [
      { name: { en: 'Multiattack' }, type: 'special', desc: { en: 'Two scimitar attacks and one dagger attack.' } },
      { name: { en: 'Scimitar' }, type: 'melee', atk: 5, damage: '1d6+3' },
      { name: { en: 'Dagger' }, type: 'ranged', atk: 5, damage: '1d4+3' },
    ],
  };
  assert.deepEqual(parseMultiattack(m).map(x => [x.action.name.en, x.count]), [['Scimitar', 2], ['Dagger', 1]]);

  const dragon = byId('adult-red-dragon');
  assert.deepEqual(parseMultiattack(dragon).map(x => [x.action.name.en, x.count]), [['Rend', 3]]);

  // "two attacks, using Scimitar and Pistol in any combination" → 2 no total
  const cap = parseMultiattack(byId('bandit-captain'));
  assert.equal(cap.reduce((s, x) => s + x.count, 0), 2);

  // estrutura explícita tem prioridade
  const s = { ...m, multiattack: [[{ name: 'Dagger', count: 3 }]] };
  assert.deepEqual(parseMultiattack(s).map(x => [x.action.name.en, x.count]), [['Dagger', 3]]);
});

test('detalhamento ofensivo/defensivo de um monstro simples', () => {
  const e = estimateCr({
    ac: 15, hp: 52,
    abilities: { str: 15, dex: 16, con: 14, int: 14, wis: 11, cha: 14 },
    actions: [
      { name: { en: 'Multiattack' }, type: 'special', desc: { en: 'Two scimitar attacks.' } },
      { name: { en: 'Scimitar' }, type: 'melee', atk: 5, damage: '1d6+3', damageType: 'slashing' },
    ],
  });
  assert.equal(e.offensive.dpr, 12);          // 2 × 6
  assert.equal(e.offensive.damageCr, '1');    // 9–14
  assert.equal(e.offensive.maxAttack, 5);
  assert.equal(e.offensive.cr, '2');          // +5 vs +3 esperado → +1 passo
  assert.equal(e.defensive.hpCr, '1/2');      // 50–70 PV
  assert.equal(e.defensive.cr, '1');          // CA 15 vs 13 esperado → +1 passo
  assert.equal(e.cr, '1');                    // média (2 + 1) / 2 = 1,5 → 1
});

test('resistência a dano físico dobra PV efetivos em ND baixo; imunidade isolada a 1 tipo não', () => {
  const base = { ac: 13, hp: 45, abilities: {}, actions: [{ name: { en: 'Claw' }, type: 'melee', atk: 4, damage: '2d6+2' }] };
  const res = estimateCr({ ...base, damageResistances: ['nonmagical bludgeoning/piercing/slashing'] });
  assert.equal(res.defensive.ehp, 90);
  const imm = estimateCr({ ...base, damageImmunities: ['fire'] });
  assert.equal(imm.defensive.ehp, 45);
  const vul = estimateCr({ ...base, damageVulnerabilities: ['fire'] });
  assert.equal(vul.defensive.ehp, 23);
});

test('recarga conta uma vez nas 3 rodadas; lendárias somam por rodada', () => {
  const e = estimateCr(byId('adult-red-dragon'));
  assert.ok(e.offensive.rounds[0].actions[0].includes('Fire Breath'));
  assert.ok(!e.offensive.rounds[1].actions[0].includes('Fire Breath'));
  assert.ok(e.offensive.legendaryPerRound > 0);
});

test('snapshot de combate (monsterForCombat) dá o mesmo ND estimado', () => {
  for (const id of ['adult-red-dragon', 'goblin-warrior', 'bandit-captain', 'lich']) {
    const m = byId(id);
    if (!m) continue;
    assert.equal(estimateCr(monsterForCombat(m)).cr, estimateCr(m).cr, id);
  }
});

test('monstros conhecidos do catálogo: ND estimado perto do oficial', () => {
  const known = {
    'goblin-warrior': 1, 'bandit-captain': 1, 'ogre': 1, 'owlbear': 1, 'troll': 2,
    'hill-giant': 1, 'fire-giant': 2, 'adult-red-dragon': 2, 'ancient-red-dragon': 2,
  };
  for (const [id, tol] of Object.entries(known)) {
    const m = byId(id);
    if (!m) continue;
    const d = Math.abs(step(estimateCr(m).crNum) - step(m.crNum));
    assert.ok(d <= tol, `${id}: oficial ${m.cr}, estimado ${estimateCr(m).cr} (±${tol})`);
  }
});

test('precisão no catálogo inteiro: maioria dentro de ±1 e quase tudo em ±2', () => {
  let w1 = 0; let w2 = 0; let n = 0;
  for (const m of BESTIARY) {
    const d = Math.abs(step(estimateCr(m).crNum) - step(m.crNum));
    n++;
    if (d <= 1) w1++;
    if (d <= 2) w2++;
  }
  assert.ok(n > 50);
  assert.ok(w1 / n >= 0.75, `±1: ${(100 * w1 / n).toFixed(0)}%`);
  assert.ok(w2 / n >= 0.9, `±2: ${(100 * w2 / n).toFixed(0)}%`);
});

// ---------------------------------------------------------------- encontro

test('orçamento de XP por personagem (SRD 5.2.1)', () => {
  assert.deepEqual(XP_BUDGET_PER_CHARACTER[1], [50, 75, 100]);
  assert.deepEqual(XP_BUDGET_PER_CHARACTER[20], [6400, 13200, 22000]);
  assert.deepEqual(partyBudget([1, 1, 1, 1]), { low: 200, moderate: 300, high: 400 });
  // Exemplo 2 do SRD: cinco nível 3, moderada = 1.125
  assert.equal(partyBudget([3, 3, 3, 3, 3]).moderate, 1125);
  // Exemplo 3: seis nível 15, alta = 46.800
  assert.equal(partyBudget([15, 15, 15, 15, 15, 15]).high, 46800);
});

test('classificação da dificuldade', () => {
  assert.equal(encounterDifficulty(200, [1, 1, 1, 1]).rating, 'low');       // 1 Bugbear Warrior
  assert.equal(encounterDifficulty(1100, [3, 3, 3, 3, 3]).rating, 'moderate');
  assert.equal(encounterDifficulty(46000, Array(6).fill(15)).rating, 'high');
  assert.equal(encounterDifficulty(50000, Array(6).fill(15)).rating, 'extreme');
  assert.equal(encounterDifficulty(0, [5]).rating, 'none');
  assert.equal(encounterDifficulty(300, []).rating, 'none');
});

test('XP de combatente: usa o ND do catálogo; sem ele, estima pelo snapshot', () => {
  const ogre = byId('ogre');
  const known = combatantXp({ monster_id: 'ogre', stats: {} }, (id) => byId(id));
  assert.equal(known.xp, xpForCr(ogre.crNum));
  assert.equal(known.estimated, false);
  const snap = monsterForCombat(ogre);
  const est = combatantXp({ monster_id: 'custom-x', stats: { ac: snap.ac, max_hp: snap.hp, abilities: snap.abilities, actions: snap.actions } }, () => null);
  assert.equal(est.estimated, true);
  assert.ok(est.xp > 0);
});

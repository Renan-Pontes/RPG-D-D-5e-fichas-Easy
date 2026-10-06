import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monsterTypeLabel, sizeLabel, damageTypeLabel, conditionLabel, abilityLabel, rangeLabel, feetToMeters,
  MONSTER_TYPE_LABEL, SIZES, DAMAGE_TYPES, CONDITIONS, nameOf, attackKindLabel,
} from '../src/combat/monster-i18n.js';
import { MONSTER_TYPES, BESTIARY } from '../data/bestiary.js';
import { actionSummary, logLine } from '../src/campaigns/monster-actions.js';

test('tipos de monstro em pt (ooze, fey, humanoid…)', () => {
  assert.equal(monsterTypeLabel('ooze', 'pt'), 'limo');
  assert.equal(monsterTypeLabel('fey', 'pt'), 'fada');
  assert.equal(monsterTypeLabel('humanoid', 'pt'), 'humanoide');
  assert.equal(monsterTypeLabel('ooze', 'en'), 'ooze');
  assert.equal(monsterTypeLabel('humanoid (goblinoid)', 'pt'), 'humanoide (goblinoid)');
  for (const ty of MONSTER_TYPES) {
    assert.ok(MONSTER_TYPE_LABEL[ty], `tipo sem tradução: ${ty}`);
    assert.notEqual(monsterTypeLabel(ty, 'pt'), '');
  }
  // Todo tipo do bestiário tem rótulo em pt.
  const types = new Set(BESTIARY.map(m => String(m.type).split(/\W/)[0].toLowerCase()));
  for (const ty of types) assert.ok(MONSTER_TYPE_LABEL[ty], `tipo do bestiário sem tradução: ${ty}`);
});

test('tamanhos', () => {
  assert.deepEqual(SIZES.map(s => sizeLabel(s, 'pt')), ['Miúdo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Imenso']);
  assert.equal(sizeLabel('Medium', 'en'), 'Medium');
  const sizes = new Set(BESTIARY.map(m => m.size));
  for (const s of sizes) assert.notEqual(sizeLabel(s, 'pt'), s, `tamanho sem tradução: ${s}`);
});

test('tipos de dano e condições', () => {
  assert.equal(damageTypeLabel('piercing', 'pt'), 'perfurante');
  assert.equal(damageTypeLabel('bludgeoning', 'pt'), 'contundente');
  assert.equal(damageTypeLabel('Piercing', 'pt'), 'perfurante');
  assert.equal(damageTypeLabel('perfurante', 'en'), 'piercing');
  assert.equal(damageTypeLabel('texto livre', 'pt'), 'texto livre');
  for (const d of DAMAGE_TYPES) assert.notEqual(damageTypeLabel(d, 'pt'), d, `dano sem tradução: ${d}`);
  assert.equal(conditionLabel('prone', 'pt'), 'caído');
  for (const c of CONDITIONS) assert.ok(conditionLabel(c, 'pt'));
  assert.equal(abilityLabel('dex', 'pt'), 'DES');
  assert.equal(abilityLabel('DEX', 'en'), 'DEX');
  assert.equal(abilityLabel('wis', 'pt'), 'SAB');
});

test('alcance em pés vira metros (sem "ft" na tela em pt)', () => {
  assert.equal(feetToMeters(5), '1,5');
  assert.equal(feetToMeters(30), '9');
  assert.equal(rangeLabel('5 ft', 'pt'), '1,5 m');
  assert.equal(rangeLabel('150/600 ft', 'pt'), '45/180 m');
  assert.equal(rangeLabel('5 ft (20/60 ranged)', 'pt'), '1,5 m (à distância 6/18 m)');
  assert.equal(rangeLabel('10 ft (120 ranged)', 'pt'), '3 m (à distância 36 m)');
  assert.equal(rangeLabel('5 ft (20/60 ranged)', 'en'), '5 ft (20/60 ranged)');
  // Nenhum alcance do bestiário fica com "ft" ou "ranged" em pt.
  for (const m of BESTIARY) {
    for (const a of m.actions || []) {
      if (!a.range) continue;
      const pt = rangeLabel(a.range, 'pt');
      assert.doesNotMatch(pt, /\bft\b|ranged|feet/i, `${m.id}: ${a.range} → ${pt}`);
    }
  }
});

test('resumo das ações e registro do combate sem inglês em pt', () => {
  const bite = { name: { pt: 'Mordida', en: 'Bite' }, type: 'melee', atk: 4, range: '5 ft', damage: '1d6+2', damageType: 'piercing' };
  assert.equal(actionSummary(bite, 'pt'), '+4 · 1,5 m · 1d6+2 perfurante');
  assert.equal(actionSummary(bite, 'en'), '+4 · 5 ft · 1d6+2 piercing');
  const web = { type: 'special', save: { ability: 'dex', dc: 12, conditions: ['restrained'] } };
  assert.equal(actionSummary(web, 'pt'), 'DES CD 12 · contido');
  const line = logLine({ type: 'attack', attacker: 'Goblin', target: 'Thalion', total: 16, ac: 12, hit: true,
    damage: { total: 6, type: 'piercing' }, manual: true }, 'pt');
  assert.match(line, /16 vs CA 12, acertou — 6 perfurante \(valores do mestre\)/);
  assert.match(logLine({ type: 'add_condition', target: 'Mira', condition: 'prone' }, 'pt'), /caído/);
  assert.equal(nameOf({ pt: 'Mordida', en: 'Bite' }, 'pt'), 'Mordida');
  assert.equal(attackKindLabel('ranged', 'pt'), 'à distância');
});

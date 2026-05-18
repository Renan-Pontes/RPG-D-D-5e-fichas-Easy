// Testes da engine de progressão (JS). Rodar com: node --test frontend/tests/
// Espelham os testes em backend/api/tests/test_progression.py.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeProgression,
  applyAutosToCharacter,
  validateLevelUp,
  profBonus,
} from '../src/progression/index.js';

function druid(level, subclass = null, abilities = { str: 8, dex: 14, con: 12, int: 13, wis: 16, cha: 10 }) {
  return {
    className: 'druid',
    level,
    subclass,
    abilities,
    spells: [],
  };
}

describe('profBonus', () => {
  test('escala canônica', () => {
    assert.equal(profBonus(1), 2);
    assert.equal(profBonus(4), 2);
    assert.equal(profBonus(5), 3);
    assert.equal(profBonus(8), 3);
    assert.equal(profBonus(9), 4);
    assert.equal(profBonus(13), 5);
    assert.equal(profBonus(17), 6);
    assert.equal(profBonus(20), 6);
  });
});

describe('computeProgression — druida', () => {
  test('nível 1 tem 2 truques esperados', () => {
    const p = computeProgression(druid(1));
    assert.equal(p.cantripsKnown, 2);
    assert.equal(p.spellsPrepared, 4);
  });

  test('Círculo das Estrelas no nível 2 adiciona guidance automático', () => {
    const p = computeProgression(druid(2, 'stars'));
    assert.deepEqual(p.autoCantrips, ['guidance']);
  });

  test('Círculo da Lua no nível 2 NÃO adiciona truques automáticos', () => {
    const p = computeProgression(druid(2, 'moon'));
    assert.deepEqual(p.autoCantrips, []);
  });

  test('Druida nível 20 tem features acumuladas', () => {
    const p = computeProgression(druid(20, 'stars'));
    const ids = p.features.map(f => f.id);
    assert.ok(ids.includes('druidic'));
    assert.ok(ids.includes('wildShape'));
    assert.ok(ids.includes('starMap'));
    assert.equal(p.profBonus, 6);
  });
});

describe('computeProgression — guerreiro', () => {
  test('nível 1 pede 1 estilo de combate', () => {
    const p = computeProgression({ className: 'fighter', level: 1, abilities: {} });
    assert.equal(p.fightingStyles, 1);
  });

  test('nível 5 ganha Ataque Extra', () => {
    const p = computeProgression({ className: 'fighter', level: 5, abilities: {} });
    assert.equal(p.extraAttacks, 1);
  });
});

describe('computeProgression — ladino', () => {
  test('nível 1 oferece 2 perícias para expertise', () => {
    const p = computeProgression({ className: 'rogue', level: 1, abilities: {} });
    assert.equal(p.expertiseSlots, 2);
  });

  test('nível 6 acumula expertise para 4', () => {
    const p = computeProgression({ className: 'rogue', level: 6, abilities: {} });
    assert.equal(p.expertiseSlots, 4);
  });
});

describe('applyAutosToCharacter — idempotência', () => {
  test('aplicar duas vezes não duplica guidance', () => {
    const c = druid(2, 'stars');
    const once = applyAutosToCharacter(c);
    const twice = applyAutosToCharacter(once);
    const guidanceCount = twice.spells.filter(s => s.id === 'guidance').length;
    assert.equal(guidanceCount, 1);
  });

  test('trocar subclasse remove auto antigo', () => {
    let c = druid(2, 'stars');
    c = applyAutosToCharacter(c);
    assert.ok(c.spells.find(s => s.id === 'guidance'));
    c = applyAutosToCharacter({ ...c, subclass: 'moon' });
    assert.equal(c.spells.find(s => s.id === 'guidance'), undefined);
  });
});

describe('validateLevelUp', () => {
  test('rejeita pular níveis', () => {
    const r = validateLevelUp(druid(3), { toLevel: 5 });
    assert.equal(r.valid, false);
  });

  test('aceita +1', () => {
    const r = validateLevelUp(druid(3), { toLevel: 4, hpGain: 6 });
    assert.equal(r.valid, true);
  });
});

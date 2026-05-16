import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeProgression,
  applyAutosToCharacter,
  validateLevelUp,
  profBonus,
} from '../../src/progression/index.js';

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
    assert.equal(p.classId, 'druid');
    // spellsPrepared = WIS(+3) + 1 = 4
    assert.equal(p.spellsPrepared, 4);
  });

  test('nível 2 sem subclasse → pendingChoices inclui subclasse', () => {
    const p = computeProgression(druid(2));
    const sub = p.pendingChoices.find(c => c.type === 'subclass');
    assert.ok(sub, 'deve ter pendingChoice de subclasse');
  });

  test('Círculo das Estrelas no nível 2 adiciona guidance automático', () => {
    const p = computeProgression(druid(2, 'stars'));
    assert.deepEqual(p.autoCantrips, ['guidance']);
    const starMap = p.features.find(f => f.id === 'starMap');
    assert.ok(starMap, 'deve ter Mapa Estelar');
    assert.equal(starMap.source, 'subclass');
  });

  test('Círculo da Lua no nível 2 NÃO adiciona truques automáticos', () => {
    const p = computeProgression(druid(2, 'moon'));
    assert.deepEqual(p.autoCantrips, []);
  });

  test('Druida nível 3 (exemplo do user): Estrelas dá 2 truques + guidance = efetivamente 3', () => {
    // O ponto: cantripsKnown continua 2, mas autoCantrips adiciona guidance separado.
    // No frontend, mostramos 2 escolhidos + N auto.
    const p = computeProgression(druid(3, 'stars'));
    assert.equal(p.cantripsKnown, 2);
    assert.deepEqual(p.autoCantrips, ['guidance']);
  });

  test('Druida nível 4 ganha 1 truque extra (total 3) e ASI', () => {
    const p = computeProgression(druid(4));
    assert.equal(p.cantripsKnown, 3);
    assert.ok(p.asiLevels.includes(4));
  });

  test('Druida nível 20 tem todas as features acumuladas', () => {
    const p = computeProgression(druid(20, 'stars'));
    const ids = p.features.map(f => f.id);
    assert.ok(ids.includes('druidic'), 'tem Druídico');
    assert.ok(ids.includes('wildShape'), 'tem Forma Selvagem');
    assert.ok(ids.includes('starMap'), 'tem Mapa Estelar');
    assert.ok(ids.includes('beastSpells'), 'tem Magias de Besta');
    assert.ok(ids.includes('archdruid'), 'tem Arquidruida');
    assert.equal(p.profBonus, 6);
  });
});

describe('computeProgression — guerreiro', () => {
  test('nível 1 pede 1 estilo de combate', () => {
    const p = computeProgression({ className: 'fighter', level: 1, abilities: {} });
    assert.equal(p.fightingStyles, 1);
    const choice = p.pendingChoices.find(c => c.type === 'fightingStyle');
    assert.ok(choice);
  });

  test('nível 5 ganha Ataque Extra', () => {
    const p = computeProgression({ className: 'fighter', level: 5, abilities: {} });
    assert.equal(p.extraAttacks, 1);
    assert.ok(p.features.find(f => f.id === 'extraAttack'));
  });

  test('Campeão nível 3 ganha Improved Critical', () => {
    const p = computeProgression({ className: 'fighter', level: 3, subclass: 'champion', abilities: {} });
    assert.ok(p.features.find(f => f.id === 'improvedCritical'));
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
    // E é marcado como auto
    const g = twice.spells.find(s => s.id === 'guidance');
    assert.equal(g.auto, true);
    assert.equal(g.prepared, true);
  });

  test('trocar subclasse remove auto antigo', () => {
    let c = druid(2, 'stars');
    c = applyAutosToCharacter(c);
    assert.ok(c.spells.find(s => s.id === 'guidance'));
    // troca para lua
    c = applyAutosToCharacter({ ...c, subclass: 'moon' });
    assert.equal(c.spells.find(s => s.id === 'guidance'), undefined);
  });

  test('truques escolhidos manualmente NÃO são removidos quando subclasse não os ganha', () => {
    let c = druid(2, 'moon');
    c.spells = [{ id: 'druidcraft', prepared: true }]; // jogador escolheu
    c = applyAutosToCharacter(c);
    assert.ok(c.spells.find(s => s.id === 'druidcraft'));
  });
});

describe('validateLevelUp', () => {
  test('rejeita pular níveis', () => {
    const r = validateLevelUp(druid(3), { toLevel: 5 });
    assert.equal(r.valid, false);
  });

  test('rejeita descer nível', () => {
    const r = validateLevelUp(druid(3), { toLevel: 2 });
    assert.equal(r.valid, false);
  });

  test('aceita +1', () => {
    const r = validateLevelUp(druid(3), { toLevel: 4, hpGain: 6 });
    assert.equal(r.valid, true);
  });

  test('rejeita hpGain absurdo', () => {
    const r = validateLevelUp(druid(3), { toLevel: 4, hpGain: 99 });
    assert.equal(r.valid, false);
  });
});

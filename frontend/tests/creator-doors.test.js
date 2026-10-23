// "Portas para o futuro": multiclasse com os valores atuais (só leitura das regras).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCharacter } from '../src/creator/creation.js';
import { selectClass } from '../src/creator/class-helpers.js';
import { suggestionPatch, setMethodPatch, pointBuyPatch, bonusPatch, STANDARD_ARRAY_BY_CLASS } from '../src/creator/ability-helpers.js';
import { MULTICLASS_PREREQS } from '../src/progression/multiclass.js';
import {
  DOOR_MIN, DOOR_CLASSES, abilitiesReady, missingGroups, multiclassDoors, needShort, needLong, haveLong, haveShort,
} from '../src/creator/doors.js';

const apply = (c, p) => ({ ...c, ...p });
const mk = (rules, className, background) => {
  let c = newCharacter(rules);
  c = apply(c, selectClass(c, className));
  if (background) c = { ...c, background };
  return c;
};
const states = (d) => Object.fromEntries(d.doors.map(x => [x.id, x.own ? 'own' : x.open ? 'open' : 'shut']));

test('as 13 classes da multiclasse, com 13 como mínimo', () => {
  assert.equal(DOOR_MIN, 13);
  assert.equal(DOOR_CLASSES.length, 13);
  assert.deepEqual(DOOR_CLASSES, Object.keys(MULTICLASS_PREREQS));
  assert.ok(DOOR_CLASSES.includes('artificer'));
});

test('antes de distribuir os atributos as portas não aparecem', () => {
  const c = mk('2024', 'fighter');
  assert.equal(abilitiesReady(c), false);
  assert.equal(multiclassDoors(c).ready, false);
  // Rolagem sem rolar também não está pronta.
  assert.equal(abilitiesReady(apply(c, setMethodPatch(c, 'roll'))), false);
});

test('conjunto padrão sem clicar no método já conta como distribuído', () => {
  const c = apply(mk('2024', 'fighter'), suggestionPatch(mk('2024', 'fighter')));
  assert.equal(c.creation.abilityMethod, undefined);
  assert.equal(abilitiesReady(c), true);
  const d = multiclassDoors(c);
  assert.equal(d.ready, true);
  // Guerreiro 15/14/13/8/10/12: Bárbaro (FOR) e Ladino (DES) abertos; o resto fechado.
  assert.equal(d.doors[0].id, 'fighter', 'a classe atual vem primeiro');
  assert.equal(d.doors.length, 13);
  const s = states(d);
  assert.equal(s.fighter, 'own');
  assert.equal(s.barbarian, 'open');
  assert.equal(s.rogue, 'open');
  for (const id of ['bard', 'cleric', 'druid', 'monk', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard', 'artificer']) assert.equal(s[id], 'shut', id);
  assert.equal(d.openCount, 2);
  assert.equal(d.own.ok, true);
  // Monge pede DES e SAB: só a Sabedoria falta.
  assert.deepEqual(d.doors.find(x => x.id === 'monk').missing, [['wis']]);
  assert.deepEqual(d.doors.find(x => x.id === 'paladin').missing, [['cha']]);
});

test('usa os valores finais com o bônus esperado do antecedente (2024), mesmo antes de sincronizar raceBonus', () => {
  let c = mk('2024', 'fighter', 'acolyte');
  c = apply(c, suggestionPatch(c));
  const before = states(multiclassDoors(c));
  assert.equal(before.bard, 'shut');
  // +2 Carisma (12 → 14) e +1 Sabedoria (10 → 11), sem gravar raceBonus.
  const p = bonusPatch(c, { pattern: '2-1', picks: { cha: 2, wis: 1 } });
  c = { ...c, creation: p.creation, raceBonus: {} };
  const d = multiclassDoors(c);
  assert.equal(d.scores.cha, 14);
  const s = states(d);
  for (const id of ['bard', 'sorcerer', 'warlock', 'paladin']) assert.equal(s[id], 'open', id);
  assert.equal(s.cleric, 'shut');
});

test('se a própria classe não cumpre o pré-requisito, nenhuma porta abre', () => {
  // Mago com Inteligência 12 (compra de pontos: 8/14/13/12/10/15 = 27 pontos).
  let c = mk('2024', 'wizard');
  c = apply(c, setMethodPatch(c, 'pointbuy'));
  c = { ...c, abilities: { str: 8, dex: 14, con: 13, int: 12, wis: 10, cha: 15 } };
  assert.equal(pointBuyPatch(c, 'str', 1), null, '27 pontos gastos');
  assert.equal(abilitiesReady(c), true);
  const d = multiclassDoors(c);
  assert.equal(d.own.id, 'wizard');
  assert.equal(d.own.ok, false);
  assert.deepEqual(d.own.missing, [['int']]);
  assert.equal(d.openCount, 0);
  const bard = d.doors.find(x => x.id === 'bard');
  assert.equal(bard.ok, true, 'Carisma 15 cumpre o do Bardo');
  assert.equal(bard.open, false, 'mas o Mago precisa de Inteligência 13 para sair');
});

test('2014: bônus fixo da raça entra na conta', () => {
  // Meio-orc 2014 dá +2 FOR +1 CON: Bárbaro 15 → 17; Clérigo com SAB 12 continua fechado.
  let c = mk('2014', 'cleric');
  c = { ...c, race: 'half-orc' };
  c = apply(c, suggestionPatch(c));
  const d = multiclassDoors(c);
  assert.equal(d.scores.str, STANDARD_ARRAY_BY_CLASS.cleric.str + 2);
  assert.equal(states(d).barbarian, 'open');
  assert.equal(d.own.ok, true);
});

test('sem classe: só o pré-requisito da classe nova', () => {
  const c = { rulesVersion: '2024', className: '', level: 1, abilities: { ...STANDARD_ARRAY_BY_CLASS.bard }, raceBonus: {}, creation: { abilityMethod: 'pointbuy' }, feats: [] };
  const d = multiclassDoors(c);
  assert.equal(d.own, null);
  assert.equal(d.doors.some(x => x.own), false);
  assert.equal(states(d).bard, 'open');
});

test('grupos que faltam e textos (pt/en)', () => {
  assert.deepEqual(missingGroups([['str', 'dex']], { str: 12, dex: 13 }), []);
  assert.deepEqual(missingGroups([['dex'], ['wis']], { dex: 15, wis: 12 }), [['wis']]);
  assert.equal(needShort([['str', 'dex']], 'pt'), 'FOR ou DES 13');
  assert.equal(needShort([['str'], ['cha']], 'en'), 'STR 13 · CHA 13');
  assert.equal(needLong([['str', 'dex']], 'pt'), 'Força ou Destreza 13');
  assert.equal(needLong([['str'], ['cha']], 'en'), 'Strength 13 and Charisma 13');
  assert.equal(haveLong([['str', 'dex']], { str: 12, dex: 11 }, 'pt'), 'Força 12 e Destreza 11');
  assert.equal(haveShort([['int']], { int: 10 }, 'en'), 'INT 10');
});

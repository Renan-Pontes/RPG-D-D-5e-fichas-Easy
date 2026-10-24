import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import { withClassLevel } from '../src/progression/multiclass.js';
import { subclassesFor } from '../src/progression/subclasses.js';
import {
  sealLock, subclassLock, landTypeLock, classChangeLock, guardSealedPatch, sealHint,
} from '../src/progression/subclass-lock.js';

const druid = (extra = {}) => ({
  rulesVersion: '2014', className: 'druid', subclass: '', landType: '', level: 2, race: 'human',
  background: 'sage', maxHp: 14, currentHp: 14, abilities: { str: 10, dex: 14, con: 14, int: 13, wis: 15, cha: 8 },
  raceBonus: {}, ...extra,
});

test('subclasse ainda não escolhida: a primeira escolha é livre (com ou sem trapaça, em campanha também)', () => {
  assert.deepEqual(subclassLock(druid()), { locked: false, reason: null });
  assert.equal(subclassLock(druid({ cheatMode: true })).locked, false);
  assert.equal(subclassLock(druid({ inCampaign: true })).locked, false);
});

test('subclasse escolhida fica selada; o modo trapaça libera a troca', () => {
  assert.deepEqual(subclassLock(druid({ subclass: 'moon' })), { locked: true, reason: 'sealed' });
  assert.deepEqual(subclassLock(druid({ subclass: 'moon', cheatMode: true })), { locked: false, reason: null });
  assert.equal(sealLock(druid({ subclass: 'moon' })).locked, true); // campo padrão: subclass
});

test('em campanha a trapaça não libera: só o mestre troca a subclasse', () => {
  assert.deepEqual(subclassLock(druid({ subclass: 'moon', inCampaign: true })), { locked: true, reason: 'campaign' });
  assert.deepEqual(subclassLock(druid({ subclass: 'moon', inCampaign: true, cheatMode: true })), { locked: true, reason: 'campaign' });
});

test('terreno do Círculo da Terra: escolher a primeira vez é livre, trocar depois só com trapaça', () => {
  assert.equal(landTypeLock(druid({ subclass: 'land' })).locked, false);
  assert.deepEqual(landTypeLock(druid({ subclass: 'land', landType: 'forest' })), { locked: true, reason: 'sealed' });
  assert.equal(landTypeLock(druid({ subclass: 'land', landType: 'forest', cheatMode: true })).locked, false);
  assert.equal(landTypeLock(druid({ subclass: 'land', landType: 'forest', inCampaign: true, cheatMode: true })).reason, 'campaign');
});

test('trocar a classe na edição apaga a subclasse: trava junto com ela', () => {
  assert.equal(classChangeLock(druid()).locked, false);
  assert.equal(classChangeLock(druid({ subclass: 'moon' })).locked, true);
  assert.equal(classChangeLock(druid({ subclass: 'moon', cheatMode: true })).locked, false);
});

test('guardSealedPatch: tira a troca proibida e deixa passar a primeira escolha e o resto do patch', () => {
  const sealed = druid({ subclass: 'moon' });
  // A troca barrada leva junto o terreno que vinha com ela.
  assert.deepEqual(guardSealedPatch(sealed, { subclass: 'land', landType: 'forest', notes: 'x' }), { notes: 'x' });
  // Repetir o valor atual não é troca (o modal manda landType: '' para quem não é da Terra).
  assert.deepEqual(guardSealedPatch(sealed, { subclass: 'moon', landType: '' }), { subclass: 'moon', landType: '' });
  assert.deepEqual(guardSealedPatch(druid(), { subclass: 'land', landType: 'forest' }), { subclass: 'land', landType: 'forest' });
  assert.deepEqual(guardSealedPatch({ ...sealed, cheatMode: true }, { subclass: 'land' }), { subclass: 'land' });
  // Terra sem terreno: escolhe o terreno, mas não troca o círculo.
  const land = druid({ subclass: 'land' });
  assert.deepEqual(guardSealedPatch(land, { subclass: 'land', landType: 'arctic' }), { subclass: 'land', landType: 'arctic' });
  assert.deepEqual(guardSealedPatch({ ...land, landType: 'arctic' }, { landType: 'coast' }), {});
  assert.deepEqual(guardSealedPatch(sealed, null), {});
});

test('multiclasse: cada classe tem a própria trava (a vista da classe traz trapaça e campanha da ficha)', () => {
  let c = druid({ level: 3, subclass: 'moon' });
  c = withClassLevel(c, 'cleric');
  const [dru, cle] = Utils.classEntries(c).map(e => Utils.classView(c, e));
  assert.equal(subclassLock(dru).locked, true);
  assert.equal(subclassLock(cle).locked, false); // clérigo ainda vai escolher o domínio
  const withDomain = { ...c, multiclass: c.multiclass.map(m => ({ ...m, subclass: 'life' })) };
  const cle2 = Utils.classView(withDomain, Utils.classEntries(withDomain)[1]);
  assert.equal(subclassLock(cle2).locked, true);
  assert.equal(subclassLock({ ...cle2, cheatMode: true }).locked, false);
  assert.equal(subclassLock(Utils.classView({ ...withDomain, inCampaign: true, cheatMode: true }, Utils.classEntries(withDomain)[1])).reason, 'campaign');
});

test('subclasse que a lista não conhece não conta como selada (a ficha oferece escolher)', () => {
  const subs = subclassesFor(druid());
  assert.ok(subs.some(s => s.id === 'moon'));
  assert.equal(subclassLock(druid({ subclass: 'moon' }), subs).locked, true);
  assert.equal(subclassLock(druid({ subclass: 'circleOfNowhere' }), subs).locked, false);
  assert.equal(subclassLock(druid({ subclass: 'circleOfNowhere' })).locked, true); // sem lista: vale o campo
  assert.equal(classChangeLock(druid({ subclass: 'circleOfNowhere' }), subs).locked, false);
  assert.deepEqual(guardSealedPatch(druid({ subclass: 'circleOfNowhere' }), { subclass: 'moon' }, subs), { subclass: 'moon' });
  assert.deepEqual(guardSealedPatch(druid({ subclass: 'stars' }), { subclass: 'moon' }, subs), {});
});

test('dica curta nos dois idiomas', () => {
  assert.equal(sealHint('sealed', 'pt'), 'Para trocar, ligue o modo trapaça');
  assert.equal(sealHint('sealed', 'en'), 'To change it, turn on cheat mode');
  assert.match(sealHint('campaign', 'pt'), /mestre/);
  assert.match(sealHint('campaign', 'en'), /DM/);
  assert.equal(sealHint(null, 'pt'), '');
});

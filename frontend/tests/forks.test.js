import test from 'node:test';
import assert from 'node:assert/strict';
import { fork, seatFork, isFork, templateIdOf, forksOf, familyOf, groupWithForks, forkLabel, copyDevicePrefs, seatConflict } from '../src/sheet/forks.js';
import { register, checkout } from '../src/sheet/versions.js';

const tpl = () => ({ id: 7, name: 'Lia', level: 3, maxHp: 20, currentHp: 12, avatar: 'data:x', inCampaign: true, createdAt: 'c', updatedAt: 'u' });

test('fork copia o modelo sem id nem campos do servidor e marca a origem', () => {
  const f = fork(tpl(), { campaign: { id: 5, name: 'Ecos' }, at: 't0' });
  assert.equal(f.id, undefined);
  assert.equal(f.inCampaign, undefined);
  assert.equal(f.createdAt, undefined);
  assert.equal(f.level, 3);
  assert.equal(f.avatar, 'data:x');
  assert.deepEqual([f.versionOf, f.versionKind, f.versionCampaign, f.versionCreatedAt], [7, 'campaign', { id: 5, name: 'Ecos' }, 't0']);
});

test('fork de ficha com armazém antigo copia o MODELO, não a versão aberta, e não leva o armazém', () => {
  let c = register(tpl(), { id: 1, name: 'A' });
  c = checkout(c, '1');
  c = { ...c, id: 7, level: 9 };              // a versão aberta subiu de nível
  const f = fork(c);
  assert.equal(f.level, 3);
  assert.equal(f.versions, undefined);
});

test('fork de versão aponta para o modelo de origem; tipo inválido vira campaign', () => {
  const v = { ...fork(tpl()), id: 8 };
  const vv = fork(v, { kind: 'xx' });
  assert.equal(vv.versionOf, 7);
  assert.equal(vv.versionKind, 'campaign');
  assert.equal(fork(tpl(), { kind: 'oneshot' }).versionKind, 'oneshot');
});

test('fork exige ficha já gravada', () => {
  assert.throws(() => fork({ name: 'x' }), /fork_needs_saved_sheet/);
  assert.throws(() => fork({ id: 'local-1' }), /fork_needs_saved_sheet/);
});

test('seatFork, isFork, templateIdOf', () => {
  const v = seatFork({ ...fork(tpl()), id: 8 }, { id: 3, name: 'Z' });
  assert.deepEqual(v.versionCampaign, { id: 3, name: 'Z' });
  assert.equal(isFork(v), true);
  assert.equal(isFork(tpl()), false);
  assert.equal(templateIdOf({ versionOf: '7' }), 7);
});

const list = [
  { id: 1, name: 'A' },
  { id: 9, versionOf: 7, versionCreatedAt: '2' },
  { id: 7, name: 'Lia' },
  { id: 8, versionOf: 7, versionCreatedAt: '1' },
  { id: 4, versionOf: 99 },
];

test('forksOf e familyOf', () => {
  assert.deepEqual(forksOf(list, 7).map(c => c.id), [8, 9]);
  assert.deepEqual(familyOf(list, { id: 9, versionOf: 7 }).map(c => c.id), [7, 8, 9]);
  assert.deepEqual(familyOf(list, { id: 7 }).map(c => c.id), [7, 8, 9]);
});

test('groupWithForks põe as versões logo depois do modelo; órfã fica no lugar', () => {
  assert.deepEqual(groupWithForks(list).map(c => c.id), [1, 7, 8, 9, 4]);
  // modelo filtrado: as versões aparecem soltas
  assert.deepEqual(groupWithForks(list.filter(c => c.id !== 7)).map(c => c.id), [1, 9, 8, 4]);
});

test('forkLabel', () => {
  assert.equal(forkLabel({ versionOf: 7, versionCampaign: { name: 'Ecos' } }), 'Ecos');
  assert.equal(forkLabel({ versionOf: 7, versionKind: 'oneshot', versionCampaign: { name: 'Cripta' } }), 'One-shot · Cripta');
  assert.equal(forkLabel({ versionOf: 7 }, 'en'), 'New version');
  assert.equal(forkLabel({ id: 1 }), '');
});

test('copyDevicePrefs copia cinto e rolador sem sobrescrever', () => {
  const m = new Map([['fh-belt:7', 'B'], ['fh-multiroll4:7', 'M'], ['fh-multiroll4:8', 'keep']]);
  const store = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
  assert.equal(copyDevicePrefs(7, 8, store), 1);
  assert.equal(m.get('fh-belt:8'), 'B');
  assert.equal(m.get('fh-multiroll4:8'), 'keep');
  assert.equal(copyDevicePrefs(7, 8, { getItem() { throw new Error('blocked'); } }), 0);
});

test('seatConflict: mesma ficha ou outra versão do mesmo modelo na mesa', () => {
  assert.equal(seatConflict(list, { id: 8, versionOf: 7 }, [8]), 'same_sheet');
  assert.equal(seatConflict(list, { id: 8, versionOf: 7 }, [7]), 'same_family');
  assert.equal(seatConflict(list, { id: 7 }, [9]), 'same_family');
  assert.equal(seatConflict(list, { id: 8, versionOf: 7 }, [1, 4]), null);
});

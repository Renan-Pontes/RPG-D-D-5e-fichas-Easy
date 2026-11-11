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

import { archiveFork, unarchiveFork, isArchivedFork, shouldAutoArchive, archivedPreview, restartFromTemplate, splittable, splitFromStore, forkPlanNote } from '../src/sheet/forks.js';

test('arquivo: one-shot cuja mesa sumiu vira arquivo; desarquivar volta', () => {
  const os = { id: 8, versionOf: 7, versionKind: 'oneshot', versionCampaign: { id: 5, name: 'Cripta' } };
  assert.equal(shouldAutoArchive(os, null), false);
  assert.equal(shouldAutoArchive(os, [{ id: 5 }]), false);
  assert.equal(shouldAutoArchive(os, []), true);
  assert.equal(shouldAutoArchive({ ...os, versionKind: 'campaign' }, []), false);
  const a = archiveFork(os, 't');
  assert.equal(isArchivedFork(a), true);
  assert.equal(shouldAutoArchive(a, []), false);
  assert.equal(isArchivedFork(unarchiveFork(a)), false);
  const pv = archivedPreview(a);
  assert.equal(pv.id, 'a:8');
  assert.deepEqual(pv.versionPreview, { of: 8, key: 'fork', state: 'archived', name: 'One-shot · Cripta', fork: true });
});

test('recomeçar a partir do modelo mantém id, mesa e tipo', () => {
  const v = { id: 8, level: 9, versionOf: 7, versionKind: 'oneshot', versionCampaign: { id: 5, name: 'C' }, versionCreatedAt: 't0' };
  const r = restartFromTemplate(v, tpl(), 't1');
  assert.deepEqual([r.id, r.level, r.versionOf, r.versionKind, r.versionCampaign.id, r.versionCreatedAt, r.versionRestartedAt], [8, 3, 7, 'oneshot', 5, 't0', 't1']);
  assert.throws(() => restartFromTemplate(v, { id: 99 }), /wrong_template/);
  assert.throws(() => restartFromTemplate(tpl(), tpl()), /not_a_version/);
});

test('separar versão do armazém antigo em ficha própria', () => {
  let c = register(tpl(), { id: 1, name: 'A' });
  c = register(c, { id: 2, name: 'B' });
  c = checkout(c, '1');
  c = { ...c, id: 7 };
  assert.deepEqual(splittable(c).map(x => x.key).sort(), ['2']);
  const f = splitFromStore(c, '2', 't');
  assert.deepEqual([f.versionOf, f.versionCampaign.id, f.versionCampaign.name, f.versions], [7, 2, 'B', undefined]);
  assert.throws(() => splitFromStore(c, '1'), /version_in_use/);
  assert.throws(() => splitFromStore(c, '9'), /version_not_found/);
  assert.deepEqual(splittable({ id: 8, versionOf: 7 }), []);
});

test('aviso do plano', () => {
  const my = { usage: { characters: 3 }, limits: { characters: 3 } };
  const n = forkPlanNote(my, list, { id: 7 });
  assert.equal(n.atLimit, true);
  assert.match(n.text, /3 de 3 em uso · 2 são versões/);
  assert.match(n.text, /plano está cheio/);
  assert.equal(forkPlanNote(null, list, { id: 7 }).atLimit, false);
  assert.match(forkPlanNote({ usage: { characters: 1 }, limits: { characters: 5 } }, [], { id: 1 }, 'en').text, /1 of 5 in use\.$/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import {
  buildHistory, charLine, hpTone, inviteText, levelupFor, levelupSummary, memberStats,
  payloadText, pendingCount, splitApprovals, xpProgress,
} from '../src/group/group-model.js';

const druid = {
  name: 'Thalion', race: 'elf-wood', className: 'druid', level: 3, rulesVersion: '2024',
  abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 16, cha: 8 },
  armor: 'leather', hasShield: true, currentHp: 15, maxHp: 21, xp: 1200,
  feats: [{ id: 'alert' }], conditions: ['poisoned'],
};

test('card usa o mesmo cálculo da Mesa para CA e iniciativa', () => {
  const s = memberStats({ character: { id: 1, name: 'Thalion', data: druid } });
  assert.equal(s.ac, Utils.computeAc(druid));
  assert.equal(s.init, Utils.initiative(druid));
  assert.equal(s.ac, 11 + 2 + 2, 'couro 11 + DES 2 + escudo 2');
  assert.equal(s.init, 2 + 2, 'DES + Alerta (2024: + proficiência)');
  assert.equal(s.isDruid, true);
  assert.equal(s.wildShape, null);
  assert.equal(s.hp, 15);
});

test('ficha não-druida nunca mostra forma selvagem; resumo público não inventa CA', () => {
  const fighter = { ...druid, className: 'fighter', wildShape: { active: true } };
  assert.equal(memberStats({ character: { id: 2, name: 'K', data: fighter } }).isDruid, false);
  const pub = memberStats({ character: { id: 3, name: 'Mira', summary: { race: 'human', classes: [{ id: 'rogue', level: 2 }], level: 2, currentHp: 9, maxHp: 14 } } });
  assert.equal(pub.ac, null);
  assert.equal(pub.init, null);
  assert.equal(pub.level, 2);
  assert.equal(memberStats({ character: null }), null);
});

test('linha de classe/espécie traduzida (sem id cru)', () => {
  const line = charLine({ race: 'human', classes: [{ id: 'druid', level: 2 }, { id: 'fighter', level: 1 }] }, 'pt');
  assert.equal(line, 'Humano · Druida 2 / Guerreiro 1');
  assert.ok(!/elf-wood|druid 2/.test(charLine(druid, 'pt')), charLine(druid, 'pt'));
});

const approvals = [
  { id: 1, type: 'levelup', status: 'pending', character: { id: 10, name: 'Thalion' }, payload: { toLevel: 4 }, created_at: '2026-10-01T10:00:00Z' },
  { id: 2, type: 'spell', status: 'pending', character: { id: 11, name: 'Mira' }, payload: { id: 'fireball' }, created_at: '2026-10-01T11:00:00Z' },
  { id: 3, type: 'levelup', status: 'approved', character: { id: 11, name: 'Mira' }, payload: { toLevel: 3 }, reviewed_at: '2026-10-02T10:00:00Z' },
  { id: 4, type: 'levelup', status: 'consumed', character: { id: 12, name: 'Kor' }, payload: { toLevel: 2, classId: 'fighter', hpGain: 7, choice: { type: 'asi', asi: { str: 2 } } }, reviewed_at: '2026-09-30T10:00:00Z' },
  { id: 5, type: 'item', status: 'rejected', character: { id: 12, name: 'Kor' }, payload: { name: 'Vorpal' }, reviewed_at: '2026-10-03T10:00:00Z' },
];

test('contagem de pedidos é uma só fonte (inclui subida de nível)', () => {
  const { pending, unlocked, history } = splitApprovals(approvals);
  assert.equal(pending.length, 2);
  assert.equal(pendingCount(approvals), 2);
  assert.deepEqual(unlocked.map(a => a.id), [3]);
  assert.deepEqual(history.map(a => a.id), [5, 3, 4], 'histórico inclui liberação, do mais novo ao mais velho');
  assert.equal(levelupFor(approvals, 10, 'pending').id, 1);
  assert.equal(levelupFor(approvals, 10, 'approved'), null);
});

test('histórico junta liberações e XP entregue', () => {
  const h = buildHistory(approvals, [
    { id: 70, subtype: 'xp', occurredAt: '2026-10-04T10:00:00Z', data: { each: 150, characters: [{ name: 'Thalion' }, { name: 'Mira' }] } },
    { id: 71, subtype: 'note', occurredAt: '2026-10-05T10:00:00Z' },
  ]);
  assert.equal(h[0].kind, 'xp');
  assert.equal(h[0].each, 150);
  assert.deepEqual(h[0].names, ['Thalion', 'Mira']);
  assert.equal(h.length, 4);
});

test('textos de pedido sem JSON cru', () => {
  assert.equal(payloadText(approvals[0], 'pt'), 'para o nível 4');
  assert.equal(payloadText({ type: 'other', payload: { foo: { bar: 1 } } }, 'pt'), '');
  assert.equal(levelupSummary(approvals[3].payload, 'pt'), 'Guerreiro · +7 PV · FOR +2');
});

test('vida e XP', () => {
  assert.equal(hpTone(0, 10), 'down');
  assert.equal(hpTone(2, 10), 'crit');
  assert.equal(hpTone(5, 10), 'warn');
  assert.equal(hpTone(9, 10), 'ok');
  assert.deepEqual(xpProgress(3, 1800), { xp: 1800, next: 2700, pct: 50 });
  assert.equal(xpProgress(20, 400000).next, null);
});

test('convite: link /join/<código> quando a rota existe, senão o código', () => {
  assert.equal(inviteText({ origin: 'https://forja.app/', code: 'ABC123', hasJoinRoute: true }), 'https://forja.app/join/ABC123');
  const txt = inviteText({ origin: 'https://forja.app', code: 'ABC123', campaignName: 'Reino', hasJoinRoute: false, lang: 'pt' });
  assert.ok(txt.includes('ABC123') && txt.includes('https://forja.app') && !txt.includes('/join/'), txt);
  assert.equal(inviteText({ origin: 'x', code: '' }), '');
});

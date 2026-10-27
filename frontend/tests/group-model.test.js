import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import {
  buildHistory, charLine, hpTone, inviteText, levelupFor, levelupSummary, memberStats,
  keepOrder, payloadText, pendingCount, sortPending, splitApprovals, statPills, xpKnown, xpProgress,
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

test('cartão: pastilhas só com valor e XP só com dado real', () => {
  const full = memberStats({ character: { id: 1, name: 'Thalion', data: druid } });
  // uma classe só: "Elfo da Floresta · Druida 3" já diz o nível, a pastilha não repete
  assert.equal(full.levelInLine, true);
  assert.deepEqual(statPills(full, 'pt').map(p => `${p.label} ${p.value}`), ['CA 15', 'Inic. +4']);
  // multiclasse: a linha diz "Druida 2 / Guerreiro 1", o Nível 3 vem na pastilha
  const multi = memberStats({ character: { id: 1, name: 'Thalion', data: { ...druid, multiclass: [{ id: 'fighter' }], classSequence: ['druid', 'druid', 'fighter'] } } });
  assert.equal(multi.levelInLine, false);
  assert.deepEqual(statPills(multi, 'pt').map(p => `${p.label} ${p.value}`), ['CA 15', 'Inic. +4', 'Nível 3']);
  assert.equal(xpKnown(full), true);
  // ficha completa sem xp gravado: 0 de verdade (mestre ou dono)
  const { xp: _x, ...noXp } = druid;
  assert.equal(xpKnown(memberStats({ character: { id: 1, name: 'T', data: noXp } })), true);
  // colega (resumo público): só o Nível, sem "—" e sem "0 / 2700 XP"
  const pub = memberStats({ character: { id: 3, name: 'Mira', summary: { race: 'human', classes: [{ id: 'rogue', level: 3 }], level: 3, currentHp: 9, maxHp: 14 } } });
  assert.deepEqual(statPills(pub, 'en').map(p => `${p.label} ${p.value}`), [], '"Human · Rogue 3" already says the level');
  const pubMulti = memberStats({ character: { id: 3, name: 'Mira', summary: { race: 'human', classes: [{ id: 'rogue', level: 2 }, { id: 'wizard', level: 1 }], level: 3 } } });
  assert.deepEqual(statPills(pubMulti, 'en').map(p => `${p.label} ${p.value}`), ['Level 3']);
  assert.equal(xpKnown(pub), false);
  // se um dia o resumo trouxer xp, a barra aparece
  assert.equal(xpKnown(memberStats({ character: { id: 3, name: 'Mira', summary: { level: 3, xp: 1500 } } })), true);
  assert.deepEqual(statPills(null, 'pt'), []);
  assert.equal(xpKnown(null), false);
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

test('pedidos esperando: subidas de nível primeiro, depois por ordem de chegada', () => {
  const list = [
    { id: 4, type: 'other', status: 'pending', created_at: '2026-10-24T15:13:28-03:00' },
    { id: 3, type: 'item', status: 'pending', created_at: '2026-10-24T15:12:00-03:00' },
    { id: 2, type: 'spell', status: 'pending', created_at: '2026-10-24T15:11:00-03:00' },
    { id: 1, type: 'levelup', status: 'pending', created_at: '2026-10-24T15:10:00-03:00' },
    { id: 9, type: 'levelup', status: 'pending', created_at: '2026-10-24T16:00:00-03:00' },
  ];
  assert.deepEqual(sortPending(list).map(a => a.id), [1, 9, 2, 3, 4]);
  assert.deepEqual(list.map(a => a.id), [4, 3, 2, 1, 9], 'não muda a lista de quem chama');
  assert.deepEqual(sortPending(null), []);
});

test('pedido que chega entra no fim; quem já estava não muda de lugar', () => {
  const p = (id, type, at) => ({ id, type, status: 'pending', created_at: `2026-10-24T15:${at}:00-03:00` });
  const first = sortPending([p(2, 'spell', 11), p(1, 'levelup', 10), p(3, 'item', 12)]);
  assert.deepEqual(keepOrder(null, first).map(a => a.id), [1, 2, 3]);
  // chega uma subida de nível (iria para o 2º lugar): entra no fim
  const next = sortPending([p(2, 'spell', 11), p(1, 'levelup', 10), p(3, 'item', 12), p(9, 'levelup', 20)]);
  assert.deepEqual(next.map(a => a.id), [1, 9, 2, 3]);
  assert.deepEqual(keepOrder([1, 2, 3], next).map(a => a.id), [1, 2, 3, 9]);
  // um resolvido sai sem mexer na ordem dos outros
  assert.deepEqual(keepOrder([1, 2, 3, 9], next.filter(a => a.id !== 2)).map(a => a.id), [1, 3, 9]);
  assert.deepEqual(keepOrder([], []), []);
  assert.deepEqual(keepOrder([5], null), []);
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

// V10 · Fila de rolagens da Tela: ids vistos, nada reprisado ao abrir, dado grande só
// com menos de 10 s pelo relógio do servidor, fila de 8 s (4 s com mais de uma), feed
// de 4 linhas que somem 12 s depois de chegar, e os textos da linha (pt/en).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attackOutcome, bigDuration, createQueue, currentBig, feedNextExpiry, ingest, isBig, nextBig, pruneFeed,
  rollAgeS, rollGroups, rollLine, rollParts, rollWho, saveHead, showsSum, BIG_MS, BIG_MS_BUSY, FEED_MS,
} from '../src/screen/roll-queue.js';

const NOW = '2026-10-27T20:00:30.000Z';
const at = (s) => new Date(Date.parse(NOW) - s * 1000).toISOString();
const roll = (id, extra = {}) => ({ id, kind: 'request', who: 'Dagna', label: 'Percepção', diceType: 'd20', count: 1,
  modifier: 2, rolls: [{ value: 12, kept: true }], total: 14, crit: false, fail: false, at: at(1), ...extra });

test('ao abrir, o que já está na janela é visto e nada é reprisado', () => {
  let q = ingest(createQueue(), { rolls: [roll(1), roll(2, { crit: true })], now: NOW }, 1000);
  assert.equal(q.primed, true);
  assert.deepEqual(q.big, []);
  assert.deepEqual(q.feed, []);
  q = ingest(q, { rolls: [roll(1), roll(2)], now: NOW }, 3000);
  assert.deepEqual(q.big, []);
});

test('pedido antigo resolvido depois de um novo: os 2 aparecem, em ordem', () => {
  let q = ingest(createQueue(), { rolls: [], now: NOW });
  q = ingest(q, { rolls: [roll(9, { at: at(3) })], now: NOW });         // B (novo) resolvido primeiro
  q = ingest(q, { rolls: [roll(9, { at: at(5) }), roll(4, { at: at(1) })], now: NOW });   // depois A (antigo)
  assert.deepEqual(q.big.map(r => r.id), [9, 4]);
});

test('2 rolagens em menos de 2 s entram em fila e a fila acelera', () => {
  let q = ingest(createQueue(), { rolls: [], now: NOW });
  q = ingest(q, { rolls: [roll(1), roll(2)], now: NOW });
  assert.deepEqual(q.big.map(r => r.id), [1, 2]);
  assert.equal(currentBig(q).id, 1);
  assert.equal(bigDuration(q), BIG_MS_BUSY);
  q = nextBig(q, 1);
  assert.equal(currentBig(q).id, 2);
  assert.equal(bigDuration(q), BIG_MS);
  assert.equal(nextBig(q, 99), q, 'id que não é o atual não mexe');
  q = nextBig(q);
  assert.equal(currentBig(q), null);
});

test('a idade é pelo relógio do servidor: TV adiantada 60 s não muda nada', () => {
  let q = ingest(createQueue(), { rolls: [], now: NOW }, Date.parse(NOW) + 60_000);
  q = ingest(q, { rolls: [roll(1, { at: at(2) })], now: NOW }, Date.parse(NOW) + 60_000);
  assert.equal(q.big.length, 1);
  assert.equal(rollAgeS(roll(1, { at: at(2) }), NOW), 2);
  assert.equal(rollAgeS({ at: null }, NOW), Infinity);
});

test('com mais de 10 s de idade vai só ao feed', () => {
  let q = ingest(createQueue(), { rolls: [], now: NOW }, 0);
  q = ingest(q, { rolls: [roll(1, { at: at(11), crit: true })], now: NOW }, 5000);
  assert.deepEqual(q.big, []);
  assert.deepEqual(q.feed.map(r => [r.id, r.arrivedAt]), [[1, 5000]]);
});

test('rolagem normal do jogador vai ao feed; 20 natural vai grande', () => {
  assert.equal(isBig({ kind: 'player' }), false);
  assert.equal(isBig({ kind: 'player', crit: true }), true);
  // V15: a rolagem da ficha vai ao feed; 20/1 natural ganha o dado grande
  assert.equal(isBig({ kind: 'sheet' }), false);
  assert.equal(isBig({ kind: 'sheet', fail: true }), true);
  for (const kind of ['monster', 'save', 'dm', 'request']) assert.equal(isBig({ kind }), true, kind);
  let q = ingest(createQueue(), { rolls: [], now: NOW });
  q = ingest(q, { rolls: [roll(1, { kind: 'player' }), roll(2, { kind: 'player', crit: true })], now: NOW }, 100);
  assert.deepEqual(q.feed.map(r => r.id), [1]);
  assert.deepEqual(q.big.map(r => r.id), [2]);
});

test('feed: até 4 linhas, somem 12 s depois de chegar à TV', () => {
  let q = ingest(createQueue(), { rolls: [], now: NOW }, 0);
  for (let i = 1; i <= 6; i++) q = ingest(q, { rolls: [roll(i, { kind: 'player' })], now: NOW }, i * 1000);
  assert.deepEqual(q.feed.map(r => r.id), [3, 4, 5, 6]);
  assert.equal(feedNextExpiry(q, 4000), 3000 + FEED_MS - 4000);
  q = pruneFeed(q, 3000 + FEED_MS);
  assert.deepEqual(q.feed.map(r => r.id), [4, 5, 6]);
  assert.equal(pruneFeed(q, 0), q, 'nada venceu: a mesma fila');
  assert.equal(feedNextExpiry(createQueue(), 0), null);
});

// V10-fix: o feed fica escondido durante o dado grande — o relógio dele para junto.
test('feed: os 12 s só contam com a linha à vista (param durante o dado grande)', () => {
  let q = ingest(createQueue(), { rolls: [], now: NOW }, 0);
  q = ingest(q, { rolls: [roll(1, { kind: 'player' })], now: NOW }, 1000);            // feed, à vista
  q = ingest(q, { rolls: [roll(2, { kind: 'monster' })], now: NOW }, 5000);           // dado grande: o feed some
  assert.equal(q.feedHeldAt, 5000);
  q = ingest(q, { rolls: [roll(3, { kind: 'player' })], now: NOW }, 6000);            // chega escondida
  q = ingest(q, { rolls: [roll(4, { kind: 'dm' })], now: NOW }, 7000);                // outra grande na fila
  assert.equal(feedNextExpiry(q, 20000), null, 'parado: nenhum prazo');
  assert.equal(pruneFeed(q, 40000), q, 'parado: nada vence');
  q = nextBig(q, 2, 13000);
  assert.equal(q.feedHeldAt, 5000, 'ainda há grande na fila');
  q = nextBig(q, 4, 30000);                                                         // o feed volta aos 30 s
  assert.equal(q.feedHeldAt, null);
  // a 1 já tinha 4 s à vista (1 s → 5 s): sobram 8 s; a 3 começa agora (12 s)
  assert.deepEqual(q.feed.map(r => [r.id, r.arrivedAt]), [[1, 26000], [3, 30000]]);
  assert.equal(feedNextExpiry(q, 30000), 8000);
  assert.deepEqual(pruneFeed(q, 38000).feed.map(r => r.id), [3]);
});

test('ids vistos não crescem sem fim', () => {
  let q = ingest(createQueue(), { rolls: [], now: NOW });
  for (let i = 1; i <= 260; i++) q = ingest(q, { rolls: [roll(i, { kind: 'player', at: at(30) })], now: NOW }, i);
  assert.equal(q.seen.length, 200);
  assert.equal(q.seen.at(-1), 260);
});

test('textos: monstro sem o bônus, salvaguarda resumida, mestre como "Mestre"', () => {
  const dmg = { slashing: 'cortante', fire: 'fogo' };
  const labels = { damageLabel: (t) => dmg[t] || t, abilityLabel: (a) => ({ dex: 'DES' }[a] || a) };
  const atk = { id: 1, kind: 'monster', who: 'Goblin #2', label: 'Dagna', total: 11, hit: true,
    damage: [{ amount: 6, type: 'slashing' }], rolls: [{ value: 11, kept: true }] };
  assert.equal(rollLine(atk, 'pt', labels), 'Goblin #2 ⚔ Dagna · d20 11 · ACERTA · 6 cortante');
  assert.equal(attackOutcome({ ...atk, crit: true, damage: [{ amount: 14, type: 'slashing' }] }, 'en', labels), 'CRITICAL · 14 cortante');
  assert.equal(attackOutcome({ ...atk, hit: false, fail: true }, 'pt'), '1 natural · ERRA');
  assert.equal(showsSum(atk), false);
  const save = { id: 2, kind: 'save', who: 'Dragão', label: 'Sopro de Fogo', ability: 'dex', dc: 13,
    targets: [{ who: 'Dagna', total: 9, ok: false }, { who: 'Kaelor', total: 15, ok: true }] };
  assert.equal(saveHead(save, 'pt', labels), 'Sopro de Fogo · DES CD 13');
  assert.equal(rollLine(save, 'pt', labels), 'Dragão · Sopro de Fogo · DES CD 13 · Dagna 9 ✗ · Kaelor 15 ✓');
  assert.deepEqual(rollGroups(save), []);
  assert.equal(rollWho({ kind: 'dm', who: '' }, 'pt'), 'Mestre');
  assert.equal(rollWho({ kind: 'dm', who: '' }, 'en'), 'GM');
  assert.equal(rollLine(roll(3), 'pt'), 'Dagna · Percepção · 14');
  assert.equal(rollLine({ id: 4, kind: 'dm', who: '', label: '', count: 2, diceType: 'd6', total: 7 }, 'en'), 'GM · 2d6 · 7');
  // o feed corta só o rótulo: o resultado vem à parte
  assert.deepEqual(rollParts(atk, 'pt', labels), { head: 'Goblin #2 ⚔ Dagna', tail: 'd20 11 · ACERTA · 6 cortante' });
  assert.deepEqual(rollParts(save, 'pt', labels), { head: 'Dragão · Sopro de Fogo · DES CD 13', tail: 'Dagna 9 ✗ · Kaelor 15 ✓' });
  assert.deepEqual(rollParts(roll(5, { label: 'Investigação na biblioteca abandonada de Brumafria' }), 'pt'),
    { head: 'Dagna · Investigação na biblioteca abandonada de Brumafria', tail: '14' });
  assert.deepEqual(rollParts(null), { head: '', tail: '' });
});

test('grupos do dado grande: fórmula mista e vantagem', () => {
  const mixed = { kind: 'dm', diceType: 'mixed', rolls: [{ value: 5, die: 'd8' }, { value: 2, die: 'd6' }, { value: 6, die: 'd6' }] };
  assert.deepEqual(rollGroups(mixed), [{ die: 8, sign: 1, rolls: [{ value: 5, kept: true }] },
    { die: 6, sign: 1, rolls: [{ value: 2, kept: true }, { value: 6, kept: true }] }]);
  const adv = { kind: 'dm', diceType: 'd20', modifier: 0, rolls: [{ value: 4, kept: false }, { value: 17, kept: true }] };
  assert.deepEqual(rollGroups(adv), [{ die: 20, sign: 1, rolls: [{ value: 4, kept: false }, { value: 17, kept: true }] }]);
  assert.equal(showsSum(adv), false);
  assert.equal(showsSum({ ...adv, modifier: 3 }), true);
});

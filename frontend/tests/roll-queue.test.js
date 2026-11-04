// V10 · Fila de rolagens da Tela: ids vistos, nada reprisado ao abrir, cartão grande só
// com menos de 10 s pelo relógio do servidor, fila de 8 s (4 s com mais de uma) e os
// textos da linha (pt/en). Onda 3 (E2.1): as rolagens dos jogadores também ganham o
// cartão (um pouco menor, 6 s) e, depois dele, tudo fica nas "Últimas rolagens" (as 5
// mais novas, que somem 2 min depois da última).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attackOutcome, bigDuration, bigSize, createQueue, currentBig, histNextExpiry, histParts, ingest, isBig, nextBig,
  pruneHist, rollAgeS, rollGroups, rollLine, rollParts, rollWho, saveHead, showsSum,
  BIG_MS, BIG_MS_BUSY, BIG_MS_SMALL, HIST_MAX, HIST_MS,
} from '../src/screen/roll-queue.js';

const NOW = '2026-10-27T20:00:30.000Z';
const at = (s) => new Date(Date.parse(NOW) - s * 1000).toISOString();
const roll = (id, extra = {}) => ({ id, kind: 'request', who: 'Dagna', label: 'Percepção', diceType: 'd20', count: 1,
  modifier: 2, rolls: [{ value: 12, kept: true }], total: 14, crit: false, fail: false, at: at(1), ...extra });

test('ao abrir, o que já está na janela é visto e nada é reprisado (mas fica nas Últimas)', () => {
  let q = ingest(createQueue(), { rolls: [roll(1, { at: at(40) }), roll(2, { crit: true, at: at(20) })], now: NOW }, 100_000);
  assert.equal(q.primed, true);
  assert.deepEqual(q.big, []);
  assert.deepEqual(q.hist.map(r => r.id), [1, 2]);
  assert.equal(q.histAt, 100_000 - 20_000, 'o relógio das Últimas conta da mais nova (pelo servidor)');
  q = ingest(q, { rolls: [roll(1), roll(2)], now: NOW }, 103_000);
  assert.deepEqual(q.big, []);
  assert.deepEqual(ingest(createQueue(), { rolls: [], now: NOW }, 0).hist, []);
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

test('com mais de 10 s de idade vai direto às Últimas rolagens (sem cartão)', () => {
  let q = ingest(createQueue(), { rolls: [], now: NOW }, 0);
  q = ingest(q, { rolls: [roll(1, { at: at(11), crit: true })], now: NOW }, 5000);
  assert.deepEqual(q.big, []);
  assert.deepEqual(q.hist.map(r => r.id), [1]);
  assert.equal(q.histAt, 5000);
});

test('E2.1: a rolagem do jogador ganha o cartão grande, um pouco menor (20 e 1 do tamanho do mestre)', () => {
  for (const kind of ['player', 'sheet', 'monster', 'save', 'dm', 'request', 'check']) assert.equal(isBig({ kind }), true, kind);
  assert.equal(bigSize({ kind: 'sheet' }), 'small');
  assert.equal(bigSize({ kind: 'player' }), 'small');
  assert.equal(bigSize({ kind: 'sheet', crit: true }), 'full');
  assert.equal(bigSize({ kind: 'player', fail: true }), 'full');
  for (const kind of ['monster', 'save', 'dm', 'request', 'check']) assert.equal(bigSize({ kind }), 'full', kind);
  let q = ingest(createQueue(), { rolls: [], now: NOW });
  q = ingest(q, { rolls: [roll(1, { kind: 'sheet' })], now: NOW }, 100);
  assert.deepEqual(q.big.map(r => r.id), [1]);
  assert.equal(bigDuration(q), BIG_MS_SMALL, 'sozinha: 6 s');
  q = ingest(q, { rolls: [roll(1, { kind: 'sheet' }), roll(2, { kind: 'dm' })], now: NOW }, 200);
  assert.equal(bigDuration(q), BIG_MS_BUSY, 'com fila: 4 s');
  q = nextBig(q, 1, 6000);
  assert.equal(bigDuration(q), BIG_MS, 'a do mestre sozinha: 8 s');
});

test('E2.1: depois do cartão a rolagem fica nas Últimas (5 mais novas), que somem 2 min depois da última', () => {
  let q = ingest(createQueue(), { rolls: [], now: NOW }, 0);
  q = ingest(q, { rolls: [roll(1, { kind: 'sheet' })], now: NOW }, 1000);
  assert.deepEqual(q.hist, [], 'escondida até o cartão terminar');
  q = nextBig(q, 1, 7000);
  assert.deepEqual(q.hist.map(r => r.id), [1]);
  assert.equal(q.histAt, 7000);
  for (let i = 2; i <= 7; i++) {
    q = ingest(q, { rolls: [roll(i, { kind: 'player' })], now: NOW }, 7000 + i * 1000);
    q = nextBig(q, i, 8000 + i * 1000);
  }
  assert.equal(q.hist.length, HIST_MAX);
  assert.deepEqual(q.hist.map(r => r.id), [3, 4, 5, 6, 7]);
  assert.equal(histNextExpiry(q, 20_000), q.histAt + HIST_MS - 20_000);
  assert.equal(pruneHist(q, q.histAt + HIST_MS - 1), q, 'antes dos 2 min: a mesma fila');
  const gone = pruneHist(q, q.histAt + HIST_MS);
  assert.deepEqual(gone.hist, []);
  assert.equal(histNextExpiry(gone, 0), null);
  // tocar no cartão (ou o tempo dele) com o id certo; outro id não mexe
  assert.equal(nextBig(q, 999), q);
});

test('E2.1: a linha das Últimas rolagens (nome, o quê e o resultado curto)', () => {
  assert.deepEqual(histParts(roll(1, { kind: 'sheet', label: 'Sabedoria', total: 17 }), 'pt'), { who: 'Dagna', what: 'Sabedoria', result: '17', mark: '' });
  assert.deepEqual(histParts({ id: 2, kind: 'dm', who: '', label: '', count: 2, diceType: 'd6', total: 7, crit: false }, 'en'),
    { who: 'GM', what: '2d6', result: '7', mark: '' });
  assert.deepEqual(histParts({ id: 3, kind: 'monster', who: 'Goblin #2', label: 'Dagna', total: 11, hit: true }, 'pt'),
    { who: 'Goblin #2', what: '⚔ Dagna', result: 'ACERTA', mark: '' });
  assert.equal(histParts({ id: 4, kind: 'monster', who: 'Goblin', label: 'Pipo', total: 20, hit: true, crit: true }, 'en').result, 'CRITICAL');
  assert.equal(histParts({ id: 5, kind: 'monster', who: 'Goblin', label: 'Pipo', total: 3, hit: false }, 'pt').result, 'ERRA');
  assert.deepEqual(histParts({ id: 6, kind: 'save', who: 'Dragão', label: 'Sopro', targets: [{ ok: true }, { ok: false }, { ok: true }] }, 'pt'),
    { who: 'Dragão', what: 'Sopro', result: '2 ✓ · 1 ✗', mark: '' });
  assert.equal(histParts(roll(7, { crit: true })).mark, 'crit');
  assert.equal(histParts(roll(8, { fail: true })).mark, 'fail');
  assert.deepEqual(histParts(null), { who: '', what: '', result: '', mark: '' });
});

test('ids vistos não crescem sem fim', () => {
  let q = ingest(createQueue(), { rolls: [], now: NOW });
  for (let i = 1; i <= 260; i++) q = ingest(q, { rolls: [roll(i, { kind: 'player', at: at(30) })], now: NOW }, i);
  assert.equal(q.hist.length, HIST_MAX, 'as velhas vão direto às Últimas, que guardam só 5');
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
  // a lista do mestre corta só o rótulo: o resultado vem à parte
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

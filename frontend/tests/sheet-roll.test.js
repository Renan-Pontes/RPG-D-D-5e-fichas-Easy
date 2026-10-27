// V15 · Rolagens da ficha na Tela: a montagem do que vai ao servidor (a partir do
// resultado que o rolador acabou de mostrar), o "🔒 Só eu" lembrado por personagem
// (rolagem secreta nunca sai do aparelho) e o envio que não insiste nem atrasa a ficha.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFormula, rollFormula } from '../src/dice/dice-math.js';
import {
  clearSheetRolls, createSender, getSheetRolls, GAP_MS, MAX_WAITING, maybeRecheck, noteFor, outcomeOf, planSheetRoll,
  readSecret, RECHECK_MS, RESP_GAP_MS, secretKey, setSheetAllowed, setSheetRecheck, setSheetRolls, setSheetSecret,
  sheetRollBody, STALE_MS, subscribeSheetRolls, writeSecret,
} from '../src/dice/sheet-roll.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
// O que o DiceRoller guarda de cada rolagem (rollParsed → present).
const entryOf = (formula, { label, adv = 'normal', preset } = {}) => {
  const parsed = parseFormula(formula);
  const r = rollFormula(parsed, { adv, preset });
  return {
    label: label || parsed.text, formula: parsed.text,
    groups: r.groups.map(g => ({ die: g.sides, sign: g.sign, rolls: g.rolls })),
    mod: r.mod, total: r.total, isCrit: r.isCrit, isFumble: r.isFumble, adv: r.adv,
  };
};

test('payload: Percepção 1d20+3 vira nome do teste, dados, modificador e total', () => {
  const body = sheetRollBody(entryOf('1d20+3', { label: '  Percepção ', preset: [15] }));
  assert.deepEqual(body, { label: 'Percepção', dice: [{ die: 'd20', value: 15 }], modifier: 3, total: 18 });
});

test('payload: vantagem leva os 2 d20 (o que não conta marcado) e o adv', () => {
  const body = sheetRollBody(entryOf('1d20+5', { label: 'Furtividade', adv: 'adv', preset: [4, 17] }));
  assert.deepEqual(body.dice, [{ die: 'd20', value: 4, kept: false }, { die: 'd20', value: 17 }]);
  assert.equal(body.adv, 'adv');
  assert.equal(body.total, 22);
  const dis = sheetRollBody(entryOf('1d20+5', { adv: 'dis', preset: [4, 17] }));
  assert.equal(dis.adv, 'dis');
  assert.equal(dis.total, 9);
});

test('payload: dano misto, dado subtraído e d100', () => {
  const body = sheetRollBody(entryOf('2d6+1d8-1d4+2', { label: 'Maça · dano', preset: [3, 5, 7, 2] }));
  assert.deepEqual(body.dice, [
    { die: 'd6', value: 3 }, { die: 'd6', value: 5 }, { die: 'd8', value: 7 }, { die: 'd4', value: 2, sign: -1 },
  ]);
  assert.equal(body.total, 3 + 5 + 7 - 2 + 2);
  assert.equal(body.adv, undefined);
  assert.deepEqual(sheetRollBody(entryOf('1d100', { preset: [57] })).dice, [{ die: 'd100', value: 57 }]);
});

test('payload: o que o servidor não aceitaria fica só no aparelho (null)', () => {
  assert.equal(sheetRollBody(entryOf('21d6')), null);                 // mais de 20 dados
  assert.ok(sheetRollBody(entryOf('20d6')));                           // 20 é o teto
  assert.equal(sheetRollBody(entryOf('1d20+51')), null);              // bônus acima de 50
  assert.equal(sheetRollBody({ ...entryOf('1d20+3', { preset: [10] }), total: 99 }), null);  // total que não fecha
  assert.equal(sheetRollBody({ label: 'x', groups: [{ die: 7, sign: 1, rolls: [{ value: 3 }] }], mod: 0, total: 3 }), null);
  assert.equal(sheetRollBody({ label: 'x', groups: [{ die: 20, sign: 1, rolls: [{ value: 21 }] }], mod: 0, total: 21 }), null);
  assert.equal(sheetRollBody(null), null);
  assert.equal(sheetRollBody(entryOf('1d20', { label: 'x'.repeat(300) })).label.length, 120);
});

test('só-eu: lembrado por personagem; com ele ligado nada é montado para enviar', () => {
  const store = memory();
  assert.equal(readSecret(7, store), false);
  writeSecret(7, true, store);
  assert.equal(store.getItem(secretKey(7)), '1');
  assert.equal(readSecret(7, store), true);
  assert.equal(readSecret(8, store), false);                          // outro personagem: o padrão (📺)
  writeSecret(7, false, store);
  assert.equal(store.getItem(secretKey(7)), null);
  const broken = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('x'); } };
  assert.equal(readSecret(7, broken), false);
  assert.doesNotThrow(() => writeSecret(7, true, broken));

  const entry = entryOf('1d20+3', { label: 'Percepção', preset: [12] });
  assert.deepEqual(planSheetRoll(null, entry), { skip: 'none' });
  assert.deepEqual(planSheetRoll({ characterId: 7, secret: true }, entry), { skip: 'secret' });
  assert.deepEqual(planSheetRoll({ characterId: 7, blocked: true }, entry), { skip: 'blocked' });
  assert.deepEqual(planSheetRoll({ characterId: 7 }, entryOf('21d6')), { skip: 'local' });
  assert.equal(planSheetRoll({ characterId: 7 }, entry).body.total, 15);
  assert.equal(planSheetRoll({ characterId: 7, allowed: null }, entry).body.total, 15);   // ainda não soube: manda
  assert.equal(planSheetRoll({ characterId: 7, allowed: true }, entry).body.total, 15);
});

test('regra desligada pelo mestre: nada sai do aparelho e a faixa pergunta de novo só de vez em quando', () => {
  const entry = entryOf('1d20+3', { label: 'Percepção', preset: [12] });
  assert.deepEqual(planSheetRoll({ characterId: 7, allowed: false }, entry), { skip: 'off' });
  assert.deepEqual(planSheetRoll({ characterId: 7, allowed: false, secret: true }, entry), { skip: 'secret' });

  const asked = [];
  setSheetRolls({ characterId: 7, name: 'Dagna' }, memory());
  setSheetRecheck((id) => asked.push(id));
  assert.equal(maybeRecheck(1_000), false);                           // ainda não sabe a regra: o POST descobre
  setSheetAllowed(7, false, 1_000);                                   // a faixa soube: desligada
  assert.equal(maybeRecheck(1_000 + RECHECK_MS - 1), false);          // no máximo 1 vez a cada 30 s
  assert.equal(maybeRecheck(1_000 + RECHECK_MS), true);
  assert.equal(maybeRecheck(1_000 + RECHECK_MS + 5), false);
  assert.deepEqual(asked, [7]);
  setSheetAllowed(7, true, 40_000);                                   // o mestre religou: volta a mandar
  assert.equal(planSheetRoll(getSheetRolls(), entry).body.total, 15);
  assert.equal(maybeRecheck(999_999), false);                         // ligada: nunca pergunta
  setSheetRecheck(null);
  setSheetAllowed(7, false, 0);
  assert.equal(maybeRecheck(999_999), false);                         // sem a faixa: nada
  clearSheetRolls(7);
});

test('a ficha aberta: o Sheet diz o personagem, o só-eu vem do aparelho e fechar limpa só se é ela', () => {
  const store = memory();
  writeSecret(3, true, store);
  const seen = [];
  const off = subscribeSheetRolls(c => seen.push(c ? `${c.characterId}:${c.secret ? 'secret' : 'shown'}` : null));
  setSheetRolls({ characterId: 3, name: 'Dagna' }, store);
  assert.equal(getSheetRolls().secret, true);
  setSheetSecret(false, store);
  assert.equal(store.getItem(secretKey(3)), null);
  setSheetAllowed(3, false);
  assert.equal(getSheetRolls().allowed, false);
  setSheetAllowed(9, true);                                            // outra ficha: nada muda
  assert.equal(getSheetRolls().allowed, false);
  clearSheetRolls(9);
  assert.equal(getSheetRolls().characterId, 3);
  clearSheetRolls(3);
  assert.equal(getSheetRolls(), null);
  off();
  assert.deepEqual(seen, ['3:secret', '3:shown', '3:shown', null]);
});

test('resposta → resultado e o aviso discreto', () => {
  assert.equal(outcomeOf({ shown: true, rollId: 4 }), 'shown');
  assert.equal(outcomeOf(null), 'skipped');                           // 204: fora da sessão ou desligado
  assert.equal(outcomeOf(null, { status: 429 }), 'failed');
  assert.equal(outcomeOf(null, new TypeError('Failed to fetch')), 'failed');
  assert.equal(outcomeOf(null, { name: 'TimeoutError' }), 'unknown');  // pode ter chegado: sem aviso
  assert.equal(noteFor('unknown'), null);
  assert.equal(outcomeOf(null, { status: 423 }), 'blocked');
  assert.equal(outcomeOf(null, { status: 403 }), 'blocked');
  assert.equal(noteFor('shown'), 'sheet-shown');
  assert.equal(noteFor('failed'), 'sheet-failed');
  assert.equal(noteFor('busy'), 'sheet-failed');
  assert.equal(noteFor('skipped'), null);
  assert.equal(noteFor('blocked'), null);
});

test('envio: espaçado de 1,2 s, sem insistir, fila curta e para de vez no 403/423', async () => {
  let clock = 1000;
  const waits = [];
  const posts = [];
  const replies = [{ shown: true }, null];
  const send = createSender({
    post: async (id, body) => { posts.push([id, body.label, clock]); const r = replies.shift(); if (r instanceof Error) throw r; return r; },
    now: () => clock, wait: async (ms) => { waits.push(ms); clock += ms; }, offline: () => false,
  });
  setSheetRolls({ characterId: 5, name: 'Pipo' }, memory());
  const [a, b] = await Promise.all([send(5, { label: 'Ataque' }), send(5, { label: 'Dano' })]);
  assert.deepEqual([a, b], ['shown', 'skipped']);
  assert.deepEqual(posts.map(p => p[1]), ['Ataque', 'Dano']);
  assert.equal(posts[1][2] - posts[0][2], GAP_MS);                    // o 2º espera a vez, não é perdido
  assert.equal(getSheetRolls().allowed, true);                        // 201: o mestre deixa

  // falhou a rede: um POST só, nada de tentar de novo
  posts.length = 0;
  replies.push(Object.assign(new TypeError('Failed to fetch')));
  clock += 5000;
  assert.equal(await send(5, { label: 'Iniciativa' }), 'failed');
  assert.equal(posts.length, 1);

  // campanha encerrada: daqui em diante a ficha não manda mais nada
  replies.push(Object.assign(new Error('closed'), { status: 423 }));
  clock += 5000;
  assert.equal(await send(5, { label: 'x' }), 'blocked');
  assert.equal(getSheetRolls().blocked, true);
  assert.deepEqual(planSheetRoll(getSheetRolls(), entryOf('1d20')), { skip: 'blocked' });
  clearSheetRolls(5);

  // sem rede no aparelho: nem tenta
  const none = [];
  const offline = createSender({ post: async () => { none.push(1); }, offline: () => true });
  assert.equal(await offline(5, { label: 'x' }), 'failed');
  assert.equal(none.length, 0);
});

test('envio: rajada maior que a fila → as de fora ficam só no aparelho ("busy")', async () => {
  const pending = [];
  const send = createSender({
    post: () => new Promise(r => pending.push(r)), now: () => 0, wait: async () => {}, offline: () => false,
  });
  const runs = Array.from({ length: MAX_WAITING + 2 }, (_, i) => send(1, { label: `r${i}` }));
  const extra = await Promise.all(runs.slice(MAX_WAITING));
  assert.deepEqual(extra, ['busy', 'busy']);
  // um de cada vez: o 2º só sai depois da resposta do 1º
  for (let i = 0; i < MAX_WAITING; i++) {
    await new Promise(r => setTimeout(r, 0));
    assert.equal(pending.length, 1);
    pending.shift()({ shown: true });
  }
  assert.deepEqual(await Promise.all(runs.slice(0, MAX_WAITING)), Array(MAX_WAITING).fill('shown'));
});

// Um servidor de mentira com o relógio dele: conta pela hora em que o pedido CHEGA.
function fakeNet({ up = () => 0, down = () => 50, perSecond = 1 } = {}) {
  const net = { clock: 0, arrivals: [], statuses: [] };
  net.now = () => net.clock;
  net.wait = async (ms) => { net.clock += ms; };
  net.post = async (id, body) => {
    const i = net.arrivals.length;
    net.clock += up(i);
    const at = net.clock;
    // o limite do servidor mais duro (1 em 1 s), para mostrar a folga que o envio garante
    const ok = !net.arrivals.length || at - net.arrivals[net.arrivals.length - 1] >= 1000 / perSecond;
    net.arrivals.push(at);
    net.clock += down(i);
    net.statuses.push(ok ? 201 : 429);
    if (!ok) throw Object.assign(new Error('rate_limited'), { status: 429 });
    return { shown: true, label: body.label };
  };
  return net;
}

test('envio: latência desigual (a 1ª chega 600 ms atrasada) — ataque e dano chegam com mais de 1 s entre eles', async () => {
  for (const delay of [250, 600, 1500]) {
    const net = fakeNet({ up: (i) => (i === 0 ? delay : 30) });
    const send = createSender({ post: net.post, now: net.now, wait: net.wait, offline: () => false });
    const [atk, dmg] = await Promise.all([send(1, { label: 'Ataque' }), send(1, { label: 'Dano' })]);
    assert.deepEqual([atk, dmg], ['shown', 'shown'], `atraso de ${delay} ms`);
    assert.ok(net.arrivals[1] - net.arrivals[0] >= 1000, `${net.arrivals}`);
  }
  // sem atraso nenhum continua 1,2 s entre as saídas (a resposta rápida não atrasa nada)
  const net = fakeNet({ up: () => 20, down: () => 20 });
  const sent = [];
  const send = createSender({ post: (id, b) => { sent.push(net.clock); return net.post(id, b); }, now: net.now, wait: net.wait, offline: () => false });
  await Promise.all([send(1, { label: 'a' }), send(1, { label: 'b' }), send(1, { label: 'c' })]);
  assert.deepEqual(sent.map((t, i) => (i ? t - sent[i - 1] : 0)), [0, GAP_MS, GAP_MS]);
  assert.ok(RESP_GAP_MS + 40 <= GAP_MS);
});

test('envio: servidor lento — o que esperou mais de 6 s na fila não vai (a Tela já passou dele)', async () => {
  const net = fakeNet({ up: () => 4000, down: () => 2500 });
  const send = createSender({ post: net.post, now: net.now, wait: net.wait, offline: () => false });
  const out = await Promise.all([send(1, { label: 'Ataque' }), send(1, { label: 'Dano' })]);
  assert.deepEqual(out, ['shown', 'failed']);
  assert.equal(net.arrivals.length, 1);                               // o 2º nem saiu
  assert.ok(STALE_MS < 4000 + 2500 + RESP_GAP_MS);
});

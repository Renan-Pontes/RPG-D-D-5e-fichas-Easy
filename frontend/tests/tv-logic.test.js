// Tela: subtítulo do recap sem repetição, detecção de link morto e o modo de desenho.
import test from 'node:test';
import assert from 'node:assert/strict';
import { recapSubtitle, isDeadScreenLink, tvMode } from '../src/screen/tv-logic.js';
import { stageNow } from '../src/stage/stage-now.js';

test('recapSubtitle esconde títulos que só repetem "Anteriormente em <campanha>"', () => {
  const name = 'E1 Brumas do Iniciante';
  assert.equal(recapSubtitle('Anteriormente em E1 Brumas do Iniciante…', name), '');
  assert.equal(recapSubtitle('Anteriormente em E1 Brumas do Iniciante', name), '');
  assert.equal(recapSubtitle('anteriormente em e1 brumas do iniciante...', name), '');
  assert.equal(recapSubtitle('Previously on E1 Brumas do Iniciante', name), '');
  assert.equal(recapSubtitle('E1 Brumas do Iniciante', name), '');
  assert.equal(recapSubtitle('Anteriormente…', name), '');
  assert.equal(recapSubtitle('', name), '');
  assert.equal(recapSubtitle(null, name), '');
});

test('recapSubtitle mantém títulos de verdade', () => {
  const name = 'Vale';
  assert.equal(recapSubtitle('Sessão 3 — A cripta do sino', name), 'Sessão 3 — A cripta do sino');
  assert.equal(recapSubtitle('Anteriormente em Vale: a cripta', name), 'Anteriormente em Vale: a cripta');
  assert.equal(recapSubtitle('Valente', name), 'Valente');
});

test('isDeadScreenLink: só 404/410', () => {
  assert.equal(isDeadScreenLink({ status: 404 }), true);
  assert.equal(isDeadScreenLink({ status: 410 }), true);
  assert.equal(isDeadScreenLink({ status: 500 }), false);
  assert.equal(isDeadScreenLink({ status: 502 }), false);
  assert.equal(isDeadScreenLink(null), false);
  assert.equal(isDeadScreenLink(new Error('x')), false);
});

test('tvMode: a frente decide o desenho; sem frente, o fundo', () => {
  const fight = { active: true, round: 1 };
  assert.equal(tvMode(stageNow({ stage: { front: { kind: 'image', imageUrl: 'x' } }, combat: fight })), 'image');
  assert.equal(tvMode(stageNow({ stage: { front: { kind: 'image' }, focus: false }, combat: fight })), 'combat');
  assert.equal(tvMode(stageNow({ stage: { bg: 'dark', front: { kind: 'card' } } })), 'dark');
  assert.equal(tvMode(stageNow({ stage: { bg: 'map' } })), 'map');
  assert.equal(tvMode(stageNow({ stage: { front: { kind: 'recap' } } })), 'recap');
  assert.equal(tvMode(null), 'rest');
});

// ------------------------------------------------------------------ V9: a TV em 16:9
import { tvLang, lengthClass, turnNow, initiativeRows, partyRow } from '../src/screen/tv-logic.js';
import { charLine, tvName } from '../src/player/player-model.js';
import { nameIds, tName } from '../data/i18n.js';

test('tvLang: a língua da campanha manda; sem ela, a do aparelho', () => {
  assert.equal(tvLang('pt', 'en'), 'pt');      // TV num navegador em inglês, campanha em pt
  assert.equal(tvLang('en', 'pt'), 'en');
  assert.equal(tvLang(null, 'en'), 'en');
  assert.equal(tvLang(undefined, 'pt'), 'pt');
  assert.equal(tvLang('fr', 'xx'), 'pt');
});

test('lengthClass: o texto longo encolhe em degraus', () => {
  const steps = [200, 500, 900];
  assert.equal(lengthClass('curto', steps), '');
  assert.equal(lengthClass('x'.repeat(201), steps), 'is-medium');
  assert.equal(lengthClass('x'.repeat(501), steps), 'is-long');
  assert.equal(lengthClass('x'.repeat(901), steps), 'is-xlong');
  assert.equal(lengthClass('x'.repeat(5000), [200, 500]), 'is-long');
  assert.equal(lengthClass(null, steps), '');
});

const FIGHT = {
  active: true, round: 2, turnIndex: 2,
  combatants: [
    { id: 'p', type: 'pc', name: 'Pipo', current_hp: 0, stats: { max_hp: 9 }, health: 'down' },
    { id: 'e', type: 'pc', name: 'Elarion', current_hp: 7, temp_hp: 2, stats: { max_hp: 7 }, health: 'unhurt' },
    { id: 'g2', type: 'monster', name: 'Goblin #2', health: 'unhurt', conditions: ['prone'] },
    { id: 'd', type: 'pc', name: 'Dagna', current_hp: 3, stats: { max_hp: 10 }, health: 'bloodied' },
    { id: 'g1', type: 'monster', name: 'Goblin #1', health: 'hurt' },
  ],
};

test('turnNow: a vez e a rodada (null fora de combate)', () => {
  assert.deepEqual(turnNow(FIGHT), { round: 2, id: 'g2', name: 'Goblin #2' });
  assert.equal(turnNow({ ...FIGHT, active: false }), null);
  assert.equal(turnNow(null), null);
});

test('initiativeRows: ✓ agiu, ▶ a vez; PJ com PV, monstro só com a faixa', () => {
  const { rows, more } = initiativeRows(FIGHT);
  assert.equal(more, 0);
  assert.deepEqual(rows.map(r => r.mark), ['✓', '✓', '▶', '', '']);
  assert.deepEqual(rows.map(r => r.state), ['acted', 'acted', 'now', 'todo', 'todo']);
  assert.equal(rows[0].down, true);
  assert.deepEqual(rows[1].hp, { cur: 7, max: 7, temp: 2 });
  assert.equal(rows[1].band, null);
  assert.equal(rows[2].hp, null);                 // monstro: nunca PV
  assert.equal(rows[2].band, 'unhurt');
  assert.deepEqual(rows[2].conditions, ['prone']);
  // o mestre tirou o "PV do grupo" da Tela: PJ vira faixa também
  const hidden = initiativeRows(FIGHT, { party: false }).rows;
  assert.equal(hidden[1].hp, null);
  assert.equal(hidden[1].band, 'unhurt');
  // sem a ordem na Tela: PJs primeiro, sem ✓/▶, quem age ainda destacado
  const plain = initiativeRows(FIGHT, { order: false }).rows;
  assert.deepEqual(plain.map(r => r.id), ['p', 'e', 'd', 'g2', 'g1']);
  assert.deepEqual(plain.map(r => r.mark), ['', '', '', '', '']);
  assert.deepEqual(plain.map(r => r.state), ['todo', 'todo', 'todo', 'now', 'todo']);
  // fora de combate ninguém agiu nem tem a vez
  assert.deepEqual(initiativeRows({ ...FIGHT, active: false }).rows.map(r => r.mark), ['', '', '', '', '']);
});

test('initiativeRows: até 10 + "+N", com a vez sempre à vista', () => {
  const many = { active: true, round: 1, turnIndex: 11,
    combatants: Array.from({ length: 13 }, (_, i) => ({ id: `c${i}`, type: 'monster', name: `M${i}`, health: 'unhurt' })) };
  const { rows, more } = initiativeRows(many);
  assert.equal(rows.length, 10);
  assert.equal(more, 3);
  assert.ok(rows.some(r => r.state === 'now' && r.id === 'c11'));
  assert.equal(rows[0].id, 'c3');                 // janela: termina no fim da lista
  const first = initiativeRows({ ...many, turnIndex: 0 });
  assert.equal(first.rows[0].id, 'c0');
  assert.equal(first.rows[0].mark, '▶');
  // sem a ordem: começa no topo (PJs) enquanto quem age couber nas 10 linhas
  assert.equal(initiativeRows({ ...many, turnIndex: 5 }, { order: false }).rows[0].id, 'c0');
  assert.equal(initiativeRows({ ...many, turnIndex: 11 }, { order: false }).rows[0].id, 'c2');
  const mid = initiativeRows({ ...many, turnIndex: 5 });
  assert.equal(mid.rows[0].id, 'c3');             // 2 de antes à vista
  assert.equal(mid.rows[2].mark, '▶');
});

test('partyRow: até 6 numa linha, sem o mestre', () => {
  const ms = Array.from({ length: 8 }, (_, i) => ({ id: i, role: 'player', character: { name: `P${i}` } }));
  const { shown, more } = partyRow([{ id: 'dm', role: 'dm', character: { name: 'X' } }, ...ms, { id: 'v', role: 'player', character: null }]);
  assert.equal(shown.length, 6);
  assert.equal(more, 2);
  assert.equal(shown[0].id, 0);
  assert.deepEqual(partyRow([]), { shown: [], more: 0 });
});

test('tabela leve de nomes da Tela = tName (rode node scripts/tv-names.mjs se falhar)', () => {
  for (const kind of ['race', 'class']) {
    for (const id of nameIds(kind)) {
      for (const lang of ['pt', 'en']) {
        assert.equal(tvName(kind, id, lang), tName(kind, id, lang), `${kind}:${id}:${lang} — rode node scripts/tv-names.mjs`);
      }
    }
  }
  assert.equal(charLine({ race: 'dragonborn', classes: [{ id: 'paladin', level: 3 }] }, 'en'), 'Dragonborn · Paladin 3');
  assert.equal(tvName('race', 'nao-existe', 'pt'), 'nao-existe');
});

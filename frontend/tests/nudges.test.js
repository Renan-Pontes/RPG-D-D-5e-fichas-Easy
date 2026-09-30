import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NUDGE_TYPES, nudgePrefs, stateWithNudgePref, concentrationDc, concentrationOf, stateWithConcentration,
  recentLog, damageEvents, partyStatus, buildNudges, pruneDismissed, visibleNudges,
} from '../src/campaigns/nudges.js';

const ALL_ON = Object.fromEntries(NUDGE_TYPES.map(t => [t.id, true]));

const member = (id, userId, name, data = {}) => ({
  id: 100 + id, role: 'player', user: { id: userId, displayName: `U${userId}` },
  character: { id, name, data: { currentHp: 20, maxHp: 20, conditions: [], ...data } },
});
const campaign = (members, state = {}) => ({ id: 1, state, members: [{ id: 1, role: 'dm', user: { id: 99 } }, ...members] });
const pc = (id, charId, name, hp = 20, extra = {}) => ({
  id, type: 'pc', character_id: charId, name, current_hp: hp, stats: { max_hp: 20, ac: 14 }, conditions: [], effects: [], ...extra,
});
const mon = (id, name, extra = {}) => ({
  id, type: 'monster', name, current_hp: 50, stats: { max_hp: 50, ac: 15, abilities: { con: 16 }, actions: [] }, conditions: [], effects: [], ...extra,
});
const combat = (combatants, log = [], extra = {}) => ({ active: true, round: 2, turnIndex: 0, combatants, log, ...extra });
const ids = (list) => list.map(n => n.id);
const byType = (list, type) => list.filter(n => n.type === type);

test('padrões: tudo ligado menos os barulhentos (PV baixo, sem espaços)', () => {
  const p = nudgePrefs({});
  assert.equal(p.concentration, true);
  assert.equal(p.zeroHp, true);
  assert.equal(p.legendary, true);
  assert.equal(p.lowHp, false);
  assert.equal(p.noSlots, false);
  const s = stateWithNudgePref({ scene: 'x' }, 'legendary', false);
  assert.equal(s.scene, 'x');
  assert.equal(nudgePrefs(s).legendary, false);
  assert.equal(nudgePrefs(stateWithNudgePref(s, 'lowHp', true)).lowHp, true);
  assert.deepEqual(stateWithNudgePref(s, 'inventado', true), s);
});

test('CD de concentração = max(10, metade do dano), teto 30', () => {
  assert.equal(concentrationDc(0), 10);
  assert.equal(concentrationDc(19), 10);
  assert.equal(concentrationDc(22), 11);
  assert.equal(concentrationDc(45), 22);
  assert.equal(concentrationDc(200), 30);
});

test('concentração: mestre marca no state; ficha também serve', () => {
  let st = stateWithConcentration({}, 'char:5', 'Bênção');
  assert.deepEqual(concentrationOf(st, { characterId: 5 }), { spell: 'Bênção', key: 'char:5', fromSheet: false });
  assert.equal(concentrationOf(st, { characterId: 6 }), null);
  assert.equal(concentrationOf({}, { characterId: 6, data: { concentration: { spell: 'Voo' } } }).spell, 'Voo');
  st = stateWithConcentration(st, 'char:5', '');
  assert.equal(concentrationOf(st, { characterId: 5 }), null);
});

test('janela recente = do turno anterior em diante', () => {
  const log = [{ type: 'damage', ts: 'a' }, { type: 'next_turn' }, { type: 'damage', ts: 'b' }, { type: 'next_turn' }, { type: 'damage', ts: 'c' }];
  assert.deepEqual(recentLog(log).filter(e => e.ts).map(e => e.ts), ['b', 'c']);
});

test('eventos de dano: manual, ataque (sofrido ou rolado), área, jogador', () => {
  const evs = damageEvents([
    { type: 'damage', ts: '1', target: 'A', amount: 7 },
    { type: 'damage', ts: '2', target: 'A', amount: 0 },
    { type: 'attack', ts: '3', target: 'B', hit: true, damage: { total: 9 }, damage_taken: 4 },
    { type: 'attack', ts: '4', target: 'B', hit: true, damage: { total: 5 }, extra_damage: [{ total: 3 }] },
    { type: 'attack', ts: '5', target: 'B', hit: false },
    { type: 'save_aoe', ts: '6', per_target: [{ target_name: 'A', damage_taken: 12 }, { target_name: 'B', damage_taken: 0 }] },
    { type: 'player_attack', ts: '7', target: 'C', damage_taken: 6, fallout_to: 'A', fallout_damage_taken: 2 },
  ]);
  assert.deepEqual(evs.map(e => [e.target, e.amount, e.approx]), [
    ['A', 7, false], ['B', 4, false], ['B', 8, true], ['A', 12, false], ['C', 6, false], ['A', 2, false],
  ]);
});

test('aviso de concentração ao sofrer dano: CD, pedir teste ao jogador, sem aplicar nada', () => {
  const camp = campaign([member(5, 50, 'Ana')], { concentration: { 'char:5': { spell: 'Bênção' } } });
  const cb = combat([pc('p1', 5, 'Ana', 10), mon('m1', 'Orc')], [
    { type: 'start' }, { type: 'attack', ts: 't1', attacker: 'Orc', target: 'Ana', hit: true, damage: { total: 24 }, damage_taken: 24 },
  ]);
  const list = buildNudges({ campaign: camp, combat: cb, prefs: ALL_ON });
  const [n] = byType(list, 'concentration');
  assert.equal(n.id, 'concentration:t1:Ana');
  assert.equal(n.severity, 'danger');
  assert.match(n.text, /CD 12/);
  const apply = n.actions.find(a => a.id === 'apply');
  assert.equal(apply.op.kind, 'check');
  assert.equal(apply.op.body.kind, 'save');
  assert.equal(apply.op.body.key, 'con');
  assert.equal(apply.op.body.dc, 12);
  assert.deepEqual(apply.op.body.targetUserIds, [50]);
  assert.equal(n.actions.find(a => a.id === 'lost').op.kind, 'clearConcentration');
});

test('monstro concentrando: mostra o bônus de CON e não pede teste a jogador', () => {
  const camp = campaign([], { concentration: { 'cb:m1': { spell: 'Imobilizar Pessoa' } } });
  const cb = combat([mon('m1', 'Mago', { stats: { max_hp: 40, saves: { con: 3 }, actions: [] } })], [
    { type: 'start' }, { type: 'damage', ts: 't', target: 'Mago', amount: 8 },
  ]);
  const [n] = byType(buildNudges({ campaign: camp, combat: cb, prefs: ALL_ON }), 'concentration');
  assert.match(n.text, /CON \+3/);
  assert.deepEqual(n.actions.map(a => a.id), ['lost']);
});

test('dano antigo (dois turnos atrás) não gera aviso', () => {
  const camp = campaign([member(5, 50, 'Ana')], { concentration: { 'char:5': { spell: 'Bênção' } } });
  const cb = combat([pc('p1', 5, 'Ana')], [
    { type: 'damage', ts: 'old', target: 'Ana', amount: 5 }, { type: 'next_turn' }, { type: 'next_turn' },
  ]);
  assert.equal(byType(buildNudges({ campaign: camp, combat: cb, prefs: ALL_ON }), 'concentration').length, 0);
});

test('quem concentra e cai a 0 PV: aviso de fim de concentração', () => {
  const camp = campaign([member(5, 50, 'Ana')], { concentration: { 'char:5': { spell: 'Bênção' } } });
  const cb = combat([pc('p1', 5, 'Ana', 0, { conditions: ['unconscious'] }), mon('m1', 'Orc')], [
    { type: 'start' }, { type: 'damage', ts: 't', target: 'Ana', amount: 30 },
  ]);
  const conc = byType(buildNudges({ campaign: camp, combat: cb, prefs: ALL_ON }), 'concentration');
  assert.deepEqual(ids(conc), ['concentration-down:char:5']);
});

test('PJ a 0 PV: inconsciente + testes; na vez dele, botão de rolar', () => {
  const camp = campaign([member(5, 50, 'Ana')]);
  const down = pc('p1', 5, 'Ana', 0, { death_saves: { success: 1, fail: 2 } });
  let list = byType(buildNudges({ campaign: camp, combat: combat([mon('m1', 'Orc'), down]), prefs: ALL_ON }), 'zeroHp');
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'zeroHp:5');
  assert.match(list[0].text, /✓1 ✗2/);
  // sem a condição: sugere marcar Inconsciente
  assert.deepEqual(list[0].actions.map(a => a.id), ['apply']);
  assert.equal(list[0].actions[0].op.body.condition, 'unconscious');
  list = byType(buildNudges({ campaign: camp, combat: combat([{ ...down, conditions: ['unconscious'] }, mon('m1', 'Orc')]), prefs: ALL_ON }), 'zeroHp');
  assert.equal(list[0].id, 'zeroHp:5:r2');
  assert.deepEqual(list[0].actions.map(a => a.op.body.action), ['death_save']);
});

test('PJ morto ou fora do combate', () => {
  const dead = campaign([member(5, 50, 'Ana', { currentHp: 0, conditions: ['dead'] })]);
  assert.equal(byType(buildNudges({ campaign: dead, combat: null, prefs: ALL_ON }), 'zeroHp').length, 0);
  const out = campaign([member(5, 50, 'Ana', { currentHp: 0 })]);
  const [n] = byType(buildNudges({ campaign: out, combat: null, prefs: ALL_ON }), 'zeroHp');
  assert.equal(n.actions.length, 0); // fora do combate: só informa
});

test('monstro a 0 PV não derrotado → sugere marcar', () => {
  const cb = combat([mon('m1', 'Orc', { current_hp: 0 }), mon('m2', 'Goblin', { current_hp: 0, defeated: true })]);
  const list = byType(buildNudges({ campaign: campaign([]), combat: cb, prefs: ALL_ON }), 'zeroHp');
  assert.deepEqual(ids(list), ['zeroHp:cb:m1']);
  assert.deepEqual(list[0].actions[0].op, { kind: 'updateCombatant', combatantId: 'm1', body: { defeated: true } });
});

test('recarga no turno do monstro: pronta, rolada ok, rolada falha', () => {
  const breath = { name: { pt: 'Sopro', en: 'Breath' }, recharge: 5 };
  const dragon = (charged) => mon('d', 'Dragão', { stats: { max_hp: 100, actions: [{ name: 'Mordida' }, breath] }, action_state: { 1: { charged } } });
  let [n] = byType(buildNudges({ campaign: campaign([]), combat: combat([dragon(true)], [{ type: 'next_turn' }]), prefs: ALL_ON }), 'recharge');
  assert.match(n.text, /Sopro está pronta \(Recarga 5–6\)/);
  assert.equal(n.id, 'recharge:d:1:r2');
  [n] = byType(buildNudges({ campaign: campaign([]), combat: combat([dragon(false)], [
    { type: 'next_turn' }, { type: 'recharge', target: 'Dragão', rolls: [{ index: 1, roll: 3, need: 5, recharged: false }] },
  ]), prefs: ALL_ON }), 'recharge');
  assert.match(n.text, /não recarregou \(d6 = 3/);
  assert.deepEqual(n.actions[0].op.body, { action: 'set_resources', targetId: 'd', actionIndex: 1, charged: true });
  [n] = byType(buildNudges({ campaign: campaign([]), combat: combat([dragon(true)], [
    { type: 'next_turn' }, { type: 'recharge', target: 'Dragão', rolls: [{ index: 1, roll: 6, need: 5, recharged: true }] },
  ]), prefs: ALL_ON }), 'recharge');
  assert.match(n.text, /recarregou \(d6 = 6\)/);
  assert.equal(n.actions.length, 0);
});

test('ações lendárias: só no turno de outra criatura e se sobrar alguma', () => {
  const boss = mon('d', 'Dragão', { legendary: { max: 3, remaining: 2 } });
  const cb = combat([pc('p1', 5, 'Ana'), boss], [], { turnIndex: 0 });
  const [n] = byType(buildNudges({ campaign: campaign([member(5, 50, 'Ana')]), combat: cb, prefs: ALL_ON }), 'legendary');
  assert.match(n.text, /2\/3 ações lendárias .* turno de Ana/);
  const own = combat([pc('p1', 5, 'Ana'), boss], [], { turnIndex: 1 });
  assert.equal(byType(buildNudges({ campaign: campaign([member(5, 50, 'Ana')]), combat: own, prefs: ALL_ON }), 'legendary').length, 0);
  const spent = combat([pc('p1', 5, 'Ana'), { ...boss, legendary: { max: 3, remaining: 0 } }]);
  assert.equal(byType(buildNudges({ campaign: campaign([member(5, 50, 'Ana')]), combat: spent, prefs: ALL_ON }), 'legendary').length, 0);
});

test('condição com duração: termina neste turno / terminou', () => {
  const orc = mon('m1', 'Orc', { conditions: ['frightened'], effects: [{ name: 'frightened', rounds_left: 1 }] });
  const list = byType(buildNudges({ campaign: campaign([]), combat: combat([orc], [
    { type: 'next_turn' }, { type: 'effects_expired', ts: 'x', target: 'Orc', expired: ['prone'] },
  ]), prefs: ALL_ON }), 'conditionEnd');
  assert.equal(list.length, 2);
  assert.match(list[0].text, /amedrontado termina/);
  assert.equal(list[1].actions[0].op.body.rounds, 1);
});

test('exaustão, PV baixo e sem espaços (com slotsMax injetado)', () => {
  const camp = campaign([
    member(5, 50, 'Ana', { rulesVersion: '2024', exhaustion: 2, currentHp: 4, maxHp: 20, spellSlotsUsed: [2, 0] }),
  ]);
  const list = buildNudges({ campaign: camp, combat: null, prefs: ALL_ON, slotsMax: () => [2] });
  assert.match(byType(list, 'exhaustion')[0].text, /−4 nos testes/);
  assert.equal(byType(list, 'lowHp').length, 1);
  assert.equal(byType(list, 'noSlots').length, 1);
  // Padrões: PV baixo e sem espaços desligados
  const def = buildNudges({ campaign: camp, combat: null, slotsMax: () => [2] });
  assert.deepEqual(def.map(n => n.type), ['exhaustion']);
});

test('ordem por gravidade e tipos desligados somem', () => {
  const camp = campaign([member(5, 50, 'Ana', { currentHp: 0, exhaustion: 1 })]);
  const list = buildNudges({ campaign: camp, combat: null, prefs: ALL_ON });
  assert.deepEqual(list.map(n => n.severity), ['danger', 'warn']);
  const off = buildNudges({ campaign: camp, combat: null, prefs: { ...ALL_ON, zeroHp: false } });
  assert.deepEqual(off.map(n => n.type), ['exhaustion']);
});

test('dispensar vale só para o evento: some e volta quando o evento é novo', () => {
  const a = [{ id: 'zeroHp:5' }, { id: 'lowHp:6' }];
  let dismissed = ['zeroHp:5'];
  assert.deepEqual(ids(visibleNudges(a, dismissed)), ['lowHp:6']);
  // Ana foi curada: o aviso sai da lista e o "dispensado" é esquecido…
  dismissed = pruneDismissed(dismissed, [{ id: 'lowHp:6' }]);
  assert.deepEqual(dismissed, []);
  // …então se cair de novo, avisa de novo.
  assert.deepEqual(ids(visibleNudges(a, dismissed)), ['zeroHp:5', 'lowHp:6']);
});

test('partyStatus prefere o estado do combate', () => {
  const camp = campaign([member(5, 50, 'Ana', { currentHp: 20 })]);
  const [p] = partyStatus(camp, combat([pc('p1', 5, 'Ana', 7, { temp_hp: 3, conditions: ['prone'] })]));
  assert.equal(p.hp, 7);
  assert.equal(p.tempHp, 3);
  assert.deepEqual(p.conditions, ['prone']);
  assert.equal(p.inCombat, true);
});

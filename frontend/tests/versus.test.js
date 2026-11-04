/* Monstro × grupo (src/group/versus.js): o Raio-X › Contra quem? e as ameaças do quadro,
 * com as fichas do seed jogo-e-combate e o bestiário do app. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BESTIARY } from '../data/bestiary.js';
import * as M from '../src/group/party-metrics.js';
import * as V from '../src/group/versus.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/party-jogo-e-combate.json', import.meta.url), 'utf8'));
const facts = M.partyFacts(M.partyMembers(fixture.members), 'pt');
const mon = (id) => BESTIARY.find(m => m.id === id);

test('Fantasma: resiste ao melhor dano do Elarion e cobra SAB CD 13 (Pipo 40%)', () => {
  const v = V.versus(mon('ghost'), facts, 'pt');
  const elarion = v.rows.find(r => r.name.startsWith('Elarion'));
  assert.equal(elarion.main.type, 'thunder');
  assert.equal(elarion.k, 0.5);
  assert.equal(elarion.alt.type, 'force', 'o melhor dele contra o Fantasma é energia');
  const wis = v.saves.find(s => s.ab === 'wis');
  assert.equal(wis.dc, 13);
  assert.deepEqual(wis.chances[0], { id: facts.find(f => f.name.startsWith('Pipo')).id, name: 'Pipo Mão-Leve', p: 40 });
  assert.ok(v.line.startsWith('resiste a trovejante (o melhor dano de Elarion) · cobra SAB CD 13: Pipo 40%'), v.line);
  assert.ok(v.line.includes('cobra SAB CD 13: Pipo 40%'), v.line);
  assert.ok(v.ctlBlocked && v.ctlBlocked.name.startsWith('Elarion'), 'imune às condições do controle do Elarion');
  assert.match(V.versus(mon('ghost'), facts, 'en').line, /^resists thunder \(Elarion's best damage\) · calls for WIS DC 13: Pipo 40%/);
});

test('Carniçal: nada que importe → sem linha "× grupo"', () => {
  const v = V.versus(mon('ghoul'), facts, 'pt');
  assert.deepEqual(v.saves.map(s => [s.ab, s.dc]), [['con', 10]]);
  assert.equal(v.line, '');
});

test('fator de dano: imune 0 · resiste 0,5 · vulnerável 2, também em texto importado', () => {
  const m = { damageImmunities: ['fire'], damageResistances: 'bludgeoning, piercing, and slashing from nonmagical attacks', damageVulnerabilities: [{ type: 'radiant' }] };
  assert.equal(V.damageFactor(m, 'fire'), 0);
  assert.equal(V.damageFactor(m, 'piercing'), 0.5);
  assert.equal(V.damageFactor(m, 'radiant'), 2);
  assert.equal(V.damageFactor(m, 'cold'), 1);
  const immune = V.versus({ name: 'Golem', damageImmunities: ['thunder', 'force'] }, facts, 'pt');
  assert.ok(immune.line.startsWith('imune a trovejante (o melhor dano de Elarion)'), immune.line);
});

test('ameaças do quadro: só ND perto do nível do grupo (±2) e quem perde mais dano antes', () => {
  const list = V.threatMonsters(BESTIARY, facts, 'pt', { limit: 20 });
  assert.ok(list.length > 0);
  for (const x of list) {
    const m = mon(x.id);
    assert.ok(m.crNum <= 3, `${x.id} ND ${m.cr}`);
  }
  assert.ok(!list.some(x => x.id === 'ghost'), 'Fantasma é ND 4: fora para um grupo de nível 1');
  assert.match(list[0].text, / (resiste a|é imune a) .+: o dano de \S+ /);
});

test('procurar monstro e achar os do plano', () => {
  assert.ok(V.searchMonsters(BESTIARY, 'fantas').some(m => m.id === 'ghost'));
  assert.ok(V.searchMonsters(BESTIARY, 'GHOST').some(m => m.id === 'ghost'));
  assert.deepEqual(V.searchMonsters(BESTIARY, '  '), []);
  const ids = V.planMonsters(BESTIARY, '2 goblins na ponte e um Esqueleto; talvez o fantasma').map(m => m.id);
  assert.ok(ids.includes('skeleton') && ids.includes('ghost'), ids.join(','));
  assert.deepEqual(V.planMonsters(BESTIARY, ''), []);
  // o plano do seed: "3 goblins afogados, 1 bugbear, o Dragão do Lago" — acha pela palavra do nome
  const seed = V.planMonsters(BESTIARY, '3 goblins afogados, 1 bugbear, o Dragão do Lago (se a mesa estiver forte)').map(m => m.id);
  assert.ok(seed.includes('goblin-warrior') || seed.some(id => id.startsWith('goblin')), seed.join(','));
  assert.ok(seed.some(id => id.startsWith('bugbear')), seed.join(','));
  assert.ok(seed.length <= 12);
});

test('Sombra (SRD 5.2.1): vulnerável a radiante — o dano da Dagna dobra (F2.3)', () => {
  const v = V.versus(mon('shadow'), facts, 'pt');
  const dagna = v.rows.find(r => r.name.startsWith('Dagna'));
  assert.equal(dagna.main.type, 'radiant');
  assert.equal(dagna.k, 2);
  assert.ok(v.known);
  assert.deepEqual(v.vulns.map(x => x.type), ['radiant']);
  assert.match(v.line, /^vulnerável a radiante: Dagna \(.+\) causa o dobro/);
  assert.match(V.versus(mon('shadow'), facts, 'en').line, /^vulnerable to radiant: Dagna \(.+\) deals double/);
});

test('Esqueleto: vulnerável a concussão; quem não causa fica dito (F2.3)', () => {
  const v = V.versus(mon('skeleton'), facts, 'pt');
  assert.equal(V.damageFactor(mon('skeleton'), 'bludgeoning'), 2);
  const who = facts.filter(f => f.dmgTypes.bludgeoning).map(f => M.firstName(f.name));
  if (who.length) assert.ok(v.line.startsWith(`vulnerável a concussão: ${who[0]}`), v.line);
  else assert.ok(v.line.startsWith('vulnerável a concussão (ninguém do grupo causa)'), v.line);
  assert.notEqual(v.line, '', 'não é mais "Nada que preocupe"');
});

test('as vulnerabilidades do SRD 5.2.1 estão no bestiário (fonte: Foundry dnd5e + 5e-database)', () => {
  const withV = BESTIARY.filter(m => m.source === 'SRD 5.2.1' && m.damageVulnerabilities?.length).map(m => m.id).sort();
  assert.deepEqual(withV, ['awakened-shrub', 'awakened-tree', 'dust-mephit', 'earth-elemental', 'ice-mephit', 'magma-mephit',
    'minotaur-skeleton', 'mummy', 'mummy-lord', 'salamander', 'shadow', 'skeleton', 'treant', 'warhorse-skeleton']);
  assert.deepEqual(mon('mummy').damageVulnerabilities, ['fire']);
});

test('monstro sem defesas conhecidas: não afirma "normal" (F2.3)', () => {
  const legacy = { id: 'velho', name: 'Velho', cr: '1', actions: [] };
  assert.equal(V.defensesKnown(legacy), false);
  assert.equal(V.defensesKnown({ ...legacy, damageResistances: [] }), true, 'meus monstros trazem os campos');
  assert.equal(V.defensesKnown(mon('goblin-warrior') || mon('goblin')), true);
  assert.equal(V.versus(legacy, facts, 'pt').known, false);
});

test('dificuldade do monstro contra o grupo: a conta do montador de combate (F2.3)', () => {
  // 4 personagens de nível 1: Baixa 200, Moderada 300, Alta 400 (SRD 5.2.1)
  const d = V.versusDifficulty(mon('shadow'), facts);
  assert.equal(d.xp, 100);
  assert.equal(d.one, 'low');
  assert.deepEqual(d.steps, [{ rating: 'moderate', n: 3 }, { rating: 'high', n: 4 }]);
  assert.equal(V.difficultyText(d, 'Sombra', 'pt'), '1 Sombra: Baixa · 3: Moderada · 4: Alta');
  assert.equal(V.difficultyText(d, 'Shadow', 'en'), '1 Shadow: Low · 3: Moderate · 4: High');
  const ghost = V.versusDifficulty(mon('ghost'), facts);   // ND 4, 1100 XP: acima de Alta sozinho
  assert.equal(ghost.one, 'extreme');
  assert.deepEqual(ghost.steps, []);
  assert.equal(V.versusDifficulty({ name: 'x' }, facts), null);
});

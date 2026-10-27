/* Raio-X do grupo (src/group/party-metrics.js) com as fichas do seed jogo-e-combate
 * (tests/fixtures/party-jogo-e-combate.json: GET da campanha como mestre) e fichas
 * sintéticas de 2014, multiclasse e níveis altos. Números da especificação §6.3 e V1. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Utils from '../utils.js';
import { withClassLevel } from '../src/progression/multiclass.js';
import * as M from '../src/group/party-metrics.js';
import { buildSpellTags } from '../../scripts/build-spell-tags.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/party-jogo-e-combate.json', import.meta.url), 'utf8'));
const party = M.partyMembers(fixture.members);
const facts = M.partyFacts(party, 'pt');
const byName = (n) => facts.find(f => f.name.startsWith(n));
const near = (got, want, tol, msg) => assert.ok(Math.abs(got - want) <= tol, `${msg}: ${got} ≠ ${want}`);

test('G1: média e melhor do grupo nos 11 eixos (w = 0,5, "melhor")', () => {
  const { axes } = M.partyAxes(facts);
  const avg = [3.4, 2.9, 3.5, 2.5, 2.8, 2.9, 2.5, 3.1, 2.3, 2.7, 2.8];
  const best = [4.2, 4.2, 5, 5, 3.9, 4.2, 4.6, 3.6, 3.2, 3.6, 4.2];
  const who = ['Elarion', 'Kaelor', 'Dagna/Elarion', 'Dagna', 'Elarion', 'Kaelor', 'Elarion', 'Elarion', 'Pipo', 'Dagna', 'Pipo'];
  M.AXES.forEach((k, i) => {
    near(axes[k].avg, avg[i], 0.2, `média de ${k}`);
    near(axes[k].best, best[i], 0.2, `melhor de ${k}`);
    assert.equal(axes[k].bestWho.map(M.firstName).join('/'), who[i], `quem é o melhor em ${k}`);
    assert.equal(axes[k].shown, axes[k].best);
  });
});

test('G1: "2 melhores" mostra a média do melhor e do 2º; Tabela × Ficha', () => {
  const top2 = M.partyAxes(facts, { rep: 'top2' }).axes;
  assert.equal(top2.control.shown, M.r1((top2.control.best + top2.control.second) / 2));
  assert.equal(top2.magic.shown, 5, 'Dagna e Elarion empatam em 5');
  const pipo = byName('Pipo');
  const onlyTable = M.axisScores(pipo, { w: 1 });
  const onlySheet = M.axisScores(pipo, { w: 0 });
  for (const k of M.AXES) {
    assert.equal(onlyTable[k].final, onlyTable[k].base, `w = 1 → só a tabela (${k})`);
    assert.equal(onlySheet[k].final, M.r1(M.clamp(1, 5, onlySheet[k].sheet)), `w = 0 → só a ficha (${k})`);
  }
  // tabela de classes editada pelo mestre (só a linha do ladino muda)
  const edited = M.axisScores(pipo, { w: 1, base: { rogue: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 5] } });
  assert.equal(edited.dmg.final, 1);
  assert.equal(edited.explore.final, 5);
  assert.equal(M.baseTable({ rogue: [1, 2] }).rogue, M.IVAN_BASE.rogue, 'linha inválida não troca a tabela');
});

test('G1: "Por quê" de Dano — base → ficha → final e os motivos', () => {
  const why = M.whyAxis(byName('Elarion'), 'dmg');
  assert.deepEqual([why.base, why.sheet, why.final], [5, 3.3, 4.2]);
  assert.ok(why.chips.includes('Onda Trovejante'), why.chips.join(' | '));
  const pipo = M.whyAxis(byName('Pipo'), 'dmg');
  assert.ok(pipo.chips.some(c => /Ataque Furtivo 1d6/.test(c)), pipo.chips.join(' | '));
  assert.ok(M.whyAxis(byName('Dagna'), 'heal').chips.includes('Curar Ferimentos'));
  assert.ok(M.whyAxis(byName('Kaelor'), 'mit').chips[0].startsWith('CA 18'));
});

test('G2: perícias do grupo — passiva do melhor, chance dele e de pelo menos 1 do grupo', () => {
  const skills = Object.fromEntries(M.partySkills(facts, 15).map(s => [s.skill, s]));
  const soh = skills.sleightOfHand;
  assert.deepEqual([soh.passive, soh.who.map(M.firstName), soh.chanceBest, soh.chanceGroup], [17, ['Pipo'], 65, 88]);
  const dec = skills.deception;
  assert.deepEqual([dec.passive, dec.who.map(M.firstName), dec.chanceBest], [12, ['Kaelor'], 40]);
  assert.equal(skills.stealth.ability, 'dex');
  assert.equal(M.chance(7, 15), 0.65);
  const bonuses = facts.map(f => f.skills.stealth);
  assert.equal(M.groupChance(bonuses, 15), 1 - bonuses.reduce((p, b) => p * (1 - M.chance(b, 15)), 1));
  // CD de referência do Ajustar
  assert.equal(M.partySkills(facts, 12).find(s => s.skill === 'deception').chanceBest, 55);
});

test('G3: tipos de dano — ninguém causa ácido, elétrico, necrótico, veneno e psíquico', () => {
  const dmg = M.partyDamage(facts);
  assert.deepEqual(Object.keys(dmg).filter(k => !dmg[k].length), ['acid', 'lightning', 'necrotic', 'poison', 'psychic']);
  assert.deepEqual(dmg.radiant.map(x => M.firstName(x.name)), ['Dagna']);
  assert.ok(dmg.fire.find(x => x.name.startsWith('Kaelor')).via.includes('Sopro'), 'sopro do draconato de ouro');
  assert.equal(dmg.bludgeoning.length, 4, 'desarmado: todo mundo');
});

test('G4: escolas — magias que têm e a lista da classe (referência do Ivan)', () => {
  const have = M.partySchools(facts);
  assert.deepEqual(have.necromancy.map(x => M.firstName(x.name)), ['Dagna']);
  assert.ok(have.evocation.find(x => x.name.startsWith('Elarion')).n >= 4);
  const list = M.classSchools(party);
  const wizard = (s) => list[s].find(x => x.name.startsWith('Elarion')).n;
  assert.ok(wizard('transmutation') > wizard('divination'), 'mago: lista redonda, Transmutação no topo');
  assert.equal(list.evocation.some(x => x.name.startsWith('Pipo')), false, 'ladino não conjura');
});

test('G6: tabela — CA, PV, Armadura Arcana, proficiência e passiva', () => {
  const e = byName('Elarion');
  assert.deepEqual([e.ac, e.acMage, e.maxHp, e.prof, e.passive.perception], [11, 14, 7, 2, 14]);
  const k = byName('Kaelor');
  assert.deepEqual([k.ac, k.maxHp, k.saves.cha], [18, 11, 4]);
});

test('base da tabela do Ivan: o grupo dele (só as classes primárias)', () => {
  const base = M.baseAverage(['monk', 'barbarian', 'warlock', 'druid', 'ranger', 'barbarian']);
  assert.deepEqual(base, [3.8, 3, 2.5, 2.3, 2.8, 3.8, 2.2, 2.7, 3.5, 2.5, 4]);
});

// --- fichas sintéticas -------------------------------------------------------
const make = (rv, className, level, extra = {}) => ({
  ...Utils.makeNew(), rulesVersion: rv, race: 'human', className, level, name: `${className} ${level}`,
  abilities: { str: 13, dex: 14, con: 14, int: 13, wis: 16, cha: 10 }, maxHp: 8 * level, ...extra,
});
const up = (c, id, n = 1) => { for (let i = 0; i < n; i++) c = withClassLevel(c, id); return c; };

test('Druida 4 / Guerreiro 1 (2014): a base pesa por nível — Dano 3,2, Controle 4,6', () => {
  const c = up(make('2014', 'druid', 4, {
    spells: [{ id: 'cureWounds', prepared: true }, { id: 'entangle', prepared: true }, { id: 'thunderwave', prepared: true }, { id: 'produceFlame', prepared: true }],
    weapons: [{ id: 'scimitar', name: 'Cimitarra' }], armor: 'hide', hasShield: true,
  }), 'fighter');
  const f = M.sheetFacts(c, 'pt');
  assert.deepEqual(f.classes.map(e => [e.id, e.level]), [['druid', 4], ['fighter', 1]]);
  const s = M.axisScores(f);
  assert.equal(s.dmg.base, 3.2);
  assert.equal(s.control.base, 4.6);
  assert.ok(f.healDay > 0 && f.control > 0, 'cura e controle do druida contam');
  for (const k of M.AXES) assert.ok(s[k].final >= 1 && s[k].final <= 5, k);
});

test('Clérigo 1 / Mago 3: as magias de Mago usam INT na CD e no ataque', () => {
  const c = up(make('2024', 'cleric', 1, {
    abilities: { str: 10, dex: 14, con: 12, int: 16, wis: 12, cha: 8 },
    spells: [{ id: 'sacredFlame', prepared: true }, { id: 'fireBolt', prepared: true }, { id: 'magicMissile', prepared: true }],
  }), 'wizard', 3);
  assert.equal(Utils.spellcastingAbility(c), 'wis', 'a ficha usa a 1ª classe conjuradora');
  assert.equal(M.spellAbilityFor(c, 'fireBolt'), 'int');
  assert.equal(M.spellAbilityFor(c, 'sacredFlame'), 'wis');
  assert.equal(M.spellAttackFor(c, 'fireBolt'), 2 + 3);
  assert.equal(M.spellDcFor(c, 'sacredFlame'), 8 + 2 + 1);
  const f = M.sheetFacts(c, 'pt');
  const bolt = f.spellDmg.find(s => s.id === 'fireBolt');
  // Raio de Fogo 1d10 com ataque +5 contra CA 14 (nível 4): 5,5 × 0,6
  near(bolt.exp, 5.5 * M.pHit(5, M.monsterAc(4)), 0.05, 'Raio de Fogo usa INT');
});

test('talento com atributo escolhido: a magia usa o atributo do talento', () => {
  const dagna = fixture.members[0].character.data;
  assert.equal(M.spellAbilityFor(dagna, 'healingWord', 'feat'), 'wis');
  const odd = { ...dagna, feats: [{ id: 'magicInitiate', picks: { spellAbility: 'cha', spell: ['healingWord'] } }] };
  assert.equal(M.spellAbilityFor(odd, 'healingWord', 'feat'), 'cha');
  assert.equal(M.spellAbilityFor({ ...dagna, feats: [] }, 'x', 'species'), 'wis', 'espécie: o maior de INT/SAB/CAR');
  // Tocado pelas Fadas: o atributo que o talento aumentou (choices.spellAbility = 'asi')
  const fey = make('2024', 'fighter', 4, { abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 13, cha: 14 },
    feats: [{ id: 'feyTouched', asi: { wis: 1 }, picks: { spell: ['bless'] } }] });
  assert.equal(M.spellAbilityFor(fey, 'mistyStep', 'feat'), 'wis', 'CAR 14 > SAB 13, mas o talento aumentou SAB');
});

test('espécie: a magia usa o atributo da espécie (fixo em 2014, escolhido em 2024)', () => {
  // Alto Elfo 2014: o truque da espécie é de INT, mesmo com CAR maior
  const elf = make('2014', 'rogue', 1, { race: 'elf-high', speciesChoices: { cantrip: 'fireBolt' },
    abilities: { str: 10, dex: 16, con: 12, int: 10, wis: 12, cha: 14 } });
  assert.equal(Utils.speciesGrants(elf).spellAbility, 'int');
  assert.equal(M.spellAbilityFor(elf, 'fireBolt', 'species'), 'int');
  // Tiferino 2024 com CAR escolhido: SAB 15 > CAR 12 não importa
  const tief = make('2024', 'fighter', 3, { race: 'tiefling', speciesChoices: { lineage: 'infernal', spellAbility: 'cha' },
    abilities: { str: 15, dex: 12, con: 14, int: 10, wis: 15, cha: 12 } });
  for (const id of ['fireBolt', 'thaumaturgy', 'hellishRebuke']) {
    assert.equal(M.spellAbilityFor(tief, id, 'species'), 'cha', id);
    assert.equal(M.spellDcFor(tief, id, 'species'), 8 + 2 + 1, `CD de ${id}`);
    assert.equal(M.spellAttackFor(tief, id, 'species'), 2 + 1, `ataque de ${id}`);
  }
});

test('alcance "Pessoal" com área longa (Relâmpago, Cone de Frio) é à distância nas duas regras', () => {
  // o catálogo 2024 diz só "Self" (o 2014, "Self (100-ft line)"): o tamanho vem de `reach`
  assert.equal(M.spellTags('lightningBolt', '2024').reach, 100);
  assert.equal(M.spellTags('coneOfCold', '2024').reach, 60);
  assert.equal(M.spellTags('burningHands', '2024').reach, 15);
  assert.equal(M.spellTags('thunderwave', '2024').reach, 15);
  const facts = {};
  for (const rv of ['2014', '2024']) {
    const mage = make(rv, 'wizard', 5, { abilities: { str: 8, dex: 14, con: 14, int: 16, wis: 12, cha: 10 },
      spells: ['fireBolt', 'lightningBolt', 'magicMissile', 'burningHands', 'produceFlame'].map(id => ({ id, prepared: true })) });
    const f = facts[rv] = M.sheetFacts(mage, 'pt');
    const row = (id) => f.spellDmg.find(s => s.id === id);
    assert.deepEqual([row('lightningBolt').ranged, row('lightningBolt').melee], [true, false], `${rv}: Relâmpago`);
    assert.deepEqual([row('burningHands').ranged, row('burningHands').melee], [false, true], `${rv}: Mãos Flamejantes`);
    assert.equal(row('produceFlame').ranged, true, `${rv}: Produzir Chama é arremessada`);
  }
  assert.equal(facts['2024'].rangedDpr, facts['2014'].rangedDpr, 'a mesma Distância nas duas regras');
  assert.equal(facts['2024'].meleeDpr, facts['2014'].meleeDpr, 'o mesmo Corpo a corpo nas duas regras');
});

test('Monge 6 sem armadura soma +15 de deslocamento na Mobilidade', () => {
  const monk = make('2024', 'monk', 6, { abilities: { str: 10, dex: 16, con: 14, int: 10, wis: 15, cha: 8 } });
  const f = M.sheetFacts(monk, 'pt');
  assert.equal(f.speed, 45);
  assert.ok(f.why.mobility[0].includes('45'), f.why.mobility.join(' | '));
  assert.ok(f.cunning, 'Passo do Vento (monge 2+)');
  const armored = M.sheetFacts({ ...monk, armor: 'leather' }, 'pt');
  assert.equal(armored.speed, 30);
  assert.ok(M.sheetScores(f).mobility > M.sheetScores(armored).mobility);
});

test('níveis 5 e 11 e Destruição Divina não quebram as contas', () => {
  const pipo = fixture.members[3].character.data;
  for (const level of [5, 11]) {
    const f = M.sheetFacts({ ...pipo, level, maxHp: 7 * level }, 'pt');
    assert.ok(f.riders.some(r => r.includes(`${Math.ceil(level / 2)}d6`)), f.riders.join(','));
    for (const v of Object.values(M.axisScores(f))) assert.ok(v.final >= 1 && v.final <= 5);
  }
  const kaelor = fixture.members[2].character.data;
  const k5 = M.sheetFacts({ ...kaelor, level: 5, maxHp: 44, spells: [...kaelor.spells, { id: 'divineSmite', prepared: true }] }, 'pt');
  assert.ok(k5.riders.includes('Destruição Divina'));
  assert.ok(k5.dmgTypes.radiant, 'Destruição Divina é radiante');
});

test('cores: uma por personagem, pela posição na mesa — tirar alguém não repinta os outros', () => {
  assert.deepEqual(party.map(p => p.color), M.CHAR_COLORS.slice(0, 4));
  assert.ok(!party.some(p => p.color === M.AVG_COLOR || p.color === M.BEST_COLOR), 'até 4: nunca as cores da média e do melhor');
  const ids = party.map(p => p.id);
  assert.deepEqual(M.includedIds(party, null), ids);
  assert.deepEqual(M.includedIds(party, [ids[0], ids[2], 999]), [ids[0], ids[2]]);
  const without = party.filter(p => M.includedIds(party, [ids[0], ids[2], ids[3]]).includes(p.id));
  assert.deepEqual(without.map(p => p.color), [party[0].color, party[2].color, party[3].color]);
  // Quem entra grava quem sai: uma ficha nova (ou trocada) entra sozinha
  assert.deepEqual(M.includedIds(party, null, [ids[1]]), [ids[0], ids[2], ids[3]]);
  const swapped = [...party.slice(0, 3), { ...party[3], id: 555 }];
  assert.deepEqual(M.includedIds(swapped, null, [ids[1]]), [ids[0], ids[2], 555], 'a ficha nova do Davi entra');
  assert.deepEqual(M.includedIds(party, [ids[0], ids[1]], [ids[1]]), [ids[0]], 'a lista antiga ainda filtra');
  assert.equal(M.partyMembers([{ role: 'dm', character: { id: 9, data: {} } }, { role: 'player', character: null }]).length, 0);
});

test('números em pt e en', () => {
  assert.equal(M.fmt(4.6, 'pt'), '4,6');
  assert.equal(M.fmt(4.6, 'en'), '4.6');
  assert.equal(M.fmt(5, 'pt'), '5');
  assert.equal(M.axisLabel('melee', 'en'), 'Melee');
  assert.equal(M.skillLabel('sleightOfHand', 'pt'), 'Prestidigitação');
  assert.equal(M.partyFacts(party, 'en')[0].why.dmg.length > 0, true);
});

test('Explosão Feiticeira dá dano e tipos; Marca do Caçador 2014 não é utilidade', () => {
  const sorc = make('2024', 'sorcerer', 1, { abilities: { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 16 },
    spells: [{ id: 'sorcerousBurst' }, { id: 'mageHand' }], weapons: [{ id: 'dagger', name: 'Adaga' }] });
  const f = M.sheetFacts(sorc, 'pt');
  assert.deepEqual(f.why.dmg, ['Explosão Feiticeira'], 'a magia vence a adaga');
  for (const k of ['acid', 'cold', 'fire', 'lightning', 'poison', 'psychic', 'thunder']) assert.ok(f.dmgTypes[k], k);
  assert.deepEqual(f.why.utility, ['Mão Mágica']);
  const ranger = make('2014', 'ranger', 2, { spells: [{ id: 'huntersMark', prepared: true }], weapons: [{ id: 'longbow', name: 'Arco' }] });
  const g = M.sheetFacts(ranger, 'pt');
  assert.ok(g.riders.includes('Marca do Caçador'));
  assert.equal(g.why.utility.includes('Marca do Caçador'), false);
});

test('data/spell-tags.json está atualizado com o gerador (scripts/build-spell-tags.mjs)', () => {
  const file = JSON.parse(readFileSync(new URL('../data/spell-tags.json', import.meta.url), 'utf8'));
  assert.deepEqual(file, buildSpellTags());
  const size = readFileSync(new URL('../data/spell-tags.json', import.meta.url)).length;
  assert.ok(size < 25_000, `${size} bytes`);
  // revisão à mão: cura que o texto não diz, falso controle, dano junto da arma, 2014 × 2024
  assert.equal(M.spellTags('heal', '2024').heal, 70);
  assert.equal(M.spellTags('alarm', '2024').ctl, undefined);
  assert.equal(M.spellTags('huntersMark', '2024').rider, 1);
  assert.deepEqual(M.spellTags('huntersMark', '2014'), { rider: 1 }, '2014: dano do tipo da arma, não é utilidade');
  assert.deepEqual(M.spellTags('sorcerousBurst', '2024').dmg, ['acid', 'cold', 'fire', 'lightning', 'poison', 'psychic', 'thunder'], '"of a type you choose:"');
  assert.deepEqual(M.spellTags('iceKnife', '2014').dmg, ['cold', 'piercing'], 'a explosão de frio do resumo 2014');
  assert.deepEqual(M.spellTags('boomingBlade', '2024'), { dmg: ['thunder'], rider: 1 });
  for (const id of ['frostbite', 'mindSliver', 'primalSavagery', 'wordOfRadiance', 'createBonfire', 'lightningLure', 'thunderclap', 'magicStone', 'chaosBolt', 'catapult']) {
    assert.ok(M.spellTags(id, '2024').dmg?.length && M.spellTags(id, '2024').avg > 0, `${id}: texto curto, revisão à mão`);
  }
  assert.equal(M.spellTags('cureWounds', '2024').heal, 9);
  assert.equal(M.spellTags('cureWounds', '2014').heal, 4.5);
  assert.equal(M.spellTags('fireball', '2014').half, 1);
});

test('Ajustar no aparelho: o merge local é o do servidor e os patches pendentes se juntam', async () => {
  const I = await import('../src/group/insights-api.js');
  const cur = I.withDefaults({ dc: 12, base: { wizard: [5, 2, 5, 1, 5, 1, 5, 4, 2, 1, 2] }, include: [1, 2], hidden: 'x' });
  assert.deepEqual(cur.hidden, [], 'valor torto volta ao padrão');
  const next = I.mergeInsights(cur, { base: { cleric: [2, 2, 5, 5, 2, 1, 4, 3, 1, 4, 1], wizard: null }, w: null, rep: 'top2', include: null });
  assert.deepEqual(Object.keys(next.base), ['cleric'], 'nos mapas, null apaga só o item');
  assert.deepEqual([next.w, next.rep, next.dc, next.include], [0.5, 'top2', 12, null]);
  assert.deepEqual(I.mergeInsights(next, I.RESET_PATCH).base, {});
  // dois toques antes do PUT: um patch só, os mapas juntos item por item
  assert.deepEqual(I.joinPatches({ focus: { social: 2 }, dc: 10 }, { focus: { explore: 2 }, dc: 12 }), { focus: { social: 2, explore: 2 }, dc: 12 });
  assert.equal(I.SAVE_DELAY, 800);
  // "Restaurar padrão" e, antes do PUT, Importante em Dano: o reset do mapa não se perde
  const server = I.withDefaults({ focus: { social: 2 }, base: { wizard: [5, 2, 5, 1, 5, 1, 5, 4, 2, 1, 2] } });
  const reset = I.expandResets(I.RESET_PATCH, server);
  assert.deepEqual([reset.focus, reset.base, reset.w], [{ social: null }, { wizard: null }, null]);
  const joined = I.joinPatches(reset, I.expandResets({ focus: { dmg: 2 } }, I.mergeInsights(server, reset)));
  assert.deepEqual(joined.focus, { social: null, dmg: 2 });
  assert.deepEqual(I.mergeInsights(server, joined).focus, { dmg: 2 }, 'o servidor fica só com Dano');
  assert.deepEqual(I.mergeInsights(server, joined).base, {});
  // "Restaurar a do Ivan" (base: null) e logo um ± na tabela de classes
  const ivan = I.joinPatches(I.expandResets({ base: null }, server), { base: { cleric: [2, 2, 5, 5, 2, 1, 4, 3, 1, 4, 1] } });
  assert.deepEqual(Object.keys(I.mergeInsights(server, ivan).base), ['cleric']);
  assert.deepEqual(I.expandResets({ dismissed: null }, I.withDefaults({})).dismissed, {}, 'mapa vazio: nada a apagar');
});

import { applyStartingEquipment } from '../src/creator/equipment-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import {
  applyBackground, backgroundIssues, toggleBackgroundTool, skillOverlap, fitsClass, findBackground,
  originEntry, originFeatApplies, originFeatIssues, originFeatConflict, originFeatRepeats, backgroundToolIds,
  withOriginFeat, ORIGIN_FEAT_LINE, ownedToolsOutsideBackground, backgroundToolRepeats, recommendedSpellAbility,
} from '../src/creator/background-helpers.js';
import { expertiseGroups, expertiseOptions, toggleGroupPick } from '../src/creator/class-helpers.js';
import { newCharacter } from '../src/creator/creation.js';
import { FEATS } from '../data/feats.js';

const mk = (rules, extra = {}) => ({ ...newCharacter(rules), className: 'wizard', skillProfs: ['arcana', 'investigation'], ...extra });
const pick = (char, id) => ({ ...char, ...applyBackground(char, id) });

test('2024: escolher antecedente aplica perícias, ferramenta, talento e limpa o bônus', () => {
  let c = mk('2024', { raceBonus: { int: 2, wis: 1 } });
  c = pick(c, 'sage');
  assert.equal(c.background, 'sage');
  assert.deepEqual(c.raceBonus, {});
  assert.ok(c.skillProfs.includes('history'));
  assert.ok(c.toolProfs.includes('calligraphersSupplies'));
  assert.equal(originEntry(c)?.id, 'magicInitiate');
  assert.equal(originEntry(c).picks.spellList, 'wizard');
  // Arcanismo já era da classe: aparece como sobreposição e não é "acrescentada".
  assert.deepEqual(skillOverlap(c), ['arcana']);
  assert.deepEqual(c.creation.bgSkillsAdded, ['history']);
});

test('2024: clicar de novo no mesmo antecedente não apaga a distribuição de +2/+1', () => {
  let c = pick(mk('2024'), 'sage');
  c = { ...c, raceBonus: { int: 2, con: 1 } };
  assert.deepEqual(applyBackground(c, 'sage'), {});
});

test('trocar de antecedente devolve perícia da classe e tira ferramentas/pacote do anterior', () => {
  let c = pick(mk('2024'), 'sage');
  c = applyStartingEquipment({ ...c, creation: { ...c.creation, backgroundPack: 'A' }, equipment: [{ name: 'Mochila', from: 'manual' }] }, 'pt');
  assert.ok(c.equipment.length > 1, 'pacote A do Sábio aplicado');
  c = pick(c, 'criminal');
  assert.ok(c.skillProfs.includes('arcana'), 'perícia da classe fica');
  assert.ok(!c.skillProfs.includes('history'));
  assert.ok(c.skillProfs.includes('stealth') && c.skillProfs.includes('sleightOfHand'));
  assert.deepEqual(c.toolProfs, ['thievesTools']);
  assert.ok(!('backgroundPack' in c.creation));
  assert.deepEqual(c.equipment.map(i => i.name), ['Mochila']);
  assert.equal(originEntry(c)?.id, 'alert');
  assert.equal(c.feats.filter(f => f.origin === 'background').length, 1);
});

test('ferramenta à escolha: issue até escolher, e troca limpa a anterior', () => {
  let c = pick(mk('2024'), 'guard');
  assert.match(backgroundIssues(c)[0].pt, /jogo/);
  c = { ...c, ...toggleBackgroundTool(c, 'diceSet') };
  assert.deepEqual(backgroundIssues(c), []);
  assert.ok(c.toolProfs.includes('diceSet'));
  c = { ...c, ...toggleBackgroundTool(c, 'playingCardSet') };
  assert.ok(!c.toolProfs.includes('diceSet') && c.toolProfs.includes('playingCardSet'));
  assert.deepEqual(toggleBackgroundTool(c, 'lute'), {}, 'fora da lista');
  c = pick(c, 'sage');
  assert.deepEqual(c.toolProfs, ['calligraphersSupplies']);
  assert.deepEqual(backgroundToolIds(c), ['calligraphersSupplies']);
});

test('sem antecedente: issue em linguagem simples', () => {
  assert.match(backgroundIssues(mk('2024'))[0].pt, /Escolha um antecedente/);
  assert.match(backgroundIssues(mk('2014'))[0].en, /Choose a background/);
});

test('2014: não mexe em raceBonus nem talentos, e corta idiomas a mais', () => {
  let c = mk('2014', { race: 'human', raceBonus: { str: 1 }, skillProfs: ['investigation', 'medicine'] });
  c = pick(c, 'sage');
  assert.deepEqual(c.raceBonus, { str: 1 });
  assert.deepEqual(c.feats || [], []);
  assert.deepEqual(backgroundIssues(c), []);
  if (typeof Utils.trimLanguages === 'function') {
    // Humano (1) + Sábio (2) = 3 idiomas; Criminoso não dá idiomas → sobra 1.
    c = { ...c, languages: ['Elvish', 'Dwarvish', 'Giant'] };
    c = pick(c, 'criminal');
    assert.deepEqual(c.languages, ['Elvish']);
  } else {
    c = pick(c, 'criminal');
  }
  // Criminoso 2014: ladrão fixo + 1 jogo
  assert.ok(c.toolProfs.includes('thievesTools'));
  assert.match(backgroundIssues(c)[0].pt, /jogo/);
});

test('combina com sua classe: 2024 por atributo, 2014 por perícia', () => {
  const w24 = mk('2024', { skillProfs: [] });
  assert.equal(fitsClass(w24, findBackground(w24, 'sage')), true);
  assert.equal(fitsClass(w24, findBackground(w24, 'soldier')), false);
  const w14 = mk('2014', { skillProfs: [] });
  assert.equal(fitsClass(w14, findBackground(w14, 'sage')), true);
  assert.equal(fitsClass(w14, findBackground(w14, 'soldier')), false);
  // Repetir uma perícia já escolhida na classe tira o selo (Mago com Arcanismo × Sábio).
  assert.equal(fitsClass(mk('2014'), findBackground(w14, 'sage')), false);
});

test('selo "Combina" só pelo atributo PRINCIPAL da classe (2024): poucos antecedentes por classe', () => {
  const f = { ...newCharacter('2024'), className: 'fighter', skillProfs: [] };
  const fits = Utils.backgrounds(f).filter(b => fitsClass(f, b)).map(b => b.id);
  assert.ok(fits.includes('soldier') && fits.includes('guard'), fits.join());
  assert.ok(fits.length <= 8, `Guerreiro: ${fits.length} antecedentes com selo (${fits.join()})`);
  assert.ok(!fits.includes('sage'));
  // Com Atletismo escolhido na classe, Soldado e Guarda (que dão Atletismo) perdem o selo.
  const f2 = { ...f, skillProfs: ['athletics', 'perception'] };
  assert.ok(!fitsClass(f2, findBackground(f2, 'soldier')));
  assert.ok(!fitsClass(f2, findBackground(f2, 'guard')));
});

test('perícia da classe repetida pelo antecedente trava NA etapa Antecedente e só cita a escolhida', () => {
  // Mago 2014: Arcanismo + Investigação; Sábio dá Arcanismo e História.
  let c = pick(mk('2014'), 'sage');
  const iss = backgroundIssues(c).map(i => i.pt).join(' | ');
  assert.match(iss, /Arcanismo já vem do antecedente/);
  assert.ok(!/História/.test(iss), iss);
  // 2024 Guerreiro (Atletismo + Percepção) + Guarda (Atletismo + Percepção): plural certo.
  let g = pick({ ...newCharacter('2024'), className: 'fighter', skillProfs: ['athletics', 'perception'] }, 'guard');
  assert.match(backgroundIssues(g)[0].pt, /Atletismo e Percepção já vêm do antecedente/);
  // Trocou a perícia da classe: some.
  c = { ...c, skillProfs: c.skillProfs.filter(s => s !== 'arcana').concat('medicine') };
  assert.ok(!backgroundIssues(c).some(i => /antecedente\./.test(i.pt)));
});

test('ferramenta que a classe já dá não pode ser escolhida de novo no antecedente', () => {
  // Bardo 2024 com Alaúde nas escolhas da classe + Artista (1 instrumento).
  let c = { ...newCharacter('2024'), className: 'bard', skillProfs: [], classOptions: [{ classId: 'bard', pool: 'musicalInstrument', id: 'lute' }] };
  c = pick(c, 'entertainer');
  assert.ok(ownedToolsOutsideBackground(c).includes('lute'));
  c = { ...c, ...toggleBackgroundTool(c, 'lute') };
  assert.deepEqual(backgroundToolRepeats(c), ['lute']);
  assert.ok(backgroundIssues(c).some(i => /já tem treino em Alaúde/.test(i.pt)));
  c = { ...c, ...toggleBackgroundTool(c, 'flute') };
  assert.deepEqual(backgroundToolRepeats(c), []);
});

test('Iniciado em Magia já vem com o atributo mental principal da classe', () => {
  const sage = pick({ ...newCharacter('2024'), className: 'wizard', skillProfs: [] }, 'sage');
  assert.equal(originEntry(sage).picks.spellAbility, 'int');
  const guide = pick({ ...newCharacter('2024'), className: 'ranger', skillProfs: [] }, 'guide');
  assert.equal(originEntry(guide).picks.spellAbility, 'wis');
  const aco = pick({ ...newCharacter('2024'), className: 'paladin', skillProfs: [] }, 'acolyte');
  assert.equal(originEntry(aco).picks.spellAbility, 'cha');
  // Sem atributo mental na classe: o da lista (Clérigo → Sabedoria).
  const rog = pick({ ...newCharacter('2024'), className: 'rogue', skillProfs: [] }, 'acolyte');
  assert.equal(originEntry(rog).picks.spellAbility, 'wis');
  assert.equal(recommendedSpellAbility({ ...newCharacter('2024'), className: 'fighter' }, 'wizard'), 'int');
});

test('Ladino: Especialização é pendência da etapa Antecedente e aceita perícias do antecedente', () => {
  for (const rules of ['2014', '2024']) {
    let c = { ...newCharacter(rules), className: 'rogue', skillProfs: ['perception', 'acrobatics', 'investigation', 'insight'] };
    c = pick(c, 'criminal');
    assert.ok(backgroundIssues(c).some(i => /Especialização/.test(i.pt)), rules);
    const g = expertiseGroups(c)[0];
    assert.ok(expertiseOptions(c, g).some(o => o.id === 'stealth'), `${rules}: Furtividade (do Criminoso) disponível`);
    c = { ...c, ...toggleGroupPick(c, g, 'stealth') };
    c = { ...c, ...toggleGroupPick(c, expertiseGroups(c)[0], 'perception') };
    assert.ok(!backgroundIssues(c).some(i => /Especialização/.test(i.pt)), rules);
    // Trocar para um antecedente sem Furtividade tira a especialização dela.
    c = pick(c, 'sage');
    assert.ok(!c.classOptions.some(p => p.id === 'stealth'), rules);
    assert.ok(backgroundIssues(c).some(i => /Especialização/.test(i.pt)), rules);
  }
});

test('talento de origem: etapa só aparece com sub-escolhas (2024)', () => {
  assert.equal(originFeatApplies(pick(mk('2024'), 'sage')), true);
  assert.equal(originFeatApplies(pick(mk('2024'), 'criminal')), false); // Alerta
  assert.equal(originFeatApplies(pick(mk('2024'), 'noble')), true); // Habilidoso
  assert.equal(originFeatApplies(pick(mk('2014'), 'sage')), false);
});

test('Iniciado em Magia: issues simples até completar', () => {
  let c = pick(mk('2024'), 'sage');
  const iss = originFeatIssues(c).map(i => i.pt).join(' | ');
  assert.ok(!/atributo/.test(iss), 'atributo já vem sugerido');
  assert.match(iss, /2 truques/);
  assert.match(iss, /1 magia/);
  const e = originEntry(c);
  c = { ...c, feats: c.feats.map(f => (f === e ? { ...f, picks: { ...f.picks, spellAbility: 'int', cantrip: ['fireBolt', 'light'], spell: ['magicMissile'] } } : f)) };
  assert.deepEqual(originFeatIssues(c), []);
});

test('Habilidoso: perícia já existente conta como repetida', () => {
  let c = pick(mk('2024'), 'noble');
  const e = originEntry(c);
  c = { ...c, feats: c.feats.map(f => (f === e ? { ...f, picks: { skillOrTool: ['history', 'stealth', 'diceSet'] } } : f)) };
  assert.deepEqual(originFeatRepeats(c), ['history']);
  assert.ok(originFeatIssues(c).some(i => /já tem treino/.test(i.pt)));
  const e2 = originEntry(c);
  c = { ...c, feats: c.feats.map(f => (f === e2 ? { ...f, picks: { skillOrTool: ['perception', 'stealth', 'diceSet'] } } : f)) };
  assert.deepEqual(originFeatIssues(c), []);
});

test('talento repetido com a espécie (Humano Versátil) bloqueia o antecedente', () => {
  let c = pick(mk('2024', { race: 'human' }), 'criminal');
  c = { ...c, feats: [...c.feats, { name: 'Alert', id: 'alert', level: 1, origin: 'species' }] };
  assert.equal(originFeatConflict(c)?.id, 'alert');
  assert.ok(backgroundIssues(c).some(i => /espécie/.test(i.pt)));
  // Habilidoso é repetível: sem conflito.
  let n = pick(mk('2024', { race: 'human' }), 'noble');
  n = { ...n, feats: [...n.feats, { name: 'Skilled', id: 'skilled', level: 1, origin: 'species' }] };
  assert.equal(originFeatConflict(n), null);
  // Iniciado em Magia repete só com outra lista.
  let s = pick(mk('2024', { race: 'human' }), 'sage');
  s = { ...s, feats: [...s.feats, { name: 'Magic Initiate', id: 'magicInitiate', level: 1, origin: 'species', picks: { spellList: 'wizard' } }] };
  assert.equal(originFeatConflict(s)?.id, 'magicInitiate');
  s = { ...s, feats: s.feats.map(f => (f.origin === 'species' ? { ...f, picks: { spellList: 'cleric' } } : f)) };
  assert.equal(originFeatConflict(s), null);
});

test('todos os antecedentes 2024 têm talento do catálogo e resumo de 1 linha', () => {
  const c = mk('2024');
  for (const b of Utils.backgrounds(c)) {
    const feats = withOriginFeat([], b);
    assert.equal(feats.length, 1, b.id);
    assert.ok(ORIGIN_FEAT_LINE[feats[0].id], `${b.id} ${feats[0].id}`);
    assert.ok(FEATS.some(f => f.id === feats[0].id));
  }
});

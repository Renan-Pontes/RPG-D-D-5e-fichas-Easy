import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import {
  newCharacter, hasRulesChoices, rulesSwitchPatch, detailsIssues, composeBackstory, STORY_PROMPTS,
  collectIssues, flatIssues, finalizeCharacter, characterSummary, weaponAttack, allToolProfs,
  ALIGNMENT_INFO, isEvilAlignment,
} from '../src/creator/creation.js';

// Merge raso igual ao `set` do CreatorWizard.
const merge = (prev, patch) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) });

const fighter2024 = () => ({
  ...newCharacter('2024'),
  name: 'Lia', avatar: 'data:image/png;base64,xx', player: 'Renan',
  className: 'fighter', background: 'soldier', race: 'dwarf',
  abilities: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 },
  raceBonus: { str: 2, con: 1 },
  skillProfs: ['perception', 'acrobatics'],
  languages: ['Elvish', 'Giant'],
  armor: 'chainMail',
  weapons: [{ id: 'greatsword' }, { id: 'javelin', qty: 8 }],
  toolProfs: ['diceSet'],
  feats: [{ id: 'savageAttacker', origin: 'background' }],
  equipment: [{ name: { pt: 'Pacote de Aventureiro', en: "Explorer's Pack" }, qty: 1 }],
  coins: { cp: 0, sp: 0, ep: 0, gp: 18, pp: 0 },
  creation: { classPack: 'A', backgroundPack: 'A', story: { raised: 'Minha avó ferreira.', why: 'Vingar a vila.' } },
});

const wizard2014 = () => ({
  ...newCharacter('2014'),
  name: 'Bo', className: 'wizard', background: 'sage', race: 'elf-high',
  abilities: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
  raceBonus: { dex: 2, int: 1 },
  skillProfs: ['investigation', 'insight'],
  languages: ['Draconic', 'Dwarvish', 'Orc'],
  spells: [{ id: 'fireBolt' }, { id: 'mageHand' }, { id: 'light' }, { id: 'magicMissile' }],
  weapons: [{ id: 'quarterstaff' }],
  creation: {},
});

// ---------- Começo: troca de regra ----------

test('ficha nova: 2024, nível 1, Marcos, sem escolhas', () => {
  const c = newCharacter();
  assert.equal(c.rulesVersion, '2024');
  assert.equal(c.level, 1);
  assert.equal(c.levelingMode, 'milestone');
  assert.equal(hasRulesChoices(c), false);
  assert.equal(hasRulesChoices({ ...c, name: 'Só nome', avatar: 'x' }), false);
  assert.equal(hasRulesChoices({ ...c, className: 'bard' }), true);
  assert.equal(hasRulesChoices({ ...c, abilities: { ...c.abilities, str: 15 } }), true);
});

for (const [from, to] of [['2024', '2014'], ['2014', '2024']]) {
  test(`trocar a regra ${from} → ${to} reinicia a ficha e mantém nome/foto/jogador`, () => {
    const start = from === '2024' ? fighter2024() : wizard2014();
    const c = merge({ ...start, avatar: 'img', player: 'P', speciesChoices: { lineage: 'high' }, classOptions: [{ pool: 'x' }] }, prev => rulesSwitchPatch(prev, to));
    assert.equal(c.rulesVersion, to);
    assert.equal(c.name, start.name);
    assert.equal(c.avatar, 'img');
    assert.equal(c.player, 'P');
    assert.equal(c.className, '');
    assert.equal(c.race, '');
    assert.equal(c.background, '');
    assert.deepEqual(c.skillProfs, []);
    assert.deepEqual(c.spells, []);
    assert.deepEqual(c.weapons, []);
    assert.deepEqual(c.creation, {});
    assert.equal(c.feats, undefined);
    assert.equal(c.speciesChoices, undefined);
    assert.equal(c.classOptions, undefined);
    assert.equal(c.toolProfs, undefined);
    assert.equal(c.id, start.id);
    assert.equal(hasRulesChoices(c), false);
  });
}

// ---------- Tendência ----------

test('tendência: 9 opções com frase em pt/en e as más marcadas', () => {
  assert.equal(ALIGNMENT_INFO.length, 9);
  for (const a of ALIGNMENT_INFO) {
    assert.ok(a.name.pt && a.name.en && a.desc.pt && a.desc.en, a.id);
  }
  assert.deepEqual(ALIGNMENT_INFO.filter(a => isEvilAlignment(a.id)).map(a => a.id), ['LE', 'NE', 'CE']);
  assert.equal(isEvilAlignment(''), false);
});

// ---------- Detalhes ----------

test('detalhes: nome é obrigatório (só espaços não vale)', () => {
  assert.equal(detailsIssues({ name: '' }).length, 1);
  assert.equal(detailsIssues({ name: '   ' }).length, 1);
  assert.match(detailsIssues({}).at(0).pt, /nome/);
  assert.deepEqual(detailsIssues({ name: 'Lia' }), []);
});

test('detalhes: respostas das perguntas-guia vão para a história', () => {
  assert.ok(STORY_PROMPTS.length >= 3);
  const c = { backstory: 'Nasci no norte.', creation: { story: { raised: 'Minha avó.', group: '  ', why: 'Ouro.' } } };
  const pt = composeBackstory(c, 'pt');
  assert.match(pt, /^Nasci no norte\./);
  assert.match(pt, /Quem te criou\? Minha avó\./);
  assert.match(pt, /Ouro\./);
  assert.doesNotMatch(pt, /grupo/);
  assert.match(composeBackstory(c, 'en'), /Who raised you\? Minha avó\./);
  assert.equal(composeBackstory({}, 'pt'), '');
});

// ---------- Revisão: pendências ----------

test('revisão: junta pendências das etapas que se aplicam, ignora a própria revisão', () => {
  const steps = [
    { id: 'welcome', title: { pt: 'Começo', en: 'Start' }, issues: () => [] },
    { id: 'class', title: { pt: 'Classe', en: 'Class' }, issues: (c) => (c.className ? [] : [{ pt: 'Escolha uma classe.', en: 'Pick a class.' }]) },
    { id: 'spells', title: { pt: 'Magias', en: 'Spells' }, applies: (c) => c.className === 'wizard', issues: () => [{ pt: 'X', en: 'X' }] },
    { id: 'boom', title: { pt: 'Quebrada', en: 'Broken' }, issues: () => { throw new Error('bug'); } },
    { id: 'details', title: { pt: 'Detalhes', en: 'Details' }, issues: detailsIssues },
    { id: 'review', title: { pt: 'Revisão', en: 'Review' }, issues: () => [{ pt: 'nunca', en: 'never' }] },
  ];
  const groups = collectIssues(steps, { className: '' });
  assert.deepEqual(groups.map(g => g.id), ['class', 'boom', 'details']);
  const flat = flatIssues(groups);
  assert.equal(flat[0].pt, 'Classe: Escolha uma classe.');
  assert.equal(flat[0].en, 'Class: Pick a class.');
  assert.equal(flat[0].stepId, 'class');
  assert.deepEqual(collectIssues(steps, { className: 'wizard', name: 'Bo' }).map(g => g.id), ['spells', 'boom']);
  assert.deepEqual(collectIssues(steps.filter(s => s.id !== 'boom'), { className: 'fighter', name: 'Lia' }), []);
});

// ---------- Ficha final ----------

test('2024: finalizeCharacter consolida perícias, idiomas, ferramentas, salvaguardas e PV', () => {
  const f = finalizeCharacter(fighter2024(), 'pt');
  assert.equal('creation' in f, false);
  // Soldado 2024: Atletismo + Intimidação; classe: Percepção + Acrobacia.
  assert.deepEqual([...f.skillProfs].sort(), ['acrobatics', 'athletics', 'intimidation', 'perception']);
  assert.deepEqual(f.languages, ['Common', 'Elvish', 'Giant']);
  assert.deepEqual(f.saveProfs.sort(), ['con', 'str']);
  assert.ok(f.toolProfs.includes('diceSet'));
  assert.match(f.otherProfs, /Ferramentas: .*Dados/);
  // Guerreiro d10 + CON (14 → +2) + Anão 2024 (+1/nível) = 13.
  assert.equal(f.maxHp, 13);
  assert.equal(f.currentHp, 13);
  assert.equal(f.level, 1);
  assert.match(f.backstory, /Quem te criou\? Minha avó ferreira\./);
  // Rodar de novo não duplica o texto de ferramentas.
  const again = finalizeCharacter({ ...f, creation: {} }, 'pt');
  assert.equal(again.otherProfs.match(/Ferramentas:/g).length, 1);
});

test('2014: finalizeCharacter (Mago Alto Elfo Sábio)', () => {
  const f = finalizeCharacter(wizard2014(), 'en');
  // Sábio 2014: Arcanismo + História; Sentidos Aguçados: Percepção.
  assert.deepEqual([...f.skillProfs].sort(), ['arcana', 'history', 'insight', 'investigation', 'perception']);
  // Alto Elfo: Comum + Élfico fixos; +1 da raça e +2 do Sábio.
  assert.deepEqual(f.languages, ['Common', 'Elvish', 'Draconic', 'Dwarvish', 'Orc']);
  assert.deepEqual(f.saveProfs.sort(), ['int', 'wis']);
  assert.equal(f.maxHp, 7); // d6 + CON 13 (+1)
  assert.equal(f.currentHp, 7);
  assert.equal('creation' in f, false);
});

test('finalizeCharacter descarta idiomas escolhidos a mais', () => {
  const f = finalizeCharacter({ ...fighter2024(), languages: ['Elvish', 'Giant', 'Orc', 'Gnomish'] });
  assert.equal(f.languages.length, 3); // Comum + 2 (regra 2024)
});

test('ferramentas fixas da classe/antecedente entram mesmo sem escolha (Ladino 2024: Ferramentas de Ladrão)', () => {
  const c = { ...newCharacter('2024'), className: 'rogue', background: 'criminal' };
  assert.ok(allToolProfs(c).includes('thievesTools'));
  const f = finalizeCharacter(c, 'en');
  assert.match(f.otherProfs, /Tools: .*Thieves' Tools/);
});

// ---------- Resumo da revisão ----------

test('2024: resumo do Guerreiro (CA, iniciativa, ataques, percepção passiva)', () => {
  const s = characterSummary(fighter2024(), 'pt');
  assert.equal(s.hp, 13);
  assert.equal(s.ac, 16); // Cota de Malha
  assert.equal(s.initiative, 2);
  assert.equal(s.profBonus, 2);
  assert.equal(s.passivePerception, 12); // 10 + SAB 0 + 2
  assert.equal(s.speedFt, 30);
  assert.equal(s.speedM, 9);
  const gs = s.attacks.find(a => a.dmg.startsWith('2d6'));
  assert.equal(gs.atk, 5); // FOR 17 (+3) + 2
  assert.equal(gs.dmg, '2d6+3');
  assert.equal(gs.proficient, true);
  assert.deepEqual(s.untrainedArmor, []);
  assert.ok(s.languages.includes('Comum'));
  assert.equal(s.equipment[0].name, 'Pacote de Aventureiro');
  assert.equal(s.spellAbility, null);
});

test('2024: talento Alerta soma o Bônus de Proficiência na iniciativa', () => {
  const c = { ...fighter2024(), background: 'criminal', feats: [{ id: 'alert', origin: 'background' }] };
  assert.equal(characterSummary(c).initiative, 4);
});

test('2014: resumo do Mago (magias, CD, ataque mágico)', () => {
  const s = characterSummary(wizard2014(), 'en');
  assert.equal(s.hp, 7);
  assert.equal(s.ac, 13); // 10 + DES 16 (+3)
  assert.equal(s.spellAbility, 'int');
  assert.equal(s.spellDc, 13); // 8 + 2 + INT 16 (+3)
  assert.equal(s.spellAttack, 5);
  assert.deepEqual(s.spells.filter(x => x.level === 0).map(x => x.id).sort(), ['fireBolt', 'light', 'mageHand']);
  assert.equal(s.spells.find(x => x.id === 'magicMissile').name, 'Magic Missile');
  assert.equal(s.passivePerception, 13); // 10 + 1 + 2
});

test('armadura e arma sem treino aparecem no resumo', () => {
  const c = { ...wizard2014(), armor: 'plate', hasShield: true, weapons: [{ id: 'greatsword' }] };
  const s = characterSummary(c, 'pt');
  assert.equal(s.untrainedArmor.length, 2);
  const a = weaponAttack(s.char, { id: 'greatsword' }, 'pt');
  assert.equal(a.proficient, false);
  assert.equal(a.atk, Utils.abilityMod(s.char, 'str')); // sem Bônus de Proficiência
});

test('resumo não quebra com a ficha ainda vazia', () => {
  for (const r of ['2024', '2014']) {
    const s = characterSummary(newCharacter(r), 'pt');
    assert.equal(s.hp, 0);
    assert.equal(s.hitDie, null);
    assert.deepEqual(s.attacks, []);
  }
});

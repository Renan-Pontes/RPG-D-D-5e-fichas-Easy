import { applyStartingEquipment } from '../src/creator/equipment-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCharacter } from '../src/creator/creation.js';
import {
  CORE_CLASSES, OTHER_BOOK_CLASSES, isBeginnerClass, classIssues, selectClass, selectSubclass, needsSubclass,
  choiceGroups, groupOptions, toggleGroupPick, setPickDetail, classChoiceIssues, hasClassChoices, recommendedIds,
  classSkillList, classSkillCount, classSkillPicks, toggleClassSkill, skillsIssues, expertiseGroups, expertiseOptions,
  otherSkillSources, stripClassPack, classToolPicks, armorText, weaponText, toolText, classFeaturesL1, SKILL_HINTS,
} from '../src/creator/class-helpers.js';
import SRD from '../data/srd.js';

const mk = (rules, className, extra = {}) => {
  const base = newCharacter(rules);
  return className ? { ...base, ...selectClass(base, className), ...extra } : { ...base, ...extra };
};
const apply = (char, patch) => ({ ...char, ...patch });
const pickSkills = (char, ids) => ids.reduce((c, id) => apply(c, toggleClassSkill(c, id)), char);
const fillGroup = (char, key) => {
  let c = char;
  for (let i = 0; i < 10; i++) {
    const g = choiceGroups(c).find(x => x.key === key);
    if (!g || g.picks.length >= g.total) break;
    const o = groupOptions(c, g).find(x => x.eligible && !x.chosen);
    if (!o) break;
    c = apply(c, toggleGroupPick(c, g, o.id));
  }
  return c;
};

test('todas as classes têm dados e textos', () => {
  for (const rules of ['2024', '2014']) {
    for (const id of [...CORE_CLASSES, ...OTHER_BOOK_CLASSES]) {
      const c = mk(rules, id);
      assert.deepEqual(classIssues(c).length, needsSubclass(c) ? 1 : 0, `${rules} ${id}`);
      assert.ok(armorText(c && { armor: [] }, 'pt'));
      assert.ok(classFeaturesL1(c, id).length > 0, `${rules} ${id} features`);
    }
  }
  assert.ok(SRD.SKILLS.every(s => SKILL_HINTS[s.id]?.pt && SKILL_HINTS[s.id]?.en));
});

test('selo "Bom para começar" só na complexidade baixa (Guerreiro e Ladino)', () => {
  const c = newCharacter('2024');
  assert.deepEqual(CORE_CLASSES.filter(id => isBeginnerClass(c, id)).sort(), ['fighter', 'rogue']);
});

test('textos de treino', () => {
  assert.equal(armorText({ armor: ['light', 'medium', 'shield'] }, 'pt'), 'Armaduras leves e médias; escudo');
  assert.equal(armorText({ armor: [] }, 'en'), 'None');
  assert.equal(weaponText({ weapons: { categories: ['simple', 'martial'] } }, 'pt'), 'Armas simples e marciais');
  assert.match(toolText({ tools: { fixed: ['herbalismKit'], choose: 0 } }, 'pt'), /Herbalismo/);
});

test('sem classe: pede a classe', () => {
  assert.match(classIssues(newCharacter('2024'))[0].pt, /Escolha uma classe/);
});

test('2014: Clérigo, Feiticeiro e Bruxo exigem subclasse no nível 1; 2024 não', () => {
  for (const id of ['cleric', 'sorcerer', 'warlock']) {
    const c = mk('2014', id);
    assert.ok(needsSubclass(c), id);
    assert.equal(classIssues(c).length, 1);
    assert.match(classIssues(c)[0].pt, /nível 1/);
    assert.equal(needsSubclass(mk('2024', id)), false);
  }
  for (const id of ['fighter', 'druid', 'wizard']) assert.equal(needsSubclass(mk('2014', id)), false, id);
  const life = apply(mk('2014', 'cleric'), selectSubclass(mk('2014', 'cleric'), 'life'));
  assert.deepEqual(classIssues(life), []);
});

test('2014 Vida: proficiência do domínio escolhida sozinha; etapa de escolhas pulada', () => {
  let c = mk('2014', 'cleric');
  c = apply(c, selectSubclass(c, 'life'));
  assert.deepEqual(c.classOptions.map(p => p.id), ['lifeProficiency']);
  assert.equal(hasClassChoices(c), false);
  assert.deepEqual(classChoiceIssues(c), []);
  // Trocar para Conhecimento limpa a escolha antiga e pede idiomas + perícias.
  c = apply(c, selectSubclass(c, 'knowledge'));
  assert.deepEqual(c.classOptions, []);
  assert.ok(hasClassChoices(c));
  assert.equal(classChoiceIssues(c).length, 2);
});

test('2014 Feiticeiro Dracônico pede o ancestral', () => {
  let c = mk('2014', 'sorcerer');
  c = apply(c, selectSubclass(c, 'draconic'));
  const g = choiceGroups(c).find(x => x.key === 'dragonAncestor');
  assert.ok(g);
  assert.ok(recommendedIds(c, g).includes('redDragon'));
  assert.equal(classChoiceIssues(c).length, 1);
  c = apply(c, toggleGroupPick(c, g, 'redDragon'));
  assert.deepEqual(classChoiceIssues(c), []);
  // Vaga única: tocar em outra troca.
  c = apply(c, toggleGroupPick(c, choiceGroups(c).find(x => x.key === 'dragonAncestor'), 'blueDragon'));
  assert.deepEqual(c.classOptions.filter(p => p.pool === 'dragonAncestor').map(p => p.id), ['blueDragon']);
});

test('trocar de classe limpa subclasse, opções, perícias e magias da classe; mantém as de outra fonte', () => {
  let c = mk('2014', 'cleric', { background: 'sage', spells: [{ id: 'guidance' }, { id: 'light', source: 'feat' }] });
  c = apply(c, selectSubclass(c, 'life'));
  c = pickSkills(c, ['insight', 'medicine']);
  c = { ...c, skillProfs: [...c.skillProfs, 'arcana'], skillExpertise: ['insight'] }; // arcana vem do Sábio
  c = apply(c, selectClass(c, 'fighter'));
  assert.equal(c.subclass, '');
  assert.deepEqual(c.classOptions, []);
  assert.deepEqual(c.skillProfs, ['arcana']);
  assert.deepEqual(c.skillExpertise, []);
  assert.deepEqual(c.spells.map(s => s.id), ['light']);
  assert.deepEqual(c.saveProfs, ['str', 'con']);
});

test('trocar de classe tira o pacote de equipamento da classe (itens e ouro) e mantém o do antecedente', () => {
  let c = { ...mk('2024', 'fighter'), background: 'soldier', creation: { classPack: 'A', backgroundPack: 'B' },
    equipment: [{ name: 'Corda', qty: 1, from: 'manual' }], coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } };
  c = applyStartingEquipment(c, 'pt');
  assert.ok(c.armor, 'pacote A do guerreiro tem armadura');
  const gpWithClass = c.coins.gp;
  const p = stripClassPack(c);
  assert.equal(p.armor, null);
  assert.equal(p.weapons.length, 0);
  assert.deepEqual(p.equipment.map(e => e.name), ['Corda'], 'item manual fica');
  assert.equal(p.coins.gp, 50, 'só os 50 PO do antecedente (B)');
  assert.ok(gpWithClass > 50);
  assert.equal(p.creation.classPack, undefined);
  assert.equal(p.creation.backgroundPack, 'B');
});

test('listas de perícias por regra (start-data)', () => {
  assert.ok(classSkillList(mk('2024', 'fighter')).includes('persuasion'));
  assert.ok(!classSkillList(mk('2014', 'fighter')).includes('persuasion'));
  assert.ok(classSkillList(mk('2024', 'wizard')).includes('nature'));
  assert.ok(!classSkillList(mk('2014', 'wizard')).includes('nature'));
  assert.ok(!classSkillList(mk('2024', 'rogue')).includes('performance'));
  assert.ok(classSkillList(mk('2014', 'rogue')).includes('performance'));
  assert.equal(classSkillCount(mk('2024', 'rogue')), 4);
  assert.equal(classSkillCount(mk('2024', 'bard')), 3);
});

for (const rules of ['2024', '2014']) {
  test(`${rules}: perícias exigem exatamente N e não passam do limite`, () => {
    let c = mk(rules, 'fighter');
    assert.match(skillsIssues(c)[0].pt, /Escolha mais 2 perícias/);
    c = pickSkills(c, ['athletics']);
    assert.match(skillsIssues(c)[0].pt, /Escolha mais 1 perícia /);
    c = pickSkills(c, ['perception', 'history']); // a terceira é ignorada
    assert.deepEqual(classSkillPicks(c), ['athletics', 'perception']);
    assert.deepEqual(skillsIssues(c), []);
    // Fora da lista: ignorada.
    assert.deepEqual(toggleClassSkill(c, 'arcana'), {});
    // Desmarcar.
    c = pickSkills(c, ['athletics']);
    assert.deepEqual(classSkillPicks(c), ['perception']);
  });

  test(`${rules}: perícia do antecedente fica travada e não conta`, () => {
    let c = mk(rules, 'fighter', { background: rules === '2024' ? 'soldier' : 'soldier' });
    const others = otherSkillSources(c);
    assert.equal(others.athletics, 'background');
    assert.deepEqual(toggleClassSkill(c, 'athletics'), {});
    // Escolheu antes do antecedente e depois ele repetiu: pede outra.
    c = pickSkills({ ...c, background: '' }, ['athletics', 'perception']);
    assert.deepEqual(skillsIssues(c), []);
    c = { ...c, background: 'soldier' };
    const iss = skillsIssues(c);
    assert.equal(iss.length, 1);
    assert.match(iss[0].pt, /Atletismo já vem do antecedente/);
    c = pickSkills(c, ['survival']);
    assert.deepEqual(skillsIssues(c), []);
    assert.ok(!c.skillProfs.includes('athletics'));
  });
}

test('2024: escolhas de classe do nível 1', () => {
  const keys = (id) => choiceGroups(mk('2024', id)).filter(g => !g.step).map(g => `${g.key}:${g.total}`);
  assert.deepEqual(keys('fighter'), ['fightingStyle:1', 'weaponMastery:3']);
  assert.deepEqual(keys('barbarian'), ['weaponMastery:2']);
  assert.deepEqual(keys('cleric'), ['divineOrder:1']);
  assert.deepEqual(keys('druid'), ['primalOrder:1']);
  assert.deepEqual(keys('bard'), ['musicalInstrument+musicalInstrumentStart:3']);
  assert.deepEqual(keys('monk'), ['tool:1']);
  assert.deepEqual(keys('warlock'), ['invocation:1']);
  assert.deepEqual(keys('rogue'), ['weaponMastery:2']);
  assert.deepEqual(keys('wizard'), []);
  assert.equal(hasClassChoices(mk('2024', 'wizard')), false);
  // Ladino: Especialização vai para a etapa de perícias e o idioma para a de idiomas.
  const steps = choiceGroups(mk('2024', 'rogue')).filter(g => g.step).map(g => `${g.key}:${g.step}`);
  assert.deepEqual(steps, ['expertise:skills']);
});

test('2014: escolhas de classe do nível 1', () => {
  const keys = (id) => choiceGroups(mk('2014', id)).filter(g => !g.step).map(g => g.key);
  assert.deepEqual(keys('fighter'), ['fightingStyle']);
  assert.deepEqual(keys('ranger'), ['favoredEnemy', 'favoredTerrain', 'tceOptional']);
  assert.deepEqual(keys('monk'), ['tool']);
  assert.deepEqual(keys('barbarian'), []);
  assert.deepEqual(choiceGroups(mk('2014', 'rogue')).map(g => `${g.key}:${g.step}`), ['expertise2014:skills']);
  // Estilos de 2024 não aparecem numa ficha 2014.
  const c = mk('2014', 'fighter');
  const ids = groupOptions(c, choiceGroups(c)[0]).map(o => o.id);
  assert.ok(ids.includes('greatWeaponFighting2014') && !ids.includes('greatWeaponFighting'));
});

test('Guerreiro 2024: completa estilo e maestria; maestria recomenda armas do pacote', () => {
  let c = mk('2024', 'fighter');
  assert.equal(classChoiceIssues(c).length, 2);
  const wm = choiceGroups(c).find(g => g.key === 'weaponMastery');
  assert.deepEqual(recommendedIds(c, wm), ['greatsword', 'flail', 'javelin']);
  assert.ok(!groupOptions(c, wm).some(o => o.id === 'laserRifle'), 'armas do DMG escondidas');
  c = fillGroup(c, 'fightingStyle');
  c = fillGroup(c, 'weaponMastery');
  assert.deepEqual(classChoiceIssues(c), []);
  // Não passa do limite.
  const g = choiceGroups(c).find(x => x.key === 'weaponMastery');
  const extra = groupOptions(c, g).find(o => !o.chosen && o.eligible);
  assert.deepEqual(toggleGroupPick(c, g, extra.id), {});
});

test('Bárbaro 2024: maestria só de armas corpo a corpo', () => {
  const c = mk('2024', 'barbarian');
  const g = choiceGroups(c)[0];
  const ids = groupOptions(c, g).map(o => o.id);
  assert.ok(ids.includes('greataxe') && !ids.includes('longbow'));
});

test('Bruxo 2024: invocações de nível 2+ não são escolhíveis no nível 1', () => {
  const c = mk('2024', 'warlock');
  const g = choiceGroups(c)[0];
  const opts = groupOptions(c, g);
  assert.equal(opts.find(o => o.id === 'agonizingBlast').eligible, false);
  assert.equal(opts.find(o => o.id === 'armorOfShadows').eligible, true);
});

test('Bardo: 3 instrumentos sem repetir, distribuídos nos dois pools', () => {
  let c = mk('2024', 'bard');
  c = fillGroup(c, 'musicalInstrument+musicalInstrumentStart');
  const picks = c.classOptions.map(p => p.id);
  assert.equal(new Set(picks).size, 3);
  assert.deepEqual(c.classOptions.map(p => p.pool).sort(), ['musicalInstrument', 'musicalInstrumentStart', 'musicalInstrumentStart']);
  assert.deepEqual(classChoiceIssues(c), []);
  assert.deepEqual(classToolPicks(c).sort(), picks.sort());
});

test('Patrulheiro 2014: Humanoides pede o detalhe', () => {
  let c = mk('2014', 'ranger');
  const g = choiceGroups(c).find(x => x.key === 'favoredEnemy');
  c = apply(c, toggleGroupPick(c, g, 'humanoids'));
  assert.ok(classChoiceIssues(c).some(i => /detalhe/.test(i.pt)));
  c = apply(c, setPickDetail(c, 'favoredEnemy', 'humanoids', 'gnolls e orcs'));
  assert.ok(!classChoiceIssues(c).some(i => /detalhe/.test(i.pt)));
});

for (const rules of ['2024', '2014']) {
  test(`${rules}: Especialização do Ladino só em perícias treinadas; some ao desmarcar a perícia`, () => {
    let c = mk(rules, 'rogue');
    const pool = rules === '2024' ? 'expertise' : 'expertise2014';
    assert.ok(skillsIssues(c).some(i => /Especialização/.test(i.pt)));
    c = pickSkills(c, ['stealth', 'perception', 'acrobatics', 'insight']);
    const g = expertiseGroups(c)[0];
    assert.equal(g.pools[0], pool);
    const opts = expertiseOptions(c, g).map(o => o.id);
    assert.ok(opts.includes('stealth') && !opts.includes('arcana'));
    if (rules === '2014') assert.ok(opts.includes('thievesTools'));
    else assert.ok(!opts.includes('thievesTools'));
    c = apply(c, toggleGroupPick(c, g, 'stealth'));
    c = apply(c, toggleGroupPick(c, expertiseGroups(c)[0], 'perception'));
    assert.deepEqual(skillsIssues(c), []);
    c = pickSkills(c, ['stealth']);
    assert.deepEqual(c.classOptions.filter(p => p.pool === pool).map(p => p.id), ['perception']);
    assert.equal(skillsIssues(c).length, 2); // falta 1 perícia e 1 especialização
  });
}

test('Ladino 2024: trocar de classe tira o idioma extra escolhido', () => {
  let c = mk('2024', 'rogue', { languages: ['Elvish', 'Dwarvish', 'Draconic'] });
  c = apply(c, selectClass(c, 'fighter'));
  assert.equal(c.languages.length, 2);
});

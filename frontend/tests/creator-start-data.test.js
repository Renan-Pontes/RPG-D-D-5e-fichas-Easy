import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import SRD from '../data/srd.js';
import {
  CLASS_START, BACKGROUND_START, TOOLS, classStart, backgroundStart, startingSpells, startingTools, startingGold,
  packFor, packProficiencyIssues, isWeaponProficient, isArmorProficient,
} from '../src/creator/start-data.js';

const CLASSES = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard', 'artificer'];
const SKILL_IDS = new Set(SRD.SKILLS.map(s => s.id));
const ARMOR_IDS = new Set(SRD.ARMOR.map(a => a.id));
const mk = (rulesVersion, className, extra = {}) => ({
  rulesVersion, className, subclass: '', level: 1, race: 'human', background: 'sage', feats: [], spells: [], skillProfs: [],
  abilities: { str: 10, dex: 14, con: 12, int: 16, wis: 16, cha: 10 }, raceBonus: {}, ...extra,
});

for (const rules of ['2024', '2014']) {
  test(`${rules}: as 13 classes têm dados completos e ids válidos`, () => {
    const weaponIds = new Set(SRD.weaponsFor(rules).map(w => w.id));
    for (const id of CLASSES) {
      const c = CLASS_START[rules][id];
      assert.ok(c, `${rules} ${id}`);
      assert.ok([6, 8, 10, 12].includes(c.hitDie));
      assert.ok(['low', 'average', 'high'].includes(c.complexity));
      assert.ok(c.role?.pt && c.role?.en, `${id} role`);
      assert.ok(c.primary.length >= 1);
      assert.equal(c.saves.length, 2);
      assert.ok(c.skills.count >= 2 && c.skills.from.length >= c.skills.count);
      c.skills.from.forEach(s => assert.ok(SKILL_IDS.has(s), `${id} skill ${s}`));
      c.armor.forEach(a => assert.ok(['light', 'medium', 'heavy', 'shield'].includes(a)));
      [...c.tools.fixed, ...c.tools.from].forEach(t => assert.ok(TOOLS[t], `${id} tool ${t}`));
      assert.ok(c.equipment.length >= 2 && c.equipment.length <= 4, `${id} options`);
      assert.deepEqual(c.equipment.map(o => o.id), ['A', 'B', 'C', 'D'].slice(0, c.equipment.length));
      for (const opt of c.equipment) {
        assert.ok(Number.isFinite(opt.gp) && opt.gp >= 0);
        for (const it of opt.items) {
          if (it.kind === 'weapon') assert.ok(weaponIds.has(it.id), `${rules} ${id} weapon ${it.id}`);
          else if (it.kind === 'armor') assert.ok(ARMOR_IDS.has(it.id), `${id} armor ${it.id}`);
          else if (it.kind === 'item') { assert.ok(it.name?.pt && it.name?.en); if (it.tool) assert.ok(TOOLS[it.tool]); }
          else assert.equal(it.kind, 'shield');
        }
      }
      // Última opção é só ouro.
      assert.equal(c.equipment.at(-1).items.length, 0);
    }
  });

  test(`${rules}: todo antecedente oferecido pelo app tem ferramenta e equipamento`, () => {
    const weaponIds = new Set(SRD.weaponsFor(rules).map(w => w.id));
    for (const bg of Utils.backgrounds({ rulesVersion: rules })) {
      const s = backgroundStart({ rulesVersion: rules }, bg.id);
      assert.ok(s, `${rules} ${bg.id}`);
      [...s.tool.fixed, ...s.tool.from].forEach(t => assert.ok(TOOLS[t], `${bg.id} tool ${t}`));
      assert.ok(s.equipment[0].items.length > 0);
      s.equipment[0].items.filter(i => i.kind === 'weapon').forEach(i => assert.ok(weaponIds.has(i.id), `${bg.id} ${i.id}`));
      if (rules === '2024') {
        assert.equal(s.tool.fixed.length + s.tool.choose, 1, `${bg.id}: uma ferramenta`);
        assert.equal(s.equipment.length, 2);
        assert.deepEqual(s.equipment[1], { id: 'B', items: [], gp: 50 });
      } else {
        assert.equal(s.languages, bg.languages, `${bg.id} idiomas`);
        assert.ok(s.feature?.pt && s.featureDesc?.en);
      }
    }
  });
}

test('2024: valores do SRD 5.2.1', () => {
  const c = (id) => CLASS_START['2024'][id];
  assert.ok(!c('rogue').skills.from.includes('performance'));
  assert.equal(c('rogue').skills.count, 4);
  assert.ok(c('wizard').skills.from.includes('nature'));
  assert.ok(c('fighter').skills.from.includes('persuasion'));
  assert.deepEqual(c('fighter').equipment.map(o => o.gp), [4, 11, 155]);
  assert.deepEqual(c('druid').armor, ['light', 'shield']);
  assert.deepEqual(c('druid').tools.fixed, ['herbalismKit']);
  assert.deepEqual(c('wizard').spells, { cantrips: 3, prepared: 4, spellbook: 6, mode: 'prepared' });
  assert.equal(c('sorcerer').spells.cantrips, 4);
  assert.equal(c('paladin').spells.prepared, 2);
  assert.equal(c('bard').complexity, 'high');
  assert.equal(c('fighter').complexity, 'low');
  const gp = { barbarian: 75, bard: 90, cleric: 110, druid: 50, monk: 50, paladin: 150, ranger: 150, rogue: 100, sorcerer: 50, warlock: 100, wizard: 55, artificer: 150 };
  for (const [id, v] of Object.entries(gp)) assert.equal(c(id).equipment.at(-1).gp, v, id);
  assert.deepEqual(BACKGROUND_START['2024'].sage.tool.fixed, ['calligraphersSupplies']);
  assert.equal(BACKGROUND_START['2024'].soldier.tool.choose, 1);
});

test('2014: listas próprias e riqueza inicial', () => {
  const c = (id) => CLASS_START['2014'][id];
  assert.ok(c('rogue').skills.from.includes('performance'));
  assert.ok(!c('wizard').skills.from.includes('nature'));
  assert.ok(!c('fighter').skills.from.includes('persuasion'));
  assert.ok(c('druid').armor.includes('medium'));
  assert.equal(c('monk').equipment.at(-1).gp, 12); // 5d4 sem ×10
  assert.equal(c('paladin').spells.mode, 'none');
  assert.equal(BACKGROUND_START['2014'].sage.languages, 2);
  assert.deepEqual(BACKGROUND_START['2014'].urchin.tool.fixed, ['disguiseKit', 'thievesTools']);
});

test('classStart/backgroundStart seguem a regra da ficha', () => {
  assert.ok(classStart(mk('2024', 'rogue')).weapons.martialProps);
  assert.ok(!classStart(mk('2014', 'rogue')).weapons.martialProps);
  assert.equal(classStart(mk('2024', 'nope')), null);
  assert.equal(backgroundStart(mk('2014', 'wizard', { background: 'farmer' })), null);
  assert.ok(backgroundStart(mk('2024', 'wizard', { background: 'farmer' })));
});

test('proficiência com armas: 2024 por categoria/propriedade', () => {
  const rogue = mk('2024', 'rogue');
  assert.equal(isWeaponProficient(rogue, 'longsword'), false);
  for (const id of ['scimitar', 'rapier', 'shortsword', 'whip', 'crossbowHand', 'dagger']) assert.equal(isWeaponProficient(rogue, id), true, id);
  const monk = mk('2024', 'monk');
  assert.equal(isWeaponProficient(monk, 'scimitar'), true);
  assert.equal(isWeaponProficient(monk, 'rapier'), false);
  assert.equal(isWeaponProficient(mk('2024', 'bard'), 'longsword'), false);
  assert.equal(isWeaponProficient(mk('2024', 'wizard'), 'mace'), true);
  assert.equal(isWeaponProficient(mk('2024', 'druid'), 'greatclub'), true);
  assert.equal(isWeaponProficient(mk('2024', 'druid'), 'scimitar'), false);
  assert.equal(isWeaponProficient(mk('2024', 'fighter'), 'greatsword'), true);
});

test('proficiência com armas: 2014 por id exato (bestas, clava grande)', () => {
  assert.equal(isWeaponProficient(mk('2014', 'bard'), 'crossbowHand'), true);
  assert.equal(isWeaponProficient(mk('2014', 'rogue'), 'crossbowHand'), true);
  assert.equal(isWeaponProficient(mk('2014', 'rogue'), 'longsword'), true);
  assert.equal(isWeaponProficient(mk('2014', 'wizard'), 'crossbowLight'), true);
  assert.equal(isWeaponProficient(mk('2014', 'sorcerer'), 'crossbowLight'), true);
  assert.equal(isWeaponProficient(mk('2014', 'wizard'), 'mace'), false);
  assert.equal(isWeaponProficient(mk('2014', 'druid'), 'greatclub'), false);
  assert.equal(isWeaponProficient(mk('2014', 'druid'), 'club'), true);
  assert.equal(isWeaponProficient(mk('2014', 'monk'), 'shortsword'), true);
  // Arma personalizada / classe desconhecida: não penaliza.
  assert.equal(isWeaponProficient(mk('2014', 'wizard'), ''), true);
  assert.equal(isWeaponProficient(mk('2014', ''), 'longsword'), true);
});

test('proficiência com armadura por regra, talento e multiclasse', () => {
  assert.equal(isArmorProficient(mk('2024', 'wizard'), 'plate'), false);
  assert.equal(isArmorProficient(mk('2024', 'wizard'), 'shield'), false);
  assert.equal(isArmorProficient(mk('2024', 'druid'), 'hide'), false);
  assert.equal(isArmorProficient(mk('2014', 'druid'), 'hide'), true);
  assert.equal(isArmorProficient(mk('2024', 'fighter'), 'plate'), true);
  assert.equal(isArmorProficient(mk('2024', 'wizard'), null), true);
  // Treinado em Armadura Leve 2024: leve + escudo.
  const lightly = mk('2024', 'wizard', { feats: [{ id: 'lightlyArmored' }] });
  assert.equal(isArmorProficient(lightly, 'leather'), true);
  assert.equal(isArmorProficient(lightly, 'shield'), true);
  // Mago 1 / Guerreiro 1 (2024): marciais, leve/média/escudo, mas não pesada.
  const mc = mk('2024', 'wizard', { level: 2, multiclass: [{ id: 'fighter' }], classSequence: ['wizard', 'fighter'] });
  assert.equal(isWeaponProficient(mc, 'longsword'), true);
  assert.equal(isArmorProficient(mc, 'chainShirt'), true);
  assert.equal(isArmorProficient(mc, 'plate'), false);
  // Guerreiro 1 / Mago 1: classe inicial completa.
  const mc2 = mk('2024', 'fighter', { level: 2, multiclass: [{ id: 'wizard' }], classSequence: ['fighter', 'wizard'] });
  assert.equal(isArmorProficient(mc2, 'plate'), true);
});

test('ouro inicial soma classe + antecedente; riqueza 2014 substitui o antecedente', () => {
  const w = (rules, classPack, backgroundPack) => mk(rules, 'wizard', { creation: { classPack, backgroundPack } });
  assert.equal(startingGold(w('2024', 'A', 'A')), 13);
  assert.equal(startingGold(w('2024', 'B', 'B')), 105);
  assert.equal(startingGold(w('2024', null, null)), 0);
  assert.equal(startingGold(w('2014', 'A')), 10);
  assert.equal(startingGold(w('2014', 'C')), 100);
});

test('magias no nível 1', () => {
  assert.deepEqual(startingSpells(mk('2024', 'cleric')), { cantrips: 3, prepared: 4, spellbook: 0, mode: 'prepared' });
  assert.equal(startingSpells(mk('2014', 'cleric')).prepared, 4); // SAB 16 (+3) + 1
  assert.equal(startingSpells(mk('2014', 'wizard')).spellbook, 6);
  assert.equal(startingSpells(mk('2014', 'artificer')).prepared, 3); // INT +3, metade do nível 0
  assert.equal(startingSpells(mk('2014', 'artificer', { abilities: { int: 8 } })).prepared, 1);
  assert.equal(startingSpells(mk('2014', 'sorcerer')).mode, 'known');
  assert.equal(startingSpells(mk('2014', 'ranger')).mode, 'none');
  assert.equal(startingSpells(mk('2024', 'fighter')).mode, 'none');
});

test('ferramentas: fixas sem repetição e escolhas por origem', () => {
  const t = startingTools(mk('2024', 'rogue', { background: 'criminal' }));
  assert.deepEqual(t.fixed, ['thievesTools']);
  assert.deepEqual(t.choices, []);
  const bard = startingTools(mk('2024', 'bard', { background: 'soldier' }));
  assert.deepEqual(bard.choices.map(c => [c.source, c.count, c.category]), [['class', 3, 'instrument'], ['background', 1, 'gaming']]);
});

test('pacote com itens fora da proficiência é sinalizado', () => {
  const cleric = mk('2014', 'cleric');
  const c = packFor(classStart(cleric), 'C');
  assert.deepEqual(packProficiencyIssues(cleric, c).map(i => i.id), ['warhammer', 'chainMail']);
  assert.deepEqual(packProficiencyIssues(cleric, packFor(classStart(cleric), 'A')), []);
  for (const rules of ['2024', '2014']) {
    for (const id of CLASSES) {
      const ch = mk(rules, id);
      // O pacote A de cada classe nunca deve vir com algo que ela não sabe usar.
      assert.deepEqual(packProficiencyIssues(ch, packFor(classStart(ch), 'A')), [], `${rules} ${id}`);
    }
  }
});

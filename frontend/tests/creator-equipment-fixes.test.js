// Correções do teste de navegador (equipamento): ferramenta escolhida, maestria,
// itens repetidos, conteúdo dos pacotes por regra e armadura sem treino.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCharacter } from '../src/creator/creation.js';
import {
  applyStartingEquipment, equipmentIssues, equipmentWarnings, packLines, packContents, needsReapply,
  masteriesWithoutWeapon, damageTypeLabel,
} from '../src/creator/equipment-helpers.js';
import { CLASS_START } from '../src/creator/start-data.js';

const mk = (rulesVersion, className, background, creation = {}, extra = {}) => ({
  ...newCharacter(rulesVersion), className, background, creation,
  abilities: { str: 15, dex: 14, con: 13, int: 10, wis: 12, cha: 8 }, ...extra,
});

test('Monge: a ferramenta escolhida em Escolhas da classe vira o item (nunca o texto placeholder)', () => {
  const picks = [{ classId: 'monk', pool: 'tool', id: 'flute', level: 1 }];
  const c = applyStartingEquipment(mk('2024', 'monk', 'sage', { classPack: 'A', backgroundPack: 'B' }, { classOptions: picks }), 'pt');
  assert.ok(c.equipment.some(e => e.name === 'Flauta'), JSON.stringify(c.equipment));
  assert.ok(!c.equipment.some(e => /escolhid/i.test(e.name)));
  const line = packLines(CLASS_START['2024'].monk.equipment[0], c, 'pt').find(l => /Flauta/.test(l.text));
  assert.ok(line);
});

test('Monge sem escolha ainda: o placeholder não é gravado; escolher depois pede reaplicar', () => {
  const base = applyStartingEquipment(mk('2024', 'monk', 'sage', { classPack: 'A', backgroundPack: 'B' }), 'pt');
  assert.ok(!base.equipment.some(e => /escolhid/i.test(e.name)));
  const lines = packLines(CLASS_START['2024'].monk.equipment[0], base, 'pt');
  assert.ok(lines.some(l => /Escolhas da classe/.test(l.hint)));
  const picked = { ...base, classOptions: [{ classId: 'monk', pool: 'tool', id: 'lute', level: 1 }] };
  assert.equal(needsReapply(picked, 'pt'), true);
  assert.ok(applyStartingEquipment(picked, 'pt').equipment.some(e => e.name === 'Alaúde'));
});

test('Bardo: instrumento do pacote é um dos escolhidos em Escolhas da classe', () => {
  const picks = ['flute', 'drum', 'lyre'].map((id, i) => ({ classId: 'bard', pool: i ? 'musicalInstrumentStart' : 'musicalInstrument', id, level: 1 }));
  const c = applyStartingEquipment(mk('2024', 'bard', 'sage', { classPack: 'A', backgroundPack: 'B' }, { classOptions: picks }), 'pt');
  assert.ok(c.equipment.some(e => e.name === 'Flauta'));
});

test('Antecedente: ferramenta escolhida (toolChoices.background) vira o item', () => {
  const c = applyStartingEquipment(mk('2024', 'fighter', 'artisan', { classPack: 'C', backgroundPack: 'A', toolChoices: { background: ['smithsTools'] } }), 'pt');
  const names = c.equipment.map(e => e.name);
  assert.ok(!names.some(n => /escolhid/i.test(n)), names.join(', '));
  assert.equal(c.equipment.filter(e => e.from === 'backgroundPack').length, 3);
});

test('itens iguais da classe e do antecedente se juntam (Ladino + Criminoso)', () => {
  const c = applyStartingEquipment(mk('2024', 'rogue', 'criminal', { classPack: 'A', backgroundPack: 'A' }), 'pt');
  const daggers = c.weapons.filter(w => w.id === 'dagger');
  assert.equal(daggers.length, 1);
  assert.equal(daggers[0].qty, 4);
  const tools = c.equipment.filter(e => e.name === 'Ferramentas de Ladrão');
  assert.equal(tools.length, 1);
  assert.equal(tools[0].qty, 2);
  const again = applyStartingEquipment(c, 'pt');
  assert.deepEqual(again.weapons, c.weapons, 'idempotente');
});

test('conteúdo dos pacotes de aventura depende da regra', () => {
  const c14 = { rulesVersion: '2014' }; const c24 = { rulesVersion: '2024' };
  assert.match(packContents('dungeoneer', c14), /martelo/);
  assert.doesNotMatch(packContents('dungeoneer', c14), /estrepes|óleo/);
  assert.match(packContents('dungeoneer', c24), /estrepes/);
  assert.match(packContents('explorer', c14), /kit de refeição/);
  assert.match(packContents('priest', c14), /incens/);
  assert.doesNotMatch(packContents('priest', c14), /água benta/);
  assert.match(packContents('scholar', c14), /saquinho de areia/);
  const lines = packLines(CLASS_START['2014'].fighter.equipment[0], mk('2014', 'fighter', 'sage'), 'pt');
  assert.ok(lines.some(l => /pítons/.test(l.hint)));
});

test('maestria em arma que o pacote não traz gera aviso (não pendência)', () => {
  const classOptions = [
    { classId: 'barbarian', pool: 'weaponMastery', id: 'handaxe', level: 1 },
    { classId: 'barbarian', pool: 'weaponMastery', id: 'greataxe', level: 1 },
  ];
  const withA = applyStartingEquipment(mk('2024', 'barbarian', 'farmer', { classPack: 'A', backgroundPack: 'A' }, { classOptions }), 'pt');
  assert.deepEqual(masteriesWithoutWeapon(withA), []);
  const withB = applyStartingEquipment({ ...withA, creation: { ...withA.creation, classPack: 'B' } }, 'pt');
  assert.deepEqual(masteriesWithoutWeapon(withB).sort(), ['greataxe', 'handaxe']);
  const w = equipmentWarnings(withB).find(x => x.id === 'masteryMismatch');
  assert.ok(w);
  assert.match(w.pt, /Machadinha/);
  assert.deepEqual(equipmentIssues(withB), [], 'só aviso, não trava');
  assert.deepEqual(masteriesWithoutWeapon({ ...withB, rulesVersion: '2014' }), [], '2014 não tem maestria');
});

test('Clérigo 2014: trocar de Vida para Conhecimento com o pacote C (Cota de Malha) vira pendência', () => {
  const life = applyStartingEquipment(mk('2014', 'cleric', 'acolyte', { classPack: 'C' }, {
    subclass: 'life', classOptions: [{ classId: 'cleric', pool: 'legacyDomainProficiencies', id: 'lifeProficiency', level: 1 }],
  }), 'pt');
  assert.equal(life.armor, 'chainMail');
  assert.deepEqual(equipmentIssues(life), []);
  const knowledge = { ...life, subclass: 'knowledge', classOptions: [] };
  const issues = equipmentIssues(knowledge);
  assert.equal(issues.length, 1);
  assert.match(issues[0].pt, /Cota de Malha/);
  assert.match(issues[0].pt, /outro pacote/);
  const fixed = applyStartingEquipment({ ...knowledge, creation: { ...knowledge.creation, classPack: 'A' } }, 'pt');
  assert.deepEqual(equipmentIssues(fixed), []);
});

test('nenhum pacote padrão de classe trava por armadura sem treino', () => {
  for (const rules of ['2024', '2014']) {
    for (const [cls, s] of Object.entries(CLASS_START[rules])) {
      if (rules === '2014' && cls === 'cleric') continue; // pacote C é só para domínios com armadura pesada
      for (const p of s.equipment) {
        const c = applyStartingEquipment(mk(rules, cls, 'sage', { classPack: p.id, backgroundPack: 'A' }), 'pt');
        assert.ok(!equipmentIssues(c).some(i => i.id === 'packArmorTraining'), `${rules} ${cls} ${p.id}`);
      }
    }
  }
});

test('tipos de dano com os mesmos nomes dos talentos', () => {
  assert.equal(damageTypeLabel('bludgeoning', 'pt'), 'contundente');
  assert.equal(damageTypeLabel('piercing', 'pt'), 'perfurante');
  assert.equal(damageTypeLabel('slashing', 'pt'), 'cortante');
});

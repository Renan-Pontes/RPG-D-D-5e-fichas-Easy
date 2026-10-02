import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCharacter } from '../src/creator/creation.js';
import { CLASS_START, BACKGROUND_START } from '../src/creator/start-data.js';
import {
  applyStartingEquipment, equipmentIssues, equipmentWarnings, selectedPacks, needsReapply, versatileDamage,
  weaponEntry, packLines, acPreview, rangeLabel,
} from '../src/creator/equipment-helpers.js';
import SRD from '../data/srd.js';

const mk = (rulesVersion, className, background, creation = {}, extra = {}) => ({
  ...newCharacter(rulesVersion), className, background, creation,
  abilities: { str: 15, dex: 14, con: 13, int: 10, wis: 12, cha: 8 }, ...extra,
});
const fromPack = (list) => list.filter(x => x.from === 'classPack' || x.from === 'backgroundPack');

test('issues: pede pacote da classe e do antecedente (2024)', () => {
  const c = mk('2024', 'fighter', 'sage');
  const issues = equipmentIssues(c);
  assert.equal(issues.length, 2);
  assert.match(issues[0].pt, /classe/);
  assert.match(issues[1].pt, /antecedente/);
  const done = applyStartingEquipment(mk('2024', 'fighter', 'sage', { classPack: 'A', backgroundPack: 'B' }));
  assert.deepEqual(equipmentIssues(done), []);
});

test('issues: sem classe nem antecedente não trava; 2014 antecedente único não pede escolha', () => {
  assert.deepEqual(equipmentIssues(mk('2024', '', '')), []);
  const c = mk('2014', 'fighter', 'sage', { classPack: 'A' });
  assert.equal(selectedPacks(c).needsBackgroundChoice, false);
  assert.ok(selectedPacks(c).backgroundPack, 'pacote único do antecedente 2014 é aplicado sozinho');
  assert.deepEqual(equipmentIssues(applyStartingEquipment(c)), []);
});

test('issues: avisa quando a classe mudou depois de aplicar', () => {
  const c = applyStartingEquipment(mk('2024', 'fighter', 'sage', { classPack: 'A', backgroundPack: 'A' }));
  const changed = { ...c, className: 'wizard' };
  assert.equal(needsReapply(changed, 'pt'), true);
  assert.equal(equipmentIssues({ ...changed, creation: { ...changed.creation, classPack: 'A' } }).length, 1);
});

test('aplica Guerreiro A + Sábio A (2024): armadura, armas com stats SRD, itens e ouro', () => {
  const c = applyStartingEquipment(mk('2024', 'fighter', 'sage', { classPack: 'A', backgroundPack: 'A' }), 'pt');
  assert.equal(c.armor, 'chainMail');
  assert.equal(c.hasShield, false);
  assert.equal(c.coins.gp, 4 + 8);
  const ids = c.weapons.map(w => w.id);
  assert.deepEqual(ids, ['greatsword', 'flail', 'javelin', 'quarterstaff']);
  const jav = c.weapons.find(w => w.id === 'javelin');
  assert.equal(jav.qty, 8);
  assert.equal(jav.range, '30/120');
  assert.equal(jav.mastery, 'slow');
  const staff = c.weapons.find(w => w.id === 'quarterstaff');
  assert.equal(staff.versatile, '1d8');
  assert.equal(staff.from, 'backgroundPack');
  assert.ok(c.equipment.some(e => e.name === 'Túnica' && e.from === 'backgroundPack'));
  assert.ok(c.equipment.every(e => e.from));
});

test('idempotente e troca sem duplicar, preservando itens manuais', () => {
  let c = mk('2024', 'fighter', 'sage', { classPack: 'A', backgroundPack: 'A' });
  c = applyStartingEquipment(c);
  const once = JSON.stringify(c);
  c = applyStartingEquipment(c);
  assert.equal(JSON.stringify(c), once, 'aplicar de novo não muda nada');

  // Manuais: arma, item e 3 PO a mais.
  c = {
    ...c,
    weapons: [...c.weapons, weaponEntry('dagger', c, 'pt', { from: 'manual' })],
    equipment: [...c.equipment, { name: 'Corda extra', qty: 1, from: 'manual' }],
    coins: { ...c.coins, gp: c.coins.gp + 3 },
  };
  c = applyStartingEquipment({ ...c, creation: { ...c.creation, classPack: 'B' } });
  assert.equal(c.armor, 'studdedLeather');
  assert.deepEqual(fromPack(c.weapons).map(w => w.id), ['scimitar', 'shortsword', 'longbow', 'quarterstaff']);
  assert.ok(c.weapons.some(w => w.id === 'dagger' && w.from === 'manual'));
  assert.ok(c.equipment.some(e => e.name === 'Corda extra'));
  assert.equal(c.coins.gp, 11 + 8 + 3);

  c = applyStartingEquipment({ ...c, creation: { ...c.creation, classPack: 'C', backgroundPack: 'B' } });
  assert.equal(c.armor, null, 'pacote só de ouro tira a armadura do pacote anterior');
  assert.deepEqual(fromPack(c.weapons), []);
  assert.deepEqual(fromPack(c.equipment), []);
  assert.equal(c.coins.gp, 155 + 50 + 3);
  assert.equal(c.weapons.length, 1);
});

test('escudo do pacote entra e sai; armadura escolhida à mão sobrevive a pacote sem armadura', () => {
  let c = applyStartingEquipment(mk('2024', 'cleric', 'acolyte', { classPack: 'A', backgroundPack: 'B' }));
  assert.equal(c.hasShield, true);
  assert.equal(c.armor, 'chainShirt');
  assert.equal(c.coins.gp, 7 + 50);
  c = applyStartingEquipment({ ...c, creation: { ...c.creation, classPack: 'B' } });
  assert.equal(c.hasShield, false);
  assert.equal(c.armor, null);
  c = applyStartingEquipment({ ...c, armor: 'breastplate' });
  assert.equal(c.armor, 'breastplate', 'armadura manual fica');
});

test('2014: riqueza inicial substitui o antecedente; ferramenta escolhida aparece pelo nome', () => {
  let c = applyStartingEquipment(mk('2014', 'barbarian', 'acolyte', { classPack: 'A' }));
  const bg = BACKGROUND_START['2014'].acolyte.equipment[0];
  assert.equal(c.coins.gp, bg.gp);
  assert.equal(c.weapons.find(w => w.id === 'handaxe').qty, 2);
  assert.equal(c.weapons.find(w => w.id === 'greataxe').mastery, undefined, 'sem maestria em 2014');
  c = applyStartingEquipment({ ...c, creation: { ...c.creation, classPack: 'C' } });
  assert.equal(selectedPacks(c).bgReplaced, true);
  assert.deepEqual(fromPack(c.equipment), []);
  assert.equal(c.coins.gp, 50);
  assert.deepEqual(equipmentIssues(c), []);

  const bard = applyStartingEquipment(mk('2024', 'bard', 'sage', { classPack: 'A', backgroundPack: 'B' }, { toolProfs: ['flute', 'lute', 'drum'] }), 'pt');
  assert.ok(bard.equipment.some(e => e.name === 'Flauta'));
});

test('troca de classe descarta pacote inexistente e itens do pacote antigo', () => {
  let c = applyStartingEquipment(mk('2024', 'fighter', 'sage', { classPack: 'C', backgroundPack: 'A' }));
  c = applyStartingEquipment({ ...c, className: 'wizard' });
  assert.equal(c.creation.classPack, undefined);
  assert.equal(c.coins.gp, 8);
  assert.equal(equipmentIssues(c).length, 1);
});

test('avisos: sem treino, Força mínima, Defesa sem Armadura e arma sem proficiência', () => {
  const wiz = { ...mk('2024', 'wizard', 'sage'), armor: 'plate', hasShield: true };
  const ids = equipmentWarnings(wiz).map(w => w.id);
  assert.ok(ids.includes('armorTraining'));
  assert.ok(ids.includes('shieldTraining'));
  assert.match(equipmentWarnings(wiz)[0].pt, /não pode conjurar/);
  assert.ok(!ids.includes('strReq'), 'FOR 15 basta para Placas');
});

test('Força mínima: avisa abaixo, não avisa igual; anão 2014 é isento', () => {
  const weak = { ...mk('2024', 'fighter', 'sage'), armor: 'plate', abilities: { str: 13, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } };
  assert.ok(equipmentWarnings(weak).some(w => w.id === 'strReq'));
  const ok = { ...weak, abilities: { ...weak.abilities, str: 15 } };
  assert.ok(!equipmentWarnings(ok).some(w => w.id === 'strReq'));
  const dwarf = { ...weak, rulesVersion: '2014', race: 'dwarf-mountain' };
  assert.ok(!equipmentWarnings(dwarf).some(w => w.id === 'strReq'));
  const barb = { ...mk('2024', 'barbarian', 'sage'), armor: 'hide' };
  assert.ok(equipmentWarnings(barb).some(w => w.id === 'unarmored'));
  const bard14 = { ...mk('2014', 'bard', 'sage'), weapons: [weaponEntry('crossbowHand', { rulesVersion: '2014' })] };
  assert.ok(!equipmentWarnings(bard14).some(w => w.id === 'weaponProf'), 'bardo 2014 usa besta de mão');
  const wiz24 = { ...mk('2024', 'wizard', 'sage'), weapons: [weaponEntry('longsword', { rulesVersion: '2024' })] };
  assert.ok(equipmentWarnings(wiz24).some(w => w.id === 'weaponProf'));
});

test('CA resultante usa Utils.computeAc', () => {
  const c = applyStartingEquipment(mk('2024', 'paladin', 'sage', { classPack: 'A', backgroundPack: 'B' }));
  assert.equal(acPreview(c).ac, 16 + 2);
  const monk = applyStartingEquipment(mk('2024', 'monk', 'sage', { classPack: 'A', backgroundPack: 'B' }));
  assert.equal(acPreview(monk).ac, 10 + 2 + 1);
});

test('dano versátil e alcance seguem o SRD nas duas regras', () => {
  const v = (id, r) => versatileDamage(SRD.weaponFor(id, r));
  assert.equal(v('longsword', '2024'), '1d10');
  assert.equal(v('trident', '2014'), '1d8');
  assert.equal(v('trident', '2024'), '1d10');
  assert.equal(v('warPick', '2024'), '1d10');
  assert.equal(v('warPick', '2014'), null);
  assert.equal(v('dagger', '2024'), null);
  assert.equal(rangeLabel('20/60', 'pt'), '6/18 m');
  assert.equal(rangeLabel('20/60', 'en'), '20/60 ft');
});

test('todos os pacotes de todas as classes/antecedentes aplicam sem item desconhecido', () => {
  for (const rules of ['2024', '2014']) {
    for (const [cls, s] of Object.entries(CLASS_START[rules])) {
      for (const p of s.equipment) {
        const c = applyStartingEquipment(mk(rules, cls, 'sage', { classPack: p.id, backgroundPack: 'A' }), 'en');
        const weaponItems = p.items.filter(i => i.kind === 'weapon');
        assert.equal(fromPack(c.weapons).filter(w => w.from === 'classPack').length, weaponItems.length, `${rules} ${cls} ${p.id}`);
        assert.ok(packLines(p, c, 'pt').every(l => l.text && !/undefined/.test(l.text)), `${rules} ${cls} ${p.id}`);
      }
    }
  }
});

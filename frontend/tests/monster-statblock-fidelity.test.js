import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convert5eToolsMonster,
  fetchMonsterFromUrl,
} from '../src/campaigns/url-monster-importer.js';
import { monsterForCombat } from '../data/bestiary.js';

test('1:1 Fidelity - Homebrew Construct (Merchantman): All statblock sections intact', async () => {
  const { monster } = await fetchMonsterFromUrl('https://5e.tools/bestiary.html#merchantman_irknemp', { lang: 'pt' });

  assert.ok(monster, 'Monster should exist');
  assert.equal(monster.name.pt, 'Merchantman');
  assert.equal(monster.typeLine, 'Large construct, unaligned');
  assert.equal(monster.acText, '16 (natural armor)');
  assert.equal(monster.hpText, '42 (4d10+20)');
  assert.equal(monster.speedText, '40 ft.');
  assert.equal(monster.saveText, 'STR +5, CON +6');
  assert.equal(monster.skillText, 'Athletics +5, Perception +2');
  assert.equal(monster.resistText, 'bludgeoning, piercing, slashing from nonmagical attacks');
  assert.equal(monster.immuneText, 'poison, psychic');
  assert.equal(monster.conditionImmuneText, 'charmed, frightened, paralyzed, petrified, poisoned');
  assert.equal(monster.senses, 'passive Perception 12');
  assert.equal(monster.languages, "understands the languages of its manufacturer but can't speak");
  assert.equal(monster.cr, '3');
  assert.equal(monster.xp, 700);
  assert.equal(monster.proficiencyBonus, 2);
  assert.equal(monster.traits.length, 3);
  assert.ok(monster.traits.some(t => t.name.en === 'Cortex'));
  assert.ok(monster.traits.some(t => t.name.en === 'Heavy Metal'));
  assert.ok(monster.traits.some(t => t.name.en === 'Steam Powered'));
  assert.equal(monster.actions.length, 2);
  assert.ok(monster.actions.some(a => a.name.en === 'Multiattack'));
  assert.ok(monster.actions.some(a => a.name.en === 'Slam'));
  assert.ok(monster.raw5eTools, 'Raw 5e.tools object should be preserved');
});

test('1:1 Fidelity - Clapped-Out Steamjack: Non-standard damage fallback & subtype parsing', async () => {
  const { monster } = await fetchMonsterFromUrl('https://5e.tools/bestiary.html#clapped-out%20steamjack_irkcore', { lang: 'pt' });

  assert.ok(monster);
  assert.equal(monster.name.pt, 'Clapped-Out Steamjack');
  assert.equal(monster.typeLine, 'Medium construct (steamjack), unaligned');
  assert.equal(monster.acText, '12 (natural armor)');
  assert.equal(monster.hpText, '28 (3d8 + 15)');
  assert.equal(monster.speedText, '30 ft.');
  assert.equal(monster.cr, '0');
  assert.equal(monster.xp, 10);
  assert.equal(monster.proficiencyBonus, 2);
  assert.equal(monster.traits.length, 3);

  const slam = monster.actions.find(a => a.name.en === 'Slam');
  assert.ok(slam, 'Slam action must exist');
  assert.equal(slam.damage, '1d8', 'Damage die should be extracted from formula without average');
  assert.equal(slam.damageType, 'bludgeoning');
});

test('1:1 Fidelity - Sphinx (irkbnb): Subtype, saves, and natural armor fidelity', async () => {
  const { monster } = await fetchMonsterFromUrl('https://5e.tools/bestiary.html#sphinx_irkbnb', { lang: 'pt' });

  assert.ok(monster);
  assert.equal(monster.name.pt, 'Sphinx');
  assert.equal(monster.typeLine, 'Large construct (myrmidon), unaligned');
  assert.equal(monster.acText, '17 (natural armor)');
  assert.equal(monster.hpText, '105 (10d10+50)');
  assert.equal(monster.speedText, '30 ft.');
  assert.equal(monster.saveText, 'CON +8');
  assert.equal(monster.skillText, 'Athletics +8, Perception +3');
  assert.equal(monster.cr, '6');
  assert.equal(monster.xp, 2300);
  assert.equal(monster.proficiencyBonus, 3);
  assert.equal(monster.traits.length, 3);
  assert.ok(monster.traits.some(t => t.name.en === 'Arcane Condenser'));
});

test('1:1 Fidelity - Adult Red Dragon: Legendary resistances and legendary actions', async () => {
  const { monster } = await fetchMonsterFromUrl('https://5e.tools/bestiary.html#adult%20red%20dragon_mm', { lang: 'pt' });

  assert.ok(monster);
  assert.equal(monster.typeLine, 'Huge dragon, chaotic evil');
  assert.equal(monster.acText, '19 (natural armor)');
  assert.equal(monster.cr, '17');
  assert.equal(monster.xp, 18000);
  assert.equal(monster.proficiencyBonus, 6);
  assert.equal(monster.immuneText, 'fire');
  assert.ok(monster.legendary, 'Must have legendary object');
  assert.equal(monster.legendary.uses, 3);
  assert.equal(monster.legendary.actions.length, 3);
  assert.ok(monster.legendary.actions.some(a => a.name.en === 'Wing Attack'));
  assert.ok(monster.legendaryResistance, 'Must have legendary resistance object');
  assert.equal(monster.legendaryResistance.uses, 3);
});

test('1:1 Fidelity - Combat Snapshot Bundling: monsterForCombat tags actions and retains all 1:1 properties', async () => {
  const { monster } = await fetchMonsterFromUrl('https://5e.tools/bestiary.html#adult%20red%20dragon_mm', { lang: 'pt' });
  const snapshot = monsterForCombat(monster);

  assert.ok(snapshot.combatReady, 'Snapshot must be marked combatReady');
  assert.equal(snapshot.typeLine, 'Huge dragon, chaotic evil');
  assert.equal(snapshot.acText, '19 (natural armor)');
  assert.equal(snapshot.hpText, monster.hpText);
  assert.equal(snapshot.speedText, monster.speedText);
  assert.equal(snapshot.saveText, monster.saveText);
  assert.equal(snapshot.skillText, monster.skillText);
  assert.equal(snapshot.immuneText, 'fire');
  assert.equal(snapshot.proficiencyBonus, 6);
  assert.ok(snapshot.actions.some(a => a.kind === 'action'));
  assert.ok(snapshot.actions.some(a => a.kind === 'legendary'));
});

test('1:1 Fidelity - D&D 5e 2024 Layout Structure: Initiative, 6-col Ability Check & Save Buttons', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, resolve } = await import('node:path');
  const __dirname = dirname(fileURLToPath(import.meta.url));

  const compSrc = readFileSync(resolve(__dirname, '../src/combat/MonsterStatblock.jsx'), 'utf8');
  assert.ok(compSrc.includes('statblock-prop-init'), 'MonsterStatblock includes Initiative in primary metrics');
  assert.ok(compSrc.includes('statblock-roll-btn init-btn'), 'MonsterStatblock includes interactive Initiative roll button');
  assert.ok(compSrc.includes('dnd-2024-grid'), 'MonsterStatblock uses 2024 ability grid');
  assert.ok(compSrc.includes('statblock-roll-btn abil-btn'), 'MonsterStatblock provides interactive Ability Check roll buttons');
  assert.ok(compSrc.includes('statblock-roll-btn save-btn'), 'MonsterStatblock provides interactive Saving Throw roll buttons');
  assert.ok(compSrc.includes('statblock-skill-chip'), 'MonsterStatblock provides interactive skill chips');

  const cssSrc = readFileSync(resolve(__dirname, '../src/combat/monster-statblock.css'), 'utf8');
  assert.ok(cssSrc.includes('.statblock-prop-init'), 'monster-statblock.css includes .statblock-prop-init');
  assert.ok(cssSrc.includes('.statblock-roll-btn.abil-btn'), 'monster-statblock.css styles .abil-btn');
  assert.ok(cssSrc.includes('.statblock-roll-btn.save-btn'), 'monster-statblock.css styles .save-btn');
  assert.ok(cssSrc.includes('.statblock-skill-chip'), 'monster-statblock.css styles .statblock-skill-chip');
});

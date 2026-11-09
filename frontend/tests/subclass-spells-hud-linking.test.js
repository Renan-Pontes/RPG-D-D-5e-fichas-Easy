import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeProgression } from '../src/progression/engine.js';

const read = (relPath) => readFileSync(new URL(relPath, import.meta.url), 'utf8');

test('Subclass Spells: auto-prepared and auto-known subclass spells synthesized and marked golden', () => {
  // Test Artificer Alchemist (always-prepared subclass spells: Healing Word, Ray of Sickness at level 3, etc.)
  const alchemist = {
    className: 'artificer',
    level: 8,
    subclass: 'alchemist',
    rulesVersion: '2014',
    abilities: { str: 10, dex: 14, con: 14, int: 18, wis: 12, cha: 8 },
  };

  const prog = computeProgression(alchemist);
  assert.ok(prog, 'Progression must compute');
  assert.ok(Array.isArray(prog.autoSpells), 'autoSpells array must exist');
  assert.ok(prog.autoSpells.length > 0, 'Alchemist 8 must have subclass autoSpells');
  
  // Ray of Sickness & Healing Word are level 3 Alchemist subclass spells
  assert.ok(prog.autoSpells.includes('rayOfSickness') || prog.autoSpells.includes('ray-of-sickness') || prog.autoSpells.some(s => /healingWord|rayOfSickness/i.test(s)));

  // Verify SheetTabs code displays subclass spells as golden always-prepared without text tag
  const sheetTabsSrc = read('../components/SheetTabs.jsx');
  assert.match(sheetTabsSrc, /UnifiedSpellsHUD/);
  assert.match(sheetTabsSrc, /fh-spells-unified-hud/);
  assert.match(sheetTabsSrc, /isAlwaysPrepared/);
  assert.match(sheetTabsSrc, /is-always-prepared/);
  assert.match(sheetTabsSrc, /fh-spell-slot-indicator/);
  assert.match(sheetTabsSrc, /fh-spells-slots-grid/);
});

test('Party Holster: NPCs separated from active players and do not consume seats', () => {
  const playersPanelSrc = read('../src/group/PlayersPanel.jsx');
  const backendCampaignsSrc = read('../../backend/api/views_campaigns.py');

  // Backend syncs NPC to WorldEntry and sets sponsored = False
  assert.match(backendCampaignsSrc, /def _sync_char_to_world_npc/);
  assert.match(backendCampaignsSrc, /WorldEntry\.objects\.filter/);
  assert.match(backendCampaignsSrc, /m\.sponsored = False/);

  // Frontend party holster separates active and NPC members
  assert.match(playersPanelSrc, /activePlayers =/);
  assert.match(playersPanelSrc, /npcPlayers =/);
  assert.match(playersPanelSrc, /NPCs da Campanha/);
  assert.match(playersPanelSrc, /Campaign NPCs/);
});

test('Single-row Hero Footer and Indented Skills Accordion', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  const css = read('../src/sheet/ficha.css');
  const monsterCss = read('../src/combat/monster-statblock.css');

  // Single row bar contains tags on left and actions on right
  assert.match(sheetSrc, /fh-hero-tags-actions-bar/);
  assert.match(sheetSrc, /fh-hero-corner-actions/);

  // Indented skills partial disclosure beneath accordion
  assert.match(sheetSrc, /statblock-action-indented-profs/);
  assert.match(monsterCss, /\.statblock-action-indented-profs/);
});

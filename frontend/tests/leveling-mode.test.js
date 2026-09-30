import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import { buildSheetData } from '../src/pdf/sheet-data.js';

const base = extra => ({ ...Utils.makeNew(), className: 'fighter', level: 3, race: 'human', background: 'soldier', xp: 1200, ...extra });

test('a campanha decide o modo de progressão; fora dela vale o da ficha', () => {
  assert.equal(Utils.levelingMode(base({ levelingMode: 'xp', campaignLeveling: 'milestone' })), 'milestone');
  assert.equal(Utils.levelingMode(base({ levelingMode: 'milestone', campaignLeveling: 'xp' })), 'xp');
  assert.equal(Utils.levelingMode(base({ levelingMode: 'milestone', campaignLeveling: null })), 'milestone');
  assert.equal(Utils.levelingMode({ ...base(), levelingMode: undefined }), 'xp'); // fichas antigas
});

test('PDF mostra "Marcos" em campanha por marcos e o XP em campanha por XP', () => {
  assert.equal(buildSheetData(base({ campaignLeveling: 'milestone' }), 'pt').fields.XP, 'Marcos');
  assert.equal(buildSheetData(base({ campaignLeveling: 'xp' }), 'pt').fields.XP, '1200');
});

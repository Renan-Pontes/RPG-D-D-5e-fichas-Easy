import test from 'node:test';
import assert from 'node:assert/strict';
import { FEATS, findFeat } from '../data/feats.js';

test('every SRD feat carries its official text; paid feats do not', () => {
  const srd = FEATS.filter(f => f.source === 'SRD');
  assert.equal(srd.length, 18); // 17 do SRD 5.2.1 + Agarrador do SRD 5.1
  for (const f of srd) assert.ok(f.srdText?.en.length > 40, f.id);
  assert.match(findFeat('alert').srdText.en, /Initiative Swap/);
  assert.match(findFeat('grappler2014').srdText.en, /pin a creature/);
  assert.equal(findFeat('actor2014').srdText, undefined);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { FEATS, findFeat } from '../data/feats.js';

test('every feat carries official 1:1 EN and metric PT-BR text', () => {
  const srd = FEATS.filter(f => f.source === 'SRD');
  assert.equal(srd.length, 18); // 17 do SRD 5.2.1 + Agarrador do SRD 5.1
  assert.equal(FEATS.length, 180);
  const forbiddenPt = /\b(SAL|pés|HP|feet|ft)\b/;
  for (const f of FEATS) {
    assert.ok(f.srdText?.en.length > 35, `missing EN official text: ${f.id}`);
    assert.ok(f.srdText?.pt.length > 35, `missing PT official text: ${f.id}`);
    assert.ok(!forbiddenPt.test(f.srdText.pt), `forbidden PT token in srdText.pt: ${f.id}`);
    if (f.desc?.pt) assert.ok(!forbiddenPt.test(f.desc.pt), `forbidden PT token in desc.pt: ${f.id}`);
  }
  assert.match(findFeat('alert').srdText.en, /Initiative Swap/);
  assert.match(findFeat('grappler2014').srdText.en, /pin a creature/);
  assert.match(findFeat('actor2014').srdText.en, /mimic the speech/);
  assert.match(findFeat('crafter').srdText.en, /Artisan's Tools/);
  assert.match(findFeat('feyTouched').srdText.en, /Misty Step/);
  assert.match(findFeat('giftOfTheGemDragon').srdText.en, /Telekinetic Reprisal/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isWizardEnabled, stateWithWizard, encounterSummary, suggestXp, xpRecipients, diaryDraft, wizardSteps,
} from '../src/campaigns/end-of-encounter.js';

const combat = {
  active: false, round: 4,
  combatants: [
    { id: 'a', type: 'pc', name: 'Ana', character_id: 5, current_hp: 12 },
    { id: 'b', type: 'pc', name: 'Kor', character_id: 6, current_hp: 0 },
    { id: 'g1', type: 'monster', name: 'Goblin #1', monster_id: 'goblin', current_hp: 0, defeated: true, stats: {} },
    { id: 'g2', type: 'monster', name: 'Goblin #2', monster_id: 'goblin', current_hp: 3, stats: {} },
    { id: 'o', type: 'monster', name: 'Ogro', monster_id: 'ogre', current_hp: 0, stats: {} },
  ],
};
const lookup = (id) => ({ goblin: { cr: '1/4' }, ogre: { cr: 2 } }[id] || null);

test('opt-in: desligado por padrão', () => {
  assert.equal(isWizardEnabled({}), false);
  assert.equal(isWizardEnabled(undefined), false);
  assert.equal(isWizardEnabled({ endOfEncounterWizard: 'sim' }), false);
  const s = stateWithWizard({ scene: 'Ponte' }, true);
  assert.equal(isWizardEnabled(s), true);
  assert.equal(s.scene, 'Ponte');
  assert.equal(isWizardEnabled(stateWithWizard(s, false)), false);
});

test('resumo: rodadas, derrotados (0 PV conta), de pé e PJs caídos', () => {
  const s = encounterSummary(combat);
  assert.equal(s.rounds, 4);
  assert.deepEqual(s.defeated, ['Goblin #1', 'Ogro']);
  assert.deepEqual(s.standing, ['Goblin #2']);
  assert.deepEqual(s.fallenPcs, ['Kor']);
  assert.deepEqual(s.pcCharacterIds, [5, 6]);
  assert.equal(encounterSummary(null).rounds, 1);
});

test('XP sugerido pelo ND (SRD): total e só derrotados', () => {
  const xp = suggestXp(combat, lookup);
  assert.equal(xp.total, 50 + 50 + 450);
  assert.equal(xp.defeatedXp, 50 + 450);
  assert.equal(xp.estimated, false);
  assert.equal(suggestXp({ combatants: [] }, lookup).total, 0);
});

test('XP vai para os PJs do combate que ainda estão na mesa; sem nenhum, a mesa toda', () => {
  const camp = { members: [{ role: 'dm', user: { id: 1 } }, { role: 'player', character: { id: 5 } }, { role: 'player', character: { id: 9 } }] };
  assert.deepEqual(xpRecipients(combat, camp), [5]);
  assert.equal(xpRecipients({ combatants: [] }, camp), 'all');
});

test('rascunho do Diário: editável, com cena, rodadas e derrotados', () => {
  const d = diaryDraft(combat, { lang: 'pt', scene: 'Ponte de pedra' });
  assert.equal(d.title, 'Combate — Ponte de pedra');
  assert.match(d.body, /após 4 rodadas/);
  assert.match(d.body, /Derrotados: Goblin #1 e Ogro/);
  assert.match(d.body, /Ainda de pé.*Goblin #2/);
  assert.match(d.body, /Caíram durante a luta: Kor/);
  const en = diaryDraft({ round: 1, combatants: [] }, { lang: 'en' });
  assert.equal(en.title, 'Combat ended');
  assert.equal(en.body, 'Combat ended after 1 round.');
});

test('passos: XP só em campanha por XP', () => {
  assert.deepEqual(wizardSteps({ levelingMode: 'xp' }).map(s => s.id), ['xp', 'shortRest', 'treasure', 'diary']);
  assert.deepEqual(wizardSteps({}).map(s => s.id), ['shortRest', 'treasure', 'diary']);
  assert.deepEqual(wizardSteps({ levelingMode: 'milestone' }).map(s => s.id), ['shortRest', 'treasure', 'diary']);
});

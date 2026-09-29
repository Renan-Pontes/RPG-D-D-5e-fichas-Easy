import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateLevelChoice, applyLevelChoice, applyLevelUpChoices, revertLastLevel,
} from '../src/progression/engine.js';
import {
  featCategories, featAsiIssues, featPicksIssues, originFeatFromText, featChoiceSpecs,
} from '../src/progression/feat-rules.js';
import { findFeat } from '../data/feats.js';

// Guerreiro 2024 no nível 4 (vaga de ASI), com Estilo de Luta.
const fighter = (level = 4, extra = {}) => ({
  rulesVersion: '2024', className: 'fighter', level, maxHp: 40, currentHp: 40,
  abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 }, ...extra,
});
const feat = (featId, asi = {}, picks = {}) => ({ type: 'feat', feat: findFeat(featId)?.name.pt || featId, featId, asi, picks });

test('categorias por versão e vaga', () => {
  assert.deepEqual(featCategories('2014', 'asi'), ['feat']);
  assert.deepEqual(featCategories('2024', 'asi'), ['general', 'origin']);
  assert.deepEqual(featCategories('2024', 'asi', { hasFightingStyle: true }), ['general', 'origin', 'fightingStyle']);
  assert.ok(featCategories('2024', 'epic').includes('epicBoon'));
  assert.ok(!featCategories('2024', 'asi').includes('epicBoon'));
});

test('talento do catálogo válido com +1', () => {
  const r = validateLevelChoice(fighter(), 4, feat('athlete', { str: 1 }));
  assert.deepEqual(r.issues, []);
});

test('texto livre continua aceito', () => {
  assert.ok(validateLevelChoice(fighter(), 4, { type: 'feat', feat: 'Talento da Casa', note: 'x' }).valid);
});

test('+1 obrigatório, no atributo permitido, um só', () => {
  assert.ok(!validateLevelChoice(fighter(), 4, feat('athlete')).valid);
  assert.ok(!validateLevelChoice(fighter(), 4, feat('athlete', { int: 1 })).valid);
  assert.ok(!validateLevelChoice(fighter(), 4, feat('athlete', { str: 1, dex: 1 })).valid);
  assert.ok(!validateLevelChoice(fighter(), 4, feat('athlete', { str: 2 })).valid);
  // Talento sem ASI não aceita aumento.
  assert.ok(!validateLevelChoice(fighter(), 4, feat('alert', { dex: 1 })).valid);
});

test('teto 20 e aumento perdido se tudo já está no teto', () => {
  const maxed = fighter(4, { abilities: { str: 20, dex: 20, con: 14 } });
  assert.ok(!validateLevelChoice(maxed, 4, feat('athlete', { str: 1 })).valid);
  assert.ok(validateLevelChoice(maxed, 4, feat('athlete')).valid);
});

test('Dádiva Épica: só no nível 19, teto 30', () => {
  const c = fighter(19, { abilities: { str: 20, dex: 14, con: 14 } });
  assert.deepEqual(validateLevelChoice(c, 19, feat('boonOfCombatProwess', { str: 1 })).issues, []);
  assert.ok(!validateLevelChoice(fighter(), 4, feat('boonOfCombatProwess', { str: 1 })).valid);
  const at30 = fighter(19, { abilities: { str: 30 } });
  assert.ok(featAsiIssues(at30, findFeat('boonOfCombatProwess'), { str: 1 }).length > 0);
  assert.equal(featAsiIssues(c, findFeat('boonOfCombatProwess'), { str: 1 }).length, 0);
});

test('pré-requisito de atributo e de versão', () => {
  const weak = fighter(4, { abilities: { str: 10, dex: 10 } });
  assert.ok(validateLevelChoice(weak, 4, feat('athlete', { str: 1 })).issues.some(i => i.startsWith('Pré-requisito')));
  // 2014 na ficha 2024.
  assert.ok(!validateLevelChoice(fighter(), 4, feat('alert2014')).valid);
  // Modo trapaça ignora pré-requisito.
  assert.ok(validateLevelChoice(weak, 4, feat('athlete', { str: 1 }), { cheat: true }).valid);
});

test('Estilo de Luta como talento só para quem tem a característica', () => {
  assert.ok(validateLevelChoice(fighter(), 4, feat('archery')).valid);
  const wizard = { rulesVersion: '2024', className: 'wizard', level: 4, abilities: { int: 16 } };
  assert.ok(!validateLevelChoice(wizard, 4, feat('archery')).valid);
});

test('repetição', () => {
  const had = fighter(4, { feats: [{ name: 'Atleta', id: 'athlete', level: 1 }] });
  assert.ok(validateLevelChoice(had, 4, feat('athlete', { str: 1 })).issues.includes('Talento já escolhido'));
  // Repetível com outra lista: Iniciado em Magia.
  const mi = fighter(4, { feats: [{ name: 'MI', id: 'magicInitiate', level: 1, origin: 'background', picks: { spellList: 'cleric' } }] });
  const picks = (list) => ({ spellList: list, spellAbility: 'wis', cantrip: ['a', 'b'], spell: ['c'] });
  assert.ok(!validateLevelChoice(mi, 4, feat('magicInitiate', {}, picks('cleric'))).valid);
  assert.deepEqual(validateLevelChoice(mi, 4, feat('magicInitiate', {}, picks('wizard'))).issues, []);
});

test('sub-escolhas obrigatórias', () => {
  const skilled = findFeat('skilled');
  assert.ok(featPicksIssues(skilled, {}).length > 0);
  assert.ok(featPicksIssues(skilled, { skillOrTool: ['athletics', 'athletics', 'stealth'] }).length > 0);
  assert.equal(featPicksIssues(skilled, { skillOrTool: ['athletics', 'stealth', 'Ferramentas de ladrão'] }).length, 0);
  // Conjurador Ritualista 2024: BP magias (nível 4 → 2).
  const rc = featChoiceSpecs(findFeat('ritualCaster'), 4).find(c => c.key === 'spell');
  assert.equal(rc.count, 2);
});

test('aplicar e desfazer o +1 (subida completa e volta)', () => {
  const start = fighter(3);
  const up = applyLevelUpChoices(start, { toLevel: 4, hpGain: 8, choice: feat('athlete', { str: 1 }, {}) });
  assert.equal(up.abilities.str, 17);
  assert.equal(up.feats.length, 1);
  assert.equal(up.feats[0].id, 'athlete');
  assert.equal(up.feats[0].level, 4);
  assert.deepEqual(up.feats[0].asi, { str: 1 });
  const down = revertLastLevel(up);
  assert.equal(down.abilities.str, 16);
  assert.equal(down.feats.length, 0);
  assert.equal(down.levelChoices[4], undefined);
});

test('desfazer mantém o talento de origem', () => {
  const origin = { name: 'Alert', id: 'alert', level: 1, origin: 'background' };
  const start = fighter(3, { feats: [origin] });
  const up = applyLevelUpChoices(start, { toLevel: 4, hpGain: 8, choice: feat('athlete', { dex: 1 }) });
  assert.equal(up.feats.length, 2);
  const down = revertLastLevel(up);
  assert.deepEqual(down.feats, [origin]);
  assert.equal(down.abilities.dex, 14);
});

test('applyLevelChoice grava picks e nota', () => {
  const next = applyLevelChoice(fighter(), 4, { ...feat('skilled', {}, { skillOrTool: ['a', 'b', 'c'] }), note: 'n' });
  assert.deepEqual(next.feats[0], { name: 'Habilidoso', id: 'skilled', level: 4, note: 'n', picks: { skillOrTool: ['a', 'b', 'c'] } });
});

test('talento de origem do antecedente', () => {
  const mi = originFeatFromText('Magic Initiate (Cleric)');
  assert.equal(mi.feat.id, 'magicInitiate');
  assert.deepEqual(mi.picks, { spellList: 'cleric' });
  assert.equal(originFeatFromText('Tavern Brawler').feat.id, 'tavernBrawler');
  assert.equal(originFeatFromText('Nada'), null);
});

test('concessões de talentos entram na ficha (magias, perícias, ferramentas, salvaguarda)', async () => {
  const Utils = (await import('../utils.js')).default;
  const { applyAutosToCharacter } = await import('../src/progression/engine.js');
  const c = applyAutosToCharacter({
    rulesVersion: '2024', className: 'fighter', level: 4, abilities: { con: 15 }, spells: [],
    feats: [
      { id: 'magicInitiate', level: 1, picks: { spellList: 'wizard', cantrip: ['fireBolt', 'light'], spell: ['shield'] } },
      { id: 'skilled', level: 1, picks: { skillOrTool: ['stealth', 'insight', "Thieves' tools"] } },
      { id: 'resilient', level: 4, asi: { con: 1 } },
    ],
  });
  for (const id of ['fireBolt', 'light', 'shield']) assert.ok(c.spells.some(s => s.id === id && s.auto), id);
  assert.ok(Utils.hasSkillProf(c, 'stealth') && Utils.hasSkillProf(c, 'insight'));
  assert.ok(Utils.classGrants(c).tools.includes("Thieves' tools"));
  assert.ok(Utils.hasSaveProf(c, 'con'));
  const removed = applyAutosToCharacter({ ...c, feats: [] });
  assert.ok(!removed.spells.some(s => s.id === 'fireBolt'), 'sai junto com o talento');
});

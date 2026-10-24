// Onde cada traço de classe aparece na ficha (src/sheet/feature-placement.js). Só apresentação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROGRESSION_RULES, PROGRESSION_RULES_2024 } from '../src/progression/rules.js';
import { computeProgression } from '../src/progression/engine.js';
import { withClassLevel } from '../src/progression/multiclass.js';
import { CLASS_OPTIONS } from '../data/class-options/index.js';
import SRD from '../data/srd.js';
import {
  PLACES, knownFeatureIds, placeTable, placeOf, placeByKeywords, placeFeatures, placeLabel, levelTag,
  featureKey, allPools, poolParents, STANDALONE_POOLS,
} from '../src/sheet/feature-placement.js';

const ABILITIES = { str: 16, dex: 16, con: 16, int: 16, wis: 16, cha: 16 };

// Todas as classes × subclasses (as do motor, as 2024/UA de data/class-options e as do
// catálogo expandido), nas duas regras, no nível 20.
function everyBuild() {
  const out = [];
  for (const [rules, table] of [['2014', PROGRESSION_RULES], ['2024', PROGRESSION_RULES_2024]]) {
    for (const [classId, rule] of Object.entries(table)) {
      const subs = new Set([
        ...Object.keys(rule.subclassPerLevel || {}),
        ...(rules === '2024' ? Object.keys(CLASS_OPTIONS[classId]?.subclasses || {}) : []),
        ...(SRD.SUBCLASSES[classId] || []).map(s => s.id),
      ]);
      for (const subclass of [null, ...subs]) {
        out.push({ rulesVersion: rules, className: classId, subclass, level: 20, abilities: ABILITIES });
      }
    }
  }
  return out;
}

test('todo traço de todas as classes e subclasses (2014 e 2024, nível 20) tem lugar definido', () => {
  const known = knownFeatureIds();
  const missing = new Set();
  let count = 0;
  for (const c of everyBuild()) {
    for (const f of computeProgression(c).features) {
      count++;
      if (!known.has(f.id)) missing.add(`${c.rulesVersion} ${c.className}/${c.subclass || '-'}: ${f.id} (${f.nameEn || f.name})`);
    }
  }
  assert.ok(count > 1000, `poucos traços varridos: ${count}`);
  assert.deepEqual([...missing], [], 'ids sem lugar: ponha no mapa PLACE_IDS (ou na lista de other)');
});

test('nenhum id em dois lugares do mapa, e só lugares conhecidos', () => {
  const where = new Map();
  for (const [place, byClass] of Object.entries(placeTable())) {
    assert.ok(PLACES.includes(place), place);
    for (const list of Object.values(byClass)) {
      for (const id of list.trim().split(/\s+/)) {
        assert.ok(!where.has(id), `${id} está em ${where.get(id)} e em ${place}`);
        where.set(id, place);
      }
    }
  }
});

test('traço de recurso fica embaixo de uma linha do painel de recursos (ou da Forma Selvagem)', () => {
  const loose = new Set();
  for (const c of everyBuild()) {
    for (const item of placeFeatures(c).by.resources) {
      if (!item.resourceKey && item.anchor !== 'wildShape') loose.add(`${c.rulesVersion} ${c.className}/${c.subclass || '-'}: ${item.id}`);
    }
  }
  assert.deepEqual([...loose], []);
});

test('toda escolha de classe tem traço-pai (que existe no mapa) ou está na lista de avulsas', () => {
  const known = knownFeatureIds();
  const parents = poolParents();
  for (const [classId, pools] of Object.entries(allPools())) {
    for (const pool of pools) {
      const listed = parents[classId]?.[pool];
      const alone = STANDALONE_POOLS[classId]?.[pool];
      assert.ok(listed || alone, `${classId}.${pool} sem traço-pai`);
      if (alone) assert.ok(PLACES.includes(alone) && alone !== 'meta', `${classId}.${pool} → lugar ${alone}`);
      for (const id of (listed || '').split(/\s+/).filter(Boolean)) assert.ok(known.has(id), `${classId}.${pool} → ${id} não é traço conhecido`);
    }
  }
});

test('clérigo da Vida 2024 nível 5 (exemplo do pedido): cada traço no seu canto', () => {
  const c = {
    rulesVersion: '2024', className: 'cleric', subclass: 'life', level: 5, abilities: { wis: 16 },
    classOptions: [{ classId: 'cleric', pool: 'divineOrder', id: 'thaumaturge', level: 1 }],
  };
  const r = placeFeatures(c);
  const at = Object.fromEntries(r.items.map(i => [i.id, i.place]));
  assert.equal(at.spellcasting, 'spells');
  assert.equal(at.lifeDomainSpells, 'spells');
  assert.equal(at.discipleOfLife, 'spells');
  assert.equal(at.divineOrder, 'cantrips', 'Taumaturgo: truque a mais');
  assert.equal(at.clericSubclass, 'meta');
  assert.equal(at.abilityScoreImprovement, 'meta');
  for (const id of ['channelDivinity', 'divineSpark', 'turnUndead', 'preserveLife', 'searUndead']) {
    const item = r.items.find(i => i.id === id);
    assert.equal(item.place, 'resources', id);
    assert.equal(item.resourceKey, 'cleric.channelDivinity', id);
  }
  // A escolha (Taumaturgo) vai dentro da Ordem Divina, não solta.
  const order = r.items.find(i => i.id === 'divineOrder');
  assert.equal(order.picks.length, 1);
  assert.equal(r.orphanPicks.length, 0);
  assert.equal(placeLabel(r.items.find(i => i.id === 'divineSpark'), 'pt'), 'aba Jogar · Canalizar Divindade');
  assert.equal(placeLabel(order, 'en'), 'Spells tab · cantrips');
  assert.equal(placeLabel(r.items.find(i => i.id === 'spellcasting'), 'pt'), 'aba Magias');
  assert.equal(placeLabel(r.items.find(i => i.id === 'clericSubclass'), 'pt'), 'só no índice');
});

test('Ordem Divina Protetor e sem escolha', () => {
  const base = { rulesVersion: '2024', className: 'cleric', level: 1, abilities: {} };
  assert.equal(placeOf({ id: 'divineOrder' }, { classId: 'cleric', rules: '2024', picks: [{ pool: 'divineOrder', id: 'protector' }] }).place, 'proficiencies');
  assert.equal(placeFeatures(base).items.find(i => i.id === 'divineOrder').place, 'other');
});

test('marciais: ataques, defesa, movimento e Fúria nas gemas da Fúria', () => {
  const r = placeFeatures({ rulesVersion: '2024', className: 'barbarian', subclass: 'berserker', level: 5, abilities: ABILITIES });
  const at = Object.fromEntries(r.items.map(i => [i.id, i]));
  assert.equal(at.rage.resourceKey, 'barbarian.rage');
  assert.equal(at.frenzy.resourceKey, 'barbarian.rage');
  assert.equal(at.unarmoredDefense.place, 'defense');
  assert.equal(at.dangerSense.place, 'defense');
  assert.equal(at.recklessAttack.place, 'attacks');
  assert.equal(at.weaponMastery.place, 'attacks');
  assert.equal(at.extraAttack.place, 'attacks');
  assert.equal(at.fastMovement.place, 'movement');
  assert.equal(at.primalKnowledge.place, 'skills');
  // 2014: a linha da Fúria é rage2014; ladino: perícias e defesa.
  const old = placeFeatures({ rulesVersion: '2014', className: 'barbarian', level: 3, abilities: ABILITIES });
  assert.equal(old.items.find(i => i.id === 'rage').resourceKey, 'barbarian.rage2014');
  const rogue = Object.fromEntries(placeFeatures({ rulesVersion: '2014', className: 'rogue', level: 11, abilities: ABILITIES }).items.map(i => [i.id, i.place]));
  assert.deepEqual([rogue.expertise, rogue.reliableTalent, rogue.evasion, rogue.uncannyDodge, rogue.sneakAttack, rogue.thievesCant],
    ['skills', 'skills', 'defense', 'defense', 'attacks', 'proficiencies']);
});

test('Forma Selvagem: traços do druida vão para o painel dela', () => {
  const r = placeFeatures({ rulesVersion: '2014', className: 'druid', subclass: 'moon', level: 6, abilities: ABILITIES });
  for (const id of ['wildShape', 'combatWildShape', 'circleForms']) {
    const item = r.items.find(i => i.id === id);
    assert.equal(item.anchor, 'wildShape', id);
    assert.equal(placeLabel(item, 'pt'), 'aba Jogar · Forma Selvagem');
  }
});

test('Sentido Divino: 2024 embaixo do Canalizar Divindade; 2014 (usos próprios) em Outros traços', () => {
  const now = placeFeatures({ rulesVersion: '2024', className: 'paladin', level: 3, abilities: { cha: 16 } });
  const sense = now.items.find(i => i.id === 'divineSense');
  assert.equal(sense.place, 'resources');
  assert.equal(sense.resourceKey, 'paladin.channelDivinity');
  assert.equal(placeLabel(sense, 'pt'), 'aba Jogar · Canalizar Divindade');
  const old = placeFeatures({ rulesVersion: '2014', className: 'paladin', level: 3, abilities: { cha: 16 } });
  assert.equal(old.items.find(i => i.id === 'divineSense').place, 'other');
});

test('Estilo de Luta: Guerreiro Abençoado/Druídico (2 truques) junto dos truques; estilo comum nos ataques', () => {
  const build = (classId, style, pool, cantrips) => placeFeatures({
    rulesVersion: '2024', className: classId, level: 2, abilities: ABILITIES,
    classOptions: [{ classId, pool: 'fightingStyle', id: style, level: 2 }, ...cantrips.map(id => ({ classId, pool, id, level: 2 }))],
  }).items.find(i => i.id === 'fightingStyle');
  for (const [classId, style, pool] of [['paladin', 'blessedWarrior', 'blessedWarriorCantrip'], ['ranger', 'druidicWarrior', 'druidicWarriorCantrip']]) {
    const fs = build(classId, style, pool, ['guidance']);
    assert.equal(fs.place, 'cantrips', classId);
    assert.equal(placeLabel(fs, 'en'), 'Spells tab · cantrips', classId);
    assert.equal(fs.picks.length, 2, `${classId}: estilo e truques dentro do traço`);
    assert.equal(build(classId, 'defense', pool, []).place, 'attacks', classId);
  }
  assert.equal(build('fighter', 'defense', 'x', []).place, 'attacks');
});

test('mesmo id com outro sentido na regra ou na classe', () => {
  assert.equal(placeOf({ id: 'favoredEnemy' }, { classId: 'ranger', rules: '2014' }).place, 'skills');
  const r = placeFeatures({ rulesVersion: '2024', className: 'ranger', level: 1, abilities: ABILITIES });
  assert.equal(r.items.find(i => i.id === 'favoredEnemy').resourceKey, 'ranger.favoredEnemy');
  assert.equal(placeOf({ id: 'touchOfDeath' }, { classId: 'monk', rules: '2024' }).place, 'defense');
  assert.equal(placeOf({ id: 'touchOfDeath' }, { classId: 'cleric', rules: '2024' }).place, 'resources');
});

test('multiclasse: cada traço sabe a classe e usa o recurso da própria classe', () => {
  let c = { rulesVersion: '2024', className: 'paladin', subclass: 'devotion', level: 5, abilities: ABILITIES };
  for (let i = 0; i < 3; i++) c = withClassLevel(c, 'cleric');
  const r = placeFeatures(c);
  assert.equal(r.multi, true);
  const cd = r.items.filter(i => i.id === 'channelDivinity');
  assert.deepEqual(cd.map(i => [i.classId, i.resourceKey]).sort(), [['cleric', 'cleric.channelDivinity'], ['paladin', 'paladin.channelDivinity']]);
  const spark = r.items.find(i => i.id === 'divineSpark');
  assert.equal(levelTag(spark, r.multi, 'pt'), 'Nv. 2 · Clérigo');
  assert.equal(levelTag(spark, false, 'en'), 'Lv 2');
});

test('escolhas: invocações dentro de Invocações Místicas; pool sem traço vira avulso no lugar dele', () => {
  const warlock = placeFeatures({
    rulesVersion: '2014', className: 'warlock', level: 3, abilities: ABILITIES,
    classOptions: [{ classId: 'warlock', pool: 'invocation', id: 'agonizingBlast', level: 2 }, { classId: 'warlock', pool: 'invocation', id: 'devilsSight', level: 2 }],
  });
  const inv = warlock.items.find(i => i.id === 'eldritchInvocations');
  assert.equal(inv.place, 'spells');
  assert.equal(inv.picks.length, 2);
  assert.ok(inv.picks.every(p => p.name.pt && p.name.en));
  const bard = placeFeatures({
    rulesVersion: '2024', className: 'bard', level: 1, abilities: ABILITIES,
    classOptions: [{ classId: 'bard', pool: 'musicalInstrumentStart', id: 'lute', level: 1 }],
  });
  assert.equal(bard.orphanPicks.length, 1);
  assert.ok(bard.orphanPicks[0].picks[0].name.pt);
  assert.equal(bard.orphanPicks[0].level, 1);
  // Ferramenta/instrumento sem traço: no painel de proficiências, não em Outros traços.
  assert.equal(bard.orphanPicks[0].place, 'proficiencies');
  assert.deepEqual(bard.by.proficiencies.map(i => i.key), ['bard:musicalInstrumentStart']);
  assert.deepEqual(bard.by.other.filter(i => !i.id), []);
  const monk = placeFeatures({
    rulesVersion: '2024', className: 'monk', level: 1, abilities: ABILITIES,
    classOptions: [{ classId: 'monk', pool: 'tool', id: 'flute', level: 1 }],
  });
  assert.ok(monk.by.proficiencies.some(i => i.key === 'monk:tool'));
  // Opção do TCE sem traço: continua em Outros traços.
  const ranger = placeFeatures({
    rulesVersion: '2014', className: 'ranger', level: 1, abilities: ABILITIES,
    classOptions: [{ classId: 'ranger', pool: 'tceOptional', id: 'deftExplorer', level: 1 }],
  });
  const tce = ranger.orphanPicks.find(o => o.key === 'ranger:tceOptional');
  assert.equal(tce?.place, 'other');
  assert.ok(ranger.by.other.includes(tce));
});

test('id desconhecido cai nas palavras-chave do nome em inglês', () => {
  assert.equal(placeByKeywords('Bonus Cantrip'), 'cantrips');
  assert.equal(placeByKeywords('Homebrew Subclass'), 'meta');
  assert.equal(placeByKeywords('Spectral Armor'), 'defense');
  assert.equal(placeByKeywords('Shadow Stride'), 'movement');
  assert.equal(placeByKeywords('Mighty Rage'), 'resources');
  assert.equal(placeByKeywords('Strange Gift'), 'other');
  assert.equal(placeOf({ id: 'newHomebrewThing', nameEn: 'Savage Strike' }).place, 'attacks');
});

test('chave de memo ignora o que muda a cada tecla (notas, PV, gastos)', () => {
  const c = { rulesVersion: '2024', className: 'wizard', level: 9, abilities: ABILITIES, notes: [], currentHp: 20 };
  const k = featureKey(c);
  assert.equal(featureKey({ ...c, notes: [{ text: 'oi' }], currentHp: 3, resourcesUsed: { 'wizard.arcaneRecovery': 1 }, backstory: 'x' }), k);
  assert.notEqual(featureKey({ ...c, level: 10 }), k);
  assert.notEqual(featureKey({ ...c, classOptions: [{ classId: 'wizard', pool: 'scholar', id: 'arcana' }] }), k);
});

test('ficha sem classe não quebra', () => {
  const r = placeFeatures({});
  assert.deepEqual(r.items, []);
  assert.deepEqual(r.orphanPicks, []);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMonsterUrl,
  parseMonsterUrl,
  clean5eToolsTags,
  parse5eToolsEntries,
  convert5eToolsMonster,
  fetchMonsterFromUrl,
} from '../src/campaigns/url-monster-importer.js';

test('isMonsterUrl: detecta URLs válidas e rejeita buscas normais', () => {
  // URLs válidas 5e.tools
  assert.equal(isMonsterUrl('https://5e.tools/bestiary.html#merchantman_irknemp'), true);
  assert.equal(isMonsterUrl('https://5e.tools/bestiary.html#clapped-out%20steamjack_irkcore'), true);
  assert.equal(isMonsterUrl('https://5e.tools/bestiary.html#sphinx_irkbnb'), true);
  assert.equal(isMonsterUrl('5e.tools/bestiary.html#goblin_mm'), true);
  assert.equal(isMonsterUrl('https://5etools-mirror-3.github.io/bestiary.html#adult%20red%20dragon_mm'), true);

  // URLs Open5e e JSON
  assert.equal(isMonsterUrl('https://open5e.com/monsters/aboleth'), true);
  assert.equal(isMonsterUrl('https://api.open5e.com/v1/monsters/aboleth'), true);
  assert.equal(isMonsterUrl('https://raw.githubusercontent.com/user/repo/main/monster.5emm.json'), true);

  // Rejeita nomes comuns
  assert.equal(isMonsterUrl('goblin'), false);
  assert.equal(isMonsterUrl('dragão vermelho'), false);
  assert.equal(isMonsterUrl(''), false);
  assert.equal(isMonsterUrl('   '), false);
  assert.equal(isMonsterUrl(null), false);
});

test('parseMonsterUrl: extrai metadados estruturados', () => {
  const p1 = parseMonsterUrl('https://5e.tools/bestiary.html#merchantman_irknemp');
  assert.equal(p1.kind, '5etools');
  assert.equal(p1.name, 'merchantman');
  assert.equal(p1.source, 'irknemp');

  const p2 = parseMonsterUrl('https://5e.tools/bestiary.html#clapped-out%20steamjack_irkcore');
  assert.equal(p2.kind, '5etools');
  assert.equal(p2.name, 'clapped-out steamjack');
  assert.equal(p2.source, 'irkcore');

  const p3 = parseMonsterUrl('https://open5e.com/monsters/aboleth');
  assert.equal(p3.kind, 'open5e');
  assert.equal(p3.slug, 'aboleth');

  const p4 = parseMonsterUrl('https://raw.githubusercontent.com/user/repo/main/boss.json');
  assert.equal(p4.kind, 'json');
  assert.equal(p4.label, 'boss.json');
});

test('clean5eToolsTags & parse5eToolsEntries: descontrói macros 5e.tools para linguagem natural', () => {
  const rawActionText = '{@atk mw} {@hit 7} to hit, reach 10 ft., one target. {@h}9 ({@damage 1d8 + 5}) bludgeoning damage. If the target is a creature, it must succeed on a {@dc 15} Strength saving throw or be knocked {@condition prone}.';
  const cleaned = clean5eToolsTags(rawActionText);

  assert.match(cleaned, /Melee Weapon Attack:\s*\+7 to hit/i);
  assert.match(cleaned, /reach 10 ft/i);
  assert.match(cleaned, /Hit:\s*9\s*\(1d8\s*\+\s*5\)\s*bludgeoning damage/i);
  assert.match(cleaned, /DC 15 Strength saving throw/i);
  assert.match(cleaned, /knocked prone/i);

  const entriesBlock = [
    'First paragraph with {@spell shield}.',
    {
      type: 'entries',
      name: 'Special Rule',
      entries: ['Rule detail with {@recharge 5}.']
    }
  ];
  const parsedEntries = parse5eToolsEntries(entriesBlock);
  assert.match(parsedEntries, /First paragraph with shield/);
  assert.match(parsedEntries, /Special Rule:\s*Rule detail with \(Recharge 5-6\)/);
});

test('convert5eToolsMonster: converte objeto bruto para modelo do Heroes Forge', () => {
  const rawMock = {
    name: 'Steam Titan',
    source: 'TestBook',
    size: ['H'],
    type: 'construct',
    alignment: ['U'],
    ac: [{ ac: 18, from: ['natural armor'] }],
    hp: { average: 150, formula: '12d12 + 72' },
    speed: { walk: 40, climb: 20 },
    str: 22, dex: 10, con: 22, int: 6, wis: 10, cha: 5,
    save: { con: '+10', wis: '+4' },
    skill: { athletics: '+10', perception: '+4' },
    immune: ['poison', 'psychic'],
    conditionImmune: ['charmed', 'exhaustion', 'poisoned'],
    senses: ['darkvision 120 ft.'],
    passive: 14,
    languages: ['understands Common but cannot speak'],
    cr: '10',
    trait: [
      { name: 'Magic Resistance', entries: ['The titan has advantage on saving throws against spells.'] }
    ],
    action: [
      {
        name: 'Slam',
        entries: ['{@atk mw} {@hit 10} to hit, reach 10 ft., one target. {@h}19 ({@damage 2d12 + 6}) bludgeoning damage.']
      }
    ]
  };

  const converted = convert5eToolsMonster(rawMock);
  assert.equal(converted.custom, true);
  assert.equal(converted.name.pt, 'Steam Titan');
  assert.equal(converted.cr, '10');
  assert.equal(converted.crNum, 10);
  assert.equal(converted.size, 'Huge');
  assert.equal(converted.type, 'construct');
  assert.equal(converted.typeLine, 'Huge construct, unaligned');
  assert.equal(converted.ac, 18);
  assert.equal(converted.acText, '18 (natural armor)');
  assert.equal(converted.hp, 150);
  assert.equal(converted.hitDice, '12d12 + 72');
  assert.equal(converted.hpText, '150 (12d12 + 72)');
  assert.equal(converted.speed.walk, 40);
  assert.equal(converted.speed.climb, 20);
  assert.equal(converted.speedText, '40 ft., climb 20 ft.');
  assert.equal(converted.abilities.str, 22);
  assert.equal(converted.saves.con, 10);
  assert.equal(converted.saveText, 'CON +10, WIS +4');
  assert.equal(converted.skills.athletics, 10);
  assert.equal(converted.skillText, 'Athletics +10, Perception +4');
  assert.deepEqual(converted.damageImmunities, ['poison', 'psychic']);
  assert.equal(converted.immuneText, 'poison, psychic');
  assert.deepEqual(converted.conditionImmunities, ['charmed', 'exhaustion', 'poisoned']);
  assert.equal(converted.conditionImmuneText, 'charmed, exhaustion, poisoned');
  assert.equal(converted.xp, 5900);
  assert.equal(converted.proficiencyBonus, 4);
  assert.ok(converted.raw5eTools);
  assert.equal(converted.traits.length, 1);
  assert.equal(converted.traits[0].name.pt, 'Magic Resistance');
  assert.equal(converted.actions.length, 1);
  assert.equal(converted.actions[0].name.pt, 'Slam');
  assert.equal(converted.actions[0].type, 'melee');
  assert.equal(converted.actions[0].atk, 10);
  assert.equal(converted.actions[0].range, '10 ft');
  assert.equal(converted.actions[0].damage, '2d12+6');
  assert.equal(converted.actions[0].damageType, 'bludgeoning');
});

test('fetchMonsterFromUrl: ingestão ao vivo dos 3 links de exemplo do usuário', async () => {
  // 1. Merchantman (irknemp)
  const res1 = await fetchMonsterFromUrl('https://5e.tools/bestiary.html#merchantman_irknemp');
  assert.ok(res1.monster);
  assert.equal(res1.monster.name.pt, 'Merchantman');
  assert.equal(res1.monster.cr, '3');
  assert.equal(res1.monster.hp, 42);
  assert.equal(res1.monster.hpText, '42 (4d10+20)');
  assert.equal(res1.monster.ac, 16);
  assert.equal(res1.monster.acText, '16 (natural armor)');
  assert.equal(res1.monster.typeLine, 'Large construct, unaligned');
  assert.equal(res1.monster.speedText, '40 ft.');
  assert.equal(res1.monster.saveText, 'STR +5, CON +6');
  assert.equal(res1.monster.skillText, 'Athletics +5, Perception +2');
  assert.equal(res1.monster.resistText, 'bludgeoning, piercing, slashing from nonmagical attacks');
  assert.equal(res1.monster.immuneText, 'poison, psychic');
  assert.equal(res1.monster.conditionImmuneText, 'charmed, frightened, paralyzed, petrified, poisoned');
  assert.equal(res1.monster.xp, 700);
  assert.equal(res1.monster.proficiencyBonus, 2);
  assert.ok(res1.monster.actions.some(a => a.name.pt === 'Slam'));

  // 2. Clapped-Out Steamjack (irkcore)
  const res2 = await fetchMonsterFromUrl('https://5e.tools/bestiary.html#clapped-out%20steamjack_irkcore');
  assert.ok(res2.monster);
  assert.equal(res2.monster.name.pt, 'Clapped-Out Steamjack');
  assert.equal(res2.monster.cr, '0');
  assert.equal(res2.monster.hp, 28);
  assert.equal(res2.monster.hpText, '28 (3d8 + 15)');
  assert.equal(res2.monster.ac, 12);
  assert.equal(res2.monster.acText, '12 (natural armor)');
  assert.equal(res2.monster.typeLine, 'Medium construct (steamjack), unaligned');
  assert.equal(res2.monster.actions[0].damage, '1d8');
  assert.equal(res2.monster.actions[0].damageType, 'bludgeoning');

  // 3. Sphinx (irkbnb)
  const res3 = await fetchMonsterFromUrl('https://5e.tools/bestiary.html#sphinx_irkbnb');
  assert.ok(res3.monster);
  assert.equal(res3.monster.name.pt, 'Sphinx');
  assert.equal(res3.monster.cr, '6');
  assert.equal(res3.monster.hp, 105);
  assert.equal(res3.monster.hpText, '105 (10d10+50)');
  assert.equal(res3.monster.ac, 17);
  assert.equal(res3.monster.acText, '17 (natural armor)');
  assert.equal(res3.monster.typeLine, 'Large construct (myrmidon), unaligned');
  assert.equal(res3.monster.xp, 2300);
  assert.equal(res3.monster.proficiencyBonus, 3);
});

test('fetchMonsterFromUrl: ingestão de fontes oficiais e Open5e', async () => {
  // Oficial 5e.tools
  const off = await fetchMonsterFromUrl('https://5e.tools/bestiary.html#goblin_mm');
  assert.ok(off.monster);
  assert.equal(off.monster.name.pt, 'Goblin');
  assert.equal(off.monster.cr, '1/4');
  assert.equal(off.monster.hp, 7);
  assert.equal(off.monster.ac, 15);

  // Open5e
  const o5e = await fetchMonsterFromUrl('https://open5e.com/monsters/aboleth');
  assert.ok(o5e.monster);
  assert.equal(o5e.monster.name.pt, 'Aboleth');
  assert.equal(o5e.monster.cr, '10');
  assert.equal(o5e.monster.hp, 135);
});

test('fetchMonsterFromUrl: rejeita links com monstros inexistentes com mensagem clara', async () => {
  await assert.rejects(
    () => fetchMonsterFromUrl('https://5e.tools/bestiary.html#monstro_fantasma_inexistente_irknemp'),
    /não encontrado/i
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMonsterUrl,
  parseMonsterUrl,
  clean5eToolsTags,
  parse5eToolsEntries,
  convert5eToolsMonster,
  parseDandWikiMonster,
  parseWikidotCreature,
  fetchMonsterFromUrl,
  isMonsterRawText,
  parseMonsterFromRawText,
  fetchTextWithCorsBypass,
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

  // URLs DandWiki, Wikidot, D&D Beyond, Roll20, AideDD, 5e.d20srd, e 5e.tools path format
  assert.equal(isMonsterUrl('https://www.dandwiki.com/wiki/Barnaclops_(5e_Creature)'), true);
  assert.equal(isMonsterUrl('https://www.dandwiki.com/wiki/Glitch_(5e_Creature)'), true);
  assert.equal(isMonsterUrl('https://dndroll.wikidot.com/creatures:dust-mephit'), true);
  assert.equal(isMonsterUrl('https://dndroll.wikidot.com/creatures:ice-mephit-summoner-variant'), true);
  assert.equal(isMonsterUrl('https://roll20.net/compendium/dnd5e/Magma%20Mephit#content'), true);
  assert.equal(isMonsterUrl('https://www.dndbeyond.com/monsters/16851-dust-mephit'), true);
  assert.equal(isMonsterUrl('https://www.aidedd.org/dnd/monstres.php?vo=magma-mephit'), true);
  assert.equal(isMonsterUrl('https://5e.d20srd.org/srd/monsters/mephit.htm'), true);
  assert.equal(isMonsterUrl('https://5e.tools/bestiary/magma-mephit-xmm.html'), true);

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

  const p5 = parseMonsterUrl('https://www.dandwiki.com/wiki/Barnaclops_(5e_Creature)');
  assert.equal(p5.kind, 'dandwiki');
  assert.equal(p5.name, 'Barnaclops');
  assert.equal(p5.slug, 'Barnaclops_(5e_Creature)');

  const p6 = parseMonsterUrl('https://dndroll.wikidot.com/creatures:ice-mephit-summoner-variant');
  assert.equal(p6.kind, 'wikidot');
  assert.equal(p6.slug, 'ice-mephit-summoner-variant');

  const p7 = parseMonsterUrl('https://5e.tools/bestiary/magma-mephit-xmm.html');
  assert.equal(p7.kind, '5etools');
  assert.equal(p7.name, 'magma mephit');
  assert.equal(p7.source, 'xmm');

  const p8 = parseMonsterUrl('https://roll20.net/compendium/dnd5e/Magma%20Mephit#content');
  assert.equal(p8.kind, 'compendium');
  assert.equal(p8.name, 'Magma Mephit');
  assert.equal(p8.source, 'Roll20');

  const p9 = parseMonsterUrl('https://www.dndbeyond.com/monsters/16851-dust-mephit?srsltid=AYCX9vIrkArPZBRq');
  assert.equal(p9.kind, 'compendium');
  assert.equal(p9.name, 'dust mephit');
  assert.equal(p9.source, 'D&D Beyond');

  const p10 = parseMonsterUrl('https://www.aidedd.org/dnd/monstres.php?vo=steam-mephit');
  assert.equal(p10.kind, 'compendium');
  assert.equal(p10.name, 'steam mephit');
  assert.equal(p10.source, 'AideDD');
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

test('parseDandWikiMonster: decompõe wikitext para ficha completa 1:1', () => {
  const wikitextFixture = `
== Barnaclops ==
{{5e Creature
|size=Large
|type=monstrosity
|alignment=unaligned
|ac=18
|armor=natural armor
|hp=172
|hd=15
|speed=30 ft., swim 40 ft.
|str=22
|dex=10
|con=22
|int=4
|wis=12
|cha=6
|strsave=yes
|consave=yes
|athletics=yes
|perception=yes
|senses=darkvision 60 ft., passive Perception 13
|languages=—
|cr=11
|features=
'''Barnacle Armor.''' Any creature that touches the barnaclops takes 1d6 piercing damage.
|actions=
'''Club.''' ''Melee Weapon Attack:'' +10 to hit, reach 10 ft., one target. ''Hit:'' 19 (3d8 + 6) bludgeoning damage.
}}
`;
  const m = parseDandWikiMonster(wikitextFixture);
  assert.equal(m.name.en, 'Barnaclops');
  assert.equal(m.size, 'Large');
  assert.equal(m.type, 'monstrosity');
  assert.equal(m.ac, 18);
  assert.equal(m.acText, '18 (natural armor)');
  assert.equal(m.hp, 172);
  assert.equal(m.hpText, '172 (15d10+90)');
  assert.equal(m.speedText, '30 ft., swim 40 ft.');
  assert.equal(m.cr, '11');
  assert.equal(m.saves.str, 10);
  assert.equal(m.saves.con, 10);
  assert.equal(m.skills.athletics, 4);
  assert.equal(m.skills.perception, 4);
  assert.equal(m.traits.length, 1);
  assert.equal(m.traits[0].name.en, 'Barnacle Armor');
  assert.equal(m.actions.length, 1);
  assert.equal(m.actions[0].name.en, 'Club');
  assert.equal(m.actions[0].atk, 10);
});

test('parseWikidotCreature: extrai atributos, CA, PV e metadados de HTML Wikidot', () => {
  const htmlFixture = `
<div id="page-title">Ice Mephit Summoner Variant</div>
<div id="page-content">
  <p><br>Small elemental, neutral evil<br></p>
  <p><strong>Armor Class</strong> 11<br>
  <strong>Hit Points</strong> 21 (6d6)<br>
  <strong>Speed</strong> 30 ft., fly 30 ft.<br></p>
  <table>
    <tr><td>Strength</td><td>7</td></tr>
    <tr><td>Dexterity</td><td>13</td></tr>
    <tr><td>Constitution</td><td>10</td></tr>
    <tr><td>Intelligence</td><td>9</td></tr>
    <tr><td>Wisdom</td><td>11</td></tr>
    <tr><td>Charisma</td><td>12</td></tr>
  </table>
  <p><strong>Challenge</strong> 1/2 (100 XP)</p>
</div>
`;
  const m = parseWikidotCreature(htmlFixture);
  assert.equal(m.name.en, 'Ice Mephit Summoner Variant');
  assert.equal(m.size, 'Small');
  assert.equal(m.type, 'elemental');
  assert.equal(m.ac, 11);
  assert.equal(m.hp, 21);
  assert.equal(m.hpText, '21 (6d6)');
  assert.equal(m.abilities.dex, 13);
  assert.equal(m.cr, '1/2');
});

test('fetchMonsterFromUrl: ingestão ao vivo de 5e.tools 2024 XMM e Compêndios (Roll20 / D&D Beyond / AideDD)', async () => {
  // 1. 5e.tools 2024 XMM format
  const resXmm = await fetchMonsterFromUrl('https://5e.tools/bestiary/magma-mephit-xmm.html');
  assert.ok(resXmm.monster);
  assert.equal(resXmm.monster.name.pt, 'Magma Mephit');
  assert.equal(resXmm.monster.cr, '1/2');

  // 2. Roll20 compendium link
  const resRoll20 = await fetchMonsterFromUrl('https://roll20.net/compendium/dnd5e/Magma%20Mephit#content');
  assert.ok(resRoll20.monster);
  assert.equal(resRoll20.monster.name.en, 'Magma Mephit');
  assert.equal(resRoll20.monster.source, 'Roll20');

  // 3. D&D Beyond link
  const resDdb = await fetchMonsterFromUrl('https://www.dndbeyond.com/monsters/16851-dust-mephit');
  assert.ok(resDdb.monster);
  assert.equal(resDdb.monster.name.en, 'Dust Mephit');
  assert.equal(resDdb.monster.source, 'D&D Beyond');

  // 4. AideDD link
  const resAide = await fetchMonsterFromUrl('https://www.aidedd.org/dnd/monstres.php?vo=steam-mephit');
  assert.ok(resAide.monster);
  assert.equal(resAide.monster.name.en, 'Steam Mephit');
  assert.equal(resAide.monster.source, 'AideDD');
});

test('fetchMonsterFromUrl: ingestão ao vivo de DandWiki Barnaclops com fidelidade 1:1', async () => {
  const res = await fetchMonsterFromUrl('https://www.dandwiki.com/wiki/Barnaclops_(5e_Creature)');
  assert.ok(res.monster);
  const m = res.monster;

  assert.equal(m.name.en, 'Barnaclops');
  assert.equal(m.size, 'Large');
  assert.equal(m.type, 'monstrosity');
  assert.equal(m.ac, 18);
  assert.equal(m.acText, '18 (natural armor)');
  assert.equal(m.hp, 172);
  assert.equal(m.hpText, '172 (15d10+90)');
  assert.equal(m.speed.walk, 20);
  assert.equal(m.speed.swim, 20);
  assert.equal(m.cr, '11');
  assert.equal(m.crNum, 11);
  assert.equal(m.proficiencyBonus, 4);

  // Resistências e Imunidades limpas de macros {{5c}}
  assert.ok(m.damageImmunities.includes('poison, psychic') || m.damageImmunities.includes('poison'));
  assert.ok(m.damageVulnerabilities.includes('cold'));
  assert.ok(m.conditionImmunities.includes('charmed'));
  assert.ok(m.conditionImmunities.includes('frightened'));
  assert.ok(m.conditionImmunities.includes('poisoned'));
  assert.ok(m.conditionImmunities.includes('unconscious'));

  // Traços (Amphibious expandido via {{5ect}}, Barnacle Armor, Cirriphobic Gaze)
  assert.ok(m.traits.some(t => t.name.en === 'Amphibious'));
  assert.ok(m.traits.some(t => t.name.en === 'Barnacle Armor'));
  assert.ok(m.traits.some(t => t.name.en === 'Cirriphobic Gaze'));

  // Ações e Ataques
  const club = m.actions.find(a => a.name.en === 'Club');
  assert.ok(club);
  assert.equal(club.atk, 7);
  assert.equal(club.damage, '9d6+3');
  assert.equal(club.damageType, 'bludgeoning');

  // Arte/Retrato
  assert.equal(m.avatar, 'https://www.bogleech.com/mortasheen/barnaclops.png');
});

test('isMonsterRawText e parseMonsterFromRawText: suporta wikitext e JSON colados', () => {
  const wikitext = `==Glitch==
{{5e Creature
|size=Medium
|type=aberration
|alignment=chaotic neutral
|ac=14
|hd=8
|con=14
|str=10
|dex=18
|speed=30 ft.
|cr=3
}}`;
  assert.equal(isMonsterRawText(wikitext), true);
  const parsedWiki = parseMonsterFromRawText(wikitext);
  assert.equal(parsedWiki.monster.name.en, 'Glitch');
  assert.equal(parsedWiki.monster.cr, '3');
  assert.equal(parsedWiki.monster.type, 'aberration');

  const jsonSample = JSON.stringify({
    name: 'Glitch Drone',
    hit_points: 45,
    armor_class: 13,
    challenge_rating: '2',
  });
  assert.equal(isMonsterRawText(jsonSample), true);
  const parsedJson = parseMonsterFromRawText(jsonSample);
  assert.equal(parsedJson.monster.name.pt, 'Glitch Drone');
  assert.equal(parsedJson.monster.cr, '2');

  assert.equal(isMonsterRawText('apenas um texto qualquer'), false);
});

test('parsePlainTextMonster e parseMonsterFromRawText: suporta blocos em texto puro e markdown', () => {
  const statblock = `Mephit King
Medium elemental, neutral evil
Armor Class 16 (natural armor)
Hit Points 65 (10d8 + 20)
Speed 30 ft., fly 40 ft.
STR 12 (+1) DEX 16 (+3) CON 14 (+2) INT 12 (+1) WIS 10 (+0) CHA 14 (+2)
Saving Throws DEX +5, CON +4
Skills Stealth +5, Perception +2
Damage Vulnerabilities cold
Damage Resistances lightning
Damage Immunities fire, poison
Condition Immunities poisoned
Senses darkvision 60 ft., passive Perception 12
Languages Ignan, Common
Challenge 4 (1,100 XP)

Death Burst. When the king dies, it explodes in a burst of molten rock. Each creature within 10 feet must make a DC 13 Dexterity saving throw, taking 14 (4d6) fire damage on a failed save.

ACTIONS
Multiattack. The mephit makes two claw attacks.
Claw. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) slashing damage plus 3 (1d6) fire damage.`;

  assert.equal(isMonsterRawText(statblock), true);
  const parsed = parseMonsterFromRawText(statblock);
  const m = parsed.monster;

  assert.equal(m.name.en, 'Mephit King');
  assert.equal(m.size, 'Medium');
  assert.equal(m.type, 'elemental');
  assert.equal(m.ac, 16);
  assert.equal(m.acText, '16 (natural armor)');
  assert.equal(m.hp, 65);
  assert.equal(m.hpText, '65 (10d8 + 20)');
  assert.equal(m.speed.walk, 30);
  assert.equal(m.speed.fly, 40);
  assert.equal(m.abilities.str, 12);
  assert.equal(m.abilities.dex, 16);
  assert.equal(m.saves.dex, 5);
  assert.equal(m.skills.stealth, 5);
  assert.equal(m.cr, '4');
  assert.equal(m.crNum, 4);
  assert.ok(m.traits.some(t => t.name.en === 'Death Burst'));
  assert.ok(m.actions.some(a => a.name.en === 'Claw' && a.atk === 5));
});

test('importMonsters: suporta wikitext e plaintext statblocks diretamente no importador', async () => {
  const { importMonsters } = await import('../src/campaigns/import-5emm.js');
  
  const wiki = `==Troll Shaman==
{{5e Creature
|size=Large
|type=giant
|alignment=chaotic evil
|ac=15
|hd=10
|con=18
|str=18
|dex=12
|speed=30 ft.
|cr=5
}}`;
  const resWiki = importMonsters(wiki);
  assert.equal(resWiki.errors.length, 0);
  assert.equal(resWiki.monsters.length, 1);
  assert.equal(resWiki.monsters[0].name.en, 'Troll Shaman');
  assert.equal(resWiki.monsters[0].cr, '5');

  const plain = `Cave Fisher
Medium monstrosity, unaligned
Armor Class 16 (natural armor)
Hit Points 58 (9d8 + 18)
Speed 20 ft., climb 20 ft.
STR 16 (+3) DEX 13 (+1) CON 14 (+2) INT 3 (-4) WIS 10 (+0) CHA 3 (-4)
Challenge 3 (700 XP)
ACTIONS
Claws. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage.`;
  const resPlain = importMonsters(plain);
  assert.equal(resPlain.errors.length, 0);
  assert.equal(resPlain.monsters.length, 1);
  assert.equal(resPlain.monsters[0].name.en, 'Cave Fisher');
  assert.equal(resPlain.monsters[0].cr, '3');
});

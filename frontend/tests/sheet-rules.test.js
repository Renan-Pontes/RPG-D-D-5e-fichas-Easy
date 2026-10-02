import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import { buildSheetData } from '../src/pdf/sheet-data.js';
import { trainingLines, backgroundFeature, featName, featPicksText, classFeatureList } from '../src/sheet/sheet-text.js';

const make = (extra = {}) => ({ ...Utils.makeNew(), level: 1, ...extra });

test('Taumaturgo (Clérigo 2024) soma SAB (mín. +1) em Arcanismo e Religião', () => {
  const c = make({ className: 'cleric', background: 'acolyte', abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 17, cha: 10 },
    classOptions: [{ classId: 'cleric', pool: 'divineOrder', id: 'thaumaturge' }] });
  assert.equal(Utils.skillBonus(c, 'religion'), 0 + 2 + 3);
  assert.equal(Utils.skillBonus(c, 'arcana'), 3);
  assert.equal(Utils.skillBonus(c, 'nature'), 0);
  // mínimo +1 com SAB baixa
  const low = { ...c, abilities: { ...c.abilities, wis: 8 } };
  assert.equal(Utils.skillBonus(low, 'arcana'), 1);
  // Protetor não ganha nada
  assert.equal(Utils.skillBonus({ ...c, classOptions: [{ classId: 'cleric', pool: 'divineOrder', id: 'protector' }] }, 'arcana'), 0);
  // 2014 não tem Ordem Divina
  assert.equal(Utils.skillBonus({ ...c, rulesVersion: '2014' }, 'arcana'), 0);
});

test('Mago da Ordem Primal (Druida 2024) soma SAB em Arcanismo e Natureza', () => {
  const c = make({ className: 'druid', abilities: { str: 10, dex: 10, con: 10, int: 13, wis: 17, cha: 10 },
    skillProfs: ['arcana', 'nature'], classOptions: [{ classId: 'druid', pool: 'primalOrder', id: 'magician' }] });
  assert.equal(Utils.skillBonus(c, 'arcana'), 1 + 2 + 3);
  assert.equal(Utils.skillBonus(c, 'nature'), 1 + 2 + 3);
  assert.equal(Utils.skillBonus(c, 'religion'), 1);
});

test('Monge 2024: Artes Marciais com DES e d6 em armas de monge e no Golpe Desarmado', () => {
  const c = make({ className: 'monk', abilities: { str: 12, dex: 15, con: 13, int: 10, wis: 14, cha: 8 } });
  const spear = Utils.attackFor(c, { id: 'spear' });
  assert.deepEqual([spear.bonus, spear.damage, spear.ability, spear.monk], [4, '1d6+2', 'dex', true]);
  const dagger = Utils.attackFor(c, { id: 'dagger' });
  assert.equal(dagger.damage, '1d6+2');
  const u = Utils.unarmedStrike(c);
  assert.deepEqual([u.bonus, u.damage, u.dmgType], [4, '1d6+2', 'bludgeoning']);
  // dado sobe com o nível
  assert.equal(Utils.martialArtsDie({ ...c, level: 5 }), '1d8');
  assert.equal(Utils.martialArtsDie({ ...c, level: 11 }), '1d10');
  assert.equal(Utils.martialArtsDie({ ...c, level: 17 }), '1d12');
  // Marcial Leve é arma de monge em 2024; Pesada não
  assert.equal(Utils.isMonkWeapon(c, { id: 'scimitar', type: 'martial-melee', props: ['finesse', 'light'] }), true);
  assert.equal(Utils.attackFor(c, { id: 'greatsword' }).monk, false);
  // De armadura, sem Artes Marciais
  assert.equal(Utils.attackFor({ ...c, armor: 'leather' }, { id: 'spear' }).damage, '1d6+1');
});

test('Monge 2014: d4 no 1º nível; espada curta é arma de monge', () => {
  const c = make({ rulesVersion: '2014', className: 'monk', abilities: { str: 10, dex: 16, con: 13, int: 10, wis: 14, cha: 8 } });
  assert.equal(Utils.martialArtsDie(c), '1d4');
  assert.equal(Utils.unarmedStrike(c).damage, '1d4+3');
  assert.equal(Utils.attackFor(c, { id: 'shortsword' }).monk, true);
  assert.equal(Utils.attackFor(c, { id: 'quarterstaff' }).ability, 'dex');
});

test('Golpe Desarmado de quem não é monge: 1 + FOR de concussão', () => {
  const c = make({ className: 'fighter', abilities: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } });
  const u = Utils.unarmedStrike(c);
  assert.deepEqual([u.bonus, u.damage, u.dice], [5, '4', '']);
  assert.equal(Utils.damageLabel(u.dmgType, 'pt'), 'concussão');
});

test('tipo de dano e deslocamento no idioma da tela', () => {
  assert.equal(Utils.damageLabel('slashing', 'pt'), 'cortante');
  assert.equal(Utils.damageLabel('piercing', 'pt'), 'perfurante');
  assert.equal(Utils.damageLabel('cortante', 'en'), 'slashing');
  assert.equal(Utils.speedLabel(30, 'pt'), '9 m');
  assert.equal(Utils.speedLabel(35, 'pt'), '10,5 m');
  assert.equal(Utils.speedLabel(30, 'en'), '30 ft');
});

test('ataque com arma sem proficiência não soma o bônus de proficiência', () => {
  const c = make({ rulesVersion: '2014', className: 'wizard', abilities: { str: 14, dex: 10, con: 10, int: 16, wis: 10, cha: 10 } });
  const gs = Utils.attackFor(c, { id: 'greatsword' });
  assert.equal(gs.proficient, false);
  assert.equal(gs.bonus, 2);
  assert.equal(Utils.attackFor(c, { id: 'dagger' }).bonus, 4);
});

test('treino de armaduras e armas na ficha (mesmo texto do PDF)', () => {
  const fighter = make({ className: 'fighter' });
  const lines = trainingLines(fighter, 'pt');
  assert.deepEqual(lines.map(l => `${l.label}: ${l.text}`), ['Armaduras: leves, médias, pesadas, escudos', 'Armas: simples, marciais']);
  const wiz14 = make({ rulesVersion: '2014', className: 'wizard' });
  const w = trainingLines(wiz14, 'pt');
  assert.equal(w.length, 1);
  assert.match(w[0].text, /Adaga/);
});

test('característica do antecedente 2014 aparece na ficha e no PDF', () => {
  const c = make({ rulesVersion: '2014', className: 'wizard', background: 'sage', race: 'human' });
  assert.equal(backgroundFeature(c, 'pt').name, 'Pesquisador');
  assert.equal(backgroundFeature({ ...c, rulesVersion: '2024' }, 'pt'), null);
  const d = buildSheetData(c, 'pt');
  assert.match(d.fields['Features and Traits'], /Pesquisador/);
  assert.ok(d.sections.some(s => s.items.some(i => /Pesquisador/.test(i.title) && /descobrir/.test(i.text))));
});

test('características de classe 2024 usam os traços de 2024 e as escolhas feitas', () => {
  const c = make({ className: 'fighter', classOptions: [{ classId: 'fighter', pool: 'fightingStyle', id: 'defense' }] });
  const titles = classFeatureList(c, 'pt', { withLevel: false }).map(f => f.title);
  assert.ok(titles.includes('Retomar o Fôlego'));
  assert.ok(titles.includes('Maestria em Armas'));
  assert.ok(titles.includes('Defesa'));
  assert.ok(!titles.includes('Segundo Fôlego'));
  const cleric = classFeatureList(make({ className: 'cleric' }), 'pt', { withLevel: false }).map(f => f.title);
  assert.ok(cleric.includes('Ordem Divina'));
  assert.ok(!cleric.some(t => /Domínio Divino/.test(t)));
});

test('talento de origem com nome em pt, descrição e escolhas (ficha e PDF)', () => {
  const feats = [
    { id: 'savageAttacker', name: 'Savage Attacker', origin: 'background', level: 1 },
    { id: 'magicInitiate', name: 'Magic Initiate (Cleric)', origin: 'background', level: 1,
      picks: { spellList: 'cleric', spellAbility: 'wis', cantrip: ['guidance', 'light'], spell: ['bless'] } },
  ];
  const c = make({ className: 'fighter', feats });
  assert.equal(featName(c, feats[0], 'pt'), 'Atacante Selvagem');
  assert.equal(featName(c, feats[1], 'pt'), 'Iniciado em Magia (Clérigo)');
  assert.match(featPicksText(feats[1].picks, 'pt'), /Atributo de conjuração: Sabedoria/);
  const d = buildSheetData(c, 'pt');
  assert.match(d.fields['Feat+Traits'], /Talento: Atacante Selvagem/);
  assert.match(d.fields['Feat+Traits'], /Iniciado em Magia \(Clérigo\) \(.*Truques: .*Magia: /);
  assert.doesNotMatch(d.fields['Feat+Traits'], /Savage|Magic Initiate/);
  const items = d.sections.flatMap(s => s.items);
  assert.ok(items.find(i => /Atacante Selvagem/.test(i.title)).text.length > 10);
});

test('PDF página 2: escolhas da espécie com o valor escolhido e sem repetir o traço', () => {
  const c = make({ className: 'fighter', race: 'human' });
  const summary = () => [['Tamanho', 'Médio'], ['Habilidoso: perícia', 'Intuição'], ['Versátil: talento de Origem', 'Vigoroso']];
  const d = buildSheetData(c, 'pt', { speciesSummary: summary });
  const lines = d.fields['Feat+Traits'].split('\n');
  assert.ok(lines.includes('• Tamanho: Médio'));
  assert.ok(lines.includes('• Habilidoso: perícia: Intuição'));
  assert.ok(lines.includes('• Versátil: talento de Origem: Vigoroso'));
  assert.equal(lines.filter(l => /Habilidoso/.test(l)).length, 1);
  assert.equal(lines.filter(l => /Versátil/.test(l)).length, 1);
});

test('PDF: Golpe Desarmado e dano traduzido nos ataques', () => {
  const c = make({ className: 'monk', abilities: { str: 12, dex: 15, con: 13, int: 10, wis: 14, cha: 8 }, weapons: [{ id: 'spear', name: 'Lança' }] });
  const d = buildSheetData(c, 'pt');
  assert.equal(d.fields['Wpn1 AtkBonus'], '+4');
  assert.equal(d.fields['Wpn1 Damage'], '1d6+2 perfurante');
  assert.equal(d.fields['Wpn Name 2'], 'Golpe Desarmado');
  assert.equal(d.fields['Wpn2 Damage '], '1d6+2 concussão');
});

test('metadados de magia sem tradução viram pt (tempo, alcance, duração)', () => {
  assert.equal(Utils.metaPt('1 action', 'time'), '1 ação');
  assert.equal(Utils.metaPt('Reaction, which you take when you take acid damage', 'time'), '1 reação (gatilho na descrição)');
  assert.equal(Utils.metaPt('120 ft', 'range'), '36 m');
  assert.equal(Utils.metaPt('Self (5-foot Emanation)', 'range'), 'Pessoal (emanação de 1,5 m)');
  assert.equal(Utils.metaPt('Concentration, up to 1 minute', 'duration'), 'Concentração, até 1 minuto');
  assert.equal(Utils.spellMeta({ castingTime: '1 action', range: '30 ft', components: 'V', duration: 'Instant' }, 'pt').range, '9 m');
  assert.equal(Utils.spellMeta({ castingTime: '1 action', range: '30 ft' }, 'en').range, '30 ft');
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
const expect = (v) => ({ toEqual: (x) => assert.deepEqual(v, x), toBe: (x) => assert.equal(v, x), toHaveLength: (n) => assert.equal(v.length, n), toBeNull: () => assert.equal(v, null), not: { toMatch: (r) => assert.doesNotMatch(v, r) } });
import { parseRich, splitLead } from '../src/sheet/rich-text.js';
import { placeFeatures } from '../src/sheet/feature-placement.js';
import { computeProgression } from '../src/progression/engine.js';

describe('parseRich: texto de regra vira blocos', () => {
  it('subtítulos markdown e em caixa alta', () => {
    const b = parseRich('Intro.\n\n#### Cantrips\n\nYou know two.\n\nTOOLS REQUIRED\n\nYou need tools.');
    expect(b.map(x => x.t)).toEqual(['p', 'h', 'p', 'h', 'p']);
    expect(b[1].text).toBe('Cantrips');
    expect(b[3].text).toBe('TOOLS REQUIRED');
  });
  it('texto achatado numa linha quebra antes do ####', () => {
    expect(parseRich('Facility with spells. #### Cantrips You know two.').map(x => x.t)).toEqual(['p', 'h']);
  });
  it('bullets agrupados numa lista', () => {
    const b = parseRich('Choose:\n\n• Light.\n\n• Sound.\n\nAfter.');
    expect(b[1]).toEqual({ t: 'ul', items: ['Light.', 'Sound.'] });
    expect(b[2].t).toBe('p');
  });
  it('tabela com legenda (linha curta antes) e cabeçalho', () => {
    const b = parseRich('Roll on the table.\n\nExperimental Elixir\n\n| d6 | Effect |\n\n| 1 | Healing. Regain 2d4. |\n\n| 2 | Swiftness. Speed +10. |');
    const t = b.find(x => x.t === 'table');
    expect(t.caption).toBe('Experimental Elixir');
    expect(t.head).toEqual(['d6', 'Effect']);
    expect(t.rows).toHaveLength(2);
  });
  it('tabela sem barras nas pontas (magias psiônicas)', () => {
    const t = parseRich('Psionic Spells\n\nSorcerer Level | Spells\n\n1st | arms of Hadar, mind sliver\n\n3rd | calm emotions').find(x => x.t === 'table');
    expect(t.caption).toBe('Psionic Spells');
    expect(t.rows.map(r => r[0])).toEqual(['1st', '3rd']);
  });
  it('ficha de criatura: propriedades, atributos, seções', () => {
    const b = parseRich('It obeys you.\n\nHomunculus Servant\n\nTiny construct\n\n• Armor Class 13 (natural armor)\n\n• Speed 6 m., fly 9 m.\n\n| STR | DEX | CON | INT | WIS | CHA |\n\n| 4 (-3) | 15 (+2) | 12 (+1) | 10 (+0) | 10 (+0) | 7 (-2) |\n\n• Senses darkvision 18 m.\n\nEvasion. If subjected to an effect.\n\nActions\n\nForce Strike. Ranged Weapon Attack.');
    const sb = b.find(x => x.t === 'sb');
    expect(sb.name).toBe('Homunculus Servant');
    expect(sb.meta).toBe('Tiny construct');
    expect(sb.props.filter(p => p.label).map(p => p.label)).toEqual(['Armor Class', 'Speed', 'Senses']);
    expect(sb.abil.head).toHaveLength(6);
    expect(sb.props.find(p => p.lead)?.lead).toBe('Evasion.');
    expect(sb.sections[0].name).toBe('Actions');
    expect(sb.sections[0].entries[0].lead).toBe('Force Strike.');
  });
  it('ficha do SRD 5.2 (Str 16 +3 +3 · Dex …)', () => {
    const sb = parseRich('Aberrant Spirit\n\nMedium Aberration, Neutral\n\nAC 11 + the spell’s level\nHP 40\nMOD SAVE\nStr 16 +3 +3 · Dex 10 +0 +0').find(x => x.t === 'sb');
    expect(sb.props.map(p => p.label)).toEqual(['AC', 'HP']);
    expect(sb.abil2).toHaveLength(2);
  });
  it('nome em negrito só quando parece nome', () => {
    expect(splitLead('Healing. The drinker regains')).toEqual(['Healing.', 'The drinker regains']);
    expect(splitLead('You can. Then more')).toBeNull();
    expect(splitLead('At 1st level, you know two.')).toBeNull();
  });
  it('eyebrow "1st-level Undead feature"', () => {
    expect(parseRich('1st-level Undead feature\n\nYou manifest.')[0].t).toBe('eyebrow');
  });
});

describe('nomes em inglês dos traços 2014', () => {
  it('artífice mostra nomes ingleses no modo EN', () => {
    const char = { className: 'artificer', subclass: 'alchemist', level: 3, rulesVersion: '2014' };
    const items = placeFeatures(char, computeProgression(char)).items;
    const en = Object.fromEntries(items.map(i => [i.id, i.name.en]));
    expect(en.spellcasting).toBe('Spellcasting');
    expect(en.infuseItem).toBe('Infuse Item');
    expect(en.experimentalElixir).toBe('Experimental Elixir');
    expect(items.find(i => i.id === 'spellcasting').desc.pt).not.toMatch(/não a remove da sua lista de magias preparadas\.\n\nHABILIDADE/);
  });
});

import { cleanSpellText, statblockToMonster } from '../src/sheet/rich-text.js';
describe('magias com criatura', () => {
  it('tira o cabeçalho do Aurora', () => {
    const t = cleanSpellText('Name: Spirit of Death\n\nType: Spell\n\nAurora ID: X\n\nSetters:\nlevel: 4\n\nDescription:\nYou call forth a spirit.\nAt Higher Levels.\nWhen you cast it.');
    assert.equal(t, 'You call forth a spirit.\nAt Higher Levels. When you cast it.');
  });
  it('Espírito Aberrante vira monstro do bloco do combate', () => {
    const sb = parseRich('Aberrant Spirit\n\nMedium Aberration, Neutral\n\nAC 11 + the spell’s level\nHP 40\nSpeed 30 ft.\n\nMOD SAVE\nStr 16 +3 +3 · Dex 10 +0 +0 · Con 15 +2 +2\nInt 16 +3 +3 · Wis 10 +0 +0 · Cha 6 -2 -2\n\nImmunities Psychic\nCR None (XP 0; PB equals your Proficiency Bonus)\n\nTraits\n\nRegeneration (Slaad Only). Regains 5 HP.\n\nActions\n\nMultiattack. Attacks.\n\nEye Ray (Beholderkin Only). Ranged.').find(x => x.t === 'sb');
    const m = statblockToMonster(sb);
    assert.equal(m.acText, '11 + the spell’s level');
    assert.equal(m.abilities.str, 16); assert.equal(m.abilities.cha, 6);
    assert.equal(m.immuneText, 'Psychic'); assert.equal(m.cr, 'None');
    assert.deepEqual(m.traits.map(x => x.name), ['Regeneration (Slaad Only)']);
    assert.deepEqual(m.actions.map(x => x.name), ['Multiattack', 'Eye Ray (Beholderkin Only)']);
  });
});

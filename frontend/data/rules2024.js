import rules from './srd2024-rules.json' with { type: 'json' };
import spells from './srd2024-spells.json' with { type: 'json' };
import species from './srd2024-species.json' with { type: 'json' };
// Tradução pt-BR do texto das magias do SRD 5.2.1 (CC-BY 4.0): descrição, tempo, alcance, componentes, duração.
import spellsPt from './srd2024-spells-pt.json' with { type: 'json' };

export const RULES_2024 = rules;
import { EXTRA_SPELLS_2024, SPELL_NAMES_PT } from './spells-extra.js';
import { SPECIES_2024_REVISED, AASIMAR_2024 } from './species-2024.js';

// SRD 5.2.1 + magias de outros livros (resumos próprios), com nomes PT revisados.
export const SPELLS_2024 = [
  ...spells.map(s => {
    const pt = spellsPt[s.id];
    return {
      ...s,
      ...(SPELL_NAMES_PT[s.id] ? { name: { ...s.name, pt: SPELL_NAMES_PT[s.id] } } : {}),
      // Campos em inglês continuam (filtros comparam "Action" etc.); o texto em pt fica em desc.pt e metaPt.
      ...(pt ? { desc: { ...s.desc, pt: pt.desc }, metaPt: { castingTime: pt.castingTime, range: pt.range, components: pt.components, duration: pt.duration } } : {}),
    };
  }),
  ...EXTRA_SPELLS_2024.filter(x => !spells.some(s => s.id === x.id)),
];
// Traços revisados (PT/EN, sem o lixo da extração do PDF) por cima do JSON gerado,
// mais o Aasimar do PHB 2024 (resumo próprio). Ver data/species-2024.js.
export const SPECIES_2024 = [
  ...species.map(s => {
    const r = SPECIES_2024_REVISED[s.id];
    return r ? { ...s, size: r.size, speed: r.speed, traits: r.traits, ...(r.choices ? { choices: r.choices } : {}) } : s;
  }),
  AASIMAR_2024,
];
export const is2024 = char => char.rulesVersion === '2024';
export const RULES_SOURCE = 'https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf';

// Ability options and origin feats from the 2024 backgrounds.
export const BACKGROUNDS_2024 = [
  ['acolyte','Acólito','Acolyte',['int','wis','cha'],['insight','religion'],'Magic Initiate (Cleric)'],
  ['artisan','Artesão','Artisan',['str','dex','int'],['investigation','persuasion'],'Crafter'],
  ['charlatan','Charlatão','Charlatan',['dex','con','cha'],['deception','sleightOfHand'],'Skilled'],
  ['criminal','Criminoso','Criminal',['dex','con','int'],['sleightOfHand','stealth'],'Alert'],
  ['entertainer','Artista','Entertainer',['str','dex','cha'],['acrobatics','performance'],'Musician'],
  ['farmer','Fazendeiro','Farmer',['str','con','wis'],['animalHandling','nature'],'Tough'],
  ['guard','Guarda','Guard',['str','int','wis'],['athletics','perception'],'Alert'],
  ['guide','Guia','Guide',['dex','con','wis'],['stealth','survival'],'Magic Initiate (Druid)'],
  ['hermit','Eremita','Hermit',['con','wis','cha'],['medicine','religion'],'Healer'],
  ['merchant','Mercador','Merchant',['con','int','cha'],['animalHandling','persuasion'],'Lucky'],
  ['noble','Nobre','Noble',['str','int','cha'],['history','persuasion'],'Skilled'],
  ['sage','Sábio','Sage',['con','int','wis'],['arcana','history'],'Magic Initiate (Wizard)'],
  ['sailor','Marinheiro','Sailor',['str','dex','wis'],['acrobatics','perception'],'Tavern Brawler'],
  ['scribe','Escriba','Scribe',['dex','int','wis'],['investigation','perception'],'Skilled'],
  ['soldier','Soldado','Soldier',['str','dex','con'],['athletics','intimidation'],'Savage Attacker'],
  ['wayfarer','Viajante','Wayfarer',['dex','wis','cha'],['insight','stealth'],'Lucky'],
].map(([id,pt,en,abilities,skills,feat]) => ({ id, name:{pt,en}, abilities, skills, feat,
  equipment:{pt:`Talento de origem: ${feat}. Equipamento: 50 PO ou pacote do antecedente.`,en:`Origin feat: ${feat}. Equipment: 50 GP or the background's package.`} }));

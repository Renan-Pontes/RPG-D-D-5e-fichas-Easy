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

const BACKGROUNDS_2024_EQ = {
  "acolyte": {
    "pt": "Talento de origem: Iniciado em Magia (Clérigo). Equipamento: Escolha A ou B: (A) Suprimentos de Calígrafo, Livro (orações), Símbolo Sagrado, Pergaminho (10 folhas), Robe, 8 PO; ou (B) 50 PO.",
    "en": "Origin feat: Magic Initiate (Cleric). Equipment: Choose A or B: (A) Calligrapher's Supplies, Book (prayers), Holy Symbol, Parchment (10 sheets), Robe, 8 GP; or (B) 50 GP."
  },
  "artisan": {
    "pt": "Talento de origem: Artesão. Equipamento: Escolha A ou B: (A) Ferramentas de Artesão (mesmas que acima), 2 Bolsas, Roupas de Viajante, 32 PO; ou (B) 50 PO.",
    "en": "Origin feat: Crafter. Equipment: Choose A or B: (A) Artisan's Tools (same as above), 2 Pouches, Traveler's Clothes, 32 GP; or (B) 50 GP."
  },
  "charlatan": {
    "pt": "Talento de origem: Habilidoso. Equipamento: Escolha A ou B: (A) Kit de Falsificação, Traje, Roupas Finas, 15 PO; ou (B) 50 PO.",
    "en": "Origin feat: Skilled. Equipment: Choose A or B: (A) Forgery Kit, Costume, Fine Clothes, 15 GP; or (B) 50 GP."
  },
  "criminal": {
    "pt": "Talento de origem: Alerta. Equipamento: Escolha A ou B: (A) 2 Adagas, Ferramentas de Ladrão, Pé de Cabra, 2 Bolsas, Roupas de Viajante, 16 PO; ou (B) 50 PO.",
    "en": "Origin feat: Alert. Equipment: Choose A or B: (A) 2 Daggers, Thieves' Tools, Crowbar, 2 Pouches, Traveler's Clothes, 16 GP; or (B) 50 GP."
  },
  "entertainer": {
    "pt": "Talento de origem: Músico. Equipamento: Escolha A ou B: (A) Instrumento Musical (mesmo que acima), 2 Trajes, Espelho, Perfume, Roupas de Viajante, 11 PO; ou (B) 50 PO.",
    "en": "Origin feat: Musician. Equipment: Choose A or B: (A) Musical Instrument (same as above), 2 Costumes, Mirror, Perfume, Traveler's Clothes, 11 GP; or (B) 50 GP."
  },
  "farmer": {
    "pt": "Talento de origem: Vigoroso. Equipamento: Escolha A ou B: (A) Foice Curta, Ferramentas de Carpinteiro, Kit de Curandeiro, Panela de Ferro, Pá, 30 PO; ou (B) 50 PO.",
    "en": "Origin feat: Tough. Equipment: Choose A or B: (A) Sickle, Carpenter's Tools, Healer's Kit, Iron Pot, Shovel, 30 GP; or (B) 50 GP."
  },
  "guard": {
    "pt": "Talento de origem: Alerta. Equipamento: Escolha A ou B: (A) Lança, Besta Leve, 20 Virotes, Conjunto de Jogos (o mesmo citado acima), Lanterna Furta-Fogo, Algemas, Aljava, Roupas de Viajante, 12 PO; ou (B) 50 PO.",
    "en": "Origin feat: Alert. Equipment: Choose A or B: (A) Spear, Light Crossbow, 20 Bolts, Gaming Set (same as above), Hooded Lantern, Manacles, Quiver, Traveler's Clothes, 12 GP; or (B) 50 GP."
  },
  "guide": {
    "pt": "Talento de origem: Iniciado em Magia (Druida). Equipamento: Escolha A ou B: (A) Arco Curto, 20 Flechas, Ferramentas de Cartógrafo, Saco de Dormir, Aljava, Barraca, Roupas de Viajante, 3 PO; ou (B) 50 PO.",
    "en": "Origin feat: Magic Initiate (Druid). Equipment: Choose A or B: (A) Shortbow, 20 Arrows, Cartographer's Tools, Bedroll, Quiver, Tent, Traveler's Clothes, 3 GP; or (B) 50 GP."
  },
  "hermit": {
    "pt": "Talento de origem: Curandeiro. Equipamento: Escolha A ou B: (A) Bordão, Kit de Herbalismo, Saco de Dormir, Livro (filosofia), Lâmpada, Óleo (3 frascos), Roupas de Viajante, 16 PO; ou (B) 50 PO.",
    "en": "Origin feat: Healer. Equipment: Choose A or B: (A) Quarterstaff, Herbalism Kit, Bedroll, Book (philosophy), Lamp, Oil (3 flasks), Traveler's Clothes, 16 GP; or (B) 50 GP."
  },
  "merchant": {
    "pt": "Talento de origem: Sortudo. Equipamento: Escolha A ou B: (A) Ferramentas de Navegador, 2 Bolsas, Roupas de Viajante, 22 PO; ou (B) 50 PO.",
    "en": "Origin feat: Lucky. Equipment: Choose A or B: (A) Navigator's Tools, 2 Pouches, Traveler's Clothes, 22 GP; or (B) 50 GP."
  },
  "noble": {
    "pt": "Talento de origem: Habilidoso. Equipamento: Escolha A ou B: (A) Conjunto de Jogos (o mesmo citado acima), Roupas Finas, Perfume, 29 PO; ou (B) 50 PO.",
    "en": "Origin feat: Skilled. Equipment: Choose A or B: (A) Gaming Set (same as above), Fine Clothes, Perfume, 29 GP; or (B) 50 GP."
  },
  "sage": {
    "pt": "Talento de origem: Iniciado em Magia (Mago). Equipamento: Escolha A ou B: (A) Bordão, Suprimentos de Calígrafo, Livro (história), Pergaminho (8 folhas), Manto, 8 PO; ou (B) 50 PO.",
    "en": "Origin feat: Magic Initiate (Wizard). Equipment: Choose A or B: (A) Quarterstaff, Calligrapher's Supplies, Book (history), Parchment (8 sheets), Robe, 8 GP; or (B) 50 GP."
  },
  "sailor": {
    "pt": "Talento de origem: Valentão de Taverna. Equipamento: Escolha A ou B: (A) Adaga, Ferramentas de Navegador, Corda, Roupas de Viajante, 20 PO; ou (B) 50 PO.",
    "en": "Origin feat: Tavern Brawler. Equipment: Choose A or B: (A) Dagger, Navigator's Tools, Rope, Traveler's Clothes, 20 GP; or (B) 50 GP."
  },
  "scribe": {
    "pt": "Talento de origem: Habilidoso. Equipamento: Escolha A ou B: (A) Suprimentos de Calígrafo, Roupas Finas, Lâmpada, Óleo (3 frascos), Pergaminho (12 folhas), 23 PO; ou (B) 50 PO.",
    "en": "Origin feat: Skilled. Equipment: Choose A or B: (A) Calligrapher's Supplies, Fine Clothes, Lamp, Oil (3 flasks), Parchment (12 sheets), 23 GP; or (B) 50 GP."
  },
  "soldier": {
    "pt": "Talento de origem: Atacante Selvagem. Equipamento: Escolha A ou B: (A) Lança, Arco Curto, 20 Flechas, Conjunto de Jogos (o mesmo citado acima), Kit de Curandeiro, Aljava, Roupas de Viajante, 14 PO; ou (B) 50 PO.",
    "en": "Origin feat: Savage Attacker. Equipment: Choose A or B: (A) Spear, Shortbow, 20 Arrows, Gaming Set (same as above), Healer's Kit, Quiver, Traveler's Clothes, 14 GP; or (B) 50 GP."
  },
  "wayfarer": {
    "pt": "Talento de origem: Sortudo. Equipamento: Escolha A ou B: (A) 2 Dagas, Ferramentas de Ladrão, Conjunto de Jogos (qualquer um), Saco de Dormir, 2 Bolsas, Roupas de Viajante, 16 PO; ou (B) 50 PO.",
    "en": "Origin feat: Lucky. Equipment: Choose A or B: (A) 2 Daggers, Thieves' Tools, Gaming Set (any), Bedroll, 2 Pouches, Traveler's Clothes, 16 GP; or (B) 50 GP."
  }
};

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
  equipment:BACKGROUNDS_2024_EQ[id] }));

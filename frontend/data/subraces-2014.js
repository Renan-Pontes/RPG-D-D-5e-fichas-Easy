/* Sub-raças e variantes oficiais de 2014 fora do SRD (MToF, VGM, ERLW, SCAG, EGtW).
 *
 * Mesmo padrão das sub-raças do SRD em srd.js (dwarf-hill, elf-high…): cada
 * sub-raça é uma raça própria, com id "base-sub", e aparece logo depois da
 * raça-base na lista. O XML do Aurora serviu só de mapa de estrutura (nomes,
 * atributos, tamanho, deslocamento, idiomas, magias inatas por nível). Os
 * textos são resumos originais curtos, não texto dos livros.
 *
 * SUBRACES_2014: entradas de raça (srd.js RACES).
 * SUBRACE_EFFECTS_2014: efeitos e escolhas (species-2024.js SPECIES_2014_CHOICES;
 * motor em src/progression/species.js).
 * SUBRACE_RESOURCES_2014: usos por descanso (src/progression/resources.js).
 */
const b = (pt, en) => ({ pt, en });
const T = (pt, en, dpt, den, extra = {}) => ({ name: b(pt, en), desc: b(dpt, den), ...extra });
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const AB = { str: b('Força', 'Strength'), dex: b('Destreza', 'Dexterity'), con: b('Constituição', 'Constitution'), int: b('Inteligência', 'Intelligence'), wis: b('Sabedoria', 'Wisdom'), cha: b('Carisma', 'Charisma') };

const SPELL = {
  thaumaturgy: b('Taumaturgia', 'Thaumaturgy'), hellishRebuke: b('Repreensão Infernal', 'Hellish Rebuke'), darkness: b('Escuridão', 'Darkness'),
  rayOfSickness: b('Raio de Doença', 'Ray of Sickness'), crownOfMadness: b('Coroa da Loucura', 'Crown of Madness'),
  disguiseSelf: b('Disfarçar-se', 'Disguise Self'), detectThoughts: b('Detectar Pensamentos', 'Detect Thoughts'),
  friends: b('Amigos', 'Friends'), charmPerson: b('Enfeitiçar Pessoa', 'Charm Person'), suggestion: b('Sugestão', 'Suggestion'),
  minorIllusion: b('Ilusão Menor', 'Minor Illusion'), invisibility: b('Invisibilidade', 'Invisibility'),
  rayOfFrost: b('Raio Gélido', 'Ray of Frost'), armorOfAgathys: b('Armadura de Agathys', 'Armor of Agathys'),
  mageHand: b('Mão Mágica', 'Mage Hand'), floatingDisk: b('Disco Flutuante', 'Floating Disk'), arcaneLock: b('Tranca Arcana', 'Arcane Lock'),
  burningHands: b('Mãos Flamejantes', 'Burning Hands'), flameBlade: b('Lâmina de Chama', 'Flame Blade'),
  searingSmite: b('Destruição Abrasadora', 'Searing Smite'), brandingSmite: b('Bênção Flamejante', 'Branding Smite'),
  viciousMockery: b('Caçoada Cruel', 'Vicious Mockery'), enthrall: b('Cativar', 'Enthrall'),
  light: b('Luz', 'Light'), entangle: b('Enredar', 'Entangle'), spikeGrowth: b('Crescimento de Espinhos', 'Spike Growth'), sleep: b('Sono', 'Sleep'),
  druidcraft: b('Druidcraft', 'Druidcraft'), detectMagic: b('Detectar Magia', 'Detect Magic'),
  detectPoisonAndDisease: b('Detectar Veneno e Doenças', 'Detect Poison and Disease'), seeInvisibility: b('Ver Invisibilidade', 'See Invisibility'),
  huntersMark: b('Marca do Caçador', "Hunter's Mark"), locateObject: b('Localizar Objeto', 'Locate Object'),
  animalFriendship: b('Amizade com Animais', 'Animal Friendship'), speakWithAnimals: b('Falar com Animais', 'Speak with Animals'),
  cureWounds: b('Curar Ferimentos', 'Cure Wounds'), prestidigitation: b('Prestidigitação', 'Prestidigitation'),
  purifyFoodAndDrink: b('Purificar Comida e Bebida', 'Purify Food and Drink'), unseenServant: b('Servo Invisível', 'Unseen Servant'),
  mending: b('Remendar', 'Mending'), magicWeapon: b('Arma Mágica', 'Magic Weapon'), mistyStep: b('Passo Brumoso', 'Misty Step'),
  message: b('Mensagem', 'Message'), comprehendLanguages: b('Compreender Idiomas', 'Comprehend Languages'), magicMouth: b('Boca Encantada', 'Magic Mouth'),
  shield: b('Escudo Arcano', 'Shield'), gust: b('Lufada', 'Gust'), gustOfWind: b('Rajada de Vento', 'Gust of Wind'),
  alarm: b('Alarme', 'Alarm'), mageArmor: b('Armadura Mágica', 'Mage Armor'), dancingLights: b('Luzes Dançantes', 'Dancing Lights'), faerieFire: b('Fogo Feérico', 'Faerie Fire'),
};
const names = (ids, l) => ids.map(id => SPELL[id][l]).join(l === 'pt' ? ' e ' : ' and ');

/** Resumo de magia inata: truques + magias por nível, 1× por descanso longo, com o atributo. */
function innateDesc(fx, ability, note = b('', '')) {
  const pt = [], en = [];
  if (fx.cantrips?.length) { pt.push(`Você conhece ${names(fx.cantrips, 'pt')}.`); en.push(`You know ${names(fx.cantrips, 'en')}.`); }
  for (const [lv, ids] of Object.entries(fx.spells || {})) {
    const at = +lv > 1;
    pt.push(`${at ? `A partir do nível ${lv}, conjure` : 'Conjure'} ${names(ids, 'pt')} sem espaço de magia, 1× por descanso longo${ids.length > 1 ? ' cada' : ''}.`);
    en.push(`${at ? `From level ${lv}, cast` : 'Cast'} ${names(ids, 'en')} without a spell slot, once per long rest${ids.length > 1 ? ' each' : ''}.`);
  }
  pt.push(`Atributo: ${AB[ability].pt}.`); en.push(`Ability: ${AB[ability].en}.`);
  return b([...pt, note.pt].filter(Boolean).join(' '), [...en, note.en].filter(Boolean).join(' '));
}
const innate = (pt, en, fx, ability, note, extra) => ({ name: b(pt, en), desc: innateDesc(fx, ability, note), ...extra });

// Traços compartilhados com as raças-base (resumos curtos no estilo de srd.js).
const DV = T('Visão no Escuro', 'Darkvision', '60 pés.', '60 ft.');
const HELLISH = T('Resistência Infernal', 'Hellish Resistance', 'Resistência a dano de fogo.', 'Resistance to fire damage.');
const FEY = T('Ancestral Feérico', 'Fey Ancestry', 'Vantagem contra ser enfeitiçado; magia não pode pôr você para dormir.', "Advantage against being charmed; magic can't put you to sleep.");
const KEEN = T('Sentidos Apurados', 'Keen Senses', 'Proficiência em Percepção.', 'Proficiency in Perception.');
const TRANCE = T('Transe', 'Trance', 'Você medita 4h em vez de dormir.', 'You meditate for 4 hours instead of sleeping.');
const LUCKY = T('Sortudo', 'Lucky', 'Rerrole 1 natural em ataques, testes e salvaguardas.', 'Reroll natural 1s on attacks, checks, and saves.');
const BRAVE = T('Bravo', 'Brave', 'Vantagem contra ficar amedrontado.', 'Advantage against being frightened.');
const NIMBLE = T('Agilidade Halfling', 'Halfling Nimbleness', 'Atravessa o espaço de criaturas maiores que você.', 'Move through the space of larger creatures.');
const GNOME_CUNNING = T('Astúcia Gnômica', 'Gnome Cunning', 'Vantagem em salvaguardas de INT/SAB/CAR contra magia.', 'Advantage on INT/WIS/CHA saves against magic.');
const MARK_SPELLS = T('Magias da Marca', 'Spells of the Mark', 'Se você tem Conjuração ou Magia de Pacto, as magias da sua marca entram na lista da sua classe (lista no livro; anote na ficha).', 'If you have Spellcasting or Pact Magic, your mark\'s spells join your class spell list (list in the book; note it on the sheet).');
const intuition = (pt, en, what) => T(pt, en, `Some 1d4 aos testes de ${what.pt}.`, `Add 1d4 to ${what.en} checks.`);

const RACES = [];
const EFFECTS = {};
const RESOURCES = {};
/** Registra uma sub-raça: entrada de raça + efeitos/escolhas + recursos. */
// profs: proficiências raciais no formato de srd.js ({ weapons, armor, tools }); a
// visão no escuro dos efeitos (fx.darkvision) também vai para a entrada da raça.
function add(id, base, source, pt, en, { size = 'Medium', speed = 30, asi, languages, traits, fx = {}, resources, profs = {} }) {
  RACES.push({ id, base, name: b(pt, en), size, speed, asi, source, languages, traits, ...profs, ...(fx.darkvision ? { darkvision: fx.darkvision } : {}) });
  if (Object.keys(fx).length) EFFECTS[id] = fx;
  if (resources) RESOURCES[id] = resources;
}
const res = (id, pt, en, uses, recharge, minLevel) => ({ id, name: b(pt, en), uses, recharge, ...(minLevel ? { minLevel } : {}) });
const ONE = { fixed: 1 };

// ---------------------------------------------------------------------------
// Tieflings: linhagens do Mordenkainen's Tome of Foes (o tiefling base = Asmodeus)
// ---------------------------------------------------------------------------
const TIEFLING_LINES = [
  ['baalzebul', 'Baalzebul', 'Legado de Maladomini', 'Legacy of Maladomini', { int: 1 }, ['thaumaturgy'], 'rayOfSickness', 'crownOfMadness'],
  ['dispater', 'Dispater', 'Legado de Dis', 'Legacy of Dis', { dex: 1 }, ['thaumaturgy'], 'disguiseSelf', 'detectThoughts'],
  ['fierna', 'Fierna', 'Legado de Flegetos', 'Legacy of Phlegethos', { wis: 1 }, ['friends'], 'charmPerson', 'suggestion'],
  ['glasya', 'Glasya', 'Legado de Malbolge', 'Legacy of Malbolge', { dex: 1 }, ['minorIllusion'], 'disguiseSelf', 'invisibility'],
  ['levistus', 'Levistus', 'Legado de Estígia', 'Legacy of Stygia', { con: 1 }, ['rayOfFrost'], 'armorOfAgathys', 'darkness'],
  ['mammon', 'Mammon', 'Legado de Minauros', 'Legacy of Minauros', { int: 1 }, ['mageHand'], 'floatingDisk', 'arcaneLock'],
  ['mephistopheles', 'Mephistopheles', 'Legado de Cania', 'Legacy of Cania', { int: 1 }, ['mageHand'], 'burningHands', 'flameBlade'],
  ['zariel', 'Zariel', 'Legado de Avernus', 'Legacy of Avernus', { str: 1 }, ['thaumaturgy'], 'searingSmite', 'brandingSmite'],
];
const SECOND = b('As magias de nível 3 são conjuradas como de 2º círculo.', 'The level 3 spell is cast as a 2nd-level spell.');
for (const [key, lord, lpt, len, plus, cantrips, s3, s5] of TIEFLING_LINES) {
  const fx = { cantrips, spells: { 3: [s3], 5: [s5] } };
  add(`tiefling-${key}`, 'tiefling', 'MTF', `Tiefling (${lord})`, `Tiefling (${lord})`, {
    asi: { cha: 2, ...plus }, languages: ['Common', 'Infernal'],
    traits: [DV, HELLISH, innate(lpt, len, fx, 'cha', SECOND)],
    fx: { darkvision: 60, resist: ['fire'], ...fx, fixedSpellAbility: 'cha' },
  });
}

// Tiefling feral (SCAG): Des +2 / Int +1 e, opcionalmente, um legado variante.
const FERAL_LEGACY = [
  { id: 'infernal', name: b('Legado Infernal', 'Infernal Legacy'), cantrips: ['thaumaturgy'], spells: { 3: ['hellishRebuke'], 5: ['darkness'] } },
  { id: 'devilsTongue', name: b('Língua do Diabo', "Devil's Tongue"), cantrips: ['viciousMockery'], spells: { 3: ['charmPerson'], 5: ['enthrall'] } },
  { id: 'hellfire', name: b('Fogo do Inferno', 'Hellfire'), cantrips: ['thaumaturgy'], spells: { 3: ['burningHands'], 5: ['darkness'] } },
  { id: 'winged', name: b('Alado', 'Winged'), desc: b('Asas de morcego: deslocamento de voo de 30 pés sem armadura pesada (anote na ficha). Sem magias do legado.', 'Bat-like wings: 30-foot fly speed while not in heavy armor (note it on the sheet). No legacy spells.') },
];
for (const o of FERAL_LEGACY) if (!o.desc) o.desc = innateDesc(o, 'cha', SECOND);
add('tiefling-feral', 'tiefling', 'SCAG', 'Tiefling Feral', 'Feral Tiefling', {
  asi: { dex: 2, int: 1 }, languages: ['Common', 'Infernal'],
  traits: [DV, HELLISH, T('Legado (variante)', 'Legacy (variant)', 'Escolha o Legado Infernal ou uma variante do SCAG: Língua do Diabo, Fogo do Inferno (troca Repreensão Infernal por Mãos Flamejantes) ou Alado (voo 30 pés no lugar das magias). Carisma.', 'Choose Infernal Legacy or an SCAG variant: Devil\'s Tongue, Hellfire (Burning Hands instead of Hellish Rebuke) or Winged (30-foot flight instead of the spells). Charisma.')],
  fx: { darkvision: 60, resist: ['fire'], fixedSpellAbility: 'cha', choices: [{ key: 'lineage', label: b('Legado', 'Legacy'), options: FERAL_LEGACY }] },
});

// ---------------------------------------------------------------------------
// Aasimar do Volo's Guide to Monsters
// ---------------------------------------------------------------------------
const AASIMAR_BASE = [
  DV,
  T('Resistência Celestial', 'Celestial Resistance', 'Resistência a dano necrótico e radiante.', 'Resistance to necrotic and radiant damage.'),
  T('Mãos Curativas', 'Healing Hands', 'Ação: toque uma criatura e cure PV iguais ao seu nível. 1× por descanso longo.', 'Action: touch a creature and restore HP equal to your level. Once per long rest.'),
  T('Portador da Luz', 'Light Bearer', 'Você conhece o truque Luz (Carisma).', 'You know the Light cantrip (Charisma).'),
];
const AASIMAR = [
  ['protector', 'Protetor', 'Protector', { wis: 1 }, 'Alma Radiante', 'Radiant Soul',
    'Ação: por 1 minuto, ganhe asas espectrais (voo 30 pés) e, uma vez por turno, cause dano radiante extra igual ao seu nível num ataque ou magia.',
    'Action: for 1 minute, gain spectral wings (30-foot fly speed) and, once per turn, deal extra radiant damage equal to your level with an attack or spell.'],
  ['scourge', 'Flagelo', 'Scourge', { con: 1 }, 'Consumo Radiante', 'Radiant Consumption',
    'Ação: por 1 minuto, emita luz intensa; no fim de cada turno você e as criaturas a até 3 m sofrem dano radiante igual a metade do seu nível, e uma vez por turno você causa dano radiante extra igual ao seu nível.',
    'Action: for 1 minute, shed searing light; at the end of each of your turns you and creatures within 10 feet take radiant damage equal to half your level, and once per turn you deal extra radiant damage equal to your level.'],
  ['fallen', 'Caído', 'Fallen', { str: 1 }, 'Mortalha Necrótica', 'Necrotic Shroud',
    'Ação: por 1 minuto, asas sombrias surgem; criaturas a até 3 m fazem salvaguarda de Carisma (CD 8 + prof. + CAR) ou ficam amedrontadas até o fim do seu próximo turno. Uma vez por turno, cause dano necrótico extra igual ao seu nível.',
    'Action: for 1 minute, shadowy wings appear; creatures within 10 feet make a Charisma save (DC 8 + prof. + CHA) or are frightened until the end of your next turn. Once per turn, deal extra necrotic damage equal to your level.'],
];
for (const [key, pt, en, plus, tpt, ten, dpt, den] of AASIMAR) {
  add(`aasimar-${key}`, 'aasimar', 'VGM', `Aasimar ${pt}`, `${en} Aasimar`, {
    asi: { cha: 2, ...plus }, languages: ['Common', 'Celestial'],
    traits: [...AASIMAR_BASE, T(tpt, ten, `${dpt} 1× por descanso longo.`, `${den} Once per long rest.`, { level: 3 })],
    fx: { darkvision: 60, resist: ['necrotic', 'radiant'], cantrips: ['light'], fixedSpellAbility: 'cha' },
    resources: [res('healingHands', 'Mãos Curativas', 'Healing Hands', ONE, 'long'), res('celestialTransformation', tpt, ten, ONE, 'long', 3)],
  });
}

// ---------------------------------------------------------------------------
// Shifter do Eberron: Rising from the Last War (subtipos)
// ---------------------------------------------------------------------------
const SHIFTING = T('Transmutação', 'Shifting', 'Ação bônus: assuma a aparência bestial por 1 minuto e ganhe PV temporários iguais ao seu nível + mod. de CON (mín. 1). 1× por descanso curto ou longo.', 'Bonus action: take on a bestial look for 1 minute and gain temporary HP equal to your level + CON modifier (min. 1). Once per short or long rest.');
const SHIFTERS = [
  ['beasthide', 'Couro-de-Fera', 'Beasthide', { con: 2, str: 1 }, 'athletics', 'Atleta Natural', 'Natural Athlete', 'Atletismo', 'Athletics',
    'Ao se transformar, ganhe +1d6 PV temporários e +1 na CA enquanto durar.', 'When you shift, gain an extra 1d6 temporary HP and +1 AC while it lasts.'],
  ['longtooth', 'Presa-Longa', 'Longtooth', { str: 2, dex: 1 }, 'intimidation', 'Feroz', 'Fierce', 'Intimidação', 'Intimidation',
    'Transformado, use a ação bônus para morder com as presas (1d6 + FOR perfurante; você é proficiente).', 'While shifted, use your bonus action to bite with your fangs (1d6 + STR piercing; you are proficient).'],
  ['swiftstride', 'Passo-Veloz', 'Swiftstride', { dex: 2, cha: 1 }, 'acrobatics', 'Gracioso', 'Graceful', 'Acrobacia', 'Acrobatics',
    'Transformado, +10 pés de deslocamento; e, quando um inimigo terminar o turno a até 5 pés, use a reação para se afastar 10 pés sem provocar ataques.', 'While shifted, +10 feet of speed; and when an enemy ends its turn within 5 feet, use your reaction to move 10 feet without provoking attacks.'],
  ['wildhunt', 'Caçada-Selvagem', 'Wildhunt', { wis: 2, dex: 1 }, 'survival', 'Rastreador Natural', 'Natural Tracker', 'Sobrevivência', 'Survival',
    'Transformado, vantagem em testes de Sabedoria, e ninguém a até 30 pés tem vantagem em ataques contra você (salvo se você estiver incapacitado).', 'While shifted, advantage on Wisdom checks, and no creature within 30 feet gets advantage on attacks against you (unless you are incapacitated).'],
];
for (const [key, pt, en, asi, skill, spt, sen, skpt, sken, dpt, den] of SHIFTERS) {
  add(`shifter-${key}`, 'shifter', 'ERLW', `Transmorfo ${pt}`, `${en} Shifter`, {
    asi, languages: ['Common'],
    traits: [DV, SHIFTING, T(spt, sen, `Proficiência em ${skpt}.`, `Proficiency in ${sken}.`), T('Traço da Transmutação', 'Shifting Feature', dpt, den)],
    fx: { darkvision: 60, skills: [skill] },
    resources: [res('shifting', 'Transmutação', 'Shifting', ONE, 'short')],
  });
}

// ---------------------------------------------------------------------------
// Marcas de Dragão do Eberron: Rising from the Last War
// ---------------------------------------------------------------------------
const plusOne = (except) => ({ key: 'asi', label: b('+1 em outro atributo', '+1 to another ability'), pattern: [1], from: ABILITIES.filter(a => a !== except) });
const BASE = {
  human: { size: 'Medium', speed: 30, languages: ['Common', '+1 of choice'], traits: [], fx: {} },
  'half-elf': { size: 'Medium', speed: 30, languages: ['Common', 'Elvish', '+1 of choice'], traits: [DV, FEY], fx: { darkvision: 60 } },
  'half-orc': { size: 'Medium', speed: 30, languages: ['Common', 'Goblin'], traits: [], fx: {} },
  halfling: { size: 'Small', speed: 25, languages: ['Common', 'Halfling'], traits: [LUCKY, BRAVE, NIMBLE], fx: {} },
  gnome: { size: 'Small', speed: 25, languages: ['Common', 'Gnomish'], traits: [DV, GNOME_CUNNING], fx: { darkvision: 60 } },
  elf: { size: 'Medium', speed: 30, languages: ['Common', 'Elvish'], traits: [DV, KEEN, FEY, TRANCE], fx: { darkvision: 60, skills: ['perception'] } },
  dwarf: { size: 'Medium', speed: 25, languages: ['Common', 'Dwarvish'], fx: { darkvision: 60, resist: ['poison'] },
    profs: { weapons: ['battleaxe', 'handaxe', 'lightHammer', 'warhammer'], tools: { fixed: [], choose: 1, from: ['smithsTools', 'brewersSupplies', 'masonsTools'] } }, traits: [
    DV,
    T('Resiliência Anã', 'Dwarven Resilience', 'Vantagem contra veneno; resistência a dano de veneno.', 'Advantage against poison; resistance to poison damage.'),
    T('Treinamento Anão', 'Dwarven Training', 'Proficiência com machado de batalha, machadinha, martelo leve e martelo de guerra, e com uma ferramenta de artesão (ferreiro, cervejeiro ou pedreiro).', "Proficiency with battleaxe, handaxe, light hammer and warhammer, and with one artisan's tool (smith's, brewer's or mason's)."),
    T('Especialização em Rochas', 'Stonecunning', 'Dobro da proficiência em testes de História sobre trabalhos em pedra.', 'Double proficiency on History checks about stonework.'),
  ] },
};
const MARK_BASE_PT = { human: 'Humano', 'half-elf': 'Meio-Elfo', 'half-orc': 'Meio-Orc', halfling: 'Halfling', gnome: 'Gnomo', elf: 'Elfo', dwarf: 'Anão' };
const MARK_BASE_EN = { human: 'Human', 'half-elf': 'Half-Elf', 'half-orc': 'Half-Orc', halfling: 'Halfling', gnome: 'Gnome', elf: 'Elf', dwarf: 'Dwarf' };
// [marca, base, nome PT, nome EN, asi fixo, +1 livre exceto, atributo das magias, fx de magia, intuição, traços extras, extras]
const MARKS = [
  ['detection', 'half-elf', 'Detecção', 'Detection', { wis: 2 }, 'wis', 'int', { spells: { 1: ['detectMagic', 'detectPoisonAndDisease'], 3: ['seeInvisibility'] } },
    ['Intuição Dedutiva', 'Deductive Intuition', b('Investigação e Intuição', 'Investigation and Insight')], 'Detecção Mágica', 'Magical Detection'],
  ['finding', 'human', 'Descoberta', 'Finding', { wis: 2, con: 1 }, null, 'wis', { spells: { 1: ['huntersMark'], 3: ['locateObject'] } },
    ['Intuição do Caçador', "Hunter's Intuition", b('Percepção e Sobrevivência', 'Perception and Survival')], 'Magia do Rastreador', "Finder's Magic", { darkvision: true, languages: ['Common', 'Goblin'] }],
  ['finding', 'half-orc', 'Descoberta', 'Finding', { wis: 2, con: 1 }, null, 'wis', { spells: { 1: ['huntersMark'], 3: ['locateObject'] } },
    ['Intuição do Caçador', "Hunter's Intuition", b('Percepção e Sobrevivência', 'Perception and Survival')], 'Magia do Rastreador', "Finder's Magic", { darkvision: true }],
  ['handling', 'human', 'Adestramento', 'Handling', { wis: 2 }, 'wis', 'wis', { spells: { 1: ['animalFriendship', 'speakWithAnimals'] } },
    ['Intuição Selvagem', 'Wild Intuition', b('Adestrar Animais e Natureza', 'Animal Handling and Nature')], 'Conexão Primal', 'Primal Connection',
    { extra: [T('Quanto Maior…', 'The Bigger They Are', 'A partir do nível 3, suas magias da Conexão Primal também afetam monstruosidades com Inteligência 3 ou menos.', 'From level 3, your Primal Connection spells can also target monstrosities with Intelligence 3 or lower.', { level: 3 })] }],
  ['healing', 'halfling', 'Cura', 'Healing', { dex: 2, wis: 1 }, null, 'wis', { spells: { 1: ['cureWounds'] } },
    ['Intuição Médica', 'Medical Intuition', b('Medicina (e com kit de herbalismo)', "Medicine (and herbalism kit)")], 'Toque Curativo', 'Healing Touch'],
  ['hospitality', 'halfling', 'Hospitalidade', 'Hospitality', { dex: 2, cha: 1 }, null, 'cha', { cantrips: ['prestidigitation'], spells: { 1: ['purifyFoodAndDrink', 'unseenServant'] } },
    ['Sempre Hospitaleiro', 'Ever Hospitable', b('Persuasão (e com utensílios de cervejeiro ou cozinheiro)', "Persuasion (and brewer's or cook's utensils)")], 'Magia do Estalajadeiro', "Innkeeper's Magic"],
  ['making', 'human', 'Criação', 'Making', { int: 2 }, 'int', 'int', { cantrips: ['mending'], spells: { 1: ['magicWeapon'] } },
    ['Intuição do Artesão', "Artisan's Intuition", b('Arcanismo (e com ferramentas de artesão)', "Arcana (and artisan's tools)")], 'Forjador de Magias', 'Spellsmith',
    { extra: [T('Dom do Criador', "Maker's Gift", 'Proficiência com uma ferramenta de artesão à escolha (anote na ficha).', "Proficiency with one artisan's tool of your choice (note it on the sheet).")] }],
  ['passage', 'human', 'Passagem', 'Passage', { dex: 2 }, 'dex', 'dex', { spells: { 1: ['mistyStep'] } },
    ['Movimento Intuitivo', 'Intuitive Motion', b('Acrobacia (e com veículos terrestres)', 'Acrobatics (and land vehicles)')], 'Passagem Mágica', 'Magical Passage',
    { speed: 35, extra: [T('Velocidade do Mensageiro', "Courier's Speed", 'Deslocamento base de 35 pés.', 'Base speed 35 feet.')] }],
  ['scribing', 'gnome', 'Escrita', 'Scribing', { int: 2, cha: 1 }, null, 'int', { cantrips: ['message'], spells: { 1: ['comprehendLanguages'], 3: ['magicMouth'] } },
    ['Escriba Talentoso', 'Gifted Scribe', b('História (e com suprimentos de caligrafia)', "History (and calligrapher's supplies)")], 'Percepção do Escriba', "Scribe's Insight"],
  ['sentinel', 'human', 'Sentinela', 'Sentinel', { con: 2, wis: 1 }, null, 'wis', { spells: { 1: ['shield'] } },
    ['Intuição da Sentinela', "Sentinel's Intuition", b('Intuição e Percepção', 'Insight and Perception')], 'Escudo do Guardião', "Guardian's Shield",
    { extra: [T('Guardião Vigilante', 'Vigilant Guardian', 'Reação: quando uma criatura a até 5 pés que você veja for atingida por um ataque, troque de lugar com ela e sofra o ataque no lugar dela. 1× por descanso longo.', 'Reaction: when a creature you can see within 5 feet is hit by an attack, swap places with it and take the attack instead. Once per long rest.')],
      resources: [res('vigilantGuardian', 'Guardião Vigilante', 'Vigilant Guardian', ONE, 'long')] }],
  ['shadow', 'elf', 'Sombra', 'Shadow', { dex: 2, cha: 1 }, null, 'cha', { cantrips: ['minorIllusion'], spells: { 3: ['invisibility'] } },
    ['Intuição Astuta', 'Cunning Intuition', b('Atuação e Furtividade', 'Performance and Stealth')], 'Moldar Sombras', 'Shape Shadows'],
  ['storm', 'half-elf', 'Tempestade', 'Storm', { cha: 2, dex: 1 }, null, 'cha', { cantrips: ['gust'], spells: { 3: ['gustOfWind'] } },
    ['Intuição do Ventomestre', "Windwright's Intuition", b('Acrobacia (e com ferramentas de navegador)', "Acrobatics (and navigator's tools)")], 'Vento Contrário', 'Headwinds',
    { resist: ['lightning'], extra: [T('Dádiva da Tempestade', "Storm's Boon", 'Resistência a dano elétrico.', 'Resistance to lightning damage.')] }],
  ['warding', 'dwarf', 'Proteção', 'Warding', { con: 2, int: 1 }, null, 'int', { spells: { 1: ['alarm', 'mageArmor'], 3: ['arcaneLock'] } },
    ['Intuição do Guardião', "Warder's Intuition", b('Investigação (e com ferramentas de ladrão)', "Investigation (and thieves' tools)")], 'Proteções e Selos', 'Wards and Seals'],
];
for (const [mark, base, pt, en, asi, free, ability, spellFx, [ipt, ien, iwhat], mpt, men, extra = {}] of MARKS) {
  const B = BASE[base];
  const fx = { ...B.fx, ...spellFx, fixedSpellAbility: ability };
  if (extra.darkvision) fx.darkvision = 60;
  if (extra.resist) fx.resist = [...(fx.resist || []), ...extra.resist];
  if (free) fx.choices = [plusOne(free)];
  add(`${base}-mark-${mark}`, base, 'ERLW', `${MARK_BASE_PT[base]} (Marca de ${pt})`, `${MARK_BASE_EN[base]} (Mark of ${en})`, {
    size: B.size, speed: extra.speed || B.speed,
    asi, languages: extra.languages || B.languages,
    traits: [
      ...B.traits, ...(extra.darkvision && !B.fx.darkvision ? [DV] : []),
      intuition(ipt, ien, iwhat), innate(mpt, men, spellFx, ability), ...(extra.extra || []), MARK_SPELLS,
      ...(free ? [T('Aumento de Atributo', 'Ability Score Increase', `+2 em ${AB[free].pt} e +1 em outro atributo à escolha (escolha no passo de espécie).`, `+2 ${AB[free].en} and +1 to another ability of your choice (pick it in the species step).`)] : []),
    ],
    fx, resources: extra.resources, profs: B.profs,
  });
}

// ---------------------------------------------------------------------------
// SCAG e Explorer's Guide to Wildemount
// ---------------------------------------------------------------------------
add('halfling-ghostwise', 'halfling', 'SCAG', 'Halfling Pés-Fantasmas', 'Ghostwise Halfling', {
  size: 'Small', speed: 25, asi: { dex: 2, wis: 1 }, languages: ['Common', 'Halfling'],
  traits: [LUCKY, BRAVE, NIMBLE, T('Fala Silenciosa', 'Silent Speech', 'Comunicação telepática com uma criatura a até 30 pés que fale um idioma que você conhece.', 'Telepathic communication with one creature within 30 feet that speaks a language you know.')],
});
const LOTUS = { cantrips: ['druidcraft'], spells: { 3: ['entangle'], 5: ['spikeGrowth'] } };
add('halfling-lotusden', 'halfling', 'EGW', 'Halfling de Lotusden', 'Lotusden Halfling', {
  size: 'Small', speed: 25, asi: { dex: 2, wis: 1 }, languages: ['Common', 'Halfling'],
  traits: [LUCKY, BRAVE, NIMBLE, innate('Filho da Floresta', 'Child of the Wood', LOTUS, 'wis'),
    T('Caminhar entre Árvores', 'Timberwalk', 'Testes para rastrear você têm desvantagem; vegetação não mágica não conta como terreno difícil para você.', 'Checks to track you have disadvantage; nonmagical plant growth is not difficult terrain for you.')],
  fx: { ...LOTUS, fixedSpellAbility: 'wis' },
});
const PALLID = { cantrips: ['light'], spells: { 3: ['sleep'], 5: ['invisibility'] } };
add('elf-pallid', 'elf', 'EGW', 'Elfo Pálido', 'Pallid Elf', {
  asi: { dex: 2, wis: 1 }, languages: ['Common', 'Elvish'],
  traits: [DV, KEEN, FEY, TRANCE, T('Sentido Incisivo', 'Incisive Sense', 'Vantagem em testes de Investigação e Intuição.', 'Advantage on Investigation and Insight checks.'),
    innate('Bênção da Tecelã Lunar', 'Blessing of the Moon Weaver', PALLID, 'wis', b('A Invisibilidade só pode ter você como alvo.', 'Invisibility can target only you.'))],
  fx: { darkvision: 60, skills: ['perception'], ...PALLID, fixedSpellAbility: 'wis' },
});

// Draconatos de Wildemount: ancestral e sopro ficam; a resistência a dano é trocada pelo traço da variante.
const ANCESTRY_NO_RESIST = (dragons) => ({ key: 'ancestry', label: b('Ancestral dracônico', 'Draconic ancestor'), options: dragons });
const BREATH = T('Arma de Sopro', 'Breath Weapon', 'Ação: sopro do tipo do seu ancestral (2d6, CD 8 + CON + prof.; sobe com o nível). 1× por descanso curto ou longo.', "Action: breath of your ancestor's type (2d6, DC 8 + CON + prof.; scales with level). Once per short or long rest.");
const ANCESTRY_T = T('Ancestral Dracônico', 'Draconic Ancestry', 'Escolha um tipo de dragão: ele define o dano e a forma do sopro. Esta variante não tem a resistência a dano.', 'Choose a dragon type: it sets your breath\'s damage and shape. This variant has no damage resistance.');
const DRAGONBORN_VARIANTS = [
  ['draconblood', 'Draconato Sangue-de-Dragão', 'Draconblood Dragonborn', { int: 2, cha: 1 }, 'forcefulPresence', 'Presença Imponente', 'Forceful Presence',
    'Ao fazer um teste de Intimidação ou Persuasão, ganhe vantagem. 1× por descanso curto ou longo.', 'When you make an Intimidation or Persuasion check, gain advantage. Once per short or long rest.'],
  ['ravenite', 'Draconato Ravenita', 'Ravenite Dragonborn', { str: 2, con: 1 }, 'vengefulAssault', 'Ataque Vingativo', 'Vengeful Assault',
    'Reação: ao sofrer dano de uma criatura ao alcance da sua arma, faça um ataque com essa arma contra ela. 1× por descanso curto ou longo.', 'Reaction: when a creature within reach of your weapon damages you, make an attack against it with that weapon. Once per short or long rest.'],
];

// ---------------------------------------------------------------------------
// Meio-elfo com descendência (SCAG): troca Versatilidade em Perícias
// ---------------------------------------------------------------------------
const WEAPONS = { id: 'weapons', name: b('Treinamento com Armas Élficas', 'Elf Weapon Training'), desc: b('Proficiência com espada longa, espada curta, arco curto e arco longo.', 'Proficiency with longsword, shortsword, shortbow and longbow.') };
const HALF_ELF_VARIANT = {
  darkvision: 60,
  choices: [
    { key: 'descent', label: b('Descendência élfica', 'Elven descent'), options: [
      { id: 'high', name: b('Elfo da lua ou do sol (alto elfo)', 'Moon or sun elf (high elf)'), desc: b('Treinamento com armas élficas ou um truque de mago.', 'Elf weapon training or a wizard cantrip.') },
      { id: 'wood', name: b('Elfo da floresta', 'Wood elf'), desc: b('Armas élficas, Pés Velozes ou Máscara da Natureza.', 'Elf weapons, Fleet of Foot or Mask of the Wild.') },
      { id: 'drow', name: b('Drow', 'Drow'), cantrips: ['dancingLights'], spells: { 3: ['faerieFire'], 5: ['darkness'] }, fixedSpellAbility: 'cha',
        desc: b('Magia Drow (Carisma), 1× por descanso longo cada.', 'Drow Magic (Charisma), once per long rest each.') },
      { id: 'aquatic', name: b('Elfo aquático', 'Aquatic elf'), desc: b('Deslocamento de natação de 30 pés (anote na ficha).', '30-foot swim speed (note it on the sheet).') },
    ] },
    { key: 'trait', label: b('Traço da descendência', 'Descent trait'), when: { descent: 'high' }, options: [
      WEAPONS,
      { id: 'cantrip', name: b('Truque', 'Cantrip'), fixedSpellAbility: 'int', desc: b('Um truque de mago (Inteligência).', 'One wizard cantrip (Intelligence).') },
    ] },
    { key: 'trait', label: b('Traço da descendência', 'Descent trait'), when: { descent: 'wood' }, options: [
      WEAPONS,
      { id: 'fleet', name: b('Pés Velozes', 'Fleet of Foot'), speed: 35, desc: b('Deslocamento base de 35 pés.', 'Base speed 35 feet.') },
      { id: 'mask', name: b('Máscara da Natureza', 'Mask of the Wild'), desc: b('Pode se esconder levemente obscurecido por fenômenos naturais.', 'You can hide when lightly obscured by natural phenomena.') },
    ] },
    { key: 'cantrip', label: b('Truque de Mago', 'Wizard cantrip'), list: 'wizard', when: { descent: 'high', trait: 'cantrip' } },
  ],
};
add('half-elf-variant', 'half-elf', 'SCAG', 'Meio-Elfo (descendência)', 'Half-Elf (descent)', {
  asi: { cha: 2, other: 2 }, languages: ['Common', 'Elvish', '+1 of choice'],
  traits: [DV, FEY, T('Descendência Élfica', 'Elven Descent', 'No lugar de Versatilidade em Perícias, escolha um traço da sua ascendência élfica: armas élficas ou truque (alto elfo); armas élficas, Pés Velozes ou Máscara da Natureza (elfo da floresta); Magia Drow; ou natação 30 pés (elfo aquático).', 'Instead of Skill Versatility, pick a trait from your elven heritage: elf weapons or a cantrip (high elf); elf weapons, Fleet of Foot or Mask of the Wild (wood elf); Drow Magic; or 30-foot swimming (aquatic elf).')],
  fx: HALF_ELF_VARIANT,
});

// Draconatos de Wildemount: opções de ancestral sem a resistência.
const DRAGONS = [
  ['black', 'Preto', 'Black', 'acid', 'linha 5 × 30 pés (Des)', '5 by 30 ft. line (Dex)'], ['blue', 'Azul', 'Blue', 'lightning', 'linha 5 × 30 pés (Des)', '5 by 30 ft. line (Dex)'],
  ['brass', 'Latão', 'Brass', 'fire', 'linha 5 × 30 pés (Des)', '5 by 30 ft. line (Dex)'], ['bronze', 'Bronze', 'Bronze', 'lightning', 'linha 5 × 30 pés (Des)', '5 by 30 ft. line (Dex)'],
  ['copper', 'Cobre', 'Copper', 'acid', 'linha 5 × 30 pés (Des)', '5 by 30 ft. line (Dex)'], ['gold', 'Ouro', 'Gold', 'fire', 'cone de 15 pés (Des)', '15 ft. cone (Dex)'],
  ['green', 'Verde', 'Green', 'poison', 'cone de 15 pés (Con)', '15 ft. cone (Con)'], ['red', 'Vermelho', 'Red', 'fire', 'cone de 15 pés (Des)', '15 ft. cone (Dex)'],
  ['silver', 'Prata', 'Silver', 'cold', 'cone de 15 pés (Con)', '15 ft. cone (Con)'], ['white', 'Branco', 'White', 'cold', 'cone de 15 pés (Con)', '15 ft. cone (Con)'],
];
const DMG = { acid: b('ácido', 'acid'), lightning: b('elétrico', 'lightning'), fire: b('fogo', 'fire'), poison: b('veneno', 'poison'), cold: b('frio', 'cold') };
const ANCESTRY_OPTIONS = DRAGONS.map(([id, pt, en, dmg, spt, sen]) => ({ id, name: b(pt, en), damage: dmg, desc: b(`Dano de ${DMG[dmg].pt}; ${spt}.`, `${DMG[dmg].en[0].toUpperCase()}${DMG[dmg].en.slice(1)} damage; ${sen}.`) }));
for (const [key, pt, en, asi, rid, tpt, ten, dpt, den] of DRAGONBORN_VARIANTS) {
  add(`dragonborn-${key}`, 'dragonborn', 'EGW', pt, en, {
    asi, languages: ['Common', 'Draconic'],
    traits: [ANCESTRY_T, BREATH, DV, T(tpt, ten, dpt, den)],
    fx: { darkvision: 60, choices: [ANCESTRY_NO_RESIST(ANCESTRY_OPTIONS)] },
    resources: [res('breathWeapon', 'Arma de Sopro', 'Breath Weapon', ONE, 'short'), res(rid, tpt, ten, ONE, 'short')],
  });
}

export const SUBRACES_2014 = RACES;
export const SUBRACE_EFFECTS_2014 = EFFECTS;
export const SUBRACE_RESOURCES_2014 = RESOURCES;

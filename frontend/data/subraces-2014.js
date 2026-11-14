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
  druidcraft: b('Arte Druídica', 'Druidcraft'), detectMagic: b('Detectar Magia', 'Detect Magic'),
  detectPoisonAndDisease: b('Detectar Veneno e Doenças', 'Detect Poison and Disease'), seeInvisibility: b('Ver Invisibilidade', 'See Invisibility'),
  huntersMark: b('Marca do Caçador', "Hunter's Mark"), locateObject: b('Localizar Objeto', 'Locate Object'),
  animalFriendship: b('Amizade com Animais', 'Animal Friendship'), speakWithAnimals: b('Falar com Animais', 'Speak with Animals'),
  cureWounds: b('Curar Ferimentos', 'Cure Wounds'), lesserRestoration: b('Restauração Menor', 'Lesser Restoration'), prestidigitation: b('Prestidigitação', 'Prestidigitation'),
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
const DV = T('Visão no Escuro', 'Darkvision', '18 m.', '60 ft.');
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
  { id: 'winged', name: b('Alado', 'Winged'), desc: b('Asas de morcego: deslocamento de voo de 9 m sem armadura pesada (anote na ficha). Sem magias do legado.', 'Bat-like wings: 30-foot fly speed while not in heavy armor (note it on the sheet). No legacy spells.') },
];
for (const o of FERAL_LEGACY) if (!o.desc) o.desc = innateDesc(o, 'cha', SECOND);
add('tiefling-feral', 'tiefling', 'SCAG', 'Tiefling Feral', 'Feral Tiefling', {
  asi: { dex: 2, int: 1 }, languages: ['Common', 'Infernal'],
  traits: [DV, HELLISH, T('Legado (variante)', 'Legacy (variant)', 'Escolha o Legado Infernal ou uma variante do SCAG: Língua do Diabo, Fogo do Inferno (troca Repreensão Infernal por Mãos Flamejantes) ou Alado (voo 9 m no lugar das magias). Carisma.', 'Choose Infernal Legacy or an SCAG variant: Devil\'s Tongue, Hellfire (Burning Hands instead of Hellish Rebuke) or Winged (30-foot flight instead of the spells). Charisma.')],
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
    'Ação: por 1 minuto, ganhe asas espectrais (voo 9 m) e, uma vez por turno, cause dano radiante extra igual ao seu nível num ataque ou magia.',
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
    'Transformado, +3 m de deslocamento; e, quando um inimigo terminar o turno a até 1,5 m, use a reação para se afastar 3 m sem provocar ataques.', 'While shifted, +10 feet of speed; and when an enemy ends its turn within 5 feet, use your reaction to move 10 feet without provoking attacks.'],
  ['wildhunt', 'Caçada-Selvagem', 'Wildhunt', { wis: 2, dex: 1 }, 'survival', 'Rastreador Natural', 'Natural Tracker', 'Sobrevivência', 'Survival',
    'Transformado, vantagem em testes de Sabedoria, e ninguém a até 9 m tem vantagem em ataques contra você (salvo se você estiver incapacitado).', 'While shifted, advantage on Wisdom checks, and no creature within 30 feet gets advantage on attacks against you (unless you are incapacitated).'],
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
  ['healing', 'halfling', 'Cura', 'Healing', { dex: 2, wis: 1 }, null, 'wis', { spells: { 1: ['cureWounds'], 3: ['lesserRestoration'] } },
    ['Intuição Médica', 'Medical Intuition', b('Medicina (e com kit de herbalismo)', "Medicine (and herbalism kit)")], 'Toque Curativo', 'Healing Touch'],
  ['hospitality', 'halfling', 'Hospitalidade', 'Hospitality', { dex: 2, cha: 1 }, null, 'cha', { cantrips: ['prestidigitation'], spells: { 1: ['purifyFoodAndDrink', 'unseenServant'] } },
    ['Sempre Hospitaleiro', 'Ever Hospitable', b('Persuasão (e com utensílios de cervejeiro ou cozinheiro)', "Persuasion (and brewer's or cook's utensils)")], 'Magia do Estalajadeiro', "Innkeeper's Magic"],
  ['making', 'human', 'Criação', 'Making', { int: 2 }, 'int', 'int', { cantrips: ['mending'], spells: { 1: ['magicWeapon'] } },
    ['Intuição do Artesão', "Artisan's Intuition", b('Arcanismo (e com ferramentas de artesão)', "Arcana (and artisan's tools)")], 'Forjador de Magias', 'Spellsmith',
    { extra: [T('Dom do Criador', "Maker's Gift", 'Proficiência com uma ferramenta de artesão à escolha (anote na ficha).', "Proficiency with one artisan's tool of your choice (note it on the sheet).")] }],
  ['passage', 'human', 'Passagem', 'Passage', { dex: 2 }, 'dex', 'dex', { spells: { 1: ['mistyStep'] } },
    ['Movimento Intuitivo', 'Intuitive Motion', b('Acrobacia (e com veículos terrestres)', 'Acrobatics (and land vehicles)')], 'Passagem Mágica', 'Magical Passage',
    { speed: 35, extra: [T('Velocidade do Mensageiro', "Courier's Speed", 'Deslocamento base de 10,5 m.', 'Base speed 35 feet.')] }],
  ['scribing', 'gnome', 'Escrita', 'Scribing', { int: 2, cha: 1 }, null, 'int', { cantrips: ['message'], spells: { 1: ['comprehendLanguages'], 3: ['magicMouth'] } },
    ['Escriba Talentoso', 'Gifted Scribe', b('História (e com suprimentos de caligrafia)', "History (and calligrapher's supplies)")], 'Percepção do Escriba', "Scribe's Insight"],
  ['sentinel', 'human', 'Sentinela', 'Sentinel', { con: 2, wis: 1 }, null, 'wis', { spells: { 1: ['shield'] } },
    ['Intuição da Sentinela', "Sentinel's Intuition", b('Intuição e Percepção', 'Insight and Perception')], 'Escudo do Guardião', "Guardian's Shield",
    { extra: [T('Guardião Vigilante', 'Vigilant Guardian', 'Reação: quando uma criatura a até 1,5 m que você veja for atingida por um ataque, troque de lugar com ela e sofra o ataque no lugar dela. 1× por descanso longo.', 'Reaction: when a creature you can see within 5 feet is hit by an attack, swap places with it and take the attack instead. Once per long rest.')],
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
  traits: [LUCKY, BRAVE, NIMBLE, T('Fala Silenciosa', 'Silent Speech', 'Comunicação telepática com uma criatura a até 9 m que fale um idioma que você conhece.', 'Telepathic communication with one creature within 30 feet that speaks a language you know.')],
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
      { id: 'aquatic', name: b('Elfo aquático', 'Aquatic elf'), desc: b('Deslocamento de natação de 9 m (anote na ficha).', '30-foot swim speed (note it on the sheet).') },
    ] },
    { key: 'trait', label: b('Traço da descendência', 'Descent trait'), when: { descent: 'high' }, options: [
      WEAPONS,
      { id: 'cantrip', name: b('Truque', 'Cantrip'), fixedSpellAbility: 'int', desc: b('Um truque de mago (Inteligência).', 'One wizard cantrip (Intelligence).') },
    ] },
    { key: 'trait', label: b('Traço da descendência', 'Descent trait'), when: { descent: 'wood' }, options: [
      WEAPONS,
      { id: 'fleet', name: b('Pés Velozes', 'Fleet of Foot'), speed: 35, desc: b('Deslocamento base de 10,5 m.', 'Base speed 35 feet.') },
      { id: 'mask', name: b('Máscara da Natureza', 'Mask of the Wild'), desc: b('Pode se esconder levemente obscurecido por fenômenos naturais.', 'You can hide when lightly obscured by natural phenomena.') },
    ] },
    { key: 'cantrip', label: b('Truque de Mago', 'Wizard cantrip'), list: 'wizard', when: { descent: 'high', trait: 'cantrip' } },
  ],
};
add('half-elf-variant', 'half-elf', 'SCAG', 'Meio-Elfo (descendência)', 'Half-Elf (descent)', {
  asi: { cha: 2, other: 2 }, languages: ['Common', 'Elvish', '+1 of choice'],
  traits: [DV, FEY, T('Descendência Élfica', 'Elven Descent', 'No lugar de Versatilidade em Perícias, escolha um traço da sua ascendência élfica: armas élficas ou truque (alto elfo); armas élficas, Pés Velozes ou Máscara da Natureza (elfo da floresta); Magia Drow; ou natação 9 m (elfo aquático).', 'Instead of Skill Versatility, pick a trait from your elven heritage: elf weapons or a cantrip (high elf); elf weapons, Fleet of Foot or Mask of the Wild (wood elf); Drow Magic; or 30-foot swimming (aquatic elf).')],
  fx: HALF_ELF_VARIANT,
});

// Draconatos de Wildemount: opções de ancestral sem a resistência.
const DRAGONS = [
  ['black', 'Preto', 'Black', 'acid', 'linha 1,5 × 9 m (Des)', '5 by 30 ft. line (Dex)'], ['blue', 'Azul', 'Blue', 'lightning', 'linha 1,5 × 9 m (Des)', '5 by 30 ft. line (Dex)'],
  ['brass', 'Latão', 'Brass', 'fire', 'linha 1,5 × 9 m (Des)', '5 by 30 ft. line (Dex)'], ['bronze', 'Bronze', 'Bronze', 'lightning', 'linha 1,5 × 9 m (Des)', '5 by 30 ft. line (Dex)'],
  ['copper', 'Cobre', 'Copper', 'acid', 'linha 1,5 × 9 m (Des)', '5 by 30 ft. line (Dex)'], ['gold', 'Ouro', 'Gold', 'fire', 'cone de 4,5 m (Des)', '15 ft. cone (Dex)'],
  ['green', 'Verde', 'Green', 'poison', 'cone de 4,5 m (Con)', '15 ft. cone (Con)'], ['red', 'Vermelho', 'Red', 'fire', 'cone de 4,5 m (Des)', '15 ft. cone (Dex)'],
  ['silver', 'Prata', 'Silver', 'cold', 'cone de 4,5 m (Con)', '15 ft. cone (Con)'], ['white', 'Branco', 'White', 'cold', 'cone de 4,5 m (Con)', '15 ft. cone (Con)'],
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

const SUBRACE_TRAITS_1TO1 = {
  "tiefling-baalzebul": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Resistência Infernal",
        "en": "Hellish Resistance"
      },
      "desc": {
        "pt": "Você tem resistência a dano de fogo.",
        "en": "You have resistance to fire damage."
      }
    },
    {
      "name": {
        "pt": "Legado de Maladomini",
        "en": "Legacy of Maladomini"
      },
      "desc": {
        "pt": "Você conhece o truque taumaturgia. Quando alcançar o 3º nível, você pode conjurar a magia raio de adoecimento como uma magia de 2º círculo uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Quando alcançar o 5º nível, você pode conjurar a magia coroa da loucura uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Carisma é o seu atributo de conjuração para essas magias.",
        "en": "You know the thaumaturgy cantrip. When you reach 3rd level, you can cast the ray of sickness spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the crown of madness spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells."
      }
    }
  ],
  "tiefling-dispater": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Resistência Infernal",
        "en": "Hellish Resistance"
      },
      "desc": {
        "pt": "Você tem resistência a dano de fogo.",
        "en": "You have resistance to fire damage."
      }
    },
    {
      "name": {
        "pt": "Legado de Dis",
        "en": "Legacy of Dis"
      },
      "desc": {
        "pt": "Você conhece o truque taumaturgia. Quando alcançar o 3º nível, você pode conjurar a magia disfarçar-se uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Quando alcançar o 5º nível, você pode conjurar a magia detectar pensamentos uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Carisma é o seu atributo de conjuração para essas magias.",
        "en": "You know the thaumaturgy cantrip. When you reach 3rd level, you can cast the disguise self spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the detect thoughts spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells."
      }
    }
  ],
  "tiefling-fierna": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Resistência Infernal",
        "en": "Hellish Resistance"
      },
      "desc": {
        "pt": "Você tem resistência a dano de fogo.",
        "en": "You have resistance to fire damage."
      }
    },
    {
      "name": {
        "pt": "Legado de Flegetos",
        "en": "Legacy of Phlegethos"
      },
      "desc": {
        "pt": "Você conhece o truque amizade. Quando alcançar o 3º nível, você pode conjurar a magia enfeitiçar pessoa como uma magia de 2º círculo uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Quando alcançar o 5º nível, você pode conjurar a magia sugestão uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Carisma é o seu atributo de conjuração para essas magias.",
        "en": "You know the friends cantrip. When you reach 3rd level, you can cast the charm person spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the suggestion spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells."
      }
    }
  ],
  "tiefling-glasya": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Resistência Infernal",
        "en": "Hellish Resistance"
      },
      "desc": {
        "pt": "Você tem resistência a dano de fogo.",
        "en": "You have resistance to fire damage."
      }
    },
    {
      "name": {
        "pt": "Legado de Malbolge",
        "en": "Legacy of Malbolge"
      },
      "desc": {
        "pt": "Você conhece o truque ilusão menor. Quando alcançar o 3º nível, você pode conjurar a magia disfarçar-se uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Quando alcançar o 5º nível, você pode conjurar a magia invisibilidade uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Carisma é o seu atributo de conjuração para essas magias.",
        "en": "You know the minor illusion cantrip. When you reach 3rd level, you can cast the disguise self spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the invisibility spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells."
      }
    }
  ],
  "tiefling-levistus": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Resistência Infernal",
        "en": "Hellish Resistance"
      },
      "desc": {
        "pt": "Você tem resistência a dano de fogo.",
        "en": "You have resistance to fire damage."
      }
    },
    {
      "name": {
        "pt": "Legado de Estígia",
        "en": "Legacy of Stygia"
      },
      "desc": {
        "pt": "Você conhece o truque raio de gelo. Quando alcançar o 3º nível, você pode conjurar a magia armadura de Agathys como uma magia de 2º círculo uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Quando alcançar o 5º nível, você pode conjurar a magia escuridão uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Carisma é o seu atributo de conjuração para essas magias.",
        "en": "You know the ray of frost cantrip. When you reach 3rd level, you can cast the armor of Agathys spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the darkness spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells."
      }
    }
  ],
  "tiefling-mammon": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Resistência Infernal",
        "en": "Hellish Resistance"
      },
      "desc": {
        "pt": "Você tem resistência a dano de fogo.",
        "en": "You have resistance to fire damage."
      }
    },
    {
      "name": {
        "pt": "Legado de Minauros",
        "en": "Legacy of Minauros"
      },
      "desc": {
        "pt": "Você conhece o truque mãos mágicas. Quando alcançar o 3º nível, você pode conjurar a magia disco flutuante de Tenser uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Curto ou Longo. Quando alcançar o 5º nível, você pode conjurar a magia tranca arcana uma vez com este traço, sem exigir componentes materiais, e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Carisma é o seu atributo de conjuração para essas magias.",
        "en": "You know the mage hand cantrip. When you reach 3rd level, you can cast the Tenser's floating disk spell once with this trait and regain the ability to do so when you finish a short or long rest. When you reach 5th level, you can cast the arcane lock spell once with this trait, requiring no material component, and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells."
      }
    }
  ],
  "tiefling-mephistopheles": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Resistência Infernal",
        "en": "Hellish Resistance"
      },
      "desc": {
        "pt": "Você tem resistência a dano de fogo.",
        "en": "You have resistance to fire damage."
      }
    },
    {
      "name": {
        "pt": "Legado de Cania",
        "en": "Legacy of Cania"
      },
      "desc": {
        "pt": "Você conhece o truque mãos mágicas. Quando alcançar o 3º nível, você pode conjurar a magia mãos flamejantes como uma magia de 2º círculo uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Quando alcançar o 5º nível, você pode conjurar a magia lâmina de chamas uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Carisma é o seu atributo de conjuração para essas magias.",
        "en": "You know the mage hand cantrip. When you reach 3rd level, you can cast the burning hands spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the flame blade spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells."
      }
    }
  ],
  "tiefling-zariel": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Resistência Infernal",
        "en": "Hellish Resistance"
      },
      "desc": {
        "pt": "Você tem resistência a dano de fogo.",
        "en": "You have resistance to fire damage."
      }
    },
    {
      "name": {
        "pt": "Legado de Avernus",
        "en": "Legacy of Avernus"
      },
      "desc": {
        "pt": "Você conhece o truque taumaturgia. Quando alcançar o 3º nível, você pode conjurar a magia destruição abrasadora como uma magia de 2º círculo uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Quando alcançar o 5º nível, você pode conjurar a magia destruição marcante uma vez com este traço e recupera a capacidade de fazê-lo quando terminar um Descanso Longo. Carisma é o seu atributo de conjuração para essas magias.",
        "en": "You know the thaumaturgy cantrip. When you reach 3rd level, you can cast the searing smite spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the branding smite spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells."
      }
    }
  ],
  "tiefling-feral": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Resistência Infernal",
        "en": "Hellish Resistance"
      },
      "desc": {
        "pt": "Você tem resistência a dano de fogo.",
        "en": "You have resistance to fire damage."
      }
    },
    {
      "name": {
        "pt": "Legado (variante)",
        "en": "Legacy (variant)"
      },
      "desc": {
        "pt": "Legado Infernal. Você conhece o truque taumaturgia. Quando alcança o 3º nível, você pode conjurar a magia repreensão infernal como uma magia de 2º círculo uma vez com esta característica e recupera a capacidade de fazê-lo ao terminar um Descanso Longo. Quando alcança o 5º nível, você pode conjurar a magia escuridão uma vez com esta característica e recupera a capacidade de fazê-lo ao terminar um Descanso Longo. Carisma é a sua habilidade de conjuração para essas magias.\n\nLíngua do Diabo (Variante). Você conhece o truque zombaria viciosa. Quando alcança o 3º nível, você pode conjurar a magia enfeitiçar pessoa como uma magia de 2º círculo uma vez com esta característica. Quando alcança o 5º nível, você pode conjurar a magia cativar uma vez com esta característica. Você deve terminar um Descanso Longo para conjurar essas magias novamente com esta característica. Carisma é a sua habilidade de conjuração para elas. Esta característica substitui Legado Infernal.\n\nFogo do Inferno (Variante). Quando alcança o 3º nível, você pode conjurar a magia mãos flamejantes uma vez por dia como uma magia de 2º círculo. Esta característica substitui a magia repreensão infernal da característica Legado Infernal.\n\nAlado (Variante). Você tem asas semelhantes às de um morcego brotando das suas omoplatas. Você tem um deslocamento de voo de 9 metros enquanto não estiver usando armadura pesada. Esta característica substitui Legado Infernal.",
        "en": "Infernal Legacy. You know the thaumaturgy cantrip. When you reach 3rd level, you can cast the hellish rebuke spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the darkness spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells.\n\nDevil’s Tongue (Variant). You know the vicious mockery cantrip. When you reach 3rd level, you can cast the charm person spell as a 2nd-level spell once with this trait. When you reach 5th level, you can cast the enthrall spell once with this trait. You must finish a long rest to cast these spells once again with this trait. Charisma is your spellcasting ability for them. This trait replaces Infernal Legacy.\n\nHellfire (Variant). Once you reach 3rd level, you can cast the burning hands spell once per day as a 2nd-level spell. This trait replaces the hellish rebuke spell of the Infernal Legacy trait.\n\nWinged (Variant). You have bat-like wings sprouting from your shoulder blades. You have a flying speed of 30 feet while you aren’t wearing heavy armor. This trait replaces Infernal Legacy."
      }
    }
  ],
  "aasimar-protector": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Resistência Celestial",
        "en": "Celestial Resistance"
      },
      "desc": {
        "pt": "Você tem resistência a dano necrótico e dano radiante.",
        "en": "You have resistance to necrotic damage and radiant damage."
      }
    },
    {
      "name": {
        "pt": "Mãos Curativas",
        "en": "Healing Hands"
      },
      "desc": {
        "pt": "Como uma Ação, você pode tocar uma criatura e fazer com que ela recupere uma quantidade de Pontos de Vida igual ao seu nível. Uma vez que use este traço, você não poderá usá-lo novamente até terminar um Descanso Longo.",
        "en": "As an action, you can touch a creature and cause it to regain a number of hit points equal to your level. Once you use this trait, you can't use it again until you finish a long rest."
      }
    },
    {
      "name": {
        "pt": "Portador da Luz",
        "en": "Light Bearer"
      },
      "desc": {
        "pt": "Você conhece o truque luz. Carisma é a sua habilidade de conjuração para ele.",
        "en": "You know the light cantrip. Charisma is your spellcasting ability for it."
      }
    },
    {
      "name": {
        "pt": "Alma Radiante",
        "en": "Radiant Soul"
      },
      "desc": {
        "pt": "A partir do 3º nível, você pode usar sua Ação para liberar a energia divina dentro de você, fazendo com que seus olhos brilhem e duas asas luminosas e incorpóreas brotem de suas costas.\n\nSua transformação dura 1 minuto ou até você encerrá-la como uma Ação Bônus. Durante ela, você tem um deslocamento de voo de 9 metros e, uma vez em cada um dos seus turnos, pode causar dano radiante extra a um alvo ao causar dano a ele com um ataque ou magia. O dano radiante extra é igual ao seu nível.\n\nDepois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.",
        "en": "Starting at 3rd level, you can use your action to unleash the divine energy within yourself, causing your eyes to glimmer and two luminous, incorporeal wings to sprout from your back.\n\nYour transformation lasts for 1 minute or until you end it as a bonus action. During it, you have a flying speed of 30 feet, and once on each of your turns, you can deal extra radiant damage to one target when you deal damage to it with an attack or a spell. The extra radiant damage equals your level.\n\nOnce you use this trait, you can't use it again until you finish a long rest."
      }
    }
  ],
  "aasimar-scourge": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Resistência Celestial",
        "en": "Celestial Resistance"
      },
      "desc": {
        "pt": "Você tem resistência a dano necrótico e dano radiante.",
        "en": "You have resistance to necrotic damage and radiant damage."
      }
    },
    {
      "name": {
        "pt": "Mãos Curativas",
        "en": "Healing Hands"
      },
      "desc": {
        "pt": "Como uma Ação, você pode tocar uma criatura e fazer com que ela recupere uma quantidade de Pontos de Vida igual ao seu nível. Uma vez que use este traço, você não poderá usá-lo novamente até terminar um Descanso Longo.",
        "en": "As an action, you can touch a creature and cause it to regain a number of hit points equal to your level. Once you use this trait, you can't use it again until you finish a long rest."
      }
    },
    {
      "name": {
        "pt": "Portador da Luz",
        "en": "Light Bearer"
      },
      "desc": {
        "pt": "Você conhece o truque luz. Carisma é a sua habilidade de conjuração para ele.",
        "en": "You know the light cantrip. Charisma is your spellcasting ability for it."
      }
    },
    {
      "name": {
        "pt": "Consumo Radiante",
        "en": "Radiant Consumption"
      },
      "desc": {
        "pt": "A partir do 3º nível, você pode usar sua Ação para liberar a energia divina dentro de você, fazendo com que uma luz abrasadora irradie de você, jorre de seus olhos e boca e ameace carbonizá-lo.\n\nSua transformação dura 1 minuto ou até você encerrá-la como uma Ação Bônus. Durante ela, você emite luz plena em um raio de 3 metros e meia-luz por mais 3 metros adicionais e, no final de cada um dos seus turnos, você e cada criatura a até 3 metros de você sofrem dano radiante igual à metade do seu nível (arredondado para cima). Além disso, uma vez em cada um dos seus turnos, você pode causar dano radiante extra a um alvo ao causar dano a ele com um ataque ou magia. O dano radiante extra é igual ao seu nível.\n\nDepois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.",
        "en": "Starting at 3rd level, you can use your action to unleash the divine energy within yourself, causing a searing light to radiate from you, pour out of your eyes and mouth, and threaten to char you.\n\nYour transformation lasts for 1 minute or until you end it as a bonus action. During it, you shed bright light in a 10-foot radius and dim light for an additional 10 feet, and at the end of each of your turns, you and each creature within 10 feet of you take radiant damage equal to half your level (rounded up). In addition, once on each of your turns, you can deal extra radiant damage to one target when you deal damage to it with an attack or a spell. The extra radiant damage equals your level.\n\nOnce you use this trait, you can't use it again until you finish a long rest."
      }
    }
  ],
  "aasimar-fallen": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Resistência Celestial",
        "en": "Celestial Resistance"
      },
      "desc": {
        "pt": "Você tem resistência a dano necrótico e dano radiante.",
        "en": "You have resistance to necrotic damage and radiant damage."
      }
    },
    {
      "name": {
        "pt": "Mãos Curativas",
        "en": "Healing Hands"
      },
      "desc": {
        "pt": "Como uma Ação, você pode tocar uma criatura e fazer com que ela recupere uma quantidade de Pontos de Vida igual ao seu nível. Uma vez que use este traço, você não poderá usá-lo novamente até terminar um Descanso Longo.",
        "en": "As an action, you can touch a creature and cause it to regain a number of hit points equal to your level. Once you use this trait, you can't use it again until you finish a long rest."
      }
    },
    {
      "name": {
        "pt": "Portador da Luz",
        "en": "Light Bearer"
      },
      "desc": {
        "pt": "Você conhece o truque luz. Carisma é a sua habilidade de conjuração para ele.",
        "en": "You know the light cantrip. Charisma is your spellcasting ability for it."
      }
    },
    {
      "name": {
        "pt": "Mortalha Necrótica",
        "en": "Necrotic Shroud"
      },
      "desc": {
        "pt": "A partir do 3º nível, você pode usar sua Ação para liberar a energia divina dentro de você, fazendo com que seus olhos se transformem em poças de escuridão e duas asas esqueléticas, fantasmagóricas e incapazes de voar brotem de suas costas. No instante em que você se transforma, outras criaturas a até 3 metros de você que possam vê-lo devem ser bem-sucedidas em uma salvaguarda de Carisma (CD 8 + seu Bônus de Proficiência + seu modificador de Carisma) ou ficarão amedrontadas por você até o final do seu próximo turno.\n\nSua transformação dura 1 minuto ou até você encerrá-la como uma Ação Bônus. Durante ela, uma vez em cada um dos seus turnos, você pode causar dano necrótico extra a um alvo ao causar dano a ele com um ataque ou magia. O dano necrótico extra é igual ao seu nível.\n\nDepois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.",
        "en": "Starting at 3rd level, you can use your action to unleash the divine energy within yourself, causing your eyes to turn into pools of darkness and two skeletal, ghostly, flightless wings to sprout from your back. The instant you transform, other creatures within 10 feet of you that can see you must each succeed on a Charisma saving throw (DC 8 + your proficiency bonus + your Charisma modifier) or become frightened of you until the end of your next turn.\n\nYour transformation lasts for 1 minute or until you end it as a bonus action. During it, once on each of your turns, you can deal extra necrotic damage to one target when you deal damage to it with an attack or a spell. The extra necrotic damage equals your level.\n\nOnce you use this trait, you can't use it again until you finish a long rest."
      }
    }
  ],
  "shifter-beasthide": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Transmutação",
        "en": "Shifting"
      },
      "desc": {
        "pt": "Como uma Ação Bônus, você pode assumir uma aparência mais bestial. Esta transformação dura 1 minuto, até você morrer ou até retornar à sua aparência normal como uma Ação Bônus. Quando muda de forma, você ganha Pontos de Vida Temporários iguais ao seu nível + seu modificador de Constituição (mínimo de 1 Ponto de Vida Temporário). Você também ganha benefícios adicionais que dependem da sua sub-raça de transmorfo, descritos abaixo.\n\nDepois de mudar de forma, você não pode fazê-lo novamente até terminar um Descanso Curto ou Longo.",
        "en": "As a bonus action, you can assume a more bestial appearance. This transformation lasts for 1 minute, until you die, or until you revert to your normal appearance as a bonus action. When you shift, you gain temporary hit points equal to your level + your Constitution modifier (minimum of 1 temporary hit point). You also gain additional benefits that depend on your shifter subrace, described below.\n\nOnce you shift, you can’t do so again until you finish a short or long rest."
      }
    },
    {
      "name": {
        "pt": "Atleta Natural",
        "en": "Natural Athlete"
      },
      "desc": {
        "pt": "Você tem proficiência na perícia Atletismo.",
        "en": "You have proficiency in the Athletics skill."
      }
    },
    {
      "name": {
        "pt": "Traço da Transmutação",
        "en": "Shifting Feature"
      },
      "desc": {
        "pt": "Sempre que muda de forma, você ganha 1d6 Pontos de Vida Temporários adicionais. Enquanto estiver transformado, você tem um bônus de +1 na sua Classe de Armadura.",
        "en": "Whenever you shift, you gain 1d6 additional temporary hit points. While shifted, you have a +1 bonus to your Armor Class."
      }
    }
  ],
  "shifter-longtooth": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Transmutação",
        "en": "Shifting"
      },
      "desc": {
        "pt": "Como uma Ação Bônus, você pode assumir uma aparência mais bestial. Esta transformação dura 1 minuto, até você morrer ou até retornar à sua aparência normal como uma Ação Bônus. Quando muda de forma, você ganha Pontos de Vida Temporários iguais ao seu nível + seu modificador de Constituição (mínimo de 1 Ponto de Vida Temporário). Você também ganha benefícios adicionais que dependem da sua sub-raça de transmorfo, descritos abaixo.\n\nDepois de mudar de forma, você não pode fazê-lo novamente até terminar um Descanso Curto ou Longo.",
        "en": "As a bonus action, you can assume a more bestial appearance. This transformation lasts for 1 minute, until you die, or until you revert to your normal appearance as a bonus action. When you shift, you gain temporary hit points equal to your level + your Constitution modifier (minimum of 1 temporary hit point). You also gain additional benefits that depend on your shifter subrace, described below.\n\nOnce you shift, you can’t do so again until you finish a short or long rest."
      }
    },
    {
      "name": {
        "pt": "Feroz",
        "en": "Fierce"
      },
      "desc": {
        "pt": "Você tem proficiência na perícia Intimidação.",
        "en": "You have proficiency in the Intimidation skill."
      }
    },
    {
      "name": {
        "pt": "Traço da Transmutação",
        "en": "Shifting Feature"
      },
      "desc": {
        "pt": "Enquanto estiver transformado, você pode usar suas presas alongadas para realizar um ataque desarmado como uma Ação Bônus. Se acertar com suas presas, você pode causar dano perfurante igual a 1d6 + seu modificador de Força, em vez do dano contundente normal de um ataque desarmado.",
        "en": "While shifted, you can use your elongated fangs to make an unarmed strike as a bonus action. If you hit with your fangs, you can deal piercing damage equal to 1d6 + your Strength modifier, instead of the bludgeoning damage normal for an unarmed strike."
      }
    }
  ],
  "shifter-swiftstride": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Transmutação",
        "en": "Shifting"
      },
      "desc": {
        "pt": "Como uma Ação Bônus, você pode assumir uma aparência mais bestial. Esta transformação dura 1 minuto, até você morrer ou até retornar à sua aparência normal como uma Ação Bônus. Quando muda de forma, você ganha Pontos de Vida Temporários iguais ao seu nível + seu modificador de Constituição (mínimo de 1 Ponto de Vida Temporário). Você também ganha benefícios adicionais que dependem da sua sub-raça de transmorfo, descritos abaixo.\n\nDepois de mudar de forma, você não pode fazê-lo novamente até terminar um Descanso Curto ou Longo.",
        "en": "As a bonus action, you can assume a more bestial appearance. This transformation lasts for 1 minute, until you die, or until you revert to your normal appearance as a bonus action. When you shift, you gain temporary hit points equal to your level + your Constitution modifier (minimum of 1 temporary hit point). You also gain additional benefits that depend on your shifter subrace, described below.\n\nOnce you shift, you can’t do so again until you finish a short or long rest."
      }
    },
    {
      "name": {
        "pt": "Gracioso",
        "en": "Graceful"
      },
      "desc": {
        "pt": "Você tem proficiência na perícia Acrobacia.",
        "en": "You have proficiency in the Acrobatics skill."
      }
    },
    {
      "name": {
        "pt": "Traço da Transmutação",
        "en": "Shifting Feature"
      },
      "desc": {
        "pt": "Enquanto estiver transformado, seu deslocamento de caminhada aumenta em 3 metros. Além disso, você pode se mover até 3 metros como uma Reação quando uma criatura terminar o turno dela a até 1,5 metro de você. Esse movimento reativo não provoca ataques de oportunidade.",
        "en": "While shifted, your walking speed increases by 10 feet. Additionally, you can move up to 10 feet as a reaction when a creature ends its turn within 5 feet of you. This reactive movement doesn’t provoke opportunity attacks."
      }
    }
  ],
  "shifter-wildhunt": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Transmutação",
        "en": "Shifting"
      },
      "desc": {
        "pt": "Como uma Ação Bônus, você pode assumir uma aparência mais bestial. Esta transformação dura 1 minuto, até você morrer ou até retornar à sua aparência normal como uma Ação Bônus. Quando muda de forma, você ganha Pontos de Vida Temporários iguais ao seu nível + seu modificador de Constituição (mínimo de 1 Ponto de Vida Temporário). Você também ganha benefícios adicionais que dependem da sua sub-raça de transmorfo, descritos abaixo.\n\nDepois de mudar de forma, você não pode fazê-lo novamente até terminar um Descanso Curto ou Longo.",
        "en": "As a bonus action, you can assume a more bestial appearance. This transformation lasts for 1 minute, until you die, or until you revert to your normal appearance as a bonus action. When you shift, you gain temporary hit points equal to your level + your Constitution modifier (minimum of 1 temporary hit point). You also gain additional benefits that depend on your shifter subrace, described below.\n\nOnce you shift, you can’t do so again until you finish a short or long rest."
      }
    },
    {
      "name": {
        "pt": "Rastreador Natural",
        "en": "Natural Tracker"
      },
      "desc": {
        "pt": "Você tem proficiência na perícia Sobrevivência.",
        "en": "You have proficiency in the Survival skill."
      }
    },
    {
      "name": {
        "pt": "Traço da Transmutação",
        "en": "Shifting Feature"
      },
      "desc": {
        "pt": "Enquanto estiver transformado, você tem Vantagem em testes de Sabedoria, e nenhuma criatura a até 9 metros de você pode fazer uma jogada de ataque com Vantagem contra você, a menos que você esteja incapacitado.",
        "en": "While shifted, you have advantage on Wisdom checks, and no creature within 30 feet of you can make an attack roll with advantage against you, unless you’re incapacitated."
      }
    }
  ],
  "half-elf-mark-detection": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Ancestral Feérico",
        "en": "Fey Ancestry"
      },
      "desc": {
        "pt": "Você tem Vantagem em salvaguardas contra ser Enfeitiçado, e a magia não pode fazer você adormecer.",
        "en": "You have advantage on saving throws against being charmed, and magic can’t put you to sleep."
      }
    },
    {
      "name": {
        "pt": "Intuição Dedutiva",
        "en": "Deductive Intuition"
      },
      "desc": {
        "pt": "Quando você faz um teste de Inteligência (Investigação) ou de Sabedoria (Intuição), pode rolar um d4 e adicionar o número rolado ao teste de habilidade.",
        "en": "When you make an Intelligence (Investigation) or a Wisdom (Insight) check, you can roll a d4 and add the number rolled to the ability check."
      }
    },
    {
      "name": {
        "pt": "Detecção Mágica",
        "en": "Magical Detection"
      },
      "desc": {
        "pt": "Você pode conjurar as magias detectar magia e detectar veneno e doença com esta característica. A partir do 3º nível, você também pode conjurar a magia ver o invisível com ela. Uma vez que conjurar qualquer uma dessas magias com esta característica, você não pode conjurar essa magia com ela novamente até terminar um Descanso Longo. Inteligência é a sua habilidade de conjuração para essas magias, e você não precisa de componentes materiais para elas.",
        "en": "You can cast the detect magic and detect poison and disease spells with this trait. Starting at 3rd level, you can also cast the see invisibility spell with it. Once you cast any of these spells with this trait, you can’t cast that spell with it again until you finish a long rest. Intelligence is your spellcasting ability for these spells, and you don’t require material components for them."
      }
    },
    {
      "name": {
        "pt": "Magias da Marca",
        "en": "Spells of the Mark"
      },
      "desc": {
        "pt": "Se você tiver a característica de classe Conjuração ou Magia de Pacto, as magias na tabela Magias da Marca da Hospitalidade são adicionadas à lista de magias da sua classe conjuradora.\n\nMagias da Marca da Hospitalidade\n\n| Círculo de Magia | Magias |\n\n| 1º | bom fruto, sono |\n\n| 2º | ajuda, acalmar emoções |\n\n| 3º | criar comida e água, cabana minúscula de Leomund |\n\n| 4º | aura de pureza, santuário particular de Mordenkainen |\n\n| 5º | consagrar |",
        "en": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Hospitality Spells table are added to the spell list of your spellcasting class.\n\nMark of Hospitality Spells\n\n| Spell Level | Spells |\n\n| 1st | goodberry, sleep |\n\n| 2nd | aid, calm emotions |\n\n| 3rd | create food and water, Leomund’s tiny hut |\n\n| 4th | aura of purity, Mordenkainen’s private sanctum |\n\n| 5th | hallow |"
      }
    },
    {
      "name": {
        "pt": "Aumento de Atributo",
        "en": "Ability Score Increase"
      },
      "desc": {
        "pt": "Seu valor de Sabedoria aumenta em 1.",
        "en": "Your Wisdom score increases by 1."
      }
    }
  ],
  "human-mark-finding": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Intuição do Caçador",
        "en": "Hunter's Intuition"
      },
      "desc": {
        "pt": "Quando você faz um teste de Sabedoria (Percepção) ou de Sabedoria (Sobrevivência), pode rolar um d4 e adicionar o número rolado ao teste de habilidade.",
        "en": "When you make a Wisdom (Perception) or Wisdom (Survival) check, you can roll a d4 and add the number rolled to the ability check."
      }
    },
    {
      "name": {
        "pt": "Magia do Rastreador",
        "en": "Finder's Magic"
      },
      "desc": {
        "pt": "Você pode conjurar a magia marca do caçador com esta característica. A partir do 3º nível, você também pode conjurar a magia localizar objeto com ela. Uma vez que conjurar qualquer uma das magias com esta característica, você não pode conjurar essa magia com ela novamente até terminar um Descanso Longo. Sabedoria é a sua habilidade de conjuração para essas magias.",
        "en": "You can cast the hunter’s mark spell with this trait. Starting at 3rd level, you can also cast the locate object spell with it. Once you cast either spell with this trait, you can’t cast that spell with it again until you finish a long rest. Wisdom is your spellcasting ability for these spells."
      }
    },
    {
      "name": {
        "pt": "Magias da Marca",
        "en": "Spells of the Mark"
      },
      "desc": {
        "pt": "Se você tiver a característica de classe Conjuração ou Magia de Pacto, as magias na tabela Magias da Marca da Hospitalidade são adicionadas à lista de magias da sua classe conjuradora.\n\nMagias da Marca da Hospitalidade\n\n| Círculo de Magia | Magias |\n\n| 1º | bom fruto, sono |\n\n| 2º | ajuda, acalmar emoções |\n\n| 3º | criar comida e água, cabana minúscula de Leomund |\n\n| 4º | aura de pureza, santuário particular de Mordenkainen |\n\n| 5º | consagrar |",
        "en": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Hospitality Spells table are added to the spell list of your spellcasting class.\n\nMark of Hospitality Spells\n\n| Spell Level | Spells |\n\n| 1st | goodberry, sleep |\n\n| 2nd | aid, calm emotions |\n\n| 3rd | create food and water, Leomund’s tiny hut |\n\n| 4th | aura of purity, Mordenkainen’s private sanctum |\n\n| 5th | hallow |"
      }
    }
  ],
  "half-orc-mark-finding": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Intuição do Caçador",
        "en": "Hunter's Intuition"
      },
      "desc": {
        "pt": "Quando você faz um teste de Sabedoria (Percepção) ou de Sabedoria (Sobrevivência), pode rolar um d4 e adicionar o número rolado ao teste de habilidade.",
        "en": "When you make a Wisdom (Perception) or Wisdom (Survival) check, you can roll a d4 and add the number rolled to the ability check."
      }
    },
    {
      "name": {
        "pt": "Magia do Rastreador",
        "en": "Finder's Magic"
      },
      "desc": {
        "pt": "Você pode conjurar a magia marca do caçador com esta característica. A partir do 3º nível, você também pode conjurar a magia localizar objeto com ela. Uma vez que conjurar qualquer uma das magias com esta característica, você não pode conjurar essa magia com ela novamente até terminar um Descanso Longo. Sabedoria é a sua habilidade de conjuração para essas magias.",
        "en": "You can cast the hunter’s mark spell with this trait. Starting at 3rd level, you can also cast the locate object spell with it. Once you cast either spell with this trait, you can’t cast that spell with it again until you finish a long rest. Wisdom is your spellcasting ability for these spells."
      }
    },
    {
      "name": {
        "pt": "Magias da Marca",
        "en": "Spells of the Mark"
      },
      "desc": {
        "pt": "Se você tiver a característica de classe Conjuração ou Magia de Pacto, as magias na tabela Magias da Marca da Hospitalidade são adicionadas à lista de magias da sua classe conjuradora.\n\nMagias da Marca da Hospitalidade\n\n| Círculo de Magia | Magias |\n\n| 1º | bom fruto, sono |\n\n| 2º | ajuda, acalmar emoções |\n\n| 3º | criar comida e água, cabana minúscula de Leomund |\n\n| 4º | aura de pureza, santuário particular de Mordenkainen |\n\n| 5º | consagrar |",
        "en": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Hospitality Spells table are added to the spell list of your spellcasting class.\n\nMark of Hospitality Spells\n\n| Spell Level | Spells |\n\n| 1st | goodberry, sleep |\n\n| 2nd | aid, calm emotions |\n\n| 3rd | create food and water, Leomund’s tiny hut |\n\n| 4th | aura of purity, Mordenkainen’s private sanctum |\n\n| 5th | hallow |"
      }
    }
  ],
  "human-mark-handling": [
    {
      "name": {
        "pt": "Intuição Selvagem",
        "en": "Wild Intuition"
      },
      "desc": {
        "pt": "Quando você faz um teste de Sabedoria (Adestrar Animais) ou de Inteligência (Natureza), pode rolar um d4 e adicionar o número rolado ao teste de habilidade.",
        "en": "When you make a Wisdom (Animal Handling) or Intelligence (Nature) check, you can roll a d4 and add the number rolled to the ability check."
      }
    },
    {
      "name": {
        "pt": "Conexão Primal",
        "en": "Primal Connection"
      },
      "desc": {
        "pt": "Você pode conjurar as magias amizade animal e falar com animais com esta característica, sem precisar de componentes materiais. Uma vez que conjurar qualquer uma das magias com esta característica, você não pode conjurar essa magia com ela novamente até terminar um Descanso Curto ou Longo. Sabedoria é a sua habilidade de conjuração para essas magias.",
        "en": "You can cast the animal friendship and speak with animals spells with this trait, requiring no material component. Once you cast either spell with this trait, you can’t cast that spell with it again until you finish a short or long rest. Wisdom is your spellcasting ability for these spells."
      }
    },
    {
      "name": {
        "pt": "Quanto Maior…",
        "en": "The Bigger They Are"
      },
      "desc": {
        "pt": "A partir do 3º nível, você pode ter como alvo uma besta ou monstruosidade ao conjurar amizade animal ou falar com animais, desde que o valor de Inteligência da criatura seja 3 ou menor.",
        "en": "Starting at 3rd level, you can target a beast or monstrosity when you cast animal friendship or speak with animals, provided the creature’s Intelligence score is 3 or lower."
      }
    },
    {
      "name": {
        "pt": "Magias da Marca",
        "en": "Spells of the Mark"
      },
      "desc": {
        "pt": "Se você tiver a característica de classe Conjuração ou Magia de Pacto, as magias na tabela Magias da Marca da Hospitalidade são adicionadas à lista de magias da sua classe conjuradora.\n\nMagias da Marca da Hospitalidade\n\n| Círculo de Magia | Magias |\n\n| 1º | bom fruto, sono |\n\n| 2º | ajuda, acalmar emoções |\n\n| 3º | criar comida e água, cabana minúscula de Leomund |\n\n| 4º | aura de pureza, santuário particular de Mordenkainen |\n\n| 5º | consagrar |",
        "en": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Hospitality Spells table are added to the spell list of your spellcasting class.\n\nMark of Hospitality Spells\n\n| Spell Level | Spells |\n\n| 1st | goodberry, sleep |\n\n| 2nd | aid, calm emotions |\n\n| 3rd | create food and water, Leomund’s tiny hut |\n\n| 4th | aura of purity, Mordenkainen’s private sanctum |\n\n| 5th | hallow |"
      }
    },
    {
      "name": {
        "pt": "Aumento de Atributo",
        "en": "Ability Score Increase"
      },
      "desc": {
        "pt": "Seu valor de Sabedoria aumenta em 1.",
        "en": "Your Wisdom score increases by 1."
      }
    }
  ],
  "halfling-mark-healing": [
    {
      "name": {
        "pt": "Sortudo",
        "en": "Lucky"
      },
      "desc": {
        "pt": "Quando você rola um 1 em uma jogada de ataque, teste de atributo ou salvaguarda, pode rolar o dado novamente e deve usar o novo resultado.",
        "en": "When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll."
      }
    },
    {
      "name": {
        "pt": "Bravo",
        "en": "Brave"
      },
      "desc": {
        "pt": "Você tem vantagem em salvaguardas para não ficar amedrontado.",
        "en": "You have advantage on saving throws against being frightened."
      }
    },
    {
      "name": {
        "pt": "Agilidade Halfling",
        "en": "Halfling Nimbleness"
      },
      "desc": {
        "pt": "Você pode se mover através do espaço de qualquer criatura que seja de um tamanho maior que o seu.",
        "en": "You can move through the space of any creature that is of a size larger than yours."
      }
    },
    {
      "name": {
        "pt": "Intuição Médica",
        "en": "Medical Intuition"
      },
      "desc": {
        "pt": "Quando você faz um teste de Sabedoria (Medicina) ou um teste de habilidade usando um kit de herbalismo, pode rolar um d4 e adicionar o número rolado ao teste de habilidade.",
        "en": "When you make a Wisdom (Medicine) check or an ability check using an herbalism kit, you can roll a d4 and add the number rolled to the ability check."
      }
    },
    {
      "name": {
        "pt": "Toque Curativo",
        "en": "Healing Touch"
      },
      "desc": {
        "pt": "Você pode conjurar a magia Curar Ferimentos com esta característica. A partir do 3º nível, você também pode conjurar Restauração Menor com ela. Uma vez que conjurar qualquer uma das magias com esta característica, você não pode conjurar essa magia com ela novamente até terminar um Descanso Longo. Sabedoria é a sua habilidade de conjuração para essas magias.",
        "en": "You can cast the Cure Wounds spell with this trait. Starting at 3rd level, you can also cast Lesser Restoration with it. Once you cast either spell with this trait, you can’t cast that spell with it again until you finish a long rest. Wisdom is your spellcasting ability for these spells."
      }
    },
    {
      "name": {
        "pt": "Magias da Marca",
        "en": "Spells of the Mark"
      },
      "desc": {
        "pt": "Se você tiver a característica de classe Conjuração ou Magia de Pacto, as magias na tabela Magias da Marca da Hospitalidade são adicionadas à lista de magias da sua classe conjuradora.\n\nMagias da Marca da Hospitalidade\n\n| Círculo de Magia | Magias |\n\n| 1º | bom fruto, sono |\n\n| 2º | ajuda, acalmar emoções |\n\n| 3º | criar comida e água, cabana minúscula de Leomund |\n\n| 4º | aura de pureza, santuário particular de Mordenkainen |\n\n| 5º | consagrar |",
        "en": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Hospitality Spells table are added to the spell list of your spellcasting class.\n\nMark of Hospitality Spells\n\n| Spell Level | Spells |\n\n| 1st | goodberry, sleep |\n\n| 2nd | aid, calm emotions |\n\n| 3rd | create food and water, Leomund’s tiny hut |\n\n| 4th | aura of purity, Mordenkainen’s private sanctum |\n\n| 5th | hallow |"
      }
    }
  ],
  "halfling-mark-hospitality": [
    {
      "name": {
        "pt": "Sortudo",
        "en": "Lucky"
      },
      "desc": {
        "pt": "Quando você rola um 1 em uma jogada de ataque, teste de atributo ou salvaguarda, pode rolar o dado novamente e deve usar o novo resultado.",
        "en": "When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll."
      }
    },
    {
      "name": {
        "pt": "Bravo",
        "en": "Brave"
      },
      "desc": {
        "pt": "Você tem vantagem em salvaguardas para não ficar amedrontado.",
        "en": "You have advantage on saving throws against being frightened."
      }
    },
    {
      "name": {
        "pt": "Agilidade Halfling",
        "en": "Halfling Nimbleness"
      },
      "desc": {
        "pt": "Você pode se mover através do espaço de qualquer criatura que seja de um tamanho maior que o seu.",
        "en": "You can move through the space of any creature that is of a size larger than yours."
      }
    },
    {
      "name": {
        "pt": "Sempre Hospitaleiro",
        "en": "Ever Hospitable"
      },
      "desc": {
        "pt": "Quando você faz um teste de Carisma (Persuasão) ou um teste de habilidade envolvendo suprimentos de cervejeiro ou utensílios de cozinheiro, pode rolar um d4 e adicionar o número rolado ao teste de habilidade.",
        "en": "When you make a Charisma (Persuasion) check or an ability check involving brewer’s supplies or cook’s utensils, you can roll a d4 and add the number rolled to the ability check."
      }
    },
    {
      "name": {
        "pt": "Magia do Estalajadeiro",
        "en": "Innkeeper's Magic"
      },
      "desc": {
        "pt": "Você conhece o truque prestidigitação. Você também pode conjurar as magias purificar comida e bebida e servo invisível com esta característica. Uma vez que conjurar qualquer uma das magias com esta característica, você não pode conjurar essa magia com ela novamente até terminar um Descanso Longo. Carisma é a sua habilidade de conjuração para essas magias.",
        "en": "You know the prestidigitation cantrip. You can also cast the purify food and drink and unseen servant spells with this trait. Once you cast either spell with this trait, you can’t cast that spell with it again until you finish long rest. Charisma is your spellcasting ability for these spells."
      }
    },
    {
      "name": {
        "pt": "Magias da Marca",
        "en": "Spells of the Mark"
      },
      "desc": {
        "pt": "Se você tiver a característica de classe Conjuração ou Magia de Pacto, as magias na tabela Magias da Marca da Hospitalidade são adicionadas à lista de magias da sua classe conjuradora.\n\nMagias da Marca da Hospitalidade\n\n| Círculo de Magia | Magias |\n\n| 1º | bom fruto, sono |\n\n| 2º | ajuda, acalmar emoções |\n\n| 3º | criar comida e água, cabana minúscula de Leomund |\n\n| 4º | aura de pureza, santuário particular de Mordenkainen |\n\n| 5º | consagrar |",
        "en": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Hospitality Spells table are added to the spell list of your spellcasting class.\n\nMark of Hospitality Spells\n\n| Spell Level | Spells |\n\n| 1st | goodberry, sleep |\n\n| 2nd | aid, calm emotions |\n\n| 3rd | create food and water, Leomund’s tiny hut |\n\n| 4th | aura of purity, Mordenkainen’s private sanctum |\n\n| 5th | hallow |"
      }
    }
  ],
  "human-mark-making": [
    {
      "name": {
        "pt": "Intuição do Artesão",
        "en": "Artisan's Intuition"
      },
      "desc": {
        "pt": "Quando você faz um teste de Arcanismo ou um teste de habilidade envolvendo ferramentas de artesão, pode rolar um d4 e adicionar o número rolado ao teste de habilidade.",
        "en": "When you make an Arcana check or an ability check involving artisan’s tools, you can roll a d4 and add the number rolled to the ability check."
      }
    },
    {
      "name": {
        "pt": "Forjador de Magias",
        "en": "Spellsmith"
      },
      "desc": {
        "pt": "Você conhece o truque remendar. Você também pode conjurar a magia arma mágica com esta característica. Ao fazê-lo, a magia dura por 1 hora e não requer concentração. Depois de conjurar a magia com esta característica, você não pode fazê-lo novamente até terminar um Descanso Longo. Inteligência é a sua habilidade de conjuração para essas magias.",
        "en": "You know the mending cantrip. You can also cast the magic weapon spell with this trait. When you do so, the spell lasts for 1 hour and doesn’t require concentration. Once you cast the spell with this trait, you can’t do so again until you finish a long rest. Intelligence is your spellcasting ability for these spells."
      }
    },
    {
      "name": {
        "pt": "Dom do Criador",
        "en": "Maker's Gift"
      },
      "desc": {
        "pt": "Você ganha proficiência com um tipo de ferramentas de artesão à sua escolha.",
        "en": "You gain proficiency with one type of artisan’s tools of your choice."
      }
    },
    {
      "name": {
        "pt": "Magias da Marca",
        "en": "Spells of the Mark"
      },
      "desc": {
        "pt": "Se você tiver a característica de classe Conjuração ou Magia de Pacto, as magias na tabela Magias da Marca da Hospitalidade são adicionadas à lista de magias da sua classe conjuradora.\n\nMagias da Marca da Hospitalidade\n\n| Círculo de Magia | Magias |\n\n| 1º | bom fruto, sono |\n\n| 2º | ajuda, acalmar emoções |\n\n| 3º | criar comida e água, cabana minúscula de Leomund |\n\n| 4º | aura de pureza, santuário particular de Mordenkainen |\n\n| 5º | consagrar |",
        "en": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Hospitality Spells table are added to the spell list of your spellcasting class.\n\nMark of Hospitality Spells\n\n| Spell Level | Spells |\n\n| 1st | goodberry, sleep |\n\n| 2nd | aid, calm emotions |\n\n| 3rd | create food and water, Leomund’s tiny hut |\n\n| 4th | aura of purity, Mordenkainen’s private sanctum |\n\n| 5th | hallow |"
      }
    },
    {
      "name": {
        "pt": "Aumento de Atributo",
        "en": "Ability Score Increase"
      },
      "desc": {
        "pt": "Seu valor de Inteligência aumenta em 1.",
        "en": "Your Intelligence score increases by 1."
      }
    }
  ],
  "human-mark-passage": [
    {
      "name": {
        "pt": "Movimento Intuitivo",
        "en": "Intuitive Motion"
      },
      "desc": {
        "pt": "Quando você faz um teste de Destreza (Acrobacia) ou qualquer teste de habilidade para operar ou manter um veículo terrestre, pode rolar um d4 e adicionar o número rolado ao teste de habilidade.",
        "en": "When you make a Dexterity (Acrobatics) check or any ability check to operate or maintain a land vehicle, you can roll a d4 and add the number rolled to the ability check."
      }
    },
    {
      "name": {
        "pt": "Passagem Mágica",
        "en": "Magical Passage"
      },
      "desc": {
        "pt": "Você pode conjurar a magia passo nebuloso uma vez com esta característica e recupera a capacidade de conjurá-la ao terminar um Descanso Longo. Destreza é a sua habilidade de conjuração para esta magia.",
        "en": "You can cast the misty step spell once with this trait, and you regain the ability to cast it when you finish a long rest. Dexterity is your spellcasting ability for this spell."
      }
    },
    {
      "name": {
        "pt": "Velocidade do Mensageiro",
        "en": "Courier's Speed"
      },
      "desc": {
        "pt": "Seu deslocamento base de caminhada aumenta para 10,5 metros.",
        "en": "Your base walking speed increases to 35 feet."
      }
    },
    {
      "name": {
        "pt": "Magias da Marca",
        "en": "Spells of the Mark"
      },
      "desc": {
        "pt": "Se você tiver a característica de classe Conjuração ou Magia de Pacto, as magias na tabela Magias da Marca da Hospitalidade são adicionadas à lista de magias da sua classe conjuradora.\n\nMagias da Marca da Hospitalidade\n\n| Círculo de Magia | Magias |\n\n| 1º | bom fruto, sono |\n\n| 2º | ajuda, acalmar emoções |\n\n| 3º | criar comida e água, cabana minúscula de Leomund |\n\n| 4º | aura de pureza, santuário particular de Mordenkainen |\n\n| 5º | consagrar |",
        "en": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Hospitality Spells table are added to the spell list of your spellcasting class.\n\nMark of Hospitality Spells\n\n| Spell Level | Spells |\n\n| 1st | goodberry, sleep |\n\n| 2nd | aid, calm emotions |\n\n| 3rd | create food and water, Leomund’s tiny hut |\n\n| 4th | aura of purity, Mordenkainen’s private sanctum |\n\n| 5th | hallow |"
      }
    },
    {
      "name": {
        "pt": "Aumento de Atributo",
        "en": "Ability Score Increase"
      },
      "desc": {
        "pt": "Seu valor de Destreza aumenta em 1.",
        "en": "Your Dexterity score increases by 1."
      }
    }
  ],
  "gnome-mark-scribing": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Astúcia Gnômica",
        "en": "Gnome Cunning"
      },
      "desc": {
        "pt": "Você tem vantagem em todas as salvaguardas de Inteligência, Sabedoria e Carisma contra magia.",
        "en": "You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic."
      }
    },
    {
      "name": {
        "pt": "Escriba Talentoso",
        "en": "Gifted Scribe"
      },
      "desc": {
        "pt": "Quando você faz um teste de Inteligência (História) ou um teste de habilidade usando suprimentos de calígrafo, pode rolar um d4 e adicionar o número rolado ao teste de habilidade.",
        "en": "When you make an Intelligence (History) check or an ability check using calligrapher’s supplies, you can roll a d4 and add the number rolled to the ability check."
      }
    },
    {
      "name": {
        "pt": "Percepção do Escriba",
        "en": "Scribe's Insight"
      },
      "desc": {
        "pt": "Você conhece o truque mensagem. Você também pode conjurar compreender idiomas uma vez com esta característica e recupera a capacidade de conjurá-la ao terminar um Descanso Curto ou Longo. A partir do 3º nível, você pode conjurar a magia boca encantada com esta característica e recupera a capacidade de conjurá-la ao terminar um Descanso Longo. Inteligência é a sua habilidade de conjuração para essas magias.",
        "en": "You know the message cantrip. You can also cast comprehend languages once with this trait, and you regain the ability to cast it when you finish a short or long rest. Starting at 3rd level, you can cast the magic mouth spell with this trait, and you regain the ability to cast it when you finish a long rest. Intelligence is your spellcasting ability for these spells."
      }
    },
    {
      "name": {
        "pt": "Magias da Marca",
        "en": "Spells of the Mark"
      },
      "desc": {
        "pt": "Se você tiver a característica de classe Conjuração ou Magia de Pacto, as magias na tabela Magias da Marca da Hospitalidade são adicionadas à lista de magias da sua classe conjuradora.\n\nMagias da Marca da Hospitalidade\n\n| Círculo de Magia | Magias |\n\n| 1º | bom fruto, sono |\n\n| 2º | ajuda, acalmar emoções |\n\n| 3º | criar comida e água, cabana minúscula de Leomund |\n\n| 4º | aura de pureza, santuário particular de Mordenkainen |\n\n| 5º | consagrar |",
        "en": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Hospitality Spells table are added to the spell list of your spellcasting class.\n\nMark of Hospitality Spells\n\n| Spell Level | Spells |\n\n| 1st | goodberry, sleep |\n\n| 2nd | aid, calm emotions |\n\n| 3rd | create food and water, Leomund’s tiny hut |\n\n| 4th | aura of purity, Mordenkainen’s private sanctum |\n\n| 5th | hallow |"
      }
    }
  ],
  "human-mark-sentinel": [
    {
      "name": {
        "pt": "Intuição da Sentinela",
        "en": "Sentinel's Intuition"
      },
      "desc": {
        "pt": "Quando você faz um teste de Sabedoria (Intuição) ou de Sabedoria (Percepção), pode rolar um d4 e adicionar o número rolado ao teste de habilidade.",
        "en": "When you make a Wisdom (Insight) or Wisdom (Perception) check, you can roll a d4 and add the number rolled to the ability check."
      }
    },
    {
      "name": {
        "pt": "Escudo do Guardião",
        "en": "Guardian's Shield"
      },
      "desc": {
        "pt": "Você pode conjurar a magia escudo arcano uma vez com esta característica e recupera a capacidade de conjurá-la depois de terminar um Descanso Longo. Sabedoria é a sua habilidade de conjuração para esta magia.",
        "en": "You can cast the shield spell once with this trait, and you regain the ability to cast it after you finish a long rest. Wisdom is your spellcasting ability for this spell."
      }
    },
    {
      "name": {
        "pt": "Guardião Vigilante",
        "en": "Vigilant Guardian"
      },
      "desc": {
        "pt": "Quando uma criatura que você possa ver a até 1,5 metro de você for atingida por uma jogada de ataque, você pode usar sua Reação para trocar de lugar com aquela criatura, e você é atingido pelo ataque em vez dela. Depois de usar esta característica, você não pode fazê-lo novamente até terminar um Descanso Longo.",
        "en": "When a creature you can see within 5 feet of you is hit by an attack roll, you can use your reaction to swap places with that creature, and you are hit by the attack instead. Once you use this trait, you can’t do so again until you finish a long rest."
      }
    },
    {
      "name": {
        "pt": "Magias da Marca",
        "en": "Spells of the Mark"
      },
      "desc": {
        "pt": "Se você tiver a característica de classe Conjuração ou Magia de Pacto, as magias na tabela Magias da Marca da Hospitalidade são adicionadas à lista de magias da sua classe conjuradora.\n\nMagias da Marca da Hospitalidade\n\n| Círculo de Magia | Magias |\n\n| 1º | bom fruto, sono |\n\n| 2º | ajuda, acalmar emoções |\n\n| 3º | criar comida e água, cabana minúscula de Leomund |\n\n| 4º | aura de pureza, santuário particular de Mordenkainen |\n\n| 5º | consagrar |",
        "en": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Hospitality Spells table are added to the spell list of your spellcasting class.\n\nMark of Hospitality Spells\n\n| Spell Level | Spells |\n\n| 1st | goodberry, sleep |\n\n| 2nd | aid, calm emotions |\n\n| 3rd | create food and water, Leomund’s tiny hut |\n\n| 4th | aura of purity, Mordenkainen’s private sanctum |\n\n| 5th | hallow |"
      }
    }
  ],
  "elf-mark-shadow": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Sentidos Apurados",
        "en": "Keen Senses"
      },
      "desc": {
        "pt": "Você tem proficiência na perícia Percepção.",
        "en": "You have proficiency in the Perception skill."
      }
    },
    {
      "name": {
        "pt": "Ancestral Feérico",
        "en": "Fey Ancestry"
      },
      "desc": {
        "pt": "Você tem Vantagem em salvaguardas contra ser Enfeitiçado, e a magia não pode fazer você adormecer.",
        "en": "You have advantage on saving throws against being charmed, and magic can’t put you to sleep."
      }
    },
    {
      "name": {
        "pt": "Transe",
        "en": "Trance"
      },
      "desc": {
        "pt": "Elfos não precisam dormir. Em vez disso, meditam profundamente, permanecendo semiconscientes, por 4 horas por dia. (A palavra em Comum para essa meditação é “transe”.) Enquanto medita, você pode sonhar de certa forma; tais sonhos são, na verdade, exercícios mentais que se tornaram reflexivos através de anos de prática. Depois de descansar dessa forma, você obtém o mesmo benefício que um humano obtém com 8 horas de sono.",
        "en": "Elves don’t need to sleep. Instead, they meditate deeply, remaining semiconscious, for 4 hours a day. (The Common word for such meditation is “trance.”) While meditating, you can dream after a fashion; such dreams are actually mental exercises that have become reflexive through years of practice. After resting in this way, you gain the same benefit that a human does from 8 hours of sleep."
      }
    },
    {
      "name": {
        "pt": "Intuição Astuta",
        "en": "Cunning Intuition"
      },
      "desc": {
        "pt": "Quando você faz um teste de Carisma (Atuação) ou de Destreza (Furtividade), pode rolar um d4 e adicionar o número rolado ao teste de habilidade.",
        "en": "When you make a Charisma (Performance) or Dexterity (Stealth) check, you can roll a d4 and add the number rolled to the ability check."
      }
    },
    {
      "name": {
        "pt": "Moldar Sombras",
        "en": "Shape Shadows"
      },
      "desc": {
        "pt": "Você conhece o truque ilusão menor. A partir do 3º nível, você pode conjurar a magia invisibilidade uma vez com esta característica e recupera a capacidade de conjurá-la ao terminar um Descanso Longo. Carisma é a sua habilidade de conjuração para essas magias.",
        "en": "You know the minor illusion cantrip. Starting at 3rd level, you can cast the invisibility spell once with this trait, and you regain the ability to cast it when you finish a long rest. Charisma is your spellcasting ability for these spells."
      }
    },
    {
      "name": {
        "pt": "Magias da Marca",
        "en": "Spells of the Mark"
      },
      "desc": {
        "pt": "Se você tiver a característica de classe Conjuração ou Magia de Pacto, as magias na tabela Magias da Marca da Hospitalidade são adicionadas à lista de magias da sua classe conjuradora.\n\nMagias da Marca da Hospitalidade\n\n| Círculo de Magia | Magias |\n\n| 1º | bom fruto, sono |\n\n| 2º | ajuda, acalmar emoções |\n\n| 3º | criar comida e água, cabana minúscula de Leomund |\n\n| 4º | aura de pureza, santuário particular de Mordenkainen |\n\n| 5º | consagrar |",
        "en": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Hospitality Spells table are added to the spell list of your spellcasting class.\n\nMark of Hospitality Spells\n\n| Spell Level | Spells |\n\n| 1st | goodberry, sleep |\n\n| 2nd | aid, calm emotions |\n\n| 3rd | create food and water, Leomund’s tiny hut |\n\n| 4th | aura of purity, Mordenkainen’s private sanctum |\n\n| 5th | hallow |"
      }
    }
  ],
  "half-elf-mark-storm": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Ancestral Feérico",
        "en": "Fey Ancestry"
      },
      "desc": {
        "pt": "Você tem Vantagem em salvaguardas contra ser Enfeitiçado, e a magia não pode fazer você adormecer.",
        "en": "You have advantage on saving throws against being charmed, and magic can’t put you to sleep."
      }
    },
    {
      "name": {
        "pt": "Intuição do Ventomestre",
        "en": "Windwright's Intuition"
      },
      "desc": {
        "pt": "Quando você faz um teste de Destreza (Acrobacia) ou qualquer teste de habilidade envolvendo ferramentas de navegador, pode rolar um d4 e adicionar o número rolado ao teste de habilidade.",
        "en": "When you make a Dexterity (Acrobatics) check or any ability check involving navigator’s tools, you can roll a d4 and add the number rolled to the ability check."
      }
    },
    {
      "name": {
        "pt": "Vento Contrário",
        "en": "Headwinds"
      },
      "desc": {
        "pt": "Você conhece o truque rajada. A partir do 3º nível, você pode conjurar a magia rajada de vento uma vez com esta característica e recupera a capacidade de conjurá-la ao terminar um Descanso Longo. Carisma é a sua habilidade de conjuração para essas magias.",
        "en": "You know the gust cantrip. Starting at 3rd level, you can cast the gust of wind spell once with this trait, and you regain the ability to cast it when you finish a long rest. Charisma is your spellcasting ability for these spells."
      }
    },
    {
      "name": {
        "pt": "Dádiva da Tempestade",
        "en": "Storm's Boon"
      },
      "desc": {
        "pt": "Você tem resistência a dano elétrico.",
        "en": "You have resistance to lightning damage."
      }
    },
    {
      "name": {
        "pt": "Magias da Marca",
        "en": "Spells of the Mark"
      },
      "desc": {
        "pt": "Se você tiver a característica de classe Conjuração ou Magia de Pacto, as magias na tabela Magias da Marca da Hospitalidade são adicionadas à lista de magias da sua classe conjuradora.\n\nMagias da Marca da Hospitalidade\n\n| Círculo de Magia | Magias |\n\n| 1º | bom fruto, sono |\n\n| 2º | ajuda, acalmar emoções |\n\n| 3º | criar comida e água, cabana minúscula de Leomund |\n\n| 4º | aura de pureza, santuário particular de Mordenkainen |\n\n| 5º | consagrar |",
        "en": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Hospitality Spells table are added to the spell list of your spellcasting class.\n\nMark of Hospitality Spells\n\n| Spell Level | Spells |\n\n| 1st | goodberry, sleep |\n\n| 2nd | aid, calm emotions |\n\n| 3rd | create food and water, Leomund’s tiny hut |\n\n| 4th | aura of purity, Mordenkainen’s private sanctum |\n\n| 5th | hallow |"
      }
    }
  ],
  "dwarf-mark-warding": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Resiliência Anã",
        "en": "Dwarven Resilience"
      },
      "desc": {
        "pt": "Você tem vantagem em salvaguardas contra veneno e tem resistência a dano de veneno.",
        "en": "You have advantage on saving throws against poison, and you have resistance against poison damage."
      }
    },
    {
      "name": {
        "pt": "Treinamento Anão",
        "en": "Dwarven Training"
      },
      "desc": {
        "pt": "Você tem proficiência com o machado de batalha, machadinha, martelo leve e martelo de guerra, e ganha proficiência com um tipo de ferramentas de artesão à sua escolha: ferramentas de ferreiro, suprimentos de cervejeiro ou ferramentas de pedreiro.",
        "en": "You have proficiency with the battleaxe, handaxe, light hammer, and warhammer, and you gain proficiency with one type of artisan’s tools of your choice: smith’s tools, brewer’s supplies, or mason’s tools."
      }
    },
    {
      "name": {
        "pt": "Especialização em Rochas",
        "en": "Stonecunning"
      },
      "desc": {
        "pt": "Sempre que você fizer um teste de Inteligência (História) relacionado à origem de trabalhos em pedra, você é considerado proficiente na perícia História e adiciona o dobro do seu Bônus de Proficiência ao teste, em vez do seu Bônus de Proficiência normal.",
        "en": "Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient in the History skill and add double your proficiency bonus to the check, instead of your normal proficiency bonus."
      }
    },
    {
      "name": {
        "pt": "Intuição do Guardião",
        "en": "Warder's Intuition"
      },
      "desc": {
        "pt": "Quando você faz um teste de Inteligência (Investigação) ou um teste de habilidade usando ferramentas de ladrão, pode rolar um d4 e adicionar o número rolado ao teste de habilidade.",
        "en": "When you make an Intelligence (Investigation) check or an ability check using thieves’ tools, you can roll a d4 and add the number rolled to the ability check."
      }
    },
    {
      "name": {
        "pt": "Proteções e Selos",
        "en": "Wards and Seals"
      },
      "desc": {
        "pt": "Você pode conjurar as magias alarme e armadura arcana com esta característica. A partir do 3º nível, você também pode conjurar a magia tranca arcana com ela. Uma vez que conjurar qualquer uma dessas magias com esta característica, você não pode conjurar essa magia com ela novamente até terminar um Descanso Longo. Inteligência é a sua habilidade de conjuração para essas magias, e você não precisa de componentes materiais para elas ao conjurá-las com esta característica.",
        "en": "You can cast the alarm and mage armor spells with this trait. Starting at 3rd level, you can also cast the arcane lock spell with it. Once you cast any of these spells with this trait, you can’t cast that spell with it again until you finish a long rest. Intelligence is your spellcasting ability for these spells, and you don’t need material components for them when you cast them with this trait."
      }
    },
    {
      "name": {
        "pt": "Magias da Marca",
        "en": "Spells of the Mark"
      },
      "desc": {
        "pt": "Se você tiver a característica de classe Conjuração ou Magia de Pacto, as magias na tabela Magias da Marca da Hospitalidade são adicionadas à lista de magias da sua classe conjuradora.\n\nMagias da Marca da Hospitalidade\n\n| Círculo de Magia | Magias |\n\n| 1º | bom fruto, sono |\n\n| 2º | ajuda, acalmar emoções |\n\n| 3º | criar comida e água, cabana minúscula de Leomund |\n\n| 4º | aura de pureza, santuário particular de Mordenkainen |\n\n| 5º | consagrar |",
        "en": "If you have the Spellcasting or the Pact Magic class feature, the spells on the Mark of Hospitality Spells table are added to the spell list of your spellcasting class.\n\nMark of Hospitality Spells\n\n| Spell Level | Spells |\n\n| 1st | goodberry, sleep |\n\n| 2nd | aid, calm emotions |\n\n| 3rd | create food and water, Leomund’s tiny hut |\n\n| 4th | aura of purity, Mordenkainen’s private sanctum |\n\n| 5th | hallow |"
      }
    }
  ],
  "halfling-ghostwise": [
    {
      "name": {
        "pt": "Sortudo",
        "en": "Lucky"
      },
      "desc": {
        "pt": "Quando você rola um 1 em uma jogada de ataque, teste de atributo ou salvaguarda, pode rolar o dado novamente e deve usar o novo resultado.",
        "en": "When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll."
      }
    },
    {
      "name": {
        "pt": "Bravo",
        "en": "Brave"
      },
      "desc": {
        "pt": "Você tem vantagem em salvaguardas para não ficar amedrontado.",
        "en": "You have advantage on saving throws against being frightened."
      }
    },
    {
      "name": {
        "pt": "Agilidade Halfling",
        "en": "Halfling Nimbleness"
      },
      "desc": {
        "pt": "Você pode se mover através do espaço de qualquer criatura que seja de um tamanho maior que o seu.",
        "en": "You can move through the space of any creature that is of a size larger than yours."
      }
    },
    {
      "name": {
        "pt": "Fala Silenciosa",
        "en": "Silent Speech"
      },
      "desc": {
        "pt": "Você pode falar telepaticamente com qualquer criatura a até 9 metros de você. A criatura compreende você apenas se vocês compartilharem um idioma. Você pode falar telepaticamente desta forma com uma criatura por vez.",
        "en": "You can speak telepathically to any creature within 30 feet of you. The creature understands you only if the two of you share a language. You can speak telepathically in this way to one creature at a time."
      }
    }
  ],
  "halfling-lotusden": [
    {
      "name": {
        "pt": "Sortudo",
        "en": "Lucky"
      },
      "desc": {
        "pt": "Quando você rola um 1 em uma jogada de ataque, teste de atributo ou salvaguarda, pode rolar o dado novamente e deve usar o novo resultado.",
        "en": "When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll."
      }
    },
    {
      "name": {
        "pt": "Bravo",
        "en": "Brave"
      },
      "desc": {
        "pt": "Você tem vantagem em salvaguardas para não ficar amedrontado.",
        "en": "You have advantage on saving throws against being frightened."
      }
    },
    {
      "name": {
        "pt": "Agilidade Halfling",
        "en": "Halfling Nimbleness"
      },
      "desc": {
        "pt": "Você pode se mover através do espaço de qualquer criatura que seja de um tamanho maior que o seu.",
        "en": "You can move through the space of any creature that is of a size larger than yours."
      }
    },
    {
      "name": {
        "pt": "Filho da Floresta",
        "en": "Child of the Wood"
      },
      "desc": {
        "pt": "Você conhece o truque artifício druídico. Quando alcança o 3º nível, você pode conjurar a magia constrição uma vez com esta característica e recupera a capacidade de fazê-lo ao terminar um Descanso Longo. Quando alcança o 5º nível, você pode conjurar a magia crescimento de espinhos uma vez com esta característica e recupera a capacidade de fazê-lo ao terminar um Descanso Longo. Conjurar essas magias com esta característica não requer componentes materiais. Sabedoria é a sua habilidade de conjuração para essas magias.",
        "en": "You know the druidcraft cantrip. When you reach 3rd level, you can cast the entangle spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the spike growth spell once with this trait and regain the ability to do so when you finish a long rest. Casting these spells with this trait doesn’t require material components. Wisdom is your spellcasting ability for these spells."
      }
    },
    {
      "name": {
        "pt": "Caminhar entre Árvores",
        "en": "Timberwalk"
      },
      "desc": {
        "pt": "Testes de habilidade realizados para rastrear você têm Desvantagem, e você pode se mover através de terreno difícil composto por plantas não mágicas e vegetação rasteira sem gastar movimento adicional.",
        "en": "Ability checks made to track you have disadvantage, and you can move across difficult terrain made of nonmagical plants and undergrowth without expending extra movement."
      }
    }
  ],
  "elf-pallid": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Sentidos Apurados",
        "en": "Keen Senses"
      },
      "desc": {
        "pt": "Você tem proficiência na perícia Percepção.",
        "en": "You have proficiency in the Perception skill."
      }
    },
    {
      "name": {
        "pt": "Ancestral Feérico",
        "en": "Fey Ancestry"
      },
      "desc": {
        "pt": "Você tem Vantagem em salvaguardas contra ser Enfeitiçado, e a magia não pode fazer você adormecer.",
        "en": "You have advantage on saving throws against being charmed, and magic can’t put you to sleep."
      }
    },
    {
      "name": {
        "pt": "Transe",
        "en": "Trance"
      },
      "desc": {
        "pt": "Elfos não precisam dormir. Em vez disso, meditam profundamente, permanecendo semiconscientes, por 4 horas por dia. (A palavra em Comum para essa meditação é “transe”.) Enquanto medita, você pode sonhar de certa forma; tais sonhos são, na verdade, exercícios mentais que se tornaram reflexivos através de anos de prática. Depois de descansar dessa forma, você obtém o mesmo benefício que um humano obtém com 8 horas de sono.",
        "en": "Elves don’t need to sleep. Instead, they meditate deeply, remaining semiconscious, for 4 hours a day. (The Common word for such meditation is “trance.”) While meditating, you can dream after a fashion; such dreams are actually mental exercises that have become reflexive through years of practice. After resting in this way, you gain the same benefit that a human does from 8 hours of sleep."
      }
    },
    {
      "name": {
        "pt": "Sentido Incisivo",
        "en": "Incisive Sense"
      },
      "desc": {
        "pt": "Você tem Vantagem em testes de Inteligência (Investigação) e de Sabedoria (Intuição).",
        "en": "You have advantage on Intelligence (Investigation) and Wisdom (Insight) checks."
      }
    },
    {
      "name": {
        "pt": "Bênção da Tecelã Lunar",
        "en": "Blessing of the Moon Weaver"
      },
      "desc": {
        "pt": "Você conhece o truque luz. Quando alcança o 3º nível, você pode conjurar a magia sono uma vez com esta característica e recupera a capacidade de fazê-lo ao terminar um Descanso Longo. Quando alcança o 5º nível, você pode conjurar a magia invisibilidade (visando apenas você mesmo) uma vez com esta característica e recupera a capacidade de fazê-lo ao terminar um Descanso Longo. Conjurar essas magias com esta característica não requer componentes materiais. Sabedoria é a sua habilidade de conjuração para essas magias.",
        "en": "You know the light cantrip. When you reach 3rd level, you can cast the sleep spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the invisibility spell (targeting yourself only) once with this trait and regain the ability to do so when you finish a long rest. Casting these spells with this trait doesn’t require material components. Wisdom is your spellcasting ability for these spells."
      }
    }
  ],
  "half-elf-variant": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Ancestral Feérico",
        "en": "Fey Ancestry"
      },
      "desc": {
        "pt": "Você tem Vantagem em salvaguardas contra ser Enfeitiçado, e a magia não pode fazer você adormecer.",
        "en": "You have advantage on saving throws against being charmed, and magic can’t put you to sleep."
      }
    },
    {
      "name": {
        "pt": "Descendência Élfica",
        "en": "Elven Descent"
      },
      "desc": {
        "pt": "Em vez da característica Versatilidade em Perícias, você pode escolher uma das seguintes características com base na sua herança élfica:\n\n- Herança de Alto Elfo: Você ganha a característica Treinamento com Armas Élficas ou a característica Truque do alto elfo.\n- Herança de Elfo da Floresta: Você ganha a característica Treinamento com Armas Élficas, a característica Passo Ligeiro ou a característica Máscara da Natureza do elfo da floresta.\n- Herança Drow: Você ganha a característica Magia Drow do drow.\n- Herança de Elfo Aquático: Você ganha um deslocamento de natação de 9 metros.",
        "en": "Instead of the Skill Versatility trait, you can choose one of the following traits based on your elven heritage:\n\n- High Elf Heritage: You gain the Elf Weapon Training trait or the Cantrip trait of the high elf.\n- Wood Elf Heritage: You gain the Elf Weapon Training trait, the Fleet of Foot trait, or the Mask of the Wild trait of the wood elf.\n- Drow Heritage: You gain the Drow Magic trait of the drow.\n- Aquatic Elf Heritage: You gain a swimming speed of 30 feet."
      }
    }
  ],
  "dragonborn-draconblood": [
    {
      "name": {
        "pt": "Ancestral Dracônico",
        "en": "Draconic Ancestry"
      },
      "desc": {
        "pt": "Você possui ancestralidade dracônica. Escolha um tipo de dragão na tabela Ancestralidade Dracônica. Sua arma de sopro e resistência a dano são determinadas pelo tipo de dragão, como mostrado na tabela.\n\nANCESTRALIDADE DRACÔNICA\n\n| Dragão | Tipo de Dano | Arma de Sopro |\n\n| Negro | Ácido | Linha de 1,5 por 9 m (salvaguarda de Des.) |\n\n| Azul | Elétrico | Linha de 1,5 por 9 m (salvaguarda de Des.) |\n\n| Latão | Fogo | Linha de 1,5 por 9 m (salvaguarda de Des.) |\n\n| Bronze | Elétrico | Linha de 1,5 por 9 m (salvaguarda de Des.) |\n\n| Cobre | Ácido | Linha de 1,5 por 9 m (salvaguarda de Des.) |\n\n| Ouro | Fogo | Cone de 4,5 m (salvaguarda de Des.) |\n\n| Verde | Veneno | Cone de 4,5 m (salvaguarda de Con.) |\n\n| Vermelho | Fogo | Cone de 4,5 m (salvaguarda de Des.) |\n\n| Prata | Frio | Cone de 4,5 m (salvaguarda de Con.) |\n\n| Branco | Frio | Cone de 4,5 m (salvaguarda de Con.) |",
        "en": "You have draconic ancestry. Choose one type of dragon from the Draconic Ancestry table. Your breath weapon and damage resistance are determined by the dragon type, as shown in the table.\n\nDRACONIC ANCESTRY\n\n| Dragon | Damage Type | Breath Weapon |\n\n| Black | Acid | 5 by 30 ft. line (Dex. save) |\n\n| Blue | Lightning | 5 by 30 ft. line (Dex. save) |\n\n| Brass | Fire | 5 by 30 ft. line (Dex. save) |\n\n| Bronze | Lightning | 5 by 30 ft. line (Dex. save) |\n\n| Copper | Acid | 5 by 30 ft. line (Dex. save) |\n\n| Gold | Fire | 15 ft. cone (Dex. save) |\n\n| Green | Poison | 15 ft. cone (Con. save) |\n\n| Red | Fire | 15 ft. cone (Dex. save) |\n\n| Silver | Cold | 15 ft. cone (Con. save) |\n\n| White | Cold | 15 ft. cone (Con. save) |"
      }
    },
    {
      "name": {
        "pt": "Arma de Sopro",
        "en": "Breath Weapon"
      },
      "desc": {
        "pt": "Você pode usar sua Ação para exalar energia destrutiva. Sua ancestralidade dracônica determina o tamanho, formato e tipo de dano da exalação.\n\nQuando você usa sua arma de sopro, cada criatura na área da exalação deve fazer uma salvaguarda, cujo tipo é determinado pela sua ancestralidade dracônica. A CD para esta salvaguarda é igual a 8 + seu modificador de Constituição + seu Bônus de Proficiência. Uma criatura sofre 2d6 de dano se falhar na salvaguarda e metade desse dano se obtiver sucesso. O dano aumenta para 3d6 no 6º nível, 4d6 no 11º nível e 5d6 no 16º nível.\n\nDepois de usar sua arma de sopro, você não pode usá-la novamente até concluir um Descanso Curto ou Longo.",
        "en": "You can use your action to exhale destructive energy. Your draconic ancestry determines the size, shape, and damage type of the exhalation.\n\nWhen you use your breath weapon, each creature in the area of the exhalation must make a saving throw, the type of which is determined by your draconic ancestry. The DC for this saving throw equals 8 + your Constitution modifier + your proficiency bonus. A creature takes 2d6 damage on a failed save, and half as much damage on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level.\n\nAfter you use your breath weapon, you can’t use it again until you complete a short or long rest."
      }
    },
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Presença Imponente",
        "en": "Forceful Presence"
      },
      "desc": {
        "pt": "Você pode usar sua compreensão de diplomacia criativa ou intimidação para direcionar uma conversa a seu favor. Quando você faz um teste de Carisma (Intimidação ou Persuasão), pode fazê-lo com Vantagem. Depois de usar esta característica, você não pode fazê-lo novamente até terminar um Descanso Curto ou Longo.",
        "en": "You can use your understanding of creative diplomacy or intimidation to guide a conversation in your favor. When you make a Charisma (Intimidation or Persuasion) check, you can do so with advantage. Once you use this trait you can’t do so again until you finish a short or long rest."
      }
    }
  ],
  "dragonborn-ravenite": [
    {
      "name": {
        "pt": "Ancestral Dracônico",
        "en": "Draconic Ancestry"
      },
      "desc": {
        "pt": "Você possui ancestralidade dracônica. Escolha um tipo de dragão na tabela Ancestralidade Dracônica. Sua arma de sopro e resistência a dano são determinadas pelo tipo de dragão, como mostrado na tabela.\n\nANCESTRALIDADE DRACÔNICA\n\n| Dragão | Tipo de Dano | Arma de Sopro |\n\n| Negro | Ácido | Linha de 1,5 por 9 m (salvaguarda de Des.) |\n\n| Azul | Elétrico | Linha de 1,5 por 9 m (salvaguarda de Des.) |\n\n| Latão | Fogo | Linha de 1,5 por 9 m (salvaguarda de Des.) |\n\n| Bronze | Elétrico | Linha de 1,5 por 9 m (salvaguarda de Des.) |\n\n| Cobre | Ácido | Linha de 1,5 por 9 m (salvaguarda de Des.) |\n\n| Ouro | Fogo | Cone de 4,5 m (salvaguarda de Des.) |\n\n| Verde | Veneno | Cone de 4,5 m (salvaguarda de Con.) |\n\n| Vermelho | Fogo | Cone de 4,5 m (salvaguarda de Des.) |\n\n| Prata | Frio | Cone de 4,5 m (salvaguarda de Con.) |\n\n| Branco | Frio | Cone de 4,5 m (salvaguarda de Con.) |",
        "en": "You have draconic ancestry. Choose one type of dragon from the Draconic Ancestry table. Your breath weapon and damage resistance are determined by the dragon type, as shown in the table.\n\nDRACONIC ANCESTRY\n\n| Dragon | Damage Type | Breath Weapon |\n\n| Black | Acid | 5 by 30 ft. line (Dex. save) |\n\n| Blue | Lightning | 5 by 30 ft. line (Dex. save) |\n\n| Brass | Fire | 5 by 30 ft. line (Dex. save) |\n\n| Bronze | Lightning | 5 by 30 ft. line (Dex. save) |\n\n| Copper | Acid | 5 by 30 ft. line (Dex. save) |\n\n| Gold | Fire | 15 ft. cone (Dex. save) |\n\n| Green | Poison | 15 ft. cone (Con. save) |\n\n| Red | Fire | 15 ft. cone (Dex. save) |\n\n| Silver | Cold | 15 ft. cone (Con. save) |\n\n| White | Cold | 15 ft. cone (Con. save) |"
      }
    },
    {
      "name": {
        "pt": "Arma de Sopro",
        "en": "Breath Weapon"
      },
      "desc": {
        "pt": "Você pode usar sua Ação para exalar energia destrutiva. Sua ancestralidade dracônica determina o tamanho, formato e tipo de dano da exalação.\n\nQuando você usa sua arma de sopro, cada criatura na área da exalação deve fazer uma salvaguarda, cujo tipo é determinado pela sua ancestralidade dracônica. A CD para esta salvaguarda é igual a 8 + seu modificador de Constituição + seu Bônus de Proficiência. Uma criatura sofre 2d6 de dano se falhar na salvaguarda e metade desse dano se obtiver sucesso. O dano aumenta para 3d6 no 6º nível, 4d6 no 11º nível e 5d6 no 16º nível.\n\nDepois de usar sua arma de sopro, você não pode usá-la novamente até concluir um Descanso Curto ou Longo.",
        "en": "You can use your action to exhale destructive energy. Your draconic ancestry determines the size, shape, and damage type of the exhalation.\n\nWhen you use your breath weapon, each creature in the area of the exhalation must make a saving throw, the type of which is determined by your draconic ancestry. The DC for this saving throw equals 8 + your Constitution modifier + your proficiency bonus. A creature takes 2d6 damage on a failed save, and half as much damage on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level.\n\nAfter you use your breath weapon, you can’t use it again until you complete a short or long rest."
      }
    },
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Visão no escuro com alcance de 18 metros.",
        "en": "Darkvision with a range of 60 feet."
      }
    },
    {
      "name": {
        "pt": "Ataque Vingativo",
        "en": "Vengeful Assault"
      },
      "desc": {
        "pt": "Quando você sofre dano de uma criatura ao alcance de uma arma que você esteja empunhando, pode usar sua Reação para fazer um ataque com a arma contra a criatura. Depois de usar esta característica, você não pode fazê-lo novamente até terminar um Descanso Curto ou Longo.",
        "en": "When you take damage from a creature in range of a weapon you are wielding, you can use your reaction to make an attack with the weapon against the creature. Once you use this trait, you can’t do so again until you finish a short or long rest."
      }
    }
  ]
};
for (const r of RACES) {
  if (SUBRACE_TRAITS_1TO1[r.id]) {
    r.traits = SUBRACE_TRAITS_1TO1[r.id].map((t, i) => ({
      ...(r.traits[i]?.level ? { level: r.traits[i].level } : {}),
      name: t.name,
      desc: t.desc,
    }));
  }
}

export const SUBRACES_2014 = RACES;
export const SUBRACE_EFFECTS_2014 = EFFECTS;
export const SUBRACE_RESOURCES_2014 = RESOURCES;

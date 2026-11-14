/* Espécies: traços revisados (2024) e escolhas de espécie (2024 e 2014).
 *
 * Os traços de 2024 substituem o texto extraído do PDF em srd2024-species.json
 * (aplicados em rules2024.js). São resumos próprios do SRD 5.2.1 (CC-BY 4.0);
 * o Aasimar vem do Player's Handbook (2024) e é um resumo original, não texto do livro.
 *
 * Escolhas (`choices`) ficam em char.speciesChoices; o motor é
 * src/progression/species.js. Formato de uma escolha:
 *   { key, label, options?: [{ id, name, desc?, ...efeitos }], from?: [ids], count?, when?: { chave: valor } }
 * Efeitos de espécie/opção: { darkvision, speed, resist: [], cantrips: [], spells: { nível: [ids] }, skills: [],
 *   fixedSpellAbility?, spellUses?: { id: 'short' | 'atWill' | 'profBonus' } }.
 * spellUses: magias que não seguem o padrão (truque à vontade; magia 1× por descanso
 * longo sem espaço), ex.: Magia Firbolg 1× por descanso curto; Falar com Animais do
 * Gnomo da Floresta 2024, bônus de proficiência vezes por descanso longo.
 * Chaves especiais: 'feat' (talento em char.feats com origin: 'species'),
 * 'asi' (bônus de atributo da espécie, `pattern`), 'cantrip' (truque de uma lista).
 */
import { SUBRACE_EFFECTS_2014 } from './subraces-2014.js';

const b = (pt, en) => ({ pt, en });
const T = (pt, en, dpt, den, extra = {}) => ({ name: b(pt, en), desc: b(dpt, den), ...extra });

const SPELL_ABILITY = { key: 'spellAbility', label: b('Atributo de conjuração', 'Spellcasting ability'), from: ['int', 'wis', 'cha'] };
const SIZE = { key: 'size', label: b('Tamanho', 'Size'), options: [
  { id: 'Medium', name: b('Médio', 'Medium') }, { id: 'Small', name: b('Pequeno', 'Small') },
] };
const DARKVISION = (ft) => T('Visão no Escuro', 'Darkvision', `Você enxerga na penumbra a até ${String(ft * 0.3).replace('.', ',')} m como se fosse luz plena, e no escuro como se fosse penumbra (sem cores).`, `You see in dim light within ${ft} feet as if it were bright light, and in darkness as if it were dim light (no colors).`);

const DRAGONS = [
  ['black', 'Preto', 'Black', 'acid'], ['blue', 'Azul', 'Blue', 'lightning'], ['brass', 'Latão', 'Brass', 'fire'],
  ['bronze', 'Bronze', 'Bronze', 'lightning'], ['copper', 'Cobre', 'Copper', 'acid'], ['gold', 'Ouro', 'Gold', 'fire'],
  ['green', 'Verde', 'Green', 'poison'], ['red', 'Vermelho', 'Red', 'fire'], ['silver', 'Prata', 'Silver', 'cold'],
  ['white', 'Branco', 'White', 'cold'],
];
/** Nomes das ferramentas que raças podem conceder (mesmos ids de src/creator/start-data.js TOOLS). */
export const RACE_TOOL_NAMES = {
  alchemistsSupplies: b('Suprimentos de Alquimista', "Alchemist's Supplies"),
  brewersSupplies: b('Suprimentos de Cervejeiro', "Brewer's Supplies"),
  calligraphersSupplies: b('Suprimentos de Calígrafo', "Calligrapher's Supplies"),
  carpentersTools: b('Ferramentas de Carpinteiro', "Carpenter's Tools"),
  cartographersTools: b('Ferramentas de Cartógrafo', "Cartographer's Tools"),
  cobblersTools: b('Ferramentas de Sapateiro', "Cobbler's Tools"),
  cooksUtensils: b('Utensílios de Cozinheiro', "Cook's Utensils"),
  glassblowersTools: b('Ferramentas de Vidreiro', "Glassblower's Tools"),
  jewelersTools: b('Ferramentas de Joalheiro', "Jeweler's Tools"),
  leatherworkersTools: b('Ferramentas de Coureiro', "Leatherworker's Tools"),
  masonsTools: b('Ferramentas de Pedreiro', "Mason's Tools"),
  paintersSupplies: b('Suprimentos de Pintor', "Painter's Supplies"),
  pottersTools: b('Ferramentas de Oleiro', "Potter's Tools"),
  smithsTools: b('Ferramentas de Ferreiro', "Smith's Tools"),
  tinkersTools: b('Ferramentas de Funileiro', "Tinker's Tools"),
  weaversTools: b('Ferramentas de Tecelão', "Weaver's Tools"),
  woodcarversTools: b('Ferramentas de Entalhador', "Woodcarver's Tools"),
  bagpipes: b('Gaita de Foles', 'Bagpipes'),
  drum: b('Tambor', 'Drum'),
  dulcimer: b('Saltério', 'Dulcimer'),
  flute: b('Flauta', 'Flute'),
  horn: b('Trompa', 'Horn'),
  lute: b('Alaúde', 'Lute'),
  lyre: b('Lira', 'Lyre'),
  panFlute: b('Flauta de Pã', 'Pan Flute'),
  shawm: b('Charamela', 'Shawm'),
  viol: b('Viola', 'Viol'),
  diceSet: b('Dados', 'Dice'),
  dragonchessSet: b('Xadrez de Dragão', 'Dragonchess'),
  playingCardSet: b('Cartas de Baralho', 'Playing Cards'),
  threeDragonAnteSet: b('Ante dos Três Dragões', 'Three-Dragon Ante'),
  disguiseKit: b('Kit de Disfarce', 'Disguise Kit'),
  forgeryKit: b('Kit de Falsificação', 'Forgery Kit'),
  herbalismKit: b('Kit de Herbalismo', 'Herbalism Kit'),
  navigatorsTools: b('Ferramentas de Navegador', "Navigator's Tools"),
  poisonersKit: b('Kit de Envenenador', "Poisoner's Kit"),
  thievesTools: b('Ferramentas de Ladrão', "Thieves' Tools"),
};
const ARTISAN_TOOL_IDS = [
  'alchemistsSupplies', 'brewersSupplies', 'calligraphersSupplies', 'carpentersTools', 'cartographersTools',
  'cobblersTools', 'cooksUtensils', 'glassblowersTools', 'jewelersTools', 'leatherworkersTools', 'masonsTools',
  'paintersSupplies', 'pottersTools', 'smithsTools', 'tinkersTools', 'weaversTools', 'woodcarversTools',
];
const INSTRUMENT_IDS = ['bagpipes', 'drum', 'dulcimer', 'flute', 'horn', 'lute', 'lyre', 'panFlute', 'shawm', 'viol'];
const ALL_TOOL_IDS = [
  ...ARTISAN_TOOL_IDS, ...INSTRUMENT_IDS,
  'diceSet', 'dragonchessSet', 'playingCardSet', 'threeDragonAnteSet',
  'disguiseKit', 'forgeryKit', 'herbalismKit', 'navigatorsTools', 'poisonersKit', 'thievesTools',
];
export const DAMAGE_NAMES = {
  acid: b('Ácido', 'Acid'), cold: b('Frio', 'Cold'), fire: b('Fogo', 'Fire'), lightning: b('Elétrico', 'Lightning'),
  poison: b('Veneno', 'Poison'), necrotic: b('Necrótico', 'Necrotic'), radiant: b('Radiante', 'Radiant'), thunder: b('Trovejante', 'Thunder'),
};
// Frase do tipo de dano em pt (adjetivos não levam "de": "Dano elétrico", mas "Dano de fogo").
const DAMAGE_PHRASE_PT = { acid: 'Dano ácido', lightning: 'Dano elétrico', necrotic: 'Dano necrótico', radiant: 'Dano radiante', thunder: 'Dano trovejante' };
const DRACONIC_ANCESTRY = {
  key: 'ancestry', label: b('Ancestral dracônico', 'Draconic ancestor'),
  options: DRAGONS.map(([id, pt, en, dmg]) => ({ id, name: b(pt, en), damage: dmg, resist: [dmg],
    desc: b(`${DAMAGE_PHRASE_PT[dmg] || `Dano de ${DAMAGE_NAMES[dmg].pt.toLowerCase()}`}.`, `${DAMAGE_NAMES[dmg].en} damage.`) })),
};

// ---------------------------------------------------------------------------
// 2024 (SRD 5.2.1 + Aasimar do PHB 2024)
// ---------------------------------------------------------------------------
export const SPECIES_2024_REVISED = {
  dragonborn: {
    size: 'Medium', speed: 30, darkvision: 60,
    traits: [
      {
        "name": {
          "pt": "Ancestral Dracônica",
          "en": "Draconic Ancestry"
        },
        "desc": {
          "pt": "Sua linhagem provém de um progenitor dragão. Escolha o tipo de dragão na tabela Ancestrais Dracônicos. Sua escolha afeta suas características Arma de Sopro e Resistência a Dano, assim como sua aparência.\nAncestrais Dracônicos\n| Dragão | Tipo de Dano | | Dragão | Tipo de Dano |\n| :--------- | :-------------- | :--- | :--------- | :-------------- |\n| Negro | Ácido | | Ouro | Fogo |\n| Azul | Elétrico | | Verde | Veneno |\n| Latão | Fogo | | Vermelho | Fogo |\n| Bronze | Elétrico | | Prata | Frio |\n| Cobre | Ácido | | Branco | Frio |",
          "en": "Your lineage stems from a dragon progenitor. Choose the kind of dragon from the Draconic Ancestors table. Your choice affects your Breath Weapon and Damage Resistance traits as well as your appearance.\nDraconic Ancestors\n| Dragon | Damage Type | | Dragon | Damage Type |\n| :--------- | :-------------- | :--- | :--------- | :-------------- |\n| Black | Acid | | Gold | Fire |\n| Blue | Lightning | | Green | Poison |\n| Brass | Fire | | Red | Fire |\n| Bronze | Lightning | | Silver | Cold |\n| Copper | Acid | | White | Cold |"
        }
      },
      {
        "name": {
          "pt": "Arma de Sopro",
          "en": "Breath Weapon"
        },
        "desc": {
          "pt": "Quando você realiza a ação de Ataque no seu turno, você pode substituir um dos seus ataques por uma exalação de energia mágica em um Cone de 4,5 metros ou uma Linha de 9 metros com 1,5 metro de largura (escolha a forma a cada vez). Cada criatura nessa área deve fazer uma salvaguarda de Destreza (CD 8 mais seu modificador de Constituição e seu Bônus de Proficiência). Se falhar na salvaguarda, a criatura sofre 1d10 de dano do tipo determinado pela sua característica Ancestralidade Dracônica. Se tiver sucesso na salvaguarda, a criatura sofre metade desse dano. Esse dano aumenta em 1d10 quando você atinge os níveis de personagem 5 (2d10), 11 (3d10) e 17 (4d10).\nVocê pode usar esta Arma de Sopro um número de vezes igual ao seu Bônus de Proficiência, e você recupera todos os usos gastos ao terminar um Descanso Longo.",
          "en": "When you take the Attack action on your turn, you can replace one of your attacks with an exhalation of magical energy in either a 15-foot Cone or a 30-foot Line that is 5 feet wide (choose the shape each time). Each creature in that area must make a Dexterity saving throw (DC 8 plus your Constitution modifier and Proficiency Bonus). On a failed save, a creature takes 1d10 damage of the type determined by your Draconic Ancestry trait. On a successful save, a creature takes half as much damage. This damage increases by 1d10 when you reach character levels 5 (2d10), 11 (3d10), and 17 (4d10).\nYou can use this Breath Weapon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest."
        }
      },
      {
        "name": {
          "pt": "Resistência a Dano",
          "en": "Damage Resistance"
        },
        "desc": {
          "pt": "Você tem Resistência ao tipo de dano determinado pela sua característica Ancestralidade Dracônica.",
          "en": "You have Resistance to the damage type determined by your Draconic Ancestry trait."
        }
      },
      {
        "name": {
          "pt": "Visão no Escuro",
          "en": "Darkvision"
        },
        "desc": {
          "pt": "Você tem Visão no Escuro com alcance de 18 metros.",
          "en": "You have Darkvision with a range of 60 feet."
        }
      },
      {
        "level": 5,
        "name": {
          "pt": "Voo Dracônico",
          "en": "Draconic Flight"
        },
        "desc": {
          "pt": "Quando você atinge o 5º nível de personagem, você pode canalizar magia dracônica para conceder a si mesmo voo temporário. Como uma Ação Bônus, você faz brotar asas espectrais em suas costas que duram por 10 minutos ou até você recolher as asas (nenhuma ação necessária) ou ficar com a condição Incapacitado. Durante esse tempo, você tem um Deslocamento de Voo igual ao seu Deslocamento. Suas asas aparentam ser feitas da mesma energia que a sua Arma de Sopro. Uma vez que usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.",
          "en": "When you reach character level 5, you can channel draconic magic to give yourself temporary flight. As a Bonus Action, you sprout spectral wings on your back that last for 10 minutes or until you retract the wings (no action required) or have the Incapacitated condition. During that time, you have a Fly Speed equal to your Speed. Your wings appear to be made of the same energy as your Breath Weapon. Once you use this trait, you can't use it again until you finish a Long Rest."
        }
      }
    ],
    choices: [DRACONIC_ANCESTRY],
  },
  dwarf: {
    size: 'Medium', speed: 30, darkvision: 120, resist: ['poison'],
    traits: [
      {
        "name": {
          "pt": "Visão no Escuro",
          "en": "Darkvision"
        },
        "desc": {
          "pt": "Você tem Visão no Escuro com alcance de 36 metros.",
          "en": "You have Darkvision with a range of 120 feet."
        }
      },
      {
        "name": {
          "pt": "Resiliência Anã",
          "en": "Dwarven Resilience"
        },
        "desc": {
          "pt": "Você tem Resistência a dano de Veneno. Você também tem Vantagem em salvaguardas que fizer para evitar ou encerrar a condição Envenenado.",
          "en": "You have Resistance to Poison damage. You also have Advantage on saving throws you make to avoid or end the Poisoned condition."
        }
      },
      {
        "name": {
          "pt": "Robustez Anã",
          "en": "Dwarven Toughness"
        },
        "desc": {
          "pt": "Seu máximo de Pontos de Vida aumenta em 1, e aumenta em 1 novamente sempre que você ganha um nível.",
          "en": "Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level."
        }
      },
      {
        "name": {
          "pt": "Especialização em Rochas",
          "en": "Stonecunning"
        },
        "desc": {
          "pt": "Como uma Ação Bônus, você ganha Sentido Sísmico com alcance de 18 metros por 10 minutos. Você deve estar em uma superfície de pedra ou tocando uma superfície de pedra para usar este Sentido Sísmico. A pedra pode ser natural ou trabalhada.\nVocê pode usar esta Ação Bônus um número de vezes igual ao seu Bônus de Proficiência, e você recupera todos os usos gastos ao terminar um Descanso Longo.",
          "en": "As a Bonus Action, you gain Tremorsense with a range of 60 feet for 10 minutes. You must be on a stone surface or touching a stone surface to use this Tremorsense. The stone can be natural or worked.\nYou can use this Bonus Action a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest."
        }
      }
    ],
  },
  elf: {
    size: 'Medium', speed: 30, darkvision: 60,
    traits: [
      {
        "name": {
          "pt": "Visão no Escuro",
          "en": "Darkvision"
        },
        "desc": {
          "pt": "Você tem Visão no Escuro com alcance de 18 metros.",
          "en": "You have Darkvision with a range of 60 feet."
        }
      },
      {
        "name": {
          "pt": "Linhagem Élfica",
          "en": "Elven Lineage"
        },
        "desc": {
          "pt": "Você faz parte de uma linhagem que concede habilidades sobrenaturais. Escolha uma linhagem na tabela Linhagens Élficas. Você ganha o benefício de 1º nível dessa linhagem.\nQuando você atinge os níveis de personagem 3 e 5, você aprende uma magia de círculo superior, conforme mostrado na tabela. Você sempre tem essa magia preparada. Você pode conjurá-la uma vez sem gastar um espaço de magia, e você recupera a habilidade de conjurá-la dessa forma ao terminar um Descanso Longo. Você também pode conjurar a magia usando quaisquer espaços de magia que tiver do círculo apropriado.\nLinhagens Élficas\n| Linhagem | 1º Nível | 3º Nível | 5º Nível |\n| :------- | :----------------------------------------------------------- | :----------- | :----------------- |\n| Drow | O alcance da sua Visão no Escuro aumenta para 36 metros. Você também conhece o truque *Luzes Dançantes*. | Fogo das Fadas | Escuridão |\n| Alto Elfo | Você conhece o truque *Prestidigitação*. Sempre que terminar um Descanso Longo, você pode substituir esse truque por um truque diferente da lista de magias de Mago. | Detectar Magia | Passo Nebuloso |\n| Elfo da Floresta | Seu Deslocamento aumenta para 10,5 metros. Você também conhece o truque *Artifício Druídico*. | Passos Longos | Passos Sem Pegadas |\nInteligência, Sabedoria ou Carisma é a sua habilidade de conjuração para as magias que você conjura com esta característica (escolha a habilidade ao selecionar a linhagem).",
          "en": "You are part of a lineage that grants you supernatural abilities. Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage.\nWhen you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table. You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level.\nElven Lineages\n| Lineage | Level 1 | Level 3 | Level 5 |\n| :------- | :----------------------------------------------------------- | :----------- | :----------------- |\n| Drow | The range of your Darkvision increases to 120 feet. You also know the *Dancing Lights* cantrip. | Faerie Fire | Darkness |\n| High Elf | You know the *Prestidigitation* cantrip. Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list. | Detect Magic | Misty Step |\n| Wood Elf | Your Speed increases to 35 feet. You also know the Druidcraft cantrip. | Longstrider | Pass without Trace |\nIntelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage)."
        }
      },
      {
        "name": {
          "pt": "Ancestral Feérico",
          "en": "Fey Ancestry"
        },
        "desc": {
          "pt": "Você tem Vantagem em salvaguardas que fizer para evitar ou encerrar a condição Enfeitiçado.",
          "en": "You have Advantage on saving throws you make to avoid or end the Charmed condition."
        }
      },
      {
        "name": {
          "pt": "Sentidos Apurados",
          "en": "Keen Senses"
        },
        "desc": {
          "pt": "Você tem proficiência na perícia Intuição, Percepção ou Sobrevivência.",
          "en": "You have proficiency in the Insight, Perception, or Survival skill."
        }
      },
      {
        "name": {
          "pt": "Transe",
          "en": "Trance"
        },
        "desc": {
          "pt": "Você não precisa dormir, e magia não pode colocá-lo para dormir. Você pode terminar um Descanso Longo em 4 horas se passar essas horas em uma meditação semelhante a um transe, durante a qual permanece consciente.",
          "en": "You don't need to sleep, and magic can't put you to sleep. You can finish a Long Rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness."
        }
      }
    ],
    choices: [
      { key: 'lineage', label: b('Linhagem élfica', 'Elven lineage'), options: [
        { id: 'drow', name: b('Drow', 'Drow'), darkvision: 120, cantrips: ['dancingLights'], spells: { 3: ['faerieFire'], 5: ['darkness'] },
          desc: b('Visão no escuro sobe para 36 m.', 'Darkvision increases to 120 feet.') },
        { id: 'high', name: b('Alto Elfo', 'High Elf'), cantrips: [], spells: { 3: ['detectMagic'], 5: ['mistyStep'] },
          desc: b('Um truque de Mago (Prestidigitação por padrão), que pode ser trocado por outro truque de Mago a cada descanso longo.', 'One Wizard cantrip (Prestidigitation by default), which you can swap for another Wizard cantrip on each Long Rest.') },
        { id: 'wood', name: b('Elfo da Floresta', 'Wood Elf'), speed: 35, cantrips: ['druidcraft'], spells: { 3: ['longstrider'], 5: ['passWithoutTrace'] },
          desc: b('Deslocamento sobe para 10,5 m.', 'Speed increases to 35 feet.') },
      ] },
      { key: 'cantrip', label: b('Truque de Mago', 'Wizard cantrip'), list: 'wizard', default: 'prestidigitation', when: { lineage: 'high' } },
      SPELL_ABILITY,
      { key: 'skill', label: b('Sentidos Aguçados', 'Keen Senses'), from: ['insight', 'perception', 'survival'] },
    ],
  },
  gnome: {
    size: 'Small', speed: 30, darkvision: 60,
    traits: [
      {
        "name": {
          "pt": "Visão no Escuro",
          "en": "Darkvision"
        },
        "desc": {
          "pt": "Você tem Visão no Escuro com alcance de 18 metros.",
          "en": "You have Darkvision with a range of 60 feet."
        }
      },
      {
        "name": {
          "pt": "Astúcia Gnômica",
          "en": "Gnomish Cunning"
        },
        "desc": {
          "pt": "Você tem Vantagem em salvaguardas de Inteligência, Sabedoria e Carisma.",
          "en": "You have Advantage on Intelligence, Wisdom, and Charisma saving throws."
        }
      },
      {
        "name": {
          "pt": "Linhagem Gnômica",
          "en": "Gnomish Lineage"
        },
        "desc": {
          "pt": "Você faz parte de uma linhagem que concede habilidades sobrenaturais. Escolha uma das seguintes opções; qualquer que escolha, Inteligência, Sabedoria ou Carisma é a sua habilidade de conjuração para as magias que você conjura com esta característica (escolha a habilidade ao selecionar a linhagem):\nGnomo da Floresta. Você conhece o truque *Ilusão Menor*. Você também sempre tem a magia *Falar com Animais* preparada. Você pode conjurá-la sem um espaço de magia um número de vezes igual ao seu Bônus de Proficiência, e você recupera todos os usos gastos ao terminar um Descanso Longo. Você também pode usar quaisquer espaços de magia que possuir para conjurar a magia.\nGnomo das Rochas. Você conhece os truques *Conserto* e *Prestidigitação*. Além disso, você pode gastar 10 minutos conjurando *Prestidigitação* para criar um dispositivo mecânico Miúdo (CA 5, 1 PV), como um brinquedo, acendedor de fogo ou caixa de música. Ao criar o dispositivo, você determina sua função escolhendo um efeito de *Prestidigitação*; o dispositivo produz esse efeito sempre que você ou outra criatura realizar uma Ação Bônus para ativá-lo com um toque. Se o efeito escolhido tiver opções internas, você escolhe uma dessas opções para o dispositivo ao criá-lo.\nPor exemplo, se você escolher o efeito acender-apagar da magia, você determina se o dispositivo acende ou apaga o fogo; o dispositivo não faz ambos. Você pode ter até três dispositivos desse tipo existindo ao mesmo tempo, e cada um se desfaz 8 horas após sua criação ou quando você o desmontar com um toque como uma ação de Utilizar.",
          "en": "You are part of a lineage that grants you supernatural abilities. Choose one of the following options; whichever one you choose, Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage):\nForest Gnome. You know the *Minor Illusion* cantrip. You also always have the *Speak with Animals* spell prepared. You can cast it without a spell slot a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest. You can also use any spell slots you have to cast the spell.\nRock Gnome. You know the *Mending* and *Prestidigitation* cantrips. In addition, you can spend 10 minutes casting *Prestidigitation* to create a Tiny clockwork device (AC 5, 1 HP), such as a toy, fire starter, or music box. When you create the device, you determine its function by choosing one effect from *Prestidigitation* ; the device produces that effect whenever you or another creature takes a Bonus Action to activate it with a touch. If the chosen effect has options within it, you choose one of those options for the device when you create it.\nFor example, if you choose the spell's ignite-extinguish effect, you determine whether the device ignites or extinguishes fire; the device doesn't do both. You can have three such devices in existence at a time, and each falls apart 8 hours after its creation or when you dismantle it with a touch as a Utilize action."
        }
      }
    ],
    choices: [
      { key: 'lineage', label: b('Linhagem gnômica', 'Gnomish lineage'), options: [
        { id: 'forest', name: b('Gnomo da Floresta', 'Forest Gnome'), cantrips: ['minorIllusion'], spells: { 1: ['speakWithAnimals'] }, spellUses: { speakWithAnimals: 'profBonus' },
          desc: b('Falar com Animais fica sempre preparada; conjure-a sem espaço um número de vezes igual ao bônus de proficiência por descanso longo (ou com seus espaços).', 'Speak with Animals is always prepared; cast it without a slot a number of times equal to your Proficiency Bonus per Long Rest (or with your slots).') },
        { id: 'rock', name: b('Gnomo das Rochas', 'Rock Gnome'), cantrips: ['mending', 'prestidigitation'],
          desc: b('Gastando 10 minutos com Prestidigitação, crie um dispositivo mecânico Miúdo (CA 5, 1 PV) com um efeito dessa magia, ativado por ação bônus com um toque. Até três ao mesmo tempo; cada um dura 8 horas.', 'Spending 10 minutes casting Prestidigitation, build a Tiny clockwork device (AC 5, 1 HP) holding one of that spell\'s effects, activated with a touch as a Bonus Action. Up to three at a time; each lasts 8 hours.') },
      ] },
      SPELL_ABILITY,
    ],
  },
  goliath: {
    size: 'Medium', speed: 35,
    traits: [
      {
        "name": {
          "pt": "Ancestralidade Gigante",
          "en": "Giant Ancestry"
        },
        "desc": {
          "pt": "Você descende de Gigantes. Escolha um dos seguintes benefícios — uma dádiva sobrenatural de sua ancestralidade; você pode usar o benefício escolhido um número de vezes igual ao seu Bônus de Proficiência, e recupera todos os usos gastos ao terminar um Descanso Longo:\nSalto das Nuvens (Gigante das Nuvens). Como uma Ação Bônus, você se teletransporta magicamente até 9 metros para um espaço desocupado que possa ver.\nQueimadura do Fogo (Gigante do Fogo). Quando você atinge um alvo com uma jogada de ataque e causa dano a ele, você também pode causar 1d10 de dano de Fogo a esse alvo.\nCalafrio do Gelo (Gigante do Gelo). Quando você atinge um alvo com uma jogada de ataque e causa dano a ele, você também pode causar 1d6 de dano de Frio a esse alvo e reduzir o Deslocamento dele em 3 metros até o início do seu próximo turno.\nTombo da Colina (Gigante da Colina). Quando você atinge uma criatura Grande ou menor com uma jogada de ataque e causa dano a ela, você pode deixar esse alvo com a condição Caído.\nResistência da Pedra (Gigante da Pedra). Quando você sofre dano, você pode usar uma Reação para rolar 1d12. Adicione seu modificador de Constituição ao número rolado e reduza o dano por esse total.\nTrovão da Tempestade (Gigante da Tempestade). Quando você sofre dano de uma criatura a até 18 metros de você, você pode usar uma Reação para causar 1d8 de dano Trovejante a essa criatura.",
          "en": "You are descended from Giants. Choose one of the following benefits--a supernatural boon from your ancestry; you can use the chosen benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest:\nCloud's Jaunt (Cloud Giant). As a Bonus Action, you magically teleport up to 30 feet to an unoccupied space you can see.\nFire's Burn (Fire Giant). When you hit a target with an attack roll and deal damage to it, you can also deal 1d10 Fire damage to that target.\nFrost's Chill (Frost Giant). When you hit a target with an attack roll and deal damage to it, you can also deal 1d6 Cold damage to that target and reduce its Speed by 10 feet until the start of your next turn.\nHill's Tumble (Hill Giant). When you hit a Large or smaller creature with an attack roll and deal damage to it, you can give that target the Prone condition.\nStone's Endurance (Stone Giant). When you take damage, you can take a Reaction to roll 1d12. Add your Constitution modifier to the number rolled and reduce the damage by that total.\nStorm's Thunder (Storm Giant). When you take damage from a creature within 60 feet of you, you can take a Reaction to deal 1d8 Thunder damage to that creature."
        }
      },
      {
        "level": 5,
        "name": {
          "pt": "Forma Grande",
          "en": "Large Form"
        },
        "desc": {
          "pt": "A partir do 5º nível de personagem, você pode mudar seu tamanho para Grande como uma Ação Bônus se estiver em um espaço grande o suficiente. Esta transformação dura 10 minutos ou até você encerrá-la (nenhuma ação necessária). Pela duração, você tem Vantagem em testes de Força, e seu Deslocamento aumenta em 3 metros. Uma vez que usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.",
          "en": "Starting at character level 5, you can change your size to Large as a Bonus Action if you're in a big enough space. This transformation lasts for 10 minutes or until you end it (no action required). For that duration, you have Advantage on Strength checks, and your Speed increases by 10 feet. Once you use this trait, you can't use it again until you finish a Long Rest."
        }
      },
      {
        "name": {
          "pt": "Porte Poderoso",
          "en": "Powerful Build"
        },
        "desc": {
          "pt": "Você tem Vantagem em qualquer teste de atributo que fizer para encerrar a condição Agarrado. Você também conta como um tamanho maior ao determinar sua capacidade de carga.",
          "en": "You have Advantage on any ability check you make to end the Grappled condition. You also count as one size larger when determining your carrying capacity."
        }
      }
    ],
    choices: [
      { key: 'ancestry', label: b('Ancestral gigante', 'Giant ancestor'), options: [
        { id: 'cloud', name: b('Salto das Nuvens (Gigante das Nuvens)', "Cloud's Jaunt (Cloud Giant)"), desc: b('Ação bônus: teleporte-se até 9 m para um espaço desocupado que você veja.', 'Bonus Action: teleport up to 30 feet to an unoccupied space you can see.') },
        { id: 'fire', name: b('Queimadura do Fogo (Gigante do Fogo)', "Fire's Burn (Fire Giant)"), desc: b('Ao acertar um ataque e causar dano, cause também 1d10 de dano de fogo.', 'When you hit with an attack and deal damage, also deal 1d10 Fire damage.') },
        { id: 'frost', name: b('Frio do Gelo (Gigante do Gelo)', "Frost's Chill (Frost Giant)"), desc: b('Ao acertar um ataque e causar dano, cause também 1d6 de frio e reduza o deslocamento do alvo em 3 m até o início do seu próximo turno.', 'When you hit with an attack and deal damage, also deal 1d6 Cold damage and reduce the target\'s Speed by 10 feet until the start of your next turn.') },
        { id: 'hill', name: b('Tombo da Colina (Gigante da Colina)', "Hill's Tumble (Hill Giant)"), desc: b('Ao acertar um ataque numa criatura Grande ou menor e causar dano, deixe-a Caída.', 'When you hit a Large or smaller creature with an attack and deal damage, knock it Prone.') },
        { id: 'stone', name: b('Resistência da Pedra (Gigante da Pedra)', "Stone's Endurance (Stone Giant)"), desc: b('Reação ao sofrer dano: role 1d12 + mod. de Constituição e reduza o dano nesse total.', 'Reaction when you take damage: roll 1d12 + Constitution modifier and reduce the damage by that total.') },
        { id: 'storm', name: b('Trovão da Tempestade (Gigante da Tempestade)', "Storm's Thunder (Storm Giant)"), desc: b('Reação ao sofrer dano de uma criatura a até 18 m: cause 1d8 de dano trovejante nela.', 'Reaction when a creature within 60 feet damages you: deal 1d8 Thunder damage to it.') },
      ] },
    ],
  },
  halfling: {
    size: 'Small', speed: 30,
    traits: [
      {
        "name": {
          "pt": "Bravo",
          "en": "Brave"
        },
        "desc": {
          "pt": "Você tem Vantagem em salvaguardas que fizer para evitar ou encerrar a condição Amedrontado.",
          "en": "You have Advantage on saving throws you make to avoid or end the Frightened condition."
        }
      },
      {
        "name": {
          "pt": "Agilidade Halfling",
          "en": "Halfling Nimbleness"
        },
        "desc": {
          "pt": "Você pode se mover através do espaço de qualquer criatura que seja de um tamanho maior que o seu, mas não pode parar no mesmo espaço.",
          "en": "You can move through the space of any creature that is a size larger than you, but you can't stop in the same space."
        }
      },
      {
        "name": {
          "pt": "Sorte",
          "en": "Luck"
        },
        "desc": {
          "pt": "Quando você rolar um 1 no d20 de um Teste de D20, você pode rolar o dado novamente, e deve usar a nova rolagem.",
          "en": "When you roll a 1 on the d20 of a D20 Test, you can reroll the die, and you must use the new roll."
        }
      },
      {
        "name": {
          "pt": "Furtividade Natural",
          "en": "Naturally Stealthy"
        },
        "desc": {
          "pt": "Você pode realizar a ação Esconder-se mesmo quando estiver obscurecido apenas por uma criatura que seja pelo menos um tamanho maior que você.",
          "en": "You can take the Hide action even when you are obscured only by a creature that is at least one size larger than you."
        }
      }
    ],
  },
  human: {
    size: 'Medium', speed: 30,
    traits: [
      {
        "name": {
          "pt": "Engenhoso",
          "en": "Resourceful"
        },
        "desc": {
          "pt": "Você ganha Inspiração Heroica sempre que terminar um Descanso Longo.",
          "en": "You gain Heroic Inspiration whenever you finish a Long Rest."
        }
      },
      {
        "name": {
          "pt": "Habilidoso",
          "en": "Skillful"
        },
        "desc": {
          "pt": "Você ganha proficiência em uma perícia de sua escolha.",
          "en": "You gain proficiency in one skill of your choice."
        }
      },
      {
        "name": {
          "pt": "Versátil",
          "en": "Versatile"
        },
        "desc": {
          "pt": "Você ganha um talento de Origem de sua escolha (veja \"Talentos\"). Habilidoso é recomendado.",
          "en": "You gain an Origin feat of your choice (see \"Feats\"). Skilled is recommended."
        }
      }
    ],
    choices: [
      SIZE,
      { key: 'skill', label: b('Habilidoso: perícia', 'Skillful: skill') },
      { key: 'feat', label: b('Versátil: talento de Origem', 'Versatile: Origin feat'), kind: 'origin' },
    ],
  },
  orc: {
    size: 'Medium', speed: 30, darkvision: 120,
    traits: [
      {
        "name": {
          "pt": "Ímpeto de Adrenalina",
          "en": "Adrenaline Rush"
        },
        "desc": {
          "pt": "Você pode realizar a ação Disparada como uma Ação Bônus. Quando faz isso, ganha um número de Pontos de Vida Temporários igual ao seu Bônus de Proficiência.\nVocê pode usar esta característica um número de vezes igual ao seu Bônus de Proficiência, e recupera todos os usos gastos ao terminar um Descanso Curto ou Longo.",
          "en": "You can take the Dash action as a Bonus Action. When you do so, you gain a number of Temporary Hit Points equal to your Proficiency Bonus.\nYou can use this trait a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Short or Long Rest."
        }
      },
      {
        "name": {
          "pt": "Visão no Escuro",
          "en": "Darkvision"
        },
        "desc": {
          "pt": "Você tem Visão no Escuro com alcance de 36 metros.",
          "en": "You have Darkvision with a range of 120 feet."
        }
      },
      {
        "name": {
          "pt": "Resistência Implacável",
          "en": "Relentless Endurance"
        },
        "desc": {
          "pt": "Quando for reduzido a 0 Pontos de Vida mas não for morto instantaneamente, você pode cair para 1 Ponto de Vida em vez disso. Uma vez que usar esta característica, você não pode fazer isso novamente até terminar um Descanso Longo.",
          "en": "When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead. Once you use this trait, you can't do so again until you finish a Long Rest."
        }
      }
    ],
  },
  tiefling: {
    size: 'Medium', speed: 30, darkvision: 60, cantrips: ['thaumaturgy'],
    traits: [
      {
        "name": {
          "pt": "Visão no Escuro",
          "en": "Darkvision"
        },
        "desc": {
          "pt": "Você tem Visão no Escuro com alcance de 18 metros.",
          "en": "You have Darkvision with a range of 60 feet."
        }
      },
      {
        "name": {
          "pt": "Legado Ínfero",
          "en": "Fiendish Legacy"
        },
        "desc": {
          "pt": "Você é o recebedor de um legado que concede habilidades sobrenaturais. Escolha um legado na tabela Legados Ínferos. Você ganha o benefício de 1º nível do legado escolhido.\nQuando você atinge os níveis de personagem 3 e 5, você aprende uma magia de círculo superior, conforme mostrado na tabela. Você sempre tem essa magia preparada. Você pode conjurá-la uma vez sem um espaço de magia, e recupera a habilidade de conjurá-la dessa forma ao terminar um Descanso Longo. Você também pode conjurar a magia usando quaisquer espaços de magia que tiver do círculo apropriado.\nInteligência, Sabedoria ou Carisma é a sua habilidade de conjuração para as magias que você conjura com esta característica (escolha a habilidade ao selecionar o legado).",
          "en": "You are the recipient of a legacy that grants you supernatural abilities. Choose a legacy from the Fiendish Legacies table. You gain the level 1 benefit of the chosen legacy.\nWhen you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table. You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level.\nIntelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the legacy)."
        }
      },
      {
        "name": {
          "pt": "Presença Sobrenatural",
          "en": "Otherworldly Presence"
        },
        "desc": {
          "pt": "Você conhece o truque *Taumaturgia*. Quando o conjura com esta característica, a magia usa a mesma habilidade de conjuração que você usa para a sua característica Legado Ínfero.\nLegados Ínferos\n| Legado | 1º Nível | 3º Nível | 5º Nível |\n| :------- | :----------------------------------------------------------- | :-------------- | :------------------ |\n| Abissal | Você tem Resistência a dano de Veneno. Você também conhece o truque *Borrifo de Veneno*. | Raio de Adoecimento | Imobilizar Pessoa |\n| Ctônico | Você tem Resistência a dano Necrótico. Você também conhece o truque *Toque Macabro*. | Vida Falsa | Raio do Enfraquecimento |\n| Infernal | Você tem Resistência a dano de Fogo. Você também conhece o truque *Dardo de Fogo*. | Repreensão Infernal | Escuridão |",
          "en": "You know the *Thaumaturgy* cantrip. When you cast it with this trait, the spell uses the same spellcasting ability you use for your Fiendish Legacy trait.\nFiendish Legacies\n| Legacy | Level 1 | Level 3 | Level 5 |\n| :------- | :----------------------------------------------------------- | :-------------- | :------------------ |\n| Abyssal | You have Resistance to Poison damage. You also know the*Poison Spray* cantrip. | Ray of Sickness | Hold Person |\n| Chthonic | You have Resistance to Necrotic damage. You also know the*Chill Touch* cantrip. | False Life | Ray of Enfeeblement |\n| Infernal | You have Resistance to Fire damage. You also know the *Fire Bolt* cantrip. | Hellish Rebuke | Darkness |"
        }
      }
    ],
    choices: [
      SIZE,
      { key: 'lineage', label: b('Legado ínfero', 'Fiendish legacy'), options: [
        { id: 'abyssal', name: b('Abissal', 'Abyssal'), resist: ['poison'], cantrips: ['poisonSpray'], spells: { 3: ['rayOfSickness'], 5: ['holdPerson'] }, desc: b('Resistência a veneno.', 'Poison resistance.') },
        { id: 'chthonic', name: b('Ctônico', 'Chthonic'), resist: ['necrotic'], cantrips: ['chillTouch'], spells: { 3: ['falseLife'], 5: ['rayOfEnfeeblement'] }, desc: b('Resistência a dano necrótico.', 'Necrotic resistance.') },
        { id: 'infernal', name: b('Infernal', 'Infernal'), resist: ['fire'], cantrips: ['fireBolt'], spells: { 3: ['hellishRebuke'], 5: ['darkness'] }, desc: b('Resistência a fogo.', 'Fire resistance.') },
      ] },
      SPELL_ABILITY,
    ],
  },
};

/** Aasimar (Player's Handbook 2024): fora do SRD 5.2.1, resumo original. */
export const AASIMAR_2024 = {
  id: 'aasimar', name: b('Aasimar', 'Aasimar'), size: 'Medium', speed: 30, asi: {}, source: 'PHB 2024',
  languages: ['Common', '+2 of choice'], darkvision: 60, resist: ['necrotic', 'radiant'], cantrips: ['light'], fixedSpellAbility: 'cha',
  traits: [
      {
        "name": {
          "pt": "Resistência Celestial",
          "en": "Celestial Resistance"
        },
        "desc": {
          "pt": "Você tem Resistência a dano Necrótico e dano Radiante.",
          "en": "You have Resistance to Necrotic damage and Radiant damage."
        }
      },
      {
        "name": {
          "pt": "Visão no Escuro",
          "en": "Darkvision"
        },
        "desc": {
          "pt": "Você tem Visão no Escuro com alcance de 18 metros.",
          "en": "You have Darkvision with a range of 60 feet."
        }
      },
      {
        "name": {
          "pt": "Mãos Curativas",
          "en": "Healing Hands"
        },
        "desc": {
          "pt": "Como uma ação de Magia, você toca uma criatura e rola um número de d4s igual ao seu Bônus de Proficiência. A criatura recupera um número de Pontos de Vida igual ao total rolado. Uma vez que usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.",
          "en": "As a Magic action, you touch a creature and roll a number of d4s equal to your Proficiency Bonus. The creature regains a number of Hit Points equal to the total rolled. Once you use this trait, you can’t use it again until you finish a Long Rest."
        }
      },
      {
        "name": {
          "pt": "Portador da Luz",
          "en": "Light Bearer"
        },
        "desc": {
          "pt": "Você conhece o truque Luz. Carisma é a sua habilidade de conjuração para ele.",
          "en": "You know the Light cantrip. Charisma is your spellcasting ability for it."
        }
      },
      {
        "level": 3,
        "name": {
          "pt": "Revelação Celestial",
          "en": "Celestial Revelation"
        },
        "desc": {
          "pt": "Quando você atinge o 3º nível de personagem, você pode se transformar como uma Ação Bônus usando uma das opções abaixo (escolha a opção a cada vez que se transformar). A transformação dura 1 minuto ou até você encerrá-la (nenhuma ação necessária). Uma vez que se transformar, você não pode fazer isso novamente até terminar um Descanso Longo.\nUma vez em cada um dos seus turnos antes da transformação terminar, você pode causar dano extra a um alvo quando causar dano a ele com um ataque ou magia. O dano extra é igual ao seu Bônus de Proficiência, e o tipo de dano extra é Necrótico para Manto Necrótico ou Radiante para Asas Celestiais e Radiança Interior.\nAsas Celestiais. Duas asas espectrais brotam temporariamente de suas costas. Até a transformação terminar, você tem um Deslocamento de Voo igual ao seu Deslocamento.\nRadiança Interior. Luz abrasadora irradia temporariamente dos seus olhos e boca. Pela duração, você emite Luz Plena em um raio de 3 metros e Meia-Luz por mais 3 metros adicionais, e no final de cada um dos seus turnos, cada criatura a até 3 metros de você sofre dano Radiante igual ao seu Bônus de Proficiência.\nManto Necrótico. Seus olhos tornam-se brevemente poças de escuridão, e asas incapazes de voar brotam temporariamente de suas costas. Criaturas a até 3 metros de você que não sejam seus aliados devem ser bem-sucedidas em uma salvaguarda de Carisma (CD 8 mais seu modificador de Carisma e seu Bônus de Proficiência) ou ficarão com a condição Amedrontado até o final do seu próximo turno.",
          "en": "When you reach character level 3, you can transform as a Bonus Action using one of the options below (choose the option each time you transform). The transformation lasts for 1 minute or until you end it (no action required). Once you transform, you can’t do so again until you finish a Long Rest.\nOnce on each of your turns before the transformation ends, you can deal extra damage to one target when you deal damage to it with an attack or a spell. The extra damage equals your Proficiency Bonus, and the extra damage’s type is either Necrotic for Necrotic Shroud or Radiant for Heavenly Wings and Inner Radiance.\nHeavenly Wings. Two spectral wings sprout from your back temporarily. Until the transformation ends, you have a Fly Speed equal to your Speed.\nInner Radiance. Searing light temporarily radiates from your eyes and mouth. For the duration, you shed Bright Light in a 10-foot radius and Dim Light for an additional 10 feet, and at the end of each of your turns, each creature within 10 feet of you takes Radiant damage equal to your Proficiency Bonus.\nNecrotic Shroud. Your eyes briefly become pools of darkness, and flightless wings sprout from your back temporarily. Creatures other than your allies within 10 feet of you must succeed on a Charisma saving throw (DC 8 plus your Charisma modifier and Proficiency Bonus) or have the Frightened condition until the end of your next turn."
        }
      }
    ],
  choices: [SIZE],
};

// ---------------------------------------------------------------------------
// 2014 (e raças antigas usadas por fichas 2024): só escolhas e efeitos.
// Os traços continuam os de data/srd.js e data/expanded-catalog.js.
// ---------------------------------------------------------------------------
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const SPECIES_2014_CHOICES = {
  dragonborn: { choices: [DRACONIC_ANCESTRY] },
  drow: { skills: ['perception'], cantrips: ['dancingLights'], spells: { 3: ['faerieFire'], 5: ['darkness'] }, fixedSpellAbility: 'cha' },
  'elf-high': { skills: ['perception'], fixedSpellAbility: 'int',
    choices: [{ key: 'cantrip', label: b('Truque de Mago', 'Wizard cantrip'), list: 'wizard' }] },
  'elf-wood': { skills: ['perception'] },
  'gnome-forest': { cantrips: ['minorIllusion'], fixedSpellAbility: 'int' },
  tiefling: { resist: ['fire'], cantrips: ['thaumaturgy'], spells: { 3: ['hellishRebuke'], 5: ['darkness'] }, fixedSpellAbility: 'cha' },
  aasimar: { resist: ['necrotic', 'radiant'], cantrips: ['light'], fixedSpellAbility: 'cha' },
  'half-elf': { choices: [{ key: 'skill', label: b('Versatilidade em Perícias', 'Skill Versatility'), count: 2 }] },
  'human-variant': { choices: [
    { key: 'asi', label: b('+1 em dois atributos', '+1 to two abilities'), pattern: [1, 1], from: ABILITIES },
    { key: 'skill', label: b('Perícia', 'Skill') },
    { key: 'feat', label: b('Talento', 'Feat'), kind: 'asi' },
  ] },
  'custom-lineage': { choices: [
    SIZE,
    { key: 'asi', label: b('+2 em um atributo', '+2 to one ability'), pattern: [2], from: ABILITIES },
    { key: 'feat', label: b('Talento', 'Feat'), kind: 'asi' },
    { key: 'bonus', label: b('Traço variável', 'Variable trait'), options: [
      { id: 'darkvision', name: b('Visão no escuro (18 m)', 'Darkvision (60 feet)'), darkvision: 60 },
      { id: 'skill', name: b('Proficiência em uma perícia', 'Proficiency in one skill') },
    ] },
    { key: 'skill', label: b('Perícia', 'Skill'), when: { bonus: 'skill' } },
  ] },
  // Magia inata das raças de outros livros (VGM, MPMM, EEPC, AAG, VRGR): as de
  // data/srd.js seguem o texto do traço; as de data/expanded-catalog.js, o traço
  // "magia inata" de lá. Livros de 2014 fixam o atributo; os do MPMM deixam escolher.
  firbolg: { spells: { 1: ['detectMagic', 'disguiseSelf'] }, fixedSpellAbility: 'wis', spellUses: { detectMagic: 'short', disguiseSelf: 'short' } },
  fairy: { cantrips: ['druidcraft'], spells: { 3: ['faerieFire'], 5: ['enlargeReduce'] }, choices: [SPELL_ABILITY] },
  // Genasi do EEPC (o registro de srd.js: CON +2 e atributo fixo). Ar e Terra não têm truque.
  'genasi-air': { spells: { 1: ['levitate'] }, fixedSpellAbility: 'con' },
  'genasi-earth': { spells: { 1: ['passWithoutTrace'] }, fixedSpellAbility: 'con' },
  'genasi-fire': { cantrips: ['produceFlame'], spells: { 3: ['burningHands'] }, fixedSpellAbility: 'con' },
  // Ficha 2024 com esta raça: o id vira createOrDestroyWater (SPECIES_SPELL_IDS_2024).
  'genasi-water': { cantrips: ['shapeWater'], spells: { 3: ['createDestroyWater'] }, fixedSpellAbility: 'con' },
  triton: { spells: { 1: ['fogCloud'], 3: ['gustOfWind'], 5: ['wallOfWater'] }, fixedSpellAbility: 'cha' },
  'yuan-ti': { cantrips: ['poisonSpray'], spells: { 1: ['animalFriendship'], 3: ['suggestion'] }, fixedSpellAbility: 'cha', spellUses: { animalFriendship: 'atWill' } },
  kobold: { choices: [
    { key: 'legacy', label: b('Legado kobold', 'Kobold legacy'), options: [
      { id: 'craftiness', name: b('Manhoso', 'Craftiness'), desc: b('Proficiência em Arcanismo, Investigação, Medicina, Prestidigitação ou Sobrevivência.', 'Proficiency in Arcana, Investigation, Medicine, Sleight of Hand or Survival.') },
      { id: 'defiance', name: b('Resistente', 'Defiance'), desc: b('Vantagem nas salvaguardas para evitar ou encerrar a condição amedrontado.', 'Advantage on saving throws to avoid or end the frightened condition.') },
      { id: 'sorcery', name: b('Feitiçaria Dracônica', 'Draconic Sorcery'), desc: b('Um truque de Feiticeiro à escolha, com Inteligência, Sabedoria ou Carisma.', 'One Sorcerer cantrip of your choice, with Intelligence, Wisdom or Charisma.') },
    ] },
    { key: 'skill', label: b('Manhoso: perícia', 'Craftiness: skill'), from: ['arcana', 'investigation', 'medicine', 'sleightOfHand', 'survival'], when: { legacy: 'craftiness' } },
    { key: 'cantrip', label: b('Truque de Feiticeiro', 'Sorcerer cantrip'), list: 'sorcerer', when: { legacy: 'sorcery' } },
    { ...SPELL_ABILITY, when: { legacy: 'sorcery' } },
  ] },
  aarakocra: { spells: { 3: ['gustOfWind'] }, choices: [SPELL_ABILITY] },
  'astral-elf': { choices: [
    { key: 'astralFire', label: b('Fogo Astral: truque', 'Astral Fire: cantrip'), options: [
      { id: 'dancingLights', name: b('Luzes Dançantes', 'Dancing Lights'), cantrips: ['dancingLights'] },
      { id: 'light', name: b('Luz', 'Light'), cantrips: ['light'] },
      { id: 'sacredFlame', name: b('Chama Sagrada', 'Sacred Flame'), cantrips: ['sacredFlame'] },
    ] },
    SPELL_ABILITY,
  ] },
  'deep-gnome': { spells: { 3: ['disguiseSelf'], 5: ['nondetection'] }, choices: [SPELL_ABILITY] },
  duergar: { spells: { 3: ['enlargeReduce'], 5: ['invisibility'] }, choices: [SPELL_ABILITY] },
  githyanki: { cantrips: ['mageHand'], spells: { 3: ['jump'], 5: ['mistyStep'] }, choices: [SPELL_ABILITY] },
  githzerai: { cantrips: ['mageHand'], spells: { 3: ['shield'], 5: ['detectThoughts'] }, choices: [SPELL_ABILITY] },
  hexblood: { spells: { 1: ['disguiseSelf', 'hex'] }, choices: [SPELL_ABILITY] },
  // Sub-raças de suplementos: data/subraces-2014.js.
  ...SUBRACE_EFFECTS_2014,
};

/**
 * Suplementos (MPMM, VRGR, ERLW, GGR, AAG, MOoT…) e raças do PHB 2014 sem efeitos
 * mecânicos registrados: visão no escuro, resistências, perícias (fixas ou à escolha),
 * ferramentas e deslocamento. Mesclado em SPECIES_2014_CHOICES sem apagar o que já existe
 * (listas unidas, visão no escuro pela maior, escolhas acrescentadas).
 */
const ALL_SKILLS = ['acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation',
  'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleightOfHand', 'stealth', 'survival'];
const SKILL_PICK = (from, count = 1, pt = 'Perícia da espécie', en = 'Species skill') => ({ key: 'skill', label: b(pt, en), from, count });
const TOOL_PICK = (from, count = 1, pt = 'Ferramenta da espécie', en = 'Species tool') => ({ key: 'tool', label: b(pt, en), from, count });
export const SPECIES_SUPPLEMENTS = {
  'dwarf-hill': { darkvision: 60, resist: ['poison'] },
  'dwarf-mountain': { darkvision: 60, resist: ['poison'] },
  'dwarf-mark-warding': { resist: ['poison'] },
  'gnome-rock': { darkvision: 60 },
  'half-orc': { darkvision: 60, skills: ['intimidation'] },
  'halfling-stout': { resist: ['poison'] },
  'human-mark-making': { choices: [TOOL_PICK(ARTISAN_TOOL_IDS, 1, 'Dádiva do Criador: ferramenta de artesão', "Maker's Gift: artisan's tool")] },
  orc: { darkvision: 60, choices: [SKILL_PICK(['animalHandling', 'insight', 'intimidation', 'medicine', 'nature', 'perception', 'survival'], 2, 'Intuição Primal', 'Primal Intuition')] },
  bugbear: { darkvision: 60, skills: ['stealth'] },
  centaur: { speed: 40, choices: [SKILL_PICK(['animalHandling', 'medicine', 'nature', 'survival'])] },
  changeling: { choices: [SKILL_PICK(['deception', 'insight', 'intimidation', 'performance', 'persuasion'], 2, 'Instintos de Metamorfo', 'Changeling Instincts')] },
  goblin: { darkvision: 60 },
  hobgoblin: { darkvision: 60 },
  harengon: { skills: ['perception'] },
  kenku: { choices: [SKILL_PICK(['acrobatics', 'deception', 'stealth', 'sleightOfHand'], 2, 'Treinamento Kenku', 'Kenku Recall')] },
  kobold: { darkvision: 60 },
  leonin: { darkvision: 60, speed: 35, choices: [SKILL_PICK(['athletics', 'intimidation', 'perception', 'survival'])] },
  lizardfolk: { choices: [SKILL_PICK(['animalHandling', 'medicine', 'nature', 'perception', 'stealth', 'survival'], 2, 'Intuição do Caçador', "Hunter's Lore")] },
  minotaur: { choices: [SKILL_PICK(['intimidation', 'persuasion'])] },
  satyr: { speed: 35, skills: ['performance', 'persuasion'], choices: [TOOL_PICK(INSTRUMENT_IDS, 1, 'Folião: instrumento musical', 'Reveler: musical instrument')] },
  tabaxi: { darkvision: 60, skills: ['perception', 'stealth'] },
  tortle: { choices: [SKILL_PICK(['animalHandling', 'medicine', 'nature', 'perception', 'stealth', 'survival'], 1, 'Intuição da Natureza', "Nature's Intuition")] },
  warforged: { resist: ['poison'], choices: [SKILL_PICK(ALL_SKILLS)] },
  eladrin: {
    darkvision: 60,
    skills: ['perception'],
    choices: [{
      key: 'season',
      label: b('Estação Eladrin (Passo Feérico)', 'Eladrin Season (Fey Step)'),
      options: [
        { id: 'autumn', name: b('Outono', 'Autumn'), desc: b('Enfeitiça até 2 criaturas após usar Passo Feérico.', 'Charm up to 2 creatures after using Fey Step.') },
        { id: 'winter', name: b('Inverno', 'Winter'), desc: b('Amedronta 1 criatura próxima antes de teleportar.', 'Frighten 1 nearby creature before teleporting.') },
        { id: 'spring', name: b('Primavera', 'Spring'), desc: b('Teleporta 1 aliado voluntário em vez de si mesmo.', 'Teleport 1 willing ally instead of yourself.') },
        { id: 'summer', name: b('Verão', 'Summer'), desc: b('Causa dano de fogo ao redor ao chegar.', 'Deal fire damage around your arrival space.') },
      ],
    }],
  },
  'sea-elf': { darkvision: 60, resist: ['cold'], skills: ['perception'] },
  'shadar-kai': { darkvision: 60, resist: ['necrotic'], skills: ['perception'] },
  'astral-elf': { darkvision: 60, skills: ['perception'] },
  'deep-gnome': { darkvision: 120 },
  duergar: { darkvision: 120, resist: ['poison'] },
  githyanki: { resist: ['psychic'], choices: [SKILL_PICK(ALL_SKILLS, 1, 'Conhecimento Astral', 'Astral Knowledge')] },
  githzerai: { resist: ['psychic'] },
  kalashtar: { resist: ['psychic'] },
  kender: { choices: [SKILL_PICK(['insight', 'investigation', 'sleightOfHand', 'stealth', 'survival'], 1, 'Curiosidade Kender', 'Kender Curiosity')] },
  locathah: { skills: ['athletics', 'perception'] },
  owlin: { darkvision: 120, skills: ['stealth'] },
  plasmoid: { darkvision: 60, resist: ['acid', 'poison'] },
  shifter: { darkvision: 60, choices: [SKILL_PICK(['acrobatics', 'athletics', 'intimidation', 'survival'], 1, 'Instintos Bestiais', 'Bestial Instincts')] },
  'simic-hybrid': {
    darkvision: 60,
    choices: [
      {
        key: 'enhancement1',
        label: b('Aprimoramento Animal (1º nível)', 'Animal Enhancement (1st level)'),
        options: [
          { id: 'mantaGlide', name: b('Planar de Manta', 'Manta Glide'), desc: b('Asas membranosas para planar e reduzir queda.', 'Glide up to 2 ft horizontally per 1 ft fallen.') },
          { id: 'nimbleClimber', name: b('Escalador Ágil', 'Nimble Climber'), desc: b('Deslocamento de escalada igual à caminhada.', 'Climbing speed equal to walking speed.') },
          { id: 'underwaterAdaptation', name: b('Adaptação Subaquática', 'Underwater Adaptation'), desc: b('Respira sob a água e natação igual à caminhada.', 'Breathe air and water; swimming speed equal to walking speed.') },
        ],
      },
      {
        key: 'enhancement5',
        minLevel: 5,
        label: b('Aprimoramento Animal (5º nível)', 'Animal Enhancement (5th level)'),
        options: [
          { id: 'grapplingAppendages', name: b('Apêndices Agarradores', 'Grappling Appendages'), desc: b('Dois tentáculos ou pinças que atacam e agarram com ação bônus.', 'Two appendages that strike (1d6) and grapple as a bonus action.') },
          { id: 'carapace', name: b('Carapaça (+1 CA)', 'Carapace (+1 AC)'), desc: b('Quitina protetora (+1 CA sem armadura pesada).', 'Chitinous shell grants +1 AC when not wearing heavy armor.') },
          { id: 'acidSpit', name: b('Cuspe Ácido', 'Acid Spit'), desc: b('Cospe ácido à distância (2d10, escala no 11º e 17º nível).', 'Ranged acid attack (2d10 damage, scales at 11th and 17th level).') },
          { id: 'mantaGlide', name: b('Planar de Manta', 'Manta Glide'), desc: b('Asas membranosas para planar.', 'Glide membranes.') },
          { id: 'nimbleClimber', name: b('Escalador Ágil', 'Nimble Climber'), desc: b('Deslocamento de escalada.', 'Climbing speed.') },
          { id: 'underwaterAdaptation', name: b('Adaptação Subaquática', 'Underwater Adaptation'), desc: b('Respira sob a água e natação.', 'Amphibious & swimming speed.') },
        ],
      },
    ],
  },
  'thri-kreen': { darkvision: 60 },
  verdan: { skills: ['persuasion'] },
  grung: { skills: ['perception'], resist: ['poison'] },
  dhampir: { darkvision: 60, choices: [SKILL_PICK(ALL_SKILLS, 2, 'Legado Ancestral', 'Ancestral Legacy')] },
  hexblood: { darkvision: 60, choices: [SKILL_PICK(ALL_SKILLS, 2, 'Legado Ancestral', 'Ancestral Legacy')] },
  reborn: { resist: ['poison'], choices: [SKILL_PICK(ALL_SKILLS, 2, 'Legado Ancestral', 'Ancestral Legacy')] },
  'yuan-ti': { darkvision: 60, resist: ['poison'] },
  'genasi-fire': { darkvision: 60, resist: ['fire'] },
  'genasi-water': { resist: ['acid'] },
  vedalken: {
    choices: [
      SKILL_PICK(['arcana', 'history', 'investigation', 'medicine', 'performance', 'sleightOfHand'], 1, 'Precisão Incansável: perícia', 'Tireless Precision: skill'),
      TOOL_PICK(ALL_TOOL_IDS, 1, 'Precisão Incansável: ferramenta', 'Tireless Precision: tool'),
    ],
  },
  autognome: { choices: [TOOL_PICK(ALL_TOOL_IDS, 2, 'Design Especializado: ferramentas', 'Specialized Design: tools')] },
  aarakocra: {},
  fairy: {},
};

function mergeSpecies(base = {}, add = {}) {
  const out = { ...base };
  if (add.darkvision) out.darkvision = Math.max(base.darkvision || 0, add.darkvision);
  if (add.speed && !base.speed) out.speed = add.speed;
  for (const k of ['skills', 'resist', 'tools']) if (add[k]?.length) out[k] = [...new Set([...(base[k] || []), ...add[k]])];
  if (add.choices?.length) {
    const have = new Set((base.choices || []).map(c => c.key));
    out.choices = [...(base.choices || []), ...add.choices.filter(c => !have.has(c.key))];
  }
  return out;
}
for (const [id, add] of Object.entries(SPECIES_SUPPLEMENTS)) {
  SPECIES_2014_CHOICES[id] = mergeSpecies(SPECIES_2014_CHOICES[id], add);
}

/**
 * Raça 2014 numa ficha 2024 usa o catálogo de magias 2024: ids 2014 que lá têm
 * outro nome são trocados (speciesGrants e o espelho do servidor, via catalog.json).
 */
export const SPECIES_SPELL_IDS_2024 = { createDestroyWater: 'createOrDestroyWater' };

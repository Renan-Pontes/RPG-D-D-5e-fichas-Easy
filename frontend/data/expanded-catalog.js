import { EXPANDED_SUBCLASS_FEATURES } from './expanded-subclass-features.js';
// 2014-compatible options. Short original descriptions, not book text.
// Supplemental options identify their source and require table adjudication.
const bilingual = (pt, en) => ({ pt, en });

export const ARTIFICER = {
  id: 'artificer', name: bilingual('Artífice', 'Artificer'), hitDie: 8,
  saves: ['con', 'int'], armor: ['Light', 'Medium', 'Shields'], weapons: ['Simple'],
  skillsFrom: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'perception', 'sleightOfHand'],
  skillCount: 2, spellcaster: true, spellAbility: 'int', source: 'TCE',
  features: [
    { name: bilingual('Conjuração com ferramentas', 'Tool-based Spellcasting'), desc: bilingual("Você estudou o funcionamento da magia e como canalizá-la através de objetos. Como resultado, você adquiriu a capacidade de conjurar magias. Para os observadores, você não parece estar conjurando magias de forma convencional; parece que você está produzindo maravilhas usando itens mundanos ou invenções extravagantes.\n\nFERRAMENTAS NECESSÁRIAS\n\nVocê produz os efeitos de suas magias de artífice através de suas ferramentas. Você deve ter um foco de conjuração — especificamente ferramentas de ladrão ou algum tipo de ferramenta de artesão — em mãos ao conjurar qualquer magia com esta característica de Conjuração (significando que a magia tem um componente 'M' ao ser conjurada). Você deve ser proficiente com a ferramenta para usá-la desta forma. Consulte o capítulo 5, \"Equipamento\", no Livro do Jogador para obter as descrições dessas ferramentas.\n\nApós adquirir a característica Infundir Item no 2º nível, você também pode usar qualquer item que contenha uma de suas infusões como um foco de conjuração.\n\nTRUQUES (MAGIAS DE CÍRCULO 0)\n\nNo 1º nível, você conhece dois truques à sua escolha da lista de magias de artífice. Em níveis superiores, você aprende truques adicionais de artífice à sua escolha, conforme mostrado na coluna Truques Conhecidos da tabela O Artífice.\n\nQuando você ganha um nível nesta classe, pode substituir um dos truques de artífice que conhece por outro truque da lista de magias de artífice.\n\nPREPARANDO E CONJURANDO MAGIAS\n\nA tabela O Artífice mostra quantos espaços de magia você possui para conjurar suas magias de artífice. Para conjurar uma de suas magias de artífice de 1º círculo ou superior, você deve gastar um espaço do círculo da magia ou superior. Você recupera todos os espaços de magia gastos ao terminar um Descanso Longo.\n\nVocê prepara a lista de magias de artífice que estão disponíveis para você conjurar, escolhendo a partir da lista de magias de artífice. Ao fazer isso, escolha um número de magias de artífice igual ao seu modificador de Inteligência + metade do seu nível de artífice, arredondado para baixo (mínimo de uma magia). As magias devem ser de um círculo para o qual você tenha espaços de magia.\n\nPor exemplo, se você for um artífice de 5º nível, terá quatro espaços de magia de 1º círculo e dois de 2º círculo. Com Inteligência 14, sua lista de magias preparadas pode incluir quatro magias de 1º ou 2º círculo, em qualquer combinação. Se você preparar a magia de 1º círculo curar ferimentos, poderá conjurá-la usando um espaço de 1º círculo ou de 2º círculo. Conjurar a magia não a remove da sua lista de magias preparadas.\n\nVocê pode mudar sua lista de magias preparadas quando termina um Descanso Longo. Preparar uma nova lista de magias de artífice exige tempo gasto mexendo em seus focos de conjuração: pelo menos 1 minuto por círculo de magia para cada magia em sua lista.\n\nHABILIDADE DE CONJURAÇÃO\n\nnão a remove da sua lista de magias preparadas.\n\nHABILIDADE DE CONJURAÇÃO\n\nInteligência é a sua habilidade de conjuração para suas magias de artífice; sua compreensão da teoria por trás da magia permite que você maneje essas magias com perícia superior. Você usa sua Inteligência sempre que uma magia de artífice se referir à sua habilidade de conjuração. Além disso, você usa seu modificador de Inteligência ao definir a CD do teste de resistência para uma magia de artífice que você conjura e ao fazer uma jogada de ataque com uma.\n\nCD de salvaguarda de magia = 8 + seu bônus de proficiência + seu modificador de Inteligência\n\nModificador de ataque de magia = seu bônus de proficiência + seu modificador de Inteligência\n\nCONJURAÇÃO DE RITUAL\n\nVocê pode conjurar uma magia de artífice como um ritual se essa magia tiver o marcador de ritual e você tiver a magia preparada.", "You have studied the workings of magic and how to channel it through objects. As a result, you have gained the ability to cast spells. To observers, you don’t appear to be casting spells in a conventional way; you look as if you’re producing wonders using mundane items or outlandish inventions.\n\nTOOLS REQUIRED\n\nYou produce your artificer spell effects through your tools. You must have a spellcasting focus—specifically thieves’ tools or some kind of artisan’s tool—in hand when you cast any spell with this Spellcasting feature (meaning the spell has an ‘M’ component when you cast it). You must be proficient with the tool to use it in this way. See chapter 5, \"Equipment,\" in the Player’s Handbook for descriptions of these tools.\n\nAfter you gain the Infuse Item feature at 2nd level, you can also use any item bearing one of your infusions as a spellcasting focus.\n\nCANTRIPS (0-LEVEL SPELLS)\n\nAt 1st level, you know two cantrips of your choice from the artificer spell list. At higher levels, you learn additional artificer cantrips of your choice, as shown in the Cantrips Known column of the Artificer table.\n\nWhen you gain a level in this class, you can replace one of the artificer cantrips you know with another cantrip from the artificer spell list.\n\nPREPARING AND CASTING SPELLS\n\nThe Artificer table shows how many spell slots you have to cast your artificer spells. To cast one of your artificer spells of 1st level or higher, you must expend a slot of the spell’s level or higher. You regain all expended spell slots when you finish a long rest.\n\nYou prepare the list of artificer spells that are available for you to cast, choosing from the artificer spell list. When you do so, choose a number of artificer spells equal to your Intelligence modifier + half your artificer level, rounded down (minimum of one spell). The spells must be of a level for which you have spell slots.\n\nFor example, if you are a 5th-level artificer, you have four 1st-level and two 2nd-level spell slots. With an Intelligence of 14, your list of prepared spells can include four spells of 1st or 2nd level, in any combination. If you prepare the 1st-level spell cure wounds, you can cast it using a 1st-level or a 2nd-level slot. Casting the spell doesn’t remove it from your list of prepared spells.\n\nYou can change your list of prepared spells when you finish a long rest. Preparing a new list of artificer spells requires time spent tinkering with your spellcasting focuses: at least 1 minute per spell level for each spell on your list.\n\nSPELLCASTING ABILITY\n\nsn’t remove it from your list of prepared spells.\n\nSPELLCASTING ABILITY\n\nIntelligence is your spellcasting ability for your artificer spells; your understanding of the theory behind magic allows you to wield these spells with superior skill. You use your Intelligence whenever an artificer spell refers to your spellcasting ability. In addition, you use your Intelligence modifier when setting the saving throw DC for an artificer spell you cast and when making an attack roll with one.\n\nSpell save DC = 8 + your proficiency bonus + your Intelligence modifier\n\nSpell attack modifier = your proficiency bonus + your Intelligence modifier\n\nRITUAL CASTING\n\nYou can cast an artificer spell as a ritual if that spell has the ritual tag and you have the spell prepared.") },
    { name: bilingual('Engenho Mágico', 'Magical Tinkering'), desc: bilingual("No 1º nível, você aprende a infundir uma centelha de magia em objetos mundanos. Para usar esta habilidade, você deve ter ferramentas de ladrão ou ferramentas de artesão. Você então toca um objeto não mágico Miúdo como uma Ação e concede a ele uma das seguintes propriedades mágicas à sua escolha:\n\n• O objeto emite luz plena em um raio de 1,5 metro e penumbra por mais 1,5 metro adicionais.\n\n• Sempre que tocado por uma criatura, o objeto emite uma mensagem gravada que pode ser ouvida a até 3 metros de distância. Você profere a mensagem ao conceder esta propriedade ao objeto, e a gravação não pode ter mais de 6 segundos de duração.\n\n• O objeto emite continuamente um odor ou um som não verbal à sua escolha (vento, ondas, chilrear ou algo semelhante). O fenômeno escolhido é perceptível a até 3 metros de distância.\n\n• Um efeito visual estático aparece em uma das superfícies do objeto. Este efeito pode ser uma imagem, até 25 palavras de texto, linhas e formas, ou uma mistura desses elementos, como preferir.\n\nA propriedade escolhida dura indefinidamente. Como uma Ação, você pode tocar o objeto e encerrar a propriedade prematuramente.\n\nVocê pode conceder magia a múltiplos objetos, tocando em um objeto a cada vez que usar esta característica, embora um único objeto só possa ter uma propriedade por vez. O número máximo de objetos que você pode afetar com esta característica ao mesmo tempo é igual ao seu modificador de Inteligência (mínimo de um objeto). Se tentar exceder o seu máximo, a propriedade mais antiga termina imediatamente, e a nova propriedade é aplicada.", "At 1st level, you learn how to invest a spark of magic into mundane objects. To use this ability, you must have thieves’ tools or artisan’s tools. You then touch a Tiny nonmagical object as an action and give it one of the following magical properties of your choice:\n\n• The object sheds bright light in a 5-foot radius and dim light for an additional 5 feet.\n\n• Whenever tapped by a creature, the object emits a recorded message that can be heard up to 10 feet away. You utter the message when you bestow this property on the object, and the recording can be no more than 6 seconds long.\n\n• The object continuously emits your choice of an odor or a nonverbal sound (wind, waves, chirping, or the like). The chosen phenomenon is perceivable up to 10 feet away.\n\n• A static visual effect appears on one of the object’s surfaces. This effect can be a picture, up to 25 words of text, lines and shapes, or a mixture of these elements, as you like.\n\nThe chosen property lasts indefinitely. As an action, you can touch the object and end the property early.\n\nYou can bestow magic on multiple objects, touching one object each time you use this feature, though a single object can only bear one property at a time. The maximum number of objects you can affect with this feature at one time is equal to your Intelligence modifier (minimum of one object). If you try to exceed your maximum, the oldest property immediately ends, and then the new property applies.") },
  ],
};

// [id, Portuguese name, English name, size, speed, source, Portuguese summary, English summary]
const races = [
  ['aarakocra', 'Aarakocra', 'Aarakocra', 'Medium', 30, 'MPMM', 'Voo sem armadura média/pesada; garras e magia do vento.', 'Flight without medium/heavy armor; talons and wind magic.'],
  ['astral-elf', 'Elfo Astral', 'Astral Elf', 'Medium', 30, 'AAG', 'Transe astral, visão no escuro e teleporte breve.', 'Astral trance, darkvision, and brief teleportation.'],
  ['autognome', 'Autognomo', 'Autognome', 'Small', 30, 'AAG', 'Constructo; carapaça blindada, reparos mágicos e dados de auxílio.', 'Construct; armored casing, magical repairs, and assistance dice.'],
  ['duergar', 'Duergar', 'Duergar', 'Medium', 30, 'MPMM', 'Visão no escuro superior, resistência a veneno e magia psiônica.', 'Superior darkvision, poison resilience, and psionic magic.'],
  ['eladrin', 'Eladrin', 'Eladrin', 'Medium', 30, 'MPMM', 'Transe e passo feérico com efeito ligado à estação escolhida.', 'Trance and a fey step whose effect depends on the chosen season.'],
  ['sea-elf', 'Elfo do Mar', 'Sea Elf', 'Medium', 30, 'MPMM', 'Respiração aquática, natação e comunicação com animais aquáticos.', 'Water breathing, swimming, and communication with aquatic animals.'],
  ['shadar-kai', 'Shadar-kai', 'Shadar-kai', 'Medium', 30, 'MPMM', 'Transe, resistência necrótica e teleporte protetor.', 'Trance, necrotic resistance, and protective teleportation.'],
  ['deep-gnome', 'Gnomo das Profundezas', 'Deep Gnome', 'Small', 30, 'MPMM', 'Visão no escuro superior, furtividade e proteção mágica.', 'Superior darkvision, stealth, and magical protection.'],
  ['giff', 'Giff', 'Giff', 'Medium', 30, 'AAG', 'Natação, constituição poderosa e afinidade com armas de fogo.', 'Swimming, powerful build, and firearm affinity.'],
  ['githyanki', 'Githyanki', 'Githyanki', 'Medium', 30, 'MPMM', 'Conhecimento astral, resistência psíquica e magia psiônica.', 'Astral knowledge, psychic resistance, and psionic magic.'],
  ['githzerai', 'Githzerai', 'Githzerai', 'Medium', 30, 'MPMM', 'Disciplina mental, resistência psíquica e defesa psiônica.', 'Mental discipline, psychic resistance, and psionic defense.'],
  ['hadozee', 'Hadozee', 'Hadozee', 'Medium', 30, 'AAG', "Escalada, Pés Ágeis, planar e resistência a impactos.", 'Climbing, dexterous feet, gliding, and impact resilience.'],
  ['kalashtar', 'Kalashtar', 'Kalashtar', 'Medium', 30, 'ERLW', 'Telepatia, resistência psíquica e defesa contra efeitos mentais.', 'Telepathy, psychic resistance, and mental defenses.'],
  ['kender', 'Kender', 'Kender', 'Small', 30, 'DSDQ', 'Resistência ao medo, curiosidade e provocação de inimigos.', 'Fear resilience, curiosity, and enemy taunts.'],
  ['locathah', 'Locathah', 'Locathah', 'Medium', 30, 'LR', 'Natação, armadura natural e dependência de imersão em água.', 'Swimming, natural armor, and a need for water immersion.'],
  ['loxodon', 'Loxodonte', 'Loxodon', 'Medium', 30, 'GGR', 'Tromba preênsil, olfato aguçado e armadura natural.', 'Prehensile trunk, keen smell, and natural armor.'],
  ['owlin', 'Corujino', 'Owlin', 'Medium', 30, 'SCC', 'Voo sem armadura média/pesada, furtividade e visão no escuro.', 'Flight without medium/heavy armor, stealth, and darkvision.'],
  ['plasmoid', 'Plasmoide', 'Plasmoid', 'Medium', 30, 'AAG', 'Corpo amorfo, pseudópodes e resistência a ácido e veneno.', 'Amorphous body, pseudopods, and acid and poison resistance.'],
  ['shifter', 'Transmorfo', 'Shifter', 'Medium', 30, 'MPMM', 'Transformação temporária com aspecto bestial escolhido.', 'Temporary transformation with a chosen bestial aspect.'],
  ['simic-hybrid', 'Híbrido Simic', 'Simic Hybrid', 'Medium', 30, 'GGR', 'Escolha adaptações animais nos níveis 1 e 5.', 'Choose animal adaptations at levels 1 and 5.'],
  ['thri-kreen', 'Thri-kreen', 'Thri-kreen', 'Medium', 30, 'AAG', 'Carapaça, braços secundários e comunicação telepática.', 'Carapace, secondary arms, and telepathic communication.'],
  ['vedalken', 'Vedalkeano', 'Vedalken', 'Medium', 30, 'GGR', 'Precisão especializada, defesa mental e respiração aquática limitada.', 'Specialized precision, mental defenses, and limited water breathing.'],
  ['verdan', 'Verdan', 'Verdan', 'Small', 30, 'AI', 'Telepatia limitada, recuperação e mudança de tamanho no nível 5.', 'Limited telepathy, recovery, and a size change at level 5.'],
  ['grung', 'Grung', 'Grung', 'Small', 25, 'OGA', 'Escalada, pele venenosa, saltos e dependência de água.', 'Climbing, poisonous skin, jumping, and water dependency.'],
  ['dhampir', 'Dhampir', 'Dhampir', 'Medium', 35, 'VRGR', 'Linhagem: mordida vampírica, escalada e natureza imortal.', 'Lineage: vampiric bite, climbing, and deathless nature.'],
  ['hexblood', 'Sangue Maldito', 'Hexblood', 'Medium', 30, 'VRGR', 'Linhagem feérica: lembrança sobrenatural e magia de bruxa.', 'Fey lineage: eerie tokens and hag magic.'],
  ['reborn', 'Renascido', 'Reborn', 'Medium', 30, 'VRGR', 'Linhagem: resistência da não vida e memórias de uma vida anterior.', 'Lineage: deathless resilience and memories of a past life.'],
  ['human-variant', 'Humano Variante', 'Variant Human', 'Medium', 30, 'PHB', 'Dois atributos +1; uma perícia e um talento à escolha.', 'Two abilities +1; one skill and one feat of your choice.'],
  ['custom-lineage', 'Linhagem Personalizada', 'Custom Lineage', 'Medium', 30, 'TCE', 'Um atributo +2; um talento; escolha visão no escuro ou perícia.', 'One ability +2; one feat; choose darkvision or a skill.'],
];

// Magia inata (resumo próprio): as magias entram na aba Magias pela tabela de
// species-2024.js (SPECIES_2014_CHOICES), com o atributo escolhido na espécie.
const ANY = bilingual('Atributo: Inteligência, Sabedoria ou Carisma (escolha na espécie).', 'Ability: Intelligence, Wisdom or Charisma (pick it in the species step).');
const ONCE = bilingual('Cada magia 1× por descanso longo sem espaço de magia (ou com seus espaços).', 'Each spell once per long rest without a spell slot (or with your slots).');
const innate = (pt, en, dpt, den, once = true) => ({
  name: bilingual(pt, en),
  desc: bilingual([dpt, once ? ONCE.pt : '', ANY.pt].filter(Boolean).join(' '), [den, once ? ONCE.en : '', ANY.en].filter(Boolean).join(' ')),
});
const INNATE = {
  aarakocra: innate('Chamado do Vento', 'Wind Caller', 'A partir do nível 3, você conjura Rajada de Vento.', 'From level 3, you can cast Gust of Wind.'),
  'astral-elf': innate('Fogo Astral', 'Astral Fire', 'Você conhece um truque à escolha: Luzes Dançantes, Luz ou Chama Sagrada.', 'You know one cantrip of your choice: Dancing Lights, Light or Sacred Flame.', false),
  'deep-gnome': innate('Dom dos Svirfneblin', 'Gift of the Svirfneblin', 'A partir do nível 3, você conjura Disfarçar-se; a partir do nível 5, Não Detecção (em você).', 'From level 3, you can cast Disguise Self; from level 5, Nondetection (on yourself).'),
  duergar: innate('Magia Duergar', 'Duergar Magic', 'A partir do nível 3, você conjura Aumentar/Reduzir em você; a partir do nível 5, Invisibilidade em você.', 'From level 3, you can cast Enlarge/Reduce on yourself; from level 5, Invisibility on yourself.'),
  githyanki: innate('Psiônica Githyanki', 'Githyanki Psionics', 'Você conhece Mão Mágica (a mão é invisível). A partir do nível 3, conjura Salto; a partir do nível 5, Passo Brumoso.', 'You know Mage Hand (the hand is invisible). From level 3, you can cast Jump; from level 5, Misty Step.'),
  githzerai: innate('Psiônica Githzerai', 'Githzerai Psionics', 'Você conhece Mão Mágica (a mão é invisível). A partir do nível 3, conjura Escudo Arcano; a partir do nível 5, Detectar Pensamentos.', 'You know Mage Hand (the hand is invisible). From level 3, you can cast Shield; from level 5, Detect Thoughts.'),
  hexblood: innate('Magia de Bruxa', 'Hex Magic', 'Você conjura Disfarçar-se e Maldição.', 'You can cast Disguise Self and Hex.'),
};

const EXTRA_RACE_TRAITS = {
  "aarakocra": [
    {
      "name": {
        "pt": "Voo",
        "en": "Flight"
      },
      "desc": {
        "pt": "Por causa de suas asas, você tem um deslocamento de voo igual ao seu deslocamento de caminhada. Você não pode usar esse deslocamento de voo se estiver vestindo armadura média ou pesada.",
        "en": "Because of your wings, you have a flying speed equal to your walking speed. You can’t use this flying speed if you’re wearing medium or heavy armor."
      }
    },
    {
      "name": {
        "pt": "Garras",
        "en": "Talons"
      },
      "desc": {
        "pt": "Você tem garras que pode usar para fazer ataques desarmados. Quando você atinge com elas, o golpe causa 1d6 + seu modificador de Força de dano cortante, em vez do dano contundente normal para um ataque desarmado.",
        "en": "You have talons that you can use to make unarmed strikes. When you hit with them, the strike deals 1d6 + your Strength modifier slashing damage, instead of the bludgeoning damage normal for an unarmed strike."
      }
    },
    {
      "name": {
        "pt": "Chamado do Vento",
        "en": "Wind Caller"
      },
      "desc": {
        "pt": "A partir do 3º nível, você pode conjurar a magia rajada de vento com esta característica, sem exigir um componente material. Uma vez que conjurar a magia com esta característica, você não pode fazê-lo novamente até terminar um descanso longo. Você também pode conjurar a magia usando quaisquer espaços de magia que tiver de 2º círculo ou superior.\n\nInteligência, Sabedoria ou Carisma é a sua habilidade de conjuração para ela quando conjurar rajada de vento com esta característica (escolha quando selecionar esta raça).",
        "en": "Starting at 3rd level, you can cast the gust of wind spell with this trait, without requiring a material component. Once you cast the spell with this trait, you can’t do so again until you finish a long rest. You can also cast the spell using any spell slots you have of 2nd level or higher.\n\nIntelligence, Wisdom, or Charisma is your spellcasting ability for it when you cast gust of wind with this trait (choose when you select this race)."
      }
    }
  ],
  "astral-elf": [
    {
      "name": {
        "pt": "Fogo Astral",
        "en": "Astral Fire"
      },
      "desc": {
        "pt": "Você conhece um dos seguintes truques à sua escolha: luzes dançantes, luz ou chama sagrada. Inteligência, Sabedoria ou Carisma é a sua habilidade de conjuração para ele (escolha quando selecionar esta raça).",
        "en": "You know one of the following cantrips of your choice: dancing lights, light, or sacred flame. Intelligence, Wisdom, or Charisma is your spellcasting ability for it (choose when you select this race)."
      }
    },
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Você pode enxergar na meia-luz a até 18 metros de você como se fosse luz plena e na escuridão como se fosse meia-luz. Você discerne cores nessa escuridão apenas como tons de cinza.",
        "en": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray."
      }
    },
    {
      "name": {
        "pt": "Ancestral Feérico",
        "en": "Fey Ancestry"
      },
      "desc": {
        "pt": "Você tem vantagem em salvaguardas que fizer para evitar ou encerrar a condição enfeitiçado em si mesmo.",
        "en": "You have advantage on saving throws you make to avoid or end the charmed condition on yourself."
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
        "pt": "Passo Estelar",
        "en": "Starlight Step"
      },
      "desc": {
        "pt": "Como uma ação bônus, você pode se teletransportar magicamente até 9 metros para um espaço desocupado que possa ver. Você pode usar esta característica um número de vezes igual ao seu bônus de proficiência, e recupera todos os usos gastos ao terminar um descanso longo.",
        "en": "As a bonus action, you can magically teleport up to 30 feet to an unoccupied space you can see. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
      }
    },
    {
      "name": {
        "pt": "Transe Astral",
        "en": "Astral Trance"
      },
      "desc": {
        "pt": "Você não precisa dormir, e magia não pode colocá-lo para dormir. Você pode terminar um descanso longo em 4 horas se passar essas horas em uma meditação semelhante a um transe, durante a qual permanece consciente.\n\nSempre que você termina este transe, ganha proficiência em uma perícia de sua escolha e com uma arma ou ferramenta de sua escolha, selecionada do Livro do Jogador. Você adquire misticamente essas proficiências extraindo-as da memória élfica compartilhada e das experiências de entidades no Plano Astral, e você as mantém até terminar seu próximo descanso longo.",
        "en": "You don’t need to sleep, and magic can’t put you to sleep. You can finish a long rest in 4 hours if you spend those hours in a trancelike meditation, during which you remain conscious.\n\nWhenever you finish this trance, you gain proficiency in one skill of your choice and with one weapon or tool of your choice, selected from the Player’s Handbook. You mystically acquire these proficiencies by drawing them from shared elven memory and the experiences of entities on the Astral Plane, and you retain them until you finish your next long rest."
      }
    }
  ],
  "autognome": [
    {
      "name": {
        "pt": "Tipo de Criatura",
        "en": "Creature Type"
      },
      "desc": {
        "pt": "Você é um Construto.",
        "en": "You are a Construct."
      }
    },
    {
      "name": {
        "pt": "Carapaça Blindada",
        "en": "Armored Casing"
      },
      "desc": {
        "pt": "Você é revestido de metal fino ou outro material durável. Enquanto você não estiver vestindo armadura, sua Classe de Armadura básica é 13 + seu modificador de Destreza.",
        "en": "You are encased in thin metal or some other durable material. While you aren’t wearing armor, your base Armor Class is 13 + your Dexterity modifier."
      }
    },
    {
      "name": {
        "pt": "Feito para o Sucesso",
        "en": "Built for Success"
      },
      "desc": {
        "pt": "Você pode adicionar um d4 a uma jogada de ataque, teste de atributo ou salvaguarda que fizer, e pode fazer isso após ver o resultado do d20, mas antes dos efeitos da rolagem serem resolvidos. Você pode usar esta característica um número de vezes igual ao seu bônus de proficiência, e recupera todos os usos gastos ao terminar um descanso longo.",
        "en": "You can add a d4 to one attack roll, ability check, or saving throw you make, and you can do so after seeing the d20 but before the effects of the roll are resolved. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
      }
    },
    {
      "name": {
        "pt": "Máquina de Cura",
        "en": "Healing Machine"
      },
      "desc": {
        "pt": "Se a magia conserto for conjurada em você, você pode gastar um Dado de Vida, rolá-lo e recuperar um número de pontos de vida igual ao resultado da rolagem mais seu modificador de Constituição (mínimo de 1 ponto de vida).\n\nAlém disso, seu criador o projetou para se beneficiar de magias comuns que preservam a vida, mas que normalmente não afetam Construtos: curar ferimentos, palavra curativa e poupar os moribundos.",
        "en": "If the mending spell is cast on you, you can expend a Hit Die, roll it, and regain a number of hit points equal to the roll plus your Constitution modifier (minimum of 1 hit point).\n\nIn addition, your creator designed you to benefit from common spells that preserve life but that normally don’t affect Constructs: cure wounds, healing word, and spare the dying."
      }
    },
    {
      "name": {
        "pt": "Natureza Mecânica",
        "en": "Mechanical Nature"
      },
      "desc": {
        "pt": "Você tem resistência a dano de veneno e imunidade a doenças, e tem vantagem em salvaguardas contra ficar paralisado ou envenenado. Você não precisa comer, beber ou respirar.",
        "en": "You have resistance to poison damage and immunity to disease, and you have advantage on saving throws against being paralyzed or poisoned. You don’t need to eat, drink, or breathe."
      }
    },
    {
      "name": {
        "pt": "Descanso de Sentinela",
        "en": "Sentry’s Rest"
      },
      "desc": {
        "pt": "Quando você realiza um descanso longo, passa pelo menos 6 horas em um estado inativo e imóvel, em vez de dormir. Nesse estado, você aparenta estar inerte, mas não está inconsciente.",
        "en": "When you take a long rest, you spend at least 6 hours in an inactive, motionless state, instead of sleeping. In this state, you appear inert, but you aren’t unconscious."
      }
    },
    {
      "name": {
        "pt": "Projeto Especializado",
        "en": "Specialized Design"
      },
      "desc": {
        "pt": "Você ganha duas proficiências em ferramentas de sua escolha, selecionadas do Livro do Jogador.",
        "en": "You gain two tool proficiencies of your choice, selected from the Player’s Handbook."
      }
    }
  ],
  "duergar": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Você pode enxergar na meia-luz a até 36 metros de você como se fosse luz plena, e na escuridão como se fosse meia-luz. Você discerne cores nessa escuridão apenas como tons de cinza.",
        "en": "You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray."
      }
    },
    {
      "name": {
        "pt": "Magia Duergar",
        "en": "Duergar Magic"
      },
      "desc": {
        "pt": "A partir do 3º nível, você pode conjurar Aumentar/Reduzir em você com esta característica, sem exigir um componente material. A partir do 5º nível, você também pode conjurar a magia invisibilidade em si mesmo com esta característica, sem exigir um componente material. Uma vez que conjurar qualquer uma dessas magias com esta característica, você não pode conjurar essa magia com ela novamente até terminar um descanso longo. Você também pode conjurar essas magias usando espaços de magia que tiver do círculo apropriado.\n\nInteligência, Sabedoria ou Carisma é a sua habilidade de conjuração para essas magias quando você as conjura com esta característica (escolha quando selecionar esta raça).",
        "en": "Starting at 3rd level, you can cast Enlarge/Reduce on yourself with this trait, without requiring a material component. Starting at 5th level, you can also cast the invisibility spell on yourself with this trait, without requiring a material component. Once you cast either of these spells with this trait, you can't cast that spell with it again until you finish a long rest. You can also cast these spells using spell slots you have of the appropriate level.\n\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race)."
      }
    },
    {
      "name": {
        "pt": "Resiliência Anã",
        "en": "Dwarven Resilience"
      },
      "desc": {
        "pt": "Você tem vantagem em salvaguardas que fizer para evitar ou encerrar a condição envenenado em si mesmo. Você também tem resistência a dano de veneno.",
        "en": "You have advantage on saving throws you make to avoid or end the poisoned condition on yourself. You also have resistance to poison damage."
      }
    },
    {
      "name": {
        "pt": "Fortitude Psiônica",
        "en": "Psionic Fortitude"
      },
      "desc": {
        "pt": "Você tem vantagem em salvaguardas que fizer para evitar ou encerrar a condição enfeitiçado ou atordoado em si mesmo.",
        "en": "You have advantage on saving throws you make to avoid or end the charmed or stunned condition on yourself."
      }
    }
  ],
  "eladrin": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Você pode enxergar na meia-luz a até 18 metros de você como se fosse luz plena, e na escuridão como se fosse meia-luz. Você discerne cores nessa escuridão apenas como tons de cinza.",
        "en": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray."
      }
    },
    {
      "name": {
        "pt": "Ancestral Feérico",
        "en": "Fey Ancestry"
      },
      "desc": {
        "pt": "Você tem vantagem em salvaguardas que fizer para evitar ou encerrar a condição enfeitiçado em si mesmo.",
        "en": "You have advantage on saving throws you make to avoid or end the charmed condition on yourself."
      }
    },
    {
      "name": {
        "pt": "Passo Feérico",
        "en": "Fey Step"
      },
      "desc": {
        "pt": "Como uma ação bônus, você pode se teletransportar magicamente até 9 metros para um espaço desocupado que possa ver. Você pode usar esta característica um número de vezes igual ao seu bônus de proficiência, e recupera todos os usos gastos ao terminar um descanso longo.\n\nQuando você atinge o 3º nível, seu Passo Feérico ganha um efeito adicional baseado em sua estação; se o efeito exigir uma salvaguarda, a CD é igual a 8 + seu bônus de proficiência + seu modificador de Inteligência, Sabedoria ou Carisma (escolha quando selecionar esta raça):\n\n• Outono. Imediatamente após usar seu Passo Feérico, até duas criaturas de sua escolha que você possa ver a até 3 metros de você devem ser bem-sucedidas em uma salvaguarda de Sabedoria ou ficarão enfeitiçadas por você durante 1 minuto, ou até você ou seus companheiros causarem qualquer dano a elas.\n\n• Inverno. Quando você usa seu Passo Feérico, uma criatura de sua escolha que você possa ver a até 1,5 metro de você antes de se teletransportar deve ser bem-sucedida em uma salvaguarda de Sabedoria ou ficará amedrontada por você até o final do seu próximo turno.\n\n• Primavera. Quando você usa seu Passo Feérico, você pode tocar uma criatura voluntária a até 1,5 metro de você. Essa criatura se teletransporta no seu lugar, aparecendo em um espaço desocupado de sua escolha que você possa ver a até 9 metros de você.\n\n• Verão. Imediatamente após usar seu Passo Feérico, cada criatura de sua escolha que você possa ver a até 1,5 metro de você sofre dano de fogo igual ao seu bônus de proficiência.",
        "en": "As a bonus action, you can magically teleport up to 30 feet to an unoccupied space you can see. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.\n\nWhen you reach 3rd level, your Fey Step gains an additional effect based on your season; if the effect requires a saving throw, the DC equals 8 + your proficiency bonus + your Intelligence, Wisdom, or Charisma modifier (choose when you select this race):\n\n• Autumn. Immediately after you use your Fey Step, up to two creatures of your choice that you can see within 10 feet of you must succeed on a Wisdom saving throw or be charmed by you for 1 minute, or until you or your companions deal any damage to the creatures.\n\n• Winter. When you use your Fey Step, one creature of your choice that you can see within 5 feet of you before you teleport must succeed on a Wisdom saving throw or be frightened of you until the end of your next turn.\n\n• Spring. When you use your Fey Step, you can touch one willing creature within 5 feet of you. That creature then teleports instead of you, appearing in an unoccupied space of your choice that you can see within 30 feet of you.\n\n• Summer. Immediately after you use your Fey Step, each creature of your choice that you can see within 5 feet of you takes fire damage equal to your proficiency bonus."
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
        "pt": "Transe",
        "en": "Trance"
      },
      "desc": {
        "pt": "Você não precisa dormir, e magia não pode colocá-lo para dormir. Você pode terminar um descanso longo em 4 horas se passar essas horas em uma meditação semelhante a um transe, durante a qual permanece consciente.\n\nSempre que você termina este transe, você pode ganhar duas proficiências que não possua, cada uma com uma arma ou ferramenta de sua escolha selecionada do Livro do Jogador. Você adquire misticamente essas proficiências extraindo-as da memória élfica compartilhada, e você as mantém até terminar seu próximo descanso longo.",
        "en": "You don't need to sleep, and magic can't put you to sleep. You can finish a long rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness.\n\nWhenever you finish this trance, you can gain two proficiencies that you don't have, each one with a weapon or a tool of your choice selected from the Player's Handbook. You mystically acquire these proficiencies by drawing them from shared elven memory, and you retain them until you finish your next long rest."
      }
    }
  ],
  "sea-elf": [
    {
      "name": {
        "pt": "Filho do Mar",
        "en": "Child of the Sea"
      },
      "desc": {
        "pt": "Você pode respirar ar e água, e tem resistência a dano de frio.",
        "en": "You can breathe air and water, and you have resistance to cold damage."
      }
    },
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Você pode enxergar na meia-luz a até 18 metros de você como se fosse luz plena, e na escuridão como se fosse meia-luz. Você discerne cores nessa escuridão apenas como tons de cinza.",
        "en": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray."
      }
    },
    {
      "name": {
        "pt": "Ancestral Feérico",
        "en": "Fey Ancestry"
      },
      "desc": {
        "pt": "Você tem vantagem em salvaguardas que fizer para evitar ou encerrar a condição enfeitiçado em si mesmo.",
        "en": "You have advantage on saving throws you make to avoid or end the charmed condition on yourself."
      }
    },
    {
      "name": {
        "pt": "Amigo do Mar",
        "en": "Friend of the Sea"
      },
      "desc": {
        "pt": "Animais aquáticos possuem uma afinidade extraordinária com o seu povo. Você pode comunicar ideias simples a qualquer Fera que possua deslocamento de natação. Ela pode entender suas palavras, embora você não tenha nenhuma habilidade especial para compreendê-la em troca.",
        "en": "Aquatic animals have an extraordinary affinity with your people. You can communicate simple ideas to any Beast that has a swimming speed. It can understand your words, though you have no special ability to understand it in return."
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
        "pt": "Transe",
        "en": "Trance"
      },
      "desc": {
        "pt": "Você não precisa dormir, e magia não pode colocá-lo para dormir. Você pode terminar um descanso longo em 4 horas se passar essas horas em uma meditação semelhante a um transe, durante a qual permanece consciente.\n\nSempre que você termina este transe, você pode ganhar duas proficiências que não possua, cada uma com uma arma ou ferramenta de sua escolha selecionada do Livro do Jogador. Você adquire misticamente essas proficiências extraindo-as da memória élfica compartilhada, e você as mantém até terminar seu próximo descanso longo.",
        "en": "You don't need to sleep, and magic can't put you to sleep. You can finish a long rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness.\n\nWhenever you finish this trance, you can gain two proficiencies that you don't have, each one with a weapon or a tool of your choice selected from the Player's Handbook. You mystically acquire these proficiencies by drawing them from shared elven memory, and you retain them until you finish your next long rest."
      }
    }
  ],
  "shadar-kai": [
    {
      "name": {
        "pt": "Bênção da Rainha Corvo",
        "en": "Blessing of the Raven Queen"
      },
      "desc": {
        "pt": "Como uma ação bônus, você pode se teletransportar magicamente até 9 metros para um espaço desocupado que possa ver. Você pode usar esta característica um número de vezes igual ao seu bônus de proficiência, e recupera todos os usos gastos ao terminar um descanso longo.\n\nA partir do 3º nível, você também ganha resistência a todo dano quando se teletransporta usando esta característica. A resistência dura até o início do seu próximo turno. Durante esse tempo, você aparenta ser fantasmagórico e translúcido.",
        "en": "As a bonus action, you can magically teleport up to 30 feet to an unoccupied space you can see. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.\n\nStarting at 3rd level, you also gain resistance to all damage when you teleport using this trait. The resistance lasts until the start of your next turn. During that time, you appear ghostly and translucent."
      }
    },
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Você pode enxergar na meia-luz a até 18 metros de você como se fosse luz plena, e na escuridão como se fosse meia-luz. Você discerne cores nessa escuridão apenas como tons de cinza.",
        "en": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray."
      }
    },
    {
      "name": {
        "pt": "Ancestral Feérico",
        "en": "Fey Ancestry"
      },
      "desc": {
        "pt": "Você tem vantagem em salvaguardas que fizer para evitar ou encerrar a condição enfeitiçado em si mesmo.",
        "en": "You have advantage on saving throws you make to avoid or end the charmed condition on yourself."
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
        "pt": "Resistência Necrótica",
        "en": "Necrotic Resistance"
      },
      "desc": {
        "pt": "Você tem resistência a dano necrótico.",
        "en": "You have resistance to necrotic damage."
      }
    },
    {
      "name": {
        "pt": "Transe",
        "en": "Trance"
      },
      "desc": {
        "pt": "Você não precisa dormir, e magia não pode colocá-lo para dormir. Você pode terminar um descanso longo em 4 horas se passar essas horas em uma meditação semelhante a um transe, durante a qual permanece consciente.\n\nSempre que você termina este transe, você pode ganhar duas proficiências que não possua, cada uma com uma arma ou ferramenta de sua escolha selecionada do Livro do Jogador. Você adquire misticamente essas proficiências extraindo-as da memória élfica compartilhada, e você as mantém até terminar seu próximo descanso longo.",
        "en": "You don't need to sleep, and magic can't put you to sleep. You can finish a long rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness.\n\nWhenever you finish this trance, you can gain two proficiencies that you don't have, each one with a weapon or a tool of your choice selected from the Player's Handbook. You mystically acquire these proficiencies by drawing them from shared elven memory, and you retain them until you finish your next long rest."
      }
    }
  ],
  "deep-gnome": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Você pode enxergar na meia-luz a até 36 metros de você como se fosse luz plena, e na escuridão como se fosse meia-luz. Você discerne cores nessa escuridão apenas como tons de cinza.",
        "en": "You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray."
      }
    },
    {
      "name": {
        "pt": "Dom dos Svirfneblin",
        "en": "Gift of the Svirfneblin"
      },
      "desc": {
        "pt": "A partir do 3º nível, você pode conjurar a magia disfarçar-se com esta característica. A partir do 5º nível, você também pode conjurar a magia dificultar detecção com ela, sem exigir um componente material. Uma vez que conjurar qualquer uma dessas magias com esta característica, você não pode conjurar essa magia com ela novamente até terminar um descanso longo. Você também pode conjurar essas magias usando espaços de magia que tiver do círculo apropriado.\n\nInteligência, Sabedoria ou Carisma é a sua habilidade de conjuração para essas magias quando você as conjura com esta característica (escolha quando selecionar esta raça). Nenhuma dessas magias exige componentes de magia quando você as conjura com esta característica.",
        "en": "Starting at 3rd level, you can cast the disguise self spell with this trait. Starting at 5th level, you can also cast the nondetection spell with it, without requiring a material component. Once you cast either of these spells with this trait, you can't cast that spell with it again until you finish a long rest. You can also cast these spells using spell slots you have of the appropriate level.\n\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race). None of these spells require spell components when you cast them with this trait."
      }
    },
    {
      "name": {
        "pt": "Resistência Mágica Gnômica",
        "en": "Gnomish Magic Resistance"
      },
      "desc": {
        "pt": "Você tem vantagem em salvaguardas de Inteligência, Sabedoria e Carisma contra magias.",
        "en": "You have advantage on Intelligence, Wisdom, and Charisma saving throws against spells."
      }
    },
    {
      "name": {
        "pt": "Camuflagem Svirfneblin",
        "en": "Svirfneblin Camouflage"
      },
      "desc": {
        "pt": "Quando você faz um teste de Destreza (Furtividade), você pode fazer o teste com vantagem. Você pode usar esta característica um número de vezes igual ao seu bônus de proficiência, e recupera todos os usos gastos ao terminar um descanso longo.",
        "en": "When you make a Dexterity (Stealth) check, you can make the check with advantage. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
      }
    }
  ],
  "giff": [
    {
      "name": {
        "pt": "Centelha Astral",
        "en": "Astral Spark"
      },
      "desc": {
        "pt": "Sua conexão psíquica com o Plano Astral permite que você acesse misticamente uma faísca de poder divino, a qual você pode canalizar através de suas armas. Quando você atinge um alvo com uma arma simples ou marcial, você pode fazer com que o alvo sofra dano de energia extra igual ao seu bônus de proficiência.\n\nVocê pode usar esta característica um número de vezes igual ao seu bônus de proficiência, mas não pode usá-la mais de uma vez por turno. Você recupera todos os usos gastos ao terminar um descanso longo.",
        "en": "Your psychic connection to the Astral Plane enables you to mystically access a spark of divine power, which you can channel through your weapons. When you hit a target with a simple or martial weapon, you can cause the target to take extra force damage equal to your proficiency bonus.\n\nYou can use this trait a number of times equal to your proficiency bonus, but you can use it no more than once per turn. You regain all expended uses when you finish a long rest."
      }
    },
    {
      "name": {
        "pt": "Maestria em Armas de Fogo",
        "en": "Firearms Mastery"
      },
      "desc": {
        "pt": "Você possui uma conexão mística com armas de fogo que remonta aos deuses dos giff, que se deliciavam com tais armas. Você tem proficiência com todas as armas de fogo e ignora a propriedade de recarga de qualquer arma de fogo. Além disso, atacar a longo alcance com uma arma de fogo não impõe desvantagem na sua jogada de ataque.",
        "en": "You have a mystical connection to firearms that traces back to the gods of the giff, who delighted in such weapons. You have proficiency with all firearms and ignore the loading property of any firearm. In addition, attacking at long range with a firearm doesn’t impose disadvantage on your attack roll."
      }
    },
    {
      "name": {
        "pt": "Porte de Hipopótamo",
        "en": "Hippo Build"
      },
      "desc": {
        "pt": "Você tem vantagem em testes de atributo baseados em Força e salvaguardas de Força. Além disso, você conta como um tamanho maior ao determinar sua capacidade de carga e o peso que pode empurrar, arrastar ou erguer.",
        "en": "You have advantage on Strength-based ability checks and Strength saving throws. In addition, you count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift."
      }
    }
  ],
  "githyanki": [
    {
      "name": {
        "pt": "Conhecimento Astral",
        "en": "Astral Knowledge"
      },
      "desc": {
        "pt": "Você pode acessar misticamente um reservatório de experiências de entidades conectadas ao Plano Astral. Sempre que terminar um descanso longo, você ganha proficiência em uma perícia de sua escolha e com uma arma ou ferramenta de sua escolha, selecionada do Livro do Jogador, ao projetar momentaneamente sua consciência no Plano Astral. Essas proficiências duram até o final do seu próximo descanso longo.",
        "en": "You can mystically access a reservoir of experiences of entities connected to the Astral Plane. Whenever you finish a long rest, you gain proficiency in one skill of your choice and with one weapon or tool of your choice, selected from the Player's Handbook, as you momentarily project your consciousness into the Astral Plane. These proficiencies last until the end of your next long rest."
      }
    },
    {
      "name": {
        "pt": "Psiônica Githyanki",
        "en": "Githyanki Psionics"
      },
      "desc": {
        "pt": "Você conhece o truque mãos mágicas, e a mão é invisível quando você conjura o truque com esta característica.\n\nA partir do 3º nível, você pode conjurar a magia salto com esta característica. A partir do 5º nível, você também pode conjurar a magia passo nebuloso com ela. Uma vez que conjurar salto ou passo nebuloso com esta característica, você não pode conjurar essa magia com ela novamente até terminar um descanso longo. Você também pode conjurar qualquer uma dessas magias usando quaisquer espaços de magia que tiver do círculo apropriado.\n\nInteligência, Sabedoria ou Carisma é a sua habilidade de conjuração para essas magias quando você as conjura com esta característica (escolha quando selecionar esta raça). Nenhuma dessas magias exige componentes de magia quando você as conjura com esta característica.",
        "en": "You know the mage hand cantrip, and the hand is invisible when you cast the cantrip with this trait.\n\nStarting at 3rd level, you can cast the jump spell with this trait. Starting at 5th level, you can also cast the misty step spell with it. Once you cast jump or misty step with this trait, you can't cast that spell with it again until you finish a long rest. You can also cast either of those spells using any spell slots you have of the appropriate level.\n\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race). None of these spells require spell components when you cast them with this trait."
      }
    },
    {
      "name": {
        "pt": "Resistência Psíquica",
        "en": "Psychic Resilience"
      },
      "desc": {
        "pt": "Você tem resistência a dano psíquico.",
        "en": "You have resistance to psychic damage."
      }
    }
  ],
  "githzerai": [
    {
      "name": {
        "pt": "Psiônica Githzerai",
        "en": "Githzerai Psionics"
      },
      "desc": {
        "pt": "Você conhece o truque mãos mágicas, e a mão é invisível quando você conjura o truque com esta característica.\n\nA partir do 3º nível, você pode conjurar a magia escudo arcano com esta característica. A partir do 5º nível, você também pode conjurar a magia detectar pensamentos com ela. Uma vez que conjurar escudo arcano ou detectar pensamentos com esta característica, você não pode conjurar essa magia com ela novamente até terminar um descanso longo. Você também pode conjurar qualquer uma dessas magias usando quaisquer espaços de magia que tiver do círculo apropriado.\n\nInteligência, Sabedoria ou Carisma é a sua habilidade de conjuração para essas magias quando você as conjura com esta característica (escolha quando selecionar esta raça). Nenhuma dessas magias exige componentes de magia quando você as conjura com esta característica.",
        "en": "You know the mage hand cantrip, and the hand is invisible when you cast the cantrip with this trait.\n\nStarting at 3rd level, you can cast the shield spell with this trait. Starting at 5th level, you can also cast the detect thoughts spell with it. Once you cast shield or detect thoughts with this trait, you can't cast that spell with it again until you finish a long rest. You can also cast either of those spells using any spell slots you have of the appropriate level.\n\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race). None of these spells require spell components when you cast them with this trait."
      }
    },
    {
      "name": {
        "pt": "Disciplina Mental",
        "en": "Mental Discipline"
      },
      "desc": {
        "pt": "Suas defesas psíquicas inatas concedem a você vantagem em salvaguardas que fizer para evitar ou encerrar as condições enfeitiçado e amedrontado em si mesmo.",
        "en": "Your innate psychic defenses grant you advantage on saving throws you make to avoid or end the charmed and frightened conditions on yourself."
      }
    },
    {
      "name": {
        "pt": "Resistência Psíquica",
        "en": "Psychic Resilience"
      },
      "desc": {
        "pt": "Você tem resistência a dano psíquico.",
        "en": "You have resistance to psychic damage."
      }
    }
  ],
  "hadozee": [
    {
      "name": {
        "pt": "Pés Ágeis",
        "en": "Dexterous Feet"
      },
      "desc": {
        "pt": "Como uma Ação Bônus, você pode usar seus membros inferiores para manipular um objeto, abrir ou fechar uma porta ou recipiente, ou apanhar ou pousar um objeto Miúdo.",
        "en": "As a bonus action, you can use your feet to manipulate an object, open or close a door or container, or pick up or set down a Tiny object."
      }
    },
    {
      "name": {
        "pt": "Planar",
        "en": "Glide"
      },
      "desc": {
        "pt": "Quando você cair pelo menos 3 metros acima do chão, pode usar sua Reação para estender suas membranas de pele e planar horizontalmente uma distância igual ao seu deslocamento de caminhada, e não sofre dano pela queda. Você determina a direção do planeio.",
        "en": "When you fall at least 10 feet above the ground, you can use your reaction to extend your skin membranes to glide horizontally a number of feet equal to your walking speed, and you take 0 damage from the fall. You determine the direction of the glide."
      }
    },
    {
      "name": {
        "pt": "Resiliência Hadozee",
        "en": "Hadozee Resilience"
      },
      "desc": {
        "pt": "A magia que corre em suas veias eleva suas defesas naturais. Quando sofrer dano, você pode usar sua Reação para rolar um d6. Adicione seu Bônus de Proficiência ao número rolado e reduza o dano sofrido por um valor igual a esse total (mínimo de 0 de dano).\n\nVocê pode usar este traço um número de vezes igual ao seu Bônus de Proficiência. Você recupera todos os usos gastos ao terminar um Descanso Longo.",
        "en": "The magic that runs in your veins heightens your natural defenses. When you take damage, you can use your reaction to roll a d6. Add your proficiency bonus to the number rolled, and reduce the damage you take by an amount equal to that total (minimum of 0 damage).\n\nYou can use this trait a number of times equal to your proficiency bonus. You regain all expended uses when you finish a long rest."
      }
    }
  ],
  "kalashtar": [
    {
      "name": {
        "pt": "Mente Dual",
        "en": "Dual Mind"
      },
      "desc": {
        "pt": "Você tem Vantagem em todas as salvaguardas de Sabedoria.",
        "en": "You have advantage on all Wisdom saving throws."
      }
    },
    {
      "name": {
        "pt": "Disciplina Mental",
        "en": "Mental Discipline"
      },
      "desc": {
        "pt": "Você tem resistência a dano psíquico.",
        "en": "You have resistance to psychic damage."
      }
    },
    {
      "name": {
        "pt": "Elo Mental",
        "en": "Mind Link"
      },
      "desc": {
        "pt": "Você pode falar telepaticamente com qualquer criatura que possa ver, desde que a criatura esteja a uma distância de você igual a 3 metros vezes o seu nível. Você não precisa compartilhar um idioma com a criatura para que ela compreenda suas declarações telepáticas, mas a criatura deve ser capaz de compreender pelo menos um idioma.\n\nQuando estiver usando este traço para falar telepaticamente com uma criatura, você pode usar sua Ação para conceder a essa criatura a capacidade de falar telepaticamente com você durante 1 hora ou até você encerrar este efeito com uma Ação. Para usar essa habilidade, a criatura deve ser capaz de ver você e deve estar dentro do alcance deste traço. Você pode conceder essa habilidade a apenas uma criatura por vez; concedê-la a uma criatura a remove de outra criatura que a possua.",
        "en": "You can speak telepathically to any creature you can see, provided the creature is within a number of feet of you equal to 10 times your level. You don’t need to share a language with the creature for it to understand your telepathic utterances, but the creature must be able to understand at least one language.\n\nWhen you’re using this trait to speak telepathically to a creature, you can use your action to give that creature the ability to speak telepathically with you for 1 hour or until you end this effect as an action. To use this ability, the creature must be able to see you and must be within this trait’s range. You can give this ability to only one creature at a time; giving it to a creature takes it away from another creature who has it."
      }
    },
    {
      "name": {
        "pt": "Separado dos Sonhos",
        "en": "Severed from Dreams"
      },
      "desc": {
        "pt": "Os kalashtar dormem, mas não se conectam ao plano dos sonhos como as outras criaturas fazem. Em vez disso, suas mentes extraem lembranças de seu espírito de outro mundo enquanto dormem. Dessa forma, você é imune a magias e outros efeitos mágicos que exijam que você sonhe, como sonho, mas não a magias e outros efeitos mágicos que façam você adormecer, como sono.",
        "en": "Kalashtar sleep, but they don’t connect to the plane of dreams as other creatures do. Instead, their minds draw from the memories of their otherworldly spirit while they sleep. As such, you are immune to spells and other magical effects that require you to dream, like dream, but not to spells and other magical effects that put you to sleep, like sleep."
      }
    }
  ],
  "kender": [
    {
      "name": {
        "pt": "Destemido",
        "en": "Fearless"
      },
      "desc": {
        "pt": "Você tem Vantagem em salvaguardas que realizar para evitar ou encerrar a condição Amedrontado em você. Quando falhar em uma salvaguarda para evitar ou encerrar a condição Amedrontado em você, você pode escolher obter sucesso no lugar. Uma vez que obtenha sucesso em uma salvaguarda desta forma, você não poderá fazê-lo novamente até terminar um Descanso Longo.",
        "en": "You have advantage on saving throws you make to avoid or end the frightened condition on yourself. When you fail a saving throw to avoid or end the frightened condition on yourself, you can choose to succeed instead. Once you succeed on a saving throw this way, you can't do so again until you finish a long rest."
      }
    },
    {
      "name": {
        "pt": "Aptidão Kender",
        "en": "Kender Aptitude"
      },
      "desc": {
        "pt": "Graças à origem mística do seu povo, você ganha proficiência em uma das seguintes perícias à sua escolha: Intuição, Investigação, Prestidigitação, Furtividade ou Sobrevivência.",
        "en": "Thanks to the mystical origin of your people, you gain proficiency with one of the following skills of your choice: Insight, Investigation, Sleight of Hand, Stealth, or Survival."
      }
    },
    {
      "name": {
        "pt": "Provocar",
        "en": "Taunt"
      },
      "desc": {
        "pt": "Você tem uma capacidade extraordinária de desconcertar criaturas. Como uma Ação Bônus, você pode desferir uma série de palavras provocadoras contra uma criatura a até 18 metros de você que possa ouvi-lo e compreendê-lo. O alvo deve ser bem-sucedido em uma salvaguarda de Sabedoria ou terá Desvantagem em jogadas de ataque contra alvos que não sejam você até o início do seu próximo turno. A CD é igual a 8 + seu Bônus de Proficiência + seu modificador de Inteligência, Sabedoria ou Carisma (escolha ao selecionar esta raça).\n\nVocê pode usar esta Ação Bônus um número de vezes igual ao seu Bônus de Proficiência e recupera todos os usos gastos ao terminar um Descanso Longo.",
        "en": "You have an extraordinary ability to fluster creatures. As a bonus action, you can unleash a string of provoking words at a creature within 60 feet of yourself that can hear and understand you. The target must succeed on a Wisdom saving throw, or it has disadvantage on attack rolls against targets other than you until the start of your next turn. The DC equals 8 + your proficiency bonus + your Intelligence, Wisdom, or Charisma modifier (choose when you select this race).\n\nYou can use this bonus action a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
      }
    }
  ],
  "locathah": [
    {
      "name": {
        "pt": "Armadura Natural",
        "en": "Natural Armor"
      },
      "desc": {
        "pt": "Você possui uma pele dura e escamosa. Quando não estiver usando armadura, sua CA é 12 + seu modificador de Destreza. Você pode usar sua armadura natural para determinar sua CA se a armadura que estiver usando deixar você com uma CA menor. Os benefícios de um escudo se aplicam normalmente enquanto você usa sua armadura natural.\n\nObservador e Atlético. Você tem proficiência nas perícias Atletismo e Percepção.",
        "en": "You have tough, scaly skin. When you aren’t wearing armor, your AC is 12 + your Dexterity modifier. You can use your natural armor to determine your AC if the armor you wear would leave you with a lower AC. A shield’s benefits apply as normal while you use your natural armor.\n\nObservant & Athletic. You have proficiency in the Athletics and Perception skills."
      }
    },
    {
      "name": {
        "pt": "Vontade de Leviatã",
        "en": "Leviathan Will"
      },
      "desc": {
        "pt": "Você tem Vantagem em salvaguardas contra ser Enfeitiçado, Amedrontado, Paralisado, Envenenado, Atordoado ou adormecido.",
        "en": "You have advantage on saving throws against being charmed, frightened, paralyzed, poisoned, stunned, or put to sleep."
      }
    },
    {
      "name": {
        "pt": "Anfíbio Limitado",
        "en": "Limited Amphibiousness"
      },
      "desc": {
        "pt": "Você pode respirar ar e água, mas precisa se submergir pelo menos uma vez a cada 4 horas para evitar sufocamento.",
        "en": "You can breathe air and water, but you need to be submerged at least once every 4 hours to avoid suffocating."
      }
    }
  ],
  "loxodon": [
    {
      "name": {
        "pt": "Porte Poderoso",
        "en": "Powerful Build"
      },
      "desc": {
        "pt": "Você é considerado um tamanho maior ao determinar sua capacidade de carga e o peso que pode empurrar, arrastar ou erguer.",
        "en": "You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift."
      }
    },
    {
      "name": {
        "pt": "Serenidade Loxodonte",
        "en": "Loxodon Serenity"
      },
      "desc": {
        "pt": "Você tem Vantagem em salvaguardas contra ser Enfeitiçado ou Amedrontado.",
        "en": "You have advantage on saving throws against being charmed or frightened."
      }
    },
    {
      "name": {
        "pt": "Armadura Natural",
        "en": "Natural Armor"
      },
      "desc": {
        "pt": "Você possui uma pele espessa e coriácea. Quando não estiver usando armadura, sua CA é 12 + seu modificador de Constituição. Você pode usar sua armadura natural para determinar sua CA se a armadura que estiver usando deixar você com uma CA menor. Os benefícios de um escudo se aplicam normalmente enquanto você usa sua armadura natural.",
        "en": "You have thick, leathery skin. When you aren’t wearing armor, your AC is 12 + your Constitution modifier. You can use your natural armor to determine your AC if the armor you wear would leave you with a lower AC. A shield’s benefits apply as normal while you use your natural armor."
      }
    },
    {
      "name": {
        "pt": "Tromba",
        "en": "Trunk"
      },
      "desc": {
        "pt": "Você pode segurar coisas com sua tromba e pode usá-la como um snorkel. Ela tem um alcance de 1,5 metro e pode erguer um peso em quilos igual a 2,5 vezes o seu valor de Força. Você pode usá-la para realizar as seguintes tarefas simples: erguer, soltar, segurar, empurrar ou puxar um objeto ou uma criatura; abrir ou fechar uma porta ou um recipiente; agarrar alguém; ou desferir um golpe desarmado. Seu Mestre pode permitir que outras tarefas simples sejam adicionadas a essa lista de opções.\n\nSua tromba não pode empunhar armas ou escudos nem realizar qualquer ação que exija precisão manual, como usar ferramentas ou itens mágicos ou executar os componentes somáticos de uma magia.",
        "en": "You can grasp things with your trunk, and you can use it as a snorkel. It has a reach of 5 feet, and it can lift a number of pounds equal to five times your Strength score. You can use it to do the following simple tasks: lift, drop, hold, push, or pull an object or a creature; open or close a door or a container; grapple someone; or make an unarmed strike. Your DM might allow other simple tasks to be added to that list of options.\n\nYour trunk can’t wield weapons or shields or do anything that requires manual precision, such as using tools or magic items or performing the somatic components of a spell."
      }
    },
    {
      "name": {
        "pt": "Olfato Aguçado",
        "en": "Keen Smell"
      },
      "desc": {
        "pt": "Graças à sua tromba sensível, você tem Vantagem em testes de Sabedoria (Percepção), Sabedoria (Sobrevivência) e Inteligência (Investigação) que envolvam o olfato.",
        "en": "Thanks to your sensitive trunk, you have advantage on Wisdom (Perception), Wisdom (Survival), and Intelligence (Investigation) checks that involve smell."
      }
    }
  ],
  "owlin": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Você pode enxergar na penumbra a até 36 metros de você como se fosse luz plena e na escuridão como se fosse penumbra. Nessa escuridão, você discerne cores apenas como tons de cinza.",
        "en": "You can see in dim light within 120 feet of yourself as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray."
      }
    },
    {
      "name": {
        "pt": "Voo",
        "en": "Flight"
      },
      "desc": {
        "pt": "Graças às suas asas, você tem um deslocamento de voo igual ao seu deslocamento de caminhada. Você não pode usar este deslocamento de voo se estiver usando armadura média ou pesada.",
        "en": "Thanks to your wings, you have a flying speed equal to your walking speed. You can’t use this flying speed if you’re wearing medium or heavy armor."
      }
    },
    {
      "name": {
        "pt": "Penas Silenciosas",
        "en": "Silent Feathers"
      },
      "desc": {
        "pt": "Você tem proficiência na perícia Furtividade.",
        "en": "You have proficiency in the Stealth skill."
      }
    }
  ],
  "plasmoid": [
    {
      "name": {
        "pt": "Tipo de Criatura",
        "en": "Creature Type"
      },
      "desc": {
        "pt": "Você é uma Gosma.",
        "en": "You are an Ooze."
      }
    },
    {
      "name": {
        "pt": "Amorfo",
        "en": "Amorphous"
      },
      "desc": {
        "pt": "Você pode se espremer por um espaço tão estreito quanto 2,5 cm de largura, desde que não esteja vestindo nem carregando nada. Você tem Vantagem em testes de atributo realizados para iniciar ou escapar de uma manobra de agarrar.",
        "en": "You can squeeze through a space as narrow as 1 inch wide, provided you are wearing and carrying nothing. You have advantage on ability checks you make to initiate or escape a grapple."
      }
    },
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Você pode enxergar na meia-luz a até 18 metros de você como se fosse luz plena e na escuridão como se fosse meia-luz. Você discerne cores nessa escuridão apenas como tons de cinza.",
        "en": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray."
      }
    },
    {
      "name": {
        "pt": "Prender a Respiração",
        "en": "Hold Breath"
      },
      "desc": {
        "pt": "Você pode prender a respiração por 1 hora.",
        "en": "You can hold your breath for 1 hour."
      }
    },
    {
      "name": {
        "pt": "Resiliência Natural",
        "en": "Natural Resilience"
      },
      "desc": {
        "pt": "Você tem resistência a dano de ácido e veneno, e tem Vantagem em salvaguardas contra ser Envenenado.",
        "en": "You have resistance to acid and poison damage, and you have advantage on saving throws against being poisoned."
      }
    },
    {
      "name": {
        "pt": "Moldar-se",
        "en": "Shape Self"
      },
      "desc": {
        "pt": "Como uma Ação, você pode remodelar seu corpo para criar uma cabeça, um ou dois braços, uma ou duas pernas e mãos e membros inferiores improvisados, ou pode reverter a uma bolha sem membros. Enquanto tiver um formato humanoide, você pode usar roupas e armaduras feitas para um Humanoide do seu tamanho.\n\nComo uma Ação Bônus, você pode projetar um pseudópode de até 15 cm de largura e 3 metros de comprimento ou reabsorvê-lo em seu corpo. Como parte da mesma Ação Bônus, você pode usar este pseudópode para manipular um objeto, abrir ou fechar uma porta ou recipiente, ou pegar ou pousar um objeto Miúdo. O pseudópode não contém órgãos sensoriais e não pode atacar, ativar itens mágicos ou erguer mais de 4,5 quilos.",
        "en": "As an action, you can reshape your body to give yourself a head, one or two arms, one or two legs, and makeshift hands and feet, or you can revert to a limbless blob. While you have a humanlike shape, you can wear clothing and armor made for a Humanoid of your size.\n\nAs a bonus action, you can extrude a pseudopod that is up to 6 inches wide and 10 feet long or reabsorb it into your body. As part of the same bonus action, you can use this pseudopod to manipulate an object, open or close a door or container, or pick up or set down a Tiny object. The pseudopod contains no sensory organs and can’t attack, activate magic items, or lift more than 10 pounds."
      }
    }
  ],
  "shifter": [
    {
      "name": {
        "pt": "Instintos Bestiais",
        "en": "Bestial Instincts"
      },
      "desc": {
        "pt": "Canalizando a fera interior, você tem proficiência em uma das seguintes perícias à sua escolha: Acrobacia, Atletismo, Intimidação ou Sobrevivência.",
        "en": "Channeling the beast within, you have proficiency in one of the following skills of your choice: Acrobatics, Athletics, Intimidation, or Survival."
      }
    },
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Você pode enxergar na meia-luz a até 18 metros de você como se fosse luz plena, e na escuridão como se fosse meia-luz. Você discerne cores nessa escuridão apenas como tons de cinza.",
        "en": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray."
      }
    },
    {
      "name": {
        "pt": "Transmutação",
        "en": "Shifting"
      },
      "desc": {
        "pt": "Como uma Ação Bônus, você pode assumir uma aparência mais bestial. Essa transformação dura 1 minuto, até você morrer ou até reverter à sua aparência normal com uma Ação Bônus. Quando se transformar, você ganha Pontos de Vida Temporários iguais a 2 x seu Bônus de Proficiência. Você pode se transformar um número de vezes igual ao seu Bônus de Proficiência e recupera todos os usos gastos ao terminar um Descanso Longo.\n\nSempre que se transformar, você ganha um benefício adicional baseado em uma das seguintes opções (escolha quando selecionar esta raça):\n\n• Couro Feral. Você ganha 1d6 Pontos de Vida Temporários adicionais. Enquanto estiver transformado, você tem um bônus de +1 na sua Classe de Armadura.\n\n• Dente Longo. Quando se transformar e como uma Ação Bônus nos seus outros turnos enquanto transformado, você pode usar suas presas alongadas para desferir um golpe desarmado. Se acertar com suas presas, você pode causar dano perfurante igual a 1d6 + seu modificador de Força, em vez do dano contundente normal de um golpe desarmado.\n\n• Passo Rápido. Enquanto estiver transformado, seu deslocamento de caminhada aumenta em 3 metros. Além disso, você pode se mover até 3 metros como uma Reação quando uma criatura terminar o turno dela a até 1,5 metro de você. Esse movimento reativo não provoca ataques de oportunidade.\n\n• Caçada Selvagem. Enquanto estiver transformado, você tem Vantagem em testes de Sabedoria, e nenhuma criatura a até 9 metros de você pode realizar uma jogada de ataque com Vantagem contra você, a menos que você esteja Incapacitado.",
        "en": "As a bonus action, you can assume a more bestial appearance. This transformation lasts for 1 minute, until you die, or until you revert to your normal appearance as a bonus action. When you shift, you gain temporary hit points equal to 2 x your proficiency bonus. You can shift a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.\n\nWhenever you shift, you gain an additional benefit based on one of the following options (choose when you select this race):\n\n• Beasthide. You gain 1d6 additional temporary hit points. While shifted, you have a +1 bonus to your Armor Class.\n\n• Longtooth. When you shift and as a bonus action on your other turns while shifted, you can use your elongated fangs to make an unarmed strike. If you hit with your fangs, you can deal piercing damage equal to 1d6 + your Strength modifier, instead of the bludgeoning damage normal for an unarmed strike.\n\n• Swiftstride. While shifted, your walking speed increases by 10 feet. Additionally, you can move up to 10 feet as a reaction when a creature ends its turn within 5 feet of you. This reactive movement doesn't provoke opportunity attacks.\n\n• Wildhunt. While shifted, you have advantage on Wisdom checks, and no creature within 30 feet of you can make an attack roll with advantage against you unless you're incapacitated."
      }
    }
  ],
  "simic-hybrid": [
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Você pode enxergar na penumbra a até 18 metros de você como se fosse luz plena e na escuridão como se fosse penumbra. Você não pode discernir cores na escuridão, apenas tons de cinza.",
        "en": "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray."
      }
    },
    {
      "name": {
        "pt": "Aprimoramento Animal",
        "en": "Animal Enhancement"
      },
      "desc": {
        "pt": "Seu corpo foi alterado para incorporar certas características animais. Você escolhe um aprimoramento animal agora e um segundo aprimoramento no 5º nível.\n\nNo 1º nível, escolha uma das seguintes opções:\n\nPlaneio de Arraia. Você tem barbatanas semelhantes às de uma arraia que pode usar como asas para desacelerar sua queda ou permitir que você planeie. Quando cair e não estiver Incapacitado, você pode subtrair até 30 metros da queda ao calcular o dano de queda, e pode se mover até 2 metros horizontalmente para cada 1 metro que descer.\n\nEscalador Ágil. Você tem um deslocamento de escalada igual ao seu deslocamento de caminhada.\n\nAdaptação Subaquática. Você pode respirar ar e água, e tem um deslocamento de natação igual ao seu deslocamento de caminhada.\n\nNo 5º nível, seu corpo evolui ainda mais, desenvolvendo novas características. Escolha uma das opções que não escolheu no 1º nível ou uma das seguintes opções:\n\nApêndices Preênseis. Você tem dois apêndices especiais crescendo ao lado dos seus braços. Escolha se ambos são garras ou tentáculos. Como uma Ação, você pode usar um deles para tentar agarrar uma criatura. Cada um também é uma arma natural, que você pode usar para desferir um golpe desarmado. Se acertar com ele, o alvo sofre dano contundente igual a 1d6 + seu modificador de Força, em vez do dano contundente normal de um golpe desarmado. Imediatamente após acertar, você pode tentar agarrar o alvo como uma Ação Bônus. Esses apêndices não podem manipular nada com precisão e não podem empunhar armas, itens mágicos ou outro equipamento especializado.\n\nCarapaça. Sua pele em alguns pontos é coberta por uma casca espessa. Você ganha um bônus de +1 na CA quando não estiver usando armadura pesada.\n\nCuspe Ácido. Como uma Ação, você pode expelir ácido de glândulas em sua boca, tendo como alvo uma criatura ou objeto que possa ver a até 9 metros de você. O alvo sofre 2d10 de dano de ácido, a menos que seja bem-sucedido em uma salvaguarda de Destreza contra uma CD igual a 8 + seu modificador de Constituição + seu Bônus de Proficiência. Esse dano aumenta em 1d10 quando você atinge o 11º nível (3d10) e o 17º nível (4d10). Você pode usar este traço um número de vezes igual ao seu modificador de Constituição (mínimo de uma vez) e recupera todos os usos gastos ao terminar um Descanso Longo.",
        "en": "Your body has been altered to incorporate certain animal characteristics. You choose one animal enhancement now and a second enhancement at 5th level.\n\nAt 1st level, choose one of the following options:\n\nManta Glide. You have ray-like fins that you can use as wings to slow your fall or allow you to glide. When you fall and aren't incapacitated, you can subtract up to 100 feet from the fall when calculating falling damage, and you can move up to 2 feet horizontally for every 1 foot you descend.\n\nNimble Climber. You have a climbing speed equal to your walking speed.\n\nUnderwater Adaptation. You can breathe air and water, and you have a swimming speed equal to your walking speed.\n\nAt 5th level, your body evolves further, developing new characteristics. Choose one of the options you didn't take at 1st level, or one of the following options:\n\nGrappling Appendages. You have two special appendages growing alongside your arms. Choose whether they're both claws or tentacles. As an action, you can use one of them to try to grapple a creature. Each one is also a natural weapon, which you can use to make an unarmed strike. If you hit with it, the target takes bludgeoning damage equal to 1d6 + your Strength modifier, instead of the bludgeoning damage normal for an unarmed strike. Immediately after hitting, you can try to grapple the target as a bonus action. These appendages can't precisely manipulate anything and can't wield weapons, magic items, or other specialized equipment.\n\nCarapace. Your skin in places is covered by a thick shell. You gain a +1 bonus to AC when you're not wearing heavy armor.\n\nAcid Spit. As an action, you can spray acid from glands in your mouth, targeting one creature or object you can see within 30 feet of you. The target takes 2d10 acid damage unless it succeeds on a Dexterity saving throw against a DC equal to 8 + your Constitution modifier + your proficiency bonus. This damage increases by 1d10 when you reach 11th level (3d10) and 17th level (4d10). You can use this trait a number of times equal to your Consitution modifier (minimum of once), and you regain all expended uses of it when you finish a long rest."
      }
    }
  ],
  "thri-kreen": [
    {
      "name": {
        "pt": "Tipo de Criatura",
        "en": "Creature Type"
      },
      "desc": {
        "pt": "Você é uma Monstruosidade.",
        "en": "You are a Monstrosity."
      }
    },
    {
      "name": {
        "pt": "Carapaça Camaleônica",
        "en": "Chameleon Carapace"
      },
      "desc": {
        "pt": "Enquanto não estiver usando armadura, sua carapaça lhe concede uma Classe de Armadura base de 13 + seu modificador de Destreza.\n\nComo uma Ação, você pode mudar a cor da sua carapaça para combinar com a cor e a textura dos seus arredores, concedendo a você Vantagem em testes de Destreza (Furtividade) realizados para se esconder nesses arredores.",
        "en": "While you aren’t wearing armor, your carapace gives you a base Armor Class of 13 + your Dexterity modifier.\n\nAs an action, you can change the color of your carapace to match the color and texture of your surroundings, giving you advantage on Dexterity (Stealth) checks made to hide in those surroundings."
      }
    },
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Você pode enxergar na meia-luz a até 18 metros de você como se fosse luz plena e na escuridão como se fosse meia-luz. Você discerne cores nessa escuridão apenas como tons de cinza.",
        "en": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness only as shades of gray."
      }
    },
    {
      "name": {
        "pt": "Braços Secundários",
        "en": "Secondary Arms"
      },
      "desc": {
        "pt": "Você tem dois braços secundários ligeiramente menores abaixo do seu par de braços principal. Os braços secundários podem manipular um objeto, abrir ou fechar uma porta ou recipiente, pegar ou pousar um objeto Miúdo, ou empunhar uma arma que tenha a propriedade leve.",
        "en": "You have two slightly smaller secondary arms below your primary pair of arms. The secondary arms can manipulate an object, open or close a door or container, pick up or set down a Tiny object, or wield a weapon that has the light property."
      }
    },
    {
      "name": {
        "pt": "Sem Sono",
        "en": "Sleepless"
      },
      "desc": {
        "pt": "Você não precisa dormir e pode optar por permanecer consciente durante um Descanso Longo, embora ainda deva abster-se de atividades extenuantes para obter os benefícios do descanso.",
        "en": "You do not require sleep and can choose to remain conscious during a long rest, though you must still refrain from strenuous activity to gain the benefit of the rest."
      }
    },
    {
      "name": {
        "pt": "Telepatia Thri-kreen",
        "en": "Thri-kreen Telepathy"
      },
      "desc": {
        "pt": "Sem o auxílio de magia, você não pode falar os idiomas que não sejam thri-kreen que você conhece. Em vez disso, você usa telepatia para transmitir seus pensamentos. Você possui a habilidade mágica de transmitir seus pensamentos mentalmente a criaturas voluntárias que possa ver a até 36 metros de você. Uma criatura contatada não precisa compartilhar um idioma com você para compreender seus pensamentos, mas deve ser capaz de compreender pelo menos um idioma. Seu elo telepático com uma criatura é rompido se você e a criatura se afastarem a mais de 36 metros um do outro, se qualquer um de vocês ficar Incapacitado, ou se qualquer um de vocês interromper o contato mentalmente (nenhuma ação necessária).",
        "en": "Without the assistance of magic, you can’t speak the non-thri-kreen languages you know. Instead you use telepathy to convey your thoughts. You have the magical ability to transmit your thoughts mentally to willing creatures you can see within 120 feet of yourself. A contacted creature doesn’t need to share a language with you to understand your thoughts, but it must be able to understand at least one language. Your telepathic link to a creature is broken if you and the creature move more than 120 feet apart, if either of you is incapacitated, or if either of you mentally breaks the contact (no action required)."
      }
    }
  ],
  "vedalken": [
    {
      "name": {
        "pt": "Despaixão Vedalken",
        "en": "Vedalken Dispassion"
      },
      "desc": {
        "pt": "Você tem Vantagem em todas as salvaguardas de Inteligência, Sabedoria e Carisma.",
        "en": "You have advantage on all Intelligence, Wisdom, and Charisma saving throws."
      }
    },
    {
      "name": {
        "pt": "Precisão Incansável",
        "en": "Tireless Precision"
      },
      "desc": {
        "pt": "Você é proficiente em uma das seguintes perícias à sua escolha: Arcanismo, História, Investigação, Medicina, Atuação ou Prestidigitação. Você também é proficiente com uma ferramenta à sua escolha.\n\nSempre que fizer um teste de atributo com a perícia ou ferramenta escolhida, role um d4 e adicione o número rolado ao total do teste.",
        "en": "You are proficient in one of the following skills of your choice: Arcana, History, Investigation, Medicine, Performance, or Sleight of Hand. You are also proficient with one tool of your choice.\n\nWhenever you make an ability check with the chosen skill or tool, roll a d4 and add the number rolled to the check's total."
      }
    },
    {
      "name": {
        "pt": "Parcialmente Anfíbio",
        "en": "Partially Amphibious"
      },
      "desc": {
        "pt": "Ao absorver oxigênio através de sua pele, você pode respirar debaixo d'água por até 1 hora. Uma vez atingido esse limite, você não pode usar este traço novamente até terminar um Descanso Longo.",
        "en": "By absorbing oxygen through your skin, you can breathe underwater for up to 1 hour. Once you've reached that limit, you can't use this trait again until you finish a long rest."
      }
    }
  ],
  "verdan": [
    {
      "name": {
        "pt": "Cura de Sangue Negro",
        "en": "Black Blood Healing"
      },
      "desc": {
        "pt": "O sangue negro que é sinal da conexão do seu povo com Aquele-Que-Perdura impulsiona sua cura natural. Quando você obtiver 1 ou 2 em qualquer Dado de Vida gasto ao final de um Descanso Curto, você pode rolar o dado novamente e deve usar o novo resultado.",
        "en": "The black blood that is a sign of your people’s connection to That-Which-Endures boosts your natural healing. When you roll a 1 or 2 on any Hit Die you spend at the end of a short rest, you can reroll the die and must use the new roll."
      }
    },
    {
      "name": {
        "pt": "Telepatia Limitada",
        "en": "Limited Telepathy"
      },
      "desc": {
        "pt": "Você pode falar telepaticamente com qualquer criatura que possa ver a até 9 metros de você. Você não precisa compartilhar um idioma com a criatura para que ela compreenda sua telepatia, mas ela deve ser capaz de compreender pelo menos um idioma. Esse processo de comunicação é lento e limitado, permitindo que você transmita e receba apenas ideias simples e conceitos diretos.",
        "en": "You can telepathically speak to any creature you can see within 30 feet of you. You don’t need to share a language with the creature for it to understand your telepathy, but it must be able to understand at least one language. This process of communication is slow and limited, allowing you to transmit and receive only simple ideas and straightforward concepts."
      }
    },
    {
      "name": {
        "pt": "Persuasivo",
        "en": "Persuasive"
      },
      "desc": {
        "pt": "A falta de história do seu povo torna você confiável e humilde. Você tem proficiência na perícia Persuasão.",
        "en": "Your people’s lack of history makes you trustworthy and humble. You have proficiency in the Persuasion skill."
      }
    },
    {
      "name": {
        "pt": "Intuição Telepática",
        "en": "Telepathic Insight"
      },
      "desc": {
        "pt": "A conexão da sua mente com o mundo ao seu redor fortalece sua determinação. Você tem Vantagem em todas as salvaguardas de Sabedoria e Carisma.",
        "en": "Your mind’s connection to the world around you strengthens your will. You have advantage on all Wisdom and Charisma saving throws."
      }
    }
  ],
  "grung": [
    {
      "name": {
        "pt": "Prontidão Arbórea",
        "en": "Arboreal Alertness"
      },
      "desc": {
        "pt": "Você tem proficiência na perícia Percepção.",
        "en": "You have proficiency in the Perception skill."
      }
    },
    {
      "name": {
        "pt": "Anfíbio",
        "en": "Amphibious"
      },
      "desc": {
        "pt": "Você pode respirar ar e água.",
        "en": "You can breathe air and water."
      }
    },
    {
      "name": {
        "pt": "Imunidade a Veneno",
        "en": "Poison Immunity"
      },
      "desc": {
        "pt": "Você é imune a dano de veneno e à condição Envenenado.",
        "en": "You’re immune to poison damage and the poisoned condition."
      }
    },
    {
      "name": {
        "pt": "Pele Venenosa",
        "en": "Poisonous Skin"
      },
      "desc": {
        "pt": "Qualquer criatura que agarrar você ou entrar em contato direto com a sua pele de outra forma deve ser bem-sucedida em uma salvaguarda de Constituição CD 12 ou ficará Envenenada por 1 minuto. Uma criatura envenenada que não esteja mais em contato direto com você pode repetir a salvaguarda ao final de cada um dos turnos dela, encerrando o efeito sobre si mesma em caso de sucesso.\n\nVocê também pode aplicar este veneno a qualquer arma perfurante como parte de um ataque com essa arma, embora quando você acertar o veneno reaja de forma diferente. O alvo deve ser bem-sucedido em uma salvaguarda de Constituição CD 12 ou sofrerá 2d4 de dano de veneno.",
        "en": "Any creature that grapples you or otherwise comes into direct contact with your skin must succeed on a DC 12 Constitution saving throw or become poisoned for 1 minute. A poisoned creature no longer in direct contact with you can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.\n\nYou can also apply this poison to any piercing weapon as part of an attack with that weapon, though when you hit the poison reacts differently. The target must succeed on a DC 12 Constitution saving throw or take 2d4 poison damage."
      }
    },
    {
      "name": {
        "pt": "Salto Parado",
        "en": "Standing Leap"
      },
      "desc": {
        "pt": "Seu salto em distância é de até 7,5 metros e seu salto em altura é de até 4,5 metros, com ou sem corrida prévia.",
        "en": "Your long jump is up to 25 feet and your high jump is up to 15 feet, with or without a running start."
      }
    },
    {
      "name": {
        "pt": "Dependência de Água",
        "en": "Water Dependency"
      },
      "desc": {
        "pt": "Se você não se submergir em água por pelo menos 1 hora durante um dia, sofrerá um nível de Exaustão ao final daquele dia. Você só pode se recuperar desta Exaustão por meio de magia ou submergindo-se em água por pelo menos 1 hora.",
        "en": "If you fail to immerse yourself in water for at least 1 hour during a day, you suffer one level of exhaustion at the end of that day. You can only recover from this exhaustion through magic or by immersing yourself in water for at least 1 hour."
      }
    }
  ],
  "dhampir": [
    {
      "name": {
        "pt": "Legado Ancestral",
        "en": "Ancestral Legacy"
      },
      "desc": {
        "pt": "Se você substituir uma raça por esta linhagem, pode manter os seguintes elementos daquela raça: quaisquer proficiências em perícias que ganhou dela e qualquer deslocamento de escalada, voo ou natação que ganhou dela.\n\nSe não mantiver nenhum desses elementos ou escolher esta linhagem na criação de personagem, você ganha proficiência em duas perícias à sua escolha.",
        "en": "If you replace a race with this lineage, you can keep the following elements of that race: any skill proficiencies you gained from it and any climbing, flying, or swimming speed you gained from it.\n\nIf you don’t keep any of those elements or you choose this lineage at character creation, you gain proficiency in two skills of your choice."
      }
    },
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Você pode enxergar na penumbra a até 18 metros de você como se fosse luz plena e na escuridão como se fosse penumbra. Nessa escuridão, você discerne cores como tons de cinza.",
        "en": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness as shades of gray."
      }
    },
    {
      "name": {
        "pt": "Natureza Imortal",
        "en": "Deathless Nature"
      },
      "desc": {
        "pt": "Você não precisa respirar.",
        "en": "You don’t need to breathe."
      }
    },
    {
      "name": {
        "pt": "Escalada Aracnídea",
        "en": "Spider Climb"
      },
      "desc": {
        "pt": "Você tem um deslocamento de escalada igual ao seu deslocamento de caminhada. Além disso, no 3º nível, você pode se mover para cima, para baixo e através de superfícies verticais e de cabeça para baixo ao longo de tetos, deixando suas mãos livres.",
        "en": "You have a climbing speed equal to your walking speed. In addition, at 3rd level, you can move up, down, and across vertical surfaces and upside down along ceilings, while leaving your hands free."
      }
    },
    {
      "name": {
        "pt": "Mordida Vampírica",
        "en": "Vampiric Bite"
      },
      "desc": {
        "pt": "Sua mordida com presas é uma arma natural, que conta como uma arma simples corpo a corpo com a qual você é proficiente. Você adiciona seu modificador de Constituição, em vez do modificador de Força, às jogadas de ataque e dano quando ataca com esta mordida. Ela causa 1d4 de dano perfurante ao acertar. Enquanto estiver com metade ou menos dos seus Pontos de Vida, você tem Vantagem nas jogadas de ataque que fizer com esta mordida.\n\nQuando você ataca com esta mordida e acerta uma criatura que não seja um Construto ou Morto-vivo, você pode se fortalecer de uma das seguintes maneiras à sua escolha:\n\n• Você recupera Pontos de Vida iguais ao dano perfurante causado pela mordida.\n\n• Você ganha um bônus no próximo teste de atributo ou jogada de ataque que realizar; o bônus é igual ao dano perfurante causado pela mordida.\n\nVocê pode se fortalecer com esta mordida um número de vezes igual ao seu Bônus de Proficiência e recupera todos os usos gastos ao terminar um Descanso Longo.",
        "en": "Your fanged bite is a natural weapon, which counts as a simple melee weapon with which you are proficient. You add your Constitution modifier, instead of your Strength modifier, to the attack and damage rolls when you attack with this bite. It deals 1d4 piercing damage on a hit. While you are missing half or more of your hit points, you have advantage on attack rolls you make with this bite.\n\nWhen you attack with this bite and hit a creature that isn’t a Construct or an Undead, you can empower yourself in one of the following ways of your choice:\n\n• You regain hit points equal to the piercing damage dealt by the bite.\n\n• You gain a bonus to the next ability check or attack roll you make; the bonus equals the piercing damage dealt by the bite.\n\nYou can empower yourself with this bite a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
      }
    }
  ],
  "hexblood": [
    {
      "name": {
        "pt": "Tipo de Criatura",
        "en": "Creature Type"
      },
      "desc": {
        "pt": "Você é uma Fada.",
        "en": "You are a Fey."
      }
    },
    {
      "name": {
        "pt": "Legado Ancestral",
        "en": "Ancestral Legacy"
      },
      "desc": {
        "pt": "Se você substituir uma raça por esta linhagem, pode manter os seguintes elementos daquela raça: quaisquer proficiências em perícias que ganhou dela e qualquer deslocamento de escalada, voo ou natação que ganhou dela.\n\nSe não mantiver nenhum desses elementos ou escolher esta linhagem na criação de personagem, você ganha proficiência em duas perícias à sua escolha.",
        "en": "If you replace a race with this lineage, you can keep the following elements of that race: any skill proficiencies you gained from it and any climbing, flying, or swimming speed you gained from it.\n\nIf you don’t keep any of those elements or you choose this lineage at character creation, you gain proficiency in two skills of your choice."
      }
    },
    {
      "name": {
        "pt": "Visão no Escuro",
        "en": "Darkvision"
      },
      "desc": {
        "pt": "Você pode enxergar na penumbra a até 18 metros de você como se fosse luz plena e na escuridão como se fosse penumbra. Nessa escuridão, você discerne cores como tons de cinza.",
        "en": "You can see in dim light within 60 feet of you as if it were bright light and in darkness as if it were dim light. You discern colors in that darkness as shades of gray."
      }
    },
    {
      "name": {
        "pt": "Amuleto Sinistro",
        "en": "Eerie Token"
      },
      "desc": {
        "pt": "Como uma Ação Bônus, você pode remover inofensivamente uma mecha do seu cabelo, uma das suas unhas ou um dos seus dentes. Este amuleto é imbuído com magia até você terminar um Descanso Longo. Enquanto o amuleto estiver imbuído dessa forma, você pode realizar estas ações:\n\nMensagem Telepática. Como uma Ação, você pode enviar uma mensagem telepática para a criatura que estiver segurando ou carregando o amuleto, desde que esteja a até 15 km dela. A mensagem pode conter até vinte e cinco palavras.\n\nVisão Remota. Se você estiver a até 15 km do amuleto, pode entrar em transe como uma Ação. O transe dura 1 minuto, mas termina mais cedo se você o dissipar (nenhuma ação necessária) ou estiver Incapacitado. Durante este transe, você pode enxergar e ouvir a partir do amuleto como se estivesse localizado onde ele está. Enquanto estiver usando seus sentidos no local do amuleto, você fica Cego e Surdo em relação aos seus próprios arredores. Quando o transe termina, o amuleto é destruído sem causar danos.\n\nDepois de criar um amuleto usando esta característica, você não poderá fazê-lo novamente até terminar um Descanso Longo, momento em que a parte que falta cresce novamente.",
        "en": "As a bonus action, you can harmlessly remove a lock of your hair, one of your nails, or one of your teeth. This token is imbued with magic until you finish a long rest. While the token is imbued in this way, you can take these actions:\n\nTelepathic Message. As an action, you can send a telepathic message to the creature holding or carrying the token, as long as you are within 10 miles of it. The message can contain up to twenty-five words.\n\nRemote Viewing. If you are within 10 miles of the token, you can enter a trance as an action. The trance lasts for 1 minute, but it ends early if you dismiss it (no action required) or are incapacitated. During this trance, you can see and hear from the token as if you were located where it is. While you are using your senses at the token’s location, you are blinded and deafened in regard to your own surroundings. When the trance ends, the token is harmlessly destroyed.\n\nOnce you create a token using this feature, you can’t do so again until you finish a long rest, at which point your missing part regrows."
      }
    },
    {
      "name": {
        "pt": "Magia de Bruxa",
        "en": "Hex Magic"
      },
      "desc": {
        "pt": "Você pode conjurar as magias disfarçar-se e bruxaria com este traço. Uma vez que conjure qualquer uma dessas magias com este traço, não poderá conjurar essa magia com ele novamente até terminar um Descanso Longo. Você também pode conjurar essas magias usando quaisquer espaços de magia que tiver.\n\nInteligência, Sabedoria ou Carisma é a sua habilidade de conjuração para essas magias (escolha a habilidade ao adquirir esta linhagem).",
        "en": "You can cast the disguise self and hex spells with this trait. Once you cast either of these spells with this trait, you can’t cast that spell with it again until you finish a long rest. You can also cast these spells using any spell slots you have.\n\nIntelligence, Wisdom, or Charisma is your spellcasting ability for these spells (choose the ability when you gain this lineage)."
      }
    }
  ],
  "reborn": [
    {
      "name": {
        "pt": "Legado Ancestral",
        "en": "Ancestral Legacy"
      },
      "desc": {
        "pt": "Se você substituir uma raça por esta linhagem, pode manter os seguintes elementos daquela raça: quaisquer proficiências em perícias que ganhou dela e qualquer deslocamento de escalada, voo ou natação que ganhou dela.\n\nSe não mantiver nenhum desses elementos ou escolher esta linhagem na criação de personagem, você ganha proficiência em duas perícias à sua escolha.",
        "en": "If you replace a race with this lineage, you can keep the following elements of that race: any skill proficiencies you gained from it and any climbing, flying, or swimming speed you gained from it.\n\nIf you don’t keep any of those elements or you choose this lineage at character creation, you gain proficiency in two skills of your choice."
      }
    },
    {
      "name": {
        "pt": "Natureza Imortal",
        "en": "Deathless Nature"
      },
      "desc": {
        "pt": "Você escapou da morte, um fato representado pelos seguintes benefícios:\n\n• Você tem Vantagem em salvaguardas contra doenças e contra ficar Envenenado, e tem resistência a dano de veneno.\n\n• Você tem Vantagem em salvaguardas contra a morte.\n\n• Você não precisa comer, beber ou respirar.\n\n• Você não precisa dormir e a magia não pode fazer você adormecer. Você pode concluir um Descanso Longo em 4 horas se passar essas horas em um estado inativo e imóvel, durante o qual mantém a consciência.",
        "en": "You have escaped death, a fact represented by the following benefits:\n\n• You have advantage on saving throws against disease and being poisoned, and you have resistance to poison damage.\n\n• You have advantage on death saving throws.\n\n• You don’t need to eat, drink, or breathe.\n\n• You don’t need to sleep, and magic can’t put you to sleep. You can finish a long rest in 4 hours if you spend those hours in an inactive, motionless state, during which you retain consciousness."
      }
    },
    {
      "name": {
        "pt": "Conhecimento de Vida Passada",
        "en": "Knowledge from a Past Life"
      },
      "desc": {
        "pt": "Você se lembra temporariamente de vislumbres do passado, talvez memórias desbotadas de eras passadas ou de uma vida anterior. Quando fizer um teste de atributo que use uma perícia, você pode rolar um d6 imediatamente após ver o número no d20 e adicionar o número no d6 ao teste. Você pode usar esta característica um número de vezes igual ao seu Bônus de Proficiência e recupera todos os usos gastos ao terminar um Descanso Longo.",
        "en": "You temporarily remember glimpses of the past, perhaps faded memories from ages ago or a previous life. When you make an ability check that uses a skill, you can roll a d6 immediately after seeing the number on the d20 and add the number on the d6 to the check. You can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."
      }
    }
  ],
  "human-variant": [
    {
      "name": {
        "pt": "Perícias",
        "en": "Skills"
      },
      "desc": {
        "pt": "Você ganha proficiência em uma perícia de sua escolha.",
        "en": "You gain proficiency in one skill of your choice."
      }
    },
    {
      "name": {
        "pt": "Talento",
        "en": "Feat"
      },
      "desc": {
        "pt": "Você ganha um talento à sua escolha.",
        "en": "You gain one feat of your choice."
      }
    }
  ],
  "custom-lineage": [
    {
      "name": {
        "pt": "Talento",
        "en": "Feat"
      },
      "desc": {
        "pt": "Você ganha um talento à sua escolha para o qual se qualifique.",
        "en": "You gain one feat of your choice for which you qualify."
      }
    },
    {
      "name": {
        "pt": "Traço Variável",
        "en": "Variable Trait"
      },
      "desc": {
        "pt": "Você ganha uma das seguintes opções à sua escolha: (a) visão no escuro com alcance de 18 metros ou (b) proficiência em uma perícia à sua escolha.",
        "en": "You gain one of the following options of your choice: (a) darkvision with a range of 60 feet or (b) proficiency in one skill of your choice."
      }
    }
  ]
};

export const EXTRA_RACES = races.map(([id, pt, en, size, speed, source, descPt, descEn]) => ({
  id, name: bilingual(pt, en), size, speed, source, asi: {}, flexibleAsi: true,
  manualTraits: true, languages: ['Common', '+1 of choice'],
  traits: EXTRA_RACE_TRAITS[id] || [{ name: bilingual('Traços da origem', 'Origin traits'), desc: bilingual(descPt, descEn) }, ...(INNATE[id] ? [INNATE[id]] : [])],
}));

export const SOURCES = {
  PHB: "Player's Handbook (2014)", DMG: "Dungeon Master's Guide (2014)",
  XGE: "Xanathar's Guide to Everything", TCE: "Tasha's Cauldron of Everything",
  SCAG: "Sword Coast Adventurer's Guide", MPMM: 'Monsters of the Multiverse',
  VGM: "Volo's Guide to Monsters", MTF: "Mordenkainen's Tome of Foes",
  ERLW: 'Eberron: Rising from the Last War', GGR: "Guildmasters' Guide to Ravnica",
  AAG: "Astral Adventurer's Guide", SCC: 'Strixhaven: A Curriculum of Chaos',
  VRGR: "Van Richten's Guide to Ravenloft", FTD: "Fizban's Treasury of Dragons",
  EGW: "Explorer's Guide to Wildemount", DSDQ: 'Dragonlance: Shadow of the Dragon Queen',
  BGG: "Bigby Presents: Glory of the Giants", AI: 'Acquisitions Incorporated',
  LR: 'Locathah Rising', OGA: 'One Grung Above',
  UA26VO: 'Unearthed Arcana: Villainous Options (2026, playtest)',
  UA26VOU: 'Unearthed Arcana: Villainous Options Update (2026, playtest)',
};

// Supplemental subclasses can be selected and saved. Their special actions
// are resolved at the table; the UI explicitly distinguishes this coverage.
const subclasses = {
  artificer: [
    ['cartographer', 'Cartógrafo', 'Cartographer', 'EFA', 'Mapas mágicos, exploração e portais.', 'Magic maps, exploration, and portals.'],
    ['alchemist', 'Alquimista', 'Alchemist', 'TCE', 'Elixires, cura e alquimia.', 'Elixirs, healing, and alchemy.'],
    ['armorer', 'Armeiro', 'Armorer', 'TCE', 'Armadura arcana de proteção ou infiltração.', 'Arcane armor for protection or infiltration.'],
    ['artillerist', 'Artilheiro', 'Artillerist', 'TCE', 'Canhão sobrenatural e magia de artilharia.', 'Eldritch cannon and artillery magic.'],
    ['battlesmith', 'Ferreiro de Batalha', 'Battle Smith', 'TCE', 'Armas mágicas e defensor de aço.', 'Magic weapons and a steel defender.'],
  ],
  barbarian: [
    ['battlerager', 'Furioso de Batalha', 'Battlerager', 'SCAG', 'Combate com armadura de espinhos.', 'Combat with spiked armor.'],
    ['ancestralguardian', 'Guardião Ancestral', 'Ancestral Guardian', 'XGE', 'Espíritos ancestrais protegem aliados.', 'Ancestral spirits protect allies.'],
    ['stormherald', 'Arauto da Tempestade', 'Storm Herald', 'XGE', 'Aura elemental durante a fúria.', 'Elemental aura while raging.'],
    ['zealot', 'Zelote', 'Zealot', 'XGE', 'Fúria divina e persistência além da morte.', 'Divine fury and persistence beyond death.'],
    ['beast', 'Besta', 'Beast', 'TCE', 'Armas naturais durante a fúria.', 'Natural weapons while raging.'],
    ['wildmagic', 'Magia Selvagem', 'Wild Magic', 'TCE', 'Fúria com manifestações mágicas imprevisíveis.', 'Rage with unpredictable magical manifestations.'],
    ['giant', 'Gigante', 'Giant', 'BGG', 'Fúria aumenta o tamanho e fortalece arremessos.', 'Rage increases size and strengthens thrown attacks.'],
  ],
  bard: [
    ['swords', 'Colégio das Espadas', 'College of Swords', 'XGE', 'Floreios de lâmina e combate artístico.', 'Blade flourishes and artistic combat.'],
    ['whispers', 'Colégio dos Sussurros', 'College of Whispers', 'XGE', 'Segredos, identidades e lâminas psíquicas.', 'Secrets, identities, and psychic blades.'],
    ['creation', 'Colégio da Criação', 'College of Creation', 'TCE', 'Canções criam e animam objetos.', 'Songs create and animate objects.'],
    ['eloquence', 'Colégio da Eloquência', 'College of Eloquence', 'TCE', 'Persuasão e inspiração confiável.', 'Persuasion and reliable inspiration.'],
    ['spirits', 'Colégio dos Espíritos', 'College of Spirits', 'VRGR', 'Relatos de espíritos canalizam efeitos mágicos.', 'Spirit tales channel magical effects.'],
  ],
  cleric: [
    ['nature', 'Domínio da Natureza', 'Nature Domain', 'PHB', 'Magia natural e proteção elemental.', 'Nature magic and elemental protection.'],
    ['death', 'Domínio da Morte', 'Death Domain', 'DMG', 'Energia necrótica; depende da aprovação do mestre.', 'Necrotic power; subject to DM approval.'],
    ['arcana', 'Domínio Arcano', 'Arcana Domain', 'SCAG', 'Conjuração divina encontra magia arcana.', 'Divine spellcasting meets arcane magic.'],
    ['forge', 'Domínio da Forja', 'Forge Domain', 'XGE', 'Artesanato sagrado, armadura e fogo.', 'Sacred crafting, armor, and fire.'],
    ['grave', 'Domínio da Sepultura', 'Grave Domain', 'XGE', 'Proteja o limiar entre vida e morte.', 'Protect the boundary between life and death.'],
    ['order', 'Domínio da Ordem', 'Order Domain', 'TCE', 'Comando e coordenação de aliados.', 'Command and ally coordination.'],
    ['peace', 'Domínio da Paz', 'Peace Domain', 'TCE', 'Vínculos protetores entre companheiros.', 'Protective bonds between companions.'],
    ['twilight', 'Domínio do Crepúsculo', 'Twilight Domain', 'TCE', 'Proteção, visão e santuário na penumbra.', 'Protection, sight, and sanctuary in dim light.'],
    // Playtest (UA) escrito para 2024: traços completos em class-options/cleric.js.
    ['pestilence', 'Domínio da Pestilência — UA', 'Pestilence Domain — UA', 'UA26VO', 'Playtest: praga, podridão e Exaustão nos inimigos.', 'Playtest: plague, rot, and Exhaustion on foes.'],
  ],
  druid: [
    ['shepherd', 'Círculo do Pastor', 'Circle of the Shepherd', 'XGE', 'Totens espirituais e criaturas invocadas.', 'Spirit totems and summoned creatures.'],
    // Playtest (UA), não é livro publicado: confira o documento antes de usar.
    // Escrito para 2024 (traços completos em class-options/druid.js); aqui fica a
    // versão manual para fichas 2014. Versão revisada (Villainous Options Update).
    ['titan', 'Círculo do Titã (kaiju) — UA', 'Circle of the Titan — UA', 'UA26VOU', 'Playtest: a Forma Selvagem vira um monstro colossal no estilo kaiju.', 'Playtest: Wild Shape becomes a colossal kaiju-style monster.'],
  ],
  fighter: [
    ['banneret', 'Cavaleiro do Dragão Púrpura', 'Purple Dragon Knight', 'SCAG', 'Liderança marcial fortalece companheiros.', 'Martial leadership bolsters companions.'],
    ['arcanearcher', 'Arqueiro Arcano', 'Arcane Archer', 'XGE', 'Flechas com efeitos mágicos especiais.', 'Arrows with special magical effects.'],
    ['cavalier', 'Cavaleiro', 'Cavalier', 'XGE', 'Defenda aliados e controle inimigos próximos.', 'Defend allies and control nearby enemies.'],
    ['samurai', 'Samurai', 'Samurai', 'XGE', 'Espírito de combate e disciplina social.', 'Fighting spirit and social discipline.'],
    ['echoknight', 'Cavaleiro do Eco', 'Echo Knight', 'EGW', 'Manifeste um eco para atacar e se reposicionar.', 'Manifest an echo to attack and reposition.'],
    ['psiwarrior', 'Guerreiro Psiônico', 'Psi Warrior', 'TCE', 'Dados psiônicos alimentam ataque, defesa e movimento.', 'Psionic dice fuel attacks, defense, and movement.'],
    ['runeknight', 'Cavaleiro das Runas', 'Rune Knight', 'TCE', 'Runas gigantes e crescimento mágico.', 'Giant runes and magical growth.'],
    // Playtest (UA) escrito para 2024: traços completos em class-options/fighter.js.
    ['hellknight', 'Cavaleiro Infernal — UA', 'Hell Knight — UA', 'UA26VOU', 'Playtest: armas forjadas no inferno e feridas infernais.', 'Playtest: hell-forged weapons and infernal wounds.'],
  ],
  monk: [
    ['longdeath', 'Caminho da Morte Longa', 'Way of the Long Death', 'SCAG', 'Disciplina que transforma a morte em resistência.', 'Discipline that turns death into resilience.'],
    ['sunsoul', 'Caminho da Alma Solar', 'Way of the Sun Soul', 'XGE', 'Ki manifesta energia radiante.', 'Ki manifests radiant energy.'],
    ['drunkenmaster', 'Caminho do Mestre Bêbado', 'Way of the Drunken Master', 'XGE', 'Movimento imprevisível e redirecionamento de ataques.', 'Unpredictable movement and redirected attacks.'],
    ['kensei', 'Caminho do Kensei', 'Way of the Kensei', 'XGE', 'Maestria de armas e precisão marcial.', 'Weapon mastery and martial precision.'],
    ['astralself', 'Caminho do Eu Astral', 'Way of the Astral Self', 'TCE', 'Manifeste uma forma astral com ki.', 'Manifest an astral form with ki.'],
    ['mercy', 'Caminho da Misericórdia', 'Way of Mercy', 'TCE', 'Toques de cura e dano usando ki.', 'Healing and harmful touches using ki.'],
    ['ascendantdragon', 'Caminho do Dragão Ascendente', 'Way of the Ascendant Dragon', 'FTD', 'Sopro, golpes elementais e voo temporário.', 'Breath, elemental strikes, and temporary flight.'],
  ],
  paladin: [
    ['oathbreaker', 'Quebrador de Juramento', 'Oathbreaker', 'DMG', 'Poder sombrio; depende da aprovação do mestre.', 'Dark power; subject to DM approval.'],
    ['crown', 'Juramento da Coroa', 'Oath of the Crown', 'SCAG', 'Lealdade e proteção da linha de frente.', 'Loyalty and frontline protection.'],
    ['conquest', 'Juramento da Conquista', 'Oath of Conquest', 'XGE', 'Medo e domínio do campo de batalha.', 'Fear and battlefield control.'],
    ['redemption', 'Juramento da Redenção', 'Oath of Redemption', 'XGE', 'Diplomacia, proteção e contenção.', 'Diplomacy, protection, and restraint.'],
    ['glory', 'Juramento da Glória', 'Oath of Glory', 'TCE', 'Proezas atléticas e inspiração heroica.', 'Athletic feats and heroic inspiration.'],
    ['watchers', 'Juramento dos Vigilantes', 'Oath of the Watchers', 'TCE', 'Defesa contra ameaças extraplanares.', 'Defense against extraplanar threats.'],
  ],
  ranger: [
    ['gloomstalker', 'Andarilho das Sombras', 'Gloom Stalker', 'XGE', 'Emboscadas, escuridão e primeiro turno ofensivo.', 'Ambushes, darkness, and an offensive opening turn.'],
    ['horizonwalker', 'Andarilho do Horizonte', 'Horizon Walker', 'XGE', 'Energia planar e mobilidade sobrenatural.', 'Planar energy and supernatural mobility.'],
    ['monsterslayer', 'Matador de Monstros', 'Monster Slayer', 'XGE', 'Analise e enfrente ameaças sobrenaturais.', 'Analyze and confront supernatural threats.'],
    ['feywanderer', 'Andarilho Feérico', 'Fey Wanderer', 'TCE', 'Charme feérico e golpes psíquicos.', 'Fey charm and psychic strikes.'],
    ['swarmkeeper', 'Guardião do Enxame', 'Swarmkeeper', 'TCE', 'Um enxame auxilia dano e deslocamento.', 'A swarm assists damage and movement.'],
    ['drakewarden', 'Guardião do Draco', 'Drakewarden', 'FTD', 'Companheiro dracônico que cresce com o patrulheiro.', 'A draconic companion that grows with the ranger.'],
  ],
  rogue: [
    ['mastermind', 'Mentor', 'Mastermind', 'XGE', 'Intriga, disfarces e ajuda tática.', 'Intrigue, disguises, and tactical help.'],
    ['swashbuckler', 'Espadachim', 'Swashbuckler', 'XGE', 'Duelos ágeis e presença carismática.', 'Agile dueling and charismatic presence.'],
    ['inquisitive', 'Inquisitivo', 'Inquisitive', 'XGE', 'Investigação e leitura das intenções inimigas.', 'Investigation and reading enemy intentions.'],
    ['scout', 'Batedor', 'Scout', 'XGE', 'Exploração e mobilidade em escaramuças.', 'Exploration and skirmish mobility.'],
    ['phantom', 'Fantasma', 'Phantom', 'TCE', 'Memórias dos mortos e ecos necróticos.', 'Memories of the dead and necrotic echoes.'],
    ['soulknife', 'Lâmina da Alma', 'Soulknife', 'TCE', 'Lâminas psíquicas e talentos psiônicos.', 'Psychic blades and psionic talents.'],
  ],
  sorcerer: [
    ['shadow', 'Magia das Sombras', 'Shadow Magic', 'XGE', 'Escuridão, sobrevivência e caçador sombrio.', 'Darkness, survival, and a shadowy hound.'],
    ['storm', 'Feitiçaria da Tempestade', 'Storm Sorcery', 'XGE', 'Vento, trovão e relâmpagos.', 'Wind, thunder, and lightning.'],
    ['aberrantmind', 'Mente Aberrante', 'Aberrant Mind', 'TCE', 'Telepatia e conjuração psiônica.', 'Telepathy and psionic spellcasting.'],
    ['clockworksoul', 'Alma Mecânica', 'Clockwork Soul', 'TCE', 'Magia que restaura o equilíbrio e a ordem.', 'Magic that restores balance and order.'],
    ['lunar', 'Feitiçaria Lunar', 'Lunar Sorcery', 'DSDQ', 'Fases lunares alteram a afinidade mágica.', 'Lunar phases alter magical affinity.'],
    // Playtest (UA) escrito para 2024: traços completos em class-options/sorcerer.js.
    ['demonic', 'Feitiçaria Demoníaca — UA', 'Demonic Sorcery — UA', 'UA26VOU', 'Playtest: fendas para o Abismo e magia demoníaca.', 'Playtest: rifts into the Abyss and demonic magic.'],
  ],
  warlock: [
    ['undying', 'O Imortal', 'The Undying', 'SCAG', 'Pacto ligado à persistência além da morte.', 'A pact tied to persistence beyond death.'],
    ['celestial', 'O Celestial', 'The Celestial', 'XGE', 'Luz, cura e poder celestial.', 'Light, healing, and celestial power.'],
    ['hexblade', 'Lâmina Maldita', 'The Hexblade', 'XGE', 'Armas de pacto e maldições.', 'Pact weapons and curses.'],
    ['fathomless', 'O Insondável', 'The Fathomless', 'TCE', 'Tentáculos espectrais e afinidade aquática.', 'Spectral tentacles and aquatic affinity.'],
    ['genie', 'O Gênio', 'The Genie', 'TCE', 'Recipiente mágico e poder elemental do patrono.', 'A magical vessel and the patron’s elemental power.'],
    ['undead', 'O Morto-Vivo', 'The Undead', 'VRGR', 'Forma aterradora e energia necrótica.', 'A dreadful form and necrotic energy.'],
  ],
  wizard: [
    ['conjuration', 'Escola de Conjuração', 'School of Conjuration', 'PHB', 'Crie objetos, invoque criaturas e teleporte-se.', 'Create objects, summon creatures, and teleport.'],
    ['enchantment', 'Escola de Encantamento', 'School of Enchantment', 'PHB', 'Influencie mentes e redirecione ameaças.', 'Influence minds and redirect threats.'],
    ['bladesinging', 'Canção da Lâmina', 'Bladesinging', 'TCE', 'Magia arcana e esgrima com defesa ágil.', 'Arcane magic and swordplay with agile defense.'],
    ['warmagic', 'Magia de Guerra', 'War Magic', 'XGE', 'Deflexão arcana e prontidão tática.', 'Arcane deflection and tactical readiness.'],
    ['scribes', 'Ordem dos Escribas', 'Order of Scribes', 'TCE', 'Grimório desperto e versatilidade de escrita mágica.', 'An awakened spellbook and versatile magical writing.'],
    ['chronurgy', 'Cronurgia', 'Chronurgy Magic', 'EGW', 'Manipule instantes e resultados com magia temporal.', 'Manipulate moments and outcomes with time magic.'],
    ['graviturgy', 'Gravitur gia'.replace(' ', ''), 'Graviturgy Magic', 'EGW', 'Manipule peso, gravidade e movimento.', 'Manipulate weight, gravity, and movement.'],
  ],
};

export const EXTRA_SUBCLASSES = Object.fromEntries(Object.entries(subclasses).map(([classId, rows]) => [classId,
  rows.map(([id, pt, en, source, descPt, descEn]) => ({ id, name: bilingual(pt, en), source,
    desc: bilingual(descPt, descEn), features: EXPANDED_SUBCLASS_FEATURES[classId]?.[id] || [],
    manualFeatures: !EXPANDED_SUBCLASS_FEATURES[classId]?.[id] })),
]));

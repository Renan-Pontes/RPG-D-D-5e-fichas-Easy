/* ============================================
   D&D 5e SRD Data
   Source: System Reference Document 5.1 (CC-BY 4.0)
   ============================================ */

const SRD = (() => {

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const SKILLS = [
  { id: 'acrobatics',     stat: 'dex' },
  { id: 'animalHandling', stat: 'wis' },
  { id: 'arcana',         stat: 'int' },
  { id: 'athletics',      stat: 'str' },
  { id: 'deception',      stat: 'cha' },
  { id: 'history',        stat: 'int' },
  { id: 'insight',        stat: 'wis' },
  { id: 'intimidation',   stat: 'cha' },
  { id: 'investigation',  stat: 'int' },
  { id: 'medicine',       stat: 'wis' },
  { id: 'nature',         stat: 'int' },
  { id: 'perception',     stat: 'wis' },
  { id: 'performance',    stat: 'cha' },
  { id: 'persuasion',     stat: 'cha' },
  { id: 'religion',       stat: 'int' },
  { id: 'sleightOfHand',  stat: 'dex' },
  { id: 'stealth',        stat: 'dex' },
  { id: 'survival',       stat: 'wis' },
];

const RACES = [
  {
    id: 'aasimar', size: 'Medium', speed: 30,
    asi: { cha: 2, wis: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Resistência Celestial', en: 'Celestial Resistance' }, desc: { pt: 'Resistência a dano necrótico e radiante.', en: 'Resistance to necrotic and radiant damage.' } },
      { name: { pt: 'Mãos Curandeiras', en: 'Healing Hands' }, desc: { pt: 'Ação: toque para curar 1d4 × seu nível de HP. 1×/descanso longo.', en: 'Action: touch to heal 1d4 × your level HP. 1/long rest.' } },
      { name: { pt: 'Portador de Luz', en: 'Light Bearer' }, desc: { pt: 'Você conhece o truque Luz (CHA).', en: 'You know the Light cantrip (CHA).' } },
    ],
    languages: ['Common', 'Celestial'],
  },
  {
    id: 'bugbear', size: 'Medium', speed: 30,
    asi: { str: 2, dex: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Membros Longos', en: 'Long-Limbed' }, desc: { pt: 'Em seu turno, alcance corpo a corpo +5 pés.', en: 'On your turn, melee reach increases by 5 ft.' } },
      { name: { pt: 'Constituição Poderosa', en: 'Powerful Build' }, desc: { pt: 'Conta como uma categoria maior para carregar/empurrar/arrastar.', en: 'Counts as one size larger for carry/push/drag.' } },
      { name: { pt: 'Furtivo', en: 'Sneaky' }, desc: { pt: 'Proficiência em Furtividade.', en: 'Proficiency in Stealth.' } },
      { name: { pt: 'Ataque Surpresa', en: 'Surprise Attack' }, desc: { pt: 'No 1° turno, +2d6 de dano se atacar uma criatura surpresa.', en: 'On 1st turn, +2d6 damage to a surprised creature.' } },
    ],
    languages: ['Common', 'Goblin'],
  },
  {
    id: 'centaur', size: 'Medium', speed: 40,
    asi: { str: 2, wis: 1 },
    traits: [
      { name: { pt: 'Tipo Feérico', en: 'Fey' }, desc: { pt: 'Você é uma criatura feérica.', en: 'You are a fey creature.' } },
      { name: { pt: 'Carga', en: 'Charge' }, desc: { pt: 'Mover 30+ pés em linha reta + ataque corpo a corpo: +1d6 dano ou alvo cai prono (CD 8+Str+prof).', en: 'Move 30+ ft straight + melee hit: +1d6 damage or knock prone (DC 8+Str+prof).' } },
      { name: { pt: 'Constituição Equina', en: 'Equine Build' }, desc: { pt: 'Conta como uma categoria maior para carregar e empurrar/arrastar.', en: 'Counts as one size larger for carrying and push/drag.' } },
      { name: { pt: 'Cascos', en: 'Hooves' }, desc: { pt: 'Ataque desarmado natural: 1d4 + Força de dano contundente.', en: 'Natural unarmed strike: 1d4 + Str bludgeoning damage.' } },
      { name: { pt: 'Instinto de Sobrevivência', en: 'Survival Instinct' }, desc: { pt: 'Proficiência em Sobrevivência.', en: 'Proficiency in Survival.' } },
    ],
    languages: ['Common', 'Sylvan'],
  },
  {
    id: 'changeling', size: 'Medium', speed: 30,
    asi: { cha: 2, dex: 1 },
    traits: [
      { name: { pt: 'Metamorfo', en: 'Shapechanger' }, desc: { pt: 'Ação: assumir aparência de outra criatura humanoide Pequena/Média que você já viu (não copia equipamento ou habilidades).', en: 'Action: assume appearance of any Small/Medium humanoid you have seen (no gear or abilities copied).' } },
      { name: { pt: 'Instintos do Metamorfo', en: 'Changeling Instincts' }, desc: { pt: 'Proficiência em duas perícias dentre Blefar, Intuição, Intimidação ou Persuasão.', en: 'Proficiency in 2 of: Deception, Insight, Intimidation, Persuasion.' } },
    ],
    languages: ['Common', '+2 of choice'],
  },
  {
    id: 'dragonborn', size: 'Medium', speed: 30,
    asi: { str: 2, cha: 1 },
    traits: [
      { name: { pt: 'Ancestral Dracônica', en: 'Draconic Ancestry' }, desc: { pt: 'Você possui uma ancestralidade dracônica. Escolha um tipo de dragão. Sua arma de sopro e resistência a dano são determinadas pelo tipo.', en: 'You have draconic ancestry. Choose a dragon type; it determines your breath weapon and damage resistance.' } },
      { name: { pt: 'Arma de Sopro', en: 'Breath Weapon' }, desc: { pt: 'Você pode usar sua ação para exalar energia destrutiva. Dano 2d6 (CD 8 + Con + bônus de prof).', en: 'You can use your action to exhale destructive energy. 2d6 damage (DC 8 + Con + prof bonus).' } },
      { name: { pt: 'Resistência a Dano', en: 'Damage Resistance' }, desc: { pt: 'Você tem resistência ao tipo de dano associado à sua ancestralidade dracônica.', en: 'You have resistance to the damage type associated with your draconic ancestry.' } },
    ],
    languages: ['Common', 'Draconic'],
  },
  {
    id: 'drow', size: 'Medium', speed: 30,
    asi: { dex: 2, cha: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro Superior', en: 'Superior Darkvision' }, desc: { pt: '120 pés.', en: '120 ft.' } },
      { name: { pt: 'Sentidos Apurados', en: 'Keen Senses' }, desc: { pt: 'Proficiência em Percepção.', en: 'Proficiency in Perception.' } },
      { name: { pt: 'Ancestral Feérico', en: 'Fey Ancestry' }, desc: { pt: 'Vantagem contra encantamentos; imune a sono mágico.', en: 'Advantage vs charm; immune to magical sleep.' } },
      { name: { pt: 'Sensibilidade à Luz Solar', en: 'Sunlight Sensitivity' }, desc: { pt: 'Desvantagem em ataques e Percepção (visão) sob luz solar direta.', en: 'Disadvantage on attacks and Perception (sight) in direct sunlight.' } },
      { name: { pt: 'Magia Drow', en: 'Drow Magic' }, desc: { pt: 'Truque Luzes Dançantes. No 3°, Fogo Feérico 1×/dia. No 5°, Escuridão 1×/dia. Conjuração: CHA.', en: 'Dancing Lights cantrip. At 3rd, Faerie Fire 1/day. At 5th, Darkness 1/day. CHA.' } },
      { name: { pt: 'Treinamento de Armas Drow', en: 'Drow Weapon Training' }, desc: { pt: 'Proficiência com floretes, espadas curtas e bestas de mão.', en: 'Proficiency with rapiers, shortswords, hand crossbows.' } },
    ],
    languages: ['Common', 'Elvish'],
  },
  {
    id: 'dwarf-hill', size: 'Medium', speed: 25,
    asi: { con: 2, wis: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Resiliência Anã', en: 'Dwarven Resilience' }, desc: { pt: 'Vantagem em testes contra veneno e resistência a dano de veneno.', en: 'Advantage on saves vs poison and resistance to poison damage.' } },
      { name: { pt: 'Treinamento de Combate Anão', en: 'Dwarven Combat Training' }, desc: { pt: 'Proficiência com machado de batalha, machadinha, martelo leve, e maul.', en: 'Proficiency with battleaxe, handaxe, light hammer, warhammer.' } },
      { name: { pt: 'Tenacidade Anã', en: 'Dwarven Toughness' }, desc: { pt: '+1 HP por nível.', en: '+1 HP per level.' } },
    ],
    languages: ['Common', 'Dwarvish'],
  },
  {
    id: 'dwarf-mountain', size: 'Medium', speed: 25,
    asi: { con: 2, str: 2 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Resiliência Anã', en: 'Dwarven Resilience' }, desc: { pt: 'Vantagem contra veneno; resistência a dano de veneno.', en: 'Advantage vs poison; resistance to poison damage.' } },
      { name: { pt: 'Treinamento de Armadura Anã', en: 'Dwarven Armor Training' }, desc: { pt: 'Proficiência com armaduras leves e médias.', en: 'Proficiency with light and medium armor.' } },
    ],
    languages: ['Common', 'Dwarvish'],
  },
  {
    id: 'elf-high', size: 'Medium', speed: 30,
    asi: { dex: 2, int: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Sentidos Apurados', en: 'Keen Senses' }, desc: { pt: 'Proficiência em Percepção.', en: 'Proficiency in Perception.' } },
      { name: { pt: 'Ancestral Feérico', en: 'Fey Ancestry' }, desc: { pt: 'Vantagem contra encantamentos; magia não pode pôr você para dormir.', en: 'Advantage vs charm; magic cannot put you to sleep.' } },
      { name: { pt: 'Transe', en: 'Trance' }, desc: { pt: 'Você medita 4h em vez de dormir.', en: 'You meditate for 4 hours instead of sleeping.' } },
      { name: { pt: 'Truque Cantado', en: 'Cantrip' }, desc: { pt: 'Você conhece um truque de mago à sua escolha.', en: 'You know one wizard cantrip.' } },
    ],
    languages: ['Common', 'Elvish'],
  },
  {
    id: 'elf-wood', size: 'Medium', speed: 35,
    asi: { dex: 2, wis: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Fuga na Natureza', en: 'Mask of the Wild' }, desc: { pt: 'Pode tentar se esconder mesmo levemente obscurecido pela natureza.', en: 'You can hide when lightly obscured by natural phenomena.' } },
      { name: { pt: 'Pés Velozes', en: 'Fleet of Foot' }, desc: { pt: 'Deslocamento base 35 pés.', en: 'Base speed 35 ft.' } },
    ],
    languages: ['Common', 'Elvish'],
  },
  {
    id: 'fairy', size: 'Small', speed: 30,
    asi: { dex: 2, cha: 1 },
    traits: [
      { name: { pt: 'Tipo Feérico', en: 'Fey' }, desc: { pt: 'Você é uma criatura feérica.', en: 'You are a fey creature.' } },
      { name: { pt: 'Voo', en: 'Flight' }, desc: { pt: 'Velocidade de voo de 30 pés (não pode voar com armadura média/pesada).', en: 'Flying speed 30 ft (no flying in medium/heavy armor).' } },
      { name: { pt: 'Magia Feérica', en: 'Fairy Magic' }, desc: { pt: 'Truque Druidcraft. No 3°, Fogo Feérico 1×/dia. No 5°, Aumentar/Reduzir 1×/dia. Use INT, SAB ou CHA.', en: 'Druidcraft cantrip. At 3rd, Faerie Fire 1/day. At 5th, Enlarge/Reduce 1/day.' } },
    ],
    languages: ['Common', 'Sylvan'],
  },
  {
    id: 'firbolg', size: 'Medium', speed: 30,
    asi: { wis: 2, str: 1 },
    traits: [
      { name: { pt: 'Magia Firbolg', en: 'Firbolg Magic' }, desc: { pt: 'Detectar Magia e Disfarçar-se 1×/descanso curto. Conjuração: SAB.', en: 'Detect Magic and Disguise Self 1/short rest. WIS.' } },
      { name: { pt: 'Passo Furtivo', en: 'Hidden Step' }, desc: { pt: 'Ação bônus: invisível por 1 turno. 1×/descanso curto.', en: 'Bonus action: invisible for 1 turn. 1/short rest.' } },
      { name: { pt: 'Constituição Poderosa', en: 'Powerful Build' }, desc: { pt: 'Conta como uma categoria maior para carregar/empurrar/arrastar.', en: 'Counts as one size larger for carry/push/drag.' } },
      { name: { pt: 'Fala da Fauna e da Flora', en: 'Speech of Beast and Leaf' }, desc: { pt: 'Pode falar com animais e plantas; vantagem em CHA para influenciá-los.', en: 'Can speak to beasts and plants; advantage on CHA checks to influence them.' } },
    ],
    languages: ['Common', 'Elvish', 'Giant'],
  },
  {
    id: 'genasi-air', size: 'Medium', speed: 30,
    asi: { con: 2, dex: 1 },
    traits: [
      { name: { pt: 'Respiração Infinita', en: 'Unending Breath' }, desc: { pt: 'Pode segurar a respiração indefinidamente quando não incapacitado.', en: 'Hold your breath indefinitely while not incapacitated.' } },
      { name: { pt: 'Misturar-se com o Vento', en: 'Mingle with the Wind' }, desc: { pt: 'Truque Toque Chocante. No 3°, Queda Suave 1×/descanso longo. Conjuração: CON.', en: 'Shocking Grasp cantrip. At 3rd, Feather Fall 1/long rest. CON.' } },
    ],
    languages: ['Common', 'Primordial'],
  },
  {
    id: 'genasi-earth', size: 'Medium', speed: 30,
    asi: { con: 2, str: 1 },
    traits: [
      { name: { pt: 'Caminhar Terreno', en: 'Earth Walk' }, desc: { pt: 'Pode mover-se em terreno difícil de pedra/terra sem custo extra.', en: 'Move across difficult terrain made of earth/stone without extra cost.' } },
      { name: { pt: 'Fundir-se com a Pedra', en: 'Merge with Stone' }, desc: { pt: 'Truque Brisa Defensora. No 3°, Passar sem Deixar Rastros 1×/descanso longo. Conjuração: CON.', en: 'Blade Ward cantrip. At 3rd, Pass without Trace 1/long rest. CON.' } },
    ],
    languages: ['Common', 'Primordial'],
  },
  {
    id: 'genasi-fire', size: 'Medium', speed: 30,
    asi: { con: 2, int: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Resistência ao Fogo', en: 'Fire Resistance' }, desc: { pt: 'Resistência a dano de fogo.', en: 'Resistance to fire damage.' } },
      { name: { pt: 'Alcance das Chamas', en: 'Reach to the Blaze' }, desc: { pt: 'Truque Produzir Chama. No 3°, Mãos Flamejantes 1×/descanso longo. Conjuração: CON.', en: 'Produce Flame cantrip. At 3rd, Burning Hands 1/long rest. CON.' } },
    ],
    languages: ['Common', 'Primordial'],
  },
  {
    id: 'genasi-water', size: 'Medium', speed: 30,
    asi: { con: 2, wis: 1 },
    traits: [
      { name: { pt: 'Resistência ao Ácido', en: 'Acid Resistance' }, desc: { pt: 'Resistência a dano de ácido.', en: 'Resistance to acid damage.' } },
      { name: { pt: 'Anfíbio', en: 'Amphibious' }, desc: { pt: 'Pode respirar ar e água.', en: 'Breathe both air and water.' } },
      { name: { pt: 'Natação', en: 'Swim Speed' }, desc: { pt: 'Velocidade de natação 30 pés.', en: 'Swim speed 30 ft.' } },
      { name: { pt: 'Chamado da Onda', en: 'Call to the Wave' }, desc: { pt: 'Truque Modelar Água. No 3°, Criar/Destruir Água 1×/descanso longo. Conjuração: CON.', en: 'Shape Water cantrip. At 3rd, Create or Destroy Water 1/long rest. CON.' } },
    ],
    languages: ['Common', 'Primordial'],
  },
  {
    id: 'gnome-forest', size: 'Small', speed: 25,
    asi: { int: 2, dex: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Astúcia Gnômica', en: 'Gnome Cunning' }, desc: { pt: 'Vantagem em testes de INT/WIS/CHA contra magia.', en: 'Advantage on INT/WIS/CHA saves vs magic.' } },
      { name: { pt: 'Ilusionista Natural', en: 'Natural Illusionist' }, desc: { pt: 'Você conhece o truque Ilusão Menor (INT).', en: 'You know the Minor Illusion cantrip (INT).' } },
      { name: { pt: 'Falar com Pequenas Bestas', en: 'Speak with Small Beasts' }, desc: { pt: 'Pode comunicar ideias simples com bestas Pequenas ou menores.', en: 'Communicate simple ideas with Small or smaller beasts.' } },
    ],
    languages: ['Common', 'Gnomish'],
  },
  {
    id: 'gnome-rock', size: 'Small', speed: 25,
    asi: { int: 2, con: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Astúcia Gnômica', en: 'Gnome Cunning' }, desc: { pt: 'Vantagem em testes de INT/WIS/CHA contra magia.', en: 'Advantage on INT/WIS/CHA saves vs magic.' } },
      { name: { pt: 'Conhecimento de Artífice', en: "Artificer's Lore" }, desc: { pt: 'Adiciona o dobro do bônus de prof. em testes de História sobre objetos mágicos, itens alquímicos e dispositivos tecnológicos.', en: 'Add double prof bonus to History checks about magic/alchemy/tech.' } },
    ],
    languages: ['Common', 'Gnomish'],
  },
  {
    id: 'goblin', size: 'Small', speed: 30,
    asi: { dex: 2, con: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Fúria do Pequeno', en: 'Fury of the Small' }, desc: { pt: 'Ao causar dano numa criatura maior que você, +1 dado de dano. 1×/descanso curto.', en: 'When you damage a larger creature, +prof damage. 1/short rest.' } },
      { name: { pt: 'Fuga Ágil', en: 'Nimble Escape' }, desc: { pt: 'Pode usar Disengage ou Hide como ação bônus em todos os turnos.', en: 'Can take Disengage or Hide as a bonus action each turn.' } },
    ],
    languages: ['Common', 'Goblin'],
  },
  {
    id: 'goliath', size: 'Medium', speed: 30,
    asi: { str: 2, con: 1 },
    traits: [
      { name: { pt: 'Atletismo das Montanhas', en: 'Mountain Born' }, desc: { pt: 'Resistência a frio; aclimatado a grandes altitudes.', en: 'Cold resistance; acclimated to high altitudes.' } },
      { name: { pt: 'Resistência da Pedra', en: "Stone's Endurance" }, desc: { pt: 'Reação ao receber dano: reduza-o em 1d12 + Con. 1×/descanso curto.', en: 'Reaction when damaged: reduce by 1d12 + Con. 1/short rest.' } },
      { name: { pt: 'Constituição Poderosa', en: 'Powerful Build' }, desc: { pt: 'Conta como uma categoria maior para carregar/empurrar/arrastar.', en: 'Counts as one size larger for carry/push/drag.' } },
      { name: { pt: 'Atletismo Natural', en: 'Natural Athlete' }, desc: { pt: 'Proficiência em Atletismo.', en: 'Proficiency in Athletics.' } },
    ],
    languages: ['Common', 'Giant'],
  },
  {
    id: 'half-elf', size: 'Medium', speed: 30,
    asi: { cha: 2, other: 2 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Ancestral Feérico', en: 'Fey Ancestry' }, desc: { pt: 'Vantagem contra encantamentos.', en: 'Advantage vs charm; immune to magical sleep.' } },
      { name: { pt: 'Versatilidade Hábil', en: 'Skill Versatility' }, desc: { pt: 'Proficiência em duas perícias à sua escolha.', en: 'Proficiency in 2 skills of your choice.' } },
    ],
    languages: ['Common', 'Elvish'],
  },
  {
    id: 'half-orc', size: 'Medium', speed: 30,
    asi: { str: 2, con: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Ameaça Implacável', en: 'Menacing' }, desc: { pt: 'Proficiência em Intimidação.', en: 'Proficiency in Intimidation.' } },
      { name: { pt: 'Resistência Implacável', en: 'Relentless Endurance' }, desc: { pt: 'Quando reduzido a 0 HP (não morto), fica com 1 HP. 1 vez por descanso longo.', en: 'When reduced to 0 HP (not killed), drop to 1 HP. Once per long rest.' } },
      { name: { pt: 'Ataques Selvagens', en: 'Savage Attacks' }, desc: { pt: 'Em crítico corpo a corpo, role 1 dado extra de dano.', en: 'On melee crit, roll 1 extra damage die.' } },
    ],
    languages: ['Common', 'Orc'],
  },
  {
    id: 'halfling-light', size: 'Small', speed: 25,
    asi: { dex: 2, cha: 1 },
    traits: [
      { name: { pt: 'Sortudo', en: 'Lucky' }, desc: { pt: 'Reroll 1s naturais em ataques, testes e salvamentos.', en: 'Reroll natural 1s on attack rolls, ability checks, and saves.' } },
      { name: { pt: 'Bravo', en: 'Brave' }, desc: { pt: 'Vantagem em testes contra medo.', en: 'Advantage vs being frightened.' } },
      { name: { pt: 'Agilidade Halfling', en: 'Halfling Nimbleness' }, desc: { pt: 'Pode mover-se através do espaço de criaturas maiores.', en: 'Can move through spaces of larger creatures.' } },
      { name: { pt: 'Furtividade Natural', en: 'Naturally Stealthy' }, desc: { pt: 'Pode se esconder atrás de criaturas pelo menos uma categoria maiores.', en: 'Can hide behind creatures at least one size larger.' } },
    ],
    languages: ['Common', 'Halfling'],
  },
  {
    id: 'halfling-stout', size: 'Small', speed: 25,
    asi: { dex: 2, con: 1 },
    traits: [
      { name: { pt: 'Sortudo', en: 'Lucky' }, desc: { pt: 'Reroll 1s naturais.', en: 'Reroll natural 1s.' } },
      { name: { pt: 'Bravo', en: 'Brave' }, desc: { pt: 'Vantagem contra medo.', en: 'Advantage vs frightened.' } },
      { name: { pt: 'Resiliência Robusta', en: 'Stout Resilience' }, desc: { pt: 'Vantagem contra veneno; resistência a dano de veneno.', en: 'Advantage vs poison; resistance to poison damage.' } },
    ],
    languages: ['Common', 'Halfling'],
  },
  {
    id: 'harengon', size: 'Medium', speed: 30,
    asi: { dex: 2, wis: 1 },
    traits: [
      { name: { pt: 'Tipo Feérico', en: 'Fey' }, desc: { pt: 'Você é uma criatura feérica.', en: 'You are a fey creature.' } },
      { name: { pt: 'Gatilho Lebrino', en: 'Hare-Trigger' }, desc: { pt: 'Adiciona o bônus de proficiência em testes de iniciativa.', en: 'Add proficiency bonus to initiative.' } },
      { name: { pt: 'Sentidos de Lebre', en: 'Leporine Senses' }, desc: { pt: 'Proficiência em Percepção.', en: 'Proficiency in Perception.' } },
      { name: { pt: 'Pés de Sorte', en: 'Lucky Footwork' }, desc: { pt: 'Reação ao falhar salvamento de Destreza: role 1d4 e some.', en: 'Reaction on failed DEX save: roll 1d4 and add.' } },
      { name: { pt: 'Salto de Coelho', en: 'Rabbit Hop' }, desc: { pt: 'Salto vertical/horizontal extra (5 × bônus de prof) sem corrida. Usos = bônus de prof / descanso longo.', en: 'Bonus action hop without running start (5 × prof). Prof bonus uses/long rest.' } },
    ],
    languages: ['Common', 'Sylvan'],
  },
  {
    id: 'hobgoblin', size: 'Medium', speed: 30,
    asi: { con: 2, int: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Treinamento Marcial', en: 'Martial Training' }, desc: { pt: 'Proficiência com armadura leve e duas armas marciais à sua escolha.', en: 'Proficiency in light armor and 2 martial weapons of your choice.' } },
      { name: { pt: 'Salvar as Aparências', en: 'Saving Face' }, desc: { pt: 'Reação ao falhar 1d20: +1 por aliado a até 30 pés (máx +5). 1×/descanso curto.', en: 'Reaction on a missed d20: +1 per ally within 30 ft (max +5). 1/short rest.' } },
    ],
    languages: ['Common', 'Goblin'],
  },
  {
    id: 'human', size: 'Medium', speed: 30,
    asi: { all: 1 },
    traits: [
      { name: { pt: 'Versatilidade Humana', en: 'Human Versatility' }, desc: { pt: '+1 em todos os atributos.', en: '+1 to every ability score.' } },
    ],
    languages: ['Common', '+1 of choice'],
  },
  {
    id: 'kenku', size: 'Medium', speed: 30,
    asi: { dex: 2, wis: 1 },
    traits: [
      { name: { pt: 'Falsificação Especialista', en: 'Expert Forgery' }, desc: { pt: 'Vantagem em testes para reproduzir escrita ou objetos.', en: 'Advantage on checks to duplicate writing or objects.' } },
      { name: { pt: 'Treinamento Kenku', en: 'Kenku Training' }, desc: { pt: 'Proficiência em duas: Acrobacia, Blefar, Furtividade ou Prestidigitação.', en: 'Proficiency in 2 of: Acrobatics, Deception, Stealth, Sleight of Hand.' } },
      { name: { pt: 'Mimetismo', en: 'Mimicry' }, desc: { pt: 'Pode imitar sons que já ouviu (CD = 8 + bônus de prof + CHA).', en: 'Mimic sounds you have heard (DC 8 + prof + CHA).' } },
    ],
    languages: ['Common', 'Auran'],
  },
  {
    id: 'kobold', size: 'Small', speed: 30,
    asi: { dex: 2, int: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Grito Dracônico', en: 'Draconic Cry' }, desc: { pt: 'Ação bônus: aliados ganham vantagem em ataques contra inimigos a até 10 pés. Bônus de prof / descanso longo.', en: 'Bonus action: allies gain advantage on attacks vs enemies within 10 ft. Prof bonus uses/long rest.' } },
      { name: { pt: 'Legado Kobold', en: 'Kobold Legacy' }, desc: { pt: 'Escolha um: Manhoso (1 perícia), Feitiçaria (1 truque INT/WIS/CHA) ou Resistente (vantagem contra amedrontado).', en: 'Choose one: Craftiness (1 skill prof), Draconic Sorcery (1 cantrip), or Defiance (advantage vs frightened).' } },
    ],
    languages: ['Common', 'Draconic'],
  },
  {
    id: 'leonin', size: 'Medium', speed: 35,
    asi: { con: 2, str: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Garras', en: 'Claws' }, desc: { pt: 'Ataque desarmado natural: 1d4 + Força de dano cortante.', en: 'Natural unarmed strike: 1d4 + Str slashing damage.' } },
      { name: { pt: 'Rugido Aterrador', en: 'Daunting Roar' }, desc: { pt: 'Ação bônus: criaturas a até 10 pés salvam (CD 8+prof+CON) ou ficam amedrontadas até o fim do seu próximo turno. 1×/descanso curto.', en: 'Bonus action: creatures within 10 ft save (DC 8+prof+CON) or become frightened until end of your next turn. 1/short rest.' } },
      { name: { pt: 'Arrojo do Caçador', en: "Hunter's Instincts" }, desc: { pt: 'Proficiência em uma perícia: Atletismo, Intimidação, Percepção ou Sobrevivência.', en: 'Proficiency in 1 of: Athletics, Intimidation, Perception, Survival.' } },
    ],
    languages: ['Common', 'Leonin'],
  },
  {
    id: 'lizardfolk', size: 'Medium', speed: 30,
    asi: { con: 2, wis: 1 },
    traits: [
      { name: { pt: 'Mordida', en: 'Bite' }, desc: { pt: 'Ataque desarmado natural: 1d6 + Força de dano perfurante.', en: 'Natural unarmed strike: 1d6 + Str piercing damage.' } },
      { name: { pt: 'Artesão Astuto', en: 'Cunning Artisan' }, desc: { pt: 'Em descanso curto, fabrica escudo, arma simples ou kit de munição com restos de criatura.', en: 'During a short rest, craft a shield, simple weapon, or pack of ammo from creature remains.' } },
      { name: { pt: 'Prender o Fôlego', en: 'Hold Breath' }, desc: { pt: 'Pode prender a respiração até 15 minutos.', en: 'Hold your breath for up to 15 minutes.' } },
      { name: { pt: 'Saber do Caçador', en: "Hunter's Lore" }, desc: { pt: 'Proficiência em duas perícias: Lidar com Animais, Natureza, Percepção, Sobrevivência ou Furtividade.', en: 'Proficiency in 2 of: Animal Handling, Nature, Perception, Survival, Stealth.' } },
      { name: { pt: 'Armadura Natural', en: 'Natural Armor' }, desc: { pt: 'Sem armadura, CA = 13 + Des.', en: 'Without armor, AC = 13 + Dex.' } },
      { name: { pt: 'Mandíbulas Famintas', en: 'Hungry Jaws' }, desc: { pt: 'Em ataque corpo a corpo bônus: morde e ganha THP iguais ao Con (mín 1). 1×/descanso curto.', en: 'Bonus melee bite: gain temp HP equal to Con (min 1). 1/short rest.' } },
    ],
    languages: ['Common', 'Draconic'],
  },
  {
    id: 'minotaur', size: 'Medium', speed: 30,
    asi: { str: 2, con: 1 },
    traits: [
      { name: { pt: 'Chifres', en: 'Horns' }, desc: { pt: 'Ataque desarmado natural: 1d6 + Força de dano perfurante.', en: 'Natural unarmed strike: 1d6 + Str piercing damage.' } },
      { name: { pt: 'Investida com Chifres', en: 'Goring Rush' }, desc: { pt: 'Após Disparada, ataque bônus de chifres.', en: 'After Dash, bonus action gore attack.' } },
      { name: { pt: 'Marteladas com Chifres', en: 'Hammering Horns' }, desc: { pt: 'Após acerto corpo a corpo, ação bônus para empurrar 10 pés (CD 8+prof+STR).', en: 'After melee hit, bonus action to push 10 ft (DC 8+prof+STR).' } },
      { name: { pt: 'Memória Labiríntica', en: 'Labyrinthine Recall' }, desc: { pt: 'Lembra perfeitamente de qualquer caminho que você tenha percorrido.', en: 'Perfectly recall any path you have traveled.' } },
    ],
    languages: ['Common', 'Minotaur'],
  },
  {
    id: 'orc', size: 'Medium', speed: 30,
    asi: { str: 2, con: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Agressivo', en: 'Aggressive' }, desc: { pt: 'Ação bônus: mover-se até seu deslocamento em direção a um inimigo visível.', en: 'Bonus action: move up to your speed toward a visible hostile.' } },
      { name: { pt: 'Constituição Poderosa', en: 'Powerful Build' }, desc: { pt: 'Conta como uma categoria maior para carregar/empurrar/arrastar.', en: 'Counts as one size larger for carry/push/drag.' } },
      { name: { pt: 'Intuição Primitiva', en: 'Primal Intuition' }, desc: { pt: 'Proficiência em Intimidação e Sobrevivência.', en: 'Proficiency in Intimidation and Survival.' } },
    ],
    languages: ['Common', 'Orc'],
  },
  {
    id: 'satyr', size: 'Medium', speed: 35,
    asi: { cha: 2, dex: 1 },
    traits: [
      { name: { pt: 'Tipo Feérico', en: 'Fey' }, desc: { pt: 'Você é uma criatura feérica.', en: 'You are a fey creature.' } },
      { name: { pt: 'Investida com Chifres', en: 'Ram' }, desc: { pt: 'Ataque desarmado natural: 1d4 + Força de dano contundente.', en: 'Natural unarmed strike: 1d4 + Str bludgeoning damage.' } },
      { name: { pt: 'Resistência Mágica', en: 'Magic Resistance' }, desc: { pt: 'Vantagem em salvamentos contra magias.', en: 'Advantage on saves vs spells.' } },
      { name: { pt: 'Saltos Joviais', en: 'Mirthful Leaps' }, desc: { pt: 'Adiciona seu mod de Des (mín 1) à distância de qualquer salto.', en: 'Add Dex mod (min 1) to jump distance.' } },
      { name: { pt: 'Folião', en: 'Reveler' }, desc: { pt: 'Proficiência em Atuação e Persuasão.', en: 'Proficiency in Performance and Persuasion.' } },
    ],
    languages: ['Common', 'Sylvan'],
  },
  {
    id: 'tabaxi', size: 'Medium', speed: 30,
    asi: { dex: 2, cha: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Agilidade Felina', en: 'Feline Agility' }, desc: { pt: 'Em seu turno, dobre seu deslocamento. Recarrega ao ficar parado por 1 turno.', en: 'On your turn, double your speed. Recharges after a stationary turn.' } },
      { name: { pt: 'Garras de Gato', en: "Cat's Claws" }, desc: { pt: 'Ataque natural: 1d4 + Força. Velocidade de escalada 20 pés.', en: 'Natural strike: 1d4 + Str. Climb speed 20 ft.' } },
      { name: { pt: 'Talento Felino', en: "Cat's Talent" }, desc: { pt: 'Proficiência em Percepção e Furtividade.', en: 'Proficiency in Perception and Stealth.' } },
    ],
    languages: ['Common', '+1 of choice'],
  },
  {
    id: 'tiefling', size: 'Medium', speed: 30,
    asi: { cha: 2, int: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Resistência Infernal', en: 'Hellish Resistance' }, desc: { pt: 'Resistência a dano de fogo.', en: 'Resistance to fire damage.' } },
      { name: { pt: 'Legado Infernal', en: 'Infernal Legacy' }, desc: { pt: 'Você conhece Taumaturgia. Em nível 3, Repreensão Infernal 1×/dia. Nível 5, Escuridão 1×/dia.', en: 'You know Thaumaturgy. At lvl 3, Hellish Rebuke 1/day. Lvl 5, Darkness 1/day.' } },
    ],
    languages: ['Common', 'Infernal'],
  },
  {
    id: 'tortle', size: 'Medium', speed: 30,
    asi: { str: 2, wis: 1 },
    traits: [
      { name: { pt: 'Garras', en: 'Claws' }, desc: { pt: 'Ataque desarmado natural: 1d4 + Força de dano cortante.', en: 'Natural unarmed strike: 1d4 + Str slashing damage.' } },
      { name: { pt: 'Prender o Fôlego', en: 'Hold Breath' }, desc: { pt: 'Pode segurar a respiração por até 1 hora.', en: 'Hold breath for up to 1 hour.' } },
      { name: { pt: 'Armadura Natural', en: 'Natural Armor' }, desc: { pt: 'CA base 17 (não usa Des, não usa armadura).', en: 'Base AC 17 (no Dex, no armor).' } },
      { name: { pt: 'Defesa do Casco', en: 'Shell Defense' }, desc: { pt: 'Ação: recolher-se no casco, CA 20, vantagem em salvamentos de CON/STR, mas inca­pacitado e veloc 0.', en: 'Action: retreat into shell, AC 20, advantage on Con/Str saves, but incapacitated and 0 speed.' } },
      { name: { pt: 'Instinto de Sobrevivência', en: 'Survival Instinct' }, desc: { pt: 'Proficiência em Sobrevivência.', en: 'Proficiency in Survival.' } },
    ],
    languages: ['Common', 'Aquan'],
  },
  {
    id: 'triton', size: 'Medium', speed: 30,
    asi: { str: 1, con: 1, cha: 1 },
    traits: [
      { name: { pt: 'Anfíbio', en: 'Amphibious' }, desc: { pt: 'Pode respirar ar e água.', en: 'Breathe both air and water.' } },
      { name: { pt: 'Controle do Ar e da Água', en: 'Control Air and Water' }, desc: { pt: 'Névoa 1×/longo (1°). No 3°, Lufada de Vento. No 5°, Muralha de Água. Conjuração: CHA.', en: 'Fog Cloud 1/long (lvl 1). At 3rd, Gust of Wind. At 5th, Wall of Water. CHA.' } },
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Emissário do Mar', en: 'Emissary of the Sea' }, desc: { pt: 'Pode comunicar ideias simples com bestas aquáticas.', en: 'Communicate simple ideas with water-breathing beasts.' } },
      { name: { pt: 'Guardião das Profundezas', en: 'Guardians of the Depths' }, desc: { pt: 'Resistência a dano de frio.', en: 'Resistance to cold damage.' } },
      { name: { pt: 'Natação', en: 'Swim Speed' }, desc: { pt: 'Velocidade de natação 30 pés.', en: 'Swim speed 30 ft.' } },
    ],
    languages: ['Common', 'Primordial'],
  },
  {
    id: 'warforged', size: 'Medium', speed: 30,
    asi: { con: 2, str: 1 },
    traits: [
      { name: { pt: 'Resiliência Construída', en: 'Constructed Resilience' }, desc: { pt: 'Vantagem em salvamentos contra veneno e resistência a dano de veneno; imune a doenças; não precisa comer/beber/respirar/dormir.', en: 'Advantage on saves vs poison; resistance to poison; immune to disease; no need to eat/drink/breathe/sleep.' } },
      { name: { pt: 'Descanso Sentinela', en: "Sentry's Rest" }, desc: { pt: 'Em descanso longo, fica consciente e ativo (sem dormir).', en: 'During a long rest, remain conscious and aware.' } },
      { name: { pt: 'Proteção Integrada', en: 'Integrated Protection' }, desc: { pt: '+1 CA. Você pode incorporar armadura ao seu corpo.', en: '+1 AC. Armor can be integrated into your body.' } },
      { name: { pt: 'Design Especializado', en: 'Specialized Design' }, desc: { pt: 'Proficiência em uma perícia e uma ferramenta à sua escolha.', en: 'Proficiency in 1 skill and 1 tool of your choice.' } },
    ],
    languages: ['Common', '+1 of choice'],
  },
  {
    id: 'yuan-ti', size: 'Medium', speed: 30,
    asi: { cha: 2, int: 1 },
    traits: [
      { name: { pt: 'Visão no Escuro', en: 'Darkvision' }, desc: { pt: '60 pés.', en: '60 ft.' } },
      { name: { pt: 'Conjuração Inata', en: 'Innate Spellcasting' }, desc: { pt: 'Truque Spray Venenoso. Amizade Animal (apenas serpentes) à vontade. No 3°, Sugestão 1×/longo. Conjuração: CHA.', en: 'Poison Spray cantrip. Animal Friendship (snakes only) at will. At 3rd, Suggestion 1/long. CHA.' } },
      { name: { pt: 'Resistência Mágica', en: 'Magic Resistance' }, desc: { pt: 'Vantagem em salvamentos contra magias.', en: 'Advantage on saves vs spells.' } },
      { name: { pt: 'Imunidade a Veneno', en: 'Poison Immunity' }, desc: { pt: 'Imune a dano de veneno e à condição envenenado.', en: 'Immune to poison damage and the poisoned condition.' } },
    ],
    languages: ['Common', 'Abyssal', 'Draconic'],
  },
];

const CLASSES = [
  {
    id: 'barbarian', hitDie: 12,
    saves: ['str', 'con'],
    armor: ['Light', 'Medium', 'Shields'],
    weapons: ['Simple', 'Martial'],
    skillsFrom: ['animalHandling','athletics','intimidation','nature','perception','survival'],
    skillCount: 2,
    spellcaster: false,
    features: [
      { name: { pt: 'Fúria', en: 'Rage' }, desc: { pt: 'Como ação bônus, entre em fúria por 1 min: vantagem em testes de Força, +2 dano corpo a corpo, resistência a dano físico (corte/perfuração/contusão). 2 usos no nível 1.', en: 'As bonus action, rage for 1 min: advantage on Str checks/saves, +2 melee damage, resistance to bludgeon/pierce/slash. 2 uses at level 1.' } },
      { name: { pt: 'Defesa sem Armadura', en: 'Unarmored Defense' }, desc: { pt: 'Sem armadura: CA = 10 + Des + Con.', en: 'Without armor, AC = 10 + Dex + Con.' } },
    ],
  },
  {
    id: 'bard', hitDie: 8,
    saves: ['dex', 'cha'],
    armor: ['Light'],
    weapons: ['Simple', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'],
    skillsFrom: SKILLS.map(s => s.id),
    skillCount: 3,
    spellcaster: true, spellAbility: 'cha',
    features: [
      { name: { pt: 'Conjuração', en: 'Spellcasting' }, desc: { pt: 'Você conhece 2 truques e 4 magias de 1° nível. Modificador de conjuração: CHA.', en: 'You know 2 cantrips and 4 1st-level spells. Spellcasting ability: CHA.' } },
      { name: { pt: 'Inspiração Bárdica', en: 'Bardic Inspiration' }, desc: { pt: 'Ação bônus: dê um d6 a uma criatura aliada. Ela pode adicionar a um teste, ataque, ou salvamento nos próximos 10 min. CHA mod usos/descanso longo.', en: 'Bonus action: give an ally a d6 to add to an ability check, attack, or save in the next 10 min. CHA mod uses per long rest.' } },
    ],
  },
  {
    id: 'cleric', hitDie: 8,
    saves: ['wis', 'cha'],
    armor: ['Light', 'Medium', 'Shields'],
    weapons: ['Simple'],
    skillsFrom: ['history','insight','medicine','persuasion','religion'],
    skillCount: 2,
    spellcaster: true, spellAbility: 'wis',
    features: [
      { name: { pt: 'Conjuração', en: 'Spellcasting' }, desc: { pt: '3 truques e preparações de magia baseadas em WIS + nível. Modificador: SAB.', en: '3 cantrips, prepare spells equal to WIS mod + cleric level. Ability: WIS.' } },
      { name: { pt: 'Domínio Divino', en: 'Divine Domain' }, desc: { pt: 'Escolha um domínio (Vida, Luz, Conhecimento, Natureza, Tempestade, Engano, Guerra). Concede magias de domínio e habilidades.', en: 'Choose a domain (Life, Light, Knowledge, Nature, Tempest, Trickery, War). Grants domain spells and features.' } },
    ],
  },
  {
    id: 'druid', hitDie: 8,
    saves: ['int', 'wis'],
    armor: ['Light', 'Medium', 'Shields (no metal)'],
    weapons: ['Clubs','Daggers','Darts','Javelins','Maces','Quarterstaffs','Scimitars','Sickles','Slings','Spears'],
    skillsFrom: ['arcana','animalHandling','insight','medicine','nature','perception','religion','survival'],
    skillCount: 2,
    spellcaster: true, spellAbility: 'wis',
    features: [
      { name: { pt: 'Druídico', en: 'Druidic' }, desc: { pt: 'Você conhece o idioma secreto dos druidas.', en: 'You know Druidic, the secret language of druids.' } },
      { name: { pt: 'Conjuração', en: 'Spellcasting' }, desc: { pt: '2 truques. Prepare WIS + nível magias. Modificador: SAB.', en: '2 cantrips. Prepare WIS + level spells. Ability: WIS.' } },
    ],
  },
  {
    id: 'fighter', hitDie: 10,
    saves: ['str', 'con'],
    armor: ['Light', 'Medium', 'Heavy', 'Shields'],
    weapons: ['Simple', 'Martial'],
    skillsFrom: ['acrobatics','animalHandling','athletics','history','insight','intimidation','perception','survival'],
    skillCount: 2,
    spellcaster: false,
    features: [
      { name: { pt: 'Estilo de Combate', en: 'Fighting Style' }, desc: { pt: 'Escolha: Arquearia, Defesa, Duelo, Luta com Arma Grande, Proteção, Combate com Duas Armas.', en: 'Choose: Archery, Defense, Dueling, Great Weapon Fighting, Protection, Two-Weapon Fighting.' } },
      { name: { pt: 'Segundo Fôlego', en: 'Second Wind' }, desc: { pt: 'Ação bônus: recupere 1d10 + nível de HP. Uma vez por descanso curto.', en: 'Bonus action: regain 1d10 + level HP. Once per short rest.' } },
    ],
  },
  {
    id: 'monk', hitDie: 8,
    saves: ['str', 'dex'],
    armor: [],
    weapons: ['Simple', 'Shortswords'],
    skillsFrom: ['acrobatics','athletics','history','insight','religion','stealth'],
    skillCount: 2,
    spellcaster: false,
    features: [
      { name: { pt: 'Defesa sem Armadura', en: 'Unarmored Defense' }, desc: { pt: 'Sem armadura/escudo: CA = 10 + Des + Sab.', en: 'Without armor/shield, AC = 10 + Dex + Wis.' } },
      { name: { pt: 'Artes Marciais', en: 'Martial Arts' }, desc: { pt: 'Use Des em vez de For em ataques desarmados/arma monge. Dano marcial 1d4. Ataque desarmado como bônus após ataque com ação.', en: 'Use Dex for unarmed/monk weapon attacks. Martial die: 1d4. Bonus unarmed strike after Attack action.' } },
    ],
  },
  {
    id: 'paladin', hitDie: 10,
    saves: ['wis', 'cha'],
    armor: ['Light', 'Medium', 'Heavy', 'Shields'],
    weapons: ['Simple', 'Martial'],
    skillsFrom: ['athletics','insight','intimidation','medicine','persuasion','religion'],
    skillCount: 2,
    spellcaster: false,
    features: [
      { name: { pt: 'Sentido Divino', en: 'Divine Sense' }, desc: { pt: 'Ação: detecte celestiais, mortos-vivos e demônios em 60 pés. 1 + CHA mod usos/descanso longo.', en: 'Action: detect celestials/undead/fiends within 60 ft. 1 + CHA mod uses per long rest.' } },
      { name: { pt: 'Imposição de Mãos', en: 'Lay on Hands' }, desc: { pt: 'Reservatório de cura: 5 × nível HP por descanso longo. Cura veneno/doença usando 5 HP.', en: 'Healing pool of 5 × level HP per long rest. Cure poison/disease for 5 HP.' } },
    ],
  },
  {
    id: 'ranger', hitDie: 10,
    saves: ['str', 'dex'],
    armor: ['Light', 'Medium', 'Shields'],
    weapons: ['Simple', 'Martial'],
    skillsFrom: ['animalHandling','athletics','insight','investigation','nature','perception','stealth','survival'],
    skillCount: 3,
    spellcaster: false,
    features: [
      { name: { pt: 'Inimigo Favorito', en: 'Favored Enemy' }, desc: { pt: 'Escolha um tipo de criatura. Vantagem em testes de Survival para rastreá-los e Inteligência para lembrar info.', en: 'Choose a type. Advantage on Survival to track and Int to recall info.' } },
      { name: { pt: 'Explorador Natural', en: 'Natural Explorer' }, desc: { pt: 'Escolha um tipo de terreno. Bônus de proficiência dobrado em testes de Int e Wis nesse terreno.', en: 'Choose a terrain. Prof bonus is doubled on Int/Wis checks in that terrain.' } },
    ],
  },
  {
    id: 'rogue', hitDie: 8,
    saves: ['dex', 'int'],
    armor: ['Light'],
    weapons: ['Simple', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'],
    skillsFrom: ['acrobatics','athletics','deception','insight','intimidation','investigation','perception','performance','persuasion','sleightOfHand','stealth'],
    skillCount: 4,
    spellcaster: false,
    features: [
      { name: { pt: 'Perícia', en: 'Expertise' }, desc: { pt: 'Dobre o bônus de proficiência em 2 perícias (ou 1 perícia + ferramentas de ladrão).', en: 'Double prof bonus on 2 skills (or 1 skill + thieves\' tools).' } },
      { name: { pt: 'Ataque Furtivo', en: 'Sneak Attack' }, desc: { pt: '+1d6 de dano 1×/turno contra alvo com vantagem ou aliado adjacente. Arma de Destreza ou à distância.', en: '+1d6 damage 1/turn vs target with advantage or with ally adjacent. Finesse or ranged weapon.' } },
      { name: { pt: 'Gíria de Ladrões', en: "Thieves' Cant" }, desc: { pt: 'Conhece o jargão secreto dos ladrões.', en: 'You know the secret thieves\' jargon.' } },
    ],
  },
  {
    id: 'sorcerer', hitDie: 6,
    saves: ['con', 'cha'],
    armor: [],
    weapons: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'],
    skillsFrom: ['arcana','deception','insight','intimidation','persuasion','religion'],
    skillCount: 2,
    spellcaster: true, spellAbility: 'cha',
    features: [
      { name: { pt: 'Conjuração', en: 'Spellcasting' }, desc: { pt: '4 truques e 2 magias de 1° nível. Modificador: CHA.', en: '4 cantrips and 2 1st-level spells. Ability: CHA.' } },
      { name: { pt: 'Origem Feiticeira', en: 'Sorcerous Origin' }, desc: { pt: 'Escolha origem: Linhagem Dracônica, Magia Selvagem, etc.', en: 'Choose origin: Draconic Bloodline, Wild Magic, etc.' } },
    ],
  },
  {
    id: 'warlock', hitDie: 8,
    saves: ['wis', 'cha'],
    armor: ['Light'],
    weapons: ['Simple'],
    skillsFrom: ['arcana','deception','history','intimidation','investigation','nature','religion'],
    skillCount: 2,
    spellcaster: true, spellAbility: 'cha',
    features: [
      { name: { pt: 'Conjuração de Pacto', en: 'Pact Magic' }, desc: { pt: '2 truques e 2 magias de 1° nível. Slots de pacto recarregam em descanso curto. Modificador: CHA.', en: '2 cantrips and 2 1st-level spells. Pact slots recharge on short rest. Ability: CHA.' } },
      { name: { pt: 'Patrono Sobrenatural', en: 'Otherworldly Patron' }, desc: { pt: 'O Lorde Demoníaco, A Fada, O Antigo, etc.', en: 'The Fiend, The Archfey, The Great Old One, etc.' } },
    ],
  },
  {
    id: 'wizard', hitDie: 6,
    saves: ['int', 'wis'],
    armor: [],
    weapons: ['Daggers','Darts','Slings','Quarterstaffs','Light crossbows'],
    skillsFrom: ['arcana','history','insight','investigation','medicine','religion'],
    skillCount: 2,
    spellcaster: true, spellAbility: 'int',
    features: [
      { name: { pt: 'Conjuração', en: 'Spellcasting' }, desc: { pt: '3 truques. Livro de magias com 6 magias de 1° nível. Prepare INT + nível por dia. Modificador: INT.', en: '3 cantrips. Spellbook with 6 1st-level spells. Prepare INT + level per day. Ability: INT.' } },
      { name: { pt: 'Recuperação Arcana', en: 'Arcane Recovery' }, desc: { pt: 'Uma vez por dia em descanso curto, recupere slots cujo total seja metade do nível (arredondado).', en: 'Once per day on short rest, recover spell slots totaling half your level (rounded up).' } },
    ],
  },
];

const BACKGROUNDS = [
  { id: 'acolyte',     skills: ['insight', 'religion'],     languages: 2, equipment: { pt: 'Símbolo sagrado, livro de orações, 5 paus de incenso, vestes, bolsa com 15 po', en: 'Holy symbol, prayer book, 5 sticks of incense, vestments, pouch w/ 15gp' } },
  { id: 'criminal',    skills: ['deception', 'stealth'],    languages: 0, equipment: { pt: 'Pé-de-cabra, roupas escuras com capuz, bolsa com 15 po', en: 'Crowbar, dark common clothes w/ hood, pouch w/ 15gp' } },
  { id: 'folkHero',    skills: ['animalHandling', 'survival'], languages: 0, equipment: { pt: 'Ferramentas de artesão, pá, marmita de ferro, roupas comuns, 10 po', en: "Artisan's tools, shovel, iron pot, common clothes, 10gp" } },
  { id: 'noble',       skills: ['history', 'persuasion'],   languages: 1, equipment: { pt: 'Roupas finas, anel de sinete, pergaminho de genealogia, 25 po', en: 'Fine clothes, signet ring, scroll of pedigree, 25gp' } },
  { id: 'sage',        skills: ['arcana', 'history'],       languages: 2, equipment: { pt: 'Frasco de tinta, pena, faca, carta de colega, roupas comuns, 10 po', en: 'Bottle of ink, quill, knife, letter from colleague, common clothes, 10gp' } },
  { id: 'soldier',     skills: ['athletics', 'intimidation'], languages: 0, equipment: { pt: 'Insígnia, troféu, jogo de cartas/dados, roupas comuns, 10 po', en: 'Insignia, trophy, deck of cards/dice, common clothes, 10gp' } },
  { id: 'hermit',      skills: ['medicine', 'religion'],    languages: 1, equipment: { pt: 'Estojo de mapas/pergaminhos, manta, vestes, kit de herbalismo, 5 po', en: 'Map/scroll case, blanket, vestments, herbalism kit, 5gp' } },
  { id: 'entertainer', skills: ['acrobatics', 'performance'], languages: 0, equipment: { pt: 'Instrumento musical, traje de admirador, fantasia, 15 po', en: 'Musical instrument, costume, admirer favor, 15gp' } },
  { id: 'guildArtisan',skills: ['insight', 'persuasion'],   languages: 1, equipment: { pt: 'Ferramentas de artesão, carta de apresentação, roupas de viagem, 15 po', en: "Artisan's tools, letter of introduction, traveler's clothes, 15gp" } },
  { id: 'outlander',   skills: ['athletics', 'survival'],   languages: 1, equipment: { pt: 'Bastão, armadilha, troféu de caça, roupas de viagem, 10 po', en: 'Staff, hunting trap, animal trophy, traveler\'s clothes, 10gp' } },
  { id: 'sailor',      skills: ['athletics', 'perception'], languages: 0, equipment: { pt: 'Pino de manilha, corda de seda 50pés, talismã, roupas comuns, 10 po', en: 'Belaying pin, 50ft silk rope, lucky charm, common clothes, 10gp' } },
  { id: 'urchin',      skills: ['sleightOfHand', 'stealth'], languages: 0, equipment: { pt: 'Faca, mapa cidade-natal, rato, bilhete dos pais, copo, 10 po', en: 'Small knife, map of home city, pet mouse, parent token, cup, 10gp' } },
  { id: 'charlatan',   skills: ['deception', 'sleightOfHand'], languages: 0, equipment: { pt: 'Roupas finas, kit de disfarce, ferramentas de fraude (cartas marcadas/dados viciados), 15 po', en: 'Fine clothes, disguise kit, con tools (loaded dice/marked cards), 15gp' } },
  { id: 'gladiator',   skills: ['acrobatics', 'performance'], languages: 0, equipment: { pt: 'Arma incomum (lembrança), traje de admirador, fantasia, 15 po', en: 'Unusual weapon (memento), admirer favor, costume, 15gp' } },
  { id: 'knight',      skills: ['history', 'persuasion'],   languages: 1, equipment: { pt: 'Roupas finas, anel de sinete, brasão, 25 po, atendente leal', en: 'Fine clothes, signet ring, scroll w/ titles, 25gp, loyal retainer' } },
  { id: 'pirate',      skills: ['athletics', 'perception'], languages: 0, equipment: { pt: 'Pino de manilha, corda 50 pés, fantasia/vestes, 10 po', en: 'Belaying pin, 50ft rope, costume, 10gp' } },
  { id: 'spy',         skills: ['deception', 'stealth'],    languages: 0, equipment: { pt: 'Insígnia de espião, roupas comuns, lembrança da missão anterior, 10 po', en: 'Spy insignia, common clothes, memento of last mission, 10gp' } },
  { id: 'cityWatch',   skills: ['athletics', 'insight'],    languages: 2, equipment: { pt: 'Insígnia da guarda, manopla, vestes de cidade, 10 po, lanterna', en: 'Watch insignia, manacles, city clothes, 10gp, lantern' } },
  { id: 'farTraveler', skills: ['insight', 'perception'],   languages: 1, equipment: { pt: 'Roupas exóticas, instrumento musical/jogo, peças de origem, 5 po em moedas estrangeiras', en: 'Exotic clothes, instrument/game, origin trinkets, 5gp foreign coin' } },
  { id: 'inheritor',   skills: ['survival', 'arcana'],      languages: 1, equipment: { pt: 'Herança (carta, mapa, item mágico menor), roupas comuns, 15 po', en: 'Inheritance (letter, map, minor magic item), common clothes, 15gp' } },
];

const ALIGNMENTS = ['LG','NG','CG','LN','N','CN','LE','NE','CE'];

const WEAPONS = [
  // Simple Melee
  { id: 'club',         type: 'simple-melee',   damage: '1d4', dmgType: 'bludgeoning', props: ['light'] },
  { id: 'dagger',       type: 'simple-melee',   damage: '1d4', dmgType: 'piercing', props: ['finesse','light','thrown'] },
  { id: 'greatclub',    type: 'simple-melee',   damage: '1d8', dmgType: 'bludgeoning', props: ['two-handed'] },
  { id: 'handaxe',      type: 'simple-melee',   damage: '1d6', dmgType: 'slashing', props: ['light','thrown'] },
  { id: 'javelin',      type: 'simple-melee',   damage: '1d6', dmgType: 'piercing', props: ['thrown'] },
  { id: 'lightHammer',  type: 'simple-melee',   damage: '1d4', dmgType: 'bludgeoning', props: ['light','thrown'] },
  { id: 'mace',         type: 'simple-melee',   damage: '1d6', dmgType: 'bludgeoning', props: [] },
  { id: 'quarterstaff', type: 'simple-melee',   damage: '1d6', dmgType: 'bludgeoning', props: ['versatile'] },
  { id: 'sickle',       type: 'simple-melee',   damage: '1d4', dmgType: 'slashing', props: ['light'] },
  { id: 'spear',        type: 'simple-melee',   damage: '1d6', dmgType: 'piercing', props: ['thrown','versatile'] },
  // Simple Ranged
  { id: 'crossbowLight',type: 'simple-ranged',  damage: '1d8', dmgType: 'piercing', props: ['ammo','loading','two-handed'] },
  { id: 'dart',         type: 'simple-ranged',  damage: '1d4', dmgType: 'piercing', props: ['finesse','thrown'] },
  { id: 'shortbow',     type: 'simple-ranged',  damage: '1d6', dmgType: 'piercing', props: ['ammo','two-handed'] },
  { id: 'sling',        type: 'simple-ranged',  damage: '1d4', dmgType: 'bludgeoning', props: ['ammo'] },
  // Martial Melee
  { id: 'battleaxe',    type: 'martial-melee',  damage: '1d8', dmgType: 'slashing', props: ['versatile'] },
  { id: 'flail',        type: 'martial-melee',  damage: '1d8', dmgType: 'bludgeoning', props: [] },
  { id: 'glaive',       type: 'martial-melee',  damage: '1d10', dmgType: 'slashing', props: ['heavy','reach','two-handed'] },
  { id: 'greataxe',     type: 'martial-melee',  damage: '1d12', dmgType: 'slashing', props: ['heavy','two-handed'] },
  { id: 'greatsword',   type: 'martial-melee',  damage: '2d6', dmgType: 'slashing', props: ['heavy','two-handed'] },
  { id: 'halberd',      type: 'martial-melee',  damage: '1d10', dmgType: 'slashing', props: ['heavy','reach','two-handed'] },
  { id: 'lance',        type: 'martial-melee',  damage: '1d12', dmgType: 'piercing', props: ['reach','special'] },
  { id: 'longsword',    type: 'martial-melee',  damage: '1d8', dmgType: 'slashing', props: ['versatile'] },
  { id: 'maul',         type: 'martial-melee',  damage: '2d6', dmgType: 'bludgeoning', props: ['heavy','two-handed'] },
  { id: 'morningstar',  type: 'martial-melee',  damage: '1d8', dmgType: 'piercing', props: [] },
  { id: 'pike',         type: 'martial-melee',  damage: '1d10', dmgType: 'piercing', props: ['heavy','reach','two-handed'] },
  { id: 'rapier',       type: 'martial-melee',  damage: '1d8', dmgType: 'piercing', props: ['finesse'] },
  { id: 'scimitar',     type: 'martial-melee',  damage: '1d6', dmgType: 'slashing', props: ['finesse','light'] },
  { id: 'shortsword',   type: 'martial-melee',  damage: '1d6', dmgType: 'piercing', props: ['finesse','light'] },
  { id: 'trident',      type: 'martial-melee',  damage: '1d6', dmgType: 'piercing', props: ['thrown','versatile'] },
  { id: 'warPick',      type: 'martial-melee',  damage: '1d8', dmgType: 'piercing', props: [] },
  { id: 'warhammer',    type: 'martial-melee',  damage: '1d8', dmgType: 'bludgeoning', props: ['versatile'] },
  { id: 'whip',         type: 'martial-melee',  damage: '1d4', dmgType: 'slashing', props: ['finesse','reach'] },
  // Martial Ranged
  { id: 'blowgun',      type: 'martial-ranged', damage: '1', dmgType: 'piercing', props: ['ammo','loading'] },
  { id: 'crossbowHand', type: 'martial-ranged', damage: '1d6', dmgType: 'piercing', props: ['ammo','light','loading'] },
  { id: 'crossbowHeavy',type: 'martial-ranged', damage: '1d10', dmgType: 'piercing', props: ['ammo','heavy','loading','two-handed'] },
  { id: 'longbow',      type: 'martial-ranged', damage: '1d8', dmgType: 'piercing', props: ['ammo','heavy','two-handed'] },
  { id: 'net',          type: 'martial-ranged', damage: '-', dmgType: '-', props: ['special','thrown'] },
];

const ARMOR = [
  // Light
  { id: 'padded',       type: 'light',   ac: 11, stealth: 'disadv' },
  { id: 'leather',      type: 'light',   ac: 11 },
  { id: 'studdedLeather', type: 'light', ac: 12 },
  // Medium
  { id: 'hide',         type: 'medium',  ac: 12 },
  { id: 'chainShirt',   type: 'medium',  ac: 13 },
  { id: 'scaleMail',    type: 'medium',  ac: 14, stealth: 'disadv' },
  { id: 'breastplate',  type: 'medium',  ac: 14 },
  { id: 'halfPlate',    type: 'medium',  ac: 15, stealth: 'disadv' },
  // Heavy
  { id: 'ringMail',     type: 'heavy',   ac: 14, stealth: 'disadv' },
  { id: 'chainMail',    type: 'heavy',   ac: 16, stealth: 'disadv', strReq: 13 },
  { id: 'splint',       type: 'heavy',   ac: 17, stealth: 'disadv', strReq: 15 },
  { id: 'plate',        type: 'heavy',   ac: 18, stealth: 'disadv', strReq: 15 },
  // Shield
  { id: 'shield',       type: 'shield',  ac: 2 },
];

// === SPELLS (SRD selection) ===
// Format: { id, level, school, classes:[], castingTime, range, components, duration, ritual, concentration, desc }
const SPELLS = [
  // Cantrips
  { id: 'acidSplash',     level: 0, school: 'conjuration', classes: ['sorcerer','wizard'], castingTime: '1 action', range: '60 ft', components: 'V, S', duration: 'Instant', desc: { pt: 'Lance ácido em até 2 criaturas até 5 pés uma da outra. Cada uma: SAL DEST ou 1d6 ácido.', en: 'Hurl acid at up to 2 creatures within 5 ft of each other. Each: DEX save or 1d6 acid.' } },
  { id: 'chillTouch',     level: 0, school: 'necromancy', classes: ['sorcerer','warlock','wizard'], castingTime: '1 action', range: '120 ft', components: 'V, S', duration: '1 round', desc: { pt: 'Mão fantasmagórica: ataque mágico, 1d8 necrótico, alvo não recupera HP até fim do próximo turno.', en: 'Ghostly hand: spell attack, 1d8 necrotic, target can\'t regain HP until end of next turn.' } },
  { id: 'eldritchBlast',  level: 0, school: 'evocation', classes: ['warlock'], castingTime: '1 action', range: '120 ft', components: 'V, S', duration: 'Instant', desc: { pt: 'Raio crepitante: ataque mágico, 1d10 dano de força.', en: 'Crackling beam: spell attack, 1d10 force damage.' } },
  { id: 'fireBolt',       level: 0, school: 'evocation', classes: ['sorcerer','wizard'], castingTime: '1 action', range: '120 ft', components: 'V, S', duration: 'Instant', desc: { pt: 'Dardo de fogo: ataque mágico, 1d10 dano de fogo.', en: 'Mote of fire: spell attack, 1d10 fire damage.' } },
  { id: 'guidance',       level: 0, school: 'divination', classes: ['cleric','druid'], castingTime: '1 action', range: 'Touch', components: 'V, S', duration: '1 min, conc', concentration: true, desc: { pt: 'Toque uma criatura. Ela pode adicionar 1d4 a um teste de habilidade antes do fim da magia.', en: 'Touch one creature. It can add 1d4 to one ability check before spell ends.' } },
  { id: 'light',          level: 0, school: 'evocation', classes: ['bard','cleric','sorcerer','wizard'], castingTime: '1 action', range: 'Touch', components: 'V, M', duration: '1 hour', desc: { pt: 'Objeto irradia luz brilhante em 20 pés e sombras 20 pés.', en: 'Object sheds bright light 20 ft, dim 20 ft.' } },
  { id: 'mageHand',       level: 0, school: 'conjuration', classes: ['bard','sorcerer','warlock','wizard'], castingTime: '1 action', range: '30 ft', components: 'V, S', duration: '1 min', desc: { pt: 'Mão espectral manipula objetos até 10 lb a 30 pés.', en: 'Spectral hand manipulates objects up to 10 lb at 30 ft.' } },
  { id: 'minorIllusion',  level: 0, school: 'illusion', classes: ['bard','sorcerer','warlock','wizard'], castingTime: '1 action', range: '30 ft', components: 'S, M', duration: '1 min', desc: { pt: 'Crie um som ou imagem de um objeto até cubo de 5 pés.', en: 'Create a sound or image of an object up to 5-foot cube.' } },
  { id: 'poisonSpray',    level: 0, school: 'conjuration', classes: ['druid','sorcerer','warlock','wizard'], castingTime: '1 action', range: '10 ft', components: 'V, S', duration: 'Instant', desc: { pt: 'SAL CON ou 1d12 dano de veneno.', en: 'CON save or 1d12 poison damage.' } },
  { id: 'prestidigitation', level: 0, school: 'transmutation', classes: ['bard','sorcerer','warlock','wizard'], castingTime: '1 action', range: '10 ft', components: 'V, S', duration: '1 hour', desc: { pt: 'Truque mágico: acender vela, criar sinal, limpar mancha, etc.', en: 'Minor magical trick: light a candle, sign, clean stain, etc.' } },
  { id: 'rayOfFrost',     level: 0, school: 'evocation', classes: ['sorcerer','wizard'], castingTime: '1 action', range: '60 ft', components: 'V, S', duration: 'Instant', desc: { pt: 'Raio: ataque mágico, 1d8 frio, deslocamento alvo -10 pés.', en: 'Spell attack, 1d8 cold, target speed -10 ft until next turn.' } },
  { id: 'sacredFlame',    level: 0, school: 'evocation', classes: ['cleric'], castingTime: '1 action', range: '60 ft', components: 'V, S', duration: 'Instant', desc: { pt: 'SAL DEST ou 1d8 dano radiante. Cobertura não ajuda.', en: 'DEX save or 1d8 radiant damage. Cover gives no benefit.' } },
  { id: 'shockingGrasp',  level: 0, school: 'evocation', classes: ['sorcerer','wizard'], castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Instant', desc: { pt: 'Ataque mágico (vantagem se alvo veste metal), 1d8 raio. Alvo não pode reagir.', en: 'Melee spell attack (adv vs metal armor), 1d8 lightning. Target can\'t take reactions.' } },
  { id: 'spareDying',     level: 0, school: 'necromancy', classes: ['cleric'], castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Instant', desc: { pt: 'Estabilize criatura com 0 HP.', en: 'Stabilize a creature with 0 HP.' } },
  { id: 'thaumaturgy',    level: 0, school: 'transmutation', classes: ['cleric'], castingTime: '1 action', range: '30 ft', components: 'V', duration: '1 min', desc: { pt: 'Pequenos efeitos sobrenaturais: voz amplificada, chamas mudam de cor, etc.', en: 'Minor wonders: amplified voice, flames change color, etc.' } },
  { id: 'viciousMockery', level: 0, school: 'enchantment', classes: ['bard'], castingTime: '1 action', range: '60 ft', components: 'V', duration: 'Instant', desc: { pt: 'SAL SAB ou 1d4 psíquico e desvantagem no próximo ataque.', en: 'WIS save or 1d4 psychic and disadvantage on next attack.' } },
  { id: 'druidcraft',     level: 0, school: 'transmutation', classes: ['druid'], castingTime: '1 action', range: '30 ft', components: 'V, S', duration: 'Instant', desc: { pt: 'Pequenos efeitos naturais: prever clima, fazer flores brotarem.', en: 'Minor natural effect: predict weather, make a flower bloom.' } },

  // 1st Level
  { id: 'burningHands',   level: 1, school: 'evocation', classes: ['sorcerer','wizard'], castingTime: '1 action', range: 'Self (15-ft cone)', components: 'V, S', duration: 'Instant', desc: { pt: 'Cone de fogo: SAL DEST ou 3d6 fogo.', en: 'Cone of fire: DEX save or 3d6 fire damage.' } },
  { id: 'charmPerson',    level: 1, school: 'enchantment', classes: ['bard','druid','sorcerer','warlock','wizard'], castingTime: '1 action', range: '30 ft', components: 'V, S', duration: '1 hour', desc: { pt: 'SAL SAB ou criatura é enfeitiçada por 1 hora.', en: 'WIS save or creature charmed for 1 hour.' } },
  { id: 'cureWounds',     level: 1, school: 'evocation', classes: ['bard','cleric','druid','paladin','ranger'], castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Instant', desc: { pt: 'Cure 1d8 + mod conjuração de HP.', en: 'Heal 1d8 + spellcasting mod HP.' } },
  { id: 'detectMagic',    level: 1, school: 'divination', classes: ['bard','cleric','druid','paladin','ranger','sorcerer','wizard'], castingTime: '1 action', range: 'Self', components: 'V, S', duration: '10 min, conc', ritual: true, concentration: true, desc: { pt: 'Sinta presença de magia em 30 pés. Ritual.', en: 'Sense magic within 30 ft. Ritual.' } },
  { id: 'disguiseSelf',   level: 1, school: 'illusion', classes: ['bard','sorcerer','wizard'], castingTime: '1 action', range: 'Self', components: 'V, S', duration: '1 hour', desc: { pt: 'Modifique aparência, voz e roupas.', en: 'Change your appearance, voice, and clothes.' } },
  { id: 'faerieFire',     level: 1, school: 'evocation', classes: ['bard','druid'], castingTime: '1 action', range: '60 ft', components: 'V', duration: '1 min, conc', concentration: true, desc: { pt: 'Cubo 20 pés. SAL DEST ou criaturas brilham; ataques contra elas têm vantagem.', en: '20-ft cube. DEX save or creatures glow; attacks against them have advantage.' } },
  { id: 'healingWord',    level: 1, school: 'evocation', classes: ['bard','cleric','druid'], castingTime: '1 bonus action', range: '60 ft', components: 'V', duration: 'Instant', desc: { pt: 'Cure 1d4 + mod conjuração.', en: 'Heal 1d4 + spellcasting mod.' } },
  { id: 'magicMissile',   level: 1, school: 'evocation', classes: ['sorcerer','wizard'], castingTime: '1 action', range: '120 ft', components: 'V, S', duration: 'Instant', desc: { pt: '3 dardos automáticos, 1d4+1 força cada.', en: '3 darts, automatic hit, 1d4+1 force each.' } },
  { id: 'shield',         level: 1, school: 'abjuration', classes: ['sorcerer','wizard'], castingTime: '1 reaction', range: 'Self', components: 'V, S', duration: '1 round', desc: { pt: 'Reação: +5 CA até o fim do próximo turno.', en: 'Reaction: +5 AC until end of next turn.' } },
  { id: 'sleep',          level: 1, school: 'enchantment', classes: ['bard','sorcerer','wizard'], castingTime: '1 action', range: '90 ft', components: 'V, S, M', duration: '1 min', desc: { pt: '5d8 HP de criaturas adormecem (do menor HP).', en: '5d8 HP of creatures fall asleep (lowest HP first).' } },
  { id: 'thunderwave',    level: 1, school: 'evocation', classes: ['bard','druid','sorcerer','wizard'], castingTime: '1 action', range: 'Self (15-ft cube)', components: 'V, S', duration: 'Instant', desc: { pt: 'SAL CON ou 2d8 trovão e empurra 10 pés.', en: 'CON save or 2d8 thunder + push 10 ft.' } },
  { id: 'bless',          level: 1, school: 'enchantment', classes: ['cleric','paladin'], castingTime: '1 action', range: '30 ft', components: 'V, S, M', duration: '1 min, conc', concentration: true, desc: { pt: '3 criaturas adicionam 1d4 a ataques e salvamentos.', en: '3 creatures add 1d4 to attacks and saves.' } },
  { id: 'commandSpell',   level: 1, school: 'enchantment', classes: ['cleric','paladin'], castingTime: '1 action', range: '60 ft', components: 'V', duration: '1 round', desc: { pt: 'SAL SAB ou obedeça comando de 1 palavra.', en: 'WIS save or obey a 1-word command.' } },
  { id: 'guidingBolt',    level: 1, school: 'evocation', classes: ['cleric'], castingTime: '1 action', range: '120 ft', components: 'V, S', duration: '1 round', desc: { pt: 'Ataque mágico, 4d6 radiante; próximo ataque contra alvo tem vantagem.', en: 'Spell attack, 4d6 radiant; next attack vs target has advantage.' } },
  { id: 'sanctuary',      level: 1, school: 'abjuration', classes: ['cleric'], castingTime: '1 bonus action', range: '30 ft', components: 'V, S, M', duration: '1 min', desc: { pt: 'Alvo: criaturas que o atacam fazem SAL SAB.', en: 'Target: creatures attacking it must make WIS save.' } },
  { id: 'huntersMark',    level: 1, school: 'divination', classes: ['ranger'], castingTime: '1 bonus action', range: '90 ft', components: 'V', duration: '1 hour, conc', concentration: true, desc: { pt: 'Marque criatura: +1d6 dano em ataques contra ela.', en: 'Mark creature: +1d6 damage on attacks against it.' } },
  { id: 'huntersMarkUp',  level: 1, school: 'evocation', classes: ['paladin'], castingTime: '1 action', range: 'Self', components: 'V, S', duration: '10 min, conc', concentration: true, desc: { pt: 'Próximo acerto: +2d6 trovão. Up cast com slot maior.', en: 'Next hit: +2d6 thunder. Upcast with higher slot.' } },
  { id: 'divineFavor',    level: 1, school: 'evocation', classes: ['paladin'], castingTime: '1 bonus action', range: 'Self', components: 'V, S', duration: '1 min, conc', concentration: true, desc: { pt: 'Ataques de arma +1d4 radiante.', en: 'Weapon attacks +1d4 radiant.' } },
  { id: 'entangle',       level: 1, school: 'conjuration', classes: ['druid'], castingTime: '1 action', range: '90 ft', components: 'V, S', duration: '1 min, conc', concentration: true, desc: { pt: 'Quadrado 20 pés: SAL FOR ou agarrado por plantas.', en: '20-ft square: STR save or restrained by plants.' } },
  { id: 'goodberry',      level: 1, school: 'transmutation', classes: ['druid','ranger'], castingTime: '1 action', range: 'Touch', components: 'V, S, M', duration: 'Instant', desc: { pt: 'Crie 10 frutas; cada uma cura 1 HP e alimenta por 1 dia.', en: 'Create 10 berries; each heals 1 HP and feeds for a day.' } },
  { id: 'witchBolt',      level: 1, school: 'evocation', classes: ['sorcerer','warlock','wizard'], castingTime: '1 action', range: '30 ft', components: 'V, S, M', duration: '1 min, conc', concentration: true, desc: { pt: 'Ataque mágico, 1d12 raio. Ação em turnos seguintes para auto-acerto 1d12.', en: 'Spell attack, 1d12 lightning. Action on later turns to auto-deal 1d12.' } },
  { id: 'armorOfAgathys', level: 1, school: 'abjuration', classes: ['warlock'], castingTime: '1 action', range: 'Self', components: 'V, S, M', duration: '1 hour', desc: { pt: '5 HP temp; quando agredido em melee, atacante leva 5 frio.', en: '5 temp HP; when hit in melee, attacker takes 5 cold.' } },
  { id: 'hex',            level: 1, school: 'enchantment', classes: ['warlock'], castingTime: '1 bonus action', range: '90 ft', components: 'V, S, M', duration: '1 hour, conc', concentration: true, desc: { pt: 'Amaldiçoe alvo: +1d6 necrótico em ataques contra ele; desvantagem em testes de atributo escolhido.', en: 'Curse target: +1d6 necrotic on attacks; disadvantage on chosen ability checks.' } },

  // 2nd Level
  { id: 'aid',            level: 2, school: 'abjuration', classes: ['cleric','paladin'], castingTime: '1 action', range: '30 ft', components: 'V, S, M', duration: '8 hours', desc: { pt: 'Até 3 criaturas: HP máximo e atual +5.', en: 'Up to 3 creatures: max HP and current HP +5.' } },
  { id: 'invisibility',   level: 2, school: 'illusion', classes: ['bard','sorcerer','warlock','wizard'], castingTime: '1 action', range: 'Touch', components: 'V, S, M', duration: '1 hour, conc', concentration: true, desc: { pt: 'Alvo invisível até atacar/conjurar.', en: 'Target invisible until it attacks/casts.' } },
  { id: 'scorchingRay',   level: 2, school: 'evocation', classes: ['sorcerer','wizard'], castingTime: '1 action', range: '120 ft', components: 'V, S', duration: 'Instant', desc: { pt: '3 raios, cada um: ataque mágico, 2d6 fogo.', en: '3 rays, each spell attack, 2d6 fire.' } },
  { id: 'mistyStep',      level: 2, school: 'conjuration', classes: ['sorcerer','warlock','wizard'], castingTime: '1 bonus action', range: 'Self', components: 'V', duration: 'Instant', desc: { pt: 'Teleporte até 30 pés.', en: 'Teleport up to 30 ft.' } },
  { id: 'spiritualWeapon',level: 2, school: 'evocation', classes: ['cleric'], castingTime: '1 bonus action', range: '60 ft', components: 'V, S', duration: '1 min', desc: { pt: 'Crie arma flutuante: ataque mágico, 1d8 + WIS força.', en: 'Floating weapon: spell attack, 1d8 + WIS force.' } },
  { id: 'holdPerson',     level: 2, school: 'enchantment', classes: ['bard','cleric','druid','sorcerer','warlock','wizard'], castingTime: '1 action', range: '60 ft', components: 'V, S, M', duration: '1 min, conc', concentration: true, desc: { pt: 'SAL SAB ou paralisado.', en: 'WIS save or paralyzed.' } },
  { id: 'spikeGrowth',    level: 2, school: 'transmutation', classes: ['druid','ranger'], castingTime: '1 action', range: '150 ft', components: 'V, S, M', duration: '10 min, conc', concentration: true, desc: { pt: 'Raio 20 pés: terreno difícil; criatura que se move leva 2d4 perfuração.', en: '20-ft radius: difficult terrain; moving creature takes 2d4 piercing.' } },

  // 3rd Level
  { id: 'fireball',       level: 3, school: 'evocation', classes: ['sorcerer','wizard'], castingTime: '1 action', range: '150 ft', components: 'V, S, M', duration: 'Instant', desc: { pt: 'Esfera 20 pés: SAL DEST 8d6 fogo (metade se passar).', en: '20-ft sphere: DEX save 8d6 fire (half on success).' } },
  { id: 'counterspell',   level: 3, school: 'abjuration', classes: ['sorcerer','warlock','wizard'], castingTime: '1 reaction', range: '60 ft', components: 'S', duration: 'Instant', desc: { pt: 'Reação: interrompe magia até 3° nível; nível superior requer teste de habilidade conjuração.', en: 'Reaction: interrupt spell up to lvl 3; higher needs ability check.' } },
  { id: 'fly',            level: 3, school: 'transmutation', classes: ['sorcerer','warlock','wizard'], castingTime: '1 action', range: 'Touch', components: 'V, S, M', duration: '10 min, conc', concentration: true, desc: { pt: 'Alvo ganha deslocamento de voo 60 pés.', en: 'Target gains 60 ft fly speed.' } },
  { id: 'haste',          level: 3, school: 'transmutation', classes: ['sorcerer','wizard'], castingTime: '1 action', range: '30 ft', components: 'V, S, M', duration: '1 min, conc', concentration: true, desc: { pt: 'Desloc. dobrado, +2 CA, vantagem em DES, ação extra.', en: 'Speed doubled, +2 AC, advantage on DEX saves, extra action.' } },
  { id: 'lightningBolt',  level: 3, school: 'evocation', classes: ['sorcerer','wizard'], castingTime: '1 action', range: 'Self (100-ft line)', components: 'V, S, M', duration: 'Instant', desc: { pt: 'Linha 100 pés: SAL DEST 8d6 raio (metade se passar).', en: '100-ft line: DEX save 8d6 lightning (half on success).' } },
  { id: 'massHealingWord',level: 3, school: 'evocation', classes: ['cleric'], castingTime: '1 bonus action', range: '60 ft', components: 'V', duration: 'Instant', desc: { pt: 'Até 6 criaturas: cure 1d4 + mod cada.', en: 'Up to 6 creatures: heal 1d4 + mod each.' } },
  { id: 'revivify',       level: 3, school: 'necromancy', classes: ['cleric','paladin'], castingTime: '1 action', range: 'Touch', components: 'V, S, M', duration: 'Instant', desc: { pt: 'Reviva criatura morta há até 1 min, com 1 HP.', en: 'Revive creature dead up to 1 min, with 1 HP.' } },
  { id: 'spiritGuardians',level: 3, school: 'conjuration', classes: ['cleric'], castingTime: '1 action', range: 'Self (15-ft radius)', components: 'V, S, M', duration: '10 min, conc', concentration: true, desc: { pt: 'Espíritos: 15 pés. Desloc. metade. SAL SAB ou 3d8 radiante/necrótico.', en: 'Spirits in 15-ft radius. Half speed. WIS save or 3d8 radiant/necrotic.' } },
  { id: 'callLightning', level: 3, school: 'conjuration', classes: ['druid'], castingTime: '1 action', range: '120 ft', components: 'V, S', duration: '10 min, conc', concentration: true, desc: { pt: 'Nuvem de tempestade. Cilindro 5 pés/60 pés alt. SAL DEST 3d10 raio. Ação seguinte conjura raio novamente.', en: 'Storm cloud cylinder 5/60 ft. DEX save 3d10 lightning. Re-cast each turn as action.' } },
  { id: 'sleetStorm',    level: 3, school: 'conjuration', classes: ['druid','sorcerer','wizard'], castingTime: '1 action', range: '150 ft', components: 'V, S, M', duration: '1 min, conc', concentration: true, desc: { pt: 'Cilindro 20 pés gelo: terreno difícil; queda em prono (SAL DEST).', en: '20-ft cylinder of sleet: difficult terrain; fall prone (DEX save).' } },
  { id: 'dispelMagic',   level: 3, school: 'abjuration', classes: ['bard','cleric','druid','paladin','sorcerer','warlock','wizard'], castingTime: '1 action', range: '120 ft', components: 'V, S', duration: 'Instant', desc: { pt: 'Cancela magias até 3° nível em alvo. Maior nível requer teste de habilidade conjuração CD 10+nível.', en: 'Ends spells up to 3rd level on target. Higher needs ability check DC 10+lvl.' } },
  { id: 'animateDead',   level: 3, school: 'necromancy', classes: ['cleric','wizard'], castingTime: '1 minute', range: '10 ft', components: 'V, S, M', duration: 'Instant', desc: { pt: 'Anima cadáver/ossos como esqueleto ou zumbi sob seu controle por 24h.', en: 'Animate skeleton or zombie under your control for 24 hours.' } },

  // 4th Level
  { id: 'banishment',    level: 4, school: 'abjuration', classes: ['cleric','paladin','sorcerer','warlock','wizard'], castingTime: '1 action', range: '60 ft', components: 'V, S, M', duration: '1 min, conc', concentration: true, desc: { pt: 'SAL CHA ou alvo é banido para plano demipoderoso por 1 min.', en: 'CHA save or banish target to demiplane for 1 min.' } },
  { id: 'dimensionDoor', level: 4, school: 'conjuration', classes: ['bard','sorcerer','warlock','wizard'], castingTime: '1 action', range: '500 ft', components: 'V', duration: 'Instant', desc: { pt: 'Teleporte até 500 pés (você + 1 criatura voluntária pequena/média).', en: 'Teleport up to 500 ft (you + 1 willing Small/Medium ally).' } },
  { id: 'fireShield',    level: 4, school: 'evocation', classes: ['wizard'], castingTime: '1 action', range: 'Self', components: 'V, S, M', duration: '10 min', desc: { pt: 'Resistência a fogo OU frio; atacante melee leva 2d8 desse tipo.', en: 'Resistance to fire OR cold; melee attacker takes 2d8 of that type.' } },
  { id: 'greaterInvisibility', level: 4, school: 'illusion', classes: ['bard','sorcerer','wizard'], castingTime: '1 action', range: 'Touch', components: 'V, S', duration: '1 min, conc', concentration: true, desc: { pt: 'Alvo invisível por 1 min, mesmo atacando/conjurando.', en: 'Target invisible for 1 min, even when attacking/casting.' } },
  { id: 'iceStorm',      level: 4, school: 'evocation', classes: ['druid','sorcerer','wizard'], castingTime: '1 action', range: '300 ft', components: 'V, S, M', duration: 'Instant', desc: { pt: 'Cilindro 20 pés: SAL DEST 2d8 contundente + 4d6 frio (metade se passar). Terreno difícil.', en: '20-ft cylinder: DEX save 2d8 bludg + 4d6 cold (half on success). Difficult terrain.' } },
  { id: 'polymorph',     level: 4, school: 'transmutation', classes: ['bard','druid','sorcerer','wizard'], castingTime: '1 action', range: '60 ft', components: 'V, S, M', duration: '1 hour, conc', concentration: true, desc: { pt: 'SAL SAB ou alvo vira besta com CR ≤ nível do alvo. HP novos; reverte ao zerar.', en: 'WIS save or target becomes a beast (CR ≤ target level). New HP; reverts at 0.' } },
  { id: 'wallOfFire',    level: 4, school: 'evocation', classes: ['druid','sorcerer','wizard'], castingTime: '1 action', range: '120 ft', components: 'V, S, M', duration: '1 min, conc', concentration: true, desc: { pt: 'Muralha 60 pés: SAL DEST 5d8 fogo ao atravessar/criação.', en: '60-ft wall: DEX save 5d8 fire on entry/creation.' } },
  { id: 'guardianOfFaith', level: 4, school: 'conjuration', classes: ['cleric'], castingTime: '1 action', range: '30 ft', components: 'V', duration: '8 hours', desc: { pt: 'Guardião 4 pés: criaturas hostis a 10 pés sofrem 20 radiante/necrótico (SAL DEST metade). Some após 60 dano.', en: 'Guardian: hostile within 10 ft take 20 radiant/necrotic (DEX save half). Vanishes after 60 dmg.' } },

  // 5th Level
  { id: 'cloudkill',     level: 5, school: 'conjuration', classes: ['sorcerer','wizard'], castingTime: '1 action', range: '120 ft', components: 'V, S', duration: '10 min, conc', concentration: true, desc: { pt: 'Esfera 20 pés gás venenoso: SAL CON 5d8 veneno; obscurece visão.', en: '20-ft sphere of poison gas: CON save 5d8 poison; obscures sight.' } },
  { id: 'coneOfCold',    level: 5, school: 'evocation', classes: ['sorcerer','wizard'], castingTime: '1 action', range: 'Self (60-ft cone)', components: 'V, S, M', duration: 'Instant', desc: { pt: 'Cone 60 pés: SAL CON 8d8 frio (metade se passar).', en: '60-ft cone: CON save 8d8 cold (half on success).' } },
  { id: 'flameStrike',   level: 5, school: 'evocation', classes: ['cleric'], castingTime: '1 action', range: '60 ft', components: 'V, S, M', duration: 'Instant', desc: { pt: 'Cilindro 10 pés: SAL DEST 4d6 fogo + 4d6 radiante.', en: '10-ft cylinder: DEX save 4d6 fire + 4d6 radiant.' } },
  { id: 'holdMonster',   level: 5, school: 'enchantment', classes: ['bard','sorcerer','warlock','wizard'], castingTime: '1 action', range: '90 ft', components: 'V, S, M', duration: '1 min, conc', concentration: true, desc: { pt: 'SAL SAB ou paralisado. Repete cada turno.', en: 'WIS save or paralyzed. Repeats each turn.' } },
  { id: 'massCureWounds',level: 5, school: 'evocation', classes: ['bard','cleric','druid'], castingTime: '1 action', range: '60 ft', components: 'V, S', duration: 'Instant', desc: { pt: 'Até 6 criaturas em cubo 30 pés: cure 3d8 + mod cada.', en: 'Up to 6 creatures in 30-ft cube: heal 3d8 + mod each.' } },
  { id: 'raiseDead',     level: 5, school: 'necromancy', classes: ['bard','cleric','paladin'], castingTime: '1 hour', range: 'Touch', components: 'V, S, M', duration: 'Instant', desc: { pt: 'Reviva criatura morta há até 10 dias. -4 em testes/ataques/SAL por 4 descansos longos.', en: 'Revive creature dead up to 10 days. -4 to checks/attacks/saves for 4 long rests.' } },
  { id: 'wallOfStone',   level: 5, school: 'evocation', classes: ['druid','sorcerer','wizard'], castingTime: '1 action', range: '120 ft', components: 'V, S, M', duration: '10 min, conc', concentration: true, desc: { pt: 'Cria muralha de pedra de 10 painéis 6×6×0,5 pés. Permanente se concentrar a magia inteira.', en: 'Creates 10 stone panels 6x6x0.5 ft. Permanent if you concentrate full duration.' } },
  { id: 'greaterRestoration', level: 5, school: 'abjuration', classes: ['bard','cleric','druid'], castingTime: '1 action', range: 'Touch', components: 'V, S, M', duration: 'Instant', desc: { pt: 'Remove encanto, paralisação, petrificação, maldição, exaustão; ou restaura 1 atributo/HP máx.', en: 'Removes charm, paralysis, petrification, curse, exhaustion; or restores 1 ability/max HP.' } },

  // 6th-9th Level (selection)
  { id: 'chainLightning',level: 6, school: 'evocation', classes: ['sorcerer','wizard'], castingTime: '1 action', range: '150 ft', components: 'V, S, M', duration: 'Instant', desc: { pt: 'Raio + 3 saltos: SAL DEST 10d8 raio em cada alvo.', en: 'Bolt + 3 jumps: DEX save 10d8 lightning each.' } },
  { id: 'healSpell',     level: 6, school: 'evocation', classes: ['cleric','druid'], castingTime: '1 action', range: '60 ft', components: 'V, S', duration: 'Instant', desc: { pt: 'Cure 70 HP. Remove cego, surdo, doença.', en: 'Heal 70 HP. Removes blinded, deafened, disease.' } },
  { id: 'fingerOfDeath', level: 7, school: 'necromancy', classes: ['sorcerer','warlock','wizard'], castingTime: '1 action', range: '60 ft', components: 'V, S', duration: 'Instant', desc: { pt: 'SAL CON 7d8+30 necrótico (metade se passar). Humanoide morto vira zumbi sob seu controle.', en: 'CON save 7d8+30 necrotic (half on success). Slain humanoid becomes a zombie under your control.' } },
  { id: 'fireStorm',     level: 7, school: 'evocation', classes: ['cleric','druid','sorcerer'], castingTime: '1 action', range: '150 ft', components: 'V, S', duration: 'Instant', desc: { pt: '10 cubos de 10 pés: SAL DEST 7d10 fogo (metade se passar).', en: 'Ten 10-ft cubes: DEX save 7d10 fire (half on success).' } },
  { id: 'sunburst',      level: 8, school: 'evocation', classes: ['druid','sorcerer','wizard'], castingTime: '1 action', range: '150 ft', components: 'V, S, M', duration: 'Instant', desc: { pt: 'Esfera 60 pés: SAL CON 12d6 radiante + cego 1 min (metade dano se passar).', en: '60-ft sphere: CON save 12d6 radiant + blind 1 min (half damage on success).' } },
  { id: 'meteorSwarm',   level: 9, school: 'evocation', classes: ['sorcerer','wizard'], castingTime: '1 action', range: '1 mile', components: 'V, S', duration: 'Instant', desc: { pt: '4 esferas 40 pés: SAL DEST 20d6 fogo + 20d6 contundente em cada (metade se passar).', en: 'Four 40-ft spheres: DEX save 20d6 fire + 20d6 bludgeoning each (half on success).' } },
  { id: 'wishSpell',     level: 9, school: 'conjuration', classes: ['sorcerer','wizard'], castingTime: '1 action', range: 'Self', components: 'V', duration: 'Instant', desc: { pt: 'Duplica magia até 8° nível (sem componentes) ou efeitos personalizados (a critério do mestre). Risco severo se "wish" for além disso.', en: 'Duplicate any spell up to 8th level (no components) or custom effects (DM discretion). Severe risk if used beyond.' } },
];

// === WILD SHAPE BEASTS ===
// Druid Wild Shape forms. Level 2: CR 1/4 (no fly/swim).
// Level 4: CR 1/2 (no fly). Level 8: CR 1 (any).
const BEASTS = [
  // CR 0
  { id: 'cat', cr: '0', crNum: 0, size: 'Tiny', speed: 40, climb: 30, ac: 12, hp: 2, str: 3, dex: 15, con: 10, int: 3, wis: 12, cha: 7,
    traits: [{ name: { pt: 'Olfato Apurado', en: 'Keen Smell' }, desc: { pt: 'Vantagem em Percepção (olfato).', en: 'Advantage on Perception checks using smell.' } }],
    actions: [{ name: { pt: 'Garras', en: 'Claws' }, desc: { pt: 'Mel., +0, 1 pé, 1 cortante.', en: 'Melee +0, 1 ft, 1 slashing.' } }],
  },
  { id: 'owl', cr: '0', crNum: 0, size: 'Tiny', speed: 5, fly: 60, ac: 11, hp: 1, str: 3, dex: 13, con: 8, int: 2, wis: 12, cha: 7,
    traits: [
      { name: { pt: 'Voo Silencioso', en: 'Flyby' }, desc: { pt: 'Não provoca ataques de oportunidade ao sair do alcance.', en: 'No opportunity attacks when leaving reach.' } },
      { name: { pt: 'Visão e Audição Aguçadas', en: 'Keen Hearing & Sight' }, desc: { pt: 'Vantagem em Percepção (audição/visão).', en: 'Advantage on Perception (hearing/sight).' } },
    ],
    actions: [{ name: { pt: 'Garras', en: 'Talons' }, desc: { pt: 'Mel., +3, 1 cortante.', en: 'Melee +3, 1 slashing.' } }],
  },
  { id: 'rat', cr: '0', crNum: 0, size: 'Tiny', speed: 20, ac: 10, hp: 1, str: 2, dex: 11, con: 9, int: 2, wis: 10, cha: 4,
    traits: [{ name: { pt: 'Olfato Apurado', en: 'Keen Smell' }, desc: { pt: 'Vantagem em Percepção (olfato).', en: 'Advantage on Perception (smell).' } }],
    actions: [{ name: { pt: 'Mordida', en: 'Bite' }, desc: { pt: 'Mel., +0, 1 perfurante.', en: 'Melee +0, 1 piercing.' } }],
  },

  // CR 1/8
  { id: 'giantCrab', cr: '1/8', crNum: 0.125, size: 'Medium', speed: 30, swim: 30, ac: 15, hp: 13, str: 13, dex: 15, con: 11, int: 1, wis: 9, cha: 3,
    traits: [{ name: { pt: 'Anfíbio', en: 'Amphibious' }, desc: { pt: 'Pode respirar ar e água.', en: 'Breathes air and water.' } }],
    actions: [{ name: { pt: 'Pinça', en: 'Claw' }, desc: { pt: 'Mel., +3, 1d6+1 contundente, alvo agarrado (fuga CD 11). 2 garras max.', en: 'Melee +3, 1d6+1 bludgeoning, target grappled (esc DC 11). Max 2 grapples.' } }],
  },

  // CR 1/4
  { id: 'wolf', cr: '1/4', crNum: 0.25, size: 'Medium', speed: 40, ac: 13, hp: 11, str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6,
    traits: [
      { name: { pt: 'Tática de Matilha', en: 'Pack Tactics' }, desc: { pt: 'Vantagem em ataques se aliado a 5 pés do alvo.', en: 'Advantage on attacks if ally within 5 ft.' } },
      { name: { pt: 'Audição/Olfato Aguçados', en: 'Keen Hearing & Smell' }, desc: { pt: 'Vantagem em Percepção (audição/olfato).', en: 'Advantage on Perception (hearing/smell).' } },
    ],
    actions: [{ name: { pt: 'Mordida', en: 'Bite' }, desc: { pt: 'Mel., +4, 2d4+2 perfurante. SAL FOR CD 11 ou prono.', en: 'Melee +4, 2d4+2 piercing. STR save DC 11 or prone.' } }],
  },
  { id: 'boar', cr: '1/4', crNum: 0.25, size: 'Medium', speed: 40, ac: 11, hp: 11, str: 13, dex: 11, con: 12, int: 2, wis: 9, cha: 5,
    traits: [
      { name: { pt: 'Carga', en: 'Charge' }, desc: { pt: 'Move 20+ pés + acertou: +1d6 cortante; SAL FOR CD 11 ou prono.', en: 'Move 20+ ft + hit: +1d6 slashing; STR save DC 11 or prone.' } },
      { name: { pt: 'Implacável', en: 'Relentless' }, desc: { pt: 'Reage a 7 dano ou menos com 1 HP restante. 1×/descanso curto.', en: 'Reacts to 7 dmg or less with 1 HP remaining. 1/short rest.' } },
    ],
    actions: [{ name: { pt: 'Presa', en: 'Tusk' }, desc: { pt: 'Mel., +3, 1d6+1 cortante.', en: 'Melee +3, 1d6+1 slashing.' } }],
  },
  { id: 'giantBadger', cr: '1/4', crNum: 0.25, size: 'Medium', speed: 30, burrow: 10, ac: 10, hp: 13, str: 13, dex: 10, con: 15, int: 2, wis: 12, cha: 5,
    traits: [{ name: { pt: 'Olfato Apurado', en: 'Keen Smell' }, desc: { pt: 'Vantagem em Percepção (olfato).', en: 'Advantage on Perception (smell).' } }],
    actions: [
      { name: { pt: 'Multiataque', en: 'Multiattack' }, desc: { pt: 'Uma mordida + uma garras.', en: 'One bite and one claws.' } },
      { name: { pt: 'Mordida', en: 'Bite' }, desc: { pt: 'Mel., +3, 1d6+1 perfurante.', en: 'Melee +3, 1d6+1 piercing.' } },
      { name: { pt: 'Garras', en: 'Claws' }, desc: { pt: 'Mel., +3, 2d4+1 cortante.', en: 'Melee +3, 2d4+1 slashing.' } },
    ],
  },
  { id: 'panther', cr: '1/4', crNum: 0.25, size: 'Medium', speed: 50, climb: 40, ac: 12, hp: 13, str: 14, dex: 15, con: 10, int: 3, wis: 14, cha: 7,
    traits: [
      { name: { pt: 'Audição/Olfato Aguçados', en: 'Keen Smell' }, desc: { pt: 'Vantagem em Percepção (olfato).', en: 'Advantage on Perception (smell).' } },
      { name: { pt: 'Bote', en: 'Pounce' }, desc: { pt: 'Move 20+ pés + acerto: SAL FOR CD 12 ou prono; ataque bônus mordida.', en: 'Move 20+ ft + hit: STR save DC 12 or prone; bonus bite attack.' } },
    ],
    actions: [
      { name: { pt: 'Mordida', en: 'Bite' }, desc: { pt: 'Mel., +4, 1d6+2 perfurante.', en: 'Melee +4, 1d6+2 piercing.' } },
      { name: { pt: 'Garras', en: 'Claws' }, desc: { pt: 'Mel., +4, 1d4+2 cortante.', en: 'Melee +4, 1d4+2 slashing.' } },
    ],
  },

  // CR 1/2
  { id: 'blackBear', cr: '1/2', crNum: 0.5, size: 'Medium', speed: 40, climb: 30, ac: 11, hp: 19, str: 15, dex: 10, con: 14, int: 2, wis: 12, cha: 7,
    traits: [{ name: { pt: 'Olfato Apurado', en: 'Keen Smell' }, desc: { pt: 'Vantagem em Percepção (olfato).', en: 'Advantage on Perception (smell).' } }],
    actions: [
      { name: { pt: 'Multiataque', en: 'Multiattack' }, desc: { pt: 'Uma mordida + uma garras.', en: 'One bite and one claws.' } },
      { name: { pt: 'Mordida', en: 'Bite' }, desc: { pt: 'Mel., +3, 1d6+2 perfurante.', en: 'Melee +3, 1d6+2 piercing.' } },
      { name: { pt: 'Garras', en: 'Claws' }, desc: { pt: 'Mel., +3, 2d4+2 cortante.', en: 'Melee +3, 2d4+2 slashing.' } },
    ],
  },
  { id: 'crocodile', cr: '1/2', crNum: 0.5, size: 'Large', speed: 20, swim: 30, ac: 12, hp: 19, str: 15, dex: 10, con: 13, int: 2, wis: 10, cha: 5,
    traits: [{ name: { pt: 'Prender o Fôlego', en: 'Hold Breath' }, desc: { pt: 'Pode prender a respiração por 15 minutos.', en: 'Hold breath for 15 minutes.' } }],
    actions: [{ name: { pt: 'Mordida', en: 'Bite' }, desc: { pt: 'Mel., +4, 1d10+2 perfurante, alvo agarrado (fuga CD 12).', en: 'Melee +4, 1d10+2 piercing, grappled (esc DC 12).' } }],
  },
  { id: 'warhorse', cr: '1/2', crNum: 0.5, size: 'Large', speed: 60, ac: 11, hp: 19, str: 18, dex: 12, con: 13, int: 2, wis: 12, cha: 7,
    traits: [{ name: { pt: 'Carga', en: 'Trampling Charge' }, desc: { pt: 'Move 20+ pés + acerto: SAL FOR CD 14 ou prono; ataque bônus de cascos.', en: 'Move 20+ ft + hit: STR save DC 14 or prone; bonus hooves attack.' } }],
    actions: [{ name: { pt: 'Cascos', en: 'Hooves' }, desc: { pt: 'Mel., +6, 2d6+4 contundente.', en: 'Melee +6, 2d6+4 bludgeoning.' } }],
  },
  { id: 'ape', cr: '1/2', crNum: 0.5, size: 'Medium', speed: 30, climb: 30, ac: 12, hp: 19, str: 16, dex: 14, con: 14, int: 6, wis: 12, cha: 7,
    actions: [
      { name: { pt: 'Multiataque', en: 'Multiattack' }, desc: { pt: 'Dois punhos.', en: 'Two fists.' } },
      { name: { pt: 'Punho', en: 'Fist' }, desc: { pt: 'Mel., +5, 1d6+3 contundente.', en: 'Melee +5, 1d6+3 bludgeoning.' } },
      { name: { pt: 'Pedra', en: 'Rock' }, desc: { pt: 'Dist., +5, 25/50, 1d6+3 contundente.', en: 'Ranged +5, 25/50, 1d6+3 bludgeoning.' } },
    ],
  },

  // CR 1
  { id: 'brownBear', cr: '1', crNum: 1, size: 'Large', speed: 40, climb: 30, ac: 11, hp: 34, str: 19, dex: 10, con: 16, int: 2, wis: 13, cha: 7,
    traits: [{ name: { pt: 'Olfato Apurado', en: 'Keen Smell' }, desc: { pt: 'Vantagem em Percepção (olfato).', en: 'Advantage on Perception (smell).' } }],
    actions: [
      { name: { pt: 'Multiataque', en: 'Multiattack' }, desc: { pt: 'Uma mordida + uma garras.', en: 'One bite and one claws.' } },
      { name: { pt: 'Mordida', en: 'Bite' }, desc: { pt: 'Mel., +5, 1d8+4 perfurante.', en: 'Melee +5, 1d8+4 piercing.' } },
      { name: { pt: 'Garras', en: 'Claws' }, desc: { pt: 'Mel., +5, 2d6+4 cortante.', en: 'Melee +5, 2d6+4 slashing.' } },
    ],
  },
  { id: 'direWolf', cr: '1', crNum: 1, size: 'Large', speed: 50, ac: 14, hp: 37, str: 17, dex: 15, con: 15, int: 3, wis: 12, cha: 7,
    traits: [
      { name: { pt: 'Tática de Matilha', en: 'Pack Tactics' }, desc: { pt: 'Vantagem em ataques se aliado a 5 pés do alvo.', en: 'Advantage on attacks if ally within 5 ft.' } },
      { name: { pt: 'Audição/Olfato Aguçados', en: 'Keen Hearing & Smell' }, desc: { pt: 'Vantagem em Percepção (audição/olfato).', en: 'Advantage on Perception (hearing/smell).' } },
    ],
    actions: [{ name: { pt: 'Mordida', en: 'Bite' }, desc: { pt: 'Mel., +5, 2d6+3 perfurante. SAL FOR CD 13 ou prono.', en: 'Melee +5, 2d6+3 piercing. STR save DC 13 or prone.' } }],
  },
  { id: 'tiger', cr: '1', crNum: 1, size: 'Large', speed: 40, ac: 12, hp: 37, str: 17, dex: 15, con: 14, int: 3, wis: 12, cha: 8,
    traits: [
      { name: { pt: 'Olfato Apurado', en: 'Keen Smell' }, desc: { pt: 'Vantagem em Percepção (olfato).', en: 'Advantage on Perception (smell).' } },
      { name: { pt: 'Bote', en: 'Pounce' }, desc: { pt: 'Move 20+ pés + acerto: SAL FOR CD 13 ou prono; ataque bônus mordida.', en: 'Move 20+ ft + hit: STR save DC 13 or prone; bonus bite.' } },
    ],
    actions: [
      { name: { pt: 'Mordida', en: 'Bite' }, desc: { pt: 'Mel., +5, 1d10+3 perfurante.', en: 'Melee +5, 1d10+3 piercing.' } },
      { name: { pt: 'Garras', en: 'Claws' }, desc: { pt: 'Mel., +5, 1d8+3 cortante.', en: 'Melee +5, 1d8+3 slashing.' } },
    ],
  },
  { id: 'giantEagle', cr: '1', crNum: 1, size: 'Large', speed: 10, fly: 80, ac: 13, hp: 26, str: 16, dex: 17, con: 13, int: 8, wis: 14, cha: 10,
    traits: [{ name: { pt: 'Visão Aguçada', en: 'Keen Sight' }, desc: { pt: 'Vantagem em Percepção (visão).', en: 'Advantage on Perception (sight).' } }],
    actions: [
      { name: { pt: 'Multiataque', en: 'Multiattack' }, desc: { pt: 'Uma bicada + uma garras.', en: 'One beak and one talons.' } },
      { name: { pt: 'Bicada', en: 'Beak' }, desc: { pt: 'Mel., +5, 1d6+3 perfurante.', en: 'Melee +5, 1d6+3 piercing.' } },
      { name: { pt: 'Garras', en: 'Talons' }, desc: { pt: 'Mel., +5, 2d6+3 cortante.', en: 'Melee +5, 2d6+3 slashing.' } },
    ],
  },
  { id: 'lion', cr: '1', crNum: 1, size: 'Large', speed: 50, ac: 12, hp: 26, str: 17, dex: 15, con: 13, int: 3, wis: 12, cha: 8,
    traits: [
      { name: { pt: 'Tática de Matilha', en: 'Pack Tactics' }, desc: { pt: 'Vantagem em ataques se aliado a 5 pés do alvo.', en: 'Advantage on attacks if ally within 5 ft.' } },
      { name: { pt: 'Bote', en: 'Pounce' }, desc: { pt: 'Move 20+ pés + acerto: SAL FOR CD 13 ou prono; ataque bônus mordida.', en: 'Move 20+ ft + hit: STR save DC 13 or prone; bonus bite.' } },
      { name: { pt: 'Corrida Veloz', en: 'Running Leap' }, desc: { pt: 'Salto longo até 25 pés após corrida 10 pés.', en: 'Long jump up to 25 ft after 10-ft run.' } },
    ],
    actions: [
      { name: { pt: 'Mordida', en: 'Bite' }, desc: { pt: 'Mel., +5, 1d8+3 perfurante.', en: 'Melee +5, 1d8+3 piercing.' } },
      { name: { pt: 'Garras', en: 'Claws' }, desc: { pt: 'Mel., +5, 1d6+3 cortante.', en: 'Melee +5, 1d6+3 slashing.' } },
    ],
  },
];

// Standard equipment packs
const PACKS = {
  burglar: { pt: 'Kit de Ladrão', en: "Burglar's Pack" },
  diplomat: { pt: 'Kit de Diplomata', en: "Diplomat's Pack" },
  dungeoneer: { pt: 'Kit de Masmorra', en: "Dungeoneer's Pack" },
  entertainer: { pt: 'Kit de Animador', en: "Entertainer's Pack" },
  explorer: { pt: 'Kit de Explorador', en: "Explorer's Pack" },
  priest: { pt: 'Kit de Sacerdote', en: "Priest's Pack" },
  scholar: { pt: 'Kit de Erudito', en: "Scholar's Pack" },
};

function profBonus(level) {
  return 2 + Math.floor((level - 1) / 4);
}

// Spell slot progression (full caster)
const FULL_SLOTS = [
  [2], [3], [4,2], [4,3], [4,3,2], [4,3,3], [4,3,3,1], [4,3,3,2], [4,3,3,3,1],
  [4,3,3,3,2], [4,3,3,3,2,1], [4,3,3,3,2,1], [4,3,3,3,2,1,1], [4,3,3,3,2,1,1],
  [4,3,3,3,2,1,1,1], [4,3,3,3,2,1,1,1], [4,3,3,3,2,1,1,1,1], [4,3,3,3,3,1,1,1,1],
  [4,3,3,3,3,2,1,1,1], [4,3,3,3,3,2,2,1,1]
];
const HALF_SLOTS = [
  [], [2], [3], [3], [4,2], [4,2], [4,3], [4,3], [4,3,2],
  [4,3,2], [4,3,3], [4,3,3], [4,3,3,1], [4,3,3,1], [4,3,3,2],
  [4,3,3,2], [4,3,3,3,1], [4,3,3,3,1], [4,3,3,3,2], [4,3,3,3,2]
];
const WARLOCK_SLOTS = [
  // [count, level]
  [1,1], [2,1], [2,2], [2,2], [2,3], [2,3], [2,4], [2,4], [2,5],
  [2,5], [3,5], [3,5], [3,5], [3,5], [3,5], [3,5], [4,5], [4,5], [4,5], [4,5]
];

function getSpellSlots(charClass, level) {
  const cls = CLASSES.find(c => c.id === charClass);
  if (!cls || !cls.spellcaster) return [];
  if (charClass === 'warlock') {
    const [count, lvl] = WARLOCK_SLOTS[level - 1];
    const arr = Array(lvl).fill(0);
    arr[lvl - 1] = count;
    return arr;
  }
  const halfCasters = ['paladin','ranger'];
  const table = halfCasters.includes(charClass) ? HALF_SLOTS : FULL_SLOTS;
  return table[level - 1] || [];
}

return { ABILITIES, SKILLS, RACES, CLASSES, BACKGROUNDS, ALIGNMENTS, WEAPONS, ARMOR, SPELLS, BEASTS, PACKS, profBonus, getSpellSlots };
})();

export default SRD;

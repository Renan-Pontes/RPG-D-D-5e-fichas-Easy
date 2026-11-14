// Feiticeiro — Metamagia, traços da classe base 2024 e subclasses.
// Classe base, Metamagia 2024 e Feitiçaria Dracônica: SRD 5.2.1 (CC-BY 4.0).
// Metamagia 2014 (PHB): SRD 5.1 (CC-BY 4.0); Buscadora/Transmutada 2014 (TCE): resumo original.
// Demais subclasses (PHB24, XGE, SCAG/XGE, TCE, DSDQ, UA 2026): resumos ORIGINAIS, só fatos de regra.
const b = (pt, en) => ({ pt, en });
const f = (id, namePt, nameEn, descPt, descEn) => ({ id, name: b(namePt, nameEn), desc: b(descPt, descEn) });

// ---------------------------------------------------------------------------
// Metamagia. Em 2024 são 10 opções (SRD 5.2.1). Onde o texto ou o custo mudou
// em relação a 2014, há uma versão `rules: '2014'` com id terminado em 2014.
// ---------------------------------------------------------------------------
const metamagic = [
  { id: 'carefulSpell', name: b('Magia Cuidadosa', 'Careful Spell'), source: 'SRD', rules: '2024',
    desc: b('Custo: 1 ponto de feitiçaria. Ao conjurar uma magia que force outras criaturas a fazer salvaguarda, escolha até o seu modificador de Carisma dessas criaturas (mínimo 1). Elas passam automaticamente na salvaguarda e não sofrem dano se normalmente sofreriam metade do dano ao passar.',
      'Cost: 1 Sorcery Point. When you cast a spell that forces other creatures to make a saving throw, choose up to your Charisma modifier of those creatures (minimum 1). They automatically succeed on the save and take no damage if they would normally take half damage on a success.') },
  { id: 'carefulSpell2014', name: b('Magia Cuidadosa', 'Careful Spell'), source: 'SRD', rules: '2014',
    desc: b('Custo: 1 ponto de feitiçaria. Ao conjurar uma magia que force outras criaturas a fazer salvaguarda, escolha até o seu modificador de Carisma dessas criaturas (mínimo 1). Elas passam automaticamente na salvaguarda contra a magia.',
      'Cost: 1 sorcery point. When you cast a spell that forces other creatures to make a saving throw, choose up to your Charisma modifier of those creatures (minimum 1). They automatically succeed on their saving throws against the spell.') },
  { id: 'distantSpell', name: b('Magia Distante', 'Distant Spell'), source: 'SRD',
    desc: b("Custo: 1 Ponto de Feitiçaria\n\nQuando você conjura uma magia que tenha um alcance de pelo menos 1,5 metro, você pode gastar 1 Ponto de Feitiçaria para dobrar o alcance da magia. Ou, quando você conjurar uma magia que tenha um alcance de Toque, você pode gastar 1 Ponto de Feitiçaria para fazer com que o alcance da magia seja de 9 metros.",
      "Cost: 1 Sorcery Point\n\nWhen you cast a spell that has a range of at least 5 feet, you can spend 1 Sorcery Point to double the spell's range. Or when you cast a spell that has a range of Touch, you can spend 1 Sorcery Point to make the spell's range 30 feet.") },
  { id: 'empoweredSpell', name: b('Magia Potencializada', 'Empowered Spell'), source: 'SRD',
    desc: b('Custo: 1 ponto de feitiçaria. Ao rolar o dano de uma magia, role de novo até o seu modificador de Carisma em dados de dano (mínimo 1) e use os novos resultados. Pode ser usada mesmo que outra Metamagia já tenha sido aplicada à magia.',
      'Cost: 1 Sorcery Point. When you roll damage for a spell, reroll up to your Charisma modifier of the damage dice (minimum 1); you must use the new rolls. You can use it even if you already used a different Metamagic option on the spell.') },
  { id: 'extendedSpell', name: b('Magia Estendida', 'Extended Spell'), source: 'SRD', rules: '2024',
    desc: b('Custo: 1 ponto de feitiçaria. Dobra a duração de uma magia com duração de 1 minuto ou mais, até o máximo de 24 horas. Se a magia exigir Concentração, você tem Vantagem nas salvaguardas para mantê-la.',
      'Cost: 1 Sorcery Point. Double the duration of a spell with a duration of 1 minute or longer, to a maximum of 24 hours. If the spell requires Concentration, you have Advantage on saving throws to maintain it.') },
  { id: 'extendedSpell2014', name: b('Magia Estendida', 'Extended Spell'), source: 'SRD', rules: '2014',
    desc: b("Quando você conjura uma magia que tem uma duração de 1 minuto ou mais, você pode gastar 1 ponto de feitiçaria para dobrar a sua duração, até uma duração máxima de 24 horas.",
      "When you cast a spell that has a duration of 1 minute or longer, you can spend 1 sorcery point to double its duration, to a maximum duration of 24 hours.") },
  { id: 'heightenedSpell', name: b('Magia Elevada', 'Heightened Spell'), source: 'SRD', rules: '2024',
    desc: b("Custo: 2 Pontos de Feitiçaria\n\nQuando você conjura uma magia que força uma criatura a fazer uma salvaguarda, você pode gastar 2 Pontos de Feitiçaria para dar a um alvo da magia Desvantagem em salvaguardas contra a magia.",
      "Cost: 2 Sorcery Points\n\nWhen you cast a spell that forces a creature to make a saving throw, you can spend 2 Sorcery Points to give one target of the spell Disadvantage on saves against the spell.") },
  { id: 'heightenedSpell2014', name: b('Magia Elevada', 'Heightened Spell'), source: 'SRD', rules: '2014',
    desc: b("Quando você conjura uma magia que força uma criatura a fazer uma salvaguarda para resistir aos seus efeitos, você pode gastar 3 pontos de feitiçaria para dar a um alvo da magia desvantagem na sua primeira salvaguarda feita contra a magia.",
      "When you cast a spell that forces a creature to make a saving throw to resist its effects, you can spend 3 sorcery points to give one target of the spell disadvantage on its first saving throw made against the spell.") },
  { id: 'quickenedSpell', name: b('Magia Acelerada', 'Quickened Spell'), source: 'SRD', rules: '2024',
    desc: b('Custo: 2 pontos de feitiçaria. Uma magia com tempo de conjuração de uma ação passa a ser conjurada com uma Ação Bônus. Não pode ser usada se você já conjurou uma magia de nível 1+ neste turno, e depois dela você não pode conjurar outra magia de nível 1+ neste turno.',
      'Cost: 2 Sorcery Points. A spell with a casting time of an action is cast as a Bonus Action instead. You can\'t use it if you already cast a level 1+ spell this turn, and you can\'t cast a level 1+ spell later this turn after using it.') },
  { id: 'quickenedSpell2014', name: b('Magia Acelerada', 'Quickened Spell'), source: 'SRD', rules: '2014',
    desc: b("Quando você conjura uma magia que tem um tempo de conjuração de 1 ação, você pode gastar 2 pontos de feitiçaria para mudar o tempo de conjuração para 1 ação bônus nesta conjuração.",
      "When you cast a spell that has a casting time of 1 action, you can spend 2 sorcery points to change the casting time to 1 bonus action for this casting.") },
  { id: 'seekingSpell', name: b('Magia Buscadora', 'Seeking Spell'), source: 'SRD', rules: '2024',
    desc: b('Custo: 1 ponto de feitiçaria. Se errar a jogada de ataque de uma magia, role o d20 de novo e use o novo resultado. Pode ser usada mesmo que outra Metamagia já tenha sido aplicada à magia.',
      'Cost: 1 Sorcery Point. If you make an attack roll for a spell and miss, reroll the d20 and use the new roll. You can use it even if you already used a different Metamagic option on the spell.') },
  { id: 'seekingSpell2014', name: b('Magia Buscadora', 'Seeking Spell'), source: 'TCE', rules: '2014',
    desc: b("Se você fizer uma jogada de ataque para uma magia e errar, você pode gastar 2 pontos de feitiçaria para rolar novamente o d20, e deve usar a nova rolagem.\n\nVocê pode usar Magia Guiada mesmo que já tenha usado uma opção de Metamagia diferente durante a conjuração da magia.",
      "If you make an attack roll for a spell and miss, you can spend 2 sorcery points to reroll the d20, and you must use the new roll.\n\nYou can use Seeking Spell even if you have already used a different Metamagic option during the casting of the spell.") },
  { id: 'subtleSpell', name: b('Magia Sutil', 'Subtle Spell'), source: 'SRD', rules: '2024',
    desc: b("Custo: 1 Ponto de Feitiçaria\n\nQuando você conjura uma magia, você pode gastar 1 Ponto de Feitiçaria para conjurá-la sem quaisquer componentes Verbais, Somáticos ou Materiais, exceto componentes Materiais que sejam consumidos pela magia ou que tenham um custo especificado na magia.",
      "Cost: 1 Sorcery Point\n\nWhen you cast a spell, you can spend 1 Sorcery Point to cast it without any Verbal, Somatic, or Material components, except Material components that are consumed by the spell or that have a cost specified in the spell.") },
  { id: 'subtleSpell2014', name: b('Magia Sutil', 'Subtle Spell'), source: 'SRD', rules: '2014',
    desc: b("Quando você conjura uma magia, você pode gastar 1 ponto de feitiçaria para conjurá-la sem quaisquer componentes somáticos ou verbais.",
      "When you cast a spell, you can spend 1 sorcery point to cast it without any somatic or verbal components.") },
  { id: 'transmutedSpell', name: b('Magia Transmutada', 'Transmuted Spell'), source: 'SRD',
    desc: b("Custo: 1 Ponto de Feitiçaria\n\nQuando você conjura uma magia que causa um tipo de dano da lista a seguir, você pode gastar 1 Ponto de Feitiçaria para mudar esse tipo de dano para um dos outros tipos listados: Ácido, Frio, Fogo, Elétrico, Veneno, Trovejante.",
      "Cost: 1 Sorcery Point\n\nWhen you cast a spell that deals a type of damage from the following list, you can spend 1 Sorcery Point to change that damage type to one of the other listed types: Acid, Cold, Fire, Lightning, Poison, Thunder.") },
  { id: 'twinnedSpell', name: b('Magia Gêmea', 'Twinned Spell'), source: 'SRD', rules: '2024',
    desc: b("Custo: 1 Ponto de Feitiçaria\n\nQuando você conjura uma magia, como Enfeitiçar Pessoa, que pode ser conjurada com um espaço de magia de círculo superior para ter como alvo uma criatura adicional, você pode gastar 1 Ponto de Feitiçaria para aumentar o círculo efetivo da magia em 1.",
      "Cost: 1 Sorcery Point\n\nWhen you cast a spell, such as Charm Person , that can be cast with a higher-level spell slot to target an additional creature, you can spend 1 Sorcery Point to increase the spell's effective level by 1.") },
  { id: 'twinnedSpell2014', name: b('Magia Gêmea', 'Twinned Spell'), source: 'SRD', rules: '2014',
    desc: b('Custo: pontos de feitiçaria iguais ao nível da magia (1 para truques). Uma magia que mira só uma criatura e não tem alcance Pessoal passa a mirar uma segunda criatura no alcance. Não vale para magias que já podem mirar mais de uma criatura no nível atual.',
      'Cost: sorcery points equal to the spell\'s level (1 for a cantrip). A spell that targets only one creature and doesn\'t have a range of self can target a second creature in range. Not for spells that can already target more than one creature at their current level.') },
];

// 2024: pool com troca a cada nível. 2014: pool próprio, sem troca (as opções
// com texto/custo diferente usam a versão 2014; as iguais são repetidas).
const byId = (a, c) => a.id.localeCompare(c.id);
const metamagic2024 = metamagic.filter(o => o.rules !== '2014').map(o => ({ ...o, rules: '2024' }));
const metamagicLegacy = metamagic.filter(o => o.rules !== '2024')
  .map(o => ({ ...o, id: o.id.replace(/2014$/, ''), rules: '2014' })).sort(byId);

// Feitiçaria Dracônica 2024 (nível 6: tipo de dano) e Linhagem Dracônica 2014
// (nível 1: ancestral, que define o tipo da Afinidade Elemental do nível 6).
const AFFINITY_2024 = b('Resistência a esse tipo de dano; ao conjurar magia que cause esse dano, some o modificador de Carisma a uma rolagem de dano dela.',
  'Resistance to that damage type; when you cast a spell that deals it, add your Charisma modifier to one damage roll of that spell.');
const affinity2024 = [
  ['acid', 'Ácido', 'Acid'], ['cold', 'Frio', 'Cold'], ['fire', 'Fogo', 'Fire'],
  ['lightning', 'Elétrico', 'Lightning'], ['poison', 'Veneno', 'Poison'],
].map(([id, pt, en]) => ({ id, name: b(`Afinidade: ${pt}`, `${en} Affinity`), source: 'SRD', rules: '2024', desc: AFFINITY_2024 }));
const ancestor2014 = [
  ['black', 'Negro', 'Black', 'ácido', 'acid'], ['blue', 'Azul', 'Blue', 'elétrico', 'lightning'],
  ['brass', 'Latão', 'Brass', 'fogo', 'fire'], ['bronze', 'Bronze', 'Bronze', 'elétrico', 'lightning'],
  ['copper', 'Cobre', 'Copper', 'ácido', 'acid'], ['gold', 'Ouro', 'Gold', 'fogo', 'fire'],
  ['green', 'Verde', 'Green', 'veneno', 'poison'], ['red', 'Vermelho', 'Red', 'fogo', 'fire'],
  ['silver', 'Prata', 'Silver', 'frio', 'cold'], ['white', 'Branco', 'White', 'frio', 'cold'],
].map(([id, pt, en, dPt, dEn]) => ({
  id: `${id}Dragon`, name: b(`Ancestral: Dragão ${pt}`, `${en} Dragon Ancestor`), source: 'PHB', rules: '2014',
  desc: b(`Tipo de dano: ${dPt}. Você fala, lê e escreve Dracônico e dobra o bônus de proficiência em testes de Carisma ao interagir com dragões. Afinidade Elemental (nível 6) soma o Carisma ao dano de magias desse tipo e permite gastar 1 ponto de feitiçaria para ter resistência a ele por 1 hora.`,
    `Damage type: ${dEn}. You speak, read, and write Draconic and double your proficiency bonus on Charisma checks when interacting with dragons. Elemental Affinity (level 6) adds Charisma to damage of spells of that type and lets you spend 1 sorcery point for resistance to it for 1 hour.`),
  grants: { languages: ['Draconic'] },
}));

// Alma Divina (XGE): a afinidade concede uma magia de clérigo sempre preparada.
const divineAffinity = [
  ['good', 'Bem', 'Good', 'cureWounds', 'Curar Ferimentos', 'Cure Wounds'],
  ['evil', 'Mal', 'Evil', 'inflictWounds', 'Infligir Ferimentos', 'Inflict Wounds'],
  ['law', 'Ordem', 'Law', 'bless', 'Bênção', 'Bless'],
  ['chaos', 'Caos', 'Chaos', 'bane', 'Perdição', 'Bane'],
  ['neutrality', 'Neutralidade', 'Neutrality', 'protectionFromEvilAndGood', 'Proteção contra o Bem e o Mal', 'Protection from Evil and Good'],
].map(([id, pt, en, spell, sPt, sEn]) => ({
  id, name: b(pt, en), source: 'XGE',
  desc: b(`Concede ${sPt}, que conta como magia de feiticeiro e fica sempre preparada (não conta no limite).`,
    `Grants ${sEn}, which counts as a sorcerer spell for you and is always prepared (doesn't count against your limit).`),
  grants: { spells: [spell] },
}));

// Mente Aberrante / Alma Mecânica 2014 (TCE): as magias da subclasse (2 por círculo,
// ganhas nos níveis 1/3/5/7/9) podem ser trocadas, ao ganhar nível de feiticeiro, por
// outra do mesmo círculo, das listas de feiticeiro/bruxo/mago, de certas escolas.
// O formato não troca `autoSpells`, então cada círculo vira um pool dinâmico: as
// magias padrão aparecem sempre (`include`) e o resto obedece ao filtro de escola.
// Obs.: pela regra, só 1 troca por nível no total; aqui cada pool permite 1.
const TCE_LISTS = ['sorcerer', 'warlock', 'wizard'];
const subclassSpellPools = (prefix, pt, en, schools, defaults) => Object.fromEntries(
  defaults.map((ids, i) => [`${prefix}${i + 1}`, {
    name: b(`${pt} (${i + 1}º círculo)`, `${en} (level ${i + 1})`),
    kind: 'spell', grantAs: 'spell', swapOnLevelUp: 1,
    filter: { classes: TCE_LISTS, school: schools, level: i + 1, include: ids },
  }]));
const PSIONIC_DEFAULTS = [['armsOfHadar', 'dissonantWhispers'], ['calmEmotions', 'detectThoughts'], ['hungerOfHadar', 'sendingSpell'], ['blackTentacles', 'summonAberration'], ['telepathicBond', 'telekinesis']];
const CLOCKWORK_DEFAULTS = [['alarm', 'protectionFromEvilGood'], ['aid', 'lesserRestoration'], ['dispelMagic', 'protectionFromEnergy'], ['freedomOfMovement', 'summonConstruct'], ['greaterRestoration', 'wallOfForce']];
// Magias da subclasse por nível de feiticeiro (2 por círculo).
const subSpellLevels = (prefix) => ({ 1: { [`${prefix}1`]: 2 }, 3: { [`${prefix}2`]: 2 }, 5: { [`${prefix}3`]: 2 }, 7: { [`${prefix}4`]: 2 }, 9: { [`${prefix}5`]: 2 } });

export default {
  classId: 'sorcerer',

  pools: {
    metamagic: {
      name: b('Metamagia', 'Metamagic'),
      swapOnLevelUp: 1, // 2024: ao ganhar nível de feiticeiro, troca 1 opção
      options: metamagic2024,
    },
    metamagic2014: {
      name: b('Metamagia (2014)', 'Metamagic (2014)'),
      options: metamagicLegacy, // sem troca na regra-base 2014
    },
    elementalAffinity: {
      name: b('Afinidade Elemental', 'Elemental Affinity'),
      options: affinity2024,
    },
    dragonAncestor: {
      name: b('Ancestral Dracônico', 'Dragon Ancestor'),
      options: ancestor2014,
    },
    divineAffinity: {
      name: b('Afinidade Divina', 'Divine Affinity'),
      options: divineAffinity,
    },
    ...subclassSpellPools('psionicSpells', 'Magias Psiônicas', 'Psionic Spells', ['divination', 'enchantment'], PSIONIC_DEFAULTS),
    ...subclassSpellPools('clockworkSpells', 'Magias Mecânicas', 'Clockwork Magic', ['abjuration', 'transmutation'], CLOCKWORK_DEFAULTS),
  },

  // 2024: 2 no nível 2, +2 no 10 e +2 no 17 (totais 2/4/6).
  choices: { 2: { metamagic: 2 }, 10: { metamagic: 2 }, 17: { metamagic: 2 } },
  // 2014: 2 no nível 3, +1 no 10 e +1 no 17 (totais 2/3/4).
  legacyChoices: { 3: { metamagic2014: 2 }, 10: { metamagic2014: 1 }, 17: { metamagic2014: 1 } },
  // Fichas 2024: subclasse no nível 3.
  subclassChoices: {
    draconic: { 6: { elementalAffinity: 1 } },
    divine: { 3: { divineAffinity: 1 } },
  },
  // Fichas 2014: subclasse (Origem Feiticeira) no nível 1.
  legacySubclassChoices: {
    draconic: { 1: { dragonAncestor: 1 } },
    divine: { 1: { divineAffinity: 1 } },
    aberrantmind: subSpellLevels('psionicSpells'),
    clockworksoul: subSpellLevels('clockworkSpells'),
  },

  // Recursos com usos (sem espaços de magia). Subclasses de suplemento começam no
  // nível 1 em 2014 e no 3 em 2024; `minLevel: 1` serve às duas (em 2024 a
  // subclasse só existe a partir do 3).
  resources: [
    { id: 'sorceryPoints', name: b('Pontos de Feitiçaria', 'Sorcery Points'),
      desc: b('Fonte de Magia: pontos = nível de feiticeiro; gastos em Metamagia, espaços e traços.', 'Font of Magic: points = Sorcerer level; spent on Metamagic, slots, and features.'),
      uses: { classLevel: true }, recharge: 'long', minLevel: 2 },
    { id: 'innateSorcery', name: b('Feitiçaria Inata', 'Innate Sorcery'), rules: '2024',
      desc: b('A partir do nível 7, sem usos, ative por 2 pontos de feitiçaria.', 'From level 7, with no uses left, activate for 2 Sorcery Points.'),
      uses: { fixed: 2 }, recharge: 'long', minLevel: 1 },
    { id: 'sorcerousRestoration', name: b('Restauração Feiticeira', 'Sorcerous Restoration'), rules: '2024',
      desc: b('No Descanso Curto, recupere até metade do nível em pontos de feitiçaria.', 'On a Short Rest, regain up to half your level in Sorcery Points.'),
      uses: { fixed: 1 }, recharge: 'long', minLevel: 5 },
    // Dracônica
    { id: 'dragonWings', name: b('Asas de Dragão', 'Dragon Wings'), rules: '2024', subclass: ['draconic'],
      desc: b('Ou gaste 3 pontos de feitiçaria para recuperar.', 'Or spend 3 Sorcery Points to restore.'),
      uses: { fixed: 1 }, recharge: 'long', minLevel: 14 },
    { id: 'dragonCompanion', name: b('Companheiro Dracônico', 'Dragon Companion'), rules: '2024', subclass: ['draconic'],
      desc: b('Invocar Dragão sem espaço de magia.', 'Summon Dragon without a spell slot.'),
      uses: { fixed: 1 }, recharge: 'long', minLevel: 18 },
    // Selvagem
    { id: 'tidesOfChaos', name: b('Marés do Caos', 'Tides of Chaos'), subclass: ['wildmagic'],
      desc: b('Também volta após um Surto de Magia Selvagem.', 'Also returns after a Wild Magic Surge.'),
      uses: { fixed: 1 }, recharge: 'long', minLevel: 1 },
    { id: 'tamedSurge', name: b('Surto Domado', 'Tamed Surge'), rules: '2024', subclass: ['wildmagic'],
      uses: { fixed: 1 }, recharge: 'long', minLevel: 18 },
    // Aberrante
    { id: 'warpingImplosion', name: b('Implosão Distorcida', 'Warping Implosion'), subclass: ['aberrantmind'],
      desc: b('Ou gaste 5 pontos de feitiçaria.', 'Or spend 5 Sorcery Points.'),
      uses: { fixed: 1 }, recharge: 'long', minLevel: 18 },
    // Mecânica
    { id: 'restoreBalance', name: b('Restaurar o Equilíbrio', 'Restore Balance'), rules: '2024', subclass: ['clockworksoul'],
      uses: { ability: 'cha', min: 1 }, recharge: 'long', minLevel: 3 },
    { id: 'restoreBalance2014', name: b('Restaurar o Equilíbrio', 'Restore Balance'), rules: '2014', subclass: ['clockworksoul'],
      uses: { profBonus: true }, recharge: 'long', minLevel: 1 },
    { id: 'tranceOfOrder', name: b('Transe da Ordem', 'Trance of Order'), subclass: ['clockworksoul'],
      desc: b('Ou gaste 5 pontos de feitiçaria.', 'Or spend 5 Sorcery Points.'),
      uses: { fixed: 1 }, recharge: 'long', minLevel: 14 },
    { id: 'clockworkCavalcade', name: b('Cavalgada Mecânica', 'Clockwork Cavalcade'), subclass: ['clockworksoul'],
      desc: b('Ou gaste 7 pontos de feitiçaria.', 'Or spend 7 Sorcery Points.'),
      uses: { fixed: 1 }, recharge: 'long', minLevel: 18 },
    // Alma Divina
    { id: 'favoredByTheGods', name: b('Favorecido pelos Deuses', 'Favored by the Gods'), subclass: ['divine'],
      uses: { fixed: 1 }, recharge: 'short', minLevel: 1 },
    { id: 'unearthlyRecovery', name: b('Recuperação Sobrenatural', 'Unearthly Recovery'), subclass: ['divine'],
      uses: { fixed: 1 }, recharge: 'long', minLevel: 18 },
    // Sombras
    { id: 'strengthOfTheGrave', name: b('Força da Sepultura', 'Strength of the Grave'), subclass: ['shadow'],
      uses: { fixed: 1 }, recharge: 'long', minLevel: 1 },
    // Tempestade
    { id: 'windSoul', name: b('Alma do Vento', 'Wind Soul'), subclass: ['storm'],
      desc: b('Conceder voo a aliados.', 'Grant flight to allies.'),
      uses: { fixed: 1 }, recharge: 'short', minLevel: 18 },
    // Lunar
    { id: 'lunarEmbodiment', name: b('Encarnação Lunar', 'Lunar Embodiment'), subclass: ['lunar'],
      desc: b('Magia de nível 1 da fase sem espaço; a partir do nível 6, uma por fase.', 'Phase level 1 spell without a slot; from level 6, one per phase.'),
      uses: { byLevel: { 1: 1, 6: 3 } }, recharge: 'long', minLevel: 1 },
    { id: 'lunarBoons', name: b('Dádivas Lunares', 'Lunar Boons'), subclass: ['lunar'],
      uses: { profBonus: true }, recharge: 'long', minLevel: 6 },
    { id: 'lunarPhenomenon', name: b('Fenômeno Lunar', 'Lunar Phenomenon'), subclass: ['lunar'],
      desc: b('Um por fase; ou gaste 5 pontos de feitiçaria.', 'One per phase; or spend 5 Sorcery Points.'),
      uses: { fixed: 3 }, recharge: 'long', minLevel: 18 },
    // Demoníaca (UA, só regras 2024)
    { id: 'abyssalExplosion', name: b('Explosão Abissal', 'Abyssal Explosion'), rules: '2024', subclass: ['demonic'],
      desc: b('Ou gaste 7 pontos de feitiçaria para recuperar.', 'Or spend 7 Sorcery Points to restore it.'),
      uses: { fixed: 1 }, recharge: 'long', minLevel: 18 },
  ],

  // -------------------------------------------------------------------------
  // Traços da classe base 2024 (SRD 5.2.1).
  // -------------------------------------------------------------------------
  features: {
    1: [
      f('spellcasting', 'Conjuração', 'Spellcasting',
        'Você conjura magias de feiticeiro usando Carisma e pode usar um Foco Arcano. Truques: 4 no nível 1 (5 no 4, 6 no 10); ao ganhar um nível, pode trocar um truque. Magias preparadas: comece com duas de nível 1 e siga a coluna de Magias Preparadas; ao ganhar um nível, pode trocar uma delas por outra de feiticeiro para a qual tenha espaço. Magias sempre preparadas de outros traços não contam no limite. Espaços de magia voltam no Descanso Longo.',
        'You cast Sorcerer spells using Charisma and can use an Arcane Focus. Cantrips: 4 at level 1 (5 at 4, 6 at 10); whenever you gain a level, you can replace one cantrip. Prepared spells: start with two level 1 spells and follow the Prepared Spells column; whenever you gain a level, you can replace one with another Sorcerer spell for which you have slots. Always-prepared spells from other features don\'t count against the limit. Spell slots return on a Long Rest.'),
      f('innateSorcery', 'Feitiçaria Inata', 'Innate Sorcery',
        'Ação Bônus: libera sua magia por 1 minuto. Durante esse tempo, a CD das suas magias de feiticeiro aumenta em 1 e você tem Vantagem nas jogadas de ataque das magias de feiticeiro. 2 usos; recupera todos no Descanso Longo.',
        'Bonus Action: unleash your magic for 1 minute. For the duration, the spell save DC of your Sorcerer spells increases by 1 and you have Advantage on attack rolls of Sorcerer spells you cast. 2 uses; regain all on a Long Rest.'),
    ],
    2: [
      f('fontOfMagic', 'Fonte de Magia', 'Font of Magic',
        'Você tem pontos de feitiçaria iguais ao seu nível de feiticeiro (2 no nível 2) e recupera todos no Descanso Longo. Converter espaço em pontos: gaste um espaço de magia para ganhar pontos iguais ao nível dele (sem ação). Criar espaço: Ação Bônus, transforme pontos num espaço de até nível 5 — nível 1: 2 pontos (feiticeiro 2+); 2: 3 pontos (3+); 3: 5 pontos (5+); 4: 6 pontos (7+); 5: 7 pontos (9+). Espaços criados somem no Descanso Longo.',
        'You have Sorcery Points equal to your Sorcerer level (2 at level 2) and regain all on a Long Rest. Converting slots: expend a spell slot to gain points equal to its level (no action). Creating slots: as a Bonus Action, turn points into a slot of level 5 or lower — level 1: 2 points (Sorcerer 2+); 2: 3 points (3+); 3: 5 points (5+); 4: 6 points (7+); 5: 7 points (9+). Created slots vanish on a Long Rest.'),
      f('metamagic', 'Metamagia', 'Metamagic',
        'Você ganha duas opções de Metamagia e as usa gastando os pontos de feitiçaria indicados. Só uma opção por magia, salvo indicação em contrário. Ao ganhar um nível de feiticeiro, pode trocar uma opção conhecida por outra. Ganha mais duas opções nos níveis 10 e 17.',
        'You gain two Metamagic options and use them by spending the listed Sorcery Points. Only one option per spell unless noted otherwise. Whenever you gain a Sorcerer level, you can replace one option you know with another. You gain two more options at levels 10 and 17.'),
    ],
    3: [
      f('sorcererSubclass', 'Subclasse de Feiticeiro', 'Sorcerer Subclass',
        "Você ganha uma subclasse de Feiticeiro de sua escolha. A subclasse Feitiçaria Dracônica é detalhada após a descrição desta classe. Uma subclasse é uma especialização que concede a você características em certos níveis de Feiticeiro. Pelo restante da sua carreira, você ganha cada uma das características da sua subclasse que sejam do seu nível de Feiticeiro ou inferior.",
        "You gain a Sorcerer subclass of your choice. The Draconic Sorcery subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Sorcerer levels. For the rest of your career, you gain each of your subclass's features that are of your Sorcerer level or lower."),
    ],
    4: [
      f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement',
        "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Feiticeiro 8, 12 e 16.",
        "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Sorcerer levels 8, 12, and 16."),
    ],
    5: [
      f('sorcerousRestoration', 'Restauração Feiticeira', 'Sorcerous Restoration',
        "Ao terminar um Descanso Curto, você pode recuperar Pontos de Feitiçaria gastos, mas não mais do que um número igual à metade do seu nível de Feiticeiro (arredondado para baixo). Uma vez que usar esta característica, você não pode fazê-lo novamente até terminar um Descanso Longo.",
        "When you finish a Short Rest, you can regain expended Sorcery Points, but no more than a number equal to half your Sorcerer level (round down). Once you use this feature, you can't do so again until you finish a Long Rest."),
    ],
    7: [
      f('sorceryIncarnate', 'Feitiçaria Encarnada', 'Sorcery Incarnate',
        "Se você não tiver mais usos de Feitiçaria Inata, pode usá-la se gastar 2 Pontos de Feitiçaria ao realizar a Ação Bônus para ativá-la.\n\nAlém disso, enquanto sua característica Feitiçaria Inata estiver ativa, você pode usar até duas de suas opções de Metamagia em cada magia que conjurar.",
        "If you have no uses of Innate Sorcery left, you can use it if you spend 2 Sorcery Points when you take the Bonus Action to activate it.\n\nIn addition, while your Innate Sorcery feature is active, you can use up to two of your Metamagic options on each spell you cast."),
    ],
    8: [
      f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement',
        "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Feiticeiro 8, 12 e 16.",
        "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Sorcerer levels 8, 12, and 16."),
    ],
    10: [
      f('metamagic', 'Metamagia', 'Metamagic',
        "Como sua magia flui de dentro de você, você pode alterar suas magias para atender às suas necessidades; você ganha duas opções de Metamagia à sua escolha da seção \"Opções de Metamagia\" mais adiante na descrição desta classe. Você usa as opções escolhidas para modificar temporariamente as magias que conjura. Para usar uma opção, você deve gastar o número de Pontos de Feitiçaria que ela custa.\n\nVocê só pode usar uma opção de Metamagia em uma magia ao conjurá-la, a menos que haja indicação em contrário em uma dessas opções.\n\nSempre que você ganha um nível de Feiticeiro, pode substituir uma de suas opções de Metamagia por outra que você não conheça. Você ganha mais duas opções no nível 10 de Feiticeiro e mais duas no nível 17 de Feiticeiro.",
        "Because your magic flows from within, you can alter your spells to suit your needs; you gain two Metamagic options of your choice from \"Metamagic Options\" later in this class's description. You use the chosen options to temporarily modify spells you cast. To use an option, you must spend the number of Sorcery Points that it costs.\n\nYou can use only one Metamagic option on a spell when you cast it unless otherwise noted in one of those options.\n\nWhenever you gain a Sorcerer level, you can replace one of your Metamagic options with one you don't know. You gain two more options at Sorcerer level 10 and two more at Sorcerer level 17."),
    ],
    12: [
      f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement',
        "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Feiticeiro 8, 12 e 16.",
        "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Sorcerer levels 8, 12, and 16."),
    ],
    16: [
      f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement',
        "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Feiticeiro 8, 12 e 16.",
        "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Sorcerer levels 8, 12, and 16."),
    ],
    17: [
      f('metamagic', 'Metamagia', 'Metamagic',
        "Como sua magia flui de dentro de você, você pode alterar suas magias para atender às suas necessidades; você ganha duas opções de Metamagia à sua escolha da seção \"Opções de Metamagia\" mais adiante na descrição desta classe. Você usa as opções escolhidas para modificar temporariamente as magias que conjura. Para usar uma opção, você deve gastar o número de Pontos de Feitiçaria que ela custa.\n\nVocê só pode usar uma opção de Metamagia em uma magia ao conjurá-la, a menos que haja indicação em contrário em uma dessas opções.\n\nSempre que você ganha um nível de Feiticeiro, pode substituir uma de suas opções de Metamagia por outra que você não conheça. Você ganha mais duas opções no nível 10 de Feiticeiro e mais duas no nível 17 de Feiticeiro.",
        "Because your magic flows from within, you can alter your spells to suit your needs; you gain two Metamagic options of your choice from \"Metamagic Options\" later in this class's description. You use the chosen options to temporarily modify spells you cast. To use an option, you must spend the number of Sorcery Points that it costs.\n\nYou can use only one Metamagic option on a spell when you cast it unless otherwise noted in one of those options.\n\nWhenever you gain a Sorcerer level, you can replace one of your Metamagic options with one you don't know. You gain two more options at Sorcerer level 10 and two more at Sorcerer level 17."),
    ],
    19: [
      f('epicBoon', 'Dádiva Épica', 'Epic Boon',
        "Você ganha um talento de Dádiva Épica (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Dádiva da Viagem Dimensional é recomendada.",
        "You gain an Epic Boon feat (see \"Feats\") or another feat of your choice for which you qualify. Boon of Dimensional Travel is recommended."),
    ],
    20: [
      f('arcaneApotheosis', 'Apoteose Arcana', 'Arcane Apotheosis',
        "Enquanto sua característica Feitiçaria Inata estiver ativa, você pode usar uma opção de Metamagia em cada um dos seus turnos sem gastar Pontos de Feitiçaria nela.",
        "While your Innate Sorcery feature is active, you can use one Metamagic option on each of your turns without spending Sorcery Points on it."),
    ],
  },

  // -------------------------------------------------------------------------
  // Subclasses. Suplementos 2014: traços do nível 1 passam para o 3.
  // -------------------------------------------------------------------------
  subclasses: {
    draconic: {
      name: b('Feitiçaria Dracônica', 'Draconic Sorcery'),
      source: 'SRD',
      desc: b('Sua magia inata vem da dádiva de um dragão.', 'Your innate magic comes from the gift of a dragon.'),
      levels: {
        3: {
          features: [
            f('draconicResilience', 'Resiliência Dracônica', 'Draconic Resilience',
              'Seu máximo de Pontos de Vida aumenta em 3, e em mais 1 a cada nível de feiticeiro seguinte. Partes do corpo são cobertas por escamas: sem armadura, sua Classe de Armadura base é 10 + modificadores de Destreza e Carisma.',
              'Your Hit Point maximum increases by 3, and by 1 more whenever you gain another Sorcerer level. Parts of you are covered by dragon-like scales: while not wearing armor, your base Armor Class equals 10 plus your Dexterity and Charisma modifiers.'),
            f('draconicSpells', 'Magias Dracônicas', 'Draconic Spells',
              "Quando você atinge um nível de Feiticeiro especificado na tabela Magias Dracônicas, a partir de então você sempre tem as magias listadas preparadas.\n\nMagias Dracônicas\n\nNível de Feiticeiro | Magias\n3 | Alterar-se, Esfera Cromática, Comando, Sopro do Dragão\n5 | Medo, Voo\n7 | Olho Arcano, Enfeitiçar Monstro\n9 | Conhecimento das Lendas, Invocar Dragão",
              "When you reach a Sorcerer level specified in the Draconic Spells table, you thereafter always have the listed spells prepared.\n\nDraconic Spells\n\nSorcerer Level | Spells\n3 | Alter Self, Chromatic Orb, Command, Dragon's Breath\n5 | Fear, Fly\n7 | Arcane Eye, Charm Monster\n9 | Legend Lore, Summon Dragon"),
          ],
          autoSpells: ['alterSelf', 'chromaticOrb', 'command', 'dragonsBreath'],
        },
        5: { autoSpells: ['fear', 'fly'] },
        6: {
          features: [
            f('elementalAffinity', 'Afinidade Elemental', 'Elemental Affinity',
              'Escolha um tipo de dano ligado aos dragões: ácido, elétrico, fogo, frio ou veneno. Você tem Resistência a ele e, ao conjurar uma magia que cause esse dano, pode somar o modificador de Carisma a uma rolagem de dano dela.',
              'Choose a damage type associated with dragons: Acid, Cold, Fire, Lightning, or Poison. You have Resistance to it, and when you cast a spell that deals that damage, you can add your Charisma modifier to one damage roll of that spell.'),
          ],
        },
        7: { autoSpells: ['arcaneEye', 'charmMonster'] },
        9: { autoSpells: ['legendLore', 'summonDragon'] },
        14: {
          features: [
            f('dragonWings', 'Asas de Dragão', 'Dragon Wings',
              "Como uma Ação Bônus, você pode fazer com que asas dracônicas apareçam em suas costas. As asas duram por 1 hora ou até você dispensá-las (nenhuma ação necessária). Pela duração, você tem um Deslocamento de Voo de 18 metros.\n\nDepois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste 3 Pontos de Feitiçaria (nenhuma ação necessária) para recuperar o uso dela.",
              "As a Bonus Action, you can cause draconic wings to appear on your back. The wings last for 1 hour or until you dismiss them (no action required). For the duration, you have a Fly Speed of 60 feet.\n\nOnce you use this feature, you can't use it again until you finish a Long Rest unless you spend 3 Sorcery Points (no action required) to restore your use of it."),
          ],
        },
        18: {
          features: [
            f('dragonCompanion', 'Companheiro Dracônico', 'Dragon Companion',
              "Você pode conjurar Invocar Dragão sem um componente Material. Você também pode conjurá-la uma vez sem um espaço de magia, e recupera a habilidade de conjurá-la dessa forma ao terminar um Descanso Longo.\n\nSempre que começar a conjurar a magia, você pode modificá-la para que não exija Concentração. Se fizer isso, a duração da magia se torna 1 minuto para aquela conjuração.",
              "You can cast Summon Dragon without a Material component. You can also cast it once without a spell slot, and you regain the ability to cast it in this way when you finish a Long Rest.\n\nWhenever you start casting the spell, you can modify it so that it doesn't require Concentration. If you do so, the spell's duration becomes 1 minute for that casting."),
          ],
        },
      },
    },

    wildmagic: {
      name: b('Feitiçaria Selvagem', 'Wild Magic Sorcery'),
      source: 'PHB24',
      desc: b('Sua magia nasce das forças do caos e pode explodir em surtos imprevisíveis.', 'Your magic springs from the forces of chaos and can erupt in unpredictable surges.'),
      levels: {
        3: {
          features: [
            f('wildMagicSurge', 'Surto de Magia Selvagem', 'Wild Magic Surge',
              "A partir do momento em que escolhe esta origem no 1º nível, sua conjuração de magias pode desencadear surtos de magia indomada. Uma vez por turno, o Mestre pode fazer com que você role um d20 imediatamente após conjurar uma magia de feiticeiro de 1º círculo ou superior. Se você rolar um 1, role na tabela Surto de Magia Selvagem para criar um efeito mágico. Se esse efeito for uma magia, ele é selvagem demais para ser afetado pela sua Metamagia e, se normalmente exigir concentração, não exigirá concentração nesse caso; a magia dura por sua duração total.",
              "Starting when you choose this origin at 1st level, your spellcasting can unleash surges of untamed magic. Once per turn, the DM can have you roll a d20 immediately after you cast a sorcerer spell of 1st level or higher. If you roll a 1, roll on the Wild Magic Surge table to create a magical effect. If that effect is a spell, it is too wild to be affected by your Metamagic, and if it normally requires concentration, it doesn’t require concentration in this case; the spell lasts for its full duration."),
            f('tidesOfChaos', 'Marés do Caos', 'Tides of Chaos',
              'Ganhe Vantagem em um Teste de d20 antes de rolar. Depois disso, a próxima magia de feiticeiro que você conjurar com espaço de magia provoca automaticamente uma rolagem na tabela de surtos, e isso devolve o uso; senão, ele volta no Descanso Longo.',
              'Gain Advantage on one D20 Test before you roll. Afterward, the next Sorcerer spell you cast with a spell slot automatically triggers a roll on the surge table, which restores the use; otherwise it returns on a Long Rest.'),
          ],
        },
        6: {
          features: [
            f('bendLuck', 'Distorcer a Sorte', 'Bend Luck',
              "A partir do 6º nível, você tem a habilidade de distorcer o destino usando sua magia selvagem. Quando outra criatura que você possa ver fizer uma jogada de ataque, um teste de habilidade ou uma salvaguarda, você pode usar sua reação e gastar 2 pontos de feitiçaria para rolar 1d4 e aplicar o número rolado como um bônus ou penalidade (à sua escolha) à rolagem da criatura. Você pode fazer isso depois que a criatura rolar, mas antes que quaisquer efeitos da rolagem ocorram.",
              "Starting at 6th level, you have the ability to twist fate using your wild magic. When another creature you can see makes an attack roll, an ability check, or a saving throw, you can use your reaction and spend 2 sorcery points to roll 1d4 and apply the number rolled as a bonus or penalty (your choice) to the creature’s roll. You can do so after the creature rolls but before any effects of the roll occur."),
          ],
        },
        14: {
          features: [
            f('controlledChaos', 'Caos Controlado', 'Controlled Chaos',
              "No 14º nível, você adquire um pouco de controle sobre os surtos de sua magia selvagem. Sempre que rolar na tabela Surto de Magia Selvagem, você pode rolar duas vezes e usar qualquer um dos números.",
              "At 14th level, you gain a modicum of control over the surges of your wild magic. Whenever you roll on the Wild Magic Surge table, you can roll twice and use either number."),
          ],
        },
        18: {
          features: [
            f('tamedSurge', 'Surto Domado', 'Tamed Surge',
              "Imediatamente após conjurar uma magia de Feiticeiro com um espaço de magia, você pode criar um efeito à sua escolha da tabela Surto de Magia Selvagem em vez de rolar nessa tabela. Você pode escolher qualquer efeito na tabela exceto pela linha final e, se o efeito escolhido envolver uma rolagem, você deve realizá-la.\n\nDepois de usar esta característica, você não pode fazer isso novamente até terminar um Descanso Longo.",
              "Immediately after you cast a Sorcerer spell with a spell slot, you can create an effect of your choice from the Wild Magic Surge table instead of rolling on that table. You can choose any effect in the table except for the final row, and if the chosen effect involves a roll, you must make it.\n\nOnce you use this feature, you can't do so again until you finish a Long Rest."),
          ],
        },
      },
    },

    aberrantmind: {
      name: b('Feitiçaria Aberrante', 'Aberrant Sorcery'),
      source: 'PHB24',
      desc: b('Uma influência alienígena deu à sua mente poderes psiônicos.', 'An alien influence has granted your mind psionic power.'),
      levels: {
        3: {
          features: [
            f('psionicSpells', 'Magias Psiônicas', 'Psionic Spells',
              'Magias sempre preparadas: nível 3 — Braços de Hadar, Acalmar Emoções, Detectar Pensamentos, Sussurros Dissonantes e o truque Estilhaço Mental; 5 — Fome de Hadar, Enviar Mensagem; 7 — Tentáculos Negros, Invocar Aberração; 9 — Vínculo Telepático, Telecinese.',
              'Always prepared: level 3 — Arms of Hadar, Calm Emotions, Detect Thoughts, Dissonant Whispers, and the Mind Sliver cantrip; 5 — Hunger of Hadar, Sending; 7 — Black Tentacles, Summon Aberration; 9 — Telepathic Bond, Telekinesis.'),
            f('telepathicSpeech', 'Fala Telepática', 'Telepathic Speech',
              "Característica de Mente Aberrante de 1º nível\n\nVocê pode formar uma conexão telepática entre a sua mente e a mente de outro. Como uma ação bônus, escolha uma criatura que você possa ver a até 9 metros de você. Você e a criatura escolhida podem falar telepaticamente um com o outro enquanto vocês dois estiverem a uma distância de até 1,5 quilômetro vezes o seu modificador de Carisma um do outro (mínimo de 1,5 quilômetro). Para compreenderem um ao outro, cada um deve falar mentalmente em um idioma que o outro conheça.\n\nA conexão telepática dura por um número de minutos igual ao seu nível de feiticeiro. Ela termina mais cedo se você estiver incapacitado ou morrer, ou se você usar esta habilidade para formar uma conexão com uma criatura diferente.",
              "1st-level Aberrant Mind feature\n\nYou can form a telepathic connection between your mind and the mind of another. As a bonus action, choose one creature you can see within 30 feet of you. You and the chosen creature can speak telepathically with each other while the two of you are within a number of miles of each other equal to your Charisma modifier (minimum of 1 mile). To understand each other, you each must speak mentally in a language the other knows.\n\nThe telepathic connection lasts for a number of minutes equal to your sorcerer level. It ends early if you are incapacitated or die or if you use this ability to form a connection with a different creature."),
          ],
          autoSpells: ['armsOfHadar', 'calmEmotions', 'detectThoughts', 'dissonantWhispers'],
          autoCantrips: ['mindSliver'],
        },
        5: { autoSpells: ['hungerOfHadar', 'sending'] },
        6: {
          features: [
            f('psionicSorcery', 'Feitiçaria Psiônica', 'Psionic Sorcery',
              "Característica de Mente Aberrante de 6º nível\n\nQuando você conjura qualquer magia de 1º círculo ou superior da sua característica Magias Psiônicas, você pode conjurá-la gastando um espaço de magia como o normal ou gastando um número de pontos de feitiçaria igual ao círculo da magia.\n\nSe você conjurar a magia usando pontos de feitiçaria, ela não requer componentes verbais ou somáticos, e não requer componentes materiais, a menos que sejam consumidos pela magia.",
              "6th-level Aberrant Mind feature\n\nWhen you cast any spell of 1st level or higher from your Psionic Spells feature, you can cast it by expending a spell slot as normal or by spending a number of sorcery points equal to the spell's level.\n\nIf you cast the spell using sorcery points, it requires no verbal or somatic components, and it requires no material components, unless they are consumed by the spell."),
            f('psychicDefenses', 'Defesas Psíquicas', 'Psychic Defenses',
              "Característica de Mente Aberrante de 6º nível\n\nVocê ganha resistência a dano psíquico e tem vantagem em salvaguardas contra ser enfeitiçado ou amedrontado.",
              "6th-level Aberrant Mind feature\n\nYou gain resistance to psychic damage, and you have advantage on saving throws against being charmed or frightened."),
          ],
        },
        7: { autoSpells: ['blackTentacles', 'summonAberration'] },
        9: { autoSpells: ['telepathicBond', 'telekinesis'] },
        14: {
          features: [
            f('revelationInFlesh', 'Revelação na Carne', 'Revelation in Flesh',
              "Característica de Mente Aberrante de 14º nível\n\nVocê pode liberar a verdade aberrante oculta dentro de si mesmo. Como uma ação bônus, você pode gastar 1 ou mais pontos de feitiçaria para transformar magicamente seu corpo por 10 minutos. Para cada ponto de feitiçaria gasto, você pode obter um dos seguintes benefícios à sua escolha, cujos efeitos duram até a transformação terminar:\n\n• Você pode ver qualquer criatura invisível a até 18 metros de você, desde que ela não esteja atrás de cobertura total. Seus olhos também ficam pretos ou se tornam tentáculos sensoriais que se contorcem.\n\n• Você ganha um deslocamento de voo igual ao seu deslocamento de caminhada e pode pairar. Enquanto voa, sua pele brilha com muco ou resplandece com uma luz sobrenatural.\n\n• Você ganha um deslocamento de natação igual ao dobro do seu deslocamento de caminhada e pode respirar debaixo d'água. Além disso, guelras crescem em seu pescoço ou se abrem atrás de suas orelhas, seus dedos se tornam palmados ou você desenvolve cílios que se contorcem e se estendem através de suas roupas.\n\n• Seu corpo, juntamente com qualquer equipamento que você esteja vestindo ou carregando, torna-se viscoso e flexível. Você pode se mover através de qualquer espaço tão estreito quanto 2,5 centímetros sem se espremer, e pode gastar 1,5 metro de movimento para escapar de amarras não mágicas ou da condição agarrado.",
              "14th-level Aberrant Mind feature\n\nYou can unleash the aberrant truth hidden within yourself. As a bonus action, you can spend 1 or more sorcery points to magically transform your body for 10 minutes. For each sorcery point you spend, you can gain one of the following benefits of your choice, the effects of which last until the transformation ends:\n\n• You can see any invisible creature within 60 feet of you, provided it isn’t behind total cover. Your eyes also turn black or become writhing sensory tendrils.\n\n• You gain a flying speed equal to your walking speed, and you can hover. As you fly, your skin glistens with mucus or shines with an otherworldly light.\n\n• You gain a swimming speed equal to twice your walking speed, and you can breathe underwater. Moreover, gills grow from your neck or fan out from behind your ears, your fingers become webbed, or you grow writhing cilia that extend through your clothing.\n\n• Your body, along with any equipment you are wearing or carrying, becomes slimy and pliable. You can move through any space as narrow as 1 inch without squeezing, and you can spend 5 feet of movement to escape from nonmagical restraints or being grappled."),
          ],
        },
        18: {
          features: [
            f('warpingImplosion', 'Implosão Distorcida', 'Warping Implosion',
              "Característica de 18º nível da Mente Aberrante\n\nVocê pode liberar seu poder aberrante como uma anomalia de distorção espacial. Com uma ação, você pode se teletransportar para um espaço desocupado que possa ver a até 36 metros de você. Imediatamente após você desaparecer, cada criatura a até 9 metros do espaço que você deixou deve realizar uma salvaguarda de Força contra a CD de suas magias. Se falhar na salvaguarda, a criatura sofre 3d10 de dano de energia e é puxada diretamente em direção ao espaço que você deixou, parando em um espaço desocupado o mais próximo possível do seu antigo espaço. Se obtiver sucesso na salvaguarda, a criatura sofre metade desse dano e não é puxada.\n\nDepois de usar esta característica, você não pode fazê-lo novamente até terminar um descanso longo, a menos que gaste 5 pontos de feitiçaria para usá-la de novo.",
              "18th-level Aberrant Mind feature\n\nYou can unleash your aberrant power as a space-warping anomaly. As an action, you can teleport to an unoccupied space you can see within 120 feet of you. Immediately after you disappear, each creature within 30 feet of the space you left must make a Strength saving throw against your spell save DC. On a failed save, a creature takes 3d10 force damage and is pulled straight toward the space you left, ending in an unoccupied space as close to your former space as possible. On a successful save, the creature takes half as much damage and isn't pulled.\n\nOnce you use this feature, you can't do so again until you finish a long rest, unless you spend 5 sorcery points to use it again."),
          ],
        },
      },
    },

    clockworksoul: {
      name: b('Feitiçaria Mecânica', 'Clockwork Sorcery'),
      source: 'PHB24',
      desc: b('Sua magia vem da ordem cósmica de Mechanus.', 'Your magic flows from the cosmic order of Mechanus.'),
      levels: {
        3: {
          features: [
            f('clockworkSpells', 'Magias Mecânicas', 'Clockwork Spells',
              'Magias sempre preparadas: nível 3 — Auxílio, Alarme, Restauração Menor, Proteção contra o Bem e o Mal; 5 — Dissipar Magia, Proteção contra Energia; 7 — Movimentação Livre, Invocar Constructo; 9 — Restauração Maior, Muralha de Energia. Suas magias podem exibir sinais de ordem (engrenagens, tique-taque, runas), puramente estéticos.',
              'Always prepared: level 3 — Aid, Alarm, Lesser Restoration, Protection from Evil and Good; 5 — Dispel Magic, Protection from Energy; 7 — Freedom of Movement, Summon Construct; 9 — Greater Restoration, Wall of Force. Your spells may show cosmetic signs of order (gears, ticking, runes).'),
            f('restoreBalance', 'Restaurar o Equilíbrio', 'Restore Balance',
              "Característica de Alma Mecânica de 1º nível\n\nSua conexão com o plano da ordem absoluta permite que você equalize momentos caóticos. Quando uma criatura que você possa ver a até 18 metros de você estiver prestes a rolar um d20 com vantagem ou desvantagem, você pode usar sua reação para impedir que a rolagem seja afetada por vantagem e desvantagem.\n\nVocê pode usar esta característica um número de vezes igual ao seu bônus de proficiência, e recupera todos os usos gastos ao terminar um descanso longo.",
              "1st-level Clockwork Soul feature\n\nYour connection to the plane of absolute order allows you to equalize chaotic moments. When a creature you can see within 60 feet of you is about to roll a d20 with advantage or disadvantage, you can use your reaction to prevent the roll from being affected by advantage and disadvantage.\n\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."),
          ],
          autoSpells: ['aid', 'alarm', 'lesserRestoration', 'protectionFromEvilAndGood'],
        },
        5: { autoSpells: ['dispelMagic', 'protectionFromEnergy'] },
        6: {
          features: [
            f('bastionOfLaw', 'Bastião da Lei', 'Bastion of Law',
              "Característica de Alma Mecânica de 6º nível\n\nVocê pode acessar a grande equação da existência para imbuir uma criatura com um escudo cintilante de ordem. Como uma ação, você pode gastar de 1 a 5 pontos de feitiçaria para criar uma proteção mágica ao redor de si mesmo ou de outra criatura que você possa ver a até 9 metros de você. A proteção dura até você terminar um descanso longo ou até você usar esta característica novamente.\n\nA proteção é representada por um número de d8s igual ao número de pontos de feitiçaria gastos para criá-la. Quando a criatura protegida sofre dano, ela pode gastar um número desses dados, rolá-los e reduzir o dano sofrido pelo total rolado nesses dados.",
              "6th-level Clockwork Soul feature\n\nYou can tap into the grand equation of existence to imbue a creature with a shimmering shield of order. As an action, you can expend 1 to 5 sorcery points to create a magical ward around yourself or another creature you can see within 30 feet of you. The ward lasts until you finish a long rest or until you use this feature again.\n\nThe ward is represented by a number of d8s equal to the number of sorcery points spent to create it. When the warded creature takes damage, it can expend a number of those dice, roll them, and reduce the damage taken by the total rolled on those dice."),
          ],
        },
        7: { autoSpells: ['freedomOfMovement', 'summonConstruct'] },
        9: { autoSpells: ['greaterRestoration', 'wallOfForce'] },
        14: {
          features: [
            f('tranceOfOrder', 'Transe da Ordem', 'Trance of Order',
              "Característica de Alma Mecânica de 14º nível\n\nVocê ganha a habilidade de alinhar sua consciência aos cálculos infinitos de Mecânus. Como uma ação bônus, você pode entrar nesse estado por 1 minuto. Pela duração, jogadas de ataque contra você não podem se beneficiar de vantagem e, sempre que fizer uma jogada de ataque, teste de habilidade ou salvaguarda, você pode tratar uma rolagem de 9 ou menos no d20 como um 10.\n\nDepois de usar esta ação bônus, você não pode usá-la novamente até terminar um descanso longo, a menos que gaste 5 pontos de feitiçaria para usá-la novamente.",
              "14th-level Clockwork Soul feature\n\nYou gain the ability to align your consciousness to the endless calculations of Mechanus. As a bonus action, you can enter this state for 1 minute. For the duration, attack rolls against you can’t benefit from advantage, and whenever you make an attack roll, an ability check, or a saving throw, you can treat a roll of 9 or lower on the d20 as a 10.\n\nOnce you use this bonus action, you can’t use it again until you finish a long rest, unless you spend 5 sorcery points to use it again."),
          ],
        },
        18: {
          features: [
            f('clockworkCavalcade', 'Cavalgada Mecânica', 'Clockwork Cavalcade',
              "Você invoca momentaneamente espíritos da ordem para expurgar a desordem ao seu redor. Como uma ação de Magia, você invoca os espíritos em um Cubo de 9 metros originado de você. Os espíritos se parecem com modrons ou outros Construtos à sua escolha. Os espíritos são intangíveis e invulneráveis, e criam os efeitos abaixo dentro do Cubo antes de desaparecerem. Depois de usar esta ação, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste 7 Pontos de Feitiçaria (nenhuma ação necessária) para recuperar o uso dela.\n\nCura. Os espíritos restauram até 100 Pontos de Vida, divididos como você escolher entre qualquer número de criaturas à sua escolha no Cubo.\n\npermite que você equalize momentos caóticos. Quando a rolagem de ser afetada por Vantagem e Desvantagem.\n\nng. Depois de usar esta ação, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste 7 Pontos de Feitiçaria (nenhuma ação necessária) para recuperar o uso dela.\n\nCura. Os espíritos restauram até 100 Pontos de Vida, divididos como você escolher entre qualquer número de criaturas à sua escolha no Cubo.\n\nReparo. Quaisquer objetos danificados inteiramente no Cubo são reparados instantaneamente.\n\nDissipar. Todas as magias de 6º círculo e inferior terminam em criaturas e objetos à sua escolha no Cubo.\n\n0\n\nFEITIÇARIA DRACÔNICA\n\nRespire a Magia dos Dragões\n\nSua magia inata provém da dádiva de um dragão. Talvez um dragão ancião à beira da morte tenha concedido um pouco de seu poder mágico a você ou ao seu ancestral. Você pode ter absorvido a magia de um local infundido com o poder dos dragões. Ou talvez tenha manuseado um tesouro retirado do tesouro acumulado de um dragão que estava impregnado de poder dracônico. Ou você pode ter um dragão como ancestral.",
              "You momentarily summon spirits of order to expunge disorder around you. As a Magic action, you summon the spirits in a 30-foot Cube originating from you. The spirits look like modrons or other\nConstructs of your choice. The spirits are intangible and invulnerable, and they create the effects below within the Cube before vanishing. Once you use this action, you can't use it again until you finish a Long Rest unless you spend 7 Sorcery Points (no action required) to restore your use of it.\n\nHeal. The spirits restore up to 100 Hit Points, divided as you choose among any number of creatures of your choice in the Cube.\n\nallows you to equali ze ch aotic moments. When the roll from being affected by Advanl,,;~e a nd Disadvantage.\n\nng. Once you use this action, you can't use it again until you finish a Long Rest unless you spend 7 Sorcery Points (no action required) to restore your use of it.\n\nHeal. The spirits restore up to 100 Hit Points, divided as you choose among any number of creatures of your choice in the Cube.\n\nRepair. Any damaged objects entirely in the Cube are repaired instantly.\n\nDispel. Every spell of level 6 and lower ends on creatures a nd objects of your choice in the Cube.\n\n0\n\nDRACONIC SORCERY\n\nBreathe the Magic of Dragons\n\nYour innate magic comes from the gift of a dragon. Perhaps an ancient dragon facing death bequeathed some of its magical power to you or your ancestor. You might have absorbed magic from a site infused with dragons' power. Or perhaps you handled a treasure taken from a dragon's hoard that was steeped in draconic power. Or you might have a dragon for an ancestor."),
          ],
        },
      },
    },

    divine: {
      name: b('Alma Divina', 'Divine Soul'),
      source: 'XGE',
      desc: b('Sua magia vem de uma centelha divina.', 'Your magic comes from a divine spark.'),
      levels: {
        3: {
          features: [
            f('divineMagic', 'Magia Divina', 'Divine Magic',
              'Ao preparar ou trocar magias de feiticeiro, você também pode escolher magias da lista de clérigo; elas contam como magias de feiticeiro para você. Escolha uma afinidade (Bem, Mal, Ordem, Caos ou Neutralidade): ela concede uma magia de clérigo sempre preparada — Curar Ferimentos, Infligir Ferimentos, Bênção, Perdição ou Proteção contra o Bem e o Mal, respectivamente.',
              'When you prepare or replace Sorcerer spells, you can also choose from the Cleric spell list; they count as Sorcerer spells for you. Choose an affinity (Good, Evil, Law, Chaos, or Neutrality): it grants one always-prepared Cleric spell — Cure Wounds, Inflict Wounds, Bless, Bane, or Protection from Evil and Good, respectively.'),
            f('favoredByTheGods', 'Favorecido pelos Deuses', 'Favored by the Gods',
              "A partir do 1º nível, o poder divino guarda o seu destino. Se você falhar em uma salvaguarda ou errar uma jogada de ataque, pode rolar 2d4 e adicionar ao total, possivelmente mudando o resultado. Depois de usar esta característica, você não pode usá-la novamente até terminar um descanso curto ou longo.",
              "Starting at 1st level, divine power guards your destiny. If you fail a saving throw or miss with an attack roll, you can roll 2d4 and add it to the total, possibly changing the outcome. Once you use this feature, you can’t use it again until you finish a short or long rest."),
          ],
        },
        6: {
          features: [
            f('empoweredHealing', 'Cura Potencializada', 'Empowered Healing',
              "A partir do 6º nível, a energia divina que corre através de você pode potencializar magias de cura. Sempre que você ou um aliado a até 1,5 metro de você rolar dados para determinar o número de pontos de vida que uma magia restaura, você pode gastar 1 ponto de feitiçaria para rolar novamente qualquer número desses dados uma vez, desde que não esteja incapacitado. Você pode usar esta característica apenas uma vez por turno.",
              "Starting at 6th level, the divine energy coursing through you can empower healing spells. Whenever you or an ally within 5 feet of you rolls dice to determine the number of hit points a spell restores, you can spend 1 sorcery point to reroll any number of those dice once, provided you aren't incapacitated. You can use this feature only once per turn."),
          ],
        },
        14: {
          features: [
            f('otherworldlyWings', 'Asas Sobrenaturais', 'Otherworldly Wings',
              "A partir do 14º nível, você pode usar uma ação bônus para manifestar um par de asas espectrais em suas costas. Enquanto as asas estiverem presentes, você tem um deslocamento de voo de 9 metros. As asas duram até você ficar incapacitado, morrer ou dispensá-las com uma ação bônus.\n\nA afinidade que você escolheu para sua característica Magia Divina determina a aparência das asas espectrais: asas de águia para o bem ou ordem, asas de morcego para o mal ou caos e asas de libélula para a neutralidade.",
              "Starting at 14th level, you can use a bonus action to manifest a pair of spectral wings from your back. While the wings are present, you have a flying speed of 30 feet. The wings last until you're incapacitated, you die, or you dismiss them as a bonus action.\n\nThe affinity you chose for your Divine Magic feature determines the appearance of the spectral wings: eagle wings for good or law, bat wings for evil or chaos, and dragonfly wings for neutrality."),
          ],
        },
        18: {
          features: [
            f('unearthlyRecovery', 'Recuperação Sobrenatural', 'Unearthly Recovery',
              "No 18º nível, você ganha a habilidade de superar ferimentos graves. Como uma ação bônus quando tiver menos da metade dos seus pontos de vida restantes, você pode recuperar um número de pontos de vida igual à metade dos seus pontos de vida máximos.\n\nDepois de usar esta característica, você não pode usá-la novamente até terminar um descanso longo.",
              "At 18th level, you gain the ability to overcome grievous injuries. As a bonus action when you have fewer than half of your hit points remaining, you can regain a number of hit points equal to half your hit point maximum.\n\nOnce you use this feature, you can’t use it again until you finish a long rest."),
          ],
        },
      },
    },

    shadow: {
      name: b('Magia das Sombras', 'Shadow Magic'),
      source: 'XGE',
      desc: b('Sua magia vem da Umbra, o plano das sombras.', 'Your magic comes from the Shadowfell.'),
      levels: {
        3: {
          features: [
            f('eyesOfTheDark', 'Olhos da Escuridão', 'Eyes of the Dark',
              "A partir do 1º nível, você tem visão no escuro com alcance de 36 metros. Quando você alcança o 3º nível nesta classe, aprende a magia escuridão, que não conta no número de magias de feiticeiro conhecidas. Além disso, você pode conjurá-la gastando 2 pontos de feitiçaria ou gastando um espaço de magia. Se conjurá-la com pontos de feitiçaria, você pode ver através da escuridão criada pela magia.",
              "Starting at 1st level, you have darkvision with a range of 120 feet. When you reach 3rd level in this class, you learn the darkness spell, which doesn’t count against your number of sorcerer spells known. In addition, you can cast it by spending 2 sorcery points or by expending a spell slot. If you cast it with sorcery points, you can see through the darkness created by the spell."),
            f('strengthOfTheGrave', 'Força da Sepultura', 'Strength of the Grave',
              "A partir do 1º nível, sua existência em um estado de penumbra entre a vida e a morte torna difícil derrotá-lo. Quando o dano reduz você a 0 pontos de vida, você pode fazer uma salvaguarda de Carisma (CD 5 + o dano sofrido). Em caso de sucesso, em vez disso você cai para 1 ponto de vida. Você não pode usar esta característica se for reduzido a 0 pontos de vida por dano radiante ou por um acerto crítico.\n\nApós o sucesso na salvaguarda, você não pode usar esta característica novamente até terminar um descanso longo.",
              "Starting at 1st level, your existence in a twilight state between life and death makes you difficult to defeat. When damage reduces you to 0 hit points, you can make a Charisma saving throw (DC 5 + the damage taken). On a success, you instead drop to 1 hit point. You can’t use this feature if you are reduced to 0 hit points by radiant damage or by a critical hit.\n\nAfter the saving throw succeeds, you can’t use this feature again until you finish a long rest."),
          ],
          autoSpells: ['darkness'],
        },
        6: {
          features: [
            f('houndOfIllOmen', 'Cão do Mau Agouro', 'Hound of Ill Omen',
              "No 6º nível, você ganha a habilidade de convocar uma criatura uivante da escuridão para atormentar seus inimigos. Como uma ação bônus, você pode gastar 3 pontos de feitiçaria para invocar magicamente um cão de mau agouro para ter como alvo uma criatura que você possa ver a até 36 metros de você. O cão usa as estatísticas do lobo atroz (consulte o Manual dos Monstros ou o apêndice C do Livro do Jogador), com as seguintes alterações: o cão é de tamanho Médio, não Grande, e conta como uma monstruosidade, não uma besta.\n\n• Ele surge com um número de pontos de vida temporários igual à metade do seu nível de feiticeiro.\n\n• Ele pode se mover através de outras criaturas e objetos como se fossem terreno difícil. O cão sofre 5 de dano de energia se terminar o turno dele dentro de um objeto.\n\n• No início do turno dele, o cão sabe automaticamente a localização do alvo dele. Se o alvo estava escondido, ele não está mais escondido do cão.\n\nnível de feiticeiro.\n\nO cão surge em um espaço desocupado à sua escolha a até 9 metros do alvo. Role iniciativa para o cão. No turno dele, ele só pode se mover em direção ao alvo pela rota mais direta, e só pode usar sua ação para atacar o alvo. O cão pode fazer ataques de oportunidade, mas apenas contra o alvo dele. Além disso, enquanto o cão estiver a até 1,5 metro do alvo, o alvo tem desvantagem em salvaguardas contra qualquer magia que você conjurar. O cão desaparece se for reduzido a 0 pontos de vida, se o alvo for reduzido a 0 pontos de vida ou após 5 minutos.",
              "At 6th level, you gain the ability to call forth a howling creature of darkness to harass your foes. As a bonus action, you can spend 3 sorcery points to magically summon a hound of ill omen to target one creature you can see within 120 feet of you. The hound uses the dire wolf’s statistics (see the Monster Manual or appendix C in the Player’s Handbook), with the following changes: The hound is size Medium, not Large, and it counts as a monstrosity, not a beast.\n\n• It appears with a number of temporary hit points equal to half your sorcerer level.\n\n• It can move through other creatures and objects as if they were difficult terrain. The hound takes 5 force damage if it ends its turn inside an object.\n\n• At the start of its turn, the hound automatically knows its target's location. If the target was hidden, it is no longer hidden from the hound.\n\norcerer level.\n\nThe hound appears in an unoccupied space of your choice within 30 feet of the target. Roll initiative for the hound. On its turn, it can move only toward its target by the most direct route, and it can use its action only to attack its target. The hound can make opportunity attacks, but only against its target. Additionally, while the hound is within 5 feet of the target, the target has disadvantage on saving throws against any spell you cast. The hound disappears if it is reduced to 0 hit points, if its target is reduced to 0 hit points, or after 5 minutes."),
          ],
        },
        14: {
          features: [
            f('shadowWalk', 'Passo Sombrio', 'Shadow Walk',
              "No 14º nível, você ganha a habilidade de passar de uma sombra para outra. Quando você estiver na penumbra ou na escuridão, como uma ação bônus, você pode se teletransportar magicamente a até 36 metros para um espaço desocupado que você possa ver que também esteja na penumbra ou na escuridão.",
              "At 14th level, you gain the ability to step from one shadow into another. When you are in dim light or darkness, as a bonus action, you can magically teleport up to 120 feet to an unoccupied space you can see that is also in dim light or darkness."),
          ],
        },
        18: {
          features: [
            f('umbralForm', 'Forma Umbral', 'Umbral Form',
              'Ação Bônus e 6 pontos de feitiçaria: vire sombra por 1 minuto. Você tem Resistência a todo dano, exceto Energia e Radiante, e atravessa criaturas e objetos como terreno difícil (sofre 5 de dano de Energia se terminar o turno dentro de um objeto).',
              'Bonus Action and 6 Sorcery Points: become shadow for 1 minute. You have Resistance to all damage except Force and Radiant, and you can move through creatures and objects as difficult terrain (taking 5 Force damage if you end your turn inside an object).'),
          ],
        },
      },
    },

    storm: {
      name: b('Feitiçaria da Tempestade', 'Storm Sorcery'),
      source: 'SCAG',
      desc: b('Sua magia vem do Plano Elemental do Ar e da fúria das tempestades.', 'Your magic comes from elemental air and the fury of storms.'),
      levels: {
        3: {
          features: [
            f('windSpeaker', 'Voz do Vento', 'Wind Speaker',
              "A magia arcana que você comanda é infundida com ar elemental. Você pode falar, ler e escrever Primordial. (Conhecer este idioma permite que você compreenda e seja compreendido por aqueles que falam seus dialetos: Aquan, Auran, Ignan e Terran.)",
              "The arcane magic you command is infused with elemental air. You can speak, read, and write Primordial. (Knowing this language allows you to understand and be understood by those who speak its dialects: Aquan, Auran, Ignan, and Terran.)"),
            f('tempestuousMagic', 'Magia Tempestuosa', 'Tempestuous Magic',
              "A partir do 1º nível, você pode usar uma ação bônus no seu turno para fazer com que rajadas rodopiantes de ar elemental envolvam você brevemente, imediatamente antes ou depois de conjurar uma magia de 1º círculo ou superior. Fazer isso permite que você voe até 3 metros sem provocar ataques de oportunidade.",
              "Starting at 1st level, you can use a bonus action on your turn to cause whirling gusts of elemental air to briefly surround you, immediately before or after you cast a spell of 1st level or higher. Doing so allows you to fly up to 10 feet without provoking opportunity attacks."),
          ],
          grants: { languages: ['Primordial'] },
        },
        6: {
          features: [
            f('heartOfTheStorm', 'Coração da Tempestade', 'Heart of the Storm',
              "No 6º nível, você ganha resistência a dano elétrico e trovejante. Além disso, sempre que começar a conjurar uma magia de 1º círculo ou superior que cause dano elétrico ou trovejante, uma magia tempestuosa irrompe de você. Essa erupção faz com que criaturas à sua escolha que você possa ver a até 3 metros de você sofram dano elétrico ou trovejante (escolha a cada vez que esta habilidade for ativada) igual à metade do seu nível de feiticeiro.",
              "At 6th level, you gain resistance to lightning and thunder damage. In addition, whenever you start casting a spell of 1st level or higher that deals lightning or thunder damage, stormy magic erupts from you. This eruption causes creatures of your choice that you can see within 10 feet of you to take lightning or thunder damage (choose each time this ability activates) equal to half your sorcerer level."),
            f('stormGuide', 'Guia da Tempestade', 'Storm Guide',
              "No 6º nível, você adquire a habilidade de controlar sutilmente o clima ao seu redor.\n\nSe estiver chovendo, você pode usar uma ação para fazer a chuva parar de cair em uma esfera de 6 metros de raio centrada em você. Você pode encerrar este efeito como uma ação bônus.\n\nSe estiver ventando, você pode usar uma ação bônus a cada rodada para escolher a direção em que o vento sopra em uma esfera de 30 metros de raio centrada em você. O vento sopra nessa direção até o final do seu próximo turno. Esta característica não altera a velocidade do vento.",
              "At 6th level, you gain the ability to subtly control the weather around you.\n\nIf it is raining, you can use an action to cause the rain to stop falling in a 20-foot-radius sphere centered on you. You can end this effect as a bonus action.\n\nIf it is windy, you can use a bonus action each round to choose the direction that the wind blows in a 100-foot-radius sphere centered on you. The wind blows in that direction until the end of your next turn. This feature doesn't alter the speed of the wind."),
          ],
        },
        14: {
          features: [
            f('stormsFury', 'Fúria da Tempestade', 'Storm\'s Fury',
              "A partir do 14º nível, quando você for atingido por um ataque corpo a corpo, você pode usar sua reação para causar dano elétrico ao atacante. O dano é igual ao seu nível de feiticeiro. O atacante também deve fazer uma salvaguarda de Força contra a CD de salvaguarda da sua magia de feiticeiro. Se falhar na salvaguarda, o atacante é empurrado em linha reta a até 6 metros de distância de você.",
              "Starting at 14th level, when you are hit by a melee attack, you can use your reaction to deal lightning damage to the attacker. The damage equals your sorcerer level. The attacker must also make a Strength saving throw against your sorcerer spell save DC. On a failed save, the attacker is pushed in a straight line up to 20 feet away from you."),
          ],
        },
        18: {
          features: [
            f('windSoul', 'Alma do Vento', 'Wind Soul',
              "No 18º nível, você ganha imunidade a dano elétrico e trovejante.\n\nVocê também ganha um deslocamento de voo mágico de 18 metros. Como uma ação, você pode reduzir seu deslocamento de voo para 9 metros por 1 hora e escolher um número de criaturas a até 9 metros de você igual a 3 + seu modificador de Carisma. As criaturas escolhidas ganham um deslocamento de voo mágico de 9 metros por 1 hora. Depois de reduzir seu deslocamento de voo dessa forma, você não pode fazê-lo novamente até terminar um descanso curto ou longo.",
              "At 18th level, you gain immunity to lightning and thunder damage.\n\nYou also gain a magical flying speed of 60 feet. As an action, you can reduce your flying speed to 30 feet for 1 hour and choose a number of creatures within 30 feet of you equal to 3 + your Charisma modifier. The chosen creatures gain a magical flying speed of 30 feet for 1 hour. Once you reduce your flying speed in this way, you can't do so again until you finish a short or long rest."),
          ],
        },
      },
    },

    lunar: {
      name: b('Feitiçaria Lunar', 'Lunar Sorcery'),
      source: 'DSDQ',
      desc: b('Sua magia segue as fases da lua (em Krynn, as três luas).', 'Your magic follows the phases of the moon (on Krynn, its three moons).'),
      levels: {
        3: {
          features: [
            f('lunarEmbodiment', 'Encarnação Lunar', 'Lunar Embodiment',
              'Você tem sempre preparadas as magias lunares das três fases (não contam no limite): Cheia — Escudo, Restauração Menor, Dissipar Magia, Proteção contra a Morte, Vínculo Telepático; Nova — Raio Nauseante, Cegueira/Surdez, Toque Vampírico, Confusão, Imobilizar Monstro; Crescente — Spray de Cores, Alterar-se, Corcel Fantasma, Terreno Alucinatório, Despistar. A cada Descanso Longo, escolha a fase ativa (Cheia, Nova ou Crescente) e conjure uma magia de nível 1 dessa fase sem gastar espaço, 1 vez por Descanso Longo.',
              'You always have the lunar spells of all three phases prepared (they don\'t count against your limit): Full — Shield, Lesser Restoration, Dispel Magic, Death Ward, Telepathic Bond; New — Ray of Sickness, Blindness/Deafness, Vampiric Touch, Confusion, Hold Monster; Crescent — Color Spray, Alter Self, Phantom Steed, Hallucinatory Terrain, Mislead. On each Long Rest, choose your active phase (Full, New, or Crescent) and cast that phase\'s level 1 spell once without a slot per Long Rest.'),
            f('moonFire', 'Fogo Lunar', 'Moon Fire',
              "Característica de Feitiçaria Lunar de 1º Nível\n\nVocê pode invocar a luz radiante da lua sob comando. Você aprende a magia chama sagrada, que não conta no número de truques de feiticeiro que você conhece. Quando você conjura a magia, pode ter como alvo uma criatura normalmente ou ter como alvo duas criaturas dentro do alcance que estejam a até 1,5 metro uma da outra.",
              "1st-Level Lunar Sorcery Feature\n\nYou can call down the radiant light of the moon on command. You learn the sacred flame spell, which doesn’t count against the number of sorcerer cantrips you know. When you cast the spell, you can target one creature as normal or target two creatures within range that are within 5 feet of each other."),
          ],
          autoSpells: ['shield', 'rayOfSickness', 'colorSpray', 'lesserRestoration', 'blindnessDeafness', 'alterSelf'],
          autoCantrips: ['sacredFlame'],
        },
        5: { autoSpells: ['dispelMagic', 'vampiricTouch', 'phantomSteed'] },
        6: {
          features: [
            f('lunarBoons', 'Dádivas Lunares', 'Lunar Boons',
              'Ao usar Metamagia numa magia das escolas da fase ativa, o custo cai 1 ponto de feitiçaria (mínimo 0). Cheia: Abjuração e Adivinhação; Nova: Encantamento e Necromancia; Crescente: Ilusão e Transmutação. Usos iguais ao bônus de proficiência por Descanso Longo.',
              'When you use Metamagic on a spell of the active phase\'s schools, it costs 1 fewer Sorcery Point (minimum 0). Full: Abjuration and Divination; New: Enchantment and Necromancy; Crescent: Illusion and Transmutation. Uses equal to your Proficiency Bonus per Long Rest.'),
            f('waxingAndWaning', 'Crescer e Minguar', 'Waxing and Waning',
              "Característica de 6º nível da Feitiçaria Lunar\n\nVocê adquire maior controle sobre as fases de sua magia lunar. Com uma ação bônus, você pode gastar 1 ponto de feitiçaria para alterar sua fase atual de Encarnação Lunar para uma diferente.\n\nAgora você pode conjurar uma magia de 1º círculo de cada fase lunar da tabela Magias Lunares uma vez sem gastar um espaço de magia, desde que sua fase atual seja a mesma da magia da fase lunar. Uma vez que conjure uma magia de fase lunar dessa forma, não poderá fazê-lo novamente até terminar um descanso longo.",
              "6th-Level Lunar Sorcery Feature\n\nYou gain greater control over the phases of your lunar magic. As a bonus action, you can spend 1 sorcery point to change your current Lunar Embodiment phase for a different one.\n\nYou can now cast one 1st-level spell from each lunar phase of the Lunar Spells table once without expending a spell slot, provided your current phase is the same as the lunar phase spell. Once you cast a lunar phase spell in this way, you can't do so again until you finish a long rest."),
          ],
        },
        7: { autoSpells: ['deathWard', 'confusion', 'hallucinatoryTerrain'] },
        9: { autoSpells: ['telepathicBond', 'holdMonster', 'mislead'] },
        14: {
          features: [
            f('lunarEmpowerment', 'Fortalecimento Lunar', 'Lunar Empowerment',
              "Característica de Feitiçaria Lunar de 14º Nível\n\nO poder de uma fase lunar satura seu ser. Enquanto você estiver em uma fase de Manifestação Lunar, você também ganha o seguinte benefício associado àquela fase:\n\n• Lua Cheia. Você pode usar uma ação bônus para emitir luz plena em um raio de 3 metros e penumbra por mais 3 metros adicionais ou para apagar a luz. Além disso, você e criaturas à sua escolha têm vantagem em testes de Inteligência (Investigação) e Sabedoria (Percepção) enquanto estiverem dentro da luz plena emitida por você.\n\n• Lua Nova. Você tem vantagem em testes de Destreza (Furtividade). Além disso, enquanto estiver totalmente na escuridão, jogadas de ataque contra você têm desvantagem.\n\n• Quarto Crescente. Você tem resistência a dano necrótico e radiante.",
              "14th-Level Lunar Sorcery Feature\n\nThe power of a lunar phase saturates your being. While you are in a Lunar Embodiment phase, you also gain the following benefit associated with that phase:\n\n• Full Moon. You can use a bonus action to shed bright light in a 10-foot radius and dim light for an additional 10 feet or to douse the light. In addition, you and creatures of your choice have advantage on Intelligence (Investigation) and Wisdom (Perception) checks while within the bright light you shed.\n\n• New Moon. You have advantage on Dexterity (Stealth) checks. In addition, while you are entirely in darkness, attack rolls have disadvantage against you.\n\n• Crescent Moon. You have resistance to necrotic and radiant damage."),
          ],
        },
        18: {
          features: [
            f('lunarPhenomenon', 'Fenômeno Lunar', 'Lunar Phenomenon',
              "Característica de Feitiçaria Lunar de 18º Nível\n\nComo uma ação bônus, você pode acessar um poder especial da sua fase atual de Manifestação Lunar. Como alternativa, como parte da ação bônus que você realiza para mudar sua fase lunar usando sua característica Crescente e Minguante, você pode usar imediatamente o poder da fase lunar na qual está entrando:\n\n• Lua Cheia. Você irradia a luz da lua por um instante. Cada criatura à sua escolha a até 9 metros de você deve ser bem-sucedida em uma salvaguarda de Constituição contra a CD da sua magia ou ficará cega até o final do próximo turno dela. Além disso, uma criatura à sua escolha naquela área recupera 3d8 pontos de vida.\n\n• Lua Nova. Você emana penumbra momentaneamente. Cada criatura à sua escolha a até 9 metros de você deve ser bem-sucedida em uma salvaguarda de Destreza contra a CD da sua magia ou sofrerá 3d10 de dano necrótico e terá seu deslocamento reduzido a 0 até o final do próximo turno dela. Além disso, você fica invisível até o final do seu próximo turno, ou até fazer um ataque ou conjurar uma magia.\ntariamente emana penumbra. Cada criatura à sua escolha a até 9 metros de você deve ser bem-sucedida em uma salvaguarda de Destreza contra a CD da sua magia ou sofrerá 3d10 de dano necrótico e terá seu deslocamento reduzido a 0 até o final do próximo turno dela. Além disso, você fica invisível até o final do seu próximo turno, ou até fazer um ataque ou conjurar uma magia.\n\n• Quarto Crescente. Você pode se teletransportar magicamente para um espaço desocupado que você possa ver a até 18 metros de você. Você pode levar junto uma criatura voluntária que possa ver a até 1,5 metro de você. Essa criatura se teletransporta para um espaço desocupado à sua escolha que você possa ver a até 1,5 metro do seu espaço de destino. Além disso, você e essa criatura ganham resistência a todo dano até o início do seu próximo turno.\n\nDepois de usar um desses benefícios de ação bônus, você não pode usar aquele benefício novamente até terminar um descanso longo, a menos que gaste 5 pontos de feitiçaria para usá-lo novamente.",
              "18th-Level Lunar Sorcery Feature\n\nAs a bonus action, you can tap into a special power of your current Lunar Embodiment phase. Alternatively, as part of the bonus action you take to change your lunar phase using your Waxing and Waning feature, you can immediately use the power of the lunar phase you are entering:\n\n• Full Moon. You radiate moonlight for a moment. Each creature of your choice within 30 feet of you must succeed on a Constitution saving throw against your spell save DC or be blinded until the end of its next turn. In addition, one creature of your choice in that area regains 3d8 hit points.\n\n• New Moon. You momentarily emanate gloom. Each creature of your choice within 30 feet of you must succeed on a Dexterity saving throw against your spell save DC or take 3d10 necrotic damage and have its speed reduced to 0 until the end of its next turn. In addition, you become invisible until the end of your next turn, or until you make an attack or cast a spell.\n\n• Crescent Moon. You can magically teleport to an unoccupied space you can see within 60 feet of yourself. You can bring along one willing creature you can see within 5 feet of yourself. That creature teleports to an unoccupied space of your choice that you can see within 5 feet of your destination space. In addition, you and that creature gain resistance to all damage until the start of your next turn.\n\nOnce you use one of these bonus action benefits, you can’t use that benefit again until you finish a long rest, unless you spend 5 sorcery points to use it again."),
          ],
        },
      },
    },

    // Unearthed Arcana (playtest, já escrito para 2024): versão revisada do
    // Villainous Options Update (18/jun/2026). Resumo original; as tabelas de
    // efeitos do Abismo ficam no documento do UA.
    demonic: {
      name: b('Feitiçaria Demoníaca — UA', 'Demonic Sorcery — UA'),
      source: 'UA26VOU',
      desc: b('Playtest: sua magia vem do Abismo (pacto, linhagem ou contato com demônios), e você abre fendas para o caos abissal.',
        'Playtest: your magic comes from the Abyss (a bargain, a bloodline, or contact with demons), and you tear rifts into its chaos.'),
      levels: {
        3: {
          features: [
            f('demonicSpells', 'Magias Demoníacas', 'Demonic Spells',
              'Magias sempre preparadas (não contam no limite): nível 3 — Perdição, Sussurros Dissonantes, Crescimento de Espinhos, Teia; 5 — Lançar Maldição, Dissipar Magia; 7 — Inseto Gigante, Terreno Alucinatório; 9 — Contatar Outro Plano, Modificar Memória.',
              'Always prepared (they don\'t count against your limit): level 3 — Bane, Dissonant Whispers, Spike Growth, Web; 5 — Bestow Curse, Dispel Magic; 7 — Giant Insect, Hallucinatory Terrain; 9 — Contact Other Plane, Modify Memory.'),
            f('abyssalRupture', 'Fenda Abissal', 'Abyssal Rupture',
              "Ao usar Feitiçaria Inata, você abre uma fenda para o Abismo que preenche uma esfera de 3 m de raio num ponto que você vê a até 9 m; ela dura enquanto a Feitiçaria Inata durar e pode ser movida a cada turno. Enquanto isso, como Ação Bônus, escolha um efeito: Chicote Demoníaco (ataque mágico corpo a corpo contra uma criatura a até 1,5 m da fenda: 1d8 de dano Cortante, e um alvo Grande ou menor pode ser puxado até 3 m / 3 m para o centro) ou Gritos Aterradores (cada criatura na fenda faz salvaguarda de Sabedoria contra sua CD ou sofre 1d4 de dano Psíquico).",
              'When you use Innate Sorcery, you tear a rift into the Abyss that fills a 10-foot-radius sphere at a point you can see within 30 feet; it lasts as long as Innate Sorcery and can be moved each turn. Meanwhile, as a Bonus Action, choose an effect: Demonic Lash (melee spell attack against a creature within 5 feet of the rift: 1d8 Slashing damage, and a Large or smaller target can be pulled up to 10 feet toward its center) or Terrifying Screams (each creature in the rift makes a Wisdom save against your DC or takes 1d4 Psychic damage).'),
          ],
          autoSpells: ['bane', 'dissonantWhispers', 'spikeGrowth', 'web'],
        },
        5: { autoSpells: ['bestowCurse', 'dispelMagic'] },
        6: {
          features: [
            f('abyssalRealm', 'Reino Abissal', 'Abyssal Realm',
              "Quando gastar pelo menos 1 ponto de feitiçaria como parte de uma ação de Magia ou Ação Bônus no seu turno, você pode atrair a influência de uma camada do Abismo: escolha um efeito da tabela da subclasse e aplique-o numa emanação de 3 m em volta de você ou dentro da sua Fenda Abissal.",
              'When you spend at least 1 Sorcery Point as part of a Magic action or Bonus Action on your turn, you can draw on a layer of the Abyss: choose an effect from the subclass table and apply it in a 10-foot emanation around you or inside your Abyssal Rupture.'),
          ],
        },
        7: { autoSpells: ['giantInsect', 'hallucinatoryTerrain'] },
        9: { autoSpells: ['contactOtherPlane', 'modifyMemory'] },
        14: {
          features: [
            f('abyssalConduit', 'Conduto Abissal', 'Abyssal Conduit',
              'Você tem Invocar Corruptor sempre preparada. Pode conjurá-la sem Concentração; assim, ela dura 1 minuto e o corruptor tem de ser um Demônio. O corruptor invocado tem Vantagem nas jogadas de ataque enquanto estiver dentro da sua Fenda Abissal.',
              'You always have Summon Fiend prepared. You can cast it without Concentration; if you do, it lasts 1 minute and the fiend must be a Demon. Your summoned fiend has Advantage on attack rolls while inside your Abyssal Rupture.'),
          ],
          autoSpells: ['summonFiend'],
        },
        18: {
          features: [
            f('abyssalExplosion', 'Explosão Abissal', 'Abyssal Explosion',
              "Ação de Magia: uma explosão de energia abissal preenche uma esfera de 9 m de raio. Cada criatura na área faz salvaguarda de Constituição contra sua CD; se falhar, uma criatura que não seja Corruptor sofre 8d6 de dano de Energia e fica Incapacitada até o início do seu próximo turno. Uma vez por Descanso Longo, ou gaste 7 pontos de feitiçaria para recuperar o uso.",
              'Magic action: an explosion of Abyssal energy fills a 30-foot-radius sphere. Each creature there makes a Constitution save against your DC; on a failure, a creature that isn\'t a Fiend takes 8d6 Force damage and is Incapacitated until the start of your next turn. Once per Long Rest, or spend 7 Sorcery Points to restore the use.'),
          ],
        },
      },
    },
  },
};

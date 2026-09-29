// Feiticeiro — Metamagia, traços da classe base 2024 e subclasses.
// Classe base, Metamagia 2024 e Feitiçaria Dracônica: SRD 5.2.1 (CC-BY 4.0).
// Metamagia 2014 (PHB): SRD 5.1 (CC-BY 4.0); Buscadora/Transmutada 2014 (TCE): resumo original.
// Demais subclasses (PHB24, XGE, SCAG/XGE, TCE, DSDQ): resumos ORIGINAIS, só fatos de regra.
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
    desc: b('Custo: 1 ponto de feitiçaria. Dobra o alcance de uma magia com alcance de pelo menos 1,5 m (5 pés), ou transforma o alcance de Toque em 9 m (30 pés).',
      'Cost: 1 Sorcery Point. Double the range of a spell with a range of at least 5 feet, or make a Touch spell\'s range 30 feet.') },
  { id: 'empoweredSpell', name: b('Magia Potencializada', 'Empowered Spell'), source: 'SRD',
    desc: b('Custo: 1 ponto de feitiçaria. Ao rolar o dano de uma magia, role de novo até o seu modificador de Carisma em dados de dano (mínimo 1) e use os novos resultados. Pode ser usada mesmo que outra Metamagia já tenha sido aplicada à magia.',
      'Cost: 1 Sorcery Point. When you roll damage for a spell, reroll up to your Charisma modifier of the damage dice (minimum 1); you must use the new rolls. You can use it even if you already used a different Metamagic option on the spell.') },
  { id: 'extendedSpell', name: b('Magia Estendida', 'Extended Spell'), source: 'SRD', rules: '2024',
    desc: b('Custo: 1 ponto de feitiçaria. Dobra a duração de uma magia com duração de 1 minuto ou mais, até o máximo de 24 horas. Se a magia exigir Concentração, você tem Vantagem nas salvaguardas para mantê-la.',
      'Cost: 1 Sorcery Point. Double the duration of a spell with a duration of 1 minute or longer, to a maximum of 24 hours. If the spell requires Concentration, you have Advantage on saving throws to maintain it.') },
  { id: 'extendedSpell2014', name: b('Magia Estendida', 'Extended Spell'), source: 'SRD', rules: '2014',
    desc: b('Custo: 1 ponto de feitiçaria. Dobra a duração de uma magia com duração de 1 minuto ou mais, até o máximo de 24 horas.',
      'Cost: 1 sorcery point. Double the duration of a spell with a duration of 1 minute or longer, to a maximum of 24 hours.') },
  { id: 'heightenedSpell', name: b('Magia Elevada', 'Heightened Spell'), source: 'SRD', rules: '2024',
    desc: b('Custo: 2 pontos de feitiçaria. Ao conjurar uma magia que force uma criatura a fazer salvaguarda, um alvo da magia tem Desvantagem nas salvaguardas contra ela.',
      'Cost: 2 Sorcery Points. When you cast a spell that forces a creature to make a saving throw, give one target of the spell Disadvantage on saves against the spell.') },
  { id: 'heightenedSpell2014', name: b('Magia Elevada', 'Heightened Spell'), source: 'SRD', rules: '2014',
    desc: b('Custo: 3 pontos de feitiçaria. Ao conjurar uma magia que force uma criatura a fazer salvaguarda, um alvo tem desvantagem na primeira salvaguarda contra ela.',
      'Cost: 3 sorcery points. When you cast a spell that forces a creature to make a saving throw, one target has disadvantage on its first saving throw against the spell.') },
  { id: 'quickenedSpell', name: b('Magia Acelerada', 'Quickened Spell'), source: 'SRD', rules: '2024',
    desc: b('Custo: 2 pontos de feitiçaria. Uma magia com tempo de conjuração de uma ação passa a ser conjurada com uma Ação Bônus. Não pode ser usada se você já conjurou uma magia de nível 1+ neste turno, e depois dela você não pode conjurar outra magia de nível 1+ neste turno.',
      'Cost: 2 Sorcery Points. A spell with a casting time of an action is cast as a Bonus Action instead. You can\'t use it if you already cast a level 1+ spell this turn, and you can\'t cast a level 1+ spell later this turn after using it.') },
  { id: 'quickenedSpell2014', name: b('Magia Acelerada', 'Quickened Spell'), source: 'SRD', rules: '2014',
    desc: b('Custo: 2 pontos de feitiçaria. Uma magia com tempo de conjuração de 1 ação passa a ser conjurada com uma ação bônus.',
      'Cost: 2 sorcery points. A spell with a casting time of 1 action is cast as a bonus action instead.') },
  { id: 'seekingSpell', name: b('Magia Buscadora', 'Seeking Spell'), source: 'SRD', rules: '2024',
    desc: b('Custo: 1 ponto de feitiçaria. Se errar a jogada de ataque de uma magia, role o d20 de novo e use o novo resultado. Pode ser usada mesmo que outra Metamagia já tenha sido aplicada à magia.',
      'Cost: 1 Sorcery Point. If you make an attack roll for a spell and miss, reroll the d20 and use the new roll. You can use it even if you already used a different Metamagic option on the spell.') },
  { id: 'seekingSpell2014', name: b('Magia Buscadora', 'Seeking Spell'), source: 'TCE', rules: '2014',
    desc: b('Custo: 2 pontos de feitiçaria. Ao errar a jogada de ataque de uma magia, rola o d20 de novo e fica com o novo resultado. Combina com outra Metamagia na mesma magia.',
      'Cost: 2 sorcery points. When you miss with a spell attack roll, reroll the d20 and keep the new result. It can be combined with another Metamagic option on the same spell.') },
  { id: 'subtleSpell', name: b('Magia Sutil', 'Subtle Spell'), source: 'SRD', rules: '2024',
    desc: b('Custo: 1 ponto de feitiçaria. Conjura a magia sem componentes Verbais, Somáticos ou Materiais, exceto componentes Materiais consumidos pela magia ou com custo especificado.',
      'Cost: 1 Sorcery Point. Cast the spell without any Verbal, Somatic, or Material components, except Material components that are consumed by the spell or have a specified cost.') },
  { id: 'subtleSpell2014', name: b('Magia Sutil', 'Subtle Spell'), source: 'SRD', rules: '2014',
    desc: b('Custo: 1 ponto de feitiçaria. Conjura a magia sem componentes verbais ou somáticos.',
      'Cost: 1 sorcery point. Cast the spell without any somatic or verbal components.') },
  { id: 'transmutedSpell', name: b('Magia Transmutada', 'Transmuted Spell'), source: 'SRD',
    desc: b('Custo: 1 ponto de feitiçaria. Troca um tipo de dano da magia por outro desta lista: ácido, elétrico, fogo, frio, trovão ou veneno.',
      'Cost: 1 Sorcery Point. Change a damage type the spell deals to another from this list: Acid, Cold, Fire, Lightning, Poison, Thunder.') },
  { id: 'twinnedSpell', name: b('Magia Gêmea', 'Twinned Spell'), source: 'SRD', rules: '2024',
    desc: b('Custo: 1 ponto de feitiçaria. Numa magia que ganha um alvo adicional quando conjurada em nível maior (como Enfeitiçar Pessoa), aumenta em 1 o nível efetivo da magia.',
      'Cost: 1 Sorcery Point. For a spell, such as Charm Person, that can target an additional creature when cast with a higher-level slot, increase the spell\'s effective level by 1.') },
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
        'Escolha uma subclasse de feiticeiro. Ela concede traços nos níveis 3, 6, 14 e 18 de feiticeiro.',
        'Choose a Sorcerer subclass. It grants features at Sorcerer levels 3, 6, 14, and 18.'),
    ],
    4: [
      f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement',
        'Ganhe o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique. Este traço se repete nos níveis 8, 12 e 16.',
        'Gain the Ability Score Improvement feat or another feat for which you qualify. You gain this feature again at levels 8, 12, and 16.'),
    ],
    5: [
      f('sorcerousRestoration', 'Restauração Feiticeira', 'Sorcerous Restoration',
        'Ao terminar um Descanso Curto, recupere pontos de feitiçaria gastos até metade do seu nível de feiticeiro (arredondado para baixo). 1 uso por Descanso Longo.',
        'When you finish a Short Rest, regain expended Sorcery Points up to half your Sorcerer level (round down). Once per Long Rest.'),
    ],
    7: [
      f('sorceryIncarnate', 'Feitiçaria Encarnada', 'Sorcery Incarnate',
        'Sem usos de Feitiçaria Inata, você pode ativá-la gastando 2 pontos de feitiçaria na Ação Bônus. Enquanto ela estiver ativa, pode aplicar até duas opções de Metamagia a cada magia.',
        'If you have no uses of Innate Sorcery left, you can activate it by spending 2 Sorcery Points with the Bonus Action. While it is active, you can use up to two Metamagic options on each spell you cast.'),
    ],
    8: [
      f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement',
        'Ganhe o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique.',
        'Gain the Ability Score Improvement feat or another feat for which you qualify.'),
    ],
    10: [
      f('metamagic', 'Metamagia', 'Metamagic',
        'Você aprende mais duas opções de Metamagia (total 4).',
        'You learn two more Metamagic options (4 total).'),
    ],
    12: [
      f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement',
        'Ganhe o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique.',
        'Gain the Ability Score Improvement feat or another feat for which you qualify.'),
    ],
    16: [
      f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement',
        'Ganhe o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique.',
        'Gain the Ability Score Improvement feat or another feat for which you qualify.'),
    ],
    17: [
      f('metamagic', 'Metamagia', 'Metamagic',
        'Você aprende mais duas opções de Metamagia (total 6).',
        'You learn two more Metamagic options (6 total).'),
    ],
    19: [
      f('epicBoon', 'Dádiva Épica', 'Epic Boon',
        'Ganhe um talento de Dádiva Épica ou outro talento para o qual se qualifique. Recomendado: Dádiva da Viagem Dimensional.',
        'Gain an Epic Boon feat or another feat for which you qualify. Boon of Dimensional Travel is recommended.'),
    ],
    20: [
      f('arcaneApotheosis', 'Apoteose Arcana', 'Arcane Apotheosis',
        'Enquanto a Feitiçaria Inata estiver ativa, você pode usar uma opção de Metamagia em cada um dos seus turnos sem gastar pontos de feitiçaria nela.',
        'While your Innate Sorcery is active, you can use one Metamagic option on each of your turns without spending Sorcery Points on it.'),
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
              'Magias sempre preparadas: nível 3 — Alterar-se, Orbe Cromático, Comando, Sopro do Dragão; 5 — Medo, Voo; 7 — Olho Arcano, Enfeitiçar Monstro; 9 — Lenda e Tradição, Invocar Dragão.',
              'Always prepared: level 3 — Alter Self, Chromatic Orb, Command, Dragon\'s Breath; 5 — Fear, Fly; 7 — Arcane Eye, Charm Monster; 9 — Legend Lore, Summon Dragon.'),
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
              'Ação Bônus: asas dracônicas surgem nas suas costas por 1 hora (ou até dispensá-las, sem ação), dando Deslocamento de Voo de 18 m (60 pés). 1 uso por Descanso Longo, ou gaste 3 pontos de feitiçaria (sem ação) para recuperá-lo.',
              'Bonus Action: draconic wings appear on your back for 1 hour (or until you dismiss them, no action required), giving you a Fly Speed of 60 feet. Once per Long Rest, or spend 3 Sorcery Points (no action required) to restore the use.'),
          ],
        },
        18: {
          features: [
            f('dragonCompanion', 'Companheiro Dracônico', 'Dragon Companion',
              'Você conjura Invocar Dragão sem componente Material e pode conjurá-la uma vez sem espaço de magia (recupera no Descanso Longo). Ao conjurá-la, pode dispensar a Concentração; nesse caso a duração passa a ser 1 minuto.',
              'You can cast Summon Dragon without a Material component, and once without a spell slot (regained on a Long Rest). When you cast it, you can make it not require Concentration; the duration then becomes 1 minute.'),
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
              'Uma vez por turno, logo depois de conjurar uma magia de feiticeiro usando um espaço de magia, você pode rolar 1d20. Num 20, role na tabela de Surto de Magia Selvagem e aplique o efeito.',
              'Once per turn, right after you cast a Sorcerer spell with a spell slot, you can roll 1d20. On a 20, roll on the Wild Magic Surge table and apply the effect.'),
            f('tidesOfChaos', 'Marés do Caos', 'Tides of Chaos',
              'Ganhe Vantagem em um Teste de d20 antes de rolar. Depois disso, a próxima magia de feiticeiro que você conjurar com espaço de magia provoca automaticamente uma rolagem na tabela de surtos, e isso devolve o uso; senão, ele volta no Descanso Longo.',
              'Gain Advantage on one D20 Test before you roll. Afterward, the next Sorcerer spell you cast with a spell slot automatically triggers a roll on the surge table, which restores the use; otherwise it returns on a Long Rest.'),
          ],
        },
        6: {
          features: [
            f('bendLuck', 'Distorcer a Sorte', 'Bend Luck',
              'Reação, logo após outra criatura que você vê rolar o d20 de um Teste de d20: gaste 1 ponto de feitiçaria e role 1d4, somando ou subtraindo o resultado (à sua escolha).',
              'Reaction, right after another creature you can see rolls the d20 for a D20 Test: spend 1 Sorcery Point and roll 1d4, adding it to or subtracting it from the roll (your choice).'),
          ],
        },
        14: {
          features: [
            f('controlledChaos', 'Caos Controlado', 'Controlled Chaos',
              'Sempre que rolar na tabela de Surto de Magia Selvagem, role duas vezes e escolha qual resultado usar.',
              'Whenever you roll on the Wild Magic Surge table, roll twice and choose which result to use.'),
          ],
        },
        18: {
          features: [
            f('tamedSurge', 'Surto Domado', 'Tamed Surge',
              'Logo depois de conjurar uma magia de feiticeiro com espaço de magia, você pode escolher um efeito da tabela de surtos em vez de rolar (qualquer um, menos a última linha; rolagens do efeito ainda são feitas). 1 uso por Descanso Longo.',
              'Right after you cast a Sorcerer spell with a spell slot, you can choose an effect from the surge table instead of rolling (any except the last row; rolls within the effect are still made). Once per Long Rest.'),
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
              'Ação Bônus: crie um elo telepático com uma criatura a até 9 m (30 pés). Vocês conversam mentalmente (numa língua que o outro entenda) enquanto estiverem a até um número de milhas igual ao seu modificador de Carisma (mínimo 1). Dura minutos iguais ao seu nível de feiticeiro e termina se você usar o traço com outra criatura.',
              'Bonus Action: form a telepathic link with a creature within 30 feet. You can speak mind to mind (in a language the other understands) while within miles equal to your Charisma modifier (minimum 1). It lasts minutes equal to your Sorcerer level and ends if you use this feature on another creature.'),
          ],
          autoSpells: ['armsOfHadar', 'calmEmotions', 'detectThoughts', 'dissonantWhispers'],
          autoCantrips: ['mindSliver'],
        },
        5: { autoSpells: ['hungerOfHadar', 'sending'] },
        6: {
          features: [
            f('psionicSorcery', 'Feitiçaria Psiônica', 'Psionic Sorcery',
              'Ao conjurar uma Magia Psiônica de nível 1+, você pode pagar com pontos de feitiçaria iguais ao nível da magia em vez de um espaço. Assim, ela não exige componentes Verbais nem Somáticos, nem Materiais (exceto os consumidos ou com custo).',
              'When you cast a level 1+ Psionic Spell, you can pay Sorcery Points equal to its level instead of a spell slot. Cast this way, it needs no Verbal or Somatic components, nor Material ones unless consumed or with a cost.'),
            f('psychicDefenses', 'Defesas Psíquicas', 'Psychic Defenses',
              'Você tem Resistência a dano psíquico e Vantagem nas salvaguardas para evitar ou encerrar as condições Enfeitiçado e Amedrontado.',
              'You have Resistance to Psychic damage and Advantage on saving throws to avoid or end the Charmed or Frightened condition.'),
          ],
        },
        7: { autoSpells: ['blackTentacles', 'summonAberration'] },
        9: { autoSpells: ['telepathicBond', 'telekinesis'] },
        14: {
          features: [
            f('revelationInFlesh', 'Revelação na Carne', 'Revelation in Flesh',
              'Ação Bônus: gaste 1 ou mais pontos de feitiçaria para transformar o corpo por 10 minutos, ganhando um benefício por ponto: ver criaturas invisíveis a até 18 m (60 pés); Deslocamento de Voo igual ao seu e pairar; Deslocamento de Natação igual ao dobro do seu e respirar na água; ou passar por frestas de 2,5 cm e gastar 1,5 m de movimento para escapar de amarras ou de uma agarrada.',
              'Bonus Action: spend 1 or more Sorcery Points to transform your body for 10 minutes, gaining one benefit per point: see Invisible creatures within 60 feet; a Fly Speed equal to your Speed and hover; a Swim Speed of twice your Speed and water breathing; or squeeze through 1-inch gaps and spend 5 feet of movement to escape bonds or a grapple.'),
          ],
        },
        18: {
          features: [
            f('warpingImplosion', 'Implosão Distorcida', 'Warping Implosion',
              'Ação de Magia: teleporte-se até 36 m (120 pés) para um espaço que veja. Cada criatura a até 9 m (30 pés) do ponto de onde saiu faz salvaguarda de Força contra sua CD: se falhar, sofre 3d10 de dano de Energia e é puxada até esse ponto; se passar, sofre metade e não é puxada. 1 uso por Descanso Longo, ou gaste 5 pontos de feitiçaria.',
              'Magic action: teleport up to 120 feet to a space you can see. Each creature within 30 feet of the space you left makes a Strength save against your DC: on a failure it takes 3d10 Force damage and is pulled to that space; on a success, half damage and no pull. Once per Long Rest, or spend 5 Sorcery Points.'),
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
              'Reação, quando uma criatura que você vê a até 18 m (60 pés) for rolar um d20 com Vantagem ou Desvantagem: a rolagem não sofre nenhuma das duas. Usos iguais ao modificador de Carisma (mínimo 1) por Descanso Longo.',
              'Reaction, when a creature you can see within 60 feet is about to roll a d20 with Advantage or Disadvantage: the roll has neither. Uses equal to your Charisma modifier (minimum 1) per Long Rest.'),
          ],
          autoSpells: ['aid', 'alarm', 'lesserRestoration', 'protectionFromEvilAndGood'],
        },
        5: { autoSpells: ['dispelMagic', 'protectionFromEnergy'] },
        6: {
          features: [
            f('bastionOfLaw', 'Bastião da Lei', 'Bastion of Law',
              'Ação de Magia: gaste de 1 a 5 pontos de feitiçaria para envolver você ou uma criatura a até 9 m (30 pés) numa proteção com esse número de d8. Quando a criatura protegida sofrer dano, pode gastar dados da proteção, rolá-los e reduzir o dano pelo total. Dura até você terminar um Descanso Longo ou usar o traço de novo.',
              'Magic action: spend 1 to 5 Sorcery Points to ward yourself or a creature within 30 feet with that many d8s. When the warded creature takes damage, it can expend ward dice, roll them, and reduce the damage by the total. Lasts until you finish a Long Rest or use this feature again.'),
          ],
        },
        7: { autoSpells: ['freedomOfMovement', 'summonConstruct'] },
        9: { autoSpells: ['greaterRestoration', 'wallOfForce'] },
        14: {
          features: [
            f('tranceOfOrder', 'Transe da Ordem', 'Trance of Order',
              'Ação Bônus, por 1 minuto: jogadas de ataque contra você não se beneficiam de Vantagem, e nos seus Testes de d20 um resultado de 9 ou menos no dado conta como 10. 1 uso por Descanso Longo, ou gaste 5 pontos de feitiçaria.',
              'Bonus Action, for 1 minute: attack rolls against you can\'t benefit from Advantage, and on your D20 Tests you can treat a die roll of 9 or lower as a 10. Once per Long Rest, or spend 5 Sorcery Points.'),
          ],
        },
        18: {
          features: [
            f('clockworkCavalcade', 'Cavalgada Mecânica', 'Clockwork Cavalcade',
              'Ação de Magia: espíritos da ordem enchem um Cubo de 9 m (30 pés) a partir de você. Restaure até 100 Pontos de Vida divididos entre criaturas à sua escolha no cubo, conserte objetos danificados inteiramente dentro dele e encerre magias de nível 6 ou menor em criaturas e objetos à sua escolha nele. 1 uso por Descanso Longo, ou gaste 7 pontos de feitiçaria.',
              'Magic action: spirits of order fill a 30-foot Cube originating from you. Restore up to 100 Hit Points divided among creatures of your choice in it, repair damaged objects entirely inside it, and end spells of level 6 or lower on creatures and objects of your choice in it. Once per Long Rest, or spend 7 Sorcery Points.'),
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
              'Ao falhar numa salvaguarda ou errar uma jogada de ataque, role 2d4 e some ao resultado, podendo mudar o desfecho. 1 uso por Descanso Curto ou Longo.',
              'When you fail a saving throw or miss with an attack roll, roll 2d4 and add it to the total, possibly changing the outcome. Once per Short or Long Rest.'),
          ],
        },
        6: {
          features: [
            f('empoweredHealing', 'Cura Potencializada', 'Empowered Healing',
              'Quando você ou um aliado a até 1,5 m (5 pés) rolar dados para restaurar Pontos de Vida com uma magia, gaste 1 ponto de feitiçaria para rolar de novo quantos desses dados quiser, uma vez, usando os novos resultados. 1 vez por turno.',
              'When you or an ally within 5 feet rolls dice to restore Hit Points with a spell, spend 1 Sorcery Point to reroll any number of those dice once, using the new rolls. Once per turn.'),
          ],
        },
        14: {
          features: [
            f('otherworldlyWings', 'Asas Sobrenaturais', 'Otherworldly Wings',
              'Ação Bônus: asas espectrais surgem nas suas costas até você dispensá-las, dando Deslocamento de Voo de 9 m (30 pés). A aparência segue a afinidade: águia (Bem/Ordem), morcego (Mal/Caos) ou libélula (Neutralidade). Não funciona com armadura que não acomode as asas.',
              'Bonus Action: spectral wings sprout from your back until you dismiss them, giving a Fly Speed of 30 feet. Their look follows your affinity: eagle (Good/Law), bat (Evil/Chaos), or dragonfly (Neutrality). Not usable with armor that doesn\'t accommodate them.'),
          ],
        },
        18: {
          features: [
            f('unearthlyRecovery', 'Recuperação Sobrenatural', 'Unearthly Recovery',
              'Ação Bônus, com menos da metade dos Pontos de Vida: recupere Pontos de Vida iguais à metade do seu máximo. 1 uso por Descanso Longo.',
              'Bonus Action while below half your Hit Points: regain Hit Points equal to half your maximum. Once per Long Rest.'),
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
              'Visão no Escuro de 36 m (120 pés). Escuridão fica sempre preparada; além do espaço normal, pode conjurá-la gastando 2 pontos de feitiçaria e, assim, enxerga através dela.',
              'Darkvision out to 120 feet. Darkness is always prepared; besides a slot, you can cast it by spending 2 Sorcery Points, and then you can see through it.'),
            f('strengthOfTheGrave', 'Força da Sepultura', 'Strength of the Grave',
              'Quando um dano o levaria a 0 Pontos de Vida, faça uma salvaguarda de Carisma (CD 5 + dano sofrido); se passar, fica com 1 Ponto de Vida. Não funciona contra dano radiante nem acerto crítico. 1 uso por Descanso Longo.',
              'When damage would reduce you to 0 Hit Points, make a Charisma save (DC 5 + damage taken); on a success you drop to 1 Hit Point instead. Doesn\'t work against Radiant damage or a Critical Hit. Once per Long Rest.'),
          ],
          autoSpells: ['darkness'],
        },
        6: {
          features: [
            f('houndOfIllOmen', 'Cão do Mau Agouro', 'Hound of Ill Omen',
              'Ação Bônus e 3 pontos de feitiçaria: escolha uma criatura que você vê a até 36 m (120 pés). Um cão sombrio (estatísticas de lobo atroz, tamanho Médio, com PV temporários iguais à metade do seu nível de feiticeiro) surge perto dela e só a persegue e ataca, atravessando criaturas e objetos. Enquanto o cão estiver a até 1,5 m (5 pés) do alvo, ele tem Desvantagem nas salvaguardas contra suas magias. Dura 5 minutos ou até o cão ou o alvo cair a 0 PV.',
              'Bonus Action and 3 Sorcery Points: pick a creature you can see within 120 feet. A shadow hound (dire wolf statistics, Medium, with temporary HP equal to half your Sorcerer level) appears near it and only hunts and attacks it, moving through creatures and objects. While the hound is within 5 feet of the target, it has Disadvantage on saves against your spells. Lasts 5 minutes or until the hound or the target drops to 0 HP.'),
          ],
        },
        14: {
          features: [
            f('shadowWalk', 'Passo Sombrio', 'Shadow Walk',
              'Estando na penumbra ou na escuridão, use uma Ação Bônus para se teleportar até 36 m (120 pés) para um espaço que você veja e que também esteja na penumbra ou na escuridão.',
              'While in dim light or darkness, take a Bonus Action to teleport up to 120 feet to a space you can see that is also in dim light or darkness.'),
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
              'Você fala, lê e escreve Primordial (e entende seus dialetos: Aquan, Auran, Ignan e Terran).',
              'You can speak, read, and write Primordial (and understand its dialects: Aquan, Auran, Ignan, and Terran).'),
            f('tempestuousMagic', 'Magia Tempestuosa', 'Tempestuous Magic',
              'No turno em que conjurar uma magia de nível 1+, use uma Ação Bônus (antes ou depois dela) para voar até 3 m (10 pés) sem provocar Ataques de Oportunidade.',
              'On a turn you cast a level 1+ spell, take a Bonus Action (before or after it) to fly up to 10 feet without provoking Opportunity Attacks.'),
          ],
          grants: { languages: ['Primordial'] },
        },
        6: {
          features: [
            f('heartOfTheStorm', 'Coração da Tempestade', 'Heart of the Storm',
              'Resistência a dano elétrico e trovão. Ao começar a conjurar uma magia de nível 1+ que cause dano elétrico ou trovão, criaturas à sua escolha a até 3 m (10 pés) sofrem dano elétrico ou trovão (à sua escolha) igual à metade do seu nível de feiticeiro.',
              'Resistance to Lightning and Thunder damage. When you start casting a level 1+ spell that deals Lightning or Thunder damage, creatures of your choice within 10 feet take Lightning or Thunder damage (your choice) equal to half your Sorcerer level.'),
            f('stormGuide', 'Guia da Tempestade', 'Storm Guide',
              'Se estiver chovendo, use uma ação para parar a chuva numa esfera de 6 m (20 pés) centrada em você. Com uma Ação Bônus, escolha a direção do vento num raio de 30 m (100 pés) até o fim do seu próximo turno.',
              'If it is raining, take an action to stop the rain in a 20-foot sphere centered on you. As a Bonus Action, choose the direction of the wind within 100 feet until the end of your next turn.'),
          ],
        },
        14: {
          features: [
            f('stormsFury', 'Fúria da Tempestade', 'Storm\'s Fury',
              'Reação ao ser atingido por um ataque corpo a corpo: o atacante sofre dano elétrico igual ao seu nível de feiticeiro e faz salvaguarda de Força contra sua CD; se falhar, é empurrado até 6 m (20 pés) para longe de você.',
              'Reaction when hit by a melee attack: the attacker takes Lightning damage equal to your Sorcerer level and makes a Strength save against your DC; on a failure it is pushed up to 20 feet away from you.'),
          ],
        },
        18: {
          features: [
            f('windSoul', 'Alma do Vento', 'Wind Soul',
              'Imunidade a dano elétrico e trovão e Deslocamento de Voo de 18 m (60 pés). Como ação, reduza seu voo para 9 m (30 pés) por 1 hora e dê Deslocamento de Voo de 9 m (30 pés) a até 3 + modificador de Carisma criaturas a até 9 m (30 pés) pelo mesmo tempo. Esse uso volta num Descanso Curto ou Longo.',
              'Immunity to Lightning and Thunder damage and a Fly Speed of 60 feet. As an action, reduce your Fly Speed to 30 feet for 1 hour and give up to 3 + your Charisma modifier creatures within 30 feet a Fly Speed of 30 feet for that time. This use returns on a Short or Long Rest.'),
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
              'Você conhece o truque Chama Sagrada (não conta no limite). Ao conjurá-lo, pode mirar uma criatura ou duas criaturas a até 1,5 m (5 pés) uma da outra.',
              'You know the Sacred Flame cantrip (it doesn\'t count against your limit). When you cast it, you can target one creature or two creatures within 5 feet of each other.'),
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
              'Ação Bônus e 1 ponto de feitiçaria: troque a fase ativa. A conjuração gratuita da Encarnação Lunar passa a ser uma por fase (a magia de nível 1 de cada fase, enquanto ela estiver ativa), 1 vez cada por Descanso Longo.',
              'Bonus Action and 1 Sorcery Point: change your active phase. Lunar Embodiment\'s free cast becomes one per phase (each phase\'s level 1 spell, while that phase is active), once each per Long Rest.'),
          ],
        },
        7: { autoSpells: ['deathWard', 'confusion', 'hallucinatoryTerrain'] },
        9: { autoSpells: ['telepathicBond', 'holdMonster', 'mislead'] },
        14: {
          features: [
            f('lunarEmpowerment', 'Fortalecimento Lunar', 'Lunar Empowerment',
              'Benefício da fase ativa. Cheia: com Ação Bônus, emite (ou apaga) luz plena a 3 m (10 pés) e penumbra por mais 3 m; você e criaturas à sua escolha dentro da luz plena têm Vantagem em testes de Inteligência (Investigação) e Sabedoria (Percepção). Nova: Vantagem em Destreza (Furtividade) e, enquanto estiver totalmente na escuridão, ataques contra você têm Desvantagem. Crescente: Resistência a dano necrótico e radiante.',
              'Active phase benefit. Full: as a Bonus Action, shed (or douse) bright light in 10 feet and dim light 10 feet beyond; you and creatures of your choice in the bright light have Advantage on Intelligence (Investigation) and Wisdom (Perception) checks. New: Advantage on Dexterity (Stealth) checks, and while entirely in darkness, attack rolls against you have Disadvantage. Crescent: Resistance to Necrotic and Radiant damage.'),
          ],
        },
        18: {
          features: [
            f('lunarPhenomenon', 'Fenômeno Lunar', 'Lunar Phenomenon',
              'Ação Bônus (ou junto com a troca de fase): efeito da fase ativa. Cheia: criaturas à sua escolha a até 9 m (30 pés) fazem salvaguarda de Constituição ou ficam Cegas até o fim do próximo turno delas, e uma criatura à sua escolha nessa área recupera 3d8 PV. Nova: criaturas à sua escolha a até 9 m fazem salvaguarda de Destreza ou sofrem 3d10 de dano necrótico e ficam com deslocamento 0 até o fim do próximo turno delas; você fica Invisível até o fim do seu próximo turno. Crescente: teleporte-se até 18 m (60 pés), podendo levar uma criatura voluntária a até 1,5 m, e ganhe Resistência a todo dano até o início do seu próximo turno. Cada efeito 1 vez por Descanso Longo, ou gaste 5 pontos de feitiçaria.',
              'Bonus Action (or as part of a phase change): effect of the active phase. Full: creatures of your choice within 30 feet make a Constitution save or are Blinded until the end of their next turn, and one creature of your choice there regains 3d8 HP. New: creatures of your choice within 30 feet make a Dexterity save or take 3d10 Necrotic damage and have Speed 0 until the end of their next turn; you become Invisible until the end of your next turn. Crescent: teleport up to 60 feet, optionally bringing a willing creature within 5 feet, and gain Resistance to all damage until the start of your next turn. Each effect once per Long Rest, or spend 5 Sorcery Points.'),
          ],
        },
      },
    },
  },
};

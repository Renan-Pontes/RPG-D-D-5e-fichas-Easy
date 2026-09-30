// Artífice — traços 2024, planos/infusões, modelos de armadura e subclasses. Formato em README.md.
// O artífice não está no SRD: tudo aqui são resumos ORIGINAIS (nomes, níveis e números).
// Fichas 2024 seguem Eberron: Forge of the Artificer (EFA, 2025); fichas 2014 seguem Tasha (TCE).
// Os dados do EFA foram levantados de fonte de terceiros; o que está marcado com CHECK
// ("conferir no livro") ainda precisa ser confirmado no livro.
const b = (pt, en) => ({ pt, en });
const f = (id, name, desc) => ({ id, name, desc });
// Acrescenta o aviso "conferir no livro" a um texto bilíngue.
const chk = (d) => b(`${d.pt} (conferir no livro)`, `${d.en} (check the book)`);

// === Classe base (2024 / EFA) ===
const ASI = f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
  'Ganhe o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique. Este traço se repete nos níveis 8, 12 e 16 de artífice.',
  'Gain the Ability Score Improvement feat or another feat you qualify for. You gain this feature again at Artificer levels 8, 12, and 16.'));

const features = {
  1: [
    f('spellcasting', b('Conjuração', 'Spellcasting'), b(
      'Conjura magias de artífice com Inteligência. Ferramentas de ladrão, de funileiro ou de artesão em que tenha proficiência servem de foco de conjuração. Truques: 2 (3 no 10º, 4 no 14º); ao terminar um Descanso Longo, pode trocar 1 truque. Magias preparadas conforme a tabela da classe (2 no 1º nível); a lista preparada pode mudar a cada Descanso Longo.',
      'You cast Artificer spells using Intelligence. Thieves\' tools, tinker\'s tools, or artisan\'s tools you are proficient with serve as your spellcasting focus. Cantrips: 2 (3 at 10th, 4 at 14th); after a Long Rest you can replace 1 cantrip. Prepared spells follow the class table (2 at 1st level); you can change the prepared list after each Long Rest.')),
    f('tinkersMagic', b('Magia do Inventor', "Tinker's Magic"), b(
      'Você conhece o truque Consertar (não conta no limite de truques). Com uma ação Magia e ferramentas de funileiro, cria em um espaço livre a até 1,5 m um item comum de uma lista fixa (ex.: rolamentos, cesto, saco de dormir, sino, cobertor, talha, garrafa, balde, estrepes, vela, pé de cabra, frasco, gancho de escalada, armadilha de caça, jarro, lampião, algemas, rede, óleo, papel, pergaminho, vara, algibeira, corda, saco, pá, cravos, barbante, pederneira, tocha, frasco pequeno). O item dura até o fim do seu próximo Descanso Longo. Usos: modificador de INT (mín. 1) por Descanso Longo.',
      "You know the Mending cantrip (it doesn't count against your cantrips). As a Magic action with tinker's tools, you create a mundane item from a fixed list in an unoccupied space within 5 feet (e.g., ball bearings, basket, bedroll, bell, blanket, block and tackle, bottle, bucket, caltrops, candle, crowbar, flask, grappling hook, hunting trap, jug, lamp, manacles, net, oil, paper, parchment, pole, pouch, rope, sack, shovel, iron spikes, string, tinderbox, torch, vial). It lasts until the end of your next Long Rest. Uses: your INT modifier (min 1) per Long Rest.")),
  ],
  2: [
    f('replicateMagicItem', b('Replicar Item Mágico', 'Replicate Magic Item'), b(
      'Você aprende planos de itens mágicos: 4 no 2º nível, 5 no 6º, 6 no 10º, 7 no 14º e 8 no 18º. Ao ganhar um nível de artífice, pode trocar 1 plano conhecido por outro elegível. Ao terminar um Descanso Longo, com ferramentas de funileiro, fabrica itens a partir dos planos conhecidos; o número de itens ativos ao mesmo tempo é 2 (3 no 6º, 4 no 10º, 5 no 14º, 6 no 18º). Ao passar do limite, o item mais antigo se desfaz; todos somem se você morrer. Armas e varinhas replicadas podem servir de foco de conjuração.',
      'You learn magic item plans: 4 at 2nd level, 5 at 6th, 6 at 10th, 7 at 14th, and 8 at 18th. Whenever you gain an Artificer level, you can replace 1 known plan with another eligible one. After a Long Rest, with tinker\'s tools, you craft items from your known plans; you can have 2 such items at once (3 at 6th, 4 at 10th, 5 at 14th, 6 at 18th). Exceeding the limit makes the oldest item vanish; all of them vanish if you die. Replicated weapons and wands can serve as your spellcasting focus.')),
  ],
  3: [
    f('artificerSubclass', b('Subclasse de Artífice', 'Artificer Subclass'), b(
      'Escolha uma especialização de artífice: Alquimista, Armeiro, Artilheiro, Ferreiro de Batalha ou Cartógrafo. Ela concede traços nos níveis 3, 5, 9 e 15 e magias sempre preparadas nos níveis 3, 5, 9, 13 e 17.',
      'Choose an Artificer subclass: Alchemist, Armorer, Artillerist, Battle Smith, or Cartographer. It grants features at levels 3, 5, 9, and 15 and always-prepared spells at levels 3, 5, 9, 13, and 17.')),
  ],
  4: [ASI],
  6: [
    f('magicItemTinker', b('Manipular Item Mágico', 'Magic Item Tinker'), b(
      'Três usos para itens que você replicou. Carregar: Ação Bônus, gaste um espaço de magia para devolver a um item cargas iguais ao nível do espaço. Drenar: Ação Bônus, desfaça o item para recuperar um espaço de magia (1º nível se o item for Comum, 2º se Incomum ou Raro); 1×/Descanso Longo. Transmutar: ação Magia, troque o item por outro de um plano conhecido; 1×/Descanso Longo. Você aprende 1 plano a mais e pode manter 3 itens replicados.',
      'Three options for items you replicated. Charge: Bonus Action, expend a spell slot to restore charges to an item equal to the slot level. Drain: Bonus Action, destroy the item to regain a spell slot (1st level for a Common item, 2nd for Uncommon or Rare); once per Long Rest. Transmute: Magic action, turn the item into another from a known plan; once per Long Rest. You learn 1 more plan and can keep 3 replicated items.')),
  ],
  7: [
    f('flashOfGenius', b('Lampejo de Genialidade', 'Flash of Genius'), b(
      'Reação: quando uma criatura que você possa ver a até 9 m (30 pés) falha em um teste de atributo ou salvaguarda, some seu modificador de INT (mín. +1) ao resultado, podendo transformá-lo em sucesso. Usos: modificador de INT (mín. 1) por Descanso Longo.',
      'Reaction: when a creature you can see within 30 feet fails an ability check or saving throw, add your INT modifier (min +1) to the roll, possibly turning it into a success. Uses: your INT modifier (min 1) per Long Rest.')),
  ],
  8: [ASI],
  10: [
    f('magicItemAdept', b('Adepto de Itens Mágicos', 'Magic Item Adept'), chk(b(
      'Você pode se sintonizar com até 4 itens mágicos ao mesmo tempo, e fabricar itens mágicos comuns e incomuns fica mais rápido e mais barato. Você aprende 1 plano a mais (6), mantém até 4 itens replicados e ganha 1 truque.',
      'You can attune to up to 4 magic items at once, and crafting Common and Uncommon magic items becomes faster and cheaper. You learn 1 more plan (6), can keep up to 4 replicated items, and gain 1 cantrip.'))),
  ],
  11: [
    f('spellStoringItem', b('Item Armazenador de Magia', 'Spell-Storing Item'), b(
      'Ao terminar um Descanso Longo, toque uma arma simples ou marcial ou um foco de conjuração e guarde nele uma magia de artífice de 1º a 3º nível com tempo de conjuração de 1 ação e sem componente material consumido. Quem segura o objeto pode conjurá-la com uma ação Magia, usando o seu modificador de conjuração. Usos: 2 × modificador de INT (mín. 2); a magia some quando os usos acabam ou quando você guarda outra.',
      'After a Long Rest, touch a Simple or Martial weapon or a spellcasting focus and store in it an Artificer spell of levels 1–3 that has a casting time of 1 action and no consumed material component. A creature holding the object can cast it with a Magic action using your spellcasting modifier. Uses: 2 × your INT modifier (min 2); the spell fades when the uses run out or when you store another.')),
  ],
  12: [ASI],
  14: [
    f('advancedArtifice', b('Artifício Avançado', 'Advanced Artifice'), b(
      'Sábio de Itens Mágicos: pode se sintonizar com até 5 itens mágicos. Genialidade Renovada: ao terminar um Descanso Curto, recupera 1 uso gasto de Lampejo de Genialidade. Você aprende 1 plano a mais (7), mantém até 5 itens replicados e ganha 1 truque.',
      'Magic Item Savant: you can attune to up to 5 magic items. Refreshed Genius: when you finish a Short Rest, regain 1 expended use of Flash of Genius. You learn 1 more plan (7), can keep up to 5 replicated items, and gain 1 cantrip.')),
  ],
  16: [ASI],
  18: [
    f('magicItemMaster', b('Mestre de Itens Mágicos', 'Magic Item Master'), b(
      'Você pode se sintonizar com até 6 itens mágicos. Você aprende 1 plano a mais (8 no total) e mantém até 6 itens replicados.',
      'You can attune to up to 6 magic items. You learn 1 more plan (8 in total) and can keep up to 6 replicated items.')),
  ],
  19: [
    f('epicBoon', b('Dádiva Épica', 'Epic Boon'), b(
      'Ganhe um talento de Dádiva Épica ou outro talento para o qual se qualifique.',
      'Gain an Epic Boon feat or another feat you qualify for.')),
  ],
  20: [
    f('soulOfArtifice', b('Alma do Artífice', 'Soul of Artifice'), b(
      'Enganar a Morte: quando você cai a 0 PV sem morrer, pode desfazer qualquer número de itens replicados Incomuns ou Raros e recuperar 20 PV por item desfeito. Orientação Mágica: enquanto estiver sintonizado com pelo menos 1 item mágico, ao terminar um Descanso Curto recupera todos os usos de Lampejo de Genialidade.',
      'Cheat Death: when you drop to 0 HP without dying, you can disintegrate any number of your Uncommon or Rare replicated items and regain 20 HP for each. Magical Guidance: while attuned to at least 1 magic item, you regain all Flash of Genius uses when you finish a Short Rest.')),
  ],
};

// === Planos de Item Mágico (EFA, fichas 2024) ===
const WHICH_ITEM = b('Qual item?', 'Which item?');
const plan = (id, pt, en, level, dpt, den, extra = {}) => ({
  id, name: b(pt, en), source: 'EFA', rules: '2024',
  desc: extra.check ? chk(b(dpt, den)) : b(dpt, den),
  ...(level > 2 ? { prereq: { level } } : {}),
  ...(extra.repeatable ? { repeatable: true, detail: WHICH_ITEM } : {}),
});
const C = { check: true };
const R = { repeatable: true, check: true };
const plans = [
  // Nível 2+
  plan('alchemyJug', 'Jarro Alquímico', 'Alchemy Jug', 2, 'Incomum. Jarro que produz, uma vez por dia, um líquido escolhido de uma lista (água, vinho, ácido, óleo…).', 'Uncommon. A jug that pours one liquid chosen from a list (water, wine, acid, oil…) each day.'),
  plan('bagOfHolding', 'Bolsa Devoradora', 'Bag of Holding', 2, 'Incomum. Bolsa com espaço interno muito maior que o externo.', 'Uncommon. A bag whose interior is far larger than its outside.'),
  plan('capOfWaterBreathing', 'Gorro de Respiração Aquática', 'Cap of Water Breathing', 2, 'Incomum. Cria uma bolha de ar ao redor da cabeça debaixo d\'água.', 'Uncommon. Creates a bubble of air around your head underwater.'),
  plan('commonMagicItem', 'Item mágico comum', 'Common magic item', 2, 'Qualquer item mágico Comum, exceto poções, pergaminhos e itens amaldiçoados. Informe qual.', 'Any Common magic item except potions, scrolls, and cursed items. Specify which.', R),
  plan('gogglesOfNight', 'Óculos Noturnos', 'Goggles of Night', 2, 'Incomum. Visão no escuro de 18 m (60 pés).', 'Uncommon. Darkvision out to 60 feet.'),
  plan('manifoldTool', 'Ferramenta Múltipla', 'Manifold Tool', 2, 'Ferramenta que assume a forma de diversas ferramentas de artesão.', "A tool that can take the form of various artisan's tools.", C),
  plan('repeatingShot', 'Tiro Repetido', 'Repeating Shot', 2, 'Incomum, sintonia. Arma de munição +1 que cria a própria munição e ignora a propriedade Recarga.', 'Uncommon, attunement. A +1 ammunition weapon that makes its own ammunition and ignores the Loading property.', C),
  plan('returningWeapon', 'Arma Retornável', 'Returning Weapon', 2, 'Incomum. Arma de arremesso +1 que volta à mão após o ataque.', 'Uncommon. A +1 thrown weapon that returns to your hand after the attack.', C),
  plan('ropeOfClimbing', 'Corda de Escalada', 'Rope of Climbing', 2, 'Incomum. Corda que se move, se prende e dá nós sob comando.', 'Uncommon. A rope that moves, fastens, and knots itself on command.'),
  plan('sendingStones', 'Pedras Mensageiras', 'Sending Stones', 2, 'Incomum. Par de pedras que permite trocar mensagens curtas a qualquer distância.', 'Uncommon. Paired stones for short messages at any distance.'),
  plan('shieldPlus1', 'Escudo +1', 'Shield +1', 2, 'Incomum. +1 na CA além do bônus normal do escudo.', 'Uncommon. +1 AC on top of the normal shield bonus.'),
  plan('wandOfMagicDetection', 'Varinha de Detecção de Magia', 'Wand of Magic Detection', 2, 'Incomum. Gasta cargas para conjurar Detectar Magia.', 'Uncommon. Expend charges to cast Detect Magic.'),
  plan('wandOfSecrets', 'Varinha dos Segredos', 'Wand of Secrets', 2, 'Incomum. Revela portas secretas e armadilhas próximas.', 'Uncommon. Reveals nearby secret doors and traps.'),
  plan('wandOfTheWarMagePlus1', 'Varinha do Mago de Guerra +1', 'Wand of the War Mage +1', 2, 'Incomum, sintonia (conjurador). +1 em jogadas de ataque de magia; ignora meia cobertura.', 'Uncommon, attunement (spellcaster). +1 to spell attack rolls; ignore half cover.'),
  plan('weaponPlus1', 'Arma +1', 'Weapon +1', 2, 'Incomum. +1 em jogadas de ataque e dano.', 'Uncommon. +1 to attack and damage rolls.'),
  plan('wrapsOfUnarmedPowerPlus1', 'Faixas do Poder Desarmado +1', 'Wraps of Unarmed Power +1', 2, 'Incomum. +1 em ataque e dano de golpes desarmados.', 'Uncommon. +1 to Unarmed Strike attack and damage rolls.'),
  // Nível 6+
  plan('armorPlus1', 'Armadura +1', 'Armor +1', 6, 'Rara. +1 na CA.', 'Rare. +1 AC.'),
  plan('bootsOfElvenkind', 'Botas Élficas', 'Boots of Elvenkind', 6, 'Incomum. Passos silenciosos; vantagem em Furtividade baseada em som.', 'Uncommon. Silent steps; Advantage on sound-based Stealth checks.'),
  plan('bootsOfTheWindingPath', 'Botas do Caminho Sinuoso', 'Boots of the Winding Path', 6, 'Incomum, sintonia. Ação Bônus: teletransporte curto de volta a um espaço ocupado neste turno.', 'Uncommon, attunement. Bonus Action: short teleport back to a space you occupied this turn.'),
  plan('cloakOfElvenkind', 'Manto Élfico', 'Cloak of Elvenkind', 6, 'Incomum, sintonia. Dificulta ver o usuário; vantagem em Furtividade visual.', 'Uncommon, attunement. Harder to spot you; Advantage on sight-based Stealth.'),
  plan('cloakOfTheMantaRay', 'Manto da Arraia', 'Cloak of the Manta Ray', 6, 'Incomum. Respira e nada debaixo d\'água.', 'Uncommon. Breathe and swim underwater.'),
  plan('dazzlingWeapon', 'Arma Ofuscante', 'Dazzling Weapon', 6, 'Arma que emite luz e pode ofuscar criaturas.', 'A weapon that sheds light and can dazzle creatures.', C),
  plan('eyesOfCharming', 'Olhos do Encantamento', 'Eyes of Charming', 6, 'Incomum, sintonia. Gasta cargas para conjurar Enfeitiçar Pessoa.', 'Uncommon, attunement. Expend charges to cast Charm Person.'),
  plan('eyesOfMinuteSeeing', 'Olhos da Visão Minuciosa', 'Eyes of Minute Seeing', 6, 'Incomum. Enxerga detalhes minúsculos de perto; vantagem em Investigação visual.', 'Uncommon. See tiny details up close; Advantage on sight-based Investigation.'),
  plan('glovesOfThievery', 'Luvas do Ladrão', 'Gloves of Thievery', 6, 'Incomum. Invisíveis; +5 em Prestidigitação e para abrir fechaduras.', 'Uncommon. Invisible; +5 to Sleight of Hand and to pick locks.'),
  plan('helmOfAwareness', 'Elmo da Percepção', 'Helm of Awareness', 6, 'Incomum, sintonia. Vantagem em Iniciativa; não pode ser surpreendido.', "Uncommon, attunement. Advantage on Initiative; you can't be surprised.", C),
  plan('lanternOfRevealing', 'Lanterna Reveladora', 'Lantern of Revealing', 6, 'Incomum. Sua luz revela criaturas e objetos invisíveis.', 'Uncommon. Its light reveals invisible creatures and objects.'),
  plan('mindSharpener', 'Afiador Mental', 'Mind Sharpener', 6, 'Incomum, sintonia. Gasta cargas para transformar uma falha de Concentração em sucesso.', 'Uncommon, attunement. Expend charges to turn a failed Concentration save into a success.', C),
  plan('necklaceOfAdaptation', 'Colar da Adaptação', 'Necklace of Adaptation', 6, 'Incomum, sintonia. Respira em qualquer ambiente; vantagem contra gases nocivos.', 'Uncommon, attunement. Breathe in any environment; Advantage against harmful gases.'),
  plan('pipesOfHaunting', 'Flauta Assombrada', 'Pipes of Haunting', 6, 'Incomum. Gasta cargas para amedrontar criaturas próximas.', 'Uncommon. Expend charges to frighten nearby creatures.'),
  plan('repulsionShield', 'Escudo de Repulsão', 'Repulsion Shield', 6, 'Incomum, sintonia. +1 na CA; gasta cargas para empurrar quem o acerta corpo a corpo.', 'Uncommon, attunement. +1 AC; expend charges to push away a creature that hits you in melee.', C),
  plan('ringOfSwimming', 'Anel da Natação', 'Ring of Swimming', 6, 'Incomum. Deslocamento de natação de 12 m (40 pés).', 'Uncommon. Swim Speed of 40 feet.'),
  plan('ringOfWaterWalking', 'Anel de Andar na Água', 'Ring of Water Walking', 6, 'Incomum. Anda sobre superfícies líquidas.', 'Uncommon. Walk across liquid surfaces.'),
  plan('sentinelShield', 'Escudo Sentinela', 'Sentinel Shield', 6, 'Incomum. Vantagem em Iniciativa e em Percepção.', 'Uncommon. Advantage on Initiative and Perception.'),
  plan('spellRefuelingRing', 'Anel de Recarga Mágica', 'Spell-Refueling Ring', 6, 'Incomum, sintonia. Uma vez por dia, recupera um espaço de magia de até 3º nível.', 'Uncommon, attunement. Once per day, regain a spell slot of level 3 or lower.'),
  plan('wandOfMagicMissiles', 'Varinha de Mísseis Mágicos', 'Wand of Magic Missiles', 6, 'Incomum. Gasta cargas para conjurar Mísseis Mágicos.', 'Uncommon. Expend charges to cast Magic Missile.'),
  plan('wandOfWeb', 'Varinha de Teia', 'Wand of Web', 6, 'Incomum, sintonia (conjurador). Gasta cargas para conjurar Teia.', 'Uncommon, attunement (spellcaster). Expend charges to cast Web.'),
  plan('weaponOfWarning', 'Arma de Alerta', 'Weapon of Warning', 6, 'Incomum, sintonia. Vantagem em Iniciativa; acorda você e os aliados diante de perigo.', 'Uncommon, attunement. Advantage on Initiative; wakes you and your allies when danger nears.'),
  // Nível 10+
  plan('armorOfResistance', 'Armadura de Resistência', 'Armor of Resistance', 10, 'Rara, sintonia. Resistência a um tipo de dano.', 'Rare, attunement. Resistance to one damage type.'),
  plan('daggerOfVenom', 'Adaga Venenosa', 'Dagger of Venom', 10, 'Rara. Adaga +1 que pode ser coberta de veneno.', 'Rare. A +1 dagger that can be coated in poison.'),
  plan('elvenChain', 'Cota Élfica', 'Elven Chain', 10, 'Rara. Camisão de malha +1 que conta como armadura leve.', 'Rare. A +1 chain shirt that counts as Light armor.'),
  plan('ringOfFeatherFalling', 'Anel da Queda Suave', 'Ring of Feather Falling', 10, 'Rara, sintonia. Cai lentamente e não sofre dano de queda.', 'Rare, attunement. You fall slowly and take no falling damage.'),
  plan('ringOfJumping', 'Anel do Salto', 'Ring of Jumping', 10, 'Incomum, sintonia. Conjura Salto em si mesmo à vontade.', 'Uncommon, attunement. Cast Jump on yourself at will.'),
  plan('ringOfMindShielding', 'Anel de Proteção Mental', 'Ring of Mind Shielding', 10, 'Incomum, sintonia. Bloqueia leitura de mente e magia que revele suas intenções.', 'Uncommon, attunement. Blocks mind reading and magic that reveals your intentions.'),
  plan('shieldPlus2', 'Escudo +2', 'Shield +2', 10, 'Rara. +2 na CA além do bônus normal do escudo.', 'Rare. +2 AC on top of the normal shield bonus.'),
  plan('uncommonWondrousItem', 'Item maravilhoso incomum', 'Uncommon wondrous item', 10, 'Qualquer item maravilhoso Incomum não amaldiçoado. Informe qual.', 'Any non-cursed Uncommon wondrous item. Specify which.', R),
  plan('wandOfTheWarMagePlus2', 'Varinha do Mago de Guerra +2', 'Wand of the War Mage +2', 10, 'Rara, sintonia (conjurador). +2 em jogadas de ataque de magia; ignora meia cobertura.', 'Rare, attunement (spellcaster). +2 to spell attack rolls; ignore half cover.'),
  plan('weaponPlus2', 'Arma +2', 'Weapon +2', 10, 'Rara. +2 em jogadas de ataque e dano.', 'Rare. +2 to attack and damage rolls.'),
  plan('wrapsOfUnarmedPowerPlus2', 'Faixas do Poder Desarmado +2', 'Wraps of Unarmed Power +2', 10, 'Rara. +2 em ataque e dano de golpes desarmados.', 'Rare. +2 to Unarmed Strike attack and damage rolls.'),
  // Nível 14+
  plan('armorPlus2', 'Armadura +2', 'Armor +2', 14, 'Muito rara. +2 na CA.', 'Very rare. +2 AC.'),
  plan('arrowCatchingShield', 'Escudo Apanha-Flechas', 'Arrow-Catching Shield', 14, 'Rara, sintonia. +2 na CA contra ataques à distância; pode desviar para si projéteis mirados em aliados próximos.', 'Rare, attunement. +2 AC against ranged attacks; can redirect to yourself missiles aimed at nearby allies.'),
  plan('flameTongue', 'Língua de Fogo', 'Flame Tongue', 14, 'Rara, sintonia. A lâmina se incendeia e causa 2d6 de dano de fogo extra.', 'Rare, attunement. The blade ignites and deals an extra 2d6 fire damage.'),
  plan('rareWondrousItem', 'Item maravilhoso raro', 'Rare wondrous item', 14, 'Qualquer item maravilhoso Raro não amaldiçoado. Informe qual.', 'Any non-cursed Rare wondrous item. Specify which.', R),
  plan('ringOfFreeAction', 'Anel da Ação Livre', 'Ring of Free Action', 14, 'Rara, sintonia. Ignora terreno difícil e não pode ser paralisado nem impedido por magia.', "Rare, attunement. Ignore difficult terrain; magic can't paralyze or restrain you."),
  plan('ringOfProtection', 'Anel de Proteção', 'Ring of Protection', 14, 'Rara, sintonia. +1 na CA e nas salvaguardas.', 'Rare, attunement. +1 to AC and saving throws.'),
  plan('ringOfTheRam', 'Anel do Aríete', 'Ring of the Ram', 14, 'Rara, sintonia. Gasta cargas para disparar golpes de força que empurram.', 'Rare, attunement. Expend charges to fire ramming blasts of force that push.'),
];

// === Infusões de Artífice (Tasha, fichas 2014) ===
const inf = (id, pt, en, level, dpt, den, extra = {}) => ({
  id, name: b(pt, en), source: extra.source || 'TCE', rules: '2014', desc: b(dpt, den),
  ...(level > 2 || extra.text ? { prereq: { ...(level > 2 ? { level } : {}), ...(extra.text ? { text: extra.text } : {}) } } : {}),
  ...(extra.repeatable ? { repeatable: true } : {}),
  ...(extra.detail ? { detail: extra.detail } : {}),
});
const infusions = [
  inf('armorOfMagicalStrength', 'Armadura de Força Mágica', 'Armor of Magical Strength', 2, 'Armadura (sintonia). 6 cargas: gaste 1 para somar INT a um teste ou salvaguarda de FOR, ou, por reação, evitar ser derrubado. Recupera 1d6 cargas ao amanhecer.', 'Armor (attunement). 6 charges: spend 1 to add INT to a STR check or save, or as a reaction to avoid being knocked prone. Regains 1d6 charges at dawn.', { text: b('Uma armadura', 'A suit of armor') }),
  inf('arcanePropulsionArmor', 'Armadura de Propulsão Arcana', 'Arcane Propulsion Armor', 14, 'Armadura (sintonia). +1,5 m (5 pés) de deslocamento; as manoplas viram armas de força arremessáveis (1d8, 6/18 m) que voltam à mão; a armadura substitui membros perdidos e não pode ser removida contra sua vontade.', "Armor (attunement). +5 ft speed; the gauntlets become thrown force weapons (1d8, 20/60 ft) that return; the armor replaces missing limbs and can't be removed against your will.", { text: b('Uma armadura', 'A suit of armor') }),
  inf('bootsOfTheWindingPath', 'Botas do Caminho Sinuoso', 'Boots of the Winding Path', 6, 'Botas (sintonia). Ação bônus: teletransporte-se até 4,5 m (15 pés) para um espaço desocupado que ocupou neste turno.', 'Boots (attunement). Bonus action: teleport up to 15 feet to an unoccupied space you occupied this turn.', { source: 'TCE', text: b('Um par de botas', 'A pair of boots') }),
  inf('enhancedArcaneFocus', 'Foco Arcano Aprimorado', 'Enhanced Arcane Focus', 2, 'Bastão, cajado ou varinha (sintonia). +1 em jogadas de ataque de magia (+2 no 10º nível de artífice) e ignora meia cobertura.', 'Rod, staff, or wand (attunement). +1 to spell attack rolls (+2 at artificer level 10) and ignore half cover.', { text: b('Um bastão, cajado ou varinha', 'A rod, staff, or wand') }),
  inf('enhancedDefense', 'Defesa Aprimorada', 'Enhanced Defense', 2, 'Armadura ou escudo. +1 na CA (+2 no 10º nível de artífice).', 'Armor or shield. +1 AC (+2 at artificer level 10).', { text: b('Uma armadura ou escudo', 'A suit of armor or a shield') }),
  inf('enhancedWeapon', 'Arma Aprimorada', 'Enhanced Weapon', 2, 'Arma simples ou marcial. +1 em ataque e dano (+2 no 10º nível de artífice).', 'Simple or martial weapon. +1 to attack and damage (+2 at artificer level 10).', { text: b('Uma arma simples ou marcial', 'A simple or martial weapon') }),
  inf('helmOfAwareness', 'Elmo da Percepção', 'Helm of Awareness', 10, 'Elmo (sintonia). Vantagem em iniciativa; não pode ser surpreendido enquanto estiver consciente.', "Helmet (attunement). Advantage on initiative; you can't be surprised while conscious.", { text: b('Um elmo', 'A helmet') }),
  inf('homunculusServant', 'Homúnculo Servo', 'Homunculus Servant', 2, 'Gema ou cristal de 100 PO ou mais. Cria um pequeno constructo aliado que age logo após você, ataca com força e pode entregar magias de toque. Registre-o entre os combatentes.', 'A gem or crystal worth 100 gp or more. Creates a tiny construct ally that acts right after you, makes force attacks, and can deliver touch spells. Track it among the combatants.', { text: b('Uma gema ou cristal de 100 PO+', 'A gem or crystal worth 100+ gp') }),
  inf('mindSharpener', 'Afiador Mental', 'Mind Sharpener', 2, 'Armadura ou robe. 4 cargas: reação para transformar uma falha de Concentração em sucesso. Recupera 1d4 cargas ao amanhecer.', 'Armor or robes. 4 charges: reaction to turn a failed Concentration save into a success. Regains 1d4 charges at dawn.', { text: b('Uma armadura ou robe', 'A suit of armor or robes') }),
  inf('radiantWeapon', 'Arma Radiante', 'Radiant Weapon', 6, 'Arma simples ou marcial (sintonia). +1 em ataque e dano; emite luz sob comando; 4 cargas para, por reação, cegar quem o acerta. Recupera 1d4 cargas ao amanhecer.', 'Simple or martial weapon (attunement). +1 to attack and damage; sheds light on command; 4 charges to blind an attacker as a reaction. Regains 1d4 charges at dawn.', { text: b('Uma arma simples ou marcial', 'A simple or martial weapon') }),
  inf('repeatingShot', 'Tiro Repetido', 'Repeating Shot', 2, 'Arma simples ou marcial com munição (sintonia). +1 em ataque e dano à distância; ignora Recarga; cria a própria munição.', 'Simple or martial weapon with the ammunition property (attunement). +1 to ranged attack and damage; ignores Loading; creates its own ammunition.', { text: b('Uma arma com a propriedade munição', 'A weapon with the ammunition property') }),
  { ...inf('replicateMagicItem', 'Replicar Item Mágico', 'Replicate Magic Item', 2, 'Aprende a fabricar um item mágico específico das tabelas de replicação (2º, 6º, 10º ou 14º nível) ou um item mágico comum que não seja poção nem pergaminho. Pode ser escolhida várias vezes, com um item diferente em cada; o item é escolhido na lista "Item Replicado".', 'Learn to make one specific magic item from the replication tables (levels 2, 6, 10, or 14) or a common magic item that is not a potion or scroll. Can be taken multiple times, with a different item each time; pick the item in the "Replicated Item" list.', { repeatable: true }), choices: { replicateItem: 1 } },
  inf('repulsionShield', 'Escudo de Repulsão', 'Repulsion Shield', 6, 'Escudo (sintonia). +1 na CA; 4 cargas para, por reação, empurrar até 4,5 m (15 pés) quem o acerta corpo a corpo. Recupera 1d4 cargas ao amanhecer.', 'Shield (attunement). +1 AC; 4 charges to push a creature that hits you in melee up to 15 feet as a reaction. Regains 1d4 charges at dawn.', { text: b('Um escudo', 'A shield') }),
  inf('resistantArmor', 'Armadura Resistente', 'Resistant Armor', 6, 'Armadura (sintonia). Resistência a um tipo de dano escolhido ao infundir: ácido, frio, fogo, força, elétrico, necrótico, veneno, psíquico, radiante ou trovão.', 'Armor (attunement). Resistance to one damage type chosen when you infuse it: acid, cold, fire, force, lightning, necrotic, poison, psychic, radiant, or thunder.', { detail: b('Qual tipo de dano?', 'Which damage type?'), text: b('Uma armadura', 'A suit of armor') }),
  inf('returningWeapon', 'Arma Retornável', 'Returning Weapon', 2, 'Arma simples ou marcial de arremesso. +1 em ataque e dano; volta à mão logo após o ataque.', "Simple or martial weapon with the thrown property. +1 to attack and damage; it returns to the wielder's hand right after the attack.", { text: b('Uma arma de arremesso', 'A weapon with the thrown property') }),
  inf('spellRefuelingRing', 'Anel de Recarga Mágica', 'Spell-Refueling Ring', 6, 'Anel (sintonia). Uma vez por amanhecer, com uma ação, recupera um espaço de magia de até 3º nível.', 'Ring (attunement). Once per dawn, as an action, regain a spell slot of 3rd level or lower.', { text: b('Um anel', 'A ring') }),
];

// === Itens da infusão Replicar Item Mágico (TCE, fichas 2014) ===
// Só os nomes e o nível mínimo de artífice (tabelas de replicação); sem descrição.
const REPLICABLE = {
  2: [['alchemyJug', 'Jarro Alquímico', 'Alchemy Jug'], ['bagOfHolding', 'Bolsa Devoradora', 'Bag of Holding'],
    ['capOfWaterBreathing', 'Gorro de Respirar na Água', 'Cap of Water Breathing'], ['gogglesOfNight', 'Óculos Noturnos', 'Goggles of Night'],
    ['ropeOfClimbing', 'Corda de Escalada', 'Rope of Climbing'], ['sendingStones', 'Pedras de Mensagem', 'Sending Stones'],
    ['wandOfMagicDetection', 'Varinha de Detecção de Magia', 'Wand of Magic Detection'], ['wandOfSecrets', 'Varinha de Segredos', 'Wand of Secrets']],
  6: [['bootsOfElvenkind', 'Botas Élficas', 'Boots of Elvenkind'], ['cloakOfElvenkind', 'Manto Élfico', 'Cloak of Elvenkind'],
    ['cloakOfTheMantaRay', 'Manto da Arraia', 'Cloak of the Manta Ray'], ['eyesOfCharming', 'Olhos Encantadores', 'Eyes of Charming'],
    ['glovesOfThievery', 'Luvas do Ladrão', 'Gloves of Thievery'], ['lanternOfRevealing', 'Lanterna Reveladora', 'Lantern of Revealing'],
    ['pipesOfHaunting', 'Flautas Assombradas', 'Pipes of Haunting'], ['ringOfWaterWalking', 'Anel de Andar na Água', 'Ring of Water Walking']],
  10: [['bootsOfStridingAndSpringing', 'Botas de Caminhar e Saltar', 'Boots of Striding and Springing'], ['bootsOfTheWinterlands', 'Botas das Terras Invernais', 'Boots of the Winterlands'],
    ['bracersOfArchery', 'Braçadeiras de Arqueria', 'Bracers of Archery'], ['broochOfShielding', 'Broche de Proteção', 'Brooch of Shielding'],
    ['cloakOfProtection', 'Manto de Proteção', 'Cloak of Protection'], ['eyesOfTheEagle', 'Olhos de Águia', 'Eyes of the Eagle'],
    ['gauntletsOfOgrePower', 'Manoplas de Força do Ogro', 'Gauntlets of Ogre Power'], ['glovesOfMissileSnaring', 'Luvas de Apanhar Projéteis', 'Gloves of Missile Snaring'],
    ['glovesOfSwimmingAndClimbing', 'Luvas de Natação e Escalada', 'Gloves of Swimming and Climbing'], ['hatOfDisguise', 'Chapéu do Disfarce', 'Hat of Disguise'],
    ['headbandOfIntellect', 'Tiara do Intelecto', 'Headband of Intellect'], ['helmOfTelepathy', 'Elmo da Telepatia', 'Helm of Telepathy'],
    ['medallionOfThoughts', 'Medalhão dos Pensamentos', 'Medallion of Thoughts'], ['necklaceOfAdaptation', 'Colar da Adaptação', 'Necklace of Adaptation'],
    ['periaptOfWoundClosure', 'Amuleto de Fechar Ferimentos', 'Periapt of Wound Closure'], ['pipesOfTheSewers', 'Flautas dos Esgotos', 'Pipes of the Sewers'],
    ['quiverOfEhlonna', 'Aljava de Ehlonna', 'Quiver of Ehlonna'], ['ringOfJumping', 'Anel do Salto', 'Ring of Jumping'],
    ['ringOfMindShielding', 'Anel de Proteção Mental', 'Ring of Mind Shielding'], ['slippersOfSpiderClimbing', 'Sapatilhas de Escalada Aracnídea', 'Slippers of Spider Climbing'],
    ['wingedBoots', 'Botas Aladas', 'Winged Boots']],
  14: [['amuletOfHealth', 'Amuleto da Saúde', 'Amulet of Health'], ['arcanePropulsionArm', 'Braço de Propulsão Arcana', 'Arcane Propulsion Arm'],
    ['beltOfHillGiantStrength', 'Cinto de Força do Gigante da Colina', 'Belt of Hill Giant Strength'], ['bootsOfLevitation', 'Botas da Levitação', 'Boots of Levitation'],
    ['bootsOfSpeed', 'Botas da Velocidade', 'Boots of Speed'], ['bracersOfDefense', 'Braçadeiras de Defesa', 'Bracers of Defense'],
    ['cloakOfTheBat', 'Manto do Morcego', 'Cloak of the Bat'], ['dimensionalShackles', 'Algemas Dimensionais', 'Dimensional Shackles'],
    ['gemOfSeeing', 'Gema da Visão', 'Gem of Seeing'], ['hornOfBlasting', 'Trompa da Explosão', 'Horn of Blasting'],
    ['ringOfFreeAction', 'Anel da Ação Livre', 'Ring of Free Action'], ['ringOfProtection', 'Anel de Proteção', 'Ring of Protection'],
    ['ringOfTheRam', 'Anel do Aríete', 'Ring of the Ram']],
};
const replicableItems = [
  ...Object.entries(REPLICABLE).flatMap(([level, list]) => list.map(([id, pt, en]) => ({
    id, name: b(pt, en), source: 'TCE', rules: '2014',
    desc: b(`Item da tabela de replicação de ${level}º nível de artífice.`, `Item from the artificer level ${level} replication table.`),
    ...(+level > 2 ? { prereq: { level: +level } } : {}),
  }))),
  { id: 'commonItem', name: b('Item mágico comum (outro)', 'Common magic item (other)'), source: 'TCE', rules: '2014', repeatable: true,
    desc: b('Qualquer item mágico comum que não seja poção nem pergaminho.', 'Any common magic item that is not a potion or scroll.'),
    detail: b('Qual item comum?', 'Which common item?') },
];

// === Modelos de Armadura (Armeiro) ===
const armorModels = [
  { id: 'guardian', name: b('Guardião', 'Guardian'), source: 'TCE',
    desc: b(
      'Manoplas do Trovão: arma corpo a corpo simples (1d8 de trovão, usa INT); o alvo atingido tem desvantagem para atacar outras criaturas além de você. Campo Defensivo: Ação Bônus, ganhe PV temporários iguais ao seu nível de artífice (2024: usos e condições a conferir no livro; 2014: usos = bônus de proficiência por Descanso Longo). Troque de modelo em um Descanso Curto ou Longo.',
      "Thunder Gauntlets: simple melee weapon (1d8 thunder, uses INT); a creature you hit has Disadvantage on attacks against targets other than you. Defensive Field: Bonus Action, gain temporary HP equal to your artificer level (2024: uses and conditions — check the book; 2014: uses = proficiency bonus per Long Rest). Switch models on a Short or Long Rest."),
    prereq: { subclass: ['armorer'] } },
  { id: 'infiltrator', name: b('Infiltrador', 'Infiltrator'), source: 'TCE',
    desc: b(
      'Lançador de Relâmpagos: arma à distância simples, 27/90 m (90/300 pés), 1d6 de dano elétrico (usa INT), +1d6 uma vez por turno. Passos Motorizados: +1,5 m (5 pés) de deslocamento. Campo Amortecedor: vantagem em Furtividade. Troque de modelo em um Descanso Curto ou Longo.',
      'Lightning Launcher: simple ranged weapon, 90/300 ft, 1d6 lightning (uses INT), +1d6 once per turn. Powered Steps: +5 ft speed. Dampening Field: Advantage on Stealth checks. Switch models on a Short or Long Rest.'),
    prereq: { subclass: ['armorer'] } },
  { id: 'dreadnaught', name: b('Couraçado', 'Dreadnaught'), source: 'EFA', rules: '2024',
    desc: chk(b(
      'Demolidor de Força: arma corpo a corpo simples com alcance, 1d10 de dano de força (usa INT); ao acertar uma criatura menor que você, pode empurrá-la ou puxá-la 3 m (10 pés). Estatura Gigante: Ação Bônus, por 1 minuto seu alcance aumenta 1,5 m e você fica Grande; usos = modificador de INT por Descanso Longo. Troque de modelo em um Descanso Curto ou Longo.',
      'Force Demolisher: simple melee weapon with Reach, 1d10 force (uses INT); on a hit against a smaller creature you can push or pull it 10 feet. Giant Stature: Bonus Action, for 1 minute your reach grows by 5 feet and you become Large; uses = INT modifier per Long Rest. Switch models on a Short or Long Rest.')),
    prereq: { subclass: ['armorer'] } },
];

// === Ferramentas ===
// Nível 1: uma ferramenta de artesão (só quem começa na classe; multiclasse não ganha).
const ART_TOOLS = [
  ['alchemistsSupplies', 'Suprimentos de Alquimista', "Alchemist's supplies"],
  ['brewersSupplies', 'Suprimentos de Cervejeiro', "Brewer's supplies"],
  ['calligraphersSupplies', 'Suprimentos de Calígrafo', "Calligrapher's supplies"],
  ['carpentersTools', 'Ferramentas de Carpinteiro', "Carpenter's tools"],
  ['cartographersTools', 'Ferramentas de Cartógrafo', "Cartographer's tools"],
  ['cobblersTools', 'Ferramentas de Sapateiro', "Cobbler's tools"],
  ['cooksUtensils', 'Utensílios de Cozinheiro', "Cook's utensils"],
  ['glassblowersTools', 'Ferramentas de Vidreiro', "Glassblower's tools"],
  ['jewelersTools', 'Ferramentas de Joalheiro', "Jeweler's tools"],
  ['leatherworkersTools', 'Ferramentas de Coureiro', "Leatherworker's tools"],
  ['masonsTools', 'Ferramentas de Pedreiro', "Mason's tools"],
  ['paintersSupplies', 'Suprimentos de Pintor', "Painter's supplies"],
  ['pottersTools', 'Ferramentas de Oleiro', "Potter's tools"],
  ['smithsTools', 'Ferramentas de Ferreiro', "Smith's tools"],
  ['weaversTools', 'Ferramentas de Tecelão', "Weaver's tools"],
  ['woodcarversTools', 'Ferramentas de Entalhador', "Woodcarver's tools"],
];
const artisanTools = ART_TOOLS.map(([id, pt, en]) => ({
  id, name: b(pt, en), source: 'EFA',
  desc: b(`Proficiência com ${pt.toLowerCase()}.`, `Proficiency with ${en}.`),
  grants: { tools: [en] },
}));

// Nível 3: proficiências fixas de cada subclasse ("Ferramentas do Ofício").
// Fichas 2024: vêm como `grants` nos níveis das subclasses (abaixo), sem escolha.
// Fichas 2014: as subclasses vêm de src/progression/artificer.js (sem `grants`),
// então o kit fica neste pool, só para 2014 (legacySubclassChoices).
// "Se já tiver a ferramenta, escolha outra de artesão": só no texto/detalhe (não verificável).
const OTHER = b('Se já tiver alguma: qual ferramenta de artesão no lugar?', 'If you already have one: which artisan\'s tool instead?');
const kit = (id, subclass, pt, en, grants) => ({
  id, name: b(pt, en), source: 'TCE', rules: '2014', desc: b(`Concede: ${pt}.`, `Grants: ${en}.`),
  prereq: { subclass: [subclass] }, detail: OTHER, grants,
});
const specialistKits = [
  kit('alchemistKitLegacy', 'alchemist', 'suprimentos de alquimista', "alchemist's supplies",
    { tools: ["Alchemist's supplies"] }),
  kit('armorerKit', 'armorer', 'armadura pesada e ferramentas de ferreiro', "Heavy armor and smith's tools",
    { armor: ['Heavy'], tools: ["Smith's tools"] }),
  kit('artilleristKitLegacy', 'artillerist', 'ferramentas de entalhador', "woodcarver's tools",
    { tools: ["Woodcarver's tools"] }),
  kit('battlesmithKit', 'battlesmith', 'armas marciais (Pronto para Batalha) e ferramentas de ferreiro', "Martial weapons (Battle Ready) and smith's tools",
    { weapons: ['Martial'], tools: ["Smith's tools"] }),
];
const G = {
  alchemist: { tools: ["Alchemist's supplies", 'Herbalism kit'] },
  armorer: { armor: ['Heavy'], tools: ["Smith's tools"] },
  artillerist: { weapons: ['Martial ranged'], tools: ["Woodcarver's tools"] },
  battlesmith: { weapons: ['Martial'], tools: ["Smith's tools"] },
  cartographer: { tools: ["Calligrapher's supplies", "Cartographer's tools"] },
};

// === Subclasses (EFA, fichas 2024) ===
const EFA_NOTE = b(' Dados do EFA levantados de fonte de terceiros (conferir no livro).', ' EFA data gathered from a third-party source (check the book).');
const subDesc = (pt, en) => b(pt + EFA_NOTE.pt, en + EFA_NOTE.en);
const tools = (pt, en) => f('toolsOfTheTrade', b('Ferramentas do Ofício', 'Tools of the Trade'), b(pt, en));
const EXTRA_ATTACK = f('extraAttack', b('Ataque Extra', 'Extra Attack'), b(
  'Ao usar a ação Atacar no seu turno, você ataca duas vezes.',
  'You attack twice whenever you take the Attack action on your turn.'));

const subclasses = {
  alchemist: {
    name: b('Alquimista', 'Alchemist'), source: 'EFA',
    desc: subDesc('Especialista em elixires, cura e reagentes químicos.', 'An expert in elixirs, healing, and chemical reagents.'),
    levels: {
      3: {
        autoSpells: ['healingWord', 'rayOfSickness'],
        grants: G.alchemist,
        features: [
          tools('Proficiência com suprimentos de alquimista e kit de herbalismo (se já tiver uma delas, escolha outra ferramenta de artesão no lugar). Você fabrica poções na metade do tempo normal.',
            "Proficiency with alchemist's supplies and the herbalism kit (if you already have one, choose another artisan's tool instead). You craft potions in half the normal time."),
          f('experimentalElixir', b('Elixir Experimental', 'Experimental Elixir'), b(
            'Ao terminar um Descanso Longo, com suprimentos de alquimista, cria 2 elixires de efeito aleatório (3 no 5º nível, 4 no 9º, 5 no 15º). Também pode gastar um espaço de magia e uma ação Magia para criar um elixir de efeito escolhido. Beber ou dar um elixir é uma Ação Bônus. Efeitos (d6): Cura (2d8 + INT, 3d8 no 9º, 4d8 no 15º); Rapidez (+3 m de deslocamento por 1 h, mais nos níveis 9 e 15); Resiliência (+1 na CA); Ousadia (+1d4 em ataques e salvaguardas); Voo (voo de 3 m, mais nos níveis 9 e 15); 6 = à sua escolha entre os anteriores. As durações crescem nos níveis 9 e 15. Os elixires perdem o efeito no fim do seu próximo Descanso Longo.',
            "After a Long Rest, with alchemist's supplies, you create 2 elixirs with random effects (3 at 5th level, 4 at 9th, 5 at 15th). You can also expend a spell slot and a Magic action to create one with a chosen effect. Drinking or administering an elixir is a Bonus Action. Effects (d6): Healing (2d8 + INT, 3d8 at 9th, 4d8 at 15th); Swiftness (+10 ft speed for 1 hour, more at 9th and 15th); Resilience (+1 AC); Boldness (+1d4 to attacks and saves); Flight (10 ft fly speed, more at 9th and 15th); 6 = your choice of the others. Durations grow at levels 9 and 15. Elixirs lose their magic at the end of your next Long Rest.")),
        ],
      },
      5: {
        autoSpells: ['flamingSphere', 'acidArrow'],
        features: [f('alchemicalSavant', b('Sábio Alquímico', 'Alchemical Savant'), b(
          'Ao conjurar uma magia usando suprimentos de alquimista como foco, some seu modificador de INT (mín. +1) a uma rolagem da magia que recupere PV ou cause dano ácido, de fogo ou de veneno.',
          "When you cast a spell using alchemist's supplies as the focus, add your INT modifier (min +1) to one roll of the spell that restores HP or deals acid, fire, or poison damage."))],
      },
      9: {
        autoSpells: ['gaseousForm', 'massHealingWord'],
        features: [f('restorativeReagents', b('Reagentes Restauradores', 'Restorative Reagents'), b(
          'Conjura Restauração Menor sem gastar espaço de magia um número de vezes igual ao seu modificador de INT (mín. 1) por Descanso Longo. A cura do Elixir Experimental passa a 3d8 + INT.',
          'Cast Lesser Restoration without a spell slot a number of times equal to your INT modifier (min 1) per Long Rest. Experimental Elixir healing becomes 3d8 + INT.'))],
      },
      13: { autoSpells: ['deathWard', 'vitriolicSphere'] },
      15: {
        features: [f('chemicalMastery', b('Maestria Química', 'Chemical Mastery'), b(
          "Resistência a dano ácido e de veneno e imunidade à condição Envenenado. Erupção Alquímica: uma vez por turno, ao causar dano ácido, de fogo ou de veneno com uma magia de artífice, cause 2d8 de dano de força extra a um alvo. Conjura Caldeirão Borbulhante de Tasha sem gastar espaço uma vez por Descanso Longo.",
          "Resistance to acid and poison damage and immunity to the Poisoned condition. Alchemical Eruption: once per turn, when you deal acid, fire, or poison damage with an Artificer spell, deal an extra 2d8 force damage to one target. Cast Tasha's Bubbling Cauldron without a spell slot once per Long Rest."))],
      },
      17: { autoSpells: ['cloudkill', 'raiseDead'] },
    },
  },

  armorer: {
    name: b('Armeiro', 'Armorer'), source: 'EFA',
    desc: subDesc('Transforma a própria armadura em uma armadura arcana com modelos intercambiáveis.', 'Turns their armor into arcane armor with interchangeable models.'),
    levels: {
      3: {
        autoSpells: ['magicMissile', 'thunderwave'],
        grants: G.armorer,
        features: [
          tools('Proficiência com armadura pesada e ferramentas de ferreiro (se já tiver, escolha outra ferramenta de artesão). Você fabrica armaduras na metade do tempo normal.',
            "Proficiency with Heavy armor and smith's tools (if you already have them, choose another artisan's tool). You craft armor in half the normal time."),
          f('arcaneArmor', b('Armadura Arcana', 'Arcane Armor'), b(
            'Com uma ação Magia e ferramentas de ferreiro, transforma a armadura que veste em Armadura Arcana: ignora o requisito de Força, serve de foco de conjuração, cobre o corpo todo, substitui membros perdidos e pode ser vestida ou retirada com uma ação.',
            "As a Magic action with smith's tools, you turn armor you wear into Arcane Armor: it ignores the Strength requirement, works as a spellcasting focus, covers your whole body, replaces missing limbs, and can be donned or doffed as an action.")),
          f('armorModel', b('Modelo de Armadura', 'Armor Model'), b(
            'Escolha o modelo da armadura: Couraçado, Guardião ou Infiltrador. Cada um dá uma arma especial, que usa INT nas jogadas de ataque e dano, e um benefício próprio. Você pode trocar o modelo ao terminar um Descanso Curto ou Longo.',
            'Choose your armor model: Dreadnaught, Guardian, or Infiltrator. Each grants a special weapon, which uses INT for attack and damage rolls, and its own benefit. You can change the model when you finish a Short or Long Rest.')),
        ],
      },
      5: { extraAttacks: 1, autoSpells: ['mirrorImage', 'shatter'], features: [EXTRA_ATTACK] },
      9: {
        autoSpells: ['hypnoticPattern', 'lightningBolt'],
        features: [f('armorReplication', b('Replicação de Armadura', 'Armor Replication'), chk(b(
          'Você aprende 1 plano adicional de Replicar Item Mágico, que precisa ser de uma armadura. Arsenal Aprimorado: +1 em jogadas de ataque e dano com a arma especial do modelo de armadura.',
          "You learn 1 extra Replicate Magic Item plan, which must be for armor. Improved Armaments: +1 to attack and damage rolls with your armor model's special weapon.")))],
      },
      13: { autoSpells: ['fireShield', 'greaterInvisibility'] },
      15: {
        features: [f('perfectedArmor', b('Armadura Aperfeiçoada', 'Perfected Armor'), chk(b(
          'O modelo ativo melhora. Couraçado: o Demolidor causa 2d6; Estatura Gigante dá +3 m de alcance, pode torná-lo Enorme e dá vantagem em testes de FOR. Guardião: as Manoplas causam 1d10; reação para puxar uma criatura próxima e atacá-la (usos = INT por Descanso Longo). Infiltrador: o Lançador causa 2d6; o alvo atingido brilha e tem desvantagem contra você; voo breve (usos = INT por Descanso Longo).',
          'Your active model improves. Dreadnaught: the Demolisher deals 2d6; Giant Stature grants +10 ft reach, can make you Huge, and gives Advantage on STR checks. Guardian: the Gauntlets deal 1d10; reaction to pull a nearby creature and attack it (uses = INT per Long Rest). Infiltrator: the Launcher deals 2d6; a creature you hit glows and has Disadvantage against you; brief flight (uses = INT per Long Rest).')))],
      },
      17: { autoSpells: ['passwall', 'wallOfForce'] },
    },
  },

  artillerist: {
    name: b('Artilheiro', 'Artillerist'), source: 'EFA',
    desc: subDesc('Especialista em magia de artilharia e em canhões sobrenaturais.', 'A specialist in artillery magic and eldritch cannons.'),
    levels: {
      3: {
        autoSpells: ['shield', 'thunderwave'],
        grants: G.artillerist,
        features: [
          tools('Proficiência com armas marciais à distância e ferramentas de entalhador (se já tiver, escolha outra ferramenta de artesão). Você fabrica varinhas na metade do tempo normal.',
            "Proficiency with Martial Ranged weapons and woodcarver's tools (if you already have them, choose another artisan's tool). You craft wands in half the normal time."),
          f('eldritchCannon', b('Canhão Sobrenatural', 'Eldritch Cannon'), b(
            'Ação Magia com ferramentas de ferreiro ou de entalhador: cria um canhão Pequeno ou Minúsculo a até 1,5 m (CA 18, PV = 5 × nível de artífice, imune a veneno e psíquico; Consertar recupera 2d6 PV). Escolha o tipo: Lança-chamas (cone de 4,5 m, 2d8 de fogo, salvaguarda de DES para metade), Balista de Força (ataque mágico a 36 m, 2d8 de força e empurra 1,5 m) ou Protetor (1d8 + INT de PV temporários para você e aliados a até 3 m). Ação Bônus a até 18 m: o canhão se move 4,5 m e dispara. Um canhão por vez; cria outro após um Descanso Longo ou gastando um espaço de magia.',
            "Magic action with smith's or woodcarver's tools: create a Small or Tiny cannon within 5 feet (AC 18, HP = 5 × artificer level, immune to poison and psychic; Mending restores 2d6 HP). Choose its type: Flamethrower (15-ft cone, 2d8 fire, DEX save for half), Force Ballista (spell attack at 120 ft, 2d8 force and a 5-ft push), or Protector (1d8 + INT temporary HP to you and allies within 10 ft). Bonus Action within 60 ft: the cannon moves 15 feet and fires. One cannon at a time; make another after a Long Rest or by expending a spell slot.")),
        ],
      },
      5: {
        autoSpells: ['scorchingRay', 'shatter'],
        features: [f('arcaneFirearm', b('Arma de Fogo Arcana', 'Arcane Firearm'), b(
          'Ao terminar um Descanso Longo, grave sigilos em um bastão, cajado, varinha ou arma marcial à distância. Ao conjurar uma magia de artífice usando-o como foco, some 1d8 a uma rolagem de dano da magia.',
          'After a Long Rest, carve sigils into a rod, staff, wand, or Martial Ranged weapon. When you cast an Artificer spell through it, add 1d8 to one of the spell\'s damage rolls.'))],
      },
      9: {
        autoSpells: ['fireball', 'windWall'],
        features: [f('explosiveCannon', b('Canhão Explosivo', 'Explosive Cannon'), b(
          'O dano do canhão e os PV temporários do Protetor aumentam em 1d8. Detonar: como Reação quando o canhão sofre dano, você o destrói e cada criatura a até 6 m faz uma salvaguarda de DES, sofrendo 3d10 de dano de força (metade se passar).',
          "Your cannon's damage and the Protector's temporary HP increase by 1d8. Detonate: as a Reaction when the cannon takes damage, destroy it; each creature within 20 feet makes a DEX save, taking 3d10 force damage (half on a success)."))],
      },
      13: { autoSpells: ['iceStorm', 'wallOfFire'] },
      15: {
        features: [f('fortifiedPosition', b('Posição Fortificada', 'Fortified Position'), b(
          'Você pode ter dois canhões ao mesmo tempo, criá-los com uma única ação e ativar ambos com uma Ação Bônus. Você e seus aliados têm meia cobertura enquanto estiverem a até 3 m de um canhão.',
          'You can have two cannons at once, create both with one action, and activate both with one Bonus Action. You and your allies have Half Cover while within 10 feet of a cannon.'))],
      },
      17: { autoSpells: ['coneOfCold', 'wallOfForce'] },
    },
  },

  battlesmith: {
    name: b('Ferreiro de Batalha', 'Battle Smith'), source: 'EFA',
    desc: subDesc('Combatente e protetor que luta ao lado de um defensor de aço.', 'A combatant and protector who fights alongside a steel defender.'),
    levels: {
      3: {
        autoSpells: ['heroism', 'shield'],
        grants: G.battlesmith,
        features: [
          tools('Proficiência com ferramentas de ferreiro (se já tiver, escolha outra ferramenta de artesão). Você fabrica armas na metade do tempo normal.',
            "Proficiency with smith's tools (if you already have them, choose another artisan's tool). You craft weapons in half the normal time."),
          f('battleReady', b('Pronto para Batalha', 'Battle Ready'), b(
            'Proficiência com armas marciais. Ao atacar com uma arma mágica, pode usar INT em vez de FOR ou DES nas jogadas de ataque e dano. Armas em que tem proficiência podem servir de foco de conjuração.',
            'Proficiency with Martial weapons. When you attack with a magic weapon, you can use INT instead of STR or DEX for the attack and damage rolls. Weapons you are proficient with can serve as your spellcasting focus.')),
          f('steelDefender', b('Defensor de Aço', 'Steel Defender'), chk(b(
            'Você cria um constructo aliado (CA 12 + INT, PV 5 + 5 × nível de artífice, deslocamento 12 m). Ele age logo após você e obedece às suas ordens por Ação Bônus. Dilacerar com Força: 1d8 + 2 + INT de força. Reparo 3×/dia: cura 2d8 + INT. Reação Desviar Ataque: impõe desvantagem a um ataque contra outra criatura. Se for destruído, recrie-o após um Descanso Longo ou gastando um espaço de magia (ação Magia). Registre-o entre os combatentes.',
            'You create a construct ally (AC 12 + INT, HP 5 + 5 × artificer level, speed 40 ft). It acts right after you and follows your commands via your Bonus Action. Force-Empowered Rend: 1d8 + 2 + INT force. Repair 3/day: heals 2d8 + INT. Deflect Attack reaction: imposes Disadvantage on an attack against another creature. If destroyed, rebuild it after a Long Rest or by expending a spell slot (Magic action). Track it among the combatants.'))),
        ],
      },
      5: {
        extraAttacks: 1, autoSpells: ['shiningSmite', 'wardingBond'],
        features: [f('extraAttack', b('Ataque Extra', 'Extra Attack'), b(
          'Ao usar a ação Atacar, você ataca duas vezes. Um desses ataques pode ser substituído pelo comando para o Defensor de Aço usar Dilacerar com Força.',
          "You attack twice when you take the Attack action. You can replace one of those attacks with commanding your Steel Defender to use its Force-Empowered Rend."))],
      },
      9: {
        autoSpells: ['auraOfVitality', 'conjureBarrage'],
        features: [f('arcaneJolt', b('Abalo Arcano', 'Arcane Jolt'), b(
          'Uma vez por turno, ao acertar com uma arma mágica ou quando o Defensor de Aço acerta, escolha: o alvo sofre 2d6 de dano de força extra, ou uma criatura a até 9 m do alvo recupera 2d6 PV. Usos: modificador de INT (mín. 1) por Descanso Longo.',
          'Once per turn, when you hit with a magic weapon or your Steel Defender hits, choose: the target takes an extra 2d6 force damage, or a creature within 30 feet of the target regains 2d6 HP. Uses: your INT modifier (min 1) per Long Rest.'))],
      },
      13: { autoSpells: ['auraOfPurity', 'fireShield'] },
      15: {
        features: [f('improvedDefender', b('Defensor Aprimorado', 'Improved Defender'), b(
          'O Abalo Arcano passa a 4d6. Quando o Defensor de Aço usa Desviar Ataque, o atacante sofre 1d4 + INT de dano de força.',
          'Arcane Jolt becomes 4d6. When your Steel Defender uses Deflect Attack, the attacker takes 1d4 + INT force damage.'))],
      },
      17: { autoSpells: ['banishingSmite', 'massCureWounds'] },
    },
  },

  cartographer: {
    name: b('Cartógrafo', 'Cartographer'), source: 'EFA',
    desc: subDesc('Mapeia o campo de batalha com mapas mágicos que guiam e protegem os aliados.', 'Maps the battlefield with magic maps that guide and protect allies.'),
    levels: {
      3: {
        autoSpells: ['faerieFire', 'guidingBolt', 'healingWord'],
        grants: G.cartographer,
        features: [
          tools("Proficiência com suprimentos de caligrafia e ferramentas de cartógrafo (se já tiver uma delas, escolha outra ferramenta de artesão). Você fabrica pergaminhos mágicos na metade do tempo normal.",
            "Proficiency with calligrapher's supplies and cartographer's tools (if you already have one, choose another artisan's tool). You scribe spell scrolls in half the normal time."),
          f('adventurersAtlas', b('Atlas do Aventureiro', "Adventurer's Atlas"), b(
            'Ao terminar um Descanso Longo, com ferramentas de cartógrafo, cria mapas mágicos para 1 + INT criaturas (mín. 2), incluindo você. Quem porta um mapa soma 1d4 à Iniciativa e sabe onde estão os outros portadores, podendo mirar magias neles a até 9 m mesmo sem vê-los. Os mapas duram até o seu próximo Descanso Longo.',
            "After a Long Rest, with cartographer's tools, you make magic maps for 1 + INT creatures (min 2), including you. A holder adds 1d4 to Initiative and knows where the other holders are, able to target them with spells within 30 feet even without seeing them. The maps last until your next Long Rest.")),
          f('mappingMagic', b('Magia Cartográfica', 'Mapping Magic'), b(
            'Conjura Fogo das Fadas sem gastar espaço de magia um número de vezes igual ao seu modificador de INT (mín. 1) por Descanso Longo. Ao conjurá-la, pode se teletransportar para um espaço próximo (até 3 m) ou para junto de um portador de mapa a até 9 m.',
            'Cast Faerie Fire without a spell slot a number of times equal to your INT modifier (min 1) per Long Rest. When you cast it, you can teleport to a nearby space (up to 10 feet) or next to a map holder within 30 feet.')),
        ],
      },
      5: {
        autoSpells: ['locateObject', 'mindSpike'],
        features: [f('guidedPrecision', b('Precisão Guiada', 'Guided Precision'), b(
          'Uma vez por turno, some seu modificador de INT ao dano de uma magia da subclasse ou de um ataque contra uma criatura afetada pelo seu Fogo das Fadas. O dano que você causa não interrompe sua Concentração em Fogo das Fadas.',
          "Once per turn, add your INT modifier to the damage of a subclass spell or of an attack against a creature affected by your Faerie Fire. Damage you deal doesn't break your Concentration on Faerie Fire."))],
      },
      9: {
        autoSpells: ['callLightning', 'clairvoyance'],
        features: [f('ingeniousMovement', b('Movimento Engenhoso', 'Ingenious Movement'), b(
          'Quando usar Lampejo de Genialidade, você também pode teletransportar você ou um aliado que possa ver para um espaço desocupado a até 9 m.',
          'When you use Flash of Genius, you can also teleport yourself or an ally you can see to an unoccupied space within 30 feet.'))],
      },
      13: { autoSpells: ['banishment', 'locateCreature'] },
      15: {
        features: [f('superiorAtlas', b('Atlas Superior', 'Superior Atlas'), chk(b(
          'Quando um portador de mapa cairia a 0 PV, o mapa se destrói e o salva: ele se teletransporta para perto de outro portador e fica com PV iguais a 2 × seu nível de artífice. Conjura Encontrar o Caminho sem gastar espaço uma vez por Descanso Longo.',
          'When a map holder would drop to 0 HP, the map is destroyed to save them: they teleport near another holder with HP equal to 2 × your artificer level. Cast Find the Path without a spell slot once per Long Rest.')))],
      },
      17: { autoSpells: ['scrying', 'teleportationCircle'] },
    },
  },
};

// === Recursos com usos (formato em README.md) ===
const r = (id, pt, en, uses, extra = {}) => ({ id, name: b(pt, en), uses, recharge: 'long', ...extra });
const INT1 = { ability: 'int', min: 1 };
const resources = [
  // Classe base
  r('tinkersMagic', 'Magia do Inventor', "Tinker's Magic", INT1, { rules: '2024', minLevel: 1,
    desc: b('Criar um item comum da lista.', 'Create a mundane item from the list.') }),
  r('flashOfGenius', 'Lampejo de Genialidade', 'Flash of Genius', INT1, { minLevel: 7,
    desc: b('2024: no 14º recupera 1 no Descanso Curto; no 20º recupera todos no Descanso Curto se estiver sintonizado com um item.',
      '2024: at 14th regain 1 on a Short Rest; at 20th regain all on a Short Rest while attuned to an item.') }),
  r('magicItemDrain', 'Drenar Item Mágico', 'Drain Magic Item', { fixed: 1 }, { rules: '2024', minLevel: 6 }),
  r('magicItemTransmute', 'Transmutar Item Mágico', 'Transmute Magic Item', { fixed: 1 }, { rules: '2024', minLevel: 6 }),
  r('spellStoringItem', 'Item Armazenador de Magia', 'Spell-Storing Item', { ability: 'int', min: 2, multiplier: 2 }, { minLevel: 11,
    desc: b('2 × modificador de INT (mín. 2); renova ao guardar a magia no Descanso Longo.', '2 × INT modifier (min 2); resets when you store the spell on a Long Rest.') }),
  // Alquimista
  r('experimentalElixir', 'Elixires Experimentais', 'Experimental Elixirs', { byLevel: { 3: 2, 5: 3, 9: 4, 15: 5 } }, { rules: '2024', subclass: ['alchemist'],
    desc: b('Elixires grátis criados no Descanso Longo; outros custam um espaço de magia.', 'Free elixirs made on a Long Rest; more cost a spell slot.') }),
  r('experimentalElixir2014', 'Elixires Experimentais', 'Experimental Elixirs', { byLevel: { 3: 1, 6: 2, 15: 3 } }, { rules: '2014', subclass: ['alchemist'],
    desc: b('Elixires grátis criados no Descanso Longo; outros custam um espaço de magia.', 'Free elixirs made on a Long Rest; more cost a spell slot.') }),
  r('restorativeReagents', 'Reagentes Restauradores', 'Restorative Reagents', INT1, { subclass: ['alchemist'], minLevel: 9,
    desc: b('Restauração Menor sem espaço.', 'Lesser Restoration without a slot.') }),
  r('tashasBubblingCauldron', 'Caldeirão Borbulhante (Maestria Química)', "Bubbling Cauldron (Chemical Mastery)", { fixed: 1 }, { rules: '2024', subclass: ['alchemist'], minLevel: 15 }),
  r('chemicalMasteryGreaterRestoration', 'Restauração Maior (Maestria Química)', 'Greater Restoration (Chemical Mastery)', { fixed: 1 }, { rules: '2014', subclass: ['alchemist'], minLevel: 15 }),
  r('chemicalMasteryHeal', 'Cura Completa (Maestria Química)', 'Heal (Chemical Mastery)', { fixed: 1 }, { rules: '2014', subclass: ['alchemist'], minLevel: 15 }),
  // Armeiro
  r('defensiveField2014', 'Campo Defensivo (Guardião)', 'Defensive Field (Guardian)', { profBonus: true }, { rules: '2014', subclass: ['armorer'], minLevel: 3 }),
  r('giantStature', 'Estatura Gigante (Couraçado)', 'Giant Stature (Dreadnaught)', INT1, { rules: '2024', subclass: ['armorer'], minLevel: 3,
    desc: b('Só com o modelo Couraçado. (conferir no livro)', 'Dreadnaught model only. (check the book)') }),
  r('perfectedArmor', 'Armadura Aperfeiçoada', 'Perfected Armor', INT1, { rules: '2024', subclass: ['armorer'], minLevel: 15,
    desc: b('Puxão do Guardião ou voo do Infiltrador. (conferir no livro)', "Guardian's pull or Infiltrator's flight. (check the book)") }),
  r('perfectedArmor2014', 'Armadura Aperfeiçoada (Guardião)', 'Perfected Armor (Guardian)', { profBonus: true }, { rules: '2014', subclass: ['armorer'], minLevel: 15,
    desc: b('Reação de puxar do modelo Guardião.', 'Guardian model pull reaction.') }),
  // Artilheiro
  r('eldritchCannon', 'Canhão Sobrenatural (grátis)', 'Eldritch Cannon (free)', { fixed: 1 }, { subclass: ['artillerist'], minLevel: 3,
    desc: b('Criar o canhão sem gastar espaço; depois, só com espaço de magia.', 'Create the cannon without a slot; afterwards, only by expending a spell slot.') }),
  // Ferreiro de Batalha
  r('steelDefenderRepair', 'Reparo (Defensor de Aço)', 'Repair (Steel Defender)', { fixed: 3 }, { subclass: ['battlesmith'], minLevel: 3 }),
  r('arcaneJolt', 'Abalo Arcano', 'Arcane Jolt', INT1, { subclass: ['battlesmith'], minLevel: 9 }),
  // Cartógrafo
  r('mappingMagic', 'Magia Cartográfica', 'Mapping Magic', INT1, { rules: '2024', subclass: ['cartographer'], minLevel: 3,
    desc: b('Fogo das Fadas sem espaço, com teletransporte.', 'Faerie Fire without a slot, with a teleport.') }),
  r('superiorAtlasFindThePath', 'Encontrar o Caminho (Atlas Superior)', 'Find the Path (Superior Atlas)', { fixed: 1 }, { rules: '2024', subclass: ['cartographer'], minLevel: 15 }),
];

export default {
  classId: 'artificer',
  pools: {
    plan: {
      name: b('Planos de Item Mágico', 'Magic Item Plans'),
      swapOnLevelUp: 1,
      options: plans,
    },
    infusion: {
      name: b('Infusões de Artífice', 'Artificer Infusions'),
      swapOnLevelUp: 1,
      options: infusions,
    },
    // Uma vaga por infusão Replicar Item Mágico escolhida (troca junto com a infusão).
    replicateItem: {
      name: b('Item Replicado', 'Replicated Item'),
      swapOnLevelUp: 1,
      options: replicableItems,
    },
    artisanTool: {
      name: b('Ferramenta de Artesão', "Artisan's Tool"),
      startingClassOnly: true,
      options: artisanTools,
    },
    specialistTools: {
      name: b('Ferramentas do Ofício', 'Tools of the Trade'),
      options: specialistKits,
    },
    armorModel: {
      name: b('Modelo de Armadura', 'Armor Model'),
      freeSwap: true,
      options: armorModels,
    },
  },
  // 2024 (EFA): ferramenta de artesão no 1; planos conhecidos 4/5/6/7/8 nos níveis 2/6/10/14/18.
  choices: { 1: { artisanTool: 1 }, 2: { plan: 4 }, 6: { plan: 1 }, 10: { plan: 1 }, 14: { plan: 1 }, 18: { plan: 1 } },
  // 2014 (TCE): ferramenta de artesão no 1; infusões conhecidas 4/6/8/10/12 nos níveis 2/6/10/14/18.
  legacyChoices: { 1: { artisanTool: 1 }, 2: { infusion: 4 }, 6: { infusion: 2 }, 10: { infusion: 2 }, 14: { infusion: 2 }, 18: { infusion: 2 } },
  // Fichas 2024: as proficiências da subclasse vêm como `grants`; o Armeiro escolhe o
  // modelo no 3 e, no 9, ganha 1 plano extra (de armadura).
  subclassChoices: {
    armorer: { 3: { armorModel: 1 }, 9: { plan: 1 } },
  },
  // Fichas 2014 (TCE): kit de proficiências da subclasse (pool) no 3; sem plano extra.
  legacySubclassChoices: {
    alchemist: { 3: { specialistTools: 1 } },
    armorer: { 3: { specialistTools: 1, armorModel: 1 } },
    artillerist: { 3: { specialistTools: 1 } },
    battlesmith: { 3: { specialistTools: 1 } },
  },
  features,
  subclasses,
  resources,
};
